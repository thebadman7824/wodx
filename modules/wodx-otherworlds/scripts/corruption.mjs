/**
 * Spreading Wyrm corruption, the Foundry side (rules in corruption-rules.mjs). Decisions B3270-B3276.
 *
 * Scene flag wodx-otherworlds.corruption {level, banes, sources, links, ward, caern, quiet, floor, log}: only scenes the
 * Storyteller has set up take part. Actor flag wodx-otherworlds.taint {level, weeks, innate, where, proposed, ridden}.
 * World setting wyrmCorruption: off (the default, and Live stays off), suggest (each week waits in the approval queue)
 * or auto (the week applies with one Undo card for the Storyteller). Hidden setting corruptionState {last}.
 *
 * Runs on the active Storyteller's client once a week of world time (checked at most once a game hour, never during a
 * skip) and when a time skip ends (up to ten years at once). A band change asks the Gauntlet to drift through the
 * existing drift proposal; a new Pentex concern and a Bane riding someone are only ever proposed.
 */
import * as R from "./corruption-rules.mjs";
import {MODULE_ID} from "./ratings.mjs";
import {T_DRIFT} from "./drift.mjs";
import {sheetNature} from "./senses.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";

export const T_TURN = `${MODULE_ID}.corruption`;
export const T_PENTEX = `${MODULE_ID}.pentex`;
export const T_RIDDEN = `${MODULE_ID}.ridden`;
const FLAG = "corruption", TAINT = "taint";
const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
const latitude = () => { try { return Number(game.settings.get("wodx-chronicle", "latitude")) || 50.1; } catch (e) { return 50.1; } };
export const yearAt = t => { try { return describeTime(t, latitude()).year; } catch (e) { return chron()?.eras?.currentYear?.() ?? 1197; } };
const mode = () => { try { return game.settings.get(MODULE_ID, "wyrmCorruption"); } catch (e) { return "off"; } };
const turnState = () => { try { return {last: null, ...(game.settings.get(MODULE_ID, "corruptionState") ?? {})}; } catch (e) { return {last: null}; } };
const saveTurn = patch => game.settings.set(MODULE_ID, "corruptionState", {...turnState(), ...patch});
const nameOf = s => s?.navName || s?.name || "A place";

export function registerCorruptionSettings() {
  game.settings.register(MODULE_ID, "wyrmCorruption", {name: "Wyrm corruption spreads", scope: "world", config: true, type: String, default: "off",
    choices: {off: "Off", suggest: "Suggest (each week waits in the approval queue)", auto: "Auto (applies, with an Undo card)"},
    hint: "Once a week of game time, places you have marked as tainted grow worse from what feeds them, Banes breed, and blighted places spread to the places linked to them. People who live there take on taint. House rules on the W20 spirit world. Nothing happens until you set up a place in the Wyrm corruption window."});
  game.settings.register(MODULE_ID, "corruptionState", {scope: "world", config: false, type: Object, default: {last: null}});
}

export const placeOf = scene => R.normPlace(scene?.flags?.[MODULE_ID]?.[FLAG] ?? {});
export const tracked = () => game.scenes.filter(s => s.flags?.[MODULE_ID]?.[FLAG]);
export const taintOf = actor => R.normTaint(actor?.flags?.[MODULE_ID]?.[TAINT] ?? {});
const strip = p => { const {changed, ...rest} = p; return rest; };

export async function setPlace(scene, place) {
  if ( !game.user.isGM || !scene ) return null;
  const p = strip(R.normPlace(place));
  await scene.update({[`flags.${MODULE_ID}.${FLAG}`]: p});
  return p;
}
export async function setTaint(actor, taint) {
  if ( !game.user.isGM || !actor ) return null;
  const {changed, ripened, pains, ...t} = R.normTaint(taint);
  await actor.update({[`flags.${MODULE_ID}.${TAINT}`]: t});
  return t;
}

/** Whether Sense Wyrm finds an actor: vampires always (W20), anyone with taint, a fomor once ridden. */
export function senseWyrm(actor) {
  if ( !actor ) return false;
  return R.registersAsWyrm(taintOf(actor)) || sheetNature(actor) === "vampire";
}

