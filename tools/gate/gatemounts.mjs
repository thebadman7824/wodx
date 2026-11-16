/**
 * WoDX Paperdoll gate: mounts and vehicles as sprites (B4970), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemounts.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, a car tile, a cart tile, three actors and their tokens, and removes them; never moves
 * the clock.
 *   1. the list of looks is read, and every kind on the mount menu has looks
 *   2. a car tile shows a drawn car, one frame of its sheet at the people's scale, not its own icon
 *   3. the shape follows the year the Storyteller picks for it, and a picked colour repaints it
 *   4. it turns the way it goes: moved right it faces right, moved down it faces down
 *   5. the one at the wheel is drawn in the driver's seat with their own figure, cut off at the door, facing as the car faces
 *   6. a passenger sits in the next seat, not on top of the driver
 *   7. getting out puts each figure back on its own square, whole
 *   8. "keep its own picture" gives the tile its icon back
 *   9. the picker on the tile's buttons lists the shapes and the colours
 *  10. a creature marked as a horse (when WoDX Interactables rides beasts) shows a horse, and its rider sits astride
 *  11. a vehicle on its own sheet shows the shape of its kind, year and style in its sheet's paint, changes when the
 *      style changes, and seats its driver (B4977)
 * Result: Data/wodx-gate/gatemounts-result.json.
 */
/** A batch create does not keep its order (kit rule 1): match each made tile to its data by title. */
const byTitle = (docs, data) => data.map(d => docs.find(x => x.flags?.["wodx-interactables"]?.title === d.flags?.["wodx-interactables"]?.title));
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables", PD = "wodx-paperdoll";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;

