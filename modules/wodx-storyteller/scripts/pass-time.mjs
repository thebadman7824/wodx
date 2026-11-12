/**
 * Players ask for time to pass (WoDX Storyteller 0.52.0, B2457). A player picks wait, rest or sleep the day from the
 * toolbar. Every player who is here tonight and plays a present character is asked; when all agree and no fight is
 * running, the time passes through the same spend() the Storyteller's own buttons use, so dawn, sunlight and dated
 * events fire as usual. One "Not now" ends the ask. An ask nobody finishes lapses after ten minutes.
 * The Storyteller can agree for the table from the card. Asks are kept on the active Storyteller's client.
 */
import * as SR from "./spend-rules.mjs";
import {MOD, SOCKET, esc, isActiveGM, pcs, ownerOf, gmIds} from "./core.mjs";
import {presentWhere, spend} from "./spend.mjs";

const LAPSE = 10 * 60 * 1000;
const asks = new Map();
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];

const inFight = () => all(game.combats).some(c => c.started && c.combatants.some(x => pcs().some(a => a.id === x.actorId)));

/** The players who must agree, and the characters whose time passes. */
function table() {
  const here = presentWhere().map(p => game.actors.get(p.id)).filter(Boolean);
  const users = [...new Set(here.map(a => ownerOf(a)).filter(u => u && u.active && !u.isGM).map(u => u.id))];
  return {users, actorIds: here.map(a => a.id)};
}

/** Player toolbar: pick how long, then ask the table. */
export async function passTimeDialog() {
  const opts = Object.entries(SR.PASS_CHOICES).map(([k, c], i) => `<option value="${k}"${i === 0 ? " selected" : ""}>${esc(c.label)}</option>`).join("");
  const {DialogV2} = foundry.applications.api;
  const pick = await DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Let time pass"},
    content: `<div class="form-group"><label for="wst-pass">How long</label><select id="wst-pass" name="pass" data-fixed>${opts}</select></div>
      <p class="wodx-quiet">Everyone at the table who is here tonight is asked. When all agree and nobody is fighting, the clock moves.</p>`,
    ok: {label: "Ask the table", callback: (ev, b) => b.form.elements.pass.value}, rejectClose: false});
  if ( !pick || !SR.PASS_CHOICES[pick] ) return;
  if ( game.user.isGM ) return open({userId: game.user.id, choice: pick});
  if ( !game.users.activeGM ) { ui.notifications.warn("No Storyteller is connected, so this could not be sent."); return; }
  game.socket.emit(SOCKET, {type: "req.passTime", payload: {userId: game.user.id, choice: pick}});
  ui.notifications.info("Asked the table.");
}

/** Active Storyteller: open an ask and post the card to those who must agree. */
export async function open({userId, choice}) {
  if ( !isActiveGM() ) return null;
  const c = SR.PASS_CHOICES[choice], asker = game.users.get(userId);
  if ( !c || !asker ) return null;
  if ( inFight() ) { await say([userId], "Not while a fight is running."); return null; }
  const t = table();
  if ( !t.actorIds.length ) { await say([userId], "Nobody's character is here to wait."); return null; }
  const id = foundry.utils.randomID();
  const ask = {id, choice, seconds: c.seconds, label: c.label, needed: t.users, agreed: asker.isGM ? [] : [userId], refused: [], actorIds: t.actorIds, at: Date.now(), by: asker.name};
  asks.set(id, ask);
  setTimeout(() => { if ( asks.get(id) ) { asks.delete(id); finish(ask, "lapsed").catch(() => {}); } }, LAPSE);
  if ( SR.voteState(ask) === "pass" ) return finish(ask, "pass");
  const msg = await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [...new Set([...t.users, ...gmIds()])], flags: {[MOD]: {passAsk: id}},
    content: `<div class="wodx-card"><p><b>${esc(asker.name)} asks: ${esc(c.label.toLowerCase())}?</b></p>
      <p class="wodx-quiet">It passes when everyone here agrees. Waiting for: <span class="wst-pass-left">${esc(left(ask))}</span>.</p>
      <div class="wodx-buttons"><button type="button" class="wst-pass-vote" data-id="${id}" data-yes="1">Agree</button>
      <button type="button" class="wst-pass-vote" data-id="${id}" data-yes="0">Not now</button></div></div>`});
  ask.msg = msg?.id ?? null;
  return ask;
}

const left = ask => ask.needed.filter(u => !ask.agreed.includes(u)).map(u => game.users.get(u)?.name ?? "someone").join(", ") || "nobody";

/** Active Storyteller: a vote arrives. The Storyteller's own Agree speaks for the table. */
export async function vote({id, userId, yes}) {
  if ( !isActiveGM() ) return;
  const ask = asks.get(id), user = game.users.get(userId);
  if ( !ask || !user ) return;
  if ( !user.isGM && !ask.needed.includes(user.id) ) return;
  if ( yes ) {
    if ( user.isGM ) ask.agreed = [...ask.needed];
    else if ( !ask.agreed.includes(user.id) ) ask.agreed.push(user.id);
  } else ask.refused.push(user.id);
  const st = SR.voteState(ask);
  if ( st === "wait" ) {
    const m = game.messages.get(ask.msg);
    if ( m ) await m.update({content: m.content.replace(/<span class="wst-pass-left">[\s\S]*?<\/span>/, `<span class="wst-pass-left">${esc(left(ask))}</span>`)});
    return;
  }
  asks.delete(id);
  await finish(ask, st, user);
}

async function finish(ask, st, by = null) {
  const m = ask.msg ? game.messages.get(ask.msg) : null;
  let text;
  if ( st === "pass" && inFight() ) st = "fight";
  if ( st === "pass" ) {
    const r = await spend({actorIds: ask.actorIds, seconds: ask.seconds, label: ask.label});
    text = r.how === "none" ? "The time could not pass." : `Everyone agreed: ${ask.label.toLowerCase()}.`;
  } else text = st === "refused" ? `${by?.name ?? "Someone"} said not now.` : st === "fight" ? "A fight started, so the time does not pass." : "Nobody finished answering, so the time does not pass.";
  if ( m ) await m.update({content: `<div class="wodx-card"><p>${esc(text)}</p></div>`, [`flags.${MOD}.passAsk`]: null});
  else await say([...ask.needed, ...gmIds()], text);
}

async function say(ids, text) {
  await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: [...new Set(ids)], content: `<div class="wodx-card"><p>${esc(text)}</p></div>`});
}

/** The Agree and Not now buttons, on every client that sees the card. */
export function installPassTime() {
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const id = msg.flags?.[MOD]?.passAsk;
    if ( !id ) return;
    el?.querySelectorAll?.("button.wst-pass-vote").forEach(b => b.addEventListener("click", ev => {
      ev.preventDefault();
      b.closest(".wodx-buttons")?.querySelectorAll("button").forEach(x => { x.disabled = true; });
      const p = {id, userId: game.user.id, yes: b.dataset.yes === "1"};
      if ( isActiveGM() ) vote(p).catch(e => console.error(`${MOD} | pass time`, e));
      else game.socket.emit(SOCKET, {type: "req.passVote", payload: p});
    }));
  });
}
