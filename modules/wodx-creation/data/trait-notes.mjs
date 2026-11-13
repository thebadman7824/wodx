/**
 * Short Trait explanations for the character wizard (WoDX Creation 0.29.0, B3007 to B3009). WoDX's own words, no book
 * text. The common Traits (Attributes, Abilities, Virtues, Willpower and the main pools) take their line from the
 * player view's hover help in WoDX Sheets, so each Trait has one text in the whole of WoDX; this file holds only the
 * Traits that help does not cover, and the page refs.
 *
 * NOTES: key (lower case, letters only) -> text.
 * REFS: line id -> {group or trait key -> "pdf N / printed M"}, the page where the book describes that group or
 * Trait. Filled from the PC's book check; a ref that is not known yet is left out and nothing is shown.
 */
export const NOTES = {
  // Hunters and the inquisition
  zeal: "Burning to act against the monsters. Rolled to strike first and push on.",
  mercy: "Compassion, even for the damned. Rolled to save, protect and forgive.",
  vision: "Seeking to understand what the monsters are. Rolled to see the truth of a thing.",
  // Demon
  torment: "How far the Abyss twisted the Fallen. When it runs high the demon's darker nature shows.",
  // Mummy
  balance: "Harmony between the mummy's souls. It keeps the self whole across deaths.",
  sekhem: "The life force that raises a mummy and powers Hekau.",
  // Kindred of the East
  hun: "The higher soul: reason, duty and restraint.",
  po: "The lower soul, the demon within: hunger, rage and appetite.",
  yin: "Cold, dark, passive chi, drawn from death and the shadows.",
  yang: "Hot, bright, active chi, drawn from life and the sun.",
  dharma: "How far along the chosen path to enlightenment the Kuei-jin has come.",
  // Orpheus
  vitality: "The life a projector carries out of the body. Spent to work Horrors and keep going.",
  spite: "Hatred and harm the dead carry. It feeds dark powers and drags toward the Spectres.",
  // Paths and Roads
  path: "A code that stands in for Humanity: a vampire's own way of keeping the Beast in hand.",
  // Abilities some lines add
  meditation: "Calming and focusing the mind; a mage's aid to a clear will.",
  research: "Finding what is written: libraries, archives and records.",
  esoterica: "Odd and secret knowledge of one narrow field.",
  gremayre: "Changeling lore: the courts, the kiths, the Dreaming's old ways.",
  lore: "Knowledge of one hidden people or power, learned and kept."
};

/** Book page refs for the wizard's notes, from the PC's book lookup of 13 November 2026 (by section headings; "(creation)"
 * marks the creation summary where no section of its own was found). B3009. */
export const REFS = {
  v20: {"attributes": "pdf 104 / printed 96", "talent": "pdf 108 / printed 100", "skill": "pdf 111 / printed 103", "knowledge": "pdf 115 / printed 107", "virtues": "pdf 127 / printed 119", "willpower": "pdf 128 / printed 120", "humanity": "pdf 94 / printed 86 (creation)", "bloodpool": "pdf 129 / printed 121"},
  vtda20: {"attributes": "pdf 160 / printed 159", "talent": "pdf 163 / printed 162", "skill": "pdf 167 / printed 166", "knowledge": "pdf 171 / printed 170", "virtues": "pdf 184 / printed 183", "willpower": "pdf 185 / printed 184", "road": "pdf 185 / printed 184", "bloodpool": "pdf 185 / printed 184"},
  w20: {"attributes": "pdf 116 / printed 114", "talent": "pdf 128 / printed 126", "skill": "pdf 131 / printed 129", "knowledge": "pdf 134 / printed 132", "willpower": "pdf 148 / printed 146", "rage": "pdf 146 / printed 144", "gnosis": "pdf 148 / printed 146"},
  m20: {"attributes": "pdf 274 / printed 273", "talent": "pdf 276 / printed 275", "skill": "pdf 280 / printed 279", "knowledge": "pdf 284 / printed 283", "willpower": "pdf 337 / printed 336", "arete": "pdf 254 / printed 253", "quintessence": "pdf 254 / printed 253", "paradox": "pdf 239 / printed 238"},
  wr20: {"attributes": "pdf 196 / printed 131", "talent": "pdf 198 / printed 133", "skill": "pdf 200 / printed 135", "knowledge": "pdf 202 / printed 137", "willpower": "pdf 180 / printed 115", "corpus": "pdf 179 / printed 114", "pathos": "pdf 179 / printed 114", "angst": "pdf 299 / printed 234"},
  c20: {"attributes": "pdf 161 / printed 160", "talent": "pdf 163 / printed 162", "skill": "pdf 165 / printed 164", "knowledge": "pdf 167 / printed 166", "willpower": "pdf 173 / printed 172", "glamour": "pdf 168 / printed 167", "banality": "pdf 174 / printed 173"},
  demon: {"attributes": "pdf 137 / printed 136", "talent": "pdf 141 / printed 140", "skill": "pdf 145 / printed 144", "knowledge": "pdf 149 / printed 148", "virtues": "pdf 159 / printed 158", "willpower": "pdf 163 / printed 162", "faith": "pdf 160 / printed 159", "torment": "pdf 161 / printed 160"},
  htr: {"attributes": "pdf 102 / printed 101", "knowledge": "pdf 115", "virtues": "pdf 84 / printed 83 (creation)", "willpower": "pdf 142 / printed 141", "zeal": "pdf 84 / printed 83 (creation)", "mercy": "pdf 128 / printed 127", "vision": "pdf 84 / printed 83 (creation)"},
  mummy: {"willpower": "pdf 66 / printed 65", "sekhem": "pdf 82 / printed 81"},
  kote: {"hun": "pdf 71", "po": "pdf 83"}
};

/** Lines built from another line's book: ghouls and revenants from V20. */
export const REF_ALIAS = {ghoul: "v20", revenant: "v20"};

/** A label or key as the notes look it up: lower case, letters only. */
export const noteKey = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * The note for one Trait: {text, ref}. help: the player view's helpFor (WoDX Sheets), or null when that module is
 * not there; group: the Trait's group ("attributes", "talent", "skill", "knowledge", "virtues", ...) for the ref.
 */
export function traitNote(label, lineId, {help = null, group = null} = {}) {
  const k = noteKey(label);
  let text = "";
  try { text = (typeof help === "function" ? help(label) : "") || ""; } catch (e) { text = ""; }
  if ( !text ) text = NOTES[k] ?? "";
  const refs = REFS[REF_ALIAS[lineId] ?? lineId] ?? {};
  return {text, ref: refs[k] ?? (group ? refs[group] : null) ?? null};
}
