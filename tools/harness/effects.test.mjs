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
  assert.equal(Object.keys(E.KEYWORDS).length, 34);
});

test("the Mage 20th cast uses the keywords and posts a card the Storyteller's client applies", () => {
  const m20 = src("modules/wodx-actions/scripts/m20.js");
  assert.match(m20, /EF\.fieldset\(i\.spheres, EF\.rotesOf\(actor\)\)/); assert.match(m20, /EF\.wire\(root/); assert.match(m20, /kind: "effects"/);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /createChatMessage/); assert.match(fx, /isActiveGM\(\)/); assert.match(fx, /setDamage/);
  assert.match(fx, /registerApprovalHandler/); assert.match(fx, /rothenstein-live/);
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /EFX\.setup\(\)/); assert.match(main, /EFX\.registerHandler/);
  assert.equal(JSON.parse(src("modules/wodx-actions/module.json")).version, "3.37.0");
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
  assert.deepEqual(PE.numinaOutcomes("telekinesis", 2, 4, H.NUMINA.telekinesis).map(o => [o.out.levels, o.out.type, o.ask]), [[2, "bashing", true]]);
  assert.deepEqual(PE.numinaOutcomes("healing", 4, 3, H.NUMINA.healing)[0].out.levels, 3);
  assert.equal(PE.numinaOutcomes("curses", 2, 2, H.NUMINA.curses)[0].st, true);
  assert.equal(Object.keys(PE.PATH_EFFECTS).length, 70);
  assert.equal(Object.values(PE.PATH_EFFECTS).filter(x => x.kind === "st").length, 38);
  const by = id => paths.find(p => p.id.endsWith(id));
  assert.deepEqual(PE.pathOutcomes(by("theft-of-vitae"), 3)[0].st, true);
  assert.deepEqual(PE.pathOutcomes(by("dust-to-dust"), 3).map(o => [o.out.levels, o.out.type, o.out.soak]), [[3, "aggravated", false]]);
  assert.deepEqual(PE.pathOutcomes(by("ashen-ladys-embrace"), 4).map(o => [o.out.levels, o.ask]), [[2, true]]);
  assert.deepEqual(PE.pathOutcomes(by("benedictio-mortem"), 3)[0].out.timed, {kind: "rounds", rounds: 3});
  assert.equal(PE.pathOutcomes(by("pontos-euxeinos"), 2)[0].out.kind, "heal");
  const kx = src("modules/wodx-actions/scripts/kindred.js"), hx = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(kx, /EF\.pathPlan\(actor, p, successes\)/); assert.match(kx, /!PE\.PATH_EFFECTS\[p\.id\]/);
  assert.match(hx, /EF\.numinaPlan\(actor, /);
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /source: o\.source \?\? /);
});

test("Actions 3.28.0: the Sorcerers Crusade's magic charts", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(s => E.crusadeLevels(s)), [1, 4, 6, 8, 15, 18]);
  assert.equal(E.crusadeLevels(3, {forces: true}), 8);
  assert.equal(E.crusadeLevels(3, {mind: true}), 4);
  assert.equal(E.eraRules("crusade").reflect, false);
  assert.equal(E.eraRules("ascension").reflect, true);
  assert.equal(E.eraRules("dark"), E.ERA_RULES.ascension);
  const got = {ok: true, strength: 3, duration: 0, targets: 0};
  assert.equal(E.outcome("harm", got, {spheres: ["forces"], age: "crusade"}).levels, 8);
  assert.equal(E.outcome("harm", got, {spheres: ["forces"], age: "ascension"}).levels, E.outcome("harm", got, {spheres: ["forces"]}).levels);
  assert.equal(E.outcome("mend", got, {spheres: ["life"], age: "crusade"}).levels, 6);
  const m = src("modules/wodx-actions/scripts/m20.js");
  assert.equal((m.match(/age: sg\.age\.key \}/g) ?? []).length, 2);
  assert.match(m, /eraRules\(age\(\)\.key\)\.reflect/);
});

