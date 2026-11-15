/**
 * The Plains peoples gate (B3820 to B3824): WoDX Creation's People generator names the people of the American West
 * as the Lakota, Dakota and Nakota, the Cheyenne, the Comanche and the Kiowa do, from 1197 on. In rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplains.mjs?${Date.now()}`)).run()
 * The gate never moves the clock or changes a setting. It makes one actor through the People generator and the kit
 * removes it.
 *   1. WoDX Creation and WoDX Chronicle with the Plains peoples (the West has a medieval mix)
 *   2. the West before 1500 is the four peoples; eastern North America has none of them
 *   3. before 1800: own names from the records and women named by band, no church names, no family name but a clan
 *      for the Pueblos and the Diné (the Southwest, B3930)
 *   4. from 1800: a church given name and a family name from the rolls
 *   5. the People generator for the West makes a person of one of the West's peoples, whatever the clock's age
 *   6. the generated person becomes a sheet with that name
 *   7. the Maya (B3830): beside the Nahua in Mexico before the conquest, an own name and a patronym, a church name after
 *   8. the Armenians (B3940): in Anatolia's mix, a town byname before 1800 and -ian or -yan after
 *   9. the Missouri villages (B4130): the Mandan, Hidatsa, Arikara and Pawnee in the West, women named by village
 *  10. the northern Plains (B4140): the Crow with clans, the Blackfoot and Arapaho by division
 *  11. the Great Basin (B4150): the Shoshone and the Ute by division and band
 *  12. Canada (B4160): the Cree and Anishinaabe by division and town, the Haida and Tlingit by clan
 *  13. the Inuit (B4650): in the Arctic beside the Norse and in Canada, own names for anyone, family names later
 *  14. the Taíno (B4660): the Caribbean named before 1492, church names after, the Akan and Yoruba beside them
 *  15. Aboriginal Australians (B4680): Australia named from 1197, women of a nation, family names later
 *  16. central Africa (B4690): the Kongo, Luba and Ganda from 1197, Kongo church names from 1491
 *  17. the Amazigh (B4710): the Maghreb's Berbers beside the Arabs, tribes and Aït family names
 *  18. Sephardi and Mizrahi Jews (B4730): Sefarad to 1492, then the Ottoman lands; Baghdad to the Maghreb
 *  19. the Khmer (B4740): Angkor at 1197, family name first in modern Cambodia
 *  20. Filipinos (B4750): the islands in the Malay world's mix, church names from 1565
 *  21. the Sami (B4900): Scandinavia's north, given names alone, family names after 1800
 *  22. the Tuareg (B4950): the desert edge of West Africa and the Maghreb, ag and welet the father
 *  23. the Moro (B5000): Mindanao and Sulu in the Malay world's mix, sultanate names, then family names
 *  24. the Banyarwanda and Barundi (B5030): Rwanda and Burundi in central Africa, own names, then family names
 *  25. the Philippines (B5150): a region of its own with its map squares, money, law and mix; the Malay world keeps no Filipinos
 *  26. the raised lists (B5180 on): every people raised to 300 names has 50 or more in each list in each age on the testbed
 *  27. clean up
 * Result: Data/wodx-gate/gateplains-result.json.
 */
import {gate} from "./kit.mjs";

const CR = "wodx-creation", CH = "wodx-chronicle";
const WEST = "north-america-west", EAST = "american";
const PEOPLES = ["lakota", "cheyenne", "comanche", "kiowa", "pueblo", "dine", "apache", "mandan", "hidatsa", "arikara", "pawnee", "blackfoot", "arapaho", "crow", "shoshone", "ute"];
const CLANS = ["pueblo", "dine", "crow"];
const gen = () => game.modules.get(CH).api.gen;
const results = (ctx, id) => (gen().lookup({...gen().context(), ...ctx})(id)?.results ?? []).map(r => r.text);

