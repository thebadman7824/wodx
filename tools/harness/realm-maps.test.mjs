/* WoDX Otherworlds 0.8.0: realm maps. The rules for every realm in every era, then drawing, sending and bringing
 * back in Foundry against small stand-ins. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as RM from "../../modules/wodx-otherworlds/scripts/realm-maps-rules.mjs";

const YEARS = [1197, 1348, 1500, 1700, 1916, 1945, 1969, 1999, 2010, 2050, 2095];
const centre = r => r.at ?? {x: r.rect[0] + Math.floor(r.rect[2] / 2), y: r.rect[1] + Math.floor(r.rect[3] / 2)};

test("the catalogue: every realm has a known layout, a line, colours, ways in, sources and eras in year order", () => {
  assert.ok(RM.REALM_ORDER.length >= 30);
  for ( const id of RM.REALM_ORDER ) {
    const R = RM.REALMS[id];
    assert.ok(RM.SHAPES[R.shape], `${id} shape`);
    assert.ok(RM.LINES.includes(R.line), `${id} line`);
    for ( const k of ["ground", "path", "solid", "water", "hazard", "growth", "glow", "void", "ink"] ) assert.match(R.palette[k], /^#[0-9a-f]{6}$/, `${id} ${k}`);
    assert.ok(R.ways.length && R.refs.length && R.landmarks.length && R.hazards.length, `${id} lists`);
    const tos = R.eras.map(e => e.to ?? Infinity);
    assert.deepEqual([...tos].sort((a, b) => a - b), tos, `${id} eras in order`);
    assert.equal(tos[tos.length - 1], Infinity, `${id} last era runs on`);
  }
  // Every line with realms past the near worlds is covered, Underworlds and the Dreaming among them
  for ( const line of ["werewolf", "mage", "wraith", "changeling", "kuei-jin", "mummy", "demon"] ) assert.ok(RM.REALM_ORDER.some(id => RM.REALMS[id].line === line), line);
});

test("every realm in every era: arrival, ways out, landmarks and reachable hazards all join up; walls only on edges", () => {
  for ( const id of RM.REALM_ORDER ) for ( const year of YEARS ) for ( const future of [false, true] ) for ( const seed of [1, 1197] ) {
    const m = RM.generate({realm: id, seed, year, future, size: seed === 1 ? "small" : "medium"});
    const tag = `${id} ${year} ${future} ${seed}`;
    const arr = m.regions.filter(r => r.kind === "arrival");
    assert.equal(arr.length, 1, tag);
    assert.ok(m.regions.some(r => r.kind === "exit"), `${tag}: no way out`);
    const seen = RM.reach(m.cells, arr[0].at);
    assert.ok(seen.size > 20, `${tag}: room to move`);
    for ( const r of m.regions ) {
      const c = centre(r);
      assert.ok(r.rect[0] >= 0 && r.rect[1] >= 0 && r.rect[0] + r.rect[2] <= m.cols && r.rect[1] + r.rect[3] <= m.rows, `${tag}: ${r.id} inside`);
      if ( r.kind !== "hazard" ) assert.ok(seen.has(`${c.x},${c.y}`), `${tag}: ${r.label} cut off`);
    }
    for ( const w of m.walls ) {
      assert.ok(w.c[0] === w.c[2] || w.c[1] === w.c[3], `${tag}: wall straight`);
      assert.ok(w.c.every(v => Number.isInteger(v) && v >= 0) && w.c[2] <= m.cols && w.c[3] <= m.rows, `${tag}: wall inside`);
    }
  }
});

test("each realm's map matches its description: every landmark and danger once, and the realm's own shape", () => {
  for ( const id of RM.REALM_ORDER ) for ( const year of [1250, 1700, 1999] ) {
    const m = RM.generate({realm: id, seed: 3, year}), R = RM.REALMS[id];
    const lm = m.regions.filter(r => r.kind === "landmark").map(r => r.label);
    assert.deepEqual([...lm].sort(), [...R.landmarks].sort(), `${id} ${year}: every landmark once`);
    const hz = m.regions.filter(r => r.kind === "hazard").map(r => r.label);
    const sp = R.map ?? {}, want = new Set([...RM.realmEra(id, year).hazards, sp.river?.hazard, sp.reaches, sp.debris?.label].filter(Boolean));
    assert.deepEqual([...hz].sort(), [...want].sort(), `${id} ${year}: every danger once`);
    assert.equal(m.regions.filter(r => r.kind === "exit").length, 2, `${id} ${year}: a way back and a way on`);
  }
  const cellsOf = (m, t) => m.cells.flat().filter(c => c === t).length;
  // The Tempest and the Far Shores: islands in the storm sea, not the void (The Sea of Shadows pdf 20 / p. 19)
  for ( const id of ["tempest", "far-shores"] ) { const m = RM.generate({realm: id, seed: 2, year: 1700}); assert.equal(cellsOf(m, RM.T.void), 0, id); assert.ok(cellsOf(m, RM.T.water) > 200, id); }
  assert.ok(RM.generate({realm: "far-shores", seed: 2, year: 1700}).regions.length >= 9);
  // Stygia: walled on its island, the harbour on the Sea of Shadows is where travellers land
  const st = RM.generate({realm: "stygia", seed: 2, year: 1700}), arr = st.regions.find(r => r.kind === "arrival");
  assert.equal(arr.label, "The harbour on the Sea of Shadows");
  assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2]].some(([dx, dy]) => [RM.T.water, RM.T.shallow].includes(st.cells[arr.at.y + dy]?.[arr.at.x + dx])), "the harbour is on the water");
  const cx = Math.floor(st.cols / 2), cy = Math.floor(st.rows / 2);
  assert.equal(st.regions.find(r => r.label === "the Onyx Tower").at.x, cx);
  assert.equal(st.regions.find(r => r.label === "the Onyx Tower").at.y, cy);
  // The Battleground: the Signpost, and from it exactly two paths
  for ( const year of [1250, 1700, 1916, 2040] ) {
    const b = RM.generate({realm: "battleground", seed: 4, year, future: true}), sp = b.regions.find(r => r.kind === "arrival");
    assert.equal(sp.label, "The Signpost");
    // Walk the ring of cells two steps out from the Signpost and count the openings in it
    const {x, y} = sp.at, ring = [];
    for ( let dx = -2; dx <= 2; dx++ ) ring.push([dx, -2]);
    for ( let dy = -1; dy <= 2; dy++ ) ring.push([2, dy]);
    for ( let dx = 1; dx >= -2; dx-- ) ring.push([dx, 2]);
    for ( let dy = 1; dy >= -1; dy-- ) ring.push([-2, dy]);
    const open = ring.map(([dx, dy]) => RM.walkable(b.cells[y + dy]?.[x + dx] ?? RM.T.solid));
    const runs = open.filter((v, i) => v && !open[(i + open.length - 1) % open.length]).length;
    assert.equal(runs, 2, `battleground ${year}: two paths from the Signpost`);
  }
  assert.ok(cellsOf(RM.generate({realm: "battleground", seed: 4, year: 1250}), RM.T.hazard) < cellsOf(RM.generate({realm: "battleground", seed: 4, year: 1916}), RM.T.hazard), "no craters before cannon");
  // Erebus' river of molten silver and Duat's river of the dead cross the map
  for ( const id of ["erebus", "duat"] ) { const m = RM.generate({realm: id, seed: 5, year: 1500}); assert.ok(m.cells.every(row => true) && [0, m.cols - 1].every(x => m.cells.some(row => row[x] === RM.T.water)), id); }
  // Malfeas and the Scar: the black train's line runs to the edge
  for ( const id of ["malfeas", "scar"] ) {
    const m = RM.generate({realm: id, seed: 5, year: 1950}), st2 = m.regions.find(r => /black train|Last Junction/.test(r.label)).at;
    const edge = [st2.x, st2.y, m.cols - 1 - st2.x, m.rows - 1 - st2.y].indexOf(Math.min(st2.x, st2.y, m.cols - 1 - st2.x, m.rows - 1 - st2.y));
    const line = edge === 0 ? m.cells[st2.y].slice(0, st2.x) : edge === 2 ? m.cells[st2.y].slice(st2.x + 1) : m.cells.slice(edge === 1 ? 0 : st2.y + 1, edge === 1 ? st2.y : undefined).map(r => r[st2.x]);
    assert.ok(line.every(c => c === RM.T.path), `${id}: the line`);
  }
  // Enoch's five spires stand in a curve over the city; Yomi's hells ring Ti Yu at the heart
  const en = RM.generate({realm: "enoch", seed: 5, year: 1500});
  assert.equal(en.regions.filter(r => / spire$/.test(r.label)).length, 5);
  assert.equal(en.regions.find(r => r.kind === "exit" && /Labyrinth/.test(r.label))?.kind, "exit");
  const yo = RM.generate({realm: "yomi", seed: 5, year: 1500}), ti = yo.regions.find(r => /Ti Yu/.test(r.label)).at;
  assert.ok(Math.abs(ti.x - Math.floor(yo.cols / 2)) <= 1 && Math.abs(ti.y - Math.floor(yo.rows / 2)) <= 1);
  // The Aetherial Realm: Phoebe fills half the sky, the Wyrm Reaches rot along its top
  const ae = RM.generate({realm: "aetherial", seed: 5, year: 1500});
  assert.match(RM.svg(ae), /url\(#moon\)/);
  assert.ok(ae.regions.some(r => r.label === "Wyrm Reaches rot" && r.rect[1] < ae.rows * 0.3));
  // Sectors of the Digital Web and Autochthonia are all joined
  for ( const id of ["digital-web", "autochthonia"] ) {
    const m = RM.generate({realm: id, seed: 5, year: 2000}), seen = RM.reach(m.cells, m.regions.find(r => r.kind === "arrival").at);
    const ground = []; m.cells.forEach((row, y) => row.forEach((c, x) => { if ( c === RM.T.ground ) ground.push(`${x},${y}`); }));
    assert.ok(ground.every(k => seen.has(k)), `${id}: every sector reached`);
  }
});

test("the same seed and year give the same map; another seed or era gives another", () => {
  const a = RM.generate({realm: "stygia", seed: 42, year: 1600}), b = RM.generate({realm: "stygia", seed: 42, year: 1600});
  assert.deepEqual(a, b);
  assert.equal(RM.svg(a), RM.svg(b));
  assert.notDeepEqual(RM.generate({realm: "stygia", seed: 43, year: 1600}).cells, a.cells);
  assert.notDeepEqual(RM.generate({realm: "stygia", seed: 42, year: 2005}).cells, a.cells);
  assert.throws(() => RM.generate({realm: "nowhere"}), /No such realm/);
});

test("eras: the Net opens in 1990, the Dreaming's deep gates shut from the Shattering to 1969, the Avatar Storm from 1999", () => {
  assert.equal(RM.realmEra("digital-web", 1985).closed, true);
  assert.equal(RM.realmEra("digital-web", 1995).closed, false);
  assert.equal(RM.realmEra("deep-dreaming", 1200).closed, false);
  assert.equal(RM.realmEra("deep-dreaming", 1600).closed, true);
  assert.equal(RM.realmEra("deep-dreaming", 1970).closed, false);
  assert.ok(RM.realmEra("shard-realm", 2000).notes.some(n => /Avatar Storm/.test(n)));
  assert.ok(!RM.realmEra("shard-realm", 1990).notes.some(n => /Avatar Storm/.test(n)));
  assert.ok(RM.realmEra("tempest", 1350).notes.some(n => /Second Great Maelstrom/.test(n)));
  assert.equal(RM.realmEra("tempest", 1350).mods.storm, 1);
  assert.equal(RM.realmEra("demon-abyss", 1990).closed, true);
  assert.equal(RM.realmEra("demon-abyss", 2000).closed, false);
  // The World of Future Darkness spans only apply on that branch; the classic timeline keeps the 2025 state
  assert.equal(RM.realmEra("cyberrealm", 2050, {future: true}).mods.dense, 2);
  assert.equal(RM.realmEra("cyberrealm", 2050).mods.dense, 1);
  assert.ok(RM.realmEra("pangaea", 2095, {future: true}).notes.some(n => /Endless Winter/.test(n)));
  assert.ok(!RM.realmEra("pangaea", 2095).notes.some(n => /Endless Winter/.test(n)));
  assert.equal(RM.realmEra("nowhere", 1999), null);
});

test("the art: a whole SVG with no gaps in the numbers, sized to the grid; the scene parts in pixels", () => {
  const m = RM.generate({realm: "malfeas", seed: 5, year: 1950});
  const s = RM.svg(m, {cell: 50});
  assert.match(s, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="2000" height="1500"/);
  assert.ok(s.endsWith("</svg>"));
  assert.doesNotMatch(s, /NaN|undefined/);
  assert.equal(RM.mix("#000000", "#ffffff", 0.5), "#808080");
  const p = RM.sceneParts(m, 100);
  assert.equal(p.walls.length, m.walls.length);
  assert.ok(p.walls.every(w => w.c.every(v => v % 100 === 0)));
  assert.ok(p.walls.some(w => w.sight === 20) && p.regions.length === m.regions.length);
  const isl = RM.sceneParts(RM.generate({realm: "tempest", seed: 5, year: 1700}), 100);
  assert.ok(isl.walls.some(w => w.sight === 0 && w.move === 20), "the edge of the void stops feet, not eyes");
  assert.match(RM.realmNote(m), /^Malfeas, as it stands in 1950\./);
  assert.match(RM.realmNote(RM.generate({realm: "digital-web", seed: 1, year: 1980})), /No way leads in this year/);
  assert.equal(RM.arrivalSpots(m, 4).length, 4);
});

test("in-game text: no em dashes, no gendered pronouns, no project words", () => {
  const all = JSON.stringify(RM.REALMS) + readFileSync(new URL("../../modules/wodx-otherworlds/scripts/realm-maps.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(all, /—/);
  assert.doesNotMatch(all, /\b(he|she|him|her|his|hers)\b/i);
  assert.doesNotMatch(all, /WoDX choice|Ben|decision B\d/);
});

/* ---- Foundry: draw, send, bring back, against stand-ins ---- */
function coll(list = []) { const m = new Map(list.map(d => [d.id, d])); m.filter = f => [...m.values()].filter(f); m.find = f => [...m.values()].find(f); return m; }
let nid = 0;
class FakeScene {
  constructor(data) { Object.assign(this, structuredClone(data)); this.id = `S${++nid}`; this.walls = coll(); this.regions = coll(); this.tokens = coll(); this.levels = coll(); }
  async createEmbeddedDocuments(type, list) {
    const key = {Wall: "walls", Region: "regions", Token: "tokens"}[type];
    return list.map(({actor, ...d}) => { const doc = {...structuredClone(d), id: `${type}${++nid}`, parent: this, behaviors: new Map()};
      if ( type === "Token" ) { doc.toObject = () => { const {parent, toObject, delete: _, update, actor: a, behaviors, ...rest} = doc; return {...structuredClone({...rest, _id: doc.id}), actor: a}; };
        doc.delete = async () => this.tokens.delete(doc.id); doc.update = async u => Object.assign(doc, u); doc.actor = actor ?? null; }
      this[key].set(doc.id, doc); return doc; });
  }
  async deleteEmbeddedDocuments(type, ids) { const key = {Wall: "walls", Region: "regions"}[type]; for ( const id of ids ) this[key].delete(id); }
  async update(u) { for ( const [k, v] of Object.entries(u) ) { const path = k.split("."); let o = this; while ( path.length > 1 ) { const p = path.shift(); o = o[p] ??= {}; } o[path[0]] = v; } }
  async view() { this.viewed = true; }
}

