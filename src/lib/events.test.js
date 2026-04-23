import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateKeyShortcuts, isMac, matchesShortcuts } from './events.js';

/**
 * Helper to create a minimal KeyboardEvent-like object.
 * @param {Partial<KeyboardEvent>} overrides Event property overrides.
 * @returns {KeyboardEvent} A fake keyboard event.
 */
const makeEvent = (overrides = {}) =>
  /** @type {KeyboardEvent} */ ({
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    key: 'a',
    ...overrides,
  });

describe('matchesShortcuts', () => {
  it('should match a plain key shortcut', () => {
    expect(matchesShortcuts(makeEvent({ key: 's' }), 'S')).toBe(true);
  });

  it('should not match when the key differs', () => {
    expect(matchesShortcuts(makeEvent({ key: 'a' }), 'S')).toBe(false);
  });

  it('should match Ctrl+S', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', ctrlKey: true }), 'Ctrl+S')).toBe(true);
  });

  it('should not match Ctrl+S when Ctrl is not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's' }), 'Ctrl+S')).toBe(false);
  });

  it('should not match Ctrl+S when an extra modifier is pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', ctrlKey: true, shiftKey: true }), 'Ctrl+S')).toBe(
      false,
    );
  });

  it('should match Shift+A (key is uppercase when Shift is held)', () => {
    // In real browsers `event.key` is 'A' (uppercase) when Shift is held with the A key.
    expect(matchesShortcuts(makeEvent({ key: 'A', shiftKey: true }), 'Shift+A')).toBe(true);
  });

  it('should match Alt+F', () => {
    expect(matchesShortcuts(makeEvent({ key: 'f', altKey: true }), 'Alt+F')).toBe(true);
  });

  it('should match any of multiple space-separated shortcuts', () => {
    expect(matchesShortcuts(makeEvent({ key: 'z', ctrlKey: true }), 'Ctrl+Z Ctrl+Y')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'y', ctrlKey: true }), 'Ctrl+Z Ctrl+Y')).toBe(true);
  });

  it('should return false when key is empty', () => {
    expect(matchesShortcuts(makeEvent({ key: '' }), 'S')).toBe(false);
  });

  it('should match digit keys', () => {
    expect(matchesShortcuts(makeEvent({ key: '1' }), '1')).toBe(true);
  });

  it('should match named keys like Enter, Escape, ArrowUp', () => {
    expect(matchesShortcuts(makeEvent({ key: 'Enter' }), 'Enter')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'Escape' }), 'Escape')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'ArrowUp' }), 'ArrowUp')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'F1' }), 'F1')).toBe(true);
  });

  it('should match punctuation keys', () => {
    expect(matchesShortcuts(makeEvent({ key: '/', ctrlKey: true }), 'Ctrl+/')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: '.' }), '.')).toBe(true);
  });

  it('should match named keys case-insensitively', () => {
    expect(matchesShortcuts(makeEvent({ key: 'Enter' }), 'enter')).toBe(true);
  });

  it('should be case-insensitive for the key', () => {
    expect(matchesShortcuts(makeEvent({ key: 'S' }), 's')).toBe(true);
  });

  it('should respect the active keyboard layout (Dvorak)', () => {
    // On Dvorak, pressing the physical key in the QWERTY "S" position produces the letter 'o'.
    // With `event.code` ('KeyS') we would have wrongly matched "Ctrl+S". With `event.key` ('o'),
    // we correctly do not match a "Ctrl+S" shortcut, and do match "Ctrl+O".
    expect(matchesShortcuts(makeEvent({ key: 'o', ctrlKey: true }), 'Ctrl+S')).toBe(false);
    expect(matchesShortcuts(makeEvent({ key: 'o', ctrlKey: true }), 'Ctrl+O')).toBe(true);
  });

  it('should return false when Meta is required but not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', metaKey: false }), 'Meta+S')).toBe(false);
  });

  it('should return true when Meta is required and pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', metaKey: true }), 'Meta+S')).toBe(true);
  });

  it('should return false when Alt is required but not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 'f', altKey: false }), 'Alt+F')).toBe(false);
  });

  it('should return false when Shift is required but not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 'A', shiftKey: false }), 'Shift+A')).toBe(false);
  });

  it('should resolve Accel to either Ctrl or Meta depending on platform', () => {
    const withCtrl = matchesShortcuts(makeEvent({ key: 's', ctrlKey: true }), 'Accel+S');
    const withMeta = matchesShortcuts(makeEvent({ key: 's', metaKey: true }), 'Accel+S');

    // Exactly one of the two should match (Ctrl on non-Mac, Meta on Mac)
    expect(withCtrl || withMeta).toBe(true);
    expect(withCtrl && withMeta).toBe(false);
  });
});

