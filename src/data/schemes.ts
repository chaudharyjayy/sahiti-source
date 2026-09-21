// Loan and support schemes a micro-entrepreneur can actually apply for.
//
// The programme list mirrors what SIDBI's UdyamiMitra portal (udyamimitra.in)
// onboards for MSMEs. Figures are the widely published headline terms, kept
// deliberately loose: scheme caps, interest subvention and subsidy shares are
// revised by the administering ministry from time to time, so every card tells
// the user to confirm current terms on the portal before they rely on them.
//
// Nothing in this file is a Sahiti scoring of a real government programme — the
// match score below is plain arithmetic over the user's own answers.

export type SchemeStage = "new" | "existing" | "either";

export type Scheme = {
  id: string;
  name: string;
  /** Short label for buttons and chips. */
  shortName: string;
  agency: string;
  /** One sentence. Resist the urge to write three. */
  summary: string;
  /** Rupee floor of the support offered. 0 means no lower bound. */
  amountMin: number;
  /** Rupee ceiling. Use the headline ceiling, not an edge case. */
  amountMax: number;
  interestNote: string;
  collateralFree: boolean;
  stage: SchemeStage;
  /**
   * Business categories this programme realistically serves. An empty array
   * means it is open to any trade.
   */
  sectors: string[];
  /** Honest caveat about who it is really built for, when that matters. */
  audience: string;
  benefits: string[];
  eligibility: string[];
  documents: string[];
  portalUrl: string;
};

export const PORTAL_URL = "https://www.udyamimitra.in/";

const ALL_SECTORS: string[] = [];

const SIDBI = "SIDBI";
const MSME = "Ministry of MSME";

