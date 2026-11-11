import {MODULE_ID, isActiveGM, setting} from "./util.mjs";
import {secondsToNextDawn} from "./calendar.mjs";
import {getCondition, STATUS_PREFIX} from "./conditions.mjs";

/**
 * Timed effects: powers and conditions that end on their own, by round, scene, night or clock time.
 * Each is a Foundry Active Effect flagged by WoDX; the active Storyteller's client ends them when their time is up,
 * runs the "revert" step the module that made them registered (to take back a sheet change), and deletes the effect.
 * Only effects WoDX made are ever ended this way.
 */

const FLAG = "timed";
const reverters = new Map();

/** A module registers how to take back what one of its effects changed: fn(actor, data, effect). */
export function registerReverter(key, fn) {
  reverters.set(key, fn);
}

export const DURATION_LABELS = {rounds: "rounds", scene: "the scene", night: "the night (ends at dawn)", time: "a set time"};

/**
 * Put a timed effect on an actor.
 * @param {Actor} actor
 * @param {object} o
 * @param {string} o.name
 * @param {string} [o.img]
 * @param {string} [o.description]
 * @param {{kind: "rounds"|"scene"|"night"|"time", rounds?: number, seconds?: number}} o.duration
 * @param {string} [o.condition]     A registered condition this effect turns on while it lasts
 * @param {object[]} [o.changes]     Active Effect changes
 * @param {{key: string, data?: object}} [o.revert]   Registered reverter to run when it ends
 * @param {string} [o.source]        Book and page
 * @param {string} [o.key]           One effect per actor per key: putting it on again replaces the old one's timer
 */
export async function applyTimed(actor, o) {
  if ( !actor?.createEmbeddedDocuments ) throw new Error("No actor to apply the effect to");
  const d = o.duration ?? {kind: "scene"};
  const now = game.time.worldTime;
  const timed = {kind: d.kind, source: o.source ?? "", revert: o.revert ?? null, key: o.key ?? null, data: o.data ?? null, applied: now};
  const duration = {};
  if ( d.kind === "rounds" ) {
    const combat = game.combat ?? null;
    const rounds = Math.max(1, Number(d.rounds) || 1);
    timed.combatId = combat?.id ?? null;
    timed.endsRound = (combat?.round ?? 0) + rounds;
    Object.assign(duration, {rounds, startRound: combat?.round ?? 0, startTurn: combat?.turn ?? 0, combat: combat?.id ?? null});
  } else if ( d.kind === "scene" ) {
    timed.sceneId = globalThis.canvas?.scene?.id ?? game.scenes?.active?.id ?? null;
  } else if ( d.kind === "night" ) {
    timed.until = now + secondsToNextDawn(now, setting("latitude"));
  } else if ( d.kind === "time" ) {
    timed.until = now + Math.max(1, Number(d.seconds) || 1);
    duration.seconds = Math.max(1, Number(d.seconds) || 1);
  } else throw new Error(`Unknown duration ${d.kind}`);

  if ( timed.key ) {
    const old = actor.effects?.find?.(e => e.getFlag?.(MODULE_ID, FLAG)?.key === timed.key);
    if ( old ) await old.delete();
  }
  const cond = o.condition ? getCondition(o.condition) : null;
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: o.name, img: o.img ?? cond?.img ?? "icons/svg/clockwork.svg",
    description: `${o.description ?? cond?.summary ?? ""}${timed.source ? ` (${timed.source})` : ""}`,
    statuses: cond ? [STATUS_PREFIX + cond.id] : [],
    changes: o.changes ?? [], duration, transfer: false,
    flags: {[MODULE_ID]: {[FLAG]: timed}}
  }]);
  return effect;
}

export function timedOf(effect) {
  return effect?.getFlag?.(MODULE_ID, FLAG) ?? effect?.flags?.[MODULE_ID]?.[FLAG] ?? null;
}

/** Every WoDX timed effect on world actors and on unlinked tokens of the active and viewed scenes (not all 200). */
function allTimed() {
  const out = [];
  const seen = new Set();
  const take = actor => {
    if ( !actor || seen.has(actor) ) return;
    seen.add(actor);
    for ( const e of actor.effects ?? [] ) { const t = timedOf(e); if ( t ) out.push({actor, effect: e, timed: t}); }
  };
  for ( const a of game.actors ?? [] ) take(a);
  const scenes = new Set([game.scenes?.active, globalThis.canvas?.scene].filter(Boolean));
  for ( const s of scenes ) for ( const tok of s.tokens ?? [] ) if ( tok.actorLink === false ) take(tok.actor);
  return out;
}

