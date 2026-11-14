/**
 * WoDX NPC 0.56.0, Actions 3.59.0, Sheets 0.18.0 gate (bonds from the books as relationships), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebonds.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes five actors and deletes them, and deletes its chat cards.
 *   1. NPC 0.56.0+, Actions 3.59.0+, Sheets 0.18.0+, the API and the setting
 *   2. two Garou with one pack name are packmates, with the totem
 *   3. a wraith's Fetter named for a character is a Fetter tie at both ends
 *   4. a full blood bond makes the regnant's Social roll 2 easier
 *   5. the thrall's attack on the regnant brings a Willpower card
 *   6. the Fetter's death brings the Harrowing card to the wraith
 *   7. the wraith's Relationships tab shows what the Fetter does
 *   8. clean up
 * Result: Data/wodx-gate/gatebonds-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const npc = () => game.modules.get("wodx-npc").api;

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
const cardsSince = (ids, re) => game.messages.filter(m => !ids.has(m.id) && m.flags?.["wodx-npc"]?.bondCard && re.test(m.content));

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const msgs = new Set(game.messages.map(m => m.id));
  const made = [];
  let g1, g2, wraith, anchor, regnant, thrall;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version, av = game.modules.get("wodx-actions").version, sv = game.modules.get("wodx-sheets").version;
      ok("1. NPC 0.56.0+, Actions 3.59.0+, Sheets 0.18.0+, the API and the setting", newer(v, "0.56.0") && newer(av, "3.59.0") && newer(sv, "0.18.0")
        && typeof npc().bonds?.stepToward === "function" && game.settings.get("wodx-npc", "bondCards") === true, {v, av, sv});
    });
    await step("2. pack", async () => {
      [g1, g2] = await Actor.createDocuments([{name: "Gate Ana", type: "Werewolf", system: {packname: "Gate Silver Moon", packtotem: "Wolf"}}, {name: "Gate Bo", type: "Werewolf", system: {packname: "gate silver moon"}}]);
      made.push(g1, g2);
      const t = npc().ties.of(g1).find(x => x.kind === "packmate" && x.to.id === g2.id);
      ok("2. one pack name makes packmates, with the totem", !!t && /totem Wolf/.test(t.note) && npc().ties.of(g2).some(x => x.kind === "packmate"), {note: t?.note});
    });
    await step("3. fetter", async () => {
      [anchor] = await Actor.createDocuments([{name: "Gate Anchor Person", type: "Mortal"}]);
      [wraith] = await Actor.createDocuments([{name: "Gate Wren", type: "Wraith"}]);
      made.push(anchor, wraith);
      await wraith.createEmbeddedDocuments("Item", [{name: "Gate Anchor Person", type: "Trait", system: {type: "wod.types.fetter", value: 3}}]);
      const t = npc().ties.of(wraith).find(x => x.kind === "fetter");
      ok("3. a Fetter named for a character is a Fetter tie at both ends", t?.to?.id === anchor.id && npc().ties.of(anchor).some(x => x.kind === "fetterOf" && x.to.id === wraith.id), {note: t?.note});
    });
    await step("4. social shift", async () => {
      [regnant] = await Actor.createDocuments([{name: "Gate Regnant", type: "Vampire"}]);
      made.push(regnant);
      [thrall] = await Actor.createDocuments([{name: "Gate Thrall", type: "Mortal", flags: {"wodx-creation": {lineage: {bonds: {[regnant.id]: {name: regnant.name, drinks: 3}}}}}}]);
      made.push(thrall);
      ok("4. a full bond makes the regnant's Social roll 2 easier", npc().bonds.stepToward(thrall, regnant) === 3 && npc().bonds.socialShift(regnant, thrall) === -2);
    });
    await step("5. attack card", async () => {
      Hooks.callAll("wodxAttackRolled", thrall, {target: regnant, hit: false});
      await sleep(800);
      ok("5. the thrall's attack on the regnant brings a Willpower card", cardsSince(msgs, /Willpower roll first/).length >= 1);
    });
    await step("6. death card", async () => {
      await anchor.update({"flags.wodx-creation.chronology.died": game.time.worldTime});
      await sleep(800);
      ok("6. the Fetter's death brings the Harrowing card", cardsSince(msgs, /Harrowing/).length >= 1);
    });
    await step("7. sheet", async () => {
      await wraith.sheet.render(true);
      await sleep(1500);
      // Sheets are Application V1: element is a jQuery object
      const el = wraith.sheet.element?.[0] ?? wraith.sheet.element;
      const html = el?.querySelector?.(".tab.wodxties")?.innerHTML ?? el?.innerHTML ?? "";
      ok("7. the Relationships tab shows what the Fetter does", /wodx-tie-rule/.test(html) && /Harrowing/.test(html));
      await wraith.sheet.close();
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("8. clean up", async () => {
      for ( const a of made ) await a.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("8. actors and cards gone, clock untouched", game.time.worldTime === t0 && !made.some(a => game.actors.get(a.id)));
    });
  }
  return save(R, "gatebonds-result.json");
}
