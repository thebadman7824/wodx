/**
 * The Storyteller presses "Make them" in a town's Residents window, and once the clock moves on the households stand
 * on the map in their own buildings (npc.residents), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemakeresidents.mjs?${Date.now()}`)).run()
 * It makes its own scene with two buildings carrying households as an adopted town map leaves them, removes the
 * residents, their folder and the scene, puts the Storyteller log back, and the kit puts the clock back.
 *   1. Make them in the Residents window, then three hours of world time with the scene's routines on Auto: each
 *      resident whose hour puts them in one of these buildings is a token on the canvas inside it
 * Result: Data/wodx-gate/gatemakeresidents-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const HOUSES = [
  {id: "gmr-cottage-1", label: "Gate Residents Cottage", kind: "home", rect: [100, 100, 400, 300], hh: {id: "gmr-cottage-1-household", label: "Cottage household", trade: "weaver",
    people: ["weaver", "partner"].map(role => ({role}))}},
  {id: "gmr-smithy-2", label: "Gate Residents Smithy", kind: "workplace", rect: [700, 100, 400, 300], hh: {id: "gmr-smithy-2-household", label: "Smithy household", trade: "smith",
    people: ["smith", "apprentice"].map(role => ({role}))}}
];

export async function run() {
  const G = gate("gatemakeresidents", {stepTimeout: 360000}); // making sheets in a big world can take minutes
  const since = Date.now();
  // the clock writes WoDX Chronicle's night's work journal; it is put back as it was, after the clock is
  const nightKey = "wodx-chronicle.nightWork", stored = () => game.settings.storage.get("world").getSetting?.(nightKey) ?? null;
  const nightBefore = stored()?.toObject?.() ?? null;
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const X = game.modules.get(MOD).api.residents;
  let sc = null;
  const residents = () => game.actors.filter(a => a.flags?.[MOD]?.resident?.scene === sc?.uuid);
  try {
    await G.step("1. Make them, then the clock: the residents stand in their buildings on the canvas", async () => {
      sc = await G.scene({width: 1300, height: 900});
      await sc.createEmbeddedDocuments("Region", HOUSES.map(h => ({name: h.label,
        shapes: [{type: "rectangle", x: h.rect[0], y: h.rect[1], width: h.rect[2], height: h.rect[3], rotation: 0, hole: false}],
        flags: {"wodx-interactables": {adoptId: h.id, household: h.hh}, [MOD]: {place: {kind: h.kind}}}})));
      await sc.setFlag(MOD, "routineMode", "auto");
      // the Storyteller's hand opens the window (setup); the trigger is its Make them button
      const shown = X.open(sc);
      const btn = () => [...document.querySelectorAll(".wodx-npc-dialog button[data-action='make']")].find(b => b.closest(".application")?.querySelector(".wnpc-res-list")) ?? null;
      await waitFor(btn, 60000);
      const pressed = !!btn();
      btn()?.click();
      await Promise.race([shown, new Promise(r => setTimeout(r, 240000))]);
      await waitFor(() => residents().length === 4, 60000);
      const made = residents().map(a => a.id);
      // the clock: three hours on, the routines place everyone where their hour says
      await game.time.advance(3 * 3600);
      const here = new Set(sc.regions.contents.map(r => r.uuid));
      const placeOf = id => game.actors.get(id)?.flags?.[MOD]?.where?.place;
      const due = () => made.filter(id => here.has(placeOf(id)));
      const tokOn = id => canvas.tokens.placeables.find(t => t.document.actorId === id) ?? null;
      const inside = () => due().filter(id => { const t = tokOn(id); return !!t && [...(t.document.regions ?? [])].some(r => r.uuid === placeOf(id)); });
      await waitFor(() => due().length > 0 && inside().length === due().length, 60000);
      const name = id => game.actors.get(id)?.name ?? id;
      G.ok("1. Make them, then the clock: the residents stand in their buildings on the canvas",
        pressed && made.length === 4 && due().length > 0 && inside().length === due().length,
        {pressed, made: made.map(name), due: due().map(name), inside: inside().map(name), tokens: canvas.tokens.placeables.length});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { if ( sc ) await X.remove(sc); } catch (e) { G.R.notes.push(`remove: ${e?.message ?? e}`); }
    for ( const a of residents() ) { try { await a.delete(); } catch (e) { /* gone */ } }
    try {
      const f = game.folders.find(x => x.type === "Actor" && x.getFlag(MOD, "residents") === sc?.uuid);
      if ( f ) await f.delete();
      const parent = game.folders.find(x => x.type === "Actor" && x.name === "WoDX residents" && !x.folder);
      if ( parent && !parent.children?.length && !parent.contents?.length ) await parent.delete();
    } catch (e) { G.R.notes.push(`folder: ${e?.message ?? e}`); }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Residents/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    const out = await G.finish();
    await new Promise(r => setTimeout(r, 3000));
    try {
      const now = stored();
      if ( !nightBefore && now ) await now.delete();
      else if ( nightBefore && now && JSON.stringify(now.value) !== JSON.stringify(nightBefore.value) ) await now.update({value: nightBefore.value});
      else if ( nightBefore && !now ) await game.settings.storage.get("world").documentClass.create(nightBefore);
    } catch (e) { /* the lane's own pass puts it back */ }
    return out;
  }
}
