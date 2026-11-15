import {MODULE_ID, esc, isActiveGM, rule, setting, setSetting, log} from "./util.mjs";
import {getEngine} from "./calendar.mjs";
import {searchBox} from "./search.mjs";
import EVENT_DATA from "../data/events.mjs";
import FUTURE_DATA from "../data/future-events.mjs";
import FUTURE_WORLD from "../data/future-world.mjs";
import WORLD_HISTORY from "../data/world-history.mjs";
import {eventTable, firedAt, diffFired, dateLabel, cleanOverride, newsCodes, heardIn, newsFor, NEWS_PARTS, capTold, isWorld, worldEraAt, shownIn} from "./events-rules.mjs";
import * as place from "./place.mjs";

/**
 * Dated events. When the Chronicle Clock passes an event's date it fires once: a chat card, the hook
 * wodxEventFired(event), and a line in the Chronicle Rules journal. Setting the clock back undoes it
 * (wodxEventUndone). A time skip that crosses several events posts one card for all of them.
 * Other modules ask with game.wodx.chronicle.events.has(id).
 */

export const EVENTS = [...EVENT_DATA.events, ...FUTURE_DATA.events, ...FUTURE_WORLD.events, ...WORLD_HISTORY.events];
/** The eras of the world timeline, 1197 to 2009 (B5920): {id, name, from, to}. */
export const WORLD_ERAS = WORLD_HISTORY.eras;
/** The era of the world timeline the clock stands in. */
export const worldEra = (year = today().year) => worldEraAt(WORLD_ERAS, year);

const activeScene = () => { try { return game.scenes?.active ?? null; } catch (e) { return null; } };
/** The parts of the world whose news reaches the table: the homeland's and the active scene's (B5891). */
export function hereCodes(scene = activeScene()) {
  try { return newsCodes(place.homeland(), place.placeOf(scene)?.region); } catch (e) { return newsCodes(); }
}
/** Is this event's news heard where the chronicle stands now? Events with no region always are. */
export const heard = (ev, codes = hereCodes()) => heardIn(ev, codes);
/** The Cascades of the Time of Future Judgement (2099): {id, name, pitch}. */
export const CASCADES = FUTURE_DATA.cascades;
export const BRANCH_NOTE = EVENT_DATA.branchNote;

export function registerEventSettings(onChange) {
  game.settings.register(MODULE_ID, "eventOverrides", {
    scope: "world", config: false, type: Object, default: {}, onChange
  });
  // null until the first check, which records what has already happened without announcing it
  // the Cascade of the Time of Future Judgement this chronicle follows in 2099; "" until the Storyteller picks one
  game.settings.register(MODULE_ID, "futureCascade", {scope: "world", config: false, type: String, default: "", onChange});
  game.settings.register(MODULE_ID, "eventsFired", {scope: "world", config: false, type: Object, default: null});
  game.settings.registerMenu(MODULE_ID, "eventsMenu", {
    name: "Dated events",
    label: "Open dated events",
    hint: "Turn each dated event on or off, or move its date. An event fires once when the clock passes it.",
    icon: "fa-solid fa-calendar-days",
    type: EventsApp,
    restricted: true
  });
}

const opts = () => ({overrides: setting("eventOverrides") ?? {}, futureBranch: rule("futureBranch"), cascade: setting("futureCascade") ?? ""});

/** The chosen Cascade's name, or a note that none is chosen yet. */
function cascadeLine() {
  const c = CASCADES.find(x => x.id === setting("futureCascade"));
  return c ? `Time of Future Judgement (2099): ${c.name}.` : "Time of Future Judgement (2099): no Cascade chosen yet, so none of its events fire.";
}
const stateOf = (ev, done) => !ev.live ? (!ev.on ? "Off" : ev.cascade && rule("futureBranch") ? "Other Cascade" : "Other timeline")
  : done.has(ev.id) ? "Happened" : "Ahead";

/** Today's date on the Chronicle Clock. */
function today() {
  const d = getEngine().timeToDate(game.time.worldTime);
  return {year: d.year, month: d.month, day: d.day};
}

/** Every event, as this chronicle has it. */
export function list() {
  return eventTable(EVENTS, opts());
}

