/**
 * Sprite tokens, the rules with no Foundry in them: a sheet is 8 walk frames across and 4 facings down, each frame
 * 96 by 112 pixels, drawn by our own code (docs/DECISIONS.md B2560). A token turns to the way it moves and steps
 * through the walk by the ground it covers.
 */
export const FRAME_W = 96;
export const FRAME_H = 112;
export const FRAMES = 8;
export const ROW = {up: 0, left: 1, down: 2, right: 3};
/** The frame a still figure shows: feet together seen from front or back, both feet down seen from the side. */
export const IDLE = {up: 0, down: 0, left: 2, right: 2};
/** Where the feet stand in a frame, as a share of its height. */
export const FEET = 103 / FRAME_H;
/** The token picture: twice the square, so a person stands a little over one square tall, with the feet low in it. */
export const TOKEN = {scaleX: 2, scaleY: 2, anchorX: 0.5, anchorY: 0.745, fit: "contain"};
export const SHEETS = {
  "kindred-elder-1888": "Kindred elder, 1888",
  "garou-homid": "Garou, Homid",
  "garou-crinos": "Garou, Crinos",
  "garou-lupus": "Garou, Lupus",
  "townsman-1888": "Townsman, 1888",
  "lady-1888": "Lady, 1888"
};
const FOLDER = "modules/wodx-paperdoll/sprites/proto";
export const sheetPath = name => `${FOLDER}/${name}.png`;
export const stillPath = name => `${FOLDER}/${name}-still.png`;

/** The facing for a move of (dx, dy), y growing downward. Near a diagonal the figure keeps the facing it had. */
export function facingOf(dx, dy, was = "down") {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if ( ax === 0 && ay === 0 ) return was;
  const side = dx > 0 ? "right" : "left", along = dy > 0 ? "down" : "up";
  if ( ax > ay * 1.2 ) return side;
  if ( ay > ax * 1.2 ) return along;
  return was === side || was === along ? was : (ax >= ay ? side : along);
}

/** A fresh walking state at a place. */
export const start = (pos, facing = "down") => ({x: pos.x, y: pos.y, facing, dist: 0, last: -Infinity, moving: false});

/**
 * One look at where the token is now. Returns the new state: facing, the ground covered, and whether it is walking.
 * A jump of three squares or more in one look is a placement, not a walk. A figure stands still again a moment
 * after the last movement.
 */
export function step(st, pos, grid, now, rest = 140) {
  const dx = pos.x - st.x, dy = pos.y - st.y, d = Math.hypot(dx, dy);
  if ( d >= grid * 3 ) return {...st, x: pos.x, y: pos.y, moving: false};
  if ( d > 0.01 ) return {x: pos.x, y: pos.y, facing: facingOf(dx, dy, st.facing), dist: st.dist + d, last: now, moving: true};
  return {...st, moving: st.moving && now - st.last < rest};
}

/** The frame to show: {row, col} on the sheet. One square of ground is one full walk cycle of two steps. */
export function frameOf(st, grid) {
  const row = ROW[st.facing] ?? ROW.down;
  if ( !st.moving ) return {row, col: IDLE[st.facing] ?? 0};
  return {row, col: Math.floor(st.dist / grid * FRAMES) % FRAMES};
}

/** The pixel box of a frame on its sheet. */
export const rectOf = ({row, col}) => ({x: col * FRAME_W, y: row * FRAME_H, width: FRAME_W, height: FRAME_H});
