import type { ShopProduct } from "@/data/shop-products";
import { SHOP_PRODUCTS } from "@/data/shop-products";
import type { SiteCmsV1 } from "@/lib/site-cms";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type DoulaRow = {
  id: string;
  slug: string;
  kind: "founder" | "doula";
  display_order: number;
  use_i18n: boolean;
  name: string | null;
  role: string | null;
  bio: string | null;
  specs: unknown;
  langs: unknown;
  photo_url: string | null;
  schedule_url: string | null;
  stripe_account_id: string | null;
  published: boolean;
};

export type ShopProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  price_display: string;
  tag: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function mapShopRowToProduct(row: ShopProductRow): ShopProduct {
  const fallback = SHOP_PRODUCTS.find((p) => p.id === row.slug);
  return {
    id: row.slug,
    name: row.name,
    price: row.price_display || fallback?.price || "",
    priceCents: row.price_cents,
    tag: row.tag,
    image: row.image_url?.trim() || (fallback?.image as string) || "",
  };
}

export async function fetchSiteSettingsPayload(): Promise<unknown | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("site_settings")
    .select("payload")
    .eq("id", "main")
    .maybeSingle();
  if (error) {
    console.error("[supabase] site_settings", error);
    return null;
  }
  return data?.payload ?? null;
}

export async function upsertSiteSettingsPayload(
  payload: SiteCmsV1,
): Promise<{ error: Error | null }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { error: new Error("Supabase não configurado") };
  const { error } = await client
    .from("site_settings")
    .upsert({ id: "main", payload, updated_at: new Date().toISOString() }, { onConflict: "id" });
  return { error: error ? new Error(error.message) : null };
}

export async function fetchPublishedDoulas(): Promise<DoulaRow[] | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("doulas")
    .select(
      "id, slug, kind, display_order, use_i18n, name, role, bio, specs, langs, photo_url, schedule_url, stripe_account_id, published",
    )
    .eq("published", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[supabase] doulas", error);
    return null;
  }
  return (data ?? []) as DoulaRow[];
}

export async function fetchAllDoulasForAdmin(): Promise<DoulaRow[] | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("doulas")
    .select(
      "id, slug, kind, display_order, use_i18n, name, role, bio, specs, langs, photo_url, schedule_url, stripe_account_id, published",
    )
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[supabase] doulas admin", error);
    return null;
  }
  return (data ?? []) as DoulaRow[];
}

export async function updateDoulaStripeAccount(
  id: string,
  stripe_account_id: string,
): Promise<{ error: Error | null }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { error: new Error("Supabase não configurado") };
  const { error } = await client
    .from("doulas")
    .update({ stripe_account_id: stripe_account_id.trim() || null })
    .eq("id", id);
  return { error: error ? new Error(error.message) : null };
}

export async function updateDoulaPhotoUrl(
  id: string,
  photo_url: string,
): Promise<{ error: Error | null }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { error: new Error("Supabase não configurado") };
  const { error } = await client.from("doulas").update({ photo_url }).eq("id", id);
  return { error: error ? new Error(error.message) : null };
}

export async function uploadDoulaPhoto(
  file: File,
  slug: string,
): Promise<{ publicUrl: string | null; error: Error | null }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { publicUrl: null, error: new Error("Supabase não configurado") };
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${slug}/${Date.now()}-${safeName}`;
  const { error: upErr } = await client.storage
    .from("doulas")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { publicUrl: null, error: new Error(upErr.message) };
  const { data } = client.storage.from("doulas").getPublicUrl(path);
  const publicUrl = data.publicUrl;
  return { publicUrl: publicUrl || null, error: null };
}

/** Fotos do site / contratadas — bucket `doulas`, pasta `site/…` (mesmas permissões que fotos de equipa). */
export async function uploadSiteCmsAsset(
  file: File,
  folder: string,
): Promise<{ publicUrl: string | null; error: Error | null }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { publicUrl: null, error: new Error("Supabase não configurado") };
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "_").slice(0, 80) || "misc";
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `site/${safeFolder}/${Date.now()}-${safeName}`;
  const { error: upErr } = await client.storage
    .from("doulas")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { publicUrl: null, error: new Error(upErr.message) };
  const { data } = client.storage.from("doulas").getPublicUrl(path);
  return { publicUrl: data.publicUrl || null, error: null };
}

export type BookingRequestRow = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  pkg_key: string;
  pkg_label: string;
  doula_label: string;
  consult_date: string;
  consult_time: string;
  platform: string;
  meet_link: string | null;
  locale: string;
  intake: unknown;
  google_event_id: string | null;
  google_html_link: string | null;
  google_meet_link: string | null;
  google_sync_error: string | null;
  email_sent: boolean;
  email_error: string | null;
  /** Present after migration `20260515120000_booking_submission_phase`; omitted rows treated as completed. */
  submission_phase?: "schedule_saved" | "completed" | null;
};

export async function fetchBookingRequestsForAdmin(): Promise<BookingRequestRow[] | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("booking_requests")
    .select(
      "id, created_at, full_name, email, phone, pkg_key, pkg_label, doula_label, consult_date, consult_time, platform, meet_link, locale, intake, google_event_id, google_html_link, google_meet_link, google_sync_error, email_sent, email_error, submission_phase",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[supabase] booking_requests", error);
    return null;
  }
  return (data ?? []) as BookingRequestRow[];
}

export async function fetchActiveShopProducts(): Promise<ShopProduct[] | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("shop_products")
    .select(
      "id, slug, name, description, price_cents, price_display, tag, image_url, sort_order, active",
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[supabase] shop_products", error);
    return null;
  }
  const rows = (data ?? []) as ShopProductRow[];
  if (rows.length === 0) return null;
  return rows.map(mapShopRowToProduct);
}

export { asStringArray };
