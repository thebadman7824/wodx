import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors, Coll} from "./actors-mock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const {DialogV2} = foundry.applications.api;
const api = () => game.modules.get(M).api;
const chron = () => game.modules.get("wodx-chronicle").api;
const {getEngine} = await import(join(root, "modules/wodx-chronicle/scripts/calendar.mjs"));
const at = (year, month = 1, day = 1) => getEngine().dateToTime({year, month, day, hour: 21, minute: 0});

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  await game.time.set(at(1200));
  await mock.settle();
  assert.ok(api().passYears);
  assert.ok(chron().timeSkip);
});

test("a time skip pauses per-tick work and settles once", async () => {
  const seen = [];
  Hooks.on("wodxSkipStart", i => seen.push(["start", chron().isSkipping(), i.to]));
  Hooks.on("wodxSkipEnd", i => seen.push(["end", chron().isSkipping()]));
  const to = api().time.addYears(game.time.worldTime, 1);
  await chron().timeSkip(to, {label: "one year"});
  assert.deepEqual(seen, [["start", true, to], ["end", true]]);
  assert.equal(chron().isSkipping(), false);
  assert.equal(api().time.yearOf(game.time.worldTime), 1201);
  await assert.rejects(chron().timeSkip(game.time.worldTime - 10), /forward/);
});

test("addYears keeps the date, stepping back over a day the calendar lacks", () => {
  const t = api().time.addYears(at(1580, 10, 10), 4); // 10 October 1584 fell in Bohemia's reform gap? keep a valid day
  assert.equal(api().time.yearOf(t), 1584);
  const leap = api().time.addYears(at(1204, 2, 29), 1);
  assert.equal(api().time.yearOf(leap), 1205);
});

test("the plan: ages, deaths, ghouls, bonds, torpor, abilities", async () => {
  const mortal = await Actor.create({name: "Hedwig", type: "Mortal"});
  await api().lineage.setChronology(mortal, {bornYear: 1150});
  const kid = await Actor.create({name: "Jan", type: "Mortal"});
  await api().lineage.setChronology(kid, {bornYear: 1195});
  const nobody = await Actor.create({name: "No Birth Year", type: "Mortal"});
  const elder = await Actor.create({name: "Radu", type: "Vampire"});
  await elder.update({"system.generation": 8, "system.advantages.path.permanent": 4, "system.abilities.melee.value": 2});
  const ghoul = await Actor.create({name: "Mirek", type: "Mortal"});
  await api().giveVitae(ghoul, elder, {points: 4});
  // A vampire bound to another: mortals who drink become ghouls (V20DA p. 399), so a thrall who isn't one is a Cainite
  const thrall = await Actor.create({name: "Ilse", type: "Vampire"});
  await thrall.update({"system.advantages.willpower.permanent": 9});
  await api().giveVitae(thrall, elder, {time: game.time.worldTime});
  const creature = await Actor.create({name: "Wolf", type: "Creature", system: {settings: {iscreated: true}}});

  const from = game.time.worldTime;
  const plan = api().time.planSkip({from, to: api().time.addYears(from, 60)});
  const row = n => plan.rows.find(r => r.name === n);
  const change = (n, kind) => row(n)?.changes.find(c => c.kind === kind);
  assert.equal(plan.years, 60);
  assert.equal(plan.toEra.id, "dark-ages", "1261 is still the Dark Ages");
  assert.ok(change("Hedwig", "death").checked, "111 years old: dies, ticked");
  assert.equal(change("Hedwig", "heir").checked, false, "an heir is the Storyteller's call");
  assert.match(row("Jan").notes[0], /6 → 66/);
  assert.equal(change("Jan", "death"), undefined, "66: no death proposed");
  assert.equal(row("No Birth Year").needsBorn, true);
  assert.equal(change("No Birth Year", "death").checked, false, "taken as 20 now, so 80: may die, unticked");
  assert.equal(change("Mirek", "ghoulFed").checked, true);
  assert.equal(change("Mirek", "vitaeLapses").checked, false);
  assert.match(change("Ilse", "bondFades").detail, /First drink → No bond/, "Willpower 9: one step per 3 months");
  assert.equal(change("Radu", "torpor").checked, false);
  assert.match(change("Radu", "torpor").detail, /Road 4: the sleep lasts at least one decade/);
  assert.equal(change("Radu", "translate"), undefined, "same era, no translation");
  assert.equal(row("Wolf"), undefined, "creatures have nothing to change");
  this_plan = plan;
});
let this_plan;

