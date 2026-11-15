/**
 * Storyteller truth gate (done-claims audit fixes, B6165-B6169), in rothenstein-wodx (the testing world), as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatetruthstoryteller.mjs?${Date.now()}`)).run()
 * Each step drives the real trigger (a token walked into a region, the world clock moving, the law coming, a verdict,
 * a quick roll) and reads the effect itself (a token's scene, x/y or hidden, a scene's darkness and weather, the
 * primer's page, a roll's dice).
 *   1. Ways by walking: a token moved into a "WoDX: Way to" region lands on the other scene near the far end, with the
 *      companion beside it, and the walker's own clock moves by the door's minute
 *   2. the primer's "Where you are now" follows the company walking into a scene abroad, without the Storyteller
 *      activating it (B6166)
 *   3. a character the Storyteller convened walks a house door: the token goes through, and the call goes with it
 *      (the convened record now names the scene it reached) (B6166)
 *   4. light from the clock: a scene ticked "Follow the clock" changes darkness by at least 0.3 when 12 hours pass
 *   5. an outdoor street scene nobody ticked by hand also follows the clock (B6168)
 *   6. weather on the active outdoor scene: after the clock moves, the scene's weather is the night's effect
 *   7. the night's draw at dusk: with the setting on, the clock reaching night puts the night in the approval queue
 *   8. taken by the watch (lawCome, the warrant path): the culprit's token is hidden, not deleted; sentenced to prison,
 *      it is back on the map, shown, once the clock passes the term and a time skip ends with the world not held (B6165)
 *   9. taken by the watch, then found not guilty: the token is shown again where it stood (B6165)
 *  10. tired from no sleep (the needs flag hardship writes): a quick Persuade check rolls two dice fewer (B6169)
 * The world is held while the clock runs years for the law (nothing else reacts). It makes its own scenes, actors and
 * (when the testbed has none) a player, keeps and puts back every setting it touches, rejects the queue entries it
 * caused, deletes its cards, and the kit rewinds the clock. Result: Data/wodx-gate/gatetruthstoryteller-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const ST = "wodx-storyteller", CH = "wodx-chronicle", AT = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const YEAR = 366 * 86400;

export async function run() {
  const G = gate("gatetruthstoryteller", {stepTimeout: 60000});
  if ( G.notLive() ) return "Not on the Live world.";
  for ( let i = 0; i < 120 && !(game.modules.get(ST)?.api?.ways && game.modules.get(CH)?.api?.approvals); i++ ) await sleep(250);
  const S = game.modules.get(ST)?.api, C = game.modules.get(CH)?.api, A = game.modules.get(AT)?.api;
  const has = (m, k) => game.settings.settings.has(`${m}.${k}`);
  const KEEP = [[ST, "personal"], [ST, "log"], [ST, "convened"], [ST, "waysConfirm"], [ST, "nightDraw"], [ST, "nightDrawn"], [ST, "reachOn"],
    [ST, "hardship"], [CH, "autoApprove"], [CH, "hold"], [CH, "lawHeatOn"], [CH, "lawHeat"], [AT, "lightFromClock"], [AT, "sceneEffects"],
    ["wodx-actions", "traitRolls"]].filter(([m, k]) => has(m, k));
  const keep = KEEP.map(([m, k]) => [m, k, foundry.utils.deepClone(game.settings.get(m, k))]);
  const pending0 = new Set((C?.approvals?.pending?.() ?? []).map(p => p.id));
  const history0 = new Set((C?.approvals?.history?.() ?? []).map(p => p.id));
  const msgs0 = new Set(game.messages.map(m => m.id));
  const set = async (m, k, v) => { if ( has(m, k) ) await game.settings.set(m, k, v); };
  let primer = null, primerMade = false, abroadWas = null, madeUser = null;
  try {
    await set(ST, "waysConfirm", false);
    if ( has(CH, "autoApprove") ) await game.settings.set(CH, "autoApprove", {...(game.settings.get(CH, "autoApprove") ?? {}), [`${ST}.night`]: false, [`${ST}.travel`]: false});
    // the company is the players' characters: a player owns the walker (B6166 reads where player characters stand)
    let player = game.users.find(u => !u.isGM) ?? null;
    if ( !player ) player = madeUser = await User.create({name: "WoDX gate: truth player", role: CONST.USER_ROLES.PLAYER});
    const own = {default: 0, [player.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};

    /* ---- the Ways: scenes A (street, viewed) and B (an inn abroad, in Japan) ---- */
    const a = await G.scene({name: "WoDX gate: truthst street", width: 1400, height: 1000});
    const [b] = await G.make(Scene, [{name: "WoDX gate: truthst inn abroad", width: 1400, height: 1000, padding: 0, grid: {size: 100, type: 1},
      navigation: false, flags: {[CH]: {place: {region: "japan"}}}}]);
    const way = await S.ways.make(a, b, {kind: "door", side: "east"});
    const [w, c] = await G.make(Actor, [{name: "WoDX gate: truthst walker", type: "Mortal", ownership: own, prototypeToken: {actorLink: true}},
      {name: "WoDX gate: truthst companion", type: "Mortal", ownership: own, prototypeToken: {actorLink: true}}]);
    const [tw] = await G.tokens(a, [{actor: w, x: 9, y: 4}]);
    await G.tokens(a, [{actor: c, x: 10, y: 5}]);
    const onA = id => a.tokens.some(t => t.actorId === id), onB = id => b.tokens.some(t => t.actorId === id);
    const end = way.to.shapes[0];

    // primer: the players' journal, kept as it was
    primer = [...game.journal].find(d => d.flags?.[ST]?.template?.kind === "primer") ?? null;
    if ( !primer ) {
      [primer] = await G.make(JournalEntry, [{name: "The world in this era", flags: {[ST]: {template: {kind: "primer", version: 1}}}}]);
      primerMade = true;
    }
    abroadWas = primer.pages.find(p => p.name === "Where you are now")?.text?.content ?? null;
    if ( S.setup?.refreshAbroad ) await S.setup.refreshAbroad({card: false, scene: a});
    const abroadPage = () => primer.pages.find(p => p.name === "Where you are now")?.text?.content ?? "";
    const pageAtHome = abroadPage();

    await G.step("1. Ways by walking", async () => {
      const p0 = S.personalTime?.(w.id);
      const r = way.from.shapes[0];
      // the real path: the token moves into the region; Foundry fires tokenEnter; the behaviour walks the company
      await tw.update({x: r.x, y: r.y});
      const went = await waitFor(() => onB(w.id) && onB(c.id), 10000);
      const tok = b.tokens.find(t => t.actorId === w.id);
      const cx = (end.x + end.width / 2), cy = (end.y + end.height / 2);
      const near = !!tok && Math.abs(tok.x + 50 - cx) <= 150 && Math.abs(tok.y + 50 - cy) <= 150;
      const p1 = S.personalTime?.(w.id);
      const minutes = Number.isFinite(p0) && Number.isFinite(p1) ? Math.round((p1 - p0) / 60) : null;
      G.ok("1. Ways by walking", went && near && !onA(w.id) && (minutes === null || minutes >= 1), {went, near, at: tok ? {x: tok.x, y: tok.y} : null, end: {x: cx, y: cy}, minutes});
    });

    await G.step("2. the primer abroad follows the company", async () => {
      // B is in Japan; the Storyteller did not activate it. The page should now say where they are.
      const moved = await waitFor(() => abroadPage() !== pageAtHome && /Japan/.test(abroadPage()), 6000);
      G.ok("2. the primer abroad follows the company", moved, {active: game.scenes.active?.name ?? null, page: abroadPage().slice(0, 160)});
    });

    await G.step("3. a convened character walks a house door", async () => {
      // convene the walker on B, then walk its token out of B's end of the Way and back into it, on the viewed scene
      await S.convene({actorIds: [w.id], sceneId: b.id, reason: "WoDX gate: a scene"});
      await b.view();
      await waitFor(() => canvas?.ready && canvas.scene?.id === b.id, 20000);
      await sleep(5500); // the Way lets a token that just arrived settle for five seconds
      const tb = () => b.tokens.find(t => t.actorId === w.id);
      // out of the end, toward the middle of the map (never off it: the end is on the scene's edge), then into its middle
      const r = way.to.shapes[0], g = b.grid?.size ?? 100;
      const rx = r.x + r.width / 2, ry = r.y + r.height / 2, side = rx < b.width / 2 ? 1 : -1;
      await tb()?.update({x: Math.round(rx - g / 2 + side * 400), y: Math.round(ry - g / 2)});
      await sleep(1500);
      const away = !!tb() && !(Math.abs(tb().x + g / 2 - rx) < r.width / 2 && Math.abs(tb().y + g / 2 - ry) < r.height / 2);
      await tb()?.update({x: Math.round(rx - g / 2), y: Math.round(ry - g / 2)});
      const back = await waitFor(() => onA(w.id), 10000);
      const rec = (game.settings.get(ST, "convened") ?? {})[w.id] ?? null;
      G.ok("3. a convened character walks a house door", back && rec?.scene === a.id, {back, away, convened: rec});
      await S.release([w.id]);
    });

    /* ---- the clock: light, weather and the night's draw ---- */
    const weatherOn = has(AT, "weather") ? game.settings.get(AT, "weather") !== "off" : false;
    await set(AT, "lightFromClock", true);
    await set(AT, "sceneEffects", true);
    await set(ST, "nightDraw", true);
    await set(ST, "nightDrawn", 0);
    const street = {[AT]: {outdoors: "on"}, "wodx-npc": {place: {kind: "street"}}};
    // U: an outdoor street like the builder's (never ticked), active; L: the same, ticked by hand, viewed
    const u = await G.scene({name: "WoDX gate: truthst unticked street", activate: true, flags: street});
    const l = await G.scene({name: "WoDX gate: truthst ticked street", flags: foundry.utils.mergeObject(foundry.utils.deepClone(street), {[AT]: {followClock: true, night: 0.9}})});
    const dark = s => Number(game.scenes.get(s.id)?.environment?.darknessLevel ?? 0);
    const samples = [];
    const sample = async () => {
      const n = await S.night?.now?.();
      samples.push({hours: n?.hours ?? null, jdn: n?.jdn ?? null, l: dark(l), u: dark(u), weather: game.scenes.get(u.id)?.weather ?? "",
        want: (() => { const d = A?.weather?.now?.(u); return d && CONFIG.weatherEffects?.[d.effect] ? d.effect : ""; })()});
    };
    await game.time.advance(60);
    await sleep(2500);
    await sample();
    await game.time.advance(12 * 3600);
    await sleep(3500);
    await sample();
    const [s0, s1] = samples;

    await G.step("4. light from the clock (ticked scene)", async () => {
      G.ok("4. light from the clock (ticked scene)", weatherOn && Math.abs(s1.l - s0.l) >= 0.3, {weatherOn, samples});
    });
    await G.step("5. an unticked outdoor street follows the clock", async () => {
      G.ok("5. an unticked outdoor street follows the clock", Math.abs(s1.u - s0.u) >= 0.3, {samples});
    });
    await G.step("6. weather on the active outdoor scene", async () => {
      G.ok("6. weather on the active outdoor scene", weatherOn && s1.weather === s1.want, {have: s1.weather, want: s1.want});
    });
    await G.step("7. the night's draw at dusk", async () => {
      const night = samples.find(x => x.hours !== null && (x.hours < 7 || x.hours >= 17));
      const key = night ? `night:${night.jdn}:0` : null;
      const fresh = [...(C.approvals.pending?.() ?? []).filter(p => !pending0.has(p.id)), ...(C.approvals.history?.() ?? []).filter(p => !history0.has(p.id))];
      const hit = fresh.find(p => p.type === `${ST}.night` && (!key || p.key === key));
      G.ok("7. the night's draw at dusk", !!night && !!hit, {key, types: fresh.map(p => `${p.type}:${p.key ?? ""}`).slice(0, 8)});
    });

    /* ---- the law: the watch takes a culprit; the court decides ---- */
    await set(CH, "hold", true);
    await set(CH, "lawHeatOn", true);
    await set(ST, "reachOn", true);
    const law = await G.scene({name: "WoDX gate: truthst square", activate: true});
    const kindOf = p => C?.law?.sentence?.rules?.MARKS?.[p]?.kind;
    const timeRegion = deeds => {
      const year = C?.eras?.currentYear?.() ?? 1197, P = C?.law?.sentence?.rules;
      const ids = ["moravia", ...Object.keys(C?.world?.regions ?? {})];
      return ids.find(r => { try { return P.sentencesFor(C.law.of(r, year), deeds).list.some(p => kindOf(p) === "time"); } catch (e) { return false; } }) ?? "moravia";
    };
    /** Fire a guilty verdict (law-trial's hook), find the sentence card, render it and press the button for `pick`. */
    async function sentenceByButton(actor, deeds, pick, region) {
      const since = Date.now(), year = C?.eras?.currentYear?.() ?? 1197;
      Hooks.callAll("wodxVerdict", {actor: actor.id, name: actor.name, region, guilty: true, deeds, form: "judge", year});
      await waitFor(() => newestMessage(since, m => m.flags?.[CH]?.lawSentence?.actorId === actor.id), 8000);
      const card = newestMessage(since, m => m.flags?.[CH]?.lawSentence?.actorId === actor.id);
      if ( !card ) return {error: "no sentence card"};
      const el = await card.renderHTML();
      const buttons = [...el.querySelectorAll("[data-action='wodx-law-sentence']")];
      const btn = buttons.find(x => pick(x.dataset.punish));
      if ( !btn ) return {error: "no fitting button", offered: buttons.map(x => x.dataset.punish)};
      const before = (actor.getFlag(CH, "lawMarks") ?? []).length;
      btn.click();
      await waitFor(() => (game.actors.get(actor.id)?.getFlag(CH, "lawMarks") ?? []).length > before, 8000);
      return {mark: (game.actors.get(actor.id)?.getFlag(CH, "lawMarks") ?? []).at(-1) ?? null, punish: btn.dataset.punish, year, region};
    }

    await G.step("8. taken by the watch, then served: back on the map", async () => {
      const [cu] = await G.make(Actor, [{name: "WoDX gate: truthst culprit", type: "Mortal", prototypeToken: {actorLink: true}}]);
      const [tc] = await G.tokens(law, [{actor: cu, x: 12, y: 4}]);
      const tok = () => law.tokens.get(tc.id);
      await S.reach?.lawCome?.({actorId: cu.id, region: "moravia", mode: "arrest", why: "WoDX gate"});
      const taken = await waitFor(() => tok()?.hidden === true, 8000);
      const deeds = [{deed: "killing"}];
      const s = await sentenceByButton(cu, deeds, p => kindOf(p) === "time", timeRegion(deeds));
      // the years pass while the world is held, and a held world lets nobody out (B6162); the hold off, a short time
      // skip's end does, as at the table (the same path gatetruthchronicle step 2 takes)
      if ( s.mark?.until ) await game.time.advance(Math.max(1, s.mark.until - s.year) * YEAR);
      const servedHeld = tok()?.hidden === true;
      let back = false;
      try {
        await set(CH, "hold", false);
        await C.timeSkip(game.time.worldTime + 60, {label: "gate", eraHandled: true});
        back = await waitFor(() => tok()?.hidden === false && !game.actors.get(cu.id)?.getFlag(CH, "lawAway"), 30000);
      } finally { await set(CH, "hold", true); }
      G.ok("8. taken by the watch, then served: back on the map", taken && s.mark?.kind === "time" && servedHeld && back,
        {taken, kept: !!tok(), until: s.mark?.until, servedHeld, back, away: game.actors.get(cu.id)?.getFlag(CH, "lawAway") ?? null, error: s.error, offered: s.offered});
    });

    await G.step("9. taken by the watch, then not guilty", async () => {
      const [cu] = await G.make(Actor, [{name: "WoDX gate: truthst accused", type: "Mortal", prototypeToken: {actorLink: true}}]);
      const [tc] = await G.tokens(law, [{actor: cu, x: 14, y: 6}]);
      const tok = () => law.tokens.get(tc.id);
      await S.reach?.lawCome?.({actorId: cu.id, region: "moravia", mode: "arrest", why: "WoDX gate"});
      const taken = await waitFor(() => tok()?.hidden === true, 8000);
      Hooks.callAll("wodxVerdict", {actor: cu.id, name: cu.name, region: "moravia", guilty: false, deeds: [{deed: "theft"}], form: "judge", year: C?.eras?.currentYear?.() ?? 1197});
      const back = await waitFor(() => tok()?.hidden === false && !tok()?.flags?.[ST]?.lawTaken, 8000);
      G.ok("9. taken by the watch, then not guilty", taken && back, {taken, back, at: tok() ? {x: tok().x, y: tok().y} : null});
    });
    await set(CH, "hold", false);

    /* ---- hardship: tiredness on a real roll ---- */
    await G.step("10. tired: two dice off a quick check", async () => {
      await set(ST, "hardship", true);
      await set("wodx-actions", "traitRolls", true);
      const [p] = await G.make(Actor, [{name: "WoDX gate: truthst sleepless", type: "Mortal"}]);
      // the sheet reads total before value: set both, as the sheet would after its recompute
      await p.update({"system.attributes.manipulation.value": 4, "system.attributes.manipulation.total": 4});
      const dice = async () => {
        const since = Date.now();
        for ( const t of [...(game.user.targets ?? [])] ) { try { t.setTarget(false, {releaseOthers: false}); } catch (e) { /* none */ } }
        await game.modules.get("wodx-actions")?.api?.quickCheck?.({actor: p, check: "persuade", direct: true});
        const test = m => m.content?.includes(p.name) && /\d+ dice, diff \d+/.test(m.content ?? "");
        await waitFor(() => newestMessage(since, test), 8000);
        const m = newestMessage(since, test);
        return m ? {dice: Number(/(\d+) dice, diff/.exec(m.content)?.[1]), parts: /<div class="vta-parts">([^<]*)</.exec(m.content)?.[1] ?? ""} : {dice: null};
      };
      const rested = await dice();
      // as hardship's sleep check writes it after two failed Stamina rolls
      await p.update({[`flags.${ST}.needs`]: {...(S.hardship?.of?.(p) ?? {}), tired: 2}});
      const tired = await dice();
      G.ok("10. tired: two dice off a quick check", rested.dice >= 3 && tired.dice === rested.dice - 2 && /Tired/.test(tired.parts ?? ""), {rested, tired});
    });
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    // the clock goes back while the world is still held, then the settings, the queue and the cards
    try { if ( has(CH, "hold") ) await game.settings.set(CH, "hold", true); await G.cleanup(); } catch (e) { G.R.errors.push(`cleanup: ${e?.message ?? e}`); }
    try {
      for ( const p of (C?.approvals?.pending?.() ?? []).filter(x => !pending0.has(x.id)) ) await C.approvals.decide(p.id, "reject", "gatetruthstoryteller clean up");
    } catch (e) { G.R.notes.push(`queue: ${e?.message ?? e}`); }
    try {
      const mine = game.messages.filter(m => !msgs0.has(m.id)).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    } catch (e) { G.R.notes.push(`messages: ${e?.message ?? e}`); }
    try {
      if ( primer && !primerMade ) {
        const pg = primer.pages.find(p => p.name === "Where you are now");
        if ( pg && abroadWas === null ) await pg.delete();
        else if ( pg && pg.text?.content !== abroadWas ) await pg.update({"text.content": abroadWas});
      }
    } catch (e) { G.R.notes.push(`primer: ${e?.message ?? e}`); }
    try { if ( madeUser ) await madeUser.delete(); } catch (e) { G.R.notes.push(`player: ${e?.message ?? e}`); }
    for ( const [m, k, v] of keep ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); } }
    return G.save();
  }
}