export const SCHEMES: Scheme[] = [
  {
    id: "sidbi-micro",
    name: "SIDBI Micro Finance Scheme",
    shortName: "Micro finance",
    agency: SIDBI,
    summary: "Small-ticket funding for a first micro project.",
    amountMin: 0,
    amountMax: 140_000,
    interestNote: "Around 6.5% a year, set by the lender",
    collateralFree: true,
    stage: "new",
    sectors: ALL_SECTORS,
    audience: "Best fit for a single-person or family-run venture.",
    benefits: [
      "Covers up to 90% of a project costing about Rs 1,40,000",
      "Margin contribution stays near 10% of project cost",
      "Moratorium before repayments begin",
    ],
    eligibility: [
      "Micro enterprise in manufacturing, service or trade",
      "Capital requirement within the scheme's project ceiling",
      "Willing to contribute margin capital",
    ],
    documents: ["Identity and address proof", "Project cost working sheet", "Margin money proof"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "sidbi-term-loan",
    name: "SIDBI Term Loan Scheme",
    shortName: "Term loan",
    agency: SIDBI,
    summary: "Larger structured loan once the project outgrows the micro ceiling.",
    amountMin: 140_000,
    amountMax: 50_000_000,
    interestNote: "Around 8% a year, set by the lender",
    collateralFree: false,
    stage: "either",
    sectors: ALL_SECTORS,
    audience: "For equipment, premises and working capital together.",
    benefits: [
      "Term loan for plant, machinery or premises",
      "Longer tenure than the micro route",
      "Can be combined with working capital limits",
    ],
    eligibility: [
      "Project cost above the micro finance ceiling",
      "Detailed project report",
      "Collateral or guarantee as the lender decides",
    ],
    documents: [
      "Detailed project report",
      "Financial statements",
      "Collateral details if requested",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pm-vishwakarma",
    name: "PM Vishwakarma",
    shortName: "Vishwakarma",
    agency: MSME,
    summary: "Training, a toolkit grant and credit for traditional artisans.",
    amountMin: 0,
    amountMax: 300_000,
    interestNote: "5% a year on the credit support",
    collateralFree: true,
    stage: "either",
    sectors: ["Artisan", "Repair", "Textiles", "Manufacturing"],
    audience: "Only for artisans working in the scheme's listed traditional trades.",
    benefits: [
      "Skill training with a daily stipend",
      "Toolkit incentive paid as an e-voucher",
      "Collateral-free credit in two tranches",
    ],
    eligibility: [
      "Works in a trade on the notified artisan list",
      "Aged 18 or older",
      "Has not taken a similar scheme loan in the past five years",
    ],
    documents: [
      "Aadhaar and bank account seeded together",
      "Proof of the trade being practised",
      "Mobile number linked for OTP verification",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pm-svanidhi",
    name: "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
    shortName: "SVANidhi",
    agency: "Ministry of Housing and Urban Affairs",
    summary: "Working capital for street vendors, repaid in easy instalments.",
    amountMin: 0,
    amountMax: 50_000,
    interestNote: "7% a year interest subsidy",
    collateralFree: true,
    stage: "either",
    sectors: ["Food", "Retail", "General store"],
    audience: "Street vendors who hold a vending certificate or a letter of recommendation.",
    benefits: [
      "Working capital released in graded cycles",
      "A larger limit becomes available on timely repayment",
      "Digital cashback on eligible transactions",
    ],
    eligibility: [
      "Vends in a urban local body area",
      "Holds a certificate of vending or letter of recommendation",
      "Has not defaulted on an earlier cycle",
    ],
    documents: [
      "Certificate of vending or letter of recommendation",
      "Aadhaar and bank account",
      "Photograph of the vending spot",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pmmy-mudra",
    name: "Pradhan Mantri MUDRA Yojana",
    shortName: "MUDRA",
    agency: "MUDRA Ltd",
    summary: "Collateral-free business loan in three tiers, from very small upward.",
    amountMin: 0,
    amountMax: 2_000_000,
    interestNote: "Bank base rate; no scheme-level subsidy",
    collateralFree: true,
    stage: "either",
    sectors: ALL_SECTORS,
    audience: "The widest entry point: most small businesses qualify.",
    benefits: [
      "Shishu up to Rs 50,000 and Kishore up to Rs 5 lakh",
      "Tarun up to Rs 10 lakh and Tarun Plus above that",
      "No collateral or guarantor demanded at these limits",
    ],
    eligibility: [
      "Non-farm, non-corporate micro or small enterprise",
      "Income-generating activity already running or about to start",
      "Satisfactory credit record",
    ],
    documents: [
      "Identity and address proof",
      "Business proof",
      "Bank statements",
      "Quotations for the purchase",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "cgtmse",
    name: "Credit Guarantee Scheme for MSEs",
    shortName: "Credit guarantee",
    agency: "CGTMSE",
    summary: "A guarantee that lets a lender approve your loan without collateral.",
    amountMin: 0,
    amountMax: 50_000_000,
    interestNote: "Lender's rate; you pay a small guarantee fee",
    collateralFree: true,
    stage: "existing",
    sectors: ALL_SECTORS,
    audience: "A cover behind a loan, not a loan by itself. Apply through your bank.",
    benefits: [
      "Removes the need to pledge property",
      "Guarantee cover shared between lender and trust",
      "Available for term loans and working capital",
    ],
    eligibility: [
      "Micro or small enterprise as per MSME classification",
      "Activity outside the excluded list",
      "Loan routed through a member lending institution",
    ],
    documents: [
      "MSME Udyam registration",
      "Loan application through the bank",
      "Promoter identity proof",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pmegp",
    name: "Prime Minister's Employment Generation Programme",
    shortName: "PMEGP",
    agency: "KVIC",
    summary: "Capital subsidy on a new manufacturing or service unit.",
    amountMin: 0,
    amountMax: 5_000_000,
    interestNote: "Subsidy on project cost, not an interest rate",
    collateralFree: false,
    stage: "new",
    sectors: ["Manufacturing", "Food", "Textiles", "Repair", "Artisan", "Agriculture", "Dairy"],
    audience: "Only for brand-new units. Existing businesses are not eligible.",
    benefits: [
      "Project cost ceiling higher for manufacturing than for service units",
      "Subsidy share is larger for rural and special category applicants",
      "Training through KVIC before release of funds",
    ],
    eligibility: [
      "New unit only, with no existing business in the same line",
      "Age and education conditions for larger project sizes",
      "Applicant's own contribution required",
    ],
    documents: [
      "Project report",
      "Education certificate",
      "Category certificate if applicable",
      "Quotations",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "stand-up-india",
    name: "Stand-Up India",
    shortName: "Stand-Up India",
    agency: "Department of Financial Services",
    summary: "Composite loan for a first-time woman or SC/ST entrepreneur.",
    amountMin: 1_000_000,
    amountMax: 10_000_000,
    interestNote: "Bank rate; handholding support included",
    collateralFree: false,
    stage: "new",
    sectors: ALL_SECTORS,
    audience: "Greenfield only, and the applicant must be a woman or SC/ST entrepreneur.",
    benefits: [
      "Term loan and working capital in one composite facility",
      "A margin contribution is expected from the borrower",
      "Credit guarantee support available over the cover",
    ],
    eligibility: [
      "Woman, or SC/ST entrepreneur",
      "First-time venture in that trade, not an expansion",
      "Borrowing within the scheme's rupee band",
    ],
    documents: [
      "Category or identity certificate where applicable",
      "Greenfield project declaration",
      "Project report and quotations",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "ahidf",
    name: "Animal Husbandry Infrastructure Development Fund",
    shortName: "AHIDF",
    agency: "Department of Animal Husbandry and Dairying",
    summary: "Funding for dairy, meat and animal feed infrastructure.",
    amountMin: 0,
    amountMax: 100_000_000,
    interestNote: "Interest subvention on the sanctioned loan",
    collateralFree: false,
    stage: "either",
    sectors: ["Dairy", "Agriculture", "Food"],
    audience: "Built for processing and infrastructure, not for a small milk round.",
    benefits: [
      "A large share of project cost is financed",
      "Interest subvention brings the effective cost down",
      "Covers dairy, meat processing and feed plants",
    ],
    eligibility: [
      "Project in dairy, meat processing or animal feed",
      "Promoter contribution as per the current guidelines",
      "Detailed project report acceptable to the lender",
    ],
    documents: ["Detailed project report", "Land or lease documents", "Promoter financials"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "nlm",
    name: "National Livestock Mission",
    shortName: "Livestock mission",
    agency: "Department of Animal Husbandry and Dairying",
    summary: "Capital support for livestock rearing and fodder businesses.",
    amountMin: 0,
    amountMax: 5_000_000,
    interestNote: "Capital subsidy on eligible components",
    collateralFree: false,
    stage: "either",
    sectors: ["Dairy", "Agriculture"],
    audience: "Component-based: check which activity the current year funds.",
    benefits: [
      "Support for breed improvement and fodder value chains",
      "Entrepreneurship component for individual and group ventures",
      "Training and handholding alongside funding",
    ],
    eligibility: [
      "Activity falls under a notified mission component",
      "Own or leased land where the component requires it",
      "Bank finance for the balance portion",
    ],
    documents: ["Component-wise project note", "Land record", "Bank loan sanction"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pli-telecom",
    name: "PLI for Telecom and Networking Products",
    shortName: "PLI Telecom",
    agency: "Department of Telecommunications",
    summary: "Production incentive for telecom equipment manufacturers.",
    amountMin: 0,
    amountMax: 0,
    interestNote: "Incentive on incremental production, not a loan",
    collateralFree: true,
    stage: "existing",
    sectors: ["Manufacturing"],
    audience: "Large manufacturers only. Not open to retail or service businesses.",
    benefits: [
      "Incentive calculated on eligible incremental sales",
      "Rewards domestic value addition",
    ],
    eligibility: [
      "Manufacturer of telecom or networking products",
      "Investment and turnover thresholds far above micro scale",
      "Application in a notified window",
    ],
    documents: [
      "Investment proof",
      "Audited production data",
      "Application through the scheme portal",
    ],
    portalUrl: PORTAL_URL,
  },
  {
    id: "pli-pharma",
    name: "PLI for Pharmaceuticals",
    shortName: "PLI Pharma",
    agency: "Department of Pharmaceuticals",
    summary: "Production incentive for pharmaceutical manufacturers.",
    amountMin: 0,
    amountMax: 0,
    interestNote: "Incentive on incremental production, not a loan",
    collateralFree: true,
    stage: "existing",
    sectors: ["Manufacturing"],
    audience: "Pharmaceutical manufacturers. Not a micro-retail route.",
    benefits: ["Incentive on eligible sales growth", "Grouped by product category"],
    eligibility: [
      "Registered pharmaceutical manufacturer",
      "Meets committed investment thresholds",
      "Selected through a scheme window",
    ],
    documents: ["Manufacturing licence", "Investment and sales data", "Scheme application"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "amdcf",
    name: "Assistance to Medical Device Clusters",
    shortName: "Medical devices",
    agency: "Department of Pharmaceuticals",
    summary: "Shared infrastructure funding for medical device clusters.",
    amountMin: 0,
    amountMax: 0,
    interestNote: "Grant towards common facilities",
    collateralFree: true,
    stage: "existing",
    sectors: ["Manufacturing"],
    audience: "Cluster-level projects, applied for by a group rather than one shop.",
    benefits: [
      "Funds shared testing and production facilities",
      "Reduces per-unit infrastructure cost",
    ],
    eligibility: [
      "Applicant is a cluster or consortium",
      "Proposal for a common facility",
      "Meets the scheme's evaluation criteria",
    ],
    documents: ["Cluster formation documents", "Detailed project report", "Member unit details"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "spi",
    name: "Strengthening of Pharmaceuticals Industry",
    shortName: "SPI",
    agency: "Department of Pharmaceuticals",
    summary: "Support for common facilities in pharmaceutical clusters.",
    amountMin: 0,
    amountMax: 0,
    interestNote: "Grant towards eligible facility cost",
    collateralFree: true,
    stage: "existing",
    sectors: ["Manufacturing"],
    audience: "Pharma clusters and eligible manufacturers, not individual retail units.",
    benefits: [
      "Upgrades shared drug-testing and production facilities",
      "Improves compliance readiness",
    ],
    eligibility: [
      "Pharmaceutical cluster or eligible unit",
      "Common facility proposal",
      "Cost sharing as notified",
    ],
    documents: ["Cluster details", "Common facility project report", "Compliance certificates"],
    portalUrl: PORTAL_URL,
  },
  {
    id: "vendor-connect",
    name: "Vendor Connect",
    shortName: "Vendor connect",
    agency: SIDBI,
    summary: "Not funding. A register that links businesses with genuine suppliers.",
    amountMin: 0,
    amountMax: 0,
    interestNote: "No finance involved",
    collateralFree: true,
    stage: "either",
    sectors: ALL_SECTORS,
    audience: "Use it to find suppliers, then bring the quotations into your loan file.",
    benefits: [
      "Search verified suppliers and vendors",
      "Useful for building the quotation evidence a bank asks for",
    ],
    eligibility: ["Registered business on the portal", "Basic business details completed"],
    documents: ["Business registration details", "Contact and address proof"],
    portalUrl: PORTAL_URL,
  },
];

/** The categories used for matching, matching the app's business type list. */
export const SCHEME_SECTORS = [
  "Retail",
  "General store",
  "Hardware",
  "Salon",
  "Garage",
  "Food",
  "Dairy",
  "Agriculture",
  "Artisan",
  "Textiles",
  "Repair",
  "Manufacturing",
] as const;

export type SchemeQuery = {
  sector?: string | undefined;
  amount?: number | undefined;
  stage?: SchemeStage | undefined;
};

export type SchemeMatch = {
  scheme: Scheme;
  /** Higher is a better fit. Only ever used to order the list. */
  score: number;
  /** Plain-language reasons, shown to the user so the ordering is not a black box. */
  reasons: string[];
  amountFits: boolean;
};

const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatSchemeAmount(scheme: Scheme): string {
  if (scheme.amountMax === 0) return "No funding attached";
  if (scheme.amountMin === 0) return `Up to ${RUPEES.format(scheme.amountMax)}`;
  return `${RUPEES.format(scheme.amountMin)} – ${RUPEES.format(scheme.amountMax)}`;
}

/**
 * Ranks schemes against what the user told us. Deliberately simple and
 * explainable: every point awarded is reported back as a reason string.
 */
export function findSchemes(query: SchemeQuery): SchemeMatch[] {
  const amount = query.amount;
  const hasAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;

  const matches: SchemeMatch[] = SCHEMES.map((scheme) => {
    const reasons: string[] = [];
    let score = 0;

    // Sector fit. An empty sector list means the scheme is open to everyone.
    const sectorOpen = scheme.sectors.length === 0;
    const sectorFits = sectorOpen || (query.sector ? scheme.sectors.includes(query.sector) : false);
    if (sectorFits) {
      score += sectorOpen ? 12 : 34;
      reasons.push(
        sectorOpen
          ? "Open to any trade"
          : `Built for ${scheme.sectors.slice(0, 3).join(", ").toLowerCase()} work`,
      );
    } else {
      //
      // Reserved for other trades. Without this penalty a scheme such as PM
      // Vishwakarma could still outrank a genuine match on amount alone, purely
      // because a mismatch scored zero instead of losing points.
      //
      score -= 30;
      reasons.push(`Reserved for ${scheme.sectors.slice(0, 3).join(", ").toLowerCase()} work`);
    }

    // Business stage.
    if (query.stage && (scheme.stage === query.stage || scheme.stage === "either")) {
      score += scheme.stage === "either" ? 8 : 16;
      reasons.push(
        scheme.stage === "either"
          ? "Works for new and running businesses"
          : scheme.stage === "new"
            ? "Aimed at first-time ventures"
            : "Aimed at businesses already trading",
      );
    } else if (query.stage && scheme.stage !== "either" && scheme.stage !== query.stage) {
      reasons.push(scheme.stage === "new" ? "New ventures only" : "Running businesses only");
      score -= 25;
    }

    // Amount fit. Schemes with no funding attached never win on amount.
    let amountFits = false;
    if (hasAmount && scheme.amountMax > 0) {
      const withinBand = amount >= scheme.amountMin && amount <= scheme.amountMax;
      /*
       * Several programmes have a token floor but a very large ceiling because
       * they are meant for infrastructure-scale projects. A small ask against a
       * ceiling like that is technically inside the band and completely wrong,
       * so it loses points instead of earning them.
       */
      const farBelowScale = withinBand && amount < scheme.amountMax * 0.05;

      if (!withinBand && amount < scheme.amountMin) {
        reasons.push("Your amount is below the entry band");
        score -= 10;
      } else if (!withinBand) {
        reasons.push("Your amount is above this ceiling");
        score -= 15;
      } else if (farBelowScale) {
        reasons.push("Your amount is far below this scheme's usual scale");
        score -= 12;
      } else {
        amountFits = true;
        score += 40;
        reasons.push("Your amount sits inside this band");
      }
    }

    if (scheme.collateralFree && scheme.amountMax > 0) {
      score += 6;
      reasons.push("No collateral demanded");
    }

    return { scheme, score, reasons, amountFits };
  });

  return matches.sort((a, b) => b.score - a.score || a.scheme.name.localeCompare(b.scheme.name));
}

/** Convenience lookup used by the application flow. */
export function getScheme(id: string): Scheme | undefined {
  return SCHEMES.find((scheme) => scheme.id === id);
}

/*
 * Feed posts carry a free-text `scheme_type` written when the post was seeded,
 * so it does not always read like the scheme's own name. This maps the labels
 * that actually appear in the feed onto real records, which lets a post show the
 * full programme description without touching the posts table.
 */
const SCHEME_LABEL_ALIASES: Record<string, string> = {
  "pm vishwakarma": "pm-vishwakarma",
  "pm svanidhi": "pm-svanidhi",
  "stand-up india": "stand-up-india",
  "stand up india": "stand-up-india",
  ahidf: "ahidf",
  "national livestock mission": "nlm",
  pli: "pli-telecom",
  "medical device clusters": "amdcf",
  spi: "spi",
  "vendor connect": "vendor-connect",
  mudra: "pmmy-mudra",
};

/**
 * Resolves a feed label such as "AHIDF" to the scheme record behind it.
 * Returns undefined for labels that are not schemes at all, like "Local market".
 */
export function findSchemeByLabel(label: string): Scheme | undefined {
  const key = label.trim().toLowerCase();
  if (!key) return undefined;

  const aliased = SCHEME_LABEL_ALIASES[key];
  if (aliased) return getScheme(aliased);

  return SCHEMES.find(
    (scheme) =>
      scheme.name.toLowerCase() === key ||
      scheme.shortName.toLowerCase() === key ||
      scheme.name.toLowerCase().includes(key),
  );
}
