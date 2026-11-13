/**
 * WoDX Storyteller (the version is in module.json): the open world, the ledger, starting a chronicle on the world template (setup.mjs), and the
 * night's draw and the story aids (night.mjs).
 *
 * Players roam the world on their own, between sessions or side by side within one: they travel from place to place
 * and act alone (hunting, downtime, research, influence, talking to people), each on their own time in the night. The
 * Storyteller follows all of it on the tracker, calls characters together for the story's scenes (convening), sets
 * beats that fire on a time, a place or a flag, and reads a report of what moved between sessions.
 *
 *   world-rules.mjs  the rules, with no Foundry in them
 *   core.mjs         the log, personal times, travel, solo play, convening, beats, dawn, the session
 *   apps.mjs         the tracker, "Out on your own", and the dialogs
 */
import * as C from "./core.mjs";
import * as Wills from "./wills.mjs";
import * as WillRules from "./will-rules.mjs";
import * as A from "./apps.mjs";
import * as W from "./world-rules.mjs";
import * as Led from "./ledger.mjs";
import * as Setup from "./setup.mjs";
import * as Builder from "./builder.mjs";
import * as Night from "./night.mjs";
import * as Dreams from "./dreams.mjs";
import * as Codex from "./codex.mjs";
import * as Letters from "./letters.mjs";
import * as LettersRules from "./letters-rules.mjs";
import * as Up from "./upkeep.mjs";
import * as UpRules from "./upkeep-rules.mjs";
import * as Money from "./money.mjs";
import * as Markets from "./markets.mjs";
import * as News from "./market-news.mjs";
import * as Turn from "./market-turn.mjs";
import * as Moves from "./market-moves.mjs";
import * as Caravans from "./caravans.mjs";
import * as Ventures from "./ventures.mjs";
import * as Inst from "./institutions.mjs";
import * as Works from "./haven-works.mjs";
import * as Omens from "./omens.mjs";
import * as Patron from "./patronage.mjs";
import * as Towns from "./towns.mjs";
import * as Contagion from "./contagion.mjs";
import * as Power from "./power.mjs";
import * as Herds from "./herds.mjs";
import * as Sites from "./sites.mjs";
import * as Tasks from "./tasks.mjs";
import * as Spend from "./spend.mjs";
import * as PassTime from "./pass-time.mjs";
import * as SpendRules from "./spend-rules.mjs";
import * as ProjectRules from "./projects-rules.mjs";
import * as TaskRules from "./tasks-rules.mjs";
import * as Havens from "./havens.mjs";
import * as HavenRules from "./haven-rules.mjs";
import * as Body from "./body.mjs";
import * as BodyRules from "./body-rules.mjs";
import * as Hard from "./hardship.mjs";
import * as HardRules from "./hardship-rules.mjs";
import * as Remains from "./remains.mjs";
import * as RemainsRules from "./remains-rules.mjs";
import * as Hunters from "./hunters.mjs";
import * as MoneyRules from "./money-rules.mjs";
import * as Rumours from "./rumours.mjs";
import * as Road from "./road-rules.mjs";
import * as Country from "./country-rules.mjs";
import * as Prelude from "./prelude.mjs";
import * as Dash from "./dashboard.mjs";
import * as PreludeRules from "./prelude-rules.mjs";
import * as Hand from "./hand.mjs";
import * as Between from "./between.mjs";
import * as WorldMap from "./world-map.mjs";
import * as DiscoveryRules from "./discovery-rules.mjs";
import * as Teleport from "./teleport.mjs";
import * as Own from "./owners.mjs";
import * as Wonders from "./wonders.mjs";
import * as Cook from "./cookery.mjs";
import * as OwnRules from "./owner-rules.mjs";
import * as CraftRules from "./craft-rules.mjs";
import * as BuildRules from "./build-rules.mjs";
import * as Clocks from "./clocks.mjs";
import * as ClockRules from "./clock-rules.mjs";
import * as Battles from "./battles.mjs";
import * as Naval from "./naval.mjs";
import * as NavalRules from "./naval-rules.mjs";
import * as BattleDeeds from "./battle-deeds.mjs";
import * as BattleAftermath from "./battle-aftermath.mjs";
import * as BattleExtras from "./battle-extras.mjs";
import * as BattleRules from "./battle-rules.mjs";
import * as SiegeWorks from "./siege-works.mjs";
import * as SiegeWorksRules from "./siege-works-rules.mjs";

