import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import shopHero from "@/assets/shop-hero.jpg";
import { useCart } from "@/context/cart-context";
import { SHOP_PRODUCTS } from "@/data/shop-products";

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
  const { addProduct } = useCart();
  const router = useRouter();

  return (
    <div>
      <section className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <img src={shopHero} alt="" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-4xl flex-col items-start justify-end px-6 pb-12">
          <h1 className="font-serif text-5xl text-foreground md:text-6xl">{t("shop.title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t("shop.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {SHOP_PRODUCTS.map((p) => (
            <article key={p.id} className="group">
              <div className="aspect-square overflow-hidden rounded-3xl bg-[oklch(0.92_0.025_75)]">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={900}
                  height={900}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tag}</p>
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
