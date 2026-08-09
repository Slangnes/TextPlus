/**
 * Map tools (M3) — Node-context scenarios for the transcript importer and
 * DSL code generation. The round-trip proves topology + tags survive:
 * graph → generated DSL → author CLI compile → graphFromConfig → the same
 * ids, edges, start, and tags (titles map to situation titles; prose is a
 * placeholder by design). Generated artifacts are attached to each trace.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { importTranscript } from '../../map/src/importer';
import { importZilRooms } from '../../map/src/zil';
import { graphToDsl } from '../../map/src/codegen';
import { graphFromConfig } from '../../map/src/adapter';
import type { StoryGraph } from '../../map/src/layout';

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

/** Compiles DSL via the author CLI, attaching DSL + report to the trace. */
async function compileDsl(workDir: string, dsl: string): Promise<{ output: string; report: any }> {
  const dslFile = join(workDir, 'map.tp.txt');
  const reportFile = join(workDir, 'report.json');
  writeFileSync(dslFile, dsl, 'utf8');
  const output = execFileSync('node', [authorBin, 'compile', dslFile, '--out', reportFile], {
    encoding: 'utf8',
  });
  await test.info().attach('map.tp.txt', { path: dslFile, contentType: 'text/plain' });
  await test.info().attach('report.json', { path: reportFile, contentType: 'application/json' });
  return { output, report: JSON.parse(readFileSync(reportFile, 'utf8')) };
}

test.describe('map tools', () => {
  let workDir: string;

  test.beforeAll(() => {
    if (!existsSync(join(packagesDir, 'author', 'dist', 'cli.mjs'))) {
      execSync('npm run build', { cwd: join(packagesDir, 'author'), stdio: 'ignore' });
    }
  });

  test.beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'textplus-map-'));
  });

  test.afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('importTranscript builds rooms and connections from a play transcript', async () => {
    const graph = importTranscript(WALK);
    await test.info().attach('graph.json', {
      body: JSON.stringify(graph, null, 2),
      contentType: 'application/json',
    });
    expect(graph.startId).toBe('crossroads');
    expect(graph.nodes.map((node) => node.id)).toEqual(['crossroads', 'old-mill', 'step-1']);
    expect(graph.nodes[1].title).toBe('OLD MILL');
    expect(graph.nodes[2].title).toBe('Enter mill');
    // Commands carry compass information onto the edges.
    expect(graph.edges).toEqual([
      { from: 'crossroads', to: 'old-mill', direction: 'north' },
      { from: 'old-mill', to: 'step-1', direction: 'in' },
    ]);
    expect(() => importTranscript('   \n')).toThrow('no rooms or commands');
  });

  test('graphToDsl output compiles and round-trips through graphFromConfig', async () => {
    const graph = importTranscript(WALK);
    const dsl = graphToDsl(graph);
    expect(dsl).toContain('title: CROSSROADS');
    expect(dsl).toContain(':: crossroads [start]');
    expect(dsl).toContain('-> Go north => old-mill'); // directional labels round-trip

    const { output, report } = await compileDsl(workDir, dsl);
    expect(output).toContain('✅ DSL compilation successful');
    expect(output).toContain('Situations: 3');
    expect(report.success).toBe(true);

    const roundTripped = graphFromConfig(report.config);
    expect(roundTripped.startId).toBe(graph.startId);
    expect(roundTripped.nodes.map((node) => node.id).sort()).toEqual(
      graph.nodes.map((node) => node.id).sort(),
    );
    expect(roundTripped.edges).toEqual(graph.edges);
  });

  test('importZilRooms recovers rooms and exits from ZIL source', async () => {
    const zil = `"Test area"

<ROOM TOWN-SQUARE
      (LOC ROOMS)
      (DESC "Town Square")
      (NORTH TO OLD-CHURCH)
      (EAST TO MARKET IF GATES-OPEN)
      (SW SORRY "The alley is blocked.")
      (WEST PER SECRET-DOOR-F)
      (FLAGS OUTSIDEBIT)>

<ROUTINE SECRET-DOOR-F () <RTRUE>>

<ROOM OLD-CHURCH
      (LOC ROOMS)
      (DESC "Old Church")
      (SOUTH TO TOWN-SQUARE)
      (DOWN TO CRYPT)>

<ROOM MARKET
      (LOC ROOMS)
      (NORTH TO ELSEWHERE-NOT-DEFINED)>
`;
    const graph = importZilRooms(zil);
    await test.info().attach('zil-graph.json', {
      body: JSON.stringify(graph, null, 2),
      contentType: 'application/json',
    });

    expect(graph.startId).toBe('town-square');
    expect(graph.nodes.map((node) => node.id)).toEqual(['town-square', 'old-church', 'market']);
    expect(graph.nodes[2].title).toBe('Market'); // no DESC — titled from the id
    expect(graph.edges).toEqual([
      { from: 'town-square', to: 'old-church', direction: 'north' }, // plain exit
      { from: 'town-square', to: 'market', direction: 'east' }, // conditional exit keeps its target
      { from: 'old-church', to: 'town-square', direction: 'south' },
      // SORRY/PER exits, the CRYPT exit (undefined room), and ELSEWHERE are dropped
    ]);
    expect(() => importZilRooms('<ROUTINE NOPE () <RTRUE>>')).toThrow('No <ROOM');

    // And the recovered graph feeds the same DSL pipeline as everything else.
    const { report } = await compileDsl(workDir, graphToDsl(graph));
    expect(report.success).toBe(true);
    expect(Object.keys(report.config.situations)).toHaveLength(3);
  });

  test('tags survive the round-trip, including a start node with extra tags', async () => {
    const graph: StoryGraph = {
      nodes: [
        { id: 'gate', title: 'The Gate', tags: ['dark'] },
        { id: 'hall', title: 'The Hall', tags: ['ending', 'dark'] },
      ],
      edges: [{ from: 'gate', to: 'hall' }],
      startId: 'gate',
    };
    const dsl = graphToDsl(graph);
    expect(dsl).toContain(':: gate [start, dark]');
    expect(dsl).toContain(':: hall [ending, dark]');

    const { report } = await compileDsl(workDir, dsl);
    expect(report.success).toBe(true);
    // The start tag must not be swallowed by tag mangling.
    expect(report.config.initialSituation).toBe('gate');
    expect(report.config.situations.gate.tags).toEqual(['start', 'dark']);
    expect(report.config.situations.hall.tags).toEqual(['ending', 'dark']);
  });
});
