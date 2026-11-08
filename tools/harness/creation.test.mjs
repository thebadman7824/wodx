import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
const M = "wodx-creation";

/* ---- actors shaped like upstream's ---- */
function setPath(obj, path, value) {
  const parts = path.split("."); let o = obj;
  for ( const p of parts.slice(0, -1) ) o = (o[p] ??= {});
  o[parts.at(-1)] = value;
}
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
class Item {
  constructor(data, parent) { Object.assign(this, structuredClone(data)); this.id = data._id ?? newId(); this.parent = parent; this.flags ??= {}; this._stats = {createdTime: ++ids}; }
  async update(changes) { for ( const [k, v] of Object.entries(changes) ) setPath(this, k, v); return this; }
}
class Actor {
  constructor(data) {
    const {items = [], ...rest} = structuredClone(data);
    Object.assign(this, rest);
    this.id = data._id ?? newId();
    this.flags ??= {};
    this.ownership ??= {default: 0};
    this.items = new Coll();
    for ( const i of items ) { const it = new Item(i, this); this.items.set(it.id, it); }
  }
  static async create(data) {
    if ( !data.system?.settings?.iscreated ) throw new Error("This test only creates actors from existing sheets");
    const a = new Actor(data);
    game.actors.set(a.id, a);
    return a;
  }
  getFlag(s, k) { return this.flags?.[s]?.[k]; }
  async setFlag(s, k, v) { (this.flags[s] ??= {})[k] = structuredClone(v); return this; }
  async update(changes) {
    for ( const [k, v] of Object.entries(changes) ) {
      const del = k.match(/^(.*)\.-=(.+)$/);
      if ( del ) { const parts = del[1].split("."); let o = this; for ( const p of parts ) o = o?.[p]; if ( o ) delete o[del[2]]; }
      else setPath(this, k, v);
    }
    return this;
  }
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; }
  async createEmbeddedDocuments(type, list) {
    assert.equal(type, "Item");
    return list.map(d => { const it = new Item(d, this); this.items.set(it.id, it); return it; });
  }
  toObject() { const {items, ...rest} = this; return structuredClone({...rest, _id: this.id, items: [...items.values()].map(i => { const {parent, ...r} = i; return {...structuredClone(r), _id: i.id}; })}); }
  testUserPermission(user, level) { return user.isGM || (this.ownership?.[user.id] ?? this.ownership?.default ?? 0) >= 3; }
  get isOwner() { return this.testUserPermission(game.user, "OWNER"); }
  get hasPlayerOwner() { return Object.entries(this.ownership).some(([id, l]) => id !== "default" && l >= 3 && !game.users.get(id)?.isGM); }
}
globalThis.Actor = Actor;

const trait = (value, label) => ({value, max: 5, label: `wod.attributes.${label}`, isvisible: true});
function mortalData(name, {owner = null} = {}) {
  return {
    name, type: "Mortal", ownership: owner ? {default: 0, [owner]: 3} : {default: 0}, folder: null,
    system: {
      settings: {iscreated: true, variant: "general", era: "wod.era.darkages", haspath: false, hasbloodpool: false, hasvirtue: false,
        powers: {hasdisciplines: false, defaultmaxvalue: 5}, abilities: {defaultmaxvalue: 5}, soak: {bashing: {isrollable: false}, lethal: {isrollable: false}, aggravated: {isrollable: false}}},
      attributes: {strength: trait(2, "strength"), dexterity: trait(3, "dexterity"), stamina: trait(2, "stamina"), wits: trait(3, "wits")},
      abilities: {brawl: {type: "talent", value: 1, max: 5, label: "wod.abilities.brawl", isvisible: true},
        occult: {type: "knowledge", value: 0, max: 5, label: "wod.abilities.occult", isvisible: true},
        computer: {type: "knowledge", value: 0, max: 5, label: "wod.abilities.computer", isvisible: false}},
      advantages: {
        willpower: {permanent: 4, temporary: 4, max: 10},
        bloodpool: {temporary: 0, max: 10, perturn: 1},
        path: {permanent: 7, value: 7, max: 10, label: "wod.advantages.path.humanity", custom: ""},
        virtues: {conscience: {permanent: 3, temporary: 3, max: 5, label: "wod.advantages.virtue.conscience"},
          selfcontrol: {permanent: 4, temporary: 4, max: 5, label: "wod.advantages.virtue.selfcontrol"},
          courage: {permanent: 2, temporary: 2, max: 5, label: "wod.advantages.virtue.courage"}}
      }
    },
    items: [{name: "Theology", type: "Trait", system: {type: "wod.types.knowledgesecondability", value: 2}},
      {name: "Rosary", type: "Item", system: {}}]
  };
}
function vampireData(name, clan, generation, disciplines) {
  const d = mortalData(name);
  d.type = "Vampire";
  Object.assign(d.system, {clan: "custom", custom: {clan}, generation, generationmod: 0, sire: ""});
  d.system.settings.haspath = d.system.settings.hasbloodpool = true;
  d.items = disciplines.map(([n, v]) => ({name: n, type: "Power", system: {type: "wod.types.discipline", value: v, level: v}}));
  return d;
}

