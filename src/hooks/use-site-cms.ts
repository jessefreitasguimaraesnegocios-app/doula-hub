import { useMemo, useSyncExternalStore } from "react";
import {
  SITE_CMS_EVENT,
  SITE_CMS_STORAGE_KEY,
  parseSiteCmsJson,
  type SiteCmsV1,
} from "@/lib/site-cms";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(SITE_CMS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SITE_CMS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Raw localStorage value — referentially stable when unchanged (required by useSyncExternalStore). */
function getSnapshot(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SITE_CMS_STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

/** Live overrides from admin (client). SSR uses defaults until hydrate. */
export function useSiteCms(): SiteCmsV1 {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parseSiteCmsJson(raw || null), [raw]);
}
