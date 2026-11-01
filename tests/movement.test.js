import test from 'node:test';
import assert from 'node:assert/strict';
import { throwRange } from '../src/core/arc.js';
import { PLAYER_SPEED, WALL_HP } from '../src/core/constants.js';
import { circleIntersectsAabb, resolveCircleAabb } from '../src/core/geom.js';
import { createMatch, launchSnowball, step } from '../src/core/sim.js';
import { fours, frames, still } from './helpers.js';

function match() {
  return createMatch({
    seed: 1,
    slots: ['human', 'human', 'human', 'human'],
    powerups: false,
    roundsToWin: 3,
  });
}

test('circle collision detects overlap and pushes out of a wall', () => {
  const box = { x: 10, y: 0, w: 10, h: 10 };
  assert.equal(circleIntersectsAabb(0, 5, 5, box), false);
  assert.equal(circleIntersectsAabb(8, 5, 5, box), true);
  const resolved = resolveCircleAabb(8, 5, 5, box);
  assert.equal(resolved.hit, true);
  assert.ok(resolved.x <= box.x - 5 + 0.001);
});

test('a penguin walks across open ice at the configured speed', () => {
  const state = match();
  const start = state.players[0].x;
  frames(state, 60, fours({ moveX: 1 }));
  assert.ok(Math.abs(state.players[0].x - (start + PLAYER_SPEED)) < 0.05);
  assert.ok(Math.abs(state.players[0].y - state.forts[0].spawn.y) < 0.05);
});

test('diagonal movement does not go faster than straight movement', () => {
  const state = match();
  const x0 = state.players[0].x;
  const y0 = state.players[0].y;
  frames(state, 60, fours({ moveX: 1, moveY: 1 }));
  const traveled = Math.hypot(state.players[0].x - x0, state.players[0].y - y0);
  assert.ok(Math.abs(traveled - PLAYER_SPEED) < 0.05);
});

test('fort walls block movement', () => {
  const state = match();
  frames(state, 90, fours({ moveX: -1 }));
  assert.ok(state.players[0].x > 64, `x=${state.players[0].x}`);
  assert.ok(state.players[0].x < 78, `x=${state.players[0].x}`);
});

test('an empty slot does not leave a solid fort behind', () => {
  const state = createMatch({
    seed: 1,
    slots: ['human', 'off', 'off', 'off'],
    powerups: false,
  });
  state.players[0].x = 849;
  state.players[0].y = 80;
  frames(state, 40, fours({ moveY: -1 }));
  assert.ok(state.players[0].y < 30, `y=${state.players[0].y}`);
});

test('packing snow slows the thrower and a full pack launches on release', () => {
  const packing = match();
  const free = match();
  frames(packing, 60, fours({ moveX: 1, action: true }));
  frames(free, 60, fours({ moveX: 1 }));
  const packed = packing.players[0].x - packing.forts[0].spawn.x;
  const walked = free.players[0].x - free.forts[0].spawn.x;
  assert.ok(packed < walked * 0.75);
  assert.ok(packing.players[0].charge > 0.95);
  assert.equal(packing.projectiles.length, 0);
  step(packing, still());
  assert.equal(packing.players[0].charge, 0);
  assert.equal(packing.projectiles.length, 1);
});

test('a tap is too short to throw', () => {
  const state = match();
  step(state, fours({ action: true }));
  step(state, still());
  assert.equal(state.projectiles.length, 0);
});

test('a longer charge lobs farther', () => {
  const short = throwRange(0.3);
  const full = throwRange(1);
  assert.ok(full > short + 120, `short=${short} full=${full}`);
});

test('snowballs damage enemy walls and stop on your own', () => {
  const state = match();
  const wall = state.forts[1].walls[0];
  const before = wall.hp;
  state.projectiles.push({
    owner: 0,
    x: wall.x + wall.w / 2,
    y: wall.y + wall.h + 10,
    z: 10,
    vx: 0,
    vy: -180,
    vz: 0,
    damage: 21,
    radius: 7,
    alive: true,
    age: 0,
  });
  frames(state, 8, still());
  assert.equal(wall.hp, before - 21);
  assert.equal(before, WALL_HP);

  const own = state.forts[0].walls[0];
  const ownHp = own.hp;
  state.projectiles.push({
    owner: 0,
    x: own.x + own.w / 2,
    y: own.y + own.h + 10,
    z: 10,
    vx: 0,
    vy: -180,
    vz: 0,
    damage: 21,
    radius: 7,
    alive: true,
    age: 0,
  });
  frames(state, 8, still());
  assert.equal(own.hp, ownHp);
  assert.equal(state.projectiles.length, 0);
});

test('a snowball stuns the penguin it hits', () => {
  const state = match();
  const target = state.players[1];
  state.projectiles.push({
    owner: 0,
    x: target.x,
    y: target.y,
    z: 10,
    vx: 0,
    vy: 0,
    vz: 0,
    damage: 10,
    radius: 7,
    alive: true,
    age: 0,
  });
  step(state, still());
  assert.ok(target.stun > 0.6);
  const stuck = target.x;
  frames(state, 10, [ { moveX: 0, moveY: 0, action: false, secondary: false }, { moveX: 1, moveY: 0, action: false, secondary: false }, { moveX: 0, moveY: 0, action: false, secondary: false }, { moveX: 0, moveY: 0, action: false, secondary: false } ]);
  assert.equal(target.x, stuck);
});

test('launchSnowball leaves the hand along the facing', () => {
  const state = match();
  state.players[0].facing = 0;
  const ball = launchSnowball(state, 0, 1);
  assert.ok(ball.x > state.players[0].x);
  assert.ok(ball.damage > 0);
});
