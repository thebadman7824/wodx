import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

/* Phase 6b: Werewolf and Fera — the rules, the data files and the engine (garou.js) with a stubbed roller */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
CONFIG.statusEffects = [];
globalThis.canvas = {scene: {id: "scn1"}, tokens: {controlled: []}};
game.combat = null;

const chats = mock.log.chat;

class Coll extends Map {
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
  filter(f) { return [...this.values()].filter(f); }
  find(f) { return [...this.values()].find(f); }
  some(f) { return [...this.values()].some(f); }
  getName(n) { return this.find(v => v.name === n); }
}
game.scenes = Object.assign(new Coll(), {active: {tokens: []}});
game.macros = new Coll();
const setPath = (o, path, v) => { const p = path.split("."); for ( const k of p.slice(0, -1) ) o = (o[k] ??= {}); o[p.at(-1)] = v; };
const flagged = o => Object.assign(o, {
  getFlag(s, k) { return this.flags?.[s]?.[k]; },
  async setFlag(s, k, v) { setPath(this.flags ??= {}, `${s}.${k}`, structuredClone(v)); return this; },
  async unsetFlag(s, k) { delete this.flags?.[s]?.[k]; return this; },
  async update(ch) { for ( const [k, v] of Object.entries(ch) ) setPath(this, k, structuredClone(v)); return this; }
});

let ids = 0;
const shapes = () => Object.fromEntries(["homid", "glabro", "crinos", "hispo", "lupus"].map(k => [k, {isactive: k === "homid", label: k}]));
function garou(name, {breed = "Homid", auspice = "Ahroun", tribe = "Fenrir", rage = [3, 5], gnosis = [3, 3], wp = [4, 4], rank = 1,
  renown = {}, changingbreed = "", form = "homid", player = true, type = "Werewolf", attrs = {}, abilities = {}} = {}) {
  const s = shapes(); for ( const k of Object.keys(s) ) s[k].isactive = k === form;
  const a = flagged({
    id: `a${++ids}`, uuid: `Actor.a${ids}`, name, type, flags: {}, isOwner: true, hasPlayerOwner: player,
    items: new Coll(), effects: new Coll(),
    system: {
      breed, auspice, tribe, changingbreed, shapes: s,
      attributes: Object.fromEntries(["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"]
        .map(k => [k, {value: attrs[k] ?? 3, total: attrs[k] ?? 3}])),
      abilities: Object.fromEntries(Object.entries({primalurge: 2, enigmas: 2, rituals: 2, occult: 0, ...abilities}).map(([k, v]) => [k, {value: v, label: k}])),
      advantages: {rage: {permanent: rage[1], temporary: rage[0]}, gnosis: {permanent: gnosis[1], temporary: gnosis[0]}, willpower: {permanent: wp[1], temporary: wp[0]}},
      renown: {rank, glory: {permanent: renown.glory ?? 2, temporary: 0}, honor: {permanent: renown.honor ?? 1, temporary: 0}, wisdom: {permanent: renown.wisdom ?? 0, temporary: 0}},
      health: {damage: {bashing: 0, lethal: 0, aggravated: 0}},
      conditions: {isfrenzy: false}
    },
    getActiveTokens: () => [],
    async createEmbeddedDocuments(kind, list) {
      const coll = kind === "Item" ? this.items : this.effects;
      return list.map(d => { const actor = this; const doc = flagged({...structuredClone(d), id: `d${++ids}`, async delete() { coll.delete(this.id); actor.deleted = (actor.deleted ?? 0) + 1; }}); coll.set(doc.id, doc); return doc; });
    }
  });
  return a;
}
function mortal(name, wp = 3, {kinfolk = null} = {}) {
  const a = garou(name, {type: "Mortal", wp: [wp, wp]});
  a.system.shapes = undefined;
  if ( kinfolk ) setPath(a.flags, "world.wodx.kinfolk", kinfolk);
  return a;
}

/* ---------------- The rules (pure) ---------------- */

const G = await import(join(root, "modules/wodx-actions/scripts/garou-rules.js"));
const D = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/garou.json"), "utf8"));
const F = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/fera.json"), "utf8"));
const L = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/gifts-daw.json"), "utf8"));

test("rules basis by era: Dark Ages and the Long Night use DA:W, the rest W20 (B41)", () => {
  assert.equal(G.basis("dark-ages"), "daw");
  assert.equal(G.basis("long-night"), "daw");
  assert.equal(G.basis("renaissance"), "w20");
  assert.equal(G.basis(null), "w20");
});

