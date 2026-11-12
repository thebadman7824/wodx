/**
 * WoDX NPC 0.25.0 gate (politics inside factions), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepolitics.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes four Kindred NPCs and deletes them, and puts back the factions record, the
 * faction settings, the Ledger, the approval queue and its chat cards.
 *   1. WoDX NPC 0.25.0+ and Storyteller 0.32.0+: the politics API and the setting
 *   2. the members' clan and Status are read from the sheets
 *   3. a Kindred court of four keeps the court of its age; a Sabbat before 1493 runs as the court of its age
 *   4. two faction turns with politics on (Auto): the leader holds the top seat, one Primogen seat per clan, a card
 *   5. Undo on the second turn's card puts the politics back as they were after the first
 *   6. a boon marked broken in the Ledger costs the debtor a dot of standing, with an Undo card
 *   7. politics off: a turn runs no politics
 *   8. clean up
 * Result: Data/wodx-gate/gatepolitics-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, FX = () => npc().factions;
const ST = () => game.modules.get("wodx-storyteller")?.api;

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
const fac = id => FX().state().factions.find(f => f.id === id);
const lastCard = key => game.messages.contents.filter(m => m.flags?.[MOD]?.[key]).at(-1);

export async function run() {
  const {R, ok, step} = harness();
  const t0 = game.time.worldTime;
  const keep = {
    factions: foundry.utils.deepClone(game.settings.get(MOD, "factions")), mode: game.settings.get(MOD, "factionMode"),
    splits: game.settings.get(MOD, "factionSplits"), politics: game.settings.get(MOD, "factionPolitics"),
    ledger: foundry.utils.deepClone(game.settings.get("wodx-storyteller", "ledger")),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))
  };
  const made = [];
  const PO = () => npc().politics.rules;
  try {
    await game.settings.set(MOD, "factionMode", "auto");
    await game.settings.set(MOD, "factionSplits", false);

    await step("1. modules", async () => {
      const v = game.modules.get(MOD).version, sv = game.modules.get("wodx-storyteller")?.version;
      ok("1. WoDX NPC 0.25.0+, Storyteller 0.32.0+, the politics API and setting", newer(v, "0.25.0") && newer(sv, "0.32.0") && !!npc().politics?.polities?.camarilla
        && game.settings.settings.has(`${MOD}.factionPolitics`) && typeof FX().politicsInfo === "function", {v, sv});
    });

    const people = [["Gate Prince", "Ventrue", 4], ["Gate Rose", "Toreador", 2], ["Gate Fist", "Brujah", 1], ["Gate Shade", "Nosferatu", 1]];
    await step("2. sheets", async () => {
      for ( const [name, clan, status] of people ) {
        const [a] = await Actor.createDocuments([{name, type: "Vampire", system: {clan}, flags: {[MOD]: {gateRole: "politics"}}}]);
        await a.createEmbeddedDocuments("Item", [{name: "Status", type: "Feature", system: {type: "wod.types.background", value: status}}]);
        made.push(a);
      }
      const st = FX().rules.normState({factions: [{id: "gateCourt", name: "Gate Court", kind: "kindred", leader: made[0].id, members: made.map(a => a.id)}]});
      const info = FX().politicsInfo(st);
      ok("2. clan and Status come from the sheets", info[made[0].id]?.clan === "Ventrue" && info[made[0].id].status === 4 && info[made[2].id].status === 1, {info: made.map(a => info[a.id])});
    });

    await step("3. which polity", async () => {
      await FX().applyNow([{op: "faction-add", faction: FX().rules.normFaction({id: "gateCourt", name: "Gate Court", kind: "kindred", leader: made[0].id, members: made.map(a => a.id)})}]);
      const year = FX().eraInfo().year, f = fac("gateCourt");
      const key = PO().polityFor(f, year);
      ok("3. the court of its age; a Sabbat before 1493 runs as the court of its age", key === (year < 1435 ? "dark-ages-court" : "camarilla")
        && PO().polityFor({...f, polity: "sabbat"}, 1300) === "dark-ages-court" && PO().polityFor({...f, polity: "none"}, year) === null, {year, key});
    });

    let afterFirst = null;
    await step("4. two turns", async () => {
      await game.settings.set(MOD, "factionPolitics", true);
      await FX().runTurns({reason: "gate", forced: true});
      await sleep(400);
      afterFirst = foundry.utils.deepClone(fac("gateCourt").politics);
      await FX().runTurns({reason: "gate", forced: true});
      await sleep(400);
      const p = fac("gateCourt").politics, key = PO().polityFor(fac("gateCourt"), FX().eraInfo().year);
      const top = PO().topOffice(key).key;
      const clans = (p.offices.primogen ?? []).map(id => game.actors.get(id)?.system?.clan);
      const card = lastCard("factionTurn");
      ok("4. the leader holds the top seat; one seat a clan; the turn card tells it", p.offices[top]?.[0] === made[0].id && p.inner >= 2 && new Set(clans).size === clans.length
        && /Gate Court/.test(card?.content ?? ""), {offices: p.offices, inner: p.inner});
    });

    await step("5. undo", async () => {
      const card = lastCard("factionTurn");
      await FX().undoCard(card);
      await sleep(400);
      const p = fac("gateCourt").politics;
      ok("5. Undo puts the politics back as after the first turn", JSON.stringify(p) === JSON.stringify(afterFirst), {now: p, then: afterFirst});
    });

    await step("6. a broken boon", async () => {
      const debtor = made[2], before = PO().rankOf(fac("gateCourt"), debtor.id, FX().politicsInfo(FX().state()));
      const e = await ST().ledger.save({kind: "boon", size: "minor", from: {id: debtor.id, name: debtor.name}, to: {id: made[1].id, name: made[1].name}, what: "Gate boon"});
      await ST().ledger.status(e.id, "broken");
      await sleep(600);
      const after = fac("gateCourt").politics.ranks[debtor.id];
      const card = lastCard("factionBoon");
      ok("6. the debtor loses a dot of standing, with an Undo card", after === Math.max(0, before - 1) && !!card, {before, after});
    });

    await step("7. politics off", async () => {
      await game.settings.set(MOD, "factionPolitics", false);
      const inner = fac("gateCourt").politics.inner;
      await FX().runTurns({reason: "gate", forced: true});
      await sleep(400);
      ok("7. with the setting off, no inner turn runs", fac("gateCourt").politics.inner === inner, {inner});
    });
  } catch (e) { R.errors.push(e.message); }

  // 8. clean up
  try {
    await game.settings.set(MOD, "factions", keep.factions);
    await game.settings.set(MOD, "factionMode", keep.mode);
    await game.settings.set(MOD, "factionSplits", keep.splits);
    await game.settings.set(MOD, "factionPolitics", keep.politics);
    await game.settings.set("wodx-storyteller", "ledger", keep.ledger);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    for ( const a of made ) await a.delete();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length, actors: made.length};
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  ok("8. everything is back: factions, settings, Ledger, queue; the actors and cards are gone",
    JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions) && game.settings.get(MOD, "factionMode") === keep.mode
    && game.settings.get(MOD, "factionPolitics") === keep.politics
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole === "politics") && game.time.worldTime === t0, R.removed);
  return save(R, "gatepolitics-result.json");
}
