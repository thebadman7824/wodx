/**
 * WoDX Chronicle gate: derangements in play (B3913), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatederange.mjs?${Date.now()}`)).run()
 * Makes its own actor and removes it; never moves the clock.
 *   1. the Derangements box is read: Paranoia and a phobia are known
 *   2. giving in to Paranoia starts a bout: the Deranged status, +2 difficulty on a social roll's trait effects, none on a melee roll
 *   3. spending a Willpower point holds the phobia off: one point gone, no new bout key
 *   4. the bout ends: the status and the effects are gone
 *   5. a frenzy botch's loss writes a new derangement into the box
 * Result: Data/wodx-gate/gatederange-result.json.
 */
import {gate} from "./kit.mjs";

const who = name => ({name, type: "Mortal", system: {derangement: "Paranoia\nA phobia of fire", advantages: {willpower: {permanent: 5, temporary: 3}}}});

export async function run() {
  const G = gate("gatederange");
  try {
    const C = game.modules.get("wodx-chronicle")?.api;
    const D = C?.derangements, T = C?.traits;
    const [a] = await G.make(Actor, [who("Gate Deranged One")]);
    const fx = tags => (T?.effects?.(a, {channel: "roll", tags}) ?? []).filter(e => String(e.key).startsWith("derangement-"));

    await G.step("1. the box is read", async () => {
      // set after the sheet is made: a new mortal sheet works its Willpower out on creation
      await a.update({"system.derangement": "Paranoia\nA phobia of fire", "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 3});
      const keys = D?.of?.(a) ?? [];
      G.ok("1. the box is read", keys.includes("paranoia") && keys.includes("phobia"), {keys, api: !!D});
    });

    await G.step("2. a bout", async () => {
      const r = await D.hold(a, "paranoia", {give: true});
      const social = fx(["social"]), melee = fx(["melee"]);
      const st = a.statuses?.has?.("wodx-deranged");
      G.ok("2. a bout", !!r && !r.held && st && social.some(e => e.diff === 2) && !melee.length, {held: r?.held, status: st, social, melee});
    });

    await G.step("3. a spent point", async () => {
      const before = Number(a.system.advantages.willpower.temporary);
      const r = await D.hold(a, "phobia", {spend: true});
      const after = Number(a.system.advantages.willpower.temporary);
      G.ok("3. a spent point", !!r?.held && after === before - 1 && !D.boutOf(a)?.keys?.includes("phobia"), {before, after, bout: D.boutOf(a)?.keys});
    });

    await G.step("4. the bout ends", async () => {
      await D.end(a);
      G.ok("4. the bout ends", !a.statuses?.has?.("wodx-deranged") && !fx(["social"]).length && !D.boutOf(a), {status: a.statuses?.has?.("wodx-deranged"), left: fx(["social"])});
    });

    await G.step("5. a loss", async () => {
      const k = await D.gain(a, "frenzy", "from a frenzy botch");
      const box = String(a.system.derangement ?? "");
      G.ok("5. a loss", !!k && D.of(a).includes(k) && box.startsWith("Paranoia") && box.includes("from a frenzy botch"), {key: k, box});
    });
  } finally { return G.finish(); }
}
