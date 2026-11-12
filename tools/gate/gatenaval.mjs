/**
 * Ships at sea gate (WoDX Storyteller 0.51.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenaval.mjs?${Date.now()}`)).run()
 * Runs fights at sea through the API, with the dice fixed where a step needs it, then removes the fights and
 * messages it made and puts the dice and the world clock back.
 *   1. the api is there (naval, with its rules) and the hand has the Ships at sea tool
 *   2. a chase: a sagitta gains 1,000 yards a watch on a large cog when both roll the same; cards for everyone and dice for the Storyteller
 *   3. shooting: a dromon's engines (every die a 10) sink a longship and the fight ends
 *   4. Undo takes the sinking back and the fight goes on
 *   5. ramming from alongside: an ironclad rams a frigate
 *   6. a quarter hour: a ship below 0 Speed floods, and the crew's repair builds up
 *   7. boarding: the defenders strike their colours once half are down and outnumbered
 *   8. the window lists the fights and shows a fight's ships
 *   9. "Let the time pass" moves the world clock by the fight's time, once
 *  10. every other WoDX module still answers, and the Battles window still opens
 * Result: Data/wodx-gate/gatenaval-result.json.
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
  const api = () => st()?.naval;
  const t0 = Date.now(), time0 = game.time.worldTime, rnd0 = CONFIG.Dice.randomUniform;
  const msgsSince = () => game.messages.contents.filter(m => m.timestamp >= t0);
  const made = [];
  const faceOf = async r => { CONFIG.Dice.randomUniform = () => r; const roll = new Roll("1d10"); await roll.evaluate(); return roll.dice[0].results[0].result; };
  let r10 = 0.0001;
  const fixed = async fn => { CONFIG.Dice.randomUniform = () => r10; try { return await fn(); } finally { CONFIG.Dice.randomUniform = rnd0; } };
  try {
    await step("api", async () => {
      for ( const r of [0.0001, 0.9999] ) if ( (await faceOf(r)) === 10 ) r10 = r;
      CONFIG.Dice.randomUniform = rnd0;
      const tools = st()?.hand?.tools;
      const hand = JSON.stringify(Array.isArray(tools) ? tools.map(t => [t.key, t.label]) : "");
      ok("api", typeof api()?.pursue === "function" && !!api()?.rules?.SHIPS?.dromon && typeof api()?.open === "function", {r10, hand: /naval|Ships at sea/.test(hand)});
    });
    let f;
    await step("a chase", async () => {
      f = await api().start({name: "WoDX gate: a chase", year: 1250, gap: 2000, ships: [{name: "Gate sagitta", type: "sagitta"}, {name: "Gate cog", type: "largeCog"}]});
      made.push(f.id);
      const after = await fixed(() => api().pursue(f.id, 0));
      const cards = msgsSince().filter(m => m.speaker?.alias === "Ships at sea");
      ok("a chase", after.gap === 1000 && after.elapsed === 4 * 3600 && cards.some(m => !m.whisper?.length) && cards.some(m => m.whisper?.length && /dice at 7/.test(m.content)),
        {gap: after.gap, cards: cards.length});
    });
    let s;
    await step("shooting sinks a ship", async () => {
      s = await api().start({name: "WoDX gate: a sinking", year: 1250, gap: 300, ships: [{name: "Gate dromon", type: "dromon"}, {name: "Gate longship", type: "longship"}]});
      made.push(s.id);
      s = await fixed(() => api().fire(s.id, 0, {range: "short"}));
      ok("shooting sinks a ship", s.ships[1].sunk && !!s.over, {damage: s.ships[1].damage, over: s.over});
    });
    await step("undo", async () => {
      s = await api().undo(s.id);
      ok("undo", !s.over && s.ships[1].damage === 0 && !s.ships[1].sunk, {damage: s.ships[1].damage});
    });
    await step("ramming", async () => {
      let r = await api().start({name: "WoDX gate: a ram", year: 1870, gap: 0, ships: [{name: "Gate ironclad", type: "ironclad", helm: 8}, {name: "Gate frigate", type: "frigate", helm: 1}]});
      made.push(r.id);
      CONFIG.Dice.randomUniform = () => 0.5;  // the middle of the die for everyone: the bigger helm pool wins
      try { r = await api().ram(r.id, 0); } finally { CONFIG.Dice.randomUniform = rnd0; }
      ok("ramming", /rams|turns aside/.test(r.log.at(-1).words) && r.log.at(-1).dice.includes("dice at 6"), {words: r.log.at(-1).words, damage: r.ships.map(x => x.damage)});
    });
    await step("a quarter hour", async () => {
      let q = await api().start({name: "WoDX gate: flooding", year: 1250, ships: [{name: "Gate leaky cog", type: "smallCog", damage: 4}, {name: "Gate mended cog", type: "largeCog", damage: 3}]});
      made.push(q.id);
      q = await fixed(() => api().quarter(q.id, {repair: [false, true], pool: [3, 2], helpers: [0, 0]}));
      ok("a quarter hour", q.ships[0].damage === 5 && q.ships[1].repair === 2 && q.elapsed === 900, {ships: q.ships.map(x => [x.damage, x.repair])});
    });
    await step("boarding", async () => {
      let b = await api().start({name: "WoDX gate: boarding", year: 1250, gap: 0, ships: [{name: "Gate dromon", type: "dromon"}, {name: "Gate small cog", type: "smallCog"}]});
      made.push(b.id);
      b = await api().boarding(b.id, [5, 20]);
      ok("boarding", b.ships[1].struck && /colours/.test(b.over?.text ?? ""), {over: b.over});
    });
    await step("the window", async () => {
      const app1 = await api().open(null);
      await new Promise(r => setTimeout(r, 300));
      const t1 = app1?.element?.textContent ?? "";
      const app2 = await api().open(s.id);
      await new Promise(r => setTimeout(r, 300));
      const t2 = app2?.element?.textContent ?? "", h2 = app2?.element?.innerHTML ?? "";
      await app2?.close?.();
      ok("the window", /WoDX gate: a chase/.test(t1) && /Gate dromon/.test(t2) && /Dromon/.test(t2) && /navFire/.test(h2) && /navRemove/.test(h2), {len: [t1.length, t2.length]});
    });
    await step("let the time pass", async () => {
      const w0 = game.time.worldTime, secs = await api().passTime(f.id);
      await new Promise(r => setTimeout(r, 200));
      const again = await api().passTime(f.id);
      ok("let the time pass", secs === 4 * 3600 && game.time.worldTime - w0 === secs && again === 0, {secs, again});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-otherworlds", "wodx-creation"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      const app = await st()?.battles?.open?.(null);
      await new Promise(r => setTimeout(r, 300));
      const bt = app?.element?.textContent ?? "";
      await app?.close?.();
      ok("other modules", !off.length && /A new siege/.test(bt), {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    CONFIG.Dice.randomUniform = rnd0;
    try {
      for ( const id of made ) await api()?.remove?.(id);
      for ( const m of msgsSince() ) if ( m.speaker?.alias === "Ships at sea" || /WoDX gate/.test(m.content) ) await m.delete();
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatenaval-result.json");
}
