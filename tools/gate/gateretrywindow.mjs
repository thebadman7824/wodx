/**
 * Trying again after a failure, in the real action window (actions.retry, V20 Dark Ages: a task failed and tried again
 * is one harder a try), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateretrywindow.mjs?${Date.now()}`)).run()
 * It makes its own mortal and removes it, fixes the dice to ones while it rolls, and puts the dice back.
 *   1. a mortal's action window is rolled with its own Roll button and fails; the same window opened again for the
 *      same task shows a difficulty one higher, named as the second try
 * Result: Data/wodx-gate/gateretrywindow-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const actWin = () => [...document.querySelectorAll(".application, .dialog, .window-app")].find(e => /WoDX Action\b/.test(e.querySelector(".window-title")?.textContent ?? "") && e.querySelector("select[name=preset]")) ?? null;
const oddsAt = el => { const m = /(\d+) dic?e? at (\d+)/.exec(el?.querySelector(".vta-odds")?.textContent ?? ""); return m ? {dice: Number(m[1]), difficulty: Number(m[2])} : null; };
const partsOf = el => el?.querySelector(".vta-odds-parts")?.textContent ?? "";
const rollBtn = el => el?.querySelector('button[data-action="ok"]') ?? null;

/** Fix every d10 to one face (Foundry's mapping from randomUniform to a face has changed between versions). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};

export async function run() {
  const G = gate("gateretrywindow", {stepTimeout: 180000}); // making actors in a big world can take over a minute
  const uniform = CONFIG.Dice.randomUniform;
  let first = null, second = null;
  try {
    await G.step("1. a failed roll tried again in the action window is one harder", async () => {
      const [pc] = await G.make(Actor, [{name: "Gate Retry Mortal", type: "Mortal"}]);
      const a = () => game.actors.get(pc.id);
      await a().update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3});
      const since = Date.now();
      // the first try: the window as it opens, rolled with its own button, with every die a one
      first = game.wodxActions.action({actor: a()});
      await waitFor(() => oddsAt(actWin()), 20000);
      const w1 = actWin();
      const odds1 = oddsAt(w1), parts1 = partsOf(w1);
      await dice(1);
      rollBtn(w1)?.click();
      await Promise.race([first, new Promise(r => setTimeout(r, 60000))]); // one card can take half a minute to save here
      CONFIG.Dice.randomUniform = uniform;
      await waitFor(() => a().getFlag("wodx-actions", "retry"), 30000);
      const card = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since).pop();
      // the second try: the same window for the same task
      second = game.wodxActions.action({actor: a()});
      await waitFor(() => oddsAt(actWin()), 20000);
      const w2 = actWin();
      const odds2 = oddsAt(w2), parts2 = partsOf(w2);
      G.ok("1. a failed roll tried again in the action window is one harder",
        !!odds1 && !!odds2 && odds2.difficulty === odds1.difficulty + 1 && odds2.dice === odds1.dice && /second try/.test(parts2) && !/second try/.test(parts1),
        {odds1, odds2, parts1: parts1.slice(0, 160), parts2: parts2.slice(0, 160), card: card ? String(card.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 120) : null,
          remembered: a().getFlag("wodx-actions", "retry") ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( let i = 0; i < 3 && actWin(); i++ ) actWin()?.querySelector('button[data-action="cancel"], [data-action="close"]')?.click();
    for ( const p of [first, second] ) if ( p ) await Promise.race([p, new Promise(r => setTimeout(r, 1500))]);
    for ( const m of game.messages.contents.filter(m => /Gate Retry Mortal/.test(m.speaker?.alias ?? "") || /Gate Retry Mortal/.test(m.content ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    return G.finish();
  }
}
