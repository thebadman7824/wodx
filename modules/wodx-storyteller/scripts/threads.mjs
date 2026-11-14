/**
 * Threads of Fate, the Foundry side (B3650-B3656). The rules are in threads-rules.mjs, the signal board in
 * signals.mjs, the hook cards in data/threads-cards.mjs.
 *
 *   When     once a week of game time, when a session ends, and at once when a weight 3 signal is posted.
 *   Weave    the freshest signals on the board, a player's own hooks and lifepath threads first, make a storyline
 *            from an anchor card, a twist card and an echo. Three are open at most, plus one for each player's own
 *            hook; when one ends, another can open.
 *   Asks     setting "Threads of Fate": Off (the default in a world), Suggest (each storyline asks the Storyteller
 *            first, approval wodx-storyteller.threads) or Open by itself (it opens, and the Storyteller is told and
 *            can end or refuse it). The Storyteller's lines always win.
 *   Opens    a page in the journal folder "Threads of Fate" (Storyteller only), a progress clock with a segment for
 *            each step, and the opening rumour going round.
 *   Runs     each step comes due by its days and is whispered to the Storyteller; the night's draw gives an open
 *            storyline's beat one time in three (night.mjs). A locked storyline waits.
 *   Ends     the Storyteller picks an ending in the Threads of Fate window. Its rumour goes round, the chronicle's
 *            Legends book records it, and what it writes back to other systems is listed for the Storyteller to do
 *            through their own controls. The slot frees for the next week.
 */
import * as T from "./threads-rules.mjs";
import * as Signals from "./signals.mjs";
import * as SR from "./signals-rules.mjs";
import {CARDS} from "../data/threads-cards.mjs";
import {MOD, esc, chron, isActiveGM, isPC, setting, mutate} from "./core.mjs";
import {getLinesVeils} from "../../wodx-chronicle/scripts/journals.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const TYPE = `${MOD}.threads`;
const FOLDER = "Threads of Fate";
const now = () => game.time?.worldTime ?? 0;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const homeNow = () => { try { const h = chron()?.world?.homeland?.(); return (typeof h === "string" ? h : h?.id) || "moravia"; } catch (e) { return "moravia"; } };
const gm = () => game.users.filter(u => u.isGM).map(u => u.id);
const cardOf = key => DECK.find(c => c.key === key) ?? null;
const DECK = CARDS.map(T.normCard).filter(Boolean);

export function registerThreadSettings() {
  game.settings.register(MOD, "threads", {name: "Threads of Fate (storylines woven from what happens)", hint: "Off, Suggest (each storyline asks the Storyteller first) or Open by itself (it opens and the Storyteller is told). Woven once a week, when a session ends, and at once for great events.",
    scope: "world", config: true, type: String, default: "off", choices: {off: "Off", suggest: "Suggest", auto: "Open by itself"}});
  game.settings.register(MOD, "threadsState", {scope: "world", config: false, type: Object, default: {open: [], done: [], refused: [], last: 0}, onChange: () => ThreadsApp.refresh()});
}
const mode = () => setting("threads") ?? "off";
export const on = () => mode() !== "off";
export const state = () => ({open: [], done: [], refused: [], last: 0, ...(setting("threadsState") ?? {})});
const save = fn => mutate("threadsState", cur => ({value: fn({open: [], done: [], refused: [], last: 0, ...(cur ?? {})})}));

/* ---- The table now ---- */

const LINE_RX = [["kuei-jin", /kuei|cathayan/i], ["vampire", /vampire|ghoul/i], ["werewolf", /werewolf|garou|kinfolk|fera/i], ["mage", /mage|sorcerer/i],
  ["changeling", /changeling|kithain|kinain/i], ["wraith", /wraith/i], ["hunter", /hunter/i], ["mummy", /mummy/i], ["demon", /demon/i], ["mortal", /mortal|human/i]];
const lineOfActor = a => { const t = String(a?.type ?? ""); for ( const [l, rx] of LINE_RX ) if ( rx.test(t) ) return l; return "mortal"; };
const pcs = () => all(game.actors).filter(isPC);

