import { createFileRoute } from "@tanstack/react-router";
import marketImg from "@/assets/market-cluster.jpg";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Sahiti | Hyper-local business advisory prototype" },
      {
        name: "description",
        content:
          "Sahiti is a Smart India Hackathon 2026 prototype for MoSJE problem statement 26091, built to help rural micro-entrepreneurs structure finance and read their local market.",
      },
      { property: "og:title", content: "About Sahiti" },
      {
        property: "og:description",
        content: "Why Sahiti exists, who it is for and what the prototype does not do.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const INCLUDED = [
  "A loan calculator that turns your margin capital into project cost, loan size and EMI.",
  "A document checklist grouped by what you actually have to go and collect.",
  "An ROI tracker that rates risk and points at schemes that match your numbers.",
  "A real-time scheme finder, then a four-step application you can follow through.",
  "A map of real local shops from OpenStreetMap next to Lohegaon research zones.",
  "An assistant you can talk to and have read the answer back.",
];

function About() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <img
          src={marketImg}
          alt="Shop fronts along a Pune suburban market road"
          className="mb-8 h-52 w-full rounded-lg object-cover"
        />
        <h1 className="text-3xl font-semibold text-primary">About Sahiti</h1>

        <div className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground">
          <p>
            Sahiti is a prototype built for Smart India Hackathon 2026, against the Ministry of
            Social Justice and Empowerment problem statement 26091.
          </p>
          <p>
            The problem it works on is narrow. A first-time rural business owner usually does not
            know how much finance their own savings can unlock, what paperwork the bank will ask
            for, or how crowded their own locality already is. Most of that knowledge sits with
            people who have already borrowed. Sahiti tries to put it in one place.
          </p>

          <h2 className="text-lg font-semibold text-foreground">What is inside</h2>
          <ul className="list-disc space-y-2 pl-5">
            {INCLUDED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 className="text-lg font-semibold text-foreground">What it is not</h2>
          <p>
            Sahiti is not a lender, not a government portal and not a financial adviser. Scheme
            terms and eligibility change, so confirm them with the bank or on udyamimitra.in before
            you act. The Lohegaon zone scores are demonstration research built for this prototype.
            Shop listings come from OpenStreetMap and are factual locations, not endorsements.
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
