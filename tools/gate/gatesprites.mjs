/**
 * Sprite tokens (WoDX Paperdoll 0.7.0, B2560 to B2562), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesprites.mjs?${Date.now()}`)).run()
 * It makes up to six tokens named "Sprite test: ..." on the scene being viewed and LEAVES them there for Ben to
 * walk about; run it again and it uses the same tokens. Nothing else is made, changed or deleted, and the clock is
 * not touched. To clear up: delete the tokens whose names begin "Sprite test:".
 *   1. the module: Paperdoll 0.9.0 or later with api.sprites
 *   2. every sheet and still picture answers
 *   3. the test tokens stand on the scene, each with its sprite
 *   4. one token walks two squares right and faces right, then two squares down and faces down
 *   5. its picture on the canvas is one frame of the sheet (96 by 112), not the whole sheet
 *   6. the token's buttons hold the walking-figure button
 *  15. children (B3480): a character of 9 goes on the roster drawn as a child and the menu offers no "Grown"; a child
 *      figure picked for a grown character marks them a minor, so the age floor refuses romance, and "Grown" takes the
 *      mark away again. Step 15 makes two actors named "Sprite test child: ..." and deletes them.
 * Result: Data/wodx-gate/gatesprites-result.json.
 */
const N = 15;
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
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.9.0", M.version) && typeof A?.give === "function" && typeof SR?.frameOf === "function", {version: M?.version});
    // the six test figures only: a character's own sprite (own-...) is not a test figure
    const names = Object.keys(SR.SHEETS).filter(n => !SR.isOwn?.(n)), answers = {};
    for ( const n of names ) for ( const p of [SR.sheetPath(n), SR.stillPath(n)] ) answers[p] = (await fetch(`/${p}`, {method: "HEAD"})).status;
    ok("2. sheets", names.length >= 6 && Object.values(answers).every(s => s === 200), {answers});

    // the test tokens live on one scene: go there if another scene is showing
    const home = game.scenes.find(s => s.tokens.some(t => t.name?.startsWith("Sprite test: Kindred elder")));
    if ( home && home.id !== canvas.scene?.id ) { await home.view(); await sleep(2500); }
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

    // 7. an attack: the elder works a power toward the next token; the frames come from the attack sheet, then it ends
    if ( typeof A.play === "function" ) {
      const sheets = {};
      for ( const n of names ) for ( const act of SR.ACTS?.[n] ?? [] ) sheets[SR.actPath(n, act)] = (await fetch(`/${SR.actPath(n, act)}`, {method: "HEAD"})).status;
      await A.play(t, "cast", docs[1]); await sleep(1300);   // once first, so the step proves a repeat of the same move plays too
      const move = await A.play(t, "cast", docs[1]); await sleep(350);
      const during = A.playing(t.id), atex = t.object?.mesh?.texture, aw = atex?.baseTexture?.width ?? atex?.source?.width, facing = A.state(t.id)?.facing;
      await sleep(1500);
      const after = A.playing(t.id), wtex = t.object?.mesh?.texture;
      ok("7. attack", move === "cast" && Object.values(sheets).every(v => v === 200) && during?.act === "cast" && aw === SR.FRAME_W * SR.ACT_FRAMES && !after && (wtex?.baseTexture?.width ?? wtex?.source?.width) === SR.FRAME_W * SR.FRAMES,
        {move, sheets, during: during?.act, facing, attackSheetWidth: aw, ended: !after});
    } else ok("7. attack", false, {error: "api.sprites.play is missing"});

    // 8. a fight's attack: Combat's own signal, a ranged weapon that misses, plays the townsman's shot toward the Crinos
    {
      const by = n => docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === n), tm = by("townsman-1888"), cr = by("garou-crinos");
      Hooks.callAll("wodxAttackRolled", tm.actor, {target: cr.actor, attackerToken: tm.uuid, targetToken: cr.uuid, weapon: "Revolver", ranged: true, brawl: false, bite: false, hit: false});
      await sleep(400);
      const shot = A.playing(tm.id)?.act, want = SR.moveFor?.("townsman-1888", {ranged: true});
      await sleep(1200);
      ok("8. fight", want === "shot" && shot === "shot" && !A.playing(tm.id), {want, shot, combat: game.modules.get("wodx-combat")?.version});
    }
    // 9. a power: the signal Actions sends when a power is rolled plays the elder's casting move toward the townsman
    {
      const by = n => docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === n), tm = by("townsman-1888");
      const el = docs.find(d => (A.acts?.(d.flags?.["wodx-paperdoll"]?.sprite) ?? []).includes("cast") && d.id !== tm?.id);
      Hooks.callAll("wodxPowerShown", el.actor, {target: tm.actor, token: el.uuid, targetToken: tm.uuid});
      await sleep(400);
      const cast = A.playing(el.id)?.act;
      await sleep(1200);
      ok("9. power", cast === "cast" && !A.playing(el.id), {sprite: el.flags?.["wodx-paperdoll"]?.sprite, cast, actions: game.modules.get("wodx-actions")?.version, sends: typeof game.modules.get("wodx-actions")?.api?.version});
    }
    // 10. the effect fits the power: Dominate shows the gaze of the mind, laid over the figure and gone when the move ends
    {
      const by = n => docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === n), tm = by("townsman-1888"), el = by("kindred-elder-1888");
      Hooks.callAll("wodxPowerShown", el.actor, {target: tm.actor, token: el.uuid, targetToken: tm.uuid, power: "Command", group: "Dominate", kind: "disc", line: "kindred"});
      await sleep(450);
      const fx = el.flags?.["wodx-paperdoll"]?.act?.fx, lit = A.glowing?.(el.id), mesh = el.object?.mesh;
      await sleep(1200);
      const after = A.glowing?.(el.id);
      await A.play(el, "cast", tm);
      await sleep(450);
      const own = el.flags?.["wodx-paperdoll"]?.act?.fx;
      await sleep(1200);
      ok("10. effect", fx === "mind-gaze" && !!lit && lit.width > 0 && Math.abs(lit.width - Math.abs(mesh?.width ?? 0)) < 1 && !after && own === "blood-bolt",
        {fx, lit, mesh: mesh ? {width: mesh.width, height: mesh.height} : null, after: after ?? null, own, other: A.fxFor?.({power: "Arms of the Abyss", group: "Obtenebration"})});
    }
    // 11. a sprite for every character: the roster is written for the batch, and what a batch drew is learned
    {
      const r = A.roster(), saved = await A.saveRoster(), back = saved ? await fetch(`${saved.path}?t=${Date.now()}`, {cache: "no-store"}).then(x => x.ok ? x.json() : null) : null;
      const learned = await A.loadOwn(), kinds = {};
      for ( const a of r.actors ) kinds[a.kind] = (kinds[a.kind] ?? 0) + 1;
      ok("11. roster", r.actors.length === game.actors.size && back?.actors?.length === r.actors.length && Number.isInteger(learned),
        {actors: r.actors.length, kinds, saved, learned, dressed: r.actors.filter(a => a.worn?.length).length, armed: r.actors.filter(a => a.held?.length).length, looks: r.actors.filter(a => a.look?.skin).length});
    }
    // 12. the figure menu: it opens for a character, shows the pieces and the quick picture, a piece can be put on and kept, and the roster then draws that figure
    {
      const PD = game.modules.get("wodx-paperdoll").api, actor = docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === "townsman-1888")?.baseActor;
      const had = actor.flags?.["wodx-paperdoll"]?.figure ?? null;
      const app = await PD.figure.open(actor); await sleep(600);
      const el = app.element, count = () => el.querySelectorAll(".wodx-figure-piece").length, first = count();
      const lit = () => { const c = el.querySelector("canvas.wodx-figure-pic"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for ( let i = 3; i < d.length; i += 4 ) if ( d[i] ) n++; return n; };
      const bare = lit();
      el.querySelectorAll(".wodx-figure-piece")[1]?.click(); await sleep(500);
      const worn = app.element.querySelector(".wodx-figure-piece.on span:last-child")?.textContent ?? "", dressed = (() => { const c = app.element.querySelector("canvas.wodx-figure-pic"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for ( let i = 3; i < d.length; i += 4 ) if ( d[i] ) n++; return n; })();
      app.element.querySelector('[data-action="slot"][data-slot="hand"]')?.click(); await sleep(500);
      const hands = app.element.querySelectorAll(".wodx-figure-piece").length, search = !!app.element.querySelector("input.wodx-search");
      app.element.querySelector('[data-action="save"]')?.click(); await sleep(700);
      const kept = actor.flags?.["wodx-paperdoll"]?.figure ?? null, entry = A.roster().actors.find(a => a.id === actor.id);
      await app.close();
      if ( had ) await actor.setFlag("wodx-paperdoll", "figure", had); else await actor.unsetFlag("wodx-paperdoll", "figure");
      ok("12. figure menu", first > 5 && bare > 300 && dressed >= bare && !!kept?.slots?.body && entry?.figure === true && entry.worn.length === 1 && hands > 5 && search,
        {pieces: first, bare, dressed, worn, hands, search, kept, entry: entry ? {worn: entry.worn, held: entry.held, look: entry.look} : null, putBack: !actor.flags?.["wodx-paperdoll"]?.figure === !had});
    }
    // 13. reactions and deaths: a blow is taken, a fall stays down until the figure is helped up, Final Death is played, a miss is dodged
    {
      const by = n => docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === n), tm = by("townsman-1888"), el = by("kindred-elder-1888"), la = by("lady-1888");
      await A.play(tm, "hit", el); await sleep(350); const hit = A.playing(tm.id)?.act; await sleep(1200); const hitOver = !A.playing(tm.id);
      await A.play(tm, "fall", el); await sleep(1300); const down = A.playing(tm.id), flag = tm.flags?.["wodx-paperdoll"]?.act?.hold;
      const rose = await A.rise(tm); await sleep(400); const up = !A.playing(tm.id);
      await A.play(el, "die", tm); await sleep(1300); const dead = A.playing(el.id); await A.rise(el); await sleep(300);
      Hooks.callAll("wodxAttackRolled", tm.actor, {target: la.actor, attackerToken: tm.uuid, targetToken: la.uuid, weapon: "Revolver", ranged: true, hit: false});
      await sleep(600); const dodge = A.playing(la.id)?.act; await sleep(1200);
      ok("13. reactions", hit === "hit" && hitOver && down?.act === "fall" && down?.held === true && flag === true && rose && up && dead?.act === "die" && dead?.held === true && dodge === "dodge" && !A.playing(el.id) && !A.playing(la.id),
        {hit, hitOver, down: down ? {act: down.act, held: !!down.held} : null, flag, rose, up, dead: dead ? {act: dead.act, held: !!dead.held} : null, dodge, combat: game.modules.get("wodx-combat")?.version});
    }
    // 14. more moves: a pose stays until the figure stands or walks off, a spoken line and a slow move play, and the sheet follows the way of going
    {
      const by = n => docs.find(d => d.flags?.["wodx-paperdoll"]?.sprite === n), tm = by("townsman-1888"), la = by("lady-1888");
      await A.play(tm, "sit"); await sleep(1500); const sat = A.playing(tm.id), flag = tm.flags?.["wodx-paperdoll"]?.act;
      const x0 = tm.x; await tm.update({x: x0 + canvas.grid.size}); await sleep(1500); const upByWalking = !tm.flags?.["wodx-paperdoll"]?.act?.hold;
      await tm.update({x: x0}); await sleep(1200);
      await A.play(tm, "kneel"); await sleep(1500); const knelt = A.playing(tm.id); const rose = await A.rise(tm); await sleep(400);
      await A.play(la, "search"); await sleep(1000); const slow = A.playing(la.id)?.act; await sleep(1500); const over = !A.playing(la.id);
      const said = await ChatMessage.create({content: "A word in the dark.", speaker: ChatMessage.getSpeaker({token: la}), style: CONST.CHAT_MESSAGE_STYLES.IC}); await sleep(500);
      const talk = A.playing(la.id)?.act; await sleep(1500); await said?.delete();
      Hooks.callAll("wodxFed", {by: {uuid: tm.actor.uuid}, vessel: {uuid: la.actor.uuid}, drunk: 1}); await sleep(500); const feed = A.playing(tm.id)?.act; await sleep(2000);
      const ways = ["swim", "climb", "fly"].map(a => SR.gaitFor("townsman-1888", {action: a})), ride = SR.gaitFor("townsman-1888", {riding: true});
      ok("14. more moves", sat?.act === "sit" && sat?.held === true && flag?.hold === true && upByWalking && knelt?.act === "kneel" && rose && slow === "search" && over && talk === "talk" && feed === "feed" && ways.join() === "swim,climb,fly" && ride === "ride",
        {sat: sat ? {act: sat.act, held: !!sat.held} : null, flag, upByWalking, knelt: knelt ? {act: knelt.act, held: !!knelt.held} : null, rose, slow, over, talk, feed, ways, ride, version: game.modules.get("wodx-paperdoll")?.version});
    }
    // 15. children (B3480)
    {
      const PD = game.modules.get("wodx-paperdoll").api, ch = game.modules.get("wodx-chronicle")?.api, now = ch?.eras?.currentYear?.() ?? 1200, made = [];
      try {
        const [kid, grown, other] = await Actor.createDocuments([
          {name: "Sprite test child: Kid", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 9}}}},
          {name: "Sprite test child: Grown", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 30}}}},
          {name: "Sprite test child: Other", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 31}}}}]);
        made.push(kid, grown, other);
        const kidEntry = A.roster().actors.find(a => a.id === kid.id), kidAge = PD.sprites.ageOf?.(kid);
        const app = await PD.figure.open(kid); await sleep(600);
        const opts = [...app.element.querySelectorAll("select[name=growth] option")].map(o => o.value); await app.close();
        const before = ch?.age?.romance?.(grown, other)?.ok;
        await grown.setFlag("wodx-paperdoll", "figure", {skin: "c89878", hair: "3a2a1c", hairStyle: "short", slots: {}, growth: "small"});
        await PD.sprites.markChild(grown, "small");
        const marked = grown.flags?.["wodx-chronicle"]?.minor === true, refused = ch?.age?.romance?.(grown, other)?.ok === false;
        const grownEntry = A.roster().actors.find(a => a.id === grown.id);
        await PD.sprites.markChild(grown, ""); const cleared = grown.flags?.["wodx-chronicle"]?.minor !== true && ch?.age?.romance?.(grown, other)?.ok === true;
        ok("15. children", kidEntry?.growth === "child" && kidAge?.age === 9 && kidAge?.minor === true && !opts.includes("") && opts.includes("child") && before === true && marked && refused && grownEntry?.growth === "small" && cleared,
          {kidEntry: kidEntry ? {growth: kidEntry.growth} : null, kidAge, opts, before, marked, refused, grownGrowth: grownEntry?.growth, cleared});
      } finally { for ( const x of made ) await x.delete().catch(() => null); }
    }
    R.notes.push("The Sprite test tokens are left on the scene for Ben.");
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  return save(R);
}
