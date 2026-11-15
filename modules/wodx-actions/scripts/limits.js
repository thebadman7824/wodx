/**
 * How often a power may be used, in play (B4920-B4925): the one scene count, the uses each actor has made, the greyed
 * options in the power windows, the check before the roll and the Drained condition after a great power.
 */
import * as L from "./limit-rules.js";
import * as AFC from "./after-costs.js";
import * as ACR from "./after-cost-rules.js";

const MOD = "wodx-actions";
const FLAG = "limits";
const chronicle = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM?.id ?? game.user.id) === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));

export const rules = L;

/* ---------------- One scene count (B4920) ---------------- */

/** The scene count: one more each time the Storyteller ends the scene or another map becomes active. */
export const sceneNo = () => { try { return Number(game.settings.get(MOD, "sceneTally")) || 0; } catch (e) { return 0; } };

/** Active GM: a new scene. Clears Drained and tells the line systems that count their own scene things. */
export async function newScene(why = "A new scene") {
  if ( !isActiveGM() ) return sceneNo();
  const n = sceneNo() + 1;
  await game.settings.set(MOD, "sceneTally", n);
  for ( const a of game.actors ?? [] ) if ( a.statuses?.has?.("wodx-drained") ) await clearDrained(a);
  for ( const s of new Set([game.scenes?.active, canvas?.scene].filter(Boolean)) ) {
    for ( const t of s.tokens ?? [] ) if ( !t.actorLink && t.actor?.statuses?.has?.("wodx-drained") ) await clearDrained(t.actor);
  }
  Hooks.callAll("wodxNewScene", {n, why});
  return n;
}

/** The clock, the fight and the scene, for the period keys. */
export const ctxNow = () => ({worldTime: game.time?.worldTime ?? 0, combat: game.combat?.started ? game.combat : null, scene: sceneNo()});

/* ---------------- Uses ---------------- */

export const usesOf = actor => actor?.getFlag?.(MOD, FLAG) ?? {};
const uuidsOf = (targets = []) => targets.map(t => t?.uuid ?? t?.document?.uuid ?? t?.actor?.uuid ?? t).filter(x => typeof x === "string");
const targetActors = () => [...(game.user?.targets ?? [])].map(t => t.actor).filter(Boolean);

/** What the limits say about using this power now, on these targets (default: the user's targets). */
export function stateOf(actor, power, targets = null) {
  const list = uuidsOf(targets ?? targetActors());
  return L.check(L.prune(usesOf(actor), ctxNow()), power, ctxNow(), list);
}

async function file(actor, power, {targets = [], fail = false} = {}) {
  if ( !actor?.isOwner ) return;
  const now = ctxNow();
  const next = L.record(L.prune(usesOf(actor), now), power, now, {targets: uuidsOf(targets), fail});
  await actor.setFlag(MOD, FLAG, next);
}

/** A target won against the power (Compel Soul): file the use as a failure on that target. */
export async function lostTo(actor, power, target) { return file(actor, power, {targets: [target], fail: true}); }

/** The Storyteller clears an actor's uses (a new story, or a ruling). */
export async function clear(actor) { if ( actor?.isOwner ) await actor.unsetFlag(MOD, FLAG); }

/* ---------------- The power windows (B4921) ---------------- */

/**
 * Grey out the options of a power window that are used up. sel: the select's CSS selector; powerOf(value) gives the
 * power record ({name, disc, level}) behind an option. A per-target limit greys only when every target is barred.
 */
export function decorate(root, {actor, sel = "select[name=power]", powerOf}) {
  const box = root?.querySelector?.(sel);
  if ( !box || !actor || typeof powerOf !== "function" ) return;
  for ( const o of box.options ?? [] ) {
    const p = powerOf(o.value);
    if ( !p ) continue;
    const st = stateOf(actor, p);
    o.dataset.wodxLimit = st.ok ? "" : st.why;
    if ( !st.ok ) {
      o.disabled = !game.user.isGM;
      o.title = st.why;
      if ( !o.textContent.endsWith(" (used)") ) o.textContent += " (used)";
    } else if ( st.barred.length ) o.title = st.why;
  }
  // A window that opens on a used power moves to the first free one
  if ( box.selectedOptions?.[0]?.disabled ) {
    const free = [...box.options].find(o => !o.disabled);
    if ( free ) { box.value = free.value; box.dispatchEvent(new Event("change")); }
  }
}

/**
 * Before the roll: may the power be used? Players are refused with the reason; the Storyteller may allow it once.
 * Returns null when refused, else {diff, done}: diff is Drained's +1, and done({successes, fail}) files the use.
 */
