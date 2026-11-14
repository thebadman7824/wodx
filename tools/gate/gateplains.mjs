/**
 * The Plains peoples gate (B3820 to B3824): WoDX Creation's People generator names the people of the American West
 * as the Lakota, Dakota and Nakota, the Cheyenne, the Comanche and the Kiowa do, from 1197 on. In rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplains.mjs?${Date.now()}`)).run()
 * The gate never moves the clock or changes a setting. It makes one actor through the People generator and the kit
 * removes it.
 *   1. WoDX Creation and WoDX Chronicle with the Plains peoples (the West has a medieval mix)
 *   2. the West before 1500 is the four peoples; eastern North America has none of them
 *   3. before 1800: own names from the records and women named by band, no church names, no family name
 *   4. from 1800: a church given name and a family name from the rolls
 *   5. the People generator for the West makes a person of one of the West's peoples, whatever the clock's age
 *   6. the generated person becomes a sheet with that name
 *   7. clean up
 * Result: Data/wodx-gate/gateplains-result.json.
 */
import {gate} from "./kit.mjs";

const CR = "wodx-creation", CH = "wodx-chronicle";
const WEST = "north-america-west", EAST = "american";
const PEOPLES = ["lakota", "cheyenne", "comanche", "kiowa"];
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
      const med = results({era: "medieval", culture: WEST}, "people.origin");
      G.ok("1. Creation and Chronicle with the Plains peoples", game.modules.get(CR)?.active && game.modules.get(CH)?.active && med.includes("lakota"),
        {creation: game.modules.get(CR)?.version, chronicle: game.modules.get(CH)?.version, medieval: med});
    });

    await G.step("2. who lives where", async () => {
      const med = results({era: "medieval", culture: WEST}, "people.origin"), east = results({era: "medieval", culture: EAST}, "people.origin");
      const ind = results({era: "industrial", culture: WEST}, "people.origin");
      G.ok("2. the West before 1500 is the four peoples, a share later; the East borrows none",
        PEOPLES.every(p => med.includes(p)) && med.length === 4 && ind.includes("lakota") && ind.includes("anglo") && !east.some(p => PEOPLES.includes(p)),
        {medieval: med, industrial: ind, east});
    });

    await G.step("3. before 1800", async () => {
      const bad = [];
      for ( const o of PEOPLES ) for ( const era of ["medieval", "early-modern"] ) for ( const p of draw(era, o, 40, "old") ) {
        if ( !p.name || p.name.includes("{") || p.family || /^(John|Joseph|Mary|Peter|Paul|Catherine) /.test(p.name) ) bad.push(`${o} ${era}: ${p.name} / ${p.family}`);
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
  } catch (e) {
    G.ok("error", false, {error: e.message});
  } finally {
    return G.finish();
  }
}
