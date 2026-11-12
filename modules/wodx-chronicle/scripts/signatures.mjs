import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import {currentYear} from "./eras.mjs";
import * as S from "./signature-rules.mjs";

/**
 * WoDX Chronicle 0.25.0: signature features on the Foundry side (Splat Features Desk, Vampire first). Rules in
 * signature-rules.mjs, table in data/signatures.mjs.
 *
 *   Actor flag wodx-chronicle.sig = {muses: [], cause, marks: []}: the character's own tracks (owner and Storyteller see them).
 *   Actor flag wodx-chronicle.corruption = {<setite actor id>: record}: on the victim, for the Storyteller only.
 *   World setting sigVampire (default off): the Vampire features. Each line gets its own switch as it is built.
 *   game.modules.get("wodx-chronicle").api.signatures: {rowOf, open, addMuse, museSeen, setCause, keptTemper, spendRant,
 *     addMark, healMark, corruption, setVice, work, effects, rules}.
 *
 * Changes made by the system post a Storyteller card with an Undo button; changes a player's client can't make
 * (another actor's flags) go to the approval queue, which the Storyteller can set to approve by itself.
 */

const FLAG = "sig", CFLAG = "corruption";
const T_CORRUPT = `${MODULE_ID}.sigCorrupt`, T_CAUSE = `${MODULE_ID}.sigCause`, T_VICE = `${MODULE_ID}.sigVice`;
const on = () => !!game.settings.get(MODULE_ID, "sigVampire");
const now = () => game.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const actorsApi = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const toActor = x => x?.documentName === "Actor" ? x : x?.actor ?? (typeof x === "string" ? (game.actors.get(x) ?? fromUuidSync?.(x)) : null);
const sigOf = a => foundry.utils.deepClone(a?.flags?.[MODULE_ID]?.[FLAG] ?? {}) ?? {};
const clanNames = a => { const s = a?.system ?? {}; return [a?.flags?.["wodx-actions"]?.bloodline, s.clan === "custom" ? s.custom?.clan : s.clan, s.custom?.clan].filter(Boolean); };

export function registerSignatureSettings() {
  game.settings.register(MODULE_ID, "sigVampire", {
    name: "Clan features (Vampire)", hint: "Each clan's own feature: the Toreador's Muse, the Setite's Corruption ledger, the Brujah's Cause, the Gangrel's marks. Off by default.",
    scope: "world", config: true, type: Boolean, default: false
  });
}

/** The signature row for an actor (a vampire whose clan or bloodline has one), or null. */
export function rowOf(actor) {
  if ( !actor ) return null;
  const kind = String(actorsApi("wodx-combat")?.getKind?.(actor) ?? actor.type ?? "").toLowerCase();
  if ( !/kindred|vampire/.test(kind) && !clanNames(actor).length ) return null;
  return S.vampireRow(clanNames(actor));
}
const isFeature = (actor, f) => on() && rowOf(actor)?.feature === f;

/* ---------------- cards and Undo ---------------- */

async function card(title, body, {whisper = gmIds(), undo = null} = {}) {
  const btn = undo ? `<button type="button" data-wct-sig-undo>Undo</button>` : "";
  return ChatMessage.create({content: `<div class="wodx-card wct-sig"><h3>${esc(title)}</h3>${body}${btn}</div>`,
    speaker: {alias: "Chronicle"}, whisper, flags: undo ? {[MODULE_ID]: {sigUndo: undo}} : {}});
}
/** Undo data: {uuid, path, before}. Only the Storyteller may press it. */
async function runUndo(message) {
  const u = message?.flags?.[MODULE_ID]?.sigUndo;
  if ( !u || !game.user.isGM ) return;
  const doc = await fromUuid(u.uuid);
  if ( !doc ) return;
  await doc.update({[`flags.${MODULE_ID}.${u.path}`]: u.before ?? null});
  await message.update({content: `${message.content}<p class="vta-note">Undone by the Storyteller.</p>`, [`flags.${MODULE_ID}.sigUndo`]: null});
}
const ownerIds = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/* ---------------- Toreador ---------------- */

