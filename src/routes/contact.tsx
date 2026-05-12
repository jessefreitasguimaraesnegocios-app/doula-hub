import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Mail, Phone, MapPin, Instagram, Send } from "lucide-react";
import { toast } from "sonner";
import { useSiteCms } from "@/hooks/use-site-cms";
import { sendContactInquiryEmail } from "@/lib/email/email-fns";

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
  const { t, i18n } = useTranslation();
  const cms = useSiteCms();
  const email = cms.contactEmail.trim() || "Doula@AllThingsBabies.com";
  const phoneHref = cms.contactPhoneHref.trim() || "+13236406640";
  const phoneDisplay = cms.contactPhoneDisplay.trim() || "+1 (323) 640-6640";
  const address = cms.addressLine.trim() || "Downtown Culver City, CA";
  const igUrl = cms.instagramUrl.trim() || "https://www.instagram.com/allthingsbabiesllc/";
  const igHandle = cms.instagramHandle.trim() || "@allthingsbabiesllc";
  const [name, setName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

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
            <a href={`mailto:${email}`} className="hover:text-primary">
              {email}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-4 w-4" />
            </span>
            <a href={`tel:${phoneHref}`} className="hover:text-primary">
              {phoneDisplay}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            {address}
          </li>
          <li className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Instagram className="h-4 w-4" />
            </span>
            <a href={igUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
              {igHandle}
            </a>
          </li>
        </ul>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (sending) return;
          setSending(true);
          try {
            if (cms.emailAutomationContact) {
              const r = await sendContactInquiryEmail({
                data: {
                  name: name.trim(),
                  email: formEmail.trim(),
                  phone: phone.trim() || undefined,
                  message: message.trim(),
                  locale: i18n.language,
                  fromDisplayName: cms.emailFromName?.trim() || undefined,
                },
              });
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
            }
            setSent(true);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "E-mail");
          } finally {
            setSending(false);
          }
        }}
        className="space-y-5 rounded-3xl bg-card p-8 shadow-[var(--shadow-soft)]"
      >
        <Field
          label={t("contact.name")}
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={t("contact.email")}
          name="email"
          type="email"
          required
          value={formEmail}
          onChange={(e) => setFormEmail(e.target.value)}
        />
        <Field
          label={t("contact.phone")}
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div>
          <label className="text-xs uppercase tracking-widest text-foreground/60">
            {t("contact.message")}
          </label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground hover:-translate-y-px disabled:opacity-60"
        >
          {sending ? "…" : t("contact.send")} <Send className="h-4 w-4" />
        </button>
        {sent && <p className="text-center text-sm text-sage-deep">{t("contact.sent")}</p>}
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
