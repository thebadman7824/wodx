/**
 * A long roll's time moves the clock, from the real action window (actions.spend-time), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatespendtime.mjs?${Date.now()}`)).run()
 * It makes its own mortal and removes it, fixes the dice to eights while it rolls, and puts the dice and clock back.
 *   1. an extended roll of 3 dice needing 5 successes, rolled until done at 10 minutes a roll with "Move the clock"
 *      ticked, is pressed with the window's own Roll button: it takes 2 rolls and the clock moves 20 minutes
 * Result: Data/wodx-gate/gatespendtime-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const actWin = () => [...document.querySelectorAll(".application, .dialog, .window-app")].find(e => /WoDX Action\b/.test(e.querySelector(".window-title")?.textContent ?? "") && e.querySelector("select[name=preset]")) ?? null;

/** Fix every d10 to one face (Foundry's mapping from randomUniform to a face has changed between versions). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
const set = (root, name, v) => {
  const f = root?.querySelector(`[name="${name}"]`);
  if ( !f ) return false;
  if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
  f.dispatchEvent(new Event("input", {bubbles: true})); f.dispatchEvent(new Event("change", {bubbles: true}));
  return true;
};

export async function run() {
  const G = gate("gatespendtime", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  const uniform = CONFIG.Dice.randomUniform;
  let shown = null;
  try {
    await G.step("1. an extended roll rolled until done moves the clock by its time", async () => {
      const [pc] = await G.make(Actor, [{name: "Gate Long Work Mortal", type: "Mortal"}]);
      const a = () => game.actors.get(pc.id);
      await a().update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3});
      shown = game.wodxActions.action({actor: a()});
      await waitFor(() => actWin()?.querySelector('[name="untilDone"]'), 20000);
      const w = actWin();
      const ok1 = set(w, "mode", "extended") && set(w, "attr", "dexterity") && set(w, "ability", "") && set(w, "goal", 5)
        && set(w, "untilDone", true) && set(w, "interval", 10) && set(w, "advance", true);
      const t0 = game.time.worldTime;
      await dice(8);
      w?.querySelector('button[data-action="ok"]')?.click();
      await Promise.race([shown, new Promise(r => setTimeout(r, 90000))]); // one card can take half a minute to save here
      CONFIG.Dice.randomUniform = uniform;
      await waitFor(() => game.time.worldTime - t0 >= 1200, 30000);
      const moved = game.time.worldTime - t0;
      G.ok("1. an extended roll rolled until done moves the clock by its time", ok1 && moved === 1200,
        {filled: ok1, moved, minutes: moved / 60});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( let i = 0; i < 3 && actWin(); i++ ) actWin()?.querySelector('button[data-action="cancel"], [data-action="close"]')?.click();
    if ( shown ) await Promise.race([shown, new Promise(r => setTimeout(r, 1500))]);
    for ( const m of game.messages.contents.filter(m => /Gate Long Work Mortal/.test(m.speaker?.alias ?? "") || /Gate Long Work Mortal/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