/** The context the weave reads: year, region, lines at the table, the Future Darkness branch, Session Zero cuts, chains running. */
export function context() {
  const lines = [...new Set(pcs().map(lineOfActor))];
  if ( lines.includes("vampire") && !lines.includes("mortal") ) lines.push("mortal");
  let cut = [];
  try { cut = T.cutsFrom(getLinesVeils().filter(e => e?.kind === "line").map(e => e.text)); } catch (e) { cut = []; }
  let chains = [];
  try { chains = (game.settings.get("wodx-chronicle", "podState")?.chains ?? []).map(r => String(r.key ?? "")).filter(Boolean); } catch (e) { chains = []; }
  return {year: yearNow(), region: homeNow(), lines, branch: futureOn(), cut, chains};
}

/** Live signals the board does not hold yet: each character's open lifepath threads (a player's own story, first). */
function gather() {
  const out = [];
  let seen = {};
  try { seen = game.settings.get("wodx-chronicle", "podState")?.lp ?? {}; } catch (e) { seen = {}; }
  for ( const a of pcs() ) {
    let threads = [];
    try { threads = game.modules.get("wodx-creation")?.api?.lifepathThreads?.(a) ?? []; } catch (e) { threads = []; }
    for ( const x of threads ) {
      if ( seen[a.id]?.seen?.[x.id] ) continue;
      out.push({key: `lifepath:${a.id}:${x.id}`, kind: "lifepath", about: a.id, weight: 1, who: x.name ?? "", what: x.label ?? "", from: "lifepath"});
    }
  }
  return out;
}

/* ---- The weave ---- */

let running = false;
/** Weave once. Returns the storyline proposed or opened, or null. */
export async function run({force = false, why = "week"} = {}) {
  if ( !isActiveGM() || (!on() && !force) || running ) return null;
  running = true;
  try {
    for ( const s of gather() ) await Signals.post(s);
    const st = state(), t = now();
    const ctx = context();
    const story = T.weave({board: Signals.board(), cards: DECK, state: st, ctx, now: t, rand: Math.random});
    await save(s => ({...s, last: t}));
    if ( !story ) return null;
    const anchor = cardOf(story.anchor);
    // B3656: no romance beat with anyone under 18
    const ages = chron()?.age?.romance;
    if ( anchor && ages && !T.ageSafe(anchor, pcs().map(a => a.id), id => { try { return ages(id)?.ok !== false; } catch (e) { return true; } }) ) return null;
    await Signals.markUsed(story.uses, story.key);
    if ( mode() === "auto" && !force ) { await openStory(story); await whisperOpened(story); }
    else await chron()?.propose?.({type: TYPE, key: `threads:${story.key}`, title: `A storyline: ${story.title}`, detail: proposalText(story), data: {story}});
    return story;
  } finally { running = false; }
}

function proposalText(story) {
  const a = cardOf(story.anchor), tw = cardOf(story.twist);
  const bits = [a?.surface || a?.open || "", story.question ? `The question: ${story.question}` : "",
    tw ? `Twist: ${tw.title}. ${tw.complication || tw.surface}` : "", story.echo ? `From the past: ${story.echo.what || story.echo.kind}${story.echo.who ? ` (${story.echo.who})` : ""}.` : "",
    story.doors.length ? `Doors for: ${story.doors.join(", ")}.` : "", `It grew from: ${story.from?.what || story.from?.kind}.`];
  return `${bits.filter(Boolean).join(" ")} Approve to open it; reject and it goes back.`;
}

/* ---- Opening a storyline ---- */

async function folder() {
  let f = all(game.folders).find(x => x.type === "JournalEntry" && x.name === FOLDER);
  f ??= await Folder.create({name: FOLDER, type: "JournalEntry"});
  return f;
}

