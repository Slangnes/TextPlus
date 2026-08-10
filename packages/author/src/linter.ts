/**
 * TextPlus Author - Linter
 *
 * Validates AuthorGameAst and compiled GameConfig for diagnostic issues.
 * Detects orphaned situations, broken links, unused qualities, and more.
 */

import type { AuthorGameAst } from './parser';
import { resolveInitialSituation } from './parser';
import { parseExpression, collectQualityRefs } from './expression';
import type { ExprNode } from './expression';
import { parseEffects, collectEffectRefs, CAPTURE_PATTERN } from './effects';
import { collectInterpolationRefs } from './content';

const ORDERED_OPS = new Set(['<', '>', '<=', '>=']);

/**
 * Walk a condition AST reporting declared non-number qualities used in
 * ordered comparisons (booleans/strings coerce to nonsense under < >).
 */
function findOrderedComparisonMisuse(
  node: ExprNode,
  ast: AuthorGameAst,
  report: (qualityId: string, op: string) => void,
): void {
  if (node.kind === 'binary') {
    if (ORDERED_OPS.has(node.op)) {
      [node.left, node.right].forEach((side) => {
        if (side.kind === 'ref') {
          const declared = ast.qualities[side.qualityId];
          if (declared && declared.type !== 'number') {
            report(side.qualityId, node.op);
          }
        }
      });
    }
    findOrderedComparisonMisuse(node.left, ast, report);
    findOrderedComparisonMisuse(node.right, ast, report);
  } else if (node.kind === 'unary') {
    findOrderedComparisonMisuse(node.operand, ast, report);
  }
}

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintDiagnostic {
  severity: LintSeverity;
  code: string;
  message: string;
  situation?: string;
  link?: string;
  /** 1-based source line, when known. */
  line?: number;
}

export interface LintOutput {
  diagnostics: LintDiagnostic[];
  isValid: boolean;
}

/**
 * Find all situations reachable from the initial situation
 */
