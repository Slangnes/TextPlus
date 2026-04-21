import { describe, it, expect, beforeEach } from 'vitest';
import { TextPlusGameEngine, createGame } from '../../src/engine';
import type { GameConfig } from '../../src/types';

/**
 * TextPlus Core - Engine Unit Tests
 * 
 * Tests for the main GameEngine including:
 * - Game initialization
 * - Situation management and transitions
 * - Quality tracking and mutation
 * - State serialization/deserialization
 */

// Minimal test game configuration
const createTestGame = (): GameConfig => ({
  title: 'Test Game',
  author: 'Test Author',
  initialSituation: 'start',
  qualities: {
    health: {
      name: 'health',
      type: 'number',
      default: 100,
      min: 0,
      max: 100
    },
    mood: {
      name: 'mood',
      type: 'string',
      default: 'neutral'
    }
  },
  situations: {
    start: {
      id: 'start',
      title: 'Start',
      content: 'You are at the start.',
      links: [
        { target: 'next', text: 'Go next' },
        {
          target: 'dark',
          text: 'Go to dark place',
          condition: (qualities) => (qualities['health'].value as number) > 50
        }
      ]
    },
    next: {
      id: 'next',
      title: 'Next',
      content: 'You have moved forward.',
      links: [{ target: 'start', text: 'Go back' }]
    },
    dark: {
      id: 'dark',
      title: 'Dark Place',
      content: () => 'The darkness is overwhelming. Health: unknown',
      links: []
    }
  }
});

