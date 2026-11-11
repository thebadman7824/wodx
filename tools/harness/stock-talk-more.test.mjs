import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* More stock talk (NPC 0.12.0): notices, voices, small talk, memory, debts, farewells, barks, cries, trade, social rolls */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const TK = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/talk-rules.mjs")));
const S = await import(pathToFileURL(join(root, "modules/wodx-npc/data/stock-talk.mjs")));
const M = await import(pathToFileURL(join(root, "modules/wodx-npc/data/stock-talk-more.mjs")));

const all = [];
const walk = (o, key = "") => { if ( typeof o === "string" ) { if ( key !== "label" ) all.push(o); } else if ( Array.isArray(o) ) o.forEach(x => walk(x)); else if ( o && typeof o === "object" ) Object.entries(o).forEach(([k, v]) => walk(v, k)); };
for ( const k of ["NOTICE", "CRY_ALARM", "CRY_HURT", "BARK", "BARK_ERA", "TRADE", "SOCIAL", "VOICES", "SMALL", "ABOUT_YOU", "FAREWELL", "REMEMBER", "LEDGER"] ) walk(M[k]);

test("the new library: every kind has lines, every era its cries and farewells", () => {
  assert.ok(all.length >= 400, `${all.length} lines`);
  for ( const era of Object.keys(S.ERAS) ) {
    assert.ok(M.CRY_ALARM[era].length >= 4, era);
    for ( const w of ["cold", "neutral", "warm"] ) assert.ok(M.FAREWELL[era][w].length >= 2, `${era} ${w}`);
    assert.ok(M.BARK_ERA[era].work.length && M.BARK_ERA[era].patrol.length, era);
  }
  for ( const k of TK.NOTICE_ORDER ) assert.ok(M.NOTICE[k]?.length >= 2, k);
  for ( const r of S.REGARDS ) assert.ok(M.ABOUT_YOU[r].length >= 2, r);
  for ( const act of ["sleep", "rest", "work", "pray", "drink", "patrol", "hunt", "hide", "errand", "attend", "wander"] ) assert.ok(M.BARK[act]?.length, act);
  for ( const a of ["persuade", "intimidate", "bribe", "charm", "deceive", "seduce"] ) assert.ok(M.SOCIAL[a].win.length >= 3 && M.SOCIAL[a].lose.length >= 3, a);
  for ( const [k, v] of Object.entries(M.VOICES) ) {
    for ( const w of ["cold", "neutral", "warm"] ) assert.ok(v.greet[w].length >= 2, `${k} ${w}`);
    assert.ok(v.none.length >= 2 && v.gossip.length >= 2 && v.label, k);
  }
  for ( const k of ["clergy", "noble", "merchant", "soldier", "criminal", "scholar", "servant", "peasant", "corporate", "street", "child", "beggar", "drunk"] ) assert.ok(M.VOICES[k], k);
});

test("the writing: gender-neutral, no dashes for pauses, quoted speech, no line twice in either library", () => {
  const old = [];
  const w2 = o => { if ( typeof o === "string" ) old.push(o); else if ( Array.isArray(o) ) o.forEach(w2); else if ( o && typeof o === "object" ) Object.values(o).forEach(w2); };
  for ( const k of ["GREET", "NONE", "RUMOUR_LEAD", "RUMOUR_REFUSE", "GOSSIP", "NEWS", "WORK", "DIRECTIONS"] ) w2(S[k]);
  for ( const l of all ) {
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(l), l);
    assert.ok(!/—|--/.test(l), l);
    assert.ok(/^".+"$/.test(l), l);
  }
  const both = [...all, ...old];
  assert.equal(new Set(both).size, both.length, "no line twice");
});

test("voices: the Storyteller's choice, else a word in a faction or household; corporate waits for 1980", () => {
  assert.equal(TK.voiceFor({voice: "drunk"}, M.VOICES), "drunk");
  assert.equal(TK.voiceFor({factions: ["rothenstein-abbey"]}, M.VOICES), "clergy");
  assert.equal(TK.voiceFor({household: "The Kessler farm"}, M.VOICES), "peasant");
  assert.equal(TK.voiceFor({factions: ["Night Watch"]}, M.VOICES), "soldier");
  assert.equal(TK.voiceFor({factions: ["Endron Corp"], year: 1700}, M.VOICES), null, "no corporations in 1700");
  assert.equal(TK.voiceFor({factions: ["Endron Corp"], year: 1999}, M.VOICES), "corporate");
  assert.equal(TK.voiceFor({factions: ["the Tremere"]}, M.VOICES), null);
  const v = {...M.VOICES.child, only: true};
  assert.ok(M.VOICES.child.greet.warm.includes(TK.stockLine("greet", {stock: S, era: "medieval", regard: "love", seed: 3, voice: v}).say), "a child keeps to a child's words");
  const mixed = new Set([0, 1, 2, 3, 4, 5, 6].map(seed => TK.stockLine("greet", {stock: S, era: "medieval", regard: "neutral", seed, voice: M.VOICES.clergy}).say));
  assert.ok([...mixed].some(l => M.VOICES.clergy.greet.neutral.includes(l)) && [...mixed].some(l => S.GREET.medieval.neutral.includes(l)), "others mix their voice with the era's words");
});

