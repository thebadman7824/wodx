/**
 * WoDX Storyteller 0.11.0: letters and news that travel. The rules are in letters-rules.mjs.
 *
 * Player button "Send a letter": from one of your characters, to another player character or to someone the
 * Storyteller plays, by a carrier the year allows. The request goes to the active Storyteller's client by socket; it
 * is stored in the world setting "letters", and the Storyteller is whispered a card with Hold and Let it go. When the
 * clock reaches its time, a letter for a player character is whispered to that character's players; one for someone
 * else is whispered to the Storyteller to answer.
 *
 * Storyteller 0.59.0 (B2700 to B2704): the letter goes from the part of the world the sender stands in to the part
 * the other stands in, and takes the world map's journey time for the year (the known world included). The
 * Storyteller can send as anyone they play (a faction, an elder, a ghoul), sees every letter on the way in
 * "Letters on the way" (the hand), and can lose one, put it back some days or have it read on the way. An answer to a
 * letter goes back the same long way. Players see a letter for them only when it arrives.
 */
import * as L from "./letters-rules.mjs";
import {MOD, SOCKET, esc, isActiveGM, setting, isPC, pcs, chron, whereIs} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {mediaYear} from "../../wodx-chronicle/scripts/media-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import * as WMap from "./world-map.mjs";
import {addTool} from "./hand.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const owners = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const dateOf = t => { try { return describeTime(t).dateLabel; } catch (e) { return ""; } };
const dateNow = () => dateOf(game.time.worldTime);
const opt = (list, cur = null) => list.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("");

/** The world's parts as [id, label], by name; empty without WoDX Chronicle's world regions. */
function regionList() {
  const r = chron()?.world?.regions ?? {};
  return Object.entries(r).map(([id, x]) => [id, x.label ?? id]).sort((a, b) => a[1].localeCompare(b[1]));
}
const regionName = id => chron()?.world?.regionOf?.(id)?.label ?? id ?? "";
/** The part of the world a character stands in: the scene that holds their token, else the homeland. */
export function regionOfActor(actor) {
  try {
    const w = chron()?.world;
    if ( !w ) return "";
    const s = actor ? whereIs(actor) : null;
    const r = w.here?.(s ?? null);
    return (typeof r === "string" ? r : r?.id) ?? String(w.homeland?.() ?? "");
  } catch (e) { return ""; }
}
const homeRegion = () => { try { const h = chron()?.world?.homeland?.(); return (typeof h === "string" ? h : h?.id) ?? ""; } catch (e) { return ""; } };

/** How a letter between two parts of the world goes in a year: {ok, why, seconds, days, words}. Loads the world map when the two differ. */
export async function planFor(how, {from, to, reach = "near", year = yearNow()} = {}) {
  const future = futureOn(), internet = {from: mediaYear("internet", from || null), to: mediaYear("internet", to || null)};
  if ( !from || !to || from === to ) return L.worldPlan(how, {from, to, year, reach, future, internet});
  let j = null;
  try {
    const WM = await WMap.load(), a = WM.regionCentre(from), b = WM.regionCentre(to);
    if ( a && b ) j = WM.journey(a, b, {year, known: WMap.knownNow(year)});
  } catch (e) { console.error(`${MOD} | letters`, e); }
  return L.worldPlan(how, {from, to, year, reach, future, internet, j});
}

export function registerLetterSettings() {
  game.settings.register(MOD, "letters", {scope: "world", config: false, type: Array, default: []});
}
const letters = () => L.normLetters(setting("letters"));
const saveLetters = list => game.settings.set(MOD, "letters", L.prune(list, game.time.worldTime));

