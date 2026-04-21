import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, TextPlusGameEngine } from '@textplus/core';
import { helloWorldConfig } from '../../../demo/hello-world/game';

/**
 * TextPlus Core - E2E: Hello World Game Playthrough
 *
 * Tests complete game scenarios using the Hello World example game.
 * These tests validate the full integration of the Core engine with
 * a real game configuration (not mocks).
 */

describe('TextPlus Core - E2E: Hello World Game', () => {
  let engine: TextPlusGameEngine;

  beforeEach(() => {
    engine = createGame(helloWorldConfig);
  });

  describe('Game Initialization', () => {
    it('should start at the initial situation', () => {
      expect(engine.currentSituation).toBe('start');
    });

    it('should display initial situation content', () => {
      const situation = engine.getCurrentSituation();
      expect(situation).toBeDefined();
      expect(situation?.id).toBe('start');
      expect(situation?.title).toBe('A Crossroads');
    });

    it('should present available choices at start', () => {
      const links = engine.getAvailableLinks();
      expect(links.length).toBe(2);
      expect(links[0].text).toContain('stream');
      expect(links[1].text).toContain('cave');
    });

    it('should initialize qualities with default values', () => {
      expect(engine.getQuality('courage')).toBe(5);
      expect(engine.getQuality('hasKey')).toBe(false);
      expect(engine.getQuality('visitedCave')).toBe(false);
    });
  });

  describe('Game Progression - Safe Path', () => {
    it('should transition to stream when choosing safe option', () => {
      engine.goToSituation('stream');
      expect(engine.currentSituation).toBe('stream');
      expect(engine.getSituationHistory()).toContain('stream');
    });

    it('should not increase courage from safe choices', () => {
      const initialCourage = engine.getQuality('courage') as number;
      engine.goToSituation('stream');
      expect(engine.getQuality('courage')).toBe(initialCourage);
    });

    it('should reach peaceful ending via stream', () => {
      engine.goToSituation('stream');
      const links = engine.getAvailableLinks();
      const peaceLink = links.find(l => l.target === 'ending-peace');
      expect(peaceLink).toBeDefined();

      engine.goToSituation('ending-peace');
      expect(engine.currentSituation).toBe('ending-peace');
      const situation = engine.getCurrentSituation();
      expect(situation?.tags).toContain('ending');
    });
  });

  describe('Game Progression - Brave Path', () => {
    it('should transition to cave when choosing risky option', () => {
      const initialCourage = engine.getQuality('courage') as number;
      const links = engine.getAvailableLinks();
      const caveLink = links.find(l => l.target === 'cave');
      expect(caveLink).toBeDefined();
      
      engine.followLink(caveLink!);
      
      expect(engine.currentSituation).toBe('cave');
      expect(engine.getQuality('courage')).toBe(initialCourage + 1);
    });

    it('should have conditional link based on courage in cave', () => {
      // Low courage path
      engine.goToSituation('cave');
      let links = engine.getAvailableLinks();
      expect(links.length).toBeGreaterThan(1);

      // High courage path
      engine.reset();
      engine.setQuality('courage', 8);
      engine.goToSituation('cave');
      links = engine.getAvailableLinks();
      
      const retrieveKeyLink = links.find(l => l.text.includes('Retrieve'));
      expect(retrieveKeyLink).toBeDefined();
    });

    it('should reach treasure ending with high courage', () => {
      engine.setQuality('courage', 7);
      engine.goToSituation('cave');
      engine.goToSituation('cave-key');
      engine.goToSituation('ending-treasure');

      expect(engine.currentSituation).toBe('ending-treasure');
      const situation = engine.getCurrentSituation();
      expect(situation?.content).toContain('treasure');
      expect(situation?.tags).toContain('best');
    });

    it('should reach collapse ending with low courage', () => {
      engine.setQuality('courage', 4);
      engine.goToSituation('cave');
      engine.goToSituation('cave-collapse');

      expect(engine.currentSituation).toBe('cave-collapse');
      const situation = engine.getCurrentSituation();
      expect(situation?.content).toContain('rocks');
    });
  });

  describe('Quality System Integration', () => {
    it('should track quality changes through gameplay', () => {
      const initialCourage = engine.getQuality('courage') as number;
      
      // Take cave path (courage +1)
      const links = engine.getAvailableLinks();
      const caveLink = links.find(l => l.target === 'cave');
      expect(caveLink).toBeDefined();
      engine.followLink(caveLink!);
      
      expect(engine.getQuality('courage')).toBe(initialCourage + 1);
      
      engine.goToSituation('cave-collapse');
      const collapseLinks = engine.getAvailableLinks();
      const link = collapseLinks[0];
      if (link.onChoose) {
        link.onChoose(engine);
      }
      expect(engine.getQuality('courage')).toBe(initialCourage + 3); // +1 from cave, +2 from collapse
    });

    it('should enforce quality bounds (min/max)', () => {
      engine.setQuality('courage', 0);
      engine.mutateQuality('courage', -5);
      expect(engine.getQuality('courage')).toBe(0); // Clamped to min

      engine.setQuality('courage', 10);
      engine.mutateQuality('courage', 5);
      expect(engine.getQuality('courage')).toBe(10); // Clamped to max
    });

    it('should support boolean qualities', () => {
      expect(engine.getQuality('hasKey')).toBe(false);
      
      engine.setQuality('hasKey', true);
      expect(engine.getQuality('hasKey')).toBe(true);
    });
  });

  describe('Save and Restore', () => {
    it('should save and restore game state mid-game', () => {
      engine.goToSituation('cave');
      engine.mutateQuality('courage', 2);
      
      const state = engine.getSaveState();
      expect(state).toBeDefined();
      expect(state.currentSituation).toBe('cave');
      expect(state.qualities.courage).toBe(7); // 5 + 2

      const newEngine = createGame(helloWorldConfig);
      newEngine.loadState(state);

      expect(newEngine.currentSituation).toBe('cave');
      expect(newEngine.getQuality('courage')).toBe(7);
      expect(newEngine.getSituationHistory()).toContain('cave');
    });

    it('should preserve history across save/load', () => {
      engine.goToSituation('stream');
      engine.goToSituation('forest-deeper');
      const history = engine.getSituationHistory();

      const state = engine.getSaveState();
      const newEngine = createGame(helloWorldConfig);
      newEngine.loadState(state);

      expect(newEngine.getSituationHistory()).toEqual(history);
    });
  });

  describe('Story Variety', () => {
    it('should allow multiple different playthroughs', () => {
      // Playthrough 1: Safe path
      engine.goToSituation('stream');
      engine.goToSituation('ending-peace');
      const ending1 = engine.currentSituation;

      // Playthrough 2: Brave path
      const engine2 = createGame(helloWorldConfig);
      engine2.setQuality('courage', 8);
      engine2.goToSituation('cave');
      engine2.goToSituation('cave-key');
      engine2.goToSituation('ending-treasure');
      const ending2 = engine2.currentSituation;

      expect(ending1).not.toBe(ending2);
      expect(ending1).toContain('peace');
      expect(ending2).toContain('treasure');
    });

    it('should make conditional text visible based on qualities', () => {
      // With low courage, the "High courage" link should be hidden
      engine.setQuality('courage', 3);
      engine.goToSituation('cave');
      let links = engine.getAvailableLinks();
      const highCourageLink = links.find(l => l.text.includes('High courage'));
      expect(highCourageLink).toBeUndefined(); // Hidden at courage 3

      // With high courage, the "High courage" link should be visible
      engine.reset();
      engine.setQuality('courage', 9);
      engine.goToSituation('cave');
      links = engine.getAvailableLinks();
      const visibleHighCourageLink = links.find(l => l.text.includes('High courage'));
      expect(visibleHighCourageLink).toBeDefined(); // Visible at courage 9
    });
  });
});
