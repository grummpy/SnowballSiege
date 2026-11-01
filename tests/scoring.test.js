import test from 'node:test';
import assert from 'node:assert/strict';
import { WALL_HP } from '../src/core/constants.js';
import { createMatch, step } from '../src/core/sim.js';
import { still } from './helpers.js';

function siege() {
  return createMatch({
    seed: 4,
    slots: ['human', 'human', 'human', 'off'],
    powerups: false,
    roundsToWin: 2,
  });
}

function raze(state, index) {
  for (const wall of state.forts[index].walls) wall.hp = 0;
}

test('the last fort standing scores the round', () => {
  const state = siege();
  raze(state, 1);
  raze(state, 2);
  step(state, still());
  assert.equal(state.players[0].score, 1);
  assert.equal(state.players[1].score, 0);
  assert.equal(state.roundWinner, 0);
  assert.equal(state.phase, 'round_end');
  assert.equal(state.players[1].eliminated, true);
  assert.equal(state.players[2].eliminated, true);
  assert.equal(state.players[0].eliminated, false);
});

test('the next round rebuilds walls and keeps the score', () => {
  const state = siege();
  raze(state, 1);
  raze(state, 2);
  step(state, still());
  state.banner = 0.001;
  step(state, still());
  assert.equal(state.phase, 'play');
  assert.equal(state.round, 2);
  assert.equal(state.players[0].score, 1);
  assert.equal(state.players[1].eliminated, false);
  for (const wall of state.forts[1].walls) assert.equal(wall.hp, WALL_HP);
});

test('first to the round target wins the match', () => {
  const state = siege();
  state.players[0].score = 1;
  raze(state, 1);
  raze(state, 2);
  step(state, still());
  assert.equal(state.players[0].score, 2);
  assert.equal(state.phase, 'match_end');
  assert.equal(state.matchWinner, 0);
  step(state, still());
  assert.equal(state.phase, 'match_end');
  assert.equal(state.players[0].score, 2);
});

test('mutual elimination is a draw and scores nobody', () => {
  const state = siege();
  raze(state, 0);
  raze(state, 1);
  raze(state, 2);
  step(state, still());
  assert.equal(state.roundWinner, null);
  assert.equal(state.phase, 'round_end');
  assert.equal(state.players[0].score, 0);
  assert.equal(state.players[1].score, 0);
  assert.equal(state.players[2].score, 0);
});
