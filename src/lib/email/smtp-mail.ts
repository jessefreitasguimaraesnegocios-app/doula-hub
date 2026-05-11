import nodemailer from "nodemailer";

export type SmtpEnvConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName: string;
  /** Receives contact form copies when set; otherwise `user`. */
  notifyTo: string;
};

export function readSmtpEnv(): SmtpEnvConfig | null {
  const user = (process.env.SMTP_USER ?? process.env.EMAIL_USER ?? "").trim();
  const pass = (process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "").trim();
  if (!user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  const secure = process.env.SMTP_SECURE === "true";

  return {
    host: (process.env.SMTP_HOST ?? "smtp.gmail.com").trim(),
    port,
    secure,
    user,
    pass,
    fromAddress: (process.env.SMTP_FROM ?? user).trim(),
    fromName: (process.env.SMTP_FROM_NAME ?? "All Things Babies").trim(),
    notifyTo: (process.env.SMTP_NOTIFY_TO ?? user).trim(),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateForLocale(isoDate: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  try {
    return new Intl.DateTimeFormat(locale || "en", { dateStyle: "long" }).format(
      new Date(`${isoDate}T12:00:00`),
    );
  } catch {
    return isoDate;
  }
}

function bookingCopy(locale: string) {
  const l = locale.slice(0, 2);
  if (l === "pt") {
    return {
      subject: "Recebemos o seu pedido de marcação",
      lead: "Olá",
      intro: "Obrigada por confiar em nós. Registámos o seu pedido com os detalhes abaixo.",
      date: "Data",
      time: "Horário",
      platform: "Plataforma",
      pkg: "Pacote",
      doula: "Doula",
      meet: "Link ou agenda da videochamada",
      meetFallback: "A equipa enviar-lhe-á o link ou as instruções finais por e-mail em breve.",
      closing: "Com carinho,<br/>All Things Babies",
    };
  }
  if (l === "es") {
    return {
      subject: "Hemos recibido tu solicitud de reserva",
      lead: "Hola",
      intro:
        "Gracias por confiar en nosotras. Hemos registrado tu solicitud con los datos siguientes.",
      date: "Fecha",
      time: "Hora",
      platform: "Plataforma",
      pkg: "Paquete",
      doula: "Doula",
      meet: "Enlace o agenda de la videollamada",
      meetFallback:
        "El equipo te enviará el enlace o las instrucciones finales por correo muy pronto.",
      closing: "Con cariño,<br/>All Things Babies",
    };
  }
  if (l === "it") {
    return {
      subject: "Abbiamo ricevuto la tua richiesta di prenotazione",
      lead: "Ciao",
      intro: "Grazie per averci scelto. Abbiamo registrato la richiesta con i dettagli qui sotto.",
      date: "Data",
      time: "Ora",
      platform: "Piattaforma",
      pkg: "Pacchetto",
      doula: "Doula",
      meet: "Link o agenda della videochiamata",
      meetFallback: "Il team ti invierà presto il link o le istruzioni finali via email.",
      closing: "Con affetto,<br/>All Things Babies",
    };
  }
  return {
    subject: "We received your booking request",
    lead: "Hello",
    intro: "Thank you for reaching out. We saved your request with the details below.",
    date: "Date",
    time: "Time",
    platform: "Platform",
    pkg: "Package",
    doula: "Doula",
    meet: "Video call link or scheduler",
    meetFallback: "Our team will email you the final link or instructions shortly.",
    closing: "With care,<br/>All Things Babies",
  };
}

export function buildBookingConfirmationMail(opts: {
  locale: string;
  fullName: string;
  email: string;
  phone: string;
  pkgLabel: string;
  doulaLabel: string;
  date: string;
  time: string;
  platform: string;
  meetLink: string;
}) {
  const c = bookingCopy(opts.locale);
  const dateLine = formatDateForLocale(opts.date, opts.locale);
  const meet =
    opts.meetLink.trim().length > 0
      ? `<a href="${escapeHtml(opts.meetLink)}">${escapeHtml(opts.meetLink)}</a>`
      : `<span style="color:#555">${c.meetFallback}</span>`;

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;line-height:1.6;color:#222">
    <h2 style="margin:0 0 12px">${escapeHtml(c.lead)} ${escapeHtml(opts.fullName)},</h2>
    <p>${escapeHtml(c.intro)}</p>
    <table style="margin:16px 0;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(c.pkg)}</td><td>${escapeHtml(opts.pkgLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(c.doula)}</td><td>${escapeHtml(opts.doulaLabel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(c.date)}</td><td>${escapeHtml(dateLine)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(c.time)}</td><td>${escapeHtml(opts.time)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(c.platform)}</td><td>${escapeHtml(opts.platform)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;vertical-align:top;font-weight:600">${escapeHtml(c.meet)}</td><td>${meet}</td></tr>
    </table>
    <p style="font-size:14px;color:#555">${escapeHtml(opts.phone)} · ${escapeHtml(opts.email)}</p>
    <p style="margin-top:24px">${c.closing}</p>
  </div>`;

  return { subject: c.subject, html };
}

function contactCopy(locale: string) {
  const l = locale.slice(0, 2);
  if (l === "pt") {
    return {
      subject: "Nova mensagem do site (contactos)",
      heading: "Nova mensagem do formulário de contacto",
    };
  }
  if (l === "es") {
    return {
      subject: "Nuevo mensaje del sitio (contacto)",
      heading: "Nuevo mensaje del formulario de contacto",
    };
  }
  if (l === "it") {
    return {
      subject: "Nuovo messaggio dal sito (contatti)",
      heading: "Nuovo messaggio dal modulo contatti",
    };
  }
  return {
    subject: "New message from your website (contact)",
    heading: "New contact form message",
  };
}

export function buildContactNotifyMail(opts: {
  locale: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}) {
  const c = contactCopy(opts.locale);
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;line-height:1.5;color:#222">
    <h2 style="margin:0 0 12px">${escapeHtml(c.heading)}</h2>
    <p><strong>Nome / Name:</strong> ${escapeHtml(opts.name)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(opts.email)}</p>
    <p><strong>Telefone:</strong> ${escapeHtml(opts.phone || "—")}</p>
    <p><strong>Mensagem:</strong></p>
    <pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(opts.message)}</pre>
  </div>`;
  return { subject: c.subject, html };
}

export function buildSmtpTestMail(to: string) {
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <h2>E-mail de teste</h2>
    <p>Se está a ler isto, o envio SMTP do site está a funcionar.</p>
    <p style="font-size:13px;color:#666">Destinatário de teste: ${escapeHtml(to)}</p>
  </div>`;
  return {
    subject: "Teste SMTP — All Things Babies",
    html,
  };
}

export async function sendHtmlMail(
  cfg: SmtpEnvConfig,
  opts: { from: string; to: string; subject: string; html: string; replyTo?: string },
) {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
  });
}

export function resolveFromHeader(cfg: SmtpEnvConfig, displayNameOverride?: string) {
  const name = (displayNameOverride?.trim() || cfg.fromName).trim() || "All Things Babies";
  return `"${name.replace(/"/g, "")}" <${cfg.fromAddress}>`;
}
