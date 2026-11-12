/**
 * WoDX Chronicle 0.44.0: story chains grown from lifepath threads (Improvement Desk 2026-11-12b cr2). House rule
 * B2300 to B2304: the books ask for a prelude and for a past that matters, but give no table for when it comes back.
 *
 * Each kind of open thread has a short chain of three steps. {who} is the person (by name when the lifepath made
 * them an NPC), {name} the character, {where} the chain's place, {word} and {seek} the way news travels in the year
 * of play, {turning} what the line calls its turn.
 */

const step = (key, title, text, days) => ({key, title, text, days});

/** How news reaches someone, and how someone is sought, by the year of play. */
export const MEANS = [
  {to: 1499, word: "Word comes with a pedlar on the road.", seek: "A stranger has been asking at inns and churches."},
  {to: 1799, word: "A letter arrives under a stranger's seal.", seek: "Someone has paid a searcher to ask in every parish."},
  {to: 1945, word: "A telegram arrives.", seek: "A notice in the newspapers asks after {name} by an old name."},
  {to: 2022, word: "A call comes from a number nobody gave out.", seek: "A private investigator has been asking questions."},
  {to: 99999, word: "A message slips past every filter.", seek: "A data broker has sold {name}'s trail."}
];
export const meansFor = year => MEANS.find(m => (Number(year) || 0) <= m.to) ?? MEANS[MEANS.length - 1];

export const LP_DAYS = {first: 14, gap: 30};
export const LP_PAGE = "House rule (lifepath threads)";

export const LP_CHAINS = {
  enemy: {label: "An old enemy", steps: [
    step("asking", "Someone asking", "{seek} {Who} is looking for {name}.", 0),
    step("warning", "A warning", "Something of {name}'s is harmed: a door forced, a friend frightened, a servant hurt. {Who} wants it known.", 7),
    step("reckoning", "The reckoning", "{Who} strikes, or offers terms. The Storyteller decides which, from what {name} has done since.", 14)]},
  rival: {label: "An old rival", steps: [
    step("name", "A familiar name", "{word} {Who} is in {where} and has heard that {name} is here.", 0),
    step("slight", "The slight returns", "{Who} moves against {name}'s standing: a rumour, a lost client, a word in the right ear.", 10),
    step("face", "Face to face", "{Who} and {name} meet. It settles the old score, or makes it a feud.", 14)]},
  debt: {label: "A debt called in", steps: [
    step("called", "The debt is called", "{word} {Who} wants what is owed.", 0),
    step("price", "The price", "The repayment is named: a favour that costs {name} something they value, or a task they would rather not do.", 7),
    step("paid", "Paid or broken", "The debt is paid, or broken. A broken debt follows {name} as a broken boon would.", 14)]},
  owed: {label: "A debt owed to them", steps: [
    step("face", "A face from the past", "{Who} turns up in {where}, in need, and remembers what {name} once did.", 0),
    step("help", "Help, or a burden", "{Who} can repay the old debt now, or asks for more first. The help is real, and so is the risk of being seen together.", 7),
    step("square", "Square", "The debt is settled one way or the other. {Who} becomes an ally, a hanger-on or a loose end.", 14)]},
  secret: {label: "Someone who knows", steps: [
    step("remembers", "Someone remembers", "{word} {Who} knows something of {name}'s past that {name} would rather stayed buried.", 0),
    step("asking", "The asking price", "{Who} wants something to keep quiet, or has told someone already.", 10),
    step("out", "Out, or buried", "The secret comes out, or is buried deeper. Either way someone else now has a hold on {name}.", 14)]},
  lost: {label: "Someone lost", steps: [
    step("trace", "A trace", "{seek} {Who} has been looking for {name}, or {name} hears where they may be.", 0),
    step("close", "Close", "{Who} is near. Meeting them means explaining the years, and what {name} became at {turning}.", 14),
    step("found", "Found", "{name} and {who} meet, or one turns away at the last. A tie is renewed or lost.", 14)]},
  promise: {label: "An old promise", steps: [
    step("reminder", "The old promise", "{word} {Who} reminds {name} of what was sworn.", 0),
    step("cost", "Kept or not", "Keeping the promise now means danger or cost. {name} must choose.", 10),
    step("after", "After", "The promise is kept or broken. {Who} remembers either way.", 14)]},
  hunted: {label: "The hunter from the past", steps: [
    step("questions", "A stranger's questions", "{seek} Someone is on {name}'s trail.", 0),
    step("behind", "Close behind", "Signs that the hunter is near: a mark on a door, a tail in the street, a name in the wrong mouth.", 7),
    step("shows", "The hunter shows", "The hunter acts. It can run on into a fight, a chase or a deal.", 10)]}
};
