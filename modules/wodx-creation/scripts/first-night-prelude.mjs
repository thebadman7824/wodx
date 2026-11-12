/**
 * WoDX Creation 0.13.0: the prelude runner, the written prelude and the troupe ties (Chronicle Start Desk p1 to p3,
 * t1, t2). The pure part is first-night-prelude-rules.mjs.
 *
 *   Run the prelude (Storyteller): the scenes one at a time, a roll with stakes on any beat, gains up to 3 freebie
 *     points, every change in the log with Undo. Kept on flags.wodx-creation.firstNight.prelude.
 *   Write my prelude (player): a journal page of the prelude's questions that the player owns and the Storyteller
 *     reads.
 *   Troupe ties (Storyteller): each player gets one question about the next character in a ring; the answers go on
 *     the Group actor and tick the step. A shared scene journal "How they met" gathers them.
 *   A guest in this scene (0.14.0, Improvement Desk bf1, B2305 to B2307): the Storyteller asks another player's
 *     character into a prelude scene, where their years allow. That player plays one beat (answered on a chat card,
 *     or written by the Storyteller at the table), and the tie goes to troupe ties with what happened.
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import * as P from "./first-night-prelude-rules.mjs";
import * as LP from "./lifepath-rules.mjs";
import {lifepathOf, makePeople} from "./lifepath.mjs";
import {TOTALS} from "./totals-rules.mjs";
import {defaultLine} from "../data/creation-totals.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const {ApplicationV2, DialogV2} = foundry.applications.api;
const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const FLAG = "firstNight";
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch { return null; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const pcs = () => [...(game.actors ?? [])].filter(a => a.hasPlayerOwner && !/group|spirit|creature/i.test(String(a.type))).sort((a, b) => a.name.localeCompare(b.name));
const FOLDER = "WoDX preludes";

/** A character's years from their lifepath, for a guest check: {line, birthYear, turnYear}, or null. */
const guestYears = a => { const p = lifepathOf(a)?.path; return p ? {line: p.line, birthYear: p.birthYear, turnYear: p.turnYear} : null; };
const preludeOf = actor => P.normPrelude(actor?.flags?.[MODULE_ID]?.[FLAG]?.prelude ?? {});
const savePrelude = (actor, p) => actor.update({[`flags.${MODULE_ID}.${FLAG}.prelude`]: P.normPrelude(p)});
const lineKey = actor => { try { return LP.lineFor(actor.type, actor.system?.settings?.variant ?? ""); } catch (e) { return "mortal"; } };

