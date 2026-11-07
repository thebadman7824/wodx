import {MODULE_ID, SOCKET, isActiveGM, rule, setting, log} from "./util.mjs";
import {registerSettings} from "./settings.mjs";
import {makeCalendarClass, makeCalendarConfig, setReform, EPOCH_YEAR} from "./calendar.mjs";
import * as eras from "./eras.mjs";
import * as approvals from "./approvals.mjs";
import * as safety from "./safety.mjs";
import {ClockApp, setDateDialog} from "./clock-app.mjs";
import {HouseRulesApp} from "./house-rules-app.mjs";
import {runEraTest} from "./era-test.mjs";
import * as contentFixes from "./content-fixes.mjs";
import {installSearch} from "./search.mjs";
import * as skip from "./skip.mjs";

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

  registerSettings({
    HouseRulesApp,
    onClockChange: () => ClockApp.refresh(),
    onEraInputsChange: () => { eras.checkEra(); ClockApp.refresh(); },
    onActiveEraChange: async () => { await eras.onActiveEraChange(); ClockApp.refresh(); },
    onApprovalsChange: () => { approvals.ApprovalsApp.refresh(); ClockApp.refresh(); },
    onRuleChange: async () => { await eras.checkEra(); await eras.refreshRulesJournal(); ClockApp.refresh(); }
  });

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

  game.socket.on(SOCKET, onSocket);

  const api = {
    openClock: () => ClockApp.open(),
    setDate: setDateDialog,
    eras, approvals, safety,
    propose: approvals.propose,
    registerApprovalHandler: approvals.registerHandler,
    rule,
    runEraTest,
    contentFixes,
    timeSkip: skip.timeSkip,
    isSkipping: skip.isSkipping
  };
  game.modules.get(MODULE_ID).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {chronicle: api});
  // Other WoDX modules wait for this: Foundry does not wait for an async ready hook to finish
  Hooks.callAll("wodxChronicleReady", api);

  if ( isActiveGM() ) {
    await eras.checkEra();
    await eras.refreshRulesJournal();
    await contentFixes.checkContentFixes();
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
});

Hooks.on("wodxSkipEnd", info => {
  if ( !active ) return;
  ClockApp.refresh();
  if ( !info?.eraHandled ) eras.checkEra();
});

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
  tokens.tools.wodxApprovals = {
    name: "wodxApprovals", title: "Approval queue", icon: "fa-solid fa-inbox", order: base + 2,
    button: true, visible: game.user.isGM, onChange: () => approvals.ApprovalsApp.open()
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
    case "approval.propose":
      // Players may only send free-form requests; automation proposals come from the GM's own client
      if ( payload ) await approvals.addToQueue({...payload, type: "request", data: {}});
      break;
  }
}
