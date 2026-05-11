import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronDown, ExternalLink, Mail, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchBookingRequestsForAdmin, type BookingRequestRow } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

function formatWhen(row: BookingRequestRow): string {
  const d = row.consult_date?.slice(0, 10) ?? "";
  const t = row.consult_time?.trim() ?? "";
  return `${d} ${t}`.trim();
}

export function AdminBookingsPanel({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["booking_requests", "admin"],
    queryFn: fetchBookingRequestsForAdmin,
    enabled,
    staleTime: 15_000,
  });

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
        <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => void refetch()}>
          {t("admin.bookings.retry")}
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("admin.bookings.empty")}</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((row) => {
        const googleOk = Boolean(row.google_event_id) && !row.google_sync_error;
        const expanded = openId === row.id;
        return (
          <div
            key={row.id}
            className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm transition hover:border-primary/25"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-serif text-lg text-foreground">{row.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{row.email}</span>
                  {row.phone ? <span> · {row.phone}</span> : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {row.pkg_label} · {row.doula_label}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Calendar className="h-3 w-3" />
                  {formatWhen(row)}
                </Badge>
                {googleOk ? (
                  <Badge className="bg-emerald-600/90 hover:bg-emerald-600">{t("admin.bookings.googleOk")}</Badge>
                ) : row.google_sync_error ? (
                  <Badge variant="destructive">{t("admin.bookings.googleFail")}</Badge>
                ) : (
                  <Badge variant="outline">Google —</Badge>
                )}
                {row.email_sent ? (
                  <Badge variant="outline" className="gap-1 border-primary/30">
                    <Mail className="h-3 w-3" />
                    {t("admin.bookings.emailYes")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">{t("admin.bookings.emailNo")}</Badge>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.google_html_link ? (
                <a
                  href={row.google_html_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("admin.bookings.googleOpen")}
                </a>
              ) : null}
              {row.google_meet_link || row.meet_link ? (
                <a
                  href={(row.google_meet_link || row.meet_link) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Video className="h-3.5 w-3.5" />
                  {t("admin.bookings.meetOpen")}
                </a>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-full text-xs"
                onClick={() => setOpenId(expanded ? null : row.id)}
              >
                <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
                {t("admin.bookings.intakeToggle")}
              </Button>
            </div>
            {row.google_sync_error ? (
              <p className="mt-2 text-xs text-destructive">{row.google_sync_error}</p>
            ) : null}
            {row.email_error ? <p className="mt-1 text-xs text-destructive">{row.email_error}</p> : null}
            {expanded ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(row.intake, null, 2)}
              </pre>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
