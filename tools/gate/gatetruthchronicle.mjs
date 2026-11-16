/**
 * WoDX gate (done-claims audit fixes, WoDX Chronicle, B6160-B6164, B6380-B6385): what Chronicle says it does reaches play through
 * the path a table uses. In Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetruthchronicle.mjs?${Date.now()}`)).run()
 * Makes its own scene (active) and actors and removes them; holds the world except where a step needs the clock to
 * be heard, puts the clock, the hold and every setting it touches back, and deletes the chat cards it caused.
 *
 *   1. a derangement bout reaches the next real roll and ends with the scene: giving in to Paranoia makes a quick
 *      Persuade check 2 harder; the clock's End the scene ends the bout without the clock moving, and the same check
 *      is back at its old difficulty (B6161)
 *   2. prison by the sentence card's own button takes the token off the map; with the term up (its end set to this
 *      year), the clock moving while the world is held frees no one; with the hold off, a short time skip brings the
 *      token back when the skip ends (B6162)
 *   3. a ghoul a month unfed with its domitor on the active scene, at the default settings (Clan features off, Ghouls
 *      need vitae on): a new day on the clock offers the feeding, and once approved a blood point passes (B6160)
 *   4. Branded is a token status before anyone is branded (B6163)
 *   5. ticking the sheet's own Frenzy box gives the token the frenzy glow, and unticking it takes it away (B6163)
 *   6. with Great cities off (the default), a patron who raises a building from the Cities window pays for it (B6164)
 *   7. Bruiser and a Paranoia bout reach a real roll from the system sheet's own labels (Intimidation, Charisma), through
 *      WoDX Sheets' wrap of the roll window (B6175): one less difficulty, then two more (B6385)
 *   8. Light-touch mode on: a bout past its hour, a timed effect past its time and a crime that reaches a stage all
 *      wait through a clock move (no stage card); turned off, the bout and the effect end and the card comes (B6380)
 *   9. the Storyteller's era lock: a mortal made in the Dark Ages has no Firearms; at the Renaissance the profile adds it
 *      to that sheet and to a new one (the fork reads it); at the modern era the sheet's era moves, Computer shows and
 *      Melee 3 stays (B6382, B6383). Only the gate's sheets follow; the era is put back by the same lock
 *  10. Chronicle's data version 2: with the world at 1, the migration run writes a backup, names an old bout's scene and
 *      raises the version (B6384)
 *  11. the clock moved to dawn reads Day there and Night a second before, and WoDX Actions' sun agrees at dawn and
 *      dusk, a second either side (B6381)
 *  12. a Phobia bout in a fight: at the start of the bearer's turn Courage is rolled (dice set to fail) and WoDX
 *      Combat's lostAction is set for that round, with a card (B6386)
 * Not here: a player's looks.show() going to the Storyteller needs a second, player's client.
 * Result: Data/wodx-gate/gatetruthchronicle-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

/** The window's element: jQuery on the old engine, the element itself on ApplicationV2 (whose <form>[0] is its first control). */
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;

const C_ID = "wodx-chronicle";
const SIGS = ["sigVampire", "sigWerewolf", "sigMage", "sigChangeling", "sigWraith"];
const KEEP = [[C_ID, "hold"], [C_ID, "lawHeatOn"], [C_ID, "lawHeat"], ...SIGS.map(k => [C_ID, k]), [C_ID, "ghoulNeed"], [C_ID, "autoApprove"],
  [C_ID, "podCities"], ["wodx-storyteller", "reachOn"], ["wodx-actions", "traitRolls"], ["wodx-sheets", "sheetRollMods"], [C_ID, "rule.lightTouch"],
  [C_ID, "dataVersions"], [C_ID, "quietHeld"]];

