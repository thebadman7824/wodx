/* B6550-B6566: the Dominion cantrips of Dark Ages: Fae as presets, the sprite Charms (DA:Fae p. 97), and faerie Treasures
 * for every era (DA:Fae pp. 187-191, Changeling 20th pp. 324-326, 368). */
import { test } from "node:test";
import assert from "node:assert/strict";

const DC = await import("../../modules/wodx-actions/scripts/fae-da-cantrips.js");
const TR = await import("../../modules/wodx-actions/scripts/fae-treasures.js");
const SC = await import("../../modules/wodx-actions/scripts/spirit-charms.js");
const FX = await import("../../modules/wodx-actions/scripts/fae-da.js");
const F = await import("../../modules/wodx-actions/scripts/fae-da-rules.js");

test("every book cantrip has its Dominion, level, trait, page and a summary in WoDX's words", () => {
  assert.ok(DC.IDS.length >= 180, `only ${DC.IDS.length} presets`);
  for (const id of DC.IDS) {
    const c = DC.CANTRIPS[id];
    assert.ok(F.DOMINIONS[c.dominion], `${id} dominion`);
    assert.ok(c.level >= 1 && c.level <= 5, `${id} level`);
    assert.ok(c.trait, `${id} trait`);
    assert.ok(c.page >= 120 && c.page <= 165, `${id} page ${c.page}`);
    assert.ok(c.fx.length > 15, `${id} summary`);
    assert.doesNotMatch(c.fx, /—/, `${id}: no em-dash`);
    // what it does is read by a system, or is a special handler, or a Treasure maker, or plainly the Storyteller's
    assert.ok(c.spec !== undefined && (c.spec || c.does || c.imbue || id === "dominion-writ"), `${id} has no effect`);
  }
});

test("each Dominion has all five levels, and the common cantrips exist in every Dominion", () => {
  for (const d of F.DOMINION_IDS) for (let l = 1; l <= 5; l++) assert.ok(DC.presetsFor(d, 5).some(c => c.level === l), `${d} ${l}`);
  for (const d of F.DOMINION_IDS) assert.equal(DC.presetOf("Sword", d)?.dominion, d);
  assert.equal(DC.presetOf("Saining", "night")?.id, "saining-night");
});

test("a book cantrip sets its difficulty, needed successes and effect", () => {
  const entice = DC.presetOf("Entice", "dawn");
  assert.equal(DC.baseDifficulty(entice, { targetWillpower: 8 }), 8);
  assert.equal(DC.meets(entice, 2).ok, false);
  assert.equal(DC.meets(entice, 3).ok, true);
  assert.equal(DC.presetResults(entice.id, 2).length, 0, "too few successes does nothing");
  assert.ok(DC.presetResults(entice.id, 3).length > 0);
  const armor = DC.presetOf("Earth's Armor", "dawn");
  const [r] = DC.presetResults(armor.id, 3);
  assert.equal(r.key, "ward");
  assert.equal(r.out.dice, 3, "a soak die a success");
  const tears = DC.presetOf("Immortal Tears", "dawn");
  assert.equal(DC.presetResults(tears.id, 5)[0].out.levels, 2, "an aggravated level for every two successes");
});

test("every book cantrip with an effect puts something on the effects card at five successes", () => {
  for (const id of DC.IDS) {
    const c = DC.CANTRIPS[id];
    if (!c.spec) continue;
    assert.ok(DC.presetResults(id, 5).length > 0, `${id} gives nothing`);
  }
});

