/**
 * The referee ticket (B3520 to B3523). A player marks a freeform action "Ask for a ruling": a Free Effect, an odd
 * Dominate command, a ritual that crosses two lines. The Storyteller's client builds one ticket in the approval queue
 * from both sheets: the pool, the crossover referee's case for the power if one fits, and the risks. The card has
 * Change difficulty (1 to 3 either way) and Complication (a foreshadowing from the story aids). Approving whispers the
 * player a card with a Roll button at the final difficulty; until then the roll waits. The house rule "Pause the game
 * while a ruling waits" pauses the game until the ticket is decided. Rules in ticket-rules.mjs.
 */
import {MODULE_ID, esc, emit, isActiveGM, rule} from "./util.mjs";
import * as T from "./ticket-rules.mjs";
import * as R from "./referee-rules.mjs";
import * as referee from "./referee.mjs";
import * as approvals from "./approvals.mjs";
import * as eras from "./eras.mjs";

export const TYPE = "ticket";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const eraId = () => { try { return eras.activeEra()?.profile?.id ?? ""; } catch (e) { return ""; } };

/** A plain sheet: the referee's reading plus Attributes and Abilities. */
function plain(actor) {
  if ( !actor ) return null;
  const s = actor.system ?? {};
  return {...referee.sheetOf(actor),
    attributes: Object.fromEntries(T.ATTRS.map(k => [k, n(s.attributes?.[k]?.total ?? s.attributes?.[k]?.value)])),
    abilities: Object.fromEntries(T.ABILITIES.map(k => [k, n(s.abilities?.[k]?.value)]))};
}

/** Active GM: build the ticket from the sheets and queue it. q: {actorId, targetId, text, attr, ability, difficulty, power, witnesses, from}. */
export async function build(q = {}) {
  if ( !isActiveGM() ) return null;
  const actor = game.actors.get(q.actorId), target = q.targetId ? game.actors.get(q.targetId) : null;
  if ( !actor ) return null;
  // A player may only ask for a character they own
  const from = q.from ? game.users.get(q.from) : null;
  if ( from && !from.isGM && !actor.testUserPermission?.(from, "OWNER") ) return null;
  const power = R.POWERS[q.power] ? q.power : "";
  const cases = power ? referee.ask(power, actor, target) : [];
  const t = T.buildTicket({text: q.text, attr: q.attr, ability: q.ability, difficulty: q.difficulty, power: power ? R.POWERS[power] : "",
    witnesses: !!q.witnesses, actor: plain(actor), target: plain(target), book: R.bookOf(eraId()), cases});
  const entry = {id: foundry.utils.randomID(), type: TYPE, key: null, title: `A ruling for ${actor.name}: ${t.text.slice(0, 80) || "an action"}`,
    detail: "", data: {...t, actorId: actor.id, targetId: target?.id ?? null, paused: false}, from: from && !from.isGM ? from.id : null,
    createdAt: Date.now(), worldTime: game.time.worldTime};
  if ( rule("ticketPause") && !game.paused ) { game.togglePause(true, {broadcast: true}); entry.data.paused = true; }
  return approvals.addToQueue(entry);
}

/** The player's form: what the character does, the pool, an optional power and target. */
export async function askRuling({text = ""} = {}) {
  const {DialogV2} = foundry.applications.api;
  const mine = game.user.isGM ? canvas?.tokens?.controlled?.[0]?.actor : (game.user.character ?? canvas?.tokens?.controlled?.find(t => t.actor?.isOwner)?.actor);
  if ( !mine ) return ui.notifications.warn("Select your character's token first.");
  const target = [...(game.user.targets ?? [])][0]?.actor ?? null;
  const opt = (list, lab = k => k) => list.map(k => `<option value="${k}">${esc(lab(k))}</option>`).join("");
  const powers = Object.entries(R.POWERS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  const res = await DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Ask for a ruling"}, position: {width: 460},
    content: `<p class="wodx-quiet">${esc(mine.name)}${target ? ` on ${esc(target.name)}` : ""}. The Storyteller sees both sheets and rules before you roll.</p>
      <div class="form-group"><label>What do you do?</label><textarea name="text" rows="3" maxlength="600" required>${esc(text)}</textarea></div>
      <div class="form-group"><label>Attribute</label><select name="attr" data-fixed><option value="">None</option>${opt(T.ATTRS, T.label)}</select></div>
      <div class="form-group"><label>Ability</label><select name="ability" data-fixed><option value="">None</option>${opt(T.ABILITIES, T.label)}</select></div>
      <div class="form-group"><label>Difficulty you expect</label><input type="number" name="difficulty" value="6" min="2" max="10"></div>
      <div class="form-group"><label>With a power</label><select name="power" data-fixed><option value="">No power</option>${powers}</select></div>
      <div class="form-group"><label>Mortals can see it</label><input type="checkbox" name="witnesses"></div>`,
    ok: {label: "Send for a ruling", callback: (ev, b) => { const f = b.form.elements;
      return {text: f.text.value.trim(), attr: f.attr.value, ability: f.ability.value, difficulty: n(f.difficulty.value) || 6, power: f.power.value, witnesses: f.witnesses.checked}; }},
    rejectClose: false});
  if ( !res?.text ) return;
  const q = {...res, actorId: mine.id, targetId: target?.id ?? null};
  if ( isActiveGM() ) await build(q);
  else if ( emit("ticket.propose", {...q, from: game.user.id}, {needsGM: true}) === false ) return;
  ui.notifications.info("Sent to the Storyteller for a ruling. Your roll waits on it.");
}

