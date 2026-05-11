-- Extras for production: auto updated_at, storage limits, table comments.
-- Apply after 20260510052254_init_cms_schema.sql (Supabase CLI runs migrations in name order).

-- ---------------------------------------------------------------------------
-- updated_at: mantém a coluna alinhada em qualquer UPDATE (SQL Editor, API, etc.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS doulas_set_updated_at ON public.doulas;
CREATE TRIGGER doulas_set_updated_at
  BEFORE UPDATE ON public.doulas
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS shop_products_set_updated_at ON public.shop_products;
CREATE TRIGGER shop_products_set_updated_at
  BEFORE UPDATE ON public.shop_products
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS site_settings_set_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_set_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: limites e tipos (fotos + vídeo curto para CMS, ex. about_founder .mp4 no Storage)
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100 MiB (vídeos de marketing; fotos ficam pequenas)
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
WHERE id = 'doulas';

-- ---------------------------------------------------------------------------
-- Comentários (visíveis no Table Editor / introspection)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.site_settings IS
  'CMS do site: uma linha id=main. payload jsonb = SiteCmsV1 (contactos, preços USD, tema, Zoom, siteImages URLs, contractedDoulas privado).';

COMMENT ON COLUMN public.site_settings.payload IS
  'JSON com version:1; siteImages.about_founder pode ser URL de imagem ou .mp4; ver src/lib/site-cms.ts e docs/supabase-integration.md.';

COMMENT ON TABLE public.doulas IS
  'Equipa pública: anon vê published=true. Admin autenticado gere todas. slugs seed: founder, sofia, elena, mei (alinhados ao código).';

COMMENT ON TABLE public.shop_products IS
  'Catálogo da loja; anon só vê active=true. image_url substitui imagem em src/assets/shop quando preenchido.';

COMMENT ON COLUMN public.doulas.photo_url IS
  'URL pública (ex.: Storage bucket doulas). Vazio = imagem empacotada no site por slug.';

COMMENT ON COLUMN public.shop_products.image_url IS
  'URL pública da foto do produto; vazio = fallback em src/data/shop-products.ts.';