function template(actor) {
  const S = api("wodx-storyteller")?.prelude;
  if ( !S?.compose ) return [];
  const line = S.lineFor?.(actor.type, actor.system?.settings?.variant ?? "") ?? lineKey(actor);
  let fb = false;
  try { fb = !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { fb = false; }
  return S.compose({line, name: actor.name, year: yearNow(), futureBranch: fb}).parts ?? [];
}

export function scenesFor(actor, short = false) {
  const rec = lifepathOf(actor);
  let story = [];
  try { if ( rec?.path ) story = LP.summary(rec.path, {nowYear: yearNow()}).story; } catch (e) { story = []; }
  return P.buildScenes({story, parts: template(actor), short, name: actor.name});
}

function costsOf(actor) {
  let eraId = "";
  try { eraId = api("wodx-chronicle")?.eras?.activeEra?.()?.profile?.id ?? ""; } catch (e) { /* none */ }
  return TOTALS[defaultLine(actor.type, {variant: actor.system?.settings?.variant ?? "", eraId})]?.costs ?? {ability: 2, background: 1, willpower: 1};
}

/** A Flaw earned in play: 0 points, so it gives no freebies. Returns the item id. */
async function earnFlaw(actor, name, scene) {
  const [it] = await actor.createEmbeddedDocuments("Item", [{name: `${name} (from the prelude)`, type: "Feature",
    system: {type: "wod.types.flaw", value: 0, level: "0"}, flags: {[MODULE_ID]: {prelude: scene}}}]);
  return it?.id ?? null;
}

export class PreludeRunApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-first-night", "wodx-fn-prelude"],
    window: {title: "The prelude", icon: "fa-solid fa-masks-theater", resizable: true},
    position: {width: 620, height: "auto"},
    actions: {prev: PreludeRunApp.#onPrev, next: PreludeRunApp.#onNext, roll: PreludeRunApp.#onRoll, reward: PreludeRunApp.#onReward,
      undo: PreludeRunApp.#onUndo, short: PreludeRunApp.#onShort, note: PreludeRunApp.#onNote, journal: PreludeRunApp.#onJournal, guest: PreludeRunApp.#onGuest}
  };

  static openFor(actor) {
    if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller runs the prelude. You can write yours from Before the First Night.");
    if ( !actor ) return ui.notifications.warn("Choose a character first.");
    const height = Math.max(440, Math.min(820, window.innerHeight - 80));
    return new PreludeRunApp({actor, id: `wodx-fn-prelude-${actor.id}`, position: {height}}).render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    // A character joining a chronicle already under way gets the short prelude by default (desk t2)
    const raw = this.actor?.flags?.[MODULE_ID]?.[FLAG] ?? {};
    if ( !raw.prelude && P.underWay(pcs().map(a => a.flags?.[MODULE_ID]?.[FLAG])) ) this.startShort = true;
  }
  get title() { return `The prelude: ${this.actor?.name ?? ""}`; }

  async _renderHTML() {
    const a = this.actor;
    if ( this.startShort ) { this.startShort = false; await savePrelude(a, {short: true}); }
    const rec = preludeOf(a);
    const scenes = scenesFor(a, rec.short);
    const i = Math.min(rec.scene, Math.max(0, scenes.length - 1)), s = scenes[i];
    const costs = costsOf(a);
    const log = rec.log.map((e, k) => `<li>${esc(e.text)}${e.undo && !e.undone ? ` <button type="button" data-action="undo" data-i="${k}">Undo</button>` : e.undone ? " <span class=\"wodx-quiet\">(undone)</span>" : ""}</li>`).join("");
    const rewards = Object.entries(P.REWARDS).map(([k, r]) => `<button type="button" data-action="reward" data-kind="${k}" ${P.canReward(k, rec.spent, costs) ? "" : "disabled"}>${esc(r.label)} (${P.rewardCost(k, costs)})</button>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top"><p class="wodx-prompt">Scene ${i + 1} of ${scenes.length}${rec.short ? " (short prelude)" : ""}. Questions and beats to steer by; the player decides what the character feels and does.</p></div>
      <div class="wodx-scroll">
        ${s ? `<h3>${esc(s.title)}</h3><ul>${s.beats.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : `<p class="wodx-quiet">No scenes.</p>`}
        <div class="wodx-buttons">
          <button type="button" data-action="prev" ${i <= 0 ? "disabled" : ""}>Previous scene</button>
          <button type="button" data-action="next" ${i >= scenes.length - 1 ? "disabled" : ""}>Next scene</button>
          <button type="button" data-action="roll"><i class="fa-solid fa-dice-d10"></i> A roll with stakes</button>
          <button type="button" data-action="note">A note</button>
          <button type="button" data-action="guest"><i class="fa-solid fa-user-plus"></i> A guest in this scene</button>
        </div>
        <h4>What the prelude gives (${rec.spent} of ${P.PRELUDE_BUDGET} freebie points)</h4>
        <div class="wodx-buttons">${rewards}</div>
        <h4>What happened</h4>
        ${log ? `<ol class="wodx-fn-costs">${log}</ol>` : `<p class="wodx-quiet">Nothing yet.</p>`}
        <div class="wodx-buttons">
          <button type="button" data-action="short">${rec.short ? "Play the whole prelude" : "Short prelude (joining late)"}</button>
          <button type="button" data-action="journal">The prelude journal</button>
        </div>
      </div>`;
    this.scene = s;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  async #log(entry) {
    const rec = preludeOf(this.actor);
    rec.log.push({at: game.time?.worldTime ?? 0, scene: this.scene?.key ?? "", ...entry});
    if ( entry.cost ) rec.spent += entry.cost;
    await savePrelude(this.actor, rec);
    this.render();
  }

  static async #onPrev() { const r = preludeOf(this.actor); r.scene = Math.max(0, r.scene - 1); await savePrelude(this.actor, r); this.render(); }
  static async #onNext() { const r = preludeOf(this.actor); r.scene += 1; await savePrelude(this.actor, r); this.render(); }
  static async #onShort() { const r = preludeOf(this.actor); r.short = !r.short; r.scene = 0; await savePrelude(this.actor, r); this.render(); }
  static async #onJournal() { await api("wodx-storyteller")?.prelude?.make?.({actorId: this.actor.id}).then(m => m?.journal?.sheet?.render(true)); }

  static async #onNote() {
    const text = await DialogV2.prompt({window: {title: "A note"}, rejectClose: false, content: `<div class="form-group"><input type="text" name="t" maxlength="300"></div>`,
      ok: {label: "Add", callback: (e, b) => b.form.elements.t.value.trim()}});
    if ( text ) await this.#log({kind: "note", text: `${this.scene?.title ?? ""}: ${text}`});
  }

  static async #onGuest() {
    const host = this.actor, scene = this.scene;
    if ( !scene ) return;
    const year = scene.year ?? yearNow();
    const others = pcs().filter(a => a.id !== host.id).map(a => ({a, fit: P.guestFit(year, guestYears(a))}));
    if ( !others.length ) return ui.notifications.info("A guest needs another player character.");
    const opts = others.map(({a, fit}) => `<option value="${a.id}" ${fit.ok ? "" : "disabled"}>${esc(a.name)}${fit.why ? `: ${esc(fit.why)}` : ""}</option>`).join("");
    if ( !others.some(o => o.fit.ok) ) return ui.notifications.info(`No other character could have been there${year ? ` in ${year}` : ""}.`);
    const id = await DialogV2.prompt({window: {title: "A guest in this scene"}, rejectClose: false,
      content: `<p>${esc(scene.title)}${year ? ` (${year})` : ""}. Who else was there?</p><div class="form-group"><select name="g" data-fixed>${opts}</select></div>`,
      ok: {label: "Next", callback: (e, b) => b.form.elements.g.value}});
    const pick = others.find(o => o.a.id === id && o.fit.ok);
    if ( !pick ) return;
    const beats = (P.GUEST_BEATS[pick.fit.as] ?? P.GUEST_BEATS.mortal).map((b, i) => P.guestBeat(pick.fit.as, i, pick.a.name, host.name));
    const got = await DialogV2.wait({window: {title: `${pick.a.name} in ${host.name}'s prelude`}, rejectClose: false,
      content: `${pick.fit.why ? `<p class="wodx-quiet">${esc(pick.fit.why)}</p>` : ""}<div class="form-group"><label>The beat</label><select name="b" data-fixed>${beats.map((b, i) => `<option value="${i}">${esc(b)}</option>`).join("")}</select></div>
        <div class="form-group stacked"><label>What happened, if it was played at the table</label><textarea name="t" rows="3"></textarea></div>`,
      buttons: [{action: "send", label: "Ask the player", default: true, callback: (e, b) => ({beat: beats[Number(b.form.elements.b.value) || 0], text: b.form.elements.t.value.trim(), send: true})},
        {action: "write", label: "Write it now", callback: (e, b) => ({beat: beats[Number(b.form.elements.b.value) || 0], text: b.form.elements.t.value.trim()})},
        {action: "cancel", label: "Cancel"}]});
    if ( !got || got === "cancel" ) return;
    const tie = P.guestTie({from: pick.a.id, about: host.id, scene: scene.key, year: scene.year ?? null, title: scene.title, beat: got.beat, text: got.text});
    if ( got.text ) return saveGuest(tie);
    const owners = game.users.filter(u => !u.isGM && pick.a.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({whisper: [...owners, ...gmIds()], speaker: {alias: "Before the First Night"},
      content: `<div class="wodx-card wodx-fn-tie"><h3>${esc(pick.a.name)} in ${esc(host.name)}'s prelude</h3><p>${esc(tie.q)}</p><button type="button" data-wodx-fn-guest>Play the beat</button></div>`,
      flags: {[MODULE_ID]: {guest: tie}}});
    await this.#log({kind: "note", text: `${scene.title}: ${pick.a.name} asked in as a guest.`});
  }

  static async #onRoll() {
    const opts = Object.entries(P.STAKES).map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join("");
    const pick = await DialogV2.wait({window: {title: "A roll with stakes"}, rejectClose: false,
      content: `<div class="form-group"><label>Dice</label><input type="number" name="pool" value="5" min="1" max="20"></div>
        <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"></div>
        <div class="form-group"><label>If it fails</label><select name="stake" data-fixed>${opts}</select></div>`,
      buttons: [{action: "roll", label: "Roll", default: true, callback: (e, b) => ({pool: Number(b.form.elements.pool.value) || 1, diff: Number(b.form.elements.diff.value) || 6, stake: b.form.elements.stake.value})},
        {action: "cancel", label: "Cancel"}]});
    if ( !pick || pick === "cancel" ) return;
    const roll = await new Roll(`${Math.max(1, Math.min(20, pick.pool))}d10`).evaluate();
    const dice = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
    const hits = P.successes(dice, pick.diff);
    await roll.toMessage({speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `The prelude: ${esc(this.scene?.title ?? "")}, difficulty ${pick.diff}`}, {rollMode: "gmroll"});
    if ( hits > 0 ) return this.#log({kind: "roll", text: `${this.scene?.title ?? ""}: ${hits} success${hits === 1 ? "" : "es"}, nothing lost.`});
    const st = P.STAKES[pick.stake];
    const undo = {};
    if ( st.flaw ) undo.item = await earnFlaw(this.actor, st.flaw, this.scene?.key ?? "");
    if ( st.enemy ) {
      try {
        const [n] = await makePeople({actorId: this.actor.id, people: [{role: "an enemy from the prelude", note: this.scene?.title ?? "", year: yearNow()}]});
        if ( n ) { undo.actor = n.id; await api("wodx-npc")?.attitude?.apply?.(n, this.actor, {to: -2, why: "Made an enemy in the prelude"}); }
      } catch (e) { console.error(`${MODULE_ID} | prelude enemy`, e); }
    }
    await this.#log({kind: "stake", text: `${this.scene?.title ?? ""}: ${hits < 0 ? "a botch" : "failed"}. ${st.label}. ${st.text}`, undo: Object.keys(undo).length ? undo : null});
  }

  static async #onReward(ev, el) {
    const kind = el.dataset.kind, costs = costsOf(this.actor), rec = preludeOf(this.actor);
    if ( !P.canReward(kind, rec.spent, costs) ) return;
    const a = this.actor, undo = {kind};
    if ( kind === "willpower" ) {
      const wp = a.system?.willpower?.permanent;
      if ( !Number.isFinite(Number(wp)) ) return ui.notifications.warn("This sheet has no Willpower to raise.");
      undo.path = "system.willpower.permanent"; undo.was = Number(wp);
      await a.update({[undo.path]: Math.min(10, Number(wp) + 1)});
    } else {
      const list = kind === "ability"
        ? Object.entries(a.system?.abilities ?? {}).filter(([, v]) => v && typeof v === "object" && v.isvisible !== false).map(([k, v]) => ({id: `system.abilities.${k}.value`, label: k, value: Number(v.value) || 0}))
        : a.items.filter(i => i.type === "Feature" && /background/.test(String(i.system?.type))).map(i => ({id: i.id, label: i.name, value: Number(i.system?.value) || 0}));
      if ( !list.length ) return ui.notifications.warn(kind === "ability" ? "No Abilities on this sheet." : "Add the Background to the sheet first.");
      const id = await DialogV2.prompt({window: {title: P.REWARDS[kind].label}, rejectClose: false,
        content: `<select name="t" data-fixed>${list.sort((x, y) => x.label.localeCompare(y.label)).map(t => `<option value="${esc(t.id)}">${esc(t.label)} (${t.value})</option>`).join("")}</select>`,
        ok: {label: "Give it", callback: (e, b) => b.form.elements.t.value}});
      const t = list.find(x => x.id === id);
      if ( !t ) return;
      if ( kind === "ability" ) { undo.path = t.id; undo.was = t.value; await a.update({[t.id]: Math.min(5, t.value + 1)}); }
      else { undo.itemId = t.id; undo.was = t.value; await a.items.get(t.id)?.update({"system.value": Math.min(5, t.value + 1), "system.level": String(Math.min(5, t.value + 1))}); }
      undo.label = t.label;
    }
    await this.#log({kind: "reward", cost: P.rewardCost(kind, costs), text: `${this.scene?.title ?? ""}: ${P.REWARDS[kind].label}${undo.label ? ` (${undo.label})` : ""}.`, undo});
  }

  static async #onUndo(ev, el) {
    const rec = preludeOf(this.actor), e = rec.log[Number(el.dataset.i)];
    if ( !e?.undo || e.undone ) return;
    const u = e.undo, a = this.actor;
    if ( u.item ) await a.items.get(u.item)?.delete();
    if ( u.actor ) await game.actors.get(u.actor)?.delete();
    if ( u.path ) await a.update({[u.path]: u.was});
    if ( u.itemId ) await a.items.get(u.itemId)?.update({"system.value": u.was, "system.level": String(u.was)});
    if ( u.tie ) await dropTie(u.tie);
    e.undone = true;
    if ( e.kind === "reward" ) rec.spent = Math.max(0, rec.spent - P.rewardCost(u.kind, costsOf(a)));
    await savePrelude(a, rec);
    this.render();
  }
}

