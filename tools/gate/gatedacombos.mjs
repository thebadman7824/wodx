/**
 * Full check of V20 Dark Ages (B7664), WoDX Actions: the 23 combination Disciplines (pp. 312-317). In rothenstein-wodx
 * (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedacombos.mjs?${Date.now()}`)).run()
 *   1. a vampire with Auspex, Celerity and Fortitude 1 finds Guardian Vigil in the Use a Discipline window, and one
 *      without Fortitude does not (p. 315)
 *   2. Guardian Vigil works from the window: one blood spent, a card with the power, its experience cost shown (7)
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedacombos-result.json.
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

export async function run() {
  const G = gate("gatedacombos");
  if ( G.notLive() ) return "gatedacombos never runs in the Live world";
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 150000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }); };
  try {
    await waitFor(() => !!game.wodxActions?.useDiscipline, 30000);
    const a = await G.make(Actor, {name: "Gate DA Watchful", type: "Vampire", system: {...custom("Malkavian"), advantages: {bloodpool: {temporary: 8, max: 10}}},
      items: [disc("Auspex", 1), disc("Celerity", 1), disc("Fortitude", 1)]});
    const b = await G.make(Actor, {name: "Gate DA Unwatchful", type: "Vampire", system: {...custom("Malkavian"), advantages: {bloodpool: {temporary: 8, max: 10}}},
      items: [disc("Auspex", 1), disc("Celerity", 1)]});
    let x = null;
    await G.step("1. Guardian Vigil is offered only with all three Disciplines", async () => {
      const y = await work(() => game.wodxActions.useDiscipline({actor: b}), /^Use a Discipline/, {name: "power", label: "Guardian Vigil"});
      await y.w?.close?.();
      x = await work(() => game.wodxActions.useDiscipline({actor: a}), /^Use a Discipline/, {name: "power", label: "Guardian Vigil"});
      const info = x.el?.querySelector?.(".wodx-disc-info")?.textContent ?? "";
      G.ok("1. Guardian Vigil is offered only with all three Disciplines", x.opt && !y.opt && /7 experience/.test(info), {with: x.opt, without: y.opt, info: info.slice(0, 300)});
    }, {timeout: 60000});
    await G.step("2. Guardian Vigil works from the window", async () => {
      const before = Number(a.system.advantages?.bloodpool?.temporary);
      const closed = await x.ok();
      const card = await fresh(m => /Guardian Vigil/.test(text(m)));
      const after = Number(a.system.advantages?.bloodpool?.temporary);
      G.ok("2. Guardian Vigil works from the window", closed && !!card && after === before - 1, {closed, before, after, card: card ? text(card).slice(0, 300) : null});
    }, {timeout: 220000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
