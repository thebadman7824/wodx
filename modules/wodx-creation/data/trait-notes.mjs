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

/** Book page refs for the wizard's notes. Only refs checked against the book go here. */
export const REFS = {};

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
  const refs = REFS[lineId] ?? {};
  return {text, ref: refs[k] ?? (group ? refs[group] : null) ?? null};
}
