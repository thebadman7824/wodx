import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Actions 3.22.0: Mage effect keywords, the spend plan, routes, and the apply step with Undo */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E = await import(join(root, "modules/wodx-actions/scripts/effects-rules.js"));
const src = p => readFileSync(join(root, p), "utf8");

test("keywords bring the lowest Sphere the caster can work, merged by highest", () => {
  const {used, missing} = E.spheresFor(["harm", "ward"], {forces: 3, life: 1});
  assert.deepEqual(used, [{sphere: "forces", level: 3}]);
  assert.deepEqual(missing, []);
  assert.deepEqual(E.spheresFor(["harm"], {life: 3}).used, [{sphere: "life", level: 3}]);
  assert.deepEqual(E.spheresFor(["hasten"], {forces: 5}).missing, ["hasten"]);
  // Mend on oneself is Life 2; on someone else Life 3
  assert.deepEqual(E.spheresFor(["mend"], {life: 2}).used, [{sphere: "life", level: 2}]);
  assert.deepEqual(E.spheresFor(["mend"], {life: 2}, {self: false}).missing, ["mend"]);
  // Sense takes the caster's best Sphere
  assert.deepEqual(E.spheresFor(["sense"], {mind: 1, prime: 2}).used, [{sphere: "prime", level: 1}]);
});

test("the need: largest feat, one more per extra keyword, two on someone else, plus the plan", () => {
  assert.equal(E.needFor([]), 0);
  assert.equal(E.needFor(["sense"]), 1);
  assert.equal(E.needFor(["sense"], {self: false}), 2);
  assert.equal(E.needFor(["harm", "charge"], {self: false}), 4);
  assert.equal(E.needFor(["ward"], {feat: 3, plan: {targets: 2, duration: 1}}), 6);
});

test("the spend: extra targets, then duration, the rest to strength; short rolls drop from the end", () => {
  assert.deepEqual(E.spend(1, 2, {}), {ok: false, area: false, targets: 0, duration: 0, strength: 0, dropped: ["the Effect"]});
  assert.deepEqual(E.spend(6, 2, {targets: 1, duration: 1}), {ok: true, area: false, targets: 1, duration: 1, strength: 4, dropped: []});
  const short = E.spend(3, 2, {targets: 1, duration: 2});
  assert.equal(short.targets, 1); assert.equal(short.duration, 0);
  assert.deepEqual(short.dropped, ["2 duration steps"]);
});

test("durations follow the p. 504 ladder as Chronicle timed durations", () => {
  assert.deepEqual(E.durationFor(1).timed, {kind: "rounds", rounds: 1});
  assert.deepEqual(E.durationFor(2).timed, {kind: "scene"});
  assert.equal(E.durationFor(3).timed.seconds, 86400);
  assert.equal(E.durationFor(4).timed.seconds, 30 * 86400);
  assert.equal(E.durationFor(5).timed.seconds, 182 * 86400);
  assert.equal(E.durationFor(9).timed, null);
});

test("outcomes: damage by the chart and type, healing, Quintessence, timed effects, conditions", () => {
  const got = E.spend(3, 3, {});
  const h = E.outcome("harm", got, {spheres: ["forces"]});
  assert.equal(h.kind, "damage"); assert.equal(h.levels, 8); assert.equal(h.type, "lethal"); assert.equal(h.soak, true);
  assert.equal(E.outcome("harm", got, {spheres: ["forces"], fire: true}).type, "aggravated");
  assert.equal(E.outcome("harm", got, {spheres: ["mind"]}).type, "bashing");
  assert.equal(E.outcome("harm", got, {spheres: ["mind"]}).soak, false);
  assert.equal(E.outcome("mend", got).kind, "heal");
  assert.equal(E.outcome("charge", got, {drain: true}).points < 0, true);
  const w = E.outcome("ward", E.spend(3, 1, {duration: 1}));
  assert.equal(w.kind, "timed"); assert.equal(w.dice, 2); assert.deepEqual(w.timed, {kind: "scene"});
  assert.equal(E.outcome("hold", got).condition, "held");
  assert.equal(E.outcome("trip", got).condition, "knockdown");
  // no strength: spare successes go to how long it lasts
  assert.deepEqual(E.outcome("sight", E.spend(2, 1, {})).timed, {kind: "scene"});
  assert.equal(E.outcome("harm", E.spend(0, 3, {})), null);
});

