import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/*
 * WoDX Interactables: the rules (interact-rules.mjs) and the runtime (main.mjs) on a small stand-in for Foundry: one
 * scene, a few walls, a player's token and an NPC, a chat log and dice that roll what the test says. It is not Foundry:
 * the gate in Foundry checks the real canvas, door controls, wall config window and collisions.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs"));
const MOD = "wodx-interactables";

/* ---------------- the rules ---------------- */

test("a plain door needs no setup: a locked one has a good lock, the build follows the material", () => {
  const o = R.describe({door: true, ds: "locked", flags: {}});
  assert.equal(o.kind, "door");
  assert.equal(o.material, "wood");
  assert.equal(o.build, "interior");
  assert.equal(o.lock, "good");
  const w = R.describe({door: true, ds: "closed", flags: {kind: "window"}});
  assert.equal(w.material, "glass");
  assert.equal(w.build, "pane");
  assert.equal(w.lock, "none");
  assert.equal(R.describe({door: true, ds: "closed", flags: {material: "ironbound"}}).build, "reinforced");
  assert.equal(R.nameOf(R.describe({door: true, ds: "locked", flags: {material: "ironbound"}})), "Locked iron-bound door");
});

test("four named lock grades, harder and slower as they go", () => {
  const g = ["cheap", "good", "excellent", "masterwork"].map(k => R.LOCKS[k]);
  for ( let i = 1; i < g.length; i++ ) {
    assert.ok(g[i].diff >= g[i - 1].diff);
    assert.ok(g[i].need > g[i - 1].need);
    assert.ok(g[i].seconds >= g[i - 1].seconds);
  }
  assert.equal(g[0].diff, 5);
  assert.equal(g[3].diff, 9);
});

test("the lock skill follows the line and era: Larceny, Legerdemain in the Dark Ages, Security for hunters", () => {
  assert.deepEqual(R.lockSkill({larceny: 2, security: 0}, {kind: "kindred", eraId: "victorian"}), {key: "larceny", value: 2});
  assert.deepEqual(R.lockSkill({legerdemain: 1, larceny: 0}, {eraId: "dark-ages"}), {key: "legerdemain", value: 1});
  assert.deepEqual(R.lockSkill({larceny: 3}, {eraId: "dark-ages"}), {key: "larceny", value: 3});
  assert.deepEqual(R.lockSkill({larceny: 1, security: 1}, {kind: "hunter", eraId: "modern"}), {key: "security", value: 1});
  // The best rated wins over the line's first name
  assert.deepEqual(R.lockSkill({larceny: 1, security: 3}, {kind: "kindred", eraId: "modern"}), {key: "security", value: 3});
  // Nothing on the sheet: the line's name, untrained
  assert.deepEqual(R.lockSkill({}, {eraId: "modern"}), {key: "larceny", value: 0});
  assert.deepEqual(R.electronicSkill({technology: 2, security: 1}), {key: "technology", value: 2});
});

const ch = (x = {}) => ({actorId: "pc1", strength: 2, dexterity: 3, perception: 3, intelligence: 2, potence: 0, abilities: {larceny: 2, stealth: 1, alertness: 2}, eraId: "victorian", year: 1890, side: "a", hasTools: true, ...x});
const ids = list => list.map(o => o.id);

test("a locked door offers pick, force, listen and knock, each with its pool, difficulty, time and noise", () => {
  const o = R.describe({door: true, ds: "locked", flags: {lock: "excellent"}});
  const ops = R.optionsFor(o, ch());
  assert.deepEqual(ids(ops), ["pick", "force", "listen", "knock"]);
  const pick = ops[0];
  assert.equal(pick.roll.dice, 5);
  assert.equal(pick.roll.diff, 8);
  assert.equal(pick.roll.need, 5);
  assert.equal(pick.seconds, 60);
  assert.equal(pick.noise.success, "quiet");
  // No tools: +2 difficulty
  assert.equal(R.optionsFor(o, ch({hasTools: false}))[0].roll.diff, 10);
  const force = ops[1];
  assert.equal(force.roll.dice, 2);
  assert.equal(force.roll.need, 1);
  assert.equal(force.noise.success, "loud");
  assert.equal(ops[2].roll.dice, 5);
  assert.equal(ops[2].roll.diff, 6);
});

test("a closed door opens with no roll, or quietly with Dexterity + Stealth; an open one closes", () => {
  const closed = R.describe({door: true, ds: "closed", flags: {}});
  assert.deepEqual(ids(R.optionsFor(closed, ch())), ["open", "openQuiet", "force", "listen", "knock"]);
  const open = R.describe({door: true, ds: "open", flags: {}});
  assert.deepEqual(ids(R.optionsFor(open, ch())), ["close"]);
});

test("Strength (with Potence) at the door's feat forces it with no roll; below, Potence adds automatic successes", () => {
  const o = R.describe({door: true, ds: "locked", flags: {material: "ironbound"}});
  const weak = R.optionsFor(o, ch({strength: 3, potence: 2})).find(x => x.id === "force");
  assert.equal(weak.roll.dice, 3);
  assert.equal(weak.roll.auto, 2);
  assert.equal(weak.roll.need, 5);
  assert.equal(weak.roll.diff, 8);
  const strong = R.optionsFor(o, ch({strength: 5, potence: 5})).find(x => x.id === "force");
  assert.equal(strong.roll, null);
  assert.ok(strong.auto);
  assert.match(strong.note, /no roll/);
});

test("a bar: lifted from its own side, and from the other side picking is no use and forcing needs 2 more successes", () => {
  const o = R.describe({door: true, ds: "closed", flags: {barSide: "a", barred: true}});
  assert.ok(ids(R.optionsFor(o, ch({side: "a"}))).includes("unbar"));
  const other = R.optionsFor(o, ch({side: "b"}));
  assert.ok(!ids(other).includes("open"));
  assert.equal(other.find(x => x.id === "force").roll.need, 3);
  const lockedBarred = R.describe({door: true, ds: "locked", flags: {barSide: "a", barred: true}});
  assert.ok(R.optionsFor(lockedBarred, ch({side: "b"})).find(x => x.id === "barredNote").disabled);
});

test("windows: a glass pane breaks with no roll; a stuck window takes Strength; windows are not listened at", () => {
  const w = R.describe({door: true, ds: "closed", flags: {kind: "window"}});
  const ops = ids(R.optionsFor(w, ch()));
  assert.ok(ops.includes("smash"));
  assert.ok(!ops.includes("force"));
  assert.ok(!ops.includes("listen"));
  const stuck = R.describe({door: true, ds: "closed", flags: {kind: "window", stuck: true}});
  const u = R.optionsFor(stuck, ch()).find(x => x.id === "unstick");
  assert.equal(u.roll.attr, "strength");
  assert.equal(u.roll.diff, 6);
  assert.ok(!ids(R.optionsFor(stuck, ch())).includes("open"));
});

test("keys, keypads and the era: a key unlocks; a keypad shows only in the modern eras", () => {
  const o = R.describe({door: true, ds: "locked", flags: {keyName: "Cellar key", electronic: "good"}});
  assert.ok(ids(R.optionsFor(o, ch({hasKey: true}))).includes("unlock"));
  assert.ok(!ids(R.optionsFor(o, ch())).includes("unlock"));
  assert.ok(!ids(R.optionsFor(o, ch({eraId: "victorian", year: 1890}))).includes("hack"));
  const hack = R.optionsFor(o, ch({eraId: "modern", year: 1999, abilities: {computer: 3}})).find(x => x.id === "hack");
  assert.equal(hack.roll.ability, "computer");
  assert.equal(hack.roll.dice, 5);
});

