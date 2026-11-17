/**
 * WoDX Solo: Report a problem (B7160 to B7163). A fault met in play is written down where it happened.
 *
 *   The button   "Report a problem" on the player's panel, and in the Settings sidebar for the Storyteller, while The
 *                Lone Chronicle is on. A short form asks what happened, what was expected and what kind of problem it
 *                is; the rest is taken from the client: the build, the scene, the character, the game date, the last
 *                20 console errors, the last chat cards and the open windows.
 *   Saving       a journal entry in the "Reported problems" folder, its page for people to read and the whole report
 *                on flags.wodx-solo.report. A player cannot make journal entries, so the seat saves it; with no
 *                Storyteller connected the report waits on the player's own user flag (wodx-solo.pending) and the
 *                next Storyteller to connect saves it.
 *   Afterwards   tools/solo/reports.mjs exports the entries (the seat also writes each one to a folder on the PC as
 *                it is saved) and files them in the feature registry as faults.
 * The form is a tool window, out of the fiction: plain words, nothing in the game world changes.
 */
import * as P from "./report-rules.mjs";
import * as R from "./solo-rules.mjs";
import {addAsks, addActions, ask, SOCKET, characterOf, placeOf} from "./panel.mjs";

const MOD = "wodx-solo";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const {DialogV2} = foundry.applications.api;
const reply = (userId, type, data = {}) => game.socket.emit(SOCKET, {type, payload: {userId, ...data}});

let H = null; // from main.mjs: {isOn, isSeat, log, get}

/* ------------------------------------------------------------------ */
/*  The console errors, caught from the moment the module loads        */
/* ------------------------------------------------------------------ */

let errors = [];
const note = (msg, stack = "") => { try { errors = P.pushError(errors, P.errorEntry({msg, stack})); } catch (e) { /* never break the console */ } };
(function catchErrors() {
  if ( globalThis.__wodxSoloErrors ) return;
  globalThis.__wodxSoloErrors = true;
  const orig = console.error.bind(console);
  console.error = (...args) => {
    const err = args.find(a => a instanceof Error);
    note(args.map(a => (a instanceof Error ? a.message : typeof a === "string" ? a : (() => { try { return JSON.stringify(a); } catch (e) { return String(a); } })())).join(" "), err?.stack ?? "");
    return orig(...args);
  };
  globalThis.addEventListener?.("error", ev => note(ev?.message ?? "error", ev?.error?.stack ?? `${ev?.filename ?? ""}:${ev?.lineno ?? ""}`));
  globalThis.addEventListener?.("unhandledrejection", ev => note(`Unhandled: ${ev?.reason?.message ?? ev?.reason ?? ""}`, ev?.reason?.stack ?? ""));
})();
export const caught = () => [...errors];

/* ------------------------------------------------------------------ */
/*  What the client sees                                               */
/* ------------------------------------------------------------------ */

async function context() {
  const user = game.user;
  const scene = canvas?.scene ?? game.scenes?.viewed ?? null;
  const actor = user.isGM ? (canvas?.tokens?.controlled?.[0]?.actor ?? null) : (characterOf(user) ?? placeOf(user)?.actor ?? null);
  let build = {};
  try {
    const s = await game.modules.get("wodx-chronicle")?.api?.release?.check?.();
    if ( s ) build = {label: s.label ?? "", commit: s.commit ?? s.groups?.[0]?.commit ?? "", mixed: s.state === "mixed"};
  } catch (e) { build = {}; }
  let gameDate = "";
  try { const cal = await import("../../wodx-chronicle/scripts/calendar.mjs"); gameDate = cal.describeTime(game.time.worldTime)?.dateLabel ?? ""; } catch (e) { gameDate = ""; }
  const cards = all(game.messages).slice(-P.CARDS_KEPT).map(m => { try { return R.titleOf(m); } catch (e) { return ""; } }).filter(Boolean);
  const windows = [...(foundry.applications.instances?.values?.() ?? [])].filter(a => a?.rendered).map(a => a.id).filter(Boolean);
  const modules = Object.fromEntries([...game.modules].filter(m => m.active && m.id.startsWith("wodx-")).map(m => [m.id, m.version ?? ""]));
  if ( game.system?.id ) modules[game.system.id] = game.system.version ?? "";
  return {at: Date.now(), world: game.world.id, by: user.name, isGM: user.isGM, build,
    scene: scene ? {id: scene.id, name: scene.navName || scene.name} : null,
    actor: actor ? {id: actor.id, name: actor.name, type: actor.type} : null,
    gameDate, worldTime: game.time.worldTime, errors: caught(), cards, windows, modules};
}

/* ------------------------------------------------------------------ */
/*  Saving (a Storyteller's client)                                    */
/* ------------------------------------------------------------------ */

async function folder() {
  let f = all(game.folders).find(x => x.type === "JournalEntry" && x.name === P.FOLDER && x.getFlag?.(MOD, "reports"));
  if ( !f ) f = all(game.folders).find(x => x.type === "JournalEntry" && x.name === P.FOLDER);
  if ( !f ) f = await Folder.create({name: P.FOLDER, type: "JournalEntry", flags: {[MOD]: {reports: true}}});
  return f;
}

