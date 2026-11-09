/**
 * Paperdoll tokens (WoDX Paperdoll 0.1.0), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepaperdoll.mjs?${Date.now()}`)).run()
 * It makes a test character, bakes pictures into worlds/rothenstein-wodx/paperdoll and deletes the character after.
 *   1. the module: Paperdoll 0.1.0 or later, its api, the sheet's Paperdoll button
 *   2. measuring in the browser matches the measurements the tests use (neck, face, crown)
 *   3. saving a look bakes a picture and puts it on the prototype token and a placed linked token
 *   4. the same look again makes no new file (the key is the same)
 *   5. a hit to Bruised rebakes with the bruise and a disgruntled face; healing goes back to the first picture
 *   6. frenzy snarls; turning off "The face shows the health track" keeps the face as made
 *   7. the window opens with its steppers and Save, and every list is a fixed choice
 *   8. the picture leaves its ring out when Atmosphere frames the token, and draws it when not
 * Result: Data/wodx-gate/gatepaperdoll-result.json.
 */
const MOD = "wodx-paperdoll";
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatepaperdoll-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), api = M?.api, D = api?.rules;
  let actor = null, token = null;
  const follow = game.settings.get(MOD, "followHealth");
  try {
    actor = await Actor.create({name: "WoDX gate: paperdoll", type: "Mortal", ownership: {default: 0, [game.user.id]: 3}});
    const buttons = [];
    Hooks.callAll("getActorSheetHeaderButtons", actor.sheet, buttons);
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.1.0", M.version) && typeof api?.bake === "function" && buttons.some(b => b.class === "wodx-paperdoll"), {version: M?.version});

    const look = D.normalize({...D.defaultLook("Ada Brandt"), clothes: {...D.defaultLook().clothes, headwear: "fillet"}});
    const A = await api.anchorsFor(look);
    const near = (a, b, t = 3) => Math.abs(a - b) <= t;
    ok("2. measuring", near(A.blobTop, 815) && near(A.neckMid, 468) && near(A.crown, 120, 4) && A.face.length === 24, {blobTop: A.blobTop, neckMid: A.neckMid, crown: A.crown});

    const scene = game.scenes.viewed ?? game.scenes.active;
    if ( scene ) [token] = await scene.createEmbeddedDocuments("Token", [{name: actor.name, actorId: actor.id, actorLink: true, x: 0, y: 0, hidden: true}]);
    const p1 = await api.save(actor, look);
    const firstBake = structuredClone(api.last?.() ?? null);
    await api.settled(); await sleep(500);
    const tex = () => actor.prototypeToken.texture.src, live = () => token ? scene.tokens.get(token.id)?.texture?.src : tex();
    const head = await fetch(`/${p1}`, {method: "HEAD"});
    const tk = token ? scene.tokens.get(token.id) : null;
    ok("3. bake", !!p1 && p1.endsWith(".webp") && head.ok && tex() === p1 && live() === p1 && actor.flags[MOD]?.baked,
      {path: p1, proto: tex(), token: live(), head: head.status, scene: scene?.id ?? null, tokenId: token?.id ?? null, link: tk?.actorLink ?? null, tokenActor: tk?.actorId ?? null, actor: actor.id, baked: actor.flags[MOD]?.baked ?? null, firstBake, lastBake: api.last?.() ?? null, sceneTokens: scene ? scene.tokens.filter(t => t.actorId === actor.id).map(t => `${t.id}:${t.actorLink}:${t.texture?.src}`) : null});

    const files1 = (await foundry.applications.apps.FilePicker.implementation.browse("data", `worlds/${game.world.id}/paperdoll`)).files.length;
    const p2 = await api.bake(actor);
    const files2 = (await foundry.applications.apps.FilePicker.implementation.browse("data", `worlds/${game.world.id}/paperdoll`)).files.length;
    ok("4. baked once", p2 === p1 && files2 === files1, {files1, files2});

    await game.settings.set(MOD, "followHealth", true);
    await actor.update({"system.health.damage.bashing": 1});
    await sleep(600); await api.settled();
    const st = api.state(actor);
    const p3 = tex();
    await actor.update({"system.health.damage.bashing": 0});
    await sleep(600); await api.settled();
    ok("5. the health track", st.level === 1 && st.mood === "disgruntled" && p3 !== p1 && tex() === p1, {level: st.level, mood: st.mood, hurt: p3});

    await actor.update({"system.conditions.isfrenzy": true});
    const fr = api.state(actor).mood;
    await actor.update({"system.conditions.isfrenzy": false, "system.health.damage.bashing": 3, [`flags.${MOD}.look.followHealth`]: false});
    const off = api.state(actor);
    await actor.update({"system.health.damage.bashing": 0});
    ok("6. frenzy and turning it off", fr === "snarling" && off.mood === "own" && off.level === 0, {frenzy: fr, off});

    await api.open(actor); await sleep(900);
    const el = document.querySelector(`#wodx-paperdoll-${actor.id}`);
    ok("7. the window", el?.querySelectorAll(".wodx-step").length === 9 && !!el.querySelector("button[data-action=save]") && !!el.querySelector(".wodx-paperdoll-pic img")
      && [...el.querySelectorAll("select")].every(s => s.hasAttribute("data-fixed")), {steps: el?.querySelectorAll(".wodx-step").length});
    await foundry.applications.instances?.get?.(`wodx-paperdoll-${actor.id}`)?.close?.();

    const at = game.modules.get("wodx-atmosphere");
    const frames = at?.active ? game.settings.get("wodx-atmosphere", "frames") : null;
    const ringNow = api.state(actor).ring;
    let flipped = null;
    if ( at?.active ) {
      const other = frames === "all" ? "off" : "all";
      await game.settings.set("wodx-atmosphere", "frames", other);
      flipped = {to: other, ring: api.state(actor).ring};
      await game.settings.set("wodx-atmosphere", "frames", frames);
    }
    const drawn = v => v === "all" || (v === "characters" && actor.hasPlayerOwner);
    ok("8. the ring", at?.active ? (ringNow === !drawn(frames) && flipped.ring === !drawn(flipped.to)) : ringNow === true, {frames, ringNow, flipped});
  } catch (err) { R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`); }
  finally {
    try { await game.settings.set(MOD, "followHealth", follow); } catch (e) { /* kept */ }
    try { if ( token ) await token.delete(); } catch (e) { R.notes.push(`token: ${e.message}`); }
    try { if ( actor ) await actor.delete(); } catch (e) { R.notes.push(`actor: ${e.message}`); }
    R.notes.push("Baked test pictures stay in worlds/rothenstein-wodx/paperdoll (small WebP files).");
  }
  return save(R);
}
