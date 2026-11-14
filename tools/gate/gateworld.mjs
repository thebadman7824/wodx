/**
 * The world's regions gate (Chronicle 0.48.0, Creation 0.16.0, Storyteller 0.54.0, Atmosphere 0.15.0, Chronicle 0.49.0), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworld.mjs?${Date.now()}`)).run()
 * Holds the world while it runs. Makes its own scene "WoDX gate: World" and deletes it after; puts the homeland,
 * the latitude, the part of the world, the people's culture and the climate back as they were. Makes no actors.
 *   1. the api and settings are there (api.world, the Homeland setting, 44 regions, each whole)
 *   2. at home nothing has changed: the homeland is Moravia, people are Bohemia's, the climate Central Europe's
 *   3. a scene given Egypt: region, latitude, an hour ahead, Arabic names, the hot desert's weather
 *   4. a scene given Japan: the family name comes first; a scene given Mexico: no family name in 1197
 *   5. clearing the scene's place brings home back
 *   6. the homeland set to India and back: latitude, part of the world, culture and climate follow, money does not
 *   7. the Clock draws "Where this scene stands", and its window lists every region
 *   8. money: every region's money pays an allowance this year
 *   9. people can be made for every region this year (12 each), none with a gap in the name
 *  10. every other WoDX module still answers
 * Result: Data/wodx-gate/gateworld-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await sleep(100); } return !!(await fn()); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle";
  const chron = game.modules.get(C)?.api, creation = game.modules.get("wodx-creation")?.api;
  const st = game.modules.get("wodx-storyteller")?.api, atmo = game.modules.get("wodx-atmosphere")?.api;
  const get = k => game.settings.get(C, k);
  const was = {homeland: get("homeland"), latitude: get("latitude"), region: get("region"), culture: get("peopleCulture")};
  let climate0 = null, money0 = null;
  try { climate0 = game.settings.get("wodx-atmosphere", "climate"); } catch (e) { /* off */ }
  try { money0 = game.settings.get("wodx-storyteller", "moneyRegion"); } catch (e) { /* off */ }
  const wasHeld = !!chron?.isHeld?.(), back = canvas.scene;
  const people = (n, key) => Array.from({length: n}, (_, i) => creation.people.generate({batch: `gateworld-${key}`, row: i}));
  let scene;
  try {
    if ( !wasHeld ) await chron.hold(true);
    if ( climate0 !== null && climate0 !== "auto" ) await game.settings.set("wodx-atmosphere", "climate", "auto");
    scene = await Scene.create({name: "WoDX gate: World", width: 1500, height: 1000, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    const W = chron?.world;

    await step("api and settings", async () => {
      const ids = Object.keys(W?.regions ?? {});
      const climates = atmo?.rules?.W?.CLIMATES ?? null;
      const whole = ids.filter(id => { const r = W.regionOf(id); return r && Number.isFinite(r.lat) && Number.isFinite(r.lon) && (!climates || climates[r.climate]); });
      ok("api and settings", !!W?.here && !!W.homeland && !!W.setHomeland && ids.length >= 44 && whole.length === ids.length && game.settings.settings.has(`${C}.homeland`),
        {regions: ids.length, whole: whole.length, homeland: was.homeland});
    });

    await step("home is unchanged", async () => {
      const here = W.here(), ctx = chron.gen.context();
      const expect = was.region === "americas" ? "north-america-east" : was.homeland;
      ok("home is unchanged", here.id === expect && W.isAbroad() === false && ctx.culture === (was.region === "americas" && was.culture === "bohemia" ? "american" : was.culture),
        {here: here.id, culture: ctx.culture, climate: atmo?.weather?.climate?.()});
    });

    await step("a scene in Egypt", async () => {
      await chron.place.set(scene, {region: "egypt", offset: W.rules.hoursAhead("egypt", W.homeland())});
      await until(() => chron.place.of(scene).region === "egypt");
      const here = W.here(), d = chron.place.describeAt(scene), ctx = chron.gen.context();
      const made = people(12, "egypt");
      const arabic = made.filter(p => p.origin === "arabic").length;
      const clim = atmo?.weather?.climate?.();
      // Atmosphere 0.15.0: the scene abroad has its own weather, a scene at home keeps the homeland's
      const other = game.scenes.find(x => x.id !== scene.id && !chron.place.of(x).region) ?? null;
      const wx = atmo?.weather?.now?.(scene) ?? null, wxHome = other ? (atmo?.weather?.now?.(other) ?? null) : null;
      const holy = chron.church.on(d, {scene, others: true});
      const homeHoly = chron.church.on(d, {scene: null});
      const own = !atmo || !wx || (wx.region === "egypt" && wx.climate === "hot-desert" && (!wxHome || (!wxHome.region && wxHome.climate !== "hot-desert")));
      ok("a scene in Egypt", own && holy?.faith === "islamic" && holy.calendar === "The Muslim year" && !!homeHoly?.faith && Array.isArray(holy.others) && here.id === "egypt" && W.isAbroad() && d.latitude === 30 && d.ownPlace && ctx.culture === "egypt" && arabic >= 9 && made.every(p => p.name && !/[{}]/.test(p.name)) && (!atmo || clim === "hot-desert"),
        {here: here.id, latitude: d.latitude, offset: d.offset, culture: ctx.culture, climate: clim, holy: holy ? {faith: holy.faith, label: holy.label} : null, homeHoly: homeHoly?.faith, weather: wx ? {region: wx.region, climate: wx.climate, label: wx.label} : null, home: wxHome ? {region: wxHome.region ?? null, climate: wxHome.climate} : null, names: made.slice(0, 4).map(p => p.name)});
    });

    await step("names in their own order", async () => {
      await chron.place.set(scene, {region: "japan"});
      await until(() => chron.place.of(scene).region === "japan");
      const jp = people(8, "japan");
      const first = jp.filter(p => p.family && p.name.startsWith(`${p.family} `)).length;
      await chron.place.set(scene, {region: "mexico"});
      await until(() => chron.place.of(scene).region === "mexico");
      const mx = people(8, "mexico");
      const year = chron.eras?.currentYear?.() ?? null;
      const group = chron.gen.context().era;
      const plain = ["medieval", "ancient"].includes(group) ? mx.every(p => p.origin === "nahua" && !p.family) : mx.every(p => p.name);
      ok("names in their own order", first === jp.length && plain, {year, group, japan: jp.slice(0, 3).map(p => p.name), mexico: mx.slice(0, 3).map(p => p.name)});
    });

    await step("home again", async () => {
      await chron.place.set(scene, {});
      await until(() => !chron.place.of(scene).region);
      ok("home again", W.isAbroad() === false && chron.gen.context().culture !== "mexico" && !scene.flags?.[C]?.place, {here: W.here().id});
    });

    await step("the homeland moves and comes back", async () => {
      await W.setHomeland("india");
      await until(() => get("homeland") === "india" && get("peopleCulture") === "india");
      const there = {lat: get("latitude"), part: get("region"), culture: get("peopleCulture"), climate: atmo?.weather?.climate?.(), money: money0 === null ? null : game.settings.get("wodx-storyteller", "moneyRegion")};
      const made = people(6, "india");
      await W.setHomeland(was.homeland, {latitude: was.latitude});
      await game.settings.set(C, "region", was.region);
      await game.settings.set(C, "peopleCulture", was.culture);
      await until(() => get("homeland") === was.homeland && get("latitude") === was.latitude);
      ok("the homeland moves and comes back", there.lat === 28.6 && there.part === "other" && there.culture === "india" && (!atmo || there.climate === "monsoon") && there.money === money0
        && made.every(p => p.name) && get("latitude") === was.latitude && get("region") === was.region && get("peopleCulture") === was.culture, {there, names: made.slice(0, 3).map(p => p.name), back: {lat: get("latitude"), part: get("region"), culture: get("peopleCulture")}});
    });

    await step("the Clock's button and window", async () => {
      // The button lives in the Clock window, so open it first (the first run of this gate did not, and failed here)
      await chron.openClock?.();
      await until(() => document.querySelector('#wodx-clock [data-action="placeHere"]'), 4000);
      const btn = document.querySelector('[data-action="placeHere"]');
      const p = chron.place.dialog(scene);
      const found = await until(() => document.querySelector('dialog select[name="region"], .application select[name="region"]'), 5000);
      const sel = document.querySelector('dialog select[name="region"], .application select[name="region"]');
      const n = sel ? sel.options.length : 0;
      const dlg = sel?.closest("dialog, .application");
      const wide = dlg ? dlg.scrollWidth <= dlg.clientWidth + 2 : false;
      dlg?.querySelector('[data-action="close"], button.header-control[data-action="close"]')?.click();
      await Promise.race([p, sleep(1500)]);
      ok("the Clock's button and window", !!btn && /Where this scene stands/.test(btn.textContent) && found && n === Object.keys(W.regions).length + 1 && wide, {button: btn?.textContent?.trim(), options: n, fits: wide});
    });

    await step("money in every region", async () => {
      const M = st?.upkeep?.money?.rules ?? null;
      if ( !M?.MONIES ) { ok("money in every region", !st, {note: "WoDX Storyteller's money rules not on the api"}); return; }
      const year = chron.eras?.currentYear?.() ?? 1197;
      const bad = Object.keys(W.regions).filter(id => { const r = W.regionOf(id); try { const m = M.moneyFor(year, r.money); return !(M.allowance(2, year, r.money) > 0 && M.formatMoney(M.allowance(2, year, r.money), m)); } catch (e) { return true; } });
      ok("money in every region", !bad.length, {year, bad, sample: ["japan", "egypt", "mexico", "west-africa"].map(id => { const k = W.regionOf(id).money; return `${id}: ${M.formatMoney(M.allowance(2, year, k), M.moneyFor(year, k))}`; })});
    });

    await step("people in every region", async () => {
      const bad = [], sample = {};
      for ( const id of Object.keys(W.regions) ) {
        await scene.setFlag(C, "place", {latitude: null, offset: 0, region: id});
        const made = people(12, id);
        if ( !made.every(p => p.name && p.given && !/[{}]/.test(p.name) && p.trade) ) bad.push(id);
        sample[id] = made[0]?.name;
      }
      await scene.unsetFlag(C, "place");
      ok("people in every region", !bad.length, {bad, sample});
    });

    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-library", "wodx-storyteller", "wodx-creation", "wodx-atmosphere", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( get("homeland") !== was.homeland ) await chron.world.setHomeland(was.homeland, {latitude: was.latitude});
      for ( const [k, v] of [["latitude", was.latitude], ["region", was.region], ["peopleCulture", was.culture]] ) if ( get(k) !== v ) await game.settings.set(C, k, v);
      if ( climate0 !== null && game.settings.get("wodx-atmosphere", "climate") !== climate0 ) await game.settings.set("wodx-atmosphere", "climate", climate0);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      if ( !wasHeld ) await chron.hold(false);
      R.notes.push(`settings back: ${get("homeland") === was.homeland && get("latitude") === was.latitude && get("region") === was.region && get("peopleCulture") === was.culture}`);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateworld-result.json");
}
