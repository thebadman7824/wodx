/**
 * WoDX Combat 3.12.0: the Foundry side of movement-rules.js. Ways of moving on Foundry's movement actions (who may
 * choose Fly, Through walls, Into the ground), deep and shallow water regions with held breath and drowning in a
 * fight, a fall when flight ends over open air, and Earth Meld hiding the token. Setting "movementModes".
 *
 * 3.20.0: the mount or vehicle a token is on (read from WoDX Interactables) sets the pace of the one at the reins,
 * gives the saddle and the vehicle their own stances and a rider's charge its dice; worn armor and a burden set on
 * the token's HUD slow a swimmer or take them under.
 */
import * as MV from "./movement-rules.js";

let D = null;
const on = () => { try { return !D.off() && game.settings.get(D.MOD, "movementModes"); } catch (e) { return false; } };
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
const strip = s => String(s ?? "").replace(/<[^>]+>/g, " ");

/** An actor's tokens: the token of an unlinked (synthetic) actor, else its active tokens, as documents. */
export function tokensOf(actor) {
  if ( !actor ) return [];
  if ( actor.isToken && actor.token ) return [actor.token];
  const out = (actor.getActiveTokens?.(false, true) ?? []).map(t => t.document ?? t);
  if ( !out.length ) for ( const t of globalThis.canvas?.scene?.tokens ?? [] ) if ( t.actorId === actor.id ) out.push(t);
  return out;
}
const docOf = t => (t?.documentName === "Token" ? t : (t?.document ?? t));

/** The live effects of an actor, in the shape movement-rules reads. */
export function effectsOf(actor) {
  return [...(actor?.effects ?? [])].filter(e => !e.disabled).map(e => ({name: e.name ?? "", description: strip(e.description), key: e.flags?.["wodx-chronicle"]?.timed?.key ?? null}));
}
/** What this actor may do: flight, walls, water. */
export const abilitiesOf = actor => {
  const ab = MV.abilities(effectsOf(actor), actor?.flags?.[D?.MOD ?? "wodx-combat"]?.moves ?? {});
  // The body plan (3.13.0): wings fly, gills breathe water, mist floats, whatever the power is called
  let body = null;
  try { body = globalThis.game?.wodxCombat?.body?.of?.(actor) ?? null; } catch (e) { body = null; }
  if ( body ) {
    for ( const [k, v] of Object.entries(body.moves ?? {}) ) if ( v && !ab[k] ) { ab[k] = true; ab.why[k] ??= body.label; }
  }
  return ab;
};

/** The mount or vehicle a token is on, as WoDX Interactables tells it (movement-rules rideMove), or null. */
export function rideOf(tok) {
  const doc = docOf(tok);
  if ( !doc ) return null;
  try {
    const ix = game.modules.get("wodx-interactables");
    return (ix?.active ? ix.api?.rideOf?.(doc) : null) ?? null;
  } catch (e) { return null; }
}
/** What weighs on a swimmer: worn armor's Dexterity penalty and the burden set on the character (movement-rules swimLoad). */
export function loadOf(actor) {
  if ( !actor ) return MV.swimLoad();
  const ab = abilitiesOf(actor);
  // A shape of mist or a spirit carries nothing
  if ( ab.phase ) return MV.swimLoad();
  let potence = 0;
  try { potence = Number(D.discipline?.(actor, "Potence")) || 0; } catch (e) { potence = 0; }
  return MV.swimLoad({armorPenalty: D.armorPenalty?.(actor) ?? 0, burden: actor.getFlag?.(D.MOD, "load") ?? actor.flags?.[D.MOD]?.load ?? 0,
    strength: D.attr(actor, "strength"), potence});
}

