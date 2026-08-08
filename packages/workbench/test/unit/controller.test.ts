import { describe, it, expect } from 'vitest';
import { analyzeSource, extractLineNumber } from '../../src/controller';

const VALID_SOURCE = `title: Test Game

quality mood number = 3 min 0 max 10

:: start [start]
Opening
Your mood is bright.

-> Continue => second

:: second
Second
The end of the test, in a fine mood.
`;

describe('extractLineNumber', () => {
  it('pulls the line number from parser-style messages', () => {
    expect(extractLineNumber('Parse error: Line 12: invalid link definition')).toBe(12);
  });

  it('returns null when no line marker is present', () => {
    expect(extractLineNumber('[broken-link] Situation "a": bad target')).toBeNull();
  });
});

describe('analyzeSource', () => {
  it('reports empty status for blank source', () => {
    const report = analyzeSource('   \n  ');
    expect(report.status).toBe('empty');
    expect(report.config).toBeNull();
    expect(report.issues).toHaveLength(0);
  });

  it('compiles valid source to ok with config and summary', () => {
    const report = analyzeSource(VALID_SOURCE);
    expect(report.status).toBe('ok');
    expect(report.config).not.toBeNull();
    expect(report.config?.title).toBe('Test Game');
    expect(report.config?.initialSituation).toBe('start');
    expect(report.summary).toBe('2 situations · 1 qualities');
    expect(report.issues).toHaveLength(0);
  });

  it('reports parse errors with line numbers', () => {
    const report = analyzeSource('not a valid opening line');
    expect(report.status).toBe('error');
    expect(report.config).toBeNull();
    expect(report.issues.some((i) => i.severity === 'error' && i.line !== null)).toBe(true);
  });

  it('reports broken links as errors', () => {
    const source = `title: Broken

:: start [start]
Start
Text.

-> Go => missing
`;
    const report = analyzeSource(source);
    expect(report.status).toBe('error');
    expect(report.config).toBeNull();
    expect(report.issues.some((i) => i.message.includes('missing'))).toBe(true);
  });

  it('reports orphaned situations as warnings but still compiles', () => {
    const source = `title: Orphans

:: start [start]
Start
Nothing links onward.

:: island
Island
Nobody can reach this island.
`;
    const report = analyzeSource(source);
    expect(report.status).toBe('warning');
    expect(report.config).not.toBeNull();
    expect(report.issues.some((i) => i.severity === 'warning' && i.message.includes('island'))).toBe(true);
  });
});
