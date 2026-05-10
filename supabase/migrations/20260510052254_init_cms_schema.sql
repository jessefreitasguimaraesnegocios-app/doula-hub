-- Site-wide JSON (contacts, theme, USD prices, Zoom URL) — same shape as localStorage CMS v1
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Doulas / team (public site reads published rows; admin manages all when authenticated)
CREATE TABLE public.doulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('founder', 'doula')),
  display_order integer NOT NULL DEFAULT 0,
  use_i18n boolean NOT NULL DEFAULT false,
  name text,
  role text,
  bio text,
  specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  langs jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  schedule_url text,
  stripe_account_id text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX doulas_published_order_idx ON public.doulas (published, display_order);

-- Shop products (optional cloud catalog; anon sees active only)
CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0,
  price_display text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shop_products_active_order_idx ON public.shop_products (active, sort_order);

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- site_settings: public read; authenticated write
CREATE POLICY site_settings_select_public ON public.site_settings FOR SELECT USING (true);
CREATE POLICY site_settings_insert_auth ON public.site_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY site_settings_update_auth ON public.site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- doulas: anon reads published; authenticated full access
CREATE POLICY doulas_select_anon ON public.doulas FOR SELECT TO anon USING (published = true);
CREATE POLICY doulas_select_auth ON public.doulas FOR SELECT TO authenticated USING (true);
CREATE POLICY doulas_insert_auth ON public.doulas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY doulas_update_auth ON public.doulas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY doulas_delete_auth ON public.doulas FOR DELETE TO authenticated USING (true);

-- shop_products
CREATE POLICY shop_select_anon ON public.shop_products FOR SELECT TO anon USING (active = true);
CREATE POLICY shop_select_auth ON public.shop_products FOR SELECT TO authenticated USING (true);
CREATE POLICY shop_insert_auth ON public.shop_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY shop_update_auth ON public.shop_products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY shop_delete_auth ON public.shop_products FOR DELETE TO authenticated USING (true);

-- Default row for CMS (empty payload = use app defaults until admin saves)
INSERT INTO public.site_settings (id, payload) VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Storage: doula headshots (public read; authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('doulas', 'doulas', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

CREATE POLICY doulas_storage_select ON storage.objects FOR SELECT USING (bucket_id = 'doulas');
CREATE POLICY doulas_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doulas');
CREATE POLICY doulas_storage_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'doulas') WITH CHECK (bucket_id = 'doulas');
CREATE POLICY doulas_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'doulas');

-- Seed doulas (matches static site copy; photos still come from bundled assets until `photo_url` is set)
INSERT INTO public.doulas (slug, kind, display_order, use_i18n, name, role, bio, specs, langs, published)
VALUES
  ('founder', 'founder', 0, true, null, null, null, '[]'::jsonb, '[]'::jsonb, true),
  (
    'sofia',
    'doula',
    1,
    false,
    'Sofia Rivera',
    'Birth & Lactation Doula',
    'Lactation counselor with a gentle, evidence-based approach.',
    '["Lactation (CLC)", "Twins", "Home birth"]'::jsonb,
    '["Spanish", "English", "Portuguese"]'::jsonb,
    true
  ),
  (
    'elena',
    'doula',
    2,
    false,
    'Elena Conti',
    'Postpartum Doula',
    'Specialist in the fourth trimester — overnight care and family integration.',
    '["Postpartum", "Newborn care", "Sibling support"]'::jsonb,
    '["Italian", "English"]'::jsonb,
    true
  ),
  (
    'mei',
    'doula',
    3,
    false,
    'Mei Tanaka',
    'Bereavement & Birth Doula',
    'Tender presence through pregnancy and infant loss.',
    '["Bereavement", "Birth doula", "Mental health"]'::jsonb,
    '["English", "Japanese"]'::jsonb,
    true
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.shop_products (slug, name, description, price_cents, price_display, tag, sort_order, active)
VALUES
  ('swaddle', 'Organic Muslin Swaddle', '', 2800, '$28', 'Newborn', 0, true),
  ('tea', 'Postpartum Recovery Tea', '', 1800, '$18', 'Mama', 1, true),
  ('teether', 'Wooden Teether Ring', '', 1400, '$14', 'Baby', 2, true),
  ('belly-oil', 'Belly Oil — Jasmine & Calendula', '', 3200, '$32', 'Pregnancy', 3, true),
  ('balm', 'Nursing Balm', '', 2200, '$22', 'Mama', 4, true),
  ('robe', 'Linen Birth Robe', '', 7800, '$78', 'Birth', 5, true)
ON CONFLICT (slug) DO NOTHING;
