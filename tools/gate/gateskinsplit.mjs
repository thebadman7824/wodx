/**
 * WoDX Sheets gate: line skins load line by line (B6060 to B6062), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateskinsplit.mjs?${Date.now()}`)).run()
 * Makes one scratch character of each line the system has and opens each sheet. Never moves the clock.
 *   1. the page starts with only the core skins sheet: no line file comes from module.json
 *   2. each sheet gets its own line's skin: the file loads, the paper is drawn, and the page is not left waiting
 *   3. the line files sit after the core sheet and before the layout sheet, in the generator's order
 *   4. with Sheet look set to the system's look the papers go, and back on WoDX they return
 * Result: Data/wodx-gate/gateskinsplit-result.json.
 */
import {gate} from "./kit.mjs";

const TYPES = ["Vampire", "Werewolf", "Mage", "Changeling", "Wraith", "Hunter", "Demon", "Mummy", "Mortal", "Creature"];

export async function run() {
  const G = gate("gateskinsplit");
  const S = () => game.modules.get("wodx-sheets")?.api?.skins;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const elOf = sheet => sheet?.element instanceof HTMLElement ? sheet.element : sheet?.element?.[0] ?? null;
  const papered = win => /data:image\/svg/.test(getComputedStyle(win.querySelector(".window-content")).backgroundImage);
  const look = game.settings.get("wodx-sheets", "sheetLook");
  try {
    await G.scene();
    const actors = await G.make(Actor, TYPES.map(type => ({name: `Gate Skin Split ${type}`, type})));
    if ( look !== "wodx" ) await game.settings.set("wodx-sheets", "sheetLook", "wodx");

    await G.step("1. only the core sheet on every page", async () => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute("href") ?? "");
      const core = links.filter(h => h.includes("wodx-sheets/styles/wodx-skins.css")).length;
      const fromModule = [...document.querySelectorAll('link[href*="wodx-sheets/styles/skins/"]')].filter(l => !l.dataset.wodxSkin).length;
      G.ok("1. only the core sheet on every page", !!S() && core === 1 && fromModule === 0, {core, fromModule, api: !!S()});
    });

    await G.step("2. each sheet wears its own line's skin", async () => {
      const rows = [];
      for ( const a of actors ) {
        const sheet = a.sheet;
        await sheet.render(true);
        await wait(() => elOf(sheet)?.isConnected);
        const win = elOf(sheet)?.closest(".wod20.wod-sheet");
        await wait(() => win && !win.classList.contains("wodx-wait-skin"), 5000);
        const lines = win ? S().linesOf(win) : [];
        rows.push({type: a.type, lines, loaded: lines.every(id => S().loaded().includes(id)), waiting: !!win?.classList.contains("wodx-wait-skin"), papered: !!win && papered(win)});
        await sheet.close();
      }
      const bad = rows.filter(r => !r.lines.length || !r.loaded || r.waiting || !r.papered);
      G.ok("2. each sheet wears its own line's skin", bad.length === 0, {rows, bad: bad.map(r => r.type)});
    });

    await G.step("3. the line files keep the single stylesheet's order", async () => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
      const at = f => links.findIndex(f);
      const core = at(l => (l.getAttribute("href") ?? "").includes("wodx-sheets/styles/wodx-skins.css"));
      const layout = at(l => (l.getAttribute("href") ?? "").includes("wodx-sheets/styles/wodx-layout.css"));
      const skins = links.map((l, i) => [l, i]).filter(([l]) => l.dataset.wodxSkin);
      const orders = skins.map(([l]) => +l.dataset.order);
      const sorted = orders.every((o, i) => !i || orders[i - 1] < o);
      const between = skins.every(([, i]) => i > core && (layout < 0 || i < layout));
      const next = skins.every(([, i], k) => i === core + 1 + k);
      G.ok("3. the line files keep the single stylesheet's order", skins.length > 0 && sorted && between && next, {core, layout, skins: skins.map(([l, i]) => `${i}:${l.dataset.wodxSkin}`)});
    });

    await G.step("4. the Sheet look setting still switches them", async () => {
      const a = actors[0], sheet = a.sheet;
      await game.settings.set("wodx-sheets", "sheetLook", "system");
      await sheet.render(true);
      await wait(() => elOf(sheet)?.isConnected);
      let win = elOf(sheet).closest(".wod20.wod-sheet");
      const off = papered(win);
      await game.settings.set("wodx-sheets", "sheetLook", "wodx");
      await wait(() => papered(win), 5000);
      win = elOf(sheet).closest(".wod20.wod-sheet");
      const on = papered(win);
      await sheet.close();
      G.ok("4. the Sheet look setting still switches them", !off && on, {off, on});
    });
  } catch (e) {
    G.ok("no error", false, {error: e.message});
  } finally {
    if ( game.settings.get("wodx-sheets", "sheetLook") !== look ) await game.settings.set("wodx-sheets", "sheetLook", look);
    return G.finish();
  }
}
