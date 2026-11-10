/**
 * WoDX Storyteller 0.15.0: long tasks over the clock. The rules are in tasks-rules.mjs.
 *
 *   Actor flag wodx-storyteller.tasks {id: task}. A player sets up tasks for a character they own; the Storyteller
 *   can set them up for anyone. When the world clock passes a task's next roll, the active Storyteller's client rolls
 *   it (one roll per interval passed, at most 60 at a time) and posts one card per character to its owners and the
 *   Storyteller, with Undo. Nothing runs on players' clients beyond the window.
 */
import * as R from "./tasks-rules.mjs";
import {MOD, esc, isActiveGM, setting, isPC, chron, log} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const unset = path => { const Del = globalThis.foundry?.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };
let busy = false;

export function registerTaskSettings() {
  game.settings.register(MOD, "longTasks", {name: "Long tasks over the clock", hint: "Extended actions that take days or weeks (making things, research, training, talens, wonders) roll on their own as game time passes.",
    scope: "world", config: true, type: Boolean, default: true});
}

export const rawTasks = a => a?.flags?.[MOD]?.tasks ?? {};
export const tasksOf = a => Object.entries(rawTasks(a)).map(([id, t]) => R.normTask({...t, id}));

/** The character's flat Abilities (name and dots) for the picker. */
export function abilitiesOf(a) {
  const out = [];
  for ( const [k, v] of Object.entries(a?.system?.abilities ?? {}) ) {
    if ( !v || typeof v !== "object" || v.value === undefined ) continue;
    if ( !(num(v.value) > 0 || v.isvisible) ) continue;
    let name = v.altlabel || v.label || k;
    try { name = v.altlabel || game.i18n.localize(v.label || k); } catch (e) { /* the key */ }
    out.push({key: k, name: cap(name), value: num(v.value)});
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

/** Dice for a task: Attribute + Ability from the sheet now, plus any extra dice the task carries. */
export function poolFor(a, task) {
  const t = R.normTask(task);
  const at = a?.system?.attributes?.[t.attr];
  const ab = t.ability ? a?.system?.abilities?.[t.ability] : null;
  return Math.max(1, num(at?.total ?? at?.value) + num(ab?.value) + t.dice);
}

const canEdit = a => !!a && (game.user.isGM || a.isOwner);

export async function saveTask(a, data) {
  if ( !canEdit(a) ) return null;
  const id = data.id && rawTasks(a)[data.id] ? data.id : R.newId(rawTasks(a));
  const old = rawTasks(a)[id];
  const t = R.normTask({...(old ?? {started: now()}), ...data, id});
  if ( !old ) { t.started = now(); t.next = now() + R.INTERVALS[t.interval].s; }
  await a.update({[`flags.${MOD}.tasks.${id}`]: t});
  return t;
}

export async function removeTask(a, id) {
  if ( !canEdit(a) || !rawTasks(a)[id] ) return;
  await a.update(unset(`flags.${MOD}.tasks.${id}`));
}

export async function setPaused(a, id, paused) {
  if ( !canEdit(a) || !rawTasks(a)[id] ) return;
  const t = paused ? R.pauseTask({...rawTasks(a)[id], id}) : R.resumeTask({...rawTasks(a)[id], id}, now());
  await a.update({[`flags.${MOD}.tasks.${id}`]: t});
}

async function rollOnce(dice, diff, specialty) {
  const roll = new Roll(`${Math.max(1, dice)}d10`);
  await roll.evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  return {...R.countFaces(faces, diff, {specialty}), faces};
}

/** The active Storyteller: roll every task that has come due and post one card per character. */
export async function tick({force = false} = {}) {
  if ( busy || !isActiveGM() || !setting("longTasks") || (held() && !force) ) return [];
  busy = true;
  const out = [];
  try {
    const t0 = now();
    for ( const a of game.actors ) {
      const raw = rawTasks(a);
      if ( !Object.keys(raw).length ) continue;
      const before = {}, after = {}, lines = [];
      for ( const task of tasksOf(a) ) {
        let due = Math.min(R.MAX_ROLLS, R.dueRolls(task, t0));
        if ( !due ) continue;
        before[task.id] = raw[task.id];
        let t = task, sum = 0, botches = 0, rolled = 0;
        const dice = poolFor(a, t);
        while ( due-- > 0 && t.status === "open" ) {
          const r = await rollOnce(dice, t.diff, t.specialty);
          t = R.stepTask(t, r, t.next);
          rolled++; sum += r.successes; if ( r.botch ) botches++;
        }
        after[task.id] = t;
        const more = R.dueRolls(t, t0);
        lines.push({id: t.id, name: t.name, status: t.status, rolled, sum, botches, total: t.total, goal: t.goal, dice, diff: t.diff, more});
      }
      if ( !lines.length ) continue;
      await a.update(Object.fromEntries(Object.entries(after).map(([id, t]) => [`flags.${MOD}.tasks.${id}`, t])));
      await postCard(a, lines, before);
      for ( const l of lines ) {
        if ( l.status === "done" || l.status === "ruined" ) await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name,
          attention: l.status === "ruined" ? "A long task was ruined" : null, text: `${a.name}: ${l.name} ${l.status === "done" ? "is finished" : "was ruined by a botch"}.`});
      }
      out.push({actor: a.id, lines});
    }
  } finally { busy = false; }
  return out;
}

