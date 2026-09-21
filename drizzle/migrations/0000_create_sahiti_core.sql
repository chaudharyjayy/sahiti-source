CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 3 AND 100),
  business_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Retail',
  pincode text NOT NULL DEFAULT '411047',
  block text NOT NULL DEFAULT 'Lohegaon',
  district text NOT NULL DEFAULT 'Pune',
  registration_number text,
  monthly_revenue_range text NOT NULL DEFAULT 'Not provided',
  employees integer NOT NULL DEFAULT 0 CHECK (employees >= 0),
  operational_since date,
  whatsapp text,
  email text,
  is_verified boolean NOT NULL DEFAULT false,
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid,
  author_name text NOT NULL,
  author_initials text NOT NULL DEFAULT 'SA',
  post_type text NOT NULL DEFAULT 'user' CHECK (post_type IN ('user','news','government','finance')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  image_url text,
  document_url text,
  category text NOT NULL,
  region text NOT NULL,
  scheme_type text NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users view posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.saved_posts (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;
GRANT ALL ON public.saved_posts TO service_role;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved posts" ON public.saved_posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.roi_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL,
  sales numeric(14,2) NOT NULL CHECK (sales >= 0),
  expenses numeric(14,2) NOT NULL CHECK (expenses >= 0),
  target numeric(14,2) NOT NULL DEFAULT 0 CHECK (target >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roi_entries TO authenticated;
GRANT ALL ON public.roi_entries TO service_role;
ALTER TABLE public.roi_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ROI entries" ON public.roi_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  achieved_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own milestones" ON public.milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.business_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_images TO authenticated;
GRANT ALL ON public.business_images TO service_role;
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users view business images" ON public.business_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own business images" ON public.business_images FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.risk_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  risk_score integer NOT NULL CHECK (risk_score BETWEEN 0 AND 10),
  competitor_density integer NOT NULL CHECK (competitor_density BETWEEN 0 AND 10),
  market_saturation integer NOT NULL CHECK (market_saturation BETWEEN 0 AND 10),
  seasonal_demand_risk integer NOT NULL CHECK (seasonal_demand_risk BETWEEN 0 AND 10),
  buyer_concentration integer NOT NULL CHECK (buyer_concentration BETWEEN 0 AND 10),
  demand_note text NOT NULL,
  roi_note text NOT NULL,
  address text NOT NULL,
  source_label text NOT NULL DEFAULT 'Sahiti demonstration research'
);
GRANT SELECT ON public.risk_locations TO anon, authenticated;
GRANT ALL ON public.risk_locations TO service_role;
ALTER TABLE public.risk_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Risk locations are public" ON public.risk_locations FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat threads" ON public.chat_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage messages in own threads" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE INDEX posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX comments_post_id_idx ON public.comments(post_id, created_at);
CREATE INDEX roi_entries_user_id_idx ON public.roi_entries(user_id, created_at);
CREATE INDEX risk_locations_type_idx ON public.risk_locations(business_type);
CREATE INDEX chat_threads_user_id_idx ON public.chat_threads(user_id, updated_at DESC);
CREATE INDEX chat_messages_thread_id_idx ON public.chat_messages(thread_id, created_at);

INSERT INTO public.posts (author_name, author_initials, post_type, content, category, region, scheme_type, is_sample, created_at) VALUES
('Sahiti Scheme Desk','SS','government','PM Vishwakarma supports eligible artisans with skill training, toolkit incentives, digital transaction incentives and collateral-free enterprise development loans. Verify your trade and current eligibility on the official portal.','Artisan','India','PM Vishwakarma',true,now() - interval '1 hour'),
('Sahiti Scheme Desk','SS','government','PM Street Vendor AtmaNirbhar Nidhi offers working capital loans to eligible street vendors. Timely repayment may help qualify for a higher loan cycle.','Retail','Pune','PM SVANidhi',true,now() - interval '3 hours'),
('Sahiti Scheme Desk','SS','government','Stand-Up India supports bank loans for eligible women and SC/ST entrepreneurs starting greenfield enterprises. Applicants should verify current bank and portal requirements.','All businesses','India','Stand-Up India',true,now() - interval '1 day'),
('Sahiti Research','SR','news','Lohegaon sample research indicates steady demand for affordable meals, stationery and repair services near student and residential clusters. This is demonstration data, not a live market guarantee.','Food','Lohegaon','Local market',true,now() - interval '2 days'),
('Sahiti Scheme Desk','SS','government','The Animal Husbandry Infrastructure Development Fund supports eligible investments in dairy, meat processing and animal feed infrastructure. Check the current eligible-entity and contribution rules.','Dairy','India','AHIDF',true,now() - interval '3 days'),
('Sahiti Scheme Desk','SS','government','National Livestock Mission programmes may support entrepreneurship in livestock and fodder value chains. Assistance varies by component and applicant type.','Agriculture','Maharashtra','National Livestock Mission',true,now() - interval '4 days'),
('Sahiti Industry Desk','SI','finance','Production-linked incentive programmes for telecom and pharmaceuticals are intended for qualifying manufacturers. Small suppliers should confirm threshold and registration conditions before planning around them.','Manufacturing','India','PLI',true,now() - interval '5 days'),
('Sahiti Industry Desk','SI','government','Assistance to Medical Device Clusters for Common Facilities supports eligible shared infrastructure projects. Individual businesses should verify consortium and scheme conditions.','Healthcare','India','Medical Device Clusters',true,now() - interval '6 days'),
('Sahiti Industry Desk','SI','government','Strengthening of Pharmaceuticals Industry schemes can support eligible technology upgrades and common facilities. Current guidelines and application windows must be checked independently.','Manufacturing','India','SPI',true,now() - interval '7 days'),
('Sahiti Community','SC','user','Vendor Connect note: keep supplier quotations, delivery terms and payment dates together before comparing offers. A lower unit price is not always the lowest total cost.','Retail','Lohegaon','Vendor Connect',true,now() - interval '8 days');

INSERT INTO public.risk_locations (name,business_type,latitude,longitude,risk_score,competitor_density,market_saturation,seasonal_demand_risk,buyer_concentration,demand_note,roi_note,address) VALUES
('Lohegaon Market Cluster','Jewellery',18.5962,73.9231,5,7,7,4,6,'Demand is occasion-led with strong price sensitivity. Trust and hallmarking influence repeat purchases.','Higher setup cost and slower inventory turnover suggest a longer payback period.','Lohegaon Main Road, Pune 411047'),
('ADYPU Student Zone','Food',18.6251,73.9127,8,6,5,3,5,'Consistent student demand for affordable meals and evening snacks, with semester seasonality.','Small-format outlets can target steady turnover if rent and food waste remain controlled.','Near Ajeenkya DY Patil University, Lohegaon'),
('Dhanori Road Services','Repair',18.5894,73.9137,8,4,3,3,4,'Growing two-wheeler movement supports repair and maintenance demand.','Moderate tools investment with repeat local customers can support an earlier break-even.','Dhanori-Lohegaon Road, Pune'),
('Sant Nagar Retail Strip','Retail',18.6008,73.9275,6,7,6,4,5,'Dense residential demand is stable, but convenience retail competition is visible.','Margins depend on purchasing discipline and inventory turnover.','Sant Nagar, Lohegaon, Pune'),
('Wagholi Road Textile Cluster','Textiles',18.5828,73.9449,5,6,7,6,5,'Seasonal wedding and festival demand creates peaks, while routine demand is moderate.','Inventory selection is the main ROI driver; avoid overstocking slow designs.','Lohegaon-Wagholi Road, Pune'),
('Porwal Road Hostel Belt','PG/Hostel',18.6087,73.9001,7,5,5,4,7,'Students and working residents support occupancy, with concentrated institutional demand.','Property cost is high, but stable occupancy can support predictable cash flow.','Porwal Road, Lohegaon, Pune'),
('Airport Approach Dairy Point','Dairy',18.5949,73.9023,7,4,4,3,4,'Daily household demand supports milk and value-added dairy products.','Cold-chain control and spoilage management are central to margins.','Airport Road, Lohegaon, Pune'),
('Charholi Agriculture Supply','Agriculture',18.6412,73.9073,7,3,4,6,5,'Input demand follows sowing cycles and rainfall expectations.','Working-capital planning across seasonal peaks can reduce idle inventory.','Charholi Budruk, Pune');