test("retrying a single roll adds one to the difficulty each time", () => {
  const o = R.describe({door: true, ds: "closed", flags: {tries: {"pc1:listen": 2}}});
  const listen = R.optionsFor(o, ch()).find(x => x.id === "listen");
  assert.equal(listen.roll.diff, 8);
  assert.match(listen.note, /\+2 difficulty/);
});

test("extended rolls: successes add up on the door; enough of them opens it; a botch loses them and jams the lock", () => {
  const o = R.describe({door: true, ds: "locked", flags: {lock: "excellent", progress: {pick: 2}}});
  const pick = R.optionsFor(o, ch()).find(x => x.id === "pick");
  assert.equal(pick.roll.have, 2);
  const part = R.resolve(o, pick, [{successes: 1, botch: false}]);
  assert.equal(part.result, "progress");
  assert.equal(part.patch.flags.progress.pick, 3);
  assert.equal(part.patch.ds, undefined);
  assert.equal(part.seconds, 60);
  const full = R.resolve(o, pick, [{successes: 1, botch: false}, {successes: 2, botch: false}, {successes: 2, botch: false}]);
  assert.equal(full.result, "done");
  assert.equal(full.patch.ds, "closed");
  assert.equal(full.patch.flags.progress.pick, 0);
  assert.equal(full.seconds, 120, "it stops rolling once enough successes are in");
  const bad = R.resolve(o, pick, [{successes: 0, botch: true}]);
  assert.equal(bad.result, "botch");
  assert.equal(bad.patch.flags.jammed, true);
  assert.equal(bad.patch.flags.progress.pick, 0);
  const jammed = R.describe({door: true, ds: "locked", flags: {jammed: true}});
  assert.ok(R.optionsFor(jammed, ch()).find(x => x.id === "jammed").disabled);
});

test("forcing: loud; a botch hurts (one lethal); success opens it and lifts a bar", () => {
  const o = R.describe({door: true, ds: "closed", flags: {barSide: "a", barred: true, material: "heavy"}});
  const force = R.optionsFor(o, ch({side: "b"})).find(x => x.id === "force");
  const bad = R.resolve(o, force, [{successes: 0, botch: true}]);
  assert.equal(bad.hurt, 1);
  assert.equal(bad.noise, "loud");
  const good = R.resolve(o, force, [{successes: 5, botch: false}]);
  assert.equal(good.patch.ds, "open");
  assert.equal(good.patch.flags.barred, false);
  const auto = R.optionsFor(o, ch({strength: 5})).find(x => x.id === "force");
  assert.equal(R.resolve(o, auto, []).patch.ds, "open");
});

test("quiet opening: success is silent, failure opens it with the usual noise, a botch is loud", () => {
  const o = R.describe({door: true, ds: "closed", flags: {}});
  const op = R.optionsFor(o, ch()).find(x => x.id === "openQuiet");
  assert.equal(R.resolve(o, op, [{successes: 1}]).noise, "silent");
  const f = R.resolve(o, op, [{successes: 0}], {actorId: "pc1"});
  assert.equal(f.noise, "quiet");
  assert.equal(f.patch.ds, "open");
  assert.equal(f.patch.flags.tries["pc1:openQuiet"], 1);
  assert.equal(R.resolve(o, op, [{successes: 0, botch: true}]).noise, "loud");
});

test("a live alarm goes off when the door opens in a modern era, but not once beaten", () => {
  const o = R.describe({door: true, ds: "closed", flags: {electronic: "cheap"}});
  const op = R.optionsFor(o, ch({eraId: "modern"})).find(x => x.id === "open");
  const out = R.resolve(o, op, [], {eraId: "modern"});
  assert.equal(out.patch.flags.alarm, true);
  assert.equal(out.noise, "loud");
  const beaten = R.describe({door: true, ds: "closed", flags: {electronic: "cheap", beaten: true}});
  assert.equal(R.resolve(beaten, op, [], {eraId: "modern"}).patch.flags.alarm, undefined);
  const hack = R.optionsFor(o, ch({eraId: "modern", abilities: {security: 2}})).find(x => x.id === "hack");
  assert.equal(R.resolve(o, hack, [{successes: 0, botch: true}], {eraId: "modern"}).patch.flags.alarm, true);
  assert.equal(R.resolve(o, hack, [{successes: 3}], {eraId: "modern"}).patch.flags.beaten, true);
});

test("a breakable wall: a break-through option that waits for the Storyteller", () => {
  const o = R.describe({door: false, ds: "closed", flags: {wall: "stone"}});
  const ops = R.optionsFor(o, ch());
  assert.deepEqual(ids(ops), ["breach"]);
  assert.ok(ops[0].waits);
  assert.equal(ops[0].roll.need, 10);
  const out = R.resolve(o, ops[0], [{successes: 10}]);
  assert.equal(out.result, "done");
  assert.ok(out.waits);
  assert.equal(R.optionsFor(R.describe({door: false, flags: {wall: "stone", breached: true}}), ch()).length, 0);
});

test("listening: what the successes tell", () => {
  assert.match(R.listenText(0, [{moving: true}]), /nothing/);
  assert.match(R.listenText(1, [{moving: true}]), /Someone/);
  assert.match(R.listenText(1, []), /nobody/);
  assert.match(R.listenText(2, [{moving: true}, {moving: false}]), /Two people/);
  assert.match(R.listenText(3, [{moving: true, talking: true}, {moving: true, talking: true}]), /all moving about, and voices/);
  assert.match(R.listenText(-1, [{moving: true}]), /nothing you can be sure of/);
});

test("noise: loud is heard by anyone awake in earshot; a wall cuts it to 10 yards; quiet needs a roll and stops at a wall", () => {
  const no = () => 0, yes = () => 0.99;
  assert.equal(R.hears("loud", {yards: 25}).hears, true);
  assert.equal(R.hears("loud", {yards: 25, walls: 1}).inRange, false);
  assert.equal(R.hears("loud", {yards: 8, walls: 1}).hears, true);
  assert.equal(R.hears("loud", {yards: 8, walls: 2}).inRange, false);
  assert.equal(R.hears("quiet", {yards: 4, walls: 1}).inRange, false);
  assert.equal(R.hears("quiet", {yards: 4}, yes).hears, true);
  assert.equal(R.hears("quiet", {yards: 4}, no).hears, false);
  assert.equal(R.hears("loud", {yards: 4, asleep: true}, no).hears, false, "a sleeper rolls even for a loud noise");
  assert.equal(R.hears("silent", {yards: 0}).inRange, false);
});

test("geometry: sides of a wall, compass words, distance", () => {
  const c = [0, 0, 100, 0];
  assert.equal(R.sideOf(c, {x: 50, y: 10}), "a");
  assert.equal(R.sideOf(c, {x: 50, y: -10}), "b");
  assert.equal(R.sideLabel(c, "a"), "south");
  assert.equal(R.sideLabel(c, "b"), "north");
  assert.equal(R.sideLabel([0, 0, 0, 100], "a"), "west");
  assert.equal(R.distanceToWall(c, {x: 50, y: 30}), 30);
  assert.equal(R.distanceToWall(c, {x: 130, y: 40}), 50);
  const p = R.besideWall(c, "a", 4);
  assert.equal(R.sideOf(c, p), "a");
});

test("the config form is cleaned: unknown values dropped, the key name trimmed", () => {
  const s = R.cleanSettings({kind: "portal", lock: "masterwork", keyName: "  Cellar key ", barSide: "x", stuck: "on"});
  assert.equal(s.kind, "door");
  assert.equal(s.lock, "masterwork");
  assert.equal(s.keyName, "Cellar key");
  assert.equal(s.barSide, "");
  assert.equal(s.stuck, true);
});

