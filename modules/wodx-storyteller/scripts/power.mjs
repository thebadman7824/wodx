/**
 * WoDX Storyteller (B3450-B3456): places of power. Rules in power-rules.mjs.
 *
 * The Storyteller keeps a register of Mage Nodes, chantries (Constructs) and Changeling freeholds, each tied to a
 * scene and to the characters who keep it. Once a game hour (and after a time skip) the active Storyteller's client
 * runs the clock over them: Nodes fill week by week up to their cap, a freehold's lost balefire ranks come back, and
 * an untended freehold in a dull place fades. A card goes to the Storyteller only when something changed that matters.
 * From the window the Storyteller has a mage meditate at a Node (Quintessence through the Avatar), gathers Tass,
 * has changelings dream by a balefire (Glamour), records a Reaving, a member leaving a chantry, or a freehold lost.
 * A keeper who draws on the place has the matching tie (Node, Chantry, Holdings) marked tended.
 * Hidden world state wodx-storyteller.powerState = {v, list}. World setting placesOfPower (on or off).
 * Tass carried: actor flag wodx-storyteller.tass = [{points, form, resonance, from, t}].
 */
import * as P from "./power-rules.mjs";
import * as U from "./upkeep-rules.mjs";
import {MOD, esc, chron, isActiveGM, gmIds, setting} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const all = c => (c ? [...(c.contents ?? c)] : []);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 2000; } catch (e) { return 2000; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
const DialogV2 = () => foundry.applications.api.DialogV2;
const opt = (v, t, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`;

export const on = () => setting("placesOfPower") !== false;
export const state = () => P.normState(setting("powerState"));
async function save(st) { if ( game.user.isGM ) await game.settings.set(MOD, "powerState", P.normState(st)); }

export function registerPowerSettings() {
  game.settings.register(MOD, "placesOfPower", {name: "Places of power run on the clock", scope: "world", config: true, type: Boolean, default: true,
    hint: "Nodes fill with Quintessence and Tass week by week, lost balefire ranks come back, and an untended freehold in a dull place fades (Upkeep, Places of power). Off: the places stay as they are."});
  game.settings.register(MOD, "powerState", {scope: "world", config: false, type: Object, default: P.blankState()});
}

/** A freehold's Banality: its own rating plus the scene's drift (WoDX Otherworlds, The Gauntlet over time). */
function banalityOf(p) {
  try {
    const sc = p.scene ? game.scenes.get(p.scene) : null;
    const d = sc ? game.modules.get("wodx-otherworlds")?.api?.drift?.of?.(sc) : null;
    return d ? Math.max(0, Math.min(10, num(p.banality) + num(d.banality))) : null;
  } catch (e) { return null; }
}

/** Run the clock over every place; tell the Storyteller what changed. */
export async function run({stamp = now(), quiet = false} = {}) {
  if ( !isActiveGM() || !on() ) return null;
  const st0 = state();
  if ( !st0.list.length ) return null;
  const r = P.tick(st0, stamp, {year: yearNow(), banalityOf});
  if ( JSON.stringify(r.state) !== JSON.stringify(st0) ) await save(r.state);
  if ( r.lines.length && !quiet ) {
    await ChatMessage.create({speaker: {alias: "Places of power"}, whisper: gmIds(),
      content: `<div class="wodx-card wst-power"><h3>Places of power</h3><ul>${r.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`});
  }
  return r;
}

/* ---------------- Actors ---------------- */

const bgItem = (a, kind) => all(a?.items).find(i => /background/i.test(String(i.type ?? "") + String(i.system?.type ?? "")) && U.tieKindOfBackground(i.name) === kind) ?? null;
/** A keeper who draws on the place has their tie to it marked tended. */
async function tendTie(a, kind) {
  const it = bgItem(a, kind);
  if ( !it || !game.user.isGM ) return;
  const key = U.tieKey(kind, it.id), cur = a.flags?.[MOD]?.ties?.[key] ?? {};
  await a.update({[`flags.${MOD}.ties.${key}`]: {...cur, last: now(), warned: null}});
}
// Avatar is a Feature item named Avatar or Genius, as WoDX Actions reads it (m20.js info)
const avatarOf = a => num(all(a?.items).find(i => i.type === "Feature" && /^(avatar|genius)/i.test(i.name ?? ""))?.system?.value);
const mageOf = a => ({avatar: avatarOf(a), prime: num(a?.system?.spheres?.prime?.value),
  quint: num(a?.system?.quintessence?.temporary), paradox: num(a?.system?.paradox?.temporary)});
const faeOf = a => ({glamour: num(a?.system?.advantages?.glamour?.temporary), perm: num(a?.system?.advantages?.glamour?.permanent), banality: num(a?.system?.advantages?.banality?.permanent)});
const nameOf = id => game.actors.get(id)?.name ?? "someone gone";
const sceneName = id => { const s = id ? game.scenes.get(id) : null; return s ? (s.navName || s.name) : "no scene"; };

async function update(id, fn, line) {
  const st = state(), i = st.list.findIndex(p => p.id === id);
  if ( i < 0 ) return null;
  let p = fn(st.list[i]);
  if ( line ) p = P.logLine(p, now(), line);
  st.list[i] = P.normPlace(p);
  await save(st);
  return st.list[i];
}
async function say(lines, title = "Places of power") {
  await ChatMessage.create({speaker: {alias: title}, whisper: gmIds(), content: `<div class="wodx-card wst-power"><h3>${esc(title)}</h3><ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`});
}

/* ---------------- Acts ---------------- */

export async function meditate(placeId, actorId, {turns = 1, want = Infinity} = {}) {
  const p = P.placeById(state(), placeId), a = game.actors.get(actorId);
  if ( !p || p.kind !== "node" || !a ) return null;
  const r = P.meditate(p, {...mageOf(a), turns, want});
  if ( !r.ok ) { ui.notifications.warn(`${a.name}: ${r.why}`); return r; }
  await a.update({"system.quintessence.temporary": r.held});
  await update(placeId, x => ({...x, store: r.node.store}), `${a.name} drew ${r.take} Quintessence.`);
  await tendTie(a, "node");
  await say([`${a.name} meditates at ${p.name} and takes ${r.take} Quintessence (now ${r.held}).`, ...r.notes]);
  return r;
}

export async function gatherTass(placeId, actorId, want = Infinity) {
  const p = P.placeById(state(), placeId), a = game.actors.get(actorId);
  if ( !p || p.kind !== "node" || !a ) return null;
  const r = P.gatherTass(p, want);
  if ( !r.take ) { ui.notifications.warn(`${p.name} has no Tass to gather yet.`); return r; }
  const carried = [...(a.flags?.[MOD]?.tass ?? []), {points: r.take, form: r.form, resonance: r.resonance, from: p.name, t: now()}].slice(-40);
  await a.update({[`flags.${MOD}.tass`]: carried});
  await update(placeId, x => ({...x, store: r.node.store}), `${a.name} gathered ${r.take} Tass.`);
  await tendTie(a, "node");
  await say([`${a.name} gathers ${r.take} Tass at ${p.name}${r.form ? `: ${r.form}` : ""}${r.resonance ? `, its Resonance ${r.resonance}` : ""}.`]);
  return r;
}

/** Spend carried Tass into the Avatar (Prime 3). */
export async function absorbTass(actorId, points) {
  const a = game.actors.get(actorId);
  if ( !a ) return null;
  const carried = [...(a.flags?.[MOD]?.tass ?? [])];
  const have = carried.reduce((s, t) => s + num(t.points), 0);
  const r = P.absorbTass({...mageOf(a), points: Math.min(have, num(points))});
  if ( !r.ok ) { ui.notifications.warn(`${a.name}: ${r.why}`); return r; }
  let left = r.take;
  for ( const t of carried ) { const d = Math.min(left, num(t.points)); t.points = num(t.points) - d; left -= d; }
  await a.update({"system.quintessence.temporary": mageOf(a).quint + r.take, [`flags.${MOD}.tass`]: carried.filter(t => t.points > 0)});
  await say([`${a.name} draws ${r.take} Quintessence out of carried Tass.`]);
  return r;
}

export async function dream(placeId, actorIds = []) {
  const p = P.placeById(state(), placeId);
  if ( !p || p.kind !== "freehold" ) return null;
  const actors = actorIds.map(id => game.actors.get(id)).filter(Boolean);
  const r = P.harvest(p, actors.map(a => ({id: a.id, ...faeOf(a)})));
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  const lines = [];
  for ( const g of r.gains ) {
    const a = game.actors.get(g.id), f = faeOf(a);
    if ( g.gain ) await a.update({"system.advantages.glamour.temporary": f.glamour + g.gain});
    lines.push(`${a.name} wakes with ${g.gain} Glamour${g.capped ? " (as much as their Glamour rating holds)" : ""}.`);
    if ( p.keepers.includes(a.id) ) await tendTie(a, "freehold");
  }
  if ( actors.length && !actors.some(a => p.keepers.includes(a.id)) ) lines.push("No keeper slept here: only the keeper, or someone the keeper allows, may harvest the balefire.");
  await update(placeId, x => P.noteHarvest(x, now()), `Dreamed by the balefire: ${actors.map(a => a.name).join(", ")}.`);
  await say([`A night by the balefire of ${p.name}:`, ...lines]);
  return r;
}

export async function reave(placeId, actorId) {
  const p = P.placeById(state(), placeId), a = game.actors.get(actorId);
  if ( !p || p.kind !== "freehold" || !a ) return null;
  const dice = Math.max(1, faeOf(a).banality);
  const roll = await new Roll(`${dice}d10cs>=7`).evaluate();
  const r = P.reave(p, roll.total);
  const f = faeOf(a);
  if ( r.glamour ) await a.update({"system.advantages.glamour.temporary": Math.min(10, f.glamour + r.glamour)});
  await update(placeId, x => ({...x, rating: r.freehold.rating, lastRegen: now()}), `${a.name} reaved ${r.glamour} Glamour; the freehold lost ${r.lose}.`);
  await roll.toMessage({speaker: ChatMessage.getSpeaker({actor: a}), flavor: `Reaving the balefire of ${p.name}: Banality at 7`, whisper: gmIds()});
  await say([`${a.name} reaves ${r.glamour} Glamour from ${p.name}.`, r.lose ? `The balefire wavers and loses ${r.lose === 1 ? "a rank" : `${r.lose} ranks`} (now ${r.freehold.rating}).${r.out ? " It has gone out." : ""}` : "The balefire holds.",
    "Reaving is outlawed by most courts of both sides."]);
  return r;
}

export async function memberLeaves(placeId, who) {
  const p = P.placeById(state(), placeId);
  if ( !p || p.kind !== "chantry" ) return null;
  const r = P.memberLeaves(p, who);
  await update(placeId, () => ({...p, ...r.chantry}), `${nameOf(who) !== "someone gone" ? nameOf(who) : who} left; ${r.lost} pool points lost.`);
  await say([`${p.name}: a member leaves and their ${r.lost} pool points go with them.${r.dropped ? ` The ${P.chantryName(yearNow(), p.side).toLowerCase()} shrinks from ${r.from.toLowerCase()} to ${r.to.toLowerCase()}.` : ""}`]);
  return r;
}

export async function destroy(placeId) {
  const p = P.placeById(state(), placeId);
  if ( !p || p.kind !== "freehold" ) return null;
  const ok = await DialogV2().confirm({window: {title: "A freehold lost"}, content: `<p>Mark ${esc(p.name)} destroyed? Its keepers each take ${p.base} Banality; a keeper who made it gets the invested Glamour back. The place stays in the register, marked destroyed.</p>`});
  if ( !ok ) return null;
  const lines = [];
  for ( const id of p.keepers ) {
    const a = game.actors.get(id);
    if ( !a ) continue;
    const r = P.destroyFreehold(p, {keeperIsCreator: p.creator === id});
    const b = num(a.system?.advantages?.banality?.temporary), f = faeOf(a);
    const upd = {"system.advantages.banality.temporary": Math.min(10, b + r.banality)};
    if ( r.glamourBack ) upd["system.advantages.glamour.temporary"] = Math.min(f.perm || 10, f.glamour + r.glamourBack);
    await a.update(upd);
    lines.push(`${a.name} takes ${r.banality} Banality${r.glamourBack ? ` and has ${r.glamourBack} Glamour back` : ""}.`);
  }
  await update(placeId, x => P.destroyFreehold(x).freehold, "Destroyed.");
  await say([`${p.name} is lost.`, ...lines]);
  return true;
}

/* ---------------- Editing ---------------- */

const sceneOptions = sel => opt("", "No scene") + all(game.scenes).map(s => opt(s.id, s.navName || s.name, s.id === sel)).join("");
const actorOptions = (sel = []) => all(game.actors).filter(a => a.type !== "Group").map(a => opt(a.id, a.name, sel.includes(a.id))).join("");

export async function editPlace(placeId = null, kind = "node") {
  if ( !game.user.isGM ) return null;
  const st = state();
  const p = placeId ? P.placeById(st, placeId) : P.normPlace({kind, id: foundry.utils.randomID()});
  const y = yearNow();
  let body = "";
  if ( p.kind === "node" ) {
    body = `<label>Rating <input type="number" name="rating" min="1" max="10" value="${p.rating}"></label>
      <label>Held by <select name="side" data-fixed>${Object.entries(P.NODE_SIDES).map(([k, v]) => opt(k, v.label, k === p.side)).join("")}</select></label>
      <label>Its Resonance <input type="text" name="resonance" value="${esc(p.resonance)}" placeholder="fury and grief, calm, cold reason…"></label>
      <label>Its Tass comes as <select name="tass" data-fixed>${Object.entries(P.TASS_FORMS).map(([k, v]) => opt(k, `${v.label}${v.form ? `: ${v.form}` : ""}`, k === p.tass)).join("")}</select></label>
      <label>Or in your words <input type="text" name="tassForm" value="${esc(p.tassForm)}"></label>
      <label>Quintessence a week for each dot <input type="number" name="rate" min="0" max="20" value="${p.rate ?? ""}" placeholder="${P.nodeRateFor(y).perDot} in ${y}"></label>
      <p class="hint">Empty uses the year's rate: ${P.NODE_RATES.map(r => `${r.perDot} for ${r.label}`).join("; ")}. Half comes as free Quintessence, half as Tass, and a Node holds ${P.NODE_CAP_WEEKS} weeks of output at most (M20 pp. 320-321).</p>`;
  } else if ( p.kind === "chantry" ) {
    const members = p.members.filter(m => !m.gone);
    body = `<label>Side <select name="side" data-fixed>${opt("mystic", "Mystic (Traditions, Crafts)", p.side === "mystic")}${opt("tech", "Technocratic", p.side === "tech")}</select></label>
      <label>Duties owed <input type="text" name="duties" value="${esc(p.duties)}" placeholder="errands, watches, teaching the young"></label>
      <fieldset><legend>Members and their pool points</legend>${members.map((m, i) => `<div><select name="m.${i}.actor">${opt("", m.name || "Someone not in the world")}${actorOptions([m.actor])}</select> <input type="number" name="m.${i}.points" min="0" max="200" value="${m.points}" style="width:5em"></div>`).join("")}
        <div><select name="m.new.actor">${opt("", "Add a member…")}${actorOptions()}</select> <input type="number" name="m.new.points" min="0" max="200" value="0" style="width:5em"></div></fieldset>
      <label>Its Node <select name="node" data-fixed>${opt("", "None")}${st.list.filter(x => x.kind === "node").map(x => opt(x.id, x.name, x.id === p.node)).join("")}</select></label>
      <p class="hint">Pool sizes (M20 p. 309): secure squat 10 to 20, small sanctuary 21 to 30, mystic chantry to 70, stronghold to 100, power center past that. In ${y} it is called a ${esc(P.chantryName(y, p.side).toLowerCase())}.</p>`;
  } else {
    body = `<label>Rating (Holdings) <input type="number" name="base" min="1" max="5" value="${p.base}"></label>
      <label>Its balefire now <input type="number" name="rating" min="0" max="5" value="${p.rating}"></label>
      <label>Kind <select name="form" data-fixed>${Object.entries(P.FREEHOLD_FORMS).map(([k, v]) => opt(k, v.label, k === p.form)).join("")}</select></label>
      <label>Banality of the place around it <input type="number" name="banality" min="0" max="10" value="${p.banality}"></label>
      <label>Made by <select name="creator" data-fixed>${opt("", "Nobody here (found, inherited or taken)")}${actorOptions(p.creator ? [p.creator] : [])}</select></label>
      <p class="hint">${esc(P.faeAgeFor(y).note)} A freehold left without its keeper for ${P.FREEHOLD_TEND_DAYS} days in a place of Banality ${P.faeAgeFor(y).fade} or more fades a rank each season. Swearing the oath costs ${p.base} Glamour (C20 p. 312).</p>`;
  }
  const content = `<label>Name <input type="text" name="name" value="${esc(p.name)}"></label>
    <label>Scene <select name="scene">${sceneOptions(p.scene)}</select></label>
    ${searchBox("select[name=keepers]", "Search characters…", "Search keepers")}
    <label>Keepers <select name="keepers" multiple size="5">${actorOptions(p.keepers)}</select></label>
    ${body}<label>Notes <textarea name="note">${esc(p.note)}</textarea></label>`;
  const res = await DialogV2().wait({rejectClose: false, position: {width: 560}, window: {title: placeId ? `Edit ${p.name}` : `New ${P.KINDS[p.kind].toLowerCase()}`, resizable: true},
    classes: ["wodx-dialog", "wst-power"], content,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => { const fd = new FormData(b.form); return {...Object.fromEntries(fd), keepers: fd.getAll("keepers")}; }}, {action: "close", label: "Close"}]});
  if ( !res || typeof res !== "object" ) return null;
  let next = {...p, name: res.name || p.name, scene: res.scene || null, keepers: res.keepers ?? [], note: res.note ?? ""};
  if ( p.kind === "node" ) next = {...next, rating: res.rating, side: res.side, resonance: res.resonance, tass: res.tass, tassForm: res.tassForm, rate: res.rate === "" ? null : res.rate};
  else if ( p.kind === "chantry" ) {
    const members = p.members.filter(m => !m.gone).map((m, i) => ({...m, actor: res[`m.${i}.actor`] || m.actor, name: game.actors.get(res[`m.${i}.actor`])?.name ?? m.name, points: res[`m.${i}.points`]}));
    if ( res["m.new.actor"] ) members.push({actor: res["m.new.actor"], name: nameOf(res["m.new.actor"]), points: res["m.new.points"]});
    next = {...next, side: res.side, duties: res.duties, node: res.node || null, members: [...members, ...p.members.filter(m => m.gone)]};
  } else next = {...next, base: res.base, rating: Math.min(num(res.rating), num(res.base)), form: res.form, banality: res.banality, creator: res.creator || null};
  const place = P.normPlace(next);
  const list = placeId ? st.list.map(x => (x.id === placeId ? place : x)) : [...st.list, place];
  await save({...st, list});
  return place;
}

