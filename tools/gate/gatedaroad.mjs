/**
 * Dark Ages depth desk item 3 (B7644-B7648): walking a Road as a faith with people in it. In rothenstein-wodx (or any
 * test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedaroad.mjs?${Date.now()}`)).run()
 *   1. a vampire on the Road of Kings at 6 resists a level 3 sin through the Sin window: a Moment of Truth opens
 *   2. a Mentor named through the Road window, at 9 dots: the next Road dot costs 12 less 3, halved to 4, and buying it
 *      spends the Moment of Truth (V20 Dark Ages pp. 111, 115)
 *   3. three Paragons excommunicate the Adherent through the Road window: the next Sin roll is at +2 and the aura
 *      penalty doubles (p. 112)
 *   4. a change of Road to the Road of the Beast through the Road window: steps shown, then the extended Willpower roll
 *      (the first roll from the window, the rest through the same function) until it ends; walked at one dot as an Apostate, or lost to the Beast at 0 (p. 112)
 * Makes its own actors and removes them; puts back the settings it touches. Result: Data/wodx-gate/gatedaroad-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const A = () => game.wodxActions ?? game.modules.get("wodx-actions")?.api;
const C = () => game.modules.get("wodx-creation")?.api;
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);

/** Open a window, fill its fields by name, press its OK button. fields: {name: value | true for a checkbox}. */
async function fill(open, re, fields) {
  open();
  let w = null;
  await waitFor(() => (w = titled(re)), 10000);
  const el = elOf(w);
  for ( const [k, v] of Object.entries(fields) ) {
    const f = el?.querySelector?.(`[name="${k}"]`);
    if ( !f ) continue;
    if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
    f.dispatchEvent(new Event("change", {bubbles: true}));
  }
  el?.querySelector?.('button[data-action="ok"]')?.click();
  return !!w;
}

