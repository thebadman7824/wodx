import {MODULE_ID, SOCKET, isActiveGM, rule, setting, log} from "./util.mjs";
import {registerSettings} from "./settings.mjs";
import {makeCalendarClass, makeCalendarConfig, setReform, EPOCH_YEAR} from "./calendar.mjs";
import * as eras from "./eras.mjs";
import * as approvals from "./approvals.mjs";
import * as know from "./know.mjs";
import * as knowRules from "./know-rules.mjs";
import * as safety from "./safety.mjs";
import {ClockApp, setDateDialog} from "./clock-app.mjs";
import {HouseRulesApp} from "./house-rules-app.mjs";
import {runEraTest} from "./era-test.mjs";
import * as contentFixes from "./content-fixes.mjs";
import {installSearch} from "./search.mjs";
import * as skip from "./skip.mjs";
import * as conditions from "./conditions.mjs";
import * as timed from "./timed.mjs";
import * as theme from "./theme.mjs";
import * as playerTools from "./player-tools.mjs";
import * as playerView from "./player-view.mjs";
import * as playerViewRules from "./player-view-rules.mjs";
import * as gen from "./gen.mjs";
import * as events from "./events.mjs";
import * as migrations from "./migrations.mjs";
import * as languages from "./languages.mjs";
import * as tours from "./tours.mjs";
import * as effects from "./effects.mjs";
import * as church from "./church.mjs";
import * as release from "./release.mjs";
import * as when from "./when.mjs";
import * as referee from "./referee.mjs";
import * as refereeRules from "./referee-rules.mjs";
import * as traits from "./traits.mjs";
import * as signatures from "./signatures.mjs";
import * as place from "./place.mjs";
import * as placeRules from "./place-rules.mjs";
import * as worldRules from "./world-rules.mjs";
import * as pace from "./pace.mjs";
import * as pod from "./pod.mjs";
import * as legends from "./legends.mjs";
import * as automation from "./automation.mjs";
import * as automationRules from "./automation-rules.mjs";
import * as waiting from "./waiting.mjs";
import * as waitingRules from "./waiting-rules.mjs";

/** WoDX worlds carry flags.wodx in world.json; anywhere else this module stays idle. */
const isWoDXWorld = () => !!game.world?.flags?.wodx;
let active = false;
let initReform = null;

Hooks.once("init", () => {
  if ( !isWoDXWorld() ) {
    console.warn("WoDX | This world has no WoDX flag in world.json; WoDX Chronicle stays idle.");
    return;
  }
  active = true;
  installSearch();
  // Conditions are token statuses, so they are registered before the canvas is drawn
  conditions.registerCoreConditions();
  timed.registerTimedHooks();

  registerSettings({
    HouseRulesApp,
    onClockChange: () => ClockApp.refresh(),
    onEraInputsChange: () => { eras.checkEra(); ClockApp.refresh(); },
    onHomelandChange: value => { if ( !homelandQuiet ) applyHomeland(value); },
    onActiveEraChange: async () => { await eras.onActiveEraChange(); ClockApp.refresh(); },
    onHoldChange: async () => {
      ClockApp.refresh();
      if ( isActiveGM() && !skip.isHeld() ) { await eras.checkEra(); await events.checkEvents(); await eras.refreshRulesJournal(); }
    },
    onApprovalsChange: () => { approvals.ApprovalsApp.refresh(); ClockApp.refresh(); waiting.WaitingApp.soon(); },
    onRuleChange: async () => { await eras.checkEra(); await events.checkEvents(); await eras.refreshRulesJournal(); ClockApp.refresh(); }
  });
  // 0.46.0: how much runs by itself, and the Waiting tray (B2450-B2452)
  automation.registerAutomationSettings();
  waiting.registerWaitingSettings();
  // 0.35.0: the clock that runs with the table (off by default)
  pace.registerPaceSettings(() => ClockApp.refresh());
  // The WoDX look (6e): each player's own look, text size and motion
  theme.registerThemeSettings();
  theme.applyLook();
  // Each player can hide looping video tiles on a slow computer
  effects.registerEffectSettings();
  // B60: the WoDX buttons each player sees
  playerTools.registerPlayerToolSettings();
  // B2800: Beginner and Full views, Find anything
  playerView.registerPlayerViewSettings();
  // Feast and fast days: the chronicle's own feasts
  church.registerChurchSettings();
  // Phase 7a: the generator core
  gen.registerGenSettings();
  // Dated events
  events.registerEventSettings(async () => { await events.checkEvents(); await eras.refreshRulesJournal(); });
  // Data versions for every WoDX module
  migrations.registerMigrationSettings();
  // Languages in chat
  languages.registerLanguageSettings();
  languages.registerLanguageHooks();
  traits.registerTraitHooks();
  // Splat Features Desk: each clan's own feature (Vampire first)
  signatures.registerSignatureSettings();
  signatures.registerSignatureHooks();
  pod.registerPodSettings();
  pod.registerPodHooks();
  // Knowledge-gated handouts: @Know[Latin]{...} in journals
  know.registerKnow();

  // Calendar: Julian, then Gregorian at the chosen reform
  let reform = "bohemia-1584";
  try {
    reform = game.settings.get(MODULE_ID, "reform");
  } catch (err) {
    console.warn("WoDX | Could not read the reform setting at init; using Bohemia 1584 until ready.", err);
  }
  setReform(reform);
  initReform = reform;
  CONFIG.time.worldCalendarClass = makeCalendarClass();
  CONFIG.time.worldCalendarConfig = makeCalendarConfig();

  // Show real years in Foundry's own timestamp format
  const original = CONFIG.time.formatters?.timestamp;
  legends.registerLegendsSettings();
  if ( CONFIG.time.formatters && original ) {
    CONFIG.time.formatters.timestamp = (calendar, components, options) => (calendar instanceof CONFIG.time.worldCalendarClass)
      ? CONFIG.time.worldCalendarClass.formatTimestamp(calendar, components, options)
      : original(calendar, components, options);
  }

  game.keybindings.register(MODULE_ID, "xcard", {
    name: "X-card",
    hint: "Use the X-card. Nobody is told who pressed it.",
    editable: [{key: "KeyX", modifiers: ["Control", "Shift"]}],
    onDown: () => { safety.pressXCard(); return true; },
    restricted: false
  });
  game.keybindings.register(MODULE_ID, "clock", {
    name: "Chronicle Clock",
    editable: [],
    onDown: () => { ClockApp.open(); return true; }
  });
  referee.registerRefereeKey();

  log(`Chronicle initialised; world time 0 is 1 January ${EPOCH_YEAR}`);
});

