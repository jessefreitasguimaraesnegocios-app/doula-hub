import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  parseContactInquiryPayload,
  runSendContactInquiryEmail,
} from "../src/lib/server/email-contact-inquiry";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).setHeader("Allow", "POST").end("Method Not Allowed");
    return;
  }
  let body: unknown;
  try {
    body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : JSON.parse(typeof req.body === "string" ? req.body : "{}");
  } catch {
    res.status(400).json({ ok: false, error: "Invalid JSON" });
    return;
  }
  const data =
    body && typeof body === "object" && body !== null && "data" in body
      ? (body as { data: unknown }).data
      : body;
  try {
    const parsed = parseContactInquiryPayload(data);
    const result = await runSendContactInquiryEmail(parsed);
    res.status(200).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ ok: false, error: msg });
  }
}
