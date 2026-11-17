import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as REG from "../registry/registry.mjs";
import * as ST from "../registry/strength.mjs";
import {registryRule, decisionClashes, upkeepWarnings} from "../release/merge-rules.mjs";

/* Feature registry, gate strength and merge rule 4 (B7140-B7149, the Finish-Line Desk, 17 November 2026) */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const reg = (rows, seeded = true, module = "wodx-x") => ({modules: {[module]: {seeded, rows}}, problems: []});
const row = (id, steps = {}, extra = {}) => ({id, name: id, module: "wodx-x", files: ["modules/wodx-x/scripts/a.mjs"], steps, ...extra});
const BUILT = {built: {pr: 1}}, WIRED = {...BUILT, wired: {reader: "f:g"}}, GATED = {...WIRED, shown: {what: "x"}, gated: {gate: "g", step: "1"}};

test("status is the last step reached in order; a fault takes verified back to book", () => {
  assert.equal(REG.status(row("a")), "planned");
  assert.equal(REG.status(row("a", BUILT)), "built");
  assert.equal(REG.status(row("a", {...BUILT, shown: {what: "x"}})), "built", "shown without wired does not count");
  assert.equal(REG.status(row("a", {...GATED, shown: {none: "a rule with nothing on screen"}})), "gated");
  const done = {...GATED, book: {ref: "V20 p. 1"}, verified: {by: "x", how: "y"}};
  assert.equal(REG.status(row("a", done)), "verified");
  assert.equal(REG.status(row("a", done, {faults: [{id: "rp-1", what: "broke", status: "open"}]})), "book");
  assert.equal(REG.status(row("a", done, {faults: [{id: "rp-1", what: "broke", status: "fixed"}]})), "verified");
  assert.equal(REG.status(row("a", BUILT, {parked: "Ben parked it"})), "parked");
});

test("half-built: built but not gated, or an open fault; planned and parked are not", () => {
  assert.equal(REG.halfBuilt(row("a")), false);
  assert.equal(REG.halfBuilt(row("a", BUILT)), true);
  assert.equal(REG.halfBuilt(row("a", WIRED)), true);
  assert.equal(REG.halfBuilt(row("a", GATED)), false);
  assert.equal(REG.halfBuilt(row("a", GATED, {faults: [{id: "f", what: "w"}]})), true);
  assert.equal(REG.halfBuilt(row("a", BUILT, {parked: "x"})), false);
  assert.deepEqual(REG.wip(reg([row("a", BUILT), row("b", GATED), row("c")])), {"wodx-x": 1});
});

test("ownerOf reads paths, folders and globs", () => {
  const r = reg([row("a", {}, {files: ["modules/wodx-x/scripts/a.mjs"]}), row("b", {}, {files: ["modules/wodx-x/scripts/*-rules.mjs"]}), row("c", {}, {files: ["modules/wodx-x/data"]}), row("d", {}, {files: ["modules/wodx-x/**/deep.mjs"]})]);
  assert.deepEqual(REG.ownerOf(r, "modules/wodx-x/scripts/a.mjs").map(x => x.id), ["a"]);
  assert.deepEqual(REG.ownerOf(r, "./modules/wodx-x/scripts/law-rules.mjs").map(x => x.id), ["b"]);
  assert.deepEqual(REG.ownerOf(r, "modules/wodx-x/scripts/sub/law-rules.mjs").map(x => x.id), [], "* stays in one folder");
  assert.deepEqual(REG.ownerOf(r, "modules/wodx-x/data/t.json").map(x => x.id), ["c"]);
  assert.deepEqual(REG.ownerOf(r, "modules/wodx-x/scripts/a/b/deep.mjs").map(x => x.id), ["d"]);
  assert.deepEqual(REG.ownerOf(r, "modules\\wodx-x\\scripts\\a.mjs").map(x => x.id), ["a"], "Windows separators");
});

test("rowProblems: ids, order of steps, proof per step, files, faults, art", () => {
  const files = ["modules/wodx-x/scripts/a.mjs", "tools/gate/gatex.mjs"];
  const p = REG.rowProblems({modules: {"wodx-x": {seeded: true, rows: [
    row("Bad Id"),
    row("dup"), row("dup"),
    row("order", {...BUILT, gated: {gate: "tools/gate/gatex.mjs", step: "1"}}),
    row("nofile", BUILT, {files: ["modules/wodx-x/scripts/gone.mjs"]}),
    row("wired", {...BUILT, wired: true}),
    row("skip", {...WIRED, shown: {none: "no"}}),
    row("verify", {...GATED, gated: {gate: "tools/gate/gatex.mjs", step: "1"}, book: {none: "a Storyteller tool, no book rule"}, verified: {by: "x"}}),
    row("fault", {}, {faults: [{id: "f1"}, {id: "f2", what: "w", status: "maybe"}]}),
    row("art", {}, {art: ["obj-nope", "obj-yes"]})
  ]}}, problems: []}, {root, files, art: {"obj-yes": {}}});
  const has = (id, re) => assert.ok(p.some(x => x.startsWith(`wodx-x/${id}:`) && re.test(x)), `${id}: ${re} in\n${p.join("\n")}`);
  has("Bad Id", /lower case/);
  has("dup", /also used/);
  has("order", /gated is set but wired is not/);
  has("nofile", /not in the repo/);
  has("wired", /reader/);
  has("skip", /needs a reason/);
  has("verify", /verified needs/);
  has("fault", /id and what/);
  has("fault", /open, fixed or not-a-fault/);
  has("art", /obj-nope/);
  assert.ok(!p.some(x => /obj-yes/.test(x)));
});

