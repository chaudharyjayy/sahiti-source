import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { findSchemes, formatSchemeAmount, SCHEME_SECTORS, type SchemeStage } from "@/data/schemes";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { useSession } from "@/lib/session";
import { Field, Metric, MoneyField, Panel, ShareBar } from "./shared";

const ASPIRATION_KEY = "sahiti-aspiration";

type Aspiration = {
  sector: string;
  amount: string;
  stage: SchemeStage;
};

const EMPTY_ASPIRATION: Aspiration = { sector: "Retail", amount: "", stage: "new" };

type RiskFactor = {
  label: string;
  points: number;
  max: number;
  note: string;
};

/**
 * Risk rating built only from the numbers the person actually typed in.
 * Every point is attributed to a named factor so the score can be argued with,
 * rather than appearing as an unexplained verdict.
 *
 * Lower is safer. 0 to 10.
 */
function rateRisk(entries: Array<{ sales: number; expenses: number; target: number }>) {
  if (entries.length === 0) return null;

  const sales = entries.reduce((sum, row) => sum + row.sales, 0);
  const expenses = entries.reduce((sum, row) => sum + row.expenses, 0);
  const profit = sales - expenses;
  const margin = sales > 0 ? profit / sales : -1;
  const expenseRatio = sales > 0 ? expenses / sales : 1;

  const factors: RiskFactor[] = [];

  // 1. Does the business actually make money?
  const profitPoints = margin < 0 ? 3 : margin < 0.1 ? 2 : margin < 0.2 ? 1 : 0;
  factors.push({
    label: "Profitability",
    points: profitPoints,
    max: 3,
    note:
      margin < 0
        ? `Losing ${formatINR(Math.abs(profit))} across the months logged.`
        : `Net margin of ${(margin * 100).toFixed(1)}% across the months logged.`,
  });

  // 2. How much of every rupee earned goes straight back out?
  const expensePoints =
    expenseRatio > 0.95 ? 2 : expenseRatio > 0.85 ? 1.5 : expenseRatio > 0.7 ? 0.75 : 0;
  factors.push({
    label: "Expense load",
    points: expensePoints,
    max: 2,
    note: `${(expenseRatio * 100).toFixed(0)}% of sales goes out as expenses.`,
  });

  // 3. Is the newest month better or worse than the one before?
  let trendPoints = 0;
  let trendNote = "Only one month logged, so no trend yet.";
  if (entries.length >= 2) {
    const latest = entries[entries.length - 1];
    const previous = entries[entries.length - 2];
    if (latest && previous && previous.sales > 0) {
      const change = (latest.sales - previous.sales) / previous.sales;
      trendPoints = change < -0.15 ? 2 : change < 0 ? 1 : 0;
      trendNote =
        change < 0
          ? `Sales fell ${(Math.abs(change) * 100).toFixed(0)}% against the previous month.`
          : `Sales rose ${(change * 100).toFixed(0)}% against the previous month.`;
    }
  }
  factors.push({ label: "Sales trend", points: trendPoints, max: 2, note: trendNote });

  // 4. How jumpy is the income?
  let volatilityPoints = 0;
  let volatilityNote = "Needs at least two months to measure swings.";
  if (entries.length >= 2) {
    const mean = sales / entries.length;
    if (mean > 0) {
      const variance =
        entries.reduce((sum, row) => sum + (row.sales - mean) ** 2, 0) / entries.length;
      const spread = Math.sqrt(variance) / mean;
      volatilityPoints = spread > 0.4 ? 2 : spread > 0.2 ? 1 : 0;
      volatilityNote = `Monthly sales swing about ${(spread * 100).toFixed(0)}% around the average.`;
    }
  }
  factors.push({
    label: "Income stability",
    points: volatilityPoints,
    max: 2,
    note: volatilityNote,
  });

  // 5. A lender wants to see a track record.
  const historyPoints = entries.length >= 6 ? 0 : entries.length >= 3 ? 0.5 : 1;
  factors.push({
    label: "Track record",
    points: historyPoints,
    max: 1,
    note: `${entries.length} month${entries.length === 1 ? "" : "s"} of figures recorded.`,
  });

  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = Math.max(0, Math.min(10, Number(total.toFixed(1))));
  const band = score <= 2.5 ? "Low" : score <= 5 ? "Moderate" : score <= 7.5 ? "Elevated" : "High";
  const tone = score <= 2.5 ? "text-success" : score <= 5 ? "text-foreground" : "text-destructive";

  return { score, band, tone, factors };
}