/** The regions holding a point on a scene. */
function regionsAt(scene, p, elevation = 0) {
  return [...(scene?.regions ?? [])].filter(r => {
    try { return !!r.testPoint({x: p.x, y: p.y, elevation}); } catch (e) { try { return !!r.object?.testPoint?.({x: p.x, y: p.y}, elevation); } catch (e2) { return false; } }
  });
}
const centreOf = (doc, x = doc.x, y = doc.y) => {
  const size = doc.parent?.grid?.size ?? globalThis.canvas?.grid?.size ?? 100;
  return {x: x + (Number(doc.width) || 1) * size / 2, y: y + (Number(doc.height) || 1) * size / 2};
};
/** The water at a token's place: {kind: "deep"|"shallow", region} or null. */
export function waterAt(doc, x = doc.x, y = doc.y) {
  for ( const r of regionsAt(doc.parent, centreOf(doc, x, y), Number(doc.elevation) || 0) ) {
    const kind = MV.waterOf(r.name, r.flags?.[D.MOD]?.water ?? null);
    if ( kind ) return {kind, region: r};
  }
  return null;
}
/** The ground under a token: the highest region floor it stands in, else 0. */
export function groundAt(doc) {
  const rs = regionsAt(doc.parent, centreOf(doc), Number(doc.elevation) || 0).filter(r => !MV.waterOf(r.name, r.flags?.[D.MOD]?.water ?? null));
  return MV.groundOf(rs.map(r => r.elevation?.bottom));
}
const unitsOf = doc => doc?.parent?.grid?.units ?? globalThis.canvas?.scene?.grid?.units ?? "ft";

/* ------------------------------------------------------------------ */
/*  Movement actions                                                   */
/* ------------------------------------------------------------------ */

function configureActions() {
  const A = CONFIG.Token?.movement?.actions;
  if ( !A ) return;
  const gate = key => token => {
    const doc = token?.document ?? token, actor = doc?.actor;
    if ( !on() || !actor || game.user.isGM ) return true;
    return MV.canUse(key, abilitiesOf(actor), {athletics: D.ability(actor, "athletics")}).ok;
  };
  for ( const key of ["fly", "burrow"] ) {
    if ( !A[key] ) continue;
    const orig = A[key].canSelect, mine = gate(key);
    A[key].canSelect = function(token) { return mine(token) && (orig ? orig.call(this, token) !== false : true); };
  }
  if ( !A.phase ) {
    const like = A.walk ?? {};
    A.phase = {...like, label: MV.MODES.phase.label, icon: MV.MODES.phase.icon, order: (Number(like.order) || 0) + 50, teleport: false, walls: null,
      canSelect: gate("phase")};
  }
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

function card(actor, title, body, {gmOnly = false} = {}) {
  const whisper = gmOnly ? game.users.filter(u => u.isGM).map(u => u.id)
    : game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  return ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper,
    content: `<div class="wodx-combat-card"><h3>${D.esc(title)}</h3>${body}</div>`, flags: {[D.MOD]: {movement: true}}});
}

/* ------------------------------------------------------------------ */
/*  Water                                                              */
/* ------------------------------------------------------------------ */

