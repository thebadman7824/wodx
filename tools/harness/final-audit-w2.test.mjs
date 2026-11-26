import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/*
 * Final systems audit, worker w2 (B6730-B6739): WoDX Actions powers that wrote what nothing read.
 *   B6730  a plain Charge or Drain on a sheet with no Quintessence moves the line's own pool, not a Quintessence field
 *   B6731  a Wraith Arcanos with no roll still puts its keywords on the effects card
 *   B6732  a Ward from a power stands against a weapon blow's soak, not only a power's harm
 *   B6737  a woken fetish or a used talen puts its keywords on the effects card
 *   B6739  a Dark Ages cantrip's or fae treasure's timed result carries its keyword, so power-mods files it
 *   B6738  Summon Wisp, Malady, Corrupt Body and A Taste for Blood do what their pages say on the effects card
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

globalThis.game ??= {modules: new Map(), settings: {get() { throw new Error("not registered"); }}, user: {isGM: true, targets: new Set()}, users: {filter: () => []}};
globalThis.ui ??= {notifications: {warn() {}, info() {}}};
globalThis.Hooks ??= {callAll() {}, on() {}, off() {}, once() {}};

const E = await imp("modules/wodx-rules/actions/effects-rules.js");
const EF = await imp("modules/wodx-actions/scripts/effects.js");
const PW = await imp("modules/wodx-actions/scripts/power-effects.js");
const PK = await imp("modules/wodx-actions/scripts/power-keywords.js");

const sheet = (type, system = {}) => ({type, name: type, flags: {}, items: [], system});
const quint = () => E.outcome("charge", {ok: true, strength: 3, duration: 0}, {});
const drain = () => E.outcome("charge", {ok: true, strength: 3, duration: 0}, {drain: true});

test("B6730: a Charge on a mage stays Quintessence", () => {
  const mage = sheet("Mage", {quintessence: {temporary: 2}});
  const o = quint();
  assert.equal(o.kind, "quint");
  assert.equal(EF.chargeOut(mage, o), o);
});

test("B6730: a Charge on a vampire, werewolf, wraith or Kuei-jin moves that line's pool, named on the card", () => {
  const cases = [
    [sheet("Vampire", {advantages: {bloodpool: {temporary: 5}}}), "blood", "system.advantages.bloodpool.temporary"],
    [sheet("Werewolf", {advantages: {gnosis: {temporary: 2, permanent: 5}}}), "gnosis", "system.advantages.gnosis.temporary"],
    [sheet("Wraith", {advantages: {pathos: {temporary: 3}}}), "pathos", "system.advantages.pathos.temporary"],
    [sheet("Vampire", {settings: {variant: "kindredeast"}, advantages: {yangchi: {temporary: 2}}}), "yangchi", "system.advantages.yangchi.temporary"],
    [sheet("Mortal", {}), "willpower", "system.advantages.willpower.temporary"]
  ];
  for ( const [a, pool, path] of cases ) {
    const o = EF.chargeOut(a, quint());
    assert.equal(o.kind, "pool", a.type);
    assert.equal(o.pool, pool, a.type);
    assert.equal(E.poolOf(o.pool).path, path);
    assert.doesNotMatch(o.text, /Quintessence/);
    assert.ok(o.points > 0);
  }
  const d = EF.chargeOut(cases[0][0], drain());
  assert.ok(d.points < 0 && /blood drawn out/.test(d.text));
});

test("B6730: the apply step sends a non-mage's Charge to the pool, and the read guard names the reader", () => {
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /case "quint": \{\s*\/\/ B6730[^\n]*\n\s*const co = chargeOut\(a, o\);/);
  assert.match(src("tools/powers/read-rules.mjs"), /chargeOut\(a,/);
});

test("B6731: a Wraith Arcanos with no roll gets its keywords on the effects card", () => {
  const w = src("modules/wodx-actions/scripts/wraith.js");
  assert.doesNotMatch(w, /if \(a\.r && successes > 0 && EF\.isOn\(\)\)/, "the effects card is no longer only for rolled arts");
  assert.match(w, /noRoll: !a\.r/);
  // Sever Strand (Lifeweb, no roll): its Harm readies the user, as a Discipline with no roll does (B3751)
  const kw = PW.powerKeywords("wraith", Object.entries(PK.LINE_KEYWORDS.wraith ?? {}).find(([, e]) => e.n === "Sever Strand")?.[0] ?? "", "Sever Strand", "wraith");
  if ( kw ) {
    const {results} = PW.powerOutcomes(kw, 1, {label: "Sever Strand", noRoll: true});
    assert.ok(results.length > 0);
  }
});

test("B6732: WoDX Combat's blow soak reads a power's Ward", () => {
  const c = src("modules/wodx-combat/scripts/main.js");
  const body = c.slice(c.indexOf("function soakPoolFor("), c.indexOf("function tokenDistance("));
  assert.match(body, /powerModsOf\(target, \{ soak: true, harm: \{ type: dp\.dmgType/);
  assert.match(body, /\+ num\(pw\.dice\)/);
});

test("B6734: a wraith whose Shadow won Catharsis has each move go to the Storyteller", async () => {
  const B = await imp("modules/wodx-actions/scripts/binds.js");
  const held = B.bindingsOn({effects: [], flags: {"wodx-actions": {shadowDominant: true}}});
  assert.equal(held.length, 1);
  assert.equal(held[0].rule, "ask");
  assert.equal(B.judgeMove(held, {from: {x: 0, y: 0}, to: {x: 100, y: 0}}).ask, true);
  assert.deepEqual(B.bindingsOn({effects: [], flags: {"wodx-actions": {shadowDominant: null}}}), []);
});

test("B6737: a woken fetish puts its keywords on the effects card", async () => {
  const PW = await imp("modules/wodx-actions/scripts/power-effects.js");
  const PK = await imp("modules/wodx-actions/scripts/power-keywords.js");
  const {KEYWORDS} = await imp("modules/wodx-rules/actions/effects-rules.js");
  const lib = await imp("modules/wodx-library/data/wonders.mjs");
  const all = Object.values(lib).find(v => Array.isArray(v) && v[0]?.key);
  const keys = new Set(all.filter(w => w.line === "garou").map(w => w.key));
  for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.fetish) ) {
    assert.ok(keys.has(id), `${id} is a Garou wonder`);
    assert.ok(e.k.every(k => KEYWORDS[String(k).split(":")[0]]), `${id} uses known keywords`);
  }
  const ward = PW.powerOutcomes(PW.powerKeywords("fetish", "wyrmflesh"), 3, {label: "Wyrmflesh"}).results;
  assert.deepEqual(ward.map(r => [r.key, r.who, r.out.kind]), [["ward", "self", "timed"]]);
  const calm = PW.powerOutcomes(PW.powerKeywords("fetish", "harmony-flute"), 1, {}).results;
  assert.deepEqual(calm.map(r => [r.key, r.out.name]), [["fear", "Calmed"]]);
  const g = src("modules/wodx-actions/scripts/garou.js");
  const body = g.slice(g.indexOf("async function useFetish("), g.indexOf("Renown, Rank, Battle Scars"));
  assert.match(body, /EF\.powerPlan\(actor, \{ set: "fetish", id: wk/);
  assert.match(body, /kind: "effects", caster: actor\.name, items: fxItems/);
  // an NPC power is not read by a fetish's name
  assert.match(src("modules/wodx-actions/scripts/main.js"), /Object\.keys\(PK\.LINE_KEYWORDS\)\.filter\(s => s !== "fetish"\)/);
});

test("B6738: four Dark Ages path powers that were card only now apply", async () => {
  const PE = await imp("modules/wodx-actions/scripts/path-effects.js");
  const of = (id, s) => PE.pathOutcomes({id, n: id, p: 300}, s);
  const wisp = of("necromancy-the-path-of-haunting-summon-wisp", 2);
  assert.deepEqual(wisp.map(r => [r.key, r.out.kind]), [["light", "light"], ["fortune", "timed"]]);
  assert.equal(wisp[1].out.shift, 1);
  const mal = of("thaumaturgy-potestas-exsecrabilis-malady", 5)[0];
  assert.deepEqual([mal.key, mal.who, mal.out.dice, mal.out.on], ["boost", "one", -3, "physical"]);
  const cb1 = of("thaumaturgy-potestas-exsecrabilis-corrupt-body", 1)[0], cb3 = of("thaumaturgy-potestas-exsecrabilis-corrupt-body", 3)[0];
  assert.deepEqual([cb1.out.dice, cb1.out.on, cb1.out.duration, cb3.out.duration], [-1, "all", "one night", "one month"]);
  const t = of("thaumaturgy-potestas-vitae-a-taste-for-blood", 1)[0];
  assert.equal(t.key, "know");
  for ( const r of [...wisp, mal, cb1, t] ) assert.ok(!r.st, `${r.key} is not left to the Storyteller`);
});

test("B6739: a cantrip's timed result carries its keyword where power-mods reads it", async () => {
  const C = await imp("modules/wodx-actions/scripts/fae-da-cantrips.js");
  const PM = await imp("modules/wodx-actions/scripts/power-mods.js");
  const [r] = C.presetResults("rain-strike", 3);
  assert.equal(r.out.key, "boost");
  assert.equal(PM.keyFor(r.out), "wodx-effect-boost");
  assert.deepEqual(PM.timedData(r.out), {dice: -3, on: "all"});
  const D = await imp("modules/wodx-actions/scripts/mage-da-effects.js");
  const chain = D.outcomesOf([D.T("light", "L", "scene", "self"), D.T("fortune", "F", "scene", "one", {curse: true})], {label: "x"}, 2, "");
  assert.deepEqual(chain.map(x => x.out.key), ["light", "fortune"]);
});

/* Second pass (B6850-B6869): nothing only tells. */
test("B6850: a standing, scoped Blessing eases only its rolls, is not spent, and keeps its own key", async () => {
  const PM = await imp("modules/wodx-actions/scripts/power-mods.js");
  const out = {key: "fortune", name: "Lordly Mien", shift: -2, tags: ["charisma", "manipulation"], once: false};
  const key = PM.keyFor(out), data = PM.timedData(out);
  assert.notEqual(key, PM.KEYS.fortune);
  assert.deepEqual(data, {shift: -2, once: false, tags: ["charisma", "manipulation"]});
  const fx = [{id: "a", name: "Lordly Mien", key, data}];
  assert.deepEqual([PM.modsFrom(fx, {tags: ["social", "charisma"]}).diff, PM.modsFrom(fx, {tags: ["physical", "strength"]}).diff], [-2, 0]);
  assert.deepEqual(PM.modsFrom(fx, {tags: ["charisma"]}).once, []);
  // a shift on attacks against the bearer stays off the bearer's own rolls
  const df = [{id: "b", name: "Mirage", key: PM.keyFor({key: "fortune", name: "Mirage", tags: ["defend-ranged"]}), data: {shift: 2, once: false, tags: ["defend-ranged"]}}];
  assert.equal(PM.modsFrom(df, {tags: ["ranged", "dexterity"]}).diff, 0);
  assert.deepEqual([PM.defendFrom(df, {ranged: true}).diff, PM.defendFrom(df, {ranged: false}).diff], [2, 0]);
  assert.match(src("modules/wodx-combat/scripts/main.js"), /powerMods\?\.defend\?\.\(target, \{ ranged: !!w\.ranged \}\)/);
});