game.actors = new Coll();
const marta = new Actor(vampireData("Sister Marta", "Lasombra", 9, [["Dominate", 2], ["Obtenebration", 3], ["Potence", 2]]));
const anna = new Actor(mortalData("Anna the Miller's Daughter", {owner: "p1"}));
const tomas = new Actor(mortalData("Tomas the Groom"));
for ( const a of [marta, anna, tomas] ) game.actors.set(a.id, a);
const scene = {id: "dolany", name: "Dolany Village", tokens: new Coll([["t1", {id: "t1", actorId: anna.id}], ["t2", {id: "t2", actorId: tomas.id}]]),
  async updateEmbeddedDocuments(type, list) { for ( const u of list ) Object.assign(this.tokens.get(u._id), u); return list; }};
game.scenes = new Coll([[scene.id, scene]]);
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
globalThis.canvas = {tokens: {controlled: []}};

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const {DialogV2} = foundry.applications.api;
const api = () => game.modules.get(M).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const set = values => form => {
  for ( const [k, v] of Object.entries(values) ) {
    const el = form.elements[k];
    if ( !el ) throw new Error(`No field ${k}`);
    if ( el.type === "checkbox" ) el.checked = !!v; else el.value = String(v);
  }
  return "ok";
};
const xpOf = a => api().data.xpTotals(a);

test("init and ready: the module starts in a WoDX world and registers its approval type", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().embrace);
  assert.equal(chron().eras.activeEra().profile.id, "dark-ages");
});

test("GATE: the Embrace, end to end", async () => {
  const before = game.actors.size;
  // Defaults follow the sire: Lasombra, 10th Generation
  DialogV2.queue(form => {
    assert.equal(form.elements.clan.value, "Lasombra");
    assert.equal(form.elements.generation.value, "10");
    return set({mortal: anna.id, sire: marta.id})(form);
  });
  const vampire = await api().change.embraceDialog();
  assert.ok(vampire, "a vampire was made");
  assert.equal(game.actors.size, before + 1, "the mortal is kept beside the new vampire");
  assert.equal(vampire.type, "Vampire");
  assert.equal(vampire.name, anna.name);
  const s = vampire.system;
  assert.equal(s.generation, 10);
  assert.deepEqual([s.clan, s.custom.clan, s.sire], ["custom", "Lasombra", "Sister Marta"]);
  assert.deepEqual(s.advantages.bloodpool, {temporary: 1, max: 13, perturn: 1}, "10th Generation: 13 blood, 1 a turn, rising hungry");
  assert.deepEqual([s.advantages.path.label, s.advantages.path.custom, s.advantages.path.permanent], ["custom", "Road of Humanity", 7]);
  assert.equal(s.settings.era, "wod.era.darkages");
  assert.equal(s.settings.hasbloodpool && s.settings.powers.hasdisciplines, true);
  assert.equal(s.attributes.dexterity.value, 3, "traits carry over");
  const discs = api().data.disciplinesOf(vampire).map(d => `${d.name} ${d.value}`).sort();
  assert.deepEqual(discs, ["Dominate 0", "Obtenebration 0", "Potence 0"], "clan Disciplines listed at 0 dots");
  assert.ok(vampire.items.getName("Theology"), "items carry over");
  assert.equal(vampire.ownership.p1, 3, "the player still owns the character");
  // Lineage both ways, and the mortal is filed away
  assert.deepEqual(api().data.lineage(vampire).sire, {id: marta.id, name: "Sister Marta"});
  assert.deepEqual(api().data.lineage(vampire).formerly, {id: anna.id, name: anna.name});
  assert.deepEqual(api().data.lineage(anna).became, {id: vampire.id, name: vampire.name});
  assert.equal(game.folders.get(anna.folder).name, "WoDX · Before the Embrace");
  assert.equal(api().data.chronology(vampire).embraced, game.time.worldTime);
  assert.equal(scene.tokens.get("t1").actorId, vampire.id, "the token now shows the vampire");
  assert.equal(scene.tokens.get("t2").actorId, tomas.id, "other tokens are untouched");
  const card = mock.log.chat.at(-1);
  assert.match(card.content, /The Embrace/);
  assert.match(card.content, /10th Generation: blood pool 13/);
  assert.ok(card.whisper.includes("p1"), "the player sees the card");
  const journal = game.journal.find(j => j.getFlag(M, "kind") === "lineage");
  assert.match(journal.pages.getName("Blood").text.content, /Sister Marta[\s\S]*Anna the Miller/);
  assert.match(journal.pages.getName("Ghouls and bonds").text.content, /was .*Anna the Miller.* before the Embrace/);
  // The mortal record can't be Embraced twice
  DialogV2.queue(form => {
    assert.ok(![...form.elements.mortal.options].some(o => o.value === anna.id));
    return null;
  });
  await api().change.embraceDialog();
});

