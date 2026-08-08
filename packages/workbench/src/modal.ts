/**
 * TextPlus Workbench - Modal Dialogs
 *
 * Project convention: never use native browser popups (window.alert /
 * window.confirm / window.prompt). These in-app modals replace them, and
 * every confirmation offers "Don't ask again", persisted via settings.
 * Enforced by test/unit/conventions.test.ts.
 */

import { getSettings, updateSettings } from './settings';
import type { WorkbenchSettings } from './settings';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  storage?: Storage | null;
}

interface ModalShell {
  backdrop: HTMLDivElement;
  dialog: HTMLDivElement;
  body: HTMLDivElement;
  actions: HTMLDivElement;
  close: () => void;
}

function buildModal(title: string, onDismiss: () => void): ModalShell {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title);

  const heading = document.createElement('h2');
  heading.className = 'modal__title';
  heading.textContent = title;
  dialog.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'modal__body';
  dialog.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';
  dialog.appendChild(actions);

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      onDismiss();
    }
  };
  document.addEventListener('keydown', onKeydown);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      onDismiss();
    }
  });

  const close = (): void => {
    document.removeEventListener('keydown', onKeydown);
    backdrop.remove();
  };

  return { backdrop, dialog, body, actions, close };
}

function makeButton(label: string, variant: 'primary' | 'plain', onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `modal__button modal__button--${variant}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/**
 * In-app replacement for window.confirm. Resolves immediately with true when
 * the user has turned confirmations off; otherwise shows a modal with a
 * "Don't ask again" option.
 */
export function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const storage = options.storage;
  if (!getSettings(storage).confirmBeforeReplace) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let shell: ModalShell;
    const finish = (result: boolean): void => {
      shell.close();
      resolve(result);
    };

    shell = buildModal(options.title ?? 'Are you sure?', () => finish(false));

    const text = document.createElement('p');
    text.textContent = message;
    shell.body.appendChild(text);

    const suppressLabel = document.createElement('label');
    suppressLabel.className = 'modal__suppress';
    const suppress = document.createElement('input');
    suppress.type = 'checkbox';
    suppressLabel.appendChild(suppress);
    suppressLabel.appendChild(document.createTextNode(" Don't ask again (change in Settings)"));
    shell.body.appendChild(suppressLabel);

    shell.actions.appendChild(makeButton(options.cancelLabel ?? 'Cancel', 'plain', () => finish(false)));
    const confirmButton = makeButton(options.confirmLabel ?? 'Replace', 'primary', () => {
      if (suppress.checked) {
        updateSettings({ confirmBeforeReplace: false }, storage);
      }
      finish(true);
    });
    shell.actions.appendChild(confirmButton);
    confirmButton.focus();
  });
}

export interface SettingsDialogOptions {
  storage?: Storage | null;
  /** Called with the full settings after every change, for live application. */
  onChange?: (settings: WorkbenchSettings) => void;
}

/** Settings dialog: confirmation and editor preferences. */
export function openSettingsDialog(options: SettingsDialogOptions = {}): Promise<void> {
  const { storage, onChange } = options;
  return new Promise<void>((resolve) => {
    let shell: ModalShell;
    const finish = (): void => {
      shell.close();
      resolve();
    };

    shell = buildModal('Workbench Settings', finish);

    const addToggle = (
      label: string,
      key: 'confirmBeforeReplace' | 'editorWordWrap',
      className: string,
    ): void => {
      const row = document.createElement('label');
      row.className = `modal__setting ${className}`;
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = getSettings(storage)[key];
      toggle.addEventListener('change', () => {
        const next = updateSettings({ [key]: toggle.checked }, storage);
        if (onChange) {
          onChange(next);
        }
      });
      row.appendChild(toggle);
      row.appendChild(document.createTextNode(` ${label}`));
      shell.body.appendChild(row);
    };

    addToggle('Ask for confirmation before replacing the story', 'confirmBeforeReplace', 'modal__setting--confirm');
    addToggle('Wrap long lines in the editor', 'editorWordWrap', 'modal__setting--wrap');

    const closeButton = makeButton('Close', 'primary', finish);
    shell.actions.appendChild(closeButton);
    closeButton.focus();
  });
}
