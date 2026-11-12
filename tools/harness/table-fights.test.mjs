import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Rolls and fights at the table (Actions 3.43.0, Targeting 0.2.0, Combat 3.14.0, Interactables 0.27.0, Senses 0.7.0):
   odds before a roll, pinned actions, area shapes, the after-action card, using the room, colour-blind safe colours */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const OD = await imp("modules/wodx-actions/scripts/odds-rules.js");
const CR = await imp("modules/wodx-combat/scripts/rules.js");
const TR = await imp("modules/wodx-actions/scripts/theme-rules.js");
const T = await imp("modules/wodx-targeting/scripts/target-rules.mjs");
const AR = await imp("modules/wodx-combat/scripts/aftermath-rules.js");
const IR = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");
const SR = await imp("modules/wodx-senses/scripts/sight-rules.mjs");

/** Every face of every die, counted by the roller's own rules: the odds must match exactly. */
function brute(n, diff, opts) {
  const dist = [];
  let botch = 0;
  const faces = Array(n).fill(1);
  const total = 10 ** n;
  for (let k = 0; k < total; k++) {
    let x = k;
    for (let i = 0; i < n; i++) { faces[i] = (x % 10) + 1; x = Math.floor(x / 10); }
    const r = CR.countSuccesses(faces, diff, opts);
    dist[r.successes] = (dist[r.successes] ?? 0) + 1 / total;
    if (r.botch) botch += 1 / total;
  }
  return {dist, botch};
}

test("The odds agree with the roller on every face, with a specialty and with Willpower", () => {
  for (const n of [0, 1, 2, 3, 4])
    for (const diff of [3, 6, 8, 10])
      for (const opts of [{}, {specialty: true}, {willpower: true}, {specialty: true, willpower: true}]) {
        const o = OD.odds(n, diff, opts), b = brute(n, diff, opts);
        assert.ok(Math.abs(o.botch - b.botch) < 1e-9, `botch ${n}d at ${diff} ${JSON.stringify(opts)}`);
        for (let k = 0; k < Math.max(o.dist.length, b.dist.length); k++)
          assert.ok(Math.abs((o.dist[k] ?? 0) - (b.dist[k] ?? 0)) < 1e-9, `exactly ${k}, ${n}d at ${diff} ${JSON.stringify(opts)}`);
      }
});

test("The odds line reads plainly: five dice at 8", () => {
  const o = OD.odds(5, 8);
  assert.ok(o.any > 0.5 && o.any < 0.8);
  assert.ok(o.botch > 0 && o.botch < 0.2);
  const line = OD.oddsLine(o, {need: 5});
  assert.match(line, /^5 dice at 8: at least one success \d+% \(.+\), three or more \d+%, 5 or more .+, botch \d+%\.$/);
  assert.equal(OD.oddsLine(OD.odds(0, 6)), "No dice: the roll cannot succeed.");
  assert.equal(OD.pct(0.001), "under 1%");
  assert.equal(OD.verdict(0.95), "near certain");
  assert.equal(OD.odds(3, 6, {willpower: true}).botch, 0, "Willpower never botches");
});