function lineHtml(l) {
  const head = `<b>${esc(l.name)}</b> (${l.dice} dice, difficulty ${l.diff}): ${l.rolled} roll${l.rolled === 1 ? "" : "s"}, ${l.sum} success${l.sum === 1 ? "" : "es"}${l.botches ? `, ${l.botches} botch${l.botches === 1 ? "" : "es"}` : ""}.`;
  const tail = l.status === "done" ? " <b>Finished.</b>" : l.status === "ruined" ? " <b>A botch ruined the work.</b>"
    : ` Now ${l.total} of ${l.goal}.${l.botches ? " A botch lost the successes so far." : ""}${l.more ? ` ${l.more} more roll${l.more === 1 ? "" : "s"} wait for the clock.` : ""}`;
  return `<li>${head}${tail}</li>`;
}

async function postCard(a, lines, before) {
  const done = lines.some(l => l.status === "done" || l.status === "ruined");
  await ChatMessage.create({content: `<div class="wodx-card wst-tasks"><h3>${esc(a.name)}: long tasks</h3><ul data-fixed>${lines.map(lineHtml).join("")}</ul>
    <p class="wodx-quiet">An extended action: successes add up roll by roll; a botch loses them, and ruins delicate work (V20 p. 252, V20 Dark Ages p. 324).</p>
    <button type="button" data-action="wst-task-undo">Undo</button></div>`,
    whisper: [...new Set([...gmIds(), ...ownerIds(a)])], speaker: {alias: done ? "A long task ends" : "Long tasks"},
    flags: {[MOD]: {tasks: {actor: a.id, before}}}});
}

export async function undoTick(message) {
  if ( !game.user.isGM ) return;
  const f = message?.flags?.[MOD]?.tasks;
  const a = game.actors.get(f?.actor);
  if ( !a || !f?.before || f.undone ) return;
  await a.update(Object.fromEntries(Object.entries(f.before).map(([id, t]) => [`flags.${MOD}.tasks.${id}`, t])));
  await message.update({[`flags.${MOD}.tasks.undone`]: true, content: message.content.replace(/<button type="button" data-action="wst-task-undo">Undo<\/button>/, "<p><i>Undone.</i></p>")});
}

/* ---------------- The windows ---------------- */

const editableActors = () => game.actors.filter(a => game.user.isGM ? (isPC(a) || Object.keys(rawTasks(a)).length) : a.isOwner);

