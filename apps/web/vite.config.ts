import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws/alerts": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/ws/live": {
        target: "ws://localhost:3001",
        ws: true,
      },
      "/ws/gamification": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
