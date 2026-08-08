/**
 * TextPlus Convert - Transcript to DSL (Transmatte-inspired, M4 first slice)
 *
 * Converts a plain-text parser-IF transcript (Z-machine style) into a linear
 * TextPlus DSL story skeleton: one situation per move, linked by the typed
 * commands. The output always compiles through @textplus/author with zero
 * errors (guarded by tests).
 *
 * Accepted transcript shape:
 *   - Lines starting with ">" are player commands.
 *   - A short Title-Case or ALL-CAPS line opening a prose block is treated as
 *     a room header.
 *   - Bracketed interpreter noise ("[Score: 5]") and "*** ... ***" banners
 *     are stripped.
 *
 * Not in this slice: branching-transcript merging, engine-specific formats,
 * CLI. Dissecting compiled game binaries is a project horizon note only.
 */

export interface TranscriptMove {
  /** The command that led here (null for the opening block). */
  command: string | null;
  /** Detected room name, when the block opened with a header line. */
  roomName: string | null;
  prose: string;
}

export interface TranscriptToDslOptions {
  /** Story title; defaults to the first room name or "Converted Transcript". */
  title?: string;
}

const MAX_ROOM_HEADER_LENGTH = 50;

function isNoise(line: string): boolean {
  const trimmed = line.trim();
  return /^\[.*\]$/.test(trimmed) || /^\*\*\*.*\*\*\*$/.test(trimmed);
}

function isRoomHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_ROOM_HEADER_LENGTH) {
    return false;
  }
  if (/[.!?:,]$/.test(trimmed)) {
    return false;
  }
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return true;
  }
  // Title Case: every word of 4+ letters capitalized, no sentence punctuation.
  const words = trimmed.split(/\s+/);
  return (
    words.length <= 6 &&
    words.every((word) => /^[A-Z0-9'&-]/.test(word) || word.length < 4) &&
    /^[A-Z]/.test(trimmed)
  );
}

/** Split raw transcript text into moves (command + resulting block). */
export function parseTranscriptText(text: string): TranscriptMove[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const moves: TranscriptMove[] = [];

  let command: string | null = null;
  let blockLines: string[] = [];

  const flush = (): void => {
    const cleaned = blockLines.map((l) => l.trimEnd());
    while (cleaned.length > 0 && !cleaned[0].trim()) {
      cleaned.shift();
    }
    while (cleaned.length > 0 && !cleaned[cleaned.length - 1].trim()) {
      cleaned.pop();
    }
    if (cleaned.length === 0 && command === null) {
      return;
    }

    let roomName: string | null = null;
    if (cleaned.length > 0 && isRoomHeader(cleaned[0])) {
      roomName = cleaned.shift()!.trim();
      while (cleaned.length > 0 && !cleaned[0].trim()) {
        cleaned.shift();
      }
    }

    moves.push({
      command,
      roomName,
      prose: cleaned.join('\n').trim(),
    });
    blockLines = [];
  };

  lines.forEach((line) => {
    if (isNoise(line)) {
      return;
    }
    const commandMatch = /^\s*>\s*(.*)$/.exec(line);
    if (commandMatch) {
      flush();
      command = commandMatch[1].trim() || 'wait';
      return;
    }
    blockLines.push(line);
  });
  flush();

  return moves;
}

// --- DSL generation ----------------------------------------------------------

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `room-${slug || 'x'}`;
}

function sentenceCase(command: string): string {
  const trimmed = command.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Neutralize prose lines that would lex as DSL directives. Documented
 * limitation: leading arrows/braces/etc. become lookalike characters.
 */
function sanitizeProse(prose: string): string {
  return prose
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('-> ')) {
        return line.replace('->', '→');
      }
      if (trimmed.startsWith(':: ')) {
        return line.replace('::', '∷');
      }
      if (/^\{.*\}$/.test(trimmed)) {
        return line.replace('{', '⦃').replace(/\}(?=[^}]*$)/, '⦄');
      }
      if (/^(title:|quality\s|hud\s|theme\s)/.test(trimmed)) {
        return ` ${line}`;
      }
      return line;
    })
    .join('\n');
}

/** Convert a transcript into a compiling linear DSL story. */
export function transcriptToDsl(text: string, options: TranscriptToDslOptions = {}): string {
  const moves = parseTranscriptText(text);
  if (moves.length === 0) {
    throw new Error('Transcript contains no content');
  }

  const title = options.title ?? moves.find((m) => m.roomName)?.roomName ?? 'Converted Transcript';

  // Unique situation ids from room names (or step-N), deduplicated -2, -3...
  const counts = new Map<string, number>();
  const ids = moves.map((move, index) => {
    const base = move.roomName ? slugify(move.roomName) : `step-${index + 1}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  });

  const sections = moves.map((move, index) => {
    const id = ids[index];
    const header = index === 0 ? `:: ${id} [start]` : `:: ${id}`;
    const situationTitle = move.roomName ?? (move.command ? sentenceCase(move.command) : `Step ${index + 1}`);
    const prose = sanitizeProse(move.prose) || '...';

    const lines = [header, situationTitle, '', prose];
    const next = moves[index + 1];
    if (next) {
      lines.push('', `-> ${sentenceCase(next.command ?? 'Continue')} => ${ids[index + 1]}`);
    }
    return lines.join('\n');
  });

  return `title: ${title}\n\n${sections.join('\n\n')}\n`;
}
