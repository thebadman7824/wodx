/**
 * Followers, part 2 (WoDX NPC 0.35.0, Storyteller 0.37.0, Interactables 0.28.0, Actions 3.46.0, Chronicle 0.34.0),
 * in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefollowers2.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock. The scene in view is put back.
 *   1. the modules, versions and APIs
 *   2. an errand to buy: a long task on the follower, its token hidden; when the task ends it comes back, the card is
 *      posted and the price leaves the master's purse
 *   3. help on a long task: the master's pool grows by the helper's dice; No order takes it off again
 *   4. dealing with a witness: the roll is made, the card posted, the order cleared
 *   5. a chase: a follower on Follow joins when its master pursues
 *   6. loyalty drift: being fed on lowers the follower's attitude one step and warns the Storyteller
 *   7. clean up
 * Result: Data/wodx-gate/gatefollowers2-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 7;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefollowers2-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), viewed = canvas.scene, t0 = game.time.worldTime;
  const NPC = game.modules.get("wodx-npc")?.api, ST = game.modules.get("wodx-storyteller")?.api, IA = game.modules.get("wodx-interactables")?.api;
  const before = {orders: game.settings.get("wodx-npc", "followerOrders"), tasks: game.settings.get("wodx-storyteller", "longTasks")};
  let scene = null;
  const actors = [];
  const cards = () => game.messages.contents.filter(m => m.timestamp >= msgStart);
  try {
    ok("1. modules", atLeast("wodx-npc", "0.35.0") && atLeast("wodx-storyteller", "0.37.0") && atLeast("wodx-interactables", "0.28.0") && atLeast("wodx-actions", "3.46.0") && atLeast("wodx-chronicle", "0.34.0")
      && !!NPC?.orders?.onTaskDone && !!ST?.tasks?.save && !!IA?.chase?.join && !!NPC?.orders?.rules?.ERRANDS,
      {versions: ["wodx-npc", "wodx-storyteller", "wodx-interactables", "wodx-actions", "wodx-chronicle"].map(id => `${id} ${game.modules.get(id)?.version}`)});
    await game.settings.set("wodx-npc", "followerOrders", true);
    await game.settings.set("wodx-storyteller", "longTasks", true);

    const pc = await Actor.create({name: "WoDX gate: the master", type: "Mortal", ownership: {default: 3}}); actors.push(pc);
    const fol = await Actor.create({name: "WoDX gate: the servant", type: "Mortal", ownership: {default: 0},
      flags: {"wodx-npc": {serves: [pc.id]}}, system: {attributes: {manipulation: {value: 3}}, abilities: {subterfuge: {value: 2}, crafts: {value: 2}}}}); actors.push(fol);
    const wit = await Actor.create({name: "WoDX gate: a witness", type: "Mortal", ownership: {default: 0}}); actors.push(wit);
    scene = await Scene.create({name: "WoDX gate: the lane", width: 2000, height: 1400, grid: {size: 100}, tokenVision: false});
    await scene.view();
    await sleep(800);
    const made = await scene.createEmbeddedDocuments("Token", [
      {name: pc.name, actorId: pc.id, x: 200, y: 200, actorLink: true}, {name: fol.name, actorId: fol.id, x: 300, y: 200, actorLink: true},
      {name: wit.name, actorId: wit.id, x: 1500, y: 900, actorLink: true}]);
    const tk = a => made.find(k => k.actorId === a.id);

    // 2. An errand to buy
    await ST.upkeep.money.receive(pc, 1000, {note: "WoDX gate"});
    const held = a => { const p = game.actors.get(a.id).flags?.["wodx-storyteller"]?.money?.purse ?? {}; return Number(p.carried ?? 0) + Number(p.bank ?? 0); };
    const carried0 = held(pc);
    const g = await NPC.orders.give({sceneId: scene.id, tokenId: tk(fol).id, kind: "errand", errand: "buy", cost: 5, leader: pc.id, note: "a lantern"});
    await sleep(500);
    const o = NPC.orders.orderOf(game.actors.get(fol.id));
    const task = ST.tasks.of(game.actors.get(fol.id)).find(x => x.id === o?.task);
    const hidden = scene.tokens.get(tk(fol).id).hidden;
    if ( task ) await ST.tasks.save(game.actors.get(fol.id), {...task, dice: 10, diff: 2, goal: 1, next: t0 - 3600});
    await ST.tasks.tick({force: true});
    await sleep(1500);
    const back = !scene.tokens.get(tk(fol).id).hidden && !NPC.orders.orderOf(game.actors.get(fol.id));
    const carried1 = held(pc);
    const errandCard = cards().some(m => /WoDX gate: the servant/.test(m.content) && /comes back|empty-handed/.test(m.content));
    ok("2. errand", g?.ok && o?.kind === "errand" && !!task && hidden && back && errandCard && carried1 < carried0, {give: g, task: task?.name, hidden, back, carried0, carried1});

    // 3. Help on a long task
    const mine = await ST.tasks.save(game.actors.get(pc.id), {kind: "craft", name: "WoDX gate: a stool", ability: "crafts", attr: "dexterity", goal: 20, interval: "week"});
    const pool0 = ST.tasks.pool(game.actors.get(pc.id), mine);
    const h = await NPC.orders.give({sceneId: scene.id, tokenId: tk(fol).id, kind: "help", task: mine.id, leader: pc.id});
    await sleep(400);
    const withHelp = ST.tasks.of(game.actors.get(pc.id)).find(x => x.id === mine.id);
    const pool1 = ST.tasks.pool(game.actors.get(pc.id), withHelp);
    await NPC.orders.clear(game.actors.get(fol.id));
    await sleep(400);
    const off = ST.tasks.of(game.actors.get(pc.id)).find(x => x.id === mine.id);
    ok("3. help", h?.ok && withHelp?.helpers?.includes(fol.id) && pool1 === pool0 + 2 && !off?.helpers?.includes(fol.id), {pool0, pool1, helpers: withHelp?.helpers});

    // 4. Dealing with a witness (no Masquerade record is made: the card says so)
    const c = await NPC.orders.give({sceneId: scene.id, tokenId: tk(fol).id, kind: "cleanup", target: tk(wit).id, leader: pc.id});
    await sleep(800);
    const witCard = cards().some(m => /WoDX gate: a witness/.test(m.content) && /Rolled 5 dice/.test(m.content));
    ok("4. witness", c?.ok && witCard && !NPC.orders.orderOf(game.actors.get(fol.id)), {give: c});

    // 5. A chase: the follower follows its master, who chases the witness
    await NPC.orders.give({sceneId: scene.id, tokenId: tk(fol).id, kind: "follow", leader: pc.id});
    await sleep(300);
    await IA.chase.start(scene, {quarry: tk(wit).id, pursuers: [tk(pc).id]});
    await sleep(1500);
    const st = IA.chase.state(scene);
    const joined = (st?.pursuers ?? []).some(p => p.id === tk(fol).id);
    await IA.chase.end(scene);
    await NPC.orders.clear(game.actors.get(fol.id));
    ok("5. chase", joined, {pursuers: (st?.pursuers ?? []).map(p => p.name)});

    // 6. Loyalty drift
    const AT = NPC.attitude;
    const s0 = Number(AT.of(game.actors.get(fol.id), game.actors.get(pc.id))?.step) || 0;
    const d = await NPC.orders.driftFor(game.actors.get(fol.id), pc.id, "fedOn");
    await sleep(300);
    const s1 = Number(AT.of(game.actors.get(fol.id), game.actors.get(pc.id))?.step) || 0;
    ok("6. loyalty", (s0 > -1 ? s1 === s0 - 1 && !!d : !d) && (s1 > -1 || cards().some(m => /wavering/.test(m.content))), {s0, s1, d});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-npc", "followerOrders", before.orders);
    await game.settings.set("wodx-storyteller", "longTasks", before.tasks);
    const mine = cards().filter(m => /WoDX gate/.test(m.content) || m.flags?.["wodx-npc"]?.order || m.flags?.["wodx-storyteller"]?.tasks).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( viewed && viewed.id !== scene?.id ) await viewed.view();
    if ( scene ) await scene.delete();
    for ( const a of actors ) await a.delete();
    if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
    ok("7. clean up", !game.scenes.getName("WoDX gate: the lane") && !game.actors.getName("WoDX gate: the servant"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("7. clean up", false); }
  return save(R);
}
