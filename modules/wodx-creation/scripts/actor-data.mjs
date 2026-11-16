import {findClan, clanDisciplines, generationRow, ghoulDisciplineCap, ghoulCanLearn, xpCost, traitMax, KINDS} from "./rules.mjs";
import {XP} from "../data/vampire.mjs";
import * as AG from "./animal-ghoul-rules.mjs";
import * as AS from "./animal-stock-rules.mjs";
import {learningFor} from "./learn-rules.mjs";
import {splatOf} from "./lines.mjs";
import * as LX from "./lines-xp-rules.mjs";

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
  // B5040: an animal on a Creature sheet that has drunk vitae is a ghoul; one that has not is no line of ours
  if ( actor?.type === (types.creature ?? "Creature") && actor.getFlag?.(MODULE_ID, "animalGhoul") ) return "ghoul";
  return null;
}

/**
 * The chart a character spends experience by (B6271): vampire, ghoul or mortal as before, and every other line by its
 * own book (data/lines-xp.mjs). Kuei-jin share the Vampire sheet but spend by Kindred of the East.
 */
export function spendLine(actor) {
  const splat = splatOf(actor);
  // Kinfolk, sorcerers and kinain share the Mortal sheet but have their own charts
  if ( LX.hasChart(splat) ) return splat;
  return lineOf(actor);
}
const legacy = line => !!XP[line];

/** Every rated power of a cat on this actor: [{id, key, name, value, own}]. Spheres are fields, not items. */
export function powersOf(actor, cat) {
  if ( cat === "sphere" ) {
    const aff = String(actor?.system?.affinity ?? "").toLowerCase();
    return Object.entries(actor?.system?.spheres ?? {}).map(([k, v]) => ({id: "", key: `sphere:${k}`, name: loc(v?.label) || k, value: Number(v?.value) || 0,
      own: !!aff && (aff === k || aff.includes(k) || String(loc(v?.label)).toLowerCase() === aff)}));
  }
  return items(actor).filter(i => LX.itemIsCat(i, cat)).map(i => ({id: i.id, key: `item:${i.id}`, name: i.name, value: Number(i.system?.value) || 0,
    own: !!i.flags?.[MODULE_ID]?.favored}));
}

/* -------------------------------------------- */
/*  Animals (B5040 to B5049)                    */
/* -------------------------------------------- */

/** Creature variants that are plain beasts; the rest (chimera, spirit, construct, Fera kin...) are not animals. */
const BEAST_VARIANTS = new Set(["", "general", "animal", "mortal"]);

/**
 * Is this actor an animal? A Creature sheet of the plain variant, or marked flags["wodx-creation"].animal; a Mortal
 * sheet whose WoDX NPC template is an animal (passers-by, household beasts) or that is marked the same way.
 */
export function isAnimal(actor) {
  if ( !actor ) return false;
  const types = CONFIG.worldofdarkness?.sheettype ?? {};
  const mark = actor.getFlag?.(MODULE_ID, "animal");
  if ( mark === false ) return false;
  if ( mark ) return true;
  if ( actor.type === (types.creature ?? "Creature") ) return BEAST_VARIANTS.has(String(actor.system?.settings?.variant ?? ""));
  if ( actor.type === (types.mortal ?? "Mortal") ) {
    if ( actor.getFlag?.("wodx-npc", "passerbyBase") === "animal" ) return true;
    const t = actor.getFlag?.("wodx-npc", "behavior")?.template;
    return !!t && (t === "beast" || !!AG.KINDS[t]);
  }
  return false;
}

/** The kind of animal (an animal-ghoul-rules KINDS key), or null when it is not an animal. */
export function animalKindOf(actor) {
  if ( !isAnimal(actor) ) return null;
  const mark = actor.getFlag?.(MODULE_ID, "animal");
  return AG.kindOf({kind: mark?.kind ?? null, template: actor.getFlag?.("wodx-npc", "behavior")?.template ?? null, name: actor.name})
    ?? "stray-dog";
}

