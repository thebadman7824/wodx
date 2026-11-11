/**
 * The crossover referee's window and roll card (WoDX Chronicle 0.17.0). Storyteller only. Pick who acts, on whom
 * and with what (the selected token and the first target fill these in); the referee shows every case that fits,
 * with the ruling, what the two sheets work out to, the pages, and a roll button where the books give a roll.
 * Rolls go to the Storyteller alone. The rules are in referee-rules.mjs and data/crossover.mjs.
 */
import {MODULE_ID, esc, rule} from "./util.mjs";
import {searchBox} from "./search.mjs";
import * as R from "./referee-rules.mjs";
import CLASHES from "../data/rules-clashes.mjs";
import * as eras from "./eras.mjs";

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const clashRow = id => CLASHES.rows.find(r => r.id === id) ?? null;

/** The highest rating among an actor's powers whose name matches. */
function powerDots(actor, re) {
  let best = 0;
  for ( const i of actor?.items ?? [] ) if ( i.type === "Power" && re.test(String(i.name ?? "").trim()) ) best = Math.max(best, n(i.system?.value));
  return best;
}

/** A plain sheet of what the referee reads, from a Foundry actor. Other modules' flags are read straight off the data. */
export function sheetOf(actor) {
  if ( !actor ) return {};
  const s = actor.system ?? {};
  const attr = k => n(s.attributes?.[k]?.total ?? s.attributes?.[k]?.value);
  const abil = k => n(s.abilities?.[k]?.value);
  const adv = k => s.advantages?.[k] ?? {};
  const wp = adv("willpower");
  const faith = adv("faith");
  const dom = actor.flags?.["wodx-actions"]?.daFae?.dominions ?? {};
  const g = Number(s.generation);
  return {
    name: actor.name, profile: R.profileOf(actor),
    generation: Number.isFinite(g) && g > 0 ? g - n(s.generationmod) : 0,
    willpower: n(wp.temporary ?? wp.permanent) || n(wp.permanent),
    faith: n(faith.permanent ?? faith.value ?? faith.temporary) || n(actor.flags?.["wodx-actions"]?.trueFaith),
    arete: n(adv("arete").permanent),
    spheres: Object.fromEntries(Object.entries(s.spheres ?? {}).map(([k, v]) => [k, n(v?.value)])),
    auspex: powerDots(actor, /^auspex$/i), obfuscate: powerDots(actor, /^obfuscate$/i),
    perception: attr("perception"), manipulation: attr("manipulation"), wits: attr("wits"),
    awareness: abil("awareness"), subterfuge: abil("subterfuge"), occult: abil("occult"),
    day: n(dom.day), night: n(dom.night)
  };
}

const eraId = () => { try { return eras.activeEra()?.profile?.id ?? ""; } catch (e) { return ""; } };
const reckoningNow = (era = eraId()) => {
  try { return R.isReckoning(era, eras.currentYear(), {futureBranch: !!rule("futureBranch")}); } catch (e) { return R.isReckoning(era); }
};

/** Ask the referee from code: the cases and what they work out to for two actors. */
export function ask(power, actor, target, {rating = 0, era = eraId()} = {}) {
  const a = sheetOf(actor), t = sheetOf(target);
  const book = R.bookOf(era);
  return R.referee({power, from: a.profile ?? "mortal", to: t.profile ?? "mortal", book, actorFaith: a.faith, targetFaith: t.faith, reckoning: reckoningNow(era)},
    {actor: a, target: t, rating});
}

/** Roll a pool for the Storyteller alone and post the card. */
export async function rollFor({who = "", label = "", dice = 0, difficulty = 6, then = ""} = {}) {
  if ( !game.user.isGM ) return null;
  const d = Math.max(0, n(dice));
  let faces = [];
  if ( d > 0 ) {
    const roll = await new Roll(`${d}d10`).evaluate();
    faces = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
  }
  const {successes: s, botch} = R.successes(faces, difficulty);
  const word = !d ? "no dice" : botch ? "a botch" : s > 0 ? `${s} success${s === 1 ? "" : "es"}` : "no successes";
  const content = `<div class="wodx-referee-card"><h3><i class="fa-solid fa-scale-balanced"></i> The referee: ${esc(label)}</h3>
    <p>${esc(who)}: ${d} dice at ${difficulty}: <b>${word}</b>${faces.length ? ` <span class="wodx-quiet">(${faces.join(", ")})</span>` : ""}</p>
    ${then ? `<p class="wodx-quiet">${esc(then)}</p>` : ""}</div>`;
  return ChatMessage.create({content, whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id), speaker: {alias: "The referee"},
    flags: {[MODULE_ID]: {referee: {label, dice: d, difficulty, successes: s, botch}}}});
}