export async function run() {
  const G = gate("gateplains");
  if ( G.notLive() ) return "gateplains never runs in the Live world";
  try {
    const R = await import(`/modules/${CR}/scripts/people-rules.mjs`);
    const draw = (era, origin, n, salt) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:${salt}:${origin}`, i),
      tables: gen().lookup({...gen().context(), era, culture: WEST}), origin, sex: i % 2 ? "female" : "male"}));

    await G.step("1. modules", async () => {
      // The world's copies of the shipped tables catch up a moment after start-up; bring them up to date first, so an
      // older installed mix (the West's industrial one before B3820) does not stand in for the new one. With the name
      // lists raised to 300 a reset lane has many tables to rewrite, so this step may take up to three minutes
      await gen().installTables?.();
      const med = results({era: "medieval", culture: WEST}, "people.origin");
      G.ok("1. Creation and Chronicle with the Plains peoples", game.modules.get(CR)?.active && game.modules.get(CH)?.active && med.includes("lakota"),
        {creation: game.modules.get(CR)?.version, chronicle: game.modules.get(CH)?.version, medieval: med});
    }, {timeout: 180000});

    await G.step("2. who lives where", async () => {
      const med = results({era: "medieval", culture: WEST}, "people.origin"), east = results({era: "medieval", culture: EAST}, "people.origin");
      const ind = results({era: "industrial", culture: WEST}, "people.origin");
      G.ok("2. the West before 1500 is the four peoples, a share later; the East borrows none",
        PEOPLES.every(p => med.includes(p)) && med.length === PEOPLES.length && ind.includes("lakota") && ind.includes("anglo") && !east.some(p => PEOPLES.includes(p)),
        {medieval: med, industrial: ind, east});
    });

    await G.step("3. before 1800", async () => {
      const bad = [];
      for ( const o of PEOPLES ) for ( const era of ["medieval", "early-modern"] ) for ( const p of draw(era, o, 40, "old") ) {
        if ( !p.name || p.name.includes("{") || (p.family && !(CLANS.includes(o) && /^of the .+ clan$/.test(p.family))) || /^(John|Joseph|Mary|Peter|Paul|Catherine) /.test(p.name) ) bad.push(`${o} ${era}: ${p.name} / ${p.family}`);
      }
      const women = draw("medieval", "kiowa", 20, "band").filter((p, i) => i % 2).map(p => p.name);
      G.ok("3. own names and women of a band, no church name or family name", !bad.length && women.every(n => /^A woman of the /.test(n)),
        {bad: bad.slice(0, 6), sample: draw("medieval", "lakota", 6, "show").map(p => p.name), women: women.slice(0, 3)});
    });

    await G.step("4. from 1800", async () => {
      const bad = [], sample = [];
      for ( const o of PEOPLES ) for ( const era of ["industrial", "modern"] ) for ( const p of draw(era, o, 20, "new") ) {
        if ( !p.family || p.name.includes("{") ) bad.push(`${o} ${era}: ${p.name}`);
        else if ( sample.length < 6 ) sample.push(`${p.name} (${o})`);
      }
      G.ok("4. a church given name and a family name", !bad.length, {bad: bad.slice(0, 6), sample});
    });

    let person = null;
    await G.step("5. the People generator", async () => {
      const api = game.modules.get(CR).api.people;
      const mix = results({culture: WEST}, "people.origin");
      const ps = Array.from({length: 12}, (_, row) => api.generate({batch: `gateplains-${Date.now()}`, row, culture: WEST}));
      person = ps.find(p => PEOPLES.includes(p.origin)) ?? ps[0];
      G.ok("5. the West's people come from the West's mix", ps.every(p => p.name && !p.name.includes("{") && (!mix.length || mix.includes(p.origin))),
        {era: gen().context().era, mix, people: ps.slice(0, 6).map(p => `${p.name} (${p.origin})`)});
    });

    await G.step("6. a sheet", async () => {
      const [actor] = await game.modules.get(CR).api.people.create({people: [person]});
      if ( actor ) await actor.setFlag("world", "wodxGate", {gate: "gateplains", run: G.run});
      G.ok("6. the sheet carries the name", !!actor && actor.name === person.name, {name: actor?.name, wanted: person?.name});
      if ( actor ) await actor.delete();
    });

    await G.step("7. the Maya", async () => {
      const med = results({era: "medieval", culture: "mexico"}, "people.origin");
      const ctx = era => gen().lookup({...gen().context(), era, culture: "mexico"});
      const old = Array.from({length: 20}, (_, i) => R.nameOf({rand: gen().random("gateplains:maya:old", i), tables: ctx("medieval"), origin: "maya", sex: i % 2 ? "female" : "male"}));
      const now = Array.from({length: 20}, (_, i) => R.nameOf({rand: gen().random("gateplains:maya:new", i), tables: ctx("modern"), origin: "maya", sex: i % 2 ? "female" : "male"}));
      const church = /^(Juan|Pedro|Francisco|Diego|Gaspar|Andrés|Pablo|Martín|Antonio|María|Ana|Catalina|Juana|Francisca|Inés|Magdalena|Isabel)$/;
      G.ok("7. the Maya beside the Nahua; own names and a patronym, then church names", med.includes("maya") && med.includes("nahua")
        && old.every(p => p.family && !p.name.includes("{") && !church.test(p.given)) && now.every(p => p.family && !p.name.includes("{")),
        {medieval: med, old: old.slice(0, 4).map(p => p.name), now: now.slice(0, 4).map(p => p.name)});
    });

    await G.step("8. the Armenians", async () => {
      const mix = results({era: "medieval", culture: "anatolia"}, "people.origin");
      const ctx = era => gen().lookup({...gen().context(), era, culture: "anatolia"});
      const draw2 = era => Array.from({length: 20}, (_, i) => R.nameOf({rand: gen().random(`gateplains:hy:${era}`, i), tables: ctx(era), origin: "armenian", sex: i % 2 ? "female" : "male"}));
      const old = draw2("medieval"), now = draw2("modern");
      G.ok("8. Armenians in Anatolia; a town byname, then -ian or -yan", mix.includes("armenian") && old.every(p => /tsi$/.test(p.family ?? ""))
        && now.every(p => /(ian|yan)$/.test(p.family ?? "")), {mix, old: old.slice(0, 4).map(p => p.name), now: now.slice(0, 4).map(p => p.name)});
    });
    await G.step("9. the Missouri villages", async () => {
      const med = results({era: "medieval", culture: WEST}, "people.origin"), bad = [];
      for ( const o of ["mandan", "hidatsa", "arikara", "pawnee"] ) {
        for ( const p of draw("medieval", o, 20, "mo") ) if ( !p.name || p.name.includes("{") || p.family ) bad.push(`${o}: ${p.name} / ${p.family}`);
        for ( const p of draw("modern", o, 10, "mo") ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} modern: ${p.name}`);
      }
      const women = draw("medieval", "pawnee", 20, "mo-w").filter((p, i) => i % 2).map(p => p.name);
      G.ok("9. the Missouri villages in the West; own names, women of a village, then family names",
        ["mandan", "hidatsa", "arikara", "pawnee"].every(o => med.includes(o)) && !bad.length && women.every(n => /^A woman of the /.test(n)),
        {medieval: med, bad: bad.slice(0, 6), sample: draw("medieval", "mandan", 4, "show").map(p => p.name), women: women.slice(0, 3)});
    });
    await G.step("10. the northern Plains", async () => {
      const med = results({era: "medieval", culture: WEST}, "people.origin"), bad = [];
      for ( const p of draw("medieval", "crow", 20, "np") ) if ( !/^of the .+ clan$/.test(p.family ?? "") || p.name.includes("{") ) bad.push(`crow: ${p.name}`);
      for ( const o of ["blackfoot", "arapaho"] ) for ( const p of draw("medieval", o, 20, "np") ) if ( p.family || p.name.includes("{") ) bad.push(`${o}: ${p.name}`);
      for ( const o of ["crow", "blackfoot", "arapaho"] ) for ( const p of draw("modern", o, 10, "np") ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} modern: ${p.name}`);
      G.ok("10. the Crow, Blackfoot and Arapaho in the West; clans or divisions, then family names",
        ["crow", "blackfoot", "arapaho"].every(o => med.includes(o)) && !bad.length,
        {medieval: med, bad: bad.slice(0, 6), sample: draw("medieval", "crow", 4, "show").map(p => p.name)});
    });
    await G.step("11. the Great Basin", async () => {
      const med = results({era: "medieval", culture: WEST}, "people.origin"), bad = [];
      for ( const o of ["shoshone", "ute"] ) {
        for ( const p of draw("medieval", o, 20, "gb") ) if ( p.family || p.name.includes("{") ) bad.push(`${o}: ${p.name}`);
        for ( const p of draw("modern", o, 10, "gb") ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} modern: ${p.name}`);
      }
      G.ok("11. the Shoshone and the Ute in the West; own names, then family names",
        ["shoshone", "ute"].every(o => med.includes(o)) && !bad.length, {bad: bad.slice(0, 6), sample: draw("medieval", "ute", 4, "show").map(p => p.name)});
    });
    await G.step("12. Canada", async () => {
      const med = results({era: "medieval", culture: "canada"}, "people.origin"), bad = [];
      const ca = (era, o, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:ca:${era}:${o}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "canada"}), origin: o, sex: i % 2 ? "female" : "male"}));
      for ( const o of ["cree", "anishinaabe"] ) for ( const p of ca("medieval", o, 20) ) if ( p.family || p.name.includes("{") ) bad.push(`${o}: ${p.name}`);
      for ( const o of ["haida", "tlingit"] ) for ( const p of ca("medieval", o, 20) ) if ( !/^of the .+ clan$/.test(p.family ?? "") ) bad.push(`${o}: ${p.name}`);
      for ( const o of ["cree", "anishinaabe", "haida", "tlingit"] ) for ( const p of ca("industrial", o, 10) ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} industrial: ${p.name}`);
      G.ok("12. Canada's first nations before the colonies; towns or clans, then family names",
        ["haudenosaunee", "cree", "anishinaabe", "haida", "tlingit"].every(o => med.includes(o)) && !bad.length,
        {medieval: med, bad: bad.slice(0, 6), sample: ca("medieval", "tlingit", 4).map(p => p.name)});
    });
    await G.step("13. the Inuit", async () => {
      const med = results({era: "medieval", culture: "arctic"}, "people.origin"), bad = [];
      const ar = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:in:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "arctic"}), origin: "inuit", sex: i % 2 ? "female" : "male"}));
      for ( const p of ar("medieval", 20) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of ar("modern", 10) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("13. the Inuit in the Arctic and Canada; own names, then family names",
        med.includes("inuit") && med.includes("norse") && results({era: "medieval", culture: "canada"}, "people.origin").includes("inuit") && !bad.length,
        {medieval: med, bad: bad.slice(0, 6), sample: ar("medieval", 4).map(p => p.name)});
    });
    await G.step("14. the Taíno", async () => {
      const med = results({era: "medieval", culture: "caribbean"}, "people.origin"), em = results({era: "early-modern", culture: "caribbean"}, "people.origin"), bad = [];
      const cb = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:ta:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "caribbean"}), origin: "taino", sex: i % 2 ? "female" : "male"}));
      for ( const p of cb("medieval", 20) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of cb("modern", 10) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("14. the Taíno in the Caribbean; own names, then church and family names",
        med.includes("taino") && em.includes("akan") && em.includes("taino") && !bad.length, {medieval: med, earlyModern: em, bad: bad.slice(0, 6), sample: cb("medieval", 4).map(p => p.name)});
    });
    await G.step("15. Aboriginal Australians", async () => {
      const med = results({era: "medieval", culture: "australia"}, "people.origin"), bad = [];
      const au = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:ab:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "australia"}), origin: "aboriginal", sex: i % 2 ? "female" : "male"}));
      for ( const p of au("medieval", 20) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of au("modern", 10) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("15. Aboriginal Australians on their country; own names, then family names", med.includes("aboriginal") && !bad.length,
        {medieval: med, bad: bad.slice(0, 6), sample: au("medieval", 4).map(p => p.name)});
    });
    await G.step("16. central Africa", async () => {
      const med = results({era: "medieval", culture: "central-africa"}, "people.origin"), bad = [];
      const ca = (o, era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:ca:${o}:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "central-africa"}), origin: o, sex: i % 2 ? "female" : "male"}));
      for ( const o of ["kongo", "ganda"] ) for ( const p of ca(o, "medieval", 10) ) if ( !/^of the .+ clan$/.test(p.family ?? "") ) bad.push(`${o} medieval: ${p.name}`);
      for ( const p of ca("luba", "medieval", 10) ) if ( p.family || p.name.includes("{") ) bad.push(`luba medieval: ${p.name}`);
      for ( const o of ["kongo", "luba", "ganda"] ) for ( const p of ca(o, "modern", 6) ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} modern: ${p.name}`);
      G.ok("16. central Africa named from 1197; clans, then church and family names",
        ["kongo", "luba", "ganda"].every(o => med.includes(o)) && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: ca("kongo", "early-modern", 4).map(p => p.name)});
    });
    await G.step("17. the Amazigh", async () => {
      const med = results({era: "medieval", culture: "maghreb"}, "people.origin"), bad = [];
      const am = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:am:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "maghreb"}), origin: "amazigh", sex: i % 2 ? "female" : "male"}));
      for ( const era of ["medieval", "modern"] ) for ( const p of am(era, 12) ) if ( !p.family || p.name.includes("{") ) bad.push(`${era}: ${p.name}`);
      G.ok("17. the Amazigh in the Maghreb; tribes and son-of names, then family names",
        med.includes("amazigh") && med.includes("arabic") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: am("medieval", 4).map(p => p.name)});
    });
    await G.step("18. Sephardi and Mizrahi Jews", async () => {
      const ib = results({era: "medieval", culture: "iberia"}, "people.origin"), lv = results({era: "medieval", culture: "levant"}, "people.origin"), bad = [];
      const jw = (o, culture, era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:jw:${o}:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture}), origin: o, sex: i % 2 ? "female" : "male"}));
      for ( const [o, c] of [["sephardi", "iberia"], ["mizrahi", "levant"]] ) for ( const era of ["medieval", "modern"] )
        for ( const p of jw(o, c, era, 8) ) if ( !p.family || p.name.includes("{") ) bad.push(`${o} ${era}: ${p.name}`);
      G.ok("18. Sephardi Jews in Iberia, Mizrahi Jews in the Levant; each with family or son-of names",
        ib.includes("sephardi") && lv.includes("mizrahi") && !bad.length, {iberia: ib, levant: lv, bad: bad.slice(0, 6), sample: jw("sephardi", "iberia", "medieval", 4).map(p => p.name)});
    });
    await G.step("19. the Khmer", async () => {
      const med = results({era: "medieval", culture: "southeast-asia"}, "people.origin"), bad = [];
      const kh = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:kh:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "southeast-asia"}), origin: "khmer", sex: i % 2 ? "female" : "male"}));
      for ( const p of kh("medieval", 12) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of kh("modern", 8) ) if ( !p.family || !p.name.startsWith(`${p.family} `) ) bad.push(`modern: ${p.name}`);
      G.ok("19. the Khmer on the mainland; Angkor names, then family name first",
        med.includes("khmer") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: kh("medieval", 4).map(p => p.name)});
    });
    await G.step("20. Filipinos", async () => {
      const med = results({era: "medieval", culture: "philippines"}, "people.origin"), bad = [];
      const fi = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:fi:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "philippines"}), origin: "filipino", sex: i % 2 ? "female" : "male"}));
      for ( const p of fi("medieval", 12) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of fi("modern", 8) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("20. Filipinos in the islands; own names, then church and family names",
        med.includes("filipino") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: fi("medieval", 4).map(p => p.name)});
    });
    await G.step("21. the Sami", async () => {
      const med = results({era: "medieval", culture: "scandinavia"}, "people.origin"), bad = [];
      const sa = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:sa:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "scandinavia"}), origin: "sami", sex: i % 2 ? "female" : "male"}));
      for ( const p of sa("medieval", 12) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of sa("modern", 8) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("21. the Sami beside the Norse; given names, then family names",
        med.includes("sami") && med.includes("norse") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: sa("medieval", 4).map(p => p.name)});
    });
    await G.step("22. the Tuareg", async () => {
      const wa = results({era: "medieval", culture: "west-africa"}, "people.origin"), bad = [];
      const tu = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:tu:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "west-africa"}), origin: "tuareg", sex: i % 2 ? "female" : "male"}));
      for ( const era of ["medieval", "modern"] ) for ( const p of tu(era, 10) ) if ( !/^(ag|welet) /.test(p.family ?? "") || p.name.includes("{") ) bad.push(`${era}: ${p.name}`);
      G.ok("22. the Tuareg in West Africa; ag and welet the father's name",
        wa.includes("tuareg") && !bad.length, {medieval: wa, bad: bad.slice(0, 6), sample: tu("medieval", 4).map(p => p.name)});
    });
    await G.step("23. the Moro", async () => {
      const med = results({era: "medieval", culture: "philippines"}, "people.origin"), bad = [];
      const mo = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:mo:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "philippines"}), origin: "moro", sex: i % 2 ? "female" : "male"}));
      for ( const p of mo("medieval", 12) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of mo("modern", 8) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("23. the Moro in the Philippines; sultanate names, then family names",
        med.includes("moro") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: mo("medieval", 4).map(p => p.name)});
    });
    await G.step("24. the Banyarwanda and Barundi", async () => {
      const med = results({era: "medieval", culture: "central-africa"}, "people.origin"), bad = [];
      const rw = (era, n) => Array.from({length: n}, (_, i) => R.nameOf({rand: gen().random(`gateplains:rw:${era}`, i),
        tables: gen().lookup({...gen().context(), era, culture: "central-africa"}), origin: "banyarwanda", sex: i % 2 ? "female" : "male"}));
      for ( const p of rw("medieval", 12) ) if ( p.family || p.name.includes("{") ) bad.push(`medieval: ${p.name}`);
      for ( const p of rw("modern", 8) ) if ( !p.family || p.name.includes("{") ) bad.push(`modern: ${p.name}`);
      G.ok("24. the Banyarwanda and Barundi in central Africa; own names, then family names",
        med.includes("banyarwanda") && !bad.length, {medieval: med, bad: bad.slice(0, 6), sample: rw("medieval", 4).map(p => p.name)});
    });
    await G.step("25. the Philippines", async () => {
      const W = game.modules.get(CH).api.world, ph = W.regionOf?.("philippines");
      const med = results({era: "medieval", culture: "philippines"}, "people.origin"), em = results({era: "early-modern", culture: "philippines"}, "people.origin");
      const mw = results({era: "medieval", culture: "nusantara"}, "people.origin");
      G.ok("25. the Philippines a region of its own: Filipinos and Moro, Spain after 1565; the Malay world keeps none of the Filipinos",
        !!ph && ph.money === "philippine" && med.includes("filipino") && med.includes("moro") && !med.includes("spanish") && em.includes("spanish") && !mw.includes("filipino"),
        {region: ph?.label, money: ph?.money, medieval: med, earlyModern: em, malayWorld: mw});
    });
    await G.step("26. the raised lists", async () => {
      const {RAISED} = await import(`/modules/${CR}/data/people-world.mjs`);
      const thin = [];
      for ( const o of RAISED ) for ( const era of ["medieval", "early-modern", "industrial", "modern"] ) for ( const sex of ["male", "female"] ) {
        const n = results({era}, `names.${sex}.${o}`).length;
        if ( n < 50 ) thin.push(`${o} ${era} ${sex}: ${n}`);
      }
      G.ok("26. every raised people has 50 names or more in each list in each age", RAISED.includes("thai") && !thin.length, {raised: RAISED, thin: thin.slice(0, 8)});
    });
  } catch (e) {
    G.ok("error", false, {error: e.message});
  } finally {
    return G.finish();
  }
}
