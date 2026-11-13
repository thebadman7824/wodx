/**
 * WoDX Storyteller 0.15.0: long tasks over the clock. The rules are in tasks-rules.mjs.
 *
 *   Actor flag wodx-storyteller.tasks {id: task}. A player sets up tasks for a character they own; the Storyteller
 *   can set them up for anyone. When the world clock passes a task's next roll, the active Storyteller's client rolls
 *   it (one roll per interval passed, at most 60 at a time) and posts one card per character to its owners and the
 *   Storyteller, with Undo. Nothing runs on players' clients beyond the window.
 */
import * as R from "./tasks-rules.mjs";
import * as P from "./projects-rules.mjs";
import {MOD, esc, isActiveGM, setting, isPC, chron, log, npc} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import * as Own from "./owners.mjs";
import * as Cook from "./cookery.mjs";

const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
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
  // 0.27.0: a faction's building rolls its Resources + Retainers; workers add a die each
  if ( t.faction ) return Math.max(1, Own.factionPool(t.faction) + t.workers + t.dice);
  // 0.42.0: followers helping add their own dots in the Ability
  const help = R.helperDice(t.helpers.map(id => game.actors?.get?.(id)).filter(Boolean).map(h => ({dots: t.ability ? num(h.system?.abilities?.[t.ability]?.value) : 0})));
  return Math.max(1, num(at?.total ?? at?.value) + num(ab?.value) + t.dice + t.workers + help);
}

/** B3341: a character's weekly budget of nights for projects; the Storyteller can set their own figure (flag projectBudget). */
export const budgetOf = a => P.budgetFor({kind: a?.type, own: a?.flags?.[MOD]?.projectBudget ?? null});

/** B3342: tell the Storyteller of a complication, keep it on the project and on the log. */
async function trouble(a, t, c) {
  await ChatMessage.create({content: `<div class="wodx-card wst-trouble"><h3>${esc(a.name)}: ${esc(t.name)}</h3><p>${esc(c.text)}</p>
    <p class="wodx-quiet">${c.botch ? "The roll was a botch. " : ""}A complication in a downtime project: what comes of it is the Storyteller's.</p></div>`,
    whisper: gmIds(), speaker: {alias: "A project meets trouble"}});
  await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name, attention: "A project met trouble", text: `${a.name}: ${t.name}. ${c.text}`});
  Hooks.callAll("wodxProjectComplication", {actor: a, task: t, complication: c});
}

/** B3343: a courting project moves warmth through WoDX NPC, which keeps the age floor. */
async function courtRoll(a, t, r) {
  const ev = P.courtEvent(r);
  if ( !ev || !t.target?.id ) return null;
  try { return await npc()?.hearts?.court?.(a, t.target.id, ev, {successes: r.successes, botch: r.botch, why: t.name}); }
  catch (e) { console.error(`${MOD} | courting`, e); return null; }
}

const canEdit = a => !!a && (game.user.isGM || a.isOwner);

