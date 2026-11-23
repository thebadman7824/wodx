/**
 * Full check of V20 Dark Ages (B7665), WoDX Creation and WoDX Actions: the 80 Merits and Flaws of V20 Dark Ages. In
 * rothenstein-wodx (or any test world, in the Dark Ages) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedamerits.mjs?${Date.now()}`)).run()
 *   1. the creation wizard's Merits and Flaws page for a Dark Ages vampire lists the book's 80: Unclean, Rivalry and
 *      Thirteenth Generation are there, V20's Eat Food is not, and Child costs 4 (pp. 420-427)
 *   2. Thirteenth Generation taken in the wizard makes a Discipline roll one harder (p. 426)
 * Makes its own actor and removes it. Result: Data/wodx-gate/gatedamerits-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const custom = clan => ({clan: "custom", custom: {clan}});
const disc = (name, value) => ({name, type: "Power", system: {type: "wod.types.discipline", value}});
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Open a window, pick the option whose label holds `label` in the select `name`, tick boxes, press OK. */
async function work(open, re, {name, label, ticks = []} = {}) {
  for ( const old of windows().filter(x => re.test(x.title ?? "") && x.rendered) ) await old.close?.();
  open();
  let w = null;
  await waitFor(() => (w = titled(re)), 15000);
  const el = elOf(w), sel = name ? el?.querySelector?.(`select[name=${name}]`) : null;
  const options = [...(sel?.options ?? [])].map(o => o.textContent);
  const opt = sel ? [...sel.options].find(o => o.textContent.includes(label)) : null;
  if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  for ( const t of ticks ) { const b = el?.querySelector?.(`[name=${t}]`); if ( b ) b.checked = true; }
  return {w, el, options, opt: !!opt, ok: async () => { await new Promise(r => setTimeout(r, 500)); el?.querySelector?.('button[data-action="ok"]')?.click(); return waitFor(() => !w.rendered, 15000); }};
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatedamerits");
  if ( G.notLive() ) return "gatedamerits never runs in the Live world";
  const api = () => game.modules.get("wodx-creation")?.api;
  const act = (app, name, el) => app.options.actions[name].call(app, {}, el);
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 150000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }); };
  try {
    await waitFor(() => typeof api()?.wizard === "function" && !!game.wodxActions?.useDiscipline, 90000);
    const v = await G.make(Actor, {name: "Gate DA Thirteenth", type: "Vampire", system: {...custom("Brujah"), generation: 12, advantages: {bloodpool: {temporary: 8, max: 10}}},
      items: [disc("Presence", 1)]});
    await v.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6});
    await G.step("1. the wizard lists the Dark Ages 80", async () => {
      const app = await api().wizard(v); await sleep(300);
      await act(app, "go", {dataset: {page: "meritsFlaws"}}); await sleep(300);
      const sel = app.element.querySelector("select[name=pick-mf]");
      const opts = [...(sel?.options ?? [])].filter(o => o.value).map(o => o.textContent);
      const has = n => opts.some(o => o.startsWith(n + " ("));
      const child = opts.find(o => o.startsWith("Child (")) ?? "";
      const line = api().wizardLedger(v).line;
      // take Thirteenth Generation for step 2
      if ( sel ) { sel.value = "thirteenth-generation"; await act(app, "addFeature", app.element.querySelector(".wodx-wz-add button[data-action=addFeature]")); await sleep(500); }
      await app.close();
      G.ok("1. the wizard lists the Dark Ages 80", line === "vtda20" && opts.length === 80 && has("Unclean") && has("Rivalry") && has("Thirteenth Generation") && !has("Eat Food") && /, 4;/.test(child),
        {line, count: opts.length, child, eatFood: has("Eat Food")});
    }, {timeout: 60000});
    await G.step("2. Thirteenth Generation makes a Discipline one harder", async () => {
      const flaw = v.items.find(i => i.name === "Thirteenth Generation");
      const x = await work(() => game.wodxActions.useDiscipline({actor: v}), /^Use a Discipline/, {name: "power", label: "Awe"});
      await x.ok();
      const card = await fresh(m => /Awe/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      G.ok("2. Thirteenth Generation makes a Discipline one harder", !!flaw && x.opt && !!card && /Thirteenth Generation \+1/.test(text(card)),
        {flaw: !!flaw, option: x.opt, card: card ? text(card).slice(0, 300) : null});
    }, {timeout: 220000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
