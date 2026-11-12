import {findClan, clanDisciplines, generationRow, ghoulDisciplineCap, ghoulCanLearn, xpCost, traitMax, KINDS} from "./rules.mjs";
import {XP} from "../data/vampire.mjs";

export const MODULE_ID = "wodx-creation";
export const DISCIPLINE = "wod.types.discipline";
const SECOND_ABILITY = /^wod\.types\.(talent|skill|knowledge)secondability$/;

export const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const loc = key => (typeof key === "string" && key.startsWith("wod.") ? (game.i18n?.localize?.(key) ?? key) : key);
const items = actor => [...(actor?.items ?? [])];

/* -------------------------------------------- */
/*  What an actor is                            */
/* -------------------------------------------- */

/** "vampire", "ghoul", "mortal", or null for lines WoDX Creation does not handle yet. */
/**
 * A change of state (the Embrace, the First Change, the Awakening...) drops the old sheet's Creation flags, but the
 * lifepath goes with the character: it is the life before. So do the steps before the first night. src: the old actor's data; flags: the new actor's flags.
 */
export function keepLifepath(flags, src) {
  const lp = src?.flags?.[MODULE_ID]?.lifepath;
  if ( lp ) flags[MODULE_ID] = {...(flags[MODULE_ID] ?? {}), lifepath: lp};
  // Before the First Night's steps go with the character too (Creation 0.12.0)
  const fn = src?.flags?.[MODULE_ID]?.firstNight;
  if ( fn ) flags[MODULE_ID] = {...(flags[MODULE_ID] ?? {}), firstNight: fn};
  return flags;
}

export function lineOf(actor) {
  const types = CONFIG.worldofdarkness?.sheettype ?? {};
  if ( actor?.type === (types.vampire ?? "Vampire") ) return "vampire";
  if ( actor?.type === (types.mortal ?? "Mortal") ) return actor.system?.settings?.variant === "ghoul" ? "ghoul" : "mortal";
  return null;
}

export function lineage(actor) {
  return foundry.utils.deepClone(actor?.getFlag?.(MODULE_ID, "lineage") ?? {});
}

export function chronology(actor) {
  return foundry.utils.deepClone(actor?.getFlag?.(MODULE_ID, "chronology") ?? {});
}

/** Generation after the Generation background's change, as upstream computes it. */
export function generationOf(actor) {
  const g = Number(actor?.system?.generation);
  if ( !Number.isFinite(g) ) return null;
  return g - (Number(actor.system.generationmod) || 0);
}

export function clanNameOf(actor) {
  const s = actor?.system ?? {};
  if ( s.clan === "custom" ) return s.custom?.clan || "";
  return loc(s.clan ?? "") || "";
}

export function clanOf(actor) {
  return findClan(clanNameOf(actor));
}

export function disciplinesOf(actor) {
  return items(actor).filter(i => i.type === "Power" && i.system?.type === DISCIPLINE)
    .map(i => ({id: i.id, name: i.name, value: Number(i.system.value) || 0}));
}

/** The domitor of a ghoul, from its lineage. */
export function domitorOf(actor) {
  const id = lineage(actor).domitor?.id;
  return id ? game.actors?.get(id) ?? null : null;
}

export function sireOf(actor) {
  const id = lineage(actor).sire?.id;
  return id ? game.actors?.get(id) ?? null : null;
}

/** The upstream ability set the era in force uses for vampires. */
export function vampireEra() {
  return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.system?.vampire ?? "darkages";
}

export function eraProfile() {
  return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile ?? null;
}

/* -------------------------------------------- */
/*  Allies: NPCs a player may improve           */
/* -------------------------------------------- */

/**
 * An allied NPC (a ghoul, retainer or other follower) belongs to a patron: a player character. The patron's
 * owners may spend experience on it. It pays from its own experience, or from the patron's.
 * Stored as flags["wodx-creation"].ally = {patron: {id, name}, payer: "self"|"patron", granted: {<user id>: <old level>}}.
 */
export function allyOf(actor) {
  return actor?.getFlag?.(MODULE_ID, "ally") ?? null;
}

export function patronOf(actor) {
  const id = allyOf(actor)?.patron?.id;
  return id ? game.actors?.get(id) ?? null : null;
}

/** Whose experience pays for this actor's purchases. */
export function payerOf(actor) {
  const ally = allyOf(actor);
  if ( ally?.payer === "patron" ) return patronOf(actor) ?? actor;
  return actor;
}

