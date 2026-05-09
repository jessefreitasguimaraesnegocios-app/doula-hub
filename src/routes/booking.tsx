import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Check, ArrowRight, ArrowLeft, ShieldCheck, Video, CalendarDays } from "lucide-react";
import founder from "@/assets/founder.jpg";
import d2 from "@/assets/doula-2.jpg";
import d3 from "@/assets/doula-3.jpg";
import d4 from "@/assets/doula-4.jpg";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book — All Things Babies" },
      { name: "description", content: "Book your free 30-minute doula consultation." },
      { property: "og:title", content: "Book — All Things Babies" },
      { property: "og:description", content: "Let's begin together." },
    ],
  }),
  component: Booking,
});

const PKGS = ["birth", "postpartum", "bereavement", "lactation"] as const;
const DOULAS = [
  { id: "any", name: "Match me", img: null },
  { id: "imani", name: "Imani Carter", img: founder },
  { id: "sofia", name: "Sofia Rivera", img: d2 },
  { id: "elena", name: "Elena Conti", img: d3 },
  { id: "mei", name: "Mei Tanaka", img: d4 },
];

type Form = {
  pkg: string;
  doula: string;
  dueDate: string;
  firstBaby: string;
  birthLocation: string;
  provider: string;
  partner: string;
  address: string;
  concerns: string;
  platform: string;
  date: string;
  time: string;
};

function Booking() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<Form>({
    pkg: "birth",
    doula: "any",
    dueDate: "",
    firstBaby: "yes",
    birthLocation: "hospital",
    provider: "",
    partner: "",
    address: "",
    concerns: "",
    platform: "Zoom",
    date: "",
    time: "",
  });
  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const stepKeys = ["package", "doula", "intake", "schedule", "payment"] as const;
  const platforms = t("booking.schedule.platforms", { returnObjects: true }) as string[];

  if (done) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--sage)]/30 text-[var(--sage-deep)]">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="mt-8 font-serif text-5xl text-foreground">{t("booking.payment.success")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("booking.payment.successBody")}</p>
        <Link to="/" className="mt-10 rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground">
          {t("nav.home")}
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <div className="text-center">
        <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("booking.title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("booking.subtitle")}</p>
      </div>

      {/* Stepper */}
      <ol className="mx-auto mt-12 flex max-w-3xl items-center justify-between gap-2">
        {stepKeys.map((k, i) => (
          <li key={k} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-medium transition ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:inline ${i === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {t(`booking.steps.${k}`)}
            </span>
            {i < stepKeys.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-[2rem] bg-card p-8 shadow-[var(--shadow-soft)] md:p-12">
        {/* PACKAGE */}
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {PKGS.map((k) => {
              const sel = form.pkg === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => update("pkg", k)}
                  className={`rounded-2xl border-2 p-6 text-left transition ${
                    sel ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <p className="font-serif text-xl text-foreground">{t(`services.items.${k}.name`)}</p>
                  <p className="mt-1 font-serif text-2xl text-primary">{t(`services.items.${k}.price`)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`services.items.${k}.body`)}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* DOULA */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {DOULAS.map((d) => {
              const sel = form.doula === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => update("doula", d.id)}
                  className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                    sel ? "border-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  {d.img ? (
                    <img src={d.img} alt={d.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-[var(--sage)]/20 font-serif text-3xl text-[var(--sage-deep)]">
                      ✦
                    </div>
                  )}
                  <p className="px-4 py-3 text-sm font-medium text-foreground">
                    {d.id === "any" ? t("booking.doulaAny") : d.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* INTAKE */}
        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <BookField label={t("booking.intake.dueDate")} type="date" value={form.dueDate} onChange={(v) => update("dueDate", v)} />
            <BookSelect label={t("booking.intake.firstBaby")} value={form.firstBaby} onChange={(v) => update("firstBaby", v)} options={[
              { value: "yes", label: t("booking.intake.yes") },
              { value: "no", label: t("booking.intake.no") },
            ]} />
            <BookSelect label={t("booking.intake.birthLocation")} value={form.birthLocation} onChange={(v) => update("birthLocation", v)} options={[
              { value: "hospital", label: t("booking.intake.hospital") },
              { value: "birthCenter", label: t("booking.intake.birthCenter") },
              { value: "home", label: t("booking.intake.home") },
              { value: "undecided", label: t("booking.intake.undecided") },
            ]} />
            <BookField label={t("booking.intake.provider")} value={form.provider} onChange={(v) => update("provider", v)} />
            <BookField label={t("booking.intake.partner")} value={form.partner} onChange={(v) => update("partner", v)} />
            <BookField label={t("booking.intake.address")} value={form.address} onChange={(v) => update("address", v)} />
            <div className="sm:col-span-2">
              <label className="text-xs uppercase tracking-widest text-foreground/60">{t("booking.intake.concerns")}</label>
              <textarea
                rows={4}
                value={form.concerns}
                onChange={(e) => update("concerns", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="font-serif text-xl text-foreground">{t("booking.schedule.title")}</p>
            <div className="grid gap-5 sm:grid-cols-3">
              <BookSelect
                label={t("booking.schedule.platform")}
                value={form.platform}
                onChange={(v) => update("platform", v)}
                options={platforms.map((p) => ({ value: p, label: p }))}
              />
              <BookField label={t("booking.schedule.date")} type="date" value={form.date} onChange={(v) => update("date", v)} />
              <BookField label={t("booking.schedule.time")} type="time" value={form.time} onChange={(v) => update("time", v)} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--sage)]/15 p-4 text-sm text-foreground/80">
              <Video className="h-5 w-5 text-[var(--sage-deep)]" />
              We'll send you a {form.platform} link by email after confirmation.
            </div>
          </div>
        )}

        {/* PAYMENT */}
        {step === 4 && (
          <div className="space-y-6">
            <p className="font-serif text-2xl text-foreground">{t("booking.payment.summary")}</p>
            <dl className="space-y-3 rounded-2xl bg-background p-6">
              <Row label={t("booking.steps.package")} value={t(`services.items.${form.pkg}.name`)} />
              <Row label={t("booking.steps.doula")} value={form.doula === "any" ? t("booking.doulaAny") : DOULAS.find((d) => d.id === form.doula)?.name ?? "—"} />
              <Row
                label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{t("booking.steps.schedule")}</span>}
                value={`${form.date || "—"} ${form.time}  ·  ${form.platform}`}
              />
              <div className="my-2 border-t border-border" />
              <Row label={<span className="font-medium text-foreground">{t("booking.payment.total")}</span>} value={<span className="font-serif text-2xl text-primary">{t(`services.items.${form.pkg}.price`)}</span>} />
            </dl>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-foreground">{t("booking.payment.secure")}</p>
                <p className="mt-1 text-xs">{t("booking.payment.terms")}</p>
              </div>
            </div>
          </div>
        )}

        {/* NAV */}
        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-sm text-foreground/70 transition hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("booking.back")}
          </button>
          {step < stepKeys.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:translate-y-[-1px]"
            >
              {t("booking.next")} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDone(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:translate-y-[-1px]"
            >
              {t("booking.finish")} <ShieldCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function BookSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}