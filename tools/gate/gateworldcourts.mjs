/**
 * WoDX NPC 0.61.0 gate (Kindred courts beyond Europe), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldcourts.mjs?${Date.now()}`)).run()
 * The gate never moves the clock and never changes the homeland. It makes six Kindred NPCs and deletes them, and puts
 * back the factions record, the faction settings, the approval queue and its chat cards.
 *   1. WoDX NPC 0.61.0+: the region courts, the homeland hook, the two new polities
 *   2. the homeland is read from WoDX Chronicle when the faction rules look at the world
 *   3. a Kindred faction standing in West Africa keeps a council of the Laibon, one in Egypt a court of the Ashirra,
 *      one in Japan a court of the Kuei-jin, one in the British Isles the court of its age; a hand-picked polity wins
 *   4. two faction turns with politics on: the leader of the Laibon council is Elder of the land, each legacy a voice;
 *      the Ashirra court's leader is Amir
 *   5. the faction window shows Where it stands with the homeland and all 44 regions, marked as a fixed list
 *   6. clean up
 * Result: Data/wodx-gate/gateworldcourts-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api, FX = () => npc().factions;

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

export async function run() {
  const {R, ok, step} = harness();
  const t0 = game.time.worldTime;
  const home0 = game.modules.get("wodx-chronicle")?.api?.world?.homeland?.();
  const keep = {
    factions: foundry.utils.deepClone(game.settings.get(MOD, "factions")), mode: game.settings.get(MOD, "factionMode"),
    splits: game.settings.get(MOD, "factionSplits"), politics: game.settings.get(MOD, "factionPolitics"),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))
  };
  const made = [];
  const PO = () => npc().politics.rules;
  try {
    await game.settings.set(MOD, "factionMode", "auto");
    await game.settings.set(MOD, "factionSplits", false);

    await step("1. modules", async () => {
      const v = game.modules.get(MOD).version;
      ok("1. WoDX NPC 0.61.0+, the region courts and the two new polities", newer(v, "0.61.0") && !!PO().REGION_COURTS && typeof PO().setHomeRegion === "function"
        && !!PO().POLITIES["laibon-council"] && !!PO().POLITIES.ashirra, {v});
    });

    await step("2. homeland", async () => {
      PO().setHomeRegion(null);
      FX().eraInfo();
      ok("2. the faction rules know the chronicle's homeland", PO().homeRegion() === (typeof home0 === "string" ? home0 : home0?.id ?? null), {home0, seen: PO().homeRegion()});
    });

    const year = FX().eraInfo().year;
    await step("3. which court", async () => {
      const k = region => ({kind: "kindred", region, members: ["a", "b", "c"]});
      const keys = ["west-africa", "egypt", "japan", "british-isles"].map(r => PO().polityFor(k(r), year));
      const picked = PO().polityFor({...k("egypt"), polity: "camarilla"}, Math.max(year, 1435));
      ok("3. Laibon, Ashirra, Kuei-jin and the court of its age by region; a pick wins",
        JSON.stringify(keys) === JSON.stringify(["laibon-council", "ashirra", "kuei-jin-court", year < 1435 ? "dark-ages-court" : "camarilla"]) && picked === "camarilla", {year, keys, picked});
    });

    const people = [["Gate Elder", "Osebo", 4], ["Gate Guest", "Guruhi", 2], ["Gate Teller", "Akunanse", 1],
      ["Gate Amir", "Assamite", 4], ["Gate Scholar", "Toreador", 2], ["Gate Watcher", "Lasombra", 1]];
    await step("4. a turn", async () => {
      for ( const [name, clan, status] of people ) {
        const [a] = await Actor.createDocuments([{name, type: "Vampire", system: {clan}, flags: {[MOD]: {gateRole: "worldcourts"}}}]);
        await a.createEmbeddedDocuments("Item", [{name: "Status", type: "Feature", system: {type: "wod.types.background", value: status}}]);
        made.push(a);
      }
      const ids = made.map(a => a.id);
      await FX().applyNow([
        {op: "faction-add", faction: FX().rules.normFaction({id: "gateLaibon", name: "Gate Laibon", kind: "kindred", region: "west-africa", leader: ids[0], members: ids.slice(0, 3)})},
        {op: "faction-add", faction: FX().rules.normFaction({id: "gateAshirra", name: "Gate Ashirra", kind: "kindred", region: "egypt", leader: ids[3], members: ids.slice(3)})}]);
      await game.settings.set(MOD, "factionPolitics", true);
      await FX().runTurns({reason: "gate", forced: true});
      await sleep(400);
      await FX().runTurns({reason: "gate", forced: true});
      await sleep(500);
      const L = fac("gateLaibon"), A = fac("gateAshirra");
      const voices = (L?.politics?.offices?.legacy ?? []).map(id => game.actors.get(id)?.system?.clan);
      ok("4. the Elder of the land and the Amir hold the top seats; one voice a legacy", L?.region === "west-africa" && L.politics.offices.elder?.[0] === ids[0]
        && A?.politics?.offices?.amir?.[0] === ids[3] && new Set(voices).size === voices.length && L.politics.inner >= 1 && A.politics.inner >= 1,
      {laibon: L?.politics?.offices, ashirra: A?.politics?.offices});
    });

    await step("5. the window", async () => {
      const open = FX().editFaction("gateLaibon");
      let dlg = null;
      for ( let i = 0; i < 20 && !dlg; i++ ) { await sleep(150); dlg = [...document.querySelectorAll(".wnpc-faction-form")].at(-1); }
      const sel = dlg?.querySelector("select[name=region]");
      const n = sel?.options.length ?? 0, picked = sel?.value, fixed = sel?.hasAttribute("data-fixed");
      const homeLabel = sel?.options[0]?.textContent ?? "";
      dlg?.closest(".application, dialog, .window-app")?.querySelector("[data-action=cancel]")?.click();
      await Promise.race([open, sleep(1500)]);
      ok("5. Where it stands: the homeland and 44 regions, a fixed list, the faction's own picked", n === 45 && picked === "west-africa" && fixed && /homeland/i.test(homeLabel), {n, picked, fixed, homeLabel});
    });
  } catch (e) { R.errors.push(e.message); }

  // 6. clean up
  try {
    await game.settings.set(MOD, "factions", keep.factions);
    await game.settings.set(MOD, "factionMode", keep.mode);
    await game.settings.set(MOD, "factionSplits", keep.splits);
    await game.settings.set(MOD, "factionPolitics", keep.politics);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    for ( const a of made ) await a.delete();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length, actors: made.length};
    FX().eraInfo();
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  ok("6. everything is back: factions, settings, queue, homeland; the actors and cards are gone",
    JSON.stringify(game.settings.get(MOD, "factions")) === JSON.stringify(keep.factions) && game.settings.get(MOD, "factionMode") === keep.mode
    && game.settings.get(MOD, "factionPolitics") === keep.politics
    && JSON.stringify(game.settings.get("wodx-chronicle", "approvals")?.pending ?? []) === JSON.stringify(keep.approvals?.pending ?? [])
    && JSON.stringify(game.modules.get("wodx-chronicle")?.api?.world?.homeland?.()) === JSON.stringify(home0)
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole === "worldcourts") && game.time.worldTime === t0, R.removed);
  return save(R, "gateworldcourts-result.json");
}
