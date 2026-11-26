/**
 * A Spectre turns its arsenal on a crucible (B7833, Orpheus pp. 267-269): a Thorn goes on its sheet, and a Horror taps
 * its Spite without spending it (actions.orpheus-spectres), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatespectrethorn.mjs?${Date.now()}`)).run()
 * It makes its own Spectre, and removes it; never moves the clock.
 *   1. A Spectre's Horror or Thorn, Thorn: Claws, Use it: the sheet's combat list shows Claws (Thorn)
 *   2. Horror: Immolate, two Spite, Use it: the Spectre burns for the scene, and its Spite rating is unchanged
 * Result: Data/wodx-gate/gatespectrethorn-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatespectrethorn", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sheet = null, spec = null;
  const me = () => game.actors.get(spec?.id);
  const clawsOn = () => !!me()?.items.find(i => i.getFlag("wodx-actions", "thorn") === "claws");
  const shown = () => /Claws \(Thorn\)/.test(el(sheet)?.querySelector(".wodx-book, form, .window-content")?.textContent ?? "");
  const win = () => el(winTitled(/^A Spectre: Gate Spectre/));
  const use = async (value, spite) => {
    game.wodxActions.orphSpectre({actor: me()});
    await waitFor(() => win()?.querySelector('select[name="w"]'), 30000);
    const sel = win().querySelector('select[name="w"]');
    sel.value = value; sel.dispatchEvent(new Event("change", {bubbles: true}));
    const pts = win().querySelector('input[name="p"]');
    pts.value = String(spite); pts.dispatchEvent(new Event("input", {bubbles: true}));
    win().querySelector('button[data-action="ok"]')?.click();
  };
  try {
    await G.step("1. Thorn: Claws, Use it: Claws (Thorn) on the sheet", async () => {
      const sc = await G.scene({width: 1200, height: 800});
      spec = await G.make(Actor, {name: "Gate Spectre", type: "Mortal", ownership: {default: 3}, prototypeToken: {actorLink: true},
        system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}, advantages: {spite: {permanent: 6, temporary: 0}, willpower: {permanent: 5, temporary: 5}}}});
      await G.tokens(sc, [{actor: spec, x: 3, y: 3}]);
      sheet = me().sheet;
      await sheet.render({force: true});
      await waitFor(() => el(sheet)?.isConnected, 20000);
      const before = shown();
      // the trigger: the Spectre window, as the Orpheus menu opens it
      await use("t:claws", 0);
      await waitFor(clawsOn, 60000);
      await sheet.render({force: true});
      await waitFor(shown, 20000);
      G.ok("1. Thorn: Claws, Use it: Claws (Thorn) on the sheet", !before && clawsOn() && shown(), {before, on: clawsOn(), shown: shown()});
    });

    await G.step("2. Horror: Immolate, two Spite: it burns for the scene, Spite unchanged", async () => {
      const fx = () => me()?.effects?.find(e => /Horror: Immolate/.test(e.name)) ?? null;
      await use("h:immolate", 2);
      await waitFor(() => !!fx(), 60000);
      const card = () => game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && /Immolate/.test(m.content ?? "")).at(-1);
      await waitFor(() => !!card(), 30000);
      const spite = me()?.system.advantages?.spite ?? {};
      G.ok("2. Horror: Immolate, two Spite: it burns for the scene, Spite unchanged", !!fx() && Number(spite.permanent) === 6 && /3 lethal levels/.test(card()?.content ?? ""),
        {effect: fx()?.name ?? null, spite, tapped: me()?.getFlag("wodx-actions", "orpheus")?.spectreTapped ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    const w = winTitled(/^A Spectre: /);
    if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    const a = game.actors.getName("Gate Spectre");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Spectre/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""} ${x.flavor ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
