/**
 * Debts, oaths and the vampire's marks (B3560 to B3566, PR 953), the by-hand checks driven in two browsers:
 * rothenstein-wodx only.
 *   node tools/harness/gate-two.mjs gatedebtsmarks [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's vampire (Status 3), a
 *            Kindred NPC, a mortal, two changelings (one the player's), a diablerist and a victim, and runs:
 *     a. Blood Hunt: callHunt puts the hunt in the settings and on the "Blood Hunts" page, the NPC to Hunted, Status 0;
 *        endHunt lifts it: attitude and Status back
 *     b. Broken oath: the Oath of Clasped Hands broken costs both changelings 2 temporary Willpower; the card goes to
 *        both owners
 *     c1. the Beast: the player's vampire in frenzy at the top of a fight brings "What the Beast wants" to its owner
 *     d1. low Humanity: at Humanity 2 the bearing toward a mortal is +1 and the Nightfall line reads "50 minutes after
 *        sunset"
 *     e. diablerie by a 12th on a 9th: veins 3 years, taint 3 months; Aura Perception's note names black veins
 *     f. a torpor of 300 years: "wakes into a new age"
 *   "player" (Player Test):
 *     b2. the oath card reaches the player; the Storyteller's hunt card does not
 *     c2. "Spend Willpower: take this turn back" on the Beast card spends 1 and marks the turn held
 *     d2. the pixel face: lowHumanity 1 at Humanity 2, and the face drawn differs from the same face at Humanity 7
 *     f2. the waking card reaches the player
 *   "finish" (Gamemaster Test): c3. the turn is held; c4. with "The Beast takes the token" the next round brings
 *            "The Beast has"; then puts every setting back, deletes what it made, and writes
 *            Data/wodx-gate/gatedebtsmarks-result.json with every step.
 * The clock never moves.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = "WoDX gate: debts";
const PLAYER = "Player Test";
const MOD = "wodx-actions";
const G = 100;
const YEAR = 365.25 * 86400;
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const A = () => game.wodxActions ?? game.modules.get(MOD)?.api;
const DM = () => A().debtsMarks();
const PD = () => game.modules.get("wodx-paperdoll")?.api;
const NPC = () => game.modules.get("wodx-npc")?.api;
const plain = m => (m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
const statusOf = a => Number(a.items.find(i => i.type === "Feature" && /^status/i.test(i.name))?.system?.value);
const wpOf = a => Number(a.system?.advantages?.willpower?.temporary);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const bad = R.steps.filter(s => !s.pass);
  if ( bad.length ) R.summary += `; failed: ${bad.map(s => JSON.stringify(s).slice(0, 400)).join(" ; ")}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedebtsmarks-result.json", {type: "application/json"});
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
  if ( !A()?.debtsMarks ) return {error: "WoDX Actions has no debtsMarks api (3.82.0 or later needed)"};
  const get = k => { try { return game.settings.get(MOD, k); } catch (e) { return undefined; } };
  const ids = {back: canvas.scene?.id ?? null, t0: Date.now(),
    keep: {applyChanges: get("applyChanges"), spendResources: get("spendResources"), beastToken: get("beastToken"), bloodHunts: foundry.utils.deepClone(get("bloodHunts") ?? [])}};
  await game.settings.set(MOD, "applyChanges", true);
  await game.settings.set(MOD, "spendResources", true);
  await game.settings.set(MOD, "beastToken", "card");
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  ids.oldCharacter = user.character?.id ?? null;
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await Scene.create({name: `${TAG} scene`, width: 3000, height: 2000, padding: 0, grid: {type: 1, size: G, distance: 5}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  ids.scene = scene.id;
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const wp = {"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6};
  const [pc, npc, mortal, fae1, fae2, diab, victim] = await createActors([
    {name: `${TAG} Hunt Target`, type: "Vampire", ownership: OWN},
    {name: `${TAG} Kindred NPC`, type: "Vampire"},
    {name: `${TAG} mortal`, type: "Mortal"},
    {name: `${TAG} changeling one`, type: "Changeling", ownership: OWN},
    {name: `${TAG} changeling two`, type: "Changeling"},
    {name: `${TAG} diablerist`, type: "Vampire"},
    {name: `${TAG} victim`, type: "Vampire"}]);
  ids.actors = [pc, npc, mortal, fae1, fae2, diab, victim].map(a => a?.id).filter(Boolean);
  Object.assign(ids, {pc: pc.id, npc: npc.id, mortal: mortal.id, fae1: fae1.id, fae2: fae2.id});
  await pc.update({...wp, "system.advantages.path.permanent": 7, "system.generation": 12});
  await pc.createEmbeddedDocuments("Item", [{name: "Status", type: "Feature", system: {type: "wod.types.background", value: 3}}]);
  await fae1.update(wp); await fae2.update(wp);
  await diab.update({"system.generation": 12}); await victim.update({"system.generation": 9});
  await user.update({character: pc.id});
  await scene.createEmbeddedDocuments("Token", [
    {name: "pc", actorId: pc.id, actorLink: true, x: G * 5, y: G * 5, disposition: 1},
    {name: "npc", actorId: npc.id, actorLink: true, x: G * 8, y: G * 5, disposition: -1},
    {name: "mortal", actorId: mortal.id, actorLink: true, x: G * 12, y: G * 5, disposition: 0}]);
  const tok = id => scene.tokens.find(t => t.actorId === id);
  await until(() => [pc, npc, mortal].every(a => tok(a.id)?.object));
  const fresh = re => game.messages.contents.filter(m => m.timestamp >= ids.t0 && re.test(m.content ?? ""));

  await step("a. Blood Hunt", async () => {
    const j0 = game.journal.find(j => j.pages?.getName?.("Blood Hunts"));
    ids.pageExisted = !!j0;
    const before = NPC()?.attitude?.of?.(npc, pc)?.step ?? null;
    await DM().callHunt(pc, {caller: "", sect: "camarilla", ground: "lifeBoon"});
    const h = (game.settings.get(MOD, "bloodHunts") ?? []).find(x => x.targetId === pc.id && x.active);
    ids.hunt = h?.id ?? null;
    const card = fresh(new RegExp(`${TAG} Hunt Target`)).filter(m => /Lift the hunt/.test(m.content)).at(-1);
    const page = game.journal.map(j => j.pages?.getName?.("Blood Hunts")).find(Boolean);
    const onPage = !!page && (page.text?.content ?? "").includes(`data-hunt="${h?.id}"`);
    const hunted = NPC()?.attitude?.of?.(npc, pc)?.step ?? null;
    const huntedSet = h ? (npc.id in (h.steps ?? {})) : false;
    const st0 = statusOf(pc);
    await DM().endHunt(h?.id, "lifted");
    const after = NPC()?.attitude?.of?.(npc, pc)?.step ?? null;
    const st1 = statusOf(pc);
    const ended = (game.settings.get(MOD, "bloodHunts") ?? []).find(x => x.id === h?.id);
    ok("a. Blood Hunt", !!h && !!card && card.whisper.every(id => game.users.get(id)?.isGM) && onPage && huntedSet && hunted === -3 && st0 === 0 && after === before && st1 === 3 && ended?.active === false,
      {hunt: !!h, label: h?.label, card: plain(card), onPage, before, hunted, after, statusWhileHunted: st0, statusAfter: st1, ended: ended?.active === false});
  });
  await step("b. Broken oath", async () => {
    await fae1.setFlag(MOD, "c20oaths", [{kind: "clasped", terms: "gate oath", parties: [fae2.name], successes: 0, at: game.time.worldTime}]);
    const w1 = wpOf(fae1), w2 = wpOf(fae2);
    await DM().breakOath(fae1, 0, {willing: true, da: false});
    await until(() => wpOf(fae1) === w1 - 2 && wpOf(fae2) === w2 - 2, 4000);
    const card = fresh(/An oath is broken/).at(-1);
    ids.oathMsg = card?.id ?? null;
    ok("b. Broken oath", wpOf(fae1) === w1 - 2 && wpOf(fae2) === w2 - 2 && !!card && card.whisper.includes(user.id) && /Clasped Hands/.test(card.content) && !!fae1.getFlag(MOD, "c20oaths")?.[0]?.broken,
      {wp1: [w1, wpOf(fae1)], wp2: [w2, wpOf(fae2)], card: plain(card), toPlayer: card?.whisper?.includes(user.id)});
  });
  await step("c1. the Beast's card", async () => {
    await pc.update({"system.conditions.isfrenzy": true});
    const combat = await Combat.create({scene: scene.id, active: true});
    ids.combat = combat.id;
    await combat.createEmbeddedDocuments("Combatant", [
      {tokenId: tok(pc.id).id, sceneId: scene.id, actorId: pc.id, initiative: 20},
      {tokenId: tok(npc.id).id, sceneId: scene.id, actorId: npc.id, initiative: 5}]);
    await combat.startCombat();
    await until(() => fresh(/What the Beast wants/).length, 6000);
    const card = fresh(/What the Beast wants/).at(-1);
    ids.beastMsg = card?.id ?? null;
    ids.beastKey = `${combat.id}:${combat.round}:${combat.turn}`;
    ok("c1. the Beast's card", !!card && card.whisper.includes(user.id) && /Spend Willpower/.test(card.content) && /npc|Tear into|Blood/.test(plain(card)),
      {card: plain(card), turn: combat.combatant?.actor?.name});
  });
  await step("d1. low Humanity", async () => {
    await pc.update({"system.advantages.path.permanent": 2});
    const bm = DM().bearingMods(pc, mortal, {}, {aura: true});
    const line = DM().riseLines([pc])[0] ?? "";
    ok("d1. low Humanity", bm?.diff === 1 && /50 minutes after sunset/.test(line), {bearing: bm, line});
  });
  await step("e. diablerie", async () => {
    const html = await DM().markDiablerie(diab, victim, 12);
    const m = (diab.getFlag(MOD, "diablerieMarks") ?? []).at(-1);
    const note = DM().auraNote(diab);
    ok("e. diablerie", m?.years === 3 && m?.months === 3 && /3 years/.test(html) && /3 months/.test(html) && /Black veins/.test(note), {years: m?.years, months: m?.months, note: note.replace(/<[^>]+>/g, "")});
  });
  await step("f. a long torpor", async () => {
    const r = await DM().wake(pc, game.time.worldTime - 300 * YEAR);
    const card = fresh(/wakes into a new age/).at(-1);
    ids.wakeMsg = card?.id ?? null;
    ok("f. a long torpor", !!card && card.whisper.includes(user.id) && /slept 300 years/.test(plain(card)) && !!pc.getFlag(MOD, "longSleep"), {card: plain(card), r: !!r});
  });
  ids.R = R;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = ids?.R ?? {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  R.steps.push(...(playerSteps ?? []));
  const pc = game.actors.get(ids.pc);
  const fresh = re => game.messages.contents.filter(m => m.timestamp >= ids.t0 && re.test(m.content ?? ""));
  R.steps.push(await (async () => {
    const name = "c3. the turn is held";
    try {
      await until(() => pc?.getFlag(MOD, "beastHeld") === ids.beastKey, 4000);
      return {name, pass: pc?.getFlag(MOD, "beastHeld") === ids.beastKey && fresh(/holds the Beast/).length > 0, held: pc?.getFlag(MOD, "beastHeld") ?? null};
    } catch (e) { return {name, pass: false, error: e.message}; }
  })());
  R.steps.push(await (async () => {
    const name = "c4. the Beast takes the token";
    try {
      const combat = game.combats.get(ids.combat);
      await game.settings.set(MOD, "beastToken", "take");
      const since = Date.now();
      await combat.update({round: combat.round + 1, turn: 0});
      await until(() => game.messages.contents.some(m => m.timestamp >= since && /The Beast has/.test(m.content ?? "")), 8000);
      const card = game.messages.contents.filter(m => m.timestamp >= since && /The Beast has/.test(m.content ?? "")).at(-1);
      const plan = game.messages.contents.filter(m => m.timestamp >= since && m.flags?.["wodx-npc"]).length;
      return {name, pass: !!card && plan > 0, card: plain(card), planCards: plan};
    } catch (e) { return {name, pass: false, error: e.message}; }
  })());
  try {
    const k = ids.keep;
    for ( const key of ["applyChanges", "spendResources", "beastToken", "bloodHunts"] ) if ( k[key] !== undefined ) await game.settings.set(MOD, key, k[key]);
    await game.users.get(ids.user)?.update({character: ids.oldCharacter ?? null});
    await game.combats.get(ids.combat)?.delete();
    for ( const m of game.messages.contents.filter(m => m.timestamp >= ids.t0 && (ids.actors.includes(m.speaker?.actor) || m.speaker?.scene === ids.scene || m.content?.includes?.(TAG))) ) await m.delete();
    if ( !ids.pageExisted ) for ( const j of game.journal.filter(j => j.pages?.getName?.("Blood Hunts")) ) {
      const p = j.pages.getName("Blood Hunts");
      if ( !(p.text?.content ?? "").replace(/<li data-hunt="[^"]*">[\s\S]*?<\/li>/g, m => m.includes(TAG) ? "" : m).match(/<li/) ) await p.delete();
    }
    for ( const id of ids.actors ) await game.actors.get(id)?.delete();
    if ( ids.back ) await game.scenes.get(ids.back)?.view();
    await game.scenes.get(ids.scene)?.delete();
    R.steps.push({name: "clean up", pass: !ids.actors.some(id => game.actors.get(id)) && !game.scenes.get(ids.scene) && !game.combats.get(ids.combat)});
  } catch (e) { R.steps.push({name: "clean up", pass: false, error: e.message}); }
  return save(R);
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const pc = game.actors.get(ids.pc);
  await step("b2. the oath card, not the hunt card", async () => {
    await until(() => game.messages.get(ids.oathMsg)?.visible, 8000);
    const oath = game.messages.get(ids.oathMsg);
    const leak = game.messages.contents.filter(m => m.visible && /Lift the hunt/.test(m.content ?? "") && (m.content ?? "").includes(TAG));
    ok("b2. the oath card, not the hunt card", !!oath?.visible && leak.length === 0, {oath: !!oath?.visible, leak: leak.length});
  });
  await step("c2. Willpower takes the turn back", async () => {
    await until(() => game.messages.get(ids.beastMsg)?.visible, 8000);
    const m = game.messages.get(ids.beastMsg);
    const w0 = wpOf(pc);
    const el = await m.renderHTML();
    document.body.append(el);
    await sleep(300);
    const b = el.querySelector("button[data-dm=holdBeast]");
    b?.click();
    const spent = await until(() => wpOf(pc) === w0 - 1 && pc.getFlag(MOD, "beastHeld") === ids.beastKey, 8000);
    el.remove();
    ok("c2. Willpower takes the turn back", !!b && spent, {button: !!b, wp: [w0, wpOf(pc)], held: pc.getFlag(MOD, "beastHeld") ?? null});
  });
  await step("d2. the face at low Humanity", async () => {
    const F = PD()?.faces;
    const low = F?.state?.(pc)?.lowHumanity;
    const draw = () => { const c = F.canvas(pc); return c ? Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data) : null; };
    const at2 = draw();
    await pc.update({"system.advantages.path.permanent": 7});
    await until(() => F.state(pc).lowHumanity === 0, 3000);
    const at7 = draw();
    await pc.update({"system.advantages.path.permanent": 2});
    const lum = px => { if ( !px ) return null; let s = 0, k = 0; for ( let i = 0; i < px.length; i += 4 ) if ( px[i + 3] ) { s += px[i] + px[i + 1] + px[i + 2]; k++; } return k ? s / k : null; };
    const differs = !!at2 && !!at7 && at2.some((v, i) => v !== at7[i]);
    ok("d2. the face at low Humanity", low === 1 && differs, {lowHumanity: low, differs, lum2: lum(at2), lum7: lum(at7), drawn: !!at2});
  });
  await step("f2. the waking card", async () => {
    await until(() => game.messages.get(ids.wakeMsg)?.visible, 8000);
    ok("f2. the waking card", !!game.messages.get(ids.wakeMsg)?.visible, {});
  });
  return steps;
}
