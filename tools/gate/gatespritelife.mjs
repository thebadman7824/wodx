/**
 * WoDX Paperdoll gate: figures live their routine on the map (B5660 to B5665), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatespritelife.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, one actor, its token and two tiles, and removes them; never moves the clock. The
 * actor's routine is set by hand (the flag WoDX NPC keeps), so no routine has to run.
 *   1. the rules are there: the poses of everyday life, the standing frame, and beasts that graze and lie down
 *   2. every sheet of a test figure's new poses answers, and its walk sheet has the ninth, standing column
 *   3. a figure that is not walking shows the standing frame, not a step of the walk
 *   4. at rest with nothing to sit on it sits down on a stool of its own
 *   5. with a bench beside it, it sits on the bench
 *   6. asleep by a bed it lies along the bed, eyes shut, under a blanket the colour of the bed, and stays so
 *   7. at work its hands keep moving: the picture changes while it stands in place
 *   8. it gets up to walk, and takes its pose again when it has stopped
 *   9. on an errand it carries a load as it walks
 *  10. a pose given by hand is left alone
 *  11. with the setting off, everyone stands up
 * Result: Data/wodx-gate/gatespritelife-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const PD = "wodx-paperdoll", NPC = "wodx-npc", FIG = "townsman-1888";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatespritelife");
  if ( G.notLive() ) return "Not on the Live world.";
  let was = true;
  try {
    const M = game.modules.get(PD), A = M?.api?.sprites, SR = A?.rules;
    try { was = game.settings.get(PD, "spriteLife"); await game.settings.set(PD, "spriteLife", true); } catch (e) { /* step 1 reports it */ }
    const scene = await G.scene();
    const g = canvas.grid.size;
    const [who] = await G.make(Actor, [{name: "Gate Life Villager", type: "Mortal"}]);
    const [tok] = await G.tokens(scene, [{actor: who, x: 6, y: 6}]);
    await waitFor(() => tok?.object?.mesh);
    const base = () => tok.actor?.isToken ? tok.actor.baseActor ?? tok.actor : tok.actor;
    const doing = async activity => { await base().update({[`flags.${NPC}.where`]: activity ? {activity, place: null, index: 0, label: "", since: 0} : null}); };
    const act = () => tok.flags?.[PD]?.act ?? {};
    const shown = () => { const f = tok.object?.mesh?.texture?.frame, b = tok.object?.mesh?.texture?.baseTexture ?? tok.object?.mesh?.texture?.source; return {x: f?.x, y: f?.y, w: f?.width, sheet: b?.width}; };
    const settled = async (name, ms = 12000) => { await A.settle(); await waitFor(() => act().name === name && (!name || act().by === "routine"), ms); await sleep(2600); return act(); };

    await G.step("1. the rules", async () => {
      const beast = SR?.poseFor?.("graze", {animal: true, has: ["graze", "lie"]}), lying = SR?.poseFor?.("sleep", {animal: true, has: ["graze", "lie"]});
      G.ok("1. the rules", typeof A?.settle === "function" && typeof A?.lifeOf === "function" && SR?.LIFE?.includes("sleep") && SR.hasStand?.(FIG) && beast?.pose === "graze" && lying?.pose === "lie"
        && game.settings.settings.has(`${PD}.spriteLife`), {life: SR?.LIFE, beast, lying});
    });

    await G.step("2. the sheets answer", async () => {
      const answers = {};
      for ( const m of [...SR.LIFE, SR.CARRY] ) answers[m] = (await fetch(`/${SR.actPath(FIG, m).split("?")[0]}`, {method: "HEAD"})).status;
      const img = await new Promise((yes, no) => { const i = new Image(); i.onload = () => yes(i); i.onerror = no; i.src = `/${SR.sheetPath(FIG).split("?")[0]}`; });
      G.ok("2. the sheets answer", Object.values(answers).every(s => s === 200) && img.naturalWidth === SR.FRAME_W * (SR.FRAMES + 1), {answers, walkWidth: img.naturalWidth});
    });

    await G.step("3. standing still", async () => {
      await A.give(tok, FIG);
      await waitFor(() => shown().w === SR.FRAME_W && shown().sheet === SR.FRAME_W * (SR.FRAMES + 1), 15000);
      await sleep(600);
      const s = shown();
      G.ok("3. standing still", s.w === SR.FRAME_W && s.x === SR.FRAME_W * SR.FRAMES, {shown: s});
    });

    await G.step("4. at rest: a stool of its own", async () => {
      await doing("rest");
      const a = await settled("stool"), s = shown();
      G.ok("4. at rest: a stool of its own", a.name === "stool" && a.hold === true && a.by === "routine" && s.sheet === SR.FRAME_W * SR.ACT_FRAMES && s.x === SR.FRAME_W * (SR.ACT_FRAMES - 1), {act: a, shown: s});
    });

    await G.step("5. a bench beside it", async () => {
      const [bench] = await scene.createEmbeddedDocuments("Tile", [{x: 6 * g, y: 6 * g, width: g, height: g, texture: {src: "icons/svg/chest.svg"}, flags: {[PD]: {furniture: "bench"}}}]);
      const a = await settled("seat");
      G.ok("5. a bench beside it", a.name === "seat" && a.by === "routine", {act: a, life: A.lifeOf(tok)});
      await bench.delete();
    });

    await G.step("6. asleep along the bed", async () => {
      const [bed] = await scene.createEmbeddedDocuments("Tile", [{x: 5.5 * g, y: 6 * g, width: 2 * g, height: g, texture: {src: "icons/svg/sleep.svg"}, flags: {[PD]: {furniture: "bed", blanket: "#7a2e2a"}}}]);
      await doing("sleep");
      const a = await settled("sleep"), s = shown(), row = SR.ROW[a.facing];
      const quilt = A.covered?.(tok);
      G.ok("6. asleep along the bed", a.name === "sleep" && ["left", "right"].includes(a.facing) && s.y === row * SR.FRAME_H && s.x === SR.FRAME_W * (SR.ACT_FRAMES - 1)
        && a.blanket === "#7a2e2a" && quilt?.tint === 0x7a2e2a && quilt.visible, {act: a, shown: s, quilt});
      await bed.delete();
    });

    await G.step("7. at work the hands keep moving", async () => {
      await doing("work");
      await settled("work");
      const seen = new Set();
      for ( let i = 0; i < 30; i++ ) { seen.add(shown().x); await sleep(150); }
      G.ok("7. at work the hands keep moving", act().name === "work" && seen.size >= 3 && shown().sheet === SR.FRAME_W * SR.ACT_FRAMES, {frames: [...seen]});
    });

    await G.step("8. it gets up to walk and takes the pose again", async () => {
      await tok.update({x: tok.x + 2 * g});
      await waitFor(() => !act().hold, 8000);
      const up = !act().hold;
      const a = await settled("work", 15000);
      G.ok("8. it gets up to walk and takes the pose again", up && a.name === "work" && a.hold === true, {up, act: a});
    });

    await G.step("9. an errand: a load in the arms", async () => {
      await doing("errand");
      await A.settle(); await waitFor(() => tok.flags?.[PD]?.carry === true && !act().hold, 8000);
      const gait = SR.gaitFor(FIG, {action: "walk", squares: 1, carrying: tok.flags?.[PD]?.carry === true});
      await tok.update({x: tok.x - 2 * g});
      let carried = false;
      for ( let i = 0; i < 40 && !carried; i++ ) { carried = shown().sheet === SR.FRAME_W * SR.FRAMES && shown().w === SR.FRAME_W; await sleep(50); }
      G.ok("9. an errand: a load in the arms", tok.flags?.[PD]?.carry === true && gait === "carry" && carried, {carry: tok.flags?.[PD]?.carry, gait, carried});
    });

    await G.step("10. a pose given by hand is left alone", async () => {
      await doing("rest"); await sleep(1500);
      await A.rise(tok); await A.play(tok, "kneel");
      await waitFor(() => act().name === "kneel", 5000);
      await sleep(1500); const n = await A.settle(); await sleep(500);
      G.ok("10. a pose given by hand is left alone", act().name === "kneel" && act().by !== "routine", {act: act(), changed: n});
      await A.rise(tok);
    });

    await G.step("11. the setting off: everyone stands", async () => {
      await settled("stool");
      await game.settings.set(PD, "spriteLife", false);
      await sleep(1500); await A.settle(); await waitFor(() => !act().hold, 8000);
      G.ok("11. the setting off: everyone stands", !act().hold && !act().name, {act: act()});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    try { await game.settings.set(PD, "spriteLife", was !== false); } catch (e) { /* the setting is not there on an older build */ }
    return G.finish();
  }
}
