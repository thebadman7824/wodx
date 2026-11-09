/**
 * WoDX Senses 0.3.0: what each player's own screen shows of their character's senses. Pure rules, harness-tested.
 *
 *   The screen   A character in frenzy sees a red edge round the screen; one in Rötschreck sees the colour drain
 *                from the map. Rötschreck wins when both are on. Each player can turn it off on their computer.
 *   Scent trails A character with a wolf's nose (Crinos, Hispo or Lupus, as the sense answers already read it) sees
 *                faint trails where others have walked in the last hour of world time, as far as smell reaches.
 *   The unseen   A token hidden by Obfuscate, by sneaking or by the Invisible status shows only to the players whose
 *                characters found it. The Storyteller rolls for them with the books' noticing rules (WoDX NPC's
 *                notice(): V20 p. 142, V20 Dark Ages pp. 169, 195) and the token's "seen by" list keeps who did.
 */

/** Which screen a character's state calls for: "rotschreck", "frenzy" or null. */
export function screenFor({frenzy = false, rotschreck = false} = {}) {
  if ( rotschreck ) return "rotschreck";
  if ( frenzy ) return "frenzy";
  return null;
}

/** How long a trail lasts, in seconds of world time, and how many steps of one token are kept. */
export const TRAIL_SECONDS = 3600;
export const TRAIL_STEPS = 60;

/** Add a step to a token's trail and drop what is too old. trail: [{x, y, at}]; returns a new list. */
export function addStep(trail = [], step, {now = step?.at ?? 0, maxAge = TRAIL_SECONDS, max = TRAIL_STEPS} = {}) {
  const out = [...trail, step].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && now - (Number(p.at) || 0) <= maxAge);
  return out.slice(-max);
}

/** How strong a step of a trail still is, 0 to 1: fresh is strong, an hour old is gone. A step from the future (the clock set back) is gone too. */
export function trailStrength(at, now, maxAge = TRAIL_SECONDS) {
  const age = (Number(now) || 0) - (Number(at) || 0);
  if ( age < 0 || age > maxAge ) return 0;
  return Math.max(0.1, 1 - age / maxAge);
}

/** Smell's reach in yards for a nose (the sense answers' reach: 8 yards, 20 for a strong scent, more for each step). */
export const smellYards = (steps = 0, strong = false) => (strong ? 20 : 8) * (1 + (Number(steps) || 0));

/**
 * The steps a nose can follow: [{x, y, alpha}]. me: {x, y} in pixels; pxPerYard: pixels to a yard.
 * trails: {tokenId: [{x, y, at}]}; skip: token ids never shown (the sniffer, tokens the Storyteller hid).
 */
export function stepsInReach(trails, me, {now, pxPerYard = 20, reachYards = 16, skip = []} = {}) {
  const out = [];
  if ( !me ) return out;
  const reach = reachYards * pxPerYard;
  for ( const [id, list] of Object.entries(trails ?? {}) ) {
    if ( skip.includes(id) ) continue;
    for ( const p of list ?? [] ) {
      const a = trailStrength(p.at, now);
      if ( !a ) continue;
      if ( Math.hypot(p.x - me.x, p.y - me.y) > reach ) continue;
      out.push({x: p.x, y: p.y, alpha: Math.round(a * 100) / 100, id});
    }
  }
  return out;
}

/** Whether a token hidden from sight shows to this player. t: {gmHidden, concealed, seenBy: [actor ids], owner}; mine: [actor ids]. */
export function showsTo(t, mine = [], {isGM = false} = {}) {
  if ( isGM || t.owner ) return true;
  if ( t.gmHidden ) return false;
  if ( !t.concealed ) return true;
  return (t.seenBy ?? []).some(id => mine.includes(id));
}

/** The seen-by list after a roll: those who noticed join it; nobody leaves it until the Storyteller clears it. */
export function seenAfter(seenBy = [], results = []) {
  const set = new Set(seenBy);
  for ( const r of results ) if ( r.noticed && r.actorId ) set.add(r.actorId);
  return [...set];
}
