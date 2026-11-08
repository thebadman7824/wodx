import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* WoDX Sheets 0.4: the later eras, from each line's printed sheet */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SR = await import(join(root, "modules/wodx-sheets/scripts/sheet-rules.mjs"));
const main = readFileSync(join(root, "modules/wodx-sheets/scripts/main.mjs"), "utf8");
const actions = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
const block = readFileSync(join(root, "modules/wodx-sheets/templates/block.hbs"), "utf8");
const core = readFileSync(join(root, "modules/wodx-sheets/templates/core.hbs"), "utf8");
const L = id => SR.SHEETS[id];

test("eleven later-era sheets, on the system's own actor types", () => {
  assert.deepEqual(SR.LATER_SHEETS, ["v20", "ghoul20", "w20", "m20", "c20", "wr20", "htr", "demon", "mummy", "kote", "orpheus"]);
  assert.deepEqual(SR.LATER_SHEETS.map(k => L(k).type), ["Vampire", "Mortal", "Werewolf", "Mage", "Changeling", "Wraith", "Hunter", "Demon", "Mummy", "Vampire", "Mortal"]);
  for ( const id of SR.LATER_SHEETS ) {
    const s = L(id);
    assert.equal(s.header.length, 2, id); for ( const c of s.header ) assert.ok(c.length >= 2 && c.length <= 3, id);
    assert.ok(s.book && s.sheetPage && s.title, id);
  }
  assert.deepEqual(Object.keys(SR.SHEETS).length, 17);
});

test("Abilities as each printed sheet lists them", () => {
  const counts = {v20: 10, ghoul20: 10, w20: 10, m20: 11, c20: 10, wr20: 10, htr: 12, demon: 12, mummy: 12, kote: 10, orpheus: 12};
  for ( const id of SR.LATER_SHEETS ) {
    const c = Object.values(L(id).abilities);
    assert.deepEqual(c.map(x => x.length), [counts[id], counts[id], counts[id]], id);
    for ( const col of c ) for ( const row of col ) assert.ok(row && row[0] && row[1], `${id}: ${JSON.stringify(row)}`);
  }
  const names = (id, col) => L(id).abilities[col].map(r => r[0]);
  assert.deepEqual(names("v20", "knowledges").slice(-3), ["Politics", "Science", "Technology"]);
  assert.equal(names("w20", "talents")[7], "Primal Urge");
  assert.deepEqual(names("m20", "talents").slice(0, 2), ["Alertness", "Art"]);
  assert.equal(names("m20", "skills")[4], "Martial Arts"); assert.equal(names("m20", "knowledges")[4], "Esoterica");
  assert.equal(names("c20", "knowledges")[3], "Gremayre");
  assert.equal(names("wr20", "skills")[5], "Leadership"); assert.equal(names("wr20", "talents")[7], "Persuasion");
  assert.equal(names("htr", "skills")[2], "Demolitions"); assert.equal(names("demon", "knowledges")[9], "Religion");
  assert.equal(names("mummy", "knowledges")[3], "Cosmology"); assert.equal(names("kote", "skills")[5], "Martial Arts");
  assert.equal(names("orpheus", "talents")[7], "Intrigue"); assert.deepEqual(L("orpheus").abilities.talents[7][1], {second: "talent"});
});

