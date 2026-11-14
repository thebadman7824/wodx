/**
 * WoDX Storyteller: making the supernatural items of each line (B3630-B3636, B3683). Each line's table and rules are
 * a kit in WoDX Library's registry (api.wonders.lines(), scripts/wonder-registry.mjs); the work runs as a long task
 * (tasks.mjs). One picker lists every line an actor can make things in; the finished task pays the kit's costs, makes
 * its items and runs its after() hook.
 *
 *   Pick a fetish or talen from the book list. WoDX checks the maker has the rite and the Rituals, works out the
 *   difficulty (Gnosis spent, persuasion, the spirit court's regard), and sets up the task: three nights of cleansing,
 *   then one roll. A player's task waits paused for the Storyteller's go-ahead on an approval card (Ben's desk, g3).
 *   When it ends (hook wodxTaskDone) the Gnosis spent is paid, and a success makes the real items: a Fetish item the
 *   WoDX Actions fetish window can attune and wake, a weapon beside a war fetish, or one talen a success. A botch
 *   loses the vessel and sours the spirit's court.
 */
import {MOD, esc, isActiveGM, chron, log, isPC} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const T_WONDER = `${MOD}.wonder`;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const W = () => game.modules.get("wodx-library")?.active ? game.modules.get("wodx-library")?.api?.wonders ?? null : null;
const spirits = () => game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds")?.api?.spirits ?? null : null;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const tasks = () => import("./tasks.mjs");

/** Plain facts every kit may want: the profile, gender for rules, and the world settings a kit names. */
function ctxFor(a) {
  let profile = "mortal";
  try { profile = game.wodx?.profiles?.detectProfile?.(a) ?? profile; } catch (e) { /* Actions off */ }
  let gender = "";
  try { gender = game.modules.get("wodx-chronicle")?.api?.gender?.forRules?.(a) ?? ""; } catch (e) { gender = ""; }
  const settings = {};
  for ( const k of ["craftKinfolk", ...(W()?.lines?.() ?? []).flatMap(x => x.settingsRead ?? [])] ) settings[k] = W()?.settingOf?.(k);
  return {profile, gender, year: yearNow(), settings};
}
export const plain = a => ({system: a?.system ?? {}, flags: a?.flags ?? {}, name: a?.name ?? "", type: a?.type ?? "",
  items: [...(a?.items ?? [])].map(i => ({id: i.id, type: i.type, name: i.name, system: i.system ?? {}, flags: i.flags ?? {}}))});

/** The lines this actor can make things in: [{kit, maker, rows}] (B3683). */
export function linesFor(a) {
  const api = W();
  if ( !api?.lines || !a ) return [];
  const ctx = ctxFor(a), data = plain(a);
  return api.lines().filter(k => api.enabled(k.line)).map(kit => {
    let maker = null;
    try { maker = kit.makerOf(kit.factsFrom(data, ctx)); } catch (e) { console.warn(`${MOD} | wonders ${kit.line}`, e); }
    const rows = maker?.kind ? kit.listFor(maker, {year: ctx.year}) : [];
    return {kit, maker, rows};
  }).filter(x => x.rows.length);
}

/** What the Garou rules know about a maker (kept for callers of api.wonders.maker). */
export function makerFacts(a) {
  const kit = W()?.kitFor?.("garou");
  return kit ? kit.factsFrom(plain(a), ctxFor(a)) : {};
}

/** True when this character can make something in any line whose switch is on. */
export function available(a) { return linesFor(a).length > 0; }

function fieldHtml(line, f) {
  const id = `wst-wonder-${line}-${f.name}`, name = `${line}.${f.name}`;
  const hint = f.hint ? `<p class="hint">${esc(f.hint)}</p>` : "";
  if ( f.type === "checkbox" ) return `<div class="form-group"><label for="${id}">${esc(f.label)}</label><input id="${id}" type="checkbox" name="${esc(name)}"${f.value ? " checked" : ""}></div>${hint}`;
  if ( f.type === "select" ) return `<div class="form-group"><label for="${id}">${esc(f.label)}</label><select id="${id}" name="${esc(name)}" data-fixed>${(f.options ?? []).map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(f.value) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div>${hint}`;
  return `<div class="form-group"><label for="${id}">${esc(f.label)}</label><input id="${id}" type="number" name="${esc(name)}" value="${num(f.value)}"${f.min !== undefined ? ` min="${num(f.min)}"` : ""}${f.max !== undefined ? ` max="${num(f.max)}"` : ""}></div>${hint}`;
}
const optsOf = (line, fields, form) => Object.fromEntries(fields.map(f => {
  const el = form?.querySelector?.(`[name="${line}.${f.name}"]`);
  return [f.name, f.type === "checkbox" ? !!el?.checked : f.type === "number" ? num(el?.value) : String(el?.value ?? f.value ?? "")];
}));

