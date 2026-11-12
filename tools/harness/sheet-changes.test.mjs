import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.13.0 and Chronicle 0.43.0: changed since last session, and the features card */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const X = await import(join(root, "modules/wodx-sheets/scripts/extras-rules.mjs"));
const H = await import(join(root, "modules/wodx-sheets/scripts/extras-html.mjs"));
const S = await import(join(root, "modules/wodx-chronicle/scripts/signature-rules.mjs"));

const sys = (o = {}) => ({health: {damage: {bashing: 0, lethal: 0, aggravated: 0, ...(o.dmg ?? {})}},
  advantages: {willpower: {temporary: o.wp ?? 5, permanent: 5}, bloodpool: {temporary: o.blood ?? 10, max: 10}},
  settings: {hasbloodpool: true}, attributes: {strength: {value: o.str ?? 2}}, abilities: {brawl: {value: 1}}});
const xp = (amount, isspent, id) => ({_id: id, type: "Experience", name: "xp", system: {amount, isspent}});
const item = (id, name, qty = 1) => ({_id: id, type: "Item", name, flags: {"wodx-sheets": {qty}}, system: {}});

test("a snapshot holds the numbers and lists the strip compares", () => {
  const s = X.snapshotOf(sys(), [xp(5, false, "a"), xp(3, true, "b"), item("i1", "Rope"), {_id: "f1", type: "Feature", name: "Nightmares", system: {type: "wod.types.flaw"}}],
    {ties: {"Actor.x": "Anna"}, standing: {f1: "The Court: member"}, year: 1690, at: 1});
  assert.deepEqual(s.xp, {earned: 5, spent: 3});
  assert.deepEqual(s.wp, [5, 5]);
  assert.deepEqual(s.pools.Blood, [10, 10]);
  assert.equal(s.traits.Strength, 2);
  assert.deepEqual(s.items.i1, ["Rope", 1]);
  assert.deepEqual(s.features.f1, ["Nightmares", "Flaw"]);
  assert.equal(s.year, 1690);
  // It survives a round trip through the flag, keys with dots and all
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test("the strip lists what moved, and nothing when nothing did", () => {
  const was = X.snapshotOf(sys(), [item("i1", "Rope"), item("i2", "Arrows", 20)], {year: 1690, ties: {"Actor.x": "Anna"}, standing: {f1: "The Court: member"}});
  assert.deepEqual(X.changesSince(was, was), []);
  const now = X.snapshotOf(sys({wp: 3, blood: 4, str: 3, dmg: {lethal: 2}}), [xp(4, true, "e"), item("i2", "Arrows", 12), item("i3", "Lantern"),
    {_id: "f1", type: "Feature", name: "Nightmares", system: {type: "wod.types.flaw"}}], {year: 1790, ties: {"Actor.y": "Boris"}, standing: {f1: "The Court: member, rank 2"}});
  const lines = X.changesSince(was, now).map(l => l.text);
  for ( const want of ["The year: 1690 to 1790", "Experience: 4 spent", "Strength: 2 to 3", "Health: unhurt to 2 lethal", "Willpower: 5 to 3",
    "Blood: 10 to 4", "Flaw gained: Nightmares", "Gained: Lantern", "Lost or given away: Rope", "Arrows: 20 to 12", "New ties: Boris", "Ties gone: Anna",
    "The Court: member to The Court: member, rank 2"] ) assert.ok(lines.includes(want), `${want} in ${lines.join(" | ")}`);
  // A jump of a century is one year line
  assert.equal(lines.filter(l => l.startsWith("The year")).length, 1);
  // Healing says so
  const healed = X.changesSince(X.snapshotOf(sys({dmg: {lethal: 2}}), []), X.snapshotOf(sys({dmg: {lethal: 1}}), []));
  assert.equal(healed[0].text, "Health: 2 lethal to 1 lethal (healed)");
  assert.deepEqual(X.changesSince(null, now), []);
});

test("causes are kept by kind, without repeats, and attach to their lines", () => {
  assert.deepEqual(X.catsOf(["system.advantages.willpower.temporary", "system.health.damage.lethal", "system.attributes.strength.value", "flags.wodx-sheets.ties"]).sort(), ["health", "ties", "traits", "wp"]);
  assert.deepEqual(X.catsOf([], "Experience"), ["xp"]);
  assert.deepEqual(X.catsOf([], "Melee Weapon"), ["items"]);
  assert.deepEqual(X.catsOf(["system.advantages.bloodpool.temporary"]), ["pools"]);
  let s = X.addCause({}, ["wp"], "the Storyteller");
  assert.deepEqual(s, {wp: ["the Storyteller"]});
  assert.equal(X.addCause(s, ["wp"], "the Storyteller"), null, "nothing new, nothing to save");
  for ( let i = 0; i < 6; i++ ) s = X.addCause(s, ["wp"], `card ${i}`) ?? s;
  assert.equal(s.wp.length, X.CAUSES_MAX);
  const lines = X.withCauses([{cat: "wp", text: "Willpower: 5 to 3"}, {cat: "xp", text: "Experience: 1 earned"}], {wp: ["a card: Meditation at dawn"]});
  assert.equal(lines[0].cause, "a card: Meditation at dawn");
  assert.equal(lines[1].cause, "");
});

test("WoDX's own bookkeeping is never a change: the strip's flags, recomputed totals and feature stamps", () => {
  assert.deepEqual(X.loudKeys({flags: {"wodx-sheets": {snap: "{}", since: "{}"}, "wodx-chronicle": {sigFired: {muse: 5}}}, system: {settings: {isupdated: true}}}), []);
  assert.deepEqual(X.loudKeys({system: {advantages: {willpower: {temporary: 2}}}}), ["system.advantages.willpower.temporary"]);
  assert.equal(X.entryFor({}, {flags: {"wodx-sheets": {since: "{}"}}}), null, "History leaves them out too");
});

test("the change strip draws its lines, folds the rest and offers Mark as read", () => {
  assert.equal(H.changesHtml([]), "");
  const lines = Array.from({length: H.CHANGES_SHOWN + 2}, (_, i) => ({text: `Line ${i} <b>`, cause: i === 0 ? "the Storyteller" : ""}));
  const html = H.changesHtml(lines, {canClear: true, since: "since 12/11/2026"});
  assert.match(html, /Changed since last session/);
  assert.match(html, /Line 0 &lt;b&gt; <span class="wodx-chg-cause">\(the Storyteller\)<\/span>/);
  assert.match(html, /<summary>2 more<\/summary>/);
  assert.match(html, /wodx-chg-read/);
  assert.doesNotMatch(H.changesHtml(lines), /wodx-chg-read/);
});

test("every feature engine says when it fires", () => {
  const data = readFileSync(join(root, "modules/wodx-chronicle/data/signatures.mjs"), "utf8");
  const engines = new Set([...data.matchAll(/feature:\s*"([a-z-]+)"/g)].map(m => m[1]));
  for ( const e of engines ) assert.ok(S.FEATURE_WHEN[e], e);
  assert.match(S.whenOf({feature: "muse"}), /Muse/);
  assert.equal(S.whenOf({feature: "line", effects: [{tags: ["intimidation"], dice: 1, when: "thunder"}]}), "In play, when the Storyteller calls for it. On rolls: intimidation (thunder)");
  assert.equal(S.whenOf({feature: "nothing-like-this"}), S.FEATURE_WHEN.line);
});

test("the features summary: name of the year, last fired from any engine, set aside", () => {
  const toreador = S.vampireRow("Toreador");
  const rows = S.featureSummary([toreador, {key: "x", label: "Old Ones", title: "T", text: "t", feature: "line", also: ["luck"], until: 1300}],
    {fired: {luck: 500, muse: null}, off: ["x"], year: 1400, dateOf: t => `day ${t}`});
  assert.equal(rows[0].key, "toreador");
  assert.equal(rows[0].fired, false);
  assert.equal(rows[0].off, false);
  assert.match(rows[0].when, /Muse/);
  assert.equal(rows[1].fired, true);
  assert.equal(rows[1].last, "day 500");
  assert.equal(rows[1].off, true);
  assert.match(rows[1].notes[0], /By 1400 the Old Ones are gone/);
});

test("the features card: folded to names, a switch for the Storyteller only", () => {
  const rows = S.featureSummary([S.vampireRow("Toreador")], {fired: {muse: 9}, dateOf: () => "Friday, 3 May 1690"});
  const pl = H.featuresHtml(rows), st = H.featuresHtml(rows, {gm: true, open: true});
  assert.equal(H.featuresHtml([]), "");
  assert.match(pl, /<details class="wodx-features">/);
  assert.match(pl, /Toreador: Muse and Obsession/);
  assert.match(pl, /Last fired:<\/span> Friday, 3 May 1690/);
  assert.doesNotMatch(pl, /wodx-feat-toggle/);
  assert.match(st, /wodx-feat-toggle" data-feat="toreador" checked/);
  assert.match(st, /<details class="wodx-features" open>/);
  const off = H.featuresHtml(S.featureSummary([S.vampireRow("Toreador")], {off: ["toreador"]}), {gm: true});
  assert.match(off, /Set aside by the Storyteller for this story/);
  assert.doesNotMatch(off, /data-feat="toreador" checked/);
});

test("every feature card in Chronicle notes that the feature fired, and set-aside rows leave the engines", () => {
  const src = readFileSync(join(root, "modules/wodx-chronicle/scripts/signatures.mjs"), "utf8");
  assert.match(src, /export function rowsOf\(actor\) \{\n  const rows = allRowsOf\(actor\), off = offOf\(actor\);/);
  assert.ok((src.match(/cardFor\(/g) ?? []).length >= 35);
  assert.match(src, /summary, setOff, fired/);
});
