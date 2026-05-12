import { z } from "zod";

export const bookingInputSchema = z.object({
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

export const completeBookingInputSchema = bookingInputSchema.extend({
  sendClientEmail: z.boolean(),
  intake: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CompleteBookingPayload = z.infer<typeof completeBookingInputSchema>;

export type CompleteBookingResult =
  | {
      ok: true;
      bookingId: string | null;
      googleSynced: boolean;
      emailSent: boolean;
      googleError?: string;
      emailError?: string;
    }
  | { ok: false; error: string };
