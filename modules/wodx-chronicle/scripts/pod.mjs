import {MODULE_ID, esc, isActiveGM, rule} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import {currentYear} from "./eras.mjs";
import * as P from "./pod-rules.mjs";
import {watched} from "./signature-rules.mjs";

/**
 * WoDX Chronicle 0.37.0: four ideas taken from the Princes of Darkness mod, rebuilt on WoDX's own systems.
 *
 *   City exposure (setting podExposure): each breach the witness rules record raises the exposure of the city it
 *     happened in; quiet weeks lower it. A band crossed posts a Storyteller card; the court of the city acts at the
 *     band its sect's law sets, and Hunted starts a rumour. The court card's button brings the culprit to heel.
 *   Great cities (podCities): Paris, Rome, Constantinople, Baghdad, Cairo, Jerusalem, Prague, Brno and Olomouc change
 *     state by date. Senses adds the city's smell and sound; map generation reads api.pod.cityState. A building raised
 *     or restored logs a boon owed by the faction it serves.
 *   Golconda (podGolconda): a seeker's road of ten steps. Killing, frenzy, theft and harmful feeding set it back; a
 *     mentor teaches one step a month (approval queue). At the end the Storyteller may grant Golconda (WoDX Actions'
 *     own golconda flag: no frenzy, no Rötschreck).
 *   Story chains (podChains): dated runs of scenes the clock deals out, and opening goals for new characters.
 *
 *   Lifepath threads (0.44.0, Improvement Desk cr2, B2300 to B2304): with Story chains on, the open threads of each
 *     player character's lifepath (a rival, a debt, someone lost, an enemy) fall due one at a time and go to the
 *     approval queue; an approved one runs as a story chain with the person the lifepath made.
 *
 * World setting podState = {cities: {<name>: {value, at, sect}}, chains: [{id, key, where, at, last, lp?}],
 *   lp: {<actorId>: {since, last, seen: {<threadId>: "put"|"running"|"dismissed"}}}}.
 * Actor flags wodx-chronicle.golconda = {step, mentor, mentorAt, log} and wodx-chronicle.goal = {key, label}.
 *
 *   The Rothenstein saga (podSaga, B3660-B3669): What Sleeps Beneath Rothenstein told over years and ages. Each book
 *     runs as a story chain of dated chapters, interludes and world steps; the next book that fits the year goes to the
 *     approval queue. Steps move four long clocks and post signals (hook wodxSaga); the first book's ending changes
 *     the words of later books. State in podState.saga = {endings, clocks, books}.
 * Each switch starts off. The city of a scene is its flag wodx-chronicle.city, or the setting podCity.
 */

const DAY = 86400;
const T_TEACH = `${MODULE_ID}.podTeach`;
const T_LP = `${MODULE_ID}.podLifepath`;
const T_SAGA = `${MODULE_ID}.podSaga`;
const lineOn = k => { try { return !!game.settings.get(MODULE_ID, k); } catch (e) { return false; } };
const now = () => game.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const toActor = x => x?.documentName === "Actor" ? x : x?.actor ?? (typeof x === "string" ? (game.actors.get(x) ?? fromUuidSync?.(x)) : null);
const kindName = a => String(api("wodx-combat")?.getKind?.(a) ?? a?.type ?? "").toLowerCase();
const isKindred = a => a?.type === "Vampire" || /vampire|kindred/.test(kindName(a));
const state = () => foundry.utils.deepClone(game.settings.get(MODULE_ID, "podState") ?? {}) ?? {};
const saveState = s => game.settings.set(MODULE_ID, "podState", s);
const golOf = a => foundry.utils.deepClone(a?.flags?.[MODULE_ID]?.golconda ?? null);

export function registerPodSettings() {
  const flag = (key, name, hint) => game.settings.register(MODULE_ID, key, {name, hint: `${hint} Off by default.`, scope: "world", config: true, type: Boolean, default: false});
  flag("podExposure", "City Masquerade exposure", "Breaches add up across a city; quiet weeks lower it. The court acts at the band its sect's law sets, and hunters stir when the city is Hunted.");
  flag("podCities", "Great cities that change with history", "Paris, Rome, Constantinople, Baghdad, Cairo, Jerusalem, Prague, Brno and Olomouc change by date; Senses and map generation follow.");
  flag("podGolconda", "Golconda as a long road", "A seeker's road of ten steps, set back by killing, frenzy, theft and harmful feeding, and taught by a mentor month by month.");
  flag("podChains", "Story chains and opening goals", "Dated runs of scenes dealt out by the clock, and three opening goals for each new character.");
  flag("podSaga", "The Rothenstein saga over the years", "What Sleeps Beneath Rothenstein told over years and ages: books of dated chapters and interludes from 880 to 2030, long clocks, and endings that later books answer.");
  game.settings.register(MODULE_ID, "podCity", {name: "The chronicle's city", hint: "The city a scene is in when the scene names none (scene flag wodx-chronicle.city).", scope: "world", config: true, type: String, default: "Rothenstein"});
  game.settings.register(MODULE_ID, "podState", {scope: "world", config: false, type: Object, default: {cities: {}, chains: []}});
  game.settings.registerMenu(MODULE_ID, "podMenu", {name: "Cities, Golconda and story chains", label: "Open", hint: "City exposure, the great cities, story chains and opening goals.",
    icon: "fa-solid fa-city", type: PodApp, restricted: true});
}

/* ---------------- cards ---------------- */

