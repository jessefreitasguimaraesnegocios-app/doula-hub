import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendBookingConfirmationEmailImpl } from "@/lib/email/email-fns";
import { createConsultationCalendarEvent, readGoogleCalendarEnv } from "@/lib/google/calendar";
import { getServiceSupabase } from "@/lib/supabase/server-admin";

const bookingInput = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40),
  pkgKey: z.string().min(1).max(40),
  pkgLabel: z.string().min(1).max(300),
  doulaLabel: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().min(1).max(20),
  platform: z.string().min(1).max(80),
  meetLink: z.string().max(4000).optional(),
  locale: z.string().max(12),
  fromDisplayName: z.string().max(200).optional(),
});

const completeInput = bookingInput.extend({
  sendClientEmail: z.boolean(),
  intake: z.record(z.string(), z.unknown()).optional().default({}),
});

function intakeDescriptionLines(intake: Record<string, unknown>, maxLen: number): string {
  try {
    const raw = JSON.stringify(intake, null, 2);
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen - 20)}\n… (truncated)`;
  } catch {
    return "";
  }
}

export type CompleteBookingResult =
  | {
      ok: true;
      bookingId: string | null;
      googleSynced: boolean;
      emailSent: boolean;
      googleError?: string;
      emailError?: string;
    }
  | { ok: false; error: string };

export const completeBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => completeInput.parse(raw))
  .handler(async ({ data }): Promise<CompleteBookingResult> => {
    const defaultMeet = (data.meetLink ?? "").trim();
    let meetForEmail = defaultMeet;
    let googleSynced = false;
    let googleError: string | undefined;
    let emailSent = false;
    let emailError: string | undefined;
    let bookingId: string | null = null;

    const supabase = getServiceSupabase();
    if (supabase) {
      const { data: row, error: insErr } = await supabase
        .from("booking_requests")
        .insert({
          full_name: data.fullName.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone.trim(),
          pkg_key: data.pkgKey.trim(),
          pkg_label: data.pkgLabel.trim(),
          doula_label: data.doulaLabel.trim(),
          consult_date: data.date,
          consult_time: data.time.trim(),
          platform: data.platform.trim(),
          meet_link: defaultMeet || null,
          locale: data.locale.trim() || "en",
          intake: data.intake ?? {},
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        return { ok: false, error: insErr.message };
      }
      bookingId = row?.id ?? null;
    }

    const gcal = readGoogleCalendarEnv();
    if (gcal) {
      const summary = `Consulta — ${data.fullName.trim()} (${data.pkgLabel.trim()})`;
      const description = [
        `Pacote: ${data.pkgLabel.trim()}`,
        `Doula: ${data.doulaLabel.trim()}`,
        `Telefone: ${data.phone.trim()}`,
        bookingId ? `Id marcação: ${bookingId}` : "(sem registo CRM — defina SUPABASE_SERVICE_ROLE_KEY)",
        "",
        "Intake (JSON):",
        intakeDescriptionLines((data.intake ?? {}) as Record<string, unknown>, 6000),
      ].join("\n");

      try {
        const ev = await createConsultationCalendarEvent({
          env: gcal,
          summary,
          description,
          date: data.date,
          time: data.time.trim(),
          durationMinutes: 30,
          attendeeEmail: data.email.trim(),
        });
        meetForEmail = ev.meetLink?.trim() || meetForEmail;
        googleSynced = Boolean(ev.eventId);
        if (supabase && bookingId) {
          await supabase
            .from("booking_requests")
            .update({
              google_event_id: ev.eventId || null,
              google_html_link: ev.htmlLink,
              google_meet_link: ev.meetLink,
              google_sync_error: null,
            })
            .eq("id", bookingId);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        googleError = msg;
        if (supabase && bookingId) {
          await supabase.from("booking_requests").update({ google_sync_error: msg }).eq("id", bookingId);
        }
      }
    }

    if (data.sendClientEmail) {
      const r = await sendBookingConfirmationEmailImpl({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        pkgKey: data.pkgKey,
        pkgLabel: data.pkgLabel,
        doulaLabel: data.doulaLabel,
        date: data.date,
        time: data.time,
        platform: data.platform,
        meetLink: meetForEmail,
        locale: data.locale,
        fromDisplayName: data.fromDisplayName,
      });
      if (r.ok && !r.skipped) {
        emailSent = true;
      } else if (!r.ok) {
        emailError = r.error;
      }
      if (supabase && bookingId) {
        await supabase
          .from("booking_requests")
          .update({
            email_sent: emailSent,
            email_error: emailError ?? null,
            meet_link: meetForEmail || null,
          })
          .eq("id", bookingId);
      }
    } else if (supabase && bookingId) {
      await supabase.from("booking_requests").update({ meet_link: meetForEmail || null }).eq("id", bookingId);
    }

    return {
      ok: true,
      bookingId,
      googleSynced,
      emailSent,
      googleError,
      emailError,
    };
  });
