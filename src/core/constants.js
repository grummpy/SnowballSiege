/** Fixed numbers for the snow-fort arena. Gameplay code imports these; nothing here touches the DOM. */

export const PLAYER_COUNT = 4;
export const WORLD_W = 960;
export const WORLD_H = 540;
export const DT = 1 / 60;

export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 170;
export const PACK_SLOW = 0.6;
export const REPAIR_SLOW = 0.42;
export const SWIFT_MULT = 1.5;
export const SWIFT_TIME = 4;
export const SHIELD_TIME = 3.2;
export const STUN_TIME = 0.7;

export const CHARGE_RATE = 1 / 0.8;
export const MIN_CHARGE = 0.3;

export const REPAIR_RANGE = 56;
export const REPAIR_PER_SEC = 14;
export const FORTIFY_HEAL = 28;

export const WALL_HP = 54;

export const THROW_SPEED_MIN = 160;
export const THROW_SPEED_MAX = 430;
export const THROW_VZ_MIN = 90;
export const THROW_VZ_MAX = 320;
export const THROW_Z0 = 18;
export const GRAVITY = 780;
export const WALL_HIT_Z = 32;
export const PLAYER_HIT_Z = 28;
export const SNOW_RADIUS = 7;
export const SPLASH_RADIUS = 28;

export const POWERUP_RADIUS = 14;
export const POWERUP_EVERY = 7;
export const POWERUP_FIRST = 2.5;
export const MAX_POWERUPS = 2;
export const POWERUP_TYPES = ['packed', 'swift', 'fortify', 'heavy', 'shield'];

export const ROUNDS_DEFAULT = 3;
export const BANNER_TIME = 2.6;

export const PLAYER_COLORS = ['#d64545', '#3a7bd5', '#e2b143', '#3caf62'];
export const PLAYER_NAMES = ['P1', 'P2', 'P3', 'P4'];

export const DEADZONE = 0.28;
