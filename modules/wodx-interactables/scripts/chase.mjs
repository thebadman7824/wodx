/**
 * WoDX Interactables 0.26.0: chases and pursuit on the Storyteller's table (rules in chase-rules.mjs).
 *
 * The Storyteller opens the Chase window from the Storyteller's hand (or game.modules.get("wodx-interactables").api.chase.open()),
 * picks the quarry and the pursuers from the scene's tokens, the ground and the lead, and rolls each turn for everyone.
 * A token at the reins of a mount or vehicle tile starts on it. Players see a card in words (who is gaining, who fell);
 * the Storyteller's copy has the dice and totals, an Undo for the turn, a button for crash damage and, once someone is
 * caught, a button that starts a fight through WoDX Combat. The chase lives in a scene flag, so it survives a reload.
 */
import * as C from "./chase-rules.mjs";
import {countSuccesses, clampDifficulty} from "../../wodx-actions/scripts/core-rules.js";
import {actionPool} from "../../wodx-actions/scripts/rules.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-interactables";
const FLAG = "chase";
const num = v => Number(v) || 0;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const opt = (list, v) => list.map(x => `<option value="${esc(x.id)}"${x.id === v ? " selected" : ""}>${esc(x.label)}</option>`).join("");

let deps = {};

function yearNow() {
  try { return num(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()); } catch (e) { return 0; }
}
const attrOf = (actor, k) => { const a = actor?.system?.attributes?.[k]; return a ? num(a.total ?? a.value) : 0; };

/** {dots, type} of an ability on a sheet, by key (Ride falls back to Animal Ken, as in V20 core). */
export function abilityOf(actor, key) {
  const find = k => {
    const a = actor?.system?.abilities?.[k];
    let best = a && typeof a === "object" ? {dots: num(a.value), type: String(a.type ?? "")} : null;
    for ( const i of actor?.items ?? [] ) {
      if ( i.type !== "Ability" && !(i.type === "Trait" && String(i.system?.type ?? "").includes("secondability")) ) continue;
      const id = String(i.system?.id || i.name || "").trim().toLowerCase();
      if ( id === k && num(i.system?.value) >= (best?.dots ?? 0) ) best = {dots: num(i.system?.value), type: String(i.system?.type ?? "")};
    }
    return best;
  };
  let a = find(key);
  if ( key === "ride" && !(a?.dots > 0) ) a = find("animalken") ?? find("animal ken") ?? a;
  const t = String(a?.type ?? "");
  const type = t.includes("knowledge") ? "knowledge" : t.includes("talent") ? "talent" : key === "athletics" || key === "alertness" ? "talent" : "skill";
  return {dots: a?.dots ?? 0, type};
}

/** The mount or vehicle a token holds the reins of, if any: its Interactables kind. */
function mountOf(tokDoc) {
  for ( const t of tokDoc?.parent?.tiles ?? [] ) {
    const f = t.flags?.[MOD];
    if ( f?.driver?.t === tokDoc.uuid ) { const o = deps.describeObj?.(t); if ( o?.kind ) return o.kind; }
  }
  return null;
}
/** The Garou form a sheet is in (the system's shapes), or "homid". */
const formOf = actor => { const sh = actor?.system?.shapes ?? {}; return ["glabro", "crinos", "hispo", "lupus"].find(k => sh[k]?.isactive) ?? "homid"; };
const runOf = actor => {
  let run = 20 + 3 * attrOf(actor, "dexterity");
  try { const m = game.wodxCombat?.movementFor?.(actor); if ( m && Number.isFinite(m.run) ) run = m.run; } catch (e) { /* WoDX Combat is off */ }
  return C.formRun(run, formOf(actor));
};
const racerOf = (tokDoc, year) => ({id: tokDoc.id, uuid: tokDoc.uuid, actorId: tokDoc.actor?.id ?? "", name: tokDoc.name,
  npc: !tokDoc.actor?.hasPlayerOwner, way: C.wayFromMount(mountOf(tokDoc), year), run: runOf(tokDoc.actor)});