test("a childe cannot be closer to Caine than the sire", async () => {
  DialogV2.queue(set({mortal: tomas.id, sire: marta.id, generation: 9}));
  assert.equal(await api().change.embraceDialog(), null);
  assert.ok(mock.log.notifications.some(([l, m]) => l === "warn" && /closer to Caine/.test(m)));
});

test("vitae: the first drink makes a ghoul with Potence 1; three nights bind", async () => {
  const r1 = await api().giveVitae(tomas, marta, {points: 3});
  assert.equal(r1.becameGhoul, true);
  assert.equal(api().data.lineOf(tomas), "ghoul");
  assert.deepEqual(tomas.system.advantages.bloodpool, {temporary: 3, max: 10, perturn: 1});
  assert.equal(tomas.system.settings.variantsheet, "Vampire");
  assert.deepEqual(api().data.disciplinesOf(tomas).map(d => `${d.name} ${d.value}`), ["Potence 1"]);
  assert.equal(r1.stage.label, "First drink");
  // Same night: blood, but no deeper bond
  const r2 = await api().giveVitae(tomas, marta, {points: 2, time: game.time.worldTime + 3600});
  assert.equal(r2.sameNight, true);
  assert.equal(r2.stage.label, "First drink");
  assert.equal(tomas.system.advantages.bloodpool.temporary, 5);
  const r3 = await api().giveVitae(tomas, marta, {time: game.time.worldTime + 86400});
  assert.equal(r3.stage.label, "Second drink");
  const r4 = await api().giveVitae(tomas, marta, {time: game.time.worldTime + (2 * 86400), points: 9});
  assert.equal(r4.stage.label, "Blood bound");
  assert.equal(tomas.system.advantages.bloodpool.temporary, 10, "a ghoul holds 10 at most");
  const ghouls = game.journal.find(j => j.getFlag(M, "kind") === "lineage").pages.getName("Ghouls and bonds").text.content;
  assert.match(ghouls, /Tomas the Groom.*Blood bound, ghoul/);
});

test("experience: award, a player's request, approval, and the log", async () => {
  const vampire = game.actors.find(a => a.type === "Vampire" && a.name === anna.name);
  await api().award([vampire, tomas], 20, "Sessio XI");
  assert.deepEqual(xpOf(vampire), {earned: 20, spent: 0, available: 20});

  // The player asks for Obtenebration 0 → 1 (a new Discipline: 10) and Dexterity 3 → 4 (12)
  mock.asPlayer();
  const opts = api().data.purchaseOptions(vampire);
  const obt = opts.find(o => o.label === "Obtenebration");
  assert.deepEqual([obt.cost, obt.discipline, obt.ok], [10, "clan", true]);
  const dex = opts.find(o => o.kind === "attribute" && o.key === "dexterity");
  assert.equal(dex.cost, 12);
  assert.ok(!opts.some(o => o.key === "computer"), "hidden abilities with no dots are not offered");
  await api().xp.requestSpend(vampire, obt);
  await api().xp.requestSpend(vampire, dex);
  mock.asGM();
  await mock.deliver("gm");
  const queue = game.settings.get("wodx-chronicle", "approvals").pending.filter(p => p.type === "xp-spend");
  assert.equal(queue.length, 2);
  assert.equal(queue[0].from, "p1");
  assert.match(queue[0].title, /Obtenebration 0 → 1 for 10 experience/);

  await chron().approvals.decide(queue[0].id, "approve");
  assert.equal(api().data.disciplinesOf(vampire).find(d => d.name === "Obtenebration").value, 1);
  assert.deepEqual(xpOf(vampire), {earned: 20, spent: 10, available: 10});
  // The second request no longer fits: 12 needed, 10 left
  await chron().approvals.decide(queue[1].id, "approve");
  assert.equal(vampire.system.attributes.dexterity.value, 3, "not bought");
  assert.ok(mock.log.notifications.some(([l, m]) => l === "warn" && /Needs 12 experience; 10 available/.test(m)));
  const log = game.journal.find(j => j.getFlag(M, "kind") === "xp-log");
  const page = log.pages.find(p => p.getFlag(M, "actorId") === vampire.id).text.content;
  assert.match(page, /Earned 20, spent 10, 10 to spend/);
  assert.match(page, /Sessio XI[\s\S]*\+20[\s\S]*Obtenebration 0 → 1[\s\S]*−10/);
});

