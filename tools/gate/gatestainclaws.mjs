/**
 * A spook calls up a Stain at will (B7832, Orpheus p. 195): the Spite tapped rolls a die a point, Claws go on the sheet
 * as a weapon for a turn a point, and leave it when the turns run out (actions.orpheus-stains), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestainclaws.mjs?${Date.now()}`)).run()
 * It makes its own scene, spook and fight, and removes them; never moves the clock.
 *   1. Call up a Stain, Claws, two Spite, Call it up: the sheet's combat list shows Claws (Stain)
 *   2. two rounds of the fight later: Claws (Stain) is off the sheet
 * Result: Data/wodx-gate/gatestainclaws-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;
const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;

export async function run() {
  const G = gate("gatestainclaws", {stepTimeout: 240000});
  const since = Date.now();
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sheet = null, combat = null, spook = null;
  const clawsOn = () => !!game.actors.get(spook?.id)?.items.find(i => i.getFlag("wodx-actions", "stainWeapon") === "claws");
  const shown = () => /Claws \(Stain\)/.test(el(sheet)?.querySelector(".wodx-book, form, .window-content")?.textContent ?? "");
  try {
    await G.step("1. Call up a Stain, Claws, two Spite: Claws (Stain) on the sheet", async () => {
      const sc = await G.scene({width: 1200, height: 800});
      spook = await G.make(Actor, {name: "Gate Stain Spook", type: "Mortal", ownership: {default: 3}, prototypeToken: {actorLink: true},
        system: {settings: {variant: "orpheus", hasvitality: true, hasspite: true}, advantages: {vitality: {permanent: 6, temporary: 6}, spite: {permanent: 5, temporary: 0}}}});
      await spook.createEmbeddedDocuments("Item", [{name: "Claws", type: "Power", system: {type: "wod.types.stain"}}]);
      const [tok] = await G.tokens(sc, [{actor: spook, x: 3, y: 3}]);
      // setup: a fight under way, where a Stain counts its turns
      combat = await Combat.create({scene: canvas.scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tok.id, sceneId: canvas.scene.id, actorId: spook.id, initiative: 10}]);
      await combat.update({round: 1, turn: 0});
      sheet = game.actors.get(spook.id).sheet;
      await sheet.render({force: true});
      await waitFor(() => el(sheet)?.isConnected, 20000);
      const before = shown();
      // the trigger: the Stain window, as the Orpheus menu and the sheet's Stains row open it
      game.wodxActions.orphStain({actor: game.actors.get(spook.id)});
      const win = () => el(winTitled(/^A Stain: Gate Stain Spook/));
      await waitFor(() => win()?.querySelector('select[name="s"]'), 30000);
      const sel = win().querySelector('select[name="s"]');
      sel.value = "claws"; sel.dispatchEvent(new Event("change", {bubbles: true}));
      const pts = win().querySelector('input[name="p"]');
      pts.value = "2"; pts.dispatchEvent(new Event("input", {bubbles: true}));
      win().querySelector('button[data-action="ok"]')?.click();
      const stainFx = () => game.actors.get(spook.id)?.effects?.find(e => /Stain: Claws/.test(e.name)) ?? null;
      await waitFor(() => clawsOn() && !!stainFx(), 60000);
      await sheet.render({force: true});
      await waitFor(shown, 20000);
      const timed = stainFx();
      const card = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since && /Claws/.test(m.content ?? "")).at(-1);
      const byHand = /by hand/.test(card?.content ?? "");
      G.ok("1. Call up a Stain, Claws, two Spite: Claws (Stain) on the sheet", !before && clawsOn() && shown() && !!timed,
        {before, on: clawsOn(), shown: shown(), effect: timed?.name ?? null, byHand, spite: game.actors.get(spook.id)?.system.advantages?.spite ?? null});
    });

    await G.step("2. two rounds later: Claws (Stain) leaves the sheet", async () => {
      for ( let r = 0; r < 3 && clawsOn(); r++ ) { await combat.nextRound(); await waitFor(() => !clawsOn(), 15000); }
      await sheet.render({force: true});
      await waitFor(() => !shown(), 20000);
      G.ok("2. two rounds later: Claws (Stain) leaves the sheet", !clawsOn() && !shown(), {on: clawsOn(), shown: shown(), round: combat.round});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { await sheet?.close(); } catch (e) { /* closed */ }
    const w = winTitled(/^A Stain: /);
    if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
    try { if ( combat && game.combats.get(combat.id) ) await combat.delete(); } catch (e) { G.R.notes.push(`combat: ${e?.message ?? e}`); }
    const a = game.actors.getName("Gate Stain Spook");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Stain/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""} ${x.flavor ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    return G.finish();
  }
}
