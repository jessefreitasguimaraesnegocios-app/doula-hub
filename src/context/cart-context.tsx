import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShopProduct } from "@/data/shop-products";

const STORAGE_KEY = "atb-shop-cart-v1";

export type CartLine = {
  id: string;
  name: string;
  tag: string;
  priceLabel: string;
  priceCents: number;
  imageSrc: string;
  qty: number;
};

function loadFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CartLine =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CartLine).id === "string" &&
        typeof (row as CartLine).qty === "number" &&
        typeof (row as CartLine).priceCents === "number",
    );
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* ignore quota / private mode */
  }
}

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  itemCount: number;
  subtotalCents: number;
  addProduct: (product: ShopProduct) => void;
  setQty: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(lines);
  }, [lines, hydrated]);

  const addProduct = useCallback((product: ShopProduct) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === product.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          tag: product.tag,
          priceLabel: product.price,
          priceCents: product.priceCents,
          imageSrc: product.image,
          qty: 1,
        },
      ];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const n = Math.floor(qty);
    if (n < 1) {
      setLines((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: n } : l)));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotalCents = useMemo(() => lines.reduce((s, l) => s + l.priceCents * l.qty, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      itemCount,
      subtotalCents,
      addProduct,
      setQty,
      removeLine,
      clear,
    }),
    [lines, hydrated, itemCount, subtotalCents, addProduct, setQty, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
