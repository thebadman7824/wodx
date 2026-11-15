/**
 * Learning from a source (B6230-B6239), the Foundry part. When experience is spent, the spend names where the trait is
 * learned; the points are taken at once and the trait rises when a long task (WoDX Storyteller) is finished. While the
 * study runs the character's token carries a book mark, and the end shows on the token and in a card.
 *
 * Record: flags["wodx-creation"].learning[id] = {purchase, source, taskId, xpItemId, effectId, started, by}.
 * The Storyteller can turn the rule off for the world (setting learning) or waive it for one character for a story
 * (flag learnWaived); then a spend raises the trait at once, as before.
 */
import {MODULE_ID, esc, lineOf, payerOf, disciplinesOf, clanOf, vampireEra, applyPurchase, disciplineItem} from "./actor-data.mjs";
import {clanDisciplines} from "./rules.mjs";
import * as L from "./learn-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const ST = "wodx-storyteller";
const SECOND_ABILITY = /^wod\.types\.(talent|skill|knowledge)secondability$/;
const storyteller = () => game.modules.get(ST)?.active ? game.modules.get(ST).api : null;
const isActiveGM = () => !!game.user?.isGM && game.users?.activeGM?.id === game.user.id;
const yearNow = () => { try { return getEngine().timeToDate(game.time?.worldTime ?? 0).year; } catch (e) { return null; } };
const loc = k => (typeof k === "string" && k.startsWith("wod.") ? (game.i18n?.localize?.(k) ?? k) : k);
const num = v => Math.max(0, Math.trunc(Number(v) || 0));
export const IMG = "icons/svg/book.svg";
export const STATUS = "wodx-studying";

export function registerLearnSettings() {
  game.settings.register(MODULE_ID, "learning", {
    name: "Learning needs a source", scope: "world", config: true, type: Boolean, default: true,
    hint: "When experience is spent, name a teacher, a book, a school or practice; the trait rises when the study is done (a long task). Off: experience raises a trait at once."
  });
}

export const recordsOf = actor => actor?.flags?.[MODULE_ID]?.learning ?? {};
export const waived = actor => !!actor?.getFlag?.(MODULE_ID, "learnWaived");
/** Does a spend for this actor need a source? */
export function needsSource(actor, purchase = null) {
  let on = true;
  try { on = game.settings.get(MODULE_ID, "learning") !== false; } catch (e) { /* not registered */ }
  if ( !on || waived(actor) || !storyteller()?.tasks?.save ) return false;
  return !purchase || purchase.kind !== "training";
}

/** GM: waive the rule for one character for a story, or put it back. */
export async function setWaived(actor, on) {
  if ( !game.user.isGM || !actor ) return null;
  return on ? actor.setFlag(MODULE_ID, "learnWaived", true) : actor.unsetFlag(MODULE_ID, "learnWaived");
}

/* -------------------------------------------- */
/*  Ratings on any sheet                         */
/* -------------------------------------------- */

/** What an actor has of the trait a purchase raises: the teacher's dots, or the learner's now. */
export function ratingOf(a, p) {
  const sys = a?.system ?? {};
  const label = L.norm(p?.label);
  const byItem = list => list.find(i => L.norm(i.name) === label);
  switch ( p?.kind ) {
    case "attribute": return num(sys.attributes?.[p.key]?.value);
    case "ability": case "newAbility": {
      if ( p.kind === "ability" && !String(p.key).startsWith("item:") && sys.abilities?.[p.key] ) return num(sys.abilities[p.key].value);
      const own = Object.entries(sys.abilities ?? {}).find(([k, v]) => L.norm(k) === label || L.norm(loc(v?.altlabel || v?.label)) === label);
      if ( own ) return num(own[1]?.value);
      const it = byItem([...(a?.items ?? [])].filter(i => i.type === "Trait" && SECOND_ABILITY.test(i.system?.type ?? "")));
      return it ? num(it.system?.value) : 0;
    }
    case "discipline": case "newDiscipline": {
      const d = disciplinesOf(a).find(x => L.norm(x.name) === label);
      return d ? num(d.value) : 0;
    }
    case "virtue": return num(sys.advantages?.virtues?.[p.key]?.permanent);
    case "road": return num(sys.advantages?.path?.permanent);
    case "willpower": return num(sys.advantages?.willpower?.permanent ?? sys.willpower?.permanent);
    default: return 0;
  }
}