export async function removePlace(placeId) {
  const p = P.placeById(state(), placeId);
  if ( !p ) return false;
  const ok = await DialogV2().confirm({window: {title: "Take off the register"}, content: `<p>Take ${esc(p.name)} off the register of places of power? Characters keep what they drew from it.</p>`});
  if ( !ok ) return false;
  const st = state();
  await save({...st, list: st.list.filter(x => x.id !== placeId)});
  return true;
}

/* ---------------- The window ---------------- */

async function pickActors(title, {multiple = false, pre = []} = {}) {
  const ids = [...new Set([...pre, ...(canvas?.tokens?.controlled ?? []).map(t => t.actor?.id).filter(Boolean)])];
  const res = await DialogV2().wait({rejectClose: false, window: {title}, classes: ["wodx-dialog"],
    content: `${searchBox("select[name=who]", "Search characters…", "Search characters")}<label>Who <select name="who" ${multiple ? "multiple size='8'" : ""}>${actorOptions(ids)}</select></label>
      <label>Turns of meditation (a Node) <input type="number" name="turns" min="1" max="60" value="1"></label>`,
    buttons: [{action: "ok", label: "Go", default: true, callback: (ev, b) => { const fd = new FormData(b.form); return {who: fd.getAll("who"), turns: num(fd.get("turns")) || 1}; }}, {action: "close", label: "Close"}]});
  return res && typeof res === "object" ? res : null;
}

