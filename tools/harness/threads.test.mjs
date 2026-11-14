import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX Storyteller: Threads of Fate, the signal board and the weave (B3650-B3656).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/signals-rules.mjs")));
const T = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/threads-rules.mjs")));
const DAY = 86400;
const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

const ferry = {key: "fever-ferry", title: "The Fever at the Ferry", role: "anchor", needs: ["plague"], place: ["ferry"], cast: ["ferryman"],
  regions: ["moravia"], beneath: {vampire: "The herd goes sour.", werewolf: "The Wyrm is in the water."},
  steps: [{key: "a", title: "Coughing", days: 0}, {key: "b", title: "Blame", days: 7}, {key: "c", title: "The end", days: 14}]};
const camp = {key: "changed-miners", title: "The changed miners wash below the Adit", role: "twist", needs: ["cult"], place: ["ferry", "mine"],
  beneath: {vampire: "Konrad's work.", mage: "A wrong pattern."}, complication: "The sick drank below the camp."};
const toll = {key: "toll-grudge", title: "Ivo remembers", needs: ["grudge"], place: ["toll"], beneath: {mortal: "A debt of pride."}};
const demon = {key: "fallen", title: "A Fallen walks", needs: ["change"], beneath: {demon: "An old enemy."}};
const fut = {key: "arcology", title: "The arcology archive", future: true, needs: ["plague"], beneath: {vampire: "x"}};

test("signals: a post is cleaned, the same key updates instead of copying, and the heavier weight wins", () => {
  let r = S.post([], {key: "hunters:moravia", kind: "hunters", region: "moravia", weight: 2, what: "Watching"}, 100);
  assert.equal(r.added, true); assert.equal(r.board.length, 1); assert.equal(r.signal.at, 100);
  r = S.post(r.board, {key: "hunters:moravia", kind: "hunters", weight: 1, what: "Investigating"}, 200);
  assert.equal(r.added, false); assert.equal(r.board.length, 1);
  assert.equal(r.board[0].weight, 2, "a lighter repost keeps the heavier weight");
  assert.equal(r.board[0].what, "Investigating"); assert.equal(r.board[0].at, 200);
  assert.equal(S.post([], {key: "x", kind: "nonsense"}, 0).signal, null, "an unknown kind is refused");
  assert.equal(S.post([], {kind: "fire"}, 0).signal, null, "a signal needs a key");
});

test("signals: they expire by weight, the board is capped, and used ones are not fresh", () => {
  const b = [{key: "a", kind: "fire", weight: 1, at: 0}, {key: "b", kind: "war", weight: 3, at: 0}];
  assert.deepEqual(S.prune(b, 20 * DAY).map(s => s.key), ["b"], "weight 1 lasts 14 days, weight 3 lasts 56");
  let big = [];
  for ( let i = 0; i < S.MAX + 5; i++ ) big = S.post(big, {key: `k${i}`, kind: "rumour", weight: i < 5 ? 1 : 2}, i).board;
  assert.equal(big.length, S.MAX); assert.ok(!big.some(s => s.key === "k0"), "the oldest light ones go first");
  const used = S.markUsed(b, ["b"], "story1");
  assert.deepEqual(S.fresh(used, 0).map(s => s.key), ["a"]);
  assert.deepEqual(S.fresh(S.release(used, "story1"), 0).map(s => s.key), ["b", "a"], "released and heaviest first");
});

test("signals: a player's own hook comes first, weight 3 runs at once, and omens read the same list", () => {
  const b = [{key: "w", kind: "war", weight: 3, at: 5}, {key: "h", kind: "hook", weight: 1, about: "pc1", at: 1}];
  assert.equal(S.fresh(b, 5)[0].key, "h");
  assert.equal(S.urgent(b, 5), true); assert.equal(S.urgent([b[1]], 5), false);
  const o = S.forOmens(b, 5);
  assert.deepEqual(Object.keys(o[0]).sort(), ["about", "key", "kind", "region", "weight", "what", "where", "who"].sort());
  assert.deepEqual(o.map(s => s.key), ["w"], "weight 1 is not worth a dream");
  assert.equal(S.forOmens([{key: "f", kind: "fight", weight: 2, at: 5}], 5)[0].kind, "war", "board kinds become omens kinds");
  assert.equal(S.omenKind("cult"), "change"); assert.equal(S.omenKind("plague"), "plague"); assert.equal(S.omenKind("arrest"), "hunters");
});

