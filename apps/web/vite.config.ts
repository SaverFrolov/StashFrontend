import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Stash — universal personal inbox",
        short_name: "Stash",
        description: "Capture links, notes, files and voice notes into one personal store.",
        lang: "ru",
        display: "standalone",
        start_url: "/inbox",
        scope: "/",
        background_color: "#FAFAF9",
        theme_color: "#0E7C66",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        share_target: {
          action: "/capture",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              { name: "files", accept: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "audio/*", "image/*", "text/plain"] },
            ],
          },
        },
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: { port: 5173 },
});