function breathOf(actor, exerting) {
  return MV.breathTurns(D.attr(actor, "stamina"), {exerting});
}
async function enterWater(doc, w) {
  const actor = doc.actor;
  if ( !actor ) return;
  const ab = abilitiesOf(actor), athletics = D.ability(actor, "athletics");
  const breathes = MV.breathes(D.getKind(actor), D.variant(actor));
  const load = ab.waterwalk ? MV.swimLoad() : loadOf(actor);
  const fight = !!game.combat?.started && game.combat.combatants?.some?.(c => c.tokenId === doc.id);
  const max = breathOf(actor, fight);
  await doc.setFlag(D.MOD, "water", {kind: w.kind, region: w.region.id, breath: max, max});
  if ( w.kind !== "deep" ) return;
  const lines = [];
  if ( ab.waterwalk ) lines.push("Walks on the water.");
  else if ( load.sinks && !breathes ) lines.push("Does not breathe and cannot drown, but carries too much to swim: they sink, and walk the bottom until they let something go.");
  else if ( load.sinks ) lines.push(`Carries too much to swim (${load.parts.join(", ")}): goes under. ${ab.waterbreath ? "Breathes the water, so there is no hurry." : `Breath lasts ${max} turns, then one ${MV.drownType(D.getKind(actor))} level a turn, not soaked (W20 pdf 261, M20 pdf 441).`} Letting the load go, or a turn spent out of the armor, lets them swim (house rule).`);
  else if ( !breathes ) lines.push("Does not breathe: sinks or swims as they like, and cannot drown.");
  else if ( ab.waterbreath ) lines.push("Breathes the water.");
  else if ( athletics < 1 && !ab.swimfast ) lines.push(`Cannot swim (no Athletics): goes under. Breath lasts ${max} turns, then one ${MV.drownType(D.getKind(actor))} level a turn, not soaked (W20 pdf 261, M20 pdf 441). A Stamina + Athletics roll at 8 brings the head up for a turn (house rule).`);
  else lines.push(`Swims. After the first hour, Swimming (Stamina + Athletics) each hour, one success needed (V20 pdf 270). Under the surface, breath lasts ${max} turns${fight ? " while fighting" : ""}.`);
  if ( load.steps && !load.sinks && !ab.waterwalk ) lines.push(`${load.note.charAt(0).toUpperCase()}${load.note.slice(1)} (house rule).`);
  await card(actor, `${doc.name} is in deep water`, `<p>${lines.join(" ")}</p>`);
}

Hooks.on("updateToken", (doc, changes, options) => {
  if ( !D || !on() || !isActiveGM() || !doc.actor ) return;
  if ( !("x" in changes || "y" in changes || "elevation" in changes) ) return;
  const w = waterAt(doc), had = doc.getFlag(D.MOD, "water");
  if ( w && (!had || had.region !== w.region.id) ) enterWater(doc, w).catch(e => console.warn("WoDX | water", e));
  else if ( !w && had ) doc.unsetFlag(D.MOD, "water").catch(() => null);
});

// Each new round of a fight: breath runs out for those under the water, then one level a turn
Hooks.on("updateCombat", (combat, changed) => {
  if ( !D || !on() || !isActiveGM() || !("round" in (changed ?? {})) || !combat.started ) return;
  (async () => {
    for ( const c of combat.combatants ) {
      const doc = c.token, actor = c.actor;
      const st = doc?.getFlag?.(D.MOD, "water");
      if ( !st || st.kind !== "deep" || !actor ) continue;
      const ab = abilitiesOf(actor);
      const w = waterAt(doc);
      const top = Number(w?.region?.elevation?.top);
      const dived = (Number(doc.elevation) || 0) < (Number.isFinite(top) ? top : 0);
      const under = MV.underWater({athletics: D.ability(actor, "athletics"), dived, ab, load: ab.waterwalk ? null : loadOf(actor)});
      const next = MV.waterTurn(st, {under, breathes: MV.breathes(D.getKind(actor), D.variant(actor)), waterbreath: ab.waterbreath});
      await doc.setFlag(D.MOD, "water", {...st, breath: next.breath, max: next.max});
      if ( next.damage ) {
        const type = MV.drownType(D.getKind(actor));
        await D.applyDamage(actor, type, next.damage);
        await card(actor, `${doc.name} is drowning`, `<p>One ${type} level, not rolled and not soaked (W20 pdf 261, M20 pdf 441${type === "bashing" ? ", C20 pdf 294" : ""}). It stops when they reach air.</p>`);
      } else if ( under && next.breath <= 3 ) await card(actor, `${doc.name} is running out of breath`, `<p>${D.esc(next.note)}.</p>`);
    }
  })().catch(e => console.warn("WoDX | drowning", e));
});

/* ------------------------------------------------------------------ */
/*  Flight ending, Earth Meld                                          */
/* ------------------------------------------------------------------ */