/** Player: a journal page of the prelude's questions, owned by the player, readable by the Storyteller. */
export async function writtenPrelude(actor) {
  if ( !actor?.isOwner ) return null;
  const rec = preludeOf(actor);
  const have = rec.written ? game.journal.get(rec.written) : null;
  if ( have ) return have.sheet?.render(true);
  const parts = template(actor);
  const body = `<p>Answer what you like, in your own words. The Storyteller reads this before the prelude.</p>${parts.map(p => `<h2>${esc(p.heading)}</h2>${p.items.map(q => `<p><em>${esc(q)}</em></p><p></p>`).join("")}`).join("")}`;
  const owners = Object.fromEntries(game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => [u.id, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER]));
  const folder = game.user.isGM ? (game.folders.find(f => f.type === "JournalEntry" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "JournalEntry"})) : null;
  const j = await JournalEntry.create({name: `${actor.name}: my prelude`, folder: folder?.id ?? null, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ...owners},
    pages: [{name: "My prelude", type: "text", text: {content: body, format: 1}}], flags: {[MODULE_ID]: {writtenPrelude: actor.id}}});
  if ( j ) { rec.written = j.id; await savePrelude(actor, rec); j.sheet?.render(true); }
  return j;
}

/* ------------------------------------------------------------------ */
/*  Troupe ties                                                        */
/* ------------------------------------------------------------------ */

