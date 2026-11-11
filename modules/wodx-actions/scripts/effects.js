/**
 * WoDX Actions 3.22.0: magic that applies itself, in Foundry. The Mage 20th Cast window gets effect keywords and a
 * spend plan; after the roll the card says what each keyword does to each target, and the active Storyteller's
 * client applies what may apply on its own (health, Quintessence, timed effects, light, height, conditions), with
 * one Undo button. What needs a yes goes to the approval queue; what is the Storyteller's call is listed for them.
 * World setting "Magic that applies itself": Automatic (on, except in the Live world), On, Off. Rules: effects-rules.js.
 */
import * as E from "./effects-rules.js";

const MOD = "wodx-actions";
const TYPE = "wodx-actions.effect";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LIVE_WORLDS = ["rothenstein-live"];
const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const combat = () => game.modules.get("wodx-combat")?.api ?? null;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;

export function isOn() {
  let mode = "auto";
  try { mode = game.settings.get(MOD, "effectsApply"); } catch (e) { /* not registered */ }
  return mode === "on" || (mode !== "off" && !isLive());
}

/* ------------------------------------------------------------------ */
/*  The Cast window                                                    */
/* ------------------------------------------------------------------ */

/** The keyword part of the Cast window. known: the caster's Spheres. */
export function fieldset(known = {}) {
  const box = ([k, K]) => {
    const can = E.spheresFor([k], known).missing.length === 0;
    return `<label class="wodx-kw${can ? "" : " wodx-kw-off"}" title="${esc(K.does)}"><input type="checkbox" name="kw-${k}"${can ? "" : " disabled"}/> ${esc(K.label)}</label>`;
  };
  return `<fieldset class="wodx-keywords"><legend>What the Effect does (keywords)</legend>
    <div class="wodx-kw-list" data-fixed>${Object.entries(E.KEYWORDS).map(box).join("")}</div>
    <p class="hint">Each keyword fills in the Spheres it needs. Each one past the first needs one more success (house rule); an Effect on someone else needs at least two (Mage 20th p. 502).</p>
    <div class="form-group"><label>Extra targets</label><input type="number" name="kw-targets" min="0" max="10" value="0"/></div>
    <div class="form-group"><label>Duration steps (a turn, a scene, a day, a story, six months)</label><input type="number" name="kw-duration" min="0" max="4" value="0"/></div>
    <div class="form-group"><label>Options</label><div class="form-fields wodx-kw-opts" data-fixed>
      <label><input type="checkbox" name="kw-fire"/> Fire or lightning</label>
      <label><input type="checkbox" name="kw-prime"/> Charged with Prime 2 and a Quintessence</label>
      <label><input type="checkbox" name="kw-curse"/> Fortune as a curse</label>
      <label><input type="checkbox" name="kw-slow"/> Slow, not hasten</label>
      <label><input type="checkbox" name="kw-dark"/> Darkness, not light</label>
      <label><input type="checkbox" name="kw-drain"/> Drain, not charge</label>
      <label><input type="checkbox" name="kw-agg"/> Mend aggravated wounds</label></div></div></fieldset>`;
}

/** Ticking a keyword raises the Sphere choices to what it needs. */
export function wire(root, known = {}) {
  const sync = () => {
    const ks = Object.keys(E.KEYWORDS).filter(k => root.querySelector(`[name="kw-${k}"]`)?.checked);
    const self = !game.user.targets?.size;
    const {used} = E.spheresFor(ks, known, {self});
    for ( const {sphere, level} of used ) {
      const sel = root.querySelector(`[name="s-${sphere}"]`);
      if ( sel && n(sel.value) < level ) sel.value = String(level);
    }
    if ( ks.length ) {
      const kind = root.querySelector('[name="kind"]');
      if ( kind && kind.dataset.wodxTouched !== "1" ) kind.value = E.leanOf(ks) === "vulgar" && kind.value === "coincidental" ? "vulgar" : kind.value;
    }
  };
  root.querySelector('[name="kind"]')?.addEventListener("change", e => { e.currentTarget.dataset.wodxTouched = "1"; });
  for ( const k of Object.keys(E.KEYWORDS) ) root.querySelector(`[name="kw-${k}"]`)?.addEventListener("change", sync);
}

