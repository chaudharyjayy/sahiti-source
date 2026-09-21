CREATE TABLE public.loan_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_name text NOT NULL,
  scheme_name text NOT NULL,
  sanctioned_amount numeric(14,2) NOT NULL CHECK (sanctioned_amount > 0),
  outstanding_principal numeric(14,2) NOT NULL CHECK (outstanding_principal >= 0),
  annual_interest_rate numeric(5,2) NOT NULL CHECK (annual_interest_rate >= 0 AND annual_interest_rate <= 100),
  monthly_emi numeric(14,2) NOT NULL CHECK (monthly_emi > 0),
  tenure_months integer NOT NULL CHECK (tenure_months > 0),
  start_date date NOT NULL,
  next_due_date date NOT NULL,
  subsidy_status text NOT NULL DEFAULT 'Not applicable' CHECK (subsidy_status IN ('Not applicable', 'Pending', 'Approved', 'Credited')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_accounts TO authenticated;
GRANT ALL ON public.loan_accounts TO service_role;
ALTER TABLE public.loan_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own loan accounts" ON public.loan_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX loan_accounts_user_id_idx ON public.loan_accounts(user_id);

CREATE TABLE public.scheme_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_id text NOT NULL UNIQUE,
  scheme_name text NOT NULL CHECK (scheme_name IN ('Micro Finance Scheme', 'Term Loan Scheme', 'PM SVANidhi', 'PM Vishwakarma', 'Stand-Up India')),
  business_type text NOT NULL,
  loan_amount numeric(14,2) NOT NULL CHECK (loan_amount > 0),
  margin_capital numeric(14,2) NOT NULL CHECK (margin_capital >= 0),
  aadhaar_last_four text NOT NULL CHECK (aadhaar_last_four ~ '^[0-9]{4}$'),
  udyam_number text,
  eligibility_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  eligibility_result text NOT NULL CHECK (eligibility_result IN ('Eligible', 'Needs review')),
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under review', 'Documents requested', 'Approved', 'Declined')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_applications TO authenticated;
GRANT ALL ON public.scheme_applications TO service_role;
ALTER TABLE public.scheme_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scheme applications" ON public.scheme_applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX scheme_applications_user_id_idx ON public.scheme_applications(user_id);
CREATE INDEX scheme_applications_reference_id_idx ON public.scheme_applications(reference_id);