import {SETTLEMENTS, gauntletFor, DEFAULT_CHART} from "./rules.mjs";
import {normDrift, withDrift, banalityWithDrift} from "./drift-rules.mjs";

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
  if ( drift && g.gauntlet !== null && g.gauntlet !== 0 ) {
    g.notes = [...(g.notes ?? []), `Drift over time ${drift > 0 ? "+" : ""}${drift} (house rule)`];
    g.gauntlet = withDrift(g.gauntlet, drift);
  }
  return {ratings, where, regionId: hit?.region.id ?? null, sceneId: scene.id, chartId, drift, ...g};
}

function toPlain(system) {
  return {
    settlement: system.settlement ?? "", gauntlet: system.gauntlet ?? null, modifier: system.modifier ?? 0,
    shroud: system.shroud ?? null, banality: system.banality ?? null, reflective: !!system.reflective,
    umbralStorm: !!system.umbralStorm
  };
}
