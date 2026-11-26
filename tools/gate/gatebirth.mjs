/**
 * A pregnancy comes to term when the clock passes its due date (npc.family), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebirth.mjs?${Date.now()}`)).run()
 * It makes its own two parents, removes them, the child and their cards, puts the clock back and puts the
 * Storyteller log back.
 *   1. two adults start a safe pregnancy; with the due date a minute away, the clock moves two minutes: the birth
 *      card follows, the child's sheet is made with a newborn's Willpower, and the mother is lying in
 * Result: Data/wodx-gate/gatebirth-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gatebirth", {stepTimeout: 300000}); // making actors and saving cards in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let ids = [];
  const children = () => game.actors.filter(a => (a.flags?.[MOD]?.child?.parents ?? []).some(p => ids.includes(p)));
  try {
    await G.step("1. the clock passing the due date brings the birth and the child's sheet", async () => {
      const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 1197;
      const born = {chronology: {bornYear: year - 28}};
      const [mother, father] = await G.make(Actor, [
        {name: "Gate Birth Mother", type: "Mortal", flags: {"wodx-creation": {...born, sex: "f"}}},
        {name: "Gate Birth Father", type: "Mortal", flags: {"wodx-creation": {...born, sex: "m"}}}]);
      ids = [mother.id, father.id];
      const m = () => game.actors.get(mother.id);
      const F = game.modules.get(MOD).api.family;
      // the pregnancy (setup), safe so there is no birth roll, with the due date a minute from now
      const started = await F.conceive(m(), game.actors.get(father.id), {carrier: mother.id, safe: true});
      await waitFor(() => !!F.expecting(m()), 60000);
      const rec = F.expecting(m());
      if ( rec ) await m().setFlag(MOD, "expecting", {...rec, due: game.time.worldTime + 60});
      // the trigger: the clock passes the due date
      await game.time.advance(120);
      await waitFor(() => children().length && Number(children()[0].system?.advantages?.willpower?.permanent) === 1, 120000);
      await waitFor(() => game.messages.contents.slice(-20).some(x => /Gate Birth Mother gives birth/.test(x.content ?? "")), 60000);
      const kid = children()[0];
      const cardShown = game.messages.contents.slice(-20).some(x => /Gate Birth Mother gives birth/.test(x.content ?? ""));
      const lying = m()?.flags?.[MOD]?.lyingIn ?? null;
      G.ok("1. the clock passing the due date brings the birth and the child's sheet",
        !!started?.ok && !F.expecting(m()) && !!kid && Number(kid.system.advantages.willpower.permanent) === 1 && !!kid.flags?.[MOD]?.childSheet
          && cardShown && !!lying,
        {started: !!started?.ok, stillExpecting: !!F.expecting(m()), child: kid ? {name: kid.name, type: kid.type, willpower: kid.system.advantages?.willpower?.permanent, childSheet: !!kid.flags?.[MOD]?.childSheet} : null,
          card: cardShown, lyingIn: lying ? lying.label : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const a of [...children(), ...ids.map(id => game.actors.get(id)).filter(Boolean)] ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Birth|Child of Gate/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