test("the sheet line takes a book cantrip's level and effect; hand-written lines still work", () => {
  const [a, b, c] = FX.parseCantrips("Night 1: Hush (manipulation) [veil]\nDawn 9: Strength of the Oak\nDay 2: Sunflash [light]");
  assert.equal(a.preset, "hush");
  assert.deepEqual(a.kw, ["veil"]);
  assert.equal(b.preset, "strength-of-the-oak");
  assert.equal(b.level, 2, "the book's level, whatever the line says");
  assert.deepEqual(b.kw, ["boost"]);
  assert.equal(FX.cantripLine(b), "Dawn 2: Strength of the Oak (strength)");
  assert.equal(c.preset, undefined);
  assert.equal(FX.bookPicks({ day: 1, night: 0, dawn: 0, dusk: 0 }, []).every(p => DC.CANTRIPS[p.id].dominion === "day" && DC.CANTRIPS[p.id].level === 1), true);
});

test("the sprite Charms of Dark Ages: Fae p. 97", () => {
  assert.equal(SC.charmOf("Blast")?.key, "blast", "a W20 spirit keeps its Blast");
  assert.equal(SC.charmOf("Blast", { sprite: true })?.key, "spriteblast");
  assert.equal(SC.charmOf("Healing", { sprite: true })?.key, "spritehealing");
  assert.equal(SC.charmOf("Paralyzing Stare")?.key, "paralyzingstare");
  assert.ok(SC.isSpriteOf({ names: ["Animate Tools"] }));
  assert.ok(SC.isSpriteOf({ name: "Messenger Sprite" }));
  assert.ok(!SC.isSpriteOf({ name: "Rat spirit", names: ["Blast"] }));
  const blast = SC.BY_KEY.spriteblast, heal = SC.BY_KEY.spritehealing, stare = SC.BY_KEY.paralyzingstare, tools = SC.BY_KEY.animatetools;
  assert.equal(SC.costOf(blast, { size: "lethal:2" }), 6);
  assert.equal(SC.costOf(blast, { size: "aggravated:1" }), 6);
  assert.equal(SC.costOf(heal, { size: "lethal:1" }), 6, "healing costs twice as much");
  assert.equal(SC.costOf(stare, { targetKind: "mortal" }), 1);
  assert.equal(SC.costOf(stare, { targetKind: "spirit" }), 2);
  assert.equal(SC.costOf(stare, { targetKind: "kindred" }), 3);
  assert.equal(SC.diffOf(stare, { targetStamina: 3 }), 6);
  assert.equal(SC.diffOf(stare, { targetStamina: 3, targetRage: 4 }), 4, "a spirit's Rage");
  assert.equal(SC.costOf(tools, { size: "3" }), 6);
  assert.equal(SC.canPay(tools, { essence: 20, gnosis: 2 }, { size: "3" }).ok, false, "no more tools than its Gnosis");
  assert.equal(SC.pageOf(stare), "Dark Ages: Fae p. 97");
  assert.equal(SC.resultsOf(stare, 3)[0].out.condition ?? SC.resultsOf(stare, 3)[0].key, SC.resultsOf(stare, 3)[0].out.condition ? "immobilized" : "hold");
});

test("faerie Treasures: each has a book, a page, a use and an effect", () => {
  for (const [k, t] of Object.entries(TR.TREASURES)) {
    assert.ok(["da", "c20"].includes(t.book), k);
    assert.ok(t.page > 0, `${k} page`);
    assert.ok(t.spec || t.does, `${k} does nothing`);
    assert.doesNotMatch(t.fx, /—/, `${k}: no em-dash`);
    if (t.spec) assert.ok(TR.treasureResults(k, 3).length > 0, `${k} gives nothing on the card`);
    assert.ok(TR.bookItem(k).flags["wodx-actions"].treasure.key === k);
  }
  assert.equal(TR.dustResist(TR.TREASURES["dust-sleep"]), 6);
  assert.equal(TR.dustResist(TR.TREASURES["dust-pillar"]), null, "Willpower does not stop the Pillar of Fire");
  assert.equal(TR.useRoll(TR.TREASURES["dust-bliss"]).pool.join("+"), "dexterity+athletics");
  assert.equal(TR.useRoll(TR.TREASURES["gale-flute"]).diff, 8);
});

