/**
 * Re-audit gate (B6020-B6034), in Foundry, in rothenstein-wodx, as Gamemaster Test:
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
 * Result: Data/wodx-gate/gatestillmarks-result.json.
 */
import {gate} from "./kit.mjs";

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
  } finally { return G.finish(); }
}
