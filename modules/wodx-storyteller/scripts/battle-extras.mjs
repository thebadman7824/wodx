import * as BD from "./battle-deeds.mjs";
import * as BA from "./battle-aftermath.mjs";
import * as C from "./core.mjs";
import * as T from "./tasks-rules.mjs";
import * as Led from "./ledger.mjs";

/**
 * WoDX Storyteller 0.45.0: the Foundry side of battle deeds (bt1, B2330-B2334) and the field's aftermath (bt2,
 * B2335-B2339), shown inside the Battles window (battles.mjs). The rules are in battle-deeds.mjs and
 * battle-aftermath.mjs. battles.mjs calls bind() once with its own get, save and open.
 */

const {esc} = C;
const n = v => Number(v) || 0;
const now = () => globalThis.game?.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ow = () => game.modules.get("wodx-otherworlds")?.api ?? null;

let api = {get: () => null, save: async b => b, open: () => null, ageId: () => "feudal"};
/** battles.mjs hands over get(id), save(battle), open(id) and ageId(battle). */
export function bind(fns) { api = {...api, ...fns}; }

/* ---- Characters' numbers ---- */

const attrOf = (a, k) => { const x = a?.system?.attributes?.[k]; return x ? n(x.total ?? x.value) : 0; };
function abilityOf(a, key) {
  let best = n(a?.system?.abilities?.[key]?.value);
  for ( const i of a?.items ?? [] ) {
    if ( !["Ability", "Trait"].includes(i.type) ) continue;
    if ( String(i.system?.id || i.name || "").trim().toLowerCase() === key ) best = Math.max(best, n(i.system?.value));
  }
  return best;
}
export const kindOf = a => { try { return game.wodxCombat?.getKind?.(a) ?? (/vampire/i.test(String(a?.type)) ? "kindred" : "mortal"); } catch (e) { return "mortal"; } };
const charsWithKind = b => b.chars.map(c => ({...c, kind: kindOf(game.actors.get(c.actorId))}));

/* ---- Deeds (bt1) ---- */

/** Offer each character in the battle a deed for the next phase, and tell each player theirs. */
export async function offer(id) {
  const b = api.get(id);
  if ( !b || b.over || !game.user.isGM || b.kind === "siege" && !b.breached ) return null;
  const offers = BD.makeOffers(b, api.ageId(b), charsWithKind(b));
  const saved = await api.save({...b, offers});
  for ( const x of offers.list ) {
    const a = game.actors.get(x.actorId), owners = game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
    const d = BD.deedById(x.deedId);
    await ChatMessage.create({whisper: [...new Set([...gmIds(), ...owners])], speaker: {alias: "Battles"},
      content: `<div class="wodx-card wst-battle-card"><h3>${esc(b.name)}: ${esc(BD.POSTS[x.post])}</h3><p>${esc(BD.deedWords(d, a?.name ?? x.name))}</p></div>`});
  }
  return saved;
}

async function change(id, fn) {
  const b = api.get(id);
  if ( !b?.offers || !game.user.isGM ) return null;
  return api.save({...b, offers: fn(b.offers, b)});
}
export const swap = (id, actorId, post = null) => change(id, (o, b) => BD.swapOffer(o, actorId, api.ageId(b), kindOf(game.actors.get(actorId)), {post}));
export const skip = (id, actorId) => change(id, o => BD.skipOffer(o, actorId, !o.list.find(x => x.actorId === actorId)?.skip));