function findReachable(ast: AuthorGameAst): Set<string> {
  const initial = resolveInitialSituation(ast);

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
      if (link.target !== undefined && !reachable.has(link.target)) {
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

  // Check for broken links (targets don't exist; blocked links have none)
  Object.entries(ast.situations).forEach(([situationId, situation]) => {
    situation.links.forEach((link, index) => {
      if (link.target !== undefined && !ast.situations[link.target]) {
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

  // Validate conditions and effects (parse errors, unknown/mistyped qualities)
  const declaredQualities = new Set(Object.keys(ast.qualities));
  const declaredTasks = new Set((ast.tasks ?? []).map((task) => task.id));
  const capturedTasks = new Set<string>();
  const structuredRefs = new Set<string>();

  const lineOf = (kind: 'links' | 'entryEffects', situationId: string, index: number): number | undefined =>
    ast.positions?.[kind]?.[situationId]?.[index];
  const prefix = (line: number | undefined): string => (line !== undefined ? `Line ${line}: ` : '');

  const checkEffects = (source: string, line: number | undefined, situationId: string): void => {
    let nodes;
    try {
      nodes = parseEffects(source);
    } catch (error) {
      // The block failed, but any well-formed captures in it still name
      // their tasks — otherwise the parse error would also fabricate an
      // unused-task warning for a task the author plainly captures.
      source.split(',').forEach((part) => {
        const captured = CAPTURE_PATTERN.exec(part.trim());
        if (captured) {
          capturedTasks.add(captured[1]);
        }
      });
      diagnostics.push({
        severity: 'error',
        code: 'effect-parse-error',
        message: `${prefix(line)}invalid effects "{ ${source} }": ${(error as Error).message}`,
        situation: situationId,
        line,
      });
      return;
    }
    collectEffectRefs(nodes).forEach((ref) => structuredRefs.add(ref));
    nodes.forEach((node) => {
      if (node.kind === 'capture') {
        capturedTasks.add(node.taskId);
        if (!declaredTasks.has(node.taskId)) {
          diagnostics.push({
            severity: 'warning',
            code: 'unknown-task-in-capture',
            message: `${prefix(line)}capture references undeclared task "${node.taskId}"`,
            situation: situationId,
            line,
          });
        }
        return;
      }
      if (!declaredQualities.has(node.qualityId)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unknown-quality-in-effect',
          message: `${prefix(line)}effect references undeclared quality "${node.qualityId}"`,
          situation: situationId,
          line,
        });
      } else if (node.kind === 'mutate' && ast.qualities[node.qualityId].type !== 'number') {
        diagnostics.push({
          severity: 'error',
          code: 'effect-type-mismatch',
          message: `${prefix(line)}cannot apply += or -= to non-number quality "${node.qualityId}"`,
          situation: situationId,
          line,
        });
      } else if (node.kind === 'set' && typeof node.value !== ast.qualities[node.qualityId].type) {
        diagnostics.push({
          severity: 'error',
          code: 'effect-type-mismatch',
          message: `${prefix(line)}cannot assign ${typeof node.value} value to ${ast.qualities[node.qualityId].type} quality "${node.qualityId}"`,
          situation: situationId,
          line,
        });
      }
    });
  };

  Object.entries(ast.situations).forEach(([situationId, situation]) => {
    situation.links.forEach((link, index) => {
      const line = lineOf('links', situationId, index);
      if (link.condition) {
        try {
          const expr = parseExpression(link.condition);
          collectQualityRefs(expr).forEach((ref) => {
            structuredRefs.add(ref);
            if (!declaredQualities.has(ref)) {
              diagnostics.push({
                severity: 'warning',
                code: 'unknown-quality-in-condition',
                message: `${prefix(line)}condition references undeclared quality "${ref}"`,
                situation: situationId,
                line,
              });
            }
          });
          findOrderedComparisonMisuse(expr, ast, (qualityId, op) => {
            diagnostics.push({
              severity: 'warning',
              code: 'condition-type-mismatch',
              message: `${prefix(line)}condition compares non-number quality "${qualityId}" with "${op}"`,
              situation: situationId,
              line,
            });
          });
        } catch (error) {
          diagnostics.push({
            severity: 'error',
            code: 'condition-parse-error',
            message: `${prefix(line)}invalid condition "${link.condition}": ${(error as Error).message}`,
            situation: situationId,
            line,
          });
        }
      }
      if (link.effects) {
        checkEffects(link.effects, line, situationId);
      }
    });

    (situation.onEnterEffects ?? []).forEach((source, index) => {
      checkEffects(source, lineOf('entryEffects', situationId, index), situationId);
    });

    collectInterpolationRefs(situation.content).forEach((ref) => structuredRefs.add(ref));
  });

  // Directive-shaped lines the parser had to read as prose or a title:
  // surfacing them is the contract — a declaration placed after the first
  // ":: " header must never just vanish into content.
  (ast.misplacedDirectives ?? []).forEach((node) => {
    const readsAs = node.asTitle
      ? `the title of situation "${node.situationId}"`
      : `prose in situation "${node.situationId}"`;
    diagnostics.push({
      severity: 'warning',
      code: 'misplaced-directive',
      message: `Line ${node.line}: "${node.keyword}" only parses before the first ":: " header — here it reads as ${readsAs}`,
      situation: node.situationId,
      line: node.line,
    });
  });

  // Validate hud declarations and theme rules
  (ast.hud ?? []).forEach((node, index) => {
    const line = ast.positions?.hud?.[index];
    structuredRefs.add(node.qualityId);
    if (!declaredQualities.has(node.qualityId)) {
      diagnostics.push({
        severity: 'warning',
        code: 'unknown-quality-in-hud',
        message: `${prefix(line)}hud references undeclared quality "${node.qualityId}"`,
        line,
      });
    }
  });

  (ast.themes ?? []).forEach((node, index) => {
    const line = ast.positions?.themes?.[index];
    try {
      const expr = parseExpression(node.when);
      collectQualityRefs(expr).forEach((ref) => {
        structuredRefs.add(ref);
        if (!declaredQualities.has(ref)) {
          diagnostics.push({
            severity: 'warning',
            code: 'unknown-quality-in-condition',
            message: `${prefix(line)}theme rule references undeclared quality "${ref}"`,
            line,
          });
        }
      });
      findOrderedComparisonMisuse(expr, ast, (qualityId, op) => {
        diagnostics.push({
          severity: 'warning',
          code: 'condition-type-mismatch',
          message: `${prefix(line)}theme rule compares non-number quality "${qualityId}" with "${op}"`,
          line,
        });
      });
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'condition-parse-error',
        message: `${prefix(line)}invalid theme condition "${node.when}": ${(error as Error).message}`,
        line,
      });
    }
  });

  // Schedule directives: effect parsing/typing + world references
  (ast.schedule ?? []).forEach((node, index) => {
    const line = ast.positions?.schedule?.[index];
    if (node.effects) {
      checkEffects(node.effects, line, `schedule ${node.kind} ${node.turns}`);
    }
    if (node.world) {
      const known =
        (ast.worlds ?? []).some((world) => world.id === node.world) ||
        Object.keys(ast.situations).some((id) => id.startsWith(`${node.world}:`));
      if (!known) {
        diagnostics.push({
          severity: 'warning',
          code: 'unknown-world-in-schedule',
          message: `${prefix(line)}schedule references unknown world "${node.world}"`,
          line,
        });
      }
    }
  });

  // Declared tasks should be capturable somewhere
  (ast.tasks ?? []).forEach((taskNode, index) => {
    if (!capturedTasks.has(taskNode.id)) {
      const line = ast.positions?.tasks?.[index];
      diagnostics.push({
        severity: 'warning',
        code: 'unused-task',
        message: `${prefix(line)}task "${taskNode.id}" is declared but never captured`,
        line,
      });
    }
  });

  // Declared worlds must contain at least one situation (world:... id)
  (ast.worlds ?? []).forEach((worldNode, index) => {
    const hasMember = Object.keys(ast.situations).some((id) =>
      id.startsWith(`${worldNode.id}:`),
    );
    if (!hasMember) {
      const line = ast.positions?.worlds?.[index];
      diagnostics.push({
        severity: 'warning',
        code: 'empty-world',
        message: `${prefix(line)}world "${worldNode.id}" has no situations (use "${worldNode.id}:<situation-id>" headers)`,
        line,
      });
    }
  });

  // The mirror check: once any world is declared, a discovered prefix that
  // matches no declaration is almost certainly a typo — left silent, it
  // mints a phantom world with its own map tab. Declaration-free stories
  // (prefix-only worlds) stay clean by design.
  const declaredWorldIds = new Set((ast.worlds ?? []).map((world) => world.id));
  if (declaredWorldIds.size > 0) {
    const reportedWorlds = new Set<string>();
    Object.keys(ast.situations).forEach((situationId) => {
      const colon = situationId.indexOf(':');
      if (colon === -1) {
        return;
      }
      const worldId = situationId.slice(0, colon);
      if (declaredWorldIds.has(worldId) || reportedWorlds.has(worldId)) {
        return;
      }
      reportedWorlds.add(worldId);
      const line = ast.positions?.situations?.[situationId];
      diagnostics.push({
        severity: 'warning',
        code: 'undeclared-world',
        message: `${prefix(line)}situation "${situationId}" creates undeclared world "${worldId}" (typo of a declared world?)`,
        situation: situationId,
        line,
      });
    });
  }

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
    if (!usedQualities.has(qualityId) && !structuredRefs.has(qualityId)) {
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
