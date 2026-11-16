/**
 * WoDX Sheets (B6175): a roll from the system's own sheet counts what WoDX puts on the character.
 *
 * Clicking an Attribute or an Ability on a sheet opens the system's general roll window (DialogGeneralRoll), which
 * knows nothing of WoDX. Its Roll button is wrapped here: just before the system builds the roll, the WoDX parts
 * (merits and flaws, derangement bouts, drink and drugs, wards and every other Chronicle roll effect; the powers on
 * the character; the conditions that make the bearer's own actions harder) go on the window's bonus dice and
 * difficulty, and the card gets a line naming each part. The window's own fields are put back afterwards, so the
 * system's window keeps working as it ships and the parts are never counted twice. WoDX Actions' own roll windows
 * never open this window, so a roll made there is not touched.
 *
 * World setting wodx-sheets.sheetRollMods (on by default) turns it off.
 */
import { DialogGeneralRoll } from "../../../systems/worldofdarkness/module/dialogs/dialog-generalroll.js";
import * as RR from "./sheet-roll-rules.mjs";

const MOD = "wodx-sheets";
const api = id => (game.modules.get(id)?.active ? game.modules.get(id).api : null);
const on = () => { try { return game.settings.get(MOD, "sheetRollMods") !== false; } catch (e) { return true; } };
const traitRollsOn = () => { try { return game.settings.get("wodx-actions", "traitRolls") !== false; } catch (e) { return true; } };
const PHYSICAL = ["strength", "dexterity", "stamina", "athletics", "brawl", "melee", "dodge"];

/** The Ability's key as the trait table names it (athletics), from what the system window holds. */
function abilityKeyOf(actor, key) {
  if ( !key || key === "noselected" ) return null;
  if ( actor.system?.abilities?.[key] && typeof actor.system.abilities[key] === "object" ) return key;
  const item = actor.items?.get?.(key) ?? actor.api?.getAbility?.(key) ?? null;
  if ( item ) return item.system?.id || String(item.name ?? "").toLowerCase();
  return String(key).toLowerCase();
}

/** The WoDX modifiers for one roll of the system window: {dice, diff, parts, once}. */
export function modsFor(actor, roll = {}) {
  const T = api("wodx-chronicle")?.traits;
  const attrKey = roll.attributeKey && roll.attributeKey !== "noselected" ? roll.attributeKey : null;
  const abKey = abilityKeyOf(actor, roll.abilityKey);
  const tags = T?.rules?.rollTags ? T.rules.rollTags(attrKey, abKey) : [attrKey, abKey].filter(Boolean);
  let traits = null, powers = null, conditions = [];
  if ( T && tags.length && traitRollsOn() ) {
    try { traits = T.rules.sumEffects(T.effects(actor, {channel: "roll", tags, against: null, moon: ""})); }
    catch (e) { console.warn("WoDX Sheets | roll effects", e); }
  }
  try {
    const pm = game.wodxActions?.powerMods?.of;
    if ( pm && tags.length ) powers = pm(actor, {tags: [...tags, ...(tags.some(t => PHYSICAL.includes(t)) ? ["physical"] : [])], frenzy: false });
  } catch (e) { console.warn("WoDX Sheets | power effects", e); }
  try { conditions = api("wodx-chronicle")?.conditions?.conditionsOf?.(actor) ?? []; } catch (e) { conditions = []; }
  const sum = RR.combine({traits, powers, conditions, sight: attrKey === "perception"});
  return {...sum, once: powers?.once ?? [], tags};
}

/** The card the system is about to post for this actor gets the line and the numbers (flags.wodx-sheets.rollMods). */
function markNextCard(actor, mods, applied) {
  const line = RR.cardLine(mods);
  let id = null;
  const off = () => { if ( id !== null ) { Hooks.off("preCreateChatMessage", id); id = null; } };
  id = Hooks.on("preCreateChatMessage", (msg, data) => {
    const speaker = data?.speaker?.actor ?? msg.speaker?.actor;
    if ( speaker !== actor.id || data?.flags?.[MOD]?.rollMods ) return;
    off();
    const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
    msg.updateSource({content: `${msg.content ?? ""}<div class="wodx-sheet-rollmods"><small>${esc(line)}${applied.capped ? " (difficulty held at 10)" : ""}</small></div>`,
      [`flags.${MOD}.rollMods`]: {dice: mods.dice, diff: mods.diff, parts: mods.parts, difficulty: applied.difficulty, bonus: applied.bonus}});
  });
  setTimeout(off, 15000);
}

function wrap() {
  const proto = DialogGeneralRoll?.prototype;
  if ( !proto?._generalRoll || proto._generalRoll.wodx ) return;
  const original = proto._generalRoll;
  const wrapped = function (event) {
    const o = this.object;
    if ( !on() || !this.actor || !o || o.close || o.type === "dice" || !(Number(o.difficulty) > -1) || o.wodxApplied ) return original.call(this, event);
    let mods;
    try { mods = modsFor(this.actor, o); } catch (e) { console.warn("WoDX Sheets | sheet roll", e); return original.call(this, event); }
    if ( !mods.dice && !mods.diff && !mods.parts.length ) return original.call(this, event);
    const keep = {bonus: o.bonus, difficulty: o.difficulty};
    const applied = RR.applyTo(keep, mods, Number(CONFIG.worldofdarkness?.lowestDifficulty) || 2);
    markNextCard(this.actor, mods, applied);
    o.bonus = applied.bonus; o.difficulty = applied.difficulty; o.wodxApplied = true;
    try { return original.call(this, event); }
    finally {
      // the system read the numbers when it built the roll: the window's own fields go back as the player left them
      o.bonus = keep.bonus; o.difficulty = keep.difficulty; o.wodxApplied = false;
      if ( mods.once?.length ) game.wodxActions?.powerMods?.spend?.(this.actor, mods.once)?.catch?.(() => {});
    }
  };
  wrapped.wodx = true;
  proto._generalRoll = wrapped;
}

export function setup() {
  game.settings.register(MOD, "sheetRollMods", {
    name: "WoDX on the sheet's own rolls",
    hint: "Clicking an Attribute or Ability on a sheet rolls with the merits and flaws, derangements, drink and drugs, powers and conditions WoDX Actions' rolls count, and the card names each one.",
    scope: "world", config: true, type: Boolean, default: true
  });
  wrap();
}
