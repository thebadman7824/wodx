/**
 * WoDX Actions: powers that act each turn, in Foundry (B4832-B4834). Rules: turn-rules.js.
 * A timed effect with flags.wodx-actions.everyTurn is worked on its bearer's turn in a fight, by the active
 * Storyteller's client: damage soaked as WoDX Combat soaks it, healing, a pool point, or the book's roll with what a
 * failure (or a win) does. Each turn's result goes on a card to the bearer's players and the Storyteller (an NPC's
 * rolls to the Storyteller only). The effect ends with its own timer, or when a roll ends it.
 */
import * as TR from "./turn-rules.js";
export const rules = TR;
import { countSuccesses } from "./core-rules.js";
import { poolDice } from "./summons.js";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";

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

const isLiving = a => !["Wraith", "Spirit", "Specter"].includes(a?.type) && !/construct|corpse|ghost|zombie/i.test(a?.flags?.["wodx-actions"]?.summon?.what ?? "");

/** The tokens inside an area round a bearer's token, the bearer left out. */
function inside(tok, rec) {
  const scene = tok?.parent ?? canvas?.scene;
  if ( !tok || !scene ) return [];
  const g = scene.grid?.size ?? 100, dist = scene.grid?.distance ?? 1, units = String(scene.grid?.units ?? "yd");
  const yards = n(rec.area?.yards) || 1;
  const perYard = TERMS.unitsPerYard(units);
  const px = yards * perYard / (dist || 1) * g;
  const cx = n(tok.x) + (n(tok.width) || 1) * g / 2, cy = n(tok.y) + (n(tok.height) || 1) * g / 2;
  return scene.tokens.filter(t => t.id !== tok.id && t.actor && Math.hypot(n(t.x) + (n(t.width) || 1) * g / 2 - cx, n(t.y) + (n(t.height) || 1) * g / 2 - cy) <= px)
    .filter(t => !rec.area?.living || isLiving(t.actor))
    .filter(t => !rec.area?.skipMasked || !t.actor.getFlag?.(MOD, "masked"));
}

async function hurt(target, step, rec) {
  const C = combat();
  if ( !C?.soakAndApply || !target ) return "";
  const caster = rec.byUuid ? fromUuidSync(rec.byUuid) : null;
  const dice = TR.damageDice(step, rec, pool => poolDice(caster?.actor ?? caster, pool));
  if ( step.pool && dice < 1 ) return "";
  await C.soakAndApply(target, {mode: dice ? "pool" : "levels", amount: dice || n(step.levels) || 1, type: step.type ?? "lethal", soak: step.soak !== false});
  return dice ? `${dice} ${step.type ?? "lethal"} dice` : `${n(step.levels) || 1} ${step.type ?? "lethal"} level${(n(step.levels) || 1) === 1 ? "" : "s"}${step.soak === false ? ", unsoakable" : ""}`;
}

async function runStep(actor, tok, step, rec, e) {
  switch ( step.kind ) {
    case "damage": {
      if ( rec.area ) {
        const hit = inside(tok, rec);
        for ( const t of hit ) await hurt(t.object ?? t, step, rec);
        return hit.length ? `${hit.map(t => t.name).join(", ")}: ${TR.damageDice(step, rec) || n(step.levels) || 1} ${step.type ?? "lethal"}${step.pool ? " dice" : ""} each` : "no one inside";
      }
      return hurt(tok?.object ?? tok ?? actor, step, rec);
    }
    case "heal": {
      const C = combat();
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
      if ( step.endIfEmpty && was + n(step.points) < 0 ) return {text: `no ${step.key} left`, end: true};
      await actor.update({[path]: Math.max(0, Math.min(cap, was + n(step.points)))});
      return `${n(step.points) > 0 ? "+" : ""}${n(step.points)} ${step.key}`;
    }
    case "condition":
      await chron()?.conditions?.setCondition?.(actor, step.condition, true);
      return step.condition === "frenzy" ? "the beast takes over (frenzy)" : step.condition;
    case "note": return step.text;
    case "counter": {
      const v = Math.max(0, n(rec.counter?.value) + n(step.by));
      rec.counter = {...rec.counter, value: v};
      return v > 0 ? `${v} ${rec.counter.label ?? "left"}` : {text: `no ${rec.counter.label ?? "strength"} left`, end: true};
    }
    default: return "";
  }
}

