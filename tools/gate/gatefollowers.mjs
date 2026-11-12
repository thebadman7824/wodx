/**
 * Followers, part 1 (WoDX NPC 0.38.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefollowers.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock. The scene in view is put back.
 *   1. the modules, versions and APIs
 *   2. one tie: a ghoul (domitor {id, name}) and a background made real both serve the character, with no orders flag
 *   3. an order to the ghoul: Wait holds, the card is posted, No order clears it
 *   4. hard orders and the suggested refusal roll (rules)
 *   5. Keep watch: a stranger walks into plain sight and the master is warned
 *   6. Guard: a stranger close by is challenged and the guard steps beside them
 *   7. fight orders: Attack the one I point at and Hold back move the choices (rules)
 *   8. clean up
 * Result: Data/wodx-gate/gatefollowers-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 8;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefollowers-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), viewed = canvas.scene;
  const NPC = game.modules.get("wodx-npc")?.api, O = NPC?.orders?.rules;
  const ordersBefore = game.settings.get("wodx-npc", "followerOrders");
  let scene = null;
  const actors = [];
  const cards = () => game.messages.contents.filter(m => m.timestamp >= msgStart);
  try {
    ok("1. modules", atLeast("wodx-npc", "0.38.0") && !!NPC?.orders?.give && !!NPC?.orders?.sentries && !!O?.servesFrom && !!O?.fightShift,
      {versions: ["wodx-npc", "wodx-creation", "wodx-chronicle"].map(id => `${id} ${game.modules.get(id)?.version}`)});
    await game.settings.set("wodx-npc", "followerOrders", true);

    // 2. One tie
    const pc = await Actor.create({name: "WoDX gate: the domitor", type: "Vampire", ownership: {default: 3}}); actors.push(pc);
    const ghoul = await Actor.create({name: "WoDX gate: the ghoul", type: "Mortal", ownership: {default: 0},
      flags: {"wodx-creation": {lineage: {domitor: {id: pc.id, name: pc.name}}}}, system: {attributes: {perception: {value: 4}}}}); actors.push(ghoul);
    const ret = await Actor.create({name: "WoDX gate: the retainer", type: "Mortal", ownership: {default: 0},
      flags: {"wodx-chronicle": {bound: {actor: pc.id, bg: "retainers", role: "Retainer"}}}}); actors.push(ret);
    const stranger = await Actor.create({name: "WoDX gate: a stranger", type: "Mortal", ownership: {default: 0}}); actors.push(stranger);
    ok("2. one tie", NPC.orders.servesOf(ghoul).includes(pc.id) && NPC.orders.servesOf(ret).includes(pc.id) && !NPC.orders.servesOf(stranger).length,
      {ghoul: NPC.orders.servesOf(ghoul), retainer: NPC.orders.servesOf(ret), pcHasPlayerOwner: pc.hasPlayerOwner});

    scene = await Scene.create({name: "WoDX gate: the courtyard", width: 2000, height: 1400, grid: {size: 100}, tokenVision: false});
    await scene.view();
    await sleep(800);
    const made = await scene.createEmbeddedDocuments("Token", [
      {name: pc.name, actorId: pc.id, x: 200, y: 200, actorLink: true},
      {name: ghoul.name, actorId: ghoul.id, x: 300, y: 200, actorLink: true},
      {name: ret.name, actorId: ret.id, x: 1200, y: 1000, actorLink: true},
      {name: stranger.name, actorId: stranger.id, x: 1800, y: 200, actorLink: true, disposition: -1}]);
    const tk = a => made.find(k => k.actorId === a.id);
    await sleep(600);

    // 3. An order to the ghoul, with no orders flag on it
    const g = await NPC.orders.give({sceneId: scene.id, tokenId: tk(ghoul).id, kind: "wait", leader: pc.id});
    await sleep(300);
    const held = NPC.orders.orderOf(game.actors.get(ghoul.id));
    const c = await NPC.orders.clear(game.actors.get(ghoul.id));
    await sleep(300);
    ok("3. ghoul takes an order", g?.ok && held?.kind === "wait" && c?.ok && !NPC.orders.orderOf(game.actors.get(ghoul.id))
      && cards().some(m => m.flags?.["wodx-npc"]?.order?.actor === ghoul.id), {give: g, held});

    // 4. Hard orders and the refusal roll
    const hr = O.hardReasons({kind: "fetch", target: {hostile: true}}), easy = O.hardReasons({kind: "follow", inFight: true});
    const loyal = NPC.orders.loyaltyFor(game.actors.get(ghoul.id), pc.id);
    ok("4. hard orders", hr.length === 1 && !easy.length && loyal?.diff >= 4 && loyal?.diff <= 9 && /Willpower/.test(loyal?.text ?? ""), {hr, loyal});

    // 5. Keep watch: the ghoul watches; the stranger walks into plain sight
    await NPC.orders.give({sceneId: scene.id, tokenId: tk(ghoul).id, kind: "watch", leader: pc.id});
    await sleep(300);
    await tk(stranger).update({x: 1000, y: 200});
    await sleep(1200);
    const w = await NPC.orders.sentries(scene.tokens.get(tk(stranger).id));
    await sleep(300);
    const warned = cards().some(m => /warns/.test(m.content) && m.content.includes("WoDX gate: a stranger"));
    // The hook may have acted first (then the call is held back for 30 seconds): either way a warning card is there
    ok("5. keep watch", warned, {acted: w});

    // 6. Guard: the retainer guards; the stranger comes within 10 yards
    await NPC.orders.give({sceneId: scene.id, tokenId: tk(ret).id, kind: "guard", leader: pc.id});
    await sleep(300);
    await tk(stranger).update({x: 1200, y: 700});
    await sleep(2500);
    let challenged = cards().some(m => /challenges them/.test(m.content));
    if ( !challenged ) { await NPC.orders.sentries(scene.tokens.get(tk(stranger).id)); await sleep(2500); challenged = cards().some(m => /challenges them/.test(m.content)); }
    const rNow = scene.tokens.get(tk(ret).id), sNow = scene.tokens.get(tk(stranger).id);
    const beside = Math.max(Math.abs(rNow.x - sNow.x), Math.abs(rNow.y - sNow.y)) <= 100;
    ok("6. guard", challenged && beside, {ret: [rNow.x, rNow.y], stranger: [sNow.x, sNow.y]});

    // 7. Fight orders
    const opts = [{action: "attack", target: "a", score: 6, why: "x"}, {action: "attack", target: "b", score: 4, why: "y"}, {action: "flee", score: 1, why: "z"}];
    const atk = O.fightShift(opts, {kind: "attack", target: "b"}), hold = O.fightShift(opts, {kind: "holdback"});
    ok("7. fight orders", atk[0].target === "b" && hold[0].action === "defend" && !!O.ORDERS.attack && !!O.ORDERS.holdback, {atk: atk[0], hold: hold[0]});

  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-npc", "followerOrders", ordersBefore);
    const mine = cards().filter(m => /WoDX gate/.test(m.content) || m.flags?.["wodx-npc"]?.order).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( viewed && viewed.id !== scene?.id ) await viewed.view();
    if ( scene ) await scene.delete();
    for ( const a of actors ) await a.delete();
    ok("8. clean up", !game.scenes.getName("WoDX gate: the courtyard") && !game.actors.getName("WoDX gate: the ghoul"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("8. clean up", false); }
  return save(R);
}
