/**
 * Line sheets on ApplicationV2 (B6110 to B6114), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheetv2.mjs?${Date.now()}`)).run()
 * For every line the system lists in LINES_V2, makes its own character of that type and checks, on the sheet it gets:
 * the sheet runs on ApplicationV2 through the bridge (and its WoDX sheet keeps its name); the window carries the line's
 * classes; every tab of both tab rows opens; the lock opens; a typed field saves through the form; a dot sets a value;
 * the Bio tab's editors are live <prose-mirror> fields on the same data; the Gender line and the Print and History
 * controls are there; an item dropped on the sheet joins the character; the sheet redraws after a change and closes,
 * with no errors logged. Everything it makes is removed. Result: Data/wodx-gate/gatesheetv2-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));
// An ApplicationV2 sheet's element is a <form>, and form[0] is its first control: test for the element first
const elOf = s => (s?.element instanceof HTMLElement ? s.element : s?.element?.[0]) ?? null;
const SYS = {"Mortal": {variant: "general"}, "Vampire": {variant: "general"}, "Changeling": {variant: "general"}, "Wraith": {variant: "general"},
  "Creature": {variant: "general"}, "Exalted": {variant: "general"}, "Changing Breed": {changingbreed: "Bastet"}};

export async function run() {
  const G = gate("gatesheetv2", {stepTimeout: 45000});
  const errs = [];
  const onErr = e => errs.push(String(e?.message ?? e?.reason?.message ?? e?.reason ?? e));
  window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  try {
    const {LINES_V2} = await import(`/systems/worldofdarkness/module/actor/template/lines-v2.js?${Date.now()}`);
    G.ok("0. at least one line runs on ApplicationV2", LINES_V2.size > 0, {lines: [...LINES_V2]});
    const [item] = await G.make(Item, [{name: "Gate V2 Lantern", type: "Item", system: {description: "A gate item"}}]);
    for (const type of LINES_V2) {
      const pre = `${type}:`;
      const sys = SYS[type] ? {settings: {variant: SYS[type].variant ?? "general"}, ...(SYS[type].changingbreed ? {changingbreed: SYS[type].changingbreed} : {})} : {};
      const [a] = await G.make(Actor, [{name: `Gate V2 ${type}`, type, system: sys}]);
      const sheet = a.sheet;
      const e0 = errs.length;
      await G.step(`${pre} 1. the sheet runs on ApplicationV2 with the line's classes`, async () => {
        await sheet.render(true);
        await waitFor(() => sheet.rendered && elOf(sheet)?.querySelector(".wod-legacy-form .sheet-body"), 15000);
        await sleep(400);
        const el = elOf(sheet);
        const cls = [...(el?.classList ?? [])];
        G.ok(`${pre} 1. the sheet runs on ApplicationV2 with the line's classes`,
          !!sheet.isLegacyBridge && el?.tagName === "FORM" && cls.includes("application") && cls.includes("wod20") && cls.includes("wod-sheet") && !!el.querySelector(".wod-legacy-form"),
          {sheet: sheet.constructor.name, tag: el?.tagName, cls: cls.join(" ")});
      });
      await G.step(`${pre} 2. every tab opens`, async () => {
        const el = elOf(sheet);
        const res = [];
        for (const nav of el.querySelectorAll("nav.sheet-tabs [data-tab], nav.sheet-setting-tabs [data-tab]")) {
          if (nav.closest("a[href]") || nav.getAttribute("href")) continue;
          const group = nav.closest("nav")?.dataset.group, tab = nav.dataset.tab;
          if (nav.offsetParent === null) continue;
          nav.click(); await sleep(120);
          const body = [...el.querySelectorAll(`.tab[data-tab="${tab}"]`)].find(t => !group || !t.dataset.group || t.dataset.group === group);
          res.push({group, tab, active: !!body?.classList.contains("active")});
        }
        el.querySelector('nav.sheet-tabs [data-tab="core"]')?.click(); await sleep(120);
        G.ok(`${pre} 2. every tab opens`, res.length > 2 && res.every(r => r.active), {tabs: res.filter(r => !r.active).map(r => r.tab), count: res.length});
      });
      await G.step(`${pre} 3. the lock opens and the sheet redraws`, async () => {
        elOf(sheet).querySelector(".lock-btn")?.click();
        const opened = await waitFor(() => sheet.locked === false && !elOf(sheet).querySelector(".wod-legacy-form.locked"), 6000);
        G.ok(`${pre} 3. the lock opens and the sheet redraws`, opened, {locked: sheet.locked});
      });
      await G.step(`${pre} 4. a typed field saves through the form`, async () => {
        const el = elOf(sheet);
        el.querySelector('nav.sheet-tabs [data-tab="bio"]')?.click(); await sleep(150);
        const box = el.querySelector('input[name="system.nature"]') ?? el.querySelector('input[name="name"]');
        const field = box?.name, want = field === "name" ? `Gate V2 ${type} renamed` : "Gate nature";
        if (box) { box.value = want; box.dispatchEvent(new Event("change", {bubbles: true})); }
        const saved = await waitFor(() => foundry.utils.getProperty(a, field) === want, 6000);
        G.ok(`${pre} 4. a typed field saves through the form`, !!box && saved, {field, now: field && foundry.utils.getProperty(a, field)});
      });
      await G.step(`${pre} 5. the Bio tab's editors are live on the same data`, async () => {
        await waitFor(() => elOf(sheet)?.querySelector(".tab.bio"), 4000);
        const el = elOf(sheet);
        const eds = [...el.querySelectorAll(".tab.bio prose-mirror.wod-legacy-editor")];
        const old = el.querySelectorAll(".tab.bio .editor-content[data-edit]").length;
        G.ok(`${pre} 5. the Bio tab's editors are live on the same data`, eds.length >= 1 && old === 0 && eds.some(e => e.getAttribute("name") === "system.appearance"),
          {editors: eds.map(e => e.getAttribute("name")), leftOver: old});
      });
      await G.step(`${pre} 6. a dot sets a value`, async () => {
        const el = elOf(sheet);
        el.querySelector('nav.sheet-tabs [data-tab="core"]')?.click(); await sleep(150);
        let path, dot;
        const sysDot = el.querySelector('.tab.core .resource-value[data-name="attributes.strength.value"] .resource-value-step[data-index="3"]');
        if (sysDot) { path = "system.attributes.strength.value"; dot = sysDot; }
        else {
          const box = el.querySelector(".tab.core .wodx-dots[data-set*='strength']") ?? el.querySelector(".tab.core .wodx-dots[data-set]");
          dot = box?.querySelector(".wodx-dot[data-i='3']");
          const set = box?.dataset.set;
          path = set ? (set.startsWith("system.") || set.startsWith("flags.") ? set : `system.${set}`) : null;
        }
        const before = path ? Number(foundry.utils.getProperty(a, path) ?? 0) : null;
        const want = before === 3 ? 2 : 3;
        if (want === 2) dot = dot?.parentElement?.querySelector(`[data-index="2"], [data-i="2"]`) ?? dot;
        dot?.click();
        const set = path ? await waitFor(() => Number(foundry.utils.getProperty(a, path)) === want, 6000) : false;
        G.ok(`${pre} 6. a dot sets a value`, !!dot && set, {path, before, now: path && foundry.utils.getProperty(a, path)});
      });
      await G.step(`${pre} 7. the Gender line and the Print and History controls are there`, async () => {
        await sleep(300);
        const el = elOf(sheet);
        const gender = !!el.querySelector(".wodx-gender-field");
        const wodx = game.modules.get("wodx-sheets")?.active;
        // modules add their controls through the getHeaderControls hook, which also registers each one's action
        const controls = Object.keys(sheet.options?.actions ?? {});
        const want = wodx && sheet.constructor.name.startsWith("Wodx") ? ["wodxPrint", "wodxHistory"] : [];
        G.ok(`${pre} 7. the Gender line and the Print and History controls are there`, (!wodx || gender) && want.every(w => controls.includes(w)),
          {gender, controls, sheet: sheet.constructor.name});
      });
      await G.step(`${pre} 8. an item dropped on the sheet joins the character`, async () => {
        const el = elOf(sheet);
        const dt = new DataTransfer();
        dt.setData("text/plain", JSON.stringify({type: "Item", uuid: item.uuid}));
        const target = el.querySelector(".sheet-body") ?? el;
        target.dispatchEvent(new DragEvent("drop", {bubbles: true, cancelable: true, dataTransfer: dt}));
        const got = await waitFor(() => a.items.some(i => i.name === item.name), 6000);
        G.ok(`${pre} 8. an item dropped on the sheet joins the character`, got, {items: a.items.map(i => i.name)});
      });
      await G.step(`${pre} 9. the sheet closes with no errors logged`, async () => {
        await sheet.close();
        await sleep(300);
        const mine = errs.slice(e0);
        G.ok(`${pre} 9. the sheet closes with no errors logged`, !sheet.rendered && !mine.length, {errors: mine.slice(0, 5)});
      });
    }
  } finally {
    window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
    return G.finish();
  }
}
