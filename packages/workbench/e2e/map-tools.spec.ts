/**
 * Map tools (M3) — Node-context scenarios for the transcript importer and
 * DSL code generation, including the full round-trip: imported graph →
 * generated DSL → author CLI compile → graphFromConfig → same graph.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { importTranscript } from '../../map/src/importer';
import { graphToDsl } from '../../map/src/codegen';
import { graphFromConfig } from '../../map/src/adapter';

const packagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const authorBin = join(packagesDir, 'author', 'bin', 'textplus-author.mjs');

const WALK = `CROSSROADS
A dusty crossroads under a pale sky.

[Score: 0  Moves: 0]

> go north
OLD MILL
The mill's sails turn slowly.

> enter mill
Inside, gears grind in the dark.
`;

test.describe('map tools', () => {
  test.beforeAll(() => {
    if (!existsSync(join(packagesDir, 'author', 'dist', 'cli.mjs'))) {
      execSync('npm run build', { cwd: join(packagesDir, 'author'), stdio: 'ignore' });
    }
  });

  test('importTranscript builds rooms and connections from a play transcript', () => {
    const graph = importTranscript(WALK);
    expect(graph.startId).toBe('crossroads');
    expect(graph.nodes.map((node) => node.id)).toEqual(['crossroads', 'old-mill', 'step-1']);
    expect(graph.nodes[1].title).toBe('OLD MILL');
    expect(graph.nodes[2].title).toBe('Enter mill');
    expect(graph.edges).toEqual([
      { from: 'crossroads', to: 'old-mill' },
      { from: 'old-mill', to: 'step-1' },
    ]);
    expect(() => importTranscript('   \n')).toThrow('no rooms or commands');
  });

  test('graphToDsl output compiles and round-trips through graphFromConfig', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'textplus-map-'));
    try {
      const graph = importTranscript(WALK);
      const dsl = graphToDsl(graph);
      expect(dsl).toContain('title: CROSSROADS');
      expect(dsl).toContain(':: crossroads [start]');
      expect(dsl).toContain('-> To OLD MILL => old-mill');

      const dslFile = join(workDir, 'map.tp.txt');
      const reportFile = join(workDir, 'report.json');
      writeFileSync(dslFile, dsl, 'utf8');
      const output = execFileSync(
        'node',
        [authorBin, 'compile', dslFile, '--out', reportFile],
        { encoding: 'utf8' },
      );
      expect(output).toContain('✅ DSL compilation successful');
      expect(output).toContain('Situations: 3');

      const report = JSON.parse(readFileSync(reportFile, 'utf8'));
      expect(report.success).toBe(true);
      const roundTripped = graphFromConfig(report.config);
      expect(roundTripped.startId).toBe(graph.startId);
      expect(roundTripped.nodes.map((node) => node.id).sort()).toEqual(
        graph.nodes.map((node) => node.id).sort(),
      );
      expect(roundTripped.edges).toEqual(graph.edges);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
