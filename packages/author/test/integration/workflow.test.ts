import { describe, it, expect } from 'vitest';
import { workflowExecute, formatWorkflowReport, serializeWorkflowResult } from '../../src/workflow';

describe('TextPlus Author - Workflow Integration', () => {
  describe('Complete DSL → GameConfig Workflow', () => {
    it('should execute full workflow on valid DSL', () => {
      const dsl = `title: Integration Test Game
quality mood number = 0 min -10 max 10
:: start
You begin your journey.
-> Explore => explore
:: explore
You discover new places.
-> Return => start
`;

      const result = workflowExecute(dsl);

      expect(result.success).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.config?.title).toBe('Integration Test Game');
      expect(result.errors).toHaveLength(0);
      expect(result.lintDiagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    });

    it('should report errors when compilation fails', () => {
      const dsl = `title: Bad Game
:: start
Start here
-> Go to void => nonexistent
`;

      const result = workflowExecute(dsl);

      expect(result.success).toBe(false);
      expect(result.config).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true);
    });

    it('should report linting warnings but still compile', () => {
      const dsl = `title: Game with Warnings
quality unused number = 0
:: start
A simple game
`;

      const result = workflowExecute(dsl);

      // Compilation succeeds despite warnings
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      // But we do get warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('unused'))).toBe(true);
    });

    it('should handle parser errors gracefully', () => {
      const invalidDsl = `:: situation without title
content here`;

      const result = workflowExecute(invalidDsl);

      expect(result.success).toBe(false);
      expect(result.ast).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Parse error');
    });

    it('should preserve all diagnostic information', () => {
      const dsl = `title: Complex Game
quality player-health number = 100 min 0 max 100
quality unused-quality string = "test"
:: start
You are here. Your player-health is critical.
-> Continue => middle
-> Go to orphan => orphan
:: middle
Middle area
-> End => end
:: end
Game over!
`;

      const result = workflowExecute(dsl);

      expect(result.lintDiagnostics.length).toBeGreaterThan(0);
      // Should detect unused quality
      expect(result.lintDiagnostics.some((d) => d.code === 'unused-quality')).toBe(true);
      // Should detect broken link (orphan doesn't exist, but first link to it fails compile)
      expect(result.errors.some((e) => e.includes('orphan'))).toBe(true);
    });

    it('should correctly wrap all workflow steps', () => {
      const dsl = `title: Full Flow Test
quality gold number = 0
:: start [start]
Collect gold: gold
-> Go => treasure
:: treasure
Found gold!
-> End => end
:: end
Victory!
`;

      const result = workflowExecute(dsl);

      // All three steps completed
      expect(result.ast).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.lintDiagnostics).toBeDefined();
      
      // Game is playable
      expect(result.config?.situations.start).toBeDefined();
      expect(result.config?.situations.treasure).toBeDefined();
      expect(result.config?.situations.end).toBeDefined();
    });
  });

  describe('Workflow Report Formatting', () => {
    it('should format successful workflow as readable report', () => {
      const dsl = `title: Success Test
:: start
Start
`;

      const result = workflowExecute(dsl);
      const report = formatWorkflowReport(result);

      expect(report).toContain('✅');
      expect(report).toContain('Success Test');
      expect(report).toContain('Situations: 1');
    });

    it('should format failed workflow with errors', () => {
      const dsl = `title: Fail Test
:: start
Start
-> Bad => missing
`;

      const result = workflowExecute(dsl);
      const report = formatWorkflowReport(result);

      expect(report).toContain('❌');
      expect(report).toContain('Error');
      expect(report).toContain('missing');
    });

    it('should format warnings in report', () => {
      const dsl = `title: Warning Test
quality unused number = 0
:: start
Test
`;

      const result = workflowExecute(dsl);
      const report = formatWorkflowReport(result);

      expect(report).toContain('⚠️');
      expect(report).toContain('unused');
    });

    it('should handle success with no issues', () => {
      const dsl = `title: Clean
:: start
All good
`;

      const result = workflowExecute(dsl);
      const report = formatWorkflowReport(result);

      expect(report).toContain('✅');
      expect(report).toContain('No issues');
    });
  });

  describe('Workflow Result Serialization', () => {
    it('should serialize successful result to valid JSON', () => {
      const dsl = `title: JSON Test
quality points number = 0
:: start
Begin
-> Go => end
:: end
Finish
`;

      const result = workflowExecute(dsl);
      const json = serializeWorkflowResult(result);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(true);
      expect(parsed.config).toBeDefined();
      expect(parsed.config.title).toBe('JSON Test');
      expect(parsed.config.situations.start).toBeDefined();
      expect(Array.isArray(parsed.diagnostics)).toBe(true);
    });

    it('should include diagnostics in serialized output', () => {
      const dsl = `title: Diag Test
quality unused number = 0
:: start
Start
`;

      const result = workflowExecute(dsl);
      const json = serializeWorkflowResult(result);
      const parsed = JSON.parse(json);

      expect(parsed.diagnostics.length).toBeGreaterThan(0);
      expect(parsed.warnings.length).toBeGreaterThan(0);
    });

    it('should handle failures in serialization', () => {
      const dsl = `title: Failure
:: start
  Start
  -> Go nowhere => nowhere
`;

      const result = workflowExecute(dsl);
      const json = serializeWorkflowResult(result);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(false);
        expect(parsed.config).toBeUndefined();
      expect(parsed.errors.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle a small but complete adventure game', () => {
      const dsl = `title: The Lost Key
quality has-key boolean = false
quality door-open boolean = false

:: start [start]
You wake in a locked room. You see a table and a door.

-> Search the table => search
-> Try the door => door

:: search
You find a brass key on the table!
Check has-key status!

-> Go to the door => door

:: door
The door is locked. Check that has-key again.

-> Leave adventure => end

:: end
You escape the room!
`;

      const result = workflowExecute(dsl);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();

      // Verify game structure
      const config = result.config!;
      expect(config.title).toBe('The Lost Key');
      expect(config.initialSituation).toBe('start');
      expect(Object.keys(config.situations)).toHaveLength(4);
      expect(Object.keys(config.qualities)).toHaveLength(2);

      // Verify reachability
      expect(config.situations.start.links).toHaveLength(2);
      expect(config.situations.search.links).toHaveLength(1);
      expect(config.situations.door.links).toHaveLength(1);
      expect(config.situations.end.links).toHaveLength(0);
    });

    it('should validate complex game with multiple endings', () => {
      const dsl = `title: The Choice
quality wealth number = 0 min 0 max 100
quality health number = 50 min 0 max 100

:: start [start]
A wanderer appears. They offer you a choice.

-> Take gold and risk health => take-gold
-> Refuse and stay safe => refuse

:: take-gold
The gold burns your hands!
Your health suffers, but you gain wealth.

-> Go home => home

:: refuse
You smile politely and walk away.

-> Go home => home

:: home
What have you learned?
`;

      const result = workflowExecute(dsl);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(0);
      
      const config = result.config!;
      expect(config.qualities.wealth.max).toBe(100);
      expect(config.qualities.health.default).toBe(50);
      expect(config.situations.start.links).toHaveLength(2);
    });
  });
});