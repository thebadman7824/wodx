/**
 * A player's Disarm of an NPC and a committed blow (B6781, B6780, B6788), driven in two browsers, rothenstein-wodx only:
 *   node tools/harness/gate-two.mjs gateplayerblows [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scratch scene (made active, so the player's
 *            browser opens on it), the player's fighter, an NPC guard of Strength 1 with an equipped sword, and a
 *            started fight with both in it.
 *   "player" (Player Test), every roll a 9:
 *     a. Disarm from the attack window: the guard's sword leaves the sheet and lands on the map as a pile of loose gear
 *        (through the Storyteller's socket, since a player cannot write the NPC), with a "Knocked away" card
 *     b. a Great Blow from the attack window at the guard: the card says no defense this turn
 *   "finish" (Gamemaster Test):
 *     c. the guard strikes back the same turn with Dodge chosen: the dodge is refused ("committed blow"), no defense
 *     d. next round the guard strikes again with Dodge: the player's fighter defends
 *     then puts every setting back, deletes what it made, and writes Data/wodx-gate/gateplayerblows-result.json.
 * The clock never moves.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = "WoDX gate: blows";
const PLAYER = "Player Test";
const CMB = "wodx-combat";
const IX = "wodx-interactables";
const G = 100;
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const C = () => game.modules.get(CMB)?.api ?? game.wodxCombat;
const plain = m => (m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
const fighter = (name, str, extra = {}) => ({name, type: "Mortal", ...extra, system: {attributes: {dexterity: {value: 4, total: 4}, strength: {value: str, total: str},
  stamina: {value: 2, total: 2}, wits: {value: 3, total: 3}}, abilities: {melee: {value: 4}, athletics: {value: 3}, brawl: {value: 2}}}});
const SWORD = name => ({name, type: "Melee Weapon", system: {isequipped: true, damage: {attribute: "strength", bonus: 2, type: "lethal"}, attack: {attribute: "dexterity", ability: "melee"}, difficulty: 6}});
const cardsSince = (t, re) => game.messages.contents.filter(m => m.timestamp >= t && re.test(m.content ?? ""));
const dataSince = t => game.messages.contents.filter(m => m.timestamp >= t).map(m => m.getFlag?.(CMB, "data")).filter(Boolean);

/** Every d10 a set face, by the random source the dice read. Returns the source to put back. */
async function fixDice(face) {
  const u0 = CONFIG.Dice.randomUniform;
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return u0;
  }
  CONFIG.Dice.randomUniform = u0;
  throw new Error(`could not fix the dice to ${face}`);
}

