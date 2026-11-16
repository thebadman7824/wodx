/**
 * WoDX Combat: pace in a fight stops a player's move and a player's attack (B6360). Two browsers, rothenstein-wodx:
 *   node tools/harness/gate-two.mjs gatetruthwalk [--url https://localhost:30030]
 * The scene's squares are 2 yards. Every fighter has Dexterity 2: walk 7, jog 14, run 26, attack after no more than 13
 * yards (VtDA20 p. 333); carrying someone halves the pace to 13 (B5072).
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's runner, a foe, a carrier
 *            and a fallen body the carrier picks up, and a fight; puts the movement limit to its default
 *   "player" (Player Test), each a real token move or a quick attack on the player's client:
 *     a. the runner moves 28 yards, past the running speed: the token stays where it was
 *     b. the runner moves 16 yards, past half the running speed: it moves, and its quick attack on the foe does not
 *        happen (no attack card, the foe's health untouched)
 *     c. the carrier moves 16 yards with the body on its back, past half pace: the token stays; then 10 yards: it moves
 *   "finish" (Gamemaster Test):
 *     1. the setting's own default is to stop moves and attacks
 *     2. what the player's browser saw (a to c), and the foe's health on the Storyteller's side
 *   then puts every setting back and removes what it made.
 * Result: Data/wodx-gate/gatetruthwalk-result.json. The clock never moves.
 */
import {gate, waitFor} from "./kit.mjs";

