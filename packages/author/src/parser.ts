export type AuthorQualityType = 'number' | 'boolean' | 'string';

export interface AuthorQualityNode {
  id: string;
  type: AuthorQualityType;
  default: string | number | boolean;
  min?: number;
  max?: number;
}

export interface AuthorLinkNode {
  text: string;
  target: string;
  condition?: string;
  /** Raw effects string from a trailing brace block (undefined when absent). */
  effects?: string;
}

export interface AuthorSituationNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  links: AuthorLinkNode[];
  /** Raw effect strings from whole-line { ... } entries (undefined when none). */
  onEnterEffects?: string[];
}

export interface AuthorHudNode {
  qualityId: string;
  kind: 'meter' | 'badge' | 'readout';
  label?: string;
}

export interface AuthorThemeNode {
  theme: string;
  /** Raw condition expression string. */
  when: string;
}

/** A declared world/mode ("world comm \"Communications\""). */
export interface AuthorWorldNode {
  id: string;
  label?: string;
}

/** A capturable task declaration ("task forests \"The dying forests\""). */
export interface AuthorTaskNode {
  id: string;
  label?: string;
}

/** A schedule directive ("every 2 { pressure += 1 }", "at 12 say \"...\""). */
export interface AuthorScheduleNode {
  kind: 'every' | 'at';
  turns: number;
  world?: string;
  /** Raw effects string (undefined when the entry only says something). */
  effects?: string;
  message?: string;
}

/** 1-based source line numbers, kept out of the nodes so AST deep-equals stay stable. */
export interface AuthorPositions {
  qualities: Record<string, number>;
  situations: Record<string, number>;
  /** Per situation id: line number of each link, parallel to the links array. */
  links: Record<string, number[]>;
  /** Per situation id: line number of each entry-effect line, parallel to onEnterEffects. */
  entryEffects: Record<string, number[]>;
  /** Parallel to the hud array. */
  hud: number[];
  /** Parallel to the themes array. */
  themes: number[];
  /** Parallel to the worlds array. */
  worlds: number[];
  /** Parallel to the schedule array. */
  schedule: number[];
  /** Parallel to the tasks array. */
  tasks: number[];
}

export interface AuthorGameAst {
  title: string;
  qualities: Record<string, AuthorQualityNode>;
  situations: Record<string, AuthorSituationNode>;
  /** HUD declarations in order (undefined when none). */
  hud?: AuthorHudNode[];
  /** Theme rules in declaration order (undefined when none). */
  themes?: AuthorThemeNode[];
  /** World declarations in order (undefined when none). */
  worlds?: AuthorWorldNode[];
  /** Schedule directives in order (undefined when none). */
  schedule?: AuthorScheduleNode[];
  /** Task declarations in order (undefined when none). */
  tasks?: AuthorTaskNode[];
  /** Player-facing in-game map opt-in ("map dungeon"). */
  map?: { style: 'dungeon' };
  positions?: AuthorPositions;
}

function parseScalar(rawValue: string, type: AuthorQualityType, lineNumber: number): string | number | boolean {
  if (type === 'number') {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new Error(`Line ${lineNumber}: invalid number default \"${rawValue}\"`);
    }

    return parsed;
  }

  if (type === 'boolean') {
    if (rawValue !== 'true' && rawValue !== 'false') {
      throw new Error(`Line ${lineNumber}: invalid boolean default \"${rawValue}\"`);
    }

    return rawValue === 'true';
  }

  return rawValue;
}

interface PendingSituation {
  id: string;
  title: string;
  tags: string[];
  contentLines: string[];
  links: AuthorLinkNode[];
  linkLines: number[];
  onEnterEffects: string[];
  entryEffectLines: number[];
}

function finalizeSituation(
  situations: Record<string, AuthorSituationNode>,
  positions: AuthorPositions,
  current: PendingSituation | null,
): void {
  if (!current) {
    return;
  }

  situations[current.id] = {
    id: current.id,
    title: current.title,
    tags: current.tags,
    content: current.contentLines.join('\n').trim(),
    links: current.links,
    onEnterEffects: current.onEnterEffects.length > 0 ? current.onEnterEffects : undefined,
  };
  positions.links[current.id] = current.linkLines;
  positions.entryEffects[current.id] = current.entryEffectLines;
}

