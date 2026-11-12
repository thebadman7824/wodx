import {test} from "node:test";
import assert from "node:assert/strict";
import * as S from "../../modules/wodx-chronicle/scripts/signature-rules.mjs";

/* Signature features, Vampire first (Chronicle 0.25.0, Splat Features Desk, B1120 to B1124) */

const W = S.WEEK;

test("clan names find their row on whole words only", () => {
  assert.equal(S.vampireRow("Toreador")?.key, "toreador");
  assert.equal(S.vampireRow("wod.bio.vampire.toreador")?.key, "toreador");
  assert.equal(S.vampireRow("Followers of Set")?.key, "setite");
  assert.equal(S.vampireRow("Setite")?.key, "setite");
  assert.equal(S.vampireRow("Settler"), null);
  assert.equal(S.vampireRow("", null, "Brujah")?.key, "brujah");
  assert.equal(S.vampireRow(["Gangrel antitribu"])?.key, "gangrel");
  assert.equal(S.vampireRow("Ventrue")?.key, "ventrue");
  assert.equal(S.vampireRow("Settite of nowhere"), null);
  for ( const r of S.VAMPIRE ) assert.ok(r.page && r.title && r.text, r.key);
});

test("a Muse's Obsession rises a point a week unseen and stops at five", () => {
  let m = S.newMuse({name: "The portrait", kind: "work", now: 0});
  assert.equal(S.museTick(m, W - 1).rose, 0);
  let r = S.museTick(m, W); assert.equal(r.rose, 1); m = r.muse;
  assert.equal(S.museTick(m, W + 3600).rose, 0, "the same week is not counted twice");
  r = S.museTick(m, 3 * W); assert.equal(r.rose, 2); m = r.muse;
  r = S.museTick(m, 20 * W); assert.equal(r.muse.obsession, 5); m = r.muse;
  assert.equal(S.beautyPenalty([m, S.newMuse({name: "x"})]), 5);
});

test("seeing, owning or making for the Muse lowers it, and a hurt Muse calls for frenzy", () => {
  let m = {...S.newMuse({name: "Anna", kind: "person"}), obsession: 4};
  assert.equal(S.museSeen(m, 10, "see").obsession, 3);
  assert.equal(S.museSeen(m, 10, "made").obsession, 2);
  const seen = S.museSeen(m, 10 * W, "see");
  assert.equal(S.museTick(seen, 10 * W + W - 1).rose, 0, "the week starts again from the visit");
  const h = S.museHarmed(m);
  assert.equal(h.muse.obsession, 5);
  assert.equal(h.frenzy, true);
  assert.equal(S.museHarmed(S.newMuse({name: "chapel", kind: "place"})).frenzy, false);
});

test("the Corruption ledger moves on wins and gifts, and crosses 3 and 5", () => {
  let rec = S.newCorruption({by: "a1", byName: "Nephthys", vice: "drink"});
  assert.equal(S.stepFromSocial("charm", "win"), 1);
  assert.equal(S.stepFromSocial("persuade", "lose"), 0);
  assert.equal(S.stepFromSocial("bribe", "botch"), -1);
  assert.equal(S.stepFromSocial("threaten", "win"), 0, "threats don't corrupt");
  assert.equal(S.stepFromTrade(rec, {mode: "give", give: {name: "a flask of brandy", kind: "drink", substance: "alcohol"}}), 1);
  assert.equal(S.stepFromTrade(rec, {mode: "sell", give: {name: "a flask of brandy"}, want: "money"}), 0, "a sale is not a gift");
  assert.equal(S.stepFromTrade(rec, {mode: "give", give: {name: "a loaf of bread", kind: "food"}}), 0);
  assert.equal(S.stepFromTrade({...rec, vice: ""}, {mode: "give", give: {name: "brandy"}}), 0);
  let r = S.corrupt(rec, 3, "charm, win"); assert.deepEqual(r.crossed, [3]); rec = r.rec;
  r = S.corrupt(rec, 5, "more"); assert.equal(r.after, 5); assert.deepEqual(r.crossed, [5]);
  assert.equal(S.corrupt(r.rec, -9, "a priest").after, 0);
  assert.equal(S.resistPenalty(r.rec), 5);
  assert.match(S.stepText(5), /belongs/);
  assert.ok(S.VICES.every(v => v.feeds.length));
});