/** What the form asks for. */
export function read(fd) {
  const keywords = Object.keys(E.KEYWORDS).filter(k => fd[`kw-${k}`]);
  return {keywords, plan: {targets: n(fd["kw-targets"]), duration: n(fd["kw-duration"])},
    ctx: {fire: !!fd["kw-fire"], primeCharged: !!fd["kw-prime"], curse: !!fd["kw-curse"], slow: !!fd["kw-slow"], dark: !!fd["kw-dark"], drain: !!fd["kw-drain"], aggravated: !!fd["kw-agg"]}};
}

/** The targets: the user's targets, else the caster's own token (or the actor). */
export function targetsOf(actor) {
  const own = actor?.getActiveTokens?.()?.[0]?.document ?? null;
  const list = [...(game.user.targets ?? [])].map(t => t.document).filter(t => t && t.actorId !== actor?.id);
  return list.length ? {self: false, docs: list} : {self: true, docs: [own ?? actor]};
}

/**
 * Turn a roll into the card's items. Returns {items, html, base, need}. items: [{key, out, target, name, route}].
 */
export function plan(actor, form, successes, {used = [], witnessed = false, feat = 0} = {}) {
  const t = targetsOf(actor);
  const base = E.needFor(form.keywords, {self: t.self, feat});
  const got = E.spend(successes, base, form.plan);
  const spheres = used.map(x => x.sphere);
  const items = [];
  const docs = t.docs.slice(0, 1 + got.targets);
  for ( const key of form.keywords ) {
    const out = E.outcome(key, got, {...form.ctx, spheres});
    if ( !out ) continue;
    for ( const d of docs ) {
      const a = d?.actor ?? d;
      const pc = !!a?.hasPlayerOwner;
      const route = isOn() ? E.route(key, {self: t.self, playerCharacter: pc, count: docs.length, witnessed, need: base}, out) : "off";
      items.push({key, out, target: d?.uuid ?? null, name: d?.name ?? a?.name ?? "", route});
    }
  }
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply"};
  const html = !got.ok ? "" : `<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
    `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(i.out.text)}. <span class="wodx-quiet">It ${word[i.route]}.</span></li>`).join("")}</ul>
    ${got.dropped.length ? `<div class="vta-note">Too few successes for ${esc(got.dropped.join(" and "))}.</div>` : ""}</div>`;
  return {items, html, base, need: base + n(form.plan.targets) + n(form.plan.duration), got};
}

/* ------------------------------------------------------------------ */
/*  Applying and taking back                                           */
/* ------------------------------------------------------------------ */

const docOf = uuid => { try { return uuid ? fromUuidSync(uuid) : null; } catch (e) { return null; } };
const actorOf = d => d?.actor ?? (d?.documentName === "Actor" ? d : null);
const tokenOf = d => (d?.documentName === "Token" ? d : actorOf(d)?.getActiveTokens?.()?.[0]?.document ?? null);

/** Apply one item. Returns an undo record, or {note} when nothing could change. */
export async function applyItem(item, casterName = "the caster") {
  const d = docOf(item.target), a = actorOf(d), o = item.out;
  if ( !a ) return {note: `${item.name}: not found`};
  const C = combat(), T = chron();
  const health = foundry.utils.deepClone(a.system?.health?.damage ?? {});
  switch ( o.kind ) {
    case "damage":
      if ( !C ) return {note: "WoDX Combat is off: apply the damage by hand"};
      await C.soakAndApply(tokenOf(d)?.object ?? a, {mode: "levels", amount: o.levels, type: o.type, soak: o.soak});
      return {uuid: a.uuid, health};
    case "heal": {
      if ( !C ) return {note: "WoDX Combat is off: heal by hand"};
      let left = o.levels;
      for ( const type of o.aggravated ? ["aggravated"] : ["lethal", "bashing"] ) {
        const has = n(a.system?.health?.damage?.[type]);
        const take = Math.min(has, left);
        if ( take > 0 ) { await C.healDamage(a, type, take); left -= take; }
      }
      return {uuid: a.uuid, health};
    }
    case "quint": {
      const q = n(a.system?.quintessence?.temporary);
      await a.update({"system.quintessence.temporary": Math.max(0, q + o.points)});
      return {uuid: a.uuid, quint: q};
    }
    case "timed": case "condition": {
      if ( !T?.applyTimed || !o.timed ) return {note: "WoDX Chronicle is off: note the effect by hand"};
      const changes = [];
      const tok = tokenOf(d);
      const tokenWas = tok ? {uuid: tok.uuid, elevation: tok.elevation, sight: foundry.utils.deepClone(tok.sight ?? {})} : null;
      const effect = await T.applyTimed(a, {name: o.name ?? o.label, description: `${o.text} (cast by ${casterName})`, duration: o.timed, condition: o.condition,
        changes, key: `wodx-effect-${o.key}`, source: "Mage 20th pp. 502-504"});
      if ( tok && o.feet ) await tok.update({elevation: n(tok.elevation) + o.feet});
      if ( tok && o.vision ) await tok.update({"sight.visionMode": "darkvision", "sight.range": Math.max(n(tok.sight?.range), 30)});
      return {uuid: a.uuid, effect: effect?.uuid ?? null, token: tok && (o.feet || o.vision) ? tokenWas : null};
    }
    case "light": {
      const tok = tokenOf(d);
      if ( !tok ) return {note: "no token on the scene for the light"};
      const was = foundry.utils.deepClone(tok.light ?? {});
      await tok.update(o.dark ? {"light.negative": true, "light.dim": 20, "light.bright": 10} : {"light.negative": false, "light.dim": 30, "light.bright": 15, "light.color": "#ffd9a0"});
      return {token: {uuid: tok.uuid, light: was}};
    }
    default:
      return {note: `${o.label}: ${o.text}`};
  }
}

