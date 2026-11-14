/**
 * Book one's fronts, roles and clue carriers (Rothenstein Rebuilt, spine part two, B4910-B4919). Rules in
 * front-rules.mjs, data in data/fronts-rothenstein.mjs.
 *
 * While book one of the saga runs, each front takes its next step at its own pace (the court and the cult weekly, the
 * council and the Church every two weeks, Marta every three, the Husbandman every two), never before the step's
 * chapter and never in a twist's week unless the company pushed it. A step shows first on the map: its marks go on the
 * step's scene through WoDX Storyteller's town looks (torches, riders, smoke, the flood, the grey field), the street
 * talk goes on the signal board, the saga clocks it names move, and the Storyteller gets a card with the step's people
 * (the roles filled in by who holds them now) and place. Hook wodxFront.
 *
 * Clue carriers found pin cards on the open case board (WoDX Interactables); the third carrier of a fact pins the whole
 * of it. Judgements (Reinhold, Baba Yaroslava) send their card when their chapter comes.
 *
 * State in podState.saga.fronts (see front-rules.mjs). Storyteller only; the saga window holds the controls.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import * as F from "./front-rules.mjs";
import * as S from "./saga-rules.mjs";

const BOOK = S.FIRST_BOOK;
const now = () => game.time?.worldTime ?? 0;
const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const pod = () => foundry.utils.deepClone(game.settings.get(MODULE_ID, "podState") ?? {}) ?? {};
const savePod = s => game.settings.set(MODULE_ID, "podState", s);
const sagaOf = s => { const x = s.saga ??= {}; x.endings ??= {}; x.clocks ??= {}; x.books ??= {}; return x; };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

/** The chapters of book one played so far: all of them once the book is done. */
function played(s) {
  const x = sagaOf(s), run = (s.chains ?? []).find(r => r.saga?.book === BOOK);
  if ( x.books[BOOK] === "done" ) return [...F.CHAPTERS];
  return [...(run?.played ?? [])];
}
const running = s => sagaOf(s).books[BOOK] === "running";
const twistsOf = s => sagaOf(s).twists ?? {revealed: {}};
const ctxOf = s => ({now: now(), played: played(s), twists: twistsOf(s)});

export const frontState = () => F.normState(sagaOf(pod()).fronts ?? {}, now());
async function change(fn) {
  const s = pod(), x = sagaOf(s);
  const st = F.normState(x.fronts ?? {}, now());
  const r = await fn(st, s);
  x.fronts = r?.state ?? r;
  await savePod(s);
  return r;
}

async function card(title, body) {
  return ChatMessage.create({content: `<div class="wodx-card wct-pod wct-front"><h3>${esc(title)}</h3>${body}</div>`,
    speaker: {alias: "Chronicle"}, whisper: gmIds()});
}

/* ---- the map ---- */

/** The scene the company stands in: the one with most player characters' tokens, else the viewed one. */
function companyScene() {
  let best = null, most = 0;
  for ( const sc of game.scenes ?? [] ) {
    const n = sc.tokens.filter(t => t.actor?.hasPlayerOwner && t.actor?.type !== "Npc").length;
    if ( n > most ) { most = n; best = sc; }
  }
  return best ?? game.scenes?.active ?? canvas?.scene ?? null;
}
export function sceneFor(hint) {
  if ( hint === "@company" ) return companyScene();
  const names = (game.scenes?.contents ?? []).map(s => s.name);
  const n = F.pickScene(names, hint);
  return n ? game.scenes.getName(n) : null;
}
function rectOf(scene) {
  const r = scene?.dimensions?.sceneRect;
  return r ? {x: r.x, y: r.y, width: r.width, height: r.height} : {x: 0, y: 0, width: scene?.width ?? 3000, height: scene?.height ?? 2000};
}
/**
 * Draw a front's sight: the marks of the step it stands on, on that step's scene, through the town-looks layer
 * (one key per front, so the last step's marks give way). Returns the scene's name, or "" when nothing could be drawn.
 */
