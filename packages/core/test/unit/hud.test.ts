// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHud, applyHudThemes } from '../../src/hud';
import type { HudConfig, HudThemeRule, QualityValue } from '../../src/types';

function qualities(values: Record<string, number | boolean | string>, bounds?: Record<string, { min?: number; max?: number }>): Record<string, QualityValue> {
  const record: Record<string, QualityValue> = {};
  Object.entries(values).forEach(([id, value]) => {
    record[id] = {
      definition: {
        name: id.charAt(0).toUpperCase() + id.slice(1),
        type: typeof value as 'number' | 'boolean' | 'string',
        default: value,
        min: bounds?.[id]?.min,
        max: bounds?.[id]?.max,
      },
      value,
    };
  });
  return record;
}

function target(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderHud meters', () => {
  const hud: HudConfig = { entries: [{ qualityId: 'courage', kind: 'meter' }] };

  it('renders a progressbar with correct aria geometry from min/max', () => {
    const el = target();
    renderHud(hud, qualities({ courage: 6 }, { courage: { min: 0, max: 10 } }), el);
    const track = el.querySelector('[role="progressbar"]')!;
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('10');
    expect(track.getAttribute('aria-valuenow')).toBe('6');
    const fill = el.querySelector<HTMLElement>('.tp-hud__fill')!;
    expect(fill.style.width).toBe('60%');
  });

  it('defaults missing bounds to 0..100', () => {
    const el = target();
    renderHud(hud, qualities({ courage: 25 }), el);
    const track = el.querySelector('[role="progressbar"]')!;
    expect(track.getAttribute('aria-valuemax')).toBe('100');
    expect(el.querySelector<HTMLElement>('.tp-hud__fill')!.style.width).toBe('25%');
  });

  it('clamps out-of-range values into the track', () => {
    const el = target();
    renderHud(hud, qualities({ courage: 200 }, { courage: { min: 0, max: 10 } }), el);
    expect(el.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('10');
    expect(el.querySelector<HTMLElement>('.tp-hud__fill')!.style.width).toBe('100%');
  });

  it('uses the custom label when given, else the quality name', () => {
    const el = target();
    renderHud({ entries: [{ qualityId: 'courage', kind: 'meter', label: 'Bravery' }] }, qualities({ courage: 5 }), el);
    expect(el.querySelector('.tp-hud__label')!.textContent).toBe('Bravery');

    renderHud(hud, qualities({ courage: 5 }), el);
    expect(el.querySelector('.tp-hud__label')!.textContent).toBe('Courage');
  });
});

describe('renderHud badges and readouts', () => {
  it('shows a badge only when the quality is truthy', () => {
    const el = target();
    const hud: HudConfig = { entries: [{ qualityId: 'hasKey', kind: 'badge', label: 'Found the key' }] };
    renderHud(hud, qualities({ hasKey: false }), el);
    expect(el.querySelector('.tp-hud__badge')).toBeNull();

    renderHud(hud, qualities({ hasKey: true }), el);
    expect(el.querySelector('.tp-hud__badge')!.textContent).toBe('Found the key');
  });

  it('renders readouts as label + value', () => {
    const el = target();
    renderHud({ entries: [{ qualityId: 'mood', kind: 'readout' }] }, qualities({ mood: 'grim' }), el);
    const readout = el.querySelector('.tp-hud__readout')!;
    expect(readout.querySelector('.tp-hud__label')!.textContent).toBe('Mood');
    expect(readout.querySelector('.tp-hud__value')!.textContent).toBe('grim');
  });

  it('skips entries whose quality does not exist', () => {
    const el = target();
    renderHud({ entries: [{ qualityId: 'ghost', kind: 'meter' }] }, qualities({}), el);
    expect(el.querySelectorAll('.tp-hud > *').length).toBe(0);
  });
});

describe('renderHud idempotency', () => {
  it('re-rendering replaces the previous panel', () => {
    const el = target();
    const hud: HudConfig = { entries: [{ qualityId: 'courage', kind: 'meter' }] };
    renderHud(hud, qualities({ courage: 3 }), el);
    renderHud(hud, qualities({ courage: 7 }), el);
    expect(el.querySelectorAll('.tp-hud').length).toBe(1);
    expect(el.querySelector('.tp-hud__value')!.textContent).toBe('7');
  });
});

describe('applyHudThemes', () => {
  const rules: HudThemeRule[] = [
    { theme: 'dim', when: (q) => Number(q.sanity?.value) < 70 },
    { theme: 'dark', when: (q) => Number(q.sanity?.value) < 40 },
  ];

  it('applies the last matching rule (declaration order precedence)', () => {
    const el = target();
    expect(applyHudThemes(rules, qualities({ sanity: 30 }), el)).toBe('dark');
    expect(el.getAttribute('data-theme')).toBe('dark');

    expect(applyHudThemes(rules, qualities({ sanity: 60 }), el)).toBe('dim');
    expect(el.getAttribute('data-theme')).toBe('dim');
  });

  it('clears the attribute when no rule matches', () => {
    const el = target();
    applyHudThemes(rules, qualities({ sanity: 30 }), el);
    expect(applyHudThemes(rules, qualities({ sanity: 100 }), el)).toBeNull();
    expect(el.hasAttribute('data-theme')).toBe(false);
  });

  it('treats a throwing rule as a non-match', () => {
    const el = target();
    const throwing: HudThemeRule[] = [
      {
        theme: 'boom',
        when: () => {
          throw new Error('bad rule');
        },
      },
    ];
    expect(applyHudThemes(throwing, qualities({}), el)).toBeNull();
  });

  it('applies css variables when the rule carries them', () => {
    const el = target();
    applyHudThemes(
      [{ theme: 'dark', when: () => true, variables: { '--tp-test': 'crimson' } }],
      qualities({}),
      el,
    );
    expect(el.style.getPropertyValue('--tp-test')).toBe('crimson');
  });
});
