/**
 * The world map (WoDX Storyteller 0.54.0, WoDX Otherworlds 0.20.0, B2530 to B2539), in Foundry, in rothenstein-wodx
 * only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworld.mjs?${Date.now()}`)).run()
 * It reads and draws only: nothing is made, changed or deleted, and the clock is not touched.
 *   1. the modules: Storyteller 0.54.0 or later with api.worldMap, Otherworlds 0.20.0 or later with api.worldsChart
 *   2. the grid: Brno in Moravia, Cairo desert on the Nile in Egypt, Kyoto in Japan, Lima in the Andes; every region
 *      has a middle that lies in it
 *   3. a journey: London to New York takes weeks under sail in 1700, under three weeks by steam in 1880, and under
 *      four days by air in 2000
 *   4. the closer view of one square is the same twice
 *   5. the pictures: the living world, the three mirrors and the chart of the worlds each draw as an SVG
 *   6. "The world map" is in the Storyteller's hand
 *   7. the window opens with its picture, From, To and Year, shows a journey after Show, and closes
 * Result: Data/wodx-gate/gateworld-result.json.
 */
const N = 7;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const within = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} did not finish in ${ms / 1000} s`)), ms))]);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateworld-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const S = game.modules.get("wodx-storyteller"), O = game.modules.get("wodx-otherworlds"), WMap = S?.api?.worldMap, WM = WMap?.rules, chart = O?.api?.worldsChart;
  const findWin = () => [...document.querySelectorAll("dialog.application, .application.dialog, .window-app.dialog")].find(el => el.querySelector("img.wst-world-map") && el.querySelector('select[name="layer"]'));
  try {
    ok("1. modules", S?.active && O?.active && !foundry.utils.isNewerVersion("0.54.0", S.version) && !foundry.utils.isNewerVersion("0.20.0", O.version)
      && typeof WMap?.open === "function" && typeof WM?.journey === "function" && typeof chart?.svg === "function", {storyteller: S?.version, otherworlds: O?.version});

    const d = (lon, lat) => WM.describe({lon, lat});
    const brno = d(16.6, 49.2), cairo = d(31.2, 30), kyoto = d(135.8, 35), lima = d(-77, -12);
    const middles = WM.REGION_IDS.every(id => { const c = WM.regionCentre(id); const sq = WM.squareOf(c.lon, c.lat); return WM.regionAt(sq.col, sq.row) === id; });
    ok("2. grid", brno.region === "moravia" && cairo.region === "egypt" && cairo.ground === "D" && cairo.rivers.includes("Nile") && kyoto.region === "japan" && lima.region === "andes"
      && WM.REGION_IDS.length >= 40 && middles, {brno: brno.words, cairo: cairo.words, kyoto: kyoto.words, lima: lima.words, regions: WM.REGION_IDS.length});

    const lon = {lon: -0.1, lat: 51.5}, ny = {lon: -74, lat: 40.7};
    const sail = WM.journey(lon, ny, {year: 1700}), steam = WM.journey(lon, ny, {year: 1880}), jet = WM.journey(lon, ny, {year: 2000});
    ok("3. journey", sail.surface.days > 30 && !sail.air && steam.surface.days < 21 && steam.surface.days > 8 && jet.best === "air" && jet.air.days < 4 && Math.abs(sail.km - 5570) < 80,
      {km: sail.km, sail: sail.surface.days, steam: steam.surface.days, jet: jet.air?.days, lines: WM.journeyLines(steam)});

    const sq = WM.squareOf(12.5, 41.9), a = WM.closer(sq.col, sq.row), b = WM.closer(sq.col, sq.row);
    const lands = new Set(a.cells.flat().map(c => c.land));
    ok("4. closer view", JSON.stringify(a) === JSON.stringify(b) && a.cells.length === WM.ZOOM && lands.has("sea") && lands.size > 1, {lands: [...lands], km: a.km});

    const isSvg = s => typeof s === "string" && s.startsWith("<svg") && s.endsWith("</svg>") && !/NaN|undefined/.test(s);
    const layers = ["earth", ...Object.keys(chart.rules.MIRRORS), "chart"];
    const pics = Object.fromEntries(layers.map(layer => [layer, WMap.view({layer, from: "moravia", to: "japan", year: 1700})]));
    ok("5. pictures", layers.length === 5 && layers.every(l => isSvg(pics[l].picture)) && pics.earth.lines.some(l => /km as the crow flies/.test(l)) && pics.chart.picture.includes("Stygia")
      && chart.rules.missing(O.api.realmMaps.rules.REALMS).length === 0, {sizes: Object.fromEntries(layers.map(l => [l, pics[l].picture.length])), lines: pics.earth.lines});

    ok("6. in the hand", (S.api.hand?.tools ?? []).some(t => t.key === "worldMap" && t.label === "The world map"));

    const pr = WMap.open({from: "moravia", to: "japan", year: 1700});
    let win = null;
    for ( let i = 0; i < 40 && !win; i++ ) { await sleep(250); win = findWin(); }
    const had = !!win && !!win.querySelector('select[name="from"]') && !!win.querySelector('select[name="to"]') && !!win.querySelector('input[name="year"]');
    const lines1 = win ? win.textContent.includes("km as the crow flies") : false;
    if ( win ) { win.querySelector('select[name="to"]').value = "egypt"; win.querySelector('button[data-action="show"]')?.click(); }
    await sleep(1200);
    const win2 = findWin();
    const shown = !!win2 && /To: .*Egypt|To: .*egypt/i.test(win2.textContent);
    win2?.querySelector('button[data-action="close"]')?.click();
    await within(pr, 15000, "The world map window"); await sleep(300);
    ok("7. window", had && lines1 && shown && !findWin(), {had, lines1, shown});
  } catch (err) {
    R.errors.push(String(err?.stack ?? err));
    try { for ( let i = 0; i < 3; i++ ) { const w = findWin(); if ( !w ) break; w.querySelector('button[data-action="close"]')?.click(); await sleep(400); } } catch (e) { /* nothing left to close */ }
  }
  return save(R);
}