const stateOf = (scene = canvas?.scene) => scene?.getFlag?.(MOD, FLAG) ?? null;
const unsetChase = () => {
  const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
  return Del ? {[`flags.${MOD}.${FLAG}`]: new Del()} : {[`flags.${MOD}.-=${FLAG}`]: null};
};
/** Write the whole state: the old one goes first, so keys a newer turn added (caughtBy) do not linger after an Undo. */
async function save(scene, st) {
  if ( stateOf(scene) ) await scene.update(unsetChase());
  await scene.setFlag(MOD, FLAG, st);
}

/** 0.31.0: a token joins the running chase on the scene as a pursuer (WoDX NPC: a follower with its master). */
export async function join(scene, tokenId, {why = ""} = {}) {
  const st = stateOf(scene), d = scene?.tokens?.get(tokenId);
  if ( !game.user.isGM || !st || !d ) return null;
  const next = C.joinChase(st, racerOf(d, st.year || yearNow()));
  if ( next === st ) return null;
  await save(scene, next);
  await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: card("The chase", `<p>${esc(d.name)} joins the chase${why ? ` (${esc(why)})` : ""}.</p>`)});
  return next;
}

/** Open the chase window: the setup when no chase runs on the scene, else the turn. */
export async function open() {
  if ( !game.user.isGM ) { ui.notifications.warn("Only the Storyteller runs a chase."); return null; }
  const scene = canvas?.scene;
  if ( !scene ) { ui.notifications.warn("Open a scene first."); return null; }
  const st = stateOf(scene);
  return st?.status === "running" ? turnDialog(scene, st) : setupDialog(scene);
}

async function setupDialog(scene) {
  const toks = scene.tokens.contents.filter(t => t.actor);
  if ( toks.length < 2 ) { ui.notifications.warn("A chase needs at least two tokens on the scene."); return null; }
  const sel = (canvas.tokens?.controlled ?? []).map(t => t.document.id);
  const q0 = sel[0] ?? toks[0].id;
  const rows = toks.map(t => `<li data-search-text="${esc(t.name)}"><label class="wix-check"><input type="checkbox" name="p.${t.id}"${sel.includes(t.id) && t.id !== q0 ? " checked" : ""}> ${esc(t.name)}</label></li>`).join("");
  const grounds = Object.entries(C.GROUNDS).map(([id, g]) => ({id, label: g.label}));
  const content = `<p class="wodx-quiet">Who runs, who follows, and where. The lead is measured from the nearest pursuer when left empty.</p>
    <div class="wodx-field"><label>Quarry</label><select name="quarry">${opt(toks.map(t => ({id: t.id, label: t.name})), q0)}</select></div>
    <div class="wodx-field"><label>Pursuers</label></div>${toks.length > 8 ? searchBox("ul.wix-chase-list", "Find a token…", "Search tokens") : ""}<ul class="wix-chase-list">${rows}</ul>
    <div class="wodx-field"><label>Ground</label><select name="ground">${opt(grounds, "streets")}</select></div>
    <div class="wodx-field"><label>Lead in yards</label><input type="number" name="lead" min="0" max="500" placeholder="measured"></div>
    <label class="wix-check"><input type="checkbox" name="night"> At night</label>`;
  const fd = await foundry.applications.api.DialogV2.wait({
    window: {title: "Start a chase", resizable: true}, classes: ["wodx-dialog", "wix-dialog"], position: {width: 440, height: "auto"}, content,
    buttons: [{action: "go", label: "Start", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}],
    rejectClose: false
  });
  if ( !fd || fd === "cancel" ) return null;
  return start(scene, {quarry: fd.quarry, pursuers: toks.filter(t => fd[`p.${t.id}`] && t.id !== fd.quarry).map(t => t.id),
    ground: fd.ground, night: !!fd.night, lead: fd.lead === "" || fd.lead === null || fd.lead === undefined ? null : num(fd.lead), dialog: true});
}

/** Start a chase on a scene. quarry, pursuers: token ids. lead: yards, or null to measure. dialog: open the turn window
 *  (from the window, yes; from a macro or a gate, no). Returns the state. */
