export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function hypot(x, y) {
  return Math.hypot(x, y);
}

export function closestPointOnAabb(cx, cy, box) {
  return {
    x: clamp(cx, box.x, box.x + box.w),
    y: clamp(cy, box.y, box.y + box.h),
  };
}

export function circleIntersectsAabb(cx, cy, r, box) {
  const p = closestPointOnAabb(cx, cy, box);
  const dx = cx - p.x;
  const dy = cy - p.y;
  return dx * dx + dy * dy <= r * r;
}

/** Push a circle out of an AABB. Returns the resolved center. */
export function resolveCircleAabb(cx, cy, r, box) {
  const closest = closestPointOnAabb(cx, cy, box);
  let dx = cx - closest.x;
  let dy = cy - closest.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > r * r) return { x: cx, y: cy, hit: false };
  if (d2 < 1e-8) {
    const left = cx - box.x;
    const right = box.x + box.w - cx;
    const top = cy - box.y;
    const bottom = box.y + box.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: box.x - r, y: cy, hit: true };
    if (min === right) return { x: box.x + box.w + r, y: cy, hit: true };
    if (min === top) return { x: cx, y: box.y - r, hit: true };
    return { x: cx, y: box.y + box.h + r, hit: true };
  }
  const d = Math.sqrt(d2);
  const push = (r - d) / d;
  return { x: cx + dx * push, y: cy + dy * push, hit: true };
}

export function distPointToAabb(cx, cy, box) {
  const p = closestPointOnAabb(cx, cy, box);
  return Math.hypot(cx - p.x, cy - p.y);
}

export function wallCenter(wall) {
  return { x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 };
}