async function landOrFall(actor) {
  const ab = abilitiesOf(actor);
  for ( const doc of tokensOf(actor) ) {
    const ground = groundAt(doc);
    const r = MV.fallOnLanding(doc.elevation, ground, ab, unitsOf(doc));
    if ( !r.falls ) continue;
    await doc.update({elevation: ground, ...(doc.movementAction === "fly" ? {movementAction: "walk"} : {})}, {wodxMove: false});
    const w = waterAt(doc);
    if ( w?.kind === "deep" ) { await card(actor, `${doc.name} falls into the water`, `<p>A drop of ${r.feet} feet into deep water: no falling damage (house rule).</p>`); continue; }
    const f = MV.fallingDamage(r.feet);
    await card(actor, `${doc.name} falls ${r.feet} feet`, `<p>The flight ends in the air. ${f.dice} dice of ${f.type} damage${f.halfArmor ? ", armor counts half" : ""} (VtDA20 p. 355).</p>
      <button type="button" data-wodx-fall="${actor.uuid}" data-feet="${r.feet}"><i class="fa-solid fa-person-falling"></i> Roll the fall</button>`, {gmOnly: true});
  }
}

Hooks.on("deleteActiveEffect", (effect, options) => {
  if ( !D || !on() || !isActiveGM() || options?.wodxUndo ) return;
  const actor = effect.parent;
  if ( !(actor instanceof Actor) ) return;
  const one = MV.abilities(effectsOf({effects: [effect]}));
  if ( one.fly ) landOrFall(actor).catch(e => console.warn("WoDX | fall", e));
  if ( one.meld ) for ( const doc of tokensOf(actor) ) {
    if ( doc.getFlag(D.MOD, "melded") ) doc.update({hidden: !!doc.getFlag(D.MOD, "melded").wasHidden, [`flags.${D.MOD}.-=melded`]: null}).catch(() => null);
  }
});
Hooks.on("createActiveEffect", effect => {
  if ( !D || !on() || !isActiveGM() ) return;
  const actor = effect.parent;
  if ( !(actor instanceof Actor) ) return;
  const one = MV.abilities(effectsOf({effects: [effect]}));
  // A flight power sets the token's way of moving to Fly, so the ruler and the HUD lift it
  if ( one.fly ) for ( const doc of tokensOf(actor) ) if ( "movementAction" in doc && doc.movementAction !== "fly" ) doc.update({movementAction: "fly"}).catch(() => null);
  if ( !one.meld ) return;
  for ( const doc of tokensOf(actor) ) {
    doc.update({hidden: true, [`flags.${D.MOD}.melded`]: {wasHidden: !!doc.hidden}}).catch(() => null);
  }
});

Hooks.on("renderChatMessageHTML", (msg, el) => {
  if ( !msg.getFlag?.(D?.MOD ?? "wodx-combat", "movement") ) return;
  el.querySelectorAll?.("[data-wodx-fall]").forEach(b => b.addEventListener("click", ev => {
    ev.preventDefault();
    const actor = fromUuidSync(b.dataset.wodxFall);
    const hz = game.wodxActions?.hazard;
    if ( !actor || !hz ) return ui.notifications.warn("WoDX Actions is needed to roll the fall.");
    hz({actor, kind: "fall", feet: Number(b.dataset.feet) || 10});
  }));
});

// A player's token may not take a way of moving it has no power for, nor rise off the ground without one (any time)
Hooks.on("preUpdateToken", (doc, changes, options) => {
  if ( !D || !on() || game.user.isGM || options?.wodxMove === false || !doc.actor ) return;
  if ( !("x" in changes || "y" in changes || "elevation" in changes) ) return;
  const r = moveCheck(doc, changes, D.movementFor(doc.actor));
  if ( !r.refuse ) return;
  ui.notifications.warn(`${doc.name} cannot move that way: ${r.refuse}.`);
  return false;
});

/* ------------------------------------------------------------------ */
/*  For the movement count in main.js                                  */
/* ------------------------------------------------------------------ */

/**
 * One move: the way of moving, its limit and whether it may happen. doc: the token; changes: the update.
 * {mode, limit (null: walk/jog/run paces), cost (distance multiplier), refuse (why, or ""), jumped}
 */