test("Brujah causes by year, custom causes wait for the Storyteller, three kept tempers make a Rant", () => {
  assert.ok(!S.causesAt(1197).some(c => c.key === "workers"));
  assert.ok(S.causesAt(1900).some(c => c.key === "workers"));
  assert.equal(S.newCause({key: "workers", year: 1197}), null, "not thought of yet, and no custom text");
  const own = S.newCause({custom: "The guild of masons", year: 1197});
  assert.equal(own.custom, true); assert.equal(own.approved, false);
  let c = S.newCause({key: "city", year: 1197});
  for ( let i = 0; i < 2; i++ ) c = S.causeKept(c).cause;
  const r = S.causeKept(c); assert.equal(r.ready, true);
  assert.equal(S.rantSpent(r.cause).rant, 0);
  assert.equal(S.temperDifficulty(6), 8);
  assert.equal(S.temperDifficulty(9), 10);
});

test("Gangrel marks last a month, then heal; the showing ones change rolls", () => {
  const m = S.newMark("ears", 0);
  assert.equal(m.until, S.MARK_LASTS);
  assert.equal(S.activeMarks([m], S.MARK_LASTS - 1).length, 1);
  assert.equal(S.activeMarks([m], S.MARK_LASTS).length, 0);
  const fx = S.markEffects([m], 10);
  assert.ok(fx.some(e => e.tags.includes("hearing") && e.dice === 1));
  assert.equal(S.newMark("wings", 0), null);
  const held = S.MARKS.slice(0, -1).map(x => ({key: x.key}));
  assert.equal(S.pickMark(held, () => 0).key, S.MARKS.at(-1).key, "a mark not already held");
  assert.equal(S.marksShow([S.newMark("tail", 0)], 1), true);
  assert.equal(S.marksShow([S.newMark("ears", 0)], 1), false);
});

test("Malkavian: derangements from the sheet, varied lines, and riddles that hide the event", () => {
  assert.equal(S.vampireRow("Malkavian")?.feature, "glimpse");
  assert.deepEqual(S.derangementsOf("Paranoia (since the fire); synaesthesia"), ["paranoia", "synesthesia"]);
  assert.deepEqual(S.derangementsOf(""), []);
  for ( const d of S.DERANGEMENTS ) assert.ok(d.lines.length >= 8, `${d.key} has many lines`);
  const seen = new Set();
  for ( let i = 0; i < 40; i++ ) seen.add(S.hearLine(["paranoia"], {name: "Old Jan", topic: "News", seed: S.seedOf("a", "npc", "News", i)}));
  assert.ok(seen.size >= 6, "the same derangement gives many different lines");
  assert.equal(S.hearLine([], {seed: 1}), null);
  assert.ok(![...seen].some(l => /\{|\}/.test(l)), "no placeholder left");
  const ev = {id: "black-death", name: "The Black Death and the Second Great Maelstrom", summary: "Plague reaches Europe."};
  const g = S.glimpseFor(ev, 200, 7);
  assert.equal(g.theme, "plague");
  assert.ok(!/black death|maelstrom|europe/i.test(g.text), "the event's own words are not shown");
  assert.match(g.text, /within the year/i);
  assert.equal(S.glimpseFor({name: "Something", summary: ""}, 3, 0).theme, "other");
  assert.equal(S.whenWords(5000), "long after tonight");
  assert.equal(S.mayGlimpse(null, 100), true);
  assert.equal(S.mayGlimpse(50000, 60000), false);
  assert.equal(S.mayGlimpse(50000, 50000 + 86400), true);
});

