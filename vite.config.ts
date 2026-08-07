import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: null,
      },
      manifest: {
        name: "Simpla Invest",
        short_name: "Simpla",
        theme_color: "#1E3A8A",
        background_color: "#F8F9FA",
        display: "standalone",
        icons: [
          { src: "/diamond-icon-small.png", sizes: "192x192", type: "image/png" },
          { src: "/diamond-icon.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
