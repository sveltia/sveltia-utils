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

const MODIFIER_KEYS = new Set(['Ctrl', 'Meta', 'Alt', 'Shift']);
/**
 * `KeyboardEvent.key` values produced by the modifier keys themselves.
 */
const MODIFIER_EVENT_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

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
 * Create a function that determines whether a single (non-modifier) shortcut token matches a
 * `KeyboardEvent`. The token is classified once here, at parse time, rather than on every
 * keystroke.
 *
 * Letters are compared against `event.key` (layout-aware: a Dvorak user pressing the physical
 * QWERTY-`S` key produces `key: 'o'`, which should match `Ctrl+O`, not `Ctrl+S`), falling back to
 * `event.code` when `key` is a non-ASCII character or dead key (non-Latin layouts, `Alt+E` on
 * macOS). Bare digits are compared against `event.code` (layout- and modifier-stable, so `Shift+1`
 * matches even though `event.key` becomes `'!'`). Named keys and function keys are compared against
 * either, so their numeric keypad equivalents match too. Other characters fall back to
 * `event.key`.
 * @param {string} token A single key token from a shortcut string, e.g. `S`, `Space`, `1`, `/`.
 * @returns {(event: KeyboardEvent) => boolean} Function that checks whether the token matches the
 * event.
 */
const createTokenMatcher = (token) => {
  // Bare digit: match the physical digit row regardless of Shift (`Shift+1` vs `!`).
  if (/^\d$/.test(token)) {
    const digitCode = `Digit${token}`;

    return ({ code }) => code === digitCode;
  }

  // Named keys (Space, Enter, arrows, F-keys, …): match the stable `code`, or `key`, which
  // modifiers don’t change for these. The numeric keypad has its own `code` values, e.g.
  // `NumpadEnter` for Enter, and `Numpad8` for ArrowUp with NumLock off, so only `key` matches.
  if (PHYSICAL_TOKENS.has(token)) {
    const namedKey = token === 'Space' ? ' ' : token;

    return ({ key, code }) => code === token || key === namedKey;
  }

  const lowerToken = token.toLowerCase();

  // Letter: prefer `event.key` so the user's active Latin layout (Dvorak, AZERTY, …) is respected.
  // When `key` is a non-ASCII character or a dead key, the layout is non-Latin (`ы` on Russian) or
  // Alt changed the character (`Alt+E` → `´` on macOS), so fall back to the physical `code`. ASCII
  // punctuation (`.` on Dvorak’s `KeyE`), IME `Process` keys and AltGr characters (`ą` on Polish,
  // reported as Ctrl+Alt on Windows) must not fall back, or ordinary typing would hit shortcuts.
  if (/^[a-z]$/i.test(token)) {
    const letterCode = `Key${token.toUpperCase()}`;

    return (event) => {
      const { key, code } = event;

      const useCode =
        (key === 'Dead' || (key.length === 1 && key.charCodeAt(0) > 0x7f)) &&
        !event.getModifierState?.('AltGraph');

      return useCode ? code === letterCode : lowerToken === key.toLowerCase();
    };
  }

  // Everything else (punctuation): compare case-insensitively against `event.key`.
  return ({ key }) => lowerToken === key.toLowerCase();
};

/**
 * A shortcut string parsed into the exact modifier state it requires plus its non-modifier tokens.
 * @typedef {object} ParsedShortcut
 * @property {boolean} ctrl Whether Ctrl must be held.
 * @property {boolean} meta Whether Meta must be held.
 * @property {boolean} alt Whether Alt must be held.
 * @property {boolean} shift Whether Shift must be held.
 * @property {((event: KeyboardEvent) => boolean)[]} matchers Matchers for the non-modifier key
 * tokens, e.g. `S`. Empty for a modifier-only shortcut like `Shift`.
 */

/**
 * Replace the `Accel` alias with the platform’s primary modifier.
 * @param {string} shortcuts Keyboard shortcuts, possibly containing `Accel`.
 * @returns {string} Resolved shortcuts.
 */
const resolveAccel = (shortcuts) => shortcuts.replace(/\bAccel\b/g, isMac() ? 'Meta' : 'Ctrl');
/**
 * Cache of parsed shortcut strings. Shortcut matching runs on every keystroke, so the string
 * splitting, `Accel` substitution and token classification happen once per unique shortcut string
 * rather than per event.
 * Keyed by the raw (unresolved) string; {@link isMac} is stable for the lifetime of the module, so
 * the resolved result is stable too.
 * @type {Map<string, ParsedShortcut[]>}
 */
