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
 *
 * Caerns (B3470-B3476, rules in caern-rules.mjs) sit on the same register: a level, a kind and a totem, the sept and
 * its offices, the monthly Moot Rite (Gnosis from the Garou who gather), the Rite of the Opened Caern, Wyrm raids and
 * the Weaver pressing in, caern wars, and a caern dying or being taken. A lapse or a lost raid steps the scene's
 * Gauntlet drift (WoDX Otherworlds); a moot that ends a lapse, or a caern that grows, thins it again.
 */
import * as P from "./power-rules.mjs";
import * as C from "./caern-rules.mjs";
import * as U from "./upkeep-rules.mjs";
import * as Sites from "./sites.mjs";
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
    hint: "Nodes fill with Quintessence and Tass week by week, lost balefire ranks come back, an untended freehold in a dull place fades, and a caern without its monthly moot lapses, loses levels and draws raids (Upkeep, Places of power). Off: the places stay as they are."});
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

/** Step the Gauntlet drift of a caern's scene (WoDX Otherworlds), if that module is there. */
async function stepDrift(sceneId, kind, why) {
  try {
    const sc = sceneId ? game.scenes.get(sceneId) : null, d = game.modules.get("wodx-otherworlds")?.api?.drift;
    if ( sc && d?.step ) await d.step(sc, kind, why);
  } catch (e) { console.error(`${MOD} | caern drift`, e); }
}
const rand = () => { try { return CONFIG.Dice?.randomUniform?.() ?? Math.random(); } catch (e) { return Math.random(); } };

/** Run the clock over every place; tell the Storyteller what changed. */
export async function run({stamp = now(), quiet = false} = {}) {
  if ( !isActiveGM() || !on() ) return null;
  const st0 = state();
  if ( !st0.list.length ) return null;
  const r = P.tick(st0, stamp, {year: yearNow(), banalityOf, rand});
  if ( JSON.stringify(r.state) !== JSON.stringify(st0) ) await save(r.state);
  for ( const d of r.drift ?? [] ) await stepDrift(d.scene, d.kind, "the caern, on the clock");
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
/** A caern tie is one the Storyteller adds by hand (Upkeep): mark each of the actor's caern ties tended. */
async function tendCaern(a) {
  if ( !game.user.isGM ) return;
  const ties = a.flags?.[MOD]?.ties ?? {}, upd = {};
  for ( const [k, t] of Object.entries(ties) ) if ( t?.kind === "caern" ) upd[`flags.${MOD}.ties.${k}`] = {...t, last: now(), warned: null};
  if ( Object.keys(upd).length ) await a.update(upd);
}
// Avatar is a Feature item named Avatar or Genius, as WoDX Actions reads it (m20.js info)
const avatarOf = a => num(all(a?.items).find(i => i.type === "Feature" && /^(avatar|genius)/i.test(i.name ?? ""))?.system?.value);
const mageOf = a => ({avatar: avatarOf(a), prime: num(a?.system?.spheres?.prime?.value),
  quint: num(a?.system?.quintessence?.temporary), paradox: num(a?.system?.paradox?.temporary)});
const faeOf = a => ({glamour: num(a?.system?.advantages?.glamour?.temporary), perm: num(a?.system?.advantages?.glamour?.permanent), banality: num(a?.system?.advantages?.banality?.permanent)});
const nameOf = id => game.actors.get(id)?.name ?? "someone gone";
const at = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);
const garouOf = a => ({id: a.id, name: a.name, rank: num(a.system?.renown?.rank), auspice: String(a.system?.auspice ?? ""),
  gnosis: num(a.system?.advantages?.gnosis?.temporary), willpower: num(a.system?.advantages?.willpower?.temporary), wits: at(a, "wits"), rituals: ab(a, "rituals")});