/** Roll a character's deed from their sheet. */
export async function rollDeed(id, actorId) {
  const b = api.get(id), x = b?.offers?.list?.find(o => o.actorId === actorId), a = game.actors.get(actorId);
  const d = BD.deedById(x?.deedId);
  if ( !d || !a || !game.user.isGM ) return null;
  const pool = BD.deedPool(d, k => attrOf(a, k), k => abilityOf(a, k));
  const r = new Roll(`${pool}d10`);
  await r.evaluate();
  const faces = r.dice[0]?.results?.map(f => f.result) ?? [];
  const res = {...T.countFaces(faces, d.diff), faces, pool};
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Battles"}, content: `<div class="wodx-card wst-battle-card"><p>${esc(a.name)}: ${esc(d.name)}, ${pool} dice at ${d.diff},
    ${res.successes} success${res.successes === 1 ? "" : "es"}${res.botch ? " (a botch)" : ""} [${faces.join(", ")}].${res.successes && !res.botch ? ` ${esc(d.buys)}.` : ""}${d.seen && b.realm === "world" ? " Seen by the living: the Masquerade is at risk." : ""}</p></div>`});
  return change(id, o => BD.recordRoll(o, actorId, res));
}

/** The deeds typed in by hand joined with the offers rolled (for fight()). */
export const withOffers = (b, deeds) => BD.joinDeeds(deeds, b?.offers);

export function renderOffers(b) {
  if ( b.over || !b.chars.length || (b.kind === "siege" && !b.breached) ) return "";
  const id = esc(b.id), o = b.offers && b.offers.phase === BD.nextPhase(b) ? b.offers : null;
  if ( !o ) return `<p><button type="button" data-action="offerDeeds" data-id="${id}" title="Give each character a deed for the next phase, by where they stand and the age of war">Offer deeds for the next phase</button></p>`;
  const posts = cur => Object.entries(BD.POSTS).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(v)}</option>`).join("");
  const rows = o.list.map(x => {
    const d = BD.deedById(x.deedId), a = esc(x.actorId);
    return `<div class="wst-deed${x.skip ? " wodx-quiet" : ""}"><strong>${esc(x.name)}</strong> <select name="post.${a}" data-fixed data-action-change="deedPost" data-id="${id}" data-actor="${a}">${posts(x.post)}</select>
      <div>${esc(BD.deedWords(d))}${d?.seen ? " <em>Seen by the living.</em>" : ""}</div>
      <div>${x.rolled ? `Rolled: ${x.rolled.successes} success${x.rolled.successes === 1 ? "" : "es"}${x.rolled.botch ? " (a botch)" : ""}. ` : ""}${x.skip ? "Skipped. " : ""}
        <button type="button" data-action="deedRoll" data-id="${id}" data-actor="${a}">${x.rolled ? "Roll again" : "Roll"}</button>
        <button type="button" data-action="deedSwap" data-id="${id}" data-actor="${a}">Swap</button>
        <button type="button" data-action="deedSkip" data-id="${id}" data-actor="${a}">${x.skip ? "Offer it again" : "Skip"}</button></div></div>`;
  }).join("");
  return `<fieldset><legend>Deeds for phase ${o.phase}</legend>${rows}<p class="wodx-quiet">Rolled deeds add their successes to their side when the phase is fought.</p></fieldset>`;
}

/* ---- The field's aftermath (bt2) ---- */

