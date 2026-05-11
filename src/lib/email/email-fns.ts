import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildBookingConfirmationMail,
  buildContactNotifyMail,
  buildSmtpTestMail,
  readSmtpEnv,
  resolveFromHeader,
  sendHtmlMail,
} from "./smtp-mail";

const testInput = z.object({
  to: z.string().email(),
  actionSecret: z.string().min(1),
});

export const sendSmtpTestEmail = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => testInput.parse(raw))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (process.env.DISABLE_SMTP_SENDS === "1") {
      return { ok: false, error: "Envios SMTP desativados no servidor (DISABLE_SMTP_SENDS)." };
    }
    const expected = process.env.SMTP_ACTION_SECRET?.trim();
    if (!expected) {
      return {
        ok: false,
        error:
          "Defina SMTP_ACTION_SECRET no ambiente do servidor (ex.: Vercel) e use o mesmo valor aqui para poder testar.",
      };
    }
    if (data.actionSecret !== expected) {
      return { ok: false, error: "Chave de ação incorreta." };
    }
    const cfg = readSmtpEnv();
    if (!cfg) {
      return {
        ok: false,
        error: "SMTP_USER / SMTP_PASS (ou EMAIL_USER / EMAIL_PASS) não estão definidos no servidor.",
      };
    }
    try {
      const { subject, html } = buildSmtpTestMail(data.to);
      await sendHtmlMail(cfg, {
        from: resolveFromHeader(cfg),
        to: data.to,
        subject,
        html,
      });
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  });

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

export const sendBookingConfirmationEmail = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => bookingInput.parse(raw))
  .handler(async ({ data }): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> => {
    if (process.env.DISABLE_SMTP_SENDS === "1") {
      return { ok: true, skipped: true };
    }
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
  });

const contactInput = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().min(1).max(8000),
  locale: z.string().max(12),
  fromDisplayName: z.string().max(200).optional(),
});

export const sendContactInquiryEmail = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => contactInput.parse(raw))
  .handler(async ({ data }): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> => {
    if (process.env.DISABLE_SMTP_SENDS === "1") {
      return { ok: true, skipped: true };
    }
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
  });
