/**
 * Feeding gate (WoDX Actions 3.41.0 or later, Creation 0.10.2), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefeed.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Feeding", vampires and mortals with tokens (the mortals unlinked, as NPCs are);
 * views the scene, then goes back and deletes everything it made (scene, tokens, actors, chat cards). The clock is
 * not moved.
 *   1. the api: version, feedingRules, feedUndo
 *   2. a Toreador drinks 2 from an unlinked mortal: blood +2, the token's actor 2 lethal and 8 blood left
 *   3. Undo on that card: the vessel's health and blood as before
 *   4. a Ventrue with the palate "merchant": a passer-by tagged merchant ticks the box and feeds; a carter doesn't
 *   5. a Giovanni Kiss: two lethal levels a point
 *   6. a Nagaraja eats two flesh points: blood, lethal on the vessel, the flesh debt paid
 *   7. Hunt: the usual hunt is saved and a narrow palate adds +2
 *   8. every other WoDX module still answers
 * The Nagaraja starts on 7 blood so that a new sheet's Self-Control of 0 brings no hunger roll (a failed one gorges).
 * The palate check reads "palate allows", which both the V20 and the Dark Ages wording have.
 * Result: Data/wodx-gate/gatefeed-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

/** Answer the next Actions window: fill the fields, note what was there, press OK. */
function answer(vals = {}, seen = {}) {
  return new Promise(resolve => {
    const id = Hooks.on("renderDialogV2", (app, el) => {
      const root = el?.querySelector ? el : app.element;
      if ( !root?.querySelector?.("form") ) return;
      Hooks.off("renderDialogV2", id);
      for ( const f of root.querySelectorAll("input, select") ) if ( f.name ) seen[f.name] = f.type === "checkbox" ? f.checked : f.value;
      for ( const [k, v] of Object.entries(vals) ) {
        const f = root.querySelector(`[name=${k}]`);
        if ( !f ) continue;
        if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
      }
      setTimeout(() => { root.querySelector("button[data-action=ok]")?.click(); resolve(seen); }, 50);
    });
  });
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const A = () => game.wodxActions;
  const t0 = Date.now();
  const M = "wodx-actions";
  let scene, actors = [];
  const vamp = (name, clan, custom = "", blood = 8) => ({name, type: "Vampire", system: {clan, custom: {clan: custom}, generation: 12, advantages: {bloodpool: {temporary: blood}}}});
  try {
    scene = await Scene.create({name: "WoDX gate: Feeding", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await createActors([vamp("WoDX gate: Toreador", "toreador"), vamp("WoDX gate: Ventrue", "ventrue"), vamp("WoDX gate: Giovanni", "giovanni"),
      vamp("WoDX gate: Nagaraja", "custom", "Nagaraja", 7),
      {name: "WoDX gate: Vessel", type: "Mortal"}, {name: "WoDX gate: Merchant", type: "Mortal"}, {name: "WoDX gate: Carter", type: "Mortal"}, {name: "WoDX gate: Body", type: "Mortal"}]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    // kept, so WoDX NPC's street (0.27.0) does not clear them from a scene with no crowd while the gate runs
    const pb = tags => ({"wodx-npc": {passerby: {kind: tags[0], tags, kept: true, keptAt: Date.now(), why: "held"}}});
    await scene.createEmbeddedDocuments("Token", [
      {name: "vessel", actorId: by("Vessel").id, x: G * 5, y: G * 5},
      {name: "merchant", actorId: by("Merchant").id, x: G * 7, y: G * 5, flags: pb(["merchant", "tradesperson", "man", "adult"])},
      {name: "carter", actorId: by("Carter").id, x: G * 9, y: G * 5, flags: pb(["carter", "labourer", "man", "adult"])},
      {name: "body", actorId: by("Body").id, x: G * 11, y: G * 5}]);
    const tok = n => scene.tokens.find(t => t.name === n);
    await until(() => ["vessel", "merchant", "carter", "body"].every(n => tok(n)?.object));
    const lethal = a => Number(a.system?.health?.damage?.lethal) || 0;
    const bp = a => Number(game.actors.get(a.id).system.advantages.bloodpool.temporary) || 0;
    const lastMsg = () => game.messages.contents.filter(m => m.timestamp >= t0).at(-1);

    await step("1 the api", async () => {
      ok("1 the api", atLeast(A()?.version, "3.41.0") && typeof A()?.feedUndo === "function" && !!A()?.feedingRules?.CLAN_FEEDING?.ventrue, {version: A()?.version});
    });
    await step("2 feed on an unlinked mortal", async () => {
      const k = by("Toreador"), before = bp(k);
      const p = answer({take: 2});
      await A().feed({actor: k, vessel: tok("vessel").object});
      await p; await sleep(500);
      const va = tok("vessel").actor;
      ok("2 feed on an unlinked mortal", bp(k) === before + 2 && lethal(va) === 2 && va.flags?.[M]?.vesselBlood?.value === 8 && lethal(by("Vessel")) === 0,
        {blood: [before, bp(k)], lethal: lethal(va), vesselBlood: va.flags?.[M]?.vesselBlood, worldActor: lethal(by("Vessel"))});
    });
    await step("3 undo", async () => {
      await A().feedUndo(lastMsg());
      await sleep(400);
      const va = tok("vessel").actor;
      ok("3 undo", lethal(va) === 0 && !va.flags?.[M]?.vesselBlood, {lethal: lethal(va), vesselBlood: va.flags?.[M]?.vesselBlood ?? null});
    });
    await step("4 Ventrue palate", async () => {
      const v = by("Ventrue");
      await v.setFlag(M, "palate", {text: "merchants", tags: ["merchant"], breadth: "broad"});
      const s1 = {}, b0 = bp(v);
      let p = answer({take: 2}, s1);
      await A().feed({actor: v, vessel: tok("merchant").object});
      await p; await sleep(500);
      const b1 = bp(v), s2 = {};
      p = answer({take: 2}, s2);
      await A().feed({actor: v, vessel: tok("carter").object});
      await p; await sleep(500);
      const b2 = bp(v);
      ok("4 Ventrue palate", s1.fits === true && s2.fits === false && b1 === b0 + 2 && b2 === b1 && /palate allows/.test(lastMsg()?.content ?? ""),
        {fits: [s1.fits, s2.fits], blood: [b0, b1, b2], tags: s1.vtags});
    });
    await step("5 Giovanni", async () => {
      const g = by("Giovanni");
      const p = answer({take: 1});
      await A().feed({actor: g, vessel: tok("merchant").object});
      await p; await sleep(500);
      ok("5 Giovanni", lethal(tok("merchant").actor) === 2 + 2, {lethal: lethal(tok("merchant").actor)});
    });
    await step("6 Nagaraja flesh", async () => {
      const n = by("Nagaraja");
      await n.setFlag(M, "nagaraja", {debt: 2});
      const b0 = bp(n);
      const p = answer({take: 1, flesh: 2});
      await A().feed({actor: n, vessel: tok("body").object});
      await p; await sleep(500);
      const ba = tok("body").actor;
      ok("6 Nagaraja flesh", bp(n) === b0 + 3 && lethal(ba) === 3 && game.actors.get(n.id).flags?.[M]?.nagaraja?.debt === 0 && ba.flags?.[M]?.fleshTaken === 2,
        {blood: [b0, bp(n)], lethal: lethal(ba), nagaraja: game.actors.get(n.id).flags?.[M]?.nagaraja, flesh: ba.flags?.[M]?.fleshTaken});
    });
    await step("7 hunt habit and palate", async () => {
      const v = by("Ventrue");
      await v.setFlag(M, "palate", {text: "younger sisters", tags: ["younger sister"], breadth: "narrow"});
      const seen = {};
      const p = answer({style: "rake", hours: 1, take: 1}, seen);
      await A().hunt({actor: v});
      await p; await sleep(500);
      ok("7 hunt habit and palate", Number(seen.palateDiff) === 2 && game.actors.get(v.id).flags?.[M]?.huntStyle === "rake" && /palate \+2/.test(lastMsg()?.content ?? ""),
        {palateDiff: seen.palateDiff, style: game.actors.get(v.id).flags?.[M]?.huntStyle});
    });
    await step("8 other modules", async () => {
      const off = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-library"].includes(m.id)).map(m => m.id);
      ok("8 other modules", !!game.wodxCombat && !!game.modules.get("wodx-chronicle")?.api && off.length === 0, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatefeed-result.json");
}
