/**
 * NPCs make their own wonders (B5970 to B5974), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenpcmakers.mjs?${Date.now()}`)).run()
 * Makes a Tremere NPC who knows the Principal Focus of Vitae Infusion and the Blood Contract, and a second NPC Tremere without any ritual; turns
 * craftKindred on for the run. The clock does not move: the monthly look is forced, and the work is finished through
 * the wodxTaskDone hook the long tasks fire.
 *   1. the monthly look starts the able NPC's work as a long task, with no approval card, and tells the Storyteller
 *   2. the NPC who cannot make anything starts nothing, and a busy maker is not given a second piece of work
 *   3. the finished work puts the item on the NPC's sheet
 *   4. with the setting off, the monthly look does nothing unless forced
 * Result: Data/wodx-gate/gatenpcmakers-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatenpcmakers");
  const LIB = "wodx-library", ST = "wodx-storyteller";
  for ( let i = 0; i < 120 && !(game.modules.get(LIB)?.api?.wonders && game.modules.get(ST)?.api?.wonders); i++ ) await new Promise(r => setTimeout(r, 250));
  const S = game.modules.get(ST)?.api?.wonders;
  const keep = {kindred: game.settings.get(LIB, "craftKindred"), on: game.settings.get(ST, "npcMakers")};
  const msgs0 = new Set(game.messages.map(m => m.id));
  const pending0 = new Set((game.modules.get("wodx-chronicle")?.api?.approvals?.pending?.() ?? []).map(p => p.id));
  try {
    await game.settings.set(LIB, "craftKindred", true);
    await game.settings.set(ST, "npcMakers", true);
    const power = (name, type, value = 0) => ({name, type: "Power", system: {type, value}});
    const sys = {"system.advantages.bloodpool.temporary": 10, "system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 5, "system.attributes.intelligence.value": 3, "system.abilities.occult.value": 3};
    const [able, unable] = await G.make(Actor, [{name: "WoDX gate: maker Tremere", type: "Vampire"}, {name: "WoDX gate: no rituals", type: "Vampire"}]);
    await able.update(sys); await unable.update(sys);
    // Vitae Infusion is a V20 ritual and the Blood Contract is in both books, so the maker has work in any era
    await able.createEmbeddedDocuments("Item", [power("Thaumaturgy", "wod.types.discipline", 5), power("Principal Focus of Vitae Infusion", "wod.types.ritual"), power("Blood Contract", "wod.types.ritual")]);
    const tasksOf = a => Object.values(game.actors.get(a.id)?.flags?.[ST]?.tasks ?? {}).filter(t => t?.wonder);
    let started = [];

    await G.step("1. the monthly look starts the work", async () => {
      started = await S.npcMonth({force: true, rand: () => 0, only: [able.id, unable.id]});
      const t = tasksOf(able)[0];
      const card = await waitFor(() => game.messages.some(m => !msgs0.has(m.id) && /wst-npc-makers/.test(m.content ?? "") && m.content.includes(able.name)), 8000);
      const asked = (game.modules.get("wodx-chronicle")?.api?.approvals?.pending?.() ?? []).some(p => !pending0.has(p.id) && p.data?.actorId === able.id);
      G.ok("1. the monthly look starts the work", started.length === 1 && started[0].actor === able.id && !!t && t.approved !== false && card && !asked, {started, task: t?.name, asked});
    });
    await G.step("2. nothing for the unable or the busy", async () => {
      const again = await S.npcMonth({force: true, rand: () => 0, only: [able.id, unable.id]});
      G.ok("2. nothing for the unable or the busy", again.length === 0 && tasksOf(unable).length === 0 && tasksOf(able).length === 1, {again});
    });
    await G.step("3. the finished work lands on the sheet", async () => {
      const id = started[0]?.taskId;
      const raw = game.actors.get(able.id)?.flags?.[ST]?.tasks?.[id];
      const before = new Set(game.actors.get(able.id).items.map(i => i.id));
      Hooks.callAll("wodxTaskDone", {actor: game.actors.get(able.id), task: {...raw, id, status: "done", total: 3}});
      await waitFor(() => !!game.actors.get(able.id)?.flags?.[ST]?.tasks?.[id]?.made, 8000);
      const fresh = game.actors.get(able.id).items.filter(i => !before.has(i.id));
      G.ok("3. the finished work lands on the sheet", fresh.length > 0, {made: fresh.map(i => i.name)});
    });
    await G.step("4. off means off", async () => {
      await game.settings.set(ST, "npcMakers", false);
      const none = await S.npcMonth({rand: () => 0, only: [able.id]});
      G.ok("4. off means off", none.length === 0, {});
    });
  } finally {
    try { await game.settings.set(LIB, "craftKindred", keep.kindred); await game.settings.set(ST, "npcMakers", keep.on); } catch (e) { /* kept */ }
    const mine = game.messages.filter(m => !msgs0.has(m.id) && /wst-wonder-card/.test(m.content ?? "")).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    return G.finish();
  }
}
