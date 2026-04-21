// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomRenderer, renderQualities, applyTheme, getSavedTheme } from '@textplus/core';
import type { GameEngine, SituationDefinition, QualityValue } from '@textplus/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngine(overrides: Partial<GameEngine> = {}): GameEngine {
  return {
    config: { title: 'Test', initialSituation: 'start', qualities: {}, situations: {} },
    currentSituation: 'start',
    getQuality: vi.fn(() => 0),
    setQuality: vi.fn(),
    mutateQuality: vi.fn(),
    getQualityDefinition: vi.fn(),
    getAllQualities: vi.fn(() => ({})),
    getSituationHistory: vi.fn(() => []),
    hasSituationBeenVisited: vi.fn(() => false),
    getSituation: vi.fn(),
    getCurrentSituation: vi.fn(),
    getAvailableLinks: vi.fn(() => []),
    goToSituation: vi.fn(),
    followLink: vi.fn(),
    getSaveState: vi.fn(),
    loadState: vi.fn(),
    reset: vi.fn(),
    onQualityChange: vi.fn(() => () => {}),
    onSituationChange: vi.fn(() => () => {}),
    getCurrentSituationContent: vi.fn(() => 'Dynamic content'),
    checkCondition: vi.fn(() => true),
    ...overrides
  } as unknown as GameEngine;
}

