import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

import { devApiMiddleware } from "./vite-dev-api";

// React SPA + TanStack Router (file routes). Server-only work runs on Vercel `/api/*`
// and is mirrored in dev via `devApiMiddleware`.
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routeTreeFileFooter: [
        "",
        "import type { getRouter } from './router.tsx'",
        "",
        "declare module '@tanstack/react-router' {",
        "  interface Register {",
        "    router: Awaited<ReturnType<typeof getRouter>>",
        "  }",
        "}",
      ],
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    {
      name: "dev-api-routes",
      configureServer(server) {
        server.middlewares.use(devApiMiddleware());
      },
    },
  ],
});
