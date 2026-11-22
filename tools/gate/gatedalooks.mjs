/**
 * Dark Ages depth desk item 7 (B7641-B7643): Disciplines you can see on the map. In rothenstein-wodx (or any test world)
 * as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedalooks.mjs?${Date.now()}`)).run()
 *   1. a vampire works Majesty (Presence): its token is marked and WoDX Chronicle's token looks draw Majesty's gold aura
 *   2. Arms of Ahriman (Obtenebration) draws the wide dark aura in place of it
 *   3. Unseen Presence (Obfuscate) marks nothing: showing it would undo it
 *   4. the look passes: after its seconds the token shows no Discipline look
 * Makes its own scene, actor and token and removes them. Result: Data/wodx-gate/gatedalooks-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const chronLooks = () => game.modules.get("wodx-chronicle")?.api?.tokenLooks;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatedalooks");
  if ( G.notLive() ) return "gatedalooks never runs in the Live world";
  try {
    await waitFor(() => !!chronLooks()?.looksOf, 30000);
    const s = await G.scene({name: "WoDX gate: gatedalooks"});
    const lord = await G.make(Actor, {name: "Gate DA Looks Lord", type: "Vampire"});
    const [td] = await G.tokens(s, [{actor: lord, x: 3, y: 3}]);
    await waitFor(() => !!td?.object, 8000);
    const mark = () => td.getFlag("wodx-actions", "powerLook") ?? null;
    const look = () => chronLooks().looksOf(td.object);
    const show = info => Hooks.callAll("wodxPowerShown", lord, {target: null, kind: "disc", line: "kindred", ...info});

    await G.step("1. Majesty marks the token, and the token looks draw its gold aura", async () => {
      show({power: "Majesty", group: "Presence"});
      const marked = await waitFor(() => mark()?.key === "presence", 6000);
      const l = look();
      G.ok("1. Majesty marks the token, and the token looks draw its gold aura", marked && l?.aura?.color === 0xffe8a8, {mark: mark(), aura: l?.aura ?? null});
    });

    await G.step("2. Arms of Ahriman draws the wide dark aura in place of it", async () => {
      show({power: "Arms of Ahriman", group: "Obtenebration"});
      const marked = await waitFor(() => mark()?.key === "obtenebration", 6000);
      const l = look();
      G.ok("2. Arms of Ahriman draws the wide dark aura in place of it", marked && l?.aura?.color === 0x08080c && l.aura.radius >= 1.2, {mark: mark()?.key ?? null, aura: l?.aura ?? null});
    });

    await G.step("3. Unseen Presence marks nothing", async () => {
      const before = JSON.stringify(mark());
      show({power: "Unseen Presence", group: "Obfuscate"});
      await sleep(1500);
      G.ok("3. Unseen Presence marks nothing", JSON.stringify(mark()) === before, {mark: mark()?.key ?? null});
    });

    await G.step("4. the look passes after its seconds", async () => {
      const until = Number(mark()?.until ?? 0);
      await sleep(Math.max(0, until - Date.now()) + 800);
      const l = look();
      const dark = !!l?.aura && l.aura.color === 0x08080c;
      G.ok("4. the look passes after its seconds", !dark, {aura: l?.aura ?? null});
    }, {timeout: 20000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
