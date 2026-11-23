/**
 * Full check of Dark Ages: Vampire (2002) maturation (B7685-B7689), WoDX Creation with WoDX Actions' menu entry.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedamaturation.mjs?${Date.now()}`)).run()
 *   1. a century of an ordinary unlife: 17 points, 3 more from Willpower 3, 1 paid in upkeep for Allies (DASC pp. 71-73)
 *   2. the Maturation window, opened from WoDX Actions: Buy raises Strength 1 to 2 for 5 points (DAV p. 166)
 *   3. a second dot of Strength in the same period is refused (DASC p. 73)
 *   4. Try to raise rolls for Allies and adds a dot (DASC p. 74)
 *   5. a century in danger with every die a 1: the Willpower botch costs points and Tempting Fate costs Allies a dot (DASC pp. 72-73)
 *   6. torpor without Willpower 7 and Perception 4 gives no points, and Backgrounds cannot be raised after it (DASC p. 72)
 * Makes its own actor and removes it. Result: Data/wodx-gate/gatedamaturation-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const bgData = (name, value) => ({name, type: "Feature", system: {type: "wod.types.background", value}});
const bgOf = (a, name) => Number(a?.items?.find(i => i.type === "Feature" && i.name === name)?.system?.value ?? 0);
const pool = a => a.getFlag("wodx-creation", "maturation")?.pool ?? {};

export async function run() {
  const G = gate("gatedamaturation", {stepTimeout: 150000});
  if ( G.notLive() ) return "gatedamaturation never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const C = game.modules.get("wodx-creation")?.api?.maturation;
  const dice0 = CONFIG.Dice.randomUniform;
  const warns = [], warn0 = ui.notifications.warn.bind(ui.notifications);
  ui.notifications.warn = (m, o) => { warns.push(String(m)); return warn0(m, o); };
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 30000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  try {
    await waitFor(() => !!C?.mature && !!A?.maturation, 90000);
    const [k] = await G.make(Actor, [{name: "Gate DA Elder", type: "Vampire", items: [bgData("Allies", 2), bgData("Generation", 3)]}]);
    await k.update({"system.advantages.willpower.permanent": 3, "system.attributes.strength.value": 1});

    await G.step("1. a century of an ordinary unlife", async () => {
      CONFIG.Dice.randomUniform = () => 0.75;
      let rec;
      try { rec = await C.mature(k, {years: 100, activity: "active", age: 150}); } finally { CONFIG.Dice.randomUniform = dice0; }
      const card = await fresh(m => /Gate DA Elder: 100 years/.test(text(m)));
      G.ok("1. a century of an ordinary unlife", rec?.earned === 17 && rec?.bonus === 3 && pool(k).any === 19 && bgOf(k, "Allies") === 2 && /Upkeep paid for Allies/.test(text(card)),
        {rec, pool: pool(k), card: text(card).slice(0, 300)});
    });

    let w = null, seenBtn = null;
    await G.step("2. the Maturation window buys a dot of Strength", async () => {
      A.maturation({actor: k});
      await waitFor(() => (w = titled(/^Maturation: Gate DA Elder/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      elOf(w).querySelector('button[data-action="buy"][data-kind="attribute"][data-key="strength"]')?.click();
      await waitFor(() => Number(k.system.attributes.strength.value) === 2 && pool(k).any === 14, 80000).catch(() => null);
      G.ok("2. the Maturation window buys a dot of Strength", Number(k.system.attributes.strength.value) === 2 && pool(k).any === 14,
        {strength: k.system.attributes.strength.value, pool: pool(k)});
    });

    await G.step("3. a second dot in the same period is refused", async () => {
      await w.render();
      await new Promise(r => setTimeout(r, 500));
      const btn = elOf(w)?.querySelector('button[data-action="buy"][data-kind="attribute"][data-key="strength"]');
      const out = await C.buy(k, {kind: "attribute", key: "strength"});
      G.ok("3. a second dot in the same period is refused", out === null && !!btn?.disabled && Number(k.system.attributes.strength.value) === 2 && pool(k).any === 14,
        {out, disabled: btn?.disabled, strength: k.system.attributes.strength.value, pool: pool(k)});
    });

    await G.step("4. Try to raise rolls for Allies", async () => {
      const allies = k.items.find(i => i.name === "Allies");
      await w.render();
      await new Promise(r => setTimeout(r, 500));
      const btn = elOf(w)?.querySelector(`button[data-action="buy"][data-kind="background"][data-key="${allies.id}"]`);
      seenBtn = {found: !!btn, disabled: btn?.disabled ?? null, rows: elOf(w)?.querySelectorAll('button[data-action="buy"]').length ?? 0};
      CONFIG.Dice.randomUniform = () => 0.95;
      try {
        btn?.click();
        await waitFor(() => bgOf(k, "Allies") > 2 && k.getFlag("wodx-creation", "maturation")?.attempts === 1, 80000).catch(() => null);
      } finally { CONFIG.Dice.randomUniform = dice0; }
      const st = k.getFlag("wodx-creation", "maturation");
      G.ok("4. Try to raise rolls for Allies", bgOf(k, "Allies") === 3 && st?.attempts === 1 && pool(k).any < 14, {allies: bgOf(k, "Allies"), attempts: st?.attempts, pool: pool(k), seenBtn, warns});
      await w?.close?.();
    });

    await G.step("5. danger with every die a 1: points lost and Tempting Fate botched", async () => {
      const a0 = bgOf(k, "Allies");
      CONFIG.Dice.randomUniform = () => 0.01;
      let rec;
      try { rec = await C.mature(k, {years: 100, activity: "danger", age: 250}); } finally { CONFIG.Dice.randomUniform = dice0; }
      const card = await fresh(m => /Gate DA Elder: 100 years, in danger/.test(text(m)));
      G.ok("5. danger with every die a 1: points lost and Tempting Fate botched", rec?.earned === 25 && rec?.lost === 1 && bgOf(k, "Allies") === a0 - 1 && /Tempting Fate botched/.test(text(card)),
        {rec, a0, allies: bgOf(k, "Allies"), card: text(card).slice(0, 400)});
    });

    await G.step("6. torpor without the traits gives no points and bars raising", async () => {
      const before = Number(pool(k).torpor ?? 0);
      const rec = await C.mature(k, {years: 100, activity: "torpor", age: 350});
      const st = k.getFlag("wodx-creation", "maturation");
      const allies = k.items.find(i => i.name === "Allies");
      const out = await C.buy(k, {kind: "background", key: allies?.id});
      G.ok("6. torpor without the traits gives no points and bars raising", rec?.earned === 0 && Number(st?.pool?.torpor ?? 0) === before && st?.mayRaise === false && out === null,
        {rec, pool: st?.pool, mayRaise: st?.mayRaise, out});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally { CONFIG.Dice.randomUniform = dice0; ui.notifications.warn = warn0; }
  return G.finish();
}
