/**
 * Browser-side Supabase client for CUSTOMER authentication only.
 * Uses the public anon key — never the service role key (that stays in
 * admin.server.ts and is never imported from client-reachable code).
 *
 * Requires these PUBLIC env vars (safe to expose to the browser):
 *   VITE_HIPLASTICS_SUPABASE_URL
 *   VITE_HIPLASTICS_SUPABASE_ANON_KEY
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_HIPLASTICS_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_HIPLASTICS_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Don't throw at import time (breaks SSR build) — surface a clear runtime error instead.
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_HIPLASTICS_SUPABASE_URL / VITE_HIPLASTICS_SUPABASE_ANON_KEY — customer login will not work.",
  );
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  db: { schema: "hiplastics" },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "hiplastics-customer-auth",
  },
});
