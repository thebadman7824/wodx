/**
 * The Lone Chronicle, first step (WoDX Solo 0.1.2 or later), rothenstein-wodx only. It runs in two browsers, so the
 * Storyteller's seat and the player are both real: tools/harness/gate-two.mjs drives it.
 *   node tools/harness/gate-two.mjs gatesolo
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test, the seat): makes the Player Test user if missing, a scene, a character it owns and a
 *            hostile stranger, and checks:
 *     1. the module and its API
 *     2. the switch: every setting on the preset list takes its value, and every kind of approval is given on sight
 *     3. a card with Accept, whispered to the Storyteller, is pressed by the seat and logged
 *     4. a card with only Undo is left alone; a card with two unknown choices is logged and not pressed
 *     5. a window that opens on the seat is answered and logged
 *     6. a player's request left in the approval queue is logged as waiting
 *   "player" (Player Test):
 *     7. a player: the mode is on, and the seat's log is not handed out
 *     8. the seat follows the player to the scene
 *     9. the Storyteller's cards are not shown to the player
 *   "finish" (Gamemaster Test):
 *    10. a fight between the character and the stranger: the character's turn is ended as a player would, and the
 *        stranger must then act with nobody at the Storyteller's hand
 *    11. the stall report holds what waited
 *    12. the switch off: every setting and the standing approvals are back exactly as they were
 *    13. clean up; the clock has not moved
 * The clock never moves: with every automation on, a day passing would let the testbed's factions act for good. The
 * night with talk, travel and dawn is played in the solo world, where that harms nothing.
 * Result: Data/wodx-gate/gatesolo-result.json, with the stall report in it.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-solo", CHRON = "wodx-chronicle";
const TAG = "WoDX gate: solo";
const PLAYER = "Player Test";
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(150); } try { return !!(await fn()); } catch (e) { return false; } }
const S = () => game.modules.get(MOD)?.api, Q = () => game.modules.get(CHRON)?.api?.approvals;
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };
const read = (mod, key) => (game.modules.get(mod)?.active && game.settings.settings.has(`${mod}.${key}`) ? game.settings.get(mod, key) : undefined);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const card = content => ChatMessage.create({whisper: gmIds(), speaker: {alias: TAG}, content});
const logged = (since, fn) => (S()?.log?.entries?.() ?? []).filter(e => e.at >= since).some(fn);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesolo-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

/* ---------------- the seat ---------------- */

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  const R = S()?.rules;
  const ids = {since: Date.now(), t0: game.time.worldTime, back: canvas.scene?.id ?? null, steps,
    wasOn: !!read(MOD, "on"), wait: read(MOD, "wait"), act: read(MOD, "act"),
    before: (R?.PRESET ?? []).map(p => ({mod: p.mod, key: p.key, value: read(p.mod, p.key)})), auto: foundry.utils.deepClone(read(CHRON, "autoApprove") ?? {})};

  await step("1. module", async () => {
    ok("1. module", atLeast(MOD, "0.1.2") && !!S()?.apply && !!R?.PRESET && !!Q()?.types,
      {versions: [MOD, CHRON, "wodx-npc", "wodx-combat", "wodx-actions", "wodx-storyteller"].map(id => `${id} ${game.modules.get(id)?.version}`)});
  });
  if ( !R ) return ids;
  if ( ids.wasOn ) { ok("1b. the switch was already on", false, {error: "Turn The Lone Chronicle off in the testbed before this gate"}); return ids; }

  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  const G = 100;
  const scene = await Scene.create({name: `${TAG} scene`, width: 1600, height: 1200, padding: 0, grid: {type: 1, size: G}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  ids.scene = scene.id;
  const made = await Actor.create([
    {name: `${TAG} character`, type: "Mortal", ownership: {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}},
    {name: `${TAG} stranger`, type: "Mortal", ownership: {default: 0}}]);
  const pc = made.find(a => a.name.endsWith("character")), foe = made.find(a => a.name.endsWith("stranger"));
  ids.actors = made.map(a => a.id);
  const toks = await scene.createEmbeddedDocuments("Token", [
    {...(await pc.getTokenDocument({x: 4 * G, y: 4 * G})).toObject(), actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY},
    {...(await foe.getTokenDocument({x: 6 * G, y: 4 * G})).toObject(), disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE}]);
  ids.tokens = toks.map(t => t.id);
  await game.settings.set(MOD, "wait", 2);
  await game.settings.set(MOD, "act", true);
  const WAIT = 2000 + 2500;

  await step("2. the switch", async () => {
    await game.settings.set(MOD, "on", true);
    await until(() => !!read(MOD, "before")?.at, 8000);
    await sleep(500);
    const now = R.PRESET.map(p => ({key: `${p.mod}.${p.key}`, value: read(p.mod, p.key), to: p.to}));
    const wrong = now.filter(n => n.value !== undefined && n.value !== n.to), missing = now.filter(n => n.value === undefined).map(n => n.key);
    const auto = read(CHRON, "autoApprove") ?? {};
    const notAuto = Q().types().map(t => t.type).filter(t => t !== "request" && auto[t] !== true);
    ok("2. the switch", S().isOn() && S().isSeat() && !wrong.length && !notAuto.length && !game.paused, {wrong, missing, notAuto, kinds: Q().types().length, paused: game.paused});
  });

  await step("3. a card is answered", async () => {
    window.__wodxGateSolo = 0;
    const onClick = ev => { if ( ev.target?.closest?.("[data-action='wodx-gate-accept']") ) window.__wodxGateSolo++; };
    document.addEventListener("click", onClick, true);
    const m = await card(`<p><b>${TAG}: a plan</b></p><button type="button" data-action="wodx-gate-accept">Accept</button><button type="button" data-action="wodx-gate-other">Do this instead</button>`);
    await until(() => logged(ids.since, e => e.kind === "card" && e.title.includes("a plan")), WAIT);
    document.removeEventListener("click", onClick, true);
    const e = S().log.entries().find(x => x.at >= ids.since && x.kind === "card" && x.title.includes("a plan"));
    ok("3. a card is answered", !!e && e.choice === "Accept" && e.acted && window.__wodxGateSolo === 1, {entry: e ?? null, clicks: window.__wodxGateSolo, message: m.id});
  });

  await step("4. cards it must not press", async () => {
    await card(`<p><b>${TAG}: done already</b></p><button type="button" data-action="wodx-gate-undo">Undo</button>`);
    await card(`<p><b>${TAG}: two ways</b></p><button type="button" data-action="wodx-gate-l">The left road</button><button type="button" data-action="wodx-gate-r">The right road</button>`);
    await sleep(WAIT);
    const undo = logged(ids.since, e => e.title.includes("done already"));
    const two = S().log.entries().find(x => x.at >= ids.since && x.title.includes("two ways"));
    ok("4. cards it must not press", !undo && !!two && !two.acted && two.choice === null, {undoLogged: undo, two: two ?? null});
  });

  await step("5. a window is answered", async () => {
    let answered = false;
    foundry.applications.api.DialogV2.prompt({window: {title: `${TAG}: a window`}, content: "<p>Nobody is at the Storyteller's hand.</p>", ok: {label: "Continue"}, rejectClose: false})
      .then(v => { answered = v !== null && v !== undefined; }).catch(() => {});
    await until(() => logged(ids.since, e => e.kind === "window" && e.title.includes("a window")), WAIT + 1500);
    const e = S().log.entries().find(x => x.at >= ids.since && x.kind === "window" && x.title.includes("a window"));
    await sleep(300);
    ok("5. a window is answered", !!e && e.acted && answered, {entry: e ?? null, answered});
    for ( const app of foundry.applications.instances.values() ) if ( String(app.title ?? "").startsWith(TAG) ) await app.close().catch(() => {});
  });

  await step("6. a request waits in the queue", async () => {
    const key = `wodx-gate-solo-${ids.since}`;
    await game.modules.get(CHRON).api.propose({type: "request", title: `${TAG}: may I?`, key});
    await until(() => logged(ids.since, e => e.kind === "queue" && e.title.includes("may I")), WAIT);
    const e = S().log.entries().find(x => x.at >= ids.since && x.kind === "queue" && x.title.includes("may I"));
    const p = Q().pending().find(x => x.key === key);
    ok("6. a request waits in the queue", !!e && !!p, {entry: e ?? null, pending: !!p});
    if ( p ) await Q().decide(p.id, "reject");
  });
  return ids;
}

/* ---------------- the player ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  await step("7. a player", async () => {
    const api = S();
    ok("7. a player", !game.user.isGM && !!api?.isOn?.() && !api.isSeat() && api.log.entries().length === 0 && api.log.stalls(0).total === 0,
      {user: game.user.name, on: api?.isOn?.(), handedOut: api?.log?.entries?.().length});
  });
  await step("8. the seat follows", async () => {
    const scene = game.scenes.get(ids.scene);
    await scene.view();
    const followed = await until(() => game.users.activeGM?.viewedScene === ids.scene, 10000);
    ok("8. the seat follows", followed, {seatViews: game.scenes.get(game.users.activeGM?.viewedScene)?.name ?? null});
  });
  await step("9. the Storyteller's cards", async () => {
    const mine = game.messages.filter(m => (m.speaker?.alias === TAG || m.speaker?.alias === "The Lone Chronicle") && m.visible);
    const shown = [...document.querySelectorAll("#chat [data-message-id], #sidebar [data-message-id]")].filter(el => el.textContent.includes(TAG)).length;
    ok("9. the Storyteller's cards", mine.length === 0 && shown === 0, {visible: mine.length, shown});
  });
  return steps;
}

/* ---------------- back on the seat ---------------- */

async function finish(ids, playerSteps) {
  const R = {started: new Date(ids?.since ?? Date.now()).toISOString(), world: game.world.id, steps: [...(ids?.steps ?? [])], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  for ( const s of playerSteps ?? [] ) R.steps.push(s);
  const rules = S()?.rules;
  if ( !rules || !ids?.scene ) { await cleanup(ids, R); return save(R); }

  await step("10. a fight with nobody at the hand", async () => {
    const scene = game.scenes.get(ids.scene);
    if ( canvas.scene?.id !== scene.id ) { await scene.view(); await sleep(1500); }
    const t = Date.now();
    const combat = await Combat.create({scene: scene.id, active: true});
    const [pcTok, foeTok] = ids.tokens.map(id => scene.tokens.get(id));
    await combat.createEmbeddedDocuments("Combatant", [{tokenId: pcTok.id, sceneId: scene.id, actorId: pcTok.actorId}, {tokenId: foeTok.id, sceneId: scene.id, actorId: foeTok.actorId}]);
    await combat.startCombat();
    const start = {round: combat.round, turn: combat.turn};
    // The character's turn is the player's to end. When the character is first, end it as the player would, so the
    // stranger's turn comes and shows whether it acts with nobody at the Storyteller's hand
    await sleep(1500);
    let live0 = game.combats.get(combat.id);
    const passed = live0?.combatant?.tokenId === pcTok.id;
    if ( passed ) await live0.nextTurn();
    const foeActed = await until(() => game.messages.some(m => m.timestamp >= t && /wodx-(npc|combat)/.test(Object.keys(m.flags ?? {}).join(" "))), 20000);
    await sleep(4000);
    const live = game.combats.get(combat.id);
    // Why, when it does not: what the NPC module sees on the seat, and whether a forced turn works
    const N = game.modules.get("wodx-npc")?.api;
    const diag = {paused: game.paused, npcMode: read("wodx-npc", "mode"), modeFor: N?.modeFor?.(foeTok.actor) ?? null, seatScene: canvas.scene?.id === scene.id,
      foeOnCanvas: !!foeTok.object, foeTurn: live?.combatant?.tokenId === foeTok.id, foeHasPlayerOwner: !!foeTok.actor?.hasPlayerOwner, defeated: !!live?.combatant?.isDefeated};
    if ( !foeActed && live && N?.takeTurn ) {
      const t2 = Date.now();
      try { const r = await N.takeTurn(live, {force: true}); diag.forced = r === null ? "returned nothing" : "ran"; } catch (e) { diag.forced = `error: ${e.message}`; }
      await sleep(1500);
      diag.forcedCards = game.messages.filter(m => m.timestamp >= t2).map(m => `${rules.sourceOf(m.flags)}: ${rules.titleOf(m)}`).slice(0, 5);
    }
    const end = {round: live?.round, turn: live?.turn, whose: live?.combatant?.name ?? null};
    const cards = game.messages.filter(m => m.timestamp >= t).map(m => ({from: rules.sourceOf(m.flags), title: rules.titleOf(m), toStoryteller: rules.forStoryteller(m.whisper, gmIds())})).slice(0, 20);
    // The stranger must act without a Storyteller. The character's own turn waits for the player: that is right.
    ok("10. a fight with nobody at the hand", foeActed, {start, end, cards, diag, characterTurnEndedByGate: passed, note: "The character's turn ends when the player acts; the gate does not act for them."});
    if ( live ) await live.delete();
  });

  await step("11. the stall report", async () => {
    const rep = S().log.stalls(ids.since);
    R.stallReport = rep;
    ok("11. the stall report", rep.total >= 4 && rep.rows.some(r => r.end === "answered by the seat") && rep.rows.some(r => r.end === "left waiting"), {total: rep.total, waiting: rep.waiting});
  });

  await step("12. the switch off", async () => {
    await game.settings.set(MOD, "on", false);
    await until(() => !read(MOD, "before")?.at, 8000);
    await sleep(500);
    const wrong = ids.before.filter(b => b.value !== undefined && !same(read(b.mod, b.key), b.value)).map(b => ({key: `${b.mod}.${b.key}`, was: b.value, now: read(b.mod, b.key)}));
    const auto = read(CHRON, "autoApprove") ?? {};
    ok("12. the switch off", !S().isOn() && !wrong.length && same(auto, ids.auto), {wrong, auto, autoBefore: ids.auto});
  });

  await cleanup(ids, R);
  return save(R);
}

async function cleanup(ids, R) {
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  try {
    if ( read(MOD, "on") ) { await game.settings.set(MOD, "on", false); await sleep(2500); }
    if ( ids?.wait !== undefined ) await game.settings.set(MOD, "wait", ids.wait);
    if ( ids?.act !== undefined ) await game.settings.set(MOD, "act", ids.act);
    for ( const c of game.combats.filter(c => c.scene?.id === ids?.scene) ) await c.delete();
    const back = game.scenes.get(ids?.back);
    if ( back && canvas.scene?.id !== back.id ) { await back.view(); await sleep(800); }
    const scene = game.scenes.get(ids?.scene);
    if ( scene ) await scene.delete();
    for ( const id of ids?.actors ?? [] ) await game.actors.get(id)?.delete();
    const since = ids?.since ?? Date.now();
    const mine = game.messages.filter(m => m.timestamp >= since - 1000 && (m.speaker?.alias === TAG || m.speaker?.alias === "The Lone Chronicle" || String(m.content ?? "").includes(TAG))).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    const q = Q()?.pending?.().filter(p => String(p.title ?? "").startsWith(TAG)) ?? [];
    for ( const p of q ) await Q().decide(p.id, "reject");
    if ( ids && game.time.worldTime !== ids.t0 ) { R.notes.push(`the clock had moved by ${game.time.worldTime - ids.t0} s; put back`); await game.time.advance(ids.t0 - game.time.worldTime); }
    const left = game.actors.filter(a => a.name.startsWith(TAG)).length + game.scenes.filter(s => s.name.startsWith(TAG)).length;
    ok("13. clean up", left === 0 && (!ids || game.time.worldTime === ids.t0) && !read(MOD, "on"), {left, clock: ids ? game.time.worldTime - ids.t0 : null});
  } catch (e) { ok("13. clean up", false, {error: e.message}); }
}
