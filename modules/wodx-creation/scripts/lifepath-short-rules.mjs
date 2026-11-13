/**
 * WoDX Creation 0.30.0: the short lifepath (B2828). Pure rules. The player answers where the character comes from
 * (continent, region, people, origin); the dice tell the rest from the same region and year tables the long path
 * uses, and the story is shown as one paragraph. Every pick can still be changed with Back, or the long path chosen.
 */
import * as R from "./lifepath-rules.mjs";
import * as D from "./lifepath-drill-rules.mjs";

/** The drill steps the short path still asks. */
export const SHORT_ASK = new Set(["continent", "region", "people", "of-this-land", "origin", "arrival"]);

/** Roll every drill step the short path does not ask, up to the next one it does ask or the end. */
export function rollDrill(drill) {
  let d = drill, guard = 0;
  while ( d && !D.done(d) && guard++ < 80 ) {
    const step = D.current(d);
    if ( !step || SHORT_ASK.has(step.id) ) break;
    const next = D.surprise(d);
    if ( next === d ) break;
    d = next;
  }
  return d;
}

/** Choose a scene's option by the path's own seed, for every scene left. */
export function rollPath(path) {
  let p = path, guard = 0;
  while ( p && !R.done(p) && guard++ < 40 ) {
    const e = R.currentEvent(p);
    const n = e?.options?.length ?? 1;
    const k = [...`${p.seed}:short:${p.steps.length}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    p = R.choose(p, k % n);
  }
  return p;
}

/** Roll every age after the change. */
export function rollSince(since) {
  let s = since, guard = 0;
  while ( s && D.sinceCurrent(s) && guard++ < 40 ) {
    const next = D.sinceSurprise(s);
    if ( next === s ) break;
    s = next;
  }
  return s;
}

/** The story as one paragraph: where and when the character was born, then one sentence for each part of life. */
const ORIGIN_TITLES = /^(continent|region|your people|of this land|origin|arrival)/i;
export function paragraph(story = []) {
  const clean = t => String(t ?? "").trim().replace(/[.!?]*$/, "");
  const lower = t => t.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase());
  const born = story.filter(s => ORIGIN_TITLES.test(String(s.title ?? "")));
  const out = [];
  if ( born.length ) out.push(`Born in ${born[0].year}: ${born.map(s => clean(s.choice)).filter(Boolean).join("; ")}.`);
  let cur = null;
  for ( const s of story ) {
    if ( ORIGIN_TITLES.test(String(s.title ?? "")) ) continue;
    const stage = clean(String(s.title ?? "").split(":")[0]);
    if ( !cur || cur.stage !== stage ) { cur = {stage, year: s.year, bits: []}; out.push(cur); }
    cur.bits.push(clean(s.choice));
  }
  return out.map(x => (typeof x === "string" ? x : `${x.stage.replace(/^./, c => c.toUpperCase())} (from ${x.year}): ${x.bits.filter(Boolean).map((b, i) => (i ? lower(b) : b)).join("; ")}.`)).join(" ");
}
