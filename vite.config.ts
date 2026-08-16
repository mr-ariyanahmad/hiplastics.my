// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Switch deploy target via env: DEPLOY_TARGET=vercel|cloudflare (Vercel sets VERCEL=1 automatically).
const deployTarget =
  process.env.DEPLOY_TARGET ?? (process.env.VERCEL ? "vercel" : "cloudflare");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  nitro: deployTarget === "vercel"
    ? { preset: "vercel" }
    : { preset: "cloudflare-module" },
});