/** Take back what a card applied. */
export async function undo(records = []) {
  const C = combat();
  for ( const r of [...records].reverse() ) {
    try {
      const a = r.uuid ? fromUuidSync(r.uuid) : null;
      if ( r.health && a && C?.setDamage ) await C.setDamage(a, r.health);
      if ( Number.isFinite(r.quint) && a ) await a.update({"system.quintessence.temporary": r.quint});
      if ( r.effect ) await fromUuidSync(r.effect)?.delete?.();
      if ( r.token ) {
        const tok = fromUuidSync(r.token.uuid);
        const back = {};
        if ( "elevation" in r.token ) back.elevation = r.token.elevation;
        if ( r.token.sight ) back.sight = r.token.sight;
        if ( r.token.light ) back.light = r.token.light;
        if ( tok ) await tok.update(back);
      }
    } catch (e) { console.warn("WoDX | effect undo", e); }
  }
}

/** The active Storyteller applies a new card's automatic items and sends the queued ones on. */
async function onCard(msg) {
  const data = msg.flags?.[MOD];
  if ( data?.kind !== "effects" || data.done || !isActiveGM() ) return;
  const records = [], notes = [];
  for ( const item of data.items ?? [] ) {
    if ( item.route === "auto" ) {
      const r = await applyItem(item, data.caster);
      if ( r?.note ) notes.push(r.note); else if ( r ) records.push(r);
    } else if ( item.route === "queue" ) {
      await chron()?.propose?.({type: TYPE, title: `${data.caster}: ${item.out.label} on ${item.name}`, detail: item.out.text, data: {item, caster: data.caster}});
    }
  }
  await msg.update({[`flags.${MOD}.done`]: true, [`flags.${MOD}.undo`]: records, [`flags.${MOD}.notes`]: notes});
}

export function setup() {
  game.settings.register(MOD, "effectsApply", {
    name: "Magic that applies itself", hint: "Mage 20th castings with effect keywords change health, Quintessence, timed effects, light and height on their own, with Undo; the rest goes to the approval queue. Automatic: on, except in the Live world.",
    scope: "world", config: true, type: String, default: "auto", choices: {auto: "Automatic", on: "On", off: "Off"}
  });
  Hooks.on("createChatMessage", msg => { onCard(msg).catch(e => console.error("WoDX | effects", e)); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const data = msg.flags?.[MOD];
    if ( data?.kind !== "effects" || !game.user.isGM || !el?.querySelector ) return;
    const box = el.querySelector(".wodx-effects");
    if ( !box ) return;
    if ( data.notes?.length ) box.insertAdjacentHTML("beforeend", `<div class="vta-note">${data.notes.map(esc).join("; ")}.</div>`);
    if ( !data.undo?.length || data.undone ) return;
    box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-undo"><i class="fa-solid fa-rotate-left"></i> Undo what applied</button>`);
    box.querySelector(".wodx-effects-undo").addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      await undo(data.undo);
      await msg.update({[`flags.${MOD}.undone`]: true});
    });
  });
}

/** The approval queue's handler for queued keyword results (called once WoDX Chronicle is ready). */
export function registerHandler(api) {
  api?.registerApprovalHandler?.(TYPE, {label: "Magic that applies itself", approve: async entry => { await applyItem(entry.data?.item, entry.data?.caster); }});
}
