// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { PreviewHost } from '../../src/preview';
import { analyzeSource } from '../../src/controller';
import { SAMPLE_STORY } from '../../src/examples';
import type { GameConfig } from '@textplus/core';

function compile(source: string): GameConfig {
  const report = analyzeSource(source);
  if (!report.config) {
    throw new Error(`Test source failed to compile: ${report.issues.map((i) => i.message).join('; ')}`);
  }
  return report.config;
}

function clickLink(container: HTMLElement, text: string): void {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.tp-link'));
  const button = buttons.find((b) => b.textContent === text);
  if (!button) {
    throw new Error(`No link button "${text}" (have: ${buttons.map((b) => b.textContent).join(', ')})`);
  }
  button.click();
}

describe('PreviewHost', () => {
  let container: HTMLElement;
  let host: PreviewHost;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    host = new PreviewHost(container);
  });

  it('mounts a game and renders the starting situation', () => {
    host.mount(compile(SAMPLE_STORY));
    expect(container.querySelector('.tp-title')?.textContent).toBe('The Reading Room');
    expect(container.querySelectorAll('.tp-link').length).toBe(2);
    // The sample declares a HUD, which replaces the plain qualities list.
    expect(container.querySelector('.tp-hud')).not.toBeNull();
    expect(container.querySelector('.tp-hud [role="progressbar"]')).not.toBeNull();
  });

  it('navigates when a link is clicked', () => {
    host.mount(compile(SAMPLE_STORY));
    clickLink(container, 'Take the lantern and descend');
    expect(container.querySelector('.tp-title')?.textContent).toBe('The Lower Stacks');
  });

  it('preserves the playthrough across a remount when possible', () => {
    const config = compile(SAMPLE_STORY);
    host.mount(config);
    clickLink(container, 'Take the lantern and descend');

    host.mount(compile(SAMPLE_STORY));
    expect(container.querySelector('.tp-title')?.textContent).toBe('The Lower Stacks');
  });

  it('falls back to the start when the current situation no longer exists', () => {
    host.mount(compile(SAMPLE_STORY));
    clickLink(container, 'Take the lantern and descend');

    const rewritten = compile(`title: Rewritten

:: start [start]
A Different Opening
The stacks are gone from this draft entirely.
`);
    host.mount(rewritten);
    expect(container.querySelector('.tp-title')?.textContent).toBe('A Different Opening');
  });

  it('restarts from the initial situation', () => {
    host.mount(compile(SAMPLE_STORY));
    clickLink(container, 'Take the lantern and descend');
    host.restart();
    expect(container.querySelector('.tp-title')?.textContent).toBe('The Reading Room');
  });

  it('restart is a no-op before any mount', () => {
    expect(() => host.restart()).not.toThrow();
  });
});
