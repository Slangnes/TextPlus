/**
 * TextPlus Core - Declarative HUD Renderer
 *
 * Renders quality-bound HUD elements (meters, badges, readouts) and applies
 * state-driven theme rules — the sanctioned replacement for the hand-rolled
 * sidebars in the demo harnesses. Idempotent like renderQualities: each call
 * replaces the previous panel in place.
 *
 * Theme precedence: DSL/state rules are authoritative. A manual theme toggle
 * (like memory-keeper's) should treat its choice as a session override and
 * expect the next matching rule change to reassert the declared theme.
 */

import type { HudConfig, HudEntryConfig, HudThemeRule, QualityValue } from './types';
import { applyTheme } from './dom';

const CSS_CLASS_HUD = 'tp-hud';

function renderMeter(entry: HudEntryConfig, label: string, quality: QualityValue): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'tp-hud__meter';
  wrapper.setAttribute('data-quality-id', entry.qualityId);

  const labelEl = document.createElement('span');
  labelEl.className = 'tp-hud__label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const min = quality.definition.min ?? 0;
  const max = quality.definition.max ?? 100;
  const numeric = typeof quality.value === 'number' ? quality.value : Number(quality.value) || 0;
  const clamped = Math.min(max, Math.max(min, numeric));
  const percent = max === min ? 0 : ((clamped - min) / (max - min)) * 100;

  const track = document.createElement('div');
  track.className = 'tp-hud__track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', label);
  track.setAttribute('aria-valuemin', String(min));
  track.setAttribute('aria-valuemax', String(max));
  track.setAttribute('aria-valuenow', String(clamped));

  const fill = document.createElement('div');
  fill.className = 'tp-hud__fill';
  fill.style.width = `${percent}%`;
  track.appendChild(fill);
  wrapper.appendChild(track);

  const valueEl = document.createElement('span');
  valueEl.className = 'tp-hud__value';
  valueEl.textContent = String(quality.value);
  wrapper.appendChild(valueEl);

  return wrapper;
}

function renderBadge(entry: HudEntryConfig, label: string): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'tp-hud__badge';
  badge.setAttribute('data-quality-id', entry.qualityId);
  badge.textContent = label;
  return badge;
}

function renderReadout(entry: HudEntryConfig, label: string, quality: QualityValue): HTMLElement {
  const readout = document.createElement('div');
  readout.className = 'tp-hud__readout';
  readout.setAttribute('data-quality-id', entry.qualityId);

  const labelEl = document.createElement('span');
  labelEl.className = 'tp-hud__label';
  labelEl.textContent = label;
  readout.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.className = 'tp-hud__value';
  valueEl.textContent = String(quality.value);
  readout.appendChild(valueEl);

  return readout;
}

/**
 * Render the HUD into `target`, replacing any previous HUD panel there.
 * Entries referencing unknown qualities are skipped (the author-side linter
 * warns about them at compile time).
 */
export function renderHud(
  hud: HudConfig,
  qualities: Record<string, QualityValue>,
  target: HTMLElement,
): void {
  const existing = target.querySelector(`.${CSS_CLASS_HUD}`);
  if (existing) {
    target.removeChild(existing);
  }

  const root = document.createElement('div');
  root.className = CSS_CLASS_HUD;
  root.setAttribute('aria-label', 'Status');

  hud.entries.forEach((entry) => {
    const quality = qualities[entry.qualityId];
    if (!quality) {
      return;
    }
    const label = entry.label ?? quality.definition.name;

    switch (entry.kind) {
      case 'meter':
        root.appendChild(renderMeter(entry, label, quality));
        break;
      case 'badge':
        if (quality.value) {
          root.appendChild(renderBadge(entry, label));
        }
        break;
      case 'readout':
        root.appendChild(renderReadout(entry, label, quality));
        break;
    }
  });

  target.appendChild(root);
}

/**
 * Evaluate theme rules against the current qualities and apply the winner
 * (last matching rule) as a data-theme attribute on `root`. No match clears
 * the attribute. Returns the applied theme name, or null.
 */
export function applyHudThemes(
  rules: HudThemeRule[],
  qualities: Record<string, QualityValue>,
  root: HTMLElement,
): string | null {
  let winner: HudThemeRule | null = null;
  rules.forEach((rule) => {
    try {
      if (rule.when(qualities)) {
        winner = rule;
      }
    } catch {
      // A throwing rule simply doesn't match.
    }
  });

  if (!winner) {
    root.removeAttribute('data-theme');
    return null;
  }

  const applied = winner as HudThemeRule;
  root.setAttribute('data-theme', applied.theme);
  if (applied.variables) {
    // Storage null: state-driven themes are transient, not a saved preference.
    applyTheme(applied.variables, applied.theme, root, null);
  }
  return applied.theme;
}