const linesOf = b => BA.aftermathFor(b, BD.groupOf(api.ageId(b)));
const sentOf = (b, lineId, to) => (BA.normAftermath(b.aftermath)?.sent ?? []).find(s => s.id === lineId && s.to === to) ?? null;
const scenes = () => (game.scenes?.contents ?? []).filter(s => !/battle ?map|\(gate/i.test(s.name)).slice(0, 200);

async function record(b, entry, remove = false) {
  const a = BA.normAftermath(b.aftermath) ?? {sent: []};
  const sent = a.sent.filter(s => !(s.id === entry.id && s.to === entry.to));
  if ( !remove ) sent.push(entry);
  return api.save({...b, aftermath: {sent}});
}

/** Send one line of the aftermath to the Ledger, the Legends book or the place's state. */
export async function send(id, lineId, to, {sceneId = null} = {}) {
  const b = api.get(id), line = b && linesOf(b).find(l => l.id === lineId);
  if ( !line || !game.user.isGM || sentOf(b, lineId, to) ) return null;
  if ( to === "ledger" ) {
    const e = BA.ledgerEntryFor(line, b, now());
    if ( !e ) return null;
    await Led.saveEntry(e);
    if ( line.to.veil ) await Led.moveVeil(-line.to.veil, `Deeds seen at ${b.name}`);
    return record(b, {id: lineId, to, ledgerId: e.id, veil: line.to.veil ?? 0});
  }
  if ( to === "legend" ) {
    if ( !line.to.legend ) return null;
    return record(b, {id: lineId, to, legend: line.to.legend});
  }
  if ( to === "drift" ) {
    const dr = line.to.drift, scene = game.scenes.get(sceneId), O = ow();
    if ( !dr || !scene ) { ui.notifications.warn("Pick the place (a scene) first."); return null; }
    if ( !O?.drift?.step ) { ui.notifications.warn("WoDX Otherworlds is off: the place's state can't be changed."); return null; }
    let steps = 0;
    for ( let i = 0; i < (dr.steps ?? 1); i++ ) { const r = await O.drift.step(scene, dr.kind, dr.why); if ( r?.changed ) steps++; }
    if ( !steps ) { ui.notifications.info("The place can't drift any further that way."); return null; }
    return record(b, {id: lineId, to, driftScene: scene.id, driftSteps: steps});
  }
  return null;
}

/** Take a sent line back. */
export async function unsend(id, lineId, to) {
  const b = api.get(id), s = b && sentOf(b, lineId, to);
  if ( !s || !game.user.isGM ) return null;
  if ( to === "ledger" ) { await Led.removeEntry(s.ledgerId); if ( s.veil ) await Led.moveVeil(s.veil, `Undo: deeds seen at ${b.name}`); }
  if ( to === "drift" ) {
    const scene = game.scenes.get(s.driftScene), O = ow();
    if ( scene && O?.drift?.undo ) for ( let i = 0; i < s.driftSteps; i++ ) await O.drift.undo(scene);
  }
  return record(b, s, true);
}

const LINE_NAMES = {all: "Everyone", vampire: "Vampire", wraith: "Wraith", werewolf: "Werewolf", mage: "Mage", changeling: "Changeling", "kuei-jin": "Kindred of the East"};
export function renderAftermath(b) {
  if ( !b.over ) return "";
  const id = esc(b.id), lines = linesOf(b);
  const sceneOpts = `<option value="">(the place: a scene)</option>${scenes().map(s => `<option value="${s.id}">${esc(s.navName || s.name)}</option>`).join("")}`;
  const btn = (l, to, label) => sentOf(b, l.id, to)
    ? `<button type="button" data-action="fieldUndo" data-id="${id}" data-line="${esc(l.id)}" data-to="${to}">Undo: ${label}</button>`
    : `<button type="button" data-action="fieldSend" data-id="${id}" data-line="${esc(l.id)}" data-to="${to}">${label}</button>`;
  const rows = lines.map(l => `<div class="wst-field-line"><strong>${esc(l.title)}</strong> <span class="wodx-quiet">(${esc(LINE_NAMES[l.line] ?? l.line)})</span><div>${esc(l.text)}</div>
    <div>${l.to.ledger ? btn(l, "ledger", l.to.veil ? "To the Ledger, and the Veil slips" : "To the Ledger") : ""}${l.to.legend ? btn(l, "legend", "To the Legends book") : ""}
      ${l.to.drift ? `${sentOf(b, l.id, "drift") ? "" : `<select name="fieldScene.${esc(l.id)}">${sceneOpts}</select>`}${btn(l, "drift", "To the place")}` : ""}</div></div>`).join("");
  return `<details open><summary>What the field leaves behind</summary>${rows}</details>`;
}

/** Old fields of earlier years and how they are felt now (the list view). */
export function renderOldFields(battles, year, branch) {
  const old = BA.oldFields(battles, year, {branch});
  if ( !old.length ) return "";
  return `<details><summary>Old fields (${old.length})</summary>${old.map(({field, echo}) => `<div><strong>${esc(field.name)}</strong> <span class="wodx-quiet">(${field.year}${field.place ? `, ${esc(field.place)}` : ""}, ${echo.since} years ago)</span>
    <div>${esc(echo.text)}${echo.haunted ? " The dead still walk there." : ""}${echo.thinShroud ? " The Shroud stays thin." : ""}</div></div>`).join("")}</details>`;
}

/** The window's actions (merged into BattlesApp's). */
export const ACTIONS = {
  offerDeeds: (e, t) => offer(t.dataset.id),
  deedRoll: (e, t) => rollDeed(t.dataset.id, t.dataset.actor),
  deedSwap: (e, t) => swap(t.dataset.id, t.dataset.actor),
  deedSkip: (e, t) => skip(t.dataset.id, t.dataset.actor),
  fieldSend: (e, t) => send(t.dataset.id, t.dataset.line, t.dataset.to, {sceneId: t.closest(".wst-field-line")?.querySelector("select")?.value ?? null}),
  fieldUndo: (e, t) => unsend(t.dataset.id, t.dataset.line, t.dataset.to)
};

/** A post picked from a deed's select swaps the deed for one at that post. */
export function bindChanges(root) {
  root?.querySelectorAll?.("[data-action-change=deedPost]")?.forEach(el => el.addEventListener("change", () => swap(el.dataset.id, el.dataset.actor, el.value)));
}

/** When a battle ends, tell the Storyteller its field has a harvest. */
export function registerHooks() {
  Hooks.on("wodxBattle", ({battle, step}) => {
    if ( !battle?.over || !C.isActiveGM() ) return;
    const lines = linesOf(battle);
    if ( lines.length < 2 ) return;
    ChatMessage.create({whisper: gmIds(), speaker: {alias: "Battles"}, content: `<div class="wodx-card wst-battle-card"><p>${esc(battle.name)} is over. What the field leaves behind: ${lines.map(l => esc(l.title)).join(", ")}. Open the battle to send any of it to the Ledger, the Legends book or the place.</p></div>`});
  });
}
