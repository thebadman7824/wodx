import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The named Artifacts of Wraith 20th pp. 425-431 on the crafting table, with powers that do something (B6100-B6109) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
await imp("modules/wodx-library/scripts/wonder-lines.mjs");
const Reg = await imp("modules/wodx-library/scripts/wonder-registry.mjs");
const D = await imp("modules/wodx-library/data/wonders-wraith.mjs");
const P = await imp("modules/wodx-library/scripts/wonder-powers.mjs");
const SR = await imp("modules/wodx-paperdoll/scripts/sprite-rules.mjs");
const AR = await imp("modules/wodx-creation/scripts/advance-rules.mjs");
const K = Reg.kitFor("wraith");

const sheet = (o = {}) => ({system: {advantages: {pathos: {temporary: 9}, angst: {temporary: 7}, corpus: {temporary: 10, max: 10}, willpower: {permanent: 5}},
  attributes: {dexterity: {value: 3}}, abilities: {crafts: {value: 3}}, settings: {variant: ""}}, items: [], ...o});
const maker = (ctx = {}, s = sheet()) => K.makerOf(K.factsFrom(s, {profile: "wraith", year: 1700, ...ctx}));
const spectre = (ctx = {}) => K.makerOf(K.factsFrom(sheet({system: {...sheet().system, settings: {variant: "Spectre"}}}), {profile: "spirit", year: 1700, ...ctx}));

test("every named Artifact has a page, a level, a summary in WoDX's words and at least one power", () => {
  assert.ok(D.ROWS.length >= 20);
  const keys = new Set();
  for ( const r of D.ROWS ) {
    assert.ok(!keys.has(r.key), r.key); keys.add(r.key);
    assert.ok(r.level >= 1 && r.level <= 5, r.key);
    assert.ok(r.page >= 425 && r.page <= 431 && r.pdf === r.page + 65, r.key);
    assert.ok(["forge", "skin", "spectre", "relic"].includes(r.kind), r.key);
    assert.ok(r.does.length > 40 && !/—/.test(r.does), r.key);
    assert.doesNotMatch(r.does, /\b(he|she|him|her|his|hers|himself|herself)\b/i, r.key);
    const powers = r.flag?.powers ?? [];
    assert.ok(powers.length >= 1, r.key);
    for ( const p of powers ) {
      assert.ok(p.id && p.label, `${r.key} ${p.id}`);
      if ( p.look ) assert.ok(SR.fxOk(p.look.fx), `${r.key} ${p.id} look ${p.look.fx}`);
      // each power changes a number, a token, the map or shows a look: nothing only says
      assert.ok(p.spend || p.transfer || p.gain || p.costs || p.roll || p.look || p.token || p.place || p.renew || p.consume || p.drawback, `${r.key} ${p.id} does nothing`);
    }
  }
  // the three kinds the book names are all there
  for ( const k of ["forge", "skin", "spectre"] ) assert.ok(D.ROWS.some(r => r.kind === k), k);
});

test("who may make what: wraiths the forge and Skin rows, Spectres all of them; the eMap waits for the Electron Highway", () => {
  const w = maker(), s = spectre();
  assert.equal(w.kind, "wraith");
  assert.equal(s.kind, "spectre");
  const wl = K.listFor(w).map(r => r.key), sl = K.listFor(s).map(r => r.key);
  assert.ok(wl.includes("soulfire-lantern") && wl.includes("guardian-orb") && !wl.includes("bean-nighe-caul"));
  assert.ok(sl.includes("bean-nighe-caul") && sl.includes("soulfire-lantern"));
  assert.ok(K.blockers(K.row("bean-nighe-caul"), w, {}).some(x => /Spectres/.test(x)));
  assert.deepEqual(K.blockers(K.row("bean-nighe-caul"), s, {}), []);
  assert.ok(K.blockers(K.row("emap"), w, {}).some(x => /1970/.test(x)));
  assert.deepEqual(K.blockers(K.row("emap"), maker({year: 1995}), {}), []);
  assert.ok(K.cautions(K.row("bloodwebs"), w).some(x => /plasmic/.test(x)));
  assert.equal(K.listFor(K.makerOf({profile: "mage"})).length, 0);
});

