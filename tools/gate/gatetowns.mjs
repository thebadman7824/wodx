/**
 * Towns that change over time (WoDX Storyteller, B3280-B3286), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetowns.mjs?${Date.now()}`)).run()
 * It keeps the world's markets, towns and the settings it touches, makes two linked markets on two scenes of its own,
 * and puts everything back at the end. The clock never moves: weeks are run by hand.
 *   1. the modules: Storyteller with api.upkeep.towns and its settings
 *   2. a week by hand makes a town for each market, with a Towns card
 *   3. the Towns card's Undo puts the towns back
 *   4. no bread and a crushing tax for eight weeks make a town angrier and poorer
 *   5. a dated event with famine news reaches every town at once (a famine mark and a scar)
 *   6. a siege taken by storm sacks the town it stands at, once
 *   7. Suggest: the week waits in the approval queue, and approving it lands it
 *   8. what others read: of(market) and ofScene(scene) in words
 *   9. the windows: Towns, and the Markets window's Towns button
 *  10. clean up
 * Result: Data/wodx-gate/gatetowns-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 10;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatetowns-result.json", {type: "application/json"});
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
  const M = game.modules.get(MOD), U = M?.api?.upkeep, TW = U?.towns, K = U?.markets;
  const C = game.modules.get("wodx-chronicle")?.api;
  const has = k => game.settings.settings.has(k);
  const SET = ["markets", "townState", "townTurn", "rumourNetwork", "marketTurn"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const pendingBefore = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const t0 = game.time.worldTime;
  const scenes = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const town = id => TW.state().towns[id];
  try {
    ok("1. modules", M?.active && typeof TW?.run === "function" && typeof TW?.of === "function" && has(`${MOD}.townTurn`) && has(`${MOD}.townState`), {storyteller: M?.version});
    await game.settings.set(MOD, "townTurn", "auto");
    await game.settings.set(MOD, "marketTurn", "off");
    await game.settings.set(MOD, "rumourNetwork", false);
    await game.settings.set(MOD, "townState", TW.rules.blankState());
    for ( const n of ["Brno", "Olomouc"] ) scenes.push(await Scene.create({name: `WoDX gate: towns ${n}`, width: 800, height: 600, padding: 0}));
    const markets = (food = "normal", moves = []) => [
      {id: "gate-tbrno", name: "WoDX gate Brno", scenes: [scenes[0].id], links: ["gate-tolo"], supply: {food}, moves},
      {id: "gate-tolo", name: "WoDX gate Olomouc", scenes: [scenes[1].id], links: ["gate-tbrno"]}];
    await game.settings.set(MOD, "markets", {v: 1, markets: markets()});

    // 2. A week by hand
    await TW.run({force: true, reason: "a gate week"});
    await sleep(500);
    const card2 = newMsgs().reverse().find(m => m.flags?.[MOD]?.townTurn?.applied);
    const b2 = town("gate-tbrno");
    ok("2. a week makes the towns", !!b2 && !!town("gate-tolo") && b2.people > 0 && !!card2 && /The towns after/.test(card2.content), {brno: b2 ?? null, card: !!card2});

    // 3. Undo
    if ( card2 ) await TW.undo(card2);
    await sleep(600);
    ok("3. undo puts the towns back", !town("gate-tbrno") && !town("gate-tolo") && game.messages.get(card2?.id)?.flags?.[MOD]?.townTurn?.applied === false, {left: Object.keys(TW.state().towns)});

    // 4. Hard weeks
    await TW.run({force: true});
    const u0 = town("gate-tbrno")?.unrest ?? 0, p0 = town("gate-tbrno")?.prosperity ?? 3;
    await game.settings.set(MOD, "markets", {v: 1, markets: markets("none", [{type: "tax", faction: "gate-lord", name: "A gate lord", rate: 0.3}])});
    for ( let i = 0; i < 8; i++ ) await TW.run({force: true});
    const b4 = town("gate-tbrno"), o4 = town("gate-tolo");
    ok("4. no bread and a tax anger a town", b4.unrest > u0 + 1 && b4.prosperity < p0 && b4.unrest > o4.unrest, {before: [u0, p0], brno: [b4.unrest, b4.prosperity], olomouc: [o4.unrest, o4.prosperity],
      events: newMsgs().filter(m => m.flags?.[MOD]?.townTurn).length});
    await game.settings.set(MOD, "markets", {v: 1, markets: markets()});

    // 5. Famine news
    const scars5 = town("gate-tolo").scars.length;
    Hooks.callAll("wodxEventFired", {id: "gate-famine", name: "A gate famine", market: "famine"});
    await sleep(800);
    const o5 = town("gate-tolo");
    ok("5. famine news reaches every town", o5.marks.some(m => m.kind === "famine") && o5.scars.length === scars5 + 1 && town("gate-tbrno").marks.some(m => m.kind === "famine"), {marks: o5.marks, scars: o5.scars.slice(-1)});

    // 6. A sack
    const people6 = town("gate-tolo").people;
    const battle = {id: "gate-sack", name: "The storming of Olomouc", kind: "siege", place: "WoDX gate Olomouc", over: {winner: 0, how: "storm", text: "Taken"}};
    Hooks.callAll("wodxBattle", {battle, step: {kind: "assault"}});
    await sleep(800);
    const people6b = town("gate-tolo").people;
    Hooks.callAll("wodxBattle", {battle, step: {kind: "assault"}});
    await sleep(800);
    ok("6. a siege taken by storm sacks the town once", people6b < people6 * 0.92 && town("gate-tolo").people === people6b && town("gate-tolo").scars.some(s => s.kind === "sack"),
      {people: [people6, people6b, town("gate-tolo").people]});

    // 7. Suggest
    await game.settings.set(MOD, "townTurn", "suggest");
    const was7 = JSON.stringify(town("gate-tbrno"));
    await TW.run({force: true});
    await sleep(500);
    const entry = (C?.approvals?.pending?.() ?? []).find(p => !pendingBefore.has(p.id) && p.type === `${MOD}.town` && p.data?.town?.id === "gate-tbrno");
    const held = JSON.stringify(town("gate-tbrno")) === was7;
    if ( entry ) await C.approvals.decide(entry.id, "approve");
    await sleep(500);
    ok("7. suggest waits in the queue, approve lands it", !!entry && held && JSON.stringify(town("gate-tbrno")) !== was7, {entry: !!entry, held});
    await game.settings.set(MOD, "townTurn", "auto");

    // 8. What others read
    const v8 = TW.of("gate-tbrno"), s8 = TW.ofScene(scenes[1]);
    ok("8. of and ofScene", !!v8?.prosperityWord && !!v8?.unrestWord && !!v8?.mood && s8?.id === "gate-tolo" && Array.isArray(s8.history) && s8.history.length >= 1, {v8, s8: s8?.id});

    // 9. The windows
    const tw = await peek(() => TW.open(), "wst-towns");
    const mw = await peek(() => K.open(), "wst-markets");
    ok("9. the windows", /wst-towns-t/.test(tw) && /WoDX gate Brno/.test(tw) && /Towns/.test(mw), {towns: tw.length, markets: /Towns/.test(mw)});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      for ( const p of C?.approvals?.pending?.() ?? [] ) if ( !pendingBefore.has(p.id) && p.type === `${MOD}.town` ) await C.approvals.decide(p.id, "reject");
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
      ok("10. clean up", !K.state().markets.some(m => m.id.startsWith("gate-")) && !Object.keys(TW.state().towns).some(id => id.startsWith("gate-"))
        && scenes.every(s => !game.scenes.get(s.id)) && game.time.worldTime === t0);
    } catch (err) { ok("10. clean up", false, {error: err.message}); }
  }
  return save(R);
}
