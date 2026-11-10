import {MODULE_ID, esc, lineOf, lineage, chronology, domitorOf, disciplinesOf, allyOf} from "./actor-data.mjs";
import {ghoulBloodMax, bondStage} from "./rules.mjs";
import {setLineage, setChronology, writeLineageJournal} from "./lineage.mjs";
import {MORTAL, GHOUL_AGING, BOND_FADE, TORPOR, BACKGROUND_REVIEW, ERA_SECONDARY, LINE_OF_TYPE, SECONDS_PER_MONTH} from "../data/time.mjs";
import {getEngine, describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {viewOf, switches as advanceSwitches, applyAdvance, snapshot, recordYears} from "./advance.mjs";
import {propose} from "./advance-rules.mjs";

/**
 * Pass the Years (Phase 4). A plan lists, for each character, what the years do to them; the Storyteller ticks
 * what to accept; applying it runs Chronicle's time skip, sets the era, and makes the ticked changes. Nothing a
 * character has is deleted: the dead are filed in "WoDX · The Dead", and abilities only ever gain visibility.
 */

const DEAD_FOLDER = "WoDX · The Dead";
const chronicle = () => game.modules.get("wodx-chronicle")?.api;
const yearOf = time => getEngine().timeToDate(Number(time) || 0).year;
const loc = key => (typeof key === "string" && key.startsWith("wod.") ? (game.i18n?.localize?.(key) ?? key) : key);
const dateLabel = time => { try { return describeTime(time).dateLabel; } catch { return ""; } };

/** The world time `years` years after `from`, on the same date (a day earlier if that date does not exist). */
export function addYears(from, years) {
  const engine = getEngine();
  const d = engine.timeToDate(from);
  for ( let back = 0; back < 12; back++ ) {
    try {
      const t = engine.dateToTime({year: d.year + years, month: d.month, day: Math.max(1, d.day - back), hour: d.hour, minute: d.minute});
      if ( Number.isFinite(t) ) return t;
    } catch { /* a day the calendar skips (the reform) or the 29th of February */ }
  }
  throw new Error(`No date ${years} years after ${d.year}`);
}

/* -------------------------------------------- */
/*  Ability translation                         */
/* -------------------------------------------- */

/** What changes on a character's sheet when the era's ability set changes. Null when nothing does. */
export function translationFor(actor, profile) {
  const typeKey = LINE_OF_TYPE[actor?.type];
  if ( !typeKey || !profile?.system?.[typeKey] ) return null;
  const eraKey = profile.system[typeKey];
  const target = CONFIG.worldofdarkness?.era?.[eraKey];
  const current = actor.system?.settings?.era;
  if ( !target || current === target ) return null;
  const set = game.worldofdarkness?.abilities?.[typeKey]?.[eraKey];
  const shown = set ? [...set.talents, ...set.skills, ...set.knowledges] : null;
  const abilities = actor.system?.abilities ?? {};
  const reveal = shown ? shown.filter(k => abilities[k] && !abilities[k].isvisible) : [];
  // Only abilities with no dots are hidden; anything a character has learned stays on the sheet
  const hide = shown ? Object.entries(abilities).filter(([k, a]) => a?.isvisible && !shown.includes(k) && !(Number(a.value) > 0)).map(([k]) => k) : [];
  const kept = shown ? Object.entries(abilities).filter(([k, a]) => !shown.includes(k) && Number(a?.value) > 0).map(([k]) => k) : [];
  const have = new Set([...(actor.items ?? [])].filter(i => i.type === "Trait").map(i => i.name.toLowerCase()));
  const add = (ERA_SECONDARY[typeKey]?.[eraKey] ?? []).map(([group, key]) => ({group, key, name: loc(`wod.abilities.${key}`)}))
    .filter(s => !have.has(String(s.name).toLowerCase()));
  return {typeKey, eraKey, from: current, to: target, reveal, hide, kept, add};
}

async function applyTranslation(actor, t) {
  const update = {"system.settings.era": t.to};
  for ( const k of t.reveal ) update[`system.abilities.${k}.isvisible`] = true;
  for ( const k of t.hide ) update[`system.abilities.${k}.isvisible`] = false;
  for ( const k of t.kept ) update[`system.abilities.${k}.isvisible`] = true;
  await actor.update(update);
  if ( t.add.length ) {
    await actor.createEmbeddedDocuments("Item", t.add.map(s => ({name: s.name, type: "Trait",
      system: {type: `wod.types.${s.group}secondability`, value: 0, max: 5}})));
  }
}

/* -------------------------------------------- */
/*  The plan                                    */
/* -------------------------------------------- */

const isDead = a => chronology(a).died !== undefined && chronology(a).died !== null;
const domitorAlive = a => { const d = domitorOf(a); return !!d && !isDead(d) && !lineage(d).became; };

/**
 * What `years` of time do to every character. Pure: reads the world, writes nothing.
 * @returns {{from, to, fromYear, toYear, years, fromEra, toEra, rows}}
 */
export function planSkip({from = game.time.worldTime, to, actors = game.actors, rules = null} = {}) {
  const fromYear = yearOf(from);
  const toYear = yearOf(to);
  const years = toYear - fromYear;
  const eras = chronicle()?.eras;
  const fromEra = eras?.activeEra?.()?.profile ?? null;
  const target = eras?.targetEra?.(toYear) ?? {profile: fromEra};
  const toEra = target.profile ?? fromEra;
  const rows = [];
  const sw = rules ?? advanceSwitches();

  for ( const actor of actors ) {
    if ( actor.type === "Group" ) continue; // a coterie or pack ages through its members
    if ( actor.getFlag?.(MODULE_ID, "snapshotOf") ) continue; // a copy kept from before an earlier skip
    const line = lineOf(actor);
    const l = lineage(actor);
    const c = chronology(actor);
    if ( l.became || isDead(actor) ) continue;
    const notes = [];
    const changes = [];
    // Change ids go into form field names split on ".", so they carry no dots
    const add = (kind, label, detail, checked, data = {}, choices = null) => changes.push({id: `${kind.replace(/\W/g, "")}${changes.length}`, kind, label, detail, checked, data,
      ...(choices ? {choices} : {})});
    const born = Number.isFinite(Number(c.bornYear)) && c.bornYear !== null && c.bornYear !== undefined ? Number(c.bornYear) : null;

    if ( line === "mortal" ) {
      const ageEnd = born !== null ? toYear - born : MORTAL.assumedAge + years;
      notes.push(born !== null ? `Ages ${years} years (${fromYear - born} → ${ageEnd})` : `Ages ${years} years (birth year not set; taken as ${MORTAL.assumedAge} now)`);
      if ( ageEnd >= MORTAL.mayDieAt ) {
        const certain = ageEnd >= MORTAL.diesAt;
        add("death", certain ? "Dies of age" : "May die of age", `${ageEnd} years old by ${toYear}${certain ? "" : "; tick if they die"} (house rule)`, certain);
        add("heir", "An heir inherits", "A new sheet, \"Heir of …\", copied from this one: Backgrounds and belongings, not experience (house rule)", false);
      }
    }

    if ( line === "ghoul" ) {
      const domitor = domitorOf(actor);
      const gone = !domitorAlive(actor);
      const ghouledYear = c.ghouled !== undefined ? yearOf(c.ghouled) : fromYear;
      const realEnd = born !== null ? toYear - born : MORTAL.assumedAge + (toYear - ghouledYear);
      const newMax = ghoulBloodMax(toYear - ghouledYear);
      const oldMax = Number(actor.system?.advantages?.bloodpool?.max) || 10;
      add("ghoulFed", `Fed each month by ${domitor?.name ?? l.domitor?.name ?? "the domitor"}`,
        `Does not age while the vitae lasts; blood pool ${oldMax}${newMax !== oldMax ? ` → ${newMax} (+1 a century)` : ""} (V20 Dark Ages p. 399)`, !gone, {newMax, domitorId: domitor?.id ?? l.domitor?.id});
      add("vitaeLapses", "The vitae lapses",
        `${gone ? "The domitor is gone. " : ""}Reverts to the real age (${realEnd})${realEnd >= GHOUL_AGING.dustAt ? " and turns to dust" : ""}; the Disciplines go dark (V20 Dark Ages p. 399)`, gone, {dust: realEnd >= GHOUL_AGING.dustAt});
    }

    // Bonds fade without a drink: one step per (12 − Willpower) months (V20DA p. 341)
    const willpower = Number(actor.system?.advantages?.willpower?.permanent) || 0;
    const period = Math.max(BOND_FADE.minMonths, BOND_FADE.base - willpower);
    for ( const [rid, b] of Object.entries(l.bonds ?? {}) ) {
      const stage = bondStage(b.drinks).stage;
      if ( !stage ) continue;
      // A ghoul fed each month keeps the bond to the domitor; one whose domitor is gone loses it as any thrall would
      if ( line === "ghoul" && l.domitor?.id === rid && domitorAlive(actor) ) continue;
      const months = Math.max(0, (to - (b.last ?? from)) / SECONDS_PER_MONTH);
      const steps = Math.floor(months / period);
      if ( steps <= 0 ) continue;
      const toStage = Math.max(0, stage - steps);
      add("bondFades", `Bond to ${b.name} fades`, `${bondStage(stage).label} → ${bondStage(toStage).label}: no drink for ${Math.floor(months)} months, one step per ${period} (p. 341)`, true, {regnantId: rid, toStage});
    }

    if ( line === "vampire" ) {
      notes.push("Does not age");
      const road = Math.max(0, Math.min(10, Number(actor.system?.advantages?.path?.permanent) || 0));
      const enough = years >= TORPOR.years[road];
      add("torpor", "Sleeps the years away in torpor", `Road ${road}: the sleep lasts at least ${TORPOR.labels[road]} (V20 Dark Ages p. 350)${enough ? "" : "; longer than this skip"}`, false, {road});
    }

    // Wounds heal over the skip: WoDX Actions heals with the clock when the skip ends (the same code as any clock advance)
    const heal = game.wodxActions?.healPlan?.(actor, Math.max(0, to - from));
    if ( heal ) {
      const got = Object.entries(heal.healed ?? {}).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`);
      if ( got.length || heal.needsCare ) notes.push(`Wounds: ${got.length ? `heals ${got.join(", ")}` : "no healing"}${heal.needsCare ? "; lethal wounds past Hurt need care" : ""} (WoDX Actions, VtDA20 p. 352)`);
    }

    const t = toEra ? translationFor(actor, toEra) : null;
    if ( t ) {
      const parts = [];
      if ( t.reveal.length ) parts.push(`adds ${t.reveal.map(k => loc(actor.system.abilities[k]?.label) || k).join(", ")}`);
      if ( t.add.length ) parts.push(`adds ${t.add.map(s => s.name).join(", ")}`);
      if ( t.kept.length ) parts.push(`keeps ${t.kept.map(k => loc(actor.system.abilities[k]?.label) || k).join(", ")} (learned)`);
      add("translate", `Abilities for ${toEra.name}`, `${loc(t.from) || "?"} → ${loc(t.to)}: ${parts.join("; ") || "same list"}. Nothing is removed.`, true, {translation: t});
    }

    if ( years >= BACKGROUND_REVIEW.years ) {
      const bg = [...(actor.items ?? [])].filter(i => i.type === "Feature" && i.system?.type === "wod.types.background"
        && BACKGROUND_REVIEW.names.some(n => i.name.toLowerCase().includes(n)));
      if ( bg.length ) notes.push(`Review after ${years} years: ${bg.map(i => `${i.name} ${i.system.value ?? ""}`.trim()).join(", ")} (house rule)`);
    }

    // Each line's advancer (era advancement, B83): the switches' rules, the era crossing and the line's notes
    const adv = propose(viewOf(actor), {fromYear, toYear, years, awakeYears: years, fromEra, toEra, switches: sw});
    for ( const ch of adv.changes ) add(ch.kind, ch.label, ch.detail, ch.checked, ch.data, ch.choices ?? null);
    notes.push(...adv.notes);

    if ( !changes.length && !notes.length ) continue;
    rows.push({actorId: actor.id, name: actor.name, line: line ?? actor.type, born, needsBorn: born === null && ["mortal", "ghoul"].includes(line), notes, changes,
      ally: allyOf(actor)?.patron?.name ?? null, pc: !!actor.hasPlayerOwner});
  }
  rows.sort((a, b) => (Number(b.pc) - Number(a.pc)) || a.name.localeCompare(b.name));
  return {from, to, fromYear, toYear, years, fromEra: fromEra ? {id: fromEra.id, name: fromEra.name} : null,
    toEra: toEra ? {id: toEra.id, name: toEra.name, locked: !!target.locked} : null, rows};
}

/* -------------------------------------------- */
/*  Applying it                                 */
/* -------------------------------------------- */

async function deadFolder() {
  return game.folders.find(f => f.type === "Actor" && f.name === DEAD_FOLDER)
    ?? Folder.create({name: DEAD_FOLDER, type: "Actor", flags: {[MODULE_ID]: {kind: "dead"}}});
}

async function die(actor, time, cause) {
  await setChronology(actor, {died: time, cause});
  const f = await deadFolder();
  await actor.update({folder: f.id});
}

async function makeHeir(actor, toYear) {
  const src = actor.toObject();
  delete src._id;
  delete src._stats;
  src.name = `Heir of ${actor.name}`;
  src.items = (src.items ?? []).filter(i => i.type !== "Experience").map(i => { const c = {...i}; delete c._id; return c; });
  src.flags = foundry.utils.deepClone(src.flags ?? {});
  src.flags[MODULE_ID] = {lineage: {family: {heirOf: {id: actor.id, name: actor.name}}}, chronology: {bornYear: toYear - 25}};
  return Actor.create(src);
}

/** Make one accepted change. */
async function applyChange(actor, change, plan, choice = null) {
  const d = change.data ?? {};
  switch ( change.kind ) {
    case "death": return die(actor, plan.to, "age");
    case "heir": return makeHeir(actor, plan.toYear);
    case "ghoulFed": {
      await actor.update({"system.advantages.bloodpool.max": d.newMax});
      if ( d.domitorId ) {
        const bonds = {...(lineage(actor).bonds ?? {})};
        if ( bonds[d.domitorId] ) bonds[d.domitorId] = {...bonds[d.domitorId], last: plan.to};
        await setLineage(actor, {bonds});
      }
      return null;
    }
    case "vitaeLapses":
      await actor.update({
        "system.settings.variant": "general", "system.settings.variantsheet": "",
        "system.settings.hasbloodpool": false, "system.settings.powers.hasdisciplines": false,
        "system.advantages.bloodpool.temporary": 0
      });
      await setChronology(actor, {vitaeLapsed: plan.to});
      if ( d.dust ) await die(actor, plan.to, "dust");
      return null;
    case "bondFades": {
      const bonds = {...(lineage(actor).bonds ?? {})};
      if ( bonds[d.regnantId] ) bonds[d.regnantId] = {...bonds[d.regnantId], drinks: d.toStage};
      return setLineage(actor, {bonds});
    }
    case "torpor": return setChronology(actor, {torpor: {from: plan.from, to: plan.to, road: d.road}});
    case "translate": return applyTranslation(actor, d.translation);
  }
  if ( String(change.kind).startsWith("adv.") ) return applyAdvance(actor, change, plan, choice);
  return null;
}

const isOn = (accept, row, ch) => accept[row.actorId]?.[ch.id] ?? ch.checked;

/**
 * Apply a plan. `accept` maps actor id → change id → true/false (default: each change's own `checked`);
 * `born` maps actor id → birth year to record first. With `dryRun`, only the report is written.
 */
export async function applyPlan(plan, {accept = {}, born = {}, choices = {}, dryRun = false, label = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const done = [];
  if ( !dryRun ) {
    // Snapshot first: every character with a ticked change is copied into "WoDX · Before the years" (B83)
    const touched = plan.rows.filter(r => r.changes.some(ch => isOn(accept, r, ch))).map(r => game.actors.get(r.actorId)).filter(Boolean);
    await snapshot(touched, plan);
    for ( const [id, year] of Object.entries(born) ) {
      const a = game.actors.get(id);
      if ( a && Number.isFinite(Number(year)) && String(year) !== "" ) await setChronology(a, {bornYear: Number(year)});
    }
    await chronicle().timeSkip(plan.to, {label: label || `${plan.fromYear} to ${plan.toYear}`, eraHandled: true});
    const active = chronicle().eras.activeEra()?.profile?.id;
    if ( plan.toEra && plan.toEra.id !== active ) await game.settings.set("wodx-chronicle", "activeEra", plan.toEra.id);
  }
  for ( const row of plan.rows ) {
    const actor = game.actors.get(row.actorId);
    if ( !actor ) continue;
    // Heirs first, while the sheet is still in its own folder
    const ordered = [...row.changes].sort((a, b) => (a.kind === "heir" ? -1 : 0) - (b.kind === "heir" ? -1 : 0));
    const taken = [];
    for ( const ch of ordered ) {
      const on = isOn(accept, row, ch);
      if ( !on ) continue;
      if ( ch.kind === "ghoulFed" && (accept[row.actorId]?.[row.changes.find(c => c.kind === "vitaeLapses")?.id] ?? row.changes.find(c => c.kind === "vitaeLapses")?.checked) ) continue;
      const choice = choices[row.actorId]?.[ch.id] ?? ch.data?.choice ?? null;
      const picked = ch.choices ? {...ch, picked: ch.choices.find(c => c.value === choice)?.label ?? choice} : ch;
      if ( !dryRun ) await applyChange(actor, ch, plan, choice);
      taken.push(picked);
    }
    if ( !dryRun && !isDead(actor) ) {
      const slept = taken.some(c => c.kind === "torpor");
      await recordYears(actor, plan, {torpor: slept});
    }
    done.push({row, taken});
  }
  const journal = await writeReport(plan, done, {dryRun});
  if ( !dryRun ) await writeLineageJournal();
  return {done, journal};
}

/** One page per skip in "WoDX Time Skips". */
export async function writeReport(plan, done, {dryRun = false} = {}) {
  const body = done.map(({row, taken}) => {
    const skipped = row.changes.filter(c => !taken.some(t => t.id === c.id));
    return `<h3>${esc(row.name)}</h3>
      ${row.notes.length ? `<ul>${row.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${taken.length ? `<p><strong>${dryRun ? "Would change" : "Changed"}:</strong></p><ul>${taken.map(c => `<li>${esc(c.label)}${c.picked ? ` (${esc(c.picked)})` : ""}: ${esc(c.detail)}</li>`).join("")}</ul>` : ""}
      ${skipped.length ? `<p class="wodx-quiet">Not taken: ${esc(skipped.map(c => c.label).join("; "))}</p>` : ""}`;
  }).join("");
  const html = `<p>${dryRun ? "Planned, not applied" : "Applied"}: ${plan.years} years, ${esc(dateLabel(plan.from))} to ${esc(dateLabel(plan.to))}.
    Era: ${esc(plan.fromEra?.name ?? "?")} → ${esc(plan.toEra?.name ?? "?")}${plan.toEra?.locked ? " (locked)" : ""}.</p>${body || "<p>Nothing changes.</p>"}`;
  const name = `${plan.fromYear} to ${plan.toYear}${dryRun ? " (plan)" : ""}`;
  let journal = game.journal.find(j => j.getFlag?.(MODULE_ID, "kind") === "time-skips");
  if ( !journal ) {
    journal = await JournalEntry.create({name: "WoDX Time Skips", flags: {[MODULE_ID]: {kind: "time-skips"}},
      pages: [{name, type: "text", text: {content: html}}]});
    return journal;
  }
  const page = journal.pages.getName(name);
  if ( page ) await page.update({"text.content": html});
  else await journal.createEmbeddedDocuments("JournalEntryPage", [{name, type: "text", text: {content: html}}]);
  return journal;
}

export {yearOf, disciplinesOf};
