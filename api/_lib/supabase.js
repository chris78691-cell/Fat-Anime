import { createClient } from "@supabase/supabase-js";

// Server-side client only — the service key must never reach the browser.
let client = null;

export function supabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY not configured");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
