/**
 * Dark Thaumaturgy, Maleficia and Striga (B7697), Dark Ages Companion (2002) pp. 105-111. WoDX Actions.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedadark.mjs?${Date.now()}`)).run()
 *   1. the Infernal pacts window buys Rego Dolor 1 with its Record button: a Dark Thaumaturgy path on the sheet (p. 177)
 *   2. Use a Discipline works Strike the Broken Limb: a Willpower roll at difficulty 4, cited to the Companion (p. 107)
 *   3. a botched Dark Thaumaturgy roll costs a permanent Willpower point (p. 105)
 *   4. Cast a ritual lists Warding Circle at difficulty 5 and casts it, cited to the Companion (p. 108)
 *   5. a second pact buys Maleficia at 1 from the list: Evil Eye is offered in Use a Discipline (p. 109)
 * Makes its own actor and removes it. Result: Data/wodx-gate/gatedadark-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const item = (a, name) => a?.items?.find(i => i.name === name);
const wp = a => Number(a?.system?.advantages?.willpower?.permanent ?? -1);

/** Open a window, pick the option whose label holds `label` in the select `name`, and hand back its parts. */
async function work(open, re, {name, label} = {}) {
  for ( const old of windows().filter(x => re.test(x.title ?? "") && x.rendered) ) await old.close?.();
  open();
  let w = null;
  await waitFor(() => (w = titled(re)), 20000);
  await new Promise(r => setTimeout(r, 300));
  const el = elOf(w), sel = name ? el?.querySelector?.(`select[name=${name}]`) : null;
  const options = [...(sel?.options ?? [])].map(o => o.textContent);
  const opt = sel ? [...sel.options].find(o => o.textContent.includes(label)) : null;
  if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  return {w, el, options, opt: !!opt, ok: async () => { await new Promise(r => setTimeout(r, 500)); el?.querySelector?.('button[data-action="ok"]')?.click(); return waitFor(() => !w.rendered, 20000).then(() => true).catch(() => false); }};
}