/** The ids of the events that have fired. */
export function fired() {
  return setting("eventsFired") ?? firedAt(EVENTS, today(), opts());
}

/** Has this event happened in this chronicle? */
export function has(id) {
  return fired().includes(id);
}

const byId = id => list().find(ev => ev.id === id);

let chain = Promise.resolve();

/** Compare what has fired with what the date calls for, and act. Active GM only. One check runs at a time. */
export function checkEvents(options = {}) {
  const run = chain.then(() => _checkEvents(options));
  chain = run.catch(() => {});
  return run;
}

async function _checkEvents({label = "", force = false} = {}) {
  if ( !isActiveGM() ) return null;
  // `force` checks even while the world is held (the gate uses it, so nothing else in the world reacts)
  if ( setting("hold") && !force ) return {fired: [], undone: [], held: true};
  const now = firedAt(EVENTS, today(), opts());
  const before = setting("eventsFired");
  if ( before === null ) {
    await setSetting("eventsFired", now);
    log(`Dated events: ${now.length} already in the past`);
    return {fired: [], undone: [], first: true};
  }
  const {fired: newly, undone} = diffFired(EVENTS, before, now, opts());
  if ( !newly.length && !undone.length ) return {fired: [], undone: []};
  await setSetting("eventsFired", now);
  for ( const id of newly ) Hooks.callAll("wodxEventFired", byId(id));
  for ( const id of undone ) Hooks.callAll("wodxEventUndone", byId(id));
  await postCard(newly.map(byId), undone.map(byId), label, today());
  return {fired: newly, undone};
}

async function postCard(allNew, allUndone, label, date = null) {
  const codes = hereCodes();
  // the hidden story behind the world's events is the Storyteller's alone (B5921)
  await postHidden(allNew.filter(ev => ev?.hidden), codes, label, date);
  const news = newsFor(allNew.filter(ev => ev && !ev.hidden), codes, {date, skip: !!label});
  const capped = capTold(news.told);
  const newly = capped.told;
  const undone = allUndone.filter(ev => ev && !ev.hidden && heardIn(ev, codes));
  const item = ev => {
    const link = ev.journal ? ` @UUID[${esc(ev.journal)}]{Read more}` : "";
    const where = ev.place ? `, ${esc(ev.place)}` : "";
    return `<li><strong>${esc(dateLabel(ev))}${where}: ${esc(ev.name)}.</strong> ${esc(ev.summary)}${link}</li>`;
  };
  const parts = [];
  // News that happened far away, or long ago, is counted, not told (B5892); it is all on the Dated events page.
  const quiet = [capped.more ? `${capped.more} more piece${capped.more === 1 ? "" : "s"} of news from these parts` : "", news.older ? `${news.older} older piece${news.older === 1 ? "" : "s"} of news from these parts` : "",
    news.elsewhere ? `${news.elsewhere} event${news.elsewhere === 1 ? "" : "s"} elsewhere in the world` : ""].filter(Boolean);
  if ( !newly.length && !undone.length ) return;
  if ( newly.length ) {
    const title = newly.length === 1 ? "The world turns" : `The world turns${label ? ` during ${esc(label)}` : ""}`;
    parts.push(`<h3>${title}</h3><ul>${newly.map(item).join("")}</ul>`);
  }
  if ( undone.length ) {
    parts.push(`<h3>Not yet happened</h3><p>The clock is before these again, so they count as not yet happened:</p><ul>${undone.map(ev => `<li>${esc(ev.name)}</li>`).join("")}</ul>`);
  }
  if ( quiet.length ) parts.push(`<p class="wodx-quiet">Not told here: ${quiet.join(" and ")} (Chronicle Rules, Dated events).</p>`);
  await ChatMessage.create({content: `<div class="wodx-card wodx-events">${parts.join("")}</div>`, speaker: {alias: "Chronicle"}});
}

/**
 * The Storyteller's card for the hidden story behind the world's events (B5921): whispered, never shown to players.
 * Told like the news: what is heard of here, the newest kept to TOLD_CAP, the rest counted.
 */
