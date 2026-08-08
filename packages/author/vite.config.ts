import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts')
      },
      name: 'TextPlusAuthor',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`
    },
    // Node builtins stay real imports (the CLI and createScaffold run in
    // Node); without this vite swaps in browser stubs that throw at runtime.
    rollupOptions: {
      external: [/^node:/]
    },
    sourcemap: true
  }
});
