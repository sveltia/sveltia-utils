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
    code: 'KeyA',
    ...overrides,
  });

describe('matchesShortcuts', () => {
  it('should match a plain key shortcut', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS' }), 'S')).toBe(true);
  });

  it('should not match when the key differs', () => {
    expect(matchesShortcuts(makeEvent({ key: 'a', code: 'KeyA' }), 'S')).toBe(false);
  });

  it('should match Ctrl+S', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS', ctrlKey: true }), 'Ctrl+S')).toBe(
      true,
    );
  });

  it('should not match Ctrl+S when Ctrl is not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS' }), 'Ctrl+S')).toBe(false);
  });

  it('should not match Ctrl+S when an extra modifier is pressed', () => {
    expect(
      matchesShortcuts(
        makeEvent({ key: 's', code: 'KeyS', ctrlKey: true, shiftKey: true }),
        'Ctrl+S',
      ),
    ).toBe(false);
  });

  it('should match Shift+A (key is uppercase when Shift is held)', () => {
    // In real browsers `event.key` is 'A' (uppercase) when Shift is held with the A key.
    expect(matchesShortcuts(makeEvent({ key: 'A', code: 'KeyA', shiftKey: true }), 'Shift+A')).toBe(
      true,
    );
  });

  it('should match Alt+F', () => {
    expect(matchesShortcuts(makeEvent({ key: 'f', code: 'KeyF', altKey: true }), 'Alt+F')).toBe(
      true,
    );
  });

  it('should match any of multiple space-separated shortcuts', () => {
    expect(
      matchesShortcuts(makeEvent({ key: 'z', code: 'KeyZ', ctrlKey: true }), 'Ctrl+Z Ctrl+Y'),
    ).toBe(true);
    expect(
      matchesShortcuts(makeEvent({ key: 'y', code: 'KeyY', ctrlKey: true }), 'Ctrl+Z Ctrl+Y'),
    ).toBe(true);
  });

  it('should return false when both key and code are empty', () => {
    expect(matchesShortcuts(makeEvent({ key: '', code: '' }), 'S')).toBe(false);
  });

  it('should match bare digit tokens via event.code (Shift-stable)', () => {
    // Plain digit: event.key = '1', event.code = 'Digit1'
    expect(matchesShortcuts(makeEvent({ key: '1', code: 'Digit1' }), '1')).toBe(true);
    // With Shift on US layout: event.key becomes '!' but event.code stays 'Digit1'.
    // Shortcut `Shift+1` should still match, even though event.key is no longer '1'.
    expect(
      matchesShortcuts(makeEvent({ key: '!', code: 'Digit1', shiftKey: true }), 'Shift+1'),
    ).toBe(true);
  });

  it('should match named keys like Enter, Escape, ArrowUp via event.code', () => {
    expect(matchesShortcuts(makeEvent({ key: 'Enter', code: 'Enter' }), 'Enter')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'Escape', code: 'Escape' }), 'Escape')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'ArrowUp', code: 'ArrowUp' }), 'ArrowUp')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'F1', code: 'F1' }), 'F1')).toBe(true);
  });

  it('should match the Space shortcut (event.key is a space char, token is "Space")', () => {
    // This is the bug the revised fix targets: `event.key` for Space is ' ', not 'Space'.
    // With the `PHYSICAL_TOKENS` branch, `Space` is compared against `event.code`.
    expect(matchesShortcuts(makeEvent({ key: ' ', code: 'Space' }), 'Space')).toBe(true);
    expect(
      matchesShortcuts(makeEvent({ key: ' ', code: 'Space', ctrlKey: true }), 'Ctrl+Space'),
    ).toBe(true);
  });

  it('should match literal punctuation characters via event.key', () => {
    expect(matchesShortcuts(makeEvent({ key: '/', code: 'Slash', ctrlKey: true }), 'Ctrl+/')).toBe(
      true,
    );
    expect(matchesShortcuts(makeEvent({ key: '.', code: 'Period' }), '.')).toBe(true);
  });

  it('should match named-key and letter tokens case-insensitively', () => {
    // Physical tokens like `Enter` match `event.code` exactly (case-sensitive), but a lowercase
    // `enter` token still matches because it falls through to the case-insensitive `event.key`
    // branch, where `event.key` for the Enter key is the string `'Enter'`.
    expect(matchesShortcuts(makeEvent({ key: 'Enter', code: 'Enter' }), 'Enter')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'Enter', code: 'Enter' }), 'enter')).toBe(true);
    // Letter tokens are always case-insensitive (they go through the `event.key` branch).
    expect(matchesShortcuts(makeEvent({ key: 'S', code: 'KeyS' }), 's')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS' }), 'S')).toBe(true);
  });

  it('should respect the active keyboard layout for letter keys (Dvorak)', () => {
    // On Dvorak, pressing the physical key in the QWERTY "S" position produces 'o' (event.key)
    // while event.code stays 'KeyS'. A letter shortcut must use `event.key` so the user's
    // layout is respected: `Ctrl+S` should NOT match, `Ctrl+O` should.
    expect(matchesShortcuts(makeEvent({ key: 'o', code: 'KeyS', ctrlKey: true }), 'Ctrl+S')).toBe(
      false,
    );
    expect(matchesShortcuts(makeEvent({ key: 'o', code: 'KeyS', ctrlKey: true }), 'Ctrl+O')).toBe(
      true,
    );
  });

  it('should return false when Meta is required but not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS', metaKey: false }), 'Meta+S')).toBe(
      false,
    );
  });

  it('should return true when Meta is required and pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS', metaKey: true }), 'Meta+S')).toBe(
      true,
    );
  });

  it('should return false when Alt is required but not pressed', () => {
    expect(matchesShortcuts(makeEvent({ key: 'f', code: 'KeyF', altKey: false }), 'Alt+F')).toBe(
      false,
    );
  });

  it('should return false when Shift is required but not pressed', () => {
    expect(
      matchesShortcuts(makeEvent({ key: 'A', code: 'KeyA', shiftKey: false }), 'Shift+A'),
    ).toBe(false);
  });

  it('should resolve Accel to either Ctrl or Meta depending on platform', () => {
    const ev = makeEvent({ key: 's', code: 'KeyS', ctrlKey: true });
    const ev2 = makeEvent({ key: 's', code: 'KeyS', metaKey: true });
    const withCtrl = matchesShortcuts(ev, 'Accel+S');
    const withMeta = matchesShortcuts(ev2, 'Accel+S');

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

      expect(freshMatch(makeEvent({ key: 's', code: 'KeyS', metaKey: true }), 'Accel+S')).toBe(
        true,
      );
      expect(freshMatch(makeEvent({ key: 's', code: 'KeyS', ctrlKey: true }), 'Accel+S')).toBe(
        false,
      );
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

  it('should not trigger click when the event key and code are empty', () => {
    activateKeyShortcuts('Ctrl+S')(button);

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);
    // Dispatch with empty key and code — matchesShortcuts returns false early
    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: '', code: '', ctrlKey: true, bubbles: true }),
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
