/**
 * TextPlus Workbench - DSL Language Definition (plain data)
 *
 * The Monarch grammar and editor themes for the TextPlus DSL, kept free of
 * monaco imports so the definitions are unit-testable in Node
 * (test/unit/dsl-language.test.ts). editor.ts feeds these to Monaco.
 *
 * Monarch group rule contract: every capture group maps to one token, and the
 * concatenation of all groups must reproduce the whole match — the unit tests
 * enforce that property for each line rule.
 */

export const DSL_LANGUAGE_ID = 'textplus';

type GroupRule = [RegExp, string[]];
type SimpleRule = [RegExp, string];

export interface DslMonarchLanguage {
  defaultToken: string;
  tokenizer: {
    root: Array<GroupRule | SimpleRule>;
  };
}

/** Line-level rules (group form). Order matters: first match wins. */
export const LINE_RULES: GroupRule[] = [
  // title: The Dusty Archive
  [/^(title:)(.*)$/, ['keyword', 'string']],
  // quality courage number = 5 min 0 max 10
  [
    /^(quality)(\s+)([a-zA-Z][\w-]*)(\s+)(number|boolean|string)(.*)$/,
    ['keyword', 'white', 'variable', 'white', 'type', 'constant'],
  ],
  // hud courage meter "Courage"
  [
    /^(hud)(\s+)([a-zA-Z][\w-]*)(\s+)(meter|badge|readout)((?:\s+"[^"]*")?)(\s*)$/,
    ['keyword', 'white', 'variable', 'white', 'type', 'string', 'white'],
  ],
  // theme dark when sanity < 30
  [
    /^(theme)(\s+)([a-zA-Z][\w-]*)(\s+)(when)(\s+)(.*)$/,
    ['keyword', 'white', 'string', 'white', 'keyword', 'white', 'annotation'],
  ],
  // :: situation-id [tags, here]
  [
    /^(::)(\s+)([a-zA-Z][\w-]*)((?:\s+\[[^\]]*\])?)(\s*)$/,
    ['metatag', 'white', 'type.identifier', 'tag', 'white'],
  ],
  // -> Link text => target ? condition { effects }
  [
    /^(\s*)(->)(\s+)(.+?)(\s+=>\s+)([a-zA-Z][\w-]*)((?:\s+\?\s+[^{]+?)?)((?:\s*\{.*\})?)(\s*)$/,
    ['white', 'operators', 'white', 'string', 'operators', 'type.identifier', 'annotation', 'attribute', 'white'],
  ],
  // { entry effects }
  [/^(\s*)(\{)(.*?)(\})(\s*)$/, ['white', 'operators', 'attribute', 'operators', 'white']],
];

/** Inline prose rules (adaptive spans, interpolation, markdown markers). */
export const PROSE_RULES: SimpleRule[] = [
  [/\[(?:oneOf|randomly|frequently|rarely):[^\]]*\]/, 'annotation'],
  [/\{[a-zA-Z][\w-]*\}/, 'variable'],
  [/\*\*[^*]+\*\*/, 'strong'],
  [/\*[^*]+\*/, 'emphasis'],
  [/`[^`]+`/, 'string.code'],
];

export const dslMonarchLanguage: DslMonarchLanguage = {
  defaultToken: '',
  tokenizer: {
    root: [...LINE_RULES, ...PROSE_RULES],
  },
};

// --- Themes (palette-matched to the workbench CSS variables) -----------------

interface ThemeRule {
  token: string;
  foreground?: string;
  fontStyle?: string;
}

export interface DslThemeData {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: ThemeRule[];
  colors: Record<string, string>;
}

export const dslThemes: Record<'textplus-light' | 'textplus-dark', DslThemeData> = {
  'textplus-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'metatag', foreground: '2c1810', fontStyle: 'bold' },
      { token: 'type.identifier', foreground: '2c1810', fontStyle: 'bold' },
      { token: 'keyword', foreground: '9a6d1f' },
      { token: 'type', foreground: '3f7d4e' },
      { token: 'string', foreground: '8b6f47' },
      { token: 'string.code', foreground: 'b3453a' },
      { token: 'variable', foreground: '7a5c9e' },
      { token: 'tag', foreground: '3f7d4e' },
      { token: 'annotation', foreground: '2a7a9b' },
      { token: 'attribute', foreground: 'b3453a' },
      { token: 'operators', foreground: '9a6d1f', fontStyle: 'bold' },
      { token: 'constant', foreground: '3f7d4e' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editorLineNumber.foreground': '#8a8378',
    },
  },
  'textplus-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'metatag', foreground: 'fef5e7', fontStyle: 'bold' },
      { token: 'type.identifier', foreground: 'fef5e7', fontStyle: 'bold' },
      { token: 'keyword', foreground: 'd9b36a' },
      { token: 'type', foreground: '8cc39a' },
      { token: 'string', foreground: 'd4a574' },
      { token: 'string.code', foreground: 'e08a80' },
      { token: 'variable', foreground: 'b79fd8' },
      { token: 'tag', foreground: '8cc39a' },
      { token: 'annotation', foreground: '7ec3dd' },
      { token: 'attribute', foreground: 'e08a80' },
      { token: 'operators', foreground: 'd9b36a', fontStyle: 'bold' },
      { token: 'constant', foreground: '8cc39a' },
      { token: 'strong', fontStyle: 'bold' },
      { token: 'emphasis', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#3d3935',
      'editorLineNumber.foreground': '#9a938a',
    },
  },
};
