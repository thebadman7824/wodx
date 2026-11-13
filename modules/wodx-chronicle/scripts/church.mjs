/**
 * WoDX Chronicle: feast and fast days in the world. The rules are in church-rules.mjs; this reads the clock.
 *   on(date)   the church day for a described date (describeTime output), with active = the house rule's state
 *   today()    the same for the current world time
 *   extra()    the Storyteller's own feasts (setting "feasts"), for WoDX NPC's routines
 */
import {MODULE_ID, rule, setting} from "./util.mjs";
import {describeTime} from "./calendar.mjs";
import * as R from "./church-rules.mjs";
import * as F from "./faith-rules.mjs";
import * as place from "./place.mjs";

export function registerChurchSettings() {
  game.settings.register(MODULE_ID, "feasts", {
    name: "The chronicle's own feast days",
    hint: "One a line, month-day and name, such as 09-01 St Giles (a town's patron saint, a fair). The church's great feasts and fasts are known already.",
    scope: "world", config: true, type: String, default: ""
  });
  game.settings.register(MODULE_ID, "faith", {
    name: "Whose holy days the chronicle keeps",
    hint: "By the homeland follows the region and the year (the Muslim year in Cairo, the lunar year in China). A scene far from home follows its own region, or the year picked for it in Where this scene stands.",
    scope: "world", config: true, type: String, default: "",
    choices: {"": "By the homeland", ...Object.fromEntries(Object.entries(F.FAITHS).map(([id, f]) => [id, f.label]))}
  });
}

const activeScene = () => { try { return game.scenes?.active ?? null; } catch (e) { return null; } };
/** Whose year is kept where a scene stands: the scene's own pick, its region's, the chronicle's pick, the homeland's. */
export function faithOf(scene = activeScene(), year = 0) {
  try {
    const p = place.placeOf(scene);
    if ( p.faith ) return {faith: p.faith, region: p.region ?? place.homeland()};
    if ( p.region && p.region !== place.homeland() ) return {faith: F.faithFor(p.region, year), region: p.region};
    const own = setting("faith");
    return {faith: F.FAITHS[own] ? own : F.faithFor(place.homeland(), year), region: place.homeland()};
  } catch (e) { return {faith: "western", region: "moravia"}; }
}

export const extra = () => { try { return R.parseFeasts(setting("feasts")); } catch (e) { return []; } };

/**
 * The holy day for a described date. opts.scene: the scene whose people keep it (the active scene when left out);
 * opts.others: also list the named days other faiths keep today.
 */
export function on(date, opts = {}) {
  if ( !date ) return null;
  const {faith, region} = faithOf(opts.scene === undefined ? activeScene() : opts.scene, date.year);
  const c = F.faithDay(faith, date, {extra: extra(), region});
  let active = false;
  try { active = !!rule("feastFast"); } catch (e) { active = false; }
  const out = {...c, faith, calendar: F.FAITHS[faith]?.year ?? "Church year", active, label: R.churchLabel(c)};
  if ( opts.others ) { try { out.others = F.otherDays(date, faith); } catch (e) { out.others = []; } }
  return out;
}

export const today = (opts = {}) => on(describeTime(game.time.worldTime, setting("latitude")), opts);
export const at = (time, opts = {}) => on(describeTime(time, setting("latitude")), opts);
export {R as rules, F as faiths};
