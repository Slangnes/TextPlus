import { describe, expect, it } from 'vitest';

import { parseGame } from '../../src';

const validDsl = `title: Lantern Roads
quality courage number = 5 min 0 max 10
quality hasKey boolean = false

:: start [intro, forest]
A Crossroads
You stand at a forest crossroads.
The wind carries the sound of water.

-> Follow the stream => stream
-> Enter the cave => cave ? courage >= 6

:: stream
Moonlit Stream
The stream is calm and cold.

-> Rest here => ending-peace
`;

describe('TextPlus Author - DSL Parser', () => {
  it('parses title and quality definitions', () => {
    const ast = parseGame(validDsl);

    expect(ast.title).toBe('Lantern Roads');
    expect(ast.qualities.courage).toEqual({
      id: 'courage',
      type: 'number',
      default: 5,
      min: 0,
      max: 10,
    });
    expect(ast.qualities.hasKey.default).toBe(false);
  });

  it('parses situations, tags, and multiline content', () => {
    const ast = parseGame(validDsl);

    expect(ast.situations.start.title).toBe('A Crossroads');
    expect(ast.situations.start.tags).toEqual(['intro', 'forest']);
    expect(ast.situations.start.content).toContain('forest crossroads');
    expect(ast.situations.start.content).toContain('sound of water');
  });

  it('parses links and optional conditions', () => {
    const ast = parseGame(validDsl);

    expect(ast.situations.start.links).toEqual([
      { text: 'Follow the stream', target: 'stream', condition: undefined },
      { text: 'Enter the cave', target: 'cave', condition: 'courage >= 6' },
    ]);
  });

  it('supports string qualities', () => {
    const ast = parseGame(`title: Colors\nquality mood string = calm\n\n:: start\nWake Up\nA quiet room.\n`);

    expect(ast.qualities.mood.default).toBe('calm');
  });

  it('reports a missing title with a line number', () => {
    expect(() => parseGame(':: start\nA Title\nBody')).toThrow('Line 1: missing game title');
  });

  it('reports invalid quality declarations', () => {
    expect(() => parseGame('title: Broken\nquality courage maybe = nope\n\n:: start\nTitle\nBody')).toThrow(
      'Line 2: invalid quality declaration',
    );
  });

  it('reports invalid boolean defaults', () => {
    expect(() => parseGame('title: Broken\nquality hasKey boolean = yes\n\n:: start\nTitle\nBody')).toThrow(
      'Line 2: invalid boolean default "yes"',
    );
  });

  it('reports malformed links with line numbers', () => {
    expect(() => parseGame('title: Broken\n\n:: start\nTitle\nBody\n-> nowhere')).toThrow(
      'Line 6: invalid link definition',
    );
  });
});