export async function showSight(key, sight, seed = key) {
  const TL = api("wodx-storyteller")?.townLooks;
  const sc = sight ? sceneFor(sight.scene) : null;
  const k = `front:${key}`;
  // Take this front's marks off every other scene first
  if ( TL?.setLooks ) for ( const other of game.scenes ?? [] ) if ( other !== sc && other.flags?.["wodx-storyteller"]?.lookSigs?.[k] ) await TL.setLooks(other, k, []);
  if ( !sc || !TL?.setLooks ) return "";
  const looks = F.sightLooks(sight, rectOf(sc), seed);
  const shake = looks.some(l => l.kind === "quake");
  await TL.setLooks(sc, k, looks.filter(l => l.kind !== "quake" || l.at));
  if ( shake && game.scenes.viewed === sc ) api("wodx-chronicle")?.looks?.shake?.({ms: 1600, px: 14});
  return sc.name;
}
async function talk(words, key) {
  if ( !words ) return;
  try { await api("wodx-storyteller")?.signals?.post?.({key: `front:${key}`, kind: "saga", region: "moravia", weight: 2, what: words, from: "saga"}); }
  catch (e) { console.warn(`${MODULE_ID} | front talk`, e); }
}

/* ---- steps ---- */

/** Show a step on the table: the map, the street talk, the clocks, the Storyteller's card, the hook. */
async function land(f, n, st, s, {why = ""} = {}) {
  const tw = twistsOf(s);
  const fill = t => F.fill(t, st, tw);
  const at = st.fronts[f.key].at;
  const where = await showSight(f.key, n.sight, `${f.key}:${n.key}`);
  await talk(fill(n.talk), `${f.key}:${n.key}`);
  let moved = "";
  if ( n.moves ) {
    const s2 = pod(), x = sagaOf(s2);
    x.clocks = S.moveClocks(x.clocks, n.moves);
    await savePod(s2);
    moved = S.SAGA_CLOCKS.filter(c => n.moves[c.key]).map(c => `${esc(c.label)}: ${x.clocks[c.key]} of ${c.size}`).join("; ");
  }
  const people = (n.people ?? []).map(fill).filter(Boolean);
  await card(`${f.label}, step ${at} of ${f.steps.length}: ${n.label}`, [
    `<p>${esc(f.aim)}${why ? ` ${esc(why)}` : ""}</p>`,
    people.length ? `<p><b>Who:</b> ${esc(people.join(", "))}. <b>Where:</b> ${esc(fill(n.place))}.</p>` : `<p><b>Where:</b> ${esc(fill(n.place))}.</p>`,
    where ? `<p>On the map: ${esc(where)}.</p>` : `<p class="vta-note">No map for ${esc(n.sight?.scene ?? "it")} in this world; tell it at the table.</p>`,
    `<p>In the streets: "${esc(fill(n.talk))}"</p>`,
    moved ? `<p>The long clocks: ${moved}.</p>` : "",
    `<p class="vta-note">The company can hold this front (a bribe, a threat, an ally inside) or strike it back a step from the saga window.</p>`].join(""));
  Hooks.callAll("wodxFront", {front: f.key, step: n.key, at, title: n.label, scene: where, people, moves: n.moves ?? null});
}

/** Take a front's next step now (the Storyteller's hand, or the company pushed it hard). */
export async function stepFront(key, {force = true} = {}) {
  if ( !game.user.isGM ) return null;
  let r = null, s0 = null;
  await change((st, s) => { s0 = s; r = F.step(st, key, {...ctxOf(s), force}); return r.state; });
  if ( r ) await land(F.frontOf(key), r.step, r.state, s0);
  return r?.step ?? null;
}
export async function holdFront(key, on = true) { if ( game.user.isGM ) await change(st => F.hold(st, key, on, now())); }
export async function pushFront(key) { if ( game.user.isGM ) await change(st => F.push(st, key)); }
/** Strike a front back a step: its marks go back to the step before, or off the map. */
export async function strikeFront(key) {
  if ( !game.user.isGM ) return null;
  const r = await change(st => F.strike(st, key, now()));
  const st = r, n = F.stepNow(st, key);
  await showSight(key, n?.sight ?? null, n ? `${key}:${n.key}` : key);
  Hooks.callAll("wodxFront", {front: key, step: n?.key ?? null, at: st.fronts[key].at, struck: true});
  return n?.key ?? null;
}

