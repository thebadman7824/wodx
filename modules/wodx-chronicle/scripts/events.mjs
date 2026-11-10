import {MODULE_ID, esc, isActiveGM, rule, setting, setSetting, log} from "./util.mjs";
import {getEngine} from "./calendar.mjs";
import {searchBox} from "./search.mjs";
import EVENT_DATA from "../data/events.mjs";
import FUTURE_DATA from "../data/future-events.mjs";
import {eventTable, firedAt, diffFired, dateLabel, cleanOverride} from "./events-rules.mjs";

/**
 * Dated events. When the Chronicle Clock passes an event's date it fires once: a chat card, the hook
 * wodxEventFired(event), and a line in the Chronicle Rules journal. Setting the clock back undoes it
 * (wodxEventUndone). A time skip that crosses several events posts one card for all of them.
 * Other modules ask with game.wodx.chronicle.events.has(id).
 */

export const EVENTS = [...EVENT_DATA.events, ...FUTURE_DATA.events];
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
  await postCard(newly.map(byId), undone.map(byId), label);
  return {fired: newly, undone};
}

async function postCard(newly, undone, label) {
  const item = ev => {
    const link = ev.journal ? ` @UUID[${esc(ev.journal)}]{Read more}` : "";
    return `<li><strong>${esc(dateLabel(ev))}: ${esc(ev.name)}.</strong> ${esc(ev.summary)}${link}</li>`;
  };
  const parts = [];
  if ( newly.length ) {
    const title = newly.length === 1 ? "The world turns" : `The world turns${label ? ` during ${esc(label)}` : ""}`;
    parts.push(`<h3>${title}</h3><ul>${newly.map(item).join("")}</ul>`);
  }
  if ( undone.length ) {
    parts.push(`<h3>Not yet happened</h3><p>The clock is before these again, so they count as not yet happened:</p><ul>${undone.map(ev => `<li>${esc(ev.name)}</li>`).join("")}</ul>`);
  }
  await ChatMessage.create({content: `<div class="wodx-card wodx-events">${parts.join("")}</div>`, speaker: {alias: "Chronicle"}});
}

/** The "Dated events" page of Chronicle Rules. */
export function eventsHTML() {
  const done = new Set(fired());
  const rows = list().map(ev => `<tr><td>${esc(dateLabel(ev))}${ev.moved ? " (moved)" : ""}</td><td>${esc(ev.name)}</td>
    <td>${stateOf(ev, done)}</td><td>${esc(ev.source)}${ev.dateNote ? `<br><em>${esc(ev.dateNote)}</em>` : ""}</td></tr>`).join("");
  return `<p>Each event fires once when the clock passes its date. The Storyteller turns them on or off and moves them in Configure Settings, Dated events.</p>
    <p><strong>Timeline:</strong> ${rule("futureBranch") ? "Future Darkness branch" : "classic"}. ${esc(BRANCH_NOTE)}</p>
    ${rule("futureBranch") ? `<p>${esc(cascadeLine())}</p>` : ""}
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

  static open() {
    this.#instance ??= new EventsApp();
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const ov = setting("eventOverrides") ?? {};
    const done = new Set(fired());
    const rows = list().map(ev => `
      <div class="form-group wodx-event-row" data-search-item data-search-text="${esc(`${ev.name} ${ev.year} ${ev.lines.join(" ")}`)}">
        <label class="wodx-event-name"><input type="checkbox" name="${esc(ev.id)}.on" ${ev.on ? "checked" : ""}>
          ${esc(ev.name)}${ev.metaplot ? " <em>(metaplot)</em>" : ""}</label>
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

  static async #onSubmit(event, form) {
    const next = {};
    for ( const ev of EVENTS ) {
      const f = n => form.elements[`${ev.id}.${n}`];
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
