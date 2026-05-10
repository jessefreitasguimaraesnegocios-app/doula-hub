import imgSwaddle from "@/assets/shop/product-swaddle.png";
import imgTea from "@/assets/shop/product-tea.png";
import imgTeether from "@/assets/shop/product-teether.png";
import imgBellyOil from "@/assets/shop/product-belly-oil.png";
import imgBalm from "@/assets/shop/product-balm.png";
import imgRobe from "@/assets/shop/product-robe.png";

export type ShopProduct = {
  id: string;
  name: string;
  price: string;
  priceCents: number;
  tag: string;
  image: string;
};

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  { id: "swaddle", name: "Organic Muslin Swaddle", price: "$28", priceCents: 2800, tag: "Newborn", image: imgSwaddle },
  { id: "tea", name: "Postpartum Recovery Tea", price: "$18", priceCents: 1800, tag: "Mama", image: imgTea },
  { id: "teether", name: "Wooden Teether Ring", price: "$14", priceCents: 1400, tag: "Baby", image: imgTeether },
  { id: "belly-oil", name: "Belly Oil — Jasmine & Calendula", price: "$32", priceCents: 3200, tag: "Pregnancy", image: imgBellyOil },
  { id: "balm", name: "Nursing Balm", price: "$22", priceCents: 2200, tag: "Mama", image: imgBalm },
  { id: "robe", name: "Linen Birth Robe", price: "$78", priceCents: 7800, tag: "Birth", image: imgRobe },
];
