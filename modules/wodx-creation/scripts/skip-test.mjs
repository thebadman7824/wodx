import {MODULE_ID, esc, lineOf, lineage, chronology, disciplinesOf} from "./actor-data.mjs";
import {planSkip, applyPlan, yearOf} from "./time.mjs";
import {giveVitae} from "./change-of-state.mjs";
import {setChronology} from "./lineage.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {bondStage} from "./rules.mjs";

/**
 * The Phase 4 gate: 1197 to 2025 in steps, accepting each plan as proposed, then checking that nothing was lost
 * and that ages, bonds and abilities came out as proposed. It moves the clock, so run it in a test world.
 */

const FOLDER = "WoDX Skip Test";
export const STEPS = [1347, 1450, 1837, 1914, 1997, 2025];

function census() {
  const items = new Map();
  for ( const a of game.actors ) for ( const i of a.items ?? [] ) items.set(`${a.id}.${i.id}`, i.name);
  return {actors: new Set([...game.actors].map(a => a.id)), items, journals: new Set([...game.journal].map(j => j.id))};
}

async function makeCast(folder) {
  const mk = (name, type, extra = {}) => Actor.create(foundry.utils.mergeObject({name: `Skip Test · ${name}`, type, folder: folder.id,
    flags: {[MODULE_ID]: {skipTest: true}}}, extra, {inplace: false}));
  const vamp = CONFIG.worldofdarkness.sheettype.vampire;
  const mortal = CONFIG.worldofdarkness.sheettype.mortal;
  const elder = await mk("Elder", vamp);
  await elder.update({"system.generation": 8, "system.advantages.path.permanent": 5, "system.advantages.willpower.permanent": 6,
    "system.abilities.melee.value": 3});
  await elder.createEmbeddedDocuments("Item", [{name: "Dominate", type: "Power", system: {type: "wod.types.discipline", value: 3, level: 3}}]);
  const theology = elder.items.find(i => i.type === "Trait" && i.name.toLowerCase() === game.i18n.localize("wod.abilities.theology").toLowerCase());
  if ( theology ) await theology.update({"system.value": 3});
  const smith = await mk("Old Smith", mortal);
  await setChronology(smith, {bornYear: 1150});
  const ward = await mk("Young Ward", mortal);
  await setChronology(ward, {bornYear: 1290});
  const ghoul = await mk("Faithful Ghoul", mortal);
  await setChronology(ghoul, {bornYear: 1170});
  // A childe bound to her elder: a mortal who drinks becomes a ghoul instead (V20DA p. 399)
  const thrall = await mk("Bound Childe", vamp);
  await thrall.update({"system.advantages.willpower.permanent": 6});
  const t0 = game.time.worldTime;
  await giveVitae(ghoul, elder, {points: 5, time: t0});
  await giveVitae(thrall, elder, {points: 1, time: t0});
  await giveVitae(thrall, elder, {points: 1, time: t0 + 86400});
  return {elder, smith, ward, ghoul, thrall};
}