const isWoDXWorld = () => !!game.world?.flags?.wodx;
let active = false;
const safe = p => Promise.resolve(p).catch(e => console.error(`${C.MOD} |`, e));
const skipping = () => { try { return !!C.chron()?.isSkipping?.(); } catch (e) { return false; } };

Hooks.once("init", () => {
  if ( !isWoDXWorld() ) return;
  active = true;
  C.registerSettings();
  Led.registerLedgerSettings();
  Led.registerLedgerHooks();
  Wills.listen();
  Setup.registerSetupSettings();
  Builder.registerBuilderSettings();
  Night.registerNightSettings();
  Dreams.registerDreamSettings();
  Dreams.registerDreamHooks();
  Codex.registerCodexHooks();
  Rumours.registerRumourSettings();
  Letters.registerLetterSettings();
  Letters.registerLetterHooks();
  Up.registerUpkeepSettings();
  Up.registerUpkeepHooks();
  Money.registerMoneySettings();
  Money.registerMoneyHooks();
  Markets.registerMarketSettings();
  News.registerMarketNewsSettings();
  Turn.registerMarketTurnSettings();
  Moves.registerMoveSettings();
  Caravans.registerCaravanSettings();
  Ventures.registerVentureSettings();
  Inst.registerInstitutionSettings();
  Works.registerWorksSettings();
  Omens.registerOmenSettings();
  Patron.registerPatronageSettings();
  Towns.registerTownSettings();
  Contagion.registerContagionSettings();
  Power.registerPowerSettings();
  Herds.registerHerdSettings();
  Sites.registerSiteSettings();
  Tasks.registerTaskSettings();
  Spend.registerSpendSettings();
  Tasks.registerTaskHooks();
  Inst.registerInstitutionHooks();
  Works.registerWorksHooks();
  Omens.registerOmenHooks();
  Patron.registerPatronageHooks();
  Cook.registerCookHooks();
  Wonders.registerWonderHooks();
  Body.registerBodyHooks();
  Hard.registerHardshipSettings();
  Hard.registerHardshipHooks();
  Remains.registerRemainsSettings();
  Remains.registerRemainsHooks();
  Hunters.registerHunterSettings();
  Hunters.registerHunterHooks();
  Rumours.registerRumourHooks();
  Dash.registerDashboardHooks();
  Clocks.registerClockSettings();
  Clocks.registerClockHooks();
  Battles.registerBattleSettings();
  Hand.addTool({key: "battle", label: "Battles and sieges", icon: "fa-chess-rook", run: () => Battles.BattlesApp.open()});
  Naval.registerNavalSettings();
  Hand.addTool({key: "naval", label: "Ships at sea", icon: "fa-anchor", run: () => Naval.NavalApp.open()});
  Hand.registerHandSettings();
  Hand.registerHandHooks();
  Hand.registerHandKeys();
  Between.registerBetweenSettings();
  Between.registerBetweenTools();
  WorldMap.registerWorldMapSettings();
  WorldMap.registerWorldMapTools();
  Teleport.registerTeleportKeys();
  Teleport.registerTeleportHooks();
  Own.registerOwnerHooks();
  game.keybindings?.register?.(C.MOD, "downtime", {name: "Downtime request", editable: [], onDown: () => { Between.downtimeDialog(); return true; }, restricted: false});
  game.keybindings?.register?.(C.MOD, "onYourOwn", {name: "Out on your own", editable: [], onDown: () => { A.openOnYourOwn(); return true; }, restricted: false});
  game.keybindings?.register?.(C.MOD, "dashboard", {name: "The Storyteller's dashboard", editable: [], onDown: () => { Dash.DashboardApp.open(); return true; }, restricted: true});
  game.keybindings?.register?.(C.MOD, "tracker", {name: "The Storyteller's tracker", editable: [], onDown: () => { A.openTracker(); return true; }, restricted: true});
});

