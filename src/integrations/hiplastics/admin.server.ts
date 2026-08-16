/**
 * Server-only admin Supabase client (service role).
 * Never import from client-reachable modules — always inside a server fn handler.
 */
import { createClient } from "@supabase/supabase-js";

/** All Hiplastics tables live in this dedicated PostgreSQL schema (never `public`). */
export const HIPLASTICS_SCHEMA = "hiplastics";


export function getAdminClient() {
  const url = process.env.HIPLASTICS_SUPABASE_URL;
  const key = process.env.HIPLASTICS_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "HIPLASTICS_SUPABASE_URL and HIPLASTICS_SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createClient(url, key, {
    // Hiplastics lives in its own PostgreSQL schema so it can share a
    // Supabase project with other apps without touching `public`.
    db: { schema: HIPLASTICS_SCHEMA },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

