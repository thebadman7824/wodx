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
    return {"trades": sorted({h["trade"] for h in t.households}), "notables": [n["role"] for n in t.notables], "ties": settle.ties(t, {}), "age": settle.trade_age(year)}
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
