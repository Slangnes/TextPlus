import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTranscriptText, transcriptToDsl } from '../../src/transcript';
import { workflowExecute } from '@textplus/author';

const FIXTURE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'mini-transcript.txt'),
  'utf8',
);

describe('parseTranscriptText', () => {
  const moves = parseTranscriptText(FIXTURE);

  it('segments the transcript into one move per command plus the opening', () => {
    expect(moves).toHaveLength(6);
    expect(moves[0].command).toBeNull();
    expect(moves.slice(1).map((m) => m.command)).toEqual([
      'open mailbox',
      'read leaflet',
      'go north',
      'take lantern',
      'down',
    ]);
  });

  it('detects ALL-CAPS and Title-Case room headers', () => {
    expect(moves[0].roomName).toBe('WEST OF HOUSE');
    expect(moves[3].roomName).toBe('The Reading Room');
    expect(moves[5].roomName).toBe('The Lower Stacks');
  });

  it('does not mistake prose or shouty responses for room headers', () => {
    // "WELCOME TO THE ARCHIVE!" ends with punctuation — prose, not a header.
    expect(moves[2].roomName).toBeNull();
    expect(moves[2].prose).toContain('WELCOME TO THE ARCHIVE!');
    // "Taken. ..." is a sentence.
    expect(moves[4].roomName).toBeNull();
  });

  it('strips bracketed score lines and *** banners', () => {
    const all = moves.map((m) => m.prose).join('\n');
    expect(all).not.toContain('[Score:');
    expect(all).not.toContain('***');
  });

  it('keeps multi-line prose intact', () => {
    expect(moves[0].prose).toContain('open field west of a white house');
    expect(moves[0].prose).toContain('small mailbox here');
  });
});

describe('transcriptToDsl', () => {
  const dsl = transcriptToDsl(FIXTURE);

  it('titles the story from the first room name by default', () => {
    expect(dsl.startsWith('title: WEST OF HOUSE')).toBe(true);
    expect(transcriptToDsl(FIXTURE, { title: 'Zork Walk' }).startsWith('title: Zork Walk')).toBe(true);
  });

  it('marks the first situation as start and slugifies room ids', () => {
    expect(dsl).toContain(':: west-of-house [start]');
    expect(dsl).toContain(':: the-reading-room');
    expect(dsl).toContain(':: the-lower-stacks');
  });

  it('links each move to the next using the sentence-cased command', () => {
    expect(dsl).toContain('-> Open mailbox => step-2');
    expect(dsl).toContain('-> Go north => the-reading-room');
    expect(dsl).toContain('-> Down => the-lower-stacks');
  });

  it('leaves the final situation linkless (an ending)', () => {
    const lastSection = dsl.slice(dsl.indexOf(':: the-lower-stacks'));
    expect(lastSection).not.toContain('->');
  });

  it('neutralizes prose lines that would lex as DSL directives', () => {
    expect(dsl).toContain('→ this arrow starts a line of prose');
    expect(dsl).toContain('∷ this also looks like a directive');
    expect(dsl).not.toMatch(/^\s*-> this arrow/m);
  });

  it('deduplicates repeated room ids', () => {
    const looped = transcriptToDsl(
      'The Hall\nA hall.\n\n> north\nThe Hall\nThe same hall again.\n',
    );
    expect(looped).toContain(':: the-hall [start]');
    expect(looped).toContain(':: the-hall-2');
  });

  it('throws on an empty transcript', () => {
    expect(() => transcriptToDsl('   \n  ')).toThrow(/no content/);
  });

  it('ACCEPTANCE: the generated DSL compiles with zero errors', () => {
    const result = workflowExecute(dsl);
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.config?.initialSituation).toBe('west-of-house');
    expect(Object.keys(result.config?.situations ?? {})).toHaveLength(6);
  });
});
