import test from 'node:test';
import assert from 'node:assert/strict';
import { throwDamage } from '../src/core/arc.js';
import { FORTIFY_HEAL, PLAYER_SPEED, STUN_TIME, SWIFT_MULT, WALL_HP } from '../src/core/constants.js';
import { applyPowerup, createMatch, step } from '../src/core/sim.js';
import { fours, frames, still } from './helpers.js';

function match() {
  return createMatch({
    seed: 8,
    slots: ['human', 'human', 'off', 'off'],
    powerups: false,
    roundsToWin: 3,
  });
}

test('walking over a powerup applies it and removes it', () => {
  const state = match();
  const player = state.players[0];
  state.powerups.push({ type: 'packed', x: player.x, y: player.y, radius: 14, bob: 0 });
  step(state, still());
  assert.equal(player.charge, 1);
  assert.equal(state.powerups.length, 0);
  assert.ok(state.events.some((event) => event.type === 'pickup' && event.powerup === 'packed'));
});

test('swift snow makes a penguin faster', () => {
  const plain = match();
  const fast = match();
  applyPowerup(fast, 0, 'swift');
  frames(plain, 60, fours({ moveX: 1 }));
  frames(fast, 60, fours({ moveX: 1 }));
  const plainDist = plain.players[0].x - plain.forts[0].spawn.x;
  const fastDist = fast.players[0].x - fast.forts[0].spawn.x;
  assert.ok(Math.abs(plainDist - PLAYER_SPEED) < 0.05);
  assert.ok(fastDist > plainDist * (SWIFT_MULT - 0.05));
});

test('fortify patches every wall of your fort', () => {
  const state = match();
  state.forts[0].walls[0].hp = 10;
  state.forts[0].walls[1].hp = 0;
  applyPowerup(state, 0, 'fortify');
  assert.equal(state.forts[0].walls[0].hp, 10 + FORTIFY_HEAL);
  assert.equal(state.forts[0].walls[1].hp, FORTIFY_HEAL);
  assert.equal(state.forts[0].walls[2].hp, WALL_HP);
});

test('heavy snow doubles the next throw and is then used up', () => {
  const state = match();
  applyPowerup(state, 0, 'heavy');
  state.players[0].charge = 1;
  state.players[0].prevAction = true;
  step(state, still());
  assert.equal(state.players[0].heavy, false);
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].damage, throwDamage(1, true));
  assert.ok(state.projectiles[0].damage > throwDamage(1, false));
});

test('a shield shrugs off a snowball that would stun', () => {
  const state = match();
  applyPowerup(state, 0, 'shield');
  const player = state.players[0];
  state.projectiles.push({
    owner: 1,
    x: player.x,
    y: player.y,
    z: 8,
    vx: 0,
    vy: 0,
    vz: 0,
    damage: 12,
    radius: 7,
    alive: true,
    age: 0,
  });
  step(state, still());
  assert.equal(player.stun, 0);
  assert.ok(state.events.some((event) => event.type === 'block'));

  const bare = match();
  const victim = bare.players[0];
  bare.projectiles.push({
    owner: 1,
    x: victim.x,
    y: victim.y,
    z: 8,
    vx: 0,
    vy: 0,
    vz: 0,
    damage: 12,
    radius: 7,
    alive: true,
    age: 0,
  });
  step(bare, still());
  assert.equal(victim.stun, STUN_TIME);
});

test('repairing beside your own wall restores hit points', () => {
  const state = match();
  const wall = state.forts[0].walls[1];
  wall.hp = 20;
  state.players[0].x = wall.x + wall.w + state.players[0].radius + 1;
  state.players[0].y = wall.y + 40;
  frames(state, 60, fours({ secondary: true }));
  assert.ok(wall.hp > 30 && wall.hp < WALL_HP, `hp=${wall.hp}`);
});
