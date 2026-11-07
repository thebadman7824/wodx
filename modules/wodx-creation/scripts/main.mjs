import {MODULE_ID} from "./actor-data.mjs";
import * as rules from "./rules.mjs";
import * as data from "./actor-data.mjs";
import * as lineage from "./lineage.mjs";
import * as change from "./change-of-state.mjs";
import * as xp from "./xp.mjs";
import {CreationApp, SpendApp, awardDialog} from "./apps.mjs";

/** Runs only in a WoDX world with WoDX Chronicle active (its approval queue and clock are needed). */
const isWoDXWorld = () => !!game.world?.flags?.wodx;
let active = false;

Hooks.once("init", () => {
  if ( !isWoDXWorld() ) {
    console.warn("WoDX | This world has no WoDX flag in world.json; WoDX Creation stays idle.");
    return;
  }
  active = true;
});

let started = false;
let waiting = null;

function start() {
  if ( started || !active ) return;
  started = true;
  clearTimeout(waiting);
  xp.registerXPHandler();
  game.socket.on(`module.${MODULE_ID}`, async message => {
    if ( message?.type === "xp.request" ) await xp.onRequest(message.payload);
  });
  const api = {
    rules, data, lineage, change, xp,
    open: () => CreationApp.open(),
    spend: actor => SpendApp.openFor(actor),
    embrace: change.embrace, giveVitae: change.giveVitae, award: xp.award, awardDialog,
    writeLineageJournal: lineage.writeLineageJournal
  };
  game.modules.get(MODULE_ID).api = api;
  game.wodx = Object.assign(game.wodx ?? {}, {creation: api});
  console.log("WoDX | Creation ready");
}

// WoDX Chronicle finishes its own ready work first (its era profiles load asynchronously), then calls this hook
Hooks.once("wodxChronicleReady", () => start());

Hooks.once("ready", () => {
  if ( !active ) return;
  if ( game.modules.get("wodx-chronicle")?.api ) return start();
  waiting = setTimeout(() => {
    if ( started ) return;
    active = false;
    console.error("WoDX | WoDX Creation needs WoDX Chronicle; enable it in Manage Modules.");
    ui.notifications.error("WoDX Creation needs WoDX Chronicle. Enable it in Manage Modules.");
  }, 20000);
});

Hooks.on("getSceneControlButtons", controls => {
  if ( !active ) return;
  const tokens = controls.tokens ?? controls.token;
  if ( !tokens?.tools ) return;
  tokens.tools.wodxCreation = {
    name: "wodxCreation", title: game.user.isGM ? "Creation and experience" : "Spend experience",
    icon: "fa-solid fa-droplet", order: 120, button: true, visible: true,
    onChange: () => CreationApp.open()
  };
});

Hooks.on("updateActor", () => { if ( active ) CreationApp.refresh(); });
