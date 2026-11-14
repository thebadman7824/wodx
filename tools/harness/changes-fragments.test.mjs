/* Merge-time stamping (B3080, B3081): the fragments under changes/ are well formed, and the stamp's edits do what
 * tools/release/merge-stamp.mjs says. On a push to main no fragment may be left (the stamp runs before each merge). */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as S from "../release/merge-stamp.mjs";

const ROOT = S.ROOT;

test("every fragment under changes/ is well formed", () => {
  const {modules, decisions} = S.readFragments(ROOT);
  const mods = new Set(fs.readdirSync(path.join(ROOT, "modules")));
  for ( const x of modules ) {
    assert.ok(mods.has(x.module), `${x.file}: there is no module ${x.module}`);
    assert.deepEqual(S.checkModuleFragment(x.frag), [], x.file);
  }
  const text = fs.readFileSync(path.join(ROOT, "docs/DECISIONS.md"), "utf8");
  const rows = [...text.split("<!-- decision-index:end -->")[0].matchAll(/^\| (B\d+(?:-B\d+)?) \|/gm)].map(m => S.blockRange(m[1]));
  const taken = [];
  for ( const x of decisions ) {
    assert.deepEqual(S.checkDecisionFragment(x.frag), [], x.file);
    const r = S.blockRange(x.frag.meta.block);
    // A fragment may add decisions to a block already in the index (the same block exactly), never overlap another.
    for ( const o of rows ) if ( !(o.lo === r.lo && o.hi === r.hi) ) assert.ok(r.hi < o.lo || r.lo > o.hi, `${x.file}: ${x.frag.meta.block} overlaps B${o.lo}-B${o.hi}`);
    const used = S.sectionNumbers(text.split("<!-- decision-index:end -->")[1] ?? "");
    for ( const n of S.sectionNumbers(x.frag.body) ) assert.ok(!used.includes(n), `${x.file}: B${n} is already in docs/DECISIONS.md`);
    for ( const o of taken ) assert.ok(r.hi < o.lo || r.lo > o.hi || (o.lo === r.lo && o.hi === r.hi), `${x.file}: ${x.frag.meta.block} overlaps B${o.lo}-B${o.hi}`);
    taken.push(r);
  }
});

test("main holds no fragment waiting to be stamped", {skip: !(process.env.GITHUB_EVENT_NAME === "push" && process.env.GITHUB_REF === "refs/heads/main")}, () => {
  const {modules, decisions} = S.readFragments(ROOT);
  assert.deepEqual([...modules, ...decisions].map(x => x.file), [], "a branch merged without node tools/release/merge-stamp.mjs");
});

test("versions bump and compare", () => {
  assert.equal(S.bumpVersion("0.66.0", "minor"), "0.67.0");
  assert.equal(S.bumpVersion("0.66.3", "patch"), "0.66.4");
  assert.equal(S.bumpVersion("3.61.1", "major"), "4.0.0");
  assert.throws(() => S.bumpVersion("0.1.0", "huge"));
  assert.ok(S.newer("0.10.0", "0.9.9") && !S.newer("0.9.9", "0.10.0") && !S.newer("1.0.0", "1.0.0"));
});

test("fragments parse and bad ones are caught", () => {
  const f = S.parseFragment("---\nbump: minor\nwhat: A new cell\n---\nGear by region (B3070).\n");
  assert.deepEqual(f.meta, {bump: "minor", what: "A new cell"});
  assert.equal(f.body, "Gear by region (B3070).");
  assert.deepEqual(S.checkModuleFragment(f), []);
  assert.equal(S.parseFragment("no front matter"), null);
  assert.ok(S.checkModuleFragment(S.parseFragment("---\nbump: big\n---\n")).length >= 2);
  assert.ok(S.checkModuleFragment(S.parseFragment("---\nbump: patch\n---\nOne.\n\nTwo.")).length === 1);
  const d = S.parseFragment("---\nblock: B100-B109\nfeature: X\nmodules: NPC\n---\n## B100. A (2026-11-13)\nText.\n\n## B111. B\n");
  assert.deepEqual(S.checkDecisionFragment(d), ["B111 is outside the block B100-B109"]);
});

