import type {
  CompleteBookingPayload,
  CompleteBookingResult,
  ScheduleSnapshotPayload,
  ScheduleSnapshotResult,
} from "@/lib/booking/booking-schemas";

/**
 * Submits a booking via `/api/complete-booking` (Vercel serverless or Vite dev middleware).
 * Keeps the same `{ data }` shape used previously with TanStack Start `createServerFn`.
 */
export type { CompleteBookingResult, CompleteBookingPayload } from "@/lib/booking/booking-schemas";

export async function completeBookingRequest(payload: {
  data: CompleteBookingPayload;
}): Promise<CompleteBookingResult> {
  const res = await fetch("/api/complete-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { ok: false, error: `Pedido falhou (${res.status}). Tente novamente.` };
  }
  return (await res.json()) as CompleteBookingResult;
}

export async function saveScheduleSnapshotRequest(payload: {
  data: ScheduleSnapshotPayload;
}): Promise<ScheduleSnapshotResult> {
  const res = await fetch("/api/booking-schedule-snapshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { ok: false, error: `Pedido falhou (${res.status}). Tente novamente.` };
  }
  return (await res.json()) as ScheduleSnapshotResult;
}