test("containers: the kind sets the material and build; a lock with no state set means locked", () => {
  const safe = R.describeContainer({container: true, kind: "safe", lock: "excellent"});
  assert.equal(safe.material, "steel");
  assert.equal(safe.build, "vault");
  assert.equal(safe.ds, "locked");
  assert.equal(R.nameOf(safe), "Locked safe");
  const chest = R.describeContainer({container: true, items: "Item.abc\n\n  Ledger of debts  \n"});
  assert.equal(chest.ds, "closed");
  assert.deepEqual(chest.items, ["Item.abc", "Ledger of debts"]);
  assert.equal(R.nameOf(R.describeContainer({kind: "strongbox", ds: "open"})), "Open strongbox, empty");
  // Glass is no material for a container
  assert.equal(R.describeContainer({material: "glass"}).material, "wood");
  assert.equal(R.parseItems(Array.from({length: 80}, (_, k) => `i${k}`)).length, R.MAX_ITEMS);
});

test("containers: a locked one is picked or forced; an open one is emptied and closed", () => {
  const safe = R.describeContainer({kind: "safe", lock: "excellent"});
  const ops = R.optionsFor(safe, ch());
  assert.deepEqual(ids(ops), ["pick", "force"]);
  assert.equal(ops[0].roll.diff, 8);
  assert.equal(ops[1].roll.need, 10);
  const open = R.describeContainer({kind: "chest", ds: "open", items: "Item.a\nItem.b"});
  const o2 = R.optionsFor(open, ch());
  assert.deepEqual(ids(o2), ["take", "close"]);
  assert.match(o2[0].label, /2 things/);
  const took = R.resolve(open, o2[0], []);
  assert.equal(took.result, "done");
  assert.equal(took.patch.flags.taken, true);
  assert.equal(took.noise, "silent");
  assert.deepEqual(ids(R.optionsFor(R.describeContainer({ds: "open", items: "x", taken: true}), ch())), ["close"]);
  // A keypad on a modern safe, and a key
  const modern = R.optionsFor(R.describeContainer({kind: "safe", lock: "good", electronic: "good", keyName: "Safe key"}), ch({eraId: "modern", year: 1995, hasKey: true}));
  assert.deepEqual(ids(modern), ["unlock", "pick", "hack", "force"]);
  // A cheap box is forced open with no roll
  const box = R.optionsFor(R.describeContainer({kind: "box", lock: "cheap"}), ch({strength: 3}));
  assert.equal(box.find(o => o.id === "force").auto, true);
});

test("containers: the config form is cleaned", () => {
  const c = R.cleanContainer({container: "on", kind: "nonsense", material: "glass", lock: "masterwork", items: " a \n\n b "});
  assert.equal(c.container, true);
  assert.equal(c.kind, "chest");
  assert.equal(c.material, "");
  assert.equal(c.lock, "masterwork");
  assert.equal(c.items, "a\nb");
});

test("traps: four kinds and four grades; a blade does 5 lethal dice, a pit 2 bashing, unless the Storyteller sets others", () => {
  assert.deepEqual(Object.keys(R.TRAPS), ["snare", "pit", "tripwire", "blade"]);
  assert.deepEqual(Object.keys(R.TRAP_GRADES), ["crude", "good", "excellent", "masterwork"]);
  const b = R.describeTrap({trap: true, trapKind: "blade"});
  assert.equal(b.dice, 5); assert.equal(b.type, "lethal"); assert.equal(b.grade, "good"); assert.equal(b.armed, true);
  const p = R.describeTrap({trap: true, trapKind: "pit", dice: 4, damageType: "lethal", sprung: true});
  assert.equal(p.dice, 4); assert.equal(p.type, "lethal"); assert.equal(p.armed, false);
  assert.equal(R.nameOf(p), "Open pit (good)");
  assert.equal(R.nameOf(R.describeTrap({trapKind: "snare", holding: "pc1", sprung: true})), "Snare, holding someone");
  assert.equal(R.nameOf(R.describeTrap({trapKind: "tripwire", armed: false})), "Disarmed tripwire (good)");
});

test("traps: an armed one is disarmed with Wits + Larceny at its grade, or set off from a distance; a snare's victim breaks free", () => {
  const o = R.describeTrap({trapKind: "blade", grade: "excellent", found: true});
  const ops = R.optionsFor(o, ch({wits: 3}));
  assert.deepEqual(ids(ops), ["disarm", "trigger"]);
  assert.equal(ops[0].roll.dice, 5); assert.equal(ops[0].roll.diff, 7); assert.equal(ops[0].roll.abilityLabel, "Larceny");
  assert.equal(ops[0].seconds, R.MINUTE);
  const da = R.optionsFor(o, ch({wits: 3, eraId: "dark-ages", year: 1197, abilities: {legerdemain: 3}}));
  assert.equal(da[0].roll.abilityLabel, "Legerdemain");
  assert.equal(R.resolve(o, ops[0], [{successes: 1, botch: false}], {actorId: "pc1"}).patch.flags.armed, false);
  const botch = R.resolve(o, ops[0], [{successes: 0, botch: true}], {actorId: "pc1"});
  assert.equal(botch.springs, true); assert.equal(botch.result, "botch");
  const fail = R.resolve(o, ops[0], [{successes: 0, botch: false}], {actorId: "pc1"});
  assert.equal(fail.patch.flags.tries["pc1:disarm"], 1);
  assert.equal(R.resolve(o, ops[1], []).patch.flags.sprung, true);
  // Disarmed: set it again; an open pit: nothing to do
  assert.deepEqual(ids(R.optionsFor(R.describeTrap({trapKind: "snare", armed: false}), ch())), ["rearm"]);
  assert.deepEqual(ids(R.optionsFor(R.describeTrap({trapKind: "pit", sprung: true}), ch())), []);
  const held = R.describeTrap({trapKind: "snare", sprung: true, holding: "pc1"});
  const bf = R.optionsFor(held, ch({potence: 1}));
  assert.deepEqual(ids(bf), ["breakFree"]); assert.equal(bf[0].roll.dice, 3); assert.equal(bf[0].roll.diff, 7);
  assert.equal(R.resolve(held, bf[0], [{successes: 1, botch: false}]).patch.flags.holding, null);
  assert.deepEqual(ids(R.optionsFor(held, ch({actorId: "pc2"}))), ["cutFree"]);
});

test("traps: a search finds those its successes reach; getting clear takes dice off a blade, clears a snare or a pit", () => {
  const t = g => R.describeTrap({trapKind: "pit", grade: g});
  const s = R.searchOption(ch({abilities: {alertness: 1, investigation: 3}}));
  assert.equal(s.roll.dice, 6); assert.equal(s.roll.abilityLabel, "Investigation"); assert.equal(s.roll.diff, 6);
  const all = [t("crude"), t("good"), t("excellent"), t("masterwork")];
  assert.equal(R.searchFinds(all, {successes: 2}).length, 2);
  assert.equal(R.searchFinds(all, {successes: 5}).length, 4);
  assert.equal(R.searchFinds(all, {successes: 5, botch: true}).length, 0);
  const blade = R.describeTrap({trapKind: "blade", grade: "good"});
  assert.deepEqual(R.reflexRoll(blade, {dexterity: 3, abilities: {athletics: 1, dodge: 2}}), {attr: "dexterity", ability: "dodge", dice: 5, diff: 6});
  assert.equal(R.reflexRoll(R.describeTrap({trapKind: "tripwire"}), {}), null);
  assert.equal(R.springTrap(blade, {successes: 2}).dice, 3);
  assert.equal(R.springTrap(blade, {successes: 2, botch: true}).dice, 5);
  const sn = R.springTrap(R.describeTrap({trapKind: "snare"}), {successes: 0}, "pc1");
  assert.equal(sn.flags.holding, "pc1"); assert.equal(sn.caught, true);
  assert.equal(R.springTrap(R.describeTrap({trapKind: "snare"}), {successes: 1}, "pc1").flags.holding, undefined);
  assert.equal(R.springTrap(R.describeTrap({trapKind: "pit"}), {successes: 1}).dice, 0);
  assert.equal(R.springTrap(R.describeTrap({trapKind: "tripwire"})).noise, "loud");
  assert.deepEqual(R.cleanTrap({trap: "on", trapKind: "bear", grade: "x", dice: "33", damageType: "fire"}),
    {trap: true, trapKind: "snare", grade: "good", dice: 20, damageType: "", armed: true, found: false, npcs: false});
});

