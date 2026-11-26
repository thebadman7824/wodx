/**
 * A sept to live in: the Storyteller's sept window and what it changes in play (B7874-B7882).
 *
 *   Chores: each Garou of the sept has a share of the caern's work (Dark Ages: Werewolf p. 167), marked day by day.
 *   The moot: held from here at the full moon. The Moot Rite's Gnosis goes to the caern (Places of power); a player's
 *   Garou who stayed away, or whose month of chores was kept or failed, gets a Renown suggestion on the approval queue
 *   (WoDX Actions applies it when approved, DA:W p. 99). The card lists the month's business: rank challenges, lessons,
 *   and the news a Dark Ages sept talks about (pp. 35-36, 74).
 *   Offices: a Garou offered a sept position takes it (written on the caern) or refuses it (a Renown suggestion).
 *   Rites: taught by an elder for tribute, a week a level; each week's roll is made here; a learned rite goes on the
 *   student's sheet (pp. 144-145).
 *   Rank challenges: WoDX Actions calls wodxRankReady when a Garou's Renown meets the next rank; the challenge is listed
 *   here until the benefactor sets it and it is passed (the rank goes up on the sheet) or failed (p. 101).
 * Rules: sept-rules.mjs; deeds: WoDX Actions garou-deeds-rules.js.
 */
import * as R from "../../wodx-rules/storyteller/sept-rules.mjs";
import * as C from "../../wodx-rules/storyteller/caern-rules.mjs";
import * as Power from "./power.mjs";
import {MOD, esc, setting, mutate, gmIds, isActiveGM, isPC, chron} from "./core.mjs";
import {describeTime} from "../../wodx-rules/core/calendar.mjs";
import * as TERMS from "../../wodx-rules/core/terms.mjs";

const now = () => game.time?.worldTime ?? 0;
const all = c => [...(c ?? [])];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const acts = () => game.modules.get("wodx-actions")?.api ?? game.wodxActions ?? null;
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 2000; } catch (e) { return 2000; } };
const isGarou = a => ["Werewolf", "Changing Breed"].includes(a?.type);
const dateNow = () => { try { const d = describeTime(now(), game.settings.get("wodx-chronicle", "latitude")); return [d.year, d.month, d.day]; } catch (e) { return null; } };
const moonIndex = () => { try { return describeTime(now(), game.settings.get("wodx-chronicle", "latitude")).moon.index; } catch (e) { return null; } };

export function registerSeptSettings() {
  game.settings.register(MOD, "septs", {scope: "world", config: false, type: Object, default: {}, onChange: () => SeptApp.refresh()});
}
/** The septs' records, one per caern (by the caern's place id), or "sept" for a sept with no caern on the register. */
export const caerns = () => { try { return Power.state().list.filter(p => p.kind === "caern"); } catch (e) { return []; } };
const firstKey = () => caerns()[0]?.id ?? "sept";
export const state = (key = firstKey()) => R.normState(setting("septs")?.[key]);
const save = (key, fn) => mutate("septs", cur => {
  const out = fn(R.normState(cur?.[key]));
  return {value: {...(cur ?? {}), [key]: out.value}, result: out.result};
});
const card = (title, html) => ChatMessage.create({speaker: {alias: "The sept"}, whisper: gmIds(), content: `<div class="wodx-card wst-sept"><h3>${esc(title)}</h3>${html}</div>`});
const suggest = async (id, deed, why) => { const a = game.actors.get(id); return a && isPC(a) ? acts()?.suggestDeed?.(a, deed, {why}) : null; };

/* ---- Members and chores ---- */

export async function setMembers(key, members) {
  const list = members.map(m => ({id: m.id, name: m.name ?? game.actors.get(m.id)?.name ?? "", chore: m.chore}));
  return save(key, s => ({value: {...s, members: list, since: s.since ?? now()}, result: list}));
}
export async function choreDone(key, actorId, t = now()) {
  return save(key, s => { const r = R.markChore(s, actorId, t); return {value: r.state, result: r.fresh}; });
}

/* ---- Offices ---- */

