import { createStart, createMiddleware } from "@tanstack/react-start";

import i18n, { ensureI18nInitialized } from "./i18n";
import { renderErrorPage } from "./lib/error-page";
import { resolveLangForRequest } from "./lib/i18n-locale";

/** Load resources then set language per request so SSR matches cookie / Accept-Language. */
const i18nRequestMiddleware = createMiddleware().server(async ({ next, request }) => {
  await ensureI18nInitialized();
  try {
    const lng = request instanceof Request ? resolveLangForRequest(request) : "en";
    await i18n.changeLanguage(lng);
  } catch (e) {
    console.error("[i18n middleware] failed to resolve language, falling back to en", e);
    try {
      await i18n.changeLanguage("en");
    } catch {
      /* ignore */
    }
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [i18nRequestMiddleware, errorMiddleware],
}));
