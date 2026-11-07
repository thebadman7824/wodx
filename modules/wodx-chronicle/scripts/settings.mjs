import {MODULE_ID} from "./util.mjs";
import HOUSE_RULE_DATA from "../data/house-rules.mjs";
import {REFORMS} from "./calendar-math.mjs";

/** House-rule definitions. */
export const HOUSE_RULES = HOUSE_RULE_DATA;

/**
 * Register settings. Runs synchronously inside init.
 * @param {object} hooks  Callbacks for onChange handlers, supplied by main.mjs
 */
export function registerSettings(hooks) {
  const reformChoices = Object.fromEntries(Object.entries(REFORMS).map(([k, v]) => [k, v.label]));

  game.settings.register(MODULE_ID, "reform", {
    name: "Calendar reform",
    hint: "When the chronicle's homeland moves from the Julian to the Gregorian calendar. The skipped days never happen.",
    scope: "world", config: true, type: String, choices: reformChoices, default: "bohemia-1584",
    requiresReload: true
  });

  game.settings.register(MODULE_ID, "latitude", {
    name: "Latitude for sunrise and sunset",
    hint: "Degrees north. Prague is 50.1; most of Bohemia lies between 48.6 and 51.0.",
    scope: "world", config: true, type: Number, default: 50.1,
    onChange: () => hooks.onClockChange()
  });

  game.settings.register(MODULE_ID, "region", {
    name: "Chronicle region",
    hint: "Some era profiles apply only to one region, such as the Wild West in the Americas.",
    scope: "world", config: true, type: String,
    choices: {europe: "Europe", americas: "The Americas", other: "Elsewhere"}, default: "europe",
    onChange: () => hooks.onEraInputsChange()
  });

  // Internal state
  game.settings.register(MODULE_ID, "activeEra", {
    scope: "world", config: false, type: String, default: "", onChange: () => hooks.onActiveEraChange()
  });
  game.settings.register(MODULE_ID, "eraLock", {
    scope: "world", config: false, type: String, default: "", onChange: () => hooks.onEraInputsChange()
  });
  game.settings.register(MODULE_ID, "declinedEra", {scope: "world", config: false, type: String, default: ""});
  game.settings.register(MODULE_ID, "skipping", {scope: "world", config: false, type: Object, default: null});
  game.settings.register(MODULE_ID, "declinedFixes", {scope: "world", config: false, type: Object, default: {}});
  game.settings.register(MODULE_ID, "openingSet", {scope: "world", config: false, type: Boolean, default: false});
  game.settings.register(MODULE_ID, "approvals", {
    scope: "world", config: false, type: Object, default: {pending: [], history: []},
    onChange: () => hooks.onApprovalsChange()
  });

  // House rules
  for ( const s of HOUSE_RULES.switches ) {
    game.settings.register(MODULE_ID, `rule.${s.id}`, {
      name: s.name, hint: s.hint, scope: "world", config: false, type: Boolean, default: !!s.default,
      onChange: () => hooks.onRuleChange(s.id)
    });
  }

  game.settings.registerMenu(MODULE_ID, "houseRulesMenu", {
    name: "House rules",
    label: "Open house rules",
    hint: "Every house rule is an on/off switch, recorded in the Chronicle Rules journal.",
    icon: "fa-solid fa-scale-balanced",
    type: hooks.HouseRulesApp,
    restricted: true
  });
}