test("a gated row needs its gate step to grade effect", () => {
  const r = {modules: {"wodx-combat": {seeded: true, rows: [{id: "combat.k", name: "k", files: ["modules/wodx-combat/scripts/main.js"],
    steps: {...BUILT, wired: {reader: "modules/wodx-combat/scripts/main.js:standUp"}, shown: {what: "x"}, gated: {gate: "tools/gate/gateknockdown.mjs", step: "4"}}}]}}, problems: []};
  const real = (g, s) => ST.gradeStep(root, g, s);
  assert.deepEqual(REG.rowProblems(r, {root, art: null, strength: real}), [], "gateknockdown step 4 drives the turn and checks the foe's health");
  r.modules["wodx-combat"].rows[0].steps.gated.step = "1";
  assert.match(REG.rowProblems(r, {root, art: null, strength: real}).join("\n"), /step "1" is graded direct-call/);
  r.modules["wodx-combat"].rows[0].steps.gated.step = "99";
  assert.match(REG.rowProblems(r, {root, art: null, strength: real}).join("\n"), /step "99" not found/);
});

test("the registry in the repo passes its own check", async () => {
  const r = REG.load(root);
  assert.deepEqual(r.problems, []);
  const p = REG.rowProblems(r, {root, strength: (g, s) => ST.gradeStep(root, g, s), art: null});
  assert.deepEqual(p, []);
  // every module and the system have a file
  for ( const m of fs.readdirSync(path.join(root, "modules")).filter(n => fs.existsSync(path.join(root, "modules", n, "module.json"))) ) assert.ok(r.modules[m], `registry/features/${m}.json`);
  assert.ok(r.modules.system, "registry/features/system.json");
  assert.ok(Array.isArray(JSON.parse(fs.readFileSync(path.join(root, REG.INBOX), "utf8")).faults));
  assert.equal(fs.readFileSync(path.join(root, "docs/FEATURES.md"), "utf8"), REG.summary(r), "docs/FEATURES.md is out of date: node tools/registry/registry.mjs summary --write");
});

test("merge rule 4: unseeded modules warn; seeded modules need an owned file and a changed row", () => {
  const f = [{file: "modules/wodx-x/scripts/a.mjs"}, {file: "modules/wodx-x/scripts/b.mjs"}];
  const base = reg([row("a", GATED)]);
  let r = registryRule({files: f, head: reg([row("a", GATED)], false), base: reg([row("a", GATED)], false)});
  assert.deepEqual(r.problems, []);
  assert.match(r.warnings[0], /2 changed script file\(s\) in modules not seeded yet \(wodx-x\)/);
  r = registryRule({files: f, head: reg([row("a", GATED)]), base});
  assert.ok(r.problems.some(p => /b\.mjs: no row/.test(p)));
  assert.ok(r.problems.some(p => /a\.mjs: changed, but none of its rows \(a\) changed/.test(p)));
  r = registryRule({files: [f[0]], head: reg([row("a", GATED, {prs: [2]})]), base});
  assert.deepEqual(r.problems, [], "the row changed");
  r = registryRule({files: [f[0]], head: reg([row("a", GATED)]), base, texts: ["registry: no change, a comment typo"]});
  assert.deepEqual(r.problems, []);
  r = registryRule({files: [{file: "modules/wodx-x/scripts/a.mjs", deleted: true}, {file: "modules/wodx-x/README.md"}], head: reg([row("a", GATED)]), base});
  assert.deepEqual(r.problems, [], "deleted files and non-scripts are out of scope");
});

