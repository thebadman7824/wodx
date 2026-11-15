import * as R from "./interact-rules.mjs";

/**
 * WoDX Interactables 0.23.0: stock lists on the clock. A container with a stock list and "Draw the stock" set is drawn
 * again when its time comes: what the last draw left inside is taken away and a fresh draw goes in. A line that starts
 * with "when" is limited by WoDX Chronicle's "Only when" tests about the world (no character is in play). The active
 * Storyteller's client does it, once the clock settles, never in the middle of a time skip.
 */
const MOD = "wodx-interactables";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => !!game.user?.isGM && game.users.activeGM?.id === game.user.id;

/** Draw one container's stock now. Returns the new "Inside" lines, or null. */
export async function drawStock(tile, {now = game.time.worldTime} = {}) {
  const f = tile?.flags?.[MOD] ?? {};
  const {lines, problems} = R.parseStock(f.stock);
  if ( !lines.length ) return null;
  const W = chron()?.when;
  const passes = when => (W?.check ? W.check(when, {scene: tile.parent}).ok : false);
  const fresh = R.rollStock(lines, {passes});
  // 0.24.1: another module (WoDX Storyteller's markets) may thin or fill the draw in place, by the market's supply
  Hooks.callAll("wodxStockFilter", tile, fresh);
  const items = R.restockLines(f.items, f.stockDrawn ?? [], fresh);
  await tile.update({[`flags.${MOD}.items`]: items.join("\n"), [`flags.${MOD}.stockDrawn`]: fresh, [`flags.${MOD}.stockedAt`]: now});
  Hooks.callAll("wodxStockDrawn", tile, fresh);
  if ( problems.length ) console.warn(`${MOD} | stock list on ${tile.parent?.name}: ${problems.join(" ")}`);
  return items;
}

/** WoDX NPC's place kinds where a tile sits: the regions round it, the smallest first, then the scene's. */
function placeKinds(tile) {
  const scene = tile?.parent, NPC = "wodx-npc";
  const c = {x: (Number(tile?.x) || 0) + (Number(tile?.width) || 0) / 2, y: (Number(tile?.y) || 0) + (Number(tile?.height) || 0) / 2};
  const el = r => { const e = r?.elevation?.bottom; return Number.isFinite(e) ? e : 0; };
  const inside = r => { try { return !!r.testPoint({x: c.x, y: c.y, elevation: el(r)}, el(r)); } catch (e) { return false; } };
  const area = r => (r?.shapes ?? []).reduce((n, sh) => n + (Number(sh.width) || Number(sh.radiusX) * 2 || 1) * (Number(sh.height) || Number(sh.radiusY) * 2 || 1), 0) || Infinity;
  const regions = [...(scene?.regions?.contents ?? [])].filter(r => r.flags?.[NPC]?.place?.kind && inside(r)).sort((a, b) => area(a) - area(b));
  return [...regions.map(r => r.flags[NPC].place.kind), scene?.flags?.[NPC]?.place?.kind].filter(Boolean);
}
/** Every container due a draw, on every scene. */
export async function restockAll(now = game.time.worldTime) {
  if ( !isActiveGM() ) return 0;
  try { if ( chron()?.isSkipping?.() ) return 0; } catch (e) { /* no Chronicle */ }
  let n = 0;
  for ( const scene of game.scenes ?? [] ) {
    for ( const tile of scene.tiles ?? [] ) {
      const f = tile.flags?.[MOD];
      if ( !f?.container || !f.stock ) continue;
      const every = R.restockFor(f, {title: f.title ?? f.name ?? "", kinds: placeKinds(tile)});
      if ( !every || !R.restockDue(every, Number(f.stockedAt) || 0, now) ) continue;
      try { if ( await drawStock(tile, {now}) ) n += 1; } catch (e) { console.error(`${MOD} | stock`, e); }
    }
  }
  return n;
}

let timer = null;
export function setupStock() {
  // Wait for the clock to settle: a run of small changes (a turn, a walk) draws once
  Hooks.on("updateWorldTime", () => {
    if ( !isActiveGM() ) return;
    clearTimeout(timer);
    timer = setTimeout(() => restockAll().catch(e => console.error(`${MOD} | stock`, e)), 1500);
  });
  Hooks.on("wodxSkipEnd", () => restockAll().catch(e => console.error(`${MOD} | stock`, e)));
}
