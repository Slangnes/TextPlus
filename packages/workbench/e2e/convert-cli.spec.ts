/**
 * Convert CLI (M4) — Node-context scenarios: linear conversion, branching
 * multi-transcript merge, --check compilation through @textplus/author.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { ZIL_FIXTURE } from './helpers';

const GATEHOUSE_ZIL = `"Gatehouse area"

<ROOM GATE-HOUSE
      (LOC ROOMS)
      (DESC "Gate House")
      (LDESC "Iron bars shadow the flagstones.")
      (NORTH TO INNER-COURT IF IRON-GATE IS OPEN)
      (SOUTH TO INNER-COURT IF ALARM-RAISED)
      (EAST TO CHAPEL-GARDEN)>

<ROOM INNER-COURT
      (LOC ROOMS)
      (DESC "Inner Court")
      (LDESC "A square of trampled grass.")
      (SOUTH TO GATE-HOUSE)>

<GLOBAL WATCH-COUNT 3>
<GLOBAL HAS-TORCH <>>
<GLOBAL BANNER-TEXT "For the realm">
<GLOBAL GUARD-TABLE <ITABLE 5>>
`;

const packagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const convertBin = join(packagesDir, 'convert', 'bin', 'textplus-convert.mjs');

const WALK_ONE = `CROSSROADS
A dusty crossroads under a pale sky.

> go north
OLD MILL
The mill's sails turn slowly.

> enter mill
Inside, gears grind in the dark.
`;

const WALK_TWO = `CROSSROADS
A dusty crossroads under a pale sky.

> go south
RIVER BANK
Reeds whisper along the water.
`;

interface CliResult {
  output: string;
  status: number;
}

/** Runs the CLI and attaches command + exit code + output to the trace. */
async function run(args: string[]): Promise<CliResult> {
  let result: CliResult;
  try {
    result = { output: execFileSync('node', [convertBin, ...args], { encoding: 'utf8' }), status: 0 };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    result = { output: `${failed.stdout ?? ''}${failed.stderr ?? ''}`, status: failed.status ?? -1 };
  }
  await test.info().attach(`$ textplus-convert ${args.join(' ')}`, {
    body: `exit ${result.status}\n\n${result.output}`,
    contentType: 'text/plain',
  });
  return result;
}

