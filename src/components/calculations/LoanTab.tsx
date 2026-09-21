import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/format";
import { calculateLoan, MAX_MARGIN, MICRO_FINANCE_CEILING, MIN_MARGIN } from "@/lib/loan";
import { Field, Metric, Panel, ShareBar } from "./shared";

/** Presets save a lot of typing on a phone keypad. */
const PRESETS = [5_000, 50_000, 200_000, 1_000_000];

const PREVIEW_ROWS = 4;

export function LoanTab() {
  const [marginText, setMarginText] = useState("50000");
  const [showAllQuarters, setShowAllQuarters] = useState(false);

  const margin = Number(marginText);
  const valid = Number.isFinite(margin) && margin >= MIN_MARGIN && margin <= MAX_MARGIN;
  const result = useMemo(() => (valid ? calculateLoan(margin) : null), [margin, valid]);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <Panel title="Your contribution" className="h-fit">
        <Field
          id="margin"
          label="Margin capital (rupees)"
          hint={`Between ${formatINR(MIN_MARGIN)} and ${formatINR(MAX_MARGIN)}. Project cost works out to ten times this, and the loan covers up to ninety percent of that cost.`}
          error={
            !valid && marginText.length > 0
              ? `Enter an amount between ${formatINR(MIN_MARGIN)} and ${formatINR(MAX_MARGIN)}.`
              : undefined
          }
        >
          <Input
            id="margin"
            className="bg-muted tabular-nums"
            inputMode="numeric"
            value={marginText}
            aria-describedby="margin-hint"
            onChange={(event) => setMarginText(event.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={Number(marginText) === preset ? "default" : "outline"}
              onClick={() => setMarginText(String(preset))}
            >
              {formatINR(preset)}
            </Button>
          ))}
        </div>

        {result && (
          <div className="mt-5 rounded-md border bg-secondary p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              This routes to
            </p>
            <p className="mt-1 font-semibold">{result.scheme.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {result.projectCost <= MICRO_FINANCE_CEILING
                ? "Project cost stays inside the micro finance ceiling."
                : "Project cost is past the micro ceiling, so the term loan applies."}
            </p>
          </div>
        )}
      </Panel>

      {result ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Project cost" value={formatINR(result.projectCost)} />
            <Metric
              label="Maximum loan"
              value={formatINR(result.maxLoan)}
              hint="90% of project cost"
            />
            <Metric label="Monthly EMI" value={formatINR(result.emi)} />
            <Metric
              label="Total interest"
              value={formatINR(result.totalInterest)}
              hint={`over ${result.repaymentMonths} months`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Scheme terms">
              <dl className="space-y-3 text-sm">
                <Row label="Interest rate" value={`${result.scheme.interestRate}% a year`} />
                <Row label="Tenure" value={`${result.scheme.tenureYears} years`} />
                <Row label="Moratorium" value={`${result.scheme.moratoriumMonths} months`} />
                <Row label="Repayment period" value={`${result.repaymentMonths} months`} />
              </dl>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {result.scheme.summary}
              </p>
            </Panel>

            <Panel title="What it costs you">
              <dl className="space-y-3 text-sm">
                <Row
                  label="Every rupee borrowed repays as"
                  value={`${(result.totalPayable / result.maxLoan).toFixed(2)}`}
                />
                <Row
                  label="Interest on top of the loan"
                  value={`${((result.totalInterest / result.maxLoan) * 100).toFixed(1)}%`}
                />
                <Row label="Total repayable" value={formatINR(result.totalPayable)} />
              </dl>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Moratorium interest is rolled into the repayment schedule, which is why the multiple
                sits above one.
              </p>
            </Panel>
          </div>

          <Panel title="Where the project cost goes">
            <ul className="space-y-4">
              {result.workingCapital.map((item) => (
                <li key={item.label}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium tabular-nums">{formatINR(item.amount)}</span>
                  </div>
                  <div className="mt-1.5">
                    <ShareBar percent={item.share * 100} label={item.label} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Repayment schedule"
            description="Quarter by quarter, with moratorium interest already included."
            action={
              result.quarters.length > PREVIEW_ROWS ? (
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={showAllQuarters}
                  onClick={() => setShowAllQuarters((value) => !value)}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={showAllQuarters ? "size-4 rotate-180" : "size-4"}
                  />
                  {showAllQuarters ? "Show less" : `All ${result.quarters.length} quarters`}
                </Button>
              ) : null
            }
          >
            <div className="-mx-5 -my-5 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Quarterly repayment schedule</caption>
                <thead className="bg-muted text-left">
                  <tr>
                    <th scope="col" className="p-3 font-medium">
                      Qtr
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Opening
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Principal
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Interest
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Payment
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Closing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllQuarters ? result.quarters : result.quarters.slice(0, PREVIEW_ROWS)).map(
                    (row) => (
                      <tr key={row.quarter} className="border-t">
                        <td className="p-3 tabular-nums">{row.quarter}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.opening)}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.principal)}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.interest)}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.payment)}</td>
                        <td className="p-3 tabular-nums">{formatINR(row.closing)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {!showAllQuarters && result.quarters.length > PREVIEW_ROWS && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing the first {PREVIEW_ROWS} of {result.quarters.length} quarters.
              </p>
            )}
          </Panel>

          <p className="text-xs leading-5 text-muted-foreground">
            Indicative. The bank sets the final rate, tenure and moratorium.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Enter your margin capital to see the structure.
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}
