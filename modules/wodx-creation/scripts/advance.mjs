/**
 * Era advancement (B83), the Foundry part: reads a character into the advancers' view (advance-rules.mjs), applies
 * what the Storyteller ticks, snapshots characters before the years, and keeps each character's era history and time
 * awake. Nothing is deleted: the old records are archived under their flag name with "· archived".
 */
import {MODULE_ID, lineOf, chronology, generationOf} from "./actor-data.mjs";
import {setChronology} from "./lineage.mjs";
import {propose, PATH_LABEL} from "./advance-rules.mjs";
import {SWITCHES, DRIFT} from "../data/advance.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {writeLogPage} from "./xp.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");

const ACT = "wodx-actions";
// Flags kept by other WoDX modules are read and written through the flags object, not getFlag/setFlag: Foundry
// refuses a flag scope whose module is off in the world, and Creation must work with WoDX Actions or Sheets off.
const flagGet = (doc, scope, key) => doc?.flags?.[scope]?.[key];
const flagSet = (doc, scope, key, value) => doc.update({[`flags.${scope}.${key}`]: value});
const flagUnset = (doc, scope, key) => doc.update({[`flags.${scope}.-=${key}`]: null});
const SNAPSHOT_FOLDER = "WoDX · Before the years";
const yearOf = time => getEngine().timeToDate(Number(time) || 0).year;
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const loc = key => (typeof key === "string" && key.startsWith("wod.") ? (game.i18n?.localize?.(key) ?? key) : key);

/** The house-rule switches, read from WoDX Chronicle (rule.<id>). */
export function switches() {
  const get = id => { try { return !!game.settings.get("wodx-chronicle", `rule.${id}`); } catch { return false; } };
  return Object.fromEntries(Object.entries(SWITCHES).map(([k, id]) => [k, get(id)]));
}

/** Every line WoDX knows, from the actor's type and the sheet's variant. */
export function lineKey(actor) {
  const s = actor?.system?.settings ?? {};
  switch ( actor?.type ) {
    case "Vampire": return s.variant === "kindredeast" ? "kuei-jin" : "vampire";
    case "Mortal": {
      if ( s.variant === "orpheus" || (s.hasvitality && s.hasspite) ) return "orpheus";
      return lineOf(actor) ?? "mortal";
    }
    case "Werewolf": case "Changing Breed": return "garou";
    case "Mage": return "mage";
    case "Changeling": return "changeling";
    case "Wraith": return "wraith";
    case "Hunter": return (flagGet(actor, ACT, "imbued") || actor.system?.creed) ? "imbued" : "hunter";
    case "Demon": return "demon";
    case "Mummy": return "mummy";
    default: return null;
  }
}

/** The Road a vampire walks, by WoDX Actions' key, with its rating and a label. */
function roadView(actor) {
  const p = actor.system?.advantages?.path ?? {};
  const f = flagGet(actor, ACT, "road");
  let key = f?.key ?? null;
  const name = String(p.custom || loc(p.label || "") || "");
  if ( !key ) {
    const m = name.toLowerCase().match(/road of (the )?(\w+)/);
    key = m ? m[2] : (/humanity/i.test(name) ? "humanity" : null);
  }
  return {key, rating: n(p.permanent), label: name && !name.startsWith("wod.") ? name : "the Road"};
}

/** Years awake before this skip: the recorded count, else the years since the Embrace. */
export function awakeBefore(actor, now = game.time.worldTime) {
  const c = chronology(actor);
  if ( Number.isFinite(Number(c.awakeYears)) && c.awakeYears !== null && c.awakeYears !== undefined ) return Number(c.awakeYears);
  if ( c.embraced !== undefined && c.embraced !== null ) return Math.max(0, yearOf(now) - yearOf(c.embraced));
  return 0;
}

