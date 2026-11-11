import {MODULE_ID, fetchJSON, isActiveGM, rule, setting, setSetting, log, esc} from "./util.mjs";
import {mergeProfiles, resolveEra, interludeSpans, LINES} from "./era-resolve.mjs";
import {getEngine, describeTime} from "./calendar.mjs";
import {writeChronicleRules} from "./journals.mjs";
import * as approvals from "./approvals.mjs";

const state = {profiles: [], rejected: [], loaded: false};

export function profiles() {
  return state.profiles;
}

export function getProfile(id) {
  return state.profiles.find(p => p.id === id) ?? null;
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

  // The Storyteller's lock is a decision already made
  if ( target.locked || !rule("eraProposals") ) {
    await setSetting("activeEra", target.profile.id);
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

/** Approval handler for era changes. */
export function registerEraHandler() {
  approvals.registerHandler("era-change", {
    label: "Era change",
    approve: async req => {
      await setSetting("declinedEra", "");
      await setSetting("activeEra", req.data.to);
    },
    reject: async req => {
      await setSetting("declinedEra", req.data.to);
    }
  });
}
