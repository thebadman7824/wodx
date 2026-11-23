/**
 * Full check of V20 Dark Ages (B7669-B7671), WoDX Actions: the Appendix B Roads, the Setite castes and the Malkavian
 * Orders' rites. In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedaroads.mjs?${Date.now()}`)).run()
 *   1. the Road window lists the six Appendix B Roads; the Road of Blood shows its aura on Willpower rolls, the Abyss its
 *      house reading; saving the Road of Paradox gives Conviction and Self-Control (pp. 432-449)
 *   2. a Witch of Echidna's frenzy check also rolls Self-Control, and Echidna's Visage sets Appearance 0 when it comes (p. 450)
 *   3. a Witch who spends blood on Celerity loses one more at the end of the scene (p. 450)
 *   4. the Rite of Ecstasy makes an Auspex roll one easier for the night (p. 444)
 *   5. a Warrior of Glycon's chance at power rolls Willpower at 6 (p. 450)
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedaroads-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const custom = clan => ({clan: "custom", custom: {clan}});
const disc = (name, value) => ({name, type: "Power", system: {type: "wod.types.discipline", value}});
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Open a window, pick the option whose label holds `label` (or whose value is `value`) in the select `name`. */
async function work(open, re, {name, label, value} = {}) {
  for ( const old of windows().filter(x => re.test(x.title ?? "") && x.rendered) ) await old.close?.();
  open();
  let w = null;
  await waitFor(() => (w = titled(re)), 15000);
  const el = elOf(w), sel = name ? el?.querySelector?.(`select[name=${name}]`) : null;
  const options = [...(sel?.options ?? [])].map(o => o.textContent);
  const opt = sel ? [...sel.options].find(o => value !== undefined ? o.value === value : o.textContent.includes(label)) : null;
  if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  return {w, el, sel, options, opt: !!opt, ok: async () => { await sleep(500); el?.querySelector?.('button[data-action="ok"]')?.click(); return waitFor(() => !w.rendered, 15000); }};
}