export async function start(scene, {quarry, pursuers = [], ground = "streets", night = false, lead = null, dialog = false} = {}) {
  const year = yearNow(), qd = scene.tokens.get(quarry);
  const pds = pursuers.map(id => scene.tokens.get(id)).filter(Boolean);
  if ( !qd || !pds.length ) { ui.notifications.warn("Pick a quarry and at least one pursuer."); return null; }
  const at = d => deps.centerOf ? deps.centerOf(d, scene) : {x: d.x, y: d.y};
  const measured = Math.min(...pds.map(d => deps.yardsOn ? deps.yardsOn(scene, at(qd), at(d)) : 0));
  const st = C.newChase({quarry: {...racerOf(qd, year), lead: lead ?? Math.round(measured)}, pursuers: pds.map(d => racerOf(d, year)), ground, night, year});
  await save(scene, st);
  await ChatMessage.create({speaker: {alias: "WoDX"}, content: card(`A chase begins`, `<p>${esc(qd.name)} runs ${esc(C.WAYS[st.quarry.way].label.toLowerCase())}, with ${esc(pds.map(d => d.name).join(", "))} after.</p>`)});
  Hooks.callAll("wodxChase", {kind: "start", scene: scene.id, state: st});
  return dialog ? turnDialog(scene, st) : st;
}

async function turnDialog(scene, st) {
  const ways = C.waysIn(st.year);
  const grounds = Object.entries(C.GROUNDS).map(([id, g]) => ({id, label: g.label}));
  const row = (r, quarry) => {
    const sp = C.speedOf(r, st.ground, st.year);
    const lead = quarry ? `head start and total ${r.total}` : `total ${r.total}, ${C.standing(st, r)}`;
    return `<tr><td>${esc(r.name)}${quarry ? " <small>(quarry)</small>" : ""}</td>
      <td><select name="way.${r.id}">${opt(ways, r.way)}</select></td>
      <td><label class="wix-check"><input type="checkbox" name="flat.${r.id}"${r.flatOut ? " checked" : ""}> flat out</label></td>
      <td class="wodx-quiet">${sp.yards} yd${sp.capped ? " (held by the ground)" : ""}; ${esc(lead)}</td></tr>`;
  };
  const live = st.pursuers.filter(p => !p.out);
  const content = `<p class="wodx-quiet">Turn ${st.turn + 1}. Each racer rolls; a pursuer whose total passes the quarry's catches up. A lead of ${C.AWAY_LEAD} and the quarry is away.</p>
    <div class="wodx-field"><label>Ground this turn</label><select name="ground">${opt(grounds, st.ground)}</select></div>
    <table class="wix-chase"><tbody>${row(st.quarry, true)}${live.map(p => row(p, false)).join("")}</tbody></table>
    <label class="wix-check"><input type="checkbox" name="sight"> Call for sight: each pursuer rolls Perception + Alertness to keep ${esc(st.quarry.name)} in view, +1 difficulty a success of lead (${esc(live.map(p => `${p.name} ${C.sightDiff(st, p)}`).join(", "))})</label>
    <label class="wix-check"><input type="checkbox" name="night"${st.night ? " checked" : ""}> At night</label>`;
  const r = await foundry.applications.api.DialogV2.wait({
    window: {title: `The chase: ${st.quarry.name}`, resizable: true}, classes: ["wodx-dialog", "wix-dialog"], position: {width: 620, height: "auto"}, content,
    buttons: [{action: "roll", label: "Roll the turn", default: true, callback: (ev, b) => ({act: "roll", fd: new foundry.applications.ux.FormDataExtended(b.form).object})},
      {action: "end", label: "End the chase", callback: () => ({act: "end"})}, {action: "close", label: "Close"}],
    rejectClose: false
  });
  if ( !r || r === "close" ) return st;
  if ( r.act === "end" ) return end(scene);
  const next = structuredClone(st);
  next.ground = C.groundKind(r.fd.ground);
  next.night = !!r.fd.night;
  for ( const x of [next.quarry, ...next.pursuers] ) {
    if ( r.fd[`way.${x.id}`] && C.wayOpen(r.fd[`way.${x.id}`], st.year) ) x.way = r.fd[`way.${x.id}`];
    x.flatOut = !!r.fd[`flat.${x.id}`];
  }
  next.sight = !!r.fd.sight;
  return rollTurn(scene, next, {dialog: true});
}

