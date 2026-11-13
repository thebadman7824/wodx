/**
 * My characters (B3534 to B3536): a roster for each player. Every character the player owns (the main character,
 * ghouls, Kinfolk, retainers, apprentices, thralls, followers and allies), each with its state: awake, in torpor,
 * dead or away. One click makes it the played character and selects its token. When the played character falls
 * into torpor, dies or goes away, the roster opens for the player to pick someone else. A player asks to add a new
 * character; the Storyteller approves and picks which sheet the player gets. Rules in roster-rules.mjs.
 */
import {MODULE_ID, esc, emit, isActiveGM} from "./util.mjs";
import * as RR from "./roster-rules.mjs";
import * as approvals from "./approvals.mjs";
import {searchBox} from "./search.mjs";

export const TYPE = "roster.add";
const isGroup = a => /group/i.test(String(a?.type ?? ""));
const OWNER = () => CONST.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;

/** The plain record the rules read. */
function plainOf(a, main = null) {
  const lin = a.flags?.["wodx-creation"]?.lineage ?? {};
  const tie = main && main.id !== a.id ? (main.flags?.["wodx-sheets"]?.ties ?? []).find(t => t?.uuid === a.uuid) : null;
  return {id: a.id, name: a.name, type: a.type, died: a.flags?.["wodx-creation"]?.chronology?.died ?? null,
    torpor: !!a.flags?.["wodx-actions"]?.torpor, away: !!a.flags?.[MODULE_ID]?.away,
    ghoul: !!(lin.domitor || a.flags?.["wodx-creation"]?.ghoul || a.flags?.["wodx-npc"]?.ghoul),
    kinfolk: !!(lin.kinfolk || a.flags?.["wodx-npc"]?.kinfolk), role: tie?.role ?? ""};
}

/** A player's roster. */
export function rosterOf(user = game.user) {
  if ( !user ) return [];
  const main = user.character ?? null;
  const mine = game.actors.filter(a => !isGroup(a) && a.testUserPermission?.(user, "OWNER") && (!user.isGM || a.id === main?.id));
  return RR.roster(mine.map(a => plainOf(a, main)), main?.id ?? null);
}

/** Play this character: the user's character, and its token selected on this scene. */
export async function play(id, user = game.user) {
  const a = game.actors.get(id);
  if ( !a || !a.testUserPermission?.(user, "OWNER") ) return false;
  try { await user.update({character: a.id}); }
  catch (e) { if ( !isActiveGM() ) emit("roster.play", {user: user.id, actor: a.id}, {needsGM: true}); }
  const tok = canvas?.tokens?.placeables?.find(t => t.actor?.id === a.id);
  if ( tok && user.id === game.user.id ) { tok.control({releaseOthers: true}); canvas.animatePan?.({x: tok.center.x, y: tok.center.y}); }
  ui.notifications.info(`You now play ${a.name}.`);
  return true;
}

/** The Storyteller's client sets a player's character when the player could not. */
export async function onPlaySocket(p = {}) {
  if ( !isActiveGM() ) return;
  const u = game.users.get(p.user), a = game.actors.get(p.actor);
  if ( u && a && a.testUserPermission?.(u, "OWNER") ) await u.update({character: a.id});
}

/** A player asks to add a character to their roster; it waits on the Storyteller. */
export async function askToAdd() {
  const res = await foundry.applications.api.DialogV2.prompt({window: {title: "Add a character"}, rejectClose: false,
    content: `<div class="form-group"><label>Who</label><input type="text" name="name" maxlength="80" required placeholder="A ghoul, a retainer, an heir..."></div>
      <div class="form-group"><label>Why</label><textarea name="why" rows="2" maxlength="300"></textarea></div>`,
    ok: {label: "Ask the Storyteller", callback: (ev, b) => ({name: b.form.elements.name.value.trim(), why: b.form.elements.why.value.trim()})}});
  if ( !res?.name ) return;
  if ( isActiveGM() ) return build({...res, user: game.user.id});
  if ( emit("roster.add", {...res, user: game.user.id}, {needsGM: true}) !== false ) ui.notifications.info("Sent to the Storyteller.");
}

export async function build(p = {}) {
  if ( !isActiveGM() ) return null;
  const u = game.users.get(String(p.user ?? ""));
  if ( !u ) return null;
  const name = String(p.name ?? "").slice(0, 80);
  return approvals.addToQueue({id: foundry.utils.randomID(), type: TYPE, key: null, title: `${u.name} asks to play ${name} too`,
    detail: String(p.why ?? "").slice(0, 300), data: {user: u.id, name}, from: u.isGM ? null : u.id, createdAt: Date.now(), worldTime: game.time.worldTime});
}

