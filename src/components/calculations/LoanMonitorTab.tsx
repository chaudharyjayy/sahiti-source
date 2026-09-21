import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, ChevronDown, Landmark, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCHEMES } from "@/data/schemes";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, daysUntil, formatDate, todayIso } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Field, MoneyField, Panel } from "./shared";

const SUBSIDY_STATES = ["Not applicable", "Pending", "Approved", "Credited"] as const;
const PREVIEW_ROWS = 6;
/** Safety cap so a repayment that never clears the interest cannot loop forever. */
const MAX_PROJECTED_MONTHS = 480;

type RepaymentRow = {
  installment: number;
  dueDate: Date;
  emi: number;
  interest: number;
  principal: number;
  balance: number;
};

/**
 * Amortises a loan properly: each instalment covers the interest on the
 * remaining balance first, and only the remainder reduces principal. The
 * previous version subtracted the whole EMI from the balance, which
 * understated the closing balance on every row.
 */
function projectRepayments(
  outstanding: number,
  annualRate: number,
  emi: number,
  nextDue: string,
): { rows: RepaymentRow[]; clears: boolean } {
  const monthlyRate = annualRate / 100 / 12;
  let balance = outstanding;
  const rows: RepaymentRow[] = [];

  for (let index = 0; index < MAX_PROJECTED_MONTHS && balance > 0.5; index++) {
    const interest = balance * monthlyRate;
    // An EMI that cannot cover the interest will never clear the loan.
    if (emi <= interest) return { rows, clears: false };
    const principal = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principal);
    rows.push({
      installment: index + 1,
      dueDate: addMonths(nextDue, index),
      emi,
      interest,
      principal,
      balance,
    });
  }

  return { rows, clears: balance <= 0.5 };
}