/** Roll one pool for a racer: {successes, botch, dice, diff, faces, parts, roll}. */
async function rollPool(actor, attr, ability, diff, parts0 = [], cap = null) {
  const ab = ability ? abilityOf(actor, ability) : {dots: 0, type: "talent"};
  const built = actionPool({attribute: attrOf(actor, attr), attributeLabel: attr[0].toUpperCase() + attr.slice(1), ability: ab.dots,
    abilityLabel: ability ? ability[0].toUpperCase() + ability.slice(1) : "", abilityKey: ability || null, abilityType: ab.type,
    baseDifficulty: diff, woundPenalty: actor?.system?.conditions?.isignoringpain ? 0 : num(actor?.system?.health?.damage?.woundpenalty)});
  if ( built.blocked ) return {successes: 0, botch: false, dice: 0, diff, faces: [], parts: [built.blocked], roll: null};
  const d = clampDifficulty(built.difficulty);
  if ( cap !== null && built.dice > cap ) { built.dice = cap; built.parts.push(`Maneuver ${cap}: the most dice`); }
  const roll = new Roll(`${Math.max(0, built.dice)}d10`);
  await roll.evaluate();
  const faces = roll.dice[0]?.results?.map(x => x.result) ?? [];
  return {...countSuccesses(faces, d), dice: built.dice, diff: d, faces, parts: [...built.parts, ...parts0], roll};
}

