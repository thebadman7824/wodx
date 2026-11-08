/**
 * Era advancement (B83): what Pass the Years proposes for each line beyond Phase 4's rules. Book rules carry their page;
 * "WoDX choice" marks what the books leave open. Each optional rule sits behind a house-rule switch in WoDX Chronicle.
 * Design: "WoDX: Carrying a Character Across Eras".
 */

/** The house-rule switches (WoDX Chronicle, rule.<id>) and what each one sets. */
export const SWITCHES = {
  thickBlood: "yearsThickBlood",
  decline: "yearsMortalDecline",
  drift: "yearsMoralityDrift",
  xp: "yearsExperience",
  convert: "yearsConvertAbilities"
};

/** Mortal decline: at these ages a Physical dot is lost; the player picks which (WoDX choice). */
export const DECLINE = {source: "WoDX choice", ages: [60, 70, 80], physical: ["strength", "dexterity", "stamina"]};

/**
 * Thick blood: the vampire may drop a Generation for each full century awake, never below the floor by time alone,
 * and each step costs a dot of Humanity or Road (WoDX's version of the rumour, V20 Dark Ages pdf pp. 33, 35).
 */
export const THICK_BLOOD = {source: "WoDX choice (V20 Dark Ages pdf p. 33 calls it a rumour)", yearsPerStep: 100, floor: 8, noAnimalBloodAt: 6};

/** Morality drift: for each century awake, Conscience or Conviction at difficulty 7; a failure costs a dot (WoDX choice). */
export const DRIFT = {source: "WoDX choice", yearsPerRoll: 100, difficulty: 7};

/** Experience for the years: a point a year awake and active, capped per skip (WoDX choice). */
export const YEARS_XP = {source: "WoDX choice", perYear: 1, cap: 10};

/** Backgrounds: a dot per untended decade; these reset in a new era (WoDX choice). Shown unticked (B83). */
export const BACKGROUNDS = {
  source: "WoDX choice",
  yearsPerDot: 10,
  decays: ["allies", "contacts", "herd", "influence", "mentor", "retainers", "fame"],
  societal: ["status", "domain", "influence"]
};

/**
 * Dark Ages Abilities and their later counterparts (WoDX choice). `to` is a key of the system's own ability list;
 * `or` lists alternatives the player may pick. The old Ability stays on the sheet at 0, so the move can be undone.
 */
export const ABILITY_CONVERSION = [
  {from: "Archery", to: "firearms", note: "Archery stays for a character who still shoots a bow"},
  {from: "Ride", to: "drive", keepIn: ["victorian"], note: "Ride stays on Victorian sheets"},
  {from: "Commerce", to: "finance"},
  {from: "Legerdemain", to: "larceny"},
  {from: "Hearth Wisdom", to: "survival", or: ["occult"], note: "The player picks one"},
  {from: "Seneschal", to: "bureaucracy", or: ["finance"]},
  {from: "Theology", to: "religion", or: ["academics"]},
  {from: "Herbalism", to: "medicine", or: ["esoterica"]},
  {from: "Gramarye", to: "gremayre", note: "Same key in the system"}
];

/**
 * Dark Ages Roads to V20 morality (WoDX choice, B83). Keys are WoDX Actions' road keys (roads-daw.json); targets are the
 * system's own Path keys (wod.advantages.path.<key>), which follow V20's core list. A row with `or` lets the
 * Storyteller pick; the first is the default.
 */
export const ROAD_TO_PATH = {
  humanity: {to: "humanity"},
  beast: {to: "feralheart"},
  kings: {to: "innervoice", or: ["accord"], note: "Chivalry-minded Kings may take Honorable Accord"},
  heaven: {to: "humanity", or: ["accord"], note: "V20 has no Road of Heaven"},
  lilith: {to: "lilith"},
  metamorphosis: {to: "metamorphosis"},
  sin: {to: "cathari", or: ["night"]},
  bones: {to: "bones", note: "The system's Path of the Bones"},
  paradox: {to: "paradox"},
  set: {to: "typhon"},
  abyss: {to: "night"},
  yasa: {to: "humanity", or: ["accord"], note: "No V20 Path matches; the Storyteller picks"}
};

/** WoDX era profiles before the Victorian age (Dark Ages rules) and the modern ones. */
export const DA_ERAS = ["dark-ages", "long-night"];

/**
 * Lines that exist only in some years (B83): outside them a character is refused unless the Storyteller allows it
 * with the sheet flag. Years are inclusive; null is open.
 */
export const LINE_YEARS = {
  demon: {from: 1999, to: null, why: "Before 1999 the fallen are still in the Abyss (Demon pp. 13, 65)"},
  mummy: {from: 1999, to: null, why: "The Reborn are joined after the Sixth Great Maelstrom (Mummy pdf pp. 6, 15)"},
  imbued: {from: 1999, to: null, why: "The Imbuing begins in 1999 (B42)"},
  orpheus: {from: 2000, to: 2010, why: "Orpheus belongs to the early 2000s (Orpheus, 2003)"}
};

/** Garou tribes lost by era (W20 pp. 39–41, pdf 41–43). `goneBy` is the first year a living member is impossible. */
export const LOST_TRIBES = [
  {tribe: "White Howlers", goneBy: 100, became: "Black Spiral Dancers", why: "Fell to the Wyrm in the 1st century (W20 p. 39)"},
  {tribe: "Croatan", goneBy: 1591, why: "Gave themselves at Roanoke (W20 p. 40)"},
  {tribe: "Bunyip", goneBy: 1900, why: "Hunted out in the War of Tears as Europeans settled Australia (W20 pp. 40–41)"}
];

/** Dark Ages fae across the Shattering: the Storyteller picks per character (B83), Rebirth by default. */
export const FAE_CROSSING = {
  source: "C20 pp. 35–37: the Shattering culminates with the Black Plague; the Resurgence begins on 20 July 1969",
  options: [
    {value: "rebirth", label: "Rebirth: a new mortal life and Chrysalis; the old life becomes Remembrance"},
    {value: "return", label: "Return: leaves at the Shattering and comes back at the Resurgence, rebuilt for C20"}
  ],
  // A Dark Ages fae whose skip crosses this year faces the Shattering (the Black Plague, 1347–1351)
  shattering: 1350,
  resurgence: 1969
};

/** WoDX's own Dark Ages records (flags on wodx-actions) and what becomes of them across into a later era. */
export const DA_RECORDS = {
  daMage: "The Fellowship gives the Tradition, the Pillars give Spheres, Twilight becomes Paradox; the flag's system is set to m20",
  daFae: "Court, Origin, Dominions, Mists and Weaving go to the notes; the Remembrance Background carries the old life",
  inquisitor: "The Order, Superior Virtues and Piety become a mortal hunter's notes; True Faith stays"
};
