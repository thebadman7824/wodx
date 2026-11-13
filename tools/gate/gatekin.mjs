/**
 * WoDX NPC 0.55.0 and Storyteller 0.62.0 gate (family lines, ties after a jump in time, wills and estates), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatekin.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes four actors and deletes them, and puts back the family lines setting.
 *   1. NPC 0.55.0+, Storyteller 0.62.0+, the APIs and the setting
 *   2. a family line starts from the sibling and spouse on the Relationships tab
 *   3. growing it 80 years makes births and deaths, and the living know a story of the founder
 *   4. a living member brought into play is the founder's Descendant at both ends
 *   5. the family and lineage tree shows the line, Bring into play and the Will button
 *   6. the report for an 80-year jump names the spouse's age and the family line, without writing anything
 *   7. a will saved on the sheet; the Ledger's heir is the will's main heir
 *   8. the estate divides by the will and the homeland's law, adding to the whole
 *   9. the estate and false heir approval types are registered
 *  10. clean up
 * Result: Data/wodx-gate/gatekin-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const npc = () => game.modules.get("wodx-npc").api;
const ST = () => game.modules.get("wodx-storyteller")?.api;
const YEAR = 365.25 * 86400;

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
  const keepLines = foundry.utils.deepClone(game.settings.get("wodx-npc", "familyLines"));
  const keepLedger = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "ledger"));
  const made = [];
  let founder, sister, spouse, child, line, brought;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version, sv = game.modules.get("wodx-storyteller").version;
      ok("1. NPC 0.55.0+, Storyteller 0.62.0+, the APIs and the setting", newer(v, "0.55.0") && newer(sv, "0.62.0") && typeof npc().kin?.start === "function"
        && typeof ST()?.wills?.estate === "function" && game.settings.settings.has("wodx-npc.tiesAgeing"), {v, sv});
    });

    await step("2. a line", async () => {
      [sister] = await Actor.createDocuments([{name: "Gate Eliška Kinová", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: 1180}}}}]);
      [spouse] = await Actor.createDocuments([{name: "Gate Spouse Kinová", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: 1182}}}}]);
      [child] = await Actor.createDocuments([{name: "Gate Child Kinová", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: 1205, sex: "male"}}}}]);
      [founder] = await Actor.createDocuments([{name: "Gate Jan Kinová", type: "Vampire", flags: {"wodx-creation": {chronology: {bornYear: 1178}},
        "wodx-sheets": {ties: [{uuid: sister.uuid, role: "sibling"}, {uuid: spouse.uuid, role: "spouse"}, {uuid: child.uuid, role: "child"}]}}}]);
      made.push(sister, spouse, child, founder);
      line = await npc().kin.start(founder);
      ok("2. the line starts from the sibling and spouse on the Relationships tab", !!line && line.family === "Kinová" && line.members.some(m => m.actorId === sister.id) && line.members.some(m => m.actorId === spouse.id),
        {members: line?.members?.map(m => `${m.name}:${m.relation ?? "founder"}`)});
    });

    await step("3. grow", async () => {
      const to = line.year + 80;
      const out = await npc().kin.grow(to, {only: line.id});
      const d = npc().kin.descendants(founder, to);
      line = npc().kin.lineOf(founder);
      ok("3. 80 years of births and deaths; the living know a story of the founder", out.length === 1 && out[0].events.some(e => e.kind === "birth") && d.length > 0 && d.every(m => m.story) && line.year === to,
        {summary: out[0]?.summary, first: d[0]?.story});
    });

    await step("4. bring into play", async () => {
      const m = npc().kin.descendants(founder, line.year).find(x => !x.actorId);
      brought = m ? await npc().kin.bring(line.id, m.id) : null;
      if ( brought ) made.push(brought);
      const mine = npc().ties.of(founder), theirs = brought ? npc().ties.of(brought) : [];
      ok("4. a member brought into play is the founder's Descendant at both ends", !!brought && mine.some(t => t.kind === "descendant" && t.to.id === brought.id) && theirs.some(t => t.kind === "ancestor" && t.to.id === founder.id),
        {name: brought?.name});
    });

    await step("5. tree", async () => {
      const dlg = await npc().openTree(founder);
      await sleep(300);
      const html = dlg?.element?.innerHTML ?? "";
      ok("5. the tree shows the family line, Bring into play and the Will button", /Family line/.test(html) && /data-kin-bring/.test(html) && /data-kin-will/.test(html));
      await dlg?.close?.();
    });

    await step("6. report", async () => {
      const before = JSON.stringify(game.settings.get("wodx-npc", "familyLines"));
      const r = await npc().kin.reportFor(t0, t0 + 80 * YEAR);
      const after = JSON.stringify(game.settings.get("wodx-npc", "familyLines"));
      ok("6. the report for an 80-year jump is worked out and nothing is written", r.years >= 79 && Array.isArray(r.rows) && before === after, {years: r.years, rows: r.rows.length, grown: r.grown.length});
    });

    await step("7. will", async () => {
      await ST().wills.save(founder, {heirs: [{id: child.id, name: child.name, share: 0.6}, {id: sister.id, name: sister.name, share: 0.4}], note: "gate"});
      const w = ST().wills.of(founder);
      const heir = ST().ledger.heirOf(founder.id);
      ok("7. a will is saved, and the Ledger's heir is its main heir", w.heirs.length === 2 && heir?.id === child.id, {heir: heir?.name});
    });

    await step("8. estate", async () => {
      const e = ST().wills.estate(founder);
      const sum = e.shares.reduce((s, x) => s + x.share, 0) + e.free;
      ok("8. the estate divides by the will and the law, adding to the whole", Math.abs(sum - 1) < 0.02 && e.shares.some(s => s.why === "by the will") && !!e.law?.key,
        {law: e.law?.key, shares: e.shares.map(s => `${s.name} ${s.share} ${s.why}`)});
    });

    await step("9. approval types", async () => {
      const types = game.modules.get("wodx-chronicle").api.approvals?.types?.() ?? [];
      const has = t => types.some(x => x.type === t);
      ok("9. estate, false heir and ties-after-a-jump approval types", has("wodx-storyteller.estate") && has("wodx-storyteller.false-heir") && has("wodx-npc.ties-aged"));
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("10. clean up", async () => {
      // A will on a deleted sheet would queue an estate card: clear it first
      for ( const a of made ) await a.unsetFlag?.("wodx-storyteller", "will").catch(() => null);
      for ( const a of made ) await a.delete().catch(() => null);
      await game.settings.set("wodx-npc", "familyLines", keepLines);
      await game.settings.set("wodx-storyteller", "ledger", keepLedger);
      ok("10. actors gone, family lines and Ledger put back, clock untouched", game.time.worldTime === t0 && !made.some(a => game.actors.get(a.id)));
    });
  }
  return save(R, "gatekin-result.json");
}
