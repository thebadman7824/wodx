/**
 * Faces that age (WoDX Atmosphere 0.7.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefaces.mjs?${Date.now()}`)).run()
 * It makes a character and a scene of its own and deletes both at the end. The clock never moves: years are passed in.
 * The aged copies it makes stay in worlds/rothenstein-wodx/wodx-faces (names start with the test character's id).
 *   1. the module: Atmosphere 0.7.0 or later, api.faces
 *   2. a mortal born 25 years ago: the flag keeps the portrait and token art as the base, nothing changes yet
 *   3. at 55: an aged copy (step 2) is written and shown on the portrait, the token art and the placed token; it has less colour
 *   4. a ghoul stilled at 30 shows the base at 80; cut off from the blood, the years catch up (step 5)
 *   5. a picture chosen for 60 and on is used for the portrait; the token art keeps the filter
 *   6. the window lists the face
 *   7. stopping puts the pictures back and drops the flag
 *   8. clean up
 * Result: Data/wodx-gate/gatefaces-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OTHER = "icons/svg/mystery-man.svg";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatefaces-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
/** A small, strongly coloured test portrait, written to wodx-gate. */
async function testPicture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#d02020"; ctx.fillRect(0, 0, 32, 64);
  ctx.fillStyle = "#2040e0"; ctx.fillRect(32, 0, 32, 64);
  const blob = await new Promise(r => c.toBlob(r, "image/png"));
  const res = await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", new File([blob], "gatefaces-portrait.png", {type: "image/png"}), {}, {notify: false});
  return res?.path ?? "wodx-gate/gatefaces-portrait.png";
}
/** How much colour a picture has: the mean spread between its strongest and weakest channel. */
async function colour(src) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`no picture at ${src}`)); i.src = `${src}?${Date.now()}`; });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, n = 0;
  for ( let i = 0; i < d.length; i += 4 ) { sum += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); n++; }
  return n ? sum / n : 0;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), F = M?.api?.faces;
  const viewed = canvas.scene?.id;
  let actor = null, scene = null;
  const A = () => game.actors.get(actor.id);
  const T = () => [...game.scenes.get(scene.id).tokens][0];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.7.0", M.version) && !!F?.set, {version: M?.version});
    const year = Number(F.year());
    const PIC = await testPicture();
    if ( !Number.isFinite(year) ) throw new Error("The chronicle year is not known");
    const born = year - 25;
    actor = await Actor.create({name: "WoDX gate: Face", type: "Mortal", img: PIC, prototypeToken: {texture: {src: PIC}}});
    scene = await Scene.create({name: "WoDX gate: Faces", width: 1000, height: 800, padding: 0});
    await scene.createEmbeddedDocuments("Token", [{...(await A().getTokenDocument({x: 200, y: 200})).toObject(), actorLink: true}]);
    await sleep(400);

    await F.set(A(), {born});
    await F.apply(A(), born + 25); await sleep(300);
    const f2 = A().flags?.[MOD]?.face;
    ok("2. a face to age", f2?.born === born && f2?.base?.img === PIC && f2?.base?.token === PIC && A().img === PIC && T().texture.src === PIC, {f2, year});

    const r3 = await F.apply(A(), born + 55); await sleep(400);
    const img3 = A().img, tok3 = A().prototypeToken.texture.src, placed3 = T().texture.src;
    const c0 = await colour(PIC), c3 = await colour(img3).catch(e => (R.errors.push(e.message), -1));
    ok("3. aged at 55", r3?.stage === 2 && /wodx-faces\/.*-portrait-age2-/.test(img3) && /-token-age2-/.test(tok3) && placed3 === tok3 && c3 >= 0 && c3 < c0 * 0.85,
      {r3, img3, tok3, placed3, c0, c3});

    await F.set(A(), {kind: "ghoul", still: 30});
    const g1 = await F.apply(A(), born + 80); await sleep(300); const i1 = A().img;
    await F.set(A(), {lost: true});
    const g2 = await F.apply(A(), born + 80); await sleep(300); const i2 = A().img;
    ok("4. a ghoul and the blood", g1?.age === 30 && g1?.stage === 0 && i1 === PIC && g2?.age === 80 && g2?.stage === 5 && /-portrait-age5-/.test(i2), {g1, g2, i1, i2});

    await F.set(A(), {kind: "ages", lost: false});
    await F.at(A(), 60, OTHER);
    const h = await F.apply(A(), born + 65); await sleep(300);
    ok("5. a picture for an age", h?.stage === 3 && A().img === OTHER && /-token-age3-/.test(A().prototypeToken.texture.src) && T().texture.src === A().prototypeToken.texture.src,
      {h, img: A().img, tok: A().prototypeToken.texture.src});

    M.api.open(); await sleep(900);
    const rows = [...document.querySelectorAll("#wodx-atmosphere table.watmo-faces tr")].map(tr => tr.textContent.trim());
    ok("6. in the window", rows.some(r => r.includes("WoDX gate: Face") && r.includes(`born ${born}`)), {rows});

    await F.set(A(), null); await sleep(400);
    ok("7. stopped", A().img === PIC && A().prototypeToken.texture.src === PIC && T().texture.src === PIC && !A().flags?.[MOD]?.face,
      {img: A().img, tok: A().prototypeToken.texture.src, placed: T().texture.src});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-atmosphere")?.close?.();
      if ( viewed && game.scenes.get(viewed) && canvas.scene?.id !== viewed ) await game.scenes.get(viewed).view();
      if ( scene ) await game.scenes.get(scene.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      if ( actor ) R.notes.push(`aged copies left in worlds/${game.world.id}/wodx-faces start with ${actor.id}`);
      ok("8. clean up", (!scene || !game.scenes.get(scene.id)) && (!actor || !game.actors.get(actor.id)));
    } catch (err) { ok("8. clean up", false, {error: err.message}); }
  }
  return save(R);
}
