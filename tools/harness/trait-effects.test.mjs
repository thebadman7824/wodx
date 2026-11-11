import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The trait effect table (WoDX Chronicle 0.18.0): matching, kinds on both sides, "Only when" tests, coverage */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const D = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/trait-effects.mjs")));
const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/when-rules.mjs")));

const feat = (name, kind = "merit", value = 0, flagKey = null) => ({id: name, name, kind, value, flagKey});

test("every V20 merit and flaw is in the table, with a pattern, holders, against and a page", () => {
  assert.equal(D.MERITS_FLAWS.filter(e => e.book === "V20").length, 162);
  assert.deepEqual(T.problems(), []);
});

test("names match without case, quotes or spaces, and through aliases", () => {
  assert.equal(T.matchFeature({name: "acute senses", kind: "merit"})?.key, "acute-sense");
  assert.equal(T.matchFeature({name: "Can't Cross Running Water", kind: "flaw"})?.key, "cant-cross-running-water");
  assert.equal(T.matchFeature({name: "Strong-Willed", kind: "merit"})?.key, "iron-will");
  assert.equal(T.matchFeature({name: "Herd", kind: "background"})?.kind, "background");
  assert.equal(T.matchFeature({name: "My own odd merit", kind: "merit"}), null);
});

test("the item flag overrides the name, and none leaves a trait alone", () => {
  assert.equal(T.matchFeature({name: "Stubborn", kind: "merit", flagKey: "iron-will"})?.key, "iron-will");
  assert.equal(T.matchFeature({name: "Iron Will", kind: "merit", flagKey: "none"}), null);
  const t = T.traitsOf({kind: "mortal", features: [feat("Iron Will", "merit", 3, "none")]});
  assert.equal(t.unmatched[0].skipped, true);
});

test("a trait on a kind that cannot hold it is matched but does nothing", () => {
  const t = T.traitsOf({kind: "mortal", features: [feat("Cast No Reflection", "flaw", 1), feat("Iron Will", "merit", 3)]});
  const cnr = t.matched.find(m => m.key === "cast-no-reflection");
  assert.equal(cnr.wrongKind, true);
  assert.match(cnr.why, /kindred/);
  assert.equal(t.matched.find(m => m.key === "iron-will").wrongKind, false);
  assert.equal(T.has({kind: "mortal", features: [feat("Cast No Reflection", "flaw")]}, "cast-no-reflection"), 0);
  assert.equal(T.has({kind: "kindred", features: [feat("Cast No Reflection", "flaw")]}, "cast-no-reflection"), 1);
});

test("mixed kinds count as both: a ghoul holds mortal and ghoul traits", () => {
  assert.equal(T.kindFits(["mortal"], "ghoul"), true);
  assert.equal(T.kindFits(["kindred", "ghoul"], "revenant"), true);
  assert.equal(T.kindFits(["kindred"], "ghoul"), false);
  assert.equal(T.kindFits(["any"], "spirit"), true);
});

test("effects read the other side's kind: Masquerade flaws only count against mortals", () => {
  const entry = {key: "x", name: "Test Flaw", kind: "flaw", holders: ["kindred"], against: ["mortal"], patterns: ["P1"], page: 1,
    effects: [{ch: "roll", tags: ["masquerade"], diff: 1, note: "+1 difficulty"}]};
  const idx = T.buildIndex([entry], []);
  const v = {kind: "kindred", features: [feat("Test Flaw", "flaw")]};
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["masquerade"], against: "mortal"}, idx).length, 1);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["masquerade"], against: "lupine"}, idx).length, 0);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["social"], against: "mortal"}, idx).length, 0);
  assert.equal(T.effectsFor({kind: "mortal", features: v.features}, {channel: "roll", tags: ["masquerade"]}, idx).length, 0);
});