test("Excalibur's Scabbard: blades draw no blood; bashing stops at Injured", () => {
  const before = { bashing: 1, lethal: 0, aggravated: 0 };
  assert.equal(TR.scabbardKeeps("da", { type: "lethal", blade: true }, before, { bashing: 1, lethal: 3, aggravated: 0 }).kept, "ignored");
  assert.equal(TR.scabbardKeeps("da", { type: "lethal", blade: false }, before, { bashing: 1, lethal: 2, aggravated: 0 }).kept, "landed", "a fall is not a blade");
  const b = TR.scabbardKeeps("da", { type: "bashing" }, before, { bashing: 6, lethal: 0, aggravated: 0 });
  assert.equal(b.kept, "capped");
  assert.equal(b.bashing, 3);
  assert.equal(TR.scabbardKeeps("c20", { type: "aggravated", of: "fire" }, before, { bashing: 1, lethal: 0, aggravated: 2 }).kept, "landed", "fire still burns");
  assert.ok(TR.isBlade("Longsword") && !TR.isBlade("Fists"));
});

test("the Sword of Drowning, the Lightning gun, the Gale Flute, Glamour from a Treasure, oaths", () => {
  assert.deepEqual(TR.drowningStep(1, { successes: 0 }), { fails: 2, drowned: false, lostTurn: true });
  assert.equal(TR.drowningStep(2, { successes: 0 }).drowned, true);
  assert.equal(TR.drowningStep(2, { successes: 1 }).fails, 0);
  assert.equal(TR.drowningStep(0, { botch: true }).drowned, true);
  assert.equal(TR.lightningCharges(1), 0);
  assert.equal(TR.lightningCharges(3), 10);
  assert.equal(TR.lightningCharges(2, 8), 10, "ten at most");
  assert.equal(TR.galeOf(5).harm.dice, 12);
  assert.equal(TR.galeOf(4).harm.dice, 10);
  assert.equal(TR.galeOf(2).shift, 2);
  assert.deepEqual(TR.glamourDraw(1, 0, 1), { ok: true, fromItem: 1, fromUser: 0 });
  assert.deepEqual(TR.glamourDraw(0, 2, 1), { ok: true, fromItem: 0, fromUser: 1 });
  assert.equal(TR.glamourDraw(0, 0, 1).ok, false);
  const hammer = TR.TREASURES.shatterhammer;
  assert.equal(TR.oathLapsed(hammer, 0, 29 * 86400), false);
  assert.equal(TR.oathLapsed(hammer, 0, 31 * 86400), true);
});

test("the making cantrips leave a Treasure that holds a known cantrip", async () => {
  assert.equal(TR.toJuncture("day", { hour: 10 }), 7200);
  assert.equal(TR.toJuncture("night", { hour: 22 }), 7200);
  assert.equal(TR.toJuncture("dawn", { hour: 4, sunrise: 6 }), 7200);
  const it = TR.imbuedItem({ mode: "charm", cantrip: "strength-of-the-oak", successes: 3, object: "an oak twig", by: "Ysolde", clock: { hour: 2, sunrise: 6 }, now: 1000 });
  const f = it.flags["wodx-actions"].treasure;
  assert.equal(f.uses, 1);
  assert.equal(f.expires, 1000 + 4 * 3600, "fades at the Dominion's next hour (Dawn: sunrise)");
  assert.equal(TR.imbuedResults(f)[0].key, "boost");
  const tru = TR.imbuedItem({ mode: "true", cantrip: "strength-of-the-oak", successes: 3 });
  assert.equal(tru.flags["wodx-actions"].treasure.uses, null, "True Enchantment: again and again");
  assert.equal(tru.flags["wodx-actions"].treasure.expires, null);
  const c20 = TR.c20Item({ cantrip: Object.keys((await import("../../modules/wodx-actions/scripts/c20-arts.js")).CANTRIPS)[0], glamour: 12 });
  assert.equal(c20.flags["wodx-actions"].treasure.glamour, 10, "ten Glamour at most");
});