export async function gate(actor, power, {targets = null} = {}) {
  // B6156: a sleeping or out-cold character uses no power (the Storyteller still may, to run a scene)
  if ( refuseIdle(actor) ) return null;
  const tg = targets ?? targetActors();
  const st = stateOf(actor, power, tg);
  if ( !st.ok ) {
    if ( !game.user.isGM ) { ui.notifications?.warn(st.why); return null; }
    const yes = await foundry.applications.api.DialogV2.confirm({window: {title: `${power.name ?? power.n}: used up`},
      content: `<p>${esc(st.why)}</p><p>Allow it this once?</p>`, rejectClose: false}).catch(() => false);
    if ( !yes ) return null;
  }
  // B5618: a fomor's Homogeneity takes dice from this power's roll (the next roll the window makes)
  const dull = actor?.getFlag?.(MOD, "powerDulled");
  if ( dull?.dice && actor.isOwner ) {
    DULL = {dice: Number(dull.dice) || 0, at: Date.now()};
    await actor.unsetFlag(MOD, "powerDulled");
    ui.notifications?.info(`${actor.name}: ${dull.dice} dice fewer, dulled by ${dull.by ?? "a fomor"} (Homogeneity, W20 p. 434).`);
  }
  const free = st.barred.length ? tg.filter(t => !st.barred.includes(t?.uuid)) : tg;
  if ( st.barred.length && st.ok ) ui.notifications?.info(`${st.why} Not on: ${tg.filter(t => st.barred.includes(t?.uuid)).map(t => t.name).join(", ")}.`);
  // B6157: every registered condition's own difficulty (Drained among them), not only Drained
  const cm = conditionMods(actor);
  return {
    diff: cm.diff, label: cm.parts.join(", "), free, why: st.why,
    done: async ({successes = 1, fail = null} = {}) => {
      const failed = fail ?? !(successes > 0);
      await file(actor, power, {targets: tg, fail: failed});
      if ( !failed && L.drains(power) ) await drainAfter(actor, power);
      // B4924: a power whose page sets a cost when it ends pays it then
      if ( !failed ) await AFC.filed(actor, power, {targets: tg, successes}).catch(e => console.warn("WoDX | after-cost", e));
    }
  };
}

/** B5618: the dice Homogeneity takes from the roll that follows a gate (once, within half a minute). */
let DULL = null;
export function takeDull() {
  const d = DULL; DULL = null;
  return d && Date.now() - d.at < 30000 ? d.dice : 0;
}

/* ---------------- Drained (B4923) ---------------- */

export const isDrained = actor => !!actor?.statuses?.has?.("wodx-drained");
export const drainedDiff = actor => (isDrained(actor) ? L.DRAINED.mods.ownDiff : 0);

async function setDrained(actor) {
  if ( !actor?.isOwner || isDrained(actor) ) return;
  const C = chronicle();
  if ( C?.conditions?.setCondition ) await C.conditions.setCondition(actor, L.DRAINED.id, true);
  else await actor.toggleStatusEffect?.("wodx-drained", {active: true});
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}),
    content: `<div class="wodx-card"><p><b>${esc(actor.name)} is Drained</b>: +1 difficulty on their own rolls until the scene ends (${esc(L.DRAINED.source)}).</p></div>`});
}
async function clearDrained(actor) {
  const C = chronicle();
  if ( C?.conditions?.setCondition ) await C.conditions.setCondition(actor, L.DRAINED.id, false);
  else await actor.toggleStatusEffect?.("wodx-drained", {active: false});
}

/**
 * After a great power: Drained now, or, when the power left a lasting effect on its user, when that effect ends.
 * The lasting effect is the newest one bearing the power's name, made in the last minute.
 */
async function drainAfter(actor, power) {
  const name = String(power.name ?? power.n ?? "").toLowerCase();
  const recent = (actor.effects ?? []).filter(e => String(e.name ?? "").toLowerCase().includes(name)
    && (Date.now() - (e._stats?.createdTime ?? 0)) < 60000);
  if ( recent.length ) { for ( const e of recent ) await e.setFlag(MOD, "drainOnEnd", true); return; }
  await setDrained(actor);
}

/* ---------------- Setup ---------------- */

export function register() {
  game.settings.register(MOD, "sceneTally", {scope: "world", config: false, type: Number, default: 0});
}

export function setup() {
  const C = chronicle();
  try { C?.registerCondition?.(L.DRAINED); } catch (e) { console.warn("WoDX | Drained", e); }
  Hooks.on("wodxEndScene", () => { newScene("The scene ends").catch(e => console.error("WoDX | scene count", e)); });
  Hooks.on("updateScene", (scene, changes) => {
    if ( changes?.active === true ) newScene("A new map").catch(e => console.error("WoDX | scene count", e));
  });
  Hooks.on("deleteActiveEffect", effect => {
    if ( !effect.getFlag?.(MOD, "drainOnEnd") ) return;
    const actor = effect.parent;
    if ( actor?.documentName === "Actor" && isActiveGM() ) setDrained(actor).catch(e => console.error("WoDX | Drained", e));
  });
}

/* ---------------- Acting at all, and the conditions on a roll (B6156, B6157) ---------------- */

/** The registered conditions the actor has (WoDX Chronicle's registry); none when Chronicle is off. */
export const condsOf = actor => { try { return chronicle()?.conditions?.conditionsOf?.(actor) ?? []; } catch (e) { return []; } };

/** B6156: why the character cannot act now (asleep for the day, Asleep, Torpor, Incapacitated, staked), or "". */
export const cannotAct = actor => !actor ? "" : ACR.cannotActWhy({name: actor.name, daySleep: !!actor.getFlag?.(MOD, "daySleep"), conds: condsOf(actor)});

/** B6156: the one guard every WoDX Actions window calls. A player is refused with the reason; the Storyteller is not. */
export function refuseIdle(actor) {
  const why = cannotAct(actor);
  if ( !why || game.user?.isGM ) return false;
  ui.notifications?.warn(why);
  return true;
}

/** B6157: what the actor's registered conditions add to its own roll; Drained counts even with WoDX Chronicle off. */
export function conditionMods(actor, {sight = false} = {}) {
  const conds = condsOf(actor);
  const out = ACR.conditionRollMods(conds, {sight});
  if ( isDrained(actor) && !conds.some(c => c.id === L.DRAINED.id) ) {
    out.diff += drainedDiff(actor);
    out.parts.push(`Drained +${drainedDiff(actor)}`);
  }
  return out;
}