/* Chronicle 0.27.0: Tzimisce, Lasombra, Ravnos, Caitiff (B1126 to B1129) */

test("the new clans find their rows", () => {
  assert.equal(S.vampireRow("Tzimisce")?.feature, "soil");
  assert.equal(S.vampireRow("Lasombra antitribu")?.feature, "camera");
  assert.equal(S.vampireRow("wod.bio.vampire.ravnos")?.feature, "vice");
  assert.equal(S.vampireRow("Caitiff")?.feature, "oddity");
  assert.equal(S.vampireRow("Clanless")?.key, "caitiff");
});

test("native soil: carrying it is a rest, a night without it halves pools until the next rest", () => {
  const D = S.DAY, noon = 43200;
  let r = S.soilNight({}, D + noon, true);
  assert.equal(r.halved, false); assert.equal(r.changed, true);
  assert.equal(S.soilNight(r.soil, D + noon + 3600, false).changed, false, "same night is not counted twice");
  r = S.soilNight(r.soil, 2 * D + noon, false); assert.equal(r.halved, true); assert.equal(r.soil.short, 1);
  r = S.soilNight(r.soil, 3 * D + noon, false); assert.equal(r.soil.short, 2);
  r = S.soilNight(r.soil, 4 * D + noon, true); assert.equal(r.halved, false); assert.equal(r.soil.short, 0);
  assert.ok(S.isSoil({name: "Native soil (Rothenstein)"}));
  assert.ok(S.isSoil({name: "a pouch", soil: true}));
  assert.ok(!S.isSoil({name: "Earthenware jug"}));
});

test("cameras by year, and the scene's own mark wins", () => {
  assert.equal(S.cameraAt(1838), null);
  assert.match(S.cameraAt(1840).label, /photograph/);
  assert.match(S.cameraAt(1980).label, /video/);
  assert.equal(S.watched(1500, true), false, "no camera before 1839 whatever the mark");
  assert.equal(S.watched(1900, undefined), false);
  assert.equal(S.watched(1900, true), true);
  assert.equal(S.watched(2030, undefined), true);
  assert.equal(S.watched(2030, false), false);
});

test("the Ravnos vice: feeding acts, a growing pull, one prompt a night", () => {
  assert.ok(S.feedsRavnos("lying", "con"));
  assert.ok(S.feedsRavnos("theft", "lift"));
  assert.ok(!S.feedsRavnos("theft", "con"));
  const r = {vice: "lying", fedAt: 0, arrivedAt: 0};
  assert.equal(S.ravnosDifficulty(r, 0), 6);
  assert.equal(S.ravnosDifficulty(r, 2 * W), 8);
  assert.equal(S.ravnosDifficulty(r, 40 * S.DAY), 9);
  assert.equal(S.ravnosDifficulty({...r, arrivedAt: 40 * S.DAY}, 40 * S.DAY), 8);
  assert.ok(S.mayAskRavnos({askedAt: null}, 0));
  assert.ok(!S.mayAskRavnos({askedAt: S.DAY + 50000}, S.DAY + 60000));
  assert.ok(S.mayAskRavnos({askedAt: S.DAY + 50000}, 2 * S.DAY + 50000));
});

test("a thin-blooded Caitiff rolls once a year for an odd gift", () => {
  let r = S.oddGift({}, 1999, () => 0.05);
  assert.ok(r.gift); assert.equal(r.odd.year, 1999);
  assert.equal(S.oddGift(r.odd, 1999, () => 0).checked, false, "once a year");
  r = S.oddGift({}, 2000, () => 0.5); assert.equal(r.gift, null); assert.equal(r.checked, true);
  const all = {gifts: S.ODD_GIFTS.map(g => g.key), year: 1};
  assert.equal(S.oddGift(all, 2, () => 0).gift, null, "no gift left to give");
  assert.ok(S.thinBlooded(["Thin Blood"])); assert.ok(!S.thinBlooded(["Thick skin"]));
});

