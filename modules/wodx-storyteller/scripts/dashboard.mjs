import * as DR from "./dashboard-rules.mjs";
import * as C from "./core.mjs";
import * as W from "./world-rules.mjs";
import * as Led from "./ledger.mjs";
import * as Dreams from "./dreams.mjs";
import * as Rumours from "./rumours.mjs";
import * as RR from "./rumour-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * The Storyteller's dashboard: the party at a glance, what runs out or comes next, open threads and the
 * consequences that come due. Read only; each section has a button to the window where things are changed.
 */

const {esc, MOD} = C;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const now = () => globalThis.game?.time?.worldTime ?? 0;

function timedList() {
  const out = [];
  for ( const a of all(game.actors) ) for ( const e of all(a.effects) ) {
    const t = e?.flags?.["wodx-chronicle"]?.timed;
    if ( t && Number.isFinite(Number(t.until)) ) out.push({actor: a.name, name: e.name, until: Number(t.until)});
  }
  return out;
}

/** Dated events still ahead, as world times (the first few only: the table runs for centuries). */
function eventList(t) {
  try {
    const ev = C.chron()?.events;
    if ( !ev?.list ) return [];
    const fired = new Set(ev.fired?.() ?? []);
    const eng = getEngine(), d = eng.timeToDate(t), today = d.year * 10000 + (d.month ?? 1) * 100 + (d.day ?? 1);
    return ev.list().filter(e => e.live && !fired.has(e.id) && e.key > today).slice(0, 5).map(e => {
      let at = null;
      try { at = eng.dateToTime({year: e.year, month: e.month ?? 1, day: e.day ?? 1, hour: 0, minute: 0}); } catch { /* a reform gap */ }
      return {name: e.name ?? e.title ?? e.id, at};
    });
  } catch { return []; }
}