async function card(title, body, {whisper = gmIds(), undo = null, act = null} = {}) {
  const btn = (undo ? `<button type="button" data-wct-pod-undo>Undo</button>` : "") + (act ? `<button type="button" data-wct-pod-act>${esc(act.label)}</button>` : "");
  const flags = {};
  if ( undo ) flags.podUndo = undo;
  if ( act ) flags.podAct = act;
  return ChatMessage.create({content: `<div class="wodx-card wct-pod"><h3>${esc(title)}</h3>${body}${btn}</div>`,
    speaker: {alias: "Chronicle"}, whisper, flags: Object.keys(flags).length ? {[MODULE_ID]: flags} : {}});
}
const ACTS = {};
async function runAct(message) {
  const act = message?.flags?.[MODULE_ID]?.podAct, fn = ACTS[act?.key];
  if ( !fn || !game.user.isGM ) return;
  await message.update({[`flags.${MODULE_ID}.podAct`]: null, content: `${message.content}<p class="vta-note">${esc(act.label)}: done.</p>`});
  await fn(act.data ?? {});
}
/** Undo: {city, before} puts a city's record back; {uuid, path, before} puts an actor's flag back. */
async function runUndo(message) {
  const u = message?.flags?.[MODULE_ID]?.podUndo;
  if ( !u || !game.user.isGM ) return;
  if ( u.city ) { const s = state(); s.cities ??= {}; if ( u.before ) s.cities[u.city] = u.before; else delete s.cities[u.city]; await saveState(s); }
  else { const doc = await fromUuid(u.uuid); if ( doc ) await doc.update({[`flags.${MODULE_ID}.${u.path}`]: u.before ?? null}); }
  await message.update({content: `${message.content}<p class="vta-note">Undone by the Storyteller.</p>`, [`flags.${MODULE_ID}.podUndo`]: null});
}

/* ---------------- city exposure ---------------- */

export const cityOf = scene => String(scene?.flags?.[MODULE_ID]?.city || game.settings.get(MODULE_ID, "podCity") || "the city").trim();
export function exposure(city) {
  const rec = state().cities?.[city] ?? {}, v = P.exposureNow(rec, now());
  return {city, value: v, band: P.bandOf(v), law: P.lawOf(rec, currentYear()), rec};
}
/** Raise a city's exposure. Returns the rule result, or null when the setting is off. */
export async function expose(city, points, {why = "A breach of the Masquerade", by = null} = {}) {
  if ( !lineOn("podExposure") || !isActiveGM() || !points ) return null;
  const s = state(); s.cities ??= {};
  const before = s.cities[city] ? {...s.cities[city]} : null, yr = currentYear();
  const r = P.raise(before ?? {}, points, now(), yr);
  s.cities[city] = r.rec;
  await saveState(s);
  if ( r.crossed ) await card(`${city}: ${r.band.label}`, `<p>${esc(why)} raises the city's exposure from ${r.before} to ${r.value}. ${esc(r.band.note)}</p>`, {undo: {city, before}});
  if ( r.court ) {
    const law = P.lawOf(r.rec, yr);
    await card(`The court of ${city} acts`, `<p>${esc(law.note)} ${by ? `${esc(by.name)} is blamed.` : "The court looks for someone to blame."} An elder can bring a reckless Kindred to heel: Dominate or Presence against the culprit's Willpower, or an accusation before the court. <span class="vta-note">V20 p. 23 (pdf 31): the Masquerade.</span></p>`,
      {act: {key: "heel", label: by ? `Bring ${by.name} to heel` : "The court is seen to act", data: {city, by}}});
  }
  if ( r.hunters ) {
    try { await api("wodx-storyteller")?.rumours?.start?.({text: `People in ${city} say the dead walk at night. Hunters and the faithful are asking questions.`, big: true}); } catch (e) { console.error(`${MODULE_ID} | exposure rumour`, e); }
  }
  return r;
}
ACTS.heel = async ({city, by}) => {
  const s = state(); s.cities ??= {};
  const rec = s.cities[city] ?? {}, v = Math.max(0, P.exposureNow(rec, now()) - P.HEEL_DROP);
  s.cities[city] = {...rec, value: v, at: now()};
  await saveState(s);
  await card(`${city}: the court has acted`, `<p>${by ? `${esc(by.name)} is brought to heel` : "The court makes an example"}. Exposure falls to ${v}.</p>`);
};
async function onBreach(p = {}) {
  if ( !lineOn("podExposure") || !isActiveGM() ) return;
  let scene = canvas?.scene, a = null;
  try { a = p?.by?.uuid ? fromUuidSync(p.by.uuid) : null; a = a?.actor ?? a; const tok = a?.getActiveTokens?.()[0]; if ( tok?.scene ) scene = tok.scene; } catch (e) { /* the Storyteller's scene */ }
  const yr = currentYear(), w = p?.entry?.witnesses?.length ?? 1;
  const pts = P.breachPoints({witnesses: w, year: p?.entry?.spread === false ? 0 : yr, camera: watched(yr, scene?.flags?.[MODULE_ID]?.camera)});
  await expose(cityOf(scene), pts, {why: `A breach (${p?.entry?.event ?? "seen"})`, by: a ? {id: a.id, name: a.name} : null});
}
export async function setSect(city, sect) {
  const s = state(); s.cities ??= {};
  s.cities[city] = {...(s.cities[city] ?? {value: 0, at: now()}), sect: P.SECT_LAW[sect] ? sect : null};
  return saveState(s);
}

/* ---------------- great cities ---------------- */

