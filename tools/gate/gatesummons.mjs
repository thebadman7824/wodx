/**
 * WoDX Actions gate: summoned beings and the bounds on what powers make (B4820-B4835), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesummons.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors and fight and removes them (and the plain summoned beings it made); the clock
 * is never moved (upkeep is swept with a "now" passed in).
 *   1. the summons api and the specs are up
 *   2. a Demon's Summon Animals by an NPC: the card's item places where clicked, tokens carry the rules, a timer, the
 *      look on the map, and serve the demon
 *   3. in a fight the summons join with initiative
 *   4. the keeping roll on the summons' turn is rolled (a card), and a slip makes it hostile with an attack order
 *   5. Dismiss: the token fades and goes, and leaves the fight
 *   6. the scene's end sends a scene-long summons away
 *   7. upkeep: a Mummy's effigy servant is fed weekly from Sekhem, and falls still when unfed
 *   8. a familiar's death costs its mage a Willpower dot and Quintessence (M20 p. 316)
 *   9. a Light keyword's timer puts the token's light back
 *  10. a made thing fades at the end of the scene; a Prime-made one stays
 *  11. a held NPC breaks free with a won resistance: the hold is taken back
 *  12. lasting harm hurts again on the victim's turn
 * Result: Data/wodx-gate/gatesummons-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";
const wait = ms => new Promise(r => setTimeout(r, ms));
const tokOf = (scene, rec) => [...scene.tokens].filter(t => t.flags?.[MOD]?.summon?.id === rec?.summon);
const dmg = a => { const d = a?.system?.health?.damage ?? {}; return (+d.bashing || 0) + (+d.lethal || 0) + (+d.aggravated || 0); };

export async function run() {
  const G = gate("gatesummons");
  const basesBefore = new Set(game.actors.filter(a => a.getFlag(MOD, "summonBase")).map(a => a.id));
  let fight = null;
  try {
    const A = game.modules.get(MOD)?.api;
    const S = A?.summons, EF = A?.effects;
    const CH = game.modules.get("wodx-chronicle")?.api;
    await G.step("1. the summons api and specs", async () => {
      const n = Object.keys(S?.specs?.() ?? {}).length;
      G.ok("1. the summons api and specs", !!(S?.bring && S?.dismiss && S?.sweepUpkeep && EF?.planOf) && n >= 80, {specs: n});
    });
    if ( !S?.bring ) return;
    const scene = await G.scene({name: "WoDX gate: summons"});
    const [demon, victim, mummy, mage, lit, wolf] = await G.make(Actor, [
      {name: "Gate Summons Devourer", type: "Demon", system: {advantages: {faith: {permanent: 3, temporary: 3}, torment: {permanent: 5, temporary: 5}, willpower: {permanent: 5, temporary: 5}}}},
      {name: "Gate Summons Victim", type: "Mortal"},
      {name: "Gate Summons Mummy", type: "Mummy", system: {advantages: {sekhem: {permanent: 5, temporary: 2}}}},
      {name: "Gate Summons Mage", type: "Mage", system: {advantages: {willpower: {permanent: 5, temporary: 5}}, quintessence: {temporary: 2}}},
      {name: "Gate Summons Lantern", type: "Mortal"},
      {name: "Gate Summons Wolf", type: "Creature", prototypeToken: {actorLink: false}}]);
    const [dt, vt, mt, gt, lt] = await G.tokens(scene, [{actor: demon, x: 2, y: 2}, {actor: victim, x: 8, y: 2}, {actor: mummy, x: 2, y: 8}, {actor: mage, x: 8, y: 8}, {actor: lit, x: 12, y: 2}]);
    let first = null, toks = [];
    await G.step("2. Summon Animals by an NPC: runs by itself, timed, shown, serving", async () => {
      const pl = EF.planOf(demon, [{key: "summon", who: "self", out: {kind: "st", label: "Summon Animals"}}], 3, {name: "Summon Animals", line: "Demon (DtF)"});
      const item = pl.items.find(i => i.key === "summon");
      // the Storyteller's pick of who answers is the gate's wolf, so no window opens
      first = await EF.apply({...item, at: {x: 450, y: 450}, out: {...item.out, actor: wolf.uuid}}, demon.name);
      await wait(900);
      toks = tokOf(scene, first);
      const rec = toks[0]?.flags?.[MOD]?.summon;
      const timed = toks[0]?.actor?.effects?.some(e => e.flags?.["wodx-chronicle"]?.timed?.revert?.key === "wodx-actions.summonEnd");
      const serves = toks[0]?.actor?.flags?.["wodx-npc"]?.serves ?? [];
      G.ok("2. Summon Animals by an NPC: runs by itself, timed, shown, serving", item?.route === "auto" && toks.length >= 1 && !!rec?.roll && rec.byId === demon.id && serves.includes(demon.id)
        && (timed || rec.lastsKind !== "scene") && toks.every(t => t.alpha > 0.9), {route: item?.route, n: toks.length, control: rec?.control, roll: rec?.roll, lasts: rec?.lasts, timed, serves});
    });
    await G.step("3. a fight takes the summons in with initiative", async () => {
      fight = await Combat.create({scene: scene.id, active: true});
      await fight.createEmbeddedDocuments("Combatant", [{tokenId: dt.id, sceneId: scene.id, actorId: demon.id}, {tokenId: vt.id, sceneId: scene.id, actorId: victim.id}]);
      await fight.startCombat();
      const late = await S.bring({out: {label: "Gate late summons", summon: S.rules.resolve({what: "spirit", profile: "called", lasts: {kind: "scene"}}, {successes: 1})}, caster: demon.uuid},
        {src: null, at: {x: 650, y: 450}, casterName: demon.name, scene});
      await wait(700);
      const t = tokOf(scene, late)[0];
      const c = fight.combatants.find(x => x.tokenId === t?.id);
      G.ok("3. a fight takes the summons in with initiative", !!c && Number.isFinite(c.initiative), {initiative: c?.initiative ?? null});
    });
    await G.step("4. the keeping roll on its turn, and a slip", async () => {
      const t = toks[0];
      if ( !fight.combatants.find(x => x.tokenId === t.id) ) await fight.createEmbeddedDocuments("Combatant", [{tokenId: t.id, sceneId: scene.id, actorId: t.actorId}]);
      const idx = fight.turns.findIndex(x => x.tokenId === t.id);
      const since = Date.now();
      await fight.update({turn: idx});
      await waitFor(() => scene.tokens.get(t.id)?.flags?.[MOD]?.summon?.lastCheck || game.messages.contents.some(m => m.timestamp >= since && /rolls Willpower/.test(m.content)), 8000).catch(() => null);
      const checked = !!scene.tokens.get(t.id)?.flags?.[MOD]?.summon?.lastCheck;
      await S.slip(scene.tokens.get(t.id), "attack-nearest", {why: "gate"});
      await wait(300);
      const now = scene.tokens.get(t.id);
      G.ok("4. the keeping roll on its turn, and a slip", checked && now.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE && now.flags[MOD].summon.control === "hostile"
        && now.actor?.flags?.["wodx-npc"]?.order?.kind === "attack", {checked, disposition: now.disposition, order: now.actor?.flags?.["wodx-npc"]?.order ?? null});
    });
    await G.step("5. Dismiss: it fades, goes and leaves the fight", async () => {
      const t = toks[0];
      await S.dismiss(scene.tokens.get(t.id), {why: "gate"});
      await wait(300);
      G.ok("5. Dismiss: it fades, goes and leaves the fight", !scene.tokens.get(t.id) && !fight.combatants.some(c => c.tokenId === t.id));
    });
    await G.step("6. the scene's end sends a scene-long summons away", async () => {
      const rec = await S.bring({out: {label: "Gate scene summons", summon: S.rules.resolve({what: "ghost", profile: "called", lasts: {kind: "scene"}}, {successes: 1})}, caster: demon.uuid},
        {src: null, at: {x: 850, y: 650}, casterName: demon.name, scene});
      await wait(500);
      const had = tokOf(scene, rec).length;
      await CH.endScene({sceneId: scene.id, quiet: true});
      await waitFor(() => !tokOf(scene, rec).length, 8000).catch(() => null);
      G.ok("6. the scene's end sends a scene-long summons away", had === 1 && !tokOf(scene, rec).length, {had, left: tokOf(scene, rec).length});
    });
    await G.step("7. upkeep feeds an effigy weekly, unfed it falls still", async () => {
      const r = S.rules.resolve({what: "construct", profile: "servant", lasts: {kind: "upkeep"}, upkeep: {pool: "sekhem", points: 1, every: "week", fail: "stops"}, persist: true}, {successes: 1});
      const rec = await S.bring({out: {label: "Gate servitor", summon: r}, caster: mummy.uuid}, {src: null, at: {x: 250, y: 950}, casterName: mummy.name, scene});
      await wait(400);
      const t = tokOf(scene, rec)[0];
      const t0 = t.flags[MOD].summon.made;
      await S.sweepUpkeep(t0 + 8 * 86400);
      const after1 = mummy.system.advantages.sekhem.temporary;
      await S.sweepUpkeep(t0 + 15 * 86400);
      const after2 = mummy.system.advantages.sekhem.temporary;
      await S.sweepUpkeep(t0 + 22 * 86400);
      const still = scene.tokens.get(t.id)?.flags?.[MOD]?.summon?.dormant;
      G.ok("7. upkeep feeds an effigy weekly, unfed it falls still", after1 === 1 && after2 === 0 && still === true, {after1, after2, still});
    });
    await G.step("8. a familiar's death costs its mage", async () => {
      const wp0 = Number(mage.system.advantages?.willpower?.permanent) || 0;
      const rec = await S.callFamiliar(mage, {at: {x: 850, y: 850}});
      await wait(500);
      const t = tokOf(scene, rec)[0];
      await t.update({[`flags.${MOD}.summon.familiar`]: 2});
      await t.actor.update({"system.health.damage": {bashing: 0, lethal: 7, aggravated: 0}, "system.traits.health.totalhealthlevels": {value: 7, max: 7}});
      await waitFor(() => mage.system.advantages.willpower.permanent === wp0 - 1, 6000).catch(() => null);
      await wait(800);
      G.ok("8. a familiar's death costs its mage", wp0 > 0 && mage.system.advantages.willpower.permanent === wp0 - 1 && mage.system.quintessence.temporary === 0,
        {wp0, willpower: mage.system.advantages.willpower.permanent, quint: mage.system.quintessence.temporary, paradox: mage.system.paradox?.temporary ?? null});
    });
    await G.step("9. a Light's timer puts the light back", async () => {
      const before = lt.light.dim;
      const rec = await EF.apply({key: "light", out: {kind: "light", label: "Light", text: "light", timed: {kind: "scene"}}, target: lt.uuid, name: lit.name}, "Gate");
      const on = scene.tokens.get(lt.id).light.dim;
      // the gate's tokens are unlinked: the timer sits on the token's own actor
      await CH.timed.endFor(scene.tokens.get(lt.id)?.actor ?? lit, {key: "wodx-effect-light"});
      await wait(400);
      G.ok("9. a Light's timer puts the light back", on === 30 && scene.tokens.get(lt.id).light.dim === before && !!rec?.effect, {before, on, after: scene.tokens.get(lt.id).light.dim});
    });
    await G.step("10. made things fade with the scene; Prime-made ones stay", async () => {
      await EF.apply({key: "make", out: {kind: "give", label: "Make", thing: "Gate bread", timed: {kind: "scene"}, lasting: false}, target: victim.uuid, name: victim.name}, "Gate");
      await EF.apply({key: "make", out: {kind: "give", label: "Make", thing: "Gate stone", timed: {kind: "scene"}, lasting: true}, target: victim.uuid, name: victim.name}, "Gate");
      await EF.expireMade?.({sceneEnd: true});
      await wait(300);
      const names = victim.items.map(i => i.name);
      G.ok("10. made things fade with the scene; Prime-made ones stay", !names.includes("Gate bread") && names.includes("Gate stone"), {names});
    });
    await G.step("11. a won resistance breaks a hold", async () => {
      const since = Date.now();
      await ChatMessage.create({speaker: {alias: "Gate"}, content: `<div class="vta-res wodx-effects"></div>`, flags: {[MOD]: {kind: "effects", caster: "Gate", items: [
        {key: "hold", out: {kind: "condition", condition: "held", label: "Hold", text: "held", timed: {kind: "scene"}, resist: {pool: "strength", diff: 6}}, target: vt.uuid, name: victim.name, route: "auto"}]}}});
      const found = () => game.messages.contents.find(m => m.timestamp >= since && m.flags?.[MOD]?.kind === "effects" && m.flags[MOD].done);
      await waitFor(() => !!found(), 8000);
      const msg = found();
      const va = () => scene.tokens.get(vt.id)?.actor ?? victim;
      const held = !!va().effects.find(e => e.name === "held" || e.statuses?.has?.("wodx-held"));
      await EF.resolveResist(msg, 0, true);
      await wait(300);
      const free = !va().effects.find(e => e.statuses?.has?.("wodx-held"));
      G.ok("11. a won resistance breaks a hold", !!msg && held && free && (game.messages.get(msg.id)?.flags?.[MOD]?.resisted ?? []).includes(0), {msg: !!msg, held, free});
    });
    const vA = () => scene.tokens.get(vt.id)?.actor ?? victim, dA = () => scene.tokens.get(dt.id)?.actor ?? demon;
    await G.step("12. lasting harm hurts again on the victim's turn", async () => {
      const before = dmg(vA());
      await EF.apply({key: "harm", out: {kind: "damage", label: "Gate rot", levels: 1, type: "lethal", soak: false, lasting: 3}, target: vt.uuid, name: victim.name}, "Gate");
      const mid = dmg(vA());
      const idx = fight.turns.findIndex(x => x.tokenId === vt.id);
      if ( fight.turn === idx ) await fight.update({turn: (idx + 1) % fight.turns.length});
      await fight.update({turn: idx});
      await waitFor(() => dmg(vA()) > mid, 8000).catch(() => null);
      G.ok("12. lasting harm hurts again on the victim's turn", mid === before + 1 && dmg(vA()) === mid + 1, {before, mid, after: dmg(vA())});
    });
    await G.step("13. a whirlwind hurts everyone inside on the demon's turn, one weaker each turn", async () => {
      const TR = A.turnRules;
      const rec = TR.resolveRec(TR.EVERY_TURN.cyclone, {successes: 3, faith: 10, by: dt.uuid});
      const before = dmg(vA());
      const uuid = await A.turns.attach(dA(), rec, {label: "Cyclone", by: demon.name});
      const idx = fight.turns.findIndex(x => x.tokenId === dt.id);
      if ( fight.turn === idx ) await fight.update({turn: (idx + 1) % fight.turns.length});
      await fight.update({turn: idx});
      await waitFor(() => fromUuidSync(uuid)?.getFlag(MOD, "everyTurn")?.counter?.value === 2, 8000).catch(() => null);
      const left = fromUuidSync(uuid)?.getFlag(MOD, "everyTurn")?.counter?.value;
      G.ok("13. a whirlwind hurts everyone inside on the demon's turn, one weaker each turn", left === 2 && dmg(vA()) >= before, {left, before, after: dmg(vA()), uuid: !!uuid});
      await fromUuidSync(uuid)?.delete();
    });
    await G.step("14. a burning nimbus burns whoever lands a close blow", async () => {
      const e = await (game.modules.get("wodx-chronicle").api.timed.applyTimed(vA(), {name: "Gate nimbus", duration: {kind: "scene"}, key: "gate-nimbus"}));
      await e.setFlag(MOD, "touchHarm", {levels: 2, type: "lethal"});
      const before = dmg(dA());
      await A.turns.onBlow(demon, {hit: true, ranged: false, targetToken: vt.uuid, attackerToken: dt.uuid});
      await wait(400);
      G.ok("14. a burning nimbus burns whoever lands a close blow", dmg(dA()) >= before + 1, {before, after: dmg(dA())});
      await e.delete();
    });
    await G.step("15. One Fights as Many: paid in Quintessence, the mage takes only the worst harm", async () => {
      await mage.update({"system.quintessence.temporary": 2});
      const spec = S.specFor("One Fights as Many", "Mage (Dark Ages)");
      const r = S.rules.resolve(spec, {successes: 4});
      // each stage has its own time limit, so a stall names where it stalled
      const stage = [];
      const lim = (p, ms, label) => Promise.race([p.then(v => { stage.push(label); return v; }), wait(ms).then(() => { stage.push(`${label} (stalled)`); return null; })]);
      await lim(EF.apply({key: "summon", out: {kind: "summon", label: "One Fights as Many", summon: r}, target: null, caster: mage.uuid, name: "a spot", at: {x: 950, y: 950}}, mage.name), 8000, "apply");
      await wait(900);
      const copies = scene.tokens.filter(t => t.flags?.[MOD]?.summon?.byId === mage.id && t.flags[MOD].summon.shareWounds);
      const quint = mage.system?.quintessence?.temporary;
      const C = game.modules.get("wodx-combat").api;
      if ( copies[0] ) await lim(C.soakAndApply(copies[0].object ?? copies[0], {mode: "levels", amount: 2, type: "lethal", soak: false}), 5000, "harm 1");
      if ( copies[1] ) await lim(C.soakAndApply(copies[1].object ?? copies[1], {mode: "levels", amount: 1, type: "lethal", soak: false}), 5000, "harm 2");
      const before = dmg(mage);
      await lim(S.shareWounds(scene), 5000, "share");
      await wait(400);
      G.ok("15. One Fights as Many: paid in Quintessence, the mage takes only the worst harm", copies.length === 2 && quint === 0 && dmg(mage) === before + 2 && copies.every(t => dmg(t.actor) === 0),
        {copies: copies.length, quint, before, after: dmg(mage), stage});
      for ( const t of copies ) await lim(S.dismiss(t).catch(() => null), 3000, "dismiss");
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  } finally {
    try { await fight?.delete(); } catch {}
    const extra = game.actors.filter(a => a.getFlag(MOD, "summonBase") && !basesBefore.has(a.id)).map(a => a.id);
    if ( extra.length ) await Actor.deleteDocuments(extra).catch(() => null);
  }
  return G.finish();
}