/** Linked actors standing on a scene: the people who live with its corruption. */
const residents = scene => [...new Map((scene?.tokens?.contents ?? [...(scene?.tokens ?? [])]).filter(t => t.actorLink && t.actor).map(t => [t.actor.id, t.actor])).values()];

/* ---------------- The weekly turn ---------------- */

/** Work out a turn without saving anything: places, people, the Gauntlet and Pentex. */
export function planTurn({now = game.time.worldTime, last = turnState().last, rng = Math.random} = {}) {
  const weeks = Math.floor((now - last) / R.WEEK);
  if ( !(weeks > 0) ) return null;
  const scenes = tracked();
  const places = Object.fromEntries(scenes.map(s => [s.id, {name: nameOf(s), place: placeOf(s)}]));
  const r = R.runWeeks(places, weeks, {start: last, yearAt, rng});
  // People: each week a resident spends in a blighted place, counted on the new levels (a fair middle for a skip)
  const people = [];
  for ( const s of scenes ) {
    const lvl = Math.max(placeOf(s).level, r.places[s.id]?.level ?? 0);
    if ( R.bandIndex(lvl) < 2 ) continue;
    for ( const a of residents(s) ) {
      let t = taintOf(a), ripened = false, moved = false;
      for ( let i = 0; i < Math.min(r.weeks, 52); i++ ) {
        const x = R.exposeWeek(t, lvl, {nature: sheetNature(a), where: nameOf(s)});
        if ( x.changed ) moved = true;
        ripened ||= x.ripened;
        const {changed, ripened: _r, ...rest} = x;
        t = rest;
      }
      if ( moved ) people.push({actor: a.id, name: a.name, before: taintOf(a), after: t, ripened, pc: !!a.hasPlayerOwner});
    }
  }
  // Pentex: once for each new year the turn crosses
  const pentex = [];
  const y0 = yearAt(last), y1 = yearAt(now);
  for ( let y = y0 + 1; y <= y1 && y <= y0 + 10; y++ ) for ( const g of R.pentexYear(Object.fromEntries(Object.entries(r.places).map(([id, p]) => [id, {place: p}])), {year: y, rng}) )
    pentex.push({...g, year: y, fromName: places[g.from]?.name, toName: places[g.to]?.name});
  return {weeks: r.weeks, settled: r.settled, places: r.places, events: r.events, bands: r.bands, people, pentex, names: Object.fromEntries(scenes.map(s => [s.id, nameOf(s)])), now};
}

const bandLabel = id => R.BANDS.find(b => b.id === id)?.label ?? id;
export function describeTurn(plan) {
  const lines = [];
  for ( const b of plan.bands ) lines.push(`${plan.names[b.id]}: ${bandLabel(b.from)} to ${bandLabel(b.to)}`);
  const spread = plan.events.filter(e => e.kind === "spread");
  for ( const e of spread ) lines.push(`Taint spread from ${plan.names[e.from]} to ${plan.names[e.id]}`);
  const bred = plan.events.filter(e => e.kind === "breed").length;
  if ( bred ) lines.push(`${bred} Bane${bred === 1 ? "" : "s"} bred`);
  for ( const p of plan.people ) if ( p.after.level !== p.before.level ) lines.push(`${p.name}: ${R.TAINT_STEPS[p.after.level].label.toLowerCase()}`);
  return lines;
}

/** Save a planned turn. Returns the snapshot for Undo. */
export async function applyTurn(plan) {
  const snap = {scenes: {}, actors: {}};
  for ( const [id, p] of Object.entries(plan.places ?? {}) ) {
    const s = game.scenes.get(id);
    if ( !s ) continue;
    snap.scenes[id] = s.flags?.[MODULE_ID]?.[FLAG] ?? null;
    await setPlace(s, p);
  }
  for ( const p of plan.people ?? [] ) {
    const a = game.actors.get(p.actor);
    if ( !a ) continue;
    snap.actors[p.actor] = a.flags?.[MODULE_ID]?.[TAINT] ?? null;
    await setTaint(a, p.after);
  }
  await followUps(plan);
  return snap;
}

