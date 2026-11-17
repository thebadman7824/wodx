/**
 * Gate for B7082-B7087: the W20 pack totem window (W20 pp. 371-377). Two Garou of one pack follow Falcon:
 *   1. the totem accepts the pack: +2 temporary Honor, once
 *   2. one packmate takes Leadership 3 for the scene; the roll window's odds line shows it on a Leadership roll
 *   3. the other packmate cannot take it the same scene
 *   4. a packmate draws a point of the totem's Willpower; the pool shows one less
 *   5. the Storyteller marks the ban broken: the Pack Trait no longer counts; the Rite of Contrition brings it back
 * Run: await (await import(`/wodx-gate/gatetotem.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = a => a.getFlag(MOD, "totem") ?? {};

/** Opens the totem window for an actor, picks an option whose value starts with `how`, presses Do it. Returns the options seen. */
async function totemDo(A, actor, how) {
  let seen = [];
  const answer = (app, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    const sel = root?.querySelector?.("select[name=how]");
    if ( !sel || !String(app.title ?? app.options?.window?.title ?? "").startsWith("Pack totem") ) return;
    seen = [...sel.options].map(o => o.value);
    const o = seen.find(v => v.startsWith(how));
    if ( o ) { sel.value = o; setTimeout(() => root.querySelector("button[data-action=ok]")?.click(), 150); }
    else setTimeout(() => root.querySelector("button[data-action=cancel]")?.click(), 150);
  };
  const hk = Hooks.on("renderDialogV2", answer);
  try { await A.packTotem(actor); await sleep(400); }
  finally { Hooks.off("renderDialogV2", hk); }
  return seen;
}
/** The odds line of the general roll window for Charisma + Leadership. */
async function leadershipParts(A, actor) {
  const p = A.action({actor});
  let app = null;
  await waitFor(() => (app = [...foundry.applications.instances.values()].filter(a => a.rendered && String(a.title ?? a.options?.window?.title ?? "").startsWith("WoDX Action")
    && a.element?.querySelector?.("select[name=preset]")).at(-1)), 5000);
  const el = app.element, a = el.querySelector("[name=attr]"), b = el.querySelector("[name=ability]");
  a.value = "charisma";
  const opt = [...b.options].find(o => o.textContent.toLowerCase().startsWith("leadership"));
  b.value = opt ? opt.value : "";
  for ( const x of [a, b] ) { x.dispatchEvent(new Event("change", {bubbles: true})); x.dispatchEvent(new Event("input", {bubbles: true})); }
  await sleep(300);
  const parts = el.querySelector(".vta-odds-parts")?.textContent ?? "";
  await app.close(); await p;
  return parts;
}

export async function run() {
  const G = gate("gatetotem", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  try {
    await G.scene();
    const pack = "Gate Totem Pack";
    const [ana, bo] = await G.make(Actor, [{name: "Gate Totem: Ana", type: "Werewolf"}, {name: "Gate Totem: Bo", type: "Werewolf"}]);
    for ( const w of [ana, bo] ) await w.update({"system.packname": pack, "system.packtotem": "Falcon", "system.renown.honor.temporary": 1,
      "system.attributes.charisma.value": 3, "system.abilities.leadership.value": 1, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 2});

    await G.step("1. Falcon accepts the pack: +2 Honor once", async () => {
      await totemDo(A, ana, "accept");
      await waitFor(() => st(ana).accepted === "falcon", 4000);
      const again = await totemDo(A, ana, "none");
      G.ok("1. Falcon accepts the pack: +2 Honor once", st(ana).accepted === "falcon" && Number(ana.system.renown?.honor?.temporary) === 3 && !again.includes("accept"),
        {flag: st(ana), honor: ana.system.renown?.honor?.temporary, options: again});
      await totemDo(A, bo, "accept");
    });

    await G.step("2. Ana takes Leadership 3; a Leadership roll shows it", async () => {
      await totemDo(A, ana, "claim:leadership");
      await waitFor(() => st(ana).claim?.id === "leadership", 4000);
      const parts = await leadershipParts(A, ana);
      G.ok("2. Ana takes Leadership 3; a Leadership roll shows it", /Falcon: Leadership \(Pack Trait\) \+3/.test(parts), {parts, flag: st(ana)});
    });

    await G.step("3. Bo cannot take it the same scene", async () => {
      const opts = await totemDo(A, bo, "none");
      const parts = await leadershipParts(A, bo);
      G.ok("3. Bo cannot take it the same scene", opts.length > 0 && !opts.includes("claim:leadership") && !/Pack Trait/.test(parts), {opts, parts});
    });

    await G.step("4. Bo draws 1 Willpower from the totem", async () => {
      await totemDo(A, bo, "draw");
      await waitFor(() => Number(st(bo).spent) === 1, 4000);
      const opts = await totemDo(A, ana, "none");
      G.ok("4. Bo draws 1 Willpower from the totem", Number(bo.system.advantages.willpower.temporary) === 3 && Number(st(bo).spent) === 1,
        {wp: bo.system.advantages.willpower.temporary, flag: st(bo), opts});
    });

    await G.step("5. a broken ban stops the Pack Trait; Contrition brings it back", async () => {
      await totemDo(A, ana, "ban");
      await waitFor(() => st(ana).banned === true && st(bo).banned === true, 4000);
      const off = await leadershipParts(A, ana);
      await totemDo(A, ana, "contrition");
      await waitFor(() => st(ana).banned === false, 4000);
      await totemDo(A, ana, "claim:leadership");
      await waitFor(() => st(ana).claim?.id === "leadership", 4000);
      const on = await leadershipParts(A, ana);
      G.ok("5. a broken ban stops the Pack Trait; Contrition brings it back", !/Falcon/.test(off) && /Falcon: Leadership \(Pack Trait\) \+3/.test(on), {off, on});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    return G.finish();
  }
}
