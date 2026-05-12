/**
 * Production-like SSR bundle under dist/server/ (required by `vite preview`).
 * Strips VERCEL so Nitro does not replace the output with .vercel/output only.
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env };
delete env.VERCEL;

const r = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(r.status === null ? 1 : r.status);