test.describe('convert CLI', () => {
  let workDir: string;

  test.beforeAll(() => {
    for (const pkg of ['author', 'convert']) {
      if (!existsSync(join(packagesDir, pkg, 'dist', 'cli.mjs'))) {
        execSync('npm run build', { cwd: join(packagesDir, pkg), stdio: 'ignore' });
      }
    }
  });

  test.beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'textplus-convert-'));
    writeFileSync(join(workDir, 'one.txt'), WALK_ONE, 'utf8');
    writeFileSync(join(workDir, 'two.txt'), WALK_TWO, 'utf8');
  });

  test.afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('a single transcript converts linearly and compiles under --check', async () => {
    const result = await run([join(workDir, 'one.txt'), '--check']);
    expect(result.status).toBe(0);
    expect(result.output).toContain(':: crossroads [start]');
    expect(result.output).toContain('-> Go north => old-mill');
    expect(result.output).toContain('✅ DSL compilation successful');
    expect(result.output).toContain('Situations: 3');
  });

  test('merging two walks yields a branching story that compiles', async () => {
    const result = await run([join(workDir, 'one.txt'), join(workDir, 'two.txt'), '--check']);
    expect(result.status).toBe(0);
    // The shared room gained both continuations — the branch point.
    expect(result.output).toContain('-> Go north => old-mill');
    expect(result.output).toContain('-> Go south => river-bank');
    expect(result.output).toContain('✅ DSL compilation successful');
    expect(result.output).toContain('Situations: 4');
  });

  test('--out writes the DSL file with a title override', async () => {
    const out = join(workDir, 'story.tp.txt');
    const result = await run([
      join(workDir, 'one.txt'),
      join(workDir, 'two.txt'),
      '--title',
      'Forked Paths',
      '--out',
      out,
    ]);
    expect(result.status).toBe(0);
    expect(result.output).toContain(`DSL written to ${out}`);
    await test.info().attach('story.tp.txt', { path: out, contentType: 'text/plain' });
    const dsl = readFileSync(out, 'utf8');
    expect(dsl).toContain('title: Forked Paths');
    expect(dsl).toContain('-> Go south => river-bank');
  });

  test('ZIL source deconstructs directly — no transcript needed', async () => {
    writeFileSync(join(workDir, 'chapel.zil'), ZIL_FIXTURE, 'utf8');
    const result = await run([join(workDir, 'chapel.zil'), '--check']);
    expect(result.status).toBe(0);
    expect(result.output).toContain(':: chapel-garden [start]');
    expect(result.output).toContain('Roses climb the low stone wall'); // LDESC prose
    expect(result.output).toContain('Candlelight pools beneath the stone arches'); // M-LOOK prose
    expect(result.output).not.toContain('A hush falls'); // other branches stay out
    expect(result.output).toContain('-> Go north => old-chapel');
    expect(result.output).toContain('✅ DSL compilation successful');
    expect(result.output).toContain('Situations: 2');
    // Every ZIL run carries its honesty report.
    expect(result.output).toContain('Deconstruction report:');
    expect(result.output).toContain('SORRY (blocked) exits');
  });

  test('conditional ZIL exits become gated links over synthesized qualities', async () => {
    writeFileSync(join(workDir, 'gatehouse.zil'), GATEHOUSE_ZIL, 'utf8');
    const result = await run([join(workDir, 'gatehouse.zil'), '--check']);
    expect(result.status).toBe(0);
    // Door gate (IF X IS OPEN) and flag gate (IF FLAG) both surface.
    expect(result.output).toContain('quality iron-gate-open boolean = false');
    expect(result.output).toContain('quality alarm-raised boolean = false');
    expect(result.output).toContain('-> Go north => inner-court ? iron-gate-open');
    expect(result.output).toContain('-> Go south => inner-court ? alarm-raised');
    expect(result.output).toContain('door gate: "IRON-GATE IS OPEN"');
    expect(result.output).toContain('exits target rooms outside the given files'); // CHAPEL-GARDEN
    expect(result.output).toContain('✅ DSL compilation successful');
  });

  test('multiple ZIL files become worlds with cross-file world-switch links', async () => {
    writeFileSync(join(workDir, 'chapel.zil'), ZIL_FIXTURE, 'utf8');
    writeFileSync(join(workDir, 'gatehouse.zil'), GATEHOUSE_ZIL, 'utf8');
    const result = await run([
      join(workDir, 'chapel.zil'),
      join(workDir, 'gatehouse.zil'),
      '--check',
    ]);
    expect(result.status).toBe(0);
    expect(result.output).toContain('world chapel');
    expect(result.output).toContain('world gatehouse');
    expect(result.output).toContain(':: chapel:chapel-garden [start]');
    expect(result.output).toContain(':: gatehouse:gate-house');
    // The cross-file exit resolved into a world-switch link.
    expect(result.output).toContain('-> Go east => chapel:chapel-garden');
    expect(result.output).toContain('✅ DSL compilation successful');
    expect(result.output).toContain('Situations: 4');
  });

  test('--globals extracts simple globals as qualities and reports the rest', async () => {
    writeFileSync(join(workDir, 'gatehouse.zil'), GATEHOUSE_ZIL, 'utf8');
    const result = await run([join(workDir, 'gatehouse.zil'), '--globals']);
    expect(result.status).toBe(0);
    expect(result.output).toContain('quality watch-count number = 3');
    expect(result.output).toContain('quality has-torch boolean = false');
    expect(result.output).toContain('quality banner-text string = For the realm');
    expect(result.output).toContain('1 table/complex globals'); // GUARD-TABLE
  });

  test('empty transcripts fail cleanly', async () => {
    writeFileSync(join(workDir, 'empty.txt'), '   \n', 'utf8');
    const result = await run([join(workDir, 'empty.txt')]);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Conversion failed');
  });

  test('no arguments prints usage and exits 2', async () => {
    const result = await run([]);
    expect(result.status).toBe(2);
    expect(result.output).toContain('Usage: textplus-convert');
  });
});