export function moveCheck(doc, changes, base) {
  const actor = doc.actor;
  if ( !on() || !actor ) return {mode: "walk", limit: null, cost: 1, refuse: ""};
  const mode = MV.modeOf(changes.movementAction ?? doc.movementAction ?? "walk");
  const ab = abilitiesOf(actor), athletics = D.ability(actor, "athletics");
  const jump = actor.getFlag?.(D.MOD, "jump");
  const use = MV.canUse(mode, ab, {athletics, gm: game.user.isGM});
  if ( !use.ok ) return {mode, limit: 0, cost: 1, refuse: use.why};
  // Going up without flight, a climb or a jump
  const rise = (Number(changes.elevation ?? doc.elevation) || 0) - (Number(doc.elevation) || 0);
  if ( rise > 0 && !game.user.isGM && !["fly", "climb", "jump"].includes(mode) && !ab.fly ) return {mode, limit: 0, cost: 1, refuse: "rising off the ground needs flight, a climb or a jump"};
  if ( mode === "jump" && rise > 0 && !game.user.isGM && !ab.fly && MV.toFeet(rise, unitsOf(doc)) > (Number(jump?.upFeet) || 0) * (ab.leap ? 2 : 1) + 0.5 )
    return {mode, limit: 0, cost: 1, refuse: `the last Jumping roll reaches ${Math.round((Number(jump?.upFeet) || 0) * (ab.leap ? 2 : 1))} feet up`};
  // 3.20.0: at the reins, the mount's pace; a passenger is carried (WoDX Interactables moves them without counting)
  const ride = rideOf(doc);
  if ( ride?.role === "reins" ) {
    const r = MV.rideMove(ride, {skill: D.ability(actor, ride.skill ?? "ride")});
    return {mode: "ride", limit: r.limit, cost: 1, refuse: "", ride, note: r.note};
  }
  const w = waterAt(doc, changes.x ?? doc.x, changes.y ?? doc.y);
  const inWater = w?.kind === "deep" && !ab.waterwalk && mode !== "fly";
  const m = inWater ? "swim" : mode;
  const load = inWater ? loadOf(actor) : null;
  const limit = m === "walk" ? null : MV.speedFor(m, base, ab, {athletics, jumpYards: Number(jump?.yards) || 0, load});
  return {mode: m, limit, cost: w?.kind === "shallow" && mode !== "fly" ? MV.SHALLOW_COST : 1, refuse: "", jumped: mode === "jump",
    note: load?.steps ? (load.sinks ? "too much weight to swim" : "weighed down") : ""};
}

/* ------------------------------------------------------------------ */
/*  Stances: what the way of moving does to rolls                      */
/* ------------------------------------------------------------------ */

