/// <reference types="vite/client" />
/**
 * TextPlus Workbench - Monaco Editor Host
 *
 * Wraps monaco-editor behind a small interface so the rest of the workbench
 * stays editor-agnostic. Provides: real line numbers that stay correct under
 * word wrap (continuations indent below their number), a Monarch grammar for
 * the TextPlus DSL, palette-matched light/dark themes, and diagnostic
 * squiggles via model markers.
 */

import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { DSL_LANGUAGE_ID, dslMonarchLanguage, dslThemes } from './dsl-language';

self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

const LANGUAGE_ID = DSL_LANGUAGE_ID;

export interface EditorMarker {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface WorkbenchEditor {
  getValue(): string;
  /** Programmatic replace; does NOT fire onChange (callers recompile themselves). */
  setValue(source: string): void;
  onChange(listener: () => void): void;
  onCursorChange(listener: (line: number, column: number) => void): void;
  focusLine(line: number): void;
  focus(): void;
  setWordWrap(on: boolean): void;
  setMarkers(markers: EditorMarker[]): void;
}

let languageReady = false;

function registerLanguage(): void {
  if (languageReady) {
    return;
  }
  languageReady = true;

  monaco.languages.register({ id: LANGUAGE_ID });
  monaco.languages.setMonarchTokensProvider(
    LANGUAGE_ID,
    dslMonarchLanguage as unknown as monaco.languages.IMonarchLanguage,
  );
  monaco.editor.defineTheme('textplus-light', dslThemes['textplus-light']);
  monaco.editor.defineTheme('textplus-dark', dslThemes['textplus-dark']);
}

export function createEditor(container: HTMLElement, initial: string): WorkbenchEditor {
  registerLanguage();

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const themeFor = (dark: boolean): string => (dark ? 'textplus-dark' : 'textplus-light');

  const editor = monaco.editor.create(container, {
    value: initial,
    language: LANGUAGE_ID,
    theme: themeFor(darkQuery.matches),
    wordWrap: 'on',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordBasedSuggestions: 'off',
    fixedOverflowWidgets: true,
  });

  darkQuery.addEventListener('change', (event) => {
    monaco.editor.setTheme(themeFor(event.matches));
  });

  let suppressChange = false;
  const changeListeners: Array<() => void> = [];
  editor.onDidChangeModelContent(() => {
    if (!suppressChange) {
      changeListeners.forEach((listener) => listener());
    }
  });

  return {
    getValue: () => editor.getValue(),

    setValue: (source) => {
      suppressChange = true;
      editor.setValue(source);
      suppressChange = false;
    },

    onChange: (listener) => {
      changeListeners.push(listener);
    },

    onCursorChange: (listener) => {
      editor.onDidChangeCursorPosition((event) => {
        listener(event.position.lineNumber, event.position.column);
      });
    },

    focusLine: (line) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      const clamped = Math.min(Math.max(1, line), model.getLineCount());
      editor.setSelection(new monaco.Selection(clamped, 1, clamped, model.getLineMaxColumn(clamped)));
      editor.revealLineInCenter(clamped);
      editor.focus();
    },

    focus: () => editor.focus(),

    setWordWrap: (on) => {
      editor.updateOptions({ wordWrap: on ? 'on' : 'off' });
    },

    setMarkers: (markers) => {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      monaco.editor.setModelMarkers(
        model,
        LANGUAGE_ID,
        markers.map((marker) => {
          const line = Math.min(Math.max(1, marker.line), model.getLineCount());
          return {
            startLineNumber: line,
            endLineNumber: line,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(line),
            message: marker.message,
            severity:
              marker.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          };
        }),
      );
    },
  };
}
