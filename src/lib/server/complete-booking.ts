import {
  completeBookingInputSchema,
  scheduleSnapshotInputSchema,
  type CompleteBookingPayload,
  type CompleteBookingResult,
  type ScheduleSnapshotPayload,
  type ScheduleSnapshotResult,
} from "../booking/booking-schemas";
import { createConsultationCalendarEvent, readGoogleCalendarEnv } from "../google/calendar";
import { getServiceSupabase } from "../supabase/server-admin";
import { sendBookingConfirmationEmailImpl } from "./email-booking-confirmation";

function intakeDescriptionLines(intake: Record<string, unknown>, maxLen: number) {
  try {
    const raw = JSON.stringify(intake, null, 2);
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, maxLen - 20)}\n… (truncated)`;
  } catch {
    return "";
  }
}

function bookingInsertErrorMessage(insErr: { message?: string; code?: string }) {
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

function baseRowFromBookingData(data: {
  fullName: string;
  email: string;
  phone: string;
  pkgKey: string;
  pkgLabel: string;
  doulaLabel: string;
  date: string;
  time: string;
  platform: string;
  meetLink: string;
  locale: string;
  intake: Record<string, unknown>;
}) {
  const defaultMeet = data.meetLink.trim();
  return {
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
  };
}

/**
 * Called when the user advances from the schedule step (video + date + time) to the payment summary.
 * Creates or updates a CRM row with `submission_phase = schedule_saved` (no Google Meet / no confirmation e-mail yet).
 */
export async function runScheduleSnapshot(raw: unknown): Promise<ScheduleSnapshotResult> {
  let data: ScheduleSnapshotPayload;
  try {
    data = scheduleSnapshotInputSchema.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return {
      ok: false,
      error:
        "CRM unavailable: set SUPABASE_SERVICE_ROLE_KEY on the server to save when scheduling the call.",
    };
  }

  const rowInsert = {
    ...baseRowFromBookingData({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      pkgKey: data.pkgKey,
      pkgLabel: data.pkgLabel,
      doulaLabel: data.doulaLabel,
      date: data.date,
      time: data.time,
      platform: data.platform,
      meetLink: (data.meetLink ?? "").trim(),
      locale: data.locale,
      intake: (data.intake ?? {}) as Record<string, unknown>,
    }),
    submission_phase: "schedule_saved" as const,
    google_event_id: null as string | null,
    google_html_link: null as string | null,
    google_meet_link: null as string | null,
    google_sync_error: null as string | null,
    email_sent: false,
    email_error: null as string | null,
  };

  const rowUpdate = {
    ...baseRowFromBookingData({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      pkgKey: data.pkgKey,
      pkgLabel: data.pkgLabel,
      doulaLabel: data.doulaLabel,
      date: data.date,
      time: data.time,
      platform: data.platform,
      meetLink: (data.meetLink ?? "").trim(),
      locale: data.locale,
      intake: (data.intake ?? {}) as Record<string, unknown>,
    }),
    submission_phase: "schedule_saved" as const,
  };

  if (data.existingPartialId) {
    const { data: prev, error: selErr } = await supabase
      .from("booking_requests")
      .select("id,email,submission_phase")
      .eq("id", data.existingPartialId)
      .maybeSingle();
    if (selErr) return { ok: false, error: bookingInsertErrorMessage(selErr) };
    if (!prev?.id) return { ok: false, error: "Booking draft not found." };
    if (prev.email !== data.email.trim().toLowerCase()) {
      return { ok: false, error: "Invalid booking draft reference." };
    }
    if (prev.submission_phase === "completed") {
      return { ok: false, error: "This booking is already completed." };
    }
    const { error: upErr } = await supabase
      .from("booking_requests")
      .update(rowUpdate)
      .eq("id", data.existingPartialId);
    if (upErr) return { ok: false, error: bookingInsertErrorMessage(upErr) };
    return { ok: true, bookingId: data.existingPartialId };
  }

  const { data: ins, error: insErr } = await supabase
    .from("booking_requests")
    .insert(rowInsert)
    .select("id")
    .maybeSingle();

  if (insErr) return { ok: false, error: bookingInsertErrorMessage(insErr) };
  if (!ins?.id) return { ok: false, error: "Insert did not return id." };
  return { ok: true, bookingId: ins.id };
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
  let skipGoogle = false;
  let skipEmail = false;

  const supabase = getServiceSupabase();
  if (data.existingBookingId && !supabase) {
    return {
      ok: false,
      error:
        "Database unavailable (SUPABASE_SERVICE_ROLE_KEY). Cannot finalize this booking draft.",
    };
  }

  if (supabase && data.existingBookingId) {
    const { data: meta, error: metaErr } = await supabase
      .from("booking_requests")
      .select("id,email,submission_phase,google_event_id,email_sent")
      .eq("id", data.existingBookingId)
      .maybeSingle();
    if (metaErr) return { ok: false, error: bookingInsertErrorMessage(metaErr) };
    if (!meta?.id) return { ok: false, error: "Booking not found." };
    if (meta.email !== data.email.trim().toLowerCase()) {
      return { ok: false, error: "Invalid booking reference." };
    }

    const gcalConfigured = Boolean(readGoogleCalendarEnv());
    const googleDone = !gcalConfigured || Boolean(meta.google_event_id);
    const emailDone = !data.sendClientEmail || meta.email_sent;
    if (meta.submission_phase === "completed" && googleDone && emailDone) {
      return {
        ok: true,
        bookingId: data.existingBookingId,
        googleSynced: Boolean(meta.google_event_id),
        emailSent: Boolean(meta.email_sent),
      };
    }

    if (meta.google_event_id) skipGoogle = true;
    if (meta.email_sent && data.sendClientEmail) skipEmail = true;

    bookingId = data.existingBookingId;
    const patch = {
      ...baseRowFromBookingData({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        pkgKey: data.pkgKey,
        pkgLabel: data.pkgLabel,
        doulaLabel: data.doulaLabel,
        date: data.date,
        time: data.time,
        platform: data.platform,
        meetLink: defaultMeet,
        locale: data.locale,
        intake: (data.intake ?? {}) as Record<string, unknown>,
      }),
    };
    const { error: upErr } = await supabase.from("booking_requests").update(patch).eq("id", bookingId);
    if (upErr) return { ok: false, error: bookingInsertErrorMessage(upErr) };
  } else if (supabase) {
    const { data: row, error: insErr } = await supabase
      .from("booking_requests")
      .insert({
        ...baseRowFromBookingData({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          pkgKey: data.pkgKey,
          pkgLabel: data.pkgLabel,
          doulaLabel: data.doulaLabel,
          date: data.date,
          time: data.time,
          platform: data.platform,
          meetLink: defaultMeet,
          locale: data.locale,
          intake: (data.intake ?? {}) as Record<string, unknown>,
        }),
        submission_phase: "completed",
      })
      .select("id")
      .maybeSingle();

    if (insErr) {
      return { ok: false, error: bookingInsertErrorMessage(insErr) };
    }
    bookingId = row?.id ?? null;
  }

  const gcal = readGoogleCalendarEnv();
  if (gcal && !skipGoogle) {
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
  } else if (skipGoogle && readGoogleCalendarEnv()) {
    googleSynced = true;
  }

  if (data.sendClientEmail && !skipEmail) {
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
  } else if (skipEmail && data.sendClientEmail) {
    emailSent = true;
  }

  if (supabase && bookingId && data.existingBookingId) {
    await supabase.from("booking_requests").update({ submission_phase: "completed" }).eq("id", bookingId);
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
