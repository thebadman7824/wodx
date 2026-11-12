/**
 * WoDX Storyteller 0.40.0: time spent on long actions, the Foundry part (the rules are in spend-rules.mjs).
 *
 *   api.time.spend({actorIds, seconds, label})  Storyteller: the clock moves, or, for characters apart from the main
 *                                               group, their own personal time does (setting "timeApart", on).
 *   api.time.ask({actorId, seconds, label})     Any client: a player's long roll sends the time to the approval queue
 *                                               (by socket; the Storyteller's client makes the proposal, B12). On the
 *                                               Storyteller's client it spends at once.
 *   api.time.clockRow() / bindClockRow(el)      The Time row on the Chronicle Clock: each character's own time.
 */
import * as SR from "./spend-rules.mjs";
import * as W from "./world-rules.mjs";
import {MOD, SOCKET, esc, chron, isActiveGM, setting, pcs, whereIs, absentIds, ownerOf, advancePersonal, setPersonal, personalTime, log, tell, sceneName} from "./core.mjs";

export const T_TIME = `${MOD}.time`;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];

export function registerSpendSettings() {
  game.settings.register(MOD, "timeApart", {name: "Work done apart goes on the character's own time",
    hint: "A long roll, an interaction, a fight or a journey by characters on another scene from the main group moves their own time instead of the world clock. Convene lines everyone up later.",
    scope: "world", config: true, type: Boolean, default: true});
}

/** Present characters and the scene each is on: players marked away tonight are left out. */
export function presentWhere() {
  const away = new Set(absentIds());
  return pcs().filter(a => { const u = ownerOf(a); return !u || !away.has(u.id); }).map(a => ({id: a.id, scene: whereIs(a)?.id ?? null}));
}

/** "personal" when these characters are apart and the setting is on, else "clock". */
export function howFor(actorIds = []) {
  if ( setting("timeApart") === false ) return "clock";
  const ids = actorIds.filter(id => pcs().some(a => a.id === id));
  if ( !ids.length || ids.length !== actorIds.length ) return "clock";
  return SR.groupApart(ids, presentWhere()) ? "personal" : "clock";
}

/** Storyteller: spend the time. Returns {how, seconds, ids}. */
export async function spend({actorIds = [], seconds = 0, label = ""} = {}) {
  const s = SR.cleanSeconds(seconds);
  if ( !game.user.isGM || !s ) return {how: "none", seconds: 0, ids: []};
  const ids = [...new Set(actorIds.filter(Boolean))];
  const how = howFor(ids);
  if ( how === "personal" ) {
    for ( const id of ids ) {
      await advancePersonal(id, s);
      const a = game.actors.get(id);
      await log({kind: "time", actor: id, name: a?.name, user: ownerOf(a)?.id, text: `${SR.spanWords(s)} apart from the group${label ? `: ${String(label).slice(0, 120)}` : ""}.`});
    }
    return {how, seconds: s, ids};
  }
  await game.time.advance(s);
  return {how: "clock", seconds: s, ids};
}

/** Take back a personal spend (an Undo). A clock spend is taken back by its caller, which knows if the clock moved since. */
export async function unspend(r) {
  if ( !game.user.isGM || r?.how !== "personal" ) return false;
  for ( const id of r.ids ?? [] ) await setPersonal(id, Math.max(game.time.worldTime, personalTime(id) - (Number(r.seconds) || 0)));
  return true;
}

/** Any client: spend at once on the Storyteller's client, else send it to the queue. Returns {how, seconds}. */
export async function ask({actorId, seconds = 0, label = ""} = {}) {
  const s = SR.cleanSeconds(seconds);
  if ( !s ) return {how: "none", seconds: 0};
  if ( game.user.isGM ) return spend({actorIds: [actorId], seconds: s, label});
  game.socket.emit(SOCKET, {type: "req.time", payload: {userId: game.user.id, actorId, seconds: s, label: String(label).slice(0, 120)}});
  return {how: "asked", seconds: s};
}

/** Active Storyteller: a player's request becomes a proposal. Only for a character the player owns. */
export async function onAsk(payload) {
  if ( !isActiveGM() ) return;
  const user = game.users.get(payload?.userId), actor = game.actors.get(payload?.actorId);
  if ( !user || !actor || !actor.testUserPermission?.(user, "OWNER") ) return;
  const s = SR.cleanSeconds(payload.seconds);
  if ( !s ) return;
  const label = String(payload.label ?? "").slice(0, 120);
  const how = howFor([actor.id]);
  await chron()?.propose?.({type: T_TIME, key: `time:${actor.id}:${game.time.worldTime}:${s}:${label}`,
    title: `${actor.name}: ${SR.spanWords(s)}${label ? ` (${label})` : ""}`,
    detail: how === "personal" ? `${actor.name} is apart from the group, so the time goes on their own time, not the clock.` : "Approving moves the world clock.",
    data: {actorIds: [actor.id], seconds: s, label, userId: user.id}});
}

export function registerTimeApproval() {
  chron()?.registerApprovalHandler?.(T_TIME, {label: "Time for a long action",
    approve: async e => {
      const d = e.data ?? {};
      const r = await spend({actorIds: d.actorIds ?? [], seconds: d.seconds, label: d.label});
      const names = (r.ids ?? []).map(id => game.actors.get(id)?.name).filter(Boolean).join(", ");
      if ( d.userId && r.how !== "none" ) await tell(d.userId, `<p>${esc(SR.noteFor(r, names))}</p>`);
    }});
}

/** The Time row on the Chronicle Clock (Storyteller only): each character's own time against the clock. */
export function clockRow() {
  if ( !game.user.isGM ) return "";
  const world = game.time.worldTime;
  const rows = pcs().map(a => {
    const off = personalTime(a.id) - world;
    const sc = whereIs(a);
    return `<li><b>${esc(a.name)}</b>: ${esc(W.aheadLabel(off))}${sc ? ` <span class="wodx-quiet">(${esc(sceneName(sc))})</span>` : ""}</li>`;
  });
  if ( !rows.length ) return "";
  const apart = rows.length && pcs().some(a => Math.abs(personalTime(a.id) - world) >= 60);
  return `<section class="wodx-time-row"><h3>Time</h3><ul>${rows.join("")}</ul>
    <div class="wodx-buttons"><button type="button" data-wodx-time="convene"${apart ? "" : ` title="Everyone is with the clock"`}><i class="fa-solid fa-people-group"></i> Convene</button></div></section>`;
}
export function bindClockRow(el, conveneDialog) {
  el?.querySelector?.("[data-wodx-time=convene]")?.addEventListener("click", () => conveneDialog?.());
}
