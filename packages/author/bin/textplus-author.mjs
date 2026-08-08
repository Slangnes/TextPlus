#!/usr/bin/env node
// Thin launcher for the built CLI (dist/cli.mjs). Kept as plain JS so the bin
// works without a TypeScript loader; the real logic lives in src/cli.ts.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.mjs');
if (!existsSync(dist)) {
  console.error('textplus-author: dist/cli.mjs not found — run "npm run build" first.');
  process.exit(1);
}

const { runCli } = await import(pathToFileURL(dist).href);
process.exit(await runCli(process.argv.slice(2)));
