/**
 * Dark Ages depth desk item 1 (B7630 to B7632): Dark Ages Paths follow V20 Dark Ages.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedapaths.mjs?${Date.now()}`)).run()
 *   1. a vampire whose sheet names the Path of the Hunter: the sin window's level 8 line carries the Path's own sin
 *      and the Road of the Beast's
 *   2. a vampire on the Path of Journeys rolls Conviction and Self-Control (V20DA p. 118), not the Road's Instinct
 *   3. a Road flag saved under the old name "Path of Rebellion" still finds the Path, now the Path of the Devil, with
 *      Conviction and Self-Control (p. 136)
 *   4. the Path of Screams has its own ten sins, and a failed ride of the wave is its level 8 sin
 *   5. a sin through the window (automatic loss, lose the second Virtue) takes Self-Control, not Instinct, from the
 *      Journeys walker
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedapaths-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const vampire = (name, custom) => ({name, type: "Vampire", system: {advantages: {path: {label: "custom", custom, permanent: 8, temporary: 8},
  virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}}}}});

export async function run() {
  const G = gate("gatedapaths");
  if ( G.notLive() ) return "gatedapaths never runs in the Live world";
  try {
    await waitFor(() => !!game.wodxActions?.roadOf && !!game.wodxActions?.roads?.(), 30000);
    const A = game.wodxActions, K = A.kindredRules;
    const [hunter, traveller, devil, screamer] = await G.make(Actor, [vampire("Gate DA Paths Hunter", "Path of the Hunter"),
      vampire("Gate DA Paths Traveller", "Path of Journeys"), vampire("Gate DA Paths Adversary", "Road of Sin"), vampire("Gate DA Paths Screamer", "Path of Screams")]);

    await G.step("1. the sin window shows the Hunter's own sin at level 8", async () => {
      const f = A.roadOf(hunter);
      const own = f?.path?.sinsAt?.["8"] ?? "";
      const p = A.sin({actor: hunter});
      let win = null;
      await waitFor(() => (win = [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)]
        .find(w => /Sin against the Road/.test(w.title ?? w.options?.window?.title ?? "") && w.rendered)), 6000);
      const el = elOf(win);
      const line = [...(el?.querySelectorAll?.("select[name=level] option") ?? [])].map(o => o.textContent).find(t => /^8:/.test(t)) ?? "";
      const roadSin = K.sinAt(f?.road?.sins, 8) ?? "";
      await win?.close?.();
      await Promise.race([p, new Promise(r => setTimeout(r, 1500))]);
      G.ok("1. the sin window shows the Hunter's own sin at level 8", f?.path?.name === "Path of the Hunter" && !!own && line.includes(own)
        && line.toLowerCase().includes(roadSin.toLowerCase()), {path: f?.path?.name, line, own, roadSin});
    });

    await G.step("2. the Path of Journeys rolls Self-Control", async () => {
      const f = A.roadOf(traveller);
      const rv = K.roadVirtues(f);
      G.ok("2. the Path of Journeys rolls Self-Control", f?.path?.name === "Path of Journeys" && rv.conviction === true && rv.instinct === false, {path: f?.path?.name, virtues: rv});
    });

    await G.step("3. an old Path of Rebellion flag finds the Path of the Devil", async () => {
      await devil.setFlag("wodx-actions", "road", {key: "sin", path: "Path of Rebellion"});
      const f = A.roadOf(devil);
      const rv = K.roadVirtues(f);
      G.ok("3. an old Path of Rebellion flag finds the Path of the Devil", f?.path?.name === "Path of the Devil" && rv.conviction === true && rv.instinct === false,
        {path: f?.path?.name, virtues: rv});
    });

    await G.step("4. the Path of Screams has its own chart", async () => {
      const f = A.roadOf(screamer);
      const h = K.hierarchyOf(f);
      G.ok("4. the Path of Screams has its own chart", f?.path?.name === "Path of Screams" && h?.length === 10 && K.sinForEvent(f, "notRidden") === 8,
        {path: f?.path?.name, sins: h?.length, notRidden: K.sinForEvent(f, "notRidden")});
    });
    await G.step("5. a sin rolled through the window takes a Self-Control dot from the Journeys walker", async () => {
      const before = Number(traveller.system.advantages.virtues.selfcontrol.permanent ?? 0);
      const p = A.sin({actor: traveller, level: 3, desc: "Gate: settling down"});
      let win = null;
      await waitFor(() => (win = [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)]
        .find(w => /Sin against the Road/.test(w.title ?? w.options?.window?.title ?? "") && w.rendered)), 6000);
      const el = elOf(win);
      const lose = el?.querySelector?.("select[name=lose]");
      const label = [...(lose?.options ?? [])].find(o => o.value === "selfcontrol")?.textContent ?? "";
      if ( lose ) lose.value = "selfcontrol";
      const auto = el?.querySelector?.("input[name=automatic]");
      if ( auto ) auto.checked = true;
      const btn = el?.querySelector?.('button[data-action="ok"]') ?? [...(el?.querySelectorAll?.("button") ?? [])].find(b => /Roll/.test(b.textContent));
      btn?.click();
      await Promise.race([p, new Promise(r => setTimeout(r, 4000))]);
      const dropped = await waitFor(() => Number(traveller.system.advantages.virtues.selfcontrol.permanent ?? 0) === before - 1, 8000);
      const after = Number(traveller.system.advantages.virtues.selfcontrol.permanent ?? 0);
      G.ok("5. a sin rolled through the window takes a Self-Control dot from the Journeys walker", !!btn && /Self-Control/.test(label) && !/Instinct/.test(label) && dropped,
        {button: !!btn, label, selfcontrol: [before, after]});
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
