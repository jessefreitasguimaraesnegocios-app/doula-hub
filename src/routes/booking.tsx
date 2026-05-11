import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { Check, ArrowRight, ArrowLeft, ShieldCheck, Video, CalendarDays } from "lucide-react";
import founder from "@/assets/founder.png";
import d2 from "@/assets/doula-2.jpg";
import d3 from "@/assets/doula-3.jpg";
import d4 from "@/assets/doula-4.jpg";
import { useSiteCms } from "@/hooks/use-site-cms";
import { pickSiteImageUrl, servicePriceUsdOverride, type SiteCmsV1, type SiteImageKey } from "@/lib/site-cms";
import { completeBookingRequest } from "@/lib/booking/booking-fns";

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
  /** Mesmo slug que `doulas.slug` na base (seed `founder`) e slot `team_member_founder` no CMS. */
  { id: "founder", name: "Raquel Manini", img: founder },
  { id: "sofia", name: "Sofia Rivera", img: d2 },
  { id: "elena", name: "Elena Conti", img: d3 },
  { id: "mei", name: "Mei Tanaka", img: d4 },
] as const;

function bookingDoulaSlot(id: string): SiteImageKey | null {
  if (id === "any") return null;
  if (id === "founder") return "team_member_founder";
  return `team_member_${id}` as SiteImageKey;
}

const CONTRACTED_BOOKING_PREFIX = "contracted:" as const;

function resolveBookingDoulaLabel(doulaId: string, t: TFunction, cms: SiteCmsV1): string {
  if (doulaId === "any") return t("booking.doulaAny");
  if (doulaId.startsWith(CONTRACTED_BOOKING_PREFIX)) {
    const cid = doulaId.slice(CONTRACTED_BOOKING_PREFIX.length);
    return cms.contractedDoulas.find((c) => c.id === cid)?.name?.trim() || "—";
  }
  return DOULAS.find((d) => d.id === doulaId)?.name ?? "—";
}

const SUPPORT_ORDER = ["birth", "postpartum", "lactation", "bereavement", "combo", "other"] as const;
const LANG_ORDER = ["english", "spanish", "portuguese", "other"] as const;

const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com"] as const;

function formatUSPhoneFromDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function usPhoneHasTenDigits(formatted: string): boolean {
  return formatted.replace(/\D/g, "").length === 10;
}

function emailDomainPickVisible(value: string): boolean {
  const parts = value.split("@");
  if (parts.length < 2) return false;
  const domain = parts.slice(1).join("@");
  return !domain.includes(".");
}

/** US typed date → display string with slashes (digits only, max 8). */
function formatUsDateTyped(digitsRaw: string): string {
  const d = digitsRaw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function isoFromUsDigits8(d: string): string {
  if (d.length !== 8) return "";
  const mm = d.slice(0, 2);
  const dd = d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  const m = Number(mm);
  const day = Number(dd);
  const y = Number(yyyy);
  if (m < 1 || m > 12 || day < 1 || day > 31 || y < 1900 || y > 2100) return "";
  const dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) return "";
  return `${yyyy}-${mm}-${dd}`;
}

function isoToUsDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function formatUsZipDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function zipUsIsValid(masked: string): boolean {
  const n = masked.replace(/\D/g, "").length;
  return n === 5 || n === 9;
}

type Form = {
  pkg: string;
  doula: string;
  fullName: string;
  email: string;
  phone: string;
  dueDate: string;
  firstBaby: string;
  birthLocation: string;
  hospitalProvider: string;
  zipCode: string;
  streetNumber: string;
  zipCity: string;
  zipState: string;
  supportTypes: string[];
  includeSupport: string;
  supportName: string;
  supportRelation: string;
  preferredLanguage: string;
  babyCount: string;
  howHeard: string;
  notesBeforeCall: string;
  platform: string;
  date: string;
  time: string;
};

