/**
 * Re-audit gate (B6020-B6038), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestillmarks.mjs?${Date.now()}`)).run()
 * Makes its own actors and a scratch scene and removes them; moves the clock 2 seconds and puts it back; starts no fight.
 *   1. the setting "Conditions hold the token" is there and on; Combat's movementFor, holdOfActor and traitRoll are up
 *   2. a Staked character has no movement at all; with the stake out it moves again
 *   3. a roll effect on every roll (-2 dice, as feeding against the blood's law gives) lowers the attack and the defence
 *   4. a WoDX mark that lasts the scene shows on the token (showIcon ALWAYS), not only on the sheet
 *   5. Crippled limb makes the attack harder; Branded, Filthy and Bloody carry a social difficulty
 *   6. a mortal beaten to a full track of bashing gets Incapacitated by itself, and loses it on healing (B6031)
 *   7. a Find a hiding place roll that succeeds puts Sneaking on the token (B6030)
 *   8. Unseen Presence used through the effects card puts Obfuscated on the token (B6034)
 *   9. knocked down outdoors in rain: Filthy; the same fall in dry weather: clean (B6033)
 *  10. a player's character seven nights unwashed turns Filthy when the clock moves; one washed tonight stays clean (B6033)
 *  11. two lethal blows adding up on the right arm cripple it, and the Crippled mark draws on the token on the map (B6032);
 *      healing the levels takes the mark off again
 *  12. a target beaten to Incapacitated gets no defence roll against a real attack, though its sheet could dodge (B6035)
 *  13. a target frozen still (Completely immobilized) is hit by every attack, however hard the roll (B6035)
 *  14. a Dazed attacker is named as one who cannot attack this turn (B6036; the refusal is for players, so as the
 *      Storyteller the gate checks the reason the attack reads)
 *  15. a Blinded character's token loses its sight, and Senses counts sight as gone (B6037)
 *  16. a spirit's Possession holds the body; Blighted marks the token and makes social rolls harder (B6038)
 *  17. Forbidden (a mummy's Balance) stops the being's attack on the mummy and keeps its token from going nearer; a
 *      Kuei-jin's shadow soul sends each move to the Storyteller (B6018, from the powers thread)
 * Result: Data/wodx-gate/gatestillmarks-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  const G = gate("gatestillmarks");
  try {
    const C = game.modules.get("wodx-combat")?.api;
    const X = game.modules.get("wodx-chronicle")?.api;
    const K = X?.conditions;
    const [a, b] = await G.make(Actor, [{name: "Gate Still Body", type: "Mortal", system: {attributes: {wits: {value: 3}}, abilities: {stealth: {value: 3}}}}, {name: "Gate Still Foe", type: "Mortal"}]);

    await G.step("1. setting and api", async () => {
      let on = null;
      try { on = game.settings.get("wodx-combat", "conditionsHold"); } catch (e) { on = null; }
      G.ok("1. setting and api", on === true && typeof C?.movementFor === "function" && typeof C?.holdOfActor === "function" && typeof X?.traits?.addBite === "function", {on});
    });

    await G.step("2. staked does not move", async () => {
      const free = C.movementFor(a).run;
      await K.setCondition(a, "staked", true);
      const held = C.movementFor(a), h = C.holdOfActor(a);
      await K.setCondition(a, "staked", false);
      const back = C.movementFor(a).run;
      G.ok("2. staked does not move", free > 0 && held.run === 0 && held.walk === 0 && !!h.still && back === free, {free, held, h, back});
    });

    await G.step("3. roll effects reach combat", async () => {
      const before = C.conditionMods(a, b).attackerDice;
      await X.traits.addBite(a, {key: "gate-still", name: "Gate: -2 dice", tags: ["all"], dice: -2, duration: {kind: "scene"}, source: "gate"});
      const after = C.conditionMods(a, b).attackerDice, def = C.traitRoll(a, ["defense", "combat"]).dice;
      G.ok("3. roll effects reach combat", after === before - 2 && def === -2, {before, after, def});
    });

    await G.step("4. a scene mark shows on the token", async () => {
      const e = await X.applyTimed(a, {name: "Gate scene mark", duration: {kind: "scene"}, key: "gate-still-mark", source: "gate"});
      const want = CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS;
      G.ok("4. a scene mark shows on the token", want === undefined || e?.showIcon === want, {showIcon: e?.showIcon, want});
    });

    await G.step("5. crippled, branded, filthy, bloody have rules", async () => {
      const base = C.conditionMods(a, b).attackerDiff;
      await K.setCondition(a, "crippled", true);
      const crip = C.conditionMods(a, b).attackerDiff;
      await K.setCondition(a, "crippled", false);
      const soc = ["filthy", "bloody", "branded"].map(id => K.getCondition(id)?.mods?.socialDiff ?? null);
      G.ok("5. crippled, branded, filthy, bloody have rules", crip === base + 2 && soc.slice(0, 2).every(v => v === 1) && (soc[2] === 1 || soc[2] === null), {base, crip, soc});
    });

    await G.step("6. incapacitated follows the health track", async () => {
      const wait = () => new Promise(r => setTimeout(r, 600));
      const max = Object.values(a.system?.health ?? {}).filter(v => v && typeof v === "object" && "total" in v).reduce((s, v) => s + (Number(v.total) || 0), 0) || 7;
      await a.update({"system.health.damage.bashing": max + 2}); await wait();
      const on = !!K.hasCondition(a, "incapacitated");
      await a.update({"system.health.damage.bashing": 0}); await wait();
      const off = !K.hasCondition(a, "incapacitated");
      G.ok("6. incapacitated follows the health track", on && off, {on, off, max});
    });

    // Steps 7-10 set each status off the way play does, never by placing it directly
    const wait = (ms = 700) => new Promise(r => setTimeout(r, ms));
    const ACT = game.modules.get("wodx-actions")?.api;

    await G.step("7. a good hiding roll sets Sneaking", async () => {
      let tries = 0, on = false;
      const t0 = Date.now();
      const apply = (() => { try { return game.settings.get("wodx-actions", "applyChanges"); } catch (e) { return null; } })();
      while ( !on && tries < 3 ) {
        tries++;
        await ACT.quickCheck({actor: a, check: "hide", bonus: 8, direct: true});
        await wait();
        on = !!a.statuses?.has?.("wodx-sneaking") && !!K.hasCondition(a, "sneaking");
      }
      const card = [...game.messages].filter(m => (m.timestamp ?? 0) >= t0).some(m => String(m.content ?? "").includes("marked Sneaking"));
      G.ok("7. a good hiding roll sets Sneaking", on && card, {on, card, tries, apply});
      for ( const e of [...a.effects].filter(e => e.statuses?.has?.("wodx-sneaking")) ) await e.delete();
    });

    await G.step("8. an Obfuscate power sets Obfuscated", async () => {
      const plan = ACT.effects.powerPlan(a, {set: "v20", id: "obfuscate-unseen-presence", name: "Unseen Presence", line: "v20", successes: 3, source: "gate"});
      const item = (plan.items ?? []).find(i => i.key === "veil");
      if ( item ) await ACT.effects.apply(item, "Gate Still Body");
      await wait();
      const on = !!a.statuses?.has?.("wodx-obfuscated") && !!K.hasCondition(a, "obfuscated");
      // and a plain veil that is not Obfuscate (a Gift, a Mage effect) leaves the condition off
      G.ok("8. an Obfuscate power sets Obfuscated", !!item && on, {item: item ? {key: item.key, route: item.route, condition: item.out?.condition} : null, on, keys: (plan.items ?? []).map(i => i.key)});
      for ( const e of [...a.effects].filter(e => e.statuses?.has?.("wodx-obfuscated")) ) await e.delete();
    });

    await G.step("9. a fall in the rain outdoors makes them Filthy", async () => {
      const AT = game.modules.get("wodx-atmosphere")?.api?.weather;
      const s = await G.scene({flags: {"wodx-atmosphere": {outdoors: "on"}}});
      const jdn = AT.night();
      await AT.set(jdn, {sky: "overcast", precip: "rain", intensity: "moderate", fog: "none", wind: "calm", tempNight: 8, tempDay: 12, thunder: false, snowLying: false, leaves: false});
      await wait(300);
      const tags = AT.now()?.tags ?? [], outdoor = AT.isOutdoor(s);
      await K.setCondition(a, "knockdown", true);
      await wait();
      const filthy = !!K.hasCondition(a, "filthy") && !!a.statuses?.has?.("wodx-filthy");
      await K.setCondition(a, "knockdown", false);
      await K.setCondition(a, "filthy", false);
      // dry weather: the same fall leaves them clean
      await AT.set(jdn, {sky: "clear", precip: "none", intensity: null, fog: "none", wind: "calm", tempNight: 8, tempDay: 14, thunder: false, snowLying: false, leaves: false});
      await wait(300);
      await K.setCondition(a, "knockdown", true);
      await wait();
      const dry = !K.hasCondition(a, "filthy");
      await K.setCondition(a, "knockdown", false);
      await AT.set(jdn, null);
      G.ok("9. a fall in the rain outdoors makes them Filthy", filthy && dry, {filthy, dry, tags, outdoor});
    });

    await G.step("10. a week unwashed makes a player's character Filthy", async () => {
      const players = game.users.filter(u => !u.isGM).length;
      await b.update({"ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});
      const night = Math.floor((game.time.worldTime - 43200) / 86400);
      await b.setFlag("wodx-library", "washed", night - 8);
      await game.time.advance(1);
      await wait(900);
      const filthy = !!K.hasCondition(b, "filthy");
      await K.setCondition(b, "filthy", false);
      await b.setFlag("wodx-library", "washed", night);
      await game.time.advance(1);
      await wait(900);
      const clean = !K.hasCondition(b, "filthy");
      G.ok("10. a week unwashed makes a player's character Filthy", filthy && clean, {filthy, clean, players, owned: b.hasPlayerOwner});
    });

    await G.step("11. a crippled arm shows on the token", async () => {
      const BD = C.body;
      let hl = null; try { hl = game.settings.get("wodx-combat", "hitLocations"); } catch (e) { hl = null; }
      const s = await G.scene({name: "WoDX gate: gatestillmarks arm"});
      const [tok] = await G.tokens(s, [{actor: a, x: 3, y: 3}]);
      await wait(500);
      const icons0 = tok.object?.effects?.children?.length ?? 0, t1 = Date.now();
      // two blows of two lethal levels each on the right arm: the damage lands on the track, then the attack card records
      // where (recordWound); wounds that add up to three on one part cripple it (B2903). A single blow of three takes the
      // attack's own maiming path instead.
      const ta = tok.actor ?? a;
      await ta.update({"system.health.damage.lethal": 2});
      await BD.recordWound(ta, {location: {id: "arm-r", label: "Right arm"}, type: "lethal", levels: 2}, {before: {lethal: 0}, after: {lethal: 2}, effType: "lethal"}, null);
      await wait(1200);
      // the icons the token draws after the first blow (Bloody comes on with it): the second must add the Crippled one
      const iconsMid = tok.object?.effects?.children?.length ?? 0;
      const srcs = () => (tok.object?.effects?.children ?? []).map(c => String(c.texture?.baseTexture?.resource?.src ?? c.texture?.source?.resource?.src ?? c.texture?.source?.label ?? c.texture?.label ?? ""));
      await ta.update({"system.health.damage.lethal": 4});
      await BD.recordWound(ta, {location: {id: "arm-r", label: "Right arm"}, type: "lethal", levels: 2}, {before: {lethal: 2}, after: {lethal: 4}, effType: "lethal"}, null);
      await waitFor(() => [...ta.effects].some(e => e.flags?.["wodx-combat"]?.crippled), 5000).catch(() => null);
      await wait(400);
      const fx = [...ta.effects].find(e => e.flags?.["wodx-combat"]?.crippled === "arm-r");
      const seen = [...ta.effects].map(e => `${e.name}|${JSON.stringify(e.flags?.["wodx-combat"] ?? {})}|${e.showIcon}`);
      const tokFx = [...(tok.actor?.effects ?? [])].map(e => e.name);
      const want = CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS;
      const temp = !!fx && ta.temporaryEffects.some(e => e.id === fx.id);
      const icons1 = tok.object?.effects?.children?.length ?? 0;
      const card = [...game.messages].some(m => (m.timestamp ?? 0) >= t1 && m.flags?.["wodx-combat"]?.maim?.part === "arm-r");
      const drawn = srcs();
      G.ok("11. a crippled arm shows on the token", !!fx && (want === undefined || fx.showIcon === want) && icons1 > iconsMid && card,
        {hl, fx: !!fx, showIcon: fx?.showIcon, want, temp, icons0, iconsMid, icons1, card, bones: drawn.some(x => /bones/.test(x)), drawn: drawn.slice(0, 8), tokFx, linked: tok.actorLink});
      // healed: the levels leave the track, the Crippled mark goes by itself
      await ta.update({"system.health.damage.lethal": 0});
      const healed = await waitFor(() => ![...ta.effects].some(e => e.flags?.["wodx-combat"]?.crippled), 5000);
      G.ok("11b. the crippled arm heals with its levels", healed, {left: [...ta.effects].map(e => e.name)});
    });

    // Steps 12-17 (B6035-B6038): the rules the conditions only used to name, driven through a real attack, a real token and the real readers
    const [c, d] = await G.make(Actor, [
      {name: "Gate Still Striker", type: "Mortal", system: {attributes: {dexterity: {value: 3}, strength: {value: 3}}, abilities: {brawl: {value: 3}}}},
      {name: "Gate Still Mark", type: "Mortal", system: {attributes: {dexterity: {value: 4}, stamina: {value: 2}}, abilities: {dodge: {value: 4}}}}]);
    const fs = await G.scene({name: "WoDX gate: gatestillmarks fight"});
    const [tc, td] = await G.tokens(fs, [{actor: c, x: 3, y: 3}, {actor: d, x: 4, y: 3}]);
    await wait(500);
    const tca = tc.actor ?? c, tda = td.actor ?? d;
    const swing = async () => {
      const t0 = Date.now(); let rolled = null;
      const h = Hooks.on("wodxAttackRolled", (att, r) => { if ( att?.id === tca.id || att === tca ) rolled = r; });
      try { await C.quickAttack({attacker: tc.object, target: td.object}); } finally { Hooks.off("wodxAttackRolled", h); }
      await wait(400);
      // every card the swing made (a fight-start card can come after the attack card in a busy world)
      const msgs = [...game.messages].filter(m => (m.timestamp ?? 0) >= t0 && m.flags?.["wodx-combat"]);
      const card = msgs.find(m => rolled?.messageId && m.id === rolled.messageId) ?? msgs.find(m => /attacks/.test(String(m.content ?? ""))) ?? msgs.pop();
      return {rolled, text: String(card?.content ?? ""), rolls: card?.rolls?.length ?? 0};
    };

    await G.step("12. no defence for the Incapacitated", async () => {
      const free = C.bestDefense(tda, {defense: "auto"}, {type: "bashing", name: "Punch"}, {})?.best?.type ?? null;
      await tda.update({"system.health.damage.bashing": 7});
      await waitFor(() => K.hasCondition(tda, "incapacitated"), 4000).catch(() => null);
      const incap = !!K.hasCondition(tda, "incapacitated");
      const r = await swing();
      const noDef = /No defense: Gate Still Mark cannot defend/.test(r.text) && !/Automatic defense:/.test(r.text);
      G.ok("12. no defence for the Incapacitated", incap && !!free && noDef && !!r.rolled, {free, incap, noDef, hit: r.rolled?.hit, rolls: r.rolls, text: r.text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)});
      await tda.update({"system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
      await waitFor(() => !K.hasCondition(tda, "incapacitated"), 4000).catch(() => null);
    });

    await G.step("13. a body frozen still is hit every time", async () => {
      // the same mark the witness step puts on a mortal frozen with fear (kindred.js)
      await X.applyTimed(tda, {name: "Frozen with fear", description: "Frozen by the gate", duration: {kind: "scene"}, condition: "immobilized", key: "wodx-witness-freeze", source: "WoDX witness step"});
      // and a roll that should nearly always miss: six harder
      await X.traits.addBite(tca, {key: "gate-still-hard", name: "Gate: six harder", tags: ["all"], diff: 6, duration: {kind: "scene"}, source: "gate"});
      const out = [];
      for ( let i = 0; i < 3; i++ ) {
        out.push(await swing());
        await tda.update({"system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
      }
      const hits = out.filter(r => r.rolled?.hit).length, auto = out.filter(r => /Hit automatically/.test(r.text)).length;
      const noDef = out.every(r => /No defense/.test(r.text));
      G.ok("13. a body frozen still is hit every time", hits === 3 && noDef && auto >= 1, {hits, auto, noDef});
      for ( const e of [...tda.effects].filter(e => e.statuses?.has?.("wodx-immobilized")) ) await e.delete();
      for ( const e of [...tca.effects].filter(e => /Gate: six harder/.test(e.name)) ) await e.delete();
    });

    await G.step("14. a Dazed attacker loses the attack", async () => {
      const before = C.cannotActWhy?.(tca) ?? null;
      // Dazed as the combat card puts it on: a blow past Stamina after soak
      await X.applyTimed(tca, {name: "Dazed", duration: {kind: "scene"}, condition: "dazed", key: "wodx-dazed", source: "VtDA20 p. 348"});
      const why = C.cannotActWhy?.(tca) ?? null;
      G.ok("14. a Dazed attacker loses the attack", before === "" && /Dazed/.test(String(why)), {before, why, gm: game.user.isGM});
      for ( const e of [...tca.effects].filter(e => e.statuses?.has?.("wodx-dazed")) ) await e.delete();
    });

    await G.step("15. Blinded takes the token's sight", async () => {
      const vs = await G.scene({name: "WoDX gate: gatestillmarks sight", tokenVision: true});
      const [tv] = await G.tokens(vs, [{actor: c, x: 2, y: 2, sight: {enabled: true, range: 30}}]);
      await wait(600);
      const tva = tv.actor ?? c;
      // the mark Combat's blinding attack puts on (an eye shot, a blinding weapon)
      await X.applyTimed(tva, {name: "Blinded", condition: "blinded", key: "wodx-blinded", duration: {kind: "scene"}, source: "WoDX house rule"});
      await wait(800);
      const blind = !!tv.hasStatusEffect?.("blind"), isBlinded = tv.object?.vision?.isBlinded ?? null;
      const cannot = X.traits?.senses?.(tva)?.cannot ?? [];
      const roll = game.modules.get("wodx-actions")?.api?.limits?.conditionMods?.(tva, {sight: true}) ?? null;
      G.ok("15. Blinded takes the token's sight", blind && isBlinded !== false && cannot.includes("sight"), {blind, isBlinded, cannot, roll});
      for ( const e of [...tva.effects].filter(e => e.statuses?.has?.("wodx-blinded")) ) await e.delete();
      await wait(400);
      G.ok("15b. sight comes back when Blinded ends", !tv.hasStatusEffect?.("blind"), {blind: !!tv.hasStatusEffect?.("blind")});
    });

    const BI = await import("/modules/wodx-actions/scripts/binds.js");
    await G.step("16. Possessed holds the body; Blighted is on the token and the rolls", async () => {
      // the marks the spirit Charms put on (charms.js): Possession raw, Blighted Touch for three hours
      await tda.createEmbeddedDocuments("ActiveEffect", [{name: "Possessed by Gate Bane", img: "icons/svg/statue.svg", statuses: ["wodx-possessed"], flags: {"wodx-actions": {charm: "possession"}}}]);
      const binds = BI.bindingsOn(tda), move = BI.judgeMove(binds, {from: {x: 0, y: 0}, to: {x: 100, y: 0}});
      await X.applyTimed(tda, {name: "Blighted", img: "icons/svg/poison.svg", condition: "blighted", duration: {kind: "time", seconds: 3 * 3600}, key: "wodx-charm-blight", source: "gate"});
      const blighted = !!tda.statuses?.has?.("wodx-blighted") && !!K.hasCondition(tda, "blighted");
      const soc = game.modules.get("wodx-actions")?.api?.limits?.afterCosts?.socialDiff?.(tda) ?? null;
      G.ok("16. Possessed holds the body; Blighted is on the token and the rolls", binds.some(b => b.key === "possess") && move.ok === false && blighted && soc >= 1,
        {binds: binds.map(b => b.key), move, blighted, soc});
      for ( const e of [...tda.effects].filter(e => e.statuses?.has?.("wodx-possessed") || e.statuses?.has?.("wodx-blighted")) ) await e.delete();
    });

    await G.step("17. Forbidden and the shadow soul hold", async () => {
      // the marks a won Forbiddance (mummy.js balance) and a shadow-soul lapse (kote.js) put on, written the same way
      if ( !K.getCondition("forbidden") ) X.registerCondition?.({id: "forbidden", name: "Forbidden", img: "icons/svg/cancel.svg", source: "Mummy: the Resurrection pp. 141–142", summary: "Forbidden by a mummy's Balance: it cannot attack the mummy and must leave as soon as it can.", mods: {}});
      const fx = await X.applyTimed(tca, {name: "Afraid", description: "Forbidden by Gate Still Mark", duration: {kind: "scene"}, key: "wodx-effect-fear", condition: "forbidden", source: "gate"});
      await fx?.update?.({"flags.wodx-actions.bindBy": tda.id, "flags.wodx-actions.forbiddenBy": tda.id});
      const t0 = Date.now();
      const res = await C.quickAttack({attacker: tc.object, target: td.object});
      await wait(300);
      const card = [...game.messages].some(m => (m.timestamp ?? 0) >= t0 && m.flags?.["wodx-combat"]);
      const fb = BI.bindingsOn(tca), nearer = BI.judgeMove(fb, {from: {x: 0, y: 0}, to: {x: 90, y: 0}, feared: [{x: 100, y: 0}]}), away = BI.judgeMove(fb, {from: {x: 0, y: 0}, to: {x: -90, y: 0}, feared: [{x: 100, y: 0}]});
      await fx?.delete?.();
      if ( !K.getCondition("shadow-soul") ) X.registerCondition?.({id: "shadow-soul", name: "Shadow soul", img: "icons/svg/terror.svg", source: "Kindred of the East p. 151", summary: "The P'o has the body for the scene and plays its Archetype; a Hun roll at 9 keeps the Hun aware.", lines: ["kuei-jin"], mods: {}});
      const sx = await X.applyTimed(tca, {name: "Shadow soul", duration: {kind: "scene"}, condition: "shadow-soul", key: "wodx-kote-soul", source: "gate"});
      const sb = BI.bindingsOn(tca), smove = BI.judgeMove(sb, {from: {x: 0, y: 0}, to: {x: 100, y: 0}});
      await sx?.delete?.();
      G.ok("17. Forbidden and the shadow soul hold", (res?.length ?? 0) === 0 && !card && nearer.ok === false && away.ok === true && smove.ok === false && smove.ask === true,
        {results: res?.length ?? null, card, nearer, away, shadow: sb.map(b => b.key), smove});
    });
  } finally { return G.finish(); }
}
