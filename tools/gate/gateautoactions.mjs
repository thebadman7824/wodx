/**
 * The Automation Desk gate (WoDX Actions, B4980-B4999), rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateautoactions.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters, moves the clock a few hours, and puts the settings and the clock back.
 *   1. the settings for every automatic action are registered
 *   2. a werewolf hurt past Incapacitated on the sheet rises on Rage by itself: wounds heal (dice forced to 10s)
 *   3. a grievous wound on a vampire's sheet rolls the frenzy check by itself; outside a fight the holds roll on at
 *      once until the Beast subsides (three rolls of 2 successes)
 *   4. a wraith's bashing Corpus mends with the clock
 *   5. a changeling's chimerical wounds heal with the clock
 *   6. the Storyteller ends the scene: a Fetter token gives Willpower, 1 to 5
 *   7. every other WoDX module still answers
 *   8. the day's routines, on two moves of the clock (a minute, then a day; dice forced to 10s) (B6379):
 *      8a. a werewolf marked to meditate gains Gnosis by Wits + Enigmas
 *      8b. a mage marked to meditate draws the Avatar's rating in Quintessence (3)
 *      8c. a mummy marked to spend the day in Osiris's Blessing gains Sekhem past the Gift of Ra's one
 *      8d. an Orpheus projector rests back Vitality
 *   9. the Crusade's Scourge (B6379, B6438): with the chronicle set to the Burning Times, a mage withdrawn to meditate
 *      for a point of Scourge is cleared by itself a day later; the era is put back
 *  10. Conviction at a story's end (B6379): in the Time of Judgment, the Storyteller's End of story sets an imbued
 *      mortal's Conviction back to the Defender creed's 3; the era and the story are put back
 * Result: Data/wodx-gate/gateautoactions-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const MOD = "wodx-actions";
const KEYS = ["autoBeast", "autoTorporRise", "autoRiseRage", "autoMeditate", "autoSekhem", "autoQuintessence", "autoPurify",
  "autoChimerical", "autoCorpus", "autoFetter", "autoVitality"];

/** Fix every d10 to one face. Foundry's mapping from randomUniform to a face has changed between versions (v12 on reads
 * 1 - u, so 0.999 gives a 1 there), so both readings are tried and the one that gives the wanted face is kept. */
async function fixDice(face) {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
}

