import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBindings, normalizeSettings } from '../src/ui/storage.js';
import { defaultBindings } from '../src/core/inputmap.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('arcade.json matches the manifest and points at real files', () => {
  const manifest = JSON.parse(read('arcade.json'));
  assert.equal(manifest.name, 'Snowball Siege');
  assert.equal(manifest.id, 'snowballsiege');
  assert.equal(manifest.icon, 'assets/icon.jpg');
  assert.equal(manifest.cover, 'assets/cover.jpg');
  assert.equal(manifest.players, 4);
  assert.equal(manifest.minPlayers, 1);
  assert.equal(manifest.port, 8805);
  assert.equal(manifest.version, '1.0.0');
  assert.deepEqual(manifest.input, ['keyboard', 'gamepad']);
  assert.deepEqual(Object.keys(manifest.launch).sort(), ['linux', 'mac', 'web', 'windows']);
  for (const relative of [manifest.icon, manifest.cover, ...Object.values(manifest.launch)]) {
    const file = relative.replace(/^\.\//, '');
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
  for (const script of ['launch-mac.command', 'launch-linux.sh']) {
    const mode = fs.statSync(path.join(root, script)).mode;
    assert.ok(mode & 0o111, `${script} should be executable`);
  }
});

test('the page is a self-contained canvas module with no CDN', () => {
  const html = read('index.html');
  assert.match(html, /<canvas id="game"/);
  assert.match(html, /src="src\/main\.js"/);
  assert.match(html, /Snowball Siege/);
  assert.doesNotMatch(html, /https?:\/\//);
  const files = walkJs(path.join(root, 'src')).concat([path.join(root, 'index.html')]);
  for (const file of files) {
    const text = read(path.relative(root, file));
    assert.doesNotMatch(text, /https?:\/\//, path.relative(root, file));
  }
});

test('core modules stay free of the DOM', () => {
  const banned = ['document', 'localStorage', 'window', 'canvas', 'navigator', 'AudioContext', 'HTMLElement', 'fetch('];
  for (const file of walkJs(path.join(root, 'src', 'core'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const word of banned) {
      assert.equal(text.includes(word), false, `${path.basename(file)} contains ${word}`);
    }
  }
});

test('saved settings and bindings normalize back into a safe shape', () => {
  assert.deepEqual(normalizeSettings({ volume: 2, roundsToWin: 9, muted: 1 }), {
    volume: 1,
    roundsToWin: 5,
    muted: true,
  });
  assert.equal(normalizeSettings(null).roundsToWin, 3);
  const dirty = defaultBindings();
  dirty[0] = { ...dirty[0], action: 'KeyQ', up: '' };
  const clean = normalizeBindings(dirty);
  assert.equal(clean[0].action, 'KeyQ');
  assert.equal(clean[0].up, 'KeyW');
  assert.equal(normalizeBindings(null)[3].action, 'Numpad0');
});

function walkJs(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkJs(full));
    else if (entry.name.endsWith('.js')) found.push(full);
  }
  return found;
}