/** A plain view of the character for the advancers. */
function townsForFetters() {
  try {
    // B6176: the towns and markets sit under Storyteller's upkeep api
    const S = game.modules.get("wodx-storyteller")?.api?.upkeep;
    const towns = S?.towns?.state?.()?.towns ?? {}, markets = S?.markets?.state?.()?.markets ?? [];
    const nameOf = id => (Array.isArray(markets) ? markets : Object.values(markets)).find(m => m?.id === id)?.name ?? "";
    return Object.values(towns).map(t => ({name: nameOf(t.id), scars: t.scars ?? [], history: t.history ?? []})).filter(t => t.name);
  } catch (e) { return []; }
}
export function viewOf(actor) {
  const s = actor.system ?? {};
  const c = chronology(actor);
  const items = [...(actor.items ?? [])];
  const born = c.bornYear !== undefined && c.bornYear !== null && Number.isFinite(Number(c.bornYear)) ? Number(c.bornYear) : null;
  return {
    line: lineKey(actor),
    born,
    generation: generationOf(actor),
    awakeBefore: awakeBefore(actor),
    attributes: Object.fromEntries(["strength", "dexterity", "stamina"].map(a => [a, n(s.attributes?.[a]?.value)])),
    abilities: Object.fromEntries(Object.entries(s.abilities ?? {}).map(([k, a]) => [k, n(a?.value)])),
    road: actor.type === "Vampire" ? roadView(actor) : null,
    conscienceLabel: s.advantages?.virtues?.conviction?.permanent > 0 ? "Conviction" : "Conscience",
    secondaries: items.filter(i => i.type === "Trait" && /secondability/.test(String(i.system?.type ?? ""))).map(i => ({id: i.id, name: loc(i.name), value: n(i.system?.value)})),
    backgrounds: items.filter(i => i.type === "Feature" && i.system?.type === "wod.types.background").map(i => ({id: i.id, name: i.name, value: n(i.system?.value)})),
    tribe: s.tribe === "custom" ? s.custom?.tribe : (s.tribe || s.custom?.tribe || ""),
    records: {daMage: flagGet(actor, ACT, "daMage") ?? null, daFae: flagGet(actor, ACT, "daFae") ?? null, inquisitor: flagGet(actor, ACT, "inquisitor") ?? null},
    forcedSheet: !!flagGet(actor, "wodx-sheets", "sheet"),
    // B5022: Fetters, and the people now dead whose names a Fetter may carry
    fetters: items.filter(i => i.type === "Trait" && i.system?.type === "wod.types.fetter").map(i => ({id: i.id, name: i.name, value: n(i.system?.value)})),
    // B6104: a sealed Fetterguard (WoDX Library's soulforged box) keeps as many Fetters from harm as it holds likenesses
    fetterguard: items.filter(i => { const w = i.flags?.["wodx-library"]?.wonder; return w?.key === "fetterguard" && !w.spent && n(w.used?.seal) > 0; })
      .reduce((m, i) => Math.max(m, n(i.flags["wodx-library"].wonder.pool?.value)), 0),
    // B5391: the towns over time a place Fetter may name (WoDX Storyteller)
    towns: actor.type === "Wraith" ? townsForFetters() : [],
    deadNames: actor.type === "Wraith" ? (game.actors?.contents ?? []).filter(a => a.id !== actor.id && (a.statuses?.has?.("dead") || Number.isFinite(Number(a.flags?.["wodx-creation"]?.chronology?.died)))).map(a => a.name) : []
  };
}

/** The advancers' proposals for one actor in a plan. Torpor years are not awake. */
export function proposalsFor(actor, plan, {torporYears = 0} = {}) {
  return propose(viewOf(actor), {
    fromYear: plan.fromYear, toYear: plan.toYear, years: plan.years,
    awakeYears: Math.max(0, plan.years - torporYears),
    fromEra: plan.fromEraProfile ?? null, toEra: plan.toEraProfile ?? null, switches: plan.switches ?? switches()
  });
}

/* -------------------------------------------- */
/*  Applying                                     */
/* -------------------------------------------- */

async function archive(actor, key, time) {
  const old = flagGet(actor, ACT, key);
  if ( !old ) return;
  const stamp = getEngine().timeToDate(time);
  await flagSet(actor, ACT, `${key} · archived`, {...old, archivedYear: stamp.year});
}

