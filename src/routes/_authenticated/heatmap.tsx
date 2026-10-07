import { useQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { LocateFixed } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { SHOP_CATEGORIES, SHOPS } from "@/data/shops";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLanguage } from "@/lib/i18n";
import { rateLocation, type SwotRating } from "@/lib/sahitiRating";

const RiskMap = lazy(() => import("@/components/RiskMap"));

type Layer = "both" | "shops" | "zones";

const LAYERS: Array<{ value: Layer; key: string }> = [
  { value: "shops", key: "shopsLayer" },
  { value: "zones", key: "zonesLayer" },
  { value: "both", key: "bothLayer" },
];

/** The rating engine reports the footfall band in English; map it to a key. */
function footfallKey(footfall: string): string {
  if (footfall.startsWith("ADYPU")) return "footfallAdypu";
  if (footfall.startsWith("Lohegaon")) return "footfallMarket";
  if (footfall.startsWith("Between")) return "footfallBetween";
  return "footfallOuter";
}

/** Stat cards above the map. */
function StatsRow({
  total,
  low,
  moderate,
  high,
}: {
  total: number;
  low: number;
  moderate: number;
  high: number;
}) {
  const { t } = useLanguage();
  const cards = [
    { label: t("activeStores"), value: total, color: undefined },
    { label: t("lowRisk"), value: low, color: "#10b981" },
    { label: t("moderateRisk"), value: moderate, color: "#f59e0b" },
    { label: t("highRisk"), value: high, color: "#ef4444" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border p-3">
          <p
            className="text-lg font-semibold"
            style={card.color ? { color: card.color } : undefined}
          >
            {card.value}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * One S.W.O.T. row: the letter, what it measured, and the 0-10 it scored.
 */
function SwotRow({
  letter,
  label,
  note,
  value,
}: {
  letter: string;
  label: string;
  note: string;
  value: number;
}) {
  const color = value >= 7 ? "#10b981" : value >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-sm text-sm font-bold text-white"
        style={{ background: color }}
      >
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {label} <span className="font-normal text-muted-foreground">· {note}</span>
        </p>
      </div>
      <span className="shrink-0 tabular-nums text-sm font-semibold" style={{ color }}>
        {value}/10
      </span>
    </div>
  );
}

/**
 * The Sahiti Rating read-out: overall score first, then the four S.W.O.T.
 * parts that built it. The subtitle is the footfall band, never coordinates —
 * latitude and longitude mean nothing to the reader.
 */
export function RatingCard({
  rating,
  title,
  footfallLabel,
  categoryLabel,
}: {
  rating: SwotRating;
  title: string;
  footfallLabel: string;
  categoryLabel: string;
}) {
  const { t } = useLanguage();
  const overallColor = rating.score >= 7 ? "#10b981" : rating.score >= 5 ? "#f59e0b" : "#ef4444";

  // The engine's verdict and advice are score/rival counts, so the translated
  // wording is picked here from the same numbers rather than shown in English.
  const verdictKey =
    rating.score >= 7
      ? "ratingVerdictStrong"
      : rating.score >= 5
        ? "ratingVerdictWorkable"
        : "ratingVerdictTough";
  const adviceKey =
    rating.rivals === 0
      ? "ratingAdvice0"
      : rating.rivals <= 2
        ? "ratingAdviceFew"
        : "ratingAdviceMany";

  return (
    <div className="sahiti-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{footfallLabel}</p>
        </div>
        <div className="text-right">
          <p
            className="font-display text-4xl font-semibold tabular-nums"
            style={{ color: overallColor }}
          >
            {rating.score.toFixed(1)}
            <span className="text-base text-muted-foreground">/10</span>
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("rateTitle")}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{t("swotOverall")}</p>

      <div className="mt-3 divide-y">
        <SwotRow
          letter="S"
          label={t("swotStrength")}
          note={footfallLabel}
          value={rating.strength}
        />
        <SwotRow
          letter="W"
          label={t("swotWeakness")}
          note={t("rivalsWithin", { n: rating.rivals })}
          value={rating.weakness}
        />
        <SwotRow
          letter="O"
          label={t("swotOpportunity")}
          note={t("streetShops", {
            n: rating.streetActivity,
            mood: t(rating.streetActivity < 8 ? "roomToGrow" : "busyStreet"),
          })}
          value={rating.opportunity}
        />
        <SwotRow
          letter="T"
          label={t("swotThreats")}
          note={
            rating.nearestRival
              ? t("nearestRival", {
                  name: rating.nearestRival.name,
                  m: rating.nearestRival.distanceMeters,
                })
              : t("noRivalNearby")
          }
          value={rating.threats}
        />
      </div>

      <p className="mt-3 text-sm font-medium">{t(verdictKey)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(adviceKey, { n: rating.rivals, category: categoryLabel })}
      </p>
    </div>
  );
}

/**
 * The pick-a-spot rating block under the map: category picker, run button,
 * and the rating once a spot has been rated.
 */
function SahitiRatingPanel({
  candidate,
  rating,
  ratingCategory,
  onCategoryChange,
  onRate,
}: {
  candidate: { lat: number; lng: number } | null;
  rating: SwotRating | null;
  ratingCategory: string;
  onCategoryChange: (category: string) => void;
  onRate: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section aria-label={t("rateTitle")} className="mt-6">
      <div className="sahiti-panel flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{t("rateTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("rateIntro")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="rating-category">
            {t("shopType")}
          </label>
          <select
            id="rating-category"
            value={ratingCategory}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {SHOP_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`cat.${category}`)}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={!candidate} onClick={onRate}>
            {candidate ? t("rateThisSpot") : t("clickMapFirst")}
          </Button>
        </div>
      </div>

      {rating ? (
        <div className="mt-4">
          <RatingCard
            rating={rating}
            title={t("openingHere", { category: t(`cat.${ratingCategory}`).toLowerCase() })}
            footfallLabel={t(footfallKey(rating.footfall))}
            categoryLabel={t(`cat.${ratingCategory}`)}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Risk legend matching the corridor pin colouring. */
function RiskLegend() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium">{t("pinColour")}</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ background: "#10b981" }}
        />
        {t("lowRiskLegend")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ background: "#f59e0b" }}
        />
        {t("moderateLegend")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ background: "#ef4444" }}
        />
        {t("highRiskLegend")}
      </span>
    </div>
  );
}

