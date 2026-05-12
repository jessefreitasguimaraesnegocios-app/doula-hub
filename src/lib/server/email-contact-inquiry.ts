import { z } from "zod";

const contactInput = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(8000),
  locale: z.string().max(12),
  fromDisplayName: z.string().max(200).optional(),
});

export type ContactInquiryPayload = z.infer<typeof contactInput>;

export async function runSendContactInquiryEmail(
  data: ContactInquiryPayload,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  if (process.env.DISABLE_SMTP_SENDS === "1") {
    return { ok: true, skipped: true };
  }
  const { buildContactNotifyMail, readSmtpEnv, resolveFromHeader, sendHtmlMail } =
    await import("../email/smtp-mail");
  const cfg = readSmtpEnv();
  if (!cfg) {
    return { ok: true, skipped: true };
  }
  try {
    const { subject, html } = buildContactNotifyMail({
      locale: data.locale,
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
      message: data.message,
    });
    await sendHtmlMail(cfg, {
      from: resolveFromHeader(cfg, data.fromDisplayName),
      to: cfg.notifyTo,
      replyTo: data.email,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export function parseContactInquiryPayload(raw: unknown): ContactInquiryPayload {
  return contactInput.parse(raw);
}
