/**
 * WoDX Chronicle gate: derangements in play (B3913, B6161), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatederange.mjs?${Date.now()}`)).run()
 * Makes its own scene (active) and actor and removes them; never moves the clock.
 *   1. the Derangements box is read: Paranoia and a phobia are known
 *   2. giving in to Paranoia starts a bout: the Deranged status, and a real quick Persuade check (WoDX Actions) rolls
 *      2 harder than the same check before the bout; a melee roll gets no derangement effect
 *   3. spending a Willpower point holds the phobia off: one point gone, no new bout key
 *   4. the scene ends (the clock's End the scene): the bout ends with it, though the clock did not move, and the next
 *      quick Persuade check is back at its old difficulty
 *   5. a bout begun on this scene ends when another scene is made active
 *   6. a frenzy botch's loss writes a new derangement into the box
 * Result: Data/wodx-gate/gatederange-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const who = name => ({name, type: "Mortal", system: {derangement: "Paranoia\nA phobia of fire", advantages: {willpower: {permanent: 5, temporary: 3}}}});

export async function run() {
  const G = gate("gatederange");
  let traitWas = null;
  try {
    const C = game.modules.get("wodx-chronicle")?.api;
    const D = C?.derangements, T = C?.traits, A = game.modules.get("wodx-actions")?.api;
    try { traitWas = game.settings.get("wodx-actions", "traitRolls"); await game.settings.set("wodx-actions", "traitRolls", true); } catch (e) { /* no Actions */ }
    const scene = await G.scene({activate: true});
    const [a] = await G.make(Actor, [who("Gate Deranged One")]);
    await G.tokens(scene, [{actor: a, x: 3, y: 3}]);
    const fx = tags => (T?.effects?.(a, {channel: "roll", tags}) ?? []).filter(e => String(e.key).startsWith("derangement-"));
    const deranged = () => !!game.actors.get(a.id)?.statuses?.has?.("wodx-deranged");
    /** The difficulty a real quick Persuade check rolled at, read from its card ("N dice, diff D"). */
    async function persuadeDiff() {
      const since = Date.now();
      for ( const t of [...(game.user.targets ?? [])] ) { try { t.setTarget(false, {releaseOthers: false}); } catch (e) { /* none */ } }
      await A?.quickCheck?.({actor: a, check: "persuade", direct: true});
      const test = m => m.content?.includes(a.name) && /dice, diff \d+/.test(m.content ?? "");
      await waitFor(() => newestMessage(since, test), 8000);
      const m = newestMessage(since, test);
      return m ? Number(/dice, diff (\d+)/.exec(m.content)?.[1]) : null;
    }

    await G.step("1. the box is read", async () => {
      // set after the sheet is made: a new mortal sheet works its Willpower out on creation
      await a.update({"system.derangement": "Paranoia\nA phobia of fire", "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 3});
      const keys = D?.of?.(a) ?? [];
      G.ok("1. the box is read", keys.includes("paranoia") && keys.includes("phobia"), {keys, api: !!D});
    });

    let before = null;
    await G.step("2. a bout makes the next roll harder", async () => {
      before = await persuadeDiff();
      const r = await D.hold(a, "paranoia", {give: true});
      const after = await persuadeDiff();
      const melee = fx(["melee"]);
      G.ok("2. a bout makes the next roll harder", !!r && !r.held && deranged() && Number.isFinite(before) && after === Math.min(10, before + 2) && !melee.length,
        {held: r?.held, status: deranged(), before, after, melee});
    });

    await G.step("3. a spent point", async () => {
      const was = Number(a.system.advantages.willpower.temporary);
      const r = await D.hold(a, "phobia", {spend: true});
      const now = Number(a.system.advantages.willpower.temporary);
      G.ok("3. a spent point", !!r?.held && now === was - 1 && !D.boutOf(a)?.keys?.includes("phobia"), {was, now, bout: D.boutOf(a)?.keys});
    });

    await G.step("4. the scene ends, and the bout with it", async () => {
      const t0 = game.time.worldTime;
      await C.endScene();
      const gone = await waitFor(() => !deranged() && !game.actors.get(a.id)?.getFlag("wodx-chronicle", "bout"), 8000);
      const after = await persuadeDiff();
      G.ok("4. the scene ends, and the bout with it", gone && game.time.worldTime === t0 && Number.isFinite(before) && after === before,
        {gone, status: deranged(), before, after, clockMoved: game.time.worldTime - t0});
    });

    await G.step("5. another scene made active ends a bout", async () => {
      await D.hold(a, "paranoia", {give: true});
      const began = deranged() && game.actors.get(a.id)?.getFlag("wodx-chronicle", "bout")?.sceneId === scene.id;
      const other = await G.make(Scene, {name: "WoDX gate: gatederange elsewhere", width: 1000, height: 1000, grid: {size: 100, type: 1}, padding: 0});
      await other.activate();
      const gone = await waitFor(() => !deranged(), 8000);
      await scene.activate();
      G.ok("5. another scene made active ends a bout", began && gone, {began, gone});
    });

    await G.step("6. a loss", async () => {
      const k = await D.gain(a, "frenzy", "from a frenzy botch");
      const box = String(a.system.derangement ?? "");
      G.ok("6. a loss", !!k && D.of(a).includes(k) && box.startsWith("Paranoia") && box.includes("from a frenzy botch"), {key: k, box});
    });
  } finally {
    if ( traitWas !== null ) { try { await game.settings.set("wodx-actions", "traitRolls", traitWas); } catch (e) { /* put back */ } }
    return G.finish();
  }
}