function storyHtml(story) {
  const a = cardOf(story.anchor), tw = cardOf(story.twist);
  const doors = story.doors.map(l => `<li><b>${esc(l)}</b>: ${esc(a?.beneath?.[l] ?? tw?.beneath?.[l] ?? "")}</li>`).join("");
  const steps = story.steps.map(s => `<li><b>${esc(s.title)}</b>${s.text ? `: ${esc(s.text)}` : ""}${s.days ? ` <span class="wodx-quiet">(after ${s.days} days)</span>` : ""}</li>`).join("");
  const ends = (a?.endings ?? []).map(e => `<li><b>${esc(e.label)}</b>${e.writes.length ? `: ${esc(e.writes.map(w => `${w.to}, ${w.what}`).join("; "))}` : ""}</li>`).join("");
  return `${a?.open ? `<p><i>${esc(a.open)}</i></p>` : ""}
    ${a?.mood ? `<p class="wodx-quiet">Mood: ${esc(a.mood)}</p>` : ""}
    <p>${esc(a?.surface ?? "")}</p>
    ${a?.who ? `<p><b>Who:</b> ${esc(a.who)}${a.want ? `, who wants ${esc(a.want.charAt(0).toLowerCase() + a.want.slice(1))}` : ""}</p>` : ""}
    ${doors ? `<h3>What lies beneath</h3><ul>${doors}</ul>` : ""}
    ${a?.complication ? `<p><b>Complication:</b> ${esc(a.complication)}</p>` : ""}
    ${tw ? `<p><b>Twist, ${esc(tw.title)}:</b> ${esc(tw.complication || tw.surface)}</p>` : ""}
    ${story.echo ? `<p><b>From the past:</b> ${esc(story.echo.what || story.echo.kind)}${story.echo.who ? ` (${esc(story.echo.who)})` : ""}</p>` : ""}
    ${a?.find ? `<p><b>To find:</b> ${esc(a.find)}</p>` : ""}
    ${story.question ? `<p><b>The question:</b> ${esc(story.question)}</p>` : ""}
    ${a?.cost ? `<p><b>The cost:</b> ${esc(a.cost)}</p>` : ""}
    ${a?.valve ? `<p><b>If the table is stuck:</b> ${esc(a.valve)}</p>` : ""}
    <h3>Steps</h3><ol>${steps}</ol>
    ${ends ? `<h3>Endings</h3><ul>${ends}</ul>` : ""}
    <p class="wodx-quiet">The Storyteller can change any of this. Grew from: ${esc(story.from?.what || story.from?.kind || "")}.</p>`;
}

/** Open an approved storyline: its state, a journal page, a clock and the opening rumour. */
export async function openStory(story) {
  if ( !game.user.isGM || !story?.key ) return null;
  if ( state().open.some(s => s.key === story.key) ) return null;
  const f = await folder();
  const j = await JournalEntry.create({name: story.title, folder: f.id, ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE}, flags: {[MOD]: {thread: story.key}},
    pages: [{name: story.title, type: "text", text: {content: storyHtml(story), format: 1}}]});
  let clock = null;
  try {
    const seg = [4, 6, 8, 10, 12].find(n => n >= story.steps.length) ?? 12;
    clock = await game.modules.get(MOD)?.api?.clocks?.save?.({name: story.title, segments: seg, filled: 0});
  } catch (e) { clock = null; }
  await save(s => T.open(s, {...story, journal: j?.id ?? "", clock: clock?.id ?? ""}, now()));
  const a = cardOf(story.anchor);
  try { if ( a?.surface && setting("rumourNetwork") !== false ) await game.modules.get(MOD)?.api?.rumours?.start?.({text: a.surface}); } catch (e) { /* no rumours */ }
  Hooks.callAll("wodxThreadOpened", {story});
  await tickSteps();
  return story;
}

async function whisperOpened(story) {
  await ChatMessage.create({whisper: gm(), speaker: {alias: "Threads of Fate"},
    content: `<div class="wodx-card wstory"><p><b>A storyline opens: ${esc(story.title)}</b></p><p>${esc(proposalText(story).replace(/ Approve to open it; reject and it goes back\.$/, ""))}</p><p class="wodx-quiet">End, lock or refuse it in the Threads of Fate window.</p></div>`});
}

/* ---- Steps ---- */

