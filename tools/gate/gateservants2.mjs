/**
 * Servants and bonds, step two (B5112-B5119), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateservants2.mjs?${Date.now()}`)).run()
 * It makes scratch actors and a scene and deletes them. It does not move the clock: the Enchantment's day is set back instead.
 *   1. the API and the menus
 *   2. Enchantment: Glamour spent, the bond made; set five days back, the daily clock ends it as a dream
 *   3. the Parted Mists: two changelings, a lasting bond
 *   4. an oath broken by an attack: the price applies and the oathbreaker's look shows
 *   5. a pact: thrall entry linked, gifts on the sheet, the pact bond
 *   6. names: an evocation reached by the True Name uses its card's difficulty
 *   7. a chained Thrall
 *   8. a Puppeteer's third ride makes a consort
 * Result: Data/wodx-gate/gateservants2-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gateservants2");
  const A = game.wodxActions, X = A?.servantActions?.(), S = game.modules.get("wodx-npc")?.api?.servants;
  const today = Math.floor(game.time.worldTime / 86400);
  try {
    await G.step("1. the API and the menus", async () => G.ok("1. the API and the menus",
      ["conditioning", "enchant", "partedMists", "demonPact", "pactGift", "knownNames", "pressName", "chainThrall"].every(k => typeof A?.[k] === "function") && !!X?.enchantDaily && !!S?.bind,
      {version: game.modules.get("wodx-actions")?.version}));
    const scene = await G.scene();
    const [fae, fae2, mortal, demon, wraith, shade, sworn, friend] = await G.make(Actor, [
      {name: "Gate Servants2 Changeling", type: "Changeling", system: {advantages: {glamour: {permanent: 6, temporary: 6}}}},
      {name: "Gate Servants2 Changeling Two", type: "Changeling", system: {advantages: {glamour: {permanent: 5, temporary: 5}}}},
      {name: "Gate Servants2 Mortal", type: "Mortal", system: {advantages: {willpower: {permanent: 4, temporary: 4}}}},
      {name: "Gate Servants2 Demon", type: "Demon"},
      {name: "Gate Servants2 Wraith", type: "Wraith"},
      {name: "Gate Servants2 Shade", type: "Wraith"},
      {name: "Gate Servants2 Sworn", type: "Changeling", system: {advantages: {willpower: {permanent: 5, temporary: 5}}}},
      {name: "Gate Servants2 Friend", type: "Changeling"}]);
    await G.tokens(scene, [{actor: fae, x: 2, y: 2}, {actor: fae2, x: 3, y: 2}, {actor: mortal, x: 4, y: 2}, {actor: demon, x: 5, y: 2}]);

    await G.step("2. Enchantment", async () => {
      await S.bind(mortal, fae, "enchant", {step: 1, data: {glamour: 2, day: today, lasting: false}, quiet: true, flash: true});
      const made = !!game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`enchant:${fae.id}`];
      await mortal.update({[`flags.wodx-npc.held.enchant:${fae.id}.data.day`]: today - 5});
      await X.enchantDaily();
      const gone = !game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`enchant:${fae.id}`];
      G.ok("2. Enchantment", made && gone, {made, gone});
    });

    await G.step("3. the Parted Mists", async () => {
      await X.applyMists({target: mortal.id, lead: fae.id, givers: [{id: fae.id, glamour: 2}, {id: fae2.id, glamour: 1}]});
      const rec = game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`enchant:${fae.id}`];
      const spent = game.actors.get(fae.id).system.advantages.glamour.temporary === 4 && game.actors.get(fae2.id).system.advantages.glamour.temporary === 4;
      await X.enchantDaily();
      G.ok("3. the Parted Mists", rec?.data?.lasting === true && rec.step === 3 && spent && !!game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`enchant:${fae.id}`], {step: rec?.step, spent});
      await S.unbind(mortal, fae, "enchant");
    });

    await G.step("4. an oath broken by an attack", async () => {
      await sworn.setFlag("wodx-actions", "c20oaths", [{kind: "crossedBlades", terms: "brothers in arms", parties: [friend.name], successes: 0, at: 0}]);
      const wpWas = game.actors.get(sworn.id).system.advantages.willpower.permanent;
      await X.applyOath({actor: sworn.id, k: 0});
      const o = game.actors.get(sworn.id).getFlag("wodx-actions", "c20oaths")[0];
      const look = X.rules && (game.actors.get(sworn.id).getFlag("wodx-actions", "c20oaths") ?? []).some(x => x.broken && x.willing !== false);
      G.ok("4. an oath broken by an attack", !!o.broken && look && X.rules.oathHarmed([{kind: "crossedBlades", parties: [friend.name]}], friend.name) === 0,
        {broken: !!o.broken, wpWas, wpNow: game.actors.get(sworn.id).system.advantages.willpower.permanent});
    });

    await G.step("5. a pact", async () => {
      await demon.setFlag("wodx-actions", "demon", {thralls: [{name: mortal.name, potential: 1, offered: 0, willpower: 3}]});
      await X.applyPact({demon: demon.id, thrall: mortal.id, potential: 3, terms: "a cure", picks: [{k: "innate"}, {k: "offering", points: 1}], offered: 1});
      const th = game.actors.get(demon.id).getFlag("wodx-actions", "demon").thralls;
      const gifts = game.actors.get(mortal.id).items.filter(i => i.flags?.["wodx-actions"]?.pactGift);
      const bond = game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`pact:${demon.id}`];
      G.ok("5. a pact", th.length === 1 && th[0].actorId === mortal.id && th[0].potential === 3 && gifts.length === 2 && bond?.step === 2,
        {thralls: th.length, linked: th[0]?.actorId === mortal.id, gifts: gifts.length, bond: bond?.step});
    });

    await G.step("6. names", async () => {
      await mortal.setFlag("wodx-actions", "names", [{demonId: demon.id, demonName: demon.name, kind: "true", at: 0}]);
      const nd = X.nameDifficulty(game.actors.get(mortal.id), "by name (9 mundane, 8 Celestial, 7 True Name, 6 own thrall)", demon);
      const own = X.nameDifficulty(game.actors.get(demon.id), "by name (9 mundane, 8 Celestial, 7 True Name, 6 own thrall)", mortal);
      G.ok("6. names", nd?.difficulty === 7 && own?.difficulty === 6, {byName: nd, byThrall: own});
    });

    await G.step("7. a chained Thrall", async () => {
      await S.bind(shade, wraith, "thrall", {step: X.rules.thrallStep(true), data: {chained: true}, quiet: true});
      const r = S.restrain ? S.records(shade).find(x => x.kind === "thrall") : null;
      G.ok("7. a chained Thrall", r?.step === 3 && S.orderWeight(shade, wraith.id).free === true, {step: r?.step});
    });

    await G.step("8. a Puppeteer's consort", async () => {
      const item = {key: "possess", caster: wraith.uuid, target: mortal.uuid};
      for ( let k = 0; k < 3; k++ ) await X.onEffect(item, {}, wraith.name);
      const rides = game.actors.get(wraith.id).getFlag("wodx-actions", "rides")?.[mortal.id];
      const bond = game.actors.get(mortal.id).flags?.["wodx-npc"]?.held?.[`consort:${wraith.id}`];
      G.ok("8. a Puppeteer's consort", rides === 3 && !!bond, {rides, bond: bond?.step});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    return G.finish();
  }
}
