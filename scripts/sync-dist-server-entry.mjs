/**
 * TanStack Start's Vite preview plugin imports `dist/server/server.js`, but the SSR
 * bundle is emitted as `index.js` (or sometimes `index.mjs`). Copy when missing.
 * On Vercel with Nitro (`VERCEL=1`), there is no `dist/server/` — this is a no-op.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "dist", "server");
const server = join(dir, "server.js");
const indexJs = join(dir, "index.js");
const indexMjs = join(dir, "index.mjs");

if (existsSync(server)) {
  process.exit(0);
}

if (existsSync(indexJs)) {
  copyFileSync(indexJs, server);
  console.log("[sync-dist-server-entry] wrote dist/server/server.js (copy of index.js)");
  process.exit(0);
}

if (existsSync(indexMjs)) {
  copyFileSync(indexMjs, server);
  console.log("[sync-dist-server-entry] wrote dist/server/server.js (copy of index.mjs)");
  process.exit(0);
}

if (existsSync(join(process.cwd(), ".vercel", "output"))) {
  console.warn(
    "[sync-dist-server-entry] Build is Nitro-only (.vercel/output). `vite preview` needs a full dist/server build.",
  );
  console.warn(
    "[sync-dist-server-entry] Run: npm run build:preview   (build without VERCEL, then npm run preview)",
  );
} else if (!existsSync(dir)) {
  console.warn("[sync-dist-server-entry] Missing dist/server/. Run npm run build or npm run build:preview first.");
}