/** Whisper each step that is due to the Storyteller, fill its clock, and move on. */
export async function tickSteps() {
  if ( !isActiveGM() ) return [];
  const t = now(), due = T.due(state(), t);
  for ( const d of due ) {
    const s = state().open.find(x => x.key === d.key);
    await ChatMessage.create({whisper: gm(), speaker: {alias: "Threads of Fate"},
      content: `<div class="wodx-card wstory"><p><b>${esc(s?.title ?? "")}: ${esc(d.step.title)}</b></p>${d.step.text ? `<p>${esc(d.step.text)}</p>` : ""}${s && s.step + 1 >= s.steps.length ? `<p class="wodx-quiet">The last step. Pick its ending in the Threads of Fate window when the table gets there.</p>` : ""}</div>`});
    try { if ( s?.clock ) await game.modules.get(MOD)?.api?.clocks?.step?.(s.clock, 1); } catch (e) { /* no clock */ }
    await save(st => T.advance(st, d.key, t));
  }
  return due;
}

/** For the night's draw (night.mjs): an open storyline's beat one time in three, else null. */
export function nightBeat(rand = Math.random) {
  if ( !on() ) return null;
  const r = rand();
  if ( !(r < T.NIGHT_SHARE) ) return null;
  let first = true;
  const b = T.nightBeat(state(), () => (first ? ((first = false), r) : rand()));
  if ( b ) return b;
  // No storyline open: the running step of a Rothenstein saga book (WoDX Chronicle), if one runs
  try {
    const c = chron()?.pod?.saga?.current?.();
    if ( c?.step ) return {key: `saga:${c.book}`, title: c.title ?? "", step: {key: c.step.key ?? "", title: c.step.title ?? "", text: c.step.text ?? ""}};
  } catch (e) { /* no saga */ }
  return null;
}

/* ---- The Storyteller's controls ---- */

export async function endStory(key, endingKey) {
  if ( !game.user.isGM ) return null;
  const s = state().open.find(x => x.key === key);
  if ( !s ) return null;
  const a = cardOf(s.anchor);
  const e = a?.endings?.find(x => x.key === endingKey) ?? {key: endingKey || "ended", label: "It ends", writes: []};
  await save(st => T.close(st, key, e.key, now()));
  await Signals.release(key);
  // The ending's rumour, and its record in the Legends of the chronicle
  if ( e.writes.some(w => ["rumours", "tales"].includes(w.to)) ) {
    try { await game.modules.get(MOD)?.api?.rumours?.start?.({text: `People talk of ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)}. ${e.label}.`}); } catch (er) { /* no rumours */ }
  }
  // Into the chronicle's Legends book (WoDX Chronicle), with the player characters who were there
  const todo = e.writes.filter(w => !["rumours", "tales"].includes(w.to));
  try {
    await chron()?.legends?.addDeed?.({id: `thread:${key}`, at: now(), text: `${s.title}: ${e.label.charAt(0).toLowerCase()}${e.label.slice(1)}.`,
      people: pcs().map(a => ({id: a.id, name: a.name})), won: e.key === (a?.endings?.[0]?.key ?? ""), place: ""});
  } catch (er) { /* no Legends */ }
  try { if ( s.clock ) await game.modules.get(MOD)?.api?.clocks?.remove?.(s.clock); } catch (er) { /* no clock */ }
  Hooks.callAll("wodxThreadEnded", {story: s, ending: e});
  if ( todo.length ) await ChatMessage.create({whisper: gm(), speaker: {alias: "Threads of Fate"},
    content: `<div class="wodx-card wstory"><p><b>${esc(s.title)}: ${esc(e.label)}</b></p><p>To write back, through each system's own controls: ${esc(todo.map(w => `${w.to}, ${w.what}`).join("; "))}.</p></div>`});
  return e;
}

/** Refuse a storyline's anchor card: the storyline closes and the card is never woven again until taken back. */
export async function refuseStory(key) {
  if ( !game.user.isGM ) return;
  const s = state().open.find(x => x.key === key);
  if ( !s ) return;
  await save(st => T.refuse(T.close(st, key, "refused", now()), s.anchor));
  await Signals.release(key);
  try { if ( s.clock ) await game.modules.get(MOD)?.api?.clocks?.remove?.(s.clock); } catch (e) { /* no clock */ }
}
export const lockStory = (key, lock = true) => save(st => T.lock(st, key, lock));
export const unrefuse = cardKey => save(st => T.unrefuse(st, cardKey));
export const refuseCard = cardKey => save(st => T.refuse(st, cardKey));

