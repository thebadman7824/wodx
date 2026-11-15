/**
 * The Storyteller's Hand, round two (B5170-B5178), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehandleftovers.mjs?${Date.now()}`)).run()
 * Makes its own scene and characters and removes them; puts back the clock and the law heat.
 *   1. the api: wodx-library use.crashTick and sleptOff, wodx-interactables holyUnder and chase.pcMoved, wodx-npc strikeBacks
 *   2. a stimulant's crash comes due by itself (one die off every roll, with a card), and sleep marked in wodx-storyteller Hardship ends it
 *   3. a Martyr beside someone hurt gets the Take the wound card (wodx-chronicle signatures)
 *   4. a blackmailed mortal who strikes back by word raises the blackmailer's law heat (wodx-npc trust)
 *   5. Command from wodx-actions finds no hold on an Untamable target, with a note
 *   6. the desk picks as deployed: wodx-otherworlds draws the Labyrinth's time, wodx-library rolls a relic's holiness
 *      (the same each pick), wodx-creation loses a Fetter whose town was sacked
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
      {name: "Gate Leftovers Untamable", type: "Werewolf", prototypeToken: {actorLink: true}}]);
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
      // a wound from an attack card sends wodxDamageApplied (WoDX Combat); a bare api call does not, so the gate sends it
      const h = game.actors.get(hurt.id), r = await game.wodxCombat?.applyDamage?.(h, "bashing", 2);
      Hooks.callAll("wodxDamageApplied", h, {type: "bashing", levels: 2, before: r?.before, after: r?.after});
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

    await G.step("6 desk picks", async () => {
      const J = await import(`/modules/wodx-otherworlds/scripts/journey-rules.mjs?${Date.now()}`);
      const AR = await import(`/modules/wodx-creation/scripts/advance-rules.mjs?${Date.now()}`);
      const kit = api(LIB)?.wonders?.kitFor?.("hunter");
      const lab = J.REALM_TIME.labyrinth?.rule === "random" && J.timeOutside({realm: "labyrinth", hours: 2, slip: J.drawSlip(() => 0.95, "labyrinth")}).seconds === 2 * 3600 * 30;
      const m = {kind: "inquisitor", order: "Gate Order", name: "Gate Leftovers Wired", faithRating: 3, objects: [{id: "relic1", name: "A finger bone", type: "Item", wonder: ""}]};
      const row = kit?.rows?.().find(r => r.kind === "relic");
      const b1 = row ? kit.blockers(row, m, {target: "relic1"}) : null, b2 = row ? kit.blockers(row, m, {target: "relic1"}) : null;
      const relic = Array.isArray(b1) && JSON.stringify(b1) === JSON.stringify(b2) && !(kit.cautions(row, m) ?? []).some(c => /Storyteller judges/.test(c));
      const fetter = AR.placeGone("The well at Gatestadt", [{name: "Gatestadt", scars: [{kind: "sack", year: 1450}], history: []}], 1400, 1500)?.town === "Gatestadt";
      G.ok("6 desk picks", lab && relic && fetter, {lab, relic, fetter, blockers: b1});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    try { await game.settings.set(C, "lawHeat", heatWas); } catch (e) { G.R.notes.push("law heat"); }
    if ( game.time.worldTime !== clock ) { try { await game.time.advance(clock - game.time.worldTime); } catch (e) { G.R.notes.push("clock"); } }
    return G.finish();
  }
}
