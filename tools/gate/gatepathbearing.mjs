/**
 * Gate for B7020-B7021: a V20 Path's bearing (V20 p. 310) shows on the roll window's odds line and counts only on the
 * rolls the Path names; "Path of Death and the Soul" reads as the Path of the Bones; Caine's bearing waits for the tick.
 * Run: await (await import(`/wodx-gate/gatepathbearing.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));
/** The newest open WoDX Action window. */
async function actionWindow() {
  let app = null;
  await waitFor(() => (app = [...foundry.applications.instances.values()].filter(a => a.rendered && String(a.title ?? a.options?.window?.title ?? "").startsWith("WoDX Action")
    && a.element?.querySelector?.("select[name=preset]")).at(-1)), 5000);
  return app;
}
/** Pick an Attribute and an Ability (by its label) in the window, then read the odds line's parts. */
async function partsFor(app, attr, abilityLabel) {
  const el = app.element;
  const a = el.querySelector("[name=attr]"), b = el.querySelector("[name=ability]");
  a.value = attr;
  const opt = [...b.options].find(o => o.textContent.toLowerCase().startsWith(abilityLabel.toLowerCase()));
  b.value = opt ? opt.value : "";
  for ( const x of [a, b] ) { x.dispatchEvent(new Event("change", {bubbles: true})); x.dispatchEvent(new Event("input", {bubbles: true})); }
  await sleep(300);
  return el.querySelector(".vta-odds-parts")?.textContent ?? "";
}

export async function run() {
  const G = gate("gatepathbearing");
  try {
    await G.scene();
    const [bones, caine] = await G.make(Actor, [{name: "Gate Path Bearing: Gravedigger", type: "Vampire"}, {name: "Gate Path Bearing: Noddist", type: "Vampire"}]);
    // The create step resets some advantages, so the Path and the traits go on after
    await bones.update({"system.advantages.path.label": "wod.advantages.path.bones", "system.advantages.path.permanent": 10,
      "system.attributes.dexterity.value": 3, "system.attributes.manipulation.value": 3, "system.abilities.stealth.value": 3, "system.abilities.subterfuge.value": 2});
    await caine.update({"system.advantages.path.label": "wod.advantages.path.caine", "system.advantages.path.permanent": 8,
      "system.attributes.charisma.value": 3, "system.abilities.leadership.value": 2});

    await G.step("1. Bones 10 sneaking: Silence bearing -2 on the odds line", async () => {
      const p = game.wodxActions.action({actor: bones});
      const app = await actionWindow();
      const label = app?.element.querySelector("[name=aura]")?.closest("label")?.textContent ?? "";
      const parts = await partsFor(app, "dexterity", "Stealth");
      G.ok("1. Bones 10 sneaking: Silence bearing -2 on the odds line", /Silence bearing \(Path of the Bones 10\) -2 diff/.test(parts) && /Silence bearing applies/.test(label), {parts, label});
      const parts2 = await partsFor(app, "manipulation", "Subterfuge");
      G.ok("2. Bones on a lie: no bearing", !/bearing/i.test(parts2), {parts: parts2});
      await app?.close(); await p;
    });

    await G.step("3. Death and the Soul is the Path of the Bones", async () => {
      await bones.update({"system.advantages.path.label": "custom", "system.advantages.path.custom": "Path of Death and the Soul"});
      const p = game.wodxActions.action({actor: bones});
      const app = await actionWindow();
      const parts = await partsFor(app, "dexterity", "Stealth");
      G.ok("3. Death and the Soul is the Path of the Bones", /Silence bearing \(Path of the Bones 10\) -2 diff/.test(parts), {parts});
      await app?.close(); await p;
    });

    await G.step("4. Caine's Faith bearing counts only when ticked", async () => {
      const p = game.wodxActions.action({actor: caine});
      const app = await actionWindow();
      const label = app?.element.querySelector("[name=aura]")?.closest("label")?.textContent ?? "";
      const before = await partsFor(app, "charisma", "Leadership");
      const box = app.element.querySelector("[name=aura]");
      box.checked = true; box.dispatchEvent(new Event("change", {bubbles: true}));
      await sleep(300);
      const after = app.element.querySelector(".vta-odds-parts")?.textContent ?? "";
      G.ok("4. Caine's Faith bearing counts only when ticked", !/bearing/i.test(before) && /Faith bearing \(Path of Caine 8\) -1 diff/.test(after) && /tick it/.test(label), {before, after, label});
      await app?.close(); await p;
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    return G.finish();
  }
}
