import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts')
      },
      name: 'TextPlusConvert',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    // Node builtins and workspace siblings stay real imports (the CLI runs
    // in Node; --check resolves @textplus/author from its built package).
    rollupOptions: {
      external: [/^node:/, /^@textplus\//]
    },
    sourcemap: true
  }
});
