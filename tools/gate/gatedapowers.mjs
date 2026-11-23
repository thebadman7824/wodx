/**
 * Full check of V20 Dark Ages (B7662-B7663), WoDX Actions: the powers, rituals and Auspex rules the check found missing.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedapowers.mjs?${Date.now()}`)).run()
 *   1. a Gargoyle's Use a Discipline window lists Flight to its dots (V20 Dark Ages p. 221)
 *   2. a Tremere with Creatio Ignis 3 works Campfire through the window: a Willpower roll at difficulty 6 (p. 297)
 *   3. a Gargoyle wakes an enchanted Heart of Stone in the Cast a ritual window: one blood, no roll (p. 309)
 *   4. an Auspex card's "Overstimulated?" button rolls Willpower and posts the result (p. 195)
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedapowers-result.json.
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
  const G = gate("gatedapowers");
  if ( G.notLive() ) return "gatedapowers never runs in the Live world";
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 150000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }); };
  try {
    await waitFor(() => !!game.wodxActions?.useDiscipline && !!game.wodxActions?.castRitual, 30000);
    const garg = await G.make(Actor, {name: "Gate DA Gargoyle", type: "Vampire", system: {...custom("Gargoyle"), advantages: {bloodpool: {temporary: 8, max: 10}}},
      items: [disc("Flight", 2), disc("Fortitude", 1)]});

    await G.step("1. a Gargoyle's window lists Flight to its dots", async () => {
      const x = await work(() => game.wodxActions.useDiscipline({actor: garg}), /^Use a Discipline/, {name: "power", label: "Flight"});
      const flights = x.options.filter(o => /^Flight/.test(o));
      await x.w?.close?.();
      G.ok("1. a Gargoyle's window lists Flight to its dots", flights.length === 2 && flights.every(o => /passive/.test(o)), {flights});
    }, {timeout: 60000});

    await G.step("2. Creatio Ignis 3 works Campfire at difficulty 6", async () => {
      const t = await G.make(Actor, {name: "Gate DA Tremere", type: "Vampire", system: {...custom("Tremere"), advantages: {bloodpool: {temporary: 8, max: 10}}},
        items: [disc("Creatio Ignis", 3)]});
      await t.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6}); // a new Vampire starts at 0
      const x = await work(() => game.wodxActions.useDiscipline({actor: t}), /^Use a Discipline/, {name: "power", label: "Campfire"});
      const diff = x.el?.querySelector?.("[name=diff]")?.value;
      const closed = await x.ok();
      const card = await fresh(m => /Campfire/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      G.ok("2. Creatio Ignis 3 works Campfire at difficulty 6", x.opt && diff === "6" && closed && !!card && /diff 6/.test(text(card)) && /reaches 10 yards/.test(text(card)),
        {option: x.opt, diff, closed, card: card ? text(card).slice(0, 300) : null, blood: t.system.advantages?.bloodpool?.temporary});
    }, {timeout: 220000});

    await G.step("3. an enchanted Heart of Stone wakes for one blood, no roll", async () => {
      const before = Number(garg.system.advantages?.bloodpool?.temporary);
      const x = await work(() => game.wodxActions.castRitual({actor: garg}), /^Cast a ritual/, {name: "rit", label: "Heart of Stone", ticks: ["enchanted"]});
      const shown = x.el?.querySelector?.(".wodx-garg-rit")?.style?.display !== "none";
      const closed = await x.ok();
      const card = await fresh(m => /Heart of Stone/.test(text(m)));
      const after = Number(garg.system.advantages?.bloodpool?.temporary);
      G.ok("3. an enchanted Heart of Stone wakes for one blood, no roll", x.opt && shown && !!card && /no roll/.test(text(card)) && !(card.rolls?.length) && after === before - 1,
        {option: x.opt, shown, closed, before, after, card: card ? text(card).slice(0, 300) : null});
    }, {timeout: 220000});

    await G.step("4. the Auspex card's Overstimulated? button rolls Willpower", async () => {
      const s = await G.make(Actor, {name: "Gate DA Seer", type: "Vampire", system: {...custom("Toreador"), advantages: {bloodpool: {temporary: 8, max: 10}}},
        items: [disc("Auspex", 1)]});
      await s.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6});
      const x = await work(() => game.wodxActions.useDiscipline({actor: s}), /^Use a Discipline/, {name: "power", label: "Heightened Senses"});
      await x.ok();
      const card = await fresh(m => /Heightened Senses/.test(text(m)) && /data-kx="overstim"/.test(m.content ?? ""));
      let btn = null;
      await waitFor(() => (btn = document.querySelector(`[data-message-id="${card?.id}"] button[data-kx="overstim"]`)), 15000);
      btn?.click();
      let w = null;
      await waitFor(() => (w = titled(/^Overstimulation/)), 15000);
      elOf(w)?.querySelector?.('button[data-action="ok"]')?.click();
      const res = await fresh(m => /overstimulation/i.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      G.ok("4. the Auspex card's Overstimulated? button rolls Willpower", !!card && !!btn && !!w && !!res && /Willpower/.test(text(res)),
        {card: !!card, button: !!btn, window: !!w, result: res ? text(res).slice(0, 300) : null});
    }, {timeout: 400000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
