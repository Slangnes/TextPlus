/**
 * TextPlus Author - Compiler
 *
 * Compiles parsed AuthorGameAst into @textplus/core GameConfig.
 * Handles validation, cross-reference resolution, and adapter functions.
 */

import type { GameConfig, QualityDefinition, SituationDefinition, SituationLink } from '@textplus/core';
import type { AuthorGameAst, AuthorLinkNode, AuthorQualityNode, AuthorSituationNode } from './parser';

export interface CompileError {
  type: string;
  message: string;
}

export interface CompileOutput {
  config: GameConfig | null;
  errors: CompileError[];
}

/**
 * Convert author quality node to Core quality definition
 */
function compileQuality(node: AuthorQualityNode): QualityDefinition {
  return {
    name: node.id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    type: node.type,
    default: node.default,
    min: node.min,
    max: node.max,
    description: `Quality: ${node.id}`,
  };
}

/**
 * Compile a link node, resolving text and target
 */
function compileLink(node: AuthorLinkNode): SituationLink {
  return {
    text: node.text,
    target: node.target,
    // Condition parsing would go here in Phase 2B
    // For now, conditions are stored as strings and not evaluated
  };
}

/**
 * Compile a situation node to Core definition
 */
function compileSituation(node: AuthorSituationNode): SituationDefinition {
  return {
    id: node.id,
    title: node.title,
    content: node.content,
    tags: node.tags.length > 0 ? node.tags : undefined,
    links: node.links.map((link) => compileLink(link)),
  };
}

/**
 * Main compiler: convert parsed AST to Core GameConfig
 */
export function compileAST(ast: AuthorGameAst): CompileOutput {
  const errors: CompileError[] = [];

  // Compile qualities
  const qualitiesRecord: Record<string, QualityDefinition> = {};
  Object.values(ast.qualities).forEach((qualityNode) => {
    qualitiesRecord[qualityNode.id] = compileQuality(qualityNode);
  });

  // Compile situations
  const situationsRecord: Record<string, SituationDefinition> = {};
  Object.values(ast.situations).forEach((situationNode) => {
    situationsRecord[situationNode.id] = compileSituation(situationNode);
  });

  // Validation: check all link targets exist
  Object.entries(ast.situations).forEach(([situationId, situation]) => {
    situation.links.forEach((link, index) => {
      if (!ast.situations[link.target]) {
        errors.push({
          type: 'unresolved_link',
          message: `Situation "${situationId}": Link ${index} targets undefined situation "${link.target}"`,
        });
      }
    });
  });

  // Determine initial situation (first situation, or first marked as 'start')
  const startSituation = Object.values(ast.situations).find((s) => s.tags.includes('start'));
  const initialSituation = startSituation?.id || Object.keys(ast.situations)[0];

  if (!initialSituation) {
    errors.push({
      type: 'no_initial_situation',
      message: 'Game has no situations; cannot determine starting point',
    });
  }

  if (errors.length > 0) {
    return {
      config: null,
      errors,
    };
  }

  const config: GameConfig = {
    title: ast.title,
    initialSituation,
    qualities: qualitiesRecord,
    situations: situationsRecord,
  };

  return {
    config,
    errors: [],
  };
}
