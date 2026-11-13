/**
 * Feast and fast days gate (WoDX Chronicle 0.6.0, WoDX NPC 0.5.1, WoDX Senses 0.2.1), in Foundry, in rothenstein-wodx
 * only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatechurch.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It holds the world (WoDX Chronicle's Hold the world) so moving the clock wakes no routine or faction turn, and puts
 * back the clock, the hold and the house rule at the end.
 *   1. the modules: Chronicle 0.6.0 or later with the church API, NPC 0.5.1 or later, the "Feast and fast days" rule
 *   2. Christmas Eve 1300 is a night of revel: busy, the curfew at midnight, hunting 1 easier
 *   3. a weekday in Lent 1300 is a strict fast: quiet, hunting 1 harder
 *   4. the Chronicle Clock shows the church year
 *   5. WoDX NPC's hunting: the same place is 1 easier on Christmas Eve and 1 harder in Lent than on a plain Tuesday
 *   6. Easter 1300 and Good Friday are found (Julian), and Easter 1700 by the Gregorian reckoning in Bohemia
 *   7. with the house rule off the day is still shown but changes nothing
 *   8. put everything back
 * Result: Data/wodx-gate/gatechurch-result.json.
 */
const M = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => !foundry.utils.isNewerVersion(b, a);

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) {
    ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"});
    return save(R, "gatechurch-result.json");
  }
  const api = game.modules.get(M)?.api;
  const npc = game.modules.get("wodx-npc");
  const t0 = game.time.worldTime;
  const saved = {held: !!api?.isHeld?.(), rule: game.settings.get(M, "rule.feastFast")};
  const {getEngine} = await import(`/modules/${M}/scripts/calendar.mjs`);
  const at = (y, m, d, h = 22) => getEngine().dateToTime({year: y, month: m, day: d, hour: h});
  try {
    const mod = game.modules.get(M);
    ok("1. modules", mod?.active && newer(mod.version, "0.6.0") && !!api?.church?.today && npc?.active && newer(npc.version, "0.5.1")
      && game.settings.settings.has(`${M}.rule.feastFast`), {chronicle: mod?.version, npc: npc?.version});
    await api.hold(true);
    await game.settings.set(M, "rule.feastFast", true);

    await game.time.set(at(1300, 12, 24)); await sleep(400);
    const xmas = api.church.today();
    ok("2. Christmas Eve 1300", xmas.active && xmas.revel && xmas.crowd === "busy" && xmas.curfewStart === 24 && xmas.huntStep === -1 && /Christmas Eve/.test(xmas.label),
      {label: xmas.label, crowd: xmas.crowd});

    await game.time.set(at(1300, 3, 15)); await sleep(400);
    const lent = api.church.today();
    ok("3. Lent 1300", lent.season === "Lent" && lent.crowd === "quiet" && lent.huntStep === 1, {label: lent.label, fast: lent.fast});

    await api.openClock(); await sleep(600);
    const clock = [...foundry.applications.instances.values()].find(a => a.rendered && a.constructor?.name === "ClockApp");
    const text = clock?.element?.textContent ?? "";
    ok("4. clock row", /Church year/.test(text) && /Lent/.test(text), {found: !!clock});
    await clock?.close();

    const actor = game.actors.find(a => a.type === "Vampire") ?? game.actors.contents[0];
    const place = "gate-church-place";
    const hunt = () => npc.api.huntingFor(actor, place);
    // At 20:00, before the curfew bell (from NPC 0.54.0 the curfew adds its own named step at night, B2711)
    await game.time.set(at(1300, 3, 15, 20)); await sleep(400);
    const inLent = hunt();
    await game.time.set(at(1300, 7, 6, 20)); await sleep(400); // a plain weekday in ordinary time
    const plain = hunt();
    await game.time.set(at(1300, 12, 24, 20)); await sleep(400);
    const revel = hunt();
    ok("5. hunting", !!actor && revel.difficulty === plain.difficulty - 1 && inLent.difficulty === plain.difficulty + 1,
      {actor: actor?.name, plain: plain.difficulty, revel: revel.difficulty, lent: inLent.difficulty});

    const C = api.church.rules;
    const e1300 = getEngine().timeToDate(at(1300, 4, 10)), easter1300 = C.easterJDN(1300, "julian");
    const e1700 = C.easterJDN(1700, "gregorian");
    const d1700 = getEngine().timeToDate(at(1700, 4, 11));
    ok("6. Easter", e1300.jdn === easter1300 && api.church.at(at(1300, 4, 8)).feast === "Good Friday" && d1700.calendar === "gregorian" && d1700.jdn === e1700,
      {jdn1300: e1300.jdn, easter1300, cal1700: d1700.calendar, jdn1700: d1700.jdn, easter1700: e1700});

    await game.settings.set(M, "rule.feastFast", false); await sleep(300);
    const offDay = api.church.today();
    const offHunt = hunt();
    ok("7. rule off", !offDay.active && offDay.revel && offHunt.difficulty === plain.difficulty, {difficulty: offHunt.difficulty});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    await game.settings.set(M, "rule.feastFast", saved.rule);
    await game.time.set(t0); await sleep(400);
    await api?.hold?.(saved.held);
    ok("8. put back", game.time.worldTime === t0 && !!api?.isHeld?.() === saved.held && game.settings.get(M, "rule.feastFast") === saved.rule);
  }
  return save(R, "gatechurch-result.json");
}