Hooks.once("wodxChronicleReady", () => { if ( active ) { C.registerHandlers(); Led.registerLedgerHandlers(); Wills.registerHandlers(); Night.registerNight(); Up.registerUpkeepHandlers(); Hunters.registerHunterHandlers(); Between.registerBetweenHandlers(); Own.registerApproval(); Spend.registerTimeApproval(); Turn.registerApproval(); Moves.registerApproval(); Ventures.registerApproval(); Inst.registerApproval(); Works.registerApproval(); Omens.registerApproval(); Patron.registerApproval(); Towns.registerApproval(); Contagion.registerApproval(); Wonders.registerWonderApproval(); } });

Hooks.once("ready", () => {
  if ( !active ) return;
  PassTime.installPassTime();
  if ( !C.chron() ) console.warn("WoDX | WoDX Storyteller needs WoDX Chronicle; it stays idle.");
  C.onChange(() => A.TrackerClass().refresh());
  C.onChange(() => { try { C.chron()?.refreshClock?.(); } catch (e) { /* older Chronicle */ } });
  game.socket.on(C.SOCKET, onSocket);
  C.primeQueue();
  Markets.setupMarkets().catch(e => console.error("WoDX | markets", e));
  News.setupMarketNews().catch(e => console.error("WoDX | market news", e));
  Turn.setupMarketTurn().catch(e => console.error("WoDX | market turn", e));
  Moves.setupMoves().catch(e => console.error("WoDX | market moves", e));
  Caravans.setupCaravans().catch(e => console.error("WoDX | caravans", e));
  Ventures.setupVentures().catch(e => console.error("WoDX | ventures", e));
  Towns.setupTowns().catch(e => console.error("WoDX | towns", e));
  Contagion.setupContagion().catch(e => console.error("WoDX | contagion", e));
  Power.setupPower().catch(e => console.error("WoDX | places of power", e));
  Herds.setupHerds();
  Sites.setupSites();
  const api = {
    version: C.VERSION, rules: W,
    openTracker: A.openTracker, openOnYourOwn: A.openOnYourOwn, convene: C.convene, conveneDialog: A.conveneDialog, release: C.release,
    travel: C.travel, planTrip: C.planTrip, travelPlaces: C.travelPlaces, setTravel: C.setTravel, solo: C.solo,
    tripContext: C.tripContext, tripWords: C.tripWords, roads: Road, country: Country, worldMap: {open: WorldMap.worldMapDialog, view: WorldMap.view, closer: WorldMap.closerDialog, load: WorldMap.load, get rules() { return WorldMap.loaded(); }, discovery: DiscoveryRules, known: WorldMap.knownNow, found: WorldMap.found, setFound: WorldMap.setFound, discoveries: WorldMap.discoveriesDialog},
    log: C.log, entries: C.entries, personalTime: C.personalTime, setPersonal: C.setPersonal, advancePersonal: C.advancePersonal,
    beats: C.beats, saveBeat: C.saveBeat, deleteBeat: C.deleteBeat, checkBeats: C.checkBeats,
    endSession: C.endSession, report: C.report, reportDialog: A.reportDialog, summaryDialog: A.summaryDialog,
    wills: {of: Wills.willOf, save: Wills.saveWill, open: Wills.willDialog, estate: Wills.estateOf, law: Wills.lawAt, kin: Wills.kinOf, rules: WillRules},
    ledger: {open: () => Led.LedgerApp.open(), state: Led.ledger, save: Led.saveEntry, remove: Led.removeEntry, status: Led.setStatus, veil: Led.moveVeil, checkDue: Led.checkDue, heirOf: Led.heirOf, breach: Led.onBreach, syncTraits: Led.syncTraits},
    beatsDialog: A.beatsDialog, endSessionDialog: A.endSessionDialog, editBeat: A.editBeat, placesDialog: A.placesDialog, TrackerClass: A.TrackerClass,
    setup: {open: Setup.openSetup, run: Setup.runSetup, have: Setup.have, enableModules: Setup.enableModules},
    builder: {open: Builder.openBuilder, plan: Builder.plan, run: Builder.runStep, again: Builder.rerunStep, undo: Builder.undoStep, runAll: Builder.runAll, record: Builder.record, recipe: Builder.recipe, recipes: Builder.RECIPES},
    night: {pacing: Night.pacingNow, draw: Night.drawNight, propose: Night.proposeNight, approve: Night.approveNight, dialog: Night.nightDialog, now: Night.nightNow, layers: Night.layersInPlay, road: Night.roadEncounter},
    aid: {draw: Night.drawAid, propose: Night.proposeAid, approve: Night.approveAid, dialog: Night.aidDialog, fragments: Night.fragmentsFor},
    dreams: {open: () => Dreams.DreamsApp.open(), list: Dreams.dreams, save: Dreams.saveDream, release: Dreams.releaseDream, remove: Dreams.removeDream, check: Dreams.checkDreams},
    rumours: {tale: Rumours.startTale, toneFor: Rumours.toneFor, aboutView: Rumours.aboutView, openAbout: Rumours.aboutDialog, open: () => Rumours.RumoursApp.open(), media: Rumours.mediaNow, list: Rumours.rumours, start: Rumours.startRumour, doubt: Rumours.doubtRumour, about: Rumours.rumoursAbout, tick: Rumours.tick, end: Rumours.endRumour, remove: Rumours.removeRumour, contacts: Rumours.contacts, heardBy: Rumours.heardBy},
    dashboard: {open: () => Dash.DashboardApp.open(), gather: Dash.gather},
    clocks: {open: () => Clocks.ClocksApp.open(), list: Clocks.clocks, visible: Clocks.visibleClocks, save: Clocks.saveClock, remove: Clocks.removeClock,
      step: Clocks.stepClock, show: Clocks.showClock, tick: Clocks.tick, rules: ClockRules},
    naval: {open: id => Naval.NavalApp.open(id), list: Naval.list, get: Naval.get, start: Naval.start, setup: Naval.setupDialog, navigate: Naval.navigate,
      pursue: Naval.pursue, manoeuvre: Naval.manoeuvre, fire: Naval.fire, ram: Naval.ram, breakAway: Naval.breakAway, setGap: Naval.setGap,
      quarter: Naval.quarter, boarding: Naval.boarding, setRowing: Naval.setRowing, undo: Naval.undo, passTime: Naval.passTime, remove: Naval.remove, rules: NavalRules},
    battles: {open: id => Battles.BattlesApp.open(id), list: Battles.list, get: Battles.get, start: Battles.start, setup: Battles.setupDialog, fight: Battles.fight,
      week: Battles.week, storm: Battles.storm, withdraw: Battles.withdrawSide, draw: Battles.callDraw, undo: Battles.undo, passTime: Battles.passTime,
      hazard: Battles.hazard, remove: Battles.remove, commandPool: Battles.commandPool, commandPools: Battles.commandPools, rules: BattleRules},
    battleDeeds: {rules: BattleDeeds, offer: BattleExtras.offer, roll: BattleExtras.rollDeed, swap: BattleExtras.swap, skip: BattleExtras.skip,
      leaderDeed: BattleDeeds.leaderDeed, deedSuccessesFor: BattleDeeds.deedSuccessesFor},
    battleAftermath: {rules: BattleAftermath, send: BattleExtras.send, undo: BattleExtras.unsend},
    siegeWorks: {rules: SiegeWorksRules, setup: SiegeWorks.setupDialog, mine: SiegeWorks.mineDialog, addEngine: SiegeWorks.addEngine, readyEngine: SiegeWorks.readyEngine,
      removeEngine: SiegeWorks.removeEngine, endMine: SiegeWorks.endMine, draw: SiegeWorks.draw},
    prelude: {dialog: Prelude.preludeDialog, make: Prelude.makePrelude, compose: PreludeRules.composePrelude, lineFor: PreludeRules.lineFor, lines: PreludeRules.LINE_ORDER},
    letters: {open: Letters.openLetters, send: Letters.send, set: Letters.setLetter, deliver: Letters.deliver, list: Letters.lettersOnTheWay, delay: Letters.delayLetter, read: Letters.readOnTheWay, plan: Letters.planFor, regionOf: Letters.regionOfActor, rules: LettersRules},
    upkeep: {open: Up.upkeepChooser, ties: Up.tiesDialog, tiesOf: Up.tiesOf, tend: Up.tend, check: Up.checkTies, between: Up.onSkip, undo: Up.undoBetween,
      grounds: Up.groundsDialog, huntHere: Up.huntHere, addHeat: Up.addHeat, rules: UpRules,
      money: {of: Money.moneyOf, dialog: Money.moneyDialog, monthly: Money.monthly, setAway: Money.setAway, setNeglected: Money.setNeglected, coins: Money.coinsNow, rules: MoneyRules,
        purse: Money.purseOf, pay: Money.pay, receive: Money.receive, transfer: Money.transfer, undo: Money.undoLast, price: Money.priceNow, findGood: Money.findGood,
        cashIn: Money.cashIn, payDay: Money.payDay, priceSync: Money.priceSync, awayMoney: Money.awayMoney, changeQuote: Money.changeQuote, change: Money.changePurse, foreign: Money.foreignOf, arrival: Money.arrival, market: Money.marketFor, money: Money.moneyNow, format: (v, m) => MoneyRules.formatMoney(v, m ?? Money.moneyNow())},
      markets: Markets.api(), marketNews: News.api(), marketTurn: Turn.api(), marketMoves: Moves.api(), caravans: Caravans.api(), ventures: Ventures.api(), institutions: Inst.api(), towns: Towns.api(), contagion: Contagion.api(), power: Power.api(), herds: Herds.api(), sites: Sites.api()},
    hardship: {open: Hard.hardshipDialog, weatherOf: Hard.weatherOf, tick: Hard.tick, undo: Hard.undoTick, mark: Hard.mark, off: Hard.setOff, weather: Hard.setWeather, of: Hard.needsOf, living: Hard.living, rules: HardRules},
    hunters: Hunters.api(),
    remains: {open: Remains.remainsDialog, mark: Remains.mark, unmark: Remains.unmark, stage: Remains.stageOf, found: Remains.found, tick: Remains.tick, rules: RemainsRules},
    body: {open: Body.bodyDialog, add: Body.addChange, remove: Body.removeChange, of: Body.bodyOf, shown: Body.shownOf, newDialog: Body.newChangeDialog, rules: BodyRules},
    havenWorks: Works.api(),
    omens: Omens.api(),
    patronage: Patron.api(),
    havens: {open: Havens.havensDialog, edit: Havens.editHaven, of: Havens.havenOf, list: Havens.havens, save: Havens.saveHaven, remove: Havens.removeHaven, expose: Havens.expose, forget: Havens.forget, exposeDialog: Havens.exposeDialog, rating: Havens.ratingOf, rules: HavenRules},
    passTime: {open: PassTime.open, vote: PassTime.vote, dialog: PassTime.passTimeDialog, choices: SpendRules.PASS_CHOICES},
    time: {spend: Spend.spend, unspend: Spend.unspend, ask: Spend.ask, howFor: Spend.howFor, where: Spend.presentWhere, note: SpendRules.noteFor, words: SpendRules.spanWords,
      clockRow: Spend.clockRow, bindClockRow: el => Spend.bindClockRow(el, () => A.conveneDialog()), rules: SpendRules},
    tasks: {open: Tasks.tasksDialog, edit: Tasks.editTask, of: Tasks.tasksOf, save: Tasks.saveTask, remove: Tasks.removeTask, pause: Tasks.setPaused, tick: Tasks.tick, undo: Tasks.undoTick, pool: Tasks.poolFor, rules: TaskRules, budget: Tasks.budgetOf, projects: ProjectRules},
    codex: {of: Codex.codexOf, reveal: Codex.reveal, dialog: Codex.revealDialog},
    hand: {open: Hand.handDialog, run: Hand.runTool, tools: Hand.TOOLS, addTool: Hand.addTool, glance: () => Hand.GlanceApp.open(), call: Hand.callRoll, callDialog: Hand.callRollDialog,
      answer: Hand.answerAsk, preflight: () => Hand.PreflightApp.open(), snapshot: Hand.snapshot, wrapUp: Hand.wrapUpDialog, noteFight: Hand.noteFight, timer: () => Hand.TimerApp.open(),
      startTimer: Hand.startTimer, pauseTimer: Hand.pauseTimer, resumeTimer: Hand.resumeTimer, stopTimer: Hand.stopTimer, readTimer: Hand.readTimer, macros: Hand.makeMacros, sheetOf: Hand.sheetOf},
    between: {prep: Between.prepDialog, writePrep: Between.writePrep, prepSections: Between.prepSections, preload: Between.preload,
      kits: Between.kits, saveKit: Between.saveKit, removeKit: Between.removeKit, runKit: Between.runKit, kitsDialog: Between.kitsDialog,
      extras: Between.makeExtras, extrasDialog: Between.extrasDialog, hooks: Between.hooksFor, hooksDialog: Between.hooksDialog, willpowerForNature: Between.willpowerForNature,
      absent: Between.absentMap, setAbsent: Between.setAbsent, absentDialog: Between.absentDialog, recapDraft: Between.recapDraft, postRecap: Between.postRecap, recapDialog: Between.recapDialog,
      downtime: Between.requestDowntime, downtimeDialog: Between.downtimeDialog},
    owners: {open: Own.propertyDialog, of: Own.ownerOf, at: Own.ownerRecordAt, set: Own.setOwner, whose: Own.whose, handOver: Own.handOver, stolen: Own.stolenGoods,
      holdings: Own.holdings, holdingsOf: Own.holdingsOf, saveHolding: Own.saveHolding, editHolding: Own.editHolding, payHoldings: Own.payHoldings,
      craft: Own.craftDialog, startCraft: Own.startCraft, makeable: Own.makeable, build: Own.buildDialog, startBuild: Own.startBuild,
      workshops: Own.workshopsMonth, factionBuilds: Own.factionBuildsMonth, rules: {owner: OwnRules, craft: CraftRules, build: BuildRules}},
    cookery: Cook.cookApi(),
    // B3631: fetishes, talens and the other lines' supernatural items (WoDX Library api.wonders)
    wonders: Wonders.wondersApi(),
    teleport: {arm: Teleport.arm, to: Teleport.teleport, cursor: Teleport.cursorPoint, armed: Teleport.isArmed},
    draw: Night.drawChooser, nightRules: Night.N
  };
  const mod = game.modules.get(C.MOD);
  if ( mod ) mod.api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {storyteller: api});
  if ( C.isActiveGM() ) {
    const rep = C.report();
    const n = rep.sections.reduce((t, s) => t + s.lines.length, 0);
    if ( rep.since !== null && n ) ui.notifications.info(`WoDX: ${n} things happened between sessions. Open the tracker's Between sessions report.`);
  }
  Setup.maybeOpenSetup();
  Hand.watchTimer();
});

