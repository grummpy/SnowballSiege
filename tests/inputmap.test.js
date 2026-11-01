import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionsFromGamepad,
  actionsFromKeyboard,
  defaultBindings,
  rebind,
  resolvePlayerActions,
} from '../src/core/inputmap.js';

test('default bindings match the four keyboard layouts', () => {
  const bindings = defaultBindings();
  assert.deepEqual(bindings[0], {
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'KeyF', secondary: 'KeyG',
  });
  assert.equal(bindings[1].action, 'Slash');
  assert.equal(bindings[1].secondary, 'Period');
  assert.equal(bindings[1].up, 'ArrowUp');
  assert.equal(bindings[2].action, 'Semicolon');
  assert.equal(bindings[2].secondary, 'Quote');
  assert.equal(bindings[2].left, 'KeyJ');
  assert.equal(bindings[3].up, 'Numpad8');
  assert.equal(bindings[3].left, 'Numpad4');
  assert.equal(bindings[3].down, 'Numpad5');
  assert.equal(bindings[3].right, 'Numpad6');
  assert.equal(bindings[3].action, 'Numpad0');
  assert.equal(bindings[3].secondary, 'NumpadEnter');
});

test('keyboard state maps to that player only', () => {
  const bindings = defaultBindings();
  const p1 = actionsFromKeyboard(bindings[0], new Set(['KeyW', 'KeyF']));
  assert.equal(p1.moveY, -1);
  assert.equal(p1.moveX, 0);
  assert.equal(p1.action, true);
  assert.equal(p1.secondary, false);
  assert.equal(p1.source, 'keyboard');

  const p2 = actionsFromKeyboard(bindings[1], new Set(['ArrowLeft', 'Slash']));
  assert.equal(p2.moveX, -1);
  assert.equal(p2.action, true);

  const p3 = actionsFromKeyboard(bindings[2], { KeyL: true, Quote: true });
  assert.equal(p3.moveX, 1);
  assert.equal(p3.secondary, true);

  const p4 = actionsFromKeyboard(bindings[3], new Set(['Numpad8', 'Numpad0']));
  assert.equal(p4.moveY, -1);
  assert.equal(p4.action, true);
});

test('gamepad stick, d-pad, face buttons, and start map to actions', () => {
  const neutral = actionsFromGamepad({
    connected: true,
    axes: [0.1, -0.1],
    buttons: [],
  });
  assert.equal(neutral.moveX, 0);
  assert.equal(neutral.moveY, 0);

  const stick = actionsFromGamepad({
    connected: true,
    axes: [0.85, 0.1],
    buttons: [{ pressed: true }, { pressed: false }],
  });
  assert.ok(stick.moveX > 0.8);
  assert.equal(stick.action, true);
  assert.equal(stick.pause, false);

  const buttons = [];
  buttons[12] = { pressed: true };
  buttons[9] = { pressed: true };
  buttons[1] = { pressed: true };
  const dpad = actionsFromGamepad({ connected: true, axes: [0.9, 0], buttons });
  assert.equal(dpad.moveY, -1);
  assert.equal(dpad.secondary, true);
  assert.equal(dpad.pause, true);
  assert.equal(dpad.source, 'gamepad');
});

test('a connected pad overrides that player keyboard', () => {
  const bindings = defaultBindings();
  const held = new Set(['KeyW', 'KeyA', 'KeyF']);
  const pad = {
    connected: true,
    axes: [0, 0],
    buttons: [{ pressed: false }, { pressed: true }],
  };
  const resolved = resolvePlayerActions(0, held, pad, bindings);
  assert.equal(resolved.source, 'gamepad');
  assert.equal(resolved.moveX, 0);
  assert.equal(resolved.moveY, 0);
  assert.equal(resolved.action, false);
  assert.equal(resolved.secondary, true);

  const keyboard = resolvePlayerActions(0, held, { connected: false, axes: [1, 0], buttons: [] }, bindings);
  assert.equal(keyboard.source, 'keyboard');
  assert.equal(keyboard.moveY, -1);
  assert.equal(keyboard.moveX, -1);
  assert.equal(keyboard.action, true);
});

test('rebind changes the key that triggers an action', () => {
  let bindings = defaultBindings();
  bindings = rebind(bindings, 0, 'action', 'KeyQ');
  assert.equal(actionsFromKeyboard(bindings[0], new Set(['KeyQ'])).action, true);
  assert.equal(actionsFromKeyboard(bindings[0], new Set(['KeyF'])).action, false);
  assert.equal(defaultBindings()[0].action, 'KeyF');
});