test("B6851: the apocalyptic form's powers go on the effects card and its claws on the sheet", async () => {
  const DE = await imp("modules/wodx-actions/scripts/demon-evocations.js");
  const r = DE.formResults(["Lordly Mien", "Immune to Fire", "Night Sight", "Casts No Reflection"], "Bel");
  assert.deepEqual(r.map(x => [x.key, x.out.kind]), [["fortune", "timed"], ["ward", "timed"], ["sight", "timed"]]);
  assert.deepEqual([r[1].out.dice, r[1].out.against], [10, "fire"]);
  const w = DE.formWeapons(["Claws", "Wings"]);
  assert.equal(w.length, 1);
  assert.deepEqual([w[0].type, w[0].system.damage.bonus, w[0].system.damage.type], ["Melee Weapon", 2, "aggravated"]);
  for ( const nm of Object.keys(DE.FORM_POWERS) ) {
    const base = nm.split("@")[0], fp = DE.FORM_POWERS[nm];
    assert.ok(fp.attrs || fp.init || fp.armor || DE.FORM_SPECS[base] || DE.FORM_SPECS[nm] || DE.FORM_WEAPONS[base] || DE.FORM_STORY[base], `${nm} applies or says why not`);
  }
  const d = src("modules/wodx-actions/scripts/demon.js");
  assert.match(d, /DE\.formResults\(tot\.names, i\.visage\)/);
  assert.match(d, /weaponIds/);
});

