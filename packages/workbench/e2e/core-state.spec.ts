/**
 * Core save/load semantics no app surface reaches yet: the DSL derives world
 * membership from `world:` id prefixes, so only a hand-written GameConfig can
 * re-home a situation (same id, new world) between a save and a load. A stale
 * perWorldPositions entry would misroute goToWorld forever; loadState keeps
 * an entry only while its situation still lives in that world.
 */

import { test, expect } from '@playwright/test';
import { createGame } from '../../core/src/index';
import type { GameConfig } from '../../core/src/index';

const storyWithFeedIn = (feedWorld: string): GameConfig => ({
  title: 'Re-homed Feed',
  initialSituation: 'desk',
  qualities: {},
  situations: {
    desk: { id: 'desk', title: 'The Desk', content: 'A humming office.', world: 'office' },
    feed: { id: 'feed', title: 'The Feed', content: 'Grainy monitors.', world: feedWorld },
    hub: { id: 'hub', title: 'The Hub', content: 'Banks of switches.', world: 'cams' },
  },
  worlds: {
    office: { initialSituation: 'desk' },
    cams: { initialSituation: 'hub' },
  },
});

test.describe('core state', () => {
  test('loadState drops perWorldPositions entries whose situation left the world', async () => {
    const before = createGame(storyWithFeedIn('cams'));
    before.goToSituation('feed'); // cams resume point becomes `feed`
    before.goToSituation('desk');
    const save = before.getSaveState();
    expect(save.perWorldPositions).toEqual({ office: 'desk', cams: 'feed' });

    // Same story, but `feed` now lives in the office world.
    const reHomed = createGame(storyWithFeedIn('office'));
    reHomed.loadState(save);
    reHomed.goToWorld('cams');

    // Control: with `feed` still in cams, the same save resumes there.
    const unchanged = createGame(storyWithFeedIn('cams'));
    unchanged.loadState(save);
    unchanged.goToWorld('cams');

    await test.info().attach('evidence.json', {
      body: JSON.stringify(
        {
          savedPerWorldPositions: save.perWorldPositions,
          reHomedLandsOn: reHomed.currentSituation,
          unchangedLandsOn: unchanged.currentSituation,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    expect(reHomed.currentSituation).toBe('hub'); // the world's entry point, not the stale `feed`
    expect(reHomed.getCurrentWorld()).toBe('cams');
    expect(unchanged.currentSituation).toBe('feed');
  });

  test('loadState re-mirrors the world quality for the restored position', async () => {
    // Save from a config with no `world` quality declared — the save carries none.
    const plain = createGame(storyWithFeedIn('cams'));
    plain.goToSituation('feed');
    const save = plain.getSaveState();

    // Load it into a config that declares the engine-maintained mirror (the
    // live-edit path: the constructor mirrors the initial world, and without
    // a re-mirror the restored position would keep that stale value).
    const mirrored: GameConfig = {
      ...storyWithFeedIn('cams'),
      qualities: { world: { name: 'world', type: 'string', default: '' } },
    };
    const engine = createGame(mirrored); // mirrors 'office' at construction
    engine.loadState(save);

    await test.info().attach('world-mirror.json', {
      body: JSON.stringify(
        { currentWorld: engine.getCurrentWorld(), worldQuality: engine.getQuality('world') },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    expect(engine.getCurrentWorld()).toBe('cams');
    expect(engine.getQuality('world')).toBe('cams');
  });

  test('a schedule effect that re-enters the clock cannot double-fire entries', async () => {
    let everyFired = 0;
    const config: GameConfig = {
      title: 'Reentrant Clock',
      initialSituation: 'a',
      qualities: {},
      situations: {
        a: { id: 'a', title: 'A', content: 'a.' },
        b: { id: 'b', title: 'B', content: 'b.' },
      },
      schedule: [
        { at: 1, effects: (game) => game.wait?.(1) }, // re-enters tickSchedule mid-dispatch
        {
          every: 1,
          effects: () => {
            everyFired += 1;
          },
        },
      ],
    };
    const engine = createGame(config);
    engine.goToSituation('b'); // turn 1: the at-1 effect waits a turn mid-dispatch

    await test.info().attach('reentrancy.json', {
      body: JSON.stringify({ turn: engine.getTurn(), everyFired }, null, 2),
      contentType: 'application/json',
    });
    expect(engine.getTurn()).toBe(2); // the inner tick still advances the clock
    expect(everyFired).toBe(1); // dispatched once, by the outermost pass only
  });
});
