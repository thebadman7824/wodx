import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as D from "../../modules/wodx-rules/actions/domain-da-rules.js";
import * as PM from "../../modules/wodx-actions/scripts/profile-menus.js";
import * as TR from "../../modules/wodx-rules/actions/theme-rules.js";
import {rollTags} from "../../modules/wodx-rules/chronicle/trait-rules.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7679: the manor's aspects split the Domain Background, V20 Dark Ages Companion pp. 108-109 */
test("the manor's aspects share the Domain's dots and need one dot of Area", () => {
  assert.deepEqual(D.ASPECT_KEYS, ["area", "defense", "prosperity", "secret"]);
  assert.equal(D.checkAspects({area: 2, defense: 1, prosperity: 1, secret: 1}, 5).ok, true);
  assert.match(D.checkAspects({area: 3, defense: 3}, 5).why, /use 6 dots; the Domain has 5/);
  assert.match(D.checkAspects({area: 0, defense: 1}, 3).why, /at least 1 dot of Area/);
  assert.match(D.checkAspects({area: 1, defense: 0}, 3).why, /2 dots not yet placed/);
  assert.equal(D.residentsOf(3), 100);
  assert.deepEqual(D.manorShifts({area: 1, defense: 2, prosperity: 1, secret: 3}), {intrude: 2, commerce: -1, hide: -3});
});

/* B7680: Populace, settlements, Servants and staff, pp. 110-112 */
test("Populace, settlements, the Servants' retinue and staff pools", () => {
  assert.deepEqual(D.populaceOf(3), {dots: 3, households: 15, people: 75, territory: "1-3", levies: 15});
  const small = D.settlementNow(3, 4), big = D.settlementNow(3, 7);
  assert.equal(small.shrinks, true); assert.equal(small.held, 2);
  assert.equal(big.shrinks, false); assert.equal(big.name, "Town"); assert.equal(big.resources, 3);
  assert.deepEqual(D.servantsOf(3), {dots: 3, retinue: 15, shift: -3});
  const st = D.staffOf({type: "armigers", dots: 3, people: 2, ally: true});
  assert.equal(st.pool, 6); assert.equal(st.allyBackgrounds, 5);
  assert.equal(D.staffOf({dots: 5, people: 1}).pool, 9);
});

/* B7681: fealty, p. 106 */
test("an oath of fealty: two dots offered for each dot anchored, half a Background lent, ten at most pooled", () => {
  assert.equal(D.anchorFor(4), 2);
  assert.equal(D.anchorFor(3, 1), 2);
  assert.equal(D.lendMax(5), 2);
  assert.deepEqual(D.checkOath({anchorDots: 2, liegeOwn: 4, offered: 4}), {ok: true, why: []});
  const bad = D.checkOath({anchorDots: 3, liegeOwn: 4, offered: 4});
  assert.equal(bad.ok, false); assert.equal(bad.why.length, 2);
  assert.equal(D.pooledWith(8, 4), 10);
  assert.deepEqual(D.vassalMerit(2), {points: 2, liegeGets: 4, liegeOffers: 2});
  assert.equal(D.FEALTY.cutOffCost, 1);
});

/* B7682: domain events, pp. 113-115 */
test("ten domain events, each lasting a season unless it says otherwise; the Servants rebuild after a disaster", () => {
  assert.equal(D.EVENT_KEYS.length, 10);
  assert.equal(D.SEASON_DAYS, 91);
  const dis = D.eventChange("disaster", 1, {servants: 3});
  assert.equal(dis.bg, "area"); assert.equal(dis.delta, -1); assert.equal(dis.restore, 1);
  assert.equal(D.eventChange("famine", 0).restore, 0);
  assert.equal(D.eventChange("curse").until, "resolved");
  assert.equal(D.eventChange("nothing"), null);
  assert.deepEqual(D.hostCourt({overlordStatus: 4, servants: 2, resources: 3}), {need: 4, short: 2, hire: 2, cost: 1, fails: false});
  assert.equal(D.hostCourt({overlordStatus: 5, servants: 1, resources: 2}).fails, true);
  const evs = [{bg: "area", delta: -1, restore: 0, until: 100}];
  assert.deepEqual(D.withEvents({area: 2}, evs, 50), {area: 1});
  assert.deepEqual(D.withEvents({area: 2}, evs, 150), {area: 2});
  assert.deepEqual(D.withEvents({area: 2}, [{...evs[0], ended: 60}], 50), {area: 2});
  assert.equal(D.rollEvent(0), "curse");
  assert.equal(D.rollEvent(0.99), "pilgrims");
});

/* B7683-B7684: maturation and what the domain does on rolls */
test("the domain eases Commerce, Seneschal and Leadership, and Stealth only in the manor", () => {
  assert.equal(D.maturationCost(0), 2);
  assert.equal(D.maturationCost(3, {prosperityHalf: true}), 3);
  const off = D.standingShifts({aspects: {area: 1, prosperity: 2, secret: 1}}, {onManor: false, servants: 3});
  assert.deepEqual(off.map(x => [x.tags.join("+"), x.shift]), [["commerce", -2], ["seneschal+leadership", -3]]);
  const on = D.standingShifts({aspects: {area: 1, secret: 2}}, {onManor: true});
  assert.deepEqual(on.map(x => [x.tags[0], x.shift]), [["stealth", -2]]);
  // the roll tags reach these Abilities
  assert.deepEqual(rollTags("commerce"), ["commerce"]);
  assert.deepEqual(rollTags("Seneschal"), ["seneschal"]);
  const pm = src("modules/wodx-actions/scripts/power-mods.js");
  assert.match(pm, /\.\.\.domainOf\(actor\)\]/);
  assert.match(pm, /DOM\.withEvents\(DOM\.normAspects\(d\.aspects\)/);
});

test("the domain, its events and fealty are reachable from the menus and the API", () => {
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /domainDA: withActor\(a => dmx\(\)\.window\(a\)\)/);
  assert.match(m, /domainEvent: withActor\(a => dmx\(\)\.domainEvent\(a\)\)/);
  assert.match(m, /fealty: \(o = \{\}\) => dmx\(\)\.fealty/);
  assert.match(m, /dmx\(\)\.tick\(wt\)/);
  const specs = k => PM.MENUS[k].sections.flatMap(([, b]) => b.map(([s]) => s));
  for ( const k of ["kindred", "ghoul", "mortal", "hunter"] ) assert.ok(specs(k).includes("api:domainDA"), k);
  for ( const k of ["kindred", "mortal"] ) { assert.ok(specs(k).includes("api:fealty"), k); assert.ok(specs(k).includes("api:domainEvent"), k); }
  assert.ok(TR.MENU_PLAN.kindred.st.includes("api:fealty"));
  assert.ok(TR.MENU_PLAN.kindred.recover.includes("api:domainDA"));
  const dj = src("modules/wodx-actions/scripts/domain-da.js");
  assert.match(dj, /await moveBg\(L, e\.anchor\.bg, -D\.FEALTY\.cutOffCost\)/);
  assert.match(dj, /sinPrompt\?\.\(V, "wordBroken"/);
  assert.match(dj, /until: E\.until \? null : game\.time\.worldTime \+ D\.SEASON_DAYS \* DAY/);
});
