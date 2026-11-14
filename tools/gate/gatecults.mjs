/**
 * WoDX NPC gate: cults that gather around characters (B3240-B3246), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatecults.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It turns cultsOn on for its run, makes an empty scene of its own (never viewed, so no
 * NPC already on a map can overhear), a preacher NPC and three listeners on it, and removes all of it, restoring the
 * cult settings.
 *   1. the API and the settings
 *   2. words in character with three NPCs in earshot add awe with themes; words with nobody near add none
 *   3. powers seen push the awe to 10: "A following gathers" waits in the approval queue
 *   4. approved, the cult exists with the founder, a sect's words for the year, a creed and what it gives
 *   5. a gathering adds attention; the targeted listener is ordained into the inner circle
 *   6. a cult turn by hand applies the week (devotion up, a Storyteller card)
 *   7. the Following window opens for the founder and for the Storyteller's overview
 *   8. clean up
 * Result: Data/wodx-gate/gatecults-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const npc = () => game.modules.get("wodx-npc").api;
const chron = () => game.modules.get("wodx-chronicle").api;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const MOD = "wodx-npc";
  const t0 = game.time.worldTime;
  const keep = {on: game.settings.get(MOD, "cultsOn"), words: game.settings.get(MOD, "cultWords"), npcs: game.settings.get(MOD, "npcCults"),
    cults: foundry.utils.duplicate(game.settings.get(MOD, "cults")), state: foundry.utils.duplicate(game.settings.get(MOD, "cultState"))};
  const msgs = new Set(game.messages.map(m => m.id));
  let scene = null;
  const actors = [], tokens = [];
  let cultId = null, founder = null;
  try {
    await step("1. API and settings", async () => {
      const api = npc()?.cults;
      scene = await Scene.create({name: "Gate cults (empty)", width: 3000, height: 3000, grid: {size: 100}});
      ok("1. API and settings", !!api?.open && !!api.rules?.CULT_KINDS?.netaru && keep.on !== undefined && !!scene,
        {kinds: Object.keys(api?.rules?.CULT_KINDS ?? {}).length, scene: scene?.name ?? null});
      await game.settings.set(MOD, "cultsOn", true);
      await game.settings.set(MOD, "cultWords", true);
      await game.settings.set(MOD, "npcCults", false);
    });

    await step("2. words heard add awe; words alone add none", async () => {
      const size = scene.grid.size;
      founder = await Actor.create({name: "Gate Wandering Preacher", type: "Mortal"});
      actors.push(founder);
      const [ft] = await scene.createEmbeddedDocuments("Token", [{actorId: founder.id, name: founder.name, x: size * 2, y: size * 2, actorLink: true}]);
      tokens.push(ft.id);
      // Nobody near yet: the words count for nothing
      await ChatMessage.create({content: "Be saved by the blood, all of you!", speaker: {scene: scene.id, token: ft.id, actor: founder.id, alias: founder.name}, style: CONST.CHAT_MESSAGE_STYLES.IC});
      await sleep(800);
      const alone = npc().cults.aweOf(game.actors.get(founder.id)).places[scene.uuid]?.pts ?? 0;
      for ( let i = 0; i < 3; i++ ) {
        const a = await Actor.create({name: `Gate Listener ${i + 1}`, type: "Mortal"});
        actors.push(a);
        const [t] = await scene.createEmbeddedDocuments("Token", [{actorId: a.id, name: a.name, x: size * (3 + i), y: size * 3, actorLink: true}]);
        tokens.push(t.id);
      }
      await ChatMessage.create({content: "Be saved by the blood, all of you! The end is near.", speaker: {scene: scene.id, token: ft.id, actor: founder.id, alias: founder.name}, style: CONST.CHAT_MESSAGE_STYLES.IC});
      await sleep(800);
      const p = npc().cults.aweOf(game.actors.get(founder.id)).places[scene.uuid];
      ok("2. words heard add awe; words alone add none", alone === 0 && p?.pts === 1 && p.touched === 3 && p.themes.salvation > 0 && p.themes.blood > 0 && p.themes.doom > 0,
        {alone, place: p ?? null});
    });

    await step("3. awe of 10 proposes a following", async () => {
      for ( let i = 0; i < 3; i++ ) await npc().cults.addDeed(game.actors.get(founder.id), {kind: "power", themes: {healing: 2}, text: "Gate healing"});
      await sleep(400);
      const entry = chron().approvals.pending().find(p => p.type === `${MOD}.cultForms` && p.data?.actorId === founder.id);
      R.entry = entry?.id ?? null;
      ok("3. awe of 10 proposes a following", !!entry, {title: entry?.title ?? null, pts: npc().cults.aweOf(game.actors.get(founder.id)).places[scene.uuid]?.pts});
    });

    await step("4. approved, the cult exists", async () => {
      if ( R.entry ) await chron().approvals.decide(R.entry, "approve", "Gate cults");
      await sleep(400);
      const c = npc().cults.list().find(x => x.founder?.id === founder.id && !x.ended);
      cultId = c?.id ?? null;
      const s = c ? npc().cults.rules.summary(c, Number(chron().eras?.currentYear?.()) || 1197) : null;
      ok("4. approved, the cult exists", !!c && c.kind === "sect" && c.members >= 3 && /believe/.test(s?.creed ?? "") && !!s?.gives && c.place?.key === scene.uuid,
        {name: c?.name, kind: c?.kind, members: c?.members, word: s?.word, creed: s?.creed});
    });

    await step("5. gathering and ordination", async () => {
      const before = npc().cults.list().find(x => x.id === cultId)?.attention ?? 0;
      await npc().cults.gather({cultId});
      const listener = actors[1];
      const c = await npc().cults.ordain(cultId, listener, "ordained");
      const after = npc().cults.list().find(x => x.id === cultId);
      ok("5. gathering and ordination", (after?.attention ?? 0) >= before + 2 && after?.named?.some(m => m.id === listener.id && m.rank === "ordained"), {attention: after?.attention, named: after?.named});
    });

    await step("6. a cult turn by hand", async () => {
      const before = npc().cults.list().find(x => x.id === cultId);
      const n0 = game.messages.size;
      await npc().cults.runTurns({forced: true});
      await sleep(400);
      const after = npc().cults.list().find(x => x.id === cultId);
      ok("6. a cult turn by hand", !!after && after.devotion >= before.devotion && after.lastTurn === game.time.worldTime && after.attention === 0 && game.messages.size > n0,
        {before: {devotion: before?.devotion, members: before?.members}, after: {devotion: after?.devotion, members: after?.members, exposure: after?.exposure}});
    });

    await step("7. the Following window", async () => {
      const d1 = await npc().cults.open(game.actors.get(founder.id));
      await sleep(300);
      const text1 = d1?.element?.textContent ?? "";
      await d1?.close?.();
      canvas.tokens.releaseAll?.();
      const d2 = await npc().cults.open(null);
      await sleep(300);
      const text2 = d2?.element?.textContent ?? "";
      await d2?.close?.();
      ok("7. the Following window", /Where people speak of Gate Wandering Preacher/.test(text1) && /Hold a gathering/.test(text1) && /Every cult in the chronicle/.test(text2), {len1: text1.length, len2: text2.length});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("8. clean up", async () => {
      const sceneId = scene?.id;
      for ( const p of chron().approvals.pending().filter(x => String(x.type).startsWith(`${MOD}.cult`)) ) await chron().approvals.decide(p.id, "reject", "Gate cults clean up");
      if ( sceneId ) await game.scenes.get(sceneId)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      await game.settings.set(MOD, "cults", keep.cults);
      await game.settings.set(MOD, "cultState", keep.state);
      await game.settings.set(MOD, "cultWords", keep.words);
      await game.settings.set(MOD, "npcCults", keep.npcs);
      await game.settings.set(MOD, "cultsOn", keep.on);
      const extra = game.messages.filter(m => !msgs.has(m.id)).map(m => m.id);
      if ( extra.length ) await ChatMessage.deleteDocuments(extra);
      ok("8. clean up", game.time.worldTime === t0 && !actors.some(a => game.actors.get(a.id)) && !game.scenes.get(sceneId) && game.settings.get(MOD, "cultsOn") === keep.on, {clock: game.time.worldTime === t0});
    });
  }
  return save(R, "gatecults-result.json");
}