export async function saveTask(a, data) {
  if ( !canEdit(a) ) return null;
  const id = data.id && rawTasks(a)[data.id] ? data.id : R.newId(rawTasks(a));
  const old = rawTasks(a)[id];
  const t = R.normTask({...(old ?? {started: now()}), ...data, id});
  if ( !old ) { t.started = now(); t.next = now() + R.intervalS(t); }
  // B3357: a new climb needs the successes for the rank it climbs to
  if ( !old && t.kind === "climb" && t.institution ) {
    try { const I = game.modules.get(MOD).api.institutions; const inst = I.byId(t.institution); const b = inst ? I.rules.bestSeat(inst, t.target?.id || a.id) : null; t.goal = I.rules.climbGoal(b ? b.rank + 1 : 0); } catch (e) { /* institutions off */ }
  }
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
      const before = {}, after = {}, lines = [], built = [];
      const pursePrev = a.flags?.[MOD]?.money?.purse ? foundry.utils.deepClone(a.flags[MOD].money.purse) : null;
      let paidAny = false;
      // B3341: projects past the weekly budget pause, newest first
      const over = new Set(P.overBudget(tasksOf(a), budgetOf(a)));
      for ( const task of tasksOf(a) ) {
        if ( over.has(task.id) && R.dueRolls(task, t0) ) {
          const why = `no nights free: ${P.nightsGiven(tasksOf(a))} a week given, ${budgetOf(a)} to give`;
          before[task.id] = raw[task.id];
          after[task.id] = {...R.pauseTask(task), waits: why};
          lines.push({id: task.id, name: task.name, status: "paused", rolled: 0, sum: 0, botches: 0, total: task.total, goal: task.goal, dice: 0, diff: task.diff, more: 0, waits: why});
          continue;
        }
        let due = Math.min(R.MAX_ROLLS, R.dueRolls(task, t0));
        if ( !due ) continue;
        before[task.id] = raw[task.id];
        // 0.20.0: a recipe waits while its materials or workshop are missing
        const rc = R.recipeCheck(task, {year: yearNow(), carried: [...(a.items ?? [])].map(i => i.name)});
        if ( !rc.ok ) {
          after[task.id] = {...R.pauseTask(task), waits: rc.why};
          lines.push({id: task.id, name: task.name, status: "paused", rolled: 0, sum: 0, botches: 0, total: task.total, goal: task.goal, dice: 0, diff: task.diff, more: 0, waits: rc.why});
          continue;
        }
        let t = task, sum = 0, botches = 0, rolled = 0, waits = "";
        // 0.27.0: a building's stage is paid for as it starts; without the money the work waits
        const payNow = async () => {
          if ( t.kind !== "build" || !t.stages.length || t.paidStage >= t.stage ) return true;
          const p = await Own.payStage(a, t);
          if ( !p.ok ) { waits = p.why; t = {...R.pauseTask(t), waits: p.why}; return false; }
          if ( p.paid ) paidAny = true;
          t = {...t, paidStage: t.stage};
          return true;
        };
        const dice = poolFor(a, t);
        if ( await payNow() ) while ( due-- > 0 && t.status === "open" ) {
          const r = await rollOnce(dice, t.diff, t.specialty);
          const at = t.next;
          t = R.stepTask(t, r, at);
          // B3342, B3343: trouble, and a courting roll's warmth
          const c = P.drawTrouble(t, r, {year: yearNow()});
          if ( c ) { t = {...t, complications: P.addTrouble(t.complications, c, at)}; await trouble(a, t, c); }
          if ( t.kind === "court" ) await courtRoll(a, t, r);
          // 0.31.0: a botch in a drug or a medicine leaves it impure instead of ruining it; only the Storyteller hears
          if ( r.botch && t.strength ) t = {...t, impure: true};
          rolled++; sum += r.successes; if ( r.botch ) botches++;
          if ( !(await payNow()) ) break;
        }
        if ( t.status === "done" && t.kind === "build" && !t.made ) {
          try { const made = await Own.finishBuild(a, t); built.push({task: t.id, ...made}); t = {...t, made: true, place: made.region ?? made.scene ?? ""}; }
          catch (e) { console.error(`${MOD} | building`, e); }
        }
        if ( t.status === "done" && t.recipe && !t.made ) {
          try { await Cook.finishRecipe(a, t); t = {...t, made: true, quality: Cook.qualityOf(t)}; }
          catch (e) { console.error(`${MOD} | recipe`, e); }
        }
        if ( t.status === "done" && t.teaches && !t.made ) {
          try { await Cook.teach(a, t.teaches); t = {...t, made: true}; }
          catch (e) { console.error(`${MOD} | teach`, e); }
        }
        if ( t.status === "done" && t.makes && !t.made ) {
          try {
            const base = game.items?.getName?.(t.makes);
            const data = base ? base.toObject() : {name: t.makes, type: "Item"};
            delete data._id;
            // 0.27.0: a recipe's quality and its maker as owner
            const q = t.good ? Own.finishCraft(t) : null;
            if ( q && q.quality !== "plain" ) data.name = `${data.name} (${q.label.toLowerCase()})`;
            data.flags = {...(data.flags ?? {}), [MOD]: {...(data.flags?.[MOD] ?? {}), madeBy: t.id, maker: a.name, owner: Own.recordFor(a), ...(q ? q.flags : {})}};
            if ( q ) t = {...t, quality: q.quality};
            await a.createEmbeddedDocuments("Item", [data]);
            t = {...t, made: true};
          } catch (e) { console.error(`${MOD} | made item`, e); }
        }
        after[task.id] = t;
        const more = R.dueRolls(t, t0);
        lines.push({id: t.id, name: t.name, status: t.status, rolled, sum, botches, total: t.total, goal: t.goal, dice, diff: t.diff, more, waits,
          stage: t.stages.length ? `${t.stages[t.stage]?.name ?? ""} (stage ${t.stage + 1} of ${t.stages.length})` : "", quality: t.quality});
      }
      if ( !lines.length ) continue;
      await a.update(Object.fromEntries(Object.entries(after).map(([id, t]) => [`flags.${MOD}.tasks.${id}`, t])));
      // 0.42.0: a task that has just ended, for WoDX NPC's errands
      for ( const [id, t] of Object.entries(after) ) if ( ["done", "ruined"].includes(t.status) && !["done", "ruined"].includes(before[id]?.status) ) Hooks.callAll("wodxTaskDone", {actor: a, task: t});
      await postCard(a, lines, before, {built, purse: paidAny ? pursePrev : undefined});
      for ( const l of lines ) {
        // B3343: what a finished project leaves, for the Storyteller to award
        if ( l.status === "done" && after[l.id]?.nights ) {
          const o = P.outcomeOf(after[l.id], after[l.id].target?.name ?? "");
          await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name, attention: o.background ? `A dot of ${o.background} to award` : null, text: `${a.name}: ${l.name}. ${o.text}`});
        }
        if ( l.status === "done" || l.status === "ruined" ) await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name,
          attention: l.status === "ruined" ? "A long task was ruined" : null, text: `${a.name}: ${l.name} ${l.status === "done" ? "is finished" : "was ruined by a botch"}.`});
      }
      out.push({actor: a.id, lines});
    }
  } finally { busy = false; }
  return out;
}

