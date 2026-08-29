/**
 * Server-side Supabase client for public catalogue/content reads.
 *
 * This deliberately uses the public anon key, never a service-role key. Public
 * tables are protected by their own RLS read policies in the `hiplastics`
 * schema, so catalogue pages can still render when the optional server-only
 * service-role environment variables are not present in a deployment.
 */
import { createClient } from "@supabase/supabase-js";

const HIPLASTICS_SCHEMA = "hiplastics";

export function getPublicClient() {
  const url = process.env.HIPLASTICS_SUPABASE_URL || process.env.VITE_HIPLASTICS_SUPABASE_URL;
  const key = process.env.HIPLASTICS_SUPABASE_ANON_KEY || process.env.VITE_HIPLASTICS_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Public Supabase configuration is missing. Set HIPLASTICS_SUPABASE_URL and VITE_HIPLASTICS_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(url, key, {
    db: { schema: HIPLASTICS_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
