// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001", // Certifique-se que seu backend está rodando nesta porta
        changeOrigin: true,
        secure: false,
      },
    },
  },
});