test("routes: auto with Undo, the queue, or the Storyteller", () => {
  assert.equal(E.route("harm", {self: false, count: 1, need: 3}), "auto");
  assert.equal(E.route("harm", {self: false, count: 1, need: 3, witnessed: true}), "queue");
  assert.equal(E.route("harm", {self: false, count: 4, need: 3}), "queue");
  assert.equal(E.route("harm", {self: false, playerCharacter: true, count: 1, need: 3}), "queue");
  assert.equal(E.route("mend", {self: false, playerCharacter: true, count: 1, need: 3}), "auto");
  assert.equal(E.route("fear", {self: false, count: 1, need: 2}), "queue");
  assert.equal(E.route("sway", {self: false, playerCharacter: true, count: 1, need: 2}), "st");
  assert.equal(E.route("free", {self: true}), "st");
  assert.equal(E.route("harm", {self: false, need: 10}), "st");
  assert.equal(E.route("ward", {self: true, need: 1}, {timed: null}), "st");
  assert.equal(E.leanOf(["sense", "harm"]), "vulgar"); assert.equal(E.leanOf(["ward"]), "coincidental");
  assert.equal(E.wardStands(3, 2), 3);
});

test("every keyword has a label, a Sphere floor, a feat and a plain description", () => {
  for ( const [k, K] of Object.entries(E.KEYWORDS) ) {
    assert.ok(K.label && K.does && K.opts.length && K.feat >= 1, k);
    assert.ok(["auto", "queue", "st"].includes(K.tier), k);
  }
  assert.equal(Object.keys(E.KEYWORDS).length, 19);
});

test("the Mage 20th cast uses the keywords and posts a card the Storyteller's client applies", () => {
  const m20 = src("modules/wodx-actions/scripts/m20.js");
  assert.match(m20, /EF\.fieldset\(i\.spheres, EF\.rotesOf\(actor\)\)/); assert.match(m20, /EF\.wire\(root/); assert.match(m20, /kind: "effects"/);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /createChatMessage/); assert.match(fx, /isActiveGM\(\)/); assert.match(fx, /setDamage/);
  assert.match(fx, /registerApprovalHandler/); assert.match(fx, /rothenstein-live/);
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /EFX\.setup\(\)/); assert.match(main, /EFX\.registerHandler/);
  assert.equal(JSON.parse(src("modules/wodx-actions/module.json")).version, "3.26.0");
});

test("3.23.0: Move in one scene, areas on entry, saved rotes", () => {
  const mv = E.outcome("move", E.spend(2, 2, {}));
  assert.equal(mv.kind, "move");
  assert.equal(E.route("move", {self: true, count: 1, need: 2}, mv), "auto");
  assert.equal(E.route("move", {self: false, playerCharacter: true, count: 1, need: 2}, mv), "queue");
  // an area costs two more successes, and only for keywords that can be areas
  assert.equal(E.needFor(["harm"], {plan: {area: true}}), 5);
  assert.equal(E.needFor(["mend"], {plan: {area: true}}), 2);
  const a = E.spend(6, 3, {area: true});
  assert.equal(a.area, true); assert.equal(a.strength, 4);
  const short = E.spend(4, 3, {area: true});
  assert.equal(short.area, false); assert.deepEqual(short.dropped, ["the area"]);
  assert.equal(E.outcome("harm", a, {spheres: ["forces"]}).area, E.AREA.feet);
  assert.equal(E.outcome("mend", a).area, undefined);
  assert.equal(E.areaRadius({size: 100, distance: 5}), 300);
  assert.equal(E.inArea({x: 100, y: 100}, {x: 0, y: 0, radius: 150}), true);
  assert.equal(E.inArea({x: 300, y: 0}, {x: 0, y: 0, radius: 150}), false);
  // rotes: named, one per name, sorted, capped
  const r = E.roteFrom(" Fire Bolt ", {keywords: ["harm", "nope"], used: [{sphere: "forces", level: 3}, {sphere: "prime", level: 0}], plan: {targets: 1, area: true}, ctx: {fire: true, curse: false}, kind: "vulgar", feat: 3});
  assert.deepEqual(r, {name: "Fire Bolt", keywords: ["harm"], spheres: {forces: 3}, plan: {targets: 1, duration: 0, area: true}, ctx: {fire: true}, kind: "vulgar", feat: 3});
  assert.equal(E.roteFrom("  "), null);
  let list = E.keepRote([], r);
  list = E.keepRote(list, {...r, name: "fire bolt", feat: 4});
  list = E.keepRote(list, {...r, name: "Ward"});
  assert.deepEqual(list.map(x => [x.name, x.feat]), [["fire bolt", 4], ["Ward", 3]]);
  for ( let i = 0; i < 50; i++ ) list = E.keepRote(list, {...r, name: `R${String(i).padStart(2, "0")}`});
  assert.equal(list.length, E.ROTES_MAX);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /updateToken/); assert.match(fx, /wodxEndScene/); assert.match(fx, /createEmbeddedDocuments\("Region"/);
  assert.match(src("modules/wodx-actions/scripts/m20.js"), /EF\.saveRote/);
});