test("clues: the Storyteller's text in four parts; more successes show more; a plain one needs no roll", () => {
  const o = R.describeClue({clue: true, clueKind: "document", title: "A letter to the bishop", text0: "Sealed in red wax.", text1: "The hand is shaky.", text3: "It names the miller."});
  assert.equal(R.nameOf(o), "A letter to the bishop");
  const [look, op] = R.optionsFor(o, ch({intelligence: 3, abilities: {investigation: 2}}));
  assert.equal(look.id, "look"); assert.equal(look.roll, null);
  assert.equal(op.id, "examine"); assert.equal(op.label, "Read it closely");
  const untrained = R.optionsFor(o, ch({intelligence: 3, abilities: {}}));
  assert.deepEqual(ids(untrained), ["look", "examineNote"]); assert.equal(untrained[1].disabled, true);
  assert.equal(op.roll.attrLabel, "Intelligence"); assert.equal(op.roll.dice, 5); assert.equal(op.roll.diff, 6);
  const mark = R.optionsFor(R.describeClue({clueKind: "mark", text0: "x", text1: "y"}), ch({abilities: {investigation: 1}}))[1];
  assert.equal(mark.roll.attrLabel, "Perception"); assert.equal(mark.roll.abilityLabel, "Investigation"); assert.equal(mark.roll.dice, 4);
  assert.deepEqual(R.optionsFor(R.describeClue({text0: "Only this."}), ch()).map(x => [x.id, x.label, x.roll]), [["look", "Read it", null]]);
  const two = R.resolve(o, op, [{successes: 2, botch: false}], {actorId: "pc1"});
  assert.equal(two.examine, 2); assert.equal(two.patch.flags.seen.pc1, 2);
  assert.deepEqual(R.clueTexts(o, 2), ["Sealed in red wax.", "The hand is shaky."]);
  assert.deepEqual(R.clueTexts(o, 9), ["Sealed in red wax.", "The hand is shaky.", "It names the miller."]);
  // A new, worse roll keeps the best seen; a botch shows only the first part
  const seen = R.describeClue({...o, clueKind: "document", text0: o.texts[0], text1: o.texts[1], text3: o.texts[3], seen: {pc1: 3}});
  assert.equal(R.resolve(seen, op, [{successes: 1, botch: false}], {actorId: "pc1"}).examine, 3);
  assert.equal(R.resolve(o, op, [{successes: 0, botch: true}], {actorId: "pc1"}).examine, -1);
  assert.equal(R.searchFinds([R.describeClue({need: 3})], {successes: 2}).length, 0);
  assert.equal(R.searchFinds([R.describeClue({need: 3})], {successes: 3}).length, 1);
  assert.deepEqual(R.cleanClue({clue: 1, clueKind: "rune", need: 9, title: "  T  "}), {clue: true, clueKind: "document", title: "T", need: 5, found: false, text0: "", text1: "", text2: "", text3: ""});
});

test("light sources: light or put out with no roll; a lantern can be broken; one tied to no light says so", () => {
  const dark = R.describeLight({light: true, lightKind: "lantern"}, {on: false, count: 1});
  assert.equal(R.nameOf(dark), "Lantern, dark");
  assert.deepEqual(ids(R.optionsFor(dark, ch())), ["lightOn", "breakLight"]);
  const on = R.resolve(dark, R.optionsFor(dark, ch())[0], []);
  assert.equal(on.lights, true); assert.equal(on.noise, "silent");
  const br = R.resolve(dark, R.optionsFor(dark, ch())[1], []);
  assert.equal(br.lights, false); assert.equal(br.patch.flags.broken, true); assert.equal(br.noise, "loud");
  const torch = R.describeLight({lightKind: "torch"}, {on: true, count: 2});
  assert.deepEqual(ids(R.optionsFor(torch, ch())), ["lightOff"]);
  assert.equal(R.optionsFor(R.describeLight({lightKind: "switch"}, {on: true, count: 1}), ch())[0].label, "Switch it off");
  assert.equal(R.optionsFor(R.describeLight({}, {count: 0}), ch())[0].disabled, true);
  assert.deepEqual(R.optionsFor(R.describeLight({broken: true}, {on: true, count: 1}), ch()), []);
  assert.equal(R.cleanLight({light: 1, lightIds: "abc123, x y;<bad>"}).lightIds, "abc123, x, y");
});

/* ---------------- the runtime, on a stand-in for Foundry ---------------- */

const G = 100;
class ForcedDeletion {}
function setPath(obj, path, value) {
  const parts = path.split(".");
  let o = obj;
  for ( let k = 0; k < parts.length - 1; k++ ) o = (o[parts[k]] ??= {});
  if ( value instanceof ForcedDeletion ) delete o[parts.at(-1)];
  else o[parts.at(-1)] = structuredClone(value);
}
class Coll extends Map {
  get contents() { return [...this.values()]; }
  find(f) { return this.contents.find(f); }
  filter(f) { return this.contents.filter(f); }
}
const hooks = new Map();
const chat = [];
let worldTime = 1000;
let faces = [];
const users = new Coll();
const gm = {id: "gm", isGM: true, active: true}, player = {id: "pl", isGM: false, active: true};
users.set("gm", gm); users.set("pl", player);
Object.defineProperty(users, "activeGM", {get: () => gm});
let me = gm;
const scene = {id: "scn1", name: "Gate town", grid: {size: G, units: "ft"}, walls: new Coll(), tiles: new Coll(), tokens: new Coll(), lights: new Coll()};
const uuids = new Map();
const damage = [];

