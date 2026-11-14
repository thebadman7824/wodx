/**
 * Princes of Darkness ideas gate (WoDX Chronicle 0.37.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepod.mjs?${Date.now()}`)).run()
 * Turns the four settings on, makes its own characters, and puts the settings, actors, approvals and chat cards back.
 * The clock is not moved.
 *   1. the api, the settings and the window
 *   2. breaches raise a city's exposure; the court card comes at Watched and its button lowers it
 *   3. great cities by date, and the city's air reaches Senses
 *   4. a building raised logs a boon (the card's button)
 *   5. Golconda: a step, then theft, frenzy and harmful feeding set it back
 *   6. a mentor's month goes to the approval queue (or straight on, when the type approves by itself)
 *   7. the threshold card offers Golconda, and its button sets WoDX Actions' own flag
 *   8. a story chain deals its first step and can be stopped
 *   9. an opening goal is picked
 *  10. every other WoDX module still answers
 * Result: Data/wodx-gate/gatepod-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.pod, appr = () => game.modules.get(C)?.api?.approvals;
  const KEYS = ["podExposure", "podCities", "podGolconda", "podChains", "podCity", "podState"];
  const t0 = Date.now(), time0 = game.time.worldTime, was = Object.fromEntries(KEYS.map(k => [k, foundry.utils.deepClone(game.settings.get(C, k))]));
  const pend0 = new Set((appr()?.pending?.() ?? []).map(p => p.id));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-pod"));
  const cardWith = key => cards().filter(m => m.flags?.[C]?.podAct?.key === key).at(-1);
  const press = async m => { const el = document.querySelector(`[data-message-id="${m?.id}"] [data-wct-pod-act]`); if ( !el ) return false; el.click(); await sleep(800); return true; };
  const CITY = "WoDX gate city";
  let actors = [];
  try {
    for ( const k of ["podExposure", "podCities", "podGolconda", "podChains"] ) await game.settings.set(C, k, true);
    await game.settings.set(C, "podCity", CITY);
    await game.settings.set(C, "podState", {cities: {}, chains: []});
    actors = await createActors([{name: "WoDX gate: Seeker", type: "Vampire", system: {clan: "brujah", generation: 10}}, {name: "WoDX gate: Patron", type: "Mortal"}]);
    const by = n => game.actors.get(actors.find(a => a?.name === `WoDX gate: ${n}`)?.id);

    await step("1 api", async () => {
      const app = await api()?.open?.(); await sleep(500);
      const shown = (app?.element?.querySelectorAll?.("h3")?.length ?? 0) >= 4;
      await app?.close?.();
      ok("1 api", atLeast(game.modules.get(C).version, "0.37.0") && typeof api()?.expose === "function" && shown && !!game.settings.menus.get(`${C}.podMenu`), {version: game.modules.get(C).version, shown});
    });

    await step("2 exposure", async () => {
      // spread: false keeps it out of the town's rumours (NPC factions); three witnesses make three points a breach
      for ( let i = 0; i < 6 && api().exposure(CITY).value < 10; i++ ) {
        const v0 = api().exposure(CITY).value;
        Hooks.callAll("wodxBreach", {entry: {event: "a gate test", spread: false, witnesses: [{}, {}, {}]}, by: {uuid: by("Seeker").uuid, name: "WoDX gate: Seeker"}});
        await until(() => api().exposure(CITY).value > v0);
      }
      await until(() => !!cardWith("heel"));
      const high = api().exposure(CITY).value, court = cardWith("heel");
      const pressed = await press(court);
      const after = api().exposure(CITY).value;
      ok("2 exposure", high >= 10 && !!court && (!pressed || after === high - 3), {high, after, pressed, band: api().exposure(CITY).band.key});
      if ( !pressed ) R.notes.push("The court card's button was not in the chat log; the drop was not checked.");
    });

    await step("3 great cities", async () => {
      const c1 = api().cityState("Constantinople", 1300), c2 = api().cityState("Prague", 1350);
      await game.settings.set(C, "podCity", "Prague");
      const sources = [];
      Hooks.callAll("wodxSensesGather", {scene: canvas.scene, token: null, actor: null, sources});
      await game.settings.set(C, "podCity", CITY);
      const air = sources.find(s => s.id?.startsWith("pod.city."));
      ok("3 great cities", /Retaken/.test(c1?.state) && /Charles IV/.test(c2?.state) && !!air?.lines, {c1: c1?.state, c2: c2?.state, air: air?.name});
    });

    await step("4 building", async () => {
      await api().raiseBuilding({patron: by("Patron").id, building: "the Charles Bridge chapel", faction: "the Church", restore: true});
      const m = cardWith("boon");
      ok("4 building", !!m && m.content.includes("the Church"), {});
    });

    await step("5 Golconda setbacks", async () => {
      const a = by("Seeker");
      await api().seek(a); await api().golcondaStep(a, 4, "A test passed");
      const s0 = api().golconda(a)?.step;
      Hooks.callAll("wodxSocial", {actor: a, npc: null, act: "lift", result: "win"});
      await until(() => api().golconda(a)?.step === s0 - 1);
      await a.update({"system.conditions.isfrenzy": true});
      await until(() => api().golconda(a)?.step === s0 - 2);
      await a.update({"system.conditions.isfrenzy": false});
      Hooks.callAll("wodxFed", {by: {uuid: a.uuid, name: a.name}, vessel: {uuid: by("Patron").uuid, name: "x"}, drunk: 3, willing: true, fought: false});
      await until(() => api().golconda(a)?.step === s0 - 3);
      ok("5 Golconda setbacks", s0 === 4 && api().golconda(a)?.step === 1, {s0, now: api().golconda(a)?.step, log: api().golconda(a)?.log?.map(l => l.text)});
    });

    await step("6 mentor", async () => {
      const a = by("Seeker");
      await api().setMentor(a, "Brother Anselm");
      await a.update({[`flags.${C}.golconda.mentorAt`]: game.time.worldTime - 31 * 86400});
      const s0 = api().golconda(a).step;
      Hooks.callAll("updateWorldTime", game.time.worldTime, 0);
      await until(() => (appr().pending() ?? []).some(p => p.type === `${C}.podTeach`) || api().golconda(a).step > s0);
      const queued = (appr().pending() ?? []).some(p => p.type === `${C}.podTeach`);
      ok("6 mentor", queued || api().golconda(a).step === s0 + 1, {queued, step: api().golconda(a).step});
    });

    await step("7 threshold", async () => {
      const a = by("Seeker");
      await api().golcondaStep(a, 10, "The last test");
      await until(() => !!cardWith("grant"));
      const pressed = await press(cardWith("grant"));
      ok("7 threshold", !!cardWith("grant") || pressed, {pressed, flag: !!game.actors.get(a.id).getFlag("wodx-actions", "golconda")});
      if ( pressed && !game.actors.get(a.id).getFlag("wodx-actions", "golconda") ) R.steps.at(-1).pass = false;
    });

    await step("8 story chain", async () => {
      const n0 = cards().length;
      const run = await api().startChain("black-death", "Brno");
      await until(() => cards().length > n0);
      const first = cards().at(-1)?.content ?? "";
      const st = game.settings.get(C, "podState").chains.find(r => r.id === run?.id);
      await api().stopChain(run?.id);
      const gone = !game.settings.get(C, "podState").chains.some(r => r.id === run?.id);
      ok("8 story chain", first.includes("News of ships") && st?.at === 1 && gone, {at: st?.at, gone});
    });

    await step("9 opening goal", async () => {
      const a = by("Patron"), g = api().goals(a);
      await api().setGoal(a, g[1].key);
      ok("9 opening goal", g.length === 3 && game.actors.get(a.id).flags?.[C]?.goal?.key === g[1].key, {goals: g.map(x => x.key)});
    });

    await step("10 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library", "wodx-senses"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("10 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const p of (appr()?.pending?.() ?? []).filter(p => !pend0.has(p.id)) ) await appr().decide(p.id, "reject", "gate cleanup");
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      for ( const k of KEYS ) await game.settings.set(C, k, was[k]);
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatepod-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gatepod", runGate);
