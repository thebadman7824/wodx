/**
 * Ways gate (B4780-B4783), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewaysopen.mjs?${Date.now()}`)).run()
 * Makes two small scenes and two characters of its own, deletes them all at the end, and puts the clock, the personal
 * times and the travel log back.
 *   1. the behaviour type "WoDX: Way to", the api and the toolbar's window
 *   2. makeWay puts a region with the behaviour at each end, each pointing at the other
 *   3. walking through: the walker and the companion beside it go to the other scene, at the far end, and a stranger
 *      far off stays; each one's own time moves by the door's minute
 *   4. a gate shut for the night refuses at night and says what can be done; nobody moves
 *   5. the network check is clean for the pair and names a scene with no way in or out
 * Result: Data/wodx-gate/gatewaysopen-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatewaysopen-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const api = () => game.modules.get(MOD)?.api, W = () => api()?.ways;
  const time0 = game.time.worldTime;
  const keep = {};
  for ( const k of ["personal", "log", "waysConfirm"] ) { try { keep[k] = foundry.utils.deepClone(game.settings.get(MOD, k)); } catch (e) { /* not a setting here */ } }
  const made = {scenes: [], actors: []};
  const player = game.users.find(u => !u.isGM);
  try {
    if ( "waysConfirm" in keep ) await game.settings.set(MOD, "waysConfirm", false);
    await step("1 type", async () => {
      const T = `${MOD}.way`;
      ok("1 type", !!CONFIG.RegionBehavior.dataModels[T] && CONFIG.RegionBehavior.typeLabels[T] === "WoDX: Way to" && typeof W()?.make === "function" && typeof W()?.open === "function",
        {types: Object.keys(CONFIG.RegionBehavior.dataModels).filter(k => k.startsWith("wodx"))});
    });
    const mk = name => Scene.create({name: `WoDX gate: ${name}`, width: 1400, height: 1000, padding: 0, grid: {size: 100}, navigation: false});
    const a = await mk("ways street"), b = await mk("ways inn");
    made.scenes.push(a.id, b.id);
    let way = null;
    await step("2 make", async () => {
      way = await W().make(a, b, {kind: "door", side: "east"});
      const ba = [...way.from.behaviors][0], bb = [...way.to.behaviors][0];
      ok("2 make", ba?.type === `${MOD}.way` && ba.system.to === b.id && ba.system.arrive === way.to.id && bb.system.to === a.id && bb.system.arrive === way.from.id,
        {from: way.from.name, to: way.to.name});
    });
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const actor = n => Actor.create({name: `WoDX gate: ${n}`, type: "Mortal", ownership: own, prototypeToken: {actorLink: true}});
    const [w, c, s] = [await actor("walker"), await actor("companion"), await actor("stranger")];
    made.actors.push(w.id, c.id, s.id);
    const place = async (act, x, y) => (await a.createEmbeddedDocuments("Token", [{...(await act.getTokenDocument({x, y})).toObject()}]))[0];
    const tw = await place(w, 1200, 400), tc = await place(c, 1100, 500), ts = await place(s, 100, 100);
    await step("3 walk", async () => {
      const p0 = {w: api().personalTime?.(w.id), c: api().personalTime?.(c.id)};
      const r = await W().walk({regionUuid: way.from.uuid, behaviorId: [...way.from.behaviors][0].id, tokenId: tw.id, sceneId: a.id, userId: player?.id ?? game.user.id});
      await sleep(800);
      const onB = id => b.tokens.some(t => t.actorId === id), onA = id => a.tokens.some(t => t.actorId === id);
      const end = way.to.shapes[0], tok = b.tokens.find(t => t.actorId === w.id);
      const nearEnd = tok && Math.abs(tok.x + 50 - (end.x + end.width / 2)) <= 150 && Math.abs(tok.y + 50 - (end.y + end.height / 2)) <= 150;
      const p1 = {w: api().personalTime?.(w.id), c: api().personalTime?.(c.id)};
      const moved = typeof p0.w === "number" ? Math.round(p1.w - p0.w) : null;
      ok("3 walk", r?.ok && onB(w.id) && onB(c.id) && !onB(s.id) && onA(s.id) && !onA(w.id) && nearEnd && (moved === null || moved === 60),
        {result: r, nearEnd, personalSeconds: moved, companionSeconds: typeof p0.c === "number" ? Math.round(p1.c - p0.c) : null});
    });
    await step("4 shut at night", async () => {
      const gate = await W().make(a, b, {kind: "gate", shut: "night", side: "west"});
      // Find the next midnight and set the walker's own time there
      const cal = await import(`/modules/wodx-chronicle/scripts/calendar.mjs`);
      const d = cal.getEngine().timeToDate(game.time.worldTime);
      const toMidnight = ((24 - (d.hour ?? 0)) % 24) * 3600;
      await game.time.advance(toMidnight || 1);
      const ts2 = (await a.createEmbeddedDocuments("Token", [{...(await s.getTokenDocument({x: 0, y: 450})).toObject()}]))[0];
      const r = await W().walk({regionUuid: gate.from.uuid, behaviorId: [...gate.from.behaviors][0].id, tokenId: ts2.id, sceneId: a.id, userId: player?.id ?? game.user.id});
      await sleep(400);
      ok("4 shut at night", r && !r.ok && /night/.test(r.why ?? "") && !b.tokens.some(t => t.actorId === s.id), {why: r?.why});
    });
    await step("5 network", async () => {
      // The pair alone, before the lonely place gets its way
      const pair = W().rules.checkNetwork(W().network().filter(x => made.scenes.slice(0, 2).includes(x.id)));
      const lone = await mk("ways lonely");
      made.scenes.push(lone.id);
      await W().make(lone, a, {kind: "street"});
      const mine = W().network().filter(x => made.scenes.includes(x.id));
      const cut = mine.map(x => x.id === lone.id ? {...x, ways: []} : x).map(x => ({...x, ways: x.ways.filter(y => y.to !== lone.id)}));
      const out = W().rules.checkNetwork(cut);
      ok("5 network", !pair.length && out.some(m => /lonely/.test(m)), {pair, out});
    });
  } finally {
    for ( const id of made.scenes ) await game.scenes.get(id)?.delete();
    for ( const id of made.actors ) await game.actors.get(id)?.delete();
    for ( const [k, v] of Object.entries(keep) ) { try { await game.settings.set(MOD, k, v); } catch (e) { R.errors.push(`${k}: ${e.message}`); } }
    if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    R.notes.push(`Clock back: ${game.time.worldTime === time0}. Player used: ${player?.name ?? "none (the Storyteller)"}.`);
  }
  return save(R);
}