function wall(id, c, door, ds, flags = {}) {
  const doc = {id, c, door, ds, levels: new Set(), flags: {[MOD]: flags}, parent: scene,
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(doc, k, v); return doc; }};
  scene.walls.set(id, doc);
  return {id, document: doc};
}
function tile(id, x, y, flags = {}, {hidden = false} = {}) {
  const doc = {id, documentName: "Tile", x, y, width: G, height: G, hidden, levels: new Set(), flags: {[MOD]: flags}, parent: scene,
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(doc, k, v); return doc; }};
  scene.tiles.set(id, doc);
  return {id, document: doc};
}
let itemSeq = 0;
function actor(id, name, {str = 2, dex = 3, per = 3, larceny = 2, player: pc = true, items = []} = {}) {
  items.get = itemId => items.find(i => i.id === itemId);
  return {id, name, hasPlayerOwner: pc, items, flags: {},
    async createEmbeddedDocuments(type, data) { const made = data.map(d => ({...structuredClone(d), id: `it${++itemSeq}`})); items.push(...made); return made; },
    async deleteEmbeddedDocuments(type, idsToGo) { for ( const x of idsToGo ) { const k = items.findIndex(i => i.id === x); if ( k >= 0 ) items.splice(k, 1); } return idsToGo; },
    system: {attributes: {strength: {value: str}, dexterity: {value: dex}, perception: {value: per}, intelligence: {value: 2}},
      abilities: {larceny: {value: larceny, type: "skill", isvisible: true}, stealth: {value: 1, type: "skill"}, alertness: {value: 2, type: "talent"}},
      advantages: {willpower: {temporary: 3}}, health: {damage: {woundpenalty: 0}}},
    async update(data) { for ( const [k, v] of Object.entries(data) ) setPath(this, k, v); return this; }};
}
function token(id, a, x, y, owner = "pl") {
  const doc = {id, x, y, width: 1, height: 1, actor: a, hidden: false, parent: scene, uuid: `Scene.scn1.Token.${id}`, testUserPermission: u => u.isGM || u.id === owner, get isOwner() { return me.isGM || me.id === owner; }};
  const t = {id, name: a.name, actor: a, document: doc, w: G, h: G, get center() { return {x: doc.x + G / 2, y: doc.y + G / 2}; }};
  doc.object = t;
  uuids.set(doc.uuid, doc);
  scene.tokens.set(id, doc);
  return t;
}
class FakeRoll {
  constructor(formula) { this.n = Number(formula.split("d")[0]); }
  async evaluate() { this.dice = [{results: Array.from({length: this.n}, (_, k) => ({result: faces[k] ?? 5}))}]; return this; }
}

globalThis.Hooks = {
  on: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); },
  once: (n, f) => { if ( !hooks.has(n) ) hooks.set(n, []); hooks.get(n).push(f); },
  callAll: (n, ...a) => { for ( const f of hooks.get(n) ?? [] ) f(...a); }
};
const settings = new Map();
globalThis.CONST = {WALL_DOOR_STATES: {CLOSED: 0, OPEN: 1, LOCKED: 2}, WALL_DOOR_TYPES: {NONE: 0, DOOR: 1, SECRET: 2}, EDGE_SENSE_TYPES: {NONE: 0, NORMAL: 20}, WALL_MOVEMENT_TYPES: {NONE: 0, NORMAL: 20}};
const blockedPairs = [];
globalThis.CONFIG = {Canvas: {polygonBackends: Object.fromEntries(["move", "sight", "sound"].map(t => [t, {testCollision: (a, b, {mode}) => {
  // A test wall stops a sense when the line between the points crosses it
  const hits = blockedPairs.filter(w => w.types.includes(t) && crosses(w.c, a, b));
  return mode === "all" ? hits : hits.length > 0;
}}]))}, sounds: {dice: "dice.wav"}};
function crosses(c, a, b) {
  const s1 = R.sideOf(c, a), s2 = R.sideOf(c, b);
  if ( !s1 || !s2 || s1 === s2 ) return false;
  const d = [b.x - a.x, b.y - a.y], s3 = R.sideOf([a.x, a.y, b.x, b.y], {x: c[0], y: c[1]}), s4 = R.sideOf([a.x, a.y, b.x, b.y], {x: c[2], y: c[3]});
  return d && s3 !== s4;
}
globalThis.foundry = {utils: {deepClone: o => (o === undefined ? o : structuredClone(o)), randomID: () => Math.random().toString(36).slice(2)}, data: {operators: {ForcedDeletion}},
  applications: {api: {DialogV2: {wait: async () => null}}}};
globalThis.Roll = FakeRoll;
globalThis.ui = {notifications: {info: () => {}, warn: () => {}}};
globalThis.fromUuid = async u => uuids.get(u) ?? null;
const proposals = [];
const time = {get worldTime() { return worldTime; }, advance: async s => { worldTime += s; }};
globalThis.game = {
  users, get user() { return me; }, time, scenes: new Coll([["scn1", scene]]), combat: null,
  settings: {register: (m, k, cfg) => settings.set(`${m}.${k}`, cfg.default), get: (m, k) => settings.get(`${m}.${k}`)},
  keybindings: {register: () => {}},
  modules: new Coll([[MOD, {}], ["wodx-chronicle", {api: {propose: async p => proposals.push(p), registerApprovalHandler: () => {}, eras: {activeEra: () => ({profile: {id: "victorian"}}), currentYear: () => 1890}}}]]),
  wodxActions: {getKind: () => "mortal"},
  wodxCombat: {applyDamage: async (a, t, n) => damage.push([a.id, t, n]), healDamage: async (a, t, n) => damage.push([a.id, t, -n]),
    soakAndApply: async (tok, fd) => {
      const a = tok.actor ?? tok, levels = Math.max(0, fd.amount - 1);
      damage.push([a.id, fd.type, levels, "soaked"]);
      const msg = {id: `c${chat.length}`, flags: {"wodx-combat": {data: {type: fd.type, levels, applied: true, undo: {uuid: a.id, damage: {lethal: 0}}}}}, async delete() { game.messages.delete(this.id); this.deleted = true; }};
      game.messages.set(msg.id, msg);
      return {levels, message: msg};
    },
    setDamage: async (a, d) => damage.push([a.id, "set", d])},
  messages: new Coll(),
  items: {getName: n => worldItems.find(i => i.name === n) ?? null}
};
const worldItems = [{name: "Ledger of debts", documentName: "Item", toObject() { return {name: this.name, type: "Feature", system: {}}; }}];
uuids.set("Item.dagger", {name: "Silver dagger", documentName: "Item", toObject() { return {_id: "dagger", name: this.name, type: "Melee", system: {}}; }});
globalThis.ChatMessage = {
  getSpeaker: ({token: t}) => ({alias: t?.object?.name ?? t?.actor?.name ?? "?"}),
  create: async data => {
    const msg = {id: `m${chat.length}`, ...structuredClone({...data, rolls: undefined}), rolls: data.rolls ?? [], author: me,
      async update(d) { for ( const [k, v] of Object.entries(d) ) setPath(msg, k, v); return msg; },
      async delete() { game.messages.delete(msg.id); return msg; }};
    chat.push(msg);
    game.messages.set(msg.id, msg);
    // The Storyteller's client picks the card up
    if ( msg.flags?.[MOD]?.ask ) { const was = me; me = gm; try { await game.modules.get(MOD).api.applyAsk(msg); } finally { me = was; } }
    return msg;
  }
};
globalThis.document = {styleSheets: [], querySelector: () => null, head: {appendChild: () => {}}, createElement: () => ({})};

const pc = actor("pc1", "Anna Weiss", {items: [{name: "Lock picks"}]});
const npc = actor("npc1", "Sergeant Volker", {player: false});
const tokPc = token("tpc", pc, 400, 300);        // above the door wall, side "b" of [300,500]-[600,500]... set below
const tokNpc = token("tnpc", npc, 400, 1500, "gm");
const door = wall("door1", [300, 450, 600, 450], 1, 2, {lock: "good"});
const win = wall("win1", [560, 250, 560, 380], 1, 0, {kind: "window"});
const far = wall("far1", [3000, 3000, 3300, 3000], 1, 2, {});
const brk = wall("brk1", [300, 200, 300, 400], 0, 0, {wall: "wattle"});
const chest = tile("chest1", 250, 250, {container: true, kind: "chest", lock: "good", items: "Item.dagger\nLedger of debts\nA thing nobody made"});
const hiddenBox = tile("box1", 450, 250, {container: true, kind: "box"}, {hidden: true});
const farSafe = tile("safe1", 2500, 2500, {container: true, kind: "safe", lock: "masterwork"});
globalThis.canvas = {scene, grid: {size: G, measurePath: ([a, b]) => ({distance: Math.hypot(a.x - b.x, a.y - b.y) / G * 5})},
  walls: {placeables: [door, win, far, brk]}, tiles: {placeables: [chest, hiddenBox, farSafe]}, tokens: {placeables: [tokPc, tokNpc], controlled: [tokPc], get: id => [tokPc, tokNpc].find(t => t.id === id)}};