/** Dots of a Background by name (Resources), from the sheet's background items. */
export function backgroundDots(a, name) {
  const n = L.norm(name);
  const it = [...(a?.items ?? [])].find(i => L.norm(i.name) === n && /background/i.test(String(i.system?.type ?? i.type)));
  return it ? num(it.system?.value) : 0;
}

const inClan = (actor, p) => {
  if ( lineOf(actor) !== "vampire" ) return true;
  const list = clanDisciplines(clanOf(actor), vampireEra()).map(d => L.norm(d));
  return clanOf(actor)?.id === "caitiff" || list.includes(L.norm(p.label));
};

/* -------------------------------------------- */
/*  The choices                                  */
/* -------------------------------------------- */

/** Teachers in the world who know it well enough: the user's view of the world, those on the scene first. */
export function teachersFor(actor, p, {user = game.user, limit = 12} = {}) {
  const here = new Set((canvas?.scene?.tokens ?? []).map(t => t.actorId));
  const next = Number(p?.next) || 1;
  return [...(game.actors ?? [])].filter(a => a.id !== actor.id && (user.isGM || a.visible) && !a.flags?.["wodx-npc"]?.passerbyBase)
    .map(a => ({a, rating: ratingOf(a, p)})).filter(x => x.rating >= next)
    .sort((x, y) => (Number(here.has(y.a.id)) - Number(here.has(x.a.id))) || (y.rating - x.rating) || x.a.name.localeCompare(y.a.name))
    .slice(0, limit);
}

/** Every source for this purchase, with its plan and the reason when it is closed. */
export function choicesFor(actor, p, {user = game.user} = {}) {
  const line = lineOf(actor);
  const q = {...p, clan: inClan(actor, p)};
  const {allowed, why} = L.sourcesFor(q, {line});
  const year = yearNow();
  const st = storyteller();
  const out = [];
  const pool = plan => { try { return st?.tasks?.pool?.(actor, taskData(actor, q, plan)) ?? 3; } catch (e) { return 3; } };
  const push = (src, extra = {}) => {
    const plan = L.planFor(q, src);
    const ok = plan.ok && allowed.includes(src.kind) && !extra.closed;
    out.push({src, plan, ok, why: !allowed.includes(src.kind) ? why : (extra.closed || plan.why), time: L.timeWords(plan, pool(plan) + (plan.dice ?? 0))});
  };
  for ( const {a, rating} of teachersFor(actor, q, {user}) ) {
    const closed = L.needsBlood(q, {line}) && (a.type !== actor.type || num(a.system?.advantages?.bloodpool?.temporary) < 1) ? "A new out-of-clan Discipline needs a Kindred teacher with a blood point to feed (V20 pdf 136)" : "";
    push({kind: "teacher", id: a.id, name: a.name, rating}, {closed});
  }
  if ( allowed.includes("teacher") ) push({kind: "storyteller", name: L.SOURCE_KINDS.storyteller});
  for ( const it of actor.items ?? [] ) {
    const b = L.bookOf(it);
    if ( !b ) continue;
    if ( !L.bookTeaches(b, q) ) continue;
    push({kind: "book", id: it.id, name: it.name, quality: b.quality, max: b.max});
  }
  for ( const c of L.coursesFor(q, year) ) {
    const closed = c.resources && backgroundDots(payerOf(actor), "Resources") < c.resources ? `Needs Resources ${c.resources} to pay for it` : "";
    push({kind: "course", id: c.key, name: c.name, quality: c.quality, interval: c.interval}, {closed});
  }
  push({kind: "practice", name: L.SOURCE_KINDS.practice});
  return {choices: out, why, allowed};
}

/* -------------------------------------------- */
/*  The dialog                                   */
/* -------------------------------------------- */