test("NPCs and player characters are read the same way", () => {
  const pc = T.traitsOf({kind: "kindred", pc: true, features: [feat("Iron Will", "merit", 3)]});
  const npc = T.traitsOf({kind: "kindred", pc: false, features: [feat("Iron Will", "merit", 3)]});
  assert.deepEqual(pc.matched.map(m => m.key), npc.matched.map(m => m.key));
});

test("the system's Feature types map to merit, flaw and background", () => {
  assert.equal(T.featureKind("wod.types.merit"), "merit");
  assert.equal(T.featureKind("wod.types.flaw"), "flaw");
  assert.equal(T.featureKind("wod.types.background"), "background");
  assert.equal(T.featureKind("wod.types.discipline"), null);
});

test("Only when: merit, flaw, background with a rating, and power", () => {
  const actor = {pc: true, name: "Anna", kind: "kindred", fields: {}, factions: [], items: [], codex: [], conditions: [], traits: {},
    feats: [{name: "Strong-Willed", key: "iron-will", kind: "merit", value: 3, aliases: ["Iron Will"]}, {name: "Herd", key: "herd", kind: "background", value: 3, aliases: []},
      {name: "Hunted", key: "hunted", kind: "flaw", value: 4, aliases: []}],
    powers: ["Dread Gaze", "Awe"]};
  const ctx = {year: 1300, actor};
  assert.equal(W.checkWhen("merit iron will", ctx).ok, true);
  assert.equal(W.checkWhen("merit Strong-Willed", ctx).ok, true);
  assert.equal(W.checkWhen("flaw hunted", ctx).ok, true);
  assert.equal(W.checkWhen("not flaw lame", ctx).ok, true);
  assert.equal(W.checkWhen("background herd >= 3", ctx).ok, true);
  assert.equal(W.checkWhen("background herd >= 4", ctx).ok, false);
  assert.equal(W.checkWhen("power dread", ctx).ok, true);
  assert.equal(W.checkWhen("merit hunted", ctx).ok, false);
  assert.ok(W.parseTest("merit iron will >= 2").problem);
  assert.ok(W.parseTest("background").problem);
  assert.equal(W.checkWhen("merit iron will", {year: 1300}).ok, false);
});

test("every background found in the book checks has a hook, and the V20 ones are all there", () => {
  for ( const n of ["Allies", "Alternate Identity", "Black Hand Membership", "Contacts", "Domain", "Fame", "Generation", "Herd", "Influence", "Mentor", "Resources", "Retainers", "Rituals", "Status"] )
    assert.ok(D.BACKGROUNDS.some(b => b.name === n && b.books.includes("V20 core")), n);
  for ( const b of D.BACKGROUNDS ) assert.ok(D.BACKGROUND_HOOKS[b.hook], `${b.name}: ${b.hook}`);
});

/* Step 2: merits and flaws on rolls (WoDX Actions 3.29.0) */
const R = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/rules.js")));
const TH = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/trait-hooks.js")));

test("roll effects read the tags, the item's own words and the other side's kind", () => {
  const v = {kind: "kindred", features: [feat("Acute Sense (Hearing)"), feat("Eerie Presence", "flaw"), feat("Natural Leader")]};
  const hear = T.effectsFor(v, {channel: "roll", tags: ["perception", "hearing"]});
  assert.deepEqual(hear.map(e => [e.key, e.diff]), [["acute-sense", -2]]);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["sight"]}).length, 0);
  assert.equal(T.effectsFor({kind: "kindred", features: [feat("Acute Sense")]}, {channel: "roll", tags: ["hearing"]}).length, 0);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["social"], against: "mortal"}).find(e => e.key === "eerie-presence")?.diff, 2);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["social"], against: "kindred"}).some(e => e.key === "eerie-presence"), false);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["social"]}).some(e => e.key === "eerie-presence"), false);
  assert.equal(T.effectsFor(v, {channel: "roll", tags: ["leadership"]})[0].dice, 2);
});

