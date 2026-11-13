/**
 * Bring forward gate (WoDX Sheets 0.17.0, Interactables 0.37.0; B2720, B2721), in rothenstein-wodx (the testing
 * world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebringforward.mjs?${Date.now()}`)).run()
 * Makes one hidden scene with a motor car, a telephone, fire sprinklers, a chest with a keypad and banknotes, and a
 * kept motorcycle, reads them for 1300, brings them forward, undoes it, brings one row, then all of it to 2020, and
 * deletes the scene and its cards. The clock is not moved.
 *   1. the api has bringForward and undoForward, and Interactables' rules have bringForward
 *   2. the card for 1300 has one Bring forward button and one on each row
 *   3. Bring forward in 1300: car to carriage, telephone to bell, keypad to a lock of its grade, banknotes to coins of
 *      1300 with their count; the kept motorcycle and the sprinklers stay; the result card names the sprinklers
 *   4. after it only the sprinklers are out of their time
 *   5. Undo puts every flag back
 *   6. one row alone changes only that thing
 *   7. to 2020: the carriage is a motor car again, nothing else moves
 *   8. a Bring forward card's buttons work when pressed (the render hook is wired)
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatebringforward-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const MOD = "wodx-sheets", IX = "wodx-interactables";
  const api = () => game.modules.get(MOD)?.api?.anachronism;
  const time = game.time.worldTime;
  let scene = null;
  const msgs = [];
  const keep = m => { if ( m ) msgs.push(m); return m; };
  const then = {era: "dark-ages", year: 1300}, later = {era: "modern", year: 2020};
  const f = id => scene.tiles.get(id)?.flags?.[IX] ?? {};
  try {
    scene = await Scene.create({name: "WoDX gate: Bring forward", width: 1000, height: 1000, navigation: false});
    const at = {x: 0, y: 0, width: 100, height: 100, hidden: true, texture: {src: null}};
    const tiles = await scene.createEmbeddedDocuments("Tile", [
      {...at, flags: {[IX]: {mount: true, mountKind: "car", title: "Motor car"}}},
      {...at, flags: {[IX]: {watch: true, watchKind: "phone"}}},
      {...at, flags: {[IX]: {watch: true, watchKind: "sprinkler"}}},
      {...at, flags: {[IX]: {container: true, kind: "chest", electronic: "excellent", items: "a banknote (4)\nBread"}}},
      {...at, flags: {[IX]: {mount: true, mountKind: "motorbike"}, [MOD]: {keepOutOfEra: true}}}]);
    const [car, phone, sprink, chest, bike] = tiles.map(t => t.id);
    const rowsFor = async (after, before = {}) => api().scanMaps(before, after, [scene]);
    await step("api", async () => {
      ok("api", typeof api()?.bringForward === "function" && typeof api()?.undoForward === "function" && typeof game.modules.get(IX)?.api?.rules?.bringForward === "function");
    });
    await step("the card", async () => {
      const rows = await rowsFor(then);
      const m = keep(await api().report({}, then, [], {maps: rows, all: true}));
      const all = (m?.content.match(/data-wodx-bring-forward/g) ?? []).length, each = (m?.content.match(/data-wodx-forward-map=/g) ?? []).length;
      ok("the card", all === 1 && each === rows.length && rows.length === 5, {all, each, rows: rows.map(r => r.key)});
    });
    let undo = null;
    await step("bring forward", async () => {
      const m = keep(await api().bringForward(await rowsFor(then), then));
      undo = m?.flags?.[MOD]?.broughtForward?.undo ?? null;
      const got = {car: f(car).mountKind, title: f(car).title, phone: f(phone).watchKind, sprink: f(sprink).watchKind, lock: f(chest).lock, electronic: f(chest).electronic, items: f(chest).items, bike: f(bike).mountKind};
      const coins = /^\S.* \(4\)\nBread$/.test(got.items ?? "") && !/banknote/.test(got.items);
      ok("bring forward", got.car === "carriage" && got.title === "" && got.phone === "bell" && got.sprink === "sprinkler" && got.lock === "excellent" && got.electronic === "none" && coins && got.bike === "motorbike" && /Fire sprinklers/.test(m?.content ?? ""), got);
    });
    await step("after", async () => {
      const left = (await rowsFor(then)).map(r => r.key);
      ok("after", left.length === 1 && left[0] === "watch" , {left});
    });
    await step("undo", async () => {
      const n = await api().undoForward(undo);
      const got = {car: f(car).mountKind, title: f(car).title, phone: f(phone).watchKind, electronic: f(chest).electronic, items: f(chest).items};
      ok("undo", n === 3 && got.car === "car" && got.title === "Motor car" && got.phone === "phone" && got.electronic === "excellent" && got.items === "a banknote (4)\nBread", {n, ...got});
    });
    await step("one row", async () => {
      keep(await api().bringForward([{scene: scene.id, id: car, wall: false, key: "mount"}], then));
      ok("one row", f(car).mountKind === "carriage" && f(phone).watchKind === "phone" && f(chest).electronic === "excellent", {car: f(car).mountKind, phone: f(phone).watchKind});
    });
    await step("to 2020", async () => {
      const m = keep(await api().bringForward(await rowsFor(later), later));
      ok("to 2020", f(car).mountKind === "car" && f(phone).watchKind === "phone" && f(bike).mountKind === "motorbike" && /Brought to 2020/.test(m?.content ?? ""), {car: f(car).mountKind});
    });
    await step("buttons", async () => {
      const m = keep(await api().bringForward([{scene: scene.id, id: phone, wall: false, key: "watch"}], then));
      const msg = game.messages.get(m?.id);
      const el = document.createElement("div");
      el.innerHTML = msg?.content ?? "";
      Hooks.callAll("renderChatMessageHTML", msg, el, {});
      const b = el.querySelector("[data-wodx-forward-undo]");
      b?.click();
      for ( let i = 0; i < 20 && f(phone).watchKind !== "phone"; i++ ) await new Promise(r => setTimeout(r, 100));
      ok("buttons", !!b && f(phone).watchKind === "phone", {phone: f(phone).watchKind, text: b?.textContent});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const m of msgs ) { const d = game.messages.get(m.id); if ( d ) await d.delete(); }
      if ( scene ) await scene.delete();
      R.clockKept = game.time.worldTime === time;
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatebringforward-result.json");
}
