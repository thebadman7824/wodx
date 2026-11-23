/**
 * Maturation (B7685-B7689), the Foundry part; maturation-rules.mjs holds the rules.
 *
 *   Pass the Years: a Dark Ages Cainite's years become maturation points by how they were spent (the Storyteller's
 *   pick on the row), with the Willpower roll for each century, the Backgrounds' upkeep and, in danger, Tempting Fate.
 *   The points wait on the sheet (flag wodx-creation.maturation).
 *   The Maturation window (holder or Storyteller): spend them on traits already held, one dot a trait a period, and
 *   try to raise Backgrounds with the book's roll.
 */
import * as M from "./maturation-rules.mjs";
import {MODULE_ID, esc, clanOf, vampireEra, disciplinesOf} from "./actor-data.mjs";
import {clanDisciplines} from "./rules.mjs";
import {awakeBefore, viewOf} from "./advance.mjs";
import {successes} from "../../wodx-chronicle/scripts/terms.mjs";

const {ApplicationV2} = foundry.applications.api;
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const PATH = "wod.types.disciplinepath";
const BG = "wod.types.background";

/** Dice the way the gates can force them: faces from CONFIG.Dice.randomUniform (Math.random outside Foundry). */
const uniform = () => (globalThis.CONFIG?.Dice?.randomUniform ?? Math.random)();
export function dice(count, diff) {
  const faces = Array.from({length: Math.max(0, Math.floor(n(count)))}, () => Math.max(1, Math.ceil(uniform() * 10)));
  const r = successes(faces, diff);
  return {successes: r.successes, botch: r.botch, faces};
}
const d10 = () => Math.max(1, Math.ceil(uniform() * 10));

export const stateOf = actor => foundry.utils.deepClone(actor?.getFlag?.(MODULE_ID, "maturation") ?? {});
const save = (actor, s) => actor.setFlag(MODULE_ID, "maturation", s);
const ageOf = actor => { try { return n(awakeBefore(actor)); } catch { return 0; } };
const bgItems = actor => [...(actor?.items ?? [])].filter(i => i.type === "Feature" && i.system?.type === BG);

/**
 * A downtime's maturation (from Pass the Years or by hand): o = {years, activity, label}. Returns the record it
 * adds, after the upkeep and Tempting Fate are applied to the sheet.
 */
