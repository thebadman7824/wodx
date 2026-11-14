/**
 * WoDX Library: faith and occult goods in play (B3902 to B3904). No Foundry calls here; faith-use.mjs does the rest.
 *
 *   Pray: with True Faith, the thing is the focus of WoDX Actions' True Faith (repel, resist). Without it, a quiet
 *     prayer once a night: Willpower at difficulty 8, and a success gives back a point of temporary Willpower (house
 *     rule: the comfort of faith, never above the permanent rating).
 *   Set it as a ward: a folk charm the bearer believes in, carried and set, makes mind powers and magic used on them
 *     one harder (+1 difficulty, house rule), read by WoDX Chronicle's trait effects (channel "resist"). It does not
 *     stack: the best ward counts. It does nothing against mortals' own tricks.
 *   Divine with it: Perception + Occult at difficulty 7; the successes say how clear the signs are, and the
 *     Storyteller is asked to answer that many questions in a sentence each.
 */
export const PRAY_DIFF = 8;
export const DIVINE_DIFF = 7;
export const WARD_DIFF = 1;

/** The night a world time falls in (a day counted from noon, so a night is one count). */
export const nightOf = worldTime => Math.floor(((Number(worldTime) || 0) - 43200) / 86400);

/** A prayer without True Faith: {ok, willpower, line}. prayedNight: the night the character last prayed. */
export function prayResult({successes = 0, botch = false} = {}, {temporary = 0, permanent = 0, prayedNight = null, night = 0} = {}) {
  if ( prayedNight === night ) return {ok: false, willpower: temporary, line: "They have prayed already tonight: the comfort does not come twice."};
  if ( botch ) return {ok: true, willpower: temporary, doubt: true, line: "The words ring hollow: doubt, and nothing comes back tonight."};
  if ( successes < 1 ) return {ok: true, willpower: temporary, line: "Quiet words, and no answer tonight."};
  // never takes Willpower away, even from a sheet whose permanent rating reads below its points
  const after = Math.max(Number(temporary) || 0, Math.min(Number(permanent) || 0, (Number(temporary) || 0) + 1));
  return {ok: true, willpower: after, line: after > temporary ? "A little calm comes back: 1 Willpower." : "A little calm comes back, though Willpower is already full."};
}

/** How clear the signs are for so many successes. */
export function divineLine({successes = 0, botch = false} = {}) {
  if ( botch ) return "The signs lie: the Storyteller gives one false answer, believed.";
  if ( successes < 1 ) return "The signs are muddled: no answer.";
  if ( successes === 1 ) return "A hint: the Storyteller answers one question, in a riddle.";
  if ( successes === 2 ) return "The signs speak: the Storyteller answers one question plainly.";
  return `A clear sight: the Storyteller answers ${Math.min(3, successes - 1)} questions plainly.`;
}

/**
 * The ward a character carries, as a trait effect on the "resist" channel: [{key, name, dice, diff, note}].
 * items: the character's items; ctx: {channel, tags, against}. Only mind powers and magic, only from the supernatural.
 */
export function wardEffects(items = [], ctx = {}) {
  if ( ctx.channel !== "resist" ) return [];
  const tags = (ctx.tags ?? []).map(t => String(t).toLowerCase());
  if ( !tags.some(t => ["mind", "magic", "thaumaturgy"].includes(t)) ) return [];
  if ( !ctx.against || ctx.against === "mortal" ) return [];
  const ward = (items ?? []).find(i => i?.system?.isequipped && i?.flags?.["wodx-library"]?.ward?.on);
  if ( !ward ) return [];
  return [{key: "ward", name: `Ward (${ward.name})`, dice: 0, diff: WARD_DIFF, note: "A charm the bearer believes in: +1 difficulty to mind powers and magic used on them"}];
}
