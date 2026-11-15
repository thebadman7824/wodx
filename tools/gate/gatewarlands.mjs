/**
 * War beyond Europe (B5900 to B5910, the Armies and Ships Desk), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewarlands.mjs?${Date.now()}`)).run()
 * Starts a siege, a battle and a fight at sea through the API in lands other than Moravia, opens the windows, then
 * removes them. The clock does not move.
 *   1. a siege in Aotearoa in 1700 starts with a pā for walls, and its campaign window offers the pā first
 *   2. a battle in Mexico in 1500 is fought in the land's own age (no guns), and its window says so
 *   3. the battle setup for Japan in 1560 offers the land's troops first, with the land picked
 *   4. a fight at sea off Korea in 1595 can be fought by turtle ships, and the window offers a navigator of these seas off the Pacific islands
 *   5. a battle with the homeland's land (Moravia) keeps Europe's age
 * Result: Data/wodx-gate/gatewarlands-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatewarlands");
  const st = () => game.modules.get("wodx-storyteller")?.api;
  const battles = [], fights = [];
  const before = new Set(game.messages.map(m => m.id));
  const win = prefix => [...foundry.applications.instances.values()].find(a => String(a.id ?? "").startsWith(prefix) && a.rendered);
  try {
    const A = st();
    await G.step("1. a siege in Aotearoa starts behind a pā", async () => {
      const b = await A.battles.start({kind: "siege", name: "WoDX gate: the pā", land: "aotearoa", year: 1700, sides: [{name: "Gate taua"}, {name: "Gate pā", position: "town"}]});
      battles.push(b.id);
      const W = A.siegeWorks.rules;
      const c = W.blankCampaign(A.battles.get(b.id));
      const walls = W.wallsFor(1700, "aotearoa");
      G.ok("1. a siege in Aotearoa starts behind a pā", A.battles.get(b.id).land === "aotearoa" && c.wall.type === "pa" && walls[0].id === "pa", {wall: c.wall.type, first: walls[0]?.id});
    });
    await G.step("2. a battle in Mexico in 1500 has the land's own age", async () => {
      const b = await A.battles.start({name: "WoDX gate: the causeway", land: "mexico", year: 1500, sides: [{name: "Gate eagles", units: {jaguarWarriors: 3}}, {name: "Gate city", units: {slingers: 2}}]});
      battles.push(b.id);
      await A.battles.open(b.id);
      await waitFor(() => win("wodx-battles")?.element?.textContent?.includes("Obsidian"), 8000);
      const text = win("wodx-battles")?.element?.textContent ?? "";
      const age = A.battles.rules.ageFor(1500, {land: "mexico"});
      G.ok("2. a battle in Mexico in 1500 has the land's own age", age.guns === false && /Obsidian/.test(text), {age: age.id, text: text.slice(0, 300)});
      await win("wodx-battles")?.close?.();
    });
    await G.step("3. the setup for Japan offers the land's troops first", async () => {
      const b = await A.battles.start({name: "WoDX gate: the castle town", land: "japan", year: 1560, sides: [{name: "Gate west"}, {name: "Gate east"}]});
      battles.push(b.id);
      const p = A.battles.setup({id: b.id});
      let dlg = null;
      await waitFor(() => (dlg = [...foundry.applications.instances.values()].find(a => a.element?.querySelector?.('select[name="land"]'))), 8000);
      const form = dlg?.element;
      const labels = [...(form?.querySelectorAll?.("fieldset label") ?? [])].map(l => l.textContent.trim());
      const firstUnit = labels.find(l => /a unit\)/.test(l)) ?? "";
      const land = form?.querySelector?.('select[name="land"]')?.value;
      G.ok("3. the setup for Japan offers the land's troops first", land === "japan" && /Samurai|Ashigaru/.test(firstUnit) && /Kuei-jin/.test(form?.textContent ?? ""), {land, firstUnit});
      await dlg?.close?.();
      await p.catch(() => null);
    });
    await G.step("4. turtle ships off Korea, a wayfinder off the islands", async () => {
      const N = A.naval.rules;
      const f = await A.naval.start({name: "WoDX gate: the strait", land: "korea", year: 1595, ships: [{type: "turtleShip"}, {type: "atakebune"}]});
      fights.push(f.id);
      const g = await A.naval.start({name: "WoDX gate: the open sea", land: "pacific-islands", year: 1500, ships: [{type: "doubleCanoe"}, {type: "doubleCanoe"}]});
      fights.push(g.id);
      await A.naval.open(g.id);
      await waitFor(() => win("wodx-naval")?.element?.querySelector?.('input[name="wayfinder"]'), 8000);
      const way = !!win("wodx-naval")?.element?.querySelector?.('input[name="wayfinder"]');
      const own = N.shipsFor(1595, "classic", "korea")[0];
      G.ok("4. turtle ships off Korea, a wayfinder off the islands", A.naval.get(f.id).ships[0].type === "turtleShip" && own?.own && way, {first: own?.id, way});
      await win("wodx-naval")?.close?.();
    });
    await G.step("5. Moravia keeps Europe's age", async () => {
      const age = A.battles.rules.ageFor(1500, {land: "moravia"});
      G.ok("5. Moravia keeps Europe's age", age.id === "pike", {age: age.id});
    });
  } finally {
    try {
      for ( const id of battles ) await st()?.battles?.remove?.(id);
      for ( const id of fights ) await st()?.naval?.remove?.(id);
      for ( const m of game.messages.filter(m => !before.has(m.id)) ) await m.delete();
    } catch (e) { G.ok("put back", false, {error: String(e)}); }
    return G.finish();
  }
}
