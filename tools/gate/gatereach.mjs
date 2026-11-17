/**
 * The world's own hand gate (B4860-B4868), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatereach.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters, removes them and any quick-extra actor it made, and puts back the settings it
 * touches (law heat, hunters, rumours, the world's hand, the fight starter) and the clock.
 *   1. the api: reach, the law stage hook, Chronicle's start level never moves the Live world
 *   2. a road encounter of two bandits puts two visible bandit tokens beside the traveller
 *   3. the law comes for an NPC culprit: the watch arrive, the culprit goes with them (arrested), the watch's tokens leave
 *      and the culprit's token is hidden and marked as taken, held for the court (B6165, B6488), not deleted
 *   3b. a death sentence on that culprit, held by the watch: the token is shown again at the gallows and the watch come
 *      to it there to carry out the sentence (B6667)
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
      // B6165: the culprit's token stays on the scene, hidden and marked lawTaken, so time served or a verdict can bring it back
      const taken = () => scene.tokens.get(tcul.id);
      await waitFor(() => taken()?.hidden && taken()?.flags?.[MOD]?.lawTaken, 4000);
      const e = Object.values(L.state().regions ?? {}).map(reg => reg[culprit.id]).find(Boolean);
      const left = [...scene.tokens].filter(t => t.flags?.[MOD]?.reach?.target === culprit.id);
      const held = !!taken() && taken().hidden === true && !!X().takenBy?.(taken()) && !X().whereIs?.(culprit.id);
      G.ok("3 law", r === "yield" && held && !!e?.arrested && !left.length,
        {answer: r, arrested: e?.arrested ?? null, left: left.length, token: taken() ? {hidden: taken().hidden, lawTaken: taken().flags?.[MOD]?.lawTaken ?? null} : null});
    });

    await G.step("3b death sentence in custody", async () => {
      // B6667: the culprit step 3 left in the watch's hands (hidden, lawTaken) is condemned by the court's real path
      // (Chronicle's sentence, which calls lawCome): the token is shown again at the gallows and the watch stand by it
      const chron = game.modules.get("wodx-chronicle")?.api;
      await scene.createEmbeddedDocuments("Region", [{name: "Gate Reach Gallows", color: "#552222", shapes: [{type: "rectangle", x: 600, y: 900, width: 300, height: 300, rotation: 0, hole: false}]}]);
      const year = chron?.eras?.currentYear?.() ?? 1197;
      await chron.law.sentence.pass({actorId: culprit.id, name: culprit.name, region: "moravia", year, weight: 8}, "hanging");
      const t = () => scene.tokens.get(tcul.id);
      await waitFor(() => t() && !t().hidden, 6000);
      const atGallows = !!t() && t().x >= 600 && t().x < 900 && t().y >= 900 && t().y < 1200;
      const watch = [...scene.tokens].filter(x => x.flags?.[MOD]?.reach?.target === culprit.id && x.flags?.[MOD]?.reach?.mode === "sentence");
      G.ok("3b shown at the gallows", !!t() && !t().hidden && !t().flags?.[MOD]?.lawTaken && atGallows,
        {token: t() ? {x: t().x, y: t().y, hidden: t().hidden, lawTaken: t().flags?.[MOD]?.lawTaken ?? null} : null});
      G.ok("3b the watch carry out the sentence there", watch.length > 0 && watch.every(x => !x.hidden),
        {watch: watch.length, dead: !!culprit.statuses?.has?.("dead")});
      if ( watch.length ) await scene.deleteEmbeddedDocuments("Token", watch.map(x => x.id));
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
