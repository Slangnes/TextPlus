/**
 * TextPlus Author - Linter
 *
 * Validates AuthorGameAst and compiled GameConfig for diagnostic issues.
 * Detects orphaned situations, broken links, unused qualities, and more.
 */

import type { AuthorGameAst } from './parser';

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintDiagnostic {
  severity: LintSeverity;
  code: string;
  message: string;
  situation?: string;
  link?: string;
}

export interface LintOutput {
  diagnostics: LintDiagnostic[];
  isValid: boolean;
}

/**
 * Find all situations reachable from the initial situation
 */
function findReachable(ast: AuthorGameAst): Set<string> {
  const startSituation = Object.values(ast.situations).find((s) => s.tags.includes('start'));
  const initial = startSituation?.id || Object.keys(ast.situations)[0];

  if (!initial) {
    return new Set();
  }

  const reachable = new Set<string>();
  const queue = [initial];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || reachable.has(current)) {
      continue;
    }

    reachable.add(current);

    const situation = ast.situations[current];
    if (!situation) {
      continue;
    }

    situation.links.forEach((link) => {
      if (!reachable.has(link.target)) {
        queue.push(link.target);
      }
    });
  }

  return reachable;
}

/**
 * Extract quality references from situation content strings
 * (Deferred to Phase 2B for proper condition parsing)
 */

/**
 * Main linter: validate AST for common issues
 */
export function lintAST(ast: AuthorGameAst): LintOutput {
  const diagnostics: LintDiagnostic[] = [];

  // Check for orphaned situations (unreachable from start)
  const reachable = findReachable(ast);
  Object.keys(ast.situations).forEach((situationId) => {
    if (!reachable.has(situationId)) {
      diagnostics.push({
        severity: 'warning',
        code: 'orphaned-situation',
        message: `Situation "${situationId}" is not reachable from the starting situation`,
        situation: situationId,
      });
    }
  });

  // Check for broken links (targets don't exist)
  Object.entries(ast.situations).forEach(([situationId, situation]) => {
    situation.links.forEach((link, index) => {
      if (!ast.situations[link.target]) {
        diagnostics.push({
          severity: 'error',
          code: 'broken-link',
          message: `Situation "${situationId}": Link ${index} targets undefined situation "${link.target}"`,
          situation: situationId,
          link: link.target,
        });
      }
    });
  });

  // Check for unused qualities (defined but never referenced)
  const usedQualities = new Set<string>();
  Object.values(ast.situations).forEach((situation) => {
    const content = `${situation.title} ${situation.content}`.toLowerCase();
    const conditions = situation.links.map((l) => (l.condition || '').toLowerCase()).join(' ');
    const fullText = `${content} ${conditions}`;

    Object.keys(ast.qualities).forEach((qualityId) => {
      if (fullText.includes(qualityId.toLowerCase())) {
        usedQualities.add(qualityId);
      }
    });
  });

  Object.keys(ast.qualities).forEach((qualityId) => {
    if (!usedQualities.has(qualityId)) {
      diagnostics.push({
        severity: 'warning',
        code: 'unused-quality',
        message: `Quality "${qualityId}" is defined but never used`,
      });
    }
  });

  // Check for undefined quality references in conditions
  // (Deferred to Phase 2B for proper condition parsing)
  // Currently a placeholder - would need proper expression parser
  // to detect quality references in conditional expressions

  // Determine validity: errors block validity, warnings don't
  const isValid = diagnostics.every((d) => d.severity !== 'error');

  return {
    diagnostics,
    isValid,
  };
}

/**
 * Format diagnostics as a readable report
 */
export function formatDiagnostics(output: LintOutput): string {
  if (output.diagnostics.length === 0) {
    return '✓ No linting issues detected';
  }

  const lines: string[] = [];
  const bySeverity = {
    error: output.diagnostics.filter((d) => d.severity === 'error'),
    warning: output.diagnostics.filter((d) => d.severity === 'warning'),
    info: output.diagnostics.filter((d) => d.severity === 'info'),
  };

  if (bySeverity.error.length > 0) {
    lines.push(`❌ ${bySeverity.error.length} error(s):`);
    bySeverity.error.forEach((d) => {
      lines.push(`  [${d.code}] ${d.message}`);
    });
  }

  if (bySeverity.warning.length > 0) {
    lines.push(`⚠️ ${bySeverity.warning.length} warning(s):`);
    bySeverity.warning.forEach((d) => {
      lines.push(`  [${d.code}] ${d.message}`);
    });
  }

  if (bySeverity.info.length > 0) {
    lines.push(`ℹ️ ${bySeverity.info.length} info:`);
    bySeverity.info.forEach((d) => {
      lines.push(`  [${d.code}] ${d.message}`);
    });
  }

  return lines.join('\n');
}
