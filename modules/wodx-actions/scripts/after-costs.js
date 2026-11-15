/**
 * The books' after-costs in play (B4924): when a power with a cost on its page ends, the cost is paid by itself.
 *
 * A use is filed when the power window's roll succeeds (limits.js gate().done). The lasting effect the power then
 * makes is tagged with the cost; when that effect ends, the active GM pays it. A power that left no lasting effect
 * pays when the scene ends.
 */
import * as AC from "./after-cost-rules.js";

const MOD = "wodx-actions";
const WINDOW = 120000;
const chronicle = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM?.id ?? game.user.id) === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));
const n = v => Number(v) || 0;

export const rules = AC;

/** Uses waiting for their lasting effect, on this client: {id, entry, power, caster, targets, successes, at}. */
const pending = [];

const baseIdOf = a => (a?.isToken ? a.token?.actorId ?? a.id : a?.id);
const sameActor = (a, b) => !!a && !!b && (a.uuid === b.uuid || baseIdOf(a) === baseIdOf(b));
const tokensOf = actor => (canvas?.scene?.tokens ?? []).filter(t => t.actor && sameActor(t.actor, actor));

/** Called by limits.js when a power's use succeeds. */
export async function filed(actor, power, {targets = [], successes = 1} = {}) {
  const entry = AC.costOf(power);
  if ( !entry || !actor ) return null;
  const id = foundry.utils.randomID();
  const rec = {id, entry, power: {name: power.name ?? power.n ?? ""}, caster: actor, targets: targets.map(t => t?.actor ?? t).filter(Boolean),
    successes: n(successes) || 1, at: Date.now()};
  pending.push(rec);
  // Effects the window already made before the roll was filed
  for ( const a of payers(rec) ) for ( const e of a.effects ?? [] ) if ( Date.now() - n(e._stats?.createdTime) < 60000 ) await tryTag(e, rec);
  // The scene's end pays it when no lasting effect took it
  if ( actor.isOwner ) {
    const list = (actor.getFlag(MOD, "afterPending") ?? []).filter(p => p.scene >= sceneNo() - 1).slice(-10);
    await actor.setFlag(MOD, "afterPending", [...list, {id, key: entry.name, scene: sceneNo(), targets: rec.targets.map(t => t.uuid), successes: rec.successes}]);
  }
  return id;
}

const sceneNo = () => { try { return n(game.settings.get(MOD, "sceneTally")); } catch (e) { return 0; } };

function payers(rec) {
  if ( rec.entry.on === "self" ) return [rec.caster];
  if ( rec.entry.on === "target" ) return rec.targets;
  return (canvas?.scene?.tokens ?? []).map(t => t.actor).filter(Boolean);
}

async function tryTag(effect, rec) {
  if ( rec.tagged || effect.getFlag?.(MOD, "afterCost") || !effect.isOwner ) return false;
  // The costs' own marks (Asleep, Blurred sight) never carry a cost of their own
  if ( String(effect.flags?.["wodx-chronicle"]?.timed?.key ?? "").startsWith("wodx-after-") ) return false;
  const actor = effect.parent;
  if ( actor?.documentName !== "Actor" ) return false;
  if ( !payers(rec).some(a => sameActor(a, actor)) ) return false;
  const named = AC.effectMatches(rec.entry, effect.name, rec.power.name);
  const timed = !!effect.flags?.["wodx-chronicle"]?.timed;
  if ( !named && !(timed && rec.entry.on !== "area" && !effect.statuses?.has?.("wodx-drained")) ) return false;
  rec.tagged = true;
  await effect.setFlag(MOD, "afterCost", {id: rec.id, key: rec.entry.name, successes: rec.successes});
  // The effect now carries the cost: the scene's end no longer pays it
  if ( rec.caster?.isOwner ) await rec.caster.setFlag(MOD, "afterPending", (rec.caster.getFlag(MOD, "afterPending") ?? []).filter(p => p.id !== rec.id));
  return true;
}

/* ---------------- Paying ---------------- */

const paid = new Set();

