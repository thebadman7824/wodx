/**
 * WoDX Actions: Nature gives Willpower back (B3916). No Foundry calls here.
 *
 * V20: a character regains a point of Willpower when they act to their Nature in a way that matters. Each archetype's
 * cue below is a short WoDX wording of when that happens; the Storyteller decides. Never above the permanent rating.
 */
export const NATURES = {
  architect: ["Architect", "They build something that will outlast them, or lay down a plan others take up."],
  autocrat: ["Autocrat", "They take charge of a group or a situation and it goes their way."],
  "bon vivant": ["Bon Vivant", "They truly enjoy themselves, or bring others into the pleasure."],
  bravo: ["Bravo", "They make someone back down by force or threat."],
  caregiver: ["Caregiver", "They protect or look after someone who needed it."],
  celebrant: ["Celebrant", "They pursue their passion, or win someone over to it."],
  child: ["Child", "Someone takes care of them, or gives them what they wanted."],
  competitor: ["Competitor", "They win a contest that mattered to them."],
  conformist: ["Conformist", "They help the group they belong to reach its aim."],
  conniver: ["Conniver", "They trick someone into doing what they want."],
  curmudgeon: ["Curmudgeon", "Their gloomy prediction comes true, or they point out a flaw no one else saw."],
  deviant: ["Deviant", "They break a custom or offend the proper folk, and get away with it."],
  director: ["Director", "They bring order to chaos, or steer others to a good end."],
  fanatic: ["Fanatic", "They do something real for their cause."],
  gallant: ["Gallant", "They dazzle someone, or are the centre of attention."],
  judge: ["Judge", "They settle a dispute fairly, or find the truth of a matter."],
  loner: ["Loner", "They get something done alone, with no help."],
  martyr: ["Martyr", "They give something up so that someone else gains."],
  masochist: ["Masochist", "They endure pain or hardship and come through it."],
  monster: ["Monster", "They do something truly wicked, by their own choice."],
  pedagogue: ["Pedagogue", "Someone learns something worthwhile from them."],
  penitent: ["Penitent", "They make up for a wrong they did."],
  perfectionist: ["Perfectionist", "They finish a task without a flaw."],
  rebel: ["Rebel", "They defy an authority and it matters."],
  rogue: ["Rogue", "They come out ahead for themselves, at someone else's cost."],
  survivor: ["Survivor", "They come through a danger that should have finished them."],
  "thrill-seeker": ["Thrill-Seeker", "They take a real risk just for the rush."],
  traditionalist: ["Traditionalist", "They keep an old way alive against a change."],
  trickster: ["Trickster", "They lift the mood with a joke or a prank at the right moment."],
  visionary: ["Visionary", "They get others to see or follow their vision."]
};

/** The archetype key in a Nature line ("Caregiver", "the Thrill Seeker"), or null. */
export function natureKey(text) {
  const t = String(text ?? "").toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  if ( !t ) return null;
  const flat = t.replace(/ /g, "");
  return Object.keys(NATURES).find(k => flat.includes(k.replace(/[^a-z]/g, ""))) ?? null;
}

/** The cue for a Nature line: {label, cue} (a line WoDX does not know still gets a plain cue). */
export function cueFor(text) {
  const k = natureKey(text);
  if ( k ) return {key: k, label: NATURES[k][0], cue: NATURES[k][1]};
  const s = String(text ?? "").trim();
  return s ? {key: null, label: s, cue: "They act true to their Nature in a way that matters."} : null;
}

/** Willpower after a point back: never above the permanent rating. */
export const regain = (temporary, permanent) => Math.max(Number(temporary) || 0, Math.min(Number(permanent) || 0, (Number(temporary) || 0) + 1));
