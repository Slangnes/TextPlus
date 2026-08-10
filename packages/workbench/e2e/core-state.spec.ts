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
});
