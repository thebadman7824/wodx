/**
 * The world's own hand gate (B4860-B4868), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatereach.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters, removes them and any quick-extra actor it made, and puts back the settings it
 * touches (law heat, hunters, rumours, the world's hand, the fight starter) and the clock.
 *   1. the api: reach, the law stage hook, Chronicle's start level never moves the Live world
 *   2. a road encounter of two bandits puts two visible bandit tokens beside the traveller
 *   3. the law comes for an NPC culprit: the watch arrive, the culprit goes with them (arrested), and the tokens leave
 *   4. a lever turned on someone (the press prints a story) starts a tale about them
 *   5. a Threads of Fate write-back (Hunters gain a lead) opens a hunters' file on whom the story was about
 *   6. a finished language project puts the language on the sheet
 * Result: Data/wodx-gate/gatereach-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-storyteller";
const KEEP = [["wodx-chronicle", "lawHeat"], [MOD, "hunterState"], [MOD, "rumours"], [MOD, "reachState"], [MOD, "reachOn"], [MOD, "tales"], [MOD, "hunterPressure"], ["wodx-chronicle", "lawHeatOn"], ["wodx-combat", "fightStart"]];

export async function run() {
  const G = gate("gatereach");
  if ( G.notLive() ) return "Not on the Live world.";
  const api = () => game.modules.get(MOD)?.api, X = () => api()?.reach;
  const keep = {};
  for ( const [m, k] of KEEP ) { try { keep[`${m}.${k}`] = foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { /* not here */ } }
  const extrasBefore = new Set([...game.actors].filter(a => a.flags?.[MOD]?.extra).map(a => a.id));
  try {
    for ( const [m, k] of [[MOD, "reachOn"], [MOD, "tales"], [MOD, "hunterPressure"], ["wodx-chronicle", "lawHeatOn"]] ) { try { await game.settings.set(m, k, true); } catch (e) { /* not here */ } }
    try { await game.settings.set("wodx-combat", "fightStart", "suggest"); } catch (e) { /* no Combat */ }
    const scene = await G.scene();
    const player = game.users.find(u => !u.isGM);
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const [pc, culprit, other] = await G.make(Actor, [
      {name: "Gate Reach Traveller", type: "Mortal", ownership: own, prototypeToken: {actorLink: true}},
      {name: "Gate Reach Culprit", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Reach Subject", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const [tpc, tcul] = await G.tokens(scene, [{actor: pc, x: 3, y: 3}, {actor: culprit, x: 12, y: 3}]);

    await G.step("1 api", async () => {
      const chron = game.modules.get("wodx-chronicle")?.api;
      G.ok("1 api", typeof X()?.road === "function" && typeof X()?.lawCome === "function" && typeof X()?.lever === "function" && typeof X()?.writeBack === "function"
        && typeof chron?.automation?.seed === "function" && chron.automation.rules.seedPlan({worldId: "rothenstein-live"}) === null
        && chron.automation.rules.seedPlan({worldId: "rothenstein-wodx"}) === "balanced");
    });

    await G.step("2 road", async () => {
      const made = await X().road({actorId: pc.id, text: "Two bandits step out from the trees"});
      const bandits = [...scene.tokens].filter(t => t.flags?.[MOD]?.reach && /bandit/i.test(t.name));
      G.ok("2 road", made.length === 2 && bandits.length === 2 && bandits.every(t => !t.hidden), {made: made.length, names: bandits.map(t => t.name)});
      if ( bandits.length ) await scene.deleteEmbeddedDocuments("Token", bandits.map(t => t.id));
    });

    await G.step("3 law", async () => {
      const L = game.modules.get("wodx-chronicle")?.api?.law?.heat;
      await L.add(culprit, "theft", {scene, named: true, witnesses: 1});
      const r = await X().lawCome({actorId: culprit.id, region: "moravia", mode: "arrest", why: "the gate"});
      await waitFor(() => !scene.tokens.get(tcul.id), 4000);
      const e = Object.values(L.state().regions ?? {}).map(reg => reg[culprit.id]).find(Boolean);
      const left = [...scene.tokens].filter(t => t.flags?.[MOD]?.reach?.target === culprit.id);
      G.ok("3 law", r === "yield" && !scene.tokens.get(tcul.id) && !!e?.arrested && !left.length, {answer: r, arrested: e?.arrested ?? null, left: left.length});
    });

    await G.step("4 lever", async () => {
      const R = api().rumours;
      const before = R.about(other.id).length;
      const done = await X().lever({actor: pc, inst: {id: "gate:press", kind: "press", town: "", name: "The gate's paper", seats: []}, key: "print", target: other, words: "was seen at the gate"});
      G.ok("4 lever", R.about(other.id).length > before && done.length > 0, {done});
    });

    await G.step("5 write-back", async () => {
      const story = {key: "gate:story", title: "The gate's story", region: "moravia", from: {about: culprit.id, region: "moravia"}};
      const done = await X().writeBack(story, {key: "lost", label: "It wins", writes: [{to: "hunters", what: "Hunters gain a lead"}]}, [pc]);
      const files = api().hunters.state().regions?.moravia?.files ?? {};
      G.ok("5 write-back", !!files[culprit.id] && done.length > 0, {done, file: !!files[culprit.id]});
    });

    await G.step("6 language", async () => {
      const C = game.modules.get("wodx-chronicle")?.api?.languages;
      await X().projectDone(pc, {kind: "language", name: "Learn Latin"});
      G.ok("6 language", (C?.of?.(pc) ?? []).includes("Latin"), {languages: C?.of?.(pc)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [m, k] of KEEP ) if ( `${m}.${k}` in keep ) { try { await game.settings.set(m, k, keep[`${m}.${k}`]); } catch (e) { G.R.notes.push(`restore ${m}.${k}`); } }
    const extras = [...game.actors].filter(a => a.flags?.[MOD]?.extra && !extrasBefore.has(a.id)).map(a => a.id);
    if ( extras.length ) { try { await Actor.deleteDocuments(extras); } catch (e) { G.R.notes.push("extras"); } }
    return G.finish();
  }
}
