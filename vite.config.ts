import { defineConfig } from "vite"; 
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: process.env.NODE_ENV === "development" ? {
  "/api": {
    target: "https://steve-airways-production.up.railway.app",
    changeOrigin: true,
    secure: false,
    // ne pas réécrire le chemin si ton backend a les routes avec /api
    // rewrite: (path) => path.replace(/^\/api/, ""),
    ws: true,
  },
} : undefined,

  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: "0.0.0.0",
  },
});
