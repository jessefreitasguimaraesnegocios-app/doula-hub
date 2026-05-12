import type { Connect } from "vite";

async function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const ch of req) {
    chunks.push(typeof ch === "string" ? Buffer.from(ch) : ch);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

/**
 * Dev-only: mirrors `/api/*` Vercel functions so `vite dev` can persist bookings and send mail.
 */
export function devApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";
    if (req.method !== "POST" || !url.startsWith("/api/")) {
      next();
      return;
    }
    try {
      const body = await readJsonBody(req);
      const data =
        body && typeof body === "object" && body !== null && "data" in body
          ? (body as { data: unknown }).data
          : body;

      if (url === "/api/complete-booking") {
        const { runCompleteBooking } = await import("./src/lib/server/complete-booking.ts");
        const result = await runCompleteBooking(data);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      if (url === "/api/send-contact-inquiry") {
        const { runSendContactInquiryEmail, parseContactInquiryPayload } =
          await import("./src/lib/server/email-contact-inquiry.ts");
        const parsed = parseContactInquiryPayload(data);
        const result = await runSendContactInquiryEmail(parsed);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      if (url === "/api/send-smtp-test") {
        const { runSendSmtpTestEmail, parseSmtpTestPayload } =
          await import("./src/lib/server/email-smtp-test.ts");
        const parsed = parseSmtpTestPayload(data);
        const result = await runSendSmtpTestEmail(parsed);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      if (url === "/api/send-booking-confirmation") {
        const { runSendBookingConfirmationFromUnknown } = await import(
          "./src/lib/server/email-booking-confirmation.ts"
        );
        const result = await runSendBookingConfirmationFromUnknown(data);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: msg }));
      return;
    }
    next();
  };
}
