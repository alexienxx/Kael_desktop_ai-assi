import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    ...(mode === "desktop-local" ? [] : [sparkPlugin() as PluginOption]),
  ],
  resolve: {
    alias: {
      ...(mode === "desktop-local" ? {
        '@github/spark/hooks': resolve(projectRoot, 'src/local/browserState.ts'),
        '@github/spark/spark': resolve(projectRoot, 'src/local/session.ts'),
      } : {}),
      '@': resolve(projectRoot, 'src')
    }
  },
}));
