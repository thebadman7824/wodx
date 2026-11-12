/**
 * Stylesheet probe (layout pass), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatecssprobe.mjs?${Date.now()}`)).run()
 * Says how the page loads each package's stylesheets (linked, or imported into which cascade layer, in what order),
 * whether WoDX Sheets' layout stylesheet is among them, and what one open character sheet's title bar and WoDX
 * buttons actually get. It opens one sheet and closes it; nothing is changed.
 * Result: Data/wodx-gate/gatecssprobe-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function run() {
  const R = { started: new Date().toISOString(), sheets: [], layerOrder: [], errors: [] };
  const short = h => (h ?? "").replace(location.origin, "");
  for (const s of document.styleSheets) {
    const e = { href: short(s.href), owner: s.ownerNode?.tagName, id: s.ownerNode?.id || null, imports: [], layers: [] };
    try {
      for (const r of s.cssRules) {
        if (r instanceof CSSImportRule) e.imports.push({ href: short(r.href), layer: r.layerName ?? null, rules: (() => { try { return r.styleSheet?.cssRules?.length ?? null; } catch (x) { return "blocked"; } })() });
        else if (typeof CSSLayerStatementRule !== "undefined" && r instanceof CSSLayerStatementRule) { e.layers.push(...r.nameList); if (!R.layerOrder.length) R.layerOrder = [...r.nameList]; }
      }
    } catch (x) { e.error = x.message; }
    if (e.href || e.imports.length) R.sheets.push(e);
  }
  const all = R.sheets.flatMap(s => [s.href, ...s.imports.map(i => i.href)]);
  R.layoutLoaded = all.some(h => /wodx-layout\.css/.test(h));
  R.layoutEntry = R.sheets.flatMap(s => s.imports).find(i => /wodx-layout\.css/.test(i.href)) ?? null;
  R.sheetsModule = game.modules.get("wodx-sheets")?.version;
  R.sheetsStyles = [...(game.modules.get("wodx-sheets")?.styles ?? [])].map(s => ({ src: s.src ?? s, layer: s.layer ?? null }));
  try { const res = await fetch(`/modules/wodx-sheets/styles/wodx-layout.css?${Date.now()}`); R.layoutFetch = { status: res.status, bytes: (await res.text()).length }; } catch (x) { R.layoutFetch = { error: x.message }; }
  const a = game.actors.find(x => x.sheet?.constructor?.name?.startsWith("Wodx") && x.system?.settings?.variant);
  if (a) {
    await a.sheet.render(true);
    // The sheet draws a moment after render() returns: wait until its element is in the page
    const elOf = () => { const e = a.sheet.element; return e instanceof HTMLElement ? e : e?.[0] ?? null; };
    for (let t = 0; t < 80 && !elOf()?.isConnected; t++) await sleep(100);
    await sleep(700);
    const el = elOf();
    if (!el) throw new Error("the sheet did not draw");
    const cs = (sel, props) => { const n = el.querySelector(sel); if (!n) return null; const s = getComputedStyle(n); return Object.fromEntries([["w", Math.round(n.getBoundingClientRect().width)], ...props.map(p => [p, s[p]])]); };
    R.actor = a.name; R.classes = el.className;
    R.title = cs(".window-header .window-title", ["flex", "minWidth", "overflow", "fontSize"]);
    R.headerButton = cs(".window-header a.header-button.wodx-print, .window-header a.header-button.configure-sheet", ["fontSize", "flex", "margin", "lineHeight"]);
    R.headerButtons = [...el.querySelectorAll(".window-header a")].map(b => [b.className, getComputedStyle(b).fontSize, Math.round(b.getBoundingClientRect().width), b.dataset.tooltip ?? null]);
    R.tieButton = cs(".wodx-ties button.wodx-act", ["color", "backgroundColor", "minHeight", "border"]);
    R.possPanel = cs(".wodx-possessions", ["backgroundColor", "borderRadius", "padding"]);
    R.header = cs(".window-header", ["flexWrap", "display"]);
    await a.sheet.close();
  } else R.errors.push("no WoDX character sheet found");
  R.pass = R.layoutLoaded && R.title?.w > 60;
  const file = new File([JSON.stringify(R, null, 1)], "gatecssprobe-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return { pass: R.pass, layoutLoaded: R.layoutLoaded, title: R.title, headerButton: R.headerButton };
}
