/**
 * B6923: listeners for this module's trap, hazard and stock hooks (wodxInteractablesTrap, wodxInteractablesHazard,
 * wodxStockDrawn), which used to fire with no one listening. The rules are in hook-rules.mjs. They run on the active
 * Storyteller's client, where the hooks fire:
 *   - a trap or hazard floats a word over the token ("Snared!", "Burning!");
 *   - a snare that catches someone, or a live wire that holds them, marks the token Held (WoDX Chronicle's condition)
 *     until the tile lets them go (broken free, cut loose, the power cut, the trap reset);
 *   - stock draws, gathered over a moment so a dawn's restocking makes one card, whisper the Storyteller a card naming
 *     each container and what came in.
 */
import * as H from "../../wodx-rules/interactables/hook-rules.mjs";

const MOD = "wodx-interactables";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => !!game.user?.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

function float(tokDoc, text, fill = "#ff9040") {
  try {
    const t = tokDoc?.object;
    if ( t && canvas.scene?.id === tokDoc.parent?.id ) canvas.interface?.createScrollingText?.(t.center, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fontSize: 26, fill, stroke: 0x000000, strokeThickness: 4, duration: 3000});
  } catch (e) { /* no canvas */ }
}

/** Mark the actor Held by this tile (Chronicle's condition), remembering which tile, so the release can lift it. */
async function hold(actor, tile) {
  const C = chron()?.conditions;
  if ( !actor || !C?.setCondition ) return false;
  await actor.setFlag(MOD, "heldBy", tile.uuid);
  if ( !C.hasCondition?.(actor, "held") ) await C.setCondition(actor, "held", true);
  return true;
}
/** A tile changed: anyone it marked Held and no longer holds goes free. */
async function release(tile) {
  const C = chron()?.conditions;
  if ( !C?.setCondition ) return;
  // A token not linked to its actor keeps its own copy, so the scene's tokens are looked at as well as the world's actors
  const actors = new Set([...(game.actors ?? []), ...[...(tile.parent?.tokens ?? [])].map(t => t.actor).filter(Boolean)]);
  for ( const actor of actors ) {
    if ( actor.getFlag?.(MOD, "heldBy") !== tile.uuid ) continue;
    if ( H.holdsNow(tile.flags?.[MOD] ?? {}, actor.id) ) continue;
    await actor.unsetFlag(MOD, "heldBy");
    if ( C.hasCondition?.(actor, "held") ) await C.setCondition(actor, "held", false);
  }
}

const drawn = [];
let stockTimer = null;
async function stockCardNow() {
  const card = H.stockCard(drawn.splice(0));
  if ( !card ) return null;
  const rows = card.rows.map(r => `<li><b>${esc(r.where)}</b>: ${esc(r.what)}</li>`).join("");
  return ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX Interactables"}, flags: {[MOD]: {stockCard: card.rows.length}},
    content: `<div class="wodx-card"><h3>${esc(card.title)}</h3><ul>${rows}</ul></div>`});
}

export function setupHookListeners() {
  Hooks.on("wodxInteractablesTrap", async ({tile, token, kind, caught, dice} = {}) => {
    if ( !isActiveGM() ) return;
    try {
      const tokDoc = await fromUuid(token), scene = tokDoc?.parent, doc = scene?.tiles?.get?.(tile);
      float(tokDoc, H.trapWord({kind, caught, dice}));
      if ( caught && doc && tokDoc?.actor ) await hold(tokDoc.actor, doc);
    } catch (e) { console.warn(`${MOD} | trap listener`, e); }
  });
  Hooks.on("wodxInteractablesHazard", async ({tile, token, kind} = {}) => {
    if ( !isActiveGM() ) return;
    try {
      const tokDoc = await fromUuid(token), scene = tokDoc?.parent, doc = scene?.tiles?.get?.(tile);
      float(tokDoc, H.hazardWord({kind}), "#ff6060");
      if ( doc && tokDoc?.actor && H.hazardHolds(kind, doc.flags?.[MOD] ?? {}, tokDoc.actor.id) ) await hold(tokDoc.actor, doc);
    } catch (e) { console.warn(`${MOD} | hazard listener`, e); }
  });
  Hooks.on("wodxStockDrawn", (tile, fresh) => {
    if ( !isActiveGM() ) return;
    const f = tile?.flags?.[MOD] ?? {};
    drawn.push({title: f.title || f.name || "", scene: tile?.parent?.navName || tile?.parent?.name || "", lines: [...(fresh ?? [])]});
    clearTimeout(stockTimer);
    stockTimer = setTimeout(() => { stockCardNow().catch(e => console.warn(`${MOD} | stock card`, e)); }, 1500);
  });
  Hooks.on("updateTile", (doc, changes) => {
    if ( !isActiveGM() || !foundry.utils.hasProperty(changes ?? {}, `flags.${MOD}`) ) return;
    release(doc).catch(e => console.warn(`${MOD} | release`, e));
  });
}