/* Chronicle 0.28.0: Nosferatu, Tremere, Ventrue, Assamite, Giovanni (B1150 to B1154) */

test("the five clans find their rows; Cappadocians are the Giovanni row", () => {
  assert.equal(S.vampireRow("Nosferatu")?.feature, "secrets");
  assert.equal(S.vampireRow("Tremere")?.feature, "pyramid");
  assert.equal(S.vampireRow("Ventrue")?.feature, "domain");
  assert.equal(S.vampireRow("Banu Haqim")?.feature, "contracts");
  assert.equal(S.vampireRow("Cappadocian")?.feature, "family");
  assert.equal(S.giovanniName(1300), "Cappadocian");
  assert.equal(S.giovanniName(1500), "Giovanni");
});

test("a secret goes stale as fast as word travels in its age", () => {
  const D = S.DAY;
  assert.equal(S.freshDays(1200), 60);
  assert.equal(S.freshDays(2000), 1);
  assert.equal(S.secretPrice(0, 30 * D, 1200), "minor");
  assert.equal(S.secretPrice(0, 61 * D, 1200), "trivial");
  assert.equal(S.secretPrice(0, 2 * D, 2000), "trivial");
  assert.ok(S.isSecretPage("A page of secrets: the abbot"));
  assert.ok(!S.isSecretPage("A page of sums"));
});

test("orders come only from above, and refusing costs more from far above", () => {
  assert.ok(S.mayOrder(7, 2)); assert.ok(!S.mayOrder(2, 2));
  assert.equal(S.refuseCost(3, 2), 1); assert.equal(S.refuseCost(8, 2), 2);
  assert.equal(S.rankLabel(99), "Inner Council");
});

test("Ventrue influence once a month from the institutions of the age", () => {
  assert.ok(S.institutionsAt(1197).includes("the bishop's court"));
  assert.ok(!S.institutionsAt(1197).includes("a bank"));
  assert.ok(S.institutionsAt(2030).includes("an arcology board"));
  assert.ok(S.mayInfluence(null, 5)); assert.ok(!S.mayInfluence(5, 5)); assert.ok(S.mayInfluence(5, 6));
});

test("Assamite contracts: kept raises standing and pays a tithe, overdue ones fail", () => {
  const c = S.newContract({target: "the reeve", price: 50, days: 10, now: 0});
  assert.equal(S.overdue([c], 9 * S.DAY).length, 0);
  assert.equal(S.overdue([c], 10 * S.DAY).length, 1);
  let r = S.settleContract(c, 1, true); assert.equal(r.standing, 2); assert.equal(r.tithe, 5);
  r = S.settleContract(c, 0, false); assert.equal(r.standing, 0); assert.equal(r.tithe, 0);
  assert.equal(S.settleContract(c, 5, true).standing, 5);
});

/* Chronicle 0.29.0: bloodlines, castes and Laibon legacies (B1155 to B1157) */

test("bloodlines find their own row before their parent clan's", () => {
  assert.equal(S.vampireRow("True Brujah")?.key, "truebrujah");
  assert.equal(S.vampireRow("Brujah")?.key, "brujah");
  assert.equal(S.vampireRow("Salubri antitribu")?.key, "salubriat");
  assert.equal(S.vampireRow("Salubri")?.key, "salubri");
  assert.equal(S.vampireRow("Old Clan Tzimisce")?.key, "koldun");
  assert.equal(S.vampireRow("Tzimisce")?.key, "tzimisce");
  assert.equal(S.vampireRow("Harbingers of Skulls")?.key, "harbingers");
  assert.equal(S.vampireRow("Xi Dundu")?.key, "xidundu");
  assert.equal(S.vampireRow("Assamite vizier")?.key, "vizier");
  assert.equal(S.vampireRow("Daughters of Cacophony")?.key, "daughters");
  for ( const k of ["baali", "gargoyle", "kiasyd", "samedi", "ahrimanes", "anda", "lhiannan", "noiad", "bloodbrothers", "lamia", "nagaraja",
    "akunanse", "guruhi", "ishtarri", "kinyonyi", "naglopers", "osebo", "shango"] ) assert.ok(S.VAMPIRE.some(r => r.key === k), k);
  for ( const r of S.BLOODLINES ) {
    assert.equal(r.feature, "line", r.key);
    for ( const e of r.effects ?? [] ) assert.ok(e.tags?.length && (e.dice || e.difficulty), r.key);
    for ( const f of r.also ?? [] ) assert.ok(S.VAMPIRE.some(x => x.feature === f), `${r.key} borrows ${f}`);
  }
});