/** The weekly turn: every front that is due steps, the courier rides again, judgements whose chapter came send cards. */
export async function frontTick() {
  if ( !isActiveGM() ) return;
  const s = pod();
  if ( !running(s) ) return;
  const ctx = ctxOf(s);
  let st = F.normState(sagaOf(s).fronts ?? {}, now());
  const fresh = !sagaOf(s).fronts;
  const due = F.dueFronts(st, ctx);
  const slipped = F.slip(st, ctx);
  const landed = [];
  for ( const k of due ) { const r = F.step(slipped, k, ctx); Object.assign(slipped.fronts, r.state.fronts); landed.push([k, r.step]); }
  st = slipped;
  const rides = F.courierRides(st, ctx.now);
  if ( rides ) st = rides;
  const judged = F.judgementsDue(st, ctx.played);
  for ( const j of judged ) st = F.told(st, j.key, j.choice);
  const changed = fresh || landed.length || rides || judged.length || JSON.stringify(st.fronts) !== JSON.stringify(F.normState(sagaOf(s).fronts ?? {}, now()).fronts);
  if ( !changed ) return;
  sagaOf(s).fronts = st;
  await savePod(s);
  for ( const [k, n] of landed ) await land(F.frontOf(k), n, st, s);
  if ( rides ) {
    await card("The courier east rides again", `<p>${esc(F.holderOf(st, "courier"))} leaves for the sire a week after the last was stopped. The silence from the east grows.</p>`);
    await showSight("courier", {scene: "The Mountain Trail", looks: [{kind: "calm", spots: 1, r: 0.04, text: "♞", color: "#c9b27a"}]}, `courier:${st.courier.rider}`);
  }
  for ( const j of judged ) {
    await card(`${j.label}: ${j.label === "Reinhold the knight" ? "the knight's answer" : "the choosing"}`, `<p>${esc(F.fill(j.text, st, twistsOf(s)))}</p>`);
    if ( j.sight ) await showSight(`judge:${j.key}`, j.sight, j.key);
    if ( j.talk ) await talk(j.talk, `judge:${j.key}`);
    Hooks.callAll("wodxFront", {judgement: j.key, choice: j.choice});
  }
}

/* ---- roles, judgements, clues ---- */

export async function setGone(name, on = true) { if ( game.user.isGM ) await change(st => F.setGone(st, name, on)); }
export async function lean(name, by = 1) { if ( game.user.isGM ) await change(st => F.lean(st, name, by)); }
export async function chooseHolder(role, name = "") { if ( game.user.isGM ) await change(st => F.choose(st, role, name)); }
export async function stopCourier() { if ( game.user.isGM ) await change(st => F.stopCourier(st, now())); }
export async function judge(key, choice = "") { if ( game.user.isGM ) await change(st => F.judge(st, key, choice)); }
export const holders = () => { const s = pod(); return F.holders(F.normState(sagaOf(s).fronts ?? {}, now()), twistsOf(s)); };