/** Roll `rolls` checks of the virtue at the drift difficulty; each failure costs a dot. */
async function driftRolls(actor, rolls) {
  const virtue = actor.system?.advantages?.virtues?.conviction?.permanent > 0 ? "conviction" : "conscience";
  const dice = Math.max(1, n(actor.system?.advantages?.virtues?.[virtue]?.permanent));
  let lost = 0;
  for ( let k = 0; k < rolls; k++ ) {
    const r = await new Roll(`${dice}d10`).evaluate();
    const faces = r.dice?.[0]?.results?.map(x => x.result) ?? [];
    const net = TERMS.margin(faces, DRIFT.difficulty);
    if ( net <= 0 ) lost++;
  }
  return lost;
}

/** Make one ticked advancer change. `choice` is the Storyteller's pick where the change offers one. */
export async function applyAdvance(actor, change, plan, choice = null) {
  const d = change.data ?? {};
  const pick = choice ?? d.choice;
  switch ( change.kind ) {
    case "adv.decline": {
      const v = n(actor.system?.attributes?.[pick]?.value);
      if ( v > 1 ) await actor.update({[`system.attributes.${pick}.value`]: v - 1});
      return {note: `${pick} ${v} → ${Math.max(1, v - 1)}`};
    }
    case "adv.thickBlood": {
      const now = generationOf(actor);
      const mod = n(actor.system?.generationmod);
      const road = n(actor.system?.advantages?.path?.permanent);
      await actor.update({"system.generation": d.to + mod, "system.advantages.path.permanent": Math.max(0, road - d.steps)});
      if ( d.noAnimalBlood ) await setChronology(actor, {noAnimalBlood: true});
      return {note: `Generation ${now} → ${d.to}`};
    }
    case "adv.drift": {
      const lost = await driftRolls(actor, d.rolls);
      const road = n(actor.system?.advantages?.path?.permanent);
      if ( lost ) await actor.update({"system.advantages.path.permanent": Math.max(0, road - lost)});
      return {note: `${lost} of ${d.rolls} failed`};
    }
    case "adv.xp":
      await actor.createEmbeddedDocuments("Item", [{name: `The years ${plan.fromYear}–${plan.toYear}`, type: "Experience",
        system: {amount: d.amount, isspent: false}, flags: {[MODULE_ID]: {time: plan.to, kind: "award", by: "Pass the Years"}}}]);
      // The same experience log page an award from the Storyteller writes (xp.mjs)
      await writeLogPage(actor);
      return null;
    case "adv.bgReset": case "adv.bgDecay": {
      const item = actor.items.get(d.itemId);
      if ( item ) await item.update({"system.value": d.to});
      return null;
    }
    case "adv.convert": {
      const item = actor.items.get(d.itemId);
      const cur = n(actor.system?.abilities?.[pick]?.value);
      await actor.update({[`system.abilities.${pick}.value`]: Math.min(5, cur + d.dots), [`system.abilities.${pick}.isvisible`]: true});
      if ( item ) await item.update({"system.value": 0});
      return {note: `${item?.name ?? "?"} → ${pick}`};
    }
    case "adv.road": {
      await archive(actor, "road", plan.to);
      await actor.update({"system.advantages.path.label": pick === "humanity" ? "wod.advantages.path.humanity" : `wod.advantages.path.${pick}`,
        // The rating carries as it stands now: thick blood or drift earlier in the same skip may have lowered it
        "system.advantages.path.custom": ""});
      if ( flagGet(actor, ACT, "road") ) await flagUnset(actor, ACT, "road");
      return {note: PATH_LABEL[pick]};
    }
    case "adv.daMage":
      await archive(actor, "daMage", plan.to);
      await flagSet(actor, ACT, "daMage", {...(flagGet(actor, ACT, "daMage") ?? {}), system: "m20"});
      return null;
    case "adv.daFae":
      await archive(actor, "daFae", plan.to);
      await flagSet(actor, ACT, "daFae", {...(flagGet(actor, ACT, "daFae") ?? {}), system: "c20", crossing: pick});
      return {note: pick};
    case "adv.inquisitor":
      await archive(actor, "inquisitor", plan.to);
      await flagUnset(actor, ACT, "inquisitor");
      return null;
    case "adv.outOfEra": {
      const sheets = game.modules.get("wodx-sheets")?.api;
      const id = sheets?.sheetFor?.(actor);
      if ( id ) await flagSet(actor, "wodx-sheets", "sheet", id);
      return null;
    }
    case "adv.lostTribe":
      await setChronology(actor, {lostTribe: d.tribe});
      if ( d.became ) { await actor.update({"system.tribe": "custom", "system.custom.tribe": d.became}); return {note: d.became}; }
      await setChronology(actor, {lastOfTribe: d.tribe});
      return {note: `the last of the ${d.tribe}`};
    case "adv.hostDies": {
      await setChronology(actor, {hostDied: plan.to ?? null});
      const r = await game.modules.get(MODULE_ID)?.api?.possess?.(actor, {target: "ordinary"});
      return {note: r?.taken ? "a new host" : "no host yet"};
    }
    case "adv.fetterLost": {
      const item = actor.items.get(d.itemId);
      if ( item ) await item.update({"system.value": 0, name: `${item.name} (lost)`});
      await ChatMessage.create({content: `<div class="wodx-card"><p><strong>${esc(actor.name)}</strong> loses the Fetter "${esc(item?.name ?? "")}": ${d.why ? esc(d.why) : `${esc(d.who)} has died`}. A Harrowing follows (Wraith 20th p. 308).</p></div>`,
        speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id)});
      try { await game.modules.get("wodx-actions")?.api?.harrowing?.({actor, kind: "fetter"}); } catch (e) { /* the card stands */ }
      return {note: d.who};
    }
  }
  return null;
}

