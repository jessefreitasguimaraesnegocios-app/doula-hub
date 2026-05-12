/** Main marketing pages, same order as the header — used for footer prev/next + dots. */
export const SITE_MAIN_PAGES = [
  { to: "/", labelKey: "home" as const },
  { to: "/about", labelKey: "about" as const },
  { to: "/services", labelKey: "services" as const },
  { to: "/team", labelKey: "team" as const },
  { to: "/shop", labelKey: "shop" as const },
  { to: "/contact", labelKey: "contact" as const },
] as const;

export type SiteMainPageLabelKey = (typeof SITE_MAIN_PAGES)[number]["labelKey"];

export function getSiteMainPageIndex(pathname: string): number {
  const n = pathname.replace(/\/$/, "") || "/";
  return SITE_MAIN_PAGES.findIndex((p) => (p.to === "/" ? n === "/" : n === p.to));
}