/** The ticket's body and controls on its queue card. */
function controls(e) {
  const t = e.data ?? {};
  const shifts = [-3, -2, -1, 0, 1, 2, 3].map(v => `<option value="${v}"${v === n(t.shift) ? " selected" : ""}>${v > 0 ? "+" : ""}${v}${v ? "" : " (as asked)"}</option>`).join("");
  const cases = (t.cases ?? []).map(c => `<li>${esc(c.ruling)}${c.verdict ? ` <i>${esc(c.verdict)}</i>` : ""}${c.refs?.length ? ` <span class="wodx-quiet">(${esc(c.refs.join(", "))})</span>` : ""}</li>`).join("");
  const risks = (t.risks ?? []).map(r => `<li>${esc(r.text)}</li>`).join("");
  const comps = (t.complications ?? []).map(c => `<li>${esc(c)}</li>`).join("");
  return `<div class="wodx-ticket">
    <p><b>${esc(t.actorName)}</b>${t.targetName ? ` on <b>${esc(t.targetName)}</b>` : ""}: ${esc(t.text)}</p>
    <p>${esc(T.poolWords(t))}${t.power ? `, with ${esc(t.power)}` : ""}.</p>
    ${cases ? `<p class="wodx-quiet">The crossover referee:</p><ul>${cases}</ul>` : ""}
    ${risks ? `<p class="wodx-quiet">Risks:</p><ul>${risks}</ul>` : ""}
    ${comps ? `<p class="wodx-quiet">Complications:</p><ul>${comps}</ul>` : ""}
    <div class="form-group"><label>Change difficulty</label><select data-control="shift" data-fixed aria-label="Change difficulty">${shifts}</select>
      <button type="button" data-control="complication"><i class="fa-solid fa-dice"></i> Complication</button></div></div>`;
}

async function control(e, what, value) {
  let t = e.data ?? {};
  if ( what === "shift" ) t = T.withShift(t, n(value));
  else if ( what === "complication" ) {
    let text = "";
    try {
      const aid = await game.wodx?.storyteller?.aid?.draw?.({kind: "foreshadow", actorId: t.actorId, nonce: (t.complications ?? []).length + 1});
      text = aid?.text ?? "";
    } catch (err) { console.warn("WoDX | story aid", err); }
    t = T.withComplication(t, text || T.fallbackComplication());
  } else return;
  await approvals.updatePending(e.id, {data: t});
}

const unpause = async t => { if ( t?.paused && game.paused ) game.togglePause(false, {broadcast: true}); };

/** Approved: the player (or the Storyteller) gets the roll card. */
async function approve(e) {
  const t = e.data ?? {};
  await unpause(t);
  const actor = game.actors.get(t.actorId);
  const owners = game.users.filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  const comps = (t.complications ?? []).length ? `<p class="wodx-quiet">It comes with a complication the Storyteller will describe.</p>` : "";
  await ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: [...new Set([...owners, ...gms])],
    flags: {[MODULE_ID]: {ticketRoll: {actorId: t.actorId, pool: t.pool, difficulty: t.difficulty, text: t.text}}},
    content: `<div class="wodx-card wodx-ticket"><p><b>Ruling:</b> ${esc(t.text)}</p><p>${esc(T.poolWords(t))}.</p>${comps}
      <button type="button" class="wodx-ticket-roll"><i class="fa-solid fa-dice-d10"></i> Roll</button></div>`});
}

async function reject(e) { await unpause(e.data); }

/** The Roll button on an approved ticket: the owner rolls the pool at the ruled difficulty. */
function onChat(msg, html) {
  const f = msg.flags?.[MODULE_ID]?.ticketRoll;
  const btn = html?.querySelector?.("button.wodx-ticket-roll");
  if ( !f || !btn ) return;
  const actor = game.actors.get(f.actorId);
  if ( !actor?.isOwner || msg.flags?.[MODULE_ID]?.ticketRolled ) { btn.disabled = true; return; }
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const d = Math.max(0, n(f.pool));
    let faces = [];
    if ( d ) { const roll = await new Roll(`${d}d10`).evaluate(); faces = roll.dice?.[0]?.results?.map(r => r.result) ?? []; }
    const {successes: s, botch} = R.successes(faces, f.difficulty);
    const word = !d ? "no dice" : botch ? "a botch" : s > 0 ? `${s} success${s === 1 ? "" : "es"}` : "no successes";
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}),
      content: `<div class="wodx-card"><p>${esc(f.text)}</p><p>${d} dice at ${f.difficulty}: <b>${word}</b>${faces.length ? ` <span class="wodx-quiet">(${faces.join(", ")})</span>` : ""}</p></div>`});
    if ( msg.isOwner ) await msg.setFlag(MODULE_ID, "ticketRolled", true).catch(() => null);
  });
}

export function registerTicket() {
  approvals.registerHandler(TYPE, {label: "Ruling for an action", controls, control, approve, reject});
  Hooks.on("renderChatMessageHTML", onChat);
}
