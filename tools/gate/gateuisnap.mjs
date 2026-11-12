/**
 * Sheet snapshot gate (layout pass), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gateuisnap.mjs?${Date.now()}`)).run()
 * Opens one sheet of every kind the world holds (each actor type and each WoDX sheet of it, each item type and
 * sub-type, light and dark), measures it, and saves the drawn markup so the layout can be checked and reworked
 * outside Foundry. It only opens and closes sheets: no document is created, changed or deleted.
 * If the page has a function wodxShot(name) (a Playwright runner can expose one that calls page.screenshot),
 * it is called for every sheet and tab.
 * Result: Data/wodx-gate/gateuisnap-result.json and gateuisnap-part-N.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (test, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };
const R = { started: new Date().toISOString(), sheets: [], errors: [], parts: 0 };
const elOf = sheet => sheet?.element instanceof HTMLElement ? sheet.element : sheet?.element?.[0] ?? null;
const safe = s => String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70);
const shot = async name => { try { if (typeof window.wodxShot === "function") await window.wodxShot(safe(name)); } catch (e) { /* pictures are optional */ } };

/** Write what the user sees into the markup: typed values, ticks and picks are properties, not attributes. */
function freeze(el) {
  for (const i of el.querySelectorAll("input")) {
    if (i.type === "checkbox" || i.type === "radio") { if (i.checked) i.setAttribute("checked", ""); else i.removeAttribute("checked"); }
    else i.setAttribute("value", i.value);
  }
  for (const s of el.querySelectorAll("select")) for (const o of s.options) { if (o.selected) o.setAttribute("selected", ""); else o.removeAttribute("selected"); }
  for (const t of el.querySelectorAll("textarea")) t.textContent = t.value;
}

/** A few measurements of the live sheet, to compare with the same markup drawn outside Foundry. */
function measure(el) {
  const r = el.getBoundingClientRect();
  const wc = el.querySelector(".window-content");
  const controls = [...el.querySelectorAll("input:not([type=hidden]), select, textarea, button, a[data-action], [data-tab]")].filter(c => c.offsetParent !== null);
  const bg = c => getComputedStyle(c).backgroundColor;
  return { rect: [r.x, r.y, r.width, r.height].map(Math.round), content: wc ? [wc.clientWidth, wc.clientHeight, wc.scrollWidth, wc.scrollHeight] : null,
    shown: controls.length, sample: controls.slice(0, 40).map(c => { const q = c.getBoundingClientRect(); return [c.tagName, c.name || c.dataset.tab || c.dataset.action || "", Math.round(q.x - r.x), Math.round(q.y - r.y), Math.round(q.width), Math.round(q.height), bg(c)]; }) };
}

async function capture(doc, kind, label) {
  const sheet = doc.sheet;
  const entry = { kind, label, id: doc.uuid, name: doc.name, type: doc.type, sub: doc.system?.type ?? null, sheet: sheet?.constructor?.name ?? null, tabs: [] };
  try {
    await sheet.render(true);
    await until(() => !!elOf(sheet) && elOf(sheet).isConnected && (sheet.rendered ?? true));
    await sleep(700);
    const el = elOf(sheet);
    if (!el) throw new Error("the sheet did not draw");
    entry.classes = el.className; entry.tag = el.tagName; entry.style = el.getAttribute("style");
    entry.position = { ...(sheet.position ?? {}) };
    const navs = [...el.querySelectorAll("nav.sheet-tabs [data-tab], nav.tabs [data-tab]")].filter(n => n.offsetParent !== null);
    const first = navs.find(n => n.classList.contains("active"))?.dataset.tab ?? null;
    entry.first = first;
    entry.m0 = measure(el);
    await shot(`${label}--${first ?? "sheet"}`);
    for (const n of navs) {
      const tab = n.dataset.tab;
      if (tab === first) { entry.tabs.push({ tab, m: entry.m0 }); continue; }
      try { n.click(); await sleep(250); entry.tabs.push({ tab, m: measure(el) }); await shot(`${label}--${tab}`); }
      catch (e) { entry.tabs.push({ tab, error: e.message }); }
    }
    if (first) { navs.find(n => n.dataset.tab === first)?.click(); await sleep(150); }
    freeze(el);
    entry.html = el.outerHTML;
  } catch (e) { entry.error = e.message; R.errors.push(`${label}: ${e.message}`); }
  try { await sheet.close(); } catch (e) { /* already closed */ }
  await sleep(150);
  return entry;
}

async function save(name, data) {
  const file = new File([JSON.stringify(data)], name, { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
}

export async function run({ maxItems = 90 } = {}) {
  const api = game.modules.get("wodx-sheets")?.api;
  const keyOf = a => { try { return api?.sheetFor?.(a) ?? ""; } catch (e) { return ""; } };
  R.versions = Object.fromEntries([...game.modules].filter(m => m.active && m.id.startsWith("wodx")).map(m => [m.id, m.version]));
  R.system = game.system.version; R.foundry = game.version; R.world = game.world.id;
  R.page = { html: document.documentElement.className, body: document.body.className, bodyStyle: document.body.getAttribute("style"), size: [innerWidth, innerHeight],
    sheets: [...document.styleSheets].map(s => s.href).filter(Boolean),
    files: [...new Set(performance.getEntriesByType("resource").map(e => e.name))].filter(u => u.startsWith(location.origin) && /\.(css|woff2?|ttf|otf|png|jpe?g|webp|svg)(\?|$)/i.test(u)).map(u => u.slice(location.origin.length)) };

  // Actors: for each type, WoDX sheet and variant, the character with the most on it
  const groups = new Map();
  for (const a of game.actors) {
    const k = [a.type, a.sheet?.constructor?.name, keyOf(a), a.system?.settings?.variant ?? ""].join("|");
    const cur = groups.get(k);
    if (!cur || a.items.size > cur.items.size) groups.set(k, a);
  }
  // Items: one of every type and sub-type, from the world and from those characters; the ones a module made first
  const items = new Map();
  const modded = i => Object.keys(i.flags ?? {}).some(s => s.startsWith("wodx"));
  const pool = [...game.items, ...[...groups.values()].flatMap(a => [...a.items])];
  for (const i of pool.sort((x, y) => Number(modded(y)) - Number(modded(x)))) {
    const k = [i.type, i.system?.type ?? "", i.sheet?.constructor?.name, modded(i) ? Object.keys(i.flags).filter(s => s.startsWith("wodx")).sort().join("+") : ""].join("|");
    if (!items.has(k)) items.set(k, i);
  }
  R.counts = { actorKinds: groups.size, itemKinds: items.size };

  let part = [], bytes = 0;
  const flush = async () => { if (!part.length) return; R.parts++; await save(`gateuisnap-part-${R.parts}.json`, part); part = []; bytes = 0; };
  const add = async e => {
    const { html, ...rest } = e;
    R.sheets.push({ ...rest, part: R.parts + 1, bytes: html?.length ?? 0 });
    if (html) { part.push({ label: e.label, html }); bytes += html.length; if (bytes > 6e6) await flush(); }
  };
  for (const [k, a] of [...groups].sort()) await add(await capture(a, "actor", `actor-${k}`));
  let n = 0;
  for (const [k, i] of [...items].sort()) { if (n++ >= maxItems) break; await add(await capture(i, "item", `item-${k}`)); }
  await flush();
  R.finished = new Date().toISOString();
  R.pass = R.sheets.length > 0 && !R.errors.length;
  await save("gateuisnap-result.json", R);
  return { pass: R.pass, sheets: R.sheets.length, parts: R.parts, errors: R.errors.length };
}
