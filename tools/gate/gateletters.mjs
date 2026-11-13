/**
 * Letters that take the journey time across the world map (WoDX Storyteller 0.59.0, B2700 to B2704), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateletters.mjs?${Date.now()}`)).run()
 * It makes one actor and three letters, moves the clock to deliver one, and puts the letters setting, the chat, the
 * actor and the clock back as they were.
 *   1. the modules: Storyteller 0.59.0 or later with api.letters.plan, list, delay, read and rules
 *   2. times by the world map: Moravia to China by messenger in 1300 takes over 60 days, the Atlantic post is far
 *      quicker by steam in 1880 than under sail in 1700, and a telegram cannot cross the Atlantic in 1860
 *   3. each land's own years and the known world: no post in the Aegean in 1600, no letter to the Caribbean in 1400
 *   4. a letter between lands is stored with both lands, a chance of going astray and a due time a day or more away
 *   5. put back three days and read on the way
 *   6. delivered when the clock reaches it, with the seal broken and Write the answer
 *   7. a held letter shows in Letters on the way, which opens and closes
 *   8. Letters on the way is in the Storyteller's hand, and the world map lists how long a letter takes
 * Result: Data/wodx-gate/gateletters-result.json.
 */
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const D = 86400;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateletters-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const t0 = game.time.worldTime, msgStart = Date.now();
  const before = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "letters") ?? []);
  let actor = null;
  try {
    const S = game.modules.get("wodx-storyteller"), T = S?.api, Lt = T?.letters;
    ok("1. modules", S?.active && !foundry.utils.isNewerVersion("0.59.0", S.version) && typeof Lt?.plan === "function" && typeof Lt?.list === "function"
      && typeof Lt?.delay === "function" && typeof Lt?.read === "function" && !!Lt?.rules?.REGION_LINES, {storyteller: S?.version});

    const china = await Lt.plan("messenger", {from: "moravia", to: "china", year: 1300});
    const sail = await Lt.plan("post", {from: "british-isles", to: "north-america-east", year: 1700}), steam = await Lt.plan("post", {from: "british-isles", to: "north-america-east", year: 1880});
    const wire = await Lt.plan("telegraph", {from: "british-isles", to: "north-america-east", year: 1860});
    ok("2. world map times", china.ok && china.days > 60 && sail.ok && steam.ok && steam.days < sail.days / 2 && !wire.ok, {china: china.days, sail: sail.days, steam: steam.days, wire: wire.why});

    const aegean = await Lt.plan("post", {from: "aegean", to: "aegean", year: 1600});
    const carib = await Lt.plan("messenger", {from: "moravia", to: "caribbean", year: 1400});
    ok("3. land years and known world", !aegean.ok && !carib.ok, {aegean: aegean.why, caribbean: carib.why});

    actor = await Actor.create({name: "WoDX gate: letter writer", type: "Mortal"});
    const sent = await Lt.send({userId: game.user.id, from: actor.id, to: "", toName: "WoDX gate: a cousin abroad", how: "messenger", reach: "region",
      fromRegion: "moravia", toRegion: "german-lands", text: "WoDX gate letter abroad"});
    const st = (game.settings.get("wodx-storyteller", "letters") ?? []).find(l => l.id === sent?.id);
    ok("4. stored between lands", st?.fromRegion === "moravia" && st?.toRegion === "german-lands" && st.lost > 0 && st.dueAt - st.sentAt >= D && st.state === "way",
      {days: st ? (st.dueAt - st.sentAt) / D : null, lost: st?.lost});

    await Lt.delay(sent.id, 3);
    await Lt.read(sent.id, "WoDX gate: a reader");
    const st2 = (game.settings.get("wodx-storyteller", "letters") ?? []).find(l => l.id === sent.id);
    ok("5. put back and read", st2?.dueAt === st.dueAt + 3 * D && st2.late === 3 && st2.readBy === "WoDX gate: a reader", {late: st2?.late, readBy: st2?.readBy});

    await game.time.advance(st2.dueAt - game.time.worldTime + 60);
    await sleep(1500);
    await Lt.deliver();
    const st3 = (game.settings.get("wodx-storyteller", "letters") ?? []).find(l => l.id === sent.id);
    const card = game.messages.contents.find(m => m.timestamp >= msgStart && m.content.includes("WoDX gate letter abroad") && m.content.includes("data-wst-answer"));
    ok("6. delivered", st3?.state === "done" && !!card && card.content.includes("held up"), {state: st3?.state, card: !!card});

    const held = await Lt.send({userId: game.user.id, from: actor.id, to: "", toName: "WoDX gate: the bishop", how: "messenger", reach: "near",
      fromRegion: "moravia", toRegion: "italy", text: "WoDX gate letter held"});
    if ( held ) await Lt.set(held.id, "held");
    const p = Lt.list();
    let win = null;
    for ( let i = 0; i < 20 && !win; i++ ) { await sleep(150); win = [...document.querySelectorAll(".wst-letters-way")].find(el => el.textContent.includes("WoDX gate: the bishop")); }
    const shown = !!win && win.textContent.includes("Held back");
    win?.querySelector?.('[data-action="close"]')?.click();
    await Promise.race([p, sleep(3000)]);
    ok("7. letters on the way", !!held && shown && !document.querySelector(".wst-letters-way"), {held: !!held, shown});

    const tool = (T.hand?.tools ?? []).some(t => t.key === "letters");
    await T.worldMap.load();
    const v = T.worldMap.view({eyes: "all", layer: "earth", from: "moravia", fromAt: "", to: "british-isles", toAt: "", year: 1900});
    const line = v.lines.find(l => l.startsWith("A letter:"));
    ok("8. hand and world map", tool && !!line && line.includes("telegram"), {tool, line});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-storyteller", "letters", before);
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && /WoDX gate/.test(m.content)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( actor ) await actor.delete();
    await game.time.advance(t0 - game.time.worldTime);
    R.notes.push(`clock back: ${game.time.worldTime === t0}`);
  } catch (e) { R.errors.push(`cleanup: ${e?.stack ?? e}`); }
  return save(R);
}
