/* Every line spends experience by its own book and learns by the learning rule (B6270-B6279). */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import * as LX from "../../modules/wodx-creation/scripts/lines-xp-rules.mjs";
import * as L from "../../modules/wodx-creation/scripts/learn-rules.mjs";
import {splatOf, familyOf} from "../../modules/wodx-creation/scripts/lines.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-creation", ST = "wodx-storyteller";

/* ---- the pure rules ---- */

test("one key for every line", () => {
  const k = (type, variant = "", flags = {}) => splatOf({type, system: {settings: {variant}}, flags});
  assert.equal(k("Vampire"), "vampire");
  assert.equal(k("Vampire", "kindredeast"), "kuei-jin");
  assert.equal(k("Mortal", "ghoul"), "ghoul");
  assert.equal(k("Mortal", "kinfolk"), "kinfolk");
  assert.equal(k("Mortal", "sorcerer"), "sorcerer");
  assert.equal(k("Mortal", "general", {[M]: {revenant: true}}), "revenant");
  assert.equal(k("Creature", "", {[M]: {animalGhoul: true}}), "ghoul");
  assert.equal(k("Changing Breed"), "fera");
  for ( const [t, key] of [["Werewolf", "werewolf"], ["Mage", "mage"], ["Changeling", "changeling"], ["Wraith", "wraith"], ["Hunter", "hunter"], ["Mummy", "mummy"], ["Demon", "demon"]] ) assert.equal(k(t), key);
  assert.equal(familyOf("fera"), "werewolf");
  assert.equal(familyOf("kuei-jin"), "vampire");
  assert.equal(splatOf(null), null);
});

test("each line's chart, from its own book", () => {
  const c = o => LX.lineCost(o);
  // W20 pdf 246
  assert.equal(c({line: "werewolf", kind: "stat", key: "rage", current: 4}), 4);
  assert.equal(c({line: "werewolf", kind: "stat", key: "gnosis", current: 3}), 6);
  assert.equal(c({line: "werewolf", kind: "attribute", current: 2}), 8);
  assert.equal(c({line: "werewolf", kind: "newPower", cat: "gift", level: 2, own: true}), 6);
  assert.equal(c({line: "werewolf", kind: "newPower", cat: "gift", level: 2, own: false}), 10);
  assert.equal(c({line: "werewolf", kind: "virtue", current: 2}), null, "no Conscience for the Garou");
  // W20 Kinfolk pdf 66
  assert.equal(c({line: "kinfolk", kind: "newPower", cat: "gift", level: 1, own: true}), 15);
  assert.equal(c({line: "kinfolk", kind: "newPower", cat: "gift", level: 1, own: false}), 20);
  // M20 pdf 337
  assert.equal(c({line: "mage", kind: "power", cat: "sphere", current: 2, own: true}), 14);
  assert.equal(c({line: "mage", kind: "power", cat: "sphere", current: 2, own: false}), 16);
  assert.equal(c({line: "mage", kind: "power", cat: "sphere", current: 0}), 10);
  assert.equal(c({line: "mage", kind: "stat", key: "arete", current: 3}), 24);
  assert.equal(LX.lineMax({line: "mage", kind: "power", cat: "sphere", arete: 2}), 2, "no Sphere above Arete");
  // Sorcerer Revised pdf 46, by the new rating
  assert.equal(c({line: "sorcerer", kind: "power", cat: "numina", current: 2}), 21);
  assert.equal(c({line: "sorcerer", kind: "attribute", current: 2}), 12);
  // C20 pdf 177
  assert.equal(c({line: "changeling", kind: "power", cat: "art", current: 2}), 8);
  assert.equal(c({line: "changeling", kind: "newPower", cat: "art"}), 7);
  assert.equal(c({line: "changeling", kind: "newPower", cat: "realm"}), 5);
  assert.equal(c({line: "changeling", kind: "willpower", current: 4}), 8);
  assert.equal(c({line: "changeling", kind: "stat", key: "glamour", current: 4}), 12);
  // Wraith 20th pdf 367
  assert.equal(c({line: "wraith", kind: "newPower", cat: "arcanos"}), 7);
  assert.equal(c({line: "wraith", kind: "power", cat: "arcanos", current: 3}), 9);
  // Mummy: The Resurrection pdf 140
  assert.equal(c({line: "mummy", kind: "power", cat: "hekau", current: 2, own: true}), 8);
  assert.equal(c({line: "mummy", kind: "power", cat: "hekau", current: 2, own: false}), 12);
  assert.equal(c({line: "mummy", kind: "stat", key: "balance", current: 3}), 21);
  // Demon: The Fallen pdf 165
  assert.equal(c({line: "demon", kind: "newPower", cat: "lore", own: true}), 7);
  assert.equal(c({line: "demon", kind: "newPower", cat: "lore", own: false}), 10);
  assert.equal(c({line: "demon", kind: "stat", key: "faith", current: 3}), 21);
  // Kindred of the East pdf 130
  assert.equal(c({line: "kuei-jin", kind: "discipline", current: 2}), 16);
  assert.equal(c({line: "kuei-jin", kind: "stat", key: "hun", current: 3}), 9);
  assert.equal(c({line: "kuei-jin", kind: "stat", key: "po", current: 3}), 3);
  // Hunter: The Reckoning pdf 141: Edges come from Virtue points, not experience
  assert.equal(c({line: "hunter", kind: "virtue", current: 3}), null);
  assert.equal(c({line: "hunter", kind: "willpower", current: 5}), 5);
});

