/**
 * B6779: the second pass of the final audit. Merits and flaws whose book gives a number on a roll, which until now
 * only sent the Storyteller a card. Situational ones carry the number as a tick box on the roll (as B6743 did);
 * WoDX's own words, the book's page in each note. EXTRA_PROMPTS gives a card to a flaw that had none.
 */
const tick = (key, label, fx) => ({ch: "roll", tags: [key], tick: label, ...fx});
export const EFFECTS_W6 = {
  "inferiority-complex": [tick("in-charge", "The character has to take charge or answer for how it turns out", {diff: 1, note: "+1 difficulty when in charge or responsible (W20 p. 382)"})],
  "initiate-of-the-road": [tick("road-frenzy", "The roll resists frenzy or Rötschreck", {diff: 1, note: "+1 difficulty to resist frenzy and Rötschreck (V20 Dark Ages p. 426)"})],
  "the-company-of-saints-and-heroes": [tick("famous-friend", "The character name-drops the famous connection on this Social roll", {need: ["social"], diff: -1, note: "-1 difficulty on a Social roll that leans on the connection (V20 Dark Ages p. 423)"})],
  "hyperfocus": [
    tick("focus-hour-1", "A first undistracted hour on this mundane extended task", {dice: 1, note: "+1 die per hour of focus, three at most (M20 Book of Secrets p. 45)"}),
    tick("focus-hour-2", "A second undistracted hour on it", {dice: 1, note: "a second die for the second hour (M20 Book of Secrets p. 45)"}),
    tick("focus-hour-3", "A third undistracted hour on it", {dice: 1, note: "the third and last die (M20 Book of Secrets p. 45)"})]
};
/** Flaws that had neither an effect nor a card. */
export const EXTRA_PROMPTS = {
  "extreme-kink": {on: ["social", "night"], text: "the kink looks for its outlet tonight; at 3 points it can harm health, name and partners, at 4 it can do serious harm, at 5 it can bring prison or worse"}
};
/**
 * Prompted traits whose book names a roll: they roll it themselves when their moment comes (B4879's bites).
 * fail.tell is what a failed roll means, whispered to the player and the Storyteller.
 */
export const BITES_W6 = {
  "soft-hearted": {roll: ["willpower", 8], fail: {tell: "cannot stand to watch the suffering and must look away or leave (V20 p. 485)"}},
  "botched-presentation": {roll: ["willpower", 7], fail: {tell: "is shaken by the memory of the botched presentation before the prince (V20 p. 489)"}},
  "flesh-eater": {roll: ["willpower", 8], fail: {tell: "must eat the flesh along with the blood (V20 Dark Ages p. 422)"}},
  "possessive": {roll: ["willpower", 7], fail: {tell: "will not let go of what is threatened and acts to keep it (C20 p. 185)"}},
  "combat-novice": {roll: ["willpower", 7], fail: {tell: "freezes or runs from the violence (Hunter Hunted II p. 42)"}},
  "banned-transformation": {roll: ["willpower", 8], fail: {tell: "is drawn toward the banned shape and must fight the pull (W20 p. 483)"}},
  "wyld-mind": {roll: ["willpower", 4], fail: {tell: "the mind wanders off into the Wyld and loses the thread (C20 p. 182)"}}
};
