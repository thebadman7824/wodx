import * as D from "./dreams-rules.mjs";
import {MOD, esc, chron, isActiveGM, setting, mutate} from "./core.mjs";
import {getEngine, describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * Dreams and visions you write: scheduled by the Storyteller, released by the clock as a journal that only the
 * dreamer's players (and the Storyteller) can open, with a whispered card. A time skip releases every dream it crossed.
 */

const FOLDER = "WoDX dreams";
const now = () => game.time?.worldTime ?? 0;
const dateOf = t => { try { return describeTime(Number(t) || 0).dateLabel; } catch { return ""; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch { return false; } };
const owners = actor => [...(game.users ?? [])].filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER"));

export function registerDreamSettings() {
  game.settings.register(MOD, "dreams", {scope: "world", config: false, type: Array, default: [], onChange: () => DreamsApp.refresh()});
  game.settings.register(MOD, "dreams.sleepSeen", {scope: "world", config: false, type: Number, default: 0});
}
export const dreams = () => D.normDreams(setting("dreams"));

/** Write or change a dream. Returns it. */
export async function saveDream(raw) {
  if ( !game.user.isGM ) return null;
  const d = D.normDream({id: raw.id || foundry.utils.randomID(), ...raw});
  await mutate("dreams", cur => {
    const list = D.normDreams(cur);
    const i = list.findIndex(x => x.id === d.id);
    if ( i >= 0 ) list[i] = {...list[i], ...d, released: list[i].released, journalId: list[i].journalId, releasedAt: list[i].releasedAt};
    else list.push(d);
    return {value: list};
  });
  return d;
}
export async function removeDream(id) {
  return mutate("dreams", cur => ({value: D.normDreams(cur).filter(d => d.id !== id)}));
}

async function folder() {
  return game.folders.find(f => f.type === "JournalEntry" && f.name === FOLDER)
    ?? Folder.create({name: FOLDER, type: "JournalEntry", color: "#4b3a6b"});
}

/** Release one dream now: the journal, its sharing, the card. Returns the journal. */
export async function releaseDream(id) {
  if ( !game.user.isGM ) return null;
  const d = dreams().find(x => x.id === id);
  if ( !d || d.released ) return null;
  const actor = game.actors.get(d.actorId);
  const who = owners(actor);
  const ownership = {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  for ( const u of who ) ownership[u.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const f = await folder();
  const journal = await JournalEntry.create({name: d.title, folder: f?.id ?? null, ownership,
    pages: [{name: d.title, type: "text", text: {content: D.dreamHtml(d.text), format: 1}}],
    flags: {[MOD]: {dream: d.id, actorId: d.actorId}}});
  const gms = [...(game.users ?? [])].filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({whisper: [...who.map(u => u.id), ...gms], speaker: {alias: "A dream"},
    content: `<div class="wodx-card wstory wstory-dream"><p><strong>${esc(actor?.name ?? "Someone")} dreams.</strong></p><p>@UUID[${journal.uuid}]{${esc(d.title)}}</p></div>`});
  await mutate("dreams", cur => ({value: D.normDreams(cur).map(x => x.id === id ? {...x, released: true, releasedAt: now(), journalId: journal.id} : x)}));
  return journal;
}

/** The clock: release every dream whose time has come (the active Storyteller's client). */
let checking = Promise.resolve();
export function checkDreams({force = false} = {}) {
  checking = checking.then(async () => {
    if ( !isActiveGM() || (skipping() && !force) ) return [];
    const due = D.dueDreams(setting("dreams"), now());
    for ( const d of due ) await releaseDream(d.id);
    return due.map(d => d.id);
  }).catch(e => { console.error(`${MOD} |`, e); return []; });
  return checking;
}

/* ---- Storyteller 0.64.0 (B2911): dreams tied to powers, Merits and Flaws, and the Nightmares Flaw ---- */

const powerDots = (actor, re) => Math.max(0, ...[...(actor?.items ?? [])].filter(i => i.type === "Power" && re.test(String(i.name ?? "").trim())).map(i => Number(i.system?.value) || 1));
/** Does the actor still have what the dream is tied to? */
export function holdsSource(actor, source) {
  const s = D.SOURCES[D.cleanSource(source)];
  if ( !actor || !s?.kind ) return !!actor;
  if ( s.kind === "power" ) return powerDots(actor, s.re) > 0;
  try { return (chron()?.traits?.has?.(actor, s.key) ?? 0) > 0; } catch (e) { return false; }
}
/** The time of today's sleep hour on the chronicle's calendar. */
function todaySleep(t = now()) {
  try { const e = getEngine(), d = e.timeToDate(t); return e.dateToTime({year: d.year, month: d.month, day: d.day, hour: D.DEFAULT_HOUR, minute: 0}); }
  catch (e) { return Math.floor(t / 86400) * 86400 + D.DEFAULT_HOUR * 3600; }
}
const SLEEP_FLAG = "sleepSeen";
const NIGHTMARE_FX = "Nightmares";

/** After a day's sleep: tied dreams come, and each player character with the Nightmares Flaw rolls Willpower. */
export async function afterSleep() {
  if ( !isActiveGM() ) return [];
  const t = now(), slept = todaySleep(t);
  if ( slept > t ) return [];
  const seen = Number(game.settings.get(MOD, "dreams.sleepSeen") ?? 0) || 0;
  if ( seen >= slept ) return [];
  await game.settings.set(MOD, "dreams.sleepSeen", slept);
  if ( !seen ) return [];  // the first look only marks the day, so a world that was already past its sleep does not roll at once
  const done = [];
  for ( const d of D.tiedDue(setting("dreams"), t, slept, x => holdsSource(game.actors.get(x.actorId), x.source)) ) { await releaseDream(d.id); done.push(d.id); }
  for ( const a of game.actors.filter(x => x.hasPlayerOwner && holdsSource(x, "nightmares")) ) done.push(await nightmares(a));
  return done;
}

async function nightmares(actor) {
  for ( const e of actor.effects.filter(x => x.flags?.[MOD]?.[SLEEP_FLAG]) ) await e.delete();
  const s = actor.system ?? {};
  const wp = Math.max(1, Number(s.willpower?.temporary ?? s.advantages?.willpower?.temporary ?? s.willpower?.permanent ?? 1) || 1);
  const roll = await new Roll(`${wp}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  const succ = faces.filter(f => f >= D.NIGHTMARES.difficulty).length, ones = faces.filter(f => f === 1).length;
  const r = D.nightmareResult(Math.max(0, succ - ones), succ === 0 && ones > 0);
  if ( r.lose ) await actor.createEmbeddedDocuments("ActiveEffect", [{name: NIGHTMARE_FX, img: "icons/svg/sleep.svg", description: r.words,
    flags: {[MOD]: {[SLEEP_FLAG]: true, diceLess: r.lose}}}]);
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), whisper: [...game.users.filter(u => u.isGM).map(u => u.id), ...owners(actor).map(u => u.id)],
    content: `<div class="wodx-card wst-nightmares"><p><b>${esc(actor.name)}</b> wakes from bad dreams.</p><p>Willpower (difficulty ${D.NIGHTMARES.difficulty}): ${faces.join(", ")}.</p><p>${esc(r.words)}</p></div>`});
  return actor.id;
}

export function registerDreamHooks() {
  Hooks.on("updateWorldTime", () => { if ( !skipping() ) { checkDreams(); afterSleep().catch(e => console.error(`${MOD} |`, e)); } });
  Hooks.on("wodxSkipEnd", () => { if ( !chron()?.isHeld?.() ) { checkDreams({force: true}); afterSleep().catch(e => console.error(`${MOD} |`, e)); } });
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class DreamsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-dreams",
    classes: ["wodx", "wodx-dreams-app"],
    window: {title: "Dreams and visions", icon: "fa-solid fa-moon", resizable: true},
    position: {width: 600, height: "auto"},
    actions: {add: DreamsApp.#onAdd, release: DreamsApp.#onRelease, remove: DreamsApp.#onRemove, open: DreamsApp.#onOpen}
  };
  static #instance;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new DreamsApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const {waiting, done} = D.sortDreams(setting("dreams"));
    const name = id => game.actors.get(id)?.name ?? "(gone)";
    const chars = [...(game.actors ?? [])].filter(a => a.type !== "Group").sort((a, b) => a.name.localeCompare(b.name));
    const today = getEngine().timeToDate(now());
    const row = d => `<div class="wstory-dream-row" data-search-item data-search-text="${esc(`${name(d.actorId)} ${d.title}`)}">
      <div><strong>${esc(name(d.actorId))}: ${esc(d.title)}</strong></div>
      <div class="wodx-quiet">${d.released ? `Came ${esc(dateOf(d.releasedAt))}.` : d.at !== null ? `Comes ${esc(dateOf(d.at))}.` : "Waits for you to release it."}</div>
      <div class="wodx-buttons">${d.released ? `<button type="button" data-action="open" data-id="${esc(d.journalId ?? "")}">Open the journal</button>`
        : `<button type="button" data-action="release" data-id="${esc(d.id)}">Release now</button>`}<button type="button" data-action="remove" data-id="${esc(d.id)}">Remove</button></div></div>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <p class="wodx-quiet">Write a dream or vision for a character between sessions. When the clock reaches its time it comes as a journal in the folder ${FOLDER} that only that character's players and you can open, with a whispered card. A time skip brings every dream it passes.</p>
      <section><h3>A new dream</h3><form class="wstory-dream-new">
        ${chars.length > 8 ? searchBox("select[name=actor]", "Search characters…", "Search characters") : ""}
        <div class="form-group"><label>Who dreams</label><select name="actor"${chars.length > 8 ? "" : " data-fixed"}>${chars.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Title</label><input type="text" name="title" maxlength="200" placeholder="The drowned bell"></div>
        <div class="form-group stacked"><label>The dream</label><textarea name="text" rows="6" placeholder="Your own words. A blank line starts a new paragraph."></textarea></div>
        <div class="form-group"><label>Comes on (year, month, day, hour)</label><div class="form-fields">
          <input type="number" name="year" placeholder="${today.year}" step="1" aria-label="Year"><input type="number" name="month" min="1" max="12" placeholder="month" aria-label="Month"><input type="number" name="day" min="1" max="31" placeholder="day" aria-label="Day"><input type="number" name="hour" min="0" max="23" placeholder="${D.DEFAULT_HOUR}" aria-label="Hour"></div></div>
        <div class="form-group"><label>Tied to</label><select name="source" data-fixed>${Object.entries(D.SOURCES).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select></div>
        <p class="wodx-quiet">Leave the year blank to release it by hand. A dream tied to a power, a Merit or a Flaw with no year comes by itself at the dreamer's next day's sleep, while the dreamer still has it.</p>
        <div class="wodx-buttons"><button type="button" data-action="add"${chars.length ? "" : " disabled"}><i class="fa-solid fa-feather"></i> Keep this dream</button></div></form></section>
      <section><h3>Waiting (${waiting.length})</h3>${searchBox(".wstory-dreams-waiting", "Search dreams…", "Search waiting dreams")}
        <div class="wstory-dreams-waiting">${waiting.map(row).join("") || "<p class=\"wodx-quiet\">None waiting.</p>"}</div></section>
      <section><h3>Already dreamt (${done.length})</h3>${searchBox(".wstory-dreams-done", "Search dreams…", "Search dreams already dreamt")}
        <div class="wstory-dreams-done">${done.map(row).join("") || "<p class=\"wodx-quiet\">None yet.</p>"}</div></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onAdd(event, target) {
    const f = target.closest("form").elements;
    if ( !f.actor.value || !f.text.value.trim() ) return ui.notifications.warn("Choose who dreams and write the dream first.");
    let at = null;
    if ( f.year.value ) {
      const hour = f.hour.value === "" ? D.DEFAULT_HOUR : Math.max(0, Math.min(23, Number(f.hour.value) || 0));
      try { at = getEngine().dateToTime({year: Number(f.year.value), month: Number(f.month.value) || 1, day: Number(f.day.value) || 1, hour, minute: 0}); }
      catch { return ui.notifications.warn("That date never happened here: it was skipped at the calendar reform."); }
    }
    await saveDream({actorId: f.actor.value, title: f.title.value, text: f.text.value, at, source: f.source?.value ?? ""});
    if ( at !== null && at <= now() ) await checkDreams({force: true});
  }
  static async #onRelease(event, target) { await releaseDream(target.dataset.id); }
  static async #onRemove(event, target) { await removeDream(target.dataset.id); }
  static #onOpen(event, target) { game.journal.get(target.dataset.id)?.sheet?.render(true); }
}
