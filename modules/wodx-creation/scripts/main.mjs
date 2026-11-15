import {MODULE_ID} from "./actor-data.mjs";
import * as rules from "./rules.mjs";
import * as data from "./actor-data.mjs";
import * as lineage from "./lineage.mjs";
import * as change from "./change-of-state.mjs";
import * as feedVitae from "./feed-vitae.mjs";
import * as animalStock from "./animal-stock.mjs";
import * as animalBlood from "./animal-blood.mjs";
import * as animalKeepers from "./animal-keepers.mjs";
import * as animalKeepersRules from "./animal-keepers-rules.mjs";
import * as animalStockRules from "./animal-stock-rules.mjs";
import * as animalGhouls from "./animal-ghoul-rules.mjs";
import * as xp from "./xp.mjs";
import * as learn from "./learn.mjs";
import * as learnRules from "./learn-rules.mjs";
import * as lines from "./lines.mjs";
import {CreationApp, SpendApp, awardDialog} from "./apps.mjs";
import * as time from "./time.mjs";
import {PassYearsApp} from "./pass-years.mjs";
import {runSkipTest} from "./skip-test.mjs";
import {installSearch} from "../../wodx-chronicle/scripts/search.mjs";
import * as groups from "./group-sheet.mjs";
import * as firstChange from "./first-change.mjs";
import * as people from "./people.mjs";
import * as archive from "./archive.mjs";
import * as states from "./states.mjs";
import * as totals from "./totals-rules.mjs";
import {CreationCheckApp} from "./totals-check.mjs";
import * as lifepath from "./lifepath.mjs";
import * as lifepathRules from "./lifepath-rules.mjs";
import {threadsOf} from "./lifepath-threads-rules.mjs";
import * as firstNight from "./first-night.mjs";
import * as firstNightRules from "./first-night-rules.mjs";
import * as wizardRules from "./wizard-rules.mjs";
import {WizardApp, ledgerFor as wizardLedger, derivedFor} from "./wizard.mjs";
import * as derivedRules from "./derived-rules.mjs";

/** Runs only in a WoDX world with WoDX Chronicle active (its approval queue and clock are needed). */
const isWoDXWorld = () => !!game.world?.flags?.wodx;
let active = false;

Hooks.once("init", () => {
  if ( !isWoDXWorld() ) {
    console.warn("WoDX | This world has no WoDX flag in world.json; WoDX Creation stays idle.");
    return;
  }
  active = true;
  installSearch();
  people.registerPeopleSettings();
  learn.registerLearnSettings();
  archive.registerArchiveSettings();
  lifepath.registerSheetButton();
  firstNight.registerFirstNightSettings();
  firstNight.registerSheetButton();
  // The fork's Group actor (coterie, pack, cabal...) gets its sheet here
  if ( !groups.registerGroupSheet() ) console.warn("WoDX | No Group actor type in this system; update the WoDX fork to 7.3.2-wodx.2.");
});

let started = false;
let waiting = null;