export async function run() {
  const G = gate("gatedaroads");
  if ( G.notLive() ) return "gatedaroads never runs in the Live world";
  const A = () => game.wodxActions;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 150000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }); };
  const wp6 = a => a.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6}); // a new Vampire starts at 0
  try {
    await waitFor(() => !!A()?.setRoad && !!A()?.malkRite && !!A()?.glyconCheck && !!A()?.autoBeast, 90000);
    await G.step("1. the Road window and the Appendix B Roads", async () => {
      const v = await G.make(Actor, {name: "Gate DA Asura", type: "Vampire", system: custom("Ravnos")});
      const x = await work(() => A().setRoad({actor: v}), /^Road:/, {name: "road", value: "blood|"});
      const has = n => x.options.some(o => o === n || o.startsWith(n));
      const listed = ["Road of Blood", "Road of the Abyss", "Road of Paradox", "Code of Samiel", "Road of Set", "Road of Set: Path of Apep"].filter(has);
      await sleep(300);
      const bloodInfo = x.el?.querySelector(".wodx-road-info")?.textContent ?? "";
      x.sel.value = "abyss|"; x.sel.dispatchEvent(new Event("change", {bubbles: true})); await sleep(300);
      const abyssInfo = x.el?.querySelector(".wodx-road-info")?.textContent ?? "";
      x.sel.value = "paradox|"; x.sel.dispatchEvent(new Event("change", {bubbles: true}));
      const closed = await x.ok();
      const card = await fresh(m => /Road of Paradox/.test(text(m)) && /Virtues/.test(text(m)), 200000);
      const fl = v.getFlag("wodx-actions", "road");
      G.ok("1. the Road window and the Appendix B Roads", listed.length === 6 && /on Willpower rolls/.test(bloodInfo) && /house reading/.test(abyssInfo) && closed
        && fl?.key === "paradox" && /Conviction and Self-Control/.test(text(card)),
        {listed, bloodInfo: bloodInfo.slice(0, 120), abyssInfo: abyssInfo.slice(0, 160), flag: fl, card: text(card).slice(0, 160)});
    }, {timeout: 320000});
    const witch = await G.make(Actor, {name: "Gate DA Witch", type: "Vampire", system: {...custom("Witches of Echidna"), advantages: {bloodpool: {temporary: 8, max: 10}}},
      items: [disc("Celerity", 1)]});
    await wp6(witch);
    await G.step("2. a Witch's frenzy check rolls Self-Control too; the Visage sets Appearance 0", async () => {
      await A().autoBeast({actor: witch, kind: "frenzy"});
      const m = await fresh(x => /Frenzy check|Instinct check/.test(text(x)) && /Gate DA Witch/.test(text(x)), 90000);
      await sleep(1500);
      const vis = witch.effects.find(e => e.name === "Echidna's Visage");
      const said = /Echidna's Visage/.test(text(m));
      G.ok("2. a Witch's frenzy check rolls Self-Control too; the Visage sets Appearance 0", !!m && /Self-Control \(Echidna\)/.test(text(m)) && said === !!vis
        && (!vis || Number(witch.system.attributes?.appearance?.value) === 0),
        {card: text(m).slice(0, 260), visage: !!vis, appearance: witch.system.attributes?.appearance?.value, rolls: m?.rolls?.length});
    }, {timeout: 150000});
    await G.step("3. Echidna takes one more blood at the end of the scene", async () => {
      const x = await work(() => A().useDiscipline({actor: witch}), /^Use a Discipline/, {name: "power", label: "Celerity"});
      const b = x.el?.querySelector?.("[name=blood]"); if ( b ) b.value = "1";
      const before = Number(witch.system.advantages.bloodpool.temporary);
      await x.ok();
      await waitFor(() => Number(witch.system.advantages.bloodpool.temporary) === before - 1, 30000);
      await waitFor(() => !!witch.getFlag("wodx-actions", "echidnaDue"), 15000);
      const due = !!witch.getFlag("wodx-actions", "echidnaDue");
      await A().endScene({actors: [witch], fromChronicle: true});
      await waitFor(() => Number(witch.system.advantages.bloodpool.temporary) === before - 2, 30000);
      G.ok("3. Echidna takes one more blood at the end of the scene", !!b && due && Number(witch.system.advantages.bloodpool.temporary) === before - 2 && !witch.getFlag("wodx-actions", "echidnaDue"),
        {field: !!b, before, after: witch.system.advantages.bloodpool.temporary, due});
    }, {timeout: 150000});
    await G.step("4. the Rite of Ecstasy makes Auspex one easier", async () => {
      const mk = await G.make(Actor, {name: "Gate DA Ecstatic", type: "Vampire", system: {...custom("Malkavian"), advantages: {bloodpool: {temporary: 8, max: 10}}},
        items: [disc("Auspex", 2)]});
      await mk.update({"system.advantages.willpower.permanent": 10, "system.advantages.willpower.temporary": 10});
      let ok = false, tries = 0, rite = null;
      while ( !ok && tries < 4 ) {
        tries++;
        const x = await work(() => A().malkRite({actor: mk}), /^Rite of the Orders/, {name: "rite", value: "ecstasy"});
        await x.ok();
        rite = await fresh(m => /Rite of Ecstasy/.test(text(m)), 60000);
        ok = !!mk.effects.find(e => e.getFlag?.("wodx-actions", "malkRite") === "ecstasy");
      }
      const y = await work(() => A().useDiscipline({actor: mk}), /^Use a Discipline/, {name: "power", label: "Read the Soul"});
      await y.ok();
      const card = await fresh(m => /Read the Soul/.test(text(m)) && (m.rolls?.length ?? 0) > 0, 90000);
      G.ok("4. the Rite of Ecstasy makes Auspex one easier", ok && y.opt && /Rite of Ecstasy -1/.test(text(card)), {tries, rite: text(rite).slice(0, 160), option: y.opt, card: text(card).slice(0, 260)});
    }, {timeout: 300000});
    await G.step("5. a Warrior of Glycon's chance at power", async () => {
      const g = await G.make(Actor, {name: "Gate DA Warrior", type: "Vampire", system: custom("Warriors of Glycon")});
      await wp6(g);
      await A().glyconCheck({actor: g});
      const m = await fresh(x => /power within reach/i.test(text(x)), 60000);
      G.ok("5. a Warrior of Glycon's chance at power", !!m && /difficulty 6/.test(text(m)) && (m.rolls?.length ?? 0) > 0, {card: text(m).slice(0, 200)});
    }, {timeout: 120000});
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  return G.finish();
}