/** The sending window. A player sends from a character of their own; the Storyteller can also send as anyone they play. */
export async function openLetters({answer = null} = {}) {
  const gm = game.user.isGM;
  const mine = pcs().filter(a => a.isOwner);
  if ( !mine.length && !gm ) return ui.notifications.warn("You need a character of your own to send a letter.");
  const year = yearNow(), regions = regionList();
  const re = answer ? letters().find(l => l.id === answer) : null;
  const fromList = [...(gm ? [["", "Someone I play"]] : []), ...mine.map(a => [a.id, a.name])];
  const startFrom = re ? re.toRegion || homeRegion() : regionOfActor(mine[0]) || homeRegion();
  const startTo = re ? re.fromRegion || homeRegion() : startFrom;
  const toPcs = pcs().map(a => [a.id, a.name]);
  const fromSel = `${fromList.length > 8 ? searchBox("select[name=from]", "Search characters…", "Search senders") : ""}<select name="from"${fromList.length > 8 ? "" : " data-fixed"}>${opt(fromList, "")}</select>`;
  const ways = L.carriersFor(year, {future: futureOn(), region: startFrom || null, internet: mediaYear("internet", startFrom || null)});
  const regionRow = (name, label, cur) => regions.length ? `<div class="form-group"><label>${label}</label>${searchBox(`select[name=${name}]`, "Search the world…", `Search: ${label}`)}<select name="${name}">${opt(regions, cur)}</select></div>` : "";
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wst-letters"],
    window: {title: re ? `Answer ${re.fromName}` : "Send a letter or message"},
    content: `${re ? `<p class="wodx-quiet">The answer goes back from ${esc(regionName(re.toRegion))} to ${esc(re.fromName)} in ${esc(regionName(re.fromRegion))}.</p>` : ""}
      <div class="form-group"><label>From</label>${fromSel}</div>
      ${gm ? `<div class="form-group"><label>Sender's name</label><input type="text" name="fromName" value="${esc(re?.toName ?? "")}" placeholder="A faction, an elder, a ghoul…"></div>` : ""}
      ${regionRow("fromRegion", "Sent from", startFrom)}
      <div class="form-group"><label>To</label>${searchBox("select[name=to]", "Search characters…", "Search characters")}<select name="to"><option value="">Someone the Storyteller plays</option>${opt(toPcs, re?.from ?? null)}</select></div>
      <div class="form-group"><label>Their name</label><input type="text" name="toName" placeholder="Only for someone the Storyteller plays"></div>
      ${regionRow("toRegion", "Where they are", startTo)}
      <div class="form-group"><label>How</label><select name="how" data-fixed>${opt(ways.map(w => [w.id, w.label]), re?.how ?? null)}</select></div>
      <div class="form-group"><label>In the same land</label><select name="reach" data-fixed>${opt(Object.entries(L.REACH).filter(([k]) => k !== "far"))}</select></div>
      <div class="form-group stacked"><label>The letter</label><textarea name="text" rows="6"></textarea></div>
      <p class="hint">It arrives when the way you chose would bring it over that distance in ${year || "this year"}; between lands the world map gives the time. ${gm ? "" : "The Storyteller sees what you send."}</p>`,
    buttons: [{action: "send", label: "Send", default: true, callback: (ev, btn) => Object.fromEntries(new FormData(btn.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res || !String(res.text ?? "").trim() ) return;
  if ( !gm && !res.from ) return;
  if ( gm && !res.to && !res.from ) return ui.notifications.warn("Send from a character, or to one.");
  const p = await planFor(res.how, {from: res.fromRegion, to: res.toRegion, reach: res.reach, year});
  if ( !p.ok ) return ui.notifications.warn(p.why);
  const payload = {userId: game.user.id, ...res, answers: re?.id ?? ""};
  if ( gm ) { const l = await send(payload); if ( l ) ui.notifications.info(`Sent. It should arrive ${L.wayWords(p.seconds)}.`); return l; }
  game.socket.emit(SOCKET, {type: "req.letter", payload});
  ui.notifications.info(`Sent. It should arrive ${L.wayWords(p.seconds)}.`);
}

/** The active Storyteller's client: store a letter and show the Storyteller. */
export async function send(payload) {
  if ( !isActiveGM() ) return null;
  const user = game.users.get(payload.userId);
  if ( !user ) return null;
  const from = payload.from ? game.actors.get(payload.from) : null;
  // A player sends only from a character of their own; the Storyteller may send as anyone they play
  if ( !user.isGM && (!from || !from.testUserPermission?.(user, "OWNER")) ) return null;
  const fromName = from?.name ?? (String(payload.fromName ?? "").trim() || "someone");
  const toActor = payload.to ? game.actors.get(payload.to) : null;
  if ( user.isGM && !from && !(toActor && isPC(toActor)) ) return null;
  const fromRegion = String(payload.fromRegion ?? "") || (from ? regionOfActor(from) : "") || homeRegion();
  const toRegion = String(payload.toRegion ?? "") || (toActor ? regionOfActor(toActor) : "") || fromRegion;
  const year = yearNow(), p = await planFor(payload.how, {from: fromRegion, to: toRegion, reach: payload.reach, year});
  if ( !p.ok ) return null;
  const now = game.time.worldTime;
  const l = L.normLetter({id: foundry.utils.randomID(), from: from?.id ?? "", fromName, to: toActor && isPC(toActor) ? toActor.id : "",
    toName: toActor?.name ?? (String(payload.toName ?? "").trim() || "someone"), how: payload.how, reach: fromRegion === toRegion ? payload.reach : "far", text: payload.text,
    sentAt: now, dueAt: now + p.seconds, sentLabel: dateNow(), fromRegion, toRegion, answers: payload.answers, toUser: user.isGM ? "" : user.id,
    lost: L.lostChance(payload.how, p.seconds)});
  await saveLetters([...letters(), l]);
  const c = L.CARRIERS[l.how];
  const where = fromRegion && toRegion && fromRegion !== toRegion ? `from ${regionName(fromRegion)} to ${regionName(toRegion)}` : L.REACH[l.reach].toLowerCase();
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Letters"}, flags: {[MOD]: {letter: l.id}},
    content: `<div class="vta-card wst-letter"><h3>${esc(l.fromName)} sends word to ${esc(l.toName)}</h3><p class="wodx-quiet">${esc(c.label)}, ${esc(where)}; it arrives ${esc(L.wayWords(p.seconds))} (${esc(dateOf(l.dueAt))}). ${esc(p.words.join(" "))} On the way it could be read by ${esc(c.read)}.${l.lost ? ` About ${l.lost} in a hundred such letters go astray.` : ""}</p><blockquote>${esc(l.text).replace(/\n/g, "<br>")}</blockquote>
      <p>${buttons(l.id)}</p></div>`});
  if ( p.seconds <= 0 ) await deliver();
  return l;
}

const buttons = id => `<button type="button" data-wst-letter="held" data-id="${id}">Lost on the way</button> <button type="button" data-wst-letter="late" data-id="${id}">Put it back some days</button> <button type="button" data-wst-letter="read" data-id="${id}">Read on the way</button> <button type="button" data-wst-letter="way" data-id="${id}">Let it go</button>`;

/** Hold a letter back (lost, stopped or read on the way) or let it go on. */
export async function setLetter(id, state) {
  const list = letters(), l = list.find(x => x.id === id);
  if ( !l || l.state === "done" ) return;
  l.state = state === "held" ? "held" : "way";
  await saveLetters(list);
  ui.notifications.info(l.state === "held" ? `${l.fromName}'s letter is held back; it will not arrive.` : `${l.fromName}'s letter is on its way.`);
  if ( l.state === "way" ) await deliver();
}

/** Put a letter back by some days. */
export async function delayLetter(id, days) {
  if ( !game.user.isGM ) return null;
  const list = letters(), i = list.findIndex(x => x.id === id);
  if ( i < 0 || list[i].state === "done" || !(Number(days) > 0) ) return null;
  list[i] = L.delay(list[i], days);
  await saveLetters(list);
  ui.notifications.info(`${list[i].fromName}'s letter now arrives ${dateOf(list[i].dueAt)}.`);
  return list[i];
}

