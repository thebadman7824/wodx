import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import {currentYear} from "./eras.mjs";
import {getEngine} from "./calendar.mjs";
import * as events from "./events.mjs";
import * as S from "./signature-rules.mjs";

/**
 * WoDX Chronicle 0.27.0: signature features on the Foundry side (Splat Features Desk, Vampire first). Rules in
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
    name: "Clan features (Vampire)", hint: "Each clan's own feature: the Toreador's Muse, the Setite's Corruption ledger, the Brujah's Cause, the Gangrel's marks, the Malkavian's glimpses, the Tzimisce's soil, the Lasombra's empty frame, the Ravnos vice and the Caitiff's odd gifts. Off by default.",
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
  for ( const a of game.actors ) if ( a.hasPlayerOwner || a.flags?.[MODULE_ID]?.[FLAG] ) { await soilTick(a, t); await oddTick(a); }
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
  if ( a && on() && isActiveGM() && isFeature(a, "vice") ) ravnosChance(a, p.act, npc);
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
  if ( a && on() && isActiveGM() && isFeature(a, "vice") ) ravnosChance(a, p.mode, npc);
  if ( !a || !npc || !isFeature(a, "corruption") ) return;
  const rec = corruption(npc)[a.id];
  const good = goodNamed(p.give);
  const d = S.stepFromTrade(rec, {mode: p.mode, give: good, want: p.want});
  if ( d ) work(npc, a, d, `a gift: ${p.give}`);
}

/* ---------------- Malkavian ---------------- */

const daysBetween = (a, b) => (b.year - a.year) * 365 + ((b.month ?? 1) - (a.month ?? 1)) * 30 + ((b.day ?? 1) - (a.day ?? 1));
/** The next live dated event after today, and how many days off (roughly). */
function nextEvent() {
  const d = getEngine().timeToDate(now()), today = {year: d.year, month: d.month, day: d.day};
  const k = today.year * 10000 + today.month * 100 + today.day;
  const ev = events.list().find(e => e.live && e.key > k && !events.has(e.id));
  return ev ? {ev, days: Math.max(1, daysBetween(today, ev))} : null;
}

/** A Malkavian asks for a glimpse: one a night, whispered to the player and the Storyteller. */
export async function glimpse(actorOrId) {
  const a = toActor(actorOrId);
  if ( !a || !isFeature(a, "glimpse") ) return null;
  const sig = sigOf(a);
  if ( !S.mayGlimpse(sig.glimpseAt, now()) ) { ui.notifications?.info?.("One glimpse a night."); return null; }
  const nx = nextEvent();
  const g = nx ? S.glimpseFor(nx.ev, nx.days, S.seedOf(a.id, nx.ev.id, Math.floor(now() / 86400))) : {theme: "none", text: "The Cobweb is quiet tonight. Nothing stirs that you can see."};
  sig.glimpseAt = now();
  if ( nx ) sig.glimpses = [...(sig.glimpses ?? []).filter(x => x.event !== nx.ev.id), {event: nx.ev.id, at: now(), text: g.text}].slice(-10);
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  await card(`${a.name}: a glimpse`, `<p><i>${esc(g.text)}</i></p>${game.user.isGM && nx ? `<p class="vta-note">Storyteller: ${esc(nx.ev.name)}.</p>` : ""}`, {whisper: ownerIds(a)});
  if ( nx && !game.user.isGM ) await card(`${a.name}: a glimpse (Storyteller's note)`, `<p>The riddle points at ${esc(nx.ev.name)}.</p>`);
  return g;
}

/** A dated event fired: the Storyteller hears which Malkavians saw it coming. */
async function onEventFired(ev) {
  if ( !on() || !isActiveGM() || !ev?.id ) return;
  for ( const a of game.actors ) {
    const hit = (a.flags?.[MODULE_ID]?.[FLAG]?.glimpses ?? []).find(x => x.event === ev.id);
    if ( hit ) await card(`${a.name} saw it coming`, `<p>${esc(ev.name)}: the glimpse was <i>${esc(hit.text)}</i>. If ${esc(a.name)} acted on it, give back a Willpower point.</p>`);
  }
}

/** What a deranged Malkavian hears beyond an NPC's reply, for WoDX NPC's talk cards; null when nothing. */
export function hearAs(actorOrId, {topic = "", name = "", npcId = ""} = {}) {
  const a = toActor(actorOrId);
  if ( !a || !isFeature(a, "glimpse") ) return null;
  const keys = S.derangementsOf(a.system?.derangement);
  return S.hearLine(keys, {name: name || "they", topic: topic || "it", seed: S.seedOf(a.id, npcId, topic, Math.floor(now() / 86400))});
}

/* ---------------- Tzimisce ---------------- */