export async function offerOffice(key, actorId, office, accepts) {
  const a = game.actors.get(actorId), O = C.officesFor(yearNow())[office];
  if ( !a || !O ) return null;
  if ( accepts ) {
    if ( caerns().some(p => p.id === key) ) await Power.setOffice(key, office, a.id);
    await card(`${a.name} takes an office`, `<p>${esc(a.name)} is now ${esc(O.label)}${num(a.system?.renown?.rank) < O.rank ? `, though below the rank the office usually asks` : ""} (${R.REF} pp. 169-170).</p>`);
    return {accepted: true};
  }
  await suggest(a.id, "refuse-office", `refused to be ${O.label}`);
  await card(`${a.name} refuses an office`, `<p>${esc(a.name)} will not be ${esc(O.label)}. Refusing a sept position costs Renown in all three (${R.REF} p. 99): a suggestion is on the approval queue.</p>`);
  return {accepted: false};
}

/* ---- The moot ---- */

export async function holdMoot(key, presentIds = [], {force = false} = {}) {
  const s = state(key), t = now(), from = s.lastMoot ?? s.since ?? t - R.MOON;
  const mi = moonIndex();
  if ( !force && mi !== null && !R.mootMoon(mi) ) ui.notifications.info("The sept moot is held at the full moon; holding it now anyway.");
  const pcs = s.members.filter(m => isPC(game.actors.get(m.id))).map(m => m.id);
  const b = R.mootBusiness(s, {present: presentIds, pcs, from, to: t, date: dateNow()});
  for ( const d of b.deeds ) await suggest(d.id, d.deed, d.why);
  let rite = null;
  if ( caerns().some(p => p.id === key) && presentIds.length ) rite = await Power.holdMoot(key, presentIds);
  const caern = caerns().find(p => p.id === key), offices = caern?.offices ?? {};
  const wyrmfoe = offices.wyrmfoe ? game.actors.get(offices.wyrmfoe)?.name : null;
  const line = x => `<li>${x}</li>`;
  const html = [
    `<p>${presentIds.length} of the sept at the moot${caern ? ` at ${esc(caern.name)}` : ""}.${b.absent.length ? ` Away: ${esc(b.absent.map(m => m.name).join(", "))}.` : ""}</p>`,
    b.chores.length ? `<p><b>The month's work</b></p><ul>${b.chores.map(c => line(`${esc(c.name)}: ${esc(R.CHORES[c.chore].label.toLowerCase())}, ${c.worked} of ${c.of} days${c.deed === "chores-month" ? " (kept)" : c.deed === "chores-failed" ? " (failed)" : ""}`)).join("")}</ul>` : "",
    b.deeds.length ? `<p><b>Renown to confirm</b> (on the approval queue; only if others heard)</p><ul>${b.deeds.map(d => line(`${esc(d.name)}: ${esc(d.why)}`)).join("")}</ul>` : "",
    b.challenges.length ? `<p><b>Rank challenges</b></p><ul>${b.challenges.map(c => line(`${esc(c.name)} for Rank ${c.rank}: ${esc(c.task || "the benefactor has yet to set it")}`)).join("")}</ul>` : "",
    b.lessons.length ? `<p><b>Rites being taught</b></p><ul>${b.lessons.map(l => line(`${esc(l.studentName)}: the ${esc(l.rite)} from ${esc(l.teacher || "an elder")}, week ${l.weeks} of ${l.level}${l.state === "waiting" ? " (waiting three moons)" : ""}`)).join("")}</ul>` : "",
    b.news.length ? `<p><b>News told at the moot</b></p><ul>${b.news.map(n => line(`<b>${esc(n.title)}.</b> ${esc(n.text)} (${R.REF} ${n.page})`)).join("")}</ul>` : "",
    `<p>After the moot, the revel${wyrmfoe ? `, led by ${esc(wyrmfoe)}` : ""} (${R.REF} pp. 29-30, 169).</p>`,
    `<p class="wodx-quiet">Someone spoke without leave? <button type="button" data-wst-sept="noleave" data-key="${esc(key)}">Speaking without leave</button></p>`
  ].join("");
  await save(key, cur => ({value: {...cur, lastMoot: t, days: {}, since: t, news: [...cur.news, ...b.news.map(n => n.id)], moots: [...cur.moots, {at: t, present: presentIds.length}]}, result: null}));
  await card("The sept moot", html);
  return {...b, rite};
}