/** A clue carrier found: its card on the open case board, and the whole fact with the third. */
export async function findCarrier(key, i) {
  if ( !game.user.isGM ) return null;
  const r = await change(st => F.find(st, key, Number(i)));
  if ( !r?.fresh ) return r;
  const CB = api("wodx-interactables")?.caseBoard;
  const j = CB?.openBoard?.() ?? null;
  let pinned = false;
  if ( j && CB.change ) {
    await CB.change(j, b => { let x = CB.rules.addCard(b, F.carrierCard(key, Number(i))).board; if ( r.whole ) x = CB.rules.addCard(x, F.wholeCard(key)).board; return x; });
    pinned = true;
    try { if ( typeof CB.open === "function" && foundry.applications.instances?.get?.("wodx-case-board")?.rendered ) CB.open(); } catch (e) { /* the board refreshes when opened */ }
  }
  await card(`A clue found: ${r.carrier.label}`, `<p>${esc(r.clue.label)}: ${r.state.clues[key].length} of ${r.clue.carriers.length} carriers found.${r.whole ? ` The company has the whole of it: ${esc(r.clue.whole)}` : ""}</p>${pinned ? "<p>Pinned on the case board.</p>" : `<p class="vta-note">No open case board; start one to pin the clues.</p>`}`);
  Hooks.callAll("wodxFront", {clue: key, carrier: Number(i), whole: r.whole});
  return r;
}
export async function unfindCarrier(key, i) { if ( game.user.isGM ) await change(st => F.unfind(st, key, Number(i))); }

/* ---- the saga window ---- */

export function section(s) {
  const st = F.normState(sagaOf(s).fronts ?? {}, now()), tw = twistsOf(s), ctx = ctxOf(s);
  const fronts = F.FRONTS.map(f => {
    const o = st.fronts[f.key], n = F.nextStep(st, f.key), cur = F.stepNow(st, f.key), why = F.whyNot(st, f.key, ctx);
    return `<tr data-front="${f.key}"><td><b>${esc(f.label)}</b><br><span class="vta-note">${esc(f.who)}, every ${f.every / 7 === 1 ? "week" : `${f.every / 7} weeks`}</span></td>
      <td>${o.at} of ${f.steps.length}${cur ? `: ${esc(cur.label)}` : ""}${n ? `<br><span class="vta-note">Next: ${esc(n.label)}. ${esc(why || "Due now.")}</span>` : ""}</td>
      <td>${n ? `<button type="button" data-action="frontStep" data-front="${f.key}" title="Take the next step now">Step</button> ` : ""}<button type="button" data-action="frontHold" data-front="${f.key}" data-on="${o.held ? "" : "1"}">${o.held ? "Let go" : "Hold"}</button>
        ${o.at ? ` <button type="button" data-action="frontStrike" data-front="${f.key}" title="The company struck it: back one step">Strike</button>` : ""}${n && !o.pushed ? ` <button type="button" data-action="frontPush" data-front="${f.key}" title="The company pushed it: it steps at the next tick even in a twist's week">Pushed</button>` : ""}</td></tr>`;
  }).join("");
  const roles = F.ROLES.map(r => {
    const h = F.holderOf(st, r.key, tw);
    const opts = r.line.map(n => `<option value="${esc(n)}" ${st.chosen[r.key] === n ? "selected" : ""}>${esc(n)}${F.isGone(st, n, tw) ? " (gone)" : ""}</option>`).join("");
    const gone = r.courier ? `<button type="button" data-action="courierStopped">Stopped</button>` : r.line.filter((n, i) => !r.lasts || i < r.line.length - 1).map(n => `<label><input type="checkbox" data-gone="${esc(n)}" ${st.gone[n] ? "checked" : ""}> ${esc(n)} gone</label>`).join(" ");
    const trust = r.pick === "trust" ? r.line.map(n => `<button type="button" data-action="frontLean" data-name="${esc(n)}" title="The company leaned on ${esc(n)}">${esc(n.split(" ")[0])} +1 (${st.trust[n] ?? 0})</button>`).join(" ") : "";
    return `<tr data-role="${r.key}"><td><b>${esc(r.label)}</b><br><span class="vta-note">${esc(r.text)}</span></td><td>${esc(h ?? "nobody")}</td>
      <td><select data-fixed data-choose="${r.key}"><option value="">By the line</option>${opts}</select> ${gone} ${trust}</td></tr>`;
  }).join("");
  const judgements = F.JUDGEMENTS.map(j => `<tr><td><b>${esc(j.label)}</b><br><span class="vta-note">${esc(j.ask)}</span></td>
    <td colspan="2"><select data-fixed data-judge="${j.key}"><option value="">Not yet</option>${Object.entries(j.choices).map(([k, c]) => `<option value="${k}" ${st.judged[j.key] === k ? "selected" : ""}>${esc(c.label)} (chapter ${F.CHAPTERS.indexOf(c.chapter) + 1})</option>`).join("")}</select></td></tr>`).join("");
  const clues = F.CLUES.map(c => `<tr data-clue="${c.key}"><td><b>${esc(c.label)}</b>${st.clues[c.key].length === c.carriers.length ? " (whole)" : ""}</td><td colspan="2">${c.carriers.map((x, i) => {
    const got = st.clues[c.key].includes(i);
    return `<button type="button" data-action="${got ? "clueLost" : "clueFound"}" data-clue="${c.key}" data-i="${i}" ${got ? `class="active" title="Found; click to take back"` : `title="Found by the company: pin it"`}>${got ? "✓ " : ""}${esc(x.kind)}: ${esc(x.label)}</button>`;
  }).join(" ")}</td></tr>`).join("");
  return `<h3>Book one's fronts</h3><p>Each front steps on its own pace when the company does nothing, shows on the map first, and never comes in a twist's week unless pushed.</p>
    <table class="wodx-check" data-fronts><tbody>${fronts}</tbody></table>
    <h4>Roles</h4><table class="wodx-check" data-roles><tbody>${roles}</tbody></table>
    <h4>Judgements</h4><table class="wodx-check"><tbody>${judgements}</tbody></table>
    <h4>Clues</h4><table class="wodx-check" data-clues><tbody>${clues}</tbody></table>
    <p class="vta-note">A carrier found pins a card on the open case board; the third tells the company it has the whole of it.</p>`;
}

