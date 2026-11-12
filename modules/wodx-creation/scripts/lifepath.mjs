/**
 * WoDX Creation 0.11.0: the lifepath window. A step-by-step wizard before points are spent: set the line, the splat,
 * the birth year and the year of the turn, then play the scenes one by one. At the end the player keeps or drops
 * each suggestion and ticks the people from the past who should become NPCs. Nothing is bought.
 *
 * Kept on the actor as flags["wodx-creation"].lifepath (it goes with the character through a change of state).
 * People become NPCs through the People generator: at once for the Storyteller, through the approval queue for a
 * player. Opened from the Creation window, from a character sheet's header, or game.wodx.creation.lifepath(actor).
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import * as R from "./lifepath-rules.mjs";
import {generate, createPeople} from "./people.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch { return 1197; } };
const STAGE_LABEL = {birth: "Birth", youth: "Youth", adult: "Adult life", later: "Later life", turning: "The turn", splat: "Among your own", after: "The first teaching", after2: "The first years"};
const APPROVAL = "wodx-lifepath-people";

export const lifepathOf = actor => actor?.flags?.[MODULE_ID]?.lifepath ?? null;

/** The sheet's own words for its splat: short text fields of the system data, run together. */
export function splatText(actor) {
  const out = [];
  const take = obj => {
    for ( const [k, v] of Object.entries(obj ?? {}) ) {
      if ( typeof v === "string" && v.length && v.length < 48 && !/^(wod\.|<)/.test(v) && !/img|icon|notes|bio/i.test(k) ) out.push(v);
    }
  };
  take(actor?.system);
  take(actor?.system?.custom);
  take(actor?.system?.settings);
  return out.join(" ");
}

/** At start: the approval handler that makes a player's people. */
export function registerLifepath() {
  chron()?.registerApprovalHandler?.(APPROVAL, {label: "People from a lifepath", approve: entry => makePeople(entry.data)});
}

/** GM: make the ticked people as NPCs and write their ids back into the lifepath. data: {actorId, people}. */
export async function makePeople({actorId, people = []} = {}) {
  if ( !game.user.isGM || !people.length ) return [];
  const actor = game.actors.get(actorId);
  const batch = `lifepath:${actorId}:${Date.now()}`;
  const made = await createPeople({people: people.map((p, row) => ({...generate({batch, row}), lpRole: p.role}))});
  const rec = lifepathOf(actor);
  for ( const [i, a] of made.entries() ) {
    const p = people[i];
    const note = `<p><strong>From ${esc(actor?.name ?? "a character")}'s past</strong> (${p.year}): ${esc(p.role)}${p.note ? `, ${esc(p.note)}` : ""}.</p>`;
    await a.update({"system.notes": `${note}${a.system?.notes ?? ""}`, [`flags.${MODULE_ID}.pastOf`]: {id: actorId, role: p.role, year: p.year}});
    const match = rec?.people?.find(q => q.role === p.role && q.year === p.year && !q.actorId);
    if ( match ) { match.actorId = a.id; match.name = a.name; }
  }
  if ( actor && rec ) await actor.update({[`flags.${MODULE_ID}.lifepath.people`]: rec.people});
  return made;
}

