/**
 * Long tasks and havens (Storyteller 0.15.0), shots and reloads (Combat 3.8.0), followers' orders (NPC 0.8.0),
 * tainted vessels (Actions 3.19.0) and haven security on break-ins (Interactables 0.16.1), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesurvival.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock. Settings it touches are put back.
 *   1. the modules, versions and APIs
 *   2. a long task comes due, rolls, posts a card; Undo puts it back
 *   3. shots: an empty crossbow is refused by the rules; Reload fills it and names the turns
 *   4. orders: the Storyteller tells a follower to wait (routine paused, card posted), then clears it
 *   5. havens: owners and security saved, security capped by Domain; exposing logs it; strangers break in harder
 *   6. vessels: the states and the disease rule are there
 *   7. clean up
 * Result: Data/wodx-gate/gatesurvival-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 7;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesurvival-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), t = game.time.worldTime;
  const ST = game.modules.get("wodx-storyteller")?.api, CB = game.wodxCombat, NPC = game.modules.get("wodx-npc")?.api;
  const IA = game.modules.get("wodx-interactables")?.api, AC = game.wodxActions ?? game.modules.get("wodx-actions")?.api;
  const shotsBefore = game.settings.get("wodx-combat", "countShots");
  let scene = null, pc = null, npc = null, gunner = null;
  try {
    ok("1. modules", atLeast("wodx-storyteller", "0.15.0") && atLeast("wodx-combat", "3.8.0") && atLeast("wodx-npc", "0.8.0") && atLeast("wodx-actions", "3.19.0") && atLeast("wodx-interactables", "0.16.1")
      && !!ST?.tasks?.tick && !!ST?.havens?.save && !!CB?.reload && !!NPC?.orders?.give && !!IA?.rules?.havenSecurity && !!AC?.rules?.diseaseOutcome,
      {versions: ["wodx-storyteller", "wodx-combat", "wodx-npc", "wodx-actions", "wodx-interactables"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    // 2. A long task: 10 extra dice at difficulty 2, one success needed, due an hour ago
    pc = await Actor.create({name: "WoDX gate: the smith", type: "Mortal", ownership: {default: 3},
      items: [{name: "Domain", type: "Feature", system: {type: "wod.types.background", value: 2}}]});
    const task = await ST.tasks.save(pc, {kind: "craft", name: "WoDX gate: a horseshoe", dice: 10, diff: 2, goal: 1, interval: "hour"});
    await pc.update({[`flags.wodx-storyteller.tasks.${task.id}.next`]: t - 3600});
    const ticked = await ST.tasks.tick({force: true});
    await sleep(400);
    const after = ST.tasks.of(pc).find(x => x.id === task.id);
    const card = game.messages.contents.find(m => m.timestamp >= msgStart && m.flags?.["wodx-storyteller"]?.tasks?.actor === pc.id);
    if ( card ) await ST.tasks.undo(card);
    await sleep(300);
    const undone = ST.tasks.of(pc).find(x => x.id === task.id);
    ok("2. long task", ticked.some(x => x.actor === pc.id) && ["done", "open"].includes(after?.status) && after.rolls >= 1 && !!card && undone?.rolls === 0,
      {status: after?.status, rolls: after?.rolls, total: after?.total, undoneRolls: undone?.rolls});

    // 3. Shots and reloading
    await game.settings.set("wodx-combat", "countShots", true);
    gunner = await Actor.create({name: "WoDX gate: the crossbowman", type: "Mortal", ownership: {default: 3},
      items: [{name: "Heavy Crossbow", type: "Ranged Weapon", system: {clip: {value: 0, max: 1}, mode: {hasreload: true}}}]});
    const bow = gunner.items.getName("Heavy Crossbow");
    const empty = CB.rules.shotsOf(bow.system.clip).empty;
    const rl = await CB.reload({actor: gunner, weaponId: bow.id});
    await sleep(300);
    ok("3. shots and reloading", empty && rl?.rounds === 1 && rl.turns >= 1 && gunner.items.get(bow.id).system.clip.value === 1, {empty, reload: rl});

    // 4. Orders
    scene = await Scene.create({name: "WoDX gate: the yard", width: 1400, height: 1000, grid: {size: 100}});
    npc = await Actor.create({name: "WoDX gate: the apprentice", type: "Mortal", flags: {"wodx-npc": {serves: [pc.id]}}});
    const [tp, tn] = await scene.createEmbeddedDocuments("Token", [
      {name: pc.name, actorId: pc.id, x: 200, y: 200, actorLink: true}, {name: npc.name, actorId: npc.id, x: 800, y: 600, actorLink: true}]);
    const g = await NPC.orders.give({sceneId: scene.id, tokenId: tn.id, kind: "wait", leader: pc.id});
    await sleep(300);
    const held = NPC.orders.orderOf(game.actors.get(npc.id));
    const c = await NPC.orders.clear(game.actors.get(npc.id));
    await sleep(300);
    const orderCard = game.messages.contents.some(m => m.timestamp >= msgStart && m.flags?.["wodx-npc"]?.order?.actor === npc.id);
    ok("4. orders", g?.ok && held?.kind === "wait" && c?.ok && !NPC.orders.orderOf(game.actors.get(npc.id)) && orderCard, {give: g, held, tokens: [tp?.id, tn?.id]});

    // 5. Havens
    const h = await ST.havens.save(scene, {name: "WoDX gate: the forge", owners: [pc.id], security: 4});
    await ST.havens.expose(scene, "WoDX gate: a rival", "followed home");
    const hv = ST.havens.of(scene);
    const stranger = IA.rules.havenSecurity(hv, npc.id, "pick"), owner = IA.rules.havenSecurity(hv, pc.id, "pick");
    const logged = (ST.entries?.() ?? []).some(e => /WoDX gate: a rival/.test(e.text ?? ""));
    ok("5. havens", h?.security === 2 && hv.known.length === 1 && stranger === 2 && owner === 0 && logged, {security: h?.security, known: hv?.known, stranger, owner, logged});

    // 6. Vessels
    const V = AC.rules;
    ok("6. vessels", Object.keys(V.VESSEL_STATES ?? {}).includes("disease") && V.diseaseOutcome({successes: 0, botch: true}).carrier === true && V.drinkPenalty(4) === 2, {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-combat", "countShots", shotsBefore);
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && (/WoDX gate/.test(m.content) || m.flags?.["wodx-storyteller"]?.tasks || m.flags?.["wodx-npc"]?.order)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( scene ) await scene.delete();
    for ( const a of [pc, npc, gunner] ) if ( a ) await a.delete();
    ok("7. clean up", !game.scenes.getName("WoDX gate: the yard") && !game.actors.getName("WoDX gate: the smith"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("7. clean up", false); }
  return save(R);
}