const holderName = v => (v ? game.actors.get(v)?.name ?? v : "");
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
  let r = P.meditate(p, {...mageOf(a), turns, want});
  if ( !r.ok ) { ui.notifications.warn(`${a.name}: ${r.why}`); return r; }
  // B3582: holy ground shared with other claims lets through no more than it holds, half when weak
  const g = Sites.gate(placeId, r.take);
  if ( g && g.take < r.take ) {
    if ( !g.take ) { ui.notifications.warn(`${g.name} is ${g.state.key === "spent" ? "spent" : "too weak"}: the Node gives nothing until the site fills again.`); return {...r, ok: false, why: "spent"}; }
    r = P.meditate(p, {...mageOf(a), turns, want: g.take});
  }
  await a.update({"system.quintessence.temporary": r.held});
  await update(placeId, x => ({...x, store: r.node.store}), `${a.name} drew ${r.take} Quintessence.`);
  await tendTie(a, "node");
  await say([`${a.name} meditates at ${p.name} and takes ${r.take} Quintessence (now ${r.held}).`, ...r.notes, ...(g && g.factor < 1 ? [`${g.name} is weakened: the Node gives half.`] : [])]);
  await Sites.onDraw(placeId, "node", r.take, {by: a});
  return r;
}

export async function gatherTass(placeId, actorId, want = Infinity) {
  const p = P.placeById(state(), placeId), a = game.actors.get(actorId);
  if ( !p || p.kind !== "node" || !a ) return null;
  let r = P.gatherTass(p, want);
  if ( !r.take ) { ui.notifications.warn(`${p.name} has no Tass to gather yet.`); return r; }
  const g = Sites.gate(placeId, r.take); // B3582
  if ( g && g.take < r.take ) {
    if ( !g.take ) { ui.notifications.warn(`${g.name} is ${g.state.key === "spent" ? "spent" : "too weak"}: no Tass forms until the site fills again.`); return {...r, take: 0}; }
    r = P.gatherTass(p, g.take);
  }
  const carried = [...(a.flags?.[MOD]?.tass ?? []), {points: r.take, form: r.form, resonance: r.resonance, from: p.name, t: now()}].slice(-40);
  await a.update({[`flags.${MOD}.tass`]: carried});
  await update(placeId, x => ({...x, store: r.node.store}), `${a.name} gathered ${r.take} Tass.`);
  await tendTie(a, "node");
  await say([`${a.name} gathers ${r.take} Tass at ${p.name}${r.form ? `: ${r.form}` : ""}${r.resonance ? `, its Resonance ${r.resonance}` : ""}.`]);
  await Sites.onDraw(placeId, "node", r.take, {by: a});
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
  // B3582: a shared site cuts the balefire's Glamour to what it holds, half when weak
  const total = r.gains.reduce((n, g) => n + num(g.gain), 0), site = Sites.gate(placeId, total);
  if ( site && site.take < total ) {
    let left = site.take;
    for ( const g of r.gains ) { const k = Math.min(left, Math.floor(num(g.gain) * site.factor)); g.gain = k; left -= k; }
    lines.push(site.take ? `${site.name} is weakened: the balefire gives less.` : `${site.name} is spent: the balefire gives no Glamour tonight.`);
  }
  for ( const g of r.gains ) {
    const a = game.actors.get(g.id), f = faeOf(a);
    if ( g.gain ) await a.update({"system.advantages.glamour.temporary": f.glamour + g.gain});
    lines.push(`${a.name} wakes with ${g.gain} Glamour${g.capped ? " (as much as their Glamour rating holds)" : ""}.`);
    if ( p.keepers.includes(a.id) ) await tendTie(a, "freehold");
  }
  if ( actors.length && !actors.some(a => p.keepers.includes(a.id)) ) lines.push("No keeper slept here: only the keeper, or someone the keeper allows, may harvest the balefire.");
  await update(placeId, x => P.noteHarvest(x, now()), `Dreamed by the balefire: ${actors.map(a => a.name).join(", ")}.`);
  await say([`A night by the balefire of ${p.name}:`, ...lines]);
  await Sites.onDraw(placeId, "freehold", r.gains.reduce((n, g) => n + num(g.gain), 0), {by: actors.find(a => p.keepers.includes(a.id)) ?? actors[0] ?? null});
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

/* ---------------- Caerns ---------------- */

const caernAt = id => { const p = P.placeById(state(), id); return p?.kind === "caern" ? p : null; };
async function ask(title, content, label = "Go") {
  const res = await DialogV2().wait({rejectClose: false, window: {title}, classes: ["wodx-dialog", "wst-power"], content,
    buttons: [{action: "ok", label, default: true, callback: (ev, b) => { const fd = new FormData(b.form); return {...Object.fromEntries(fd), who: fd.getAll("who")}; }}, {action: "close", label: "Close"}]});
  return res && typeof res === "object" ? res : null;
}

/**
 * The Moot Rite: the Garou gathered give Gnosis, a point each in turn, until the caern is full or they run dry.
 * `extra` is Gnosis from sept Garou who are not in the world.
 */
export async function holdMoot(placeId, actorIds = [], {extra = 0} = {}) {
  const p = caernAt(placeId);
  if ( !p ) return null;
  const actors = actorIds.map(id => game.actors.get(id)).filter(Boolean);
  const need = C.mootNeed(p.level), pool = actors.map(a => ({id: a.id, left: garouOf(a).gnosis, give: 0}));
  let want = Math.max(0, need - Math.max(0, num(extra)));
  for ( let moved = true; want > 0 && moved; ) {
    moved = false;
    for ( const g of pool ) if ( want > 0 && g.left > 0 ) { g.left--; g.give++; want--; moved = true; }
  }
  const gifts = [{id: "sept", gnosis: Math.max(0, num(extra))}, ...pool.map(g => ({id: g.id, gnosis: g.give}))];
  const r = C.holdMoot(p, gifts, now());
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  const lines = [...r.lines];
  for ( const t of r.takes ) {
    const a = t.id === "sept" ? null : game.actors.get(t.id);
    if ( !a ) { lines.push(`The rest of the sept gives ${t.give} Gnosis.`); continue; }
    await a.update({"system.advantages.gnosis.temporary": garouOf(a).gnosis - t.give});
    lines.push(`${a.name} gives ${t.give} Gnosis.`);
    await tendCaern(a);
  }
  await update(placeId, x => ({...x, ...r.caern}), `Moot: ${r.given} of ${r.need} Gnosis.`);
  if ( r.wasLapsed ) await stepDrift(p.scene, "rite", "the Moot Rite is kept again");
  await Sites.onMoot(placeId, r.given); // B3584
  await say([`The moot at ${p.name}:`, ...lines], "A moot");
  return r;
}

export async function openCaern(placeId, actorId) {
  const p = caernAt(placeId), a = game.actors.get(actorId);
  if ( !p || !a ) return null;
  const g = garouOf(a);
  const r = C.openCaern(p, {wits: g.wits, rituals: g.rituals, gnosis: g.gnosis, willpower: g.willpower}, rand);
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  const lines = [`${a.name} performs the Rite of the Opened Caern at ${p.name} (Wits + Rituals at 7, ${r.turns} ${r.turns === 1 ? "turn" : "turns"}).`, r.line];
  if ( r.won && r.trait ) {
    // B3582: the gain of the Opened Caern comes out of a shared site
    const site = Sites.gate(placeId, r.gain);
    if ( site && site.take < r.gain ) { r.gain = site.take; lines.push(site.take ? `${site.name} is weakened: the caern gives less.` : `${site.name} is spent: the caern gives nothing.`); }
    const path = `system.advantages.${r.trait}.temporary`, cur = num(foundry.utils.getProperty(a, path)), perm = num(foundry.utils.getProperty(a, `system.advantages.${r.trait}.permanent`));
    const to = Math.min(Math.max(perm, 10), cur + r.gain);
    await a.update({[path]: to});
    lines.push(`${a.name} now has ${to}.`);
    await Sites.onDraw(placeId, "caern", r.gain, {by: a});
  }
  if ( r.botch ) lines.push("A botch at the Opened Caern can harm the ritemaster: the Storyteller decides how (W20 p. 206).");
  await update(placeId, x => x, `${a.name} opened the caern: ${r.won ? "it gave" : "it held"}.`);
  await say(lines, "The Opened Caern");
  return r;
}

export async function meetRaid(placeId, {bonus = 0, outcome = null} = {}) {
  const p = caernAt(placeId);
  if ( !p?.raid ) return null;
  const r = C.settleRaid(p, {bonus, outcome}, rand);
  await update(placeId, x => ({...x, ...r.caern}), r.lines.join(" "));
  if ( r.drift ) await stepDrift(p.scene, r.drift, "a raid on the caern");
  await say([`${p.name}: ${r.lines.join(" ")}`, outcome ? "" : `The sept rolls ${r.us} successes, the raid ${r.them}.`].filter(Boolean), "A raid on the caern");
  return r;
}

export async function caernWar(placeId, foe = {}) {
  const p = caernAt(placeId);
  if ( !p ) return null;
  const r = C.caernWar(p, foe, rand);
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  await update(placeId, x => ({...x, ...r.caern}), r.lines.join(" "));
  await say([...r.lines, `The defenders roll ${r.us} successes, the challengers ${r.them}.`], "A caern war");
  return r;
}

export async function reclaimCaern(placeId, side = {}) {
  const p = caernAt(placeId);
  if ( !p ) return null;
  const r = C.reclaim(p, side, rand);
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  await update(placeId, x => ({...x, ...r.caern}), r.lines.join(" "));
  if ( r.won ) await stepDrift(p.scene, "mend", "the caern is cleansed and taken back");
  await say(r.lines, "A caern taken back");
  return r;
}

export async function raiseCaern(placeId, offered = 0) {
  const p = caernAt(placeId);
  if ( !p ) return null;
  const r = C.raiseCaern(p, offered);
  if ( !r.ok ) { ui.notifications.warn(`${p.name}: ${r.why}`); return r; }
  await update(placeId, x => ({...x, ...r.caern}), `Grew to level ${r.caern.level}.`);
  await stepDrift(p.scene, "rite", "the caern grows");
  await say([`${p.name} grows to level ${r.caern.level}: Gauntlet ${C.gauntletFor(r.caern.level)}, Moon Bridges to ${C.bridgeMiles(r.caern.level).toLocaleString("en")} miles.`], "A caern grows");
  return r;
}

/** The caern's acts from the window: ask what is needed, then do it. */
async function caernAct(id, act) {
  const p = caernAt(id);
  if ( !p ) return;
  if ( act === "moot" ) {
    const garou = all(game.actors).filter(a => a.type === "Werewolf" || p.keepers.includes(a.id));
    const r = await ask(`A moot at ${p.name}`, `${searchBox("select[name=who]", "Search Garou…", "Search Garou")}
      <label>Garou at the moot <select name="who" multiple size="8">${garou.map(a => opt(a.id, `${a.name} (Gnosis ${garouOf(a).gnosis})`, p.keepers.includes(a.id))).join("")}</select></label>
      <label>Gnosis from the rest of the sept <input type="number" name="extra" min="0" max="200" value="0"></label>
      <p class="hint">The Moot Rite needs ${C.mootNeed(p.level)} Gnosis to fill a level ${p.level} caern (5 a level, W20 p. 206). Each Garou gives a point in turn until it is full.</p>`, "Hold the moot");
    if ( r ) await holdMoot(id, r.who, {extra: num(r.extra)});
  } else if ( act === "open" ) {
    const who = await pickActors(`Open ${p.name}`, {pre: p.offices.rite ? [p.offices.rite] : p.keepers});
    if ( who?.who?.[0] ) await openCaern(id, who.who[0]);
  } else if ( act === "raid" ) {
    const r = await ask("Meet the raid", `<p>${esc(p.raid?.what ?? "")} (${p.raid?.foe === "weaver" ? "the Weaver" : "the Wyrm"}, strength ${p.raid?.strength ?? 0}).</p>
      <label>How it goes <select name="outcome" data-fixed>${opt("", "Roll it: the sept against the raid")}${opt("held", "The players drove it off")}${opt("lost", "The caern is hurt")}${opt("overrun", "The caern is overrun")}</select></label>
      <label>Extra dice for what the players did <input type="number" name="bonus" min="0" max="10" value="0"></label>
      <p class="hint">The sept rolls ${C.defencePool(p)} dice (half its Garou, the Warder, the Gatekeeper and the caern's level) against twice the raid's strength.</p>`, "Settle it");
    if ( r ) await meetRaid(id, {bonus: num(r.bonus), outcome: r.outcome || null});
  } else if ( act === "war" ) {
    const r = await ask(`A caern war at ${p.name}`, `<label>The challenging sept <input type="text" name="sept" placeholder="Sept of the Broken Oak"></label>
      <label>Its Garou <input type="number" name="garou" min="1" max="200" value="8"></label>
      <label>Its best rank <input type="number" name="rank" min="0" max="6" value="3"></label>
      <label>Best rank among the defenders <input type="number" name="defRank" min="0" max="6" value="3"></label>
      <label>Extra dice for the defenders <input type="number" name="bonus" min="-10" max="10" value="0"></label>`, "Fight it out");
    if ( r ) await caernWar(id, {sept: r.sept, garou: num(r.garou), rank: num(r.rank), defRank: num(r.defRank), bonus: num(r.bonus)});
  } else if ( act === "reclaim" ) {
    const r = await ask(`Take back ${p.name}`, `<label>Garou who come <input type="number" name="garou" min="1" max="200" value="8"></label>
      <label>Their best rank <input type="number" name="rank" min="0" max="6" value="3"></label>
      <label>Extra dice <input type="number" name="bonus" min="-10" max="10" value="0"></label><p class="hint">Three successes at 7 take it back, cleansed to level 1.</p>`, "Take it back");
    if ( r ) await reclaimCaern(id, {garou: num(r.garou), rank: num(r.rank), bonus: num(r.bonus)});
  } else if ( act === "raise" ) {
    const r = await ask(`${p.name} grows`, `<label>Gnosis offered at the rite <input type="number" name="offered" min="0" max="400" value="${C.riseCost(p.level)}"></label>
      <p class="hint">${C.riseCost(p.level)} Gnosis raises a level ${p.level} caern a level, as the Rite of Caern Building asks (W20 p. 208). Take it from the Garou on their sheets.</p>`, "Raise it");
    if ( r ) await raiseCaern(id, num(r.offered));
  }
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
  } else if ( p.kind === "caern" ) {
    const garou = all(game.actors).filter(a => a.type === "Werewolf");
    const holder = k => `<select name="o.${k}" data-fixed>${opt("", "Nobody")}${p.offices[k] && !game.actors.get(p.offices[k]) ? opt(p.offices[k], p.offices[k], true) : ""}${garou.map(a => opt(a.id, a.name, a.id === p.offices[k])).join("")}</select>`;
    const sug = C.masterOfTheRite(garou.map(garouOf));
    body = `<label>Level <input type="number" name="level" min="0" max="5" value="${p.level}"></label>
      <label>Kind <select name="type" data-fixed>${Object.entries(C.CAERN_TYPES).map(([k, v]) => opt(k, `${v.label}: ${v.power}`, k === p.type)).join("")}</select></label>
      <label>Totem <input type="text" name="totem" value="${esc(p.totem)}" placeholder="Stag, Owl, Grandfather Thunder…"></label>
      <label>Sept <input type="text" name="sept" value="${esc(p.sept)}" placeholder="Sept of the Winter Spring"></label>
      <label>Tribes <input type="text" name="tribes" value="${esc(p.tribes)}"></label>
      <label>Garou in the sept <input type="number" name="garou" min="0" max="500" value="${p.garou}"></label>
      <label>State <select name="status" data-fixed>${Object.entries(C.STATUS).map(([k, v]) => opt(k, v, k === p.status)).join("")}</select></label>
      <label><input type="checkbox" name="urban" ${p.urban ? "checked" : ""}> An urban caern (the Weaver presses harder)</label>
      <label><input type="checkbox" name="raids" ${p.raids ? "checked" : ""}> Raids come on the clock</label>
      <fieldset><legend>Offices</legend>${Object.entries(C.OFFICES).map(([k, o]) => `<label>${esc(o.label)} ${holder(k)}</label>`).join("")}</fieldset>
      <p class="hint">Offices of consequence (Warder, Master of the Rite, Gatekeeper) go to Adren and up; the Master of the Rite is the sept's highest-ranking Theurge${sug ? ` (here ${esc(nameOf(sug))})` : ""} (W20 pp. 55-56, 252). A level ${p.level} caern has a Gauntlet of ${C.gauntletFor(p.level)} and needs ${C.mootNeed(p.level)} Gnosis at each monthly moot (W20 pp. 206, 311).</p>`;
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
  } else if ( p.kind === "caern" ) {
    const offices = Object.fromEntries(Object.keys(C.OFFICES).map(k => [k, res[`o.${k}`] || null]).filter(([, v]) => v));
    next = {...next, level: res.level, type: res.type, totem: res.totem, sept: res.sept, tribes: res.tribes, garou: res.garou, status: res.status,
      urban: res.urban === "on", raids: res.raids === "on", offices, ...(res.status !== p.status && ["held", "lapsed"].includes(res.status) ? {lastMoot: now(), missed: 0} : {})};
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

const caernOptions = p => {
  const live = p.status === "held" || p.status === "lapsed";
  return (live ? opt("moot", "Hold the moot") + opt("open", "Open the caern") + opt("war", "A caern war") : opt("reclaim", "Take it back"))
    + (p.raid ? opt("raid", "Meet the raid") : "") + (p.ready ? opt("raise", "Raise it a level") : "");
};

export async function powerDialog() {
  if ( !game.user.isGM ) return;
  await run({quiet: true});
  const st = state(), y = yearNow();
  const rows = st.list.map(p => `<tr data-id="${esc(p.id)}"><td>${esc(P.KINDS[p.kind])}</td><td>${esc(P.describe(p, {year: y}))}<br><small>${esc(sceneName(p.scene))}; kept by ${p.keepers.length ? esc(p.keepers.map(nameOf).join(", ")) : "nobody"}</small></td>
    <td><select name="act.${esc(p.id)}" aria-label="What to do at ${esc(p.name)}" data-fixed>${opt("", "…")}${opt("edit", "Edit")}${p.kind === "node" ? opt("meditate", "Meditate for Quintessence") + opt("tass", "Gather Tass") : ""}${p.kind === "freehold" ? opt("dream", "Dream by the balefire") + opt("reave", "Reave the balefire") + opt("destroy", "Mark destroyed") : ""}${p.kind === "chantry" ? opt("leave", "A member leaves") : ""}${p.kind === "caern" ? caernOptions(p) : ""}${opt("remove", "Take off the register")}</select></td></tr>`).join("");
  const content = `<p>Nodes, chantries, freeholds and caerns in ${y}. Nodes fill week by week; freeholds give Glamour for a night by the balefire and win back lost ranks over time. Carried Tass becomes Quintessence for a mage with Prime 3 (Absorb Tass). A caern needs its Moot Rite each month, and raids come to it on the clock.</p>
    ${st.list.length > 5 ? searchBox("table.wst-power-t", "Search places…", "Search places") : ""}
    <div class="wst-scroll"><table class="wst-power-t"><thead><tr><th>Kind</th><th>Place</th><th>Do</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>No places of power yet.</td></tr>"}</tbody></table></div>
    ${on() ? "" : "<p class='hint'>Places of power are switched off in the settings: the clock leaves them as they are.</p>"}
    <p class="hint">M20 pp. 309-310 and 320-321, 332; C20 pp. 170 and 311-314; W20 pp. 55-56, 206-208, 252, 310-311.</p>`;
  const res = await DialogV2().wait({rejectClose: false, position: {width: 760}, window: {title: "Places of power", resizable: true}, classes: ["wodx-dialog", "wst-power"], content,
    buttons: [{action: "do", label: "Do it", default: true, callback: (ev, b) => ({act: Object.fromEntries(new FormData(b.form))})},
      {action: "node", label: "New Node"}, {action: "chantry", label: "New chantry"}, {action: "freehold", label: "New freehold"}, {action: "caern", label: "New caern"}, {action: "absorb", label: "Absorb Tass"}, {action: "close", label: "Close"}]});
  if ( ["node", "chantry", "freehold", "caern"].includes(res) ) { await editPlace(null, res); return powerDialog(); }
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
    else if ( p.kind === "caern" ) await caernAct(id, act);
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
export const api = () => ({open: powerDialog, state, on, run, edit: editPlace, remove: removePlace, meditate, gatherTass, absorbTass, dream, reave, memberLeaves, destroy, placesIn, rules: P,
  caern: {moot: holdMoot, open: openCaern, raid: meetRaid, war: caernWar, reclaim: reclaimCaern, raise: raiseCaern, rules: C}});
