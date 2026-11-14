/**
 * Book one's fronts, roles and clue carriers gate (WoDX Chronicle, B4910-B4919), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefronts.mjs?${Date.now()}`)).run()
 * Turns the saga on with book one running, makes its own map and case board, and puts the settings, the scenes, the
 * board, the chat cards and the clock back.
 *   1. the api and the fronts section in the saga window (six fronts, eight roles, six clues)
 *   2. the first tick lands the court's errand: the Storyteller's card, the hook, and the marks on the step's map
 *   3. a held front waits through its pace; a struck front goes back a step and its marks come off
 *   4. roles pass down their lines: a keeper gone, a contact leaned on
 *   5. three carriers found pin three cards and the whole fact on the case board
 *   6. a step that moves a saga clock moves it (the Church writes to the bishop)
 * Result: Data/wodx-gate/gatefronts-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefronts-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", ST = "wodx-storyteller", IX = "wodx-interactables";
  const saga = () => game.modules.get(C)?.api?.pod?.saga, fr = () => saga()?.fronts;
  const TL = () => game.modules.get(ST)?.api?.townLooks, CB = () => game.modules.get(IX)?.api?.caseBoard;
  const KEYS = ["podChains", "podSaga", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const boardWas = game.settings.get(IX, "caseBoard");
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-pod"));
  const heard = [];
  const hook = Hooks.on("wodxFront", p => heard.push(p));
  const made = {scenes: [], board: null};
  const FRONT_KEYS = ["court", "cult", "council", "church", "marta", "husbandman", "courier", "judge:reinhold", "judge:yaroslava"];
  try {
    // The court's first map and the Church's, made here so the gate does not lean on the lane's own scenes
    for ( const name of ["WoDX gate · Kranzfels · The Outer Bailey", "WoDX gate · Lower Town · Church Close"] ) {
      const hint = name.replace("WoDX gate · ", "");
      if ( game.scenes.some(s => s.name.includes(hint)) ) continue;
      made.scenes.push(await Scene.create({name, width: 3000, height: 2000, grid: {size: 100}, padding: 0}));
    }
    await game.settings.set(C, "podSaga", true);
    await game.settings.set(C, "podChains", false);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    await saga().start("red-stone");
    await sleep(500);

    await step("1 api", async () => {
      const app = await game.modules.get(C).api.pod.open(); await sleep(600);
      const el = app?.element;
      const fronts = el?.querySelectorAll?.("[data-fronts] [data-front]")?.length ?? 0;
      const roles = el?.querySelectorAll?.("[data-roles] [data-role]")?.length ?? 0;
      const clues = el?.querySelectorAll?.("[data-clues] [data-clue]")?.length ?? 0;
      await app?.close?.();
      ok("1 api", typeof fr()?.tick === "function" && !fr().rules.validate().length && fronts === 6 && roles === 8 && clues === 6, {fronts, roles, clues});
    });
    let courtScene = "";
    await step("2 first tick", async () => {
      const n0 = cards().length;
      await fr().tick();
      await sleep(800);
      const c = cards().slice(n0).map(m => m.content).join(" ");
      const h = heard.find(p => p.front === "court");
      courtScene = h?.scene ?? "";
      const sc = game.scenes.getName(courtScene);
      const marks = sc ? TL()?.marksOf?.(sc, "front:court") : null;
      const n = marks ? marks.layer.length + marks.own.length : 0;
      ok("2 first tick", fr().state().fronts.court.at === 1 && /The court, step 1 of 6/.test(c) && !!h && n > 0, {scene: courtScene, marks: n, card: c.slice(0, 300)});
    });
    await step("3 hold and strike", async () => {
      await fr().hold("cult", true);
      const cult0 = fr().state().fronts.cult.at;
      await game.time.advance(8 * DAY); await sleep(300);
      await fr().tick(); await sleep(300);
      const held = fr().state().fronts.cult.at === cult0;
      await fr().hold("cult", false);
      await fr().strike("court"); await sleep(500);
      const sc = game.scenes.getName(courtScene);
      const m = sc ? TL()?.marksOf?.(sc, "front:court") : null;
      const left = m ? m.layer.length + m.own.length : -1;
      ok("3 hold and strike", held && !fr().state().fronts.cult.held && fr().state().fronts.court.at === 0 && left === 0 && heard.some(p => p.struck), {held, court: fr().state().fronts.court.at, left});
    });
    await step("4 roles", async () => {
      const before = fr().holders();
      await fr().gone("Baba Yaroslava", true);
      await fr().lean("Jitka"); await fr().lean("Jitka");
      const after = fr().holders();
      ok("4 roles", before.words === "Baba Yaroslava" && after.words !== before.words && after.contact === "Jitka", {before: before.words, after: after.words, contact: after.contact});
    });
    await step("5 clues on the board", async () => {
      if ( !CB()?.openBoard?.() ) { made.board = await CB().newBoard("Gate fronts"); await game.settings.set(IX, "caseBoard", made.board.id); }
      const j = CB().openBoard();
      const have = () => (j.flags?.[IX]?.board?.cards ?? []).filter(c => String(c.ref).startsWith("wodx-front-clue:konrad")).length;
      const n0 = have();
      for ( const i of [0, 1, 2] ) await fr().find("konrad", i);
      await sleep(400);
      const n = game.journal.get(j.id).flags?.[IX]?.board?.cards?.filter(c => String(c.ref).startsWith("wodx-front-clue:konrad")).length ?? 0;
      ok("5 clues on the board", n - n0 === 4 && heard.some(p => p.clue === "konrad" && p.whole), {pinned: n - n0});
    });
    await step("6 clocks", async () => {
      const c0 = saga().state().clocks.church ?? 0;
      await fr().step("church"); await sleep(500);
      const c1 = saga().state().clocks.church ?? 0;
      ok("6 clocks", fr().state().fronts.church.at === 1 && c1 === c0 + 1, {church: [c0, c1]});
    });
  } finally {
    Hooks.off("wodxFront", hook);
    for ( const sc of game.scenes ) for ( const k of FRONT_KEYS ) if ( sc.flags?.[ST]?.lookSigs?.[`front:${k}`] ) { try { await TL().setLooks(sc, `front:${k}`, []); } catch (e) { R.errors.push(`marks ${sc.name}: ${e.message}`); } }
    for ( const sc of made.scenes ) await sc.delete().catch(e => R.errors.push(`scene: ${e.message}`));
    if ( made.board ) { await made.board.delete().catch(() => {}); await game.settings.set(IX, "caseBoard", boardWas); }
    else {
      const j = CB()?.openBoard?.();
      if ( j ) await CB().change(j, b => ({...b, cards: (b.cards ?? []).filter(c => !String(c.ref).startsWith("wodx-front-clue:"))}));
    }
    for ( const k of KEYS ) { try { await game.settings.set(C, k, was[k]); } catch (e) { R.errors.push(`${k}: ${e.message}`); } }
    for ( const m of cards() ) await m.delete().catch(() => {});
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.notes.push(`Clock back: ${game.time.worldTime === time0}.`);
  }
  return save(R);
}
