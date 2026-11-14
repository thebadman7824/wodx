/**
 * Goods by way of life and region (Library 0.19.0, Interactables 0.36.0; B2680 to B2682), in rothenstein-wodx (the
 * testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gategoodsways.mjs?${Date.now()}`)).run()
 * Makes two scenes ("WoDX gate: Cairo goods" in Egypt and "WoDX gate: Brno goods" at home) and deletes them after.
 * Nothing is written to any container; the clock does not move.
 *   1. versions and api
 *   2. the served goods know where they are at home (rosary, Quran, tea, ham, the coins of Europe)
 *   3. the fill reads where each scene stands: Cairo as Egypt and the lands of Islam, Brno as the homeland
 *   4. the coin of the place in Cairo's money; none in a land that trades without coin
 *   5. 40 draws of 12 for a house of worship: Cairo never draws a rosary or a host, Brno never a prayer rug
 *   6. every other WoDX module still answers
 * Result: Data/wodx-gate/gategoodsways-result.json.
 */
const N = 6;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gategoodsways-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const v = id => game.modules.get(id)?.version, older = (a, id) => foundry.utils.isNewerVersion(a, v(id) ?? "0");
  const chron = () => game.modules.get("wodx-chronicle")?.api;
  const scenes = [];
  const t0 = game.time.worldTime;
  try {
    const G = await import(`/modules/wodx-library/data/goods.mjs?${Date.now()}`);
    const L = await import(`/modules/wodx-library/data/goods-ways.mjs?${Date.now()}`);
    const F = await import(`/modules/wodx-interactables/scripts/fill-rules.mjs?${Date.now()}`);
    const FI = await import(`/modules/wodx-interactables/scripts/fill.mjs?${Date.now()}`);
    const made = await Scene.create([{name: "WoDX gate: Cairo goods", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}},
      {name: "WoDX gate: Brno goods", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}}]);
    const cairo = made.find(s => s.name.endsWith("Cairo goods")), brno = made.find(s => s.name.endsWith("Brno goods"));
    scenes.push(cairo, brno);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    await sleep(300);
    const year = Number(chron()?.eras?.currentYear?.()) || 1197;
    R.notes.push(`year ${year}, homeland ${chron()?.world?.homeland?.()}`);
    const row = n => G.GOODS.find(g => (g.former ?? g.name) === n);

    await step("1. versions and api", async () => {
      ok("1. versions and api", !older("0.19.0", "wodx-library") && !older("0.36.0", "wodx-interactables") && typeof G.inUseAt === "function"
        && typeof FI.whereFor === "function" && typeof FI.coinNamer === "function" && game.modules.get("wodx-library")?.api?.version === v("wodx-library"),
        {library: v("wodx-library"), interactables: v("wodx-interactables"), chronicle: v("wodx-chronicle"), storyteller: v("wodx-storyteller")});
    });
    await step("2. goods know where they are at home", async () => {
      const W = chron().world.rules, at = (n, y, r) => G.inUseAt(row(n), y, {region: r, way: W.sphereFor(r, y)});
      const checks = {
        rosaryCairo: at("a rosary", 1300, "egypt") === false, rosaryBrno: at("a rosary", 1300, "moravia") === true,
        quranCairo: at("a handwritten Quran", 1300, "egypt") === true, teaChina: at("a packet of tea", 1300, "china") === true,
        teaBrno: at("a packet of tea", 1300, "moravia") === false, hamMexico: at("a smoked ham", 1450, "mexico") === false,
        groatCairo: at("a silver groat", 1350, "egypt") === false, euroBrno: at("a euro note", 2010, "moravia") === false,
        coinEverywhere: at(L.LOCAL_COIN, 1300, "japan") === true
      };
      ok("2. goods know where they are at home", Object.values(checks).every(Boolean), {checks, goods: G.GOODS.length, placed: Object.keys(G.WAYS).length});
    });
    let wc = null, wb = null;
    await step("3. where each scene stands", async () => {
      wc = FI.whereFor(cairo); wb = FI.whereFor(brno);
      const W = chron().world.rules;
      ok("3. where each scene stands", wc.region === "egypt" && wc.way === W.sphereFor("egypt", year) && wb.region === chron().world.homeland() && wc.year === year && !!wc.money,
        {cairo: wc, brno: wb});
    });
    await step("4. the coin of the place", async () => {
      const coin = await FI.coinNamer({...wc, year: 1300});
      const line = coin?.(7);
      const canada = chron().world.regionOf("canada")?.money;
      const none = await FI.coinNamer({year: 1300, money: canada, region: "canada"});
      const storyOn = !!game.modules.get("wodx-storyteller")?.active;
      ok("4. the coin of the place", storyOn ? (line === "7 dirhams" && none?.(3) === null) : coin === null, {cairo1300: line, canada1300: none?.(3) ?? "(none)"});
    });
    await step("5. draws for a house of worship", async () => {
      const {goods, weights, inUse} = await FI.goodsData();
      const drawAt = (w, y) => Array.from({length: 40}, () => F.drawMixed({goods, weights, what: "goods", place: "church", count: 12,
        year: y, way: w.way, region: w.region, inUse})).flat().map(d => d.name);
      const c = drawAt({region: "egypt", way: chron().world.rules.sphereFor("egypt", 1300)}, 1300);
      const b = drawAt({region: "moravia", way: "latin"}, 1300);
      const badC = c.filter(n => /rosary|consecrated host|scapular/.test(n)), badB = b.filter(n => /prayer rug|Quran/.test(n));
      ok("5. draws for a house of worship", c.length > 100 && b.length > 100 && !badC.length && !badB.length,
        {cairo: [...new Set(c)].slice(0, 25), brno: [...new Set(b)].slice(0, 25), badC, badB});
    });
    await step("6. other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-creation", "wodx-storyteller", "wodx-interactables", "wodx-library", "wodx-senses"];
      const bad = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("6. other modules", !bad.length, {missingApi: bad});
    });
  } catch (e) { R.errors.push({error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); }
  finally {
    for ( const s of scenes ) { try { await s?.delete(); } catch (e) { R.errors.push({error: `cleanup: ${e.message}`}); } }
    if ( game.time.worldTime !== t0 ) { try { await game.time.advance(t0 - game.time.worldTime); } catch (e) { R.errors.push({error: `clock: ${e.message}`}); } }
  }
  return save(R);
}
