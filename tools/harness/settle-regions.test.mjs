import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The town generator's households by region (settle.py, B3290 to B3293) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const py = (() => { for ( const p of ["python3", "python"] ) { try { execFileSync(p, ["--version"]); return p; } catch (e) { /* next */ } } return null; })();
const run = code => JSON.parse(execFileSync(py, ["-c", code], {cwd: join(root, "tools/mapgen"), encoding: "utf8"}));

/* A town rebuilt from the 1995 sample record, re-peopled for a year in a region: the households' trades. */
const TOWN = `
import json, settle
from types import SimpleNamespace as N
rec = json.load(open("samples/steinfeld-1995.settlement.json", encoding="utf-8"))
def town(year, region):
    settle.REGION = region
    blds = [N(key=h["building"], type=h["type"], label=h["label"], wealth=h["wealth"], centre=tuple(h["at"])) for h in rec["households"]]
    hs = [{"id": h["id"], "building": h["building"], "label": h["label"], "trade": h["trade"], "people": [{"role": p} for p in h["people"]]} for h in rec["households"]]
    t = N(seed=7, year=year, size=rec["kind"], households=hs, blds=blds)
    settle.repeople(t, {})
    return {"trades": sorted({h["trade"] for h in t.households}), "notables": [n["role"] for n in getattr(t, "notables", [])], "ties": settle.ties(t, {}), "age": settle.trade_age(year)}
`;

test("settle: the regions and ways of life are Chronicle's, every one", { skip: !py }, () => {
  const Y = [1197, 1500, 1700, 1900];
  const got = run(`import json, settle; print(json.dumps({k: {"rows": [[f, s] for f, s in v], "at": [settle.sphere_for(k, y) for y in ${JSON.stringify(Y)}]} for k, v in settle.REGION_SPHERE.items()}))`);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(W.REGION_SPHERE).sort());
  for ( const [id, rows] of Object.entries(W.REGION_SPHERE) ) {
    assert.deepEqual(got[id].rows, rows, id);
    assert.deepEqual(got[id].at, Y.map(y => W.sphereFor(id, y)), id);
  }
});

test("settle: who ruled after 1918 picks the trade tables", { skip: !py }, () => {
  const ages = run(`import json, settle; print(json.dumps({r: [settle.trade_age(y, r) for y in (1800, 1930, 1965, 1995)] for r in ("moravia", "poland-baltic", "russia", "france", "japan")}))`);
  assert.deepEqual(ages.moravia, ["reform", "republic", "socialist", "modern"]);
  assert.deepEqual(ages["poland-baltic"], ["reform", "republic", "socialist", "modern"]);
  assert.deepEqual(ages.russia, ["reform", "socialist", "socialist", "modern"]);
  assert.deepEqual(ages.france, ["reform", "republic", "postwar", "modern"]);
  assert.deepEqual(ages.japan, ages.france);
});

test("settle: Moravia's households are as before; other lands take their own names", { skip: !py }, () => {
  const out = run(`${TOWN}
print(json.dumps({r: town(1965, r) for r in ("moravia", "france", "russia", "japan", "egypt")} | {"egypt1850": town(1850, "egypt"), "moravia1850": town(1850, "moravia")}))`);
  const has = (r, re) => out[r].trades.some(x => re.test(x)) || out[r].notables.some(x => re.test(x));
  // Moravia 1965: the socialist trades, untouched
  assert.equal(out.moravia.age, "socialist");
  assert.ok(has("moravia", /^national committee chairman$/));
  // France 1965: no national committee, no Party secretary, no co-operative farm
  assert.equal(out.france.age, "postwar");
  for ( const r of ["france", "japan", "egypt"] ) assert.ok(!has(r, /national committee|Party secretary|co-operative farm/), r);
  assert.ok(has("france", /^mayor$/));
  // Russia 1965: the collective farm and the village soviet
  assert.ok(!has("russia", /national committee|co-operative farm/));
  assert.ok(has("russia", /village soviet chairman/));
  // Japan farms rice; Egypt keeps no brewers or publicans
  assert.ok(!out.japan.trades.includes("farmer"));
  for ( const r of ["egypt", "egypt1850"] ) assert.ok(!has(r, /brewer|publican|pub manager|bartender|^innkeeper$/), r);
  assert.ok(!has("moravia1850", /caravanserai|headman/));
  // ties still name only households of the town
  for ( const r of Object.keys(out) ) assert.ok(out[r].ties.length > 0, r);
});

test("settle: the trade tables cover every age they are read for", { skip: !py }, () => {
  const miss = run(`import json, settle
keys = set(settle.ORDER[2:]) | {"postwar"}
miss = []
for name in ("SMITH", "BAKER", "INN", "FARM", "CRAFT", "SHOP", "HOME", "NOTABLES", "COMP"):
    for k in keys:
        if k not in getattr(settle, name): miss.append(f"{name}.{k}")
print(json.dumps(miss))`);
  assert.deepEqual(miss, []);
});

test("settle: the Settlements window says whose trades a record follows", async () => {
  const SR = await import(join(root, "modules/wodx-npc/scripts/settlement-rules.mjs"));
  const base = {format: SR.FORMAT, version: 1, id: "x", year: 1965, households: [{id: "x.a", people: ["mayor"]}]};
  const fr = SR.readRecord({...base, region: "france", tradeAge: "postwar"}).data;
  assert.equal(fr.tradeAge, "postwar");
  assert.match(SR.regionWords(fr, "France"), /^Its trades and offices are those of France in 1965; its buildings are drawn from the Bohemian crown lands/);
  assert.match(SR.regionWords(SR.readRecord({...base, region: "france"}).data, "France"), /change the trades by hand/);
  assert.match(SR.regionWords(SR.readRecord(base).data), /Moravia and the Bohemian crown lands/);
});