export async function addMuse(actorOrId, {name, kind = "person", uuid = null} = {}) {
  const a = toActor(actorOrId);
  if ( !a ) return null;
  const sig = sigOf(a), m = S.newMuse({id: foundry.utils.randomID(), name, kind, uuid, now: now()});
  sig.muses = [...(sig.muses ?? []), m];
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  return m;
}
export async function museSeen(actorOrId, museId, how = "see") {
  const a = toActor(actorOrId), sig = sigOf(a);
  const i = (sig.muses ?? []).findIndex(m => m.id === museId);
  if ( i < 0 ) return null;
  const before = foundry.utils.deepClone(sig);
  sig.muses[i] = S.museSeen(sig.muses[i], now(), how);
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  await card(`${a.name}: ${sig.muses[i].name}`, `<p>Obsession now ${sig.muses[i].obsession} of ${S.OBSESSION_MAX}.</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: FLAG, before}});
  return sig.muses[i];
}

/** The weekly rise of every Toreador's Obsession, and healed Gangrel marks. Run by the active Storyteller. */
let lastTick = -1;
export async function tick({force = false} = {}) {
  if ( !on() || !isActiveGM() ) return;
  const t = now(), day = Math.floor(t / 86400);
  if ( day === lastTick && !force ) return;
  lastTick = day;
  for ( const a of game.actors ) {
    const sig = a.flags?.[MODULE_ID]?.[FLAG];
    if ( !sig ) continue;
    const before = foundry.utils.deepClone(sig), next = foundry.utils.deepClone(sig);
    const lines = [];
    next.muses = (next.muses ?? []).map(m => { const r = S.museTick(m, t); if ( r.rose ) lines.push(`${esc(m.name)}: Obsession ${r.muse.obsession} (${S.beautyPenalty([r.muse])} harder to resist beauty).`); return r.muse; });
    const healed = (next.marks ?? []).filter(m => !S.activeMarks([m], t).length);
    if ( healed.length ) { next.marks = S.activeMarks(next.marks, t); lines.push(`Healed: ${healed.map(m => esc(S.markByKey(m.key)?.label ?? m.key)).join(", ")}.`); }
    if ( !lines.length && JSON.stringify(next.muses) === JSON.stringify(sig.muses ?? []) ) continue;
    await a.update({[`flags.${MODULE_ID}.${FLAG}`]: next});
    if ( lines.length ) await card(a.name, `<p>${lines.join("</p><p>")}</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: FLAG, before}});
  }
}