/**
 * The single start-resolution rule: the situation tagged `start`, else the
 * first declared. Compiler and linter must agree on this — never reimplement.
 */
export function resolveInitialSituation(ast: AuthorGameAst): string | undefined {
  const startSituation = Object.values(ast.situations).find((s) => s.tags.includes('start'));
  return startSituation?.id || Object.keys(ast.situations)[0];
}

export function parseGame(source: string): AuthorGameAst {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let title: string | null = null;
  const qualities: Record<string, AuthorQualityNode> = {};
  const situations: Record<string, AuthorSituationNode> = {};
  const positions: AuthorPositions = {
    qualities: {},
    situations: {},
    links: {},
    entryEffects: {},
    hud: [],
    themes: [],
    worlds: [],
    schedule: [],
    tasks: [],
  };
  const hud: AuthorHudNode[] = [];
  const themes: AuthorThemeNode[] = [];
  const worlds: AuthorWorldNode[] = [];
  const schedule: AuthorScheduleNode[] = [];
  const tasks: AuthorTaskNode[] = [];
  let mapStyle: 'dungeon' | undefined;

  let currentSituation: PendingSituation | null = null;
  let expectingSituationTitle = false;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentSituation && currentSituation.contentLines.length > 0) {
        currentSituation.contentLines.push('');
      }
      continue;
    }

    if (!currentSituation && trimmed.startsWith('title:')) {
      title = trimmed.slice('title:'.length).trim();
      if (!title) {
        throw new Error(`Line ${lineNumber}: game title cannot be empty`);
      }
      continue;
    }

    if (!currentSituation && trimmed.startsWith('quality ')) {
      const match = trimmed.match(/^quality\s+([a-zA-Z][\w-]*)\s+(number|boolean|string)\s*=\s*(.+?)(?:\s+min\s+(-?\d+(?:\.\d+)?))?(?:\s+max\s+(-?\d+(?:\.\d+)?))?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid quality declaration`);
      }

      const [, id, type, rawValue, min, max] = match;
      qualities[id] = {
        id,
        type: type as AuthorQualityType,
        default: parseScalar(rawValue.trim(), type as AuthorQualityType, lineNumber),
        min: min === undefined ? undefined : Number(min),
        max: max === undefined ? undefined : Number(max),
      };
      positions.qualities[id] = lineNumber;
      continue;
    }

    if (!currentSituation && trimmed.startsWith('hud ')) {
      const match = trimmed.match(/^hud\s+([a-zA-Z][\w-]*)\s+(meter|badge|readout)(?:\s+"([^"]*)")?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid hud declaration (expected: hud <quality-id> meter|badge|readout ["label"])`);
      }
      const [, qualityId, kind, label] = match;
      hud.push({ qualityId, kind: kind as AuthorHudNode['kind'], label });
      positions.hud.push(lineNumber);
      continue;
    }

    if (!currentSituation && trimmed.startsWith('theme ')) {
      const match = trimmed.match(/^theme\s+([a-zA-Z][\w-]*)\s+when\s+(.+)$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid theme rule (expected: theme <name> when <condition>)`);
      }
      const [, theme, when] = match;
      themes.push({ theme, when: when.trim() });
      positions.themes.push(lineNumber);
      continue;
    }

    if (!currentSituation && (trimmed.startsWith('every ') || trimmed.startsWith('at '))) {
      const match = trimmed.match(
        /^(every|at)\s+(\d+)(?:\s+in\s+([a-zA-Z][\w-]*))?(?:\s*\{\s*(.+?)\s*\})?(?:\s+say\s+"([^"]*)")?$/,
      );
      if (!match) {
        throw new Error(
          `Line ${lineNumber}: invalid schedule directive (expected: every|at <turns> [in <world>] [{ effects }] [say "message"])`,
        );
      }
      const [, kind, rawTurns, world, effects, message] = match;
      const turns = Number(rawTurns);
      if (kind === 'every' && turns < 1) {
        throw new Error(`Line ${lineNumber}: "every ${rawTurns}" must be at least every 1 turn`);
      }
      if (!effects && !message) {
        throw new Error(`Line ${lineNumber}: schedule directive needs effects and/or say "message"`);
      }
      schedule.push({
        kind: kind as AuthorScheduleNode['kind'],
        turns,
        world,
        effects: effects?.trim(),
        message,
      });
      positions.schedule.push(lineNumber);
      continue;
    }

    if (!currentSituation && trimmed.startsWith('map ')) {
      const match = trimmed.match(/^map\s+(dungeon)$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid map directive (only "map dungeon" is implemented)`);
      }
      mapStyle = 'dungeon';
      continue;
    }

    if (!currentSituation && trimmed.startsWith('task ')) {
      const match = trimmed.match(/^task\s+([a-zA-Z][\w-]*)(?:\s+"([^"]*)")?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid task declaration (expected: task <id> ["label"])`);
      }
      const [, id, label] = match;
      tasks.push({ id, label });
      positions.tasks.push(lineNumber);
      continue;
    }

    if (!currentSituation && trimmed.startsWith('world ')) {
      const match = trimmed.match(/^world\s+([a-zA-Z][\w-]*)(?:\s+"([^"]*)")?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid world declaration (expected: world <id> ["label"])`);
      }
      const [, id, label] = match;
      worlds.push({ id, label });
      positions.worlds.push(lineNumber);
      continue;
    }

    if (trimmed.startsWith(':: ')) {
      finalizeSituation(situations, positions, currentSituation);
      // Ids may be world-qualified: `world:situation` (one colon).
      const match = trimmed.match(/^::\s+([a-zA-Z][\w-]*(?::[a-zA-Z][\w-]*)?)(?:\s+\[([^\]]+)\])?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid situation header`);
      }

      const [, id, rawTags] = match;
      currentSituation = {
        id,
        title: '',
        tags: rawTags ? rawTags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        contentLines: [],
        links: [],
        linkLines: [],
        onEnterEffects: [],
        entryEffectLines: [],
      };
      positions.situations[id] = lineNumber;
      expectingSituationTitle = true;
      continue;
    }

    if (!currentSituation) {
      throw new Error(`Line ${lineNumber}: content must start with game title, quality, or situation header`);
    }

    if (expectingSituationTitle) {
      currentSituation.title = trimmed;
      expectingSituationTitle = false;
      continue;
    }

    if (trimmed.startsWith('-> ')) {
      const match = trimmed.match(/^->\s+(.+?)\s+=>\s+([a-zA-Z][\w-]*(?::[a-zA-Z][\w-]*)?)(?:\s+\?\s+(.+?))?(?:\s*\{\s*(.+?)\s*\})?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid link definition`);
      }

      const [, text, target, condition, effects] = match;
      currentSituation.links.push({
        text: text.trim(),
        target,
        condition: condition?.trim(),
        effects: effects?.trim(),
      });
      currentSituation.linkLines.push(lineNumber);
      continue;
    }

    const entryEffect = /^\{\s*(.+?)\s*\}$/.exec(trimmed);
    if (entryEffect) {
      currentSituation.onEnterEffects.push(entryEffect[1]);
      currentSituation.entryEffectLines.push(lineNumber);
      continue;
    }

    currentSituation.contentLines.push(rawLine);
  }

  finalizeSituation(situations, positions, currentSituation);

  if (!title) {
    throw new Error('Line 1: missing game title');
  }

  if (Object.keys(situations).length === 0) {
    throw new Error('Line 1: at least one situation is required');
  }

  return {
    title,
    qualities,
    situations,
    hud: hud.length > 0 ? hud : undefined,
    themes: themes.length > 0 ? themes : undefined,
    worlds: worlds.length > 0 ? worlds : undefined,
    schedule: schedule.length > 0 ? schedule : undefined,
    tasks: tasks.length > 0 ? tasks : undefined,
    map: mapStyle ? { style: mapStyle } : undefined,
    positions,
  };
}