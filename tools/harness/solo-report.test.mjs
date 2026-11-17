// WoDX Solo: Report a problem (B7160 to B7163): the report's rules and the filing into the feature registry.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import * as P from "../../modules/wodx-solo/scripts/report-rules.mjs";
import {faultOf, placeFault, fileReports, digestLine} from "../solo/report-file.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const ctx = (over = {}) => ({at: Date.UTC(2026, 10, 17, 21, 5), world: "rothenstein-solo", by: "Ben", isGM: false,
  build: {label: "rc-2026-11-17", commit: "3cd5b87aaaabbbbccccddddeeeeffff000011112", mixed: false},
  scene: {id: "s1", name: "Toll-post and Ivo's Ferry"}, actor: {id: "a1", name: "Mirek", type: "Vampire"}, gameDate: "1 September 1197",
  worldTime: 1000, errors: [], cards: ["Initiative, turn 1"], windows: ["wodx-solo-panel"], modules: {"wodx-solo": "0.13.0"}, ...over});

test("a report keeps what was typed, the place, the build and who sent it", () => {
  const r = P.buildReport({what: "  The feed button did nothing  ", expected: "a roll", kind: "broken"}, ctx());
  assert.match(r.id, /^rp-rothenstein-solo-[0-9a-z]+$/);
  assert.equal(r.what, "The feed button did nothing");
  assert.equal(r.role, "player");
  assert.equal(r.build.label, "rc-2026-11-17");
  assert.equal(r.scene.name, "Toll-post and Ivo's Ferry");
  assert.equal(r.actor.type, "Vampire");
  assert.equal(r.at, "2026-11-17T21:05:00.000Z");
  assert.equal(P.buildReport({what: "x".repeat(5000), kind: "zzz"}, ctx({isGM: true})).what.length, P.WHAT_MAX);
  assert.equal(P.buildReport({what: "abc", kind: "zzz"}, ctx({isGM: true})).kind, "other");
  assert.equal(P.buildReport({what: "abc"}, ctx({isGM: true})).role, "storyteller");
});

test("the build comes from release.json: its label only with a real commit", () => {
  assert.deepEqual(P.buildOf({commit: "3CD5B87AAA", date: "x", label: "rc-2026-11-17"}), {label: "rc-2026-11-17", commit: "3cd5b87aaa", mixed: false});
  assert.deepEqual(P.buildOf({commit: "$Format:%H$", label: "rc-2026-11-17"}), {label: "", commit: "", mixed: false});
  assert.equal(P.buildOf({commit: "3cd5b87", label: "<b>"}).label, "");
  assert.equal(P.buildOf(null).commit, "");
});

test("the form refuses an empty report and an unknown kind", () => {
  assert.equal(P.checkInput({what: " ", kind: "broken"}).ok, false);
  assert.equal(P.checkInput({what: "the map is black", kind: "nope"}).ok, false);
  assert.equal(P.checkInput({what: "the map is black", kind: "looks"}).ok, true);
});

test("console errors: the source as a repo path, the last twenty, repeats dropped", () => {
  assert.equal(P.sourceOf("at x (https://localhost:30010/modules/wodx-actions/scripts/feed.mjs:12:3)"), "modules/wodx-actions/scripts/feed.mjs");
  assert.equal(P.sourceOf("at y (http://h/systems/worldofdarkness/module/roll.js?v=2:4)"), "system/worldofdarkness/module/roll.js");
  assert.equal(P.sourceOf("no path"), "");
  let list = [];
  for ( let i = 0; i < 30; i++ ) list = P.pushError(list, P.errorEntry({at: i, msg: `e${i}`}));
  assert.equal(list.length, P.ERRORS_KEPT);
  assert.equal(list[0].msg, "e10");
  const same = P.pushError(list, P.errorEntry({msg: "e29"}));
  assert.equal(same.length, list.length);
});

test("the module guess reads the errors first, then the windows", () => {
  assert.equal(P.guessModule({errors: [{src: "modules/wodx-actions/scripts/a.mjs"}], windows: ["wodx-solo-panel", "wodx-solo-x"]}), "wodx-actions");
  assert.equal(P.guessModule({errors: [], windows: ["wodx-wizard-abc"]}), "wodx-creation");
  assert.equal(P.guessModule({}), "");
});