/* ---- Watching the table (the active Storyteller's client writes; the others only redraw) ---- */
Hooks.on("createChatMessage", msg => { if ( active ) safe(C.onChat(msg)); });
Hooks.on("createToken", (doc, options) => { if ( active ) safe(C.onToken(doc, options)); });
Hooks.on("updateActor", (actor, change) => { if ( active ) safe(C.onActorFlags(actor, change)); });
Hooks.on("updateSetting", s => {
  if ( !active ) return;
  if ( s.key === "wodx-chronicle.approvals" ) safe(C.onQueue());
});
Hooks.on("updateWorldTime", () => { if ( active && !skipping() ) { safe(C.onClock()); safe(Night.maybeDrawNight()); } });
Hooks.on("wodxSkipEnd", () => { if ( active ) safe(C.onClock()); });
Hooks.on("wodxEndScene", () => { if ( active ) safe(C.release()); });
Hooks.on("wodxMapEvent", ev => { if ( active ) safe(C.onMapEvent(ev)); });
// 0.20.0: open objectives in the Ledger tick their steps from map events
Hooks.on("wodxMapEvent", ev => { if ( active ) safe(Led.onMapEventObjectives(ev)); });
Hooks.on("wodxBreach", p => {
  if ( !active ) return;
  const by = p?.by?.uuid ? fromUuidSyncSafe(p.by.uuid) : null;
  safe(C.log({kind: "breach", actor: C.isPC(by) ? by.id : null, name: p?.by?.name ?? null, attention: "A Masquerade breach",
    text: W.plain(p?.entry?.text ?? p?.entry?.note ?? p?.entry?.what ?? "A breach of the Masquerade was recorded.")}));
});
Hooks.on("wodxCrossing", p => {
  if ( !active ) return;
  for ( const t of p?.travelers ?? [] ) {
    const a = t?.actor ?? t?.document?.actor;
    if ( !C.isPC(a) ) continue;
    safe(C.log({kind: "cross", actor: a.id, name: a.name, user: C.ownerOf(a)?.id, place: p?.place?.where ?? null,
      text: `${p?.inUmbra ? "Crossed back from the Otherworld" : "Crossed into the Otherworld"}${p?.outcome ? `: ${p.outcome}` : ""}.`}));
  }
});
Hooks.on("wodxShroudCrossing", p => {
  if ( !active ) return;
  for ( const t of p?.tokens ?? [] ) {
    const a = t?.actor ?? t?.document?.actor;
    if ( !C.isPC(a) ) continue;
    safe(C.log({kind: "cross", actor: a.id, name: a.name, user: C.ownerOf(a)?.id, place: p?.place?.where ?? null,
      text: p?.back ? "Came back across the Shroud." : "Crossed the Shroud."}));
  }
});
// A Dreaming gateway (Otherworlds): log only those who actually went through, read from the status the gate set
Hooks.on("wodxDreamingGate", p => {
  if ( !active ) return;
  for ( const t of p?.tokens ?? [] ) {
    const a = t?.actor ?? t?.document?.actor;
    if ( !C.isPC(a) ) continue;
    const there = !!a.statuses?.has?.("wodx-dreaming");
    if ( p?.out ? there : !there ) continue;
    safe(C.log({kind: "cross", actor: a.id, name: a.name, user: C.ownerOf(a)?.id, place: null,
      text: p?.out ? "Came back out of the Near Dreaming." : "Went into the Near Dreaming."}));
  }
});
function fromUuidSyncSafe(id) { try { return fromUuidSync(id); } catch (e) { return null; } }

