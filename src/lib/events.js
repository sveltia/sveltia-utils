/**
 * @import { Attachment } from 'svelte/attachments';
 */

/** @type {boolean | undefined} */
let _isMac;

/**
 * Check if the user agent is macOS.
 * @returns {boolean} Result.
 */
const isMac = () => {
  _isMac ??=
    /** @type {any} */ (navigator).userAgentData?.platform === 'macOS' ||
    navigator.platform.startsWith('Mac');

  return _isMac;
};

const MODIFIER_KEYS = ['Ctrl', 'Meta', 'Alt', 'Shift'];

/**
 * Shortcut tokens that correspond to a physical, layout- and modifier-stable `KeyboardEvent.code`
 * value. Matching against `code` (rather than `key`) for these avoids two problems:
 *
 * 1. `event.key` for the Space bar is a single space character (`' '`), which is awkward to write
 * in a shortcut string — the conventional token is `Space`.
 * 2. `event.key` changes when Shift (or Alt/Option on macOS) is held: `Shift+1` produces `'!'` on
 * US layout, `Alt+E` on macOS produces `'´'`, etc. Comparing against `code` keeps shortcuts like
 * `Ctrl+Shift+1` or `Alt+ArrowUp` working as authored.
 */
const PHYSICAL_TOKENS = new Set([
  'Space',
  'Enter',
  'Escape',
  'Tab',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  // Function keys F1–F24
  ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
]);

/**
 * Determine whether a single (non-modifier) shortcut token matches a `KeyboardEvent`.
 *
 * Letters are compared against `event.key` (layout-aware: a Dvorak user pressing the physical
 * QWERTY-`S` key produces `key: 'o'`, which should match `Ctrl+O`, not `Ctrl+S`). Named keys,
 * function keys, and bare digits are compared against `event.code` (layout- and modifier-stable, so
 * `Shift+1` matches even though `event.key` becomes `'!'`). Other characters fall back to
 * `event.key`.
 * @param {string} token A single key token from a shortcut string, e.g. `S`, `Space`, `1`, `/`.
 * @param {KeyboardEvent} event The keyboard event.
 * @returns {boolean} Whether the token matches the event.
 */
const tokenMatchesEvent = (token, event) => {
  // Bare digit: match the physical digit row regardless of Shift (`Shift+1` vs `!`).
  if (/^\d$/.test(token)) {
    return event.code === `Digit${token}`;
  }

  // Named keys (Space, Enter, arrows, F-keys, …): match the stable `code`.
  if (PHYSICAL_TOKENS.has(token)) {
    return event.code === token;
  }

  // Everything else (letters, punctuation): compare case-insensitively against `event.key` so
  // the user's active keyboard layout is respected.
  return token.toLowerCase() === event.key.toLowerCase();
};

/**
 * Whether the event matches the given keyboard shortcuts.
 *
 * Uses a hybrid of `KeyboardEvent.key` and `KeyboardEvent.code` so shortcuts work correctly on
 * non-QWERTY layouts (Dvorak, AZERTY, Colemak, …) *and* with modifiers like Shift or Alt that
 * otherwise change `event.key` (`Shift+1` → `'!'`, `Alt+E` on macOS → `'´'`, etc.). See
 * {@link tokenMatchesEvent} for the matching rules.
 * @param {KeyboardEvent} event `keydown` or `keypress` event.
 * @param {string} shortcuts Keyboard shortcuts like `A`, `Ctrl+S`, `Accel+Space`, `Shift+1`.
 * @returns {boolean} Result.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
 * @see https://w3c.github.io/aria/#aria-keyshortcuts
 */
const matchesShortcuts = (event, shortcuts) => {
  const { ctrlKey, metaKey, altKey, shiftKey, key, code } = event;

  // Both `key` and `code` can be empty in edge cases (e.g. dead keys mid-composition).
  if (!key && !code) {
    return false;
  }

  const resolvedShortcuts = shortcuts.replace(/\bAccel\b/g, isMac() ? 'Meta' : 'Ctrl');

  return resolvedShortcuts.split(/\s+/).some((shortcut) => {
    const keys = shortcut.split('+');

    // Check if required modifier keys are pressed
    if (
      (keys.includes('Ctrl') && !ctrlKey) ||
      (keys.includes('Meta') && !metaKey) ||
      (keys.includes('Alt') && !altKey) ||
      (keys.includes('Shift') && !shiftKey)
    ) {
      return false;
    }

    // Check if unnecessary modifier keys are not pressed
    if (
      (!keys.includes('Ctrl') && ctrlKey) ||
      (!keys.includes('Meta') && metaKey) ||
      (!keys.includes('Alt') && altKey) ||
      (!keys.includes('Shift') && shiftKey)
    ) {
      return false;
    }

    return keys
      .filter((_key) => !MODIFIER_KEYS.includes(_key))
      .every((_key) => tokenMatchesEvent(_key, event));
  });
};

/**
 * Activate keyboard shortcuts.
 * @param {string} [shortcuts] Keyboard shortcuts like `A` or `Accel+S` to focus and click the text
 * field or button. Multiple shortcuts can be defined space-separated. The `Accel` modifier will be
 * replaced with `Ctrl` on Windows/Linux and `Command` on macOS.
 * @returns {Attachment<HTMLInputElement | HTMLButtonElement>} Svelte attachment to deactivate the
 * shortcuts.
 */
const activateKeyShortcuts = (shortcuts = '') => {
  const platformKeyShortcuts = shortcuts
    ? shortcuts.replace(/\bAccel\b/g, isMac() ? 'Meta' : 'Ctrl')
    : undefined;

  if (!platformKeyShortcuts) {
    // Return a no-op attachment so the return value always matches the `Attachment` shape (a
    // function that takes an element and returns a cleanup function).
    return () => () => {};
  }

  return (element) => {
    /**
     * Handle the event.
     * @param {KeyboardEvent} event `keydown` event.
     */
    const handler = (event) => {
      const { disabled } = element;

      if (!element.getClientRects().length || !matchesShortcuts(event, platformKeyShortcuts)) {
        return;
      }

      const { top, left } = element.getBoundingClientRect();

      if (disabled) {
        // Make sure `elementsFromPoint()` works as expected
        element.style.setProperty('pointer-events', 'auto');
      }

      // Check if the element is clickable (not behind a modal dialog)
      const isClickable = document.elementsFromPoint(left + 4, top + 4).includes(element);

      if (disabled) {
        element.style.removeProperty('pointer-events');
      }

      if (!isClickable) {
        return;
      }

      event.preventDefault();

      if (!disabled) {
        element.focus();
        element.click();
      }
    };

    globalThis.addEventListener('keydown', handler, { capture: true });
    element.setAttribute('aria-keyshortcuts', platformKeyShortcuts);

    return () => {
      globalThis.removeEventListener('keydown', handler, { capture: true });
      element.removeAttribute('aria-keyshortcuts');
    };
  };
};

export { activateKeyShortcuts, isMac, matchesShortcuts };
