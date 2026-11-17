/**
 * WoDX Combat gate: standing up from a knockdown (B3921, B6151), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateknockdown.mjs?${Date.now()}`)).run()
 * Makes its own scene, actors, tokens and fight and removes them; fixes the d10 faces while it runs and puts them
 * back; puts back the setting it touches; never moves the clock.
 *   1. the setting is there and on
 *   2. a knocked-down character's turn comes round (the updateCombat hook, as Next turn does): with every die an 8
 *      they roll, get up (the status goes) and the card is posted
 *   3. a character who is not knocked down gets no roll when their turn comes round
 *   4. with every die a 2 the roll fails: they stay down and their quick attack does not land (the foe is unhurt)
 * Result: Data/wodx-gate/gateknockdown-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CMB = "wodx-combat";
const n = v => Number(v) || 0;
const body = (name, {dex = 3, athletics = 2, brawl = 2} = {}) => ({name, type: "Mortal", ownership: {default: 3},
  system: {attributes: {dexterity: {value: dex, total: dex}, wits: {value: 2, total: 2}, strength: {value: 2, total: 2}, stamina: {value: 2, total: 2}},
    abilities: {athletics: {value: athletics}, brawl: {value: brawl}}}});
const hurt = a => n(a?.system?.health?.damage?.bashing) + n(a?.system?.health?.damage?.lethal) + n(a?.system?.health?.damage?.aggravated);

export async function run() {
  const G = gate("gateknockdown", {stepTimeout: 45000});
  const uniform0 = CONFIG.Dice.randomUniform;
  const was = [];
  const dice = async face => {
    for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
      CONFIG.Dice.randomUniform = () => u;
      if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
    }
    throw new Error(`could not fix the dice to ${face}`);
  };
  try {
    for ( const [k, v] of [["standUpRoll", true], ["statusEffects", true], ["autoApply", true]] ) {
      try { was.push([k, game.settings.get(CMB, k)]); await game.settings.set(CMB, k, v); } catch (e) { G.R.notes.push(`setting ${k}: ${e?.message ?? e}`); }
    }
    const C = game.wodxCombat ?? game.modules.get(CMB)?.api;
    const K = game.modules.get("wodx-chronicle")?.api?.conditions;
    const scene = await G.scene({name: "WoDX gate: knockdown"});
    const [a, foe] = await G.make(Actor, [body("Gate Fallen Fighter"), body("Gate Fallen Foe", {athletics: 0})]);
    const [ta, tf] = await G.tokens(scene, [{actor: a, x: 2, y: 2, actorLink: true}, {actor: foe, x: 3, y: 2, actorLink: true}]);
    await waitFor(() => ta?.object && tf?.object, 8000);
    const combat = await G.make(Combat, {scene: scene.id, active: true});
    await combat.createEmbeddedDocuments("Combatant", [ta, tf].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
    await dice(5);
    await combat.startCombat();
    await waitFor(() => combat.started, 4000);
    const toTurnOf = async actor => {
      const idx = () => combat.turns.findIndex(c => c.actorId === actor.id);
      if ( combat.turn === idx() ) await combat.update({turn: (idx() + 1) % combat.turns.length});
      await combat.update({turn: idx()});
    };
    const cards = t0 => game.messages.contents.filter(m => m.timestamp >= t0 && /tries to stand/.test(m.content ?? "") && m.speaker?.actor === a.id);

    await G.step("1. the setting is on", async () => {
      let on = null;
      try { on = game.settings.get(CMB, "standUpRoll"); } catch (e) { on = null; }
      G.ok("1. the setting is on", on === true && !!K?.setCondition, {on});
    });

    await G.step("2. on their turn they roll and stand", async () => {
      await dice(8);
      await C.markFollow(a, {name: "Knocked down", condition: "knockdown", lasts: "turn"});
      const down = await waitFor(() => K.hasCondition(a, "knockdown"), 4000);
      const t0 = Date.now();
      await toTurnOf(a);
      const rolled = await waitFor(() => cards(t0).length > 0, 8000);
      const up = await waitFor(() => !K.hasCondition(a, "knockdown"), 4000);
      G.ok("2. on their turn they roll and stand", down && rolled && up, {down, rolled, up});
    });

    await G.step("3. not knocked down: no roll", async () => {
      const t0 = Date.now();
      await toTurnOf(a);
      await new Promise(r => setTimeout(r, 1500));
      G.ok("3. not knocked down: no roll", cards(t0).length === 0, {cards: cards(t0).length});
    });

    await G.step("4. a failed roll keeps them down and spends the action", async () => {
      await dice(2);
      await C.markFollow(a, {name: "Knocked down", condition: "knockdown", lasts: "turn"});
      await waitFor(() => K.hasCondition(a, "knockdown"), 4000);
      const t0 = Date.now();
      await toTurnOf(a);
      const rolled = await waitFor(() => cards(t0).length > 0, 8000);
      await waitFor(() => !!a.getFlag(CMB, "lostAction"), 4000);
      await dice(8);
      const before = hurt(foe);
      const res = await C.quickAttack({attacker: ta.object, target: tf.object});
      await new Promise(r => setTimeout(r, 800));
      const struck = (res ?? []).filter(Boolean).length > 0;
      G.ok("4. a failed roll keeps them down and spends the action", rolled && K.hasCondition(a, "knockdown") && !struck && hurt(foe) === before,
        {rolled, down: K.hasCondition(a, "knockdown"), struck, foeBefore: before, foeAfter: hurt(foe)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    CONFIG.Dice.randomUniform = uniform0;
    for ( const [k, v] of was ) { try { await game.settings.set(CMB, k, v); } catch (e) { G.R.notes.push(`setting back ${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
