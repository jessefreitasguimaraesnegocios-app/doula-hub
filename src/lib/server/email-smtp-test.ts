import { z } from "zod";

const testInput = z.object({
  to: z.string().email(),
  actionSecret: z.string().min(1),
});

export type SmtpTestPayload = z.infer<typeof testInput>;

export async function runSendSmtpTestEmail(
  data: SmtpTestPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  const { readSmtpEnv, buildSmtpTestMail, resolveFromHeader, sendHtmlMail } =
    await import("../email/smtp-mail");
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
}

export function parseSmtpTestPayload(raw: unknown): SmtpTestPayload {
  return testInput.parse(raw);
}
