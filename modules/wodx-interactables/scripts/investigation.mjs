/**
 * Investigation, the Foundry side (B3364-B3368). The rules are in investigation-rules.mjs; the board is case.mjs.
 *
 *   Theories   on the case board: anyone writes one (who, what, where, why) and picks the lines it rests on; a
 *              character tests it with Perception or Intelligence + Investigation at 7 and the board says how much
 *              holds up, never which part. The Storyteller marks which lines are true in a window of their own.
 *   Evidence   world setting wodx-interactables.evidence {list}. Feeding (wodxFed), a lethal or worse wound
 *              (wodxDamageApplied), a rival's probe of a haven (wodxHavenProbe) and a grudge acted on (wodxGrudgeMove)
 *              leave evidence at the scene, whoever did it, players' characters too. It fades with time and rain
 *              (wodxWeather). Searching the scene finds what is left; a find goes on the open board.
 */
import * as I from "./investigation-rules.mjs";
import * as C from "./case-rules.mjs";
import {countSuccesses, clampDifficulty} from "../../wodx-actions/scripts/core-rules.js";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0; } catch { return 0; } };
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const DialogV2 = () => foundry.applications.api.DialogV2;
let deps = {characterFor: null, change: null, openBoard: null, boardOf: null};

export function registerInvestigationSettings() {
  game.settings.register(MOD, "evidence", {scope: "world", config: false, type: Object, default: {list: []}});
  game.settings.register(MOD, "evidenceOn", {name: "Deeds leave evidence", hint: "Feeding, wounds, break-ins and fires leave blood, tracks, witnesses and the like at the scene; they fade with time and rain, and a search finds what is left.",
    scope: "world", config: true, type: Boolean, default: true});
}
const on = () => { try { return game.settings.get(MOD, "evidenceOn") !== false; } catch { return false; } };
export const evidence = () => (game.settings.get(MOD, "evidence")?.list ?? []).map(I.normEvidence);
async function saveList(list) { if ( game.user.isGM ) await game.settings.set(MOD, "evidence", {list: I.prune(list, now())}); }

const indoorsOf = scene => !!scene?.flags?.["wodx-storyteller"]?.haven || !!scene?.environment?.darknessLock;

/** Leave evidence at a scene (Storyteller's client). kinds: evidence keys; by: the actor who left it. */
export async function leaveEvidence({kinds = [], scene = null, by = null, text = ""} = {}) {
  if ( !isActiveGM() || !on() || !scene ) return [];
  let list = evidence();
  const year = yearNow();
  for ( const k of kinds.filter(x => I.kindsFor(year).includes(x)) )
    list = I.leave(list, {kind: k, scene: scene.id, at: now(), by: by?.id ?? "", byName: by?.name ?? "", text, indoors: indoorsOf(scene)});
  await saveList(list);
  return list;
}
const sceneOfActor = a => {
  const t = a?.token ?? a?.getActiveTokens?.()[0]?.document ?? null;
  return t?.parent ?? canvas?.scene ?? null;
};

/* ---- Listening (B3368) ---- */

export function registerInvestigationHooks() {
  const safe = fn => (...args) => { Promise.resolve().then(() => fn(...args)).catch(er => console.error(`${MOD} | evidence`, er)); };
  Hooks.on("wodxFed", safe(async ({by, vessel} = {}) => {
    const a = by?.uuid ? await fromUuid(by.uuid) : null, actor = a?.actor ?? a;
    await leaveEvidence({kinds: I.leftBy("fed", yearNow()), scene: sceneOfActor(actor), by: actor, text: `${vessel?.name ? "Someone was bled" : "Blood was taken"} here.`});
  }));
  Hooks.on("wodxDamageApplied", safe(async (actor, d = {}) => {
    if ( !/lethal|aggravated/i.test(String(d.type ?? "")) ) return;
    const att = d.attacker ? (game.actors.get(d.attacker) ?? await fromUuid(String(d.attacker)).catch(() => null)) : null;
    await leaveEvidence({kinds: I.leftBy("wound", yearNow()), scene: sceneOfActor(actor), by: att?.actor ?? att ?? null, text: "Someone was hurt here."});
  }));
  Hooks.on("wodxHavenProbe", safe(async ({scene, rival, probe} = {}) => {
    await leaveEvidence({kinds: I.leftBy(probe === "fire" ? "fire" : probe === "bribe" ? "bribe" : "scout", yearNow()), scene, by: rival, text: probe === "fire" ? "The fire was set." : "Someone has been watching the house."});
  }));
  Hooks.on("wodxGrudgeMove", safe(async ({npc, character, move} = {}) => {
    if ( !["violence", "kin"].includes(move) ) return;
    await leaveEvidence({kinds: I.leftBy("violence", yearNow()), scene: sceneOfActor(character), by: npc, text: "Someone came here meaning harm."});
  }));
  // Rain and snow wash what lies outdoors: each wet night counts eight hours
  Hooks.on("wodxWeather", safe(async day => {
    if ( !isActiveGM() || !["rain", "drizzle", "snow", "sleet", "hail"].includes(day?.precip) ) return;
    const t = now();
    const list = evidence().map(e => (e.indoors ? e : {...e, wet: e.wet + 8}));
    await saveList(list.filter(e => I.freshness(e, t) > 0));
  }));
}

