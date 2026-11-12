import * as L from "./ledger-rules.mjs";
import {MOD, esc, chron, npc, isActiveGM, setting, mutate as mutateSetting, log, isPC, pcs} from "./core.mjs";
import {getEngine, describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * The ledger (WoDX Storyteller 0.2.0): oaths, debts, boons and consequences, the Veil track, and heirs and
 * succession.
 *   Due dates   An open entry with a date fires once when the clock passes it: a card for the Storyteller and a line
 *               on the tracker ("Comes due"). A time skip lists everything it crossed on one card. Held or mid-skip,
 *               nothing fires until the world moves again.
 *   The Veil    One track for the chronicle, 10 (sound) to 0 (torn). Each recorded breach lowers it by its severity,
 *               at once, with an Undo on the card; each 30 quiet days mend it a step. Its band shows on the tracker.
 *   Heirs       When someone in the ledger dies, each open entry naming them goes to the approval queue: pass it to
 *               their heir (the character made by Pass the Years, or one named in the window), or let it die with them.
 *               When a faction's leader dies, the queue proposes the successor (the heir if a member, else the first
 *               living member).
 */

export const T = {inherit: `${MOD}.inherit`, succeed: `${MOD}.succeed`};
const CREATION = "wodx-creation";
const now = () => game.time?.worldTime ?? 0;
const dateOf = t => { try { return describeTime(Number(t) || 0).dateLabel; } catch { return ""; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch { return false; } };

export function registerLedgerSettings() {
  game.settings.register(MOD, "ledger", {scope: "world", config: false, type: Object, default: L.blankLedger(), onChange: () => LedgerApp.refresh()});
  game.settings.register(MOD, "veilOn", {name: "Veil track", hint: "Breaches lower the chronicle's Veil track; quiet months mend it.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "ledgerTraits", {scope: "world", config: false, type: Array, default: []});
}

/* ---- Merits and flaws that open entries (WoDX Chronicle 0.22.0, pattern P10) ---- */

/**
 * Active GM: open a Ledger entry for each Boon, Dark Secret, Old Flame and the like on a player character, once. The
 * ids opened are remembered, so an entry the Storyteller deletes stays deleted. Returns the entries opened.
 */
let syncing = Promise.resolve([]);
export function syncTraits(actors = null) {
  syncing = syncing.then(() => _syncTraits(actors)).catch(e => { console.error(`${MOD} |`, e); return []; });
  return syncing;
}
async function _syncTraits(actors) {
  const T = chron()?.traits;
  if ( !isActiveGM() || !T?.ledgerFor ) return [];
  const seen = new Set(setting("ledgerTraits") ?? []);
  const have = new Set(ledger().entries.map(e => e.id));
  const made = [];
  for ( const a of (actors ?? pcs()).filter(isPC) ) {
    for ( const e of T.ledgerFor(a, now()) ) {
      if ( seen.has(e.id) || have.has(e.id) ) continue;
      made.push(await saveEntry(e));
      seen.add(e.id);
    }
  }
  if ( made.length ) {
    await game.settings.set(MOD, "ledgerTraits", [...seen].slice(-500));
    await log({kind: "ledger", text: `The Ledger opened ${made.length} entr${made.length === 1 ? "y" : "ies"} from merits and flaws: ${made.map(e => e.what.split(":")[0]).join(", ")}.`});
  }
  return made;
}

export const ledger = () => L.normLedger(setting("ledger"));
const mutate = fn => mutateSetting("ledger", cur => fn(L.normLedger(cur)));

/** Add or change an entry. Returns it. */
export async function saveEntry(raw) {
  const e = L.normEntry({made: now(), ...raw});
  await mutate(s => {
    const i = s.entries.findIndex(x => x.id === e.id);
    if ( i >= 0 ) { if ( s.entries[i].due !== e.due ) e.announced = false; s.entries[i] = e; } else s.entries.push(e);
    return {value: s};
  });
  return e;
}

export async function setStatus(id, status) {
  let settled = null;
  const out = await mutate(s => {
    const e = s.entries.find(x => x.id === id);
    if ( e ) {
      if ( e.kind === "boon" && e.status === "open" && (status === "kept" || status === "broken") ) settled = JSON.parse(JSON.stringify(e));
      e.status = status; e.history.push({at: now(), what: `Marked ${L.STATUS[status] ?? status}.`});
    }
    return {value: s};
  });
  // Storyteller 0.31.0: a boon kept or broken moves the debtor's standing in WoDX NPC's courts
  if ( settled && globalThis.Hooks ) Hooks.callAll("wodxBoonSettled", {entry: settled, status});
  return out;
}

export async function removeEntry(id) {
  return mutate(s => ({value: {...s, entries: s.entries.filter(x => x.id !== id)}}));
}

/* ---- Due dates ---- */

let checking = Promise.resolve();
export function checkDue({label = "", force = false} = {}) {
  checking = checking.then(() => _checkDue(label, force)).catch(e => console.error(`${MOD} |`, e));
  return checking;
}

async function _checkDue(label, force = false) {
  // `force` checks even while the world is held (the gate uses it)
  if ( !isActiveGM() || (skipping() && !force) ) return {due: []};
  const t = now();
  const cur = ledger();
  const due = L.comingDue(cur, t);
  const back = L.noLongerDue(cur, t);
  if ( !due.length && !back.length ) return {due: []};
  await mutate(s => {
    for ( const e of s.entries ) {
      if ( due.some(d => d.id === e.id) ) e.announced = true;
      if ( back.some(d => d.id === e.id) ) e.announced = false;
    }
    return {value: s};
  });
  if ( due.length ) {
    const line = e => `<li><strong>${esc(dateOf(e.due))}: ${esc(L.KINDS[e.kind].split(" (")[0])}${e.size ? ` (${esc(L.BOONS[e.size])})` : ""}.</strong> ${esc(e.from.name)}${e.to.name ? ` to ${esc(e.to.name)}` : ""}: ${esc(e.what)}</li>`;
    await ChatMessage.create({content: `<div class="wodx-card wodx-ledger"><h3>Comes due${label && due.length > 1 ? ` during ${esc(label)}` : ""}</h3><ul>${due.map(line).join("")}</ul><p class="wodx-quiet">Mark each kept, paid or broken in the Ledger.</p></div>`,
      speaker: {alias: "Ledger"}, whisper: game.users.filter(u => u.isGM).map(u => u.id)});
    for ( const e of due ) await log({kind: "ledger", attention: "Comes due", name: e.from.name, text: `${L.KINDS[e.kind].split(" (")[0]} comes due: ${e.what}`});
  }
  return {due: due.map(e => e.id), back: back.map(e => e.id)};
}

/* ---- The Veil ---- */

export async function moveVeil(delta, why) {
  let result;
  await mutate(s => {
    result = L.moveVeil(s.veil, delta);
    s.veil.value = result.value;
    if ( delta < 0 ) s.veil.lastBreach = now(); else s.veil.lastRise = now();
    s.veil.log.push({at: now(), delta, value: result.value, why: String(why ?? "")});
    return {value: s};
  });
  return result;
}

export async function onBreach(p) {
  if ( !isActiveGM() || !setting("veilOn") ) return null;
  const sev = L.breachSeverity(p?.entry);
  const r = await moveVeil(-sev, `Breach: ${p?.entry?.event ?? "recorded"}`);
  const band = L.veilBand(r.value);
  await ChatMessage.create({
    content: `<div class="wodx-card wodx-ledger" data-veil-undo="${sev}"><h3>The Veil: ${r.before} to ${r.value}</h3><p>A breach of severity ${sev}.${r.crossed ? ` The Veil is now <strong>${esc(band.name)}</strong>: ${esc(band.note)}` : ""}</p>
      <button type="button" data-action="wodx-veil-undo"><i class="fa-solid fa-rotate-left"></i> Undo</button></div>`,
    speaker: {alias: "Ledger"}, whisper: game.users.filter(u => u.isGM).map(u => u.id), flags: {[MOD]: {veilUndo: sev}}});
  await log({kind: "veil", attention: r.crossed ? "The Veil changed band" : null, text: `The Veil fell to ${r.value} (${band.name}).`});
  return r;
}

export async function mend() {
  if ( !isActiveGM() || skipping() || !setting("veilOn") ) return 0;
  const steps = L.mendSteps(ledger().veil, now());
  if ( steps > 0 ) {
    const r = await moveVeil(steps, "Quiet weeks");
    await log({kind: "veil", text: `The Veil mended to ${r.value} (${L.veilBand(r.value).name}).`});
  }
  return steps;
}

export function bindVeilUndo(msg, el) {
  const sev = msg?.flags?.[MOD]?.veilUndo;
  if ( !sev || !game.user.isGM ) return;
  const b = el?.querySelector?.("[data-action=wodx-veil-undo]");
  b?.addEventListener("click", async () => {
    await moveVeil(sev, "Undo");
    b.disabled = true;
    await msg.update?.({[`flags.${MOD}.veilUndo`]: 0});
  });
}

/* ---- Heirs and succession ---- */

const lineageOf = a => a?.flags?.[CREATION]?.lineage ?? {};
const diedOf = a => a?.flags?.[CREATION]?.chronology?.died;
/** The dead's heir: one Pass the Years made (heirOf), or one named in the ledger window. */
export function heirOf(deadId) {
  const named = ledger().heirs?.[deadId];
  if ( named && game.actors.get(named) ) return game.actors.get(named);
  return game.actors.find(a => lineageOf(a)?.family?.heirOf?.id === deadId && (diedOf(a) === undefined || diedOf(a) === null)) ?? null;
}

const seen = new Set();
/** Someone died (a death date set, or the actor deleted): queue what their death changes. */
export async function onDeath(dead) {
  if ( !isActiveGM() || !dead?.id || seen.has(dead.id) ) return;
  seen.add(dead.id);
  const heir = heirOf(dead.id);
  const c = chron();
  for ( const row of L.inheritance(ledger(), dead.id, heir) ) {
    const e = row.entry;
    await c?.propose?.({type: T.inherit, key: `inherit:${e.id}`,
      title: heir ? `${dead.name} died: pass "${e.what}" to ${heir.name}?` : `${dead.name} died with "${e.what}" open`,
      detail: heir ? `The heir takes ${dead.name}'s side of this ${L.KINDS[e.kind].split(" (")[0].toLowerCase()}. Reject it to let it die with them.` : "No heir is known. Approve to mark it cancelled; reject to keep it open.",
      data: {entry: e.id, side: row.side, heir: heir?.id ?? null, heirName: heir?.name ?? null, dead: dead.name}});
  }
  // Factions whose leader this was
  const n = npc();
  const fs = n?.factions?.state?.()?.factions ?? [];
  for ( const f of fs.filter(f => f.leader === dead.id) ) {
    const next = L.successor(f, dead.id, {heirOf: id => heirOf(id)?.id ?? null, alive: id => { const a = game.actors.get(id); return !!a && (diedOf(a) === undefined || diedOf(a) === null); }});
    const who = next ? game.actors.get(next) : null;
    await c?.propose?.({type: T.succeed, key: `succeed:${f.id}`,
      title: who ? `${f.name}: ${who.name} succeeds ${dead.name}?` : `${f.name} has lost its leader, ${dead.name}`,
      detail: who ? "Approve to make them the leader. Reject to choose another in the Factions window." : "No living member can lead. Choose one in the Factions window.",
      data: {faction: f.id, leader: who?.id ?? null}});
  }
}

export function registerLedgerHandlers() {
  const c = chron();
  c?.registerApprovalHandler?.(T.inherit, {label: "Inheritance",
    approve: async ({data}) => {
      if ( data.heir ) {
        const heir = game.actors.get(data.heir);
        if ( !heir ) return;
        await mutate(s => {
          const i = s.entries.findIndex(x => x.id === data.entry);
          if ( i >= 0 ) s.entries[i] = L.passToHeir(s.entries[i], data.side, heir, data.dead);
          return {value: s};
        });
      } else await setStatus(data.entry, "void");
    }
  });
  c?.registerApprovalHandler?.(T.succeed, {label: "Succession",
    approve: async ({data}) => {
      if ( !data.leader ) return;
      await npc()?.factions?.mutate?.(s => { const f = s.factions.find(x => x.id === data.faction); if ( f ) f.leader = data.leader; return {state: s}; });
    }
  });
}

export function registerLedgerHooks() {
  Hooks.on("updateWorldTime", () => { if ( !skipping() ) { checkDue(); mend(); } });
  Hooks.on("wodxSkipEnd", info => { if ( !chron()?.isHeld?.() ) { checkDue({label: info?.label || "the time skip"}); mend(); } });
  Hooks.on("wodxBreach", p => { onBreach(p).catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateActor", (actor, change) => {
    const d = change?.flags?.[CREATION]?.chronology?.died;
    if ( d !== undefined && d !== null ) onDeath(actor).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.on("deleteActor", actor => {
    // An actor sent to the archive of the dead is not a new death
    const archived = (() => { try { return !!game.settings.get(CREATION, "archived")?.[actor.id]; } catch { return false; } })();
    if ( !archived && (diedOf(actor) === undefined || diedOf(actor) === null) ) onDeath(actor).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.on("renderChatMessageHTML", (msg, el) => bindVeilUndo(msg, el?.[0] ?? el));
  // A merit or flaw added to a player character, or matched in the Trait effects window
  const onItem = item => { if ( item?.type === "Feature" && isPC(item.parent) ) syncTraits([item.parent]); };
  Hooks.on("createItem", onItem);
  Hooks.on("updateItem", (item, change) => { if ( change?.flags?.["wodx-chronicle"] || change?.name ) onItem(item); });
  Hooks.once("ready", () => { setTimeout(() => syncTraits(), 2000); });
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}" ${k === cur ? "selected" : ""}>${esc(v)}</option>`).join("");

export class LedgerApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-ledger",
    classes: ["wodx", "wodx-ledger-app"],
    window: {title: "The Ledger", icon: "fa-solid fa-scale-unbalanced", resizable: true},
    position: {width: 640, height: "auto"},
    actions: {add: LedgerApp.#onAdd, status: LedgerApp.#onStatus, veil: LedgerApp.#onVeil}
  };
  static #instance;
  static open() { this.#instance ??= new LedgerApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const s = ledger();
    const band = L.veilBand(s.veil.value);
    const names = [...(game.actors ?? [])].map(a => `<option value="${esc(a.name)}"></option>`).join("");
    const row = e => `<div class="wodx-ledger-row" data-search-item data-search-text="${esc(`${e.kind} ${e.from.name} ${e.to.name} ${e.what} ${e.status}`)}">
      <div><strong>${esc(L.KINDS[e.kind].split(" (")[0])}${e.size ? ` (${esc(L.BOONS[e.size])})` : ""}</strong>: ${esc(e.from.name || "someone")}${e.to.name ? ` to ${esc(e.to.name)}` : ""}. ${esc(e.what)}</div>
      ${e.steps?.length ? `<ul class="wodx-ledger-steps">${e.steps.map(x => `<li>${x.done ? "&#10003;" : "&#9675;"} ${esc(x.text)}${x.done && x.by ? ` <span class="wodx-quiet">(${esc(x.by)})</span>` : ""}</li>`).join("")}</ul>` : ""}
      <div class="wodx-quiet">Made ${esc(dateOf(e.made))}${e.due !== null ? `, due ${esc(dateOf(e.due))}` : ""}. ${esc(L.STATUS[e.status])}.${e.history.length ? ` ${esc(e.history.at(-1).what)}` : ""}</div>
      ${e.status === "open" ? `<div class="wodx-buttons"><button type="button" data-action="status" data-id="${esc(e.id)}" data-status="kept">Kept or paid</button><button type="button" data-action="status" data-id="${esc(e.id)}" data-status="broken">Broken</button><button type="button" data-action="status" data-id="${esc(e.id)}" data-status="void">Cancel</button></div>` : ""}</div>`;
    const open = s.entries.filter(e => e.status === "open").sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity));
    const closed = s.entries.filter(e => e.status !== "open");
    const today = getEngine().timeToDate(now());
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <section class="wodx-veil"><h3>The Veil: ${s.veil.value} of ${L.VEIL_MAX}, ${esc(band.name)}</h3><p>${esc(band.note)}</p>
        <div class="wodx-buttons"><button type="button" data-action="veil" data-delta="-1">Lower a step</button><button type="button" data-action="veil" data-delta="1">Raise a step</button></div></section>
      <section><h3>New entry</h3>
        <form class="wodx-ledger-new">
        <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${opts(L.KINDS, "debt")}</select></div>
        <div class="form-group"><label>Boon size</label><select name="size" data-fixed>${opts(L.BOONS, "minor")}</select></div>
        <div class="form-group"><label>Who owes or swore</label><input type="text" name="from" list="wodx-ledger-names" placeholder="A character's name"></div>
        <div class="form-group"><label>To whom</label><input type="text" name="to" list="wodx-ledger-names" placeholder="Optional"></div>
        <div class="form-group"><label>What</label><input type="text" name="what" placeholder="What was promised, owed or will happen"></div>
        <div class="form-group"><label>Steps (an objective)</label><textarea name="steps" rows="3" placeholder="reach the cellar stairs&#10;open the reliquary&#10;found the trapdoor"></textarea></div>
        <div class="form-group"><label>Due (year, month, day)</label><div class="form-fields">
          <input type="number" name="year" placeholder="${today.year}" step="1" aria-label="Year"><input type="number" name="month" min="1" max="12" placeholder="month" aria-label="Month"><input type="number" name="day" min="1" max="31" placeholder="day" aria-label="Day"></div></div>
        <datalist id="wodx-ledger-names">${names}</datalist>
        <div class="wodx-buttons"><button type="button" data-action="add"><i class="fa-solid fa-plus"></i> Add to the ledger</button></div></form></section>
      <section><h3>Open (${open.length})</h3>${searchBox(".wodx-ledger-open", "Search the ledger…", "Search the ledger")}
        <div class="wodx-ledger-open">${open.map(row).join("") || "<p class=\"wodx-quiet\">Nothing open.</p>"}</div></section>
      <section><h3>Closed (${closed.length})</h3>${searchBox(".wodx-ledger-closed", "Search closed entries…", "Search closed entries")}
        <div class="wodx-ledger-closed">${closed.map(row).join("") || "<p class=\"wodx-quiet\">Nothing closed yet.</p>"}</div></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onAdd(event, target) {
    const f = target.closest("form").elements;
    const actor = n => { const a = game.actors.getName?.(n.trim()) ?? [...game.actors].find(x => x.name === n.trim()); return a ? {id: a.id, name: a.name} : {id: null, name: n.trim()}; };
    if ( !f.what.value.trim() || !f.from.value.trim() ) return ui.notifications.warn("Say who and what first.");
    let due = null;
    if ( f.year.value ) {
      try { due = getEngine().dateToTime({year: Number(f.year.value), month: Number(f.month.value) || 1, day: Number(f.day.value) || 1, hour: 21, minute: 0}); }
      catch { return ui.notifications.warn("That date never happened here: it was skipped at the calendar reform."); }
    }
    await saveEntry({kind: f.kind.value, size: f.size.value, from: actor(f.from.value), to: f.to.value.trim() ? actor(f.to.value) : null, what: f.what.value, due,
      steps: f.kind.value === "objective" ? String(f.steps?.value ?? "") : []});
    if ( due !== null && due <= now() ) await checkDue();
  }
  static async #onStatus(event, target) { await setStatus(target.dataset.id, target.dataset.status); }
  static async #onVeil(event, target) { await moveVeil(Number(target.dataset.delta), "By hand"); }
}

/** Storyteller 0.20.0: a map event ticks the steps of open objectives, with a quiet note to the Storyteller. */
export async function onMapEventObjectives(ev) {
  if ( !isActiveGM() || skipping() || !ev || ev.undone ) return [];
  const st = ledger();
  if ( !st.entries.some(e => e.kind === "objective" && e.status === "open") ) return [];
  const notes = [];
  await mutate(s => {
    for ( let i = 0; i < s.entries.length; i++ ) {
      const r = L.tickObjective(s.entries[i], ev);
      if ( !r.ticked.length ) continue;
      r.entry.history = [...(r.entry.history ?? []), {at: now(), what: `${r.finished ? "Done" : "Step done"}: ${r.ticked.join("; ")}.`}].slice(-20);
      s.entries[i] = r.entry;
      notes.push({e: r.entry, ticked: r.ticked, finished: r.finished});
    }
    return notes.length ? {value: s} : null;
  });
  for ( const n of notes ) {
    const left = n.e.steps.filter(x => !x.done).length;
    await log({kind: "ledger", attention: n.finished ? "Objective done" : null, name: ev.whoName ?? "",
      text: `${n.e.what}: ${n.ticked.join("; ")}${n.finished ? ". Every step is done." : `. ${left} step${left === 1 ? "" : "s"} left.`}`});
  }
  return notes;
}
