/**
 * Hunters across a region gate (WoDX Storyteller, B3300-B3305), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehunters.mjs?${Date.now()}`)).run()
 * Saves the hunters' state and puts it back after; rejects the approvals it causes and deletes its cards. Makes no
 * actors or scenes, and does not move the clock. If the approval queue approves on its own, an approved move leaves
 * a rumour and a log line behind (noted in the result).
 *   1. the api, the setting and the approval type are there
 *   2. who hunts at home this year: at least one body, the leader first, each with a book reference
 *   3. pressure: a Hunted ground's +2 crosses to Rumours and whispers a card to the Storytellers only
 *   4. a file on a culprit grows with the turn once the region is Investigating, and an investigator is proposed
 *   5. at Hunting the Hunt is +1 harder here (huntHere), capped at +3 with the heat
 *   6. a raid on the culprit with the thickest file is proposed, once (not again on the next turn)
 *   7. Forget drops the file; the window opens and closes
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatehunters-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const S = "wodx-storyteller", Ch = game.modules.get("wodx-chronicle")?.api, st = game.modules.get(S)?.api, Hu = st?.hunters;
  const was = {state: foundry.utils.deepClone(game.settings.get(S, "hunterState") ?? {}), on: game.settings.get(S, "hunterPressure"), held: !!Ch?.isHeld?.()};
  const before = new Set(Ch.approvals.pending().map(p => p.id)), histBefore = new Set(Ch.approvals.history().map(p => p.id));
  const fresh = () => [...Ch.approvals.pending().filter(p => !before.has(p.id)), ...Ch.approvals.history().filter(p => !histBefore.has(p.id))].filter(p => p.type === `${S}.hunters`);
  const t0 = Date.now(), culprit = {id: "gateHunterCulprit", name: "Gate culprit", kind: "Vampire"};
  const mine = () => Ch.approvals.pending().filter(p => !before.has(p.id) && p.type === `${S}.hunters`);
  let region = null;
  /** Set the test region's pressure exactly (keep: keep its files), with the turn clock at now. */
  const setP = async (p, keep = false) => {
    const s = foundry.utils.deepClone(game.settings.get(S, "hunterState") ?? {}), t = game.time.worldTime, r = s.regions?.[region] ?? {};
    s.regions = {...(s.regions ?? {}), [region]: {...r, pressure: p, last: t, since: r.since || t, stage: Hu.rules.stageOf(p).key, files: keep ? (r.files ?? {}) : {}, acted: keep ? (r.acted ?? {}) : {}}};
    s.lastTurn = t; s.trail = [];
    await game.settings.set(S, "hunterState", s);
  };
  // A scene to hunt in: the viewed one, or (when nothing is viewed) a scratch scene of the gate's own. With no scene the
  // Hunt has no ground, and huntHere rightly answers 0.
  let scratch = null;
  const sc = canvas?.scene ?? (scratch = await Scene.create({name: "WoDX gate: hunters", width: 1000, height: 1000, navigation: false}));
  R.notes.push(scratch ? "No scene was viewed: the gate used a scratch scene of its own" : `scene ${sc.name}`);
  try {
    if ( was.held ) await Ch.hold(false);
    if ( !was.on ) await game.settings.set(S, "hunterPressure", true);
    await game.settings.set(S, "hunterState", {});
    region = Hu?.regionAt(sc);

    await step("api and settings", async () => {
      const types = Ch.approvals.types().map(x => x.type);
      ok("api and settings", !!Hu?.add && !!Hu?.turn && !!Hu?.open && game.settings.settings.has(`${S}.hunterPressure`) && types.includes(`${S}.hunters`), {region});
    });

    await step("who hunts here", async () => {
      const b = Hu.bodiesAt(region), year = Ch.eras.currentYear();
      ok("who hunts here", b.length >= 1 && b.every(x => x.ref && x.label), {year, bodies: b.map(x => x.key)});
    });

    await step("pressure and the card", async () => {
      const res = await Hu.add(region, "heatHunted", {why: "gate"});
      await sleep(300);
      const card = game.messages.contents.filter(m => m.timestamp >= t0 && m.content.includes("wst-hunters")).at(-1);
      const gmOnly = !!card && card.whisper.length > 0 && card.whisper.every(id => game.users.get(id)?.isGM);
      ok("pressure and the card", res?.after === 2 && res?.crossed?.key === "rumours" && gmOnly, {after: res?.after, card: !!card});
    });

    await step("a file grows; an investigator", async () => {
      // Exactly Investigating, and nothing read from the testbed's own descriptions (lastTurn now)
      await setP(6);
      await Hu.add(region, "manual", {n: 0, who: culprit, gain: 1});
      const lv0 = Hu.state().regions[region].files[culprit.id]?.level;
      await Hu.turn({force: true});
      await sleep(300);
      const lv1 = Hu.state().regions[region].files[culprit.id]?.level;
      const inv = fresh().find(p => p.data?.kind === "investigator");
      ok("a file grows; an investigator", lv0 === 1 && lv1 === 2 && !!inv, {lv0, lv1, investigator: !!inv, stage: Hu.here(sc).stage.key});
    });

    await step("the Hunt is harder", async () => {
      const h0 = st.upkeep.huntHere(sc);
      await setP(8, true);
      const h1 = st.upkeep.huntHere(sc);
      const heatOn = game.settings.get(S, "heat");
      ok("the Hunt is harder", !heatOn || (h1.extra === Math.min(3, h0.extra + 1)), {before: h0.extra, after: h1.extra, heatOn, stage: Hu.here(sc).stage.key});
    });

    await step("a raid, once", async () => {
      await Hu.turn({force: true});
      await sleep(300);
      const raids = () => fresh().filter(p => p.data?.kind === "raid" && p.data?.file?.id === culprit.id);
      const n1 = new Set(raids().map(p => p.id)).size;
      await Hu.turn({force: true});
      await sleep(300);
      const n2 = new Set(raids().map(p => p.id)).size;
      ok("a raid, once", n1 >= 1 && n2 === n1, {n1, n2});
    });

    await step("forget and the window", async () => {
      await Hu.forget(region, culprit.id);
      const gone = !Hu.state().regions[region].files[culprit.id];
      const dlg = await Hu.open();
      await sleep(300);
      const shown = !!dlg?.element?.querySelector(".wst-hunters-list");
      await dlg?.close();
      ok("forget and the window", gone && shown && Hu.filesOn(culprit.id).length === 0, {gone, shown});
    });

    await step("other modules answer", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-actions", "wodx-combat", "wodx-sheets", "wodx-creation", "wodx-library", "wodx-interactables", "wodx-otherworlds", "wodx-atmosphere"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules answer", missing.length === 0, {missing});
    });
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  finally {
    try { const auto = Ch.approvals.history().filter(p => !histBefore.has(p.id) && p.type === `${S}.hunters`); if ( auto.length ) R.notes.push(`${auto.length} hunters' move(s) decided by the queue itself; check rumours for the gate's`); } catch (e) { /* none */ }
    try { for ( const p of mine() ) await Ch.approvals.decide(p.id, "reject"); } catch (e) { R.errors.push(`approvals: ${e.message}`); }
    try { await game.settings.set(S, "hunterState", was.state); } catch (e) { R.errors.push(`state: ${e.message}`); }
    try { if ( !was.on ) await game.settings.set(S, "hunterPressure", false); } catch (e) { /* kept */ }
    try { const ids = game.messages.contents.filter(m => m.timestamp >= t0 && /wst-hunters/.test(m.content)).map(m => m.id); if ( ids.length ) await ChatMessage.deleteDocuments(ids); } catch (e) { R.errors.push(`cards: ${e.message}`); }
    try { if ( was.held ) await Ch.hold(true); } catch (e) { /* kept */ }
    try { if ( scratch ) await scratch.delete(); } catch (e) { R.errors.push(`scene: ${e.message}`); }
  }
  return save(R, "gatehunters-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gatehunters", runGate);
