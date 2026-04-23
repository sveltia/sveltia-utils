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
 * Whether the event matches the given keyboard shortcuts. Uses `KeyboardEvent.key` rather than
 * `KeyboardEvent.code` so that shortcuts work correctly on non-QWERTY layouts (Dvorak, AZERTY,
 * Colemak, etc.). `event.code` reflects the physical key position on a US QWERTY keyboard, while
 * `event.key` reflects the logical character produced by the user's active layout — which is what
 * shortcut strings are typically authored against.
 * @param {KeyboardEvent} event `keydown` or `keypress` event.
 * @param {string} shortcuts Keyboard shortcuts like `A` or `Ctrl+S`.
 * @returns {boolean} Result.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @see https://w3c.github.io/aria/#aria-keyshortcuts
 */
const matchesShortcuts = (event, shortcuts) => {
  const { ctrlKey, metaKey, altKey, shiftKey, key } = event;

  // The `key` property can be an empty string in some edge cases (e.g. dead keys mid-composition)
  if (!key) {
    return false;
  }

  const eventKey = key.toLowerCase();
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
      .every((_key) => _key.toLowerCase() === eventKey);
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
