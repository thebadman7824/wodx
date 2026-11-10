/* Release stamp: release.json in every package, filled in by git archive or tools/release/stamp.mjs,
 * and read back by WoDX Chronicle. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync} from "node:fs";
import {join, dirname} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {parseStamp, summarise, shortDate} from "../../modules/wodx-chronicle/scripts/release-rules.mjs";
import {stamp, packageFolders} from "../release/stamp.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHA = "3cd5b87aa0e1f2b3c4d5e6f708192a3b4c5d6e7f";
const OTHER = "91613d4bb0e1f2b3c4d5e6f708192a3b4c5d6e7f";

test("every package folder has an unfilled release.json marked for git archive", () => {
  const folders = ["system/worldofdarkness", ...readdirSync(join(root, "modules")).filter(n => n.startsWith("wodx-")).map(n => `modules/${n}`)];
  for ( const f of folders ) {
    const data = JSON.parse(readFileSync(join(root, f, "release.json"), "utf8"));
    assert.equal(data.commit, "$Format:%H$", f);
    assert.equal(data.date, "$Format:%cI$", f);
    assert.equal(parseStamp(data), null, `${f} reads as not stamped`);
  }
  assert.match(readFileSync(join(root, ".gitattributes"), "utf8"), /^release\.json\s+export-subst$/m);
});

test("parseStamp reads a filled stamp and rejects junk", () => {
  assert.deepEqual(parseStamp({commit: SHA.toUpperCase(), date: "2026-11-09T05:15:00-05:00"}), {commit: SHA, date: "2026-11-09T05:15:00-05:00"});
  assert.equal(parseStamp({commit: "$Format:%H$"}), null);
  assert.equal(parseStamp(null), null);
  assert.equal(parseStamp({commit: "not-a-hash"}), null);
  assert.equal(parseStamp({commit: SHA, date: "$Format:%cI$"}).date, null);
  assert.equal(shortDate("2026-11-09T05:15:00-05:00"), "9 Nov 2026");
  assert.equal(shortDate(null), "");
});

test("summarise: one build, a mixed release, a partly stamped one, none", () => {
  const s = (id, commit) => ({id, stamp: commit ? {commit, date: "2026-11-09T05:15:00-05:00"} : null});
  const one = summarise([s("worldofdarkness", SHA), s("wodx-chronicle", SHA)]);
  assert.equal(one.state, "one");
  assert.equal(one.line, "WoDX build 3cd5b87, 9 Nov 2026");
  const mixed = summarise([s("worldofdarkness", SHA), s("wodx-chronicle", SHA), s("wodx-combat", OTHER)]);
  assert.equal(mixed.state, "mixed");
  assert.equal(mixed.line, "WoDX build: mixed, 3cd5b87 (2), 91613d4 (1)");
  const partial = summarise([s("worldofdarkness", SHA), s("wodx-paperdoll", null)]);
  assert.equal(partial.state, "partial");
  assert.match(partial.line, /not stamped: wodx-paperdoll$/);
  assert.equal(summarise([s("wodx-chronicle", null)]).state, "unstamped");
  assert.equal(summarise([]).state, "unstamped");
});

test("stamp.mjs writes every package in a Foundry Data folder and nothing else", () => {
  const dir = mkdtempSync(join(tmpdir(), "wodx-stamp-"));
  try {
    mkdirSync(join(dir, "systems/worldofdarkness"), {recursive: true});
    writeFileSync(join(dir, "systems/worldofdarkness/system.json"), "{}");
    for ( const m of ["wodx-chronicle", "wodx-npc", "lib-wrapper"] ) {
      mkdirSync(join(dir, "modules", m), {recursive: true});
      writeFileSync(join(dir, "modules", m, "module.json"), "{}");
    }
    const done = stamp(dir, SHA, "2026-11-09T05:15:00-05:00");
    assert.equal(done.length, 3);
    assert.equal(packageFolders(dir).length, 3);
    assert.ok(!existsSync(join(dir, "modules/lib-wrapper/release.json")), "other modules are left alone");
    const back = parseStamp(JSON.parse(readFileSync(join(dir, "modules/wodx-npc/release.json"), "utf8")));
    assert.equal(back.commit, SHA);
    assert.throws(() => stamp(dir, "3cd5b87", "x"), /full commit hash/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test("Chronicle reads the stamps over fetch and shows the line to the GM in Settings", async () => {
  const {JSDOM} = await import("jsdom");
  const dom = new JSDOM(`<section class="settings"><section class="info"><p>Foundry</p></section></section>`);
  const files = {
    "/systems/worldofdarkness/release.json": {commit: SHA, date: "2026-11-09T05:15:00-05:00"},
    "/modules/wodx-chronicle/release.json": {commit: SHA, date: "2026-11-09T05:15:00-05:00"},
    "/modules/wodx-combat/release.json": {commit: OTHER, date: "2026-11-10T01:00:00Z"}
  };
  const warned = [];
  Object.assign(globalThis, {
    HTMLElement: dom.window.HTMLElement, document: dom.window.document,
    foundry: {utils: {getRoute: p => `/${p}`}},
    fetch: async url => files[url] ? {ok: true, json: async () => files[url]} : {ok: false},
    ui: {notifications: {warn: m => warned.push(m)}},
    game: {
      system: {id: "worldofdarkness"}, user: {isGM: true},
      modules: [{id: "wodx-chronicle", active: true}, {id: "wodx-combat", active: true}, {id: "wodx-npc", active: false}, {id: "lib-wrapper", active: true}]
    }
  });
  const log = console.log; console.log = () => {};
  try {
    const release = await import("../../modules/wodx-chronicle/scripts/release.mjs");
    const s = await release.announce();
    assert.equal(s.state, "mixed");
    assert.equal(warned.length, 1);
    const root = dom.window.document.querySelector("section.settings");
    release.onRenderSettings({}, root);
    release.onRenderSettings({}, root);
    const lines = root.querySelectorAll(".wodx-release");
    assert.equal(lines.length, 1, "a re-render does not add a second line");
    assert.equal(lines[0].textContent, "WoDX build: mixed, 3cd5b87 (2), 91613d4 (1)");
    assert.ok(lines[0].closest("section.info"));
    files["/modules/wodx-combat/release.json"] = {commit: SHA};
    assert.equal((await release.check({force: true})).line, "WoDX build 3cd5b87, 9 Nov 2026");
    game.user.isGM = false;
    root.querySelector(".wodx-release").remove();
    release.onRenderSettings({}, root);
    assert.equal(root.querySelectorAll(".wodx-release").length, 0, "players do not see it");
  } finally {
    console.log = log;
    for ( const k of ["HTMLElement", "document", "foundry", "fetch", "ui", "game"] ) delete globalThis[k];
  }
});