async function postHidden(evs, codes, label, date) {
  if ( !evs.length ) return;
  const news = newsFor(evs, codes, {date, skip: !!label});
  const {told, more} = capTold(news.told);
  const rest = more + news.older + news.elsewhere;
  if ( !told.length ) return;
  const items = told.map(ev => `<li><strong>${esc(dateLabel(ev))}${ev.place ? `, ${esc(ev.place)}` : ""}: ${esc(ev.name)}.</strong> ${esc(ev.summary)}</li>`).join("");
  const gms = game.users?.filter(u => u.isGM).map(u => u.id) ?? [];
  await ChatMessage.create({whisper: gms, speaker: {alias: "Chronicle"}, flags: {[MODULE_ID]: {hiddenEvents: told.map(ev => ev.id)}},
    content: `<div class="wodx-card wodx-events wodx-hidden-events"><h3>Behind the curtain</h3><p class="hint">For the Storyteller: what the world's night holds behind the news.</p><ul>${items}</ul>${rest ? `<p class="wodx-quiet">And ${rest} more, on the Dated events page.</p>` : ""}</div>`});
}

/** The "Dated events" page of Chronicle Rules: the players may read it, so the hidden story stays off it (B5923). */
export function eventsHTML() {
  const done = new Set(fired());
  const era = worldEra();
  const codes = hereCodes();
  const all = list().filter(ev => !ev.hidden);
  const shown = all.filter(ev => !isWorld(ev) || (ev.era === era?.id && heardIn(ev, codes)));
  const left = all.length - shown.length;
  const rows = shown.map(ev => `<tr><td>${esc(dateLabel(ev))}${ev.moved ? " (moved)" : ""}</td><td>${esc(ev.name)}${ev.place ? ` <em>(${esc(ev.place)}, ${esc(NEWS_PARTS[ev.region] ?? "")})</em>` : ""}</td>
    <td>${stateOf(ev, done)}</td><td>${esc(ev.source)}${ev.dateNote ? `<br><em>${esc(ev.dateNote)}</em>` : ""}</td></tr>`).join("");
  return `<p>Each event fires once when the clock passes its date. The Storyteller turns them on or off and moves them in Configure Settings, Dated events.</p>
    <p><strong>Timeline:</strong> ${rule("futureBranch") ? "Future Darkness branch" : "classic"}. ${esc(BRANCH_NOTE)}</p>
    ${rule("futureBranch") ? `<p>${esc(cascadeLine())}</p>` : ""}
    ${era ? `<p><strong>The world's history:</strong> ${esc(era.name)}, as heard here. ${left} more event${left === 1 ? "" : "s"} of other eras or other parts of the world are kept in the Storyteller's Dated events window.</p>` : ""}
    <table><thead><tr><th>Date</th><th>Event</th><th>State</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

/** The Dated events window: a switch, a date and a journal link for each event. */
export class EventsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-events-{id}",
    tag: "form",
    classes: ["wodx", "wodx-events-app"],
    window: {title: "Dated events", icon: "fa-solid fa-calendar-days", resizable: true},
    position: {width: 640, height: "auto"},
    form: {handler: EventsApp.#onSubmit, closeOnSubmit: true}
  };

  static #instance;

  /** The era of the world timeline whose events the window lists (B5923): the clock's own when it opens. */
  era = null;

  static open(era = null) {
    this.#instance ??= new EventsApp();
    this.#instance.era = era ?? worldEra()?.id ?? "";
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const ov = setting("eventOverrides") ?? {};
    const done = new Set(fired());
    const era = this.era ?? worldEra()?.id ?? "";
    const eraOptions = [...WORLD_ERAS.map(e => ({id: e.id, name: `${e.name} (${e.from} to ${e.to})`})), {id: "", name: "None: book events only"}]
      .map(e => `<option value="${esc(e.id)}" ${e.id === era ? "selected" : ""}>${esc(e.name)}</option>`).join("");
    const rows = list().filter(ev => shownIn(ev, era)).map(ev => `
      <div class="form-group wodx-event-row" data-search-item data-search-text="${esc(`${ev.name} ${ev.year} ${ev.lines.join(" ")} ${ev.place ?? ""} ${NEWS_PARTS[ev.region] ?? ""}`)}">
        <label class="wodx-event-name"><input type="checkbox" name="${esc(ev.id)}.on" ${ev.on ? "checked" : ""}>
          ${esc(ev.name)}${ev.metaplot ? " <em>(metaplot)</em>" : ""}${ev.hidden ? " <em>(hidden story)</em>" : ""}${ev.place ? ` <em>(${esc(ev.place)})</em>` : ""}</label>
        <div class="form-fields">
          <input type="number" name="${esc(ev.id)}.year" value="${esc(ov[ev.id]?.year ?? "")}" placeholder="${ev.year}" aria-label="Year" min="1" max="3000" step="1">
          <input type="number" name="${esc(ev.id)}.month" value="${esc(ov[ev.id]?.month ?? "")}" placeholder="${ev.month ?? "month"}" aria-label="Month" min="1" max="12" step="1">
          <input type="number" name="${esc(ev.id)}.day" value="${esc(ov[ev.id]?.day ?? "")}" placeholder="${ev.day ?? "day"}" aria-label="Day" min="1" max="31" step="1">
          <input type="text" name="${esc(ev.id)}.journal" value="${esc(ov[ev.id]?.journal ?? "")}" placeholder="Journal page UUID (optional)" aria-label="Journal page">
        </div>
        <p class="hint">${esc(dateLabel(ev))} · ${stateOf(ev, done).toLowerCase()} · ${esc(ev.summary)} <em>${esc(ev.source)}</em></p>
      </div>`).join("");
    const cur = setting("futureCascade") ?? "";
    const cascadeOptions = [{id: "", name: "None yet", pitch: ""}, ...CASCADES].map(c =>
      `<option value="${esc(c.id)}" ${c.id === cur ? "selected" : ""} title="${esc(c.pitch)}">${esc(c.name)}</option>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">${searchBox(".wodx-event-list", "Search events…", "Search events")}
        <div class="form-group"><label for="wodx-world-era">The world's history</label>
          <div class="form-fields"><select id="wodx-world-era" data-world-era data-fixed>${eraOptions}</select></div>
          <p class="hint">Which era of the world timeline to list. Switching saves this page first. The hidden story is told to the Storyteller only.</p></div>
        <p class="hint">Leave a date box empty to keep the book's date. Timeline: ${rule("futureBranch") ? "Future Darkness branch" : "classic"} (house rule switch).</p>
        <div class="form-group"><label for="wodx-future-cascade">Cascade for 2099</label>
          <div class="form-fields"><select id="wodx-future-cascade" name="futureCascade" data-fixed>${cascadeOptions}</select></div>
          <p class="hint">The Time of Future Judgement on the Future Darkness branch: one chain of endings, each setting off the next. Only the chosen Cascade's events fire.</p></div></div>
      <div class="wodx-scroll wodx-event-list">${rows}</div>
      <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save dated events</button></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelector("[data-world-era]")?.addEventListener("change", async e => {
      await EventsApp.save(this.element);
      this.era = e.target.value;
      this.render();
    });
  }

  static async #onSubmit(event, form) {
    await EventsApp.save(form);
  }

  /** Save the form. Events the page does not list (another era's) keep what they had (B5923). */
  static async save(form) {
    const prev = setting("eventOverrides") ?? {};
    const next = {};
    for ( const ev of EVENTS ) {
      const f = n => form.elements[`${ev.id}.${n}`];
      if ( !f("on") ) { if ( prev[ev.id] ) next[ev.id] = prev[ev.id]; continue; }
      const o = cleanOverride({on: !!f("on")?.checked, year: f("year")?.value, month: f("month")?.value, day: f("day")?.value});
      if ( o.on === !ev.metaplot ) delete o.on;
      const journal = String(f("journal")?.value ?? "").trim();
      if ( /^[A-Za-z]+\.[A-Za-z0-9]{16}(\.[A-Za-z]+\.[A-Za-z0-9]{16})*$/.test(journal) ) o.journal = journal;
      if ( Object.keys(o).length ) next[ev.id] = o;
    }
    const cascade = String(form.elements.futureCascade?.value ?? "");
    if ( cascade !== (setting("futureCascade") ?? "") && (!cascade || CASCADES.some(c => c.id === cascade)) ) await setSetting("futureCascade", cascade);
    await setSetting("eventOverrides", next);
  }
}