export const isAnimalGhoul = actor => lineOf(actor) === "ghoul" && isAnimal(actor);

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
  return [...(game.actors ?? [])].filter(a => spendLine(a) && !lineage(a).became && (a.testUserPermission?.(user, "OWNER") || canSpendFor(a, user)))
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
  const line = spendLine(actor);
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
  const learning = actor?.flags?.[MODULE_ID]?.learning ?? {};
  const add = (kind, key, label, current, extra = {}) => {
    const old = legacy(line);
    const max = old ? traitMax({line, kind, generation: gen, domitorGeneration: domitorGen, golconda: !!actor?.flags?.["wodx-actions"]?.golconda})
      : LX.lineMax({line, kind, key, cat: extra.cat, arete: Number(sys.advantages?.arete?.permanent) || 0});
    const cost = old ? xpCost({line, kind, current, discipline: extra.discipline}) : LX.lineCost({line, kind, key, current, cat: extra.cat, own: extra.own});
    // B6271: a line that does not buy this with experience does not show it at all
    if ( !old && cost === null ) return;
    let reason = "";
    if ( cost === null ) reason = "Not available to this character";
    else if ( current >= max ) reason = `Already at the most this character can have (${max})`;
    else if ( extra.blocked ) reason = extra.blocked;
    // B6230: one study at a time for each trait
    else if ( learningFor(learning, kind, key) ) reason = "Being learned now: it rises when the study is done";
    else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
    out.push({kind, key, label, current, next: current + 1, cost, max, ok: !reason, reason, ...extra});
  };

  const beast = line === "ghoul" && isAnimal(actor);
  for ( const [k, a] of Object.entries(sys.attributes ?? {}) ) {
    if ( a?.isvisible === false ) continue;
    // B5047: an animal has only Physical and Mental Attributes (V20 Dark Ages p. 396)
    if ( beast && !AG.ANIMAL_ATTRIBUTES.includes(k) ) continue;
    add("attribute", k, loc(a.label) || k, Number(a.value) || 0);
  }
  for ( const [k, a] of Object.entries(sys.abilities ?? {}) ) {
    if ( !a?.isvisible && !(Number(a?.value) > 0) ) continue;
    add("ability", k, loc(a.altlabel || a.label) || k, Number(a.value) || 0);
  }
  for ( const i of items(actor).filter(i => i.type === "Trait" && SECOND_ABILITY.test(i.system?.type ?? "")) ) {
    add("ability", `item:${i.id}`, i.name, Number(i.system.value) || 0);
  }
  if ( line === "kuei-jin" ) {
    for ( const d of disciplinesOf(actor) ) add("discipline", `item:${d.id}`, d.name, d.value, {discipline: "other"});
  } else if ( legacy(line) && line !== "mortal" ) {
    for ( const d of disciplinesOf(actor) ) {
      const inClan = clanList.includes(d.name.toLowerCase());
      const blocked = beast && !AG.animalCanLearn(d.name) ? "An animal can only learn Celerity, Fortitude and Potence"
        : (line === "ghoul" && !ghoulCanLearn(d.name, domitorDisciplines)) ? "The domitor does not know this Discipline" : "";
      add("discipline", `item:${d.id}`, d.name, d.value, {discipline: caitiff ? "caitiff" : (inClan ? "clan" : "other"), blocked});
    }
  }
  for ( const [k, v] of Object.entries(beast ? {} : (sys.advantages?.virtues ?? {})) ) {
    if ( !v ) continue;
    add("virtue", k, loc(v.label) || k, Number(v.permanent) || 0);
  }
  if ( sys.advantages?.path && !beast ) {
    const p = sys.advantages.path;
    const label = p.label === "custom" ? (p.custom || "Road") : loc(p.label) || "Humanity";
    add("road", "path", label, Number(p.permanent) || 0);
  }
  if ( sys.advantages?.willpower ) add("willpower", "willpower", "Willpower", Number(sys.advantages.willpower.permanent) || 0);
  // B6271: each line's own ratings and powers
  const chart = LX.LINE_XP[line];
  for ( const [k, st] of Object.entries(chart?.stats ?? {}) ) {
    if ( !sys.advantages?.[k] ) continue;
    add("stat", k, st.label, Number(sys.advantages[k].permanent) || 0);
  }
  for ( const cat of Object.keys(chart?.powers ?? {}) ) {
    if ( cat === "gift" ) continue;
    for ( const pw of powersOf(actor, cat) ) {
      add("power", pw.key, pw.name, pw.value, {cat, own: pw.own});
    }
  }
  // B5060: an animal ghoul's next step of training, at the house costs
  if ( beast ) { const t = trainingOption(actor, available); if ( t ) out.push(t); }
  return out;
}