test("the page people read escapes what was typed and shows no decision numbers", () => {
  const r = P.buildReport({what: "<script>x</script> B7160", kind: "rule"}, ctx({errors: [P.errorEntry({msg: "boom", stack: "/modules/wodx-npc/scripts/m.mjs:1"})]}));
  const html = P.reportHtml(r);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /A rule worked out wrong/);
  assert.match(html, /modules\/wodx-npc\/scripts\/m\.mjs/);
  assert.match(P.entryName(r), /^2026-11-17 21:05 /);
  assert.ok(!/B71\d\d/.test(P.reportHtml(P.buildReport({what: "plain"}, ctx())).replace(/rc-2026-11-17/, "")));
});

test("reports waiting on a player keep their order and are not doubled", () => {
  const a = {id: "rp-w-1"}, b = {id: "rp-w-2"};
  assert.deepEqual(P.addPending(P.addPending([], a), a).map(r => r.id), ["rp-w-1"]);
  assert.deepEqual(P.addPending([a], b).map(r => r.id), ["rp-w-1", "rp-w-2"]);
});

const reg = () => ({"wodx-actions": {module: "wodx-actions", seeded: false, rows: [{id: "actions.feed", module: "wodx-actions", files: ["modules/wodx-actions/scripts/feed.mjs"], faults: []}]}});
const owner = file => (file.startsWith("modules/wodx-actions/scripts/feed") ? [{id: "actions.feed", module: "wodx-actions"}] : []);

test("filing: a fault lands on the row its errors come from, else in the inbox with a guess", () => {
  const onRow = P.buildReport({what: "feeding did nothing", kind: "broken"}, ctx({errors: [P.errorEntry({msg: "x", stack: "/modules/wodx-actions/scripts/feed.mjs:3"})]}));
  const noRow = P.buildReport({what: "the river looks wrong", kind: "looks"}, ctx({at: Date.UTC(2026, 10, 17, 22), windows: ["wodx-solo-panel"]}));
  const res = fileReports([onRow, noRow], reg(), {ownerOf: owner});
  assert.deepEqual(res.filed, [{id: onRow.id, module: "wodx-actions", row: "actions.feed"}]);
  const f = res.docs["wodx-actions"].rows[0].faults[0];
  assert.deepEqual(Object.keys(f), ["id", "at", "by", "role", "kind", "what", "expected", "build", "report", "status", "fix"]);
  assert.equal(f.status, "open");
  assert.equal(f.build, "rc-2026-11-17");
  assert.deepEqual(res.inbox, [noRow.id]);
  assert.equal(res.docs._inbox.faults[0].guess.module, "wodx-solo");
  // A second run files nothing twice
  const again = fileReports([onRow, noRow], res.docs, {ownerOf: owner});
  assert.deepEqual(again.skipped.sort(), [onRow.id, noRow.id].sort());
  assert.equal(again.docs["wodx-actions"].rows[0].faults.length, 1);
  assert.match(digestLine(res), /^2 problems reported in the solo world: filed on row actions\.feed; 1 in the registry inbox/);
  assert.match(digestLine({}), /No problems reported/);
});

test("filing: a tie between two rows goes to the inbox", () => {
  const r = {id: "rp-w-9", errors: [{src: "a"}, {src: "b"}]};
  const at = placeFault(r, f => [{id: f === "a" ? "x.one" : "x.two", module: "wodx-x"}]);
  assert.equal(at.row, "");
  assert.equal(faultOf(r).what, "");
});

test("the panel and the Storyteller both reach the form, and the seat writes reports out", () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/report.mjs"), "utf8");
  assert.match(src, /addActions\(\{report:/);
  assert.match(src, /Hooks\.on\("renderSettings", settingsButton\)/);
  assert.match(src, /"ask\.report"/);
  const seat = readFileSync(join(root, "tools/solo/seat.mjs"), "utf8");
  assert.match(seat, /wodxSoloReported/);
  assert.match(seat, /--reports/);
});
