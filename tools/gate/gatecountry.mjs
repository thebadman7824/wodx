/**
 * Country map gate (WoDX Storyteller 0.46.0, windows as of 0.47.1), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecountry.mjs?${Date.now()}`)).run()
 * Makes four scenes "WoDX gate: Map A" to "Map D", a mortal and a vampire traveller; deletes all of it after and puts
 * back the log, personal times, the approval queue and the encounter settings as they were. The clock does not move.
 * A window that does not close within 15 seconds is closed and its step fails, so the tidy-up at the end always runs.
 *   1. versions and api
 *   2. two places on the country map: the trip goes by the map, in legs, with km
 *   3. hand-typed minutes still win, and a place off the map keeps the older sum
 *   4. pace and lodging: forced is faster and costs a roll, a long trip has nights and an inn costs money
 *   5. those the sun burns: day shelter in towns, arrival in the dark, nothing left to ask
 *   6. a paid ride with an empty purse is refused with the price, and nothing moves
 *   7. a real trip on foot: the token moves, personal time moves by the plan, the log names the way
 *   8. an encounter on the way says what ground it is on
 *   9. the Travel places window saves a place's town and offset; the Out on your own window shows pace and nights
 *  10. every other WoDX module still answers
 * Result: Data/wodx-gate/gatecountry-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
/** Wait for a window's promise, but never for ever: a window nobody closed is closed here and the step fails. */
async function within(promise, ms, what) {
  let timer;
  const late = new Promise(r => { timer = setTimeout(() => r("__late__"), ms); });
  const got = await Promise.race([promise.then(v => v, e => { throw e; }), late]);
  clearTimeout(timer);
  if ( got !== "__late__" ) return got;
  for ( const el of document.querySelectorAll("dialog.application, .application.dialog, .window-app.dialog") ) {
    const b = el.querySelector('button[data-action="cancel"]') ?? el.querySelector('button[data-action="close"]');
    if ( b ) b.click();
  }
  throw new Error(`${what} did not close within ${ms / 1000} seconds`);
}
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const st = () => game.modules.get(MOD)?.api;
  const chron = () => game.modules.get("wodx-chronicle")?.api;
  const KEYS = ["log", "personal", "encounters", "encounterChance"];
  const keep = {settings: Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))])),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals")), messages: new Set(game.messages.map(m => m.id))};
  const scenes = [], actors = [];
  try {
    await game.settings.set(MOD, "encounters", false);
    const names = ["Map A", "Map B", "Map C", "Map D"].map(n => `WoDX gate: ${n}`);
    const made0 = await Scene.create(names.map(name => ({name, width: 1000, height: 1000, padding: 0})));
    const [A, B, Cc, Dd] = names.map(n => made0.find(x => x.name === n));
    scenes.push(A, B, Cc, Dd);
    const [mortal, vampire] = await createActors([{name: "WoDX gate: Wayfarer", type: "Mortal"}, {name: "WoDX gate: Night wayfarer", type: "Vampire"}]);
    actors.push(mortal, vampire);
    await A.createEmbeddedDocuments("Token", [mortal, vampire].map((a, i) => ({name: a.name, actorId: a.id, x: 100 * (i + 1), y: 100})));
    await st().setTravel(A, {on: true, at: {town: "brno"}});
    await st().setTravel(B, {on: true, at: {town: "olomouc"}});
    await st().setTravel(Cc, {on: true, at: {town: "krakow"}});
    await st().setTravel(Dd, {on: true, at: {town: "brno", km: 12, dir: "N"}});
    const ctx = st().tripContext(st().personalTime(mortal.id));
    R.notes.push({year: ctx.year, night: ctx.night});

    await step("1. versions and api", async () => {
      const v = game.modules.get(MOD)?.version, c = st().country;
      ok("1. versions and api", !foundry.utils.isNewerVersion("0.46.0", v) && typeof c?.countryTrip === "function" && typeof c?.schedule === "function" && typeof c?.landAt === "function", {version: v});
    });
    await step("2. a trip by the map", async () => {
      const p = st().planTrip(mortal, B.id, {mode: "foot"});
      ok("2. a trip by the map", p?.trip?.by === "map" && p.trip.mode === "foot" && p.trip.km > 60 && p.trip.km < 110 && p.trip.legs.length >= 2 && !!p.sched,
        {by: p?.trip?.by, km: p?.trip?.km, legs: p?.trip?.legs?.length, words: st().tripWords(p)});
    });
    await step("3. typed minutes win", async () => {
      await st().setTravel(B, {on: true, at: {town: "olomouc"}, minutes: 45});
      const typed = st().planTrip(mortal, B.id);
      await st().setTravel(B, {on: true, at: {town: "olomouc"}});
      await st().setTravel(A, {on: true});
      const off = st().planTrip(mortal, B.id);
      await st().setTravel(A, {on: true, at: {town: "brno"}});
      ok("3. typed minutes win, and off the map the older sum stands", typed?.trip?.by === "place" && typed.minutes === 45 && !typed.sched && off?.trip?.by === "default", {typed: typed?.trip?.by, off: off?.trip?.by});
    });
    await step("4. pace and lodging", async () => {
      const steady = st().planTrip(mortal, Cc.id, {mode: "foot"}), forced = st().planTrip(mortal, Cc.id, {mode: "foot", pace: "forced"}), camp = st().planTrip(mortal, Cc.id, {mode: "foot", lodging: "camp"});
      ok("4. pace and lodging", steady.sched.nights >= 3 && steady.sched.cost > 0 && forced.minutes < steady.minutes && forced.sched.toll >= 1 && camp.sched.cost === 0 && camp.sched.enc > steady.sched.enc,
        {nights: steady.sched.nights, cost: steady.sched.cost, steady: steady.minutes, forced: forced.minutes, words: st().tripWords(steady)});
    });
    await step("5. those the sun burns", async () => {
      const p = st().planTrip(vampire, B.id, {mode: "horse"});
      const s = p.sched;
      ok("5. day shelter for those the sun burns", !!s && !s.exposed && s.stops.every(x => x.why === "day shelter") && !p.ask, {stops: s?.stops?.map(x => x.at), ask: p.ask, words: st().tripWords(p)});
    });
    await step("6. a paid ride with an empty purse", async () => {
      const before = st().personalTime(mortal.id);
      const r = await st().travel({actorId: mortal.id, destId: B.id, mode: "hire:coach"});
      const p = st().planTrip(mortal, B.id, {mode: "hire:coach"});
      const hired = p.trip.hired;
      ok("6. a paid ride with an empty purse is refused", hired ? (r.ok === false && /costs/.test(r.why ?? "") && st().personalTime(mortal.id) === before && A.tokens.some(t => t.actorId === mortal.id)) : true,
        {hired, mode: p.trip.mode, why: r.why, note: hired ? null : "no hired cart or coach runs in this year, so nothing to refuse"});
    });
    let start = 0;
    await step("7. a real trip on foot", async () => {
      await game.settings.set(MOD, "encounters", true);
      await game.settings.set(MOD, "encounterChance", 100);
      const plan = st().planTrip(mortal, Dd.id, {mode: "foot", lodging: "camp"});
      start = Date.now();
      const before = st().personalTime(mortal.id);
      const r = await st().travel({actorId: mortal.id, destId: Dd.id, mode: "foot", lodging: "camp", approved: true});
      await sleep(400);
      const moved = Dd.tokens.some(t => t.actorId === mortal.id), dt = st().personalTime(mortal.id) - before;
      const entry = st().entries().filter(e => e.actor === mortal.id && e.kind === "travel").pop();
      ok("7. a real trip on foot", r.ok && moved && dt === plan.minutes * 60 && /The way: /.test(entry?.text ?? ""), {moved, dt, minutes: plan.minutes, text: entry?.text});
    });
    await step("8. an encounter knows its ground", async () => {
      const q = chron().approvals.pending().filter(p => p.type === `${MOD}.encounter` && p.createdAt >= start)[0];
      ok("8. an encounter on the way says what ground it is on", !!q && / between /.test(q.detail ?? "") && q.data?.land !== undefined, {detail: q?.detail, land: q?.data?.land});
      if ( q ) await chron().approvals.decide(q.id, "reject");
      await game.settings.set(MOD, "encounters", false);
    });
    await step("9. the windows", async () => {
      const A2 = game.modules.get(MOD).api;
      const pr = A2.placesDialog();
      pr.catch(() => {});
      await sleep(700);
      // 0.47.1: Near is a typed field over one shared list of towns
      const near = document.querySelector(`input[name="near.${B.id}"]`), off = document.querySelector(`input[name="off.${Dd.id}"]`);
      const list = document.getElementById("wstory-towns");
      const shown = near?.value === "Olomouc" && near?.getAttribute("list") === "wstory-towns" && (list?.options.length ?? 0) > 50 && off?.value === "12 N";
      if ( off ) off.value = "15 SE";
      const nearC = document.querySelector(`input[name="near.${Cc.id}"]`);
      if ( nearC ) nearC.value = "krakow";                       // typed without its marks: still found
      const saveBtn = (near ?? off)?.closest(".application, .window-app, dialog")?.querySelector('button[data-action="save"]');
      if ( !saveBtn ) throw new Error("the Travel places window has no Near field or no Save button");
      saveBtn.click();
      await within(pr, 15000, "Travel places"); await sleep(400);
      const at = Dd.flags?.[MOD]?.travel?.at;
      const po = A2.openOnYourOwn(mortal.id);
      po.catch(() => {});
      await sleep(700);
      const pace = document.querySelector('select[name="pace"]'), lodging = document.querySelector('select[name="lodging"]');
      const both = pace?.options.length === 3 && lodging?.options.length === 2;
      pace?.closest(".application, .window-app, dialog")?.querySelector('button[data-action="cancel"]')?.click();
      await within(po, 15000, "Out on your own");
      const atC = Cc.flags?.[MOD]?.travel?.at;
      ok("9. the windows show and save the map fields", shown && at?.km === 15 && at?.dir === "SE" && atC?.town === "krakow" && both, {shown, at, atC, both});
    });
    await step("10. other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-atmosphere", "wodx-library", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("10. other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    // Each part of the tidy-up by itself, so one failure leaves nothing else behind
    const tidy = async (what, fn) => { try { await fn(); } catch (e) { R.errors.push(`cleanup (${what}): ${e.message}`); } };
    for ( const s of scenes ) await tidy("scene", async () => { if ( s && game.scenes.get(s.id) ) await s.delete(); });
    for ( const x of actors ) await tidy("actor", async () => { if ( x ) await game.actors.get(x.id)?.delete(); });
    for ( const k of KEYS ) await tidy(k, () => game.settings.set(MOD, k, keep.settings[k]));
    await tidy("approvals", () => game.settings.set("wodx-chronicle", "approvals", keep.approvals));
    await tidy("messages", async () => { for ( const m of game.messages.filter(m => !keep.messages.has(m.id)) ) await m.delete(); });
  }
  return save(R, "gatecountry-result.json");
}
