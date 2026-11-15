/**
 * WoDX Solo: what the world brings the lone player, step 3 of The Lone Chronicle (B5980 to B5985). Pure rules, no
 * Foundry in here; world.mjs does the Foundry side.
 *
 *   The oracle       the player asks a yes-or-no question, says how likely it is, and one die answers: yes or no, with
 *                    "and" or "but" at the edges. An "and" brings a lead (B5980, B5981).
 *   The Leads page   what the character could follow up: dreams, visions, auguries and foreshadowings sent to them,
 *                    their open oaths, debts, boons and objectives in the Ledger, and the oracle's last answers (B5982).
 *   Night encounters while the night goes on around the character, each part of the night may bring one of the
 *                    night's encounters onto the character's scene, a few squares off and in plain sight (B5983 to B5985).
 *
 * House rules throughout (docs/PENDING-REVIEW.md, B5980 to B5985): no World of Darkness book gives a solo oracle or a
 * chance for a night's encounter to find a character.
 */

/* ------------------------------------------------------------------ */
/*  The oracle (B5980, B5981)                                          */
/* ------------------------------------------------------------------ */

/**
 * How likely the player thinks the answer is yes. at: the least a d10 must show for a yes. Each step is two faces of
 * the die, so "Even odds" is a yes on 6 or more, half the time.
 */
export const ODDS = {
  sure: {label: "Almost certain", at: 2},
  likely: {label: "Likely", at: 4},
  even: {label: "Even odds", at: 6},
  unlikely: {label: "Unlikely", at: 8},
  hardly: {label: "Hardly", at: 10}
};
export const ODDS_ORDER = ["sure", "likely", "even", "unlikely", "hardly"];

/**
 * The answers, strongest yes first. lead: an "and" draws a lead for the character (B5981), since the world has moved
 * further than asked, for good or ill.
 */
export const ANSWERS = {
  yesAnd: {label: "Yes, and more besides", yes: true, lead: true},
  yes: {label: "Yes", yes: true},
  yesBut: {label: "Yes, but at a cost or with a catch", yes: true},
  noBut: {label: "No, but something else is there", yes: false},
  no: {label: "No", yes: false},
  noAnd: {label: "No, and worse besides", yes: false, lead: true}
};

/**
 * The answer a d10 gives at these odds. A 10 is always a yes and a 1 always a no. At even odds or better, a 10 is
 * "Yes, and" and a 1 is "No, and"; at worse odds they are a plain yes and a plain no (a 10 at "Hardly" just makes it,
 * so it is "Yes, but"). Otherwise the face that just makes a yes is "Yes, but", and the face just short of it is
 * "No, but". -> a key of ANSWERS
 */
export function oracleAnswer(oddsKey, face) {
  const o = ODDS[oddsKey] ?? ODDS.even;
  const d = Math.max(1, Math.min(10, Math.round(Number(face) || 1)));
  if ( d === 10 ) return o.at <= 6 ? "yesAnd" : (o.at === 10 ? "yesBut" : "yes");
  if ( d === 1 ) return o.at <= 6 ? "noAnd" : "no";
  if ( d >= o.at ) return d === o.at ? "yesBut" : "yes";
  return d === o.at - 1 ? "noBut" : "no";
}