export async function runSkipTest() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const ok = await DialogV2.confirm({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Time-skip test"},
    content: `<p>This makes five test characters, sets the clock to 1 January 1200, then passes the years to 2025 in ${STEPS.length} steps,
      accepting every plan as proposed. It moves <strong>${esc(game.world.title ?? game.world.id)}</strong>'s clock and era for good.</p>
      <p>Run it in <strong>wodx-template</strong>, not in a chronicle you are playing.</p>`,
    rejectClose: false
  });
  if ( !ok ) return null;

  const engine = getEngine();
  await game.time.set(engine.dateToTime({year: 1200, month: 1, day: 1, hour: 21, minute: 0}));
  const folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER) ?? await Folder.create({name: FOLDER, type: "Actor"});
  const cast = await makeCast(folder);
  const before = census();
  const results = [];
  const check = (name, pass, detail = "") => results.push({name, pass: !!pass, detail});
  const stepLog = [];

  for ( const year of STEPS ) {
    const from = game.time.worldTime;
    const d = engine.timeToDate(from);
    const to = engine.dateToTime({year, month: d.month, day: d.day, hour: d.hour, minute: d.minute});
    const plan = planSkip({from, to});
    const proposed = plan.rows.reduce((n, r) => n + r.changes.filter(c => c.checked).length, 0);
    await applyPlan(plan, {label: `Skip test to ${year}`});
    stepLog.push({year, era: plan.toEra?.name, rows: plan.rows.length, proposed});
    check(`Clock reached ${year}`, yearOf(game.time.worldTime) === year, `${yearOf(game.time.worldTime)}`);
    check(`Era for ${year}`, game.modules.get("wodx-chronicle").api.eras.activeEra().profile?.id === plan.toEra?.id, plan.toEra?.name ?? "");
  }

  const after = census();
  const lostActors = [...before.actors].filter(id => !after.actors.has(id));
  const lostItems = [...before.items.keys()].filter(k => !after.items.has(k));
  const lostJournals = [...before.journals].filter(id => !after.journals.has(id));
  check("No actor lost", !lostActors.length, lostActors.join(", "));
  check("No item lost", !lostItems.length, lostItems.map(k => before.items.get(k)).join(", "));
  check("No journal lost", !lostJournals.length, lostJournals.join(", "));

  const {elder, smith, ward, ghoul, thrall} = cast;
  const died = a => chronology(game.actors.get(a.id)).died;
  check("Old Smith (born 1150) died of age by 1347", died(smith) !== undefined && yearOf(died(smith)) === 1347);
  check("Young Ward (born 1290) lived past 1347 and died by 1450", died(ward) !== undefined && yearOf(died(ward)) === 1450);
  check("The dead are kept, filed in WoDX · The Dead", game.actors.get(smith.id)?.folder && game.folders.get(game.actors.get(smith.id).folder)?.name === "WoDX · The Dead");
  const g = game.actors.get(ghoul.id);
  check("The fed ghoul is alive and still a ghoul", lineOf(g) === "ghoul" && died(ghoul) === undefined);
  check("The ghoul's blood pool grew one a century (18 after 825 years)", Number(g.system.advantages.bloodpool.max) === 18, `${g.system.advantages.bloodpool.max}`);
  check("The ghoul keeps Potence", disciplinesOf(g).some(x => x.name === "Potence" && x.value >= 1));
  const th = lineage(game.actors.get(thrall.id)).bonds?.[elder.id];
  check("The thrall's two-drink bond faded away", bondStage(th?.drinks).stage === 0, `${th?.drinks}`);
  const e = game.actors.get(elder.id);
  check("The elder's sheet is on the modern ability list", e.system.settings.era === CONFIG.worldofdarkness.era.modern, e.system.settings.era);
  check("Firearms and Computer are on the elder's sheet now", e.system.abilities.firearms?.isvisible && e.system.abilities.computer?.isvisible);
  check("Melee 3 kept", Number(e.system.abilities.melee?.value) === 3);
  check("Dominate 3 kept", disciplinesOf(e).some(x => x.name === "Dominate" && x.value === 3));
  const theo = e.items.find(i => i.type === "Trait" && i.name.toLowerCase() === game.i18n.localize("wod.abilities.theology").toLowerCase());
  check("The medieval Theology is kept", !!theo && Number(theo.system.value) === 3, `${theo?.system?.value}`);

  const passed = results.filter(r => r.pass).length;
  const html = `<p>${passed} of ${results.length} checks passed.</p>
    <table><thead><tr><th>Step</th><th>Era</th><th>Characters with changes</th><th>Changes proposed</th></tr></thead>
      <tbody>${stepLog.map(s => `<tr><td>${s.year}</td><td>${esc(s.era)}</td><td>${s.rows}</td><td>${s.proposed}</td></tr>`).join("")}</tbody></table>
    <table><thead><tr><th>Check</th><th>Result</th><th>Seen</th></tr></thead>
      <tbody>${results.map(r => `<tr><td>${esc(r.name)}</td><td>${r.pass ? "pass" : "<strong>FAIL</strong>"}</td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table>`;
  let journal = game.journal.find(j => j.getFlag?.(MODULE_ID, "kind") === "skip-test");
  if ( !journal ) journal = await JournalEntry.create({name: "WoDX Time-Skip Test", flags: {[MODULE_ID]: {kind: "skip-test"}},
    pages: [{name: "Result", type: "text", text: {content: html}}]});
  else await journal.pages.getName("Result")?.update({"text.content": html});
  journal.sheet?.render(true);
  ui.notifications[passed === results.length ? "info" : "error"](`Time-skip test: ${passed} of ${results.length} checks passed.`);
  return {passed, total: results.length, results, stepLog};
}