/* Ben's picks on the Town Households desk (B3295 to B3299) */
test("settle: every region has its own turning years, with a colonial age where a foreign power ruled", { skip: !py }, () => {
  const got = run(`import json, settle, regiontrades as RT
print(json.dumps({"keys": sorted(RT.YEARS), "y1980": {r: settle.trade_age(1980, r) for r in RT.YEARS}, "at": {r: [settle.trade_age(y, r) for y in (1700, 1800, 1900, 1925, 1970, 1995, 2040)] for r in RT.YEARS}}))`);
  assert.deepEqual(got.keys, Object.keys(W.REGION_SPHERE).sort());
  const at = got.at;
  assert.deepEqual(at.moravia, ["medieval", "reform", "industrial", "republic", "socialist", "modern", "future"].map((k, i) => i === 0 ? "early" : k));
  assert.equal(at.india[2], "colonial");
  assert.equal(at.korea[3], "colonial");
  assert.equal(at.mexico[1], "colonial");
  assert.equal(at.japan[2], "industrial");
  assert.equal(at.caribbean[4], "socialist");
  assert.equal(got.y1980["southeast-asia"], "socialist");
  assert.equal(got.y1980["east-africa"], "socialist");
  assert.equal(got.y1980.france, "postwar");
  assert.equal(at.china[5], "modern");
  for ( const r of Object.keys(at) ) assert.equal(at[r][6], "future", r);
});

test("settle: each way of life draws its own trades, and the old trades before about 1880", { skip: !py }, () => {
  const out = run(`${TOWN}
print(json.dumps({"japan1830": town(1830, "japan"), "india1900": town(1900, "india"), "egypt1300": town(1300, "egypt"), "nusantara1925": town(1925, "nusantara"),
  "check": {s: sorted(k for p in L.values() for k in p) for s, L in settle.RT.LISTS.items()}}))`);
  assert.equal(out.japan1830.age, "reform");
  assert.ok(out.japan1830.trades.some(t => /rice farmer|samurai retainer|sake brewer/.test(t)));
  assert.ok(!out.japan1830.trades.includes("coffeehouse keeper"));
  assert.ok(out.india1900.notables.includes("mission teacher") && out.india1900.notables.includes("village headman"), out.india1900.notables.join());
  assert.ok(out.nusantara1925.trades.some(t => /rubber tapper|batik maker|rice farmer/.test(t)));
  // from 1197 too: no alehouse in Cairo
  assert.ok(!out.egypt1300.trades.some(t => /alehouse|brewer/.test(t)));
  for ( const [s, keys] of Object.entries(out.check) ) for ( const k of ["baker", "craft", "farm", "home", "inn", "notables", "shop", "smith"] ) assert.ok(keys.includes(k), `${s} ${k}`);
});

test("settle: buildings take the names of their way of life, the chapel that of the faith", { skip: !py }, () => {
  const got = run(`import json, settle
from types import SimpleNamespace as N
def go(region, year, faith=None):
    blds = [N(key="a", type="tavern", label="Alehouse"), N(key="b", type="chapel", label="Chapel"), N(key="c", type="workshop", label="Workshop (cooper)"), N(key="d", type="byre-house", label="Byre-house")]
    hs = [{"id": "h1", "building": "a", "label": "Alehouse household"}]
    t = N(year=year, blds=blds, households=hs)
    settle.relabel(t, faith, region)
    return [b.label for b in blds] + [hs[0]["label"]]
print(json.dumps({"egypt": go("egypt", 1500), "japan": go("japan", 1700), "moravia": go("moravia", 1700), "jewish": go("france", 1700, "jewish")}))`);
  assert.deepEqual(got.egypt, ["Caravanserai", "Mosque", "Workshop (cooper)", "Farmhouse", "Caravanserai household"]);
  assert.deepEqual(got.japan.slice(0, 2), ["Inn", "Temple"]);
  assert.deepEqual(got.moravia, ["Alehouse", "Chapel", "Workshop (cooper)", "Byre-house", "Alehouse household"]);
  assert.equal(got.jewish[1], "Synagogue");
});

test("settle: the older public buildings go up only where they belong (B3460)", { skip: !py }, () => {
  const got = run(`import json, regiontrades as RT
ok = lambda tk, r, s, y: RT.first_group_ok(tk, r, s, y)
print(json.dumps({"jp1830": [ok(k, "japan", "japanese", 1830) for k in ("old-synagogue", "ghetto-house", "museum-hall", "general-hospital", "cemetery-chapel", "prayer-house", "granary", "coffeehouse")],
  "jp1900": ok("general-hospital", "japan", "japanese", 1900), "cairo": [ok("old-synagogue", "egypt", "islamic", 1830), ok("charnel-house", "egypt", "islamic", 1830)],
  "moravia": all(ok(k, "moravia", "latin", 1830) for k in RT.CHRISTIAN_ONLY | RT.MODERN_ONLY | {"old-synagogue"})}))`);
  assert.deepEqual(got.jp1830, [false, false, false, false, false, false, true, true]);
  assert.equal(got.jp1900, true);
  assert.deepEqual(got.cairo, [true, false]);
  assert.equal(got.moravia, true);
});