function validateIntake(f: Form) {
  return (
    f.fullName.trim() !== "" &&
    f.email.trim() !== "" &&
    usPhoneHasTenDigits(f.phone) &&
    f.dueDate !== "" &&
    f.firstBaby !== "" &&
    f.birthLocation !== "" &&
    zipUsIsValid(f.zipCode) &&
    f.streetNumber.trim() !== "" &&
    f.supportTypes.length > 0 &&
    f.preferredLanguage !== "" &&
    f.babyCount !== "" &&
    (f.includeSupport !== "yes" || (f.supportName.trim() !== "" && f.supportRelation.trim() !== ""))
  );
}

/** Rótulos para o toast quando falta algo no passo «Sua história». */
function intakeMissingLabels(f: Form, t: TFunction): string[] {
  const labels: string[] = [];
  if (!f.fullName.trim()) labels.push(t("booking.intake.fullName"));
  if (!f.email.trim()) labels.push(t("booking.intake.email"));
  if (!usPhoneHasTenDigits(f.phone)) labels.push(t("booking.intake.phone"));
  if (!f.dueDate) labels.push(t("booking.intake.dueDate"));
  if (!f.firstBaby) labels.push(t("booking.intake.firstBaby"));
  if (!f.birthLocation) labels.push(t("booking.intake.birthLocation"));
  if (!zipUsIsValid(f.zipCode)) labels.push(t("booking.intake.zipCode"));
  if (!f.streetNumber.trim()) labels.push(t("booking.intake.streetNumber"));
  if (f.supportTypes.length === 0) labels.push(t("booking.intake.supportType"));
  if (f.includeSupport === "yes") {
    if (!f.supportName.trim()) labels.push(t("booking.intake.supportName"));
    if (!f.supportRelation.trim()) labels.push(t("booking.intake.supportRelation"));
  }
  if (!f.preferredLanguage) labels.push(t("booking.intake.preferredLanguage"));
  if (!f.babyCount) labels.push(t("booking.intake.babyCount"));
  return labels;
}

function bookingIntakeSnapshot(form: Form): Record<string, unknown> {
  return {
    dueDate: form.dueDate,
    firstBaby: form.firstBaby,
    birthLocation: form.birthLocation,
    hospitalProvider: form.hospitalProvider,
    zipCode: form.zipCode,
    streetNumber: form.streetNumber,
    zipCity: form.zipCity,
    zipState: form.zipState,
    supportTypes: form.supportTypes,
    includeSupport: form.includeSupport,
    supportName: form.supportName,
    supportRelation: form.supportRelation,
    preferredLanguage: form.preferredLanguage,
    babyCount: form.babyCount,
    howHeard: form.howHeard,
    notesBeforeCall: form.notesBeforeCall,
  };
}

