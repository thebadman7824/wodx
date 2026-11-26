/**
 * WoDX Creation: the Dark Ages Companion's demons as sheet data (B7698). Pure, no Foundry: the harness tests it;
 * dac-demons.mjs writes the sheet.
 *  - Abilities: the 2002 names read as V20 Dark Ages has them (Dodge is Athletics, Larceny is Legerdemain, Acting and
 *    Music are Performance), each at the higher rating; the rest go through the book-people plan (a system Ability
 *    when the sheet has it, else a Secondary Ability).
 *  - Health: the book's levels mapped onto the sheet's seven, keeping the book's penalties: OK on Bruised, -1 on Hurt,
 *    -2 on Wounded, -3 on Mauled, -5 on Crippled; Injured is left empty; the last level is Incapacitated.
 *  - The sheet is a Creature with blood and Disciplines (as WoDX makes a vozhd), marked as the Companion's demon.
 *  - B7702: the V20 Dark Ages Companion's monsters keep the sheet's own seven health levels (the book gives none) and
 *    carry their Road rating and rules in the notes.
 *  - B7939: the fomori and monsters of Dark Ages: Werewolf (pp. 186-189) have no blood: they carry Rage and Gnosis
 *    where the book rates them, their fomor powers, natural weapons and hide (powers, weapons, armor), made by dac-demons.mjs.
 */
import {DEMONS, BOOK} from "../../wodx-creation/data/dac-demons.mjs";
import {MONSTERS, BOOK as MONSTER_BOOK} from "../../wodx-creation/data/v20dac-monsters.mjs";
import {MONSTERS as DAW_MONSTERS, BOOK as DAW_BOOK} from "../../wodx-creation/data/daw-monsters.mjs";
import {planOf} from "./book-people-rules.mjs";
import {HEALTH_LEVELS} from "../core/terms.mjs";

/** The Companion's demons, then the V20 Dark Ages Companion's four monsters (B7702), each with its own book. */
export const ALL = [...DEMONS.map(d => ({...d, book: BOOK})), ...MONSTERS.map(m => ({...m, book: MONSTER_BOOK})),
  ...DAW_MONSTERS.map(m => ({...m, book: DAW_BOOK}))];
export const byKey = key => ALL.find(d => d.key === key) ?? null;
export const pageOf = d => `${d.book ?? BOOK} p. ${d.p}`;

/** The 2002 Ability names V20 Dark Ages folds into others. */
export const ABILITY_2002 = {Dodge: "Athletics", Larceny: "Legerdemain", Acting: "Performance", Music: "Performance"};

export function convertAbilities(abilities = {}) {
  const out = {};
  for ( const [name, v] of Object.entries(abilities) ) {
    const to = ABILITY_2002[name] ?? name;
    out[to] = Math.max(out[to] ?? 0, v);
  }
  return out;
}

/** The sheet slot for each of the book's penalties, and the penalty the slot carries. */
const SLOT = {0: "bruised", "-1": "hurt", "-2": "wounded", "-3": "mauled", "-5": "crippled"};
export const HEALTH_SLOTS = HEALTH_LEVELS;

/** The book's health levels as the sheet's update: {"system.health.<slot>.value|total|penalty": n}. */
export function healthOf(d) {
  const counts = Object.fromEntries(HEALTH_SLOTS.map(k => [k, 0]));
  const pen = {bruised: 0, hurt: -1, injured: -1, wounded: -2, mauled: -3, crippled: -5, incapacitated: -99};
  for ( const [p, c] of Object.entries(d.health ?? {}) ) {
    const slot = SLOT[p];
    if ( !slot ) throw new Error(`${d.key}: no sheet level for penalty ${p}`);
    counts[slot] += Number(c) || 0;
  }
  counts.incapacitated = 1;
  const update = {};
  for ( const k of HEALTH_SLOTS ) {
    update[`system.health.${k}.value`] = counts[k];
    update[`system.health.${k}.total`] = counts[k];
    update[`system.health.${k}.penalty`] = pen[k];
  }
  const levels = HEALTH_SLOTS.reduce((s, k) => s + counts[k], 0);
  return {update, counts, levels};
}

/** How many levels the book lists, the last one included. */
export const bookLevels = d => Object.values(d.health ?? {}).reduce((s, c) => s + (Number(c) || 0), 0) + 1;

/**
 * The whole sheet plan. systemKeys: the Ability keys the sheet has. Returns {update, secondary, disciplines, paths,
 * notes}.
 */
export function plan(d, systemKeys = []) {
  const base = planOf({...d, abilities: convertAbilities(d.abilities), willpower: d.willpower, nature: "", demeanor: "", group: d.group}, systemKeys);
  const h = d.health ? healthOf(d) : null;
  const update = {...base.update, ...(h?.update ?? {}),
    "system.settings.variant": "general", "system.settings.haswillpower": true, "system.settings.hasbloodpool": !!d.blood,
    "system.settings.powers.hasdisciplines": true, "system.settings.powers.haspowers": true,
    "system.advantages.bloodpool.max": d.blood, "system.advantages.bloodpool.temporary": d.blood,
    ...(d.rage ? {"system.settings.hasrage": true, "system.advantages.rage.permanent": d.rage, "system.advantages.rage.temporary": d.rage} : {}),
    ...(d.gnosis ? {"system.settings.hasgnosis": true, "system.advantages.gnosis.permanent": d.gnosis, "system.advantages.gnosis.temporary": d.gnosis} : {}),
    ...(h ? {"system.traits.health.totalhealthlevels.max": h.levels, "system.traits.health.totalhealthlevels.value": h.levels} : {})};
  const notes = [d.about, d.attack ? `Attack: ${d.attack}.` : "", d.rule ?? "", h ? `Health: ${bookLevels(d)} levels, the last ${d.end}.` : "",
    d.road !== undefined ? `Road ${d.road}.` : "", ...(d.rules ?? []),
    d.immaterial ? "Has no body: Strength, Dexterity and Stamina are not rated." : "",
    d.terrestrial ? "A terrestrial demon: slain, it is dead, not dispelled." : "",
    d.flies ? "Flies." : ""].filter(Boolean);
  return {update, secondary: base.secondary, disciplines: {...d.disciplines}, paths: {...d.paths}, notes, items: gearOf(d)};
}

/** B7939: a DA:W monster's fomor powers, natural weapons and hide as Item data (the names fomor-powers.js reads). */
export function gearOf(d) {
  const ref = pageOf(d), out = [];
  for ( const name of d.powers ?? [] ) out.push({name, type: "Power", system: {type: "wod.types.power", value: 1, description: `<p>A fomor power (${ref}).</p>`}});
  for ( const w of d.weapons ?? [] ) out.push({name: w.name, type: "Melee Weapon", img: "icons/svg/pawprint.svg",
    system: {isnatural: true, isequipped: true, attack: {attribute: "dexterity", ability: "brawl", secondaryabilityid: "", accuracy: 0, isrollable: true},
      damage: {attribute: "strength", bonus: Number(w.bonus) || 0, type: w.type, isrollable: true}, difficulty: 6, description: `<p>Strength + ${w.bonus}, ${w.type} (${ref}).</p>`}});
  if ( d.armor ) out.push({name: d.armor.name, type: "Armor", img: "icons/svg/shield.svg",
    system: {isequipped: true, soak: {bashing: d.armor.soak, lethal: d.armor.soak, aggravated: d.armor.soak}, description: `<p>${d.armor.soak} more soak dice (${ref}).</p>`}});
  return out;
}