test("the forge's goal follows the level, and a Spectre feeds the soulfire with Angst", () => {
  for ( const lv of [1, 2, 3, 4, 5] ) assert.equal(D.goalFor(lv), 2 + 2 * lv);
  const t1 = K.taskFor(K.row("bell-of-summoning"), maker(), {}), t5 = K.taskFor(K.row("fetterguard"), maker(), {});
  assert.deepEqual([t1.goal, t5.goal], [4, 12]);
  assert.ok(t5.spend > t1.spend);
  assert.ok(K.blockers(K.row("fetterguard"), maker({}, sheet({system: {...sheet().system, advantages: {...sheet().system.advantages, pathos: {temporary: 2}}}})), {}).some(x => /Pathos/.test(x)));
  const ts = K.taskFor(K.row("forgebait"), spectre(), {});
  assert.equal(ts.opts.fuel, D.ANGST);
  const paid = Reg.applyCosts(K.costs(K.row("forgebait"), ts), {[D.ANGST]: 7, [D.PATHOS]: 9});
  assert.equal(paid.updates[D.ANGST], 7 - ts.spend);
  assert.equal(paid.updates[D.PATHOS], undefined);
  assert.match(K.label(K.row("guardian-orb")), /level 5 Skin Artifact/);
});

test("a finished Artifact is a real item: powers, pool, weapon and armor numbers", () => {
  const [lantern] = K.itemsFor(K.row("soulfire-lantern"), {maker: "Ilse", at: 9});
  const f = lantern.flags["wodx-library"].wonder;
  assert.deepEqual([lantern.type, f.key, f.line, f.pool.value, f.pool.max], ["Item", "soulfire-lantern", "wraith", 10, 10]);
  assert.match(lantern.system.description, /Ilse/);
  assert.match(f.ref, /p\. 427, pdf 492/);
  const chains = K.itemsFor(K.row("living-chains"));
  assert.deepEqual(chains.map(i => i.type), ["Melee Weapon", "Armor"]);
  assert.equal(chains[0].system.damage.bonus, 3);
  assert.equal(chains[0].system.attack.accuracy, 3);
  assert.equal(chains[1].system.soak.lethal, 3);
  assert.ok(chains[0].flags["wodx-library"].wonder.powers.length && !chains[1].flags["wodx-library"]);
  const [armor] = K.itemsFor(K.row("stygian-steel-armor"));
  assert.deepEqual([armor.type, armor.flags["wodx-library"].wonder.pool.value], ["Armor", 10]);
  const gloves = K.itemsFor(K.row("shroudripper-gloves"));
  assert.equal(gloves[0].system.damage.type, "aggravated");
  assert.equal(gloves[0].system.attack.ability, "brawl");
  // two makings do not share their flag objects
  const [a1] = K.itemsFor(K.row("bell-of-summoning")), [a2] = K.itemsFor(K.row("bell-of-summoning"));
  a1.flags["wodx-library"].wonder.pool.value = 5;
  assert.equal(a2.flags["wodx-library"].wonder.pool.value, 0);
});

const flagOf = key => K.itemsFor(K.row(key))[0].flags["wodx-library"].wonder;
const val = (o = {}) => ({"item:flags.wodx-library.wonder.pool.value": 0, [`actor:${D.PATHOS}`]: 6, [`actor:${D.WP}`]: 4, [`actor:${D.ANGST}`]: 2, [`actor:${D.CORPUS}`]: 10, [`actor:${D.PATHOS_MAX}`]: 10, ...o});

