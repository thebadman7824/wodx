/**
 * Dates as each land tells them (B5870 to B5873), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelanddates.mjs?${Date.now()}`)).run()
 * Makes one scratch scene and moves it between lands by its region; removes it after. The clock does not move.
 *   1. the rules answer: a Cairo date in 1197 is told by the Hijra, a Moravian one by Our Lord
 *   2. a scene in Egypt keeps the Muslim year and the clock's words carry the Hijra
 *   3. a scene in China tells the year by its animal; a scene in Moravia names no Hijra and no animal
 *   4. the Storyteller's Chronicle Clock shows "Players hear" with the scene's own count
 *   5. the opening card over the map tells the date in the scene's count
 *   6. every other WoDX module still answers
 *   7. (B5874) Persia from 1925 tells the solar Hijra year
 *   8. (B5875) a character keeps its own people's count, or the player's pick, over the land's
 * Result: Data/wodx-gate/gatelanddates-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gatelanddates");
  const MOD = "wodx-chronicle";
  const chron = () => game.modules.get(MOD)?.api;
  let ruleBefore = null, cardBefore = null;
  try {
    const R = await import(`/modules/${MOD}/scripts/reckoning-rules.mjs`);
    const L = await import(`/modules/${MOD}/scripts/local-reckoning-rules.mjs`);
    const {describeTime} = await import(`/modules/${MOD}/scripts/calendar.mjs`);
    const lat = () => game.settings.get(MOD, "latitude");
    try { ruleBefore = game.settings.get(MOD, "rule.eraReckoning"); await game.settings.set(MOD, "rule.eraReckoning", true); } catch (e) { G.R.notes.push(`rule: ${e.message}`); }
    try { cardBefore = game.settings.get("wodx-atmosphere", "openingCard"); await game.settings.set("wodx-atmosphere", "openingCard", true); } catch (e) { cardBefore = null; }
    const scene = await G.scene({name: "WoDX gate: land dates"});
    const now = () => describeTime(game.time.worldTime, lat());
    const at = async region => {
      await scene.update({"flags.wodx-chronicle.place.region": region});
      await waitFor(() => scene.flags?.["wodx-chronicle"]?.place?.region === region, 5000);
      const ch = chron().church.on(now(), {scene});
      return {ch, told: R.reckon(now(), {church: ch, latitude: lat()})};
    };

    await G.step("1. the rules answer", async () => {
      const d = {year: 1197, month: 3, day: 12, hour: 12, minute: 0, weekday: "Wednesday", monthName: "March", sunrise: "06:10", sunset: "17:55", calendar: "julian"};
      const cairo = R.reckon(d, {faith: "islamic", region: "egypt"}), brno = R.reckon(d, {faith: "western", region: "moravia"});
      G.ok("1. the rules answer", /593 of the Hijra/.test(cairo.date) && cairo.time === "the noon prayer" && /Our Lord 1197/.test(brno.date)
        && typeof L.landDate === "function", {cairo, brno});
    });
    await G.step("2. a scene in Egypt keeps the Muslim year", async () => {
      const {ch, told} = await at("egypt");
      G.ok("2. a scene in Egypt keeps the Muslim year", ch.faith === "islamic" && ch.region === "egypt" && /of the Hijra/.test(told.date),
        {faith: ch.faith, region: ch.region, told});
    });
    await G.step("3. China by its animal, Moravia by neither", async () => {
      const cn = await at("china"), mo = await at("moravia");
      const year = now().year;
      const china = cn.ch.faith === "chinese" && (/the year of the (Rat|Ox|Tiger|Rabbit|Dragon|Snake|Horse|Goat|Monkey|Rooster|Dog|Pig)/.test(cn.told.date)
        || (year >= 1912 && year < 1949 && /year of the Republic/.test(cn.told.date)) || cn.told.style === "digital");
      const moravia = !/Hijra|the year of the (Rat|Snake)/.test(mo.told.date);
      G.ok("3. China by its animal, Moravia by neither", china && moravia, {year, china: cn.told, moravia: mo.told});
    });
    await G.step("4. the Storyteller's clock shows what players hear", async () => {
      await at("egypt");
      const {ClockApp} = await import(`/modules/${MOD}/scripts/clock-app.mjs`);
      await ClockApp.open();
      let line = "";
      await waitFor(() => { line = document.querySelector("#wodx-clock .wodx-heard")?.textContent ?? ""; return /Hijra/.test(line) || now().year >= 9999; }, 8000).catch(() => null);
      G.ok("4. the Storyteller's clock shows what players hear", /^Players hear: .*of the Hijra/.test(line.trim()), {line});
      try { await foundry.applications.instances?.get?.("wodx-clock")?.close?.(); } catch (e) { /* closed */ }
    });
    await G.step("5. the opening card tells the scene's count", async () => {
      await at("egypt");
      const show = game.modules.get("wodx-atmosphere")?.api?.opening?.show;
      let text = "";
      if ( typeof show === "function" ) {
        show(scene);
        await waitFor(() => { text = document.getElementById("watmo-opening")?.textContent ?? ""; return /Hijra/.test(text); }, 8000).catch(() => null);
      }
      G.ok("5. the opening card tells the scene's count", /of the Hijra/.test(text), {text, atmosphere: game.modules.get("wodx-atmosphere")?.version});
      document.getElementById("watmo-opening")?.remove();
    });
    await G.step("7. Persia by the solar Hijra from 1925", async () => {
      const d = {year: 1950, month: 3, day: 12, hour: 12, minute: 0, weekday: "Sunday", monthName: "March", sunrise: "06:10", sunset: "17:55", calendar: "gregorian"};
      const old = {...d, year: 1900, weekday: "Monday"};
      const a = R.reckon(d, {faith: "islamic", region: "persia"}), b = R.reckon(old, {faith: "islamic", region: "persia"});
      G.ok("7. Persia by the solar Hijra from 1925", /1328 of the solar Hijra/.test(a.date) && /of the Hijra$/.test(b.date) && !/solar/.test(b.date), {a, b});
    });
    await G.step("8. a character keeps its own people's count", async () => {
      const [pc] = await G.make(Actor, [{name: "WoDX gate: land dates traveller", type: "Mortal",
        flags: {"wodx-creation": {lifepath: {path: {picks: {people: "jewish"}}}}}}]);
      const byPeople = L.countOf(pc.flags?.[MOD] ?? {}, pc.flags?.["wodx-creation"]?.lifepath, "islamic");
      await pc.setFlag(MOD, "reckonFaith", "chinese");
      const byPick = L.countOf(pc.flags?.[MOD] ?? {}, pc.flags?.["wodx-creation"]?.lifepath, "islamic");
      const told = R.reckon(now(), {church: {faith: "islamic", region: "egypt", day: null}, faith: byPick.faith, region: "egypt"});
      G.ok("8. a character keeps its own people's count", byPeople.faith === "jewish" && byPick.faith === "chinese" && !/Hijra/.test(told.date),
        {byPeople, byPick, told});
    });
    await G.step("6. every other WoDX module still answers", async () => {
      const ids = [...game.modules].filter(m => m.id.startsWith("wodx-") && m.active).map(m => m.id);
      const quiet = ids.filter(id => !game.modules.get(id)?.api && !["wodx-voices"].includes(id));
      G.ok("6. every other WoDX module still answers", ids.length > 5 && !quiet.length, {ids, quiet});
    });
  } finally {
    try { if ( ruleBefore !== null ) await game.settings.set(MOD, "rule.eraReckoning", ruleBefore); } catch (e) { /* kept */ }
    try { if ( cardBefore !== null ) await game.settings.set("wodx-atmosphere", "openingCard", cardBefore); } catch (e) { /* kept */ }
    return G.finish();
  }
}