export function RoiTrackerTab() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [aspiration, setAspiration] = useState<Aspiration>(EMPTY_ASPIRATION);
  const [form, setForm] = useState({ period: "", sales: "", expenses: "", target: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(ASPIRATION_KEY);
    if (!saved) return;
    try {
      setAspiration({ ...EMPTY_ASPIRATION, ...(JSON.parse(saved) as Partial<Aspiration>) });
    } catch {
      // A stale or hand-edited value should not break the tab.
    }
  }, []);

  function saveAspiration(next: Aspiration) {
    setAspiration(next);
    window.localStorage.setItem(ASPIRATION_KEY, JSON.stringify(next));
  }

  const { data: entries = [] } = useQuery({
    queryKey: ["roi", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("roi_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("period", { ascending: true });
      if (queryError) throw queryError;
      return data;
    },
  });

  async function addEntry() {
    setError("");
    const sales = Number(form.sales);
    const expenses = Number(form.expenses);
    const target = Number(form.target || 0);
    if (!form.period.trim()) return setError("Enter the month as YYYY-MM, for example 2026-03");
    if (!Number.isFinite(sales) || sales < 0) return setError("Sales must be zero or more");
    if (!Number.isFinite(expenses) || expenses < 0)
      return setError("Expenses must be zero or more");

    const { error: insertError } = await supabase.from("roi_entries").insert({
      user_id: user!.id,
      period: form.period.trim(),
      sales,
      expenses,
      target,
    });
    if (insertError) return setError(insertError.message);
    setForm({ period: "", sales: "", expenses: "", target: "" });
    await queryClient.invalidateQueries({ queryKey: ["roi", user?.id] });
    toast.success("Month saved");
  }

  async function remove(id: string) {
    await supabase.from("roi_entries").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["roi", user?.id] });
  }

  // Every figure below recomputes on each keystroke or entry change.
  const numbers = useMemo(() => {
    const rows = entries.map((row) => ({
      sales: Number(row.sales),
      expenses: Number(row.expenses),
      target: Number(row.target),
    }));
    const sales = rows.reduce((sum, row) => sum + row.sales, 0);
    const expenses = rows.reduce((sum, row) => sum + row.expenses, 0);
    const target = rows.reduce((sum, row) => sum + row.target, 0);
    const profit = sales - expenses;
    return {
      rows,
      sales,
      expenses,
      target,
      profit,
      roi: expenses > 0 ? (profit / expenses) * 100 : 0,
      margin: sales > 0 ? (profit / sales) * 100 : 0,
      expenseRatio: sales > 0 ? (expenses / sales) * 100 : 0,
      averageProfit: rows.length > 0 ? profit / rows.length : 0,
      attainment: target > 0 ? (sales / target) * 100 : null,
      peak: Math.max(1, ...rows.map((row) => row.sales)),
    };
  }, [entries]);

  const risk = useMemo(() => rateRisk(numbers.rows), [numbers.rows]);

  const eligible = useMemo(
    () =>
      findSchemes({
        sector: aspiration.sector,
        amount: Number(aspiration.amount) || undefined,
        stage: aspiration.stage,
      }).slice(0, 3),
    [aspiration],
  );

  return (
    <div className="space-y-6">
      <Panel
        title="What are you building?"
        description="Tell us the venture you are working toward. Scheme matches below follow these answers."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="aspiration-sector">Business you are aspiring for</Label>
            <Select
              value={aspiration.sector}
              onValueChange={(value) => saveAspiration({ ...aspiration, sector: value })}
            >
              <SelectTrigger id="aspiration-sector" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEME_SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MoneyField
            id="aspiration-amount"
            label="Funding you are aiming for"
            value={aspiration.amount}
            hint="Optional, but it sharpens the scheme matches."
            onChange={(value) => saveAspiration({ ...aspiration, amount: value })}
          />

          <div>
            <Label htmlFor="aspiration-stage">Where you stand</Label>
            <Select
              value={aspiration.stage}
              onValueChange={(value) =>
                saveAspiration({ ...aspiration, stage: value as SchemeStage })
              }
            >
              <SelectTrigger id="aspiration-stage" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Starting fresh</SelectItem>
                <SelectItem value="existing">Already trading</SelectItem>
                <SelectItem value="either">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Sales logged" value={formatINR(numbers.sales)} />
        <Metric label="Net profit" value={formatINR(numbers.profit)} />
        <Metric
          label="Return on investment"
          value={`${numbers.roi.toFixed(1)}%`}
          hint="Profit against what you spent"
        />
        <Metric
          label="Net margin"
          value={`${numbers.margin.toFixed(1)}%`}
          hint="Profit against sales"
        />
        <Metric
          label="Expense ratio"
          value={`${numbers.expenseRatio.toFixed(0)}%`}
          hint="Every rupee of sales spent"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Add a month" description="One row per month keeps the trend readable.">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field id="period" label="Month">
                <Input
                  id="period"
                  className="bg-muted"
                  placeholder="2026-03"
                  value={form.period}
                  onChange={(event) => setForm({ ...form, period: event.target.value })}
                />
              </Field>
              <MoneyField
                id="sales"
                label="Sales"
                value={form.sales}
                onChange={(value) => setForm({ ...form, sales: value })}
              />
              <MoneyField
                id="expenses"
                label="Expenses"
                value={form.expenses}
                onChange={(value) => setForm({ ...form, expenses: value })}
              />
              <MoneyField
                id="target"
                label="Target"
                value={form.target}
                hint="Optional"
                onChange={(value) => setForm({ ...form, target: value })}
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button className="mt-4" onClick={() => void addEntry()}>
              Save month
            </Button>
          </Panel>

          <Panel title="Monthly performance">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add your first month and the ratios above start moving.
              </p>
            ) : (
              <ul className="space-y-4">
                {entries.map((row) => {
                  const rowProfit = Number(row.sales) - Number(row.expenses);
                  const beaten = Number(row.target) > 0 && Number(row.sales) >= Number(row.target);
                  return (
                    <li key={row.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{row.period}</span>
                        <span className="flex items-center gap-3">
                          <span className="tabular-nums text-muted-foreground">
                            {formatINR(Number(row.sales))} sales ·{" "}
                            <span className={rowProfit >= 0 ? "text-success" : "text-destructive"}>
                              {formatINR(rowProfit)}
                            </span>
                            {beaten && " · hit target"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete entry for ${row.period}`}
                            onClick={() => void remove(row.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ShareBar
                          percent={(Number(row.sales) / numbers.peak) * 100}
                          label={`${row.period} sales`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Risk rating">
            {risk ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-semibold tabular-nums ${risk.tone}`}>
                    {risk.score.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">out of 10 · {risk.band}</span>
                </div>
                <div className="mt-3">
                  <ShareBar percent={risk.score * 10} label="Risk rating" />
                </div>
                <ul className="mt-4 space-y-3">
                  {risk.factors.map((factor) => (
                    <li key={factor.label} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{factor.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {factor.points}/{factor.max}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {factor.note}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Lower is steadier. Built only from the months you entered.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Log a month and a rating appears here.
              </p>
            )}
          </Panel>

          <Panel title="Schemes you may qualify for">
            <ul className="space-y-3">
              {eligible.map((match) => (
                <li key={match.scheme.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{match.scheme.name}</h3>
                    {match.amountFits && (
                      <span className="rounded-sm bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                        Fits your amount
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSchemeAmount(match.scheme)}
                  </p>
                  <p className="mt-2 text-sm leading-5">{match.scheme.summary}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {match.reasons.slice(0, 2).map((reason) => (
                      <li
                        key={reason}
                        className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <a
              href={eligible[0]?.scheme.portalUrl ?? "https://www.udyamimitra.in/"}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Check current terms on Udyamimitra
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </Panel>

          {numbers.attainment !== null && (
            <Panel title="Target attainment">
              <p className="text-2xl font-semibold tabular-nums">
                {numbers.attainment.toFixed(0)}%
              </p>
              <div className="mt-3">
                <ShareBar percent={numbers.attainment} label="Target attainment" />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Against {formatINR(numbers.target)} of targets you set. Average monthly profit is{" "}
                {formatINR(numbers.averageProfit)}.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
