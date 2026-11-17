import {MODULE_ID, fetchJSON, isActiveGM, rule, setting, setSetting, log, esc} from "./util.mjs";
import {mergeProfiles, resolveEra, interludeSpans, LINES, eraAbilitiesOf, eraAbilityList, followAbilities} from "./era-resolve.mjs";
import {getEngine, describeTime} from "./calendar.mjs";
import {writeChronicleRules} from "./journals.mjs";
import * as approvals from "./approvals.mjs";

const state = {profiles: [], rejected: [], loaded: false, legacy: {}};

export function profiles() {
  return state.profiles;
}

export function getProfile(id) {
  return state.profiles.find(p => p.id === id) ?? state.profiles.find(p => p.id === state.legacy[id]) ?? null;
}

/**
 * Load the module's profiles, then the world's own, which add to or replace them. A world opts in with
 * "worldEras": true under flags.wodx in world.json and keeps its profiles in worlds/<id>/wodx/eras.json.
 */
export async function loadProfiles() {
  const mod = await fetchJSON(`modules/${MODULE_ID}/data/eras.json`);
  const world = game.world.flags?.wodx?.worldEras ? await fetchJSON(`worlds/${game.world.id}/wodx/eras.json`) : null;
  if ( !mod ) ui.notifications.error("WoDX could not load its era profiles (data/eras.json).");
  const merged = mergeProfiles(mod?.profiles ?? [], world?.profiles ?? []);
  state.profiles = merged.profiles;
  state.legacy = mod?.legacy ?? {};
  state.rejected = merged.rejected;
  state.loaded = true;
  if ( merged.rejected.length && game.user.isGM ) {
    for ( const r of merged.rejected ) console.warn(`WoDX | Era profile ${r.id} (${r.source}) rejected: ${r.problems.join("; ")}`);
    ui.notifications.warn(`${merged.rejected.length} era profile(s) were rejected. See the console (F12) for why.`);
  }
  log(`Loaded ${state.profiles.length} era profiles`);
}

/** The current in-world year. */
export function currentYear() {
  return getEngine().timeToDate(game.time.worldTime).year;
}

/** What the date (or the Storyteller's lock) calls for, now or in a given year. */
export function targetEra(year = currentYear()) {
  const lockId = setting("eraLock");
  if ( lockId ) {
    const locked = getProfile(lockId);
    if ( locked ) return {profile: locked, interlude: false, locked: true};
  }
  const r = resolveEra(state.profiles, year, {
    region: setting("region"),
    rules: {timeOfJudgment: rule("timeOfJudgment"), futureBranch: rule("futureBranch")}
  });
  return {...r, locked: false};
}

/** The profile in force (as approved), falling back to the target. */
export function activeEra() {
  const id = setting("activeEra");
  const profile = getProfile(id);
  if ( profile ) {
    const t = targetEra();
    return {profile, interlude: t.profile?.id === profile.id ? t.interlude : false, locked: t.locked && t.profile?.id === profile.id};
  }
  return targetEra();
}

/**
 * B6668: one switch of the profile in force (its "rules": firearms, morality, gauntletChart, cyberware), or undefined
 * when the profile leaves it out. Other modules read it as api.eras.eraSwitch(key) and keep their year check as the
 * fallback (terms.gunsOnSheet, walksRoads, cyberwareOn).
 */
export function eraSwitch(key) {
  try { return activeEra()?.profile?.rules?.[key]; } catch (e) { return undefined; }
}

/**
 * Apply a profile on this client: the upstream system reads these defaults when a character is created.
 */
export function applyProfile(profile) {
  if ( !profile ) return;
  const cfg = CONFIG.worldofdarkness;
  if ( cfg ) {
    cfg.defaultMortalEra = profile.system.mortal;
    cfg.defaultVampireEra = profile.system.vampire;
    cfg.defaultWerewolfEra = profile.system.werewolf;
    cfg.defaultMageEra = profile.system.mage;
    // B6382: the abilities this era adds to or hides from the system's lists, read by the fork when a sheet is made
    cfg.wodxEraAbilities = eraAbilitiesOf(profile);
  }
  document.body.dataset.wodxEra = profile.id;
  document.body.dataset.wodxKit = profile.kit ?? profile.id;
  Hooks.callAll("wodxEraApplied", profile);
}

/** Keep the upstream system's own era settings in step, so they agree if WoDX is ever switched off. GM only. */
async function syncUpstreamSettings(profile) {
  const keys = {mortal: "eraMortal", vampire: "eraVampire", werewolf: "eraWerewolf", mage: "eraMage"};
  for ( const line of LINES ) {
    try {
      if ( game.settings.get("worldofdarkness", keys[line]) !== profile.system[line] ) {
        await game.settings.set("worldofdarkness", keys[line], profile.system[line]);
      }
    } catch (err) {
      console.warn(`WoDX | Could not set worldofdarkness.${keys[line]}`, err);
    }
  }
}

/** Rewrite the Chronicle Rules journal for the era in force. GM only. */
export async function refreshRulesJournal() {
  if ( !isActiveGM() ) return;
  const a = activeEra();
  const now = describeTime(game.time.worldTime, setting("latitude"));
  let gaps = [];
  try {
    gaps = interludeSpans(state.profiles, {region: setting("region"), rules: {timeOfJudgment: rule("timeOfJudgment"), futureBranch: rule("futureBranch")}});
  } catch (e) { gaps = []; }
  await writeChronicleRules({...a, gaps, dateLabel: `${now.dateLabel}, ${now.timeLabel}`});
}

