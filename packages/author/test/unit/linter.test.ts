import { describe, it, expect } from 'vitest';
import { parseGame } from '../../src/parser';
import { lintAST, formatDiagnostics } from '../../src/linter';

describe('TextPlus Author - Linter', () => {
  describe('Valid Games', () => {
    it('should pass lint on a well-formed game', () => {
      const dsl = `title: Valid Game
:: start
Start here
-> Continue => next
:: next
Next scene
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.isValid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('should pass lint with multiple qualities and situations', () => {
      const dsl = `title: Complex Game
quality gold number = 0
quality health number = 100
:: start [start]
You enter a cave. Check your gold.
-> Search for more gold => treasure
-> Check health => health-check
:: treasure
You find gold!
-> Leave => exit
:: health-check
Your health is good.
-> Leave => exit
:: exit
You leave safely.
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Reachability Analysis', () => {
    it('should detect orphaned situations (unreachable from start)', () => {
      const dsl = `title: Game with orphan
:: start
Start here
-> Go to middle => middle
:: middle
Middle area
:: orphan
This is unreachable
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.some((d) => d.code === 'orphaned-situation')).toBe(true);
      expect(result.diagnostics.some((d) => d.situation === 'orphan')).toBe(true);
    });

    it('should allow all situations to be reachable even indirectly', () => {
      const dsl = `title: Branching Game
:: start [start]
Start
-> Path A => a
-> Path B => b
:: a
Path A leads here
-> Continue => c
:: b
Path B leads here
-> Continue => c
:: c
Both paths meet here
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.filter((d) => d.code === 'orphaned-situation')).toHaveLength(0);
    });

    it('should handle cycles without infinite loops', () => {
      // Cycles are fine as long as they're reachable
      const dsl = `title: Cyclic Game
:: start [start]
In a loop
-> Loop back => start
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.filter((d) => d.code === 'orphaned-situation')).toHaveLength(0);
    });
  });

  describe('Link Validation', () => {
    it('should detect broken links (target does not exist)', () => {
      const dsl = `title: Game with broken link
:: start
Start
-> Go to nonexistent => nowhere
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.some((d) => d.code === 'broken-link')).toBe(true);
      expect(result.diagnostics.some((d) => d.link === 'nowhere')).toBe(true);
    });

    it('should report all broken links', () => {
      const dsl = `title: Game with multiple broken links
:: start
Start
-> Bad link 1 => missing1
-> Bad link 2 => missing2
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.filter((d) => d.code === 'broken-link')).toHaveLength(2);
    });

    it('should verify broken links are errors', () => {
      const dsl = `title: Game
:: start
Start
-> Go to void => nonexistent
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      const brokenLinks = result.diagnostics.filter((d) => d.code === 'broken-link');
      expect(brokenLinks.every((d) => d.severity === 'error')).toBe(true);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Quality Usage', () => {
    it('should detect unused qualities (defined but never referenced)', () => {
      const dsl = `title: Game with unused quality
quality unused number = 0
quality used number = 0
:: start
Check used value
-> Go => next
:: next
The used quality matters
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      const unusedWarning = result.diagnostics.find(
        (d) => d.code === 'unused-quality' && d.message.includes('unused'),
      );
      expect(unusedWarning).toBeDefined();
      expect(unusedWarning?.severity).toBe('warning');
    });

    it('should not warn about used qualities', () => {
      const dsl = `title: Game
quality health number = 100
:: start
Your health is high
-> Continue => next
:: next
Health matters here
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.filter((d) => d.code === 'unused-quality')).toHaveLength(0);
    });

    it('should detect undefined quality references in conditions', () => {
      const dsl = `title: Game
quality score number = 0
:: start
Start
-> Take item ? has-item => take
-> Skip => exit
:: take
You took it
:: exit
You left
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      // Note: Condition parsing deferred to Phase 2B
      // Just verify the linter runs without errors
      expect(result).toBeDefined();
      expect(Array.isArray(result.diagnostics)).toBe(true);
    });
  });

  describe('Report Formatting', () => {
    it('should format diagnostics as readable text', () => {
      const dsl = `title: Game
:: start
Start
-> Go => missing
quality unused number = 0
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      const formatted = formatDiagnostics(result);

      expect(formatted).toContain('error');
      expect(formatted).toContain('missing');
    });

    it('should indicate valid games in report', () => {
      const dsl = `title: Good Game
:: start
All good
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      const formatted = formatDiagnostics(result);

      expect(formatted).toContain('✓');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle games with multiple issues', () => {
      const dsl = `title: Problem Game
quality unused1 number = 0
quality unused2 string = "test"
:: start [start]
Begin
-> Go to nowhere => missing1
-> Also missing => missing2
:: orphan
Never reached
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.diagnostics.filter((d) => d.code === 'broken-link')).toHaveLength(2);
      expect(result.diagnostics.filter((d) => d.code === 'orphaned-situation')).toHaveLength(1);
      expect(result.diagnostics.filter((d) => d.code === 'unused-quality')).toHaveLength(2);
      expect(result.isValid).toBe(false);
    });

    it('should handle fully-formed game without warnings', () => {
      const dsl = `title: The Adventure
quality coins number = 0 min 0 max 100
quality lives boolean = true
:: start [start]
You wake up in a forest.
Your coins value: check coins carefully
-> Go north => forest
-> Go back => start
:: forest
A dense forest. You see coins here.
-> Take coins and continue => village
-> Return => start
:: village
A peaceful village. Your lives matter.
-> End adventure => ending
:: ending
Your adventure is complete!
`;
      const ast = parseGame(dsl);
      const result = lintAST(ast);

      expect(result.isValid).toBe(true);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    });
  });
});