test("the Old Clan holds out one night longer without soil", () => {
  const D = S.DAY, noon = 43200;
  let r = S.soilNight({}, D + noon, true, 1);
  r = S.soilNight(r.soil, 2 * D + noon, false, 1); assert.equal(r.halved, false);
  r = S.soilNight(r.soil, 3 * D + noon, false, 1); assert.equal(r.halved, true);
});

/* Chronicle 0.30.0: ghouls and revenant families (B1158, B1159) */

test("revenant families: the books' four, and new ones founded in play", () => {
  assert.equal(S.familyRow(["Grimaldi"])?.key, "family-grimaldi");
  assert.ok(S.familyRow(["Zantosa"])?.also.includes("vice"));
  assert.ok(S.familyRow(["Bratovitch"])?.effects.some(e => e.tags.includes("animal ken")));
  assert.equal(S.familyRow(["Toreador"]), null);
  const f = S.newFamily({name: "Kessler", founder: "a Tzimisce voivode", trait: "war", disciplines: "Potence, Fortitude, Celerity, Auspex", flaw: "hot blood", year: 1250});
  assert.equal(f.disciplines.length, 3); assert.equal(f.approved, false);
  assert.equal(S.familyRow(["Kessler"], [f]), null, "waits for the Storyteller");
  assert.equal(S.familyRow(["Kessler"], [{...f, approved: true}])?.key, "family-kessler");
  assert.equal(S.newFamily({name: "", trait: "war"}), null);
  assert.equal(S.newFamily({name: "X", trait: "nonsense"}), null);
});

test("a ghoul counts whole months without vitae", () => {
  assert.equal(S.monthsUnfed(0, 29 * S.DAY), 0);
  assert.equal(S.monthsUnfed(0, 61 * S.DAY), 2);
  assert.equal(S.GHOUL.feature, "ghoul");
});

/* Chronicle 0.31.0: Werewolf tribes, auspices, breeds, Kinfolk and the other Changing Breeds (B1160 to B1164) */

test("a Garou stacks tribe, auspice and breed; other Fera get their own row", () => {
  assert.deepEqual(S.garouRows({tribe: ["get-of-fenris"], auspice: ["ahroun"], breed: ["metis"]}).map(r => r.key), ["fenris", "ahroun", "metis"]);
  assert.deepEqual(S.garouRows({tribe: "Glass Walkers", auspice: "", breed: "homid", fera: "Garou"}).map(r => r.key), ["glasswalkers", "homid"]);
  assert.equal(S.garouRows({tribe: "Warders of Men"})[0].key, "glasswalkers", "the Dark Ages name");
  const k = S.garouRows({fera: "Kitsune", breed: "lupus", tribe: "Black Furies"});
  assert.deepEqual(k.map(r => r.key), ["kitsune", "lupus"], "a Fera has no Garou tribe row");
  assert.ok(k[0].text.includes(S.COURTS_TEXT));
  assert.ok(!S.rowIn(S.FERA, "Kitsune").text.includes(S.COURTS_TEXT), "the table itself is not changed");
  assert.equal(S.garouRows({fera: "Bastet"})[0].also[0], "secrets");
});