/** Storyteller: send each player one question about the next character in the ring. */
export async function sendTies() {
  if ( !game.user.isGM ) return [];
  const list = pcs();
  const pairs = P.ring(list.map(a => a.id));
  if ( !pairs.length ) { ui.notifications.info("Ties need two player characters or more."); return []; }
  const out = [];
  for ( const p of pairs ) {
    const a = game.actors.get(p.from), b = game.actors.get(p.about);
    const owners = game.users.filter(u => !u.isGM && a.testUserPermission(u, "OWNER")).map(u => u.id);
    const q = P.tieQuestion(p.q, b.name);
    out.push(await ChatMessage.create({whisper: [...owners, ...gmIds()], speaker: {alias: "Before the First Night"},
      content: `<div class="wodx-card wodx-fn-tie"><h3>${esc(a.name)} and ${esc(b.name)}</h3><p>${esc(q)}</p><button type="button" data-wodx-fn-tie>Answer</button></div>`,
      flags: {[MODULE_ID]: {tie: {from: a.id, about: b.id, q}}}}));
  }
  return out;
}

const groupActor = () => game.actors.find(x => /group/i.test(String(x.type)));
async function putTie(tie) {
  const a = game.actors.get(tie.from), b = game.actors.get(tie.about), group = groupActor();
  if ( !a || !b || !group ) return;
  const ties = [...(group.flags?.[MODULE_ID]?.ties ?? []).filter(t => !P.sameTie(t, tie)), {...tie, text: String(tie.text ?? "").slice(0, 1000), fromName: a.name, aboutName: b.name}];
  await group.update({[`flags.${MODULE_ID}.ties`]: ties});
}
async function dropTie(tie) {
  const group = groupActor();
  if ( group ) await group.update({[`flags.${MODULE_ID}.ties`]: (group.flags?.[MODULE_ID]?.ties ?? []).filter(t => !P.sameTie(t, tie))});
}

