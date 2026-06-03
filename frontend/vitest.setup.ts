import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom polyfills for browser APIs used by responsive hooks (matchMedia) and cmdk (ResizeObserver).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}

if (!(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!(globalThis as { scrollIntoView?: unknown }).scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
