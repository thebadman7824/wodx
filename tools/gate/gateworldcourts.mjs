/**
 * WoDX NPC 0.62.0 to 0.64.0 gate (courts beyond Europe), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldcourts.mjs?${Date.now()}`)).run()
 * The gate never moves the clock and never changes the homeland. It makes six Kindred NPCs and deletes them, and puts
 * back the factions record, the faction settings, the approval queue and its chat cards.
 *   1. WoDX NPC 0.64.0+: the region courts, the homeland hook, the eleven new polities
 *   2. the homeland is read from WoDX Chronicle when the faction rules look at the world
 *   3. a Kindred faction standing in West Africa keeps a council of the Laibon, one in Egypt a court of the Ashirra,
 *      one in Japan a court of the Kuei-jin, one in the British Isles the court of its age; a hand-picked polity wins
 *   3b. (0.63.0) India keeps the Ravnos until 1999, Central Asia the Ashirra, Tibet the Kuei-jin; Garou keep a Beast
 *      Court in Japan and a Bastet land in East Africa; mages keep the Wu Lung in China, the Akashics in Tibet and the
 *      Ahl-i-Batin in Persia, and a Technocracy faction keeps Reason
 *   3c. (0.64.0) before the settlers: no Kindred court in Mexico in 1500, the Nunnehi for fae in the Andes, the Mokolé
 *      in Australia before 1788; the Nagah and the Mokolé by name
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
      const want = ["laibon-council", "ashirra", "ravnos-court", "beast-court", "bastet-land", "wu-lung-court", "akashic-monastery", "batini-circle",
        "nunnehi-council", "mokole-gathering", "nagah-nest",
        "ananasi-web", "corax-flock", "gurahl-den", "ratkin-nest", "rokea-shiver", "hsien-court", "land-fae-circle"];
      ok("1. WoDX NPC 0.66.0+, the region courts and the eighteen new polities", newer(v, "0.66.0") && !!PO().REGION_COURTS && !!PO().REGION_SHIFTERS && !!PO().REGION_MAGES
        && typeof PO().setHomeRegion === "function" && want.every(k => !!PO().POLITIES[k]), {v, missing: want.filter(k => !PO().POLITIES[k])});
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

    await step("3b. Asia and Africa", async () => {
      const f = (kind, region, name = "") => ({kind, region, name, members: ["a", "b", "c"]});
      const got = {
        india1700: PO().polityFor(f("kindred", "india"), 1700), india2005: PO().polityFor(f("kindred", "india"), 2005),
        centralAsia: PO().polityFor(f("kindred", "central-asia"), 1700), tibet: PO().polityFor(f("kindred", "tibet-himalaya"), 1700),
        garouJapan: PO().polityFor(f("garou", "japan"), 1700), garouEastAfrica: PO().polityFor(f("garou", "east-africa"), 1700),
        magesChina: PO().polityFor(f("mages", "china"), 1700), magesTibet: PO().polityFor(f("mages", "tibet-himalaya"), 1700),
        magesPersia: PO().polityFor(f("mages", "persia"), 1700), technocracy: PO().polityFor(f("mages", "china", "Iteration X Construct"), 1990)
      };
      const want = {india1700: "ravnos-court", india2005: "camarilla", centralAsia: "ashirra", tibet: "kuei-jin-court", garouJapan: "beast-court",
        garouEastAfrica: "bastet-land", magesChina: "wu-lung-court", magesTibet: "akashic-monastery", magesPersia: "batini-circle", technocracy: "technocracy-construct"};
      ok("3b. the Ravnos, Beast Courts, Bastet lands, Wu Lung, Akashics and Ahl-i-Batin by region", JSON.stringify(got) === JSON.stringify(want), {got});
    });

    await step("3c. before the settlers", async () => {
      const f = (kind, region, name = "") => ({kind, region, name, members: ["a", "b", "c"]});
      const got = {
        mexico1500: PO().polityFor(f("kindred", "mexico"), 1500), mexico1600: PO().polityFor(f("kindred", "mexico"), 1600),
        ice: PO().polityFor(f("kindred", "antarctica"), 2010), faeAndes: PO().polityFor(f("fae", "andes"), 1400),
        garouAustralia: PO().polityFor(f("garou", "australia"), 1700), nagah: PO().polityFor(f("garou", "india", "Nagah of the river"), 1600),
        mokole: PO().polityFor(f("garou", "west-africa", "Mokole of the delta"), 1600)
      };
      const want = {mexico1500: null, mexico1600: "camarilla", ice: null, faeAndes: "nunnehi-council", garouAustralia: "mokole-gathering", nagah: "nagah-nest", mokole: "mokole-gathering"};
      ok("3c. no court before the settlers, the Nunnehi, the Mokolé and the Nagah", JSON.stringify(got) === JSON.stringify(want), {got});
    });

    await step("3d. the other breeds, the Hsien and the land's own fae", async () => {
      const f = (kind, region, name = "") => ({kind, region, name, members: ["a", "b", "c"]});
      const got = {
        ananasi: PO().polityFor(f("garou", "brazil", "Ananasi of the old city"), 1600), corax: PO().polityFor(f("garou", "british-isles", "Corax of the tower"), 1300),
        gurahl: PO().polityFor(f("garou", "canada", "Gurahl of the woods"), 1900), ratkin: PO().polityFor(f("garou", "moravia", "Ratkin under Brno"), 1400),
        rokea: PO().polityFor(f("garou", "pacific-islands", "Rokea of the reef"), 2000), nezumi: PO().polityFor(f("garou", "japan", "Nezumi of the docks"), 1700),
        hsien: PO().polityFor(f("fae", "china"), 1300), pacific: PO().polityFor(f("fae", "pacific-islands"), 1700), siberiaLate: PO().polityFor(f("fae", "siberia"), 1700)
      };
      const want = {ananasi: "ananasi-web", corax: "corax-flock", gurahl: "gurahl-den", ratkin: "ratkin-nest", rokea: "rokea-shiver", nezumi: "beast-court",
        hsien: "hsien-court", pacific: "land-fae-circle", siberiaLate: "commoner-freehold"};
      ok("3d. the five breeds by name, the Hsien in China, the land's own fae in the Pacific before the settlers", JSON.stringify(got) === JSON.stringify(want), {got});
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