/* ---- Rites taught by an elder ---- */

const ritualsOf = a => num(a?.system?.abilities?.rituals?.value) || num(all(a?.items).find(i => /^rituals$/i.test(i.name))?.system?.value);
const intOf = a => num(a?.system?.attributes?.intelligence?.total ?? a?.system?.attributes?.intelligence?.value);

export async function beginLesson(key, {student, teacher = "", rite, level = 1, tribute = ""}) {
  const a = game.actors.get(student);
  if ( !a || !rite ) return {ok: false, why: "Name the student and the rite."};
  const ok = R.canLearn(level, ritualsOf(a));
  if ( !ok.ok ) { ui.notifications.warn(ok.why); return ok; }
  const l = R.normLesson({student: a.id, studentName: a.name, teacher, rite, level, tribute});
  await save(key, s => ({value: {...s, lessons: [...s.lessons, l]}, result: l}));
  await card(`${a.name} goes to learn a rite`, `<p>${esc(teacher || "An elder")} will teach the ${esc(rite)} (level ${l.level}), a week for each level${tribute ? `, for ${esc(tribute)}` : ""}. Rites are taught, never bought (${R.REF} pp. 144-145).</p>`);
  return {ok: true, lesson: l};
}

export async function lessonWeek(key, lessonId, {faces = null} = {}) {
  const l = state(key).lessons.find(x => x.id === lessonId), a = l ? game.actors.get(l.student) : null;
  if ( !l || !a ) return null;
  const t = now();
  if ( !R.lessonDue(l, t) ) { ui.notifications.info(`${a.name}: no lesson is due yet.`); return {due: false}; }
  const pool = Math.max(1, intOf(a) + ritualsOf(a)), diff = R.lessonDiff(intOf(a));
  let rolls = [];
  if ( !faces ) { const r = await new Roll(`${pool}d10`).evaluate(); faces = r.dice?.[0]?.results?.map(x => x.result) ?? []; rolls = [r]; }
  const got = TERMS.successes(faces, diff);
  const wp = num(a.system?.advantages?.willpower?.temporary);
  const r = R.lessonWeek(l, got, t, {willpower: wp > 0});
  if ( r.spend ) await a.update({"system.advantages.willpower.temporary": Math.max(0, wp - r.spend)});
  if ( r.learned ) {
    await a.createEmbeddedDocuments("Item", [{name: l.rite, type: "Power", img: "systems/worldofdarkness/assets/img/items/power_werewolf.svg",
      system: {type: "wod.types.rite", level: l.level, description: `<p>Taught by ${esc(l.teacher || "an elder")}${l.tribute ? ` for ${esc(l.tribute)}` : ""} (${R.REF} pp. 144-145).</p>`}}]);
    await suggest(a.id, "rite-learned", `learned the ${l.rite}`);
  }
  await save(key, s => ({value: {...s, lessons: s.lessons.map(x => (x.id === l.id ? r.lesson : x))}, result: r}));
  await ChatMessage.create({speaker: {alias: a.name}, whisper: [...new Set([...gmIds(), ...game.users.filter(u => a.testUserPermission?.(u, "OWNER")).map(u => u.id)])], rolls,
    content: `<div class="wodx-card wst-sept"><h3>${esc(a.name)}: a week learning the ${esc(l.rite)}</h3><p>Intelligence + Rituals, ${pool} dice at ${diff}: ${faces.join(", ")}. ${got.botch ? "A botch." : `${got.successes} successes.`}</p><p>${esc(r.line)}${r.spend ? " (Willpower spent.)" : ""}</p></div>`});
  return r;
}

/* ---- Rank challenges ---- */

