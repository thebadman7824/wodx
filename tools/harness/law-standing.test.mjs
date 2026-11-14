import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Standing before the law (B3614-B3615) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const S = await imp("modules/wodx-chronicle/scripts/law-standing-rules.mjs");
const P = await imp("modules/wodx-chronicle/scripts/law-punish-rules.mjs");
const L = await imp("modules/wodx-chronicle/scripts/law-rules.mjs");

test("standing: ranks map to classes before the law", () => {
  assert.equal(S.classOf("Serf"), "unfree");
  assert.equal(S.classOf("Clergy"), "clergy");
  assert.equal(S.classOf("Boyar"), "noble");
  assert.equal(S.classOf("Burgher"), "common");
  assert.equal(S.classOf(""), "common");
  assert.equal(S.classOf("Elite"), "wealthy");
});

test("standing: privileges and bars end on their dates, and the setting softens or ends them", () => {
  const serf = S.standingOf("Serf", "latin", 1300);
  assert.ok(serf.trialDiff > 0 && serf.tierShift > 0 && serf.officeCap === 0);
  assert.equal(S.standingOf("Serf", "latin", 1850).trialDiff, 0, "serfdom ended in 1848");
  assert.ok(S.standingOf("Serf", "orthodox", 1850).trialDiff > 0, "not in Russia until 1861");
  assert.ok(S.standingOf("Clergy", "common", 1800).trialDiff < 0 && S.standingOf("Clergy", "common", 1830).trialDiff === 0, "benefit of clergy to 1827");
  assert.ok(S.standingOf("Lord", "latin", 1300).trialDiff < 0);
  assert.equal(S.standingOf("Serf", "latin", 1300, "softened").officeCap, null);
  assert.ok(S.standingOf("Serf", "latin", 1300, "softened").trialDiff > 0);
  assert.deepEqual(S.standingOf("Serf", "latin", 1300, "off"), {cls: "unfree", trialDiff: 0, tierShift: 0, officeCap: null, words: ""});
  assert.equal(S.capFor(serf, "court"), 0);
  assert.equal(S.capFor(serf, "guild"), 4, "a guild is not an office of the state");
  assert.equal(S.capFor(S.standingOf("Lord", "latin", 1300), "court"), 4);
  for ( const m of Object.keys(S.MODES) ) for ( const f of Object.keys(L.FAMILIES) ) S.standingOf("Serf", f, 1500, m);
  for ( const l of Object.keys(S.LINE_STANDING) ) assert.ok(l === "mortal" || S.LINE_STANDING[l], l);
});

test("standing: the sentence's weight shifts with it", () => {
  const law = L.lawOf("british-isles", 1700), deeds = [{deed: "theft"}, {deed: "fight"}];
  assert.equal(P.sentencesFor(law, deeds).tier, "middle");
  assert.equal(P.sentencesFor(law, deeds, {shift: 1}).tier, "grave");
  assert.equal(P.sentencesFor(law, deeds, {shift: -1}).tier, "light");
  assert.equal(P.sentencesFor(law, deeds, {shift: 9}).tier, "grave");
});

test("standing: the wiring", () => {
  assert.match(src("modules/wodx-chronicle/scripts/law-trial.mjs"), /standingDiff: standing\.trialDiff/);
  assert.match(src("modules/wodx-chronicle/scripts/law-punish.mjs"), /tierShift/);
  assert.match(src("modules/wodx-storyteller/scripts/institutions.mjs"), /law\?\.standing\?\.officeCap/);
  assert.match(src("modules/wodx-chronicle/scripts/main.mjs"), /registerStandingSettings\(\)/);
  assert.match(src("modules/wodx-chronicle/scripts/law-standing.mjs"), /default: "history"/);
});