/** Someone reads it on the way: noted for the Storyteller, and the seal shows it when it arrives. */
export async function readOnTheWay(id, by) {
  if ( !game.user.isGM ) return null;
  const list = letters(), l = list.find(x => x.id === id);
  if ( !l || l.state === "done" ) return null;
  l.readBy = String(by ?? "").trim().slice(0, 120) || "someone on the way";
  await saveLetters(list);
  ui.notifications.info(`${l.fromName}'s letter is read by ${l.readBy}.`);
  return l;
}

async function ask(id, what) {
  const l = letters().find(x => x.id === id);
  if ( !l ) return;
  if ( what === "late" ) {
    const n = await foundry.applications.api.DialogV2.prompt({window: {title: "Put it back"}, rejectClose: false,
      content: `<div class="form-group"><label>Days later</label><input type="number" name="days" value="3" min="1" max="3650" step="1"></div>`,
      ok: {label: "Put it back", callback: (ev, b) => Number(b.form.elements.days.value)}});
    if ( n > 0 ) await delayLetter(id, n);
  } else if ( what === "read" ) {
    const by = await foundry.applications.api.DialogV2.prompt({window: {title: "Read on the way"}, rejectClose: false,
      content: `<div class="form-group"><label>Read by</label><input type="text" name="by" placeholder="${esc(L.CARRIERS[l.how]?.read ?? "")}"></div>`,
      ok: {label: "So noted", callback: (ev, b) => b.form.elements.by.value}});
    if ( by !== null && by !== undefined ) await readOnTheWay(id, by);
  } else await setLetter(id, what);
}

