/**
 * TextPlus Convert - CLI (M4)
 *
 *   textplus-convert <transcript...> [--title <t>] [--out <file>] [--check]
 *
 * One file converts linearly (transcriptToDsl); several files merge into a
 * branching story (mergeTranscriptsToDsl). --check compiles the result
 * through @textplus/author and reports. Exit codes: 0 success, 1 failure,
 * 2 usage. Node-only entry point — built to dist/cli.mjs, run via bin/.
 */

import { transcriptToDsl } from './transcript';
import { mergeTranscriptsToDsl } from './merge';

const USAGE = `Usage: textplus-convert <transcript...> [options]

Converts parser-IF transcripts to TextPlus DSL. One file converts linearly;
several files merge into a branching story (rooms unify by header name).

Options:
  --title <title>   Override the story title
  --out <file>      Write the DSL to a file instead of stdout
  --check           Compile the result through @textplus/author and report
`;

function usage(): number {
  console.error(USAGE);
  return 2;
}

/** Run the CLI; returns the process exit code. */
export async function runCli(argv: string[]): Promise<number> {
  const files: string[] = [];
  let title: string | undefined;
  let out: string | undefined;
  let check = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--title') {
      title = argv[(i += 1)];
      if (!title) {
        return usage();
      }
    } else if (arg === '--out') {
      out = argv[(i += 1)];
      if (!out) {
        return usage();
      }
    } else if (arg === '--check') {
      check = true;
    } else if (arg.startsWith('--')) {
      return usage();
    } else {
      files.push(arg);
    }
  }
  if (files.length === 0) {
    return usage();
  }

  const { readFile, writeFile } = await import('node:fs/promises');
  const texts: string[] = [];
  for (const file of files) {
    try {
      texts.push(await readFile(file, 'utf8'));
    } catch (error) {
      console.error(`Cannot read "${file}": ${(error as Error).message}`);
      return 1;
    }
  }

  let dsl: string;
  try {
    dsl =
      texts.length === 1
        ? transcriptToDsl(texts[0], { title })
        : mergeTranscriptsToDsl(texts, { title });
  } catch (error) {
    console.error(`Conversion failed: ${(error as Error).message}`);
    return 1;
  }

  if (out) {
    await writeFile(out, dsl, 'utf8');
    console.log(`DSL written to ${out}`);
  } else {
    console.log(dsl);
  }

  if (check) {
    const { workflowExecute, formatWorkflowReport } = await import('@textplus/author');
    const result = workflowExecute(dsl);
    console.log(formatWorkflowReport(result));
    return result.success ? 0 : 1;
  }
  return 0;
}
