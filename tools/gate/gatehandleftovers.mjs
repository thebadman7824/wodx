/**
 * The Storyteller's Hand, round two (B5170-B5178), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehandleftovers.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the clock and the law heat.
 *   1. the api: wodx-library use.crashTick and sleptOff, wodx-interactables holyUnder and chase.pcMoved, wodx-npc strikeBacks
 *   2. a stimulant's crash comes due by itself (one die off every roll, with a card), and sleep marked in wodx-storyteller Hardship ends it
 *   3. a Martyr beside someone hurt gets the Take the wound card (wodx-chronicle signatures)
 *   4. a blackmailed mortal who strikes back by word raises the blackmailer's law heat (wodx-npc trust)
 *   5. Command from wodx-actions finds no hold on an Untamable target, with a note
 * Result: Data/wodx-gate/gatehandleftovers-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const LIB = "wodx-library", ACT = "wodx-actions", IX = "wodx-interactables", NPC = "wodx-npc", C = "wodx-chronicle";

export async function run() {
  const G = gate("gatehandleftovers");
  if ( G.notLive() ) return "Not on the Live world.";
  const api = id => game.modules.get(id)?.api;
  const clock = game.time.worldTime;
  const heatWas = foundry.utils.deepClone(game.settings.get(C, "lawHeat"));
  try {
    const scene = await G.scene();
    const [user, martyr, hurt, mark, blackmailer, wolf] = await G.make(Actor, [
      {name: "Gate Leftovers Wired", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Leftovers Martyr", type: "Hunter", system: {creed: "Martyr"}, prototypeToken: {actorLink: true}},
      {name: "Gate Leftovers Hurt", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Leftovers Mark", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Leftovers Blackmailer", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate Leftovers Untamable", type: "Mortal", prototypeToken: {actorLink: true}}]);
    await wolf.createEmbeddedDocuments("Item", [{name: "Untamable", type: "Feature", system: {type: "wod.types.merit", value: 6}}]);
    await G.tokens(scene, [{actor: martyr, x: 3, y: 3}, {actor: hurt, x: 4, y: 3}, {actor: blackmailer, x: 9, y: 9}]);

    await G.step("1 api", async () => {
      G.ok("1 api", typeof api(LIB)?.use?.crashTick === "function" && typeof api(LIB)?.use?.sleptOff === "function"
        && typeof api(IX)?.holyUnder === "function" && typeof api(IX)?.chase?.pcMoved === "function" && typeof api(NPC)?.trust?.strikeBacks === "function");
    });

    await G.step("2 crash", async () => {
      const key = "wodx-trait-bite:intox:stimulant:crash";
      await user.setFlag(LIB, "crash", {at: game.time.worldTime - 1, lasts: 3600});
      const before = game.messages.size;
      const hit = await api(LIB).use.crashTick(game.time.worldTime);
      const fx = () => (game.actors.get(user.id)?.effects ?? []).filter(e => e.flags?.[C]?.timed?.key === key).length;
      const card = await waitFor(() => [...game.messages].slice(before).some(m => /crashes/.test(m.content ?? "")), 4000);
      const had = fx();
      await api("wodx-storyteller").hardship.mark(game.actors.get(user.id), ["sleep"]);
      G.ok("2 crash", hit.includes(user.id) && had === 1 && !!card && fx() === 0 && !game.actors.get(user.id)?.getFlag(LIB, "crash"), {hit, had, card: !!card, after: fx()});
    });

    await G.step("3 martyr", async () => {
      const before = game.messages.size;
      await game.wodxCombat?.applyDamage?.(game.actors.get(hurt.id), "bashing", 2);
      const card = await waitFor(() => [...game.messages].slice(before).some(m => /can take the wound/.test(m.content ?? "")), 5000);
      G.ok("3 martyr", !!card, {card: !!card, combat: !!game.wodxCombat});
    });

    await G.step("4 blackmail heat", async () => {
      await mark.setFlag(NPC, "strikeBack", {at: blackmailer.id});
      const out = await api(NPC).trust.strikeBacks();
      const row = out.find(r => r.of === mark.id);
      const heat = api(C)?.law?.heat?.of?.(blackmailer.id, undefined);
      const any = Object.values(game.settings.get(C, "lawHeat")?.regions ?? {}).some(r => (r?.[blackmailer.id]?.deeds ?? []).some?.(d => (d?.deed ?? d) === "extortion") || !!r?.[blackmailer.id]);
      G.ok("4 blackmail heat", !!row && row.means !== "attack" && row.heat === true && any, {row, heat: heat?.heat ?? null});
    });

    await G.step("5 untamable", async () => {
      const r = await api(ACT)?.effects?.apply?.({target: game.actors.get(wolf.id).uuid, out: {kind: "timed", label: "Command", name: "Command"}}, "Gate Leftovers Wired");
      G.ok("5 untamable", /Untamable/.test(r?.note ?? ""), {r});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    try { await game.settings.set(C, "lawHeat", heatWas); } catch (e) { G.R.notes.push("law heat"); }
    if ( game.time.worldTime !== clock ) { try { await game.time.advance(clock - game.time.worldTime); } catch (e) { G.R.notes.push("clock"); } }
    return G.finish();
  }
}