describe('TextPlus Core - Game Engine', () => {
  let engine: TextPlusGameEngine;

  beforeEach(() => {
    const config = createTestGame();
    engine = new TextPlusGameEngine(config);
  });

  describe('Initialization', () => {
    it('should create engine with valid config', () => {
      expect(engine).toBeDefined();
      expect(engine.config.title).toBe('Test Game');
    });

    it('should start at initial situation', () => {
      expect(engine.currentSituation).toBe('start');
    });

    it('should initialize all qualities to default values', () => {
      expect(engine.getQuality('health')).toBe(100);
      expect(engine.getQuality('mood')).toBe('neutral');
    });

    it('should throw error if initial situation does not exist', () => {
      const badConfig: GameConfig = {
        title: 'Bad',
        initialSituation: 'nonexistent',
        qualities: {},
        situations: {}
      };

      expect(() => new TextPlusGameEngine(badConfig)).toThrow();
    });

    it('should mark initial situation as visited', () => {
      expect(engine.hasSituationBeenVisited('start')).toBe(true);
    });
  });

  describe('Quality Management', () => {
    it('should get quality value', () => {
      expect(engine.getQuality('health')).toBe(100);
    });

    it('should set quality value', () => {
      engine.setQuality('health', 75);
      expect(engine.getQuality('health')).toBe(75);
    });

    it('should constrain numeric values to min/max', () => {
      engine.setQuality('health', 150); // Over max
      expect(engine.getQuality('health')).toBe(100);

      engine.setQuality('health', -10); // Under min
      expect(engine.getQuality('health')).toBe(0);
    });

    it('should mutate numeric qualities', () => {
      engine.mutateQuality('health', -25);
      expect(engine.getQuality('health')).toBe(75);

      engine.mutateQuality('health', -100); // Should clamp to min
      expect(engine.getQuality('health')).toBe(0);
    });

    it('should change string qualities', () => {
      engine.setQuality('mood', 'happy');
      expect(engine.getQuality('mood')).toBe('happy');
    });

    it('should throw error for unknown quality', () => {
      expect(() => engine.getQuality('unknown')).toThrow();
    });

    it('should return quality definition', () => {
      const def = engine.getQualityDefinition('health');
      expect(def).toBeDefined();
      expect(def?.min).toBe(0);
      expect(def?.max).toBe(100);
    });

    it('should return all qualities', () => {
      engine.setQuality('health', 80);
      const all = engine.getAllQualities();

      expect(all['health']).toBeDefined();
      expect(all['health'].value).toBe(80);
      expect(all['mood'].value).toBe('neutral');
    });
  });

  describe('Situation Management', () => {
    it('should transition to another situation', () => {
      engine.goToSituation('next');
      expect(engine.currentSituation).toBe('next');
    });

    it('should add to situation history on transition', () => {
      engine.goToSituation('next');
      const history = engine.getSituationHistory();

      expect(history).toContain('start');
      expect(history).toContain('next');
      expect(history[history.length - 1]).toBe('next');
    });

    it('should mark visited situations', () => {
      engine.goToSituation('next');
      expect(engine.hasSituationBeenVisited('next')).toBe(true);
      expect(engine.hasSituationBeenVisited('dark')).toBe(false);
    });

    it('should throw error for nonexistent situation', () => {
      expect(() => engine.goToSituation('nonexistent')).toThrow();
    });

    it('should get available links for current situation', () => {
      const links = engine.getAvailableLinks();
      expect(links.length).toBeGreaterThan(0);
      expect(links[0].target).toBe('next');
    });
  });

  describe('Conditional Links', () => {
    it('should filter links based on conditions', () => {
      // With health > 50, should have access to 'dark'
      let links = engine.getAvailableLinks();
      const darkLink = links.find((l) => l.target === 'dark');
      expect(darkLink).toBeDefined();

      // With health = 0, should not have access to 'dark'
      engine.setQuality('health', 0);
      links = engine.getAvailableLinks();
      const darkLinkAfter = links.find((l) => l.target === 'dark');
      expect(darkLinkAfter).toBeUndefined();
    });

    it('should safely handle link condition errors', () => {
      // Add a link with broken condition
      const badConfig: GameConfig = {
        ...createTestGame(),
        situations: {
          ...createTestGame().situations,
          start: {
            ...createTestGame().situations['start']!,
            links: [
              {
                target: 'next',
                text: 'Go',
                condition: () => {
                  throw new Error('Broken condition');
                }
              }
            ]
          }
        }
      };

      const badEngine = new TextPlusGameEngine(badConfig);
      expect(() => badEngine.getAvailableLinks()).not.toThrow();
      // Should return empty links when condition fails
      expect(badEngine.getAvailableLinks().length).toBe(0);
    });
  });

  describe('Dynamic Content', () => {
    it('should evaluate string content', () => {
      const content = engine.getCurrentSituationContent();
      expect(content).toBe('You are at the start.');
    });

    it('should evaluate function content', () => {
      engine.goToSituation('dark');
      const content = engine.getCurrentSituationContent();
      expect(content).toContain('darkness');
    });

    it('should have access to qualities in dynamic content', () => {
      // This test verifies the engine passes qualities to dynamic content
      const config: GameConfig = {
        title: 'Test',
        initialSituation: 'start',
        qualities: {
          level: { name: 'level', type: 'number', default: 5 }
        },
        situations: {
          start: {
            id: 'start',
            title: 'Start',
            content: (qualities) => `Level: ${qualities['level'].value}`,
            links: []
          }
        }
      };

      const dynamicEngine = new TextPlusGameEngine(config);
      dynamicEngine.setQuality('level', 10);
      const content = dynamicEngine.getCurrentSituationContent();
      expect(content).toContain('Level: 10'); // Should use updated value
    });
  });

  describe('State Serialization', () => {
    it('should save game state', () => {
      engine.setQuality('health', 50);
      engine.goToSituation('next');

      const state = engine.getSaveState();

      expect(state.currentSituation).toBe('next');
      expect(state.qualities['health']).toBe(50);
      expect(state.situations.history).toContain('start');
      expect(state.situations.history).toContain('next');
    });

    it('should load game state', () => {
      engine.setQuality('health', 30);
      const savedState = engine.getSaveState();

      // Create new engine and load state
      const newEngine = new TextPlusGameEngine(createTestGame());
      expect(newEngine.getQuality('health')).toBe(100); // Default before load

      newEngine.loadState(savedState);
      expect(newEngine.currentSituation).toBe('start');
      expect(newEngine.getQuality('health')).toBe(30);
    });

    it('should load state with situation history', () => {
      engine.goToSituation('next');
      const savedState = engine.getSaveState();

      const newEngine = new TextPlusGameEngine(createTestGame());
      newEngine.loadState(savedState);

      const history = newEngine.getSituationHistory();
      expect(history).toContain('start');
      expect(history).toContain('next');
    });

    it('should throw error for invalid save version', () => {
      const savedState = engine.getSaveState();
      savedState.version = 999;

      const newEngine = new TextPlusGameEngine(createTestGame());
      expect(() => newEngine.loadState(savedState)).toThrow();
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      engine.setQuality('health', 10);
      engine.goToSituation('next');
      engine.goToSituation('start');

      engine.reset();

      expect(engine.currentSituation).toBe('start');
      expect(engine.getQuality('health')).toBe(100);
      expect(engine.getSituationHistory()).toEqual(['start']);
    });
  });

  describe('Callbacks', () => {
    it('should call situation changed callback', () => {
      let called = false;
      let prevSit = '';
      let newSit = '';

      engine.onSituationChanged((prev, next) => {
        called = true;
        prevSit = prev;
        newSit = next;
      });

      engine.goToSituation('next');

      expect(called).toBe(true);
      expect(prevSit).toBe('start');
      expect(newSit).toBe('next');
    });

    it('should call quality changed callback', () => {
      let called = false;
      let qualityName = '';
      let oldValue = 0;
      let newValue = 0;

      engine.onQualityChanged((name, old, newVal) => {
        called = true;
        qualityName = name;
        oldValue = old as number;
        newValue = newVal as number;
      });

      engine.setQuality('health', 75);

      expect(called).toBe(true);
      expect(qualityName).toBe('health');
      expect(oldValue).toBe(100);
      expect(newValue).toBe(75);
    });
  });

  describe('Validation', () => {
    it('should validate game structure', () => {
      // Create a simple game without conditional links to avoid validation issues
      const simpleConfig: GameConfig = {
        title: 'Simple',
        initialSituation: 'start',
        qualities: {},
        situations: {
          start: {
            id: 'start',
            title: 'Start',
            content: 'Start',
            links: [{ target: 'next', text: 'Go' }]
          },
          next: {
            id: 'next',
            title: 'Next',
            content: 'Next',
            links: []
          }
        }
      };

      const simpleEngine = new TextPlusGameEngine(simpleConfig);
      const result = simpleEngine.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect broken links', () => {
      const badConfig: GameConfig = {
        ...createTestGame(),
        situations: {
          ...createTestGame().situations,
          start: {
            ...createTestGame().situations['start']!,
            links: [{ target: 'nonexistent', text: 'Broken' }]
          }
        }
      };

      const badEngine = new TextPlusGameEngine(badConfig);
      const result = badEngine.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Function', () => {
    it('should create engine via factory', () => {
      const config = createTestGame();
      const factoryEngine = createGame(config);

      expect(factoryEngine).toBeDefined();
      expect(factoryEngine.config.title).toBe('Test Game');
    });
  });
});
