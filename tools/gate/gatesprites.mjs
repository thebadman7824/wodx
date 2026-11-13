/**
 * Sprite tokens (WoDX Paperdoll 0.7.0, B2560 to B2562), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesprites.mjs?${Date.now()}`)).run()
 * It makes up to six tokens named "Sprite test: ..." on the scene being viewed and LEAVES them there for Ben to
 * walk about; run it again and it uses the same tokens. Nothing else is made, changed or deleted, and the clock is
 * not touched. To clear up: delete the tokens whose names begin "Sprite test:".
 *   1. the module: Paperdoll 0.7.0 or later with api.sprites
 *   2. every sheet and still picture answers
 *   3. the test tokens stand on the scene, each with its sprite
 *   4. one token walks two squares right and faces right, then two squares down and faces down
 *   5. its picture on the canvas is one frame of the sheet (96 by 112), not the whole sheet
 *   6. the token's buttons hold the walking-figure button
 * Result: Data/wodx-gate/gatesprites-result.json.
 */
const N = 6;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesprites-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get("wodx-paperdoll"), A = M?.api?.sprites, SR = A?.rules;
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.7.0", M.version) && typeof A?.give === "function" && typeof SR?.frameOf === "function", {version: M?.version});
    const names = Object.keys(SR.SHEETS), answers = {};
    for ( const n of names ) for ( const p of [SR.sheetPath(n), SR.stillPath(n)] ) answers[p] = (await fetch(`/${p}`, {method: "HEAD"})).status;
    ok("2. sheets", names.length >= 6 && Object.values(answers).every(s => s === 200), {answers});

    const scene = canvas.scene, g = canvas.grid.size, actor = game.actors.find(a => a.type !== "Group") ?? game.actors.contents[0];
    const cx = Math.round(canvas.dimensions.sceneX + canvas.dimensions.sceneWidth / 2), cy = Math.round(canvas.dimensions.sceneY + canvas.dimensions.sceneHeight / 2);
    const docs = [];
    for ( const [i, n] of names.entries() ) {
      const label = `Sprite test: ${SR.SHEETS[n]}`;
      let t = scene.tokens.find(x => x.name === label);
      if ( !t ) {
        const data = (await actor.getTokenDocument({x: cx + (i - 3) * g * 2, y: cy, name: label, actorLink: false})).toObject();
        [t] = await scene.createEmbeddedDocuments("Token", [data]);
      }
      if ( t.flags?.["wodx-paperdoll"]?.sprite !== n ) await A.give(t, n);
      docs.push(t);
    }
    await sleep(1500);
    ok("3. tokens", docs.length === names.length && docs.every((t, i) => t.flags?.["wodx-paperdoll"]?.sprite === names[i] && t.texture.src === SR.stillPath(names[i]) && t.texture.scaleX === 2),
      {scene: scene.name, tokens: docs.map(t => t.name)});

    const t = docs[0], x0 = t.x, y0 = t.y;
    await t.update({x: x0 + 2 * g}); await sleep(2500);
    const right = A.state(t.id)?.facing;
    await t.update({y: y0 + 2 * g}); await sleep(2500);
    const down = A.state(t.id)?.facing;
    ok("4. walk", right === "right" && down === "down", {right, down, covered: A.state(t.id)?.dist});

    const tex = t.object?.mesh?.texture, fr = tex?.frame ?? {};
    ok("5. frame", Math.round(fr.width) === SR.FRAME_W && Math.round(fr.height) === SR.FRAME_H && (tex?.baseTexture?.width ?? tex?.source?.width) === SR.FRAME_W * SR.FRAMES,
      {frame: {x: fr.x, y: fr.y, width: fr.width, height: fr.height}, sheet: tex?.baseTexture?.width ?? tex?.source?.width});
    await t.update({x: x0, y: y0}); await sleep(2500);

    t.object?.control({releaseOthers: true}); canvas.tokens.hud.bind(t.object); await sleep(600);
    const btn = document.querySelector("#token-hud .wodx-sprite-pick");
    ok("6. button", !!btn, {hud: !!document.querySelector("#token-hud")});
    canvas.tokens.hud.close?.() ?? canvas.tokens.hud.clear?.();
    R.notes.push("The Sprite test tokens are left on the scene for Ben.");
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  return save(R);
}
