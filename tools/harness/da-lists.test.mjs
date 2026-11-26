import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The missing rows of the Dark Ages lists (B7931-B7933): Dark Ages: Werewolf and Dark Ages: Fae merits and flaws */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const D = await imp("modules/wodx-rules/chronicle/data/trait-effects.mjs");
const L = await imp("modules/wodx-rules/chronicle/data/trait-lines-da.mjs");
const T = await imp("modules/wodx-rules/chronicle/trait-rules.mjs");
const F = await imp("modules/wodx-rules/actions/fae-da-rules.js");

const feat = (name, kind = "merit") => ({id: name, name, kind, value: 0});
const view = (kind, ...features) => ({kind, features});

test("B7931-B7932: every Dark Ages: Werewolf and Dark Ages: Fae merit and flaw is in the table, with a page and an effect", () => {
  const W = ["Animal Magnetism", "Mixed Morph", "Bad Taste", "Fair Glabro", "Lack of Scent", "Unobtrusive", "Animal Musk", "Asthma", "No Partial Transformation",
    "Strict Carnivore", "Wolf Years", "Shy", "Speech Impediment", "Pack Mentality", "Short Fuse", "Callous", "Devil's Own", "Reputation", "Foreigner",
    "Persistent Parents", "Notoriety", "Wolf's Obsession", "Ancestor Ally", "Natural Channel", "Spirit Rapport", "Silver Tolerance", "Foe from the Past",
    "Forced Transformation", "Geas", "Banned Transformation", "Insane Ancestor", "Slips Sideways", "Mark of the Predator", "Sign of the Wolf"];
  const kinds = {"Asthma": "flaw", "No Partial Transformation": "flaw", "Strict Carnivore": "flaw", "Wolf Years": "flaw", "Shy": "flaw", "Speech Impediment": "flaw",
    "Pack Mentality": "flaw", "Short Fuse": "flaw", "Callous": "flaw", "Devil's Own": "flaw", "Foreigner": "flaw", "Persistent Parents": "flaw", "Notoriety": "flaw",
    "Wolf's Obsession": "flaw", "Foe from the Past": "flaw", "Forced Transformation": "flaw", "Geas": "flaw", "Banned Transformation": "flaw", "Insane Ancestor": "flaw",
    "Slips Sideways": "flaw", "Mark of the Predator": "flaw", "Sign of the Wolf": "flaw", "Animal Musk": "flaw"};
  for ( const nm of W ) {
    const m = T.traitsOf(view("lupine", feat(nm, kinds[nm] ?? "merit"))).matched[0];
    assert.ok(m && !m.wrongKind, `${nm} matches for a Garou`);
    assert.ok(!T.describe({entry: m.entry}).includes("no automatic effect yet"), `${nm} does something`);
  }
  assert.equal(L.DA_LINE_ROWS.filter(r => r.book === "DA:F").length, 30, "13 merits and 17 flaws, Cherished and Feared as two rows");
  const PAGES = {"DA:W": [86, 89], "DA:F": [97, 101], "DA:DD": [98, 100], "DA:IC": [124, 127]};
  const WHO = {"DA:W": "lupine", "DA:F": "fae", "DA:IC": "hunter"};
  for ( const r of L.DA_LINE_ROWS ) {
    assert.ok(r.page >= PAGES[r.book][0] && r.page <= PAGES[r.book][1], `${r.key} p. ${r.page}`);
    if ( r.book === "DA:DD" ) continue;
    const m = T.traitsOf(view(WHO[r.book], feat(r.name, r.kind))).matched[0];
    assert.equal(m?.key, r.key, `${r.name} matches its own row`);
    assert.ok(!T.describe({entry: m.entry}).includes("no automatic effect yet"), `${r.key} does something`);
  }
});

test("B7931: the Dark Ages: Werewolf rows on the roll", () => {
  const v = view("lupine", feat("Spirit Rapport"), feat("Foreigner", "flaw"));
  assert.deepEqual(T.ticksOf(v).map(t => t.key).sort(), ["spirit-bargain", "spirits"]);
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: ["spirit-bargain"]})).diff, -2);
  assert.equal(T.sumEffects(T.effectsFor(v, {channel: "roll", tags: T.rollTags("charisma", "etiquette")})).diff, 1, "a foreigner on any Social roll");
  assert.ok(D.MERITS_FLAWS.find(e => e.key === "asthma").holders.includes("lupine"));
  assert.ok(D.TRIGGERS["slips-sideways"].words.includes("mirror"));
});

test("B7932: the Dark Ages: Fae rows on the roll", () => {
  const fae = view("fae", feat("Riddlemaster"), feat("Kenning Affinity"), feat("Cherished"));
  assert.equal(T.sumEffects(T.effectsFor(fae, {channel: "roll", tags: T.rollTags("intelligence", "enigmas")})).diff, -2);
  assert.equal(T.sumEffects(T.effectsFor(fae, {channel: "roll", tags: T.rollTags("perception", "kenning")})).diff, -1);
  assert.equal(T.sumEffects(T.effectsFor(fae, {channel: "roll", tags: [...T.rollTags("charisma"), "knows-legend"]})).dice, 1);
  const ob = view("fae", feat("Oathbreaker", "flaw"));
  assert.equal(T.traitsOf(ob).matched[0].key, "oathbreaker-fae");
  assert.equal(T.sumEffects(T.effectsFor(ob, {channel: "roll", tags: ["social"], against: "fae"})).diff, 3);
  assert.equal(T.sumEffects(T.effectsFor(ob, {channel: "roll", tags: ["social"], against: "mortal"})).diff, 0);
  assert.equal(T.traitsOf(view("mage", feat("Oathbreaker", "flaw"))).matched[0].key, "oathbreaker", "a mage's is still the Book of Secrets one");
});