const parsedShortcutCache = new Map();

/**
 * Parse a shortcut string into a list of {@link ParsedShortcut} objects, one per space-separated
 * alternative.
 * @param {string} shortcuts Keyboard shortcuts like `A`, `Ctrl+S`, `Accel+Space`, `Shift+1`.
 * @returns {ParsedShortcut[]} Parsed shortcuts.
 */
const parseShortcuts = (shortcuts) => {
  let parsed = parsedShortcutCache.get(shortcuts);

  if (!parsed) {
    parsed = resolveAccel(shortcuts)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((shortcut) => {
        // Accept `Control`, as written in `aria-keyshortcuts`, as an alias of `Ctrl`
        const keys = shortcut.split('+').map((key) => (key === 'Control' ? 'Ctrl' : key));

        return {
          ctrl: keys.includes('Ctrl'),
          meta: keys.includes('Meta'),
          alt: keys.includes('Alt'),
          shift: keys.includes('Shift'),
          matchers: keys.filter((key) => !MODIFIER_KEYS.has(key)).map(createTokenMatcher),
        };
      });

    parsedShortcutCache.set(shortcuts, parsed);
  }

  return parsed;
};

/**
 * Whether the event matches any of the given pre-parsed shortcuts. The modifier state must match
 * exactly: every modifier the shortcut requires has to be held, and no others.
 * @param {KeyboardEvent} event `keydown` or `keypress` event.
 * @param {ParsedShortcut[]} parsedShortcuts Pre-parsed shortcuts.
 * @returns {boolean} Result.
 */
const matchesParsedShortcuts = (event, parsedShortcuts) => {
  const { ctrlKey, metaKey, altKey, shiftKey, key, code } = event;

  // Both `key` and `code` can be empty in edge cases (e.g. dead keys mid-composition).
  if (!key && !code) {
    return false;
  }

  // A key pressed while composing text with an IME belongs to the IME, e.g. Escape to cancel a
  // conversion or Enter to commit it. Safari fires that `keydown` right after `compositionend`,
  // with `isComposing` already `false`, so only its `keyCode` of `229` gives it away
  if (event.isComposing || event.keyCode === 229) {
    return false;
  }

  return parsedShortcuts.some(
    ({ ctrl, meta, alt, shift, matchers }) =>
      ctrl === ctrlKey &&
      meta === metaKey &&
      alt === altKey &&
      shift === shiftKey &&
      // A modifier-only shortcut like `Shift` must not match every key pressed with that modifier
      (matchers.length
        ? matchers.every((matches) => matches(event))
        : MODIFIER_EVENT_KEYS.has(key)),
  );
};

/**
 * Whether the event matches the given keyboard shortcuts.
 *
 * Uses a hybrid of `KeyboardEvent.key` and `KeyboardEvent.code` so shortcuts work correctly on
 * non-QWERTY layouts (Dvorak, AZERTY, Colemak, …) *and* with modifiers like Shift or Alt that
 * otherwise change `event.key` (`Shift+1` → `'!'`, `Alt+E` on macOS → `'´'`, etc.). See
 * {@link createTokenMatcher} for the matching rules.
 * @param {KeyboardEvent} event `keydown` or `keypress` event.
 * @param {string} shortcuts Keyboard shortcuts like `A`, `Ctrl+S`, `Accel+Space`, `Shift+1`.
 * @returns {boolean} Result.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
 * @see https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
 * @see https://w3c.github.io/aria/#aria-keyshortcuts
 */
const matchesShortcuts = (event, shortcuts) =>
  matchesParsedShortcuts(event, parseShortcuts(shortcuts));

/**
 * Shortcuts registered by a single attachment.
 * @typedef {object} ShortcutRegistration
 * @property {ParsedShortcut[]} parsedShortcuts Pre-parsed shortcuts.
 * @property {string} label Shortcuts in the `aria-keyshortcuts` syntax.
 */

/**
 * Elements with active shortcuts, mapped to the registrations of every attachment on them, as an
 * element can have more than one. A single shared `keydown` listener serves every registered
 * element, instead of adding one global listener per element.
 * @type {Map<HTMLInputElement | HTMLButtonElement, ShortcutRegistration[]>}
 */
const shortcutTargets = new Map();

