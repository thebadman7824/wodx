/**
 * Done-claims audit fixes, WoDX Actions (B6155-B6159), rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetruthactions.mjs?${Date.now()}`)).run()
 * Makes its own scene (activated, so the clock covers its tokens), four vampires and a fight; moves the clock to the
 * middle of a day and on to the rising hour (the kit puts the clock back; the settings and the dice are put back too).
 * Each step drives the path play uses (a sheet update, the clock, a turn of the fight, a sheet's quick roll) and checks
 * the number that should change.
 *   1. the api is up, with the shared guard and the no-action list for WoDX Combat
 *   2. Golconda granted: the sheet's own Trait maximum (attributes, abilities, powers) reads 10 and the stray key is gone;
 *      a Strength of 6 bought on the sheet stays after the system's recompute; the Road falls to 6, Golconda ends by
 *      itself and Strength is back at the Generation's 5
 *   3. Blurred sight and Drained on the roller: a Notice check (sight) rolls at 6 + 2 + 1, a Balance check at 6 + 1
 *   3b. Blurred sight on the roller: WoDX Senses' closer look at sight rolls 2 harder than the same look without it
 *   4. the clock moves to the middle of the day: the sleeper sleeps; as a player, Spend Blood, a Common check and a
 *      Discipline are refused (no window opens, blood and Willpower stay)
 *   4b. still asleep, as a player: a step of the token is refused and WoDX Combat's attack window does not open
 *   5. two clock moves in a row to past the rising hour (the second lands while the first still runs): the sleeper
 *      rises, and a lethal level heals with blood
 *   6. a frenzy check in a fight is held turn by turn: one roll when the wound lands, none on the bearer's next turn
 *      (a success holds a turn), the next roll on the turn after, and the running total carries (dice forced to 10s)
 *   7. the inner voice: a sheet change carries the "before" pressure in the update's options (what the Storyteller's
 *      client reads when a player makes the change), and the voice is told the pressure grows
 *   8. a clan's feeding law broken (B6370): a Salubri feeds on an unwilling vessel with the dice forced to 1s, the
 *      Willpower roll fails, and the night's penalty takes 2 dice from the next Common check (the same pool as before
 *      the feeding) and from what WoDX Combat reads for an attack; the era is Dark Ages for the step (its rule)
 *   9. Lucky, Destiny and Fate (B6371): a Cainite with Destiny 2 rolls a frenzy check from its window with the box
 *      ticked; the first roll comes up 1s (a botch: frenzy), it is rolled again at once (10s), the Beast is held off,
 *      no frenzy, and one reroll of the story is spent
 *   10. the same in WoDX Combat's attack window (B6378): a mortal with Destiny 2 punches from the window with the box
 *      ticked; the first attack roll comes up 1s, it is rolled again at once (10s) before the defence and damage, the
 *      blow lands (the target is hurt) and one reroll of the story is spent
 * Result: Data/wodx-gate/gatetruthactions-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const MOD = "wodx-actions";
const KEEP = ["applyChanges", "spendResources", "autoBeast", "golcondaRules", "daySleep", "riseHeal", "sunDamage", "voicesOn", "voicePause"];
const wait = ms => new Promise(r => setTimeout(r, ms));
const num = v => Number(v) || 0;

/** Fix every d10 to one face. Foundry's mapping from randomUniform to a face has changed between versions (v12 on reads
 * 1 - u, so 0.999 gives a 1 there), so both readings are tried and the one that gives the wanted face is kept. */
async function fixDice(face) {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
}

/** The randomUniform value that gives one face (both of Foundry's readings tried). */
async function uFor(face) {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return u;
  }
  throw new Error(`no value gives a ${face}`);
}