test("notices, small talk, memory, debts and talk of the character", () => {
  const vamp = t => t === "kind kindred", hurtWolf = t => t === "wounded" || t === "kind lupine";
  assert.equal(TK.noticeFor(vamp), "kindred");
  assert.equal(TK.noticeFor(hurtWolf), "wounded", "a wound shows before what they are");
  assert.equal(TK.noticeFor(() => false), null);
  assert.equal(TK.monthOfJdn(2451545), 1, "1 January 2000");
  assert.equal(TK.monthOfJdn(2451727), 7, "1 July 2000");
  assert.deepEqual(TK.smallTalkKeys({feast: "Easter", night: true}, ["rain", "mist"], 4), ["feast", "rain", "fog", "night", "spring"]);
  assert.equal(TK.smallTalk(M.SMALL, ["feast"], {seed: 0, feast: "Easter"}), "\"A blessed Easter to you.\"");
  assert.equal(TK.smallTalk(M.SMALL, [], {}), null);
  assert.equal(TK.rememberOf(0, 86400 * 3), "soon");
  assert.equal(TK.rememberOf(0, 86400 * 100), null);
  assert.equal(TK.rememberOf(0, 86400 * 400), "long");
  assert.equal(TK.rememberOf(undefined, 5), null);
  const L = [{kind: "debt", status: "open", from: {id: "pc"}, to: {id: "npc"}}, {kind: "debt", status: "kept", from: {id: "npc"}, to: {id: "pc"}}];
  assert.equal(TK.ledgerBetween(L, "npc", "pc"), "youOwe");
  assert.equal(TK.ledgerBetween([L[1]], "npc", "pc"), null, "a paid debt is forgotten");
  assert.equal(TK.ledgerBetween([{kind: "boon", from: {id: "npc"}, to: {id: "pc"}}], "npc", "pc"), "iOwe");
  const rum = [{id: 1, text: "Anna Novak drowned a man in the Svratka."}, {id: 2, text: "Prices are up.", ended: false}];
  assert.equal(TK.rumourAbout(rum, "Anna Novak")?.id, 1);
  assert.equal(TK.rumourAbout(rum, "Annabel")?.id ?? null, null, "a whole word, not part of one");
  assert.equal(TK.rumourAbout(rum, "Jo"), null, "too short a name to match");
  assert.equal(TK.composeGreet({greet: "\"Hello.\"", remember: "\"Back so soon?\"", notice: "\"You're hurt!\"", small: "\"Rain.\""}), "\"Back so soon?\" \"You're hurt!\"");
  assert.equal(TK.composeGreet({greet: "\"Hello.\"", small: "\"Rain.\""}), "\"Hello.\" \"Rain.\"");
});

test("farewells, cries, barks, trade and social rolls", () => {
  const at = (kind, o = {}) => TK.moreLine(kind, {more: M, seed: 1, ...o});
  assert.ok(M.FAREWELL.medieval.warm.includes(at("farewell", {era: "medieval", regard: "love"})));
  assert.ok(M.FAREWELL.future.cold.includes(at("farewell", {era: "future", regard: "hate"})));
  assert.ok(M.CRY_ALARM.nineteenth.includes(at("cry:alarm", {era: "nineteenth"})));
  assert.ok(M.CRY_HURT.includes(at("cry:hurt")));
  const b = at("bark:patrol", {era: "earlymodern"});
  assert.ok([...M.BARK_ERA.earlymodern.patrol, ...M.BARK.patrol].includes(b));
  assert.equal(at("bark:nothing"), null);
  assert.ok(M.TRADE.open.warm.includes(at("trade:open", {regard: "like"})));
  assert.ok(M.TRADE.refuse.includes(at("trade:refuse", {regard: "hate"})));
  assert.ok(M.TRADE.haggleLose.includes(at("trade:refuse", {regard: "neutral"})), "only the hostile refuse outright");
  assert.ok(M.SOCIAL.bribe.win.includes(at("social:bribe:win")));
  assert.ok(M.SOCIAL.deceive.lose.includes(at("social:deceive:lose")));
  assert.equal(TK.moreLine("farewell", {}), null);
});

test("the Foundry side: greeting asides, Goodbye, remarks and cries, the API and the behaviour form", () => {
  const t = src("modules/wodx-npc/scripts/talk.mjs"), m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(t, /if \( kind === "bye" \) return/);
  assert.match(t, /remember: greet \? "" : a\.remember/, "the Storyteller's greeting is never replaced");
  assert.match(t, /Hooks\.on\("wodxPlaceAlarm"/);
  assert.match(t, /Hooks\.on\("wodxDamageApplied"/);
  assert.match(t, /"barks"/);
  assert.match(t, /return \{registerSettings, hooks, openTalk, serve, editShared, talkHtml, speakerToken, stock, say, bark/);
  assert.match(m, /noBarks: data\.noBarks \? true : null, voice: VOICES\[data\.voice\]/);
});
