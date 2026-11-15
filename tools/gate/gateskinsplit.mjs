/**
 * WoDX Sheets gate: line skins load line by line (B6060 to B6062), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateskinsplit.mjs?${Date.now()}`)).run()
 * Makes one scratch character of each line the system has and opens each sheet. Never moves the clock.
 *   1. the page has the core skins sheet, and no line file came in with module.json
 *   2. each sheet gets its own line's skin: the file loads, the paper is drawn, and the page is not left waiting
 *   3. the line files sit straight after the core sheet, before the layout sheet, in the generator's order, in the
 *      core sheet's cascade layer (B6063)
 *   4. with Sheet look set to the system's look the papers go, and back on WoDX they return
 * Result: Data/wodx-gate/gateskinsplit-result.json.
 */
import {gate} from "./kit.mjs";
import {SKINS} from "/modules/wodx-sheets/scripts/skins-index.mjs";

const SK_ORDER = SKINS.map(s => s.id);

const TYPES = ["Vampire", "Werewolf", "Mage", "Changeling", "Wraith", "Hunter", "Demon", "Mummy", "Mortal", "Creature"];

export async function run() {
  const G = gate("gateskinsplit");
  const S = () => game.modules.get("wodx-sheets")?.api?.skins;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const elOf = sheet => sheet?.element instanceof HTMLElement ? sheet.element : sheet?.element?.[0] ?? null;
  const papered = win => /data:image\/svg/.test(getComputedStyle(win.querySelector(".window-content")).backgroundImage);
  const look = game.settings.get("wodx-sheets", "sheetLook");
  // Every stylesheet in cascade order, however it came in (a <link>, a <style>, or an @import into a layer)
  const sheets = () => {
    const out = [];
    const walk = (sh, layer) => {
      if (sh.href) out.push({href: sh.href, layer, line: /styles\/skins\/([a-z0-9-]+)\.css/.exec(sh.href)?.[1] ?? null});
      let rules = []; try { rules = [...sh.cssRules]; } catch { /* another origin */ }
      for ( const r of rules ) if ( r instanceof CSSImportRule && r.styleSheet ) walk(r.styleSheet, r.layerName ?? null);
    };
    for ( const sh of document.styleSheets ) walk(sh, null);
    return out;
  };
  try {
    await G.scene();
    const actors = await G.make(Actor, TYPES.map(type => ({name: `Gate Skin Split ${type}`, type})));
    if ( look !== "wodx" ) await game.settings.set("wodx-sheets", "sheetLook", "wodx");

    await G.step("1. the core sheet, and no line file from module.json", async () => {
      const all = sheets(), rep = S()?.report?.() ?? null;
      const core = all.filter(x => x.href.includes("wodx-sheets/styles/wodx-skins.css")).length;
      const lines = all.filter(x => x.line).map(x => x.line), mine = S()?.loaded?.() ?? [];
      const stray = lines.filter(id => !mine.includes(id) && !(rep?.failed ?? []).includes(id));
      G.ok("1. the core sheet, and no line file from module.json", !!S() && core === 1 && !stray.length, {core, lines, stray, rep});
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
      G.ok("2. each sheet wears its own line's skin", bad.length === 0, {bad: bad.map(r => r.type), rep: S().report(), rows});
    });

    await G.step("3. the line files keep the single stylesheet's order", async () => {
      const all = sheets(), order = id => SK_ORDER.indexOf(id);
      const core = all.findIndex(x => x.href.includes("wodx-sheets/styles/wodx-skins.css"));
      const layout = all.findIndex(x => x.href.includes("wodx-sheets/styles/wodx-layout.css"));
      const lines = all.map((x, i) => ({...x, i})).filter(x => x.line);
      const sorted = lines.every((x, k) => !k || order(lines[k - 1].line) < order(x.line));
      const next = lines.every((x, k) => x.i === core + 1 + k) && (layout < 0 || layout > core + lines.length);
      const sameLayer = lines.every(x => x.layer === all[core]?.layer);
      G.ok("3. the line files keep the single stylesheet's order", lines.length > 0 && sorted && next && sameLayer,
        {core, layout, layer: all[core]?.layer ?? null, lines: lines.map(x => `${x.i}:${x.line}:${x.layer ?? "-"}`)});
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
