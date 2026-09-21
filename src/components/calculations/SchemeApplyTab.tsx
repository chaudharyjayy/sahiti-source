import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSchemeAmount, getScheme, SCHEME_SECTORS } from "@/data/schemes";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { useSession } from "@/lib/session";
import { CheckRow, Field, MoneyField, Panel } from "./shared";
import { SchemeFinder } from "./SchemeFinder";

const STEP_LABELS = ["Scheme", "Eligibility", "Details", "Receipt"] as const;
const STATUS_STAGES = ["Submitted", "Under review", "Documents requested", "Approved"];

export function SchemeApplyTab() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [form, setForm] = useState({
    schemeId: "pmmy-mudra" as string | null,
    business_type: "Retail",
    loan_amount: "",
    margin_capital: "",
    aadhaar_last_four: "",
    udyam_number: "",
    operating: false,
    indian: false,
    firstLoan: false,
  });

  const scheme = form.schemeId ? getScheme(form.schemeId) : undefined;

  const { data: applications = [] } = useQuery({
    queryKey: ["scheme-applications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error: queryError } = await supabase
        .from("scheme_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });
      if (queryError) throw queryError;
      return data;
    },
  });

  const eligibility = useMemo(() => {
    const amount = Number(form.loan_amount);
    const margin = Number(form.margin_capital);
    const hasAmount = Number.isFinite(amount) && amount > 0;

    // A scheme with no funding ceiling (incentive programmes) does not constrain
    // the amount, so only band-limited schemes are checked against it.
    const withinBand =
      !scheme || scheme.amountMax === 0
        ? true
        : hasAmount && amount >= scheme.amountMin && amount <= scheme.amountMax;

    return {
      amount,
      margin,
      withinBand,
      passes:
        Boolean(scheme) && form.operating && form.indian && hasAmount && withinBand && margin >= 0,
    };
  }, [form, scheme]);

  function goNext() {
    setError("");
    if (step === 1) {
      if (!scheme) return setError("Pick a scheme to continue.");
      return setStep(2);
    }
    if (step === 2) {
      if (!form.operating || !form.indian) {
        return setError("Confirm both eligibility statements before continuing.");
      }
      if (!(eligibility.amount > 0)) return setError("Enter the loan amount you need.");
      if (!eligibility.withinBand && scheme) {
        return setError(
          `This scheme runs from ${formatSchemeAmount(scheme)}. Adjust the amount or pick another scheme.`,
        );
      }
      return setStep(3);
    }
  }

  async function submit() {
    if (!user || !scheme) return;
    setError("");
    if (!/^\d{4}$/.test(form.aadhaar_last_four)) {
      return setError("Enter the last four digits of Aadhaar only.");
    }
    if (!(eligibility.amount > 0) || eligibility.margin < 0) {
      return setError("Enter a valid loan amount and margin.");
    }

    const reference = `SAH-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { error: insertError } = await supabase.from("scheme_applications").insert({
      user_id: user.id,
      reference_id: reference,
      scheme_name: scheme.name,
      business_type: form.business_type,
      loan_amount: eligibility.amount,
      margin_capital: eligibility.margin,
      aadhaar_last_four: form.aadhaar_last_four,
      udyam_number: form.udyam_number.trim() || null,
      eligibility_answers: {
        operating_business: form.operating,
        indian_resident: form.indian,
        first_formal_loan: form.firstLoan,
        // Kept inside the answers blob so the chosen programme stays traceable
        // without a schema change.
        scheme_id: scheme.id,
      },
      eligibility_result: eligibility.passes ? "Eligible" : "Needs review",
    });
    if (insertError) return setError(insertError.message);

    setReceipt(reference);
    setStep(4);
    await queryClient.invalidateQueries({ queryKey: ["scheme-applications", user.id] });
    toast.success("Application recorded");
  }

  function restart() {
    setStep(1);
    setReceipt(null);
    setForm({
      schemeId: null,
      business_type: "Retail",
      loan_amount: "",
      margin_capital: "",
      aadhaar_last_four: "",
      udyam_number: "",
      operating: false,
      indian: false,
      firstLoan: false,
    });
  }

  return (
    <div className="space-y-8">
      <ol className="grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>
        {STEP_LABELS.map((label, index) => {
          const position = index + 1;
          const done = step > position;
          return (
            <li key={label} className="min-w-0">
              <div className={step >= position ? "h-1.5 bg-primary" : "h-1.5 bg-muted"} />
              <p
                className={
                  step === position
                    ? "mt-2 truncate text-xs font-semibold text-primary"
                    : done
                      ? "mt-2 truncate text-xs text-muted-foreground"
                      : "mt-2 truncate text-xs text-muted-foreground"
                }
              >
                {position}. {label}
              </p>
            </li>
          );
        })}
      </ol>

      <Panel>
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Find the right scheme</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Narrow by trade and amount. Matches update as you type.
              </p>
            </div>
            <SchemeFinder
              selectedId={form.schemeId}
              onChoose={(schemeId) => {
                setError("");
                setForm((current) => ({ ...current, schemeId }));
              }}
              defaultSector={form.business_type}
              defaultAmount={form.loan_amount}
            />
          </div>
        )}

        {step === 2 && scheme && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Eligibility</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {scheme.name} · {formatSchemeAmount(scheme)}
              </p>
            </div>

            <div className="rounded-md border bg-secondary p-4">
              <h3 className="text-sm font-semibold">What this scheme normally asks for</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {scheme.eligibility.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <CheckRow
                id="operating"
                checked={form.operating}
                onChange={(value) => setForm({ ...form, operating: value })}
                label="My business runs, or will run, in India."
              />
              <CheckRow
                id="indian"
                checked={form.indian}
                onChange={(value) => setForm({ ...form, indian: value })}
                label="I am an Indian resident and can prove identity."
              />
              <CheckRow
                id="first-loan"
                checked={form.firstLoan}
                onChange={(value) => setForm({ ...form, firstLoan: value })}
                label="This is my first formal loan for this project, where the scheme requires it."
              />
              <MoneyField
                id="eligibility-amount"
                label="Loan amount required"
                value={form.loan_amount}
                hint={`Scheme band: ${formatSchemeAmount(scheme)}`}
                onChange={(value) => setForm({ ...form, loan_amount: value })}
              />
            </div>

            {eligibility.passes && (
              <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm">
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                Everything lines up for this scheme.
              </div>
            )}
          </div>
        )}

        {step === 3 && scheme && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Application details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Applying to {scheme.name}. Only the last four Aadhaar digits are kept here.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="application-business">Business type</Label>
                <Select
                  value={form.business_type}
                  onValueChange={(value) => setForm({ ...form, business_type: value })}
                >
                  <SelectTrigger id="application-business" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_SECTORS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <MoneyField
                id="application-loan"
                label="Loan amount required"
                value={form.loan_amount}
                onChange={(value) => setForm({ ...form, loan_amount: value })}
              />
              <MoneyField
                id="application-margin"
                label="Margin capital"
                value={form.margin_capital}
                onChange={(value) => setForm({ ...form, margin_capital: value })}
              />

              <Field id="aadhaar" label="Aadhaar last 4 digits">
                <Input
                  id="aadhaar"
                  className="bg-muted tabular-nums"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.aadhaar_last_four}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      aadhaar_last_four: event.target.value.replace(/[^\d]/g, "").slice(0, 4),
                    })
                  }
                />
              </Field>

              <div className="sm:col-span-2">
                <Field id="udyam" label="Udyam registration number (optional)">
                  <Input
                    id="udyam"
                    className="bg-muted"
                    placeholder="UDYAM-MH-00-0000000"
                    value={form.udyam_number}
                    onChange={(event) =>
                      setForm({ ...form, udyam_number: event.target.value.toUpperCase() })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-md border bg-secondary p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-muted-foreground">Requested</span>
                <span className="font-medium tabular-nums">
                  {formatINR(eligibility.amount || 0)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-2">
                <span className="text-muted-foreground">Your margin</span>
                <span className="font-medium tabular-nums">
                  {formatINR(eligibility.margin || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && receipt && scheme && (
          <div className="py-6 text-center">
            <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-success" />
            <h2 className="mt-3 text-xl font-semibold">Application recorded</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {scheme.name}. Quote this reference when you follow up.
            </p>
            <p className="mx-auto mt-5 w-fit rounded-md border bg-muted px-4 py-3 font-mono text-base font-semibold">
              {receipt}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={restart}>
                Start another
              </Button>
              <Button asChild>
                <a href={scheme.portalUrl} target="_blank" rel="noreferrer">
                  Apply on Udyamimitra
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 text-sm font-medium text-destructive"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              disabled={step === 1}
              onClick={() => {
                setError("");
                setStep((value) => Math.max(1, value - 1));
              }}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={goNext}>Continue</Button>
            ) : (
              <Button onClick={() => void submit()}>Submit application</Button>
            )}
          </div>
        )}
      </Panel>

      {applications.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Your applications</h2>
          <div className="mt-4 space-y-4">
            {applications.map((application) => {
              const current = Math.max(0, STATUS_STAGES.indexOf(application.status));
              return (
                <article key={application.id} className="rounded-md border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{application.scheme_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {application.reference_id} ·{" "}
                        {formatDate(String(application.submitted_at).slice(0, 10))}
                      </p>
                    </div>
                    <Badge>{application.status}</Badge>
                  </div>

                  <ol className="mt-5 grid grid-cols-4 gap-2">
                    {STATUS_STAGES.map((stage, index) => {
                      const reached = index <= current;
                      return (
                        <li key={stage} className="text-center">
                          <div className="flex items-center">
                            <div
                              className={
                                index <= current
                                  ? "h-px flex-1 bg-primary"
                                  : "h-px flex-1 bg-border"
                              }
                            />
                            <span className={reached ? "text-primary" : "text-muted-foreground"}>
                              {reached ? (
                                <CheckCircle2 aria-hidden="true" className="size-5" />
                              ) : (
                                <Circle aria-hidden="true" className="size-5" />
                              )}
                            </span>
                            <div
                              className={
                                index < current ? "h-px flex-1 bg-primary" : "h-px flex-1 bg-border"
                              }
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">{stage}</p>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        This records a planning application inside Sahiti. Sanction, documents and disbursement stay
        with the bank or the administering ministry.
      </p>
    </div>
  );
}