/* ---- The toolbar ---- */
Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxOnYourOwn = {name: "wodxOnYourOwn", title: "Out on your own (travel, or act alone)", icon: "fa-solid fa-person-walking-luggage", order: 106,
    button: true, visible: true, onChange: () => A.openOnYourOwn()};
  tokens.tools.wodxPassTime = {name: "wodxPassTime", title: "Let time pass (wait, rest or sleep the day; the table agrees)", icon: "fa-solid fa-bed-pulse", order: 107,
    button: true, visible: true, onChange: () => PassTime.passTimeDialog()};
  tokens.tools.wodxLetters = {name: "wodxLetters", title: "Send a letter or message (it travels as the era allows)", icon: "fa-solid fa-envelope", order: 108,
    button: true, visible: true, onChange: () => Letters.openLetters()};
  tokens.tools.wodxTales = {name: "wodxTales", title: "What they say about you (the tales going round about your character)", icon: "fa-solid fa-comments", order: 108.5,
    button: true, visible: !game.user.isGM, onChange: () => Rumours.aboutDialog()};
  tokens.tools.wodxArtists = {name: "wodxArtists", title: "Artists and patrons (who makes art, who pays for it, and what is in fashion)", icon: "fa-solid fa-palette", order: 109.3,
    button: true, visible: game.user.isGM, onChange: () => Patron.artistsDialog()};
  tokens.tools.wodxInstitutions = {name: "wodxInstitutions", title: "Institutions (the church, guilds, council, watch, press and more, and who holds their seats)", icon: "fa-solid fa-landmark", order: 109.2,
    button: true, visible: true, onChange: () => Inst.institutionsDialog()};
  tokens.tools.wodxTasks = {name: "wodxTasks", title: "Downtime and long tasks (projects that take days or weeks: research, a business, courting, making things, training)", icon: "fa-solid fa-hourglass-half", order: 109,
    button: true, visible: true, onChange: () => Tasks.tasksDialog()};
  tokens.tools.wodxProperty = {name: "wodxProperty", title: "Property and building (what you own, making things, putting up a building)", icon: "fa-solid fa-house-flag", order: 126,
    button: true, visible: true, onChange: () => Own.propertyDialog()};
  tokens.tools.wodxClocks = {name: "wodxClocks", title: "Progress clocks (long work, heat, plans and threats coming nearer)", icon: "fa-solid fa-clock", order: 110,
    button: true, visible: true, onChange: () => Clocks.ClocksApp.open()};
  tokens.tools.wodxTracker = {name: "wodxTracker", title: "The Storyteller's tracker (every character, convening, beats)", icon: "fa-solid fa-binoculars", order: 113,
    button: true, visible: game.user.isGM, onChange: () => A.openTracker()};
  tokens.tools.wodxLedger = {name: "wodxLedger", title: "The Ledger (oaths, debts, boons, consequences, the Veil)", icon: "fa-solid fa-scale-unbalanced", order: 114,
    button: true, visible: game.user.isGM, onChange: () => Led.LedgerApp.open()};
  tokens.tools.wodxUpkeep = {name: "wodxUpkeep", title: "Upkeep (ties that need tending, hunting grounds and heat)", icon: "fa-solid fa-hand-holding-heart", order: 121,
    button: true, visible: game.user.isGM, onChange: () => Up.upkeepChooser()};
  tokens.tools.wodxDashboard = {name: "wodxDashboard", title: "The Storyteller's dashboard (the party, clocks, open threads, consequences)", icon: "fa-solid fa-gauge", order: 117,
    button: true, visible: game.user.isGM, onChange: () => Dash.DashboardApp.open()};
  tokens.tools.wodxSetup = {name: "wodxSetup", title: "Start a chronicle (opening date, era, lines, the Storyteller screen)", icon: "fa-solid fa-book-open", order: 118,
    button: true, visible: game.user.isGM, onChange: () => Setup.openSetup()};
  tokens.tools.wodxBuilder = {name: "wodxBuilder", title: "Build this chronicle (the recipe's steps, each safe to run twice, with Undo)", icon: "fa-solid fa-chess-rook", order: 127,
    button: true, visible: Builder.wanted(), onChange: () => Builder.openBuilder()};
  tokens.tools.wodxHand = {name: "wodxHand", title: "The Storyteller's hand (rules at a glance, call for a roll, before play, the end of the night, the timer)", icon: "fa-solid fa-hand-sparkles", order: 123,
    button: true, visible: game.user.isGM, onChange: () => Hand.handDialog()};
  tokens.tools.wodxDowntime = {name: "wodxDowntime", title: "Downtime request (what your character does between sessions)", icon: "fa-solid fa-bed", order: 124,
    button: true, visible: true, onChange: () => Between.downtimeDialog()};
  tokens.tools.wodxTeleport = {name: "wodxTeleport", title: "Teleport the selected tokens (then click the map; Alt+Shift+P sends them to the cursor)", icon: "fa-solid fa-person-through-window", order: 125,
    button: true, visible: game.user.isGM, onChange: () => Teleport.arm()};
  tokens.tools.wodxDraw = {name: "wodxDraw", title: "Draw for the story (tonight, a story aid, an Otherworld journey)", icon: "fa-solid fa-dice-d20", order: 119,
    button: true, visible: game.user.isGM, onChange: () => Night.drawChooser()};
});

