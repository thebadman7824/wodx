/**
 * WoDX NPC 0.30.0 gate (relationships, the lineage tree, secrets and hooks, why an NPC feels as they do, talk lines
 * that need a trait), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepeople.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes four actors and deletes them, and puts back the Ledger and its chat cards.
 *   1. NPC 0.30.0+, Chronicle 0.29.0+, Sheets 0.11.0+, the APIs
 *   2. ties from the lineage show at both ends: sire and childe, domitor and ghoul
 *   3. the family and lineage tree opens and climbs to an unknown sire
 *   4. a secret hides the childe link from players
 *   5. a find makes a hook in the Ledger and a card
 *   6. a clue's "secret" outcome (Chronicle "Then") finds the second secret by its words
 *   7. digging rolls and posts a card
 *   8. why the NPC feels as they do: the steps add up, the hook and the secret are on the NPC's mind; the sheet's regard
 *   9. "Only when" reads Dominate 2; a talk line that needs it is marked
 *  10. the sheet's Relationships tab draws the ties and the buttons
 *  11. laying the secret bare makes it public and cancels the hook
 *  12. clean up
 * Result: Data/wodx-gate/gatepeople-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-npc";
const npc = () => game.modules.get(MOD).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const ST = () => game.modules.get("wodx-storyteller")?.api;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run() {
  const {R, ok, step} = harness();
  const t0 = game.time.worldTime;
  const keep = {ledger: foundry.utils.deepClone(game.settings.get("wodx-storyteller", "ledger")), messages: new Set(game.messages.map(m => m.id))};
  const made = [];
  let elder, childe, ghoul, finder, sid1, sid2, hookId;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get(MOD).version, cv = game.modules.get("wodx-chronicle").version, sv = game.modules.get("wodx-sheets")?.version;
      ok("1. NPC 0.30.0+, Chronicle 0.29.0+, Sheets 0.11.0+, the APIs", newer(v, "0.30.0") && newer(cv, "0.29.0") && newer(sv, "0.11.0")
        && typeof npc().ties?.of === "function" && typeof npc().openTree === "function" && typeof npc().secrets?.reveal === "function" && typeof npc().opinion?.reasons === "function", {v, cv, sv});
    });

    await step("2. ties", async () => {
      [elder] = await Actor.createDocuments([{name: "Gate Elder", type: "Vampire", system: {clan: "Ventrue"}, flags: {[MOD]: {gateRole: "people"}}}]);
      [finder] = await Actor.createDocuments([{name: "Gate Finder", type: "Vampire", system: {clan: "Nosferatu"}, flags: {[MOD]: {gateRole: "people"}}}]);
      [childe] = await Actor.createDocuments([{name: "Gate Childe", type: "Vampire", system: {clan: "Ventrue"}, flags: {[MOD]: {gateRole: "people"}, "wodx-creation": {lineage: {sire: {id: elder.id, name: elder.name}}}}}]);
      [ghoul] = await Actor.createDocuments([{name: "Gate Ghoul", type: "Mortal", flags: {[MOD]: {gateRole: "people"}, "wodx-creation": {lineage: {domitor: {id: elder.id, name: elder.name}, bonds: {[elder.id]: {name: elder.name, drinks: 2}}}}}}]);
      made.push(elder, finder, childe, ghoul);
      await finder.createEmbeddedDocuments("Item", [{name: "Investigation", type: "Trait", system: {type: "wod.types.secondability.skill", value: 3}}]);
      const e = npc().ties.of(elder), c = npc().ties.of(childe), g = npc().ties.of(ghoul);
      ok("2. sire and childe, domitor and ghoul, at both ends", c.some(x => x.kind === "sire" && x.to.id === elder.id) && e.some(x => x.kind === "childe" && x.to.id === childe.id)
        && e.some(x => x.kind === "ghoul" && x.to.id === ghoul.id) && g.some(x => x.kind === "domitor" && x.note === "second drink"), {elder: e.map(x => `${x.kind}:${x.to.name}`)});
    });

    await step("3. tree", async () => {
      const dlg = await npc().openTree(childe);
      await sleep(300);
      const html = dlg?.element?.innerHTML ?? "";
      ok("3. the tree shows the sire and an unknown sire above", /Gate Elder/.test(html) && /Unknown sire/.test(html) && /Gate Childe/.test(html));
      await dlg?.close?.();
    });

    await step("4. a secret hides a tie", async () => {
      const s = await npc().secrets.add(elder, {kind: "childe", text: "made Gate Childe without leave", weight: 2, tie: {kind: "childe", id: childe.id}});
      sid1 = s.id;
      await npc().secrets.add(elder, {kind: "diablerie", text: "drank an elder in the crypt", weight: 1});
      sid2 = npc().secrets.of(elder).find(x => x.kind === "diablerie")?.id;
      const edge = npc().ties.edges().find(x => x.from === elder.id && x.kind === "childe" && x.to.id === childe.id);
      const TR = npc().ties.rules;
      ok("4. the childe link is marked secret and hidden from a stranger, seen by both ends", edge?.secret === `${elder.id}:${sid1}` && !TR.visibleTo(edge, {mine: new Set([finder.id])})
        && TR.visibleTo(edge, {mine: new Set([childe.id])}), {edge});
    });

    await step("5. a find", async () => {
      const before = game.messages.size;
      await npc().secrets.reveal(elder, sid1, finder, {how: "gate"});
      await sleep(300);
      const s = npc().secrets.of(elder).find(x => x.id === sid1);
      hookId = s?.found?.[finder.id]?.entry ?? null;
      const entry = (ST().ledger.state()?.entries ?? []).find(x => x.id === hookId);
      ok("5. found by the finder, a major boon in the Ledger owed by the holder, a card", !!s?.found?.[finder.id] && entry?.kind === "boon" && entry.size === "major"
        && entry.from?.id === elder.id && entry.to?.id === finder.id && game.messages.size > before, {entry});
    });

    await step("6. a clue", async () => {
      await chron().when.run("secret elder in the crypt", {actor: finder, label: "Gate crypt"});
      await sleep(300);
      ok("6. the clue's words find the diablerie", !!npc().secrets.of(elder).find(x => x.id === sid2)?.found?.[finder.id]);
    });

    await step("7. digging", async () => {
      await npc().secrets.add(elder, {kind: "debt", text: "owes the gate a debt", weight: 1});
      const before = game.messages.size;
      const res = await npc().secrets.dig(elder, finder, "investigate");
      await sleep(300);
      ok("7. a dig rolls Perception + Investigation and posts a card", !!res && Array.isArray(res.roll?.dice) && game.messages.size > before, {net: res?.roll?.net, found: res?.found});
    });

    await step("8. why", async () => {
      await npc().attitude.apply(elder, finder, {delta: 1, why: "Gate: a kindness"});
      const r = npc().opinion.reasons(elder, finder);
      const sum = r.set.reduce((n, x) => n + x.delta, 0);
      const weigh = r.weigh.map(x => x.why).join(" | ");
      const regard = npc().opinion.regardHtml(elder);
      ok("8. the steps add up; the hook and the secret weigh; the sheet's regard names the finder", sum === r.step && /owes them a major boon/.test(weigh) && /know this NPC's secret/.test(weigh)
        && /Gate Finder/.test(regard), {r});
    });

    await step("9. trait-gated lines", async () => {
      await childe.createEmbeddedDocuments("Item", [{name: "Dominate", type: "Power", system: {type: "wod.types.discipline", value: 2}}]);
      const W = chron().when;
      const TK = await import(`/modules/wodx-npc/scripts/talk-rules.mjs?${Date.now()}`);
      ok("9. Dominate 2 passes, Dominate 3 does not; the line is marked", W.check("Dominate 2", {actor: childe}).ok && !W.check("Dominate 3", {actor: childe}).ok
        && TK.gateLabel("Dominate 2; night") === "Dominate 2");
    });

    await step("10. sheet", async () => {
      await elder.sheet.render(true);
      await sleep(1500);
      const el = elder.sheet.element?.[0] ?? elder.sheet.element;
      const tab = el?.querySelector?.(".tab.wodxties");
      const html = tab?.innerHTML ?? "";
      ok("10. Relationships: the childe, the ghoul, the family tree and Secrets buttons, the regard", /Relationships/.test(html) && /Gate Childe/.test(html) && /Gate Ghoul/.test(html)
        && /tie-tree/.test(html) && /tie-secrets/.test(html) && /How they regard/.test(html), {length: html.length});
      await elder.sheet.close();
    });

    await step("11. laid bare", async () => {
      await npc().secrets.expose(elder, sid1, {by: finder.id, entry: hookId, why: "Embracing without leave"});
      await sleep(300);
      const s = npc().secrets.of(elder).find(x => x.id === sid1);
      const entry = (ST().ledger.state()?.entries ?? []).find(x => x.id === hookId);
      const edge = npc().ties.edges().find(x => x.from === elder.id && x.kind === "childe" && x.to.id === childe.id);
      ok("11. public now, the hook cancelled, the tie no longer secret", s?.public === true && entry?.status === "void" && !edge?.secret, {status: entry?.status});
    });
  } catch (e) { R.errors.push(e.message); }

  // 12. clean up
  try {
    await game.settings.set("wodx-storyteller", "ledger", keep.ledger);
    for ( const a of made ) await a.delete();
    const msgs = game.messages.filter(m => !keep.messages.has(m.id)).map(m => m.id);
    if ( msgs.length ) await ChatMessage.deleteDocuments(msgs);
    R.removed = {messages: msgs.length, actors: made.length};
  } catch (e) { R.errors.push(`clean up: ${e.message}`); }
  await sleep(500);
  ok("12. everything is back: the Ledger, the actors and cards are gone, the clock unmoved",
    JSON.stringify(game.settings.get("wodx-storyteller", "ledger")) === JSON.stringify(keep.ledger)
    && !game.actors.some(a => a.flags?.[MOD]?.gateRole === "people") && game.time.worldTime === t0, R.removed);
  return save(R, "gatepeople-result.json");
}
