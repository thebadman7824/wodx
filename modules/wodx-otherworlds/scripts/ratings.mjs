import {SETTLEMENTS, gauntletFor, DEFAULT_CHART} from "./rules.mjs";
import {normDrift, withDrift, banalityWithDrift, shroudWithDrift} from "./drift-rules.mjs";
import {groundShift, shiftRating} from "./mark-rules.mjs";

export const MODULE_ID = "wodx-otherworlds";
/** Foundry names a module's sub-type "<module id>.<type>"; read the real key from the game model when it is there. */
export function behaviorType() {
  const keys = Object.keys(globalThis.game?.model?.RegionBehavior ?? {});
  return keys.find(k => k.startsWith(`${MODULE_ID}.`) && k.endsWith("ratings")) ?? `${MODULE_ID}.ratings`;
}

/** Build the region behavior type that carries Otherworld ratings. Called in init. */
export function makeRatingsBehavior() {
  const {RegionBehaviorType} = foundry.data.regionBehaviors;
  const f = foundry.data.fields;
  return class OtherworldRatingsBehavior extends RegionBehaviorType {
    static defineSchema() {
      return {
        settlement: new f.StringField({required: true, blank: true, initial: "", choices: SETTLEMENTS,
          label: "Kind of place", hint: "Sets the Gauntlet from the era's chart."}),
        gauntlet: new f.NumberField({required: false, nullable: true, initial: null, integer: true, min: 0, max: 10,
          label: "Gauntlet (override)", hint: "Leave empty to use the era's chart. 0 means no roll is needed."}),
        modifier: new f.NumberField({required: true, nullable: false, initial: 0, integer: true, min: -5, max: 5,
          label: "Gauntlet modifier", hint: "For a local reason, such as a railroad or a recent Umbral storm."}),
        shroud: new f.NumberField({required: false, nullable: true, initial: null, integer: true, min: 4, max: 10,
          label: "Shroud", hint: "4 to 10 (Wraith 20th)."}),
        banality: new f.NumberField({required: false, nullable: true, initial: null, integer: true, min: 0, max: 10,
          label: "Banality", hint: "Changeling 20th."}),
        reflective: new f.BooleanField({initial: false,
          label: "A reflective surface is at hand", hint: "Still water, a mirror, a polished shield."}),
        umbralStorm: new f.BooleanField({initial: false,
          label: "Umbral storm", hint: "Wyld West: each 1 on a Gnosis roll counts as two."}),
        priority: new f.NumberField({required: true, nullable: false, initial: 0, integer: true,
          label: "Priority", hint: "Where regions overlap, the highest priority wins."})
      };
    }

    static events = {};
  };
}

/** Ratings stored on a scene (flags), used where no region says otherwise. */
export function sceneRatings(scene) {
  return scene?.getFlag(MODULE_ID, "ratings") ?? null;
}

/** The ratings behavior that applies to a token, if any. */
export function regionRatingsFor(tokenDoc) {
  const regions = tokenDoc?.regions ? [...tokenDoc.regions] : [];
  const type = behaviorType();
  const found = [];
  for ( const region of regions ) {
    for ( const b of region.behaviors ?? [] ) {
      if ( b.type === type && !b.disabled ) found.push({region, behavior: b, ratings: b.system});
    }
  }
  found.sort((a, b) => (b.ratings.priority ?? 0) - (a.ratings.priority ?? 0));
  return found[0] ?? null;
}

/** The chart the active era uses (from WoDX Chronicle), or W20. */
export function activeChartId() {
  const api = game.modules.get("wodx-chronicle")?.api;
  const chart = api?.eras?.activeEra?.()?.profile?.rules?.gauntletChart;
  return chart ?? DEFAULT_CHART;
}

/**
 * Everything known about the place a token stands.
 * @returns {{ratings: object, where: string, regionId: string|null, chartId: string, gauntlet: number|null, source: string|null, notes: string[]}}
 */
