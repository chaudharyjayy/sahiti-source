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

function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <section className="px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-saffron">
                A CLEARER FIRST STEP FOR EVERY BUSINESS
              </p>
              <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.1] text-primary sm:text-5xl">
                Welcome to Sahiti
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Plan a loan, gather papers, and read your local market before you put money in.
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  Plan with clarity
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-saffron" aria-hidden="true" />
                  In your language
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                  Built for real places
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="h-12 px-6 text-base">
                  <Link to="/auth">Get Started</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 px-6 text-base">
                  <Link to="/about">About the project</Link>
                </Button>
              </div>
            </div>

            <figure className="overflow-hidden rounded-lg border bg-card shadow-[0_18px_50px_rgb(30_58_138_/_0.12)]">
              <img
                src={heroImg}
                alt="A neighbourhood market street with small shops and people shopping"
                className="h-72 w-full object-cover sm:h-96"
              />
              <figcaption className="border-t border-saffron/50 bg-card px-5 py-4">
                <p className="text-xs font-semibold tracking-wide text-saffron">Before you commit</p>
                <p className="mt-1 text-lg font-semibold text-primary">See the path more clearly.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Understand options, check the numbers, and move with a plan that fits your place.
                </p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="overflow-hidden rounded-lg border bg-card lg:col-span-2">
              <img
                src={shopImg}
                alt="Interior of a small neighbourhood grocery shop"
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-xs font-semibold text-primary">01 Loan calculator</p>
                <h2 className="mt-1 text-lg font-semibold">Find the monthly EMI from your own savings.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Margin capital sets project cost, loan size, and a repayment table you can read.
                </p>
              </div>
            </article>
            <article className="overflow-hidden rounded-lg border bg-card">
              <img
                src={documentsImg}
                alt="Business papers, a calculator and a file on a desk"
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-xs font-semibold text-primary">02 Document guide</p>
                <h2 className="mt-1 text-lg font-semibold">Know which papers the bank will ask for.</h2>
              </div>
            </article>
            <article className="rounded-lg border bg-card p-5">
              <p className="text-xs font-semibold text-primary">03 ROI tracker</p>
              <h2 className="mt-2 text-lg font-semibold">See how a month of sales and costs actually landed.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Log figures, get a risk rating you can argue with, then match a scheme.
              </p>
            </article>
            <article className="overflow-hidden rounded-lg border bg-card lg:col-span-2">
              <div className="grid sm:grid-cols-2">
                <img
                  src={marketImg}
                  alt="Shop fronts along a Pune suburban market road"
                  className="h-48 w-full object-cover sm:h-full"
                />
                <div className="p-5">
                  <p className="text-xs font-semibold text-primary">04 Market check</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Real shops on the Lohegaon map, plus research zones.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Study competition, demand and costs before you commit.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4 pb-16 sm:px-6">
          <div className="flex items-center gap-4 overflow-hidden rounded-lg border bg-card">
            <img
              src={shopImg}
              alt=""
              className="hidden h-24 w-36 object-cover sm:block"
            />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-saffron">
                  MADE FOR THE EVERYDAY ENTREPRENEUR
                </p>
                <p className="mt-1 text-sm text-foreground">
                  From the first market check to the next confident move, Sahiti keeps the numbers
                  close to real life.
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Prototype for Smart India Hackathon 2026, MoSJE problem statement 26091. Market and map
            figures shown in the app are demonstration research, not official data.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
