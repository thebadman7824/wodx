/**
 * Gate: WoDX NPC follow-through after a reaction (NPC Motives Desk m1-m5, c1, r3; B5680-B5686).
 *   1. an alarm: a guard within call comes to the trouble, a bystander gets away from it (m2)
 *   2. a challenge is recorded, and ten minutes later the intruder still there meets the next step (m1)
 *   3. an informer slips off to the watch-house; stopped on the way, the word never arrives (m4)
 *   4. one who runs remembers who frightened them (m5)
 *   5. a hostage is let go when the fight ends, and remembers who held them (c1)
 *   6. a guard on watch walks its beat to another tagged place (r3)
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, RT = () => npc().routines;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pos = d => ({x: d.x, y: d.y});

export async function run() {
  const G = gate("gatefollow");
  const memWas = (() => { try { return game.settings.get(MOD, "memory"); } catch (e) { return null; } })();
  try {
    // The beats rest on the hour (B5686) and sight is shorter at night: play at twenty past noon. Cleanup puts the clock back.
    const {getEngine} = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
    const eng = getEngine(), d0 = eng.timeToDate(game.time.worldTime);
    let at = eng.dateToTime({year: d0.year, month: d0.month, day: d0.day, hour: 12, minute: 20});
    if ( at <= game.time.worldTime ) at += 86400;
    await game.time.advance(at - game.time.worldTime);
    G.R.notes.push(`clock moved from ${d0.hour}:${String(d0.minute ?? 0).padStart(2, "0")} to 12:20`);
    const sc = await G.scene({width: 2400, height: 1600});
    const S = sc.grid.size;
    await sc.setFlag(MOD, "routineMode", "auto");
    try { await game.settings.set(MOD, "memory", true); } catch (e) { G.R.notes.push("no memory setting"); }
    const stats = {attributes: {perception: {value: 5}, dexterity: {value: 2}}, abilities: {alertness: {value: 4}, brawl: {value: 2}}};
    const [guard, guard2, clerk, hero, taker, victim, walker] = await G.make(Actor, [
      {name: "Gate Follow Guard", type: "Mortal", system: stats, flags: {[MOD]: {behavior: {template: "guard"}}}},
      {name: "Gate Follow Second Guard", type: "Mortal", system: stats, flags: {[MOD]: {behavior: {template: "guard"}}}},
      {name: "Gate Follow Clerk", type: "Mortal", flags: {[MOD]: {behavior: {template: "civilian"}}}},
      {name: "Gate Follow Intruder", type: "Mortal"},
      {name: "Gate Follow Taker", type: "Mortal"},
      {name: "Gate Follow Hostage", type: "Mortal", flags: {[MOD]: {behavior: {template: "civilian"}}}},
      {name: "Gate Follow Watchman", type: "Mortal", flags: {[MOD]: {behavior: {template: "guard"}}}}
    ]);
    await sc.createEmbeddedDocuments("Region", [
      {name: "Gate Follow Yard", color: "#aa3333", shapes: [rect(S, 2, 2, 6, 6)], flags: {[MOD]: {place: {kind: "yard", owner: "", private: false}}}},
      {name: "Gate Follow Watch-house", color: "#3333aa", shapes: [rect(S, 18, 2, 4, 4)], flags: {[MOD]: {place: {kind: "gate", owner: "", private: false}}}},
      {name: "Gate Follow Market", color: "#33aa33", shapes: [rect(S, 18, 10, 4, 4)], flags: {[MOD]: {place: {kind: "market", owner: "", private: false}}}}
    ]);
    const reg = n => sc.regions.find(r => r.name === n);
    const yard = reg("Gate Follow Yard"), house = reg("Gate Follow Watch-house"), market = reg("Gate Follow Market");
    await yard.createEmbeddedDocuments("RegionBehavior", [{name: "WoDX: Reaction", type: RT().reactionType(), system: {watchers: "listed", names: "Gate Follow Guard",
      triggers: ["enter"], conditions: ["weapon"], match: "any", who: "anyone", response: "profile"}}]);
    const [tg, tg2, tc, th] = await G.tokens(sc, [{actor: guard, x: 3, y: 3}, {actor: guard2, x: 12, y: 3}, {actor: clerk, x: 6, y: 5}, {actor: hero, x: 4, y: 4}]);
    await sleep(600);
    const card = async (watcher, action) => ChatMessage.create({content: "gate", whisper: [game.user.id], flags: {[MOD]: {reaction: {watcher: watcher.uuid, intruder: th.uuid,
      region: yard.uuid, scene: sc.uuid, options: [{action, score: 9, why: "the gate", label: action}], head: "Gate", why: "", lines: [], mode: "suggest", trigger: "enter"}}}});

    await G.step("1. an alarm: the guard comes, the bystander goes", async () => {
      const g2 = pos(tg2), c0 = pos(tc), h = pos(th);
      const done = await RT().acceptReactionCard(await card(tg, "alarm"), 0);
      await sleep(1500);
      G.ok("1. the second guard came toward the trouble", dist(pos(sc.tokens.get(tg2.id)), h) < dist(g2, h), {text: done?.text});
      G.ok("1. the bystander moved away", dist(pos(sc.tokens.get(tc.id)), h) > dist(c0, h), {text: done?.text});
      await sc.unsetFlag(MOD, "alert");
    });

    await G.step("2. a challenge, then the next step when they stay", async () => {
      await RT().acceptReactionCard(await card(tg, "challenge"), 0);
      const c = (sc.getFlag(MOD, "challenges") ?? []).find(x => x.intruder === th.id);
      G.ok("2. the challenge is recorded", !!c && c.region === yard.uuid, {c});
      await guard.unsetFlag(MOD, "paused");
      await sc.setFlag(MOD, "challenges", [{...c, at: game.time.worldTime - 11 * 60}]);
      const since = Date.now();
      await RT().checkChallenges(sc, game.time.worldTime);
      await sleep(800);
      const posted = [...game.messages].filter(x => x.timestamp >= since);
      const m = posted.filter(x => x.getFlag(MOD, "reaction")).at(-1)?.getFlag(MOD, "reaction");
      G.ok("2. a second reaction leads with a firmer step", !!m && ["alarm", "fight", "send"].includes(m.options?.[0]?.action) && /told to go/.test(m.why ?? ""), {options: m?.options?.map(o => o.action), why: m?.why,
        posted: posted.map(x => x.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)), challenges: sc.getFlag(MOD, "challenges"),
        guard: pos(sc.tokens.get(tg.id)), intruder: pos(sc.tokens.get(th.id)), inYard: !!sc.tokens.get(th.id)?.regions?.has(yard), paused: guard.getFlag(MOD, "paused") ?? null,
        level: RT().alertLevel(sc), dayTime: game.time.worldTime % 86400});
      G.ok("2. it is acted on once", (sc.getFlag(MOD, "challenges") ?? []).every(x => x.acted));
      await sc.unsetFlag(MOD, "alert");
    });

    await G.step("3. an informer slips off; stopped, the word is lost", async () => {
      await clerk.unsetFlag(MOD, "paused");
      await RT().acceptReactionCard(await card(sc.tokens.get(tc.id), "report"), 0);
      await sleep(1500);
      G.ok("3. the informer walked to the watch-house", !!sc.tokens.get(tc.id)?.regions?.has(house), {at: pos(sc.tokens.get(tc.id))});
      const r = (sc.getFlag(MOD, "reports") ?? []).find(x => x.byId === clerk.id);
      G.ok("3. the report names who carries it", !!r);
      await clerk.toggleStatusEffect("dead", {active: true});
      await sc.setFlag(MOD, "reports", [{...r, at: game.time.worldTime - 1}]);
      await RT().checkAlerts();
      G.ok("3. a stopped informer raises no alarm", RT().alertLevel(sc) === "calm" && !(sc.getFlag(MOD, "reports") ?? []).length, {level: RT().alertLevel(sc)});
      await clerk.toggleStatusEffect("dead", {active: false});
    });

    await G.step("4. one who runs remembers who frightened them", async () => {
      await RT().acceptReactionCard(await card(sc.tokens.get(tc.id), "flee"), 0);
      await sleep(1200);
      const notes = clerk.getFlag(MOD, "memory")?.[hero.id] ?? [];
      G.ok("4. a memory note on the one who ran", notes.some(n => /Frightened/.test(n.text ?? "")), {notes});
    });

    await G.step("5. a hostage is let go when the fight ends", async () => {
      const [tt, tv] = await G.tokens(sc, [{actor: taker, x: 10, y: 10}, {actor: victim, x: 11, y: 10}]);
      const combat = await Combat.create({scene: sc.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tt.id, sceneId: sc.id, actorId: taker.id}, {tokenId: tv.id, sceneId: sc.id, actorId: victim.id}]);
      await tt.setFlag(MOD, "hostage", {token: tv.id, combat: combat.id});
      await combat.delete();
      await waitFor(() => !sc.tokens.get(tt.id)?.getFlag(MOD, "hostage"), 8000);
      G.ok("5. the hold is gone", !sc.tokens.get(tt.id)?.getFlag(MOD, "hostage"));
      const notes = victim.getFlag(MOD, "memory")?.[taker.id] ?? [];
      G.ok("5. the hostage remembers who seized them", notes.some(n => n.kind === "harm"), {notes});
    });

    await G.step("6. a guard on watch walks its beat", async () => {
      await walker.update({[`flags.${MOD}.routine`]: {on: true, blocks: [{from: 0, to: 24, place: house.uuid, activity: "patrol", when: "any", days: null, feast: "any", label: ""}], roles: {}},
        [`flags.${MOD}.where`]: {place: house.uuid, index: 0, activity: "patrol", label: "", since: 0}});
      const [tw] = await G.tokens(sc, [{actor: walker, x: 19, y: 3}]);
      await sleep(400);
      const moved = await RT().walkBeats(sc, game.time.worldTime);
      await sleep(1200);
      const d = sc.tokens.get(tw.id);
      G.ok("6. the guard left the watch-house for another place", !d.regions.has(house) && (d.regions.has(market) || d.regions.has(yard)), {moved, at: pos(d)});
      G.ok("6. the next stop waits a quarter hour", (await RT().walkBeats(sc, game.time.worldTime)).length === 0);
    });
  } finally {
    try { if ( memWas !== null ) await game.settings.set(MOD, "memory", memWas); } catch (e) { /* none */ }
    return G.finish();
  }
}
