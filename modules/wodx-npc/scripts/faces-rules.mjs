/**
 * WoDX NPC 0.7.0: faces you have met. Pure rules, harness-tested.
 *
 * With the world setting on, a token of someone the Storyteller plays shows each player a short description ("a tall
 * stranger in grey") instead of the name, until one of that player's characters has been introduced. The Storyteller
 * introduces from the token's HUD. The list is kept on the actor: flags.wodx-npc.metBy (player character ids) and
 * flags.wodx-npc.stranger (the description). The Storyteller always sees the name.
 */

export const DEFAULT_STRANGER = "A stranger";

const ids = v => (Array.isArray(v) ? v : []).map(x => String(x ?? "")).filter(x => /^[A-Za-z0-9]{1,32}$/.test(x));

/** The met list, cleaned. */
export const metList = flags => [...new Set(ids(flags?.metBy))];

/** Does a player know this face? mine: the ids of that player's characters. */
export function knows(flags, mine = []) {
  const met = new Set(metList(flags));
  return (mine ?? []).some(id => met.has(id));
}

/** The words a player sees on the token. auto: a stranger line built from what shows (NPC 0.34.0); the Storyteller's own wins. */
export function nameFor({name = "", flags = {}, mine = [], gm = false, on = true, playerOwned = false, auto = ""} = {}) {
  if ( gm || !on || playerOwned ) return name;
  if ( knows(flags, mine) ) return name;
  const s = String(flags?.stranger ?? "").trim().slice(0, 80);
  return s || String(auto ?? "").trim().slice(0, 96) || DEFAULT_STRANGER;
}

/* ---- NPC 0.34.0: the stranger line, what a character can tell before they meet (house rule) ---- */

/** Dress by station, as a stranger reads it. */
export const DRESS_WORDS = ["ragged", "poorly dressed", "plainly dressed", "well dressed", "finely dressed", "richly dressed"];
/** What a worn side looks like. */
export const SIDE_LOOKS = {"kind:church": "in a churchman's habit", "kind:watch": "in the watch's uniform", military: "in uniform", livery: "in livery", pilgrim: "with a pilgrim's badge", corporate: "with a company badge"};
/** What they are doing, from the routine's activity. */
export const DOING = {sleep: "asleep", rest: "at rest", work: "at work", pray: "at prayer", drink: "drinking", patrol: "keeping watch", hunt: "watching the crowd",
  hide: "keeping out of sight", errand: "on an errand", attend: "attending someone", wander: "out and about", graze: "grazing", roost: "roosting"};
/** Their manner toward the viewer's character, by attitude step; 0 says nothing. */
export const MANNER = {"-3": "hostile to you", "-2": "hostile to you", "-1": "wary of you", "0": "", "1": "at ease with you", "2": "friendly to you", "3": "friendly to you"};
const CONDITION_LOOKS = {bloody: "bloodied", wounded: "hurt", weapon: "armed", filthy: "filthy", soaked: "soaked"};

/**
 * The stranger line: "a well dressed stranger in livery, keeping watch, wary of you".
 * show: {station (0 to 5 or null), sides: [], condition: [], activity, step (attitude to the viewer, or null), animal (a kind word)}.
 */
export function autoStranger(show = {}) {
  if ( show.animal ) {
    const doing = DOING[show.activity] ? `, ${DOING[show.activity]}` : "";
    return `a ${String(show.animal).toLowerCase()}${doing}`.replace(/^a ([aeiou])/i, "an $1");
  }
  const st = Number.isFinite(Number(show.station)) && show.station !== null ? Math.max(0, Math.min(5, Math.round(Number(show.station)))) : null;
  const cond = (show.condition ?? []).map(c => CONDITION_LOOKS[c]).filter(Boolean);
  const lead = [st !== null ? DRESS_WORDS[st] : "", cond.find(c => c === "bloodied" || c === "hurt") ?? ""].filter(Boolean);
  let line = `a ${lead.length ? `${lead.join(", ")} ` : ""}stranger`;
  const side = (show.sides ?? []).map(sd => SIDE_LOOKS[sd]).find(Boolean);
  if ( side ) line += ` ${side}`;
  const bits = [];
  if ( cond.includes("armed") ) bits.push("armed");
  if ( DOING[show.activity] ) bits.push(DOING[show.activity]);
  const m = show.step === null || show.step === undefined ? "" : MANNER[String(Math.max(-3, Math.min(3, Math.round(Number(show.step) || 0))))];
  if ( m ) bits.push(m);
  return [line, ...bits].join(", ").replace(/^a ([aeiou])/i, "an $1");
}

/** The met list after introducing some characters (add) or making them forget (remove). */
export function introduce(flags, add = [], remove = []) {
  const out = new Set(metList(flags));
  for ( const id of ids(add) ) out.add(id);
  for ( const id of ids(remove) ) out.delete(id);
  return [...out];
}

/* ------------------------------------------------------------------ */
/*  0.33.0 (B1382): the stranger's words in chat and the combat tracker */
/* ------------------------------------------------------------------ */

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The names this player should not see yet, with what to show instead. people: [{name, flags, playerOwned}];
 * own: the names of the player's own characters (never hidden). Longest names first, so "Anna Weber" goes before "Anna".
 */
export function swapsFor({people = [], mine = [], gm = false, on = true, own = []} = {}) {
  if ( gm || !on ) return [];
  const keep = new Set((own ?? []).map(n => String(n ?? "").trim().toLowerCase()));
  const out = new Map();
  for ( const p of people ?? [] ) {
    const name = String(p?.name ?? "").trim();
    if ( name.length < 2 || keep.has(name.toLowerCase()) || out.has(name) ) continue;
    const as = nameFor({name, flags: p.flags ?? {}, mine, gm, on, playerOwned: !!p.playerOwned});
    if ( as !== name ) out.set(name, as);
  }
  return [...out].map(([name, as]) => ({name, as})).sort((a, b) => b.name.length - a.name.length);
}

/** A piece of text with each hidden name, as a whole word, swapped for the stranger's words (capitalised at the start). */
export function maskText(text, swaps = []) {
  let s = String(text ?? "");
  for ( const {name, as} of swaps ?? [] ) {
    if ( !name ) continue;
    s = s.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escRe(name)}(?=$|[^\\p{L}\\p{N}])`, "gu"), (m, pre, at) => `${pre}${at === 0 && !pre ? as.charAt(0).toUpperCase() + as.slice(1) : as}`);
  }
  return s;
}
