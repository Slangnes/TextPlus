import { describe, it, expect, vi } from 'vitest';
import { SituationSystem } from '../../src/situation';
import type { SituationDefinition, GameEngine } from '../../src/types';

const makeSystem = () => {
  const system = new SituationSystem();
  const situations: Record<string, SituationDefinition> = {
    start: {
      id: 'start',
      title: 'Start',
      content: 'Welcome',
      links: [
        { target: 'next', text: 'Next' },
        { target: 'secret', text: 'Secret', condition: (ctx) => (ctx as any).health?.value > 10 }
      ]
    },
    next: {
      id: 'next',
      title: 'Next',
      content: (ctx) => `Mood: ${(ctx as any).mood?.value ?? 'unknown'}`,
      links: []
    }
  };

  system.initialize(situations);
  return { system, situations };
};

const makeEngineMock = (): GameEngine => {
  const qualities = {
    health: { definition: { name: 'Health', type: 'number', default: 50 }, value: 50 },
    mood: { definition: { name: 'Mood', type: 'string', default: 'neutral' }, value: 'neutral' }
  } as any;

  return {
    config: {} as any,
    currentSituation: 'start',
    getQuality: vi.fn(),
    setQuality: vi.fn(),
    mutateQuality: vi.fn(),
    getQualityDefinition: vi.fn(),
    getAllQualities: vi.fn(() => qualities),
    getSituationHistory: vi.fn(() => ['start']),
    hasSituationBeenVisited: vi.fn(() => true),
    getSituation: vi.fn(),
    getCurrentSituation: vi.fn(),
    getAvailableLinks: vi.fn(),
    goToSituation: vi.fn(),
    followLink: vi.fn(),
    getSaveState: vi.fn(),
    loadState: vi.fn(),
    reset: vi.fn(),
    onQualityChange: vi.fn(() => () => undefined),
    onSituationChange: vi.fn(() => () => undefined),
    getCurrentSituationContent: vi.fn(),
    checkCondition: vi.fn(() => true)
  } as unknown as GameEngine;
};

describe('SituationSystem', () => {
  it('loads and resolves situations by id', () => {
    const { system } = makeSystem();
    expect(system.hasSituation('start')).toBe(true);
    expect(system.getSituation('start')?.title).toBe('Start');
    expect(system.getAllSituationIds().sort()).toEqual(['next', 'start']);
  });

  it('validates missing link targets', () => {
    const system = new SituationSystem();
    system.initialize({
      start: {
        id: 'start',
        title: 'Start',
        content: 'x',
        links: [{ target: 'missing', text: 'broken' }]
      }
    });

    const result = system.validateSituationReferences();
    expect(result.valid).toBe(false);
    expect(result.invalidLinks[0]).toContain('start');
  });

  it('filters links by condition with quality-map fallback', () => {
    const { system, situations } = makeSystem();
    const engine = makeEngineMock();

    const links = system.getAvailableLinks(situations.start, engine);
    expect(links.map((l) => l.target)).toEqual(['next', 'secret']);

    (engine.getAllQualities as any).mockReturnValue({ health: { value: 0 } });
    const filtered = system.getAvailableLinks(situations.start, engine);
    expect(filtered.map((l) => l.target)).toEqual(['next']);
  });

  it('evaluates string content directly', () => {
    const { system, situations } = makeSystem();
    const content = system.getContent(situations.start);
    expect(content).toBe('Welcome');
  });

  it('evaluates function content with quality-map fallback', () => {
    const { system, situations } = makeSystem();
    const engine = makeEngineMock();

    const content = system.getContent(situations.next, engine);
    expect(content).toContain('Mood: neutral');
  });

  it('calls lifecycle hooks and swallows hook errors', () => {
    const onEnter = vi.fn();
    const onExit = vi.fn(() => {
      throw new Error('hook fail');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const system = new SituationSystem();
    system.initialize({
      room: { id: 'room', title: 'Room', content: 'Room', onEnter, onExit }
    });

    const engine = makeEngineMock();
    const room = system.getSituation('room')!;

    system.callOnEnter(room, engine);
    system.callOnExit(room, engine);

    expect(onEnter).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
