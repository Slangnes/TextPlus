/**
 * TextPlus Convert - Multi-transcript merge (M4 branching slice)
 *
 * Merges several play transcripts of the same game into one branching DSL
 * story. Rooms unify by header name across (and within) transcripts, so
 * where playthroughs diverge from a shared room, its situation gains one
 * link per distinct continuation. Headerless moves stay linear — without a
 * room name there is nothing safe to unify on (documented limitation).
 */

import { parseTranscriptText, slugify, sentenceCase, sanitizeProse } from './transcript';

export interface MergeOptions {
  /** Story title; defaults to the first room name or "Merged Transcript". */
  title?: string;
}

interface MergedNode {
  id: string;
  title: string;
  prose: string;
  links: Array<{ label: string; to: string }>;
}

/** Merge transcripts into one compiling, potentially branching DSL story. */
export function mergeTranscriptsToDsl(texts: string[], options: MergeOptions = {}): string {
  const parsed = texts.map((text) => parseTranscriptText(text)).filter((moves) => moves.length > 0);
  if (parsed.length === 0) {
    throw new Error('Transcripts contain no content');
  }

  const nodes = new Map<string, MergedNode>();
  const order: string[] = [];
  const linkSeen = new Set<string>();
  let startId: string | null = null;

  const ensure = (id: string, title: string, prose: string): MergedNode => {
    let node = nodes.get(id);
    if (!node) {
      node = { id, title, prose, links: [] };
      nodes.set(id, node);
      order.push(id);
    } else if (!node.prose && prose) {
      node.prose = prose;
    }
    return node;
  };

  parsed.forEach((moves, transcriptIndex) => {
    const ids = moves.map((move, moveIndex) =>
      move.roomName ? slugify(move.roomName) : `step-${transcriptIndex + 1}-${moveIndex + 1}`,
    );
    moves.forEach((move, moveIndex) => {
      const title =
        move.roomName ?? (move.command ? sentenceCase(move.command) : `Step ${moveIndex + 1}`);
      ensure(ids[moveIndex], title, move.prose);
      if (moveIndex > 0) {
        const from = ids[moveIndex - 1];
        const label = sentenceCase(move.command ?? 'Continue');
        const key = `${from} | ${label} | ${ids[moveIndex]}`;
        if (!linkSeen.has(key)) {
          linkSeen.add(key);
          nodes.get(from)!.links.push({ label, to: ids[moveIndex] });
        }
      }
    });
    if (startId === null) {
      startId = ids[0];
    }
  });

  const title =
    options.title ??
    parsed.flat().find((move) => move.roomName)?.roomName ??
    'Merged Transcript';

  const sections = order.map((id) => {
    const node = nodes.get(id)!;
    const lines = [
      id === startId ? `:: ${id} [start]` : `:: ${id}`,
      node.title,
      '',
      sanitizeProse(node.prose) || '...',
    ];
    node.links.forEach((link) => {
      lines.push('', `-> ${link.label} => ${link.to}`);
    });
    return lines.join('\n');
  });

  return `title: ${title}\n\n${sections.join('\n\n')}\n`;
}