export class LifepathApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-lifepath"],
    window: {title: "Lifepath", icon: "fa-solid fa-route", resizable: true},
    position: {width: 620, height: "auto"},
    actions: {
      begin: LifepathApp.#onBegin, pick: LifepathApp.#onPick, back: LifepathApp.#onBack, reroll: LifepathApp.#onReroll,
      save: LifepathApp.#onSave, restart: LifepathApp.#onRestart, clear: LifepathApp.#onClear
    }
  };

  static openFor(actor) {
    if ( !actor ) return ui.notifications.warn("Choose a character first.");
    if ( !actor.isOwner ) return ui.notifications.warn("You can only write a lifepath for your own character.");
    const height = Math.max(420, Math.min(780, window.innerHeight - 80));
    return new LifepathApp({actor, id: `wodx-lifepath-${actor.id}`, position: {height}}).render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    const t = game.wodx?.creation?.lifepathLine ?? null;
    const now = yearNow();
    const line = t ?? R.lineFor(this.actor.type, this.actor.system?.settings?.variant);
    this.setup = {line, splat: R.guessSplat(line, splatText(this.actor)) ?? "", turnYear: now, birthYear: now - 25};
    this.path = null;
  }

  get title() { return `Lifepath: ${this.actor?.name ?? ""}`; }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    if ( !this.path ) div.innerHTML = this.#setupHTML();
    else if ( R.done(this.path) ) div.innerHTML = this.#endHTML();
    else div.innerHTML = this.#stepHTML();
    div.querySelector("form.wodx-lp-setup")?.addEventListener("change", ev => this.#readSetup(ev.currentTarget, ev.target?.name === "line"));
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  #readSetup(form, rerender = false) {
    const f = form.elements;
    this.setup = {line: f.line.value, splat: f.splat?.value ?? "", birthYear: Number(f.birthYear.value) || this.setup.birthYear,
      turnYear: Number(f.turnYear?.value) || this.setup.turnYear};
    if ( rerender ) { this.setup.splat = R.guessSplat(this.setup.line, splatText(this.actor)) ?? ""; this.render(); }
  }

  #setupHTML() {
    const s = this.setup, L = R.LINES[s.line] ?? R.LINES.mortal;
    const rec = lifepathOf(this.actor);
    const lines = Object.entries(R.LINES).map(([k, v]) => `<option value="${k}" ${k === s.line ? "selected" : ""}>${esc(v.label)}</option>`).join("");
    const splats = R.splatsFor(s.line, s.line === "mortal" ? s.birthYear + 20 : s.turnYear);
    const open = R.lineOpen(s.line, s.turnYear);
    return `
      <div class="wodx-top"><p class="wodx-prompt">A short chain of scenes from ${esc(this.actor.name)}'s life before play. Each choice suggests Backgrounds, Abilities, Merits or Flaws and may name someone from the past. Nothing is spent: you keep or drop each suggestion at the end.</p></div>
      <div class="wodx-scroll">
        <form class="wodx-lp-setup">
          <div class="form-group"><label>Line</label><select name="line" data-fixed>${lines}</select></div>
          <div class="form-group"><label>${esc(L.splatLabel)}</label>${searchBox("select[name=splat]", "Search…", `Search ${L.splatLabel}`)}
            <select name="splat"><option value="">Not chosen yet</option>${splats.map(x => `<option value="${x.key}" ${x.key === s.splat ? "selected" : ""}>${esc(x.label)}${x.house ? " (house reading)" : ""}</option>`).join("")}</select></div>
          <div class="form-group"><label>Born in</label><input type="number" name="birthYear" min="1100" max="2290" value="${s.birthYear}"></div>
          ${s.line === "mortal" ? "" : `<div class="form-group"><label>${esc(L.turning ? L.turning[0].toUpperCase() + L.turning.slice(1) : "The turn")} in</label><input type="number" name="turnYear" min="1100" max="2300" value="${s.turnYear}"></div>`}
          ${open.ok ? "" : `<p class="wodx-warn">${esc(open.note)} The turn will be set to ${open.from}.</p>`}
        </form>
        ${rec ? `<h3>Already written</h3>${R.summaryHtml(R.summary(rec.path, {nowYear: yearNow()}), {name: this.actor.name, keptKeys: rec.kept})}` : ""}
      </div>
      <footer class="wodx-footer"><div class="wodx-buttons">
        <button type="button" data-action="begin"><i class="fa-solid fa-play"></i> ${rec ? "Write a new lifepath" : "Begin"}</button>
        ${rec ? `<button type="button" data-action="clear" title="Removes the lifepath from this character. People already made stay in the world."><i class="fa-solid fa-eraser"></i> Clear the lifepath</button>` : ""}
      </div></footer>`;
  }

  #stepHTML() {
    const p = this.path, stage = R.stageNow(p), e = R.currentEvent(p);
    const year = R.yearOf(p, stage), band = R.bandOf(year);
    const count = R.stagesFor(p.line).length;
    const others = R.candidates(p).length > 1;
    const body = e
      ? `<h2>${esc(e.title)}</h2><p>${esc(e.text)}</p>${e.house ? `<p class="wodx-quiet">A house reading: the books give no clear year for this.</p>` : ""}
        <div class="wodx-lp-options">${e.options.map((o, i) => `<button type="button" class="wodx-lp-option" data-action="pick" data-index="${i}">
          <strong>${esc(o.label)}</strong>${o.text ? `<br><span>${esc(o.text)}</span>` : ""}
          ${R.parseGives(o.g).length ? `<br><span class="wodx-quiet">${R.parseGives(o.g).map(g => esc(`${R.KINDS[g.kind]}: ${g.name}`)).join(", ")}</span>` : ""}
          ${o.p ? `<br><span class="wodx-quiet">Someone from your past: ${esc(R.parsePerson(o.p).role)}</span>` : ""}</button>`).join("")}</div>`
      : `<p class="wodx-empty">Nothing in the tables fits this stage for this line and year. Move on.</p><div class="wodx-buttons"><button type="button" data-action="pick" data-index="0">Move on</button></div>`;
    return `
      <div class="wodx-top"><p><strong>${esc(STAGE_LABEL[stage] ?? stage)}</strong>, ${year}: ${esc(band.label)}. <span class="wodx-quiet">Scene ${p.steps.length + 1} of ${count}.</span></p></div>
      <div class="wodx-scroll">${body}</div>
      <footer class="wodx-footer"><div class="wodx-buttons">
        <button type="button" data-action="back" ${p.steps.length ? "" : "disabled"}><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" data-action="reroll" ${others ? "" : "disabled"} title="Draw another scene for this stage"><i class="fa-solid fa-dice"></i> Another scene</button>
        <button type="button" data-action="restart"><i class="fa-solid fa-rotate-left"></i> Start over</button>
      </div></footer>`;
  }

  #endHTML() {
    const sum = R.summary(this.path, {nowYear: yearNow()});
    this.sum = sum;
    const story = sum.story.map(s => `<li><strong>${s.year}, ${esc(s.title)}.</strong> ${esc(s.choice)}</li>`).join("");
    const gives = sum.gives.map(g => `<li><label><input type="checkbox" name="keep" value="${esc(g.key)}" checked> ${esc(R.KINDS[g.kind])}: ${esc(g.name)}</label> <span class="wodx-quiet">(${esc(g.from.join(", "))})</span></li>`).join("");
    const people = sum.people.map((p, i) => `<li><label><input type="checkbox" name="person" value="${i}" ${p.pick ? "checked" : ""} ${p.alive ? "" : "disabled"}> ${esc(p.role)}${p.note ? `: ${esc(p.note)}` : ""}</label>
      <span class="wodx-quiet">(${p.year}${p.alive ? "" : ", long dead: kept as a name only"})</span></li>`).join("");
    return `
      <div class="wodx-top"><p>The lifepath is done. Keep what fits; drop the rest. Ticked people become NPCs ${game.user.isGM ? "now" : "once the Storyteller approves"}.</p></div>
      <div class="wodx-scroll">
        <h3>The story</h3><ol>${story}</ol>
        <h3>Suggestions</h3>${gives ? `<ul class="wodx-list">${gives}</ul>` : `<p class="wodx-quiet">None.</p>`}
        <h3>People from the past</h3>${people ? `<ul class="wodx-list">${people}</ul>` : `<p class="wodx-quiet">No one was named.</p>`}
      </div>
      <footer class="wodx-footer"><div class="wodx-buttons">
        <button type="button" data-action="back"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" data-action="save"><i class="fa-solid fa-floppy-disk"></i> Keep this lifepath</button>
      </div></footer>`;
  }

  static #onBegin() {
    const form = this.element.querySelector("form.wodx-lp-setup");
    if ( form ) this.#readSetup(form);
    const s = this.setup;
    const open = R.lineOpen(s.line, s.turnYear);
    const turnYear = open.ok ? s.turnYear : open.from;
    this.path = R.newPath({line: s.line, splat: s.splat || null, birthYear: Math.min(s.birthYear, turnYear), turnYear,
      seed: `${this.actor.id}:${foundry.utils.randomID(8)}`});
    this.render();
  }
  static #onPick(event, target) { this.path = R.choose(this.path, Number(target.dataset.index) || 0); this.render(); }
  static #onBack() { this.path = R.back(this.path); this.render(); }
  static #onReroll() { this.path = R.reroll(this.path); this.render(); }
  static #onRestart() { this.path = null; this.render(); }

  static async #onClear() {
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Clear the lifepath"},
      content: `<p>Remove the lifepath from ${esc(this.actor.name)}? People already made stay in the world.</p>`, rejectClose: false});
    if ( !ok ) return;
    await this.actor.update({[`flags.${MODULE_ID}.-=lifepath`]: null});
    this.render();
  }

  static async #onSave() {
    const el = this.element;
    const kept = [...el.querySelectorAll("input[name=keep]:checked")].map(i => i.value);
    const picked = [...el.querySelectorAll("input[name=person]:checked")].map(i => this.sum.people[Number(i.value)]).filter(Boolean);
    const rec = R.record(this.path, {kept, people: this.sum.people, at: game.time?.worldTime ?? 0});
    await this.actor.update({[`flags.${MODULE_ID}.lifepath`]: rec});
    const splat = R.splatByKey(this.path.line, this.path.splat);
    const html = R.summaryHtml(R.summary(this.path, {nowYear: yearNow()}), {name: this.actor.name, keptKeys: kept, splatLabel: splat?.label ?? ""});
    const owners = game.users.filter(u => u.isGM || this.actor.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({content: `<div class="wodx-card"><h3>Lifepath: ${esc(this.actor.name)}</h3>${html}</div>`, whisper: owners, speaker: {alias: "Creation"}});
    const people = picked.map(p => ({role: p.role, note: p.note, year: p.year}));
    if ( people.length ) {
      if ( game.user.isGM ) await makePeople({actorId: this.actor.id, people});
      else await chron()?.propose?.({type: APPROVAL, key: `lifepath:${this.actor.id}:${rec.path.seed}`,
        title: `People from ${this.actor.name}'s past: ${people.map(p => p.role).join(", ")}`.slice(0, 200),
        detail: people.map(p => `${p.role}${p.note ? `, ${p.note}` : ""} (${p.year})`).join("; "), data: {actorId: this.actor.id, people}});
    }
    ui.notifications.info(`${this.actor.name}'s lifepath is kept.${people.length && !game.user.isGM ? " The people wait for the Storyteller." : ""}`);
    this.close();
  }
}

/** A Lifepath button on the header of an owned character sheet (old and new sheet classes). */
export function registerSheetButton() {
  const usable = actor => actor?.isOwner && !/group|spirit|creature/i.test(String(actor.type));
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !usable(sheet.actor) ) return;
    buttons.unshift({label: "Lifepath", class: "wodx-lifepath", icon: "fa-solid fa-route", onclick: () => LifepathApp.openFor(sheet.actor)});
  });
  Hooks.on("getHeaderControlsActorSheetV2", (sheet, controls) => {
    if ( !usable(sheet.actor) ) return;
    controls.push({label: "Lifepath", icon: "fa-solid fa-route", action: "wodxLifepath", onClick: () => LifepathApp.openFor(sheet.actor)});
  });
}