/** Save one report as a journal entry; a second save of the same id does nothing. Storyteller only. */
export async function save(report, {userId = null} = {}) {
  if ( !game.user.isGM || !report?.id ) return null;
  const had = all(game.journal).find(j => j.getFlag?.(MOD, "report")?.id === report.id);
  if ( had ) return had;
  const f = await folder();
  const ownership = {default: 0};
  if ( userId && !game.users.get(userId)?.isGM ) ownership[userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const entry = await JournalEntry.create({name: P.entryName(report), folder: f.id, ownership,
    pages: [{name: "Report", type: "text", text: {content: P.reportHtml(report)}}],
    flags: {[MOD]: {report, exported: false}}});
  await H.log({kind: "note", source: MOD, title: "A problem was reported", note: `${report.by}: ${report.what.slice(0, 120)}`}).catch(() => null);
  Hooks.callAll("wodxSoloReported", {report, entryId: entry.id});
  return entry;
}

/** Reports that waited on players' own flags while no Storyteller was there. */
async function drain() {
  if ( !game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id) ) return 0;
  let n = 0;
  for ( const u of all(game.users).filter(x => !x.isGM) ) {
    const waiting = u.getFlag(MOD, "pending") ?? [];
    if ( !waiting.length ) continue;
    for ( const r of waiting ) { if ( await save(r, {userId: u.id}) ) n++; }
    await u.unsetFlag(MOD, "pending");
  }
  return n;
}

/* ------------------------------------------------------------------ */
/*  The form (any client)                                              */
/* ------------------------------------------------------------------ */

let open = false;
/** Ask what happened, then save it (or send it to the seat). Returns the report, or null when cancelled. */
export async function report({kind = "broken", what = "", expected = ""} = {}) {
  if ( open ) return null;
  open = true;
  try {
    const kinds = P.KINDS.map(k => `<label class="wsolo-choice"><input type="radio" name="kind" value="${k.id}"${k.id === kind ? " checked" : ""}> ${esc(k.label)}${k.hint ? `<span class="wodx-quiet"> ${esc(k.hint)}</span>` : ""}</label>`).join("");
    const got = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog", "wsolo-report"], window: {title: "Report a problem"}, rejectClose: false,
      content: `<p>Say what went wrong. The build, the scene, the character, the date and any recent errors are added for you.</p>
        <div class="form-group stacked"><label>What happened</label><textarea name="what" maxlength="${P.WHAT_MAX}" rows="4" autofocus>${esc(what)}</textarea></div>
        <div class="form-group stacked"><label>What you expected (optional)</label><textarea name="expected" maxlength="${P.EXPECTED_MAX}" rows="2">${esc(expected)}</textarea></div>
        <fieldset class="wsolo-choices" data-fixed><legend>Kind of problem</legend>${kinds}</fieldset>`,
      ok: {label: "Send report", icon: "fa-solid fa-paper-plane", callback: (ev, b) => ({what: b.form.elements.what.value, expected: b.form.elements.expected.value, kind: b.form.querySelector("input[name=kind]:checked")?.value ?? "other"})}});
    if ( !got ) return null;
    const check = P.checkInput(got);
    if ( !check.ok ) { ui.notifications.warn(check.why); return null; }
    const r = P.buildReport(got, await context());
    await send(r);
    return r;
  } finally { open = false; }
}

/** Save it here (a Storyteller), send it to the seat, or keep it on the user until a Storyteller connects. */
async function send(r) {
  if ( game.user.isGM ) { await save(r, {userId: game.user.id}); ui.notifications.info("Report saved in Reported problems."); return; }
  if ( game.users.activeGM ) { ask("ask.report", {report: r}); return; }
  await game.user.setFlag(MOD, "pending", P.addPending(game.user.getFlag(MOD, "pending") ?? [], r));
  ui.notifications.info("Report kept. It is saved when the Storyteller's seat connects.");
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

function settingsButton(app, html) {
  if ( !game.user.isGM || !H.isOn() ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if ( !root || root.querySelector(".wsolo-report-btn") ) return;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "wsolo-report-btn";
  b.innerHTML = `<i class="fa-solid fa-bug"></i> Report a problem`;
  b.addEventListener("click", () => report());
  (root.querySelector("section.documentation, .documentation, section") ?? root).append(b);
}

export function installReport(helpers) {
  H = helpers;
  addAsks({"ask.report": async p => {
    const r = p?.report;
    if ( !r?.id || r.by !== game.users.get(p.userId)?.name ) return;
    const e = await save(r, {userId: p.userId});
    if ( e ) reply(p.userId, "report.saved", {id: r.id});
  }}, {"report.saved": () => ui.notifications.info("Report saved in Reported problems. Thank you.")});
  addActions({report: () => report()});
  Hooks.on("renderSettings", settingsButton);
  if ( game.user.isGM ) {
    setTimeout(() => drain().catch(e => console.warn(`${MOD} | reports`, e)), 4000);
    Hooks.on("userConnected", (u, on) => { if ( on && !u.isGM ) setTimeout(() => drain().catch(() => null), 2000); });
  }
}

export const reportApi = {report, save, drain, caught, rules: P};
