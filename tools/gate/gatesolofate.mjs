/**
 * The Lone Chronicle, step 5 (B6530 to B6536): the Beast played by the game, torpor and the years slept through, death
 * and heirs, in rothenstein-wodx (the testing world), as Gamemaster Test in one browser:
 *   await (await import(`/wodx-gate/gatesolofate.mjs?${Date.now()}`)).run()
 * The switch stays as it is: the seat's parts are called with force, as the seat would call them, for a player the
 * gate makes. The clock is put back at the end.
 *   1. the module and its new parts
 *   2. the Beast: a Cainite in frenzy becomes a stand-in, and a fight with the hostile guard in sight starts on the map
 *   3. Willpower: one point holds the Beast for this round; the next round it has them again
 *   4. the fight is over: the frenzy ends and the character is handed back
 *   5. torpor slept away: the clock runs to the night of rising, and the rising is rolled
 *   6. the years: a mortal lives a year through Pass the Years, the clock moves a year, the player is told
 *   7. heirs: the childe comes first; taking them up gives the player the childe, a token by the body, and the
 *      dead's holding in the childe's name
 * Result: Data/wodx-gate/gatesolofate-result.json.
 */
import {gate} from "./kit.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for ( let i = 0; i < ms / 100; i++ ) { const v = fn(); if ( v ) return v; await wait(100); }
  return fn();
}

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatesolofate");
  const MOD = "wodx-solo", ST = "wodx-storyteller";
  for ( let i = 0; i < 120 && !game.modules.get(MOD)?.api?.fate; i++ ) await wait(250);
  const S = game.modules.get(MOD)?.api, Fa = S?.fate;
  const msgs0 = new Set(game.messages.map(m => m.id));
  const combats0 = new Set(game.combats.map(c => c.id));
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  let user = null;
  try {
    // A player of the gate's own; the kit does not clear users, so the finally block does
    [user] = await G.make(User, [{name: "WoDX gate: lone player", role: CONST.USER_ROLES.PLAYER}]);
    const own = {[user.id]: OWNER};
    const [vamp, guard, sleeper, mortal, sire, childe] = await G.make(Actor, [
      {name: "WoDX gate: fate Cainite", type: "Vampire", ownership: own},
      {name: "WoDX gate: fate guard", type: "Mortal", prototypeToken: {disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE}},
      {name: "WoDX gate: fate sleeper", type: "Vampire", ownership: own},
      {name: "WoDX gate: fate mortal", type: "Mortal", ownership: own},
      {name: "WoDX gate: fate sire", type: "Vampire", ownership: own},
      {name: "WoDX gate: fate childe", type: "Vampire"}
    ]);
    const scene = await G.scene({name: "WoDX gate: solo fate square", width: 3000, height: 2400, activate: true});
    const [vt, gt, , , st] = await G.tokens(scene, [{actor: vamp, x: 10, y: 10}, {actor: guard, x: 14, y: 10, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE},
      {actor: sleeper, x: 4, y: 4}, {actor: mortal, x: 4, y: 8}, {actor: sire, x: 20, y: 12}]);

    await G.step("1. the module", async () => {
      G.ok("1. the module", !!Fa?.beastTakes && !!Fa?.fightBeast && !!Fa?.sleepYears && !!Fa?.sleepTorpor && !!Fa?.takeHeir && !!Fa?.rules?.heirsOf
        && S.rules.PANEL.some(b => b.id === "years"), {version: game.modules.get(MOD)?.version});
    });

    await user.update({character: vamp.id});
    let combat = null;
    await G.step("2. the Beast", async () => {
      await vamp.update({"system.conditions.isfrenzy": true});
      const r = await Fa.beastTakes(game.actors.get(vamp.id), {force: true, userId: user.id, why: "WoDX gate"});
      combat = await until(() => game.combats.find(c => !combats0.has(c.id) && c.combatants.some(x => x.tokenId === vt.id) && c.combatants.some(x => x.tokenId === gt.id)));
      const a = game.actors.get(vamp.id);
      G.ok("2. the Beast", a.getFlag(ST, "standIn") === true && !!a.getFlag(MOD, "beast") && r?.prey === gt.id && !!combat?.started,
        {r, standIn: a.getFlag(ST, "standIn"), combat: combat?.id ?? null});
    });

    await G.step("3. Willpower", async () => {
      await vamp.update({"system.advantages.willpower.temporary": 3, "system.advantages.willpower.permanent": 5});
      const r = await Fa.fightBeast(user.id, {actorId: vamp.id, force: true});
      let a = game.actors.get(vamp.id);
      const held = a.getFlag(ST, "standIn") !== true && Number(a.system.advantages.willpower.temporary) === 2;
      if ( combat ) await combat.nextRound();
      a = await until(() => (game.actors.get(vamp.id).getFlag(ST, "standIn") === true ? game.actors.get(vamp.id) : null), 5000) ?? game.actors.get(vamp.id);
      G.ok("3. Willpower", !!r?.ok && held && a.getFlag(ST, "standIn") === true, {r, held, standIn: a.getFlag(ST, "standIn")});
    });

    await G.step("4. the fight is over", async () => {
      if ( combat ) await combat.delete();
      const a = await until(() => { const x = game.actors.get(vamp.id); return !x.system.conditions?.isfrenzy && !x.getFlag(MOD, "beast") ? x : null; });
      const x = game.actors.get(vamp.id);
      G.ok("4. the fight is over", !!a && x.getFlag(ST, "standIn") !== true, {frenzy: x.system.conditions?.isfrenzy, beast: x.getFlag(MOD, "beast") ?? null, standIn: x.getFlag(ST, "standIn") ?? null});
    });

    await G.step("5. torpor slept away", async () => {
      await sleeper.update({"system.advantages.bloodpool.temporary": 5, "system.advantages.path.permanent": 8});
      const t0 = game.time.worldTime;
      await sleeper.setFlag("wodx-actions", "torpor", {since: t0, days: 3, voluntary: false, until: t0 + 3 * 86400, cause: "WoDX gate"});
      await user.update({character: sleeper.id});
      const r = await Fa.sleepTorpor(user.id, {actorId: sleeper.id, force: true, only: [sleeper.id]});
      const t = game.actors.get(sleeper.id).getFlag("wodx-actions", "torpor");
      const tried = !t || Number(t.retryAt) > t0 + 3 * 86400;
      G.ok("5. torpor slept away", game.time.worldTime >= t0 + 3 * 86400 && tried && !!r, {moved: game.time.worldTime - t0, risen: !t, retryAt: t?.retryAt ?? null});
    });

    await G.step("6. the years", async () => {
      await user.update({character: mortal.id});
      const t0 = game.time.worldTime;
      const r = await Fa.sleepYears(user.id, {years: 1, actorId: mortal.id, force: true, only: [mortal.id]});
      const told = game.messages.some(m => !msgs0.has(m.id) && m.flags?.[MOD]?.panel && /lives the years/.test(m.content ?? ""));
      G.ok("6. the years", game.time.worldTime - t0 >= 360 * 86400 && r?.years === 1 && told, {moved: game.time.worldTime - t0, years: r?.years, told});
    }, {timeout: 120000});

    await G.step("7. heirs", async () => {
      await childe.setFlag("wodx-creation", "lineage", {sire: {id: sire.id, name: sire.name}});
      const [cup] = await sire.createEmbeddedDocuments("Item", [{name: "WoDX gate: the sire's cup", type: "Item",
        flags: {[ST]: {owner: {id: sire.uuid, kind: "actor", name: sire.name, since: 1200}}}}]);
      await user.update({character: sire.id});
      await sire.toggleStatusEffect("dead", {active: true, overlay: true});
      const heirs = Fa.heirsFor(game.actors.get(sire.id), user);
      const r = await Fa.takeHeir(user.id, {actorId: childe.id, force: true});
      const c = game.actors.get(childe.id);
      const tok = scene.tokens.find(t => t.actorId === childe.id);
      const rec = game.actors.get(sire.id).items.get(cup.id)?.flags?.[ST]?.owner;
      G.ok("7. heirs", heirs[0]?.id === childe.id && game.users.get(user.id).character?.id === childe.id && c.testUserPermission(user, "OWNER")
        && !!tok && Math.abs(tok.x - st.x) <= (scene.grid?.size ?? 100) && rec?.id === c.uuid && r?.passed >= 1,
        {heirs: heirs.map(h => `${h.name} (${h.label})`), r, owner: rec?.name ?? null});
    });
  } finally {
    const mine = game.messages.filter(m => !msgs0.has(m.id) && (m.flags?.[MOD] || /WoDX gate: fate/.test(m.content ?? ""))).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine).catch(() => null);
    for ( const c of game.combats.filter(x => !combats0.has(x.id)) ) await c.delete().catch(() => null);
    if ( user && game.users.get(user.id) ) await game.users.get(user.id).delete().catch(() => null);
    return G.finish();
  }
}
