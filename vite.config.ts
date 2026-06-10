import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      // "prompt" en lugar de "autoUpdate":
      // El nuevo SW se instala en background pero NO toma control hasta
      // que el usuario confirme. Así nunca rompemos una sesión activa.
      registerType: "prompt",

      // Expone el hook useRegisterSW en el cliente
      injectRegister: "auto",

      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],

      workbox: {
        // CRÍTICO: index.html nunca se cachea agresivamente.
        // NetworkFirst = intenta la red primero; si falla, usa caché.
        // Así el navegador SIEMPRE sabe si hay una versión nueva.
        navigateFallbackDenylist: [],
        runtimeCaching: [
          {
            // El HTML principal: red primero, caché como fallback offline
            urlPattern: /^https:\/\/[^/]+\/$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 60 * 24 }, // 1 día max
            },
          },
          {
            // Assets estáticos (JS, CSS, fuentes): CacheFirst con revalidación
            urlPattern: /\.(?:js|css|woff2?|ttf|otf)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Imágenes: CacheFirst (cambian poco)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Supabase API: NetworkOnly (datos siempre frescos, nunca cacheados)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },

      manifest: {
        name: "Papa&Son",
        short_name: "Papa&Son",
        description: "El auténtico sabor criollo en Maturín.",
        theme_color: "#1a1410",
        background_color: "#1a1410",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});