/** A question as the oracle keeps it: trimmed, at most 200 characters; null when there is none. */
export function cleanQuestion(q) {
  const s = String(q ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  return s || null;
}

export const ORACLE_KEEP = 30;
/** The oracle's record, newest last, at most ORACLE_KEEP. entry: {at (world time), q, odds, face, answer, actorId}. */
export function addAsked(list = [], entry = {}) {
  const out = (Array.isArray(list) ? list : []).filter(e => e && e.q);
  if ( entry?.q ) out.push({at: Number(entry.at) || 0, q: String(entry.q), odds: ODDS[entry.odds] ? entry.odds : "even",
    face: Number(entry.face) || 0, answer: ANSWERS[entry.answer] ? entry.answer : "no", actorId: entry.actorId ?? null});
  return out.slice(-ORACLE_KEEP);
}

/* ------------------------------------------------------------------ */
/*  The Leads page (B5982)                                             */
/* ------------------------------------------------------------------ */

/** Kinds of lead, in the order the page lists them. */
export const LEAD_KINDS = {
  aid: "Signs and dreams",
  ledger: "Promises and debts",
  objective: "What you set out to do",
  oracle: "What the oracle said"
};
/** The Ledger kinds a character knows of themselves. A consequence stays the Storyteller's until it comes due. */
export const LEDGER_SHOWN = new Set(["oath", "debt", "boon", "objective"]);

/** How many of the newest signs and dreams the page keeps. */
export const AID_KEEP = 10;
export const LEADS_MAX = 40;

const names = (w) => String(w?.name ?? "").trim();
/** Does a Ledger name stand for the character? By id, or by name when the entry was typed without one. */
const isMe = (w, actorId, actorName) => (!!actorId && w?.id === actorId)
  || (!w?.id && !!String(actorName ?? "").trim() && names(w).toLowerCase() === String(actorName).trim().toLowerCase());

/**
 * The leads for one character, newest first within each kind.
 * src: {actorId, actorName,
 *   aids: [{id, at, title, text}] whispered to the character's player by WoDX Storyteller (at: when it was sent),
 *   ledger: [entries of WoDX Storyteller's Ledger, as normEntry gives them],
 *   asked: the oracle's record (addAsked),
 *   done: [lead ids the player let go]}
 * Each lead: {id, kind, title, text, at}
 */
export function leadsFor({actorId = null, actorName = "", aids = [], ledger = [], asked = [], done = []} = {}) {
  const gone = new Set((done ?? []).map(String));
  const out = [];
  const newest = [...(aids ?? [])].filter(a => a?.id && !gone.has(`aid:${a.id}`)).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)).slice(0, AID_KEEP);
  for ( const a of newest ) {
    out.push({id: `aid:${a.id}`, kind: "aid", title: String(a.title ?? "A sign"), text: String(a.text ?? ""), at: Number(a.at) || 0});
  }
  for ( const e of ledger ?? [] ) {
    if ( !e?.id || e.status !== "open" || !LEDGER_SHOWN.has(e.kind) ) continue;
    const mine = isMe(e.from, actorId, actorName), theirs = isMe(e.to, actorId, actorName);
    if ( !mine && !theirs ) continue;
    if ( e.kind === "objective" ) {
      const next = (e.steps ?? []).find(s => s && !s.done);
      if ( (e.steps ?? []).length && !next ) continue;
      out.push({id: `ledger:${e.id}`, kind: "objective", title: String(e.what || "An objective"), text: next ? `Next: ${next.text}` : "", at: Number(e.made) || 0});
      continue;
    }
    const other = (mine ? names(e.to) : names(e.from)) || "someone";
    const size = e.kind === "boon" && e.size ? ` (${String(e.size)})` : "";
    const title = mine
      ? {oath: `An oath you swore to ${other}`, debt: `A debt you owe ${other}`, boon: `A boon${size} you owe ${other}`}[e.kind]
      : {oath: `An oath ${other} swore to you`, debt: `A debt ${other} owes you`, boon: `A boon${size} ${other} owes you`}[e.kind];
    out.push({id: `ledger:${e.id}`, kind: "ledger", title, text: String(e.what ?? ""), at: Number(e.made) || 0});
  }
  for ( const q of (asked ?? []).slice(-5) ) {
    if ( !q?.q || (actorId && q.actorId && q.actorId !== actorId) ) continue;
    out.push({id: `oracle:${q.at}:${q.q.slice(0, 24)}`, kind: "oracle", title: q.q, text: ANSWERS[q.answer]?.label ?? "", at: Number(q.at) || 0});
  }
  const order = Object.keys(LEAD_KINDS);
  return out.filter(l => !gone.has(l.id))
    .sort((a, b) => (order.indexOf(a.kind) - order.indexOf(b.kind)) || (b.at - a.at))
    .slice(0, LEADS_MAX);
}