export function cityState(sceneOrName = canvas?.scene, year = currentYear()) {
  const name = typeof sceneOrName === "string" ? sceneOrName : cityOf(sceneOrName);
  const c = P.cityByName(name);
  const x = c ? P.stateAt(c, year) : null;
  return x ? {city: c.key, name: c.label, state: x.label, from: x.from, text: x.text, tags: x.tags, smell: x.smell, sound: x.sound} : null;
}
function onSenses({scene, sources} = {}) {
  if ( !lineOn("podCities") || !Array.isArray(sources) ) return;
  const st = cityState(scene), lines = P.senseLines(st);
  if ( lines ) sources.push({id: `pod.city.${st.city}`, key: `pod.city`, lines, name: `${st.name}: ${st.state}`, loud: "loud", strong: true});
}
/** A building raised or restored: logs a boon the faction it serves owes the patron. */
export async function raiseBuilding({patron, building, faction, restore = false} = {}) {
  const a = toActor(patron) ?? game.actors.getName?.(patron);
  if ( !lineOn("podCities") || !building ) return null;
  const st = cityState();
  return card(`${restore ? "Restored" : "Raised"}: ${building}`, `<p>${esc(a?.name ?? patron ?? "A patron")} pays to ${restore ? "restore" : "raise"} ${esc(building)}${st ? ` in ${esc(st.name)} (${esc(st.state)})` : ""}. ${faction ? `${esc(faction)} gains by it and owes a boon.` : ""}</p>`,
    faction && a ? {act: {key: "boon", label: "Log the boon", data: {from: {id: null, name: faction}, to: {id: a.id, name: a.name}, what: `${restore ? "restoring" : "raising"} ${building}`}}} : {});
}
ACTS.boon = async ({from, to, what}) => { await api("wodx-storyteller")?.ledger?.save?.({kind: "boon", size: "minor", from, to, what}); };

/* ---------------- Golconda ---------------- */

export const golconda = actorOrId => golOf(toActor(actorOrId));
export async function seek(actorOrId, mentor = "") {
  const a = toActor(actorOrId);
  if ( !a || !lineOn("podGolconda") || golOf(a) ) return null;
  const rec = {step: 0, mentor: mentor || null, mentorAt: mentor ? now() : null, log: [{t: now(), text: "Set out on the road"}]};
  await a.update({[`flags.${MODULE_ID}.golconda`]: rec});
  return card(`${a.name} seeks Golconda`, `<p>The road has ${P.GOLCONDA_STEPS} steps. Killing, frenzy, theft and harmful feeding set it back; a mentor teaches a step a month. <span class="vta-note">V20 p. 30 (pdf 38).</span></p>`, {whisper: ownerIds(a)});
}
export async function golcondaStep(actorOrId, delta, why) {
  const a = toActor(actorOrId), before = golOf(a);
  if ( !a || !before || !lineOn("podGolconda") || !delta ) return null;
  if ( !game.user.isGM && !a.isOwner ) return null;
  const rec = P.golcondaStep(before, delta);
  rec.log = [...(before.log ?? []), {t: now(), text: `${delta > 0 ? "+" : ""}${delta}: ${why}`}].slice(-12);
  await a.update({[`flags.${MODULE_ID}.golconda`]: rec});
  await card(`${a.name}: the road to Golconda`, `<p>${esc(why)}. Step ${rec.step} of ${P.GOLCONDA_STEPS}.</p>`, {whisper: ownerIds(a), undo: {uuid: a.uuid, path: "golconda", before}});
  if ( rec.step >= P.GOLCONDA_STEPS && before.step < P.GOLCONDA_STEPS )
    await card(`${a.name} stands at the threshold`, `<p>The road is walked. Whether ${esc(a.name)} reaches Golconda is the Storyteller's call.</p>`, {act: {key: "grant", label: "Grant Golconda", data: {uuid: a.uuid}}});
  return rec;
}
ACTS.grant = async ({uuid}) => { const a = await fromUuid(uuid); if ( a ) await a.setFlag("wodx-actions", "golconda", true); };
export const setback = (actorOrId, kind) => { const s = P.GOLCONDA_SETBACKS[kind]; return s ? golcondaStep(actorOrId, -s.steps, `${toActor(actorOrId)?.name ?? "The seeker"} ${s.label}`) : null; };
export async function setMentor(actorOrId, mentor = "") {
  const a = toActor(actorOrId), rec = golOf(a);
  if ( !a || !rec ) return null;
  return a.update({[`flags.${MODULE_ID}.golconda`]: {...rec, mentor: mentor || null, mentorAt: mentor ? now() : null}});
}
const seekers = () => game.actors.filter(a => golOf(a));
function onDamage(target, info = {}) {
  if ( !lineOn("podGolconda") || !isActiveGM() || !info?.attacker || !P.killed(info.before, info.after) ) return;
  let by = null;
  try { by = fromUuidSync(info.attacker); by = by?.actor ?? by; } catch (e) { by = null; }
  if ( by && golOf(by) && by.id !== target?.id ) setback(by, "kill");
}
function onActorUpdate(a, change) {
  if ( !lineOn("podGolconda") || !isActiveGM() || change?.system?.conditions?.isfrenzy !== true || !golOf(a) ) return;
  setback(a, "frenzy");
}
function onSocial({actor, act, result} = {}) {
  if ( !lineOn("podGolconda") || !isActiveGM() || act !== "lift" || result !== "win" || !golOf(actor) ) return;
  setback(actor, "theft");
}
function onFed(p = {}) {
  if ( !lineOn("podGolconda") || !isActiveGM() || !P.harmfulFeed(p) ) return;
  let a = null;
  try { a = fromUuidSync(p.by?.uuid); a = a?.actor ?? a; } catch (e) { a = null; }
  if ( golOf(a) ) setback(a, "harm");
}
async function teachTick() {
  for ( const a of seekers() ) {
    const r = golOf(a), n = P.mentorTerms(r.mentorAt, now());
    if ( !r.mentor || n < 1 || r.step >= P.GOLCONDA_STEPS ) continue;
    await propose({type: T_TEACH, key: `golconda:${a.id}:${Math.floor(r.mentorAt / DAY)}`, title: `${r.mentor} teaches ${a.name}`, detail: `A month of teaching on the road to Golconda: one step.`, data: {actor: a.id}});
  }
}