test("threads: a card fits by year, region, branch, lines, cuts, refusals and running chains", () => {
  const ctx = {year: 1197, region: "moravia", lines: ["vampire"]};
  assert.equal(T.fits(ferry, ctx).ok, true);
  assert.equal(T.fits(ferry, {...ctx, region: "japan"}).why, "not in this region");
  assert.equal(T.fits({...ferry, tags: ["children"]}, {...ctx, cut: ["children"]}).why, "cut by a line");
  assert.equal(T.fits(ferry, {...ctx, refused: ["fever-ferry"]}).why, "refused");
  assert.equal(T.fits(ferry, {...ctx, chains: ["black-death"]}).why, "a story chain already tells this");
  assert.equal(T.fits(toll, ctx).why, "no door for a line at the table");
  assert.equal(T.fits(fut, ctx).why, "Future Darkness branch is off");
  assert.equal(T.fits(fut, {...ctx, branch: true}).ok, true);
  assert.equal(T.fits(demon, {year: 1500, lines: ["demon"]}).ok, false, "no Demon door before 1999");
  assert.equal(T.fits(demon, {year: 2000, lines: ["demon"]}).ok, true);
  assert.equal(T.fits(demon, {year: 2000, lines: ["demon"], branch: true}).ok, false, "no Fallen in the Future Darkness branch");
});

test("threads: the weave makes anchor, twist and echo from the board", () => {
  const board = [
    {key: "plague:moravia", kind: "plague", region: "moravia", weight: 3, at: 10},
    {key: "cult:konrad", kind: "cult", region: "moravia", weight: 2, at: 9},
    {key: "grudge:ivo:pc1", kind: "grudge", about: "pc1", weight: 2, at: 8}];
  const st = T.weave({board, cards: [ferry, camp, toll], state: {}, ctx: {year: 1197, region: "moravia", lines: ["vampire", "werewolf"]}, now: 10, rand: seq([0])});
  assert.equal(st.anchor, "fever-ferry"); assert.equal(st.twist, "changed-miners");
  assert.equal(st.echo.key, "grudge:ivo:pc1");
  assert.deepEqual(st.uses, ["plague:moravia", "cult:konrad", "grudge:ivo:pc1"]);
  assert.deepEqual(st.doors.sort(), ["vampire", "werewolf"], "doors only for lines at the table");
  assert.equal(st.steps.length, 4); assert.equal(st.steps[1].key, "twist", "the twist goes in the middle");
});

test("threads: three open at most, plus one for each player's own hook; an ending frees a slot", () => {
  const board = [{key: "p", kind: "plague", region: "moravia", weight: 3, at: 1}];
  const full = {open: [1, 2, 3].map(i => ({key: `s${i}`, status: "open", anchor: `c${i}`, from: {kind: "war"}, steps: []}))};
  const ctx = {year: 1197, region: "moravia", lines: ["vampire"]};
  assert.equal(T.weave({board, cards: [ferry], state: full, ctx, now: 1}), null, "no free slot");
  const hook = {key: "hk", kind: "hook", about: "pc1", weight: 1, at: 2};
  const own = {...ferry, key: "own", needs: ["hook"]};
  assert.equal(T.weave({board: [hook], cards: [own], state: full, ctx, now: 2}).anchor, "own", "a player's hook always gets a slot");
  const after = T.close(full, "s1", "sealed", 3);
  assert.equal(T.capacity(after).free, 1);
  assert.equal(T.weave({board, cards: [ferry], state: after, ctx, now: 3}).anchor, "fever-ferry");
  assert.equal(after.done[0].ending, "sealed");
});

