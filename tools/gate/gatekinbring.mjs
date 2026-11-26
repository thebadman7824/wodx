/**
 * A character's family line in the Family and lineage window: its living members are listed, and Bring into play makes
 * one of them a sheet that opens for the Storyteller (npc.kin), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatekinbring.mjs?${Date.now()}`)).run()
 * It makes its own founder, a line kept since twenty years ago and grown to this year, and removes them, puts the
 * family lines setting back, and never moves the clock.
 *   1. Bring into play on a living member in the tree: that member's own sheet opens with their name, and the tree
 *      now links them
 * Result: Data/wodx-gate/gatekinbring-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatekinbring", {stepTimeout: 240000});
  const since = Date.now();
  const lines = foundry.utils.deepClone(game.settings.get(MOD, "familyLines"));
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const N = game.modules.get(MOD).api;
  let brought = null, sheet = null;
  try {
    await G.step("1. Bring into play in the tree: the member's own sheet opens", async () => {
      const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0;
      const founder = await G.make(Actor, {name: "Gate Kin Founder Novak", type: "Mortal", ownership: {default: 3},
        flags: {"wodx-creation": {chronology: {bornYear: year - 35}}}});
      // setup: a line kept since twenty years ago, grown to this year
      const line = await N.kin.start(founder, {year: year - 20});
      await N.kin.grow(year, {only: line.id});
      const living = N.kin.descendants(founder);
      // the Storyteller opens the founder's Family and lineage window
      N.openTree(founder);
      const win = () => el(winTitled(/^Family and lineage: Gate Kin Founder/));
      const bringBtn = () => win()?.querySelector(`[data-kin-bring^="${line.id}:"]`) ?? null;
      await waitFor(bringBtn, 30000);
      const listed = win()?.querySelectorAll("[data-kin-bring]")?.length ?? 0;
      const [, memberId] = String(bringBtn()?.dataset.kinBring ?? ":").split(":");
      // the trigger: Bring into play
      bringBtn()?.click();
      const actorOf = () => { const m = N.kin.lineOf(founder)?.members?.find(x => x.id === memberId); return m?.actorId ? game.actors.get(m.actorId) : null; };
      await waitFor(() => actorOf()?.sheet?.rendered, 60000);
      brought = actorOf();
      sheet = brought?.sheet;
      const shownName = (el(sheet)?.querySelector('input[name="name"]')?.value ?? el(sheet)?.querySelector(".window-title")?.textContent ?? "").trim();
      await waitFor(() => win()?.querySelector(`[data-open="${brought?.id}"]`), 30000);
      const linked = !!win()?.querySelector(`[data-open="${brought?.id}"]`);
      G.ok("1. Bring into play in the tree: the member's own sheet opens", living.length > 0 && listed > 0 && !!brought && sheet?.rendered && shownName.includes(brought.name) && linked,
        {living: living.length, listed, brought: brought?.name ?? null, shownName, linked, kin: brought?.flags?.[MOD]?.kin?.relation ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    const w = winTitled(/^Family and lineage: Gate Kin Founder/);
    if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    try { if ( brought && game.actors.get(brought.id) ) await brought.delete(); } catch (e) { G.R.notes.push(`member: ${e?.message ?? e}`); }
    const a = game.actors.getName("Gate Kin Founder Novak");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    try { await game.settings.set(MOD, "familyLines", lines); } catch (e) { G.R.notes.push(`lines: ${e?.message ?? e}`); }
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Kin/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
