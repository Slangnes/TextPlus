import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      // Alias to package sources (not dist) so editing core/author
      // hot-reloads the workbench without a rebuild step.
      '@textplus/core': resolve(__dirname, '../core/src/index.ts'),
      '@textplus/author': resolve(__dirname, '../author/src/index.ts'),
      '@textplus/map': resolve(__dirname, '../map/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // monaco-editor is a single large chunk; that's expected.
    chunkSizeWarningLimit: 4500,
  },
  server: {
    port: 5175,
    open: '/index.html',
    host: true,
  },
});