/** Called on every client when the activeEra setting changes. */
export async function onActiveEraChange() {
  const a = activeEra();
  applyProfile(a.profile);
  if ( isActiveGM() && a.profile ) {
    await syncUpstreamSettings(a.profile);
    await refreshRulesJournal();
    await ChatMessage.create({
      content: `<div class="wodx-card"><h3>The era turns</h3><p>The chronicle now follows <strong>${esc(a.profile.name)}</strong> rules.</p><p>${esc(a.profile.switches)}</p></div>`,
      speaker: {alias: "Chronicle"}
    });
  }
}

/**
 * Compare the era in force with what the date calls for, and act. Active GM only.
 * First run sets the era directly; later changes go through the approval queue when that switch is on.
 */
export async function checkEra() {
  if ( !isActiveGM() || !state.loaded ) return;
  if ( setting("hold") ) return;
  const target = targetEra();
  if ( !target.profile ) return;
  const activeId = setting("activeEra");

  if ( !activeId || !getProfile(activeId) ) {
    await setSetting("activeEra", target.profile.id);
    return;
  }
  if ( target.profile.id === activeId ) return;

  // The Storyteller's lock is a decision already made, and so is lifting it from a prologue, which no date reaches
  if ( target.locked || !rule("eraProposals") || getProfile(activeId)?.prologue ) {
    await setActiveEra(target.profile.id);
    return;
  }
  if ( rule("lightTouch") ) return;
  if ( setting("declinedEra") === target.profile.id ) return;

  const from = getProfile(activeId);
  await approvals.propose({
    type: "era-change",
    key: `era-change:${target.profile.id}`,
    title: `Change era: ${from?.name ?? activeId} to ${target.profile.name}`,
    detail: `The clock reached ${currentYear()}.${target.interlude ? " No era book covers this year; this keeps the last era's rules." : ""} ${target.profile.switches}`,
    data: {to: target.profile.id, from: activeId}
  });
}

/**
 * Put an era in force from the clock (the date, the Storyteller's lock, an approved change) and bring the sheets in
 * step (B6383). Pass the Years sets the era itself and translates each sheet the Storyteller ticked, so it does not
 * come through here.
 */
export async function setActiveEra(id) {
  const from = getProfile(setting("activeEra"));
  await setSetting("activeEra", id);
  try { await followSheets(from, getProfile(id)); } catch (e) { console.error("WoDX | sheets follow the era", e); }
}

const SHEET_LINE = {Mortal: "mortal", Vampire: "vampire", Werewolf: "werewolf", "Changing Breed": "werewolf", Mage: "mage"};
/**
 * B6383: when the profile says so ("sheets": "follow", the default; "keep" leaves them), every character sheet that
 * stood on the old era's ability list for its line moves to the new one: its era is the new era's, the new era's
 * abilities show (with the profile's own additions), abilities with dots always stay, and those with no dots that the
 * new era lacks are hidden. A sheet set to another era by hand stays as it is. The Storyteller gets one card.
 */
export async function followSheets(from, to) {
  if ( !isActiveGM() || !from || !to || from.id === to.id || (to.sheets ?? "follow") !== "follow" ) return [];
  const ERA = CONFIG.worldofdarkness?.era, lists = game.worldofdarkness?.abilities;
  if ( !ERA || !lists ) return [];
  const oldBlock = eraAbilitiesOf(from), newBlock = eraAbilitiesOf(to);
  const moved = [];
  for ( const a of game.actors ?? [] ) {
    const line = SHEET_LINE[a.type];
    const oldKey = from.system?.[line], newKey = to.system?.[line];
    if ( !line || !ERA[oldKey] || !ERA[newKey] || a.system?.settings?.era !== ERA[oldKey] ) continue;
    // another module (or a test) may keep a sheet where it is: Hooks.on("wodxSheetFollowsEra", (actor, from, to) => false)
    if ( Hooks.call("wodxSheetFollowsEra", a, from, to) === false ) continue;
    const before = eraAbilityList(lists[line]?.[oldKey], oldBlock, line, oldKey);
    const after = eraAbilityList(lists[line]?.[newKey], newBlock, line, newKey);
    if ( oldKey === newKey && JSON.stringify(before) === JSON.stringify(after) ) continue;
    const shown = [...after.talents, ...after.skills, ...after.knowledges];
    const update = {};
    if ( oldKey !== newKey ) update["system.settings.era"] = ERA[newKey];
    for ( const [k, vis] of Object.entries(followAbilities(a.system?.abilities, shown)) ) update[`system.abilities.${k}.isvisible`] = vis;
    if ( !Object.keys(update).length ) continue;
    await a.update(update);
    moved.push(a.name);
  }
  if ( moved.length ) {
    log(`Sheets follow ${to.name}: ${moved.join(", ")}`);
    await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: `<div class="wodx-card"><h3>The sheets follow the era</h3><p>${moved.length} character${moved.length === 1 ? "" : "s"} now use the abilities of <strong>${esc(to.name)}</strong>: ${esc(moved.slice(0, 12).join(", "))}${moved.length > 12 ? ", and more" : ""}. Every ability with dots stays on the sheet.</p></div>`});
  }
  return moved;
}

/** Approval handler for era changes. */
export function registerEraHandler() {
  approvals.registerHandler("era-change", {
    label: "Era change",
    approve: async req => {
      await setSetting("declinedEra", "");
      await setActiveEra(req.data.to);
    },
    reject: async req => {
      await setSetting("declinedEra", req.data.to);
    }
  });
}
