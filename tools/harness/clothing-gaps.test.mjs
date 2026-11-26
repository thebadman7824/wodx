// The owner's Tags desk note (2026-11-26): the clothes of 1197 Central Europe that the goods list lacked
import test from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-library/data/goods.mjs"));
const K = await import(join(root, "modules/wodx-rules/creation/kit-rules.mjs"));
const moravia = g => G.inUseAt(g, 1197, {region: "moravia", way: "latin"});
const NEW = ["a pair of linen braies", "a linen coif", "a pair of wool leg wraps", "a dyed wool tunic", "a laced bliaut",
  "a long mantle with a cord", "a bronze ring brooch", "a wool shoulder hood", "a brimmed felt hat", "a broad straw hat",
  "a pointed Jewish hat", "a pair of ankle boots", "a pair of tall riding boots", "a fur-lined over-tunic", "a sheepskin coat",
  "a linen veil", "a silk headband", "a pair of temple rings", "a tablet-woven belt", "a pair of hose garters", "a linen alb",
  "a hemp work smock"];

test("the 22 garments are in use in Moravia in 1197, worn, tagged and described", () => {
  for ( const n of NEW ) {
    const g = G.GOODS.find(x => x.name === n);
    assert.ok(g, n);
    assert.equal(g.kind, "cloth", n);
    assert.equal(g.use, "worn", n);
    assert.ok(moravia(g), `${n} in 1197 Moravia`);
    assert.ok(g.station?.length && g.style?.length && Array.isArray(g.material), `${n} tags`);
  }
});

test("temple rings stay in the Slavic lands and the alb with the Christians", () => {
  const ring = G.GOODS.find(x => x.name === "a pair of temple rings"), alb = G.GOODS.find(x => x.name === "a linen alb");
  assert.ok(!G.inUseAt(ring, 1197, {region: "france", way: "latin"}));
  assert.ok(!G.inUseAt(alb, 1197, {region: "persia", way: "islamic"}));
});

test("a kit in 1197 dresses in the clothes of the period, by station", () => {
  const kit = (station, seed) => K.suggestKit({goods: G.GOODS, inUse: moravia, station, seed, year: 1197}).filter(r => r.free).map(r => r.name);
  for ( const seed of ["a", "b", "c", "d"] ) {
    assert.ok(!kit("n", seed).some(n => /^a (robe|long dress|pair of slippers)$/.test(n)), `a noble outfit (${seed})`);
    assert.ok(!kit("p", seed).includes("a fur-lined over-tunic"), "the poor go without fur");
  }
  assert.ok(["a", "b", "c", "d"].some(s => kit("n", s).some(n => /bliaut|over-tunic|riding boots|mantle|tablet-woven/.test(n))), "the nobility dress the part");
  assert.equal(K.slotOf("a pair of hose garters"), null, "garters are not leg cover");
  assert.equal(K.slotOf("a wool shoulder hood"), "head");
});
