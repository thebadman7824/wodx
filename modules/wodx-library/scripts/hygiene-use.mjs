/**
 * WoDX Library: the Foundry side of washing, grooming and cosmetics (B3909; rules in hygiene-rules.mjs).
 */
import * as H from "./hygiene-rules.mjs";
import {registerCondition} from "../../wodx-chronicle/scripts/conditions.mjs";

const MOD = "wodx-library";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const conds = () => game.modules.get("wodx-chronicle")?.api?.conditions ?? null;
const marksOf = actor => H.MARKS.filter(m => !!conds()?.hasCondition?.(actor, m));

/** Wash or groom with a thing. */
export async function wash(actor, item) {
  const res = H.washResult(item.name, marksOf(actor));
  for ( const m of res.clears ) await conds()?.setCondition?.(actor, m, false);
  if ( res.groomed ) await actor.setFlag(MOD, "groomed", H.nightOf(game.time?.worldTime));
  if ( H.isCleaner(item.name) ) await actor.setFlag(MOD, "washed", H.nightOf(game.time?.worldTime));
  const content = `<div class="wodx-card wlib-use-card"><p><b>${esc(actor.name)} uses ${esc(item.name)}</b></p><p>${esc(res.line)}</p></div>`;
  await ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor})});
  return res;
}

/** The marks as token statuses, and Bloody marked by a new lethal or aggravated wound. */
export function setupHygiene() {
  try {
    registerCondition({id: "filthy", name: "Filthy", img: "icons/svg/degen.svg", source: "WoDX house rule (B3909)",
      summary: "Mud, grime or worse on them: anyone of standing meets them a step colder until they wash (+1 difficulty on social rolls, B6029).", mods: {socialDiff: 1}});
    registerCondition({id: "bloody", name: "Bloody", img: "icons/svg/blood.svg", source: "WoDX house rule (B3909)",
      summary: "Blood on them: a mortal meets them a step colder, and the town remembers it, until they wash (+1 difficulty on social rolls, B6029).", mods: {socialDiff: 1}});
  } catch (e) { console.warn("WoDX Library | could not register Filthy and Bloody", e); }
  Hooks.on("preUpdateActor", (actor, change, opts) => {
    const d = change?.system?.health?.damage;
    if ( d && H.newWound(actor.system?.health?.damage ?? {}, d) ) opts.wodxBloody = true;
  });
  Hooks.on("updateActor", (actor, change, opts, userId) => {
    if ( !opts?.wodxBloody || userId !== game.user.id ) return;
    if ( /^(wraith|spirit|group|creature)$/i.test(String(actor.type ?? "")) ) return;
    if ( conds()?.hasCondition?.(actor, "bloody") ) return;
    conds()?.setCondition?.(actor, "bloody", true);
  });
  // B6033: Filthy is put on in play, not only by hand: a fall in the wet outdoors, or a week unwashed (living bodies only)
  Hooks.on("createActiveEffect", (effect, opts, userId) => {
    if ( userId !== game.user.id || !effect.statuses?.has?.("wodx-knockdown") ) return;
    const actor = effect.parent;
    if ( !actor || conds()?.hasCondition?.(actor, "filthy") || /^(wraith|spirit|group)$/i.test(String(actor.type ?? "")) ) return;
    let tags = [], outdoor = true;
    try { const W = game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere").api?.weather : null; tags = W?.now?.()?.tags ?? []; outdoor = W?.isOutdoor?.(canvas?.scene) !== false; } catch (e) { tags = []; }
    if ( H.fallDirties(tags, outdoor) ) conds()?.setCondition?.(actor, "filthy", true)?.catch?.(() => null);
  });
  Hooks.on("updateWorldTime", worldTime => {
    const gm = game.users?.activeGM;
    if ( !game.user.isGM || (gm && gm.id !== game.user.id) ) return;
    // Checked on every move of the clock (a few player characters, two flag reads each), so a skip or a short wait both count
    const night = H.nightOf(worldTime);
    for ( const a of game.actors ?? [] ) {
      if ( !a.hasPlayerOwner || conds()?.hasCondition?.(a, "filthy") ) continue;
      const washed = a.getFlag(MOD, "washed");
      if ( washed === undefined || washed === null ) { a.setFlag(MOD, "washed", night).catch(() => null); continue; }
      const living = !/vampire|kindred|wraith|mummy|spirit/i.test(`${a.type} ${a.system?.kind ?? ""}`);
      if ( H.unwashedTooLong(washed, worldTime, living) ) conds()?.setCondition?.(a, "filthy", true)?.catch?.(() => null);
    }
  });
}