export async function mature(actor, o = {}) {
  if ( !game.user.isGM ) return null;
  const years = Math.max(0, Math.floor(n(o.years)));
  const activity = M.ACTIVITY[o.activity] ? o.activity : "active";
  const A = M.ACTIVITY[activity];
  const s = actor.system ?? {};
  const willpower = n(s.advantages?.willpower?.permanent);
  const traits = {willpower, perception: n(s.attributes?.perception?.value), age: n(o.age ?? ageOf(actor))};
  const e = M.earned(years, activity, traits);
  const periods = M.periodsOf(years);
  const lines = [];
  let bonus = 0, lost = 0;
  for ( let k = 0; k < periods; k++ ) {
    const r = M.risksAndRewards(activity, willpower, dice, d10);
    bonus += r.bonus; lost += r.lost;
    if ( r.why ) lines.push(`Century ${k + 1}: ${r.why}`);
  }
  // A botch in ordinary, research or practice years still leaves a point for each period (p. 72)
  const floor = ["active", "research", "practice"].includes(activity) ? periods : 0;
  let points = Math.max(floor, e.points + bonus - lost);
  const st = stateOf(actor);
  const pool = {...(st.pool ?? {})};

  // Upkeep: the highest Backgrounds first; one that cannot be paid loses a dot
  const bgs = bgItems(actor).filter(i => n(i.system?.value) > 0).sort((a, b) => n(b.system.value) - n(a.system.value))
    .map(i => ({id: i.id, name: i.name, value: n(i.system.value), pooledAnchor: !!i.flags?.[MODULE_ID]?.pooledAnchor}));
  const paid = M.payUpkeep(points, bgs, activity, years);
  points = paid.left;
  for ( const name of paid.lost ) {
    const it = actor.items.find(i => i.name === name && i.system?.type === BG);
    if ( it ) { await it.update({"system.value": Math.max(0, n(it.system.value) - 1)}); lines.push(`${name}: upkeep unpaid, a dot lost (p. 73).`); }
  }
  if ( paid.kept.length ) lines.push(`Upkeep paid for ${paid.kept.join(", ")}.`);

  // Tempting Fate in danger (p. 73)
  const tempted = {};
  if ( A.tempting ) for ( const b of bgItems(actor) ) {
    if ( M.NO_UPKEEP.test(b.name) || n(b.system?.value) <= 0 ) continue;
    const t = M.temptingFate(willpower, dice);
    tempted[b.name] = {mayRaise: t.mayRaise, raiseDiff: t.raiseDiff};
    if ( t.lose ) await b.update({"system.value": Math.max(0, n(b.system.value) - 1)});
    lines.push(`${b.name}: ${t.why}`);
  }

  // B7692: past 500 years the Sleep of Ages calls (DASC pp. 75-76); torpor years do not count
  let sleep = null;
  if ( activity !== "torpor" ) {
    sleep = M.sleepOfAges(traits.age, n(s.advantages?.path?.permanent), dice);
    if ( sleep ) lines.push(sleep.why);
  }
  // B7693: the Thirst of Caine, the book's systematic option (switch), rolled once a downtime of a century or more
  let thirst = st.thirst ?? "none";
  if ( o.thirst && years >= 100 ) {
    let v = {};
    try { v = viewOf(actor); } catch { /* a bare sheet */ }
    const trig = M.thirstTriggers({road: n(s.advantages?.path?.permanent), roadKey: v.road?.key, age: traits.age, nature: s.nature,
      extra: actor.getFlag?.(MODULE_ID, "thirstTriggers") ?? []});
    const t = M.thirstRoll(thirst, willpower, trig.length, dice);
    thirst = t.stage;
    if ( t.why ) lines.push(`${t.why} Triggers: ${trig.join("; ")}.`);
  }

  // The points: the plain ones, and those kept for one kind of trait
  const torpor = activity === "torpor";
  const key = torpor ? "torpor" : "any";
  pool[key] = n(pool[key]) + points;
  if ( e.extra ) pool[e.only] = n(pool[e.only]) + e.extra;
  const rec = {at: game.time.worldTime, years, activity, banked: points, earned: e.points, bonus, lost, extra: e.extra, only: e.only, upkept: paid.kept.length, label: o.label ?? ""};
  // One Background roll each 50 years carries no penalty (DASC p. 74, the example on p. 75)
  const next = {pool, tempted, mayRaise: A.raise, periodMax: M.maxDotsFor(years), raised: {}, attempts: 0, freeAttempts: Math.max(1, Math.ceil(years / 50)),
    sleep, thirst, log: [...(st.log ?? []), rec].slice(-20)};
  await save(actor, next);
  const total = Object.values(pool).reduce((x, y) => x + n(y), 0);
  await ChatMessage.create({whisper: game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id), speaker: {alias: "Maturation"},
    content: `<div class="wodx-card"><h3>${esc(actor.name)}: ${years} years, ${esc(A.label.split(":")[0].toLowerCase())}</h3>
      <p>${e.points} maturation points for the years${e.extra ? `, ${e.extra} more for ${esc(e.only)}` : ""}${bonus ? `, ${bonus} from Willpower` : ""}${lost ? `, ${lost} lost` : ""}. ${total} waiting to spend.</p>
      <ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul><p class="wodx-quiet">${esc(M.SOURCE)}</p></div>`});
  return rec;
}

/* ---------------- Spending ---------------- */
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const VIRTUES = ["conscience", "conviction", "selfcontrol", "instinct", "courage"];
const cap1 = s => String(s).replace(/^./, c => c.toUpperCase());

