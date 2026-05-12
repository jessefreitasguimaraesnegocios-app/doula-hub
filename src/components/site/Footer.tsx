import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Instagram, Mail, Heart } from "lucide-react";
import logoMark from "@/assets/logo-mark.png";
import { useSiteCms } from "@/hooks/use-site-cms";
import { pickSiteImageUrl } from "@/lib/site-cms";
import { cn } from "@/lib/utils";

const FALLBACK_EMAIL = "Doula@AllThingsBabies.com";

type FooterProps = {
  /** When true, the sequential page nav sits directly above — skip extra top margin from main. */
  tightTop?: boolean;
};

export function Footer({ tightTop }: FooterProps) {
  const { t } = useTranslation();
  const cms = useSiteCms();
  const logoSrc = pickSiteImageUrl(cms, "footer_logo", logoMark);
  const contactEmail = cms.contactEmail.trim() || FALLBACK_EMAIL;
  const mailtoHref = `mailto:${contactEmail}?subject=${encodeURIComponent(t("footer.emailSubject"))}`;

  return (
    <footer
      className={cn(
        "border-t border-border/40 bg-[oklch(0.94_0.02_80)]",
        !tightTop && "mt-24",
      )}
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link
            to="/"
            className="group inline-flex max-w-full items-center gap-4 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.94_0.02_80)]"
          >
            <img
              src={logoSrc}
              alt=""
              width={96}
              height={96}
              className="h-16 w-16 shrink-0 object-contain md:h-20 md:w-20"
            />
            <span className="font-serif text-2xl text-foreground transition-colors group-hover:text-primary">
              {t("brand")}
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={cms.instagramUrl.trim() || "https://www.instagram.com/allthingsbabiesllc/"}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground/70 transition hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={mailtoHref}
              aria-label={t("footer.emailAria")}
              title={contactEmail}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground/70 transition hover:text-primary"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-foreground/60">
            {t("footer.quick")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/80">
            <li>
              <Link to="/about" className="hover:text-primary">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link to="/services" className="hover:text-primary">
                {t("nav.services")}
              </Link>
            </li>
            <li>
              <Link to="/team" className="hover:text-primary">
                {t("nav.team")}
              </Link>
            </li>
            <li>
              <Link to="/shop" className="hover:text-primary">
                {t("nav.shop")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-foreground/60">
            {t("footer.contact")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/80">
            <li>
              <a href={mailtoHref} className="hover:text-primary">
                {contactEmail}
              </a>
            </li>
            <li>
              <a
                href={`tel:${cms.contactPhoneHref.trim() || "+13236406640"}`}
                className="hover:text-primary"
              >
                {cms.contactPhoneDisplay.trim() || "+1 (323) 640-6640"}
              </a>
            </li>
            <li>{cms.addressLine.trim() || "Downtown Culver City, CA"}</li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                {t("nav.contact")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("brand")}. {t("footer.rights")}
          </p>
          <p className="inline-flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 fill-clay text-clay" /> for growing families
          </p>
        </div>
      </div>
    </footer>
  );
}