/** Ask where it is learned. Returns a source, {waive: true} (GM: learn at once), or null. */
export async function chooseSource(actor, p) {
  const {DialogV2} = foundry.applications.api;
  const {choices, why} = choicesFor(actor, p);
  const first = choices.findIndex(c => c.ok);
  const row = (c, i) => `<li class="${c.ok ? "" : "wodx-muted"}"><label><input type="radio" name="src" value="${i}" ${i === first ? "checked" : ""} ${c.ok ? "" : "disabled"}>
    <b>${esc(c.src.kind === "teacher" ? `${c.src.name} (${c.src.rating} dots)` : c.src.name)}</b>${c.src.quality ? ` <span class="wodx-tag">${esc(c.src.quality)}</span>` : ""}
    <span class="wodx-quiet">${c.ok ? esc(`${c.time}; difficulty ${c.plan.diff}, ${c.plan.goal} successes`) : esc(c.why)}</span></label></li>`;
  const gm = game.user.isGM ? `<div class="form-group"><label><input type="checkbox" name="waive"> Waive it this time: learn at once</label></div>` : "";
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog", "wodx-learn"],
    window: {title: `Where is it learned? ${p.label}`},
    content: `<p>${esc(p.label)} ${p.current} → ${p.next} for ${p.cost} experience. The points are spent now; the trait rises when the study is done.</p>
      <p class="wodx-quiet">${esc(why)}</p>
      <ul class="wodx-list wodx-learn-list" data-fixed>${choices.map(row).join("")}</ul>${gm}`,
    ok: {label: game.user.isGM ? "Begin" : "Ask", callback: (event, button) => ({i: Number(button.form.elements.src?.value ?? -1), waive: !!button.form.elements.waive?.checked})},
    rejectClose: false
  });
  if ( !result ) return null;
  if ( result.waive ) return {waive: true};
  const c = choices[result.i];
  if ( !c?.ok ) { ui.notifications.warn("Pick where it is learned."); return null; }
  return {...c.src};
}

/* -------------------------------------------- */
/*  Beginning and ending                         */
/* -------------------------------------------- */

function taskData(actor, p, plan) {
  const sysAbility = p.kind === "ability" && !String(p.key).startsWith("item:") && !!actor.system?.abilities?.[p.key];
  const r = L.rollFor(p, {sysAbility});
  return {kind: "train", attr: r.attr, ability: r.ability, pool: r.pool, dice: (plan.dice ?? 0) + (r.extra ?? 0), diff: plan.diff, interval: plan.interval, goal: plan.goal};
}

/** GM side: check a source again, as the world is now. Resolves "a teacher the Storyteller finds". */
export function resolveSource(actor, p, src) {
  const line = lineOf(actor);
  const q = {...p, clan: inClan(actor, p)};
  if ( !src?.kind ) return {ok: false, why: "Name where it is learned (a teacher, a book, a school or practice)."};
  const {allowed, why} = L.sourcesFor(q, {line});
  if ( src.kind === "storyteller" ) {
    const best = teachersFor(actor, q, {user: game.user, limit: 40}).find(({a}) => !L.needsBlood(q, {line}) || (a.type === actor.type && num(a.system?.advantages?.bloodpool?.temporary) >= 1));
    if ( !best ) return {ok: false, why: `No one in the chronicle knows ${p.label} to ${p.next}, so there is no teacher to find.`};
    src = {kind: "teacher", id: best.a.id, name: best.a.name, rating: best.rating, found: true};
  }
  if ( !allowed.includes(src.kind) ) return {ok: false, why};
  if ( src.kind === "teacher" ) {
    const a = game.actors.get(src.id);
    if ( !a ) return {ok: false, why: "That teacher is gone."};
    src = {...src, name: a.name, rating: ratingOf(a, q)};
    if ( L.needsBlood(q, {line}) && (a.type !== actor.type || num(a.system?.advantages?.bloodpool?.temporary) < 1) ) return {ok: false, why: "The teacher must be Kindred with a blood point to feed (V20 pdf 136)."};
  }
  if ( src.kind === "book" ) {
    const it = actor.items.get(src.id);
    const b = it ? L.bookOf(it) : null;
    if ( !b || !L.bookTeaches(b, q) ) return {ok: false, why: "That book is no longer carried, or does not teach this far."};
    src = {...src, name: it.name, quality: b.quality};
  }
  if ( src.kind === "course" ) {
    const c = L.coursesFor(q, yearNow()).find(x => x.key === src.id);
    if ( !c ) return {ok: false, why: "No such school or course in this year."};
    if ( c.resources && backgroundDots(payerOf(actor), "Resources") < c.resources ) return {ok: false, why: `Needs Resources ${c.resources} to pay for it.`};
    src = {...src, name: c.name, quality: c.quality, interval: c.interval};
  }
  const plan = L.planFor(q, src);
  return plan.ok ? {ok: true, src, plan, q} : {ok: false, why: plan.why};
}

