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
 * Result: Data/wodx-gate/gateautoactions-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const MOD = "wodx-actions";
const KEYS = ["autoBeast", "autoTorporRise", "autoRiseRage", "autoMeditate", "autoSekhem", "autoQuintessence", "autoPurify",
  "autoChimerical", "autoCorpus", "autoFetter", "autoVitality"];

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
      CONFIG.Dice.randomUniform = () => 0.999; // every die a 10: Rage 5 gives 5 successes
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
      CONFIG.Dice.randomUniform = () => 0.999; // 2 successes a roll: 2, 4, then 6 of 5 needed
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
      CONFIG.Dice.randomUniform = () => 0.999; // Fetter 4: four successes, Willpower 1 to 5
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
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    CONFIG.Dice.randomUniform = dice;
    for ( const [k, v] of Object.entries(keep) ) if ( v !== undefined ) { try { await game.settings.set(MOD, k, v); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
