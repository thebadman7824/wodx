import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(join(root, "modules/wodx-actions/scripts/flavor.js"));
const CK = await import(join(root, "modules/wodx-actions/scripts/checks-rules.js"));

test("a common check's card gets lines for that check, or for its group", () => {
  assert.equal(F.theme("Anna: Notice something", ""), "check:notice");
  assert.equal(F.theme("Jan: Search a place", ""), "check:search");
  assert.equal(F.theme("Jan: Mind one's manners", ""), "checkgroup:social");
  assert.equal(F.theme("Jan: Feeds", ""), "feed", "other cards keep their themes");
  for ( const outcome of ["success", "failure", "botch"] ) {
    const l = F.line("check:notice", outcome, {name: "Anna"});
    assert.ok(F.CHECK_POOLS.notice[outcome].some(x => x.replaceAll("{name}", "Anna") === l), `${outcome}: ${l}`);
  }
  assert.doesNotMatch(F.line("check:lie", "success", {name: "Anna"}), /\{target\}/);
});

test("every check with lines of its own exists, and each has all three outcomes", () => {
  for ( const [key, pools] of Object.entries(F.CHECK_POOLS) ) {
    assert.ok(CK.byKey(key), key);
    for ( const o of ["success", "failure", "botch"] ) assert.ok(pools[o]?.length, `${key} ${o}`);
  }
  for ( const [g, pools] of Object.entries(F.CHECK_GROUP_POOLS) ) for ( const o of ["success", "failure", "botch"] ) assert.ok(pools[o]?.length, `${g} ${o}`);
});