test("each line's own traits: Spheres, Renown, Arts and Realms, Passions and Fetters, Edges, Lore, Hekau, Chi, Horrors", () => {
  const has = (id, b) => SR.blocksOf(L(id)).includes(b);
  assert.deepEqual(L("m20").powers.cols.flat(), ["spheres1", "spheres2", "spheres3"]);
  for ( const [id, bs] of Object.entries({v20: ["disciplines", "virtues", "road", "bloodpool", "weakness"], w20: ["gifts", "renown", "rank", "rage", "gnosis"],
    m20: ["arete", "quintessenceWheel", "otherTraits"], c20: ["arts", "realms", "birthrights", "antithesis", "glamour", "nightmare", "banality", "threshold"],
    wr20: ["passions", "arcanoi", "corpus", "pathos", "fetters", "thorns", "angst", "darkPassions"], htr: ["edges", "hunterVirtues", "conviction", "derangements"],
    demon: ["lores", "virtues", "apocalypticForm", "faith", "torment"], mummy: ["hekau", "meritsFlaws", "balance", "sekhem"],
    kote: ["rites", "yinYang", "dharma", "hun", "po", "demonchi", "imbalance"], orpheus: ["horrors", "stains", "defaultAbilities", "vitality", "spite"]}) )
    for ( const b of bs ) assert.ok(has(id, b), `${id}: ${b}`);
  assert.equal(SR.ORPHEUS_DEFAULTS.length, 8);
});

test("every block is built by main.mjs; every button is a WoDX Actions call", () => {
  const cases = new Set([...main.matchAll(/case "([a-zA-Z0-9]+)"/g)].map(m => m[1]));
  for ( const id of SR.LATER_SHEETS ) for ( const b of SR.blocksOf(L(id)) ) assert.ok(cases.has(b), `${id}: ${b}`);
  const api = actions.slice(actions.indexOf("const API = {"));
  const buttons = main.slice(main.indexOf("const BUTTONS = {"), main.indexOf("function header("));
  for ( const id of SR.LATER_SHEETS ) for ( const b of L(id).buttons ) {
    assert.ok(new RegExp(`\\b${b}[,:]`).test(api), `${id}: API ${b}`);
    assert.ok(new RegExp(`\\b${b}: \\[`).test(buttons), `${id}: button ${b}`);
  }
});

test("routing: the era, the Kuei-jin and Orpheus variants, Reckoning hunters, and the three new types", () => {
  for ( const r of [/isKotE\(actor\) \? "kote"/, /isOrpheus\(actor\) \? "orpheus"/, /"ghoul20"/, /case "Wraith": return "wr20"/, /case "Demon": return "demon"/, /case "Mummy": return "mummy"/,
    /line === "reckoning"/, /isMageDA\(actor\) \? "mageDA" : "m20"/, /isFaeDA\(actor\) \? "faeDA" : "c20"/, /inDA\(\) \? "werewolfDA" : "w20"/] ) assert.match(main, r);
  for ( const c of ["WraithActorSheet", "DemonActorSheet", "MummyActorSheet"] ) assert.match(main, new RegExp(`wodxSheet\\(${c}`));
  assert.match(main, /\["Wraith", WodxWraithSheet\], \["Demon", WodxDemonSheet\], \["Mummy", WodxMummySheet\]/);
});

test("the system's own parts and stat boxes, with the permanent and temporary rows its sheets draw", () => {
  for ( const part of ["mage/stats_arete.html", "mage/stats_quintessence.html", "hunter/stats_virtue.html", "parts/stats_health.html", "getGetStatArea @root.actor stat key roll perm temp"] ) assert.ok(block.includes(part), part);
  assert.match(core, /wodx\.powers/); assert.match(core, /wodx\.hasLower/);
  // as the system's sheets draw them: Torment and Corpus without a roll; Balance, Hun and P'o permanent only; Nightmare, Pathos and Demon Chi points only
  for ( const r of [/case "torment": return stat\("torment", adv\.torment, false\)/, /case "balance": return stat\("balance", adv\.balance, true, true, false\)/,
    /case "nightmare": return stat\("nightmare", adv\.nightmare, false, false, true\)/, /case "pathos": return stat\("pathos", adv\.pathos, false, false, true\)/,
    /stat\("yin", adv\.yin, false, true, false\)/, /system\.advantages\.dharma\.label/] ) assert.match(main, r);
  const words = /\b(he|she|him|her|his|hers)\b/i;
  const strings = (main.match(/"[^"\n]{12,}"/g) ?? []).join(" ") + JSON.stringify(SR.SHEETS);
  assert.ok(!words.test(strings), strings.match(words)?.[0]);
});