function lineHtml(l) {
  if ( l.waits && !l.rolled ) return `<li><b>${esc(l.name)}</b> waits: ${esc(l.waits)}. It is paused; resume it in Long tasks when that is put right.</li>`;
  const head = `<b>${esc(l.name)}</b> (${l.dice} dice, difficulty ${l.diff}): ${l.rolled} roll${l.rolled === 1 ? "" : "s"}, ${l.sum} success${l.sum === 1 ? "" : "es"}${l.botches ? `, ${l.botches} botch${l.botches === 1 ? "" : "es"}` : ""}.`;
  const tail = l.waits ? ` Now ${l.total} of ${l.goal}${l.stage ? ` on the ${esc(l.stage.toLowerCase())}` : ""}. It waits: ${esc(l.waits)}.`
    : l.status === "done" ? ` <b>Finished${l.quality && l.quality !== "plain" ? `: ${esc(l.quality === "master" ? "a masterwork" : `${l.quality} work`)}` : ""}.</b>` : l.status === "ruined" ? " <b>A botch ruined the work.</b>"
    : ` Now ${l.total} of ${l.goal}${l.stage ? ` on the ${esc(l.stage.toLowerCase())}` : ""}.${l.botches ? " A botch lost the successes so far." : ""}${l.more ? ` ${l.more} more roll${l.more === 1 ? "" : "s"} wait for the clock.` : ""}`;
  return `<li>${head}${tail}</li>`;
}

async function postCard(a, lines, before, {built = [], purse} = {}) {
  const done = lines.some(l => l.status === "done" || l.status === "ruined");
  await ChatMessage.create({content: `<div class="wodx-card wst-tasks"><h3>${esc(a.name)}: long tasks</h3><ul data-fixed>${lines.map(lineHtml).join("")}</ul>
    <p class="wodx-quiet">An extended action: successes add up roll by roll; a botch loses them, and ruins delicate work (V20 p. 252, V20 Dark Ages p. 324).</p>
    <button type="button" data-action="wst-task-undo">Undo</button></div>`,
    whisper: [...new Set([...gmIds(), ...ownerIds(a)])], speaker: {alias: done ? "A long task ends" : "Long tasks"},
    flags: {[MOD]: {tasks: {actor: a.id, before, built, ...(purse !== undefined ? {purse} : {})}}}});
}

