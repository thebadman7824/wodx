/**
 * The faith calendar and curfews in a real hunt window (npc.hunt-calendar), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehuntcalendar.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene and a Cainite, moves the clock to the night and back, and removes what it made.
 *   1. a Cainite's hunt window opened at night lists the town's feasts, fasts and curfews with a step, and that step is
 *      in the hunt's difficulty: setting the calendar's field to 0 in the window lowers the difficulty by that step
 * Result: Data/wodx-gate/gatehuntcalendar-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const HOUR = 3600;
const huntWin = () => [...document.querySelectorAll(".application, .dialog, .window-app")].find(e => /WoDX Hunt/.test(e.textContent ?? "") && e.querySelector("select[name=area]")) ?? null;
const oddsAt = el => { const m = /(\d+) dice at (\d+)/.exec(el?.querySelector(".vta-odds")?.textContent ?? ""); return m ? {dice: Number(m[1]), difficulty: Number(m[2])} : null; };

export async function run() {
  const G = gate("gatehuntcalendar", {stepTimeout: 180000}); // making actors and moving the clock in a big world can take minutes
  let shown = null, rule = null;
  try {
    // the house rule "Feast and fast days" is the Storyteller's to turn on; the gate turns it on and puts it back
    rule = game.settings.get("wodx-chronicle", "rule.feastFast");
    await game.settings.set("wodx-chronicle", "rule.feastFast", true);
    // a street out of doors (the curfew stops those abroad, not those within)
    const scene = await G.scene({name: "WoDX gate: hunt calendar", flags: {"wodx-atmosphere": {outdoors: "on"}}});
    await G.step("1. the hunt window's calendar step is in the hunt's difficulty", async () => {
      const [vamp] = await G.make(Actor, [{name: "Gate Calendar Hunter", type: "Vampire"}]);
      await G.tokens(scene, [{actor: vamp, x: 2, y: 2, actorLink: true}]);
      // the clock's own move, to eleven at night, when the curfew bell has rung
      const cal = await import("/modules/wodx-rules/core/calendar.mjs");
      const lat = (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })();
      const hour = Number(cal.describeTime(game.time.worldTime, lat)?.hour ?? 23);
      const move = (((23 - Math.floor(hour)) % 24) + 24) % 24;
      if ( move ) await game.time.advance(move * HOUR);
      shown = game.wodxActions.hunt({actor: vamp});
      await waitFor(() => oddsAt(huntWin()), 20000);
      const el = huntWin();
      const field = el?.querySelector('input[name="faithDiff"]');
      const lines = [...(el?.querySelectorAll(".wodx-hunt-calendar li") ?? [])].map(li => li.textContent.trim());
      const step = Number(field?.value ?? 0);
      const withCal = oddsAt(el);
      if ( field ) { field.value = "0"; field.dispatchEvent(new Event("input", {bubbles: true})); field.dispatchEvent(new Event("change", {bubbles: true})); }
      await waitFor(() => oddsAt(huntWin())?.difficulty !== withCal?.difficulty, 5000);
      const without = oddsAt(huntWin());
      G.ok("1. the hunt window's calendar step is in the hunt's difficulty",
        !!field && lines.length > 0 && step !== 0 && !!withCal && !!without && withCal.difficulty - without.difficulty === step && withCal.dice === without.dice,
        {hour, moved: move, field: !!field, step, lines: lines.slice(0, 4), withCal, without});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    const el = huntWin();
    el?.querySelector("[data-action=close], .header-control[data-action=close], button[data-action=cancel]")?.click();
    if ( shown ) await Promise.race([shown, new Promise(r => setTimeout(r, 1500))]);
    if ( rule !== null ) { try { await game.settings.set("wodx-chronicle", "rule.feastFast", rule); } catch (e) { G.R.notes.push(`rule: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
