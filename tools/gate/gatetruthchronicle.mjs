/**
 * WoDX gate (done-claims audit fixes, WoDX Chronicle, B6160-B6164): what Chronicle says it does reaches play through
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
 * Not here: a player's looks.show() going to the Storyteller needs a second, player's client.
 * Result: Data/wodx-gate/gatetruthchronicle-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const C_ID = "wodx-chronicle";
const SIGS = ["sigVampire", "sigWerewolf", "sigMage", "sigChangeling", "sigWraith"];
const KEEP = [[C_ID, "hold"], [C_ID, "lawHeatOn"], [C_ID, "lawHeat"], ...SIGS.map(k => [C_ID, k]), [C_ID, "ghoulNeed"], [C_ID, "autoApprove"],
  [C_ID, "podCities"], ["wodx-storyteller", "reachOn"], ["wodx-actions", "traitRolls"]];

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
      const gone = !!s.mark && (await waitFor(() => tok()?.hidden === true, 5000));
      // a term that ends this year (a sentence passed years ago), so no years of clock are needed; held, the clock
      // moves a minute and nothing reacts
      const away = game.actors.get(pr.id)?.getFlag(C_ID, "lawAway");
      if ( away ) await pr.setFlag(C_ID, "lawAway", {...away, until: C()?.eras?.currentYear?.() ?? s.year});
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
      G.ok("2. prison: off the map; a hold frees no one; the skip's end does", s.mark?.kind === "time" && gone && heldStill && back,
        {region: s.region, offered: s.offered, punish: s.punish, until: s.mark?.until, gone, heldStill, back, ...(back ? {} : {after}), error: s.error});
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