test("merge rule 4: the ratchet", () => {
  const base = reg([row("a", BUILT), row("b", GATED)]);
  const grew = reg([row("a", BUILT), row("b", GATED), row("c", BUILT)]);
  let r = registryRule({files: [], head: grew, base});
  assert.ok(r.problems.some(p => /half-built rows went from 1 to 2/.test(p)));
  r = registryRule({files: [], head: grew, base, texts: ["ratchet-override: https://claude.ai/... Ben said go"]});
  assert.deepEqual(r.problems, []);
  assert.ok(r.warnings.some(w => /overridden/.test(w)));
  r = registryRule({files: [], head: reg([row("a", GATED), row("b", GATED), row("c", BUILT)]), base});
  assert.deepEqual(r.problems, [], "finish one, start one");
  r = registryRule({files: [], head: grew, base: reg([row("a", BUILT)], false)});
  assert.deepEqual(r.problems, [], "the module was seeded on this branch: nothing to compare yet");
});

test("merge rule 4: row problems block only in seeded modules", () => {
  const files = [{file: "registry/features/wodx-x.json"}];
  const p = ["wodx-x/a: needs a name"];
  assert.deepEqual(registryRule({files, head: reg([]), base: reg([]), rowProblems: p}).problems, ["registry wodx-x/a: needs a name"]);
  const w = registryRule({files, head: reg([], false), base: reg([], false), rowProblems: p});
  assert.deepEqual(w.problems, []);
  assert.ok(w.warnings.includes("registry wodx-x/a: needs a name"));
  assert.deepEqual(registryRule({files: [], head: reg([]), base: reg([]), rowProblems: p}).problems, [], "a file the branch did not change");
});

test("decision numbers may not clash with main or each other (B7145)", () => {
  const log = "## B7004. Tool registry (2026-11-17)\ntext\n## B7005. Routing\n";
  assert.deepEqual(decisionClashes([{file: "changes/decisions/B7140.md", numbers: ["B7140", "B7141"]}], log), []);
  const c = decisionClashes([{file: "changes/decisions/B7004.md", numbers: ["B7004"]}, {file: "changes/decisions/B7010.md", numbers: ["B7010"]}, {file: "changes/decisions/B7011.md", numbers: ["B7010"]}], log);
  assert.equal(c.length, 2);
  assert.match(c[0], /B7004 is already in docs\/DECISIONS\.md/);
  assert.match(c[1], /B7010 is also used in changes\/decisions\/B7010\.md/);
});

test("PC upkeep warning (B7149)", () => {
  assert.deepEqual(upkeepWarnings([{file: "modules/wodx-x/scripts/a.mjs"}], []), []);
  assert.equal(upkeepWarnings([{file: "tools/pcq/jobs.mjs"}], [{body: "fix"}]).length, 1);
  assert.deepEqual(upkeepWarnings([{file: "tools/lanes/run-gate.mjs"}], [{body: "upkeep: the PC helper asked for this fix"}]), []);
});

test("gate strength: effect, marker, direct-call, none", () => {
  const help = {toTurnOf: "const toTurnOf = async a => { await combat.update({turn: 1}); }"};
  assert.equal(ST.grade(`G.step("1", async () => { await toTurnOf(a); G.ok("1", hurt(foe) === 2); });`, {...help, hurt: "const hurt = a => a.system.health"}), "effect");
  assert.equal(ST.grade(`G.step("2", async () => { await toTurnOf(a); G.ok("2", !!a.getFlag("m", "x")); });`, help), "marker");
  assert.equal(ST.grade(`G.step("3", async () => { const r = X.applyOath(a); G.ok("3", r.system.value === 1); });`), "direct-call");
  assert.equal(ST.grade(`G.step("4", async () => { Hooks.callAll("wodxNoise", a); G.ok("4", a.system.x === 1); });`), "direct-call", "a hook fired by hand");
  assert.equal(ST.grade(`G.step("5", async () => { await a.update({"system.x": 1}); });`), "none");
  const s = ST.steps(`G.step("1. a", async () => { G.ok("1. a", true); });\nawait G.step("2. b", async () => {});`);
  assert.deepEqual(s.map(x => x.name), ["1. a", "2. b"]);
  const old = ST.steps(`const ok = (n, p) => 0;\nok("0. world", false);\nconst x = 1;\nok("1. module", x === 1);\nok("2. plan", true);`);
  assert.deepEqual(old.map(x => x.name), ["1. module", "2. plan"], "older gates: each ok() is a step, the world guard is not");
});

test("gate strength baseline only shrinks: every other gate has an effect step (B7143)", () => {
  const base = JSON.parse(fs.readFileSync(path.join(root, "tools/registry/strength-baseline.json"), "utf8"));
  const now = ST.weakGates(root);
  const added = Object.keys(now).filter(f => !(f in base));
  assert.deepEqual(added, [], "a new gate needs at least one step that drives a real trigger and checks the effect (tools/registry/strength.mjs); fix the gate, do not add it to the baseline");
  const better = Object.keys(base).filter(f => !(f in now));
  assert.deepEqual(better, [], "these gates now have an effect step or are gone: remove them from tools/registry/strength-baseline.json");
});