test("moon Rage: by phase, and all of it under the auspice's own moon (DA:W p. 91; W20 p. 145)", () => {
  assert.equal(G.moonRage(4, "ahroun", "daw", D.moonRage), "all");
  assert.equal(G.moonRage(4, "ragabash", "daw", D.moonRage), 4);
  assert.equal(G.moonRage(0, "ahroun", "daw", D.moonRage), 1);
  assert.equal(G.moonRage(5, "ahroun", "daw", D.moonRage), 3, "DA:W gives no waning value: the half-moon value");
  assert.equal(G.moonRage(5, "ahroun", "w20", D.moonRage), 2, "W20 waning: 2");
  assert.equal(G.moonRage(7, "theurge", "w20", D.moonRage), "all", "a Theurge's crescent waning too");
});

test("Rage-roll difficulty: W20 by the moon; Dark Ages the Storyteller's 6; Crinos −1; scarring −1", () => {
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 4, auspice: "ragabash"}), 4);
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 4, auspice: "ahroun"}), 3);
  assert.equal(G.rageDifficulty({b: "w20", phaseIndex: 4, auspice: "ahroun", form: "crinos"}), 3, "not both");
  assert.equal(G.rageDifficulty({b: "daw", phaseIndex: 4, form: "crinos"}), 5);
  assert.equal(G.rageDifficulty({b: "daw", scarred: true}), 5);
});

test("frenzy: four successes, more at high Rank, and the Thrall of the Wyrm at six (DA:W pp. 94–95, 101)", () => {
  assert.equal(G.frenzyCheck(3, {rank: 1, byRank: D.frenzyByRank}).result, "none");
  assert.equal(G.frenzyCheck(4, {rank: 1, byRank: D.frenzyByRank}).result, "frenzy");
  assert.equal(G.frenzyCheck(4, {rank: 5, byRank: D.frenzyByRank}).result, "none", "Rank 5 needs five");
  assert.equal(G.frenzyCheck(6, {rank: 1, byRank: D.frenzyByRank}).result, "thrall");
  assert.equal(G.frenzyCheck(7, {need: 6, thrall: 0}).result, "frenzy", "Nagah: six to frenzy, never the Thrall");
  assert.equal(G.rankFrenzyDiff(4, D.frenzyByRank), 2);
});

test("Rage for extra actions: DA:W half rounded up, safe up to the lower of Dexterity and Wits; W20 half rounded down", () => {
  assert.deepEqual(G.rageActionCap("daw", 5, 2, 4), {max: 3, safe: 2});
  assert.deepEqual(G.rageActionCap("w20", 5, 2, 4), {max: 2, safe: 2});
  assert.equal(G.rageActionCap("daw", 5, 2, 4, true).safe, 3, "frenzy: no penalty");
});

test("rising on Rage: Dark Ages bashing frenzies only on four successes; lethal always frenzies and scars", () => {
  assert.deepEqual(G.remainingActive("daw", "bashing", 2), {heals: 2, frenzy: false, scar: false});
  assert.deepEqual(G.remainingActive("daw", "bashing", 4), {heals: 4, frenzy: true, scar: false});
  assert.deepEqual(G.remainingActive("daw", "lethal", 1), {heals: 1, frenzy: true, scar: true});
  assert.deepEqual(G.remainingActive("w20", "bashing", 1), {heals: 1, frenzy: true, scar: true});
  assert.equal(G.remainingActive("daw", "lethal", 0).heals, 0);
});

