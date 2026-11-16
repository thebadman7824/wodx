/**
 * WoDX Creation gate: learning from a teacher, a book or practice (B6230-B6239), in Foundry, in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelearning.mjs?${Date.now()}`)).run()
 * Makes its own scene and actors and removes them; the clock is put back at the end (the kit does it).
 *   1. the rule is on, and a teacher who knows Occult is offered; practice is closed for Occult
 *   2. a spend from the teacher: the experience goes at once, Occult does not move yet, a WoDX Storyteller long task
 *      is open, and the learner's token carries the study mark (status wodx-studying)
 *   3. the long task runs on the clock until it is done: Occult rises to 1, the mark comes off, a card says so
 *   4. a study stopped in Long tasks gives the experience back
 *   5. waived by the Storyteller, a spend raises the trait at once
 * Result: Data/wodx-gate/gatelearning-result.json.
 */
import {gate} from "./kit.mjs";

const C = "wodx-creation", ST = "wodx-storyteller";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 6000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };

export async function run() {
  const G = gate("gatelearning");
  const keep = [];
  try {
    const api = game.modules.get(C)?.api, S = game.modules.get(ST)?.api;
    for ( const [m, k] of [[C, "learning"], [ST, "longTasks"]] ) if ( game.settings.settings.has(`${m}.${k}`) ) keep.push([m, k, game.settings.get(m, k)]);
    await game.settings.set(C, "learning", true);
    if ( game.settings.settings.has(`${ST}.longTasks`) ) await game.settings.set(ST, "longTasks", true);
    const scene = await G.scene();
    const [learner, friar] = await G.make(Actor, [{name: "Gate Learning Novice", type: "Mortal"}, {name: "Gate Learning Friar", type: "Mortal"}]);
    await friar.update({"system.abilities.occult.value": 4});
    await learner.update({"system.abilities.occult.value": 0, "system.abilities.occult.isvisible": true, "system.abilities.melee.value": 1, "system.abilities.melee.isvisible": true});
    await G.tokens(scene, [{actor: learner, x: 2, y: 2}, {actor: friar, x: 3, y: 2}]);
    await api.award([learner], 20, "Gate learning");
    const avail = () => api.data.xpTotals(learner).available;
    const occ = () => api.data.purchaseOptions(learner).find(o => o.kind === "ability" && o.key === "occult");
    const studying = () => !!learner.statuses?.has?.("wodx-studying");

    await G.step("1. the teacher is offered", async () => {
      const {choices} = api.learn.choices(learner, occ());
      const t = choices.find(c => c.src.kind === "teacher" && c.src.id === friar.id);
      const alone = choices.find(c => c.src.kind === "practice");
      G.ok("1. the teacher is offered", api.learn.needsSource(learner) && !!t?.ok && alone && !alone.ok, {teacher: t ? {ok: t.ok, diff: t.plan.diff, time: t.time} : null, practice: alone?.ok});
    });

    let rec = null;
    await G.step("2. the spend starts a study", async () => {
      const before = avail();
      const p = occ();
      const r = await api.xp.spend(learner, {...p, source: {kind: "teacher", id: friar.id, name: friar.name}});
      rec = r.ok ? api.learn.records(learner)[r.learning] : null;
      const task = rec ? learner.flags?.[ST]?.tasks?.[rec.taskId] : null;
      await settle(() => studying(), 3000);
      G.ok("2. the spend starts a study", r.ok && avail() === before - p.cost && Number(learner.system.abilities.occult.value) === 0 && task?.status === "open" && studying(),
        {ok: r.ok, reason: r.reason, spent: before - avail(), occult: learner.system.abilities.occult.value, task: task ? {goal: task.goal, diff: task.diff, interval: task.interval} : null, mark: studying()});
    });

    await G.step("3. the study ends and the trait rises", async () => {
      if ( !rec ) return G.ok("3. the study ends and the trait rises", false, {error: "no study"});
      // Easy rolls so the gate does not wait on luck; the rule under test is what happens at the end
      // The roll is made due now, as gateowners does: moving the clock starts the hook's own tick, which holds the next
      const due = () => learner.update({[`flags.${ST}.tasks.${rec.taskId}.next`]: game.time.worldTime});
      await learner.update({[`flags.${ST}.tasks.${rec.taskId}.diff`]: 2, [`flags.${ST}.tasks.${rec.taskId}.goal`]: 1, [`flags.${ST}.tasks.${rec.taskId}.dice`]: 10});
      for ( let i = 0; i < 6 && learner.flags?.[ST]?.tasks?.[rec.taskId]?.status !== "done"; i++ ) {
        await due();
        await S.tasks.tick({force: true});
      }
      // The card is posted last, after the rise and the mark: wait for it too
      const learned = () => game.messages.contents.slice(-40).some(m => /has learned/.test(m.content ?? "") && m.content.includes(learner.name));
      await settle(() => Number(learner.system.abilities.occult.value) === 1 && !studying() && learned());
      const card = learned();
      G.ok("3. the study ends and the trait rises", Number(learner.system.abilities.occult.value) === 1 && !studying() && card,
        {occult: learner.system.abilities.occult.value, mark: studying(), card, status: learner.flags?.[ST]?.tasks?.[rec.taskId]?.status});
    });

    await G.step("4. stopping gives the experience back", async () => {
      const before = avail();
      const p = api.data.purchaseOptions(learner).find(o => o.kind === "ability" && o.key === "melee");
      const r = await api.xp.spend(learner, {...p, source: {kind: "practice"}});
      const r2 = r.ok ? api.learn.records(learner)[r.learning] : null;
      const paid = before - avail();
      if ( r2 ) await S.tasks.remove(learner, r2.taskId);
      await settle(() => avail() === before);
      G.ok("4. stopping gives the experience back", r.ok && paid === p.cost && avail() === before && Number(learner.system.abilities.melee.value) === 1,
        {ok: r.ok, reason: r.reason, paid, back: avail() === before, melee: learner.system.abilities.melee.value});
    });

    await G.step("5. waived, it rises at once", async () => {
      await api.learn.setWaived(learner, true);
      const p = api.data.purchaseOptions(learner).find(o => o.kind === "attribute" && o.key === "strength");
      const r = await api.xp.spend(learner, p);
      await api.learn.setWaived(learner, false);
      G.ok("5. waived, it rises at once", r.ok && !r.learning && Number(learner.system.attributes.strength.value) === p.next, {ok: r.ok, reason: r.reason, strength: learner.system.attributes.strength.value});
    });
  } finally {
    for ( const [m, k, v] of keep ) { try { await game.settings.set(m, k, v); } catch (e) { /* kept */ } }
    return G.finish();
  }
}
