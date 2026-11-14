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
 *  12. clean up
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
      // older installed mix (the West's industrial one before B3820) does not stand in for the new one
      await gen().installTables?.();
      const med = results({era: "medieval", culture: WEST}, "people.origin");
      G.ok("1. Creation and Chronicle with the Plains peoples", game.modules.get(CR)?.active && game.modules.get(CH)?.active && med.includes("lakota"),
        {creation: game.modules.get(CR)?.version, chronicle: game.modules.get(CH)?.version, medieval: med});
    });

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
  } catch (e) {
    G.ok("error", false, {error: e.message});
  } finally {
    return G.finish();
  }
}