export async function run() {
  const G = gate("gateautoactions");
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const keep = {};
  for ( const k of KEYS ) { try { keep[k] = game.settings.get(MOD, k); } catch (e) { keep[k] = undefined; } }
  const t0 = Date.now();
  const dice = CONFIG.Dice.randomUniform;
  try {
    const A = game.modules.get(MOD)?.api;
    await G.step("1. settings", async () => {
      G.ok("1. settings", KEYS.every(k => keep[k] !== undefined) && !!A?.remainActiveAuto && !!A?.autoBeast, {settings: keep});
    });
    for ( const k of KEYS ) if ( keep[k] !== undefined ) await game.settings.set(MOD, k, true);
    const scene = await G.scene({activate: true});
    const [wolf, vamp, ghost, fae] = await G.make(Actor, [
      {name: "WoDX gate: auto wolf", type: "Werewolf", ownership: {default: 3}},
      {name: "WoDX gate: auto vampire", type: "Vampire"},
      {name: "WoDX gate: auto wraith", type: "Wraith"},
      {name: "WoDX gate: auto changeling", type: "Changeling"}
    ]);
    const box = await G.make(Actor, {name: "WoDX gate: the music box", type: "Mortal"});
    await G.tokens(scene, [{actor: wolf, x: 2, y: 2}, {actor: vamp, x: 4, y: 2}, {actor: ghost, x: 6, y: 2}, {actor: fae, x: 8, y: 2}, {actor: box, x: 6, y: 4}]);
    await new Promise(r => setTimeout(r, 400));

    const hurt = d => Number(d?.bashing ?? 0) + Number(d?.lethal ?? 0) + Number(d?.aggravated ?? 0);
    await G.step("2. rises on Rage", async () => {
      await wolf.update({"system.advantages.rage.permanent": 5, "system.advantages.rage.temporary": 5});
      await fixDice(10); // every die a 10: Rage 5 gives 5 successes
      const since = Date.now();
      // past Incapacitated on the sheet (the trigger players and the Storyteller use); the rise rolls by itself
      await wolf.update({"system.health.damage.lethal": 7});
      const card = await waitFor(() => newestMessage(since, m => /rises on Rage|fails to rise/.test(`${m.content ?? ""} ${m.flavor ?? ""}`)), 8000);
      await waitFor(() => hurt(wolf.system?.health?.damage) < 7, 6000);
      CONFIG.Dice.randomUniform = dice;
      G.ok("2. rises on Rage", !!card && hurt(wolf.system?.health?.damage) < 7 && wolf.getFlag(MOD, "remainedActive") === scene.id,
        {flag: wolf.getFlag(MOD, "remainedActive"), damage: wolf.system?.health?.damage});
    });

    await G.step("3. frenzy check by itself, held off at once outside a fight", async () => {
      await vamp.update({"system.advantages.bloodpool.temporary": 5, "system.advantages.virtues.selfcontrol.permanent": 2, "system.advantages.path.permanent": 7});
      await fixDice(10); // 2 successes a roll: 2, 4, then 6 of 5 needed
      const since = Date.now();
      await vamp.update({"system.health.damage.lethal": 4}); // a grievous wound on the sheet
      const re = /Frenzy check|Instinct check/;
      const cards = () => game.messages.filter(m => m.timestamp >= since && re.test(m.content ?? "") && (m.content ?? "").includes(vamp.name));
      await waitFor(() => cards().some(m => /subsides/.test(m.content ?? "")), 10000);
      CONFIG.Dice.randomUniform = dice;
      G.ok("3. frenzy check by itself, held off at once outside a fight", cards().length === 3 && cards().some(m => /6 successes accumulated/.test(m.content ?? "")) && !vamp.system?.conditions?.isfrenzy,
        {cards: cards().length, isfrenzy: !!vamp.system?.conditions?.isfrenzy});
    });

    const corpusBashing = () => {
      const d = ghost.system?.health?.damage ?? {};
      return d.corpus ? Number(d.corpus.bashing ?? 0) : Number(d.bashing ?? 0);
    };
    await G.step("4. Corpus mends with the clock", async () => {
      const hasTrack = !!ghost.system?.health?.damage?.corpus;
      await ghost.update(hasTrack ? {"system.health.damage.corpus.bashing": 2} : {"system.health.damage.bashing": 2});
      await game.time.advance(60);
      await waitFor(() => ghost.getFlag(MOD, "corpusClock") !== undefined, 5000);
      await game.time.advance(2 * 3600 + 60);
      await waitFor(() => corpusBashing() === 0, 8000);
      G.ok("4. Corpus mends with the clock", corpusBashing() === 0, {bashing: corpusBashing(), track: hasTrack});
    });

    await G.step("5. chimerical wounds heal", async () => {
      const ch = fae.system?.health?.damage?.chimerical;
      if ( !ch ) { G.ok("5. chimerical wounds heal", false, {error: "no chimerical track on a Changeling"}); return; }
      await fae.update({"system.health.damage.chimerical.bashing": 2});
      await game.time.advance(60);
      await waitFor(() => !!fae.getFlag(MOD, "c20")?.chimClock, 5000);
      await game.time.advance(3600 + 60);
      await waitFor(() => Number(fae.system.health.damage.chimerical.bashing) === 0, 8000);
      G.ok("5. chimerical wounds heal", Number(fae.system.health.damage.chimerical.bashing) === 0, {chimerical: fae.system.health.damage.chimerical});
    });

    await G.step("6. a Fetter at the scene's end", async () => {
      const [f] = await ghost.createEmbeddedDocuments("Item", [{name: "The music box", type: "Trait", system: {type: "wod.types.fetter", value: 4}}]);
      const tok = scene.tokens.find(t => t.actorId === box.id);
      await tok.setFlag(MOD, "fetter", {actor: ghost.id, item: f.id});
      await ghost.update({"system.advantages.willpower.permanent": 8, "system.advantages.willpower.temporary": 1});
      await fixDice(10); // Fetter 4: four successes, Willpower 1 to 5
      const since = Date.now();
      await game.modules.get("wodx-chronicle").api.endScene(); // the Storyteller ends the scene
      const card = await waitFor(() => newestMessage(since, m => /rolled by itself/.test(m.content ?? "") && (m.content ?? "").includes("music box")), 8000);
      await waitFor(() => Number(ghost.system?.advantages?.willpower?.temporary) === 5, 5000);
      CONFIG.Dice.randomUniform = dice;
      G.ok("6. a Fetter at the scene's end", !!card && Number(ghost.system?.advantages?.willpower?.temporary) === 5, {willpower: ghost.system?.advantages?.willpower?.temporary});
    });

    await G.step("7. other modules answer", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-combat", "wodx-storyteller", "wodx-solo"].filter(id => game.modules.get(id)?.active);
      G.ok("7. other modules answer", ids.every(id => !!game.modules.get(id).api), {ids, ms: Date.now() - t0});
    });
    // B6379: the lines of the desk that run on the clock or the story, each driven by its own trigger
    const [mage, mummy, orph, purer, imbued] = await G.make(Actor, [
      {name: "WoDX gate: auto mage", type: "Mage", items: [{name: "Avatar", type: "Feature", system: {type: "wod.types.background", value: 3}}]},
      {name: "WoDX gate: auto mummy", type: "Mummy"},
      {name: "WoDX gate: auto projector", type: "Mortal", system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}}},
      {name: "WoDX gate: auto purifier", type: "Mage"},
      {name: "WoDX gate: auto imbued", type: "Mortal"}]);
    await G.step("8. the day's routines", async () => {
      const gnosis = () => Number(wolf.system?.advantages?.gnosis?.temporary) || 0;
      const quint = () => Number(mage.system?.quintessence?.temporary) || 0;
      const sek = () => Number(mummy.system?.advantages?.sekhem?.temporary) || 0;
      const vit = () => Number(orph.system?.advantages?.vitality?.temporary) || 0;
      await wolf.update({"system.advantages.gnosis.permanent": 5, "system.advantages.gnosis.temporary": 1});
      await wolf.unsetFlag(MOD, "meditation");
      await wolf.setFlag(MOD, "meditates", {hours: 3});
      await mage.update({"system.quintessence.temporary": 0, "system.paradox.temporary": 0, "system.paradox.permanent": 0});
      await mage.setFlag(MOD, "m20", {draws: {node: 0}});
      await mummy.update({"system.advantages.balance.permanent": 5, "system.advantages.sekhem.permanent": 8, "system.advantages.sekhem.temporary": 2});
      await mummy.setFlag(MOD, "mummy", {inWeb: true, dailyRegain: {k: "bless", sh: 6}});
      await orph.update({"system.advantages.vitality.permanent": 5, "system.advantages.vitality.temporary": 2});
      const was = {gnosis: gnosis(), quint: quint(), sekhem: sek(), vitality: vit()};
      await fixDice(10);
      try {
        await game.time.advance(60); // the routines note the day and start the rest
        await waitFor(() => mage.getFlag(MOD, "m20")?.drawDay !== undefined && mummy.getFlag(MOD, "mummy")?.raDay !== undefined && !!orph.getFlag(MOD, "orpheus")?.restClock, 8000);
        await new Promise(r => setTimeout(r, 1000));
        await game.time.advance(86400);
        await waitFor(() => quint() > was.quint && sek() > was.sekhem + 1 && vit() > was.vitality, 10000);
        // the moon's routine is skipped while a run of it is busy: a minute more lets the meditation through
        for ( let k = 0; k < 3 && gnosis() <= was.gnosis; k++ ) { await game.time.advance(60); await waitFor(() => gnosis() > was.gnosis, 4000); }
      } finally { CONFIG.Dice.randomUniform = dice; }
      G.ok("8a. a werewolf's daily meditation gains Gnosis", gnosis() > was.gnosis, {gnosis: [was.gnosis, gnosis()]});
      G.ok("8b. a mage's daily meditation draws Quintessence", quint() === was.quint + 3, {quint: [was.quint, quint()]});
      G.ok("8c. a mummy's day in the Blessing gains Sekhem", sek() > was.sekhem + 1, {sekhem: [was.sekhem, sek()]});
      G.ok("8d. an Orpheus projector rests back Vitality", vit() > was.vitality, {vitality: [was.vitality, vit()]});
    });

    const CH = game.modules.get("wodx-chronicle")?.api;
    const era0 = (() => { try { return game.settings.get("wodx-chronicle", "activeEra"); } catch (e) { return undefined; } })();
    const declined0 = (() => { try { return game.settings.get("wodx-chronicle", "declinedEra"); } catch (e) { return undefined; } })();
    const story0 = (() => { try { return game.settings.get(MOD, "storyId"); } catch (e) { return undefined; } })();
    const tEra = Date.now();
    try {
      await G.step("9. the Crusade's Scourge clears by meditation on the clock", async () => {
        if ( era0 === undefined ) return G.ok("9. the Crusade's Scourge clears by meditation on the clock", false, {error: "WoDX Chronicle is off"});
        await game.settings.set("wodx-chronicle", "activeEra", "renaissance");
        await new Promise(r => setTimeout(r, 1000));
        const ageKey = A.consensus?.age?.()?.key ?? null;
        await purer.update({"system.paradox.temporary": 1, "system.paradox.permanent": 0});
        await purer.setFlag(MOD, "m20", {purifying: {since: game.time.worldTime, days: 1}});
        const scourge = () => Number(purer.system?.paradox?.temporary) || 0;
        await game.time.advance(86400 + 60);
        await waitFor(() => scourge() === 0, 10000);
        G.ok("9. the Crusade's Scourge clears by meditation on the clock", ageKey === "crusade" && scourge() === 0 && !purer.getFlag(MOD, "m20")?.purifying,
          {age: ageKey, scourge: scourge(), purifying: purer.getFlag(MOD, "m20")?.purifying ?? null});
      });
      await G.step("10. Conviction returns to the creed's level at a story's end", async () => {
        if ( era0 === undefined ) return G.ok("10. Conviction returns to the creed's level at a story's end", false, {error: "WoDX Chronicle is off"});
        await game.settings.set("wodx-chronicle", "activeEra", "time-of-judgment");
        await new Promise(r => setTimeout(r, 1000));
        await imbued.setFlag(MOD, "imbued", {creed: "defender", conviction: 1});
        await A.endStory({actors: [imbued]});
        const conv = () => Number(imbued.getFlag(MOD, "imbued")?.conviction);
        await waitFor(() => conv() === 3, 6000);
        G.ok("10. Conviction returns to the creed's level at a story's end", conv() === 3, {conviction: conv()});
      });
    } finally {
      if ( era0 !== undefined ) {
        try { await game.settings.set("wodx-chronicle", "activeEra", era0); } catch (e) { G.R.notes.push(`era back: ${e?.message ?? e}`); }
        // a clock move under the borrowed era may have asked to change it back: those asks are withdrawn
        const ap = CH?.approvals;
        for ( const e of (ap?.pending?.() ?? []).filter(x => x.type === "era-change" && x.createdAt >= tEra) ) { try { await ap.decide(e.id, "reject"); } catch (err) { /* gone */ } }
        try { await game.settings.set("wodx-chronicle", "declinedEra", declined0 ?? ""); } catch (e) { /* gone */ }
      }
      if ( story0 !== undefined ) { try { await game.settings.set(MOD, "storyId", story0); } catch (e) { /* gone */ } }
    }
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    CONFIG.Dice.randomUniform = dice;
    for ( const [k, v] of Object.entries(keep) ) if ( v !== undefined ) { try { await game.settings.set(MOD, k, v); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
