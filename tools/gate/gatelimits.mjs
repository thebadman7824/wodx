/**
 * WoDX Actions and WoDX NPC gate: how often a power may be used, Drained, and NPCs choosing their own powers
 * (B4920-B4927), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelimits.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene and actors and removes them; the scene count is put back at the end and the clock is
 * never moved.
 *   1. the limits api is up and the scene count is a number
 *   2. a once-a-scene Gift (Might of Thor) is refused after one use, with its page, and free again in a new scene
 *   3. Dementation bars only the victim it was used on tonight; another victim is free
 *   4. a fifth-level power: once a scene by the house rule, and its user is Drained (+1 difficulty) until the scene ends
 *   5. a power window greys out the used power and says why
 *   6. an NPC's powers carry uses (attack, hold, ...) and whether they show
 *   7. the NPC's choice: an obvious power waits while mortals watch, and is used when the NPC is cornered
 *   8. the NPC rolls its chosen power by itself: a card in chat, no window left open
 *   9. after-costs: Blinding Spittle's blindness ends and Blurred sight follows for the scene
 *  10. after-costs: Survivor wears off and its werewolf falls Asleep (the token dimmed)
 *  11. after-costs: Inspire left no lasting effect, so the scene's end takes the mortal's Willpower dot
 *  12. Strengthening the Demon: Demon Chi rises two a success, and the stoked points fade when it ends (B5161)
 *  13. a fomor's Numbing: three more health levels and no wound penalty; when it ends past Incapacitated, death (B5162)
 * Result: Data/wodx-gate/gatelimits-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatelimits");
  const A = game.modules.get(MOD)?.api;
  const L = A?.limits;
  const tallyBefore = L?.sceneNo?.() ?? 0;
  try {
    await G.step("1. the limits api and the scene count", async () => {
      G.ok("1. the limits api and the scene count", !!(L?.state && L?.gate && L?.decorate && L?.newScene && A?.npcPowers && A?.autoPower)
        && Number.isFinite(L.sceneNo()), {scene: L?.sceneNo?.()});
    });
    if ( !L?.gate ) return;
    const scene = await G.scene({name: "WoDX gate: limits"});
    const [garou, vamp, v1, v2, npc, watcher] = await G.make(Actor, [
      {name: "Gate Limits Garou", type: "Werewolf"},
      {name: "Gate Limits Malkavian", type: "Vampire"},
      {name: "Gate Limits Victim One", type: "Mortal"},
      {name: "Gate Limits Victim Two", type: "Mortal"},
      {name: "Gate Limits Hunter Vampire", type: "Vampire", system: {advantages: {bloodpool: {temporary: 10, max: 10}, willpower: {permanent: 5, temporary: 5}}},
        items: [{name: "Dominate", type: "Power", system: {type: "wod.types.discipline", value: 2}},
          {name: "Protean", type: "Power", system: {type: "wod.types.discipline", value: 2}}]},
      {name: "Gate Limits Watcher", type: "Mortal", system: {advantages: {willpower: {permanent: 4, temporary: 4}}}}]);
    // The system's sheet can prepare a new mortal to Willpower 0: set it after creation
    await watcher.update({"system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4});
    const [nt, vt, wt, gt] = await G.tokens(scene, [{actor: npc, x: 4, y: 4}, {actor: v1, x: 5, y: 4}, {actor: watcher, x: 9, y: 9}, {actor: garou, x: 12, y: 4}]);
    const live = t => scene.tokens.get(t.id)?.actor;
    const CH = game.modules.get("wodx-chronicle")?.api;

    const thor = {name: "Might of Thor", level: 3};
    await G.step("2. a once-a-scene Gift: refused after one use, free in a new scene", async () => {
      const g = await L.gate(garou, thor, {targets: []});
      await g?.done({successes: 2});
      const used = L.state(garou, thor, []);
      await L.newScene("Gate: a new scene");
      const after = L.state(garou, thor, []);
      G.ok("2. a once-a-scene Gift: refused after one use, free in a new scene", !!g && !used.ok && /W20 p\. 181/.test(used.why) && after.ok,
        {used, after, scene: L.sceneNo()});
    });

    await G.step("3. Dementation bars only the victim it was used on", async () => {
      const dem = {name: "Passion", disc: "Dementation", level: 1};
      const g = await L.gate(vamp, dem, {targets: [v1]});
      await g?.done({successes: 1});
      const one = L.state(vamp, dem, [v1]), two = L.state(vamp, dem, [v2]);
      G.ok("3. Dementation bars only the victim it was used on", !one.ok && two.ok && /VtDA p\. 213/.test(one.why), {one, two});
    });

    await G.step("4. a fifth-level power: once a scene, and Drained until the scene ends", async () => {
      const great = {name: "Gate Great Working", level: 5};
      const g = await L.gate(garou, great, {targets: []});
      await g?.done({successes: 3});
      await waitFor(() => L.isDrained(garou), 4000);
      const drained = L.isDrained(garou), refused = !L.state(garou, great, []).ok;
      const g2 = await L.gate(garou, {name: "Gate Small Working", level: 1}, {targets: []});
      const diff = g2?.diff ?? 0;
      await L.newScene("Gate: the scene ends");
      await waitFor(() => !L.isDrained(garou), 4000);
      const card = game.messages.contents.slice(-8).some(m => /is Drained/.test(m.content ?? ""));
      G.ok("4. a fifth-level power: once a scene, and Drained until the scene ends", drained && refused && diff === 1 && !L.isDrained(garou) && card,
        {drained, refused, diff, card, after: L.isDrained(garou)});
    });

    await G.step("5. a power window greys the used power and says why", async () => {
      await L.gate(garou, thor, {targets: []}).then(g => g?.done({successes: 1}));
      const root = document.createElement("div");
      root.innerHTML = `<select name="gift"><option value="thor">Might of Thor</option><option value="other">Leap of the Kangaroo</option></select>`;
      const recs = {thor, other: {name: "Leap of the Kangaroo", level: 1}};
      L.decorate(root, {actor: garou, sel: "select[name=gift]", powerOf: v => recs[v]});
      const o = root.querySelector("option[value=thor]"), p = root.querySelector("option[value=other]");
      G.ok("5. a power window greys the used power and says why", o.textContent.endsWith("(used)") && /W20 p\. 181/.test(o.title) && !p.textContent.endsWith("(used)"),
        {text: o.textContent, title: o.title});
    });

    let powers = [];
    await G.step("6. an NPC's powers carry uses and whether they show", async () => {
      powers = A.npcPowers(npc);
      const hold = powers.find(p => p.uses.includes("hold"));
      G.ok("6. an NPC's powers carry uses and whether they show", powers.length >= 2 && !!hold && powers.every(p => typeof p.obvious === "boolean"),
        {n: powers.length, sample: powers.slice(0, 6).map(p => ({name: p.name, uses: p.uses, obvious: p.obvious}))});
    });

    await G.step("7. obvious powers wait while mortals watch, unless cornered", async () => {
      const PP = await import(`/modules/wodx-npc/scripts/power-pick-rules.mjs?${Date.now()}`);
      const st = {hasTarget: true, wounds: 0, boosted: true, mortalsSee: true};
      const watched = PP.pick(powers, st), cornered = PP.pick(powers, {...st, cornered: true});
      const anyObvious = powers.some(p => p.obvious && p.uses.some(u => ["attack", "hold"].includes(u)));
      G.ok("7. obvious powers wait while mortals watch, unless cornered", !!watched && !watched.power.obvious && (!anyObvious || !!cornered),
        {watched: watched?.power?.name, cornered: cornered?.power?.name, anyObvious});
    });

    await G.step("8. the NPC rolls its chosen power by itself", async () => {
      const PP = await import(`/modules/wodx-npc/scripts/power-pick-rules.mjs?${Date.now()}`);
      const pk = PP.pick(powers, {hasTarget: true, wounds: 0, boosted: true});
      const since = Date.now();
      const open = () => Object.values(foundry.applications.instances ? Object.fromEntries(foundry.applications.instances) : {})
        .filter(a => a.element?.isConnected && /Discipline/i.test(a.title ?? a.options?.window?.title ?? ""));
      const p = A.autoPower(npc, pk.power, {target: vt.object});
      await Promise.race([p, wait(8000)]);
      const rolled = await waitFor(() => game.messages.contents.some(m => (m.timestamp ?? 0) >= since && m.speaker?.actor === npc.id), 6000);
      const left = open();
      for ( const a of left ) await a.close().catch(() => null);
      G.ok("8. the NPC rolls its chosen power by itself", !!pk && rolled && !left.length, {power: pk?.power?.name, use: pk?.use, rolled, windows: left.length});
    });
    await G.step("9. Blinding Spittle ends, Blurred sight follows", async () => {
      const spit = {name: "Blinding Spittle", level: 3};
      const victim = live(vt);
      const g = await L.gate(garou, spit, {targets: [victim]});
      await g?.done({successes: 2});
      await CH.timed.applyTimed(victim, {name: "Blinded", condition: "blinded", duration: {kind: "rounds", rounds: 1}, key: "wodx-effect-hold"});
      await wait(600);
      const tagged = victim.effects.some(e => e.getFlag(MOD, "afterCost")?.key === "blinding-spittle");
      await CH.timed.endFor(victim, {key: "wodx-effect-hold"});
      await waitFor(() => live(vt).statuses?.has?.("wodx-blurred-sight"), 5000);
      G.ok("9. Blinding Spittle ends, Blurred sight follows", tagged && live(vt).statuses.has("wodx-blurred-sight"), {tagged, statuses: [...(live(vt).statuses ?? [])]});
    });

    await G.step("10. Survivor wears off: Asleep, the token dimmed", async () => {
      const wolf = live(gt);
      const g = await L.gate(wolf, {name: "Survivor", level: 1}, {targets: []});
      await g?.done({successes: 1});
      await CH.timed.applyTimed(wolf, {name: "Survivor", duration: {kind: "scene"}, key: "gate-survivor"});
      await wait(600);
      await CH.timed.endFor(wolf, {key: "gate-survivor"});
      await waitFor(() => live(gt).statuses?.has?.("wodx-asleep") && scene.tokens.get(gt.id).alpha === 0.5, 5000);
      const asleep = live(gt).statuses.has("wodx-asleep"), dim = scene.tokens.get(gt.id).alpha;
      await CH.timed.endFor(live(gt), {key: "wodx-after-sleep"});
      await waitFor(() => scene.tokens.get(gt.id).alpha === 1, 5000);
      G.ok("10. Survivor wears off: Asleep, the token dimmed", asleep && dim === 0.5 && scene.tokens.get(gt.id).alpha === 1, {asleep, dim, after: scene.tokens.get(gt.id).alpha});
    });

    await G.step("11. Inspire with no lasting effect: the scene's end takes a Willpower dot", async () => {
      const mortal = live(wt);
      const before = Number(mortal.system?.advantages?.willpower?.permanent) || 0;
      const demonUser = live(nt);
      const g = await L.gate(demonUser, {name: "Inspire", level: 2}, {targets: [mortal]});
      await g?.done({successes: 2});
      await L.newScene("Gate: the scene ends");
      await waitFor(() => (Number(live(wt).system?.advantages?.willpower?.permanent) || 0) === before - 1, 6000);
      const after = Number(live(wt).system?.advantages?.willpower?.permanent) || 0;
      G.ok("11. Inspire with no lasting effect: the scene's end takes a Willpower dot", before > 0 && after === before - 1, {before, after});
    });

    await G.step("12. Strengthening the Demon: Demon Chi rises, then the stoked points fade", async () => {
      const [kj] = await G.make(Actor, [{name: "Gate Limits Kuei-jin", type: "Vampire", system: {settings: {variant: "kindredeast"}}}]);
      await kj.update({"system.advantages.demonchi.temporary": 3, "system.advantages.po.permanent": 4, "system.advantages.hun.permanent": 6});
      const before = Number(kj.system?.advantages?.demonchi?.temporary) || 0;
      const g = await L.gate(kj, {name: "Strengthening the Demon", level: 2}, {targets: []});
      await A.kotStoke(kj, 2);
      await g?.done({successes: 2});
      const up = Number(kj.system?.advantages?.demonchi?.temporary) || 0;
      const timed = kj.effects.some(e => /Strengthening the Demon/.test(e.name));
      await wait(500);
      const tagged = kj.effects.some(e => e.getFlag(MOD, "afterCost")?.key === "strengthening-the-demon");
      await CH.timed.endFor(kj, {key: "wodx-kote-stoke"});
      await waitFor(() => (Number(kj.system?.advantages?.demonchi?.temporary) || 0) === before, 5000);
      const after = Number(kj.system?.advantages?.demonchi?.temporary) || 0;
      const hunCard = await waitFor(() => game.messages.contents.slice(-6).some(m => /Hun/.test(m.content ?? "") && m.speaker?.actor === kj.id), 5000);
      G.ok("12. Strengthening the Demon: Demon Chi rises, then the stoked points fade", up === before + 4 && timed && tagged && after === before && hunCard,
        {before, up, timed, tagged, after, hunCard});
    });

    await G.step("13. a fomor's Numbing: more levels, no penalty, and death when it ends past Incapacitated", async () => {
      const [fo] = await G.make(Actor, [{name: "Gate Limits Fomor", type: "Mortal", system: {attributes: {stamina: {value: 5}}, advantages: {willpower: {permanent: 9, temporary: 9}}},
        items: [{name: "Numbing", type: "Power", system: {type: "wod.types.power", value: 1}}]}]);
      // The system's sheet can prepare a new mortal to Willpower 0: set the traits after creation
      await fo.update({"system.advantages.willpower.permanent": 9, "system.advantages.willpower.temporary": 9, "system.attributes.stamina.value": 5});
      const [ft] = await G.tokens(scene, [{actor: fo, x: 14, y: 8}]);
      const body = () => live(ft);
      const max0 = Number(body().system?.traits?.health?.totalhealthlevels?.max) || 7;
      for ( let k = 0; k < 4 && !body().statuses?.has?.("wodx-numbing"); k++ ) {
        await A.fomor.numbing(body());
        await wait(400);
        if ( !body().statuses?.has?.("wodx-numbing") ) await L.clear?.(body());
      }
      const numb = body().statuses?.has?.("wodx-numbing");
      await waitFor(() => (Number(body().system?.traits?.health?.totalhealthlevels?.max) || 0) === max0 + 3, 5000);
      const max1 = Number(body().system?.traits?.health?.totalhealthlevels?.max) || 0;
      await body().update({"system.health.damage.lethal": max0 + 1});
      await wait(400);
      const pen = Number(body().system?.health?.damage?.woundpenalty) || 0;
      await CH.timed.endFor(body(), {key: "wodx-fomor-numbing"});
      await waitFor(() => body().statuses?.has?.("dead") && scene.tokens.get(ft.id)?.alpha === 0.25, 6000);
      const dead = !!body().statuses?.has?.("dead"), alpha = scene.tokens.get(ft.id)?.alpha;
      G.ok("13. a fomor's Numbing: more levels, no penalty, and death when it ends past Incapacitated", numb && max1 === max0 + 3 && pen === 0 && dead && alpha === 0.25,
        {numb, max0, max1, pen, dead, alpha});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  } finally {
    try { if ( L ) await game.settings.set(MOD, "sceneTally", tallyBefore); } catch {}
  }
  return G.finish();
}