/** May this user spend experience on this actor? Its owners may, and so may the owners of an ally's patron. */
export function canSpendFor(actor, user = game.user) {
  if ( !actor || !user ) return false;
  if ( user.isGM || actor.testUserPermission?.(user, "OWNER") ) return true;
  const patron = patronOf(actor);
  return !!patron && !!patron.testUserPermission?.(user, "OWNER");
}

/** The actors this user may spend for: their own characters, then their allies. */
export function spendableFor(user = game.user) {
  return [...(game.actors ?? [])].filter(a => lineOf(a) && !lineage(a).became && (a.testUserPermission?.(user, "OWNER") || canSpendFor(a, user)))
    .sort((a, b) => (Number(!!allyOf(a)) - Number(!!allyOf(b))) || a.name.localeCompare(b.name));
}

/* -------------------------------------------- */
/*  Experience                                  */
/* -------------------------------------------- */

export function xpTotals(actor) {
  let earned = 0;
  let spent = 0;
  for ( const i of items(actor).filter(i => i.type === "Experience") ) {
    const n = parseInt(i.system?.amount) || 0;
    if ( i.system?.isspent ) spent += n; else earned += n;
  }
  return {earned, spent, available: earned - spent};
}

/** Every trait this actor could raise by one dot, with its cost and whether it is allowed. */
export function purchaseOptions(actor) {
  const line = lineOf(actor);
  if ( !line ) return [];
  const sys = actor.system ?? {};
  const gen = generationOf(actor);
  const domitor = line === "ghoul" ? domitorOf(actor) : null;
  const domitorGen = domitor ? generationOf(domitor) : null;
  const domitorDisciplines = domitor ? disciplinesOf(domitor).filter(d => d.value > 0).map(d => d.name) : [];
  const ownClan = line === "vampire" ? clanOf(actor) : (domitor ? clanOf(domitor) : null);
  const clanList = clanDisciplines(ownClan, vampireEra()).map(d => d.toLowerCase());
  const caitiff = line === "vampire" && ownClan?.id === "caitiff";
  const {available} = xpTotals(payerOf(actor));
  const out = [];
  const add = (kind, key, label, current, extra = {}) => {
    const max = traitMax({line, kind, generation: gen, domitorGeneration: domitorGen});
    const cost = xpCost({line, kind, current, discipline: extra.discipline});
    let reason = "";
    if ( cost === null ) reason = "Not available to this character";
    else if ( current >= max ) reason = `Already at the most this character can have (${max})`;
    else if ( extra.blocked ) reason = extra.blocked;
    else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
    out.push({kind, key, label, current, next: current + 1, cost, max, ok: !reason, reason, ...extra});
  };

  for ( const [k, a] of Object.entries(sys.attributes ?? {}) ) {
    if ( a?.isvisible === false ) continue;
    add("attribute", k, loc(a.label) || k, Number(a.value) || 0);
  }
  for ( const [k, a] of Object.entries(sys.abilities ?? {}) ) {
    if ( !a?.isvisible && !(Number(a?.value) > 0) ) continue;
    add("ability", k, loc(a.altlabel || a.label) || k, Number(a.value) || 0);
  }
  for ( const i of items(actor).filter(i => i.type === "Trait" && SECOND_ABILITY.test(i.system?.type ?? "")) ) {
    add("ability", `item:${i.id}`, i.name, Number(i.system.value) || 0);
  }
  if ( line !== "mortal" ) {
    for ( const d of disciplinesOf(actor) ) {
      const inClan = clanList.includes(d.name.toLowerCase());
      const blocked = (line === "ghoul" && !ghoulCanLearn(d.name, domitorDisciplines))
        ? "The domitor does not know this Discipline" : "";
      add("discipline", `item:${d.id}`, d.name, d.value, {discipline: caitiff ? "caitiff" : (inClan ? "clan" : "other"), blocked});
    }
  }
  for ( const [k, v] of Object.entries(sys.advantages?.virtues ?? {}) ) {
    if ( !v ) continue;
    add("virtue", k, loc(v.label) || k, Number(v.permanent) || 0);
  }
  if ( sys.advantages?.path ) {
    const p = sys.advantages.path;
    const label = p.label === "custom" ? (p.custom || "Road") : loc(p.label) || "Humanity";
    add("road", "path", label, Number(p.permanent) || 0);
  }
  if ( sys.advantages?.willpower ) add("willpower", "willpower", "Willpower", Number(sys.advantages.willpower.permanent) || 0);
  return out;
}