/* ---------------- story chains and goals ---------------- */

export async function startChain(key, where = "") {
  const c = P.chainByKey(key);
  if ( !c || !lineOn("podChains") || !game.user.isGM ) return null;
  const s = state(); s.chains ??= [];
  const run = {id: foundry.utils.randomID(), key, where: where || cityOf(canvas?.scene), at: 0, last: now()};
  s.chains.push(run);
  await saveState(s);
  await dealChains();
  return run;
}
export async function stopChain(id) { const s = state(); s.chains = (s.chains ?? []).filter(r => r.id !== id); return saveState(s); }
/** Post every step that has fallen due. */
export async function dealChains() {
  if ( !(lineOn("podChains") || lineOn("podSaga")) || !isActiveGM() ) return;
  const s = state(), t = now(), yr = currentYear();
  let changed = false;
  for ( const run of s.chains ?? [] ) {
    if ( !lineOn(run.saga ? "podSaga" : "podChains") ) continue;
    let n = P.nextStep(run, yr);
    while ( n && n.due <= t ) {
      const c = P.chainOf(run, yr);
      if ( run.saga ) await sagaStep(s, run, c, n);
      else await card(`${c.label}, ${n.index + 1} of ${c.steps.length}: ${n.title}`, `<p>${esc(run.where)}. ${esc(n.text)}</p>${n.last ? `<p class="vta-note">The last step. ${esc(c.page)}.</p>` : ""}`);
      run.at = n.index + 1; run.last = t; changed = true;
      n = P.nextStep(run, yr);
    }
    if ( run.saga && !n ) { (s.saga ??= {}).books ??= {}; s.saga.books[run.saga.book] = "done"; changed = true; }
  }
  if ( changed ) { s.chains = s.chains.filter(r => P.nextStep(r, yr)); await saveState(s); }
}

/* ---------------- the Rothenstein saga (B3660-B3669) ---------------- */

const sagaOf = s => { const x = s.saga ??= {}; x.endings ??= {}; x.clocks ??= {}; x.books ??= {}; return x; };
const futureOn = () => { try { return !!rule("futureBranch"); } catch (e) { return false; } };
/** A link to the step's notes page when the world has it, else its name. */
function notesLink(j) {
  if ( !j ) return "";
  const e = game.journal?.getName?.(j.entry);
  const p = e?.pages?.find?.(x => x.name === j.page || x.name.startsWith(`${j.page}:`));
  return p ? `@UUID[${p.uuid}]{${esc(p.name)}}` : `${esc(j.entry)}, ${esc(j.page)}`;
}
async function sagaStep(s, run, c, n) {
  const x = sagaOf(s), kind = {chapter: "A chapter to play", interlude: "Time passes", world: "The world moves"}[n.kind] ?? "";
  const before = {...x.clocks};
  x.clocks = P.saga.moveClocks(x.clocks, n.clocks ?? {});
  const moved = P.saga.SAGA_CLOCKS.filter(k => (x.clocks[k.key] ?? 0) !== (before[k.key] ?? 0))
    .map(k => `${esc(k.label)}: ${x.clocks[k.key]} of ${k.size}`);
  const full = P.saga.fullClocks(x.clocks).filter(k => (before[k.key] ?? 0) < k.size);
  const body = [`<p><b>${esc(kind)}</b>, planned for ${esc(n.date)}. ${esc(run.where)}. ${esc(n.text)}</p>`,
    n.journal ? `<p>Notes: ${notesLink(n.journal)}.</p>` : "",
    n.encounters?.length ? `<p>Encounters that fit the season: ${esc(n.encounters.join(", "))}.</p>` : "",
    moved.length ? `<p>The long clocks: ${moved.join("; ")}.</p>` : "",
    full.length ? `<p class="vta-note">Full now: ${full.map(k => esc(k.text)).join(" ")}</p>` : "",
    n.ending ? `<p class="vta-note">Pick the ending in the saga window: ${n.ending.map(k => esc(P.saga.SAGA_ENDINGS[k].label)).join(", ")}.</p>` : "",
    n.last ? `<p class="vta-note">The last step of this book.</p>` : ""].join("");
  await card(`${c.label}, ${n.index + 1} of ${c.steps.length}: ${n.title}`, body);
  Hooks.callAll("wodxSaga", {book: run.saga.book, step: n.key, kind: n.kind, title: n.title, where: run.where, year: n.at?.[0] ?? null,
    clocks: {...x.clocks}, signal: n.signal ?? null, ending: n.ending ?? null, town: n.town ?? null});
}
export function sagaState() { return foundry.utils.deepClone(sagaOf(state())); }
/**
 * The running book's step for other systems (the night draw): the step dealt last, or the first one when none has
 * come yet, and the next one with when it falls due. Null when no book runs (B3669).
 */
