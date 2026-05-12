import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nextProvider } from "react-i18next";
import i18n, { ensureI18nInitialized } from "../i18n";
import { normalizeHtmlLang } from "@/lib/i18n-locale";
import { resetDocumentScrollLocks } from "@/lib/document-scroll";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { I18nClientLanguageSync } from "@/components/I18nClientLanguageSync";
import { SiteCmsThemeSync } from "@/components/SiteCmsThemeSync";
import { SupabaseSiteBootstrap } from "@/components/SupabaseSiteBootstrap";
import { CartProvider } from "@/context/cart-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    await ensureI18nInitialized();
    return {};
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "All Things Babies — Doula care for every kind of family" },
      {
        name: "description",
        content:
          "Compassionate doula care for pregnancy, birth, and the postpartum journey. Certified, inclusive, evidence-based.",
      },
      { name: "author", content: "All Things Babies" },
      { property: "og:title", content: "All Things Babies — Doula care, with heart" },
      {
        property: "og:description",
        content: "Continuous doula support through pregnancy, birth, and beyond.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@allthingsbabies" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const htmlLang = normalizeHtmlLang(i18n.resolvedLanguage ?? i18n.language);
  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /** After client navigation, strip stale body scroll locks (e.g. /shop overlay) unless we're on /shop. */
  useEffect(() => {
    queueMicrotask(() => {
      if (pathname !== "/shop") {
        resetDocumentScrollLocks();
      }
    });
  }, [pathname]);

  /** bfcache restore can resurrect a page with overflow:hidden still on <body>. */
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetDocumentScrollLocks();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <CartProvider>
          <I18nClientLanguageSync />
          <SupabaseSiteBootstrap />
          <SiteCmsThemeSync />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="relative isolate flex-1">
              <Outlet />
            </main>
            <Footer />
          </div>
          {/* Sonner usa z-index muito alto; sem isto o contentor pode roubar cliques quando não há toasts. */}
          <div className="pointer-events-none">
            {/* top-center avoids stacking over bottom-right CTAs (booking, checkout) */}
            <Toaster position="top-center" style={{ zIndex: 60 }} />
          </div>
        </CartProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
