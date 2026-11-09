/**
 * WoDX Storyteller 0.8.0: the open world, the ledger, starting a chronicle on the world template (setup.mjs), and the
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
import * as A from "./apps.mjs";
import * as W from "./world-rules.mjs";
import * as Led from "./ledger.mjs";
import * as Setup from "./setup.mjs";
import * as Night from "./night.mjs";
import * as Dreams from "./dreams.mjs";
import * as Codex from "./codex.mjs";
import * as Rumours from "./rumours.mjs";

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
  Setup.registerSetupSettings();
  Night.registerNightSettings();
  Dreams.registerDreamSettings();
  Dreams.registerDreamHooks();
  Codex.registerCodexHooks();
  Rumours.registerRumourSettings();
  Rumours.registerRumourHooks();
  game.keybindings?.register?.(C.MOD, "onYourOwn", {name: "Out on your own", editable: [], onDown: () => { A.openOnYourOwn(); return true; }, restricted: false});
  game.keybindings?.register?.(C.MOD, "tracker", {name: "The Storyteller's tracker", editable: [], onDown: () => { A.openTracker(); return true; }, restricted: true});
});

Hooks.once("wodxChronicleReady", () => { if ( active ) { C.registerHandlers(); Led.registerLedgerHandlers(); Night.registerNight(); } });

Hooks.once("ready", () => {
  if ( !active ) return;
  if ( !C.chron() ) console.warn("WoDX | WoDX Storyteller needs WoDX Chronicle; it stays idle.");
  C.onChange(() => A.TrackerClass().refresh());
  game.socket.on(C.SOCKET, onSocket);
  C.primeQueue();
  const api = {
    version: C.VERSION, rules: W,
    openTracker: A.openTracker, openOnYourOwn: A.openOnYourOwn, convene: C.convene, conveneDialog: A.conveneDialog, release: C.release,
    travel: C.travel, planTrip: C.planTrip, travelPlaces: C.travelPlaces, setTravel: C.setTravel, solo: C.solo,
    log: C.log, entries: C.entries, personalTime: C.personalTime, setPersonal: C.setPersonal, advancePersonal: C.advancePersonal,
    beats: C.beats, saveBeat: C.saveBeat, deleteBeat: C.deleteBeat, checkBeats: C.checkBeats,
    endSession: C.endSession, report: C.report, reportDialog: A.reportDialog, summaryDialog: A.summaryDialog,
    ledger: {open: () => Led.LedgerApp.open(), state: Led.ledger, save: Led.saveEntry, status: Led.setStatus, veil: Led.moveVeil, checkDue: Led.checkDue, heirOf: Led.heirOf, breach: Led.onBreach},
    beatsDialog: A.beatsDialog, endSessionDialog: A.endSessionDialog, editBeat: A.editBeat, placesDialog: A.placesDialog, TrackerClass: A.TrackerClass,
    setup: {open: Setup.openSetup, run: Setup.runSetup, have: Setup.have, enableModules: Setup.enableModules},
    night: {draw: Night.drawNight, propose: Night.proposeNight, approve: Night.approveNight, dialog: Night.nightDialog, now: Night.nightNow, layers: Night.layersInPlay, road: Night.roadEncounter},
    aid: {draw: Night.drawAid, propose: Night.proposeAid, approve: Night.approveAid, dialog: Night.aidDialog, fragments: Night.fragmentsFor},
    dreams: {open: () => Dreams.DreamsApp.open(), list: Dreams.dreams, save: Dreams.saveDream, release: Dreams.releaseDream, remove: Dreams.removeDream, check: Dreams.checkDreams},
    rumours: {open: () => Rumours.RumoursApp.open(), list: Rumours.rumours, start: Rumours.startRumour, tick: Rumours.tick, end: Rumours.endRumour, remove: Rumours.removeRumour, contacts: Rumours.contacts, heardBy: Rumours.heardBy},
    codex: {of: Codex.codexOf, reveal: Codex.reveal, dialog: Codex.revealDialog},
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
function fromUuidSyncSafe(id) { try { return fromUuidSync(id); } catch (e) { return null; } }

/* ---- The toolbar ---- */
Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxOnYourOwn = {name: "wodxOnYourOwn", title: "Out on your own (travel, or act alone)", icon: "fa-solid fa-person-walking-luggage", order: 106,
    button: true, visible: true, onChange: () => A.openOnYourOwn()};
  tokens.tools.wodxTracker = {name: "wodxTracker", title: "The Storyteller's tracker (every character, convening, beats)", icon: "fa-solid fa-binoculars", order: 113,
    button: true, visible: game.user.isGM, onChange: () => A.openTracker()};
  tokens.tools.wodxLedger = {name: "wodxLedger", title: "The Ledger (oaths, debts, boons, consequences, the Veil)", icon: "fa-solid fa-scale-unbalanced", order: 114,
    button: true, visible: game.user.isGM, onChange: () => Led.LedgerApp.open()};
  tokens.tools.wodxSetup = {name: "wodxSetup", title: "Start a chronicle (opening date, era, lines, the Storyteller screen)", icon: "fa-solid fa-book-open", order: 118,
    button: true, visible: game.user.isGM, onChange: () => Setup.openSetup()};
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
  if ( type !== "req.travel" && type !== "req.solo" ) return;
  // A player may only act for a character they own
  const user = game.users.get(payload.userId);
  const actor = game.actors.get(payload.actorId);
  if ( !user || !actor || !(actor.testUserPermission?.(user, "OWNER")) ) return;
  const kind = type.slice(4);
  const result = kind === "travel" ? await C.travel(payload) : await C.solo(payload);
  game.socket.emit(C.SOCKET, {type: "answer", payload: {userId: user.id, kind, result: {ok: result.ok, why: result.why ?? null, waiting: !!result.waiting, pastDawn: !!result.pastDawn}}});
}
