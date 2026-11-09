import {MODULE_ID, esc, rule, setting, setSetting} from "./util.mjs";
import {describeTime, getEngine, secondsToNextDusk, secondsToNextDawn, MONTHS, REFORMS} from "./calendar.mjs";
import * as eras from "./eras.mjs";
import * as approvals from "./approvals.mjs";
import * as safety from "./safety.mjs";
import {findJournal} from "./journals.mjs";
import {HouseRulesApp} from "./house-rules-app.mjs";
import {runEraTest} from "./era-test.mjs";
import {searchBox} from "./search.mjs";
import * as church from "./church.mjs";
import {reckon} from "./reckoning-rules.mjs";

const {ApplicationV2, DialogV2} = foundry.applications.api;

/** The Chronicle Clock: date, night, moon, era, and the table's tools in one window. */
export class ClockApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-clock",
    classes: ["wodx", "wodx-clock"],
    window: {title: "Chronicle Clock", icon: "fa-solid fa-moon", resizable: false},
    position: {width: 400, height: "auto"},
    actions: {
      advance: ClockApp.#onAdvance,
      dusk: ClockApp.#onDusk,
      dawn: ClockApp.#onDawn,
      endScene: () => game.modules.get("wodx-chronicle")?.api?.endScene?.(),
      setDate: ClockApp.#onSetDate,
      passYears: () => (game.modules.get("wodx-creation")?.api?.passYears?.() ?? ui.notifications.warn("Pass the Years needs WoDX Creation (0.2 or later).")),
      lockEra: ClockApp.#onLockEra,
      xcard: () => safety.pressXCard(),
      linesVeils: () => safety.submitLineOrVeil(),
      manageLinesVeils: () => safety.manageLinesVeils(),
      sessionZero: () => safety.openSessionZero(),
      ask: () => approvals.askStoryteller(),
      approvals: () => approvals.ApprovalsApp.open(),
      rules: ClockApp.#onRules,
      houseRules: () => HouseRulesApp.open(),
      eraTest: () => runEraTest(),
      hold: ClockApp.#onHold,
      languages: () => game.modules.get("wodx-chronicle")?.api?.languages?.open(),
      tour: () => game.modules.get("wodx-chronicle")?.api?.tours?.start()
    }
  };

  static #instance;

  static open() {
    this.#instance ??= new ClockApp();
    return this.#instance.render({force: true});
  }

  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  async _renderHTML() {
    const gm = game.user.isGM;
    const now = describeTime(game.time.worldTime, setting("latitude"));
    const a = eras.activeEra();
    const target = eras.targetEra();
    const p = a.profile;
    const waiting = approvals.pending().length;
    const lockId = setting("eraLock");
    const held = !!setting("hold");

    const eraOptions = [`<option value="">Follow the date</option>`]
      .concat(eras.profiles().map(e => `<option value="${esc(e.id)}" ${e.id === lockId ? "selected" : ""}>${esc(e.name)}</option>`))
      .join("");

    const moon = now.moon;
    const ch = church.on(now);
    const night = now.isNight ? "Night" : "Day";
    // A player sees the date and hour the way the character would hear them told
    const told = (!gm && rule("eraReckoning")) ? reckon(now, {church: ch, eraId: p?.id ?? ""}) : null;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <section class="wodx-clock-face ${now.isNight ? "is-night" : "is-day"}">
        <div class="wodx-date">${esc(told?.date ?? now.dateLabel)}</div>
        <div class="wodx-time">${esc(told?.time ?? now.timeLabel)} <span class="wodx-tag">${night}</span></div>
        <div class="wodx-quiet">${esc(now.calendarLabel)} calendar</div>
        <dl class="wodx-facts">
          <dt>Sunset</dt><dd>${esc(now.sunset)}</dd>
          <dt>Sunrise</dt><dd>${esc(now.sunrise)}</dd>
          <dt>Dark hours</dt><dd>${now.darkHours.toFixed(1)}</dd>
          <dt>Moon</dt><dd>${esc(moon.name)}, ${Math.round(moon.illumination * 100)}% lit</dd>
          <dt>Auspice moon</dt><dd>${esc(moon.auspice)}</dd>
          <dt>Church year</dt><dd>${esc(ch.label)}</dd>
        </dl>
        ${gm && ch.active && ch.lines.length ? `<p class="wodx-quiet wodx-church">${ch.lines.map(esc).join(" ")}</p>` : ""}
      </section>
      <section class="wodx-era">
        <h3>${esc(p?.name ?? "No era")} ${a.interlude ? `<span class="wodx-tag">between eras</span>` : ""} ${lockId ? `<span class="wodx-tag">locked</span>` : ""}</h3>
        ${p ? `<p>${esc(p.switches)}</p><p class="wodx-quiet">Books: ${esc(p.basis)}</p>` : ""}
        ${gm && target.profile && p && target.profile.id !== p.id ? `<p class="wodx-notice">The date calls for ${esc(target.profile.name)}. ${waiting ? "A change is waiting in the approval queue." : ""}</p>` : ""}
        ${rule("lightTouch") ? `<p class="wodx-notice">Light-touch mode is on: no proposals tonight.</p>` : ""}
        ${held ? `<p class="wodx-notice">The world is held: the clock moves, but nothing reacts to it.</p>` : ""}
      </section>
      ${gm ? `
      <section class="wodx-controls">
        <div class="wodx-buttons">
          <button type="button" data-action="advance" data-seconds="600">+10 min</button>
          <button type="button" data-action="advance" data-seconds="3600">+1 hour</button>
          <button type="button" data-action="dusk"><i class="fa-solid fa-moon"></i> Next dusk</button>
          <button type="button" data-action="dawn"><i class="fa-solid fa-sun"></i> Next dawn</button>
          <button type="button" data-action="advance" data-seconds="86400">+1 day</button>
          <button type="button" data-action="advance" data-seconds="604800">+1 week</button>
          <button type="button" data-action="setDate"><i class="fa-solid fa-calendar-day"></i> Set date</button>
          <button type="button" data-action="endScene" title="Every effect that lasts a scene ends now"><i class="fa-solid fa-clapperboard"></i> End the scene</button>
          <button type="button" data-action="passYears" title="A time skip: years pass, and each character's changes are proposed"><i class="fa-solid fa-hourglass-half"></i> Pass the years</button>
        </div>
        <div class="form-group"><label>Era</label>
          ${searchBox("select[name=eraLock]", "Search eras…", "Search eras")}
          <select name="eraLock">${eraOptions}</select></div>
      </section>` : ""}
      <section class="wodx-tools">
        <div class="wodx-buttons">
          <button type="button" class="wodx-xcard-button" data-action="xcard" title="Anonymous: nobody is told who pressed it"><strong>X</strong> X-card</button>
          <button type="button" data-action="linesVeils"><i class="fa-solid fa-eye-slash"></i> Lines and veils</button>
          <button type="button" data-action="sessionZero"><i class="fa-solid fa-list-check"></i> Session Zero</button>
          <button type="button" data-action="rules"><i class="fa-solid fa-book"></i> Chronicle Rules</button>
          <button type="button" data-action="languages"><i class="fa-solid fa-language"></i> Languages</button>
          <button type="button" data-action="tour" title="A short guided tour of the WoDX tools"><i class="fa-solid fa-circle-question"></i> Tour</button>
          ${gm ? `
          <button type="button" data-action="approvals"><i class="fa-solid fa-inbox"></i> Approvals${waiting ? ` (${waiting})` : ""}</button>
          <button type="button" data-action="houseRules"><i class="fa-solid fa-scale-balanced"></i> House rules</button>
          <button type="button" data-action="manageLinesVeils"><i class="fa-solid fa-eraser"></i> Remove a line or veil</button>
          <button type="button" data-action="eraTest"><i class="fa-solid fa-flask"></i> Era test</button>
          <button type="button" data-action="hold" title="Move the clock without the world reacting: no routines, faction turns, dated events or expiring effects"><i class="fa-solid fa-${held ? "play" : "pause"}"></i> ${held ? "Release the world" : "Hold the world"}</button>`
          : `<button type="button" data-action="ask"><i class="fa-solid fa-hand"></i> Ask the Storyteller</button>`}
        </div>
      </section>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    // The era select uses change, not click
    const select = this.element.querySelector("select[name=eraLock]");
    select?.addEventListener("change", ev => ClockApp.#onLockEra.call(this, ev, select));
  }

  static async #onAdvance(event, target) {
    const seconds = Number(target.dataset.seconds);
    if ( seconds ) await game.time.advance(seconds);
  }

  static async #onDusk() {
    await game.time.advance(secondsToNextDusk(game.time.worldTime, setting("latitude")));
  }

  static async #onDawn() {
    await game.time.advance(secondsToNextDawn(game.time.worldTime, setting("latitude")));
  }

  static async #onLockEra(event, target) {
    if ( event.type === "click" ) return; // handled on change
    await setSetting("eraLock", target.value);
  }

  static async #onHold() {
    const api = game.modules.get("wodx-chronicle")?.api;
    await api?.hold?.(!api.isHeld());
  }

  static async #onRules() {
    let journal = findJournal("chronicle-rules");
    if ( !journal && game.user.isGM ) journal = await eras.refreshRulesJournal().then(() => findJournal("chronicle-rules"));
    if ( !journal ) return ui.notifications.info("The Storyteller has not written the Chronicle Rules yet.");
    journal.sheet.render(true);
  }

  static async #onSetDate() {
    await setDateDialog();
  }
}