/** Copy each character with ticked changes into "WoDX · Before the years" before anything changes. */
export async function snapshot(actors, plan) {
  if ( !actors.length ) return null;
  const folder = game.folders.find(f => f.type === "Actor" && f.name === SNAPSHOT_FOLDER)
    ?? await Folder.create({name: SNAPSHOT_FOLDER, type: "Actor", flags: {[MODULE_ID]: {kind: "snapshots"}}});
  const copies = actors.map(a => {
    const src = a.toObject();
    delete src._id;
    delete src._stats;
    src.name = `${a.name} (${plan.fromYear})`;
    src.folder = folder.id;
    src.ownership = {default: 0};
    src.flags = foundry.utils.deepClone(src.flags ?? {});
    src.flags[MODULE_ID] = {...(src.flags[MODULE_ID] ?? {}), snapshotOf: {id: a.id, year: plan.fromYear, toYear: plan.toYear}};
    return src;
  });
  const made = [];
  for ( const src of copies ) made.push(await Actor.create(src));
  return made;
}

/** Record the era history and the time awake once the years are applied. */
export async function recordYears(actor, plan, {torpor = false} = {}) {
  const c = chronology(actor);
  const eras = [...(c.eras ?? [])];
  if ( plan.toEra && eras.at(-1)?.era !== plan.toEra.id ) {
    if ( !eras.length && plan.fromEra ) eras.push({era: plan.fromEra.id, year: plan.fromYear});
    let sheet = null;
    try { sheet = game.modules.get("wodx-sheets")?.api?.sheetFor?.(actor) ?? null; } catch { /* no sheets */ }
    if ( plan.toEra.id !== plan.fromEra?.id ) eras.push({era: plan.toEra.id, year: plan.toYear, sheet});
  }
  const changes = {eras};
  if ( ["vampire", "kuei-jin"].includes(lineKey(actor)) ) changes.awakeYears = awakeBefore(actor, plan.from) + (torpor ? 0 : plan.years);
  return setChronology(actor, changes);
}

export {SNAPSHOT_FOLDER};