/** Set up or change one task. */
export async function editTask(actorId = null, taskId = null) {
  const list = editableActors();
  const a = game.actors.get(actorId) ?? (list.length === 1 ? list[0] : null) ?? game.user.character ?? list[0];
  if ( !a ) return ui.notifications.warn("No character to set a task for.");
  if ( !canEdit(a) ) return ui.notifications.warn("Only the character's owner or the Storyteller can set its tasks.");
  let kind = null;
  if ( !taskId ) {
    kind = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: `New long task: ${a.name}`}, classes: ["wodx-dialog", "wst-task-kind"],
      content: "<p>What kind of work is it? The kind fills in a starting pool, difficulty and goal, which you can change.</p>",
      buttons: [...Object.entries(R.KINDS).map(([k, v]) => ({action: k, label: v.label})), {action: "cancel", label: "Cancel"}]});
    if ( !kind || kind === "cancel" ) return null;
  }
  const t = taskId ? R.normTask({...rawTasks(a)[taskId], id: taskId}) : R.normTask({kind});
  const abil = abilitiesOf(a);
  const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
  const kinds = Object.entries(R.KINDS).map(([k, v]) => opt(k, v.label, k === t.kind)).join("");
  const attrs = R.ATTRS.map(k => opt(k, cap(k), k === t.attr)).join("");
  const abils = opt("", "None", !t.ability) + abil.map(x => opt(x.key, `${x.name} (${x.value})`, x.key === t.ability)).join("")
    + (t.ability && !abil.some(x => x.key === t.ability) ? opt(t.ability, `${cap(t.ability)} (not on the sheet)`, true) : "");
  const ints = Object.entries(R.INTERVALS).map(([k, v]) => opt(k, v.label, k === t.interval)).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: `${taskId ? "Change" : "New"} long task: ${a.name}`}, classes: ["wodx-dialog", "wst-task-edit"],
    content: `<div class="form-group"><label>Kind</label><select name="kind" data-fixed>${kinds}</select></div>
      <div class="form-group"><label>What it is</label><input type="text" name="name" value="${esc(taskId ? t.name : "")}" placeholder="A silver reliquary, the parish records, a fetish of the wolf"></div>
      <div class="form-group"><label>Attribute</label><select name="attr" data-fixed>${attrs}</select></div>
      ${abil.length > 5 ? searchBox("select[name=ability]", "Search Abilities…", "Search Abilities") : ""}
      <div class="form-group"><label>Ability</label><select name="ability">${abils}</select></div>
      <div class="form-group"><label>Extra dice</label><input type="number" name="dice" value="${t.dice}" min="0" max="20"></div>
      <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="${t.diff}" min="2" max="10"></div>
      <div class="form-group"><label>Successes needed</label><input type="number" name="goal" value="${t.goal}" min="1" max="100"></div>
      <div class="form-group"><label>One roll</label><select name="interval" data-fixed>${ints}</select></div>
      <div class="form-group"><label>Specialty applies</label><input type="checkbox" name="specialty"${t.specialty ? " checked" : ""}></div>
      <div class="form-group"><label>Delicate (a botch ruins it)</label><input type="checkbox" name="delicate"${t.delicate ? " checked" : ""}></div>
      <div class="form-group"><label>Note</label><input type="text" name="note" value="${esc(t.note)}"></div>
      <p class="hint">${esc(R.KINDS[t.kind].ref)} The Storyteller sets the pool, the difficulty, the goal and the time for each roll${R.KINDS[t.kind].house ? "; this kind's starting point is a house rule" : ""}. The first roll comes one interval after the task starts.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return null;
  return saveTask(a, {id: taskId, kind: res.kind, name: res.name, attr: res.attr, ability: res.ability, dice: num(res.dice),
    diff: num(res.diff), goal: num(res.goal), interval: res.interval, specialty: !!res.specialty, delicate: !!res.delicate, note: res.note});
}

/** Every task the user can see, with Pause, Change and Remove. */
export async function tasksDialog() {
  const list = editableActors();
  const rows = [];
  for ( const a of list ) for ( const t of tasksOf(a) ) {
    const h = Math.max(0, Math.ceil((t.next - now()) / R.HOUR));
    const when = t.status === "open" ? `next roll in ${h > 48 ? `${Math.ceil(h / 24)} days` : `${h} h`}` : t.status;
    rows.push(`<tr><td>${esc(a.name)}</td><td>${esc(t.name)}<br><small>${poolFor(a, t)} dice, difficulty ${t.diff}, ${esc(R.INTERVALS[t.interval].label.toLowerCase())}</small></td><td>${t.total} / ${t.goal}<br><small>${esc(when)}</small></td>
      <td><button type="button" data-wst-task="edit" data-actor="${a.id}" data-id="${t.id}">Change</button>
      ${t.status === "open" || t.status === "paused" ? `<button type="button" data-wst-task="${t.status === "open" ? "pause" : "resume"}" data-actor="${a.id}" data-id="${t.id}">${t.status === "open" ? "Pause" : "Resume"}</button>` : ""}
      <button type="button" data-wst-task="remove" data-actor="${a.id}" data-id="${t.id}">Remove</button></td></tr>`);
  }
  const wire = (ev, dlg) => {
    const root = dlg?.element ?? ev?.target?.element;
    for ( const b of root?.querySelectorAll?.("[data-wst-task]") ?? [] ) b.addEventListener("click", async () => {
      const a = game.actors.get(b.dataset.actor), id = b.dataset.id, act = b.dataset.wstTask;
      dlg?.close?.();
      if ( act === "edit" ) await editTask(a?.id, id);
      else if ( act === "pause" || act === "resume" ) await setPaused(a, id, act === "pause");
      else if ( act === "remove" ) await removeTask(a, id);
      tasksDialog();
    });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 680}, window: {title: "Long tasks"}, classes: ["wodx-dialog", "wst-tasks-dlg"],
      content: `<p>Work that takes days or weeks of game time. Each roll is made when the clock passes it, and the result comes to the character's owner and the Storyteller.</p>
        ${rows.length > 5 ? searchBox("table.wst-tasks-t", "Search tasks…", "Search tasks") : ""}<div class="wst-scroll"><table class="wst-tasks-t"><thead><tr><th>Character</th><th>Task</th><th>Successes</th><th></th></tr></thead><tbody>${rows.join("") || "<tr><td colspan='4'>No long tasks yet.</td></tr>"}</tbody></table></div>`,
      buttons: [{action: "new", label: "New task", default: true}, ...(game.user.isGM ? [{action: "roll", label: "Roll what is due"}] : []), {action: "close", label: "Close"}]});
  if ( res === "new" ) { await editTask(); return tasksDialog(); }
  if ( res === "roll" ) { const r = await tick({force: true}); if ( !r.length ) ui.notifications.info("No long task is due."); }
}

export function registerTaskHooks() {
  Hooks.on("wodxSkipEnd", () => { tick().catch(e => console.error(`${MOD} | tasks`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } tick().catch(e => console.error(`${MOD} | tasks`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !game.user.isGM || !html || !message.flags?.[MOD]?.tasks ) return;
    html.querySelector?.("[data-action=wst-task-undo]")?.addEventListener("click", () => undoTick(message));
  });
}
