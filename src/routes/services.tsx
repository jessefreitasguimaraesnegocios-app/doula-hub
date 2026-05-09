import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Packages — All Things Babies" },
      { name: "description", content: "Birth doula, postpartum care, lactation, and bereavement support packages." },
      { property: "og:title", content: "Services — All Things Babies" },
      { property: "og:description", content: "Care that meets you where you are." },
    ],
  }),
  component: Services,
});

const KEYS = ["birth", "postpartum", "bereavement", "lactation"] as const;

function Services() {
  const { t } = useTranslation();
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center md:pt-28">
        <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("services.title")}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{t("services.subtitle")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {KEYS.map((k, i) => {
            const features = t(`services.items.${k}.features`, { returnObjects: true }) as string[];
            const featured = i === 0;
            return (
              <article
                key={k}
                className={`relative flex flex-col rounded-[2rem] p-8 md:p-10 ${
                  featured
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-warm)]"
                    : "bg-card text-foreground shadow-[var(--shadow-soft)]"
                }`}
              >
                {featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-[var(--cream)]/20 px-3 py-1 text-[10px] font-medium uppercase tracking-widest backdrop-blur">
                    Most loved
                  </span>
                )}
                <h2 className="font-serif text-3xl">{t(`services.items.${k}.name`)}</h2>
                <p className={`mt-4 font-serif text-4xl ${featured ? "text-[var(--cream)]" : "text-primary"}`}>
                  {t(`services.items.${k}.price`)}
                </p>
                <p className={`mt-3 text-sm leading-relaxed ${featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {t(`services.items.${k}.body`)}
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${featured ? "text-[var(--cream)]" : "text-[var(--sage-deep)]"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/booking"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition ${
                    featured
                      ? "bg-[var(--cream)] text-foreground hover:translate-y-[-1px]"
                      : "bg-primary text-primary-foreground hover:translate-y-[-1px]"
                  }`}
                >
                  {t("services.bookCta")}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}