/**
 * Phase 7b gate (NPC profiles and combat tactics), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gate7b.mjs?${Date.now()}`)).run()
 * Builds (or reuses) a "Gate 7b arena" scene: a square grid with one wall, a player's character (unlinked token: its
 * damage stays on the token) and Rothenstein NPCs (unlinked tokens of the world's own NPC sheets, one per template
 * found). Runs a fight there in Suggest and Auto, and puts everything back with Undo. Deletes nothing; the arena, its
 * combat and its chat cards stay for the Storyteller to look at. Returns the view to the scene it started on.
 * Result: Data/wodx-gate/gate7b-result.json.
 */
// Versions are floors: a later build still passes.
const atLeastV = (a, b) => { const p = s => String(s ?? "0").split(".").map(n => parseInt(n, 10) || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc"; // flags go under an active module's scope
const npc = () => game.modules.get(MOD).api, C = () => game.wodxCombat;
const ARENA = "Gate 7b arena";

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
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const num = v => Number(v) || 0;
const infoOf = a => {
  const s = a.system ?? {}, ab = k => num(s.abilities?.[k]?.value);
  return {kind: C().getKind(a), generation: num(s.generation) || 13, melee: Math.max(ab("brawl"), ab("melee")), ranged: Math.max(ab("firearms"), ab("archery"))};
};
const lastCard = (tokUuid, after) => game.messages.contents.filter(m => m.getFlag(MOD, "plan")?.token === tokUuid && m.timestamp >= after).at(-1) ?? null;
const zero = {bashing: 0, lethal: 0, aggravated: 0};
const dmgOf = a => { const ct = C().corpusTrack(a), d = ct?.damage ?? a.system?.health?.damage ?? {}; return {bashing: num(d.bashing), lethal: num(d.lethal), aggravated: num(d.aggravated)}; };

/** Rothenstein's NPCs, one per template (sheets with no player owner), and a player's character. */
function cast() {
  const R = npc().rules;
  const npcs = game.actors.filter(a => !a.hasPlayerOwner && ["PC", "Mortal", "Vampire", "Werewolf", "Wraith", "Hunter", "Creature", "Changing Breed"].includes(a.type));
  const byTemplate = new Map();
  for ( const a of npcs ) { const t = R.templateFor(infoOf(a)); if ( !byTemplate.has(t) ) byTemplate.set(t, a); }
  const hero = game.actors.find(a => a.hasPlayerOwner && a.type !== "Group");
  const fighter = ["neonate", "ghoul", "guard", "garou", "hunter", "elder"].map(t => byTemplate.get(t)).find(Boolean) ?? [...byTemplate.values()][0];
  const runner = ["guard", "ghoul", "neonate", "hunter", "civilian"].map(t => byTemplate.get(t)).find(a => a && a !== fighter) ?? fighter;
  const kindred = byTemplate.get("neonate") ?? byTemplate.get("elder") ?? null;
  return {byTemplate, hero, fighter, runner, kindred};
}

async function arena(roles) {
  let sc = game.scenes.find(s => s.getFlag(MOD, "gateArena"));
  if ( !sc ) {
    sc = await Scene.create({name: ARENA, width: 2000, height: 1400, padding: 0, grid: {type: CONST.GRID_TYPES.SQUARE, size: 100, distance: 5, units: "ft"},
      tokenVision: false, fog: {exploration: false}, flags: {[MOD]: {gateArena: true}}});
    // A wall down the middle with a gap at the bottom (rows 10 to 13)
    await sc.createEmbeddedDocuments("Wall", [{c: [1100, 0, 1100, 1000], move: CONST.WALL_MOVEMENT_TYPES.NORMAL, sight: CONST.WALL_SENSE_TYPES.NORMAL}]);
  }
  const g = 100, at = (i, j) => ({x: j * g, y: i * g});
  const place = {hero: at(5, 3), fighter: at(5, 4), runner: at(5, 14)};
  let extra = 0;
  const want = [...Object.entries(place).map(([role, p]) => ({role, actor: roles[role], ...p, disposition: role === "hero" ? 1 : -1}))];
  for ( const [t, a] of roles.byTemplate ) if ( a !== roles.fighter && a !== roles.runner ) want.push({role: `extra-${t}`, actor: a, ...at(12 + Math.floor(extra / 6), 13 + (extra++ % 6)), disposition: -1});
  const made = {};
  for ( const w of want ) {
    let doc = sc.tokens.find(t => t.getFlag(MOD, "gateRole") === w.role && t.actorId === w.actor.id);
    if ( !doc ) {
      const td = (await w.actor.getTokenDocument({x: w.x, y: w.y, actorLink: false, disposition: w.disposition, hidden: false, width: 1, height: 1})).toObject();
      td.flags = {...(td.flags ?? {}), [MOD]: {...(td.flags?.[MOD] ?? {}), gateRole: w.role}};
      [doc] = await sc.createEmbeddedDocuments("Token", [td]);
    } else await doc.update({x: w.x, y: w.y, hidden: false, disposition: w.disposition}, {animate: false, wodxMove: false});
    made[w.role] = doc;
  }
  if ( canvas.scene?.id !== sc.id ) { const ready = new Promise(r => Hooks.once("canvasReady", r)); await sc.view(); await ready; }
  await sleep(500);
  for ( const doc of Object.values(made) ) {
    await C().setDamage(doc.actor, zero);
    if ( doc.actor.getFlag(MOD, "behavior") ) await doc.actor.unsetFlag(MOD, "behavior");
    await doc.unsetFlag("wodx-combat", "moved");
  }
  await sc.unsetFlag(MOD, "mode");
  return {sc, tokens: Object.fromEntries(Object.entries(made).map(([k, d]) => [k, canvas.tokens.get(d.id)]))};
}

async function fight(sc, T) {
  let combat = game.combats.find(c => c.scene?.id === sc.id && c.getFlag(MOD, "gateFight"));
  if ( !combat ) combat = await Combat.create({scene: sc.id, active: true, flags: {[MOD]: {gateFight: true}}});
  else await combat.update({active: true});
  // Every fighter in the fight (a combat left by an interrupted run may lack some)
  const missing = ["hero", "fighter", "runner"].filter(r => !combat.combatants.some(c => c.tokenId === T[r].id));
  if ( missing.length ) await combat.createEmbeddedDocuments("Combatant", missing.map(r => ({tokenId: T[r].id, sceneId: sc.id, actorId: T[r].actor.id})));
  if ( !combat.started ) { await combat.startCombat(); await sleep(2500); }
  return combat;
}
async function turnTo(combat, tok) {
  const idx = combat.turns.findIndex(c => c.tokenId === tok.id);
  await combat.update({turn: idx});
  await sleep(1600);
}
/** Make it this token's turn with WoDX NPC held off, then have it act in the mode given. Returns its card. */
async function actNow(sc, combat, tok, mode) {
  await sc.setFlag(MOD, "mode", "off");
  await turnTo(combat, tok);
  await sc.setFlag(MOD, "mode", mode);
  const msg = await npc().takeTurn(combat, {force: true});
  await sleep(1200);
  return msg ? game.messages.get(msg.id) : null;
}

export async function run() {
  const {R, ok, step} = harness();
  const startScene = canvas.scene;
  const roles = cast();
  R.cast = {hero: roles.hero?.name, fighter: roles.fighter?.name, runner: roles.runner?.name, kindred: roles.kindred?.name ?? null,
    templates: Object.fromEntries([...roles.byTemplate].map(([t, a]) => [t, a.name]))};
  let sc, T, combat;
  await step("versions", async () => {
    ok("versions", atLeastV(npc()?.version, "0.1.0") && !!C()?.quickAttack && !!roles.hero && !!roles.fighter,
      {npc: npc()?.version, combat: C()?.version, actions: game.wodxActions?.version, cast: R.cast});
  });
  await step("the arena: a wall, a player's character and Rothenstein NPCs", async () => {
    ({sc, tokens: T} = await arena(roles));
    const wall = sc.walls.size >= 1;
    ok("the arena: a wall, a player's character and Rothenstein NPCs", wall && T.hero && T.fighter && T.runner && canvas.scene.id === sc.id,
      {scene: sc.name, tokens: Object.fromEntries(Object.entries(T).map(([k, t]) => [k, t?.name]))});
  });
  await step("each NPC's template comes from its line", async () => {
    const rows = Object.entries(T).filter(([k]) => k !== "hero").map(([role, t]) => {
      const p = npc().profileFor(t.actor), want = npc().rules.templateFor(infoOf(t.actor));
      return {role, name: t.name, kind: C().getKind(t.actor), template: p.template, want, mode: npc().modeFor(t.actor)};
    });
    ok("each NPC's template comes from its line", rows.every(r => r.template === r.want && r.mode === game.settings.get(MOD, "mode")), {rows});
  });
  await step("an NPC's turn: a plan whispered to the Storyteller, best first, each with its reason", async () => {
    combat = await fight(sc, T);
    const t0 = Date.now();
    // A new round, so this round's turns have not been planned yet: the combat hook makes the card
    await combat.nextRound();
    await sleep(2500);
    if ( combat.combatant?.tokenId !== T.fighter.id ) await turnTo(combat, T.fighter);
    const msg = lastCard(T.fighter.document.uuid, t0);
    const plan = msg?.getFlag(MOD, "plan");
    const opts = plan?.options ?? [];
    const gmOnly = !!msg && msg.whisper.length > 0 && msg.whisper.every(id => game.users.get(id)?.isGM);
    ok("an NPC's turn: a plan whispered to the Storyteller, best first, each with its reason",
      gmOnly && plan.mode === "suggest" && !plan.done && opts.length >= 1 && opts.every(o => o.why) && opts.every((o, k) => k === 0 || opts[k - 1].score >= o.score),
      {options: opts.map(o => `${o.label} (${o.score}): ${o.why}`), whisper: msg?.whisper?.length ?? 0});
    R.suggestCard = msg?.id ?? null;
  });
  await step("the plan follows the profile: unhurt and beside a foe, it fights (a bystander runs)", async () => {
    const p = npc().profileFor(T.fighter.actor), {options, fight: f} = npc().planTurn(T.fighter, combat);
    const fresh = npc().rules.scoreOptions(p, f.state)[0];
    const fights = ["attack", "shoot", "power", "willpower", "frenzy"].includes(options[0].action);
    ok("the plan follows the profile: unhurt and beside a foe, it fights (a bystander runs)",
      options[0].action === fresh.action && (p.template === "civilian" ? options[0].action === "flee" : fights) && f.state.enemies.some(e => e.reach),
      {template: p.template, top: `${options[0].label}: ${options[0].why}`, reach: f.state.enemies.map(e => `${e.name}: ${e.reach ? "in reach" : `${Math.round(e.distance)} yd`}`)});
  });
  await step("wounded past what it will bear, it runs (or the Beast takes it)", async () => {
    const p = npc().profileFor(T.fighter.actor);
    await C().setDamage(T.fighter.actor, {bashing: 0, lethal: Math.min(6, p.fleeAt), aggravated: 0});
    await sleep(300);
    const top = npc().planTurn(T.fighter, combat).options[0];
    await C().setDamage(T.fighter.actor, zero);
    ok("wounded past what it will bear, it runs (or the Beast takes it)", ["flee", "frenzy"].includes(top.action), {fleeAt: p.fleeAt, top: `${top.label}: ${top.why}`});
  });
  await step("fear: a Kindred NPC shies from a torch in the hero's hand", async () => {
    const k = roles.kindred && Object.values(T).find(t => t.actor?.id === roles.kindred.id);
    if ( !k ) { ok("fear: a Kindred NPC shies from a torch in the hero's hand", true, {skipped: "no Kindred NPC in the world"}); return; }
    // Beside the hero for the test, then back
    const back = {x: k.document.x, y: k.document.y};
    if ( k !== T.fighter ) { await k.document.update({x: 400, y: 600}, {animate: false, wodxMove: false}); await sleep(300); }
    let torch = T.hero.actor.items.find(i => i.getFlag(MOD, "gateTorch"));
    if ( !torch ) [torch] = await T.hero.actor.createEmbeddedDocuments("Item", [{name: "Torch", type: "Melee Weapon", flags: {[MOD]: {gateTorch: true}},
      system: {isequipped: true, damage: {attribute: "strength", bonus: 1, type: "bashing"}, difficulty: 6, attack: {attribute: "dexterity", ability: "melee"}}}]);
    else await torch.update({name: "Torch"});
    await sleep(300);
    const opts = npc().planTurn(k, combat).options;
    await torch.update({name: "Cudgel"});
    if ( k !== T.fighter ) await k.document.update(back, {animate: false, wodxMove: false});
    const atk = opts.find(o => o.action === "attack" && o.target === T.hero.id);
    const fi = opts.findIndex(o => o.action === "flee"), ai = opts.indexOf(atk);
    ok("fear: a Kindred NPC shies from a torch in the hero's hand", !!atk && /afraid of their fire/.test(atk.why) && fi >= 0 && fi < ai,
      {npc: k.name, options: opts.map(o => `${o.label} (${o.score}): ${o.why}`)});
  });
  await step("the unseen: with the hero hidden, it searches", async () => {
    await T.hero.document.update({hidden: true});
    await sleep(300);
    const top = npc().planTurn(T.fighter, combat).options[0];
    await T.hero.document.update({hidden: false});
    ok("the unseen: with the hero hidden, it searches", top.action === "search", {top: `${top.label}: ${top.why}`});
  });
  await step("the way round the wall: never through it", async () => {
    const a = npc().cellOf(T.runner), b = npc().cellOf(T.hero);
    const direct = npc().wallBetween({i: 5, j: 10}, {i: 5, j: 11}, T.runner);
    const way = npc().approach(T.runner, T.hero);
    const steps = (way.path ?? []).slice(1).map((c, k) => npc().wallBetween(way.path[k], c, T.runner));
    ok("the way round the wall: never through it", direct && !!way.path && steps.every(x => !x) && way.path.some(c => c.i >= 10),
      {from: a, to: b, blockedStraight: direct, squares: way.path?.length ?? 0, cost: way.cost, through: way.path?.filter(c => c.j === 10 || c.j === 11)});
  });
  await step("a large NPC (2x2) finds a way it fits through", async () => {
    await T.runner.document.update({width: 2, height: 2}, {animate: false});
    await sleep(400);
    const way = npc().approach(T.runner, T.hero);
    const steps = (way.path ?? []).slice(1).map((c, k) => npc().wallBetween(way.path[k], c, T.runner));
    await T.runner.document.update({width: 1, height: 1}, {animate: false});
    await sleep(300);
    ok("a large NPC (2x2) finds a way it fits through", !!way.path && steps.every(x => !x) && way.path.some(c => c.i >= 10),
      {squares: way.path?.length ?? 0, note: way.note ?? null});
  });
  await step("a hex grid: the way round the wall there too", async () => {
    let hx = game.scenes.find(s => s.getFlag(MOD, "gateHexArena"));
    if ( !hx ) {
      hx = await Scene.create({name: "Gate 7b hex arena", width: 2000, height: 1400, padding: 0, grid: {type: CONST.GRID_TYPES.HEXODDR, size: 100, distance: 5, units: "ft"},
        tokenVision: false, fog: {exploration: false}, flags: {[MOD]: {gateHexArena: true}}});
      await hx.createEmbeddedDocuments("Wall", [{c: [1100, 0, 1100, 1000], move: CONST.WALL_MOVEMENT_TYPES.NORMAL, sight: CONST.WALL_SENSE_TYPES.NORMAL}]);
    }
    const ready = new Promise(r => Hooks.once("canvasReady", r)); await hx.view(); await ready; await sleep(600);
    const want = {hero: {actor: roles.hero, x: 300, y: 500, d: 1}, runner: {actor: roles.runner, x: 1400, y: 500, d: -1}};
    const H = {};
    for ( const [role, w] of Object.entries(want) ) {
      let doc = hx.tokens.find(t => t.getFlag(MOD, "gateRole") === role);
      if ( !doc ) {
        const td = (await w.actor.getTokenDocument({x: w.x, y: w.y, actorLink: false, disposition: w.d, width: 1, height: 1})).toObject();
        td.flags = {...(td.flags ?? {}), [MOD]: {...(td.flags?.[MOD] ?? {}), gateRole: role}};
        [doc] = await hx.createEmbeddedDocuments("Token", [td]);
      } else await doc.update({x: w.x, y: w.y}, {animate: false, wodxMove: false});
      H[role] = doc;
    }
    await sleep(600);
    const runner = canvas.tokens.get(H.runner.id), hero = canvas.tokens.get(H.hero.id);
    const way = npc().approach(runner, hero);
    const steps = (way.path ?? []).slice(1).map((c, k) => npc().wallBetween(way.path[k], c, runner));
    const below = (way.path ?? []).some(c => canvas.grid.getCenterPoint(c).y > 1000);
    ok("a hex grid: the way round the wall there too", !!way.path && steps.every(x => !x) && below,
      {grid: canvas.grid.type, steps: way.path?.length ?? 0, note: way.note ?? null});
    const back = new Promise(r => Hooks.once("canvasReady", r)); await sc.view(); await back; await sleep(600);
    T = Object.fromEntries(Object.entries(T).map(([k, t]) => [k, canvas.tokens.get(t.id)]));
  });
  await step("Auto: the NPC moves round the wall on its turn; Undo puts it back", async () => {
    const start = {x: T.runner.document.x, y: T.runner.document.y};
    const msg = await actNow(sc, combat, T.runner, "auto");
    let done = msg?.getFlag(MOD, "plan")?.done;
    // An option that needs the Storyteller came first: take the first one that moves, as the Storyteller would
    if ( msg && !done ) {
      const k = msg.getFlag(MOD, "plan").options.findIndex(o => ["attack", "flee"].includes(o.action));
      R.notes.push(`The runner waited for the Storyteller (${msg.getFlag(MOD, "plan").options[0].label}); accepted option ${k}.`);
      if ( k >= 0 ) done = await npc().acceptCard(msg, k);
    }
    const moved = T.runner.document.x !== start.x || T.runner.document.y !== start.y;
    const path = done?.path ?? [];
    const clean = path.slice(1).every((c, k) => !npc().wallBetween(path[k], c, T.runner));
    await npc().undoCard(msg);
    await sleep(800);
    const back = T.runner.document.x === start.x && T.runner.document.y === start.y;
    ok("Auto: the NPC moves round the wall on its turn; Undo puts it back", !!done && moved && clean && back && msg.getFlag(MOD, "plan").done.undone,
      {did: done?.text ?? msg?.getFlag(MOD, "plan")?.options?.[0]?.label ?? null, moved, squares: path.length, clean, back});
  });
  await step("Auto: the fighter attacks; Undo takes the damage back", async () => {
    const before = dmgOf(T.hero.actor);
    const t0 = Date.now();
    const msg = await actNow(sc, combat, T.fighter, "auto");
    await sleep(2000);
    const plan = msg?.getFlag(MOD, "plan");
    const hit = dmgOf(T.hero.actor);
    const atkCard = game.messages.contents.filter(m => m.timestamp >= t0 && m.getFlag("wodx-combat", "data")?.attacker === T.fighter.actor.uuid).at(-1);
    if ( plan?.done ) await npc().undoCard(msg);
    await sleep(800);
    const after = dmgOf(T.hero.actor);
    const same = JSON.stringify(after) === JSON.stringify(before);
    const acted = !!plan?.done;
    const waits = !acted && !!plan && !npc().rules.SELF_ACTING.includes(plan.options[0].action);
    ok("Auto: the fighter attacks; Undo takes the damage back", (acted && same && (!!atkCard || plan.options[plan.done.k].action !== "attack")) || waits,
      {did: plan?.done?.text ?? null, waitsFor: waits ? plan.options[0].label : null, attackCard: !!atkCard, before, hit, after,
        autoApply: game.settings.get("wodx-combat", "autoApply")});
  });
  await step("a player's character is never moved; Off means off", async () => {
    const t0 = Date.now();
    const pc = await actNow(sc, combat, T.hero, "auto");
    await T.fighter.actor.setFlag(MOD, "behavior", {mode: "off"});
    const off = await actNow(sc, combat, T.fighter, "auto");
    await T.fighter.actor.unsetFlag(MOD, "behavior");
    const cards = game.messages.contents.filter(m => m.timestamp >= t0 && m.getFlag(MOD, "plan"));
    ok("a player's character is never moved; Off means off", pc === null && off === null && !cards.some(m => [T.hero.document.uuid, T.fighter.document.uuid].includes(m.getFlag(MOD, "plan").token)),
      {cardsSince: cards.length});
  });
  await sc?.unsetFlag(MOD, "mode");
  if ( startScene && startScene.id !== canvas.scene?.id ) await startScene.view();
  return save(R, "gate7b-result.json");
}
