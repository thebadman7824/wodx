/**
 * WoDX Chronicle: what a derangement does in play (B3913). No Foundry calls here; derangements.mjs does the rest.
 *
 * The derangements of the V20 core list and the Revised Storyteller list (Phobia, Perfection), in WoDX's own words.
 * When one is set off, the character rolls Willpower to hold it off for the scene, or spends a Willpower point to
 * hold it off without a roll (V20). On a failure it has them for the scene: each entry names the rolls it makes
 * harder (roll tags, as the trait table uses them), and Phobia adds a held move: they flee or freeze unless they
 * roll Courage. A derangement gained from a Virtue loss (a frenzy botch, a Conscience or Humanity botch) is written
 * into the sheet's Derangements box. The difficulties and roll effects are house readings of the books' prose.
 */
import {DERANGEMENTS} from "../data/signatures.mjs";

/** How long one bout lasts: a scene, read as an hour of game time. */
export const SCENE_SECONDS = 3600;

/** key → {label, trigger, hold (Willpower difficulty), mods: [{tags, diff, note}], held, grip}. tags [] = every roll. */
export const TABLE = {
  paranoia: {label: "Paranoia", trigger: "Anyone they do not trust comes close, asks questions or offers help.", hold: 7,
    mods: [{tags: ["social"], diff: 2, note: "they trust no one in the room"}], grip: "Everyone here is in on it."},
  megalomania: {label: "Megalomania", trigger: "Someone gives them an order, outshines them or refuses them.", hold: 7,
    mods: [{tags: ["social"], diff: 1, note: "they talk down to everyone"}, {tags: ["leadership"], diff: -1, note: "they are certain"}], grip: "They must be obeyed, now."},
  schizophrenia: {label: "Schizophrenia", trigger: "Strain, noise, or being left alone with their thoughts.", hold: 7,
    mods: [{tags: ["perception"], diff: 2, note: "the voices talk over everything"}], grip: "The voices have something to say."},
  obsession: {label: "Obsession", trigger: "The thing they fixate on is near, or someone gets in the way of it.", hold: 6,
    mods: [{tags: ["perception", "awareness"], diff: 1, note: "nothing else gets through"}], grip: "Nothing matters but the one thing."},
  multiple: {label: "Multiple personalities", trigger: "Fear, pain, or something the other self cares about.", hold: 7,
    mods: [{tags: ["social"], diff: 1, note: "the other self is speaking"}], grip: "Someone else is at the wheel for a while."},
  regression: {label: "Regression", trigger: "Being blamed, cornered or made to choose.", hold: 6,
    mods: [{tags: ["intelligence", "wits", "leadership"], diff: 2, note: "they act like a frightened child"}], grip: "Someone else has to decide."},
  hysteria: {label: "Hysteria", trigger: "Stress, pain, an insult, or the smell of blood.", hold: 7,
    mods: [{tags: ["frenzy"], diff: 2, note: "it takes little to set them off"}], grip: "Every feeling is too big."},
  manic: {label: "Manic-depression", trigger: "A failure or a loss (the low), or a win (the high).", hold: 6,
    mods: [{tags: [], diff: 1, note: "the low swing: nothing seems worth doing"}], grip: "The mood swings hard."},
  animism: {label: "Sanguinary animism", trigger: "Drinking blood, above all to the last drop.", hold: 7,
    mods: [{tags: ["perception", "social"], diff: 1, note: "the victim's thoughts crowd in"}], grip: "The victim's memories feel like their own."},
  fugue: {label: "Fugue", trigger: "Great stress or a shock.", hold: 8,
    mods: [{tags: [], diff: 1, note: "they come to hours later, in an odd place"}], grip: "The Storyteller plays them until the bout ends; they remember none of it."},
  synesthesia: {label: "Synesthesia", trigger: "A sudden rush of sound, colour or smell.", hold: 6,
    mods: [{tags: ["sight", "hearing"], diff: 1, note: "senses blur together"}, {tags: ["awareness"], diff: -1, note: "they feel what others miss"}], grip: "Sounds have colours and colours have tastes."},
  bulimia: {label: "Bulimia", trigger: "Stress or a loss of control.", hold: 7,
    mods: [{tags: ["frenzy"], diff: 1, note: "they must feed, or eat, to calm down"}], grip: "They must feed, and far too much."},
  perfection: {label: "Perfection", trigger: "Something goes wrong or is out of place.", hold: 7,
    mods: [{tags: [], diff: 1, note: "everything has to be put right first"}], grip: "Everything must be just so."},
  phobia: {label: "Phobia", trigger: "The thing they fear is in front of them.", hold: 7,
    mods: [{tags: [], diff: 2, note: "terror while the fear is near"}], held: "flee", grip: "They flee or freeze unless they roll Courage (difficulty 7)."}
};

