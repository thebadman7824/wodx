/**
 * WoDX NPC gate: aftercare, what NPCs do once they have carried someone where they meant to (B5710 to B5721, Ben's
 * Aftercare Desk a1-a12), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecarryaftercare.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors, tokens and faction, and removes them; never moves the clock (it runs the
 * day with api.carryAftercare.day and makes a disposal due rather than waiting).
 *   1. a hurt ally (a1): laid down at home, tended by the household's healer, kept as a ward; a day later the
 *      bruises are gone and the ward with them
 *   2. a Cainite ally (a1): fed by a vessel on arrival and the blood spent on the wounds
 *   3. a dead mortal ally (a3): the faith's rite, a grave pin on the map, the funeral kept on the actor
 *   4. a Cainite's Final Death (a4): the remains leave the map, the faction loses a dot of Status
 *   5. a dead foe (a5): once due, the token leaves the map, its body marks go, and the takers' evidence there is cleared
 *   6. a captive's things (a6): the sword leaves the captive and its line goes into the chest at the watch-house
 *   7. a day in the cells (a7-a9): a Cainite captor questions the prisoner (a secret found), feeds on them (the
 *      captor's blood up, the prisoner's bashing up), and the bonds are tried
 *   8. after a week (a10): the captors decide; it is done, or a killing waits on an approval card
 *   9. the prisoner's own faction comes for them (a11): with the dice on their side, the prisoner is free
 *  10. a player's character held (a12): a card with Try the bonds, Talk and Wait; Wait answers with a card
 * Result: Data/wodx-gate/gatecarryaftercare-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables", NPC = "wodx-npc", ACT = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const person = (name, {type = "Mortal", int = 2, med = 0, man = 2, intim = 0, wp = 5, dex = 2} = {}) => ({name, type,
  system: {attributes: {intelligence: {value: int}, manipulation: {value: man}, dexterity: {value: dex}, strength: {value: 1}, charisma: {value: 2}},
    abilities: {medicine: {value: med}, intimidation: {value: intim}, larceny: {value: 0}, athletics: {value: 0}}, advantages: {willpower: {permanent: wp, temporary: wp}}}});
const dmg = a => a.system?.health?.damage ?? {};

export async function run() {
  const G = gate("gatecarryaftercare");
  if ( G.notLive() ) return "Not on the Live world.";
  const saved = {};
  for ( const k of ["wards", "prisoners", "stores", "factions"] ) saved[k] = foundry.utils.deepClone(game.settings.get(NPC, k));
  const savedEvidence = foundry.utils.deepClone(game.settings.get(IX, "evidence"));
  const madeItems = [];
  try {
    const N = () => game.modules.get(NPC)?.api, AC = () => N()?.carryAftercare, C = () => game.modules.get("wodx-chronicle")?.api;
    const scene = await G.scene({width: 3000, height: 2000});
    const [home, watch] = await scene.createEmbeddedDocuments("Region", [
      {name: "Gate Aftercare home", shapes: [{type: "rectangle", x: 200, y: 200, width: 400, height: 400}], flags: {[NPC]: {place: {kind: "home"}}}},
      {name: "Gate Aftercare watch-house", shapes: [{type: "rectangle", x: 2000, y: 200, width: 400, height: 400}], flags: {[NPC]: {place: {kind: "gate"}}}}]);
    const [ada, bo, cy, dan, eva, fil, gil, hed, ivy] = await G.make(Actor, [
      person("Gate Aftercare Ada (healer)", {int: 4, med: 4}), person("Gate Aftercare Bo (hurt)"), person("Gate Aftercare Cy (Cainite)", {type: "Vampire"}),
      person("Gate Aftercare Dan (dead)"), person("Gate Aftercare Eva (Cainite, ash)", {type: "Vampire"}), person("Gate Aftercare Fil (foe)"),
      person("Gate Aftercare Gil (captor)", {type: "Vampire", man: 5, intim: 5}), person("Gate Aftercare Hed (prisoner)", {wp: 3, dex: 0}), person("Gate Aftercare Ivy (player)")]);
    const [ta, tb, tc, td, te, tf, tg, th, ti] = await G.tokens(scene, [{actor: ada, x: 3, y: 3, actorLink: true}, {actor: bo, x: 4, y: 3, actorLink: true},
      {actor: cy, x: 5, y: 3, actorLink: true}, {actor: dan, x: 3, y: 4, actorLink: true}, {actor: eva, x: 4, y: 4, actorLink: true}, {actor: fil, x: 10, y: 10, actorLink: true},
      {actor: gil, x: 21, y: 3, actorLink: true}, {actor: hed, x: 22, y: 3, actorLink: true}, {actor: ivy, x: 23, y: 3, actorLink: true}]);
    await waitFor(() => [ta, tb, tc, td, te, tf, tg, th, ti].every(t => t?.object));
    await ada.setFlag(NPC, "routine", {on: false, roles: {home: home.uuid}});
    const taken = (actor, tok, by, o) => AC().taken({actor: actor.id, body: tok.uuid, name: actor.name, by: by?.uuid ?? null, byActor: by?.actor?.id ?? null,
      place: o.place ?? null, placeName: o.placeName ?? "the gate's place", intent: o.intent, dead: !!o.dead, faction: o.faction ?? null, offstage: false});

    await G.step("1. a hurt ally tended and mended", async () => {
      await bo.update({"system.health.damage.bashing": 2});
      await taken(bo, tb, ta, {intent: "safe", place: home.uuid, placeName: "Gate Aftercare home"});
      const ward = AC().wards().some(w => w.actor === bo.id && w.kind === "hurt");
      const msg = game.messages.contents.slice(-6).some(m => /tends Gate Aftercare Bo/.test(m.content));
      await AC().day();
      const whole = await waitFor(() => !Number(dmg(bo).bashing), 4000);
      G.ok("1. a hurt ally tended and mended", ward && msg && whole && !AC().wards().some(w => w.actor === bo.id), {ward, msg, damage: dmg(bo)});
    });

    await G.step("2. a Cainite fed and mended", async () => {
      await cy.update({"system.advantages.bloodpool.temporary": 1, "system.advantages.bloodpool.max": 10, "system.health.damage.lethal": 2});
      await taken(cy, tc, ta, {intent: "safe", place: home.uuid, placeName: "Gate Aftercare home"});
      const mended = await waitFor(() => !Number(dmg(cy).lethal), 4000);
      G.ok("2. a Cainite fed and mended", mended && Number(cy.system.advantages.bloodpool.temporary) === 2, {blood: cy.system.advantages.bloodpool.temporary, damage: dmg(cy)});
    });

    await G.step("3. a funeral by faith", async () => {
      await dan.setFlag(NPC, "hurtBy", {id: fil.id, name: fil.name, worldTime: game.time.worldTime});
      await taken(dan, td, ta, {intent: "burial", dead: true, place: home.uuid, placeName: "Gate Aftercare home"});
      const f = await waitFor(() => dan.getFlag(NPC, "funeral"), 4000);
      const pin = scene.notes.find(n => n.flags?.[NPC]?.grave === dan.id);
      G.ok("3. a funeral by faith", !!f && !!pin && /Gate Aftercare Dan/.test(pin.text ?? ""), {funeral: f, pin: pin?.text ?? null});
    });

    const fid = `gate-aftercare-${G.run}`, oid = `gate-aftercare-own-${G.run}`;
    await N().factions?.applyNow?.([{op: "faction-add", faction: {id: fid, name: "Gate Aftercare Watch", kind: "mercenaries", members: [gil.id, eva.id], assets: {status: 3, security: 0, resources: 1}}},
      {op: "faction-add", faction: {id: oid, name: "Gate Aftercare Kin", kind: "folk", members: [hed.id], assets: {retainers: 5, resources: 2}}}]);
    const fac = id => (N().factions?.state?.()?.factions ?? []).find(f => f.id === id);

    await G.step("4. Final Death", async () => {
      await taken(eva, te, tg, {intent: "rest", dead: true, place: home.uuid, placeName: "Gate Aftercare home"});
      const gone = await waitFor(() => te.hidden && eva.getFlag(NPC, "finalDeath"), 4000);
      const status = await waitFor(() => fac(fid)?.assets?.status === 2, 4000);
      G.ok("4. Final Death", !!gone && !!status, {hidden: te.hidden, status: fac(fid)?.assets?.status});
    });

    await G.step("5. a dead foe disposed of", async () => {
      await tf.update({"flags.wodx-storyteller.remains": {since: game.time.worldTime, place: "indoors"}});
      const ev = game.settings.get(IX, "evidence") ?? {list: []};
      await game.settings.set(IX, "evidence", {...ev, list: [...(ev.list ?? []), {id: `gateac${G.run}`, kind: "blood", scene: scene.id, at: game.time.worldTime, by: gil.id, byName: gil.name, text: "Someone was hurt here."}]});
      await taken(fil, tf, tg, {intent: "hidden", dead: true, faction: fid});
      await game.settings.set(NPC, "wards", AC().wards().map(w => (w.actor === fil.id && w.kind === "dispose" ? {...w, due: game.time.worldTime - 1} : w)));
      await game.settings.set(NPC, "aftercareClock", game.time.worldTime);
      await AC().tick();
      const gone = await waitFor(() => tf.hidden && !tf.flags?.["wodx-storyteller"]?.remains, 4000);
      const clean = !(game.settings.get(IX, "evidence")?.list ?? []).some(e => e.id === `gateac${G.run}`);
      G.ok("5. a dead foe disposed of", !!gone && clean && !!fil.getFlag(NPC, "disposed"), {hidden: tf.hidden, clean, disposed: fil.getFlag(NPC, "disposed")});
    });

    await G.step("6. a captive's things into the chest", async () => {
      const [sword] = await hed.createEmbeddedDocuments("Item", [{name: "Gate Aftercare sword", type: "Melee Weapon"}]);
      const [chest] = await scene.createEmbeddedDocuments("Tile", [{x: 2100, y: 300, width: 100, height: 100, texture: {src: "icons/svg/chest.svg"}, flags: {[IX]: {kind: "chest", title: "Gate Aftercare chest", items: ""}}}]);
      const e = {captive: hed.id, token: th.uuid, name: hed.name, captor: gil.id, captorName: gil.name, faction: fid, factionName: "Gate Aftercare Watch", place: watch.uuid, placeName: "Gate Aftercare watch-house", pc: false, since: game.time.worldTime, freed: null};
      await game.settings.set(NPC, "prisoners", [...(game.settings.get(NPC, "prisoners") ?? []), e]);
      await taken(hed, th, tg, {intent: "prison", place: watch.uuid, placeName: "Gate Aftercare watch-house", faction: fid});
      const off = await waitFor(() => !hed.items.get(sword.id), 4000);
      const line = String(scene.tiles.get(chest.id)?.flags?.[IX]?.items ?? "");
      const uuid = line.split("\n").find(Boolean);
      const it = uuid ? fromUuidSync(uuid) : null;
      if ( it ) madeItems.push(it);
      G.ok("6. a captive's things into the chest", !!off && it?.name === "Gate Aftercare sword", {line, item: it?.name ?? null});
    });

    await G.step("7. a day in the cells", async () => {
      await hed.setFlag(NPC, "secrets", [{id: "gatesecret", kind: "crime", text: "Gate Aftercare: hid the reeve's ledger", weight: 1, found: {}}]);
      await gil.update({"system.advantages.bloodpool.temporary": 3, "system.advantages.bloodpool.max": 10});
      await hed.update({"system.health.damage.bashing": 0});
      let found = false, round = 0;
      while ( !found && round < 4 ) {
        await game.settings.set(NPC, "prisoners", (game.settings.get(NPC, "prisoners") ?? []).map(x => (x.captive === hed.id ? {...x, askedOn: 0, bonds: 0} : x)));
        await AC().day(game.time.worldTime + round);
        found = !!(hed.getFlag(NPC, "secrets") ?? [])[0]?.found?.[gil.id];
        round++;
      }
      const fed = Number(gil.system.advantages.bloodpool.temporary) > 3 && Number(dmg(hed).bashing) > 0;
      const p = (game.settings.get(NPC, "prisoners") ?? []).find(x => x.captive === hed.id);
      G.ok("7. a day in the cells", found && fed && Number.isFinite(Number(p?.bonds ?? 0)), {found, rounds: round, blood: gil.system.advantages.bloodpool.temporary, damage: dmg(hed), bonds: p?.bonds});
    });

    await G.step("8. after a week", async () => {
      await game.settings.set(NPC, "prisoners", (game.settings.get(NPC, "prisoners") ?? []).map(x => (x.captive === hed.id ? {...x, since: game.time.worldTime - 8 * 86400, bonds: 0} : x)));
      await AC().day();
      const p = (game.settings.get(NPC, "prisoners") ?? []).find(x => x.captive === hed.id);
      const asked = C()?.approvals?.pending?.().find(a => a.type === "npc-prisoner-fate" && a.data?.captive === hed.id);
      G.ok("8. after a week", !!p?.freed || !!asked, {freed: p?.freed ?? null, asked: asked?.title ?? null});
      // put them back in the cells for the rescue
      if ( asked ) await C().approvals.decide(asked.id, "reject");
      await game.settings.set(NPC, "prisoners", [...(game.settings.get(NPC, "prisoners") ?? []).filter(x => x.captive !== hed.id),
        {captive: hed.id, token: th.uuid, name: hed.name, captor: gil.id, captorName: gil.name, faction: fid, factionName: "Gate Aftercare Watch", place: watch.uuid, placeName: "Gate Aftercare watch-house", pc: false, since: game.time.worldTime, freed: null}]);
    });

    await G.step("9. their own come for them", async () => {
      let free = false, k = 0;
      while ( !free && k < 6 ) { await AC().factionTurn(); free = !N().carryGoals.prisoners().some(x => x.captive === hed.id); k++; }
      G.ok("9. their own come for them", free, {tries: k});
    });

    await G.step("10. a player's character held", async () => {
      const player = game.users.find(u => !u.isGM);
      if ( !player ) { G.ok("10. a player's character held", true, {skipped: "no player user in this world"}); return; }
      await ivy.update({[`ownership.${player.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});
      await game.settings.set(NPC, "prisoners", [...(game.settings.get(NPC, "prisoners") ?? []),
        {captive: ivy.id, token: ti.uuid, name: ivy.name, captor: gil.id, captorName: gil.name, faction: fid, factionName: "Gate Aftercare Watch", place: watch.uuid, placeName: "Gate Aftercare watch-house", pc: true, since: game.time.worldTime, freed: null}]);
      await AC().day();
      const c = await waitFor(() => game.messages.contents.slice(-12).find(m => /data-wnpc-held="escape"/.test(m.content) && m.content.includes(ivy.id)), 4000);
      await AC().held(ivy.id, "wait", "the gate");
      const waited = await waitFor(() => game.messages.contents.slice(-6).some(m => /keeps still and watches/.test(m.content)), 4000);
      G.ok("10. a player's character held", !!c && !!c.whisper?.includes(player.id) && !!waited, {card: !!c, toPlayer: !!c?.whisper?.includes(player.id), waited});
      await ivy.update({[`ownership.-=${player.id}`]: null}).catch(() => null);
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    try {
      for ( const k of Object.keys(saved) ) await game.settings.set(NPC, k, saved[k]);
      await game.settings.set(IX, "evidence", savedEvidence);
      for ( const it of madeItems ) await it.delete().catch(() => null);
      const fo = game.folders.find(f => f.type === "Item" && f.name === "WoDX: captors' stores");
      if ( fo && !game.items.some(i => i.folder?.id === fo.id) ) await fo.delete().catch(() => null);
    } catch (e) { G.R.notes.push(`put back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
