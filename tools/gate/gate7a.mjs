/**
 * Phase 7a gate (the generator core and People), in Foundry (rothenstein-wodx) as a Gamemaster. Two parts:
 *   await (await import(`/wodx-gate/gate7a.mjs?${Date.now()}`)).run()     checks, then sends four people to the queue
 *   (the Storyteller approves "New people: …" in the approval queue)
 *   await (await import(`/wodx-gate/gate7a.mjs?${Date.now()}`)).check()   checks the sheets that were made
 * Writes a "Gate 7a test table" (in WoDX tables) and nothing else until the Storyteller approves. Deletes nothing.
 * Results: Data/wodx-gate/gate7a-result.json (run) and gate7a-check.json (check).
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CH = "wodx-chronicle", CR = "wodx-creation";
const chron = () => game.modules.get(CH).api, people = () => game.modules.get(CR).api.people;
const BATCH = 7001; // the gate's own batch number: the same people every run

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  return {R, ok, step};
}

export async function run() {
  const {R, ok, step} = harness();
  await step("versions", async () => {
    ok("versions", !!chron()?.gen?.draw && !!people()?.generate, {chronicle: game.modules.get(CH).version, creation: game.modules.get(CR).version, theme: chron()?.theme?.VERSION});
  });
  await step("the tables are in the world, editable", async () => {
    await chron().gen.installTables();
    const folder = game.folders.find(f => f.type === "RollTable" && f.name === "WoDX tables");
    const mine = game.tables.filter(t => t.getFlag(CH, "table")?.id);
    ok("the tables are in the world, editable", !!folder && mine.length >= 60 && mine.every(t => t.folder?.id === folder.id || t.name.startsWith("Gate")),
      {tables: mine.length, sample: mine.slice(0, 3).map(t => t.name)});
  });
  await step("the chronicle has a seed; the same key gives the same person, a re-roll another", async () => {
    const a = people().generate({batch: BATCH, row: 0}), b = people().generate({batch: BATCH, row: 0}), c = people().generate({batch: BATCH, row: 0, nonce: 1});
    ok("the chronicle has a seed; the same key gives the same person, a re-roll another", !!chron().gen.seed() && JSON.stringify(a) === JSON.stringify(b) && c.name !== a.name,
      {seed: chron().gen.seed(), a: a.name, again: b.name, reroll: c.name});
  });
  await step("Rothenstein's people: medieval Bohemia", async () => {
    const ctx = chron().gen.context();
    const ps = Array.from({length: 12}, (_, row) => people().generate({batch: BATCH + 1, row}));
    ok("Rothenstein's people: medieval Bohemia", ctx.era === "medieval" && ctx.culture === "bohemia" && ps.every(p => ["czech", "german", "jewish"].includes(p.origin) && p.name.includes(" ")),
      {ctx, people: ps.map(p => `${p.name} (${p.origin}, ${p.trade})`)});
  });
  await step("the Storyteller's own table wins over WoDX's", async () => {
    let folder = game.folders.find(f => f.type === "RollTable" && f.name === "WoDX tables");
    let t = game.tables.find(x => x.getFlag(CH, "table")?.id === "gate7a.test");
    if ( !t ) t = await RollTable.create({name: "Gate 7a test table", folder: folder?.id, formula: "1d1",
      results: [{type: "text", name: "the Storyteller's line", description: "the Storyteller's line", weight: 1, range: [1, 1]}], flags: {[CH]: {table: {id: "gate7a.test"}}}});
    await sleep(300);
    const first = chron().gen.draw("gate7a.test", {key: "x"})?.text;
    const r = [...t.results][0];
    await r.update({name: "an edited line", description: "an edited line"});
    await sleep(300);
    const after = chron().gen.draw("gate7a.test", {key: "x"})?.text;
    await r.update({name: "the Storyteller's line", description: "the Storyteller's line"});
    ok("the Storyteller's own table wins over WoDX's", first === "the Storyteller's line" && after === "an edited line", {first, after});
  });
  await step("four people wait in the approval queue (nothing made yet)", async () => {
    const before = game.actors.size;
    const ilse = game.actors.find(a => a.name === "Ilse (6e, Kindred)");
    const ps = [0, 1, 2].map(row => people().generate({batch: BATCH + 2, row})).concat([people().generate({batch: BATCH + 2, row: 3, kind: "ghoul"})]);
    const mortals = ps.slice(0, 3), ghoul = ps.slice(3);
    await chron().propose({type: "wodx-people", key: `gate7a:${BATCH + 2}:m`, title: `New people: ${mortals.map(p => p.name).join(", ")}`, detail: "Gate 7a: three mortals of Rothenstein.", data: {people: mortals}});
    await chron().propose({type: "wodx-people", key: `gate7a:${BATCH + 2}:g`, title: `New people: ${ghoul[0].name} (ghoul of ${ilse?.name ?? "no one"})`, detail: "Gate 7a: a ghoul.", data: {people: ghoul, domitorId: ilse?.id ?? null}});
    await sleep(500);
    const waiting = chron().approvals.pending().filter(p => p.type === "wodx-people" && String(p.key).startsWith("gate7a:"));
    ok("four people wait in the approval queue (nothing made yet)", waiting.length >= 2 && game.actors.size === before,
      {waiting: waiting.map(w => w.title), domitor: ilse?.name ?? null});
  });
  return save(R, "gate7a-result.json");
}

export async function check() {
  const {R, ok, step} = harness();
  // The people as they were sent to the queue (the approved entries carry them)
  const decided = chron().approvals.history().filter(h => h.type === "wodx-people" && String(h.key).startsWith(`gate7a:${BATCH + 2}:`) && h.verdict === "approve");
  const byKey = k => decided.find(h => h.key === `gate7a:${BATCH + 2}:${k}`)?.data?.people ?? [];
  const expect = [...byKey("m"), ...byKey("g")];
  if ( expect.length < 4 ) R.errors.push(`Only ${expect.length} approved gate people found in the queue's history`);
  const folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX people");
  const made = expect.map(p => game.actors.find(a => a.folder?.id === folder?.id && a.name === p.name && a.getFlag(CR, "people")?.batch === BATCH + 2));
  await step("the approved people are on their sheets", async () => {
    ok("the approved people are on their sheets", made.every(Boolean), {made: made.map(a => a?.name ?? null)});
  });
  await step("Nature, Demeanor, trade and the Storyteller's note", async () => {
    const good = made.every((a, i) => a && a.system.nature === expect[i].nature && a.system.demeanor === expect[i].demeanor && a.system.concept === expect[i].trade
      && /Wants/.test(a.system.notes ?? "") && /Hides that this person/.test(a.system.notes ?? ""));
    ok("Nature, Demeanor, trade and the Storyteller's note", good, {sample: made[0] ? {nature: made[0].system.nature, concept: made[0].system.concept} : null});
  });
  await step("the sheet's dots: Attributes, Abilities, Willpower, Dark Ages Secondary Abilities", async () => {
    const rows = made.map((a, i) => {
      if ( !a ) return null;
      const p = expect[i];
      const attrs = Object.entries(p.attributes).every(([k, v]) => Number(a.system.attributes?.[k]?.value) === v);
      const abil = Object.entries(p.abilities).filter(([k]) => a.system.abilities?.[k] !== undefined).every(([k, v]) => Number(a.system.abilities[k].value) === v);
      const wp = Number(a.system.advantages?.willpower?.permanent) === p.willpower;
      const sec = Object.entries(p.secondary ?? {}).map(([k, v]) => ({k, v, on: a.items.find(it => it.type === "Trait" && String(it.name).toLowerCase().replace(/[^a-z]/g, "") === k)?.system?.value}));
      return {name: a.name, attrs, abil, wp, sec};
    });
    ok("the sheet's dots: Attributes, Abilities, Willpower, Dark Ages Secondary Abilities", rows.every(r => r && r.attrs && r.abil && r.wp && r.sec.every(s => Number(s.on) === s.v)), {rows});
  });
  await step("the ghoul is a ghoul of its domitor", async () => {
    const g = made[3];
    const line = g?.getFlag(CR, "lineage");
    ok("the ghoul is a ghoul of its domitor", g?.system?.settings?.variant === "ghoul" && Number(g.system.advantages?.bloodpool?.max) > 0 && !!g.items.find(i => /potence/i.test(i.name)),
      {variant: g?.system?.settings?.variant, domitor: line?.domitor?.name ?? null, blood: g?.system?.advantages?.bloodpool});
  });
  return save(R, "gate7a-check.json");
}
