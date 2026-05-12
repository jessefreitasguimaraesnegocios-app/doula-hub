import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import shopHero from "@/assets/shop-hero.jpg";
import { Button } from "@/components/ui/button";
import { useSiteCms } from "@/hooks/use-site-cms";
import { pickSiteImageUrl } from "@/lib/site-cms";
import { useCart } from "@/context/cart-context";
import { SHOP_PRODUCTS } from "@/data/shop-products";
import { fetchActiveShopProducts } from "@/lib/supabase/queries";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — All Things Babies" },
      { name: "description", content: "Hand-picked essentials for pregnancy and postpartum." },
      { property: "og:title", content: "Shop — All Things Babies" },
      { property: "og:description", content: "Gentle goods for gentle beginnings." },
      { property: "og:image", content: shopHero },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { t } = useTranslation();
  const cms = useSiteCms();
  const heroSrc = pickSiteImageUrl(cms, "shop_hero", shopHero);
  const { addProduct } = useCart();
  const router = useRouter();
  /** Dismiss only for this stay on /shop; leaving or reloading shows the overlay again if CMS still enables it. */
  const [comingSoonDismissed, setComingSoonDismissed] = useState(false);

  const showComingSoonOverlay = cms.shopComingSoonEnabled && !comingSoonDismissed;
  const comingSoonTitle = cms.shopComingSoonTitle.trim() || t("shop.comingSoon.fallbackTitle");
  const comingSoonBody = cms.shopComingSoonMessage.trim() || t("shop.comingSoon.fallbackBody");

  useEffect(() => {
    if (!showComingSoonOverlay) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [showComingSoonOverlay]);

  const dismissComingSoon = () => setComingSoonDismissed(true);

  const { data: remoteProducts } = useQuery({
    queryKey: ["shop_products", "active"],
    queryFn: fetchActiveShopProducts,
    staleTime: 60_000,
  });

  const products = useMemo(() => {
    if (remoteProducts && remoteProducts.length > 0) return remoteProducts;
    return [...SHOP_PRODUCTS];
  }, [remoteProducts]);

  return (
    <div className="relative">
      {showComingSoonOverlay ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-background/50 p-4 backdrop-blur-md backdrop-saturate-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-coming-soon-title"
        >
          <div className="relative max-w-md rounded-[2rem] border border-border/60 bg-card/95 px-8 py-10 text-center shadow-2xl shadow-primary/5 ring-1 ring-primary/10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("shop.soon")}
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </p>
            <h2
              id="shop-coming-soon-title"
              className="mt-3 font-serif text-2xl leading-snug text-foreground md:text-3xl"
            >
              {comingSoonTitle}
            </h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {comingSoonBody}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-8 rounded-full px-6"
              onClick={dismissComingSoon}
            >
              {t("shop.comingSoon.dismiss")}
            </Button>
          </div>
        </div>
      ) : null}

      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img
          src={heroSrc}
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-start justify-end px-6 pb-12">
          <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("shop.title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t("shop.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {products.map((p) => (
            <article key={p.id} className="group">
              <div className="aspect-square overflow-hidden rounded-3xl bg-[oklch(0.92_0.025_75)]">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={900}
                  height={900}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.tag}
                  </p>
                  <p className="mt-0.5 font-serif text-lg text-foreground">{p.name}</p>
                </div>
                <p className="font-serif text-lg text-primary">{p.price}</p>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-full border border-border bg-card py-3 text-xs font-medium uppercase tracking-widest text-foreground/80 transition hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  addProduct(p);
                  toast.success(t("shop.added"), {
                    action: {
                      label: t("cart.title"),
                      onClick: () => router.navigate({ to: "/cart" }),
                    },
                  });
                }}
              >
                {t("shop.addToCart")}
              </button>
            </article>
          ))}
        </div>
        <p className="mt-12 text-center text-xs uppercase tracking-widest text-muted-foreground">
          {t("shop.soon")}
        </p>
      </section>
    </div>
  );
}
