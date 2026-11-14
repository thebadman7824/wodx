/**
 * WoDX Otherworlds 0.25.0 (B2912, B2913): what the ground under a token adds to its crossing. Two sources, both
 * regions on the scene: the reflection marks (reflect-rules.mjs: a looming church, a Blight, a thin Shroud) and the
 * Storyteller's mood regions in WoDX Atmosphere that carry a rule (its api.mood.ruleAt). Pure rules, no Foundry.
 */

/** A reflection mark's pull: looming places sit closer to the spirit world, Blights and Nihils further, thin Shroud lets the dead through. */
export const MARK_SHIFT = {
  loom: {gauntlet: -1, note: "A looming place: the Gauntlet is one lower"},
  relic: {gauntlet: -1, note: "A place kept in the Umbra's memory: the Gauntlet is one lower"},
  blight: {gauntlet: 1, note: "A Blight: the Gauntlet is one higher"},
  thin: {shroud: -1, note: "Thin Shroud here: one lower"},
  nihil: {shroud: -1, note: "A Nihil close by: the Shroud is one lower"}
};

/** A mood region's rule (WoDX Atmosphere), kept clean: {gauntlet, shroud} as steps up or down, -3 to +3. */
export function cleanMoodRule(r = {}) {
  const step = v => { const n = Math.round(Number(v) || 0); return Math.max(-3, Math.min(3, n)); };
  return {gauntlet: step(r?.gauntlet), shroud: step(r?.shroud), banality: step(r?.banality)};
}

/**
 * The steps from every mark and rule under the token: {gauntlet, shroud, notes}. Each kind of mark counts once,
 * and the total of each rating moves at most two steps either way.
 * marks: reflection kinds (strings); moods: [{name, rule}].
 */
export function groundShift(marks = [], moods = []) {
  let gauntlet = 0, shroud = 0, banality = 0;
  const notes = [];
  for ( const k of new Set(marks) ) {
    const m = MARK_SHIFT[k];
    if ( !m ) continue;
    gauntlet += m.gauntlet ?? 0; shroud += m.shroud ?? 0; notes.push(m.note);
  }
  for ( const {name, rule} of moods ) {
    const r = cleanMoodRule(rule);
    if ( !r.gauntlet && !r.shroud && !r.banality ) continue;
    gauntlet += r.gauntlet; shroud += r.shroud; banality += r.banality;
    const s = n => (n > 0 ? `+${n}` : String(n));
    notes.push(`${name || "A mood region"}: ${[r.gauntlet ? `Gauntlet ${s(r.gauntlet)}` : "", r.shroud ? `Shroud ${s(r.shroud)}` : "", r.banality ? `Banality ${s(r.banality)}` : ""].filter(Boolean).join(", ")}`);
  }
  const cap = n => Math.max(-2, Math.min(2, n));
  return {gauntlet: cap(gauntlet), shroud: cap(shroud), banality: cap(banality), notes};
}

/** A rating moved by a step, kept inside its range; a Gauntlet of 0 (no roll) or an unrated place stays as it is. */
export function shiftRating(value, step, {min = 1, max = 10} = {}) {
  if ( value === null || value === undefined || value === 0 || !step ) return value;
  return Math.max(min, Math.min(max, Number(value) + step));
}
