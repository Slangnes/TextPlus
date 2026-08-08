import { describe, it, expect } from 'vitest';
import { markdownToHtml, compileContent, hasDynamicContent, collectInterpolationRefs, createRng } from '../../src/content';

describe('markdownToHtml', () => {
  it('wraps blank-line-separated blocks in paragraphs', () => {
    expect(markdownToHtml('First block.\n\nSecond block.')).toBe('<p>First block.</p>\n<p>Second block.</p>');
  });

  it('joins single newlines within a paragraph', () => {
    expect(markdownToHtml('One line\nand another.')).toBe('<p>One line and another.</p>');
  });

  it('renders bold, emphasis, and inline code', () => {
    expect(markdownToHtml('**bold** and *soft* and `code`')).toBe(
      '<p><strong>bold</strong> and <em>soft</em> and <code>code</code></p>',
    );
  });

  it('escapes raw HTML before formatting (closes the injection surface)', () => {
    expect(markdownToHtml('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
    expect(markdownToHtml('Tom & "Huck" <b>')).toBe('<p>Tom &amp; &quot;Huck&quot; &lt;b&gt;</p>');
  });
});

describe('compileContent', () => {
  it('returns a plain string for static prose', () => {
    const compiled = compileContent('Just words.');
    expect(typeof compiled).toBe('string');
    expect(compiled).toBe('<p>Just words.</p>');
  });

  it('returns a function for dynamic prose and never throws', () => {
    const compiled = compileContent('Courage: {courage}', createRng(1));
    expect(typeof compiled).toBe('function');
    const render = compiled as (q: never) => string;
    expect(() => render(undefined as never)).not.toThrow();
  });
});

describe('detection & refs', () => {
  it('detects adaptive spans and interpolation', () => {
    expect(hasDynamicContent('[oneOf: a | b]')).toBe(true);
    expect(hasDynamicContent('Value {courage}')).toBe(true);
    expect(hasDynamicContent('plain **markdown** only')).toBe(false);
  });

  it('collects interpolation refs', () => {
    expect(collectInterpolationRefs('{courage} and {has-key} and {courage}').sort()).toEqual([
      'courage',
      'has-key',
    ]);
  });
});