/** The window's actions (PodApp adds them). */
export const ACTIONS = {
  frontStep: async function(e, el) { try { await stepFront(el.dataset.front); } catch (err) { ui.notifications.warn(err.message); } this.render(); },
  frontHold: async function(e, el) { await holdFront(el.dataset.front, !!el.dataset.on); this.render(); },
  frontStrike: async function(e, el) { await strikeFront(el.dataset.front); this.render(); },
  frontPush: async function(e, el) { await pushFront(el.dataset.front); this.render(); },
  frontLean: async function(e, el) { await lean(el.dataset.name); this.render(); },
  courierStopped: async function() { await stopCourier(); this.render(); },
  clueFound: async function(e, el) { await findCarrier(el.dataset.clue, el.dataset.i); this.render(); },
  clueLost: async function(e, el) { await unfindCarrier(el.dataset.clue, el.dataset.i); this.render(); }
};
/** The window's change listeners (gone, chosen holder, judgement). */
export function bind(app) {
  const el = app.element;
  for ( const i of el.querySelectorAll("input[data-gone]") ) i.addEventListener("change", () => setGone(i.dataset.gone, i.checked).then(() => app.render()));
  for ( const sel of el.querySelectorAll("select[data-choose]") ) sel.addEventListener("change", () => chooseHolder(sel.dataset.choose, sel.value).then(() => app.render()));
  for ( const sel of el.querySelectorAll("select[data-judge]") ) sel.addEventListener("change", () => judge(sel.dataset.judge, sel.value).then(() => app.render()));
}

export const api = () => ({state: frontState, tick: frontTick, step: stepFront, hold: holdFront, push: pushFront, strike: strikeFront,
  gone: setGone, lean, choose: chooseHolder, stopCourier, judge, holders, find: findCarrier, unfind: unfindCarrier, sight: showSight, rules: F});
