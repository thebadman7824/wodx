/**
 * WoDX Chronicle gate: a ghoul's monthly need carried out by itself (B5050 to B5054), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateghoulneed.mjs?${Date.now()}`)).run()
 * Works on a scratch scene with a scratch vampire, a human ghoul and a Creature hound. Never moves the clock: the
 * last drink is set back in time on the ghoul instead.
 *   1. two months unfed take two vitae off the human ghoul and roll the craving
 *   2. the hound, its vitae gone, loses a Discipline dot (Potence last) and its token greys
 *   3. a drink from the domitor starts the month again and brings the colour back
 *   4. an animal long past its span with no vitae left turns to dust and fades
 *   5. WoDX NPC: a Storyteller's hound that botches its craving goes for the nearest person
 *   6. at the world's default settings (Clan features off): a ghoul a month unfed, with its domitor on the active
 *      scene, is offered the feeding by its monthly check; approved, a blood point passes (B4983, B6160)
 * Covers WoDX Chronicle (the need) and WoDX NPC (the craving).
 * Result: Data/wodx-gate/gateghoulneed-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-chronicle";
const MONTH = 30 * 86400;

export async function run() {
  const G = gate("gateghoulneed");
  const N = () => game.modules.get(MOD)?.api?.ghoulNeed;
  const C = () => game.modules.get("wodx-creation")?.api;
  // a token's tint and alpha animate on the canvas, so read what was saved, not the frame being drawn
  const srcTint = t => String(t._source?.texture?.tint ?? t.texture?.tint ?? "").toLowerCase();
  const pool = a => Number(a.system.advantages?.bloodpool?.temporary) || 0;
  const setBack = (a, months, extra = {}) => a.update({[`flags.${MOD}.ghoulNeed`]: {fedAt: game.time.worldTime - (months * MONTH) - 3600, warned: 0, ...extra}, [`flags.${MOD}.sig.ghoul`]: null});
  try {
    const scene = await G.scene();
    const [vamp, groom, hound, hound2, passer] = await G.make(Actor, [
      {name: "Gate Ghoul Need Domitor", type: "Vampire"},
      {name: "Gate Ghoul Need Groom", type: "Mortal"},
      {name: "Gate Ghoul Need Hound", type: "Creature", system: {settings: {variant: "general"}}},
      {name: "Gate Ghoul Need Hound Two", type: "Creature", system: {settings: {variant: "general"}}},
      {name: "Gate Ghoul Need Passer", type: "Mortal"}
    ]);
    const [, , th, t2, tp] = await G.tokens(scene, [{actor: vamp, x: 2, y: 2}, {actor: groom, x: 4, y: 2}, {actor: hound, x: 3, y: 2},
      {actor: hound2, x: 1, y: 8}, {actor: passer, x: 9, y: 8}]);
    await C().giveVitae(groom, vamp, {points: 5});
    await C().giveVitae(hound, vamp, {points: 1});

    await G.step("1. two months take two vitae and roll the craving", async () => {
      await setBack(groom, 2);
      const before = game.messages.size;
      await N().check(groom);
      const cards = game.messages.contents.slice(before).map(m => m.content);
      G.ok("1. two months take two vitae and roll the craving", pool(groom) === 3 && cards.some(c => /2 months without vitae/.test(c)) && cards.some(c => /the craving/.test(c)),
        {pool: pool(groom), cards: cards.length});
    });

    await G.step("2. the hound loses a dot and greys", async () => {
      await setBack(hound, 2);
      await N().check(hound);
      const pot = C().data.disciplinesOf(hound).find(d => /potence/i.test(d.name))?.value ?? null;
      const tint = srcTint(th);
      G.ok("2. the hound loses a dot and greys", pool(hound) === 0 && pot === 0 && tint === "#8a8a8a", {pool: pool(hound), potence: pot, tint});
    });

    await G.step("3. a drink starts the month again and brings the colour back", async () => {
      await C().giveVitae(hound, vamp, {points: 2, time: game.time.worldTime + 1});
      await new Promise(r => setTimeout(r, 500));
      const st = hound.flags?.[MOD]?.ghoulNeed ?? {};
      const tint = srcTint(th);
      G.ok("3. a drink starts the month again and brings the colour back", st.warned === 0 && !st.emptySince && tint !== "#8a8a8a" && pool(hound) === 2, {st, tint});
    });

    await G.step("4. long past its span, an animal turns to dust", async () => {
      await hound.update({"system.advantages.bloodpool.temporary": 0, "flags.wodx-creation.chronology.ghouled": game.time.worldTime - (200 * 365 * 86400)});
      await setBack(hound, 1, {warned: 1, emptySince: game.time.worldTime - (60 * 7 * 86400)});
      await N().check(hound);
      const st = hound.flags?.[MOD]?.ghoulNeed ?? {};
      G.ok("4. long past its span, an animal turns to dust", st.dust === true && Number(th._source?.alpha ?? th.alpha) < 0.5, {st, alpha: th._source?.alpha ?? th.alpha});
    });

    await G.step("5. a craving botch goes for the nearest person", async () => {
      Hooks.callAll("wodxGhoulCraving", {actor: hound2, result: "botch"});
      const g = scene.grid.size;
      const near = () => Math.max(Math.abs(t2.x - tp.x), Math.abs(t2.y - tp.y)) <= g;
      for ( let i = 0; i < 40 && !near(); i++ ) await new Promise(r => setTimeout(r, 100));
      G.ok("5. a craving botch goes for the nearest person", near(), {hound: [t2.x, t2.y], prey: [tp.x, tp.y]});
    });

    await G.step("6. the domitor's feeding at the default settings", async () => {
      const AP = game.modules.get(MOD)?.api?.approvals, T = `${MOD}.sigGhoulFeed`;
      const SIGS = ["sigVampire", "sigWerewolf", "sigMage", "sigChangeling", "sigWraith"];
      const was = Object.fromEntries([...SIGS, "autoApprove"].map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
      try {
        for ( const k of SIGS ) await game.settings.set(MOD, k, false);
        // a standing rule would approve it on sight: set it aside so the queue is what is tested
        const auto = foundry.utils.deepClone(was.autoApprove ?? {}); delete auto[T];
        await game.settings.set(MOD, "autoApprove", auto);
        const [ghoul, dom] = await G.make(Actor, [{name: "Gate Ghoul Need Fed One", type: "Mortal"}, {name: "Gate Ghoul Need Feeder", type: "Vampire"}]);
        await C().giveVitae(ghoul, dom, {points: 2});
        await dom.update({"system.advantages.bloodpool.temporary": 6});
        if ( !scene.active ) await scene.activate();
        await G.tokens(scene, [{actor: ghoul, x: 6, y: 5}, {actor: dom, x: 7, y: 5}]);
        await setBack(ghoul, 1);
        const blood = pool(ghoul);
        await N().check(ghoul);
        const p = AP?.pending?.().find(x => x.type === T && x.data?.ghoul === ghoul.id);
        if ( p ) await AP.decide(p.id, "approve");
        for ( let i = 0; i < 30 && Number(dom.system.advantages.bloodpool.temporary) !== 5; i++ ) await new Promise(r => setTimeout(r, 100));
        G.ok("6. the domitor's feeding at the default settings", !!p && Number(dom.system.advantages.bloodpool.temporary) === 5 && pool(ghoul) === blood,
          {asked: !!p, domBlood: dom.system.advantages.bloodpool.temporary, before: blood, after: pool(ghoul), lineage: ghoul.flags?.["wodx-creation"]?.lineage ?? null});
      } finally { for ( const [k, v] of Object.entries(was) ) await game.settings.set(MOD, k, v); }
    });
  } finally {
    return G.finish();
  }
}
