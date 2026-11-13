/**
 * Mage, Wraith and Changeling notes gaps gate (B3550-B3556), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemwc.mjs?${Date.now()}`)).run()
 * Makes its own actors and a scene, and puts the actors, the scene and the chat cards back.
 *   1. the api: the Quiet, soulforging, everyday Banality, oboli and the soulforge task kind
 *   2. the Quiet: brought on, its level from the Paradox pool, a vision whispered only to the player
 *   3. the Quiet ends: out of a mindscape the pool clears and the state with it
 *   4. a token marked for one player still shows on the Storyteller's screen
 *   5. soulforging: a finished task makes a soulsteel sword
 *   6. soulforging: a finished obolus goes to the purse as the Underworld's money
 *   7. everyday Banality: weeks of a long task in an office count, and the card or the count follows
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatemwc-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const MOD = "wodx-actions", A = () => game.modules.get(MOD)?.api, ST = () => game.modules.get("wodx-storyteller")?.api;
  const t0 = Date.now(), made = [];
  let scene = null;
  try {
    const player = game.users.find(u => !u.isGM);
    const own = player ? {ownership: {default: 0, [player.id]: 3}} : {};
    const [mage, wraith, fae] = await createActors([
      {name: "WoDX gate: Quiet mage", type: "Mage", ...own, system: {paradox: {temporary: 7, permanent: 0}}},
      {name: "WoDX gate: smith", type: "Wraith"},
      {name: "WoDX gate: clerk's changeling", type: "Changeling", ...own}]);
    made.push(mage, wraith, fae);
    if ( !player ) R.notes.push("No player user: step 2 checks the card without a recipient.");

    await step("1 api", async () => {
      const a = A();
      ok("1 api", typeof a?.m20Quiet === "function" && typeof a?.quiet?.act === "function" && typeof a?.soulforge === "function" && typeof a?.everydayBanality?.endScene === "function"
        && typeof ST()?.money?.receiveForeign === "function" && !!ST()?.tasks?.rules?.KINDS?.soulforge && ST()?.money?.rules?.moneyFor?.(1600, "underworld")?.id === "oboli", {version: game.modules.get(MOD)?.version});
    });
    await step("2 Quiet on", async () => {
      await A().quiet.act(mage, {mode: "fall", type: "madness", cause: "backlash"});
      await until(() => A().quiet.state(game.actors.get(mage.id))?.type === "madness");
      const st = A().quiet.state(game.actors.get(mage.id)), lv = A().quiet.rules.levelOf(7).level;
      let vision = true;
      if ( player ) {
        await A().quiet.act(game.actors.get(mage.id), {mode: "vision", text: "A phone rings in an empty room."});
        await until(() => game.messages.contents.some(m => m.timestamp >= t0 && m.flags?.[MOD]?.quiet === "vision"));
        const m = game.messages.contents.find(x => x.timestamp >= t0 && x.flags?.[MOD]?.quiet === "vision");
        vision = !!m && m.whisper.length === 1 && m.whisper[0] === player.id;
      }
      ok("2 Quiet on", st?.type === "madness" && lv === 3 && vision, {st, lv, vision});
    });
    await step("3 Quiet ends", async () => {
      await A().quiet.act(game.actors.get(mage.id), {mode: "mindscape"});
      await A().quiet.act(game.actors.get(mage.id), {mode: "out"});
      await until(() => !A().quiet.state(game.actors.get(mage.id)));
      const a = game.actors.get(mage.id);
      ok("3 Quiet ends", !A().quiet.state(a) && Number(a.system?.paradox?.temporary) === 0, {paradox: a.system?.paradox?.temporary});
    });
    await step("4 token hook", async () => {
      // The Storyteller always sees a token marked for one player; the hook only hides it on other players' screens
      const fake = {document: {getFlag: () => ["someone-else"]}, visible: true, mesh: {visible: true}};
      A().quiet.onRefreshToken(fake);
      ok("4 token hook", game.user.isGM && fake.visible === true && fake.mesh.visible === true, {});
    });
    await step("5 soulsteel sword", async () => {
      const w = game.actors.get(wraith.id);
      await w.setFlag(MOD, "soulforge", {gate1: {product: "sword", source: "soul", year: 1600}});
      Hooks.callAll("wodxTaskDone", {actor: w, task: {id: "gate1", kind: "soulforge", status: "done", name: "Soulforge: sword"}});
      await until(() => game.actors.get(wraith.id).items.some(i => i.name === "Soulsteel sword"));
      const it = game.actors.get(wraith.id).items.find(i => i.name === "Soulsteel sword");
      ok("5 soulsteel sword", it?.type === "Melee Weapon" && it.system?.damage?.bonus === 2 && !game.actors.get(wraith.id).getFlag(MOD, "soulforge")?.gate1, {type: it?.type});
    });
    await step("6 obolus to the purse", async () => {
      const w = game.actors.get(wraith.id);
      await w.setFlag(MOD, "soulforge", {gate2: {product: "obolus", source: "soul", year: 1600}});
      Hooks.callAll("wodxTaskDone", {actor: w, task: {id: "gate2", kind: "soulforge", status: "done", name: "Soulforge: obolus"}});
      const has = () => (ST().money.foreign?.(game.actors.get(wraith.id)) ?? []).some(f => f.id === "oboli" && f.amount === 32) || game.actors.get(wraith.id).items.some(i => /obolus/.test(i.name));
      await until(has);
      ok("6 obolus to the purse", has(), {foreign: ST().money.foreign?.(game.actors.get(wraith.id))});
    });
    await step("7 everyday Banality", async () => {
      [scene] = await Scene.create([{name: "WoDX gate: counting house", flags: {"wodx-npc": {place: {kind: "office"}}}}]);
      const f = game.actors.get(fae.id);
      Hooks.callAll("wodxTaskDone", {actor: f, task: {id: "gate3", kind: "research", status: "done", name: "Ledgers", scene: scene.id, started: 0, next: 21 * 86400}});
      const seen = () => (Number(game.actors.get(fae.id).getFlag(MOD, "banalLife")?.tally) || 0) > 0
        || game.messages.contents.some(m => m.timestamp >= t0 && (m.flags?.[MOD]?.banalLife || m.content?.includes("the grey")));
      await until(seen);
      ok("7 everyday Banality", seen(), {tally: game.actors.get(fae.id).getFlag(MOD, "banalLife")});
    });
    await step("8 other modules", async () => {
      const mods = ["wodx-chronicle", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-interactables"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("8 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of made ) await game.actors.get(x?.id)?.delete();
      if ( scene ) await game.scenes.get(scene.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatemwc-result.json");
}
