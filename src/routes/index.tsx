import { createFileRoute, Link } from "@tanstack/react-router";
import documentsImg from "@/assets/documents-desk.jpg";
import heroImg from "@/assets/hero-market.jpg";
import marketImg from "@/assets/market-cluster.jpg";
import shopImg from "@/assets/shop-interior.jpg";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sahiti | Clearer decisions. Local context." },
      {
        name: "description",
        content:
          "Sahiti is a business advisory and financial structuring assistant for rural micro-entrepreneurs: loan planning, document guidance, local market risk and progress tracking.",
      },
      { property: "og:title", content: "Sahiti | Clearer decisions. Local context." },
      {
        property: "og:description",
        content:
          "Plan a loan, prepare documents, study local market risk and track business progress in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    title: "Loan calculator",
    body: "Turn your margin capital into project cost, loan size, and a repayment table you can read.",
    image: shopImg,
    alt: "Snack shelves in a neighbourhood kirana shop in Maharashtra",
  },
  {
    n: "02",
    title: "Document guide",
    body: "Know which papers the bank will ask for before you queue at the branch.",
    image: documentsImg,
    alt: "Hands filling in paperwork on a desk",
  },
  {
    n: "03",
    title: "Market check",
    body: "Real Lohegaon shops on the map, plus research zones for competition and demand.",
    image: marketImg,
    alt: "Fresh vegetables and fruit stacked at a Delhi market stall",
  },
];

function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="relative isolate min-h-[min(78dvh,44rem)] overflow-hidden bg-primary text-primary-foreground">
          <img
            src={heroImg}
            alt=""
            className="sahiti-hero-media absolute inset-0 size-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/88 to-primary/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-primary/25" />

          <div className="relative mx-auto flex min-h-[min(78dvh,44rem)] max-w-7xl flex-col justify-end px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
            <p className="sahiti-reveal sahiti-kicker text-saffron">Smart India Hackathon 2026</p>
            <h1 className="sahiti-reveal sahiti-reveal-delay mt-4 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Sahiti
            </h1>
            <p className="sahiti-reveal sahiti-reveal-delay-2 mt-5 max-w-xl text-lg leading-8 text-white/88 sm:text-xl">
              Plan a loan, gather papers, and read your local market before you put money in.
            </p>
            <div className="sahiti-reveal sahiti-reveal-delay-2 mt-9 flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 bg-saffron px-7 text-base font-semibold text-foreground hover:bg-saffron/90"
              >
                <Link to="/auth">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-white/35 bg-white/5 px-7 text-base text-white hover:bg-white/12 hover:text-white"
              >
                <Link to="/about">About the project</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="sahiti-kicker text-primary">How Sahiti helps</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              From first market check to a confident next move.
            </h2>
          </div>

          <div className="mt-12 space-y-14">
            {STEPS.map((step, index) => (
              <article
                key={step.n}
                className={`grid items-center gap-8 lg:grid-cols-2 ${
                  index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="overflow-hidden rounded-lg border border-border/80 shadow-[0_18px_50px_rgb(30_58_138_/_0.08)]">
                  <img
                    src={step.image}
                    alt={step.alt}
                    className="aspect-[16/10] h-full w-full object-cover"
                  />
                </div>
                <div className={index % 2 === 1 ? "lg:pr-8" : "lg:pl-8"}>
                  <p className="text-xs font-semibold tracking-[0.18em] text-saffron">{step.n}</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-primary sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="max-w-xl">
              <p className="sahiti-kicker text-saffron">Made for the everyday entrepreneur</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Clearer decisions. Local context.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Keep loan numbers, documents, and the Lohegaon map close to real life — not buried
                in a brochure.
              </p>
            </div>
            <Button
              asChild
              className="h-12 shrink-0 bg-saffron px-7 text-base font-semibold text-foreground hover:bg-saffron/90"
            >
              <Link to="/auth">Open Sahiti</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
            Prototype for Smart India Hackathon 2026, MoSJE problem statement 26091. Market and map
            figures shown in the app are demonstration research, not official data.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