const CMB = "wodx-combat", IX = "wodx-interactables";
const PLAYER = "Player Test";
const n = v => Number(v) || 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hurt = a => n(a?.system?.health?.damage?.bashing) + n(a?.system?.health?.damage?.lethal) + n(a?.system?.health?.damage?.aggravated);
const body = (name, own, {str = 2, brawl = 2} = {}) => ({name, type: "Mortal", ownership: own,
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: 2, total: 2}, stamina: {value: 2, total: 2}, wits: {value: 2, total: 2}},
    abilities: {athletics: {value: 1}, brawl: {value: brawl}}}});

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const G = gate("gatetruthwalk", {stepTimeout: 45000});
  const keys = [[CMB, "movementLimit"], [CMB, "turnMoves"], [CMB, "autoApply"], [IX, "haul"]];
  const keep = [];
  for ( const [m, k] of keys ) { try { keep.push([m, k, game.settings.get(m, k)]); } catch (e) { G.R.notes.push(`no setting ${m}.${k}`); } }
  // the default itself: a world that never changed the setting plays this way
  const def = game.settings.settings.get(`${CMB}.movementLimit`)?.default ?? null;
  await game.settings.set(CMB, "movementLimit", def ?? "block");
  await game.settings.set(CMB, "turnMoves", "off");
  await game.settings.set(CMB, "autoApply", true);
  try { await game.settings.set(IX, "haul", true); } catch (e) { G.R.notes.push("haul setting missing"); }
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  // owned by the player, so WoDX NPC's fight AI leaves their turns alone
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await G.scene({name: "WoDX gate: truth walk", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false,
    grid: {size: 100, type: 1, distance: 2, units: "yd"}});
  const [runner, foe, carrier, fallen] = await G.make(Actor, [body("Gate Walk Runner", OWN, {brawl: 3}), body("Gate Walk Foe", OWN),
    body("Gate Walk Carrier", OWN, {str: 3}), body("Gate Walk Fallen", OWN)]);
  const [tr, tf, tc, tb] = await G.tokens(scene, [{actor: runner, x: 1, y: 2, actorLink: true}, {actor: foe, x: 10, y: 2, actorLink: true},
    {actor: carrier, x: 1, y: 8, actorLink: true}, {actor: fallen, x: 2, y: 8, actorLink: true}]);
  await waitFor(() => [tr, tf, tc, tb].every(t => t?.object), 8000);
  await fallen.toggleStatusEffect("unconscious", {active: true});
  const hx = game.modules.get(IX)?.api?.haul;
  await waitFor(() => hx?.fallenOf?.(tb)?.down, 4000);
  const took = await hx?.take?.(tc, tb, "carry");
  const carried = await waitFor(() => hx?.burdenOf?.(tc)?.mode === "carry", 6000);
  const combat = await G.make(Combat, {scene: scene.id, active: true});
  await combat.createEmbeddedDocuments("Combatant", [tr, tf, tc].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
  await combat.startCombat();
  await waitFor(() => combat.started, 4000);
  globalThis.wodxGateWalk = {G, keep};
  return {scene: scene.id, tr: tr.id, tf: tf.id, tc: tc.id, foe: foe.id, runner: runner.id, combat: combat.id, hurt0: hurt(foe), def,
    carried, took: took ? {ok: took.ok ?? null, why: took.why ?? null} : null};
}

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const C = game.modules.get(CMB)?.api ?? game.wodxCombat;
  const scene = game.scenes.get(ids.scene);
  await scene.view();
  await waitFor(() => canvas.ready && canvas.scene?.id === scene.id && [ids.tr, ids.tf, ids.tc].every(id => scene.tokens.get(id)?.object), 15000);
  await waitFor(() => game.combat?.id === ids.combat && game.combat.started, 6000);
  const g = scene.grid.size;
  const tr = scene.tokens.get(ids.tr), tf = scene.tokens.get(ids.tf), tc = scene.tokens.get(ids.tc);
  const said = [];
  const warn0 = ui.notifications.warn, err0 = ui.notifications.error;
  ui.notifications.warn = (m, ...r) => { said.push(String(m)); return warn0.call(ui.notifications, m, ...r); };
  ui.notifications.error = (m, ...r) => { said.push(String(m)); return err0.call(ui.notifications, m, ...r); };
  try {
    try {
      const x0 = tr.x;
      await tr.update({x: x0 + 14 * g});
      await sleep(1500);
      ok("a. a move past the running speed is stopped", tr.x === x0 && said.some(w => /past their running speed/.test(w)), {x0, x: tr.x, said: said.slice(-2)});
    } catch (e) { ok("a. a move past the running speed is stopped", false, {error: e.message}); }
    try {
      const x0 = tr.x;
      await tr.update({x: x0 + 8 * g});
      const moved = await waitFor(() => tr.x === x0 + 8 * g && n(tr.getFlag(CMB, "moved")?.yards) >= 16, 6000);
      const t0 = Date.now(), h0 = hurt(tf.actor);
      const res = await C.quickAttack({attacker: tr.object, target: tf.object, weaponId: null}).catch(e => ({error: e.message}));
      await sleep(1500);
      const cards = game.messages.contents.filter(m => m.timestamp >= t0 && m.speaker?.actor === ids.runner && m.flags?.[CMB]);
      const refused = said.some(w => /no attack follows/.test(w));
      ok("b. after 16 yards the quick attack does not happen", moved && refused && !cards.length && hurt(tf.actor) === h0 && !(Array.isArray(res) && res.length),
        {moved, yards: tr.getFlag(CMB, "moved")?.yards ?? null, refused, cards: cards.length, hurt: [h0, hurt(tf.actor)], said: said.slice(-2)});
    } catch (e) { ok("b. after 16 yards the quick attack does not happen", false, {error: e.message}); }
    try {
      const x0 = tc.x;
      await tc.update({x: x0 + 8 * g});
      await sleep(1500);
      const held = tc.x === x0;
      await tc.update({x: x0 + 5 * g});
      const went = await waitFor(() => tc.x === x0 + 5 * g, 6000);
      ok("c. carrying, 16 yards is stopped and 10 is not", held && went, {held, went, x0, x: tc.x, said: said.slice(-2)});
    } catch (e) { ok("c. carrying, 16 yards is stopped and 10 is not", false, {error: e.message}); }
  } finally { ui.notifications.warn = warn0; ui.notifications.error = err0; }
  return steps;
}

async function finish(ids, playerSteps = []) {
  const S = globalThis.wodxGateWalk;
  if ( !S ) return "0/1 passed; failed: no setup state on this client";
  const {G, keep} = S;
  try {
    G.ok("1. the default stops moves and attacks", ids.def === "block", {def: ids.def, carried: ids.carried, took: ids.took});
    G.R.steps.push(...(playerSteps ?? []));
    const foe = game.actors.get(ids.foe);
    G.ok("2. the foe is unhurt on the Storyteller's side", hurt(foe) === n(ids.hurt0), {hurt0: ids.hurt0, hurt: hurt(foe)});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [m, k, v] of keep ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting back ${m}.${k}: ${e?.message ?? e}`); } }
    delete globalThis.wodxGateWalk;
  }
  return G.finish();
}