/** Open WoDX Combat's attack window, pick the maneuver and the defense, press Attack. */
async function attackWith(aTok, tTok, {maneuver = "normal", defense = "none", weapon = null} = {}) {
  const run = C().attack({attacker: aTok, target: tTok, weaponId: weapon ?? undefined, noAim: true});
  let dlg = null;
  await until(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.("select[name='maneuver']"))), 8000);
  const root = dlg?.element;
  if ( !root ) return {error: "no attack window"};
  for ( const [name, value] of [["maneuver", maneuver], ["defense", defense]] ) {
    const s = root.querySelector(`select[name='${name}']`);
    if ( s ) { s.value = value; s.dispatchEvent(new Event("change", {bubbles: true})); }
  }
  const picked = {maneuver: root.querySelector("select[name='maneuver']")?.value, defense: root.querySelector("select[name='defense']")?.value};
  root.querySelector("button[data-action='attack']")?.click();
  await run;
  return picked;
}

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const bad = R.steps.filter(s => !s.pass);
  if ( bad.length ) R.summary += `; failed: ${bad.map(s => JSON.stringify(s).slice(0, 400)).join(" ; ")}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayerblows-result.json", {type: "application/json"});
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

/* ---------------- Storyteller side ---------------- */

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  if ( !C()?.attack ) return {error: "WoDX Combat has no attack api"};
  if ( !game.modules.get(IX)?.active || !game.modules.get(IX)?.api?.loose?.setDown ) return {error: "WoDX Interactables with loose gear is needed"};
  const get = k => { try { return game.settings.get(CMB, k); } catch (e) { return undefined; } };
  const ids = {t0: Date.now(), back: canvas.scene?.id ?? null, activeBack: game.scenes.active?.id ?? null,
    keep: {statusEffects: get("statusEffects"), autoApply: get("autoApply"), classicManeuvers: get("classicManeuvers")}, R: {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []}};
  for ( const [k, v] of [["statusEffects", true], ["autoApply", false]] ) if ( ids.keep[k] !== undefined ) await game.settings.set(CMB, k, v);
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  ids.oldCharacter = user.character?.id ?? null;
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await Scene.create({name: `${TAG} scene`, width: 2000, height: 1400, padding: 0, grid: {type: 1, size: G, distance: 5}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  ids.scene = scene.id;
  await scene.activate();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const made = await Actor.create([fighter(`${TAG} fighter`, 4, {ownership: OWN}), fighter(`${TAG} guard`, 1)]);
  const pc = made.find(a => a.name.endsWith("fighter")), guard = made.find(a => a.name.endsWith("guard"));
  ids.actors = made.map(a => a.id);
  Object.assign(ids, {pc: pc.id, guard: guard.id});
  await pc.createEmbeddedDocuments("Item", [SWORD(`${TAG} mace`)]);
  const [sw] = await guard.createEmbeddedDocuments("Item", [SWORD(`${TAG} sword`)]);
  ids.sword = sw.id;
  await user.update({character: pc.id});
  await scene.createEmbeddedDocuments("Token", [
    {name: "fighter", actorId: pc.id, actorLink: true, x: G * 5, y: G * 5, disposition: 1},
    {name: "guard", actorId: guard.id, actorLink: true, x: G * 6, y: G * 5, disposition: -1}]);
  const tok = id => scene.tokens.find(t => t.actorId === id);
  await until(() => [pc, guard].every(a => tok(a.id)?.object));
  ids.pcTok = tok(pc.id).id; ids.guardTok = tok(guard.id).id;
  const combat = await Combat.create({scene: scene.id, active: true});
  ids.combat = combat.id;
  await combat.createEmbeddedDocuments("Combatant", [{tokenId: ids.pcTok, sceneId: scene.id, actorId: pc.id, initiative: 20},
    {tokenId: ids.guardTok, sceneId: scene.id, actorId: guard.id, initiative: 5}]);
  await combat.startCombat();
  await until(() => combat.started && combat.round >= 1);
  ids.round = combat.round;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = ids?.R ?? {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  R.steps.push(...(Array.isArray(playerSteps) ? playerSteps : [{name: "player", pass: false, error: JSON.stringify(playerSteps)}]));
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  const scene = game.scenes.get(ids.scene), combat = game.combats.get(ids.combat);
  const pcTok = scene?.tokens.get(ids.pcTok)?.object, guardTok = scene?.tokens.get(ids.guardTok)?.object;
  let u0 = null;
  try {
    u0 = await fixDice(9);
    await step("c. the same turn: no defense after the committed blow", async () => {
      const since = Date.now();
      const picked = await attackWith(guardTok, pcTok, {defense: "dodge"});
      await until(() => dataSince(since).length > 0, 6000);
      const d = dataSince(since).at(-1);
      const card = cardsSince(since, /committed blow/i).at(-1);
      ok("c. the same turn: no defense after the committed blow", !!d && d.defended === false && !!card && combat.round === ids.round,
        {picked, defended: d?.defended ?? null, card: plain(card), round: combat?.round});
    });
    await step("d. next round the fighter defends again", async () => {
      await combat.nextRound();
      await until(() => combat.round === ids.round + 1, 4000);
      const since = Date.now();
      const picked = await attackWith(guardTok, pcTok, {defense: "dodge"});
      await until(() => dataSince(since).length > 0, 6000);
      const d = dataSince(since).at(-1);
      ok("d. next round the fighter defends again", !!d && d.defended === true && cardsSince(since, /committed blow/i).length === 0,
        {picked, defended: d?.defended ?? null, round: combat?.round});
    });
  } catch (e) { R.errors.push(e.message); }
  finally { if ( u0 ) CONFIG.Dice.randomUniform = u0; }
  try {
    for ( const [k, v] of Object.entries(ids.keep ?? {}) ) if ( v !== undefined ) await game.settings.set(CMB, k, v);
    await game.users.get(ids.user)?.update({character: ids.oldCharacter ?? null});
    await combat?.delete();
    for ( const m of game.messages.contents.filter(m => m.timestamp >= ids.t0 && (ids.actors.includes(m.speaker?.actor) || m.speaker?.scene === ids.scene)) ) await m.delete();
    for ( const id of ids.actors ) await game.actors.get(id)?.delete();
    if ( ids.activeBack ) await game.scenes.get(ids.activeBack)?.activate();
    if ( ids.back ) await game.scenes.get(ids.back)?.view();
    await scene?.delete();
    ok("clean up", !ids.actors.some(id => game.actors.get(id)) && !game.scenes.get(ids.scene) && !game.combats.get(ids.combat));
  } catch (e) { ok("clean up", false, {error: e.message}); }
  return save(R);
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  await until(() => canvas.ready && canvas.scene?.id === ids.scene && game.combat?.id === ids.combat, 15000);
  const scene = game.scenes.get(ids.scene), guard = game.actors.get(ids.guard);
  const pcTok = scene?.tokens.get(ids.pcTok)?.object, guardTok = scene?.tokens.get(ids.guardTok)?.object;
  if ( !pcTok || !guardTok ) return [{name: "player", pass: false, error: "the scene or its tokens did not reach the player", scene: canvas.scene?.id ?? null}];
  let u0 = null;
  try {
    u0 = await fixDice(9);
    await step("a. a player's Disarm of an NPC", async () => {
      const since = Date.now();
      const picked = await attackWith(pcTok, guardTok, {maneuver: "disarm"});
      const pile = () => scene.tiles.find(t => t.flags?.[IX]?.pile && (t.flags[IX].items ?? []).includes(`${TAG} sword`));
      const gone = await until(() => !guard.items.get(ids.sword) && !!pile(), 10000);
      const card = cardsSince(since, /Knocked away/).at(-1);
      const p = pile();
      ok("a. a player's Disarm of an NPC", gone && !!card && !p?.hidden, {picked, offSheet: !guard.items.get(ids.sword), pile: p ? {x: p.x, y: p.y, items: p.flags[IX].items} : null, card: plain(card)});
    });
    await step("b. a player's Great Blow", async () => {
      const since = Date.now();
      const picked = await attackWith(pcTok, guardTok, {maneuver: "greatblow"});
      await until(() => dataSince(since).length > 0, 6000);
      const d = dataSince(since).at(-1);
      ok("b. a player's Great Blow", !!d?.noDefense && d.round === ids.round && d.combatId === ids.combat, {picked, noDefense: d?.noDefense ?? null, round: d?.round ?? null});
    });
  } catch (e) { ok("player", false, {error: e.message}); }
  finally { if ( u0 ) CONFIG.Dice.randomUniform = u0; }
  return steps;
}
