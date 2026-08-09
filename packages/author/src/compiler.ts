/**
 * TextPlus Author - Compiler
 *
 * Compiles parsed AuthorGameAst into @textplus/core GameConfig.
 * Conditions compile to pure closures over the qualities Record (core's
 * first-attempt dispatch shape), effects compile to guarded engine
 * callbacks, and prose runs through the markdown/adaptive-text pipeline.
 * Malformed conditions/effects are reported by the linter first; the
 * compiler skips attaching them (the link stays unconditional) and records
 * a CompileError as belt-and-braces.
 */

import type {
  GameConfig,
  GameEngine,
  HudConfig,
  HudThemeRule,
  QualityDefinition,
  ScheduleEntry,
  SituationDefinition,
  SituationLink,
  TaskDefinition,
  WorldDefinition,
} from '@textplus/core';
import type { AuthorGameAst, AuthorLinkNode, AuthorQualityNode, AuthorSituationNode } from './parser';
import { resolveInitialSituation } from './parser';
import { parseExpression, compileConditionExpr } from './expression';
import { parseEffects, compileEffects } from './effects';
import { compileContent, createRng } from './content';
import type { Rng } from './content';

export interface CompileError {
  type: string;
  message: string;
}

export interface CompileOutput {
  config: GameConfig | null;
  errors: CompileError[];
}

