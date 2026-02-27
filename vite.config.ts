import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-redux") ||
            id.includes("node_modules/@reduxjs/toolkit")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("node_modules/@tiptap/") ||
            id.includes("prosemirror")
          ) {
            return "vendor-tiptap";
          }

          if (id.includes("node_modules/@fullcalendar/")) {
            return "vendor-calendar";
          }

          if (id.includes("node_modules/firebase/")) {
            return "vendor-firebase";
          }

          if (
            id.includes("node_modules/react-force-graph") ||
            id.includes("node_modules/react-force-graph-2d")
          ) {
            return "vendor-graph";
          }

          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/remark-gfm")
          ) {
            return "vendor-markdown";
          }

          if (
            id.includes("node_modules/@excalidraw/") ||
            id.includes("node_modules/roughjs") ||
            id.includes("node_modules/browser-fs-access") ||
            id.includes("node_modules/mermaid") ||
            id.includes("node_modules/katex") ||
            id.includes("node_modules/@fortawesome/")
          ) {
            return "vendor-excalidraw";
          }

          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/radix-ui") ||
            id.includes("node_modules/lucide-react")
          ) {
            return "vendor-ui";
          }
        },
      },
    },
  },
});