/** The three big verdicts, one per area colour. */
function SafeZoneCards() {
  const { t } = useLanguage();
  const zones = [
    { name: t("zoneGreenName"), body: t("zoneGreenBody"), color: "#15803D" },
    { name: t("zoneAmberName"), body: t("zoneAmberBody"), color: "#B45309" },
    { name: t("zoneRedName"), body: t("zoneRedBody"), color: "#B91C1C" },
  ];
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{t("safeZonesTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("safeZonesIntro")}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {zones.map((zone) => (
          <article key={zone.name} className="rounded-md border p-5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-full"
                style={{ background: zone.color }}
              />
              <h3 className="text-base font-semibold">{zone.name}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{zone.body}</p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("zoneLegend")}</p>
    </section>
  );
}

/** Stat cards above the filters, as on the SIH dashboard. */
function StatsRow({ total, low, verified }: { total: number; low: number; verified: number }) {
  const cards = [
    { label: "Active stores", value: total, color: undefined },
    { label: "Low-risk pockets", value: low, color: "#10b981" },
    { label: "Google verified", value: verified, color: "#38bdf8" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border p-3">
          <p className="text-lg font-semibold" style={card.color ? { color: card.color } : undefined}>
            {card.value}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Risk legend matching the SIH corridor colouring. */
function RiskLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium">Pin colour:</span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: "#10b981" }} />
        Low risk (opportunity)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: "#f59e0b" }} />
        Moderate
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: "#ef4444" }} />
        High risk (saturated)
      </span>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/heatmap")({
  head: () => ({
    meta: [
      { title: "Risk map | Sahiti" },
      {
        name: "description",
        content:
          "Real shops around Lohegaon and the ADYPU corridor with Sahiti safe zones, plus a S.W.O.T. rating for any spot you pick.",
      },
      { property: "og:title", content: "Sahiti risk map" },
      {
        property: "og:description",
        content: "Sahiti safe zones and a Sahiti Rating for any spot on the map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Heatmap,
});

<<<<<<< HEAD
/** One shop card. Real OpenStreetMap fields only; nothing is inferred. */
function ShopCard({ shop, onFocus }: { shop: Shop; onFocus?: (shop: Shop) => void }) {
  const meta = [
    shop.openingHours,
    shop.payments && shop.payments.length > 0 ? shop.payments.join(", ") : null,
  ].filter(Boolean);

  return (
    <article className="flex flex-col rounded-md border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5">{shop.name}</h3>
          {shop.nameMr ? (
            <p className="text-xs text-muted-foreground">{shop.nameMr}</p>
          ) : null}
        </div>
        <span
          className="mt-0.5 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ background: shop.corridor?.riskColor ?? SHOP_CATEGORY_COLORS[shop.category] }}
        >
          {shop.riskLevel === "low" ? "Low risk" : shop.riskLevel === "high" ? "High risk" : shop.riskLevel === "moderate" ? "Moderate" : shop.category}
        </span>
      </div>

      {shop.rating !== undefined ? (
        <p className="mt-1.5 text-xs font-medium text-amber-600">
          ★ {shop.rating.toFixed(1)}
          {shop.reviewCount !== undefined ? ` (${shop.reviewCount} reviews)` : ""}
        </p>
      ) : null}

      <p className="mt-2 text-xs font-medium text-muted-foreground">{shop.locality}</p>
      <p className="mt-1 text-sm text-muted-foreground">{formatShopAddress(shop)}</p>

      {shop.riskDescription ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{shop.riskDescription}</p>
      ) : null}

      {shop.recommendedSchemes && shop.recommendedSchemes.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Schemes: {shop.recommendedSchemes.slice(0, 2).map((scheme) => scheme.name).join(", ")}
        </p>
      ) : null}

      {meta.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{meta.join(" · ")}</p>
      ) : null}

      {shop.phone ? (
        <a
          href={"tel:" + shop.phone.replace(/\s+/g, "")}
          className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
        >
          {shop.phone}
        </a>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs font-medium">
        {onFocus ? (
          <button
            type="button"
            onClick={() => onFocus(shop)}
            className="text-primary underline underline-offset-2"
          >
            Show on map
          </button>
        ) : null}
        <a
          href={shopGoogleMapsUrl(shop)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
        >
          Google Maps
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        <a
          href={shopGoogleDirectionsUrl(shop)}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          Directions
        </a>
        {shop.website ? (
          <a
            href={shop.website}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Website
          </a>
        ) : null}
      </div>
    </article>
  );
}

=======
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
function Heatmap() {
  const { t } = useLanguage();
  const [layer, setLayer] = useState<Layer>("both");
<<<<<<< HEAD
  const [zoneFilter, setZoneFilter] = useState("All");
  const [localityFilter, setLocalityFilter] = useState<"All" | ShopLocality>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ShopCategory>("All");
  const [search, setSearch] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const [areaFocusToken, setAreaFocusToken] = useState(0);
  // Feasibility simulator state (ported from the SIH dashboard's Risk Simulator tab).
  const [candidate, setCandidate] = useState<{ lat: number; lng: number } | null>(null);
  const [simType, setSimType] = useState<string>(SIMULATOR_BUSINESS_TYPES[0]);
  const [simBudget, setSimBudget] = useState(200000);
  const [simResult, setSimResult] = useState<FeasibilityResult | null>(null);
=======
  const [focusToken, setFocusToken] = useState(0);
  // Sahiti Rating: pick a spot on the map, choose a trade, read the S.W.O.T. score.
  const [candidate, setCandidate] = useState<{ lat: number; lng: number } | null>(null);
  const [ratingCategory, setRatingCategory] = useState<string>("General store");
  const [rating, setRating] = useState<SwotRating | null>(null);
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
  const geo = useGeolocation();

  // Each fresh fix recentres the map exactly once, so panning afterwards sticks.
  useEffect(() => {
    if (geo.position) setFocusToken((value) => value + 1);
  }, [geo.position]);

  const { data: zones = [] } = useQuery({
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

  const corridorStats = useMemo(
    () => ({
      total: SHOPS.length,
      lowRisk: SHOPS.filter((shop) => shop.riskLevel === "low").length,
      moderate: SHOPS.filter((shop) => shop.riskLevel === "moderate").length,
      high: SHOPS.filter((shop) => shop.riskLevel === "high").length,
    }),
    [],
  );

<<<<<<< HEAD
  const visibleShops = useMemo(
    () =>
      SHOPS.filter(
        (shop) =>
          (localityFilter === "All" || shop.locality === localityFilter) &&
          (categoryFilter === "All" || shop.category === categoryFilter) &&
          (search.trim() === "" ||
            shop.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            (shop.street ?? "").toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [localityFilter, categoryFilter, search],
  );

  const corridorStats = useMemo(
    () => ({
      total: SHOPS.length,
      lowRisk: SHOPS.filter((shop) => shop.riskLevel === "low").length,
      googleVerified: SHOPS.filter((shop) => shop.rating !== undefined).length,
    }),
    [],
  );

  const focus = useMemo(
    () =>
      localityFilter === "All"
        ? null
        : focusForShops(SHOPS.filter((shop) => shop.locality === localityFilter)),
    [localityFilter],
  );

  // Moving to a new locality is a deliberate jump, so re-centre on each change.
  useEffect(() => {
    if (localityFilter !== "All") setAreaFocusToken((value) => value + 1);
  }, [localityFilter]);

=======
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
  const showShops = layer !== "zones";
  const showZones = layer !== "shops";

  return (
    <>
<<<<<<< HEAD
      <PageHeader
        title="Lohegaon shops and risk map"
        description="Hardware, kirana, food, pharmacy and more across the ADYPU–Lohegaon corridor, with Sahiti research zones alongside. Pins combine curated OpenStreetMap listings and the SIH corridor gather, colour-coded by competition risk."
      />
=======
      <PageHeader title={t("mapTitle")} description={t("mapSubtitle")} />
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed

      {showShops && (
        <div className="mb-5">
          <StatsRow
            total={corridorStats.total}
            low={corridorStats.lowRisk}
<<<<<<< HEAD
            verified={corridorStats.googleVerified}
=======
            moderate={corridorStats.moderate}
            high={corridorStats.high}
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
          />
        </div>
      )}

<<<<<<< HEAD
      <div className="mb-5 space-y-4">
=======
      <div className="mb-5">
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
        <div
          role="group"
          aria-label="Choose map layer"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-medium text-muted-foreground">{t("show")}</span>
          {LAYERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={layer === option.value ? "default" : "outline"}
              aria-pressed={layer === option.value}
              onClick={() => setLayer(option.value)}
            >
              {t(option.key)}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={!geo.supported || geo.loading}
            aria-pressed={Boolean(geo.position)}
            onClick={() => geo.locate()}
          >
            <LocateFixed aria-hidden="true" className="size-4" />
            {geo.loading ? t("locating") : geo.position ? t("myLocation") : t("showMyLocation")}
          </Button>
        </div>

        {geo.error && (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
            {geo.error}
          </p>
        )}
      </div>

      {/*
       * isolation traps Leaflet's high z-indexes (panes 400+, controls 1000)
       * inside this box, so the map can never paint over the sticky header
       * while scrolling (BUG-04).
       */}
      <div className="sahiti-map-wrap overflow-hidden rounded-md border">
        <ClientOnly
          /*
           * The placeholder uses the same class as the map itself. Matching the
           * height exactly means the page does not jump when Leaflet mounts.
           */
          fallback={
            <div className="sahiti-map flex items-center justify-center text-sm text-muted-foreground">
              {t("loadingMap")}
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="sahiti-map flex items-center justify-center text-sm text-muted-foreground">
                {t("loadingMap")}
              </div>
            }
          >
            <RiskMap
              zones={showZones ? zones : []}
              shops={showShops ? SHOPS : []}
              userPosition={geo.position}
              focusToken={focusToken}
<<<<<<< HEAD
              areaFocus={focus}
              areaFocusToken={areaFocusToken}
              candidate={showShops ? candidate : null}
              onMapClick={
                showShops
                  ? (lat, lng) => {
                      setCandidate({ lat, lng });
                      setSimResult(null);
                    }
                  : undefined
              }
=======
              candidate={showShops ? candidate : null}
              {...(showShops
                ? {
                    onMapClick: (lat: number, lng: number) => {
                      setCandidate({ lat, lng });
                      setRating(null);
                    },
                  }
                : {})}
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
              showHubs={showShops}
            />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="mt-3 space-y-2">
        {showShops && (
<<<<<<< HEAD
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {SHOP_CATEGORIES.map((category) => (
              <li key={category} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full border border-white shadow-sm"
                  style={{ background: SHOP_CATEGORY_COLORS[category] }}
                />
                {category}
              </li>
            ))}
        {showShops && (
          <>
            <RiskLegend />
            <p className="text-xs text-muted-foreground">
              Circles with a number group nearby shops. Click one to zoom in. Click empty map to
              place a candidate pin for the feasibility check below.
            </p>
          </>
        )}
          </ul>
        )}
        {showZones && (
          <p className="text-xs text-muted-foreground">
            Zone circles: green marks a higher opportunity score, amber a mixed outlook and red a
            tougher location. Figures are Sahiti demonstration research, not official survey data.
          </p>
=======
          <>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {SHOP_CATEGORIES.map((category) => (
                <li key={category} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-primary/70" />
                  {t(`cat.${category}`)}
                </li>
              ))}
            </ul>
            <RiskLegend />
            <p className="text-xs text-muted-foreground">{t("clusterHint")}</p>
            <p className="text-xs text-muted-foreground">{t("rateHint")}</p>
          </>
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
        )}
        {showZones && <p className="text-xs text-muted-foreground">{t("zoneLegend")}</p>}
      </div>

      {showShops && (
<<<<<<< HEAD
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Shops
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {visibleShops.length} of {SHOPS.length}
            </span>
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            OpenStreetMap maps Lohegaon in detail. The ADYPU–Lohegaon corridor gather adds
            pharmacies, food, kirana, banking and other trades with competition notes, ratings and
            distances to the two corridor anchors. Open any listing in Google Maps for reviews,
            photos and the current phone number.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                onFocus={(target) => {
                  setLocalityFilter("All");
                  setAreaFocusToken((value) => value + 1);
                  // Recentre on the shop, then open its popup via the map.
                  window.setTimeout(() => {
                    setAreaFocus({ lat: target.lat, lng: target.lng, zoom: 17 });
                  }, 0);
                }}
              />
            ))}
          </div>

          {visibleShops.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No shops match this combination of area and shop type.
            </p>
          )}
        </section>
=======
        <SahitiRatingPanel
          candidate={candidate}
          rating={rating}
          ratingCategory={ratingCategory}
          onCategoryChange={(category) => {
            setRatingCategory(category);
            setRating(null);
          }}
          onRate={() => {
            if (!candidate) return;
            setRating(
              rateLocation({ lat: candidate.lat, lng: candidate.lng, category: ratingCategory }),
            );
          }}
        />
>>>>>>> refs/remotes/origin/cursor/navy-visual-and-feed
      )}

      {showZones && <SafeZoneCards />}

      <p className="mt-8 text-xs text-muted-foreground">{t("osmCredit")}</p>
    </>
  );
}