/** Every trait the points may buy, with its price and the pool that would pay: [{kind, key, name, value, cost, dots, pays}]. */
export function offers(actor) {
  const s = actor.system ?? {}, st = stateOf(actor), pool = st.pool ?? {};
  const age = ageOf(actor), willpower = n(s.advantages?.willpower?.permanent), road = n(s.advantages?.path?.permanent);
  const clan = (() => { try { return clanDisciplines(clanOf(actor), vampireEra()).map(norm); } catch { return []; } })();
  const out = [];
  const push = (t, o = {}) => {
    const c = M.costOf(t.kind, {age, willpower, road, ...o});
    if ( !c ) return;
    // Pay first from the pools kept for this kind of trait, then from torpor's (mental only), then the plain points
    const order = ["knowledges", "physical", "mental"].filter(k => n(pool[k]) > 0 && M.mayBuy(k, t));
    if ( n(pool.torpor) > 0 && M.mayBuy("mental", t) ) order.push("torpor");
    if ( n(pool.any) > 0 ) order.push("any");
    const pays = order.find(k => n(pool[k]) >= (k === "torpor" ? M.costOf(t.kind, {age, willpower, road, ...o, torpor: true}).cost : c.cost)) ?? null;
    const cost = pays === "torpor" ? M.costOf(t.kind, {age, willpower, road, ...o, torpor: true}).cost : c.cost;
    const used = n(st.raised?.[`${t.kind}:${t.key}`]);
    out.push({...t, cost, dots: c.dots, pays, capped: used >= n(st.periodMax || 1)});
  };
  for ( const k of ATTRS ) push({kind: "attribute", key: k, name: cap1(k), value: n(s.attributes?.[k]?.value)});
  for ( const [k, a] of Object.entries(s.abilities ?? {}) ) if ( n(a?.value) > 0 ) push({kind: "ability", key: k, group: a.type, name: game.i18n?.localize?.(a.label) ?? k, value: n(a.value)});
  for ( const d of disciplinesOf(actor) ) if ( d.value > 0 ) push({kind: "discipline", key: d.id, name: d.name, value: d.value}, {outOfClan: !clan.includes(norm(d.name)), path: /thaumaturg|necromanc|mortis/i.test(d.name)});
  for ( const k of VIRTUES ) if ( n(s.advantages?.virtues?.[k]?.permanent) > 0 ) push({kind: "virtue", key: k, name: cap1(k === "selfcontrol" ? "self-control" : k), value: n(s.advantages.virtues[k].permanent)});
  if ( road > 0 ) push({kind: "road", key: "road", name: "Road", value: road});
  push({kind: "willpower", key: "willpower", name: "Willpower", value: willpower});
  for ( const b of bgItems(actor) ) if ( n(b.system?.value) > 0 && !M.NO_UPKEEP.test(b.name) ) push({kind: "background", key: b.id, name: b.name, value: n(b.system.value)});
  return out;
}

/** Spend points on one trait. t = {kind, key, path (a path item id for a sorcery Discipline)}. Returns a note or null. */
export async function buy(actor, t = {}) {
  if ( !(game.user.isGM || actor.isOwner) ) return null;
  const o = offers(actor).find(x => x.kind === t.kind && x.key === t.key);
  if ( !o ) return null;
  if ( o.capped ) { ui.notifications.warn(`${o.name}: one dot a period at most (p. 73).`); return null; }
  if ( !o.pays ) { ui.notifications.warn(`${o.name}: not enough points (${o.cost}).`); return null; }
  const st = stateOf(actor);
  let note = "";
  if ( o.kind === "background" ) {
    if ( !st.mayRaise ) { ui.notifications.warn("Backgrounds cannot be raised after years in seclusion, research or torpor (p. 73)."); return null; }
    const tf = st.tempted?.[o.name];
    if ( tf && !tf.mayRaise ) { ui.notifications.warn(`${o.name}: Tempting Fate bars raising it this time (p. 73).`); return null; }
    st.attempts = n(st.attempts) + 1;
    const it = actor.items.get(o.key);
    const r = M.raiseBackground(o.name, {value: o.value, attempt: Math.max(1, st.attempts - n(st.freeAttempts || 1) + 1), tempted: !!tf?.raiseDiff, pooledBig: !!it?.flags?.[MODULE_ID]?.pooledAnchor && o.value >= 6}, dice);
    if ( !r.ok ) { ui.notifications.warn(r.why); return null; }
    if ( it ) await it.update({"system.value": Math.max(0, Math.min(10, o.value + r.gain - r.lose))});
    note = `${o.name}: ${r.why}`;
  } else {
    switch ( o.kind ) {
      case "attribute": await actor.update({[`system.attributes.${o.key}.value`]: Math.min(10, o.value + 1)}); break;
      case "ability": await actor.update({[`system.abilities.${o.key}.value`]: Math.min(10, o.value + 1)}); break;
      case "virtue": await actor.update({[`system.advantages.virtues.${o.key}.permanent`]: Math.min(5, o.value + 1)}); break;
      case "road": await actor.update({"system.advantages.path.permanent": Math.min(10, o.value + 1)}); break;
      case "willpower": await actor.update({"system.advantages.willpower.permanent": Math.min(10, o.value + 1)}); break;
      case "discipline": {
        await actor.items.get(o.key)?.update({"system.value": o.value + 1});
        // A sorcerer's second dot goes to a path, never above the Discipline (DAV p. 166)
        if ( o.dots > 1 ) {
          const p = actor.items.get(t.path) ?? [...actor.items].filter(i => i.type === "Power" && i.system?.type === PATH && n(i.system.value) < o.value + 1).sort((a, b) => n(b.system.value) - n(a.system.value))[0];
          if ( p && n(p.system.value) < o.value + 1 ) { await p.update({"system.value": n(p.system.value) + 1}); note = ` and ${p.name} +1`; }
        }
        break;
      }
    }
    note = `${o.name} ${o.value} → ${Math.min(10, o.value + 1)}${note}`;
  }
  st.pool = {...(st.pool ?? {})};
  st.pool[o.pays] = n(st.pool[o.pays]) - o.cost;
  st.raised = {...(st.raised ?? {}), [`${o.kind}:${o.key}`]: n(st.raised?.[`${o.kind}:${o.key}`]) + 1};
  st.log = [...(st.log ?? []), {at: game.time.worldTime, spent: o.cost, on: o.name, note}].slice(-20);
  await save(actor, st);
  return note;
}

