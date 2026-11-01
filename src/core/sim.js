import {
  BANNER_TIME,
  CHARGE_RATE,
  DT,
  FORTIFY_HEAL,
  GRAVITY,
  MAX_POWERUPS,
  MIN_CHARGE,
  PACK_SLOW,
  PLAYER_COUNT,
  PLAYER_HIT_Z,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  POWERUP_EVERY,
  POWERUP_FIRST,
  POWERUP_RADIUS,
  POWERUP_TYPES,
  REPAIR_PER_SEC,
  REPAIR_RANGE,
  REPAIR_SLOW,
  ROUNDS_DEFAULT,
  SHIELD_TIME,
  SNOW_RADIUS,
  SPLASH_RADIUS,
  STUN_TIME,
  SWIFT_MULT,
  SWIFT_TIME,
  WALL_HIT_Z,
  WALL_HP,
  WORLD_H,
  WORLD_W,
} from './constants.js';
import { throwDamage, throwKinematics } from './arc.js';
import { decideBot } from './bot.js';
import { circleIntersectsAabb, clamp, distPointToAabb, resolveCircleAabb } from './geom.js';
import { makeRng } from './rng.js';

export { DT, PLAYER_SPEED, REPAIR_PER_SEC, STUN_TIME, WALL_HP };

function makeWall(x, y, w, h) {
  return { x, y, w, h, hp: WALL_HP, maxHp: WALL_HP };
}

export function makeForts() {
  return [
    {
      spawn: { x: 120, y: 96 },
      walls: [
        makeWall(36, 28, 150, 18),
        makeWall(36, 28, 18, 130),
        makeWall(36, 140, 78, 18),
      ],
    },
    {
      spawn: { x: 840, y: 96 },
      walls: [
        makeWall(774, 28, 150, 18),
        makeWall(906, 28, 18, 130),
        makeWall(846, 140, 78, 18),
      ],
    },
    {
      spawn: { x: 840, y: 444 },
      walls: [
        makeWall(774, 494, 150, 18),
        makeWall(906, 382, 18, 130),
        makeWall(846, 382, 78, 18),
      ],
    },
    {
      spawn: { x: 120, y: 444 },
      walls: [
        makeWall(36, 494, 150, 18),
        makeWall(36, 382, 18, 130),
        makeWall(36, 382, 78, 18),
      ],
    },
  ];
}

function facingCenter(x, y) {
  return Math.atan2(WORLD_H / 2 - y, WORLD_W / 2 - x);
}

function blankPlayer(id, kind, spawn) {
  return {
    id,
    kind,
    active: kind !== 'off',
    x: spawn.x,
    y: spawn.y,
    facing: facingCenter(spawn.x, spawn.y),
    radius: PLAYER_RADIUS,
    charge: 0,
    prevAction: false,
    stun: 0,
    swift: 0,
    shield: 0,
    heavy: false,
    eliminated: false,
    score: 0,
  };
}

export function createMatch(options = {}) {
  const slots = options.slots ? options.slots.slice() : ['human', 'bot', 'bot', 'bot'];
  if (slots.length !== PLAYER_COUNT) {
    throw new Error('Snowball Siege requires exactly 4 player slots');
  }
  const forts = makeForts();
  const seed = options.seed == null ? 1 : options.seed >>> 0;
  const state = {
    seed,
    rng: makeRng(seed),
    players: forts.map((fort, i) => blankPlayer(i, slots[i], fort.spawn)),
    forts,
    projectiles: [],
    powerups: [],
    powerupsEnabled: options.powerups !== false,
    powerupTimer: POWERUP_FIRST,
    phase: 'play',
    round: 1,
    roundsToWin: Math.max(1, options.roundsToWin || ROUNDS_DEFAULT),
    roundWinner: null,
    matchWinner: null,
    banner: 0,
    events: [],
    time: 0,
  };
  return state;
}

function resetRound(state, advance) {
  if (advance) state.round += 1;
  state.phase = 'play';
  state.roundWinner = null;
  state.banner = 0;
  state.projectiles = [];
  state.powerups = [];
  state.powerupTimer = POWERUP_FIRST;
  const fresh = makeForts();
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const fort = state.forts[i];
    fort.walls = fresh[i].walls;
    fort.spawn = fresh[i].spawn;
    const player = state.players[i];
    player.x = fort.spawn.x;
    player.y = fort.spawn.y;
    player.facing = facingCenter(player.x, player.y);
    player.charge = 0;
    player.prevAction = false;
    player.stun = 0;
    player.swift = 0;
    player.shield = 0;
    player.heavy = false;
    player.eliminated = false;
  }
}

