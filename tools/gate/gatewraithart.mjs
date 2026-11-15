/**
 * The named Artifacts of Wraith 20th on the crafting table (WoDX Library wonders-wraith B6100-B6109, item powers
 * wonder-use.mjs, WoDX Creation's Fetterguard check), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewraithart.mjs?${Date.now()}`)).run()
 * It makes its own scene and wraith with a token, makes each item from the Wraith kit's own data, runs its Use buttons
 * and checks the numbers, the token and the map. The clock is put back at the end.
 *   1. the Wraith kit lists the named Artifacts for a wraith, and the Spectre ones only for a Spectre
 *   2. Soulfire Lantern: a Pathos from its shard, the token fades and glows dim red; set down, it comes back; Undo too
 *   3. Star of the East: will not seek before it is attuned; attuning takes 3 Pathos and a Willpower
 *   4. Redeyes: hung, they are spent and a red light stands on the map where the wraith was
 *   5. Living Chains: a Melee Weapon (+3 dice, Strength + 3) and armor; waking them takes a Pathos and a Corpus
 *   6. Scribbler's Pen: a Pathos written down comes back when the pages are torn up
 *   7. a sealed Fetterguard keeps a place Fetter through its town's sack (Creation's era change)
 * Result: Data/wodx-gate/gatewraithart-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const LIB = "wodx-library";
const PATHOS = "system.advantages.pathos.temporary", WP = "system.advantages.willpower.temporary", CORPUS = "system.advantages.corpus.temporary";
const num = v => Number(v) || 0;
const get = (o, p) => p.split(".").reduce((x, k) => x?.[k], o);

export async function run() {
  const G = gate("gatewraithart");
  try {
    if ( G.notLive() || game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "rothenstein-wodx only"}); return; }
    await waitFor(() => game.modules.get(LIB)?.api?.wonders && game.modules.get(LIB)?.api?.wonderUse, 30000);
    const W = game.modules.get(LIB).api.wonders, WU = game.modules.get(LIB).api.wonderUse;
    const K = W.kitFor("wraith");
    const scene = await G.scene();
    const [w] = await G.make(Actor, [{name: "WoDX gate: Ilse the Artificer", type: "Wraith"}]);
    await w.update({[PATHOS]: 9, "system.advantages.pathos.max": 10, [WP]: 5, "system.advantages.willpower.permanent": 6, [CORPUS]: 10,
      "system.advantages.corpus.max": 10, "system.attributes.dexterity.value": 3});
    const [tok] = await G.tokens(scene, [{actor: w, x: 4, y: 4, actorLink: true}]);
    const give = async key => {
      const data = K.itemsFor(K.row(key), {maker: w.name, at: game.time.worldTime});
      const items = await w.createEmbeddedDocuments("Item", data);
      return items;
    };

    await G.step("1. lists", async () => {
      const m = K.makerOf(K.factsFrom(w.toObject(), {profile: "wraith", year: 1700}));
      const s = K.makerOf(K.factsFrom({...w.toObject(), system: {...w.toObject().system, settings: {variant: "Spectre"}}}, {profile: "spirit", year: 1700}));
      const wl = K.listFor(m).map(r => r.key), sl = K.listFor(s).map(r => r.key);
      G.ok("1. lists", m.kind === "wraith" && wl.includes("soulfire-lantern") && !wl.includes("bean-nighe-caul") && sl.includes("bean-nighe-caul"), {wraith: wl.length, spectre: sl.length});
    });

    await G.step("2. lantern", async () => {
      const [lan] = await give("soulfire-lantern");
      const a0 = num(tok.alpha);
      const r = await WU.run(lan, "wonder:hide", w);
      await waitFor(() => num(tok.alpha) < 0.5, 5000).catch(() => null);
      const faded = num(tok.alpha), glow = num(tok.light?.dim), pool = num(lan.flags[LIB].wonder.pool.value);
      await WU.run(lan, "wonder:lower", w);
      await waitFor(() => num(tok.alpha) === a0, 5000).catch(() => null);
      const back = num(tok.alpha);
      // the Undo on a second raising puts the token back too
      await WU.run(lan, "wonder:hide", w);
      const card = [...game.messages].filter(m => m.flags?.[LIB]?.wonderUndo?.item === lan.uuid).sort((x, y) => x.timestamp - y.timestamp).at(-1);
      await WU.undo(card);
      await waitFor(() => num(tok.alpha) === a0, 5000).catch(() => null);
      G.ok("2. lantern", !!r && faded === 0.25 && glow > 0 && pool === 9 && back === a0 && num(tok.alpha) === a0 && num(lan.flags[LIB].wonder.pool.value) === 9,
        {a0, faded, glow, pool, back, afterUndo: num(tok.alpha), poolAfterUndo: lan.flags[LIB].wonder.pool.value});
    });

    await G.step("3. star", async () => {
      const [star] = await give("star-of-the-east");
      const p0 = num(get(w, PATHOS)), wp0 = num(get(w, WP));
      const early = await WU.run(star, "wonder:seek", w);
      const at = await WU.run(star, "wonder:attune", w);
      const seek = await WU.run(star, "wonder:seek", w);
      G.ok("3. star", early === null && !!at && !!seek && num(get(w, PATHOS)) === p0 - 4 && num(get(w, WP)) === wp0 - 1, {p: [p0, get(w, PATHOS)], wp: [wp0, get(w, WP)]});
    });

    await G.step("4. redeyes", async () => {
      const [eyes] = await give("redeyes");
      const before = scene.lights.size;
      await WU.run(eyes, "wonder:hang", w);
      await waitFor(() => scene.lights.size > before, 5000).catch(() => null);
      const light = [...scene.lights].find(l => l.flags?.[LIB]?.wonderLight?.label === "Redeyes");
      const near = light && Math.abs(light.x - (tok.x + 50)) <= 1 && Math.abs(light.y - (tok.y + 50)) <= 1;
      G.ok("4. redeyes", !!light && near && light.config.color?.toString?.().toLowerCase().includes("c0141e") && eyes.flags[LIB].wonder.spent === true,
        {light: light ? {x: light.x, y: light.y, color: String(light.config.color)} : null, spent: eyes.flags[LIB].wonder.spent});
    });

    await G.step("5. chains", async () => {
      const items = await give("living-chains");
      const wpn = items.find(i => i.type === "Melee Weapon"), arm = items.find(i => i.type === "Armor");
      const p0 = num(get(w, PATHOS)), c0 = num(get(w, CORPUS));
      await WU.run(wpn, "wonder:wake", w);
      G.ok("5. chains", num(wpn?.system?.damage?.bonus) === 3 && num(wpn?.system?.attack?.accuracy) === 3 && num(arm?.system?.soak?.lethal) === 3
        && num(get(w, PATHOS)) === p0 - 1 && num(get(w, CORPUS)) === c0 - 1, {damage: wpn?.system?.damage, soak: arm?.system?.soak, p: [p0, get(w, PATHOS)], c: [c0, get(w, CORPUS)]});
    });

    await G.step("6. pen", async () => {
      await w.update({[PATHOS]: 5});
      const [pen] = await give("scribblers-pen");
      await WU.run(pen, "wonder:write", w);
      await WU.run(pen, "wonder:write", w);
      const mid = num(get(w, PATHOS)), held = num(pen.flags[LIB].wonder.pool.value);
      await WU.run(pen, "wonder:tear", w);
      G.ok("6. pen", mid === 3 && held === 2 && num(get(w, PATHOS)) === 5 && num(pen.flags[LIB].wonder.pool.value) === 0, {mid, held, after: get(w, PATHOS)});
    });

    await G.step("7. fetterguard", async () => {
      const AR = await import(`/modules/wodx-creation/scripts/advance-rules.mjs?${Date.now()}`);
      const towns = [{name: "Steinfeld", scars: [{kind: "sack", year: 1420}], history: []}];
      const base = {fromYear: 1400, toYear: 1500, years: 100, awakeYears: 100, fromEra: {id: "x"}, toEra: {id: "x"}};
      const v = {line: "wraith", fetters: [{id: "f1", name: "The well at Steinfeld"}], towns};
      const open = AR.propose(v, base).changes.filter(c => c.kind === "adv.fetterLost").length;
      const [box] = await give("fetterguard");
      await WU.run(box, "wonder:set", w);
      await WU.run(box, "wonder:seal", w);
      const f = box.flags[LIB].wonder, held = num(f.pool?.value), sealed = num(f.used?.seal);
      const kept = AR.propose({...v, fetterguard: sealed ? held : 0}, base).changes.filter(c => c.kind === "adv.fetterLost").length;
      G.ok("7. fetterguard", open === 1 && held === 1 && sealed === 1 && kept === 0, {open, held, sealed, kept});
    });
  } catch (e) { G.R.errors.push(String(e?.stack ?? e)); }
  finally { return G.finish(); }
}
