const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const API_BASE_URL = trimSlash(
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
);

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";
export const MAIZE_API_BASE_URL =
  import.meta.env.VITE_MAIZE_API_BASE_URL?.trim() || "http://127.0.0.1:8001";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_URL.includes("YOUR_PROJECT"),
);