/** Harm to someone who is a Muse: +2 Obsession and a frenzy check for each Toreador who holds them. */
async function onDamage(target) {
  if ( !on() || !isActiveGM() || !target?.uuid ) return;
  for ( const a of game.actors ) {
    const sig = a.flags?.[MODULE_ID]?.[FLAG];
    const i = (sig?.muses ?? []).findIndex(m => m.uuid && (m.uuid === target.uuid || m.uuid === target.baseActor?.uuid));
    if ( i < 0 ) continue;
    const before = foundry.utils.deepClone(sig), next = foundry.utils.deepClone(sig);
    const r = S.museHarmed(next.muses[i]);
    next.muses[i] = r.muse;
    await a.update({[`flags.${MODULE_ID}.${FLAG}`]: next});
    await card(`${a.name}: the Muse is hurt`, `<p>${esc(r.muse.name)} was harmed. Obsession ${r.muse.obsession}.${r.frenzy ? " A frenzy check is called for." : ""}</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: FLAG, before}});
    if ( r.frenzy ) actorsApi("wodx-actions")?.frenzy?.({actor: a, provocation: "physical"});
  }
}

/* ---------------- Brujah ---------------- */

export async function setCause(actorOrId, {key = "", custom = ""} = {}) {
  const a = toActor(actorOrId), c = S.newCause({key, custom, year: currentYear()});
  if ( !a || !c ) return null;
  const sig = sigOf(a); sig.cause = c;
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  if ( c.custom && !game.user.isGM ) await propose({type: T_CAUSE, key: `cause:${a.id}`, title: `${a.name}: a Cause of their own`, detail: c.label, data: {actor: a.id}});
  return c;
}
export async function keptTemper(actorOrId) {
  const a = toActor(actorOrId), sig = sigOf(a);
  if ( !sig.cause ) return null;
  const r = S.causeKept(sig.cause); sig.cause = r.cause;
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  if ( r.ready ) await card(`${a.name}: a Rant is ready`, `<p>${esc(sig.cause.label)}: the Brujah can call a Rant. Passers-by and townsfolk in the scene may turn into a mob.</p>`, {whisper: ownerIds(a)});
  return r;
}
export async function spendRant(actorOrId) {
  const a = toActor(actorOrId), sig = sigOf(a);
  if ( !sig.cause || sig.cause.rant < S.RANT_POINTS ) return false;
  sig.cause = S.rantSpent(sig.cause);
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  await card(`${a.name} calls a Rant`, `<p>${esc(sig.cause.label)}. The crowd's morale decides who joins.</p>`, {whisper: []});
  return true;
}

/* ---------------- Gangrel ---------------- */

export async function addMark(actorOrId, key = null) {
  const a = toActor(actorOrId), sig = sigOf(a);
  const held = S.activeMarks(sig.marks ?? [], now());
  const m = S.newMark(key ?? S.pickMark(held).key, now());
  if ( !m ) return null;
  const before = foundry.utils.deepClone(sig);
  sig.marks = [...held, m];
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  const row = S.markByKey(m.key);
  await card(`${a.name}: a mark of the Beast`, `<p><b>${esc(row.label)}.</b> ${esc(row.edge)}; ${esc(row.cost)}. Heals in a month.</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: FLAG, before}});
  return m;
}
export async function healMark(actorOrId, key) {
  const a = toActor(actorOrId), sig = sigOf(a);
  sig.marks = (sig.marks ?? []).filter(m => m.key !== key);
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
}
/** Frenzy began on a Gangrel: a new mark. */
function onActorUpdate(actor, change) {
  if ( !isActiveGM() || !isFeature(actor, "marks") ) return;
  if ( foundry.utils.getProperty(change, "system.conditions.isfrenzy") === true ) addMark(actor);
}

/* ---------------- Followers of Set ---------------- */

export const corruption = npc => foundry.utils.deepClone(toActor(npc)?.flags?.[MODULE_ID]?.[CFLAG] ?? {});

/** Apply a move to a victim's track (Storyteller's client). */
async function applyCorrupt({npc: npcId, by, byName, delta, why, vice = ""}) {
  const npc = toActor(npcId);
  if ( !npc ) return null;
  const all = corruption(npc), before = foundry.utils.deepClone(all);
  const rec = all[by] ?? S.newCorruption({by, byName, vice, now: now()});
  const r = S.corrupt(rec, delta, why, now());
  all[by] = r.rec;
  await npc.update({[`flags.${MODULE_ID}.${CFLAG}`]: all});
  const marks = r.crossed.map(t => t === 3 ? "They will now do small wrongs for the Setite." : "They now belong to the Setite: take them as a retainer or ghoul, or use them as leverage.").join(" ");
  await card(`${npc.name}: Corruption ${r.after} of ${S.CORRUPTION_MAX}`, `<p>${esc(byName)}: ${esc(why)}. ${esc(S.stepText(r.after))}.${marks ? ` <b>${esc(marks)}</b>` : ""}</p>${rec.vice ? "" : `<p class="vta-note">No vice named yet: set one with api.signatures.setVice.</p>`}`,
    {undo: {uuid: npc.uuid, path: CFLAG, before}});
  return r.rec;
}
/** Move a track from any client: the Storyteller applies it at once, a player's move goes to the queue. */
export async function work(npc, setite, delta, why) {
  const n = toActor(npc), s = toActor(setite);
  if ( !n || !s || !delta ) return null;
  const data = {npc: n.id, by: s.id, byName: s.name, delta, why};
  if ( game.user.isGM ) return applyCorrupt(data);
  return propose({type: T_CORRUPT, key: `corrupt:${n.id}:${s.id}:${Math.floor(now())}`, title: `${s.name} works on ${n.name}`, detail: why, data});
}
export async function setVice(npc, setite, vice) {
  const n = toActor(npc), s = toActor(setite);
  if ( !n || !s || !S.viceByKey(vice) ) return null;
  const all = corruption(n);
  all[s.id] = {...(all[s.id] ?? S.newCorruption({by: s.id, byName: s.name, now: now()})), vice};
  await n.update({[`flags.${MODULE_ID}.${CFLAG}`]: all});
  return all[s.id];
}
function onSocial(p) {
  const a = toActor(p?.actor), npc = toActor(p?.npc);
  if ( !a || !npc || !isFeature(a, "corruption") ) return;
  const d = S.stepFromSocial(p.act, p.result);
  if ( d ) work(npc, a, d, `${p.act}, ${p.result}`);
}
/** The Library good a name stands for ({name, kind, substance}), or just the name. */
function goodNamed(name) {
  if ( !name ) return null;
  const lib = actorsApi("wodx-library"), key = String(name).toLowerCase();
  const g = lib?.rules?.GOODS?.find?.(x => String(x.name).toLowerCase() === key);
  let substance = null;
  try { substance = g ? lib?.use?.rules?.substanceOf?.(g) ?? null : null; } catch (e) { substance = null; }
  return {name: String(name), kind: g?.kind ?? null, substance};
}
function onTrade(p) {
  const a = toActor(p?.actor), npc = toActor(p?.npc);
  if ( !a || !npc || !isFeature(a, "corruption") ) return;
  const rec = corruption(npc)[a.id];
  const good = goodNamed(p.give);
  const d = S.stepFromTrade(rec, {mode: p.mode, give: good, want: p.want});
  if ( d ) work(npc, a, d, `a gift: ${p.give}`);
}

/* ---------------- the window ---------------- */

/** The roll effects a character's signature tracks give now, in the trait effect shape. */
export function effects(actorOrId) {
  const a = toActor(actorOrId), sig = a?.flags?.[MODULE_ID]?.[FLAG] ?? {};
  if ( !on() ) return [];
  const out = S.markEffects(sig.marks ?? [], now());
  const pen = S.beautyPenalty(sig.muses ?? []);
  if ( pen ) out.push({tags: ["beauty"], difficulty: pen, why: "Obsession with a Muse"});
  return out;
}

/** A plain window with the character's feature and tracks. */
export async function open(actorOrId) {
  const a = toActor(actorOrId), row = rowOf(a);
  if ( !a ) return;
  const sig = a.flags?.[MODULE_ID]?.[FLAG] ?? {}, t = now();
  let body = row ? `<p><b>${esc(row.title)}.</b> ${esc(row.text)}</p><p class="vta-note">${esc(row.page)}</p>` : `<p>No clan feature for this character.</p>`;
  if ( sig.muses?.length ) body += `<h4>Muses</h4><ul>${sig.muses.map(m => `<li>${esc(m.name)} (${esc(S.MUSE_KINDS[m.kind])}): Obsession ${m.obsession}</li>`).join("")}</ul>`;
  if ( sig.cause ) body += `<h4>Cause</h4><p>${esc(sig.cause.label)}${sig.cause.custom && !sig.cause.approved ? " (waiting for the Storyteller)" : ""}. Rant ${sig.cause.rant} of ${S.RANT_POINTS}.</p>`;
  const marks = S.activeMarks(sig.marks ?? [], t);
  if ( marks.length ) body += `<h4>Marks</h4><ul>${marks.map(m => { const r = S.markByKey(m.key); return `<li>${esc(r.label)}: ${esc(r.edge)}; ${esc(r.cost)}. Heals in ${Math.ceil((m.until - t) / 86400)} days.</li>`; }).join("")}</ul>`;
  if ( game.user.isGM ) {
    const victims = game.actors.filter(x => x.flags?.[MODULE_ID]?.[CFLAG]?.[a.id]);
    if ( victims.length ) body += `<h4>Corruption ledger</h4><ul>${victims.map(v => { const r = v.flags[MODULE_ID][CFLAG][a.id]; return `<li>${esc(v.name)}: ${r.step} (${esc(r.vice || "no vice set")})</li>`; }).join("")}</ul>`;
  }
  return foundry.applications.api.DialogV2.prompt({window: {title: `${a.name}: clan feature`}, content: `<div class="wct-sig-window">${body}</div>`, ok: {label: "Close"}});
}

export function registerSignatureHooks() {
  registerHandler(T_CORRUPT, {label: "A Setite works on a victim (Corruption ledger)", approve: e => applyCorrupt(e.data ?? {})});
  registerHandler(T_CAUSE, {label: "A Brujah's Cause of their own", approve: async e => {
    const a = game.actors.get(e.data?.actor), sig = sigOf(a);
    if ( a && sig.cause ) { sig.cause.approved = true; await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig}); }
  }});
  registerHandler(T_VICE, {label: "Name a Setite victim's vice", approve: e => setVice(e.data?.npc, e.data?.by, e.data?.vice)});
  Hooks.on("wodxSocial", onSocial);
  Hooks.on("wodxTrade", onTrade);
  Hooks.on("wodxDamageApplied", actor => onDamage(actor));
  Hooks.on("updateActor", onActorUpdate);
  Hooks.on("updateWorldTime", () => tick());
  Hooks.on("wodxSkipEnd", () => tick());
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const root = el?.[0] ?? el, b = root?.querySelector?.("[data-wct-sig-undo]");
    if ( !b ) return;
    if ( !game.user.isGM || !message.flags?.[MODULE_ID]?.sigUndo ) { b.remove(); return; }
    b.addEventListener("click", () => runUndo(message));
  });
  const can = a => !!a && on() && !!rowOf(a) && (game.user.isGM || a.isOwner);
  Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
    const a = app.document;
    if ( !can(a) || controls.some(c => c.action === "wctSig") ) return;
    const go = () => open(a);
    if ( app.options?.actions ) app.options.actions.wctSig = go;
    controls.push({icon: "fa-solid fa-feather", label: "Clan feature", action: "wctSig", onClick: go});
  });
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !can(sheet.actor) || buttons.some(b => b.class === "wct-sig") ) return;
    buttons.unshift({label: "Clan feature", class: "wct-sig", icon: "fa-solid fa-feather", onclick: () => open(sheet.actor)});
  });
}

export const signaturesApi = {rowOf, open, addMuse, museSeen, setCause, keptTemper, spendRant, addMark, healMark, corruption, setVice, work, effects, tick, rules: S};