export function sagaCurrent() {
  const s = state(), run = (s.chains ?? []).find(r => r.saga && lineOn("podSaga"));
  if ( !run ) return null;
  const c = P.chainOf(run, currentYear());
  if ( !c ) return null;
  const pick = x => x ? {key: x.key, kind: x.kind, title: x.title, text: x.text, date: x.date} : null;
  const at = Number(run.at) || 0, n = P.nextStep(run, currentYear());
  return {book: run.saga.book, title: c.label, step: pick(c.steps[Math.max(0, at - 1)]), dealt: at > 0,
    next: n ? {...pick(n), due: n.due} : null};
}
/** Start a book of the saga now (approval, or the window). */
export async function startSaga(book, where = "") {
  const b = P.saga.bookByKey(book);
  if ( !b || !lineOn("podSaga") || !game.user.isGM ) return null;
  const s = state(), x = sagaOf(s);
  s.chains ??= [];
  if ( s.chains.some(r => r.saga?.book === b.key) ) return null;
  const run = {id: foundry.utils.randomID(), key: P.saga.chainKey(b.key), where: where || P.saga.SAGA.where, at: 0, last: now(),
    saga: {book: b.key, endings: {...x.endings}}};
  s.chains.push(run);
  x.books[b.key] = "running";
  await saveState(s);
  await dealChains();
  return run;
}
export async function skipSaga(book) {
  if ( !P.saga.bookByKey(book) || !game.user.isGM ) return;
  const s = state(), x = sagaOf(s);
  s.chains = (s.chains ?? []).filter(r => r.saga?.book !== book);
  x.books[book] = "skipped";
  await saveState(s);
}
/** Record a book's ending; running books pick up the first book's ending for their later words. */
export async function setEnding(book, ending) {
  if ( !P.saga.bookByKey(book) || (ending && !P.saga.SAGA_ENDINGS[ending]) || !game.user.isGM ) return;
  const s = state(), x = sagaOf(s);
  if ( ending ) x.endings[book] = ending; else delete x.endings[book];
  for ( const r of s.chains ?? [] ) if ( r.saga ) r.saga.endings = {...x.endings};
  await saveState(s);
}
export async function setSagaClock(key, value) {
  if ( !P.saga.SAGA_CLOCKS.some(c => c.key === key) || !game.user.isGM ) return;
  const s = state(), x = sagaOf(s);
  x.clocks = P.saga.moveClocks({...x.clocks, [key]: Number(value) || 0});
  await saveState(s);
}
/** Put the next book that fits the year to the Storyteller, once. */
export async function sagaTick() {
  if ( !lineOn("podSaga") || !isActiveGM() ) return;
  const s = state(), x = sagaOf(s), yr = currentYear();
  const gone = P.saga.passedBooks(x, yr, {future: futureOn()});
  if ( gone.length ) {
    const before = {...x.clocks};
    for ( const g of gone ) { x.clocks = P.saga.moveClocks(x.clocks, P.saga.worldDelta(g)); x.books[g.key] = "passed"; }
    await saveState(s);
    const moved = P.saga.SAGA_CLOCKS.filter(k => (x.clocks[k.key] ?? 0) !== (before[k.key] ?? 0)).map(k => `${esc(k.label)}: ${x.clocks[k.key]} of ${k.size}`);
    await card("The Rothenstein saga: years gone by", `<p>The clock passed ${gone.map(g => esc(g.title)).join(", ")} without play. What the wider world did in those years still happened.</p>${moved.length ? `<p>The long clocks: ${moved.join("; ")}.</p>` : ""}<p class="vta-note">Any of them can still be started from the saga window.</p>`);
  }
  const b = P.saga.dueBook(x, yr, {future: futureOn()});
  if ( !b ) return;
  x.books[b.key] = "offered";
  await saveState(s);
  await propose({type: T_SAGA, key: `saga:${b.key}`, title: `The Rothenstein saga, book ${b.n}: ${b.title}`,
    detail: `${b.from} to ${b.to}. ${b.text} Approve to start it; reject to skip this book.`, data: {book: b.key}});
}

/* ---------------- lifepath threads (cr2) ---------------- */

const threadsOf = a => { try { return api("wodx-creation")?.lifepathThreads?.(a) ?? []; } catch (e) { return []; } };
const pcs = () => [...(game.actors ?? [])].filter(a => a.hasPlayerOwner && !/group|spirit|creature/i.test(String(a.type)));

/** Put each character's next due thread to the Storyteller (one per character per call). */
export async function lifepathTick() {
  if ( !lineOn("podChains") || !isActiveGM() ) return;
  const s = state(), t = now();
  s.lp ??= {};
  let changed = false;
  for ( const a of pcs() ) {
    const threads = threadsOf(a);
    if ( !threads.length ) continue;
    if ( !s.lp[a.id] ) { s.lp[a.id] = {since: t, last: null, seen: {}}; changed = true; }
    const st = s.lp[a.id], x = P.lpNext(st, threads, t);
    if ( !x ) continue;
    st.seen[x.id] = "put"; st.last = t; changed = true;
    await propose({type: T_LP, key: `lp:${a.id}:${x.id}`, title: `From ${a.name}'s past: ${x.label.toLowerCase()}`,
      detail: `${x.year}, ${x.scene}: ${x.name ? `${x.name}, ` : ""}${P.third(x.role, a.name)}${x.note ? `, ${P.third(x.note, a.name)}` : ""}. Approve to run it as a story chain; reject to leave it in the past.`,
      data: {actor: a.id, thread: x}});
  }
  if ( changed ) await saveState(s);
}

