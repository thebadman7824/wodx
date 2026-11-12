/**
 * Caravans, faction moves on markets and traders going broke (WoDX Storyteller 0.49.0, WoDX Interactables 0.33.0),
 * in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemarketmoves.mjs?${Date.now()}`)).run()
 * It keeps the world's markets, caravans, factions, rumours and the settings it touches, makes two linked markets of
 * its own on two scenes of its own with a faction, a trader and a shop tile of its own, and puts everything back at
 * the end. The clock never moves: turns are run by hand and caravans are brought in by hand.
 *   1. the modules: Storyteller 0.49.0 or later with api.upkeep.caravans and marketMoves and their settings;
 *      Interactables 0.33.0 or later knows the living condition "a caravan in town"
 *   2. a turn: the goods a market in plenty sends leave as a caravan; the market in want waits for it
 *   3. bringing the caravan in delivers the goods; its market's scene counts as "a caravan in town"
 *   4. the turn's Undo calls the caravan back
 *   5. a tax by hand stands on the market and makes food dearer over the weeks
 *   6. a caravan lost on the road delivers nothing, makes its cargo dearer where it was bound and starts talk
 *   7. a raid by hand is rolled and told on a card
 *   8. left to themselves: the gate's faction plans a move, and it waits in the queue where a player character stands
 *   9. a shop that has shut draws no stock; four weeks behind shuts a shop
 *  10. the windows: Caravans, the Markets window's new column and button, the editor's faction section
 *  11. the week's card for factions and traders, and its Undo
 *  12. clean up
 * Result: Data/wodx-gate/gatemarketmoves-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 12;
const FACTION = "gate-market-crown";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatemarketmoves-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), U = M?.api?.upkeep, T = U?.marketTurn, K = U?.markets, CV = U?.caravans, MM = U?.marketMoves, RU = M?.api?.rumours;
  const I = game.modules.get("wodx-interactables"), C = game.modules.get("wodx-chronicle")?.api;
  const has = k => game.settings.settings.has(k);
  const SET = ["markets", "marketTurnState", "marketTurn", "rumours", "rumourNetwork", "caravans", "caravanState", "marketMoves", "tradersBroke"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const keepFactions = has("wodx-npc.factions") ? foundry.utils.deepClone(game.settings.get("wodx-npc", "factions")) : null;
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const scenes = [], actors = [];
  const mk = id => K.state().markets.find(m => m.id === id);
  const set = async markets => game.settings.set(MOD, "markets", {v: 1, markets});
  const noCaravans = async () => game.settings.set(MOD, "caravanState", CV.rules.blankState());
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const closeAll = async () => {
    for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( app.options?.classes?.some?.(c => ["wst-market", "wst-markets", "wst-caravans"].includes(c)) ) await app.close();
  };
  try {
    ok("1. modules", M?.active && !foundry.utils.isNewerVersion("0.49.0", M.version) && typeof CV?.arriveNow === "function" && typeof MM?.set === "function"
      && has(`${MOD}.caravans`) && has(`${MOD}.marketMoves`) && has(`${MOD}.tradersBroke`)
      && I?.active && !foundry.utils.isNewerVersion("0.33.0", I.version) && !!I.api?.living?.rules?.CONDITIONS?.caravan,
      {storyteller: M?.version, interactables: I?.version});
    await game.settings.set(MOD, "marketTurn", "auto");
    await game.settings.set(MOD, "rumourNetwork", true);
    await game.settings.set(MOD, "caravans", true);
    await game.settings.set(MOD, "marketMoves", "off");
    await game.settings.set(MOD, "tradersBroke", false);
    await noCaravans();
    for ( const n of ["Brno", "Town"] ) scenes.push(await Scene.create({name: `WoDX gate: moves ${n}`, width: 800, height: 600, padding: 0}));
    const base = () => [
      {id: "gate-brno", name: "WoDX gate: Brno", scenes: [scenes[0].id], links: ["gate-town"], supply: {food: "plenty"}, index: {food: 0.8}},
      {id: "gate-town", name: "WoDX gate: Town", scenes: [scenes[1].id], links: ["gate-brno"], supply: {food: "none"}, index: {food: 2.2}}];
    const even = () => base().map(m => ({...m, supply: {}, index: {}}));
    await set(base());
    // The gate's own faction holds the Brno scene, with the dots to tax and to raid
    if ( keepFactions !== null ) {
      const fs = foundry.utils.deepClone(keepFactions ?? {});
      fs.factions = [...(fs.factions ?? []).filter(f => f.id !== FACTION), {id: FACTION, name: "WoDX gate: the Crown's men", kind: "other", places: [`Scene.${scenes[0].id}`],
        assets: {resources: 3, retainers: 5, security: 2, influence: {crown: 4, guild: 3, military: 5}}, members: [], standing: {}}];
      await game.settings.set("wodx-npc", "factions", fs);
    }
    const view = MM.views().find(v => v.id === FACTION);
    R.notes.push({view});

    // 2. A turn sends a caravan
    await T.run({force: true, reason: "a gate week"});
    await sleep(500);
    const out = () => CV.state().list.filter(c => c.from === "gate-brno" && c.to === "gate-town");
    const c1 = out()[0];
    ok("2. a caravan leaves", c1?.state === "road" && c1.ship?.includes("food") && K.rules.supplyOf(mk("gate-town"), "food") === "none" && K.rules.supplyOf(mk("gate-brno"), "food") === "normal",
      {caravan: c1 ? CV.rules.describe(c1) : null, days: c1 ? CV.rules.daysOf(c1) : null, town: mk("gate-town")?.supply, brno: mk("gate-brno")?.supply});

    // 3. It comes in
    if ( c1 ) await CV.arriveNow(c1.id);
    await sleep(500);
    const inTown = CV.inTownScenes();
    const livingSees = ((await I.api.living.context?.())?.caravans ?? []).includes(scenes[1].id);
    const cameIn = newMsgs().some(m => /A caravan comes in/.test(m.content));
    ok("3. it comes in", K.rules.supplyOf(mk("gate-town"), "food") === "short" && inTown.includes(scenes[1].id) && !inTown.includes(scenes[0].id) && livingSees && cameIn,
      {town: mk("gate-town")?.supply, inTown: inTown.length, livingSees, cameIn});

    // 4. The turn's Undo calls a caravan back
    await set(base()); await noCaravans();
    await T.run({force: true, reason: "a gate week"});
    await sleep(500);
    const card = newMsgs().reverse().find(m => m.flags?.[MOD]?.marketTurn?.applied && m.flags[MOD].marketTurn.caravans?.length);
    const before4 = out().length;
    if ( card ) await T.undo(card);
    await sleep(400);
    ok("4. undo calls it back", !!card && before4 === 1 && out().length === 0 && K.rules.supplyOf(mk("gate-brno"), "food") === "plenty", {card: !!card, before: before4, after: out().length});

    // 5. A tax by hand
    await set(even()); await noCaravans();
    const taxed = await MM.set({market: "gate-brno", faction: FACTION, type: "tax", rate: 0.2});
    const mv = mk("gate-brno")?.moves?.find(v => v.type === "tax" && v.faction === FACTION);
    const shift = MM.rules.priceShift(mk("gate-brno"), "food");
    for ( let i = 0; i < 3; i++ ) await T.run({force: true, reason: "a gate week"});
    await sleep(300);
    const dear = K.rules.indexOf(mk("gate-brno"), "food"), plain = K.rules.indexOf(mk("gate-town"), "food");
    ok("5. a tax by hand", !!mv && mv.hand && shift === 0.2 && dear > plain && !!mk("gate-brno")?.moves?.some(v => v.id === mv.id) && /WoDX gate: Brno/.test(taxed?.text ?? ""),
      {text: taxed?.text ?? null, shift, brno: dear, town: plain, weeks: mk("gate-brno")?.moves?.[0]?.weeks});

    // 6. A caravan lost on the road
    await set(base()); await noCaravans();
    await T.run({force: true, reason: "a gate week"});
    await sleep(400);
    const c2 = out()[0];
    const before6 = K.rules.indexOf(mk("gate-town"), "food");
    const rumoursBefore = new Set(RU.list().map(x => x.id));
    const lost = c2 ? await CV.lose(c2.id, {by: "taken by the gate"}) : null;
    await sleep(400);
    const after6 = K.rules.indexOf(mk("gate-town"), "food");
    const talk = RU.list().filter(x => !rumoursBefore.has(x.id)).find(x => /never reached WoDX gate: Town/.test(x.text));
    ok("6. a caravan is lost", !!lost && CV.state().list.find(c => c.id === c2.id)?.state === "lost" && after6 > before6 && K.rules.supplyOf(mk("gate-town"), "food") === "none" && !!talk,
      {before: before6, after: after6, talk: talk?.text ?? null});

    // 7. A raid by hand
    await set(even()); await noCaravans();
    const raid = await MM.set({market: "gate-town", faction: FACTION, type: "raid"});
    await sleep(300);
    const raidCard = newMsgs().some(m => /A move on the market/.test(m.content) && /WoDX gate: Town/.test(m.content));
    ok("7. a raid by hand", /strike WoDX gate: Town|driven off/.test(raid?.text ?? "") && /against a guard of \d/.test(raid?.text ?? "") && raidCard, {text: raid?.text ?? null});

    // 8. Left to themselves
    await set(even());
    const kinds = Object.keys((await import("/modules/wodx-library/data/goods.mjs")).KINDS ?? {});
    const vs = MM.views().filter(v => v.id === FACTION);
    const plan = MM.rules.planMoves(K.state(), vs, {kinds, chance: 1, randFor: () => () => 0.01, pcMarkets: ["gate-brno", "gate-town"]});
    const free = MM.rules.planMoves(K.state(), vs, {kinds, chance: 1, randFor: () => () => 0.01});
    const none = MM.rules.planMoves(K.state(), vs, {kinds, chance: 0, randFor: () => () => 0.99});
    ok("8. left to themselves", plan.length === 1 && plan[0].queue === true && free[0]?.queue === false && none.length === 0 && ["tax", "monopoly", "smuggle", "raid"].includes(plan[0].type),
      {move: plan[0] ? {type: plan[0].type, market: plan[0].market, goods: plan[0].goods ?? ""} : null, home: view?.home});

    // 9. A shop that has shut
    const keeper = await Actor.create({name: "WoDX gate: market keeper", type: "Mortal"});
    actors.push(keeper);
    const [tile] = await scenes[0].createEmbeddedDocuments("Tile", [{x: 100, y: 100, width: 100, height: 100, texture: {src: "icons/svg/chest.svg"}}]);
    const withShop = extra => even().map(m => (m.id === "gate-brno" ? {...m, traders: [{actor: keeper.id, tile: tile.uuid, ...extra}]} : m));
    await set(withShop({shut: true, shutWeeks: 1}));
    const fresh = [{name: "Bread", count: 3}, {name: "Ale", count: 2}];
    Hooks.callAll("wodxStockFilter", tile, fresh);
    const week = MM.rules.traderWeeks({behind: MM.rules.BROKE_AT - 1}, {wage: 100, factor: 0.2, till: 0, weeks: 1});
    const open = MM.rules.traderWeeks({shut: true, shutWeeks: MM.rules.REOPEN_AFTER - 1}, {wage: 100, factor: 1, till: 0, weeks: 1});
    ok("9. a shut shop", fresh.length === 0 && mk("gate-brno")?.traders?.[0]?.shut === true && week.shutNow === true && week.trader.shut === true && open.openNow === true,
      {drawn: fresh.length, shutNow: week.shutNow, openNow: open.openNow});

    // 10. The windows
    await MM.set({market: "gate-brno", faction: FACTION, type: "tax", rate: 0.1});
    await set(K.state().markets.map(m => (m.id === "gate-brno" ? {...m, links: ["gate-town"], supply: {food: "plenty"}} : m.id === "gate-town" ? {...m, supply: {food: "none"}} : m)));
    await noCaravans();
    await T.run({force: true, reason: "a gate week"});
    await sleep(400);
    K.open(); await sleep(800);
    const win = [...document.querySelectorAll(".wst-markets")].map(e => e.textContent).join(" ");
    const hasNew = /Factions and shops/.test(win) && /Caravans/.test(win);
    document.querySelectorAll(".wst-markets button[data-market]")?.forEach?.(b => { if ( b.dataset.market === "gate-brno" ) b.click(); });
    await sleep(900);
    const ed = [...document.querySelectorAll(".wst-market")].map(e => e.textContent).join(" ");
    await closeAll();
    CV.open(); await sleep(800);
    const cw = [...document.querySelectorAll(".wst-caravans")].map(e => e.textContent).join(" ");
    await closeAll();
    ok("10. windows", hasNew && /Factions and this market/.test(ed) && /Shop is/.test(ed) && /WoDX gate: Town/.test(cw) && /Bring it in/.test(cw) && /Lost on the road/.test(cw),
      {markets: hasNew, editor: ed.length, caravans: cw.length});

    // 11. The week's card for factions and traders, and its Undo
    await noCaravans();
    await set(withShop({behind: MM.rules.BROKE_AT - 1}).map(m => (m.id === "gate-brno" ? {...m, supply: Object.fromEntries(kinds.map(k => [k, "none"]))} : m)));
    await game.settings.set(MOD, "tradersBroke", true);
    const r11 = await MM.after({pre: null, weeks: 1, live: false, pcMarkets: []});
    await sleep(400);
    const shutNow = mk("gate-brno")?.traders?.[0]?.shut === true;
    const mcard = newMsgs().reverse().find(m => m.flags?.[MOD]?.marketMoves?.applied);
    if ( mcard ) await MM.undo(mcard);
    await sleep(400);
    await game.settings.set(MOD, "tradersBroke", false);
    ok("11. the week's card and its Undo", shutNow && !!mcard && /shuts up shop/.test(mcard.content) && mk("gate-brno")?.traders?.[0]?.shut !== true && mk("gate-brno")?.traders?.[0]?.behind === MM.rules.BROKE_AT - 1,
      {lines: r11?.lines ?? null, shutNow, card: !!mcard, after: mk("gate-brno")?.traders?.[0] ?? null});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await closeAll();
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      if ( keepFactions !== null ) await game.settings.set("wodx-npc", "factions", keepFactions);
      for ( const p of C?.approvals?.pending?.() ?? [] ) if ( !pendingBefore.has(p.id) && String(p.type).startsWith(`${MOD}.market`) ) await C.approvals.decide(p.id, "reject");
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      try { await I?.api?.living?.sync?.({force: true}); } catch (e) { /* nothing to sync */ }
      const factionsBack = keepFactions === null || !(game.settings.get("wodx-npc", "factions")?.factions ?? []).some(f => f.id === FACTION);
      ok("12. clean up", !K.state().markets.some(m => m.id.startsWith("gate-")) && !CV.state().list.some(c => String(c.from).startsWith("gate-")) && factionsBack
        && scenes.every(s => !game.scenes.get(s.id)) && actors.every(a => !game.actors.get(a.id)), {factionsBack});
    } catch (err) { ok("12. clean up", false, {error: err.message}); }
  }
  return save(R);
}
