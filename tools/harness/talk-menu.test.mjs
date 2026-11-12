import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The topic menu (NPC 0.10.0): players ask an NPC about topics and get the Storyteller's own lines */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const TK = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/talk-rules.mjs")));
const NR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/npc-rules.mjs")));
const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/when-rules.mjs")));

const SHEET = `[greet] Nods without looking up from the ledger.
[none] Shrugs and goes back to work.
[offer] the mill, News
[the abbot] kind kindred => Will not speak of the abbot to a Cainite.
[the abbot] standing the abbey >= welcome => Says the abbot walks the cloister after Compline. | teach the cloister; codex Rothenstein Abbey
[the abbot] Crosses themself and changes the subject.
[work] year 1900-2025 => Mentions the night shift at the mill. | teach the mill; aloud; tell The miller is listening
[Rumors] night => Talk of a wolf on the road.
Grumbles about the price of salt.
# a note`;

const check = ctx => when => W.checkWhen(W.parseWhen(when), ctx).ok;

test("a talk sheet: topics, greeting, the none line, offers and what follows", () => {
  const s = TK.parseSheet(SHEET);
  assert.deepEqual(s.offers, ["the mill", "news"]);
  assert.equal(s.lines.length, 8);
  assert.deepEqual(s.lines.map(l => l.kind), ["greet", "none", "topic", "topic", "topic", "topic", "topic", "note"]);
  const abbot = s.lines[3];
  assert.equal(abbot.topic, "the abbot");
  assert.equal(abbot.when, "standing the abbey >= welcome");
  assert.deepEqual(abbot.then.teach, ["the cloister"]);
  assert.deepEqual(abbot.then.codex, ["Rothenstein Abbey"]);
  const work = s.lines[5];
  assert.equal(work.then.aloud, true);
  assert.equal(work.then.run, "tell The miller is listening");
  assert.equal(s.lines[6].topic, "rumours", "spellings are joined");
  assert.equal(s.lines[7].then.run, "", "a note's | stays in its text");
});

test("old talk sheets still read as before, and topic lines show with their topic", () => {
  const lines = NR.parseTalk("kind kindred => Will not speak of the abbot to a Cainite.\ncarries seal => Opens the archive.\nGrumbles about the price of salt. | not a then\n# a note");
  assert.equal(lines.length, 3);
  assert.equal(lines[2].say, "Grumbles about the price of salt. | not a then");
  assert.equal(NR.talkFor(NR.parseTalk(SHEET), null).length, 8);
});

test("the menu: only topics this person can be asked, known or offered", () => {
  const chain = TK.chainFor({own: SHEET});
  let m = TK.menuFor(chain, {learned: [], codex: []});
  assert.deepEqual(m.ask, ["the mill"], "the abbot is unknown; offers show; news stays a local topic");
  assert.deepEqual(m.local, ["news", "rumours", "work", "directions"]);
  m = TK.menuFor(chain, {learned: [], codex: ["The Abbot of Rothenstein"]});
  assert.deepEqual(m.ask, ["the abbot", "the mill"], "a codex page teaches a topic");
  m = TK.menuFor(chain, {learned: ["the cloister", "The Abbot"], codex: []});
  assert.deepEqual(m.ask, ["the abbot", "the mill"], "a taught topic no sheet mentions stays off");
  assert.ok(TK.canAsk("News", m) && TK.canAsk("the abbot", m) && !TK.canAsk("the cloister", m));
});

test("answers: first fitting line, own sheet before shared sheets, then none", () => {
  const shared = {"household:the kessler farm": "[the abbot] Says the abbot owes them for a cow.\n[directions] Points down the Linberg road.",
    "everyone": "[none] Does not answer.\n[rumours] They say the bishop is ill."};
  const chain = TK.chainFor({own: SHEET, household: "The Kessler farm", factions: [], sceneId: "s1"}, shared);
  assert.deepEqual(chain.map(s => s.from), ["own", "household:the kessler farm", "everyone"]);
  const vamp = {actor: {kind: "kindred", standing: {}}}, friend = {actor: {kind: "mortal", standing: {"the abbey": 5}}}, mortal = {actor: {kind: "mortal", standing: {}}};
  assert.match(TK.answerFor("the abbot", chain, check(vamp)).line.say, /Cainite/);
  assert.match(TK.answerFor("The Abbot", chain, check(friend)).line.say, /Compline/);
  assert.match(TK.answerFor("the abbot", chain, check(mortal)).line.say, /Crosses/);
  assert.match(TK.answerFor("directions", chain, check(mortal)).line.say, /Linberg/, "the household answers what the NPC does not");
  const day = {year: 1250, night: false, actor: mortal.actor};
  const r = TK.answerFor("rumours", chain, check(day));
  assert.equal(r.from, "everyone");
  assert.match(r.line.say, /bishop/);
  const w = TK.answerFor("work", chain, check(day));
  assert.equal(w.none, true, "the 1900s line does not fit 1250, so the none line answers");
  assert.match(w.line.say, /Shrugs/);
  assert.equal(TK.answerFor("work", [TK.chainFor({own: "[work] year 1900-2025 => x"})[0]], check(day)), null);
  assert.equal(TK.answersFor("the abbot", chain, check(friend)).length, 3);
  assert.equal(TK.greetFor(chain, check(mortal)).say, "Nods without looking up from the ledger.");
});

