/**
 * Test Helpers - Shared utilities for all TextPlus packages
 */

/**
 * Create a mock fixture with common test data patterns
 */
export function createFixture<T>(data: T, overrides?: Partial<T>): T {
  return {
    ...data,
    ...(overrides || {})
  };
}

/**
 * Sleep helper for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock storage object for testing localStorage-dependent code
 */
export function createMockStorage(): Storage {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: Object.keys(store).length
  };
}

/**
 * Create a mock DOM element for testing DOM-dependent code
 */
export function createMockElement(
  tag: string = 'div',
  attrs?: Record<string, string>
): HTMLElement {
  const element = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
}

/**
 * Wait for a condition to be true (for async testing)
 */
export async function waitFor(
  condition: () => boolean,
  options?: { timeout?: number; interval?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 50;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await sleep(interval);
  }
}

/**
 * Assert that two objects are deeply equal (simple version)
 */
export function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ||
      `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Create normalized test data for game scenarios
 */
export function createTestScenario(overrides?: Record<string, any>) {
  return {
    title: 'Test Scenario',
    initialText: 'You start the game.',
    situations: {} as Record<string, any>,
    qualities: {} as Record<string, any>,
    ...overrides
  };
}

export default {
  createFixture,
  sleep,
  createMockStorage,
  createMockElement,
  waitFor,
  assertDeepEqual,
  createTestScenario
};
