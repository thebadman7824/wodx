/**
 * Book one's encounters on the table (Rothenstein Rebuilt, Volume Two picks v1-v6, B6640-B6649). Rules in
 * encounter-rules.mjs, data in data/encounters-rothenstein.mjs.
 *
 * While book one runs, the saga's tick (and arriving on a map) offers the Storyteller a card for each encounter that
 * fits where the company stands, in its months and chapter: Play, Not tonight, Never (v1). Play puts its people on
 * the company's map as NPCs with a home and a ready routine (WoDX NPC routines, v4), lands its front step if that is
 * the front's next, pushes and leans as its ties say, and offers the clue carriers it holds as Found buttons (v6).
 * Each plays once; Not tonight brings it back a day later (v2). When its window closes unmet, what would have happened
 * happens off the map: the street talk on the signal board, the saga clocks, a sight on the map, the fronts (v3).
 * A twist waits for its encounter to be played (pod.mjs passes met to twist-rules, v5). Hook wodxEncounter.
 *
 * State in podState.saga.encounters. Storyteller only; the saga window holds the list.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import * as E from "./encounter-rules.mjs";
import * as F from "./front-rules.mjs";
import * as S from "./saga-rules.mjs";
import * as Fronts from "./fronts.mjs";
import {getEngine} from "./calendar.mjs";

const BOOK = S.FIRST_BOOK;
const now = () => game.time?.worldTime ?? 0;
const mod = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const pod = () => foundry.utils.deepClone(game.settings.get(MODULE_ID, "podState") ?? {}) ?? {};
const savePod = s => game.settings.set(MODULE_ID, "podState", s);
const sagaOf = s => { const x = s.saga ??= {}; x.endings ??= {}; x.clocks ??= {}; x.books ??= {}; return x; };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const FOLDER = "Rothenstein encounters";

function played(s) {
  const x = sagaOf(s), run = (s.chains ?? []).find(r => r.saga?.book === BOOK);
  if ( x.books[BOOK] === "done" ) return [...F.CHAPTERS];
  return [...(run?.played ?? [])];
}
const running = s => sagaOf(s).books[BOOK] === "running";
const monthNow = () => { try { return Number(getEngine().timeToDate(now()).month) || 0; } catch (e) { return 0; } };
const sceneName = () => Fronts.sceneFor("@company")?.name ?? "";
const ctxOf = (s, extra = {}) => ({now: now(), played: played(s), month: monthNow(), scene: sceneName(), ...extra});

export const encounterState = (s = pod()) => E.normState(sagaOf(s).encounters ?? {}, now());
/** The encounters played, for the twists (twist-rules ctx.met). */
export const metOf = s => E.met(E.normState(sagaOf(s).encounters ?? {}, now()));
async function change(fn) {
  const s = pod(), x = sagaOf(s);
  const st = E.normState(x.encounters ?? {}, now());
  const r = await fn(st, s);
  x.encounters = r;
  await savePod(s);
  return r;
}
async function card(title, body, flags = null) {
  return ChatMessage.create({content: `<div class="wodx-card wct-pod wct-encounter"><h3>${esc(title)}</h3>${body}</div>`,
    speaker: {alias: "Chronicle"}, whisper: gmIds(), ...(flags ? {flags: {[MODULE_ID]: flags}} : {})});
}
async function talk(words, key) {
  if ( !words ) return;
  try { await mod("wodx-storyteller")?.signals?.post?.({key: `encounter:${key}`, kind: "saga", region: "moravia", weight: 2, what: words, from: "saga"}); }
  catch (e) { console.warn(`${MODULE_ID} | encounter talk`, e); }
}
const where = e => e.scenes.join(", ");
const windowOf = e => `${e.months?.length ? `${E.monthNames(e.months)}; ` : ""}from chapter ${F.CHAPTERS.indexOf(e.from) + 1}, closes after chapter ${F.CHAPTERS.indexOf(E.closesAfter(e)) + 1}`;

/* ---- the offer ---- */

/** The card that offers an encounter: who, where, its window, and the three buttons. */
async function offerCard(n) {
  const e = E.encounterOf(n), ch = F.chapterNow(played(pod()));
  const people = e.people.map(p => p.name);
  return card(`Encounter ${e.n}: ${e.label}`, [
    `<p>${esc(E.KINDS[e.kind])}. It fits here (${esc(sceneName())})${e.best?.includes(ch) ? ", and this is one of its best chapters" : ""}.</p>`,
    people.length ? `<p><b>Who:</b> ${esc(people.join(", "))}.</p>` : "",
    `<p class="vta-note">${esc(windowOf(e))}. The encounter's own words are in the Storyteller's second volume.</p>`,
    `<p><button type="button" data-wct-enc="play" data-n="${e.n}">Play</button> <button type="button" data-wct-enc="later" data-n="${e.n}">Not tonight</button> <button type="button" data-wct-enc="never" data-n="${e.n}">Never</button></p>`
  ].join(""), {encounter: {n: e.n, offer: true}});
}

