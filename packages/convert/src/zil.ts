/**
 * TextPlus Convert - ZIL Deconstruction (M4)
 *
 * The Transmatte flow fed by the actual program. Extraction rules are
 * grounded in the ZIL sources this was built against (AMFV) and the ZIL
 * conventions they follow; everything else lands on the conversion report —
 * a "not recovered" line is a feature, a silent guess is a bug.
 *
 * Recovered:
 * - `<ROOM …>` forms → situations titled by DESC, with real prose:
 *   `(LDESC "…")` when present, else the string literals of the ACTION
 *   routine's M-LOOK branch (derived — see report).
 * - Plain directional exits `(DIR TO X)` → movement-labeled links.
 * - Conditional exits: `(DIR TO X IF FLAG)` (ZIL global-flag gate) and
 *   `(DIR TO X IF DOOR IS OPEN)` (door gate) → gated links over synthesized
 *   boolean qualities. Door/flag *mechanics* (what opens them) live in
 *   routine logic and are NOT recovered — authoring is needed to set them.
 * - `--globals`: single-line `<GLOBAL NAME literal>` where the literal is a
 *   number, `<>` (false), `T` (true), or a "string" → quality declarations.
 * - Multi-file: each file becomes a world; cross-file exits become
 *   world-switch links where the target room exists in another file.
 *
 * Reported, not recovered: SORRY (blocked) exits and their messages, PER
 * (routine) exits, ELSE messages on gates, table/complex globals, object
 * definitions, and all action-routine logic.
 */

import { sanitizeProse } from './transcript';