const carriesSoil = a => (a?.items ?? []).some(i => S.isSoil({name: i.name, soil: i.flags?.[MODULE_ID]?.soil}));
async function soilTick(a, t) {
  if ( !isFeature(a, "soil") ) return;
  const sig = sigOf(a), r = S.soilNight(sig.soil, t, carriesSoil(a));
  if ( !r.changed ) return;
  const before = foundry.utils.deepClone(sig);
  sig.soil = r.soil;
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  if ( r.halved ) await card(`${a.name}: no native soil`, `<p>${esc(a.name)} rested without their native soil. Every dice pool is halved tonight (rounded down) until they rest on it again.${r.soil.short > 1 ? ` Nights in a row: ${r.soil.short}.` : ""}</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: FLAG, before}});
}
/** Put two handfuls of native soil in a Tzimisce's pack. */
export async function giveSoil(actorOrId, where = "") {
  const a = toActor(actorOrId);
  if ( !a ) return null;
  const name = `Native soil${where ? ` (${where})` : ""}`;
  const [item] = await a.createEmbeddedDocuments("Item", [{name, type: "Item", system: {description: "Two handfuls of earth from the place this Kindred was born or Embraced."}, flags: {[MODULE_ID]: {soil: true}}}]);
  return item ?? null;
}

/* ---------------- Lasombra ---------------- */

/** Mark a scene as watched by a camera (true), not watched (false) or left to the era (null). Storyteller only. */
export async function setCamera(scene = canvas?.scene, mark = true) {
  if ( !scene || !game.user.isGM ) return null;
  await scene.update({[`flags.${MODULE_ID}.camera`]: mark === true || mark === false ? mark : null});
  return mark;
}
/** A Lasombra in a watched scene: one card a night for each scene. */
export async function emptyFrame(actorOrId, scene = canvas?.scene) {
  const a = toActor(actorOrId);
  if ( !a || !scene || !isFeature(a, "camera") || !isActiveGM() ) return null;
  const year = currentYear(), cam = S.cameraAt(year);
  if ( !S.watched(year, scene.flags?.[MODULE_ID]?.camera) ) return null;
  const sig = sigOf(a), seen = sig.frames ?? {}, tonight = Math.floor((now() - 43200) / 86400);
  if ( seen[scene.id] === tonight ) return null;
  sig.frames = {...seen, [scene.id]: tonight};
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  await card(`${a.name}: an empty frame`, `<p>${esc(cam.label)} watches ${esc(scene.name)}, and holds no image of ${esc(a.name)}. Whoever studies it later sees a person who is not there: a breach of the Masquerade, found later.</p>`);
  return cam;
}
function onToken(token, change) {
  if ( !on() || !isActiveGM() || !token?.actor || (change && !("x" in change) && !("y" in change)) ) return;
  if ( isFeature(token.actor, "camera") ) emptyFrame(token.actor, token.parent);
}

/* ---------------- Ravnos ---------------- */

export async function setRavnosVice(actorOrId, vice) {
  const a = toActor(actorOrId);
  if ( !a || !S.ravnosVice(vice) ) return null;
  const sig = sigOf(a);
  sig.ravnos = {fedAt: now(), arrivedAt: now(), askedAt: null, ...(sig.ravnos ?? {}), vice};
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  return sig.ravnos;
}
/** The vice was fed (an act, or a dare the Storyteller marks), or the Ravnos moved on to a new domain. */
export async function ravnosFed(actorOrId) { return ravnosSet(actorOrId, {fedAt: now()}); }
export async function movedOn(actorOrId) { return ravnosSet(actorOrId, {arrivedAt: now()}); }
async function ravnosSet(actorOrId, part) {
  const a = toActor(actorOrId), sig = sigOf(a);
  if ( !a || !sig.ravnos ) return null;
  sig.ravnos = {...sig.ravnos, ...part};
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  return sig.ravnos;
}
/** A chance in talk or trade: feeding acts feed the vice, others call for a Self-Control roll (one a night). */
async function ravnosChance(a, act, npc) {
  const r = sigOf(a).ravnos;
  if ( !r?.vice ) return;
  if ( S.feedsRavnos(r.vice, act) ) return ravnosFed(a);
  if ( !S.mayAskRavnos(r, now()) ) return;
  const v = S.ravnosVice(r.vice), dc = S.ravnosDifficulty(r, now());
  await ravnosSet(a, {askedAt: now()});
  await card(`${a.name}: the vice calls`, `<p>${esc(npc?.name ?? "This one")} is a chance for ${esc(v.label.toLowerCase())}. Roll Self-Control, difficulty ${dc}. On a failure, ${esc(a.name)} gives in before the scene ends.</p>`, {whisper: ownerIds(a)});
}
function onTaken(p) {
  const a = toActor(p?.actor);
  if ( a && on() && isFeature(a, "vice") && sigOf(a).ravnos?.vice === "theft" ) ravnosFed(a);
}

/* ---------------- Caitiff ---------------- */

async function oddTick(a) {
  if ( !isFeature(a, "oddity") ) return;
  if ( !S.thinBlooded([...(a.items ?? [])].map(i => i.name)) ) return;
  const sig = sigOf(a), r = S.oddGift(sig.odd, currentYear());
  if ( !r.checked ) return;
  const before = foundry.utils.deepClone(sig);
  sig.odd = r.gift ? {...r.odd, gifts: [...(r.odd.gifts ?? []), r.gift.key]} : r.odd;
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: sig});
  if ( r.gift ) await card(`${a.name}: an odd gift`, `<p>This year ${esc(a.name)} may wake with a gift of thin blood: <b>${esc(r.gift.label)}</b>. ${esc(r.gift.text)} Keep it or take it back.</p>`, {undo: {uuid: a.uuid, path: FLAG, before}});
}

/* ---------------- the window ---------------- */

/** The roll effects a character's signature tracks give now, in the trait effect shape. */
export function effects(actorOrId) {
  const a = toActor(actorOrId), sig = a?.flags?.[MODULE_ID]?.[FLAG] ?? {};
  if ( !on() ) return [];
  const out = S.markEffects(sig.marks ?? [], now());
  const pen = S.beautyPenalty(sig.muses ?? []);
  if ( pen ) out.push({tags: ["beauty"], difficulty: pen, why: "Obsession with a Muse"});
  if ( sig.soil?.short > 0 && isFeature(a, "soil") ) out.push({tags: ["all"], halve: true, why: "Rested without native soil"});
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
  if ( sig.soil ) body += `<h4>Native soil</h4><p>${carriesSoil(a) ? "Carried." : "Not carried."}${sig.soil.short ? ` Dice pools halved (${sig.soil.short} night${sig.soil.short === 1 ? "" : "s"} without it).` : ""}</p>`;
  if ( sig.ravnos?.vice ) body += `<h4>Vice</h4><p>${esc(S.ravnosVice(sig.ravnos.vice)?.label)}. Self-Control difficulty to resist now: ${S.ravnosDifficulty(sig.ravnos, t)}.</p>`;
  if ( row?.feature === "camera" ) { const y = currentYear(), c = S.cameraAt(y); body += `<h4>Cameras</h4><p>${c ? `${esc(c.label)} is the camera of the year. This scene is ${S.watched(y, canvas?.scene?.flags?.[MODULE_ID]?.camera) ? "watched" : "not watched"}.` : "No camera exists yet."}</p>`; }
  if ( sig.odd?.gifts?.length ) body += `<h4>Odd gifts</h4><ul>${sig.odd.gifts.map(k => `<li>${esc(S.ODD_GIFTS.find(g => g.key === k)?.label ?? k)}</li>`).join("")}</ul>`;
  if ( game.user.isGM ) {
    const victims = game.actors.filter(x => x.flags?.[MODULE_ID]?.[CFLAG]?.[a.id]);
    if ( victims.length ) body += `<h4>Corruption ledger</h4><ul>${victims.map(v => { const r = v.flags[MODULE_ID][CFLAG][a.id]; return `<li>${esc(v.name)}: ${r.step} (${esc(r.vice || "no vice set")})</li>`; }).join("")}</ul>`;
  }
  const buttons = [{action: "close", label: "Close", default: true}];
  if ( row?.feature === "glimpse" && on() ) buttons.unshift({action: "glimpse", label: "Ask for a glimpse"});
  if ( row?.feature === "cause" && on() && sig.cause?.rant >= S.RANT_POINTS ) buttons.unshift({action: "rant", label: "Call the Rant"});
  if ( row?.feature === "soil" && on() && !carriesSoil(a) ) buttons.unshift({action: "soil", label: "Take native soil"});
  if ( row?.feature === "vice" && on() ) {
    if ( !sig.ravnos?.vice ) S.RAVNOS_VICES.forEach(v => buttons.unshift({action: `vice:${v.key}`, label: `Vice: ${v.label}`}));
    else buttons.unshift({action: "fed", label: "The vice was fed"}, {action: "moved", label: "Moved on to a new domain"});
  }
  if ( row?.feature === "camera" && on() && game.user.isGM && canvas?.scene ) buttons.unshift({action: "cam", label: S.watched(currentYear(), canvas.scene.flags?.[MODULE_ID]?.camera) ? "Mark scene not watched" : "Mark scene watched"});
  const pick = await foundry.applications.api.DialogV2.wait({window: {title: `${a.name}: clan feature`}, content: `<div class="wct-sig-window">${body}</div>`, buttons, rejectClose: false});
  if ( pick === "glimpse" ) return glimpse(a);
  if ( pick === "rant" ) return spendRant(a);
  if ( pick === "soil" ) return giveSoil(a);
  if ( pick === "fed" ) return ravnosFed(a);
  if ( pick === "moved" ) return movedOn(a);
  if ( pick === "cam" ) return setCamera(canvas.scene, !S.watched(currentYear(), canvas.scene.flags?.[MODULE_ID]?.camera));
  if ( String(pick).startsWith("vice:") ) return setRavnosVice(a, String(pick).slice(5));
  return null;
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
  Hooks.on("wodxEventFired", ev => onEventFired(ev));
  Hooks.on("wodxItemsTaken", onTaken);
  Hooks.on("createToken", token => onToken(token, null));
  Hooks.on("updateToken", onToken);
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

export const signaturesApi = {rowOf, open, glimpse, hearAs, addMuse, museSeen, setCause, keptTemper, spendRant, addMark, healMark, corruption, setVice, work,
  giveSoil, setCamera, emptyFrame, setRavnosVice, ravnosFed, movedOn, effects, tick, year: () => currentYear(), rules: S};