/** Deliver what the clock has reached. */
export async function deliver(now = game.time.worldTime) {
  if ( !isActiveGM() ) return;
  const list = letters(), ready = L.due(list, now);
  if ( !ready.length ) return;
  for ( const l of ready ) {
    const to = l.to ? game.actors.get(l.to) : null, c = L.CARRIERS[l.how];
    const whisper = to ? [...new Set([...owners(to), ...gmIds()])] : gmIds();
    const head = to ? `${esc(c.label)} for ${esc(l.toName)}, from ${esc(l.fromName)}` : `${esc(c.label)} reaches ${esc(l.toName)}, from ${esc(l.fromName)}`;
    const away = l.fromRegion && l.toRegion && l.fromRegion !== l.toRegion ? ` in ${esc(regionName(l.fromRegion))}` : "";
    const seal = l.readBy && to ? " The seal has been broken and pressed back." : "";
    await ChatMessage.create({whisper, speaker: {alias: "Letters"}, flags: {[MOD]: {letterIn: l.id}},
      content: `<div class="vta-card wst-letter"><h3>${head}</h3><p class="wodx-quiet">Sent${away} ${esc(l.sentLabel)}.${l.late ? " It was held up on the way." : ""}${seal}${to ? "" : " The answer is yours to write."}</p><blockquote>${esc(l.text).replace(/\n/g, "<br>")}</blockquote>${to ? "" : `<p><button type="button" data-wst-answer="${l.id}">Write the answer</button></p>`}</div>`});
    list.find(x => x.id === l.id).state = "done";
  }
  await saveLetters(list);
}

/** The Storyteller's list of every letter still on the way or held back. */
export async function lettersOnTheWay() {
  if ( !game.user.isGM ) return null;
  const rows = L.inTransit(letters());
  const now = game.time.worldTime;
  const row = l => `<li class="wst-letter-row" style="margin:0 0 0.5rem 0"><b>${esc(l.fromName)}</b> to <b>${esc(l.toName)}</b>, ${esc(L.CARRIERS[l.how].label.toLowerCase())}${l.fromRegion && l.toRegion && l.fromRegion !== l.toRegion ? `, ${esc(regionName(l.fromRegion))} to ${esc(regionName(l.toRegion))}` : ""}.
    <span class="wodx-quiet">${l.state === "held" ? "Held back: it will not arrive." : `Arrives ${esc(dateOf(l.dueAt))} (${esc(L.wayWords(Math.max(0, l.dueAt - now)))})`}${l.late ? `, ${l.late} days late` : ""}${l.readBy ? `, read by ${esc(l.readBy)}` : ""}${l.lost ? `; ${l.lost} in a hundred go astray` : ""}.</span><br>${buttons(l.id)}</li>`;
  return foundry.applications.api.DialogV2.wait({window: {title: "Letters on the way", resizable: true}, classes: ["wodx-dialog", "wstory-dialog", "wst-hand", "wst-letters-way"], position: {width: 640, height: "auto"}, rejectClose: false,
    content: `<div style="max-height:70vh;overflow-y:auto">${rows.length ? `<ul data-fixed style="list-style:none;padding:0;margin:0">${rows.map(row).join("")}</ul>` : "<p>Nothing is on the way.</p>"}
      <p class="wodx-quiet">Players see a letter for them only when it arrives.</p></div>`,
    render: (ev, dlg) => wire(dlg.element),
    buttons: [{action: "write", label: "Send as someone I play", callback: () => "write"}, {action: "close", label: "Close", default: true}]})
    .then(r => (r === "write" ? openLetters() : null));
}

function wire(el) {
  if ( !el || !game.user.isGM ) return;
  for ( const b of el.querySelectorAll("[data-wst-letter]") ) if ( !b.dataset.wired ) { b.dataset.wired = "1"; b.addEventListener("click", () => ask(b.dataset.id, b.dataset.wstLetter).catch(e => console.error(`${MOD} | letters`, e))); }
  for ( const b of el.querySelectorAll("[data-wst-answer]") ) if ( !b.dataset.wired ) { b.dataset.wired = "1"; b.addEventListener("click", () => openLetters({answer: b.dataset.wstAnswer}).catch(e => console.error(`${MOD} | letters`, e))); }
}

export function registerLetterHooks() {
  const quiet = () => { try { return !!(chron()?.isHeld?.() || chron()?.isSkipping?.()); } catch (e) { return false; } };
  const run = () => { if ( isActiveGM() && !quiet() ) deliver().catch(e => console.error(`${MOD} | letters`, e)); };
  Hooks.on("updateWorldTime", run);
  Hooks.on("wodxSkipEnd", run);
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !game.user.isGM || !(msg.flags?.[MOD]?.letter || msg.flags?.[MOD]?.letterIn) ) return;
    wire(el);
  });
  addTool({key: "letters", label: "Letters on the way", icon: "fa-envelope", run: () => lettersOnTheWay()});
}
