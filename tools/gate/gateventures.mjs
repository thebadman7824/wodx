/**
 * Putting money into a venture (WoDX Storyteller, B3110-B3113), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateventures.mjs?${Date.now()}`)).run()
 * It keeps the world's markets, caravans, ventures, factions and the settings it touches, makes two linked markets on
 * two scenes of its own, one investor with Resources 3 and Influence 2 and one faction, and puts everything back at
 * the end. The clock never moves: turns are run by hand.
 *   1. the modules: Storyteller with api.upkeep.ventures (B3110) and its settings
 *   2. the words follow the year and the market's way of life (a stake, its kind, a seat)
 *   3. putting money in takes it from the purse and opens the venture
 *   4. more than a year's allowance at once is refused
 *   5. a market turn pays a share into the purse, on a Ventures card
 *   6. the Ventures card's Undo puts the venture and the purse back
 *   7. a raid on the market costs a workshop part of its value, with a loss card
 *   8. a caravan of its market lost on the road costs a caravan venture
 *   9. a large stake: a faction with a trade hold notes it as a rival; after eight weeks a seat waits in the queue, and approving it gives the seat
 *  10. taking it all out closes the venture and pays back less the age's cut
 *  11. the windows: Ventures, the Markets window's stakes and button, Property and building's button
 *  12. clean up
 * Result: Data/wodx-gate/gateventures-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 12;
const FACTION = "gate-venture-guild";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateventures-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

/** Open a window without waiting on it, read what it shows, then close it. */
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
  const M = game.modules.get(MOD), U = M?.api?.upkeep, T = U?.marketTurn, K = U?.markets, CV = U?.caravans, V = U?.ventures, MO = U?.money;
  const C = game.modules.get("wodx-chronicle")?.api;
  const has = k => game.settings.settings.has(k);
  const SET = ["markets", "marketTurnState", "marketTurn", "rumourNetwork", "caravans", "caravanState", "marketMoves", "tradersBroke", "ventures", "ventureState"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const keepFactions = has("wodx-npc.factions") ? foundry.utils.deepClone(game.settings.get("wodx-npc", "factions")) : null;
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const scenes = [], actors = [];
  const set = async markets => game.settings.set(MOD, "markets", {v: 1, markets});
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const purse = a => { const p = MO?.purse?.(a) ?? game.actors.get(a.id)?.flags?.[MOD]?.money?.purse ?? {}; return (p.carried ?? 0) + (p.bank ?? 0); };
  const ven = id => V.state().list.find(v => v.id === id);
  try {
    ok("1. modules", M?.active && typeof V?.put === "function" && typeof V?.week === "function" && has(`${MOD}.ventures`) && has(`${MOD}.ventureState`),
      {storyteller: M?.version});
    await game.settings.set(MOD, "marketTurn", "auto");
    await game.settings.set(MOD, "rumourNetwork", false);
    await game.settings.set(MOD, "caravans", true);
    await game.settings.set(MOD, "marketMoves", "off");
    await game.settings.set(MOD, "tradersBroke", false);
    await game.settings.set(MOD, "ventures", true);
    await game.settings.set(MOD, "ventureState", V.rules.blankState());
    await game.settings.set(MOD, "caravanState", CV.rules.blankState());
    for ( const n of ["Brno", "Town"] ) scenes.push(await Scene.create({name: `WoDX gate: ventures ${n}`, width: 800, height: 600, padding: 0}));
    const even = () => [
      {id: "gate-vbrno", name: "WoDX gate: Brno", scenes: [scenes[0].id], links: ["gate-vtown"]},
      {id: "gate-vtown", name: "WoDX gate: Town", scenes: [scenes[1].id], links: ["gate-vbrno"]}];
    await set(even());
    const [a] = await Actor.create([{name: "WoDX gate: investor", type: "Mortal", ownership: {default: 0}}]);
    actors.push(a);
    await a.createEmbeddedDocuments("Item", [{name: "Resources", type: "Feature", system: {type: "wod.types.background", value: 3}},
      {name: "Influence", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
    const year = Number(C?.eras?.currentYear?.()) || 1197;
    const most = V.rules.mostAtOnce(3, year, game.settings.get(MOD, "moneyRegion") || "moravian");
    await MO.receive(a, most * 3, {to: "carried", note: "Gate money"});

    // 2. The words
    const f = V.form(K.state().markets[0]);
    ok("2. the words of the year", !!f?.stake && !!f?.house && !!f?.seat && V.rules.AGES.includes(f.age), {year, form: f});

    // 3. Put money in
    const p0 = purse(a), amount = Math.round(most / 2);
    const r3 = await V.put({actorId: a.id, market: "gate-vbrno", kind: "workshop", goods: "food", amount});
    const v1 = r3?.venture;
    ok("3. money goes in", r3?.ok && v1?.state === "open" && v1.value === amount && purse(a) === p0 - amount && !!v1.form?.stake, {why: r3?.why ?? null, before: p0, after: purse(a), venture: v1 ?? null});

    // 4. Too much at once
    const r4 = await V.put({actorId: a.id, market: "gate-vbrno", kind: "house", amount: most + 1});
    ok("4. more than a year's allowance is refused", r4?.ok === false && /Resources/.test(r4.why ?? "") && V.state().list.length === 1, {why: r4?.why ?? null});

    // 5. A turn pays
    const p5 = purse(a);
    await T.run({force: true, reason: "a gate week"});
    await sleep(600);
    const v5 = ven(v1?.id);
    const card5 = newMsgs().reverse().find(m => m.flags?.[MOD]?.ventureWeek?.applied);
    ok("5. a week pays its share", v5?.weeks === 1 && (v5.paid > 0 || v5.value < amount) && (purse(a) > p5 || v5.value < amount) && !!card5 && /Ventures this week/.test(card5.content),
      {weeks: v5?.weeks, paid: v5?.paid, value: v5?.value, purse: [p5, purse(a)], card: !!card5});

    // 6. Its Undo
    if ( card5 ) await V.undo(card5);
    await sleep(400);
    const v6 = ven(v1?.id);
    ok("6. undo puts it back", v6?.weeks === 0 && v6.paid === 0 && purse(a) === p5, {weeks: v6?.weeks, paid: v6?.paid, purse: purse(a), want: p5});

    // 7. A raid
    const before7 = ven(v1?.id)?.value ?? 0;
    const hit7 = await V.hit("raid", {market: "gate-vbrno"}, "The market was raided");
    await sleep(300);
    const lossCard = newMsgs().some(m => /A loss for/.test(m.content) && /raided/.test(m.content));
    ok("7. a raid costs the workshop", hit7?.length === 1 && (ven(v1?.id)?.value ?? 0) < before7 && lossCard, {before: before7, after: ven(v1?.id)?.value, card: lossCard});

    // 8. A caravan lost
    await set([{...even()[0], supply: {food: "plenty"}, index: {food: 0.8}}, {...even()[1], supply: {food: "none"}, index: {food: 2.2}}]);
    const r8 = await V.put({actorId: a.id, market: "gate-vbrno", kind: "caravan", goods: "food", amount: Math.round(most / 4)});
    await T.run({force: true, reason: "a gate week"});
    await sleep(500);
    const c = CV.state().list.find(x => x.from === "gate-vbrno" && x.state === "road");
    const before8 = ven(r8?.venture?.id)?.value ?? 0;
    if ( c ) await CV.lose(c.id, {by: "taken by the gate"});
    await sleep(600);
    ok("8. a lost caravan costs a caravan venture", r8?.ok && !!c && (ven(r8.venture.id)?.value ?? 0) < before8, {caravan: !!c, before: before8, after: ven(r8?.venture?.id)?.value});

    // 9. A large stake
    await set(even());
    if ( keepFactions !== null ) {
      const fs = foundry.utils.deepClone(keepFactions ?? {});
      fs.factions = [...(fs.factions ?? []).filter(x => x.id !== FACTION), {id: FACTION, name: "WoDX gate: the cloth guild", kind: "other", places: [`Scene.${scenes[0].id}`],
        assets: {resources: 3, retainers: 0, security: 1, influence: {guild: 4}}, members: [], standing: {}}];
      await game.settings.set("wodx-npc", "factions", fs);
    }
    const wage = MO.rules?.wageAt?.(year, game.settings.get(MOD, "moneyRegion") || "moravian") ?? 0;
    const st9 = V.state();
    st9.list = st9.list.map(v => (v.id === v1?.id ? {...v, value: 80 * wage, put: 80 * wage, weeks: V.rules.SEAT_WEEKS} : v));
    await game.settings.set(MOD, "ventureState", st9);
    await V.week({weeks: 1, rand: () => 0.99});
    await sleep(500);
    const v9 = ven(v1?.id);
    const seatEntry = (C?.approvals?.pending?.() ?? []).find(p => !pendingBefore.has(p.id) && p.type === `${MOD}.venture`);
    if ( seatEntry ) await C.approvals.decide(seatEntry.id, "approve");
    await sleep(400);
    ok("9. a rival and a seat", (keepFactions === null || v9?.rival === "WoDX gate: the cloth guild") && !!seatEntry && ven(v1?.id)?.seat === true,
      {rival: v9?.rival ?? null, seatOffered: !!seatEntry, seat: ven(v1?.id)?.seat, large: V.rules.isLarge(v9 ?? {}, year)});

    // 10. Take it all out
    const p10 = purse(a), worth = ven(v1?.id)?.value ?? 0;
    const r10 = await V.take({actorId: a.id, ventureId: v1?.id, all: true});
    ok("10. taking it all out closes it", r10?.ok && ven(v1?.id)?.state === "closed" && purse(a) === p10 + r10.back && r10.back === worth - r10.cut && r10.cut > 0,
      {back: r10?.back, cut: r10?.cut, worth});

    // 11. The windows
    const vw = await peek(() => V.open(), "wst-ventures");
    const mw = await peek(() => K.open(), "wst-markets");
    const pw = await peek(() => M.api.owners.open(), "wst-own-dlg");
    ok("11. the windows", /wst-ventures-t/.test(vw) && /Put money in/.test(vw) && /stake/.test(mw) && /Ventures/.test(mw) && /Ventures/.test(pw),
      {ventures: vw.length, markets: /stake/.test(mw), property: /Ventures/.test(pw)});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      if ( keepFactions !== null ) await game.settings.set("wodx-npc", "factions", keepFactions);
      for ( const p of C?.approvals?.pending?.() ?? [] ) if ( !pendingBefore.has(p.id) && (String(p.type).startsWith(`${MOD}.market`) || p.type === `${MOD}.venture`) ) await C.approvals.decide(p.id, "reject");
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("12. clean up", !K.state().markets.some(m => m.id.startsWith("gate-")) && !V.state().list.some(v => actors.some(x => x.id === v.actor))
        && scenes.every(s => !game.scenes.get(s.id)) && actors.every(x => !game.actors.get(x.id)));
    } catch (err) { ok("12. clean up", false, {error: err.message}); }
  }
  return save(R);
}