test("Actions 3.30.0: the shared keyword roster for every line's powers", async () => {
  const DA = await import(join(root, "modules/wodx-actions/scripts/mage-da-effects.js"));
  for ( const k of ["know", "speak", "boost", "summon", "make", "work", "illusion", "possess", "bind", "banish", "manifest", "imbue", "place", "weather", "time"] )
    assert.ok(E.KEYWORDS[k], k);
  const got = {ok: true, strength: 3, duration: 0, targets: 0};
  // Boost or Sap
  const b = E.outcome("boost", got, {boost: "social"});
  assert.equal(b.dice, 3); assert.equal(b.on, "social"); assert.equal(b.kind, "timed");
  assert.equal(E.outcome("boost", {...got, strength: 9}, {sap: true}).dice, -5);
  // Pools: Charge or Drain and Mend
  const d = E.outcome("charge", got, {pool: "blood", drain: true});
  assert.equal(d.kind, "pool"); assert.equal(d.pool, "blood"); assert.ok(d.points < 0);
  assert.equal(E.outcome("charge", got, {}).kind, "quint");
  assert.equal(E.outcome("charge", got, {pool: "quintessence"}).kind, "quint");
  assert.equal(E.outcome("mend", got, {pool: "willpower"}).kind, "pool");
  assert.equal(E.outcome("mend", got, {}).kind, "heal");
  assert.equal(E.poolOf("nope"), E.POOLS.quintessence);
  // Harm: kind and lasting
  const h = E.outcome("harm", got, {spheres: ["life"], damageKind: "silver", lasting: true});
  assert.equal(h.of, "silver"); assert.equal(h.lasting, 3); assert.match(h.text, /each turn/);
  assert.equal(E.outcome("harm", got, {spheres: ["forces"], fire: true}).of, "fire");
  // Ward against a kind, reflect
  const w = E.outcome("ward", got, {against: "sunlight", reflect: true});
  assert.equal(w.against, "sunlight"); assert.ok(w.reflect);
  // Fear: calm and frenzy; Sway: awe applies on NPCs, not on player characters
  assert.equal(E.outcome("fear", got, {calm: true}).name, "Calmed");
  assert.equal(E.outcome("fear", got, {frenzy: true}).name, "Roused");
  const awe = E.outcome("sway", got, {awe: true});
  assert.ok(awe.awe);
  assert.equal(E.route("sway", {count: 1}, awe), "auto");
  assert.equal(E.route("sway", {count: 1, playerCharacter: true}, awe), "st");
  assert.equal(E.route("sway", {count: 1}, E.outcome("sway", got, {})), "queue");
  // Tiers of the new keywords
  assert.equal(E.route("possess", {count: 1}), "queue");
  assert.equal(E.route("bind", {count: 1, playerCharacter: true}), "st");
  assert.equal(E.route("time", {self: true}), "st");
  assert.equal(E.route("boost", {self: true}), "auto");
  // Resisted by: the roster's house rule, a power's own entry wins
  assert.deepEqual(E.resistOf("sway"), {pool: "willpower", diff: 6, text: "resisted by Willpower at 6"});
  assert.equal(E.resistOf("harm"), null);
  assert.equal(E.resistOf("sway", {resist: null}), null);
  assert.equal(E.resistOf("harm", {resist: {pool: "stamina", diff: 8}}).diff, 8);
  // Always-on powers
  const p = E.passive("boost", 2);
  assert.ok(p.passive); assert.equal(p.dice, 2); assert.equal(p.timed.kind, "passive");
  assert.equal(E.passive("harm", 2), null); assert.equal(E.passive("ward", 0), null);
  // Rotes keep the choice lists
  const r = E.roteFrom("Blood tap", {keywords: ["charge"], ctx: {pool: "blood", drain: true, fire: false}});
  assert.deepEqual(r.ctx, {pool: "blood", drain: true});
  // The Cast window carries the new options and Undo restores a pool
  const fx = src("modules/wodx-actions/scripts/effects.js");
  for ( const f of ["kw-pool", "kw-boost", "kw-of", "kw-awe", "kw-lasting", "kw-reflect", "kw-calm", "kw-frenzy", "kw-sap", "kw-derange"] ) assert.match(fx, new RegExp(`name="${f}"`), f);
  assert.match(fx, /case "pool":/); assert.match(fx, /r\.pool\?\.path/); assert.match(fx, /E\.resistOf\(key\)/);
  // Dark Ages entries that now carry a keyword
  assert.equal(DA.DA_EFFECTS["g-exorcism-w"].kw, "banish"); assert.equal(DA.DA_EFFECTS["g-summoning"].kw, "summon");
});

