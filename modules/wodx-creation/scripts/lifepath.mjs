/**
 * WoDX Creation 0.17.0: the mortal years are a drill-down the player steers (continent, region, your people, origin,
 * then childhood, the teenage years and each chapter of adult life the age allows; lifepath-drill-rules.mjs). The
 * turn, the splat's scene and the first years after follow as before. At the end the ticked picks can be put on the
 * sheet, paid from the book's creation points. A player's own answers, or a character younger than 12, wait for the
 * Storyteller first.
 *
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
import * as D from "./lifepath-drill-rules.mjs";
import {ORIGINS} from "../data/lifepath-drill.mjs";
import {TOTALS} from "./totals-rules.mjs";
import {defaultLine} from "../data/creation-totals.mjs";
import {traitGroups} from "./first-night-build-rules.mjs";
import {MERITS_FLAWS} from "../../wodx-chronicle/data/trait-effects.mjs";
import {WORLD_REGIONS, cultureOf} from "../../wodx-chronicle/scripts/world-rules.mjs";
import {generate, createPeople} from "./people.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch { return 1197; } };
const STAGE_LABEL = {birth: "Birth", youth: "Youth", adult: "Adult life", later: "Later life", turning: "The turn", splat: "Among your own", after: "The first teaching", after2: "The first years"};
const APPROVAL = "wodx-lifepath-people";
const REVIEW = "wodx-lifepath-review";
const OWN_BACKGROUNDS = ["Allies", "Contacts", "Fame", "Influence", "Mentor", "Resources", "Retainers", "Status"];
const homeland = () => { try { return chron()?.world?.homeland?.() ?? null; } catch { return null; } };

/** The book the character is built by: its totals and the Merit and Flaw table. */
function bookOf(actor) {
  let eraId = "";
  try { eraId = chron()?.eras?.activeEra?.()?.profile?.id ?? ""; } catch { /* none */ }
  const L = TOTALS[defaultLine(actor.type, {variant: actor.system?.settings?.variant ?? "", eraId})] ?? {};
  return {label: L.short ?? L.label ?? "the book", abilityCap: L.abilityCap ?? 3, backgrounds: L.backgrounds ?? null, flaws: L.flaws ?? 7, table: MERITS_FLAWS};
}
const sheetView = actor => {
  const g = traitGroups(actor.system ?? {});
  return {abilities: [...g.talent, ...g.skill, ...g.knowledge],
    features: [...(actor.items ?? [])].filter(i => i.type === "Feature").map(i => ({id: i.id, name: i.name, type: i.system?.type, value: i.system?.value}))};
};

/**
 * Put kept lifepath picks on the sheet: an Ability up one dot, a Background at one dot or up one, Merits and Flaws
 * at the book's cost. Nothing is given beyond the book: the creation check counts every dot. kept: pool entries.
 * Returns the plan that was carried out ({ops, skipped, ...}).
 */
export async function applyToSheet(actor, kept = []) {
  const plan = D.sheetPlan(sheetView(actor), kept, bookOf(actor));
  const up = {}, raise = [], create = [];
  for ( const o of plan.ops ) {
    if ( o.op === "ability" ) up[o.path] = o.to;
    else if ( o.op === "raise" ) raise.push({_id: o.id, "system.value": o.to, "system.level": String(o.to)});
    else create.push({name: o.name, type: "Feature", system: {type: o.type, value: o.value, level: String(o.value)}, flags: {[MODULE_ID]: {lifepath: true}}});
  }
  if ( Object.keys(up).length ) await actor.update(up);
  if ( raise.length ) await actor.updateEmbeddedDocuments("Item", raise);
  if ( create.length ) await actor.createEmbeddedDocuments("Item", create);
  return plan;
}

