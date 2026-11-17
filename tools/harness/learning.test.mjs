/* Learning from teachers, books and practice (B6230-B6239): the rules, and the spend path that reads them. */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import * as L from "../../modules/wodx-creation/scripts/learn-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-creation", ST = "wodx-storyteller";

/* ---- the pure rules ---- */

test("which sources may teach what, by the books", () => {
  assert.deepEqual(L.sourcesFor({kind: "attribute", label: "Strength"}).allowed, ["teacher", "practice"]);
  assert.ok(!L.sourcesFor({kind: "ability", label: "Occult"}).allowed.includes("practice"), "Occult needs a source");
  assert.ok(!L.sourcesFor({kind: "ability", label: "Garou Lore"}).allowed.includes("practice"), "a Lore needs a source");
  assert.ok(L.sourcesFor({kind: "ability", label: "Brawl"}).allowed.includes("practice"));
  assert.ok(!L.sourcesFor({kind: "newAbility", label: "Ride"}).allowed.includes("practice"), "a new Ability needs tutoring (V20 pdf 131)");
  assert.deepEqual(L.sourcesFor({kind: "discipline", label: "Dominate", discipline: "other"}, {line: "vampire"}).allowed, ["teacher"], "out of clan needs a mentor (V20 DA pdf 189)");
  assert.ok(L.sourcesFor({kind: "discipline", label: "Potence", discipline: "other"}, {line: "vampire"}).allowed.includes("practice"), "physical Disciplines alone");
  assert.ok(L.sourcesFor({kind: "discipline", label: "Obtenebration", discipline: "clan"}, {line: "vampire"}).allowed.includes("practice"), "clan Disciplines alone");
  assert.deepEqual(L.sourcesFor({kind: "discipline", label: "Thaumaturgy: Path of Blood", discipline: "clan"}).allowed, ["teacher", "book"]);
  assert.deepEqual(L.sourcesFor({kind: "newDiscipline", label: "Auspex"}).allowed, ["teacher"]);
  assert.equal(L.needsBlood({kind: "newDiscipline", label: "Auspex", clan: false}, {line: "vampire"}), true);
  assert.equal(L.needsBlood({kind: "newDiscipline", label: "Potence", clan: false}, {line: "vampire"}), false);
});

test("a better source is faster; a teacher must know the level wanted", () => {
  const p = {kind: "ability", key: "melee", label: "Melee", current: 1, next: 2};
  const fine = L.planFor(p, {kind: "teacher", name: "Master Jiri", rating: 4});
  const plain = L.planFor(p, {kind: "teacher", name: "A soldier", rating: 2});
  const book = L.planFor(p, {kind: "book", name: "a fencing manual", quality: "good"});
  const alone = L.planFor(p, {kind: "practice"});
  assert.deepEqual([fine.diff, plain.diff, book.diff, alone.diff], [5, 6, 6, 7]);
  assert.deepEqual([fine.interval, alone.interval], ["week", "month"]);
  assert.ok(fine.dice > plain.dice);
  assert.equal(L.planFor(p, {kind: "teacher", name: "A boy", rating: 1}).ok, false);
  assert.ok(L.estimateRolls(fine, 5) < L.estimateRolls(alone, 5));
  assert.equal(L.goalOf({kind: "ability", label: "Occult", next: 3}), 12, "the esoteric take twice as long");
  assert.equal(L.goalOf({kind: "ability", label: "Melee", next: 3}), 6);
});

test("books teach by their subject and only so far; any item can be made a book", () => {
  const herbal = L.bookOf({name: "a herbal with drawings"});
  assert.equal(L.bookTeaches(herbal, {label: "Medicine", key: "medicine", next: 2}), true);
  assert.equal(L.bookTeaches(herbal, {label: "Medicine", key: "medicine", next: 3}), false, "past the book's depth");
  assert.equal(L.bookTeaches(herbal, {label: "Occult", key: "occult", next: 1}), false);
  const tome = L.bookOf({name: "The Book of Nod", flags: {[M]: {teaches: {traits: ["Occult"], max: 5, quality: "fine"}}}});
  assert.equal(L.bookTeaches(tome, {label: "Occult", key: "occult", next: 4}), true);
  assert.equal(L.bookOf({name: "a rosary"}), null);
  assert.equal(L.bookTeaches(L.bookOf({name: "a guild's book of trade secrets"}), {label: "Crafts", key: "craft", next: 1}), true, "the Library's clearer name still matches");
});

test("schools and courses follow the year, 1197 to the World of Future Darkness", () => {
  const acad = {kind: "ability", key: "academics", label: "Academics", next: 2};
  const keys = y => L.coursesFor(acad, y).map(c => c.key);
  assert.deepEqual(keys(1197), ["monastery"]);
  assert.ok(keys(1350).includes("university"));
  assert.ok(keys(1460).includes("printed") && !keys(1440).includes("printed"));
  assert.ok(keys(1999).includes("net") && !keys(1990).includes("net"));
  assert.ok(keys(2040).includes("upload"));
  assert.ok(!L.coursesFor({kind: "ability", key: "occult", label: "Occult", next: 1}, 2040).some(c => c.key === "upload"), "no uploaded Occult");
  assert.equal(L.coursesFor(acad, 2040).find(c => c.key === "upload").resources, 3, "at a price");
});