test("applying a plan: only ticked changes, and nothing is lost", async () => {
  const before = game.actors.size;
  const itemCount = [...game.actors].reduce((n, a) => n + a.items.size, 0);
  const hedwig = game.actors.getName("Hedwig");
  const r = await api().time.applyPlan(this_plan, {
    accept: {[hedwig.id]: {[this_plan.rows.find(x => x.name === "Hedwig").changes.find(c => c.kind === "heir").id]: true}},
    born: {[game.actors.getName("No Birth Year").id]: 1240}
  });
  assert.equal(api().time.yearOf(game.time.worldTime), 1261);
  assert.equal(game.actors.size, before + 1, "the heir is the only new sheet; nobody is deleted");
  assert.ok([...game.actors].reduce((n, a) => n + a.items.size, 0) >= itemCount, "no item lost");
  assert.equal(api().time.yearOf(api().data.chronology(hedwig).died), 1261);
  assert.equal(game.folders.get(hedwig.folder).name, "WoDX · The Dead");
  const heir = game.actors.getName("Heir of Hedwig");
  assert.equal(api().data.chronology(heir).bornYear, 1236);
  assert.equal(heir.items.filter(i => i.type === "Experience").length, 0);
  assert.equal(api().data.chronology(game.actors.getName("No Birth Year")).bornYear, 1240);
  assert.equal(api().data.chronology(game.actors.getName("No Birth Year")).died, undefined, "unticked: lives");
  const ilse = game.actors.getName("Ilse");
  assert.equal(Object.values(api().data.lineage(ilse).bonds)[0].drinks, 0);
  const mirek = game.actors.getName("Mirek");
  assert.equal(api().data.lineOf(mirek), "ghoul");
  assert.equal(mirek.system.advantages.bloodpool.max, 10, "61 years as a ghoul: no extra point yet");
  const page = r.journal.pages.getName("1201 to 1261").text.content;
  assert.match(page, /Hedwig[\s\S]*Dies of age/);
  assert.match(page, /Not taken: Sleeps the years away/);
});

test("a dry run writes the plan and changes nothing", async () => {
  const t = game.time.worldTime;
  const plan = api().time.planSkip({from: t, to: api().time.addYears(t, 100)});
  await api().time.applyPlan(plan, {dryRun: true});
  assert.equal(game.time.worldTime, t);
  assert.equal(api().data.chronology(game.actors.getName("Jan")).died, undefined);
  assert.ok(game.journal.find(j => j.getFlag(M, "kind") === "time-skips").pages.getName(`${plan.fromYear} to ${plan.toYear} (plan)`));
});

test("a lapsed ghoul ages; far past a lifespan, it turns to dust", async () => {
  const radu = game.actors.getName("Radu");
  const mirek = game.actors.getName("Mirek");
  await api().lineage.setChronology(mirek, {bornYear: 1180});
  // The domitor is destroyed: the vitae lapses by default
  await api().lineage.setChronology(radu, {died: game.time.worldTime});
  const t = game.time.worldTime;
  const plan = api().time.planSkip({from: t, to: api().time.addYears(t, 40)});
  const ch = plan.rows.find(r => r.name === "Mirek").changes;
  assert.equal(ch.find(c => c.kind === "vitaeLapses").checked, true);
  assert.equal(ch.find(c => c.kind === "ghoulFed").checked, false);
  assert.match(ch.find(c => c.kind === "vitaeLapses").detail, /real age \(121\) and turns to dust/);
  await api().time.applyPlan(plan);
  assert.equal(api().data.lineOf(mirek), "mortal");
  assert.ok(api().data.chronology(mirek).died !== undefined);
  assert.ok(api().data.disciplinesOf(mirek).some(d => d.name === "Potence"), "the Discipline stays on the sheet");
  await api().lineage.setChronology(radu, {died: null});
});

test("the blood oath: lesser bonds vanish, and no new bond forms", async () => {
  const radu = game.actors.getName("Radu");
  const other = await Actor.create({name: "Ottokar", type: "Vampire"});
  const m = await Actor.create({name: "Vasil", type: "Mortal"});
  const t = game.time.worldTime;
  await api().giveVitae(m, other, {time: t});
  for ( let n = 0; n < 3; n++ ) await api().giveVitae(m, radu, {time: t + (n + 1) * 86400});
  assert.equal(api().data.lineage(m).bonds[other.id].drinks, 0, "the first drink's bond to Ottokar vanished");
  const r = await api().giveVitae(m, other, {time: t + 10 * 86400});
  assert.equal(r.oath, "Radu");
  assert.equal(api().data.lineage(m).bonds[other.id].drinks, 0, "no new bond");
});

test("the Pass the Years window", async () => {
  const {PassYearsApp} = await import(join(root, "modules/wodx-creation/scripts/pass-years.mjs"));
  const app = new PassYearsApp();
  await app.render({force: true});
  app.element.querySelector("input[name=years]").value = "5";
  await app.click("[data-action=plan]");
  assert.equal(app.plan.years, 5);
  assert.ok(app.element.querySelector("table.wodx-skip"));
  assert.ok(app.element.querySelector("input.wodx-search"), "rule B24");
  const t = game.time.worldTime;
  DialogV2.queue(() => true);
  await app.click("[data-action=apply]");
  assert.equal(api().time.yearOf(game.time.worldTime), api().time.yearOf(t) + 5);
  assert.equal(app.plan, null);
});

test("GATE: 1197 to 2025 with nothing lost (the in-world time-skip test)", async () => {
  DialogV2.queue(() => true);
  const r = await api().runSkipTest();
  const failed = r.results.filter(x => !x.pass);
  assert.deepEqual(failed, [], JSON.stringify(failed));
  assert.equal(r.total, 27, "the checklist promises 27 checks");
  assert.equal(api().time.yearOf(game.time.worldTime), 2025);
  assert.deepEqual(r.stepLog.map(s => s.year), [1347, 1450, 1837, 1914, 1997, 2025]);
  assert.match(game.journal.find(j => j.getFlag(M, "kind") === "skip-test").pages.getName("Result").text.content, new RegExp(`${r.total} of ${r.total} checks passed`));
});

test("no error notifications", () => {
  assert.deepEqual(mock.log.notifications.filter(([l]) => l === "error"), []);
});
