-- Se já aplicou uma versão antiga de 20260511000000 (só imagens no bucket), execute isto
-- para permitir vídeo no Storage (CMS: URL .mp4 em siteImages.about_founder, etc.).
-- Idempotente: pode correr mais de uma vez.

UPDATE storage.buckets
SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
WHERE id = 'doulas';