/* ---- the spend path, with a stand-in for WoDX Storyteller's long tasks ---- */

function setPath(obj, path, value) { const parts = path.split("."); let o = obj; for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {}); o[parts.at(-1)] = value; }
class Coll extends Map {
  find(f) { for ( const v of this.values() ) if ( f(v) ) return v; }
  filter(f) { return [...this.values()].filter(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
}
let ids = 0;
const newId = () => `doc${String(++ids).padStart(13, "0")}`;
class Doc {
  constructor(data, parent) { Object.assign(this, structuredClone(data)); this.id = data._id ?? newId(); this.parent = parent; this.flags ??= {}; this._stats = {createdTime: ++ids}; }
  getFlag(s, k) { return this.flags?.[s]?.[k]; }
  async update(changes) { for ( const [k, v] of Object.entries(changes) ) setPath(this, k, v); return this; }
}
class Actor {
  constructor(data) {
    const {items = [], ...rest} = structuredClone(data);
    Object.assign(this, rest);
    this.id = newId(); this.flags ??= {}; this.visible = true;
    this.items = new Coll(); this.effects = new Coll();
    for ( const i of items ) { const it = new Doc(i, this); this.items.set(it.id, it); }
  }
  getFlag(s, k) { return this.flags?.[s]?.[k]; }
  async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); return this; }
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; }
  async update(changes) {
    for ( const [k, v] of Object.entries(changes) ) {
      const del = k.match(/^(.*)\.-=(.+)$/);
      if ( del ) { let o = this; for ( const p of del[1].split(".") ) o = o?.[p]; if ( o ) delete o[del[2]]; }
      else setPath(this, k, structuredClone(v));
    }
    return this;
  }
  async createEmbeddedDocuments(type, list) {
    const coll = type === "ActiveEffect" ? this.effects : this.items;
    return list.map(d => { const it = new Doc(d, this); coll.set(it.id, it); return it; });
  }
  async deleteEmbeddedDocuments(type, idList) { const coll = type === "ActiveEffect" ? this.effects : this.items; for ( const id of idList ) coll.delete(id); return idList; }
  testUserPermission(user) { return user.isGM || (this.ownership?.[user.id] ?? 0) >= 3; }
  get isOwner() { return this.testUserPermission(game.user); }
  get hasPlayerOwner() { return Object.entries(this.ownership ?? {}).some(([id, l]) => l >= 3 && !game.users.get(id)?.isGM); }
}
globalThis.Actor = Actor;

const trait = (value, label) => ({value, max: 5, label: `wod.attributes.${label}`, isvisible: true});
function mortal(name, {owner = null, occult = 0, melee = 1} = {}) {
  return {name, type: "Mortal", ownership: owner ? {default: 0, [owner]: 3} : {default: 0},
    system: {settings: {iscreated: true, variant: "general"},
      attributes: {strength: trait(2, "strength"), dexterity: trait(3, "dexterity"), intelligence: trait(3, "intelligence")},
      abilities: {melee: {value: melee, max: 5, label: "wod.abilities.melee", isvisible: true}, occult: {value: occult, max: 5, label: "wod.abilities.occult", isvisible: true}},
      advantages: {willpower: {permanent: 4, temporary: 4}, path: {permanent: 7, value: 7, label: "wod.advantages.path.humanity"},
        virtues: {courage: {permanent: 2, temporary: 2, label: "wod.advantages.virtue.courage"}}}},
    items: [{name: "Experience award", type: "Experience", system: {amount: 30, isspent: false}}]};
}

game.actors = new Coll();
const anna = new Actor(mortal("Anna the Miller's Daughter", {owner: "p1"}));
const friar = new Actor(mortal("Friar Ondrej", {occult: 4}));
for ( const a of [anna, friar] ) game.actors.set(a.id, a);
globalThis.canvas = {tokens: {controlled: []}, scene: {tokens: []}};

// The long tasks, as WoDX Storyteller keeps them on the actor
const saved = [];
game.modules.set(ST, {active: true, api: {tasks: {
  async save(a, data) { const id = `task${saved.length + 1}`; const t = {...data, id, status: "open", total: 0}; await a.update({[`flags.${ST}.tasks.${id}`]: t}); saved.push({a, t}); return t; },
  pool: (a, t) => 3
}}});

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const {DialogV2} = foundry.applications.api;
const api = () => game.modules.get(M).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const xpOf = a => api().data.xpTotals(a);
const pick = text => form => { const li = [...form.querySelectorAll("li")].find(l => l.textContent.includes(text)); if ( !li ) throw new Error(`No source ${text}: ${form.textContent}`); li.querySelector("input").checked = true; for ( const o of form.querySelectorAll("input[name=src]") ) if ( o !== li.querySelector("input") ) o.checked = false; return "ok"; };