test("regeneration and banes, by breed, form and Fera", () => {
  assert.equal(G.regeneration({breed: "homid", form: "homid"}).regen, false);
  assert.equal(G.regeneration({breed: "homid", form: "glabro"}).regen, true);
  assert.equal(G.regeneration({breed: "metis", form: "homid"}).regen, true);
  assert.equal(G.regeneration({breed: "homid", form: "crinos", fera: F.breeds.Kitsune}).regen, false);
  assert.equal(G.regeneration({breed: "homid", form: "homid", fera: F.breeds.Rokea}).condition, "saltwater");
  const s = o => G.baneEffect({breed: "homid", form: "crinos", metal: "silver", ...o});
  assert.equal(s({b: "daw"}).type, "aggravated");
  assert.equal(s({b: "daw"}).soak, false);
  assert.deepEqual([s({b: "daw", form: "homid"}).soakDiff, s({b: "daw", form: "homid"}).type], [6, "lethal"], "DA:W p. 102: breed form soaks at 6");
  assert.equal(s({b: "w20", form: "homid"}).bane, false, "W20 p. 255: an ordinary weapon in breed form");
  assert.equal(s({b: "daw", breed: "metis", form: "crinos"}).type, "aggravated", "metis: always");
  assert.equal(s({b: "w20", fera: F.breeds.Corax}).bane, false, "Corax: silver is nothing");
  assert.equal(s({b: "w20", fera: F.breeds.Corax, metal: "gold"}).type, "aggravated", "Corax: gold");
  assert.equal(s({b: "w20", fera: F.breeds.Kitsune}).soakDiff, 8);
  assert.equal(G.silverGnosisPenalty({objects: 1, bullets: 10, grand: 1}), 5);
});

test("the Delirium, the Curse and meditation", () => {
  assert.equal(G.delirium(6, "daw", D.delirium).memory, "remembers but rationalizes");
  assert.equal(G.delirium(6, "w20", D.delirium).memory, "forgets");
  assert.equal(G.delirium(14, "daw", D.delirium).reaction, "No reaction");
  assert.equal(G.curseDice(5, 3), 2);
  assert.equal(G.curseDice(2, 3), 0);
  assert.equal(G.meditationDifficulty(0), 8);
  assert.equal(G.meditationDifficulty(5), 10);
});

test("Renown and Rank: the DA:W chart, breaking a dot to cover a loss, the Rite of Accomplishment", () => {
  const C = D.rankChart.daw;
  assert.equal(G.rankFor("ahroun", {glory: 2, honor: 1, wisdom: 0}, C), 1);
  assert.equal(G.rankFor("ahroun", {glory: 4, honor: 1, wisdom: 0}, C), 2);
  assert.equal(G.rankFor("ahroun", {glory: 6, honor: 1, wisdom: 1}, C), 2, "Rank 3 also needs Honor 3");
  assert.equal(G.rankFor("ragabash", {glory: 3, honor: 2, wisdom: 2}, C), 2, "Ragabash: totals");
  assert.equal(G.rankFor("nobody", {}, C), null);
  assert.deepEqual(G.renownChange({permanent: 2, temporary: 3}, -5).permanent, 1);
  assert.equal(G.renownChange({permanent: 2, temporary: 3}, -5).temporary, 8);
  assert.equal(G.renownChange({permanent: 0, temporary: 1}, -3).temporary, 0);
  assert.deepEqual(G.accomplish({permanent: 2, temporary: 12}), {permanent: 3, temporary: 2});
  assert.equal(G.accomplish({permanent: 2, temporary: 9}), null);
});

test("rites and summoning (DA:W pp. 144–145, 150)", () => {
  assert.deepEqual(G.riteRoll("death", {rank: 2, table: D.rites}), {pool: "charisma+rituals", diff: 6, label: "Death"});
  assert.equal(G.riteRoll("mystic", {participants: 10, table: D.rites}).diff, 5, "−1 per five taking part");
  assert.equal(G.riteRoll("seasonal", {caern: 3, table: D.rites}).diff, 5);
  assert.equal(G.riteRoll("minor", {table: D.rites}).pool, null);
  assert.equal(G.summonDifficulty("Incarna", 9, D.summoning), 3, "never below 3");
  assert.equal(G.summonAttitude(9, D.summoning), "Comes at once, friendly");
});

test("Gift codes: cost, pool, difficulty from the target, duration, experience", () => {
  assert.deepEqual(G.giftCost("g1r1"), {gnosis: 1, rage: 1, willpower: 0, variable: false, per: ""});
  assert.equal(G.giftCost("gX").variable, true);
  assert.equal(G.giftCost("w1each").per, "each");
  assert.deepEqual(G.giftPool("manipulation+subterfuge|empathy").map(p => p.kind), ["attr", "ability"]);
  assert.deepEqual(G.giftPool("gnosis").map(p => p.kind), ["trait"]);
  assert.equal(G.giftDifficulty("tWp", {t: {willpower: 7}}), 7);
  assert.equal(G.giftDifficulty("tWp"), null, "no target: ask");
  assert.equal(G.giftDifficulty("tSta+4", {t: {stamina: 2}}), 6);
  assert.equal(G.giftDifficulty("gauntlet", {gauntlet: 7}), 7);
  assert.equal(G.giftDifficulty(8), 8);
  assert.deepEqual(G.giftDuration("turns", 3), {kind: "rounds", rounds: 3});
  assert.equal(G.giftDuration("instant"), null);
  assert.equal(G.giftXP(2, true), 6);
  assert.equal(G.giftXP(2, false), 10);
});