export function applyPowerup(state, playerIndex, type) {
  const player = state.players[playerIndex];
  const fort = state.forts[playerIndex];
  if (type === 'packed') player.charge = 1;
  else if (type === 'swift') player.swift = SWIFT_TIME;
  else if (type === 'fortify') {
    for (const wall of fort.walls) {
      wall.hp = Math.min(wall.maxHp, wall.hp + FORTIFY_HEAL);
    }
  } else if (type === 'heavy') player.heavy = true;
  else if (type === 'shield') player.shield = SHIELD_TIME;
  state.events.push({
    type: 'pickup',
    player: playerIndex,
    powerup: type,
    x: player.x,
    y: player.y,
  });
}

export function launchSnowball(state, playerIndex, charge, angle = null) {
  const player = state.players[playerIndex];
  const useAngle = angle == null ? player.facing : angle;
  const kin = throwKinematics(charge);
  const ox = player.x + Math.cos(useAngle) * (player.radius + 10);
  const oy = player.y + Math.sin(useAngle) * (player.radius + 10);
  const ball = {
    owner: playerIndex,
    x: ox,
    y: oy,
    z: kin.z0,
    vx: Math.cos(useAngle) * kin.speed,
    vy: Math.sin(useAngle) * kin.speed,
    vz: kin.vz,
    damage: throwDamage(charge, player.heavy),
    radius: SNOW_RADIUS,
    alive: true,
    age: 0,
  };
  player.heavy = false;
  state.projectiles.push(ball);
  state.events.push({ type: 'throw', player: playerIndex, x: ox, y: oy, charge });
  return ball;
}

function sanitizeInput(input) {
  if (!input) return { moveX: 0, moveY: 0, action: false, secondary: false };
  let mx = Number(input.moveX) || 0;
  let my = Number(input.moveY) || 0;
  const l = Math.hypot(mx, my);
  if (l > 1) {
    mx /= l;
    my /= l;
  }
  return {
    moveX: mx,
    moveY: my,
    action: !!input.action,
    secondary: !!input.secondary,
  };
}

function intentFor(state, inputs, index) {
  const player = state.players[index];
  if (!player.active || player.eliminated) {
    return { moveX: 0, moveY: 0, action: false, secondary: false };
  }
  if (inputs && inputs[index]) return sanitizeInput(inputs[index]);
  if (player.kind === 'bot') return sanitizeInput(decideBot(state, index));
  return { moveX: 0, moveY: 0, action: false, secondary: false };
}

function tryRepair(state, player) {
  const fort = state.forts[player.id];
  let best = null;
  let bestD = REPAIR_RANGE;
  for (const wall of fort.walls) {
    if (wall.hp >= wall.maxHp) continue;
    const d = distPointToAabb(player.x, player.y, wall);
    if (d <= bestD) {
      best = wall;
      bestD = d;
    }
  }
  if (!best) return false;
  const before = best.hp;
  best.hp = Math.min(best.maxHp, best.hp + REPAIR_PER_SEC * DT);
  if (best.hp > before) {
    state.events.push({ type: 'repair', player: player.id, x: player.x, y: player.y });
  }
  return true;
}

function updatePlayer(state, index, input) {
  const player = state.players[index];
  if (!player.active || player.eliminated) return;

  if (player.stun > 0) {
    player.stun = Math.max(0, player.stun - DT);
    player.charge = 0;
    player.prevAction = false;
    if (player.swift > 0) player.swift = Math.max(0, player.swift - DT);
    if (player.shield > 0) player.shield = Math.max(0, player.shield - DT);
    return;
  }

  if (player.swift > 0) player.swift = Math.max(0, player.swift - DT);
  if (player.shield > 0) player.shield = Math.max(0, player.shield - DT);

  const packing = input.action;
  const repairing = input.secondary && !packing;
  let speed = PLAYER_SPEED;
  if (player.swift > 0) speed *= SWIFT_MULT;
  if (packing) speed *= PACK_SLOW;
  else if (repairing) speed *= REPAIR_SLOW;

  player.x += input.moveX * speed * DT;
  player.y += input.moveY * speed * DT;
  if (input.moveX !== 0 || input.moveY !== 0) {
    player.facing = Math.atan2(input.moveY, input.moveX);
  }

  if (repairing) tryRepair(state, player);

  if (packing) {
    player.charge = Math.min(1, player.charge + CHARGE_RATE * DT);
    player.prevAction = true;
  } else if (player.prevAction) {
    if (player.charge >= MIN_CHARGE) launchSnowball(state, index, player.charge);
    player.charge = 0;
    player.prevAction = false;
  }
}

