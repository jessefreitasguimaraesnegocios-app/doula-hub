import { createStart, createMiddleware } from "@tanstack/react-start";

import i18n from "./i18n";
import { renderErrorPage } from "./lib/error-page";
import { resolveLangForRequest } from "./lib/i18n-locale";

/** Reset global i18n per request so SSR matches the incoming cookie / Accept-Language (avoids stale language between requests). */
const i18nRequestMiddleware = createMiddleware().server(async ({ next, request }) => {
  const lng = request ? resolveLangForRequest(request) : "en";
  await i18n.changeLanguage(lng);
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
