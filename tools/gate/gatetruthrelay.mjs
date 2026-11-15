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
 *     c. a pistol shot at a listener with heightened senses and no Willpower (B6377)
 *     d. a punch on a fomor with Tar Skin (B6377)
 *   "finish" (Gamemaster Test):
 *     1. the attack fired wodxAttackRolled once on the Storyteller's client, and the bearer's sheath burned the
 *        player's fighter there: its health is 2 lethal worse than before the attack, besides step b
 *     2. the damage fired wodxDamageApplied once on the Storyteller's client, relayed, for the player's fighter
 *     3. the fighter swore an oath of clasped hands to the bearer: the attack puts "breaks an oath" in the Storyteller's
 *        approval queue (WoDX Actions' oath listener, which acts on the Storyteller's client only)
 *     4. the player's gunshot overwhelms the listener's heightened senses on the Storyteller's client: Dazed on the token
 *        (WoDX Senses' overload, which acts on the Storyteller's client only)
 *     5. the player's blow on the fomor sticks the fighter to its tar skin: Held on the fighter (WoDX Actions' fomor
 *        blow powers, Storyteller's client only)
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
  // B6377: a listener with heightened senses and no Willpower to hold, and a fomor whose tar skin catches bare hands
  const [listener, fomor] = await G.make(Actor, [
    {name: "Gate Relay Listener", type: "Mortal", system: {attributes: {dexterity: {value: 1}, stamina: {value: 3}}}},
    {name: "Gate Relay Fomor", type: "Mortal", system: {attributes: {dexterity: {value: 1}, stamina: {value: 3}}},
      items: [{name: "Tar Skin", type: "Power", system: {type: "wod.types.power", value: 1}}]}]);
  await listener.update({"system.advantages.willpower.permanent": 0, "system.advantages.willpower.temporary": 0, "flags.wodx-senses.sight": "heightened"});
  await fighter.createEmbeddedDocuments("Item", [{name: "Gate Relay pistol", type: "Ranged Weapon", system: {isequipped: true, difficulty: 6, range: 20,
    damage: {attribute: "", bonus: 4, type: "lethal"}, attack: {attribute: "dexterity", ability: "firearms"}, clip: {value: 6, max: 6}}}]);
  await bearer.createEmbeddedDocuments("ActiveEffect", [{name: "Gate Relay burning sheath", img: "icons/svg/fire.svg",
    flags: {"wodx-actions": {touchHarm: {levels: 2, type: "lethal"}}}}]);
  const [tf, tb, tl, tm] = await G.tokens(scene, [{actor: fighter, x: 2, y: 2, actorLink: true}, {actor: bearer, x: 3, y: 2, actorLink: true},
    {actor: listener, x: 6, y: 2, actorLink: true}, {actor: fomor, x: 2, y: 3, actorLink: true}]);
  await waitFor(() => tf?.object && tb?.object && tl?.object && tm?.object, 8000);
  const combat = await G.make(Combat, {scene: scene.id, active: true});
  await combat.createEmbeddedDocuments("Combatant", [tf, tb].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
  await combat.startCombat();
  // B6374: the fighter swore an oath of clasped hands with the bearer, so the attack should go to the Storyteller to break it
  await fighter.setFlag("wodx-actions", "c20oaths", [{kind: "clasped", parties: [bearer.name], terms: "WoDX gate: never to raise a hand against the bearer"}]);
  await fixDice(2);
  const seen = {attack: [], damage: []};
  const hooks = [
    Hooks.on("wodxAttackRolled", (a, d = {}) => { if ( a?.id === fighter.id ) seen.attack.push({relayed: !!d.relayed, hit: !!d.hit, target: d.target?.id ?? null}); }),
    Hooks.on("wodxDamageApplied", (a, d = {}) => { if ( a?.id === fighter.id ) seen.damage.push({relayed: !!d.relayed, levels: n(d.levels), type: d.type ?? null}); })];
  globalThis.wodxGateRelay = {G, keep, seen, hooks};
  return {scene: scene.id, fighter: fighter.id, bearer: bearer.id, listener: listener.id, fomor: fomor.id, tf: tf.id, tb: tb.id, tl: tl.id, tm: tm.id,
    pistol: fighter.items.find(i => i.name === "Gate Relay pistol")?.id ?? null, combat: combat.id, lethal0: lethal(fighter)};
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
    // B6377: a gunshot by the player, then a bare-handed blow on a fomor; both act only on the Storyteller's client
    const tl = scene.tokens.get(ids.tl)?.object, tm = scene.tokens.get(ids.tm)?.object;
    try {
      const [res] = await C.quickAttack({attacker: tf, target: tl, weaponId: ids.pistol});
      ok("c. the player fires a pistol at the listener", !!res?.attack, {weapon: res?.weapon?.name ?? null, atk: res?.attack?.successes ?? null});
    } catch (e) { ok("c. the player fires a pistol at the listener", false, {error: e.message}); }
    await new Promise(r => setTimeout(r, 3000));
    try {
      const [res] = await C.quickAttack({attacker: tf, target: tm, weaponId: "unarmed:punch"});
      ok("d. the player punches the fomor and hits", !!res?.attack && n(res?.attack?.successes) > n(res?.defense?.successes ?? 0),
        {atk: res?.attack?.successes ?? null, def: res?.defense?.successes ?? null});
    } catch (e) { ok("d. the player punches the fomor and hits", false, {error: e.message}); }
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
    const atk = seen.attack.filter(x => x.target === ids.bearer);
    G.ok("1. the player's attack fires once on the Storyteller's client and the sheath burns them", atk.length === 1 && atk[0].relayed && atk[0].hit
      && atk[0].target === ids.bearer && lethal(fighter) === n(ids.lethal0) + 2 + 2,
      {fired: atk, lethal0: ids.lethal0, lethal: lethal(fighter), want: n(ids.lethal0) + 4});
    const dmg = seen.damage.filter(d => d.relayed && d.levels === 2 && d.type === "lethal");
    G.ok("2. the player's damage fires once on the Storyteller's client", dmg.length === 1, {fired: seen.damage});
    // 3. the oath: the relayed attack reaches WoDX Actions' oath listener on this client, which asks the Storyteller
    const key = `oath:${ids.fighter}:0`;
    const ap = () => game.modules.get("wodx-chronicle")?.api?.approvals;
    const asked = await waitFor(() => [...(ap()?.pending?.() ?? []), ...(ap()?.history?.() ?? [])].some(e => e.key === key), 6000);
    G.ok("3. the player's attack on someone an oath protects asks the Storyteller", !!asked, {key});
    // 4. B6377: the gunshot, relayed, reaches WoDX Senses' overload: no Willpower to hold, so the listener is Dazed
    const listener = game.actors.get(ids.listener);
    const dazed = await waitFor(() => listener?.statuses?.has?.("wodx-dazed"), 6000);
    G.ok("4. the player's gunshot overwhelms heightened senses: Dazed", !!dazed && seen.attack.some(x => x.target === ids.listener && x.relayed),
      {statuses: [...(listener?.statuses ?? [])], fired: seen.attack.filter(x => x.target === ids.listener)});
    // 5. B6377: the punch on the fomor, relayed, reaches its blow powers: Tar Skin holds the fighter fast
    const held = await waitFor(() => fighter.statuses?.has?.("wodx-held"), 6000);
    const card = game.messages.contents.slice(-15).some(m => /Fomor flesh/.test(m.content ?? "") && /tar skin/i.test(m.content ?? ""));
    G.ok("5. the player's blow on the fomor triggers its tar skin: the fighter is Held", !!held && card,
      {statuses: [...(fighter.statuses ?? [])], card, fired: seen.attack.filter(x => x.target === ids.fomor)});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [h, id] of [["wodxAttackRolled", hooks[0]], ["wodxDamageApplied", hooks[1]]] ) Hooks.off(h, id);
    CONFIG.Dice.randomUniform = keep.uniform;
    for ( const k of ["autoApply", "turnMoves"] ) { try { await game.settings.set(CMB, k, keep[k]); } catch (e) { G.R.notes.push(`setting back ${k}: ${e?.message ?? e}`); } }
    delete globalThis.wodxGateRelay;
  }
  return G.finish();
}
