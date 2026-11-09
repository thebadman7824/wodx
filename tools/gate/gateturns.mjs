/**
 * Moves out of turn gate (WoDX Combat 3.8.1), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateturns.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes its own scene, two mortals and a fight, and deletes them at the end. The setting "Moves out of turn" is
 * set to block for the run and put back. A player is stood in for by reading isGM as false on this client while
 * the preUpdateToken hooks are called by hand (nothing is written in that state).
 *   1. the module: WoDX Combat 3.8.1 or later, the setting with its two choices
 *   2. the fight: a scene, two tokens, a started combat
 *   3. as a player: the token whose turn it is may move
 *   4. as a player: the other token may not, and the reason says it is not its turn
 *   5. as a player: a held character is told to press Act next first
 *   6. as a player: a token outside the fight moves freely
 *   7. setting Off: the out-of-turn move goes ahead
 *   8. as the Storyteller: an out-of-turn move really happens on the scene
 *   9. clean up: setting back, scene, actors and fight gone
 * Result: Data/wodx-gate/gateturns-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-combat";
const NAME = "WoDX gate: Turns";

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

/** Call the preUpdateToken hooks for a move, as if this client were a player's. True when the move would go ahead. */
function asPlayer(doc, dx = 100) {
  const warns = [];
  const warn = ui.notifications.warn;
  Object.defineProperty(game.user, "isGM", {get: () => false, configurable: true});
  ui.notifications.warn = (m, ...rest) => { warns.push(String(m)); };
  try {
    const changes = {x: doc.x + dx, y: doc.y};
    const go = Hooks.call("preUpdateToken", doc, changes, {diff: true}, game.user.id) !== false;
    return {go, warns};
  } finally {
    delete game.user.isGM;
    ui.notifications.warn = warn;
  }
}

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  let before = null, sc = null, combat = null;
  const actors = [];
  try {
    await step("1 module", async () => {
      const m = game.modules.get(MOD);
      const reg = game.settings.settings.get(`${MOD}.turnMoves`);
      before = game.settings.get(MOD, "turnMoves");
      ok("1 module", m?.active && newer(m.version, "3.8.1") && reg && Object.keys(reg.choices ?? {}).join() === "off,block", {version: m?.version, was: before});
      await game.settings.set(MOD, "turnMoves", "block");
    });
    await step("2 fight", async () => {
      sc = await Scene.create({name: NAME, width: 1400, height: 1000, padding: 0, grid: {type: CONST.GRID_TYPES.SQUARE, size: 100, distance: 5, units: "ft"}});
      for ( const n of ["A", "B", "C"] ) actors.push(await Actor.create({name: `${NAME} ${n}`, type: "Mortal"}));
      const tds = [];
      for ( const [i, a] of actors.entries() ) tds.push((await a.getTokenDocument({x: 200 + i * 300, y: 400, actorLink: false})).toObject());
      await sc.createEmbeddedDocuments("Token", tds);
      combat = await Combat.create({scene: sc.id, active: false});
      const [ta, tb] = sc.tokens.contents;
      await combat.createEmbeddedDocuments("Combatant", [ta, tb].map((t, i) => ({tokenId: t.id, sceneId: sc.id, actorId: t.actorId, initiative: 10 - i})));
      await combat.startCombat();
      await sleep(1500);
      ok("2 fight", combat.started && !!combat.combatant, {current: combat.combatant?.name});
    });
    const cur = () => sc.tokens.get(combat.combatant.tokenId);
    const other = () => sc.tokens.find(t => t.id !== combat.combatant.tokenId && combat.combatants.some(c => c.tokenId === t.id));
    const outside = () => sc.tokens.find(t => !combat.combatants.some(c => c.tokenId === t.id));
    await step("3 current moves", async () => { const r = asPlayer(cur()); ok("3 current moves", r.go, r); });
    await step("4 other stopped", async () => {
      const r = asPlayer(other());
      ok("4 other stopped", !r.go && r.warns.some(w => /not this character's turn/.test(w)), r);
    });
    await step("5 held", async () => {
      const c = combat.combatants.find(x => x.tokenId === other().id);
      await c.setFlag(MOD, "held", {combatId: combat.id, round: combat.round});
      const r = asPlayer(other());
      await c.unsetFlag(MOD, "held");
      ok("5 held", !r.go && r.warns.some(w => /Act next/.test(w)), r);
    });
    await step("6 outside the fight", async () => { const r = asPlayer(outside()); ok("6 outside the fight", r.go, r); });
    await step("7 off", async () => {
      await game.settings.set(MOD, "turnMoves", "off");
      const r = asPlayer(other());
      await game.settings.set(MOD, "turnMoves", "block");
      ok("7 off", r.go, r);
    });
    await step("8 Storyteller moves", async () => {
      const t = other(), x0 = t.x;
      await t.update({x: x0 + 100}, {animate: false});
      await sleep(300);
      ok("8 Storyteller moves", sc.tokens.get(t.id).x === x0 + 100, {from: x0, to: sc.tokens.get(t.id).x});
    });
  } catch (e) {
    R.errors.push(String(e.stack ?? e));
  } finally {
    await step("9 clean up", async () => {
      if ( before !== null ) await game.settings.set(MOD, "turnMoves", before);
      await combat?.delete();
      await sc?.delete();
      for ( const a of actors ) await a?.delete();
      ok("9 clean up", !game.scenes.getName(NAME) && !game.actors.some(a => a.name.startsWith(NAME)) && game.settings.get(MOD, "turnMoves") === (before ?? "off"), {setting: game.settings.get(MOD, "turnMoves")});
    });
  }
  return save(R, "gateturns-result.json");
}
