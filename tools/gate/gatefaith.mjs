/**
 * WoDX Library gate: faith and occult goods (B3902 to B3904), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefaith.mjs?${Date.now()}`)).run()
 * Makes its own scene, tokens and actors and removes them; never moves the clock.
 *   1. api.faith is up; prayer beads offer Pray, a paper charm Set it as a ward, an astrolabe Divine
 *   2. a prayer with no True Faith: Willpower at 8, once a night; a success gives back 1 Willpower, never above the rating
 *   3. a charm set as a ward: Chronicle's trait effects give +1 difficulty to a Kindred's mind power on the bearer,
 *      nothing against a mortal, nothing once it is taken down
 *   4. divining with an astrolabe: a card to the Storyteller with Perception + Occult and how many questions it answers
 *   5. the ward on a real roll (B6177): a mage casts the same Mind Effect at the seeker, targeted on the map, with the
 *      ward down and up; the casting card's difficulty is one higher with the ward up (WoDX Actions' m20 cast)
 *   6. the ward on a Gift (B6411): a Garou uses a Gift at the seeker the same way; difficulty 6, then 7 with the
 *      ward named on the card (cantrips, evocations and Arcanoi read it the same way)
 *   7. the ward on a Kuei-jin power (B6662): a Kuei-jin spends Chi and rolls at the seeker the same way; 6, then 7
 *   8. the ward on a Hunter edge (B6662): an imbued uses Insinuate at the seeker the same way; 6, then 7 (Dark Ages
 *      Mage, Fae cantrips, Hekau, Horrors, Numina, hedge magic and fomor powers read it the same way)
 * Result: Data/wodx-gate/gatefaith-result.json.
 */
import {gate} from "./kit.mjs";

const LIB = "wodx-library";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 4000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };
const seeker = name => ({name, type: "Mortal", system: {attributes: {perception: {value: 4}}, abilities: {occult: {value: 3}},
  advantages: {willpower: {permanent: 6, temporary: 2}}}});

