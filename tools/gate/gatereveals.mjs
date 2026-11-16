/**
 * Twists on the table gate (WoDX Chronicle, B6650-B6659), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatereveals.mjs?${Date.now()}`)).run()
 * Turns the saga on with book one running, makes its own Lower Town map and stands the company on it, and puts the
 * settings, the scenes, the actors, the items, the chat cards, the signal board and the clock back.
 *   1. twist 1 waits for its encounter; played, its reveal puts the red-wax letter in a character's hands, pushes the
 *      court and posts the street talk
 *   2. twist 3 (by its own hand): its sound is heard on the Lower Town map through WoDX Senses, and Hynek comes to the
 *      company's map with a routine
 *   3. twist 21: Vlasta owes the company; the debt waits for chapter 8, then called in Vlasta comes to the company's map
 *   4. the three murders: two marked, the third by the real path (the dead status on Ctibor's clerk, the card's
 *      button): the Lower Town map gets its shutters and an NPC there is a step cooler toward the character
 * Result: Data/wodx-gate/gatereveals-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatereveals-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", ST = "wodx-storyteller", NPC = "wodx-npc";
  const saga = () => game.modules.get(C)?.api?.pod?.saga, rv = () => saga()?.reveals, fr = () => saga()?.fronts, tw = () => saga()?.twists;
  const TL = () => game.modules.get(ST)?.api?.upkeep?.townLooks ?? game.modules.get(ST)?.api?.townLooks;
  const KEYS = ["podChains", "podSaga", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const actors0 = new Set(game.actors.map(a => a.id)), folders0 = new Set(game.folders.map(f => f.id));
  const board0 = foundry.utils.deepClone(game.settings.get(ST, "signalBoard"));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-"));
  const heard = {favour: [], cold: [], signal: []};
  const hooks = [["wodxFavour", p => heard.favour.push(p)], ["wodxColdTown", p => heard.cold.push(p)], ["wodxSignal", p => heard.signal.push(p)]].map(([k, f]) => [k, Hooks.on(k, f)]);
  const made = {scenes: [], items: []};
  const setState = async fn => { const s = foundry.utils.deepClone(game.settings.get(C, "podState")); fn(s); await game.settings.set(C, "podState", s); };
  const click = async (m, sel) => {
    let b = document.querySelector(`[data-message-id="${m.id}"] ${sel}`);
    if ( !b ) { const el = await m.renderHTML(); Hooks.callAll("renderChatMessageHTML", m, el); b = el.querySelector(sel); }
    if ( !b ) throw new Error(`No button ${sel}`);
    b.click(); await sleep(1500);
  };
  let pc = game.actors.find(a => a.hasPlayerOwner && a.type !== "Group");
  const pcItems0 = new Set(pc?.items.map(i => i.id) ?? []);
  // People the reveals bring may already be in the world; their routines are put back after. So are the attitudes of
  // every NPC on a Lower Town map, which the cold town changes.
  const people0 = game.actors.filter(a => ["Hynek", "Old Vlasta"].includes(a.name)).map(a => [a, foundry.utils.deepClone(a.flags?.[NPC]?.routine ?? null)]);
  const lower = new Map();
  for ( const sc of game.scenes ) if ( sc.name.includes("Lower Town") ) for ( const t of sc.tokens ) { const a = t.actor && !t.actor.hasPlayerOwner ? game.actors.get(t.actor.id) : null; if ( a && !lower.has(a.id) ) lower.set(a.id, [a, foundry.utils.deepClone(a.flags?.[NPC]?.attitude ?? null)]); }
  try {
    const town = await Scene.create({name: "WoDX gate · Lower Town · Market Square", width: 3000, height: 2000, grid: {size: 100}, padding: 0});
    made.scenes.push(town);
    if ( pc ) {
      const most = Math.max(0, ...game.scenes.map(s => s.tokens.filter(t => t.actor?.hasPlayerOwner && t.actor?.type !== "Group").length));
      const tds = []; for ( let i = 0; i <= most; i++ ) tds.push((await pc.getTokenDocument({x: 200 + i * 100, y: 200})).toObject());
      await town.createEmbeddedDocuments("Token", tds);
    } else { await town.view(); R.notes.push("No player character: the viewed map stands for the company; the item and attitude checks cannot pass."); }
    await game.settings.set(C, "podSaga", true);
    await game.settings.set(C, "podChains", false);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    await saga().start("red-stone");
    await sleep(500);

    await step("1 the reveal in a character's hands", async () => {
      let waits = ""; try { await tw().reveal(1); } catch (e) { waits = e.message; }
      await setState(s => { s.saga.encounters = {played: {1: 0, 3: 0, 21: 0}}; });
      const pushed0 = !!fr().state().fronts.court.pushed;
      await tw().reveal(1); await sleep(800);
      const item = pc?.items.find(i => i.name === "A letter in cheap red wax" && !pcItems0.has(i.id));
      const card = cards().find(m => /Twist 1 revealed/.test(m.content));
      ok("1 the reveal in a character's hands", /has not been played/.test(waits) && !!item && !pushed0 && fr().state().fronts.court.pushed && heard.signal.some(p => String(p.key).startsWith("twist:1")) && /On the table/.test(card?.content ?? ""),
        {waits, item: item?.id, pushed: fr().state().fronts.court.pushed, card: card?.content?.slice(0, 300)});
    });
    await step("2 a sound on the map, and someone comes", async () => {
      await tw().reveal(3, {force: true}); await sleep(800);
      const sources = []; Hooks.callAll("wodxSensesGather", {scene: town, token: town.tokens.contents[0], actor: pc, sources});
      const sound = sources.find(s => s.id === "twist.3.sound");
      const hynek = town.tokens.find(t => t.actor?.name === "Hynek");
      const routine = hynek ? game.actors.get(hynek.actorId)?.flags?.[NPC]?.routine : null;
      ok("2 a sound on the map, and someone comes", !!sound?.lines?.sound?.length && !!hynek && (!game.modules.get(NPC)?.active || routine?.on), {sound: sound?.lines, hynek: hynek?.id, routine});
    });
    await step("3 a favour called in", async () => {
      await tw().reveal(21, {force: true}); await sleep(600);
      let early = ""; try { await rv().call("Old Vlasta"); } catch (e) { early = e.message; }
      await setState(s => { s.chains.find(r => r.saga?.book === "red-stone").played = ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]; });
      await rv().call("Old Vlasta"); await sleep(800);
      const vlasta = town.tokens.find(t => t.actor?.name === "Old Vlasta");
      ok("3 a favour called in", /chapter 8/.test(early) && rv().state().debts["Old Vlasta"].called !== null && !!vlasta && heard.favour.some(p => p.who === "Old Vlasta"), {early, token: vlasta?.id});
    });
    await step("4 the third murder turns the Lower Town cold", async () => {
      const npc = await Actor.create({name: "WoDX gate · a Lower Town baker", type: "Mortal"});
      await town.createEmbeddedDocuments("Token", [(await npc.getTokenDocument({x: 1500, y: 1000})).toObject()]);
      const AT = game.modules.get(NPC)?.api?.attitude;
      const before = pc && AT ? AT.of(npc, pc).step : null;
      await rv().murder("Havel"); await rv().murder("Old Vlasta");
      const clerk = await Actor.create({name: "Ctibor's clerk", type: "Mortal"});
      const n0 = cards().length;
      await clerk.toggleStatusEffect("dead", {active: true}); await sleep(1200);
      const ask = cards().slice(n0).find(m => m.flags?.[C]?.murder?.name === "Ctibor's clerk");
      if ( !ask ) throw new Error("No card asked about the clerk's death");
      await click(ask, `[data-wct-murder="yes"]`); await sleep(1500);
      const marks = TL()?.marksOf?.(town, "front:cold"), n = marks ? marks.layer.length + marks.own.length : 0;
      const after = pc && AT ? AT.of(npc, pc).step : null;
      ok("4 the third murder turns the Lower Town cold", !!rv().state().cold && n > 0 && heard.cold.length === 1 && (before === null || after < before), {marks: n, before, after, cold: heard.cold[0]});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    for ( const [k, id] of hooks ) Hooks.off(k, id);
    for ( const sc of game.scenes ) for ( const k of Object.keys(sc.flags?.[ST]?.lookSigs ?? {}) ) if ( k.startsWith("front:twist:") || k === "front:cold" ) { try { await TL().setLooks(sc, k, []); } catch (e) { R.errors.push(`marks ${sc.name}: ${e.message}`); } }
    for ( const sc of made.scenes ) await sc.delete().catch(e => R.errors.push(`scene: ${e.message}`));
    if ( pc ) { const ids = pc.items.filter(i => !pcItems0.has(i.id)).map(i => i.id); if ( ids.length ) await pc.deleteEmbeddedDocuments("Item", ids).catch(e => R.errors.push(`items: ${e.message}`)); }
    for ( const a of game.actors.filter(a => !actors0.has(a.id)) ) await a.delete().catch(e => R.errors.push(`actor: ${e.message}`));
    for ( const f of game.folders.filter(f => !folders0.has(f.id)) ) await f.delete().catch(() => {});
    for ( const [a, r] of people0 ) await a.update(r ? {[`flags.${NPC}.routine`]: r} : {[`flags.${NPC}.-=routine`]: null}).catch(e => R.errors.push(`routine ${a.name}: ${e.message}`));
    for ( const [a, at] of lower.values() ) await a.update(at ? {[`flags.${NPC}.==attitude`]: at} : {[`flags.${NPC}.-=attitude`]: null}).catch(e => R.errors.push(`attitude ${a.name}: ${e.message}`));
    try { await game.settings.set(ST, "signalBoard", board0); } catch (e) { R.errors.push(`signals: ${e.message}`); }
    for ( const k of KEYS ) { try { await game.settings.set(C, k, was[k]); } catch (e) { R.errors.push(`${k}: ${e.message}`); } }
    for ( const m of cards() ) await m.delete().catch(() => {});
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.notes.push(`Clock back: ${game.time.worldTime === time0}.`);
  }
  return save(R);
}
