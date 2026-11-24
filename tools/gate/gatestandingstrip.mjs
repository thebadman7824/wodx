/**
 * The Road and domain at a glance on the Bio tab (WoDX Sheets), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestandingstrip.mjs?${Date.now()}`)).run()
 * It makes its own Cainite on the Road of Kings and removes it.
 *   1. the Cainite's own sheet shows the strip on the Bio tab with the Road and its rating from the sheet; a rating
 *      changed on the sheet shows in the strip when the sheet redraws, and the strip's Road link opens the Road window
 * Result: Data/wodx-gate/gatestandingstrip-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const strip = el => el?.querySelector(".tab.bio .wodx-standing"); // el: the sheet element

export async function run() {
  const G = gate("gatestandingstrip", {stepTimeout: 180000}); // making actors in a big world can take over a minute before the sheet opens
  let sheet = null;
  const opened = [];
  try {
    await G.step("1. the Bio tab's strip shows the sheet's Road and opens the Road window", async () => {
      const [lord] = await G.make(Actor, [{name: "Gate Strip Lord", type: "Vampire", system: {advantages: {path: {permanent: 6, value: 6, custom: "Road of Kings"}}}}]);
      await lord.setFlag("wodx-actions", "road", {key: "kings", path: null});
      sheet = game.actors.get(lord.id).sheet;
      await sheet.render(true);
      const root = () => sheet.element instanceof HTMLElement ? sheet.element : sheet.element?.[0];
      const onSheet = () => root()?.querySelector(".tab.bio .wodx-standing"); // read off the sheet itself
      await waitFor(onSheet, 15000);
      const first = strip(root())?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      // the Road's rating moves on the sheet itself; the strip redraws with it
      await lord.update({"system.advantages.path.permanent": 5, "system.advantages.path.value": 5});
      await waitFor(() => / 5:/.test(strip(root())?.textContent ?? ""), 15000);
      const second = strip(root())?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const hook = Hooks.on("renderApplicationV2", app => opened.push(app.title ?? app.options?.window?.title ?? app.id));
      const hook1 = Hooks.on("renderApplication", app => opened.push(app.title ?? app.options?.title ?? app.id));
      const link = strip(root())?.querySelector('.wodx-standing-open[data-open="road"]');
      link?.click();
      await waitFor(() => opened.some(t => /Road/i.test(String(t))), 10000);
      Hooks.off("renderApplicationV2", hook); Hooks.off("renderApplication", hook1);
      G.ok("1. the Bio tab's strip shows the sheet's Road and opens the Road window",
        /The Road:/.test(first) && /Kings 6/.test(first) && /Kings 5/.test(second) && !!link && opened.some(t => /Road/i.test(String(t))),
        {first: first.slice(0, 200), second: second.slice(0, 200), link: !!link, opened: opened.slice(0, 5)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const app of [...(foundry.applications.instances?.values?.() ?? [])] ) {
      if ( /Road/i.test(String(app.title ?? "")) && opened.includes(app.title) ) { try { await app.close(); } catch (e) { /* closed */ } }
    }
    try { await sheet?.close?.(); } catch (e) { G.R.notes.push(`sheet: ${e?.message ?? e}`); }
    return G.finish();
  }
}
