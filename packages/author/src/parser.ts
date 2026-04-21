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
}

export interface AuthorSituationNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  links: AuthorLinkNode[];
}

export interface AuthorGameAst {
  title: string;
  qualities: Record<string, AuthorQualityNode>;
  situations: Record<string, AuthorSituationNode>;
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

function finalizeSituation(
  situations: Record<string, AuthorSituationNode>,
  current: {
    id: string;
    title: string;
    tags: string[];
    contentLines: string[];
    links: AuthorLinkNode[];
  } | null,
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
  };
}

export function parseGame(source: string): AuthorGameAst {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let title: string | null = null;
  const qualities: Record<string, AuthorQualityNode> = {};
  const situations: Record<string, AuthorSituationNode> = {};

  let currentSituation: {
    id: string;
    title: string;
    tags: string[];
    contentLines: string[];
    links: AuthorLinkNode[];
  } | null = null;
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
      continue;
    }

    if (trimmed.startsWith(':: ')) {
      finalizeSituation(situations, currentSituation);
      const match = trimmed.match(/^::\s+([a-zA-Z][\w-]*)(?:\s+\[([^\]]+)\])?$/);
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
      };
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
      const match = trimmed.match(/^->\s+(.+?)\s+=>\s+([a-zA-Z][\w-]*)(?:\s+\?\s+(.+))?$/);
      if (!match) {
        throw new Error(`Line ${lineNumber}: invalid link definition`);
      }

      const [, text, target, condition] = match;
      currentSituation.links.push({
        text: text.trim(),
        target,
        condition: condition?.trim(),
      });
      continue;
    }

    currentSituation.contentLines.push(rawLine);
  }

  finalizeSituation(situations, currentSituation);

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
  };
}