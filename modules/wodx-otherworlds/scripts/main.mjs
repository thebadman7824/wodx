import {MODULE_ID, behaviorType, makeRatingsBehavior, placeOf} from "./ratings.mjs";
import {registerStatuses, stepSideways, clearCrossing, onApplyChangeGM, STATUS, crossShroud, checkYearAndDay, registerYearHandler, disconnectionOf, worldOf, sendAcross} from "./crossing.mjs";
import * as twins from "./twins.mjs";
import {TwinsApp} from "./twins-app.mjs";
import * as senses from "./senses.mjs";
import {TaggingApp, writeReport, writeChartsPage} from "./tagging-app.mjs";
import {buildPenumbraPrototype} from "./prototype.mjs";
import * as rules from "./rules.mjs";
import * as journey from "./journey.mjs";
import * as realms from "./realms.mjs";
import * as ways from "./ways.mjs";
import * as drift from "./drift.mjs";
import * as driftRules from "./drift-rules.mjs";
import * as waysRules from "./ways-rules.mjs";
import * as realmsRules from "./realms-rules.mjs";
import * as realmMaps from "./realm-maps.mjs";
import * as realmMapsRules from "./realm-maps-rules.mjs";
import * as reflect from "./reflect.mjs";
import * as reflectRules from "./reflect-rules.mjs";
import * as spirits from "./spirits.mjs";
import * as spiritRules from "./spirit-rules.mjs";
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
  journey.registerJourneySettings();
  realms.registerRealmSettings();
  realms.setupRealms();
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
    buildPenumbraPrototype, placeOf, rules, STATUS,
    crossShroud, sendAcross, openTwins: () => TwinsApp.open(), twins, disconnectionOf, worldOf, checkYearAndDay,
    readTheSoul: o => senses.readTheSoul(o), editAura: actor => senses.editAura(actor ?? canvas?.tokens?.controlled?.[0]?.actor), senses,
    journey: {draw: journey.drawJourney, propose: journey.proposeJourney, approve: journey.approveJourney, rules: journey.J},
    journeyDialog: journey.journeyDialog, decayCss: journey.decayCss, lookCss: journey.lookCss, applyDecay: journey.applyDecay, swaying: journey.swaying,
    realms: {rules: realmsRules, storm: realms.storm, shreddingWinds: realms.shreddingWinds, addDreamingLevel: realms.addDreamingLevel, makeTrod: realms.makeTrod,
      dreamingGate: realms.dreamingGate, dreamingDialog: realms.dreamingDialog, checkDisembodiment: realms.checkDisembodiment, jack: realms.jack, netOpen: realms.netOpen,
      netContest: realms.netContest, rollsDialog: realms.rollsDialog, applyLayerSound: realms.applyLayerSound, wantedLayerSound: realms.wantedLayerSound, layerSoundNow: realms.layerSoundNow},
    drift: {of: drift.driftOf, step: drift.stepDrift, undo: drift.undoStep, dialog: drift.driftDialog, onMapEvent: drift.onMapEvent, rules: driftRules},
    ways: {make: ways.makeWay, realm: ways.makeRealm, dialog: ways.waysDialog, isRealm: ways.isRealm, rules: waysRules},
    realmMaps: {draw: realmMaps.drawRealm, redraw: realmMaps.redrawRealm, send: realmMaps.sendToRealm, bringBack: realmMaps.bringBack,
      dialog: realmMaps.realmMapsDialog, isRealmMap: realmMaps.isRealmMap, artOf: realmMaps.artOf, modelOf: realmMaps.modelOf, rules: realmMapsRules},
    spirits: {of: spirits.of, standing: spirits.standing, effect: spirits.effect, move: spirits.move, setTotem: spirits.setTotem, dialog: spirits.spiritsDialog,
      courtOptions: spirits.courtOptions, rules: spiritRules},
    reflect: {scene: reflect.reflectScene, undo: reflect.undoReflection, dialog: reflect.reflectDialog, guessPath: reflect.guessPath, rules: reflectRules}
  };
  game.modules.get(MODULE_ID).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {otherworlds: api});
  // Record the charts in Chronicle Rules once WoDX Chronicle has written that journal
  if ( game.users.activeGM?.isSelf ) setTimeout(() => writeChartsPage().catch(err => console.error("WoDX |", err)), 3000);
  // The year-and-a-day proposals go to WoDX Chronicle's approval queue
  if ( game.modules.get("wodx-chronicle")?.api ) { registerYearHandler(); drift.registerDriftHandler(); }
  else Hooks.once("wodxChronicleReady", () => { registerYearHandler(); drift.registerDriftHandler(); });
  journey.registerJourneys();
  journey.applyDecay();
});

