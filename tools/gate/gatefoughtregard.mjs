/**
 * A fight between an NPC and a player's character ends, and the NPC's regard for that character says so on the
 * Storyteller's view of the NPC's Relationships tab (npc.attitude), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatefoughtregard.mjs?${Date.now()}`)).run()
 * It makes its own scene, two actors and a fight, removes them, puts the Storyteller log back, and puts the clock back.
 *   1. a fight with a hostile NPC and a friendly player's character is ended (deleted, as the combat tracker's end does):
 *      the NPC's "How they regard the characters" names the character with "Fought them"
 * Result: Data/wodx-gate/gatefoughtregard-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatefoughtregard", {stepTimeout: 300000}); // saving actors and sheets in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sheet = null, combat = null;
  try {
    await G.step("1. the fight ends: the NPC's regard names the character with Fought them", async () => {
      const sc = await G.scene({width: 1500, height: 1000});
      const [pc, foe] = await G.make(Actor, [{name: "Gate Regard Character", type: "Mortal", ownership: {default: 3}}, {name: "Gate Regard Foe", type: "Mortal"}]);
      const [tPc, tFoe] = await G.tokens(sc, [{actor: pc, x: 3, y: 3, actorLink: true, disposition: 1}, {actor: foe, x: 5, y: 3, actorLink: true, disposition: -1}]);
      const playerOwned = game.actors.get(pc.id).hasPlayerOwner;
      // what the Storyteller saw before: no fight on record
      sheet = game.actors.get(foe.id).sheet;
      await sheet.render({force: true});
      const regard = () => el(sheet)?.querySelector(".tab.wodxties .wodx-tie-regard")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      await waitFor(() => el(sheet)?.querySelector(".tab.wodxties"), 30000);
      const before = regard();
      await sheet.close();
      // the trigger: a fight between them, ended
      combat = await Combat.create({scene: sc.id});
      await combat.createEmbeddedDocuments("Combatant", [tPc, tFoe].map(t => ({tokenId: t.id, sceneId: sc.id, actorId: t.actorId})));
      await combat.update({round: 1, turn: 0}); // under way, as after Begin Combat, without its opening rolls
      await combat.delete();
      combat = null;
      await waitFor(() => game.actors.get(foe.id)?.flags?.[MOD]?.fought?.[pc.id], 60000);
      // what the Storyteller sees now
      await sheet.render({force: true});
      await waitFor(() => /Fought them/.test(regard()), 30000);
      const after = regard();
      G.ok("1. the fight ends: the NPC's regard names the character with Fought them",
        playerOwned && !/Fought them/.test(before) && /Gate Regard Character/.test(after) && /Fought them/.test(after), {playerOwned, before, after, fought: game.actors.get(foe.id)?.flags?.[MOD]?.fought ?? null, met: Object.keys(game.actors.get(foe.id)?.flags?.[MOD]?.attitude ?? {})});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    try { if ( combat && game.combats.get(combat.id) ) await combat.delete(); } catch (e) { /* gone */ }
    for ( const n of ["Gate Regard Character", "Gate Regard Foe"] ) { const a = game.actors.getName(n); if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Regard/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