export class MaturationApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-maturation", classes: ["wodx", "wodx-maturation"],
    window: {title: "Maturation", icon: "fa-solid fa-hourglass", resizable: true},
    position: {width: 560, height: 640},
    actions: {buy: MaturationApp.#onBuy, mature: MaturationApp.#onMature}
  };
  constructor(actor, o = {}) { super(o); this.actor = actor; }
  static open(actor) {
    if ( !actor ) return ui.notifications.warn("Choose a character.");
    if ( !(game.user.isGM || actor.isOwner) ) return ui.notifications.warn("Only the owner or the Storyteller spends maturation points.");
    return new MaturationApp(actor).render({force: true});
  }
  get title() { return `Maturation: ${this.actor?.name ?? ""}`; }
  async _renderHTML() {
    const a = this.actor, st = stateOf(a), pool = st.pool ?? {};
    const rows = offers(a);
    const label = {any: "points", knowledges: "for Knowledges", physical: "for Skills and physical Talents", mental: "for mental traits", torpor: "from torpor (mental, at three quarters)"};
    const pools = Object.entries(pool).filter(([, v]) => n(v) > 0).map(([k, v]) => `${n(v)} ${label[k] ?? k}`).join(", ") || "none";
    const paths = [...a.items].filter(i => i.type === "Power" && i.system?.type === PATH);
    const tr = r => `<tr><td>${esc(r.name)}</td><td>${r.value}</td><td>${r.cost}${r.dots > 1 ? " (2 dots)" : ""}</td>
      <td>${r.kind === "discipline" && r.dots > 1 && paths.length ? `<select name="path-${esc(r.key)}" data-fixed>${paths.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>` : ""}
      <button type="button" data-action="buy" data-kind="${r.kind}" data-key="${esc(r.key)}" ${r.pays && !r.capped ? "" : "disabled"}>${r.kind === "background" ? "Try to raise" : "Buy"}</button></td></tr>`;
    const groups = [["attribute", "Attributes"], ["ability", "Abilities"], ["discipline", "Disciplines"], ["virtue", "Virtues, Road and Willpower"], ["background", "Backgrounds (a roll)"]];
    const by = k => rows.filter(r => k === "virtue" ? ["virtue", "road", "willpower"].includes(r.kind) : r.kind === k);
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<p><b>Waiting:</b> ${esc(pools)}. ${st.mayRaise === false ? "Backgrounds cannot be raised this time." : ""} One dot a trait for each ${st.periodMax > 1 ? `of ${st.periodMax} periods` : "period"}.</p>
      ${st.sleep?.torpor ? `<p class="wodx-warn">The Sleep of Ages has them: voluntary torpor.</p>` : ""}${st.thirst && st.thirst !== "none" ? `<p class="wodx-warn">The Thirst of Caine: ${st.thirst === "addicted" ? "only Cainite vitae feeds them" : "they crave Cainite vitae"}.</p>` : ""}
      ${game.user.isGM ? `<div class="form-group"><label>Years by hand</label><input type="number" name="years" value="10" min="1" max="2000"/>
        <select name="activity" data-fixed>${M.ACTIVITY_KEYS.map(k => `<option value="${k}">${esc(M.ACTIVITY[k].label)}</option>`).join("")}</select>
        <button type="button" data-action="mature">Mature</button></div>` : ""}
      <div class="wodx-scroll">${groups.map(([k, l]) => by(k).length ? `<h4>${l}</h4><table class="wodx-table"><tr><th>Trait</th><th>Now</th><th>Cost</th><th></th></tr>${by(k).map(tr).join("")}</table>` : "").join("")}</div>
      <p class="wodx-quiet">${esc(M.SOURCE)}</p>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }
  static async #onBuy(event, target) {
    const path = this.element.querySelector(`[name="path-${target.dataset.key}"]`)?.value ?? null;
    const note = await buy(this.actor, {kind: target.dataset.kind, key: target.dataset.key, path});
    if ( note ) ui.notifications.info(note);
    this.render();
  }
  static async #onMature() {
    const years = n(this.element.querySelector('[name="years"]')?.value), activity = this.element.querySelector('[name="activity"]')?.value;
    await mature(this.actor, {years, activity, label: "by hand"});
    this.render();
  }
}
