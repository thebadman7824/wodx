/**
 * Every line, one key each (B6270). lineOf() in actor-data.mjs keeps answering only for the lines WoDX Creation has
 * always handled (vampire, ghoul, mortal); this answers for all of them, so the spend window, the Creation tools and
 * the other WoDX modules can treat every line alike. Pure: it reads only the actor it is given.
 *
 *   splatOf(actor)  -> "vampire" | "kuei-jin" | "ghoul" | "revenant" | "werewolf" | "fera" | "kinfolk" | "mage" |
 *                      "sorcerer" | "changeling" | "kinain" | "wraith" | "hunter" | "mummy" | "demon" | "mortal" |
 *                      "creature" | "exalted" | null
 *   lineInfo(actor) -> {key, family, sheet, variant, label}
 *
 * family groups the keys the way the books do: kuei-jin, ghoul and revenant are "vampire"-family (they spend blood or
 * chi and learn Disciplines), fera and kinfolk are "werewolf"-family, sorcerer is "mage"-family, kinain is
 * "changeling"-family. Game API: game.modules.get("wodx-creation").api.lines.{of, info, family, keys, label}.
 */
export const MODULE_ID = "wodx-creation";

export const LINES = Object.freeze({
  "vampire":    {family: "vampire",    label: "Kindred"},
  "kuei-jin":   {family: "vampire",    label: "Kuei-jin"},
  "ghoul":      {family: "vampire",    label: "Ghoul"},
  "revenant":   {family: "vampire",    label: "Revenant"},
  "werewolf":   {family: "werewolf",   label: "Garou"},
  "fera":       {family: "werewolf",   label: "Fera"},
  "kinfolk":    {family: "werewolf",   label: "Kinfolk"},
  "mage":       {family: "mage",       label: "Mage"},
  "sorcerer":   {family: "mage",       label: "Sorcerer"},
  "changeling": {family: "changeling", label: "Changeling"},
  "kinain":     {family: "changeling", label: "Kinain"},
  "wraith":     {family: "wraith",     label: "Wraith"},
  "hunter":     {family: "hunter",     label: "Hunter"},
  "mummy":      {family: "mummy",      label: "Mummy"},
  "demon":      {family: "demon",      label: "Fallen"},
  "mortal":     {family: "mortal",     label: "Mortal"},
  "creature":   {family: "creature",   label: "Creature"},
  "exalted":    {family: "exalted",    label: "Exalted"}
});
export const KEYS = Object.freeze(Object.keys(LINES));

/** Actor types as the system names them; the CONFIG table wins where it is set. */
const SHEETS = {
  vampire: "Vampire", mortal: "Mortal", creature: "Creature", werewolf: "Werewolf", changingbreed: "Changing Breed",
  mage: "Mage", changeling: "Changeling", wraith: "Wraith", hunter: "Hunter", mummy: "Mummy", demon: "Demon", exalted: "Exalted"
};
function sheetOf(actor) {
  const types = globalThis.CONFIG?.worldofdarkness?.sheettype ?? {};
  for ( const [k, v] of Object.entries(SHEETS) ) if ( actor?.type === (types[k] ?? v) ) return k;
  return null;
}

const flag = (actor, k) => actor?.flags?.[MODULE_ID]?.[k];

export function splatOf(actor) {
  if ( !actor ) return null;
  const variant = String(actor.system?.settings?.variant ?? "").toLowerCase();
  switch ( sheetOf(actor) ) {
    case "vampire": return variant === "kindredeast" ? "kuei-jin" : "vampire";
    case "mortal":
      // The same marks WoDX NPC's copy reads (lines-rules.mjs), so the two always agree
      if ( variant === "ghoul" || flag(actor, "ghoul") || actor.flags?.["wodx-npc"]?.ghoul ) return "ghoul";
      if ( variant === "revenant" || flag(actor, "revenant") ) return "revenant";
      if ( variant === "kinfolk" || flag(actor, "lineage")?.kinfolk || actor.flags?.["wodx-npc"]?.kinfolk ) return "kinfolk";
      if ( variant === "sorcerer" ) return "sorcerer";
      if ( variant === "kinain" || flag(actor, "kinain") ) return "kinain";
      return "mortal";
    case "creature": return flag(actor, "animalGhoul") ? "ghoul" : "creature";
    case "werewolf": return "werewolf";
    case "changingbreed": return "fera";
    case "mage": return "mage";
    case "changeling": return "changeling";
    case "wraith": return "wraith";
    case "hunter": return "hunter";
    case "mummy": return "mummy";
    case "demon": return "demon";
    case "exalted": return "exalted";
  }
  return null;
}

export const familyOf = key => LINES[key]?.family ?? null;
export const labelOf = key => LINES[key]?.label ?? "";

export function lineInfo(actor) {
  const key = splatOf(actor);
  return {key, family: familyOf(key), sheet: sheetOf(actor), variant: String(actor?.system?.settings?.variant ?? ""), label: labelOf(key)};
}
