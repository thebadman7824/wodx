/**
 * Realm world maps (WoDX Otherworlds 0.21.0, WoDX Storyteller 0.57.3, B2556 to B2559), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gaterealmworlds.mjs?${Date.now()}`)).run()
 * It reads and draws only, but for step 5, which marks one place found and makes one new visit in the world setting
 * "realmWorlds" and puts the setting back as it was. Nothing else is made, changed or deleted, and the clock is
 * not touched.
 *   1. the modules: Otherworlds 0.21.0 or later with api.realmWorlds, Storyteller 0.57.3 or later
 *   2. every realm of the Realm maps catalogue has a map with places, and every place can be reached from the first
 *      (from Otherworlds 0.22.0 the places include the catalogue's ways in and out and its located dangers)
 *   3. redraw rules: Pangaea is the same in 1197 and 2010, the Tempest changes with the Great Maelstrom of 1347,
 *      Flux changes with the visit, two Dark Kingdoms differ by name
 *   4. the pictures: every realm draws as an SVG, shrouded and whole; the closer look is the same twice
 *   5. found places: no journey to a place not yet found, the journey once it is marked found, a new visit to Flux,
 *      and the setting put back
 *   6. the tool is among the token controls' tools and the window opens with its picture, Realm, From, To and Year,
 *      shows another realm after Show, and closes
 *   7. the world map window has the button "Realms past the near worlds"
 *   8. on first use: Otherworlds main.mjs no longer imports the realm world rules, and api.realmWorlds.load() gives them (0.23.2)
 * Result: Data/wodx-gate/gaterealmworlds-result.json.
 */
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const within = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} did not finish in ${ms / 1000} s`)), ms))]);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gaterealmworlds-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const S = game.modules.get("wodx-storyteller"), O = game.modules.get("wodx-otherworlds"), RWs = O?.api?.realmWorlds;
  // Otherworlds 0.23.2: the rules and places load on first use
  const loadedBefore = !!RWs?.rules, RW = RWs?.load ? await RWs.load() : RWs?.rules;
  const wins = sel => [...document.querySelectorAll("dialog.application, .application.dialog, .window-app.dialog")].find(el => el.querySelector(sel));
  const findWin = () => wins("img.wow-realm-world");
  const closeAll = async () => { for ( let i = 0; i < 4; i++ ) { const w = findWin() ?? wins("img.wst-world-map"); if ( !w ) break; w.querySelector('button[data-action="close"]')?.click(); await sleep(400); } };
  const before = foundry.utils.deepClone(game.settings.get("wodx-otherworlds", "realmWorlds") ?? {found: {}, visits: {}});
  try {
    ok("1. modules", S?.active && O?.active && !foundry.utils.isNewerVersion("0.57.3", S.version) && !foundry.utils.isNewerVersion("0.21.0", O.version)
      && typeof RWs?.open === "function" && typeof RW?.build === "function", {storyteller: S?.version, otherworlds: O?.version});

    const ids = RW.REALM_IDS, cat = O.api.realmMaps.rules.REALM_ORDER, maps = Object.fromEntries(ids.map(id => [id, RW.build(id, {year: 1197})]));
    const cut = ids.filter(id => maps[id].places.slice(1).some(p => !(RW.journey(maps[id], 0, p.i).days > 0)));
    ok("2. every realm", ids.length === cat.length && cat.every(id => maps[id]?.places.length >= 2) && cut.length === 0, {realms: ids.length, cut});

    const cells = (id, o) => RW.build(id, o).cells.join("");
    ok("3. redraw rules", cells("pangaea", {year: 1197}) === cells("pangaea", {year: 2010}) && cells("tempest", {year: 1346}) !== cells("tempest", {year: 1347})
      && cells("tempest", {year: 1197}) === cells("tempest", {year: 1346}) && cells("flux", {visit: 0}) !== cells("flux", {visit: 1})
      && RW.seedOf("dark-kingdom", {which: "Jade"}) !== RW.seedOf("dark-kingdom", {which: "Ivory"}), {kinds: Object.fromEntries(ids.map(id => [id, RW.kindOf(id)]))});

    const isSvg = s => typeof s === "string" && s.startsWith("<svg") && s.endsWith("</svg>") && !/NaN|undefined/.test(s);
    const bad = ids.filter(id => !isSvg(RWs.view({realm: id, year: 1197}).picture) || !isSvg(RWs.view({realm: id, year: 1197, eyes: "all"}).picture));
    const st = maps.stygia, c1 = RW.closer(st, st.places[0].x, st.places[0].y), c2 = RW.closer(st, st.places[0].x, st.places[0].y);
    ok("4. pictures", bad.length === 0 && JSON.stringify(c1) === JSON.stringify(c2) && isSvg(RW.closerSvg(st, c1)), {bad, lands: c1.lands});

    // found places and a new visit, then the setting as it was
    let hidden = false, open = false, visit = false, back = false;
    try {
      const t = RWs.mapOf({realm: "tempest", year: 1197}), far = t.places.find(p => p.i !== t.gate).i;
      await RWs.setFound(t, []); await sleep(150);
      hidden = RWs.view({realm: "tempest", year: 1197, from: t.gate, to: far}).journey?.hidden === true;
      await RWs.setFound(t, [far]); await sleep(150);
      open = RWs.view({realm: "tempest", year: 1197, from: t.gate, to: far}).journey?.days > 0 && RWs.found(t).includes(far);
      const n = RWs.visits("flux"), was = RWs.mapOf({realm: "flux"}).seed;
      await RWs.newVisit("flux"); await sleep(150);
      visit = RWs.visits("flux") === n + 1 && RWs.mapOf({realm: "flux"}).seed !== was;
    } finally { await game.settings.set("wodx-otherworlds", "realmWorlds", before); await sleep(150); back = JSON.stringify(game.settings.get("wodx-otherworlds", "realmWorlds")) === JSON.stringify(before); }
    ok("5. found places", hidden && open && visit && back, {hidden, open, visit, back});

    const pr = RWs.open({realm: "tempest", year: 1197});
    let win = null;
    for ( let i = 0; i < 40 && !win; i++ ) { await sleep(250); win = findWin(); }
    const had = !!win && ["select[name=realm]", "select[name=from]", "select[name=to]", "input[name=year]", "select[name=eyes]"].every(s => win.querySelector(s));
    if ( win ) { win.querySelector("select[name=realm]").value = "malfeas"; win.querySelector('button[data-action="show"]')?.click(); }
    await sleep(1500);
    const win2 = findWin(), shown = !!win2 && win2.querySelector("select[name=realm]")?.value === "malfeas" && /not yet found|Every place here is found/.test(win2.textContent);
    win2?.querySelector('button[data-action="close"]')?.click();
    await within(pr, 15000, "The realm world maps window"); await sleep(300);
    ok("6. window", had && shown && !findWin(), {had, shown});

    const pw = S.api.worldMap.open({year: 1197});
    let wm = null;
    for ( let i = 0; i < 40 && !wm; i++ ) { await sleep(250); wm = wins("img.wst-world-map"); }
    const button = !!wm?.querySelector('button[data-action="realms"]');
    wm?.querySelector('button[data-action="close"]')?.click();
    await within(pw, 15000, "The world map window"); await sleep(300);
    ok("7. from the world map", button, {button});
    // Otherworlds 0.23.2 (B2676): main.mjs no longer imports the realm world rules, so they load only on first use
    const mainText = await (await fetch(`/modules/wodx-otherworlds/scripts/main.mjs?${Date.now()}`)).text();
    ok("8. on first use", !/realm-worlds-rules\.mjs/.test(mainText) && RWs.rules === RW && typeof RW?.build === "function", {loadedBefore});
  } catch (err) {
    R.errors.push(String(err?.stack ?? err));
    try { await closeAll(); await game.settings.set("wodx-otherworlds", "realmWorlds", before); } catch (e) { /* nothing left to close */ }
  }
  return save(R);
}