export class RefereeApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-referee",
    classes: ["wodx", "wodx-referee"],
    window: {title: "The crossover referee", icon: "fa-solid fa-scale-balanced", resizable: true},
    position: {width: 560, height: 640},
    actions: {ask: RefereeApp.#onAsk, roll: RefereeApp.#onRoll, fill: RefereeApp.#onFill}
  };

  static #instance;
  static open(opts = {}) {
    if ( !game.user.isGM ) return null;
    this.#instance ??= new RefereeApp();
    this.#instance.fromTokens();
    Object.assign(this.#instance.query, opts);
    return this.#instance.render({force: true});
  }

  query = {power: "mind", from: "kindred", to: "mortal", rating: 0};
  actor = null;
  target = null;
  rolls = [];

  /** The selected token acts; the first target is the one it acts on. */
  fromTokens() {
    this.actor = globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? null;
    this.target = [...(game.user.targets ?? [])][0]?.actor ?? null;
    if ( this.actor ) this.query.from = R.profileOf(this.actor);
    if ( this.target ) this.query.to = R.profileOf(this.target);
  }

  async _renderHTML() {
    const q = this.query, era = eraId(), book = R.bookOf(era);
    const a = this.actor && R.profileOf(this.actor) === q.from ? sheetOf(this.actor) : {profile: q.from};
    const t = this.target && R.profileOf(this.target) === q.to ? sheetOf(this.target) : {profile: q.to};
    const results = R.referee({power: q.power, from: q.from, to: q.to, book, actorFaith: a.faith, targetFaith: t.faith, reckoning: reckoningNow(era)},
      {actor: a, target: t, rating: q.rating});
    this.rolls = [];
    const opt = (map, sel) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
    const card = ({case: c, test}) => {
      const row = clashRow(c.clash);
      const rolls = [test.roll, ...(test.rolls ?? [])].filter(Boolean).map(r => {
        this.rolls.push({...r, who: r.who === "actor" ? (a.name || R.LINES[q.from]) : (t.name || R.LINES[q.to])});
        return `<button type="button" data-action="roll" data-roll="${this.rolls.length - 1}"><i class="fa-solid fa-dice-d10"></i> Roll ${esc(r.label)} (${r.dice} at ${r.difficulty})</button>`;
      }).join("");
      return `<section class="wodx-referee-case wodx-verdict-${esc(test.verdict)}">
        <p>${esc(c.ruling)}</p>
        ${test.text ? `<p><b>${esc(test.text)}</b></p>` : ""}
        ${rolls ? `<div class="wodx-buttons">${rolls}</div>` : ""}
        <p class="wodx-quiet">${esc(c.refs.join("; "))}${c.status === "check" ? ` <span class="wodx-tag reject">draft: ${esc(c.check)}</span>` : ""}</p>
        ${row ? `<details><summary>What the books say</summary><p class="wodx-quiet">${esc(row.books)}</p></details>` : ""}</section>`;
    };
    const all = R.CASES.map(c => `<li data-search-item data-search-text="${esc(`${R.POWERS[c.power]} ${c.ruling} ${c.refs.join(" ")}`)}">
      <b>${esc(R.POWERS[c.power])}</b>: ${esc(c.from.map(k => R.LINES[k] ?? "any line").join(", "))} on ${esc(c.to.map(k => R.LINES[k] ?? "any line").join(", "))}${c.book ? ` (${c.book === "da" ? "Dark Ages books" : "later eras"})` : ""}.
      ${esc(c.ruling)} <span class="wodx-quiet">${esc(c.refs.join("; "))}</span></li>`).join("");
    const who = (label, name, sel, actor) => `<div class="form-group"><label>${label}</label><div class="form-fields">
      <select name="${name}" data-fixed aria-label="${label}">${opt(R.LINES, sel)}</select></div>
      <p class="hint">${actor ? esc(actor.name) : "No token: the line alone"}</p></div>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">
        ${who("Who acts", "from", q.from, this.actor && R.profileOf(this.actor) === q.from ? this.actor : null)}
        <div class="form-group"><label>With what</label><div class="form-fields"><select name="power" data-fixed aria-label="With what">${opt(R.POWERS, q.power)}</select></div></div>
        ${who("On whom", "to", q.to, this.target && R.profileOf(this.target) === q.to ? this.target : null)}
        <div class="form-group"><label>Power's rating</label><div class="form-fields"><input type="number" name="rating" min="0" max="10" value="${n(q.rating)}" aria-label="Power's rating"></div>
          <p class="hint">Only some rulings need it (Day or Night against Dominate).</p></div>
        <p class="wodx-quiet">The era's books: ${book === "da" ? "the Dark Ages books" : "V20 and the later books"}.</p>
        <div class="wodx-buttons"><button type="button" data-action="ask"><i class="fa-solid fa-gavel"></i> Ask the referee</button>
          <button type="button" data-action="fill"><i class="fa-solid fa-crosshairs"></i> From the selected token and target</button></div></div>
      <div class="wodx-scroll">
        ${results.length ? results.map(card).join("") : `<p class="wodx-quiet">No ruling for this meeting: ${esc(R.POWERS[q.power])} is not something ${esc(R.LINES[q.from])} uses on another line. The powers work by their own books.</p>`}
        <section class="wodx-referee-all"><h3>Every case the referee knows (${R.CASES.length})</h3>
          ${searchBox(".wodx-referee-list", "Search the cases…", "Search the cases")}
          <ul class="wodx-list wodx-referee-list">${all}</ul></section>
      </div>`;
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  #read() {
    const el = this.element;
    const v = name => el?.querySelector(`[name="${name}"]`)?.value;
    this.query = {power: v("power") ?? this.query.power, from: v("from") ?? this.query.from, to: v("to") ?? this.query.to, rating: n(v("rating"))};
  }

  static #onAsk() { this.#read(); this.render(); }
  static #onFill() { this.fromTokens(); this.render(); }
  static #onRoll(event, target) { const r = this.rolls[n(target.dataset.roll)]; if ( r ) rollFor(r); }
}

/** Put the referee into the Storyteller's hand when WoDX Storyteller is on. */
export function addToHand() {
  const add = () => {
    const hand = game.wodx?.storyteller?.hand;
    if ( !hand?.addTool ) return false;
    hand.addTool({key: "referee", label: "The crossover referee", icon: "fa-scale-balanced", run: () => RefereeApp.open()});
    return true;
  };
  if ( !add() ) setTimeout(add, 2000);
}

export function registerRefereeKey() {
  game.keybindings.register(MODULE_ID, "referee", {
    name: "The crossover referee",
    hint: "What happens when one line's power meets another line (Storyteller only).",
    editable: [],
    restricted: true,
    onDown: () => { if ( game.user.isGM ) RefereeApp.open(); return true; }
  });
}
