/**
 * The elder powers and Thaumaturgy paths of the Dark Ages Companion (2002) ch. 4 (B7699, B7700). WoDX Actions.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedadacpowers.mjs?${Date.now()}`)).run()
 *   1. Use a Discipline works Sense the Savage Way (Animalism 6): Perception + Animal Ken at 6, cited to the Companion (p. 78)
 *   2. Startle the Superstitious Mind (Prey on the Soul's Fear 1): Willpower at 4, a blood point spent, the effects card
 *      cites the Companion (p. 94)
 *   3. Armor of Vitality (Fortitude 6) is offered as the alternate taken instead of a dot (p. 83)
 * Makes its own actor and removes it. Result: Data/wodx-gate/gatedadacpowers-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const blood = a => Number(a?.system?.advantages?.bloodpool?.temporary ?? -1);

/** Open Use a Discipline, pick the power whose label holds `label`, and hand back its parts. */
async function work(actor, label) {
  for ( const old of windows().filter(x => /^Use a Discipline/.test(x.title ?? "") && x.rendered) ) await old.close?.();
  game.wodxActions.useDiscipline({actor});
  let w = null;
  await waitFor(() => (w = titled(/^Use a Discipline/)), 20000);
  await new Promise(r => setTimeout(r, 300));
  const el = elOf(w), sel = el?.querySelector?.("select[name=power]");
  const opt = sel ? [...sel.options].find(o => o.textContent.includes(label)) : null;
  if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  await new Promise(r => setTimeout(r, 300));
  return {w, el, opt: !!opt, info: el?.textContent ?? "", ok: async () => { el?.querySelector?.('button[data-action="ok"]')?.click(); return waitFor(() => !w.rendered, 20000).then(() => true).catch(() => false); }};
}

export async function run() {
  const G = gate("gatedadacpowers", {stepTimeout: 200000});
  if ( G.notLive() ) return "gatedadacpowers never runs in the Live world";
  const dice0 = CONFIG.Dice.randomUniform;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 90000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  try {
    await waitFor(() => !!game.wodxActions?.useDiscipline, 90000);
    const [elder] = await G.make(Actor, [{name: "Gate Companion Elder", type: "Vampire", system: {clan: "custom", custom: {clan: "Tremere"}, advantages: {bloodpool: {temporary: 20, max: 20}}}}]);
    await elder.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6, "system.attributes.perception.value": 3});
    const disc = (name, value) => ({name, type: "Power", system: {type: "wod.types.discipline", value, level: value, max: 10}});
    await elder.createEmbeddedDocuments("Item", [disc("Animalism", 6), disc("Fortitude", 6), disc("Thaumaturgy", 1),
      {name: "Thaumaturgy: Prey on the Soul's Fear", type: "Power", system: {type: "wod.types.disciplinepath", value: 1, max: 5}}]);

    await G.step("1. Sense the Savage Way, cited to the Companion", async () => {
      CONFIG.Dice.randomUniform = () => 0.01;
      const x = await work(elder, "Sense the Savage Way");
      const diff = x.el?.querySelector?.("[name=diff]")?.value;
      const closed = await x.ok();
      const card = await fresh(m => /Sense the Savage Way/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      CONFIG.Dice.randomUniform = dice0;
      const t = text(card);
      G.ok("1. Sense the Savage Way, cited to the Companion", x.opt && diff === "6" && closed && !!card && /DAC 2002 p\. 78/.test(t),
        {option: x.opt, diff, closed, card: card ? t.slice(0, 400) : null});
    });

    await G.step("2. Startle the Superstitious Mind spends blood and cites the Companion", async () => {
      const before = blood(elder);
      CONFIG.Dice.randomUniform = () => 0.01;
      const x = await work(elder, "Startle the Superstitious Mind");
      const diff = x.el?.querySelector?.("[name=diff]")?.value;
      const closed = await x.ok();
      const card = await fresh(m => /Startle the Superstitious Mind/.test(text(m)) && (m.rolls?.length ?? 0) > 0);
      CONFIG.Dice.randomUniform = dice0;
      await waitFor(() => blood(elder) === before - 1, 30000).catch(() => null);
      const plan = await fresh(m => /Dark Ages Companion \(2002\) p\. 94/.test(text(m)), 30000);
      const t = text(card) + " " + text(plan);
      G.ok("2. Startle the Superstitious Mind spends blood and cites the Companion", x.opt && diff === "4" && closed && blood(elder) === before - 1 && /p\. 94/.test(t),
        {option: x.opt, diff, closed, blood: [before, blood(elder)], card: t.slice(0, 500)});
    });

    await G.step("3. Armor of Vitality is offered as Fortitude's alternate", async () => {
      const x = await work(elder, "Armor of Vitality");
      await x.w?.close?.();
      G.ok("3. Armor of Vitality is offered as Fortitude's alternate", x.opt && /Taken instead of the next Fortitude dot/.test(x.info) && /DAC 2002 p\. 83/.test(x.info),
        {option: x.opt, info: x.info.replace(/\s+/g, " ").slice(0, 400)});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
  }
  return G.finish();
}
