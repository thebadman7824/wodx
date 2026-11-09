/**
 * Phase 8 gate: WoDX Atmosphere 0.1.0, WoDX Senses 0.2.0 with the weather, and Start a chronicle (Storyteller 0.4.0).
 * In Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate8.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes a scene of its own ("WoDX gate: Weather street", a street, out of doors, following the clock) and one actor,
 * sets tonight's weather by hand and puts it back, makes a handout and the Start a chronicle journals and deletes them,
 * and restores the sky, the weather settings and the scene that was on view. The clock never moves. Rothenstein's own
 * scenes, actors and journals are not touched.
 *   1. the modules: Atmosphere 0.1.0, Senses 0.2.0 and Storyteller 0.4.0 or later, with their APIs
 *   2. the weather is seeded: the same night twice is the same, and tonight has words
 *   3. applying it sets WoDX Actions' sky to tonight's sky
 *   4. tonight set by hand to thick fog: the sky becomes storm and the outdoor scene shows Foundry's fog
 *   5. a scene the Storyteller gave its own weather keeps it
 *   6. light from the clock: the scene's darkness matches the sun, the moon and the clouds now
 *   7. WoDX Senses hears of the fog: the answer carries the fog tag, and sight is harder out of doors
 *   8. the era kit: the kit for the era in force, and the map grade on the board
 *   9. the cues: the kit's notice cue is there and plays
 *  10. a telegram handout is made in the era's style
 *  11. building the kit's playlists is planned without changing anything
 *  12. Start a chronicle: the plan, then a run without moving the clock makes the Storyteller screen and the primer once
 *  13. with every WoDX module on, nothing threw
 *  14. clean up
 * Result: Data/wodx-gate/gate8-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-atmosphere";

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
  // Each step gives up after a minute, so a hung call fails its step and the clean-up still runs
  const limit = (p, ms = 60000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`timed out after ${ms / 1000} s`)), ms))]);
  const step = async (name, fn) => { try { await limit(fn()); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const get = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };

export async function run() {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const A = game.modules.get(MOD)?.api, Sn = game.modules.get("wodx-senses")?.api, St = game.modules.get("wodx-storyteller")?.api;
  const before = canvas.scene;
  const keep = {sky: get("wodx-actions", "sky"), overrides: foundry.utils.deepClone(get(MOD, "overrides") ?? {}), applied: foundry.utils.deepClone(get(MOD, "applied") ?? {}),
    setup: foundry.utils.deepClone(get("wodx-storyteller", "setup") ?? {}), region: get("wodx-chronicle", "region"), latitude: get("wodx-chronicle", "latitude"),
    time: game.time.worldTime};
  const made = {actors: [], journals: [], scene: null, firstMsg: new Set(game.messages.map(m => m.id))};
  const errors = [];
  const onErr = ev => errors.push(String(ev?.message ?? ev?.reason ?? ev));
  window.addEventListener("error", onErr);
  window.addEventListener("unhandledrejection", onErr);
  let scene = null, tok = null, jdn = null;
  try {
    await step("1 modules", async () => {
      const m = id => game.modules.get(id);
      ok("1 modules", m(MOD)?.active && newer(m(MOD).version, "0.1.0") && !!A?.weather?.now && m("wodx-senses")?.active && newer(m("wodx-senses").version, "0.2.0")
        && m("wodx-storyteller")?.active && newer(m("wodx-storyteller").version, "0.4.0") && !!St?.setup,
        {atmosphere: m(MOD)?.version, senses: m("wodx-senses")?.version, storyteller: m("wodx-storyteller")?.version});
    });
    await step("2 seeded", async () => {
      jdn = A.weather.night();
      const a = A.weather.on(jdn + 3), b = A.weather.on(jdn + 3), t = A.weather.now();
      ok("2 seeded", Number.isFinite(jdn) && JSON.stringify(a) === JSON.stringify(b) && typeof t?.label === "string" && t.label.length > 10,
        {jdn, tonight: t?.label, climate: A.weather.climate()});
    });
    await step("3 sky", async () => {
      await A.weather.apply({force: true, quiet: true});
      ok("3 sky", get("wodx-actions", "sky") === A.weather.now()?.sky, {sky: get("wodx-actions", "sky"), want: A.weather.now()?.sky});
    });
    await step("4 fog by hand", async () => {
      scene = await Scene.create({name: "WoDX gate: Weather street", width: 1600, height: 1200, grid: {size: 100}, environment: {darknessLevel: 0.5},
        flags: {"wodx-npc": {place: {kind: "street"}}, [MOD]: {outdoors: "on", followClock: true, night: 0.9}}});
      made.scene = scene;
      const [actor] = await Actor.createDocuments([{name: "WoDX gate: Walker", type: "Mortal", system: {attributes: {perception: {value: 3}}, abilities: {alertness: {value: 2}}}}]);
      made.actors.push(actor);
      const td = (await actor.getTokenDocument({x: 700, y: 500})).toObject();
      [tok] = await scene.createEmbeddedDocuments("Token", [td]);
      await scene.view();
      await sleep(1500);
      await A.weather.set(jdn, {sky: "storm", precip: "none", intensity: null, fog: "thick", wind: "calm", tempNight: 3, tempDay: 7, thunder: false, snowLying: false, leaves: false});
      await A.weather.apply({force: true, quiet: true});
      await sleep(500);
      const now = A.weather.now();
      ok("4 fog by hand", now?.fog === "thick" && now?.set && get("wodx-actions", "sky") === "storm" && scene.weather === "fog",
        {fog: now?.fog, sky: get("wodx-actions", "sky"), sceneWeather: scene.weather, label: now?.label});
    });
    await step("5 own weather kept", async () => {
      await scene.update({weather: "rain", [`flags.${MOD}.effectSet`]: "fog"});
      await A.weather.apply({force: true, quiet: true});
      await sleep(300);
      const kept = scene.weather === "rain";
      await scene.update({weather: "", [`flags.${MOD}.effectSet`]: ""});
      await A.weather.apply({force: true, quiet: true});
      await sleep(300);
      ok("5 own weather kept", kept && scene.weather === "fog", {kept, after: scene.weather});
    });
    await step("6 light", async () => {
      const W = A.rules.W;
      const cal = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
      const lat = Number(get("wodx-chronicle", "latitude")) || 50.1;
      const t = cal.describeTime(game.time.worldTime, lat);
      const want = W.darknessFor({altitude: W.sunAltitude(t.jdn, t.hour + t.minute / 60, lat), moon: t.moon.illumination, sky: "storm", night: 0.9});
      const have = Number(scene.environment?.darknessLevel);
      ok("6 light", Math.abs(have - want) < 0.051, {have, want, time: `${t.dateLabel} ${t.timeLabel}`});
    });
    await step("7 senses", async () => {
      const res = Sn?.answer ? await Sn.answer({user: game.user.id, token: tok.uuid, sense: "sight", closer: false}) : null;
      const sight = res?.sections?.find?.(s => s.sense === "sight") ?? res?.sections?.[0];
      const diffText = JSON.stringify(sight ?? {});
      ok("7 senses", (res?.ctx?.wx ?? []).includes("fog") && /fog/i.test(diffText), {wx: res?.ctx?.wx, diff: sight?.diff ?? null, parts: sight?.parts ?? null});
    });
    await step("8 kit", async () => {
      const kit = A.kit.current();
      const era = game.modules.get("wodx-chronicle").api.eras.activeEra().profile;
      const css = A.kit.grade();
      const grade = get(MOD, "grade");
      ok("8 kit", kit === A.rules.K.kitFor(era) && (grade === "off" ? css === "" : css.length > 5) && document.getElementById("board")?.style.filter === css,
        {kit, era: era?.id, css});
    });
    await step("9 cues", async () => {
      const kit = A.kit.current();
      const chain = A.rules.K.kitChain(kit);
      const shipped = chain.find(k => ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"].includes(k)) ?? "dark-ages";
      const r = await fetch(`modules/${MOD}/sounds/${shipped}/notice.ogg`, {method: "HEAD"});
      let played = false;
      // Playback can wait for a first click (a headless browser never gives one), so only the start of the call is checked
      try { const s = A.kit.cue("notice"); played = s !== null || get(MOD, "cues") === false; Promise.resolve(s).catch(() => null); } catch (e) { played = false; }
      ok("9 cues", r.ok && played, {status: r.status, shipped});
    });
    await step("10 handout", async () => {
      const j = await A.handout({template: "telegram", title: "WoDX gate: To the station master", body: "Come at once.\n\nStop.", from: "L.", date: "3 May 1915"});
      made.journals.push(j);
      const html = j?.pages?.contents?.[0]?.text?.content ?? "";
      ok("10 handout", /wodx-ho-telegram/.test(html) && /TELEGRAM/.test(html) && j.folder?.name === "WoDX handouts", {journal: j?.name});
    });
    await step("11 playlists plan", async () => {
      const n = game.playlists.size;
      const r = await A.kit.build(A.kit.current(), {apply: false});
      ok("11 playlists plan", !!r && game.playlists.size === n && (r.missing || Array.isArray(r.plan)), {missing: r?.missing, plan: r?.plan, folder: r?.folder});
    });
    await step("12 start a chronicle", async () => {
      const year = game.modules.get("wodx-chronicle").api.eras.currentYear();
      const lat = get("wodx-chronicle", "latitude"), region = get("wodx-chronicle", "region");
      const dry = await St.setup.run({year, lines: ["vampire"], dry: true, region, latitude: lat});
      const beforeJ = new Set(game.journal.map(j => j.id)), beforeA = new Set(game.actors.map(a => a.id));
      const first = await St.setup.run({name: "Gate", year, lines: ["vampire"], setDate: false, region, latitude: lat});
      const newJ = game.journal.filter(j => !beforeJ.has(j.id)), newA = game.actors.filter(a => !beforeA.has(a.id));
      made.journals.push(...newJ); made.actors.push(...newA);
      const count = () => game.journal.filter(j => ["screen", "primer"].includes(j.flags?.["wodx-storyteller"]?.template?.kind)).length;
      const c1 = count();
      await St.setup.run({name: "Gate", year, lines: ["vampire"], setDate: false, region, latitude: lat});
      const c2 = count();
      for ( const j of game.journal.filter(j => !beforeJ.has(j.id) && !made.journals.includes(j)) ) made.journals.push(j);
      const screen = game.journal.find(j => j.flags?.["wodx-storyteller"]?.template?.kind === "screen");
      ok("12 start a chronicle", dry?.plan?.length === 5 && !!dry.profile && c1 >= 2 && c1 === c2 && screen?.pages?.size >= 4 && game.time.worldTime === keep.time,
        {plan: dry?.plan?.map(p => `${p.key}:${p.action}`), era: dry?.profile?.id, made: first?.done, journals: c1, again: c2});
    });
    await step("13 no errors", async () => {
      const on = ["wodx-chronicle", "wodx-actions", "wodx-npc", "wodx-interactables", "wodx-senses", "wodx-storyteller", MOD].filter(id => game.modules.get(id)?.active);
      ok("13 no errors", errors.length === 0, {errors: errors.slice(0, 5), on});
    });
  } finally {
    await step("14 clean up", async () => {
      await game.settings.set(MOD, "overrides", keep.overrides);
      await game.settings.set(MOD, "applied", keep.applied);
      await game.settings.set("wodx-storyteller", "setup", keep.setup);
      if ( keep.region !== undefined && get("wodx-chronicle", "region") !== keep.region ) await game.settings.set("wodx-chronicle", "region", keep.region);
      if ( keep.latitude !== undefined && get("wodx-chronicle", "latitude") !== keep.latitude ) await game.settings.set("wodx-chronicle", "latitude", keep.latitude);
      if ( keep.sky !== undefined ) await game.settings.set("wodx-actions", "sky", keep.sky);
      for ( const j of made.journals ) await j?.delete?.().catch(() => null);
      for ( const a of made.actors ) await a?.delete?.().catch(() => null);
      const hf = game.folders.find(f => f.type === "JournalEntry" && f.name === "WoDX handouts" && !f.contents?.length);
      await hf?.delete?.().catch(() => null);
      const cf = game.folders.find(f => f.type === "JournalEntry" && f.name === "WoDX chronicle" && !f.contents?.length);
      await cf?.delete?.().catch(() => null);
      const msgs = game.messages.filter(m => !made.firstMsg.has(m.id) && (m.flags?.[MOD] || m.flags?.["wodx-senses"]));
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      if ( before && before.id !== made.scene?.id ) await before.view();
      await made.scene?.delete?.().catch(() => null);
      ok("14 clean up", !game.scenes.find(s => s.name === "WoDX gate: Weather street"), {});
    });
    window.removeEventListener("error", onErr);
    window.removeEventListener("unhandledrejection", onErr);
  }
  return save(R, "gate8-result.json");
}
