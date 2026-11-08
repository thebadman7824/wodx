/**
 * Phase 7e gate (the open world, WoDX Storyteller 0.1.0), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate7e.mjs?${Date.now()}`)).run()
 * Back the world up first. Never in the Live Version world.
 *
 * The gate makes two player characters of its own (owned by the first player user; it stops if the world has none),
 * uses three of Rothenstein's scenes that are not battle maps, and puts back what it changes: the Storyteller's
 * settings, the approval queue, the clock (convening moves it), its tokens, its actors and its chat cards.
 *   1. the module: WoDX Storyteller 0.1.0, its settings and API, and the player's toolbar button in Player toolbar buttons
 *   2. a trip: the token moves to the other scene, the character's own time moves on, the world clock does not
 *   3. a place that asks first: the trip waits in the queue; approving it makes the trip
 *   4. the road: with the chance at 100, an encounter waits in the queue; rejecting it is logged
 *   5. solo play: the hours pass, the night's limit holds, a world-changing result is queued
 *   6. convening: the scene starts at the later of the two times, the clock moves to it, the one behind is asked to sum up,
 *      solo play pauses until release
 *   7. a beat on a place calls both characters; approving it convenes them; it fires once
 *   8. a roll from a player character's speaker lands in the feed; a frenzy card is flagged
 *   9. the report between sessions after End the session
 *  10. clean up
 * Result: Data/wodx-gate/gate7e-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-storyteller";
const st = () => game.modules.get(MOD).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const NOT_A_PLACE = /battle ?map|\bcombat\b|\btest\b|\(gate/i;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const KEYS = ["log", "personal", "beats", "convened", "session", "travelMinutes", "encounters", "encounterChance", "encounterTable", "soloLimit", "dawnLead", "beatsOn"];
const queued = (type, since) => chron().approvals.pending().filter(p => p.type === `${MOD}.${type}` && p.createdAt >= since);

export async function run() {
  const {R, ok, step} = harness();
  const start = Date.now(), t0 = game.time.worldTime;
  const keep = {settings: Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))])),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))};
  const player = game.users.find(u => !u.isGM);
  const scenes = game.scenes.filter(s => !NOT_A_PLACE.test(s.name ?? "")).slice(0, 3);
  const made = [], tokens = [], flagged = [];
  if ( !player || scenes.length < 3 ) { R.errors.push("needs a player user and three scenes that are not battle maps"); return save(R, "gate7e-result.json"); }
  const [A, B, Cs] = scenes;
  R.notes.push(`scenes: ${scenes.map(s => s.name).join(", ")}; player: ${player.name}`);
  const one = await Actor.create({name: "Gate 7e: Wanderer", type: "Vampire", ownership: {default: 0, [player.id]: 3}, flags: {[MOD]: {gate: true}}});
  const two = await Actor.create({name: "Gate 7e: Scholar", type: "Mortal", ownership: {default: 0, [player.id]: 3}, flags: {[MOD]: {gate: true}}});
  made.push(one, two);
  for ( const a of made ) { const td = await a.getTokenDocument({x: 200, y: 200}); const [t] = await A.createEmbeddedDocuments("Token", [td.toObject()]); tokens.push(t); }
  await game.settings.set(MOD, "encounters", false);
  await game.settings.set(MOD, "soloLimit", 0);
  await sleep(300);

  await step("1. the module", async () => {
    const v = game.modules.get(MOD)?.version;
    const pt = chron().playerTools?.PLAYER_TOOLS ?? [];
    ok("1. WoDX Storyteller 0.1.0 or later, its settings and API, and Out on your own among the players' buttons", newer(v, "0.1.0") && typeof st()?.openTracker === "function"
      && KEYS.every(k => game.settings.settings.has(`${MOD}.${k}`)) && pt.some(t => t.name === "wodxOnYourOwn"), {version: v});
  });

  await step("2. a trip", async () => {
    const p0 = st().personalTime(one.id);
    const r = await st().travel({actorId: one.id, destId: B.id});
    await sleep(300);
    const onB = B.tokens.some(t => t.actorId === one.id), onA = A.tokens.some(t => t.actorId === one.id);
    ok("2. the token moved, the character's own time moved on, the world clock did not", r.ok && onB && !onA && st().personalTime(one.id) > p0 && game.time.worldTime === t0,
      {r: {ok: r.ok, why: r.why}, minutes: (st().personalTime(one.id) - p0) / 60});
  });

  await step("3. a place that asks first", async () => {
    flagged.push({scene: Cs, was: foundry.utils.deepClone(Cs.flags?.[MOD]?.travel ?? null)});
    for ( const s of scenes ) if ( !s.flags?.[MOD]?.travel ) flagged.push({scene: s, was: null});
    for ( const s of scenes ) await st().setTravel(s, {on: true, ask: s.id === Cs.id, minutes: 15});
    const r = await st().travel({actorId: two.id, destId: Cs.id});
    const q = queued("travel", start)[0];
    const stayed = A.tokens.some(t => t.actorId === two.id);
    if ( q ) await chron().approvals.decide(q.id, "approve");
    await sleep(400);
    ok("3. the trip waited in the queue, and approving it made the trip", r.waiting && !!q && stayed && Cs.tokens.some(t => t.actorId === two.id), {title: q?.title});
  });

  await step("4. the road", async () => {
    await game.settings.set(MOD, "encounters", true);
    await game.settings.set(MOD, "encounterChance", 100);
    await st().travel({actorId: one.id, destId: A.id});
    const q = queued("encounter", start)[0];
    if ( q ) await chron().approvals.decide(q.id, "reject");
    await sleep(300);
    ok("4. an encounter waited in the queue, and rejecting it was logged", !!q && st().entries().some(e => e.actor === one.id && /quiet after all/.test(e.text)), {detail: q?.detail});
    await game.settings.set(MOD, "encounters", false);
  });

  await step("5. solo play", async () => {
    await game.settings.set(MOD, "soloLimit", 2);
    const p0 = st().personalTime(two.id);
    const a = await st().solo({actorId: two.id, kind: "research", note: "the parish records"});
    const b = await st().solo({actorId: two.id, kind: "talk", hours: 0.5, note: "asks the miller", changesWorld: true});
    const c = await st().solo({actorId: two.id, kind: "downtime"});
    ok("5. two hours passed, the world-changing result was queued, the third act was refused by the night's limit",
      a.ok && st().personalTime(two.id) - p0 === 2.5 * 3600 && b.waiting && queued("solo", start).length === 1 && !c.ok, {why: c.why});
    await game.settings.set(MOD, "soloLimit", 0);
  });

  await step("6. convening", async () => {
    const p1 = st().personalTime(one.id), p2 = st().personalTime(two.id);
    const m0 = new Set(game.messages.map(m => m.id));
    const r = await st().convene({actorIds: [one.id, two.id], sceneId: B.id, reason: "gate 7e"});
    await sleep(500);
    const cards = game.messages.filter(m => !m0.has(m.id) && /calls/.test(m.content));
    const blocked = await st().solo({actorId: one.id, kind: "hunt"});
    await st().release();
    const freed = await st().solo({actorId: one.id, kind: "hunt"});
    ok("6. the scene started at the later time, the clock moved to it, both arrived, the one behind was asked to sum up, solo play paused until release",
      r.ok && r.target === Math.max(p1, p2, t0) && game.time.worldTime === r.target && B.tokens.some(t => t.actorId === one.id) && B.tokens.some(t => t.actorId === two.id)
      && cards.some(m => /Sum up/.test(m.content)) && !blocked.ok && freed.ok, {target: r.target, rows: r.rows});
  });

  await step("7. a beat", async () => {
    await st().saveBeat({id: "gate7e", name: "Gate 7e beat", on: "place", place: A.uuid, actor: one.id, convene: [one.id, two.id], scene: Cs.id, reason: "gate 7e"});
    await st().travel({actorId: one.id, destId: A.id});
    const q = queued("beat", start)[0];
    if ( q ) await chron().approvals.decide(q.id, "approve");
    await sleep(500);
    await st().release();
    await st().travel({actorId: one.id, destId: B.id});
    await st().travel({actorId: one.id, destId: A.id});
    ok("7. the beat waited in the queue, approving it called both to the scene, and it fired once", !!q && Cs.tokens.some(t => t.actorId === two.id)
      && queued("beat", start).length === 0 && st().beats().find(b => b.id === "gate7e")?.fired, {detail: q?.detail});
  });

  await step("8. the feed", async () => {
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: one}), content: "<p>Gate 7e: a Frenzy check</p>"});
    const roll = await new Roll("3d10").evaluate();
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: two}), flavor: "Gate 7e: Wits + Investigation", rolls: [roll]});
    await sleep(800);
    const es = st().entries();
    ok("8. a roll and a frenzy card from the gate's characters are in the feed, the frenzy flagged", es.some(e => e.actor === two.id && e.kind === "roll")
      && es.some(e => e.actor === one.id && e.attention === "A frenzy"));
  });

  await step("9. the report between sessions", async () => {
    await st().endSession({factions: false});
    await st().travel({actorId: two.id, destId: B.id});
    const rep = st().report();
    const moved = rep.sections.find(s => s.title === "Who moved")?.lines ?? [];
    ok("9. after End the session the report shows only what came after", moved.length === 1 && moved[0].startsWith(two.name), {sections: rep.sections});
  });

  // 10. Put everything back
  try {
    for ( const k of KEYS ) await game.settings.set(MOD, k, keep.settings[k]);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    const Del = foundry.data?.operators?.ForcedDeletion;
    const unset = path => (Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null});
    for ( const f of flagged ) await f.scene.update(f.was ? {[`flags.${MOD}.travel`]: f.was} : unset(`flags.${MOD}.travel`));
    for ( const s of scenes ) {
      const ids = s.tokens.filter(t => made.some(a => a.id === t.actorId)).map(t => t.id);
      if ( ids.length ) await s.deleteEmbeddedDocuments("Token", ids);
    }
    for ( const a of made ) await a.delete();
    if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length};
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  ok("10. everything is back: the settings, the queue, the clock, the scenes; the gate's characters, tokens and cards are gone",
    KEYS.every(k => JSON.stringify(game.settings.get(MOD, k)) === JSON.stringify(keep.settings[k]))
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && !game.actors.some(a => a.flags?.[MOD]?.gate) && game.time.worldTime === t0, R.removed);
  return save(R, "gate7e-result.json");
}
