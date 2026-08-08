/**
 * TextPlus Workbench - Compile Controller
 *
 * Pure view-model layer between the editor and the author pipeline.
 * Runs the parse → compile → lint workflow and shapes the result for display.
 */

import { workflowExecute } from '@textplus/author';
import type { GameConfig } from '@textplus/core';

export type WorkbenchStatus = 'empty' | 'error' | 'warning' | 'ok';

export interface WorkbenchIssue {
  severity: 'error' | 'warning';
  message: string;
  /** 1-based source line, when the message carries one ("Line 12: ...") */
  line: number | null;
}

export interface WorkbenchReport {
  status: WorkbenchStatus;
  config: GameConfig | null;
  issues: WorkbenchIssue[];
  /** Short human summary, e.g. "5 situations · 2 qualities" */
  summary: string;
}

/** Pull a 1-based line number out of a diagnostic message, if present. */
export function extractLineNumber(message: string): number | null {
  const match = message.match(/Line (\d+):/);
  return match ? Number(match[1]) : null;
}

/** Run the full author workflow over DSL source and shape a display report. */
export function analyzeSource(source: string): WorkbenchReport {
  if (!source.trim()) {
    return { status: 'empty', config: null, issues: [], summary: '' };
  }

  const result = workflowExecute(source);

  const issues: WorkbenchIssue[] = [
    ...result.errors.map((message): WorkbenchIssue => ({
      severity: 'error',
      message,
      line: extractLineNumber(message),
    })),
    ...result.warnings.map((message): WorkbenchIssue => ({
      severity: 'warning',
      message,
      line: extractLineNumber(message),
    })),
  ];

  const config = result.success && result.config ? result.config : null;

  let status: WorkbenchStatus;
  if (!config) {
    status = 'error';
  } else if (result.warnings.length > 0) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  const summary = config
    ? `${Object.keys(config.situations).length} situations · ${Object.keys(config.qualities).length} qualities`
    : '';

  return { status, config, issues, summary };
}
