#!/usr/bin/env node
// `create-textplus-game <name> [dir]` — shortcut for `textplus-author scaffold`.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.mjs');
if (!existsSync(dist)) {
  console.error('create-textplus-game: dist/cli.mjs not found — run "npm run build" first.');
  process.exit(1);
}

const { runCli } = await import(pathToFileURL(dist).href);
process.exit(await runCli(['scaffold', ...process.argv.slice(2)]));
