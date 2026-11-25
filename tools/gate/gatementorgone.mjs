/**
 * A teacher's death frees the student's Mentor points, moved from the card's own button (npc.legacy), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatementorgone.mjs?${Date.now()}`)).run()
 * It makes its own teacher and student and removes them and their cards, and puts the Storyteller log back.
 *   1. a student with Mentor 3 and Resources 1 is taught by a teacher; the teacher's sheet records a death, and the
 *      card that follows takes Mentor to 0; choosing Resources on the card and pressing its Move button makes
 *      Resources 4 on the student's sheet
 * Result: Data/wodx-gate/gatementorgone-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const valueOf = (a, name) => Number(a?.items?.find(i => i.name === name)?.system.value);

export async function run() {
  const G = gate("gatementorgone", {stepTimeout: 240000}); // making actors and saving cards in a big world can take minutes
  const since = Date.now();
  // WoDX Storyteller logs the student's cards and the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let ids = [];
  try {
    await G.step("1. the Move button on the teacher's death card puts the Mentor points on another Background", async () => {
      const [teacher, student] = await G.make(Actor, [{name: "Gate Mentor Teacher", type: "Mortal"},
        {name: "Gate Mentor Student", type: "Mortal", items: [
          {name: "Mentor", type: "Feature", system: {type: "wod.types.background", value: 3}},
          {name: "Resources", type: "Feature", system: {type: "wod.types.background", value: 1}}]}]);
      ids = [teacher.id, student.id];
      const s = () => game.actors.get(student.id);
      // the teaching (setup): the student's tie to the teacher as mentor
      await game.modules.get("wodx-npc").api.legacy.teach(teacher, student, {what: "Academics", dots: 1, months: 1});
      await waitFor(() => (s().flags?.["wodx-sheets"]?.ties ?? []).some(t => t.role === "mentor"), 30000);
      // the teacher dies on their own sheet (the chronology the Creation window keeps)
      await game.actors.get(teacher.id).update({"flags.wodx-creation.chronology.died": game.time.worldTime});
      await waitFor(() => valueOf(s(), "Mentor") === 0, 60000);
      const freed = valueOf(s(), "Mentor");
      // the card's own control, drawn in the chat log
      const btn = () => document.querySelector(`#chat-log [data-wnpc-mentor="${student.id}"], .chat-log [data-wnpc-mentor="${student.id}"]`);
      await waitFor(btn, 60000);
      const b = btn(), pick = b?.closest("p")?.querySelector("select[name=to]");
      const res = s().items.find(i => i.name === "Resources");
      if ( pick && res ) { pick.value = res.id; pick.dispatchEvent(new Event("change", {bubbles: true})); }
      b?.click();
      await waitFor(() => valueOf(s(), "Resources") === 4, 60000);
      G.ok("1. the Move button on the teacher's death card puts the Mentor points on another Background",
        freed === 0 && !!b && !!pick && valueOf(s(), "Resources") === 4,
        {mentorAfterDeath: freed, button: !!b, choice: !!pick, resources: valueOf(s(), "Resources")});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const id of ids ) { try { await game.actors.get(id)?.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const m of game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && /Gate Mentor/.test(`${m.speaker?.alias ?? ""} ${m.content ?? ""}`)) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