const ownersOf = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
function float(actor, text, fill = "#c9b27c") {
  for ( const t of canvas?.scene?.tokens ?? [] ) {
    if ( t.actorId !== actor.id || !t.object ) continue;
    try { canvas.interface?.createScrollingText?.(t.object.center, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fill, stroke: "#1a1206", strokeThickness: 4, fontSize: 24, duration: 2600}); } catch (e) { /* no canvas */ }
  }
}

/**
 * Active GM: pay the experience and start the study. purchase: the re-checked option. Returns {ok, learning, reason}.
 */
export async function begin(actor, purchase, source, {by = game.user.name, time = game.time.worldTime} = {}) {
  const st = storyteller();
  if ( !st?.tasks?.save ) return {ok: false, reason: "WoDX Storyteller's long tasks are needed for learning."};
  const r = resolveSource(actor, purchase, source);
  if ( !r.ok ) return {ok: false, reason: r.why};
  const {src, plan, q} = r;
  const payer = payerOf(actor);
  const id = foundry.utils.randomID();
  if ( L.needsBlood(q, {line: lineOf(actor)}) ) {
    const t = game.actors.get(src.id);
    await t.update({"system.advantages.bloodpool.temporary": num(t.system.advantages.bloodpool.temporary) - 1});
  }
  const name = payer === actor ? L.logName(purchase, src) : `${actor.name}: ${L.logName(purchase, src)}`;
  const [xpItem] = await payer.createEmbeddedDocuments("Item", [{name, type: "Experience", system: {amount: purchase.cost, isspent: true},
    flags: {[MODULE_ID]: {time, kind: purchase.kind, key: purchase.key, from: purchase.current, to: purchase.next, by, for: actor.id, learning: id}}}]);
  const task = await st.tasks.save(actor, {...taskData(actor, q, plan), name: `Learn ${purchase.label} ${purchase.next} (${src.kind === "practice" ? "practice" : src.name})`,
    note: `Experience paid (${purchase.cost}). The trait rises when this is finished. ${L.SOURCE_KINDS[src.kind]}: ${src.name}.`, opts: {learn: id}});
  const [fx] = await actor.createEmbeddedDocuments("ActiveEffect", [{name: `Studying ${purchase.label}`, img: IMG, statuses: [STATUS],
    description: `<p>Learning ${esc(purchase.label)} ${purchase.next} from ${esc(src.name)}.</p>`, flags: {[MODULE_ID]: {learning: id}}}]);
  await actor.update({[`flags.${MODULE_ID}.learning.${id}`]: {purchase: {kind: purchase.kind, key: purchase.key, label: purchase.label, current: purchase.current, next: purchase.next, cost: purchase.cost, group: purchase.group ?? ""},
    source: {kind: src.kind, id: src.id ?? "", name: src.name, rating: src.rating ?? null, quality: src.quality ?? ""}, taskId: task?.id ?? "", xpItemId: xpItem?.id ?? "", payerId: payer.id,
    effectId: fx?.id ?? "", started: time, by, done: false}});
  float(actor, `Studying ${purchase.label}`);
  const pool = (() => { try { return st.tasks.pool(actor, taskData(actor, q, plan)); } catch (e) { return 3; } })();
  await ChatMessage.create({speaker: {alias: "Learning"}, whisper: ownersOf(actor),
    content: `<div class="wodx-card wodx-learn"><h3>${esc(actor.name)} begins to learn ${esc(purchase.label)}</h3>
      <p>${esc(purchase.label)} ${purchase.current} → ${purchase.next}, from ${esc(src.kind === "practice" ? "practice alone" : src.name)}${src.found ? " (found by the Storyteller)" : ""}. ${purchase.cost} experience is spent now.</p>
      <p>A long task: ${pool} dice at difficulty ${plan.diff}, ${plan.goal} successes, one roll each ${plan.interval === "day" ? "night" : plan.interval}; ${esc(L.timeWords(plan, pool))}.</p>
      <p class="wodx-quiet">V20 pdf 131; V20 Dark Ages pdf 189. Stop the task in Long tasks to give the experience back.</p></div>`});
  return {ok: true, learning: id, source: src, plan};
}

