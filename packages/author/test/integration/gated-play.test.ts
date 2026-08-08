/**
 * End-to-end: DSL source → workflowExecute → createGame → play a gated path.
 * Proves conditions gate real navigation and effects mutate real state —
 * the whole point of Phase A.
 */

import { describe, it, expect } from 'vitest';
import { workflowExecute } from '../../src/workflow';
import { createGame } from '@textplus/core';

const SOURCE = `title: The Gate Test

quality courage number = 5 min 0 max 10
quality hasKey boolean = false

:: start [start]
A Crossroads
Your courage is {courage}.

-> Enter the cave => cave ? courage >= 6
-> Steel yourself => start { courage += 1 }

:: cave
The Cave
{ hasKey = true }
The key is yours the moment you step inside.

-> Walk back out => start
`;

describe('gated play-through', () => {
  it('hides the gated link until effects raise the quality, then navigates', () => {
    const result = workflowExecute(SOURCE, { randomSeed: 1 });
    expect(result.success).toBe(true);
    const engine = createGame(result.config!);

    // Below the gate: only the self-link shows.
    expect(engine.getAvailableLinks().map((l) => l.text)).toEqual(['Steel yourself']);

    // Follow the effect link once: courage 5 → 6, gate opens.
    engine.followLink(engine.getAvailableLinks()[0]);
    expect(engine.getQuality('courage')).toBe(6);
    expect(engine.getAvailableLinks().map((l) => l.text)).toEqual(['Enter the cave', 'Steel yourself']);

    // Enter the cave: entry effects fire on arrival.
    engine.followLink(engine.getAvailableLinks()[0]);
    expect(engine.currentSituation).toBe('cave');
    expect(engine.getQuality('hasKey')).toBe(true);
  });

  it('renders interpolated content with live values', () => {
    const result = workflowExecute(SOURCE, { randomSeed: 1 });
    const engine = createGame(result.config!);
    expect(engine.getCurrentSituationContent()).toContain('Your courage is 5.');
    engine.mutateQuality('courage', 3);
    expect(engine.getCurrentSituationContent()).toContain('Your courage is 8.');
  });

  it('keeps conditional links in the compiled config (runtime filters them)', () => {
    const result = workflowExecute(SOURCE, { randomSeed: 1 });
    expect(result.config!.situations.start.links).toHaveLength(2);
  });
});
