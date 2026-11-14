/**
 * Threads of Fate (B3650-B3656), the pure part: hook cards, and the weave that makes storylines from them. No Foundry
 * here, so the harness can test it. Ben's picks on the Threads of Fate Desk, 2026-11-14.
 *
 * A hook card is shaped like the authored Rothenstein session and encounter pages: an opening line to read out, a
 * mood, who (a slot filled from the world), what they want, a kind of place, the surface (what mortals see), what lies
 * beneath for each line, the complication, what can be found, the question at its heart, a cost, a pressure valve, a
 * place for a fight if it comes to that, the faction it touches, the pressure steps (the story chains' step format),
 * and the endings with what each one writes back through the other systems' own controls (B3654).
 *
 * The weave (B3652) takes the freshest signals from the board (signals-rules.mjs), a player's own hooks and lifepath
 * threads first, and makes a storyline of an anchor card that answers one of them, a twist card that shares a kind of
 * place or a cast slot with it, and an echo from the past (a grudge, a tale, a debt, a lifepath thread). It never
 * opens more than CAP storylines at once, plus one for each player's own hook (B3653); a storyline that ends frees
 * its slot for the next turn. It skips a card whose kind would clash with a story chain already running (B3654),
 * a card cut by a line (Session Zero), one the Storyteller refused, and one with no door for a line at the table.
 * Every storyline is only a proposal: the Storyteller approves, edits, refuses or locks it (B3650).
 */
import {fresh, ECHO, OWN} from "./signals-rules.mjs";

export const DAY = 86400;
/** Open storylines at once, besides one per player's own hook (desk item 7). */
export const CAP = 3;
/** The share of night draws that give an open storyline's next beat instead of a table line (desk item 9). */
export const NIGHT_SHARE = 1 / 3;
/** The lines a card can open a door for. */
export const LINES = ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "kuei-jin", "mortal"];
/** Lines whose doors open only from a year (B3655; Demon on the classic timeline only, rule 12 for hunters). */
export const LINE_FROM = {demon: 1999};
/** Each story chain (WoDX Chronicle data/pod.mjs CHAINS) and the signal kinds a storyline may not repeat while it runs. */
export const CHAIN_KINDS = {"black-death": ["plague"], "inquisition": ["hunters", "trial", "arrest"], "serpent-faith": ["cult"],
  "anarch-revolt": ["war"], "antediluvian": [], "week-nightmares": ["change"]};
/** The ten-night spine in three parts (desk item 16), as Rothenstein and its sequels use it: night -> part. */
export const SPINE = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, n = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = v => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]).map(x => String(x)).filter(Boolean);

/** A step of pressure: {key, title, text, days}. */
const normStep = (s = {}, i = 0) => ({key: str(s.key, 40) || `s${i + 1}`, title: str(s.title, 120), text: str(s.text), days: Math.max(0, num(s.days ?? 7))});
/** An ending: {key, label, writes: [{to, what}]}; `to` names the system it writes through (rumours, factions, clocks...). */
const normEnding = (e = {}, i = 0) => ({key: str(e.key, 40) || `e${i + 1}`, label: str(e.label, 200),
  writes: (Array.isArray(e.writes) ? e.writes : []).map(w => ({to: str(w?.to, 40), what: str(w?.what, 200)})).filter(w => w.to)});

/** A hook card in its clean shape, or null without a key. */
export function normCard(c = {}) {
  const key = str(c.key, 80);
  if ( !key ) return null;
  const beneath = {};
  for ( const [k, v] of Object.entries(c.beneath ?? {}) ) if ( LINES.includes(k) && str(v) ) beneath[k] = str(v);
  return {_n: true, key, title: str(c.title, 120) || key, open: str(c.open, 200), mood: str(c.mood, 40),
    who: str(c.who, 120), cast: list(c.cast), want: str(c.want, 200), place: list(c.place), surface: str(c.surface),
    beneath, complication: str(c.complication), find: str(c.find), question: str(c.question, 200), cost: str(c.cost, 200),
    valve: str(c.valve, 200), fight: str(c.fight, 40), faction: str(c.faction, 40),
    steps: (Array.isArray(c.steps) ? c.steps : []).map(normStep), endings: (Array.isArray(c.endings) ? c.endings : []).map(normEnding),
    needs: list(c.needs), role: ["anchor", "twist"].includes(c.role) ? c.role : "any",
    regions: list(c.regions).length ? list(c.regions) : ["*"], from: num(c.from ?? -Infinity), to: c.to === undefined ? Infinity : num(c.to),
    season: list(c.season), tags: list(c.tags), future: !!c.future, page: str(c.page, 120),
    src: ["history", "lore", "wodx"].includes(c.src) ? c.src : "wodx", region: str(c.region, 40), part: num(c.part)};
}

