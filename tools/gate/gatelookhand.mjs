/**
 * The look's hand checks, driven (WoDX Library 0.15.0, NPC 0.43.0, Actions 3.46.0 or later), rothenstein-wodx only.
 * It runs in two browsers at once, so the player's view is seen by a player: tools/harness/gate-two.mjs drives it.
 *   node tools/harness/gate-two.mjs gatelookhand
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing (no password, a player), a scene, a character it
 *            owns and three NPCs, turns "Faces you have met" on, and runs the Storyteller-side checks:
 *     1. the APIs
 *     2. fine clothes: a well-dressed character's first meeting with common folk names "fine clothes" and starts warmer
 *     3. blood: a bloodied shirt names "blood on them" at a first meeting, the "bloody" talk test holds and has stock
 *        lines, and after they have met it costs a step for the scene only (nothing stored)
 *     4. fine work: a fine-work knife finds its good in the price list and is priced at 1.5 times a plain one
 *     5. pass as someone else: the disguise roll holds, the guard reads the disguise, a held livery disguise passes a
 *        place that allows livery, and one seen through raises "dressed as one of us"
 *   "player" (Player Test):
 *     6. the stranger line: an unmet guard in livery shows "... in livery, keeping watch ..." under the token, and the
 *        Storyteller's own stranger text wins on another NPC
 *     7. Look them over and Ask around from the With this person window: facts, whispered to the player and the Storyteller
 *     8. Dress as someone else from the item's uses: the dialog saves the station and sides on the worn coat
 *   "finish" (Gamemaster Test): puts the setting back, deletes what it made (the Player Test user stays for next
 *            time), and writes Data/wodx-gate/gatelookhand-result.json with every step.
 * The clock never moves.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = "WoDX gate: look";
const PLAYER = "Player Test";
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const A = () => game.wodxActions, N = () => game.modules.get("wodx-npc")?.api, W = () => game.modules.get("wodx-chronicle")?.api?.when;
const L = () => game.modules.get("wodx-library")?.api, M = () => game.modules.get("wodx-storyteller")?.api?.upkeep?.money;

/** Dice that roll 10 every time on this client, and the way back. Foundry 14's mapping is tested, not assumed. */
async function tens() {
  const was = CONFIG.Dice.randomUniform;
  for ( const v of [0.999999, 0.000001] ) {
    CONFIG.Dice.randomUniform = () => v;
    const r = await new Roll("1d10").evaluate();
    if ( r.total === 10 ) return () => { CONFIG.Dice.randomUniform = was; };
  }
  CONFIG.Dice.randomUniform = was;
  return () => {};
}
const setStat = (path, n) => ({[`${path}.value`]: n, [`${path}.total`]: n});

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatelookhand-result.json", {type: "application/json"});
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
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const ids = {faces: !!game.settings.get("wodx-npc", "faces"), back: canvas.scene?.id ?? null};
  // The player: made once, kept for later runs. No password: it exists only on the testbed.
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  const G = 100;
  const scene = await Scene.create({name: `${TAG} scene`, width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  ids.scene = scene.id;
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const [pc, folk, guard, hooded] = await createActors([
    {name: `${TAG} PC`, type: "Mortal", ownership: {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}},
    {name: `${TAG} common folk`, type: "Mortal", flags: {"wodx-npc": {behavior: {template: "civilian"}}}},
    {name: `${TAG} guard`, type: "Mortal", flags: {"wodx-npc": {behavior: {template: "guard"}, where: {activity: "patrol"}}}},
    {name: `${TAG} hooded`, type: "Mortal", flags: {"wodx-npc": {stranger: "a hooded figure"}}}]);
  ids.pc = pc.id; ids.folk = folk.id; ids.guard = guard.id; ids.hooded = hooded.id;
  await pc.update({...setStat("system.attributes.perception", 4), ...setStat("system.attributes.wits", 3), ...setStat("system.attributes.manipulation", 3),
    "system.abilities.empathy.value": 3, "system.abilities.streetwise.value": 3, "system.abilities.subterfuge.value": 3});
  await user.update({character: pc.id});
  await scene.createEmbeddedDocuments("Token", [
    {name: "pc", actorId: pc.id, actorLink: true, x: G * 4, y: G * 5},
    {name: "folk", actorId: folk.id, actorLink: true, x: G * 6, y: G * 5},
    {name: "guard", actorId: guard.id, actorLink: true, x: G * 8, y: G * 5, displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS},
    {name: "hooded", actorId: hooded.id, actorLink: true, x: G * 10, y: G * 5, displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS}]);
  const tok = id => scene.tokens.find(t => t.actorId === id);
  await until(() => [pc, folk, guard, hooded].every(a => tok(a.id)?.object));
  // The goods list: a coat of this era's best cloth, and a plain one
  const goods = await import("/modules/wodx-library/data/goods.mjs");
  const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 1490;
  const era = game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null;
  const tierOf = g => Number(era && g.values?.[era] !== undefined ? g.values[era] : goods.valueAt ? goods.valueAt(g, year) : g.value) || 0;
  const inYear = g => (g.from === undefined || year >= g.from) && (g.to === undefined || year <= g.to);
  const cloth = goods.GOODS.filter(g => g.kind === "cloth" && inYear(g));
  const fine = cloth.slice().sort((a, b) => tierOf(b) - tierOf(a))[0];
  const plain = cloth.find(g => tierOf(g) <= 1 && g !== fine) ?? cloth[cloth.length - 1];
  R.notes.push({year, era, fine: fine && {name: fine.name, tier: tierOf(fine)}, plain: plain && {name: plain.name, tier: tierOf(plain)}});
  await game.settings.set("wodx-npc", "faces", true);
  // The guard wears livery; the hooded one wears nothing that shows
  await guard.createEmbeddedDocuments("Item", [{name: "Margrave's livery", type: "Item", system: {isequipped: true}, flags: {"wodx-library": plain ? {good: plain.id} : {}}}]);

  await step("1 the APIs", async () => {
    ok("1 the APIs", typeof L()?.look?.of === "function" && typeof N()?.attitude?.of === "function" && typeof N()?.routineRules?.disguiseAt === "function"
      && typeof A()?.social === "function" && typeof L()?.use?.run === "function" && W()?.check?.("bloody", {}).problems?.length === 0,
      {library: L()?.version, npc: N()?.version, actions: A()?.version, user: user.id});
  });
  await step("2 fine clothes", async () => {
    const [coat] = await pc.createEmbeddedDocuments("Item", [{name: fine.name, type: "Item", system: {isequipped: true}, flags: {"wodx-library": {good: fine.id}}}]);
    ids.fineCoat = coat.id;
    const look = L().look.of(pc), st = L().look.station(folk, "civilian");
    const at = N().attitude.of(folk, pc);
    const text = JSON.stringify(at);
    ok("2 fine clothes", look.station >= 3 && !at.met && /fine clothes/.test(text) && at.step >= 1, {station: look.station, folkStation: st, at});
  });
  await step("3 blood", async () => {
    // The fine coat comes off first: its +1 and the blood's -1 would add to 0, and a look worth nothing names no reason
    await pc.items.get(ids.fineCoat).update({"system.isequipped": false});
    const [shirt] = await pc.createEmbeddedDocuments("Item", [{name: `${TAG} shirt`, type: "Item", system: {isequipped: true}, flags: {"wodx-library": {examine: {bloody: true}}}}]);
    const first = N().attitude.of(guard, pc), named = /blood on them/.test(JSON.stringify(first));
    const test = W().check("bloody", {actor: pc, npc: guard}).ok;
    const lines = (await import("/modules/wodx-npc/data/stock-talk-more.mjs")).NOTICE?.bloody ?? [];
    await N().attitude.apply(guard, pc, {to: 1, why: "gate"});
    const later = N().attitude.of(guard, pc), stored = guard.flags?.["wodx-npc"]?.attitude?.[pc.id]?.step;
    await shirt.delete();
    await pc.items.get(ids.fineCoat).update({"system.isequipped": true});
    const clean = N().attitude.of(guard, pc);
    ok("3 blood", named && test && lines.length >= 3 && later.met && later.step === 0 && stored === 1 && clean.step >= 1,
      {named, first, test, lines: lines.length, later: later.step, stored, clean: clean.step});
  });
  await step("4 fine work", async () => {
    const TR = A().tradeRules;
    const good = plain?.name ?? fine.name;
    const [knife] = await pc.createEmbeddedDocuments("Item", [{name: `${good} (fine work)`, type: "Item", flags: {"wodx-storyteller": {quality: "fine", priceFactor: 1.5}}}]);
    const priceOf = async n => (await M()?.price?.(n)) ?? M()?.priceSync?.(n) ?? null;
    const base = await priceOf(good), tagged = await priceOf(knife.name);
    const priced = tagged ? TR.withQuality(tagged, TR.qualityFactor(knife)) : null;
    await knife.delete();
    ok("4 fine work", !!base && !!tagged && tagged.each === base.each && priced?.each === Math.max(1, Math.round(base.each * 1.5)),
      {good, money: !!M(), base, tagged, priced});
  });
  await step("5 pass as someone else", async () => {
    const coat = pc.items.get(ids.fineCoat);
    await coat.update({"flags.wodx-library.look": {dressedAs: {station: 1, sides: ["livery"]}}});
    const restore = await tens();
    let res;
    try { res = await A().social(pc, tok(guard.id).object, "disguise", {bonus: 10, extraDiff: 0, specialty: false, wp: false, aura: false}); } finally { restore(); }
    await sleep(300);
    const rec = pc.flags?.["wodx-actions"]?.disguise?.[guard.id];
    const held = W().check("disguised", {actor: pc, npc: guard}).ok;
    const seen = L().look.asSeen(L().look.of(pc), !!rec?.held);
    const RR = N().routineRules;
    const pass = RR.disguiseAt(L().look.of(pc), pc.flags["wodx-actions"].disguise, [guard.id]);
    const failed = RR.disguiseAt(L().look.of(pc), {[guard.id]: {held: false}}, [guard.id]);
    const keeper = RR.pickReaction({template: "guard", loyalty: 1, caution: 1, cowardice: 0, tactics: []}, {seenThrough: failed.seenThrough, trespass: true});
    await coat.update({"flags.wodx-library.look": {dressedAs: null}});
    await pc.update({"flags.wodx-actions.disguise": null});
    ok("5 pass as someone else", res?.result === "win" && rec?.held === true && held && seen.station === 1 && seen.sides.includes("livery") && pass.pass
      && failed.seenThrough && /dressed as one of us/.test(keeper.find(k => k.action === "challenge")?.why ?? ""),
      {res: res?.result, rec, held, seen: {station: seen.station, sides: seen.sides}, pass, failed, why: keeper[0]?.why});
  });
  // Reset what the player phase reads: the guard has not met the character
  await guard.update({"flags.wodx-npc.attitude": null});
  ids.R = R;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = ids?.R ?? {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  R.steps.push(...(playerSteps ?? []));
  try {
    for ( const id of [ids.pc, ids.folk, ids.guard, ids.hooded] ) await game.actors.get(id)?.delete();
    if ( ids.back ) await game.scenes.get(ids.back)?.view();
    await game.scenes.get(ids.scene)?.delete();
    await game.settings.set("wodx-npc", "faces", !!ids.faces);
    await game.users.get(ids.user)?.update({character: null});
    for ( const m of game.messages.filter(m => m.speaker?.actor === ids.pc) ) await m.delete();
    R.steps.push({name: "9 clean up", pass: !game.actors.get(ids.pc) && !game.scenes.get(ids.scene) && game.settings.get("wodx-npc", "faces") === !!ids.faces});
  } catch (e) { R.steps.push({name: "9 clean up", pass: false, error: e.message}); }
  return save(R);
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [], notes = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "6 player", pass: false, error: `signed in as ${game.user.name}`}];
  const scene = game.scenes.get(ids.scene);
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const tok = id => canvas.tokens.placeables.find(t => t.document.actorId === id);
  await until(() => tok(ids.guard) && tok(ids.hooded) && tok(ids.pc));
  const pc = game.actors.get(ids.pc);

  await step("6 the stranger line", async () => {
    const g = tok(ids.guard), h = tok(ids.hooded);
    g.renderFlags.set({refreshNameplate: true}); h.renderFlags.set({refreshNameplate: true});
    const shows = await until(() => { g.renderFlags.set({refreshNameplate: true}); return /in livery/.test(g.nameplate?.text ?? ""); }, 12000);
    const ga = game.actors.get(ids.guard);
    const seenItems = [...(ga?.items ?? [])].map(i => ({name: i.name, worn: !!i.system?.isequipped}));
    let look = null; try { look = L().look.of(g.actor); } catch (e) { look = {error: e.message}; }
    const gText = g.nameplate?.text ?? "", hText = h.nameplate?.text ?? "";
    ok("6 the stranger line", shows && /keeping watch/.test(gText) && !gText.includes("WoDX gate") && hText === "a hooded figure", {guard: gText, hooded: hText, seenItems, look: look && {worn: look.worn, sides: look.sides, station: look.station, error: look.error}, perm: ga?.permission});
  });
  const withPerson = async (key, npcId) => {
    tok(npcId).setTarget(true, {releaseOthers: true});
    tok(ids.pc).control({releaseOthers: true});
    await until(() => !document.querySelector(".wodx-with-person"), 5000);
    const since = Date.now();
    const p = A().withPerson({actor: pc});
    await until(() => document.querySelector(".wodx-with-person .wodx-wp-act"), 5000);
    const btns = document.querySelectorAll(`.wodx-with-person .wodx-wp-act[data-act="${key}"]`);
    const btn = btns[btns.length - 1] ?? null;
    if ( !btn ) notes.push(`no ${key} button`);
    btn?.click();
    await Promise.race([p, sleep(6000)]);
    await until(() => game.messages.some(m => m.timestamp >= since && m.speaker?.actor === ids.pc && /<li>/.test(m.content)), 5000);
    tok(npcId).setTarget(false);
    return game.messages.filter(m => m.timestamp >= since && m.speaker?.actor === ids.pc).pop() ?? null;
  };
  await step("7 look them over and ask around", async () => {
    const restore = await tens();
    let look, ask;
    try { look = await withPerson("lookover", ids.guard); ask = await withPerson("askabout", ids.guard); } finally { restore(); }
    const gm = game.users.filter(u => u.isGM).map(u => u.id);
    const toUs = m => !!m && m.whisper.includes(game.user.id) && gm.some(id => m.whisper.includes(id));
    const facts = m => (String(m?.content ?? "").match(/<li>/g) ?? []).length;
    ok("7 look them over and ask around", toUs(look) && facts(look) >= 2 && toUs(ask) && facts(ask) >= 1 && /look them over/i.test(look.content) && /ask around/i.test(ask.content),
      {look: look && {whisper: look.whisper.length, facts: facts(look)}, ask: ask && {whisper: ask.whisper.length, facts: facts(ask)}, notes: notes.slice()});
  });
  await step("8 dress as someone else", async () => {
    const coat = pc.items.get(ids.fineCoat);
    const abil = (await L().use.abilities?.(coat)) ?? [];
    const p = L().use.run(coat, "dressas", pc);
    const open = await until(() => document.querySelector("input[name=station]"), 5000);
    const box = document.querySelector("input[name=station]");
    if ( box ) {
      box.value = "2";
      const sides = document.querySelector("input[name=sides]"); if ( sides ) sides.value = "kind:church";
      box.closest("form, .application, dialog")?.querySelector("[data-action=save]")?.click();
    }
    await Promise.race([p, sleep(4000)]);
    await until(() => pc.items.get(ids.fineCoat)?.flags?.["wodx-library"]?.look?.dressedAs, 4000);
    const d = pc.items.get(ids.fineCoat)?.flags?.["wodx-library"]?.look?.dressedAs ?? null;
    ok("8 dress as someone else", open && d?.station === 2 && (d.sides ?? []).includes("kind:church"),
      {open, offered: JSON.stringify(abil).includes("dressas"), dressedAs: d});
  });
  return steps;
}