export function placeOf(tokenDoc) {
  const scene = tokenDoc.parent;
  const hit = regionRatingsFor(tokenDoc);
  const ratings = hit ? toPlain(hit.ratings) : {...(sceneRatings(scene) ?? {})};
  const where = hit ? `${scene.name}, ${hit.region.name}` : scene.name;
  const chartId = activeChartId();
  const g = gauntletFor(chartId, ratings);
  // A Gauntlet that moves: the scene's drift (taint, rites, neglect) on top of the chart and the modifier
  const dr = normDrift(scene?.flags?.[MODULE_ID]?.drift ?? {}), drift = dr.value;
  if ( dr.banality && ratings.banality !== null && ratings.banality !== undefined ) ratings.banality = banalityWithDrift(ratings.banality, dr.banality);
  if ( dr.shroud && ratings.shroud !== null && ratings.shroud !== undefined ) ratings.shroud = shroudWithDrift(ratings.shroud, dr.shroud);
  if ( drift && g.gauntlet !== null && g.gauntlet !== 0 ) {
    g.notes = [...(g.notes ?? []), `Drift over time ${drift > 0 ? "+" : ""}${drift} (house rule)`];
    g.gauntlet = withDrift(g.gauntlet, drift);
  }
  // Otherworlds 0.25.0 (B2912, B2913): reflection marks and mood regions with a rule under the token
  const ground = groundUnder(tokenDoc);
  if ( ground.notes.length ) {
    if ( ground.gauntlet && g.gauntlet !== null && g.gauntlet !== 0 ) g.gauntlet = shiftRating(g.gauntlet, ground.gauntlet, {min: 2, max: 10});
    if ( ground.shroud && ratings.shroud !== null && ratings.shroud !== undefined ) ratings.shroud = shiftRating(ratings.shroud, ground.shroud, {min: 4, max: 10});
    if ( ground.banality && ratings.banality !== null && ratings.banality !== undefined ) ratings.banality = shiftRating(ratings.banality, ground.banality, {min: 1, max: 10});
    g.notes = [...(g.notes ?? []), ...ground.notes];
  }
  return {ratings, where, regionId: hit?.region.id ?? null, sceneId: scene.id, chartId, drift, ground, ...g};
}

/** The regions of any level of the scene that hold the token's centre. */
function regionsAt(tokenDoc) {
  const scene = tokenDoc?.parent;
  if ( !scene?.regions ) return [];
  const gs = scene.grid?.size ?? 100;
  const c = tokenDoc.object?.center ?? {x: (tokenDoc.x ?? 0) + (tokenDoc.width ?? 1) * gs / 2, y: (tokenDoc.y ?? 0) + (tokenDoc.height ?? 1) * gs / 2};
  const inside = r => {
    try {
      if ( r.polygonTree?.testPoint ) return r.polygonTree.testPoint(c);
      if ( r.object?.polygonTree?.testPoint ) return r.object.polygonTree.testPoint(c);
    } catch (e) { /* fall through to the shapes */ }
    return (r.shapes ?? []).some(s => s.type === "rectangle" && c.x >= s.x && c.x <= s.x + s.width && c.y >= s.y && c.y <= s.y + s.height);
  };
  return [...scene.regions].filter(inside);
}
/** {gauntlet, shroud, notes} from the reflection marks and the Atmosphere mood rules under a token. */
export function groundUnder(tokenDoc) {
  try {
    const rs = regionsAt(tokenDoc);
    const marks = rs.map(r => r.flags?.[MODULE_ID]?.reflection).filter(k => typeof k === "string");
    const mood = game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere").api?.mood?.ruleAt?.(tokenDoc) : null;
    const moods = mood && mood.names.length ? [{name: mood.names.join(", "), rule: mood}] : [];
    return groundShift(marks, moods);
  } catch (e) { return {gauntlet: 0, shroud: 0, notes: []}; }
}

function toPlain(system) {
  return {
    settlement: system.settlement ?? "", gauntlet: system.gauntlet ?? null, modifier: system.modifier ?? 0,
    shroud: system.shroud ?? null, banality: system.banality ?? null, reflective: !!system.reflective,
    umbralStorm: !!system.umbralStorm
  };
}