test("3.24.0: the system's Rote items open the WoDX Cast window, and saved rotes are Rote items", () => {
  const item = {name: "Ball of Abysmal Flame", system: {forces: 3, prime: 2, life: 0, spelltype: "vulgar"}, flags: {}};
  assert.deepEqual(E.roteOfItem(item), {name: "Ball of Abysmal Flame", keywords: [], spheres: {forces: 3, prime: 2}, plan: {targets: 0, duration: 0, area: false}, ctx: {}, kind: "vulgar", feat: 0});
  const rote = E.roteFrom("Bolt", {keywords: ["harm"], used: [{sphere: "forces", level: 3}], plan: {targets: 1}, ctx: {fire: true}, kind: "witnessed", feat: 3});
  const data = E.itemOfRote(rote);
  assert.equal(data.type, "Rote"); assert.equal(data.system.forces, 3); assert.equal(data.system.mind, 0); assert.equal(data.system.spelltype, "vulgar");
  // round trip: the item gives the rote back, keywords and all
  assert.deepEqual(E.roteOfItem(data), rote);
  assert.equal(E.roteOfItem(null), null);
  const sys = src("system/worldofdarkness/module/scripts/action-helpers.js");
  assert.match(sys, /game\.wodxActions\?\.m20CastRote\?\.\(actor, item\) === true/);
  const m20 = src("modules/wodx-actions/scripts/m20.js");
  assert.match(m20, /EF\.fill\(root, preset\)/); assert.match(m20, /function castRote/);
  assert.match(src("modules/wodx-sheets/templates/block.hbs"), /wodx-cast-rote/);
  assert.match(src("modules/wodx-sheets/scripts/main.mjs"), /\.wodx-cast-rote\[data-itemid\]/);
});

test("3.25.0: countermagick takes successes off the card; reflected, the rest lands on the caster", () => {
  assert.deepEqual(E.countered(4, 1), {left: 3, reflected: 0});
  assert.deepEqual(E.countered(2, 5), {left: 0, reflected: 0});
  assert.deepEqual(E.countered(2, 5, "reflect"), {left: 0, reflected: 3});
  assert.deepEqual(E.countered(5, 2, "reflect"), {left: 3, reflected: 0});
  assert.equal(E.canCounter({advantages: {arete: {permanent: 2}}}), true);
  assert.equal(E.canCounter({}), false);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /data\.hold \|\| !isActiveGM\(\)/); assert.match(fx, /kind === "counter"/); assert.match(fx, /export async function applyCounter/);
  const m20 = src("modules/wodx-actions/scripts/m20.js");
  assert.match(m20, /kind: "counter", card: card\.id/); assert.match(m20, /recipe: fx\.recipe, hold: fx\.hold/);
});