/** Start a thread's chain now (approval, or the Storyteller's window). */
export async function startThread(actorId, thread, where = "") {
  if ( !game.user.isGM || !thread?.kind ) return null;
  const a = game.actors.get(actorId), s = state();
  s.chains ??= []; s.lp ??= {};
  const st = s.lp[actorId] ??= {since: now(), last: now(), seen: {}};
  if ( s.chains.some(r => r.lp?.actorId === actorId && r.lp?.id === thread.id) ) return null;
  st.seen[thread.id] = "running";
  const run = {id: foundry.utils.randomID(), key: `lp:${thread.kind}`, where: where || cityOf(canvas?.scene), at: 0, last: now(),
    lp: {...thread, actorId, actorName: a?.name ?? ""}};
  if ( thread.actorId ) { const n = game.actors.get(thread.actorId); if ( n ) run.lp.name = n.name; }
  s.chains.push(run);
  await saveState(s);
  await dealChains();
  return run;
}
async function dismissThread(actorId, id) {
  if ( !actorId || !id ) return;
  const s = state(); s.lp ??= {};
  (s.lp[actorId] ??= {since: now(), last: now(), seen: {}}).seen[id] = "dismissed";
  await saveState(s);
}
const lineOf = a => { const t = a?.type ?? "", k = kindName(a);
  if ( t === "Vampire" || /vampire/.test(k) ) return "vampire";
  if ( ["Werewolf", "Changing Breed"].includes(t) || /garou|werewolf|fera/.test(k) ) return "werewolf";
  if ( t === "Mage" || /\bmage/.test(k) ) return "mage";
  if ( t === "Changeling" || /changeling/.test(k) ) return "changeling";
  if ( t === "Wraith" || /wraith/.test(k) ) return "wraith";
  if ( t === "Hunter" || /hunter/.test(k) ) return "hunter";
  return "mortal"; };
export const goals = actorOrId => P.goalsFor(lineOf(toActor(actorOrId)), currentYear());
export async function setGoal(actorOrId, key) {
  const a = toActor(actorOrId), g = goals(a).find(x => x.key === key);
  if ( !a || !g || !lineOn("podChains") ) return null;
  await a.update({[`flags.${MODULE_ID}.goal`]: g});
  return card(`${a.name}: an opening goal`, `<p>${esc(g.label)}.</p>`, {whisper: ownerIds(a)});
}
function onFirstNight(actor) {
  if ( !lineOn("podChains") || !isActiveGM() || actor?.flags?.[MODULE_ID]?.goal ) return;
  card(`${actor.name}: pick an opening goal`, `<ul>${goals(actor).map(g => `<li>${esc(g.label)}</li>`).join("")}</ul><p class="vta-note">Pick one in the character's feature window.</p>`, {whisper: ownerIds(actor)});
}

/* ---------------- the feature window's part ---------------- */

/** Whether the feature window has anything of these four for an actor. */
export const wants = a => !!a && ((lineOn("podGolconda") && isKindred(a)) || (lineOn("podChains") && a.hasPlayerOwner && !a.flags?.[MODULE_ID]?.goal));
/** {body, buttons, handle(pick)} for the signature window. */
export function section(a) {
  let body = "";
  const buttons = [];
  const gol = golOf(a), goal = a?.flags?.[MODULE_ID]?.goal;
  if ( lineOn("podGolconda") && isKindred(a) ) {
    if ( gol ) {
      body += `<h4>The road to Golconda</h4><p>Step ${gol.step} of ${P.GOLCONDA_STEPS}${gol.mentor ? `; taught by ${esc(gol.mentor)}` : ""}.</p>`;
      if ( gol.log?.length ) body += `<ul>${gol.log.slice(-4).map(l => `<li>${esc(l.text)}</li>`).join("")}</ul>`;
      buttons.push({action: "pod:mentor", label: gol.mentor ? "Change the mentor" : "Find a mentor"});
      if ( game.user.isGM ) buttons.push({action: "pod:step", label: "A step on the road"});
    } else buttons.push({action: "pod:seek", label: "Seek Golconda"});
  }
  if ( lineOn("podChains") ) {
    if ( goal ) body += `<h4>Opening goal</h4><p>${esc(goal.label)}.</p>`;
    else goals(a).forEach(g => buttons.push({action: `pod:goal:${g.key}`, label: `Goal: ${g.label}`}));
  }
  return {body, buttons};
}
export async function handle(a, pick, ask) {
  if ( pick === "pod:seek" ) return seek(a);
  if ( pick === "pod:mentor" ) { const f = await ask("A mentor", [{name: "m", label: "The mentor's name (blank for none)", value: golOf(a)?.mentor ?? ""}]); return f ? setMentor(a, f.m) : null; }
  if ( pick === "pod:step" ) { const f = await ask("A step on the road", [{name: "why", label: "What the seeker did or learned", value: "A test of the road passed"}]); return f ? golcondaStep(a, 1, f.why || "A test of the road passed") : null; }
  if ( String(pick).startsWith("pod:goal:") ) return setGoal(a, String(pick).slice(9));
  return null;
}

/* ---------------- the Storyteller's window ---------------- */

