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
const CODE_RE = /^(?:Digit|Key)(.)$/;

/**
 * Whether the event matches the given keyboard shortcuts.
 * @param {KeyboardEvent} event `keydown` or `keypress` event.
 * @param {string} shortcuts Keyboard shortcuts like `A` or `Ctrl+S`.
 * @returns {boolean} Result.
 * @see https://w3c.github.io/aria/#aria-keyshortcuts
 */
const matchesShortcuts = (event, shortcuts) => {
  const { ctrlKey, metaKey, altKey, shiftKey, code } = event;

  // The `code` property can be `undefined` in some cases
  if (!code) {
    return false;
  }

  const key = code.replace(CODE_RE, '$1');
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
      .every((_key) => _key.toUpperCase() === key.toUpperCase());
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
    return () => {};
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