Hooks.once("ready", async () => {
  if ( !active ) return;

  // If the reform could not be read at init, rebuild the calendar now
  const reform = setting("reform");
  if ( reform !== initReform ) {
    setReform(reform);
    game.time.initializeCalendar();
  }

  await eras.loadProfiles();
  eras.registerEraHandler();
  contentFixes.registerContentFixes();
  eras.applyProfile(eras.activeEra().profile);
  playerTools.installToolFilter();
  playerView.installViewFilter();
  playerView.installHudGroups();
  playerView.installQuietChat();
  automation.initAutomation();
  waiting.initWaiting();
  await gen.ensureSeed();

  game.socket.on(SOCKET, onSocket);
  pace.startPace();
  Hooks.on("updateScene", (sc, ch) => { if ( ch?.flags?.[MODULE_ID] ) ClockApp.refresh(); });
  Hooks.on("canvasReady", () => ClockApp.refresh());

  const api = {
    openClock: () => ClockApp.open(),
    refreshClock: () => ClockApp.refresh(),
    world: {regions: worldRules.WORLD_REGIONS, regionOf: worldRules.regionOf, homeland: place.homeland, setHomeland, here: place.regionHere, isAbroad: place.isAbroad, rules: worldRules},
    place: {of: place.placeOf, describeAt: place.describeAt, latitudeFor: place.latitudeFor, set: place.setPlace, dialog: place.placeDialog, rules: placeRules},
    pace: {line: pace.paceLine},
    setDate: setDateDialog,
    eras, approvals, safety,
    automation: {level: automation.level, setLevel: automation.setLevel, preview: automation.preview, rules: automationRules},
    waiting: {open: () => waiting.WaitingApp.open(), rows: waiting.rows, count: waiting.count, take: waiting.take, wrapLine: waiting.wrapLine, rules: waitingRules},
    know: {render: know.render, traitsOf: know.traitsOf, passages: knowRules.passages, rules: knowRules},
    propose: approvals.propose,
    registerApprovalHandler: approvals.registerHandler,
    rule,
    runEraTest,
    contentFixes,
    timeSkip: skip.timeSkip,
    isSkipping: skip.isSkipping,
    isHeld: skip.isHeld,
    hold: skip.setHold,
    conditions, timed,
    registerCondition: conditions.registerCondition,
    applyTimed: timed.applyTimed,
    endScene: timed.endScene,
    theme,
    effects: {hiding: effects.hiding, applyAll: effects.applyAll, isVideoSrc: effects.isVideoSrc},
    release: {check: release.check, current: release.current},
    when: {check: when.check, run: when.run, context: when.contextFor, checker: when.checker, parse: when.rules.parseWhen, parseThen: when.rules.parseThen, help: when.rules.helpText, rules: when.rules},
    referee: {open: opts => referee.RefereeApp.open(opts), ask: referee.ask, roll: referee.rollFor, sheetOf: referee.sheetOf,
      cases: refereeRules.CASES, profileOf: refereeRules.profileOf, rules: refereeRules},
    church: {on: church.on, today: church.today, at: church.at, extra: church.extra, faithOf: church.faithOf, rules: church.rules, faiths: church.faiths},
    events: {list: events.list, fired: events.fired, has: events.has, check: events.checkEvents, open: () => events.EventsApp.open()},
    playerTools, openPlayerTools: playerTools.openPlayerTools,
    playerView: {current: playerView.currentView, preview: playerView.previewView, find: () => playerView.FindApp.open(), FindApp: playerView.FindApp, openDrawer: playerView.openDrawer, rules: playerViewRules},
    tours: {start: tours.startTour},
    traits: traits.traitsApi,
    signatures: signatures.signaturesApi,
    pod: pod.podApi,
    legends: {open: () => legends.LegendsApp.open(), build: legends.build, book: legends.book, visible: legends.visible, setShown: legends.setShown, gather: legends.gather},
    languages: {open: () => languages.LanguagesApp.open(), of: languages.languagesOf, set: languages.setLanguages, canRead: languages.canRead},
    migrations: {status: migrations.status, run: migrations.runMigrations, register: migrations.register, backup: migrations.backupModule},
    gen: {seed: gen.seed, context: gen.context, random: gen.random, draw: gen.draw, expand: gen.expand, lookup: gen.lookup,
      registerTables: gen.registerTables, installTables: gen.installTables, cultures: gen.CULTURES}
  };
  game.modules.get(MODULE_ID).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {chronicle: api});
  // Foundry tours for players and the Storyteller
  tours.registerTours();
  // Bring every WoDX module's stored data up to date before the others start on it
  if ( isActiveGM() ) {
    try { await migrations.runMigrations(); }
    catch (err) { console.error("WoDX | Data versions could not be checked", err); }
  }
  // Other WoDX modules wait for this: Foundry does not wait for an async ready hook to finish
  Hooks.callAll("wodxChronicleReady", api);
  // The crossover referee sits in the Storyteller's hand when WoDX Storyteller is on
  if ( game.user.isGM ) referee.addToHand();

  // Which WoDX build this server runs (GM only, so players' machines skip the extra reads)
  if ( game.user.isGM ) release.announce().catch(err => console.error("WoDX | Release stamp could not be read", err));

  if ( isActiveGM() ) {
    await eras.checkEra();
    await events.checkEvents();
    await eras.refreshRulesJournal();
    await contentFixes.checkContentFixes();
    // The Legends book starts with what the records already hold
    if ( legends.book().built === null ) legends.build({quiet: true}).catch(err => console.error("WoDX | Legends", err));
    if ( !setting("openingSet") && game.time.worldTime === 0 ) {
      ui.notifications.info("WoDX: set the chronicle's opening date in the Chronicle Clock.");
      ClockApp.open();
    }
  }
  log("Chronicle ready");
});

