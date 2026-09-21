import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "./shared";

export function MarketTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["risk-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_locations")
        .select("*")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-secondary p-4 text-sm leading-6 text-muted-foreground">
        Demonstration research across eight locations near Lohegaon. Higher opportunity is better;
        higher competition and saturation mean tougher trading.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {locations.map((place) => {
          const open = openId === place.id;
          return (
            <article key={place.id} className="rounded-md border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{place.name}</h3>
                  <p className="text-sm text-muted-foreground">{place.business_type}</p>
                </div>
                <span className="rounded-sm bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground tabular-nums">
                  {place.risk_score}/10
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Score label="Competition" value={place.competitor_density} />
                <Score label="Saturation" value={place.market_saturation} />
                <Score label="Seasonal" value={place.seasonal_demand_risk} />
              </dl>

              {open && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-sm leading-6">{place.demand_note}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{place.roi_note}</p>
                  <p className="text-xs text-muted-foreground">{place.address}</p>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : place.id)}
              >
                <ChevronDown aria-hidden="true" className={open ? "size-4 rotate-180" : "size-4"} />
                {open ? "Less" : "Notes"}
              </Button>
            </article>
          );
        })}
      </div>

      <Panel>
        <p className="text-xs leading-5 text-muted-foreground">
          Sahiti demonstration research, not an official survey. Confirm anything you rely on.
        </p>
      </Panel>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}/10</dd>
    </div>
  );
}