export async function powerDialog() {
  if ( !game.user.isGM ) return;
  await run({quiet: true});
  const st = state(), y = yearNow();
  const rows = st.list.map(p => `<tr data-id="${esc(p.id)}"><td>${esc(P.KINDS[p.kind])}</td><td>${esc(P.describe(p, {year: y}))}<br><small>${esc(sceneName(p.scene))}; kept by ${p.keepers.length ? esc(p.keepers.map(nameOf).join(", ")) : "nobody"}</small></td>
    <td><select name="act.${esc(p.id)}" aria-label="What to do at ${esc(p.name)}" data-fixed>${opt("", "…")}${opt("edit", "Edit")}${p.kind === "node" ? opt("meditate", "Meditate for Quintessence") + opt("tass", "Gather Tass") : ""}${p.kind === "freehold" ? opt("dream", "Dream by the balefire") + opt("reave", "Reave the balefire") + opt("destroy", "Mark destroyed") : ""}${p.kind === "chantry" ? opt("leave", "A member leaves") : ""}${opt("remove", "Take off the register")}</select></td></tr>`).join("");
  const content = `<p>Nodes, chantries and freeholds in ${y}. Nodes fill week by week; freeholds give Glamour for a night by the balefire and win back lost ranks over time. Carried Tass becomes Quintessence for a mage with Prime 3 (Absorb Tass).</p>
    ${st.list.length > 5 ? searchBox("table.wst-power-t", "Search places…", "Search places") : ""}
    <div class="wst-scroll"><table class="wst-power-t"><thead><tr><th>Kind</th><th>Place</th><th>Do</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>No places of power yet.</td></tr>"}</tbody></table></div>
    ${on() ? "" : "<p class='hint'>Places of power are switched off in the settings: the clock leaves them as they are.</p>"}
    <p class="hint">M20 pp. 309-310 and 320-321, 332; C20 pp. 170 and 311-314.</p>`;
  const res = await DialogV2().wait({rejectClose: false, position: {width: 760}, window: {title: "Places of power", resizable: true}, classes: ["wodx-dialog", "wst-power"], content,
    buttons: [{action: "do", label: "Do it", default: true, callback: (ev, b) => ({act: Object.fromEntries(new FormData(b.form))})},
      {action: "node", label: "New Node"}, {action: "chantry", label: "New chantry"}, {action: "freehold", label: "New freehold"}, {action: "absorb", label: "Absorb Tass"}, {action: "close", label: "Close"}]});
  if ( ["node", "chantry", "freehold"].includes(res) ) { await editPlace(null, res); return powerDialog(); }
  if ( res === "absorb" ) {
    const who = await pickActors("Absorb Tass");
    const a = game.actors.get(who?.who?.[0]);
    if ( a ) {
      const have = (a.flags?.[MOD]?.tass ?? []).reduce((s, t) => s + num(t.points), 0);
      await absorbTass(a.id, have);
    }
    return;
  }
  if ( !res?.act ) return;
  for ( const [k, act] of Object.entries(res.act) ) {
    if ( !k.startsWith("act.") || !act ) continue;
    const id = k.slice(4), p = P.placeById(state(), id);
    if ( !p ) continue;
    if ( act === "edit" ) await editPlace(id);
    else if ( act === "remove" ) await removePlace(id);
    else if ( act === "destroy" ) await destroy(id);
    else if ( act === "leave" ) {
      const m = p.members.filter(x => !x.gone);
      const pick = await DialogV2().wait({rejectClose: false, window: {title: "A member leaves"}, classes: ["wodx-dialog"],
        content: `<label>Who <select name="who" data-fixed>${m.map(x => opt(x.actor || x.name, `${x.name} (${x.points})`)).join("")}</select></label>`,
        buttons: [{action: "ok", label: "They leave", callback: (ev, b) => new FormData(b.form).get("who")}, {action: "close", label: "Close"}]});
      if ( pick && pick !== "close" ) await memberLeaves(id, pick);
    } else {
      const who = await pickActors(p.name, {multiple: act === "dream", pre: p.keepers});
      if ( !who?.who?.length ) continue;
      if ( act === "meditate" ) await meditate(id, who.who[0], {turns: who.turns});
      else if ( act === "tass" ) await gatherTass(id, who.who[0]);
      else if ( act === "dream" ) await dream(id, who.who);
      else if ( act === "reave" ) await reave(id, who.who[0]);
    }
  }
}

/** The places in a scene: for other modules (a Node nearby, a freehold's rights). */
export function placesIn(sceneId) { return state().list.filter(p => p.scene === sceneId); }

export async function setupPower() {
  let lastHour = -1;
  Hooks.on("updateWorldTime", () => {
    const hour = Math.floor(now() / 3600);
    if ( hour === lastHour || skipping() || !isActiveGM() ) return;
    lastHour = hour;
    run().catch(e => console.error(`${MOD} | places of power`, e));
  });
  Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) run().catch(e => console.error(`${MOD} | places of power`, e)); });
}

export const rules = P;
export const api = () => ({open: powerDialog, state, on, run, edit: editPlace, remove: removePlace, meditate, gatherTass, absorbTass, dream, reave, memberLeaves, destroy, placesIn, rules: P});