Hooks.on("updateWorldTime", () => {
  if ( !active ) return;
  // Per-tick work waits while a time skip runs; it is done once when the skip ends
  if ( skip.isSkipping() ) return;
  ClockApp.refresh();
  eras.checkEra();
  events.checkEvents().then(r => { if ( r?.fired.length || r?.undone.length ) eras.refreshRulesJournal(); });
});

// The Legends book is brought up to date before a time skip (so what happened first is dated first) and after it
Hooks.on("wodxSkipStart", () => { if ( active && isActiveGM() ) legends.buildNow({quiet: true}).catch(err => console.error("WoDX | Legends", err)); });
Hooks.on("wodxSkipEnd", () => { if ( active && isActiveGM() && !skip.isHeld() ) legends.build({quiet: true}).catch(err => console.error("WoDX | Legends", err)); });

Hooks.on("wodxSkipEnd", info => {
  if ( !active || skip.isHeld() ) return;
  ClockApp.refresh();
  if ( !info?.eraHandled ) eras.checkEra();
  events.checkEvents({label: info?.label || "the time skip"}).then(r => { if ( r?.fired.length || r?.undone.length ) eras.refreshRulesJournal(); });
});

Hooks.on("renderSettings", (app, html) => { if ( active ) release.onRenderSettings(app, html); });

Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  const base = 100;
  tokens.tools.wodxClock = {
    name: "wodxClock", title: "Chronicle Clock", icon: "fa-solid fa-moon", order: base,
    button: true, visible: true, onChange: () => ClockApp.open()
  };
  tokens.tools.wodxXCard = {
    name: "wodxXCard", title: "X-card (anonymous)", icon: "fa-solid fa-xmark", order: base + 1,
    button: true, visible: true, onChange: () => safety.pressXCard()
  };
  tokens.tools.wodxFindMe = {
    name: "wodxFindMe", title: "Find my character (goes to your token, on any scene)", icon: "fa-solid fa-location-crosshairs", order: base + 4,
    button: true, visible: true, onChange: () => playerTools.findMyCharacter()
  };
  tokens.tools.wodxLegends = {
    name: "wodxLegends", title: "Legends of the Chronicle", icon: "fa-solid fa-book-skull", order: base + 5,
    button: true, visible: true, onChange: () => legends.LegendsApp.open()
  };
  tokens.tools.wodxApprovals = {
    name: "wodxApprovals", title: "Approval queue", icon: "fa-solid fa-inbox", order: base + 2,
    button: true, visible: game.user.isGM, onChange: () => approvals.ApprovalsApp.open()
  };
  tokens.tools.wodxWaiting = {
    name: "wodxWaiting", title: "Waiting for you (cards and queue entries)", icon: "fa-solid fa-hourglass-half", order: base + 6,
    button: true, visible: game.user.isGM, onChange: () => waiting.WaitingApp.open()
  };
  tokens.tools.wodxPlayerTools = {
    name: "wodxPlayerTools", title: "Player toolbar buttons", icon: "fa-solid fa-user-gear", order: base + 3,
    button: true, visible: game.user.isGM, onChange: () => playerTools.openPlayerTools()
  };
});

