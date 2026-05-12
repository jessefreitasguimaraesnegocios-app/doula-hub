import {
  completeBookingInputSchema,
  type CompleteBookingPayload,
  type CompleteBookingResult,
} from "../booking/booking-schemas";
import { createConsultationCalendarEvent, readGoogleCalendarEnv } from "../google/calendar";
import { getServiceSupabase } from "../supabase/server-admin";
import { sendBookingConfirmationEmailImpl } from "./email-booking-confirmation";

function intakeDescriptionLines(intake: Record<string, unknown>, maxLen: number): string {
  try {
    const raw = JSON.stringify(intake, null, 2);
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen - 20)}\n… (truncated)`;
  } catch {
    return "";
  }
}

function bookingInsertErrorMessage(insErr: { message?: string; code?: string }): string {
  const msg = insErr.message ?? "";
  const code = insErr.code ?? "";
  if (code === "42P01" || /relation ["']?booking_requests/i.test(msg)) {
    return (
      "Database: table `booking_requests` is missing. Apply the Supabase migration " +
      "`supabase/migrations/20260513120000_booking_requests.sql` (e.g. `supabase db push` or SQL Editor), then retry."
    );
  }
  return msg;
}

export async function runCompleteBooking(raw: unknown): Promise<CompleteBookingResult> {
  let data: CompleteBookingPayload;
  try {
    data = completeBookingInputSchema.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

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
      return { ok: false, error: bookingInsertErrorMessage(insErr) };
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
      bookingId
        ? `Id marcação: ${bookingId}`
        : "(sem registo CRM — defina SUPABASE_SERVICE_ROLE_KEY)",
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
        await supabase
          .from("booking_requests")
          .update({ google_sync_error: msg })
          .eq("id", bookingId);
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
    await supabase
      .from("booking_requests")
      .update({ meet_link: meetForEmail || null })
      .eq("id", bookingId);
  }

  return {
    ok: true,
    bookingId,
    googleSynced,
    emailSent,
    googleError,
    emailError,
  };
}
