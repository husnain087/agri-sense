function configuredUrl(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const MAIZE_API_URL =
  configuredUrl(import.meta.env.VITE_MAIZE_API_URL) ||
  "https://agrisense-maize.fastapicloud.dev/predict/maize";
export const WHEAT_API_URL =
  configuredUrl(import.meta.env.VITE_WHEAT_API_URL) ||
  "https://agrisenseai-backend.fastapicloud.dev/predict";
export const CROP_IDENTIFIER_API_URL = configuredUrl(
  import.meta.env.VITE_CROP_IDENTIFIER_API_URL,
) || "https://agrisense-crop-identifier-api.fastapicloud.dev/predict/crop";

export const MAIZE_API_HEALTH_URL = configuredUrl(
  import.meta.env.VITE_MAIZE_API_HEALTH_URL,
) || "https://agrisense-maize.fastapicloud.dev/health";
export const WHEAT_API_HEALTH_URL = configuredUrl(
  import.meta.env.VITE_WHEAT_API_HEALTH_URL,
) || "https://agrisenseai-backend.fastapicloud.dev/health";
export const CROP_IDENTIFIER_API_HEALTH_URL = configuredUrl(
  import.meta.env.VITE_CROP_IDENTIFIER_API_HEALTH_URL,
) || "https://agrisense-crop-identifier-api.fastapicloud.dev/health";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_URL.includes("YOUR_PROJECT"),
);
