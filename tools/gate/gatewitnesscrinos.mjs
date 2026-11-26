/**
 * WoDX gate: a mortal who sees a war form reacts on the map (actions.witness, B4869, the Delirium W20 p. 263), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewitnesscrinos.mjs?${Date.now()}`)).run()
 * Makes its own scene, a figure drawn as a war form and a mortal of Willpower 1, and removes them; never moves the clock.
 *   1. the war form walks into the mortal's sight; the mortal falls still (Catatonic fear) on the map, and the
 *      Storyteller's Witnesses card says so
 * Result: Data/wodx-gate/gatewitnesscrinos-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatewitnesscrinos", {stepTimeout: 120000});
  const msgs = new Set();
  const t0 = Date.now();
  try {
    await game.settings.set(MOD, "autoDelirium", true);
    try { await game.settings.set(MOD, "autoWitness", true); } catch {}
    // a world can set a longer witness range or another grid distance: this run sees 60 feet at 5 feet a square
    await game.settings.set(MOD, "witnessRange", 60);
    const s = await G.scene({width: 2400, height: 1600, grid: {size: 100, distance: 5}});
    const [beast, seer] = await G.make(Actor, [
      {name: "Gate Witness War Form", type: "Mortal"},
      {name: "Gate Witness Onlooker", type: "Mortal"}]);
    await seer.update({"system.advantages.willpower.permanent": 1, "system.advantages.willpower.temporary": 1});
    // just out of sight: 60 feet is 1,200 px on this grid, and they stand 13 squares apart; a short walk, so the
    // move has finished drawing when the witness check looks (it looks 0.6 s after the move)
    const [bt, st] = await G.tokens(s, [{actor: beast, x: 8, y: 13, actorLink: true}, {actor: seer, x: 21, y: 13, actorLink: true}]);
    await waitFor(() => bt.object && st.object, 10000);
    await bt.setFlag("wodx-paperdoll", "sprite", "garou-crinos");
    await new Promise(r => setTimeout(r, 2500));
    // the witness step's mark, "Frozen with fear" (the immobilized condition), drawn on the onlooker's token
    const still = () => !!canvas.tokens.get(st.id)?.actor?.effects?.some?.(e => e.name === "Frozen with fear" && !e.disabled && [...(e.statuses ?? [])].some(x => /immobilized/.test(x)));
    const card = () => game.messages.contents.filter(m => m.timestamp >= t0 && /Witnesses: Gate Witness War Form/.test(m.content ?? "")).at(-1) ?? null;

    await G.step("1. the war form walks into sight and the mortal falls still", async () => {
      const before = {still: still(), card: !!card()};
      await canvas.tokens.get(bt.id).document.update({x: 1700, y: 1300});
      await waitFor(() => still() && card(), 90000);
      const c = card();
      if ( c ) msgs.add(c.id);
      const row = (c?.content ?? "").match(/<li>.*?Gate Witness Onlooker.*?<\/li>/)?.[0]?.replace(/<[^>]+>/g, "") ?? "";
      G.ok("1. the war form walks into sight and the mortal falls still",
        !before.still && !before.card && still() && /Catatonic fear/i.test(row) && /falls still/.test(row) && c?.whisper?.every?.(id => game.users.get(id)?.isGM),
        {before, still: still(), row, marks: canvas.tokens.get(st.id)?.actor?.effects?.map?.(e => `${e.name} [${[...(e.statuses ?? [])].join(",")}]`), grid: [canvas.scene?.grid?.size, canvas.scene?.grid?.distance, game.settings.get(MOD, "witnessRange")],
          sees: (() => { try { return game.modules.get(MOD)?.api?.witnessesOf?.(canvas.tokens.get(bt.id), {profiles: ["mortal"]})?.map?.(t => t.name); } catch (e) { return `${e?.message ?? e}`; } })(),
          at: [canvas.tokens.get(bt.id)?.document?.x, canvas.tokens.get(bt.id)?.document?.y]});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try {
      for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate Witness (War Form|Onlooker)/.test(m.content ?? "")) ) msgs.add(m.id);
      if ( msgs.size ) await ChatMessage.deleteDocuments([...msgs].filter(id => game.messages.get(id)));
    } catch (e) { G.R.notes.push(`messages: ${e?.message ?? e}`); }
    return G.finish();
  }
}