const {ApplicationV2} = foundry.applications.api;
export class PodApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {id: "wodx-pod", classes: ["wodx", "wodx-pod"], window: {title: "Cities, Golconda and story chains", resizable: true},
    position: {width: 600, height: 640},
    actions: {
      sect: async function(e, el) { await setSect(el.dataset.city, el.closest("[data-row]").querySelector("select").value); this.render(); },
      quiet: async function(e, el) { const s = state(); delete s.cities?.[el.dataset.city]; await saveState(s); this.render(); },
      chain: async function(e, el) { const k = this.element.querySelector("select[name=chain]").value, w = this.element.querySelector("input[name=where]").value.trim(); await startChain(k, w); this.render(); },
      stop: async function(e, el) { await stopChain(el.dataset.id); this.render(); },
      sagaStart: async function(e, el) { await startSaga(el.dataset.book); this.render(); },
      sagaSkip: async function(e, el) { await skipSaga(el.dataset.book); this.render(); },
      sagaClocks: async function() { for ( const i of this.element.querySelectorAll("[data-clock]") ) await setSagaClock(i.dataset.clock, i.value); this.render(); },
      thread: async function(e, el) { const a = game.actors.get(el.dataset.actor), x = threadsOf(a).find(t => t.id === el.dataset.thread); if ( x ) await startThread(a.id, x); this.render(); },
      build: async function() { const f = this.element.querySelector("[data-build]"), v = n => f.querySelector(`[name=${n}]`).value.trim();
        await raiseBuilding({patron: v("patron"), building: v("building"), faction: v("faction"), restore: f.querySelector("[name=restore]").checked}); }
    }};
  _onRender() {
    for ( const sel of this.element.querySelectorAll("select[data-ending]") ) sel.addEventListener("change", () => setEnding(sel.dataset.ending, sel.value).then(() => this.render()));
  }
  async _renderHTML() {
    const s = state(), yr = currentYear(), parts = [];
    const sects = Object.entries(P.SECT_LAW);
    if ( lineOn("podExposure") ) {
      const names = [...new Set([cityOf(canvas?.scene), ...Object.keys(s.cities ?? {})])];
      parts.push(`<h3>City exposure</h3><table class="wodx-check"><tbody>${names.map(c => { const x = exposure(c);
        return `<tr data-row><td>${esc(c)}</td><td>${x.value} (${esc(x.band.label)})</td><td><select data-fixed>${sects.map(([k, l]) => `<option value="${k}" ${k === x.law.key ? "selected" : ""}>${esc(l.label)}</option>`).join("")}</select></td>
        <td><button type="button" data-action="sect" data-city="${esc(c)}">Set law</button> <button type="button" data-action="quiet" data-city="${esc(c)}">Quiet</button></td></tr>`; }).join("")}</tbody></table>`);
    }
    if ( lineOn("podCities") ) {
      const st = cityState();
      parts.push(`<h3>Great cities in ${yr}</h3>${st ? `<p>This scene is in <b>${esc(st.name)}: ${esc(st.state)}</b>.</p>` : ""}<ul>${P.CITIES.map(c => { const x = P.stateAt(c, yr); return `<li><b>${esc(c.label)}</b>: ${esc(x.label)}. ${esc(x.text)}</li>`; }).join("")}</ul>
        <div data-build class="form-group"><input name="patron" placeholder="Patron (a character)"><input name="building" placeholder="Building"><input name="faction" placeholder="Faction that gains"><label><input type="checkbox" name="restore"> Restore</label><button type="button" data-action="build">Raise or restore</button></div>`);
    }
    if ( lineOn("podChains") ) {
      const list = P.chainsFor(yr);
      parts.push(`<h3>Story chains</h3><ul>${(s.chains ?? []).map(r => { const c = P.chainOf(r, yr), n = P.nextStep(r, yr); return `<li>${esc(c?.label ?? r.key)} at ${esc(r.where)}: ${n ? `next, ${esc(n.title)}, in ${Math.max(0, Math.ceil((n.due - now()) / DAY))} days` : "done"} <button type="button" data-action="stop" data-id="${r.id}">Stop</button></li>`; }).join("") || "<li>None running.</li>"}</ul>
        ${list.length ? `<div class="form-group"><select name="chain" data-fixed>${list.map(c => `<option value="${c.key}">${esc(c.label)}</option>`).join("")}</select><input name="where" placeholder="Where (blank for this city)"><button type="button" data-action="chain">Start</button></div>` : `<p>No chain fits ${yr}.</p>`}`);
      const seenOf = id => s.lp?.[id]?.seen ?? {}, word = {put: "waiting for approval", running: "running", dismissed: "left in the past"};
      const rows = pcs().flatMap(a => threadsOf(a).map(x => `<li>${esc(a.name)}: ${esc(x.label)} (${x.year}, ${esc(x.name ? `${x.name}, ${x.role}` : x.role)})${seenOf(a.id)[x.id] ? `, ${word[seenOf(a.id)[x.id]] ?? ""}` : ` <button type="button" data-action="thread" data-actor="${a.id}" data-thread="${esc(x.id)}">Start now</button>`}</li>`));
      parts.push(`<h3>Threads from the past</h3><ul>${rows.join("") || "<li>No open threads. They come from a character's lifepath.</li>"}</ul><p class="vta-note">Each falls due by itself in time and comes to the approval queue.</p>`);
    }
    if ( lineOn("podSaga") ) {
      const x = sagaOf(s), word = {running: "running", done: "done", skipped: "skipped", passed: "passed without play", offered: "waiting for approval", ready: "fits the year", ahead: "later", past: "its years are past"};
      const books = P.saga.bookStates(x, yr, {future: futureOn()});
      const ends = Object.entries(P.saga.SAGA_ENDINGS);
      parts.push(`<h3>The Rothenstein saga</h3><p>${esc(P.saga.SAGA.title)}, told over the years. The next book that fits the year comes to the approval queue.</p>
        <table class="wodx-check"><tbody>${P.saga.SAGA_CLOCKS.map(c => `<tr><td>${esc(c.label)}</td><td><input type="number" min="0" max="${c.size}" value="${x.clocks[c.key] ?? 0}" data-clock="${c.key}" style="width:4em"> of ${c.size}</td></tr>`).join("")}</tbody></table>
        <button type="button" data-action="sagaClocks">Set the clocks</button>
        <ul>${books.map(b => { const bk = P.saga.bookByKey(b.key), endable = bk.steps.some(st => st.ending);
          return `<li><b>${b.n}. ${esc(b.title)}</b> (${b.from < 0 ? `${-b.from} BCE` : b.from} to ${b.to}): ${esc(word[b.state] ?? b.state)}
          ${["ready", "past", "passed", "offered", "skipped", "ahead"].includes(b.state) ? ` <button type="button" data-action="sagaStart" data-book="${b.key}">Start</button>` : ""}
          ${b.state === "running" || b.state === "ready" ? ` <button type="button" data-action="sagaSkip" data-book="${b.key}">Skip</button>` : ""}
          ${endable ? ` <select data-ending="${b.key}" data-fixed><option value="">No ending yet</option>${ends.map(([k, e]) => `<option value="${k}" ${x.endings[b.key] === k ? "selected" : ""}>${esc(e.label)}</option>`).join("")}</select>` : ""}</li>`; }).join("")}</ul>
        <p class="vta-note">${x.endings[P.saga.FIRST_BOOK] ? esc(P.saga.SAGA_ENDINGS[x.endings[P.saga.FIRST_BOOK]].text) : "The first book's ending changes the words of later books."}</p>`);
    }
    if ( lineOn("podGolconda") ) {
      const list = seekers();
      parts.push(`<h3>Seekers of Golconda</h3><ul>${list.map(a => `<li>${esc(a.name)}: step ${golOf(a).step} of ${P.GOLCONDA_STEPS}${golOf(a).mentor ? `, taught by ${esc(golOf(a).mentor)}` : ""}</li>`).join("") || "<li>None.</li>"}</ul><p class="vta-note">Start or teach from the character's Signature feature window.</p>`);
    }
    if ( !parts.length ) parts.push(`<p>Turn on City Masquerade exposure, Great cities, Golconda as a long road, Story chains or the Rothenstein saga in the module settings.</p>`);
    return `<div class="wodx-pod-body" style="overflow-y:auto;height:100%">${parts.join("")}</div>`;
  }
  _replaceHTML(result, content) { content.innerHTML = result; }
}

