/**
 * WoDX Storyteller: making the supernatural items of each line (B3630-B3636). The table and the rules are WoDX
 * Library's (api.wonders, scripts/wonder-rules.mjs); the work runs as a long task (tasks.mjs).
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

/** The Rituals dots on a sheet: the system's ability, or an Ability item of that name. */
function ritualsOf(a) {
  const v = a?.system?.abilities?.rituals?.value;
  if ( v !== undefined ) return num(v);
  const it = [...(a?.items ?? [])].find(i => i.type === "Ability" && /^rituals$/i.test(String(i.name)));
  return num(it?.system?.value);
}

/** What the rules need to know about a maker, read off the sheet. */
export function makerFacts(a) {
  const adv = a?.system?.advantages ?? {};
  let profile = "mortal";
  try { profile = game.wodx?.profiles?.detectProfile?.(a) ?? profile; } catch (e) { /* Actions off */ }
  let gender = "";
  try { gender = game.modules.get("wodx-chronicle")?.api?.gender?.forRules?.(a) ?? ""; } catch (e) { gender = ""; }
  return {profile, kinfolk: a?.flags?.world?.wodx?.kinfolk ?? null, breed: a?.system?.changingbreed ?? "",
    gnosis: num(adv.gnosis?.permanent), willpower: num(adv.willpower?.permanent), rituals: ritualsOf(a),
    rites: [...(a?.items ?? [])].filter(i => i.type === "Power" && i.system?.type === "wod.types.rite").map(i => i.name), gender};
}

/** True when this character's line can make things and its switch is on. */
export function available(a) {
  const api = W();
  if ( !api?.enabled?.("garou") ) return false;
  return !!api.makerOf(makerFacts(a)).kind;
}

/** The pick-and-start window. */
export async function makeDialog(actorId) {
  const api = W(), a = game.actors.get(actorId);
  if ( !api || !a ) return ui.notifications.warn("Making fetishes needs WoDX Library.");
  if ( !api.enabled("garou") ) return ui.notifications.warn("Making fetishes and talens is switched off in this world.");
  const m = api.makerOf(makerFacts(a));
  const rows = api.listFor(m, {year: yearNow()});
  if ( !rows.length ) return ui.notifications.warn(`${a.name} cannot make fetishes or talens.`);
  const sp = spirits();
  const opt = (v, l, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(l)}</option>`;
  const fetishes = rows.filter(w => w.kind === "fetish"), talens = rows.filter(w => w.kind === "talen");
  const group = (label, list) => list.length ? `<optgroup label="${esc(label)}">${list.map(w => opt(w.key, api.label(w))).join("")}</optgroup>` : "";
  const content = `<p><b>${esc(a.name)}</b>: Gnosis ${m.gnosis}, Willpower ${m.willpower}, Rituals ${m.rituals}.${m.kind === "kinfolk" ? " Kinfolk making fetishes is a house reading until W20 Kinfolk is checked." : ""}</p>
    ${searchBox("select[name=wonder]", "Find a fetish or talen…", "Search fetishes and talens")}
    <div class="form-group"><label for="wst-wonder">Make</label><select id="wst-wonder" name="wonder">${group("Fetishes (Rite of the Fetish)", fetishes)}${group("Talens (Rite of Binding)", talens)}</select></div>
    <div class="form-group"><label for="wst-wonder-spend">Gnosis spent at the rite</label><input id="wst-wonder-spend" type="number" name="spend" value="0" min="0" max="${m.gnosis}"></div>
    <p class="hint">A fetish: permanent Gnosis, two off the difficulty each. A talen: temporary Gnosis, at least one, each lowering the spirit's Gnosis by one.</p>
    ${game.user.isGM ? `<div class="form-group"><label for="wst-wonder-pers">Persuasion (fetish, 0 to 3 off)</label><input id="wst-wonder-pers" type="number" name="persuasion" value="0" min="0" max="3"></div>` : ""}
    <div class="form-group"><label for="wst-wonder-power">The spirit (talens)</label><select id="wst-wonder-power" name="power" data-fixed>${opt("gaffling", "A Gaffling", true)}${opt("jaggling", "A Jaggling (two more talens)")}${opt("greater", "A greater spirit (three more)")}</select></div>
    <div class="form-group"><label for="wst-wonder-forced">Forced in (beaten to 0 Essence first)</label><input id="wst-wonder-forced" type="checkbox" name="forced"></div>
    <div class="wst-wonder-about wodx-quiet" aria-live="polite"></div>
    <p class="hint">${esc(api.MAKES.fetish.ref)}${game.user.isGM ? "" : " The Storyteller says whether the spirit is found and willing before the work starts."}</p>`;
  const about = (root) => {
    const w = api.byKey[root.querySelector("select[name=wonder]")?.value];
    const box = root.querySelector(".wst-wonder-about");
    if ( !w || !box ) return;
    const ce = sp?.effect?.(a, w.court) ?? {note: ""};
    const bl = api.blockers(w, m, {spend: num(root.querySelector("input[name=spend]")?.value)});
    box.innerHTML = `<p>${esc(w.does)}</p><p>Spirit: ${esc(w.spirit)}.${ce.note ? ` ${esc(ce.note)}` : ""}</p>${api.cautions(w, m).map(c => `<p>${esc(c)}</p>`).join("")}${bl.length ? `<p><b>Cannot yet:</b> ${esc(bl.join("; "))}.</p>` : ""}<p>${esc(w.book)}, pdf ${w.pdf}.</p>`;
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 540}, window: {title: `Make a fetish or talen: ${a.name}`}, classes: ["wodx-dialog", "wst-wonder"],
    content, render: (ev, dlg) => { const root = dlg?.element ?? ev?.target?.element; if ( !root ) return; for ( const el of root.querySelectorAll("select, input") ) el.addEventListener("change", () => about(root)); about(root); },
    buttons: [{action: "go", label: game.user.isGM ? "Start the work" : "Ask the Storyteller", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return null;
  return start(a, res.wonder, {spend: num(res.spend), persuasion: num(res.persuasion), power: res.power, forced: !!res.forced});
}

/** Set up the task. A player's waits paused for the Storyteller's go-ahead. */
export async function start(a, key, {spend = 0, persuasion = 0, power = "gaffling", forced = false} = {}) {
  const api = W(), w = api?.byKey?.[key];
  if ( !api || !w || !a ) return null;
  const m = api.makerOf(makerFacts(a));
  const bl = api.blockers(w, m, {spend});
  if ( bl.length ) { ui.notifications.warn(`${a.name} cannot make the ${w.name}: ${bl.join("; ")}.`); return null; }
  const court = num(spirits()?.effect?.(a, w.court)?.diff);
  if ( spirits()?.effect?.(a, w.court)?.refuses ) ui.notifications.warn(`The ${w.court} court scorns ${a.name}: the spirit may refuse outright.`);
  const seed = api.taskFor(w, m, {spend, persuasion: game.user.isGM ? persuasion : 0, court, strength: power, forced});
  const ask = !game.user.isGM;
  const T = await tasks();
  const t = await T.saveTask(a, {...seed, approved: !ask, ...(ask ? {status: "paused", waits: "the Storyteller's go-ahead (is the spirit found and willing?)"} : {})});
  if ( !t ) return null;
  if ( ask ) await chron()?.approvals?.propose?.({type: T_WONDER, key: `wonder.${a.id}.${t.id}`, title: `${a.name}: ${t.name}`,
    detail: `${w.does} Spirit: ${w.spirit}. Difficulty ${t.diff}${t.pool === "willpower" ? " (Willpower)" : " (Wits + Rituals)"}, ${spend} Gnosis to spend. ${api.cautions(w, m).join(" ")}`.trim(),
    data: {actorId: a.id, taskId: t.id}});
  else ui.notifications.info(`${a.name}: ${t.name} is set up${t.delay ? `; the roll comes after ${t.delay} nights of cleansing` : ""}.`);
  return t;
}

async function approve(entry) {
  const a = game.actors.get(entry?.data?.actorId), id = entry?.data?.taskId;
  const T = await tasks();
  const raw = T.rawTasks(a)?.[id];
  if ( !a || !raw ) return;
  const now = game.time?.worldTime ?? 0;
  await a.update({[`flags.${MOD}.tasks.${id}`]: {...raw, approved: true, status: "open", waits: "", next: now + (num(raw.delay) || 0) * 86400 + 86400}});
  await tell(a, `The Storyteller agrees: ${raw.name} begins${num(raw.delay) ? ` with ${raw.delay} nights of cleansing` : ""}.`);
}
async function reject(entry) {
  const a = game.actors.get(entry?.data?.actorId), id = entry?.data?.taskId;
  const T = await tasks();
  const raw = T.rawTasks(a)?.[id];
  if ( !a || !raw ) return;
  await T.removeTask(a, id);
  await tell(a, `The Storyteller says no to ${raw.name}: no willing spirit answers, or the vessel isn't ready.`);
}
async function tell(a, text) {
  await ChatMessage.create({speaker: {alias: "Storyteller"}, whisper: [...ownerIds(a), ...gmIds()], content: `<div class="wodx-card wst-wonder-card"><p>${esc(text)}</p></div>`});
}

