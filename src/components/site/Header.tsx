import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { LanguageSwitcher } from "./LanguageSwitcher";

function isShopPath(pathname: string) {
  return pathname === "/shop" || pathname.startsWith("/shop/");
}

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const onShopPage = useRouterState({ select: (s) => isShopPath(s.location.pathname) });

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/about", label: t("nav.about") },
    { to: "/services", label: t("nav.services") },
    { to: "/team", label: t("nav.team") },
    { to: "/shop", label: t("nav.shop") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-serif text-xl tracking-tight text-foreground">
          {t("brand")}
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-foreground/70 transition hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {onShopPage ? (
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground/70 transition hover:text-primary"
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <Link
            to="/booking"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-primary-foreground shadow-(--shadow-soft) transition hover:bg-[oklch(0.5_0.05_145)] md:inline-block"
          >
            {t("nav.book")}
          </Link>
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            {onShopPage ? (
              <Link
                to="/cart"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-muted"
              >
                <span>{t("nav.cart")}</span>
                {itemCount > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <Link
              to="/booking"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-primary-foreground"
            >
              {t("nav.book")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