/** Approved: the Storyteller picks the sheet; the player becomes its owner. */
async function approveAdd(e) {
  const u = game.users.get(e.data?.user);
  if ( !u ) return;
  const list = game.actors.filter(a => !isGroup(a) && !a.testUserPermission?.(u, "OWNER")).sort((a, b) => a.name.localeCompare(b.name));
  const guess = list.find(a => a.name.toLowerCase() === String(e.data?.name ?? "").toLowerCase())?.id;
  const id = await foundry.applications.api.DialogV2.prompt({window: {title: `A sheet for ${u.name}`}, rejectClose: false,
    content: `${searchBox("select[name=actor]", "Search sheets…", "Search sheets")}<div class="form-group"><label>The sheet for "${esc(e.data?.name)}"</label><select name="actor" size="8">${list.map(a => `<option value="${a.id}"${a.id === guess ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>`,
    ok: {label: "Give it to the player", callback: (ev, b) => b.form.elements.actor.value}});
  const a = id ? game.actors.get(id) : null;
  if ( a ) await a.update({[`ownership.${u.id}`]: OWNER()});
}

/** The window. */
export async function openRoster(user = game.user) {
  const list = rosterOf(user);
  const rows = list.map(r => `<li data-search-text="${esc(`${r.name} ${r.tieLabel}`)}"><b>${esc(r.name)}</b> <span class="wodx-tag">${esc(r.tieLabel)}</span> <span class="wodx-quiet">${esc(r.stateLabel)}</span>
      ${r.playable && r.tie !== "main" ? `<button type="button" class="wodx-roster-play" data-id="${r.id}">Play</button>` : ""}
      ${game.user.isGM ? `<button type="button" class="wodx-roster-away" data-id="${r.id}">${r.state === "away" ? "Back" : "Away"}</button>` : ""}</li>`).join("");
  const dlg = foundry.applications.api.DialogV2.wait({window: {title: "My characters"}, position: {width: 440}, rejectClose: false,
    content: `${searchBox("ul.wodx-roster", "Search characters…", "Search characters")}<ul class="wodx-list wodx-roster">${rows || "<li class=\"wodx-quiet\">You own no characters yet.</li>"}</ul>
      <p class="hint">Each character you own, as the books name the tie. Play another while your main character sleeps, is gone or is away.</p>`,
    render: (ev, d) => {
      const root = d?.element ?? ev?.target?.element;
      root?.querySelectorAll?.("button.wodx-roster-play").forEach(b => b.addEventListener("click", async () => { await play(b.dataset.id, user); d?.close?.(); }));
      root?.querySelectorAll?.("button.wodx-roster-away").forEach(b => b.addEventListener("click", async () => { await setAway(b.dataset.id, !game.actors.get(b.dataset.id)?.flags?.[MODULE_ID]?.away); d?.close?.(); }));
    },
    buttons: [{action: "add", label: "Ask to add a character", callback: () => "add"}, {action: "close", label: "Close", default: true}]});
  if ( await dlg === "add" ) await askToAdd();
}

/** The Storyteller marks a character away (on a long journey) or back. */
export async function setAway(id, away = true) {
  const a = game.actors.get(id);
  if ( !a || !game.user.isGM ) return;
  await (away ? a.setFlag(MODULE_ID, "away", {since: game.time.worldTime}) : a.unsetFlag(MODULE_ID, "away"));
}

/** When the played character stops being playable, offer the roster. */
const lastState = new Map();
function onActor(actor) {
  const me = game.user.character;
  if ( !me || actor.id !== me.id || game.user.isGM ) return;
  const now = RR.stateOf(plainOf(actor));
  const before = lastState.get(actor.id) ?? "awake";
  lastState.set(actor.id, now);
  if ( !RR.needsPick(before, now) ) return;
  const others = RR.others(rosterOf(), actor.id);
  ui.notifications.info(`${actor.name} is ${RR.STATES[now].toLowerCase()}.${others.length ? " Pick someone else to play." : ""}`);
  if ( others.length ) openRoster();
}

export function registerRoster() {
  approvals.registerHandler(TYPE, {label: "A new character for a player", approve: approveAdd});
  Hooks.on("updateActor", a => { try { onActor(a); } catch (e) { console.warn("WoDX | roster", e); } });
}
/** At init: the key for the window. */
export function registerRosterKey() {
  game.keybindings?.register?.(MODULE_ID, "roster", {name: "My characters", hint: "Every character you own, and which one you play.", editable: [], restricted: false,
    onDown: () => { openRoster(); return true; }});
}
