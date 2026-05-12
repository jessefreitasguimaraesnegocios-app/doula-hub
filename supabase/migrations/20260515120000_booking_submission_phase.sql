-- Distingue marcação guardada ao sair do passo "Agenda" vs conclusão no passo final.
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS submission_phase text NOT NULL DEFAULT 'completed';

ALTER TABLE public.booking_requests DROP CONSTRAINT IF EXISTS booking_requests_submission_phase_chk;

ALTER TABLE public.booking_requests
ADD CONSTRAINT booking_requests_submission_phase_chk
CHECK (submission_phase IN ('schedule_saved', 'completed'));

COMMENT ON COLUMN public.booking_requests.submission_phase IS
  'schedule_saved: CRM gravado ao concluir passo Agenda (vídeo/data/hora). completed: fluxo finalizado no último passo.';
