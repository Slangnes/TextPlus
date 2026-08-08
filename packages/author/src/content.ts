/**
 * TextPlus Author - Content Pipeline (Markdown + Adaptive Text)
 *
 * Situation prose is HTML-escaped first (closing the raw-innerHTML injection
 * surface), then given minimal markdown (paragraphs on blank lines, **bold**,
 * *emphasis*, `code`), then adaptive-text spans are evaluated per render:
 *
 *   [oneOf: a | b | c]     cycles through options in order (wraps)
 *   [randomly: a | b]      uniform random pick each render
 *   [frequently: text]     shows ~70% of renders
 *   [rarely: text]         shows ~20% of renders
 *   {quality-id}           interpolates the quality's current value
 *
 * Static content compiles to a plain HTML string; content using adaptive
 * spans or interpolation compiles to a throw-free function over the
 * qualities Record (core's first-attempt content dispatch shape).
 */

import type { QualitiesRecord } from './expression';

export type Rng = () => number;

/** Deterministic mulberry32 PRNG; unseeded falls back to Math.random. */
export function createRng(seed?: number): Rng {
  if (seed === undefined) {
    return Math.random;
  }
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Markdown ----------------------------------------------------------------

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Escape-first minimal markdown: paragraphs, bold, emphasis, inline code. */
export function markdownToHtml(raw: string): string {
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${inlineMarkdown(escapeHtml(block)).replace(/\n/g, ' ')}</p>`);
  return paragraphs.join('\n');
}

// --- Adaptive text -----------------------------------------------------------

const ADAPTIVE_PATTERN = /\[(oneOf|randomly|frequently|rarely):([^\]]*)\]/g;
const INTERPOLATION_PATTERN = /\{([a-zA-Z][\w-]*)\}/g;

/** True when the raw prose contains adaptive spans or quality interpolation. */
export function hasDynamicContent(raw: string): boolean {
  ADAPTIVE_PATTERN.lastIndex = 0;
  INTERPOLATION_PATTERN.lastIndex = 0;
  return ADAPTIVE_PATTERN.test(raw) || INTERPOLATION_PATTERN.test(raw);
}

function renderAdaptive(raw: string, rng: Rng, cycles: Map<number, number>): string {
  let spanIndex = 0;
  return raw.replace(ADAPTIVE_PATTERN, (_match, kind: string, body: string) => {
    const index = spanIndex;
    spanIndex += 1;
    const options = body.split('|').map((option: string) => option.trim());

    switch (kind) {
      case 'oneOf': {
        const seen = cycles.get(index) ?? 0;
        cycles.set(index, seen + 1);
        return options[seen % options.length] ?? '';
      }
      case 'randomly':
        return options[Math.floor(rng() * options.length)] ?? '';
      case 'frequently':
        return rng() < 0.7 ? body.trim() : '';
      case 'rarely':
        return rng() < 0.2 ? body.trim() : '';
      default:
        return '';
    }
  });
}

function interpolateQualities(raw: string, qualities: QualitiesRecord): string {
  return raw.replace(INTERPOLATION_PATTERN, (match, id: string) => {
    const value = qualities[id]?.value;
    return value === undefined ? match : String(value);
  });
}

// --- Compilation -------------------------------------------------------------

export type CompiledContent = string | ((qualities: QualitiesRecord) => string);

/**
 * Compile raw DSL prose. Static prose becomes an HTML string; dynamic prose
 * becomes a throw-free render function holding its own oneOf counters.
 */
export function compileContent(raw: string, rng: Rng = createRng()): CompiledContent {
  if (!hasDynamicContent(raw)) {
    return markdownToHtml(raw);
  }

  const cycles = new Map<number, number>();
  return (qualities: QualitiesRecord) => {
    try {
      const adapted = renderAdaptive(raw, rng, cycles);
      const interpolated = interpolateQualities(adapted, qualities ?? {});
      return markdownToHtml(interpolated);
    } catch {
      return markdownToHtml(raw);
    }
  };
}

/** Quality ids referenced via {interpolation} (for linting usage credit). */
export function collectInterpolationRefs(raw: string): string[] {
  const refs = new Set<string>();
  for (const match of raw.matchAll(INTERPOLATION_PATTERN)) {
    refs.add(match[1]);
  }
  return [...refs];
}