test("the stamp edits module.json, the api version, the changelog and the table", () => {
  assert.equal(S.stampManifest('{\n  "id": "wodx-x",\n  "version": "0.2.0",\n}', "0.2.0", "0.3.0"), '{\n  "id": "wodx-x",\n  "version": "0.3.0",\n}');
  assert.equal(S.stampScript('const VERSION = "0.2.0";\nconst api = {version: "0.2.0", other: "0.2.0"};', "0.2.0", "0.3.0"),
    'const VERSION = "0.3.0";\nconst api = {version: "0.3.0", other: "0.2.0"};');
  assert.equal(S.stampChangelog("# x changelog\n\nNewest first.\n\n- 0.2.0 (old)\n", "0.3.0", "new"), "# x changelog\n\nNewest first.\n\n- 0.3.0 (new)\n- 0.2.0 (old)\n");
  assert.equal(S.stampChangelog("# x changelog\n", "0.1.0", "first"), "# x changelog\n\n- 0.1.0 (first)\n");
  const table = "| Module | Version | What it does | Enable in |\n|---|---|---|---|\n| wodx-x | 0.2.0 | Old cell | world |\n";
  assert.equal(S.stampTable(table, "wodx-x", "0.3.0"), "| Module | Version | What it does | Enable in |\n|---|---|---|---|\n| wodx-x | 0.3.0 | Old cell | world |\n");
  assert.match(S.stampTable(table, "wodx-x", "0.3.0", "New cell"), /\| wodx-x \| 0\.3\.0 \| New cell \| world \|/);
  assert.throws(() => S.stampTable(table, "wodx-y", "1.0.0"));
});

test("the stamp writes a decision block in order", () => {
  const doc = "# D\n\nNext free block: B120\n\n<!-- decision-index:start -->\n| Block | Feature | Modules |\n|---|---|---|\n| B100-B109 | One | NPC |\n| B130-B139 | Three | NPC |\n<!-- decision-index:end -->\n\n## The decisions\n\n## B100. a\nx\n\n## B130. c\nz\n";
  const frag = S.parseFragment("---\nblock: B110-B119\nfeature: Two\nmodules: Tools only\n---\n## B110. b (2026-11-13)\ny\n\nReverse: r\n\n## B112. b2\nw\n");
  const out = S.stampDecisions(doc, frag);
  assert.match(out, /\| B100-B109 \| One \| NPC \|\n\| B110-B119 \| Two \(used B110-B112\) \| Tools only \|\n\| B130-B139 \|/);
  assert.match(out, /## B100\. a\nx\n\n## B110\. b \(2026-11-13\)\ny\n\nReverse: r\n\n## B112\. b2\nw\n\n## B130\. c/);
  assert.match(out, /Next free block: B140|Next free block: B120/);
  const top = S.stampDecisions(doc, S.parseFragment("---\nblock: B200-B209\nfeature: Late\nmodules: NPC\n---\n## B200. late\nq\n"));
  assert.match(top, /\| B130-B139 \| Three \| NPC \|\n\| B200-B209 \| Late \(used B200\) \| NPC \|\n<!-- decision-index:end -->/);
  assert.match(top, /Next free block: B210/);
  assert.match(top, /## B130\. c\nz\n\n## B200\. late\nq\n$/);
  assert.throws(() => S.stampDecisions(doc, S.parseFragment("---\nblock: B105-B115\nfeature: Clash\nmodules: NPC\n---\n")));
  const more = S.stampDecisions(out, S.parseFragment("---\nblock: B110-B119\nfeature: Two\nmodules: Tools only\n---\n## B114. more\nm\n"));
  assert.match(more, /\| B110-B119 \| Two \(used B110-B114\) \| Tools only \|/, "a later fragment for the same block widens its used range");
  assert.match(more, /## B112\. b2\nw\n\n## B114\. more\nm\n\n## B130\. c/);
});

test("a new feature's release note names its effect in play (Ben's standing rule, B3734)", async () => {
  const {parseFragment, effectWarnings} = await import("../release/merge-stamp.mjs");
  assert.equal(effectWarnings(parseFragment("---\nbump: minor\n---\nNote.")).length, 1);
  assert.equal(effectWarnings(parseFragment("---\nbump: minor\neffect: a card offers the trade\n---\nNote.")).length, 0);
  assert.equal(effectWarnings(parseFragment("---\nbump: minor\neffect: none\n---\nNote.")).length, 1, "none needs a reason");
  assert.equal(effectWarnings(parseFragment("---\nbump: minor\neffect: none, a calendar date the server keeps only\n---\nNote.")).length, 0);
  assert.equal(effectWarnings(parseFragment("---\nbump: patch\n---\nFix.")).length, 0, "fixes need none");
});
