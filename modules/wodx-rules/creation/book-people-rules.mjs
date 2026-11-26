/**
 * WoDX Creation: the Storyteller characters of V20 Dark Ages as sheet data (B7674). Pure, no Foundry: the harness
 * tests it; book-people.mjs writes the sheet. A book Ability is a system Ability when the sheet has one by that key
 * ("Crafts" is the system's craft), else a Dark Ages Secondary Ability item (Archery, Commerce, Hearth Wisdom,
 * Legerdemain, Ride, Seneschal, Theology: WoDX Creation data/time.mjs).
 */
import {PEOPLE, BOOK} from "../../wodx-creation/data/vtda-people.mjs";

export const keyOf = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
/** The book's name for an Ability, as the system keys it. */
const ALIAS = {crafts: "craft"};
/** The Dark Ages Secondary Abilities and their groups (data/time.mjs ERA_SECONDARY darkages). */
export const SECONDARY = {legerdemain: "talent", archery: "skill", commerce: "skill", ride: "skill", hearthwisdom: "knowledge", seneschal: "knowledge", theology: "knowledge"};

export const byKey = key => PEOPLE.find(p => p.key === key) ?? null;
export const pageOf = p => `${BOOK} p. ${p.p}`;

/**
 * The sheet plan for one book character. systemKeys: the Ability keys the sheet has. Returns {update, abilities:
 * [{key}], secondary: [{key, name, group, value}], backgrounds: [{name, value}], faith}.
 */
export function planOf(p, systemKeys = []) {
  const keys = new Set(systemKeys);
  const update = {"system.nature": p.nature ?? "", "system.demeanor": p.demeanor ?? "", "system.concept": p.group};
  for ( const [k, v] of Object.entries(p.attributes ?? {}) ) update[`system.attributes.${k}.value`] = v;
  const secondary = [];
  for ( const [name, v] of Object.entries(p.abilities ?? {}) ) {
    const k0 = keyOf(name), k = ALIAS[k0] ?? k0;
    if ( keys.has(k) ) { update[`system.abilities.${k}.value`] = v; update[`system.abilities.${k}.isvisible`] = true; }
    else secondary.push({key: k, name, group: SECONDARY[k] ?? "knowledge", value: v});
  }
  if ( p.willpower ) { update["system.advantages.willpower.permanent"] = p.willpower; update["system.advantages.willpower.temporary"] = p.willpower; }
  for ( const [k, v] of Object.entries(p.virtues ?? {}) ) { update[`system.advantages.virtues.${k}.permanent`] = v; update[`system.advantages.virtues.${k}.temporary`] = v; }
  if ( p.road ) { update["system.advantages.path.permanent"] = p.road.value; update["system.advantages.path.value"] = p.road.value; update["system.advantages.path.label"] = "wod.advantages.path.humanity"; }
  if ( p.faith ) { update["system.advantages.faith.permanent"] = p.faith; update["flags.wodx-actions.trueFaith"] = p.faith; }
  const backgrounds = Object.entries(p.backgrounds ?? {}).map(([name, value]) => ({name, value}));
  return {update, secondary, backgrounds, faith: p.faith ?? 0};
}