/** GM: a guest's beat, written to troupe ties and to the host's prelude log (with Undo). Any client may call it. */
export async function saveGuest(tie) {
  if ( !game.user.isGM ) return game.socket.emit(`module.${MODULE_ID}`, {type: "guest.answer", payload: {tie}});
  const a = game.actors.get(tie?.from), host = game.actors.get(tie?.about);
  if ( !a || !host || !tie.text ) return;
  await putTie(tie);
  const rec = preludeOf(host);
  rec.log.push({at: game.time?.worldTime ?? 0, scene: tie.scene, kind: "guest", text: `${tie.q} ${a.name}: ${tie.text}`,
    undo: {tie: {from: tie.from, about: tie.about, kind: "guest", scene: tie.scene}}});
  await savePrelude(host, rec);
  await a.update({[`flags.${MODULE_ID}.${FLAG}.steps.ties`]: {done: true, at: game.time?.worldTime ?? 0, by: null}});
  globalThis.foundry?.applications?.instances?.get?.(`wodx-fn-prelude-${host.id}`)?.render();
  globalThis.foundry?.applications?.instances?.get?.("wodx-first-night")?.render();
}

async function saveTie(from, about, q, text) {
  if ( !game.user.isGM ) return game.socket.emit(`module.${MODULE_ID}`, {type: "tie.answer", payload: {from, about, q, text}});
  const a = game.actors.get(from), b = game.actors.get(about);
  if ( !a || !b ) return;
  await putTie({from, about, q, text});
  await a.update({[`flags.${MODULE_ID}.${FLAG}.steps.ties`]: {done: true, at: game.time?.worldTime ?? 0, by: null}});
  globalThis.foundry?.applications?.instances?.get?.("wodx-first-night")?.render();
}

