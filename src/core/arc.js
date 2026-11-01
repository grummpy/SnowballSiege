import {
  DT,
  GRAVITY,
  THROW_SPEED_MIN,
  THROW_SPEED_MAX,
  THROW_VZ_MIN,
  THROW_VZ_MAX,
  THROW_Z0,
} from './constants.js';

export function throwKinematics(charge) {
  const c = clamp01(charge);
  return {
    speed: THROW_SPEED_MIN + c * (THROW_SPEED_MAX - THROW_SPEED_MIN),
    vz: THROW_VZ_MIN + c * (THROW_VZ_MAX - THROW_VZ_MIN),
    z0: THROW_Z0,
  };
}

/** Flat hits are light; a full pack hits hard. Heavy snow doubles it. */
export function throwDamage(charge, heavy) {
  const c = clamp01(charge);
  const damage = 16 + c * 26;
  return heavy ? damage * 2 : damage;
}

/**
 * Integrate a lob with the same stepper the match uses, so the aiming
 * preview lands where the snowball lands.
 */
export function integrateArc(x, y, angle, charge) {
  const { speed, vz, z0 } = throwKinematics(charge);
  let px = x;
  let py = y;
  let pz = z0;
  let pvz = vz;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const points = [{ x: px, y: py, z: pz }];
  for (let i = 0; i < 300 && pz > 0; i++) {
    px += vx * DT;
    py += vy * DT;
    pz = pz + pvz * DT - 0.5 * GRAVITY * DT * DT;
    pvz -= GRAVITY * DT;
    points.push({ x: px, y: py, z: Math.max(0, pz) });
  }
  return { points, vx, vy, vz, z0, land: { x: px, y: py } };
}

export function throwRange(charge) {
  return integrateArc(0, 0, 0, charge).land.x;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