/* ---------------- The data files ---------------- */

test("the Gift library is whole: unique ids, known groups, every field the engine reads", () => {
  const groups = new Set(["homid", "metis", "lupus", ...Object.keys(D.auspices), ...Object.keys(D.tribes)]);
  const ids = new Set();
  const durations = new Set(["scene", "turn", "turns", "instant", "at-will", "permanent", "var", "day", "days", "hours", "minutes", "week", "months"]);
  for ( const g of L.gifts ) {
    assert.ok(g.n && g.id && g.e && g.p, `fields: ${g.n}`);
    assert.ok(!ids.has(g.id), `duplicate id ${g.id}`); ids.add(g.id);
    assert.ok(g.l >= 1 && g.l <= 6, `level ${g.n}`);
    for ( const x of g.g ) assert.ok(groups.has(x), `group ${x} on ${g.n}`);
    if ( g.t ) assert.ok(durations.has(g.t), `duration ${g.t} on ${g.n}`);
    if ( g.r ) for ( const p of G.giftPool(g.r) ) assert.ok(p.kind !== "number" || p.value > 0, `pool ${g.n}`);
  }
  assert.ok(L.gifts.length >= 170);
});

test("every starting Gift named for a breed, auspice or tribe is in the library", () => {
  const names = new Set(L.gifts.map(g => g.n.toLowerCase().replace(/[’']/g, "")));
  const missing = [];
  for ( const part of ["breeds", "auspices", "tribes"] ) for ( const [k, v] of Object.entries(D[part]) )
    for ( const n of v.gifts ) if ( !names.has(n.toLowerCase().replace(/[’']/g, "")) ) missing.push(`${k}: ${n}`);
  assert.deepEqual(missing, []);
});

test("the Fera table: every breed has a bane list, Rage flag, regeneration kind and a page", () => {
  for ( const [k, b] of Object.entries(F.breeds) ) {
    assert.ok(Array.isArray(b.bane), k);
    assert.equal(typeof b.rage, "boolean", k);
    assert.ok(["garou", "none", "saltwater"].includes(b.regen), k);
    assert.ok(b.page && b.renown?.length === 3, k);
  }
});

/* ---------------- The engine ---------------- */

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
const chron = game.modules.get("wodx-chronicle").api;
let ERA = "dark-ages";
chron.eras = {activeEra: () => ({profile: {id: ERA}})};
const timed = [];
chron.applyTimed = async (actor, o) => { timed.push({actor: actor.name, ...o}); };
const conditionsSet = [];
chron.conditions = {setCondition: async (a, id, on) => conditionsSet.push([a.name, id, on])};

const GX = await import(join(root, "modules/wodx-actions/scripts/garou.js"));
const S = {spendResources: true, moonRage: true, autoRegen: true};
GX.registerSettings((key, name, hint, type, def) => game.settings.register("wodx-actions", key, {name, hint, scope: "world", config: true, type, default: def}));
await GX.loadData();

const rolls = [];           // queued results for rollPool: number of successes, or {successes, botch}
const forms = [];           // queued dialog answers: an object (the form data), or a function (root) => data
const posts = [];
const notes = [];
const heals = [];
game.wodxCombat = {healDamage: async (a, type, k) => { heals.push([a.name, type, k]); a.system.health.damage[type] -= k; }};
const ctx = {
  post: async (actor, title, body, r = [], data = null) => { const m = {actor: actor?.name, title, body, data}; posts.push(m); return m; },
  rollPool: async (dice, diff) => {
    const q = rolls.shift() ?? 0; const r = typeof q === "number" ? {successes: q, botch: false} : q;
    return {...r, dice, diff, roll: null, faces: []};
  },
  rollBlock: (label, r, parts) => `<div class="roll">${label}: ${r.successes} (${r.dice} dice at ${r.diff}) ${parts.join(" ")}</div>`,
  dialog: async (title, content, label, cb, {render} = {}) => {
    const el = document.createElement("div"); el.innerHTML = content;
    render?.(el);
    const a = forms.shift();
    if ( a === undefined ) throw new Error(`Unexpected dialog: ${title}`);
    if ( a === null ) return null;
    const readDefaults = () => {
      const fd = {};
      for ( const f of el.querySelectorAll("input, select") ) {
        if ( !f.name ) continue;
        fd[f.name] = f.type === "checkbox" ? f.checked : f.type === "number" ? Number(f.value) : f.value;
      }
      return fd;
    };
    const fd = typeof a === "function" ? a(el, readDefaults()) : {...readDefaults(), ...a};
    return cb(fd);
  },
  updateActor: (a, d) => a.update(d),
  attr: (a, k) => a.system?.attributes?.[k]?.total ?? 0,
  findAbility: (a, k) => { const x = a.system?.abilities?.[k]; return x ? {value: x.value} : null; },
  setting: k => S[k],
  spendWillpower: async (a, k = 1) => { const w = a.system.advantages.willpower; if ( w.temporary < k ) return false; w.temporary -= k; return true; },
  notify: m => notes.push(m)
};
const E = GX.build(ctx);
const reset = () => { rolls.length = 0; forms.length = 0; posts.length = 0; notes.length = 0; heals.length = 0; timed.length = 0; chats.length = 0; };

test("reading the sheet: breed, auspice, tribe, form, Fera row", () => {
  const a = garou("Reads", {breed: "wod.bio.werewolf.lupus", auspice: "Theurge", tribe: "Get of Fenris", form: "hispo"});
  const i = GX.info(a);
  assert.deepEqual([i.breed, i.auspice, i.tribe, i.form, i.feraKey], ["lupus", "theurge", "fenrir", "hispo", "Garou"]);
  const b = garou("Cat", {changingbreed: "Bastet"});
  assert.equal(GX.info(b).fera.renown[0], "Ferocity");
  assert.equal(GX.isShifter(b), true);
});

test("changing form: one success per form passed; a partial success goes partway; the sheet's Glabro bonus follows the era", async () => {
  reset(); ERA = "dark-ages";
  const a = garou("Shifter");
  const [glabroMan] = await a.createEmbeddedDocuments("Item", [{name: "Glabro - Manipulation bonus", type: "Bonus", system: {parentid: "glabro", settingtype: "manipulation", type: "attribute_buff", value: -2}}]);
  rolls.push(1);
  forms.push({form: "crinos", how: "roll", mod: 0});
  await E.shift(a);
  assert.equal(GX.info(a).form, "glabro", "one of two successes: Glabro this turn");
  assert.match(posts.at(-1).body, /Partway/);
  assert.equal(a.flags.world.wodx.form, "glabro");
  assert.equal(a.system.settings?.isupdated, false, "the system is asked to work out the totals");
  assert.equal(glabroMan.system.value, -1, "DA:W p. 106: Glabro is Manipulation −1");
  assert.equal(a.system.shapes[""], undefined);
  rolls.push(1);
  forms.push({form: "crinos", how: "roll", mod: 0});
  await E.shift(a);
  assert.equal(GX.info(a).form, "crinos");
  assert.match(posts.at(-1).body, /Delirium/);
  // Rage: instant
  forms.push({form: "lupus", how: "rage"});
  await E.shift(a);
  assert.equal(GX.info(a).form, "lupus");
  assert.equal(a.system.advantages.rage.temporary, 2);
  // W20: the sheet's −2 again
  ERA = "renaissance";
  forms.push({form: "glabro", how: "rage"});
  await E.shift(a);
  assert.equal(glabroMan.system.value, -2);
  ERA = "dark-ages";
  // An empty choice changes nothing
  forms.push({form: "", how: "rage"});
  assert.equal(await E.shift(a), null);
});

test("a dialog's radio buttons read as the one that is checked (Learn a Gift)", async () => {
  const P = await import(join(root, "modules/wodx-actions/scripts/profiles.js"));
  const el = document.createElement("form");
  el.innerHTML = `<input type="radio" name="gift" value="a"><input type="radio" name="gift" value="b" checked><input type="radio" name="gift" value="c" disabled>`;
  assert.equal(P.readForm(el).gift, "b");
  const PC = await import(join(root, "modules/wodx-combat/scripts/profiles.js"));
  assert.equal(PC.readForm(el).gift, "b");
});

test("losing the wolf: no Rage and no Willpower leaves only the breed form", async () => {
  reset();
  const a = garou("Lost", {rage: [0, 3], wp: [0, 4], form: "crinos"});
  forms.push({form: "hispo", how: "roll"});
  const r = await E.shift(a);
  assert.equal(r, null);
  assert.match(notes[0], /lost the wolf/);
  forms.push({how: "breed"});
  await E.shift(a);
  assert.equal(GX.info(a).form, "homid");
});

test("a Rage roll that frenzies offers resist, berserk and fox; berserk sets the frenzy and Crinos", async () => {
  reset();
  const a = garou("Angry", {rage: [5, 5], gnosis: [2, 2]});
  rolls.push(4);
  forms.push({reason: "insulted"});
  await E.rageRoll(a);
  const card = posts.at(-1);
  assert.match(card.body, /data-garou="resist"/);
  assert.match(card.body, /data-garou="fox"/);
  assert.equal(card.data.garou, "rage", "flagged so the buttons bind");
  await E.enterFrenzy(a, "berserk");
  assert.equal(a.system.conditions.isfrenzy, true);
  assert.equal(GX.info(a).form, "crinos");
  assert.match(posts.at(-1).body, /attacks anything that moves/, "Rage above Gnosis: packmates too");
  assert.deepEqual(conditionsSet.at(-1), ["Angry", "frenzy", true]);
  // End it: Willpower against permanent Rage
  rolls.push(1);
  forms.push({});
  await E.endFrenzy(a);
  assert.equal(a.system.conditions.isfrenzy, false);
  // Six successes: the Thrall, no resist button
  rolls.push(6);
  forms.push({});
  await E.rageRoll(a);
  assert.match(posts.at(-1).body, /Thrall of the Wyrm/);
  assert.doesNotMatch(posts.at(-1).body, /data-garou="resist"/);
});

test("spending Rage for actions: the cap holds and the Dark Ages penalty is noted", async () => {
  reset();
  const a = garou("Fast", {rage: [5, 5], attrs: {dexterity: 2, wits: 4}});
  forms.push({use: "actions", pts: 4});
  assert.equal(await E.spendRage(a), null);
  assert.match(notes[0], /At most 3/);
  forms.push({use: "actions", pts: 3});
  await E.spendRage(a);
  assert.equal(a.system.advantages.rage.temporary, 2);
  assert.match(posts.at(-1).body, /\+3 difficulty/);
});

test("nightfall gives moon Rage once a night: all of it under the auspice's moon; Fera with their own rules are left alone (B40)", async () => {
  reset();
  const cal = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
  const lat = game.settings.get("wodx-chronicle", "latitude");
  let t = game.time.worldTime;
  for ( let i = 0; i < 24 * 60; i++, t += 3600 ) { const d = cal.describeTime(t, lat); if ( d.isNight && d.moon.index === 4 ) break; }
  const ah = garou("Ahroun", {auspice: "Ahroun", rage: [1, 5]});
  const rg = garou("Ragabash", {auspice: "Ragabash", rage: [1, 5]});
  const cat = garou("Cat", {changingbreed: "Bastet", rage: [1, 5]});
  const coy = garou("Coyote", {changingbreed: "Nuwisha", rage: [0, 0]});
  const npc = garou("Unseen", {rage: [1, 5], player: false});
  const blank = garou("Blank template", {rage: [0, 0], wp: [0, 0]});
  game.scenes.active.tokens = [{actor: blank}];
  for ( const a of [ah, rg, cat, coy, npc] ) game.actors.set(a.id, a);
  await game.time.set(t);
  await E.moonRise();
  assert.equal(ah.system.advantages.rage.temporary, 5, "Ahroun under the full moon: all");
  assert.equal(rg.system.advantages.rage.temporary, 5, "full moon: +4");
  assert.equal(cat.system.advantages.rage.temporary, 1, "Bastet regain Rage at sunset by their own rule");
  assert.equal(npc.system.advantages.rage.temporary, 1, "not on the scene and nobody's character");
  const card = chats.find(c => /Moonrise/.test(c.content));
  assert.doesNotMatch(card.content, /Blank template/, "a sheet with no Rage set up is left out");
  assert.ok(card?.whisper?.length, "whispered to the GM");
  rg.system.advantages.rage.temporary = 1;
  await game.time.advance(600);
  await E.moonRise();
  assert.equal(rg.system.advantages.rage.temporary, 1, "once a night");
  for ( const a of [ah, rg, cat, coy, npc] ) game.actors.delete(a.id);
});

test("learning a Gift: filtered by Rank, cost by breed, auspice and tribe; using it pays and times the effect", async () => {
  reset();
  const a = garou("Learner", {breed: "Homid", auspice: "Ahroun", tribe: "Fenrir", gnosis: [3, 3]});
  const own = L.gifts.find(g => g.l === 1 && g.g.includes("ahroun") && /g1/.test(g.c ?? "") && g.t === "scene") ?? L.gifts.find(g => g.l === 1 && g.g.includes("ahroun"));
  const high = L.gifts.find(g => g.l === 3);
  forms.push((el, fd) => {
    assert.ok(el.querySelector(`input[value="${high.id}"]`).disabled, "level 3 at Rank 1: not yet");
    assert.ok(el.querySelector("input[type=search], .wodx-search, [data-search]"), "the list has a search box (B24)");
    return {...fd, gift: own.id, xp: false};
  });
  await E.learnGift(a);
  const item = a.items.find(i => i.flags?.["wodx-actions"]?.gift === own.id);
  assert.ok(item);
  assert.equal(item.type, "Power");
  assert.equal(item.system.type, "wod.types.gift");
  assert.equal(item.system.level, own.l);
  assert.match(posts.at(-1).body, new RegExp(`DA:W p\\. ${own.p}`));
  const before = a.system.advantages.gnosis.temporary;
  const cost = G.giftCost(own.c);
  if ( own.r ) rolls.push(2);
  forms.push({gift: item.id, extra: 0, bonus: 0});
  await E.useGift(a);
  assert.equal(a.system.advantages.gnosis.temporary, before - cost.gnosis);
  if ( G.giftDuration(own.t, 2) ) assert.equal(timed.at(-1).name, item.name);
});

test("Renown: an award breaks dots on a loss, logs it, and says when Rank is due", async () => {
  reset();
  game.journal.clear?.();
  const a = garou("Famous", {auspice: "Ahroun", renown: {glory: 3, honor: 1, wisdom: 0}});
  a.system.renown.glory.temporary = 2;
  const lines = await E.applyRenown([a], {glory: 3, honor: -1}, "the bridge at Wendt");
  assert.equal(a.system.renown.glory.temporary, 5);
  assert.equal(a.system.renown.honor.permanent, 0);
  assert.equal(a.system.renown.honor.temporary, 9);
  assert.match(lines[0], /breaks into 10/);
  assert.ok(game.journal.find(j => j.name === "WoDX Renown"));
  a.system.renown.glory.permanent = 4; a.system.renown.honor.permanent = 1;
  const l2 = await E.applyRenown([a], {wisdom: 1});
  assert.match(l2[0], /Rank 2/);
});

test("a Battle Scar is a Feature with its Glory", async () => {
  reset();
  const a = garou("Scarred");
  forms.push({scar: "3", notes: ""});
  await E.battleScar(a);
  const it = a.items.find(i => i.flags?.["wodx-actions"]?.battleScar);
  assert.equal(it.name, "Battle Scar: Missing eye");
  assert.equal(a.system.renown.glory.temporary, 2);
});

test("the Delirium: whispered, by Willpower; Kinfolk and the supernatural are spared", async () => {
  reset();
  const w = [mortal("Miller", 6), mortal("Kin", 2, {kinfolk: "fenrir"}), garou("Other Wolf")];
  game.user.targets = new Set(w.map(a => ({actor: a})));
  forms.push({occult: false, ratkin: false});
  await E.deliriumCheck();
  const c = chats.at(-1).content;
  assert.match(c, /Miller.*rationalizes/);
  assert.match(c, /Kin<\/b>: Kinfolk, untouched/);
  assert.match(c, /Other Wolf<\/b>: not human/);
  assert.ok(chats.at(-1).whisper.length);
  game.user.targets = new Set();
});

test("regeneration each round: bashing heals; a homid in Homid does not; lethal needs Stamina (8)", async () => {
  reset();
  const a = garou("Healer", {form: "crinos"}); a.system.health.damage = {bashing: 2, lethal: 1, aggravated: 1};
  const h = garou("Human-shaped", {form: "homid"}); h.system.health.damage.bashing = 2;
  const combat = {round: 2, combatants: [{actor: a}, {actor: h}]};
  rolls.push(0);
  await E.regenRound(combat);
  assert.deepEqual(heals, [], "the lethal roll failed and the homid doesn't regenerate");
  rolls.push(1);
  await E.regenRound(combat);
  assert.deepEqual(heals, [["Healer", "lethal", 1]]);
  await E.regenRound(combat);
  assert.deepEqual(heals.at(-1), ["Healer", "bashing", 1]);
  assert.equal(a.system.health.damage.aggravated, 1, "aggravated never regenerates");
});

test("Dark Ages Embrace Pain: the first wound of a fight gives a Rage point, once", async () => {
  reset();
  const a = garou("Pained", {rage: [2, 5]});
  game.combat = {id: "c1", started: true, round: 1};
  assert.equal(await E.embracePain(a, {bashing: 0}, {bashing: 1}), true);
  assert.equal(a.system.advantages.rage.temporary, 3);
  assert.equal(await E.embracePain(a, {bashing: 1}, {bashing: 2}), false, "once a fight");
  ERA = "renaissance";
  const b = garou("W20", {rage: [2, 5]});
  assert.equal(await E.embracePain(b, {bashing: 0}, {bashing: 1}), false, "W20 has no such rule");
  ERA = "dark-ages"; game.combat = null;
});

test("rites roll by kind; a talen is marked spent, never deleted", async () => {
  reset();
  const a = garou("Ritemaster", {rank: 2, gnosis: [3, 3]});
  rolls.push(2);
  forms.push({rite: "", type: "death", level: 1, people: 1, caern: 0, advance: false});
  await E.performRite(a);
  assert.match(posts.at(-1).body, /difficulty 6/);
  assert.match(posts.at(-1).body, /takes/);
  const [tal] = await a.createEmbeddedDocuments("Item", [{name: "Bane Arrow", type: "Fetish", system: {gnosis: 5}, flags: {}}]);
  rolls.push(1);
  forms.push({item: tal.id, how: "activate", talen: true});
  await E.useFetish(a);
  assert.equal(tal.flags["wodx-actions"].spent, true);
  assert.equal(a.deleted ?? 0, 0);
});

test("every menu entry for the lupine profile names a real API function", async () => {
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/profile-menus.js"), "utf8");
  const block = src.slice(src.indexOf("lupine: {"), src.indexOf("mage: {"));
  const apis = [...block.matchAll(/"api:(\w+)"/g)].map(m => m[1]);
  const main = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  const apiBlock = main.slice(main.indexOf("const API = {"), main.indexOf("let OFF"));
  for ( const k of apis ) assert.match(apiBlock, new RegExp(`\\b${k}\\b`), k);
});

test("for WoDX Combat: teeth and claws by form and era, silver by breed and form, no aggravated soak in Homid (Dark Ages)", async () => {
  ERA = "dark-ages";
  const a = garou("Fighter", {form: "glabro"});
  assert.deepEqual([GX.naturalWeapons(a).bite, GX.naturalWeapons(a).claw], ["lethal", null], "DA:W: Glabro bites lethal, no claws");
  a.system.shapes.glabro.isactive = false; a.system.shapes.hispo.isactive = true;
  assert.equal(GX.naturalWeapons(a).biteBonus, 1);
  assert.equal(GX.naturalWeapons(a).claw, "aggravated");
  assert.equal(GX.baneFor(a, "silver").type, "aggravated");
  a.system.shapes.hispo.isactive = false; a.system.shapes.homid.isactive = true;
  assert.equal(GX.baneFor(a, "silver").soakDiff, 6, "breed form: soak at 6");
  assert.equal(GX.aggSoak(a), false);
  ERA = "renaissance";
  assert.equal(GX.aggSoak(a), true, "W20: every form");
  assert.equal(GX.baneFor(a, "silver").bane, false);
  ERA = "dark-ages";
  const corax = garou("Raven", {changingbreed: "Corax"});
  assert.deepEqual(GX.banesOf(corax), ["gold"]);
  const R = await import(join(root, "modules/wodx-combat/scripts/rules.js"));
  const sp = R.soakPool({profile: "lupine", damageType: "aggravated", stamina: 3, aggSoak: false});
  assert.equal(sp.dice, 0);
  assert.match(sp.notes.join(" "), /DA:W p\. 102/);
  assert.equal(R.soakPool({profile: "lupine", damageType: "aggravated", stamina: 3}).dice, 3);
});
