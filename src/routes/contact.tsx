import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Mail, Phone, MapPin, Instagram, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — All Things Babies" },
      { name: "description", content: "Get in touch with our doula team." },
      { property: "og:title", content: "Contact — All Things Babies" },
      { property: "og:description", content: "We'd love to hear from you." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
      <div>
        <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("contact.title")}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{t("contact.subtitle")}</p>
        <ul className="mt-10 space-y-4 text-sm">
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <a href="mailto:Doula@AllThingsBabies.com" className="hover:text-primary">
              Doula@AllThingsBabies.com
            </a>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-4 w-4" />
            </span>
            <a href="tel:+13236406640" className="hover:text-primary">
              +1 (323) 640-6640
            </a>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            Downtown Culver City, CA
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Instagram className="h-4 w-4" />
            </span>
            <a href="https://www.instagram.com/allthingsbabiesllc/" target="_blank" rel="noreferrer" className="hover:text-primary">
              @allthingsbabiesllc
            </a>
          </li>
        </ul>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
        className="space-y-5 rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)]"
      >
        <Field label={t("contact.name")} name="name" required />
        <Field label={t("contact.email")} name="email" type="email" required />
        <Field label={t("contact.phone")} name="phone" />
        <div>
          <label className="text-xs uppercase tracking-widest text-foreground/60">{t("contact.message")}</label>
          <textarea
            required
            rows={5}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground hover:translate-y-[-1px]"
        >
          {t("contact.send")} <Send className="h-4 w-4" />
        </button>
        {sent && (
          <p className="text-center text-sm text-[var(--sage-deep)]">{t("contact.sent")}</p>
        )}
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-foreground/60">{label}</label>
      <input
        {...props}
        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}