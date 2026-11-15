/**
 * WoDX NPC: one key per game line for every sheet (B6310). The pure part, no Foundry here.
 *
 * The same keys and families as WoDX Creation's all-lines helper (lines.mjs, B6270), so the two agree. When that
 * helper is loaded (game.modules.get("wodx-creation").api.lines), lineKey prefers it; this copy is the fallback, so
 * WoDX NPC never waits on Creation.
 *
 * Keys: vampire, kuei-jin (a Vampire sheet with the variant kindredeast), ghoul, revenant, werewolf, fera (a Changing
 * Breed sheet), kinfolk, mage, sorcerer, changeling, kinain, wraith, hunter, mummy, demon, mortal, creature, exalted.
 */

export const KEYS = ["vampire", "kuei-jin", "ghoul", "revenant", "werewolf", "fera", "kinfolk", "mage", "sorcerer", "changeling", "kinain",
  "wraith", "hunter", "mummy", "demon", "mortal", "creature", "exalted"];

/** The family a key belongs to: the line whose rules it mostly follows. */
export const FAMILY = {vampire: "vampire", "kuei-jin": "vampire", ghoul: "vampire", revenant: "vampire", werewolf: "werewolf", fera: "werewolf",
  kinfolk: "werewolf", mage: "mage", sorcerer: "mage", changeling: "changeling", kinain: "changeling"};
export const familyOf = key => FAMILY[key] ?? key ?? "mortal";

const low = v => String(v ?? "").toLowerCase().trim();

/**
 * The key for a plain actor ({type, system, flags}). Never null: an unknown sheet is "mortal".
 * api: WoDX Creation's lines api, when there is one; its answer wins when it gives a known key.
 */
export function lineKey(a, api = null) {
  if ( !a ) return "mortal";
  try {
    const k = api?.of?.(a);
    if ( k && KEYS.includes(k) ) return k;
  } catch (e) { /* fall back to the local copy */ }
  const t = low(a.type);
  const variant = low(a.system?.settings?.variant);
  const cf = a.flags?.["wodx-creation"] ?? {}, nf = a.flags?.["wodx-npc"] ?? {};
  if ( t === "vampire" ) return variant === "kindredeast" ? "kuei-jin" : "vampire";
  if ( t === "werewolf" ) return "werewolf";
  if ( t === "changing breed" || t === "changingbreed" ) return "fera";
  if ( t.startsWith("changel") ) return "changeling";
  if ( ["mage", "wraith", "hunter", "mummy", "demon", "exalted"].includes(t) ) return t;
  if ( t === "creature" ) return cf.animalGhoul ? "ghoul" : "creature";
  // A Mortal sheet: the variant first, then the marks WoDX modules leave
  if ( variant === "ghoul" || cf.ghoul || nf.ghoul ) return "ghoul";
  if ( variant === "revenant" || cf.revenant ) return "revenant";
  if ( variant === "kinfolk" || cf.lineage?.kinfolk || nf.kinfolk ) return "kinfolk";
  if ( variant === "sorcerer" ) return "sorcerer";
  if ( variant === "kinain" || cf.kinain ) return "kinain";
  return "mortal";
}

/** Lines whose own nature keeps them from ageing (the undying): the Kindred and Cathayans, mummies, the dead. */
export const UNDYING = new Set(["vampire", "kuei-jin", "mummy", "wraith"]);

/**
 * Lines that must keep their true nature from the mortals they live among, and what a household of mortals under
 * their roof puts at risk (hearts masqueradeRisk). Book basis: the Masquerade (V20), the Kuei-jin's own secrecy
 * (Kindred of the East), the Veil and the Delirium (W20).
 */
export const SECRET = {
  vampire: {what: "the Masquerade", place: "a Kindred's haven"},
  "kuei-jin": {what: "the secrecy of the Cathayans", place: "a Kuei-jin's house"},
  werewolf: {what: "the Veil", place: "a Garou's home", kinfolkSafe: true},
  fera: {what: "the Veil", place: "a shapechanger's home", kinfolkSafe: true}
};

/**
 * The word WoDX NPC's older tables use for a key (hearts, trust, legacy and family): they say kueijin, file a Fera with
 * the Garou, a revenant with the ghouls, and a sorcerer, Kinain, creature or Exalted with the mortals.
 */
const OLD = {"kuei-jin": "kueijin", fera: "werewolf", revenant: "ghoul", sorcerer: "mortal", kinain: "mortal", creature: "mortal", exalted: "mortal"};
export const tableLine = key => OLD[key] ?? key ?? "mortal";