test("B6852: the evocations that were card or Storyteller only now apply", async () => {
  const DE = await imp("modules/wodx-actions/scripts/demon-evocations.js");
  const D = await imp("modules/wodx-rules/actions/demon-rules.js");
  const WE = await imp("modules/wodx-actions/scripts/world-effects.js");
  for ( const [id, l] of Object.entries(D.LORES) ) for ( const [k, e] of (l.evo ?? []).entries() ) {
    const res = DE.evocationResults(id, k + 1, 3, {faith: 3, name: e.name});
    const world = WE.worldResults({name: e.name, line: "Demon (DtF)"}, 3);
    assert.ok(res.some(x => !x.st || x.key === "summon") || world.length, `${e.name} does something`); // planOf makes a summoning of any summon result
  }
});

test("B6853: a passive power picked from the menu turns on", async () => {
  const PW = await imp("modules/wodx-actions/scripts/power-effects.js");
  const r = PW.powerOutcomes({keywords: ["ward"], passive: true}, 0, {label: "Survivor"}).results;
  assert.deepEqual(r.map(x => [x.key, x.who]), [["ward", "self"]]);
  assert.doesNotMatch(src("modules/wodx-actions/scripts/kindred.js"), /if \(!fx && !p\.passive && successes > 0/);
});

test("B6854: a spell that tells the caster something gives the Know, Sense or Speak result", async () => {
  const D = await imp("modules/wodx-actions/scripts/mage-da-effects.js");
  const [r] = D.outcomesOf({kw: "know", kind: "note", who: "self"}, {label: "Gate Know"}, 3, "a secret");
  assert.notEqual(r.out.kind, "note");
  assert.equal(r.st, undefined);
});

test("B6855: the Dark Ages paths and Disciplines that only told now apply, or say why not", async () => {
  const PE = await imp("modules/wodx-actions/scripts/path-effects.js");
  const disc = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/disciplines-daw.json"), "utf8")).powers;
  const by = id => disc.find(p => p.id.endsWith(id));
  assert.deepEqual(PE.pathOutcomes(by("theft-of-vitae"), 3).map(o => [o.who, o.out.pool]), [["self", "blood"], ["one", "blood"]]);
  assert.equal(PE.pathOutcomes(by("valeren-warrior-song-of-the-blooded"), 2)[0].out.kind, "timed");
  for ( const id of Object.keys(PE.PATH_STORY) ) assert.ok(disc.some(p => p.id === id) && /p\. \d+/.test(PE.PATH_STORY[id]), id);
  assert.match(src("modules/wodx-actions/scripts/kindred.js"), /PE\.isPath\(p\.d\) \|\| PE\.PATH_EFFECTS\[p\.id\]/);
});

test("B6856: a Storyteller's spec that names a working keyword gives that keyword's result", async () => {
  const D = await imp("modules/wodx-actions/scripts/mage-da-effects.js");
  const [m] = D.outcomesOf({kw: "move", kind: "st"}, {label: "Gate Move"}, 2, "away");
  assert.equal(m.out.kind, "move");
  const [b] = D.outcomesOf({kw: "bind", kind: "st"}, {label: "Gate Bind"}, 2, "held");
  assert.equal(b.who, "one");
  const [f] = D.outcomesOf({kw: "free", kind: "st"}, {label: "Gate Free"}, 2, "anything");
  assert.equal(f.st, true);
});

test("B6857: Dark Ages rotes and cantrips, Kuei-jin arts, Orpheus Horrors and Totem Gift that only told now apply, or say why not", async () => {
  const M = await imp("modules/wodx-rules/actions/mage-da-rules.js");
  const D = await imp("modules/wodx-actions/scripts/mage-da-effects.js");
  const rote = id => D.daOutcomes(M.ROTES.find(r => r.id === id), 3)[0];
  assert.equal(rote("g-slumber").out.condition, "incapacitated");
  assert.equal(rote("g-horsebringer").out.kind, "summon");
  for ( const id of Object.keys(D.DA_STORY) ) assert.ok(M.ROTES.some(r => r.id === id) && /p\. \d+/.test(D.DA_STORY[id]), id);
  const DC = await imp("modules/wodx-actions/scripts/fae-da-cantrips.js");
  const [h] = DC.presetResults("hush", 2);
  assert.deepEqual([h.out.kind, h.out.tags, h.out.once, h.out.duration], ["timed", ["voice"], false, "2 hours"]);
  for ( const id of Object.keys(DC.CANTRIP_STORY) ) assert.ok(DC.CANTRIPS[id], id);
  const KA = await imp("modules/wodx-actions/scripts/kote-arts.js");
  const art = name => KA.artResults(KA.POWERS.find(p => p.name === name).id, 3);
  assert.deepEqual(art("Master Flow").map(r => [r.out.pool, r.out.points]), [["yangchi", 3], ["yinchi", -3]]);
  assert.deepEqual(art("Meditation of the still blood").map(r => [r.out.pool, r.out.points]), [["willpower", 2]]);
  assert.equal(art("Semblance of the Ebon Dragon")[0].out.kind, "cross");
  const OH = await imp("modules/wodx-actions/scripts/orpheus-horrors.js");
  assert.equal(OH.horrorResults("inhabit", 3, 2, {name: "Inhabit"})[0].out.kind, "timed");
  const PK = await imp("modules/wodx-actions/scripts/power-keywords.js");
  assert.deepEqual(PK.keywordsOf("gift", "totem-gift").keywords, ["summon"]);
  const SS = await imp("modules/wodx-actions/scripts/summon-specs.js");
  for ( const k of ["werewolf-dark-ages|totem-gift", "mage-dark-ages|horse-bringer", "kuei-jin-kote|cleave-the-demon"] ) assert.ok(SS.SPECS[k], k);
});

test("B6858: hedge magic, Numina, True Faith, Changing Breeds Gifts and pact gifts that only told now apply, or say why not", async () => {
  const PE = await imp("modules/wodx-actions/scripts/path-effects.js");
  const H = await imp("modules/wodx-rules/actions/hunter-rules.js");
  const c5 = PE.numinaOutcomes("curses", 5, 4, H.NUMINA.curses);
  assert.deepEqual(c5.map(o => [o.key, o.out.shift ?? o.out.dice, o.out.duration]), [["fortune", 4, "one week"], ["boost", -2, "one week"]]);
  assert.equal(PE.numinaOutcomes("healing", 2, 3, H.NUMINA.healing)[0].out.painless, true);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /system\.conditions\.isignoringpain/);
  assert.equal(PE.numinaOutcomes("cyberkinesis", 2, 3, H.NUMINA.cyberkinesis)[0].out.kind, "work");
  assert.ok(PE.NUMINA_STORY["healing:3"]);
  for ( const k of ["alchemy", "conjuration", "divination", "enchantment", "mana", "oneiromancy"] )
    assert.ok(H.sorceryResults(k, {top: 2, successes: 2, need: 1, rating: 2}).every(r => r.out.kind !== "note"), k);
  assert.deepEqual(H.faithPresence("da20", 5).map(r => [r.key, r.out.difficulty ?? null]), [["sense", null], ["fear", 9]]);
  assert.deepEqual([H.faithStops("da20", 3, "sway"), H.faithStops("da20", 3, "fear"), H.faithStops("da20", 4, "fear"), H.faithStops("hh2", 3, "fear"), H.faithStops("hh2", 2, "sway")], [true, false, true, true, false]);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /faithShields\(a, o\.key\)/);
  const fera = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/gifts-fera.json"), "utf8")).gifts;
  const read = ["ghost-caress", "skys-beneficence", "mynahs-touch", "waken", "umekochis-mouth", "blessings-of-the-nest", "emperors-clothes", "hyperattenuation", "gulp", "enter-seas-soul", "hathors-blessing", "uproot"];
  for ( const g of fera.filter(g => read.includes(g.kw)) ) assert.ok(/W20 CB p\. \d+/.test(g.story ?? "") || (g.spec.kw !== "free" && g.spec.kind === "st"), `${g.n} applies or says why not`);
  const D = await imp("modules/wodx-rules/actions/demon-rules.js");
  for ( const g of D.GIFTS ) assert.ok(g.k === "offering" || /p\. 253/.test(g.story), g.k);
});