/** A strike roll for each token inside the area (Invoke the Storm): a die each, a hit at the record's number. */
async function strikes(tok, rec) {
  const hits = [];
  for ( const t of inside(tok, rec) ) {
    const r = new Roll("1d10");
    await r.evaluate();
    if ( TR.struck(rec, r.total) ) { await hurt(t.object ?? t, rec.strike.damage, rec); hits.push(t.name); }
  }
  return hits.length ? `struck: ${hits.join(", ")}` : "no strike lands";
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
    const rec0 = e.getFlag?.(MOD, "everyTurn");
    if ( !rec0 || rec0.lastTurn === key || rec0.passive ) continue;
    const rec = foundry.utils.deepClone(rec0);
    let roll = null, rolled = "";
    if ( rec.roll ) {
      const diff = TR.rollDiff(rec.roll.diff, {torment: actor.system?.advantages?.torment?.permanent});
      const dice = Math.max(1, poolDice(actor, rec.roll.pool));
      const r = new Roll(`${dice}d10`);
      await r.evaluate();
      roll = {...countSuccesses(r.dice[0]?.results?.map(x => x.result) ?? [], diff), roll: r};
      const label = String(rec.roll.pool).split("+").map(x => x[0].toUpperCase() + x.slice(1)).join(" + ");
      rolled = `${label} (${dice} dice at ${diff}): ${roll.botch ? "a botch" : `${roll.successes} success${roll.successes === 1 ? "" : "es"}`}`;
    }
    const steps = TR.stepOf(rec, roll);
    const done = [];
    let ended = false;
    for ( const s of steps ) {
      if ( s.kind === "end" ) { ended = true; continue; }
      const r = await runStep(actor, c.token, s, rec, e);
      if ( r && typeof r === "object" ) { done.push(r.text); if ( r.end ) ended = true; }
      else done.push(r);
    }
    if ( rec.strike ) done.push(await strikes(c.token, rec));
    if ( ended ) await e.delete();
    else await e.setFlag(MOD, "everyTurn", {...rec, lastTurn: key});
    const whisper = actor.hasPlayerOwner ? game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id) : game.users.filter(u => u.isGM).map(u => u.id);
    const skip = rec.skip && !ended && steps.some(s => s.kind === "damage") ? `<button type="button" class="wodx-turn-skip" data-actor="${esc(actor.uuid)}" data-type="${esc(steps.find(s => s.kind === "damage").type ?? "bashing")}">${esc(rec.skip)}: take it back</button>` : "";
    await ChatMessage.create({speaker: {alias: actor.name}, whisper, rolls: roll?.roll ? [roll.roll] : [],
      content: `<div class="wodx-card"><p><b>${esc(rec.label)}</b> on ${esc(actor.name)}, this turn: ${esc([rolled, ...done.filter(Boolean)].filter(Boolean).join("; ") || "nothing")}${ended ? `. It ends.` : "."}</p>${skip}</div>`});
    k++;
  }
  return k;
}

/** B4840: the Storyteller takes back a turn's level (Scabwalker Curse when the target touched nothing made by people). */
async function skipTurn(btn) {
  if ( !game.user.isGM ) return;
  const a = fromUuidSync(btn.dataset.actor);
  const C = combat();
  if ( a && C?.healDamage ) await C.healDamage(a?.actor ?? a, btn.dataset.type || "bashing", 1);
  btn.disabled = true;
  btn.textContent = "Taken back";
}

/** B4846: a burning bearer hurts whoever lands a close blow (Witch's Nimbus). */
export async function onBlow(attacker, info) {
  if ( !isActiveGM() || !info?.hit || info.ranged || !info.targetToken ) return null;
  const tok = fromUuidSync(info.targetToken);
  const fx = (tok?.actor?.effects ?? []).map(e => e.getFlag?.(MOD, "touchHarm")).find(Boolean);
  if ( !fx || !n(fx.levels) ) return null;
  const C = combat();
  const at = info.attackerToken ? fromUuidSync(info.attackerToken) : null;
  if ( !C?.soakAndApply ) return null;
  await C.soakAndApply(at?.object ?? at ?? attacker, {mode: "levels", amount: n(fx.levels), type: fx.type ?? "lethal", soak: true});
  await ChatMessage.create({speaker: {alias: tok.name}, content: `<div class="wodx-card"><p>${esc(attacker?.name ?? "The attacker")} strikes ${esc(tok.name)} and is burned: ${n(fx.levels)} ${esc(fx.type ?? "lethal")} level${n(fx.levels) === 1 ? "" : "s"}.</p></div>`});
  return fx;
}

/** Healing ends the harm a treated wound keeps doing (Bitter Fruit, Naming the Body's Destruction). */
export async function onHealed(actor) {
  for ( const e of [...(actor?.effects ?? [])] ) if ( e.getFlag?.(MOD, "everyTurn")?.endOnHeal ) await e.delete();
}

/** Is the blood-a-turn limit lifted on this actor (Blood Pump)? */
export const noBloodCap = actor => (actor?.effects ?? []).some(e => e.getFlag?.(MOD, "everyTurn")?.flag === "noBloodCap" || e.getFlag?.(MOD, "noBloodCap"));

export function setup() {
  Hooks.on("wodxAttackRolled", (attacker, info) => { onBlow(attacker, info).catch(e => console.error("WoDX | touch harm", e)); });
  Hooks.on("renderChatMessageHTML", (msg, html) => {
    if ( !game.user.isGM ) return;
    html.querySelectorAll?.("button.wodx-turn-skip").forEach(b => b.addEventListener("click", () => skipTurn(b)));
  });
  Hooks.on("updateCombat", (fight, changed) => {
    if ( !("turn" in (changed ?? {}) || "round" in (changed ?? {})) ) return;
    onTurn(fight).catch(e => console.error("WoDX | each turn", e));
  });
}
