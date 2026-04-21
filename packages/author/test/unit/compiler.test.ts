import { describe, it, expect } from 'vitest';
import { parseGame } from '../../src/parser';
import { compileAST } from '../../src/compiler';

describe('TextPlus Author - Compiler', () => {
  describe('Basic Compilation', () => {
    it('should compile parsed DSL to game config', () => {
      const dsl = `title: Test Game
quality mood number = 0
:: start
Start Situation
-> Continue => next
:: next
Next Situation
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.errors).toHaveLength(0);
      expect(result.config).not.toBeNull();
      expect(result.config?.title).toBe('Test Game');
      expect(result.config?.initialSituation).toBe('start');
    });

    it('should preserve game title and metadata', () => {
      const dsl = `title: My Adventure
quality energy number = 100 min 0 max 100
:: start
Begin
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.title).toBe('My Adventure');
      expect(result.config?.qualities.energy).toBeDefined();
      expect(result.config?.qualities.energy.default).toBe(100);
    });

    it('should set initial situation to first situation by default', () => {
      const dsl = `title: Game
:: first
First situation
:: second
Second situation
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.initialSituation).toBe('first');
    });

    it('should set initial situation to @start tag if present', () => {
      const dsl = `title: Game
:: prologue
Prologue
:: main [start]
Main story
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.initialSituation).toBe('main');
    });
  });

  describe('Situation Compilation', () => {
    it('should compile multiple situations', () => {
      const dsl = `title: Multi
:: room1
In room 1
-> Go to 2 => room2
:: room2
In room 2
-> Go back => room1
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(Object.keys(result.config?.situations || {})).toHaveLength(2);
      expect(result.config?.situations.room1).toBeDefined();
      expect(result.config?.situations.room2).toBeDefined();
    });

    it('should preserve situation title and content', () => {
      const dsl = `title: Game
:: scene
The Scene Title
Content line 1
Content line 2
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.situations.scene.title).toBe('The Scene Title');
      expect(result.config?.situations.scene.content).toContain('Content line 1');
      expect(result.config?.situations.scene.content).toContain('Content line 2');
    });

    it('should compile situation links', () => {
      const dsl = `title: Game
:: start
Start here
-> Do it => next
:: next
Next scene
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.situations.start.links).toHaveLength(1);
      expect(result.config?.situations.start.links?.[0].text).toBe('Do it');
      expect(result.config?.situations.start.links?.[0].target).toBe('next');
    });

    it('should preserve situation tags', () => {
      const dsl = `title: Game
:: room1 [dark,spooky]
A dark room
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.situations.room1.tags).toEqual(['dark', 'spooky']);
    });
  });

  describe('Quality Compilation', () => {
    it('should compile quality definitions', () => {
      const dsl = `title: Game
quality health number = 50 min 0 max 100
quality cursed boolean = false
:: start
Begin
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.qualities.health).toBeDefined();
      expect(result.config?.qualities.health.type).toBe('number');
      expect(result.config?.qualities.health.default).toBe(50);
      expect(result.config?.qualities.health.min).toBe(0);
      expect(result.config?.qualities.health.max).toBe(100);

      expect(result.config?.qualities.cursed).toBeDefined();
      expect(result.config?.qualities.cursed.type).toBe('boolean');
      expect(result.config?.qualities.cursed.default).toBe(false);
    });

    it('should generate readable quality names from IDs', () => {
      const dsl = `title: Game
quality player-name string = "Hero"
:: start
Start
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      // ID 'player-name' should become 'Player Name' in display name
      expect(result.config?.qualities['player-name'].name).toBe('Player Name');
    });

    it('should handle all quality types (number, boolean, string)', () => {
      const dsl = `title: Game
quality score number = 0
quality alive boolean = true
quality story string = "Beginning"
:: start
Start
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config?.qualities.score.type).toBe('number');
      expect(result.config?.qualities.alive.type).toBe('boolean');
      expect(result.config?.qualities.story.type).toBe('string');
    });
  });

  describe('Error Reporting', () => {
    it('should report unresolved situation link targets', () => {
      const dsl = `title: Game
:: start
Start
-> Go to void => nonexistent
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('unresolved_link');
      expect(result.errors[0].message).toContain('nonexistent');
      expect(result.config).toBeNull();
    });

    it('should report multiple unresolved links', () => {
      const dsl = `title: Game
:: start
Start
-> Link 1 => missing1
-> Link 2 => missing2
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((e) => e.type === 'unresolved_link')).toBe(true);
    });

    it('should catch compiler errors and not return config', () => {
      const dsl = `title: Game
:: start
Start
-> Bad link => nowhere
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.config).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report missing initial situation (empty game)', () => {
      const ast = {
        title: 'Empty',
        qualities: {},
        situations: {},
      };
      const result = compileAST(ast);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('no_initial_situation');
      expect(result.config).toBeNull();
    });
  });

  describe('Complex Integration', () => {
    it('should compile a complete game with multiple features', () => {
      const dsl = `title: The Quest
quality gold number = 0 min 0 max 999
quality hasMap boolean = false
:: start [start]
You stand in a tavern.
-> Take the quest => questRoom
-> Leave => dead-end
:: questRoom
A hooded figure hands you a map.
-> Accept the map => forest
:: forest
Dense trees. You find gold!
-> Return => tavern
:: tavern
Back at the tavern.
-> End game => end
:: dead-end
You wander away...
:: end [ending]
Your quest is complete!
`;
      const ast = parseGame(dsl);
      const result = compileAST(ast);

      expect(result.errors).toHaveLength(0);
      expect(result.config).not.toBeNull();
      expect(result.config?.title).toBe('The Quest');
      expect(result.config?.initialSituation).toBe('start');
      expect(Object.keys(result.config?.situations || {})).toHaveLength(6);
      expect(result.config?.qualities.gold).toBeDefined();
      expect(result.config?.qualities.hasMap).toBeDefined();
      // Verify link integrity
      const situations = result.config?.situations || {};
      Object.values(situations).forEach((sit) => {
        sit.links?.forEach((link) => {
          expect(situations[link.target]).toBeDefined();
        });
      });
    });
  });
});
