/**
 * Author CLI (M2 Phase 2D) — Node-context scenarios, following the pattern
 * conventions.spec.ts established. Verifies the surfaces a browser can't
 * reach: createScaffold, the workflow report formatters, and JSON output.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const authorDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'author');
const mainBin = join(authorDir, 'bin', 'textplus-author.mjs');
const createBin = join(authorDir, 'bin', 'create-textplus-game.mjs');

interface CliResult {
  output: string;
  status: number;
}

/** Runs the CLI and attaches command + exit code + output to the trace. */
async function run(bin: string, args: string[]): Promise<CliResult> {
  let result: CliResult;
  try {
    result = { output: execFileSync('node', [bin, ...args], { encoding: 'utf8' }), status: 0 };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    result = { output: `${failed.stdout ?? ''}${failed.stderr ?? ''}`, status: failed.status ?? -1 };
  }
  await test.info().attach(`$ ${basename(bin)} ${args.join(' ')}`, {
    body: `exit ${result.status}\n\n${result.output}`,
    contentType: 'text/plain',
  });
  return result;
}

test.describe('author CLI', () => {
  let workDir: string;

  test.beforeAll(() => {
    if (!existsSync(join(authorDir, 'dist', 'cli.mjs'))) {
      execSync('npm run build', { cwd: authorDir, stdio: 'ignore' });
    }
  });

  test.beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'textplus-cli-'));
  });

  test.afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('create-textplus-game scaffolds a starter that compiles with no issues', async () => {
    const scaffold = await run(createBin, ['My-Game', workDir]);
    expect(scaffold.status).toBe(0);
    expect(scaffold.output).toContain('Scaffolded "My-Game"');

    const gameFile = join(workDir, 'My-Game', 'game.tp.txt');
    expect(existsSync(gameFile)).toBe(true);
    expect(existsSync(join(workDir, 'My-Game', 'README.md'))).toBe(true);
    await test.info().attach('game.tp.txt', { path: gameFile, contentType: 'text/plain' });

    const compile = await run(mainBin, ['compile', gameFile]);
    expect(compile.status).toBe(0);
    expect(compile.output).toContain('✅ DSL compilation successful');
    expect(compile.output).toContain('Situations: 3');
    expect(compile.output).toContain('No issues detected');
  });

  test('compile --out writes the serialized workflow report', async () => {
    await run(createBin, ['ReportGame', workDir]);
    const out = join(workDir, 'report.json');
    const compile = await run(mainBin, [
      'compile',
      join(workDir, 'ReportGame', 'game.tp.txt'),
      '--out',
      out,
    ]);
    expect(compile.status).toBe(0);
    expect(compile.output).toContain(`Report written to ${out}`);
    await test.info().attach('report.json', { path: out, contentType: 'application/json' });

    const report = JSON.parse(readFileSync(out, 'utf8'));
    expect(report.success).toBe(true);
    expect(report.config.title).toBe('ReportGame');
    expect(report.config.initialSituation).toBe('start');
    expect(Array.isArray(report.diagnostics)).toBe(true);
    expect(report.errors).toEqual([]);
  });

  test('lint reports broken links and type mismatches with exit code 1', async () => {
    const badFile = join(workDir, 'bad.tp.txt');
    writeFileSync(
      badFile,
      `title: Bad

quality flag boolean = false

:: start [start]
Start
Flag waves.

-> Go => nowhere { flag += 1 }
`,
      'utf8',
    );

    const lint = await run(mainBin, ['lint', badFile]);
    expect(lint.status).toBe(1);
    expect(lint.output).toContain('❌');
    expect(lint.output).toContain('[broken-link]');
    expect(lint.output).toContain('[effect-type-mismatch]');
  });

  test('unknown commands print usage and exit 2', async () => {
    const result = await run(mainBin, ['frobnicate']);
    expect(result.status).toBe(2);
    expect(result.output).toContain('Usage: textplus-author');
  });

  test('missing files fail cleanly', async () => {
    const result = await run(mainBin, ['compile', join(workDir, 'does-not-exist.tp.txt')]);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Cannot read');
  });
});