test("every era: one NPC answers in 1197, 1897 and 2097 with the line written for each", () => {
  const sheet = "[news] year 1197-1499 => Speaks of the crusade.\n[news] year 1500-1999 => Reads from the broadsheet.\n[news] branch future => Taps the feed on their wrist.\n[news] Has heard nothing.";
  const chain = TK.chainFor({own: sheet});
  const at = (year, branch = "") => TK.answerFor("news", chain, check({year, branch, actor: {kind: "mortal"}})).line.say;
  assert.match(at(1197), /crusade/);
  assert.match(at(1897), /broadsheet/);
  assert.match(at(2097, "future"), /feed/);
  assert.match(at(2020), /nothing/);
});

test("distance: side by side is 1 square, overlap 0, big tokens measured edge to edge", () => {
  const t = (x, y, w = 100, h = 100) => ({x, y, w, h});
  assert.equal(TK.squaresBetween(t(0, 0), t(100, 0), 100), 1);
  assert.equal(TK.squaresBetween(t(0, 0), t(100, 100), 100), 1, "diagonal neighbours");
  assert.equal(TK.squaresBetween(t(0, 0), t(200, 0), 100), 2);
  assert.equal(TK.squaresBetween(t(0, 0), t(0, 0), 100), 0);
  assert.equal(TK.squaresBetween(t(0, 0, 200, 200), t(300, 0), 100), 2);
});

test("nobody targeted: the nearest person within reach", () => {
  const me = {x: 0, y: 0, w: 100, h: 100};
  const o = [{id: "far", x: 900, y: 0, w: 100, h: 100}, {id: "two", x: 200, y: 0, w: 100, h: 100}, {id: "one", x: 100, y: 100, w: 100, h: 100}];
  assert.equal(TK.nearestFor(me, o, 100, 2).id, "one");
  assert.equal(TK.nearestFor(me, [o[0]], 100, 2), null);
  assert.equal(TK.nearestFor(me, [], 100, 2), null);
});

test("taught topics: added once, undone exactly", () => {
  const l = TK.addLearned(["the mill"], ["The Mill", "the cloister"]);
  assert.deepEqual(l, ["the mill", "the cloister"]);
  assert.deepEqual(TK.dropLearned(l, ["the cloister"]), ["the mill"]);
  assert.ok(TK.knowsTopic("cloister", {learned: [], codex: ["The cloister of St. Aegidius"]}));
  assert.ok(!TK.knowsTopic("inn", {learned: [], codex: ["Reinhold the miller"]}), "short topics need the whole name");
});

test("the Foundry side: answers decided on the Storyteller's client, the toolbar button, the settings", () => {
  const t = src("modules/wodx-npc/scripts/talk.mjs"), m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(t, /type: "talk\.req"/);
  assert.match(t, /if \( m\?\.type !== "talk\.req" \|\| !isActiveGM\(\) \) return;/);
  assert.match(t, /savedProfile\(r\.npcTok\.actor\)\.talkAsk && !user\.isGM/);
  assert.match(t, /"talkReach"/);
  assert.match(t, /searchBox\("ul\.wnpc-talk-ask"/);
  assert.match(m, /tokens\.tools\.wodxTalk = /);
  assert.match(m, /talkAsk: data\.talkAsk \? true : null/);
  assert.match(m, /openTalk: talk\.openTalk/);
  assert.equal(JSON.parse(src("modules/wodx-npc/module.json")).version, "0.23.0");
});

/* NPC 0.12.0 + Chronicle 0.15.0: talk lines that test the NPC's attitude and a won social roll */
test("talk lines can test the NPC's attitude and a persuasion by that NPC", () => {
  const sheet = `[the toll] attitude >= welcome => Waves the cart through.
[the toll] persuaded => Agrees to look the other way, once.
[the toll] Wants the full toll.`;
  const chain = TK.chainFor({own: sheet, household: null, factions: [], sceneId: null}, {});
  const base = {time: 1000, actor: {pc: true, name: "Anna", sways: []}};
  const say = ctx => TK.answerFor("the toll", chain, check(ctx))?.line?.say;
  assert.equal(say({...base, npc: {id: "n1", name: "Toll keeper", attitude: 0}}), "Wants the full toll.");
  assert.equal(say({...base, npc: {id: "n1", name: "Toll keeper", attitude: 2}}), "Waves the cart through.");
  const swayed = {...base, actor: {...base.actor, sways: [{kind: "persuaded", npc: "n1", npcName: "Toll keeper", until: 4600}]}};
  assert.equal(say({...swayed, npc: {id: "n1", name: "Toll keeper", attitude: 0}}), "Agrees to look the other way, once.");
  // Someone else's persuasion, or an old one, does not count
  assert.equal(say({...swayed, npc: {id: "n2", name: "Guard", attitude: 0}}), "Wants the full toll.");
  assert.equal(say({...swayed, time: 9000, npc: {id: "n1", name: "Toll keeper", attitude: 0}}), "Wants the full toll.");
});