/** The tick: months seen, windows closed (what happens off the map), and new offers where the company stands. */
export async function encounterTick({offers = true} = {}) {
  if ( !isActiveGM() ) return [];
  const s = pod();
  if ( !running(s) ) return [];
  const ctx = ctxOf(s);
  let st = E.see(E.normState(sagaOf(s).encounters ?? {}, ctx.now), ctx.month);
  const closing = E.closing(st, ctx);
  st = E.close(st, closing, ctx.now);
  const due = offers ? E.due(st, ctx).slice(0, 2) : [];
  st = E.offer(st, due, ctx.now);
  const fresh = !sagaOf(s).encounters;
  if ( !fresh && !closing.length && !due.length && JSON.stringify(st.seen) === JSON.stringify(E.normState(sagaOf(s).encounters).seen) ) return [];
  sagaOf(s).encounters = st;
  await savePod(s);
  for ( const n of closing ) await closeOut(n);
  for ( const n of due ) await offerCard(n);
  return due;
}

/* ---- play ---- */

function rectOf(scene) {
  const r = scene?.dimensions?.sceneRect;
  return r ? {x: r.x, y: r.y, width: r.width, height: r.height} : {x: 0, y: 0, width: scene?.width ?? 3000, height: scene?.height ?? 2000};
}
async function folder() {
  return game.folders.find(f => f.type === "Actor" && f.name === FOLDER) ?? Folder.create({name: FOLDER, type: "Actor", color: "#6b2020"});
}
/** A home for an encounter's person: a place tagged home on a map whose name holds the hint (WoDX NPC places). */
function homeFor(hint) {
  const places = mod("wodx-npc")?.routines?.listPlaces?.() ?? [];
  const h = String(hint ?? "").toLowerCase();
  return places.find(p => p.kind === "home" && p.name.toLowerCase().includes(h))?.id ?? places.find(p => p.kind === "home" && p.scene?.name?.toLowerCase().includes(h))?.id ?? "";
}
/**
 * Find or make an encounter's person, give them a home and a ready routine, and stand them on the company's map.
 * Returns {actor, token, made}.
 */
export async function bring(p, n, scene, k) {
  let actor = game.actors.find(a => a.name === p.name && a.flags?.[MODULE_ID]?.encounterPerson) ?? game.actors.getName(p.name);
  let made = false;
  if ( !actor ) {
    const f = await folder();
    actor = await Actor.create({name: p.name, type: p.type === "vampire" ? "Vampire" : "Mortal", folder: f?.id ?? null,
      flags: {[MODULE_ID]: {encounterPerson: {n, home: p.home}}}});
    made = true;
  }
  const home = homeFor(p.home);
  if ( game.modules.get("wodx-npc")?.active && !actor.hasPlayerOwner ) {
    const r = actor.flags?.["wodx-npc"]?.routine ?? {};
    await actor.update({[`flags.wodx-npc.routine`]: {...r, on: true, preset: r.preset ?? p.preset, roles: {...(r.roles ?? {}), ...(home && !r.roles?.home ? {home} : {})}}});
  }
  let token = scene?.tokens.find(t => t.actorId === actor.id) ?? null;
  if ( scene && !token ) {
    const R = rectOf(scene), g = scene.grid?.size ?? 100;
    const x = Math.round((R.x + R.width / 2 + (k - 1) * g) / g) * g, y = Math.round((R.y + R.height / 2) / g) * g;
    const td = await actor.getTokenDocument({x, y, flags: {[MODULE_ID]: {encounter: n}}});
    [token] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  }
  return {actor, token, made, home};
}

