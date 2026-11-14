/**
 * The display-only desk, batch B (B3130 to B3133, B3160, B3161, B3163, B3170, B3171, B3180), the checks that once
 * needed a person, driven in two browsers: rothenstein-wodx only.
 *   node tools/harness/gate-two.mjs gatedisplayb [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene in Moravia, a mortal and a Garou
 *            character it owns and an NPC, and runs the Storyteller-side checks:
 *     a. Nightmares: the effect takes a die from a roll's breakdown
 *     b. Stranger: dressed for China on a Moravian scene, the roll window offers "Blending into a crowd", and ticking
 *        it adds the difficulty; dressed back, it is gone
 *     c. Research: a codex entry is offered for Occult and takes 1 from the difficulty; after the roll it is spent
 *     d. Legends: a deed won by a Garou player character makes a Legends line and a standing proposal (rejected, the
 *        line hidden again)
 *     e1. Gist: a line in Polish is posted for the player phase (the character speaks Czech only)
 *     f. Fight: a fight with the player character and an NPC, the NPC defeated, ends: a Legends deed "and won", and
 *        the night's fight notes list it
 *     g. Elders: a vampire turned in 330 in Moravia lives the ages from 331, and "477 to 1196" offers a Moravian mark
 *   "player" (Player Test):
 *     e2. the Polish line shows scrambled to them, with "Try for the gist"
 *   "finish" (Gamemaster Test): puts every setting back, deletes what it made, and writes
 *            Data/wodx-gate/gatedisplayb-result.json with every step.
 * The clock never moves.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = "WoDX gate: display B";
const PLAYER = "Player Test";
const G = 100;
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const clone = v => foundry.utils.deepClone(v);
const CH = () => game.modules.get("wodx-chronicle")?.api;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedisplayb-result.json", {type: "application/json"});
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
  const ids = {back: canvas.scene?.id ?? null, journals: [], combat: null,
    keep: {legends: clone(game.settings.get("wodx-chronicle", "legends")), deeds: clone(game.settings.get("wodx-chronicle", "legendDeeds") ?? []),
      langs: game.settings.get("wodx-chronicle", "languagesInChat"), fights: clone(game.settings.get("wodx-storyteller", "fightNotes") ?? []),
      afterAction: game.settings.get("wodx-combat", "afterAction"), legendStanding: game.settings.get("wodx-chronicle", "legendStanding")}};
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await Scene.create({name: `${TAG} scene`, width: 3000, height: 2000, padding: 0, grid: {type: 1, size: G}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false, flags: {"wodx-chronicle": {place: {region: "moravia"}}}});
  ids.scene = scene.id;
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const [pc, garou, foe] = await createActors([
    {name: `${TAG} PC`, type: "Mortal", ownership: OWN},
    {name: `${TAG} Garou`, type: "Werewolf", ownership: OWN},
    {name: `${TAG} foe`, type: "Mortal"}]);
  ids.pc = pc.id; ids.garou = garou.id; ids.foe = foe.id;
  await scene.createEmbeddedDocuments("Token", [
    {name: "pc", actorId: pc.id, actorLink: true, x: G * 4, y: G * 5},
    {name: "garou", actorId: garou.id, actorLink: true, x: G * 4, y: G * 8},
    {name: "foe", actorId: foe.id, actorLink: true, x: G * 6, y: G * 5}]);
  const tok = id => scene.tokens.find(t => t.actorId === id);
  await until(() => [pc, garou, foe].every(a => tok(a.id)?.object));
  const DH = await import("/modules/wodx-actions/scripts/deeper-hooks.js");
  const Q = CH()?.approvals;

  await step("a. Nightmares", async () => {
    const [fx] = await pc.createEmbeddedDocuments("ActiveEffect", [{name: "Nightmares", img: "icons/svg/terror.svg", flags: {"wodx-storyteller": {diceLess: 1}}}]);
    const m = DH.modsFor(pc, {}, {abilityKey: "athletics", abilityLabel: "Athletics"});
    await fx.delete();
    const after = DH.modsFor(pc, {}, {abilityKey: "athletics", abilityLabel: "Athletics"});
    ok("a. Nightmares", m.parts.includes("Nightmares -1 die") && m.dice === -1 && !after.parts.some(p => /Nightmares/.test(p)), {parts: m.parts, dice: m.dice, after: after.parts});
  });
  await step("b. Stranger", async () => {
    const dress = game.modules.get("wodx-npc")?.api?.wanted?.dress;
    const here = CH()?.world?.here?.(scene);
    await dress.set(pc, "china");
    await until(() => pc.flags?.["wodx-npc"]?.dressedAs === "china", 3000);
    const step1 = DH.crowdStep(pc), html = DH.ticksHtml(pc), m = DH.modsFor(pc, {"tag-crowd": true}, {abilityKey: "stealth", abilityLabel: "Stealth"});
    await dress.set(pc, null);
    await until(() => !pc.flags?.["wodx-npc"]?.dressedAs, 3000);
    const back = DH.crowdStep(pc);
    ok("b. Stranger", step1 > 0 && /Blending into a crowd/.test(html) && m.parts.some(p => p.startsWith("Dressed as a stranger here")) && m.diff === step1 && back === 0,
      {here: here?.id, step: step1, parts: m.parts, back});
  });
  await step("c. Research", async () => {
    const j = await JournalEntry.create({name: `${TAG} codex`, flags: {"wodx-storyteller": {codex: pc.id}}, pages: [{name: "The drowned chapel", type: "text", text: {content: "<p>Gate.</p>"}}]});
    ids.journals.push(j.id);
    const page = j.pages.contents[0];
    const html = DH.ticksHtml(pc), pool = {abilityKey: "occult", abilityLabel: "Occult"};
    const m = DH.modsFor(pc, {research: page.id}, pool);
    const brawl = DH.modsFor(pc, {research: page.id}, {abilityKey: "brawl", abilityLabel: "Brawl"});
    await DH.afterRoll(pc, {research: page.id}, pool);
    await until(() => j.pages.get(page.id)?.flags?.["wodx-actions"]?.researchUsed, 3000);
    const flags = j.pages.get(page.id)?.flags?.["wodx-actions"] ?? null;
    ok("c. Research", /Research from the codex/.test(html) && html.includes("The drowned chapel") && m.parts.includes("Research from the codex -1 diff") && m.diff === -1
      && !brawl.parts.length && flags?.researchUsed === true && !DH.researchPages(pc).length, {parts: m.parts, brawl: brawl.parts, flags});
  });
  await step("d. Legends", async () => {
    await game.settings.set("wodx-chronicle", "legendStanding", true);
    const n0 = new Set(Q.pending().map(p => p.id));
    const added = await CH().legends.addDeed({id: "wodx-gate-display-b", text: `${garou.name} fought the gate and won.`, won: true, people: [{id: garou.id, name: garou.name}]});
    const line = (added ?? []).find(e => /fought the gate/.test(JSON.stringify(e))) ?? CH().legends.book().entries.find(e => /fought the gate/.test(JSON.stringify(e)));
    await until(() => Q.pending().some(p => !n0.has(p.id) && p.type === "legendStanding"), 4000);
    const prop = Q.pending().find(p => !n0.has(p.id) && p.type === "legendStanding");
    if ( prop ) await Q.decide(prop.id, "reject");
    if ( line?.id ) await CH().legends.setShown(line.id, false);
    const hidden = line?.id ? CH().legends.book().entries.find(e => e.id === line.id)?.shown === false : false;
    ok("d. Legends", !!line && !!prop && prop.data?.actorId === garou.id && !Q.pending().some(p => p.id === prop.id) && hidden,
      {line: line && {id: line.id, text: line.text ?? line.title ?? null}, proposal: prop && {title: prop.title, detail: prop.detail}, hidden});
  });
  await step("e1. Gist: the Polish line", async () => {
    await game.settings.set("wodx-chronicle", "languagesInChat", true);
    await pc.update({"flags.wodx-chronicle.languages": ["Czech"]});
    await garou.update({"flags.wodx-chronicle.languages": ["Czech"]});
    const m = await ChatMessage.create({content: "Dzien dobry", speaker: {alias: "Storyteller"}, flags: {"wodx-chronicle": {language: "Polish"}}});
    ids.gistMsg = m.id;
    ok("e1. Gist: the Polish line", !!m && m.flags?.["wodx-chronicle"]?.language === "Polish", {id: m?.id});
  });
  await step("f. Fight", async () => {
    await game.settings.set("wodx-combat", "afterAction", true);
    const [combat] = await Combat.create([{scene: scene.id, active: true}]);
    ids.combat = combat.id;
    await combat.createEmbeddedDocuments("Combatant", [{tokenId: tok(pc.id).id, sceneId: scene.id, actorId: pc.id}, {tokenId: tok(foe.id).id, sceneId: scene.id, actorId: foe.id}]);
    await combat.startCombat();
    const noted = await until(() => combat.getFlag("wodx-combat", "aar")?.start?.length >= 2, 5000);
    const foeC = combat.combatants.find(c => c.actorId === foe.id);
    await foeC.update({defeated: true});
    await sleep(300);
    const id = combat.id;
    await combat.delete();
    ids.combat = null;
    await until(() => (game.settings.get("wodx-chronicle", "legendDeeds") ?? []).some(d => d.id === id) && (game.settings.get("wodx-storyteller", "fightNotes") ?? []).some(f => f.id === id), 8000);
    const deed = (game.settings.get("wodx-chronicle", "legendDeeds") ?? []).find(d => d.id === id);
    const note = (game.settings.get("wodx-storyteller", "fightNotes") ?? []).find(f => f.id === id);
    ok("f. Fight", noted && !!deed && deed.won === true && /and won/.test(deed.text) && deed.people?.some(p => p.id === pc.id) && !!note,
      {noted, deed, note: note && {text: note.text, won: note.won, rows: note.rows}});
  });
  await step("g. Elders", async () => {
    const LD = await import("/modules/wodx-creation/scripts/lifepath-drill-rules.mjs");
    const now = Number(CH()?.eras?.currentYear?.()) || 1490;
    const since = LD.newSince({turnYear: 330, nowYear: now, line: "vampire", seed: "wodx-gate", region: "moravia"});
    const steps = LD.sinceSteps(since);
    const dark = steps.find(s => s.from === 477);
    const marks = LD.datedMarks("moravia", 477, 1196).map(m => m[0]);
    const text = JSON.stringify(dark?.options ?? []);
    const has = marks.filter(n => text.includes(n));
    ok("g. Elders", steps[0]?.from === 331 && !!dark && dark.to === 1196 && marks.length > 0 && has.length > 0,
      {titles: steps.map(s => s.title), marks: marks.slice(0, 5), offered: has});
  });
  R.notes.push("g checks the Lifepath rules the window draws its steps from; the window itself is not opened.");
  ids.R = R;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = ids?.R ?? {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  R.steps.push(...(playerSteps ?? []));
  try {
    const k = ids.keep;
    // Proposals the deeds left in the queue for the gate's characters
    const Q = CH()?.approvals;
    for ( const p of Q?.pending?.() ?? [] ) if ( p.type === "legendStanding" && [ids.pc, ids.garou].includes(p.data?.actorId) ) await Q.decide(p.id, "reject");
    if ( ids.combat ) await game.combats.get(ids.combat)?.delete();
    await game.settings.set("wodx-chronicle", "legends", k.legends);
    await game.settings.set("wodx-chronicle", "legendDeeds", k.deeds);
    await game.settings.set("wodx-chronicle", "languagesInChat", k.langs);
    await game.settings.set("wodx-chronicle", "legendStanding", k.legendStanding);
    await game.settings.set("wodx-storyteller", "fightNotes", k.fights);
    await game.settings.set("wodx-combat", "afterAction", k.afterAction);
    for ( const id of ids.journals ?? [] ) await game.journal.get(id)?.delete();
    const mine = [ids.pc, ids.garou, ids.foe];
    for ( const m of game.messages.filter(m => mine.includes(m.speaker?.actor) || m.id === ids.gistMsg || (m.speaker?.scene === ids.scene)) ) await m.delete();
    for ( const id of mine ) await game.actors.get(id)?.delete();
    if ( ids.back ) await game.scenes.get(ids.back)?.view();
    await game.scenes.get(ids.scene)?.delete();
    R.steps.push({name: "clean up", pass: !mine.some(id => game.actors.get(id)) && !game.scenes.get(ids.scene)
      && game.settings.get("wodx-chronicle", "languagesInChat") === k.langs && (game.settings.get("wodx-chronicle", "legendDeeds") ?? []).length === k.deeds.length});
  } catch (e) { R.steps.push({name: "clean up", pass: false, error: e.message}); }
  return save(R);
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  await step("e2. Gist: Try for the gist", async () => {
    await until(() => game.messages.get(ids.gistMsg), 8000);
    const m = game.messages.get(ids.gistMsg);
    const el = await m.renderHTML();
    const tag = el?.querySelector?.(".wodx-language")?.textContent ?? "";
    const btn = el?.querySelector?.(".wodx-gist")?.textContent ?? "";
    const shown = el?.querySelector?.(".message-content")?.textContent ?? "";
    ok("e2. Gist: Try for the gist", /does not speak/.test(tag) && /Try for the gist/.test(btn) && /Czech/.test(btn) && !/Dzien dobry/.test(shown), {tag, button: btn});
  });
  return steps;
}