export function registerWonderApproval() {
  chron()?.approvals?.registerHandler?.(T_WONDER, {label: "A fetish or talen to make", approve, reject});
}

/** The rite is over: pay the Gnosis, then make the items or note the botch. Runs on the active Storyteller's client. */
async function finished({actor: a, task: t} = {}) {
  if ( !isActiveGM() || !a || !t?.wonder || t.made ) return;
  const api = W(), w = api?.byKey?.[t.wonder];
  if ( !api || !w ) return;
  const lines = [];
  const g = a.system?.advantages?.gnosis;
  if ( t.spend && g ) {
    const key = w.kind === "talen" ? "temporary" : "permanent";
    const from = num(g[key]);
    await a.update({[`system.advantages.gnosis.${key}`]: Math.max(0, from - t.spend), ...(key === "permanent" ? {"system.advantages.gnosis.temporary": Math.min(num(g.temporary), Math.max(0, from - t.spend))} : {})});
    lines.push(`${t.spend} ${key} Gnosis spent at the rite.`);
  }
  let made = [];
  if ( t.status === "done" ) {
    const data = api.itemsFor(w, {successes: Math.max(1, t.total), strength: t.power, spirit: t.spirit, maker: a.name, at: game.time?.worldTime ?? 0});
    if ( data.length ) made = await a.createEmbeddedDocuments("Item", data);
    lines.push(made.length ? `Made: ${made.map(i => i.name).join(", ")}.` : "Nothing came of it.");
    if ( t.forced ) { try { await spirits()?.move?.(a, "bound", {court: w.court, why: `forced a spirit into the ${w.name}`}); lines.push("The spirit was forced: its court remembers."); } catch (e) { /* Otherworlds off */ } }
    if ( w.silver ) lines.push(`Carrying it costs ${w.silver} from ${a.name}'s effective Gnosis.`);
  } else if ( t.status === "ruined" ) {
    try { await spirits()?.move?.(a, "slight", {court: w.court, why: `a botched binding (${w.name})`}); } catch (e) { /* Otherworlds off */ }
    lines.push("A botch: the vessel is spoiled and the spirit leaves angry.");
  }
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

export const wondersApi = () => ({open: makeDialog, start, available, maker: makerFacts});
