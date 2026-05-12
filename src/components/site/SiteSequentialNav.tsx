import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SITE_MAIN_PAGES, getSiteMainPageIndex } from "@/lib/site-main-nav";
import { cn } from "@/lib/utils";

export function SiteSequentialNav({ className }: { className?: string }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const idx = getSiteMainPageIndex(pathname);

  if (idx < 0) return null;

  const n = SITE_MAIN_PAGES.length;
  const prev = SITE_MAIN_PAGES[idx === 0 ? n - 1 : idx - 1]!;
  const next = SITE_MAIN_PAGES[idx === n - 1 ? 0 : idx + 1]!;

  return (
    <section className="mt-10 border-t border-border/50 bg-[oklch(0.94_0.02_80)] sm:mt-12">
      <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">
        <nav className={cn("w-full", className)} aria-label={t("footer.pageNavAria")}>
          <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={prev.to}
              className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:bg-card"
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              <span className="truncate">{t("footer.prev")}</span>
              <span className="hidden truncate text-muted-foreground sm:inline">
                — {t(`nav.${prev.labelKey}`)}
              </span>
            </Link>

            <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {SITE_MAIN_PAGES.map((p, i) => {
                const active = i === idx;
                return (
                  <li key={p.to}>
                    <Link
                      to={p.to}
                      aria-current={active ? "page" : undefined}
                      title={t(`nav.${p.labelKey}`)}
                      className={cn(
                        "grid h-9 min-w-9 place-items-center rounded-full border text-xs font-semibold tabular-nums transition",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                      )}
                    >
                      {i + 1}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              to={next.to}
              className="group inline-flex items-center justify-end gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:bg-card sm:text-right"
            >
              <span className="hidden truncate text-muted-foreground sm:inline">
                {t(`nav.${next.labelKey}`)} —{" "}
              </span>
              <span className="truncate">{t("footer.next")}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("footer.pagePosition", { current: idx + 1, total: n })}
          </p>
        </nav>
      </div>
    </section>
  );
}
