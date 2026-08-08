/**
 * TextPlus Author - CLI (M2 Phase 2D)
 *
 * One executable covering the full workflow, wired to the library surface:
 *
 *   textplus-author compile <file> [--out <report.json>]
 *   textplus-author lint <file>
 *   textplus-author scaffold <name> [dir]     (also the create-textplus-game bin)
 *
 * Exit codes: 0 success (warnings allowed), 1 errors/failure, 2 usage.
 * Node-only entry point — built to dist/cli.mjs, invoked via bin/ wrappers.
 */

import { workflowExecute, formatWorkflowReport, serializeWorkflowResult } from './workflow';
import { parseGame } from './parser';
import { lintAST, formatDiagnostics } from './linter';
import { createScaffold } from './index';

const USAGE = `Usage: textplus-author <command>

Commands:
  compile <file> [--out <report.json>]  Compile DSL; human-readable report to
                                        stdout, full JSON report to --out
  lint <file>                           Lint DSL; exit 1 when errors are found
  scaffold <name> [dir]                 Create a starter game (also exposed as
                                        the create-textplus-game bin)
`;

async function readSource(file: string): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    return await readFile(file, 'utf8');
  } catch (error) {
    console.error(`Cannot read "${file}": ${(error as Error).message}`);
    return null;
  }
}

async function compileCommand(args: string[]): Promise<number> {
  const outIndex = args.indexOf('--out');
  const out = outIndex !== -1 ? args[outIndex + 1] : undefined;
  const positional = args.filter(
    (arg, i) => arg !== '--out' && (outIndex === -1 || i !== outIndex + 1),
  );
  const file = positional[0];
  if (!file || (outIndex !== -1 && !out)) {
    console.error(USAGE);
    return 2;
  }

  const source = await readSource(file);
  if (source === null) {
    return 1;
  }

  const result = workflowExecute(source);
  console.log(formatWorkflowReport(result));

  if (out) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(out, serializeWorkflowResult(result), 'utf8');
    console.log(`Report written to ${out}`);
  }
  return result.success ? 0 : 1;
}

async function lintCommand(args: string[]): Promise<number> {
  const file = args[0];
  if (!file) {
    console.error(USAGE);
    return 2;
  }

  const source = await readSource(file);
  if (source === null) {
    return 1;
  }

  try {
    const output = lintAST(parseGame(source));
    console.log(formatDiagnostics(output));
    return output.isValid ? 0 : 1;
  } catch (error) {
    console.error(`Parse error: ${(error as Error).message}`);
    return 1;
  }
}

async function scaffoldCommand(args: string[]): Promise<number> {
  const [name, dir = '.'] = args;
  if (!name || !/^[A-Za-z0-9][\w-]*$/.test(name)) {
    console.error(name ? `Invalid project name "${name}" (letters, digits, - and _ only)` : USAGE);
    return name ? 1 : 2;
  }

  try {
    await createScaffold(name, dir);
    const { join } = await import('node:path');
    console.log(`Scaffolded "${name}" in ${join(dir, name)}`);
    return 0;
  } catch (error) {
    console.error(`Scaffold failed: ${(error as Error).message}`);
    return 1;
  }
}

/** Run the CLI; returns the process exit code. */
export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  switch (command) {
    case 'compile':
      return compileCommand(rest);
    case 'lint':
      return lintCommand(rest);
    case 'scaffold':
      return scaffoldCommand(rest);
    default:
      console.error(USAGE);
      return 2;
  }
}