test("B7932: the fae window's merits: imbalance, Unleashing Control, Cantrip Affinity, the new Echo roll", () => {
  assert.equal(F.imbalance(2, 5), "weaving");
  assert.equal(F.imbalance(2, 5, F.imbalanceGaps({freeThinker: true})), null);
  assert.equal(F.imbalance(5, 2, F.imbalanceGaps({stableMind: true})), null);
  assert.equal(F.imbalance(4, 2, F.imbalanceGaps({delicateSoul: true})), "mists");
  const base = {dominion: "day", rating: 2, origin: "changeling", court: "summer", mists: 3, weaving: 3};
  assert.equal(F.unleashPlan(base).wildDice, 5);
  assert.equal(F.unleashPlan(base, {control: true}).wildDice, 3);
  const cs = [1, 2, 3, 4].map(k => ({name: `c${k}`, dominion: "day", level: 1}));
  assert.equal(F.cantripProblems(cs, {weaving: 3, dominions: {day: 2}}).length, 1);
  assert.equal(F.cantripProblems(cs, {weaving: 3, dominions: {day: 2}, affinity: "day"}).length, 0);
  const seen = {lesser: 5, greater: 0, origin: "changeling", mortals: 1};
  assert.equal(F.newEchoPool({...seen, mod: 1}).dice - F.newEchoPool(seen).dice, 1);
  const fx = src("modules/wodx-actions/scripts/fae-da.js");
  for ( const re of [/F\.imbalance\(mists\.perm, weaving\.perm, gaps\)/, /control: i\.mf\.control/, /i\.mf\.intolerant \? 1 : 0/, /mod: mfMod/, /affinity: faeMerits\(actor\)\.affinity/] ) assert.match(fx, re);
});

test("B7933: Devil's Due merits and flaws; Untainted and Unbound Diabolist in the thrall window", () => {
  for ( const [nm, kind, who] of [["Unbound Diabolist", "merit", "mortal"], ["Beloved Disciple", "merit", "mortal"], ["Cruel Master", "flaw", "mortal"], ["Untainted", "merit", "mortal"],
    ["Brash Diabolist", "flaw", "demon"], ["Out of Touch", "flaw", "demon"], ["Known Name", "flaw", "demon"], ["Known Name", "merit", "demon"], ["Penitent", "merit", "demon"], ["Strong Host", "flaw", "demon"]] ) {
    const m = T.traitsOf(view(who, feat(nm, kind))).matched[0];
    assert.ok(m && !m.wrongKind && m.entry.book === "DA:DD", `${nm} (${kind})`);
    assert.ok(!T.describe({entry: m.entry}).includes("no automatic effect yet"), nm);
  }
  const th = src("modules/wodx-actions/scripts/thrall.js");
  assert.match(th, /if \(merit\(a, "untainted"\)\) s\.untainted = true;/);
  assert.match(th, /if \(s\.unbound\) \{ notify/);
});

test("B7934: the Inquisitor Companion's merits and flaws: every one in the table for an inquisitor, and the ones the rules read", () => {
  const IC = L.DA_LINE_ROWS.filter(r => r.book === "DA:IC");
  assert.equal(IC.length, 26, "11 merits and 15 flaws");
  assert.equal(T.traitsOf(view("hunter", feat("Gullible", "flaw"))).matched[0].key, "gullible-inq");
  assert.equal(T.traitsOf(view("lupine", feat("Gullible", "flaw"))).matched[0].key, "gullible", "a Garou's is still the W20 one");
  assert.equal(T.traitsOf(view("hunter", feat("Unlucky", "flaw"))).matched[0].key, "unlucky-inq");
  const h = view("hunter", feat("Orthodox"), feat("Tough as Nails"), feat("Talented Liar"));
  assert.equal(T.sumEffects(T.effectsFor(h, {channel: "roll", tags: [...T.rollTags("charisma"), "church"]})).diff, -2);
  assert.equal(T.sumEffects(T.effectsFor(h, {channel: "resist", tags: T.rollTags("perception", "empathy")})).diff, 2);
  for ( const k of ["grace", "order-prodigy", "divinely-favored", "curse-prone"] ) assert.ok(D.HANDLED[k], k);
  const C = src("modules/wodx-rules/actions/inq-curses-rules.js"), H = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(C, /if \(o\.favored\) add\(-2/);
  assert.match(H, /favored: i\.mf\.favored, prone: i\.mf\.prone/);
  assert.match(H, /CR\.callousWith\(i\.curses, i\.conviction, i\.piety, \{ grace: i\.mf\?\.grace \}\)/);
});

test("B7931-B7933: own words, no gendered pronouns, no em-dashes", () => {
  const s = src("modules/wodx-rules/chronicle/data/trait-lines-da.mjs");
  assert.ok(!/—/.test(s));
  assert.ok(!/\b(he|she|his|her|him|hers)\b/i.test(s));
});
