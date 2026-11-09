/**
 * The other worlds, part two (WoDX Otherworlds 0.4.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gaterealms.mjs?${Date.now()}`)).run()
 * It makes two scenes and three actors of its own and deletes them at the end; it puts back the approval queue, the
 * Avatar Storm setting and the journey counter. The clock never moves.
 *   1. the module: Otherworlds 0.4.0 or later, api.realms, its four settings, the three new statuses
 *   2. two scenes of its own, each with a level
 *   3. a Near Dreaming level on each: elevation 3000, the map warmer, flagged dreaming
 *   4. a gateway in: the changeling goes through to the Dreaming level; the mortal, not enchanted, stays; a card
 *   5. layer sound: the changeling's token asks for dreaming.ogg
 *   6. back out: on the physical level again, the status gone
 *   7. a trod between the two scenes: a region on each Dreaming level with its kind and a Teleport Token behavior
 *   8. the Avatar Storm: raging, a mage's Shredding Winds roll (set dice) is a card with the levels; never happened, no roll
 *   9. journeys: a twilight road carries its time on the trod; a Moon Bridge is one leg
 *  10. Disembodiment: beyond the Penumbra for 90 days goes to the approval queue once
 *  11. the Net: shut before 1990 in this era's year, or open after; Net combat against a system makes a card
 *  12. clean up
 * Result: Data/wodx-gate/gaterealms-result.json.
 */
