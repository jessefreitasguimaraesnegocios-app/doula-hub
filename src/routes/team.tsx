import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import founder from "@/assets/founder.jpg";
import d2 from "@/assets/doula-2.jpg";
import d3 from "@/assets/doula-3.jpg";
import d4 from "@/assets/doula-4.jpg";
import teamHero from "@/assets/team-hero.jpg";

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

const TEAM = [
  {
    img: founder,
    name: "Imani Carter",
    role: "Founder · Birth & Postpartum Doula",
    bio: "Over a decade of holding space for families through every kind of birth.",
    specs: ["Birth doula", "VBAC support", "Bereavement"],
    langs: ["English", "Spanish"],
  },
  {
    img: d2,
    name: "Sofia Rivera",
    role: "Birth & Lactation Doula",
    bio: "Lactation counselor with a gentle, evidence-based approach.",
    specs: ["Lactation (CLC)", "Twins", "Home birth"],
    langs: ["Spanish", "English", "Portuguese"],
  },
  {
    img: d3,
    name: "Elena Conti",
    role: "Postpartum Doula",
    bio: "Specialist in the fourth trimester — overnight care and family integration.",
    specs: ["Postpartum", "Newborn care", "Sibling support"],
    langs: ["Italian", "English"],
  },
  {
    img: d4,
    name: "Mei Tanaka",
    role: "Bereavement & Birth Doula",
    bio: "Tender presence through pregnancy and infant loss.",
    specs: ["Bereavement", "Birth doula", "Mental health"],
    langs: ["English", "Japanese"],
  },
];

function Team() {
  const { t } = useTranslation();
  return (
    <div>
      <section className="relative h-[40vh] min-h-[320px] overflow-hidden">
        <img src={teamHero} alt="" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-end px-6 pb-12 text-center">
          <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("team.title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t("team.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 sm:grid-cols-2">
          {TEAM.map((m) => (
            <article key={m.name} className="group rounded-[2rem] bg-card p-6 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-warm)]">
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src={m.img}
                  alt={m.name}
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="px-2 pt-6 pb-2">
                <p className="font-serif text-2xl text-foreground">{m.name}</p>
                <p className="text-sm text-[var(--clay)]">{m.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
                <div className="mt-5 grid gap-3 text-xs">
                  <div>
                    <p className="uppercase tracking-widest text-foreground/50">{t("team.specialties")}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.specs.map((s) => (
                        <span key={s} className="rounded-full bg-[var(--sage)]/30 px-3 py-1 text-foreground/80">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="uppercase tracking-widest text-foreground/50">{t("team.languages")}</p>
                    <p className="mt-1.5 text-foreground/80">{m.langs.join(" · ")}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}