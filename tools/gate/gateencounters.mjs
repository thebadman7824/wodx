/**
 * Book one's encounters gate (WoDX Chronicle, B6640-B6649), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateencounters.mjs?${Date.now()}`)).run()
 * Turns the saga on with book one running, makes its own maps and stands the company on one, and puts the settings,
 * the scenes, the actors, the chat cards and the clock back.
 *   1. the api and the encounters section in the saga window (24 rows)
 *   2. the company on the Mountain Trail: the tick offers encounter 5 on a card with Play, Not tonight and Never
 *   3. the card's Play button (the real click handler): Radek made, on the company's map, with a routine and a home;
 *      the encounter played once; its twist no longer waits for it
 *   4. the played card's Found button pins the sire's courier on the fronts' clues
 *   5. Not tonight puts an encounter off a day; Never strikes it
 *   6. chapters 1 to 3 played: the hunt that failed closes unmet, and off the map the mill burns (marks on the Ford's
 *      map), Wenzel is gone from the roles, the street talk goes on the signal board, and the card comes
 * Result: Data/wodx-gate/gateencounters-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = 86400;
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gateencounters-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", ST = "wodx-storyteller";
  const saga = () => game.modules.get(C)?.api?.pod?.saga, en = () => saga()?.encounters, fr = () => saga()?.fronts;
  const TL = () => game.modules.get(ST)?.api?.upkeep?.townLooks ?? game.modules.get(ST)?.api?.townLooks;
  const KEYS = ["podChains", "podSaga", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const actors0 = new Set(game.actors.map(a => a.id)), folders0 = new Set(game.folders.map(f => f.id));
  // An encounter's person may already be in the world: their routine is put back after
  const people0 = game.actors.filter(a => ["Radek"].includes(a.name)).map(a => [a, foundry.utils.deepClone(a.flags?.["wodx-npc"]?.routine ?? null)]);
  const board0 = foundry.utils.deepClone(game.settings.get(ST, "signalBoard"));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-"));
  const heard = [], signals = [];
  const hook = Hooks.on("wodxEncounter", p => heard.push(p));
  const shook = Hooks.on("wodxSignal", p => signals.push(p));
  const made = {scenes: []};
  /** Click a card's button through the real render hook. */
  const click = async (m, sel) => {
    let b = document.querySelector(`[data-message-id="${m.id}"] ${sel}`);
    if ( !b ) { const el = await m.renderHTML(); Hooks.callAll("renderChatMessageHTML", m, el); b = el.querySelector(sel); }
    if ( !b ) throw new Error(`No button ${sel}`);
    b.click(); await sleep(1500);
  };
  try {
    for ( const name of ["WoDX gate · The Mountain Trail", "WoDX gate · The Ford"] )
      made.scenes.push(await Scene.create({name, width: 3000, height: 2000, grid: {size: 100}, padding: 0}));
    const trail = made.scenes[0];
    // Stand the company on the trail: more player characters' tokens there than on any other map
    const pc = game.actors.find(a => a.hasPlayerOwner && a.type !== "Npc");
    if ( pc ) {
      const most = Math.max(0, ...game.scenes.map(s => s.tokens.filter(t => t.actor?.hasPlayerOwner && t.actor?.type !== "Npc").length));
      const tds = []; for ( let i = 0; i <= most; i++ ) tds.push((await pc.getTokenDocument({x: 200 + i * 100, y: 200})).toObject());
      await trail.createEmbeddedDocuments("Token", tds);
    } else { await trail.view(); R.notes.push("No player character: the viewed map stands for the company."); }
    await game.settings.set(C, "podSaga", true);
    await game.settings.set(C, "podChains", false);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    await saga().start("red-stone");
    await sleep(500);

    await step("1 api", async () => {
      const app = await game.modules.get(C).api.pod.open(); await sleep(600);
      const rows = app?.element?.querySelectorAll?.("[data-encounters] tr[data-encounter]")?.length ?? 0;
      await app?.close?.();
      ok("1 api", typeof en()?.tick === "function" && !en().rules.validate().length && rows === 24, {rows});
    });
    let offer = null;
    await step("2 offered on the company's map", async () => {
      const n0 = cards().length;
      const due = await en().tick(); await sleep(800);
      offer = cards().slice(n0).find(m => m.flags?.[C]?.encounter?.n === 5 && m.flags[C].encounter.offer);
      ok("2 offered on the company's map", due.includes(5) && !!offer && /data-wct-enc="play"/.test(offer.content) && /Not tonight/.test(offer.content) && /Never/.test(offer.content) && en().state().offered[5] !== undefined,
        {due, card: offer?.content?.slice(0, 200)});
    });
    let played = null;
    await step("3 Play from the card", async () => {
      const tw0 = saga().twists.rules.whyNot(5, saga().twists.state(), {played: [], met: en().met()});
      const n0 = cards().length;
      await click(offer, `[data-wct-enc="play"]`);
      played = cards().slice(n0).find(m => m.flags?.[C]?.encounter?.played);
      const tok = trail.tokens.find(t => t.actor?.name === "Radek" && t.flags?.[C]?.encounter === 5);
      const radek = tok ? game.actors.get(tok.actorId) : null;
      const routine = radek?.flags?.["wodx-npc"]?.routine;
      const tw1 = saga().twists.rules.whyNot(5, saga().twists.state(), {played: [], met: en().met()});
      let again = ""; try { await en().play(5); } catch (e) { again = e.message; }
      const npcOn = game.modules.get("wodx-npc")?.active;
      ok("3 Play from the card", en().state().played[5] !== undefined && !!tok && (!npcOn || (routine?.on && routine.preset === "labourer")) && /has not been played/.test(tw0) && !/encounter/.test(tw1)
        && /Already played/.test(again) && heard.some(p => p.n === 5 && p.action === "play") && !!played,
        {radek: radek?.id, token: tok?.id, routine, twistBefore: tw0, twistAfter: tw1, again});
    });
    await step("4 a clue found from the card", async () => {
      await click(played, `[data-wct-enc="clue"][data-clue="sire"][data-i="0"]`);
      ok("4 a clue found from the card", fr().state().clues.sire.includes(0), {sire: fr().state().clues.sire});
    });
    await step("5 Not tonight and Never", async () => {
      await en().later(13);
      const until = en().state().later[13];
      await en().never(20);
      const why = en().rules.whyNot(en().state(), 20, {now: game.time.worldTime, played: [], month: 9, scene: "The Tavern", force: true});
      ok("5 Not tonight and Never", until > game.time.worldTime && until - game.time.worldTime <= DAY && /Struck/.test(why), {until, why});
    });
    await step("6 a window closes unmet", async () => {
      const s = foundry.utils.deepClone(game.settings.get(C, "podState"));
      const run = s.chains.find(r => r.saga?.book === "red-stone"); run.played = ["c1", "c2", "c3"];
      await game.settings.set(C, "podState", s);
      const n0 = cards().length;
      await en().tick({offers: false}); await sleep(1200);
      const closed = cards().slice(n0).find(m => m.flags?.[C]?.encounter?.n === 1 && m.flags[C].encounter.closed);
      const h = heard.find(p => p.n === 1 && p.action === "closed");
      const sc = game.scenes.getName(h?.scene ?? "");
      const marks = sc ? TL()?.marksOf?.(sc, "front:encounter:1") : null;
      const n = marks ? marks.layer.length + marks.own.length : 0;
      const gone = !!fr().state().gone?.Wenzel;
      const talked = signals.some(p => String(p.key ?? "").startsWith("encounter:1"));
      ok("6 a window closes unmet", en().state().closed[1] !== undefined && !!closed && n > 0 && gone && talked && en().state().closed[13] !== undefined,
        {scene: h?.scene, marks: n, gone, talked, closed13: en().state().closed[13]});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    Hooks.off("wodxEncounter", hook); Hooks.off("wodxSignal", shook);
    for ( const sc of game.scenes ) for ( const k of Object.keys(sc.flags?.[ST]?.lookSigs ?? {}) ) if ( k.startsWith("front:encounter:") || k.startsWith("front:council") ) { try { await TL().setLooks(sc, k, []); } catch (e) { R.errors.push(`marks ${sc.name}: ${e.message}`); } }
    for ( const sc of made.scenes ) await sc.delete().catch(e => R.errors.push(`scene: ${e.message}`));
    for ( const a of game.actors.filter(a => !actors0.has(a.id)) ) await a.delete().catch(e => R.errors.push(`actor: ${e.message}`));
    for ( const f of game.folders.filter(f => !folders0.has(f.id)) ) await f.delete().catch(() => {});
    for ( const [a, r] of people0 ) await a.update(r ? {"flags.wodx-npc.routine": r} : {"flags.wodx-npc.-=routine": null}).catch(e => R.errors.push(`routine ${a.name}: ${e.message}`));
    try { await game.settings.set(ST, "signalBoard", board0); } catch (e) { R.errors.push(`signals: ${e.message}`); }
    for ( const k of KEYS ) { try { await game.settings.set(C, k, was[k]); } catch (e) { R.errors.push(`${k}: ${e.message}`); } }
    for ( const m of cards() ) await m.delete().catch(() => {});
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.notes.push(`Clock back: ${game.time.worldTime === time0}.`);
  }
  return save(R);
}