test("each line's sources: spirits teach Gifts, Spheres need a mentor, a mentor of another sect is slower", () => {
  assert.deepEqual(L.sourcesFor({kind: "newPower", cat: "gift", label: "Persuasion"}).allowed, ["spirit", "teacher"]);
  assert.ok(!L.sourcesFor({kind: "power", cat: "sphere", current: 1, label: "Forces"}).allowed.includes("practice"));
  assert.deepEqual(L.sourcesFor({kind: "newPower", cat: "arcanos", label: "Argos"}).allowed, ["teacher"]);
  assert.ok(L.sourcesFor({kind: "power", cat: "arcanos", current: 2, label: "Argos"}).allowed.includes("practice"));
  const gift = {kind: "newPower", cat: "gift", label: "Persuasion", level: 1, current: 0, next: 1};
  const spirit = L.planFor(gift, {kind: "spirit"});
  const garou = L.planFor(gift, {kind: "teacher", name: "An elder", rating: 1});
  assert.equal(spirit.interval, "day", "a spirit teaches in a night");
  assert.ok(garou.goal >= 4 && garou.interval === "week", "a Garou takes a lunar month at least");
  const sph = {kind: "power", cat: "sphere", label: "Forces", current: 1, next: 2};
  const same = L.planFor(sph, {kind: "teacher", name: "A", rating: 3});
  const other = L.planFor(sph, {kind: "teacher", name: "B", rating: 3, otherSect: true});
  assert.equal(other.goal, same.goal * 3);
});

/* ---- the spend path ---- */

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


const stat = v => ({permanent: v, temporary: v, max: 10});
const base = (name, type, extra = {}, items = []) => ({name, type, ownership: {default: 0},
  system: {settings: {iscreated: true, variant: extra.variant ?? ""},
    attributes: {strength: {value: 2, max: 5, label: "wod.attributes.strength", isvisible: true}, intelligence: {value: 3, max: 5, label: "wod.attributes.intelligence", isvisible: true}},
    abilities: {occult: {value: 1, max: 5, label: "wod.abilities.occult", isvisible: true}},
    ...extra.system,
    advantages: {willpower: stat(5), virtues: {courage: {permanent: 2, temporary: 2, label: "wod.advantages.virtue.courage"}}, path: {permanent: 6, value: 6, label: "wod.advantages.path.humanity"}, ...extra.advantages}},
  items: [{name: "Experience award", type: "Experience", system: {amount: 60, isspent: false}}, ...items]});