test("using them: Pathos goes in and out, costs are paid, the lantern fades the token, Redeyes light the map", () => {
  // the lantern: a Pathos from its shard, the token fades and glows dim red
  const lf = flagOf("soulfire-lantern"), hide = P.powerOf(lf, "hide");
  const h = P.plan(hide, {flag: lf, values: val({"item:flags.wodx-library.wonder.pool.value": 10})});
  assert.equal(h.item["flags.wodx-library.wonder.pool.value"], 9);
  assert.equal(h.show.token.set.alpha, 0.25);
  assert.equal(h.show.fx, "shadow-tendril");
  assert.ok(P.plan(P.powerOf(lf, "lower"), {flag: lf, values: val()}).show.token.restore);
  // Star of the East: attuning takes 3 Pathos and a Willpower, and is needed first
  const sf = flagOf("star-of-the-east");
  assert.ok(P.blockersOf(P.powerOf(sf, "seek"), {flag: sf, values: val()}).some(x => /Attune/.test(x)));
  assert.ok(P.blockersOf(P.powerOf(sf, "attune"), {flag: sf, values: val({[`actor:${D.PATHOS}`]: 2})}).some(x => /3 Pathos/.test(x)));
  const at = P.plan(P.powerOf(sf, "attune"), {flag: sf, values: val()});
  assert.deepEqual([at.actor[D.PATHOS], at.actor[D.WP]], [3, 3]);
  assert.deepEqual([at.undo.actor[D.PATHOS], at.undo.actor[D.WP]], [6, 4]);
  assert.deepEqual(P.blockersOf(P.powerOf(sf, "seek"), {flag: {...sf, used: {attune: 1}}, values: val()}), []);
  // Scribbler's Pen: write a Pathos, then tear the pages up and get it back
  const pf = flagOf("scribblers-pen");
  const w = P.plan(P.powerOf(pf, "write"), {flag: pf, values: val()});
  assert.deepEqual([w.actor[D.PATHOS], w.item["flags.wodx-library.wonder.pool.value"]], [5, 1]);
  const t = P.plan(P.powerOf(pf, "tear"), {flag: pf, values: val({"item:flags.wodx-library.wonder.pool.value": 3, [`actor:${D.PATHOS}`]: 8})});
  assert.equal(t.actor[D.PATHOS], 10, "held to the Pathos maximum");
  // Redeyes: used up, and a light placed on the map
  const rf = flagOf("redeyes"), r = P.plan(P.powerOf(rf, "hang"), {flag: rf, values: val()});
  assert.ok(r.spent);
  assert.equal(r.show.place.light.label, "Redeyes");
  // Living Chains: a Pathos and an aggravated Corpus
  const cf = K.itemsFor(K.row("living-chains"))[0].flags["wodx-library"].wonder, c = P.plan(P.powerOf(cf, "wake"), {flag: cf, values: val()});
  assert.deepEqual([c.actor[D.PATHOS], c.actor[D.CORPUS]], [5, 9]);
  // a Skin Artifact's botch adds Angst; a plain botch elsewhere still takes away
  const bf = flagOf("bloodwebs"), b = P.plan(P.powerOf(bf, "throw"), {flag: bf, values: val(), roll: {successes: 0, botch: true}});
  assert.equal(b.actor[D.ANGST], 3);
  assert.deepEqual(b.show, {}, "a failed throw shows nothing");
  const mf = flagOf("memory-net"), mb = P.plan(P.powerOf(mf, "cast"), {flag: mf, values: val(), roll: {successes: 0, botch: true}});
  assert.equal(mb.actor[D.CORPUS], 8);
  // Skin Artifacts lapse unless fed; feeding renews them
  const gf = {...flagOf("guardian-orb"), expires: 100};
  assert.ok(P.blockersOf(P.powerOf(gf, "deflect"), {flag: gf, values: val(), now: 200}).length);
  const fed = P.plan(P.powerOf(gf, "feed"), {flag: gf, values: val(), now: 200});
  assert.equal(fed.item["flags.wodx-library.wonder.expires"], 200 + 86400);
  // the armor breaks when its levels are gone
  const af = flagOf("stygian-steel-armor"), ab = P.plan(P.powerOf(af, "blow"), {flag: af, values: val({"item:flags.wodx-library.wonder.pool.value": 1})});
  assert.equal(ab.item["flags.wodx-library.wonder.pool.value"], 0);
});

test("the Use window shows it: the figure's casting move, the token's look, the Storyteller's light", () => {
  const u = src("modules/wodx-library/scripts/wonder-use.mjs");
  assert.match(u, /Hooks\.callAll\("wodxPowerShown", actor/);
  assert.match(u, /createEmbeddedDocuments\("AmbientLight"/);
  assert.match(u, /tokenWas/);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /WU\.onWonderSocket/);
});

test("a sealed Fetterguard keeps a place Fetter through its town's fall", () => {
  const towns = [{name: "Steinfeld", scars: [{kind: "sack", year: 1420}], history: []}];
  const base = {fromYear: 1400, toYear: 1500, years: 100, awakeYears: 100, fromEra: {id: "x"}, toEra: {id: "x"}};
  const v = {line: "wraith", fetters: [{id: "f1", name: "The well at Steinfeld"}, {id: "f2", name: "The mill at Steinfeld"}], towns};
  assert.equal(AR.propose(v, base).changes.filter(c => c.kind === "adv.fetterLost").length, 2);
  const g = AR.propose({...v, fetterguard: 1}, base);
  assert.deepEqual(g.changes.filter(c => c.kind === "adv.fetterLost").map(c => c.data.itemId), ["f2"]);
  assert.ok(g.notes.some(x => /Fetterguard/.test(x)));
  assert.match(src("modules/wodx-creation/scripts/advance.mjs"), /fetterguard: items\.filter/);
});
