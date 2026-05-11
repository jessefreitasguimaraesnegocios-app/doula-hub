import { randomUUID } from "node:crypto";

export type GoogleCalendarEnv = {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
  /** IANA zone for interpreting booking date + time (e.g. America/New_York). */
  timeZone: string;
};

export function readGoogleCalendarEnv(): GoogleCalendarEnv | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (!clientEmail || !rawKey || !calendarId) return null;
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const timeZone = process.env.BOOKING_CALENDAR_TIMEZONE?.trim() || "America/New_York";
  return { clientEmail, privateKey, calendarId, timeZone };
}

function normalizeTimeForApi(time: string): string {
  const t = time.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  return `${t}:00`;
}

/** End instant on the same calendar day when possible; rolls to next day if time overflows. */
function endDateTimeWallClock(dateStr: string, timeStr: string, addMinutes: number): string {
  const timeNorm = normalizeTimeForApi(timeStr);
  const [hh, mm, ss] = timeNorm.split(":").map((x) => Number(x));
  let totalMin = hh * 60 + mm + addMinutes;
  let endDay = dateStr;
  if (totalMin >= 24 * 60) {
    totalMin -= 24 * 60;
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    endDay = d.toISOString().slice(0, 10);
  }
  const eh = Math.floor(totalMin / 60);
  const em = totalMin % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${endDay}T${pad(eh)}:${pad(em)}:${pad(ss)}`;
}

export type CreateConsultationEventOpts = {
  env: GoogleCalendarEnv;
  summary: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm or HH:mm:ss (local wall clock in env.timeZone) */
  time: string;
  durationMinutes: number;
  attendeeEmail: string;
};

export type CreateConsultationEventResult = {
  eventId: string;
  htmlLink: string | null;
  meetLink: string | null;
};

export async function createConsultationCalendarEvent(
  opts: CreateConsultationEventOpts,
): Promise<CreateConsultationEventResult> {
  const { env, summary, description, date, time, durationMinutes, attendeeEmail } = opts;
  const startTime = normalizeTimeForApi(time);
  const endDateTime = endDateTimeWallClock(date, startTime, durationMinutes);

  const { google } = await import("googleapis");
  const jwt = new google.auth.JWT({
    email: env.clientEmail,
    key: env.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  await jwt.authorize();
  const cal = google.calendar({ version: "v3", auth: jwt });

  const requestId = randomUUID();
  const res = await cal.events.insert({
    calendarId: env.calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary,
      description,
      start: { dateTime: `${date}T${startTime}`, timeZone: env.timeZone },
      end: { dateTime: endDateTime, timeZone: env.timeZone },
      attendees: [{ email: attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const data = res.data;
  const meetLink =
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri?.trim() ??
    data.hangoutLink?.trim() ??
    null;

  return {
    eventId: data.id ?? "",
    htmlLink: data.htmlLink?.trim() ?? null,
    meetLink,
  };
}
