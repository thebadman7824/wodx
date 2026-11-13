/**
 * The age floor gate (B3210-B3215: nothing romantic or sexual with anyone under 18; adoption by law), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateage.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes actors and deletes them, and deletes its chat cards.
 *   1. the age floor and adoption are in the API
 *   2. who is a minor: a birth year 15 years back, a Kindred Embraced at 15 long ago, a resident child, the mark; an adult with no sign is not
 *   3. courting a minor is refused and no warmth is kept
 *   4. marrying a minor is refused, even with force
 *   5. a minor cannot be a parent through haveChild
 *   6. a lover tie to a minor written straight to the sheet is not kept; a friend tie is
 *   7. Seduction of a minor target opens no window
 *   8. two adults still court and marry
 *   9. an adult takes in a child by the law here, with ties and a record on both sheets
 *  10. a minor cannot adopt
 *  11. clean up
 * Result: Data/wodx-gate/gateage-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chron = () => game.modules.get("wodx-chronicle").api;
const npc = () => game.modules.get("wodx-npc").api;
const act = () => game.modules.get("wodx-actions").api;

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
  // A step that waits on a window or a roll for more than 30 seconds fails instead of holding the lane; windows it opened are closed
  const step = async (name, fn) => {
    const before = new Set([...Object.keys(ui.windows), ...(foundry.applications.instances?.keys?.() ?? [])].map(String));
    let timer;
    const late = new Promise((_, no) => { timer = setTimeout(() => no(new Error("timed out after 30 s")), 30000); });
    try { await Promise.race([fn(), late]); }
    catch (e) {
      ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")});
      for ( const [id, w] of [...Object.entries(ui.windows), ...(foundry.applications.instances?.entries?.() ?? [])] ) if ( !before.has(String(id)) ) await w?.close?.().catch?.(() => null);
    } finally { clearTimeout(timer); }
  };
  const t0 = game.time.worldTime;
  const msgs = new Set(game.messages.map(m => m.id));
  const made = [];
  let adultA, adultB, teen, oldChilde, resChild, marked, plain;
  try {
    await step("1. modules", async () => {
      const cv = game.modules.get("wodx-chronicle").version, nv = game.modules.get("wodx-npc").version, av = game.modules.get("wodx-actions").version;
      ok("1. the age floor and adoption are in the API", typeof chron().age?.minor === "function" && typeof npc().hearts?.adopt === "function" && newer(av, "3.64.0"), {cv, nv, av});
    });
    await step("2. who is a minor", async () => {
      const now = (await import("/modules/wodx-chronicle/scripts/calendar.mjs")).getEngine().timeToDate(t0).year;
      R.notes.push({year: now});
      [adultA, adultB, teen, oldChilde, resChild, marked, plain] = await Actor.createDocuments([
        {name: "Gate Age Adult Ana", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 30}, sex: "female"}}},
        {name: "Gate Age Adult Bo", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 32}, sex: "male"}}},
        {name: "Gate Age Teen", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: now - 15}}}},
        {name: "Gate Age Old Childe", type: "Vampire", flags: {"wodx-creation": {chronology: {bornYear: now - 315}}}},
        {name: "Gate Age Resident Child", type: "Mortal", flags: {"wodx-npc": {resident: {role: "child"}}}},
        {name: "Gate Age Marked", type: "Mortal", flags: {"wodx-chronicle": {minor: true}}},
        {name: "Gate Age Plain", type: "Mortal"}]);
      made.push(adultA, adultB, teen, oldChilde, resChild, marked, plain);
      // Embraced 300 years ago at 15: the body stopped at 15
      const engine = (await import("/modules/wodx-chronicle/scripts/calendar.mjs")).getEngine();
      const d = engine.timeToDate(t0);
      await oldChilde.update({"flags.wodx-creation.chronology.embraced": engine.dateToTime({...d, year: now - 300})});
      const m = a => chron().age.minor(a);
      ok("2. minors by birth year, by the Embrace, by a child role and by the mark; an adult with no sign is not", m(teen) && m(oldChilde) && m(resChild) && m(marked) && !m(plain) && !m(adultA),
        {teen: m(teen), oldChilde: m(oldChilde), resChild: m(resChild), marked: m(marked), plain: m(plain), adult: m(adultA)});
    });
    await step("3. court", async () => {
      const r = await npc().hearts.court(adultA, teen, "gift");
      ok("3. courting a minor is refused and no warmth kept", r?.ok === false && !adultA.flags?.["wodx-npc"]?.warmth?.[teen.id], {why: r?.why});
    });
    await step("4. marry", async () => {
      const r = await npc().hearts.marry(adultA, teen, {force: true});
      ok("4. marrying a minor is refused, even with force", r?.ok === false && !(adultA.flags?.["wodx-npc"]?.marriages ?? []).length, {why: r?.why});
    });
    await step("5. child", async () => {
      const r = await npc().hearts.haveChild(teen, adultB);
      if ( r?.child ) made.push(r.child);
      ok("5. a minor cannot be a parent", r?.ok === false && !r?.child, {why: r?.why});
    });
    await step("6. ties", async () => {
      await adultA.setFlag("wodx-sheets", "ties", [{uuid: teen.uuid, role: "lover"}, {uuid: oldChilde.uuid, role: "friend"}, {uuid: resChild.uuid, role: "spouse"}]);
      const roles = (adultA.flags?.["wodx-sheets"]?.ties ?? []).map(t => t.role);
      ok("6. lover and spouse ties to minors are not kept; the friend tie is", roles.length === 1 && roles[0] === "friend", {roles});
      await adultA.unsetFlag("wodx-sheets", "ties");
    });
    await step("7. seduction", async () => {
      const before = Object.keys(ui.windows).length + (foundry.applications.instances?.size ?? 0);
      const r = await act().seduction({actor: adultA, target: resChild});
      await sleep(300);
      const after = Object.keys(ui.windows).length + (foundry.applications.instances?.size ?? 0);
      ok("7. Seduction of a minor opens no window", r === null && after === before, {before, after});
    });
    await step("8. adults", async () => {
      const c = await npc().hearts.court(adultA, adultB, "gift");
      const w = await npc().hearts.marry(adultA, adultB, {force: true});
      ok("8. two adults still court and marry", (c?.value ?? 0) > 0 && w?.ok === true, {warmth: c?.value, married: w?.ok, why: w?.why});
    });
    await step("9. adopt", async () => {
      const r = await npc().hearts.adopt(adultA, resChild, {note: "Gate Age"});
      const up = (resChild.flags?.["wodx-sheets"]?.ties ?? []).find(t => t.uuid === adultA.uuid)?.role;
      const kept = (resChild.flags?.["wodx-npc"]?.adoptions ?? []).length === 1 && (adultA.flags?.["wodx-npc"]?.adoptions ?? []).length === 1;
      ok("9. an adult takes in a child by the law here, with ties and a record on both sheets", r?.ok === true && ["parent", "guardian"].includes(up) && kept, {kind: r?.kind, up, kept, why: r?.why});
    });
    await step("10. minor adopter", async () => {
      const r = await npc().hearts.adopt(teen, plain);
      ok("10. a minor cannot adopt", r?.ok === false && !(teen.flags?.["wodx-npc"]?.adoptions ?? []).length, {why: r?.why});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("11. clean up", async () => {
      for ( const x of made ) await x.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("11. actors and cards gone, clock untouched", game.time.worldTime === t0 && !made.some(x => game.actors.get(x.id)));
    });
  }
  return save(R, "gateage-result.json");
}