export async function onRankReady({actorId, name, rank} = {}) {
  if ( !isActiveGM() || !actorId ) return null;
  const keys = Object.keys(setting("septs") ?? {});
  const key = keys.find(k => state(k).members.some(m => m.id === actorId)) ?? firstKey();
  const r = await save(key, s => { const x = R.addChallenge(s, {actorId, name, rank}, now()); return {value: x.state, result: x.added}; });
  if ( r ) await card(`${name} may challenge for Rank ${rank}`, `<p>${esc(name)}'s Renown meets Rank ${rank}. A Garou of that rank sets the challenge, of any kind they choose (${R.REF} p. 101). It waits in the sept window.</p>`);
  return r;
}
export async function setChallenge(key, id, {task = "", benefactor = ""} = {}) {
  return save(key, s => ({value: {...s, challenges: s.challenges.map(c => (c.id === id ? {...c, state: "set", task: task || acts()?.renownDeeds?.rankChallenge?.() || "a challenge of the benefactor's choosing", benefactor} : c))}, result: id}));
}
export async function endChallenge(key, id, passed) {
  const c = state(key).challenges.find(x => x.id === id), a = c ? game.actors.get(c.actorId) : null;
  if ( !c ) return null;
  if ( passed && a ) await a.update({"system.renown.rank": Math.max(num(a.system?.renown?.rank), c.rank)});
  await save(key, s => ({value: {...s, challenges: s.challenges.map(x => (x.id === id ? {...x, state: passed ? "passed" : "failed"} : x))}, result: id}));
  await card(`${c.name}: the rank challenge`, `<p>${passed ? `${esc(c.name)} passes${c.task ? ` (${esc(c.task)})` : ""} and is Rank ${c.rank} now.` : `${esc(c.name)} fails the challenge and stays at the rank held. It may be tried again when the benefactor allows.`} (${R.REF} p. 101)</p>`);
  return {passed};
}

/* ---- Hooks ---- */

export function registerSeptHooks() {
  Hooks.on("wodxRankReady", p => { onRankReady(p).catch(e => console.error(`${MOD} | sept`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    root?.querySelectorAll?.("[data-wst-sept=noleave]").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); noLeaveDialog(b.dataset.key); }));
  });
}
async function noLeaveDialog(key) {
  if ( !game.user.isGM ) return;
  const s = state(key);
  const DialogV2 = foundry.applications.api.DialogV2;
  const who = await DialogV2.wait({window: {title: "Speaking without leave"}, rejectClose: false,
    content: `<p>Speaking at a moot without leave costs a point of Honor (${R.REF} p. 99).</p><select name="who">${s.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select>`,
    buttons: [{action: "ok", label: "Suggest it", default: true, callback: (ev, b) => b.form.elements.who.value}, {action: "close", label: "Close"}]});
  if ( who && who !== "close" ) await suggest(who, "no-leave", "spoke at the moot without leave");
}