/** Socket messages. Messages for the GM are handled by the active GM only. */
async function onSocket(message) {
  const {type, payload} = message ?? {};
  switch ( type ) {
    case "safety.xcard":
      safety.showXCard();
      await safety.onXCardGM();
      break;
    case "safety.lineVeil":
      await safety.onLineVeilGM(payload);
      break;
    case "player.findMe":
    case "player.panTo":
    case "player.findMeNone":
      await playerTools.onFindMeSocket(type, payload);
      break;
    case "approval.propose":
      // Players may only send free-form requests; automation proposals come from the GM's own client
      if ( payload ) await approvals.addToQueue({...payload, type: "request", data: {}});
      break;
  }
}

// A new session begun in WoDX Storyteller starts the count of NPC proposals again
// It also brings the Legends book up to date (WoDX Chronicle 0.40.0)
Hooks.on("updateSetting", s => {
  if ( s?.key !== "wodx-storyteller.session" ) return;
  approvals.resetSession();
  if ( active && isActiveGM() ) legends.build().catch(err => console.error("WoDX | Legends", err));
});

/**
 * A new homeland (0.48.0): the active GM's client sets what follows from it (the part of the world, the latitude and
 * the people's culture) and says what it left alone. Money stays as it is: purses hold sums in the old money.
 */
let homelandQuiet = false;
/** GM: set the homeland and what follows from it in one go, with a latitude of the caller's own if given. */
async function setHomeland(id, {latitude = null} = {}) {
  const r = worldRules.regionOf(id);
  if ( !r || !game.user.isGM ) return null;
  homelandQuiet = true;
  try {
    await game.settings.set(MODULE_ID, "homeland", r.id);
    await applyHomeland(r.id, {latitude, force: true});
  } finally { homelandQuiet = false; }
  return r;
}
async function applyHomeland(id, {latitude = null, force = false} = {}) {
  const r = worldRules.regionOf(id);
  if ( !r || !(force || isActiveGM()) ) return;
  await game.settings.set(MODULE_ID, "region", r.part);
  await game.settings.set(MODULE_ID, "latitude", Number.isFinite(Number(latitude)) && latitude !== null ? Number(latitude) : r.lat);
  await game.settings.set(MODULE_ID, "peopleCulture", worldRules.cultureOf(id));
  const year = eras.currentYear?.();
  const gap = worldRules.hasPeopleIn(id, year) ? "" : ` WoDX has no names for the people here before ${r.from}; until then the people generator borrows later names, so name them yourself.`;
  ui.notifications.info(`Homeland: ${r.label}. Latitude, people's names and weather now follow it. Money is unchanged; set the money region in WoDX Storyteller if this chronicle should pay in another.${gap}`, {permanent: !!gap});
}
