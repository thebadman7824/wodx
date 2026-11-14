/**
 * WoDX Actions: powers that act each turn, in Foundry (B4832-B4834). Rules: turn-rules.js.
 * A timed effect with flags.wodx-actions.everyTurn is worked on its bearer's turn in a fight, by the active
 * Storyteller's client: damage soaked as WoDX Combat soaks it, healing, a pool point, or the book's roll with what a
 * failure (or a win) does. Each turn's result goes on a card to the bearer's players and the Storyteller (an NPC's
 * rolls to the Storyteller only). The effect ends with its own timer, or when a roll ends it.
 */
import * as TR from "./turn-rules.js";
import { countSuccesses } from "./core-rules.js";
import { poolDice } from "./summons.js";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const combat = () => game.modules.get("wodx-combat")?.api ?? null;

/**
 * Put an every-turn record on an actor: on an effect it already has (by uuid), or a new timed effect of its own.
 * Returns the effect's uuid (for Undo) or null.
 */
export async function attach(actor, rec, {effect = null, label = "A power", by = "", rounds = null} = {}) {
  if ( !actor || !rec ) return null;
  const record = {...rec, label, by};
  if ( effect ) {
    const e = fromUuidSync(effect);
    if ( e ) { await e.setFlag(MOD, "everyTurn", record); return null; }
  }
  const T = chron();
  if ( !T?.applyTimed ) return null;
  const duration = rounds ? {kind: "rounds", rounds} : rec.rounds ? {kind: "rounds", rounds: rec.rounds} : {kind: "scene"};
  const e = await T.applyTimed(actor, {name: `${label}: each turn`, description: rec.text ?? "", duration, key: `wodx-turn-${label}`, source: rec.page ?? ""});
  if ( e ) await e.setFlag(MOD, "everyTurn", record);
  return e?.uuid ?? null;
}

async function runStep(actor, tok, step) {
  const C = combat();
  switch ( step.kind ) {
    case "damage":
      if ( C?.soakAndApply ) await C.soakAndApply(tok?.object ?? tok ?? actor, {mode: "levels", amount: n(step.levels) || 1, type: step.type ?? "lethal", soak: step.soak !== false});
      return `${n(step.levels) || 1} ${step.type ?? "lethal"} level${n(step.levels) === 1 ? "" : "s"}${step.soak === false ? ", unsoakable" : ""}`;
    case "heal": {
      let left = n(step.levels) || 1;
      for ( const type of ["lethal", "bashing"] ) {
        const has = n(actor.system?.health?.damage?.[type]);
        const take = Math.min(has, left);
        if ( take > 0 && C?.healDamage ) { await C.healDamage(actor, type, take); left -= take; }
      }
      return left < (n(step.levels) || 1) ? "a level healed" : "nothing to heal";
    }
    case "pool": {
      const path = `system.advantages.${step.key}.temporary`, cap = n(foundry.utils.getProperty(actor, `system.advantages.${step.key}.permanent`)) || 10;
      const was = n(foundry.utils.getProperty(actor, path));
      await actor.update({[path]: Math.max(0, Math.min(cap, was + n(step.points)))});
      return `${n(step.points) > 0 ? "+" : ""}${n(step.points)} ${step.key}`;
    }
    case "condition":
      await chron()?.conditions?.setCondition?.(actor, step.condition, true);
      return step.condition === "frenzy" ? "the beast takes over (frenzy)" : step.condition;
    default: return "";
  }
}

/** Work every every-turn effect on the combatant whose turn it is. */
export async function onTurn(fight) {
  if ( !isActiveGM() || !fight?.started ) return 0;
  const c = fight.combatant;
  const actor = c?.actor;
  if ( !actor ) return 0;
  const key = `${fight.id}:${fight.round}:${fight.turn}`;
  let k = 0;
  for ( const e of [...(actor.effects ?? [])] ) {
    const rec = e.getFlag?.(MOD, "everyTurn");
    if ( !rec || rec.lastTurn === key ) continue;
    await e.setFlag(MOD, "everyTurn", {...rec, lastTurn: key});
    let roll = null, rolled = "";
    if ( rec.roll ) {
      const diff = TR.rollDiff(rec.roll.diff, {torment: actor.system?.advantages?.torment?.permanent});
      const dice = Math.max(1, poolDice(actor, rec.roll.pool));
      const r = new Roll(`${dice}d10`);
      await r.evaluate();
      roll = {...countSuccesses(r.dice[0]?.results?.map(x => x.result) ?? [], diff), roll: r};
      rolled = `${rec.roll.pool[0].toUpperCase()}${rec.roll.pool.slice(1)} (${dice} dice at ${diff}): ${roll.botch ? "a botch" : `${roll.successes} success${roll.successes === 1 ? "" : "es"}`}`;
    }
    const steps = TR.stepOf(rec, roll);
    const done = [];
    let ended = false;
    for ( const s of steps ) {
      if ( s.kind === "end" ) { ended = true; continue; }
      done.push(await runStep(actor, c.token, s));
    }
    if ( ended ) await e.delete();
    const whisper = actor.hasPlayerOwner ? game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id) : game.users.filter(u => u.isGM).map(u => u.id);
    await ChatMessage.create({speaker: {alias: actor.name}, whisper, rolls: roll?.roll ? [roll.roll] : [],
      content: `<div class="wodx-card"><p><b>${esc(rec.label)}</b> on ${esc(actor.name)}, this turn: ${esc([rolled, ...done.filter(Boolean)].filter(Boolean).join("; ") || "nothing")}${ended ? `. It ends.` : "."}</p></div>`});
    k++;
  }
  return k;
}

export function setup() {
  Hooks.on("updateCombat", (fight, changed) => {
    if ( !("turn" in (changed ?? {}) || "round" in (changed ?? {})) ) return;
    onTurn(fight).catch(e => console.error("WoDX | each turn", e));
  });
}
