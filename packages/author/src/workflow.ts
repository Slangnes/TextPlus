/**
 * TextPlus Author - DSL Workflow
 *
 * Coordinates the complete parse → compile → lint workflow
 * for transforming DSL source to valid game configuration.
 */

import type { AuthorGameAst } from './parser';
import type { GameConfig } from '@textplus/core';
import { parseGame } from './parser';
import { compileAST } from './compiler';
import { lintAST } from './linter';

export interface WorkflowResult {
  success: boolean;
  source: string;
  ast?: AuthorGameAst;
  config?: GameConfig | null;
  lintDiagnostics: Array<{
    severity: string;
    code: string;
    message: string;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Execute complete DSL → GameConfig workflow
 * Returns AST, compiled config, and all diagnostics
 */
export function workflowExecute(source: string): WorkflowResult {
  const result: WorkflowResult = {
    success: false,
    source,
    lintDiagnostics: [],
    errors: [],
    warnings: [],
  };

  // Step 1: Parse
  try {
    result.ast = parseGame(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Parse error: ${message}`);
    return result;
  }

  // Step 2: Lint (for early diagnostics)
  if (result.ast) {
    const lintOutput = lintAST(result.ast);
    result.lintDiagnostics = lintOutput.diagnostics;

    // Collect errors and warnings
    lintOutput.diagnostics.forEach((diag) => {
      const message = `[${diag.code}] ${diag.message}`;
      if (diag.severity === 'error') {
        result.errors.push(message);
      } else if (diag.severity === 'warning') {
        result.warnings.push(message);
      }
    });
  }

  // Step 3: Compile (even if lint warnings exist)
  if (result.ast) {
    const compileOutput = compileAST(result.ast);

    if (compileOutput.errors.length > 0) {
      compileOutput.errors.forEach((err) => {
        result.errors.push(`Compile error: ${err.message}`);
      });
    } else {
      result.config = compileOutput.config;
    }
  }

  // Determine overall success
  result.success = result.errors.length === 0 && !!result.config;

  return result;
}

/**
 * Format workflow results as a human-readable report
 */
export function formatWorkflowReport(result: WorkflowResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push('✅ DSL compilation successful\n');
  } else {
    lines.push('❌ DSL compilation failed\n');
  }

  if (result.config) {
    lines.push(`📋 Game: "${result.config.title}"`);
    lines.push(`   Initial: ${result.config.initialSituation}`);
    lines.push(`   Situations: ${Object.keys(result.config.situations).length}`);
    lines.push(`   Qualities: ${Object.keys(result.config.qualities).length}\n`);
  }

  if (result.errors.length > 0) {
    lines.push(`❌ Errors (${result.errors.length}):`);
    result.errors.forEach((err) => {
      lines.push(`   - ${err}`);
    });
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠️ Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warn) => {
      lines.push(`   - ${warn}`);
    });
    lines.push('');
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push('No issues detected');
  }

  return lines.join('\n');
}

/**
 * Serialize workflow result to JSON for file output
 */
export function serializeWorkflowResult(result: WorkflowResult): string {
  return JSON.stringify(
    {
      success: result.success,
      config: result.config,
      diagnostics: result.lintDiagnostics,
      errors: result.errors,
      warnings: result.warnings,
    },
    null,
    2,
  );
}
