import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/cart-context";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — All Things Babies" },
      { name: "description", content: "Review the items in your shopping bag." },
    ],
  }),
  component: CartPage,
});

function formatMoney(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
}

function CartPage() {
  const { t, i18n } = useTranslation();
  const { lines, hydrated, subtotalCents, setQty, removeLine } = useCart();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm text-muted-foreground">{t("cart.loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1 className="font-serif text-4xl text-foreground md:text-5xl">{t("cart.title")}</h1>

      {lines.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-border bg-card p-10 text-center shadow-(--shadow-soft)">
          <p className="text-muted-foreground">{t("cart.empty")}</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-10 space-y-6">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex gap-4 rounded-3xl border border-border bg-card p-4 shadow-(--shadow-soft) sm:gap-6 sm:p-5"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted sm:h-28 sm:w-28">
                  <img src={line.imageSrc} alt="" className="h-full w-full object-cover" width={112} height={112} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{line.tag}</p>
                  <p className="mt-0.5 font-serif text-lg text-foreground">{line.name}</p>
                  <p className="mt-1 text-sm text-primary">{line.priceLabel}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-border bg-background">
                      <button
                        type="button"
                        aria-label={t("cart.decreaseQty")}
                        className="grid h-9 w-9 place-items-center text-foreground transition hover:bg-muted"
                        onClick={() => setQty(line.id, line.qty - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={t("cart.increaseQty")}
                        className="grid h-9 w-9 place-items-center text-foreground transition hover:bg-muted"
                        onClick={() => setQty(line.id, line.qty + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("cart.remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-3xl border border-border bg-[oklch(0.94_0.02_80)] p-6">
            <div className="flex items-center justify-between text-foreground">
              <span className="text-sm font-medium uppercase tracking-widest text-foreground/70">{t("cart.subtotal")}</span>
              <span className="font-serif text-2xl">{formatMoney(subtotalCents, i18n.language)}</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("cart.checkoutNote")}</p>
            <button
              type="button"
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-full border border-border bg-muted/50 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground"
            >
              {t("cart.checkout")}
            </button>
          </div>

          <p className="mt-8 text-center">
            <Link to="/shop" className="text-sm text-primary underline-offset-4 hover:underline">
              {t("cart.continueShopping")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