/** Storyteller: a journal of the answers, to open a shared scene where the characters meet. */
export async function meetingJournal() {
  if ( !game.user.isGM ) return null;
  const group = game.actors.find(x => /group/i.test(String(x.type)));
  const ties = group?.flags?.[MODULE_ID]?.ties ?? [];
  const body = ties.length ? ties.map(t => `<h3>${t.kind === "guest" ? `${esc(t.fromName)} in ${esc(t.aboutName)}'s prelude` : `${esc(t.fromName)} on ${esc(t.aboutName)}`}</h3><p><em>${esc(t.q)}</em></p><p>${esc(t.text)}</p>`).join("")
    : "<p>No answers yet.</p>";
  return JournalEntry.create({name: "How they met", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER},
    pages: [{name: "How they met", type: "text", text: {content: `<p>A shared scene before the first night, built from what each player said about another.</p>${body}`, format: 1}}]})
    .then(j => { j?.sheet?.render(true); return j; });
}

export function registerTies() {
  game.socket?.on?.(`module.${MODULE_ID}`, async m => { if ( m?.type === "tie.answer" && game.user.isGM && game.users.activeGM?.id === game.user.id ) await saveTie(m.payload.from, m.payload.about, m.payload.q, m.payload.text);
    if ( m?.type === "guest.answer" && game.user.isGM && game.users.activeGM?.id === game.user.id ) await saveGuest(m.payload?.tie); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const g = message.flags?.[MODULE_ID]?.guest;
    if ( g ) {
      const root = el?.[0] ?? el, btn = root?.querySelector?.("[data-wodx-fn-guest]");
      if ( !btn ) return;
      if ( !game.actors.get(g.from)?.isOwner ) { btn.remove(); return; }
      btn.addEventListener("click", async () => {
        const text = await DialogV2.prompt({window: {title: "A guest's beat"}, rejectClose: false, content: `<p>${esc(g.q)}</p><textarea name="t" rows="4"></textarea>`,
          ok: {label: "Send", callback: (e, b) => b.form.elements.t.value.trim()}});
        if ( !text ) return;
        await saveGuest({...g, text});
        ui.notifications.info("Your beat is in the troupe ties.");
      });
      return;
    }
    const t = message.flags?.[MODULE_ID]?.tie;
    if ( !t ) return;
    const root = el?.[0] ?? el, btn = root?.querySelector?.("[data-wodx-fn-tie]");
    if ( !btn ) return;
    const a = game.actors.get(t.from);
    if ( !a?.isOwner ) { btn.remove(); return; }
    btn.addEventListener("click", async () => {
      const text = await DialogV2.prompt({window: {title: "A tie"}, rejectClose: false, content: `<p>${esc(t.q)}</p><textarea name="t" rows="4"></textarea>`,
        ok: {label: "Send", callback: (e, b) => b.form.elements.t.value.trim()}});
      if ( !text ) return;
      await saveTie(t.from, t.about, t.q, text);
      ui.notifications.info("Your answer is on the group sheet.");
    });
  });
}
