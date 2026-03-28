import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

/** @returns {import('@supabase/supabase-js').SupabaseClient | null} */
export function getSupabase() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}
