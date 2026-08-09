/**
 * TextPlus Workbench - Journal Panel
 *
 * Renders the game's task checklist and recorded journal entries (captures).
 * Entry content is the engine's frozen snapshot from capture time — compiled
 * HTML from the author pipeline, same trust level as the preview itself.
 */

import type { JournalEntry, TaskDefinition } from '@textplus/core';

export interface JournalRenderOptions {
  /** Invoked with the entry's situation id when an entry is clicked. */
  onEntryClick?: (situationId: string) => void;
}

export function renderJournal(
  target: HTMLElement,
  tasks: Record<string, TaskDefinition>,
  journal: JournalEntry[],
  options: JournalRenderOptions = {},
): void {
  target.replaceChildren();

  const taskIds = Object.keys(tasks);
  if (taskIds.length === 0 && journal.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'journal-empty';
    empty.textContent = 'Declare tasks and use { capture task-id } effects to record scenes here.';
    target.appendChild(empty);
    return;
  }

  if (taskIds.length > 0) {
    const done = new Set(journal.map((entry) => entry.taskId).filter(Boolean));
    const heading = document.createElement('h3');
    heading.className = 'journal-heading';
    heading.textContent = 'Tasks';
    target.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'journal-tasks';
    taskIds.forEach((taskId) => {
      const item = document.createElement('li');
      item.className = 'journal-task';
      item.setAttribute('data-task-id', taskId);
      item.setAttribute('data-task-state', done.has(taskId) ? 'done' : 'pending');
      item.textContent = `${done.has(taskId) ? '▣' : '▢'} ${tasks[taskId].label}`;
      list.appendChild(item);
    });
    target.appendChild(list);
  }

  if (journal.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'journal-heading';
    heading.textContent = 'Recordings';
    target.appendChild(heading);

    const list = document.createElement('ol');
    list.className = 'journal-entries';
    journal.forEach((entry) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'journal-entry';

      const meta = document.createElement('div');
      meta.className = 'journal-entry__meta';
      const parts = [`turn ${entry.turn}`];
      if (entry.world) {
        parts.push(entry.world);
      }
      parts.push(entry.situationId);
      if (entry.taskId && tasks[entry.taskId]) {
        parts.push(tasks[entry.taskId].label);
      }
      meta.textContent = parts.join(' · ');
      button.appendChild(meta);

      const content = document.createElement('div');
      content.className = 'journal-entry__content';
      content.innerHTML = entry.content;
      button.appendChild(content);

      if (options.onEntryClick) {
        button.addEventListener('click', () => options.onEntryClick!(entry.situationId));
      }
      item.appendChild(button);
      list.appendChild(item);
    });
    target.appendChild(list);
  }
}