/** What a turn asks of the Storyteller afterwards: Gauntlet drift, Pentex growth, a Bane that could ride someone. */
async function followUps(plan) {
  const c = chron();
  if ( !c?.propose ) return;
  const stamp = Math.floor((plan.now ?? 0) / R.WEEK);
  for ( const b of plan.bands ) {
    const kind = R.driftFor(b);
    if ( !kind ) continue;
    await c.propose({type: T_DRIFT, key: `corrupt-drift:${b.id}:${stamp}`, title: `The Gauntlet at ${plan.names[b.id]} ${kind === "taint" ? "thickens" : "eases"}`,
      detail: `${plan.names[b.id]} went from ${bandLabel(b.from).toLowerCase()} to ${bandLabel(b.to).toLowerCase()}. Drift ${kind === "taint" ? "+1" : "−1"} (house rule).`,
      data: {sceneId: b.id, kind, why: `Wyrm corruption: ${b.to}`}});
  }
  for ( const g of plan.pentex ?? [] ) await c.propose({type: T_PENTEX, key: `pentex:${g.to}:${g.year}`, title: `A Pentex concern opens at ${g.toName}`,
    detail: `In ${g.year} the concern at ${g.fromName} reaches out along the road and opens another at ${g.toName} (house rule). Approve to add it as a source there.`,
    data: {sceneId: g.to, from: g.from, year: g.year}});
  for ( const p of plan.people ?? [] ) {
    if ( !p.ripened || p.after.proposed ) continue;
    await c.propose({type: T_RIDDEN, key: `ridden:${p.actor}`, title: `A Bane could ride ${p.name}`,
      detail: `${p.name} has lived too long with the taint at ${p.after.where || "home"}. Approve if a Bane takes them: they become fomor, and Sense Wyrm finds them from now on. Nothing changes unless you approve.`,
      data: {actorId: p.actor}});
    const a = game.actors.get(p.actor);
    if ( a ) await setTaint(a, {...taintOf(a), proposed: true});
  }
}

export async function undoTurn(snap) {
  for ( const [id, v] of Object.entries(snap?.scenes ?? {}) ) {
    const s = game.scenes.get(id);
    if ( !s ) continue;
    if ( v === null ) await s.unsetFlag(MODULE_ID, FLAG); else await s.update({[`flags.${MODULE_ID}.${FLAG}`]: v});
  }
  for ( const [id, v] of Object.entries(snap?.actors ?? {}) ) {
    const a = game.actors.get(id);
    if ( !a ) continue;
    if ( v === null ) await a.unsetFlag(MODULE_ID, TAINT); else await a.update({[`flags.${MODULE_ID}.${TAINT}`]: v});
  }
}

let running = false;
/** One turn if a week or more has passed. `force` runs a single week now (the window's button). */
export async function run({force = false} = {}) {
  if ( running || !isActiveGM() ) return null;
  const m = mode();
  if ( m === "off" && !force ) return null;
  running = true;
  try {
    const now = game.time.worldTime, ts = turnState();
    if ( ts.last === null || ts.last === undefined ) { if ( !force ) { await saveTurn({last: now}); return null; } }
    const last = force ? now - R.WEEK : ts.last;
    if ( !tracked().length ) { await saveTurn({last: force ? ts.last ?? now : now}); return null; }
    const plan = planTurn({now, last});
    if ( !plan ) return null;
    const stamp = force ? (ts.last ?? now) : last + (plan.weeks + plan.settled) * R.WEEK;
    await saveTurn({last: stamp});
    const lines = describeTurn(plan);
    if ( m === "suggest" ) {
      if ( lines.length || plan.pentex.length ) await chron()?.propose?.({type: T_TURN, key: `corruption:${stamp}`, title: `Wyrm corruption: ${plan.weeks} week${plan.weeks === 1 ? "" : "s"}`,
        detail: lines.join(". ") || "Nothing shows, but the turn counts.", data: {plan}});
      return plan;
    }
    const snap = await applyTurn(plan);
    if ( lines.length ) await card(plan, lines, snap);
    return plan;
  } finally { running = false; }
}

