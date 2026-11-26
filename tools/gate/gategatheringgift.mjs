/**
 * A demon's cult gathers from the "Your following" window, and the founder reaps Faith from it on the sheet
 * (npc.cults), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategatheringgift.mjs?${Date.now()}`)).run()
 * It makes its own demon and cult, removes them, puts the cult settings and the Storyteller log back, and never
 * moves the clock.
 *   1. Hold a gathering in the founder's Following window: a cult of personality with three in its inner circle
 *      (Followers 3, Demon: The Fallen p. 155) gives three Faith, and the founder's Faith on the sheet rises by three
 * Result: Data/wodx-gate/gategatheringgift-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gategatheringgift", {stepTimeout: 300000}); // saving actors and cards in a big world can take minutes
  const since = Date.now();
  // the cults list and its switch are world settings; WoDX Storyteller logs the removals: all put back at the end
  const keep = {cults: foundry.utils.deepClone(game.settings.get(MOD, "cults")), on: game.settings.get(MOD, "cultsOn"),
    log: foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"))};
  let win = null;
  try {
    await G.step("1. Hold a gathering: the founder's Faith rises by the cult's Followers", async () => {
      const founder = await G.make(Actor, {name: "Gate Gathering Founder", type: "Demon", ownership: {default: 3}});
      await founder.update({"system.advantages.faith.permanent": 6, "system.advantages.faith.temporary": 1});
      const faith = () => Number(game.actors.get(founder.id)?.system.advantages?.faith?.temporary) || 0;
      const before = faith();
      // setup: cults on, and a cult of personality with three in its inner circle, never gathered
      const id = foundry.utils.randomID();
      await game.settings.set(MOD, "cultsOn", true);
      await game.settings.set(MOD, "cults", [...(keep.cults ?? []), {id, name: "Gate Gathering Cult", kind: "thralls", founder: {id: founder.id, name: founder.name},
        place: {key: "gate-gathering-chapel", name: "the gate chapel"}, members: 12, devotion: 3, ordained: 3, founded: game.time.worldTime, lastGift: 0}]);
      // the trigger: Hold a gathering in the founder's Following window
      win = game.modules.get(MOD).api.cults.open(founder);
      const btn = () => document.querySelector(`.wnpc-cults-dialog button[data-gather="${id}"]`);
      await waitFor(btn, 30000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => faith() !== before, 60000);
      const after = faith();
      G.ok("1. Hold a gathering: the founder's Faith rises by the cult's Followers", pressed && before === 1 && after === 4,
        {pressed, before, after, faith: game.actors.get(founder.id)?.system.advantages?.faith ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { const w = await win; await w?.close?.(); } catch (e) { /* closed */ }
    for ( const w of foundry.applications.instances.values() ) { if ( w.element?.classList?.contains("wnpc-cults-dialog") ) { try { await w.close(); } catch (e) { /* closed */ } } }
    const a = game.actors.getName("Gate Gathering Founder");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Gathering/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set(MOD, "cults", keep.cults); await game.settings.set(MOD, "cultsOn", keep.on); } catch (e) { G.R.notes.push(`cults: ${e?.message ?? e}`); }
    try { await game.settings.set("wodx-storyteller", "log", keep.log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
