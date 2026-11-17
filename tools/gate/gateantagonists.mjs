/**
 * Antagonist lines gate (B6670-B6700), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateantagonists.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, a Setite, a mortal, a Nephandus and a scratch faction, and removes them; puts back the
 * "Clan features (Vampire)" setting, the faction state and the scheme clocks; never moves the clock.
 *   1. the api: the Fall ledger, the scheme clocks and the antagonist table answer; Pentex serves no fomor before 1916
 *   2. three steps of a Setite's work: the mortal's attitude to the Setite rises a step, and the card names the
 *      harder resisting roll
 *   3. two more steps: a bond waits for the Storyteller, and approving it binds the mortal to the Setite as a cultist
 *   4. Prime sight on a scene with a Nephandus: a ring and a line for tainted Resonance; Penumbra sight shows none
 *   5. a Wyrm cult's scheme at its last step: a sign goes to everyone, the faction gains a Retainers dot and a goal,
 *      and the place it holds gains a cult source of corruption
 * Result: Data/wodx-gate/gateantagonists-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-chronicle", N = "wodx-npc";

export async function run() {
  const G = gate("gateantagonists");
  if ( G.notLive() ) return "Not on the Live world.";
  const sigWas = game.settings.get(C, "sigVampire");
  const npc = () => game.modules.get(N)?.api;
  const sigs = () => game.modules.get(C)?.api?.signatures;
  const factionsWas = foundry.utils.deepClone(game.settings.get(N, "factions"));
  let schemesWas = null; try { schemesWas = foundry.utils.deepClone(game.settings.get(N, "schemes")); } catch (e) { schemesWas = null; }
  const t0 = Date.now();
  try {
    await game.settings.set(C, "sigVampire", true);
    const scene = await G.scene();
    const [setite, mark, neph, seer] = await G.make(Actor, [
      {name: "Gate Antagonists Setite", type: "Vampire", system: {clan: "custom", custom: {clan: "Followers of Set"}, generation: 12}},
      {name: "Gate Antagonists Mark", type: "Mortal"},
      {name: "Gate Antagonists Nephandus", type: "Mortal", flags: {[C]: {antagonist: "nephandi"}}},
      {name: "Gate Antagonists Seer", type: "Mortal"}]);
    await G.tokens(scene, [{actor: neph, x: 5, y: 5}, {actor: seer, x: 8, y: 5}]);

    await G.step("1. the api", async () => {
      const sw = npc()?.servants?.world?.rules ?? null;
      const p15 = sw?.wyrmMaster ? (sw.wyrmMaster([{id: "p", kind: "pentex"}], {year: 1915}) ?? null) : "missing";
      const p16 = sw?.wyrmMaster?.([{id: "p", kind: "pentex"}], {year: 1916})?.id ?? null;
      G.ok("1. the api", typeof sigs()?.work === "function" && typeof npc()?.schemes?.applyStep === "function" && p15 === null && p16 === "p", {p15, p16});
    });

    await G.step("2. step three warms the victim and hardens the resisting roll", async () => {
      const before = npc().attitude.of(mark, setite)?.step ?? 0;
      await sigs().work(mark, setite, 3, "a gate's three wins");
      await waitFor(() => sigs().corruption(mark)[setite.id]?.step === 3);
      await waitFor(() => (npc().attitude.of(mark, setite)?.step ?? 0) > before, 8000);
      const after = npc().attitude.of(mark, setite)?.step ?? 0;
      const card = game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("Gate Antagonists Mark")).at(-1);
      G.ok("2. step three warms the victim and hardens the resisting roll", sigs().corruption(mark)[setite.id]?.step === 3 && after === before + 1 && /\+3 difficulty/.test(card?.content ?? ""),
        {before, after, card: card?.content?.slice(0, 300)});
    });

    await G.step("3. the last step binds the victim", async () => {
      await sigs().work(mark, setite, 2, "a gate's two more");
      await waitFor(() => sigs().corruption(mark)[setite.id]?.step === 5);
      const chron = game.modules.get(C).api;
      let entry = null;
      await waitFor(() => (entry = chron.approvals.pending().find(e => e.type === `${C}.fallBind` && e.data?.npc === mark.id)), 8000);
      if ( entry ) await chron.approvals.decide(entry.id, "approve");
      await waitFor(() => npc().servants.records(game.actors.get(mark.id)).some(r => r.master === setite.id && r.kind === "cult"), 8000);
      const recs = npc().servants.records(game.actors.get(mark.id));
      G.ok("3. the last step binds the victim", recs.some(r => r.master === setite.id && r.kind === "cult"), {entry: entry?.title, recs: recs.map(r => `${r.kind}:${r.step}`)});
    });

    await G.step("4. Prime sight catches the Nephandus", async () => {
      const S = await import(`/modules/wodx-senses/scripts/otherworld-sight.mjs`);
      const layer = new PIXI.Graphics(), other = new PIXI.Graphics();
      const lines = S.drawOther(layer, "prime", seer) ?? [];
      const pen = S.drawOther(other, "penumbra", seer) ?? [];
      layer.destroy({children: true}); other.destroy({children: true});
      G.ok("4. Prime sight catches the Nephandus", lines.some(l => /tainted Resonance/.test(l)) && !pen.some(l => /tainted Resonance/.test(l)), {lines, pen});
    });

    await G.step("5. a finished scheme changes the world", async () => {
      const F = npc().factions, id = `gate-${G.run}`.slice(0, 40);
      await F.applyNow([{op: "faction-add", faction: {id, name: "Gate Antagonists Wyrm cult", kind: "other", places: [scene.id], assets: {retainers: 1}}}]);
      await npc().schemes.setClock(id, {group: "wyrm", step: 3});
      const res = await npc().schemes.applyStep({faction: id, group: "wyrm"});
      const f = F.state().factions.find(x => x.id === id);
      const place = game.modules.get("wodx-otherworlds")?.api?.corruption?.of?.(game.scenes.get(scene.id)) ?? null;
      const sign = game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wnpc-scheme")).at(-1);
      G.ok("5. a finished scheme changes the world", res?.finished && f?.assets?.retainers === 2 && f?.goals?.some(g => g.move === "expand")
        && (place?.sources ?? []).some(s => s.kind === "cult") && !sign?.whisper?.length,
        {res, retainers: f?.assets?.retainers, goals: f?.goals, sources: place?.sources, sign: sign?.content?.slice(0, 200)});
    });
  } catch (e) { G.R.errors.push(String(e?.stack ?? e)); }
  finally {
    try { await game.settings.set(C, "sigVampire", sigWas); } catch (e) { /* put back */ }
    try { await game.settings.set(N, "factions", factionsWas); } catch (e) { /* put back */ }
    try { await game.settings.set(N, "schemes", schemesWas ?? {}); } catch (e) { /* put back */ }
    return G.finish();
  }
}
