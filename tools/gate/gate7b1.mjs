/**
 * Gate 7b.1 (the turn conductor, WoDX Combat 3.7), in Foundry (rothenstein-wodx) as a Gamemaster, after gate 7b:
 *   await (await import(`/wodx-gate/gate7b1.mjs?${Date.now()}`)).run()
 * Uses gate 7b's arena. Uses gate 7b's fight if one is there; otherwise it makes its own fight on the arena and deletes
 * that fight (only the one it made) at the end. Unpauses the game for the run and pauses it again after if it was
 * paused; puts the conductor setting, its countdowns and the scene's NPC mode back as they were.
 * Result: Data/wodx-gate/gate7b1-result.json.
 */
const atLeast = (v, min) => { const a = String(v ?? "0").split(".").map(Number), b = min.split(".").map(Number); for ( let k = 0; k < 3; k++ ) { if ( (a[k] || 0) !== (b[k] || 0) ) return (a[k] || 0) > (b[k] || 0); } return true; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-combat", NPC = "wodx-npc";
const C = () => game.wodxCombat, CD = () => game.wodxCombat.conductor, npc = () => game.modules.get(NPC).api;
const zero = {bashing: 0, lethal: 0, aggravated: 0};

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gate7b1-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function waitFor(test, ms = 15000) { const t0 = Date.now(); while ( Date.now() - t0 < ms ) { if ( await test() ) return true; await sleep(250); } return false; }

async function runGate(K) {
  const R = {started: new Date().toISOString(), steps: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  const before = {level: game.settings.get(MOD, "turnConductor"), grace: game.settings.get(MOD, "conductorGrace"), timer: game.settings.get(MOD, "conductorTimer"),
    pause: game.settings.get(MOD, "conductorNpcPause"), paused: game.paused, scene: canvas.scene};
  const sc = game.scenes.find(s => s.getFlag(NPC, "gateArena"));
  let combat = game.combats.find(c => c.getFlag(NPC, "gateFight") && c.scene?.id === sc?.id), made = null;
  let T = {};
  const curName = () => combat.combatant?.name;
  const toTurn = async tok => { await combat.update({turn: combat.turns.findIndex(c => c.tokenId === tok.id)}); await sleep(400); };

  // The conductor may be in the middle of moving the fight on (an NPC that has just acted, a new round with new Initiative):
  // it is switched off and the fight left to come to rest before a step places the turn by hand.
  const settle = async () => {
    await game.settings.set(MOD, "turnConductor", "off");
    for ( let n = 0; n < 10; n++ ) { const k = `${combat.round}:${combat.turn}`; await sleep(1500); if ( k === `${combat.round}:${combat.turn}` ) return; }
  };

  // A hard blow in an earlier step can leave the hero dazed (no action next turn, by the rules), and the conductor then rightly passes the
  // hero's turn over. The steps that need the hero to act take such states off first, and say which they found.
  const NO_ACTION = ["dazed", "incapacitated", "torpor", "staked", "immobilized"];
  const fit = async tok => { const cd = game.modules.get("wodx-chronicle")?.api?.conditions, had = NO_ACTION.filter(id => cd?.hasCondition?.(tok.actor, id));
    for ( const id of had ) await cd.setCondition(tok.actor, id, false);
    await C().setDamage(tok.actor, zero); return had; };

  await step("versions, and gate 7b's arena", async () => {
    if ( sc && canvas.scene?.id !== sc.id ) { const r = new Promise(q => Hooks.once("canvasReady", q)); await sc.view(); await r; await sleep(600); }
    for ( const role of ["hero", "fighter", "runner"] ) {
      // the arena may hold more than one token marked with a role (older test figures): the one that is in the fight is meant
      const marked = canvas.tokens.placeables.filter(t => t.document.getFlag(NPC, "gateRole") === role);
      T[role] = marked.find(t => combat?.combatants.some(c => c.tokenId === t.id)) ?? marked[0];
    }
    // No fight left from gate 7b: make one on the arena with the three gate tokens, marked so it is cleaned up after
    if ( !combat && sc && T.hero && T.fighter && T.runner ) {
      made = combat = await Combat.create({scene: sc.id, active: true, flags: {[NPC]: {gateFight: true, gate7b1Made: true}}});
      await combat.createEmbeddedDocuments("Combatant", ["hero", "fighter", "runner"].map(r => ({tokenId: T[r].id, sceneId: sc.id, actorId: T[r].actor.id})));
      await combat.rollAll?.();
      await combat.startCombat(); await sleep(2500);
      R.notes.push(`made its own fight ${combat.id}`);
    } else if ( combat && !combat.started ) { await combat.startCombat(); await sleep(2500); }
    ok("versions, and gate 7b's arena", atLeast(C()?.version, "3.7.0") && !!CD() && atLeast(npc()?.version, "0.1.3") && !!sc && !!combat && T.hero && T.fighter && T.runner,
      {combat: C()?.version, npc: npc()?.version, arena: sc?.name, fight: combat?.id, tokens: Object.keys(T).filter(k => T[k])});
    if ( game.paused ) game.togglePause(false, {broadcast: true});
    await game.settings.set(MOD, "conductorNpcPause", 1);
    await game.settings.set(MOD, "conductorGrace", 2);
    await game.settings.set(MOD, "conductorTimer", 0);
    await sc.setFlag(NPC, "mode", "auto");
    for ( const t of Object.values(T) ) await C().setDamage(t.actor, zero);
    await combat.activate?.();
  });

  await step("NPC turns: an NPC acts on Auto and the turn moves on by itself; a player's turn waits for the player", async () => {
    await game.settings.set(MOD, "turnConductor", "npc");
    await combat.setFlag(MOD, "conductor", {});
    // From before the new round: an NPC first in the order acts at once
    const t0 = Date.now();
    await combat.nextRound(); await sleep(2500);
    const firstNpc = combat.turns.find(c => !c.actor?.hasPlayerOwner);
    await combat.update({turn: combat.turns.indexOf(firstNpc)});
    const moved = await waitFor(() => combat.combatant?.id !== firstNpc.id, 20000);
    const card = game.messages.contents.find(m => m.timestamp >= t0 && m.getFlag(NPC, "plan")?.combatant === firstNpc.id);
    // Run on to the hero: the conductor stops there at this level
    const reachedHero = await waitFor(() => combat.combatant?.tokenId === T.hero.id || combat.round > (card?.getFlag(NPC, "plan")?.round ?? combat.round), 30000);
    await sleep(2000);
    if ( combat.combatant?.tokenId === T.hero.id ) await waitFor(() => !!CD().state().why, 3000);
    const heroWaits = combat.combatant?.tokenId === T.hero.id ? /players'/.test(CD().state().why ?? "") : null;
    ok("NPC turns: an NPC acts on Auto and the turn moves on by itself; a player's turn waits for the player", moved && !!card?.getFlag(NPC, "plan")?.done && (heroWaits ?? true),
      {npc: firstNpc.name, moved, did: card?.getFlag(NPC, "plan")?.done?.text ?? null, nowTurn: curName(), why: CD().state().why ?? null, reachedHero,
       cards: game.messages.contents.filter(m => m.timestamp >= t0 && m.getFlag(NPC, "plan")).map(m => { const p = m.getFlag(NPC, "plan"); return {who: p.combatant, mode: p.mode, done: p.done?.text ?? null, options: (p.options ?? []).map(o => o.kind ?? o.type ?? o.label)}; })});
  });

  await step("Everyone: the hero's action is spent, a countdown, then the turn ends with no click", async () => {
    // Every time the fight is moved on during this step, what the conductor knew at that moment is written down (who, its reason, its counters)
    const moves = [], w0 = Date.now(), own = {};
    const note = how => { const c = CD().state(), cc = combat.combatant; moves.push({ms: Date.now() - w0, how, from: cc?.name, round: combat.round, level: game.settings.get(MOD, "turnConductor"),
      why: c.why ?? null, key: c.key ?? null, sameTurn: c.combatantId === cc?.id, actions: c.actions, spent: c.actionSpent, grace: c.graceEndsAt ? c.graceEndsAt - Date.now() : null, timer: c.timerEndsAt ? c.timerEndsAt - Date.now() : null,
      npcDone: c.npcDone, held: !!cc?.getFlag(MOD, "held"), owner: !!cc?.actor?.hasPlayerOwner, defeated: !!cc?.isDefeated}); };
    for ( const k of ["nextTurn", "nextRound"] ) { own[k] = Object.hasOwn(combat, k) ? combat[k] : null; const f = combat[k].bind(combat); combat[k] = (...a) => { note(k); return f(...a); }; }
    try {
    await settle();
    const cleared = await fit(T.hero);
    await toTurn(T.hero);
    // A longer grace for this step, and a hook that sees the countdown even if it starts and ends between two looks
    await game.settings.set(MOD, "conductorGrace", 4);
    // What the step starts from is written down, so a failure says why: who has the turn, a hold left over, harm, the conductor's own reason
    const heroC = combat.combatants.find(c => c.tokenId === T.hero.id);
    const heldBefore = !!heroC?.getFlag(MOD, "held");
    if ( heldBefore ) await heroC.unsetFlag(MOD, "held");
    await game.settings.set(MOD, "turnConductor", "everyone"); await sleep(1500);
    if ( combat.combatant?.id !== heroC?.id ) { await settle(); await toTurn(T.hero); await game.settings.set(MOD, "turnConductor", "everyone"); await sleep(1500); }
    const id = combat.combatant?.id, t0 = Date.now(), log = [];
    const dmg = a => { const d = a?.system?.health?.damage ?? {}; return (Number(d.bashing) || 0) + (Number(d.lethal) || 0) + (Number(d.aggravated) || 0); };
    const start = {turn: curName(), isHero: id === heroC?.id, owner: !!heroC?.actor?.hasPlayerOwner, heldBefore, damage: dmg(heroC?.actor), defeated: !!heroC?.isDefeated, why: CD().state().why ?? null};
    let sawCount = false;
    const hk = Hooks.on("updateCombat", (c, ch) => { if ( c.id !== combat.id ) return;
      if ( c.getFlag(MOD, "conductor")?.graceEndsAt ) sawCount = true;
      if ( "turn" in ch || "round" in ch ) log.push({ms: Date.now() - t0, turn: c.combatant?.name, round: c.round, why: CD().state().why ?? null}); });
    try {
      let attack = null;
      try { const r = await C().quickAttack({attacker: T.hero, target: T.fighter}); attack = r == null ? "nothing came back" : "done"; } catch (e) { attack = `failed: ${e.message}`; }
      const attackMs = Date.now() - t0;
      const counting = await waitFor(() => sawCount || !!combat.getFlag(MOD, "conductor")?.graceEndsAt, 8000);
      const whyMid = CD().state().why ?? null, flagMid = combat.getFlag(MOD, "conductor") ?? null;
      const ended = await waitFor(() => combat.combatant?.id !== id, 20000);
      ok("Everyone: the hero's action is spent, a countdown, then the turn ends with no click", counting && ended,
        {counting, ended, nowTurn: curName(), start, attack, attackMs, whyMid, flagMid, log, moves, cleared, t0: t0 - w0, grace: game.settings.get(MOD, "conductorGrace")});
    } finally { Hooks.off("updateCombat", hk); }
    } finally { for ( const k of ["nextTurn", "nextRound"] ) { if ( own[k] ) combat[k] = own[k]; else delete combat[k]; } }
    await game.settings.set(MOD, "conductorGrace", 2);
    await game.settings.set(MOD, "turnConductor", "npc"); await sleep(600);
    for ( const t of Object.values(T) ) await C().setDamage(t.actor, zero);
  });

  await step("the time limit: no action in time, the action is held; Act next puts the hero straight after the current turn", async () => {
    await settle();
    await fit(T.hero);
    // The hero first in the order: a hold on the last turn of a round is lost at once (VtDA20 p. 344)
    const top = Math.max(...combat.combatants.map(c => Number(c.initiative) || 0)) + 5;
    await combat.setInitiative(combat.combatants.find(c => c.tokenId === T.hero.id).id, top); await sleep(300);
    // The time limit and the conductor go on first, then the turn moves to the hero, so the limit starts with the turn
    await toTurn(T.fighter);
    await game.settings.set(MOD, "conductorTimer", 3);
    await game.settings.set(MOD, "turnConductor", "everyone"); await sleep(300);
    const heroC = combat.combatants.find(c => c.tokenId === T.hero.id);
    let sawHeld = false;
    const hk = Hooks.on("updateCombatant", c => { if ( c.id === heroC.id && c.getFlag(MOD, "held") ) sawHeld = true; });
    let held;
    try {
      await toTurn(T.hero);
      held = await waitFor(() => (sawHeld || !!heroC.getFlag(MOD, "held")) && combat.combatant?.id !== heroC.id, 20000);
    } finally { Hooks.off("updateCombatant", hk); }
    const why4 = {heldFlag: !!heroC.getFlag(MOD, "held"), turnNow: curName(), why: CD().state().why ?? null};
    await game.settings.set(MOD, "turnConductor", "off"); await sleep(500);
    const curC = combat.combatant;
    await CD().stepIn(combat, combat.combatants.get(heroC.id));
    await sleep(800);
    const order = combat.turns.map(c => c.id), after = order.indexOf(heroC.id) === order.indexOf(curC.id) + 1;
    ok("the time limit: no action in time, the action is held; Act next puts the hero straight after the current turn", held && after && combat.combatant?.id === curC.id && !heroC.getFlag(MOD, "held"),
      {held, after, current: curC.name, order: combat.turns.map(c => c.name), ...why4});
    await game.settings.set(MOD, "conductorTimer", 0);
  });

  await step("a held action still held at the turn's end is lost", async () => {
    const heroC = combat.combatants.find(c => c.tokenId === T.hero.id);
    await heroC.setFlag(MOD, "held", {combatId: combat.id, round: combat.round});
    await combat.update({turn: combat.turns.length - 1}); await sleep(400);
    const round = combat.round;
    await CD().advance(combat);
    await waitFor(() => combat.round > round, 6000);
    ok("a held action still held at the turn's end is lost", combat.round === round + 1 && !heroC.getFlag(MOD, "held"), {round: combat.round});
  });

  await step("extra actions: a second pass at the end of the turn, in Initiative order, then the next turn", async () => {
    const heroC = combat.combatants.find(c => c.tokenId === T.hero.id);
    await CD().declareExtra(combat, heroC, 1);
    await combat.update({turn: combat.turns.length - 1}); await sleep(400);
    const round = combat.round;
    await CD().advance(combat); await sleep(800);
    const f = combat.getFlag(MOD, "conductor");
    const inPass = f?.phase === "extra" && combat.combatant?.id === heroC.id && combat.round === round;
    await CD().advance(combat);
    await waitFor(() => combat.round > round, 6000);
    ok("extra actions: a second pass at the end of the turn, in Initiative order, then the next turn", inPass && combat.round === round + 1 && combat.getFlag(MOD, "conductor")?.phase !== "extra",
      {inPass, queue: f?.queue ?? null, round: combat.round});
  });

  await step("Step back undoes a turn", async () => {
    const t = combat.turn;
    await combat.update({turn: Math.min(combat.turns.length - 1, (t ?? 0) + 1)}); await sleep(300);
    const t1 = combat.turn;
    CD().request("back"); await sleep(1200);
    ok("Step back undoes a turn", combat.turn === t1 - 1 || (t1 === 0 && combat.round >= 1),
      {from: t1, to: combat.turn});
  });

  await step("paused: nothing advances", async () => {
    await game.settings.set(MOD, "turnConductor", "npc");
    game.togglePause(true, {broadcast: true});
    const npcC = combat.turns.find(c => !c.actor?.hasPlayerOwner);
    await combat.update({turn: combat.turns.indexOf(npcC)});
    await sleep(6000);
    const still = combat.combatant?.id === npcC.id;
    ok("paused: nothing advances", still, {turn: curName(), why: CD().state().why ?? null});
  });

  // Put things back
  await game.settings.set(MOD, "turnConductor", before.level);
  await game.settings.set(MOD, "conductorGrace", before.grace);
  await game.settings.set(MOD, "conductorTimer", before.timer);
  await game.settings.set(MOD, "conductorNpcPause", before.pause);
  await sc?.unsetFlag(NPC, "mode");
  for ( const t of Object.values(T) ) if ( t?.actor ) await C().setDamage(t.actor, zero);
  if ( game.paused !== before.paused ) game.togglePause(before.paused, {broadcast: true});
  if ( made ) { try { await made.delete(); R.notes.push(`deleted the fight it made, ${made.id}`); } catch (e) { R.notes.push(`could not delete its fight ${made.id}: ${e.message}`); } }
  if ( before.scene && before.scene.id !== canvas.scene?.id ) await before.scene.view();
  return save(R);
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gate7b1", runGate);