const MOD = "wodx-otherworlds";
const CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };
const clone = v => foundry.utils.deepClone(v);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gaterealms-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const O = game.modules.get(MOD)?.api, X = O?.realms, C = game.modules.get(CH)?.api;
  const viewed = canvas.scene?.id;
  const keep = {approvals: clone(get(CH, "approvals") ?? {pending: [], history: []}), storm: get(MOD, "avatarStorm"), journeyCount: get(MOD, "journeyCount"),
    msgs: new Set(game.messages.map(m => m.id))};
  const scenes = [], actors = [];
  const newMsgs = () => game.messages.filter(m => !keep.msgs.has(m.id));
  try {
    const m = game.modules.get(MOD);
    const statuses = ["wodx-dreaming", "wodx-deep-umbra", "wodx-net"].every(id => CONFIG.statusEffects.some(e => e.id === id));
    ok("1. module", m?.active && !foundry.utils.isNewerVersion("0.4.0", m.version) && !!X?.dreamingGate
      && ["avatarStorm", "layerSound", "layerVolume", "layerRoot"].every(k => game.settings.settings.has(`${MOD}.${k}`)) && statuses, {version: m?.version, statuses});

    for ( const name of ["WoDX gate: Realms A", "WoDX gate: Realms B"] ) scenes.push(await Scene.create({name, width: 1600, height: 1200, grid: {size: 100}, padding: 0, tokenVision: false}));
    await sleep(500);
    const L = s => O.twins.layersOf(game.scenes.get(s.id));
    ok("2. scenes", scenes.every(s => !!L(s).physical), {levels: scenes.map(s => game.scenes.get(s.id).levels?.size)});

    for ( const s of scenes ) await X.addDreamingLevel(game.scenes.get(s.id));
    await sleep(400);
    const dl = L(scenes[0]).dreaming;
    ok("3. Near Dreaming level", scenes.every(s => !!L(s).dreaming) && dl?.elevation?.bottom === 3000 && dl?.getFlag(MOD, "layer") === "dreaming",
      {bottom: dl?.elevation?.bottom, tint: dl?.background?.tint});

    const mk = async (name, type, up = {}) => { const a = await Actor.create({name: `WoDX gate: ${name}`, type}); actors.push(a); await sleep(200); if ( Object.keys(up).length ) await a.update(up); return a; };
    const fae = await mk("Fae", "Changeling", {"system.advantages.glamour.permanent": 4, "system.advantages.glamour.temporary": 4, "system.advantages.banality.permanent": 3, "system.advantages.banality.temporary": 3});
    const mortal = await mk("Mortal", "Mortal");
    const mage = await mk("Mage", "Mage", {"system.advantages.arete.permanent": 3, "system.paradox.permanent": 1});
    const A = game.scenes.get(scenes[0].id);
    const place = (a, x) => ({...a.prototypeToken.toObject(), actorId: a.id, actorLink: true, name: a.name.replace("WoDX gate: ", ""), x, y: 400, level: L(A).physical.id});
    await A.createEmbeddedDocuments("Token", [place(fae, 300), place(mortal, 500), place(mage, 700)]);
    await A.view(); await sleep(1500);
    const tok = Object.fromEntries(canvas.tokens.placeables.map(t => [t.name, t]));
    tok.Fae.control({releaseOthers: true}); tok.Mortal.control({releaseOthers: false}); await sleep(300);
    await X.dreamingGate({enchanted: []}); await sleep(800);
    const lay = t => O.twins.tokenLayer(A.tokens.get(t.id));
    const inCard = newMsgs().find(x => /Into the Near Dreaming/.test(x.content ?? ""));
    ok("4. a gateway in", lay(tok.Fae) === "dreaming" && fae.statuses.has("wodx-dreaming") && lay(tok.Mortal) === "physical" && !mortal.statuses.has("wodx-dreaming")
      && /stays behind/.test(inCard?.content ?? ""), {fae: lay(tok.Fae), mortal: lay(tok.Mortal)});

    tok.Fae.control({releaseOthers: true}); await sleep(400);
    const want = X.wantedLayerSound();
    ok("5. layer sound", /\/dreaming\.ogg$/.test(want ?? ""), {want, playing: X.layerSoundNow()});

    tok.Fae.control({releaseOthers: true}); await sleep(200);
    await X.dreamingGate({leave: true}); await sleep(800);
    ok("6. back out", lay(tok.Fae) === "physical" && !fae.statuses.has("wodx-dreaming") && !X.wantedLayerSound(), {fae: lay(tok.Fae)});

    const trod = await X.makeTrod(A, game.scenes.get(scenes[1].id), {kind: "balor"});
    const fromR = trod?.from, toR = trod?.to;
    ok("7. a trod", fromR?.getFlag(MOD, "trod") === "balor" && fromR.levels.has(L(A).dreaming.id) && toR?.levels?.has(L(scenes[1]).dreaming.id)
      && fromR.behaviors.some(b => b.type === "teleportToken"), {name: fromR?.name});

    await game.settings.set(MOD, "avatarStorm", "on");
    const shred = await X.shreddingWinds(A.tokens.get(tok.Mage.id), {dice: [6, 7, 1, 2]});
    const stormCard = newMsgs().find(x => /Shredding Winds/.test(x.content ?? ""));
    await game.settings.set(MOD, "avatarStorm", "off");
    const none = await X.shreddingWinds(A.tokens.get(tok.Mage.id), {dice: [6]});
    ok("8. the Avatar Storm", shred?.levels === 1 && shred.pool === 4 && !!stormCard && none?.off === true, {shred, none});

    const tw = O.journey.draw({realm: "trod-twilight", hours: 4}), mb = O.journey.draw({realm: "moonbridge", hours: 30});
    ok("9. journeys", !!tw?.arrival && tw.legs.every(l => l.landmark) && mb?.legs?.length === 1 && /thousandth/.test(mb.note ?? ""), {arrival: tw?.arrival, mbLegs: mb?.legs?.length});

    await mage.toggleStatusEffect("wodx-deep-umbra", {active: true}); await sleep(500);
    const since = mage.getFlag(MOD, "deepSince");
    await mage.setFlag(MOD, "deepSince", game.time.worldTime - 90 * 86400);
    const n1 = await X.checkDisembodiment(); const n2 = await X.checkDisembodiment();
    const pending = (get(CH, "approvals")?.pending ?? []).find(p => p.type === "wodx-disembodiment" && p.data?.actorId === mage.id);
    ok("10. Disembodiment", Number.isFinite(since) && n1 === 1 && n2 === 0 && !!pending, {since, n1, n2});

    const year = C?.eras?.currentYear?.();
    const open = X.netOpen();
    tok.Mage.control({releaseOthers: true}); await sleep(200);
    const jacked = await X.jack();
    const net = await X.netContest({a: A.tokens.get(tok.Mage.id), system: 4, programA: 1});
    const netCard = newMsgs().find(x => /Net combat/.test(x.content ?? ""));
    ok("11. the Net", open === (Number(year) >= 1990) && (open ? jacked?.length === 1 : !jacked) && ["a", "b", null].includes(net?.winner) && !!netCard, {year, open, net});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
      await sleep(800);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      const mine = newMsgs().map(x => x.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      await game.settings.set(CH, "approvals", keep.approvals);
      if ( keep.storm !== undefined ) await game.settings.set(MOD, "avatarStorm", keep.storm);
      if ( keep.journeyCount !== undefined ) await game.settings.set(MOD, "journeyCount", keep.journeyCount);
      await X?.applyLayerSound?.();
      ok("12. clean up", !scenes.some(s => game.scenes.get(s.id)) && !actors.some(a => game.actors.get(a.id)) && get(MOD, "avatarStorm") === keep.storm);
    } catch (err) { ok("12. clean up", false, {error: err.message}); }
  }
  return save(R);
}
