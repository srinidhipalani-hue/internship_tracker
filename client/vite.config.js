import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // loadEnv reads client/.env* locally; on Vercel, secrets are in process.env during `vite build`
  const loaded = loadEnv(mode, process.cwd(), "");
  const url = (loaded.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (loaded.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    // Force these into the bundle so CI hosts that only set process.env still work reliably
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(anonKey),
    },
  };
});