const tokenOf = actor => {
  const toks = tokensOf(actor);
  const sid = globalThis.canvas?.scene?.id;
  return toks.find(t => (t.parent?.id ?? t.document?.parent?.id) === sid) ?? toks[0] ?? null;
};
/** The stance of an actor's token on the scene (movement-rules stanceOf). */
export function stanceOfActor(actor, tok = null) {
  if ( !on() || !actor ) return "standing";
  const doc = (tok ? docOf(tok) : null) ?? tokenOf(actor);
  const ab = abilitiesOf(actor);
  let knockedDown = false;
  try { knockedDown = !!game.modules.get("wodx-chronicle")?.api?.conditions?.hasCondition?.(actor, "knockdown"); } catch (e) { /* no Chronicle */ }
  if ( !doc ) return MV.stanceOf({knockedDown, ab});
  const w = waterAt(doc), top = Number(w?.region?.elevation?.top), elev = Number(doc.elevation) || 0;
  const moved = doc.getFlag?.(D.MOD, "moved"), c = game.combat;
  const tag = c?.started ? `${c.id}:${c.round}` : null;
  return MV.stanceOf({mode: doc.movementAction ?? "walk", knockedDown, water: w?.kind ?? null, ab, ride: rideOf(doc),
    under: !!w && w.kind === "deep" && (elev < (Number.isFinite(top) ? top : 0) || MV.underWater({athletics: D.ability(actor, "athletics"), ab, load: ab.waterwalk ? null : loadOf(actor)})),
    aloft: elev > groundAt(doc) + 0.5, jumped: !!tag && moved?.tag === tag && !!moved?.jumped});
}
/** An attack's changes from both stances: {diff, notes, blocked}. */
export function attackMods(attacker, target, {attackerTok = null, targetTok = null} = {}) {
  if ( !on() || !attacker || !target ) return {diff: 0, notes: [], blocked: ""};
  const at = (attackerTok ? docOf(attackerTok) : null) ?? tokenOf(attacker), tt = (targetTok ? docOf(targetTok) : null) ?? tokenOf(target);
  const sa = stanceOfActor(attacker, at), st = stanceOfActor(target, tt);
  let close = true, higher = false;
  try {
    if ( at?.object && tt?.object && globalThis.canvas?.grid ) {
      const flat = canvas.grid.measurePath([at.object.center, tt.object.center]).distance;
      const unit = canvas.scene?.grid?.distance ?? 5;
      const sz = t => Number(t?.width) || 1;
      const reach = Math.max(0, Math.hypot(flat, heightBetween(at, tt)) - ((sz(at) + sz(tt)) / 2 - 1) * unit);
      close = reach <= unit * 1.5;
      higher = MV.toFeet((Number(at.elevation) || 0) - (Number(tt.elevation) || 0), unitsOf(at)) >= 3;
    }
  } catch (e) { /* no canvas */ }
  const out = MV.attackStance(sa, st, {close, higher, sameStance: sa === st, attackerFly: abilitiesOf(attacker).flyBook, targetFly: abilitiesOf(target).flyBook});
  // 3.20.0: a load in the water spoils the blow as it spoils the footing
  if ( close && ["swimming", "under"].includes(sa) ) {
    const load = loadOf(attacker);
    if ( load.diff ) { out.diff += load.diff; out.notes.push(`Weighed down in the water: +${load.diff} difficulty`); }
  }
  return out;
}
/** A rider's charge: extra damage dice on a hand-to-hand blow from the yards ridden this turn (movement-rules chargeDice). */
export function chargeOf(attacker, {ranged = false, attackerTok = null} = {}) {
  if ( !on() || !attacker ) return {dice: 0, note: ""};
  const doc = (attackerTok ? docOf(attackerTok) : null) ?? tokenOf(attacker);
  const ride = rideOf(doc);
  if ( !ride ) return {dice: 0, note: ""};
  const moved = doc?.getFlag?.(D.MOD, "moved"), c = game.combat;
  const tag = c?.started ? `${c.id}:${c.round}` : null;
  const yards = tag && moved?.tag === tag ? Number(moved.yards) || 0 : 0;
  const dice = MV.chargeDice(ride, yards, {ranged});
  return {dice, yards, note: dice ? `Mounted charge: ${Math.round(yards)} yards ridden this turn, +${dice} damage ${dice === 1 ? "die" : "dice"} (V20 Dark Ages p. 398, read for a map: house rule)` : ""};
}
/** The defender's own stance on a dodge: a difficulty change and its note. */
export function defenseMods(target) {
  const st = stanceOfActor(target), r = MV.rollStance(st, ["dodge"], {load: ["swimming", "under"].includes(st) ? loadOf(target) : null});
  return {diff: r.diff, notes: r.parts.map(p => `${target?.name ?? "Target"}: ${p} on a dodge`), stance: st};
}
/** A plain roll's changes: kinds from the roll's pool (stealth, perception, dexterity). */
export function rollMods(actor, kinds = []) {
  if ( !on() ) return {diff: 0, parts: []};
  const st = stanceOfActor(actor);
  return MV.rollStance(st, kinds, {load: ["swimming", "under"].includes(st) ? loadOf(actor) : null});
}
/** Noticing this actor: the observer's difficulty change. */
export const spotMod = actor => (on() ? MV.spotStance(stanceOfActor(actor)) : 0);