function makeSituation(overrides: Partial<SituationDefinition> = {}): SituationDefinition {
  return {
    id: 'start',
    title: 'A Beginning',
    content: '<p>Welcome to TextPlus.</p>',
    links: [],
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TextPlus Core - DOM Integration', () => {
  let renderer: DomRenderer;
  let target: HTMLElement;

  beforeEach(() => {
    renderer = new DomRenderer();
    target = document.createElement('div');
  });

  // -------------------------------------------------------------------------
  describe('Rendering', () => {
    it('should render situation title and content to DOM', () => {
      const engine = makeEngine();
      renderer.render(makeSituation(), engine, target);

      expect(target.querySelector('.tp-title')?.textContent).toBe('A Beginning');
      expect(target.querySelector('.tp-body')?.innerHTML).toBe('<p>Welcome to TextPlus.</p>');
    });

    it('should clear previous content on subsequent renders', () => {
      const engine = makeEngine();
      renderer.render(makeSituation({ title: 'First' }), engine, target);
      renderer.render(makeSituation({ title: 'Second' }), engine, target);

      const titles = target.querySelectorAll('.tp-title');
      expect(titles.length).toBe(1);
      expect(titles[0].textContent).toBe('Second');
    });

    it('should evaluate dynamic content via engine.getCurrentSituationContent()', () => {
      const engine = makeEngine({ getCurrentSituationContent: vi.fn(() => 'Dynamic content') });
      const sitDynamic = makeSituation({ content: () => 'ignored' });
      renderer.render(sitDynamic, engine, target);

      expect(target.querySelector('.tp-body')?.textContent).toBe('Dynamic content');
      expect(engine.getCurrentSituationContent).toHaveBeenCalled();
    });

    it('should apply situation tags as CSS classes to wrapper', () => {
      const engine = makeEngine();
      renderer.render(makeSituation({ tags: ['dark', 'forest'] }), engine, target);

      const wrapper = target.querySelector('.tp-content') as HTMLElement;
      expect(wrapper.classList.contains('dark')).toBe(true);
      expect(wrapper.classList.contains('forest')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('Navigation Links', () => {
    it('should render a button for each available link', () => {
      const engine = makeEngine({
        getAvailableLinks: vi.fn(() => [
          { target: 'cave', text: 'Enter cave' },
          { target: 'forest', text: 'Go to forest' },
        ])
      });
      renderer.render(makeSituation(), engine, target);

      const buttons = target.querySelectorAll('.tp-link');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Enter cave');
      expect(buttons[1].textContent).toBe('Go to forest');
    });

    it('should call goToSituation when a link button is clicked', () => {
      const goToSituation = vi.fn();
      const engine = makeEngine({
        getAvailableLinks: vi.fn(() => [{ target: 'cave', text: 'Enter cave' }]),
        goToSituation
      });
      renderer.render(makeSituation(), engine, target);

      (target.querySelector('.tp-link') as HTMLButtonElement).click();
      expect(goToSituation).toHaveBeenCalledWith('cave');
    });

    it('should call link.onChoose before transitioning', () => {
      const callOrder: string[] = [];
      const onChoose = vi.fn(() => { callOrder.push('onChoose'); });
      const goToSituation = vi.fn(() => { callOrder.push('goToSituation'); });
      const engine = makeEngine({
        getAvailableLinks: vi.fn(() => [{ target: 'cave', text: 'Cave', onChoose }]),
        goToSituation
      });
      renderer.render(makeSituation(), engine, target);

      (target.querySelector('.tp-link') as HTMLButtonElement).click();
      expect(callOrder).toEqual(['onChoose', 'goToSituation']);
    });

    it('should omit nav element when there are no links', () => {
      renderer.render(makeSituation({ links: [] }), makeEngine(), target);
      expect(target.querySelector('.tp-links')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('Accessibility', () => {
    it('should set role="main" and aria-live on the wrapper', () => {
      renderer.render(makeSituation(), makeEngine(), target);
      const wrapper = target.querySelector('.tp-content');
      expect(wrapper?.getAttribute('role')).toBe('main');
      expect(wrapper?.getAttribute('aria-live')).toBe('polite');
    });

    it('should set aria-label="Choices" on the nav element', () => {
      const engine = makeEngine({
        getAvailableLinks: vi.fn(() => [{ target: 'next', text: 'Continue' }])
      });
      renderer.render(makeSituation(), engine, target);
      expect(target.querySelector('nav')?.getAttribute('aria-label')).toBe('Choices');
    });
  });

  // -------------------------------------------------------------------------
  describe('Quality Display', () => {
    it('should render a list item per quality with name and value', () => {
      const qualities: Record<string, QualityValue> = {
        health: {
          definition: { name: 'Health', type: 'number', default: 100 },
          value: 75
        },
        name: {
          definition: { name: 'Name', type: 'string', default: 'Hero' },
          value: 'Arthur'
        }
      };
      renderQualities(qualities, target);

      const items = target.querySelectorAll('.tp-quality');
      expect(items.length).toBe(2);
      expect(items[0].querySelector('.tp-quality__name')?.textContent).toBe('Health');
      expect(items[0].querySelector('.tp-quality__value')?.textContent).toBe('75');
    });

    it('should replace existing quality panel on re-render', () => {
      const q: Record<string, QualityValue> = {
        hp: { definition: { name: 'HP', type: 'number', default: 10 }, value: 10 }
      };
      renderQualities(q, target);
      renderQualities(q, target);

      expect(target.querySelectorAll('.tp-qualities').length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('Theme System', () => {
    it('should apply CSS custom properties to the provided root element', () => {
      const root = document.createElement('div');
      applyTheme({ '--tp-bg': '#000', '--tp-fg': '#fff' }, 'dark', root, null);

      expect(root.style.getPropertyValue('--tp-bg')).toBe('#000');
      expect(root.style.getPropertyValue('--tp-fg')).toBe('#fff');
    });

    it('should persist theme name to storage', () => {
      const store = new Map<string, string>();
      const fakeStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
        length: 0,
        key: () => null,
        clear: () => store.clear()
      } as unknown as Storage;

      applyTheme({}, 'midnight', document.createElement('div'), fakeStorage);
      expect(getSavedTheme(fakeStorage)).toBe('midnight');
    });

    it('should return null when no theme is saved', () => {
      const store = new Map<string, string>();
      const fakeStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
        removeItem: (k: string) => { store.delete(k); },
        length: 0,
        key: () => null,
        clear: () => store.clear()
      } as unknown as Storage;

      expect(getSavedTheme(fakeStorage)).toBeNull();
    });
  });
});
