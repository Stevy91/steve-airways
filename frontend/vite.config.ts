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
        strictPort: true,
        proxy: {
            "/api": {
                target: "http://localhost:3009",
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
        port: 3001,
        strictPort: true,
    },
});
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   base: "/",
//   plugins: [react()],
//   server: {
//     // Pour Vite, utilisez cette approche pour le routing SPA
//   },
//   build: {
//     outDir: "dist",
//   },
// });




// <IfModule mod_rewrite.c>
//   RewriteEngine On
//   RewriteBase /
//   RewriteRule ^index\.html$ - [L]
//   RewriteCond %{REQUEST_FILENAME} !-f
//   RewriteCond %{REQUEST_FILENAME} !-d
//   RewriteRule . /index.html [L]
// </IfModule>