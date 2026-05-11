import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { useSiteCms } from "@/hooks/use-site-cms";
import { DEFAULT_TEAM_SCHEDULE_URL, pickSiteImageUrl, type SiteCmsV1, type SiteImageKey } from "@/lib/site-cms";
import { asStringArray, fetchPublishedDoulas, type DoulaRow } from "@/lib/supabase/queries";
import raquelTeam from "@/assets/team-imani.png";
import d2 from "@/assets/doula-2.jpg";
import d3 from "@/assets/doula-3.jpg";
import d4 from "@/assets/doula-4.jpg";
import teamHero from "@/assets/team-hero.png";

const ZOOM_SCHEDULER_WINDOW_NAME = "atb-zoom-scheduler";

/** Zoom does not allow embedding scheduler.zoom.us in iframes on third-party sites (CSP). Opens a centered app-like window instead. */
function openZoomSchedulerPopup(url: string, blockedMessage: string) {
  const width = Math.min(1180, window.screen.availWidth - 48);
  const height = Math.min(900, window.screen.availHeight - 48);
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,noopener,noreferrer`;
  const win = window.open(url, ZOOM_SCHEDULER_WINDOW_NAME, features);
  if (!win) {
    toast.error(blockedMessage);
    return;
  }
  try {
    win.focus();
  } catch {
    /* ignore */
  }
}

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Our Doulas — All Things Babies" },
      { name: "description", content: "Meet our team of certified doulas — warm, experienced, inclusive." },
      { property: "og:title", content: "Our Doulas — All Things Babies" },
      { property: "og:description", content: "The hands that hold you." },
      { property: "og:image", content: teamHero },
    ],
  }),
  component: Team,
});

type FounderMember = { kind: "founder"; id: "founder"; img: string; scheduleUrl?: string };
type StaticMember = {
  kind: "static";
  id: string;
  img: string;
  name: string;
  role: string;
  bio: string;
  specs: string[];
  langs: string[];
  /** Optional per-doula scheduler; falls back to `DEFAULT_SCHEDULE_URL`. */
  scheduleUrl?: string;
};

const BUNDLED_IMG: Record<string, string> = {
  founder: raquelTeam,
  sofia: d2,
  elena: d3,
  mei: d4,
};

function resolveTeamMemberPhoto(cms: SiteCmsV1, slug: string, dbPhoto: string | null | undefined, bundledFallback: string): string {
  const key = `team_member_${slug}` as SiteImageKey;
  return pickSiteImageUrl(cms, key, dbPhoto?.trim() || bundledFallback);
}

type TeamCardModel = {
  key: string;
  slug: string;
  kind: "founder" | "doula";
  useI18n: boolean;
  img: string;
  scheduleUrl?: string | null;
  name?: string;
  role?: string;
  bio?: string;
  specs: string[];
  langs: string[];
};

function staticTeamCards(cms: SiteCmsV1): TeamCardModel[] {
  return TEAM.map((m) => {
    if (m.kind === "founder") {
      return {
        key: m.id,
        slug: "founder",
        kind: "founder",
        useI18n: true,
        img: resolveTeamMemberPhoto(cms, "founder", null, m.img),
        scheduleUrl: m.scheduleUrl,
        specs: [],
        langs: [],
      };
    }
    return {
      key: m.id,
      slug: m.id,
      kind: "doula",
      useI18n: false,
      img: resolveTeamMemberPhoto(cms, m.id, null, m.img),
      scheduleUrl: m.scheduleUrl,
      name: m.name,
      role: m.role,
      bio: m.bio,
      specs: m.specs,
      langs: m.langs,
    };
  });
}

function teamCardsFromDb(rows: DoulaRow[], cms: SiteCmsV1): TeamCardModel[] {
  return rows.map((r) => ({
    key: r.id,
    slug: r.slug,
    kind: r.kind,
    useI18n: r.use_i18n,
    img: resolveTeamMemberPhoto(cms, r.slug, r.photo_url, BUNDLED_IMG[r.slug] || raquelTeam),
    scheduleUrl: r.schedule_url,
    name: r.name ?? undefined,
    role: r.role ?? undefined,
    bio: r.bio ?? undefined,
    specs: asStringArray(r.specs),
    langs: asStringArray(r.langs),
  }));
}

const TEAM: readonly (FounderMember | StaticMember)[] = [
  { kind: "founder", id: "founder", img: raquelTeam },
  {
    kind: "static",
    id: "sofia",
    img: d2,
    name: "Sofia Rivera",
    role: "Birth & Lactation Doula",
    bio: "Lactation counselor with a gentle, evidence-based approach.",
    specs: ["Lactation (CLC)", "Twins", "Home birth"],
    langs: ["Spanish", "English", "Portuguese"],
  },
  {
    kind: "static",
    id: "elena",
    img: d3,
    name: "Elena Conti",
    role: "Postpartum Doula",
    bio: "Specialist in the fourth trimester — overnight care and family integration.",
    specs: ["Postpartum", "Newborn care", "Sibling support"],
    langs: ["Italian", "English"],
  },
  {
    kind: "static",
    id: "mei",
    img: d4,
    name: "Mei Tanaka",
    role: "Bereavement & Birth Doula",
    bio: "Tender presence through pregnancy and infant loss.",
    specs: ["Bereavement", "Birth doula", "Mental health"],
    langs: ["English", "Japanese"],
  },
];

function scheduleUrlForCard(card: TeamCardModel, cmsDefault: string): string {
  if (card.scheduleUrl?.trim()) return card.scheduleUrl.trim();
  const fromCms = cmsDefault.trim();
  return fromCms || DEFAULT_TEAM_SCHEDULE_URL;
}

function Team() {
  const { t } = useTranslation();
  const cms = useSiteCms();
  const { data: remoteDoulas } = useQuery({
    queryKey: ["doulas", "published"],
    queryFn: fetchPublishedDoulas,
    staleTime: 60_000,
  });

  const cards = useMemo(() => {
    if (remoteDoulas && remoteDoulas.length > 0) return teamCardsFromDb(remoteDoulas, cms);
    return staticTeamCards(cms);
  }, [remoteDoulas, cms]);

  const teamHeroSrc = pickSiteImageUrl(cms, "team_hero", teamHero);

  return (
    <div>
      <section className="relative h-[40vh] min-h-[320px] overflow-hidden">
        <img src={teamHeroSrc} alt="" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/20" />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-end px-6 pb-12 text-center">
          <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("team.title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t("team.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 sm:grid-cols-2">
          {cards.map((m) => {
            const content =
              m.useI18n && m.slug === "founder"
                ? {
                    name: t("team.founder.name"),
                    role: t("team.founder.role"),
                    bio: t("team.founder.bio"),
                    specs: t("team.founder.specs", { returnObjects: true }) as string[],
                    langs: t("team.founder.langs", { returnObjects: true }) as string[],
                  }
                : {
                    name: m.name ?? "",
                    role: m.role ?? "",
                    bio: m.bio ?? "",
                    specs: m.specs,
                    langs: m.langs,
                  };

            return (
              <article key={m.key} className="group rounded-[2rem] bg-card p-6 shadow-(--shadow-soft) transition hover:shadow-(--shadow-warm)">
                <div className="overflow-hidden rounded-[1.5rem]">
                  <img
                    src={m.img}
                    alt={content.name}
                    loading="lazy"
                    width={800}
                    height={1000}
                    className="aspect-4/5 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="px-2 pt-6 pb-2">
                  <p className="font-serif text-2xl text-foreground">{content.name}</p>
                  <p className="text-sm text-clay">{content.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.bio}</p>
                  <div className="mt-5 grid gap-3 text-xs">
                    <div>
                      <p className="uppercase tracking-widest text-foreground/50">{t("team.specialties")}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {content.specs.map((s) => (
                          <span key={s} className="rounded-full bg-sage/30 px-3 py-1 text-foreground/80">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-foreground/50">{t("team.languages")}</p>
                      <p className="mt-1.5 text-foreground/80">{content.langs.join(" · ")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openZoomSchedulerPopup(scheduleUrlForCard(m, cms.teamDefaultScheduleUrl), t("team.schedulePopupBlocked"))
                    }
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-(--shadow-soft) transition hover:bg-primary/90"
                  >
                    <Video className="h-4 w-4 shrink-0" aria-hidden />
                    {t("team.scheduleVideoCall")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
