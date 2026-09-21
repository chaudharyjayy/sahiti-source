export const MIN_MARGIN = 5_000;
export const MAX_MARGIN = 5_000_000;
export const MICRO_FINANCE_CEILING = 140_000;

export type LoanScheme = {
  name: string;
  interestRate: number;
  tenureYears: number;
  moratoriumMonths: number;
  summary: string;
};

export const MICRO_FINANCE: LoanScheme = {
  name: "Micro Finance Scheme",
  interestRate: 6.5,
  tenureYears: 3,
  moratoriumMonths: 3,
  summary: "For small projects up to Rs 1,40,000 in project cost.",
};

export const TERM_LOAN: LoanScheme = {
  name: "Term Loan Scheme",
  interestRate: 8,
  tenureYears: 7,
  moratoriumMonths: 6,
  summary: "For projects above Rs 1,40,000 and up to Rs 5,00,00,000 in project cost.",
};

export type QuarterRow = {
  quarter: number;
  opening: number;
  principal: number;
  interest: number;
  payment: number;
  closing: number;
};

export type LoanResult = {
  margin: number;
  projectCost: number;
  maxLoan: number;
  scheme: LoanScheme;
  emi: number;
  totalInterest: number;
  totalPayable: number;
  repaymentMonths: number;
  quarters: QuarterRow[];
  workingCapital: { label: string; share: number; amount: number }[];
};

export function selectScheme(projectCost: number): LoanScheme {
  return projectCost <= MICRO_FINANCE_CEILING ? MICRO_FINANCE : TERM_LOAN;
}

export function calculateLoan(margin: number): LoanResult {
  const safeMargin = Math.min(Math.max(margin, MIN_MARGIN), MAX_MARGIN);
  const projectCost = safeMargin * 10;
  const maxLoan = projectCost * 0.9;
  const scheme = selectScheme(projectCost);

  const monthlyRate = scheme.interestRate / 100 / 12;
  const totalMonths = scheme.tenureYears * 12;
  const repaymentMonths = totalMonths - scheme.moratoriumMonths;

  // Interest accrued during the moratorium is added to the principal repaid later.
  const moratoriumInterest = maxLoan * monthlyRate * scheme.moratoriumMonths;
  const principalAtRepayment = maxLoan + moratoriumInterest;

  const factor = Math.pow(1 + monthlyRate, repaymentMonths);
  const emi = (principalAtRepayment * monthlyRate * factor) / (factor - 1);

  const quarters: QuarterRow[] = [];
  let balance = principalAtRepayment;
  const quarterCount = Math.ceil(repaymentMonths / 3);

  for (let q = 1; q <= quarterCount; q++) {
    const opening = balance;
    let interestPaid = 0;
    let principalPaid = 0;
    const monthsThisQuarter = Math.min(3, repaymentMonths - (q - 1) * 3);
    for (let m = 0; m < monthsThisQuarter; m++) {
      const interest = balance * monthlyRate;
      const principal = Math.min(emi - interest, balance);
      interestPaid += interest;
      principalPaid += principal;
      balance -= principal;
    }
    quarters.push({
      quarter: q,
      opening,
      principal: principalPaid,
      interest: interestPaid,
      payment: principalPaid + interestPaid,
      closing: Math.max(balance, 0),
    });
  }

  const totalPayable = quarters.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = totalPayable - maxLoan;

  const workingCapital = [
    { label: "Raw material and stock", share: 0.35 },
    { label: "Equipment and tools", share: 0.25 },
    { label: "Premises and setup", share: 0.15 },
    { label: "Wages for first cycle", share: 0.15 },
    { label: "Reserve for running costs", share: 0.1 },
  ].map((item) => ({ ...item, amount: projectCost * item.share }));

  return {
    margin: safeMargin,
    projectCost,
    maxLoan,
    scheme,
    emi,
    totalInterest,
    totalPayable,
    repaymentMonths,
    quarters,
    workingCapital,
  };
}
