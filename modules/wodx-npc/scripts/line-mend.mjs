/**
 * WoDX NPC: an NPC of any line mends with its own power after a fight or when carried home (B6315). The Foundry side
 * of aftercare-rules lineMend, shared by aftercare.mjs and carry-aftercare.mjs.
 */
import * as AC from "./aftercare-rules.mjs";
import * as LR from "./lines-rules.mjs";

const linesApi = () => { try { return game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api?.lines ?? null : null; } catch (e) { return null; } };
/** The all-lines key of an actor (or a token's actor: its base sheet). */
export const keyOf = a => LR.lineKey(a?.isToken ? (a.baseActor ?? a) : a, linesApi());

/** The pool each line mends with, as [path, value] pairs to spend from in order (Yang Chi before Yin). */
export function mendPools(a, line) {
  const adv = a?.system?.advantages ?? {}, v = x => Number(x?.temporary) || 0;
  if ( line === "vampire" || line === "ghoul" ) return [["system.advantages.bloodpool.temporary", v(adv.bloodpool)]];
  if ( line === "kuei-jin" ) return [["system.advantages.yangchi.temporary", v(adv.yangchi)], ["system.advantages.yinchi.temporary", v(adv.yinchi)]];
  if ( line === "wraith" ) return [["system.advantages.pathos.temporary", v(adv.pathos)]];
  if ( line === "demon" ) return [["system.advantages.faith.temporary", v(adv.faith)]];
  return [];
}
export const MEND_COLOUR = {blood: "#c0182a", Chi: "#d8b25a", Pathos: "#9fb7d6", Faith: "#f2e6a0"};

/** A word over the actor's tokens for every client (WoDX Actions' float socket, as day sleep uses). */
export function floatOver(a, word, color = "#ffffff") {
  const tokens = (a?.getActiveTokens?.() ?? []).map(t => t.id ?? t.document?.id).filter(Boolean);
  if ( !tokens.length || !word ) return;
  try {
    if ( globalThis.canvas?.ready && canvas.interface?.createScrollingText ) for ( const id of tokens ) {
      const t = canvas.tokens?.get?.(id);
      if ( t?.center ) canvas.interface.createScrollingText(t.center, word, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, direction: CONST.TEXT_ANCHOR_POINTS?.TOP,
        distance: canvas.grid?.size ?? 100, fontSize: 26, fill: color, stroke: 0x000000, strokeThickness: 4, duration: 2600});
    }
    if ( game.modules.get("wodx-actions")?.active ) game.socket?.emit?.("module.wodx-actions", {action: "float", tokens, word, color});
  } catch (e) { /* no canvas */ }
}

/**
 * Spend the line's own pool on its wounds. damage: {bashing, lethal, aggravated}; heal(actor, type, levels) removes
 * damage (WoDX Combat healDamage). Returns {spent, healed, what} (spent 0 when nothing was done).
 */
export async function mendOwn(a, {damage = {}, heal = async () => null, line = null} = {}) {
  const key = line ?? keyOf(a);
  const pools = mendPools(a, key);
  if ( !pools.length ) return {spent: 0, healed: 0, what: null};
  const h = AC.lineMend(key, damage, pools.reduce((s, [, v]) => s + v, 0));
  if ( !h?.spent ) return {spent: 0, healed: 0, what: h?.what ?? null};
  for ( const type of ["bashing", "lethal", "aggravated"] ) if ( h[type] ) await heal(a, type, h[type]);
  let left = h.spent;
  const upd = {};
  for ( const [path, v] of pools ) { const take = Math.min(v, left); if ( take ) upd[path] = v - take; left -= take; }
  await a.update(upd);
  const healed = h.bashing + h.lethal + h.aggravated;
  floatOver(a, `+${healed} ${healed === 1 ? "wound" : "wounds"} (${h.what})`, MEND_COLOUR[h.what] ?? "#ffffff");
  return {spent: h.spent, healed, what: h.what};
}
