/**
 * Ways laid by the builder gate (WoDX Storyteller, B4810-B4813), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewaysbuild.mjs?${Date.now()}`)).run()
 * Makes three small scenes of its own (a lane, a square, a house), with an old Teleport Token exit each way between the
 * lane and the square, and deletes them all at the end. Works only in its own scenes.
 *   1. the api (layWays, takeBackWays) and the builder's "ways" step
 *   2. laying: each old exit gets a Way in the same region, to the other scene's arrival, and its teleport is off;
 *      the recipe's door is made from the lane to the house, locked as asked, with a Way back
 *   3. the network check is clean for the three
 *   4. laying again makes nothing new
 *   5. taking back leaves no Way in the three, and the old teleports are on again
 * Result: Data/wodx-gate/gatewaysbuild-result.json.
 */
const MOD = "wodx-storyteller";
const T = `${MOD}.way`;
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatewaysbuild-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const B = () => game.modules.get(MOD)?.api?.builder;
  const made = [];
  try {
    const mk = name => Scene.create({name: `WoDX gate: lay ${name}`, width: 1400, height: 1000, padding: 0, grid: {size: 100}, navigation: false});
    const lane = await mk("lane"); made.push(lane.id);
    const square = await mk("square"); made.push(square.id);
    const house = await mk("house"); made.push(house.id);
    const rect = (x, y) => [{type: "rectangle", x, y, width: 100, height: 100, rotation: 0, hole: false}];
    const [laneIn] = await lane.createEmbeddedDocuments("Region", [{name: "Arrive: from the square", shapes: rect(100, 100)}]);
    const [squareIn] = await square.createEmbeddedDocuments("Region", [{name: "Arrive: from the lane", shapes: rect(100, 100)}]);
    const tp = dest => [{type: "teleportToken", name: "Travel", system: {destinations: [dest.uuid], choice: true}}];
    const [laneOut] = await lane.createEmbeddedDocuments("Region", [{name: "Exit: to the square", shapes: rect(1200, 400), behaviors: tp(squareIn)}]);
    const [squareOut] = await square.createEmbeddedDocuments("Region", [{name: "Exit: to the lane", shapes: rect(0, 400), behaviors: tp(laneIn)}]);
    const recipe = {doors: [{inside: house.name, street: lane.name, shut: "locked"}]};
    const ways = s => all(s.regions).flatMap(r => all(r.behaviors).filter(b => b.type === T).map(b => ({region: r.id, ...b.system.toObject?.() ?? b.system})));
    let res = null;

    await step("1 api", async () => {
      ok("1 api", typeof B()?.layWays === "function" && typeof B()?.takeBackWays === "function" && B().plan().some(x => x.id === "ways"),
        {steps: B()?.plan?.().map(x => x.id)});
    });
    await step("2 lay", async () => {
      res = await B().layWays(recipe, [], {only: made});
      const lw = ways(lane), sw = ways(square), hw = ways(house);
      const exitWay = lw.find(w => w.region === laneOut.id), backWay = sw.find(w => w.region === squareOut.id);
      const door = lw.find(w => w.to === house.id);
      const off = [...laneOut.behaviors].find(b => b.type === "teleportToken")?.disabled;
      ok("2 lay", exitWay?.to === square.id && exitWay.arrive === squareIn.id && backWay?.to === lane.id && backWay.arrive === laneIn.id
        && off === true && door?.shut === "locked" && door.kind === "door" && hw.some(w => w.to === lane.id),
        {exitWay, backWay, door, teleportOff: off, house: hw, note: res.note});
    });
    await step("3 network", async () => {
      ok("3 network", !!res && !res.problems.length && !res.missing.length, {problems: res?.problems, missing: res?.missing});
    });
    await step("4 again", async () => {
      const n = res.made.length, count = ways(lane).length + ways(square).length + ways(house).length;
      const again = await B().layWays(recipe, res.made, {only: made});
      const count2 = ways(lane).length + ways(square).length + ways(house).length;
      ok("4 again", again.made.length === n && count2 === count, {made: [n, again.made.length], ways: [count, count2]});
      res = again;
    });
    await step("5 take back", async () => {
      const n = await B().takeBackWays(res.made);
      const left = ways(lane).length + ways(square).length + ways(house).length;
      const on = [laneOut, squareOut].every(r => [...r.behaviors].find(b => b.type === "teleportToken")?.disabled === false);
      ok("5 take back", n > 0 && left === 0 && on, {takenBack: n, left, teleportsOn: on});
    });
  } finally {
    for ( const id of made ) await game.scenes.get(id)?.delete();
  }
  return save(R);
}
