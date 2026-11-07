import {MODULE_ID, behaviorType, makeRatingsBehavior, placeOf} from "./ratings.mjs";
import {registerStatuses, stepSideways, clearCrossing, onApplyChangeGM, STATUS} from "./crossing.mjs";
import {TaggingApp, writeReport, writeChartsPage} from "./tagging-app.mjs";
import {buildPenumbraPrototype} from "./prototype.mjs";
import * as rules from "./rules.mjs";
import {installSearch} from "../../wodx-chronicle/scripts/search.mjs";

let active = false;

Hooks.once("init", () => {
  if ( !game.world?.flags?.wodx ) {
    console.warn("WoDX | This world has no WoDX flag in world.json; WoDX Otherworlds stays idle.");
    return;
  }
  active = true;
  installSearch();
  const BEHAVIOR_TYPE = behaviorType();
  if ( !game.model?.RegionBehavior?.[BEHAVIOR_TYPE] ) console.warn(`WoDX | ${BEHAVIOR_TYPE} is not in the game model; restart Foundry after installing.`);
  CONFIG.RegionBehavior.dataModels[BEHAVIOR_TYPE] = makeRatingsBehavior();
  CONFIG.RegionBehavior.typeLabels[BEHAVIOR_TYPE] = "WoDX: Otherworld ratings";
  CONFIG.RegionBehavior.typeHints[BEHAVIOR_TYPE] = "Gauntlet, Shroud and Banality for this area; overrides the scene's ratings.";
  CONFIG.RegionBehavior.typeIcons[BEHAVIOR_TYPE] = "fa-solid fa-ghost";
  registerStatuses();
});

Hooks.once("ready", () => {
  if ( !active ) return;
  game.socket.on(`module.${MODULE_ID}`, async message => {
    if ( message?.type === "applyChange" ) await onApplyChangeGM(message.payload ?? {});
  });
  const api = {
    stepSideways: () => stepSideways({mode: "cross"}),
    peek: () => stepSideways({mode: "peek"}),
    clearCrossing, openRatings: () => TaggingApp.open(), writeReport, writeChartsPage,
    buildPenumbraPrototype, placeOf, rules, STATUS
  };
  game.modules.get(MODULE_ID).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {otherworlds: api});
  // Record the charts in Chronicle Rules once WoDX Chronicle has written that journal
  if ( game.users.activeGM?.isSelf ) setTimeout(() => writeChartsPage().catch(err => console.error("WoDX |", err)), 3000);
});

Hooks.on("wodxEraApplied", () => {
  if ( active && game.users.activeGM?.isSelf ) writeChartsPage().catch(err => console.error("WoDX |", err));
});

Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxStepSideways = {
    name: "wodxStepSideways", title: "Step sideways (selected Garou)", icon: "fa-solid fa-door-open", order: 110,
    button: true, visible: true, onChange: () => stepSideways({mode: "cross"})
  };
  tokens.tools.wodxPeek = {
    name: "wodxPeek", title: "Peek across the Gauntlet", icon: "fa-solid fa-eye", order: 111,
    button: true, visible: true, onChange: () => stepSideways({mode: "peek"})
  };
  tokens.tools.wodxRatings = {
    name: "wodxRatings", title: "Otherworld ratings by scene", icon: "fa-solid fa-ghost", order: 112,
    button: true, visible: game.user.isGM, onChange: () => TaggingApp.open()
  };
});
