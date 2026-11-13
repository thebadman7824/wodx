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
  const turn = story.find(s => s.stage === "turning");
  const after = story.filter(s => ["splat", "after", "after2"].includes(s.stage));
  if ( !short ) {
    const before = story.filter(s => !["turning", "splat", "after", "after2"].includes(s.stage));
    // A drill-down lifepath (0.17.0): one scene for the birth, one for each life stage, one for the arrival
    const groups = new Map();
    for ( const s of before.filter(x => x.drill) ) {
      const g = ["region", "people", "origin"].includes(s.stage) ? "born" : String(s.stage).split("-")[0];
      if ( !groups.has(g) ) groups.set(g, []);
      groups.get(g).push(s);
    }
    for ( const [g, list] of groups ) {
      const title = g === "born" ? "Born" : g === "arrival" ? list[0].title : String(list[0].title).split(":")[0];
      out.push({key: `life:${g}:${list[0].year}`, title: `${list[0].year}: ${title}`, from: "lifepath", year: list[0].year,
        beats: [...list.map(x => `${g === "born" || g === "arrival" ? "" : `${String(x.title).split(": ").slice(1).join(": ")}: `}${x.choice}${x.text ? `. ${x.text}` : ""}`.replace(/^./, c => c.toUpperCase())),
          "Play it short: where, who is there, and what the character wants from it."]});
    }
    for ( const s of before.filter(x => !x.drill) ) out.push({key: `life:${s.stage}:${s.year}`, title: `${s.year}: ${s.title}`, from: "lifepath", year: s.year,
      beats: [`${s.choice}${s.text ? `: ${s.text}` : ""}`, "Play it short: where, who is there, and what the character wants from it."]});
    out.push({key: "before", title: "Before", from: "template", year: turn?.year ?? null, beats: part("Before")});
  }
  out.push({key: "turn", title: turn ? `The turn (${turn.year}): ${turn.title}` : "The turn", from: "template", year: turn?.year ?? null,
    beats: [...(turn ? [`${turn.choice}${turn.text ? `: ${turn.text}` : ""}`] : []), ...part("The turn")]});
  out.push({key: "after", title: "After", from: "template", year: after[0]?.year ?? turn?.year ?? null,
    beats: [...after.map(s => `${s.year}, ${s.title}: ${s.choice}`), ...part("After")]});
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

/* ------------------------------------------------------------------ */
/*  A guest in another character's prelude (Improvement Desk bf1)      */
/* ------------------------------------------------------------------ */

/**
 * Lines whose people do not die of age once turned (B2305): the Kindred, the dead, mummies, Kuei-jin, the fallen.
 * Others live a long mortal span: ghouls and revenants fed or bred to outlast it, mages who can stretch theirs.
 */
export const UNDYING_LINES = new Set(["vampire", "wraith", "mummy", "kueijin", "demon"]);
export const SPAN = {ghoul: 200, revenant: 200, mage: 150};
export const SPAN_MORTAL = 100;
/** Youngest age to play a beat in someone's past, and years turned before a guest counts as an elder. */
export const GUEST_MIN_AGE = 8;
export const ELDER_YEARS = 100;

/**
 * Can a guest have been there in a year? guest = {line, birthYear, turnYear} from their lifepath, or null when they
 * have none. Returns {ok, as, why}: as is "mortal", "turned", "elder", "ghost" or "unknown".
 */
export function guestFit(year, guest = null) {
  const y = year === null || year === undefined || year === "" ? NaN : Number(year);
  if ( !guest || !Number.isFinite(Number(guest.birthYear)) || !Number.isFinite(y) ) return {ok: true, as: "unknown", why: "Years not set; the Storyteller's call."};
  const born = Number(guest.birthYear), turned = guest.turnYear !== null && guest.turnYear !== undefined && y >= Number(guest.turnYear);
  const age = y - born, line = guest.line || "mortal";
  if ( age < GUEST_MIN_AGE ) return {ok: false, as: null, why: age < 0 ? `Not yet born in ${y}.` : `Only a small child in ${y}.`};
  if ( turned && UNDYING_LINES.has(line) ) {
    if ( line === "wraith" ) return {ok: true, as: "ghost", why: "Only as a ghost, from beyond the Shroud."};
    return y - Number(guest.turnYear) >= ELDER_YEARS ? {ok: true, as: "elder", why: "Only as an elder, already old in the blood or the grave."} : {ok: true, as: "turned", why: ""};
  }
  const span = turned ? (SPAN[line] ?? SPAN_MORTAL) : SPAN_MORTAL;
  if ( age > span ) return {ok: false, as: null, why: `Would be long dead by ${y}.`};
  return {ok: true, as: turned ? "turned" : "mortal", why: turned ? "" : "Before their own turn."};
}

/** The beat a guest plays, by how they were there. {{guest}} and {{host}} are the two characters. */
export const GUEST_BEATS = {
  mortal: ["What did {{guest}} do in this scene that {{host}} still remembers?", "What did {{guest}} see here that nobody else did?",
    "What did {{guest}} want from {{host}} here, and did they get it?"],
  turned: ["What did {{guest}} do in this scene that {{host}} still remembers?", "What did {{guest}} hide from {{host}} here?",
    "What did {{guest}} want from {{host}} here, and did they get it?"],
  elder: ["{{guest}} watched this, already old. Why did they take an interest in {{host}}?", "What did {{guest}} quietly arrange here, and does {{host}} know?"],
  ghost: ["{{guest}} was there unseen. What did they do, or fail to do?", "What did {{guest}} whisper that {{host}} half heard?"]
};
GUEST_BEATS.unknown = GUEST_BEATS.mortal;
export function guestBeat(as, i, guest, host) {
  const list = GUEST_BEATS[as] ?? GUEST_BEATS.mortal;
  const k = ((Number(i) || 0) % list.length + list.length) % list.length;
  return list[k].replaceAll("{{guest}}", guest || "the guest").replaceAll("{{host}}", host || "the character");
}

/** The tie a guest beat writes: guest about host, kind "guest", one per scene. */
export const guestTie = ({from, about, scene, year = null, title = "", beat = "", text = ""}) =>
  ({from, about, kind: "guest", scene: String(scene ?? ""), year, q: `${year ? `In ${year}, ` : ""}${title}: ${beat}`.trim(), text: String(text).slice(0, 1000)});
/** Same tie? Question ties match on the pair; guest ties also on the scene. */
export const sameTie = (a, b) => a.from === b.from && a.about === b.about && (a.kind ?? "q") === (b.kind ?? "q") && (a.scene ?? "") === (b.scene ?? "");
