/**
 * Dark Ages depth desk item 7 (B7641-B7643): Disciplines you can see on the map. In rothenstein-wodx (or any test world)
 * as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedalooks.mjs?${Date.now()}`)).run()
 *   1. a vampire works Dread Gaze (Presence) through the Use a Discipline window: its token is marked and WoDX
 *      Chronicle's token looks draw Dread Gaze's dark red aura
 *   2. Arms of Ahriman (Obtenebration), through the same window, draws the wide dark aura in place of it
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
    const lord = await G.make(Actor, {name: "Gate DA Looks Lord", type: "Vampire", system: {advantages: {bloodpool: {temporary: 10, max: 10}}},
      items: [{name: "Presence", type: "Power", system: {type: "wod.types.discipline", value: 5}}, {name: "Obtenebration", type: "Power", system: {type: "wod.types.discipline", value: 5}}]});
    const [td] = await G.tokens(s, [{actor: lord, x: 3, y: 3}]);
    await waitFor(() => !!td?.object, 8000);
    const mark = () => td.getFlag("wodx-actions", "powerLook") ?? null;
    const look = () => chronLooks().looksOf(td.object);
    const show = info => Hooks.callAll("wodxPowerShown", lord, {target: null, kind: "disc", line: "kindred", ...info});
    const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
    const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
    /** Work a power through the Use a Discipline window, picked by a part of its name. Returns the options it listed. */
    async function work(part) {
      await game.user.updateTokenTargets?.([]);
      game.wodxActions.useDiscipline({actor: lord});
      let w = null;
      await waitFor(() => (w = windows().find(x => /^Use a Discipline/.test(x.title ?? x.options?.window?.title ?? "") && x.rendered)), 8000);
      const el = elOf(w), sel = el?.querySelector?.("select[name=power]");
      const opt = [...(sel?.options ?? [])].find(o => o.textContent.includes(part));
      if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
      const seen = [], hid = Hooks.on("wodxPowerShown", (a, info) => seen.push({a: a?.name, power: info?.power ?? null, group: info?.group ?? null}));
      const n0 = game.messages.size;
      el?.querySelector?.('button[data-action="ok"]')?.click();
      await waitFor(() => seen.length > 0, 20000);
      Hooks.off("wodxPowerShown", hid);
      return {window: !!w, option: opt?.textContent ?? null, shown: seen, cards: game.messages.size - n0};
    }

    await G.step("1. Dread Gaze marks the token, and the token looks draw its dark red aura", async () => {
      const w = await work("Dread Gaze");
      const marked = await waitFor(() => mark()?.key === "presence", 20000);
      const l = look();
      G.ok("1. Dread Gaze marks the token, and the token looks draw its dark red aura", marked && l?.aura?.color === 0x801010, {...w, mark: mark(), aura: l?.aura ?? null});
    }, {timeout: 70000});

    await G.step("2. Arms of Ahriman draws the wide dark aura in place of it", async () => {
      const w = await work("Arms of Ahriman");
      const marked = await waitFor(() => mark()?.key === "obtenebration", 20000);
      const l = look();
      G.ok("2. Arms of Ahriman draws the wide dark aura in place of it", marked && l?.aura?.color === 0x08080c && l.aura.radius >= 1.2, {...w, mark: mark()?.key ?? null, aura: l?.aura ?? null});
    }, {timeout: 70000});

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
