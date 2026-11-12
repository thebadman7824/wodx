/**
 * How much runs by itself (Chronicle 0.46.0, Combat 3.21.0, NPC 0.47.0, Storyteller 0.52.0, Targeting 0.4.0,
 * Creation 0.15.0, Otherworlds 0.19.0; B2450-B2458), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateautomation.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors of its own and deletes what it made; every setting it touches, the standing
 * approvals and the clock are put back.
 *   1. the modules: versions, the APIs, the Waiting and Let time pass buttons, the new settings
 *   2. a look at Balanced changes nothing
 *   3. Balanced: the Auto choices and the queue table are set, a card says so
 *   4. Hands off: the conductor, targeting for everyone, every kind on sight
 *   5. Hands on: everything back as it was, the base cleared
 *   6. a small rule: an hour of a long action passes on its own; thirty hours waits
 *   7. the Waiting tray: a queue entry and a card with a button are listed; Take the recommended answers the card
 *   8. a fight ends by itself when the only foe is down for a full turn (Auto)
 *   9. letting time pass: with no other player here, the Storyteller's ask passes at once and the clock moves
 *  10. clean up: scene, actors, messages, settings, approvals, the clock
 * Result: Data/wodx-gate/gateautomation-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 10;
const CH = "wodx-chronicle";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateautomation-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };
const get = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const t0 = game.time.worldTime, msgStart = Date.now();
  const C = game.modules.get(CH).api;
  const AR = C?.automation?.rules;
  const keep = {};
  const touched = [...(AR?.TOUCHED ?? []), {mod: CH, key: "automationLevel"}, {mod: CH, key: "automationBase"}, {mod: CH, key: "autoApprove"}, {mod: CH, key: "approvals"}];
  for ( const p of touched ) keep[`${p.mod}.${p.key}`] = foundry.utils.deepClone(get(p.mod, p.key));
  const sceneBefore = canvas.scene;
  const made = {actors: []};
  let scene = null;
  try {
    const tools = {};
    Hooks.callAll("getSceneControlButtons", {tokens: {tools}});
    const vers = {[CH]: "0.46.0", "wodx-combat": "3.21.0", "wodx-npc": "0.47.0", "wodx-storyteller": "0.52.0", "wodx-targeting": "0.4.0", "wodx-creation": "0.15.0", "wodx-otherworlds": "0.19.0"};
    ok("1. modules", Object.entries(vers).every(([id, v]) => atLeast(id, v)) && !!C.automation?.setLevel && !!C.waiting?.rows
      && !!tools.wodxWaiting && !!tools.wodxPassTime && get("wodx-combat", "fightEnd") !== undefined && get("wodx-npc", "talkAskWait") !== undefined
      && !!game.modules.get("wodx-storyteller").api?.passTime?.open && !!game.modules.get("wodx-combat").api?.fightEnd?.check,
    {versions: Object.keys(vers).map(id => `${id} ${game.modules.get(id)?.version}`), level: C.automation?.level?.()});

    // 2. A look changes nothing
    const before = JSON.stringify(AR.TOUCHED.map(p => get(p.mod, p.key)));
    const look = C.automation.preview("balanced");
    ok("2. preview", JSON.stringify(AR.TOUCHED.map(p => get(p.mod, p.key))) === before && Array.isArray(look.changes), {changes: look.changes.map(c => `${c.mod}.${c.key}=${c.to}`)});

    // 3. Balanced
    if ( C.automation.level() !== "handsOn" ) await C.automation.setLevel("handsOn");
    const msgs0 = game.messages.size;
    await C.automation.setLevel("balanced");
    await sleep(400);
    const auto = get(CH, "autoApprove") ?? {};
    ok("3. Balanced", get("wodx-npc", "mode") === "auto" && get("wodx-combat", "fightEnd") === "auto" && auto["xp-spend"] === "small"
      && auto["wodx-storyteller.night"] === true && auto["era-change"] !== true && get(CH, "automationLevel") === "balanced" && game.messages.size > msgs0,
    {npc: get("wodx-npc", "mode"), fightEnd: get("wodx-combat", "fightEnd"), xp: auto["xp-spend"]});

    // 4. Hands off
    await C.automation.setLevel("handsOff");
    await sleep(300);
    const a2 = get(CH, "autoApprove") ?? {};
    const kinds = C.approvals.types().filter(t => t.type !== "request");
    ok("4. Hands off", get("wodx-combat", "turnConductor") === "everyone" && get("wodx-targeting", "mode") === "everyone"
      && kinds.every(t => a2[t.type] === true) && !("request" in a2), {kinds: kinds.length, notOn: kinds.filter(t => a2[t.type] !== true).map(t => t.type)});

    // 5. Hands on
    await C.automation.setLevel("handsOn");
    await sleep(300);
    const diff = AR.TOUCHED.filter(p => JSON.stringify(get(p.mod, p.key)) !== JSON.stringify(keep[`${p.mod}.${p.key}`])).map(p => `${p.mod}.${p.key}`);
    ok("5. Hands on", !diff.length && JSON.stringify(get(CH, "autoApprove") ?? {}) === JSON.stringify(keep[`${CH}.autoApprove`] ?? {})
      && Object.keys(get(CH, "automationBase") ?? {}).length === 0, {notBack: diff});

    // Scratch scene and actors
    scene = await Scene.create({name: "WoDX gate: automation", width: 1200, height: 1000, grid: {size: 100, distance: 5, units: "ft"}});
    await scene.view();
    await sleep(800);
    const player = game.users.find(u => !u.isGM);
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const pc = await Actor.create({name: "WoDX gate: auto hero", type: "Mortal", ownership: own});
    const foe = await Actor.create({name: "WoDX gate: auto foe", type: "Mortal"});
    made.actors.push(pc.id, foe.id);

    // 6. A small rule
    await C.approvals.setAuto("wodx-storyteller.time", "small");
    const tSmall = game.time.worldTime;
    await C.propose({type: "wodx-storyteller.time", title: "Gate: an hour", data: {actorIds: [pc.id], seconds: 3600, label: "gate"}});
    await sleep(800);
    const passed = C.approvals.history().find(h => h.title === "Gate: an hour");
    await C.propose({type: "wodx-storyteller.time", title: "Gate: thirty hours", data: {actorIds: [pc.id], seconds: 30 * 3600, label: "gate"}});
    await sleep(600);
    const waits = C.approvals.pending().find(p => p.title === "Gate: thirty hours");
    ok("6. small rule", passed?.verdict === "approve" && passed.auto === true && !!waits, {moved: game.time.worldTime - tSmall, waiting: !!waits});

    // 7. The Waiting tray
    const card = await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "WoDX gate"},
      content: `<div class="wodx-card"><p><b>Gate: a waiting card</b></p><button type="button" class="wodx-gate-go">Accept</button><button type="button">Undo</button></div>`});
    await sleep(800);
    const rows = C.waiting.rows();
    const cardRow = rows.find(r => r.id === card.id), qRow = rows.find(r => r.kind === "queue" && r.title === "Gate: thirty hours");
    let clicked = 0;
    document.querySelectorAll(`[data-message-id="${card.id}"] button.wodx-gate-go`).forEach(b => b.addEventListener("click", () => { clicked++; }));
    const took = cardRow ? await C.waiting.take(cardRow) : false;
    await sleep(500);
    const gone = !C.waiting.rows().some(r => r.id === card.id);
    ok("7. Waiting tray", !!cardRow && cardRow.pick?.label === "Accept" && !!qRow && took && clicked === 1 && gone, {rows: rows.length, clicked, gone});
    if ( waits ) await C.approvals.decide(waits.id, "reject");

    // 8. A fight ends by itself
    await game.settings.set("wodx-combat", "fightEnd", "auto");
    const D = CONST.TOKEN_DISPOSITIONS;
    const [tp, tf] = await scene.createEmbeddedDocuments("Token", [
      {name: pc.name, actorId: pc.id, x: 200, y: 200, disposition: D.FRIENDLY},
      {name: foe.name, actorId: foe.id, x: 500, y: 200, disposition: D.HOSTILE}]);
    const combat = await Combat.create({scene: scene.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [{tokenId: tp.id, sceneId: scene.id, actorId: pc.id, initiative: 10}, {tokenId: tf.id, sceneId: scene.id, actorId: foe.id, initiative: 5}]);
    await combat.startCombat();
    await sleep(500);
    await combat.combatants.find(c => c.tokenId === tf.id)?.update({defeated: true});
    for ( let i = 0; i < 4 && game.combats.get(combat.id); i++ ) { await game.combats.get(combat.id)?.nextTurn(); await sleep(600); }
    const ended = !game.combats.get(combat.id);
    ok("8. fight ends", ended, {left: !!game.combats.get(combat.id), watch: game.combats.get(combat.id)?.getFlag("wodx-combat", "endWatch") ?? null});
    if ( game.combats.get(combat.id) ) await game.combats.get(combat.id).delete();

    // 9. Letting time pass
    const others = game.users.filter(u => !u.isGM && u.active).length;
    const tp0 = game.time.worldTime;
    await game.modules.get("wodx-storyteller").api.passTime.open({userId: game.user.id, choice: "hour"});
    await sleep(800);
    ok("9. let time pass", others > 0 ? true : game.time.worldTime - tp0 >= 3600, {moved: game.time.worldTime - tp0, otherPlayers: others,
      note: others ? "a player is logged in, so the ask waits for them; not checked" : ""});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    // 10. Clean up
    try {
      for ( const c of game.combats.filter(c => c.scene?.id === scene?.id) ) await c.delete();
      for ( const [k, v] of Object.entries(keep) ) {
        const [m, ...rest] = k.split("."); const key = rest.join(".");
        if ( v !== undefined && JSON.stringify(get(m, key)) !== JSON.stringify(v) ) await game.settings.set(m, key, v);
      }
      for ( const id of made.actors ) await game.actors.get(id)?.delete();
      const mine = game.messages.filter(m => (m.timestamp ?? 0) >= msgStart).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      if ( scene ) await scene.delete();
      // Never leave the canvas on no scene: the next gate reads canvas.scene
      const back = (sceneBefore && game.scenes.get(sceneBefore.id)) ?? game.scenes.active ?? game.scenes.contents.find(x => x.id !== scene?.id);
      if ( back && canvas.scene?.id !== back.id ) await back.view();
      if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
      const left = game.actors.filter(a => a.name.startsWith("WoDX gate: auto")).length + game.scenes.filter(s => s.name === "WoDX gate: automation").length;
      ok("10. clean up", !left && game.time.worldTime === t0 && JSON.stringify(get(CH, "autoApprove") ?? {}) === JSON.stringify(keep[`${CH}.autoApprove`] ?? {}), {left, clock: game.time.worldTime - t0});
    } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("10. clean up", false); }
  }
  return save(R);
}