/** Match words for the entries the talk table does not cover. */
const EXTRA_MATCH = {bulimia: ["bulimia", "bulimic"], perfection: ["perfection", "perfectionist"], phobia: ["phobia", "phobic", "terror of", "fear of"]};
const MATCH = Object.fromEntries(Object.keys(TABLE).map(k => [k, EXTRA_MATCH[k] ?? DERANGEMENTS.find(d => d.key === k)?.match ?? [k]]));

/** The derangements written in the sheet's box, in table order. */
export function keysIn(text) {
  const t = String(text ?? "").toLowerCase();
  return Object.keys(TABLE).filter(k => MATCH[k].some(m => t.includes(m)));
}

/** What a bout does to one roll: [{key, name, dice, diff, note}] for the trait effect channel. */
export function boutEffects(keys = [], ctx = {}) {
  if ( ctx.channel !== "roll" ) return [];
  const tags = (ctx.tags ?? []).map(t => String(t).toLowerCase());
  const out = [];
  for ( const k of keys ) {
    const e = TABLE[k];
    if ( !e ) continue;
    for ( const m of e.mods ) {
      if ( m.tags.length && !m.tags.some(t => tags.includes(t)) ) continue;
      out.push({key: `derangement-${k}`, name: e.label, dice: 0, diff: m.diff, note: m.note});
    }
  }
  return out;
}

/** A bout still running at this world time. */
export const boutLive = (bout, now) => !!bout?.keys?.length && Number(now) - Number(bout.at ?? -Infinity) < SCENE_SECONDS && Number(now) >= Number(bout.at);

/**
 * B6161: does the end of a scene end this bout? ended: the scene that ended (null: the scene, whichever it is);
 * active: a scene just made active, which ends a bout begun on another one. A bout from before B6161 has no
 * sceneId: any scene's end, or any change of scene, ends it.
 */
export function boutEndsWithScene(bout = {}, {ended, active} = {}) {
  const at = bout?.sceneId ?? null;
  if ( active !== undefined ) return !at || at !== active;
  if ( ended !== undefined ) return !ended || !at || at === ended;
  return false;
}

/** The Willpower roll's outcome: {held, line}. botch: they lose the scene to it and the bout is worse. */
export function holdResult(key, roll = {}) {
  const e = TABLE[key];
  if ( !e ) return {held: true, line: ""};
  if ( roll.botch ) return {held: false, botch: true, line: `${e.grip} A botch: the bout takes them hard.`};
  if ( (Number(roll.successes) || 0) >= 1 ) return {held: true, line: `They hold off the ${e.label.toLowerCase()} for the scene.`};
  return {held: false, line: e.grip};
}

/** What a Virtue loss can leave behind, by its cause. */
export const FROM_CAUSE = {
  frenzy: ["hysteria", "bulimia", "paranoia", "animism"],
  sin: ["obsession", "regression", "fugue", "manic", "multiple", "perfection"],
  fear: ["phobia", "paranoia", "hysteria"],
  loss: ["fugue", "regression", "obsession", "paranoia", "hysteria"],
  binding: ["multiple", "schizophrenia", "paranoia", "fugue"],
  other: ["paranoia", "obsession", "manic", "phobia", "regression"]
};

/** A new derangement for a loss: the first not already held, picked from the cause's list by r in [0,1). */
export function pickNew(cause, have = [], r = 0) {
  const list = (FROM_CAUSE[cause] ?? FROM_CAUSE.other).filter(k => !have.includes(k));
  if ( !list.length ) return null;
  return list[Math.min(list.length - 1, Math.floor(Math.max(0, r) * list.length))];
}

/** The line written into the box for a new derangement: "Hysteria (from a frenzy botch)". */
export const boxLine = (key, why) => `${TABLE[key]?.label ?? key}${why ? ` (${why})` : ""}`;

/** The box text with a new line added, unless it already names that derangement. */
export function addToBox(text, key, why) {
  const t = String(text ?? "").trim();
  if ( keysIn(t).includes(key) ) return t;
  return t ? `${t}\n${boxLine(key, why)}` : boxLine(key, why);
}
