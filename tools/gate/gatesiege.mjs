/**
 * The campaign around a siege gate (WoDX Storyteller 0.50.0), in rothenstein-wodx (the testing world), as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesiege.mjs?${Date.now()}`)).run()
 * Runs sieges through the API, with the dice fixed where a step needs it, then removes the sieges, clocks and
 * messages it made and puts the dice and the world clock back.
 *   1. the api is there (battles and siegeWorks)
 *   2. the campaign's dice match Foundry's own die faces for the same randomUniform
 *   3. a siege with a campaign (walls, order, foraging, a ready trebuchet, a mine) runs a week: the walls take
 *      damage, the mine is planned, the card for everyone and the Storyteller's dice card carry the campaign
 *   4. a second week digs the mine to the walls and fires it; the breach clock moves with the walls' damage
 *   5. Undo takes the week back: the walls' damage, the mine and the breach are as they were
 *   6. a bad week of order (every die a 3) leaves unrest, and it adds to the works roll's difficulty
 *   7. the Battles window shows the campaign part for the siege, and its Set up button for one without
 *   8. a siege without a campaign still runs a week as before (no campaign lines, breach by the works)
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatesiege-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ST = "wodx-storyteller";
  const st = () => game.wodx?.storyteller ?? game.modules.get(ST)?.api;
  const api = () => st()?.battles;
  const t0 = Date.now(), time0 = game.time.worldTime, rnd0 = CONFIG.Dice.randomUniform;
  const msgsSince = () => game.messages.contents.filter(m => m.timestamp >= t0);
  const made = [];
  // find the randomUniform value that gives a wanted face (the Foundry 14 mapping runs the other way round)
  const faceOf = async r => { CONFIG.Dice.randomUniform = () => r; const roll = new Roll("1d10"); await roll.evaluate(); return roll.dice[0].results[0].result; };
  let r10 = 0.0001, r3 = 0.75;
  try {
    await step("api", async () => {
      ok("api", typeof api()?.week === "function" && typeof st()?.siegeWorks?.setup === "function" && !!st()?.siegeWorks?.rules?.campaignWeek);
    });
    await step("dice match", async () => {
      for ( const r of [0.0001, 0.9999] ) if ( (await faceOf(r)) === 10 ) r10 = r;
      for ( const r of [0.25, 0.75] ) if ( (await faceOf(r)) === 3 ) r3 = r;
      const faces = [];
      for ( const r of [r10, r3, 0.45] ) { const f = await faceOf(r); CONFIG.Dice.randomUniform = () => r; faces.push([f, st().siegeWorks.draw(1)[0]]); }
      CONFIG.Dice.randomUniform = rnd0;
      ok("dice match", faces.every(([a, b]) => a === b), {faces, r10, r3});
    });
    const campaign = {wall: {type: "lightWall"}, order: {on: true}, forage: {on: true, foragers: 200, pool: 4, difficulty: 6}, supplyLine: "wagons", stores0: 14,
      engines: [{type: "trebuchet", stage: "ready"}], mine: {distance: 50, ground: "fair", pool: 4}};
    let b;
    await step("a week with the campaign", async () => {
      b = await api().start({name: "WoDX gate: the siege works", place: "Gate castle", kind: "siege", year: 1250,
        sides: [{name: "Besiegers", men: 3000, quality: 3, commander: {name: "Gate captain", works: 5, morale: 5}}, {name: "Garrison", men: 300, position: "castle", stores: 40}],
        campaign});
      made.push(b.id);
      CONFIG.Dice.randomUniform = () => r10;
      const after = await api().week(b.id);
      CONFIG.Dice.randomUniform = rnd0;
      const p = after.phases.at(-1);
      const cards = msgsSince().filter(m => m.speaker?.alias === "Battles");
      ok("a week with the campaign", after.campaign?.wall?.damage > 0 && after.campaign.mine.state === "digging" && Array.isArray(p.camp) && p.camp.length >= 3
        && cards.some(m => /campaign|walls|camp/i.test(m.content) && !m.whisper?.length) && cards.some(m => m.whisper?.length && /order|foraging|trebuchet/i.test(m.content)),
        {damage: after.campaign?.wall?.damage, mine: after.campaign?.mine, report: p.camp, breach: after.breach});
      b = after;
    });
    await step("the mine is fired", async () => {
      CONFIG.Dice.randomUniform = () => r10;
      const before = b.campaign.wall.damage, after = await api().week(b.id);
      CONFIG.Dice.randomUniform = rnd0;
      ok("the mine is fired", after.campaign.mine.state === "fired" && after.campaign.mine.damage > 0 && after.campaign.wall.damage > before && after.breach >= b.breach,
        {mine: after.campaign.mine, damage: [before, after.campaign.wall.damage], breach: [b.breach, after.breach]});
      b = after;
    });
    await step("undo", async () => {
      const before = b.phases.at(-2), back = await api().undo(b.id);
      ok("undo", back.campaign.mine.state === "digging" && back.campaign.wall.damage < b.campaign.wall.damage && back.weeks === b.weeks - 1 && back.breach <= b.breach,
        {mine: back.campaign.mine.state, damage: back.campaign.wall.damage, weeks: back.weeks, breach: back.breach, hadBefore: !!before});
      b = back;
    });
    await step("unrest", async () => {
      const setup0 = api().rules.siegeSetup(b, api().rules.ageFor(1250));
      CONFIG.Dice.randomUniform = () => r3;
      const after = await api().week(b.id);
      CONFIG.Dice.randomUniform = rnd0;
      const setup1 = api().rules.siegeSetup(after, api().rules.ageFor(1250));
      ok("unrest", after.sides[0].unrest > 0 && setup1.difficulty >= Math.min(10, setup0.difficulty + 1), {unrest: after.sides.map(s => s.unrest), diff: [setup0.difficulty, setup1.difficulty]});
      b = after;
    });
    let plain;
    await step("the window", async () => {
      plain = await api().start({name: "WoDX gate: a plain siege", kind: "siege", year: 1250, sides: [{name: "Besiegers", men: 1000}, {name: "Garrison", men: 100, position: "town", stores: 20}]});
      made.push(plain.id);
      const app1 = await api().open(b.id);
      await new Promise(r => setTimeout(r, 300));
      const t1 = app1?.element?.textContent ?? "";
      const app2 = await api().open(plain.id);
      await new Promise(r => setTimeout(r, 300));
      const h2 = app2?.element?.innerHTML ?? "";
      await app2?.close?.();
      ok("the window", /The campaign around the siege/.test(t1) && /Light wall/.test(t1) && /campSetup/.test(h2), {len: t1.length});
    });
    await step("a plain siege", async () => {
      const after = await api().week(plain.id);
      const p = after.phases.at(-1);
      ok("a plain siege", after.campaign === null && !p.camp && after.weeks === 1 && after.breach === p.breach, {breach: after.breach, weeks: after.weeks});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-otherworlds", "wodx-creation"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    CONFIG.Dice.randomUniform = rnd0;
    try {
      for ( const id of made ) await api()?.remove?.(id);
      for ( const m of msgsSince() ) if ( m.speaker?.alias === "Battles" || /WoDX gate/.test(m.content) ) await m.delete();
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatesiege-result.json");
}
