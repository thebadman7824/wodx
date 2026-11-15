import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as NPW from "../../modules/wodx-actions/scripts/npc-power-rules.js";
import * as MH from "../../modules/wodx-actions/scripts/mummy-hekau.js";
import * as MR from "../../modules/wodx-actions/scripts/mage-da-rules.js";
import * as CA from "../../modules/wodx-actions/scripts/c20-arts.js";
import * as D from "../../modules/wodx-actions/scripts/demon-rules.js";
import * as DE from "../../modules/wodx-actions/scripts/demon-evocations.js";
import * as KA from "../../modules/wodx-actions/scripts/kote-arts.js";
import * as OH from "../../modules/wodx-actions/scripts/orpheus-horrors.js";
import * as IB from "../../modules/wodx-actions/scripts/inq-blessings.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const usable = list => list.filter(k => NPW.tagsOf(k).uses.length).length;

/* B5660-B5669: NPCs of every other line choose their own powers */
test("keysOf: the effects card's keys, once each, the world row left out", () => {
  assert.deepEqual(NPW.keysOf([{key: "harm"}, {key: "harm"}, {key: "world"}, {key: "fear"}, {}]), ["harm", "fear"]);
  assert.deepEqual(NPW.keysOf(null), []);
});

test("each line's own results give powers an NPC can choose (they do something on the table)", () => {
  const spells = Object.entries(MH.SPELLS).filter(([, s]) => s.type === "spell").map(([k, s]) => NPW.keysOf(MH.hekauResults(k, 3, {name: s.name})));
  const cantrips = Object.keys(CA.CANTRIPS).map(k => NPW.keysOf(CA.cantripResults(k, 3, {willpower: 5, glamour: 5}, {})));
  const all = Object.fromEntries(Object.keys(D.LORES).map(l => [l, 5]));
  const evos = D.evocationsKnown(all).map(e => NPW.keysOf(DE.evocationResults(e.lore, e.level, 3, {faith: 5})));
  const arts = KA.POWERS.map(p => NPW.keysOf(KA.artResults(p.id, 3)));
  const horrors = Object.keys(OH.HORROR_FX).map(k => NPW.keysOf(OH.horrorResults(k, 1, 3)));
  const bless = IB.BLESSINGS.map(b => NPW.keysOf(IB.blessingResults(b.id, 3)));
  for (const [line, list, at] of [["Hekau", spells, 40], ["cantrips", cantrips, 50], ["evocations", evos, 50], ["Kuei-jin arts", arts, 40], ["Horrors", horrors, 5], ["Blessings", bless, 50]])
    assert.ok(usable(list) >= at, `${line}: ${usable(list)} usable`);
  assert.ok(MR.ROTES.length > 50);
});

test("each builder offers its powers, and the NPC choice and auto-use reach each window", () => {
  const S = "modules/wodx-actions/scripts/";
  for (const [f, use, field] of [["mummy.js", "useHekau", "named"], ["mage-da.js", "useDaSpell", "rote"], ["m20.js", "useEffect", "kw-rote"], ["c20.js", "useCantrip", "power"],
    ["fae-da.js", "useFaeCantrip", "c"], ["demon.js", "useEvocation", "evo"], ["kote.js", "useChiArt", "art"], ["orpheus.js", "useHorror", "h"], ["hunter.js", "useBlessing", "bk"]]) {
    const s = src(S + f);
    assert.match(s, /function powersFor\(actor\)/, f);
    assert.match(s, /return \{ powersFor,/, `${f} returns powersFor`);
    assert.ok(s.includes(`use: "${use}", field: "${field}"`), `${f}: ${use} on ${field}`);
  }
  assert.match(src(S + "mummy.js"), /MH\.SPELLS\[k\]\.type === "spell"/, "rituals take hours: never chosen in a fight");
  const m = src(S + "main.js");
  for (const c of ["useHekau: a => ux().cast(a)", "useDaSpell: a => mx().cast(a)", "useEffect: a => zx().cast(a)", "useFaeCantrip: a => fx().cast(a)", "useCantrip: a => cx().cantrip(a)",
    "useEvocation: a => dx().evoke(a)", "useChiArt: a => qx().spend(a)", "useHorror: a => ox().horror(a)", "useBlessing: a => hx().blessing(a)"]) assert.ok(m.includes(c), c);
  assert.ok(m.includes("P.autoNext({ [pick.field]: pick.value, ...(pick.fill ?? {}) })"));
  assert.match(m, /!KXD\.isKotE\(actor\) && \(/, "a Kuei-jin's arts are not read as Kindred Disciplines");
});