test("3.26.0: every Dark Ages rote says what it does on the table, or leaves it to the Storyteller", async () => {
  const M = await import(join(root, "modules/wodx-actions/scripts/mage-da-rules.js"));
  const D = await import(join(root, "modules/wodx-actions/scripts/mage-da-effects.js"));
  assert.equal(M.ROTES.length, 97);
  for ( const r of M.ROTES ) {
    const spec = D.DA_EFFECTS[r.id];
    assert.ok(spec, `no entry for ${r.id}`);
    assert.ok(E.KEYWORDS[spec.kw], `${r.id}: unknown keyword ${spec.kw}`);
    assert.ok(["harm", "timed", "condition", "move", "note", "st"].includes(spec.kind), r.id);
    const outs = D.daOutcomes(r, 3);
    assert.ok(outs.length >= 1, r.id);
    for ( const o of outs ) assert.ok(o.out.label && o.out.text && ["damage", "timed", "condition", "move", "note"].includes(o.out.kind), r.id);
  }
  assert.equal(Object.keys(D.DA_EFFECTS).length, 97);
  const by = id => M.ROTES.find(r => r.id === id);
  // damage straight from the rote's own system
  assert.deepEqual(D.daOutcomes(by("verdantslumber"), 2).map(o => [o.out.levels, o.out.type]), [[2, "aggravated"]]);
  assert.deepEqual(D.daOutcomes(by("g-tearsallah"), 3).map(o => [o.out.levels, o.out.type]), [[3, "lethal"], [3, "bashing"]]);
  assert.equal(D.daOutcomes(by("shatteringvoid"), 2)[0].ask, true);
  // lengths: the p. 103 ladder, the scene, to dawn, per success
  assert.deepEqual(D.daDuration(1).timed, {kind: "rounds", rounds: 1});
  assert.equal(D.daDuration(4).timed.seconds, 30 * 86400);
  assert.equal(D.daDuration(6).timed, null);
  assert.deepEqual(D.daOutcomes(by("g-glamour"), 2)[0].out.timed, {kind: "night"});
  assert.deepEqual(D.daOutcomes(by("g-antics"), 3)[0].out.timed, {kind: "rounds", rounds: 6});
  assert.equal(D.daOutcomes(by("g-skogarmathur"), 2)[0].out.timed.seconds, 14 * 86400);
  assert.equal(D.daOutcomes(by("g-battlesmite"), 2)[0].out.condition, "blinded");
  assert.equal(D.daOutcomes(by("g-72names"), 4)[0].st, true);
  assert.deepEqual(D.daOutcomes(by("verdantslumber"), 0), []);
  assert.deepEqual([D.targetCount("self", 3, 2), D.targetCount("one", 3, 2), D.targetCount("each", 3, 5), D.targetCount("each", 3, 2), D.targetCount("all", 1, 4)], [0, 1, 3, 2, 4]);
  const da = src("modules/wodx-actions/scripts/mage-da.js");
  assert.match(da, /EF\.daPlan\(actor, rote, out\.successes\)/); assert.match(da, /kind: "effects", caster: actor\.name, items: fxItems/);
});

test("Actions 3.27.0: path magic and Numina on the effects card", async () => {
  const PE = await import(join(root, "modules/wodx-actions/scripts/path-effects.js"));
  const disc = JSON.parse(readFileSync(join(root, "modules/wodx-actions/data/disciplines-daw.json"), "utf8")).powers;
  const paths = disc.filter(p => PE.isPath(p.d));
  assert.equal(paths.length, 70);
  for ( const id of Object.keys(PE.PATH_EFFECTS) ) assert.ok(paths.some(p => p.id === id), `no path power ${id}`);
  for ( const p of paths ) {
    const o = PE.pathOutcomes(p, 2);
    assert.ok(o.length >= 1, p.id);
    for ( const x of o ) assert.match(x.out.source, /V20 Dark Ages p\. \d+/);
  }
  assert.deepEqual(PE.pathOutcomes(paths[0], 0), []);
  assert.equal(PE.isPath("Quietus"), false);
  const H = await import(join(root, "modules/wodx-actions/scripts/hunter-rules.js"));
  for ( const k of Object.keys(PE.NUMINA_EFFECTS) ) { const [key, l] = k.split(":"); assert.ok(H.NUMINA[key] && +l >= 1 && +l <= 5, k); }
  const fire = PE.numinaOutcomes("pyrokinesis", 4, 3, H.NUMINA.pyrokinesis);
  assert.deepEqual(fire.map(o => [o.out.levels, o.out.type, o.ask]), [[2, "aggravated", true]]);
  const heal = PE.numinaOutcomes("healing", 5, 3, H.NUMINA.healing)[0].out;
  assert.deepEqual([heal.kind, heal.levels, heal.aggravated], ["heal", 3, true]);
  assert.equal(PE.numinaOutcomes("telekinesis", 2, 2, H.NUMINA.telekinesis)[0].st, true);
  const kx = src("modules/wodx-actions/scripts/kindred.js"), hx = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(kx, /EF\.pathPlan\(actor, p, successes\)/); assert.match(kx, /!PE\.PATH_EFFECTS\[p\.id\]/);
  assert.match(hx, /EF\.numinaPlan\(actor, /);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /source: o\.source \?\? /);
});