/** Range and reach with height: flat distance plus the height between two tokens, in scene units. */
export function heightBetween(a, b) {
  const ea = Number(docOf(a)?.elevation) || 0, eb = Number(docOf(b)?.elevation) || 0;
  return on() ? eb - ea : 0;
}

/* ------------------------------------------------------------------ */
/*  What they carry (3.20.0)                                           */
/* ------------------------------------------------------------------ */

/** Set the burden on a character (0 to 3, movement-rules BURDENS). Owners and the Storyteller. */
export async function setBurden(actor, n) {
  if ( !actor?.isOwner ) return null;
  const b = MV.burdenOf(n);
  if ( b.id ) await actor.setFlag(D.MOD, "load", b.id); else await actor.unsetFlag(D.MOD, "load");
  return b;
}
/** The window: what the character carries, and what it does in the water. */
export async function burdenDialog(actor) {
  if ( !actor?.isOwner || !D.ask ) return null;
  const cur = MV.burdenOf(actor.getFlag(D.MOD, "load")).id;
  const pen = D.armorPenalty?.(actor) ?? 0;
  const rows = MV.BURDENS.map(b => `<label class="vtc-burden"><input type="radio" name="burden" value="${b.id}"${b.id === cur ? " checked" : ""}> <b>${D.esc(b.label)}</b> <span class="hint">${D.esc(b.hint)}</span></label>`).join("");
  const r = await D.ask({title: `What ${actor.name} carries`, width: 440,
    content: `<form><p>Weight matters in deep water. Each step takes a quarter off the swimming speed and adds 1 to the difficulty of rolls made in the water; four steps and there is no swimming at all. Worn armor counts by its Dexterity penalty (now ${pen}); Strength and Potence of 4 or more take a step off. A house rule.</p>
      <div class="vtc-burdens" data-fixed>${rows}</div></form>`,
    buttons: [{id: "ok", label: "Set", icon: "fa-solid fa-check", default: true}, {id: "cancel", label: "Cancel"}]});
  if ( r?.id !== "ok" ) return null;
  return setBurden(actor, Number(r.data?.burden) || 0);
}
Hooks.on("renderTokenHUD", (hud, html) => {
  if ( !D || !on() ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const tok = hud.object, actor = tok?.actor;
  const col = root?.querySelector?.(".col.left");
  if ( !actor?.isOwner || !col ) return;
  const cur = MV.burdenOf(actor.getFlag(D.MOD, "load"));
  const btn = document.createElement("div");
  btn.className = `control-icon vtc-hud vtc-burden-btn${cur.id ? " active" : ""}`;
  btn.title = `What they carry: ${cur.label.toLowerCase()} (weight slows a swimmer)`;
  btn.setAttribute("role", "button");
  btn.setAttribute("aria-label", "What they carry");
  btn.innerHTML = '<i class="fa-solid fa-weight-hanging" aria-hidden="true"></i>';
  btn.addEventListener("click", () => burdenDialog(actor));
  col.appendChild(btn);
});

export function setupMovement(deps) {
  D = deps;
  game.settings.register(D.MOD, "movementModes", {
    name: "Flying, swimming, climbing and other ways of moving",
    hint: "Fly, Through walls and Into the ground only for those with a power or form that grants it; speeds for each way of moving in a fight, the mount's own pace for whoever holds the reins; deep and shallow water regions (name a region \"WoDX: Deep water\", a river or a lake), with breath and drowning in a fight; a fall when flight ends in the air; Earth Meld hides the token; height counts in range and reach; worn armor and a burden slow a swimmer. Most speeds are house rules.",
    scope: "world", config: true, type: Boolean, default: true
  });
  try { configureActions(); } catch (e) { console.warn("WoDX | movement actions", e); }
  return {abilitiesOf, tokensOf, waterAt, groundAt, moveCheck, heightBetween, stanceOf: stanceOfActor, attackMods, defenseMods, rollMods, spotMod,
    rideOf, loadOf, chargeOf, setBurden, burdenDialog, rules: MV};
}
