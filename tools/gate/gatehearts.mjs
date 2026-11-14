/**
 * WoDX NPC 0.58.0, Storyteller 0.62.1, Sheets 0.18.1 gate (courtship, marriage and law, children, households, loved
 * ones), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehearts.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes actors and deletes them, and deletes its chat cards and Ledger entries.
 *   1. NPC 0.58.0+, Storyteller 0.62.1+, Sheets 0.18.1+, the API and the setting
 *   2. courting: a gift to a Bon Vivant warms by two; a Kindred on a Path stays at Fond or below
 *   3. the law here and now, and a courting custom
 *   4. marry: spouse ties at both ends and a record on each sheet; a second spouse is refused where the law allows one
 *   5. a child of a Garou and a mortal is Kinfolk and ties to both parents; a Kindred cannot have one
 *   6. a household's keep is charged on wodxMonthPaid
 *   7. harm to a spouse brings a card to the other; taking them hostage puts the demand in the Ledger
 *   8. the Relationships tab shows the warmth word on the spouse tie
 *   9. divorce follows the law: refused or granted
 *  10. clean up
 * Result: Data/wodx-gate/gatehearts-result.json.
 */
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
  let a, b, c, garou, kindred, kid;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version, sv = game.modules.get("wodx-storyteller").version, hv = game.modules.get("wodx-sheets").version;
      ok("1. NPC 0.58.0+, Storyteller 0.62.1+, Sheets 0.18.1+, the API and the setting", newer(v, "0.58.0") && newer(sv, "0.62.1") && newer(hv, "0.18.1")
        && typeof npc().hearts?.marry === "function" && game.settings.get("wodx-npc", "heartCards") === true, {v, sv, hv});
    });
    await step("2. court", async () => {
      const docs = await Actor.createDocuments([
        {name: "Gate Heart Ana", type: "Mortal", system: {nature: "Bon Vivant"}, flags: {"wodx-creation": {sex: "female"}}},
        {name: "Gate Heart Bo", type: "Mortal", flags: {"wodx-creation": {sex: "male"}}},
        {name: "Gate Heart Cy", type: "Mortal", flags: {"wodx-creation": {sex: "female"}}},
        {name: "Gate Heart Wolf", type: "Werewolf"},
        {name: "Gate Heart Night", type: "Vampire", system: {advantages: {path: {custom: "Path of Night", permanent: 5}}}}]);
      // Found by name: the order the documents come back in is not relied on
      [a, b, c, garou, kindred] = ["Gate Heart Ana", "Gate Heart Bo", "Gate Heart Cy", "Gate Heart Wolf", "Gate Heart Night"].map(n => docs.find(d => d.name === n));
      made.push(a, b, c, garou, kindred);
      // The system fills in a new sheet on create, so Nature and the Path are set afterwards
      await a.update({"system.nature": "Bon Vivant"});
      await kindred.update({"system.advantages.path.custom": "Path of Night", "system.advantages.path.permanent": 5});
      const w = await npc().hearts.court(a, b, "gift");
      let k = null;
      for ( let i = 0; i < 4; i++ ) k = await npc().hearts.court(c, kindred, "time");
      ok("2. a gift to a Bon Vivant warms by two; a Kindred on a Path stays at Fond", w?.value === 2 && k?.value === 2, {w: w?.value, k: k?.value, nature: a.system?.nature, path: kindred.system?.advantages?.path?.custom});
    });
    await step("3. law", async () => {
      const law = npc().hearts.law(), cs = npc().hearts.courtship();
      R.notes.push({law, courtship: cs});
      ok("3. the law here and now, and a courting custom", !!law?.rite && !!law?.record && !!cs?.text);
    });
    await step("4. marry", async () => {
      const r = await npc().hearts.marry(a, b, {witnesses: [c]});
      const tieA = npc().ties.of(a).some(t => t.kind === "spouse" && t.to.id === b.id), tieB = npc().ties.of(b).some(t => t.kind === "spouse" && t.to.id === a.id);
      const law = npc().hearts.law();
      const second = await npc().hearts.marry(a, c);
      ok("4. spouse ties at both ends, records, and a second spouse refused where one is the law", r?.ok && tieA && tieB && (a.flags["wodx-npc"]?.marriages ?? []).length === 1
        && (law.plural ? second?.ok : second?.ok === false), {why: second?.why, plural: law.plural});
    });
    await step("5. child", async () => {
      const r = await npc().hearts.haveChild(garou, c, {name: "Gate Heart Pup"});
      kid = r?.child; if ( kid ) made.push(kid);
      const parents = kid ? npc().ties.of(kid).filter(t => t.kind === "parent").map(t => t.to.id) : [];
      const none = await npc().hearts.haveChild(kindred, c);
      ok("5. a Garou and mortal's child is Kinfolk with both parents; a Kindred cannot", r?.ok && ["kinfolk", "garou-to-be"].includes(r.kind.kind) && parents.includes(garou.id) && parents.includes(c.id) && none?.ok === false, {kind: r?.kind?.kind, ok: r?.ok, parents, garou: garou.id, c: c.id, none: none?.ok, why: r?.why});
    });
    await step("6. household", async () => {
      await npc().hearts.setHousehold(a, [{id: b.id, role: "spouse"}, {name: "Gate maid", role: "servant"}]);
      const u = npc().hearts.upkeep(a, 1);
      await st().upkeep.money.receive?.(a, u.total * 2 + 10, {note: "Gate"});
      const before = Number(st().upkeep.money.purse(a)?.carried) + Number(st().upkeep.money.purse(a)?.bank);
      Hooks.callAll("wodxMonthPaid", {month: -1, months: {[a.id]: 1}});
      await sleep(1000);
      const after = Number(st().upkeep.money.purse(a)?.carried) + Number(st().upkeep.money.purse(a)?.bank);
      ok("6. the keep is charged each month", u.total > 0 && before - after === u.total && game.messages.some(m => !msgs.has(m.id) && m.flags?.["wodx-npc"]?.household), {total: u.total, before, after});
    });
    await step("7. weak spot", async () => {
      Hooks.callAll("wodxDamageApplied", b, {levels: 2, before: 0, after: 2});
      await sleep(900);
      const cardA = game.messages.some(m => !msgs.has(m.id) && m.flags?.["wodx-npc"]?.heartCard && /Gate Heart Bo is hurt/.test(m.content));
      await npc().hearts.takeHostage(garou, b, {demand: "the deed to the mill"});
      await sleep(400);
      const demand = st().ledger.state().entries.some(e => !entries0.has(e.id) && /the deed to the mill/.test(e.what) && e.from?.id === a.id);
      ok("7. harm to a spouse brings a card; a hostage's demand goes in the Ledger", cardA && demand, {cardA, demand});
    });
    await step("8. sheet", async () => {
      await npc().hearts.court(a, b, "promise");
      await a.sheet.render(true);
      await sleep(1500);
      // Sheets are Application V1: element is a jQuery object
      const el = a.sheet.element?.[0] ?? a.sheet.element;
      const html = el?.querySelector?.(".tab.wodxties")?.innerHTML ?? el?.innerHTML ?? "";
      ok("8. the Relationships tab shows the warmth word", /Devoted|Fond/.test(html));
      await a.sheet.close();
    });
    await step("9. divorce", async () => {
      const law = npc().hearts.law();
      const r = await npc().hearts.divorce(a, b);
      const still = npc().ties.of(a).some(t => t.kind === "spouse" && t.to.id === b.id);
      ok("9. divorce follows the law", law.divorce ? r?.ok && !still : r?.ok === false && still, {divorce: law.divorce});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("10. clean up", async () => {
      for ( const e of st().ledger.state().entries.filter(x => !entries0.has(x.id)) ) await st().ledger.remove(e.id).catch(() => null);
      for ( const x of made ) await x.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("10. actors, entries and cards gone, clock untouched", game.time.worldTime === t0 && !made.some(x => game.actors.get(x.id)));
    });
  }
  return save(R, "gatehearts-result.json");
}
