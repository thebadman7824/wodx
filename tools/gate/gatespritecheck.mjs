/**
 * WoDX Paperdoll gate: do sprite tokens really do on the map what they should (B6140 to B6143), in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatespritecheck.mjs?${Date.now()}`)).run()
 * Checks the picture on the canvas, not only the flags. Makes its own scratch scene, actors, tokens, regions, a door
 * and a horse tile, and removes them; puts the clock back. Saves map pictures as Data/wodx-gate/gatespritecheck-*.png.
 *   1. four figures walk up, down, left and right: each shows the walk row of the way it goes, while it walks and after
 *   2. a rider on a horse: the horse tile and the rider turn together, left and then up; astride, and behind the head facing the viewer (B6146)
 *   3. a real NPC routine: the routine places the token (its prototype carries a sprite), the token works with its
 *      hands; the routine's next hours walk it to the tavern, turning as it goes, and it sits down there
 *   4. a real door action: listening at a door (Interactables' own roll and card) plays the listening move
 *   5. a drawn sprite of its own is put on a token by itself, also on one made later (B6140)
 *   6. the world's own drawn sprites: how many characters have one, and how many tokens of the scenes wear it
 *   7. drawing from inside the game (B6144): the button writes the roster and a request; a status from the drawer is read
 *      back and the sprites learnt (the status is written here at once, so no real drawing is started)
 * Result: Data/wodx-gate/gatespritecheck-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const PD = "wodx-paperdoll", NPC = "wodx-npc", IX = "wodx-interactables";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rect = (s, j, i, w, h) => ({type: "rectangle", x: j * s, y: i * s, width: w * s, height: h * s, rotation: 0, hole: false});

/* A picture of the map round a point, as the Storyteller sees it, saved beside the result. */
async function shot(name, at, scale = 1.4) {
  try {
    if ( at ) { await canvas.pan({x: at.x, y: at.y, scale}); await sleep(350); }
    const app = canvas.app, v = app.view ?? app.canvas;
    app.renderer.render(app.stage);
    const c = document.createElement("canvas");
    c.width = v.width; c.height = v.height;
    c.getContext("2d").drawImage(v, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    const FP = foundry.applications.apps.FilePicker.implementation;
    await FP.upload("data", "wodx-gate", new File([blob], `gatespritecheck-${name}.png`, {type: "image/png"}), {}, {notify: false});
    return `wodx-gate/gatespritecheck-${name}.png`;
  } catch (e) { return `no picture: ${e?.message ?? e}`; }
}

export async function run() {
  const G = gate("gatespritecheck", {stepTimeout: 60000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.modules.get(PD)?.api?.sprites, SR = A?.rules, MA = A?.mounts;
  const setWas = {};
  for ( const k of ["sprites", "spriteLife", "spriteDress"] ) { try { setWas[k] = game.settings.get(PD, k); await game.settings.set(PD, k, true); } catch (e) { setWas[k] = undefined; } }
  const pics = [];
  try {
    const scene = await G.scene({width: 2400, height: 1600, flags: {[IX]: {ground: "road"}}});
    const g = scene.grid.size;
    const row = t => Math.round((t.object?.mesh?.texture?.frame?.y ?? -1) / SR.FRAME_H);
    const facingShown = t => Object.entries(SR.ROW).find(([, r]) => r === row(t))?.[0] ?? null;

    await G.step("1. four figures walk four ways", async () => {
      const [walker] = await G.make(Actor, [{name: "Gate Sprite Walker", type: "Mortal"}]);
      const ways = {up: [0, -2], down: [0, 2], left: [-2, 0], right: [2, 0]}, start = {up: [5, 7], down: [8, 2], left: [13, 4], right: [15, 4]};
      const back = {up: "down", down: "up", left: "right", right: "left"};
      const toks = await G.tokens(scene, Object.keys(ways).map(w => ({actor: walker, x: start[w][0], y: start[w][1], name: `Walker ${w}`, actorLink: false})));
      await waitFor(() => toks.every(t => t?.object?.mesh));
      const sheets = ["townsman-1888", "lady-1888", "townsman-1888", "lady-1888"];
      for ( const [i, t] of toks.entries() ) await A.give(t, sheets[i]);
      await sleep(1500);
      await canvas.pan({x: 11 * g, y: 5 * g, scale: 0.9}); await sleep(300);
      const want = Object.keys(ways);
      // watch every 40 ms: the rows shown while each figure walks, and one picture once all four are mid-stride
      const watchWalk = async (go, file) => {
        const seen = toks.map(() => new Set()), walked = toks.map(() => 0);
        let pic = null;
        const timer = setInterval(() => toks.forEach((t, i) => { if ( A.state(t.id)?.moving ) { walked[i]++; const f = facingShown(t); if ( f ) seen[i].add(f); } }), 40);
        try {
          go();
          for ( let k = 0; k < 75; k++ ) { await sleep(40); if ( !pic && toks.every(t => A.state(t.id)?.moving) ) pic = await shot(file, null); }
          await sleep(1500);
        } finally { clearInterval(timer); }
        return {seen: seen.map(x => [...x]), walked, pic, after: toks.map(facingShown)};
      };
      // a short move by a plain update (as a macro or a routine step does it)
      const one = await watchWalk(() => want.forEach((w, i) => toks[i].update({x: toks[i].x + ways[w][0] * g, y: toks[i].y + ways[w][1] * g})), "1-walking");
      pics.push(one.pic ?? "no picture: never all mid-stride at once");
      pics.push(await shot("1-stopped", null));
      // a longer move back by Foundry's own movement, as a player's drag makes it
      const two = await watchWalk(() => want.forEach((w, i) => { const to = {x: toks[i].x - ways[w][0] * 2 * g, y: toks[i].y - ways[w][1] * 2 * g}; (toks[i].move ? toks[i].move([{...to, action: "walk"}]) : toks[i].update(to)); }), "1-walking-back");
      if ( two.pic ) pics.push(two.pic);
      G.ok("1. a short move: each walks showing the row of its way", one.seen.every((f, i) => f.length === 1 && f[0] === want[i] && one.walked[i] > 0) && one.after.every((f, i) => f === want[i]), one);
      G.ok("1. a dragged move of four squares back: each turns round and walks the other way", two.seen.every((f, i) => f.includes(back[want[i]]) && two.walked[i] > 0) && two.after.every((f, i) => f === back[want[i]]), two);
    });

    await G.step("2. a rider and the horse turn together", async () => {
      if ( !MA ) return G.ok("2. mounts", false, {why: "no mount api"});
      const [rider] = await G.make(Actor, [{name: "Gate Sprite Rider", type: "Mortal", system: {abilities: {ride: {value: 2}}}}]);
      const [tr] = await G.tokens(scene, [{actor: rider, x: 6, y: 11, actorLink: true}]);
      await waitFor(() => tr?.object?.mesh);
      await A.give(tr, "townsman-1888");
      const [horse] = await scene.createEmbeddedDocuments("Tile", [{x: 6 * g, y: 11 * g, width: g, height: g, texture: {src: "icons/svg/horse.svg"}, flags: {[IX]: {mount: true, mountKind: "horse", title: "Gate Sprite Horse"}}}]);
      await waitFor(() => horse?.object?.mesh);
      await horse.update({[`flags.${IX}.driver`]: {a: rider.id, t: tr.uuid, n: rider.name, dx: 0, dy: 0}});
      await waitFor(() => MA.ready?.(), 15000);
      await sleep(1200);
      const settled = () => waitFor(() => Math.abs((tr.object?.x ?? 0) - tr.x) < 1 && Math.abs((tr.object?.y ?? 0) - tr.y) < 1, 6000);
      await tr.update({x: tr.x - 2 * g}); await settled(); await sleep(900);
      const left = {horse: MA.facing(horse), rider: MA.showing(tr)?.facing ?? null, horseAt: {x: horse.x, y: horse.y}, riderAt: {x: tr.x, y: tr.y}};
      await tr.update({y: tr.y - 2 * g}); await settled(); await sleep(900);
      const up = {horse: MA.facing(horse), rider: MA.showing(tr)?.facing ?? null};
      pics.push(await shot("2-rider", {x: tr.x + g / 2, y: tr.y + g / 2}, 2));
      G.ok("2. horse and rider face left, then up", left.horse === "left" && left.rider === "left" && up.horse === "up" && up.rider === "up", {left, up, kind: MA.showing(horse)?.kind ?? null});
      // B6146: seated astride, and coming toward the viewer the rider is behind the horse's head
      await tr.update({x: tr.x + 2 * g}); await settled(); await sleep(900);
      pics.push(await shot("2-rider-side", {x: tr.x + g / 2, y: tr.y + g / 2}, 2));
      const side = {facing: MA.showing(tr)?.facing ?? null, pose: MA.showing(tr)?.pose ?? null, sheet: tr.object?.mesh?.texture?.baseTexture?.resource?.src ?? tr.object?.mesh?.texture?.source?.resource?.src ?? null};
      await tr.update({y: tr.y + 2 * g}); await settled(); await sleep(900);
      pics.push(await shot("2-rider-down", {x: tr.x + g / 2, y: tr.y + g / 2}, 2));
      const down = {facing: MA.showing(tr)?.facing ?? null, rows: MA.showing(tr)?.rows ?? null, fronts: MA.fronts?.() ?? null};
      G.ok("2. the rider sits astride, and facing the viewer sits behind the horse's head", side.facing === "right" && side.pose === "ride" && down.facing === "down" && down.rows === 112 && (down.fronts ?? []).includes(horse.uuid), {side, down});
    });

    await G.step("3. a real routine: works, walks to the tavern, sits", async () => {
      const api = game.modules.get(NPC)?.api, R = api?.routines;
      if ( !R?.tick ) return G.ok("3. routine", false, {why: "no WoDX NPC routines"});
      await scene.setFlag(NPC, "routineMode", "auto");
      await scene.createEmbeddedDocuments("Region", [
        {name: "Gate Sprite Workshop", color: "#aa7733", shapes: [rect(g, 2, 2, 4, 4)], flags: {[NPC]: {place: {kind: "workplace", owner: "", private: false}}}},
        {name: "Gate Sprite Tavern", color: "#3377aa", shapes: [rect(g, 16, 9, 4, 4)], flags: {[NPC]: {place: {kind: "tavern", owner: "", private: false}}}}]);
      const shop = scene.regions.find(r => r.name === "Gate Sprite Workshop"), inn = scene.regions.find(r => r.name === "Gate Sprite Tavern");
      const day = blk => ({from: 0, to: 24, when: "any", days: null, feast: "any", label: "", ...blk});
      const [smith] = await G.make(Actor, [{name: "Gate Sprite Smith", type: "Mortal", prototypeToken: {flags: {[PD]: {sprite: "townsman-1888"}}},
        flags: {[NPC]: {routine: {on: true, blocks: [day({place: shop.uuid, activity: "work"})], roles: {}}}}}]);
      await R.tick("jump", {scene, post: true});
      await R.idle?.();
      let tok = null;
      await waitFor(() => (tok = scene.tokens.find(t => t.actorId === smith.id)) && tok.object?.mesh, 15000);
      const placed = !!tok, wears = tok?.flags?.[PD]?.sprite ?? null;
      const work = await waitFor(() => tok?.flags?.[PD]?.act?.name === "work", 15000).then(() => true, () => false);
      await sleep(900);
      const f1 = tok?.object?.mesh?.texture?.frame?.x; await sleep(500); const f2 = tok?.object?.mesh?.texture?.frame?.x;
      const where1 = smith.flags?.[NPC]?.where?.activity ?? null;
      pics.push(await shot("3-working", {x: 4 * g, y: 4 * g}, 2));
      // the next hours: off to the tavern
      await smith.update({[`flags.${NPC}.routine.blocks`]: [day({place: inn.uuid, activity: "rest"})]});
      await sleep(300);
      const from = {x: tok.x, y: tok.y};
      const turned = [];
      let movingSeen = 0, how = null;
      const watch = setInterval(() => { const f = facingShown(tok); if ( A.state(tok.id)?.moving ) { movingSeen++; if ( f && turned.at(-1) !== f ) turned.push(f); } }, 40);
      try {
        const r = await R.tick("walk", {scene, post: true});
        how = {items: (r?.items ?? []).filter(i => i?.tokenId === tok.id).map(i => `${i.type}:${i.status}`), moved: tok.x !== from.x || tok.y !== from.y};
        await waitFor(() => tok.regions?.has?.(inn) || inn.testPoint?.({x: tok.x + g / 2, y: tok.y + g / 2, elevation: 0}), 30000).catch(() => null);
        await sleep(400);
        pics.push(await shot("3-walked", {x: tok.x + g / 2, y: tok.y + g / 2}, 1.2));
        await R.idle?.();
      } finally { clearInterval(watch); }
      const sat = await waitFor(() => ["stool", "seat", "sit"].includes(tok?.flags?.[PD]?.act?.name), 15000).then(() => tok.flags[PD].act.name, () => tok?.flags?.[PD]?.act?.name ?? null);
      await sleep(1600);
      pics.push(await shot("3-sitting", {x: tok.x + g / 2, y: tok.y + g / 2}, 2));
      await waitFor(() => tok.texture?.src === SR.stillPath("townsman-1888"), 5000).catch(() => null);
      G.ok("3. the routine brings the token in wearing its sprite, at the sprite's size", placed && wears === "townsman-1888" && tok.texture?.scaleX === SR.TOKEN.scaleX, {placed, wears, scale: tok.texture?.scaleX});
      G.ok("3. at work its hands move", work && where1 === "work" && f1 !== f2, {where: where1, act: work, frames: [f1, f2]});
      G.ok("3. it walks to the tavern facing the way it goes", turned.length >= 1 && turned.includes("right"), {turned, movingSeen, from, to: {x: tok.x, y: tok.y}, how});
      G.ok("3. and sits down there", ["stool", "seat", "sit"].includes(sat), {sat, where: smith.flags?.[NPC]?.where?.activity});
      // B6145: a walk with autoRotate turns the token, but the figure stays upright (the stool under it, not beside it)
      const rot = {doc: tok?.rotation ?? null, drawn: tok?.object?.mesh?.rotation ?? null};
      G.ok("3. the seated figure is drawn upright, however the token was turned", rot.drawn === 0, rot);
    });

    await G.step("4. listening at a door plays the move", async () => {
      const ix = game.modules.get(IX)?.api;
      if ( !ix?.attempt ) return G.ok("4. door", false, {why: "no Interactables"});
      const [thief] = await G.make(Actor, [{name: "Gate Sprite Listener", type: "Mortal", system: {attributes: {perception: {value: 3}}, abilities: {alertness: {value: 2}}}}]);
      const [tt] = await G.tokens(scene, [{actor: thief, x: 10, y: 13, actorLink: true}]);
      await waitFor(() => tt?.object?.mesh);
      await A.give(tt, "townsman-1888");
      const [wall] = await scene.createEmbeddedDocuments("Wall", [{c: [11 * g, 12.5 * g, 11 * g, 14.5 * g], door: 1, ds: 0}]);
      await sleep(600);
      let heard = null;
      const h = Hooks.on("wodxInteractableWorked", i => { heard = i; });
      try {
        await ix.attempt(tt.object, wall.id, "listen", {fd: {bonus: 0, extraDiff: 0}});
        await waitFor(() => heard, 15000).catch(() => null);
        await waitFor(() => A.playing(tt.id)?.act === "search" && (tt.object?.mesh?.texture?.baseTexture?.width ?? tt.object?.mesh?.texture?.source?.width) === SR.FRAME_W * SR.ACT_FRAMES, 5000).catch(() => null);
      } finally { Hooks.off("wodxInteractableWorked", h); }
      const playing = A.playing(tt.id)?.act ?? null, sheet = tt.object?.mesh?.texture?.baseTexture?.width ?? tt.object?.mesh?.texture?.source?.width;
      pics.push(await shot("4-listening", {x: tt.x + g, y: tt.y + g / 2}, 2));
      G.ok("4. Interactables says the work was done", heard?.action === "listen" && heard?.token === tt.uuid, {heard});
      G.ok("4. and the figure plays its listening move", playing === "search" && sheet === SR.FRAME_W * SR.ACT_FRAMES, {playing, sheet});
    });

    await G.step("5. a drawn sprite of its own goes on by itself", async () => {
      // a stand-in manifest: one character "drawn", its sheets the test townsman's (copied paths are not needed: the flag and the picture path are checked)
      const [own] = await G.make(Actor, [{name: "Gate Sprite Own", type: "Mortal"}]);
      await A.loadOwn();   // the start-up learning must be over, or it would wipe the stand-in below
      const kept = A.names();
      SR.learn("modules/wodx-paperdoll/sprites/proto", {sprites: {[own.id]: {name: "Gate own", acts: ["sit"], stand: true}}});
      try {
        const [t1] = await G.tokens(scene, [{actor: own, x: 2, y: 13}]);
        const on1 = await waitFor(() => t1.flags?.[PD]?.sprite === `own-${own.id}` && t1.texture.src === SR.stillPath(`own-${own.id}`), 8000).then(() => true, () => false);
        G.ok("5. a token made later wears it at once", on1 && t1.texture.src === SR.stillPath(`own-${own.id}`), {sprite: t1.flags?.[PD]?.sprite ?? null, src: t1.texture.src});
        await A.clear(t1);
        const n = await A.dress(scene);
        G.ok("5. dressing the scene gives it back", n >= 1 && t1.flags?.[PD]?.sprite === `own-${own.id}`, {n});
        await game.settings.set(PD, "spriteDress", false);
        const [t2] = await G.tokens(scene, [{actor: own, x: 4, y: 13}]);
        await sleep(1500);
        G.ok("5. with the setting off it is left alone", !t2.flags?.[PD]?.sprite, {sprite: t2.flags?.[PD]?.sprite ?? null});
        await game.settings.set(PD, "spriteDress", true);
      } finally { await A.loadOwn(); G.R.notes.push(`own sprites learnt again: ${Object.keys(A.names()).length} (were ${Object.keys(kept).length})`); }
    });

    await G.step("6. the world's own drawn sprites", async () => {
      const names = A.names(), own = Object.keys(names).filter(n => SR.isOwn(n));
      const actors = game.actors.filter(a => SR.isOwn(SR.ownName(a.id)));
      let tokens = 0, wearing = 0;
      for ( const s of game.scenes ) for ( const t of s.tokens ) if ( SR.isOwn(SR.ownName(t.actorId)) ) { tokens++; if ( t.flags?.[PD]?.sprite ) wearing++; }
      G.ok("6. counted", true, {ownSprites: own.length, actorsWithOne: actors.length, actorsInWorld: game.actors.size, tokensOfThem: tokens, wearingIt: wearing, sample: actors.slice(0, 8).map(a => `${a.name} (${a.type})`)});
    });

    await G.step("7. drawing from inside the game", async () => {
      const folder = `worlds/${game.world.id}/wodx-sprites`, FP = foundry.applications.apps.FilePicker.implementation;
      const read = async f => { const r = await fetch(`${folder}/${f}?t=${Date.now()}`, {cache: "no-store"}); return r.ok ? r.json() : null; };
      const id = await A.requestDraw();
      // answered at once, before the runner looks (it polls every 30 seconds), so the gate starts no real drawing
      await FP.upload("data", folder, new File([JSON.stringify({id, state: "done", started: new Date().toISOString(), finished: new Date().toISOString(), drawn: 0, unchanged: 0, text: "gate"})], "status.json", {type: "application/json"}), {}, {notify: false});
      const req = await read("request.json"), roster = await read("roster.json");
      A.watchDraw(id, {every: 500});
      const answered = await waitFor(() => !A.drawWatched(), 8000).then(() => true, () => false);
      G.ok("7. the button writes the roster and the request", req?.id === id && req.world === game.world.id && roster?.actors?.length === game.actors.size, {req, actors: roster?.actors?.length});
      G.ok("7. the drawer's answer is read and the sprites learnt", answered, {watched: A.drawWatched()});
      // the gate's answer stays: putting an older status back would leave the gate's request open and start a real drawing
      G.ok("7. the setting menu is there", !!game.settings.menus.get(`${PD}.spriteDraw`));
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    for ( const [k, v] of Object.entries(setWas) ) if ( v !== undefined ) { try { await game.settings.set(PD, k, v); } catch (e) { /* keep going */ } }
    G.R.pictures = pics;
  }
  return G.finish();
}
