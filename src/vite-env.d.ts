/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAIZE_API_URL?: string;
  readonly VITE_WHEAT_API_URL?: string;
  readonly VITE_CROP_IDENTIFIER_API_URL?: string;
  readonly VITE_MAIZE_API_HEALTH_URL?: string;
  readonly VITE_WHEAT_API_HEALTH_URL?: string;
  readonly VITE_CROP_IDENTIFIER_API_HEALTH_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