async function end(list, why) {
  const lines = [];
  for ( const {actor, effect, timed} of list ) {
    try {
      const fn = timed.revert?.key ? reverters.get(timed.revert.key) : null;
      if ( fn ) await fn(actor, timed.revert.data ?? {}, effect);
      await effect.delete();
      lines.push(`${actor.name}: ${effect.name} ends`);
    } catch (err) {
      console.error("WoDX | Could not end a timed effect", err);
    }
  }
  if ( lines.length ) {
    await ChatMessage.create({
      whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX"},
      content: `<div class="wodx-card"><p><strong>${why}</strong></p><ul>${lines.map(l => `<li>${l.replaceAll("<", "&lt;")}</li>`).join("")}</ul></div>`
    });
  }
  return lines.length;
}

/**
 * End an actor's WoDX timed effects now (any owner may): all of them, or those of one kind or key.
 * Runs each effect's reverter, as when its time runs out.
 */
export async function endFor(actor, {kind = null, key = null, why = "Ended"} = {}) {
  if ( !actor?.isOwner ) return 0;
  const list = [];
  for ( const e of actor.effects ?? [] ) {
    const t = timedOf(e);
    if ( t && (!kind || t.kind === kind) && (!key || t.key === key || t.revert?.key === key) ) list.push({actor, effect: e, timed: t});
  }
  return end(list, why);
}

/** Active GM: end what the clock has run past. */
export async function sweepTime(now = game.time.worldTime) {
  if ( !isActiveGM() ) return 0;
  return end(allTimed().filter(x => (x.timed.kind === "night" || x.timed.kind === "time") && Number.isFinite(x.timed.until) && now >= x.timed.until),
    "Time's up");
}

/** Active GM: end round effects whose last round has passed, or whose fight is over. */
export async function sweepRounds(combat, {ended = false} = {}) {
  if ( !isActiveGM() ) return 0;
  return end(allTimed().filter(x => x.timed.kind === "rounds" && (
    (x.timed.combatId && combat?.id === x.timed.combatId && (ended || (combat.round ?? 0) > x.timed.endsRound))
    || (ended && !x.timed.combatId))), ended ? "The fight is over" : `Round ${combat?.round}`);
}

/** End the scene: every "scene" effect ends (or only those begun on one scene). */
export async function endScene({sceneId = null, quiet = false} = {}) {
  if ( !isActiveGM() ) return 0;
  const n = await end(allTimed().filter(x => x.timed.kind === "scene" && (!sceneId || x.timed.sceneId === sceneId)), "The scene ends");
  // Other modules end their own scene-long state (WoDX Actions: ignoring pain, daytime activity)
  if ( !quiet ) Hooks.callAll("wodxEndScene", {sceneId});
  return n;
}

/** When another scene becomes active, the scene effects begun elsewhere end. */
export async function onSceneChange(newSceneId) {
  if ( !isActiveGM() ) return 0;
  return end(allTimed().filter(x => x.timed.kind === "scene" && x.timed.sceneId && x.timed.sceneId !== newSceneId), "A new scene");
}

export function registerTimedHooks() {
  Hooks.on("updateWorldTime", () => {
    if ( game.modules.get(MODULE_ID)?.api?.isSkipping?.() ) return;
    sweepTime().catch(err => console.error("WoDX |", err));
  });
  Hooks.on("wodxSkipEnd", () => sweepTime().catch(err => console.error("WoDX |", err)));
  Hooks.on("updateCombat", (combat, changes) => {
    if ( "round" in (changes ?? {}) ) sweepRounds(combat).catch(err => console.error("WoDX |", err));
  });
  Hooks.on("deleteCombat", combat => sweepRounds(combat, {ended: true}).catch(err => console.error("WoDX |", err)));
  Hooks.on("updateScene", (scene, changes) => {
    if ( changes?.active === true ) onSceneChange(scene.id).catch(err => console.error("WoDX |", err));
  });
}