/** Pay an after-cost on one actor. key: the cost's power slug. */
export async function pay(actor, key, {successes = 1, id = null} = {}) {
  const entry = AC.AFTER.find(a => a.name === key);
  if ( !entry || !actor ) return null;
  if ( id ) { const k = `${id}:${actor.uuid}`; if ( paid.has(k) ) return null; paid.add(k); }
  const C = chronicle(), T = C?.timed;
  const card = html => ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content: `<div class="wodx-card wodx-after"><p><b>${esc(actor.name)}</b>: ${esc(entry.say)} (${esc(entry.page)}).</p>${html ?? ""}</div>`});
  const c = entry.cost;
  switch (c.kind) {
    case "sleep": {
      const toks = tokensOf(actor);
      const alpha = toks.map(t => ({uuid: t.uuid, alpha: t.alpha}));
      // The token dims first, so it is already dim when the Asleep status shows
      for ( const t of toks ) await t.update({alpha: 0.5});
      await T?.applyTimed?.(actor, {name: "Asleep", img: AC.CONDITIONS.asleep.img, condition: AC.CONDITIONS.asleep.id, duration: {kind: "time", seconds: c.seconds},
        key: "wodx-after-sleep", source: entry.page, description: entry.say, revert: {key: "wodx-actions.afterWake", data: {alpha, then: c.then ?? null, page: entry.page}}});
      return card(`<p>Asleep for ${c.seconds >= 86400 ? `${Math.round(c.seconds / 86400)} days` : `${Math.round(c.seconds / 3600)} hours`} of game time: no actions until the clock passes it.</p>`);
    }
    case "bloodCap": {
      const bp = actor.system?.advantages?.bloodpool ?? {};
      const lost = AC.bloodOver(bp.temporary, bp.max);
      if ( lost ) await actor.update({"system.advantages.bloodpool.temporary": n(bp.max)});
      return card(`<p>${lost ? `${lost} blood thins away; the pool is back to ${n(bp.max)}.` : "No blood over the usual pool was left to lose."}</p>`);
    }
    case "hunRoll": {
      const hun = n(actor.system?.advantages?.hun?.permanent), po = n(actor.system?.advantages?.po?.permanent);
      const diff = Math.min(10, Math.max(2, po || 6));
      const roll = hun > 0 ? await new Roll(`${hun}d10`).evaluate() : null;
      const faces = roll?.dice?.[0]?.results?.map(r => r.result) ?? [];
      const succ = faces.filter(f => f >= diff).length - faces.filter(f => f === 1).length;
      const lost = succ <= 0;
      if ( lost ) await C?.derangements?.gain?.(actor, "other", "from Strengthening the Demon");
      return card(`<p>Hun ${hun} against difficulty ${diff} (the P'o): ${faces.join(", ") || "no dice"}. ${lost ? "Failed: a Derangement takes hold (written on the sheet)." : "Held: no harm done."}</p>`);
    }
    case "habits": {
      const nights = AC.habitNights(successes);
      await T?.applyTimed?.(actor, {name: "Animal habits", img: AC.CONDITIONS.habits.img, condition: AC.CONDITIONS.habits.id, duration: {kind: "time", seconds: nights * 86400},
        key: "wodx-after-habits", source: entry.page, description: AC.CONDITIONS.habits.summary});
      return card(`<p>${nights} night${nights === 1 ? "" : "s"} of the beast's tics: +1 difficulty on Social rolls (WoDX house reading).</p>
        <p><button type="button" data-wodx-after="shake" data-actor="${esc(actor.uuid)}">Shake it off (1 Willpower)</button></p>`);
    }
    case "willpowerDot": {
      const w = actor.system?.advantages?.willpower ?? {};
      const perm = Math.max(0, n(w.permanent) - 1);
      await actor.update({"system.advantages.willpower.permanent": perm, "system.advantages.willpower.temporary": Math.min(n(w.temporary), perm)});
      return card(`<p>One permanent Willpower is gone: ${perm} left.</p>`);
    }
    case "blurred": {
      await T?.applyTimed?.(actor, {name: "Blurred sight", img: AC.CONDITIONS.blurred.img, condition: AC.CONDITIONS.blurred.id, duration: {kind: "scene"},
        key: "wodx-after-blurred", source: entry.page, description: AC.CONDITIONS.blurred.summary});
      return card(`<p>Blurred sight until the scene ends: +2 difficulty on sight-based rolls, attacks among them.</p>`);
    }
    case "numbed": {
      const d = actor.system?.attributes?.dexterity;
      if ( !d ) return null;
      await actor.update({"system.attributes.dexterity.bonus": n(d.bonus) - 1, "system.attributes.dexterity.total": n(d.total ?? d.value) - 1});
      await T?.applyTimed?.(actor, {name: "Numbed", img: AC.CONDITIONS.numbed.img, condition: AC.CONDITIONS.numbed.id, duration: {kind: "rounds", rounds: 1},
        key: "wodx-after-numbed", source: entry.page, description: AC.CONDITIONS.numbed.summary, revert: {key: "wodx-actions.afterNumbed", data: {}}});
      return card(`<p>Numbed for a turn: Dexterity -1, and moves at three-quarter pace.</p>`);
    }
    case "fomorEnd": {
      const dm = actor.system?.health?.damage ?? {};
      const total = n(dm.bashing) + n(dm.lethal) + n(dm.aggravated);
      const max = n(actor.system?.traits?.health?.totalhealthlevels?.max) || 7;
      const r = AC.fomorEnd(total, c.levels, max);
      if ( !r.dies ) return card(`<p>The extra levels go. ${total} levels of harm remain.</p>`);
      await actor.toggleStatusEffect?.("dead", {active: true, overlay: true}).catch(() => null);
      for ( const t of tokensOf(actor) ) await t.update({alpha: 0.25});
      for ( const cb of game.combat?.combatants ?? [] ) if ( cb.actor && sameActor(cb.actor, actor) ) await cb.update({defeated: true});
      return card(`<p>Past Incapacitated with the extra levels gone: the fomor dies and melts into a dissolving heap.</p>`);
    }
  }
  return null;
}