test("The roll windows show the odds and list each modifier with its source", () => {
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /function buildPool\(/);
  assert.match(m, /oddsPanel\(root, actor, target, fd => fd\)/, "the WoDX Action window");
  assert.match(m, /oddsPanel\(root, actor, target, fd => \{/, "the common checks window");
  assert.match(m, /Storyteller only: .* resists with/, "the other side's odds go to the Storyteller only");
  assert.match(m, /const built = buildPool\(actor, target, fd, pool, \{ teamDice, overflow \}\)/, "the roll uses the same pool the odds show");
});

test("Pinned and lately used actions: five recent, eight pins, a pin shows once", () => {
  const q = TR.quickOf({recent: ["a", "b", "a", "c", "d", "e", "f"], pinned: ["x", 3, "y"]});
  assert.deepEqual(q.recent, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(q.pinned, ["x", "y"]);
  let p = [];
  for (const s of "abcdefgh") p = TR.togglePin(p, s).pinned;
  assert.equal(p.length, 8);
  const full = TR.togglePin(p, "z");
  assert.equal(full.full, true); assert.equal(full.pinned.length, 8);
  assert.deepEqual(TR.togglePin(p, "c").pinned, ["a", "b", "d", "e", "f", "g", "h"]);
  assert.deepEqual(TR.recentShown(["a", "q", "b"], ["a"]), ["q", "b"]);
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /actor\.setFlag\(MOD, "quick"/, "kept on the character");
  assert.match(src("modules/wodx-actions/scripts/profile-menus.js"), /vta-pinned/);
});

test("Area shapes: tags, sizes from text, the range band's defaults", () => {
  const t = T.parseTag("a.s:c6");
  assert.equal(t.shape.s, "c"); assert.equal(t.shape.size, 6);
  assert.equal(T.tagCode(t), "a.s:c6");
  assert.equal(T.parseTag("h.s").shape, undefined);
  assert.equal(T.parseTag("a.s:z5").shape, undefined, "an unknown shape is no shape");
  assert.equal(T.areaShape("a.v").size, T.VOICE_YARDS);
  assert.equal(T.areaShape("a.s").s, "c");
  assert.equal(T.areaShape("a.u"), null);
  assert.equal(T.areaShape("h.s"), null);
  assert.equal(T.shapeFromText("everyone within twenty feet of the vampire").size, 7);
  assert.equal(T.shapeFromText("a cone of fire 10 yards long").s, "k");
  assert.equal(T.shapeFromText("no size here"), null);
  assert.equal(T.tagFor({}, "disc", "x", {text: "every foe within ten yards", name: "Burst"}).shape?.size, 10);
  const tags = JSON.parse(src("modules/wodx-targeting/data/tags.json"));
  for (const lib of Object.values(tags)) for (const code of Object.values(lib)) assert.ok(T.validTag(code), code);
});

test("Who is inside a burst, a circle, a cone and a line", () => {
  const at = {origin: {x: 0, y: 0}, dir: 0};
  assert.ok(T.inShape(T.parseShape("b5"), at, {x: 3, y: 4}));
  assert.ok(!T.inShape(T.parseShape("b5"), at, {x: 4, y: 4}));
  assert.ok(T.inShape(T.parseShape("b5"), at, {x: 4, y: 4}, 1), "a token's edge counts");
  assert.ok(T.inShape(T.parseShape("k10"), at, {x: 8, y: 2}));
  assert.ok(!T.inShape(T.parseShape("k10"), at, {x: 5, y: 5}), "outside the 60 degrees");
  assert.ok(!T.inShape(T.parseShape("k10"), at, {x: -3, y: 0}), "behind the user");
  assert.ok(T.inShape(T.parseShape("l20"), at, {x: 15, y: 0.4}));
  assert.ok(!T.inShape(T.parseShape("l20"), at, {x: 15, y: 2}));
  const list = T.inArea(T.parseShape("b5"), at, [
    {id: "me", name: "Me", side: "self", pos: {x: 0, y: 0}}, {id: "f", name: "Foe", side: "foe", pos: {x: 2, y: 0}, distance: 2},
    {id: "a", name: "Ally", side: "friend", pos: {x: 1, y: 1}, distance: 1}, {id: "far", name: "Far", side: "foe", pos: {x: 9, y: 0}},
    {id: "hid", name: "Hidden", side: "foe", pos: {x: 1, y: 0}, visible: false}], {selfId: "me"});
  assert.deepEqual(list.map(x => [x.id, x.tick]), [["a", false], ["f", true]]);
  assert.equal(T.outline(T.parseShape("c3"), at).length, 32);
  assert.equal(T.outline(T.parseShape("k3"), at).length, 14);
});

test("The after-action card: taken, dealt, spent, acts seen", () => {
  const start = {A: {name: "Anna", ...AR.snapshot({damage: {lethal: 1}, pools: {bloodpool: 10, willpower: 5}})}, B: {name: "Bruno", ...AR.snapshot({damage: {}, pools: {willpower: 4}})}};
  const end = {A: {name: "Anna", ...AR.snapshot({damage: {lethal: 2, aggravated: 1}, pools: {bloodpool: 7, willpower: 4}})}, B: {name: "Bruno", ...AR.snapshot({damage: {bashing: 3}, pools: {willpower: 4}})},
    C: {name: "Late", ...AR.snapshot({damage: {lethal: 2}})}};
  const cards = [{attacker: "A", target: "B", levels: 3, applied: true}, {attacker: "B", target: "A", levels: 2, applied: true, counter: {uuid: "B", levels: 1}, counterApplied: true},
    {attacker: "A", target: "B", levels: 4, applied: false}];
  const rows = AR.rows({start, end, cards, acts: [{uuid: "A", title: "Dominate: Command"}, {uuid: "A", title: "Dominate: Command"}]});
  const a = rows.find(r => r.uuid === "A"), b = rows.find(r => r.uuid === "B"), c = rows.find(r => r.uuid === "C");
  assert.equal(a.taken, 2); assert.equal(a.given, 4, "3 applied plus a counter of 1 as the target"); assert.deepEqual(a.powers, ["Dominate: Command"]);
  assert.deepEqual(a.spent.map(s => [s.label, s.amount]), [["blood", 3], ["Willpower", 1]]);
  assert.equal(b.taken, 3); assert.equal(b.given, 2);
  assert.equal(c.taken, 0, "joined late: no start, nothing counted");
  assert.match(AR.rowText(a), /took 2 levels; dealt 4; spent 3 blood, 1 Willpower/);
});

test("Breach evidence and severity follow the year", () => {
  assert.equal(AR.evidenceFor(1197).id, "word");
  assert.equal(AR.evidenceFor(1900).id, "snapshot");
  assert.equal(AR.evidenceFor(1995).id, "camcorder");
  assert.equal(AR.evidenceFor(2010).id, "phones");
  assert.equal(AR.evidenceFor(2040).id, "phones", "the future branch off");
  assert.equal(AR.evidenceFor(2040, {future: true}).id, "recorded");
  assert.equal(AR.severity(0, AR.evidenceFor(2010)), 0);
  assert.equal(AR.severity(1, AR.evidenceFor(1400)), 1);
  assert.equal(AR.severity(1, AR.evidenceFor(2010)), 2);
  assert.equal(AR.severity(5, AR.evidenceFor(1400)), 2);
  assert.match(AR.rumourText({place: "the Black Swan", kinds: ["a Cainite"], ev: AR.evidenceFor(2010)}), /^People are talking about a fight at the Black Swan: a Cainite\. Someone says there are pictures\.$/);
  const m = src("modules/wodx-combat/scripts/aftermath.js");
  assert.match(m, /whisper: gmIds\(\)/, "the card is the Storyteller's");
  assert.match(m, /recordBreach/); assert.match(m, /rumours\?\.start/);
});

test("Use the room: a lamp knocked over starts a fire and puts the light out", () => {
  const lamp = IR.describeLight({lightKind: "lamp"}, {on: true, count: 1});
  const ops = IR.optionsFor(lamp, {}).map(o => o.id);
  assert.ok(ops.includes("spillLight"));
  const out = IR.resolve(lamp, IR.optionsFor(lamp, {}).find(o => o.id === "spillLight"), [], {});
  assert.equal(out.lights, false); assert.equal(out.patch.flags.broken, true);
  assert.deepEqual([out.spawnFire.size, out.spawnFire.heat], ["large", "torch"]);
  const candle = IR.describeLight({lightKind: "candle"}, {on: true, count: 1});
  const oc = IR.resolve(candle, IR.optionsFor(candle, {}).find(o => o.id === "spillLight"), [], {});
  assert.equal(oc.spawnFire.size, "small"); assert.equal(oc.patch.flags.broken, undefined);
  const dark = IR.describeLight({lightKind: "lamp"}, {on: false, count: 1});
  assert.ok(!IR.optionsFor(dark, {}).some(o => o.id === "spillLight"), "an unlit lamp starts no fire");
  const sw = IR.describeLight({lightKind: "switch"}, {on: true, count: 1});
  assert.equal(IR.optionsFor(sw, {year: 1600})[0].id, "eraNote", "no electric light before 1880");
});

test("Use the room: a chandelier falls by the falling rules, dodged die by die", () => {
  const ch = IR.describeLight({lightKind: "chandelier", dropFeet: 20}, {on: true, count: 1});
  const op = IR.optionsFor(ch, {}).find(o => o.id === "dropChandelier");
  assert.ok(op);
  const out = IR.resolve(ch, op, [], {});
  assert.equal(out.drop.dice, 2 + IR.CHANDELIER_MASS);
  assert.ok(out.drop.fire, "lit candles start a fire");
  assert.equal(out.patch.flags.dropped, true);
  assert.equal(IR.dropLeft(6, {successes: 2}), 4);
  assert.equal(IR.dropLeft(6, {successes: 9}), 0);
  assert.equal(IR.dropLeft(6, {successes: 2, botch: true}), 6);
  const down = IR.describeLight({lightKind: "chandelier", broken: true, dropped: true}, {on: false, count: 1});
  assert.deepEqual(IR.optionsFor(down, {}), []);
  assert.equal(IR.cleanLight({light: true, lightKind: "chandelier", broken: false}).dropped, false, "mending hangs it again");
});

test("Use the room: windows, shutters and curtains let the sun in by day only", () => {
  const win = IR.describe({door: true, ds: "closed", flags: {kind: "window"}});
  assert.ok(!IR.optionsFor(win, {sunUp: false}).some(o => o.id === "letSun"), "night: no sun to let in");
  const op = IR.optionsFor(win, {sunUp: true}).find(o => o.id === "letSun");
  assert.match(op.label, /Smash/);
  const out = IR.resolve(win, op, [], {sunUp: true});
  assert.deepEqual([out.sun.light, out.patch.ds, out.patch.flags.broken, out.patch.flags.sunIn], ["direct", "open", true, true]);
  const shut = IR.describe({door: true, ds: "locked", flags: {kind: "shutter", material: "wood"}});
  assert.ok(!IR.optionsFor(shut, {sunUp: true}).some(o => o.id === "letSun"), "a locked shutter must be opened first");
  const done = IR.describe({door: true, ds: "open", flags: {kind: "window", sunIn: true}});
  assert.ok(!IR.optionsFor(done, {sunUp: true}).some(o => o.id === "letSun"));
  const closed = IR.resolve(done, IR.optionsFor(done, {sunUp: true}).find(o => o.id === "close"), [], {});
  assert.equal(closed.shutSun, true); assert.equal(closed.patch.flags.sunIn, false);
  const cur = IR.describeHide({hide: true, hideKind: "curtain", occupants: [{a: "x", n: "X"}]});
  const tear = IR.optionsFor(cur, {sunUp: true}).find(o => o.id === "tearCurtain");
  const t = IR.resolve(cur, tear, [], {sunUp: true});
  assert.equal(t.sun.light, "indirect"); assert.equal(t.revealAll, true);
  assert.equal(IR.resolve(cur, tear, [], {sunUp: false}).sun, undefined);
  const pts = IR.sunPatch([0, 0, 100, 0], {x: 50, y: -30}, 40);
  assert.deepEqual(pts.slice(4), [100, -40, 0, -40], "on the character's side of the wall");
});

test("Use the room: sprinklers from 1874 put out small fires, not an inferno", () => {
  const sp = IR.describeWatch({watch: true, watchKind: "sprinkler"});
  assert.equal(IR.optionsFor(sp, {year: 1700})[0].id, "eraNote");
  const op = IR.optionsFor(sp, {year: 1990}).find(o => o.id === "setSprinklers");
  const out = IR.resolve(sp, op, [], {});
  assert.equal(out.douse, true); assert.equal(out.patch.flags.spent, true);
  assert.ok(IR.douses(IR.describeHazard({hazard: true, hazardKind: "fire", size: "large"})));
  assert.ok(!IR.douses(IR.describeHazard({hazard: true, hazardKind: "fire", size: "inferno"})));
  assert.ok(!IR.douses(IR.describeHazard({hazard: true, hazardKind: "fire", burning: false})));
  assert.ok(IR.FIGHT_OPS.has("knockOver") && IR.FIGHT_OPS.has("letSun"));
  assert.match(src("modules/wodx-combat/scripts/main.js"), /ix\.api\.useRoom\(tok\)/, "the fight button");
});

test("Colour-blind safe colours, and every ring carries words", () => {
  const plain = SR.ringFor("aura", "lupine"), safe = SR.ringFor("aura", "lupine", {safe: true});
  assert.equal(plain.colour, SR.AURAS.lupine.colour);
  assert.equal(safe.colour, SR.SAFE.lupine);
  assert.ok(safe.words);
  assert.equal(SR.ringFor("lifesight", "mortal", {safe: true}).colour, SR.SAFE.life);
  assert.equal(SR.ringFor("lifesight", "kindred", {safe: true}), null);
  const vals = Object.entries(SR.SAFE).filter(([k]) => !["spirit", "hunter"].includes(k)).map(([, v]) => v);
  assert.equal(new Set(vals).size, vals.length, "each kind its own safe colour");
  assert.equal(SR.css(0x56b4e9), "#56b4e9");
  assert.match(src("modules/wodx-otherworlds/scripts/senses.mjs"), /draw\.word = /, "the aura overlay names its colour");
});

/* ---- m7: every power a window aims has a tag in the table ---- */

test("untagged powers: every shipped power has a table tag, and every aimed window names its library or its cast", async () => {
  const {allPowers} = await import(new URL("../targeting/powers.mjs", import.meta.url));
  const tags = JSON.parse(src("modules/wodx-targeting/data/tags.json"));
  const powers = await allPowers();
  const untagged = powers.filter(p => !tags[p.lib]?.[p.id]).map(p => `${p.lib}:${p.id} (${p.name})`);
  // The list, so a new power shows up by name in the run, not only as a count
  if ( untagged.length ) console.log(`Powers with no target tag:\n  ${untagged.join("\n  ")}`);
  assert.deepEqual(untagged, []);
  for ( const lib of ["numina", "hekau"] ) assert.ok(powers.some(p => p.lib === lib), lib);
  assert.equal(tags.numina.curses, "h.s"); assert.equal(tags.numina.healing, "x.t"); assert.equal(tags.hekau.effigy, "h.u");
  // Each aim() call: a library (its table) or a cast (intent from the casting). Only actor-made Blessings fall back to the words.
  const dir = new URL("../../modules/wodx-actions/scripts/", import.meta.url);
  const {readdirSync, readFileSync} = await import("node:fs");
  const bare = [];
  for ( const f of readdirSync(dir).filter(n => n.endsWith(".js") && n !== "aim.js") ) {
    for ( const m of readFileSync(new URL(f, dir), "utf8").matchAll(/\baim\(root, \{ actor, ([a-z]+):/g) ) if ( m[1] !== "lib" && m[1] !== "cast" ) bare.push(f);
  }
  assert.deepEqual(bare, ["hunter.js"], "only the Blessing window, whose Blessings are the actor's own items, reads the words alone");
});
