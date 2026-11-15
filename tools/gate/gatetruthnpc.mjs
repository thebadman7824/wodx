/**
 * Gate (done-claims audit, group 5, B6170-B6174): WoDX NPC, WoDX Voices and WoDX Actions' everyday Banality, through
 * the real trigger paths, asserting the effect.
 *   1. Grieving is a known condition from the start (it must count after a reload, not only after a heartbreak this session)
 *   2. a heartbreak that hurts costs a real Persuade roll one die (B5991): dice before and after, from the roll card
 *   3. a Hostile NPC makes a real Persuade roll harder than a Neutral one (attitude -> social difficulty)
 *   4. a mortal on an UNLINKED token fed on (wodxFed, as WoDX Actions fires it) is Dazed, and the Daze is gone by the next morning
 *   5. in Auto mode an NPC whose best option is a power uses it by itself on its turn (combat hook path): Vitality is spent
 *   6. WoDX Voices speaks a real talk-sheet answer (api.talk.serve "ask"), not a hand-built card
 *   7. a hurt NPC on an UNLINKED token goes to be tended when the fight is deleted (deleteCombat, not afterFight called directly)
 *   8. a hurt NPC (linked) walks to the hospital on the clock in Auto routine mode: the token ends in the hospital region
 *   9. Suggest routines (the default): a guard's beat is listed on the routine card, and Accept walks the token to the stop
 *  10. a changeling standing in a region tagged as an office (the scene itself untagged) counts it at the scene's end
 *      (the call WoDX Actions' wodxEndScene hook makes, so no other module ends its scene)
 *  11. a player's character who unties a prisoner (moving next to them, then the card's button) gains standing in the town
 * Run first after a world reload for step 1. Steps 10 and 11 need a player user to own the characters.
 * Follows tools/gate/kit.mjs: scratch scene and actors, found by name or flag, settings and the clock put back.
 * Result: Data/wodx-gate/gatetruthnpc-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD)?.api;
const A = () => game.wodxActions;
const C = () => game.modules.get("wodx-chronicle")?.api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});
const ROUT = home => ({on: true, blocks: [{from: 0, to: 24, place: home, activity: "rest", when: "any", days: null, feast: "any", label: ""}], roles: {home}});

export async function run() {
  const G = gate("gatetruthnpc", {stepTimeout: 60000});
  const kept = [];
  const keep = async (ns, key, value) => {
    if ( !game.settings.settings.has(`${ns}.${key}`) ) return false;
    kept.push([ns, key, game.settings.get(ns, key)]);
    await game.settings.set(ns, key, value);
    return true;
  };
  const S0 = globalThis.speechSynthesis, realSpeak = S0?.speak;
  try {
    // Before anything this gate does: is Grieving known to WoDX Chronicle's registry? (B6170: WoDX NPC registers it at setup on every client)
    const knownAtStart = !!C()?.conditions?.getCondition?.("grieving");

    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    const kinds = [["Home", "home", 1, 8, 5], ["Hospital", "hospital", 9, 8, 5], ["Watch", "gate", 17, 1, 3], ["Market", "market", 17, 8, 4], ["Office", "office", 21, 1, 3]];
    await sc.createEmbeddedDocuments("Region", kinds.map(([n, k, x, y, w]) => ({name: `Gate T5 ${n}`, color: "#557799",
      shapes: [rect(S, x, y, w, w)], flags: {[MOD]: {place: {kind: k, owner: "", private: false}}, world: {wodxGate: {gate: "gatetruthnpc", run: G.run}}}})));
    const R = n => sc.regions.find(r => r.name === `Gate T5 ${n}`);

    const [pc, listener, beloved, vessel, vamp, projector, foe, talker, hurtU, hurtL] = await G.make(Actor, [
      {name: "Gate T5 Speaker", type: "Mortal", system: {attributes: {charisma: {value: 3}, manipulation: {value: 3}}}},
      {name: "Gate T5 Listener", type: "Mortal"},
      {name: "Gate T5 Beloved", type: "Mortal"},
      {name: "Gate T5 Vessel", type: "Mortal"},
      {name: "Gate T5 Kindred", type: "Vampire"},
      {name: "Gate T5 Projector", type: "Mortal", system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}},
        items: [{name: "Helter Skelter", type: "Power", system: {type: "wod.types.horror", value: 2}}],
        flags: {[MOD]: {behavior: {template: "spirit", aggression: 0.1, power: 5}}}},
      {name: "Gate T5 Foe", type: "Mortal"},
      {name: "Gate T5 Plot NPC", type: "Mortal", flags: {[MOD]: {behavior: {talk: "[work] The mill pays poorly, and late.", noStock: true}}, "wodx-voices": {plot: true}}},
      {name: "Gate T5 Hurt Unlinked", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home").uuid)}}},
      {name: "Gate T5 Hurt Linked", type: "Mortal", flags: {[MOD]: {routine: ROUT(R("Home").uuid)}}}
    ]);
    const [tPc, tListener, tVessel, tProj, tFoe, tTalker, tMe, tHurtU, tHurtL] = await G.tokens(sc, [
      {actor: pc, x: 2, y: 2, actorLink: true}, {actor: listener, x: 3, y: 2, actorLink: true},
      {actor: vessel, x: 6, y: 2, actorLink: false},
      {actor: projector, x: 10, y: 2, actorLink: false, disposition: -1}, {actor: foe, x: 11, y: 2, actorLink: false, disposition: 1},
      {actor: talker, x: 15, y: 2, actorLink: true}, {actor: pc, x: 16, y: 2, actorLink: true},
      {actor: hurtU, x: 2, y: 9, actorLink: false}, {actor: hurtL, x: 3, y: 9, actorLink: true}
    ]);
    const tokObj = d => canvas.tokens.get(d.id);

    /** A real Persuade roll from WoDX Actions' social window (the form given, so no dialog): {dice, diff} from its card. */
    const persuade = async () => {
      const since = Date.now();
      await A().social(pc, tokObj(tListener), "persuade", {bonus: 0, extraDiff: 0, specialty: false, wp: false, aura: false});
      await sleep(300);
      const m = [...game.messages].filter(x => (x.timestamp ?? 0) >= since && String(x.content ?? "").includes(`${pc.name}: persuade`)).at(-1);
      const hit = String(m?.content ?? "").match(/(\d+) dice, diff (\d+)/);
      return hit ? {dice: Number(hit[1]), diff: Number(hit[2])} : null;
    };

    await G.step("1. Grieving is known from the start", async () => {
      G.ok("1. Grieving is known from the start", knownAtStart, {knownAtStart});
    });

    await G.step("2. a heartbreak costs a Persuade roll one die", async () => {
      const before = await persuade();
      await pc.update({"system.advantages.willpower.permanent": 1, "system.advantages.willpower.temporary": 1});
      let sick = false, tries = 0;
      while ( !sick && tries++ < 10 ) {
        await pc.setFlag(MOD, "warmth", {[beloved.id]: {value: 4, at: game.time.worldTime, log: []}});
        await npc().hearts.court(pc, beloved, "betrayal", {why: "gatetruthnpc"});
        sick = pc.statuses?.has?.("wodx-grieving");
      }
      const after = await persuade();
      G.ok("2. a heartbreak costs a Persuade roll one die", sick && !!before && !!after && before.dice - after.dice === 1, {sick, tries, before, after});
      for ( const e of pc.effects.filter(x => x.statuses?.has?.("wodx-grieving")) ) await e.delete();
    });

    await G.step("3. a Hostile NPC makes Persuade harder than a Neutral one", async () => {
      await npc().attitude.apply(listener, pc, {to: 0, why: "gatetruthnpc"});
      const neutral = await persuade();
      await npc().attitude.apply(listener, pc, {to: -2, why: "gatetruthnpc"});
      const hostile = await persuade();
      G.ok("3. a Hostile NPC makes Persuade harder than a Neutral one", !!neutral && !!hostile && hostile.diff > neutral.diff, {neutral, hostile});
    });

    await G.step("4. a fed-on unlinked mortal is Dazed, and wakes by morning", async () => {
      const tv = sc.tokens.get(tVessel.id);
      Hooks.callAll("wodxFed", {by: {uuid: vamp.uuid, name: vamp.name}, vessel: {uuid: tv.actor.uuid, name: tv.name}, drunk: 1, willing: false, fought: false});
      const dazed = await waitFor(() => C()?.conditions?.hasCondition?.(sc.tokens.get(tVessel.id).actor, "dazed"), 5000);
      await game.time.advance(26 * 3600);
      await sleep(2500);
      const still = !!C()?.conditions?.hasCondition?.(sc.tokens.get(tVessel.id).actor, "dazed");
      G.ok("4. a fed-on unlinked mortal is Dazed, and wakes by morning", dazed && !still, {dazed, stillDazedNextDay: still});
    });

    await G.step("5. Auto: an NPC whose best option is a power uses it on its own turn", async () => {
      await keep(MOD, "pickPowers", true);
      const pa = () => sc.tokens.get(tProj.id).actor;
      await pa().update({"system.advantages.vitality.permanent": 6, "system.advantages.vitality.temporary": 5, "system.advantages.spite.permanent": 2, "system.advantages.willpower.temporary": 5});
      await A()?.limits?.clear?.(pa());
      await sc.setFlag(MOD, "mode", "off");
      // Helter Skelter is an obvious power, and an NPC holds an obvious power back while mortals outside the fight watch
      // (B4927, witnessesOf in main.mjs: 30 yards). The gate's other mortals stand within that, so they step out of sight.
      const onlookers = sc.tokens.filter(t => !t.hidden && ![tProj.id, tFoe.id].includes(t.id)).map(t => t.id);
      await sc.updateEmbeddedDocuments("Token", onlookers.map(_id => ({_id, hidden: true})));
      try {
      const [combat] = await G.make(Combat, [{scene: sc.id, active: true}]);
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tProj.id, sceneId: sc.id, actorId: projector.id}, {tokenId: tFoe.id, sceneId: sc.id, actorId: foe.id}]);
      await combat.startCombat();
      await sleep(2000);
      const top = npc().planTurn(tokObj(tProj), combat).options[0];
      const v0 = Number(pa().system?.advantages?.vitality?.temporary);
      await sc.setFlag(MOD, "mode", "auto");
      const since = Date.now();
      // the real path: WoDX NPC takes the turn on updateCombat (main.mjs soon -> takeTurn)
      const other = combat.turns.findIndex(c => c.tokenId === tFoe.id), mine = combat.turns.findIndex(c => c.tokenId === tProj.id);
      await combat.update({turn: other});
      await sleep(400);
      await combat.update({turn: mine});
      const card = await waitFor(() => [...game.messages].some(m => (m.timestamp ?? 0) >= since && m.getFlag(MOD, "plan")?.token === tProj.uuid), 8000);
      await sleep(3000);
      const plan = [...game.messages].filter(m => (m.timestamp ?? 0) >= since && m.getFlag(MOD, "plan")?.token === tProj.uuid).at(-1)?.getFlag(MOD, "plan");
      const v1 = Number(pa().system?.advantages?.vitality?.temporary);
      G.ok("5. Auto: an NPC whose best option is a power uses it on its own turn", top?.action === "power" && card && !!plan?.done && v1 < v0,
        {top: top?.action, card, done: plan?.done?.text ?? null, vitality: [v0, v1], picked: plan?.options?.[0]?.power ?? null,
          why: plan?.options?.[0]?.why ?? null, onlookers: sc.tokens.filter(t => !t.hidden && ![tProj.id, tFoe.id].includes(t.id)).length});
      await sc.setFlag(MOD, "mode", "off");
      await combat.delete();
      } finally {
        await sc.updateEmbeddedDocuments("Token", onlookers.filter(id => sc.tokens.has(id)).map(_id => ({_id, hidden: false})));
      }
    });

    await G.step("6. WoDX Voices speaks a real talk-sheet answer", async () => {
      if ( !game.modules.get("wodx-voices")?.active ) return G.ok("6. WoDX Voices speaks a real talk-sheet answer", false, {error: "WoDX Voices is not active"});
      const spoken = [];
      if ( S0 ) S0.speak = u => spoken.push(u.text);
      for ( const [k, v] of [["enabled", true], ["engine", "browser"], ["who", "plot"], ["mute", false], ["gmHears", true], ["fromToken", false], ["stLines", false]] ) await keep("wodx-voices", k, v);
      await keep(MOD, "talkMenu", true);
      const since = Date.now();
      const r = await npc().talk.serve("ask", {sceneId: sc.id, meTokenId: tMe.id, npcTokenId: tTalker.id, topic: "work"}, game.user.id);
      await sleep(1200);
      const card = [...game.messages].filter(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.talk).at(-1);
      const wrote = /The mill pays poorly/.test(card?.content ?? "");
      G.ok("6. WoDX Voices speaks a real talk-sheet answer", wrote && spoken.some(t => /The mill pays poorly/.test(t)), {served: r?.ok ?? r, wrote, spoken});
      if ( S0 && realSpeak ) S0.speak = realSpeak;
    });

    const hurtFight = async tokDoc => {
      const t = sc.tokens.get(tokDoc.id);
      await game.wodxCombat.setDamage(t.actor, {bashing: 0, lethal: 3, aggravated: 0});
      const [c] = await G.make(Combat, [{scene: sc.id}]);
      await c.createEmbeddedDocuments("Combatant", [{tokenId: t.id, sceneId: sc.id, actorId: t.actorId}]);
      await c.delete(); // the real trigger: deleteCombat (aftercare.mjs hooks)
      await sleep(1500);
    };

    await G.step("7. a hurt unlinked NPC goes to be tended after the fight", async () => {
      await hurtFight(tHurtU);
      const d = game.actors.get(hurtU.id)?.getFlag(MOD, "duties")?.tend ?? sc.tokens.get(tHurtU.id)?.actor?.getFlag(MOD, "duties")?.tend;
      G.ok("7. a hurt unlinked NPC goes to be tended after the fight", d?.place === R("Hospital").uuid, {duty: d ?? null});
    });

    await G.step("8. a hurt NPC walks to the hospital on the clock (Auto routines)", async () => {
      await hurtFight(tHurtL);
      const duty = game.actors.get(hurtL.id)?.getFlag(MOD, "duties")?.tend;
      await sc.setFlag(MOD, "routineMode", "auto");
      await game.time.advance(15 * 60);
      await npc().routines.idle();
      await sleep(4000);
      const inHospital = !!sc.tokens.get(tHurtL.id)?.regions?.has?.(R("Hospital"));
      G.ok("8. a hurt NPC walks to the hospital on the clock (Auto routines)", duty?.place === R("Hospital").uuid && inHospital, {duty: duty ?? null, inHospital,
        at: {x: sc.tokens.get(tHurtL.id)?.x, y: sc.tokens.get(tHurtL.id)?.y}});
      await sc.unsetFlag(MOD, "routineMode");
    });

    await G.step("9. Suggest: a guard's beat is on the routine card, and Accept walks it", async () => {
      await sc.setFlag(MOD, "routineMode", "suggest");
      const [guard] = await G.make(Actor, [{name: "Gate T5 Watchman", type: "Mortal", flags: {[MOD]: {behavior: {template: "guard"},
        routine: {on: true, blocks: [{from: 0, to: 24, place: R("Watch").uuid, activity: "patrol", when: "any", days: null, feast: "any", label: ""}], roles: {}},
        where: {place: R("Watch").uuid, index: 0, activity: "patrol", label: "", since: 0}}}}]);
      const [tg] = await G.tokens(sc, [{actor: guard, x: 18, y: 2, actorLink: true}]);
      await sleep(500);
      // the beat starts a quarter hour past the hour (on the hour a guard is back at the post): set the clock to half past
      const t = game.time.worldTime, delta = ((1800 - (t % 3600)) + 3600) % 3600 || 3600;
      const since = Date.now();
      await game.time.advance(delta);
      await npc().routines.idle();
      await sleep(800);
      const msg = [...game.messages].filter(m => (m.timestamp ?? 0) >= since && m.flags?.[MOD]?.routine?.items?.some?.(i => i.beat && i.tokenId === tg.id)).at(-1);
      const item = msg?.flags?.[MOD]?.routine?.items?.find?.(i => i.beat && i.tokenId === tg.id);
      const listed = !!msg && /the next stop on the beat/.test(msg.content ?? "");
      const stayed = !![...(sc.tokens.get(tg.id)?.regions ?? [])].some(r => r.uuid === R("Watch").uuid);
      if ( msg ) await npc().routines.acceptRoutineCard(msg);
      const there = await waitFor(() => [...(sc.tokens.get(tg.id)?.regions ?? [])].some(r => r.uuid === item?.place), 6000);
      G.ok("9. Suggest: a guard's beat is on the routine card, and Accept walks it", listed && stayed && there,
        {listed, waitedForAccept: stayed, walked: there, stop: item?.place ?? null, at: {x: sc.tokens.get(tg.id)?.x, y: sc.tokens.get(tg.id)?.y}});
      await sc.unsetFlag(MOD, "routineMode");
    });

    const player = game.users.find(u => !u.isGM && u.active) ?? game.users.find(u => !u.isGM);
    await G.step("10. a changeling in an office region counts it at the scene's end", async () => {
      if ( !player ) return G.ok("10. a changeling in an office region counts it at the scene's end", false, {error: "no player user to own the changeling"});
      const [fae] = await G.make(Actor, [{name: "Gate T5 Changeling", type: "Changeling", ownership: {default: 0, [player.id]: 3}}]);
      const [tf] = await G.tokens(sc, [{actor: fae, x: 15, y: 14, actorLink: true}]);
      await sleep(400);
      const tally = () => Number(fae.getFlag("wodx-actions", "banalLife")?.tally) || 0;
      const cardFor = since => [...game.messages].some(m => (m.timestamp ?? 0) >= since && m.flags?.["wodx-actions"]?.banalLife?.actor === fae.uuid);
      // what WoDX Actions' "wodxEndScene" hook calls, without ending the scene for every module (as gate6d does)
      const endScene = () => game.wodxActions.everydayBanality.endScene(sc);
      let since = Date.now();
      await endScene();
      await sleep(1500);
      const outside = {tally: tally(), card: cardFor(since)};
      await sc.tokens.get(tf.id).update({x: 22 * S, y: 2 * S}, {animate: false});
      await waitFor(() => [...(sc.tokens.get(tf.id)?.regions ?? [])].some(r => r.uuid === R("Office").uuid), 4000);
      since = Date.now();
      await endScene();
      await waitFor(() => tally() > outside.tally || cardFor(since), 5000);
      const inside = {tally: tally(), card: cardFor(since)};
      G.ok("10. a changeling in an office region counts it at the scene's end", outside.tally === 0 && !outside.card && (inside.tally > 0 || inside.card), {outside, inside,
        sceneKind: sc.flags?.[MOD]?.place?.kind ?? null});
    });

    await G.step("11. untying a prisoner is a deed: standing in the town rises", async () => {
      if ( !player ) return G.ok("11. untying a prisoner is a deed: standing in the town rises", false, {error: "no player user to own the rescuer"});
      await keep("wodx-storyteller", "rumours", foundry.utils.deepClone(game.settings.settings.has("wodx-storyteller.rumours") ? game.settings.get("wodx-storyteller", "rumours") : []));
      const [hero, held] = await G.make(Actor, [{name: "Gate T5 Rescuer", type: "Mortal", ownership: {default: 0, [player.id]: 3}}, {name: "Gate T5 Prisoner", type: "Mortal"}]);
      const [th, tp] = await G.tokens(sc, [{actor: hero, x: 10, y: 15, actorLink: true}, {actor: held, x: 7, y: 14, actorLink: false}]);
      await tp.setFlag(MOD, "prisoner", {since: game.time.worldTime, at: "the gate", by: "the gate"});
      const before = (await npc().standing.of(hero, "town"))?.value ?? 0;
      const since = Date.now();
      await sc.tokens.get(th.id).update({x: 8 * S, y: 14 * S}, {animate: false});
      const offered = await waitFor(() => [...game.messages].some(m => (m.timestamp ?? 0) >= since && String(m.content ?? "").includes(`data-wnpc-untie="${tp.uuid}"`)), 5000);
      const m = [...game.messages].filter(x => (x.timestamp ?? 0) >= since && String(x.content ?? "").includes(`data-wnpc-untie="${tp.uuid}"`)).at(-1);
      let how = "button";
      const btn = m ? document.querySelector(`[data-message-id="${m.id}"] [data-wnpc-untie]`) : null;
      if ( btn ) btn.click();
      else if ( m ) { // the chat log may not have drawn it: the same call the button makes, with the card's own data
        how = "card data";
        const el = new DOMParser().parseFromString(m.content, "text/html").querySelector("[data-wnpc-untie]");
        await npc().carryGoals.freePrisoner(fromUuidSync(el.dataset.wnpcUntie), el.dataset.by, el.dataset.rescuer || null);
      }
      await waitFor(async () => ((await npc().standing.of(hero, "town"))?.value ?? 0) > before, 5000);
      const after = (await npc().standing.of(hero, "town"))?.value ?? 0;
      const tale = (game.modules.get("wodx-storyteller")?.api?.rumours?.about?.(hero.id) ?? []).length;
      G.ok("11. untying a prisoner is a deed: standing in the town rises", offered && !sc.tokens.get(tp.id)?.flags?.[MOD]?.prisoner && after > before,
        {offered, how, standing: [before, after], tales: tale, deeds: hero.getFlag(MOD, "deeds")?.length ?? 0});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    if ( S0 && realSpeak ) S0.speak = realSpeak;
    for ( const [ns, key, v] of kept.reverse() ) { try { await game.settings.set(ns, key, v); } catch (e) { G.R.notes.push(`setting ${ns}.${key}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
