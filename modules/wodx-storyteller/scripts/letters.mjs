/**
 * WoDX Storyteller 0.11.0: letters and news that travel. The rules are in letters-rules.mjs.
 *
 * Player button "Send a letter": from one of your characters, to another player character or to someone the
 * Storyteller plays, by a carrier the year allows. The request goes to the active Storyteller's client by socket; it
 * is stored in the world setting "letters", and the Storyteller is whispered a card with Hold and Let it go. When the
 * clock reaches its time, a letter for a player character is whispered to that character's players; one for someone
 * else is whispered to the Storyteller to answer.
 */
import * as L from "./letters-rules.mjs";
import {MOD, SOCKET, esc, isActiveGM, setting, isPC, pcs, chron} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const owners = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const dateNow = () => { try { return describeTime(game.time.worldTime).dateLabel; } catch (e) { return ""; } };

export function registerLetterSettings() {
  game.settings.register(MOD, "letters", {scope: "world", config: false, type: Array, default: []});
}
const letters = () => L.normLetters(setting("letters"));
const saveLetters = list => game.settings.set(MOD, "letters", L.prune(list, game.time.worldTime));

/** The player's window. */
export async function openLetters() {
  const mine = pcs().filter(a => a.isOwner);
  if ( !mine.length ) return ui.notifications.warn("You need a character of your own to send a letter.");
  const year = yearNow(), ways = L.carriersFor(year, {future: futureOn()});
  const to = pcs().map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
  const opt = list => list.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wst-letters"],
    window: {title: "Send a letter or message"},
    content: `<div class="form-group"><label>From</label><select name="from"${mine.length > 8 ? "" : " data-fixed"}>${opt(mine.map(a => [a.id, a.name]))}</select></div>
      <div class="form-group"><label>To</label>${searchBox("select[name=to]", "Search characters…", "Search characters")}<select name="to"><option value="">Someone the Storyteller plays</option>${to}</select></div>
      <div class="form-group"><label>Their name</label><input type="text" name="toName" placeholder="Only for someone the Storyteller plays"></div>
      <div class="form-group"><label>How</label><select name="how" data-fixed>${opt(ways.map(w => [w.id, w.label]))}</select></div>
      <div class="form-group"><label>How far</label><select name="reach" data-fixed>${opt(Object.entries(L.REACH))}</select></div>
      <div class="form-group stacked"><label>The letter</label><textarea name="text" rows="6"></textarea></div>
      <p class="hint">It arrives when the way you chose would bring it. The Storyteller sees what you send.</p>`,
    buttons: [{action: "send", label: "Send", default: true, callback: (ev, btn) => Object.fromEntries(new FormData(btn.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res?.from || !String(res.text ?? "").trim() ) return;
  const p = L.plan(res.how, res.reach, year, {future: futureOn()});
  if ( !p.ok ) return ui.notifications.warn(p.why);
  const payload = {userId: game.user.id, ...res};
  if ( game.user.isGM ) return send(payload);
  game.socket.emit(SOCKET, {type: "req.letter", payload});
  ui.notifications.info(`Sent. It should arrive ${L.wayWords(p.seconds)}.`);
}

/** The active Storyteller's client: store a letter and show the Storyteller. */
export async function send(payload) {
  if ( !isActiveGM() ) return null;
  const user = game.users.get(payload.userId), from = game.actors.get(payload.from);
  if ( !user || !from || !from.testUserPermission?.(user, "OWNER") ) return null;
  const year = yearNow(), p = L.plan(payload.how, payload.reach, year, {future: futureOn()});
  if ( !p.ok ) return null;
  const toActor = payload.to ? game.actors.get(payload.to) : null;
  const now = game.time.worldTime;
  const l = L.normLetter({id: foundry.utils.randomID(), from: from.id, fromName: from.name, to: toActor && isPC(toActor) ? toActor.id : "",
    toName: toActor?.name ?? (String(payload.toName ?? "").trim() || "someone"), how: payload.how, reach: payload.reach, text: payload.text,
    sentAt: now, dueAt: now + p.seconds, sentLabel: dateNow()});
  await saveLetters([...letters(), l]);
  const c = L.CARRIERS[l.how];
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Letters"}, flags: {[MOD]: {letter: l.id}},
    content: `<div class="vta-card wst-letter"><h3>${esc(l.fromName)} sends word to ${esc(l.toName)}</h3><p class="wodx-quiet">${esc(c.label)}, ${esc(L.REACH[l.reach].toLowerCase())}; it arrives ${esc(L.wayWords(p.seconds))}. On the way it could be read by ${esc(c.read)}.</p><blockquote>${esc(l.text).replace(/\n/g, "<br>")}</blockquote>
      <p><button type="button" data-wst-letter="held" data-id="${l.id}">Hold it back</button> <button type="button" data-wst-letter="way" data-id="${l.id}">Let it go</button></p></div>`});
  if ( p.seconds <= 0 ) await deliver();
  return l;
}

/** Hold a letter back (lost, stopped or read on the way) or let it go on. */
export async function setLetter(id, state) {
  const list = letters(), l = list.find(x => x.id === id);
  if ( !l || l.state === "done" ) return;
  l.state = state === "held" ? "held" : "way";
  await saveLetters(list);
  ui.notifications.info(l.state === "held" ? `${l.fromName}'s letter is held back; it will not arrive.` : `${l.fromName}'s letter is on its way.`);
  if ( l.state === "way" ) await deliver();
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
    await ChatMessage.create({whisper, speaker: {alias: "Letters"},
      content: `<div class="vta-card wst-letter"><h3>${head}</h3><p class="wodx-quiet">Sent ${esc(l.sentLabel)}.${to ? "" : " The answer is yours to write."}</p><blockquote>${esc(l.text).replace(/\n/g, "<br>")}</blockquote></div>`});
    list.find(x => x.id === l.id).state = "done";
  }
  await saveLetters(list);
}

export function registerLetterHooks() {
  const quiet = () => { try { return !!(chron()?.isHeld?.() || chron()?.isSkipping?.()); } catch (e) { return false; } };
  const run = () => { if ( isActiveGM() && !quiet() ) deliver().catch(e => console.error(`${MOD} | letters`, e)); };
  Hooks.on("updateWorldTime", run);
  Hooks.on("wodxSkipEnd", run);
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    if ( !game.user.isGM || !msg.flags?.[MOD]?.letter ) return;
    for ( const b of el.querySelectorAll("[data-wst-letter]") ) b.addEventListener("click", () => setLetter(b.dataset.id, b.dataset.wstLetter).catch(e => console.error(`${MOD} | letters`, e)));
  });
}