/** The next step of training for an animal ghoul, as a purchase (B5060). */
export function trainingOption(actor, available = xpTotals(payerOf(actor)).available) {
  const kind = animalKindOf(actor);
  const now = AS.trainingOf(actor.getFlag?.(MODULE_ID, "animal"));
  const next = AS.nextTraining(kind, now);
  if ( !next ) return null;
  const cost = AS.TRAINING[next].xp;
  const reason = cost > available ? `Needs ${cost} experience; ${available} available` : "";
  return {kind: "training", key: next, label: `Training: ${AS.TRAINING[next].label.toLowerCase()}`, current: AS.TRAINING[now].rank, next: AS.TRAINING[next].rank,
    cost, max: 2, ok: !reason, reason};
}

/** Train an animal one step: the bracket traits, war's Brawl, and the mark on the sheet (B5059). */
export async function applyTraining(actor, level) {
  const kind = animalKindOf(actor);
  if ( !kind || !AS.TRAINING[level] ) return null;
  const mark = actor.getFlag?.(MODULE_ID, "animal") ?? {};
  return actor.update({...AS.trainingPatch(actor.system ?? {}, kind, level), [`flags.${MODULE_ID}.animal`]: {...mark, kind, training: level}});
}

/** Cost and checks for a Discipline the character does not have yet. */
export function newDisciplineOption(actor, name) {
  const line = spendLine(actor);
  const clean = String(name ?? "").trim();
  if ( !line || !clean || !(line === "kuei-jin" || (legacy(line) && line !== "mortal")) ) return null;
  const domitor = line === "ghoul" ? domitorOf(actor) : null;
  const domitorDisciplines = domitor ? disciplinesOf(domitor).filter(d => d.value > 0).map(d => d.name) : [];
  const {available} = xpTotals(payerOf(actor));
  const cost = legacy(line) ? XP[line].newDiscipline : LX.lineCost({line, kind: "newDiscipline"});
  let reason = "";
  if ( disciplinesOf(actor).some(d => d.name.toLowerCase() === clean.toLowerCase()) ) reason = "Already known; raise it instead";
  else if ( learningFor(actor?.flags?.[MODULE_ID]?.learning, "newDiscipline", `new:${clean}`, clean) ) reason = "Being learned now: it rises when the study is done";
  else if ( line === "ghoul" && isAnimal(actor) && !AG.animalCanLearn(clean) ) reason = "An animal can only learn Celerity, Fortitude and Potence";
  else if ( line === "ghoul" && !ghoulCanLearn(clean, domitorDisciplines) ) reason = "The domitor does not know this Discipline";
  else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
  return {kind: "newDiscipline", key: `new:${clean}`, label: clean, current: 0, next: 1, cost, max: 1, ok: !reason, reason};
}

/** Cost and checks for a new secondary Ability (a Talent, Skill or Knowledge the sheet does not list). */
export function newAbilityOption(actor, name, group = "skill") {
  const line = spendLine(actor);
  const clean = String(name ?? "").trim();
  if ( !line || !clean ) return null;
  const {available} = xpTotals(payerOf(actor));
  const cost = legacy(line) ? XP[line].newAbility : LX.lineCost({line, kind: "newAbility"});
  let reason = "";
  const exists = items(actor).some(i => i.type === "Trait" && i.name.toLowerCase() === clean.toLowerCase())
    || Object.values(actor.system?.abilities ?? {}).some(a => loc(a.altlabel || a.label)?.toLowerCase?.() === clean.toLowerCase());
  if ( exists ) reason = "Already on the sheet; raise it instead";
  else if ( learningFor(actor?.flags?.[MODULE_ID]?.learning, "newAbility", `newab:${group}:${clean}`, clean) ) reason = "Being learned now: it rises when the study is done";
  else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
  return {kind: "newAbility", key: `newab:${group}:${clean}`, label: clean, current: 0, next: 1, cost, max: 1, ok: !reason, reason, group};
}

