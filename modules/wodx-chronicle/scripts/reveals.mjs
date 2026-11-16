/**
 * Twists on the table (Rothenstein Rebuilt, Volume Three picks x1, x2 and x5, B6650-B6659). Rules in reveal-rules.mjs,
 * data in data/twist-reveals-rothenstein.mjs.
 *
 * Revealing a twist (pod.mjs revealTwist) shows it: the thing goes into the hands of a character on the company's map,
 * the marks go on its map through the town looks, or the line is heard by whoever stands on that map (WoDX Senses)
 * for three days (x1). Then the people who know act on their own: they come to the company's map with a home and a
 * round, or leave the valley, or the fronts they move are pushed or stepped, and the street talks (x2).
 * Favours (Vlasta, Yaroslava, and Reinhold told the truth) are debts the Storyteller calls in from the saga window:
 * the one who owes comes to the company's map (x5). Havel, Vlasta and Ctibor's clerk dead by the company's hand are
 * the three murders: after the third, the Lower Town turns cold, with its shutters closed on its maps and each of its
 * people a step cooler toward every character (WoDX NPC attitudes). Hooks wodxFavour and wodxColdTown.
 *
 * State in podState.saga.reveals. Storyteller only.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import * as RR from "./reveal-rules.mjs";
import * as F from "./front-rules.mjs";
import * as S from "./saga-rules.mjs";
import * as Fronts from "./fronts.mjs";
import {bring} from "./encounters.mjs";
import {DAY} from "./terms.mjs";

const BOOK = S.FIRST_BOOK;
const now = () => game.time?.worldTime ?? 0;
const mod = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const pod = () => foundry.utils.deepClone(game.settings.get(MODULE_ID, "podState") ?? {}) ?? {};
const savePod = s => game.settings.set(MODULE_ID, "podState", s);
const sagaOf = s => { const x = s.saga ??= {}; x.endings ??= {}; x.clocks ??= {}; x.books ??= {}; return x; };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const SOUND_FOR = 3 * DAY;

function played(s) {
  const x = sagaOf(s), run = (s.chains ?? []).find(r => r.saga?.book === BOOK);
  if ( x.books[BOOK] === "done" ) return [...F.CHAPTERS];
  return [...(run?.played ?? [])];
}
export const revealState = (s = pod()) => RR.normState(sagaOf(s).reveals ?? {});
async function change(fn) {
  const s = pod(), x = sagaOf(s);
  const r = await fn(RR.normState(x.reveals ?? {}), s);
  x.reveals = r?.state ?? r;
  await savePod(s);
  return r;
}
async function card(title, body, flags = null) {
  return ChatMessage.create({content: `<div class="wodx-card wct-pod wct-reveal"><h3>${esc(title)}</h3>${body}</div>`,
    speaker: {alias: "Chronicle"}, whisper: gmIds(), ...(flags ? {flags: {[MODULE_ID]: flags}} : {})});
}
async function talk(words, key) {
  if ( !words ) return;
  try { await mod("wodx-storyteller")?.signals?.post?.({key, kind: "saga", region: "moravia", weight: 2, what: words, from: "saga"}); }
  catch (e) { console.warn(`${MODULE_ID} | reveal talk`, e); }
}
const isCharacter = a => !!a?.hasPlayerOwner && a.type !== "Group";
const characters = () => game.actors.filter(isCharacter);

/* ---- the reveal ---- */

