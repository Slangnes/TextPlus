import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@textplus/core': resolve(__dirname, '../core/dist/index.mjs'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'hello-world': resolve(__dirname, 'hello-world/index.html'),
        'detective-case': resolve(__dirname, 'detective-case/index.html'),
        'memory-keeper': resolve(__dirname, 'memory-keeper/index.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['@textplus/core'],
  },
  server: {
    port: 5174,
    open: '/index.html',
    host: true,
  },
});
