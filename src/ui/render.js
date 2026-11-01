import { PLAYER_COLORS, PLAYER_NAMES, WORLD_H, WORLD_W } from '../core/constants.js';
import { integrateArc } from '../core/arc.js';
import { BIND_ACTIONS, keyLabel } from '../core/inputmap.js';
import { makeRng } from '../core/rng.js';

const FONT = 'Trebuchet MS, Verdana, sans-serif';
const specks = [];
const driftRng = makeRng(7);
for (let i = 0; i < 90; i++) {
  specks.push({
    x: driftRng() * WORLD_W,
    y: driftRng() * WORLD_H,
    r: 0.8 + driftRng() * 2.4,
  });
}

const YARDS = [
  { x: 58, y: 50, w: 110, h: 86 },
  { x: 792, y: 50, w: 110, h: 86 },
  { x: 792, y: 404, w: 110, h: 86 },
  { x: 58, y: 404, w: 110, h: 86 },
];

const FLAGS = [
  { x: 48, y: 52 },
  { x: 900, y: 52 },
  { x: 900, y: 470 },
  { x: 48, y: 470 },
];

const ACTION_LABELS = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  action: 'Throw',
  secondary: 'Repair',
};

export function render(ctx, view) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  if (view.mode === 'title') {
    drawTitle(ctx, view);
    return;
  }
  drawArena(ctx, view);
  if (view.mode === 'join') drawJoin(ctx, view);
  if (view.mode === 'countdown') drawCountdown(ctx, view);
  if (view.mode === 'pause') drawMenu(ctx, view, 'Paused', ['Resume', 'Settings', 'Quit to title'], ['resume', 'settings', 'quit']);
  if (view.mode === 'settings') drawSettings(ctx, view);
  if (view.mode === 'controls') drawControls(ctx, view);
  if (view.mode === 'match') drawMatch(ctx, view);
  drawParticles(ctx, view.particles);
}

function font(size, bold = true) {
  return `${bold ? '700 ' : ''}${size}px ${FONT}`;
}

function rounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 18;
  rounded(ctx, x, y, w, h, 18);
  ctx.fillStyle = 'rgba(7, 22, 34, 0.88)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(214, 242, 255, 0.45)';
  ctx.stroke();
  ctx.restore();
}

