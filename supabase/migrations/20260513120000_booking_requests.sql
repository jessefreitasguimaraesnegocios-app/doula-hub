-- Consultas concluídas no site (/booking): CRM + integração Google Calendar (inserção via service role no servidor).
-- Anon não tem acesso; só authenticated lê no painel.
-- INSERT/UPDATE/DELETE: use o client com `SUPABASE_SERVICE_ROLE_KEY` no servidor (TanStack Start server fn);
-- a role `service_role` ignora RLS no Postgres/Supabase — não é necessário policy de escrita para anon.
-- O campo `locale` alinha-se a i18next (en | pt | es | it), ver `src/lib/i18n-locale.ts`.

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  pkg_key text NOT NULL,
  pkg_label text NOT NULL DEFAULT '',
  doula_label text NOT NULL DEFAULT '',
  consult_date date NOT NULL,
  consult_time text NOT NULL,
  platform text NOT NULL DEFAULT '',
  meet_link text,
  locale text NOT NULL DEFAULT 'en',
  intake jsonb NOT NULL DEFAULT '{}'::jsonb,
  google_event_id text,
  google_html_link text,
  google_meet_link text,
  google_sync_error text,
  email_sent boolean NOT NULL DEFAULT false,
  email_error text
);

CREATE INDEX booking_requests_created_idx ON public.booking_requests (created_at DESC);
CREATE INDEX booking_requests_email_idx ON public.booking_requests (lower(email));

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_requests_select_auth
  ON public.booking_requests
  FOR SELECT
  TO authenticated
  USING (true);