export async function undoTick(message) {
  if ( !game.user.isGM ) return;
  const f = message?.flags?.[MOD]?.tasks;
  const a = game.actors.get(f?.actor);
  if ( !a || !f?.before || f.undone ) return;
  await a.update(Object.fromEntries(Object.entries(f.before).map(([id, t]) => [`flags.${MOD}.tasks.${id}`, t])));
  // 0.20.0: what a finished recipe made goes again
  const made = [...(a.items ?? [])].filter(i => i.flags?.[MOD]?.madeBy && f.before[i.flags[MOD].madeBy] && !f.before[i.flags[MOD].madeBy].made).map(i => i.id);
  if ( made.length ) await a.deleteEmbeddedDocuments("Item", made);
  // 0.27.0: a building's place goes again, and what its stages cost comes back
  if ( f.built?.length ) for ( const b of f.built ) await Own.unbuild(b);
  if ( f.purse !== undefined && f.purse !== null ) await a.update({[`flags.${MOD}.money.purse`]: f.purse});
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
  // B3340: who a courting or tracking project is aimed at (people the user can see)
  const people = game.actors.filter(x => x.id !== a.id && (game.user.isGM || x.testUserPermission?.(game.user, "LIMITED"))).sort((x, y) => x.name.localeCompare(y.name));
  const targets = opt("", "Nobody", !t.target) + people.map(x => opt(x.id, x.name, x.id === t.target?.id)).join("");
  const wk = Number(R.KINDS[t.kind].week) || 0;
  // B3357: the institutions to climb
  let insts = [];
  try { insts = (game.modules.get(MOD)?.api?.institutions?.state?.()?.list ?? []).filter(i => !i.closed); } catch (e) { insts = []; }
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
      <div class="form-group"><label>Nights a week</label><input type="number" name="nights" value="${t.nights}" min="0" max="7"></div>
      <p class="hint">Out of ${budgetOf(a)} a week for every project together; 0 leaves it out of the budget.${wk ? ` This kind goes at full pace with ${wk}; fewer stretch each roll.` : ""}</p>
      ${people.length > 5 ? searchBox("select[name=target]", "Search people…", "Search people") : ""}
      <div class="form-group"><label>Aimed at</label><select name="target">${targets}</select></div>
      ${insts.length ? `<div class="form-group"><label>Institution (to climb)</label><select name="institution"><option value="">None</option>${insts.map(i => opt(i.id, i.name, i.id === t.institution)).join("")}</select></div>` : ""}
      ${game.user.isGM ? `<div class="form-group"><label>Complications</label><input type="checkbox" name="trouble"${t.trouble ? " checked" : ""}></div>` : ""}
      <div class="form-group"><label>Specialty applies</label><input type="checkbox" name="specialty"${t.specialty ? " checked" : ""}></div>
      <div class="form-group"><label>Delicate (a botch ruins it)</label><input type="checkbox" name="delicate"${t.delicate ? " checked" : ""}></div>
      <div class="form-group"><label>Note</label><input type="text" name="note" value="${esc(t.note)}"></div>
      <div class="form-group"><label>Needs (carried)</label><input type="text" name="needs" value="${esc(t.needs)}" placeholder="silver; a mould; charcoal"></div>
      <div class="form-group"><label>Where</label><select name="workshop" data-fixed>${Object.entries(R.WORKSHOPS).map(([k, v]) => opt(k, v.from ? `${v.label} (from about ${v.from})` : v.label, k === t.workshop)).join("")}</select></div>
      <div class="form-group"><label>Makes</label><input type="text" name="makes" value="${esc(t.makes)}" placeholder="A silver reliquary (an item, or just its name)"></div>
      <p class="hint">${esc(R.KINDS[t.kind].ref)} The Storyteller sets the pool, the difficulty, the goal and the time for each roll${R.KINDS[t.kind].house ? "; this kind's starting point is a house rule" : ""}. The first roll comes one interval after the task starts.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return null;
  return saveTask(a, {id: taskId, kind: res.kind, name: res.name, attr: res.attr, ability: res.ability, dice: num(res.dice),
    diff: num(res.diff), goal: num(res.goal), interval: res.interval, specialty: !!res.specialty, delicate: !!res.delicate, note: res.note,
    needs: res.needs ?? "", workshop: res.workshop ?? "", makes: res.makes ?? "", waits: "",
    nights: num(res.nights), institution: res.institution ?? "", target: res.target ? {id: res.target, name: game.actors.get(res.target)?.name ?? ""} : null,
    ...(game.user.isGM ? {trouble: !!res.trouble} : {})});
}

/** Every task the user can see, with Pause, Change and Remove. */
export async function tasksDialog() {
  const list = editableActors();
  const rows = [], budgets = [];
  for ( const a of list ) {
    const ts = tasksOf(a);
    if ( ts.some(t => t.nights > 0) ) budgets.push(`<li>${esc(P.budgetLine(a.name, P.nightsGiven(ts), budgetOf(a)))}</li>`);
  }
  for ( const a of list ) for ( const t of tasksOf(a) ) {
    const h = Math.max(0, Math.ceil((t.next - now()) / R.HOUR));
    const when = t.status === "open" ? `next roll in ${h > 48 ? `${Math.ceil(h / 24)} days` : `${h} h`}` : t.status;
    // B3340: nights given, who it is aimed at, and the last complication
    const extra = [t.nights ? `${t.nights} night${t.nights === 1 ? "" : "s"} a week` : "", t.target?.name ? `aimed at ${t.target.name}` : "", t.waits ? `waits: ${t.waits}` : ""].filter(Boolean).join("; ");
    const last = t.complications.at(-1);
    rows.push(`<tr><td>${esc(a.name)}</td><td>${esc(t.name)}<br><small>${poolFor(a, t)} dice, difficulty ${t.diff}, ${esc(R.INTERVALS[t.interval].label.toLowerCase())}${extra ? `; ${esc(extra)}` : ""}</small>${last && game.user.isGM ? `<br><small><i>Trouble: ${esc(last.text)}</i></small>` : ""}</td><td>${t.total} / ${t.goal}<br><small>${esc(when)}</small></td>
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
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 680}, window: {title: "Downtime and long tasks"}, classes: ["wodx-dialog", "wst-tasks-dlg"],
      content: `<p>Downtime projects and other work that takes days or weeks of game time. Each roll is made when the clock passes it, and the result comes to the character's owner and the Storyteller. A project can run into trouble on the way.</p>
        ${budgets.length ? `<ul class="wst-budgets" data-fixed>${budgets.join("")}</ul>` : ""}
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