/** The lines a card opens a door for in a year: every line it has a beneath for, less any not yet open. */
export function doorsOf(card, year = 1197, {branch = false} = {}) {
  const c = card?._n ? card : normCard(card);
  return Object.keys(c?.beneath ?? {}).filter(l => !(LINE_FROM[l] && (num(year) < LINE_FROM[l] || branch)));
}

/**
 * Can this card be used here and now? ctx: {year, region, lines (at the table), branch (Future Darkness on),
 * cut (content tags a line removes), refused (card keys), open (card keys in play), chains (running chain keys),
 * season}. Returns {ok, why}.
 */
export function fits(card, ctx = {}) {
  const c = card?._n ? card : normCard(card);
  if ( !c ) return {ok: false, why: "no card"};
  const year = num(ctx.year ?? 1197);
  if ( year < c.from || year > c.to ) return {ok: false, why: "not in this year"};
  if ( c.future && !ctx.branch ) return {ok: false, why: "Future Darkness branch is off"};
  if ( !c.regions.includes("*") && !c.regions.includes(String(ctx.region ?? "")) ) return {ok: false, why: "not in this region"};
  if ( c.season.length && ctx.season && !c.season.includes(ctx.season) ) return {ok: false, why: "not this season"};
  if ( c.tags.some(t => (ctx.cut ?? []).includes(t)) ) return {ok: false, why: "cut by a line"};
  if ( (ctx.refused ?? []).includes(c.key) ) return {ok: false, why: "refused"};
  if ( (ctx.open ?? []).includes(c.key) ) return {ok: false, why: "already open"};
  const blocked = (ctx.chains ?? []).flatMap(k => CHAIN_KINDS[k] ?? []);
  if ( c.needs.length && c.needs.every(n => blocked.includes(n)) ) return {ok: false, why: "a story chain already tells this"};
  const at = list(ctx.lines).length ? list(ctx.lines) : LINES;
  const doors = doorsOf(c, year, {branch: ctx.branch});
  if ( !doors.some(l => at.includes(l)) ) return {ok: false, why: "no door for a line at the table"};
  return {ok: true, why: ""};
}

/** How well a card answers a signal: 0 if it does not. A card of the signal's own region beats one for anywhere. */
export function score(card, signal, ctx = {}) {
  if ( !card.needs.includes(signal.kind) ) return 0;
  let s = signal.weight * 10;
  if ( card.regions.includes(String(signal.region || ctx.region || "")) ) s += 6;
  if ( card.region && card.region === (signal.region || ctx.region) ) s += 2;
  if ( card.role === "anchor" ) s += 2;
  return s;
}

/** Do two cards share a kind of place or a cast slot? */
export const shares = (a, b) => a.place.some(p => b.place.includes(p)) || a.cast.some(x => b.cast.includes(x));

/** How many storylines may be open: CAP, plus one for each player's own hook that has a storyline. */
export function capacity(state = {}) {
  const open = (state.open ?? []).filter(s => s.status !== "closed");
  const own = open.filter(s => OWN.includes(s.from?.kind)).length;
  const other = open.length - own;
  return {open: open.length, own, other, free: Math.max(0, CAP - other)};
}

const pick = (arr, rand) => arr[Math.min(arr.length - 1, Math.floor(rand() * arr.length))];

/**
 * The weave. Returns a proposed storyline or null:
 * {key, anchor (card key), twist (card key or ""), echo (signal or null), from (the signal it answers), uses (signal
 *  keys), doors, steps, region, title, question, at}
 * A signal of the player's own kind always gets a slot; any other needs a free one.
 */
