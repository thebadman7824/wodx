/**
 * WoDX Chronicle: feast and fast days in the world. The rules are in church-rules.mjs; this reads the clock.
 *   on(date)   the church day for a described date (describeTime output), with active = the house rule's state
 *   today()    the same for the current world time
 *   extra()    the Storyteller's own feasts (setting "feasts"), for WoDX NPC's routines
 */
import {MODULE_ID, rule, setting} from "./util.mjs";
import {describeTime} from "./calendar.mjs";
import * as R from "./church-rules.mjs";

export function registerChurchSettings() {
  game.settings.register(MODULE_ID, "feasts", {
    name: "The chronicle's own feast days",
    hint: "One a line, month-day and name, such as 09-01 St Giles (a town's patron saint, a fair). The church's great feasts and fasts are known already.",
    scope: "world", config: true, type: String, default: ""
  });
}

export const extra = () => { try { return R.parseFeasts(setting("feasts")); } catch (e) { return []; } };

export function on(date) {
  if ( !date ) return null;
  const c = R.churchDay(date, {extra: extra()});
  let active = false;
  try { active = !!rule("feastFast"); } catch (e) { active = false; }
  return {...c, active, label: R.churchLabel(c)};
}

export const today = () => on(describeTime(game.time.worldTime, setting("latitude")));
export const at = time => on(describeTime(time, setting("latitude")));
export {R as rules};