/** The pick-and-start window: every line this actor can make things in, the inputs its kit asks for. */
export async function makeDialog(actorId) {
  const api = W(), a = game.actors.get(actorId);
  if ( !api || !a ) return ui.notifications.warn("Making supernatural items needs WoDX Library.");
  const found = linesFor(a);
  if ( !found.length ) return ui.notifications.warn(`${a.name} cannot make anything here, or making is switched off in this world.`);
  const isGM = game.user.isGM, sp = spirits();
  const opt = (v, l) => `<option value="${esc(v)}">${esc(l)}</option>`;
  const groups = found.flatMap(({kit, rows}) => (kit.groups?.(rows) ?? [{label: kit.title, rows}]).filter(g => g.rows.length)
    .map(g => `<optgroup label="${esc(found.length > 1 ? `${kit.title}: ${g.label}` : g.label)}">${g.rows.map(w => opt(`${kit.line}:${w.key}`, kit.label(w))).join("")}</optgroup>`)).join("");
  const fieldsBy = Object.fromEntries(found.map(({kit, maker}) => [kit.line, kit.fields(maker, {isGM}).filter(f => isGM || !f.gm)]));
  const content = `<p><b>${esc(a.name)}</b>${found.map(({kit, maker}) => kit.intro ? `: ${esc(kit.intro(maker))}` : "").join(" ")}</p>
    ${searchBox("select[name=wonder]", "Find something to make…", "Search what can be made")}
    <div class="form-group"><label for="wst-wonder">Make</label><select id="wst-wonder" name="wonder">${groups}</select></div>
    ${found.map(({kit}) => `<fieldset class="wst-wonder-fields" data-line="${esc(kit.line)}"><legend>${esc(kit.title)}</legend>${fieldsBy[kit.line].map(f => fieldHtml(kit.line, f)).join("")}</fieldset>`).join("")}
    <div class="wst-wonder-about wodx-quiet" aria-live="polite"></div>
    <p class="hint">${found.map(({kit}) => esc(kit.ref ?? "")).filter(Boolean).join(" ")}${isGM ? "" : " The Storyteller says whether the work can start."}</p>`;
  const about = root => {
    const [line, key] = String(root.querySelector("select[name=wonder]")?.value ?? "").split(":");
    const got = found.find(x => x.kit.line === line), w = got?.kit.row(key), box = root.querySelector(".wst-wonder-about");
    for ( const fs of root.querySelectorAll(".wst-wonder-fields") ) fs.hidden = fs.dataset.line !== line;
    if ( !w || !box ) return;
    const court = got.kit.courtOf?.(w), ce = court ? (sp?.effect?.(a, court) ?? {note: ""}) : {note: ""};
    const bl = got.kit.blockers(w, got.maker, optsOf(line, fieldsBy[line], root));
    box.innerHTML = `<p>${esc(w.does)}</p>${w.spirit ? `<p>Spirit: ${esc(w.spirit)}.${ce.note ? ` ${esc(ce.note)}` : ""}</p>` : ""}${got.kit.cautions(w, got.maker).map(c => `<p>${esc(c)}</p>`).join("")}${bl.length ? `<p><b>Cannot yet:</b> ${esc(bl.join("; "))}.</p>` : ""}<p>${esc(w.book)}${w.pdf ? `, pdf ${w.pdf}` : ""}.</p>`;
  };
  let picked = null;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 560}, window: {title: `Make something: ${a.name}`}, classes: ["wodx-dialog", "wst-wonder"],
    content, render: (ev, dlg) => { const root = dlg?.element ?? ev?.target?.element; if ( !root ) return; for ( const el of root.querySelectorAll("select, input") ) el.addEventListener("change", () => about(root)); about(root); },
    buttons: [{action: "go", label: isGM ? "Start the work" : "Ask the Storyteller", default: true, callback: (ev, b) => {
      const [line, key] = String(b.form.elements.wonder?.value ?? "").split(":");
      picked = {line, key, opts: optsOf(line, fieldsBy[line] ?? [], b.form)};
      return "go";
    }}, {action: "cancel", label: "Cancel"}]});
  if ( res !== "go" || !picked ) return null;
  return start(a, picked.key, {...picked.opts, line: picked.line});
}