/** Active GM: a long task has ended. A finished study raises the trait. */
export async function onTaskDone({actor, task} = {}) {
  if ( !isActiveGM() || task?.status !== "done" || !task?.opts?.learn ) return null;
  const id = task.opts.learn;
  const rec = recordsOf(actor)[id];
  if ( !rec || rec.done ) return null;
  const p = rec.purchase;
  const now = ratingOf(actor, p);
  if ( now < p.next ) {
    if ( p.kind === "newDiscipline" && !disciplinesOf(actor).some(d => L.norm(d.name) === L.norm(p.label)) ) await actor.createEmbeddedDocuments("Item", [disciplineItem(p.label, 1)]);
    else if ( p.kind === "newAbility" && now === 0 ) await applyPurchase(actor, {...p, current: 0});
    else if ( p.kind === "newDiscipline" ) { const d = disciplinesOf(actor).find(x => L.norm(x.name) === L.norm(p.label)); await actor.items.get(d.id)?.update({"system.value": p.next, "system.level": p.next}); }
    else await applyPurchase(actor, {...p, kind: p.kind, current: p.next - 1});
  }
  const payer = game.actors.get(rec.payerId) ?? payerOf(actor);
  const xp = payer?.items?.get(rec.xpItemId);
  if ( xp ) await xp.update({name: `${payer === actor ? "" : `${actor.name}: `}${L.logName(p, rec.source, true)}`});
  if ( rec.effectId ) await actor.deleteEmbeddedDocuments("ActiveEffect", [rec.effectId]).catch(() => null);
  await actor.update({[`flags.${MODULE_ID}.learning.${id}`]: {...rec, done: true, ended: game.time.worldTime}});
  float(actor, `${p.label} ${p.next}`, "#9fd3a8");
  try { await game.modules.get(MODULE_ID)?.api?.xp?.writeLogPage?.(payer); } catch (e) { /* log */ }
  await ChatMessage.create({speaker: {alias: "Learning"}, whisper: ownersOf(actor),
    content: `<div class="wodx-card wodx-learn"><h3>${esc(actor.name)} has learned ${esc(p.label)} ${p.next}</h3>
      <p>The study with ${esc(rec.source.kind === "practice" ? "practice alone" : rec.source.name)} is done after ${task.rolls} ${task.interval === "day" ? "nights" : `${task.interval}s`}. The sheet now shows ${esc(p.label)} ${p.next}.</p></div>`});
  return {ok: true};
}

/** Active GM: a study whose long task was removed before it ended gives the experience back. */
export async function reconcile(actor) {
  if ( !isActiveGM() ) return [];
  const tasks = actor?.flags?.[ST]?.tasks ?? {};
  const out = [];
  for ( const r of L.openLearning(recordsOf(actor)) ) {
    if ( r.taskId && tasks[r.taskId] ) continue;
    const payer = game.actors.get(r.payerId) ?? payerOf(actor);
    const xp = payer?.items?.get(r.xpItemId);
    if ( xp ) await payer.deleteEmbeddedDocuments("Item", [xp.id]);
    if ( r.effectId && actor.effects?.get(r.effectId) ) await actor.deleteEmbeddedDocuments("ActiveEffect", [r.effectId]);
    await actor.update({[`flags.${MODULE_ID}.learning.-=${r.id}`]: null});
    out.push(r.id);
    await ChatMessage.create({speaker: {alias: "Learning"}, whisper: ownersOf(actor),
      content: `<div class="wodx-card wodx-learn"><p>${esc(actor.name)} stops learning ${esc(r.purchase.label)}. ${r.purchase.cost} experience is given back.</p></div>`});
  }
  return out;
}

export function registerLearning() {
  Hooks.on("wodxTaskDone", e => { onTaskDone(e).catch(err => console.error(`${MODULE_ID} | learning`, err)); });
  Hooks.on("updateActor", (actor, changes) => {
    if ( !isActiveGM() || !foundry.utils.hasProperty(changes, `flags.${ST}`) ) return;
    if ( !L.openLearning(recordsOf(actor)).length ) return;
    reconcile(actor).catch(err => console.error(`${MODULE_ID} | learning`, err));
  });
}
