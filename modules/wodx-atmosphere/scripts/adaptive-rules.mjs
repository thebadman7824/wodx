/**
 * Adaptive sound (WoDX Atmosphere 0.8.0), the pure rules. The era kit's music follows the table's tension: quiet,
 * hunt, combat and frenzy, the strongest one wins. And a heartbeat for a vampire's own player as the blood runs low.
 * No Foundry here.
 */

/** Strongest first. */
export const TENSIONS = ["frenzy", "combat", "hunt", "quiet"];
export const TENSION_LABELS = {quiet: "Quiet", hunt: "The hunt", combat: "Combat", frenzy: "Frenzy"};

/** Conditions that make a character's frenzy the table's (WoDX Chronicle's frenzy and Rötschreck). */
export const FRENZY_STATUSES = ["frenzy", "rotschreck"];
/** Conditions that mean someone is stalking or hiding (Foundry's invisible, and the common hidden/stealth names). */
export const HUNT_STATUSES = ["invisible", "hidden", "stealth", "obfuscate", "stalking"];

/**
 * The tension now. `set` is the Storyteller's choice (auto, or one tension held by hand); auto reads the table:
 * a player's character in frenzy, a fight running, a player's character hiding or stalking, else quiet.
 */
export function tensionOf({set = "auto", combat = false, statuses = []} = {}) {
  if ( TENSION_LABELS[set] ) return set;
  // WoDX Chronicle registers its conditions as wodx-frenzy, wodx-rotschreck and so on
  const has = list => statuses.some(s => list.includes(String(s).toLowerCase().replace(/^wodx-/, "")));
  if ( has(FRENZY_STATUSES) ) return "frenzy";
  if ( combat ) return "combat";
  if ( has(HUNT_STATUSES) ) return "hunt";
  return "quiet";
}

/**
 * The music mood for a tension. Frenzy plays the kit's frenzy playlist, else its combat one; the hunt plays tension;
 * quiet plays the mood the Storyteller last chose. `has(mood)` says whether the kit has that playlist. Null: nothing.
 */
export function moodFor(tension, base = "calm", has = () => true) {
  const chain = {frenzy: ["frenzy", "combat"], combat: ["combat"], hunt: ["tension"], quiet: [base || "calm"]}[tension] ?? [base || "calm"];
  return chain.find(m => has(m)) ?? null;
}

/**
 * The heartbeat, for a character with a blood pool (house rule; the books give no sound). It starts at 4 blood or
 * fewer (or at a third of a small pool, whichever is lower) and quickens and loudens as the pool empties.
 * Null: no heartbeat. {bpm, volume} otherwise, volume from 0 to 1 before the player's own cue volume.
 */
export function heartbeat({blood, max = 10, hasBlood = false} = {}) {
  if ( !hasBlood ) return null;
  const b = Number(blood), m = Math.max(1, Number(max) || 10);
  if ( !Number.isFinite(b) || b < 0 ) return null;
  const start = Math.min(4, Math.max(1, Math.ceil(m / 3)));
  if ( b > start ) return null;
  const k = (start - b) / start;
  return {bpm: Math.round(50 + 60 * k), volume: Math.round((0.15 + 0.35 * k) * 100) / 100};
}

/** Milliseconds between beats. */
export const beatGap = bpm => Math.round(60000 / Math.max(20, Math.min(200, Number(bpm) || 60)));
