/**
 * The Inheritance step (B3530 to B3533), the pure part. When a character dies or leaves play, the Storyteller picks
 * the heir and ticks what passes on. Money divided by law stays with the estate card (wills.mjs); this step moves
 * the rest. No Foundry here.
 *
 *   PARTS          what can pass: items and fetishes, havens and places held, the purse, Ledger entries, rivals, ties
 *   ITEM_TYPES     the system's carried item types (the sheet's traits and powers stay with the dead)
 *   heirChoices()  the people to offer as heir, best first: the will's heir, the named heir, kin, then the rest
 *   memoryKind()   how the heir's line remembers the dead: a Garou's Ancestors, a mage's Past Lives, or none
 */

export const PARTS = {
  items: {label: "Items and fetishes", hint: "Everything carried: gear, weapons, armour, fetishes and talismans."},
  places: {label: "Havens and places held", hint: "Scenes and places whose owner record names the dead."},
  purse: {label: "Money left in the purse and bank", hint: "Whatever the estate card has not already divided."},
  ledger: {label: "Boons, debts and oaths in the Ledger", hint: "The dead's side of every open entry becomes the heir's."},
  rivals: {label: "Rivals", hint: "People who hated the dead now look on the heir the same way; feuds of the family already pass by name."},
  ties: {label: "Ties", hint: "The dead's own ties are copied to the heir, marked as known through the dead."}
};
export const PART_KEYS = Object.keys(PARTS);
export const ITEM_TYPES = ["Item", "Fetish", "Armor", "Melee Weapon", "Ranged Weapon"];
/** How badly someone must regard the dead for the grudge to pass on (WoDX NPC attitude steps, -3 to +3). */
export const RIVAL_STEP = -2;

/** Which parts are ticked when the window opens: all but the purse when an estate card handles money. */
export function defaults({estate = false} = {}) {
  return Object.fromEntries(PART_KEYS.map(k => [k, !(k === "purse" && estate)]));
}

/**
 * The people to offer as heir, best first. dead: {id}; will: the will's main heir id; named: the Ledger's named heir id;
 * kin: [{id, why}] from the dead's ties; others: [{id, name}] every other living actor. Returns [{id, why}] without repeats.
 */
export function heirChoices({dead = null, will = null, named = null, made = null, kin = [], others = []} = {}) {
  const out = [], seen = new Set([dead]);
  const add = (id, why) => { if ( id && !seen.has(id) ) { seen.add(id); out.push({id, why}); } };
  add(will, "named in the will");
  add(named, "named heir in the Ledger");
  add(made, "the heir Pass the Years made");
  for ( const k of kin ) add(k.id, k.why ?? "kin");
  for ( const o of others ) add(o.id, "");
  return out;
}

/**
 * How the heir's line keeps the dead in memory, so a recall can reach them: a Garou with Ancestors (W20), a mage's
 * Past Lives or Avatar (M20). The heir must be of the dead's blood or line for Ancestors; a mage's past lives can be
 * anyone's. Returns "ancestor", "pastLife" or null. line: the heir's line ("werewolf", "mage", ...).
 */
export function memoryKind({line = "", backgrounds = [], kin = false} = {}) {
  const has = n => backgrounds.some(b => String(b).toLowerCase() === n);
  if ( (line === "werewolf" || line === "kinfolk") && kin && has("ancestors") ) return "ancestor";
  if ( line === "mage" && (has("past lives") || has("avatar")) ) return "pastLife";
  return null;
}

/** The heir's copies of the dead's own ties: not the heir themselves, marked as known through the dead. */
export function tiesFor(ties = [], {heirUuid = "", deadName = ""} = {}) {
  return (ties ?? []).filter(t => t?.uuid && t.uuid !== heirUuid).slice(0, 40)
    .map(t => ({uuid: t.uuid, role: String(t.role ?? "").slice(0, 60), note: `Known through ${deadName}${t.note ? `: ${String(t.note).slice(0, 80)}` : ""}`, hidden: !!t.hidden}));
}

/** Merge ties into a list without doubling anyone already there. */
export function mergeTies(have = [], add = []) {
  const ids = new Set((have ?? []).map(t => t?.uuid));
  return [...(have ?? []), ...add.filter(t => !ids.has(t.uuid))];
}

/** One line for the log of what passed. */
export function summary(done = {}, {dead = "", heir = ""} = {}) {
  const parts = [];
  if ( done.items ) parts.push(`${done.items} item${done.items === 1 ? "" : "s"}`);
  if ( done.places ) parts.push(`${done.places} place${done.places === 1 ? "" : "s"}`);
  if ( done.purse ) parts.push("the money left");
  if ( done.ledger ) parts.push(`${done.ledger} Ledger entr${done.ledger === 1 ? "y" : "ies"}`);
  if ( done.rivals ) parts.push(`${done.rivals} rival${done.rivals === 1 ? "" : "s"}`);
  if ( done.ties ) parts.push(`${done.ties} tie${done.ties === 1 ? "" : "s"}`);
  if ( done.memory ) parts.push(done.memory === "ancestor" ? "a place among the Ancestors" : "a past life to recall");
  return `${heir} inherits from ${dead}: ${parts.length ? parts.join(", ") : "nothing"}.`;
}
