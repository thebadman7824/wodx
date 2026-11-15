/**
 * Gate: NPCs of the other lines choose their own powers (B5670-B5679), on a testbed lane.
 *   1. the api
 *   2. a mummy offers Sahu-Ra (a Hekau spell) to attack; no ritual is offered
 *   3. a demon offers Fist of Air (an evocation) to attack
 *   4. a Kuei-jin offers Blood Atemi (a Chi art) to attack, and nothing read as a Kindred Discipline
 *   5. an Orpheus projector offers Helter Skelter (a Horror) to attack
 *   6. an inquisitor offers I Exult in Thee (a Blessing) to attack
 *   7. a changeling of the modern nights offers Creeping Shadows (a cantrip) to attack
 *   8. a modern mage offers a saved rote that harms
 *   9. a Dark Ages Hermetic offers Wrath of Apollo; a Dark Ages fae offers its written cantrip
 *  10. the demon uses Fist of Air by itself on the target: a roll card from the demon names it
 *  11. the projector uses Helter Skelter by itself: a card names it and Vitality is spent
 *  12. a real NPC turn in Auto (B6172): a projector whose best option is a power, its turn reached by a combat turn
 *      change (WoDX NPC's updateCombat hook), uses Helter Skelter with no Accept; the plan card says done, Vitality is spent
 * Result: Data/wodx-gate/gatenpclines-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatenpclines", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  const kept = [];
  try {
    await G.step("1. the api", async () => {
      G.ok("1. the api", typeof A?.npcPowers === "function" && typeof A?.autoPower === "function");
    });
    if ( !A?.npcPowers ) return;
    const scene = await G.scene({name: "WoDX gate: npc lines"});
    const pw = (name, type, value, extra = {}) => ({name, type: "Power", system: {type: `wod.types.${type}`, value, ...extra}});
    const [mummy, demon, kote, orph, inq, fae, mage, damage, dafae, victim] = await G.make(Actor, [
      {name: "Gate Lines Mummy", type: "Mummy", items: [pw("Celestial", "hekau", 3), pw("Necromancy", "hekau", 2)]},
      {name: "Gate Lines Demon", type: "Demon", items: [pw("Lore of the Winds", "lore", 2)]},
      {name: "Gate Lines Kuei-jin", type: "Vampire", system: {settings: {variant: "kindredeast"}}, items: [pw("Blood Shintai", "discipline", 2)]},
      {name: "Gate Lines Projector", type: "Mortal", system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}}, items: [pw("Helter Skelter", "horror", 2)]},
      {name: "Gate Lines Inquisitor", type: "Hunter", items: [{name: "I Exult in Thee", type: "Power", system: {type: "wod.types.power", value: 1}}]},
      {name: "Gate Lines Changeling", type: "Changeling", items: [pw("Autumn", "art", 2)]},
      {name: "Gate Lines Mage", type: "Mage", items: [{name: "Gate Bolt", type: "Rote", system: {forces: 2}, flags: {[MOD]: {rote: {keywords: ["harm"], spheres: {forces: 2}}}}}]},
      {name: "Gate Lines Hermetic", type: "Mage"},
      {name: "Gate Lines Fae", type: "Changeling"},
      {name: "Gate Lines Victim", type: "Mortal"}]);
    await mummy.update({"system.advantages.sekhem.permanent": 5, "system.advantages.sekhem.temporary": 5});
    await demon.update({"system.advantages.faith.permanent": 5, "system.advantages.faith.temporary": 5});
    await kote.update({"system.advantages.yinchi.temporary": 5, "system.advantages.yangchi.temporary": 5, "system.advantages.demonchi.temporary": 5, "system.advantages.willpower.temporary": 5});
    await orph.update({"system.advantages.vitality.permanent": 6, "system.advantages.vitality.temporary": 5, "system.advantages.spite.permanent": 2, "system.advantages.willpower.temporary": 5});
    await inq.update({"system.advantages.conviction.permanent": 4, "system.advantages.conviction.temporary": 4});
    await inq.setFlag(MOD, "inquisitor", {conviction: 4});
    await fae.update({"system.advantages.glamour.permanent": 5, "system.advantages.glamour.temporary": 5});
    await fae.setFlag(MOD, "c20", {arts: {autumn: 2}, realms: {actor: 3}});
    await fae.setFlag(MOD, "daFae", {system: "c20"});
    await mage.update({"system.spheres.forces.value": 3, "system.arete.value": 3});
    await mage.setFlag(MOD, "daMage", {system: "m20"});
    await damage.setFlag(MOD, "daMage", {fellowship: "hermes", foundation: 3, pillars: {primus: 5, vires: 4, anima: 2, corona: 1}, twilight: {temp: 0, perm: 0}});
    await dafae.setFlag(MOD, "daFae", {origin: "changeling", mists: {temp: 5, perm: 5}, weaving: {temp: 5, perm: 5}, dominions: {night: 2}, cantrips: [{dominion: "night", level: 1, name: "Gate Thorn", trait: "manipulation", kw: ["harm"]}]});
    const [dt, ot, vt] = await G.tokens(scene, [{actor: demon, x: 4, y: 4}, {actor: orph, x: 4, y: 6}, {actor: victim, x: 5, y: 5}]);
    const offers = a => { try { return A.npcPowers(a) ?? []; } catch (e) { return [{error: String(e?.message ?? e)}]; } };
    const has = (a, use, test) => { const p = offers(a); return {ok: p.some(x => x.use === use && test(x) && (x.uses ?? []).includes("attack")), p}; };
    const show = p => p.slice(0, 12).map(x => x.error ?? `${x.use}:${x.name}:${(x.uses ?? []).join("/")}`);

    for (const [label, a, use, test, extra] of [
      ["2. a mummy offers Sahu-Ra to attack; no ritual", mummy, "useHekau", x => x.value === "sahu-ra", p => !p.some(x => x.use === "useHekau" && /ritual/i.test(x.name))],
      ["3. a demon offers Fist of Air to attack", demon, "useEvocation", x => x.name === "Fist of Air"],
      ["4. a Kuei-jin offers Blood Atemi, no Kindred Disciplines", kote, "useChiArt", x => x.name === "Blood Atemi", p => !p.some(x => x.use === "useDiscipline")],
      ["5. a projector offers Helter Skelter", orph, "useHorror", x => x.id === "helterskelter"],
      ["6. an inquisitor offers I Exult in Thee", inq, "useBlessing", x => x.value === "exult-z"],
      ["7. a changeling offers Creeping Shadows", fae, "useCantrip", x => x.value === "creeping-shadows"],
      ["8. a modern mage offers a saved rote that harms", mage, "useEffect", x => x.name === "Gate Bolt"]]) {
      await G.step(label, async () => {
        const r = has(a, use, test);
        G.ok(label, r.ok && (!extra || extra(r.p)), {offers: show(r.p)});
      });
    }

    await G.step("9. Dark Ages: Wrath of Apollo and the fae's written cantrip", async () => {
      const m = has(damage, "useDaSpell", x => x.name === "Wrath of Apollo"), f = has(dafae, "useFaeCantrip", x => x.name === "Gate Thorn");
      G.ok("9. Dark Ages: Wrath of Apollo and the fae's written cantrip", m.ok && f.ok, {mage: show(m.p), fae: show(f.p)});
    });

    const aim = on => vt.object?.setTarget?.(on, {releaseOthers: true, groupSelection: false});
    const cardFrom = (a, since, name) => game.messages.contents.some(m => m.timestamp >= since && (m.speaker?.actor === a.id || m.speaker?.token) && String(m.content ?? "").includes(name));
    await G.step("10. the demon uses Fist of Air by itself", async () => {
      const body = scene.tokens.get(dt.id)?.actor ?? demon;
      await A.limits?.clear?.(body);
      const pick = offers(body).find(x => x.name === "Fist of Air");
      const since = Date.now();
      aim(true);
      await A.autoPower(body, pick, {target: vt.object});
      const seen = await waitFor(() => cardFrom(body, since, "Fist of Air"), 8000);
      aim(false);
      G.ok("10. the demon uses Fist of Air by itself", !!pick && !!seen, {pick: pick?.name});
    });

    await G.step("11. the projector uses Helter Skelter by itself, spending Vitality", async () => {
      const body = () => scene.tokens.get(ot.id)?.actor ?? orph;
      await A.limits?.clear?.(body());
      const v0 = Number(body().system?.advantages?.vitality?.temporary);
      const pick = offers(body()).find(x => x.id === "helterskelter");
      const since = Date.now();
      aim(true);
      await A.autoPower(body(), pick, {target: vt.object});
      const seen = await waitFor(() => cardFrom(body(), since, "Helter Skelter"), 8000);
      aim(false);
      const v1 = Number(body().system?.advantages?.vitality?.temporary);
      G.ok("11. the projector uses Helter Skelter by itself, spending Vitality", !!pick && !!seen && v1 < v0, {pick: pick?.name, vitality: [v0, v1]});
    });

    await G.step("12. Auto: a projector uses its power on its own turn", async () => {
      const N = game.modules.get("wodx-npc")?.api;
      if ( !N?.planTurn ) return G.ok("12. Auto: a projector uses its power on its own turn", false, {error: "WoDX NPC is not active"});
      if ( game.settings.settings.has("wodx-npc.pickPowers") ) { kept.push(["pickPowers", game.settings.get("wodx-npc", "pickPowers")]); await game.settings.set("wodx-npc", "pickPowers", true); }
      const [auto, foe] = await G.make(Actor, [
        {name: "Gate Lines Auto Projector", type: "Mortal", system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}}, items: [pw("Helter Skelter", "horror", 2)],
          flags: {"wodx-npc": {behavior: {template: "spirit", aggression: 0.1, power: 5}}}},
        {name: "Gate Lines Auto Foe", type: "Mortal"}]);
      await auto.update({"system.advantages.vitality.permanent": 6, "system.advantages.vitality.temporary": 5, "system.advantages.spite.permanent": 2, "system.advantages.willpower.temporary": 5});
      await A.limits?.clear?.(auto);
      const [ta, tf] = await G.tokens(scene, [{actor: auto, x: 12, y: 4, actorLink: true, disposition: -1}, {actor: foe, x: 13, y: 4, actorLink: true, disposition: 1}]);
      await scene.setFlag("wodx-npc", "mode", "off");
      const [combat] = await G.make(Combat, [{scene: scene.id, active: true}]);
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: ta.id, sceneId: scene.id, actorId: auto.id}, {tokenId: tf.id, sceneId: scene.id, actorId: foe.id}]);
      await combat.startCombat();
      await new Promise(r => setTimeout(r, 2000));
      const top = N.planTurn(canvas.tokens.get(ta.id), combat).options[0];
      const v0 = Number(auto.system?.advantages?.vitality?.temporary);
      await scene.setFlag("wodx-npc", "mode", "auto");
      const since = Date.now();
      const plans = () => [...game.messages].filter(m => (m.timestamp ?? 0) >= since && m.getFlag("wodx-npc", "plan")?.token === ta.uuid);
      // the turn passes to the foe and back: WoDX NPC takes the projector's turn on updateCombat, as in play
      await combat.update({turn: combat.turns.findIndex(c => c.tokenId === tf.id)});
      await new Promise(r => setTimeout(r, 400));
      await combat.update({turn: combat.turns.findIndex(c => c.tokenId === ta.id)});
      await waitFor(() => plans().some(m => m.getFlag("wodx-npc", "plan")?.done), 10000);
      await waitFor(() => Number(auto.system?.advantages?.vitality?.temporary) < v0, 6000);
      const plan = plans().at(-1)?.getFlag("wodx-npc", "plan");
      const v1 = Number(auto.system?.advantages?.vitality?.temporary);
      G.ok("12. Auto: a projector uses its power on its own turn", top?.action === "power" && plan?.options?.[plan?.done?.k]?.power === "Helter Skelter" && v1 < v0,
        {top: top?.action ?? null, picked: plan?.options?.[plan?.done?.k]?.power ?? null, done: plan?.done?.text ?? null, vitality: [v0, v1]});
      await scene.unsetFlag("wodx-npc", "mode");
      await combat.delete();
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  } finally {
    for ( const [k, v] of kept ) { try { await game.settings.set("wodx-npc", k, v); } catch (e) { G.R.notes.push(`setting ${k}: ${e?.message ?? e}`); } }
  }
  return G.finish();
}