/** Roll a turn for everyone and post the cards. st: the state with this turn's choices (default: the scene's). */
export async function rollTurn(scene, st = stateOf(scene), {dialog = false} = {}) {
  if ( !st || st.status !== "running" ) return st;
  const rolls = {}, lines = [], all = [];
  const racers = [st.quarry, ...st.pursuers.filter(p => !p.out)];
  for ( const x of racers ) {
    const actor = scene.tokens.get(x.id)?.actor ?? game.actors.get(x.actorId);
    if ( !actor ) { rolls[x.id] = {successes: 0, botch: false}; continue; }
    const p = C.rollFor(x, st.ground, {night: st.night, year: st.year});
    const res = await rollPool(actor, p.attr, p.ability, p.diff, p.parts, p.cap);
    rolls[x.id] = res;
    if ( res.roll ) all.push(res.roll);
    lines.push(`<p><b>${esc(x.name)}</b>: ${esc(C.WAYS[x.way].label)}, ${res.dice} dice at ${res.diff}${res.parts.length ? ` (${esc(res.parts.join(", "))})` : ""}: ${res.botch ? "a botch" : `${res.successes} success${res.successes === 1 ? "" : "es"}`} <span class="wodx-quiet">[${res.faces.join(" ")}]</span></p>`);
  }
  // Keeping sight: the Storyteller called a Perception roll, +1 difficulty for each success the quarry leads by
  if ( st.sight ) {
    for ( const p of st.pursuers.filter(x => !x.out) ) {
      const pa = scene.tokens.get(p.id)?.actor;
      if ( !pa ) continue;
      const r = await rollPool(pa, "perception", "alertness", C.sightDiff(st, p));
      rolls[p.id].sight = r;
      if ( r.roll ) all.push(r.roll);
      lines.push(`<p>${esc(p.name)} keeps watch: Perception + Alertness, ${r.dice} dice at ${r.diff}: ${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`}.</p>`);
    }
  }
  const {state, events} = C.playTurn(st, rolls);
  await save(scene, state);
  const words = events.map(e => `<p>${esc(e.text)}</p>`).join("");
  const stand = state.status === "running" ? state.pursuers.filter(p => !p.out).map(p => `<p>${esc(p.name)} ${esc(C.standing(state, p))}.</p>`).join("") : "";
  // The players' card, in words; the dice of Storyteller characters stay on the Storyteller's copy
  await ChatMessage.create({speaker: {alias: "WoDX"}, content: card(`The chase, turn ${state.turn}`, words + stand)});
  const hurt = events.filter(e => e.kind === "crash" || e.kind === "thrown");
  const buttons = [`<button type="button" class="wix-chase-undo">Undo this turn</button>`]
    .concat(hurt.map(e => `<button type="button" class="wix-chase-hurt" data-who="${esc(e.who)}" data-dice="${e.dice}" data-type="${esc(e.type ?? "bashing")}">Damage for ${esc(nameOf(state, e.who))}</button>`))
    .concat(state.status === "caught" ? [`<button type="button" class="wix-chase-fight">Start a fight</button>`] : [])
    .concat(C.chaseGrudges(state).length && game.modules.get("wodx-npc")?.api?.attitude?.apply ? [`<button type="button" class="wix-chase-grudge">Hard feelings: ${esc(C.chaseGrudges(state).map(g => `${scene.tokens.get(g.npc)?.name ?? "someone"} toward ${scene.tokens.get(g.pc)?.name ?? "someone"}`).join(", "))}</button>`] : []);
  const charge = state.status === "caught" ? state.pursuers.filter(p => (state.caughtBy ?? []).includes(p.id) && C.chargeDice(state, p))
    .map(p => `<p>${esc(p.name)} rides in at speed: +${C.chargeDice(state, p)} damage dice on the first blow (mounted combat, V20 Dark Ages p. 398).</p>`).join("") : "";
  const totals = charge + `<p class="wodx-quiet">Totals: ${esc(state.quarry.name)} ${state.quarry.total}; ${state.pursuers.map(p => `${esc(p.name)} ${p.total}${p.out ? ` (${esc(p.out)})` : ""}`).join("; ")}.</p>`;
  await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), rolls: all, sound: all.length ? CONFIG.sounds?.dice : undefined,
    content: card(`The chase, turn ${state.turn} (Storyteller)`, lines.join("") + words + totals + `<div class="wodx-buttons">${buttons.join("")}</div>`),
    flags: {[MOD]: {chaseTurn: {scene: scene.id, turn: state.turn, prev: st, end: state.status !== "running" ? state : null}}}});
  Hooks.callAll("wodxChase", {kind: "turn", scene: scene.id, state, events});
  // A chase is heard (0.28.0): hooves and motors loud, feet quiet, from where the quarry is; the racers don't count
  try {
    const qt = scene.tokens.get(state.quarry.id);
    if ( qt?.object ) deps.noiseAt?.({token: qt.object, noise: C.chaseNoise(state), kind: "chase", objectName: "a chase",
      except: [state.quarry, ...state.pursuers].map(r => scene.tokens.get(r.id)?.uuid).filter(Boolean)});
  } catch (e) { console.warn(`${MOD} | chase noise`, e); }
  if ( state.status !== "running" ) {
    Hooks.callAll("wodxChase", {kind: state.status, scene: scene.id, state});
    return state;
  }
  return dialog ? turnDialog(scene, state) : state;
}
const nameOf = (st, id) => [st.quarry, ...st.pursuers].find(x => x.id === id)?.name ?? "";

/** End the chase on a scene. */
export async function end(scene = canvas?.scene) {
  const st = stateOf(scene);
  if ( !st ) return null;
  await scene.update(unsetChase());
  await ChatMessage.create({speaker: {alias: "WoDX"}, content: card("The chase is over", `<p>The Storyteller calls it.</p>`)});
  Hooks.callAll("wodxChase", {kind: "end", scene: scene.id, state: st});
  return null;
}

/** Undo the turn on a Storyteller card: only the last turn of a chase still on its scene. */
export async function undoTurn(msg) {
  const f = msg.flags?.[MOD]?.chaseTurn, scene = game.scenes.get(f?.scene);
  if ( !f || !scene ) return false;
  const now = stateOf(scene);
  if ( now && now.turn !== f.turn ) { ui.notifications.warn("Only the last turn of the chase can be undone."); return false; }
  await save(scene, f.prev);
  await msg.update({[`flags.${MOD}.chaseTurn.undone`]: true});
  ui.notifications.info(`Turn ${f.turn} of the chase is undone.`);
  return true;
}

async function hurt(msg, who, dice, type) {
  const scene = game.scenes.get(msg.flags?.[MOD]?.chaseTurn?.scene), tok = scene?.tokens?.get(who);
  if ( !tok?.actor ) return;
  if ( !game.wodxCombat?.soakAndApply ) { ui.notifications.warn(`WoDX Combat is off: ${dice} dice of ${type}, roll soak and apply it by hand.`); return; }
  await game.wodxCombat.soakAndApply(tok.object ?? tok.actor, {mode: "pool", amount: num(dice), type, fireSun: false, soakDiff: 6, soak: true, fortBlood: "auto", soakBonus: 0});
}

/** The Storyteller's button: each NPC's attitude toward the character moves one step down (NPC attitude track). */
async function grudges(msg) {
  const f = msg.flags?.[MOD]?.chaseTurn, scene = game.scenes.get(f?.scene);
  const att = game.modules.get("wodx-npc")?.api?.attitude;
  const st = f?.end ?? stateOf(scene);
  if ( !scene || !st || !att?.apply ) return;
  const done = [];
  for ( const g of C.chaseGrudges(st) ) {
    const n = scene.tokens.get(g.npc)?.actor, p = scene.tokens.get(g.pc)?.actor;
    if ( !n || !p ) continue;
    const e = await att.apply(n, p, {delta: -1, why: `${p.name} ${g.why}`});
    if ( e ) done.push(`${n.name} toward ${p.name}: now ${att.of?.(n, p)?.word ?? "one step worse"}`);
  }
  await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: card("Hard feelings after the chase",
    done.length ? `<ul>${done.map(d => `<li>${esc(d)}</li>`).join("")}</ul><p class="wodx-quiet">Change it on the NPC's attitude track if it doesn't fit (house rule).</p>` : "<p>Nobody's attitude changed.</p>")});
}

async function fight(msg) {
  const f = msg.flags?.[MOD]?.chaseTurn, scene = game.scenes.get(f?.scene);
  const st = stateOf(scene);
  if ( !scene || !st ) return;
  const ids = [st.quarry.id, ...(st.caughtBy ?? [])];
  const api = game.wodxCombat?.fight;
  if ( !api?.start ) { ui.notifications.warn("WoDX Combat is off: start the fight by hand."); return; }
  await api.start({scene, tokens: ids.map(id => scene.tokens.get(id)).filter(Boolean), source: "chase", why: "a chase ends in a catch", byHand: true});
  await scene.update(unsetChase());
}

function card(title, body) {
  return `<div class="vta-card wodx-x wix wix-chase-card"><header class="vta-head"><h3 style="${H3}">${esc(title)}</h3></header><div class="vta-body">${body}</div></div>`;
}

/** Wire it up: the hand tool, the card buttons. d: helpers from main.mjs (describeObj, yardsOn, centerOf). */
export function setupChase(d = {}) {
  deps = d;
  Hooks.once("ready", () => {
    const add = () => {
      const hand = game.wodx?.storyteller?.hand;
      if ( !hand?.addTool ) return false;
      hand.addTool({key: "chase", label: "A chase", icon: "fa-person-running", run: () => open()});
      return true;
    };
    if ( !add() ) setTimeout(add, 2000);
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !msg.flags?.[MOD]?.chaseTurn ) return;
    const wire = (sel, fn) => el.querySelectorAll?.(sel).forEach(b => {
      if ( !game.user.isGM ) { b.remove(); return; }
      if ( sel === "button.wix-chase-undo" && msg.flags[MOD].chaseTurn.undone ) { b.disabled = true; return; }
      b.addEventListener("click", ev => { ev.preventDefault(); b.disabled = true; fn(b).catch(e => console.error(`${MOD} |`, e)); });
    });
    wire("button.wix-chase-undo", () => undoTurn(msg));
    wire("button.wix-chase-hurt", b => hurt(msg, b.dataset.who, b.dataset.dice, b.dataset.type));
    wire("button.wix-chase-fight", () => fight(msg));
    wire("button.wix-chase-grudge", () => grudges(msg));
  });
  return {open, start, rollTurn, end, undoTurn, join, state: stateOf, rules: C};
}