const spheres = vals => Object.fromEntries(LX.SPHERES.map(s => [s, {value: vals[s] ?? 0, max: 5, label: `wod.spheres.${s}`}]));

game.actors = new Coll();
const mage = new Actor(base("Magistra Ludmila", "Mage", {system: {affiliation: "Order of Hermes", affinity: "Forces", spheres: spheres({forces: 1})}, advantages: {arete: stat(2)}}));
const master = new Actor(base("Master Vavrinec", "Mage", {system: {affiliation: "Order of Hermes", spheres: spheres({forces: 4})}, advantages: {arete: stat(5)}}));
const stranger = new Actor(base("A Verbena wise woman", "Mage", {system: {affiliation: "Verbena", spheres: spheres({forces: 4})}, advantages: {arete: stat(4)}}));
const wolf = new Actor(base("Swift-Over-Snow", "Werewolf", {advantages: {rage: stat(3), gnosis: stat(2)}}));
const wraith = new Actor(base("The Drowned Miller", "Wraith", {}, [{name: "Argos", type: "Power", system: {type: "wod.types.arcanoi", value: 1}}]));
const hunter = new Actor(base("Dana the Watcher", "Hunter", {advantages: {virtues: {mercy: {permanent: 3, spent: 0, max: 10, label: "wod.advantages.virtue.mercy"}}}}));
const kj = new Actor(base("Lady Jade Wind", "Vampire", {variant: "kindredeast", advantages: {yin: stat(3), yang: stat(2), hun: stat(4), po: stat(3)}}, [{name: "Jade Shintai", type: "Power", system: {type: "wod.types.discipline", value: 1}}]));
for ( const a of [mage, master, stranger, wolf, wraith, hunter, kj] ) game.actors.set(a.id, a);
globalThis.canvas = {tokens: {controlled: []}, scene: {tokens: []}};

const saved = [];
game.modules.set(ST, {active: true, api: {tasks: {
  async save(a, data) { const id = `task${saved.length + 1}`; const t = {...data, id, status: "open", total: 0}; await a.update({[`flags.${ST}.tasks.${id}`]: t}); saved.push({a, t}); return t; },
  pool: () => 3
}}});

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;
const xpOf = a => api().data.xpTotals(a);
const opt = (a, f) => api().data.purchaseOptions(a).find(f);

test("start", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().lines);
  assert.equal(api().lines.of(wolf), "werewolf");
});

test("a Mage's window: Arete and the Spheres, at M20's costs, and none above Arete", () => {
  const forces = opt(mage, o => o.kind === "power" && o.key === "sphere:forces");
  assert.equal(forces.cost, 7, "affinity Sphere: current x 7");
  assert.equal(forces.own, true);
  assert.equal(forces.ok, true);
  const prime = opt(mage, o => o.kind === "power" && o.key === "sphere:prime");
  assert.equal(prime.cost, 10, "a new Sphere is 10");
  assert.equal(opt(mage, o => o.kind === "stat" && o.key === "arete").cost, 16);
  assert.ok(!opt(mage, o => o.kind === "virtue"), "no Conscience on a Mage's chart");
  assert.ok(!opt(mage, o => o.kind === "road"));
  assert.equal(api().data.spendableFor({isGM: true, id: "gm"}).some(a => a.id === wolf.id), true, "every line can be picked to spend for");
});