/** Set up the task. A player's waits paused for the Storyteller's go-ahead. opts.line picks the kit (default garou). */
export async function start(a, key, opts = {}) {
  const api = W(), line = opts.line || "garou";
  const got = linesFor(a).find(x => x.kit.line === line);
  const kit = got?.kit ?? api?.kitFor?.(line), w = kit?.row?.(key);
  if ( !api || !kit || !w || !a ) return null;
  const m = got?.maker ?? kit.makerOf(kit.factsFrom(plain(a), ctxFor(a)));
  const bl = kit.blockers(w, m, opts);
  if ( bl.length ) { ui.notifications.warn(`${a.name} cannot make the ${w.name}: ${bl.join("; ")}.`); return null; }
  const courtKey = kit.courtOf?.(w), ce = courtKey ? spirits()?.effect?.(a, courtKey) : null;
  if ( ce?.refuses ) ui.notifications.warn(`The ${courtKey} court scorns ${a.name}: the spirit may refuse outright.`);
  const seed = kit.taskFor(w, m, {...opts, persuasion: game.user.isGM ? num(opts.persuasion) : 0, court: num(ce?.diff)});
  const ask = !game.user.isGM;
  const T = await tasks();
  const t = await T.saveTask(a, {...seed, wonder: w.key, line, approved: !ask, ...(ask ? {status: "paused", waits: `the Storyteller's go-ahead (${kit.approvalText ?? "can the work start?"})`} : {})});
  if ( !t ) return null;
  if ( ask ) await chron()?.approvals?.propose?.({type: T_WONDER, key: `wonder.${a.id}.${t.id}`, title: `${a.name}: ${t.name}`,
    detail: `${w.does} ${kit.detail?.(w, t, m) ?? `Difficulty ${t.diff}.`} ${kit.cautions(w, m).join(" ")}`.trim(),
    data: {actorId: a.id, taskId: t.id}});
  else ui.notifications.info(`${a.name}: ${t.name} is set up${t.delay ? `; the roll comes after ${t.delay} days of preparation` : ""}.`);
  return t;
}

async function approve(entry) {
  const a = game.actors.get(entry?.data?.actorId), id = entry?.data?.taskId;
  const T = await tasks();
  const raw = T.rawTasks(a)?.[id];
  if ( !a || !raw ) return;
  const now = game.time?.worldTime ?? 0;
  await a.update({[`flags.${MOD}.tasks.${id}`]: {...raw, approved: true, status: "open", waits: "", next: now + (num(raw.delay) || 0) * 86400 + 86400}});
  await tell(a, `The Storyteller agrees: ${raw.name} begins${num(raw.delay) ? ` with ${raw.delay} days of preparation` : ""}.`);
}
async function reject(entry) {
  const a = game.actors.get(entry?.data?.actorId), id = entry?.data?.taskId;
  const T = await tasks();
  const raw = T.rawTasks(a)?.[id];
  if ( !a || !raw ) return;
  await T.removeTask(a, id);
  await tell(a, `The Storyteller says no to ${raw.name}: the work cannot start now.`);
}
async function tell(a, text) {
  await ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: [...ownerIds(a), ...gmIds()], content: `<div class="wodx-card wst-wonder-card"><p>${esc(text)}</p></div>`});
}

export function registerWonderApproval() {
  chron()?.approvals?.registerHandler?.(T_WONDER, {label: "A supernatural item to make", approve, reject});
}

/** The work is over: pay the kit's costs, then make the items or note the botch. Runs on the active Storyteller's client. */
async function finished({actor: a, task: t} = {}) {
  if ( !isActiveGM() || !a || !t?.wonder || t.made ) return;
  const api = W(), kit = api?.kitFor?.(t.line || "garou"), w = kit?.row?.(t.wonder);
  if ( !api || !kit || !w ) return;
  const facts = kit.factsFrom(plain(a), ctxFor(a));
  const costs = kit.costs(w, t, facts) ?? [];
  const paths = [...new Set(costs.flatMap(c => [c.path, c.cap]).filter(Boolean))];
  const values = Object.fromEntries(paths.map(p => [p, num(foundry.utils.getProperty(a, p))]));
  const paid = api.applyCosts(costs, values);
  if ( Object.keys(paid.updates).length ) await a.update(paid.updates);
  const lines = [...paid.lines];
  if ( t.status === "done" ) {
    const data = kit.itemsFor(w, {successes: Math.max(1, t.total), maker: a.name, at: game.time?.worldTime ?? 0, task: t});
    const made = data.length ? await a.createEmbeddedDocuments("Item", data) : [];
    // B3697: a kit that marked an object the actor holds makes nothing new, and says so in after()
    if ( made.length || !kit.marks?.(w, t) ) lines.push(made.length ? `Made: ${made.map(i => i.name).join(", ")}.` : "Nothing came of it.");
  }
  try { lines.push(...((await kit.after?.({row: w, task: t, status: t.status, services: {actor: a, spirits: spirits()}})) ?? [])); } catch (e) { console.warn(`${MOD} | wonders after`, e); }
  const T = await tasks();
  const raw = T.rawTasks(a)?.[t.id];
  if ( raw ) await a.update({[`flags.${MOD}.tasks.${t.id}.made`]: true});
  await ChatMessage.create({speaker: {alias: w.name}, whisper: [...ownerIds(a), ...gmIds()],
    content: `<div class="wodx-card wst-wonder-card"><h3>${esc(a.name)}: ${esc(t.name)}</h3><ul data-fixed>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>`});
  await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name, text: `${a.name}: ${t.name}. ${lines.join(" ")}`});
}

export function registerWonderHooks() {
  Hooks.on("wodxTaskDone", e => { finished(e).catch(err => console.error(`${MOD} | wonders`, err)); });
}

export const wondersApi = () => ({open: makeDialog, start, available, maker: makerFacts, linesFor});