test("every tribe, auspice, breed and Changing Breed on the desk has a row", () => {
  const want = ["blackfuries", "bonegnawers", "childrengaia", "fianna", "fenris", "glasswalkers", "redtalons", "shadowlords", "silentstriders", "silverfangs",
    "stargazers", "uktena", "wendigo", "croatan", "bunyip", "whitehowlers", "bsd"];
  assert.deepEqual(S.TRIBES.map(r => r.key), want);
  assert.equal(S.AUSPICES.length, 5); assert.equal(S.BREEDS.length, 3);
  for ( const k of ["ajaba", "ananasi", "bastet", "corax", "gurahl", "kitsune", "mokole", "nagah", "nuwisha", "ratkin", "rokea", "hakken", "khan", "nezumi",
    "samebito", "zhonglung", "tengu", "kumo", "okuma", "apis", "camazotz", "grondr"] ) assert.ok(S.FERA.some(r => r.key === k), k);
  for ( const r of [...S.TRIBES, ...S.AUSPICES, ...S.BREEDS, ...S.FERA, S.KINFOLK] ) {
    assert.ok(r.title && r.text && r.page && r.feature, r.key);
    assert.ok(!/—/.test(r.text), `${r.key}: no em-dash`);
  }
});

test("lost tribes and lost Fera are gone by their year", () => {
  const cro = S.rowIn(S.TRIBES, "Croatan"), apis = S.rowIn(S.FERA, "Apis");
  assert.equal(S.goneBy(cro, 1500), false); assert.equal(S.goneBy(cro, 1600), true);
  assert.equal(S.goneBy(apis, 1197), true);
  assert.equal(S.goneBy(S.rowIn(S.TRIBES, "Fianna"), 2026), false);
});

test("creatures of the Wyrm, first into battle, and the Stargazer's sky", () => {
  assert.ok(S.isWyrm("Black Spiral Dancers")); assert.ok(S.isWyrm("a fomor of Pentex")); assert.ok(!S.isWyrm("Hans the miller"));
  assert.equal(S.firstInit([3, 14, null]), 15);
  assert.ok(S.mayReadSky(null, 0)); assert.ok(!S.mayReadSky(0, 20 * S.DAY)); assert.ok(S.mayReadSky(0, 30 * S.DAY));
  assert.ok(S.skyClear({sky: "clear", precip: "none", fog: "none"})); assert.ok(!S.skyClear({sky: "overcast"})); assert.ok(!S.skyClear({sky: "clear", precip: "rain"}));
  assert.ok(S.skyClear(null), "no weather module: the Storyteller decides");
});

test("signature effects in the trait shape, with tag aliases", () => {
  const fx = [{tags: ["resist-frenzy"], difficulty: 1, why: "Osebo"}, {tags: ["survival"], dice: 1, why: "Red Talons"}, {tags: ["resist-dominate"], difficulty: 2, why: "Gargoyles"},
    {tags: ["animal ken"], dice: 1, why: "Bratovitch"}, {tags: ["all"], halve: true, why: "soil"}];
  assert.deepEqual(S.sigRollEffects(fx, {channel: "roll", tags: ["frenzy"]}).map(e => [e.name, e.diff]), [["Osebo", 1]]);
  assert.deepEqual(S.sigRollEffects(fx, {channel: "roll", tags: ["survival"]}).map(e => [e.name, e.dice]), [["Red Talons", 1]]);
  assert.deepEqual(S.sigRollEffects(fx, {channel: "resist", tags: ["mind"]}).map(e => e.name), ["Gargoyles"]);
  assert.deepEqual(S.sigRollEffects(fx, {channel: "roll", tags: ["animalken"]}).map(e => e.name), ["Bratovitch"]);
  assert.equal(S.deformityByKey("hairless").effects[0].tags[0], "social");
});