test("a Sphere is learned from a mentor of the same Tradition; another sect's takes three times as long", async () => {
  mock.asGM();
  const forces = opt(mage, o => o.key === "sphere:forces");
  const {choices} = api().learn.choices(mage, forces);
  const own = choices.find(c => c.src.id === master.id), other = choices.find(c => c.src.id === stranger.id);
  assert.ok(own.ok && other.ok);
  assert.equal(other.plan.goal, own.plan.goal * 3);
  assert.ok(!choices.find(c => c.src.kind === "practice").ok, "no Sphere from practice alone");
  const r = await api().xp.spend(mage, {...forces, source: {kind: "teacher", id: master.id, name: master.name}});
  assert.equal(r.ok, true, r.reason);
  assert.equal(xpOf(mage).available, 53);
  assert.equal(mage.system.spheres.forces.value, 1, "not yet");
  const rec = api().learn.records(mage)[r.learning];
  await api().learn.onTaskDone({actor: mage, task: {...mage.flags[ST].tasks[rec.taskId], status: "done", rolls: 3}});
  assert.equal(mage.system.spheres.forces.value, 2);
});

test("a Gift is learned from a spirit in a night, at W20's cost, and lands on the sheet", async () => {
  mock.asGM();
  const item = {name: "Persuasion", type: "Power", system: {type: "wod.types.gift", level: 1}, flags: {"wodx-actions": {gift: "persuasion"}}};
  const g = api().data.newPowerOption(wolf, "gift", "Persuasion", {own: true, level: 1, item});
  assert.equal(g.cost, 3);
  const r = await api().xp.spend(wolf, {...g, source: {kind: "spirit", name: "A spirit summoned to teach the Gift"}});
  assert.equal(r.ok, true, r.reason);
  const rec = api().learn.records(wolf)[r.learning];
  const task = wolf.flags[ST].tasks[rec.taskId];
  assert.equal(task.interval, "day");
  assert.ok(wolf.effects.some(e => e.statuses?.includes("wodx-studying")));
  assert.equal(api().data.newPowerOption(wolf, "gift", "Persuasion", {own: true, level: 1, item}).ok, false, "one study at a time");
  await api().learn.onTaskDone({actor: wolf, task: {...task, status: "done", rolls: 1}});
  const made = [...wolf.items].find(i => i.name === "Persuasion" && i.system?.type === "wod.types.gift");
  assert.ok(made, "the Gift is on the sheet");
  assert.equal(made.flags["wodx-actions"].gift, "persuasion", "linked back to the Gift library");
  assert.match(api().data.newPowerOption(wolf, "gift", "Persuasion", {own: true, level: 1, item}).reason, /Already known/);
  assert.equal(opt(wolf, o => o.kind === "stat" && o.key === "gnosis").cost, 4);
});

test("a Wraith raises an Arcanos and buys a new one; waived, they come at once", async () => {
  mock.asGM();
  await api().learn.setWaived(wraith, true);
  const argos = opt(wraith, o => o.kind === "power" && o.cat === "arcanos");
  assert.equal(argos.cost, 3);
  await api().xp.requestSpend(wraith, argos);
  assert.equal([...wraith.items].find(i => i.name === "Argos").system.value, 2);
  const nw = api().data.newPowerOption(wraith, "arcanos", "Castigate");
  assert.equal(nw.cost, 7);
  await api().xp.requestSpend(wraith, nw);
  const made = [...wraith.items].find(i => i.name === "Castigate");
  assert.equal(made.system.type, "wod.types.arcanoi");
  assert.equal(made.system.value, 1);
  await api().learn.setWaived(wraith, false);
});

test("a Hunter's Virtues are not bought; a Kuei-jin spends by Kindred of the East", () => {
  assert.ok(!opt(hunter, o => o.kind === "virtue"), "Edges come from Virtue points, not experience");
  assert.equal(opt(hunter, o => o.kind === "willpower").cost, 5);
  assert.equal(opt(kj, o => o.kind === "discipline").cost, 8);
  assert.equal(opt(kj, o => o.kind === "stat" && o.key === "po").cost, 3);
  assert.ok(!opt(kj, o => o.kind === "road"), "Dharma is not bought with experience");
  assert.equal(api().data.newDisciplineOption(kj, "Tiger's Bones")?.cost ?? null, 10);
});
