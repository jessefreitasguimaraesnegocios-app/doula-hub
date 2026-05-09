import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Heart, Leaf, Sparkles, Quote } from "lucide-react";
import heroImg from "@/assets/hero-doula.jpg";
import newbornImg from "@/assets/newborn.jpg";
import handsImg from "@/assets/about-hands.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "All Things Babies — Doula care for every kind of family" },
      { name: "description", content: "Compassionate, evidence-based doula support through pregnancy, birth, and postpartum." },
      { property: "og:title", content: "All Things Babies — Doula care, with heart" },
      { property: "og:description", content: "You were never meant to do this alone." },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useTranslation();
  const pillars = [
    { key: "one", icon: Heart },
    { key: "two", icon: Leaf },
    { key: "three", icon: Sparkles },
  ] as const;

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 pb-24 md:grid-cols-2 md:pt-20 md:pb-32">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-foreground/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--clay)]" />
              {t("home.eyebrow")}
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] text-foreground md:text-7xl">
              {t("home.title")}
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/booking"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-warm)] transition hover:translate-y-[-1px]"
              >
                {t("home.cta")}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/team"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-7 py-4 text-sm font-medium text-foreground hover:bg-card"
              >
                {t("home.secondary")}
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[var(--sage)]/30 to-[var(--clay)]/20 blur-2xl" />
            <img
              src={heroImg}
              alt="A pregnant person gently holding her belly"
              width={1600}
              height={1200}
              className="relative aspect-[4/5] w-full rounded-[2.5rem] object-cover shadow-[var(--shadow-warm)]"
            />
            <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)] sm:block">
              <p className="text-3xl font-serif text-primary">10+</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                Years caring<br />for families
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section className="bg-[oklch(0.94_0.02_80)] py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <img
            src={handsImg}
            alt="Doula's hands resting on a pregnant belly"
            loading="lazy"
            width={1080}
            height={1500}
            className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-[var(--shadow-soft)]"
          />
          <div>
            <h2 className="font-serif text-4xl leading-tight text-foreground md:text-5xl">
              {t("home.promiseTitle")}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t("home.promiseBody")}
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {pillars.map(({ key, icon: Icon }) => (
                <div key={key}>
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-serif text-lg text-foreground">
                    {t(`home.pillars.${key}.title`)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`home.pillars.${key}.body`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl text-foreground md:text-5xl">{t("home.stepsTitle")}</h2>
          </div>
          <ol className="mt-16 grid gap-8 md:grid-cols-4">
            {(["one", "two", "three", "four"] as const).map((k, i) => (
              <li key={k} className="relative rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)]">
                <span className="font-serif text-5xl text-[var(--sage)]/60">0{i + 1}</span>
                <p className="mt-3 font-serif text-xl text-foreground">{t(`home.steps.${k}.title`)}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`home.steps.${k}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[oklch(0.94_0.02_80)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-4xl text-foreground md:text-5xl">
            {t("home.testimonialsTitle")}
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { name: "Maya & Jordan", body: "Having our doula by our side made the entire birth experience feel sacred. We felt seen, heard, and held." },
              { name: "Sofia R.", body: "The postpartum care saved my mental health. Warm meals, patient guidance, and gentle hands." },
              { name: "Amara T.", body: "From our first call I felt safe. She advocated for me when I couldn't find my own words." },
            ].map((tt) => (
              <figure key={tt.name} className="rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)]">
                <Quote className="h-6 w-6 text-[var(--clay)]" />
                <blockquote className="mt-4 text-base leading-relaxed text-foreground/80">"{tt.body}"</blockquote>
                <figcaption className="mt-6 text-sm font-medium text-muted-foreground">— {tt.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-8 py-16 text-center text-primary-foreground md:px-16 md:py-24">
            <img src={newbornImg} alt="" loading="lazy" width={1080} height={1500} className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-serif text-4xl md:text-5xl">{t("home.cta")}</h2>
              <p className="mt-4 text-base text-primary-foreground/80">{t("home.subtitle")}</p>
              <Link
                to="/booking"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--cream)] px-8 py-4 text-sm font-medium text-foreground shadow-lg transition hover:translate-y-[-1px]"
              >
                {t("nav.book")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