await import(join(root, "modules/wodx-interactables/scripts/main.mjs"));
for ( const f of hooks.get("init") ?? [] ) f();
const api = game.modules.get(MOD).api;

test("runtime: within reach, nearest first; far doors and other levels are left out", () => {
  const list = api.interactablesFor(tokPc);
  assert.deepEqual(list.filter(x => !x.o.container && !x.o.clue && !x.o.trap && !x.o.light).map(x => x.doc.id), ["door1", "win1", "brk1"]);
  door.document.levels = new Set(["upper"]);
  tokPc.document.level = "ground";
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  door.document.levels = new Set();
  delete tokPc.document.level;
});

test("runtime: a door behind another wall is out of reach", () => {
  blockedPairs.push({c: [350, 420, 550, 420], types: ["move"]});
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  blockedPairs.length = 0;
});

test("runtime: a secret door is hidden from players until found", () => {
  door.document.door = 2;
  me = player;
  assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  door.document.flags[MOD].found = true;
  assert.ok(api.interactablesFor(tokPc).some(x => x.doc.id === "door1"));
  me = gm;
  door.document.door = 1;
  delete door.document.flags[MOD].found;
});

test("runtime: picking the lock, rolled on the player's side, applied by the Storyteller's, with the clock untouched for turns", async () => {
  me = player;
  faces = [8, 9, 3, 2, 7];          // 3 successes at 6
  const t0 = worldTime;
  const msg = await api.attempt(tokPc, "door1", "pick", {fd: {bonus: 0, extraDiff: 0}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.dice, 5);
  assert.equal(msg.flags[MOD].ask.diff, 6);
  assert.equal(msg.flags[MOD].done.result, "done");
  assert.equal(door.document.ds, 0, "unlocked, still closed");
  assert.equal(worldTime, t0, "a turn does not move the clock");
  assert.match(msg.content, /Undo/);
  await api.undoCard(msg);
  assert.equal(door.document.ds, 2, "Undo locks it again");
  assert.match(msg.content, /Undone/);
});

test("runtime: a masterwork lock keeps its progress, moves the clock, and the next roll goes on from there", async () => {
  door.document.flags[MOD].lock = "masterwork";
  faces = [9, 9, 3, 2, 2];          // 2 at 9
  const t0 = worldTime;
  const m1 = await api.attempt(tokPc, "door1", "pick", {fd: {}});
  assert.equal(m1.flags[MOD].done.result, "progress");
  assert.equal(door.document.flags[MOD].progress.pick, 2);
  assert.equal(worldTime - t0, 300, "five minutes on the clock");
  faces = [10, 10, 10, 10, 10];
  await api.attempt(tokPc, "door1", "pick", {fd: {}});
  assert.equal(door.document.flags[MOD].progress.pick, 7);
  await api.undoCard(m1);
  door.document.flags[MOD] = {lock: "good"};
});

test("runtime: a botched force hurts, is loud, and the NPC in earshot hears it; Undo heals", async () => {
  tokNpc.document.y = 700; // within 30 yards, on the far side
  faces = [1, 1];
  const msg = await api.attempt(tokPc, "door1", "force", {fd: {}});
  const done = msg.flags[MOD].done;
  assert.equal(done.result, "botch");
  assert.deepEqual(damage.at(-1), ["pc1", "lethal", 1]);
  assert.ok(done.lines.some(l => /Heard by Sergeant Volker/.test(l)), done.lines.join(" | "));
  await api.undoCard(msg);
  assert.deepEqual(damage.at(-1), ["pc1", "lethal", -1]);
  tokNpc.document.y = 1500;
});

test("runtime: forcing it open; a sound wall between keeps the NPC from hearing", async () => {
  tokNpc.document.y = 2400; // 21 yards away
  blockedPairs.push({c: [0, 1800, 2000, 1800], types: ["sound"]});
  faces = [9, 9];
  const msg = await api.attempt(tokPc, "door1", "force", {fd: {}});
  assert.equal(door.document.ds, 1);
  assert.ok(!msg.flags[MOD].done.lines.some(l => /Heard by/.test(l)));
  blockedPairs.length = 0;
  await api.undoCard(msg);
  assert.equal(door.document.ds, 2);
  tokNpc.document.y = 1500;
});

test("runtime: a player cannot act for someone else's character", async () => {
  me = {id: "other", isGM: false, active: true};
  const msg = await ChatMessage.create({content: "<h3>x</h3>", flags: {[MOD]: {ask: {scene: "scn1", wall: "door1", token: tokPc.document.uuid, op: "knock"}}}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.state, "refused");
  assert.equal(door.document.ds, 2);
});

test("runtime: a card for something that no longer applies changes nothing", async () => {
  me = player;
  const msg = await ChatMessage.create({content: "<h3>x</h3>", flags: {[MOD]: {ask: {scene: "scn1", wall: "door1", token: tokPc.document.uuid, op: "close"}}}});
  me = gm;
  assert.equal(msg.flags[MOD].ask.state, "refused");
});

test("runtime: the pane breaks at once, can't be closed after, and Undo mends it", async () => {
  const msg = await api.attempt(tokPc, "win1", "smash");
  assert.equal(win.document.ds, 1);
  assert.equal(win.document.flags[MOD].broken, true);
  assert.equal(api.rules.optionsFor(api.describeWall(win.document), api.characterFor(pc, tokPc.center, win.document)).length, 0);
  await api.undoCard(msg);
  assert.equal(win.document.ds, 0);
  assert.equal(win.document.flags[MOD].broken, undefined);
});

test("runtime: breaking through a wall waits in the approval queue; the wall stays until approved", async () => {
  faces = [9, 9, 9];
  pc.system.attributes.strength.value = 3;
  const msg = await api.attempt(tokPc, "brk1", "breach", {fd: {}});
  assert.equal(msg.flags[MOD].done.waiting, true);
  assert.equal(proposals.at(-1).type, `${MOD}.breach`);
  assert.equal(brk.document.flags[MOD].breached, undefined);
  pc.system.attributes.strength.value = 2;
});

test("runtime: Willpower is spent from the sheet and counts one success", async () => {
  faces = [2, 2, 2, 2, 2];
  const before = pc.system.advantages.willpower.temporary;
  const msg = await api.attempt(tokPc, "door1", "pick", {fd: {willpower: true}});
  assert.equal(pc.system.advantages.willpower.temporary, before - 1);
  assert.equal(door.document.flags[MOD].progress.pick, 1);
  await api.undoCard(msg);
  pc.system.advantages.willpower.temporary = before;
});

test("runtime: the WoDX part of the wall config names the bar sides by compass and keeps the saved choices", () => {
  const html = api.configHtml({c: [0, 0, 100, 0], flags: {[MOD]: {lock: "excellent", barSide: "a", keyName: "Cellar key"}}});
  assert.match(html, /On the south side/);
  assert.match(html, /On the north side/);
  assert.match(html, /value="excellent" selected/);
  assert.match(html, /value="Cellar key"/);
  assert.match(html, /data-fixed/);
});

test("runtime: the summary before a roll names pool, difficulty, successes, time and noise", () => {
  const o = api.describeWall(door.document);
  const pick = api.rules.optionsFor(o, api.characterFor(pc, tokPc.center, door.document)).find(x => x.id === "pick");
  const s = api.optionSummary(pick);
  assert.match(s, /Dexterity \+ Larceny: 5 dice at 6/);
  assert.match(s, /3 successes needed/);
  assert.match(s, /a turn a roll/);
  assert.match(s, /quiet/);
});

test("runtime: containers on tiles are in the Interact list; a hidden one only for the Storyteller; a far one not at all", () => {
  me = player;
  try {
    const list = api.interactablesFor(tokPc).map(x => x.doc.id);
    assert.ok(list.includes("chest1"));
    assert.ok(!list.includes("box1"));
    assert.ok(!list.includes("safe1"));
  } finally { me = gm; }
  assert.ok(api.interactablesFor(tokPc).map(x => x.doc.id).includes("box1"));
});

test("runtime: a chest is picked, opened and emptied; the items go to the character, and Undo takes them back", async () => {
  faces = [9, 9, 9, 9, 9];
  me = player;
  try {
    const pick = await api.attempt(tokPc, "chest1", "pick", {fd: {}});
    assert.equal(pick.flags[MOD].done.result, "done");
    assert.equal(chest.document.flags[MOD].ds, "closed");
    await api.attempt(tokPc, "chest1", "open");
    assert.equal(chest.document.flags[MOD].ds, "open");
    const before = pc.items.length;
    const take = await api.attempt(tokPc, "chest1", "take");
    const d = take.flags[MOD].done;
    assert.equal(d.given.length, 2);
    assert.equal(pc.items.length, before + 2);
    assert.ok(pc.items.some(i => i.name === "Silver dagger" && i.flags[MOD].from === "Item.dagger" && !i._id));
    assert.ok(d.lines.some(l => /Silver dagger and Ledger of debts/.test(l)));
    assert.ok(d.lines.some(l => /A thing nobody made/.test(l)));
    assert.equal(chest.document.flags[MOD].taken, true);
    me = gm;
    await api.undoCard(take);
    assert.equal(pc.items.length, before);
    assert.equal(chest.document.flags[MOD].taken, undefined);
  } finally { me = gm; }
});

test("runtime: the WoDX part of the tile config keeps the container's choices", () => {
  const html = api.tileConfigHtml({flags: {[MOD]: {container: true, kind: "safe", lock: "good", items: "Item.x"}}});
  assert.match(html, /value="safe" selected/);
  assert.match(html, /value="good" selected/);
  assert.match(html, /value="locked" selected/);
  assert.match(html, />Item.x<\/textarea>/);
  assert.match(html, /data-fixed/);
});

/* ---------------- traps ---------------- */

const pit = tile("pit1", 400, 700, {trap: true, trapKind: "pit", grade: "good", dice: 3}, {hidden: true});
const snare = tile("snare1", 900, 300, {trap: true, trapKind: "snare", grade: "crude", found: true});
canvas.tiles.placeables.push(pit, snare);

test("runtime: a hidden trap is not in a player's Interact list until found; a found one is", () => {
  me = player;
  try {
    tokPc.document.x = 800; tokPc.document.y = 300;
    const list = api.interactablesFor(tokPc).map(x => x.doc.id);
    assert.ok(list.includes("snare1"));
    tokPc.document.x = 400; tokPc.document.y = 600;
    assert.ok(!api.interactablesFor(tokPc).map(x => x.doc.id).includes("pit1"));
  } finally { me = gm; tokPc.document.x = 400; tokPc.document.y = 300; }
  tokPc.document.x = 400; tokPc.document.y = 600;
  assert.ok(api.interactablesFor(tokPc).map(x => x.doc.id).includes("pit1"), "the Storyteller sees it");
  tokPc.document.x = 400; tokPc.document.y = 300;
});

test("runtime: searching finds a trap the successes reach, shows it to players, tells the Storyteller what was missed; Undo hides it again", async () => {
  tokPc.document.x = 400; tokPc.document.y = 550;
  me = player;
  try {
    faces = [3, 4, 9, 2, 2];        // one success: not enough for a good trap
    const m1 = await api.attempt(tokPc, "_search", "search", {fd: {}});
    assert.equal(pit.document.hidden, true);
    assert.ok(chat.some(c => c.whisper?.includes("gm") && /Missed, still hidden: Pit \(good\)/.test(c.content)));
    assert.ok(!m1.content.includes("Pit"), "the player's card names nothing missed");
    faces = [9, 9, 2, 2, 2];
    const m2 = await api.attempt(tokPc, "_search", "search", {fd: {}});
    assert.equal(m2.flags[MOD].done.result, "done");
    assert.equal(pit.document.hidden, false);
    assert.equal(pit.document.flags[MOD].found, true);
    assert.ok(m2.flags[MOD].done.lines.some(l => /finds a pit/.test(l)));
    me = gm;
    await api.undoCard(m2);
    assert.equal(pit.document.hidden, true);
    assert.equal(pit.document.flags[MOD].found, false);
  } finally { me = gm; tokPc.document.x = 400; tokPc.document.y = 300; }
});

test("runtime: walking over a hidden trap springs it; damage goes through WoDX Combat; Undo puts back the trap, the damage and the card", async () => {
  me = gm;
  await hooks.get("canvasReady")[0]();
  faces = [2, 2, 2, 2, 2];          // no successes getting clear
  tokPc.document.y = 900;            // from (450,350) to (450,950): straight through the pit at y 700-800
  const cards = await api.onTokenMoved(tokPc.document);
  assert.equal(cards.length, 1);
  const done = cards[0].flags[MOD].done;
  assert.match(done.text, /falls into the pit/);
  assert.deepEqual(damage.at(-1), ["pc1", "bashing", 2, "soaked"]);
  assert.equal(pit.document.flags[MOD].sprung, true);
  assert.equal(pit.document.hidden, false);
  assert.equal(api.describeTile(pit.document).armed, false);
  // Moving on: a sprung trap does not go off again
  tokPc.document.y = 1000;
  assert.equal((await api.onTokenMoved(tokPc.document)).length, 0);
  await api.undoCard(cards[0]);
  assert.equal(pit.document.hidden, true);
  assert.equal(pit.document.flags[MOD].sprung, undefined);
  assert.deepEqual(damage.at(-1), ["pc1", "set", {lethal: 0}]);
  assert.ok(!game.messages.has(done.damageMsg), "the combat card is gone");
  tokPc.document.y = 300;
  await api.onTokenMoved(tokPc.document);
});

test("runtime: a found trap is safe to walk past but not to stop on; NPCs set it off only when the Storyteller says so", async () => {
  tokPc.document.x = 900; tokPc.document.y = 100;
  await hooks.get("canvasReady")[0]();
  tokPc.document.y = 500;            // past the snare at 900-1000 x 300-400, ending below it
  assert.equal((await api.onTokenMoved(tokPc.document)).length, 0);
  faces = [2, 2, 2];
  tokPc.document.y = 300;            // stops on it
  const cards = await api.onTokenMoved(tokPc.document);
  assert.equal(cards.length, 1);
  assert.equal(snare.document.flags[MOD].holding, "pc1");
  assert.ok(cards[0].flags[MOD].done.lines.some(l => /held until breaking free/.test(l)));
  // Held: the only option is to break free
  const ops = R.optionsFor(api.describeTile(snare.document), api.characterFor(pc, tokPc.center, snare.document));
  assert.deepEqual(ops.map(o => o.id), ["breakFree"]);
  await api.undoCard(cards[0]);
  assert.equal(snare.document.flags[MOD].holding, undefined);
  assert.equal(snare.document.flags[MOD].armed, undefined);
  tokNpc.document.x = 900; tokNpc.document.y = 100;
  await hooks.get("canvasReady")[0]();
  tokNpc.document.y = 300;
  assert.equal((await api.onTokenMoved(tokNpc.document)).length, 0, "NPCs pass unless ticked");
  tokPc.document.x = 400; tokPc.document.y = 300; tokNpc.document.x = 400; tokNpc.document.y = 1500;
});

test("runtime: a botched disarm sets the trap off on the one disarming it; Undo puts it all back", async () => {
  tokPc.document.x = 800; tokPc.document.y = 300;
  me = player;
  try {
    faces = [1, 2, 3, 4, 2];        // a botch at 5
    const msg = await api.attempt(tokPc, "snare1", "disarm", {fd: {}});
    const d = msg.flags[MOD].done;
    assert.equal(d.result, "botch");
    assert.equal(snare.document.flags[MOD].sprung, true);
    assert.equal(snare.document.flags[MOD].holding, "pc1");
    assert.ok(d.lines.some(l => /caught in the snare/.test(l)));
    me = gm;
    await api.undoCard(msg);
    assert.equal(snare.document.flags[MOD].sprung, undefined);
    faces = [9, 2, 2, 2, 2];
    me = player;
    const ok = await api.attempt(tokPc, "snare1", "disarm", {fd: {}});
    assert.equal(ok.flags[MOD].done.result, "done");
    assert.equal(api.describeTile(snare.document).armed, false);
    me = gm;
    await api.undoCard(ok);
    assert.equal(api.describeTile(snare.document).armed, true);
  } finally { me = gm; tokPc.document.x = 400; tokPc.document.y = 300; }
});

test("runtime: the WoDX part of the tile config keeps the trap's choices", () => {
  const html = api.tileConfigHtml({flags: {[MOD]: {trap: true, trapKind: "blade", grade: "masterwork", dice: 7, npcs: true}}});
  assert.match(html, /value="blade" selected/);
  assert.match(html, /value="masterwork" selected/);
  assert.match(html, /name="flags.wodx-interactables.dice" value="7"/);
  assert.match(html, /name="flags.wodx-interactables.npcs" checked/);
  assert.match(html, /name="flags.wodx-interactables.armed" checked/);
});

/* ---------------- clues ---------------- */

const letter = tile("clue1", 300, 150, {clue: true, clueKind: "document", title: "A torn letter", text0: "Half a page, torn.", text1: "A woman's name: Greta.", text2: "Written in haste.", text3: "The seal is the bishop's."});
const stain = tile("clue2", 500, 150, {clue: true, clueKind: "mark", need: 2, text0: "A dark stain.", text1: "Blood, a day old."}, {hidden: true});
canvas.tiles.placeables.push(letter, stain);

test("runtime: examining a clue whispers what the successes reach to the player and the Storyteller; Undo takes it back", async () => {
  me = player;
  try {
    assert.ok(api.interactablesFor(tokPc).some(x => x.doc.id === "clue1"));
    assert.ok(!api.interactablesFor(tokPc).some(x => x.doc.id === "clue2"), "a hidden clue waits for a search");
    pc.system.abilities.investigation = {value: 1, type: "knowledge", isvisible: true};
    faces = [9, 9, 2];               // Intelligence 2 + Investigation 1: two successes
    const msg = await api.attempt(tokPc, "clue1", "examine", {fd: {}});
    delete pc.system.abilities.investigation;
    const d = msg.flags[MOD].done;
    assert.equal(d.result, "done");
    const w = game.messages.get(d.whisper);
    assert.deepEqual(w.whisper.sort(), ["gm", "pl"]);
    assert.match(w.content, /Half a page/); assert.match(w.content, /Greta/); assert.match(w.content, /in haste/);
    assert.ok(!/bishop/.test(w.content), "three successes' worth stays hidden");
    assert.ok(!/Greta/.test(msg.content), "the public card says nothing of it");
    assert.equal(letter.document.flags[MOD].seen.pc1, 2);
    me = gm;
    await api.undoCard(msg);
    assert.equal(game.messages.has(d.whisper), false);
    assert.equal(letter.document.flags[MOD].seen, undefined);
  } finally { me = gm; }
});

test("runtime: a search notices a hidden clue when the successes reach it, and shows it", async () => {
  me = player;
  try {
    faces = [9, 2, 2, 2, 2];
    await api.attempt(tokPc, "_search", "search", {fd: {}});
    assert.equal(stain.document.hidden, true, "one success is not enough");
    faces = [9, 9, 2, 2, 2];
    const m = await api.attempt(tokPc, "_search", "search", {fd: {}});
    assert.equal(stain.document.hidden, false);
    assert.ok(m.flags[MOD].done.lines.some(l => /notices something: bloodstain or mark/.test(l)), m.flags[MOD].done.lines.join(" | "));
    assert.ok(api.interactablesFor(tokPc).some(x => x.doc.id === "clue2"));
    me = gm;
    await api.undoCard(m);
    assert.equal(stain.document.hidden, true);
  } finally { me = gm; }
});

test("runtime: the WoDX part of the tile config keeps the clue's text", () => {
  const html = api.tileConfigHtml({flags: {[MOD]: {clue: true, clueKind: "trail", title: "Prints", need: 3, text2: "Two people <and> a dog"}}});
  assert.match(html, /value="trail" selected/);
  assert.match(html, /name="flags.wodx-interactables.need" value="3"/);
  assert.match(html, />Two people &lt;and&gt; a dog<\/textarea>/);
});

/* ---------------- light sources ---------------- */

function light(id, x, y, hidden, flags = {}) {
  const doc = {id, x, y, hidden, flags, parent: scene, async update(d) { for ( const [k, v] of Object.entries(d) ) setPath(doc, k, v); return doc; }};
  scene.lights.set(id, doc);
  return doc;
}
const lamp1 = light("light1", 760, 220, true);
const lampTwin = light("light1p", 760, 220, true, {"wodx-otherworlds": {twinOf: "light1", layer: "penumbra"}});
const farLight = light("light9", 2000, 2000, true);
const lantern = tile("lamp1", 700, 200, {light: true, lightKind: "lantern"});
canvas.tiles.placeables.push(lantern);

test("runtime: a lantern works the lights on or beside it and their Otherworlds copies; Undo puts them back", async () => {
  assert.deepEqual(api.lightsOf(lantern.document).map(l => l.id), ["light1", "light1p"]);
  tokPc.document.x = 700; tokPc.document.y = 300;
  me = player;
  try {
    assert.equal(R.nameOf(api.describeTile(lantern.document)), "Lantern, dark");
    const on = await api.attempt(tokPc, "lamp1", "lightOn");
    assert.equal(on.flags[MOD].done.result, "done");
    assert.equal(lamp1.hidden, false); assert.equal(lampTwin.hidden, false); assert.equal(farLight.hidden, true);
    assert.equal(R.nameOf(api.describeTile(lantern.document)), "Lantern, lit");
    const br = await api.attempt(tokPc, "lamp1", "breakLight");
    assert.equal(lamp1.hidden, true); assert.equal(lantern.document.flags[MOD].broken, true);
    me = gm;
    await api.undoCard(br);
    assert.equal(lamp1.hidden, false); assert.equal(lantern.document.flags[MOD].broken, undefined);
    await api.undoCard(on);
    assert.equal(lamp1.hidden, true); assert.equal(lampTwin.hidden, true);
  } finally { me = gm; tokPc.document.x = 400; tokPc.document.y = 300; }
  lantern.document.flags[MOD].lightIds = "light9";
  assert.deepEqual(api.lightsOf(lantern.document).map(l => l.id), ["light9"], "named lights win over nearby ones");
  delete lantern.document.flags[MOD].lightIds;
});