function solidWalls(state) {
  const solids = [];
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (!state.players[i].active) continue;
    for (const wall of state.forts[i].walls) {
      if (wall.hp > 0) solids.push(wall);
    }
  }
  return solids;
}

function resolveWorld(state) {
  const solids = solidWalls(state);
  for (let pass = 0; pass < 3; pass++) {
    for (const player of state.players) {
      if (!player.active || player.eliminated) continue;
      for (const wall of solids) {
        const next = resolveCircleAabb(player.x, player.y, player.radius, wall);
        player.x = next.x;
        player.y = next.y;
      }
      player.x = clamp(player.x, player.radius, WORLD_W - player.radius);
      player.y = clamp(player.y, player.radius, WORLD_H - player.radius);
    }
    for (let i = 0; i < PLAYER_COUNT; i++) {
      for (let j = i + 1; j < PLAYER_COUNT; j++) {
        const a = state.players[i];
        const b = state.players[j];
        if (!a.active || !b.active || a.eliminated || b.eliminated) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.radius + b.radius;
        if (d === 0) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        if (d < min) {
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }
}

function stunPlayer(state, player, attacker, x, y) {
  if (player.shield > 0) {
    state.events.push({ type: 'block', player: player.id, attacker, x, y });
    return;
  }
  player.stun = STUN_TIME;
  player.charge = 0;
  player.prevAction = false;
  state.events.push({
    type: 'hit',
    kind: 'penguin',
    player: player.id,
    attacker,
    x,
    y,
  });
}

function damageWall(state, ownerFort, wall, ball) {
  if (ownerFort === ball.owner) return false;
  if (wall.hp <= 0) return false;
  wall.hp = Math.max(0, wall.hp - ball.damage);
  state.events.push({
    type: 'hit',
    kind: 'wall',
    player: ownerFort,
    attacker: ball.owner,
    x: ball.x,
    y: ball.y,
    hp: wall.hp,
  });
  if (wall.hp <= 0) {
    state.events.push({ type: 'wallbreak', player: ownerFort, x: ball.x, y: ball.y });
  }
  return true;
}

function affectPenguin(state, ball, radius) {
  for (const player of state.players) {
    if (!player.active || player.eliminated || player.id === ball.owner) continue;
    if (ball.z > PLAYER_HIT_Z) continue;
    const reach = player.radius + radius;
    if (Math.hypot(player.x - ball.x, player.y - ball.y) <= reach) {
      stunPlayer(state, player, ball.owner, player.x, player.y);
      return true;
    }
  }
  return false;
}

function affectWalls(state, ball, radius) {
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (!state.players[i].active) continue;
    for (const wall of state.forts[i].walls) {
      if (wall.hp <= 0) continue;
      if (!circleIntersectsAabb(ball.x, ball.y, radius, wall)) continue;
      if (i === ball.owner) return 'blocked';
      damageWall(state, i, wall, ball);
      return 'hit';
    }
  }
  return null;
}

function splash(state, ball) {
  for (const player of state.players) {
    if (!player.active || player.eliminated || player.id === ball.owner) continue;
    if (Math.hypot(player.x - ball.x, player.y - ball.y) <= player.radius + SPLASH_RADIUS) {
      stunPlayer(state, player, ball.owner, player.x, player.y);
    }
  }
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (!state.players[i].active || i === ball.owner) continue;
    for (const wall of state.forts[i].walls) {
      if (wall.hp <= 0) continue;
      if (circleIntersectsAabb(ball.x, ball.y, SPLASH_RADIUS, wall)) {
        damageWall(state, i, wall, ball);
      }
    }
  }
}

function updateProjectiles(state) {
  for (const ball of state.projectiles) {
    if (!ball.alive) continue;
    ball.age += DT;
    ball.x += ball.vx * DT;
    ball.y += ball.vy * DT;
    ball.z = ball.z + ball.vz * DT - 0.5 * GRAVITY * DT * DT;
    ball.vz -= GRAVITY * DT;
    if (ball.age > 4 || ball.x < -80 || ball.y < -80 || ball.x > WORLD_W + 80 || ball.y > WORLD_H + 80) {
      ball.alive = false;
      continue;
    }
    if (ball.z <= 0) {
      ball.z = 0;
      splash(state, ball);
      ball.alive = false;
      continue;
    }
    if (ball.z <= PLAYER_HIT_Z && affectPenguin(state, ball, ball.radius)) {
      ball.alive = false;
      continue;
    }
    if (ball.z <= WALL_HIT_Z) {
      const hit = affectWalls(state, ball, ball.radius);
      if (hit) ball.alive = false;
    }
  }
  state.projectiles = state.projectiles.filter((ball) => ball.alive);
}

function pointBlocked(state, x, y) {
  for (const wall of solidWalls(state)) {
    if (circleIntersectsAabb(x, y, POWERUP_RADIUS, wall)) return true;
  }
  for (const player of state.players) {
    if (!player.active) continue;
    if (Math.hypot(player.x - x, player.y - y) < player.radius + 36) return true;
  }
  for (const powerup of state.powerups) {
    if (Math.hypot(powerup.x - x, powerup.y - y) < 40) return true;
  }
  return false;
}

function spawnPowerup(state) {
  const type = POWERUP_TYPES[Math.floor(state.rng() * POWERUP_TYPES.length)];
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = 220 + state.rng() * (WORLD_W - 440);
    const y = 180 + state.rng() * (WORLD_H - 320);
    if (pointBlocked(state, x, y)) continue;
    state.powerups.push({
      type,
      x,
      y,
      radius: POWERUP_RADIUS,
      bob: state.rng() * Math.PI * 2,
    });
    state.events.push({ type: 'spawn', powerup: type, x, y });
    return;
  }
}

