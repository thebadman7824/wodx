/**
 * WoDX Senses gate for the other-world sights (B3540-B3547), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateothersight.mjs?${Date.now()}`)).run()
 * Back the world up first. It makes a scene of its own ("WoDX gate: Other sight") and five actors (a mage with Prime 1
 * and Time 2, a wraith with a Fetter, a changeling, a mortal and a spirit), puts their tokens on the scene, checks
 * each sight by drawing it into a layer of its own, and deletes all of it and its chat cards at the end, then views the
 * scene that was on view before. The clock never moves.
 *   1. the module: WoDX Senses has the other-world sights (api.sight.rules.OTHER) and the ties window
 *   2. who has which sight: the mage Prime and Time, the wraith the Shadowlands view, the changeling chimerical
 *   3. a peek opens the Penumbra on its own; its layer draws and says something
 *   4. vulgar magick (the wodxMagickWorked hook from WoDX Actions) leaves a strain mark and an echo on the scene
 *   5. Prime sight shows the strain; Time sight shows the echo
 *   6. Entropy sight marks the hurt mortal
 *   7. the wraith's Fetter is lit by name, and again when tied to another token
 *   8. the changeling's fae mien shows to a changeling, and to the mortal once enchanted
 *   9. the Shadowlands filter is grey and heavier in 1916
 *  10. with WoDX Otherworlds, Actions and Paperdoll on, nothing threw
 *  11. clean up
 * Result: Data/wodx-gate/gateothersight-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-senses";

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}

export async function run() {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const api = game.modules.get(MOD)?.api, sight = api?.sight;
  const before = canvas.scene, firstMsg = game.messages.size;
  const made = {actors: [], scene: null};
  const errs = [];
  const onErr = e => errs.push(String(e?.message ?? e));
  window.addEventListener("error", onErr);
  const draw = (s, a) => { const g = new PIXI.Graphics(); const lines = sight.draw(g, s, a); const n = g.children.length; g.destroy({children: true}); return {lines, n}; };
  try {
    await step("1 module", async () => {
      ok("1 module", !!sight?.rules?.OTHER?.penumbra && typeof sight.ties === "function" && typeof sight.draw === "function", {version: game.modules.get(MOD)?.version});
    });
    const own = {default: 0, [game.user.id]: 3};
    const mk = (name, type, items = [], extra = {}) => Actor.create({name, type, ownership: own, items, ...extra});
    const mage = await mk("WoDX gate: Sight mage", "Mage", [], {system: {spheres: {prime: {value: 1}, time: {value: 2}}, advantages: {arete: {permanent: 3}}}});
    const wraith = await mk("WoDX gate: Sight wraith", "Wraith", [{name: "My brass locket", type: "Trait", system: {type: "wod.types.fetter", value: 3}}]);
    const fae = await mk("WoDX gate: Sight changeling", "Changeling");
    const mortal = await mk("Brass locket", "Mortal"); // named as the wraith's Fetter, so the Fetter is found by name
    // The system has no Spirit actor type: a Creature with the WoDX Actions profile set to spirit
    const spirit = await mk("WoDX gate: Glass spider", "Creature", [], {flags: {world: {wodx: {profile: "spirit"}}}});
    made.actors.push(mage, wraith, fae, mortal, spirit);
    const missing = ["mage", "wraith", "changeling", "mortal", "spirit"].filter((k, i) => !made.actors[i]);
    if ( missing.length ) throw new Error(`Could not make the gate actors: ${missing.join(", ")}`);
    made.scene = await Scene.create({name: "WoDX gate: Other sight", width: 2000, height: 1500, grid: {size: 100}, padding: 0});
    await made.scene.view();
    await sleep(1500);
    const at = [[300, 300], [600, 300], [900, 300], [1200, 300], [1500, 300]];
    await made.scene.createEmbeddedDocuments("Token", made.actors.map((a, i) => ({name: a.name, actorId: a.id, actorLink: true, x: at[i][0], y: at[i][1], texture: {src: "icons/svg/mystery-man.svg"}})));
    await sleep(1500);

    await step("2 sights", async () => {
      const t = a => sight.rules.otherSightsFor(sight.traits(a));
      ok("2 sights", t(mage).includes("prime") && t(mage).includes("time") && t(wraith).includes("shroud") && t(fae).includes("chimerical") && !t(mortal).length,
        {mage: t(mage), wraith: t(wraith), fae: t(fae), mortal: t(mortal)});
    });
    await step("3 peek", async () => {
      await mortal.update({[`flags.${MOD}.peek`]: {until: game.time.worldTime + 600, scene: made.scene.id}});
      const now = sight.now(mortal, null), d = draw("penumbra", mortal);
      ok("3 peek", now === "penumbra" && d.lines.length > 0, {now, lines: d.lines, children: d.n});
      await mortal.update({[`flags.${MOD}.-=peek`]: null});
    });
    await step("4 strain", async () => {
      Hooks.callAll("wodxMagickWorked", mage, {kind: "vulgar", highest: 2, botch: false, spheres: ["forces"]});
      await sleep(1500);
      const f = made.scene.flags?.[MOD] ?? {};
      ok("4 strain", (f.strain ?? []).length === 1 && (f.echoes ?? []).some(e => /worked vulgar magick/.test(e.text)), {strain: f.strain, echoes: f.echoes});
    });
    await step("5 prime and time", async () => {
      const p = draw("prime", mage), t = draw("time", mage);
      ok("5 prime and time", p.lines.some(l => /Vulgar magick strained/.test(l)) && t.lines.some(l => /worked vulgar magick/.test(l)), {prime: p.lines, time: t.lines});
    });
    await step("6 entropy", async () => {
      await mortal.update({"system.health.damage.lethal": 4});
      await sleep(500);
      const e = draw("entropy", mage);
      ok("6 entropy", e.lines.some(l => /Brass locket: badly hurt/.test(l)), {lines: e.lines});
    });
    await step("7 fetter", async () => {
      const a = draw("shroud", wraith);
      const item = wraith.items.find(i => i.name === "My brass locket");
      const target = made.scene.tokens.find(t => t.actorId === fae.id);
      await sight.tieFetter(wraith, item.id, target.uuid);
      await sleep(300);
      const b = draw("shroud", wraith);
      ok("7 fetter", a.lines.some(l => /brass locket burns/i.test(l)) && b.lines.some(l => /brass locket burns/i.test(l)), {byName: a.lines, tied: b.lines});
    });
    await step("8 mien", async () => {
      const a = draw("chimerical", fae);
      const no = sight.rules.otherSightsFor(sight.traits(mortal)).includes("chimerical");
      await sight.enchant(mortal, 1);
      const yes = sight.rules.otherSightsFor(sight.traits(mortal)).includes("chimerical");
      const seen = draw("chimerical", mortal).lines;
      ok("8 mien", !no && yes && seen.some(l => /Sight changeling shows a fae mien/.test(l)), {fae: a.lines, before: no, after: yes, seen});
    });
    await step("9 shroud filter", async () => {
      const g = s => Number(/grayscale\(([\d.]+)\)/.exec(s)?.[1] ?? 0);
      const a = sight.rules.shroudFilter({shroud: 7, year: 2000}), b = sight.rules.shroudFilter({shroud: 7, year: 1916});
      ok("9 shroud filter", g(a) > 0.5 && g(b) > g(a), {a, b, live: sight.filter("shroud", wraith)});
    });
    await step("10 together", async () => {
      const on = ["wodx-otherworlds", "wodx-actions", "wodx-paperdoll", "wodx-storyteller"].map(m => [m, !!game.modules.get(m)?.active]);
      ok("10 together", on.every(([, v]) => v) && !errs.length, {on, errs});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    window.removeEventListener("error", onErr);
    await step("11 clean up", async () => {
      if ( before && before.id !== made.scene?.id ) await before.view();
      await sleep(800);
      if ( made.scene ) await made.scene.delete();
      for ( const a of made.actors ) await a?.delete?.();
      const msgs = game.messages.contents.slice(firstMsg).filter(m => /WoDX gate: |Sight|Penumbra|Shadowlands/.test(String(m.content ?? "") + (m.speaker?.alias ?? ""))).map(m => m.id);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
      ok("11 clean up", !game.scenes.getName("WoDX gate: Other sight") && !game.actors.find(a => a.name?.startsWith("WoDX gate: Sight")), {messages: msgs.length});
    });
  }
  return save(R, "gateothersight-result.json");
}
