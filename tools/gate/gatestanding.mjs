/**
 * WoDX NPC 0.59.0, Storyteller 0.62.0, Actions 3.61.0 gate (standing, gossip along ties, rank, feuds), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestanding.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes actors, a rumour and a feud, and removes them all.
 *   1. NPC 0.59.0+, Storyteller 0.62.0+, Actions 3.61.0+, the API
 *   2. a deed counts at home at once; far away only after the news could get there
 *   3. two NPC friends are contacts in the rumour mill; a rumour keeps its source, subject and truth; a denial counts
 *   4. rank: a knight's word on the ladder of the year, and a serf defers (rank shift -1)
 *   5. a feud between two families puts a descendant on a side and is a rivalry row
 *   6. the family tree shows rank and the feud
 *   7. clean up
 * Result: Data/wodx-gate/gatestanding-result.json.
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
  const rumours0 = new Set((st().rumours.list?.() ?? []).map(r => r.id));
  const feuds0 = new Set(npc().standing.feuds().map(f => f.id));
  const made = [];
  let hero, f1, f2, knight, serf;
  try {
    await step("1. modules", async () => {
      const v = game.modules.get("wodx-npc").version, sv = game.modules.get("wodx-storyteller").version, av = game.modules.get("wodx-actions").version;
      ok("1. NPC 0.59.0+, Storyteller 0.62.0+, Actions 3.61.0+, the API", newer(v, "0.59.0") && newer(sv, "0.62.0") && newer(av, "3.61.0") && typeof npc().standing?.deed === "function" && typeof st().rumours.doubt === "function", {v, sv, av});
    });
    await step("2. deeds", async () => {
      [hero] = await Actor.createDocuments([{name: "Gate Stand Hero", type: "Mortal"}]);
      made.push(hero);
      const home = game.modules.get("wodx-chronicle").api.world.homeland();
      await npc().standing.deed(hero, {community: "town", delta: 2, text: "Gate deed", region: home});
      const here = await npc().standing.of(hero, "town", home);
      const far = await npc().standing.of(hero, "town", home === "france" ? "german-lands" : "france");
      R.notes.push({home, here, far: {value: far.value, coming: far.coming.length}});
      ok("2. at home at once, far away only when the news arrives", here.value === 2 && far.value === 0 && far.coming.length === 1);
    });
    await step("3. gossip", async () => {
      [f1, f2] = await Actor.createDocuments([{name: "Gate Stand Gossip A", type: "Mortal"}, {name: "Gate Stand Gossip B", type: "Mortal"}]);
      made.push(f1, f2);
      await f1.setFlag("wodx-sheets", "ties", [{uuid: `Actor.${f2.id}`, role: "friend"}]);
      const net = st().rumours.contacts();
      const r = await st().rumours.start({text: "Gate Stand rumour", tellers: [f1.id], about: hero.id, truth: "half"});
      const d = await st().rumours.doubt(r.id, {by: hero.id});
      ok("3. friends are contacts; source, subject and truth kept; a denial counts", (net[f1.id] ?? []).includes(f2.id) && r.source === f1.id && r.about === hero.id && r.truth === "half" && d?.doubt === 1);
    });
    await step("4. rank", async () => {
      [knight, serf] = await Actor.createDocuments([{name: "Gate Stand Knight", type: "Mortal"}, {name: "Gate Stand Serf", type: "Mortal"}]);
      made.push(knight, serf);
      await npc().standing.setRank(knight, 5, {ladder: "latin-medieval"}); await npc().standing.setRank(serf, 0, {ladder: "latin-medieval"});
      const r = npc().standing.rank(knight);
      ok("4. a rank word for the year, and a serf defers", !!r?.word && npc().standing.rankShift(knight, serf) === -1 && npc().standing.rankShift(serf, knight) === 1, {word: r?.word});
    });
    let feud;
    await step("5. feud", async () => {
      feud = await npc().standing.startFeud({a: {kind: "family", key: "Gatefeud", name: "Gatefeud"}, b: {kind: "family", key: "Gaterival", name: "Gaterival"}, cause: "Gate test"});
      const [heir] = await Actor.createDocuments([{name: "Wenzel Gatefeud", type: "Mortal"}]);
      made.push(heir);
      ok("5. a family feud takes in a member by name and is a rivalry row", npc().standing.feudSidesOf(heir).includes(`feud:${feud.id}a`) && npc().standing.feudRows().some(r => r.id === `feud-${feud.id}`)
        && npc().rivalry.rules.rowsBetween([`feud:${feud.id}a`], [`feud:${feud.id}b`], 1300, npc().standing.feudRows()).length === 1);
      R.notes.push({law: npc().standing.feudLaw()});
      await step("6. tree", async () => {
        await npc().standing.setRank(heir, 2);
        const dlg = await npc().openTree(heir);
        await sleep(700);
        const html = dlg?.element?.innerHTML ?? document.querySelector(".wnpc-tree")?.innerHTML ?? "";
        ok("6. the tree shows rank and the feud", /Rank: /.test(html) && /In feud with Gaterival/.test(html));
        await dlg?.close?.();
      });
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("7. clean up", async () => {
      for ( const r of (st().rumours.list?.() ?? []).filter(r => !rumours0.has(r.id)) ) await st().rumours.remove(r.id).catch(() => null);
      await game.settings.set("wodx-npc", "feuds", (game.settings.get("wodx-npc", "feuds") ?? []).filter(f => feuds0.has(f.id)));
      for ( const a of made ) await a.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      ok("7. actors, rumour and feud gone, clock untouched", game.time.worldTime === t0 && !made.some(a => game.actors.get(a.id)) && npc().standing.feuds().every(f => feuds0.has(f.id)));
    });
  }
  return save(R, "gatestanding-result.json");
}