export async function run() {
  const G = gate("gatedaroad");
  if ( G.notLive() ) return "gatedaroad never runs in the Live world";
  const keep = {};
  try {
    await waitFor(() => !!A()?.roadFaith && !!A()?.roads?.() && !!C()?.data?.purchaseOptions, 30000);
    keep.spend = game.settings.get("wodx-actions", "spendResources");
    if ( keep.spend !== true ) await game.settings.set("wodx-actions", "spendResources", true);
    const lord = await G.make(Actor, {name: "Gate DA Road Lord", type: "Vampire", system: {advantages: {
      path: {permanent: 6, value: 6, custom: "Road of Kings"}, willpower: {permanent: 10, temporary: 10},
      virtues: {conscience: {permanent: 5, temporary: 5}, selfcontrol: {permanent: 3, temporary: 3}, courage: {permanent: 2, temporary: 2}},
      bloodpool: {temporary: 10, max: 10}}}});
    // the sheet works Willpower out on creation; set it after
    await lord.update({"system.advantages.willpower.permanent": 10, "system.advantages.willpower.temporary": 10});
    await lord.setFlag("wodx-actions", "road", {key: "kings", path: null});
    const info = () => A().roadFaithInfo(lord);
    const story = info().story;

    await G.step("1. a level 3 sin resisted opens a Moment of Truth", async () => {
      const n0 = game.messages.size;
      const w = await fill(() => A().sin({actor: lord}), /^Sin against the Road/, {level: 3, desc: "Gate: a broken oath of hospitality", lose: "road", wp: true});
      const opened = await waitFor(() => !!info().truth, 30000);
      let card = null;
      // the History line is written before the card, and takes a while on a slow lane
      await waitFor(() => (card = game.messages.contents.slice(n0).find(m => /Moment of Truth/.test(m.content ?? ""))), 90000);
      G.ok("1. a level 3 sin resisted opens a Moment of Truth", w && opened && info().truth.key === "sin" && info().truth.story === story && !!card,
        {window: w, truth: info().truth, card: !!card, road: info().road.value});
    }, {timeout: 150000});

    await G.step("2. a Mentor at 9 dots and the Moment of Truth: the Road dot costs 4, and buying it spends the Moment", async () => {
      const w = await fill(() => A().roadFaith({actor: lord}), /^The Road: /, {act: "mentor", mentorPick: "", mentorName: "Gate Mentor of Kings", mentorRating: 9});
      await waitFor(() => info().mentor?.name === "Gate Mentor of Kings", 20000);
      const opt = () => C().data.purchaseOptions(lord).find(o => o.kind === "road");
      const price = opt()?.cost;
      await C().award([lord], 20, "Gate DA Road");
      await C().learn?.setWaived?.(lord, true);
      const p = opt();
      const r = await C().xp.spend(lord, {...p, source: {kind: "teacher", name: "Gate Mentor of Kings"}});
      await waitFor(() => Number(lord.system.advantages.path.permanent) === 7, 15000);
      G.ok("2. a Mentor at 9 dots and the Moment of Truth: the Road dot costs 4, and buying it spends the Moment", w && info().mentorCounts && price === 4
        && r?.ok && Number(lord.system.advantages.path.permanent) === 7 && !info().truth,
        {window: w, mentor: info().mentor, price, parts: p?.costParts ?? null, spent: r?.ok ?? null, reason: r?.reason ?? null, road: lord.system.advantages.path.permanent, truth: info().truth});
    }, {timeout: 60000});

    await G.step("3. three Paragons excommunicate the Adherent: the Sin roll at +2", async () => {
      const w = await fill(() => A().roadFaith({actor: lord}), /^The Road: /, {act: "excommunicate", paragons: "Gate Paragon One, Gate Paragon Two, Gate Paragon Three"});
      const out = await waitFor(() => info().faith.status === "excommunicate", 20000);
      const n0 = game.messages.size;
      await fill(() => A().sin({actor: lord}), /^Sin against the Road/, {level: 5, desc: "Gate: a second sin", lose: "conscience", wp: true});
      let card = null;
      await waitFor(() => (card = game.messages.contents.slice(n0).find(m => /Gate: a second sin/.test(m.content ?? ""))), 90000);
      G.ok("3. three Paragons excommunicate the Adherent: the Sin roll at +2", w && out && /\+2 Excommunicate/.test(card?.content ?? "") && info().road.aura === 0,
        {window: w, status: info().faith.status, card: !!card, plus2: /\+2 Excommunicate/.test(card?.content ?? ""), aura: info().road.aura});
    }, {timeout: 150000});

    await G.step("4. a change of Road to the Road of the Beast, rolled from the Road window until it ends", async () => {
      await A().roadFaithAct(lord, {act: "clearStatus"});
      const w1 = await fill(() => A().roadFaith({actor: lord}), /^The Road: /, {act: "change", to: "beast|"});
      await waitFor(() => !!info().change, 20000);
      const before = info().change.steps.map(s => s.key);
      // the sins that bring the Virtues and the Road down are the player's; the gate puts the sheet where they leave it
      await lord.update({"system.advantages.path.permanent": 1, "system.advantages.virtues.conscience.permanent": 1, "system.advantages.virtues.selfcontrol.permanent": 1,
        "system.advantages.virtues.courage.permanent": 1, "system.advantages.willpower.temporary": 10});
      // the window's other choices were driven in steps 2 and 3; here they go through the same function, quicker on a slow lane
      await A().roadFaithAct(lord, {act: "mentor", mentorPick: "", mentorName: "Gate Mentor of the Beast", mentorRating: 6});
      await A().roadFaithAct(lord, {act: "truth", catalyst: "event", forChange: true, note: "Gate: the hunt in the snow"});
      const ready = await waitFor(() => info().change?.ready, 20000);
      const diff = info().change?.difficulty;
      let rolls = 0; const t0 = Date.now();
      while ( info().change && rolls < 12 ) {
        const s0 = info().change.successes, w0 = Number(lord.system.advantages.willpower.temporary);
        if ( rolls === 0 ) await fill(() => A().roadFaith({actor: lord}), /^The Road: /, {act: "changeRoll"});
        else await A().roadFaithAct(lord, {act: "changeRoll"});
        rolls++; G.R.notes.push(`roll ${rolls} at ${Math.round((Date.now() - t0) / 1000)} s: ${info().change?.successes ?? "ended"}`);
        await waitFor(() => !info().change || info().change.successes !== s0 || Number(lord.system.advantages.willpower.temporary) !== w0, 20000);
      }
      const f = info().faith, rd = Number(lord.system.advantages.path.permanent), key = lord.getFlag("wodx-actions", "road")?.key;
      const walked = key === "beast" && rd === 1 && f.status === "apostate";
      const lost = key === "kings" && rd === 0;
      G.ok("4. a change of Road to the Road of the Beast, rolled from the Road window until it ends", w1 && before.includes("mentor") && before.includes("astray") && ready && diff === 7
        && !info().change && (walked || lost), {steps: before, ready, diff, rolls, key, rating: rd, status: f.status, walked, lost});
    }, {timeout: 200000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  finally {
    try { if ( keep.spend !== undefined && keep.spend !== true ) await game.settings.set("wodx-actions", "spendResources", keep.spend); } catch (e) { /* ignore */ }
  }
  return G.finish();
}