export async function run() {
  const G = gate("gatedadark", {stepTimeout: 200000});
  if ( G.notLive() ) return "gatedadark never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const IP = A?.infernalPacts;
  const dice0 = CONFIG.Dice.randomUniform;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 90000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  const pact = async (actor, rating, buy) => {
    IP.window(actor);
    let w = null;
    await waitFor(() => (w = titled(/^Infernal pacts:/)), 20000);
    await new Promise(r => setTimeout(r, 300));
    const el = elOf(w);
    el.querySelector('[name="demon"]').value = "Gate Demon";
    el.querySelector('[name="rating"]').value = String(rating);
    el.querySelector('[name="service"]').value = "A gate's errand";
    const sel = el.querySelector('[name="buy"]');
    const has = [...sel.options].some(o => o.value === buy);
    sel.value = buy;
    return {el, has};
  };
  try {
    await waitFor(() => !!IP?.window && !!game.wodxActions?.useDiscipline && !!game.wodxActions?.castRitual, 90000);
    const [inf] = await G.make(Actor, [{name: "Gate Dark Thaumaturge", type: "Vampire", system: {clan: "custom", custom: {clan: "Tremere"}, advantages: {bloodpool: {temporary: 10, max: 10}}}}]);
    await inf.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.advantages.path.permanent": 4, "system.advantages.path.value": 4,
      "system.attributes.intelligence.value": 3});

    await G.step("1. the window buys Rego Dolor 1", async () => {
      const {el, has: listed} = await pact(inf, 3, "dark:Rego Dolor");
      el.querySelector('button[data-action="ok"]')?.click();
      // the path lands on the sheet a moment before the pact records what it spent
      await waitFor(() => Number(item(inf, "Dark Thaumaturgy: Rego Dolor")?.system?.value) === 1 && IP.state(inf).pacts[0]?.left === 2, 90000).catch(() => null);
      const it = item(inf, "Dark Thaumaturgy: Rego Dolor");
      G.ok("1. the window buys Rego Dolor 1", listed && it?.system?.type === "wod.types.disciplinepath" && Number(it?.system?.value) === 1 && IP.state(inf).pacts[0]?.left === 2,
        {listed, item: it ? {type: it.system.type, value: it.system.value} : null, pacts: IP.state(inf).pacts});
    });

    await G.step("2. Strike the Broken Limb at difficulty 4, cited to the Companion", async () => {
      CONFIG.Dice.randomUniform = () => 0.01;
      const x = await work(() => game.wodxActions.useDiscipline({actor: inf}), /^Use a Discipline/, {name: "power", label: "Strike the Broken Limb"});
      const diff = x.el?.querySelector?.("[name=diff]")?.value;
      const closed = await x.ok();
      const card = await fresh(m => /Strike the Broken Limb/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      CONFIG.Dice.randomUniform = dice0;
      const t = text(card);
      G.ok("2. Strike the Broken Limb at difficulty 4, cited to the Companion", x.opt && diff === "4" && closed && !!card && /DAC 2002 p\. 107/.test(t) && /permanent Willpower point/.test(t),
        {option: x.opt, diff, closed, card: card ? t.slice(0, 400) : null});
    });

    await G.step("3. a botch costs a permanent Willpower point", async () => {
      const before = wp(inf);
      CONFIG.Dice.randomUniform = () => 0.99;
      const x = await work(() => game.wodxActions.useDiscipline({actor: inf}), /^Use a Discipline/, {name: "power", label: "Strike the Broken Limb"});
      await x.ok();
      const card = await fresh(m => /Strike the Broken Limb/.test(text(m)) && /loses a point of permanent Willpower/.test(text(m)));
      CONFIG.Dice.randomUniform = dice0;
      await waitFor(() => wp(inf) === before - 1, 30000).catch(() => null);
      G.ok("3. a botch costs a permanent Willpower point", !!card && wp(inf) === before - 1, {before, after: wp(inf), card: card ? text(card).slice(0, 300) : null});
    });

    await G.step("4. Warding Circle from the Cast a ritual window", async () => {
      CONFIG.Dice.randomUniform = () => 0.01;
      const x = await work(() => game.wodxActions.castRitual({actor: inf}), /^Cast a ritual/, {name: "rit", label: "Warding Circle"});
      const diff = x.el?.querySelector?.("[name=diff]")?.value;
      const info = x.el?.querySelector?.(".wodx-ritual-info")?.textContent ?? "";
      const closed = await x.ok();
      const card = await fresh(m => /Warding Circle/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      CONFIG.Dice.randomUniform = dice0;
      const t = text(card);
      G.ok("4. Warding Circle from the Cast a ritual window", x.opt && diff === "5" && /DAC 2002 p\. 108/.test(info) && closed && /it takes/.test(t) && /DAC 2002 p\. 108/.test(t),
        {option: x.opt, diff, info, closed, card: card ? t.slice(0, 400) : null});
    });

    await G.step("5. a second pact buys Maleficia: Evil Eye is offered", async () => {
      const {el, has: listed} = await pact(inf, 4, "disc:Maleficia");
      el.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => Number(item(inf, "Maleficia")?.system?.value) === 1 && IP.state(inf).pacts[1]?.left === 0, 90000).catch(() => null);
      const x = await work(() => game.wodxActions.useDiscipline({actor: inf}), /^Use a Discipline/, {name: "power", label: "Evil Eye"});
      await x.w?.close?.();
      G.ok("5. a second pact buys Maleficia: Evil Eye is offered", listed && Number(item(inf, "Maleficia")?.system?.value) === 1 && x.opt,
        {listed, maleficia: item(inf, "Maleficia")?.system?.value, evilEye: x.opt, options: x.options.filter(o => /Evil|Limb/.test(o))});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
  }
  return G.finish();
}