/* ---- The socket ---- */
async function onSocket(message) {
  const {type, payload} = message ?? {};
  if ( !payload ) return;
  if ( type === "pull" ) {
    if ( payload.userId === game.user.id ) game.scenes.get(payload.sceneId)?.view?.();
    return;
  }
  if ( type === "answer" ) {
    if ( payload.userId === game.user.id ) A.answer(payload.result, payload.kind);
    return;
  }
  if ( !C.isActiveGM() ) return;
  if ( type === "req.call" ) { await Hand.answerAsk(payload); return; }
  if ( type === "req.letter" ) { await Letters.send(payload); return; }
  if ( type === "req.time" ) { await Spend.onAsk(payload); return; }
  if ( type === "req.passTime" ) { await PassTime.open(payload); return; }
  if ( type === "req.passVote" ) { await PassTime.vote(payload); return; }
  if ( type === "req.hunted" ) { await Up.onHunted(payload, {userId: payload.userId}); return; }
  if ( type === "req.fed" ) { await Herds.feedFrom(payload, {userId: payload.userId}); return; }
  if ( type === "req.venture" ) { await Ventures.onRequest(payload); return; }
  if ( type !== "req.travel" && type !== "req.solo" ) return;
  // A player may only act for a character they own
  const user = game.users.get(payload.userId);
  const actor = game.actors.get(payload.actorId);
  if ( !user || !actor || !(actor.testUserPermission?.(user, "OWNER")) ) return;
  const kind = type.slice(4);
  const result = kind === "travel" ? await C.travel(payload) : await C.solo(payload);
  game.socket.emit(C.SOCKET, {type: "answer", payload: {userId: user.id, kind, result: {ok: result.ok, why: result.why ?? null, waiting: !!result.waiting, pastDawn: !!result.pastDawn}}});
}
