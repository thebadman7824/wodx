/**
 * Money by era (Storyteller 0.14.0) and Consensus by era (Actions 3.18.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateconsensus.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors and deletes them; it does not move the clock or change the chronicle's year.
 *   1. the modules, versions and APIs
 *   2. money: a Resources 2 character away 200 days lives at 0; at home lives at 2
 *   3. money: a neglected Resources 4 keeps 3-dot comfort; the monthly card names the coin of the day
 *   4. consensus: the age of the chronicle's year matches the rules; Crusade words are casual and vain
 *   5. consensus: a place's accepted styles are saved and a stranger's style is vain there
 *   6. consensus: Purify clears a mage's Scourge to the permanent rating
 *   7. clean up
 * Result: Data/wodx-gate/gateconsensus-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 7;
const DAY = 86400;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateconsensus-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), t = game.time.worldTime;
  const T = game.modules.get("wodx-storyteller").api, A = game.modules.get("wodx-actions").api;
  const monthBefore = game.settings.get("wodx-storyteller", "moneyMonth");
  let scene = null, poor = null, rich = null, mage = null;
  const withRes = (name, dots, money) => Actor.create({name, type: "Mortal", ownership: {default: 3},
    flags: {"wodx-storyteller": {money}}, items: [{name: "Resources", type: "Feature", system: {type: "wod.types.background", value: dots}}]});
  try {
    ok("1. modules", atLeast("wodx-storyteller", "0.14.0") && atLeast("wodx-actions", "3.18.0") && !!T?.upkeep?.money?.of && !!A?.consensus?.suggest && !!A?.m20Purify,
      {versions: ["wodx-storyteller", "wodx-actions"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    poor = await withRes("WoDX gate: far from home", 2, {away: t - 200 * DAY});
    const away = T.upkeep.money.of(poor);
    await T.upkeep.money.setAway(poor, false);
    const home = T.upkeep.money.of(poor);
    ok("2. money away and home", away.dots === 2 && away.living.level === 0 && home.living.level === 2, {away: away.living, home: home.living.level, dots: away.dots});

    rich = await withRes("WoDX gate: absent lord", 4, {neglected: t - 100 * DAY});
    const r = T.upkeep.money.of(rich);
    const card = await T.upkeep.money.monthly({force: true});
    await sleep(400);
    const c = T.upkeep.money.coins();
    const msg = game.messages.contents.find(m => m.timestamp >= msgStart && m.speaker?.alias === "Money");
    ok("3. neglect and the monthly card", r.living.level === 3 && !!card?.rows?.some(x => x.actor === rich.id) && !!msg && msg.content.includes(c.coin), {level: r.living.level, coin: c.coin});

    const age = A.consensus.age(), rules = A.consensus.rules;
    let year = null; try { year = game.modules.get("wodx-chronicle").api.eras.currentYear(); } catch (e) { /* none */ }
    const expect = game.settings.get("wodx-actions", "consensusEra") ? rules.ageFor(year).key : "ascension";
    ok("4. the age", age.key === expect && rules.WORDS.crusade.vulgar.startsWith("Vain"), {year, age: age.key});

    scene = await Scene.create({name: "WoDX gate: chapel", width: 1000, height: 1000});
    await scene.update({"flags.wodx-actions.consensus": {styles: "christian, prayer"}});
    mage = await Actor.create({name: "WoDX gate: stranger", type: "Mage", ownership: {default: 3}, flags: {"wodx-actions": {m20: {style: "Taoist"}}}});
    const sg = rules.suggestKind({age: "crusade", style: "Taoist", place: scene.flags["wodx-actions"].consensus.styles});
    const live = A.consensus.suggest({actor: mage, scene});
    ok("5. a stranger's magick", sg.kind === "vulgar" && rules.suggestKind({age: "crusade", style: "Christian miracles", place: "christian, prayer"}).kind === "coincidental" && !!live?.age,
      {suggested: sg.kind, live: live?.kind ?? null, liveAge: live?.age?.key});

    await mage.update({"system.paradox.temporary": 4, "system.paradox.permanent": 1});
    // Press the dialog's Done button for the gate
    const hk = Hooks.on("renderDialogV2", app => setTimeout(() => app.element?.querySelector?.("[data-action=ok]")?.click(), 100));
    try { await A.m20Purify({actor: mage}); } finally { Hooks.off("renderDialogV2", hk); }
    await sleep(400);
    ok("6. purify", mage.system.paradox.temporary === 1, {paradox: mage.system.paradox.temporary});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-storyteller", "moneyMonth", monthBefore);
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && (/WoDX gate/.test(m.content) || m.speaker?.alias === "Money")).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( scene ) await scene.delete();
    for ( const a of [poor, rich, mage] ) if ( a ) await a.delete();
    ok("7. clean up", !game.scenes.getName("WoDX gate: chapel") && !game.actors.getName("WoDX gate: stranger"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("7. clean up", false); }
  return save(R);
}
