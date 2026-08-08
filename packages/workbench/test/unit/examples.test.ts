import { describe, it, expect } from 'vitest';
import { analyzeSource } from '../../src/controller';
import { SAMPLE_STORY, BLANK_TEMPLATE, EXAMPLES } from '../../src/examples';

describe('starter content', () => {
  EXAMPLES.forEach((example) => {
    it(`example "${example.id}" compiles with no errors or warnings`, () => {
      const report = analyzeSource(example.source);
      expect(report.issues).toEqual([]);
      expect(report.status).toBe('ok');
      expect(report.config).not.toBeNull();
    });
  });

  it('examples cover all three demo games plus the DSL tour', () => {
    const ids = EXAMPLES.map((e) => e.id);
    expect(ids).toContain('dusty-archive');
    expect(ids).toContain('hello-world');
    expect(ids).toContain('detective-case');
    expect(ids).toContain('memory-keeper');
  });

  it('sample story exercises situations, qualities, and endings', () => {
    const report = analyzeSource(SAMPLE_STORY);
    const config = report.config!;
    expect(Object.keys(config.situations).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(config.qualities).length).toBeGreaterThanOrEqual(2);
    const endings = Object.values(config.situations).filter((s) => (s.links ?? []).length === 0);
    expect(endings.length).toBeGreaterThanOrEqual(2);
  });

  it('blank template compiles clean', () => {
    const report = analyzeSource(BLANK_TEMPLATE);
    expect(report.issues).toEqual([]);
    expect(report.status).toBe('ok');
  });
});