/**
 * Activate the element if the shortcut applies to it. Only called once the event is already known
 * to match, since the geometry checks here force a synchronous layout.
 * @param {HTMLInputElement | HTMLButtonElement} element Registered element.
 * @param {KeyboardEvent} event `keydown` event.
 */
const activateElement = (element, event) => {
  const { disabled } = element;

  // `getClientRects()` is empty for `display: none` elements. Unlike `offsetParent`, it still
  // returns rects for `position: fixed` elements.
  if (!element.getClientRects().length) {
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

/**
 * `<input>` types that don’t take typed text, where the Option key on macOS doesn’t produce a
 * character.
 */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/**
 * Whether the given event target takes typed text: a text field, a `<textarea>` or an editable
 * element.
 * @param {EventTarget | null | undefined} target Event target.
 * @returns {boolean} Result.
 */
const isTextEntryTarget = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(target.type)));

/**
 * Whether the `keydown` event is a text editing action rather than a shortcut. On macOS, the
 * Option key held without Command or Control is a text editing modifier in a text field: it types
 * a character, like `@` with Option+2 on Swedish, Finnish and Norwegian layouts, or `¡` and `™` on
 * the US layout, and it moves the caret or deletes by word with the arrow keys and Backspace. A
 * shortcut like `Alt+2` or `Alt+ArrowUp` must not take the key there.
 * @param {KeyboardEvent} event `keydown` event.
 * @returns {boolean} Result.
 */
const isTextEditingWithOption = (event) =>
  isMac() &&
  event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  // `target` is the shadow host for an event from within a shadow tree, so take the original one
  isTextEntryTarget(event.composedPath()[0]);

/**
 * Shared `keydown` handler. The shortcut comparison runs first for every registered element because
 * it is pure string/boolean work; the layout-forcing geometry checks in {@link activateElement} are
 * reached only once a shortcut actually matches. This keeps ordinary typing free of reflows.
 * @param {KeyboardEvent} event `keydown` event.
 */
const handleKeyDown = (event) => {
  if (isTextEditingWithOption(event)) {
    return;
  }

  // Go through a copy, as `Map#forEach` would also visit an element registered by another one’s
  // click handler, activating it with the same key press
  [...shortcutTargets.keys()].forEach((element) => {
    // Skip an element unregistered on the way
    const registrations = shortcutTargets.get(element);

    if (
      registrations?.some(({ parsedShortcuts }) => matchesParsedShortcuts(event, parsedShortcuts))
    ) {
      activateElement(element, event);
    }
  });
};

/**
 * Set or remove the `aria-keyshortcuts` attribute to reflect every registration on the element.
 * @param {HTMLInputElement | HTMLButtonElement} element Registered element.
 * @param {ShortcutRegistration[]} registrations Registrations on the element.
 */
const updateShortcutsAttribute = (element, registrations) => {
  if (registrations.length) {
    element.setAttribute(
      'aria-keyshortcuts',
      [...new Set(registrations.flatMap(({ label }) => label.split(' ')))].join(' '),
    );
  } else {
    element.removeAttribute('aria-keyshortcuts');
  }
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
  // ARIA takes modifier names from `KeyboardEvent.key` values, where Ctrl is `Control`
  const label = resolveAccel(shortcuts)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bCtrl\b/g, 'Control');

  if (!label) {
    // Return a no-op attachment so the return value always matches the `Attachment` shape (a
    // function that takes an element and returns a cleanup function).
    return () => () => {};
  }

  // Parse the raw string so the cache entry is shared with `matchesShortcuts()` calls
  const parsedShortcuts = parseShortcuts(shortcuts);

  return (element) => {
    if (!shortcutTargets.size) {
      globalThis.addEventListener('keydown', handleKeyDown, { capture: true });
    }

    // A new object per attachment, so the cleanup removes only its own registration
    /** @type {ShortcutRegistration} */
    const registration = { parsedShortcuts, label };
    const registrations = shortcutTargets.get(element) ?? [];

    registrations.push(registration);
    shortcutTargets.set(element, registrations);
    updateShortcutsAttribute(element, registrations);

    return () => {
      const index = registrations.indexOf(registration);

      // Run only once
      if (index === -1) {
        return;
      }

      registrations.splice(index, 1);
      updateShortcutsAttribute(element, registrations);

      if (!registrations.length) {
        shortcutTargets.delete(element);
      }

      if (!shortcutTargets.size) {
        globalThis.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
    };
  };
};

export { activateKeyShortcuts, isMac, matchesShortcuts };
