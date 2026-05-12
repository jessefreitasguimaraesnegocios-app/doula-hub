import type { z } from "zod";

import { bookingInputSchema } from "../booking/booking-schemas";

export type BookingEmailResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export async function runSendBookingConfirmationFromUnknown(raw: unknown): Promise<BookingEmailResult> {
  try {
    const data = bookingInputSchema.parse(raw);
    return await sendBookingConfirmationEmailImpl(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function sendBookingConfirmationEmailImpl(
  data: z.infer<typeof bookingInputSchema>,
): Promise<BookingEmailResult> {
  if (process.env.DISABLE_SMTP_SENDS === "1") {
    return { ok: true, skipped: true };
  }
  const { buildBookingConfirmationMail, readSmtpEnv, resolveFromHeader, sendHtmlMail } =
    await import("../email/smtp-mail");
  const cfg = readSmtpEnv();
  if (!cfg) {
    return { ok: true, skipped: true };
  }
  try {
    const { subject, html } = buildBookingConfirmationMail({
      locale: data.locale,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      pkgLabel: data.pkgLabel,
      doulaLabel: data.doulaLabel,
      date: data.date,
      time: data.time,
      platform: data.platform,
      meetLink: (data.meetLink ?? "").trim(),
    });
    await sendHtmlMail(cfg, {
      from: resolveFromHeader(cfg, data.fromDisplayName),
      to: data.email,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
