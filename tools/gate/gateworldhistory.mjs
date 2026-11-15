/**
 * The classic world timeline in the game (B5920 to B5926), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldhistory.mjs?${Date.now()}`)).run()
 * Holds the world, keeps the classic timeline, moves the clock to 1347 and to an African year and puts back the clock,
 * the hold, the branch switch, the homeland, the overrides and the fired list. Its chat cards are deleted.
 *   1. the Chronicle ships about three thousand events of the world timeline, each with a place and an era
 *   2. with the homeland in Moravia, the 1347 card tells Europe's news and not Asia's
 *   3. the hidden story of 1347 is whispered to the Storyteller only, and is not on the public card
 *   4. with the homeland in East Africa, an African year's card tells Africa's news and not Europe's
 *   5. the Dated events window lists the clock's era of the world timeline and switches to another era
 * Result: Data/wodx-gate/gateworldhistory-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gateworldhistory");
  const M = "wodx-chronicle";
  const api = game.modules.get(M)?.api;
  const saved = {
    fired: foundry.utils.deepClone(game.settings.get(M, "eventsFired")), held: !!api?.isHeld?.(),
    branch: game.settings.get(M, "rule.futureBranch"), homeland: game.settings.get(M, "homeland"),
    overrides: foundry.utils.deepClone(game.settings.get(M, "eventOverrides") ?? {})
  };
  const before = new Set(game.messages.map(m => m.id));
  const cards = () => game.messages.filter(m => !before.has(m.id) && /wodx-events/.test(m.content ?? ""));
  try {
    const {getEngine} = await import(`/modules/${M}/scripts/calendar.mjs`);
    const at = (y, m, d) => getEngine().dateToTime({year: y, month: m, day: d, hour: 21});
    await G.scene();
    await api.hold(true);
    await game.settings.set(M, "rule.futureBranch", false);
    await game.settings.set(M, "homeland", "moravia");
    const check = o => api.events.check({force: true, ...o});
    const list = () => api.events.list();
    const world = () => list().filter(e => e.id.startsWith("wh-"));
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
      return cards().slice(n);
    };
    const text = html => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent ?? ""; };
    const told = (html, ev) => text(html).includes(`: ${ev.name}.`);

    await G.step("1. the world timeline ships", async () => {
      const w = world();
      G.ok("1. the world timeline ships", w.length >= 3000 && w.every(e => e.place && e.era && e.region) && (api.events.eras?.length ?? 0) === 8,
        {events: w.length, eras: api.events.eras?.length});
    });
    let got = [];
    await G.step("2. Moravia hears Europe's 1347", async () => {
      await settle(1346, 12, 31);
      got = await moveTo(1347, 12, 31);
      const pub = got.filter(m => !m.whisper?.length).map(m => m.content).join("\n");
      const eu = world().filter(e => e.year === 1347 && !e.hidden && (e.region === "EU" || e.region === "MO"));
      const as = world().filter(e => e.year === 1347 && !e.hidden && e.region === "AS");
      G.ok("2. Moravia hears Europe's 1347", eu.some(e => told(pub, e)) && !as.some(e => told(pub, e)) && /The world turns/.test(pub),
        {eu: eu.length, as: as.length, card: pub.slice(0, 600)});
    });
    await G.step("3. the hidden story is whispered", async () => {
      const secret = got.filter(m => /Behind the curtain/.test(m.content));
      const pub = got.filter(m => !m.whisper?.length).map(m => m.content).join("\n");
      const hidden = world().filter(e => e.year === 1347 && e.hidden && (e.region === "EU" || e.region === "MO"));
      const gms = game.users.filter(u => u.isGM).map(u => u.id);
      G.ok("3. the hidden story is whispered", secret.length === 1 && secret[0].whisper.every(id => gms.includes(id)) && secret[0].whisper.length > 0
        && hidden.some(e => told(secret[0].content, e)) && !hidden.some(e => told(pub, e)), {hidden: hidden.length, whisper: secret[0]?.whisper});
    });
    await G.step("4. East Africa hears Africa", async () => {
      await game.settings.set(M, "homeland", "east-africa");
      const years = [...new Set(world().filter(e => e.region === "AF" && !e.hidden).map(e => e.year))]
        .filter(y => world().some(e => e.year === y && e.region === "EU" && !e.hidden));
      const y = years.find(x => x > 1400) ?? years[0];
      await settle(y - 1, 12, 31);
      const pub = (await moveTo(y, 12, 31)).filter(m => !m.whisper?.length).map(m => m.content).join("\n");
      const af = world().filter(e => e.year === y && !e.hidden && e.region === "AF");
      const eu = world().filter(e => e.year === y && !e.hidden && e.region === "EU");
      G.ok("4. East Africa hears Africa", af.some(e => told(pub, e)) && !eu.some(e => told(pub, e)), {year: y, card: pub.slice(0, 600)});
    });
    await G.step("5. the Dated events window lists an era and switches", async () => {
      await game.time.set(at(1347, 12, 31));
      await api.events.open();
      const find = () => [...foundry.applications.instances.values()].find(a => a.id?.startsWith?.("wodx-events") && a.element?.querySelector?.("[data-world-era]"));
      await waitFor(find, 8000);
      const app = find();
      const names = () => [...(app?.element?.querySelectorAll?.(".wodx-event-row") ?? [])].map(r => r.dataset.searchText ?? "");
      const ln = world().find(e => e.era === "long-night"), vi = world().find(e => e.era === "victorian");
      const first = names();
      const sel = app?.element?.querySelector?.("[data-world-era]");
      const was = sel?.value;
      if ( sel ) { sel.value = "victorian"; sel.dispatchEvent(new Event("change")); }
      await waitFor(() => names().some(t => t.startsWith(vi.name)), 8000);
      const second = names();
      G.ok("5. the Dated events window lists an era and switches", was === "long-night" && first.some(t => t.startsWith(ln.name)) && !first.some(t => t.startsWith(vi.name))
        && second.some(t => t.startsWith(vi.name)), {was, first: first.length, second: second.length});
      await app?.close?.();
    });
  } finally {
    try {
      await game.settings.set(M, "homeland", saved.homeland);
      await game.settings.set(M, "rule.futureBranch", saved.branch);
      await game.settings.set(M, "eventOverrides", saved.overrides);
      await game.settings.set(M, "eventsFired", saved.fired);
      for ( const c of cards() ) await c.delete();
      if ( !saved.held ) await api?.hold?.(false);
    } catch (e) { G.ok("put back", false, {error: String(e)}); }
    return G.finish();
  }
}
