import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      // Force deduplication of React to prevent "useContext returns null" errors
      react: 'react',
      'react-dom': 'react-dom',
      'monaco-editor/esm/vs/editor/editor.api.js': fileURLToPath(new URL('../node_modules/monaco-editor/esm/vs/editor/editor.api.js', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    host: true,
  },
});
