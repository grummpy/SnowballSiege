import { DT, PLAYER_COLORS, PLAYER_COUNT, WORLD_H, WORLD_W } from '../core/constants.js';
import { clamp } from '../core/geom.js';
import { BIND_ACTIONS, defaultBindings, rebind, resolvePlayerActions } from '../core/inputmap.js';
import { createMatch, step } from '../core/sim.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { startLoop } from './loop.js';
import { render } from './render.js';
import { loadBindings, loadSettings, saveBindings, saveSettings } from './storage.js';

const UP_KEYS = ['ArrowUp', 'KeyW', 'KeyI', 'Numpad8'];
const DOWN_KEYS = ['ArrowDown', 'KeyS', 'KeyK', 'Numpad5'];
const LEFT_KEYS = ['ArrowLeft', 'KeyA', 'KeyJ', 'Numpad4'];
const RIGHT_KEYS = ['ArrowRight', 'KeyD', 'KeyL', 'Numpad6'];
const CONFIRM_KEYS = ['Enter', 'Space', 'KeyF', 'Slash', 'Semicolon', 'Numpad0'];

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput();
  const audio = createAudio();
  const cover = new Image();
  cover.src = 'assets/cover.jpg';

  let settings = loadSettings();
  let bindings = loadBindings();
  audio.setVolume(settings.volume);
  audio.setMuted(settings.muted);

  let mode = 'title';
  let menuIndex = 0;
  let slots = ['open', 'bot', 'bot', 'bot'];
  let match = null;
  let countdown = 0;
  let pausedFrom = 'play';
  let capture = null;
  let particles = [];
  let time = 0;
  let message = '';
  let messageT = 0;
  let repairCool = 0;
  let stickWait = 0;
  let hitboxes = [];
  const padsConnected = [false, false, false, false];
  const preview = createMatch({ seed: 2, slots: ['bot', 'bot', 'bot', 'bot'], powerups: false });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    canvas.style.width = `${Math.max(1, Math.floor(WORLD_W * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(WORLD_H * scale))}px`;
    canvas.width = Math.floor(WORLD_W * dpr);
    canvas.height = Math.floor(WORLD_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function tap(code) {
    return input.pressed.has(code);
  }

  function anyTap(codes) {
    return codes.some((code) => input.pressed.has(code));
  }

  function padEdge(button) {
    return edgesOfFrame.some((edge) => edge && edge[button]);
  }

  let edgesOfFrame = [null, null, null, null];
  let padsOfFrame = [null, null, null, null];

  function confirmEdge() {
    return anyTap(CONFIRM_KEYS) || padEdge(0);
  }

  function navDelta() {
    let dx = 0;
    let dy = 0;
    if (anyTap(UP_KEYS) || padEdge(12)) dy -= 1;
    if (anyTap(DOWN_KEYS) || padEdge(13)) dy += 1;
    if (anyTap(LEFT_KEYS) || padEdge(14)) dx -= 1;
    if (anyTap(RIGHT_KEYS) || padEdge(15)) dx += 1;
    let ax = 0;
    let ay = 0;
    for (const pad of padsOfFrame) {
      if (!pad || !pad.axes) continue;
      if (Math.abs(pad.axes[0] || 0) > Math.abs(ax)) ax = pad.axes[0] || 0;
      if (Math.abs(pad.axes[1] || 0) > Math.abs(ay)) ay = pad.axes[1] || 0;
    }
    if (stickWait <= 0) {
      if (ay < -0.6) dy -= 1;
      else if (ay > 0.6) dy += 1;
      if (ax < -0.6) dx -= 1;
      else if (ax > 0.6) dx += 1;
      if ((Math.abs(ax) > 0.6 || Math.abs(ay) > 0.6) && (dx || dy)) stickWait = 0.22;
    }
    return {
      dx: Math.max(-1, Math.min(1, dx)),
      dy: Math.max(-1, Math.min(1, dy)),
    };
  }

  function burst(x, y, color, count, speed) {
    for (let n = 0; n < count; n++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random());
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.45,
        max: 0.45,
        color,
        r: 1.5 + Math.random() * 2.2,
      });
    }
  }

  function tickParticles() {
    for (const particle of particles) {
      particle.life -= DT;
      particle.x += particle.vx * DT;
      particle.y += particle.vy * DT;
    }
    if (particles.length > 200) particles.splice(0, particles.length - 200);
    particles = particles.filter((particle) => particle.life > 0);
  }

  function handleEvents() {
    if (!match) return;
    for (const event of match.events) {
      if (event.type === 'throw') {
        audio.throw();
        burst(event.x, event.y, '#f7fbff', 6, 50);
      } else if (event.type === 'hit') {
        audio.hit();
        const color = event.kind === 'penguin' ? PLAYER_COLORS[event.player] : '#ffffff';
        burst(event.x, event.y, color, 8, 80);
      } else if (event.type === 'wallbreak') {
        burst(event.x, event.y, '#d5e6ee', 12, 90);
      } else if (event.type === 'ko') {
        audio.ko();
        burst(event.x, event.y, PLAYER_COLORS[event.player], 20, 120);
      } else if (event.type === 'pickup') {
        audio.pickup();
        burst(event.x, event.y, '#fff1b0', 10, 70);
      } else if (event.type === 'round') {
        audio.roundWin();
      } else if (event.type === 'match') {
        audio.matchWin();
      } else if (event.type === 'block') {
        audio.block();
      } else if (event.type === 'repair' && repairCool <= 0) {
        audio.repair();
        repairCool = 0.16;
      }
    }
  }

  function startMatch() {
    const seed = (Date.now() >>> 0) || 1;
    match = createMatch({
      seed,
      slots: slots.slice(),
      roundsToWin: settings.roundsToWin,
      powerups: true,
    });
    countdown = 3;
    mode = 'countdown';
    particles = [];
    menuIndex = 0;
    audio.countdown();
  }

  function tryStart() {
    audio.unlock();
    audio.startTheme();
    const humans = slots.filter((slot) => slot === 'human').length;
    const active = slots.filter((slot) => slot !== 'off').length;
    if (humans < 1) {
      message = 'Someone has to join. Press your action button.';
      messageT = 2.4;
      return;
    }
    if (active < 2) {
      message = 'Need two fighters. Secondary cycles a bot into an empty slot.';
      messageT = 2.6;
      return;
    }
    message = '';
    startMatch();
  }

  function slotEdge(index, which) {
    if (padsConnected[index]) {
      const button = which === 'action' ? 0 : 1;
      return !!(edgesOfFrame[index] && edgesOfFrame[index][button]);
    }
    return tap(bindings[index][which]);
  }

  function adjustVolume(delta) {
    settings.volume = clamp(Math.round((settings.volume + delta) * 10) / 10, 0, 1);
    audio.setVolume(settings.volume);
    saveSettings(settings);
  }

  function adjustRounds(delta) {
    settings.roundsToWin = clamp(settings.roundsToWin + delta, 1, 5);
    if (match) match.roundsToWin = settings.roundsToWin;
    saveSettings(settings);
  }

  function beginCapture() {
    if (menuIndex >= BIND_ACTIONS.length * PLAYER_COUNT) return;
    capture = {
      player: menuIndex % PLAYER_COUNT,
      action: BIND_ACTIONS[Math.floor(menuIndex / PLAYER_COUNT)],
      armed: false,
    };
  }

  function activate(id, x, hit) {
    audio.unlock();
    audio.startTheme();
    audio.ui();
    if (id === 'start') {
      mode = 'join';
      return;
    }
    if (id === 'start-match') {
      tryStart();
      return;
    }
    if (id === 'resume') {
      mode = pausedFrom;
      return;
    }
    if (id === 'settings') {
      mode = 'settings';
      menuIndex = 0;
      return;
    }
    if (id === 'quit' || id === 'title') {
      mode = 'title';
      match = null;
      return;
    }
    if (id === 'controls') {
      mode = 'controls';
      menuIndex = 0;
      capture = null;
      return;
    }
    if (id === 'back') {
      mode = 'pause';
      menuIndex = 0;
      capture = null;
      return;
    }
    if (id === 'back-controls') {
      mode = 'settings';
      menuIndex = 2;
      capture = null;
      return;
    }
    if (id === 'volume' && hit) {
      adjustVolume(x < hit.x + hit.w / 2 ? -0.1 : 0.1);
      return;
    }
    if (id === 'rounds' && hit) {
      adjustRounds(x < hit.x + hit.w / 2 ? -1 : 1);
      return;
    }
    if (id === 'rematch') {
      startMatch();
      return;
    }
    if (id === 'reset-binds') {
      bindings = defaultBindings();
      saveBindings(bindings);
      return;
    }
    if (id.startsWith('bind:')) {
      menuIndex = Number(id.slice(5));
      beginCapture();
    }
  }

  function moveMenu(count, delta) {
    if (!delta) return;
    menuIndex = (menuIndex + delta + count) % count;
    audio.ui();
  }

  function moveGrid(dx, dy) {
    if (!dx && !dy) return;
    if (menuIndex === 24) {
      if (dy < 0) menuIndex = 20;
      return;
    }
    let row = Math.floor(menuIndex / 4);
    let col = menuIndex % 4;
    col = Math.max(0, Math.min(3, col + dx));
    row += dy;
    if (row > 5) menuIndex = 24;
    else menuIndex = Math.max(0, row) * 4 + col;
    audio.ui();
  }

  function buildInputs() {
    const inputs = [null, null, null, null];
    if (!match) return inputs;
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const player = match.players[i];
      if (!player.active || player.kind === 'bot') continue;
      const pad = padsOfFrame[i];
      const actions = resolvePlayerActions(i, input.held, pad, bindings);
      inputs[i] = {
        moveX: actions.moveX,
        moveY: actions.moveY,
        action: actions.action,
        secondary: actions.secondary,
      };
    }
    return inputs;
  }

  function update() {
    time += DT;
    if (messageT > 0) messageT -= DT;
    if (messageT <= 0) message = '';
    if (repairCool > 0) repairCool -= DT;
    if (stickWait > 0) stickWait -= DT;
    tickParticles();
    audio.tick();

    padsOfFrame = input.pollPads();
    edgesOfFrame = input.padEdges(padsOfFrame);
    for (let i = 0; i < PLAYER_COUNT; i++) padsConnected[i] = !!padsOfFrame[i];

    try {
      if (!capture && tap('KeyM')) {
        settings.muted = !settings.muted;
        audio.setMuted(settings.muted);
        saveSettings(settings);
        audio.unlock();
      }

      if (capture) {
        if (tap('Escape') || padEdge(1)) {
          capture = null;
          return;
        }
        if (!capture.armed) {
          if (!CONFIRM_KEYS.some((code) => input.held.has(code))) capture.armed = true;
        } else if (input.pressed.size) {
          const code = input.pressed.values().next().value;
          if (code !== 'Escape') {
            bindings = rebind(bindings, capture.player, capture.action, code);
            saveBindings(bindings);
            audio.ui();
          }
          capture = null;
        }
        return;
      }

      const nav = navDelta();

      if (mode === 'title') {
        if (tap('Enter') || tap('Space') || tap('NumpadEnter') || padEdge(9) || padEdge(0)) {
          audio.unlock();
          audio.startTheme();
          mode = 'join';
        }
        return;
      }

      if (mode === 'join') {
        for (let i = 0; i < PLAYER_COUNT; i++) {
          if (slotEdge(i, 'action')) {
            audio.unlock();
            slots[i] = 'human';
          } else if (slotEdge(i, 'secondary')) {
            const cycle = { human: 'open', open: 'bot', bot: 'off', off: 'open' };
            slots[i] = cycle[slots[i]];
          }
        }
        if (tap('Enter') || tap('Space') || padEdge(9)) tryStart();
        else if (tap('Escape') || padEdge(1)) mode = 'title';
        return;
      }

      if (mode === 'countdown') {
        const previous = countdown;
        countdown -= DT;
        if (previous > 2 && countdown <= 2) audio.countdown();
        if (previous > 1 && countdown <= 1) audio.countdown();
        if (previous > 0 && countdown <= 0) audio.go();
        if (countdown <= -0.45) mode = 'play';
        if (tap('Escape') || padEdge(9)) {
          pausedFrom = 'countdown';
          mode = 'pause';
          menuIndex = 0;
        }
        return;
      }

      if (mode === 'play') {
        if (tap('Escape') || padEdge(9)) {
          pausedFrom = 'play';
          mode = 'pause';
          menuIndex = 0;
          return;
        }
        step(match, buildInputs());
        handleEvents();
        if (match.phase === 'match_end') {
          mode = 'match';
          menuIndex = 0;
        }
        return;
      }

      if (mode === 'pause') {
        if (tap('Escape') || padEdge(9) || padEdge(1)) {
          mode = pausedFrom;
          return;
        }
        moveMenu(3, nav.dy);
        if (confirmEdge()) activate(['resume', 'settings', 'quit'][menuIndex]);
        return;
      }

      if (mode === 'settings') {
        if (tap('Escape') || padEdge(1)) {
          mode = 'pause';
          menuIndex = 0;
          return;
        }
        moveMenu(4, nav.dy);
        if (nav.dx && menuIndex === 0) adjustVolume(nav.dx * 0.1);
        if (nav.dx && menuIndex === 1) adjustRounds(nav.dx);
        if (confirmEdge()) activate(['volume', 'rounds', 'controls', 'back'][menuIndex]);
        return;
      }

      if (mode === 'controls') {
        if (tap('Escape') || padEdge(1)) {
          mode = 'settings';
          menuIndex = 2;
          return;
        }
        moveGrid(nav.dx, nav.dy);
        if (confirmEdge()) {
          if (menuIndex === 24) activate('reset-binds');
          else beginCapture();
        }
        return;
      }

      if (mode === 'match') {
        if (tap('Escape')) {
          mode = 'title';
          match = null;
          return;
        }
        moveMenu(2, nav.dy || nav.dx);
        if (confirmEdge() || padEdge(9)) activate(['rematch', 'title'][menuIndex]);
      }
    } finally {
      input.endFrame();
    }
  }

  function renderFrame() {
    hitboxes = [];
    const arena = mode === 'join' || mode === 'title' ? preview : match;
    render(ctx, {
      mode,
      time,
      menuIndex,
      settings,
      bindings,
      slots,
      arena,
      pads: padsConnected,
      countdown,
      capture,
      particles,
      cover,
      message,
      muted: settings.muted,
      hits: hitboxes,
    });
  }

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD_H;
    for (let i = hitboxes.length - 1; i >= 0; i--) {
      const hit = hitboxes[i];
      if (x >= hit.x && y >= hit.y && x <= hit.x + hit.w && y <= hit.y + hit.h) {
        activate(hit.id, x, hit);
        return;
      }
    }
  });

  resize();
  window.addEventListener('resize', resize);
  startLoop(update, renderFrame);
}
