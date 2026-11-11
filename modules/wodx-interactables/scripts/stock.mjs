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

/** Every container due a draw, on every scene. */
export async function restockAll(now = game.time.worldTime) {
  if ( !isActiveGM() ) return 0;
  try { if ( chron()?.isSkipping?.() ) return 0; } catch (e) { /* no Chronicle */ }
  let n = 0;
  for ( const scene of game.scenes ?? [] ) {
    for ( const tile of scene.tiles ?? [] ) {
      const f = tile.flags?.[MOD];
      if ( !f?.container || !f.restock || !f.stock ) continue;
      if ( !R.restockDue(f.restock, Number(f.stockedAt) || 0, now) ) continue;
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
