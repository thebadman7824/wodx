/**
 * The weekly market turn (WoDX Storyteller 0.48.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemarketturn.mjs?${Date.now()}`)).run()
 * It keeps the world's markets, the turn's own state and the rumours, makes two linked markets of its own on two
 * scenes of its own, and puts everything back at the end. The clock never moves: turns are run by hand.
 *   1. the module: Storyteller 0.48.0 or later, api.upkeep.marketTurn.run, the marketTurn setting
 *   2. a turn: plenty in one market and none in the linked one move a step toward each other; one Undo card
 *   3. Undo puts both markets back
 *   4. prices far apart: talk of dear and cheap food starts in the rumour network
 *   5. a market going short where a player character stands waits in the approval queue; approving applies it
 *   6. a market ticked Cut off is left alone by the turn
 *   7. the Markets window has Run a week now; the editor has the links and Cut off
 *   8. clean up
 * Result: Data/wodx-gate/gatemarketturn-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 8;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatemarketturn-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), U = M?.api?.upkeep, T = U?.marketTurn, K = U?.markets, RU = M?.api?.rumours, C = game.modules.get("wodx-chronicle")?.api;
  const keep = {markets: game.settings.get(MOD, "markets"), turn: game.settings.get(MOD, "marketTurnState"), mode: game.settings.get(MOD, "marketTurn"),
    rumours: game.settings.get(MOD, "rumours"), net: game.settings.get(MOD, "rumourNetwork")};
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const scenes = [], actors = [];
  const mk = id => K.state().markets.find(m => m.id === id);
  const set = async (markets) => game.settings.set(MOD, "markets", {v: 1, markets});
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.48.0", M.version) && typeof T?.run === "function" && game.settings.settings.has(`${MOD}.marketTurn`), {version: M?.version});
    await game.settings.set(MOD, "marketTurn", "auto");
    await game.settings.set(MOD, "rumourNetwork", true);
    for ( const n of ["Brno", "Town"] ) scenes.push(await Scene.create({name: `WoDX gate: market ${n}`, width: 800, height: 600, padding: 0}));
    const base = () => [
      {id: "gate-brno", name: "WoDX gate: Brno", scenes: [scenes[0].id], links: ["gate-town"], supply: {food: "plenty"}, index: {food: 0.8}},
      {id: "gate-town", name: "WoDX gate: Town", scenes: [scenes[1].id], links: ["gate-brno"], supply: {food: "none"}, index: {food: 2.2}}];
    await set(base());

    // 2. One turn by hand
    const r1 = await T.run({force: true, reason: "a gate week"});
    await sleep(500);
    const card = game.messages.contents.filter(m => !msgsBefore.has(m.id)).find(m => m.flags?.[MOD]?.marketTurn);
    const b = mk("gate-brno"), t = mk("gate-town");
    ok("2. a turn", K.rules.supplyOf(b, "food") === "normal" && K.rules.supplyOf(t, "food") === "short" && !!card && card.flags[MOD].marketTurn.applied,
      {brno: b?.supply, town: t?.supply, changes: r1?.changes?.length});

    // 3. Undo
    if ( card ) await T.undo(card);
    await sleep(300);
    ok("3. undo", K.rules.supplyOf(mk("gate-brno"), "food") === "plenty" && K.rules.supplyOf(mk("gate-town"), "food") === "none", {brno: mk("gate-brno")?.supply, town: mk("gate-town")?.supply});

    // 4. Talk of dear and cheap food
    const rumoursBefore = new Set(RU.list().map(x => x.id));
    await game.settings.set(MOD, "marketTurnState", {...game.settings.get(MOD, "marketTurnState"), told: []});
    await T.run({force: true, reason: "a gate week"});
    await sleep(400);
    const talk = RU.list().filter(x => !rumoursBefore.has(x.id)).find(x => /dear in WoDX gate: Town and cheap in WoDX gate: Brno/.test(x.text));
    ok("4. talk of dear goods", !!talk, {text: talk?.text ?? null});

    // 5. A drain where a player character stands waits in the queue
    const player = game.users.find(u => !u.isGM);
    if ( !player ) { ok("5. queue", true, {note: "no player user in this world; skipped"}); }
    else {
      const a = await Actor.create({name: "WoDX gate: market shopper", type: "Mortal", ownership: {default: 0, [player.id]: 3}});
      actors.push(a);
      await scenes[0].createEmbeddedDocuments("Token", [{...a.prototypeToken.toObject(), actorId: a.id, actorLink: true, name: a.name, x: 100, y: 100}]);
      await set([{...base()[0], supply: {}, index: {}}, {...base()[1]}]);
      await T.run({force: true, reason: "a gate week"});
      await sleep(400);
      const entry = (C.approvals.pending() ?? []).find(p => !pendingBefore.has(p.id) && p.type === `${MOD}.market` && p.data?.changes?.some(c => c.id === "gate-brno"));
      const held = K.rules.supplyOf(mk("gate-brno"), "food") === "normal";
      if ( entry ) await C.approvals.decide(entry.id, "approve");
      await sleep(400);
      ok("5. queue", !!entry && held && K.rules.supplyOf(mk("gate-brno"), "food") === "short", {queued: !!entry, after: mk("gate-brno")?.supply});
    }

    // 6. Cut off
    await set(base().map(m => (m.id === "gate-town" ? {...m, cut: true} : m)));
    await T.run({force: true, reason: "a gate week"});
    await sleep(300);
    ok("6. cut off", K.rules.supplyOf(mk("gate-town"), "food") === "none" && K.rules.indexOf(mk("gate-town"), "food") === 2.2 && K.rules.supplyOf(mk("gate-brno"), "food") === "plenty",
      {town: mk("gate-town")?.supply, brno: mk("gate-brno")?.supply});

    // 7. The windows
    K.open(); await sleep(800);
    const win = [...document.querySelectorAll(".wst-markets")].map(e => e.textContent).join(" ");
    const hasButton = /Run a week now/.test(win);
    document.querySelectorAll(".wst-markets button[data-market]")?.[0]?.click?.();
    await sleep(800);
    const ed = [...document.querySelectorAll(".wst-market")].map(e => e.textContent).join(" ");
    ok("7. windows", hasButton && /Trade and the week/.test(ed) && /Cut off/.test(ed), {hasButton, editor: ed.length});
    for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( app.options?.classes?.some?.(c => c === "wst-market" || c === "wst-markets") ) await app.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) if ( app.options?.classes?.some?.(c => c === "wst-market" || c === "wst-markets") ) await app.close();
      await game.settings.set(MOD, "markets", keep.markets);
      await game.settings.set(MOD, "marketTurnState", keep.turn);
      await game.settings.set(MOD, "marketTurn", keep.mode);
      await game.settings.set(MOD, "rumours", keep.rumours);
      await game.settings.set(MOD, "rumourNetwork", keep.net);
      for ( const p of C?.approvals?.pending?.() ?? [] ) if ( !pendingBefore.has(p.id) && p.type === `${MOD}.market` ) await C.approvals.decide(p.id, "reject");
      const mine = game.messages.contents.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      ok("8. clean up", !K.state().markets.some(m => m.id.startsWith("gate-")) && scenes.every(s => !game.scenes.get(s.id)) && actors.every(a => !game.actors.get(a.id)));
    } catch (err) { ok("8. clean up", false, {error: err.message}); }
  }
  return save(R);
}
