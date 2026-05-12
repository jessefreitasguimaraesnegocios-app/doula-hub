/**
 * Some runtimes / adapters still resolve `dist/server/server.js`, while Vite emits
 * `dist/server/index.js` for the TanStack Start server bundle. Copy when missing.
 * On Vercel with Nitro (`VERCEL=1`), there is no `dist/server` — this is a no-op.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "dist", "server");
const index = join(dir, "index.js");
const server = join(dir, "server.js");

if (existsSync(index) && !existsSync(server)) {
  copyFileSync(index, server);
  console.log("[sync-dist-server-entry] wrote dist/server/server.js (copy of index.js)");
}
