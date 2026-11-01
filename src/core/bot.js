import { MIN_CHARGE } from './constants.js';
import { throwRange } from './arc.js';
import { distPointToAabb, wallCenter } from './geom.js';

const IDLE = { moveX: 0, moveY: 0, action: false, secondary: false };

function steer(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1;
  return { moveX: dx / l, moveY: dy / l };
}

function worstWall(fort) {
  let worst = null;
  for (const wall of fort.walls) {
    if (wall.hp >= wall.maxHp) continue;
    if (!worst || wall.hp < worst.hp) worst = wall;
  }
  return worst;
}

function nearestHostile(state, index) {
  const me = state.players[index];
  let best = null;
  let bestD = Infinity;
  for (const other of state.players) {
    if (!other.active || other.eliminated || other.id === index) continue;
    const d = Math.hypot(other.x - me.x, other.y - me.y);
    if (d < bestD) {
      bestD = d;
      best = { x: other.x, y: other.y };
    }
  }
  for (let i = 0; i < state.players.length; i++) {
    const other = state.players[i];
    if (!other.active || other.eliminated || i === index) continue;
    for (const wall of state.forts[i].walls) {
      if (wall.hp <= 0) continue;
      const c = wallCenter(wall);
      const d = Math.hypot(c.x - me.x, c.y - me.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
  }
  return best;
}

/**
 * Simple siege brain: patch a crumbling wall, otherwise pack snow and lob
 * when the arc is long enough to reach the nearest foe or enemy wall.
 */
export function decideBot(state, index) {
  const player = state.players[index];
  if (!player || !player.active || player.eliminated || player.stun > 0) return { ...IDLE };

  const damaged = worstWall(state.forts[index]);
  if (damaged && damaged.hp < damaged.maxHp * 0.5) {
    const gap = distPointToAabb(player.x, player.y, damaged);
    if (gap > 22) return { ...steer(player, wallCenter(damaged)), action: false, secondary: false };
    return { moveX: 0, moveY: 0, action: false, secondary: true };
  }

  const target = nearestHostile(state, index);
  if (!target) return { ...IDLE };
  const d = Math.hypot(target.x - player.x, target.y - player.y);
  const range = throwRange(Math.max(player.charge, 0.001));
  const move = steer(player, target);
  if (player.charge >= MIN_CHARGE && range + 24 >= d) {
    return { ...move, action: false, secondary: false };
  }
  return { ...move, action: true, secondary: false };
}
