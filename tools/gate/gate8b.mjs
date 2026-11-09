/**
 * Phase 8, second half: the night's draw and the story aids (Storyteller 0.5.0), Otherworld journeys and the
 * Shadowlands' decay (Otherworlds 0.3.0), token frames (Atmosphere 0.2.0).
 * In Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gate8b.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * The clock never moves. It makes one scene ("WoDX gate: Frames") and one actor, sends draws through the approval
 * queue and approves them, then puts back the queue, the tracker's log, the counters and the frame setting, and
 * deletes everything it made (journals it made, or only its pages in journals already there; its chat cards).
 *   1. the modules and their APIs
 *   2. the tables are in the world as Roll Tables (folder WoDX tables)
 *   3. the same seed gives the same night twice; another draw differs
 *   4. the night through the queue: approved, it is in the log and the nights journal
 *   5. a dream for a character through the queue: whispered to its owners and kept in the story aids journal
 *   6. a relic has a suggested rating
 *   7. an Otherworld journey: seeded, through the queue, a card for the Storyteller
 *   8. a road with no encounter table draws from WoDX's own
 *   9. the Shadowlands' decay joins the era grade on the map
 *  10. a token frame in the era's material
 *  11. nothing threw
 *  12. clean up
 * Result: Data/wodx-gate/gate8b-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ST = "wodx-storyteller", OW = "wodx-otherworlds", AT = "wodx-atmosphere", CH = "wodx-chronicle";

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
const clone = v => foundry.utils.deepClone(v);

export async function run() {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const C = game.modules.get(CH)?.api, S = game.modules.get(ST)?.api, O = game.modules.get(OW)?.api, A = game.modules.get(AT)?.api;
  const before = canvas.scene;
  const keep = {approvals: clone(get(CH, "approvals") ?? {pending: [], history: []}), log: clone(get(ST, "log")), aidCount: get(ST, "aidCount"),
    journeyCount: get(OW, "journeyCount"), frames: get(AT, "frames"), time: game.time.worldTime,
    journals: new Set(game.journal.map(j => j.id)), pages: new Map(game.journal.map(j => [j.id, new Set(j.pages.map(p => p.id))])), msgs: new Set(game.messages.map(m => m.id))};
  const made = {actors: [], scene: null};
  const errors = [];
  const onErr = ev => errors.push(String(ev?.message ?? ev?.reason ?? ev));
  window.addEventListener("error", onErr);
  window.addEventListener("unhandledrejection", onErr);
  const pendingOf = key => (get(CH, "approvals")?.pending ?? []).find(p => p.key === key);
  const approve = async key => { const p = pendingOf(key); if ( !p ) return false; await C.approvals.decide(p.id, "approve"); await sleep(300); return true; };
  let actor = null;
  try {
    await step("1 modules", async () => {
      const m = id => game.modules.get(id);
      ok("1 modules", m(ST)?.active && newer(m(ST).version, "0.5.0") && !!S?.night?.draw && !!S?.aid?.draw && m(OW)?.active && newer(m(OW).version, "0.3.0") && !!O?.journey?.draw
        && m(AT)?.active && newer(m(AT).version, "0.2.0") && !!A?.kit?.frame && !!C?.approvals?.decide,
        {storyteller: m(ST)?.version, otherworlds: m(OW)?.version, atmosphere: m(AT)?.version});
    });
    await step("2 tables", async () => {
      await C.gen.installTables();
      const ids = ["night.encounter.town", "night.rumour", "aid.dream", "journey.tempest.hazard"];
      const have = ids.map(id => game.tables.filter(t => t.flags?.[CH]?.table?.id === id).length);
      const folder = game.folders.find(f => f.type === "RollTable" && f.name === "WoDX tables");
      ok("2 tables", have.every(n => n >= 1) && !!folder, {have});
    });
    let night = null;
    await step("3 seeded night", async () => {
      const a = await S.night.draw({nonce: 0}), b = await S.night.draw({nonce: 0});
      let differs = false;
      for ( let n = 1; n < 6 && !differs; n++ ) differs = JSON.stringify((await S.night.draw({nonce: n})).encounters) !== JSON.stringify(a.encounters);
      night = a;
      ok("3 seeded night", JSON.stringify(a) === JSON.stringify(b) && differs && a.encounters.length >= 2 && !!a.rumour && !/\{/.test(a.rumour),
        {jdn: a?.jdn, part: a?.part, layers: S.night.layers(), opening: a?.opening, first: a?.encounters?.[0]?.text, rumour: a?.rumour});
    });
    await step("4 night through the queue", async () => {
      await S.night.propose(night);
      const key = `night:${night.jdn}:${night.nonce}`;
      const queued = !!pendingOf(key);
      const done = await approve(key);
      const j = game.journal.find(x => x.flags?.[ST]?.drawn === "nights");
      const inLog = (S.entries() ?? []).some(e => /The night's draw/.test(e.text ?? ""));
      ok("4 night through the queue", queued && done && !!j && j.pages.size >= 1 && inLog, {queued, journal: j?.name, inLog});
    });
    await step("5 a dream", async () => {
      [actor] = await Actor.createDocuments([{name: "WoDX gate: Dreamer", type: "Mortal", ownership: {default: 0}}]);
      made.actors.push(actor);
      const a = await S.aid.draw({kind: "dream", actorId: actor.id});
      await S.aid.propose(a);
      const done = await approve(`aid:dream:${actor.id}:${a.count}:${a.nonce}`);
      const msg = game.messages.find(m => !keep.msgs.has(m.id) && m.flags?.[ST]?.aid === "dream");
      const j = game.journal.find(x => x.flags?.[ST]?.drawn === "aids");
      ok("5 a dream", done && !!msg && msg.whisper?.length >= 1 && !!j && /Dreamer|dream/i.test(a.text + a.label) && !/\{/.test(a.text), {text: a.text});
    });
    await step("6 a relic", async () => {
      const a = await S.aid.draw({kind: "relic", actorId: null});
      ok("6 a relic", a?.rating >= 1 && a.rating <= 5 && a.ratingLabel === "Faith potential" && !!a.text, {text: a?.text, rating: a?.rating});
    });
    await step("7 journey", async () => {
      const a = O.journey.draw({realm: "tempest", hours: 6}), b = O.journey.draw({realm: "tempest", hours: 6});
      await O.journey.propose(a);
      const done = await approve(`journey:${a.count}:tempest:0`);
      const msg = game.messages.find(m => !keep.msgs.has(m.id) && m.flags?.[OW]?.journey === a.count);
      ok("7 journey", JSON.stringify(a.legs) === JSON.stringify(b.legs) && a.legs.length === 3 && done && !!msg, {legs: a.legs.length, hazards: a.hazards, maelstroms: a.maelstroms, great: a.great});
    });
    await step("8 road", async () => {
      const t = S.night.road({key: "gate8b"});
      ok("8 road", typeof t === "string" && t.length > 10 && !/\{/.test(t), {text: t});
    });
    await step("9 decay joins the grade", async () => {
      const orig = O.decayCss;
      O.decayCss = () => "grayscale(0.5)";
      let css = "";
      try { css = A.kit.grade(); } finally { O.decayCss = orig; }
      const board = document.getElementById("board")?.style.filter ?? "";
      const back = A.kit.grade();
      const gradeOff = get(AT, "grade") === "off";
      ok("9 decay joins the grade", /grayscale\(0\.5\)/.test(css) && /grayscale\(0\.5\)/.test(board) && (gradeOff || /saturate/.test(css)) && !/grayscale\(0\.5\)/.test(back),
        {css, back, own: O.journey.rules.decayCss(5)});
    });
    await step("10 token frame", async () => {
      await game.settings.set(AT, "frames", "all");
      made.scene = await Scene.create({name: "WoDX gate: Frames", width: 1200, height: 900, grid: {size: 100}});
      const td = (await actor.getTokenDocument({x: 400, y: 400})).toObject();
      await made.scene.createEmbeddedDocuments("Token", [td]);
      await made.scene.view();
      await sleep(1500);
      const tok = canvas.tokens.placeables.find(t => t.document.actorId === actor.id);
      tok?.renderFlags?.set?.({refresh: true});
      await sleep(300);
      const frame = tok?.children?.find?.(c => c.name === "wodxFrame");
      const f = A.kit.frameFor();
      ok("10 token frame", !!frame && !!f?.label, {kit: f?.kit, frame: f?.label, shape: f?.shape});
    });
    await step("11 no errors", async () => { ok("11 no errors", errors.length === 0, {errors: errors.slice(0, 5)}); });
  } finally {
    await step("12 clean up", async () => {
      if ( keep.frames !== undefined ) await game.settings.set(AT, "frames", keep.frames);
      if ( before && before.id !== made.scene?.id ) await before.view();
      await made.scene?.delete?.().catch(() => null);
      for ( const a of made.actors ) await a?.delete?.().catch(() => null);
      for ( const j of game.journal.filter(j => !keep.journals.has(j.id) && j.flags?.[ST]?.drawn) ) await j.delete().catch(() => null);
      for ( const j of game.journal.filter(j => keep.journals.has(j.id) && j.flags?.[ST]?.drawn) ) {
        const old = keep.pages.get(j.id) ?? new Set();
        const extra = j.pages.filter(p => !old.has(p.id)).map(p => p.id);
        if ( extra.length ) await j.deleteEmbeddedDocuments("JournalEntryPage", extra);
      }
      const msgs = game.messages.filter(m => !keep.msgs.has(m.id) && (m.flags?.[ST] || m.flags?.[OW] || m.flags?.[CH]));
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      await game.settings.set(CH, "approvals", keep.approvals);
      if ( keep.log !== undefined ) await game.settings.set(ST, "log", keep.log);
      if ( keep.aidCount !== undefined ) await game.settings.set(ST, "aidCount", keep.aidCount);
      if ( keep.journeyCount !== undefined ) await game.settings.set(OW, "journeyCount", keep.journeyCount);
      ok("12 clean up", !game.scenes.find(s => s.name === "WoDX gate: Frames") && !game.actors.find(a => a.name === "WoDX gate: Dreamer") && game.time.worldTime === keep.time, {});
    });
    window.removeEventListener("error", onErr);
    window.removeEventListener("unhandledrejection", onErr);
  }
  return save(R, "gate8b-result.json");
}
