/**
 * An imbued hunter (Hunter: The Reckoning, 1999 on) spends a Conviction point for second sight in the Second sight window,
 * and the sheet's Conviction falls by one (actions.reckoning), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesecondsight.mjs?${Date.now()}`)).run()
 * It makes its own hunter and removes it, and never moves the clock or the era. The Actions menu's "Virtue roll /
 * second sight" opens this window only in the imbued's eras (1999 on); changing the era reloads every client, so the
 * gate opens the same window the menu opens in those eras (api secondSight) and presses its Go button.
 *   1. the Second sight window, Spend 1 Conviction, Go: Conviction 3 on the sheet becomes 2, and a second try in the
 *      same scene is refused
 * Result: Data/wodx-gate/gatesecondsight-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gatesecondsight", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const opened = [];
  try {
    await G.step("1. Spend 1 Conviction for second sight: the sheet's Conviction falls by one", async () => {
      const hunter = await G.make(Actor, {name: "Gate Second Sight Hunter", type: "Hunter",
        system: {advantages: {conviction: {permanent: 5, temporary: 3}, willpower: {permanent: 5, temporary: 5}, virtues: {mercy: {permanent: 1}, vision: {permanent: 1}, zeal: {permanent: 3}}}}});
      const a = () => game.actors.get(hunter.id);
      const conviction = () => Number(a()?.system.advantages?.conviction?.temporary);
      const before = conviction();
      // the second sight window, as the hunter's Actions menu opens it in the imbued's eras
      const openSight = async () => {
        opened.push(game.wodxActions.secondSight({actor: a()}));
        await waitFor(() => el(winTitled(/^Second sight: /))?.querySelector('select[name="k"]'), 20000);
        return el(winTitled(/^Second sight: /));
      };
      const w1 = await openSight();
      const sel = w1?.querySelector('select[name="k"]');
      if ( sel ) { sel.value = "spend"; sel.dispatchEvent(new Event("change", {bubbles: true})); }
      w1?.querySelector('button[data-action="ok"]')?.click();
      // the spend lowers Conviction, then marks the scene as seen with second sight
      await waitFor(() => conviction() === before - 1 && !!a()?.getFlag(MOD, "sightScene"), 60000);
      const after = conviction();
      // a second spend in the same scene is refused: Conviction stays
      const w2 = await openSight();
      const active = /second sight is active this scene/.test(w2?.textContent ?? "");
      const s2 = w2?.querySelector('select[name="k"]');
      if ( s2 ) { s2.value = "spend"; s2.dispatchEvent(new Event("change", {bubbles: true})); }
      w2?.querySelector('button[data-action="ok"]')?.click();
      await new Promise(r => setTimeout(r, 3000));
      G.ok("1. Spend 1 Conviction for second sight: the sheet's Conviction falls by one", !!w1 && before === 3 && after === 2 && active && conviction() === 2,
        {window: !!w1, before, after, active, again: conviction()});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const w of [winTitled(/^Second sight: /)] ) if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    const h = game.actors.getName("Gate Second Sight Hunter");
    if ( h ) { try { await h.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Second Sight/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