test("Foundry: draw a realm, send tokens in, bring them back where they stood", async () => {
  const uploads = [], socket = [], chat = [];
  const scenes = coll();
  globalThis.foundry = {utils: {mergeObject: (a, b) => ({...a, ...b})}, applications: {apps: {FilePicker: {implementation: {
    createDirectory: async () => true, upload: async (src, dir, file) => { uploads.push(`${dir}/${file.name}`); return {status: "success"}; }}}}}};
  globalThis.File = class { constructor(parts, name, o) { this.name = name; this.type = o.type; this.text = parts.join(""); } };
  globalThis.game = {user: {isGM: true}, users: [{id: "u1", isGM: false, active: true}, {id: "gm", isGM: true, active: true}], scenes,
    folders: coll(), modules: new Map([["wodx-chronicle", {api: {eras: {currentYear: () => 1600}, rule: () => false}}]]), socket: {emit: (...a) => socket.push(a)}};
  globalThis.Folder = {create: async d => ({id: "F1", ...d})};
  globalThis.Scene = {create: async d => { const s = new FakeScene(d); scenes.set(s.id, s); return s; }};
  globalThis.ChatMessage = {create: async m => chat.push(m)};
  globalThis.ui = {notifications: {warn: m => chat.push({warn: m}), info: () => {}}};
  globalThis.canvas = null;
  const RMF = await import("../../modules/wodx-otherworlds/scripts/realm-maps.mjs");
  const s = await RMF.drawRealm({realm: "labyrinth", seed: 9});
  assert.equal(s.flags["wodx-otherworlds"].realmMap.year, 1600, "the year in force");
  assert.equal(s.flags["wodx-otherworlds"].realm, "labyrinth");
  assert.equal(RMF.artOf(s), "wodx-assets/realms/labyrinth-1600-9-medium.svg");
  assert.deepEqual(uploads, ["wodx-assets/realms/labyrinth-1600-9-medium.svg"]);
  assert.equal(s.width, 4000); assert.equal(s.navigation, false);
  assert.ok(s.walls.size > 50 && s.regions.size >= 4);
  assert.ok(RMF.isRealmMap(s));
  // Send two tokens from a town scene
  const town = new FakeScene({name: "Rothenstein"}); scenes.set(town.id, town);
  const owner = {testUserPermission: (u) => u.id === "u1"};
  const [a, b] = await town.createEmbeddedDocuments("Token", [{name: "Anna", x: 500, y: 600, actor: owner, elevation: 0}, {name: "Bertl", x: 700, y: 600, actor: null, elevation: 0}]);
  const sent = await RMF.sendToRealm(s, [a, b]);
  assert.equal(sent.length, 2);
  assert.equal(town.tokens.size, 0);
  assert.equal(s.tokens.size, 2);
  const model = RMF.modelOf(s), spots = (await import("../../modules/wodx-otherworlds/scripts/realm-maps-rules.mjs")).arrivalSpots(model, 2);
  assert.deepEqual(sent.map(t => [t.x, t.y]), spots.map(c => [c.x * 100, c.y * 100]), "they land on the arrival");
  assert.deepEqual(sent[0].flags["wodx-otherworlds"].cameFrom, {scene: town.id, x: 500, y: 600, level: null, elevation: 0});
  assert.deepEqual(socket, [["pullToScene", s.id, "u1"]], "the owning player is pulled there");
  await assert.rejects(RMF.sendToRealm(s, sent), /already there/);
  // Bring them back
  const back = await RMF.bringBack(sent);
  assert.equal(back.length, 2);
  assert.deepEqual(back.map(t => [t.x, t.y]), [[500, 600], [700, 600]]);
  assert.equal(s.tokens.size, 0);
  assert.equal(back[0].flags["wodx-otherworlds"].cameFrom, null);
  // Redraw with a new seed keeps the scene, replaces the art and walls
  await RMF.redrawRealm(s, {seed: 10});
  assert.equal(s.flags["wodx-otherworlds"].realmMap.seed, 10);
  assert.equal(RMF.artOf(s), "wodx-assets/realms/labyrinth-1600-10-medium.svg");
  assert.equal([...s.regions.values()].filter(r => r.flags["wodx-otherworlds"].realmRegion === "arrival").length, 1);
});

test("realm maps are wired: a Storyteller toolbar button, the api, a searchable realm list", () => {
  const main = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-otherworlds/scripts/realm-maps.mjs", import.meta.url), "utf8");
  assert.match(main, /tokens\.tools\.wodxRealmMaps = /);
  assert.match(main, /realmMaps: \{draw: realmMaps\.drawRealm/);
  assert.match(ui, /searchBox\("select\[name=realm\]"/);
  assert.match(ui, /searchBox\("select\[name=scene\]"/);
});
