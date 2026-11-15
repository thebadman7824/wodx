/**
 * WoDX Paperdoll gate: moves only one line has (B5810 to B5819), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelinemoves.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, two actors and their tokens, and removes them; never moves the clock.
 *   1. the rules are there, and every line sheet of the test figures answers
 *   2. a Kindred asleep by day lies in the coffin pose, and gets up when the day's sleep ends
 *   3. a Kindred in frenzy crouches with the red look, and stands when it ends
 *   4. blood spent flushes the figure red for a moment
 *   5. Obfuscate fades the figure (faint to its owner), worked again it comes back
 *   6. a Garou's howl power plays the howl (cupped hands in Homid)
 *   7. a Wraith with no Corpus left lies faint in Slumber
 * Result: Data/wodx-gate/gatelinemoves-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const PD = "wodx-paperdoll", ELDER = "kindred-elder-1888", HOMID = "garou-homid", TOWN = "townsman-1888";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatelinemoves");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const A = game.modules.get(PD)?.api?.sprites, SR = A?.rules;
    const scene = await G.scene();
    const [vamp, wolf, ghost] = await G.make(Actor, [{name: "Gate Line Elder", type: "Vampire"}, {name: "Gate Line Garou", type: "Werewolf"}, {name: "Gate Line Wraith", type: "Wraith"}]);
    const [tv, tw, tg] = await G.tokens(scene, [{actor: vamp, x: 4, y: 4}, {actor: wolf, x: 8, y: 4}, {actor: ghost, x: 12, y: 4}]);
    await waitFor(() => tv?.object?.mesh && tw?.object?.mesh && tg?.object?.mesh);
    await A.give(tv, ELDER); await A.give(tw, HOMID); await A.give(tg, TOWN);
    const act = t => t.flags?.[PD]?.act ?? {};
    const held = async (t, name, ms = 10000) => { await A.settle(); await waitFor(() => act(t).name === name && act(t).by === "line", ms); return act(t); };
    const free = async (t, ms = 10000) => { await A.settle(); await waitFor(() => !act(t).hold, ms); return !act(t).hold; };

    await G.step("1. the rules and the sheets", async () => {
      const answers = {};
      for ( const [n, m] of [[ELDER, "frenzy"], [ELDER, "embrace"], [ELDER, "daysleep"], [ELDER, "earthsleep"], [ELDER, "swoon"], [HOMID, "cup"], [HOMID, "dance"], ["garou-lupus", "howl"], [TOWN, "swoon"]] )
        answers[`${n}.${m}`] = (await fetch(`/${SR.actPath(n, m).split("?")[0]}`, {method: "HEAD"})).status;
      G.ok("1. the rules and the sheets", typeof A.lineWanted === "function" && typeof A.veil === "function" && typeof A.flash === "function" && SR.LINE_LABELS?.frenzy
        && SR.hasAct(ELDER, "frenzy") && SR.hasAct(HOMID, "cup") && Object.values(answers).every(s => s === 200), {answers});
    });

    await G.step("2. the day's sleep", async () => {
      await vamp.update({"flags.wodx-actions.daySleep": true});
      const a = await held(tv, "daysleep");
      await vamp.update({"flags.wodx-actions.daySleep": false});
      const up = await free(tv);
      G.ok("2. the day's sleep", a.name === "daysleep" && a.hold === true && up, {act: a, up});
    });

    await G.step("3. frenzy", async () => {
      await vamp.update({"system.conditions.isfrenzy": true});
      const a = await held(tv, "frenzy");
      await vamp.update({"system.conditions.isfrenzy": false});
      const up = await free(tv);
      G.ok("3. frenzy", a.name === "frenzy" && a.look === "red" && up, {act: a, up});
    });

    await G.step("4. blood spent flushes the figure", async () => {
      await A.flash(tv, "flush");
      await waitFor(() => A.looksOn(tv.object).includes("flush"), 3000);
      const on = A.looksOn(tv.object).includes("flush");
      await sleep(1600);
      G.ok("4. blood spent flushes the figure", on && !A.looksOn(tv.object).includes("flush"), {on});
    });

    await G.step("5. Obfuscate", async () => {
      Hooks.callAll("wodxPowerShown", vamp, {power: "Unseen Presence", group: "Obfuscate", line: "Vampire", token: tv.uuid});
      await waitFor(() => tv.flags?.[PD]?.veil?.kind === "unseen", 5000);
      await sleep(400);
      const hidden = tv.flags?.[PD]?.veil?.kind === "unseen", alpha = A.faded(tv.object);
      Hooks.callAll("wodxPowerShown", vamp, {power: "Unseen Presence", group: "Obfuscate", line: "Vampire", token: tv.uuid});
      await waitFor(() => !tv.flags?.[PD]?.veil, 5000);
      await sleep(400);
      G.ok("5. Obfuscate", hidden && alpha > 0 && alpha < .5 && !tv.flags?.[PD]?.veil && A.faded(tv.object) === 1, {hidden, alpha, back: A.faded(tv.object)});
    });

    await G.step("6. the howl", async () => {
      Hooks.callAll("wodxPowerShown", wolf, {power: "Call of the Wyld", group: "Gifts", line: "Werewolf"});
      await waitFor(() => act(tw).name === "cup", 5000);
      G.ok("6. the howl", act(tw).name === "cup", {act: act(tw)});
      await A.rise(tw);
    });

    await G.step("7. a Wraith in Slumber", async () => {
      await ghost.update({"system.advantages.corpus.temporary": 0});
      const a = await held(tg, "sleep");
      await ghost.update({"system.advantages.corpus.temporary": 5});
      const up = await free(tg);
      G.ok("7. a Wraith in Slumber", a.name === "sleep" && a.look === "faint" && up, {act: a, up});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