export async function run() {
  const G = gate("gatemounts");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const M = game.modules.get(PD), A = M?.api?.sprites, MA = A?.mounts, MR = MA?.rules, ix = game.modules.get(IX)?.api;
    const scene = await G.scene();
    const g = canvas.grid.size, k = MR?.pixel?.(g) ?? 1;
    const [driver, pass, beast] = await G.make(Actor, [{name: "Gate Mounts Driver", type: "Mortal"}, {name: "Gate Mounts Passenger", type: "Mortal"}, {name: "Gate Mounts Steed", type: "Mortal"}]);
    const [td, tp, tb] = await G.tokens(scene, [{actor: driver, x: 2, y: 8}, {actor: pass, x: 3, y: 8}, {actor: beast, x: 12, y: 8}]);
    await waitFor(() => td?.object && tp?.object && tb?.object);
    const [car] = await scene.createEmbeddedDocuments("Tile", [{x: 4 * g, y: 3 * g, width: 2 * g, height: g, texture: {src: "icons/svg/wing.svg"}, flags: {[IX]: {mount: true, mountKind: "car", title: "Gate motor car"}}}]);
    await waitFor(() => car?.object?.mesh);

    await G.step("1. the looks are read", async () => {
      await waitFor(() => MA?.ready?.(), 15000);
      const kinds = Object.keys(ix?.rules?.MOUNTS ?? {}), bare = kinds.filter(x => !MR.looksOf(x).length);
      G.ok("1. the looks are read", MA?.ready?.() && kinds.length > 0 && !bare.length, {kinds: kinds.length, bare});
    });

    await G.step("2. a car tile shows a drawn car", async () => {
      await MA.setLook(car, {look: "1960-sedan", scheme: "red"});
      await waitFor(() => MA.showing(car)?.look === "1960-sedan", 15000);
      const s = MA.showing(car), look = MR.looksOf("car").find(l => l.id === "1960-sedan"), f = car.object.mesh.texture?.frame;
      G.ok("2. a car tile shows a drawn car", s?.kind === "car" && f?.width === look.w && f?.height === look.h && near(car.object.mesh.width, look.w * k) && near(car.object.mesh.height, look.h * k),
        {showing: s, frame: f ? {w: f.width, h: f.height} : null, mesh: {w: car.object.mesh.width, h: car.object.mesh.height}});
    });

    await G.step("3. year and colour", async () => {
      const y1 = MR.lookFor("car", 1925, {seed: car.id}), y2 = MR.lookFor("car", 1995, {seed: car.id});
      const before = car.object.mesh.texture;
      await MA.setLook(car, {look: "1960-sedan", scheme: "turquoise"});
      await waitFor(() => MA.showing(car)?.scheme === "turquoise" && car.object.mesh.texture !== before, 15000);
      const repainted = car.object.mesh.texture !== before && MA.showing(car)?.scheme === "turquoise";
      await MA.setLook(car, {});
      await waitFor(() => MA.showing(car) && MA.showing(car).look !== "1960-sedan" || MA.lookOf(car)?.look?.id === "1960-sedan", 15000);
      const byYear = MA.lookOf(car)?.look, year = MA.mountOf(car)?.year;
      G.ok("3. year and colour", y1.from === 1920 && y2.from === 1990 && repainted && byYear && byYear.from <= Math.max(year, 1900), {y1: y1.id, y2: y2.id, repainted, year, byYear: byYear?.id});
      await MA.setLook(car, {look: "1960-sedan", scheme: "red"});
      await waitFor(() => MA.showing(car)?.look === "1960-sedan" && MA.showing(car)?.scheme === "red", 15000);
    });

    await G.step("4. it turns the way it goes", async () => {
      // A car tile starts facing right, so the move is waited out before the next one: a move down begun while the
      // first is still sliding is diagonal, and a diagonal keeps the old facing.
      const settled = () => waitFor(() => Math.abs((car.object?.x ?? 0) - car.x) < 1 && Math.abs((car.object?.y ?? 0) - car.y) < 1, 5000);
      await car.update({x: car.x + g});
      await settled();
      await waitFor(() => MA.facing(car) === "right", 5000);
      const right = MA.facing(car), fr = car.object.mesh.texture?.frame?.y;
      await car.update({y: car.y + g});
      await settled();
      await waitFor(() => MA.facing(car) === "down", 5000);
      const down = MA.facing(car), fd = car.object.mesh.texture?.frame?.y;
      const look = MR.looksOf("car").find(l => l.id === "1960-sedan");
      G.ok("4. it turns the way it goes", right === "right" && down === "down" && fr === 3 * look.h && fd === 2 * look.h, {right, down, rows: [fr, fd]});
      await car.update({x: car.x + g});
      await settled();
      await waitFor(() => MA.facing(car) === "right", 5000);
    });

    const name = Object.keys(A.rules.SHEETS).find(n => !A.rules.isOwn?.(n));
    await G.step("5. the driver is drawn at the wheel", async () => {
      await A.give(td, name); await A.give(tp, name);
      await car.update({[`flags.${IX}.driver`]: {a: driver.id, t: td.uuid, n: driver.name, dx: 0, dy: 0}});
      await waitFor(() => MA.showing(td)?.on === car.uuid, 8000);
      await waitFor(() => td.object.mesh.texture?.frame?.y === 3 * 112 && td.object.mesh.texture.frame.height < 112, 8000);
      const s = MA.showing(td), seat = MA.seats(car, "right")[0], m = td.object.mesh, own = {x: td.object.center.x, y: td.object.center.y};
      const feetY = m.position.y + (103 - 0.745 * 112) * k;
      G.ok("5. the driver is drawn at the wheel", s && !s.hidden && s.facing === "right" && near(m.position.x, seat.x) && near(feetY, seat.y) && m.texture?.frame?.height === s.rows && s.rows < 112
        && m.texture.frame.y === 3 * 112 && Math.hypot(m.position.x - own.x, m.position.y - own.y) > g,
        {showing: s, seat, mesh: {x: m.position.x, y: m.position.y, rows: m.texture?.frame?.height, row: m.texture?.frame?.y}, own});
    });

    await G.step("6. a passenger takes the next seat", async () => {
      await car.update({[`flags.${IX}.riders`]: [{a: pass.id, t: tp.uuid, n: pass.name, dx: 0, dy: 0}]});
      await waitFor(() => MA.showing(tp)?.on === car.uuid, 8000);
      await sleep(300);
      const a = MA.showing(td), b = MA.showing(tp), seats = MA.seats(car, "right");
      G.ok("6. a passenger takes the next seat", b?.seat === 1 && near(tp.object.mesh.position.x, seats[1].x) && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 2, {driver: a, passenger: b});
    });

    await G.step("7. getting out puts them back", async () => {
      await car.update({[`flags.${IX}.driver`]: null, [`flags.${IX}.riders`]: []});
      await waitFor(() => !MA.showing(td) && !MA.showing(tp), 8000);
      await sleep(600);
      const m = td.object.mesh, c = td.object.center;
      G.ok("7. getting out puts them back", !MA.showing(td) && near(m.position.x, c.x, 3) && m.texture?.frame?.height === 112 && near(m.anchor.y, 0.745, 0.01) && m.alpha > 0.9,
        {mesh: {x: m.position.x, y: m.position.y, rows: m.texture?.frame?.height, anchor: m.anchor.y, alpha: m.alpha}, centre: c});
    });

    await G.step("8. keep its own picture", async () => {
      await MA.setLook(car, {off: true});
      await waitFor(() => !MA.showing(car), 8000);
      await sleep(600);
      const src = car.object.mesh?.texture?.baseTexture?.resource?.src ?? car.object.mesh?.texture?.source?.resource?.src ?? car.object.texture?.baseTexture?.resource?.src ?? "";
      const look = MR.looksOf("car").find(l => l.id === "1960-sedan"), f = car.object.mesh?.texture?.frame;
      G.ok("8. keep its own picture", !MA.showing(car) && !(f?.width === look.w && f?.height === look.h) , {src: String(src).slice(-40), frame: f ? {w: f.width, h: f.height} : null});
      await MA.setLook(car, {});
    });

    await G.step("9. the picker lists shapes and colours", async () => {
      void MA.pick(car);
      await waitFor(() => document.querySelector("#wodx-mount-look"), 8000);
      const looks = [...document.querySelectorAll("#wodx-mount-look option")].map(o => o.value), schemes = [...document.querySelectorAll("#wodx-mount-scheme option")].map(o => o.value);
      const dlg = document.querySelector("#wodx-mount-look")?.closest(".application, dialog");
      const all = MR.looksOf("car").every(l => looks.includes(l.id));
      dlg?.querySelector('[data-action="cancel"]')?.click();
      await sleep(300);
      G.ok("9. the picker lists shapes and colours", all && looks.includes("") && schemes.length >= 4, {looks: looks.length, schemes: schemes.length});
    });

    await G.step("10. a ridden beast", async () => {
      if ( typeof ix?.beastOf !== "function" ) return G.ok("10. a ridden beast", true, {skipped: "this WoDX Interactables does not ride beasts on their own tokens yet"});
      await tb.update({[`flags.${IX}.mountable`]: "horse"});
      await waitFor(() => MA.showing(tb)?.kind === "horse", 15000);
      const s = MA.showing(tb);
      await tb.update({[`flags.${IX}.driver`]: {a: driver.id, t: td.uuid, n: driver.name, dx: 0, dy: 0}});
      await waitFor(() => MA.showing(td)?.on === tb.uuid, 8000);
      const r = MA.showing(td);
      G.ok("10. a ridden beast", s?.kind === "horse" && r?.pose === "ride" && !r.hidden && r.y < tb.object.center.y, {beast: s, rider: r});
      await tb.update({[`flags.${IX}.driver`]: null});
    });

    await G.step("11. a vehicle on its own sheet", async () => {
      const VT = ix?.vehicles?.rules?.VEHICLE_TYPE;
      if ( !VT ) return G.ok("11. a vehicle on its own sheet", true, {skipped: "this WoDX Interactables has no vehicle sheets yet"});
      const [veh] = await G.make(Actor, [{name: "Gate Mounts Motor", type: VT, system: {kind: "car", built: 1995, colour: "red", style: "rugged"}}]);
      const [tv] = await G.tokens(scene, [{actor: veh, x: 8, y: 12}]);
      await waitFor(() => tv?.object?.mesh);
      await waitFor(() => MA.showing(tv)?.look === "1990-fourbyfour", 15000);
      const a = MA.showing(tv), look = MR.looksOf("car").find(l => l.id === "1990-fourbyfour"), f = tv.object.mesh.texture?.frame;
      await veh.update({"system.style": "taxi", "system.colour": ""});
      await waitFor(() => MA.showing(tv) && MA.showing(tv).look !== "1990-fourbyfour", 15000);
      const b = MA.showing(tv);
      await veh.update({"system.style": "worn"});
      await waitFor(() => MA.showing(tv)?.scheme === "rust", 15000);
      const c = MA.showing(tv);
      await tv.update({[`flags.${IX}.driver`]: {a: driver.id, t: td.uuid, n: driver.name, dx: 0, dy: 0}});
      await waitFor(() => MA.showing(td)?.on === tv.uuid, 8000);
      const r = MA.showing(td);
      G.ok("11. a vehicle on its own sheet", a?.kind === "car" && a.scheme === "red" && f?.width === look.w && f?.height === look.h && b?.look === "1990-sedan" && c?.scheme === "rust" && r?.pose === "sit" && !r.hidden,
        {rugged: a, frame: f ? {w: f.width, h: f.height} : null, taxi: b, worn: c, driver: r});
      await tv.update({[`flags.${IX}.driver`]: null});
    });

    await G.step("12. snow and rail: a sleigh, a snow machine, a train and a tram are drawn (B6073)", async () => {
      if ( !MR.looksOf("train").length ) return G.ok("12. snow and rail: a sleigh, a snow machine, a train and a tram are drawn (B6073)", true, {skipped: "no train looks in this WoDX Paperdoll"});
      const want = [["sled", "1600-troika"], ["snowmobile", "1960-snowmobile"], ["train", "1900-express"], ["tram", "1895-electric"]];
      const tileData = want.map(([kind], i) => ({x: (2 + i * 6) * g, y: 14 * g, width: 2 * g, height: g, texture: {src: "icons/svg/wing.svg"},
        flags: {[IX]: {mount: true, mountKind: kind, title: `Gate ${kind}`}}}));
      const tiles = byTitle(await scene.createEmbeddedDocuments("Tile", tileData), tileData);
      const got = [];
      for ( const [i, tile] of tiles.entries() ) {
        const [kind, id] = want[i];
        await waitFor(() => tile?.object?.mesh, 10000);
        await MA.setLook(tile, {look: id});
        await waitFor(() => MA.showing(tile)?.look === id, 20000);
        const look = MR.looksOf(kind).find(l => l.id === id), f = tile.object.mesh.texture?.frame;
        got.push({kind, look: MA.showing(tile)?.look, frame: f ? [f.width, f.height] : null, want: look ? [look.w, look.h] : null, mesh: near(tile.object.mesh.width, (look?.w ?? 0) * k, 3)});
      }
      // the driver takes the train's footplate and shows in the cab
      const [, , train] = tiles;
      await train.update({[`flags.${IX}.driver`]: {a: driver.id, t: td.uuid, n: driver.name, dx: 0, dy: 0}});
      await waitFor(() => MA.showing(td)?.on === train.uuid, 8000);
      const r = MA.showing(td);
      await train.update({[`flags.${IX}.driver`]: null});
      const fig = ix?.vehicles?.rules?.figures?.({kind: "train", built: 1910});
      G.ok("12. snow and rail: a sleigh, a snow machine, a train and a tram are drawn (B6073)",
        got.every(x => x.look && x.frame && x.want && x.frame[0] === x.want[0] && x.frame[1] === x.want[1] && x.mesh) && r && !r.hidden && (!fig || fig.chart?.maneuver === 1),
        {got, driver: r, figures: fig ? {label: fig.label, chart: fig.chart, body: fig.body} : null});
    }, {timeout: 150000}); // four looks drawn one after another, each may wait up to 30 s
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
