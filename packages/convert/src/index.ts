/**
 * TextPlus Convert - Automating Transmatte
 * 
 * Main entry point for TextPlus Convert library.
 * This will parse IF transcripts and convert them to multiple formats.
 * 
 * Milestone 4 Implementation will add:
 * - Transcript parser for Z-machine, Glulx, Inform 7, TADS 3
 * - Multi-transcript merging for branching paths
 * - Code generation: Raconteur DSL, standalone HTML, Trizbort maps
 * - CLI interface for batch conversion
 * - Transcript validation and repair
 */

export const VERSION = '0.0.1';

// Implemented: plain-text transcript → linear DSL story.
export { parseTranscriptText, transcriptToDsl } from './transcript';
export type { TranscriptMove, TranscriptToDslOptions } from './transcript';

// Implemented: multi-transcript merge → branching DSL story.
export { mergeTranscriptsToDsl } from './merge';
export type { MergeOptions } from './merge';

// Implemented: ZIL deconstruction — the actual program → DSL, no transcript.
export { zilToDsl } from './zil';
export type { ZilToDslOptions } from './zil';

export interface TranscriptParseOptions {
  engine?: 'zmachine' | 'glulx' | 'inform7' | 'tads3';
  mergeBranches?: boolean;
  validateOutput?: boolean;
}

export interface ParsedGame {
  title?: string;
  situations?: Record<string, any>;
  qualities?: Record<string, any>;
  map?: any;
}

export function parseTranscript(
  _transcriptText: string,
  _options?: TranscriptParseOptions
): ParsedGame {
  throw new Error('Not yet implemented - placeholder for M4');
}

export function generateDSL(_game: ParsedGame): string {
  throw new Error('Not yet implemented - placeholder for M4');
}

export function generateHTML(_game: ParsedGame): string {
  throw new Error('Not yet implemented - placeholder for M4');
}
