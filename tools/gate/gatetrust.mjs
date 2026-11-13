/**
 * WoDX NPC 0.57.0, Sheets 0.18.1 gate (trust, betrayal, boons, blackmail, hidden loyalties), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetrust.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes four actors, Ledger entries and a rumour, and removes them all.
 *   1. NPC 0.57.0+, Sheets 0.18.1+, the API
 *   2. a boon paid in the Ledger raises the holder's trust in the debtor
 *   3. a betrayal: trust falls by 4, a rumour starts, the NPC's revenge goes in the Ledger, a card is whispered
 *   4. a boon passes to a new holder
 *   5. blackmail over a secret: a monthly Ledger debt and the hold on the victim; paying opens next month's
 *   6. confessing first lays the secret bare and ends the hold
 *   7. a hidden loyalty makes a hidden tie to the leader; the senses list for a vampire names Auspex
 *   8. the Relationships tab shows the trust word
 *   9. clean up
 * Result: Data/wodx-gate/gatetrust-result.json.
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
  const rumours0 = new Set((st().rumours.list?.() ?? []).map(r => r.id));
  const made = [];
  let pc, ana, bo, leader;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version, sv = game.modules.get("wodx-sheets").version;
      ok("1. NPC 0.57.0+, Sheets 0.18.1+, the API", newer(v, "0.57.0") && newer(sv, "0.18.1") && typeof npc().trust?.betray === "function", {v, sv});
    });
    await step("2. boon paid", async () => {
      [pc, ana, bo, leader] = await Actor.createDocuments([{name: "Gate Trust PC", type: "Vampire"}, {name: "Gate Trust Ana", type: "Vampire"}, {name: "Gate Trust Bo", type: "Mortal"}, {name: "Gate Trust Bishop", type: "Vampire"}]);
      made.push(pc, ana, bo, leader);
      const e = await st().ledger.save({kind: "boon", size: "minor", what: "Gate boon", from: {id: ana.id, name: ana.name}, to: {id: pc.id, name: pc.name}});
      await st().ledger.status(e.id, "kept");
      await sleep(600);
      ok("2. a paid boon raises the holder's trust", npc().trust.of(pc, ana) === 1, {trust: npc().trust.of(pc, ana)});
    });
    await step("3. betrayal", async () => {
      const b = await npc().trust.betray(pc, bo, {kind: "secret", what: "Gate test"});
      await sleep(600);
      const revenge = st().ledger.state().entries.find(x => !entries0.has(x.id) && x.kind === "consequence" && x.from?.id === bo.id);
      const rumour = (st().rumours.list?.() ?? []).find(r => !rumours0.has(r.id) && /Gate Trust PC/.test(r.text ?? ""));
      const card = game.messages.find(m => !msgs.has(m.id) && m.flags?.["wodx-npc"]?.betrayal);
      ok("3. trust -4, a rumour, revenge in the Ledger, a card", npc().trust.of(bo, pc) === -4 && !!revenge && !!rumour && !!card && b?.revenge === true,
        {trust: npc().trust.of(bo, pc), revenge: !!revenge, rumour: !!rumour, card: !!card});
    });
    await step("4. trade boon", async () => {
      const e = await st().ledger.save({kind: "boon", size: "trivial", what: "Gate trade", from: {id: ana.id, name: ana.name}, to: {id: pc.id, name: pc.name}});
      const n = await npc().trust.tradeBoon(e.id, leader);
      ok("4. an open boon passes to a new holder", st().ledger.state().entries.find(x => x.id === e.id)?.to?.id === leader.id && !!n);
    });
    let bm;
    await step("5. blackmail", async () => {
      const s = await npc().secrets.add(ana, {kind: "other", text: "Gate secret", weight: 2});
      bm = await npc().trust.blackmail(pc, ana, s.id, {price: 3});
      const hold = ana.flags?.["wodx-npc"]?.blackmail?.[bm?.entry?.id];
      await npc().trust.answerBlackmail(bm.entry.id, "pay");
      const holds = Object.keys(ana.flags?.["wodx-npc"]?.blackmail ?? {});
      ok("5. a monthly debt and the hold; paying opens next month's", !!hold && hold.amount === 3 && holds.length === 1 && holds[0] !== bm.entry.id
        && st().ledger.state().entries.find(x => x.id === bm.entry.id)?.status === "kept", {holds, proof: bm?.proof?.proof});
      bm.next = holds[0];
    });
    await step("6. confess", async () => {
      await npc().trust.answerBlackmail(bm.next, "confess");
      const s = npc().secrets.of(ana).find(x => x.text === "Gate secret");
      ok("6. confessing lays it bare and ends the hold", !!s?.public && !Object.keys(ana.flags?.["wodx-npc"]?.blackmail ?? {}).length);
    });
    await step("7. hidden side", async () => {
      await npc().trust.setSide(bo, {faction: "gate", name: "Gate Sabbat", leader: {id: leader.id, name: leader.name}});
      const t = npc().ties.of(bo).find(x => x.kind === "spyFor");
      ok("7. a hidden tie to the leader; Auspex for a vampire", t?.to?.id === leader.id && t.hidden && npc().trust.howToFind(pc).some(s => /Auspex/.test(s.power)));
    });
    await step("8. sheet", async () => {
      await pc.update({"flags.wodx-sheets.ties": [{uuid: `Actor.${ana.id}`, role: "friend"}]});
      await pc.sheet.render(true);
      await sleep(1500);
      // Sheets are Application V1: element is a jQuery object
      const el = pc.sheet.element?.[0] ?? pc.sheet.element;
      const html = el?.querySelector?.(".tab.wodxties")?.innerHTML ?? el?.innerHTML ?? "";
      ok("8. the Relationships tab shows the trust word", /Inclined to trust/.test(html));
      await pc.sheet.close();
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("9. clean up", async () => {
      for ( const e of st().ledger.state().entries.filter(x => !entries0.has(x.id)) ) await st().ledger.remove(e.id).catch(() => null);
      for ( const r of (st().rumours.list?.() ?? []).filter(r => !rumours0.has(r.id)) ) await st().rumours.remove(r.id).catch(() => null);
      for ( const a of made ) await a.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("9. actors, entries, rumours and cards gone, clock untouched", game.time.worldTime === t0 && !made.some(a => game.actors.get(a.id))
        && !st().ledger.state().entries.some(x => !entries0.has(x.id)));
    });
  }
  return save(R, "gatetrust-result.json");
}
