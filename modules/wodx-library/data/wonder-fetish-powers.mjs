/**
 * B6779b: Use buttons for the fetishes whose book names a roll of their own after waking (WoDX Actions' Use a fetish
 * wakes them: a Gnosis roll at the item's Gnosis, W20 p. 221). WoDX's own words; the book page in each text. A roll the
 * book leaves without a difficulty is at 6 (house rule).
 */
const GNOSIS = "system.advantages.gnosis.temporary";
export const FETISH_POWERS = {
  "harmony-flute": [{id: "play", label: "Play the tune (Dexterity + Performance)", roll: {attr: "dexterity", ability: "performance", diff: 6},
    text: "Once it is awake: each angry listener rolls Rage or stops fighting (W20 p. 221). Difficulty 6 is a house rule."}],
  "bane-arrow": [{id: "strike", label: "Loose it at a Bane (three dice, aggravated)", roll: {dice: 3, diff: 6, label: "Aggravated damage"}, consume: true,
    text: "It strikes a Bane without an attack roll, seen or not (W20 p. 228); the talen is used up."}],
  "pipes-of-the-swarm": [{id: "call", label: "Call the swarm (Gnosis at 4)", roll: {path: GNOSIS, diff: 4, label: "Gnosis"},
    text: "A swarm of rats answers, one health level a success (Breedbook: Ratkin pdf p. 73)."}]
};
