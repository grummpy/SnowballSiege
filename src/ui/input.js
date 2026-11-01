const BLOCKED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Enter', 'Tab', 'NumpadEnter',
  'Slash', 'Quote', 'Semicolon', 'Period',
]);

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const prevButtons = [[], [], [], []];

  function onKeyDown(event) {
    if (BLOCKED.has(event.code) || event.code.startsWith('Numpad')) event.preventDefault();
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function pollPads() {
    const pads = [null, null, null, null];
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < 4; i++) {
      const pad = list && list[i];
      if (pad && pad.connected) pads[i] = pad;
    }
    return pads;
  }

  function padEdges(pads) {
    const edges = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      const pad = pads[i];
      if (!pad) {
        prevButtons[i] = [];
        continue;
      }
      const now = [];
      const edge = [];
      const buttons = pad.buttons || [];
      const count = Math.max(buttons.length, 16);
      for (let b = 0; b < count; b++) {
        const button = buttons[b];
        now[b] = !!(button && button.pressed);
        edge[b] = now[b] && !prevButtons[i][b];
      }
      prevButtons[i] = now;
      edges[i] = edge;
    }
    return edges;
  }

  return {
    held,
    pressed,
    pollPads,
    padEdges,
    endFrame() {
      pressed.clear();
    },
  };
}
