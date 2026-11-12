/**
 * WoDX Creation 0.13.0: the prelude runner and the troupe ties, the pure part (Chronicle Start Desk p1 to p3, t1,
 * t2). No Foundry here.
 *
 * The runner plays a prelude scene by scene: the lifepath's scenes first (the life before), then the line's
 * template from WoDX Storyteller (before, the turn, after). A short prelude, for a character who joins a chronicle
 * already under way, keeps only the turn and after. Any beat can call a roll with stakes; a failed roll costs the
 * stake (a Flaw earned in play, a new enemy, a lost tie). The Storyteller may also give up to 3 freebie points of
 * gains for what the prelude showed. House rules (B1610 to B1614); the book check looks for V20's own advice on
 * changes after the prelude.
 */

export const PRELUDE_BUDGET = 3;

/** What a failed roll can cost. flaw: a Flaw added at 0 points (earned, so it gives no freebies); enemy: an NPC too. */
export const STAKES = {
  enemy: {label: "A new enemy", flaw: "Enemy", enemy: true, text: "Someone in the scene now wants the character harmed."},
  secret: {label: "A secret to keep", flaw: "Dark Secret", text: "Something happened here that must not come out."},
  dreams: {label: "It comes back in dreams", flaw: "Nightmares", text: "The scene returns in sleep."},
  hunted: {label: "Someone gives chase", flaw: "Hunted", text: "Someone saw too much and means to finish it."},
  tie: {label: "A tie is lost", text: "Someone from the life before turns away, or is gone."}
};

/** Gains the Storyteller may give, priced by the book's freebie costs. */
export const REWARDS = {ability: {label: "A dot of an Ability", cost: "ability"}, background: {label: "A dot of a Background", cost: "background"},
  willpower: {label: "A dot of Willpower", cost: "willpower"}};

export const rewardCost = (kind, costs = {}) => Number(costs[REWARDS[kind]?.cost]) || 0;
export const canReward = (kind, spent = 0, costs = {}) => !!REWARDS[kind] && rewardCost(kind, costs) > 0 && spent + rewardCost(kind, costs) <= PRELUDE_BUDGET;

/**
 * The scenes. story: the lifepath summary's story [{stage, year, title, choice, text}]; parts: the template's
 * [{heading, items}]; short: only the turn and after. Returns [{key, title, beats: [..], from}].
 */
export function buildScenes({story = [], parts = [], short = false, name = ""} = {}) {
  const out = [];
  const part = h => parts.find(p => p.heading === h)?.items ?? [];
  if ( !short ) {
    const before = story.filter(s => !["turning", "splat", "after", "after2"].includes(s.stage));
    for ( const s of before ) out.push({key: `life:${s.stage}:${s.year}`, title: `${s.year}: ${s.title}`, from: "lifepath",
      beats: [`${s.choice}${s.text ? `: ${s.text}` : ""}`, "Play it short: where, who is there, and what the character wants from it."]});
    out.push({key: "before", title: "Before", from: "template", beats: part("Before")});
  }
  const turn = story.find(s => s.stage === "turning");
  out.push({key: "turn", title: turn ? `The turn (${turn.year}): ${turn.title}` : "The turn", from: "template",
    beats: [...(turn ? [`${turn.choice}${turn.text ? `: ${turn.text}` : ""}`] : []), ...part("The turn")]});
  const after = story.filter(s => ["splat", "after", "after2"].includes(s.stage));
  out.push({key: "after", title: "After", from: "template", beats: [...after.map(s => `${s.year}, ${s.title}: ${s.choice}`), ...part("After")]});
  return out.map(s => ({...s, beats: s.beats.filter(Boolean).map(b => b.replaceAll("{{name}}", name || "the character"))}));
}

/** Successes on a roll: dice at or above the difficulty, ones cancel (V20). */
export function successes(dice = [], difficulty = 6) {
  return dice.filter(d => d >= difficulty).length - dice.filter(d => d === 1).length;
}

/** The record of a prelude, cleaned: {scene, short, log: [{at, scene, kind, text, undo}], spent, written}. */
export function normPrelude(p = {}) {
  return {scene: Math.max(0, Math.trunc(Number(p?.scene) || 0)), short: !!p?.short,
    log: Array.isArray(p?.log) ? p.log.slice(-60) : [], spent: Math.max(0, Math.min(PRELUDE_BUDGET, Number(p?.spent) || 0)),
    written: p?.written ? String(p.written) : null};
}

/* ------------------------------------------------------------------ */
/*  Troupe ties (t1)                                                   */
/* ------------------------------------------------------------------ */

/** Questions one character answers about another. Any era; {{other}} is the other character. */
export const TIE_QUESTIONS = [
  "When did you first meet {{other}}, and what did you think of them?",
  "What does {{other}} owe you, or you them?",
  "What secret of {{other}}'s do you know, or think you know?",
  "Why do you trust {{other}} with your back, or why do you not?",
  "What did you and {{other}} live through together that nobody else saw?",
  "What do you want from {{other}} that you have not asked for?"
];

/** A ring: each character asks about the next one. ids sorted by the caller. Two or more. */
export function ring(ids = []) {
  if ( ids.length < 2 ) return [];
  return ids.map((id, i) => ({from: id, about: ids[(i + 1) % ids.length], q: i % TIE_QUESTIONS.length}));
}

export const tieQuestion = (i, other) => TIE_QUESTIONS[((Number(i) || 0) % TIE_QUESTIONS.length + TIE_QUESTIONS.length) % TIE_QUESTIONS.length].replaceAll("{{other}}", other || "the other");

/** Has a late joiner's chronicle already begun? Any character signed off. */
export const underWay = (records = []) => records.some(r => r?.signed);
