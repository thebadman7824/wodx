import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Money of their own for the Philippines, Indochina and the Balkans (B3190-B3191) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const R = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");
const P = await imp("modules/wodx-chronicle/scripts/place-rules.mjs");
const LANDS = ["philippine", "indochinese", "balkan"];

test("money of the lands: every year from 1197 to 2022 has its own money, coins and a wage", () => {
  for ( const r of LANDS ) {
    assert.ok(R.MONIES[r] && R.COINS[r], r);
    let last = null;
    for ( let y = 1197; y <= 2022; y++ ) {
      const m = R.moneyFor(y, r);
      assert.equal(m.region, r, `${r} ${y} falls back to ${m.region}`);
      assert.ok(R.wageAt(y, r) > 0, `${r} ${y} wage`);
      if ( m.id !== last ) assert.ok(m.units.length >= 1 && m.units.every(u => u[2] > 0), `${r} ${m.id} units`);
      last = m.id;
    }
    assert.ok(R.coinsFor(1500, r).coin, r);
  }
});

test("money of the lands: the right coin in the right years; shared coin needs no changer", () => {
  assert.equal(R.moneyFor(1300, "philippine").id, "ph-gold");
  assert.equal(R.moneyFor(1700, "philippine").id, "mx-real");
  assert.ok(R.sameMoney(1700, "philippine", "mexican"), "galleon pesos are Mexican pesos");
  assert.ok(!R.sameMoney(1700, "philippine", "malay"));
  assert.equal(R.moneyFor(1990, "philippine").id, "php");
  assert.equal(R.moneyFor(1600, "indochinese").id, "dv-cash");
  assert.equal(R.moneyFor(1900, "indochinese").id, "piastre");
  assert.ok(!R.sameMoney(1600, "indochinese", "southeast-asian"));
  assert.equal(R.moneyFor(1300, "balkan").id, "rs-dinar");
  assert.ok(R.sameMoney(1600, "balkan", "ottoman"), "the akçe under the Ottomans");
  assert.ok(!R.sameMoney(1600, "balkan", "hungarian"));
  assert.equal(R.moneyFor(1900, "balkan").id, "rs-dinar-2");
  assert.equal(R.moneyFor(1970, "balkan").id, "yu-dinar");
});

test("money of the lands: a scene names its money; the region keeps its own otherwise", () => {
  assert.deepEqual(Object.keys(P.PLACE_MONIES).sort(), [...LANDS].sort());
  assert.equal(P.cleanPlace({region: "nusantara", money: "philippine"}).money, "philippine");
  assert.equal(P.cleanPlace({region: "nusantara", money: "nowhere"}).money, undefined);
  assert.ok(P.hasOwnPlace({money: "balkan"}));
  const pl = src("modules/wodx-chronicle/scripts/place.mjs");
  assert.match(pl, /p\.money && r \? \{\.\.\.r, money: p\.money\} : r/);
  assert.match(pl, /select name="money" data-fixed/);
});