test("a player cannot request for someone else's character, and forged costs are refused", async () => {
  mock.asPlayer();
  const sent = mock.log.socket.length;
  const res = await api().xp.requestSpend(marta, {...api().data.purchaseOptions(marta)[0], ok: true});
  assert.equal(res.ok, false);
  assert.equal(mock.log.socket.length, sent, "nothing was sent");
  assert.ok(mock.log.notifications.some(([, m]) => /only spend experience for your own/.test(m)));
  mock.asGM();
  // A forged message: wrong cost
  const vampire = game.actors.find(a => a.type === "Vampire" && a.name === anna.name);
  const before = game.settings.get("wodx-chronicle", "approvals").pending.length;
  await api().xp.onRequest({userId: "p1", actorId: vampire.id, purchase: {kind: "willpower", key: "willpower", current: 4, next: 5, cost: 1}});
  await api().xp.onRequest({userId: "p1", actorId: marta.id, purchase: {kind: "willpower", key: "willpower", current: 4, next: 5, cost: 4}});
  assert.equal(game.settings.get("wodx-chronicle", "approvals").pending.length, before, "neither is queued");
});

test("ghoul limits: Disciplines the domitor knows, capped by the domitor's Generation", async () => {
  await api().award([tomas], 0 + 30, "Service");
  const opts = api().data.purchaseOptions(tomas);
  const pot = opts.find(o => o.label === "Potence");
  assert.equal(pot.ok, false, "a 9th-Generation domitor's ghoul stops at 1 dot");
  assert.match(pot.reason, /most this character can have \(1\)/);
  const dom = api().data.newDisciplineOption(tomas, "Dominate");
  assert.deepEqual([dom.cost, dom.ok], [20, true], "Marta knows Dominate");
  const pre = api().data.newDisciplineOption(tomas, "Presence");
  assert.equal(pre.ok, false);
  assert.match(pre.reason, /domitor does not know/);
  const cel = api().data.newDisciplineOption(tomas, "Celerity");
  assert.equal(cel.ok, true, "Celerity is always open to ghouls");
  // The GM buys directly: no queue
  const r = await api().xp.requestSpend(tomas, dom);
  assert.equal(r.ok, true);
  assert.equal(api().data.disciplinesOf(tomas).find(d => d.name === "Dominate").value, 1);
  assert.equal(xpOf(tomas).available, 30, "20 + 30 earned, 20 spent");
});

