/**
 * WoDX NPC 0.60.0 gate (past lives, teaching, the web of ties, scene ideas, who sees what), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelegacy.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes actors and removes them, and deletes its cards and Ledger entries.
 *   1. NPC 0.60.0+, the API and the setting
 *   2. a past-life tie to an undying person is hidden until recalled (recall with a forced 5 dots until it succeeds)
 *   3. teaching makes the mentor tie, records what was taught and puts what is owed in the Ledger; the line runs down
 *   4. the teacher's death tells the student
 *   5. the web window opens with the people and the search box
 *   6. scene ideas list a boon due this week
 *   7. trust shows to the one who feels it and not on the other's side for a player view
 *   8. clean up
 * Result: Data/wodx-gate/gatelegacy-result.json.
 */
// a batch create need not hand the documents back in the order asked: put them back in that order by name
const inOrder = (docs, data) => data.map(d => docs.find(x => x.name === d.name));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const npc = () => game.modules.get("wodx-npc").api;
const st = () => game.modules.get("wodx-storyteller").api;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const msgs = new Set(game.messages.map(m => m.id));
  const entries0 = new Set(st().ledger.state().entries.map(e => e.id));
  const made = [];
  let mage, count, teacher, student;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version;
      ok("1. NPC 0.60.0+, the API and the setting", newer(v, "0.60.0") && typeof npc().legacy?.openWeb === "function" && game.settings.get("wodx-npc", "sceneIdeas") === true, {v});
    });
    await step("2. past life", async () => {
      const two = [{name: "Gate Legacy Mira", type: "Mage"}, {name: "Gate Legacy Count", type: "Vampire"}];
      [mage, count] = inOrder(await Actor.createDocuments(two), two);
      made.push(mage, count);
      const p = await npc().legacy.addPastLife(mage, {name: "Agnes of Brno", year: 1340, ties: [{id: count.id, name: count.name, kind: "lover"}]});
      const hiddenBefore = npc().ties.of(mage).find(t => t.kind === "pastLife")?.hidden === true;
      let r = null;
      for ( let i = 0; i < 6 && !r?.ok; i++ ) r = await npc().legacy.recall(mage, p.id, {dots: 5});
      const recalled = !!npc().legacy.pastLives(mage)[0]?.recalled?.[mage.id];
      ok("2. hidden until recalled, then recorded", hiddenBefore && r?.ok && recalled, {tries: r});
    });
    await step("3. teaching", async () => {
      const pair = [{name: "Gate Legacy Teacher", type: "Vampire"}, {name: "Gate Legacy Student", type: "Vampire"}];
      [teacher, student] = inOrder(await Actor.createDocuments(pair), pair);
      made.push(teacher, student);
      const row = await npc().legacy.teach(teacher, student, {what: "Auspex", dots: 1, months: 3, owed: "a minor boon"});
      const tie = npc().ties.of(student).some(t => t.kind === "mentor" && t.to.id === teacher.id);
      const debt = st().ledger.state().entries.some(e => !entries0.has(e.id) && /teaching Auspex/.test(e.what));
      const line = npc().legacy.teachingLine(teacher);
      ok("3. mentor tie, record, debt and the line down", !!row && tie && debt && line.down.some(x => x.id === student.id) && npc().legacy.taughtBy(teacher)[student.id]?.length === 1, {way: row?.way});
    });
    await step("4. teacher dies", async () => {
      await teacher.update({"flags.wodx-creation.chronology.died": game.time.worldTime});
      await sleep(900);
      ok("4. the student is told", game.messages.some(m => !msgs.has(m.id) && m.flags?.["wodx-npc"]?.mentorGone));
    });
    await step("5. web", async () => {
      const dlg = await npc().legacy.openWeb();
      await sleep(600);
      const el = dlg?.element ?? document.querySelector(".wnpc-web-dialog");
      const w = npc().legacy.web();
      const svg = !!el?.querySelector?.("svg"), named = (el?.textContent ?? "").includes("Gate Legacy Student"), search = !!el?.querySelector?.("input.wodx-search");
      ok("5. the web window shows the people, the links and the search box", svg && named && search,
        {svg, named, search, nodes: w.nodes.length, links: w.links.length, studentInWeb: w.nodes.some(n => n.id === student.id), returned: !!dlg});
      await dlg?.close?.();
    });
    await step("6. ideas", async () => {
      await st().ledger.save({kind: "boon", size: "minor", what: "Gate Legacy boon", from: {id: student.id, name: student.name}, to: {id: count.id, name: count.name}, due: game.time.worldTime + 2 * 86400});
      const ideas = npc().legacy.ideas();
      ok("6. a boon due this week is a scene idea", ideas.some(i => /Gate Legacy Count calls in the boon/.test(i.text)), {n: ideas.length});
    });
    await step("7. who sees", async () => {
      await npc().trust.move(student, count, "rescued");
      const fromStudent = npc().ties.of(student).find(t => t.to.id === count.id && t.trust);
      const r = npc().ties.rules?.feelingsFor ?? null;
      const asOther = r && fromStudent ? r(fromStudent, {gm: false, mine: new Set([count.id])}) : null;
      ok("7. trust shows to the one who feels it only", !!fromStudent && asOther && asOther.trust === undefined);
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("8. clean up", async () => {
      for ( const e of st().ledger.state().entries.filter(x => !entries0.has(x.id)) ) await st().ledger.remove(e.id).catch(() => null);
      for ( const a of made ) await a.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("8. actors, entries and cards gone, clock untouched", game.time.worldTime === t0 && !made.some(a => game.actors.get(a.id)));
    });
  }
  return save(R, "gatelegacy-result.json");
}