export function weave({board = [], cards = [], state = {}, ctx = {}, now = 0, rand = Math.random} = {}) {
  const deck = cards.map(c => (c?._n ? c : normCard(c))).filter(Boolean);
  const openKeys = (state.open ?? []).filter(s => s.status !== "closed").flatMap(s => [s.anchor, s.twist]).filter(Boolean);
  const c2 = {...ctx, open: [...openKeys, ...(ctx.open ?? [])], refused: [...(state.refused ?? []), ...(ctx.refused ?? [])]};
  const usable = deck.filter(c => fits(c, c2).ok);
  const cap = capacity(state);
  for ( const sig of fresh(board, now) ) {
    if ( !OWN.includes(sig.kind) && cap.free <= 0 ) continue;
    const ranked = usable.filter(c => c.role !== "twist").map(c => ({c, s: score(c, sig, ctx)})).filter(x => x.s > 0);
    if ( !ranked.length ) continue;
    const best = Math.max(...ranked.map(x => x.s));
    const anchor = pick(ranked.filter(x => x.s === best).map(x => x.c), rand);
    const others = fresh(board, now).filter(s => s.key !== sig.key);
    const twists = usable.filter(c => c.key !== anchor.key && c.role !== "anchor" && shares(anchor, c));
    const twistBy = twists.filter(c => others.some(s => c.needs.includes(s.kind)));
    const twist = twistBy.length ? pick(twistBy, rand) : twists.length ? pick(twists, rand) : null;
    const twistSig = twist ? others.find(s => twist.needs.includes(s.kind)) ?? null : null;
    const echo = others.find(s => ECHO.includes(s.kind) && s.key !== twistSig?.key && (!sig.about || !s.about || s.about === sig.about)) ?? null;
    const year = num(ctx.year ?? 1197);
    const at = list(ctx.lines).length ? list(ctx.lines) : LINES;
    const doors = [...new Set([...doorsOf(anchor, year, ctx), ...(twist ? doorsOf(twist, year, ctx) : [])])].filter(l => at.includes(l));
    const steps = anchor.steps.map(s => ({...s}));
    if ( twist ) {
      const mid = Math.max(1, Math.floor(steps.length / 2));
      steps.splice(mid, 0, {key: "twist", title: twist.title, text: twist.complication || twist.surface, days: steps[mid]?.days ?? 7});
    }
    return {key: `${anchor.key}:${Math.round(num(now))}`, anchor: anchor.key, twist: twist?.key ?? "", echo, from: sig,
      uses: [sig.key, twistSig?.key, echo?.key].filter(Boolean), doors, steps, region: sig.region || String(ctx.region ?? ""),
      title: anchor.title, question: anchor.question, at: num(now)};
  }
  return null;
}

/** Open an approved storyline: it starts at step 0, the next step due after that step's days. */
export function open(state = {}, story = {}, now = 0) {
  const s = {...story, status: "open", step: 0, opened: num(now), next: num(now) + num(story.steps?.[0]?.days) * DAY};
  return {...state, open: [...(state.open ?? []), s]};
}

/** Storylines whose next step is due by now, with that step. */
export const due = (state = {}, now = 0) => (state.open ?? []).filter(s => s.status === "open" && s.step < (s.steps?.length ?? 0) && num(s.next) <= num(now))
  .map(s => ({key: s.key, step: s.steps[s.step]}));

/** Move a storyline on one step; at the last step it waits for an ending. */
export function advance(state = {}, key = "", now = 0) {
  return {...state, open: (state.open ?? []).map(s => {
    if ( s.key !== key || s.status !== "open" ) return s;
    const step = s.step + 1;
    return {...s, step, next: step < s.steps.length ? num(now) + num(s.steps[step].days) * DAY : Infinity};
  })};
}

/** End a storyline with an ending key: it frees its slot and keeps a short record. */
export function close(state = {}, key = "", ending = "", now = 0) {
  const s = (state.open ?? []).find(x => x.key === key);
  if ( !s ) return state;
  return {...state, open: (state.open ?? []).filter(x => x.key !== key),
    done: [...(state.done ?? []), {key, anchor: s.anchor, twist: s.twist, ending: str(ending, 40), at: num(now)}].slice(-100)};
}

/** The Storyteller refuses a card: the weave never offers it again until taken back (desk item 12). */
export const refuse = (state = {}, cardKey = "") => ({...state, refused: [...new Set([...(state.refused ?? []), String(cardKey)])]});
export const unrefuse = (state = {}, cardKey = "") => ({...state, refused: (state.refused ?? []).filter(k => k !== String(cardKey))});

/** For a night draw: an open storyline's current beat one draw in three, else null (the tables draw as before). */
export function nightBeat(state = {}, rand = Math.random) {
  const live = (state.open ?? []).filter(s => s.status === "open" && s.step < (s.steps?.length ?? 0));
  if ( !live.length || !(rand() < NIGHT_SHARE) ) return null;
  const s = pick(live, rand);
  return {key: s.key, title: s.title, step: s.steps[s.step]};
}

/** Age floor (B3656): no beat tagged romance may involve anyone under 18. `ok` is Chronicle's api.age.romance check. */
export const ageSafe = (card, cast = [], ok = () => true) => !(card?.tags ?? []).includes("romance") || cast.every(a => ok(a));
