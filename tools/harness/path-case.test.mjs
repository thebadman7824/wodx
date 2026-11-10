/* Letter-case check (release check for the Linux live server): every file path the system,
 * the modules and the world files refer to must match the file on disk letter for letter. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {checkPath, collectRefs, findMismatches, caseTwins} from "./path-case.mjs";

test("checkPath tells a right path, a wrong-case path and a missing one apart", () => {
  assert.equal(checkPath("modules/wodx-chronicle/module.json").status, "ok");
  const wrong = checkPath("modules/wodx-chronicle/Module.JSON");
  assert.equal(wrong.status, "case");
  assert.equal(wrong.actual, "modules/wodx-chronicle/module.json");
  assert.equal(checkPath("Modules/wodx-chronicle/module.json").status, "case");
  assert.equal(checkPath("modules/wodx-chronicle/no-such-file.json").status, "missing");
});

test("the scan finds the kinds of reference Foundry loads", () => {
  const refs = collectRefs();
  const has = re => refs.some(r => re.test(r.file + " " + r.target));
  assert.ok(refs.length > 1000, `only ${refs.length} references found`);
  assert.ok(has(/module\.json modules\/wodx-chronicle\/scripts\//), "manifest esmodules");
  assert.ok(has(/\.css .*\.(ttf|otf|woff2?)$/i), "CSS font urls");
  assert.ok(has(/\.mjs modules\/.*\.mjs$/), "relative imports");
  assert.ok(has(/\.mjs modules\/wodx-[a-z]+\/templates\/.*\.hbs$/), "template paths built from the module id");
  assert.ok(has(/packs\/.*\.(ldb|log) system\/worldofdarkness\/assets\/img\//), "image paths inside compendium packs");
});

test("no path differs in letter case from the file on disk", () => {
  const {case: wrong} = findMismatches();
  assert.deepEqual(wrong.map(c => `${c.file}:${c.line} ${c.ref} (on disk: ${c.actual})`), []);
});

test("no folder holds two names that differ only in letter case", () => {
  assert.deepEqual(caseTwins(), []);
});
