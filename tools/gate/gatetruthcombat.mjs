/**
 * WoDX Combat truth gate (B6151-B6154), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetruthcombat.mjs?${Date.now()}`)).run()
 * Every step goes through the path play uses (the updateCombat hook on a turn change, Foundry's own nextTurn and
 * nextRound, quickAttack, a token move, a condition switched off) and checks the number the claim is about.
 * Makes its own scene, actors, tokens and fight and removes them; fixes the d10 faces while it runs and puts them back;
 * puts back every setting it touches; never moves the clock.
 *   1. B6151 a failed stand-up (the roll on the fallen character's turn) keeps them down, and their quick attack
 *      does not happen: the foe's health is untouched
 *   2. B6151 the knockdown lasts past the end of the next turn (two new rounds, every roll failed: still down)
 *   3. B6151 a stand-up with Initiative rolled only at the start: up, Initiative 2 lower on the next turn, back after
 *   4. B6151 the same with Initiative rolled every turn: the next turn's roll is 2 lower than d10 + Dexterity + Wits
 *   5. B6152 full defence (WoDX NPC's flag): the token's own quick attack does not happen; its two defences (the best
 *      the sheet allows: a block against a fist, at the same pool as a dodge) are the full pool and then one die less
 *   6. B6153 a pistol with no Ability on its sheet rolls Dexterity + Firearms, not Archery
 *   7. B6153 Numbing: three more health levels, the same after a wound taken while it lasts, back when it ends
 *   8. B6154 with the turn conductor off, Foundry's Next on the round's last turn gives a declared extra action its
 *      turn in the same round, and the next Next starts the new round
 *   9. moving past half the running speed: the attack warns that no attack follows by the book (GM, limit shown)
 *  10. B6361 a quick attack on a vehicle on its own sheet (a cart's token): the card says the vehicle itself is struck,
 *      and the Structure it names as lost (levels less Durability) is what the sheet holds after the blow
 * Result: Data/wodx-gate/gatetruthcombat-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CMB = "wodx-combat";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const n = v => Number(v) || 0;
const OWNED = {default: 3}; // every player owns the gate's people, so WoDX NPC's fight AI leaves their turns alone
const person = (name, {str = 2, dex = 2, sta = 2, wits = 2, per = 2, athletics = 0, brawl = 0, melee = 0, firearms = 0} = {}) => ({name, type: "Mortal", ownership: OWNED,
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: dex, total: dex}, stamina: {value: sta, total: sta},
    wits: {value: wits, total: wits}, perception: {value: per, total: per}},
    abilities: {athletics: {value: athletics}, brawl: {value: brawl}, melee: {value: melee}, firearms: {value: firearms}}}});
const hurt = a => n(a?.system?.health?.damage?.bashing) + n(a?.system?.health?.damage?.lethal) + n(a?.system?.health?.damage?.aggravated);

export async function run() {
  const G = gate("gatetruthcombat", {stepTimeout: 60000});
  if ( G.notLive() ) return "Not on the Live world.";
  const uniform0 = CONFIG.Dice.randomUniform;
  const touched = [[CMB, "autoApply", true], [CMB, "standUpRoll", true], [CMB, "autoInitiative", "start"], [CMB, "statusEffects", true],
    [CMB, "turnConductor", "off"], [CMB, "movementLimit", "note"], [CMB, "turnMoves", "off"],
    [CMB, "vehicleCombat", true]];
  const was = [];
  const dice = async face => {
    for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
      CONFIG.Dice.randomUniform = () => u;
      if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
    }
    throw new Error(`could not fix the dice to ${face}`);
  };
  try {
    for ( const [m, k, v] of touched ) {
      try { was.push([m, k, game.settings.get(m, k)]); await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); }
    }
    const C = game.modules.get(CMB)?.api ?? game.wodxCombat, K = game.modules.get("wodx-chronicle")?.api?.conditions;
    const scene = await G.scene({name: "WoDX gate: truth combat"});
    const [fallen, foe, guard, shooter, mover] = await G.make(Actor, [
      person("Gate TC Fallen", {dex: 3, wits: 2, athletics: 2, brawl: 3}),
      person("Gate TC Foe", {str: 2, dex: 3, wits: 2, athletics: 2, brawl: 2}),
      person("Gate TC Guard", {str: 3, dex: 2, wits: 1, brawl: 3}),
      person("Gate TC Shooter", {dex: 3, wits: 1, firearms: 3}),
      person("Gate TC Mover", {str: 3, dex: 2, wits: 1, brawl: 2})]);
    await shooter.createEmbeddedDocuments("Item", [{name: "Gate TC pistol", type: "Ranged Weapon",
      system: {isequipped: true, difficulty: 6, range: 20, damage: {bonus: 4, type: "lethal"}, attack: {attribute: "dexterity", ability: ""}}}]);
    const [tF, tFoe, tG, tS, tM] = await G.tokens(scene, [
      {actor: fallen, x: 2, y: 2, actorLink: true}, {actor: foe, x: 3, y: 2, actorLink: true}, {actor: guard, x: 4, y: 2, actorLink: true},
      {actor: shooter, x: 2, y: 8, actorLink: true}, {actor: mover, x: 10, y: 10, actorLink: true}]);
    await waitFor(() => [tF, tFoe, tG, tS, tM].every(t => t?.object), 8000);

    const combat = await G.make(Combat, {scene: scene.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [tF, tFoe, tG, tS, tM].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
    await waitFor(() => game.combat?.id === combat.id, 4000);
    await dice(5);
    await combat.startCombat();
    await waitFor(() => combat.combatants.every(c => c.initiative !== null && c.initiative !== undefined), 10000);
    const cOf = actor => combat.combatants.find(c => c.actorId === actor.id);
    const initOf = actor => Math.floor(n(cOf(actor)?.initiative));
    const toTurnOf = async actor => {
      const idx = () => combat.turns.findIndex(c => c.actorId === actor.id);
      if ( combat.turn === idx() ) await combat.update({turn: (idx() + 1) % combat.turns.length});
      await combat.update({turn: idx()});
    };
    // B6485: a turn of theirs that has not started yet this round. B6436 rolls the stand-up once per knockdown per
    // turn, so stepping off and back onto a turn whose roll already ran (step 2's new rounds, when the fallen
    // character won the Initiative tie and holds the first turn) is rightly not a new try; a new round is
    const freshTurnOf = async actor => {
      const idx = () => combat.turns.findIndex(c => c.actorId === actor.id);
      if ( Number.isInteger(combat.turn) && combat.turn >= idx() ) {
        const r = combat.round;
        await combat.nextRound();
        await waitFor(() => combat.round === r + 1, 6000);
      }
      if ( combat.turn !== idx() ) await combat.update({turn: idx()});
    };
    const standCards = t0 => game.messages.contents.filter(m => m.timestamp >= t0 && /tries to stand/.test(m.content ?? "") && m.speaker?.actor === fallen.id);
    const knock = async () => { await C.markFollow(fallen, {name: "Knocked down", condition: "knockdown", lasts: "turn"}); return waitFor(() => K.hasCondition(fallen, "knockdown"), 4000); };

    await G.step("1. B6151 a failed stand-up loses the action", async () => {
      await dice(2);
      const down = await knock();
      const t0 = Date.now();
      await toTurnOf(fallen);
      const rolled = await waitFor(() => standCards(t0).length > 0, 8000);
      await waitFor(() => !!fallen.getFlag(CMB, "lostAction"), 4000);
      await dice(8);
      const before = hurt(foe);
      const results = await C.quickAttack({attacker: tF.object, target: tFoe.object});
      await sleep(800);
      const struck = (results ?? []).filter(Boolean).length > 0;
      G.ok("1. B6151 a failed stand-up loses the action", down && rolled && K.hasCondition(fallen, "knockdown") && !struck && hurt(foe) === before,
        {down, rolled, stillDown: K.hasCondition(fallen, "knockdown"), struck, foeBefore: before, foeAfter: hurt(foe), lost: fallen.getFlag(CMB, "lostAction")});
    });

    await G.step("2. B6151 the knockdown lasts until they stand", async () => {
      await dice(2);
      const r0 = combat.round;
      await combat.nextRound();
      await waitFor(() => combat.round === r0 + 1, 6000);
      await combat.nextRound();
      await waitFor(() => combat.round === r0 + 2, 6000);
      await sleep(1500); // the timed sweep runs on the round change
      G.ok("2. B6151 the knockdown lasts until they stand", combat.round === r0 + 2 && K.hasCondition(fallen, "knockdown"),
        {round: combat.round, r0, down: K.hasCondition(fallen, "knockdown")});
    });

    await G.step("3. B6151 standing costs 2 Initiative next turn with Initiative rolled once", async () => {
      await game.settings.set(CMB, "autoInitiative", "start");
      await dice(8);
      if ( !K.hasCondition(fallen, "knockdown") ) await knock();
      const t0 = Date.now();
      await freshTurnOf(fallen);
      await waitFor(() => standCards(t0).length > 0, 8000);
      const up = await waitFor(() => !K.hasCondition(fallen, "knockdown"), 4000);
      const init0 = initOf(fallen), r0 = combat.round;
      await combat.nextRound();
      const lower = await waitFor(() => combat.round === r0 + 1 && initOf(fallen) === init0 - 2, 8000);
      const during = initOf(fallen);
      await combat.nextRound();
      const back = await waitFor(() => combat.round === r0 + 2 && initOf(fallen) === init0, 8000);
      G.ok("3. B6151 standing costs 2 Initiative next turn with Initiative rolled once", up && lower && back,
        {up, init0, during, after: initOf(fallen)});
    });

    await G.step("4. B6151 standing costs 2 on the next roll with Initiative rolled each turn", async () => {
      await game.settings.set(CMB, "autoInitiative", "round");
      await dice(8);
      await knock();
      const t0 = Date.now();
      await toTurnOf(fallen);
      await waitFor(() => standCards(t0).length > 0, 8000);
      const up = await waitFor(() => !K.hasCondition(fallen, "knockdown"), 4000);
      const r0 = combat.round;
      await combat.nextRound();
      const rerolled = await waitFor(() => combat.round === r0 + 1 && initOf(foe) === 8 + 3 + 2, 10000);
      await sleep(500);
      G.ok("4. B6151 standing costs 2 on the next roll with Initiative rolled each turn", up && rerolled && initOf(fallen) === 8 + 3 + 2 - 2,
        {up, rerolled, fallen: initOf(fallen), want: 11, foe: initOf(foe)});
      await game.settings.set(CMB, "autoInitiative", "start");
    });

    await G.step("5. B6152 full defence: no attack of its own, full dodge then one die less", async () => {
      await dice(8);
      // WoDX NPC's own "Full defence" option (execute, as Auto or Accept runs it) writes the flag Combat reads; the flag
      // by hand only when WoDX NPC is off
      const N = game.modules.get("wodx-npc")?.api;
      const viaNpc = !!(N?.execute && await N.execute(tFoe.object, {action: "defend", label: "Full defence", why: "gate"}).catch(() => null));
      if ( !viaNpc ) await tFoe.setFlag("wodx-npc", "fullDefense", `${combat.id}:${combat.round}`);
      await waitFor(() => tFoe.getFlag("wodx-npc", "fullDefense") === `${combat.id}:${combat.round}`, 3000);
      const before = hurt(guard);
      const own = await C.quickAttack({attacker: tFoe.object, target: tG.object});
      const struck = (own ?? []).filter(Boolean).length > 0;
      // The guard's blows are not applied: the guard stands at the foe's flank (+1 die), so the first blow lands, and a
      // wound's penalty would take a second die off the next defence. The defence pool alone is what this step reads
      await game.settings.set(CMB, "autoApply", false);
      let a1, a2;
      try {
        [a1] = await C.quickAttack({attacker: tG.object, target: tFoe.object});
        [a2] = await C.quickAttack({attacker: tG.object, target: tFoe.object});
      } finally { await game.settings.set(CMB, "autoApply", true); }
      const d1 = n(a1?.defense?.dice), d2 = n(a2?.defense?.dice);
      const full = n(foe.system.attributes.dexterity.total) + 2; // Dexterity + Athletics or Brawl, both 2
      const note = /full defence/i.test(a1?.message ? game.messages.get(a1.message.id)?.content ?? "" : "");
      G.ok("5. B6152 full defence: no attack of its own, full dodge then one die less", !struck && hurt(guard) === before && d1 === full && d2 === d1 - 1 && note,
        {viaNpc, flag: tFoe.getFlag("wodx-npc", "fullDefense") ?? null, struck, guardBefore: before, guardAfter: hurt(guard), full, d1, d2, note, types: [a1?.defense?.type, a2?.defense?.type], foeHurt: hurt(foe)});
    });

    await G.step("6. B6153 a pistol with no Ability rolls Firearms", async () => {
      const plan = C.bestAttack(shooter, guard, {}, {attackerTok: tS, targetTok: tG, ignoreDistance: true});
      const p = plan.plans.find(x => x.w?.name === "Gate TC pistol");
      G.ok("6. B6153 a pistol with no Ability rolls Firearms", !!p?.valid && n(p.atkDice) === 3 + 3,
        {atkDice: p?.atkDice ?? null, valid: p?.valid ?? null, why: p?.why ?? null, ability: p?.w?.ability ?? null, want: 6});
    });

    await G.step("7. B6153 Numbing: three more levels, back when it ends", async () => {
      const [numb] = await G.make(Actor, [person("Gate TC Numb", {sta: 3})]);
      const max = () => n(numb.system?.traits?.health?.totalhealthlevels?.max);
      const base = max();
      await K.setCondition(numb, "numbing", true);
      const longer = await waitFor(() => max() === base + 3, 6000);
      await C.applyDamage(numb, "bashing", 1, {status: false});
      await sleep(1500);
      const during = max();
      await K.setCondition(numb, "numbing", false);
      const back = await waitFor(() => max() === base && n(numb.toObject().system?.health?.bruised?.total) === n(numb.toObject().system?.health?.bruised?.value), 8000);
      G.ok("7. B6153 Numbing: three more levels, back when it ends", longer && during === base + 3 && back,
        {base, longer, during, after: max(), stored: numb.toObject().system?.health?.bruised});
    });

    await G.step("8. B6154 the extra-action pass with the conductor off", async () => {
      await game.settings.set(CMB, "turnConductor", "off");
      if ( K.hasCondition(fallen, "knockdown") ) await K.setCondition(fallen, "knockdown", false);
      const cF = cOf(fallen);
      await C.conductor.declareExtra(combat, cF, 1);
      await combat.update({turn: combat.turns.length - 1});
      const r0 = combat.round;
      await combat.nextTurn();
      const extra = await waitFor(() => combat.round === r0 && combat.combatant?.id === cF.id, 6000);
      const phase = combat.getFlag(CMB, "conductor")?.phase ?? null;
      await combat.nextTurn();
      const next = await waitFor(() => combat.round === r0 + 1, 6000);
      G.ok("8. B6154 the extra-action pass with the conductor off", extra && phase === "extra" && next,
        {extra, phase, round: combat.round, r0, current: combat.combatant?.name ?? null});
    });

    await G.step("9. an attack after moving past half the running speed warns", async () => {
      await dice(8);
      const warned = [];
      const warn0 = ui.notifications.warn;
      ui.notifications.warn = (msg, ...rest) => { warned.push(String(msg)); return warn0.call(ui.notifications, msg, ...rest); };
      try {
        const lim = C.movementFor(mover);
        // nine squares along the row: 15 yards or more on any unit, past half the running speed (13 at Dexterity 2)
        await tM.update({x: tM.x - 9 * scene.grid.size});
        await waitFor(() => n(tM.getFlag(CMB, "moved")?.yards) > n(lim.attackAfter), 4000);
        const yards = n(tM.getFlag(CMB, "moved")?.yards);
        const [res] = await C.quickAttack({attacker: tM.object, target: tG.object, weaponId: null}).catch(() => []);
        const said = warned.some(w => /no attack follows/.test(w));
        G.ok("9. an attack after moving past half the running speed warns", yards > n(lim.attackAfter) && said,
          {yards, attackAfter: lim.attackAfter, said, warned: warned.slice(-2), attacked: !!res});
      } finally { ui.notifications.warn = warn0; }
    });

    await G.step("10. a quick attack on a vehicle's token comes off its sheet's Structure", async () => {
      await dice(8);
      const [cart] = await G.make(Actor, [{name: "Gate TC Cart", type: "wodx-interactables.vehicle", system: {kind: "cart", built: 1800}}]);
      const [tV] = await G.tokens(scene, [{actor: cart, x: 5, y: 2, actorLink: true}]);
      await waitFor(() => tV?.object, 6000);
      const t0 = Date.now(), lost0 = n(cart.system.lost);
      const [res] = await C.quickAttack({attacker: tG.object, target: tV.object, weaponId: null}).catch(() => []);
      const struck = await waitFor(() => n(cart.system.lost) > lost0, 8000);
      const card = game.messages.contents.filter(m => m.timestamp >= t0 && m.speaker?.actor === guard.id).pop();
      const txt = String(card?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const m = txt.match(/takes it: (\d+) levels? against Durability (\d+): (\d+) off its Structure \((\d+) of (\d+) lost\)/);
      const said = /itself is struck/.test(txt);
      const want = m ? Math.min(n(m[5]), lost0 + Math.max(0, n(m[1]) - n(m[2]))) : null;
      G.ok("10. a quick attack on a vehicle's token comes off its sheet's Structure", !!res && struck && said && !!m && n(m[4]) === n(cart.system.lost) && n(m[4]) === want,
        {lost: cart.system.lost, card: m ? m.slice(1) : txt.slice(0, 300), said, want, levels: res?.outcome?.levels ?? null});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    CONFIG.Dice.randomUniform = uniform0;
    for ( const [m, k, v] of was ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting back ${m}.${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
