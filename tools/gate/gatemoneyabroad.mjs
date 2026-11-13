/**
 * Every land its own money and coin of the place in the purse (Storyteller 0.58.0, Chronicle 0.50.1; B2650 to
 * B2652), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemoneyabroad.mjs?${Date.now()}`)).run()
 * Makes a scene "WoDX gate: Kyoto" (Japan) and a character; views the Kyoto scene for steps 5 and 6, then goes back
 * to the scene that was viewed and deletes all of it. The clock does not move.
 *   1. versions and api
 *   2. the eleven regions pay in money of their own, and shared coin stays shared
 *   3. abroad: change money into the coin of the place, pay with it (no home money spent), undo
 *   4. paid at home the coin of the place is untouched; at home it changes back by its money id
 *   5. arrival: one card the first time a character stands where another money is used, none the second time
 *   6. Money by era shows the change column on a scene abroad
 *   7. the sheet's coin names follow the chronicle's money abroad and at home (Sheets 0.15.2, B2653; setting put back)
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatemoneyabroad-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const st = () => game.modules.get("wodx-storyteller")?.api;
  const ch = () => game.modules.get("wodx-chronicle")?.api;
  const money = () => st()?.upkeep?.money;
  const t0 = game.time.worldTime, viewed = canvas?.scene ?? null, msgs0 = new Set(game.messages.map(m => m.id));
  const scenes = [], actors = [];
  const player = game.users.find(u => !u.isGM);
  try {
    const [kyoto] = await Scene.create([{name: "WoDX gate: Kyoto", width: 1000, height: 1000, padding: 0, flags: {"wodx-chronicle": {place: {region: "japan"}}}}]);
    scenes.push(kyoto);
    const [a] = await Actor.create([{name: "WoDX gate: traveller", type: "Mortal", ownership: player ? {default: 0, [player.id]: 3} : {default: 0}}]);
    actors.push(a);
    const year = Number(ch()?.eras?.currentYear?.()) || 0, R0 = money().rules;
    R.notes.push({year, homeland: ch()?.world?.homeland?.(), moneyRegion: game.settings.get("wodx-storyteller", "moneyRegion"), player: !!player});

    await step("versions and api", async () => {
      const v = id => game.modules.get(id)?.version;
      ok("versions and api", !foundry.utils.isNewerVersion("0.50.1", v("wodx-chronicle")) && !foundry.utils.isNewerVersion("0.58.1", v("wodx-storyteller"))
        && typeof money()?.change === "function" && typeof money()?.foreign === "function" && typeof money()?.arrival === "function",
        {chron: v("wodx-chronicle"), st: v("wodx-storyteller")});
    });
    await step("the eleven regions pay in money of their own", async () => {
      const want = {korea: "korean", "southeast-asia": "southeast-asian", nusantara: "malay", "carpathians-balkans": "hungarian", aegean: "greek",
        caribbean: "caribbean", andes: "andean", "southern-cone": "platine", "central-africa": "kongo", "tibet-himalaya": "tibetan", canada: "canadian"};
      const wrong = Object.entries(want).filter(([id, m]) => ch().world.regionOf(id)?.money !== m || !R0.MONIES[m]).map(([id]) => id);
      const shared = R0.sameMoney(1600, "caribbean", "mexican") && R0.sameMoney(1600, "greek", "ottoman") && !R0.sameMoney(1900, "greek", "ottoman");
      ok("the eleven regions pay in money of their own", !wrong.length && shared, {wrong, shared});
    });
    let got = 0;
    await step("abroad: change, pay with the coin of the place, undo", async () => {
      await money().receive(a, 100000, {note: "gate"});
      const away = money().awayMoney(kyoto);
      const r = await money().change(a, 40000, {scene: kyoto});
      got = r.got;
      const held = money().foreign(a);
      const carried = money().purse(a).carried;
      const p = await money().pay(a, 500, {scene: kyoto, note: "gate"});
      const spent = got - (money().foreign(a)[0]?.amount ?? 0);
      const undone = await money().undo(a);
      ok("abroad: change, pay with the coin of the place, undo", !!away && r.ok && got > 0 && held.length === 1 && carried === 60000
        && p.ok && p.fromLocal > 0 && p.fromCarried === 0 && spent === p.fromLocal && undone && money().foreign(a)[0]?.amount === got,
        {away, r, held, p, spent});
    });
    await step("at home: untouched by a home payment, changed back by its id", async () => {
      const id = money().foreign(a)[0]?.id;
      const before = money().foreign(a)[0]?.amount;
      await money().pay(a, 100, {atHome: true, scene: kyoto, note: "gate"});
      const same = money().foreign(a)[0]?.amount === before;
      const carried = money().purse(a).carried;
      const b = await money().change(a, before, {back: true, money: id});
      ok("at home: untouched by a home payment, changed back by its id", same && b.ok && money().purse(a).carried === carried + b.got && !money().foreign(a).length,
        {id, before, b});
    });
    await step("arrival: one card, once", async () => {
      if ( !player ) { ok("arrival: one card, once", true, {skipped: "no player user to own the character"}); return; }
      const n0 = game.messages.filter(m => /Another land's money/.test(m.content)).length;
      const td = await a.getTokenDocument({x: 100, y: 100});
      await kyoto.createEmbeddedDocuments("Token", [td.toObject()]);
      await wait(800);
      const n1 = game.messages.filter(m => /Another land's money/.test(m.content)).length;
      await kyoto.createEmbeddedDocuments("Token", [td.toObject()]);
      await wait(800);
      const n2 = game.messages.filter(m => /Another land's money/.test(m.content)).length;
      ok("arrival: one card, once", n1 === n0 + 1 && n2 === n1 && !!a.flags?.["wodx-storyteller"]?.money?.abroadIn, {n0, n1, n2, flag: a.flags?.["wodx-storyteller"]?.money?.abroadIn});
    });
    await step("Money by era shows the change column abroad", async () => {
      await kyoto.view();
      await wait(1000);
      const p = money().dialog();
      await wait(1000);
      const el = [...document.querySelectorAll(".wst-money")].find(e => e.querySelector("table.wst-money-t"));
      const into = !!el?.querySelector(`input[name="${a.id}.into"]`), hint = /money changer here takes/.test(el?.textContent ?? "");
      for ( const app of foundry.applications.instances.values() ) if ( app.element?.classList?.contains("wst-money") ) await app.close();
      await p;
      ok("Money by era shows the change column abroad", into && hint, {into, hint, found: !!el});
    });
    await step("the sheet's coin names follow the chronicle's money", async () => {
      const ex = game.modules.get("wodx-sheets")?.api?.extras, was = game.settings.get("wodx-sheets", "coinPlace");
      try {
        await game.settings.set("wodx-sheets", "coinPlace", "chronicle");
        const abroad = ex.coinsNow(kyoto), home = ex.coinsNow(null);
        const wantAbroad = R0.moneyFor(year, "japanese").units.map(u => u[0]).reverse();
        const homeM = R0.moneyFor(year, game.settings.get("wodx-storyteller", "moneyRegion")).units.map(u => u[0]).reverse();
        const lc = l => (l ?? []).map(x => String(x).toLowerCase()).join(",");
        await game.settings.set("wodx-sheets", "coinPlace", "german");
        const german = ex.coinsNow(kyoto);
        ok("the sheet's coin names follow the chronicle's money", lc(abroad) === lc(wantAbroad) && lc(home) === lc(homeM) && lc(german) !== lc(abroad), {abroad, home, german});
      } finally { await game.settings.set("wodx-sheets", "coinPlace", was); }
    });
    await step("every other WoDX module still answers", async () => {
      const ids = ["wodx-chronicle", "wodx-storyteller", "wodx-npc", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-atmosphere", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("every other WoDX module still answers", !missing.length, {missing});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( viewed && canvas?.scene?.id !== viewed.id ) await viewed.view(); } catch (e) { R.errors.push(`view back: ${e.message}`); }
    try { const made = game.messages.filter(m => !msgs0.has(m.id) && /Another land's money|Home money again/.test(m.content)).map(m => m.id); if ( made.length ) await ChatMessage.deleteDocuments(made); } catch (e) { R.errors.push(`cleanup chat: ${e.message}`); }
    try { if ( actors.length ) await Actor.deleteDocuments(actors.filter(Boolean).map(x => x.id)); } catch (e) { R.errors.push(`cleanup actors: ${e.message}`); }
    try { if ( scenes.length ) await Scene.deleteDocuments(scenes.filter(Boolean).map(s => s.id)); } catch (e) { R.errors.push(`cleanup scenes: ${e.message}`); }
    if ( game.time.worldTime !== t0 ) R.errors.push("the clock moved");
  }
  return save(R, "gatemoneyabroad-result.json");
}
