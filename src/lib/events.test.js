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

  it('should accept Control as an alias of Ctrl', () => {
    expect(
      matchesShortcuts(makeEvent({ key: 's', code: 'KeyS', ctrlKey: true }), 'Control+S'),
    ).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS' }), 'Control+S')).toBe(false);
  });

  it('should match named keys on the numeric keypad via event.key', () => {
    expect(matchesShortcuts(makeEvent({ key: 'Enter', code: 'NumpadEnter' }), 'Enter')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'ArrowUp', code: 'Numpad8' }), 'ArrowUp')).toBe(true);
    expect(matchesShortcuts(makeEvent({ key: 'Delete', code: 'NumpadDecimal' }), 'Delete')).toBe(
      true,
    );
    // A digit on the keypad, with NumLock on, is not a named key
    expect(matchesShortcuts(makeEvent({ key: '8', code: 'Numpad8' }), 'ArrowUp')).toBe(false);
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

  it('should fall back to the physical key for letters on non-Latin layouts', () => {
    // On a Russian layout, the physical "S" key produces 'ы'
    expect(matchesShortcuts(makeEvent({ key: 'ы', code: 'KeyS', ctrlKey: true }), 'Ctrl+S')).toBe(
      true,
    );
    expect(matchesShortcuts(makeEvent({ key: 'ы', code: 'KeyS', ctrlKey: true }), 'Ctrl+O')).toBe(
      false,
    );
  });

  it('should fall back to the physical key when Alt changes the letter on macOS', () => {
    expect(matchesShortcuts(makeEvent({ key: '´', code: 'KeyE', altKey: true }), 'Alt+E')).toBe(
      true,
    );
    expect(matchesShortcuts(makeEvent({ key: 'Dead', code: 'KeyE', altKey: true }), 'Alt+E')).toBe(
      true,
    );
    expect(matchesShortcuts(makeEvent({ key: 'ß', code: 'KeyS', altKey: true }), 'Alt+S')).toBe(
      true,
    );
  });

  it('should not fall back to the physical key for ASCII punctuation or IME input', () => {
    // Dvorak: physical `KeyE` produces '.'; AZERTY: physical `KeyM` produces ','
    expect(matchesShortcuts(makeEvent({ key: '.', code: 'KeyE' }), 'E')).toBe(false);
    expect(matchesShortcuts(makeEvent({ key: ',', code: 'KeyM' }), 'M')).toBe(false);
    // IME composition
    expect(matchesShortcuts(makeEvent({ key: 'Process', code: 'KeyS' }), 'S')).toBe(false);
  });

  it('should not fall back to the physical key for AltGr characters', () => {
    const event = makeEvent({
      key: 'ą',
      code: 'KeyA',
      ctrlKey: true,
      altKey: true,
      getModifierState: (/** @type {string} */ name) => name === 'AltGraph',
    });

    expect(matchesShortcuts(event, 'Ctrl+Alt+A')).toBe(false);
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

describe('matchesShortcuts - edge cases', () => {
  it('should not match every key held with a modifier-only shortcut', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS', shiftKey: true }), 'Shift')).toBe(
      false,
    );
    expect(
      matchesShortcuts(makeEvent({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }), 'Shift'),
    ).toBe(true);
  });

  it('should ignore surrounding whitespace', () => {
    expect(matchesShortcuts(makeEvent({ key: 's', code: 'KeyS' }), '  S  ')).toBe(true);
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

    expect(button.getAttribute('aria-keyshortcuts')).toBe('Control+S');
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

    expect(attr === 'Meta+S' || attr === 'Control+S').toBe(true);
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

describe('activateKeyShortcuts - shared listener', () => {
  /** @type {HTMLButtonElement[]} */
  let buttons = [];

  /**
   * Create a button attached to the document and track it for cleanup.
   * @returns {HTMLButtonElement} The button.
   */
  const makeButton = () => {
    const btn = /** @type {HTMLButtonElement} */ (document.createElement('button'));

    document.body.appendChild(btn);
    buttons.push(btn);

    return btn;
  };

  /**
   * Dispatch a `keydown` event on `globalThis`.
   * @param {KeyboardEventInit} init Event options.
   */
  const press = (init) => {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
  };

  beforeEach(() => {
    if (!document.elementsFromPoint) {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        writable: true,
        value: () => /** @type {Element[]} */ ([]),
      });
    }
  });

  afterEach(() => {
    buttons.forEach((btn) => btn.remove());
    buttons = [];
    vi.restoreAllMocks();
  });

  it('should not activate an element registered while handling the same key press', () => {
    const opener = makeButton();
    const closer = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockImplementation(
      () => /** @type {any} */ ([opener, closer]),
    );

    const closeSpy = vi.fn();
    /** @type {((() => void) | void)[]} */
    const cleanups = [];

    closer.addEventListener('click', closeSpy);
    opener.addEventListener('click', () => {
      cleanups.push(activateKeyShortcuts('Escape')(closer));
    });

    const cleanupOpener = activateKeyShortcuts('Escape')(opener);

    press({ key: 'Escape', code: 'Escape' });
    expect(closeSpy).not.toHaveBeenCalled();

    cleanupOpener?.();
    press({ key: 'Escape', code: 'Escape' });
    expect(closeSpy).toHaveBeenCalledOnce();
    cleanups.forEach((cleanup) => cleanup?.());
  });

  it('should keep every attachment on the same element working until its own cleanup', () => {
    const button = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockImplementation(() => /** @type {any} */ ([button]));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);

    const cleanupSave = activateKeyShortcuts('Ctrl+S')(button);
    const cleanupFind = activateKeyShortcuts('Ctrl+F Ctrl+S')(button);

    expect(button.getAttribute('aria-keyshortcuts')).toBe('Control+S Control+F');

    // A key both attachments handle activates the element once
    press({ key: 's', code: 'KeyS', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledOnce();

    cleanupSave?.();
    // Calling a cleanup again must not remove the other attachment’s registration
    cleanupSave?.();
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Control+F Control+S');

    press({ key: 'f', code: 'KeyF', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledTimes(2);

    cleanupFind?.();
    expect(button.getAttribute('aria-keyshortcuts')).toBeNull();

    press({ key: 'f', code: 'KeyF', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it('should dispatch to the correct element when several are registered', () => {
    const save = makeButton();
    const open = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockImplementation(
      () => /** @type {any} */ ([save, open]),
    );

    const saveSpy = vi.fn();
    const openSpy = vi.fn();

    save.addEventListener('click', saveSpy);
    open.addEventListener('click', openSpy);

    const cleanupSave = activateKeyShortcuts('Ctrl+S')(save);
    const cleanupOpen = activateKeyShortcuts('Ctrl+O')(open);

    press({ key: 's', ctrlKey: true });
    expect(saveSpy).toHaveBeenCalledOnce();
    expect(openSpy).not.toHaveBeenCalled();

    press({ key: 'o', ctrlKey: true });
    expect(saveSpy).toHaveBeenCalledOnce();
    expect(openSpy).toHaveBeenCalledOnce();

    cleanupSave?.();
    cleanupOpen?.();
  });

  it('should keep remaining elements working after one is cleaned up', () => {
    const first = makeButton();
    const second = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockImplementation(
      () => /** @type {any} */ ([first, second]),
    );

    const firstSpy = vi.fn();
    const secondSpy = vi.fn();

    first.addEventListener('click', firstSpy);
    second.addEventListener('click', secondSpy);

    const cleanupFirst = activateKeyShortcuts('Ctrl+S')(first);
    const cleanupSecond = activateKeyShortcuts('Ctrl+O')(second);

    cleanupFirst?.();

    press({ key: 's', ctrlKey: true });
    expect(firstSpy).not.toHaveBeenCalled();

    press({ key: 'o', ctrlKey: true });
    expect(secondSpy).toHaveBeenCalledOnce();

    cleanupSecond?.();
  });

  it('should stop responding once every element is cleaned up', () => {
    const button = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));

    const clickSpy = vi.fn();

    button.addEventListener('click', clickSpy);

    const cleanup = activateKeyShortcuts('Ctrl+S')(button);

    press({ key: 's', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledOnce();

    cleanup?.();
    press({ key: 's', ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  // Uses a fresh module so the shared registry starts empty: tests above intentionally leave some
  // elements registered (they never run cleanup), which would otherwise keep the listener attached.
  it('should register only one global keydown listener for many elements', async () => {
    vi.resetModules();

    const { activateKeyShortcuts: freshActivate } = await import('./events.js');
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');
    const attach = freshActivate('Ctrl+S');
    const cleanups = [1, 2, 3, 4, 5].map(() => attach(makeButton()));

    expect(addSpy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);

    cleanups.forEach((cleanup, index) => {
      cleanup?.();

      const keydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown');

      // The listener is only detached once the last element is unregistered.
      expect(keydownRemoves).toHaveLength(index === cleanups.length - 1 ? 1 : 0);
    });
  });

  it('should re-attach the listener after the registry empties and refills', async () => {
    vi.resetModules();

    const { activateKeyShortcuts: freshActivate } = await import('./events.js');
    const first = makeButton();

    vi.spyOn(document, 'elementsFromPoint').mockImplementation(() => /** @type {any} */ (buttons));

    // Register then immediately unregister, emptying the registry and detaching the listener.
    freshActivate('Ctrl+S')(first)?.();

    const second = makeButton();
    const secondSpy = vi.fn();

    second.addEventListener('click', secondSpy);

    const cleanup = freshActivate('Ctrl+S')(second);

    press({ key: 's', ctrlKey: true });
    expect(secondSpy).toHaveBeenCalledOnce();

    cleanup?.();
  });
});

describe('matchesShortcuts - IME composition', () => {
  it('should not match a key pressed while composing text', () => {
    expect(matchesShortcuts(makeEvent({ key: 'Escape', code: 'Escape' }), 'Escape')).toBe(true);
    expect(
      matchesShortcuts(makeEvent({ key: 'Escape', code: 'Escape', isComposing: true }), 'Escape'),
    ).toBe(false);
  });

  it('should not match the key that ends a composition in Safari', () => {
    // Safari fires the `keydown` after `compositionend`, with `isComposing` already `false`
    expect(
      matchesShortcuts(makeEvent({ key: 'Escape', code: 'Escape', keyCode: 229 }), 'Escape'),
    ).toBe(false);
  });
});

describe('activateKeyShortcuts - Option key on macOS', () => {
  /** @type {PropertyDescriptor | undefined} */
  let origDescriptor;
  /** @type {typeof activateKeyShortcuts} */
  let freshActivate;
  /** @type {HTMLButtonElement} */
  let button;
  /** @type {(() => void) | undefined} */
  let cleanup;
  /** @type {import('vitest').Mock} */
  let clickSpy;

  beforeEach(async () => {
    vi.resetModules();
    origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgentData: { platform: 'macOS' }, platform: 'MacIntel' },
    });
    ({ activateKeyShortcuts: freshActivate } = await import('./events.js'));

    if (!document.elementsFromPoint) {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        writable: true,
        value: () => /** @type {Element[]} */ ([]),
      });
    }

    button = /** @type {HTMLButtonElement} */ (document.createElement('button'));
    document.body.appendChild(button);
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));
    clickSpy = vi.fn();
    button.addEventListener('click', clickSpy);
    cleanup = /** @type {() => void} */ (freshActivate('Alt+2')(button));
  });

  afterEach(() => {
    cleanup?.();
    button.remove();
    document.body.replaceChildren();
    vi.restoreAllMocks();

    if (origDescriptor) {
      Object.defineProperty(globalThis, 'navigator', origDescriptor);
    }
  });

  /**
   * Press Option+2 with the given element focused.
   * @param {HTMLElement} target Element the event is dispatched to.
   * @param {Partial<KeyboardEventInit>} [init] Extra event properties.
   */
  const pressOption2 = (target, init = {}) => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '@',
        code: 'Digit2',
        altKey: true,
        bubbles: true,
        composed: true,
        ...init,
      }),
    );
  };

  it('should leave Option+key to a text field, where it types a character', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const editable = document.createElement('div');

    editable.contentEditable = 'true';
    document.body.append(input, textarea, editable);

    pressOption2(input);
    pressOption2(textarea);
    pressOption2(editable);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should take Option+key outside a text field', () => {
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    document.body.append(checkbox);

    pressOption2(checkbox);
    pressOption2(document.body);
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it('should take Option+key with Control in a text field', () => {
    const control = freshActivate('Ctrl+Alt+2')(button);
    const input = document.createElement('input');

    document.body.append(input);

    pressOption2(input, { ctrlKey: true });
    expect(clickSpy).toHaveBeenCalledOnce();
    control?.();
  });
});

describe('activateKeyShortcuts - Alt key on other platforms', () => {
  it('should take Alt+key in a text field, where Alt is not a text editing modifier', async () => {
    vi.resetModules();

    const origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgentData: { platform: 'Windows' }, platform: 'Win32' },
    });

    try {
      const { activateKeyShortcuts: freshActivate } = await import('./events.js');

      if (!document.elementsFromPoint) {
        Object.defineProperty(document, 'elementsFromPoint', {
          configurable: true,
          writable: true,
          value: () => /** @type {Element[]} */ ([]),
        });
      }

      const button = /** @type {HTMLButtonElement} */ (document.createElement('button'));
      const input = document.createElement('input');
      const clickSpy = vi.fn();

      document.body.append(button, input);
      vi.spyOn(document, 'elementsFromPoint').mockReturnValue(/** @type {any} */ ([button]));
      button.addEventListener('click', clickSpy);

      const cleanup = freshActivate('Alt+2')(button);

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: '2', code: 'Digit2', altKey: true, bubbles: true }),
      );
      expect(clickSpy).toHaveBeenCalledOnce();
      cleanup?.();
    } finally {
      document.body.replaceChildren();
      vi.restoreAllMocks();

      if (origDescriptor) {
        Object.defineProperty(globalThis, 'navigator', origDescriptor);
      }
    }
  });
});