/** Play encounter n: its people on the map, its ties moved, its clue carriers offered. */
export async function playEncounter(n, {force = true} = {}) {
  if ( !game.user.isGM ) return null;
  n = Number(n);
  const s = pod(), ctx = ctxOf(s, {force});
  let st = E.play(E.normState(sagaOf(s).encounters ?? {}, ctx.now), n, ctx);
  sagaOf(s).encounters = st;
  await savePod(s);
  const e = E.encounterOf(n), scene = Fronts.sceneFor("@company");
  const brought = [];
  for ( const [k, p] of e.people.entries() ) {
    try { brought.push(await bring(p, n, scene, k)); } catch (err) { console.warn(`${MODULE_ID} | encounter person ${p.name}`, err); }
  }
  await change(x => E.keepPeople(x, n, brought.map(b => b.actor.id)));
  const moved = await applyTies(e.ties ?? {}, n);
  const clues = (e.ties?.clues ?? []).map(([k, i]) => {
    const c = F.clueOf(k), x = c.carriers[i];
    return `<button type="button" data-wct-enc="clue" data-n="${n}" data-clue="${k}" data-i="${i}" title="${esc(c.label)}">Found: ${esc(x.label)}</button>`;
  }).join(" ");
  await card(`Encounter ${n} played: ${e.label}`, [
    brought.length ? `<p><b>On the map${scene ? ` (${esc(scene.name)})` : ""}:</b> ${brought.map(b => `${esc(b.actor.name)}${b.made ? " (new)" : ""}`).join(", ")}. Each keeps a home and a daily round from now on.</p>` : "",
    moved.length ? `<p>${moved.map(esc).join(" ")}</p>` : "",
    clues ? `<p>If the company finds what it carries: ${clues}</p>` : "",
    `<p class="vta-note">It plays once. Its twist (${n}) can come from now on.</p>`].join(""), {encounter: {n, played: true}});
  Hooks.callAll("wodxEncounter", {n, action: "play", scene: scene?.name ?? "", people: brought.map(b => b.actor.id), moved});
  return {n, people: brought.map(b => b.actor), scene, moved};
}

/** Ties and off-map outcomes share the front moves: a front step that is next lands; pushes; leans; gone; a judgement. */
async function applyTies(t, n) {
  const out = [];
  for ( const [k, step] of t.front ?? [] ) {
    if ( E.stepIsNext(Fronts.frontState(), k, step) ) { await Fronts.stepFront(k); out.push(`${F.frontOf(k).label} took its step: ${F.frontOf(k).steps.find(x => x.key === step).label}.`); }
  }
  for ( const k of t.push ?? [] ) { await Fronts.pushFront(k); out.push(`${F.frontOf(k).label} is pushed: it steps at the next turn, even in a twist's week.`); }
  for ( const name of t.lean ?? [] ) { await Fronts.lean(name); out.push(`The company leaned on ${name}.`); }
  for ( const name of t.gone ?? [] ) { await Fronts.setGone(name); out.push(`${name} is gone.`); }
  if ( t.judge ) {
    const [k, choice] = t.judge;
    if ( !Fronts.frontState().judged?.[k] ) { await Fronts.judge(k, choice); out.push(`${F.judgementOf(k).label}: ${F.judgementOf(k).choices[choice].label.toLowerCase()}.`); }
  }
  if ( t.moves ) {
    const s2 = pod(), x = sagaOf(s2);
    x.clocks = S.moveClocks(x.clocks, t.moves);
    await savePod(s2);
    out.push(`The long clocks: ${S.SAGA_CLOCKS.filter(c => t.moves[c.key]).map(c => `${c.label} ${x.clocks[c.key]} of ${c.size}`).join("; ")}.`);
  }
  return out;
}

/** Its window closed unmet: what would have happened, happens off the map. */
async function closeOut(n) {
  const e = E.encounterOf(n), o = e.offmap ?? {};
  const shown = o.sight ? await Fronts.showSight(`encounter:${n}`, o.sight, `encounter:${n}`) : "";
  await talk(o.talk, n);
  const moved = await applyTies(o, n);
  await card(`Encounter ${n} passed unmet: ${e.label}`, [
    `<p>In the streets: "${esc(o.talk)}"</p>`,
    o.sight ? (shown ? `<p>On the map: ${esc(shown)}.</p>` : `<p class="vta-note">No map for ${esc(o.sight.scene)} in this world; tell it at the table.</p>`) : "",
    moved.length ? `<p>${moved.map(esc).join(" ")}</p>` : ""].join(""), {encounter: {n, closed: true}});
  Hooks.callAll("wodxEncounter", {n, action: "closed", scene: shown, talk: o.talk, moved});
}