export interface CompileAstOptions {
  /** Seed for adaptive-text randomness (tests); unseeded uses Math.random. */
  randomSeed?: number;
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
 * Compile a link node: text/target plus optional condition and effects.
 */
function compileLink(node: AuthorLinkNode, errors: CompileError[], situationId: string): SituationLink {
  const link: SituationLink = {
    text: node.text,
    target: node.target,
  };

  if (node.condition) {
    try {
      link.condition = compileConditionExpr(parseExpression(node.condition));
    } catch (error) {
      errors.push({
        type: 'invalid_condition',
        message: `Situation "${situationId}": invalid condition "${node.condition}": ${(error as Error).message}`,
      });
    }
  }

  if (node.effects) {
    try {
      link.onChoose = compileEffects(parseEffects(node.effects));
    } catch (error) {
      errors.push({
        type: 'invalid_effects',
        message: `Situation "${situationId}": invalid effects "${node.effects}": ${(error as Error).message}`,
      });
    }
  }

  return link;
}

/**
 * Compile a situation node to Core definition
 */
/** The world prefix of a qualified id ("comm:feed-a" → "comm"), else undefined. */
function worldOf(situationId: string): string | undefined {
  const colon = situationId.indexOf(':');
  return colon === -1 ? undefined : situationId.slice(0, colon);
}

function compileSituation(node: AuthorSituationNode, errors: CompileError[], rng: Rng): SituationDefinition {
  const situation: SituationDefinition = {
    id: node.id,
    title: node.title,
    content: compileContent(node.content, rng),
    tags: node.tags.length > 0 ? node.tags : undefined,
    world: worldOf(node.id),
    links: node.links.map((link) => compileLink(link, errors, node.id)),
  };

  if (node.onEnterEffects && node.onEnterEffects.length > 0) {
    const compiled: Array<(game: GameEngine) => void> = [];
    node.onEnterEffects.forEach((effectSource) => {
      try {
        compiled.push(compileEffects(parseEffects(effectSource)));
      } catch (error) {
        errors.push({
          type: 'invalid_effects',
          message: `Situation "${node.id}": invalid entry effects "${effectSource}": ${(error as Error).message}`,
        });
      }
    });
    if (compiled.length > 0) {
      situation.onEnter = (game) => compiled.forEach((run) => run(game));
    }
  }

  return situation;
}

/**
 * Main compiler: convert parsed AST to Core GameConfig
 */
export function compileAST(ast: AuthorGameAst, options: CompileAstOptions = {}): CompileOutput {
  const errors: CompileError[] = [];
  const rng = createRng(options.randomSeed);

  // Compile qualities
  const qualitiesRecord: Record<string, QualityDefinition> = {};
  Object.values(ast.qualities).forEach((qualityNode) => {
    qualitiesRecord[qualityNode.id] = compileQuality(qualityNode);
  });

  // Compile situations
  const situationsRecord: Record<string, SituationDefinition> = {};
  Object.values(ast.situations).forEach((situationNode) => {
    situationsRecord[situationNode.id] = compileSituation(situationNode, errors, rng);
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

  // Falsy when there are no situations — the guard below turns that into a
  // fatal error and the config is discarded.
  const initialSituation = resolveInitialSituation(ast) ?? '';

  if (!initialSituation) {
    errors.push({
      type: 'no_initial_situation',
      message: 'Game has no situations; cannot determine starting point',
    });
  }

  // Compile HUD declarations and theme rules
  let hud: HudConfig | undefined;
  if ((ast.hud && ast.hud.length > 0) || (ast.themes && ast.themes.length > 0)) {
    const themeRules: HudThemeRule[] = [];
    (ast.themes ?? []).forEach((node) => {
      try {
        themeRules.push({
          theme: node.theme,
          when: compileConditionExpr(parseExpression(node.when)),
        });
      } catch (error) {
        errors.push({
          type: 'invalid_condition',
          message: `Theme "${node.theme}": invalid condition "${node.when}": ${(error as Error).message}`,
        });
      }
    });
    hud = {
      entries: (ast.hud ?? []).map((node) => ({
        qualityId: node.qualityId,
        kind: node.kind,
        label: node.label,
      })),
      themes: themeRules.length > 0 ? themeRules : undefined,
    };
  }

  // Worlds: declared `world` directives plus prefixes discovered from
  // qualified situation ids. Each world's initial situation is its first
  // declared member (declaration order); the global [start] rule is unchanged.
  let worlds: Record<string, WorldDefinition> | undefined;
  const declaredWorlds = new Map((ast.worlds ?? []).map((node) => [node.id, node]));
  const discovered = new Map<string, string>(); // world -> first situation id
  Object.keys(ast.situations).forEach((situationId) => {
    const world = worldOf(situationId);
    if (world && !discovered.has(world)) {
      discovered.set(world, situationId);
    }
  });
  if (declaredWorlds.size > 0 || discovered.size > 0) {
    worlds = {};
    for (const [worldId, firstSituation] of discovered) {
      worlds[worldId] = {
        label: declaredWorlds.get(worldId)?.label,
        initialSituation: firstSituation,
      };
    }
    // Declared worlds without any situation compile to nothing here; the
    // linter reports them (empty-world) so the gap is visible, not silent.
  }

  // Compile task declarations (label defaults to a Title-Case of the id)
  let tasksRecord: Record<string, TaskDefinition> | undefined;
  if (ast.tasks && ast.tasks.length > 0) {
    tasksRecord = {};
    ast.tasks.forEach((node) => {
      tasksRecord![node.id] = {
        label:
          node.label ??
          node.id
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
      };
    });
  }

  // Compile the turn-clock schedule
  let scheduleEntries: ScheduleEntry[] | undefined;
  if (ast.schedule && ast.schedule.length > 0) {
    scheduleEntries = [];
    ast.schedule.forEach((node) => {
      let effects: ((game: GameEngine) => void) | undefined;
      if (node.effects) {
        try {
          effects = compileEffects(parseEffects(node.effects));
        } catch (error) {
          errors.push({
            type: 'invalid_effects',
            message: `Schedule "${node.kind} ${node.turns}": invalid effects "${node.effects}": ${(error as Error).message}`,
          });
          return;
        }
      }
      const entry: ScheduleEntry = { world: node.world, effects, message: node.message };
      if (node.kind === 'every') {
        entry.every = node.turns;
      } else {
        entry.at = node.turns;
      }
      scheduleEntries!.push(entry);
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
    hud,
    worlds,
    schedule: scheduleEntries,
    tasks: tasksRecord,
    map: ast.map,
  };

  return {
    config,
    errors: [],
  };
}
