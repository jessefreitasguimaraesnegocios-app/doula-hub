import type { BookingConfirmationEmailPayload } from "@/lib/booking/booking-schemas";

export type BookingEmailResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export async function sendBookingConfirmationEmail(payload: {
  data: BookingConfirmationEmailPayload;
}): Promise<BookingEmailResult> {
  const res = await fetch("/api/send-booking-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { ok: false, error: `Pedido falhou (${res.status}). Tente novamente.` };
  }
  return (await res.json()) as BookingEmailResult;
}

type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  locale: string;
  fromDisplayName?: string;
};

export async function sendContactInquiryEmail(payload: {
  data: ContactPayload;
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const res = await fetch("/api/send-contact-inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { ok: false, error: `Pedido falhou (${res.status}). Tente novamente.` };
  }
  return (await res.json()) as { ok: true; skipped?: boolean } | { ok: false; error: string };
}

export async function sendSmtpTestEmail(payload: {
  data: { to: string; actionSecret: string };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/send-smtp-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { ok: false, error: `Pedido falhou (${res.status}). Tente novamente.` };
  }
  return (await res.json()) as { ok: true } | { ok: false; error: string };
}