/** Answer the next Actions window: fill the fields, press OK. */
function answer(vals = {}) {
  return new Promise(resolve => {
    const id = Hooks.on("renderDialogV2", (app, el) => {
      const root = el?.querySelector ? el : app.element;
      if ( !root?.querySelector?.("form") ) return;
      Hooks.off("renderDialogV2", id);
      const seen = {};
      for ( const f of root.querySelectorAll("input, select") ) if ( f.name ) seen[f.name] = f.type === "checkbox" ? f.checked : f.value;
      for ( const [k, v] of Object.entries(vals) ) {
        const f = root.querySelector(`[name=${k}]`);
        if ( !f ) continue;
        if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
      }
      setTimeout(() => { root.querySelector("button[data-action=ok]")?.click(); resolve(seen); }, 50);
    });
    setTimeout(() => { Hooks.off("renderDialogV2", id); resolve(null); }, 10000);
  });
}

export async function run() {
  const G = gate("gatetruthactions", {stepTimeout: 60000});
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const keep = {};
  for ( const k of KEEP ) { try { keep[k] = game.settings.get(MOD, k); } catch (e) { keep[k] = undefined; } }
  const dice = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  try {
    const A = game.modules.get(MOD)?.api;
    const C = game.modules.get("wodx-chronicle")?.api;
    await G.step("1. api", async () => {
      G.ok("1. api", !!(A?.quickCheck && A?.spendBlood && A?.daySleep && typeof A?.cannotAct === "function" && A?.noActionIds?.includes?.("asleep") && C?.conditions?.setCondition), {});
    });
    if ( !A ) return;
    for ( const [k, v] of [["applyChanges", true], ["spendResources", true], ["autoBeast", true], ["golcondaRules", true], ["daySleep", true],
      ["riseHeal", true], ["sunDamage", "off"]] ) { if ( keep[k] !== undefined ) await game.settings.set(MOD, k, v); }

    const scene = await G.scene({activate: true});
    const vamp = (name, extra = {}) => ({name, type: "Vampire", ownership: {default: 3}, prototypeToken: {actorLink: true}, system: {generation: 12, ...extra}});
    const [saint, roller, sleeper, beast, other] = await G.make(Actor, [vamp("Gate TA Saint"), vamp("Gate TA Roller"), vamp("Gate TA Sleeper"),
      vamp("Gate TA Beast"), {name: "Gate TA Other", type: "Mortal", prototypeToken: {actorLink: true}}]);
    const base = {"system.advantages.bloodpool.max": 10, "system.advantages.bloodpool.temporary": 6, "system.advantages.path.permanent": 8,
      "system.advantages.virtues.selfcontrol.permanent": 2, "system.advantages.virtues.conscience.permanent": 4, "system.advantages.virtues.courage.permanent": 3,
      "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5};
    for ( const a of [saint, roller, sleeper, beast] ) await a.update({...base});
    const [, tRoller, tSleeper, tBeast, tOther] = await G.tokens(scene, [{actor: saint, x: 2, y: 2}, {actor: roller, x: 4, y: 2}, {actor: sleeper, x: 8, y: 8},
      {actor: beast, x: 6, y: 2}, {actor: other, x: 7, y: 2}]);
    await wait(500);
    const blood = a => num(a.system?.advantages?.bloodpool?.temporary);
    const wp = a => num(a.system?.advantages?.willpower?.temporary);
    const dmg = (a, k) => num(a.system?.health?.damage?.[k]);
    const cardOf = (since, who, re = /./) => newestMessage(since, m => (m.speaker?.actor === who.id || (m.content ?? "").includes(who.name)) && re.test(`${m.content ?? ""}`));
    const cardsOf = (since, who, re) => game.messages.filter(m => m.timestamp >= since && (m.speaker?.actor === who.id || (m.content ?? "").includes(who.name)) && re.test(m.content ?? ""));
    const diffOn = m => num(/(\d+) dice, diff (\d+)/.exec(m?.content ?? "")?.[2]);

    await G.step("2. Golconda lifts the sheet's maximum and a bought dot stays", async () => {
      try { await saint.update({"system.abilities.defaultmaxvalue": 5}); } catch (e) { /* the sheet refuses the stray key: nothing to clean */ } // what an older build wrote
      const caps = () => ({attributes: num(saint.system?.settings?.attributes?.defaultmaxvalue), abilities: num(saint.system?.settings?.abilities?.defaultmaxvalue),
        powers: num(saint.system?.settings?.powers?.defaultmaxvalue), strengthMax: num(saint.system?.attributes?.strength?.max)});
      await saint.setFlag(MOD, "golconda", true);
      // the system's derived data reads 10 at once; WoDX Actions' own write (attributes, the stray key gone) lands a round trip later
      await waitFor(() => { const c = caps(); return c.attributes === 10 && c.abilities === 10 && c.powers === 10 && c.strengthMax === 10
        && (saint.system?.abilities?.defaultmaxvalue ?? null) === null; }, 8000);
      const up = caps(), stray = saint.system?.abilities?.defaultmaxvalue ?? null;
      await saint.update({"system.attributes.strength.value": 6});
      await wait(1500); // the system's own recompute writes back after the update
      const kept = num(saint.system.attributes.strength.value);
      await saint.update({"system.advantages.path.permanent": 6});
      const fell = await waitFor(() => !saint.getFlag(MOD, "golconda") && caps().strengthMax === 5 && caps().attributes === 5, 8000);
      await wait(1000);
      const down = caps(), after = num(saint.system.attributes.strength.value);
      G.ok("2. Golconda lifts the sheet's maximum and a bought dot stays", up.attributes === 10 && up.abilities === 10 && up.powers === 10 && up.strengthMax === 10
        && stray === null && kept === 6 && !!fell && down.abilities === 5 && after === 5, {up, stray, kept, down, strengthAfterFall: after});
    });

    await G.step("3. Blurred sight and Drained reach a Common check", async () => {
      await C.conditions.setCondition(roller, "blurred-sight", true);
      await C.conditions.setCondition(roller, "drained", true);
      await waitFor(() => roller.statuses?.has?.("wodx-blurred-sight") && roller.statuses?.has?.("wodx-drained"), 4000);
      let since = Date.now();
      await A.quickCheck({actor: roller, check: "notice", direct: true});
      // waitFor answers true or false: the card itself is read after it
      await waitFor(() => cardOf(since, roller, /dice, diff/), 6000);
      const sight = cardOf(since, roller, /dice, diff/);
      since = Date.now();
      await A.quickCheck({actor: roller, check: "agility", direct: true});
      await waitFor(() => cardOf(since, roller, /dice, diff/), 6000);
      const body = cardOf(since, roller, /dice, diff/);
      G.ok("3. Blurred sight and Drained reach a Common check", diffOn(sight) === 9 && diffOn(body) === 7, {notice: diffOn(sight), balance: diffOn(body)});
      await C.conditions.setCondition(roller, "blurred-sight", false);
      await C.conditions.setCondition(roller, "drained", false);
    });

    await G.step("3b. Blurred sight reaches WoDX Senses' closer look", async () => {
      const Sn = game.modules.get("wodx-senses")?.active ? game.modules.get("wodx-senses").api : null;
      if ( !Sn?.answer ) { G.ok("3b. Blurred sight reaches WoDX Senses' closer look", false, {error: "WoDX Senses is off"}); return; }
      const look = async () => {
        await roller.unsetFlag("wodx-senses", "memory").catch(() => null); // a fresh look, not the remembered answer
        const res = await Sn.answer({user: game.user.id, token: tRoller.uuid, sense: "sight", closer: true});
        return res?.sections?.[0] ?? null;
      };
      const plain = await look();
      await C.conditions.setCondition(roller, "blurred-sight", true);
      await waitFor(() => roller.statuses?.has?.("wodx-blurred-sight"), 4000);
      const blurred = await look();
      await C.conditions.setCondition(roller, "blurred-sight", false);
      G.ok("3b. Blurred sight reaches WoDX Senses' closer look", !!plain?.rolled && !!blurred?.rolled && (num(blurred.diff?.diff) - num(plain.diff?.diff) === 2 || num(blurred.diff?.diff) === 10)
        && (blurred.diff?.parts ?? []).some(p => /Blurred sight/.test(p)), {plain: plain?.diff ?? null, blurred: blurred?.diff ?? null});
    });

    const DS = A.daySleep?.();
    await G.step("4. asleep by day: a player's windows refuse", async () => {
      await sleeper.update({"system.health.damage.lethal": 1});
      let s = null;
      for ( let i = 0; i < 60; i++ ) {
        s = await DS.sunClock();
        if ( s.isNight === false && s.toDusk > 3 * 3600 ) break;
        await game.time.advance(1800);
        await wait(150);
      }
      const asleep = await waitFor(() => !!sleeper.getFlag(MOD, "daySleep"), 10000);
      const b0 = blood(sleeper), w0 = wp(sleeper);
      let opened = 0;
      const hook = Hooks.on("renderDialogV2", app => { opened++; setTimeout(() => app.close?.(), 50); });
      // A player's client: the guard reads game.user.isGM before anything else, so the shadow is lifted at once
      const asPlayer = fn => { Object.defineProperty(game.user, "isGM", {get: () => false, configurable: true}); try { return fn(); } finally { delete game.user.isGM; } };
      try {
        await asPlayer(() => A.spendBlood({actor: sleeper}));
        await asPlayer(() => A.quickCheck({actor: sleeper, check: "notice", wp: true}));
        await asPlayer(() => A.useDiscipline?.({actor: sleeper}));
        await wait(600);
      } finally { Hooks.off("renderDialogV2", hook); }
      G.ok("4. asleep by day: a player's windows refuse", !!asleep && opened === 0 && blood(sleeper) === b0 && wp(sleeper) === w0 && !!A.cannotAct(sleeper),
        {sun: s, opened, blood: [b0, blood(sleeper)], willpower: [w0, wp(sleeper)], why: A.cannotAct(sleeper)});
    });

    await G.step("4b. asleep by day: the token does not walk and makes no attack", async () => {
      // A player's client for the whole move (the token's update reaches its preUpdate hook after an await)
      const shadow = async fn => { Object.defineProperty(game.user, "isGM", {get: () => false, configurable: true}); try { return await fn(); } finally { delete game.user.isGM; } };
      const x0 = tSleeper.x, warned = [];
      const warn = ui.notifications.warn;
      ui.notifications.warn = (m, ...r) => { warned.push(String(m)); return warn.call(ui.notifications, m, ...r); };
      let attacked;
      try {
        await shadow(() => tSleeper.update({x: x0 + scene.grid.size}).catch(() => null));
        // the attack's refusal comes before its first await, so the shadow is lifted at once; a window that opens is closed
        Object.defineProperty(game.user, "isGM", {get: () => false, configurable: true});
        let pr;
        try { pr = game.wodxCombat?.attack?.({attacker: sleeper, target: tOther.object ?? tOther}) ?? null; } finally { delete game.user.isGM; }
        attacked = await Promise.race([Promise.resolve(pr).then(r => r ?? null, () => null), wait(1500).then(() => "a window opened")]);
        if ( attacked ) for ( const app of foundry.applications.instances?.values?.() ?? [] ) if ( /attack/i.test(app.title ?? "") ) app.close?.();
      } finally { ui.notifications.warn = warn; }
      await wait(400);
      G.ok("4b. asleep by day: the token does not walk and makes no attack", !!sleeper.getFlag(MOD, "daySleep") && tSleeper.x === x0 && !attacked
        && warned.filter(m => /asleep for the day/.test(m)).length >= 2, {x: [x0, tSleeper.x], attacked: !!attacked, warned});
    });

    await G.step("5. two clock moves at once: the sleeper still rises and heals", async () => {
      const wakeAt = sleeper.getFlag(MOD, "daySleep")?.wakeAt;
      const b0 = blood(sleeper);
      if ( wakeAt ) {
        // the second move lands while the first move's run is still going: it must not be dropped
        const first = game.time.advance(30);
        const second = game.time.advance(wakeAt - game.time.worldTime + 90);
        await Promise.all([first, second]);
      }
      // the rising's last write is waited for (B6441): the flag goes, then blood is spent, then the wound closes
      const risen = await waitFor(() => !sleeper.getFlag(MOD, "daySleep") && dmg(sleeper, "lethal") === 0 && blood(sleeper) < b0, 15000);
      G.ok("5. two clock moves at once: the sleeper still rises and heals", !!wakeAt && !!risen && blood(sleeper) < b0 && !A.cannotAct(sleeper),
        {wakeAt, now: game.time.worldTime, asleep: !!sleeper.getFlag(MOD, "daySleep"), lethal: dmg(sleeper, "lethal"), blood: [b0, blood(sleeper)], why: A.cannotAct(sleeper) || null});
    });

    await G.step("6. a frenzy check in a fight is held turn by turn", async () => {
      await fixDice(10); // every die a 10: Self-Control 2 gives 2 successes a roll
      const [fight] = await G.make(Combat, [{scene: scene.id}]);
      await fight.createEmbeddedDocuments("Combatant", [{tokenId: tBeast.id, sceneId: scene.id, actorId: beast.id, initiative: 20},
        {tokenId: tOther.id, sceneId: scene.id, actorId: other.id, initiative: 5}]);
      await fight.startCombat();
      const onBeast = () => fight.combatant?.actorId === beast.id;
      const toTurn = async want => { for ( let i = 0; i < 4 && onBeast() !== want; i++ ) { await fight.nextTurn(); await wait(400); } };
      await toTurn(false);
      const since = Date.now(), re = /Frenzy check|Instinct check/;
      await beast.update({"system.health.damage.lethal": 4});
      await waitFor(() => cardsOf(since, beast, re).length >= 1, 10000);
      await wait(1500);
      const first = {cards: cardsOf(since, beast, re).length, total: num(beast.getFlag(MOD, "beastHold")?.d?.total), left: num(beast.getFlag(MOD, "beastHold")?.left)};
      await toTurn(true); await wait(800);
      const held = {cards: cardsOf(since, beast, re).length, left: num(beast.getFlag(MOD, "beastHold")?.left)};
      await toTurn(false); await toTurn(true);
      await waitFor(() => cardsOf(since, beast, re).length >= 2, 8000);
      await wait(500);
      const second = {cards: cardsOf(since, beast, re).length, total: num(beast.getFlag(MOD, "beastHold")?.d?.total)};
      G.ok("6. a frenzy check in a fight is held turn by turn", first.cards === 1 && first.total === 2 && first.left === 2 && held.cards === 1 && held.left === 1
        && second.cards === 2 && second.total === 4 && !beast.system?.conditions?.isfrenzy, {first, held, second});
      CONFIG.Dice.randomUniform = dice;
    });

    await G.step("7. the voice's before level rides in the update", async () => {
      const player = game.users.find(u => !u.isGM);
      if ( !player ) { G.ok("7. the voice's before level rides in the update", false, {error: "no player user on the lane to own the character"}); return; }
      if ( keep.voicesOn !== undefined ) await game.settings.set(MOD, "voicesOn", true);
      if ( keep.voicePause !== undefined ) await game.settings.set(MOD, "voicePause", "");
      await roller.update({[`ownership.${player.id}`]: 3, "system.advantages.bloodpool.temporary": 9});
      await roller.setFlag(MOD, "voice", {optIn: true});
      let carried;
      const hook = Hooks.on("updateActor", (a, ch, opts) => { if ( a.id === roller.id && carried === undefined ) carried = opts?.wodxVoiceBefore; });
      const since = Date.now();
      try {
        await roller.update({"system.advantages.bloodpool.temporary": 1});
        await waitFor(() => carried !== undefined, 4000);
      } finally { Hooks.off("updateActor", hook); }
      const told = await waitFor(() => newestMessage(since, m => /grows/.test(m.content ?? "")), 6000);
      G.ok("7. the voice's before level rides in the update", carried !== undefined && !!told && blood(roller) === 1, {carried: carried ?? null, told: !!told, blood: blood(roller)});
    });
    await G.step("8. a broken feeding law takes 2 dice from the night's rolls", async () => {
      const era0 = (() => { try { return game.settings.get("wodx-chronicle", "activeEra"); } catch (e) { return undefined; } })();
      const [healer, vessel] = await G.make(Actor, [vamp("Gate TA Healer", {clan: "salubri"}), {name: "Gate TA Vessel", type: "Mortal"}]);
      await healer.update({...base, "system.advantages.bloodpool.temporary": 6, "system.advantages.virtues.selfcontrol.permanent": 4,
        "system.attributes.perception.value": 3, "system.attributes.perception.total": 3, "system.abilities.alertness.value": 2});
      const [, tVessel] = await G.tokens(scene, [{actor: healer, x: 10, y: 4}, {actor: vessel, x: 11, y: 4}]);
      await waitFor(() => !!tVessel?.object, 6000);
      try {
        if ( A.feedingRule?.(healer)?.unwilling !== "wpRoll" && era0 !== undefined ) await game.settings.set("wodx-chronicle", "activeEra", "dark-ages");
        const rule = A.feedingRule?.(healer);
        const diceOf = m => num(/(\d+) dice, diff/.exec(m?.content ?? "")?.[1]);
        let since = Date.now();
        await A.quickCheck({actor: healer, check: "notice", direct: true});
        await waitFor(() => cardOf(since, healer, /dice, diff/), 6000);
        const before = diceOf(cardOf(since, healer, /dice, diff/));
        await fixDice(1); // the Willpower roll (6) fails
        const p = answer({take: 1, willing: false});
        await A.feed({actor: healer, vessel: tVessel.object});
        await p;
        CONFIG.Dice.randomUniform = dice;
        const penalised = await waitFor(() => [...healer.effects].some(e => e.flags?.["wodx-chronicle"]?.timed?.key === A.powerMods?.rules?.KEYS?.penalty), 8000);
        since = Date.now();
        await A.quickCheck({actor: healer, check: "notice", direct: true});
        await waitFor(() => cardOf(since, healer, /dice, diff/), 6000);
        const after = diceOf(cardOf(since, healer, /dice, diff/));
        const attack = num(A.powerMods?.of?.(healer, {tags: ["physical", "dexterity", "melee"]})?.dice);
        G.ok("8. a broken feeding law takes 2 dice from the night's rolls", rule?.unwilling === "wpRoll" && !!penalised && before >= 3 && after === before - 2 && attack === -2,
          {rule: rule?.unwilling ?? null, penalised, dice: [before, after], attack});
      } finally {
        CONFIG.Dice.randomUniform = dice;
        if ( era0 !== undefined ) { try { await game.settings.set("wodx-chronicle", "activeEra", era0); } catch (e) { /* gone */ } }
      }
    });

    await G.step("9. Destiny rolls a failed frenzy check again", async () => {
      const [fated] = await G.make(Actor, [vamp("Gate TA Fated")]);
      await fated.update({...base});
      await fated.createEmbeddedDocuments("Item", [{name: "Destiny", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
      await wait(300);
      const left0 = A.traitHooks?.luckyLeft?.(fated) ?? null;
      const u1 = await uFor(1), u10 = await uFor(10);
      let i = 0;
      CONFIG.Dice.randomUniform = () => (i++ < 2 ? u1 : u10); // Self-Control 2: the first roll 1, 1; the second 10, 10
      const since = Date.now();
      try {
        const p = answer({prov: "physical", lucky: true, wp: false});
        await A.frenzy({actor: fated});
        const seen = await p;
        await waitFor(() => cardsOf(since, fated, /Frenzy check|Instinct check|rolled again/).length >= 1, 6000);
        await wait(500);
        const card = cardsOf(since, fated, /rolled again/)[0] ?? null;
        const used = num(fated.getFlag(MOD, "lucky")?.used);
        G.ok("9. Destiny rolls a failed frenzy check again", !!seen?.lucky && !!card && /2 successes|Held off/.test(card?.content ?? "") && !fated.system?.conditions?.isfrenzy && used === 1,
          {offered: seen?.lucky ?? null, left0, card: !!card, used, isfrenzy: !!fated.system?.conditions?.isfrenzy});
      } finally { CONFIG.Dice.randomUniform = dice; }
    });
    await G.step("10. Destiny rolls a failed attack again in WoDX Combat's window", async () => {
      const CB = game.modules.get("wodx-combat")?.api ?? game.wodxCombat;
      const [hero, foe] = await G.make(Actor, [{name: "Gate TA Hero", type: "Mortal", ownership: {default: 3}, prototypeToken: {actorLink: true}},
        {name: "Gate TA Foe", type: "Mortal", prototypeToken: {actorLink: true}}]);
      await hero.update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3, "system.attributes.strength.value": 3,
        "system.attributes.strength.total": 3, "system.abilities.brawl.value": 2});
      await hero.createEmbeddedDocuments("Item", [{name: "Destiny", type: "Feature", system: {type: "wod.types.background", value: 2}}]);
      const [tH, tF] = await G.tokens(scene, [{actor: hero, x: 12, y: 4}, {actor: foe, x: 13, y: 4}]);
      await waitFor(() => tH?.object && tF?.object, 6000);
      await wait(300);
      const hurt = () => dmg(foe, "bashing") + dmg(foe, "lethal");
      const hurt0 = hurt();
      const u1 = await uFor(1), u10 = await uFor(10);
      const orig = Roll.prototype.evaluate;
      let evals = 0;
      CONFIG.Dice.randomUniform = () => (evals === 0 ? u1 : u10); // the first roll after the press (the attack) all 1s, the rest 10s
      Roll.prototype.evaluate = async function(...a) { try { return await orig.apply(this, a); } finally { evals++; } };
      const since = Date.now();
      let offered = null, res = null;
      const auto0 = game.settings.get("wodx-combat", "autoApply");
      await game.settings.set("wodx-combat", "autoApply", true);
      try {
        evals = -1; // nothing counted before the window's press
        const run = CB.attack({attacker: tH.object, target: tF.object, weaponId: "unarmed:punch", noAim: true});
        let dlg = null;
        await waitFor(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.("select[name='weapon']"))), 8000);
        const root = dlg?.element;
        offered = root?.querySelector("input[name=lucky]")?.checked ?? null;
        const def = root?.querySelector("select[name='defense']");
        if ( def ) { def.value = "none"; def.dispatchEvent(new Event("change", {bubbles: true})); }
        evals = 0;
        root?.querySelector("button[data-action='attack']")?.click();
        res = await run;
        await waitFor(() => hurt() > hurt0, 6000);
      } finally { Roll.prototype.evaluate = orig; CONFIG.Dice.randomUniform = dice; await game.settings.set("wodx-combat", "autoApply", auto0); }
      const card = cardsOf(since, hero, /rolled again/)[0] ?? null;
      const used = num(hero.getFlag(MOD, "lucky")?.used);
      G.ok("10. Destiny rolls a failed attack again in WoDX Combat's window", offered === true && !!card && num(res?.attack?.successes) > 0 && used === 1 && hurt() > hurt0,
        {offered, card: !!card, atk: res?.attack?.successes ?? null, used, hurt: [hurt0, hurt()]});
      for ( const c of game.combats.filter(c => c.combatants.some(x => x.tokenId === tH.id)) ) { try { await c.delete(); } catch (e) { /* gone */ } }
    });
    G.R.notes.push(`ran ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    CONFIG.Dice.randomUniform = dice;
    for ( const [k, v] of Object.entries(keep) ) if ( v !== undefined ) { try { await game.settings.set(MOD, k, v); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