export const api = () => ({open: (key) => SeptApp.open(key), state, caerns, setMembers, choreDone, offerOffice, holdMoot, beginLesson, lessonWeek,
  onRankReady, setChallenge, endChallenge, rules: R});

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class SeptApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-sept", classes: ["wodx-app", "wst-sept"], window: {title: "The sept", resizable: true}, position: {width: 700, height: 760},
    actions: {members: SeptApp.#onMembers, chore: SeptApp.#onChore, moot: SeptApp.#onMoot, office: SeptApp.#onOffice, lesson: SeptApp.#onLesson,
      week: SeptApp.#onWeek, setc: SeptApp.#onSetC, endc: SeptApp.#onEndC, pick: SeptApp.#onPick}
  };
  static #instance;
  static open(key) { this.#instance ??= new SeptApp(); if ( key ) this.#instance.key = key; return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }
  key = null;

  async _renderHTML() {
    const cs = caerns();
    const key = this.key && (this.key === "sept" || cs.some(c => c.id === this.key)) ? this.key : (cs[0]?.id ?? "sept");
    this.key = key;
    const s = state(key), y = yearNow(), t = now(), garou = all(game.actors).filter(isGarou);
    const inSept = new Set(s.members.map(m => m.id));
    const offices = C.officesFor(y);
    const from = s.lastMoot ?? s.since ?? t;
    const opt = (v, l, on) => `<option value="${esc(v)}"${on ? " selected" : ""}>${esc(l)}</option>`;
    const memberOpts = s.members.map(m => opt(m.id, m.name)).join("");
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <section><div class="form-group"><label>Sept of</label><select name="caern" data-fixed data-wst-pick>${cs.map(c => opt(c.id, c.name, c.id === key)).join("")}${opt("sept", "(a sept with no caern on the register)", key === "sept")}</select><button type="button" data-action="pick">Show</button></div></section>
      <section><h3>The Garou of the sept</h3><form class="wst-sept-members">
        ${garou.map(a => { const m = s.members.find(x => x.id === a.id); return `<div class="form-group"><label><input type="checkbox" name="in_${a.id}"${inSept.has(a.id) ? " checked" : ""}> ${esc(a.name)}</label><select name="chore_${a.id}" data-fixed>${Object.entries(R.CHORES).map(([k, v]) => opt(k, v.label, (m?.chore ?? "fields") === k)).join("")}</select></div>`; }).join("") || `<p class="wodx-quiet">No Garou in the world.</p>`}
        <div class="wodx-buttons"><button type="button" data-action="members">Save the sept</button></div></form>
        <p class="wodx-quiet">Each Garou has a share of the caern's daily work: fields for the kin and the tax collector, shelters and barns, firewood, the bawn watch, the spirits, song and drumming (${R.REF} p. 167).</p></section>
      <section><h3>The month's work</h3>${s.members.map(m => { const r = R.reckonChores(s.days[m.id], from, t + 1); return `<div class="wst-chore" data-id="${m.id}"><b>${esc(m.name)}</b>: ${esc(R.CHORES[m.chore].label.toLowerCase())}, ${r.worked} of ${r.of} days since the last moot <button type="button" data-action="chore" data-id="${m.id}">Done today</button></div>`; }).join("") || `<p class="wodx-quiet">No one in the sept yet.</p>`}
        <p class="wodx-quiet">A month of the sept's chores wins a point of Honor; a month of them failed costs two (${R.REF} p. 99). WoDX counts three days in four as kept and fewer than one in four as failed.</p></section>
      <section><h3>The moot</h3><form class="wst-sept-moot">${s.members.map(m => `<label><input type="checkbox" name="here_${m.id}" checked> ${esc(m.name)}</label>`).join(" ")}
        <div class="wodx-buttons"><button type="button" data-action="moot">Hold the moot</button></div></form>
        <p class="wodx-quiet">Monthly, at the full moon. The Moot Rite fills the caern; a player's Garou who stays away loses a point of Wisdom (${R.REF} pp. 29-30, 99). ${s.lastMoot !== null ? `Last held ${Math.round((t - s.lastMoot) / TERMS.DAY)} days ago.` : "Not held yet."}</p></section>
      <section><h3>Offices</h3><form class="wst-sept-office"><div class="form-group"><select name="who" data-fixed>${memberOpts}</select><select name="office" data-fixed>${Object.entries(offices).map(([k, v]) => opt(k, v.label)).join("")}</select></div>
        <div class="wodx-buttons"><button type="button" data-action="office" data-accepts="1">Takes it</button><button type="button" data-action="office" data-accepts="0">Refuses it</button></div></form>
        <p class="wodx-quiet">${C.daYear(y) ? `The Dark Ages offices (${R.REF} pp. 169-170).` : "The W20 offices (W20 pp. 57-58)."} Refusing a position costs Glory, Honor and Wisdom (${R.REF} p. 99).</p></section>
      <section><h3>Rites taught by an elder</h3>${s.lessons.map(l => `<div class="wst-lesson" data-id="${l.id}"><b>${esc(l.studentName)}</b>: the ${esc(l.rite)} (level ${l.level}) from ${esc(l.teacher || "an elder")}${l.tribute ? ` for ${esc(l.tribute)}` : ""}: ${l.state === "learned" ? "learned" : l.state === "given-up" ? "given up" : l.state === "waiting" ? "waiting three moons" : `week ${l.weeks} of ${l.level}`}${["learning", "waiting"].includes(l.state) ? ` <button type="button" data-action="week" data-id="${l.id}"${R.lessonDue(l, t) ? "" : " disabled"}>This week's lesson</button>` : ""}</div>`).join("") || `<p class="wodx-quiet">No lessons.</p>`}
        <form class="wst-sept-lesson"><div class="form-group"><label>Student</label><select name="student" data-fixed>${memberOpts}</select></div>
        <div class="form-group"><label>Teacher</label><input type="text" name="teacher" placeholder="the elder"></div><div class="form-group"><label>Rite</label><input type="text" name="rite"></div>
        <div class="form-group"><label>Level</label><input type="number" name="level" min="1" max="5" value="1"></div><div class="form-group"><label>Tribute</label><input type="text" name="tribute" placeholder="aid, service or chiminage"></div>
        <div class="wodx-buttons"><button type="button" data-action="lesson">Begin the lessons</button></div></form>
        <p class="wodx-quiet">A week for each level; each week Intelligence + Rituals (WoDX: at 10 minus Intelligence). A failed week costs Willpower to go on; a botch means three full moons' wait. No rite above the student's Rituals (${R.REF} pp. 144-145).${C.daYear(y) ? "" : " After the Dark Ages, W20 also lets rites be bought with experience."}</p></section>
      <section><h3>Rank challenges</h3>${s.challenges.map(c => `<div class="wst-challenge" data-id="${c.id}"><b>${esc(c.name)}</b> for Rank ${c.rank}: ${c.state === "waiting" ? "waiting for the benefactor" : c.state === "set" ? esc(c.task) : c.state}
        ${c.state === "waiting" ? `<button type="button" data-action="setc" data-id="${c.id}">Set a challenge from the book</button>` : ""}${c.state === "set" ? `<button type="button" data-action="endc" data-id="${c.id}" data-passed="1">Passed</button><button type="button" data-action="endc" data-id="${c.id}" data-passed="0">Failed</button>` : ""}</div>`).join("") || `<p class="wodx-quiet">None waiting.</p>`}
        <p class="wodx-quiet">When a Garou's Renown meets the next rank, a Garou of that rank sets a challenge of their choosing (${R.REF} p. 101).</p></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onPick(event, target) { this.key = this.element.querySelector("[data-wst-pick]").value; this.render(); }
  static async #onMembers(event, target) {
    const f = target.closest("form").elements;
    const list = all(game.actors).filter(isGarou).filter(a => f[`in_${a.id}`]?.checked).map(a => ({id: a.id, name: a.name, chore: f[`chore_${a.id}`]?.value}));
    await setMembers(this.key, list);
  }
  static async #onChore(event, target) { await choreDone(this.key, target.dataset.id); }
  static async #onMoot(event, target) {
    const f = target.closest("form").elements;
    await holdMoot(this.key, state(this.key).members.filter(m => f[`here_${m.id}`]?.checked).map(m => m.id));
  }
  static async #onOffice(event, target) {
    const f = target.closest("form").elements;
    if ( !f.who.value ) return ui.notifications.warn("Choose a Garou of the sept.");
    await offerOffice(this.key, f.who.value, f.office.value, target.dataset.accepts === "1");
  }
  static async #onLesson(event, target) {
    const f = target.closest("form").elements;
    await beginLesson(this.key, {student: f.student.value, teacher: f.teacher.value, rite: f.rite.value.trim(), level: Number(f.level.value), tribute: f.tribute.value});
  }
  static async #onWeek(event, target) { await lessonWeek(this.key, target.dataset.id); }
  static async #onSetC(event, target) { await setChallenge(this.key, target.dataset.id); }
  static async #onEndC(event, target) { await endChallenge(this.key, target.dataset.id, target.dataset.passed === "1"); }
}
