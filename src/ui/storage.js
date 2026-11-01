import { BIND_ACTIONS, defaultBindings } from '../core/inputmap.js';
import { clamp } from '../core/geom.js';

const SETTINGS_KEY = 'snowballsiege.settings';
const BINDINGS_KEY = 'snowballsiege.bindings';

export function defaultSettings() {
  return { volume: 0.8, roundsToWin: 3, muted: false };
}

export function normalizeSettings(data) {
  const defaults = defaultSettings();
  if (!data || typeof data !== 'object') return defaults;
  const volume = typeof data.volume === 'number' ? data.volume : defaults.volume;
  const rounds = Number.isFinite(data.roundsToWin) ? data.roundsToWin : defaults.roundsToWin;
  return {
    volume: clamp(volume, 0, 1),
    roundsToWin: clamp(Math.round(rounds), 1, 5),
    muted: !!data.muted,
  };
}

export function normalizeBindings(data) {
  const defaults = defaultBindings();
  if (!Array.isArray(data) || data.length !== defaults.length) return defaults;
  return defaults.map((row, index) => {
    const incoming = data[index] || {};
    const next = { ...row };
    for (const action of BIND_ACTIONS) {
      if (typeof incoming[action] === 'string' && incoming[action]) next[action] = incoming[action];
    }
    return next;
  });
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    /* private mode and disabled storage still let the match run */
  }
}

export function loadBindings() {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (!raw) return defaultBindings();
    return normalizeBindings(JSON.parse(raw));
  } catch {
    return defaultBindings();
  }
}

export function saveBindings(bindings) {
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    /* ignore quota / private mode */
  }
}
