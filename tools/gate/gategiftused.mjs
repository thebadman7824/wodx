/**
 * A once-a-scene Gift greyed in the real Gift window once used (actions.limits-costs, B4920-B4925; Might of Thor,
 * W20 p. 181), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategiftused.mjs?${Date.now()}`)).run()
 * It makes its own Garou and removes it (the use is kept on the Garou), and fixes the dice to eights while it rolls and
 * puts them back.
 *   1. a Garou opens "Use a Gift" from its own Actions menu and uses Might of Thor with the window's Use button; the
 *      same window opened again marks Might of Thor "(used)" with its page, and leaves the other Gift free
 * Result: Data/wodx-gate/gategiftused-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const winTitled = re => [...foundry.applications.instances.values()].filter(a => a.rendered && re.test(String(a.title ?? a.options?.window?.title ?? ""))).at(-1) ?? null;
const el = app => app?.element instanceof HTMLElement ? app.element : app?.element?.[0] ?? null;

/** Fix every d10 to one face (Foundry's mapping from randomUniform to a face has changed between versions). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};

export async function run() {
  const G = gate("gategiftused", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  const uniform = CONFIG.Dice.randomUniform;
  const opened = [];
  try {
    await G.step("1. a used once-a-scene Gift is greyed in the Gift window", async () => {
      const [garou] = await G.make(Actor, [{name: "Gate Thor Garou", type: "Werewolf",
        system: {advantages: {rage: {permanent: 8, temporary: 8}, gnosis: {permanent: 8, temporary: 8}, willpower: {permanent: 6, temporary: 6}}},
        items: [{name: "Might of Thor", type: "Power", system: {type: "wod.types.gift", level: 3}},
          {name: "Leap of the Kangaroo", type: "Power", system: {type: "wod.types.gift", level: 1}}]}]);
      const a = () => game.actors.get(garou.id);
      const thorId = a().items.find(i => i.name === "Might of Thor")?.id;
      // the Garou's own Actions menu opens the Gift window
      const openGift = async () => {
        opened.push(game.wodxActions.menu({actor: a()}));
        const btn = () => el(winTitled(/^WoDX Actions/))?.querySelector('button[data-k="api:useGift"]') ?? null;
        await waitFor(btn, 20000);
        btn()?.click();
        await waitFor(() => el(winTitled(/^Use a Gift: /))?.querySelector('select[name="gift"]'), 20000);
        return el(winTitled(/^Use a Gift: /));
      };
      const w1 = await openGift();
      const sel = w1?.querySelector('select[name="gift"]');
      if ( sel ) { sel.value = thorId; sel.dispatchEvent(new Event("change", {bubbles: true})); }
      const first = w1?.querySelector(`option[value="${thorId}"]`)?.textContent ?? "";
      await dice(8);
      w1?.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => !w1?.isConnected, 60000);
      await new Promise(r => setTimeout(r, 2000)); // the use is filed after the card
      CONFIG.Dice.randomUniform = uniform;
      for ( const w of [winTitled(/^WoDX Actions/)] ) if ( w ) { try { await w.close(); } catch (e) { /* closed */ } }
      const w2 = await openGift();
      const thor = w2?.querySelector(`option[value="${thorId}"]`), other = [...(w2?.querySelectorAll('select[name="gift"] option') ?? [])].find(o => o.value !== thorId);
      G.ok("1. a used once-a-scene Gift is greyed in the Gift window",
        !!sel && !/\(used\)/.test(first) && /\(used\)$/.test(thor?.textContent ?? "") && /W20 p\. 181/.test(thor?.title ?? "") && !!other && !/\(used\)/.test(other.textContent),
        {first, second: thor?.textContent ?? null, why: thor?.title ?? null, other: other?.textContent ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const re of [/^Use a Gift: /, /^WoDX Actions/, /^Use a Gift: /, /^WoDX Actions/] ) { const w = winTitled(re); if ( w ) { try { await w.close(); } catch (e) { /* closed */ } } }
    for ( const p of opened ) await Promise.race([p, new Promise(r => setTimeout(r, 1000))]);
    for ( const m of game.messages.contents.filter(m => /Gate Thor Garou/.test(m.speaker?.alias ?? "") || /Gate Thor Garou/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
