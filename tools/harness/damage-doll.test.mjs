import test from "node:test";
import assert from "node:assert/strict";
import * as B from "../../modules/wodx-combat/scripts/body-rules.js";
import * as D from "../../modules/wodx-sheets/scripts/doll-draw.mjs";
import { bodyHtml, dollHtml } from "../../modules/wodx-sheets/scripts/body-html.mjs";

const specFor = (view, opts = {}) => { const b = B.bodyOf(view); return {b, spec: D.specOf(b, {plan: B.SHAPES[b.shape].plan, ...opts})}; };
const pixelsOf = r => { const seen = {}; for ( let y = 0; y < D.H; y++ ) for ( let x = 0; x < D.W; x++ ) { const id = r.at(x, y); if ( id ) seen[id] = (seen[id] ?? 0) + 1; } return seen; };

test("a Mokole in an animal form has a body again, drawn as a crocodile", () => {
  const b = B.bodyOf({shifter: true, garouForm: "lupus", feraKey: "Mokole"});
  assert.equal(b.shape, "lupus");
  assert.equal(b.animal, "croc");
  assert.ok(b.parts.length > 5);
});

test("every shape and every four-legged Changing Breed draws, with every outer part visible", () => {
  const views = Object.keys(B.SHAPES).map(k => ({shapeFlag: k}));
  for ( const f of Object.keys(B.FERA_BEAST) ) views.push({shifter: true, garouForm: "lupus", feraKey: f});
  for ( const f of Object.keys(B.FERA_ANIMAL) ) views.push({shifter: true, garouForm: "hispo", feraKey: f});
  views.push({features: [{key: "arms"}, {key: "wings"}, {key: "tail"}, {key: "gills"}]});
  for ( const v of views ) {
    const {b, spec} = specFor(v);
    const r = D.draw(spec);
    assert.equal(r.data.length, D.W * D.H * 4);
    assert.ok(r.data.some((x, i) => i % 4 === 3 && x > 0), `${b.shape} draws nothing`);
    if ( !b.tree ) continue;
    const seen = pixelsOf(r);
    for ( const p of b.parts ) {
      if ( ["face", "back", "heart", "eye", "mouth"].includes(p.type) ) continue;
      assert.ok(seen[p.id] > 0, `${b.shape}${v.feraKey ? ` (${v.feraKey})` : ""}: ${p.id} not drawn`);
    }
  }
});

test("a wounded part takes the wound colour; inner parts and eyes show only when struck; a lost part leaves a ghost", () => {
  const {b} = specFor({features: [{key: "lost", part: "leg-l"}]});
  const flat = D.draw(D.specOf(b, {plan: "person"}));
  const hurt = D.draw(D.specOf(b, {plan: "person", wounds: {"arm-r": {l: 3}, heart: {l: 1}}}));
  assert.ok(!pixelsOf(flat).heart && pixelsOf(hurt).heart > 0);
  const red = r => { let n = 0; for ( let y = 0; y < D.H; y++ ) for ( let x = 0; x < D.W; x++ ) if ( r.at(x, y) === "arm-r" ) { const i = (y * D.W + x) * 4; if ( r.data[i] > r.data[i + 2] + 40 ) n++; } return n; };
  assert.ok(red(hurt) > red(flat));
  assert.ok(pixelsOf(flat).lost > 0);
});

test("false limbs: wood before 1900, steel to 2022, chrome after; the lost part is drawn again", () => {
  assert.equal(D.fakeOf(1650), "wood");
  assert.equal(D.fakeOf(1999), "steel");
  assert.equal(D.fakeOf(2040), "chrome");
  const {b} = specFor({features: [{key: "lost", part: "arm-r"}]});
  const s = D.specOf(b, {plan: "person", fakes: ["arm-r"], year: 1999});
  assert.deepEqual(s.fakes, {"arm-r": "steel", "hand-r": "steel"});
  assert.ok(!s.lost.includes("arm-r"));
  assert.ok(pixelsOf(D.draw(s))["hand-r"] > 0);
});

test("wound records: added per level, oldest healed first, undone by attack, and never more than the track holds", () => {
  let l = B.addWounds([], {part: "arm-l", type: "lethal", levels: 2, msg: "m1", at: 1});
  l = B.addWounds(l, {part: "head", type: "lethal", levels: 1, msg: "m2", at: 2});
  l = B.addWounds(l, {part: "leg-r", type: "bashing", levels: 1, msg: "m2", at: 2});
  assert.equal(l.length, 4);
  assert.deepEqual(B.trimWounds(l, {lethal: 2, bashing: 1}).map(w => w.part), ["arm-l", "head", "leg-r"]);
  assert.deepEqual(B.undoWounds(l, "m2").map(w => w.part), ["arm-l", "arm-l"]);
  assert.deepEqual(B.addWounds([], {part: "x", type: "fire", levels: 2}), []);
});

test("wounds per part: harm with no record shows on the torso; a hand wound shows on the fore leg in Lupus", () => {
  const person = B.bodyOf({}), wolf = B.bodyOf({shifter: true, garouForm: "lupus"});
  const l = B.addWounds([], {part: "hand-r", type: "lethal", levels: 1});
  assert.deepEqual(B.woundsByPart(l, {lethal: 1, bashing: 2}, person), {"hand-r": {l: 1}, body: {b: 2}});
  assert.deepEqual(B.woundsByPart(l, {lethal: 1}, wolf), {"leg-rf": {l: 1}});
  assert.deepEqual(B.woundsByPart(l, {lethal: 0}, person), {});
  assert.deepEqual(B.woundsByPart([], {aggravated: 1}, B.bodyOf({shapeFlag: "mist"})), {});
});

test("the Storyteller places only levels the track holds, and clears a part", () => {
  const l = B.addWounds([], {part: "head", type: "lethal", levels: 1});
  assert.equal(B.placeWound(l, {lethal: 1}, "arm-r", "lethal"), null);
  assert.deepEqual(B.placeWound(l, {lethal: 2}, "arm-r", "lethal").map(w => w.part), ["head", "arm-r"]);
  assert.deepEqual(B.clearWounds(l, "head"), []);
});

test("the Body tab carries the doll, with names escaped", () => {
  const b = B.bodyOf({});
  const spec = D.specOf(b, {plan: "person"});
  const h = dollHtml({spec, wounds: [{label: "Left <arm>", text: "2 lethal"}], gm: true});
  assert.match(h, /canvas class="wodx-doll"/);
  assert.match(h, /Left &lt;arm&gt;/);
  assert.ok(!h.includes('data-spec="{"'));
  assert.match(bodyHtml(b, {doll: {spec, wounds: []}}), /wodx-doll-wrap/);
  assert.equal(dollHtml(null), "");
});