/* ---- the Shadowlands' decay follows the controlled token ---- */
const decaySoon = (() => { let t = null; return () => { clearTimeout(t); t = setTimeout(() => { try { journey.applyDecay(); } catch (e) { console.warn("WoDX | decay", e); } }, 150); }; })();
Hooks.on("controlToken", () => { if ( active ) decaySoon(); });
Hooks.on("canvasReady", () => { if ( active ) decaySoon(); });
Hooks.on("updateToken", (doc, change) => { if ( active && ("level" in change || "x" in change || "y" in change) && doc.object?.controlled ) decaySoon(); });
// Jacking into the Net or out of it changes the look
const netChange = e => { if ( active && e?.statuses?.has?.(STATUS.net.id) ) decaySoon(); };
Hooks.on("createActiveEffect", netChange);
Hooks.on("deleteActiveEffect", netChange);

const skipping = () => !!game.modules.get("wodx-chronicle")?.api?.isSkipping?.();
Hooks.on("updateWorldTime", () => {
  if ( active && !skipping() ) checkYearAndDay().catch(err => console.error("WoDX |", err));
});
Hooks.on("wodxSkipEnd", () => {
  if ( active ) checkYearAndDay().catch(err => console.error("WoDX |", err));
});

Hooks.on("wodxMapEvent", ev => { if ( active ) drift.onMapEvent(ev).catch(err => console.error("WoDX |", err)); });

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
  tokens.tools.wodxShroud = {
    name: "wodxShroud", title: "Cross the Shroud (Storyteller)", icon: "fa-solid fa-skull", order: 113,
    button: true, visible: game.user.isGM, onChange: () => crossShroud()
  };
  tokens.tools.wodxTwins = {
    name: "wodxTwins", title: "Penumbra and Shadowlands levels", icon: "fa-solid fa-clone", order: 114,
    button: true, visible: game.user.isGM, onChange: () => TwinsApp.open()
  };
  tokens.tools.wodxSoul = {
    name: "wodxSoul", title: "Read the Soul (select the reader, target the one read)", icon: "fa-solid fa-hand-sparkles", order: 115,
    button: true, visible: true, onChange: () => senses.readTheSoul()
  };
  tokens.tools.wodxSpirits = {
    name: "wodxSpirits", title: "Standing with the spirit courts (the selected token's character)", icon: "fa-solid fa-feather-pointed", order: 117,
    button: true, visible: true, onChange: () => spirits.spiritsDialog()
  };
  tokens.tools.wodxAura = {
    name: "wodxAura", title: "Set the aura of the selected token's character", icon: "fa-solid fa-palette", order: 116,
    button: true, visible: game.user.isGM, onChange: () => senses.editAura(canvas?.tokens?.controlled?.[0]?.actor)
  };
  tokens.tools.wodxDreaming = {
    name: "wodxDreaming", title: "A gateway to the Near Dreaming (Storyteller)", icon: "fa-solid fa-feather", order: 130,
    button: true, visible: game.user.isGM, onChange: () => realms.dreamingDialog()
  };
  tokens.tools.wodxWays = {
    name: "wodxWays", title: "Ways and realms: trods, Moon Paths, airts, Anchorheads, Byways and realm scenes (Storyteller)", icon: "fa-solid fa-route", order: 132,
    button: true, visible: game.user.isGM, onChange: () => ways.waysDialog()
  };
  tokens.tools.wodxRealmMaps = {
    name: "wodxRealmMaps", title: "Realm maps: draw a realm past the near worlds, send the selected tokens there, bring them back (Storyteller)", icon: "fa-solid fa-map", order: 133,
    button: true, visible: game.user.isGM, onChange: () => realmMaps.realmMapsDialog()
  };
  tokens.tools.wodxReflect = {
    name: "wodxReflect", title: "Reflect a generated town map in the Penumbra and Shadowlands (Storyteller)", icon: "fa-solid fa-ghost", order: 115,
    button: true, visible: game.user.isGM, onChange: () => reflect.reflectDialog()
  };
  tokens.tools.wodxOtherRolls = {
    name: "wodxOtherRolls", title: "Otherworld rolls: the Avatar Storm, the Opened Bridge, Wayfare, the Maelstrom, the Net", icon: "fa-solid fa-meteor", order: 131,
    button: true, visible: true, onChange: () => realms.rollsDialog()
  };
  if ( realms.netOpen() ) tokens.tools.wodxJack = {
    name: "wodxJack", title: "Jack into the Net, or out", icon: "fa-solid fa-network-wired", order: 132,
    button: true, visible: true, onChange: () => realms.jack()
  };
  tokens.tools.wodxRatings = {
    name: "wodxRatings", title: "Otherworld ratings by scene", icon: "fa-solid fa-ghost", order: 112,
    button: true, visible: game.user.isGM, onChange: () => TaggingApp.open()
  };
});
