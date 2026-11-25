/**
 * A Dark Ages ghost manifests from its own Actions menu (actions.ghosts-da, V20 Dark Ages p. 403), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateghostmanifest.mjs?${Date.now()}`)).run()
 * It makes its own ghost and removes it.
 *   1. a ghost with 5 Passion and Strength 0 presses "Manifest for a turn" in its Actions menu: Passion drops to 4 and
 *      its Strength on the sheet is 3 while the Manifested effect lasts
 * Result: Data/wodx-gate/gateghostmanifest-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const menuWin = () => [...foundry.applications.instances.values()].filter(a => a.rendered && /^WoDX Actions/.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

export async function run() {
  const G = gate("gateghostmanifest", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  let shown = null;
  try {
    await G.step("1. Manifest from the ghost's Actions menu spends Passion and sets Strength", async () => {
      const [ghost] = await G.make(Actor, [{name: "Gate Manifest Ghost", type: "Wraith",
        system: {attributes: {strength: {value: 0}}, advantages: {pathos: {temporary: 5, max: 10}}},
        flags: {"wodx-actions": {daGhost: {key: "gate", manifest: {strength: 3}}}}}]);
      const a = () => game.actors.get(ghost.id);
      const before = {passion: Number(a().system.advantages?.pathos?.temporary), strength: Number(a().system.attributes?.strength?.value)};
      shown = game.wodxActions.menu({actor: a()});
      const btn = () => el(menuWin())?.querySelector('button[data-k="api:ghostManifest"]') ?? null;
      await waitFor(btn, 20000);
      const pressed = !!btn();
      btn()?.click();
      await waitFor(() => Number(a().system.advantages?.pathos?.temporary) === before.passion - 1 && a().effects.some(e => e.getFlag("wodx-actions", "ghostManifest")), 60000);
      await waitFor(() => Number(a().system.attributes?.strength?.value) === 3, 15000);
      const after = {passion: Number(a().system.advantages?.pathos?.temporary), strength: Number(a().system.attributes?.strength?.value)};
      const fx = a().effects.find(e => e.getFlag("wodx-actions", "ghostManifest"));
      G.ok("1. Manifest from the ghost's Actions menu spends Passion and sets Strength",
        pressed && before.passion === 5 && after.passion === 4 && before.strength === 0 && after.strength === 3 && !!fx,
        {pressed, before, after, effect: fx ? {name: fx.name, rounds: fx.duration?.rounds ?? null} : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( let i = 0; i < 3 && menuWin(); i++ ) { try { await menuWin().close(); } catch (e) { break; } }
    if ( shown ) await Promise.race([shown, new Promise(r => setTimeout(r, 1500))]);
    for ( const m of game.messages.contents.filter(m => /Gate Manifest Ghost/.test(m.speaker?.alias ?? "") || /Gate Manifest Ghost/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
