-- Documentação do JSON CMS alinhada ao TypeScript atual (SiteCmsV1).
-- Idempotente: só atualiza COMMENT.

COMMENT ON COLUMN public.site_settings.payload IS
  'JSON SiteCmsV1 (version:1): contactos, servicesPrices, theme, teamDefaultScheduleUrl, siteImages (URLs), '
  'contractedDoulas (privado), shopComingSoonEnabled/Title/Message, emailFromName, emailAutomationBooking, '
  'emailAutomationContact. Ver src/lib/site-cms.ts e docs/supabase-integration.md.';
