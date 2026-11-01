import { step } from '../src/core/sim.js';

export function idle() {
  return { moveX: 0, moveY: 0, action: false, secondary: false };
}

export function pad(partial = {}) {
  return { ...idle(), ...partial };
}

export function fours(partial) {
  const one = pad(partial);
  return [one, idle(), idle(), idle()];
}

export function still() {
  return [idle(), idle(), idle(), idle()];
}

export function frames(state, count, input) {
  for (let i = 0; i < count; i++) step(state, input);
  return state;
}
