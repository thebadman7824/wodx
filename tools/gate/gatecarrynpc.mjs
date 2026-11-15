/**
 * WoDX NPC and WoDX Solo gate: NPCs and companions pick up the fallen (B5077, B5079, Ben's Carry Bodies Desk c8 and
 * c10), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecarrynpc.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors and tokens through WoDX Interactables' carrying, and removes them; never moves
 * the clock.
 *   1. rescue: a beaten guard with a fallen comrade beside it plans "Carry off" first, above fleeing
 *   2. it does it: the guard takes hold and goes, and the body comes along on the map
 *   3. Undo lets go and puts both back
 *   4. capture: with no foe standing in reach, a guard plans to take a downed enemy captive
 *   5. "Leaves the fallen where they lie" switches it off for that NPC
 *   6. a companion: WoDX Solo picks the follower who serves the fallen character, and orderCarry has them carry
 *   7. rescued home (B5087): a guard carries a fallen comrade into the region tagged as the guard's home and sets them down
 *   8. hidden (B5088): a body goes into the nearest wardrobe, as one of its occupants and out of sight
 *   9. captive (B5089): a captive is carried to the captor's watch-house, tied, put on the prisoners list, and the news
 *      goes out (wodxCaptive); setting them free unties them and clears the list
 *  10. a player's character (B5089): the NPC asks the Storyteller first; approval ties them and takes them there at once
 *  11. to another map (B5087, travel time): with the home on another scene, carrier and body leave by the edge, a trip is
 *      kept, and when it is due both stand in that place on the other map (the gate makes the trip due rather than
 *      moving the clock)
 * Result: Data/wodx-gate/gatecarrynpc-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables", NPC = "wodx-npc";
const body = (name, {str = 2} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: 2, total: 2}, stamina: {value: 2, total: 2}}, abilities: {athletics: {value: 1}, brawl: {value: 1}}}});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = CONST.TOKEN_DISPOSITIONS.HOSTILE, F = CONST.TOKEN_DISPOSITIONS.FRIENDLY;

export async function run() {
  const G = gate("gatecarrynpc");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const hx = () => game.modules.get(IX)?.api?.haul, N = () => game.modules.get(NPC)?.api, S = () => game.modules.get("wodx-solo")?.api;
    const scene = await G.scene({width: 3000, height: 2000});
    const [gus, hal, ivo, jo, kai, lea] = await G.make(Actor, [
      body("Gate Carry Gus", {str: 3}), body("Gate Carry Hal"), body("Gate Carry Ivo"), body("Gate Carry Jo"), body("Gate Carry Kai", {str: 3}), body("Gate Carry Lea")]);
    const [tg, th, ti, tj, tk, tl] = await G.tokens(scene, [
      {actor: gus, x: 10, y: 10, actorLink: true, disposition: H}, {actor: hal, x: 11, y: 10, actorLink: true, disposition: H},
      {actor: ivo, x: 10, y: 11, actorLink: true, disposition: F}, {actor: jo, x: 20, y: 5, actorLink: true, disposition: F},
      {actor: kai, x: 3, y: 15, actorLink: true, disposition: F}, {actor: lea, x: 4, y: 15, actorLink: true, disposition: F}]);
    await waitFor(() => [tg, th, ti, tj, tk, tl].every(t => t?.object));
    await gus.setFlag(NPC, "behavior", {fleeAt: 1});
    await gus.update({"system.health.damage.lethal": 2}).catch(() => null);
    await hal.toggleStatusEffect("unconscious", {active: true});
    await waitFor(() => hx()?.fallenOf?.(th)?.down, 4000);

    let plan = null;
    await G.step("1. rescue planned", async () => {
      plan = N().planTurn(tg.object, null);
      const top = plan.options[0];
      const flee = plan.options.find(o => o.action === "flee");
      G.ok("1. rescue planned", top?.action === "carry" && top.target === th.id && top.intent === "rescue" && (!flee || top.score > flee.score),
        {options: plan.options.slice(0, 4).map(o => [o.label, o.score, o.why])});
    });

    let snap = null;
    await G.step("2. carried off", async () => {
      const opt = plan.options[0];
      snap = N().snapshot([tg.object, th.object]);
      const from = {x: tg.x, y: tg.y};
      const r = await N().execute(tg.object, opt);
      const held = r?.arrived || await waitFor(() => tg.flags?.[IX]?.hauling?.what === th.uuid, 6000);
      const moved = await waitFor(() => tg.x !== from.x || tg.y !== from.y, 6000);
      await sleep(800);
      const along = Math.hypot(th.x - tg.x, th.y - tg.y) <= 150;
      G.ok("2. carried off", r?.done && held && moved && along, {r, at: [tg.x, tg.y, th.x, th.y], from});
    });

    await G.step("3. Undo lets go", async () => {
      await N().undo(snap);
      const free = await waitFor(() => !tg.flags?.[IX]?.hauling && !(th.flags?.[IX]?.haul?.by ?? []).length, 6000);
      const back = snap.tokens.every(s => { const d = fromUuidSync(s.uuid); return d && d.x === s.x && d.y === s.y; });
      G.ok("3. Undo lets go", free && back, {gus: [tg.x, tg.y], hal: [th.x, th.y], snap: snap.tokens.map(s => [s.x, s.y])});
    });

    await G.step("4. capture planned", async () => {
      // Gus whole again; Ivo (an enemy to Gus) goes down beside Gus; Jo, the other enemy, stands far off
      await gus.update({"system.health.damage.lethal": 0}).catch(() => null);
      await gus.setFlag(NPC, "behavior", {template: "guard", fears: [], fleeAt: 5});
      await hal.toggleStatusEffect("unconscious", {active: false});
      await ivo.toggleStatusEffect("unconscious", {active: true});
      // Kai and Lea stand aside (hidden) so Gus is not outnumbered and running; they come back for step 6
      await scene.updateEmbeddedDocuments("Token", [{_id: tk.id, hidden: true}, {_id: tl.id, hidden: true}]);
      await waitFor(() => hx().fallenOf(ti).down && !hx().fallenOf(th).down, 4000);
      const p = N().planTurn(tg.object, null);
      const cap = p.options.find(o => o.action === "carry");
      G.ok("4. capture planned", cap?.intent === "capture" && cap.target === ti.id, {options: p.options.slice(0, 5).map(o => [o.label, o.score, o.why])});
    });

    await G.step("5. the switch", async () => {
      await gus.setFlag(NPC, "behavior", {template: "guard", fears: [], fleeAt: 5, noCarry: true});
      const p = N().planTurn(tg.object, null);
      G.ok("5. the switch", !p.options.some(o => o.action === "carry"), {options: p.options.map(o => o.label)});
      await gus.setFlag(NPC, "behavior", {template: "guard", fears: [], fleeAt: 5});
    });

    await G.step("6. a companion carries", async () => {
      // Lea serves Kai; Kai goes down; Solo picks Lea, and WoDX NPC's orderCarry has Lea carry Kai
      await scene.updateEmbeddedDocuments("Token", [{_id: tk.id, hidden: false}, {_id: tl.id, hidden: false}]);
      await lea.setFlag(NPC, "serves", [kai.id]);
      await kai.toggleStatusEffect("unconscious", {active: true});
      await waitFor(() => hx().fallenOf(tk).down, 4000);
      const pick = S()?.carry?.companionFor?.(tk, kai);
      const from = {x: tk.x, y: tk.y};
      const r = await N().orderCarry(tl.object, tk.object);
      // held on the way, or (B5087) already set down where they were going, or carried off the map
      const held = await waitFor(() => tl.flags?.[IX]?.hauling?.what === tk.uuid || tk.hidden || tk.x !== from.x || tk.y !== from.y, 6000);
      G.ok("6. a companion carries", pick?.id === tl.id && r?.ok && held && game.settings.get("wodx-solo", "carry") === true,
        {pick: pick?.name ?? null, r, held});
      await hx().release(tl, {quiet: true});
    });

    // B5087 to B5089: where they take them. The guards' own places are regions on this map.
    const savedPrisoners = foundry.utils.deepClone(game.settings.get(NPC, "prisoners") ?? []);
    const [home, watch] = await scene.createEmbeddedDocuments("Region", [
      {name: "Gate Carry home", shapes: [{type: "rectangle", x: 1400, y: 1200, width: 300, height: 300}], flags: {[NPC]: {place: {kind: "home"}}}},
      {name: "Gate Carry watch-house", shapes: [{type: "rectangle", x: 2400, y: 300, width: 300, height: 300}], flags: {[NPC]: {place: {kind: "gate"}}}}]);
    const inside = (d, r) => { const s = r.shapes[0]; const cx = d.x + 50, cy = d.y + 50; return cx >= s.x - 100 && cx <= s.x + s.width + 100 && cy >= s.y - 100 && cy <= s.y + s.height + 100; };
    const walkOn = async (tok, opt, turns = 8) => { let r = null; for ( let k = 0; k < turns; k++ ) { r = await N().execute(tok.object, opt); if ( r?.arrived || !r?.done ) break; await sleep(300); } return r; };
    const reset = async (doc, x, y) => { await hx().release(doc, {quiet: true}).catch(() => null); await doc.update({x, y, hidden: false}, {animate: false}); };

    await G.step("7. rescued home", async () => {
      await gus.setFlag(NPC, "routine", {on: false, roles: {home: home.uuid, post: watch.uuid}});
      await reset(tg, 1200, 800); await reset(th, 1300, 800);
      await hal.toggleStatusEffect("unconscious", {active: true});
      await waitFor(() => hx().fallenOf(th).down, 4000);
      const goal = N().carryGoals.goalOf(tg.object, th.object, "rescue");
      const r = await walkOn(tg, {action: "carry", target: th.id, intent: "rescue", want: ""});
      await sleep(600);
      G.ok("7. rescued home", goal.kind === "place" && goal.id === home.uuid && r?.arrived && inside(th, home) && !tg.flags?.[IX]?.hauling && !th.hidden,
        {goal: {kind: goal.kind, name: goal.name}, r, hal: [th.x, th.y], gus: [tg.x, tg.y]});
    });

    await G.step("8. hidden in a wardrobe", async () => {
      const [ward] = await scene.createEmbeddedDocuments("Tile", [{x: 1000, y: 300, width: 100, height: 100, texture: {src: "icons/svg/door-exit.svg"},
        flags: {[IX]: {hide: true, hideKind: "wardrobe", title: "Gate Carry wardrobe"}}}]);
      await reset(tg, 700, 300); await reset(th, 800, 300);
      const goal = N().carryGoals.goalOf(tg.object, th.object, "hide");
      const r = await walkOn(tg, {action: "carry", target: th.id, intent: "hide", want: "drag"});
      const occ = await waitFor(() => (scene.tiles.get(ward.id)?.flags?.[IX]?.occupants ?? []).some(o => o.a === hal.id), 6000);
      const unseen = await waitFor(() => hal.statuses?.has?.("invisible") || th.hidden, 4000);
      G.ok("8. hidden in a wardrobe", goal.kind === "hide" && goal.id === ward.id && r?.arrived && occ && unseen, {goal: {kind: goal.kind, name: goal.name}, r, occ, unseen});
      await scene.tiles.get(ward.id)?.update({[`flags.${IX}.occupants`]: []});
      if ( hal.statuses?.has?.("invisible") ) await hal.toggleStatusEffect("invisible", {active: false});
    });

    await G.step("9. a captive tied and kept", async () => {
      let heard = null;
      const hook = Hooks.on("wodxCaptive", p => { heard = p; });
      await reset(tg, 2000, 800); await reset(ti, 2100, 800);
      await waitFor(() => hx().fallenOf(ti).down, 4000);
      const r = await walkOn(tg, {action: "carry", target: ti.id, intent: "capture", want: ""});
      Hooks.off("wodxCaptive", hook);
      const tied = await waitFor(() => ivo.statuses?.has?.("wodx-immobilized"), 4000);
      const listed = N().carryGoals.prisoners().some(p => p.captive === ivo.id && /watch-house/.test(p.placeName));
      const there = inside(ti, watch);
      await N().carryGoals.freePrisoner(ti, "Gate Carry Jo");
      const freed = await waitFor(() => !ivo.statuses?.has?.("wodx-immobilized") && !N().carryGoals.prisoners().some(p => p.captive === ivo.id), 4000);
      G.ok("9. a captive tied and kept", r?.arrived && tied && listed && there && !!heard && /prisoner/.test(heard?.text ?? "") && freed,
        {r, tied, listed, there, heard, freed, ivo: [ti.x, ti.y]});
    });

    await G.step("10. a player's character waits on the Storyteller", async () => {
      const player = game.users.find(u => !u.isGM);
      if ( !player ) { G.ok("10. a player's character waits on the Storyteller", true, {skipped: "no player user in this world"}); return; }
      await jo.update({[`ownership.${player.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});
      await reset(tg, 2000, 1500); await reset(tj, 2100, 1500);
      await jo.toggleStatusEffect("unconscious", {active: true});
      await waitFor(() => hx().fallenOf(tj).down, 4000);
      const r = await N().execute(tg.object, {action: "carry", target: tj.id, intent: "capture", want: ""});
      const C = game.modules.get("wodx-chronicle")?.api;
      const findEntry = () => C.approvals.pending().find(p => p.type === "npc-capture" && p.data?.target === tj.uuid);
      await waitFor(findEntry, 6000);
      const entry = findEntry(); // waitFor gives back only true or false
      const notYet = !tg.flags?.[IX]?.hauling && !jo.statuses?.has?.("wodx-immobilized");
      if ( entry ) await C.approvals.decide(entry.id, "approve");
      const tied = await waitFor(() => jo.statuses?.has?.("wodx-immobilized"), 6000);
      const listed = N().carryGoals.prisoners().some(p => p.captive === jo.id && p.pc);
      // what the handler saw, when it did not take them (the flag it leaves, and the same call made by hand)
      let asked = tj.flags?.[NPC]?.captureAsked ?? null, direct = null;
      if ( !tied ) { try { const out = await N().carryGoals.approveCapture(entry); direct = {out, tied: jo.statuses?.has?.("wodx-immobilized") ?? false, asked: tj.flags?.[NPC]?.captureAsked ?? null}; } catch (e) { direct = {error: e?.message ?? String(e)}; } }
      G.ok("10. a player's character waits on the Storyteller", !!entry && notYet && tied && listed && inside(tj, watch), {r, entry: !!entry, notYet, tied, listed, asked, direct, jo: [tj.x, tj.y]});
      await N().carryGoals.freePrisoner(tj, "the gate");
    });
    await G.step("11. to another map", async () => {
      const savedTrips = foundry.utils.deepClone(game.settings.get(NPC, "carryTrips") ?? []);
      const far = await G.make(Scene, {name: "WoDX gate: gatecarrynpc far", width: 1000, height: 1000, grid: {size: 100, type: 1}, padding: 0});
      const [farHome] = await far.createEmbeddedDocuments("Region", [{name: "Gate Carry far home", shapes: [{type: "rectangle", x: 300, y: 300, width: 300, height: 300}], flags: {[NPC]: {place: {kind: "home"}}}}]);
      await gus.setFlag(NPC, "routine", {on: false, roles: {home: farHome.uuid}});
      await jo.update({[`ownership.-=${game.users.find(u => !u.isGM)?.id ?? "none"}`]: null}).catch(() => null);
      await reset(tg, 200, 1000); await reset(th, 300, 1000);
      await hal.toggleStatusEffect("unconscious", {active: true});
      await waitFor(() => hx().fallenOf(th).down, 4000);
      const r = await walkOn(tg, {action: "carry", target: th.id, intent: "rescue", want: ""});
      const gone = th.hidden && tg.hidden;
      const trip = N().carryGoals.trips().find(t => t.body === th.uuid && !t.arrived);
      if ( trip ) await game.settings.set(NPC, "carryTrips", N().carryGoals.trips().map(t => (t.id === trip.id ? {...t, due: game.time.worldTime} : t)));
      await N().carryGoals.onClock();
      const there = await waitFor(() => far.tokens.some(t => t.actorId === hal.id && !t.hidden) && far.tokens.some(t => t.actorId === gus.id), 6000);
      const at = far.tokens.find(t => t.actorId === hal.id);
      G.ok("11. to another map", r?.arrived && gone && !!trip && trip.due - trip.left >= 3600 && there && at && at.x >= 200 && at.x <= 600,
        {r, gone, trip: trip ? {name: trip.name, hours: (trip.due - trip.left) / 3600} : null, there, at: at ? [at.x, at.y] : null});
      await game.settings.set(NPC, "carryTrips", savedTrips);
    });
    await game.settings.set(NPC, "prisoners", savedPrisoners);
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