function start() {
  if ( started || !active ) return;
  started = true;
  clearTimeout(waiting);
  xp.registerXPHandler();
  learn.registerLearning();
  people.registerPeople();
  lifepath.registerLifepath();
  firstNight.registerFirstNight();
  feedVitae.registerFeedVitae();
  animalStock.registerAnimalStock();
  animalBlood.registerAnimalBlood();
  animalKeepers.registerAnimalKeepers();
  game.socket.on(`module.${MODULE_ID}`, async message => {
    if ( message?.type === "xp.request" ) await xp.onRequest(message.payload);
    if ( message?.type === "vitae.request" ) await feedVitae.onRequest(message.payload);
    if ( message?.type === "animal.retainer" ) await animalStock.onRequest(message.payload);
    if ( message?.type === "vitae.shown" && message.payload?.sceneId === canvas?.scene?.id ) feedVitae.showDrink(canvas.scene.tokens.get(message.payload.tokenId));
  });
  const api = {
    rules, data, lineage, change, xp, time,
    // B6230: learning from a teacher, a book, a school or practice
    // B6270: every line, one key each, for any WoDX module
    lines: {of: lines.splatOf, info: lines.lineInfo, family: lines.familyOf, label: lines.labelOf, keys: lines.KEYS},
    learn: {rules: learnRules, choices: learn.choicesFor, resolve: learn.resolveSource, begin: learn.begin, records: learn.recordsOf, needsSource: learn.needsSource,
      waived: learn.waived, setWaived: learn.setWaived, rating: learn.ratingOf, reconcile: learn.reconcile, onTaskDone: learn.onTaskDone, choose: learn.chooseSource},
    passYears: () => PassYearsApp.open(),
    runSkipTest,
    open: () => CreationApp.open(),
    spend: actor => SpendApp.openFor(actor),
    animals: {rules: animalGhouls, isAnimal: data.isAnimal, kindOf: data.animalKindOf, isGhoul: data.isAnimalGhoul, feed: feedVitae.requestFeed, canDrink: feedVitae.canDrink,
      stock: animalStockRules, training: a => data.animalKindOf(a) ? animalStockRules.trainingOf(a.getFlag(MODULE_ID, "animal")) : null,
      train: animalStock.startTraining, applyTraining: data.applyTraining, makeBeast: animalStock.makeBeast, requestBeast: animalStock.requestBeast, dotsLeft: animalStock.dotsLeft,
      syncMark: animalBlood.syncMark, keepers: animalKeepersRules, householdBeasts: animalKeepers.householdBeasts, craft: animalKeepers.startCraft,
      makeSzlachta: animalKeepers.makeSzlachta, makeVozhd: animalKeepers.makeVozhd, setKennel: animalKeepers.setKennel, kennelTick: animalKeepers.kennelTick, ghoulsOf: animalKeepers.ghoulsOf, showBlood: animalBlood.showBlood, ownBeast: (domitor, beast) => !!beast && data.isAnimalGhoul(beast) && data.domitorOf(beast)?.id === domitor?.id},
    embrace: change.embrace, giveVitae: change.giveVitae, firstChange: firstChange.firstChange, firstChangeDialog: firstChange.firstChangeDialog, award: xp.award, awardDialog,
    writeLineageJournal: lineage.writeLineageJournal,
    groups,
    deathToWraith: states.deathToWraith, deathDialog: states.deathDialog, awaken: states.awaken, awakenDialog: states.awakenDialog,
    revenantBirth: states.revenantBirth, revenantDialog: states.revenantDialog, chrysalis: states.chrysalis, chrysalisDialog: states.chrysalisDialog,
    fallenHost: states.fallenHost, fallenDialog: states.fallenDialog, possess: states.possess, possessDialog: states.possessDialog,
    secondBreath: states.secondBreath, secondBreathDialog: states.secondBreathDialog,
    totals, check: actor => CreationCheckApp.open(actor),
    firstNight: actor => firstNight.FirstNightApp.open(actor ?? null), firstNightOf: firstNight.recordOf, forecast: firstNight.forecastFor, signOff: firstNight.signOff, firstNightRules,
    wizard: (actor, page = null) => WizardApp.openFor(actor, page), wizardLedger, wizardRules, derived: derivedFor, derivedRules,
    lifepath: actor => lifepath.LifepathApp.openFor(actor), lifepathOf: lifepath.lifepathOf, lifepathRules, makeLifepathPeople: lifepath.makePeople,
    lifepathThreads: actor => threadsOf(lifepath.lifepathOf(actor)),
    archive: {open: () => archive.ArchiveApp.open(), candidates: archive.candidates, archive: archive.archive, restore: archive.restore, whereIs: archive.whereIs},
    people: {open: () => people.PeopleApp.open(), generate: people.generate, create: people.createPeople}
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