test("Actions 3.30.0: every listed power reads the shared roster", async () => {
  const P = await import(join(root, "modules/wodx-actions/scripts/power-keywords.js"));
  const data = f => JSON.parse(src(`modules/wodx-actions/data/${f}`));
  const sets = {disc: data("disciplines-daw.json").powers, gift: data("gifts-daw.json").gifts,
    wraith: data("arcanoi-w20.json").arts, greatwar: data("arcanoi-gw.json").arts};
  for ( const [set, list] of Object.entries(sets) ) {
    for ( const p of list ) {
      const got = P.keywordsOf(set, p.id);
      assert.ok(got && got.keywords.length, `${set} ${p.id} has a keyword`);
    }
    for ( const id of Object.keys(P.POWER_KEYWORDS[set]) ) assert.ok(list.some(p => p.id === id), `${set} ${id} is a real power`);
    for ( const [ks] of Object.values(P.POWER_KEYWORDS[set]) ) for ( const k of ks ) assert.ok(E.KEYWORDS[k], `${set} keyword ${k}`);
  }
  // Every keyword on the roster is used by some power, and few fall back to the Storyteller's Free Effect
  const c = P.keywordCounts();
  for ( const k of Object.keys(E.KEYWORDS) ) assert.ok(c[k] > 0, `${k} is used`);
  assert.ok(c.free < 10);
  // Path powers read PATH_EFFECTS; always-on powers are marked
  assert.equal(P.keywordsOf("disc", "necromancy-the-graves-decay-rigor-mortis").keywords[0], "hold");
  assert.ok(P.keywordsOf("disc", sets.disc.find(p => p.d === "Potence").id).passive);
  assert.equal(P.keywordsOf("disc", "nope"), null);
});

test("Actions 3.31.0: the Storyteller's effect and saved rituals", () => {
  // Strength keywords read the chosen length; the others last as chosen too
  const o = E.stOutcomes(["harm", "light", "ward", "nope"], {strength: 4, step: 3, ctx: {against: "spirits"}});
  assert.deepEqual(o.map(x => x.key), ["harm", "light", "ward"]);
  assert.equal(o[0].out.levels, E.outcome("harm", {ok: true, strength: 4, duration: 0}, {}).levels);
  assert.equal(o[1].out.duration, o[2].out.duration);
  assert.equal(o[2].out.against, "spirits"); assert.equal(o[2].out.dice, 4);
  assert.equal(E.stOutcomes(["harm"], {strength: 99})[0].out.levels, E.stOutcomes(["harm"], {strength: E.ST_STRENGTH_MAX})[0].out.levels);
  assert.ok(E.stOutcomes(["ward"], {area: true})[0].out.area);
  // Rituals: named, keywords checked, choice lists and the summoned actor kept
  assert.equal(E.ritualFrom("", {keywords: ["ward"]}), null);
  assert.equal(E.ritualFrom("Nothing", {keywords: ["nope"]}), null);
  const r = E.ritualFrom("Rite of the Hearth", {keywords: ["ward", "banish"], strength: 3, step: 4, ctx: {against: "spirits", summonActor: "Actor.abcdefghij0123456789", fire: false}, takes: "one hour"});
  assert.deepEqual(r.ctx, {against: "spirits", summonActor: "Actor.abcdefghij0123456789"});
  assert.equal(r.takes, "one hour");
  const list = E.keepRitual(E.keepRitual([], r), {...r, strength: 5});
  assert.equal(list.length, 1); assert.equal(list[0].strength, 5);
  // The window, its toolbar button, Summon and Make on the sheet, and Undo for what they made
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /export async function storytellerEffect\(/); assert.match(fx, /tokens\.tools\.wodxStEffect/);
  assert.match(fx, /register\(MOD, "stRituals"/); assert.match(fx, /case "summon":/); assert.match(fx, /case "give":/);
  assert.match(fx, /for \( const u of r\.made \?\? \[\] \)/); assert.match(fx, /\$\{optionsHtml\(\)\}/);
  assert.match(fx, /if \( !a && o\?\.kind !== "summon" \)/);
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /storyteller: EFX\.storytellerEffect/);
});