function Booking() {
  const { t, i18n } = useTranslation();
  const cms = useSiteCms();
  const visibleContracted = useMemo(
    () => cms.contractedDoulas.filter((c) => c.visibleOnSite && c.status === "active" && c.name.trim()),
    [cms.contractedDoulas],
  );
  const doulasWithImages = useMemo(() => {
    const core = DOULAS.map((d) => {
      if (!d.img) return { id: d.id, name: d.name, imgSrc: null as string | null };
      const slot = bookingDoulaSlot(d.id);
      if (!slot) return { id: d.id, name: d.name, imgSrc: null as string | null };
      return { id: d.id, name: d.name, imgSrc: pickSiteImageUrl(cms, slot, d.img) };
    });
    const extra = visibleContracted.map((c) => ({
      id: `${CONTRACTED_BOOKING_PREFIX}${c.id}`,
      name: c.name.trim(),
      imgSrc: c.photoUrl.trim() || null,
    }));
    return [...core, ...extra];
  }, [cms, visibleContracted]);
  const allowUsdOverride = i18n.language === "en" || i18n.language === "es";
  const pkgPriceDisplay = (pkg: string) => {
    if (allowUsdOverride) {
      const o = servicePriceUsdOverride(cms, pkg);
      if (o) return o;
    }
    return t(`services.items.${pkg}.price`);
  };
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [form, setForm] = useState<Form>({
    pkg: "birth",
    doula: "any",
    fullName: "",
    email: "",
    phone: "",
    dueDate: "",
    firstBaby: "",
    birthLocation: "",
    hospitalProvider: "",
    zipCode: "",
    streetNumber: "",
    zipCity: "",
    zipState: "",
    supportTypes: [],
    includeSupport: "",
    supportName: "",
    supportRelation: "",
    preferredLanguage: "",
    babyCount: "",
    howHeard: "",
    notesBeforeCall: "",
    platform: "Zoom",
    date: "",
    time: "",
  });
  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleZipPlace = useCallback((city: string, state: string) => {
    setForm((prev) => ({ ...prev, zipCity: city, zipState: state }));
  }, []);

  const stepKeys = ["package", "doula", "intake", "schedule", "payment"] as const;
  const platforms = t("booking.schedule.platforms", { returnObjects: true }) as string[];

  const finishBooking = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !form.time.trim()) {
      toast.error(t("booking.schedule.fillDateTime"));
      return;
    }
    setFinishBusy(true);
    try {
      const doulaLabel = resolveBookingDoulaLabel(form.doula, t, cms);
      const r = await completeBookingRequest({
        data: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          pkgKey: form.pkg,
          pkgLabel: t(`services.items.${form.pkg}.name`),
          doulaLabel,
          date: form.date,
          time: form.time,
          platform: form.platform,
          meetLink: cms.teamDefaultScheduleUrl?.trim() || undefined,
          locale: i18n.language,
          fromDisplayName: cms.emailFromName?.trim() || undefined,
          sendClientEmail: cms.emailAutomationBooking,
          intake: bookingIntakeSnapshot(form),
        },
      });
      if (!r.ok) {
        toast.error(t("booking.payment.saveFailed", { detail: r.error }));
        return;
      }
      if (r.googleError) {
        toast.warning(t("booking.payment.googleSyncWarn", { detail: r.googleError }));
      }
      if (r.emailError) {
        toast.warning(t("booking.payment.emailSyncWarn", { detail: r.emailError }));
      }
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("booking.payment.saveFailedGeneric"));
    } finally {
      setFinishBusy(false);
    }
  };

  const goNext = () => {
    if (step === 2 && !validateIntake(form)) {
      const missing = intakeMissingLabels(form, t);
      const detail =
        missing.length > 0 ? t("booking.intake.fillRequiredDetail", { fields: missing.join(" · ") }) : t("booking.intake.fillRequired");
      toast.error(detail);
      return;
    }
    setStep((s) => s + 1);
  };

  if (done) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-sage/30 text-sage-deep">
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

  const supportTypesSummary =
    form.supportTypes.length > 0
      ? SUPPORT_ORDER.filter((k) => form.supportTypes.includes(k))
          .map((k) => t(`booking.intake.support.${k}`))
          .join(" · ")
      : "—";

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <div className="text-center">
        <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("booking.title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("booking.subtitle")}</p>
      </div>

      <ol className="mx-auto mt-12 flex max-w-3xl items-center justify-between gap-2">
        {stepKeys.map((k, i) => (
          <li key={k} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium transition ${
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

      <div className="mt-12 rounded-[2rem] bg-card p-8 shadow-(--shadow-soft) md:p-12">
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
                  <p className="mt-1 font-serif text-2xl text-primary">{pkgPriceDisplay(k)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t(`services.items.${k}.body`)}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {doulasWithImages.map((d) => {
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
                  {d.imgSrc ? (
                    <img src={d.imgSrc} alt={d.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-sage/20 font-serif text-3xl text-sage-deep">
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

        {step === 2 && (
          <div className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <BookField label={`${t("booking.intake.fullName")} *`} value={form.fullName} onChange={(v) => update("fullName", v)} required />
              <BookEmailField label={`${t("booking.intake.email")} *`} value={form.email} onChange={(v) => update("email", v)} required />
              <BookPhoneField label={`${t("booking.intake.phone")} *`} value={form.phone} onChange={(v) => update("phone", v)} required />
              <BookDateUsField label={`${t("booking.intake.dueDate")} *`} value={form.dueDate} onChange={(v) => update("dueDate", v)} placeholder={t("booking.intake.datePlaceholder")} required />
            </div>

            <BookRadioGroup
              legend={`${t("booking.intake.firstBaby")} *`}
              name="firstBaby"
              value={form.firstBaby}
              onChange={(v) => update("firstBaby", v)}
              options={[
                { value: "yes", label: t("booking.intake.yes") },
                { value: "no", label: t("booking.intake.no") },
              ]}
            />

            <BookRadioGroup
              legend={`${t("booking.intake.birthLocation")} *`}
              name="birthLocation"
              value={form.birthLocation}
              onChange={(v) => update("birthLocation", v)}
              options={[
                { value: "hospital", label: t("booking.intake.hospital") },
                { value: "birthCenter", label: t("booking.intake.birthCenter") },
                { value: "home", label: t("booking.intake.home") },
              ]}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <BookField
                  label={`${t("booking.intake.hospitalProvider")} (${t("booking.intake.optional")})`}
                  value={form.hospitalProvider}
                  onChange={(v) => update("hospitalProvider", v)}
                  hint={t("booking.intake.hospitalProviderHint")}
                />
              </div>
              <BookZipUsField
                label={`${t("booking.intake.zipCode")} *`}
                value={form.zipCode}
                onChange={(v) => update("zipCode", v)}
                onPlaceFound={handleZipPlace}
                city={form.zipCity}
                stateAbbr={form.zipState}
                placeholder={t("booking.intake.zipPlaceholder")}
                required
                t={t}
              />
              <BookField
                label={`${t("booking.intake.streetNumber")} *`}
                value={form.streetNumber}
                onChange={(v) => update("streetNumber", v)}
                placeholder={t("booking.intake.streetNumberPh")}
                required
              />
            </div>

            <BookSupportMultiPicker
              label={`${t("booking.intake.supportType")} *`}
              value={form.supportTypes}
              onChange={(v) => update("supportTypes", v)}
              t={t}
            />

            <div>
              <p className="text-xs uppercase tracking-widest text-foreground/60">
                {t("booking.intake.includeSupport")}{" "}
                <span className="font-normal normal-case text-muted-foreground">({t("booking.intake.includeSupportHint")})</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    { value: "yes", label: t("booking.intake.yes") },
                    { value: "no", label: t("booking.intake.no") },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
                      form.includeSupport === o.value ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-foreground/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="includeSupport"
                      value={o.value}
                      checked={form.includeSupport === o.value}
                      onChange={() => update("includeSupport", o.value)}
                      className="accent-primary"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {form.includeSupport === "yes" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <BookField
                  label={`${t("booking.intake.supportName")} *`}
                  value={form.supportName}
                  onChange={(v) => update("supportName", v)}
                  required
                />
                <BookField
                  label={`${t("booking.intake.supportRelation")} *`}
                  value={form.supportRelation}
                  onChange={(v) => update("supportRelation", v)}
                  placeholder={t("booking.intake.supportRelationPh")}
                  required
                />
              </div>
            )}

            <BookSelect
              label={`${t("booking.intake.preferredLanguage")} *`}
              value={form.preferredLanguage}
              onChange={(v) => update("preferredLanguage", v)}
              options={[
                { value: "", label: t("booking.intake.selectPlaceholder") },
                ...LANG_ORDER.map((key) => ({ value: key, label: t(`booking.intake.lang.${key}`) })),
              ]}
              required
            />

            <div>
              <p className="text-xs uppercase tracking-widest text-foreground/60">{`${t("booking.intake.babyCount")} *`}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {(
                  [
                    { value: "1", label: t("booking.intake.babyCount1") },
                    { value: "2", label: t("booking.intake.babyCount2") },
                    { value: "3plus", label: t("booking.intake.babyCount3plus") },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.value}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition ${
                      form.babyCount === o.value ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-foreground/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="babyCount"
                      value={o.value}
                      checked={form.babyCount === o.value}
                      onChange={() => update("babyCount", o.value)}
                      className="accent-primary"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            <BookField
              label={`${t("booking.intake.howHeard")} (${t("booking.intake.optional")})`}
              value={form.howHeard}
              onChange={(v) => update("howHeard", v)}
            />

            <div>
              <label className="text-xs uppercase tracking-widest text-foreground/60">
                {t("booking.intake.notesBeforeCall")}{" "}
                <span className="font-normal normal-case text-muted-foreground">({t("booking.intake.optional")})</span>
              </label>
              <textarea
                rows={4}
                value={form.notesBeforeCall}
                onChange={(e) => update("notesBeforeCall", e.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

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
            <div className="flex items-center gap-3 rounded-2xl bg-sage/15 p-4 text-sm text-foreground/80">
              <Video className="h-5 w-5 shrink-0 text-sage-deep" />
              {t("booking.schedule.linkNote", { platform: form.platform })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <p className="font-serif text-2xl text-foreground">{t("booking.payment.summary")}</p>
            <dl className="space-y-3 rounded-2xl bg-background p-6">
              <Row label={t("booking.steps.package")} value={t(`services.items.${form.pkg}.name`)} />
              <Row label={t("booking.steps.doula")} value={resolveBookingDoulaLabel(form.doula, t, cms)} />
              <Row label={t("booking.intake.fullName")} value={form.fullName || "—"} />
              <Row label={t("booking.intake.email")} value={form.email || "—"} />
              <Row label={t("booking.intake.phone")} value={form.phone || "—"} />
              <Row
                label={t("booking.intake.dueDate")}
                value={isoToUsDisplay(form.dueDate) || form.dueDate || "—"}
              />
              <Row label={t("booking.intake.streetNumber")} value={form.streetNumber || "—"} />
              <Row
                label={t("booking.intake.zipCode")}
                value={
                  form.zipCode
                    ? form.zipCity && form.zipState
                      ? `${form.zipCode} · ${form.zipCity}, ${form.zipState}`
                      : form.zipCode
                    : "—"
                }
              />
              <Row label={t("booking.intake.supportType")} value={supportTypesSummary} />
              <Row
                label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{t("booking.steps.schedule")}</span>}
                value={`${form.date || "—"} ${form.time}  ·  ${form.platform}`}
              />
              <div className="my-2 border-t border-border" />
              <Row
                label={<span className="font-medium text-foreground">{t("booking.payment.total")}</span>}
                value={<span className="font-serif text-2xl text-primary">{pkgPriceDisplay(form.pkg)}</span>}
              />
            </dl>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-foreground">{t("booking.payment.secure")}</p>
                <p className="mt-1 text-xs">{t("booking.payment.terms")}</p>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 mt-10 flex items-center justify-between">
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
            <button type="button" onClick={goNext} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:-translate-y-px">
              {t("booking.next")} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={finishBusy}
              onClick={() => void finishBooking()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:-translate-y-px disabled:opacity-60"
            >
              {finishBusy ? "…" : t("booking.finish")} <ShieldCheck className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BookSupportMultiPicker({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  t: TFunction;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<string[]>(value);

  const open = () => {
    setDraft([...value]);
    dialogRef.current?.showModal();
  };

  const toggle = (key: string) => {
    setDraft((d) => (d.includes(key) ? d.filter((x) => x !== key) : [...d, key]));
  };

  const commit = () => {
    onChange(draft);
    dialogRef.current?.close();
  };

  const summary =
    value.length > 0
      ? SUPPORT_ORDER.filter((k) => value.includes(k))
          .map((k) => t(`booking.intake.support.${k}`))
          .join(" · ")
      : t("booking.intake.supportOpenPick");

  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <button
        type="button"
        onClick={open}
        className={`mt-2 flex min-h-12 w-full items-center rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${value.length === 0 ? "text-muted-foreground" : "text-foreground"}`}
      >
        <span className="line-clamp-3">{summary}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-6 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <p className="font-serif text-lg leading-snug">{t("booking.intake.supportDialogTitle")}</p>
        <div className="mt-4 max-h-[min(60vh,22rem)] space-y-2 overflow-y-auto pr-1">
          {SUPPORT_ORDER.map((key) => (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                draft.includes(key) ? "border-primary bg-primary/5" : "border-border bg-background"
              }`}
            >
              <input
                type="checkbox"
                checked={draft.includes(key)}
                onChange={() => toggle(key)}
                className="size-4 shrink-0 rounded border border-input accent-primary"
              />
              <span>{t(`booking.intake.support.${key}`)}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            className="rounded-full border border-border bg-background px-5 py-2.5 text-sm text-foreground transition hover:bg-muted"
            onClick={() => dialogRef.current?.close()}
          >
            {t("booking.intake.supportCancel")}
          </button>
          <button type="button" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90" onClick={commit}>
            {t("booking.intake.supportConfirm")}
          </button>
        </div>
      </dialog>
    </div>
  );
}

function BookDateUsField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => isoToUsDisplay(value));

  // Sincronizar só quando o pai tem uma data ISO válida. Se enviarmos "" durante a digitação
  // (menos de 8 dígitos), não limpar o texto local — senão o campo apaga a cada tecla e dueDate nunca grava.
  useEffect(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    setText(isoToUsDisplay(value));
  }, [value]);

  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder={placeholder}
        value={text}
        required={required}
        maxLength={10}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
          const display = formatUsDateTyped(digits);
          setText(display);
          onChange(isoFromUsDigits8(digits));
        }}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm tabular-nums focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function BookZipUsField({
  label,
  value,
  onChange,
  onPlaceFound,
  city,
  stateAbbr,
  placeholder,
  required,
  t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPlaceFound: (city: string, stateAbbr: string) => void;
  city: string;
  stateAbbr: string;
  placeholder?: string;
  required?: boolean;
  t: TFunction;
}) {
  const [lookup, setLookup] = useState<"idle" | "loading" | "none">("idle");

  useEffect(() => {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 5) {
      setLookup("idle");
      onPlaceFound("", "");
      return;
    }
    const zip5 = digits.slice(0, 5);
    const ac = new AbortController();
    setLookup("loading");

    const tmr = window.setTimeout(async () => {
      try {
        const r = await fetch(`https://api.zippopotam.us/us/${zip5}`, { signal: ac.signal });
        if (!r.ok) throw new Error("n");
        const data = (await r.json()) as {
          places?: { "place name": string; "state abbreviation": string }[];
        };
        if (ac.signal.aborted) return;
        const p = data.places?.[0];
        if (!p) throw new Error("n");
        onPlaceFound(p["place name"], p["state abbreviation"]);
        setLookup("idle");
      } catch {
        if (ac.signal.aborted) return;
        onPlaceFound("", "");
        setLookup("none");
      }
    }, 450);

    return () => {
      ac.abort();
      window.clearTimeout(tmr);
    };
  }, [value, onPlaceFound]);

  const digits = value.replace(/\D/g, "");
  const placeLine =
    digits.length >= 5 && city && stateAbbr ? t("booking.intake.zipPlaceLine", { city, state: stateAbbr }) : null;
  const loadLine = lookup === "loading" && digits.length >= 5 ? t("booking.intake.zipLookupLoading") : null;
  const errLine = lookup === "none" ? t("booking.intake.zipLookupNone") : null;

  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder={placeholder}
        value={value}
        required={required}
        maxLength={10}
        onChange={(e) => onChange(formatUsZipDigits(e.target.value))}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm tabular-nums focus:border-primary focus:outline-none"
      />
      {(placeLine || errLine || loadLine) && (
        <p className={`mt-1.5 text-xs ${errLine ? "text-destructive" : "text-muted-foreground"}`}>{placeLine || errLine || loadLine}</p>
      )}
    </div>
  );
}

function BookPhoneField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="(555) 123-4567"
        value={value}
        required={required}
        maxLength={14}
        onChange={(e) => onChange(formatUSPhoneFromDigits(e.target.value))}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm tabular-nums focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function BookEmailField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const parts = value.split("@");
  const localPart = parts[0] ?? "";
  const showDomains = emailDomainPickVisible(value) && localPart.length > 0;

  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        type="email"
        autoComplete="email"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
      {showDomains ? (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Email domain suggestions">
          {EMAIL_DOMAINS.map((dom) => (
            <button
              key={dom}
              type="button"
              onClick={() => onChange(`${localPart}@${dom}`)}
              className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition hover:border-primary hover:bg-primary/5"
            >
              @{dom}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BookField({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function BookSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value === "" ? "_placeholder" : o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BookRadioGroup({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-widest text-foreground/60">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
              value === o.value ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-foreground/80"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="accent-primary" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[55%] text-right text-foreground">{value}</dd>
    </div>
  );
}
