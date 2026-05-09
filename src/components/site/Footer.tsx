import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Instagram, Mail, Heart } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-border/50 bg-[oklch(0.94_0.02_80)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl text-foreground">{t("brand")}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("footer.tagline")}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://www.instagram.com/allthingsbabiesllc/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground/70 transition hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="mailto:hello@allthingsbabies.com"
              aria-label="Email"
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
            <li><Link to="/about" className="hover:text-primary">{t("nav.about")}</Link></li>
            <li><Link to="/services" className="hover:text-primary">{t("nav.services")}</Link></li>
            <li><Link to="/team" className="hover:text-primary">{t("nav.team")}</Link></li>
            <li><Link to="/shop" className="hover:text-primary">{t("nav.shop")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-foreground/60">
            {t("footer.contact")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/80">
            <li>hello@allthingsbabies.com</li>
            <li>+1 (555) 123-4567</li>
            <li><Link to="/contact" className="hover:text-primary">{t("nav.contact")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {t("brand")}. {t("footer.rights")}</p>
          <p className="inline-flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 fill-[var(--clay)] text-[var(--clay)]" /> for growing families
          </p>
        </div>
      </div>
    </footer>
  );
}