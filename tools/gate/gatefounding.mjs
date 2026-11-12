/**
 * WoDX NPC 0.17.0 gate (founding factions in play), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefounding.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes one actor (a founder with Resources 3 and Contacts 2) and deletes it, and
 * puts back the factions record, the faction settings, the approval queue and its chat cards.
 *   1. WoDX NPC 0.17.0 or later: founding API, settings, the players' Factions button
 *   2. the Storyteller's founding reads the founder's dots from the sheet and caps each pledge there
 *   3. a player's request (sent as the socket message would be) waits in the queue; approving it adds the faction
 *   4. a player-run faction on orders waits at a turn; given orders, it rolls them and spends them
 *   5. End: the faction falls quiet, its places freed; Undo on the card puts it back
 *   6. Fold into another: people and places pass, half the dots; Undo puts both back
 *   7. years: a faction founded later than the current year is put to sleep by the year sweep, with an Undo card
 *   8. a dated event: a faction set to rise on it wakes, and the event's new power waits in the queue
 *   9. spheres and kinds follow the current year
 *  10. clean up
 * Result: Data/wodx-gate/gatefounding-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, FX = () => npc().factions, FO = () => npc().founding;
const chron = () => game.modules.get("wodx-chronicle").api;

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
const mine = start => chron().approvals.pending().filter(p => p.type === "wodx-npc.faction" && p.createdAt >= start);
const lastCard = key => game.messages.contents.filter(m => m.flags?.[MOD]?.[key]).at(-1);
const fac = id => FX().state().factions.find(f => f.id === id);
const stream = () => { let x = 11; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

export async function run() {
  const {R, ok, step} = harness();
  const start = Date.now(), t0 = game.time.worldTime;
  const keep = {
    factions: foundry.utils.deepClone(game.settings.get(MOD, "factions")), mode: game.settings.get(MOD, "factionMode"),
    splits: game.settings.get(MOD, "factionSplits"), players: game.settings.get(MOD, "playerFactions"),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))
  };
  let founder = null;
  const F = () => FX().rules;
  try {
    await game.settings.set(MOD, "factionMode", "suggest");

    await step("1. modules", async () => {
      const v = game.modules.get(MOD).version;
      const tools = {}; Hooks.callAll("getSceneControlButtons", {tokens: {tools}});
      ok("1. WoDX NPC 0.17.0+, founding API, settings, the Factions button for everyone", newer(v, "0.17.0") && typeof FO()?.foundDialog === "function" && typeof FO()?.openPlayer === "function"
        && game.settings.settings.has(`${MOD}.factionSplits`) && game.settings.settings.has(`${MOD}.playerFactions`) && tools.wodxFactions?.visible === true, {v});
    });

    await step("2. founding from the sheet", async () => {
      [founder] = await Actor.createDocuments([{name: "Gate Founder", type: "Mortal", flags: {[MOD]: {gateRole: "founder"}}}]);
      await founder.createEmbeddedDocuments("Item", [
        {name: "Resources", type: "Feature", system: {type: "wod.types.background", value: 3}},
        {name: "Contacts", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
      const has = {resources: FX().bgValue(founder, "resources"), contacts: FX().bgValue(founder, "contacts")};
      const built = FO().buildFounding({name: "Gate Guild", kind: "guild", sphere: "guild", owners: [founder.id], run: "orders", leader: founder.id},
        [{id: founder.id, pledge: {resources: 5, contacts: 1, herd: 4}}]);
      ok("2. the dots are read from the sheet, each pledge capped there", has.resources === 3 && built?.faction.assets.resources === 3 && built.faction.assets.contacts === 1 && built.faction.assets.herd === 0,
        {has, assets: built?.faction.assets});
    });

    let guild = null;
    await step("3. a player's request goes to the queue", async () => {
      await FO().onFoundRequest({userId: game.user.id, spec: {name: "Gate Guild", kind: "guild", sphere: "guild", owners: [founder.id], run: "orders", leader: founder.id},
        founders: [{id: founder.id, pledge: {resources: 2, contacts: 2}}]});
      await sleep(300);
      const q = mine(start).find(p => p.data?.kind === "found");
      const before = FX().state().factions.length;
      if ( q ) await chron().approvals.decide(q.id, "approve");
      await sleep(400);
      guild = FX().state().factions.find(f => f.name === "Gate Guild");
      ok("3. it waits in the queue; approved, the faction is there with its owner", !!q && FX().state().factions.length === before + 1 && guild?.owners.includes(founder.id) && guild.assets.resources === 2,
        {queued: !!q, guild: guild && {assets: guild.assets, owners: guild.owners}});
    });

    await step("4. orders", async () => {
      const s = FX().state();
      const r1 = F().runTurn(s, {streamFor: stream, seedKey: "gate", year: FX().eraInfo().year}).find(r => r.faction === guild.id);
      await FO().setOrders(guild.id, {move: "defend"}, game.user);
      await sleep(300);
      const ordered = fac(guild.id).orders?.move;
      const r2 = F().runTurn(FX().state(), {streamFor: stream, seedKey: "gate", year: FX().eraInfo().year}).find(r => r.faction === guild.id);
      ok("4. it waits for orders, then rolls them and spends them", r1?.move === "wait" && ordered === "defend" && r2?.move === "defend" && r2.changes.some(c => c.op === "faction-set" && c.set.orders === null),
        {r1: r1?.move, ordered, r2: r2?.move});
    });

    await step("5. end", async () => {
      const place = "gate-place";
      await FX().applyNow([{op: "place", place, to: guild.id}]);
      const ch = F().disbandChanges(FX().state(), guild.id, FX().eraInfo().year);
      const done = await FX().applyNow(ch);
      const ended = fac(guild.id);
      await FX().applyNow(done.inverse);
      const back = fac(guild.id);
      ok("5. it falls quiet with its place freed; Undo puts it back", ended.dormant && !ended.places.length && ended.dormantBy === "ended" && !back.dormant && back.places.includes(place),
        {ended: {dormant: ended.dormant, places: ended.places}, back: {dormant: back.dormant, places: back.places}});
      await FX().applyNow([{op: "place", place, from: guild.id, to: null}]);
    });

    await step("6. fold into another", async () => {
      const other = F().normFaction({id: "gateOther", name: "Gate Other", kind: "mortal", assets: {status: 1}});
      await FX().applyNow([{op: "faction-add", faction: other}]);
      const done = await FX().applyNow(F().absorbChanges(FX().state(), guild.id, "gateOther", FX().eraInfo().year));
      const o = fac("gateOther"), g = fac(guild.id);
      const passed = o.members.includes(founder.id) && o.assets.resources === 1 && g.absorbedBy === "gateOther" && g.dormant;
      await FX().applyNow(done.inverse);
      ok("6. people and half the dots pass; Undo puts both back", passed && !fac(guild.id).dormant && !fac("gateOther").members.includes(founder.id), {o: o.assets});
    });

    await step("7. years", async () => {
      const year = FX().eraInfo().year;
      await FX().applyNow([{op: "faction-add", faction: F().normFaction({id: "gateLater", name: "Gate Later", founded: year + 50})}]);
      await FX().yearSweep({force: true});
      await sleep(300);
      const card = lastCard("factionYears");
      ok("7. founded later than this year, it sleeps, with an Undo card", fac("gateLater")?.dormant && fac("gateLater").dormantBy === "year" && !!card, {year});
    });

    await step("8. a dated event", async () => {
      // A proposal left in the queue under the same key (from an earlier run or real play) would stop a new one being made.
      // Set it aside for this step; the clean up puts the whole queue back as it was.
      const aq = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals") ?? {});
      const other = p => p.key !== "event:thorns";
      if ( [...(aq.pending ?? []), ...(aq.held ?? [])].some(p => !other(p)) ) {
        await game.settings.set("wodx-chronicle", "approvals", {...aq, pending: (aq.pending ?? []).filter(other), held: (aq.held ?? []).filter(other)});
        R.notes.push("set aside an earlier event:thorns proposal for step 8; put back at clean up");
      }
      await FX().applyNow([{op: "faction-add", faction: F().normFaction({id: "gateRise", name: "Gate Rise", dormant: true, risesOn: "thorns"})}]);
      await FX().onEventFired({id: "thorns", year: 1493, name: "The Convention of Thorns"});
      await sleep(300);
      const q = mine(start).find(p => p.data?.kind === "event");
      ok("8. the faction set to rise wakes; the new power waits in the queue", !fac("gateRise").dormant && fac("gateRise").founded === 1493 && q?.data.changes[0].faction.name === "A Sabbat pack", {queued: !!q});
    });

    await step("9. the age", async () => {
      const e = FX().eraInfo();
      ok("9. spheres and kinds follow the year", JSON.stringify(e.spheres) === JSON.stringify(F().spheresFor(e.morality, e.year)) && e.kinds.guild === F().kindsFor(e.year).guild, {year: e.year, spheres: Object.keys(e.spheres)});
    });
  } catch (e) { R.errors.push(e.message); }

  // 10. clean up
  try {
    await game.settings.set(MOD, "factions", keep.factions);
    await game.settings.set(MOD, "factionMode", keep.mode);
    await game.settings.set(MOD, "factionSplits", keep.splits);
    await game.settings.set(MOD, "playerFactions", keep.players);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    if ( founder ) await founder.delete();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length};
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  ok("10. everything is back: the factions record, the settings, the queue; the founder and the cards are gone",
    JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions) && game.settings.get(MOD, "factionMode") === keep.mode
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole === "founder") && game.time.worldTime === t0, R.removed);
  return save(R, "gatefounding-result.json");
}
