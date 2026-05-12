/**
 * Clears inline scroll-lock styles often left behind by modals, sheets, or the shop
 * «coming soon» overlay if a route unmounts without running its effect cleanup (SPA edge cases).
 */
export function resetDocumentScrollLocks(): void {
  if (typeof document === "undefined") return;
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("padding-right");
}
