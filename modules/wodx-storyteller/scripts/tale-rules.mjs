/**
 * Tales (B3350-B3354): a rumour made from a deed, with slots that change as it is retold. Pure, no Foundry.
 *
 * A tale is {who, did, where, how, tone}: who did it (a name), what they did, where, how bad or how fine (a word),
 * and tone from -3 (a dreadful deed) to +3 (a fine one). A rumour can carry one (rumour.tale) and keeps every version
 * told so far (rumour.versions, at most MAX_VERSIONS) and which version each knower heard (rumour.heardAs {id: i}).
 * When a telling twists the tale (the rumour mill's twist chance), the teller's leaning decides how (B3351):
 *   gossip   makes it bigger: the tone moves one step further from 0 and the "how" gets a stronger word
 *   enemy    makes it darker: the tone falls a step
 *   friend   makes it kinder: the tone rises a step
 *   stranger gets the details wrong: the place, or the name, goes vague
 * An NPC who has heard a tale about a character meets them with that version in mind (B3352): the tones they heard
 * move the first meeting by at most one step. No book gives rules for gossip; every figure here is a house reading.
 */

export const MAX_VERSIONS = 8;
export const LEANINGS = ["gossip", "enemy", "friend", "stranger"];
const clampTone = v => Math.max(-3, Math.min(3, Math.round(Number(v) || 0)));
const str = (v, n = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** The words for how bad or fine a deed was, by tone. */
export const HOW = {"-3": "horribly", "-2": "cruelly", "-1": "badly", "0": "", "1": "well", "2": "handsomely", "3": "magnificently"};

export function normTale(t = {}) {
  return {who: str(t.who, 80) || "someone", did: str(t.did, 200) || "did something", where: str(t.where, 80), how: str(t.how, 40), tone: clampTone(t.tone)};
}

/** The words of a tale. */
export function taleText(t) {
  const x = normTale(t);
  return `${x.who} ${x.did}${x.where ? ` ${/^(at|in|on|by|near|outside|under) /i.test(x.where) ? x.where : `at ${x.where}`}` : ""}${x.how ? `, ${x.how}` : ""}`.replace(/\s+/g, " ").trim();
}

/** One retelling by a teller of a leaning. rand: () => [0, 1). Returns the new version. */
export function retell(tale, leaning, rand = Math.random) {
  const t = normTale(tale);
  switch ( leaning ) {
    case "gossip": {
      const tone = t.tone === 0 ? (rand() < 0.5 ? -1 : 1) : clampTone(t.tone + Math.sign(t.tone));
      return {...t, tone, how: HOW[String(tone)] ?? t.how};
    }
    case "enemy": { const tone = clampTone(t.tone - 1); return {...t, tone, how: HOW[String(tone)] ?? t.how}; }
    case "friend": { const tone = clampTone(t.tone + 1); return {...t, tone, how: HOW[String(tone)] ?? t.how}; }
    default:
      if ( t.where && rand() < 0.5 ) return {...t, where: "somewhere near"};
      return {...t, who: /^someone/.test(t.who) ? t.who : `someone like ${t.who}`};
  }
}

/**
 * The leaning of a teller toward the one the tale is about. att: the teller's attitude step toward them (-3..3) or
 * null; gossip: the teller loves to talk (a Harpy, a Galliard, a Nature that likes an audience).
 */
export function leaningOf({att = null, gossip = false} = {}) {
  if ( gossip ) return "gossip";
  if ( att === null || att === undefined ) return "stranger";
  return att <= -1 ? "enemy" : att >= 1 ? "friend" : "stranger";
}

/**
 * A twist during spreading: the hearer gets a new version told by the teller. Returns {versions, index}: the list
 * (at most MAX_VERSIONS; when full, the hearer gets the closest version already told) and the hearer's version.
 */
export function twistFor(versions, fromIndex, leaning, rand) {
  const list = (versions ?? []).map(normTale);
  const base = list[fromIndex] ?? list[0];
  if ( !base ) return {versions: list, index: 0};
  const next = retell(base, leaning, rand);
  const same = list.findIndex(v => taleText(v) === taleText(next));
  if ( same >= 0 ) return {versions: list, index: same};
  if ( list.length >= MAX_VERSIONS ) {
    let best = 0, gap = Infinity;
    list.forEach((v, i) => { const g = Math.abs(v.tone - next.tone); if ( g < gap ) { gap = g; best = i; } });
    return {versions: list, index: best};
  }
  return {versions: [...list, next], index: list.length};
}

/** The version one person heard, or null. */
export function heardVersion(rumour, id) {
  if ( !rumour?.tale || !(rumour.knownBy ?? []).includes(id) ) return null;
  const vs = rumour.versions?.length ? rumour.versions : [rumour.tale];
  return normTale(vs[rumour.heardAs?.[id] ?? 0] ?? vs[0]);
}

/** B3352: how the tales an NPC heard about a character move the first meeting: -1, 0 or +1. */
export function toneFor(rumours, npcId, charId) {
  let sum = 0;
  for ( const r of rumours ?? [] ) if ( r.about === charId ) { const v = heardVersion(r, npcId); if ( v ) sum += v.tone; }
  return sum <= -2 ? -1 : sum >= 2 ? 1 : 0;
}

/**
 * B3353: how many people know a tale at first. Fame adds one teller a dot (V20 pdf 122: the famous are known and
 * watched), a tale done in front of a crowd two more.
 */
export const firstTellers = ({fame = 0, crowd = false} = {}) => 1 + Math.max(0, Math.min(5, Math.round(Number(fame) || 0))) + (crowd ? 2 : 0);

/**
 * B3354: what a character sees about the tales told of them, grouped by community. rumours: the list; groupOf: id ->
 * the community a knower belongs to (a faction name, or "the town"). Returns [{community, versions: [{text, tone,
 * count}], heard}] sorted by how many heard.
 */
export function aboutView(rumours, charId, groupOf = () => "the town") {
  const by = new Map();
  for ( const r of rumours ?? [] ) {
    if ( r.about !== charId || r.ended ) continue;
    for ( const id of r.knownBy ?? [] ) {
      const v = r.tale ? heardVersion(r, id) : null;
      const text = v ? taleText(v) : String(r.text ?? "");
      const g = groupOf(id) || "the town";
      if ( !by.has(g) ) by.set(g, new Map());
      const m = by.get(g);
      const k = text;
      m.set(k, {text, tone: v?.tone ?? 0, count: (m.get(k)?.count ?? 0) + 1});
    }
  }
  return [...by.entries()].map(([community, m]) => {
    const versions = [...m.values()].sort((a, b) => b.count - a.count);
    return {community, versions, heard: versions.reduce((s, v) => s + v.count, 0)};
  }).sort((a, b) => b.heard - a.heard || a.community.localeCompare(b.community));
}

/** A deed's tone from a standing change (delta) or a boon kept or broken. */
export const toneOfDeed = delta => clampTone(Math.sign(Number(delta) || 0) * Math.min(3, Math.abs(Math.round(Number(delta) || 0)) || 1));