/** A player's own hook, written down by the Storyteller for a character: it is woven first. */
export async function addHook(actorId, text, weight = 2) {
  const a = game.actors.get(actorId);
  if ( !game.user.isGM || !a || !String(text ?? "").trim() ) return null;
  return Signals.post({key: `hook:${a.id}:${foundry.utils.randomID(6)}`, kind: "hook", about: a.id, weight, who: a.name, what: String(text).trim().slice(0, 200), from: "hooks"});
}

/* ---- Approval ---- */

export function registerApproval() {
  chron()?.registerApprovalHandler?.(TYPE, {label: "Threads of Fate: a storyline", approve: async entry => { await openStory(entry?.data?.story); },
    reject: async entry => { const k = entry?.data?.story?.key; if ( k ) await Signals.release(k); }});
}

/* ---- Hooks ---- */

let urgentAt = 0;
export function registerThreadHooks() {
  const safe = p => p.catch(e => console.error(`${MOD} | threads`, e));
  Hooks.on("updateWorldTime", () => {
    if ( !on() || !isActiveGM() ) return;
    try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ }
    const st = state();
    if ( !st.last ) { safe(save(s => ({...s, last: now()}))); return; }
    if ( now() - st.last >= 7 * T.DAY ) safe(run({why: "week"}));
    safe(tickSteps());
  });
  Hooks.on("wodxSkipEnd", () => { if ( on() && isActiveGM() ) safe(tickSteps()); });
  Hooks.on("wodxSessionEnded", () => { if ( on() && isActiveGM() ) safe(run({why: "session"})); });
  Hooks.on("wodxSignal", s => {
    if ( !on() || !isActiveGM() || (s?.weight ?? 0) < 3 ) return;
    if ( Date.now() - urgentAt < 60000 ) return;
    urgentAt = Date.now();
    setTimeout(() => safe(run({why: "urgent"})), 1000);
  });
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class ThreadsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-threads",
    classes: ["wodx", "wodx-threads-app"],
    window: {title: "Threads of Fate", icon: "fa-solid fa-dharmachakra", resizable: true},
    position: {width: 680, height: "auto"},
    actions: {weave: ThreadsApp.#onWeave, end: ThreadsApp.#onEnd, lock: ThreadsApp.#onLock, refuse: ThreadsApp.#onRefuse,
      unrefuse: ThreadsApp.#onUnrefuse, hook: ThreadsApp.#onHook, step: ThreadsApp.#onStep, journal: ThreadsApp.#onJournal}
  };
  static #instance;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new ThreadsApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const st = state(), cap = T.capacity(st), board = Signals.board();
    const openRow = s => {
      const a = cardOf(s.anchor);
      const ends = (a?.endings ?? []).map(e => `<option value="${esc(e.key)}">${esc(e.label)}</option>`).join("");
      const step = s.steps[Math.min(s.step, s.steps.length - 1)];
      return `<div class="wstory-thread" data-search-item data-search-text="${esc(`${s.title} ${s.question ?? ""}`)}">
        <div><strong>${esc(s.title)}</strong>${s.locked ? " <span class=\"wodx-quiet\">(locked)</span>" : ""}</div>
        <div class="wodx-quiet">${esc(s.question ?? "")} Step ${Math.min(s.step + 1, s.steps.length)} of ${s.steps.length}${step ? `: ${esc(step.title)}` : ""}.</div>
        <div class="wodx-buttons">
          <button type="button" data-action="journal" data-key="${esc(s.key)}">Open its page</button>
          ${s.step < s.steps.length ? `<button type="button" data-action="step" data-key="${esc(s.key)}">Next step now</button>` : ""}
          <button type="button" data-action="lock" data-key="${esc(s.key)}">${s.locked ? "Unlock" : "Lock"}</button>
          <select name="ending" data-fixed>${ends || "<option value=\"ended\">It ends</option>"}</select>
          <button type="button" data-action="end" data-key="${esc(s.key)}">End it</button>
          <button type="button" data-action="refuse" data-key="${esc(s.key)}">Refuse this story</button></div></div>`;
    };
    const people = pcs().sort((a, b) => a.name.localeCompare(b.name));
    const refused = st.refused.map(k => `<li data-search-item data-search-text="${esc(cardOf(k)?.title ?? k)}">${esc(cardOf(k)?.title ?? k)} <button type="button" data-action="unrefuse" data-key="${esc(k)}">Take back</button></li>`).join("");
    const sig = board.slice().sort((x, y) => y.at - x.at).slice(0, 60).map(s => `<li data-search-item data-search-text="${esc(`${s.kind} ${s.what} ${s.who} ${s.where}`)}">${esc(s.kind)}${s.used ? " (in a storyline)" : ""}: ${esc(s.what || s.who || s.where || s.key)} <span class="wodx-quiet">weight ${s.weight}</span></li>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <p class="wodx-quiet">${mode() === "off" ? "Threads of Fate is off in Configure Settings. Weave now still works." : mode() === "auto" ? "Storylines open by themselves; you are told each time." : "Each storyline asks you first in the approval queue."} ${cap.open} open, ${cap.free} more can open (one more for each player's own hook). Woven once a week, when a session ends, and at once for great events.</p>
      <div class="wodx-buttons"><button type="button" data-action="weave"><i class="fa-solid fa-dharmachakra"></i> Weave now</button></div>
      <section><h3>Open storylines (${st.open.length})</h3>${searchBox(".wstory-threads", "Search storylines…", "Search storylines")}
        <div class="wstory-threads">${st.open.map(openRow).join("") || "<p class=\"wodx-quiet\">None open.</p>"}</div></section>
      <section><h3>A player's own hook</h3><form>
        <div class="form-group"><label>For</label><select name="actor"${people.length > 8 ? "" : " data-fixed"}>${people.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
        ${people.length > 8 ? searchBox("select[name=actor]", "Search characters…", "Search characters") : ""}
        <div class="form-group stacked"><label>What the player wants to see come back</label><input type="text" name="text" maxlength="200" placeholder="The brother who sold the family to the Inquisition"></div>
        <div class="wodx-buttons"><button type="button" data-action="hook">Add the hook</button></div></form></section>
      <section><h3>Refused stories (${st.refused.length})</h3>${searchBox(".wstory-refused", "Search refused stories…", "Search refused stories")}<ul class="wstory-refused">${refused || "<li class=\"wodx-quiet\">None.</li>"}</ul></section>
      <section><h3>What has happened (${board.length})</h3>${searchBox(".wstory-signals", "Search what has happened…", "Search what has happened")}<ul class="wstory-signals">${sig || "<li class=\"wodx-quiet\">Nothing on the board yet.</li>"}</ul></section>
      <section><h3>Ended (${st.done.length})</h3><p class="wodx-quiet">Each ending goes into the Legends book.</p></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onWeave() {
    const s = await run({force: true, why: "asked"});
    if ( !s ) ui.notifications.info("Nothing new to weave: no fresh signal, no free slot, or no card that fits.");
    else ui.notifications.info(`Woven: ${s.title}. It waits in the approval queue.`);
  }
  static async #onEnd(event, target) { await endStory(target.dataset.key, target.closest(".wstory-thread")?.querySelector("select[name=ending]")?.value); }
  static async #onLock(event, target) { const s = state().open.find(x => x.key === target.dataset.key); await lockStory(target.dataset.key, !s?.locked); }
  static async #onRefuse(event, target) { await refuseStory(target.dataset.key); }
  static async #onUnrefuse(event, target) { await unrefuse(target.dataset.key); }
  static async #onStep(event, target) {
    const k = target.dataset.key;
    await save(st => ({...st, open: st.open.map(s => (s.key === k ? {...s, next: 0} : s))}));
    await tickSteps();
  }
  static async #onJournal(event, target) { const s = state().open.find(x => x.key === target.dataset.key); game.journal.get(s?.journal)?.sheet?.render(true); }
  static async #onHook(event, target) {
    const f = target.closest("form").elements;
    if ( !f.text.value.trim() ) return ui.notifications.warn("Write the hook first.");
    await addHook(f.actor.value, f.text.value);
    f.text.value = "";
    ui.notifications.info("Hook added. It is woven first.");
  }
}

export const api = () => ({rules: T, cards: DECK, context, run, open: () => ThreadsApp.open(), state, openStory, endStory, refuseStory, lockStory, unrefuse, refuseCard, addHook, tickSteps, nightBeat});