/** Social rolls: the difficulty the after-cost conditions add (Animal habits). */
export function socialDiff(actor) {
  const C = chronicle();
  try { return (C?.conditions?.conditionsOf?.(actor) ?? []).reduce((s, c) => s + n(c.mods?.socialDiff), 0); } catch (e) { return 0; }
}

/* ---------------- Setup ---------------- */

export function setup() {
  const C = chronicle();
  for ( const c of Object.values(AC.CONDITIONS) ) { try { C?.registerCondition?.(c); } catch (e) { console.warn("WoDX | after-cost condition", e); } }
  C?.timed?.registerReverter?.("wodx-actions.afterWake", async (actor, data) => {
    for ( const a of data?.alpha ?? [] ) { const t = fromUuidSync(a.uuid); if ( t ) await t.update({alpha: a.alpha ?? 1}); }
    if ( data?.then === "ravenous" ) {
      await C.timed.applyTimed(actor, {name: "Ravenous", img: AC.CONDITIONS.ravenous.img, condition: AC.CONDITIONS.ravenous.id, duration: {kind: "time", seconds: 86400},
        key: "wodx-after-ravenous", source: data.page ?? "", description: AC.CONDITIONS.ravenous.summary});
      await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content: `<div class="wodx-card wodx-after"><p><b>${esc(actor.name)}</b> wakes ravenous and must eat (${esc(data.page ?? "")}).</p></div>`});
    }
  });
  C?.timed?.registerReverter?.("wodx-actions.afterNumbed", async actor => {
    const d = actor.system?.attributes?.dexterity;
    if ( d ) await actor.update({"system.attributes.dexterity.bonus": n(d.bonus) + 1, "system.attributes.dexterity.total": n(d.total ?? d.value) + 1});
  });
  Hooks.on("createActiveEffect", effect => {
    const now = Date.now();
    for ( let i = pending.length - 1; i >= 0; i-- ) if ( now - pending[i].at > WINDOW ) pending.splice(i, 1);
    for ( const rec of pending ) tryTag(effect, rec).catch(e => console.warn("WoDX | after-cost tag", e));
  });
  Hooks.on("deleteActiveEffect", effect => {
    const f = effect.getFlag?.(MOD, "afterCost");
    const actor = effect.parent;
    if ( !f || actor?.documentName !== "Actor" || !isActiveGM() ) return;
    pay(actor, f.key, f).catch(e => console.error("WoDX | after-cost", e));
  });
  // The scene ends: uses whose power left no lasting effect pay now
  Hooks.on("wodxNewScene", async ({n: now} = {}) => {
    if ( !isActiveGM() ) return;
    const actors = [...(game.actors ?? []), ...(canvas?.scene?.tokens ?? []).filter(t => !t.actorLink && t.actor).map(t => t.actor)];
    for ( const actor of actors ) {
      const list = actor.getFlag(MOD, "afterPending") ?? [];
      if ( !list.length ) continue;
      const due = list.filter(p => p.scene < now), keep = list.filter(p => p.scene >= now);
      for ( const p of due ) {
        const live = allEffects().some(e => e.getFlag?.(MOD, "afterCost")?.id === p.id);
        if ( live ) { keep.push({...p, scene: now}); continue; }
        const entry = AC.AFTER.find(a => a.name === p.key);
        const who = entry?.on === "self" ? [actor] : (p.targets ?? []).map(u => fromUuidSync(u)).map(d => d?.actor ?? d).filter(d => d?.documentName === "Actor");
        for ( const a of who ) await pay(a, p.key, {successes: p.successes, id: p.id});
      }
      await actor.setFlag(MOD, "afterPending", keep);
    }
  });
  // Shake off Animal habits for a Willpower
  Hooks.on("renderChatMessageHTML", (msg, html) => {
    const b = html?.querySelector?.("button[data-wodx-after=shake]");
    if ( !b ) return;
    b.addEventListener("click", async () => {
      const actor = fromUuidSync(b.dataset.actor);
      if ( !actor?.isOwner ) return ui.notifications?.warn?.("Only the character's owner can do that.");
      const w = actor.system?.advantages?.willpower ?? {};
      if ( n(w.temporary) < 1 ) return ui.notifications?.warn?.("No Willpower left to spend.");
      await actor.update({"system.advantages.willpower.temporary": n(w.temporary) - 1});
      await chronicle()?.timed?.endFor?.(actor, {key: "wodx-after-habits", why: "Shaken off for a Willpower"});
      b.disabled = true;
    });
  });
}

function allEffects() {
  const out = [];
  for ( const a of game.actors ?? [] ) out.push(...(a.effects ?? []));
  for ( const t of canvas?.scene?.tokens ?? [] ) if ( !t.actorLink && t.actor ) out.push(...(t.actor.effects ?? []));
  return out;
}