export async function run() {
  const G = gate("gatetruthchronicle", {stepTimeout: 60000});
  if ( G.notLive() ) return "Not on the Live world.";
  const C = () => game.modules.get(C_ID)?.api;
  const A = () => game.modules.get("wodx-actions")?.api;
  const M = () => game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
  const t0 = Date.now();
  const keep = {};
  for ( const [m, k] of KEEP ) { try { keep[`${m}.${k}`] = foundry.utils.deepClone(game.settings.get(m, k)); } catch (e) { /* not here */ } }
  const set = async (m, k, v) => { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); } };
  const clearTargets = () => { for ( const t of [...(game.user.targets ?? [])] ) { try { t.setTarget(false, {releaseOthers: false}); } catch (e) { /* none */ } } };
  /** The difficulty a quick Persuade check rolled at, read from its card ("N dice, diff D"). */
  async function persuadeDiff(actor) {
    const since = Date.now();
    clearTargets();
    await A()?.quickCheck?.({actor, check: "persuade", direct: true});
    const test = m => m.content?.includes(actor.name) && /dice, diff \d+/.test(m.content ?? "");
    await waitFor(() => newestMessage(since, test), 8000);
    const m = newestMessage(since, test);
    return m ? Number(/dice, diff (\d+)/.exec(m.content)?.[1]) : null;
  }
  /** Fire a guilty verdict (law-trial's hook), find the sentence card, render it and press the button for `pick`. */
  async function sentenceByButton(actor, deeds, pick, region = "moravia") {
    const since = Date.now(), year = C()?.eras?.currentYear?.() ?? 1197;
    Hooks.callAll("wodxVerdict", {actor: actor.id, name: actor.name, region, guilty: true, deeds, form: "judge", year});
    await waitFor(() => newestMessage(since, m => m.flags?.[C_ID]?.lawSentence?.actorId === actor.id), 8000);
    const card = newestMessage(since, m => m.flags?.[C_ID]?.lawSentence?.actorId === actor.id);
    if ( !card ) return {error: "no sentence card"};
    const el = await card.renderHTML();
    const buttons = [...el.querySelectorAll("[data-action='wodx-law-sentence']")];
    const offered = buttons.map(b => b.dataset.punish);
    const b = buttons.find(x => pick(x.dataset.punish));
    if ( !b ) return {error: "no fitting button", offered};
    const before = (actor.getFlag(C_ID, "lawMarks") ?? []).length;
    b.click();
    await waitFor(() => (game.actors.get(actor.id)?.getFlag(C_ID, "lawMarks") ?? []).length > before, 8000);
    const mark = (game.actors.get(actor.id)?.getFlag(C_ID, "lawMarks") ?? []).at(-1) ?? null;
    return {mark, offered, punish: b.dataset.punish, year, region};
  }
  const kindOf = p => C()?.law?.sentence?.rules?.MARKS?.[p]?.kind;
  /** A real roll from the system sheet: click the label, press the window's Roll, read the card WoDX Sheets marked. */
  async function sheetRoll(actor, selector) {
    const sheet = actor.sheet;
    await sheet.render(true);
    const label = () => elOf(sheet)?.querySelector?.(selector);
    await waitFor(() => sheet.rendered && label(), 8000);
    const t0 = Date.now();
    label()?.click();
    let dlg = null;
    await waitFor(() => (dlg = Object.values(ui.windows).find(w => w.constructor?.name === "DialogGeneralRoll" && w.actor?.id === actor.id && w.rendered)), 8000);
    elOf(dlg)?.querySelector?.(".actionbutton")?.click();
    let m = null;
    await waitFor(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && x.speaker?.actor === actor.id && (x.rolls?.length ?? 0) > 0).at(-1)), 8000);
    try { await dlg?.close?.(); } catch (e) { /* closed */ }
    try { await sheet.close(); } catch (e) { /* closed */ }
    return {card: !!m, mods: m?.flags?.["wodx-sheets"]?.rollMods ?? null, line: /WoDX:/.test(m?.content ?? "")};
  }
  /** A land whose law this year lets a court send a killer to prison (medieval Latin Christendom has none). */
  const timeRegion = deeds => {
    const year = C()?.eras?.currentYear?.() ?? 1197, P = C()?.law?.sentence?.rules;
    const ids = ["moravia", ...Object.keys(C()?.world?.regions ?? {})];
    return ids.find(r => { try { return P.sentencesFor(C().law.of(r, year), deeds).list.some(p => kindOf(p) === "time"); } catch (e) { return false; } }) ?? "moravia";
  };

  try {
    await set(C_ID, "hold", true);
    await set(C_ID, "lawHeatOn", true);
    await set("wodx-actions", "traitRolls", true);
    const scene = await G.scene({activate: true});

    await G.step("1. a bout on the next roll, over with the scene", async () => {
      const [p] = await G.make(Actor, [{name: "Gate TruthC Paranoid", type: "Mortal"}]);
      await G.tokens(scene, [{actor: p, x: 1, y: 1}]);
      await p.update({"system.derangement": "Paranoia"});
      const before = await persuadeDiff(p);
      const r = await C()?.derangements?.hold?.(p, "paranoia", {give: true});
      const on = p.statuses?.has?.("wodx-deranged");
      const during = await persuadeDiff(p);
      const clock = game.time.worldTime;
      await C().endScene();
      const off = await waitFor(() => !game.actors.get(p.id)?.statuses?.has?.("wodx-deranged"), 8000);
      const after = await persuadeDiff(p);
      G.ok("1. a bout on the next roll, over with the scene", !!r && !r.held && on && Number.isFinite(before) && during === Math.min(10, before + 2)
        && off && after === before && game.time.worldTime === clock, {before, during, after, on, off, clockMoved: game.time.worldTime - clock});
    });

    await G.step("2. prison: off the map; a hold frees no one; the skip's end does", async () => {
      const [pr] = await G.make(Actor, [{name: "Gate TruthC Prisoner", type: "Mortal", prototypeToken: {actorLink: true}}]);
      const [tp] = await G.tokens(scene, [{actor: pr, x: 4, y: 4}]);
      const s = await sentenceByButton(pr, [{deed: "killing"}], p => kindOf(p) === "time", timeRegion([{deed: "killing"}]));
      const tok = () => scene.tokens.get((tp.document ?? tp).id);
      // B6429: the term on the character and the token off the map, both, before the term is shortened
      const gone = !!s.mark && (await waitFor(() => tok()?.hidden === true && !!game.actors.get(pr.id)?.getFlag(C_ID, "lawAway"), 5000));
      // a term that ends this year (a sentence passed years ago), so no years of clock are needed; held, the clock
      // moves a minute and nothing reacts
      const away = game.actors.get(pr.id)?.getFlag(C_ID, "lawAway");
      const yearNow = C()?.eras?.currentYear?.() ?? s.year;
      if ( away ) await pr.setFlag(C_ID, "lawAway", {...away, until: yearNow});
      const shortened = await waitFor(() => Number(game.actors.get(pr.id)?.getFlag(C_ID, "lawAway")?.until) === Number(yearNow), 5000);
      await game.time.advance(60);
      await new Promise(r => setTimeout(r, 1500));
      const heldStill = tok()?.hidden === true && !!game.actors.get(pr.id)?.getFlag(C_ID, "lawAway");
      // the hold off, a short time skip: the skip's end lets them out
      await set(C_ID, "hold", false);
      await C().timeSkip(game.time.worldTime + 60, {label: "gate", eraHandled: true});
      // the skip's end starts every module's settling at once (Legends, the factions, signatures); in a world that
      // other gates have run in, the prisoner's turn can come late, so the wait is long
      const back = await waitFor(() => tok()?.hidden === false && !game.actors.get(pr.id)?.getFlag(C_ID, "lawAway"), 30000);
      const after = {shown: tok() ? tok().hidden === false : "no token", away: game.actors.get(pr.id)?.getFlag(C_ID, "lawAway") ?? null,
        year: C()?.eras?.currentYear?.() ?? null, skipping: game.settings.get(C_ID, "skipping") ?? null};
      await set(C_ID, "hold", true);
      // offered lists the card's buttons; "" is its Mercy button (no sentence)
      G.ok("2. prison: off the map; a hold frees no one; the skip's end does", s.mark?.kind === "time" && gone && shortened && heldStill && back,
        {region: s.region, offered: s.offered, punish: s.punish, until: s.mark?.until, gone, shortened, heldStill, back, ...(back ? {} : {after}), error: s.error});
    });

    await G.step("3. the domitor's feeding, default settings", async () => {
      const T = `${C_ID}.sigGhoulFeed`, AP = C()?.approvals;
      for ( const k of SIGS ) await set(C_ID, k, false);
      await set(C_ID, "ghoulNeed", true);
      // a standing rule would approve it on sight: set it aside so the queue is what is tested
      const auto = foundry.utils.deepClone(game.settings.get(C_ID, "autoApprove") ?? {}); delete auto[T];
      await set(C_ID, "autoApprove", auto);
      const [dom, gh] = await G.make(Actor, [{name: "Gate TruthC Domitor", type: "Vampire", prototypeToken: {actorLink: true}},
        {name: "Gate TruthC Ghoul", type: "Mortal", prototypeToken: {actorLink: true}}]);
      await gh.update({"system.settings.variant": "ghoul", "system.advantages.bloodpool.temporary": 3});
      await dom.update({"system.advantages.bloodpool.temporary": 6});
      await gh.update({"flags.wodx-creation.lineage": {domitor: {id: dom.id, name: dom.name}}, [`flags.${C_ID}.sig`]: {ghoul: {fedAt: game.time.worldTime - 31 * 86400, warned: 0}}});
      await G.tokens(scene, [{actor: dom, x: 2, y: 8}, {actor: gh, x: 3, y: 8}]);
      // the clock's own trigger: a new day, heard with the hold off
      await set(C_ID, "hold", false);
      await game.time.advance(86400);
      const asked = await waitFor(() => AP?.pending?.().some(p => p.type === T && p.data?.ghoul === gh.id), 10000);
      await set(C_ID, "hold", true);
      const p = AP?.pending?.().find(x => x.type === T && x.data?.ghoul === gh.id);
      const ghBefore = Number(game.actors.get(gh.id)?.system.advantages.bloodpool.temporary);
      if ( p ) await AP.decide(p.id, "approve");
      const moved = await waitFor(() => Number(game.actors.get(dom.id)?.system.advantages.bloodpool.temporary) === 5, 5000);
      const ghAfter = Number(game.actors.get(gh.id)?.system.advantages.bloodpool.temporary);
      G.ok("3. the domitor's feeding, default settings", asked && moved && ghAfter === ghBefore + 1, {asked, moved, ghBefore, ghAfter, domBlood: game.actors.get(dom.id)?.system.advantages.bloodpool.temporary});
    });

    await G.step("4. Branded is a token status from the start", async () => {
      const entry = (CONFIG.statusEffects ?? []).find(e => e.id === "wodx-branded");
      G.ok("4. Branded is a token status from the start", !!entry && entry.hud !== false && entry.name === "Branded", {entry: entry ? {id: entry.id, name: entry.name, hud: entry.hud} : null});
    });

    await G.step("5. the sheet's Frenzy box glows", async () => {
      const [f] = await G.make(Actor, [{name: "Gate TruthC Frenzied", type: "Vampire", prototypeToken: {actorLink: true}}]);
      const [tf] = await G.tokens(scene, [{actor: f, x: 10, y: 2}]);
      const obj = () => (tf.document ?? tf).object;
      await waitFor(() => !!obj()?.mesh, 5000);
      const plain = !obj()?._wodxLook?.aura;
      await f.update({"system.conditions.isfrenzy": true});
      const glow = await waitFor(() => !!obj()?._wodxLook?.aura && !obj()._wodxLook.aura.destroyed, 5000);
      const tint = obj()?.mesh?.tint;
      await f.update({"system.conditions.isfrenzy": false});
      const gone = await waitFor(() => !obj()?._wodxLook?.aura, 5000);
      G.ok("5. the sheet's Frenzy box glows", plain && glow && gone, {plain, glow, tint, gone, status: f.statuses?.has?.("wodx-frenzy")});
    });

    await G.step("6. a patron pays, Great cities off", async () => {
      await set(C_ID, "podCities", false);
      const [patron] = await G.make(Actor, [{name: "Gate TruthC Patron", type: "Mortal", prototypeToken: {actorLink: true}}]);
      const worth = a => { const p = M()?.purse?.(a) ?? {}; return (Number(p.carried) || 0) + (Number(p.bank) || 0) - (Number(p.debt) || 0); };
      await M()?.receive?.(patron, 100000, {note: "gate"});
      const before = worth(patron);
      // the Cities window's own Raise or restore
      const app = C()?.pod?.open?.();
      await waitFor(() => !!document.querySelector("#wodx-pod [data-build] button[data-action='build']"), 5000);
      const form = document.querySelector("#wodx-pod [data-build]");
      if ( form ) {
        form.querySelector("[name=patron]").value = patron.name;
        form.querySelector("[name=building]").value = "Gate TruthC chapel";
        form.querySelector("button[data-action='build']").click();
      }
      const paid = await waitFor(() => worth(patron) < before, 8000);
      try { await (app ?? foundry.applications.instances?.get?.("wodx-pod"))?.close?.(); } catch (e) { /* closed */ }
      G.ok("6. a patron pays, Great cities off", !!form && paid, {form: !!form, before, after: worth(patron), money: !!M()?.pay});
    });

    await G.step("7. a merit and a derangement through a real sheet roll", async () => {
      await set("wodx-sheets", "sheetRollMods", true);
      const [br, pa] = await G.make(Actor, [{name: "Gate TruthC Bruiser", type: "Mortal"}, {name: "Gate TruthC Sheet Paranoid", type: "Mortal"}]);
      await br.createEmbeddedDocuments("Item", [{name: "Bruiser", type: "Feature", system: {type: "wod.types.merit", value: 1}}]);
      await br.update({"system.abilities.intimidation.value": 2, "system.abilities.intimidation.isvisible": true});
      // Bruiser: one less difficulty on Intimidation (V20 p. 480), from the sheet's own Intimidation label
      const merit = await sheetRoll(br, "label.vrollable[data-ability='true'][data-key='intimidation']");
      // Paranoia given in to: two more on social rolls for the bout, from the sheet's own Charisma label
      await pa.update({"system.derangement": "Paranoia"});
      const plain = await sheetRoll(pa, "label.vrollable[data-attribute='true'][data-key='charisma']");
      await C()?.derangements?.hold?.(pa, "paranoia", {give: true});
      const bout = await sheetRoll(pa, "label.vrollable[data-attribute='true'][data-key='charisma']");
      await C()?.derangements?.end?.(game.actors.get(pa.id));
      G.ok("7. a merit and a derangement through a real sheet roll", merit.card && merit.mods?.diff === -1 && merit.line && plain.card && !plain.mods?.diff
        && bout.card && bout.mods?.diff === 2 && Number.isFinite(Number(bout.mods?.difficulty)), {merit, plain, bout});
    });

    await G.step("8. Light-touch mode holds what acts by itself, and it settles once when turned off", async () => {
      const L = "rule.lightTouch";
      await set(C_ID, "hold", false);
      await set(C_ID, L, false);
      // a bout already past its hour, a timed effect ended on the clock, a crime that reaches Wanted
      const [d, t, c] = await G.make(Actor, [{name: "Gate TruthC Quiet Deranged", type: "Mortal"}, {name: "Gate TruthC Quiet Timed", type: "Mortal"},
        {name: "Gate TruthC Quiet Culprit", type: "Mortal", prototypeToken: {actorLink: true}}]);
      await G.tokens(scene, [{actor: d, x: 14, y: 2}, {actor: t, x: 15, y: 2}, {actor: c, x: 16, y: 2}]);
      await set(C_ID, L, true);
      await waitFor(() => game.settings.get(C_ID, "quietHeld")?.since !== null && game.settings.get(C_ID, "quietHeld")?.since !== undefined, 5000);
      await d.update({"system.derangement": "Paranoia"});
      await C()?.derangements?.hold?.(d, "paranoia", {give: true});
      await d.setFlag(C_ID, "bout", {...(d.getFlag(C_ID, "bout") ?? {}), at: game.time.worldTime - 7200});
      const T = C()?.timed;
      try { await T?.applyTimed?.(t, {name: "Gate TruthC dazzled", condition: "blinded", duration: {kind: "time", seconds: 30}, source: "gate"}); }
      catch (e) { G.R.notes.push(`timed: ${e?.message ?? e}`); }
      const timedOn = () => !!game.actors.get(t.id)?.statuses?.has?.("wodx-blinded");
      // B6432: on before the clock moves, so "held" below means kept, not never there
      const timedBefore = await waitFor(timedOn, 5000);
      const heatBefore = game.settings.get(C_ID, "quietHeld")?.law?.length ?? 0;
      const since = Date.now();
      for ( let i = 0; i < 6; i++ ) await C()?.law?.heat?.add?.(c, "killing", {scene, named: true, witnesses: 3});
      const stageCards = () => game.messages.filter(m => (m.timestamp ?? 0) >= since && m.flags?.[C_ID]?.lawHeat?.actor === c.id).length;
      await game.time.advance(120);
      await new Promise(r => setTimeout(r, 2000));
      const held = {bout: !!game.actors.get(d.id)?.getFlag(C_ID, "bout") && game.actors.get(d.id)?.statuses?.has?.("wodx-deranged"),
        timed: timedOn(), cards: stageCards(), queued: (game.settings.get(C_ID, "quietHeld")?.law?.length ?? 0) - heatBefore};
      // what is left of the effect after the clock move, when the status is gone (deleted, or switched off)
      const effect = (() => { const e = game.actors.get(t.id)?.effects?.find?.(x => x.name === "Gate TruthC dazzled"); return e ? {disabled: e.disabled, active: e.active, duration: e.toObject?.().duration ?? null} : null; })();
      await set(C_ID, L, false);
      const boutOver = await waitFor(() => !game.actors.get(d.id)?.statuses?.has?.("wodx-deranged"), 10000);
      const timedOver = await waitFor(() => !timedOn(), 10000);
      const card = await waitFor(() => stageCards() > 0, 10000);
      const cleared = (game.settings.get(C_ID, "quietHeld")?.law ?? []).length === 0;
      await set(C_ID, "hold", true);
      G.ok("8. Light-touch mode holds what acts by itself, and it settles once when turned off",
        timedBefore && held.bout && held.timed && held.cards === 0 && held.queued >= 1 && boutOver && timedOver && card && cleared,
        {timedBefore, held, effect, boutOver, timedOver, card, cleared});
    });

    await G.step("9. an era profile: new sheets get its abilities, and existing sheets follow", async () => {
      const E = C()?.eras, was = {era: game.settings.get(C_ID, "activeEra"), lock: game.settings.get(C_ID, "eraLock")};
      // only this gate's sheets follow; the world's own stay where they are
      const keepOut = Hooks.on("wodxSheetFollowsEra", actor => (String(actor?.name ?? "").startsWith("Gate TruthC") ? true : false));
      await set(C_ID, "hold", false);
      try {
      await set(C_ID, "eraLock", "dark-ages");
      await waitFor(() => game.settings.get(C_ID, "activeEra") === "dark-ages", 8000);
      const [m] = await G.make(Actor, [{name: "Gate TruthC Era Mortal", type: "Mortal"}]);
      await waitFor(() => game.actors.get(m.id)?.system?.settings?.iscreated, 5000);
      await m.update({"system.abilities.melee.value": 3});
      const darkFirearms = !!game.actors.get(m.id)?.system?.abilities?.firearms?.isvisible;
      // the Storyteller locks the era at the Renaissance (the clock's own lock): the profile adds Firearms
      await set(C_ID, "eraLock", "renaissance");
      await waitFor(() => game.settings.get(C_ID, "activeEra") === "renaissance", 8000);
      const followed = await waitFor(() => !!game.actors.get(m.id)?.system?.abilities?.firearms?.isvisible, 8000);
      const [n] = await G.make(Actor, [{name: "Gate TruthC Era Newcomer", type: "Mortal"}]);
      const newcomer = await waitFor(() => game.actors.get(n.id)?.system?.settings?.iscreated && !!game.actors.get(n.id)?.system?.abilities?.firearms?.isvisible, 8000);
      // and on to the modern era: the sheet's era moves, Computer shows, Melee 3 stays
      await set(C_ID, "eraLock", "modern");
      await waitFor(() => game.settings.get(C_ID, "activeEra") === "modern", 8000);
      const modern = await waitFor(() => game.actors.get(m.id)?.system?.settings?.era === CONFIG.worldofdarkness?.era?.modern, 8000);
      const a = game.actors.get(m.id)?.system?.abilities ?? {};
      G.ok("9. an era profile: new sheets get its abilities, and existing sheets follow", !darkFirearms && followed && newcomer && modern
        && !!a.computer?.isvisible && Number(a.melee?.value) === 3 && !!a.melee?.isvisible,
        {darkFirearms, followed, newcomer, modern, era: game.actors.get(m.id)?.system?.settings?.era, computer: a.computer?.isvisible, melee: a.melee, block: CONFIG.worldofdarkness?.wodxEraAbilities ?? null, profiles: !!E});
      } finally {
        // back to the era the world had, by the same lock, with the world's sheets still kept out
        await set(C_ID, "eraLock", was.lock || was.era || "");
        await waitFor(() => game.settings.get(C_ID, "activeEra") === (was.lock || was.era), 8000);
        await set(C_ID, "eraLock", was.lock ?? "");
        await new Promise(r => setTimeout(r, 1000));
        Hooks.off("wodxSheetFollowsEra", keepOut);
        await set(C_ID, "hold", true);
      }
    });

    await G.step("10. Chronicle's data version 2: backup written, the old bout named, the version raised", async () => {
      const [o] = await G.make(Actor, [{name: "Gate TruthC Old Bout", type: "Mortal"}]);
      await G.tokens(scene, [{actor: o, x: 18, y: 2}]);
      await o.setFlag(C_ID, "bout", {keys: ["paranoia"], at: game.time.worldTime});
      await o.update({[`flags.${C_ID}.bout.-=sceneId`]: null});
      await set(C_ID, "dataVersions", {...(game.settings.get(C_ID, "dataVersions") ?? {}), [C_ID]: 1});
      const r = await C()?.migrations?.run?.({quiet: true});
      const job = r?.done?.find?.(j => j.module === C_ID);
      let backup = false;
      if ( job?.backup ) { try { backup = (await fetch(`/${job.backup}`, {cache: "no-store"})).ok; } catch (e) { backup = false; } }
      const version = game.settings.get(C_ID, "dataVersions")?.[C_ID];
      const named = game.actors.get(o.id)?.getFlag(C_ID, "bout")?.sceneId;
      G.ok("10. Chronicle's data version 2: backup written, the old bout named, the version raised", !!job && backup && version === 2 && named === scene.id,
        {job: job ? {from: job.from, to: job.to, backup: job.backup} : null, backup, version, named, scene: scene.id, failed: r?.failed ?? null});
    });

    await G.step("11. dawn on the clock is the sun's rising for WoDX Actions, to the second", async () => {
      const cal = await import(`/modules/wodx-chronicle/scripts/calendar.mjs?${Date.now()}`);
      const lat = game.settings.get(C_ID, "latitude");
      // the clock's own To dawn (the Chronicle Clock's button moves the clock this far), held so nothing else reacts
      await set(C_ID, "hold", true);
      await game.time.advance(cal.secondsToNextDawn(game.time.worldTime, lat));
      const dawn = game.time.worldTime, dusk = dawn + cal.secondsToNextDusk(dawn, lat);
      const rows = [];
      for ( const t of [dawn - 1, dawn, dusk - 1, dusk] ) {
        const clockNight = cal.describeTime(t, lat).isNight, sun = await A()?.sunNow?.(t);
        rows.push({t, clockNight, phase: sun?.phase ?? null, altitude: Math.round((sun?.altitude ?? NaN) * 1000) / 1000});
      }
      const agree = rows.every(r => r.phase !== null && (r.phase === "night") === r.clockNight);
      G.ok("11. dawn on the clock is the sun's rising for WoDX Actions, to the second", agree && rows[0].clockNight && !rows[1].clockNight && !rows[2].clockNight && rows[3].clockNight, {rows});
    });

    await G.step("12. a phobia bout: on their turn in a fight, Courage fails and the action is lost", async () => {
      const uniform0 = CONFIG.Dice.randomUniform;
      // B6225/gateknockdown: Foundry maps u to ceil((1-u)*faces); find the u that gives this face
      const dice = async face => {
        for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
          CONFIG.Dice.randomUniform = () => u;
          if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return true;
        }
        return false;
      };
      try {
        const [ph, foe] = await G.make(Actor, [{name: "Gate TruthC Phobic", type: "Mortal", prototypeToken: {actorLink: true}}, {name: "Gate TruthC Phobic Foe", type: "Mortal", prototypeToken: {actorLink: true}}]);
        const [tp, tf] = await G.tokens(scene, [{actor: ph, x: 6, y: 10}, {actor: foe, x: 7, y: 10}]);
        await ph.update({"system.derangement": "Phobia (fire)"});
        await C()?.derangements?.hold?.(ph, "phobia", {give: true});
        const combat = await G.make(Combat, {scene: scene.id, active: true});
        await combat.createEmbeddedDocuments("Combatant", [tp, tf].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
        // B6433: the dice are set before the fight starts, since the start is already a turn: with no initiative the
        // phobic sorts first, and that first turn's Courage roll (read once a turn) is the one checked
        const fixed = await dice(3);
        const t0 = Date.now();
        await combat.startCombat();
        await waitFor(() => combat.started, 4000);
        const idx = () => combat.turns.findIndex(c => c.actorId === ph.id);
        if ( combat.turn !== idx() ) await combat.update({turn: idx()});
        const courageCard = () => game.messages.contents.some(m => m.timestamp >= t0 && m.speaker?.actor === ph.id && /Courage, \d+ dice at 7/.test(m.content ?? ""));
        // the card is the last thing the turn's reading writes
        const lostNow = () => game.actors.get(ph.id)?.getFlag("wodx-combat", "lostAction")?.combat === combat.id;
        await waitFor(() => lostNow() && courageCard(), 8000);
        const lost = lostNow();
        const flag = game.actors.get(ph.id)?.getFlag("wodx-combat", "lostAction") ?? null;
        const card = courageCard();
        CONFIG.Dice.randomUniform = uniform0;
        const CB = game.wodxCombat ?? game.modules.get("wodx-combat")?.api;
        G.ok("12. a phobia bout: on their turn in a fight, Courage fails and the action is lost", fixed && lost && Number(flag?.round) === Number(combat.round) && card,
          {fixed, lost, flag, round: combat.round, card, combatApi: !!CB, heldTurn: game.actors.get(ph.id)?.getFlag(C_ID, "bout")?.heldTurn ?? null});
      } finally { CONFIG.Dice.randomUniform = uniform0; }
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    // the clock goes back while the world is held, then the settings and the cards
    try { await set(C_ID, "hold", true); await G.cleanup(); } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
    for ( const [m, k] of KEEP ) { try { if ( `${m}.${k}` in keep ) await game.settings.set(m, k, keep[`${m}.${k}`]); } catch (e) { /* put back */ } }
    try { const msgs = game.messages.filter(m => (m.timestamp ?? 0) >= t0); if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id)); } catch (e) { G.R.notes.push(`cards: ${e?.message ?? e}`); }
    try { const AP = C()?.approvals; for ( const p of AP?.pending?.() ?? [] ) if ( String(p.title ?? "").includes("Gate TruthC") ) await AP.decide(p.id, "reject"); } catch (e) { /* none left */ }
    try { foundry.applications.instances?.get?.("wodx-pod")?.close?.(); } catch (e) { /* closed */ }
    return G.save();
  }
}
