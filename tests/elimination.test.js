import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBot } from '../src/core/bot.js';
import { createMatch, step } from '../src/core/sim.js';
import { fours, frames, still } from './helpers.js';

function match() {
  return createMatch({
    seed: 3,
    slots: ['human', 'human', 'human', 'human'],
    powerups: false,
    roundsToWin: 5,
  });
}

test('breaking all three walls eliminates that fort', () => {
  const state = match();
  for (const wall of state.forts[0].walls) wall.hp = 0;
  const x = state.players[0].x;
  step(state, fours({ moveX: 1, action: true }));
  assert.equal(state.players[0].eliminated, true);
  assert.equal(state.players[0].x, x);
  assert.equal(state.projectiles.length, 0);
  assert.ok(state.events.some((event) => event.type === 'ko' && event.player === 0));
});

test('one broken wall leaves the penguin in the fight', () => {
  const state = match();
  state.forts[0].walls[0].hp = 0;
  step(state, still());
  assert.equal(state.players[0].eliminated, false);
  assert.equal(state.phase, 'play');
  assert.equal(state.players[0].score, 0);
});

test('a bot repairs a badly damaged wall', () => {
  const state = createMatch({
    seed: 1,
    slots: ['off', 'off', 'off', 'bot'],
    powerups: false,
  });
  const wall = state.forts[3].walls[0];
  wall.hp = 5;
  state.players[3].x = wall.x + wall.w / 2;
  state.players[3].y = wall.y - 20;
  const intent = decideBot(state, 3);
  assert.equal(intent.secondary, true);
  assert.equal(intent.action, false);
  const before = wall.hp;
  frames(state, 60);
  assert.ok(wall.hp > before + 10, `hp=${wall.hp}`);
  assert.equal(state.players[3].eliminated, false);
});

test('an eliminated penguin stays eliminated until the next round', () => {
  const state = match();
  for (const wall of state.forts[2].walls) wall.hp = 0;
  step(state, still());
  assert.equal(state.players[2].eliminated, true);
  step(state, still());
  assert.equal(state.players[2].eliminated, true);
});