/** The plan as chat text. */
function planHtml(plan) {
  const word = t => t.endsWith("background") ? "Background" : t.endsWith("merit") ? "Merit" : "Flaw";
  const did = plan.ops.map(o => o.op === "ability" ? `${esc(o.label)} ${o.from} to ${o.to}` : o.op === "raise" ? `${esc(o.name)} ${o.from} to ${o.to}`
    : `${word(o.type)}: ${esc(o.name)}${o.type.endsWith("background") ? " 1" : ` (${o.value} ${o.value === 1 ? "point" : "points"}${o.range ? ", the least the book allows" : ""})`}`);
  const not = plan.skipped.filter(x => !/^A note/.test(x.why)).map(x => `${esc(x.key.split(":")[1])}: ${esc(x.why)}`);
  return `${did.length ? `<h3>Put on the sheet</h3><ul>${did.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}${not.length ? `<h3>Left off</h3><ul>${not.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
    <p class="wodx-quiet">Every dot and point counts against the book's creation totals. Open the creation check to see what is left.</p>`;
}

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
  chron()?.registerApprovalHandler?.(REVIEW, {label: "A lifepath with the player's own answers, or a character younger than 12", approve: entry => approveReview(entry.data)});
}

/** GM: make the ticked people as NPCs and write their ids back into the lifepath. data: {actorId, people}. */
export async function makePeople({actorId, people = []} = {}) {
  if ( !game.user.isGM || !people.length ) return [];
  const actor = game.actors.get(actorId);
  const batch = `lifepath:${actorId}:${Date.now()}`;
  const made = await createPeople({people: people.map((p, row) => ({...generate({batch, row, culture: p.region ? cultureOf(p.region) : null}), lpRole: p.role}))});
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

/** GM: a player's lifepath is approved; what was ticked for the sheet goes on it now. data: {actorId, apply}. */
export async function approveReview({actorId, apply = []} = {}) {
  if ( !game.user.isGM ) return null;
  const actor = game.actors.get(actorId);
  const rec = lifepathOf(actor);
  if ( !actor || !rec ) return null;
  await actor.update({[`flags.${MODULE_ID}.lifepath.review`]: "approved"});
  if ( !apply.length ) return null;
  const pool = R.summary(rec.path).gives.filter(g => apply.includes(g.key));
  const plan = await applyToSheet(actor, pool);
  const owners = game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({content: `<div class="wodx-card"><h3>Lifepath approved: ${esc(actor.name)}</h3>${planHtml(plan)}</div>`, whisper: owners, speaker: {alias: "Creation"}});
  return plan;
}

export class LifepathApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-lifepath"],
    window: {title: "Lifepath", icon: "fa-solid fa-route", resizable: true},
    position: {width: 620, height: "auto"},
    actions: {
      begin: LifepathApp.#onBegin, pick: LifepathApp.#onPick, back: LifepathApp.#onBack, reroll: LifepathApp.#onReroll,
      own: LifepathApp.#onOwn, surprise: LifepathApp.#onSurprise, others: LifepathApp.#onOthers,
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
    this.drill = null;
  }

  get title() { return `Lifepath: ${this.actor?.name ?? ""}`; }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    if ( !this.path && !this.drill ) div.innerHTML = this.#setupHTML();
    else if ( !this.path ) div.innerHTML = this.#drillHTML();
    else if ( R.done(this.path) ) div.innerHTML = this.#endHTML();
    else div.innerHTML = this.#stepHTML();
    div.querySelector("select[name=place]")?.addEventListener("change", ev => { this.drill = D.moveTo(this.drill, ev.target.dataset.stage, ev.target.value); this.render(); });
    div.querySelector("input[name=placeName]")?.addEventListener("change", ev => { this.drill = D.setPlaceName(this.drill, ev.target.value); });
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
      <div class="wodx-top"><p class="wodx-prompt">${esc(this.actor.name)}'s life before play, step by step: where in the world, which family, then childhood, the teenage years and adult life as far as the character's age reaches. Each choice offers Backgrounds, Abilities, Merits or Flaws and may name someone from the past. At the end you tick what to keep.</p></div>
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

  /** One step of the drill-down. */
  #drillHTML() {
    const d = this.drill, info = D.stepsOf(d), step = D.current(d);
    const n = info.steps.filter(s => d.picks[s.id]).length;
    const land = step.region ? WORLD_REGIONS[step.region]?.label ?? "" : "";
    const span = step.stage ? `, age ${step.from}${step.to > step.from ? ` to ${step.to}` : ""}` : "";
    const gives = g => D.parseGives(g).map(x => esc(x.kind === "note" ? x.name : `${D.KINDS[x.kind]}: ${x.name}`)).join(", ");
    const opts = step.options.map(o => `<button type="button" class="wodx-lp-option" data-action="pick" data-id="${esc(o.id)}">
      <strong>${esc(o.label)}</strong>${o.tone ? ` <span class="wodx-quiet">(${esc(D.TONES[o.tone])})</span>` : ""}${o.local ? ` <span class="wodx-quiet">(of this land and age)</span>` : ""}${o.line ? ` <span class="wodx-quiet">(of your kind)</span>` : ""}
      ${o.text ? `<br><span>${esc(o.text)}</span>` : ""}${o.g ? `<br><span class="wodx-quiet">${gives(o.g)}</span>` : ""}
      ${o.p ? `<br><span class="wodx-quiet">Someone from your past: ${esc(String(o.p).split("|")[0])}</span>` : ""}</button>`).join("");
    const move = step.movable ? `<div class="form-group"><label>Where this part of life happened</label>${searchBox("select[name=place]", "Search…", "Search the regions")}
      <select name="place" data-stage="${esc(step.stage)}">${D.continents(step.year).map(c => `<optgroup label="${esc(c.label)}">${c.regions.map(r => `<option value="${r.id}" ${r.id === step.region ? "selected" : ""}>${esc(r.label)}</option>`).join("")}</optgroup>`).join("")}</select></div>` : "";
    const place = step.kind === "origin" ? `<div class="form-group"><label>Where exactly (optional)</label><input type="text" name="placeName" maxlength="80" value="${esc(d.placeName ?? "")}" placeholder="A town, a province, a quarter"></div>` : "";
    const g = traitGroups(this.actor.system ?? {});
    const abilities = [...g.talent, ...g.skill, ...g.knowledge].map(a => a.label);
    const mf = MERITS_FLAWS.filter(t => t.kind === "merit" || t.kind === "flaw").map(t => `${t.kind} ${t.name}`);
    const own = step.own ? `<details class="wodx-lp-own"><summary>Something else</summary>
      <p class="wodx-quiet">Write your own answer${game.user.isGM ? "" : "; the Storyteller looks at it before it counts"}.</p>
      <div class="form-group"><label>Your answer</label><input type="text" name="ownText" maxlength="160"></div>
      ${step.kind === "origin" ? `<div class="form-group"><label>Closest to</label><select name="ownBase" data-fixed>${ORIGINS.filter(o => !o[6]).map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select></div>` : ""}
      ${["people", "arrival"].includes(step.kind) ? "" : `
      <div class="form-group"><label>A Background it offers</label><select name="ownBg" data-fixed><option value="">None</option>${OWN_BACKGROUNDS.map(b => `<option>${b}</option>`).join("")}</select></div>
      <div class="form-group"><label>An Ability it offers</label>${searchBox("select[name=ownAb]", "Search…", "Search the Abilities")}<select name="ownAb"><option value="">None</option>${abilities.map(a => `<option>${esc(a)}</option>`).join("")}</select></div>
      <div class="form-group"><label>A Merit or Flaw it offers</label>${searchBox("select[name=ownMf]", "Search…", "Search the Merits and Flaws")}<select name="ownMf"><option value="">None</option>${[...new Set(mf)].sort().map(x => `<option value="${esc(x)}">${esc(x.replace(/^merit /, "Merit: ").replace(/^flaw /, "Flaw: "))}</option>`).join("")}</select></div>`}
      <div class="wodx-buttons"><button type="button" data-action="own"><i class="fa-solid fa-pen"></i> Use my answer</button></div></details>` : "";
    return `
      <div class="wodx-top"><p><strong>${esc(step.title)}</strong>, ${step.year}${span}${step.age ? `: ${esc(step.age)}` : land ? `: ${esc(land)}` : ""}. <span class="wodx-quiet">Choice ${n + 1}.</span></p>
        ${info.closed && step.stage ? `<p class="wodx-quiet">${esc(info.closed)}</p>` : ""}</div>
      <div class="wodx-scroll">${move}${place}
        ${step.five ? `<p class="wodx-quiet">${/-mark$/.test(step.id) ? "Five things that could have marked those years" : "Five ways those years could have gone"}: two good, two hard, one neither. Pick one, or draw five others.</p>` : ""}
        ${step.kind === "region" ? `<div class="form-group"><label>Find a region</label>${searchBox(".wodx-lp-options .wodx-lp-option", "Search…", "Search the regions")}</div>` : ""}
        <div class="wodx-lp-options">${opts}</div>${own}</div>
      <footer class="wodx-footer"><div class="wodx-buttons">
        <button type="button" data-action="back"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" data-action="surprise" title="Let the dice pick one of these"><i class="fa-solid fa-dice"></i> Surprise me</button>
        ${step.five ? `<button type="button" data-action="others" title="Draw five other things for these years"><i class="fa-solid fa-rotate"></i> Five others</button>` : ""}
        <button type="button" data-action="restart"><i class="fa-solid fa-rotate-left"></i> Start over</button>
      </div></footer>`;
  }

  /** After a drill pick: when the drill is done, the path takes over for the turn and after. */
  #afterDrill() {
    if ( D.done(this.drill) ) {
      const s = this.begun;
      this.path = R.newPath({line: s.line, splat: s.splat || null, birthYear: s.birthYear, turnYear: s.turnYear, seed: this.drill.seed, drill: this.drill});
    }
    this.render();
  }

  #stepHTML() {
    const p = this.path, stage = R.stageNow(p), e = R.currentEvent(p);
    const year = R.yearOf(p, stage), band = R.bandOf(year);
    const count = R.stagesOf(p).length;
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
    const book = bookOf(this.actor);
    const price = g => { if ( g.kind !== "merit" && g.kind !== "flaw" ) return ""; const c = D.costOf(g.name, g.kind, book.table); return c ? `, ${c.cost} ${c.cost === 1 ? "point" : "points"}${c.range ? " or more" : ""}` : ", not in the book table"; };
    const gives = sum.gives.map(g => `<li><label><input type="checkbox" name="keep" value="${esc(g.key)}" ${g.kind === "flaw" ? "" : "checked"}> ${esc(R.KINDS[g.kind])}: ${esc(g.name)}</label> <span class="wodx-quiet">(${esc(g.from.join(", "))}${price(g)})</span></li>`).join("");
    const reasons = this.path.drill && !game.user.isGM ? D.reviewReasons(this.path.drill) : [];
    this.reasons = reasons;
    const sheet = `<h3>On the sheet</h3><p><label><input type="checkbox" name="apply" checked> Put what is ticked above on the sheet</label></p>
      <p class="wodx-quiet">Paid from the creation points of ${esc(book.label)}: an Ability goes up one dot (never past ${book.abilityCap} at creation), a Background starts at one dot or goes up one${book.backgrounds ? ` (the book gives ${book.backgrounds} dots)` : ""}, a Merit costs its freebie points, and Flaws stop at ${book.flaws} points. Flaws start unticked: tick the ones you want. The tongue of the land of birth is known at no cost.${reasons.length ? ` This lifepath has ${esc(reasons.join(" and "))}, so the Storyteller looks at it first and the sheet changes after that.` : ""}</p>`;
    const people = sum.people.map((p, i) => `<li><label><input type="checkbox" name="person" value="${i}" ${p.pick ? "checked" : ""} ${p.alive ? "" : "disabled"}> ${esc(p.role)}${p.note ? `: ${esc(p.note)}` : ""}</label>
      <span class="wodx-quiet">(${p.year}${p.alive ? "" : ", long dead: kept as a name only"})</span></li>`).join("");
    return `
      <div class="wodx-top"><p>The lifepath is done. Keep what fits; drop the rest. Ticked people become NPCs ${game.user.isGM ? "now" : "once the Storyteller approves"}.</p></div>
      <div class="wodx-scroll">
        <h3>The story</h3><ol>${story}</ol>
        <h3>Suggestions</h3>${gives ? `<ul class="wodx-list">${gives}</ul>` : `<p class="wodx-quiet">None.</p>`}
        ${sheet}
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
    const birthYear = Math.min(s.birthYear, turnYear);
    const age = (s.line === "mortal" ? Math.max(yearNow(), birthYear) : turnYear) - birthYear;
    this.begun = {line: s.line, splat: s.splat, birthYear, turnYear};
    this.path = null;
    this.drill = D.newDrill({birthYear, age, line: s.line, homeland: homeland(), seed: `${this.actor.id}:${foundry.utils.randomID(8)}`});
    this.render();
  }
  static #onPick(event, target) {
    if ( !this.path ) { this.drill = D.pick(this.drill, D.current(this.drill)?.id, target.dataset.id); return this.#afterDrill(); }
    this.path = R.choose(this.path, Number(target.dataset.index) || 0);
    this.render();
  }
  static #onOwn() {
    const el = this.element, step = D.current(this.drill);
    const text = el.querySelector("input[name=ownText]")?.value ?? "";
    if ( !text.trim() ) return ui.notifications.warn("Write your answer first.");
    const bg = el.querySelector("select[name=ownBg]")?.value, ab = el.querySelector("select[name=ownAb]")?.value, mf = el.querySelector("select[name=ownMf]")?.value;
    const gives = [bg ? `bg ${bg}` : "", ab ? `ab ${ab}` : "", mf || ""].filter(Boolean).join("|");
    this.drill = D.pickOwn(this.drill, step.id, text, {gives, base: el.querySelector("select[name=ownBase]")?.value ?? null});
    this.#afterDrill();
  }
  static #onSurprise() { this.drill = D.surprise(this.drill); this.#afterDrill(); }
  static #onOthers() { this.drill = D.reroll(this.drill, D.current(this.drill)?.id); this.render(); }
  static #onBack() {
    if ( this.path?.steps.length ) this.path = R.back(this.path);
    else if ( this.drill ) {
      this.path = null;
      if ( Object.keys(this.drill.picks).length ) this.drill = D.back(this.drill); else this.drill = null;
    }
    this.render();
  }
  static #onReroll() { this.path = R.reroll(this.path); this.render(); }
  static #onRestart() { this.path = null; this.drill = null; this.render(); }

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
    const apply = el.querySelector("input[name=apply]")?.checked ? kept : [];
    const waits = (this.reasons ?? []).length > 0;
    if ( waits ) rec.review = "waiting";
    await this.actor.update({[`flags.${MODULE_ID}.lifepath`]: rec});
    let plan = null;
    if ( waits ) await chron()?.propose?.({type: REVIEW, key: `lifepath-review:${this.actor.id}:${rec.path.seed}`,
      title: `${this.actor.name}'s lifepath has ${this.reasons.join(" and ")}`.slice(0, 200),
      detail: this.sum.story.map(s => `${s.year} ${s.title}: ${s.choice}`).join("; ").slice(0, 1500), data: {actorId: this.actor.id, apply}});
    else if ( apply.length ) plan = await applyToSheet(this.actor, this.sum.gives.filter(g => apply.includes(g.key)));
    const splat = R.splatByKey(this.path.line, this.path.splat);
    const html = R.summaryHtml(R.summary(this.path, {nowYear: yearNow()}), {name: this.actor.name, keptKeys: kept, splatLabel: splat?.label ?? ""});
    const owners = game.users.filter(u => u.isGM || this.actor.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({content: `<div class="wodx-card"><h3>Lifepath: ${esc(this.actor.name)}</h3>${html}${plan ? planHtml(plan) : ""}${waits ? `<p>The Storyteller looks at this lifepath before the sheet changes.</p>` : ""}</div>`, whisper: owners, speaker: {alias: "Creation"}});
    const people = picked.map(p => ({role: p.role, note: p.note, year: p.year, region: p.region ?? null}));
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