function collectPowerups(state) {
  const kept = [];
  for (const powerup of state.powerups) {
    let taken = false;
    for (const player of state.players) {
      if (!player.active || player.eliminated) continue;
      const reach = player.radius + powerup.radius;
      if (Math.hypot(player.x - powerup.x, player.y - powerup.y) <= reach) {
        applyPowerup(state, player.id, powerup.type);
        taken = true;
        break;
      }
    }
    if (!taken) kept.push(powerup);
  }
  state.powerups = kept;
}

export function refreshElimination(state) {
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const player = state.players[i];
    if (!player.active || player.eliminated) continue;
    const standing = state.forts[i].walls.some((wall) => wall.hp > 0);
    if (!standing) {
      player.eliminated = true;
      player.charge = 0;
      player.prevAction = false;
      state.events.push({ type: 'ko', player: i, x: player.x, y: player.y });
    }
  }
}

function living(state) {
  return state.players.filter((player) => player.active && !player.eliminated);
}

function activeCount(state) {
  return state.players.filter((player) => player.active).length;
}

function checkRound(state) {
  if (state.phase !== 'play') return;
  if (activeCount(state) < 2) return;
  const alive = living(state);
  if (alive.length > 1) return;
  if (alive.length === 1) {
    const winner = alive[0];
    winner.score += 1;
    state.roundWinner = winner.id;
    state.events.push({ type: 'round', player: winner.id });
    if (winner.score >= state.roundsToWin) {
      state.phase = 'match_end';
      state.matchWinner = winner.id;
      state.events.push({ type: 'match', player: winner.id });
      return;
    }
  } else {
    state.roundWinner = null;
    state.events.push({ type: 'round', player: null });
  }
  state.phase = 'round_end';
  state.banner = BANNER_TIME;
}

/**
 * Advance the match by one fixed 60 Hz tick.
 * `inputs` is an array of { moveX, moveY, action, secondary } per slot.
 * A missing entry lets a bot decide and leaves a human idle.
 */
export function step(state, inputs) {
  state.events = [];
  state.time += DT;
  if (state.phase === 'round_end') {
    state.banner -= DT;
    if (state.banner <= 0) resetRound(state, true);
    return state;
  }
  if (state.phase !== 'play') return state;

  refreshElimination(state);

  const intents = [];
  for (let i = 0; i < PLAYER_COUNT; i++) intents.push(intentFor(state, inputs, i));
  for (let i = 0; i < PLAYER_COUNT; i++) updatePlayer(state, i, intents[i]);
  resolveWorld(state);
  collectPowerups(state);
  updateProjectiles(state);
  refreshElimination(state);
  checkRound(state);

  if (state.phase === 'play' && state.powerupsEnabled) {
    state.powerupTimer -= DT;
    if (state.powerupTimer <= 0) {
      state.powerupTimer = POWERUP_EVERY;
      if (state.powerups.length < MAX_POWERUPS) spawnPowerup(state);
    }
  }
  return state;
}

export function snapshot(state) {
  return {
    phase: state.phase,
    round: state.round,
    roundWinner: state.roundWinner,
    matchWinner: state.matchWinner,
    scores: state.players.map((player) => player.score),
    eliminated: state.players.map((player) => player.eliminated),
    positions: state.players.map((player) => [round4(player.x), round4(player.y)]),
    walls: state.forts.map((fort) => fort.walls.map((wall) => round4(wall.hp))),
    powerups: state.powerups.map((powerup) => [powerup.type, round4(powerup.x), round4(powerup.y)]),
    projectiles: state.projectiles.length,
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