export function gather() {
  const t = now();
  const party = DR.sortParty(C.pcs().map(a => DR.partyRow({id: a.id, name: a.name, type: a.type, system: a.system,
    statuses: [...(a.statuses ?? [])], where: C.whereIs(a) ? C.sceneName(C.whereIs(a)) : null, ahead: C.personalTime(a.id) - t})));
  const name = id => game.actors.get(id)?.name ?? "someone";
  const beats = C.beats();
  const dreams = Dreams.dreams().map(d => ({...d, actor: name(d.actorId)}));
  let dawnAt = null;
  try { dawnAt = C.dawnAfter(t); } catch { /* no calendar */ }
  const clocks = DR.clocks({now: t, dawnAt, timed: timedList(), beats, dreams, events: eventList(t)});
  const q = C.chron()?.approvals;
  const threads = DR.threads({beats, rumours: Rumours.rumours().filter(RR.live).map(r => ({text: r.text, known: r.knownBy?.length ?? 0})),
    queue: q?.pending?.()?.length ?? 0, held: q?.held?.()?.length ?? 0});
  const consequences = DR.consequences(Led.ledger().entries, t);
  return {now: t, party, clocks, threads, consequences};
}

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class DashboardApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-dashboard",
    classes: ["wodx", "wodx-dashboard-app"],
    window: {title: "The Storyteller's dashboard", icon: "fa-solid fa-gauge", resizable: true},
    position: {width: 680, height: "auto"},
    actions: {tracker: () => game.modules.get(MOD)?.api?.openTracker?.(), ledger: () => Led.LedgerApp.open(),
      beats: () => game.modules.get(MOD)?.api?.beatsDialog?.(), rumours: () => Rumours.RumoursApp.open(), dreams: () => Dreams.DreamsApp.open(),
      queue: () => C.chron()?.approvals?.ApprovalsApp?.open?.(), sheet: DashboardApp.#onSheet, refresh: () => DashboardApp.refresh()}
  };
  static #instance;
  static #timer = null;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new DashboardApp(); return this.#instance.render({force: true}); }
  /** Redraw at most twice a second however many changes come in. */
  static refresh() {
    if ( !this.#instance?.rendered || this.#timer ) return;
    this.#timer = setTimeout(() => { this.#timer = null; if ( this.#instance?.rendered ) this.#instance.render(); }, 500);
  }

  async _renderHTML() {
    const g = gather();
    const span = s => esc(DR.whenLabel(s));
    const pRow = r => `<div class="wstory-dash-row" data-search-item data-search-text="${esc(`${r.name} ${r.where ?? ""} ${r.statuses.join(" ")}`)}">
      <div><button type="button" class="wstory-dash-name" data-action="sheet" data-id="${esc(r.id)}">${esc(r.name)}</button> <span class="wodx-quiet">${esc(r.where ?? "on no scene")}${Math.abs(r.ahead) >= 60 ? `, ${esc(W.aheadLabel(r.ahead))}` : ""}</span></div>
      <div class="wodx-quiet">${esc(DR.woundWords(r.wounds))}${r.willpower ? `; Willpower ${r.willpower.now}/${r.willpower.of}` : ""}${r.blood ? `; blood ${r.blood.now}/${r.blood.of}` : ""}${r.statuses.length ? `; ${esc(r.statuses.join(", "))}` : ""}</div></div>`;
    const cRow = c => `<div class="wstory-dash-row" data-search-item data-search-text="${esc(c.what)}"><strong>${span(c.at - g.now)}</strong> ${esc(c.what)} <span class="wodx-quiet">${esc(C.timeLabel(c.at))}</span></div>`;
    const tRow = x => `<div class="wstory-dash-row" data-search-item data-search-text="${esc(x.what)}">${esc(x.what)} <span class="wodx-quiet">${esc(x.why)}</span></div>`;
    const who = s => esc(s?.name || "someone");
    const lRow = e => `<div class="wstory-dash-row${e.overdue ? " wstory-dash-overdue" : ""}" data-search-item data-search-text="${esc(`${e.what} ${e.from?.name ?? ""} ${e.to?.name ?? ""}`)}">
      <strong>${e.due === null ? "No date" : `Due ${span(e.due - g.now)}`}</strong> ${esc(e.kind)}: ${who(e.from)} to ${who(e.to)}${e.what ? `, ${esc(e.what)}` : ""}</div>`;
    const section = (title, cls, rows, empty, buttons) => `<section><h3>${title} (${rows.length})</h3>${searchBox(`.${cls}`, "Search…", `Search ${title.toLowerCase()}`)}
      <div class="${cls} wstory-dash-list">${rows.join("") || `<p class="wodx-quiet">${empty}</p>`}</div><div class="wodx-buttons">${buttons}</div></section>`;
    const btn = (action, label) => `<button type="button" data-action="${action}">${label}</button>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `<p class="wodx-quiet">Read only. ${esc(C.timeLabel(g.now))}. Change things in the windows the buttons open.</p>
      ${section("The party", "wstory-dash-party", g.party.map(pRow), "No players' characters yet.", btn("tracker", "The tracker"))}
      ${section("Clocks", "wstory-dash-clocks", g.clocks.map(cRow), "Nothing timed ahead.", btn("beats", "Beats") + btn("dreams", "Dreams"))}
      ${section("Open threads", "wstory-dash-threads", g.threads.map(tRow), "Nothing open.", btn("rumours", "The rumour mill") + btn("queue", "The approval queue"))}
      ${section("Consequences", "wstory-dash-due", g.consequences.map(lRow), "No open debts, oaths or grudges.", btn("ledger", "The Ledger"))}
      <div class="wodx-buttons">${btn("refresh", "Refresh")}</div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  static #onSheet(event, target) { game.actors.get(target.dataset.id)?.sheet?.render(true); }
}

export function registerDashboardHooks() {
  const r = () => DashboardApp.refresh();
  for ( const h of ["updateActor", "createActiveEffect", "deleteActiveEffect", "updateWorldTime", "createToken", "deleteToken"] ) Hooks.on(h, r);
  Hooks.on("updateSetting", s => { if ( /^wodx-(storyteller|chronicle)\./.test(s?.key ?? "") ) r(); });
}
