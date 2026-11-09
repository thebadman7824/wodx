/**
 * WoDX Senses 0.5.0: the quiet interface, the pure part. A player who wants less on screen tucks the panels away
 * and reads words where the sheet has numbers. No Foundry in here, so the tests use it directly.
 *
 *   Difficulty  V20's own words for the difficulties 3 to 9 (V20 core, the difficulty table; page still to pin).
 *               2 and below, and 10, are house wording.
 *   Health      the sheet's own health level name, or Unhurt with no damage.
 */
export const DIFFICULTY_WORDS = {3: "easy", 4: "routine", 5: "straightforward", 6: "standard", 7: "challenging", 8: "difficult", 9: "extremely difficult"};

/** A difficulty as a word: "standard" for 6. */
export function difficultyWord(d) {
  const n = Math.round(Number(d));
  if ( !Number.isFinite(n) ) return null;
  if ( n <= 2 ) return "trivial";
  if ( n >= 10 ) return "all but impossible";
  return DIFFICULTY_WORDS[n];
}

/** A line of a roll card with each "Difficulty: 6" put in words. Other text is left as it is. */
export function quietText(text) {
  return String(text ?? "").replace(/(Difficulty:?\s*)(\d{1,2})\b/gi, (m, lead, d) => `${lead}${difficultyWord(d) ?? d}`);
}

/** The health level as a word: the sheet's level name (already in the player's language), or Unhurt. */
export function healthWord(level) {
  const s = String(level ?? "").trim();
  return s ? s : "Unhurt";
}

/** The panels the quiet interface tucks away; the scene controls stay, so nothing is out of reach. */
export const TUCKED = ["#sidebar", "#hotbar", "#players"];