/* ---------------- hooks ---------------- */

export function registerPodHooks() {
  registerHandler(T_TEACH, {label: "A mentor teaches a step on the road to Golconda", approve: async e => {
    const a = game.actors.get(e.data?.actor), r = golOf(a);
    if ( !a || !r?.mentor ) return;
    await a.update({[`flags.${MODULE_ID}.golconda.mentorAt`]: (r.mentorAt ?? now()) + P.MENTOR_DAYS * DAY});
    await golcondaStep(a, 1, `${r.mentor}'s teaching`);
  }});
  registerHandler(T_LP, {label: "A thread from a character's lifepath returns as a story chain",
    approve: e => startThread(e.data?.actor, e.data?.thread), reject: e => dismissThread(e.data?.actor, e.data?.thread?.id)});
  registerHandler(T_SAGA, {label: "The next book of the Rothenstein saga", approve: e => startSaga(e.data?.book), reject: e => skipSaga(e.data?.book)});
  Hooks.on("wodxBreach", p => { onBreach(p).catch(e => console.error(`${MODULE_ID} | exposure`, e)); });
  Hooks.on("wodxSensesGather", onSenses);
  Hooks.on("wodxDamageApplied", onDamage);
  Hooks.on("updateActor", onActorUpdate);
  Hooks.on("wodxSocial", onSocial);
  Hooks.on("wodxFed", onFed);
  Hooks.on("wodxFirstNightSigned", onFirstNight);
  let last = 0;
  const tick = () => { if ( !isActiveGM() || Date.now() - last < 2000 ) return; last = Date.now();
    dealChains().then(() => lifepathTick()).then(() => sagaTick()).catch(e => console.error(`${MODULE_ID} | story chains`, e));
    if ( lineOn("podGolconda") ) teachTick().catch(e => console.error(`${MODULE_ID} | Golconda`, e)); };
  Hooks.on("updateWorldTime", tick);
  Hooks.on("wodxSkipEnd", tick);
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const root = el?.[0] ?? el;
    const a = root?.querySelector?.("[data-wct-pod-act]");
    if ( a ) { if ( !game.user.isGM || !message.flags?.[MODULE_ID]?.podAct ) a.remove(); else a.addEventListener("click", () => runAct(message)); }
    const b = root?.querySelector?.("[data-wct-pod-undo]");
    if ( b ) { if ( !game.user.isGM || !message.flags?.[MODULE_ID]?.podUndo ) b.remove(); else b.addEventListener("click", () => runUndo(message)); }
  });
}

export const podApi = {exposure, expose, setSect, cityOf, cityState, raiseBuilding, golconda, seek, golcondaStep, setback, setMentor,
  startChain, stopChain, dealChains, lifepathTick, startThread, threads: threadsOf, goals, setGoal,
  saga: {state: sagaState, current: sagaCurrent, start: startSaga, skip: skipSaga, ending: setEnding, clock: setSagaClock, tick: sagaTick, rules: P.saga}, open: () => new PodApp().render(true), rules: P};