export const DONE_KEEP = 200;
/** Let a lead go: its id joins the list, newest last, at most DONE_KEEP. */
export function letGo(done = [], id) {
  const list = (Array.isArray(done) ? done : []).map(String).filter(x => x !== String(id ?? ""));
  if ( id ) list.push(String(id));
  return list.slice(-DONE_KEEP);
}

/* ------------------------------------------------------------------ */
/*  Night encounters on the map (B5983 to B5985)                       */
/* ------------------------------------------------------------------ */

/** Each part of the night (early, the dead hours, before dawn) brings an encounter this often (B5983). */
export const CHANCE = 1 / 3;
/** How far off the people of an encounter appear, in squares: out of arm's reach, close enough to be seen (B5984). */
export const RING = [6, 5, 7, 4, 8];

/** Words in a scene's name that make it the wilds rather than a town; a Storyteller's flag wins (B5985). */
export const WILD_WORDS = /\b(road|roads|forest|wood|woods|field|fields|moor|heath|marsh|swamp|river|lake|shore|coast|mountain|mountains|hill|hills|pass|valley|wild|wilds|wilderness|camp|desert|steppe|plain|plains|jungle|glade|cave|caves|crossroads)\b/i;
/** Words that keep the night's encounters away: a scene that is not a place in the world. */
export const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate|^WoDX gate|\bumbra\b|penumbra|shadowlands|dreaming/i;

/**
 * Which encounters a scene takes: "town", "wilds" or null (none). flag: the scene's flags.wodx-solo.encounters
 * ("town", "wilds" or "none"); name: the scene's name; town: the scene is a settlement by WoDX's own reading.
 */
export function placeKind({flag = null, name = "", town = false} = {}) {
  if ( flag === "none" ) return null;
  if ( flag === "town" || flag === "wilds" ) return flag;
  const n = String(name ?? "");
  if ( NOT_A_PLACE.test(n) ) return null;
  if ( town ) return "town";
  return WILD_WORDS.test(n) ? "wilds" : "town";
}

/** The key of one part of one night: "<night start>:<part>". */
export const nightKey = (start, part) => `${Math.round(Number(start) || 0)}:${String(part ?? "")}`;

export const KEYS_KEEP = 60;
/** The parts of nights already rolled, newest last, at most KEYS_KEEP. */
export function markRolled(list = [], key) {
  const out = (Array.isArray(list) ? list : []).map(String).filter(k => k !== String(key));
  if ( key ) out.push(String(key));
  return out.slice(-KEYS_KEEP);
}

/**
 * Should this part of the night bring an encounter? night: it is night where the character is; rolled: the keys
 * already rolled; roll: a number in [0, 1). -> {roll: boolean (roll now and mark the key), comes: boolean}
 */
export function encounterDue({night = false, key = "", rolled = [], roll = 1, chance = CHANCE, kind = null} = {}) {
  if ( !night || !key || !kind || (rolled ?? []).map(String).includes(String(key)) ) return {roll: false, comes: false};
  return {roll: true, comes: Number(roll) < Math.max(0, Math.min(1, Number(chance)))};
}

/**
 * Where the people of an encounter come in: the first square of the ring round the character's token that lies
 * inside the scene and is not blocked (blocked(x, y) is the Foundry side's wall test). tok: {x, y, width}; scene:
 * {width, height, padding, grid}. -> {x, y} top left in pixels, or null
 */
export function arrivalSpot(tok = {}, scene = {}, blocked = () => false) {
  const g = Number(scene?.grid?.size ?? scene?.grid) || 100;
  const w = Number(scene?.width) || 0, h = Number(scene?.height) || 0, pad = Number(scene?.padding) || 0;
  const offX = Math.ceil(w * pad / g) * g, offY = Math.ceil(h * pad / g) * g;
  const inside = (x, y) => x >= offX && y >= offY && x + 3 * g <= offX + w && y + 2 * g <= offY + h;
  const tx = Number(tok?.x) || 0, ty = Number(tok?.y) || 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for ( const r of RING ) for ( const [dx, dy] of dirs ) {
    const x = Math.round((tx + dx * r * g) / g) * g, y = Math.round((ty + dy * r * g) / g) * g;
    if ( inside(x, y) && !blocked(x, y) ) return {x, y};
  }
  return null;
}