/**
 * The first dot of a rated power (B6271): an Art, a Realm, an Arcanos, a Lore, a Hekau path, a Path of sorcery, or a
 * Gift (cat "gift", bought whole at its level; WoDX Actions' Gift list sends it here with its item). own: the
 * character's own (favoured Hekau, a Lore of their House, a Gift of their breed, auspice or tribe).
 */
export function newPowerOption(actor, cat, name, {own = false, level = 1, item = null} = {}) {
  const line = spendLine(actor);
  const clean = String(name ?? "").trim();
  if ( !line || !clean || !LX.LINE_XP[line]?.powers?.[cat] || cat === "sphere" ) return null;
  const {available} = xpTotals(payerOf(actor));
  const cost = LX.lineCost({line, kind: "newPower", cat, own: !!own, level});
  const key = `newpw:${cat}:${clean}`;
  let reason = "";
  const known = cat === "gift" ? items(actor).filter(i => LX.itemIsCat(i, "gift")) : powersOf(actor, cat);
  if ( cost === null ) reason = "Not available to this character";
  else if ( known.some(k => String(k.name).toLowerCase() === clean.toLowerCase()) ) reason = cat === "gift" ? "Already known" : "Already known; raise it instead";
  else if ( learningFor(actor?.flags?.[MODULE_ID]?.learning, "newPower", key, clean) ) reason = "Being learned now: it rises when the study is done";
  else if ( cost > available ) reason = `Needs ${cost} experience; ${available} available`;
  return {kind: "newPower", key, label: clean, cat, own: !!own, level: Math.max(1, Math.trunc(Number(level) || 1)), item, current: 0, next: 1, cost, max: 1, ok: !reason, reason};
}

/** Re-check a purchase against the actor as it is now. Returns the option or null. */
export function recheck(actor, purchase) {
  if ( purchase.kind === "training" ) { const t = trainingOption(actor); return t && t.key === purchase.key ? t : null; }
  if ( purchase.kind === "newDiscipline" ) return newDisciplineOption(actor, purchase.label);
  if ( purchase.kind === "newAbility" ) return newAbilityOption(actor, purchase.label, purchase.group);
  if ( purchase.kind === "newPower" ) return newPowerOption(actor, purchase.cat, purchase.label, {own: purchase.own, level: purchase.level, item: purchase.item});
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
    case "training":
      return applyTraining(actor, option.key);
    case "stat":
      return actor.update({[`system.advantages.${option.key}.permanent`]: next,
        ...(actor.system?.advantages?.[option.key]?.temporary !== undefined ? {[`system.advantages.${option.key}.temporary`]: Math.min(next, (Number(actor.system.advantages[option.key].temporary) || 0) + 1)} : {})});
    case "power":
      if ( option.key.startsWith("sphere:") ) return actor.update({[`system.spheres.${option.key.slice(7)}.value`]: next});
      return actor.items.get(option.key.slice(5))?.update({"system.value": next, "system.level": next});
    case "newPower": {
      const made = option.cat === "gift" && option.item ? foundry.utils.mergeObject(option.item, {flags: {[MODULE_ID]: {favored: !!option.own}}}, {inplace: false})
        : LX.powerItem(option.cat, option.label, 1, {own: option.own});
      return made ? actor.createEmbeddedDocuments("Item", [made]) : null;
    }
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
  return KINDS[kind] ?? LX.NEW_KINDS[kind] ?? kind;
}

export {generationRow, ghoulDisciplineCap};