export async function laterEncounter(n) {
  if ( !game.user.isGM ) return;
  await change(st => E.later(st, Number(n), now()));
  Hooks.callAll("wodxEncounter", {n: Number(n), action: "later"});
}
export async function neverEncounter(n) {
  if ( !game.user.isGM ) return;
  await change(st => E.never(st, Number(n), now()));
  Hooks.callAll("wodxEncounter", {n: Number(n), action: "never"});
}
/** Take it back: it can be offered again. The people it brought stay where they are. */
export async function unplayEncounter(n) { if ( game.user.isGM ) await change(st => E.unplay(st, Number(n))); }
/** Close a window by hand (the Storyteller says it is past): the off-map outcome happens now. */
export async function closeEncounter(n) {
  if ( !game.user.isGM ) return;
  const st = encounterState();
  if ( st.played[n] !== undefined || st.closed[n] !== undefined ) return;
  await change(x => E.close(x, [Number(n)], now()));
  await closeOut(Number(n));
}

/* ---- the card's buttons ---- */

export function onRenderCard(message, el) {
  const info = message.flags?.[MODULE_ID]?.encounter;
  if ( !info ) return;
  const root = el?.[0] ?? el;
  for ( const b of root?.querySelectorAll?.("[data-wct-enc]") ?? [] ) {
    if ( !game.user.isGM ) { b.remove(); continue; }
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      const act = b.dataset.wctEnc, n = Number(b.dataset.n);
      try {
        if ( act === "play" ) await playEncounter(n);
        else if ( act === "later" ) await laterEncounter(n);
        else if ( act === "never" ) await neverEncounter(n);
        else if ( act === "clue" ) await Fronts.findCarrier(b.dataset.clue, b.dataset.i);
        if ( act !== "clue" ) await message.update({content: message.content.replace(/<p><button[^]*?<\/p>/, `<p class="vta-note">${act === "play" ? "Played." : act === "later" ? "Not tonight; it comes back." : "Struck."}</p>`)});
        else b.disabled = true;
      } catch (err) { ui.notifications.warn(err.message); }
    });
  }
}

/* ---- the saga window ---- */

export function section(s) {
  const st = E.normState(sagaOf(s).encounters ?? {}, now()), ctx = ctxOf(s);
  const rows = E.ENCOUNTERS.map(e => {
    const why = E.whyNot(st, e.n, ctx), done = st.played[e.n] !== undefined, struck = st.never[e.n] !== undefined, shut = st.closed[e.n] !== undefined;
    const status = done ? "played" : shut ? "passed unmet" : struck ? "struck" : why ? why : "fits here now";
    const acts = done || shut || struck ? `<button type="button" data-action="encUnplay" data-n="${e.n}" title="Take it back">Take back</button>`
      : `<button type="button" data-action="encPlay" data-n="${e.n}" ${/chapter|follows|days/.test(why) ? "disabled" : ""} title="Play it where the company stands">Play</button> <button type="button" data-action="encLater" data-n="${e.n}">Not tonight</button> <button type="button" data-action="encNever" data-n="${e.n}">Never</button> <button type="button" data-action="encClose" data-n="${e.n}" title="Its window is past: what happens off the map happens now">Passed</button>`;
    return `<tr data-encounter="${e.n}" data-state="${done ? "played" : shut ? "closed" : struck ? "never" : why ? "waits" : "due"}"><td>${e.n}</td><td><b>${esc(e.label)}</b><br><span class="vta-note">${esc(where(e))}; ${esc(windowOf(e))}</span></td><td>${esc(status)}</td><td>${acts}</td></tr>`;
  }).join("");
  const n = Object.keys(st.played).length, c = Object.keys(st.closed).length;
  return `<h3>Book one's encounters</h3><p>${n} played, ${c} passed unmet. An encounter is offered on a card when the company stands on one of its maps in its season; unmet when its window closes, it happens off the map.</p>
    <table class="wodx-check" data-encounters><tbody>${rows}</tbody></table>`;
}
export const ACTIONS = {
  encPlay: async function(e, el) { try { await playEncounter(el.dataset.n); } catch (err) { ui.notifications.warn(err.message); } this.render(); },
  encLater: async function(e, el) { await laterEncounter(el.dataset.n); this.render(); },
  encNever: async function(e, el) { await neverEncounter(el.dataset.n); this.render(); },
  encClose: async function(e, el) { await closeEncounter(el.dataset.n); this.render(); },
  encUnplay: async function(e, el) { await unplayEncounter(el.dataset.n); this.render(); }
};

export const api = () => ({state: encounterState, tick: encounterTick, play: playEncounter, later: laterEncounter, never: neverEncounter,
  close: closeEncounter, takeBack: unplayEncounter, met: () => metOf(pod()), rules: E});