export async function run() {
  const G = gate("gatefaith");
  try {
    const lib = game.modules.get(LIB)?.api;
    const T = game.modules.get("wodx-chronicle")?.api?.traits;
    const [a] = await G.make(Actor, [seeker("Gate Faith Seeker")]);
    // B5876: a batch create does not keep its order, so each good is found by its name (gate rule 1)
    const made = await a.createEmbeddedDocuments("Item", [{name: "a string of prayer beads", type: "Item"},
      {name: "a tiny folded paper charm", type: "Item"}, {name: "a brass astrolabe", type: "Item"}]);
    const named = n => made.find(i => i.name === n) ?? a.items.find(i => i.name === n);
    const [beads, charm, astro] = ["a string of prayer beads", "a tiny folded paper charm", "a brass astrolabe"].map(named);

    await G.step("1. api and Use", async () => {
      const ab = async i => (await lib.use.abilities(i)) ?? [];
      const [p, w, d] = [await ab(beads), await ab(charm), await ab(astro)];
      G.ok("1. api and Use", !!lib?.faith?.pray && p.includes("pray") && w.includes("ward") && d.includes("divine"), {beads: p, charm: w, astrolabe: d});
    });

    await G.step("2. a prayer", async () => {
      // set the rating after the sheet is made: a new mortal sheet works its Willpower out on creation
      await a.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 2});
      const start = {permanent: a.system.advantages.willpower.permanent, temporary: a.system.advantages.willpower.temporary};
      const wp = () => Number(a.system.advantages.willpower.temporary);
      let tries = 0;
      while ( wp() <= 2 && tries < 8 ) { await a.unsetFlag(LIB, "prayedNight"); await lib.faith.pray(a, beads); tries++; }
      const gained = wp() === 3;
      const night = a.flags?.[LIB]?.prayedNight;
      const before = wp();
      await lib.faith.pray(a, beads);
      await wait(400);
      const again = [...game.messages].slice(-2).some(m => /prayed already tonight/i.test(m.content));
      G.ok("2. a prayer", gained && Number.isFinite(night) && wp() === before && again, {start, gained, tries, night, again, wp: wp()});
    });

    await G.step("3. a ward", async () => {
      const ward = against => T.effects(a, {channel: "resist", tags: ["mind"], against}).filter(e => e.key === "ward").length;
      const none = ward("kindred");
      await lib.faith.ward(a, charm);
      await settle(() => ward("kindred") === 1);
      const on = ward("kindred"), mortal = ward("mortal");
      await lib.faith.ward(a, a.items.get(charm.id));
      await settle(() => ward("kindred") === 0);
      G.ok("3. a ward", none === 0 && on === 1 && mortal === 0 && ward("kindred") === 0, {none, on, mortal, down: ward("kindred")});
    });

    await G.step("4. divining", async () => {
      await lib.faith.divine(a, astro);
      await wait(400);
      const m = [...game.messages].filter(x => /reads the signs with a brass astrolabe/i.test(x.content ?? "")).sort((x, y) => (x.timestamp ?? 0) - (y.timestamp ?? 0)).at(-1);
      G.ok("4. divining", !!m && /Perception \+ Occult/.test(m.content) && (m.whisper?.length ?? 0) > 0, {card: !!m, whisper: m?.whisper?.length ?? 0});
    });

    await G.step("5. the ward on a magick roll", async () => {
      const scene = await G.scene();
      const [mage] = await G.make(Actor, [{name: "Gate Faith Mage", type: "Mage", items: [{name: "Avatar", type: "Feature", system: {type: "wod.types.background", value: 2}}]}]);
      await wait(1200);
      await mage.update({"system.advantages.arete.permanent": 3, "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
        "system.spheres.mind.value": 2, "system.quintessence.temporary": 0, "system.paradox.temporary": 0});
      await mage.setFlag("wodx-actions", "daMage", {system: "m20"});
      const [, seen] = await G.tokens(scene, [{actor: mage, x: 2, y: 2, actorLink: true}, {actor: a, x: 3, y: 2, actorLink: true}]);
      await settle(() => !!seen?.object, 5000);
      seen.object?.setTarget?.(true, {releaseOthers: true});
      const fill = root => { const el = root?.querySelector?.('[name="s-mind"]'); if ( el ) { el.value = "1"; el.dispatchEvent(new Event("change", {bubbles: true})); } };
      const hook = Hooks.on("renderDialogV2", async (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        if ( !root?.querySelector?.('[name="s-mind"]') ) return;
        await wait(200); fill(root); root.querySelector('button[data-action="ok"]')?.click();
      });
      const diffOf = async () => {
        const t0 = Date.now();
        await game.wodxActions.m20Cast({actor: mage});
        let m = null;
        await settle(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && /works magick/.test(x.content ?? "")).at(-1)), 8000);
        const t = String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        return Number(t.match(/Arete \d+ : \d+ dice, diff (\d+)/)?.[1] ?? NaN);
      };
      let off, on;
      try {
        if ( a.items.get(charm.id)?.flags?.[LIB]?.ward?.on ) await lib.faith.ward(a, a.items.get(charm.id));
        off = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
        on = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
      } finally { Hooks.off("renderDialogV2", hook); seen.object?.setTarget?.(false, {releaseOthers: true}); }
      G.ok("5. the ward on a magick roll", Number.isFinite(off) && on === Math.min(10, off + 1), {off, on});
    });

    await G.step("6. the ward on a Gift", async () => {
      // B6411: a Garou uses a Gift on the seeker, targeted on the map, ward down and up; the card's difficulty is one higher
      const scene = await G.scene();
      const [wolf] = await G.make(Actor, [{name: "Gate Faith Garou", type: "Werewolf", system: {attributes: {wits: {value: 3, total: 3}}, abilities: {occult: {value: 2}}}}]);
      await wolf.createEmbeddedDocuments("Item", [{name: "Gate Faith Gift", type: "Power", system: {type: "wod.types.gift", game: "werewolf", level: 1, dice1: "wits", dice2: "occult", difficulty: 6}}]);
      const [, seen] = await G.tokens(scene, [{actor: wolf, x: 2, y: 4, actorLink: true}, {actor: a, x: 3, y: 4, actorLink: true}]);
      await settle(() => !!seen?.object, 5000);
      seen.object?.setTarget?.(true, {releaseOthers: true});
      const hook = Hooks.on("renderDialogV2", async (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        // B6448: the Gift window by its fields (a form inside the dialog's own form is dropped, so no form.wodx-gift)
        if ( !root?.querySelector?.('.wodx-gift, select[name="gift"]') || !root.querySelector('[name="diff"]') ) return;
        await wait(200);
        const d = root.querySelector('[name="diff"]'); if ( d ) { d.value = "6"; d.dispatchEvent(new Event("change", {bubbles: true})); }
        root.querySelector('button[data-action="ok"]')?.click();
      });
      const diffOf = async () => {
        const t0 = Date.now();
        await game.wodxActions.useGift(wolf);
        let m = null;
        await settle(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && /Gate Faith Gift/.test(x.content ?? "") && /diff \d+/.test(x.content ?? "")).at(-1)), 8000);
        const t = String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        return {diff: Number(t.match(/\d+ dice, diff (\d+)/)?.[1] ?? NaN), named: /Ward/.test(t)};
      };
      let off, on;
      try {
        if ( a.items.get(charm.id)?.flags?.[LIB]?.ward?.on ) await lib.faith.ward(a, a.items.get(charm.id));
        off = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
        await settle(() => !!a.items.get(charm.id)?.flags?.[LIB]?.ward?.on);
        on = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
      } finally { Hooks.off("renderDialogV2", hook); seen.object?.setTarget?.(false, {releaseOthers: true}); }
      G.ok("6. the ward on a Gift", off?.diff === 6 && on?.diff === 7 && on?.named && !off?.named, {off, on});
    });

    /**
     * B6662: one power used at the seeker, targeted on the map, ward down and up: the window is found by sel, its
     * fields set from vals, and the card (named by who) read for its difficulty and whether the ward is named.
     */
    const wardRun = async ({user, x, sel, vals, use, who}) => {
      const scene = await G.scene();
      const [, seen] = await G.tokens(scene, [{actor: user, x, y: 6, actorLink: true}, {actor: a, x: x + 1, y: 6, actorLink: true}]);
      await settle(() => !!seen?.object, 5000);
      seen.object?.setTarget?.(true, {releaseOthers: true});
      const hook = Hooks.on("renderDialogV2", async (app, el) => {
        const root = el instanceof HTMLElement ? el : el?.[0];
        if ( !root?.querySelector?.(sel) ) return;
        await wait(200);
        for ( const [k, v] of Object.entries(vals) ) {
          const f = root.querySelector(`[name="${k}"]`);
          if ( f ) { f.value = String(v); f.dispatchEvent(new Event("change", {bubbles: true})); }
        }
        // the window's own change handlers may refill a field: the wanted values go back on last
        for ( const [k, v] of Object.entries(vals) ) { const f = root.querySelector(`[name="${k}"]`); if ( f ) f.value = String(v); }
        root.querySelector('button[data-action="ok"]')?.click();
      });
      const diffOf = async () => {
        const t0 = Date.now();
        await use();
        let m = null;
        await settle(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && (x.content ?? "").includes(who) && /dice, diff \d+/.test(x.content ?? "")).at(-1)), 8000);
        const t = String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        return {diff: Number(t.match(/\d+ dice, diff (\d+)/)?.[1] ?? NaN), named: /Ward/.test(t)};
      };
      let off, on;
      try {
        if ( a.items.get(charm.id)?.flags?.[LIB]?.ward?.on ) await lib.faith.ward(a, a.items.get(charm.id));
        off = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
        await settle(() => !!a.items.get(charm.id)?.flags?.[LIB]?.ward?.on);
        on = await diffOf();
        await lib.faith.ward(a, a.items.get(charm.id));
      } finally { Hooks.off("renderDialogV2", hook); seen.object?.setTarget?.(false, {releaseOthers: true}); }
      return {off, on};
    };

    await G.step("7. the ward on a Kuei-jin power", async () => {
      // B6662: a Kuei-jin spends a Yang Chi and rolls 4 dice at 6 at the seeker; 7 with the ward up, named on the card
      const [kj] = await G.make(Actor, [{name: "Gate Faith Kuei-jin", type: "Vampire", system: {settings: {variant: "kindredeast"},
        advantages: {dharma: {permanent: 3}, yangchi: {temporary: 6}, yinchi: {temporary: 2}}}}]);
      await kj.update({"system.settings.variant": "kindredeast", "system.advantages.dharma.permanent": 3, "system.advantages.yangchi.temporary": 6});
      const r = await wardRun({user: kj, x: 2, sel: 'select[name="art"]', vals: {kind: "yang", k: 1, dice: 4, diff: 6}, use: () => game.wodxActions.kotSpend(kj), who: kj.name});
      G.ok("7. the ward on a Kuei-jin power", r.off?.diff === 6 && r.on?.diff === 7 && r.on?.named && !r.off?.named, r);
    });

    await G.step("8. the ward on a Hunter edge", async () => {
      // B6662: an imbued uses Insinuate (Manipulation + Mercy at 6) at the seeker; 7 with the ward up, named on the card
      const [hunter] = await G.make(Actor, [{name: "Gate Faith Hunter", type: "Hunter", system: {attributes: {manipulation: {value: 3, total: 3}},
        advantages: {virtues: {mercy: {permanent: 3}}}}}]);
      await hunter.update({"system.advantages.virtues.mercy.permanent": 3});
      const r = await wardRun({user: hunter, x: 5, sel: 'select[name="edge"]', vals: {edge: "insinuate", diff: 6, risk: 0}, use: () => game.wodxActions.useEdge(hunter), who: hunter.name});
      G.ok("8. the ward on a Hunter edge", r.off?.diff === 6 && r.on?.diff === 7 && r.on?.named && !r.off?.named, r);
    });
  } finally { return G.finish(); }
}
