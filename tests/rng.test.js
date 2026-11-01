import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';
import { createMatch, snapshot, step } from '../src/core/sim.js';

function roll(seed, count) {
  const rng = makeRng(seed);
  const values = [];
  for (let i = 0; i < count; i++) values.push(rng());
  return values;
}

test('the same seed replays the same numbers', () => {
  assert.deepEqual(roll(42, 8), roll(42, 8));
  assert.notDeepEqual(roll(42, 4), roll(43, 4));
  const values = roll(42, 6);
  for (const value of values) {
    assert.ok(value >= 0 && value < 1);
  }
});

test('a bot match is deterministic for a seed', () => {
  const run = (seed) => {
    const state = createMatch({
      seed,
      slots: ['bot', 'bot', 'bot', 'bot'],
      powerups: true,
      roundsToWin: 3,
    });
    for (let i = 0; i < 360; i++) step(state);
    return snapshot(state);
  };
  assert.deepEqual(run(99), run(99));
  assert.notDeepEqual(run(99), run(100));
});

test('a long bot siege stays finite', () => {
  const state = createMatch({
    seed: 1234,
    slots: ['bot', 'bot', 'bot', 'bot'],
    powerups: true,
    roundsToWin: 3,
  });
  for (let i = 0; i < 1200; i++) step(state);
  for (const player of state.players) {
    assert.ok(Number.isFinite(player.x));
    assert.ok(Number.isFinite(player.y));
    assert.ok(Number.isFinite(player.charge));
    assert.ok(player.score >= 0);
  }
  for (const fort of state.forts) {
    for (const wall of fort.walls) assert.ok(Number.isFinite(wall.hp));
  }
  assert.ok(['play', 'round_end', 'match_end'].includes(state.phase));
});