const EXITS =
  /\((NORTH|SOUTH|EAST|WEST|NE|NW|SE|SW|UP|DOWN|IN|OUT|LAND)\s+TO\s+([A-Z0-9][A-Z0-9-]*)((?:\s+IF\s+[A-Z0-9][A-Z0-9-]*(?:\s+IS\s+OPEN)?)?)/g;

const BLOCKED_EXITS = /\((?:NORTH|SOUTH|EAST|WEST|NE|NW|SE|SW|UP|DOWN|IN|OUT|LAND)\s+(SORRY|PER)\s/g;

const DIRECTION_LABELS: Record<string, string> = {
  NORTH: 'Go north',
  SOUTH: 'Go south',
  EAST: 'Go east',
  WEST: 'Go west',
  NE: 'Go northeast',
  NW: 'Go northwest',
  SE: 'Go southeast',
  SW: 'Go southwest',
  UP: 'Go up',
  DOWN: 'Go down',
  IN: 'Enter',
  OUT: 'Exit',
  LAND: 'Land',
};

/** Names the engine maintains itself — never synthesized from globals. */
const RESERVED_QUALITY_IDS = new Set(['world', 'turn']);

const MAX_PROSE = 900;

function slugify(zilId: string): string {
  const slug = zilId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `room-${slug || 'x'}`;
}

function titleFromId(zilId: string): string {
  return zilId
    .toLowerCase()
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeProse(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_PROSE ? `${collapsed.slice(0, MAX_PROSE).trimEnd()}…` : collapsed;
}

/** String literals of a routine's M-LOOK branch, joined (best effort). */
function proseFromAction(routineChunk: string): string {
  const lookIndex = routineChunk.indexOf('M-LOOK');
  if (lookIndex === -1) {
    return '';
  }
  const branch = routineChunk.slice(lookIndex);
  const nextBranch = branch.slice(6).search(/,M-[A-Z]/);
  const scope = nextBranch === -1 ? branch : branch.slice(0, nextBranch + 6);
  const strings = [...scope.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  return strings.join(' ');
}

export interface ConversionReport {
  /** Counts of what was recovered, with its source category. */
  recovered: {
    rooms: number;
    exits: number;
    gatedExits: number;
    proseLdesc: number;
    proseMLook: number;
    globalsAsQualities: number;
    worlds: number;
  };
  /** Mappings that are real but interpretive (game-data.js "DERIVED" style). */
  derived: string[];
  /** What the source contains that this deconstruction does not carry over. */
  notRecovered: string[];
}

export interface ZilToDslOptions {
  /** Story title; defaults to the first room's DESC. */
  title?: string;
  /** Extract simple <GLOBAL> declarations as qualities. */
  globals?: boolean;
}

interface Room {
  slug: string;
  worldId?: string;
  title: string;
  prose: string;
  proseSource: 'ldesc' | 'mlook' | 'none';
  exits: Array<{ label: string; target: string; condition?: string }>;
}

interface ZilFile {
  name: string;
  source: string;
}

/** Deconstruct one or more ZIL files; multiple files become worlds. */
export function deconstructZil(
  files: ZilFile[],
  options: ZilToDslOptions = {},
): { dsl: string; report: ConversionReport } {
  const multiWorld = files.length > 1;
  const report: ConversionReport = {
    recovered: {
      rooms: 0,
      exits: 0,
      gatedExits: 0,
      proseLdesc: 0,
      proseMLook: 0,
      globalsAsQualities: 0,
      worlds: multiWorld ? files.length : 0,
    },
    derived: [],
    notRecovered: [],
  };

  const rooms: Room[] = [];
  const slugsByZilId = new Map<string, string>(); // ZIL id -> final (maybe qualified) id
  const gateQualities = new Map<string, string>(); // quality id -> derivation note
  const globalQualities: string[] = [];
  const worldOfFile = new Map<string, string>();

  let blockedSorry = 0;
  let blockedPer = 0;
  let complexGlobals = 0;

  const pendingExits: Array<{
    fromZilId: string;
    label: string;
    toZilId: string;
    condition?: string;
  }> = [];

  files.forEach((file) => {
    const worldId = multiWorld ? slugify(file.name.replace(/\.[^.]*$/, '')) : undefined;
    if (worldId) {
      worldOfFile.set(file.name, worldId);
    }
    const chunks = file.source.split(/^(?=<)/m);

    const routines = new Map<string, string>();
    chunks.forEach((chunk) => {
      const header = /^<ROUTINE\s+([A-Z0-9?-]+)/.exec(chunk);
      if (header) {
        routines.set(header[1], chunk);
      }
    });

    chunks.forEach((chunk) => {
      const header = /^<ROOM\s+([A-Z0-9][A-Z0-9-]*)/.exec(chunk);
      if (header) {
        const zilId = header[1];
        if (slugsByZilId.has(zilId)) {
          return;
        }
        const baseSlug = slugify(zilId);
        const slug = worldId ? `${worldId}:${baseSlug}` : baseSlug;
        slugsByZilId.set(zilId, slug);

        const desc = /\(DESC\s+"([^"]*)"/.exec(chunk);
        const ldesc = /\(LDESC\s+"([^"]*)"/.exec(chunk);
        const action = /\(ACTION\s+([A-Z0-9?-]+)\)/.exec(chunk);

        let prose = ldesc ? ldesc[1] : '';
        let proseSource: Room['proseSource'] = ldesc ? 'ldesc' : 'none';
        if (!prose && action && routines.has(action[1])) {
          prose = proseFromAction(routines.get(action[1])!);
          if (prose) {
            proseSource = 'mlook';
          }
        }

        rooms.push({
          slug,
          worldId,
          title: desc?.[1] || titleFromId(zilId),
          prose: normalizeProse(prose),
          proseSource,
          exits: [],
        });

        for (const exit of chunk.matchAll(EXITS)) {
          const [, dir, target, rawGate] = exit;
          let condition: string | undefined;
          if (rawGate && rawGate.trim()) {
            const gate = /IF\s+([A-Z0-9][A-Z0-9-]*)(\s+IS\s+OPEN)?/.exec(rawGate)!;
            const isDoor = Boolean(gate[2]);
            const qualityId = isDoor ? `${slugify(gate[1])}-open` : slugify(gate[1]);
            condition = qualityId;
            if (!gateQualities.has(qualityId)) {
              gateQualities.set(
                qualityId,
                isDoor
                  ? `door gate: "${gate[1]} IS OPEN" → boolean quality "${qualityId}" (opening mechanics live in routine logic — author the effects that set it)`
                  : `flag gate: global "${gate[1]}" → boolean quality "${qualityId}" (what sets the flag lives in routine logic — author the effects)`,
              );
            }
          }
          pendingExits.push({
            fromZilId: zilId,
            label: DIRECTION_LABELS[dir],
            toZilId: target,
            condition,
          });
        }

        for (const blocked of chunk.matchAll(BLOCKED_EXITS)) {
          if (blocked[1] === 'SORRY') {
            blockedSorry += 1;
          } else {
            blockedPer += 1;
          }
        }
        return;
      }

      if (options.globals) {
        // First line of the form only; greedy up to the line's last '>' so
        // `<>` (false) and `<ITABLE …>` values survive intact.
        const firstLine = chunk.split('\n', 1)[0];
        const globalHeader = /^<GLOBAL\s+([A-Z0-9][A-Z0-9-]*)\s+(.*)>[^>]*$/.exec(firstLine);
        if (globalHeader) {
          const [, name, rawValue] = globalHeader;
          const id = slugify(name);
          if (RESERVED_QUALITY_IDS.has(id)) {
            report.derived.push(
              `global ${name} skipped: "${id}" is an engine-maintained quality name`,
            );
            return;
          }
          const value = rawValue.trim();
          let declaration: string | undefined;
          if (/^-?\d+$/.test(value)) {
            declaration = `quality ${id} number = ${value}`;
          } else if (value === '<>') {
            declaration = `quality ${id} boolean = false`;
          } else if (value === 'T') {
            declaration = `quality ${id} boolean = true`;
          } else if (/^"[^"]*"$/.test(value)) {
            declaration = `quality ${id} string = ${value.slice(1, -1).replace(/\s+/g, ' ')}`;
          }
          if (declaration) {
            globalQualities.push(declaration);
          } else {
            complexGlobals += 1;
          }
        }
      }
    });
  });

  if (rooms.length === 0) {
    throw new Error('No <ROOM ...> definitions found in the ZIL source');
  }

  // Resolve exits — cross-file targets become world-switch links.
  const bySlug = new Map(rooms.map((room) => [room.slug, room]));
  const linkSeen = new Set<string>();
  let unresolvedExits = 0;
  pendingExits.forEach(({ fromZilId, label, toZilId, condition }) => {
    const fromSlug = slugsByZilId.get(fromZilId);
    const toSlug = slugsByZilId.get(toZilId);
    if (!fromSlug) {
      return;
    }
    if (!toSlug || fromSlug === toSlug) {
      if (!toSlug) {
        unresolvedExits += 1;
      }
      return;
    }
    // Dedup identical exits only — the same two rooms may be joined by
    // multiple distinct exits (different directions or different gates).
    const key = `${fromSlug} > ${toSlug} > ${label} > ${condition ?? ''}`;
    if (!linkSeen.has(key)) {
      linkSeen.add(key);
      bySlug.get(fromSlug)!.exits.push({ label, target: toSlug, condition });
      report.recovered.exits += 1;
      if (condition) {
        report.recovered.gatedExits += 1;
      }
    }
  });

  // Emit the DSL.
  const title = options.title ?? rooms[0].title;
  const lines: string[] = [`title: ${title}`, ''];

  if (multiWorld) {
    for (const [file, worldId] of worldOfFile) {
      lines.push(`world ${worldId} "${titleFromId(slugify(file.replace(/\.[^.]*$/, '')))}"`);
    }
    lines.push('');
  }

  for (const [qualityId] of gateQualities) {
    lines.push(`quality ${qualityId} boolean = false`);
  }
  globalQualities.forEach((declaration) => lines.push(declaration));
  if (gateQualities.size > 0 || globalQualities.length > 0) {
    lines.push('');
  }

  const sections = rooms.map((room, index) => {
    const sectionLines = [
      index === 0 ? `:: ${room.slug} [start]` : `:: ${room.slug}`,
      room.title,
      '',
      sanitizeProse(room.prose) || '...',
    ];
    room.exits.forEach((exit) => {
      const gate = exit.condition ? ` ? ${exit.condition}` : '';
      sectionLines.push('', `-> ${exit.label} => ${exit.target}${gate}`);
    });
    return sectionLines.join('\n');
  });

  // Fill the report.
  report.recovered.rooms = rooms.length;
  report.recovered.proseLdesc = rooms.filter((room) => room.proseSource === 'ldesc').length;
  report.recovered.proseMLook = rooms.filter((room) => room.proseSource === 'mlook').length;
  report.recovered.globalsAsQualities = globalQualities.length;
  gateQualities.forEach((note) => report.derived.push(note));
  if (report.recovered.proseMLook > 0) {
    report.derived.push(
      `${report.recovered.proseMLook} room descriptions taken from ACTION M-LOOK string literals (heuristic slice of the routine, not an interpreter)`,
    );
  }
  const roomsWithoutProse = rooms.length - report.recovered.proseLdesc - report.recovered.proseMLook;
  if (roomsWithoutProse > 0) {
    report.notRecovered.push(`${roomsWithoutProse} rooms have no static prose (routine-generated text)`);
  }
  if (blockedSorry > 0) {
    report.notRecovered.push(
      `${blockedSorry} SORRY (blocked) exits and their messages — no blocked-link DSL construct yet`,
    );
  }
  if (blockedPer > 0) {
    report.notRecovered.push(`${blockedPer} PER (routine-scripted) exits`);
  }
  if (unresolvedExits > 0) {
    report.notRecovered.push(`${unresolvedExits} exits target rooms outside the given files`);
  }
  if (complexGlobals > 0) {
    report.notRecovered.push(`${complexGlobals} table/complex globals (not expressible as qualities)`);
  }
  report.notRecovered.push('object definitions, interrupts, and all action-routine logic');

  return { dsl: `${lines.join('\n')}\n${sections.join('\n\n')}\n`, report };
}

/** Human-readable report block for CLI/dialog display. */
export function formatConversionReport(report: ConversionReport): string {
  const r = report.recovered;
  const out: string[] = [
    'Deconstruction report:',
    `  recovered: ${r.rooms} rooms, ${r.exits} exits (${r.gatedExits} gated), prose for ${
      r.proseLdesc + r.proseMLook
    } rooms (${r.proseLdesc} LDESC, ${r.proseMLook} M-LOOK)` +
      (r.worlds > 0 ? `, ${r.worlds} worlds` : '') +
      (r.globalsAsQualities > 0 ? `, ${r.globalsAsQualities} globals as qualities` : ''),
  ];
  if (report.derived.length > 0) {
    out.push('  derived:');
    report.derived.forEach((line) => out.push(`    - ${line}`));
  }
  if (report.notRecovered.length > 0) {
    out.push('  not recovered:');
    report.notRecovered.forEach((line) => out.push(`    - ${line}`));
  }
  return out.join('\n');
}

/** Single-source convenience (workbench Import, back-compat). */
export function zilToDsl(source: string, options: ZilToDslOptions = {}): string {
  return deconstructZil([{ name: 'game', source }], options).dsl;
}