/** Cost and checks for a Discipline the character does not have yet. */
export function newDisciplineOption(actor, name) {
  const line = lineOf(actor);
  const clean = String(name ?? "").trim();
  if ( !line || line === "mortal" || !clean ) return null;
  const domitor = line === "ghoul" ? domitorOf(actor) : null;
  const domitorDisciplines = domitor ? disciplinesOf(domitor).filter(d => d.value > 0).map(d => d.name) : [];
  const {available} = xpTotals(payerOf(actor));
  const cost = XP[line].newDiscipline;
  let reason = "";
  if ( disciplinesOf(actor).some(d => d.name.toLowerCase() === clean.toLowerCase()) ) reason = "Already known; raise it instead";
  else if ( line === "ghoul" && !ghoulCanLearn(clean, domitorDisciplines) ) reason = "The domitor does not know this Discipline";
  else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
  return {kind: "newDiscipline", key: `new:${clean}`, label: clean, current: 0, next: 1, cost, max: 1, ok: !reason, reason};
}

/** Cost and checks for a new secondary Ability (a Talent, Skill or Knowledge the sheet does not list). */
export function newAbilityOption(actor, name, group = "skill") {
  const line = lineOf(actor);
  const clean = String(name ?? "").trim();
  if ( !line || !clean ) return null;
  const {available} = xpTotals(payerOf(actor));
  const cost = XP[line].newAbility;
  let reason = "";
  const exists = items(actor).some(i => i.type === "Trait" && i.name.toLowerCase() === clean.toLowerCase())
    || Object.values(actor.system?.abilities ?? {}).some(a => loc(a.altlabel || a.label)?.toLowerCase?.() === clean.toLowerCase());
  if ( exists ) reason = "Already on the sheet; raise it instead";
  else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
  return {kind: "newAbility", key: `newab:${group}:${clean}`, label: clean, current: 0, next: 1, cost, max: 1, ok: !reason, reason, group};
}

/** Re-check a purchase against the actor as it is now. Returns the option or null. */
export function recheck(actor, purchase) {
  if ( purchase.kind === "newDiscipline" ) return newDisciplineOption(actor, purchase.label);
  if ( purchase.kind === "newAbility" ) return newAbilityOption(actor, purchase.label, purchase.group);
  return purchaseOptions(actor).find(o => o.kind === purchase.kind && o.key === purchase.key) ?? null;
}

/** Raise the trait by one dot. Does not record the spend; see xp.mjs. */
export async function applyPurchase(actor, option) {
  const next = option.current + 1;
  switch ( option.kind ) {
    case "attribute": return actor.update({[`system.attributes.${option.key}.value`]: next});
    case "ability":
      if ( option.key.startsWith("item:") ) return actor.items.get(option.key.slice(5))?.update({"system.value": next});
      return actor.update({[`system.abilities.${option.key}.value`]: next, [`system.abilities.${option.key}.isvisible`]: true});
    case "discipline":
      return actor.items.get(option.key.slice(5))?.update({"system.value": next, "system.level": next});
    case "newDiscipline":
      return actor.createEmbeddedDocuments("Item", [disciplineItem(option.label, 1)]);
    case "newAbility":
      return actor.createEmbeddedDocuments("Item", [{name: option.label, type: "Trait",
        system: {type: `wod.types.${option.group}secondability`, value: 1, max: 5}}]);
    case "virtue":
      return actor.update({[`system.advantages.virtues.${option.key}.permanent`]: next,
        [`system.advantages.virtues.${option.key}.temporary`]: next});
    case "road":
      return actor.update({"system.advantages.path.permanent": next, "system.advantages.path.value": next});
    case "willpower":
      return actor.update({"system.advantages.willpower.permanent": next,
        "system.advantages.willpower.temporary": Math.min(next, (Number(actor.system.advantages.willpower.temporary) || 0) + 1)});
  }
  return null;
}

export function disciplineItem(name, value = 0) {
  return {name, type: "Power", system: {type: DISCIPLINE, value, level: value, max: 5}};
}

export function kindLabel(kind) {
  return KINDS[kind] ?? kind;
}

export {generationRow, ghoulDisciplineCap};
