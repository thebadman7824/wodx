/**
 * WoDX Combat: a player's attack and damage reach the Storyteller's listeners (B6150). Two browsers, rothenstein-wodx:
 *   node tools/harness/gate-two.mjs gatetruthrelay [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's fighter, a bearer of a
 *            burning sheath (WoDX Actions' touchHarm, as Witch's Nimbus leaves) and a fight; fixes the Storyteller's
 *            d10s to 2 (so the burn is not soaked) and counts the two hooks as they fire on this client
 *   "player" (Player Test): fixes the player's d10s to 8, then
 *     a. a quick attack with fists on the bearer (rolled on the player's client)
 *     b. 2 lethal applied to the player's own fighter through soakAndApply (applied on the player's client)
 *   "finish" (Gamemaster Test):
 *     1. the attack fired wodxAttackRolled once on the Storyteller's client, and the bearer's sheath burned the
 *        player's fighter there: its health is 2 lethal worse than before the attack, besides step b
 *     2. the damage fired wodxDamageApplied once on the Storyteller's client, relayed, for the player's fighter
 *   then puts the dice and every setting back and removes what it made.
 * Result: Data/wodx-gate/gatetruthrelay-result.json. The clock never moves.
 */
import {gate, waitFor} from "./kit.mjs";

const CMB = "wodx-combat";
const PLAYER = "Player Test";
const n = v => Number(v) || 0;
const lethal = a => n(a?.system?.health?.damage?.lethal);
const fixDice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return true;
  }
  return false;
};

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const G = gate("gatetruthrelay", {stepTimeout: 45000});
  const keep = {autoApply: game.settings.get(CMB, "autoApply"), turnMoves: game.settings.get(CMB, "turnMoves"), uniform: CONFIG.Dice.randomUniform};
  await game.settings.set(CMB, "autoApply", true);
  await game.settings.set(CMB, "turnMoves", "off");
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await G.scene({name: "WoDX gate: truth relay", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  const [fighter, bearer] = await G.make(Actor, [
    {name: "Gate Relay Fighter", type: "Mortal", ownership: OWN, system: {attributes: {strength: {value: 3}, dexterity: {value: 4}, stamina: {value: 1}}, abilities: {brawl: {value: 3}}}},
    // owned by the player too, so WoDX NPC's fight AI leaves its turn alone
    {name: "Gate Relay Bearer", type: "Mortal", ownership: OWN, system: {attributes: {dexterity: {value: 1}, stamina: {value: 1}}}}]);
  await bearer.createEmbeddedDocuments("ActiveEffect", [{name: "Gate Relay burning sheath", img: "icons/svg/fire.svg",
    flags: {"wodx-actions": {touchHarm: {levels: 2, type: "lethal"}}}}]);
  const [tf, tb] = await G.tokens(scene, [{actor: fighter, x: 2, y: 2, actorLink: true}, {actor: bearer, x: 3, y: 2, actorLink: true}]);
  await waitFor(() => tf?.object && tb?.object, 8000);
  const combat = await G.make(Combat, {scene: scene.id, active: true});
  await combat.createEmbeddedDocuments("Combatant", [tf, tb].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
  await combat.startCombat();
  await fixDice(2);
  const seen = {attack: [], damage: []};
  const hooks = [
    Hooks.on("wodxAttackRolled", (a, d = {}) => { if ( a?.id === fighter.id ) seen.attack.push({relayed: !!d.relayed, hit: !!d.hit, target: d.target?.id ?? null}); }),
    Hooks.on("wodxDamageApplied", (a, d = {}) => { if ( a?.id === fighter.id ) seen.damage.push({relayed: !!d.relayed, levels: n(d.levels), type: d.type ?? null}); })];
  globalThis.wodxGateRelay = {G, keep, seen, hooks};
  return {scene: scene.id, fighter: fighter.id, bearer: bearer.id, tf: tf.id, tb: tb.id, combat: combat.id, lethal0: lethal(fighter)};
}

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const C = game.modules.get(CMB)?.api ?? game.wodxCombat;
  const uniform0 = CONFIG.Dice.randomUniform;
  try {
    const scene = game.scenes.get(ids.scene);
    await scene.view();
    await waitFor(() => canvas.ready && canvas.scene?.id === scene.id && scene.tokens.get(ids.tf)?.object && scene.tokens.get(ids.tb)?.object, 15000);
    await fixDice(8);
    const tf = scene.tokens.get(ids.tf).object, tb = scene.tokens.get(ids.tb).object;
    try {
      const [res] = await C.quickAttack({attacker: tf, target: tb, weaponId: "unarmed:punch"});
      ok("a. the player's quick attack hits", !!res && !!res?.attack && n(res?.outcome?.levels) >= 0 && (n(res?.attack?.successes) > n(res?.defense?.successes ?? 0)),
        {atk: res?.attack?.successes ?? null, def: res?.defense?.successes ?? null});
    } catch (e) { ok("a. the player's quick attack hits", false, {error: e.message}); }
    await new Promise(r => setTimeout(r, 4000)); // the Storyteller's client burns the attacker
    try {
      const r = await C.soakAndApply(tf, {mode: "levels", amount: 2, type: "lethal", soak: false, apply: true});
      ok("b. the player applies 2 lethal to their own fighter", r !== null && r !== undefined, {levels: r?.levels ?? null});
    } catch (e) { ok("b. the player applies 2 lethal to their own fighter", false, {error: e.message}); }
    await new Promise(r => setTimeout(r, 3000));
  } finally { CONFIG.Dice.randomUniform = uniform0; }
  return steps;
}

async function finish(ids, playerSteps = []) {
  const S = globalThis.wodxGateRelay;
  if ( !S ) return "0/1 passed; failed: no setup state on this client";
  const {G, keep, seen, hooks} = S;
  try {
    G.R.steps.push(...(playerSteps ?? []));
    const fighter = game.actors.get(ids.fighter);
    await waitFor(() => lethal(fighter) >= n(ids.lethal0) + 4, 6000);
    const atk = seen.attack;
    G.ok("1. the player's attack fires once on the Storyteller's client and the sheath burns them", atk.length === 1 && atk[0].relayed && atk[0].hit
      && atk[0].target === ids.bearer && lethal(fighter) === n(ids.lethal0) + 2 + 2,
      {fired: atk, lethal0: ids.lethal0, lethal: lethal(fighter), want: n(ids.lethal0) + 4});
    const dmg = seen.damage.filter(d => d.relayed && d.levels === 2 && d.type === "lethal");
    G.ok("2. the player's damage fires once on the Storyteller's client", dmg.length === 1, {fired: seen.damage});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [h, id] of [["wodxAttackRolled", hooks[0]], ["wodxDamageApplied", hooks[1]]] ) Hooks.off(h, id);
    CONFIG.Dice.randomUniform = keep.uniform;
    for ( const k of ["autoApply", "turnMoves"] ) { try { await game.settings.set(CMB, k, keep[k]); } catch (e) { G.R.notes.push(`setting back ${k}: ${e?.message ?? e}`); } }
    delete globalThis.wodxGateRelay;
  }
  return G.finish();
}