/** A character on the company's map to hand a thing to: the first player character's token there. */
function handFor(scene) {
  return scene?.tokens.find(t => isCharacter(t.actor))?.actor ?? characters()[0] ?? null;
}
/** Show twist n and set its people moving. Returns the lines for the Storyteller's card. */
export async function onReveal(n, variant = "") {
  if ( !game.user.isGM ) return [];
  n = Number(n);
  const out = [], show = RR.showOf(n), scene = Fronts.sceneFor("@company");
  if ( show?.item ) {
    const a = handFor(scene);
    if ( a ) {
      await a.createEmbeddedDocuments("Item", [{name: show.item.name, type: "Item", system: {description: esc(show.item.text)}, flags: {[MODULE_ID]: {twist: n}}}]);
      out.push(`${show.item.name} is in ${a.name}'s hands.`);
    } else out.push(`No character to hand ${show.item.name} to; give it at the table.`);
  }
  if ( show?.sight ) {
    const where = await Fronts.showSight(`twist:${n}`, show.sight, `twist:${n}`);
    out.push(where ? `On the map: ${where}.` : `No map for ${show.sight.scene} in this world; show it at the table.`);
  }
  if ( show?.sound ) {
    await change(st => ({...st, sounds: {...(st.sounds ?? {}), [n]: {...show.sound, until: now() + SOUND_FOR}}}));
    out.push(`Heard on ${show.sound.scene} for three days: "${show.sound.text}"`);
  }
  for ( const [k, a] of RR.afterOf(n, variant).entries() ) {
    try { const line = await act(a, n, scene, k); if ( line ) out.push(line); } catch (e) { console.warn(`${MODULE_ID} | twist ${n} ${a.do}`, e); }
  }
  const fav = RR.favourOf(n);
  if ( fav ) { await owe(fav); out.push(`${fav.who} owes the company (${fav.what}), to call in from chapter ${F.CHAPTERS.indexOf(fav.from) + 1}.`); }
  Hooks.callAll("wodxTwistShown", {n, variant, lines: out});
  return out;
}
/** One of the who-knows: what they do now. */
async function act(a, n, scene, k) {
  if ( a.do === "comes" ) {
    const r = await bring({name: a.who, preset: a.preset, home: a.home}, `twist:${n}`, scene, k);
    return `${a.who} comes to ${scene?.name ?? "the company"}${r.made ? "" : ", from their round"}.`;
  }
  if ( a.do === "runs" ) {
    const actor = game.actors.getName(a.who);
    if ( actor ) {
      for ( const sc of game.scenes ) { const ids = sc.tokens.filter(t => t.actorId === actor.id).map(t => t.id); if ( ids.length ) await sc.deleteEmbeddedDocuments("Token", ids); }
      if ( actor.flags?.["wodx-npc"]?.routine ) await actor.update({"flags.wodx-npc.routine.on": false});
    }
    await Fronts.setGone(a.who);
    await talk(`${a.who} has not been seen since the night before last.`, `twist:${n}:runs:${a.who}`);
    return `${a.who} leaves the valley${actor ? " (off every map)" : ""}.`;
  }
  if ( a.do === "talk" ) { await talk(a.text, `twist:${n}:talk`); return `In the streets: "${a.text}"`; }
  if ( a.do === "push" ) { await Fronts.pushFront(a.front); return `${F.frontOf(a.front).label} is pushed: it steps at the next turn.`; }
  if ( a.do === "step" ) {
    const st = Fronts.frontState(), at = st.fronts?.[a.front]?.at ?? 0;
    if ( F.frontOf(a.front).steps[at]?.key !== a.step ) return "";
    await Fronts.stepFront(a.front);
    return `${F.frontOf(a.front).label} takes its step now.`;
  }
  if ( a.do === "lean" ) { await Fronts.lean(a.who); return `${a.who} leans closer to the company.`; }
  return "";
}

/** The sounds of reveals still fresh, for WoDX Senses on the map they name. */
export function onSenses({scene, sources} = {}) {
  if ( !Array.isArray(sources) || !scene ) return;
  const st = sagaOf(pod()).reveals ?? {}, t = now();
  for ( const [n, s] of Object.entries(st.sounds ?? {}) ) {
    if ( !(Number(s.until) > t) || !F.pickScene([scene.name], s.scene) ) continue;
    sources.push({id: `twist.${n}.sound`, key: "twist.sound", lines: {sound: [{t: s.text, n: 0}]}, name: `Twist ${n}`, loud: "normal"});
  }
}

/* ---- favours ---- */

async function owe(f) { await change(st => RR.owe(st, f, now())); }
/** A judgement that makes someone owe the company (Reinhold told the truth). */
export async function onFront(p = {}) {
  if ( !isActiveGM() || !p.judgement ) return;
  const f = RR.judgedFavour(p.judgement, p.choice);
  if ( !f || revealState().debts[f.who] ) return;
  await owe(f);
  await card(`${f.who} owes the company`, `<p>${esc(f.what)}. It can be called in from chapter ${F.CHAPTERS.indexOf(f.from) + 1}, from the saga window.</p>`);
}
/** Call a favour in: the one who owes comes to the company's map. */
export async function callFavour(who) {
  if ( !game.user.isGM ) return null;
  const s = pod();
  await change(st => RR.call(st, who, {now: now(), played: played(s)}));
  const d = revealState().debts[who], scene = Fronts.sceneFor("@company");
  const r = await bring({name: who, preset: "labourer", home: ""}, `favour:${who}`, scene, 0);
  await card(`A favour called in: ${who}`, `<p>${esc(who)} comes to ${esc(scene?.name ?? "the company")} to pay what is owed: ${esc(d.what)}.</p><p class="vta-note">What it buys is played at the table; the debt is paid.</p>`);
  Hooks.callAll("wodxFavour", {who, what: d.what, scene: scene?.name ?? "", actor: r.actor?.id});
  return r;
}

/* ---- the three murders ---- */

