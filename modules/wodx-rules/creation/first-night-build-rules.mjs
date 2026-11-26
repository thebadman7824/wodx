/**
 * WoDX Creation 0.13.0: the guided builder's pure part. Which Traits the builder sets dot by dot, read from the
 * sheet's own data: Attributes (1 to 5), Abilities (0 to 5, in the sheet's own Talent, Skill and Knowledge groups)
 * and the Virtues in use (1 to 5). No Foundry here.
 */

export const ATTRS = {physical: ["strength", "dexterity", "stamina"], social: ["charisma", "manipulation", "appearance"], mental: ["perception", "intelligence", "wits"]};
export const VIRTUES = ["conscience", "conviction", "selfcontrol", "instinct", "courage"];
const VIRTUE_LABEL = {conscience: "Conscience", conviction: "Conviction", selfcontrol: "Self-Control", instinct: "Instinct", courage: "Courage"};

const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const nice = k => String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, c => c.toUpperCase());
const labelOf = (key, obj) => (typeof obj?.label === "string" && obj.label && !/^wod\./.test(obj.label) ? obj.label : nice(key));

/** The Traits by group: {physical, social, mental, talent, skill, knowledge, virtues}, each [{path, label, value, min, max}]. */
export function traitGroups(system = {}) {
  const out = {physical: [], social: [], mental: [], talent: [], skill: [], knowledge: [], virtues: []};
  for ( const [g, keys] of Object.entries(ATTRS) ) for ( const k of keys ) {
    if ( !system.attributes?.[k] ) continue;
    out[g].push({path: `system.attributes.${k}.value`, label: nice(k), value: n(system.attributes[k].value), min: 1, max: 5});
  }
  for ( const [k, a] of Object.entries(system.abilities ?? {}) ) {
    if ( !a || typeof a !== "object" || !out[a.type] || a.isvisible === false ) continue;
    out[a.type].push({path: `system.abilities.${k}.value`, label: labelOf(k, a), value: n(a.value), min: 0, max: 5});
  }
  for ( const g of ["talent", "skill", "knowledge"] ) out[g].sort((x, y) => x.label.localeCompare(y.label));
  const v = system.advantages?.virtues ?? {};
  for ( const k of VIRTUES ) {
    if ( !v[k] || !(n(v[k].permanent) > 0 || v[k].isvisible) ) continue;
    out.virtues.push({path: `system.advantages.virtues.${k}.permanent`, label: VIRTUE_LABEL[k], value: n(v[k].permanent), min: 1, max: 5});
  }
  return out;
}

export const allTraits = system => Object.values(traitGroups(system)).flat();

/** Dots as text: ●●●○○ */
export const dots = (v, max = 5) => "●".repeat(Math.min(n(v), max)) + "○".repeat(Math.max(0, max - n(v)));
