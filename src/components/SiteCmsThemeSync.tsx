import { useLayoutEffect } from "react";
import { applySiteCmsTheme, getSiteCmsFromStorage, SITE_CMS_EVENT } from "@/lib/site-cms";

/** Applies CMS theme variables on load and whenever storage / admin updates. */
export function SiteCmsThemeSync() {
  useLayoutEffect(() => {
    const run = () => applySiteCmsTheme(getSiteCmsFromStorage());
    run();
    window.addEventListener(SITE_CMS_EVENT, run);
    window.addEventListener("storage", run);
    return () => {
      window.removeEventListener(SITE_CMS_EVENT, run);
      window.removeEventListener("storage", run);
    };
  }, []);

  return null;
}