test("the windows render", async () => {
  const {CreationApp, SpendApp} = await import(join(root, "modules/wodx-creation/scripts/apps.mjs"));
  const hub = new CreationApp();
  await hub.render({force: true});
  assert.match(hub.element.textContent, /Embrace a mortal/);
  assert.match(hub.element.textContent, /Anna the Miller's Daughter/);
  const vampire = game.actors.find(a => a.type === "Vampire" && a.name === anna.name);
  const spend = new SpendApp({id: "x", actor: vampire});
  await spend.render({force: true});
  assert.match(spend.element.textContent, /10 experience to spend/);
  assert.match(spend.element.textContent, /Obtenebration/);
});

test("allies: a player improves a ghoul NPC, paid from the patron's experience", async () => {
  const vampire = game.actors.find(a => a.type === "Vampire" && a.name === anna.name);
  const {setAlly, CreationApp} = await import(join(root, "modules/wodx-creation/scripts/apps.mjs"));
  // Not an ally yet: the player may not spend for Tomas
  assert.equal(api().data.canSpendFor(tomas, game.users.get("p1")), false);
  // The GM makes Tomas an ally of Anna's vampire, paying from her experience, visible to her player
  DialogV2.queue(form => {
    assert.equal(form.elements.patron.value, vampire.id, "the only player character is offered");
    return set({payer: "patron", observe: true})(form);
  });
  await (await import(join(root, "modules/wodx-creation/scripts/apps.mjs"))).allyDialog(tomas);
  assert.deepEqual(api().data.allyOf(tomas).patron, {id: vampire.id, name: vampire.name});
  assert.equal(tomas.ownership.p1, 2, "the player can now see the ghoul's sheet");
  assert.equal(api().data.payerOf(tomas), vampire);
  assert.equal(api().data.canSpendFor(tomas, game.users.get("p1")), true);
  // The roster lists the ally; "Show every NPC" adds the rest
  const hub = new CreationApp();
  await hub.render({force: true});
  const names = () => [...hub.element.querySelectorAll("table.wodx-roster tbody tr td:first-child")].map(td => td.textContent);
  assert.match(hub.element.textContent, /Tomas the Groom[\s\S]*Ally of Anna/);
  assert.deepEqual(names(), [anna.name, "Tomas the Groom"]);
  hub.showNPCs = true;
  await hub.render();
  assert.ok(names().includes("Sister Marta"), "every NPC, once asked for");

  // The player asks for Celerity for Tomas; it is paid from the vampire's 10 points... not enough (20)
  mock.asPlayer();
  const cel = api().data.newDisciplineOption(tomas, "Celerity");
  assert.equal(cel.ok, false);
  assert.match(cel.reason, /Needs 20 experience; 10 available/, "the patron's pool, not the ghoul's own 30");
  mock.asGM();
  await api().award([vampire], 15, "Bonus");
  mock.asPlayer();
  const cel2 = api().data.newDisciplineOption(tomas, "Celerity");
  assert.equal(cel2.ok, true);
  await api().xp.requestSpend(tomas, cel2);
  mock.asGM();
  await mock.deliver("gm");
  const entry = game.settings.get("wodx-chronicle", "approvals").pending.find(p => p.type === "xp-spend" && p.data.actorId === tomas.id);
  assert.ok(entry, "the ally's request is queued");
  assert.match(entry.detail, new RegExp(`Paid by ${vampire.name}`));
  await chron().approvals.decide(entry.id, "approve");
  assert.equal(api().data.disciplinesOf(tomas).find(d => d.name === "Celerity")?.value, 1);
  assert.equal(xpOf(vampire).available, 5, "10 + 15 − 20");
  assert.equal(xpOf(tomas).available, 30, "the ghoul's own pool is untouched");
  assert.ok(vampire.items.find(i => i.name === "Tomas the Groom: New Discipline: Celerity"));

  // Ending the alliance puts the permission back as it was (no entry)
  await setAlly(tomas, {patron: null});
  assert.equal(api().data.allyOf(tomas), null);
  assert.equal("p1" in tomas.ownership, false);
  assert.equal(api().data.canSpendFor(tomas, game.users.get("p1")), false);
});

test("search boxes filter selects, lists and tables (rule B24)", async () => {
  const {searchBox, applySearch, installSearch} = await import(join(root, "modules/wodx-chronicle/scripts/search.mjs"));
  const div = document.createElement("div");
  div.className = "application";
  div.innerHTML = `${searchBox("select[name=who]")}<select name="who"><option value="">Unknown</option><option value="a">Anna</option><option value="b">Bogdan</option><option value="c">Brother Anselm</option></select>
    ${searchBox("ul.l")}<ul class="l"><li>Sister Marta</li><li>Father Ludovic</li><li>Šárka</li></ul>
    ${searchBox("table.t")}<table class="t"><tbody><tr data-search-text="Dolany"><td>town select text</td></tr><tr data-search-text="Lower Town"><td>x</td></tr></tbody></table>`;
  document.body.append(div);
  installSearch(document);
  const [b1, b2, b3] = div.querySelectorAll("input.wodx-search");
  b1.value = "ann";
  b1.dispatchEvent(new Event("input", {bubbles: true}));
  assert.deepEqual([...div.querySelectorAll("select option")].filter(o => !o.hidden).map(o => o.value), ["", "a"], "the empty choice stays");
  assert.equal(div.querySelector("select").value, "", "the current choice is not changed");
  b2.value = "sarka";
  assert.equal(applySearch(b2), 1, "accents are ignored");
  b3.value = "town";
  assert.equal(applySearch(b3), 1, "rows match their search text, not the words in their selects");
  b3.value = "";
  assert.equal(applySearch(b3), 2);
  div.remove();
});

test("no error notifications", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
