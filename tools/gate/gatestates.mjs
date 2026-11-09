/**
 * Death into a wraith, the Awakening and the creation check (WoDX Creation 0.8.0), in Foundry, in rothenstein-wodx
 * only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestates.mjs?${Date.now()}`)).run()
 * It makes two test mortals and deletes them and every sheet made from them, and the test folders if they were new.
 *   1. version and api
 *   2. a mortal dies: a Wraith sheet with the mortal's Traits, Corpus 10, Pathos 5 + Memoriam, Angst 1 or more
 *   3. the two sheets are linked and the mortal is filed
 *   4. a Sleeper Awakens: a Mage sheet with Arete 1, the Affinity Sphere, Avatar 1 and Quintessence
 *   5. the creation check opens on the mage with M20 picked, with search boxes, and counts the Sphere
 *   6. the Creation window shows the three new buttons
 *   7. put back
 * Result: Data/wodx-gate/gatestates-result.json.
 */
const C = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newer = (a, b) => { const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0); return true; };
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatestates-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const win = cls => [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains(cls));
const FOLDERS = ["WoDX · Before death", "WoDX · Before the Awakening"];

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const made = [];
  const hadFolder = new Set(FOLDERS.filter(n => game.folders.find(f => f.type === "Actor" && f.name === n)));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  try {
    const api = game.modules.get(C)?.api;
    ok("1. version and api", newer(game.modules.get(C)?.version, "0.8.0") && !!api?.deathToWraith && !!api?.awaken && !!api?.check,
      {version: game.modules.get(C)?.version});

    const ilse = await Actor.create({name: "Gate death mortal", type: "Mortal"}); made.push(ilse);
    await sleep(300);
    await ilse.update({"system.attributes.wits.value": 4, "system.abilities.alertness.value": 3, "system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4});
    const w = await api.deathToWraith(ilse, {memoriam: 2, caulWay: "crucible", angstDice: [6, 7, 2, 1, 1], moveTokens: false}); made.push(w);
    await sleep(500);
    ok("2. death into a wraith", w?.type === "Wraith" && w.system.attributes.wits.value === 4 && w.system.abilities.alertness.value === 3
      && w.system.advantages.corpus.permanent === 10 && w.system.advantages.pathos.temporary === 7 && w.system.advantages.angst.permanent === 2
      && w.system.advantages.willpower.permanent === 5 && w.items.some(i => i.name === "Memoriam"),
      {type: w?.type, wits: w?.system?.attributes?.wits?.value, corpus: w?.system?.advantages?.corpus, pathos: w?.system?.advantages?.pathos, angst: w?.system?.advantages?.angst});
    const lin = w?.getFlag(C, "lineage"), old = game.actors.get(ilse.id);
    ok("3. linked and filed", lin?.formerly?.id === ilse.id && old?.getFlag(C, "lineage")?.became?.id === w.id && old?.folder?.name === FOLDERS[0]
      && w.getFlag(C, "wraith")?.inCaul === true, {folder: old?.folder?.name});

    const mat = await Actor.create({name: "Gate Sleeper", type: "Mortal"}); made.push(mat);
    await sleep(300);
    await mat.update({"system.advantages.willpower.permanent": 3, "system.abilities.occult.value": 2});
    const m = await api.awaken(mat, {affinity: "forces", paradigm: "Hermetic", moveTokens: false}); made.push(m);
    await sleep(500);
    ok("4. the Awakening", m?.type === "Mage" && m.system.advantages.arete.permanent === 1 && m.system.spheres.forces.value === 1
      && m.system.quintessence.permanent === 1 && m.system.advantages.willpower.permanent === 3 && m.items.some(i => i.name === "Avatar" && Number(i.system.value) === 1)
      && m.system.abilities.occult.value === 2, {arete: m?.system?.advantages?.arete, forces: m?.system?.spheres?.forces, q: m?.system?.quintessence});

    await api.check(m); await sleep(700);
    const cw = win("wodx-creation-check");
    const line = cw?.element.querySelector("select[name=line]")?.value;
    const sphereRow = [...(cw?.element.querySelectorAll("tbody tr") ?? [])].find(tr => tr.firstElementChild?.textContent === "Spheres");
    ok("5. creation check", line === "m20" && cw.element.querySelectorAll("input.wodx-search").length >= 2 && sphereRow?.children[2]?.textContent === "1",
      {line, sphere: sphereRow?.textContent});
    await cw?.close();

    await api.open(); await sleep(600);
    const cr = win("wodx-creation");
    ok("6. Creation window buttons", ["death", "awaken", "check"].every(a => cr?.element.querySelector(`button[data-action=${a}]`)));
    await cr?.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const a of made ) await game.actors.get(a?.id)?.delete();
      for ( const n of FOLDERS ) if ( !hadFolder.has(n) ) await game.folders.find(f => f.type === "Actor" && f.name === n)?.delete();
      const newMsgs = game.messages.filter(x => !msgsBefore.has(x.id) && /Death|The Awakening/.test(x.content ?? ""));
      for ( const x of newMsgs ) await x.delete();
      await game.modules.get(C)?.api?.writeLineageJournal?.();
      ok("7. put back", made.every(a => !game.actors.get(a?.id)));
    } catch (err) { ok("7. put back", false, {error: err.message}); }
  }
  return save(R);
}