function button(ctx, hits, id, x, y, w, h, label, selected) {
  hits.push({ id, x, y, w, h });
  rounded(ctx, x, y, w, h, 10);
  ctx.fillStyle = selected ? '#1d6288' : 'rgba(9, 26, 40, 0.94)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = selected ? '#e7f7ff' : 'rgba(176, 214, 230, 0.45)';
  ctx.stroke();
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(18);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawImageCover(ctx, img) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = WORLD_W / WORLD_H;
  let dw;
  let dh;
  let dx;
  let dy;
  if (ir > cr) {
    dh = WORLD_H;
    dw = WORLD_H * ir;
    dx = (WORLD_W - dw) / 2;
    dy = 0;
  } else {
    dw = WORLD_W;
    dh = WORLD_W / ir;
    dx = 0;
    dy = (WORLD_H - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  return true;
}

function drawTitle(ctx, view) {
  if (!drawImageCover(ctx, view.cover)) {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    sky.addColorStop(0, '#8fd0ea');
    sky.addColorStop(1, '#d5eef4');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  ctx.fillStyle = 'rgba(6, 16, 28, 0.28)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  const fade = ctx.createLinearGradient(0, 180, 0, WORLD_H);
  fade.addColorStop(0, 'rgba(6, 18, 30, 0)');
  fade.addColorStop(1, 'rgba(6, 18, 30, 0.78)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (let i = 0; i < 28; i++) {
    const x = (i * 137 + view.time * 22) % WORLD_W;
    const y = (i * 89 + view.time * 36) % WORLD_H;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7fbff';
  ctx.strokeStyle = 'rgba(18, 48, 72, 0.55)';
  ctx.lineWidth = 6;
  ctx.font = font(68);
  ctx.strokeText('SNOWBALL SIEGE', WORLD_W / 2, 250);
  ctx.fillText('SNOWBALL SIEGE', WORLD_W / 2, 250);
  ctx.font = font(20, false);
  ctx.fillStyle = '#e7f6ff';
  ctx.fillText('Four forts. Three walls. Last penguin standing.', WORLD_W / 2, 292);

  const blink = Math.sin(view.time * 4) > 0;
  if (blink) {
    ctx.font = font(26);
    ctx.fillStyle = '#fff';
    ctx.fillText('Press Start / Enter', WORLD_W / 2, 390);
  }
  button(ctx, view.hits, 'start', WORLD_W / 2 - 90, 420, 180, 42, 'Start', false);
  ctx.font = font(14, false);
  ctx.fillStyle = 'rgba(244,251,255,0.8)';
  ctx.fillText('M mutes    ·    1 to 4 local players    ·    bots welcome', WORLD_W / 2, 490);
}

function drawArena(ctx, view) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  sky.addColorStop(0, '#b9e4f2');
  sky.addColorStop(0.45, '#d7f1f4');
  sky.addColorStop(1, '#eef8f6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(480, 280, 220, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const speck of specks) {
    ctx.beginPath();
    ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(214, 232, 238, 0.95)';
  for (const brick of [
    [458, 252, 22, 16],
    [480, 260, 18, 14],
    [444, 270, 16, 18],
    [470, 276, 24, 12],
    [496, 268, 14, 16],
  ]) {
    ctx.fillRect(brick[0], brick[1], brick[2], brick[3]);
    ctx.strokeStyle = 'rgba(120, 150, 165, 0.35)';
    ctx.strokeRect(brick[0] + 0.5, brick[1] + 0.5, brick[2] - 1, brick[3] - 1);
  }

  const match = view.arena;
  if (!match) return;

  for (let i = 0; i < match.forts.length; i++) {
    if (!fortShown(view, i)) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const yard = YARDS[i];
    rounded(ctx, yard.x, yard.y, yard.w, yard.h, 10);
    ctx.fill();
  }

  for (let i = 0; i < match.forts.length; i++) {
    if (!fortShown(view, i)) continue;
    for (const wall of match.forts[i].walls) drawWall(ctx, wall, PLAYER_COLORS[i]);
    drawFlag(ctx, FLAGS[i].x, FLAGS[i].y, PLAYER_COLORS[i]);
  }

  for (const powerup of match.powerups) drawPowerup(ctx, powerup, view.time);

  for (const ball of match.projectiles) {
    ctx.fillStyle = 'rgba(70, 100, 120, 0.25)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, ball.radius + 2, ball.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const player of match.players) {
    if (!fortShown(view, player.id)) continue;
    drawPenguin(ctx, player, view.time);
    if (player.charge > 0.18 && !player.eliminated && player.active) {
      drawArc(ctx, player);
    }
  }

  for (const ball of match.projectiles) {
    const lift = ball.z * 0.55;
    ctx.fillStyle = '#f8fcff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y - lift, ball.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 180, 200, 0.8)';
    ctx.stroke();
  }

  if (view.mode !== 'join') drawHud(ctx, match, view.pads);
  if (view.muted && view.mode !== 'join') {
    ctx.font = font(12);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8d3144';
    ctx.fillText('MUTE', WORLD_W - 16, 22);
  }
  if (match.phase === 'round_end' && view.mode === 'play') drawRoundBanner(ctx, match);
}

function fortShown(view, index) {
  if (view.mode === 'join' && view.slots && view.slots[index] === 'off') return false;
  const player = view.arena.players[index];
  if (!player.active && view.mode !== 'join') return false;
  return true;
}

function drawWall(ctx, wall, color) {
  if (wall.hp <= 0) {
    ctx.fillStyle = 'rgba(190, 206, 214, 0.35)';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    return;
  }
  const ratio = wall.hp / wall.maxHp;
  ctx.fillStyle = ratio > 0.66 ? '#f7fbfe' : ratio > 0.33 ? '#d5e3ea' : '#cbb8a4';
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(wall.x + 1.5, wall.y + 1.5, wall.w - 3, wall.h - 3);
  ctx.strokeStyle = 'rgba(90, 120, 140, 0.28)';
  ctx.lineWidth = 1;
  for (let x = wall.x + 16; x < wall.x + wall.w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, wall.y);
    ctx.lineTo(x, wall.y + wall.h);
    ctx.stroke();
  }
  for (let y = wall.y + 12; y < wall.y + wall.h; y += 12) {
    ctx.beginPath();
    ctx.moveTo(wall.x, y);
    ctx.lineTo(wall.x + wall.w, y);
    ctx.stroke();
  }
  if (ratio < 0.5) {
    ctx.strokeStyle = 'rgba(90, 70, 60, 0.45)';
    ctx.beginPath();
    ctx.moveTo(wall.x + 6, wall.y + wall.h * 0.3);
    ctx.lineTo(wall.x + wall.w * 0.5, wall.y + wall.h * 0.7);
    ctx.lineTo(wall.x + wall.w - 6, wall.y + 4);
    ctx.stroke();
  }
}

function drawFlag(ctx, x, y, color) {
  ctx.strokeStyle = '#6d5840';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 26);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x + 14, y - 20);
  ctx.lineTo(x, y - 14);
  ctx.fill();
}

function drawPowerup(ctx, powerup, time) {
  const bob = Math.sin(time * 3 + powerup.bob) * 3;
  const colors = {
    packed: '#f4fbff',
    swift: '#7dffe1',
    fortify: '#8dff7a',
    heavy: '#ffd27a',
    shield: '#9fd4ff',
  };
  const marks = { packed: '●', swift: '»', fortify: '+', heavy: 'H', shield: '○' };
  ctx.save();
  ctx.translate(powerup.x, powerup.y + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors[powerup.type] || '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#1b3a4a';
  ctx.font = font(12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(marks[powerup.type] || '?', 0, 1);
  ctx.restore();
}

function drawPenguin(ctx, player, time) {
  const color = PLAYER_COLORS[player.id];
  const eliminated = player.eliminated;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = 'rgba(30, 60, 80, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.swift > 0 && !eliminated) {
    ctx.strokeStyle = 'rgba(125, 255, 225, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-28, 4);
    ctx.moveTo(-16, 6);
    ctx.lineTo(-26, 10);
    ctx.stroke();
  }

  const bob = eliminated ? 2 : Math.sin(time * 6 + player.id * 1.3) * 1.1;
  ctx.translate(0, bob);

  ctx.fillStyle = eliminated ? '#b7c4c8' : '#ef9328';
  ctx.beginPath();
  ctx.ellipse(-6, 14, 5, 3, -0.3, 0, Math.PI * 2);
  ctx.ellipse(6, 14, 5, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = eliminated ? '#8ea0aa' : '#1b2833';
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = eliminated ? '#d5dee4' : '#f4f8fb';
  ctx.beginPath();
  ctx.ellipse(0, 6, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -4, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (eliminated) {
    ctx.strokeStyle = '#243038';
    ctx.lineWidth = 1.6;
    for (const ex of [-3.5, 3.5]) {
      ctx.beginPath();
      ctx.moveTo(ex - 2, -7);
      ctx.lineTo(ex + 2, -3);
      ctx.moveTo(ex + 2, -7);
      ctx.lineTo(ex - 2, -3);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#17212b';
    ctx.beginPath();
    ctx.arc(-3.4, -5, 1.7, 0, Math.PI * 2);
    ctx.arc(3.4, -5, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.rotate(player.facing);
  ctx.fillStyle = eliminated ? '#c8b49a' : '#ef9328';
  ctx.beginPath();
  ctx.moveTo(7, -2.2);
  ctx.lineTo(15, 0);
  ctx.lineTo(7, 2.2);
  ctx.fill();
  if (player.charge > 0.04 && !eliminated) {
    const radius = 3 + player.charge * 7;
    ctx.fillStyle = '#f7fbff';
    ctx.strokeStyle = 'rgba(120,160,180,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16 + radius, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (!eliminated) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 3, 11, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, 4);
    ctx.lineTo(11, 13);
    ctx.lineTo(7, 13);
    ctx.fill();
  }

  if (player.stun > 0) {
    ctx.fillStyle = '#ffe27a';
    const spin = time * 9 + player.id;
    for (let i = 0; i < 3; i++) {
      const ang = spin + i * 2.1;
      star(ctx, Math.cos(ang) * 18, Math.sin(ang) * 8 - 18, 3.2);
    }
  }
  if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(150, 214, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 2, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.heavy && !eliminated) {
    ctx.fillStyle = '#c4552a';
    ctx.font = font(10);
    ctx.textAlign = 'center';
    ctx.fillText('H', 0, -20);
  }
  ctx.restore();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const px = x + Math.cos(ang) * r;
    const py = y + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawArc(ctx, player) {
  const originX = player.x + Math.cos(player.facing) * (player.radius + 10);
  const originY = player.y + Math.sin(player.facing) * (player.radius + 10);
  const arc = integrateArc(originX, originY, player.facing, Math.max(player.charge, 0.3));
  ctx.fillStyle = PLAYER_COLORS[player.id];
  const points = arc.points;
  for (let i = 0; i < points.length; i += 4) {
    const point = points[i];
    ctx.globalAlpha = 0.35 + (i / points.length) * 0.65;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const land = arc.land;
  ctx.strokeStyle = PLAYER_COLORS[player.id];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(land.x, land.y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHud(ctx, match, pads) {
  const width = 132;
  const gap = 8;
  const total = 4 * width + 3 * gap;
  let x = (WORLD_W - total) / 2;
  for (let i = 0; i < 4; i++) {
    const player = match.players[i];
    rounded(ctx, x, 8, width, 40, 8);
    ctx.fillStyle = player.active ? 'rgba(8, 24, 36, 0.78)' : 'rgba(8, 24, 36, 0.35)';
    ctx.fill();
    ctx.fillStyle = PLAYER_COLORS[i];
    ctx.fillRect(x, 8, 6, 40);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(13);
    ctx.fillStyle = player.active ? '#f4fbff' : 'rgba(244,251,255,0.45)';
    const tag = !player.active ? 'OFF' : player.eliminated ? 'OUT' : player.kind === 'bot' ? 'BOT' : 'YOU';
    ctx.fillText(`${PLAYER_NAMES[i]}  ${tag}`, x + 12, 20);
    ctx.textAlign = 'right';
    ctx.font = font(16);
    ctx.fillText(String(player.score), x + width - 8, 20);
    for (let w = 0; w < 3; w++) {
      const wall = match.forts[i].walls[w];
      const ratio = player.active ? Math.max(0, wall.hp / wall.maxHp) : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 12 + w * 16, 32, 12, 6);
      ctx.fillStyle = PLAYER_COLORS[i];
      ctx.fillRect(x + 12 + w * 16, 32, 12 * ratio, 6);
    }
    if (pads && pads[i]) drawPad(ctx, x + width - 28, 30);
    x += width + gap;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(13, false);
  ctx.fillStyle = '#1d465c';
  ctx.fillText(`Round ${match.round}   ·   first to ${match.roundsToWin}`, WORLD_W / 2, 64);
}

function drawPad(ctx, x, y) {
  ctx.strokeStyle = '#d7f6ff';
  ctx.lineWidth = 1.4;
  rounded(ctx, x, y, 16, 10, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 5, y + 5, 1.6, 0, Math.PI * 2);
  ctx.moveTo(x + 11, y + 4);
  ctx.arc(x + 11, y + 4, 1.1, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRoundBanner(ctx, match) {
  const text = match.roundWinner == null
    ? 'Draw — forts fell together'
    : `${PLAYER_NAMES[match.roundWinner]} wins the round`;
  panel(ctx, 230, 220, 500, 90);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(28);
  ctx.fillText(text, WORLD_W / 2, 265);
}

function drawJoin(ctx, view) {
  panel(ctx, 70, 78, 820, 390);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(32);
  ctx.fillText('Choose your penguins', WORLD_W / 2, 118);
  ctx.font = font(15, false);
  ctx.fillStyle = '#d5ecf6';
  ctx.fillText('Action joins or takes a slot.  Secondary cycles open, bot, and off.', WORLD_W / 2, 150);

  for (let i = 0; i < 4; i++) {
    const x = 100 + i * 196;
    const slot = view.slots[i];
    rounded(ctx, x, 180, 180, 170, 14);
    ctx.fillStyle = slot === 'off' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = slot === 'off' ? 'rgba(255,255,255,0.2)' : PLAYER_COLORS[i];
    ctx.stroke();
    ctx.fillStyle = PLAYER_COLORS[i];
    ctx.font = font(22);
    ctx.fillText(PLAYER_NAMES[i], x + 90, 214);
    ctx.fillStyle = '#f4fbff';
    ctx.font = font(20);
    const status = slot === 'human' ? 'HUMAN' : slot === 'bot' ? 'BOT' : slot === 'off' ? 'OFF' : 'OPEN';
    ctx.fillText(status, x + 90, 252);
    ctx.font = font(13, false);
    ctx.fillStyle = '#d5ecf6';
    const binding = view.bindings[i];
    ctx.fillText(`${keyLabel(binding.action)} joins`, x + 90, 292);
    ctx.fillText(`${keyLabel(binding.secondary)} cycles`, x + 90, 314);
    if (view.pads && view.pads[i]) {
      ctx.fillText('pad connected', x + 90, 334);
    }
  }

  button(ctx, view.hits, 'start-match', WORLD_W / 2 - 110, 390, 220, 42, 'Start match', false);
  ctx.font = font(14, false);
  ctx.fillStyle = view.message ? '#ffe1a8' : '#d5ecf6';
  ctx.fillText(view.message || 'Enter or Start begins  ·  Esc returns to the title', WORLD_W / 2, 450);
}

function drawCountdown(ctx, view) {
  const value = view.countdown > 0 ? String(Math.ceil(view.countdown)) : 'GO';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(96);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(12, 36, 52, 0.45)';
  ctx.strokeText(value, WORLD_W / 2, WORLD_H / 2 + 10);
  ctx.fillStyle = '#f7fbff';
  ctx.fillText(value, WORLD_W / 2, WORLD_H / 2 + 10);
}

function drawMenu(ctx, view, title, labels, ids) {
  panel(ctx, 280, 120, 400, 300);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(32);
  ctx.fillText(title, WORLD_W / 2, 168);
  labels.forEach((label, index) => {
    button(ctx, view.hits, ids[index], 340, 210 + index * 58, 280, 46, label, view.menuIndex === index);
  });
}

function drawSettings(ctx, view) {
  panel(ctx, 250, 90, 460, 360);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(30);
  ctx.fillText('Settings', WORLD_W / 2, 132);
  const rows = [
    ['volume', `Volume    ${Math.round(view.settings.volume * 100)}%`],
    ['rounds', `Rounds to win    ${view.settings.roundsToWin}`],
    ['controls', 'Controls'],
    ['back', 'Back'],
  ];
  rows.forEach((row, index) => {
    button(ctx, view.hits, row[0], 310, 170 + index * 60, 340, 48, row[1], view.menuIndex === index);
  });
  ctx.font = font(13, false);
  ctx.fillStyle = '#d5ecf6';
  ctx.fillText('Left / right changes volume and rounds. Saved on this machine.', WORLD_W / 2, 424);
}

function drawControls(ctx, view) {
  panel(ctx, 70, 36, 820, 470);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(26);
  ctx.fillText('Controls', WORLD_W / 2, 68);
  ctx.font = font(13, false);
  ctx.fillStyle = '#d5ecf6';
  ctx.fillText(view.capture ? 'Press a key to bind  ·  Esc cancels' : 'Enter rebinds the highlighted key  ·  Esc goes back', WORLD_W / 2, 96);

  for (let i = 0; i < 4; i++) {
    ctx.font = font(14);
    ctx.fillStyle = PLAYER_COLORS[i];
    ctx.fillText(PLAYER_NAMES[i], 300 + i * 150, 128);
  }

  BIND_ACTIONS.forEach((action, row) => {
    ctx.font = font(14, false);
    ctx.fillStyle = '#f4fbff';
    ctx.textAlign = 'left';
    ctx.fillText(ACTION_LABELS[action], 96, 164 + row * 42);
    ctx.textAlign = 'center';
    for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      const capturing = view.capture && view.capture.player === col && view.capture.action === action;
      const label = capturing ? '…' : keyLabel(view.bindings[col][action]);
      button(ctx, view.hits, `bind:${index}`, 236 + col * 150, 144 + row * 42, 120, 32, label, view.menuIndex === index);
    }
  });
  button(ctx, view.hits, 'reset-binds', 330, 410, 300, 40, 'Reset defaults', view.menuIndex === 24);
  button(ctx, view.hits, 'back-controls', 330, 458, 300, 34, 'Back', false);
}

function drawMatch(ctx, view) {
  const match = view.arena;
  panel(ctx, 220, 70, 520, 400);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4fbff';
  ctx.font = font(32);
  const winner = match.matchWinner;
  ctx.fillText(winner == null ? 'Match over' : `${PLAYER_NAMES[winner]} wins the siege`, WORLD_W / 2, 118);
  const rows = match.players
    .filter((player) => player.active)
    .slice()
    .sort((a, b) => b.score - a.score || a.id - b.id);
  rows.forEach((player, index) => {
    const y = 170 + index * 42;
    ctx.font = font(20);
    ctx.fillStyle = PLAYER_COLORS[player.id];
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}.  ${PLAYER_NAMES[player.id]} ${player.kind === 'bot' ? 'bot' : ''}`.trim(), 280, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4fbff';
    ctx.fillText(`${player.score} wins`, 680, y);
  });
  button(ctx, view.hits, 'rematch', 300, 390, 160, 46, 'Rematch', view.menuIndex === 0);
  button(ctx, view.hits, 'title', 500, 390, 160, 46, 'Title', view.menuIndex === 1);
}

function drawParticles(ctx, particles) {
  if (!particles) return;
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
