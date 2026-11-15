/**
 * News by part of the world on the Future Darkness branch (B5890 to B5892), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldnews.mjs?${Date.now()}`)).run()
 * Holds the world, turns the Future Darkness branch on, moves the clock to 2026 to 2029 and puts back the clock, the
 * hold, the branch switch, the homeland and the fired list. Its chat cards are deleted.
 *   1. the Chronicle ships the branch's world history with places, the Americas, Africa and Oceania after 2023 among it
 *   2. with the homeland on the American West coast, the 2027 card tells Sacramento's registry office and not Kinshasa's news
 *   3. the far-off event still happened (has() is true) and the card counts it as elsewhere in the world
 *   4. with the homeland in East Africa, the 2029 card tells the Sahel drought and not the Midwest's dead zones
 *   5. the Dated events window can find an event by its place
 * Result: Data/wodx-gate/gateworldnews-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gateworldnews");
  const M = "wodx-chronicle";
  const api = game.modules.get(M)?.api;
  const saved = {
    fired: foundry.utils.deepClone(game.settings.get(M, "eventsFired")), held: !!api?.isHeld?.(),
    branch: game.settings.get(M, "rule.futureBranch"), homeland: game.settings.get(M, "homeland")
  };
  const before = new Set(game.messages.map(m => m.id));
  const cards = () => game.messages.filter(m => !before.has(m.id) && /wodx-events/.test(m.content ?? ""));
  try {
    const {getEngine} = await import(`/modules/${M}/scripts/calendar.mjs`);
    const at = (y, m, d) => getEngine().dateToTime({year: y, month: m, day: d, hour: 21});
    await G.scene();
    await api.hold(true);
    await game.settings.set(M, "rule.futureBranch", true);
    await game.settings.set(M, "homeland", "north-america-west");
    const check = o => api.events.check({force: true, ...o});
    const list = () => api.events.list();
    const settle = async (y, m, d) => {
      await game.time.set(at(y, m, d));
      const k = y * 10000 + m * 100 + d;
      await game.settings.set(M, "eventsFired", list().filter(e => e.live && e.key <= k).map(e => e.id));
    };
    const moveTo = async (y, m, d) => {
      const n = cards().length;
      await game.time.set(at(y, m, d));
      await check();
      await waitFor(() => cards().length > n, 8000);
      return cards().slice(n).map(c => c.content).join("\n");
    };

    await G.step("1. the world history ships with places", async () => {
      const late = list().filter(e => e.region && e.year > 2023);
      const by = r => late.filter(e => e.region === r).length;
      G.ok("1. the world history ships with places", by("AM") >= 15 && by("AF") >= 15 && by("OC") >= 10 && late.every(e => e.place),
        {AM: by("AM"), AF: by("AF"), OC: by("OC")});
    });
    let card2 = "";
    await G.step("2. the West coast hears its own news", async () => {
      await settle(2026, 12, 31);
      card2 = await moveTo(2027, 12, 31);
      G.ok("2. the West coast hears its own news", /Sacramento/.test(card2) && /registry office/.test(card2) && !/Kinshasa/.test(card2),
        {card: card2.slice(0, 600)});
    });
    await G.step("3. far-off news happened but is only counted", async () => {
      const far = list().find(e => e.region === "AF" && e.year === 2027 && /Hireout/.test(e.name));
      G.ok("3. far-off news happened but is only counted", !!far && api.events.has(far.id) && /elsewhere in the world/.test(card2), {id: far?.id});
    });
    await G.step("4. East Africa hears the Sahel", async () => {
      await game.settings.set(M, "homeland", "east-africa");
      await settle(2028, 12, 31);
      const card = await moveTo(2029, 12, 31);
      G.ok("4. East Africa hears the Sahel", /Sahel/.test(card) && !/Des Moines/.test(card), {card: card.slice(0, 600)});
    });
    await G.step("5. the Dated events window finds a place", async () => {
      await api.events.open();
      const find = () => [...foundry.applications.instances.values()].find(a => a.id?.startsWith?.("wodx-events") && a.element?.querySelector?.(".wodx-event-row"));
      await waitFor(find, 8000);
      const app = find();
      const row = app?.element?.querySelector?.('[data-search-text*="Sacramento"]');
      G.ok("5. the Dated events window finds a place", !!row, {rows: app?.element?.querySelectorAll?.(".wodx-event-row")?.length});
      await app?.close?.();
    });
  } finally {
    try {
      await game.settings.set(M, "homeland", saved.homeland);
      await game.settings.set(M, "rule.futureBranch", saved.branch);
      await game.settings.set(M, "eventsFired", saved.fired);
      for ( const c of cards() ) await c.delete();
      if ( !saved.held ) await api?.hold?.(false);
    } catch (e) { G.ok("put back", false, {error: String(e)}); }
    return G.finish();
  }
}