test("Lunacy follows the moon; Calm Heart and Short Fuse change the frenzy roll", () => {
  const v = {kind: "kindred", features: [feat("Lunacy", "flaw"), feat("Calm Heart")]};
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["frenzy"], moon: "Full moon"})).diff, 3);
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["frenzy"], moon: "Waxing crescent"})).diff, 1);
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["frenzy"], moon: "New moon"})).diff, 0);
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["frenzy"], moon: "Full moon"})).dice, 2);
  const s = T.sumEffects(T.effectsFor({kind: "lupine", features: [feat("Short Fuse", "flaw")]}, {channel: "roll", tags: ["frenzy"]}));
  assert.deepEqual(s, {dice: 0, diff: 2, parts: ["Short Fuse +2 diff"]});
});

test("Iron Will and Magic Resistance make powers on the holder harder, NPC or player", () => {
  const npc = {kind: "mortal", pc: false, features: [feat("Iron Will"), feat("Magic Resistance")]};
  assert.equal(T.sumEffects(T.effectsFor(npc, {channel: "resist", tags: TH.powerTags("Dominate")})).diff, 3);
  assert.equal(T.sumEffects(T.effectsFor(npc, {channel: "resist", tags: TH.powerTags("Thaumaturgy: Potestas Vitae")})).diff, 5);
  assert.equal(T.sumEffects(T.effectsFor(npc, {channel: "resist", tags: TH.powerTags("Necromancy")})).diff, 2);
  assert.equal(T.sumEffects(T.effectsFor(npc, {channel: "resist", tags: TH.powerTags("Presence")})).diff, 0);
  assert.deepEqual(TH.powerTags("Dementation"), ["mind"]);
});

test("roll tags come from the pool, the quick check and the social action", () => {
  assert.deepEqual(T.rollTags("charisma", "leadership").sort(), ["leadership", "social"]);
  assert.ok(T.rollTags("check-notice").includes("sight"));
  assert.ok(T.rollTags("social-persuade").includes("voice"));
  assert.ok(T.rollTags("social-intimidate").includes("intimidation"));
  assert.deepEqual(T.rollTags("nothing-known"), []);
});

test("the action pool takes trait dice and difficulty and lists each trait", () => {
  const b = R.actionPool({attribute: 3, ability: 2, abilityKey: "leadership", baseDifficulty: 6, traitDice: 2, traitDiff: 1, traitParts: ["Natural Leader +2", "Child +2 diff"]});
  assert.equal(b.dice, 7);
  assert.equal(b.difficulty, 7);
  assert.ok(b.parts.includes("Natural Leader +2"));
  assert.equal(R.actionPool({attribute: 3, baseDifficulty: 6}).dice, 3);
});

test("every effect names a channel, tags, a size and a note", () => {
  for ( const e of D.MERITS_FLAWS ) for ( const x of e.effects ) {
    assert.ok(["roll", "resist"].includes(x.ch), e.key);
    assert.ok(x.tags?.length, e.key);
    assert.ok(x.dice || x.diff || x.moon, e.key);
    assert.ok(x.note && !/—/.test(x.note), e.key);
  }
  assert.ok(D.MERITS_FLAWS.filter(e => e.effects.length).length >= 35);
});

test("Actions wires the trait effects into actions, social rolls, frenzy and powers", async () => {
  const {readFileSync} = await import("node:fs");
  const rd = f => readFileSync(join(root, "modules/wodx-actions/scripts", f), "utf8");
  const m = rd("main.js"), s = rd("social.js"), k = rd("kindred.js");
  assert.match(m, /TH\.traitMods\(actor, \[\.\.\.TH\.tagsFor/);
  assert.match(m, /TH\.traitMods\(actor, ?\["frenzy"\]/);
  assert.match(m, /TH\.ticksHtml/);
  assert.match(s, /resist-social/);
  assert.match(k, /TH\.resistMods\(/);
});
