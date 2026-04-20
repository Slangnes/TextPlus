import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TextPlus',
      fileName: (format) => `textplus.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  resolve: {
    alias: {
      '@textplus/core': resolve(__dirname, '../core/src'),
      '@textplus/author': resolve(__dirname, '../author/src'),
      '@textplus/map': resolve(__dirname, '../map/src'),
      '@textplus/convert': resolve(__dirname, '../convert/src')
    }
  }
});
