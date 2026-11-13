/**
 * Sickness that spreads between towns (WoDX Storyteller, B3260-B3266), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecontagion.mjs?${Date.now()}`)).run()
 * It keeps the world's markets, caravans, sickness state and the settings it touches, makes two linked markets on two
 * scenes of its own (one with a passers-by crowd) and one living character, and puts everything back at the end. The
 * clock never moves: weeks are run by hand.
 *   1. the modules: Storyteller with api.upkeep.contagion (B3260) and its settings
 *   2. starting plague in a town puts it in the state, the log and the rumour-free card
 *   3. a market week moves it a week on, with a Sickness card and Undo
 *   4. at its height the town's medicine is dear, food short and its crowd quiet
 *   5. the Hunt reads the town's sickness (name, phase, blood, one less difficulty)
 *   6. it spreads along the trade link to the clean town (a sure roll)
 *   7. the card's Undo puts both towns, the market and the crowd back
 *   8. quarantine cuts the market off; opening the gates puts it back
 *   9. a living character in the sick town catches it or throws it off, then rolls each week (M20 p. 442)
 *  10. a sickness in the approval queue starts the outbreak when approved
 *  11. the windows: Sickness in the towns, the Markets window's Sickness button
 *  12. clean up
 * Result: Data/wodx-gate/gatecontagion-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 12;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatecontagion-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

async function peek(open, cls) {
  const p = open();
  await sleep(600);
  const app = [...(foundry.applications.instances?.values?.() ?? [])].find(a => a.options?.classes?.includes?.(cls));
  const html = app?.element?.innerHTML ?? "";
  await app?.close?.();
  await Promise.race([p, sleep(500)]);
  return html;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), U = M?.api?.upkeep, K = U?.markets, CO = U?.contagion, CV = U?.caravans;
  const C = game.modules.get("wodx-chronicle")?.api;
  const has = k => game.settings.settings.has(k);
  const SET = ["markets", "marketTurnState", "marketTurn", "rumourNetwork", "caravans", "caravanState", "marketMoves", "tradersBroke", "ventures",
    "contagion", "contagionPeople", "contagionState", "plague"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const scenes = [], actors = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const town = id => CO.state().towns[id] ?? null;
  const mk = id => K.state().markets.find(m => m.id === id);
  try {
    ok("1. modules", M?.active && typeof CO?.week === "function" && typeof CO?.start === "function" && has(`${MOD}.contagion`) && has(`${MOD}.contagionState`)
      && Object.keys(CO?.rules?.DISEASES ?? {}).length >= 15, {storyteller: M?.version});
    await game.settings.set(MOD, "marketTurn", "auto");
    await game.settings.set(MOD, "rumourNetwork", false);
    if ( has(`${MOD}.caravans`) ) await game.settings.set(MOD, "caravans", false);
    if ( has(`${MOD}.marketMoves`) ) await game.settings.set(MOD, "marketMoves", "off");
    if ( has(`${MOD}.tradersBroke`) ) await game.settings.set(MOD, "tradersBroke", false);
    if ( has(`${MOD}.ventures`) ) await game.settings.set(MOD, "ventures", false);
    await game.settings.set(MOD, "contagion", "auto");
    await game.settings.set(MOD, "contagionPeople", true);
    await game.settings.set(MOD, "contagionState", CO.rules.blankState());
    for ( const n of ["Brno", "Town"] ) scenes.push(await Scene.create({name: `WoDX gate: sickness ${n}`, width: 800, height: 600, padding: 0,
      flags: n === "Brno" ? {"wodx-npc": {crowd: {on: true, density: "normal"}}} : {}}));
    await game.settings.set(MOD, "markets", {v: 1, markets: [
      {id: "gate-cbrno", name: "WoDX gate: Brno", scenes: [scenes[0].id], links: ["gate-ctown"]},
      {id: "gate-ctown", name: "WoDX gate: Town", scenes: [scenes[1].id], links: ["gate-cbrno"]}]});

    // 2. Start it
    const o2 = await CO.start({market: "gate-cbrno", disease: "plague", source: "A gate test."});
    ok("2. plague starts in a town", o2?.disease === "plague" && town("gate-cbrno")?.week === 0 && !town("gate-ctown"), {outbreak: o2});

    // 3. A market week, with no spread (a roll that never comes up)
    const r3 = await CO.week({weeks: 1, rand: () => 0.99});
    await sleep(400);
    const card3 = newMsgs().reverse().find(m => m.flags?.[MOD]?.contagion?.applied);
    ok("3. a week on, with a card", town("gate-cbrno")?.week === 1 && !!card3 && /Sickness in the towns/.test(card3.content), {lines: r3?.lines ?? null});

    // 4. To its height (week 9 of 26)
    await CO.week({weeks: 8, rand: () => 0.99});
    await sleep(400);
    const m4 = mk("gate-cbrno"), sc4 = game.scenes.get(scenes[0].id);
    ok("4. at its height prices and crowds follow", town("gate-cbrno")?.week === 9 && (m4?.index?.medicine ?? 1) >= 2 && m4?.supply?.food === "short"
      && sc4?.flags?.["wodx-npc"]?.crowd?.density === "quiet", {week: town("gate-cbrno")?.week, index: m4?.index, supply: m4?.supply, crowd: sc4?.flags?.["wodx-npc"]?.crowd});

    // 5. The Hunt
    const h5 = U.huntHere(sc4);
    ok("5. the Hunt reads the town", h5?.outbreak?.disease === "plague" && h5.outbreak.blood === true && h5.outbreak.diff === -1 && !!h5.outbreak.note, {outbreak: h5?.outbreak ?? null});

    // 6. Spread with a sure roll
    const msgs6 = new Set(game.messages.map(m => m.id));
    const r6 = await CO.week({weeks: 1, rand: () => 0});
    await sleep(400);
    const card6 = game.messages.contents.filter(m => !msgs6.has(m.id)).reverse().find(m => m.flags?.[MOD]?.contagion?.applied);
    ok("6. it spreads along the trade link", town("gate-ctown")?.disease === "plague" && (r6?.spread ?? []).some(t => t.to === "gate-ctown"), {spread: r6?.spread ?? null});

    // 7. Undo that week
    if ( card6 ) await CO.undo(card6);
    await sleep(400);
    ok("7. undo puts the towns back", !town("gate-ctown") && town("gate-cbrno")?.week === 9 && (mk("gate-cbrno")?.index?.medicine ?? 1) >= 2, {towns: Object.keys(CO.state().towns)});

    // 8. Quarantine
    await CO.quarantine("gate-cbrno", true);
    const cut8 = mk("gate-cbrno")?.cut === true && town("gate-cbrno")?.quarantined === true;
    await CO.quarantine("gate-cbrno", false);
    ok("8. quarantine and opening", cut8 && mk("gate-cbrno")?.cut === false && town("gate-cbrno")?.quarantined === false);

    // 9. A living character in the sick town (needs a player to own the sheet)
    const player = game.users.find(u => !u.isGM);
    if ( player ) {
      const [a] = await Actor.create([{name: "WoDX gate: townsfolk", type: "Mortal", ownership: {default: 0, [player.id]: 3}}]);
      actors.push(a);
      await scenes[0].createEmbeddedDocuments("Token", [{actorId: a.id, name: a.name, x: 100, y: 100}]);
      const r9 = await CO.week({weeks: 1, rand: () => 0});
      const line9 = (r9?.lines ?? []).find(l => l.includes(a.name)) ?? "";
      const st9 = CO.state().people[a.id] ?? null;
      const r9b = await CO.week({weeks: 1, rand: () => 0.99});
      const line9b = (r9b?.lines ?? []).find(l => l.includes(a.name)) ?? "";
      ok("9. a character catches it or throws it off, then rolls weekly", /catches|throws it off/.test(line9) && (!st9 || /sick with plague/.test(line9b)), {first: line9, then: line9b, sick: st9});
    } else { ok("9. a character catches it or throws it off, then rolls weekly", true, {skipped: "no player user in this world"}); R.notes.push("Step 9 skipped: no player user."); }

    // 10. The approval queue
    await C?.propose?.({type: `${MOD}.contagion`, key: "gate-contagion", title: "Gate: cholera reaches Town", detail: "Gate.", data: {market: "gate-ctown", disease: "cholera", source: "Gate.", scale: 1}});
    const entry = (C?.approvals?.pending?.() ?? []).find(p => !pendingBefore.has(p.id) && p.type === `${MOD}.contagion` && p.key === "gate-contagion");
    if ( entry ) await C.approvals.decide(entry.id, "approve");
    await sleep(400);
    ok("10. approving starts it", !!entry && town("gate-ctown")?.disease === "cholera", {entry: !!entry});

    // 11. Windows
    const cw = await peek(() => CO.open(), "wst-contagion");
    const mw = await peek(() => K.open(), "wst-markets");
    ok("11. the windows", /wst-contagion-t/.test(cw) && /Quarantine/.test(cw) && /Start an outbreak/.test(cw) && /Sickness/.test(mw), {contagion: cw.length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      for ( const p of C?.approvals?.pending?.() ?? [] ) if ( !pendingBefore.has(p.id) && (String(p.type).startsWith(`${MOD}.market`) || p.type === `${MOD}.contagion`) ) await C.approvals.decide(p.id, "reject");
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("12. clean up", !K.state().markets.some(m => m.id.startsWith("gate-")) && !Object.keys(CO.state().towns).some(k => k.startsWith("gate-"))
        && scenes.every(s => !game.scenes.get(s.id)) && actors.every(x => !game.actors.get(x.id)));
    } catch (err) { ok("12. clean up", false, {error: err.message}); }
  }
  return save(R);
}