test("threads: steps come due by their days, the last waits for an ending, refusals stick", () => {
  let st = T.open({}, {key: "k", anchor: "fever-ferry", steps: ferry.steps}, 0);
  assert.equal(T.due(st, 0).length, 1, "the first step is due at once");
  st = T.advance(st, "k", 0);
  assert.equal(T.due(st, 6 * DAY).length, 0); assert.equal(T.due(st, 7 * DAY)[0].step.key, "b");
  st = T.advance(T.advance(st, "k", 7 * DAY), "k", 21 * DAY);
  assert.equal(T.due(st, 999 * DAY).length, 0, "past the last step nothing is due");
  const r = T.refuse({}, "fever-ferry");
  assert.equal(T.weave({board: [{key: "p", kind: "plague", weight: 3, at: 0}], cards: [ferry], state: r, ctx: {region: "moravia", lines: ["vampire"]}, now: 0}), null);
  assert.deepEqual(T.unrefuse(r, "fever-ferry").refused, []);
});

test("threads: the night draw gives an open storyline's beat one time in three", () => {
  const st = T.open({}, {key: "k", title: "Fever", anchor: "fever-ferry", steps: ferry.steps}, 0);
  assert.equal(T.nightBeat(st, () => 0.2).step.key, "a");
  assert.equal(T.nightBeat(st, () => 0.5), null);
  assert.equal(T.nightBeat({}, () => 0), null, "nothing open, the tables draw");
});

test("threads: the age floor keeps romance away from anyone under 18", () => {
  const card = {tags: ["romance"]};
  assert.equal(T.ageSafe(card, ["a", "b"], a => a !== "b"), false);
  assert.equal(T.ageSafe({tags: []}, ["b"], () => false), true);
});

test("threads: the deck has about 150 cards, a unique hook for every world region, and doors for every line", async () => {
  const {CARDS} = await import(pathToFileURL(join(root, "modules/wodx-storyteller/data/threads-cards.mjs")));
  const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs")));
  const deck = CARDS.map(T.normCard);
  assert.ok(deck.length >= 150, `${deck.length} cards`);
  assert.equal(new Set(deck.map(c => c.key)).size, deck.length, "keys are unique");
  for ( const c of deck ) {
    assert.ok(c.needs.length && c.needs.every(k => S.KINDS.includes(k)), `${c.key} answers known signals`);
    assert.ok(Object.keys(c.beneath).length && c.steps.length && c.endings.length, `${c.key} has doors, steps and endings`);
  }
  for ( const [rid, r] of Object.entries(W.WORLD_REGIONS) ) {
    const own = deck.filter(c => c.role === "anchor" && c.regions.includes(rid) && !c.regions.includes("*"));
    assert.ok(own.length, `${rid} has its own hook`);
    const year = Math.max(1197, Number(r.from) || 0);
    const sig = {key: `t:${rid}`, kind: own[0].needs[0], region: rid, weight: 3, at: 0};
    const st = T.weave({board: [sig], cards: CARDS, state: {}, ctx: {year, region: rid, lines: []}, now: 0, rand: () => 0});
    assert.ok(st, `${rid} weaves a storyline in ${year}`);
  }
  for ( const l of T.LINES ) assert.ok(deck.some(c => c.role === "twist" && c.beneath[l]), `${l} has a door`);
  const demon = deck.filter(c => c.key.startsWith("door-demon"));
  assert.ok(demon.every(c => !T.fits(c, {year: 1500, lines: ["demon"]}).ok), "no Demon door before 1999");
  const anchors = deck.filter(c => c.role === "anchor");
  assert.ok(anchors.every(a => deck.some(t => t.role === "twist" && T.shares(a, t))), "every anchor has a twist that can join it");
});

test("threads: a locked storyline waits, and Session Zero lines cut tagged cards", () => {
  let st = T.open({}, {key: "k", title: "Fever", anchor: "fever-ferry", steps: ferry.steps}, 0);
  st = T.lock(st, "k");
  assert.equal(T.due(st, 999 * DAY).length, 0, "nothing comes due while locked");
  assert.equal(T.nightBeat(st, () => 0), null, "a locked storyline gives no night beat");
  assert.equal(T.due(T.lock(st, "k", false), 0).length, 1);
  assert.deepEqual(T.cutsFrom(["No harm to children", "nothing sexual"]).sort(), ["children", "romance"]);
  assert.deepEqual(T.cutsFrom([]), []);
});
