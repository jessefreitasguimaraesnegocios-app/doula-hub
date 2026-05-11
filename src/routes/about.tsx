import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Award, Heart, Hand } from "lucide-react";
import founder from "@/assets/founder.png";
import aboutFounderVideo from "@/assets/about-founder-support.mp4";
import certsPhoto from "@/assets/about-doula-campus.png";
import { useSiteCms } from "@/hooks/use-site-cms";
import { isVideoAssetUrl, pickSiteImageUrl, type SiteCmsV1 } from "@/lib/site-cms";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — All Things Babies" },
      { name: "description", content: "Meet the founder and our certified doula team." },
      { property: "og:title", content: "About — All Things Babies" },
      { property: "og:description", content: "Over a decade of compassionate doula care." },
      { property: "og:image", content: founder },
    ],
  }),
  component: About,
});

function AboutFounderMedia({ cms }: { cms: SiteCmsV1 }) {
  const primedFrame = useRef(false);
  const override = cms.siteImages?.about_founder?.trim() ?? "";

  if (override && !isVideoAssetUrl(override)) {
    return (
      <img
        src={override}
        alt="Portrait of the founder in doula scrubs, smiling"
        width={1000}
        height={1250}
        className="aspect-4/5 w-full rounded-[2rem] object-cover shadow-(--shadow-warm)"
      />
    );
  }

  const videoSrc = override && isVideoAssetUrl(override) ? override : aboutFounderVideo;

  const showFirstFrame = (v: HTMLVideoElement) => {
    try {
      v.pause();
      v.currentTime = 0;
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="aspect-4/5 w-full overflow-hidden rounded-[2rem] bg-muted shadow-(--shadow-warm)">
      <video
        src={videoSrc}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        aria-label="Portrait of the founder in doula scrubs, smiling"
        onLoadedData={(e) => {
          const v = e.currentTarget;
          if (primedFrame.current) return;
          primedFrame.current = true;
          showFirstFrame(v);
        }}
        onEnded={(e) => {
          showFirstFrame(e.currentTarget);
        }}
      />
    </div>
  );
}

function About() {
  const { t } = useTranslation();
  const cms = useSiteCms();
  const campusSrc = pickSiteImageUrl(cms, "about_campus", certsPhoto);
  const certs = t("about.certs", { returnObjects: true }) as string[];
  const values = [
    { key: "one", icon: Heart },
    { key: "two", icon: Hand },
    { key: "three", icon: Award },
  ] as const;
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <AboutFounderMedia cms={cms} />
        <div>
          <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("about.title")}</h1>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {t("about.body")}
          </p>
        </div>
      </section>

      <section className="bg-[oklch(0.94_0.02_80)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-4xl text-foreground md:text-5xl">
            {t("about.valuesTitle")}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {values.map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-3xl bg-card p-8 shadow-(--shadow-soft)">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-serif text-xl text-foreground">
                  {t(`about.values.${key}.title`)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`about.values.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-serif text-4xl text-foreground md:text-5xl">
              {t("about.certsTitle")}
            </h2>
            <ul className="mt-8 space-y-4">
              {certs.map((c) => (
                <li key={c} className="flex items-center gap-3 text-foreground/90">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-sage/30 text-sage-deep">
                    <Award className="h-4 w-4" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <img
            src={campusSrc}
            alt="Doula in scrubs smiling beside a hospital campus map"
            loading="lazy"
            width={1080}
            height={1500}
            className="aspect-4/5 w-full rounded-[2rem] object-cover shadow-(--shadow-soft)"
          />
        </div>
      </section>
    </div>
  );
}