/* ---- Rolls ---- */

function poolOf(actor, attrs) {
  const ch = deps.characterFor?.(actor, null, null) ?? {abilities: {}};
  const attr = attrs.reduce((best, k) => (num(ch[k]) > num(ch[best]) ? k : best), attrs[0]);
  return {attr, dice: num(ch[attr]) + num(ch.abilities?.investigation), wound: num(ch.woundPenalty)};
}
async function rollPool(dice, diff) {
  const r = await new Roll(`${Math.max(1, dice)}d10`).evaluate();
  return {roll: r, ...countSuccesses(r.dice[0]?.results?.map(x => x.result) ?? [], clampDifficulty(diff), {})};
}
const myActors = () => [...game.actors].filter(a => a.isOwner && (game.user.isGM ? a.hasPlayerOwner : true));
async function pickActor(title) {
  const list = myActors();
  if ( list.length === 1 ) return list[0];
  if ( !list.length ) { ui.notifications.warn("You have no character to do this."); return null; }
  const r = await DialogV2().prompt({window: {title}, classes: ["wodx-dialog", "wix-case-dialog"],
    content: `${list.length > 5 ? searchBox("select[name=actor]", "Search characters…", "Search characters") : ""}<div class="form-group"><label>Who</label><select name="actor">${list.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>`,
    ok: {label: "Go", callback: (e, b) => b.form.elements.actor.value}, rejectClose: false});
  return r ? game.actors.get(r) : null;
}

/* ---- Search (B3366, B3367) ---- */

/** A character searches the scene for what is left: one roll; each piece takes the successes at its own difficulty. */
export async function searchScene(actorLike = null, scene = canvas?.scene) {
  const actor = actorLike ?? await pickActor("Search for traces");
  if ( !actor || !scene ) return null;
  const t = now(), year = yearNow();
  const here = evidence().filter(e => e.scene === scene.id && I.freshness(e, t) > 0 && !e.found.includes(actor.id));
  const p = poolOf(actor, ["perception"]);
  const dice = Math.max(1, p.dice - p.wound);
  const r = await new Roll(`${dice + 2}d10`).evaluate();
  const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
  const found = [];
  for ( const e of here ) {
    const sc = I.scienceFor(e.kind, year);
    const res = countSuccesses(faces.slice(0, dice + sc.dice), I.searchDiff(I.freshness(e, t)), {});
    const out = I.searchResult(e, res.successes, year);
    if ( out.found ) found.push({e, names: out.names});
  }
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), rolls: [r],
    content: `<div class="vta-card wodx-x"><div class="vta-body"><p><b>${esc(actor.name)}</b> searches ${esc(scene.navName || scene.name)} for traces.</p>
      <p>${found.length ? found.map(f => `${esc(I.EVIDENCE[f.e.kind].label)}: ${esc(I.findWords(f.e, {names: f.names, year}))}`).join("<br>") : "Nothing that tells anything."}</p></div></div>`});
  if ( found.length && game.user.isGM ) await markFound(found.map(f => f.e.id), actor.id);
  else if ( found.length ) game.socket?.emit?.(`module.${MOD}`, {action: "evidenceFound", ids: found.map(f => f.e.id), actor: actor.id});
  const j = deps.openBoard?.();
  if ( j?.isOwner && found.length ) await deps.change(j, b => { let x = b; for ( const f of found ) x = C.addCard(x, {kind: "clue", ref: `evidence:${f.e.id}`, title: I.EVIDENCE[f.e.kind].label, text: I.findWords(f.e, {names: f.names, year}), by: actor.name}).board; return x; });
  return found;
}
export async function markFound(ids, actorId) {
  if ( !isActiveGM() ) return;
  await saveList(evidence().map(e => (ids.includes(e.id) && !e.found.includes(actorId) ? {...e, found: [...e.found, actorId]} : e)));
}