test("start", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().learn);
  assert.equal(api().learn.needsSource(anna), true);
});

test("the player names a teacher; the points go at once, the trait at the end of the study", async () => {
  mock.asPlayer();
  const occ = api().data.purchaseOptions(anna).find(o => o.key === "occult");
  // Practice is offered but closed for Occult; the friar knows it to 4
  DialogV2.queue(form => {
    const alone = [...form.querySelectorAll("li")].find(l => /Practice/.test(l.textContent));
    assert.ok(alone.querySelector("input").disabled, "no practice for Occult");
    return pick("Friar Ondrej")(form);
  });
  const r = await api().xp.requestSpend(anna, occ);
  assert.equal(r.sent, true);
  mock.asGM();
  await mock.deliver("gm");
  const entry = game.settings.get("wodx-chronicle", "approvals").pending.find(p => p.type === "xp-spend" && p.data.actorId === anna.id);
  assert.match(entry.detail, /Learned from Friar Ondrej/);
  await chron().approvals.decide(entry.id, "approve");
  assert.equal(anna.system.abilities.occult.value, 0, "not yet: the study has only begun");
  assert.equal(xpOf(anna).available, 27, "a new Ability's 3 points are spent now");
  const rec = Object.values(anna.flags[M].learning)[0];
  assert.equal(rec.source.name, "Friar Ondrej");
  assert.ok(anna.effects.some(e => e.statuses?.includes("wodx-studying")), "the token carries the study mark");
  const task = anna.flags[ST].tasks[rec.taskId];
  assert.equal(task.goal, 4, "Occult 1: four successes");
  assert.equal(task.diff, 5, "a fine teacher (4 dots for a first dot)");
  // A second spend on the same trait is closed while the study runs
  assert.match(api().data.purchaseOptions(anna).find(o => o.key === "occult").reason, /Being learned now/);
  // The study ends
  await api().learn.onTaskDone({actor: anna, task: {...task, status: "done", rolls: 2}});
  assert.equal(anna.system.abilities.occult.value, 1);
  assert.ok(!anna.effects.some(e => e.statuses?.includes("wodx-studying")), "the mark comes off");
  assert.ok(mock.log.chat.some(c => /has learned .*occult 1</i.test(c.content)));
  assert.ok([...anna.items].some(i => i.type === "Experience" && /occult 0 → 1, learned from Friar Ondrej/i.test(i.name)));
});

test("a study stopped before it ends gives the experience back", async () => {
  mock.asGM();
  const melee = api().data.purchaseOptions(anna).find(o => o.key === "melee");
  DialogV2.queue(pick("Practice"));
  const before = xpOf(anna).available;
  const r = await api().xp.requestSpend(anna, melee);
  assert.equal(r.ok, true);
  assert.equal(xpOf(anna).available, before - melee.cost);
  const rec = api().learn.records(anna)[r.learning];
  assert.equal(anna.flags[ST].tasks[rec.taskId].interval, "month", "practice alone is slow");
  await anna.update({[`flags.${ST}.tasks.-=${rec.taskId}`]: null});
  await api().learn.reconcile(anna);
  assert.equal(xpOf(anna).available, before);
  assert.equal(anna.system.abilities.melee.value, 1);
  assert.ok(!api().learn.records(anna)[r.learning]);
});

test("the Storyteller can waive it: then the trait rises at once", async () => {
  mock.asGM();
  await api().learn.setWaived(anna, true);
  assert.equal(api().learn.needsSource(anna), false);
  const str = api().data.purchaseOptions(anna).find(o => o.key === "strength");
  await api().xp.requestSpend(anna, str);
  assert.equal(anna.system.attributes.strength.value, 3);
  await api().learn.setWaived(anna, false);
  // ...and with a one-off tick in the dialog
  const dex = api().data.purchaseOptions(anna).find(o => o.key === "dexterity");
  DialogV2.queue(form => { form.elements.waive.checked = true; return "ok"; });
  await api().xp.requestSpend(anna, dex);
  assert.equal(anna.system.attributes.dexterity.value, 4);
});

test("a teacher the Storyteller finds: the GM side picks one who knows it, or says there is none", async () => {
  mock.asGM();
  const occ = api().data.purchaseOptions(anna).find(o => o.key === "occult");
  const found = api().learn.resolve(anna, occ, {kind: "storyteller"});
  assert.equal(found.ok, true);
  assert.equal(found.src.name, "Friar Ondrej");
  const none = api().learn.resolve(anna, {...occ, current: 4, next: 5}, {kind: "storyteller"});
  assert.equal(none.ok, false);
  assert.match(none.why, /No one in the chronicle knows .*occult to 5/i);
  const spend = await api().xp.spend(anna, occ);
  assert.equal(spend.ok, false, "no source named: nothing is spent");
});