/** GM dialog: set the date and time. Days skipped at the reform are refused. */
export async function setDateDialog({title = "Set the date"} = {}) {
  const now = getEngine().timeToDate(game.time.worldTime);
  const months = MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.month ? "selected" : ""}>${m}</option>`).join("");
  const reform = REFORMS[setting("reform")]?.label ?? "";
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title},
    content: `
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${now.year}" step="1"></div>
      <div class="form-group"><label>Month</label><select name="month" data-fixed>${months}</select></div>
      <div class="form-group"><label>Day</label><input type="number" name="day" value="${now.day}" min="1" max="31" step="1"></div>
      <div class="form-group"><label>Hour</label><input type="number" name="hour" value="${now.hour}" min="0" max="23" step="1"></div>
      <div class="form-group"><label>Minute</label><input type="number" name="minute" value="${now.minute}" min="0" max="59" step="1"></div>
      <p class="wodx-quiet">Dates are on the calendar in force that day: Julian before the reform, Gregorian after. Reform: ${esc(reform)}.</p>`,
    ok: {
      label: "Set",
      callback: (event, button) => {
        const f = button.form.elements;
        return {year: f.year.valueAsNumber, month: Number(f.month.value), day: f.day.valueAsNumber,
          hour: f.hour.valueAsNumber || 0, minute: f.minute.valueAsNumber || 0};
      }
    },
    rejectClose: false
  });
  if ( !result || !Number.isInteger(result.year) ) return false;
  const engine = getEngine();
  if ( result.day > engine.nominalDays(result.year, result.month) ) {
    ui.notifications.warn(`${MONTHS[result.month - 1]} ${result.year} has only ${engine.nominalDays(result.year, result.month)} days.`);
    return false;
  }
  let time;
  try {
    time = engine.dateToTime(result);
  } catch (err) {
    ui.notifications.warn(`${result.day} ${MONTHS[result.month - 1]} ${result.year} never happened here: it was skipped at the calendar reform.`);
    return false;
  }
  await game.time.set(time);
  await setSetting("openingSet", true);
  await eras.refreshRulesJournal();
  return true;
}