/** The Storyteller's list of evidence at a scene, with how fresh each is and a way to leave some by hand. */
export async function evidenceDialog(scene = canvas?.scene) {
  if ( !game.user.isGM || !scene ) return null;
  const t = now(), year = yearNow();
  const here = evidence().filter(e => e.scene === scene.id);
  const res = await DialogV2().wait({rejectClose: false, position: {width: 560}, window: {title: `Evidence: ${scene.navName || scene.name}`}, classes: ["wodx-dialog", "wix-evidence"],
    content: `${here.length > 5 ? searchBox("ul.wix-ev", "Search evidence…", "Search evidence") : ""}<ul class="wix-ev">${here.map(e => `<li><b>${esc(I.EVIDENCE[e.kind].label)}</b> (${Math.round(I.freshness(e, t) * 100)} in 100 left)${e.byName ? `, left by ${esc(e.byName)}` : ""}: ${esc(e.text)} <i>${esc(I.scienceFor(e.kind, year).says)}</i></li>`).join("") || "<li>Nothing left here.</li>"}</ul>
      <div class="form-group"><label>Leave</label><select name="kind" data-fixed><option value="">Nothing</option>${I.kindsFor(year).map(k => `<option value="${k}">${esc(I.EVIDENCE[k].label)}</option>`).join("")}</select></div>
      <div class="form-group"><label>What it is</label><input type="text" name="text" placeholder="A torn glove by the gate"></div>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (e, b) => Object.fromEntries(new FormData(b.form))}, {action: "close", label: "Close"}]});
  if ( res?.kind ) await leaveEvidence({kinds: [res.kind], scene, text: res.text ?? ""});
  return res;
}

/* ---- Theories (B3364, B3365) ---- */

const cardTitle = (b, id) => b.cards.find(c => c.id === id)?.title ?? "?";
const lineWords = (b, l) => `${cardTitle(b, l.a)} and ${cardTitle(b, l.b)}${l.label ? ` (${l.label})` : ""}`;

/** Write or change a theory on a board. */
export async function editTheory(j, id = null) {
  const b0 = deps.boardOf(j), b = C.visibleTo(b0, game.user.isGM);
  const t = I.normTheory(b.theories.find(x => x.id === id) ?? {});
  const res = await DialogV2().prompt({window: {title: id ? "Change the theory" : "A theory"}, classes: ["wodx-dialog", "wix-case-dialog"], position: {width: 520},
    content: `<div class="form-group"><label>Who</label><input type="text" name="who" maxlength="160" value="${esc(t.who)}"></div>
      <div class="form-group"><label>What</label><input type="text" name="what" maxlength="200" value="${esc(t.what)}"></div>
      <div class="form-group"><label>Where</label><input type="text" name="where" maxlength="160" value="${esc(t.where)}"></div>
      <div class="form-group"><label>Why</label><input type="text" name="why" maxlength="200" value="${esc(t.why)}"></div>
      <p>It rests on these lines:</p>${b.links.length > 5 ? searchBox("ul.wix-rests", "Search lines…", "Search lines") : ""}
      <ul class="wix-rests">${b.links.map(l => `<li><label><input type="checkbox" name="r.${l.id}"${t.rests.includes(l.id) ? " checked" : ""}> ${esc(lineWords(b, l))}</label></li>`).join("") || "<li>No lines on the board yet: join the cards first.</li>"}</ul>`,
    ok: {label: "Save", callback: (e, bt) => Object.fromEntries(new FormData(bt.form))}, rejectClose: false});
  if ( !res ) return null;
  const rests = b.links.filter(l => res[`r.${l.id}`]).map(l => l.id);
  return deps.change(j, x => {
    const ths = [...(x.theories ?? [])];
    const tid = id ?? C.nextId(ths.map(q => q.id), "t");
    const i = ths.findIndex(q => q.id === tid);
    const next = I.normTheory({...(i >= 0 ? ths[i] : {}), id: tid, who: res.who, what: res.what, where: res.where, why: res.why, rests, by: game.user.name, at: now(), test: null});
    if ( i >= 0 ) ths[i] = next; else ths.push(next);
    return {...x, theories: ths};
  });
}

/** A character tests a theory. The roll is the player's; the measure against the truth is the Storyteller's client. */
export async function testTheory(j, id) {
  const actor = await pickActor("Who tests the theory");
  if ( !actor ) return null;
  const p = poolOf(actor, ["perception", "intelligence"]);
  const r = await rollPool(p.dice - p.wound, I.TEST_DIFF);
  const s = r.botch ? 0 : r.successes;
  if ( game.user.isGM ) return judge(j.id, id, s, actor.id, r.roll);
  game.socket?.emit?.(`module.${MOD}`, {action: "judgeTheory", board: j.id, theory: id, successes: s, actor: actor.id});
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), rolls: [r.roll], content: `<p><b>${esc(actor.name)}</b> weighs a theory on the case board. The Storyteller's board will say what holds up.</p>`});
  return null;
}

/** The Storyteller's client measures a tested theory against the truth and says what the successes allow. */
export async function judge(boardId, theoryId, successes, actorId, roll = null) {
  if ( !isActiveGM() ) return null;
  const j = game.journal.get(boardId);
  const b = deps.boardOf(j);
  const t = b?.theories?.find(x => x.id === theoryId);
  if ( !t ) return null;
  const said = I.verdict(I.measure(t, b.links, b.truth), successes);
  await deps.change(j, x => ({...x, theories: x.theories.map(q => (q.id === theoryId ? {...q, test: {successes, said, at: now()}} : q))}));
  const actor = game.actors.get(actorId);
  await ChatMessage.create({speaker: actor ? ChatMessage.getSpeaker({actor}) : undefined, ...(roll ? {rolls: [roll]} : {}),
    content: `<div class="vta-card wodx-x"><div class="vta-body"><p>${esc(I.theoryText(t))}</p><p><b>${esc(said)}</b></p></div></div>`});
  return said;
}

/** The Storyteller marks which lines on the board are true. */
export async function truthDialog(j) {
  if ( !game.user.isGM ) return null;
  const b = deps.boardOf(j), T = new Set(b.truth);
  const res = await DialogV2().prompt({window: {title: "What is true"}, classes: ["wodx-dialog", "wix-case-dialog"], position: {width: 520},
    content: `<p>Tick each line on the board that is true. Players never see this; a test says how many of a theory's lines are true, not which.</p>
      ${b.links.length > 5 ? searchBox("ul.wix-truth", "Search lines…", "Search lines") : ""}
      <ul class="wix-truth">${b.links.map(l => `<li><label><input type="checkbox" name="t.${l.id}"${T.has(I.keyOf(l.a, l.b)) ? " checked" : ""}> ${esc(lineWords(b, l))}</label></li>`).join("") || "<li>No lines yet.</li>"}</ul>`,
    ok: {label: "Save", callback: (e, bt) => Object.fromEntries(new FormData(bt.form))}, rejectClose: false});
  if ( !res ) return null;
  return deps.change(j, x => ({...x, truth: x.links.filter(l => res[`t.${l.id}`]).map(l => I.keyOf(l.a, l.b))}));
}

/** Every theory on a board, with Test and Change. */
export async function theoriesDialog(j) {
  const b = C.visibleTo(deps.boardOf(j), game.user.isGM);
  const wire = (ev, dlg) => {
    for ( const el of dlg?.element?.querySelectorAll?.("[data-wix-th]") ?? [] ) el.addEventListener("click", async () => {
      dlg.close();
      const op = el.dataset.wixTh, id = el.dataset.id;
      if ( op === "test" ) await testTheory(j, id);
      else if ( op === "edit" ) await editTheory(j, id);
      else if ( op === "drop" ) await deps.change(j, x => ({...x, theories: x.theories.filter(q => q.id !== id)}));
      else if ( op === "truth" ) await truthDialog(j);
      else if ( op === "new" ) await editTheory(j);
    });
  };
  return DialogV2().wait({rejectClose: false, render: wire, position: {width: 620}, window: {title: "Theories"}, classes: ["wodx-dialog", "wix-theories"],
    content: `<p>Write what the coterie thinks happened and pick the lines it rests on. A test is Perception or Intelligence + Investigation at ${I.TEST_DIFF} (V20 pdf 272); it says how much holds up, never which part.</p>
      ${b.theories.length > 5 ? searchBox("ul.wix-th", "Search theories…", "Search theories") : ""}
      <ul class="wix-th">${b.theories.map(t => `<li><p>${esc(I.theoryText(t))} <small>${t.rests.length} line${t.rests.length === 1 ? "" : "s"}${t.by ? `, by ${esc(t.by)}` : ""}</small></p>${t.test ? `<p><i>Last test: ${esc(t.test.said)}</i></p>` : ""}
        <button type="button" data-wix-th="test" data-id="${t.id}">Test it</button> <button type="button" data-wix-th="edit" data-id="${t.id}">Change</button> <button type="button" data-wix-th="drop" data-id="${t.id}">Drop it</button></li>`).join("") || "<li>No theory yet.</li>"}</ul>
      <p><button type="button" data-wix-th="new">Write a theory</button>${game.user.isGM ? ` <button type="button" data-wix-th="truth">What is true</button>` : ""}</p>`,
    buttons: [{action: "close", label: "Close", default: true}]});
}

/** Socket messages from players: a tested theory to judge, evidence found. */
export function onSocket(msg = {}) {
  if ( msg.action === "judgeTheory" ) return judge(msg.board, msg.theory, num(msg.successes), msg.actor);
  if ( msg.action === "evidenceFound" ) return markFound(msg.ids ?? [], msg.actor);
  return null;
}

export function setupInvestigation(d = {}) {
  deps = {...deps, ...d};
  return {rules: I, evidence, leave: leaveEvidence, search: searchScene, evidenceDialog, theories: theoriesDialog, editTheory, testTheory, truth: truthDialog, judge, onSocket};
}
