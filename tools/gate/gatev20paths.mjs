/**
 * Final systems audit, worker 1 (B6723 to B6725): a V20 Path of Enlightenment picked on the system sheet has WoDX rules.
 * In rothenstein-wodx as a Gamemaster:
 *   await (await import(`/wodx-gate/gatev20paths.mjs?${Date.now()}`)).run()
 *   1. the system sheet's Path list offers Path of the Bones
 *   2. a vampire on Path of Night (sheet choice): WoDX Actions' roadOf reads it as the V20 Path, not a Dark Ages Road
 *   3. the sin window for that vampire shows Conviction, the Path's ten sins and a V20 page (it is closed unrolled)
 *   4. a vampire on Path of Blood is on the V20 Path, not the Road of Yasa, and a feeding kill is its level 10 sin
 *   5. (B6725) a Bastet of the Bagheera tribe (sheet choice): WoDX Actions reads the tribe, a Bagheera Gift is its own,
 *      a Simba Gift is not
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatev20paths-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const vampire = (name, path) => ({name, type: "Vampire", system: {advantages: {path: {label: `wod.advantages.path.${path}`, permanent: 6, temporary: 6},
  virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}}}}});

export async function run() {
  const G = gate("gatev20paths");
  if ( G.notLive() ) return "gatev20paths never runs in the Live world";
  try {
    await waitFor(() => !!game.wodxActions?.roadOf && !!game.wodxActions?.roads?.(), 30000);
    const A = game.wodxActions;
    await G.step("1. the sheet offers Path of the Bones", async () => {
      const list = game.worldofdarkness?.bio?.path ?? {};
      G.ok("1. the sheet offers Path of the Bones", Object.values(list).includes("wod.advantages.path.bones"), {paths: Object.keys(list)});
    });
    const [night, blood] = await G.make(Actor, [vampire("Gate V20 Paths Nihilist", "night"), vampire("Gate V20 Paths Dervish", "blood")]);

    await G.step("2. Path of Night is the V20 Path", async () => {
      const f = A.roadOf(night);
      G.ok("2. Path of Night is the V20 Path", f?.key === "v20-night" && f?.road?.name === "Path of Night" && f?.road?.sins?.length === 10, {key: f?.key, name: f?.road?.name});
    });

    await G.step("3. the sin window shows the Path's hierarchy", async () => {
      const t0 = Date.now();
      const p = A.sin({actor: night});
      let win = null;
      await waitFor(() => (win = [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)]
        .find(w => /Sin against the Road/.test(w.title ?? w.options?.window?.title ?? "") && w.rendered)), 6000);
      const el = elOf(win);
      const opts = [...(el?.querySelectorAll?.("select[name=level] option") ?? [])].map(o => o.textContent);
      const text = el?.textContent ?? "";
      const sins = A.roadOf(night)?.road?.sins ?? [];
      await win?.close?.();
      await Promise.race([p, new Promise(r => setTimeout(r, 1500))]);
      G.ok("3. the sin window shows the Path's hierarchy", opts.length === 10 && opts[0].includes(sins[0]) && /Conviction/.test(text) && /V20 p\. 334/.test(text),
        {options: opts.length, first: opts[0], conviction: /Conviction/.test(text), page: /V20 p\. 334/.test(text), ms: Date.now() - t0});
    });

    await G.step("4. Path of Blood is not the Road of Yasa", async () => {
      const f = A.roadOf(blood);
      const lv = A.kindredRules.sinForEvent(f, "killFeed");
      const rv = A.kindredRules.roadVirtues(f);
      G.ok("4. Path of Blood is not the Road of Yasa", f?.key === "v20-blood" && lv === 10 && rv.conviction && !rv.instinct, {key: f?.key, killFeed: lv, virtues: rv});
    });

    await G.step("5. a Bastet's own tribe's Gifts", async () => {
      const [cat] = await G.make(Actor, [{name: "Gate V20 Paths Bagheera", type: "Changing Breed", system: {changingbreed: "Bastet", tribe: "wod.bio.tribename.bagheera"}}]);
      const GR = await import("/modules/wodx-actions/scripts/garou-rules.js");
      const i = A.garouRules.info(cat);
      const fera = A.garouRules.feraGifts?.() ?? [];
      const own = GR.feraGiftIsOwn(fera.find(g => g.breed === "Bastet" && g.sub === "Bagheera"), i);
      const other = GR.feraGiftIsOwn(fera.find(g => g.breed === "Bastet" && g.sub === "Simba"), i);
      G.ok("5. a Bastet's own tribe's Gifts", i.feraKey === "Bastet" && i.tribe === "bagheera" && own === true && other === false, {feraKey: i.feraKey, tribe: i.tribe, own, other, gifts: fera.length});
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
