/**
 * WoDX Library gate: faith and occult goods (B3902 to B3904), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefaith.mjs?${Date.now()}`)).run()
 * Makes its own actors and removes them; never moves the clock.
 *   1. api.faith is up; prayer beads offer Pray, a paper charm Set it as a ward, an astrolabe Divine
 *   2. a prayer with no True Faith: Willpower at 8, once a night; a success gives back 1 Willpower, never above the rating
 *   3. a charm set as a ward: Chronicle's trait effects give +1 difficulty to a Kindred's mind power on the bearer,
 *      nothing against a mortal, nothing once it is taken down
 *   4. divining with an astrolabe: a card to the Storyteller with Perception + Occult and how many questions it answers
 * Result: Data/wodx-gate/gatefaith-result.json.
 */
import {gate} from "./kit.mjs";

const LIB = "wodx-library";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 4000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };
const seeker = name => ({name, type: "Mortal", system: {attributes: {perception: {value: 4}}, abilities: {occult: {value: 3}},
  advantages: {willpower: {permanent: 6, temporary: 2}}}});

export async function run() {
  const G = gate("gatefaith");
  try {
    const lib = game.modules.get(LIB)?.api;
    const T = game.modules.get("wodx-chronicle")?.api?.traits;
    const [a] = await G.make(Actor, [seeker("Gate Faith Seeker")]);
    // B5876: a batch create does not keep its order, so each good is found by its name (gate rule 1)
    const made = await a.createEmbeddedDocuments("Item", [{name: "a string of prayer beads", type: "Item"},
      {name: "a tiny folded paper charm", type: "Item"}, {name: "a brass astrolabe", type: "Item"}]);
    const named = n => made.find(i => i.name === n) ?? a.items.find(i => i.name === n);
    const [beads, charm, astro] = ["a string of prayer beads", "a tiny folded paper charm", "a brass astrolabe"].map(named);

    await G.step("1. api and Use", async () => {
      const ab = async i => (await lib.use.abilities(i)) ?? [];
      const [p, w, d] = [await ab(beads), await ab(charm), await ab(astro)];
      G.ok("1. api and Use", !!lib?.faith?.pray && p.includes("pray") && w.includes("ward") && d.includes("divine"), {beads: p, charm: w, astrolabe: d});
    });

    await G.step("2. a prayer", async () => {
      // set the rating after the sheet is made: a new mortal sheet works its Willpower out on creation
      await a.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 2});
      const start = {permanent: a.system.advantages.willpower.permanent, temporary: a.system.advantages.willpower.temporary};
      const wp = () => Number(a.system.advantages.willpower.temporary);
      let tries = 0;
      while ( wp() <= 2 && tries < 8 ) { await a.unsetFlag(LIB, "prayedNight"); await lib.faith.pray(a, beads); tries++; }
      const gained = wp() === 3;
      const night = a.flags?.[LIB]?.prayedNight;
      const before = wp();
      await lib.faith.pray(a, beads);
      await wait(400);
      const again = [...game.messages].slice(-2).some(m => /prayed already tonight/i.test(m.content));
      G.ok("2. a prayer", gained && Number.isFinite(night) && wp() === before && again, {start, gained, tries, night, again, wp: wp()});
    });

    await G.step("3. a ward", async () => {
      const ward = against => T.effects(a, {channel: "resist", tags: ["mind"], against}).filter(e => e.key === "ward").length;
      const none = ward("kindred");
      await lib.faith.ward(a, charm);
      await settle(() => ward("kindred") === 1);
      const on = ward("kindred"), mortal = ward("mortal");
      await lib.faith.ward(a, a.items.get(charm.id));
      await settle(() => ward("kindred") === 0);
      G.ok("3. a ward", none === 0 && on === 1 && mortal === 0 && ward("kindred") === 0, {none, on, mortal, down: ward("kindred")});
    });

    await G.step("4. divining", async () => {
      await lib.faith.divine(a, astro);
      await wait(400);
      const m = [...game.messages].filter(x => /reads the signs with a brass astrolabe/i.test(x.content ?? "")).sort((x, y) => (x.timestamp ?? 0) - (y.timestamp ?? 0)).at(-1);
      G.ok("4. divining", !!m && /Perception \+ Occult/.test(m.content) && (m.whisper?.length ?? 0) > 0, {card: !!m, whisper: m?.whisper?.length ?? 0});
    });
  } finally { return G.finish(); }
}