test("Actions 3.32.0: keywords for the lines with no power data yet", async () => {
  const PK = await import("../../modules/wodx-actions/scripts/power-keywords.js");
  const { KEYWORDS } = await import("../../modules/wodx-actions/scripts/effects-rules.js");
  const sets = ["v20", "w20", "c20", "htr", "dtf", "mummy", "orpheus"];
  for ( const s of sets ) {
    const list = Object.entries(PK.LINE_KEYWORDS[s]);
    assert.ok(list.length >= 10, `${s} has powers`);
    for ( const [id, e] of list ) {
      if ( s !== "htr" ) assert.equal(id, PK.slugOf(e.n), `${s} ${id} is the slug of its name`); // Edges keep their Virtue in the id
      assert.ok(e.k.length && e.k.every(k => KEYWORDS[k]), `${s} ${id} uses known keywords`);
    }
  }
  assert.deepEqual(PK.keywordsOf("w20", "Rattler's Bite").keywords, ["harm"]);
  assert.deepEqual(PK.keywordsOf("v20", "summon-soul").keywords, ["summon"]);
  assert.equal(PK.keywordsOf("v20", "Heightened Senses").passive, true);
  assert.equal(PK.keywordsOf("htr", "innocence-hide").name, "Hide (Innocence)");
  assert.equal(PK.keywordsOf("mummy", "Nobody"), null);
  assert.ok(PK.powersWith("dtf", "possess").includes("Possess Animals"));
  assert.ok(PK.keywordCounts().summon > 40);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /version: "3\.37\.0"/);
});

test("Actions 3.32.0: the books' rituals and rites fill the Storyteller's window", async () => {
  const BR = await import("../../modules/wodx-actions/scripts/book-rituals.js");
  const { KEYWORDS } = await import("../../modules/wodx-actions/scripts/effects-rules.js");
  const c = BR.bookRitualCounts();
  assert.deepEqual(Object.keys(c), ["v20", "v20da", "w20", "daw", "mummy"]);
  assert.ok(Object.values(c).reduce((a, b) => a + b, 0) >= 300);
  for ( const [set, b] of Object.entries(BR.BOOK_RITUALS) ) b.list.forEach((r, i) => {
    assert.ok(r.n && r.page && r.k.length && r.k.every(k => KEYWORDS[k]), `${set} ${i} ${r.n}`);
    const x = BR.bookRitual(set, i);
    assert.ok(x && x.name && x.keywords.length && x.note.length <= 300 && x.takes.length <= 60, `${set} ${i} fills in`);
    assert.doesNotMatch(r.does, /\b(he|she|his|her|him)\b/i);
  });
  const haven = BR.bookRitual("v20", 3);
  assert.equal(haven.name, "Defense of the Sacred Haven");
  assert.ok(haven.area && haven.keywords.includes("ward") && /V20 p\. 230/.test(haven.note));
  assert.equal(BR.bookRitual("w20", 4).strength, 4);
  assert.equal(BR.bookRitual("nope", 0), null);
  const fx = src("modules/wodx-actions/scripts/effects.js");
  assert.match(fx, /name="st-book"/);
  assert.match(fx, /bookRitual\(set, n\(i\)\)/);
});

test("Move and its Undo jump with a displace move, so walls do not stop them (3.35.1)", async () => {
  const {readFile} = await import("node:fs/promises");
  const src = await readFile(new URL("../../modules/wodx-actions/scripts/effects.js", import.meta.url), "utf8");
  assert.match(src, /async function jump\(tok, pos\)[\s\S]*?action: "displace"/);
  const plain = src.split("\n").filter(l => /\.update\([^)]*teleport: true/.test(l));
  assert.equal(plain.length, 1, "only the fallback inside jump() is a plain update");
  assert.match(src, /case "move": \{[\s\S]*?await jump\(tok, pos\)/);
});

test("gates that make several actors at once match them by name", async () => {
  const {readFile, readdir} = await import("node:fs/promises");
  const dir = new URL("../gate/", import.meta.url);
  for ( const f of (await readdir(dir)).filter(n => n.endsWith(".mjs")) ) {
    const src = await readFile(new URL(f, dir), "utf8");
    const batch = [...src.matchAll(/await Actor\.create\(\[\s*\{name: "([^"]+)"[^\n]*\n?[^\n]*?\{name:/g)];
    assert.equal(batch.length, 0, `${f} makes a batch of actors with Actor.create([...]); use createActors`);
  }
});
