/**
 * Teleport to the cursor: where each chosen token lands. No Foundry in here.
 *
 * One token lands with its centre on the point. Several keep their places around one another: the middle of the group
 * goes to the point and each token keeps its offset from that middle. A token never lands outside the scene.
 */
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The middle of a group of tokens, each {x, y, w, h} in pixels (x and y the top left corner). */
export function middleOf(tokens) {
  const list = tokens ?? [];
  if ( !list.length ) return null;
  const sum = list.reduce((s, t) => ({x: s.x + num(t.x) + num(t.w) / 2, y: s.y + num(t.y) + num(t.h) / 2}), {x: 0, y: 0});
  return {x: sum.x / list.length, y: sum.y / list.length};
}

/** Keep a token's top left corner inside a rectangle {x, y, width, height}; no rectangle leaves it alone. */
export function keepInside(pos, w, h, rect) {
  if ( !rect ) return pos;
  const maxX = num(rect.x) + Math.max(0, num(rect.width) - num(w));
  const maxY = num(rect.y) + Math.max(0, num(rect.height) - num(h));
  return {x: Math.min(Math.max(pos.x, num(rect.x)), maxX), y: Math.min(Math.max(pos.y, num(rect.y)), maxY)};
}

/**
 * Where each token lands: [{id, x, y}] with x and y the new top left corner, rounded to whole pixels.
 * tokens: [{id, x, y, w, h}]; point: {x, y}; rect: the scene's playable area, or null.
 */
export function landing(tokens, point, rect = null) {
  const mid = middleOf(tokens);
  if ( !mid || !point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y)) ) return [];
  const dx = num(point.x) - mid.x, dy = num(point.y) - mid.y;
  return tokens.map(t => {
    const p = keepInside({x: num(t.x) + dx, y: num(t.y) + dy}, t.w, t.h, rect);
    return {id: t.id, x: Math.round(p.x), y: Math.round(p.y)};
  });
}
