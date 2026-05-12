import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MailCheck,
  MailX,
  Phone,
  Search,
  Send,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchBookingRequestsForAdmin, type BookingRequestRow } from "@/lib/supabase/queries";
import { sendBookingConfirmationEmail } from "@/lib/email/email-fns";

function parseLocalDate(d: string): Date {
  // d is YYYY-MM-DD — interpret in local time (avoid TZ drift)
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtDateLong(d: Date, locale: string): string {
  try {
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}

type Tab = "upcoming" | "past" | "all";

export function AdminCrmPanel({
  enabled,
  fromDisplayName,
}: {
  enabled: boolean;
  fromDisplayName?: string;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["booking_requests", "admin"],
    queryFn: fetchBookingRequestsForAdmin,
    enabled,
    staleTime: 15_000,
  });

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);
  const [resendBusyId, setResendBusyId] = useState<string | null>(null);

  const rows = data ?? [];
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        date: r.consult_date ? parseLocalDate(r.consult_date.slice(0, 10)) : null,
      })),
    [rows],
  );

  const bookedDates = useMemo(
    () => enriched.map((x) => x.date).filter((d): d is Date => Boolean(d)),
    [enriched],
  );

  const todayCount = useMemo(
    () => enriched.filter((x) => x.date && isSameDay(x.date, today)).length,
    [enriched, today],
  );
  const upcomingCount = useMemo(
    () => enriched.filter((x) => x.date && x.date.getTime() >= today.getTime()).length,
    [enriched, today],
  );
  const emailedCount = useMemo(() => rows.filter((r) => r.email_sent).length, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((x) => {
        if (selectedDay) {
          if (!x.date || !isSameDay(x.date, selectedDay)) return false;
        } else if (tab === "upcoming") {
          if (!x.date || x.date.getTime() < today.getTime()) return false;
        } else if (tab === "past") {
          if (!x.date || x.date.getTime() >= today.getTime()) return false;
        }
        if (!q) return true;
        const r = x.row;
        return (
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.phone ?? "").toLowerCase().includes(q) ||
          r.pkg_label.toLowerCase().includes(q) ||
          r.doula_label.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ta = a.date?.getTime() ?? 0;
        const tb = b.date?.getTime() ?? 0;
        if (tab === "past") return tb - ta;
        return ta - tb;
      });
  }, [enriched, search, selectedDay, tab, today]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const resend = async (r: BookingRequestRow) => {
    setResendBusyId(r.id);
    try {
      const res = await sendBookingConfirmationEmail({
        data: {
          fullName: r.full_name,
          email: r.email,
          phone: r.phone ?? "",
          pkgKey: r.pkg_key,
          pkgLabel: r.pkg_label,
          doulaLabel: r.doula_label,
          date: r.consult_date.slice(0, 10),
          time: r.consult_time,
          platform: r.platform,
          meetLink: (r.google_meet_link || r.meet_link || "") as string,
          locale: r.locale || i18n.language || "en",
          fromDisplayName,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
      } else if (res.skipped) {
        toast.message("SMTP not configured on the server — email skipped.");
      } else {
        toast.success("Confirmation e-mail re-sent.");
        void qc.invalidateQueries({ queryKey: ["booking_requests", "admin"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setResendBusyId(null);
    }
  };

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">{t("admin.doulasDb.loginPrompt")}</p>;
  }
  if (isPending && !data) {
    return <p className="text-sm text-muted-foreground">{t("admin.doulasDb.loading")}</p>;
  }
  if (isError || data === null) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p>{t("admin.bookings.loadError")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 rounded-full"
          onClick={() => void refetch()}
        >
          {t("admin.bookings.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total bookings" value={rows.length} />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Today"
          value={todayCount}
          accent="primary"
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Upcoming"
          value={upcomingCount}
        />
        <StatCard
          icon={<MailCheck className="h-4 w-4" />}
          label="Confirmation sent"
          value={emailedCount}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Calendar + filters */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={(d) => setSelectedDay(d ?? undefined)}
              modifiers={{ booked: bookedDates }}
              modifiersClassNames={{
                booked:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
              }}
              className="rounded-xl"
            />
            {selectedDay ? (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {fmtDateLong(selectedDay, i18n.language)}
                </span>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setSelectedDay(undefined)}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">Google Workspace</p>
            <p className="mt-1.5">
              Each booking creates a Google Calendar event with a Google Meet link automatically
              when the server has{" "}
              <code className="rounded bg-muted px-1">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
              <code className="rounded bg-muted px-1">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> and{" "}
              <code className="rounded bg-muted px-1">GOOGLE_CALENDAR_ID</code> configured.
            </p>
            <a
              href="https://docs.lovable.dev/features/cloud"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Setup guide
            </a>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, package…"
                className="pl-9"
              />
            </div>
            <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
              {(["upcoming", "past", "all"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setTab(k);
                    setSelectedDay(undefined);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-medium capitalize transition",
                    tab === k && !selectedDay
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {selectedDay
                ? `No bookings on ${fmtDateLong(selectedDay, i18n.language)}.`
                : t("admin.bookings.empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map(({ row, date }) => {
                const expanded = openId === row.id;
                const meet = row.google_meet_link || row.meet_link || "";
                const googleOk = Boolean(row.google_event_id) && !row.google_sync_error;
                return (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/30"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : row.id)}
                      className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 font-serif text-primary">
                          <span className="text-lg leading-none">
                            {date ? date.getDate() : "—"}
                          </span>
                          <span className="text-[10px] uppercase">
                            {date
                              ? date.toLocaleDateString(i18n.language, { month: "short" })
                              : ""}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-serif text-base text-foreground">
                            {row.full_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.consult_time} · {row.pkg_label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.doula_label}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {googleOk ? (
                          <Badge className="gap-1 bg-emerald-600/90 hover:bg-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Google
                          </Badge>
                        ) : row.google_sync_error ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Google
                          </Badge>
                        ) : (
                          <Badge variant="outline">Google —</Badge>
                        )}
                        {row.email_sent ? (
                          <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                            <MailCheck className="h-3 w-3" /> Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <MailX className="h-3 w-3" /> Pending
                          </Badge>
                        )}
                      </div>
                    </button>

                    {expanded ? (
                      <div className="border-t border-border bg-muted/20 p-4 text-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <DetailRow icon={<Mail className="h-4 w-4" />} label="Email">
                            <a
                              href={`mailto:${row.email}`}
                              className="text-primary hover:underline"
                            >
                              {row.email}
                            </a>
                          </DetailRow>
                          <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone">
                            {row.phone ? (
                              <a
                                href={`tel:${row.phone}`}
                                className="text-primary hover:underline"
                              >
                                {row.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </DetailRow>
                          <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="When">
                            {date ? fmtDateLong(date, i18n.language) : row.consult_date} ·{" "}
                            {row.consult_time}
                          </DetailRow>
                          <DetailRow icon={<Video className="h-4 w-4" />} label="Platform">
                            {row.platform}
                          </DetailRow>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {row.google_html_link ? (
                            <a
                              href={row.google_html_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              Open in Google Calendar
                            </a>
                          ) : null}
                          {meet ? (
                            <>
                              <a
                                href={meet}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                              >
                                <Video className="h-3.5 w-3.5" />
                                Join Google Meet
                              </a>
                              <button
                                type="button"
                                onClick={() => void copy(meet, "Meet link copied.")}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Copy className="h-3.5 w-3.5" /> Copy link
                              </button>
                            </>
                          ) : null}
                          <a
                            href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.pkg_label}`)}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                          >
                            <Mail className="h-3.5 w-3.5" /> Email client
                          </a>
                          <Button
                            type="button"
                            size="sm"
                            disabled={resendBusyId === row.id}
                            onClick={() => void resend(row)}
                            className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-xs"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {resendBusyId === row.id ? "Sending…" : "Resend confirmation"}
                          </Button>
                        </div>

                        {row.google_sync_error ? (
                          <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                            Google: {row.google_sync_error}
                          </p>
                        ) : null}
                        {row.email_error ? (
                          <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                            Email: {row.email_error}
                          </p>
                        ) : null}

                        <details className="mt-4 group">
                          <summary className="cursor-pointer list-none text-xs font-medium text-foreground hover:underline [&::-webkit-details-marker]:hidden">
                            ▸ {t("admin.bookings.intakeToggle")}
                          </summary>
                          <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-background p-3 text-[11px] leading-relaxed">
                            {JSON.stringify(row.intake, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm",
        accent === "primary" && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 font-serif text-2xl text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}
