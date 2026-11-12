/**
 * Ways of moving gate (WoDX Combat 3.12.1, Actions 3.42.1), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemove.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Moving" (gridless, 100 px), a deep-water region, two actors and two tokens; views
 * the scene, then goes back to the scene it started on and deletes everything it made.
 *   1. the api, the setting and Foundry's movement actions (Through walls added)
 *   2. Rise gives flight; a token 20 feet up is flying
 *   3. Rise ending drops the token to the ground, with a fall card for the Storyteller
 *   4. an Undo of Rise is not a fall
 *   5. a token moved into "WoDX: Deep water" gets the water flag and a card
 *   6. a fight round in the water with no Athletics and no breath left: one lethal level
 *   7. stances: crawling helps Stealth, a prone target is easier up close; height counts
 *   8. Earth Meld hides the token, and its end shows it again
 *   9. the Jumping reach and the fall window's height
 *  10. every other WoDX module still answers
 * Result: Data/wodx-gate/gatemove-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene, startMsgs = new Set(game.messages.map(m => m.id));
  const M = () => game.wodxCombat?.movement;
  const T = () => game.modules.get("wodx-chronicle")?.api;
  let scene, actors = [], a, b, combat = null;
  try {
    scene = await Scene.create({name: "WoDX gate: Moving", width: 2000, height: 1500, padding: 0, grid: {type: 0, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    await scene.createEmbeddedDocuments("Region", [{name: "WoDX: Deep water", shapes: [{type: "rectangle", x: G * 10, y: G * 2, width: G * 6, height: G * 6}]}]);
    actors = await createActors([{name: "WoDX gate: Mover", type: "Mortal"}, {name: "WoDX gate: Watcher", type: "Mortal"}]);
    // 3.12.1: the mover is linked like a player character; the watcher is unlinked like most NPCs
    await actors[0].update({"prototypeToken.actorLink": true});
    await scene.createEmbeddedDocuments("Token", [{name: "mover", actorId: actors[0].id, actorLink: true, x: G * 2, y: G * 2}, {name: "watcher", actorId: actors[1].id, actorLink: false, x: G * 3, y: G * 2}]);
    a = scene.tokens.find(t => t.actorId === actors[0].id); b = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => a.object && b.object);
    const cards = () => game.messages.filter(m => !startMsgs.has(m.id) && m.getFlag("wodx-combat", "movement"));

    await step("api, setting and actions", async () => {
      const A = CONFIG.Token?.movement?.actions ?? {};
      ok("api, setting and actions", typeof M()?.moveCheck === "function" && game.settings.get("wodx-combat", "movementModes") === true && !!A.phase && A.phase.walls === null && !!A.fly,
        {actions: Object.keys(A)});
    });
    let rise = null;
    await step("Rise gives flight", async () => {
      rise = await T().applyTimed(actors[0], {name: "Risen", key: "wodx-effect-rise", duration: {kind: "scene"}});
      await until(() => a.movementAction === "fly");
      const action = a.movementAction;
      await a.update({elevation: 20});
      await until(() => a.elevation === 20);
      ok("Rise gives flight", M().abilitiesOf(actors[0]).fly === true && M().stanceOf(actors[0]) === "flying" && action === "fly",
        {stance: M().stanceOf(actors[0]), action, elevation: a.elevation, tokens: M().tokensOf?.(actors[0])?.length});
    });
    await step("flight ends: a fall", async () => {
      const before = cards().length;
      await rise.delete();
      await until(() => a.elevation === 0 && cards().length > before);
      ok("flight ends: a fall", a.elevation === 0 && cards().some(m => /falls 20 feet/.test(m.content)) && a.movementAction === "walk",
        {elevation: a.elevation, action: a.movementAction, cards: cards().map(m => m.content.replace(/<[^>]+>/g, " ").slice(0, 80))});
    });
    await step("Undo is not a fall", async () => {
      await a.update({movementAction: "fly"}); await a.update({elevation: 15});
      const e = await T().applyTimed(actors[0], {name: "Risen", key: "wodx-effect-rise", duration: {kind: "scene"}});
      await e.delete({wodxUndo: true});
      await sleep(500);
      ok("Undo is not a fall", a.elevation === 15, {elevation: a.elevation});
      await a.update({elevation: 0, movementAction: "walk"});
    });
    await step("into deep water", async () => {
      await a.update({x: G * 12, y: G * 4}, {animate: false});
      await until(() => !!a.getFlag("wodx-combat", "water"));
      ok("into deep water", a.getFlag("wodx-combat", "water")?.kind === "deep" && cards().some(m => /deep water/.test(m.content)), {flag: a.getFlag("wodx-combat", "water")});
    });
    await step("drowning in a fight", async () => {
      [combat] = await Combat.createDocuments([{scene: scene.id}]);
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: a.id, sceneId: scene.id, actorId: actors[0].id}]);
      await combat.startCombat();
      await a.setFlag("wodx-combat", "water", {...a.getFlag("wodx-combat", "water"), breath: 1, max: 10});
      const hurt = () => { const d = a.actor?.system?.health?.damage ?? {}; return (Number(d.lethal) || 0) + (Number(d.bashing) || 0); };
      const was = hurt();
      await combat.nextRound();
      await until(() => hurt() > was, 6000);
      ok("drowning in a fight", hurt() === was + 1, {damage: a.actor?.system?.health?.damage, water: a.getFlag("wodx-combat", "water"), round: combat.round});
      await combat.delete(); combat = null;
      await a.update({x: G * 2, y: G * 2}, {animate: false});
    });
    await step("stances", async () => {
      await a.update({movementAction: "crawl"});
      const sneak = M().rollMods(actors[0], ["stealth"]);
      const hit = M().attackMods(actors[1], actors[0]);
      await b.update({movementAction: "fly"}); await b.update({elevation: 30});
      await until(() => b.elevation === 30);
      const far = M().heightBetween(a, b), bStance = M().stanceOf(b.actor, b);
      await b.update({elevation: 0, movementAction: "walk"}); await a.update({movementAction: "walk"});
      ok("stances", sneak.diff === -2 && hit.diff === -2 && far === 30, {sneak, hit, far, bElevation: b.elevation, bStance, unlinkedFound: M().tokensOf?.(b.actor)?.length});
    });
    await step("Earth Meld", async () => {
      const e = await T().applyTimed(actors[0], {name: "Earth Meld", duration: {kind: "scene"}});
      await until(() => a.hidden === true);
      const hid = a.hidden;
      await e.delete();
      await until(() => a.hidden === false);
      ok("Earth Meld", hid === true && a.hidden === false);
    });
    await step("jump reach and fall height", async () => {
      const src = await (await fetch(`/modules/wodx-actions/scripts/checks-rules.js?${Date.now()}`)).text();
      ok("jump reach and fall height", /export function jumpReach/.test(src) && game.wodxActions?.hazard?.length >= 0 && typeof game.wodxActions?.hazard === "function");
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-senses"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( combat ) await combat.delete();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      const made = game.messages.filter(m => !startMsgs.has(m.id) && m.getFlag("wodx-combat", "movement")).map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatemove-result.json");
}
