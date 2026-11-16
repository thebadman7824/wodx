/**
 * Final audit gate for Senses, Otherworlds and Atmosphere (B6790 to B6792), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesightfixes.mjs?${Date.now()}`)).run()
 * It makes its own scenes, actors and tokens, and removes them; the weather it sets by hand is cleared at the end and
 * the weather setting put back. The clock never moves.
 *   1. Sense Wyrm: a person WoDX Otherworlds' corruption has tainted registers as Wyrm to WoDX Senses; a clean one does not
 *   2. Correspondence sight: a Teleport Token region (a set of destinations, as WoDX ways write it) is drawn, its label
 *      names the scene it leads to, and the label has a plain outline (not colour alone)
 *   3. Fog out of doors: with a hand-set night of thick fog, the Shroud where the token stands is one lower, and the
 *      note says why; indoors it stays the place's own
 * Result: Data/wodx-gate/gatesightfixes-result.json.
 */
import {gate} from "./kit.mjs";

const SEN = "wodx-senses", OW = "wodx-otherworlds", ATM = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatesightfixes");
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: `Run this gate in rothenstein-wodx only (this is ${game.world.id})`}); return G.finish(); }
  const sen = game.modules.get(SEN)?.api, ow = game.modules.get(OW)?.api, atm = game.modules.get(ATM)?.api;
  const weatherWas = game.settings.settings.has(`${ATM}.weather`) ? game.settings.get(ATM, "weather") : null;
  let fogNight = null, fogScene = null;
  try {
    const scene = await G.scene({flags: {[ATM]: {outdoors: "on"}, [OW]: {ratings: {settlement: "town", shroud: 7}}}});
    const [garou, marta, hans, mage] = await G.make(Actor, [
      {name: "WoDX gate: Sees-the-Rot", type: "Werewolf"},
      {name: "WoDX gate: Marta the tanner", type: "Mortal"},
      {name: "WoDX gate: Hans the baker", type: "Mortal"},
      {name: "WoDX gate: Way-seer", type: "Mage", system: {spheres: {correspondence: {value: 2}}, advantages: {arete: {permanent: 3}}}}
    ]);
    const [tg, , , tmage] = await G.tokens(scene, [{actor: garou, x: 4, y: 4}, {actor: marta, x: 5, y: 4}, {actor: hans, x: 6, y: 4}, {actor: mage, x: 8, y: 8}]);
    await sleep(800);

    await G.step("1. Sense Wyrm finds the tainted", async () => {
      await ow.corruption.setTaint(marta, {level: 2, weeks: 0, where: "the tannery"});
      await sleep(300);
      const pres = sen.gatherSources(scene, tg, garou).presences;
      const m = pres.find(p => p.name === marta.name), h = pres.find(p => p.name === hans.name);
      G.ok("1. Sense Wyrm finds the tainted", m?.wyrm === true && h?.wyrm === false, {marta: m, hans: h, taint: ow.corruption.taintOf(marta)});
    });

    await G.step("2. Correspondence sight draws the way", async () => {
      const far = await G.make(Scene, {name: "WoDX gate: The Old Mill", width: 1000, height: 1000, grid: {size: 100, type: 1}, padding: 0});
      const [dest] = await far.createEmbeddedDocuments("Region", [{name: "WoDX gate: mill end", shapes: [{type: "rectangle", x: 100, y: 100, width: 200, height: 200}]}]);
      await scene.createEmbeddedDocuments("Region", [{name: "WoDX gate: way", shapes: [{type: "rectangle", x: 400, y: 300, width: 200, height: 200}],
        behaviors: [{type: "teleportToken", system: {destinations: [dest.uuid]}}]}]);
      await sleep(500);
      const g = new PIXI.Graphics();
      const lines = sen.sight.draw(g, "correspondence", mage);
      const texts = g.children.filter(c => typeof c.text === "string");
      const lab = texts.find(t => /Old Mill/.test(t.text));
      const outline = lab ? (lab.style?.stroke ?? null) : null, thick = lab ? Number(lab.style?.strokeThickness ?? lab.style?.stroke?.width ?? 0) : 0;
      g.destroy({children: true});
      G.ok("2. Correspondence sight draws the way", lines.some(l => /Old Mill/.test(l)) && !!lab && outline !== null && thick > 0,
        {lines, texts: texts.map(t => t.text), outline: String(outline), thick, mage: tmage?.id});
    });

    await G.step("3. Fog thins the Shroud out of doors", async () => {
      if ( weatherWas === "off" ) await game.settings.set(ATM, "weather", "auto");
      fogScene = scene;
      fogNight = atm.weather.night(game.time.worldTime, scene);
      await atm.weather.set(fogNight, {sky: "storm", precip: "none", intensity: null, fog: "thick", wind: "calm", tempNight: 4, tempDay: 9, thunder: false, snowLying: false, leaves: false}, scene);
      await sleep(500);
      const out = ow.placeOf(tg);
      const indoors = await G.make(Scene, {name: "WoDX gate: chapel", width: 1000, height: 1000, grid: {size: 100, type: 1}, padding: 0,
        flags: {[ATM]: {outdoors: "off"}, [OW]: {ratings: {settlement: "town", shroud: 7}}}});
      const [inTok] = await G.tokens(indoors, [{actor: hans, x: 2, y: 2}]);
      const inside = ow.placeOf(inTok);
      G.ok("3. Fog thins the Shroud out of doors", out.ratings?.shroud === 6 && (out.notes ?? []).some(n => /Fog tonight: Shroud -1/.test(n)) && inside.ratings?.shroud === 7,
        {outdoors: out.ratings, notes: out.notes, indoors: inside.ratings, day: atm.weather.now(scene)?.label});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( fogNight !== null ) await atm.weather.set(fogNight, null, fogScene); } catch (e) { G.R.notes.push(`weather back: ${e?.message ?? e}`); }
    try { if ( weatherWas !== null && game.settings.get(ATM, "weather") !== weatherWas ) await game.settings.set(ATM, "weather", weatherWas); } catch (e) { G.R.notes.push(`weather setting back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
