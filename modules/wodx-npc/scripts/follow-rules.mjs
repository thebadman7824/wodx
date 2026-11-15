/**
 * WoDX NPC (NPC Motives Desk, B5680-B5686): what an NPC does after its first reaction, so that it never acts and then
 * stands there. The pure part; routines.mjs and main.mjs read the map and hand the results here.
 *
 *   m1  A challenge that is not answered: the intruder still in the place a while later meets the next step.
 *   m2  An alarm: those who hear it come to the trouble or get away from it, by their temperament.
 *   m3  Help that is sent for walks to the trouble.
 *   m4  An informer walks off to tell; stopped or hurt on the way, the word never arrives.
 *   m5  Someone who runs makes for home and remembers who frightened them.
 *   c1  A hostage is let go when the fight ends and remembers who seized them.
 *   r3  A guard on watch walks between the tagged places of its map.
 * The books give no rules for any of this; every figure is a house reading (docs/PENDING-REVIEW.md).
 */

/** Seconds of world time a challenged intruder may linger before the watcher acts again (m1). */
export const CHALLENGE_GRACE = 10 * 60;
/** A challenge counts as fresh for this long; after it the next meeting starts over. */
export const CHALLENGE_KEEP = 60 * 60;
/** Seconds of world time between a guard's moves on its beat (r3). */
export const BEAT_SECONDS = 15 * 60;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Is the profile one who keeps order (the same test the reaction rules use)? */
export const isKeeper = (p = {}) => ["guard", "ghoul", "elder"].includes(p.template) || (p.tactics ?? []).includes("guard")
  || ((p.tactics ?? []).includes("call") && num(p.loyalty) >= 1);

/**
 * m1: the options after a challenge went unanswered. Challenge and letting it pass drop out; a keeper raises the
 * alarm or fights, anyone else sends for help or runs. options: [{action, score, why}] best first.
 */
export function escalate(options = [], profile = {}) {
  const keeper = isKeeper(profile), aggr = num(profile.aggression);
  const out = options.filter(o => o.action !== "challenge").map(o => {
    let score = num(o.score);
    if ( o.action === "ignore" ) score = 0;
    if ( keeper && o.action === "alarm" ) score += 2;
    if ( keeper && o.action === "fight" && aggr >= 0.5 ) score += 1.5 + aggr;
    if ( !keeper && o.action === "send" ) score += 2;
    if ( !keeper && o.action === "flee" ) score += 1;
    if ( !keeper && o.action === "alarm" ) score += 1;
    const why = o.action === "ignore" ? "told to go, and they did not" : `${o.why}; told to go, and they did not`;
    return {...o, score: Math.round(score * 10) / 10, why};
  });
  return out.sort((a, b) => b.score - a.score);
}

/** Is a recorded challenge {at} still fresh at now? */
export const challengeFresh = (c, now) => !!c && num(now) - num(c.at) < CHALLENGE_KEEP;
/** Is it time to act on it (the grace has run out)? */
export const challengeDue = (c, now) => !!c && !c.acted && num(now) - num(c.at) >= CHALLENGE_GRACE && challengeFresh(c, now);

/**
 * m2: what someone who hears an alarm does: "come" (to the trouble), "go" (home or away) or "stay".
 * Keepers and the bold come unless the trouble is something they fear; the timid and the frightened go.
 */
export function hearAlarm(profile = {}, {supernatural = false, weapon = false} = {}) {
  if ( profile.animal ) return "stay";
  const fears = profile.fears ?? [];
  const afraid = (supernatural && fears.includes("supernatural")) || (weapon && fears.includes("violence"));
  if ( afraid ) return "go";
  if ( isKeeper(profile) || num(profile.aggression) >= 1 ) return "come";
  if ( num(profile.aggression) < 0.5 || num(profile.cowardice) >= 1 ) return "go";
  return "stay";
}

/** m4: does an informer's word still reach the watch? Not when they are down, or were caught (held) on the way. */
export const reportArrives = (r = {}, {down = false, held = false} = {}) => !down && !held && !r.stopped;

/** m5: does one who ran tell someone too? The kinds who talk (report tactic) or the townsfolk with no fight in them. */
export const tellsAfterFleeing = (p = {}) => (p.tactics ?? []).includes("report") || (p.group === "townsfolk") || (num(p.aggression) < 0.5 && !p.animal);

/** c1: the hostages a fight held, from the takers' token flags: [{taker, hostage}] for one combat id. */
export function hostagesOf(tokens = [], combatId = null) {
  return tokens.filter(t => t?.hostage?.token && (!combatId || !t.hostage.combat || t.hostage.combat === combatId))
    .map(t => ({taker: t.id, hostage: t.hostage.token}));
}

/**
 * r3: the next stop on a guard's beat: another tagged place on the same map, in turn, then back to the post.
 * places: region place ids on the scene (in a stable order); post: the guard's own place id; at: where it stands now.
 * Returns a place id, or null when the map has no other place.
 */
export function nextBeat(places = [], post = null, at = null, step = 0) {
  const others = [...new Set(places)].filter(Boolean);
  if ( others.length < 2 && !(others.length === 1 && others[0] !== post) ) return null;
  const ring = post && others.includes(post) ? [post, ...others.filter(p => p !== post)] : others;
  const i = ring.indexOf(at);
  const next = ring[(i < 0 ? num(step) : i + 1) % ring.length];
  return next === at ? ring[(ring.indexOf(next) + 1) % ring.length] : next;
}
export const beatDue = (last, now) => !Number.isFinite(Number(last)) || last === null || num(now) - num(last) >= BEAT_SECONDS;
