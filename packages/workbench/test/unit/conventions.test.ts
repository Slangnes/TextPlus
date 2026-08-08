/**
 * Project convention guard: no native browser popups.
 *
 * The workbench must use the shared modal utilities (src/modal.ts) instead of
 * window.alert / window.confirm / window.prompt, and confirmations must be
 * suppressible via settings. This test fails if a native popup call sneaks in.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const NATIVE_POPUP = /\b(?:window\s*\.\s*)?(?:alert|confirm|prompt)\s*\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('no-native-popups convention', () => {
  const files = sourceFiles(SRC_DIR);

  it('finds the workbench sources', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  files.forEach((file) => {
    it(`${file.split(/[\\/]/).slice(-1)[0]} avoids alert/confirm/prompt`, () => {
      const lines = readFileSync(file, 'utf8').split('\n');
      const offenders = lines
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => NATIVE_POPUP.test(line));
      expect(offenders).toEqual([]);
    });
  });
});
