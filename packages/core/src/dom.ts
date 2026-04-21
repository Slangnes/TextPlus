/**
 * TextPlus Core - DOM Renderer
 *
 * Implements the SituationRenderer interface for rendering game content to the DOM.
 * Handles situation content, navigation links, ARIA attributes, and CSS theming.
 */

import type {
  GameEngine,
  QualityValue,
  SituationDefinition,
  SituationLink,
  SituationRenderer
} from './types';

// --- Constants ---------------------------------------------------------------

const CSS_CLASS_CONTENT = 'tp-content';
const CSS_CLASS_TITLE = 'tp-title';
const CSS_CLASS_BODY = 'tp-body';
const CSS_CLASS_LINKS = 'tp-links';
const CSS_CLASS_LINK = 'tp-link';
const CSS_CLASS_QUALITIES = 'tp-qualities';
const CSS_CLASS_QUALITY_ITEM = 'tp-quality';

// --- Link rendering ----------------------------------------------------------

function renderLink(
  link: SituationLink,
  engine: GameEngine,
  linksEl: HTMLElement
): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = CSS_CLASS_LINK;
  btn.textContent = link.text;
  btn.setAttribute('data-target', link.target);

  btn.addEventListener('click', () => {
    if (link.onChoose) {
      link.onChoose(engine);
    }
    engine.goToSituation(link.target);
  });

  linksEl.appendChild(btn);
}

// --- DomRenderer class -------------------------------------------------------

/**
 * Renders situation content to the DOM.
 *
 * Structure produced:
 * ```
 * <div class="tp-content" role="main" aria-live="polite">
 *   <h2 class="tp-title">…</h2>
 *   <div class="tp-body">…</div>
 *   <nav class="tp-links" aria-label="Choices">…</nav>
 * </div>
 * ```
 */
export class DomRenderer implements SituationRenderer {
  render(
    situation: SituationDefinition,
    engine: GameEngine,
    target: HTMLElement
  ): void {
    this.clear(target);

    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASS_CONTENT;
    wrapper.setAttribute('role', 'main');
    wrapper.setAttribute('aria-live', 'polite');

    // Title
    const titleEl = document.createElement('h2');
    titleEl.className = CSS_CLASS_TITLE;
    titleEl.textContent = situation.title;
    wrapper.appendChild(titleEl);

    // Body
    const bodyEl = document.createElement('div');
    bodyEl.className = CSS_CLASS_BODY;
    const rawContent =
      typeof situation.content === 'function'
        ? engine.getCurrentSituationContent()
        : situation.content;
    bodyEl.innerHTML = rawContent;
    wrapper.appendChild(bodyEl);

    // Links
    const availableLinks = engine.getAvailableLinks();
    if (availableLinks.length > 0) {
      const linksEl = document.createElement('nav');
      linksEl.className = CSS_CLASS_LINKS;
      linksEl.setAttribute('aria-label', 'Choices');

      for (const link of availableLinks) {
        renderLink(link, engine, linksEl);
      }

      wrapper.appendChild(linksEl);
    }

    // Apply situation CSS tags to wrapper
    if (situation.tags && situation.tags.length > 0) {
      situation.tags.forEach((tag) => wrapper.classList.add(tag));
    }

    target.appendChild(wrapper);
  }

  clear(target: HTMLElement): void {
    while (target.firstChild) {
      target.removeChild(target.firstChild);
    }
  }
}

// --- Quality display ---------------------------------------------------------

/**
 * Renders a quality panel into `target`.
 *
 * Structure produced:
 * ```
 * <ul class="tp-qualities" aria-label="Qualities">
 *   <li class="tp-quality" data-quality-id="…">
 *     <span class="tp-quality__name">…</span>
 *     <span class="tp-quality__value">…</span>
 *   </li>
 * </ul>
 * ```
 */
export function renderQualities(
  qualities: Record<string, QualityValue>,
  target: HTMLElement
): void {
  // Clear existing quality panel if present
  const existing = target.querySelector(`.${CSS_CLASS_QUALITIES}`);
  if (existing) {
    target.removeChild(existing);
  }

  const list = document.createElement('ul');
  list.className = CSS_CLASS_QUALITIES;
  list.setAttribute('aria-label', 'Qualities');

  for (const [id, info] of Object.entries(qualities)) {
    const item = document.createElement('li');
    item.className = CSS_CLASS_QUALITY_ITEM;
    item.setAttribute('data-quality-id', id);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tp-quality__name';
    nameSpan.textContent = info.definition.name;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'tp-quality__value';
    valueSpan.textContent = String(info.value);

    item.appendChild(nameSpan);
    item.appendChild(valueSpan);
    list.appendChild(item);
  }

  target.appendChild(list);
}

// --- Theme helpers -----------------------------------------------------------

export type ThemeVariables = Record<string, string>;

const THEME_STORAGE_KEY = 'textplus-theme';

/**
 * Applies a set of CSS custom properties to `root` (defaults to
 * `document.documentElement`).  Persists `themeName` to localStorage when
 * a storage object is provided.
 */
export function applyTheme(
  variables: ThemeVariables,
  themeName: string,
  root: HTMLElement = document.documentElement,
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): void {
  for (const [prop, value] of Object.entries(variables)) {
    root.style.setProperty(prop, value);
  }

  if (storage) {
    storage.setItem(THEME_STORAGE_KEY, themeName);
  }
}

/**
 * Returns the persisted theme name from storage, or `null` if none is saved.
 */
export function getSavedTheme(
  storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null
): string | null {
  if (!storage) return null;
  return storage.getItem(THEME_STORAGE_KEY);
}

// --- Default export ----------------------------------------------------------

export const domRenderer = new DomRenderer();
