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
        host: "0.0.0.0", // important si tu veux tester en local sur réseau
        proxy: {
            "/api": {
                target: "http://localhost:3003",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ""),
                ws: true,
                configure: (proxy) => {
                    proxy.on("error", (err) => {
                        console.error("Proxy error:", err);
                    });
                    proxy.on("proxyReq", (proxyReq) => {
                        console.log("Proxy request to:", proxyReq.path);
                    });
                },
            },
        },
    },
    preview: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000, // Render fournit PORT
        host: "0.0.0.0", // indispensable pour Render
    },
});
