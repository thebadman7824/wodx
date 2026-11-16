/**
 * Final audit gate for Senses, Otherworlds and Atmosphere (B6790 to B6799), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesightfixes.mjs?${Date.now()}`)).run()
 * It makes its own scenes, actors and tokens, and removes them; the weather it sets by hand is cleared at the end and
 * the weather setting put back. The clock never moves.
 *   1. Sense Wyrm: a person WoDX Otherworlds' corruption has tainted registers as Wyrm to WoDX Senses; a clean one does not
 *   2. Correspondence sight: a Teleport Token region (a set of destinations, as WoDX ways write it) is drawn, its label
 *      names the scene it leads to, and the label has a plain outline (not colour alone)
 *   3. Fog out of doors: with a hand-set night of thick fog, the Shroud where the token stands is one lower, and the
 *      note says why; indoors it stays the place's own
 *   4. Net burn heals: a gate runner's burn of 2, three and a half days old, gives a point back (3 days a point at 2), and the effect (the token's icon) shrinks
 *   5. The Maelstrom: one bell strikes a selected gate token through WoDX Combat's soak, and a card says how much
 *   6. Wayfare on the map: a portal that opened makes a trod between two gate scenes' Near Dreaming levels
 *   7. A remote vehicle: an empty gate car driven 2 squares east moves on the map with its passenger aboard
 *   8. The other worlds' sound switch says nothing plays until the loops are put in
 *   9. Weather in the rolls: with the fog night set, a firearms roll out of doors is 2 harder in WoDX Chronicle's roll
 *      effects, and a melee roll is not
 * Only the gate's own actors are healed, and the dialog that names the far scene is answered by the gate.
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

    await G.step("4. Net burn heals with the clock", async () => {
      const [runner] = await G.make(Actor, [{name: "WoDX gate: Jacks", type: "Mortal"}]);
      const now = game.time.worldTime;
      await runner.createEmbeddedDocuments("ActiveEffect", [{name: "Net burn: 2 Intelligence lost", img: "icons/svg/degen.svg", statuses: ["wodx-net-burn"],
        changes: [{key: "system.attributes.intelligence.value", mode: 2, value: "-2"}], flags: {[OW]: {netBurn: true, heals: "lethal", what: "Net burn", points: 2, last: now - 3.5 * 86400}}}]);
      const r = await ow.net.healBurns(now, [runner]);
      const e = runner.effects.find(x => x.flags?.[OW]?.netBurn);
      G.ok("4. Net burn heals with the clock", r[0]?.healed === 1 && String(e?.changes?.[0]?.value) === "-1" && e?.statuses?.has?.("wodx-net-burn") && /1 Intelligence lost/.test(e?.name ?? ""),
        {r, effect: e?.name, change: e?.changes?.[0]?.value, statuses: [...(e?.statuses ?? [])]});
    });

    await G.step("5. The Maelstrom strikes", async () => {
      const r = await ow.realms.maelstrom([tg.document ?? tg], {bells: 1, haunt: 0});
      const msg = [...game.messages].at(-1);
      G.ok("5. The Maelstrom strikes", r?.dice === 4 && r.hit?.length === 1 && r.hit[0].levels !== null && /The Maelstrom/.test(msg?.content ?? ""), {r, card: (msg?.content ?? "").slice(0, 200)});
    });

    await G.step("6. Wayfare makes the trod", async () => {
      const a = await G.make(Scene, {name: "WoDX gate: Silver Glade", width: 1000, height: 800, padding: 0});
      const b = await G.make(Scene, {name: "WoDX gate: Thorn Court", width: 1000, height: 800, padding: 0});
      await ow.realms.addDreamingLevel(a); await ow.realms.addDreamingLevel(b);
      const {DialogV2} = foundry.applications.api, wait = DialogV2.wait;
      DialogV2.wait = async () => b.id;
      let way = null;
      try { way = await ow.realms.wayOnSuccess("trod", game.scenes.get(a.id), "Wayfare: where the trod leads", "Where?"); } finally { DialogV2.wait = wait; }
      const ra = [...game.scenes.get(a.id).regions].find(r => r.flags?.[OW]?.way === "trod");
      const rb = [...game.scenes.get(b.id).regions].find(r => r.flags?.[OW]?.way === "trod");
      const dest = ra ? [...(ra.behaviors ?? [])].find(x => x.type === "teleportToken")?.system?.destinations : null;
      G.ok("6. Wayfare makes the trod", !!way && !!ra && !!rb && [...(dest ?? [])].includes(rb.uuid), {ra: ra?.name, rb: rb?.name, dest: [...(dest ?? [])]});
    });

    await G.step("7. A remote vehicle drives", async () => {
      const [kat] = await G.make(Actor, [{name: "WoDX gate: Kat", type: "Mortal"}]);
      // B6954: the kit places tokens in squares; 10 squares is the car's own corner (1000 px)
      const [tk] = await G.tokens(scene, [{actor: kat, x: 10, y: 10}]);
      const x0 = Number((tk.document ?? tk).x);
      const [car] = await scene.createEmbeddedDocuments("Tile", [{x: 1000, y: 1000, width: 200, height: 100, texture: {src: "icons/svg/wing.svg"},
        flags: {"wodx-interactables": {mount: true, title: "WoDX gate: sedan", driver: null, riders: [{t: tk.document?.uuid ?? tk.uuid}]}}}]);
      const line = await ow.net.technica.steer(car, {dir: "e", squares: 2});
      await sleep(300);
      const c = scene.tiles.get(car.id), t = scene.tokens.get(tk.document?.id ?? tk.id);
      G.ok("7. A remote vehicle drives", c?.x === 1200 && t?.x === x0 + 200 && (c?.flags?.["wodx-interactables"]?.riders ?? []).length === 1 && /drives itself 2 squares east/.test(line ?? ""),
        {line, car: c?.x, rider: t?.x, riderFrom: x0});
      await car.delete().catch(() => {});
    });

    await G.step("8. The sound switch says when nothing plays", async () => {
      const hint = String(game.settings.settings.get(`${OW}.layerSound`)?.hint ?? "");
      const said = game.i18n?.localize?.(hint) ?? hint;
      G.ok("8. The sound switch says when nothing plays", /nothing plays until/.test(said), {hint: said});
    });

    await G.step("9. Weather reaches the rolls", async () => {
      const C = game.modules.get("wodx-chronicle")?.api?.traits;
      const ranged = C?.effects?.(garou, {channel: "roll", tags: ["dexterity", "ranged", "firearms"]}) ?? [];
      const melee = C?.effects?.(garou, {channel: "roll", tags: ["dexterity", "melee"]}) ?? [];
      const w = ranged.find(e => e.key === "weather-sight");
      G.ok("9. Weather reaches the rolls", w?.diff === 2 && !melee.some(e => /^weather-/.test(e.key ?? "")), {ranged: ranged.map(e => [e.key, e.diff]), melee: melee.map(e => e.key)});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( fogNight !== null ) await atm.weather.set(fogNight, null, fogScene); } catch (e) { G.R.notes.push(`weather back: ${e?.message ?? e}`); }
    try { if ( weatherWas !== null && game.settings.get(ATM, "weather") !== weatherWas ) await game.settings.set(ATM, "weather", weatherWas); } catch (e) { G.R.notes.push(`weather setting back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
