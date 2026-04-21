/**
 * TextPlus Author - Modern Raconteur Authoring DSL
 * 
 * Main entry point for TextPlus Author library.
 * This will export the DSL parser, compiler, and linting tools.
 * 
 * Milestone 2 Implementation will add:
 * - DSL parser and lexer
 * - Compilation to TextPlus Core format
 * - Markdown content processing
 * - Adaptive text helpers (oneOf, randomly, etc)
 * - Situation linting and validation
 * - Project scaffolding CLI
 * - Hot module reloading support
 * - Situation graph visualization
 */

import { parseGame } from './parser';
import { compileAST } from './compiler';
import { lintAST, formatDiagnostics } from './linter';
import { workflowExecute, formatWorkflowReport, serializeWorkflowResult } from './workflow';

export const VERSION = '0.0.1';

export { parseGame };
export { compileAST };
export { lintAST, formatDiagnostics };
export { workflowExecute, formatWorkflowReport, serializeWorkflowResult };
export type {
  AuthorGameAst,
  AuthorLinkNode,
  AuthorQualityNode,
  AuthorQualityType,
  AuthorSituationNode,
} from './parser';
export type { CompileError, CompileOutput } from './compiler';
export type { LintDiagnostic, LintOutput, LintSeverity } from './linter';
export type { WorkflowResult } from './workflow';

export interface CompileOptions {
  markdown?: boolean;
  validate?: boolean;
  linting?: boolean;
}

export interface CompileResult {
  game?: any;
  errors?: string[];
  warnings?: string[];
}

export function compileGame(_source: string, _options?: CompileOptions): CompileResult {
  throw new Error('Not yet implemented - placeholder for M2');
}

export function createScaffold(_name: string, _outputDir: string): Promise<void> {
  throw new Error('Not yet implemented - placeholder for M2');
}