describe('matchesShortcuts - Accel on macOS', () => {
  it('should resolve Accel to Meta when on macOS', async () => {
    vi.resetModules();

    const origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgentData: { platform: 'macOS' }, platform: 'MacIntel' },
    });

    try {
      const { matchesShortcuts: freshMatch } = await import('./events.js');

      expect(freshMatch(makeEvent({ key: 's', metaKey: true }), 'Accel+S')).toBe(true);
      expect(freshMatch(makeEvent({ key: 's', ctrlKey: true }), 'Accel+S')).toBe(false);
    } finally {
      if (origDescriptor) {
        Object.defineProperty(globalThis, 'navigator', origDescriptor);
      }
    }
  });
});

describe('isMac', () => {
  it('should return a boolean', () => {
    expect(typeof isMac()).toBe('boolean');
  });
});

describe('activateKeyShortcuts', () => {
  /** @type {HTMLButtonElement} */
  let button;

  beforeEach(() => {
    button = /** @type {HTMLButtonElement} */ (document.createElement('button'));
    document.body.appendChild(button);

    // happy-dom doesn't expose document.elementsFromPoint as a configurable property;
    // define a stub so vi.spyOn can wrap it in handler tests.
    if (!document.elementsFromPoint) {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        writable: true,
        value: () => /** @type {Element[]} */ ([]),
      });
    }
  });

  afterEach(() => {
    button.remove();
    vi.restoreAllMocks();
  });

  it('should set aria-keyshortcuts when shortcuts are provided', () => {
    const cleanup = activateKeyShortcuts('Ctrl+S')(button);

    expect(button.getAttribute('aria-keyshortcuts')).toBe('Ctrl+S');
    cleanup?.();
  });

  it('should not set aria-keyshortcuts when no shortcuts are provided', () => {
    const cleanup = activateKeyShortcuts()(button);

    expect(button.getAttribute('aria-keyshortcuts')).toBeNull();
    cleanup?.();
  });

  it('should remove aria-keyshortcuts after cleanup', () => {
    const cleanup = activateKeyShortcuts('Ctrl+S')(button);

    cleanup?.();
    expect(button.getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('should replace Accel with Meta or Ctrl depending on platform', () => {
    const cleanup = activateKeyShortcuts('Accel+S')(button);
    const attr = button.getAttribute('aria-keyshortcuts');

    expect(attr === 'Meta+S' || attr === 'Ctrl+S').toBe(true);
    cleanup?.();
  });

  it('should trigger click on element when matching shortcut key is pressed', () => {
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('should not trigger click when a non-matching key is pressed', () => {
    // Handler returns early before reaching elementsFromPoint when shortcut doesn't match
    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should not trigger click when element is not in elementsFromPoint result', () => {
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([]));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should not trigger click when the event key is empty', () => {
    activateKeyShortcuts('Ctrl+S')(button);

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    // Dispatch with empty key — matchesShortcuts returns false early
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: '', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should trigger click on a fixed-position element (null offsetParent but has client rects)', () => {
    // position:fixed elements have offsetParent === null in real browsers; the fix uses
    // getClientRects() instead, which returns rects for visible fixed elements.
    Object.defineProperty(button, 'offsetParent', { configurable: true, get: () => null });
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('should not trigger click when element has no client rects (e.g. display:none)', () => {
    vi.spyOn(button, 'getClientRects').mockReturnValue(/** @type {any} */ ({ length: 0 }));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should manipulate pointer-events for disabled button but not trigger click', () => {
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));
    button.disabled = true;

    const clickSpy = vi.fn();
    const setPropertySpy = vi.spyOn(button.style, 'setProperty');
    const removePropertySpy = vi.spyOn(button.style, 'removeProperty');

    button.addEventListener('click', clickSpy);
    activateKeyShortcuts('Ctrl+S')(button);
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }),
    );
    expect(clickSpy).not.toHaveBeenCalled();
    expect(setPropertySpy).toHaveBeenCalledWith('pointer-events', 'auto');
    expect(removePropertySpy).toHaveBeenCalledWith('pointer-events');
  });
});

describe('activateKeyShortcuts - Accel on macOS', () => {
  it('should replace Accel with Meta when on macOS', async () => {
    vi.resetModules();

    // Stub navigator.platform to look like macOS so isMac() returns true in a fresh module
    const origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgentData: { platform: 'macOS' },
        platform: 'MacIntel',
      },
    });

    try {
      const { activateKeyShortcuts: freshActivate } = await import('./events.js');
      const btn = /** @type {HTMLButtonElement} */ (document.createElement('button'));

      document.body.appendChild(btn);

      const cleanup = freshActivate('Accel+S')(btn);

      expect(btn.getAttribute('aria-keyshortcuts')).toBe('Meta+S');
      cleanup?.();
      btn.remove();
    } finally {
      if (origDescriptor) {
        Object.defineProperty(globalThis, 'navigator', origDescriptor);
      }
    }
  });
});