/** A named NPC fell dead: ask the Storyteller whether it was the company's hand. */
export async function onDeath(effect) {
  if ( !isActiveGM() || !effect?.statuses?.has?.("dead") ) return;
  const a = effect.parent;
  if ( !a || !RR.MURDERS.includes(a.name) || revealState().murders[a.name] ) return;
  await card(`${a.name} is dead`, `<p>Was it by the company's hand? It is one of the three murders: after the third, the Lower Town turns cold.</p>
    <p><button type="button" data-wct-murder="yes" data-name="${esc(a.name)}">By the company's hand</button> <button type="button" data-wct-murder="no" data-name="${esc(a.name)}">No</button></p>`, {murder: {name: a.name}});
}
export function onRenderCard(message, el) {
  if ( !message.flags?.[MODULE_ID]?.murder ) return;
  const root = el?.[0] ?? el;
  for ( const b of root?.querySelectorAll?.("[data-wct-murder]") ?? [] ) {
    if ( !game.user.isGM ) { b.remove(); continue; }
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      if ( b.dataset.wctMurder === "yes" ) await markMurder(b.dataset.name);
      await message.update({content: message.content.replace(/<p><button[^]*?<\/p>/, `<p class="vta-note">${b.dataset.wctMurder === "yes" ? "Counted as a murder." : "Not the company."}</p>`)});
    });
  }
}
export async function markMurder(name) {
  if ( !game.user.isGM ) return null;
  const r = await change(st => RR.murder(st, name, now()));
  Hooks.callAll("wodxMurder", {name, count: r.count});
  if ( r.cold ) await turnCold();
  else await card(`A murder: ${name}`, `<p>${r.count} of ${RR.MURDERS.length}. After the third, the Lower Town turns cold toward the company.</p>`);
  return r;
}
export async function unmarkMurder(name) { if ( game.user.isGM ) await change(st => RR.unmurder(st, name)); }
/** The Lower Town turns cold: shutters on its maps, its people a step cooler toward every character, the talk. */
export async function turnCold() {
  const C = RR.COLD, scenes = game.scenes.filter(sc => sc.name.includes(C.scenes)), marked = [];
  const TL = mod("wodx-storyteller")?.upkeep?.townLooks ?? mod("wodx-storyteller")?.townLooks;
  for ( const sc of scenes ) {
    if ( !TL?.setLooks ) break;
    const r = sc.dimensions?.sceneRect ?? {x: 0, y: 0, width: sc.width, height: sc.height};
    await TL.setLooks(sc, "front:cold", F.sightLooks({looks: C.looks}, {x: r.x, y: r.y, width: r.width, height: r.height}, `cold:${sc.id}`));
    marked.push(sc.name);
  }
  const AT = mod("wodx-npc")?.attitude, pcs = characters();
  let cooled = 0;
  if ( AT?.apply ) {
    const npcs = new Map();
    for ( const sc of scenes ) for ( const t of sc.tokens ) if ( t.actor && !t.actor.hasPlayerOwner ) npcs.set(t.actor.id, game.actors.get(t.actor.id) ?? t.actor);
    for ( const npc of [...npcs.values()].slice(0, 80) ) for ( const pc of pcs ) { await AT.apply(npc, pc, {delta: C.delta, why: "The Lower Town has turned against the newcomers."}); cooled++; }
  }
  await talk(C.talk, "cold:lower-town");
  await card("The Lower Town turns cold", `<p>The third murder. ${marked.length ? `Shutters close on ${esc(marked.join(", "))}.` : "No Lower Town map in this world; show it at the table."} ${cooled ? `Its people are a step cooler toward the company (${cooled} changes).` : ""}</p><p>In the streets: "${esc(C.talk)}"</p>`);
  Hooks.callAll("wodxColdTown", {scenes: marked, cooled});
  return {scenes: marked, cooled};
}

/* ---- the saga window ---- */

export function section(s) {
  const st = RR.normState(sagaOf(s).reveals ?? {}), p = played(s);
  const debts = Object.entries(st.debts).map(([who, d]) => {
    const why = RR.whyNotCall(st, who, p);
    return `<tr data-debt="${esc(who)}"><td><b>${esc(who)}</b><br><span class="vta-note">${esc(d.what)}</span></td><td>${d.called !== null && d.called !== undefined ? "called in" : why ? esc(why) : `<button type="button" data-action="favourCall" data-who="${esc(who)}">Call it in</button>`}</td></tr>`;
  }).join("") || `<tr><td colspan="2">Nobody owes the company yet.</td></tr>`;
  const murders = RR.MURDERS.map(n => st.murders[n] !== undefined ? `<button type="button" data-action="murderUnmark" data-name="${esc(n)}" class="active" title="Take it back">✓ ${esc(n)}</button>` : `<button type="button" data-action="murderMark" data-name="${esc(n)}" title="Killed by the company">${esc(n)}</button>`).join(" ");
  return `<h3>Favours and murders</h3><table class="wodx-check" data-debts><tbody>${debts}</tbody></table>
    <p>The three murders: ${murders}. ${st.cold ? "The Lower Town has turned cold." : "After the third, the Lower Town turns cold."}</p>`;
}
export const ACTIONS = {
  favourCall: async function(e, el) { try { await callFavour(el.dataset.who); } catch (err) { ui.notifications.warn(err.message); } this.render(); },
  murderMark: async function(e, el) { await markMurder(el.dataset.name); this.render(); },
  murderUnmark: async function(e, el) { await unmarkMurder(el.dataset.name); this.render(); }
};
export const api = () => ({state: revealState, show: onReveal, call: callFavour, murder: markMurder, unmurder: unmarkMurder, cold: turnCold, rules: RR});
