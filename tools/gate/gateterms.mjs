/**
 * Shared terms (B6180-B6199), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateterms.mjs?${Date.now()}`)).run()
 * Covers WoDX Chronicle (api.terms, the end of the scene, night-long effects), WoDX Actions (End scene, the scene
 * count, power limits), WoDX Combat, WoDX NPC, WoDX Storyteller, WoDX Library and WoDX Otherworlds (their dice counts),
 * WoDX Targeting, WoDX Interactables, WoDX Senses, WoDX Creation, WoDX Sheets, WoDX Paperdoll, WoDX Solo and WoDX Atmosphere.
 * Makes two scratch scenes and one actor; puts the active scene and the scene count's meaning back. The clock does not move.
 *   1. api.terms answers with the books' figures
 *   2. every module's dice count agrees with the shared one, past 10 and below 2 too
 *   3. Actions' End scene ends the scene once for every module: one hook, the scene count up one, a scene-long effect gone from the token
 *   4. a new active map ends the scene once (not twice), names the scene that ended, and posts no Nature card
 *   5. a night-long effect on a token in a far land ends at that land's dawn, not home's
 *   6. a ghoul on the system's ghoul variant reads as a ghoul in WoDX NPC, a Kuei-jin as a Kuei-jin
 *   7. a metre is a yard in Combat, and a turn outside a fight is the table's turn length in Actions' limits
 *   8. every other WoDX module still answers
 *   9. Targeting, Interactables, Senses, Creation, Sheets, Paperdoll, Solo and Atmosphere read the same metre, era and health words;
 *      NPC speech and the Encyclopaedia follow the era profiles; the Exalted fight as their own kind
 * Result: Data/wodx-gate/gateterms-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gateterms");
  const MOD = "wodx-chronicle";
  const chron = () => game.modules.get(MOD)?.api;
  const actions = () => game.modules.get("wodx-actions")?.api;
  const prevActive = game.scenes.active?.id ?? null;
  const ends = [];
  const onEnd = o => ends.push({...(o ?? {})});
  Hooks.on("wodxEndScene", onEnd);
  const tally = () => { try { return Number(game.settings.get("wodx-actions", "sceneTally")) || 0; } catch (e) { return 0; } };
  try {
    const T = chron()?.terms;
    await G.step("1. api.terms answers with the books' figures", async () => {
      G.ok("1. api.terms answers with the books' figures", !!T && T.TURN_SECONDS === 3 && T.DAY === 86400 && T.MONTH === 30 * 86400
        && T.successes([10], 12).successes === 1 && T.successes([1, 3], 6).botch === true && T.toYards(30, "ft") === 10
        && typeof T.turnSeconds() === "number" && typeof T.isNightHere() === "boolean", {turn: T?.turnSeconds?.(), night: T?.isNightHere?.()});
    });

    await G.step("2. every module's dice count agrees", async () => {
      const M = p => import(`/modules/${p}?${Date.now()}`);
      const list = [
        ["combat", await M("wodx-combat/scripts/rules.js"), (m, f, d) => m.countSuccesses(f, d).successes, "successes"],
        ["chronicle", await M("wodx-chronicle/scripts/referee-rules.mjs"), (m, f, d) => m.successes(f, d).successes, "successes"],
        ["npc", await M("wodx-npc/scripts/faction-rules.mjs"), (m, f, d) => m.successes(f, d).net, "net"],
        ["library", await M("wodx-library/scripts/arms-rules.mjs"), (m, f, d) => m.countSuccesses(f, d).successes, "successes"],
        ["otherworlds", await M("wodx-otherworlds/scripts/rules.mjs"), (m, f, d) => m.countRoll(f, d).net, "net"]
      ];
      const rolls = [[[10, 1, 6], 6], [[10], 12], [[2, 2], 1], [[1, 6], 6]];
      const off = [];
      for ( const [f, d] of rolls ) for ( const [k, m, fn, field] of list ) if ( fn(m, f, d) !== T.successes(f, d)[field] ) off.push(`${k} ${f}@${d}`);
      G.ok("2. every module's dice count agrees", !off.length, {off});
    });

    const home = await G.scene({name: "WoDX gate: terms home"});
    const [pc] = await G.make(Actor, [{name: "WoDX gate: terms traveller", type: "Mortal"}]);
    const [tok] = await G.tokens(home, [{actor: pc, x: 3, y: 3}]);

    await G.step("3. Actions' End scene ends the scene once for every module", async () => {
      canvas.tokens?.releaseAll?.();
      const eff = await chron().applyTimed(pc, {name: "WoDX gate: for the scene", duration: {kind: "scene"}, source: "gate"});
      const before = tally(), n0 = ends.length;
      await actions()?.endScene?.();
      await waitFor(() => !pc.effects.get(eff.id), 8000).catch(() => null);
      G.ok("3. Actions' End scene ends the scene once for every module", ends.length - n0 === 1 && tally() === before + 1 && !pc.effects.get(eff.id)
        && ends.at(-1)?.map === false, {hooks: ends.length - n0, tally: [before, tally()], effectLeft: !!pc.effects.get(eff.id), last: ends.at(-1)});
    });

    await G.step("4. a new active map ends the scene once", async () => {
      const far = await G.scene({name: "WoDX gate: terms far"});
      await home.activate();
      await waitFor(() => game.scenes.active?.id === home.id, 8000);
      await new Promise(r => setTimeout(r, 800));
      const before = tally(), n0 = ends.length, cards0 = game.messages.size;
      await far.activate();
      await waitFor(() => ends.length > n0, 8000).catch(() => null);
      await new Promise(r => setTimeout(r, 1500));
      const last = ends.at(-1) ?? {};
      const nature = [...game.messages].slice(cards0).some(m => /Nature at the end of the scene/.test(m.content ?? ""));
      G.ok("4. a new active map ends the scene once", ends.length - n0 === 1 && tally() === before + 1 && last.map === true && last.sceneId === home.id
        && last.next === far.id && !nature, {hooks: ends.length - n0, tally: [before, tally()], last, nature});
    });

    await G.step("5. a night-long effect in a far land ends at that land's dawn", async () => {
      await home.update({"flags.wodx-chronicle.place": {latitude: 35.7, offset: 8}});
      await waitFor(() => home.flags?.[MOD]?.place?.offset === 8, 5000);
      const eff = await chron().applyTimed(tok.actor ?? pc, {name: "WoDX gate: for the night", duration: {kind: "night"}, source: "gate"});
      const until = eff.getFlag(MOD, "timed")?.until;
      const now = game.time.worldTime, p = T.placeNow(home, now);
      const want = now + T.toDawn(p.time, p.latitude), homeDawn = now + T.toDawn(now, game.settings.get(MOD, "latitude"));
      G.ok("5. a night-long effect in a far land ends at that land's dawn", Math.abs(until - want) < 2 && Math.abs(until - homeDawn) > 60,
        {until, want, homeDawn});
      await eff.delete();
    });

    await G.step("6. a ghoul and a Kuei-jin read the same in WoDX NPC", async () => {
      const lineOf = game.modules.get("wodx-npc")?.api?.hearts?.lineOf ?? (await import(`/modules/wodx-npc/scripts/hearts.mjs?${Date.now()}`)).lineOf;
      const ghoul = {type: "Mortal", system: {settings: {variant: "ghoul"}}, flags: {}};
      const kj = {type: "Vampire", system: {settings: {variant: "kindredeast"}}, flags: {}};
      G.ok("6. a ghoul and a Kuei-jin read the same in WoDX NPC", lineOf(ghoul) === "ghoul" && lineOf(kj) === "kueijin" && T.lineOf(ghoul) === "ghoul",
        {ghoul: lineOf(ghoul), kueijin: lineOf(kj)});
    });

    await G.step("7. a metre is a yard; a turn is the table's turn", async () => {
      const toYards = game.modules.get("wodx-combat")?.api?.auto?.toYards;
      const L = await import(`/modules/wodx-actions/scripts/limit-rules.js?${Date.now()}`);
      const key3 = L.periodKey("turn", {worldTime: 7, scene: 1, turnSeconds: 3}), keyDefault = L.periodKey("turn", {worldTime: 7, scene: 1});
      G.ok("7. a metre is a yard; a turn is the table's turn", (toYards ? toYards(10, "m") === 10 : true) && T.toYards(1, "mi") === 1760
        && key3 === "t1:2" && keyDefault === key3, {combat: toYards?.(10, "m"), key3, keyDefault});
    });

    await G.step("9. the other modules read the same words", async () => {
      const M = p => import(`/modules/${p}?${Date.now()}`).catch(() => null);
      const [tg, cr, se, cra, sh, pd, so, intr] = await Promise.all([M("wodx-targeting/scripts/target-rules.mjs"),
        M("wodx-interactables/scripts/carry-rules.mjs"), M("wodx-senses/scripts/senses-rules.mjs"), M("wodx-creation/data/advance.mjs"),
        M("wodx-sheets/scripts/extras-rules.mjs"), M("wodx-paperdoll/scripts/doll-rules.mjs"), M("wodx-solo/scripts/solo-rules.mjs"),
        M("wodx-interactables/scripts/fill-rules.mjs")]);
      const [talk, know, deeds] = await Promise.all([M("wodx-npc/scripts/talk-rules.mjs"), M("wodx-library/scripts/know-rules.mjs"),
        M("wodx-storyteller/scripts/battle-deeds.mjs")]);
      const got = {
        targeting: tg?.shapeFromText?.("a 10-meter radius")?.size,
        carry: cr?.toUnits?.(10, "m"),
        senses: [se?.eraBand?.(1840), se?.eraBand?.(1960)],
        creation: cra?.DA_ERAS,
        sheets: sh?.ERA_LIKE === T.ERA_LIKE || JSON.stringify(sh?.ERA_LIKE) === JSON.stringify(T.ERA_LIKE),
        fill: !intr?.ERA_LIKE || JSON.stringify(intr.ERA_LIKE) === JSON.stringify(T.ERA_LIKE),
        paperdoll: JSON.stringify(pd?.LEVELS) === JSON.stringify(T.HEALTH_LEVELS),
        solo: so?.nightStart?.(T.DAY * 3, 3600),
        speech: [talk?.eraBand?.(1450), talk?.eraBand?.(2015, "future")],
        encyclopaedia: know?.ERA_FROM?.["future-darkness"],
        exalted: deeds?.kindGroup?.("exalted")
      };
      const ok = got.targeting === 10 && got.carry === 10 && got.senses[0] === "industrial" && got.senses[1] === "modern"
        && Array.isArray(got.creation) && got.creation.includes("renaissance") && got.creation.includes("age-of-reason")
        && got.sheets && got.fill && got.paperdoll && got.solo === T.DAY * 2 + 3600
        && typeof game.modules.get("wodx-atmosphere")?.api === "object"
        && got.speech[0] === "earlymodern" && got.speech[1] === "future" && got.encyclopaedia === 2010 && got.exalted === "exalted";
      G.ok("9. the other modules read the same words", ok, got);
    });

    await G.step("8. every other WoDX module still answers", async () => {
      const ids = [...game.modules].filter(m => m.id.startsWith("wodx-") && m.active).map(m => m.id);
      const must = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-otherworlds", "wodx-library"];
      const quiet = must.filter(id => !game.modules.get(id)?.api);
      G.ok("8. every other WoDX module still answers", ids.length > 5 && !quiet.length, {ids, quiet, noApi: ids.filter(id => !game.modules.get(id)?.api)});
    });
  } finally {
    Hooks.off("wodxEndScene", onEnd);
    try { const s = prevActive ? game.scenes.get(prevActive) : null; if ( s && game.scenes.active?.id !== s.id ) await s.activate(); } catch (e) { G.R.notes.push(`active scene: ${e.message}`); }
    return G.finish();
  }
}
