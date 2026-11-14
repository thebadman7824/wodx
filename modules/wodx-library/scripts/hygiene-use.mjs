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
  const content = `<div class="wodx-card wlib-use-card"><p><b>${esc(actor.name)} uses ${esc(item.name)}</b></p><p>${esc(res.line)}</p></div>`;
  await ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor})});
  return res;
}

/** The marks as token statuses, and Bloody marked by a new lethal or aggravated wound. */
export function setupHygiene() {
  try {
    registerCondition({id: "filthy", name: "Filthy", img: "icons/svg/degen.svg", source: "WoDX house rule (B3909)",
      summary: "Mud, grime or worse on them: anyone of standing meets them a step colder until they wash.", mods: {}});
    registerCondition({id: "bloody", name: "Bloody", img: "icons/svg/blood.svg", source: "WoDX house rule (B3909)",
      summary: "Blood on them: a mortal meets them a step colder, and the town remembers it, until they wash.", mods: {}});
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
}
