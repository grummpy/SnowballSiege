import { DEADZONE } from './constants.js';
import { clamp } from './geom.js';

export const BIND_ACTIONS = ['up', 'down', 'left', 'right', 'action', 'secondary'];

export function defaultBindings() {
  return [
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'KeyF', secondary: 'KeyG' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Slash', secondary: 'Period' },
    { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', action: 'Semicolon', secondary: 'Quote' },
    { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', action: 'Numpad0', secondary: 'NumpadEnter' },
  ];
}

export function cloneBindings(bindings) {
  return bindings.map((b) => ({ ...b }));
}

export function rebind(bindings, player, action, code) {
  const next = cloneBindings(bindings);
  next[player][action] = code;
  return next;
}

function heldHas(held, code) {
  if (!held || !code) return false;
  if (typeof held.has === 'function') return held.has(code);
  return !!held[code];
}

export function actionsFromKeyboard(binding, held) {
  let x = 0;
  let y = 0;
  if (heldHas(held, binding.left)) x -= 1;
  if (heldHas(held, binding.right)) x += 1;
  if (heldHas(held, binding.up)) y -= 1;
  if (heldHas(held, binding.down)) y += 1;
  return {
    moveX: x,
    moveY: y,
    action: heldHas(held, binding.action),
    secondary: heldHas(held, binding.secondary),
    pause: false,
    source: 'keyboard',
  };
}

function buttonPressed(buttons, index) {
  const b = buttons?.[index];
  if (b == null) return false;
  return typeof b === 'object' ? !!b.pressed : !!b;
}

export function actionsFromGamepad(pad) {
  if (!pad || !pad.connected) return null;
  const buttons = pad.buttons || [];
  const axes = pad.axes || [];
  let x = Number(axes[0]) || 0;
  let y = Number(axes[1]) || 0;
  if (Math.hypot(x, y) < DEADZONE) {
    x = 0;
    y = 0;
  }
  if (buttonPressed(buttons, 14)) x = -1;
  if (buttonPressed(buttons, 15)) x = 1;
  if (buttonPressed(buttons, 12)) y = -1;
  if (buttonPressed(buttons, 13)) y = 1;
  return {
    moveX: clamp(x, -1, 1),
    moveY: clamp(y, -1, 1),
    action: buttonPressed(buttons, 0),
    secondary: buttonPressed(buttons, 1),
    pause: buttonPressed(buttons, 9),
    source: 'gamepad',
  };
}

/**
 * A connected pad replaces that player's keyboard. A missing pad falls back
 * to the keyboard binding so hot-unplug keeps the penguin controllable.
 */
export function resolvePlayerActions(playerIndex, held, pad, bindings) {
  const fromPad = actionsFromGamepad(pad);
  if (fromPad) return fromPad;
  return actionsFromKeyboard(bindings[playerIndex], held);
}

const KEY_LABELS = {
  Slash: '/',
  Period: '.',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Space: 'Space',
  Enter: 'Enter',
  ShiftLeft: 'LShift',
  ShiftRight: 'RShift',
  ControlLeft: 'LCtrl',
  ControlRight: 'RCtrl',
  AltLeft: 'LAlt',
  AltRight: 'RAlt',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Numpad0: 'Num 0',
  Numpad1: 'Num 1',
  Numpad2: 'Num 2',
  Numpad3: 'Num 3',
  Numpad4: 'Num 4',
  Numpad5: 'Num 5',
  Numpad6: 'Num 6',
  Numpad7: 'Num 7',
  Numpad8: 'Num 8',
  Numpad9: 'Num 9',
  NumpadEnter: 'Num Enter',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadDecimal: 'Num .',
};

export function keyLabel(code) {
  if (!code) return '—';
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
