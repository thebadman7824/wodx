/**
 * Cults that give what they promise (B5960 to B5964), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecultgifts.mjs?${Date.now()}`)).run()
 * Turns cultsOn on for its run and writes three cults of its own into the cults setting, for a Demon, a Changeling and a
 * Wraith it makes (founders not NPCs, as a player's would be); puts both settings back. The clock does not move.
 *   1. a gathering of a Demon's devotees adds Faith to the founder's sheet, and the card says so
 *   2. a second gathering the same week gives nothing more, and the card says why
 *   3. a gathering of a Changeling's Dreamers adds Glamour
 *   4. a Wraith's circle of remembrance rolls its Memoriam at difficulty 8 and adds the successes as Pathos
 *   5. a week's serving puts the Background on a player founder's sheet (Followers for the Demon)
 * Result: Data/wodx-gate/gatecultgifts-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatecultgifts");
  const MOD = "wodx-npc";
  const keep = {on: game.settings.get(MOD, "cultsOn"), cults: foundry.utils.duplicate(game.settings.get(MOD, "cults"))};
  const msgs0 = new Set(game.messages.map(m => m.id));
  try {
    const api = game.modules.get(MOD)?.api?.cults;
    const [demon, fae, wraith] = await G.make(Actor, [
      {name: "WoDX gate: cult Demon", type: "Demon"}, {name: "WoDX gate: cult Changeling", type: "Changeling"}, {name: "WoDX gate: cult Wraith", type: "Wraith"}]);
    await demon.update({"system.advantages.faith.permanent": 6, "system.advantages.faith.temporary": 1});
    await fae.update({"system.advantages.glamour.permanent": 7, "system.advantages.glamour.temporary": 1});
    await wraith.update({"system.advantages.pathos.permanent": 0, "system.advantages.pathos.temporary": 0});
    const mk = (id, a, kind, members, ordained) => ({id, name: `WoDX gate: ${kind}`, kind, founder: {id: a.id, name: a.name, npc: false}, members, ordained, devotion: 3, place: null});
    await game.settings.set(MOD, "cultsOn", true);
    await game.settings.set(MOD, "cults", [...keep.cults, mk("gateThralls", demon, "thralls", 40, 4), mk("gateDreamers", fae, "dreamers", 8, 2), mk("gateRemember", wraith, "remembrance", 250, 3)]);
    const temp = (a, p) => Number(game.actors.get(a.id)?.system?.advantages?.[p]?.temporary) || 0;
    const newCard = re => game.messages.find(m => !msgs0.has(m.id) && re.test(m.content ?? ""));

    await G.step("1. a Demon's devotees give Faith", async () => {
      const got = await api.gather({cultId: "gateThralls"});
      await waitFor(() => temp(demon, "faith") > 1, 8000);
      G.ok("1. a Demon's devotees give Faith", temp(demon, "faith") === 5 && !!newCard(/wnpc-cult-gift/) && /Faith/.test(got?.gift ?? ""), {faith: temp(demon, "faith"), gift: got?.gift});
    });
    await G.step("2. once a week only", async () => {
      const got = await api.gather({cultId: "gateThralls"});
      G.ok("2. once a week only", temp(demon, "faith") === 5 && !got?.gift && !!newCard(/too soon/), {faith: temp(demon, "faith")});
    });
    await G.step("3. Dreamers give Glamour", async () => {
      const got = await api.gather({cultId: "gateDreamers"});
      await waitFor(() => temp(fae, "glamour") > 1, 8000);
      G.ok("3. Dreamers give Glamour", temp(fae, "glamour") === 6 && /Glamour/.test(got?.gift ?? ""), {glamour: temp(fae, "glamour"), gift: got?.gift});
    });
    await G.step("4. remembrance rolls for Pathos", async () => {
      const got = await api.gather({cultId: "gateRemember"});
      const m = /rolled ([\d, ]+) at difficulty 8/.exec(got?.gift ?? "");
      const faces = m ? m[1].split(",").map(Number) : [];
      const want = Math.max(0, faces.filter(f => f >= 8).length - faces.filter(f => f === 1).length);
      await waitFor(() => temp(wraith, "pathos") === want, 8000);
      G.ok("4. remembrance rolls for Pathos", faces.length === 4 && temp(wraith, "pathos") === want, {faces, pathos: temp(wraith, "pathos")});
    });
    await G.step("5. the Background on a player founder's sheet", async () => {
      const c = api.list().find(x => x.id === "gateThralls");
      const r = await api.serve(c);
      const bg = [...game.actors.get(demon.id).items].find(i => i.name === "Followers" && i.flags?.[MOD]?.fromCult === "gateThralls");
      G.ok("5. the Background on a player founder's sheet", Number(bg?.system?.value) === 4 && r.lines.some(l => /Followers 4/.test(l)), {value: bg?.system?.value, lines: r.lines});
    });
  } finally {
    try { await game.settings.set(MOD, "cults", keep.cults); await game.settings.set(MOD, "cultsOn", keep.on); } catch (e) { /* kept */ }
    const mine = game.messages.filter(m => !msgs0.has(m.id) && /wnpc-cult/.test(m.content ?? "")).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    return G.finish();
  }
}