async function card(plan, lines, snap) {
  return ChatMessage.create({speaker: {alias: "The Wyrm"}, whisper: gmIds(), flags: {[MODULE_ID]: {corruptionTurn: {snap, applied: true}}},
    content: `<div class="wodx-card wow-corruption"><h3>Wyrm corruption after ${plan.weeks} week${plan.weeks === 1 ? "" : "s"}</h3>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
      ${plan.settled ? `<p class="wodx-quiet">${plan.settled} more weeks passed; the turn reckons ten years at most.</p>` : ""}
      <p class="wodx-quiet">House rules. Only the Storyteller sees this. Undo puts every place and person here back as they were.</p>
      <div class="wodx-buttons"><button type="button" data-action="wow-corruption-undo">Undo</button></div></div>`});
}

/* ---------------- The Storyteller's window ---------------- */

const ACTIONS = {
  "": "No change", rite: "A Rite of Cleansing succeeded", ritedawn: "A Rite of Cleansing at dawn succeeded",
  cull1: "The pack culled one Bane", cullall: "The pack culled every Bane", unsource: "Remove the last source",
  unlink: "Clear the links", stop: "Stop tracking this place"
};

export async function corruptionDialog() {
  if ( !game.user.isGM ) return;
  const scenes = game.scenes.filter(s => !NOT_A_PLACE.test(s.name ?? ""));
  const year = chron()?.eras?.currentYear?.() ?? yearAt(game.time.worldTime);
  const srcOpts = `<option value="">Add a source…</option>${Object.entries(R.SOURCES).filter(([k]) => R.sourceAllowed(k, year)).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}`;
  const linkOpts = id => `<option value="">Link to…</option>${scenes.filter(s => s.id !== id).map(s => `<option value="${s.id}">${esc(nameOf(s))}</option>`).join("")}`;
  const actOpts = Object.entries(ACTIONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  const rows = scenes.map(s => {
    const on = !!s.flags?.[MODULE_ID]?.[FLAG], p = placeOf(s), b = R.bandOf(p.level), d = R.cleanseDifficulty(p.level);
    const src = p.sources.map(x => esc(R.SOURCES[x.kind].label.replace(/ \(.*\)$/, ""))).join(", ");
    const links = p.links.map(l => esc(nameOf(game.scenes.get(l)))).filter(Boolean).join(", ");
    return `<tr><td>${esc(nameOf(s))}</td>
      <td><input type="number" name="${s.id}.level" value="${on ? p.level : ""}" min="0" max="10" step="1" placeholder="—" aria-label="Corruption of ${esc(nameOf(s))}"></td>
      <td>${on ? `${esc(b.label)}${p.banes ? `, ${p.banes} Bane${p.banes === 1 ? "" : "s"}` : ""}${d ? `<br><span class="hint">Cleansing ${d}</span>` : ""}` : ""}</td>
      <td>${src}${links ? `<br><span class="hint">Linked: ${links}</span>` : ""}</td>
      <td><select name="${s.id}.source" data-fixed>${srcOpts}</select><select name="${s.id}.link" data-fixed>${linkOpts(s.id)}</select>
        <label><input type="checkbox" name="${s.id}.caern" ${p.caern ? "checked" : ""}> Tended caern</label>
        <select name="${s.id}.act" data-fixed>${actOpts}</select></td></tr>`;
  }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 900}, window: {title: "Wyrm corruption"}, classes: ["wodx-dialog", "wow-corruption"],
    content: `${scenes.length > 5 ? searchBox("table.wow-corruption-t", "Search places…", "Search places") : ""}<div class="wow-scroll"><table class="wow-corruption-t"><thead><tr><th>Place</th><th>Level</th><th>State</th><th>What feeds it</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">Give a place a level (0 to 10) to start tracking it. Each week what feeds it may deepen the taint, Banes breed once it is blighted (4+), and a blighted place with Banes can spread to the places linked to it. A tended caern, or a place cleansed in the last four weeks, holds it off. A Hellhole (10) never falls below 7. People who stay in a blighted place take on taint. Setting: ${esc(mode())}. House rules on W20.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))},
      {action: "week", label: "Run a week now", callback: () => "week"}, {action: "cancel", label: "Cancel"}]});
  if ( res === "week" ) return run({force: true});
  if ( !res || typeof res !== "object" ) return;
  const now = game.time.worldTime;
  for ( const s of scenes ) {
    const on = !!s.flags?.[MODULE_ID]?.[FLAG];
    const lv = res[`${s.id}.level`], act = res[`${s.id}.act`], srcK = res[`${s.id}.source`], link = res[`${s.id}.link`], caern = res[`${s.id}.caern`] === "on";
    if ( act === "stop" ) { if ( on ) await s.unsetFlag(MODULE_ID, FLAG); continue; }
    if ( !on && (lv === "" || lv === undefined) && !srcK ) continue;
    let p = placeOf(s);
    if ( lv !== "" && lv !== undefined && Number(lv) !== p.level ) p = {...p, level: Math.max(p.floor, Math.min(R.MAX, Math.round(Number(lv) || 0)))};
    if ( srcK && R.sourceAllowed(srcK, year) ) p = {...p, sources: [...p.sources, {kind: srcK, since: now}]};
    if ( link ) {
      p = {...p, links: [...p.links, link]};
      // Links run both ways
      const o = game.scenes.get(link);
      if ( o ) { const q = placeOf(o); if ( !q.links.includes(s.id) ) await setPlace(o, {...q, links: [...q.links, s.id]}); }
    }
    p = {...p, caern};
    if ( act === "rite" || act === "ritedawn" ) p = R.cleanse(p, {successes: 1, now});
    else if ( act === "cull1" ) p = R.cull(p, 1, {now});
    else if ( act === "cullall" ) p = R.cull(p, p.banes, {now});
    else if ( act === "unsource" ) p = {...p, sources: p.sources.slice(0, -1)};
    else if ( act === "unlink" ) p = {...p, links: []};
    await setPlace(s, p);
  }
}

/* ---------------- Approvals and hooks ---------------- */

export function registerCorruptionHandlers() {
  const c = chron();
  c?.registerApprovalHandler?.(T_TURN, {label: "Wyrm corruption (a week)", approve: async e => { if ( e.data?.plan ) await applyTurn(e.data.plan); }});
  c?.registerApprovalHandler?.(T_PENTEX, {label: "A Pentex concern opens", approve: async e => {
    const s = game.scenes.get(e.data?.sceneId);
    if ( !s ) return;
    const p = placeOf(s);
    if ( !p.sources.some(x => x.kind === "pentex") ) await setPlace(s, {...p, sources: [...p.sources, {kind: "pentex", since: game.time.worldTime, name: "A Pentex concern"}]});
  }});
  c?.registerApprovalHandler?.(T_RIDDEN, {label: "A Bane rides someone", approve: async e => {
    const a = game.actors.get(e.data?.actorId);
    if ( a ) await setTaint(a, {...taintOf(a), ridden: true});
  }});
}

export function setupCorruption() {
  let lastHour = -1;
  Hooks.on("updateWorldTime", () => {
    const hour = Math.floor((game.time.worldTime ?? 0) / 3600);
    if ( hour === lastHour || skipping() || !isActiveGM() ) return;
    lastHour = hour;
    run().catch(e => console.error(`${MODULE_ID} | corruption`, e));
  });
  Hooks.on("wodxSkipEnd", () => { if ( isActiveGM() ) run().catch(e => console.error(`${MODULE_ID} | corruption`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const f = message.flags?.[MODULE_ID]?.corruptionTurn;
    const b = f && html?.querySelector?.("[data-action=wow-corruption-undo]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.disabled = !f.applied;
    b.addEventListener("click", async () => {
      b.disabled = true;
      try { await undoTurn(f.snap); await message.update({[`flags.${MODULE_ID}.corruptionTurn.applied`]: false}); } catch (e) { console.error(`${MODULE_ID} |`, e); }
    });
  });
}
