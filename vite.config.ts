// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Vercel: Nitro emits the serverless output Vercel expects. Cloudflare's Vite plugin targets
// Workers and is incompatible with that pipeline (root URL 404 on Vercel without Nitro).
// Vercel sets `VERCEL` during build and runtime (usually `1`; some tooling uses other truthy values).
//
// Build outputs:
// - VERCEL set: `.vercel/output/` (Nitro). There is NO `dist/server/` — do not point Vercel
//   "Output Directory" at `dist`; leave framework detection / default so Nitro output is used.
// - VERCEL unset: `dist/client/` + `dist/server/index.js` (TanStack SSR). Some tooling still
//   resolves `dist/server/server.js`; `npm run build` runs `scripts/sync-dist-server-entry.mjs`
//   to copy `index.js` → `server.js` when needed.
const onVercel = Boolean(process.env.VERCEL);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  cloudflare: onVercel ? false : undefined,
  plugins: onVercel ? [nitro({ preset: "vercel" })] : [],
});