export function LoanMonitorTab() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    lender_name: "",
    scheme_id: "pmmy-mudra",
    sanctioned_amount: "",
    outstanding_principal: "",
    annual_interest_rate: "9",
    monthly_emi: "",
    tenure_months: "36",
    start_date: todayIso(),
    next_due_date: todayIso(),
    subsidy_status: "Pending",
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["loan-accounts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error: queryError } = await supabase
        .from("loan_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      return data;
    },
  });

  const portfolio = useMemo(() => {
    const sanctioned = loans.reduce((sum, loan) => sum + Number(loan.sanctioned_amount), 0);
    const outstanding = loans.reduce((sum, loan) => sum + Number(loan.outstanding_principal), 0);
    const monthlyEmi = loans.reduce((sum, loan) => sum + Number(loan.monthly_emi), 0);
    const dueDates = loans.map((loan) => loan.next_due_date).sort();
    const nearest = dueDates[0];
    return { sanctioned, outstanding, monthlyEmi, nearest };
  }, [loans]);

  async function saveLoan() {
    if (!user) return;
    setError("");

    const sanctioned = Number(form.sanctioned_amount);
    const outstanding = Number(form.outstanding_principal);
    const rate = Number(form.annual_interest_rate);
    const emi = Number(form.monthly_emi);
    const tenure = Number(form.tenure_months);

    if (!form.lender_name.trim()) return setError("Enter the bank or lender name.");
    if (!(sanctioned > 0)) return setError("Sanctioned amount must be more than zero.");
    if (!(outstanding >= 0) || outstanding > sanctioned) {
      return setError("Outstanding principal has to sit between zero and the sanctioned amount.");
    }
    if (!(rate >= 0 && rate <= 100)) return setError("Interest rate has to be between 0 and 100.");
    if (!(emi > 0)) return setError("Enter the monthly EMI.");
    if (!(tenure > 0)) return setError("Tenure has to be at least one month.");
    if (form.next_due_date < form.start_date) {
      return setError("Next due date cannot fall before the loan start date.");
    }

    const scheme = SCHEMES.find((item) => item.id === form.scheme_id);
    const { error: insertError } = await supabase.from("loan_accounts").insert({
      user_id: user.id,
      lender_name: form.lender_name.trim(),
      scheme_name: scheme?.name ?? form.scheme_id,
      sanctioned_amount: sanctioned,
      outstanding_principal: outstanding,
      annual_interest_rate: rate,
      monthly_emi: emi,
      tenure_months: tenure,
      start_date: form.start_date,
      next_due_date: form.next_due_date,
      subsidy_status: form.subsidy_status,
    });
    if (insertError) return setError(insertError.message);

    setShowForm(false);
    await queryClient.invalidateQueries({ queryKey: ["loan-accounts", user.id] });
    toast.success("Loan added");
  }

  async function removeLoan(id: string) {
    await supabase.from("loan_accounts").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["loan-accounts", user?.id] });
    toast.success("Loan removed");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Loans you are repaying</h2>
          <p className="text-sm text-muted-foreground">
            Due dates, subsidy progress and what is left to pay.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          <Plus aria-hidden="true" className="size-4" />
          Add loan
        </Button>
      </div>

      {loans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PortfolioTile label="Sanctioned" value={formatINR(portfolio.sanctioned)} />
          <PortfolioTile label="Still owed" value={formatINR(portfolio.outstanding)} />
          <PortfolioTile label="Leaves you each month" value={formatINR(portfolio.monthlyEmi)} />
          <PortfolioTile
            label="Nearest due date"
            value={portfolio.nearest ? formatDate(portfolio.nearest) : "—"}
            hint={portfolio.nearest ? dueLabel(daysUntil(portfolio.nearest)) : undefined}
            urgent={portfolio.nearest ? daysUntil(portfolio.nearest) <= 7 : false}
          />
        </div>
      )}

      {showForm && (
        <Panel
          title="Loan details"
          description="Numbers from your sanction letter work best."
          action={
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="lender" label="Bank or lender">
              <Input
                id="lender"
                className="bg-muted"
                value={form.lender_name}
                onChange={(event) => setForm({ ...form, lender_name: event.target.value })}
              />
            </Field>

            <div>
              <Label htmlFor="monitor-scheme">Scheme</Label>
              <Select
                value={form.scheme_id}
                onValueChange={(value) => setForm({ ...form, scheme_id: value })}
              >
                <SelectTrigger id="monitor-scheme" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((scheme) => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.shortName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MoneyField
              id="sanctioned"
              label="Sanctioned amount"
              value={form.sanctioned_amount}
              onChange={(value) => setForm({ ...form, sanctioned_amount: value })}
            />
            <MoneyField
              id="outstanding"
              label="Remaining principal"
              value={form.outstanding_principal}
              onChange={(value) => setForm({ ...form, outstanding_principal: value })}
            />
            <MoneyField
              id="emi"
              label="Monthly EMI"
              value={form.monthly_emi}
              onChange={(value) => setForm({ ...form, monthly_emi: value })}
            />

            <Field id="rate" label="Interest rate (% a year)">
              <Input
                id="rate"
                className="bg-muted tabular-nums"
                inputMode="decimal"
                value={form.annual_interest_rate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    annual_interest_rate: event.target.value.replace(/[^\d.]/g, ""),
                  })
                }
              />
            </Field>

            <Field id="tenure" label="Tenure (months)">
              <Input
                id="tenure"
                className="bg-muted tabular-nums"
                inputMode="numeric"
                value={form.tenure_months}
                onChange={(event) =>
                  setForm({ ...form, tenure_months: event.target.value.replace(/[^\d]/g, "") })
                }
              />
            </Field>

            <Field id="start-date" label="Loan start date">
              <Input
                id="start-date"
                type="date"
                className="bg-muted"
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
              />
            </Field>

            <Field id="due-date" label="Next due date">
              <Input
                id="due-date"
                type="date"
                className="bg-muted"
                value={form.next_due_date}
                onChange={(event) => setForm({ ...form, next_due_date: event.target.value })}
              />
            </Field>

            <div>
              <Label htmlFor="subsidy">Subsidy status</Label>
              <Select
                value={form.subsidy_status}
                onValueChange={(value) => setForm({ ...form, subsidy_status: value })}
              >
                <SelectTrigger id="subsidy" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSIDY_STATES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button className="mt-5" onClick={() => void saveLoan()}>
            Save loan
          </Button>
        </Panel>
      )}

      {loans.length === 0 && !showForm ? (
        <div className="rounded-md border border-dashed py-14 text-center">
          <Landmark aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nothing being monitored yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a sanctioned loan to follow its repayment schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {loans.map((loan) => {
            const sanctioned = Number(loan.sanctioned_amount);
            const outstanding = Number(loan.outstanding_principal);
            const emi = Number(loan.monthly_emi);
            const rate = Number(loan.annual_interest_rate);

            const repaidPercent =
              sanctioned > 0
                ? Math.max(0, Math.min(100, ((sanctioned - outstanding) / sanctioned) * 100))
                : 0;

            const { rows, clears } = projectRepayments(outstanding, rate, emi, loan.next_due_date);
            const nextInterest = outstanding * (rate / 100 / 12);
            const dueDays = daysUntil(loan.next_due_date);
            const isOpen = expanded === loan.id;
            const visible = isOpen ? rows : rows.slice(0, PREVIEW_ROWS);

            return (
              <article key={loan.id} className="rounded-md border">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                  <div>
                    <h3 className="font-semibold">{loan.lender_name}</h3>
                    <p className="text-sm text-muted-foreground">{loan.scheme_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Subsidy: {loan.subsidy_status}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove loan from ${loan.lender_name}`}
                      onClick={() => void removeLoan(loan.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </header>

                <div className="space-y-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Readout label="Sanctioned" value={formatINR(sanctioned)} />
                    <Readout label="Remaining principal" value={formatINR(outstanding)} />
                    <Readout
                      label="Interest next month"
                      value={formatINR(nextInterest)}
                      hint={`${rate}% a year`}
                    />
                    <Readout label="Monthly EMI" value={formatINR(emi)} />
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Repaid so far</span>
                      <span className="font-medium tabular-nums">{repaidPercent.toFixed(0)}%</span>
                    </div>
                    <Progress value={repaidPercent} />
                  </div>

                  {!clears && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive p-3 text-sm text-destructive">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>
                        At {formatINR(emi)} a month the EMI does not cover the{" "}
                        {formatINR(nextInterest)} of monthly interest, so the balance would never
                        fall. Check the EMI with your lender.
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      dueDays <= 7
                        ? "flex items-center gap-2 rounded-md border border-destructive p-3 text-sm text-destructive"
                        : "flex items-center gap-2 rounded-md border bg-secondary p-3 text-sm"
                    }
                  >
                    <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
                    <span>
                      <strong>Next EMI:</strong> {formatDate(loan.next_due_date)} ·{" "}
                      {dueLabel(dueDays)}
                    </span>
                  </div>

                  {rows.length > 0 && (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <caption className="sr-only">Upcoming repayment schedule</caption>
                          <thead className="bg-muted text-left">
                            <tr>
                              <th scope="col" className="p-3 font-medium">
                                #
                              </th>
                              <th scope="col" className="p-3 font-medium">
                                Due
                              </th>
                              <th scope="col" className="p-3 font-medium">
                                EMI
                              </th>
                              <th scope="col" className="p-3 font-medium">
                                Interest
                              </th>
                              <th scope="col" className="p-3 font-medium">
                                Principal
                              </th>
                              <th scope="col" className="p-3 font-medium">
                                Balance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((row) => (
                              <tr key={row.installment} className="border-t">
                                <td className="p-3 tabular-nums">{row.installment}</td>
                                <td className="p-3 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                                <td className="p-3 tabular-nums">{formatINR(row.emi)}</td>
                                <td className="p-3 tabular-nums">{formatINR(row.interest)}</td>
                                <td className="p-3 tabular-nums">{formatINR(row.principal)}</td>
                                <td className="p-3 tabular-nums">{formatINR(row.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {clears
                            ? `Clears in ${rows.length} more instalment${rows.length === 1 ? "" : "s"}.`
                            : `Showing the next ${visible.length} instalments.`}
                        </p>
                        {rows.length > PREVIEW_ROWS && (
                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : loan.id)}
                          >
                            <ChevronDown
                              aria-hidden="true"
                              className={isOpen ? "size-4 rotate-180" : "size-4"}
                            />
                            {isOpen ? "Show less" : `All ${rows.length} instalments`}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Projections use the rate you entered. Match them against the lender's statement.
      </p>
    </div>
  );
}

function dueLabel(days: number): string {
  if (days < 0) return `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "due today";
  return `${days} day${days === 1 ? "" : "s"} to go`;
}

function PortfolioTile({
  label,
  value,
  hint,
  urgent,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  urgent?: boolean | undefined;
}) {
  return (
    <div className={urgent ? "rounded-md border border-destructive p-4" : "rounded-md border p-4"}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          urgent ? "mt-1 text-lg font-semibold text-destructive" : "mt-1 text-lg font-semibold"
        }
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Readout({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
