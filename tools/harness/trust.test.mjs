import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.57.0, Sheets 0.18.1: trust, betrayal, boons in every line, blackmail and hidden loyalties (B2847-B2853).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const TRR = await imp("modules/wodx-npc/scripts/trust-rules.mjs");
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const XH = await imp("modules/wodx-sheets/scripts/extras-html.mjs");

test("trust moves by events, stays in -5 to +5 and keeps a short log", () => {
  let t = TRR.moveTrust({}, "b", "rescued", {at: 10});
  assert.equal(t.b.value, 2); assert.equal(t.b.log[0].delta, 2);
  t = TRR.moveTrust(t, "b", "betrayed"); assert.equal(t.b.value, -2);
  for ( let i = 0; i < 5; i++ ) t = TRR.moveTrust(t, "b", "betrayed");
  assert.equal(t.b.value, -5);
  for ( let i = 0; i < 20; i++ ) t = TRR.moveTrust(t, "b", "promiseKept");
  assert.equal(t.b.value, 5); assert.ok(t.b.log.length <= 12);
  assert.equal(TRR.trustWord(5), "Would trust with their life"); assert.equal(TRR.trustWord(-4), "Would not turn their back"); assert.equal(TRR.trustWord(0), "No opinion");
  assert.ok(TRR.sharesSecrets(3) && !TRR.sharesSecrets(2)); assert.ok(TRR.takesRisks(2) && !TRR.takesRisks(1));
  for ( const v of Object.values(TRR.TRUST_EVENTS) ) assert.ok(v.label && Number.isInteger(v.delta));
});

test("a boon paid or refused moves trust; other statuses do not", () => {
  assert.equal(TRR.ledgerEvent({kind: "boon"}, "kept"), "boonPaid");
  assert.equal(TRR.ledgerEvent({kind: "boon"}, "broken"), "boonBroken");
  assert.equal(TRR.ledgerEvent({kind: "oath"}, "broken"), "oathBroken");
  assert.equal(TRR.ledgerEvent({kind: "debt"}, "kept"), "promiseKept");
  assert.equal(TRR.ledgerEvent({kind: "boon"}, "void"), null);
});

test("betrayal: a bonded betrayer rolls Willpower first, an NPC victim plans revenge, the rumour names both", () => {
  const b = TRR.betrayal({kind: "secret", step: 2, victimIsNpc: true, betrayer: "Ana", victim: "Bo"});
  assert.equal(b.needsWillpower, true); assert.equal(b.revenge, true); assert.equal(b.attitude, -2);
  assert.match(b.rumour, /^Ana told what Bo wanted kept hidden$/);
  const c = TRR.betrayal({kind: "nonsense", step: 1, victimIsNpc: false, betrayer: "A", victim: "B"});
  assert.equal(c.needsWillpower, false); assert.equal(c.revenge, false); assert.equal(c.label, "Betrayed them");
});

test("every line has its word for a debt of honour; a boon can change hands while open", () => {
  for ( const l of ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "kueijin", "mortal"] ) assert.ok(TRR.debtWordFor(l).name && TRR.debtWordFor(l).cost, l);
  assert.equal(TRR.debtWordFor("unknown").name, "favour");
  const e = {id: "x", kind: "boon", status: "open", from: {id: "a", name: "A"}, to: {id: "b", name: "B"}};
  const n = TRR.tradeBoon(e, {id: "c", name: "Cy"});
  assert.equal(n.to.id, "c"); assert.equal(n.from.id, "a"); assert.match(n.history.at(-1).what, /Cy/);
  assert.equal(TRR.tradeBoon({...e, status: "kept"}, {id: "c"}), null);
  assert.equal(TRR.tradeBoon({...e, kind: "debt"}, {id: "c"}), null);
});

test("blackmail: the proof fits the era from 1197 to the far future, the price by weight and Resources", () => {
  assert.match(TRR.proofFor(1197).proof, /letter/);
  assert.match(TRR.proofFor(1890).proof, /photograph/);
  assert.match(TRR.proofFor(2000).keep, /server/);
  assert.match(TRR.proofFor(2300).proof, /net/);
  assert.equal(TRR.blackmailPrice(2, 3), 6); assert.equal(TRR.blackmailPrice(0, 0), 1);
  assert.deepEqual(Object.keys(TRR.RESPONSES), ["pay", "strike", "confess"]);
});

test("hidden loyalties: the senses by line, and a hidden tie to the leader that only the Storyteller sees", () => {
  assert.ok(TRR.sensesFor("vampire").some(s => /Auspex/.test(s.power)));
  assert.ok(TRR.sensesFor("werewolf").some(s => /Truth of Gaia/.test(s.power)));
  assert.ok(TRR.sensesFor("mage").some(s => /Mind/.test(s.power)));
  assert.ok(TRR.sensesFor("wraith").every(s => s.line === "mortal"), "a line without its own sense falls back to Empathy");
  assert.equal(TRR.normSide({}), null);
  const actors = [{id: "s", name: "Spy", flags: {"wodx-npc": {trueSide: {faction: "f1", name: "The Sabbat", leader: {id: "l", name: "Bishop"}}}}}, {id: "l", name: "Bishop"}];
  const e = TR.edges(actors);
  const t = e.find(x => x.from === "s" && x.kind === "spyFor");
  assert.ok(t && t.hidden && t.to.id === "l" && /Sabbat/.test(t.note));
  assert.ok(e.some(x => x.from === "l" && x.kind === "spiedBy" && x.hidden));
  assert.equal(TR.KINDS.spyFor.back, "spiedBy"); assert.equal(TR.KINDS.spiedBy.back, "spyFor");
});

test("trust shows on a tie, and the Relationships tab prints it", () => {
  const actors = [{id: "a", name: "Ana", flags: {"wodx-npc": {trust: {b: {value: 3, log: []}}}, "wodx-sheets": {ties: [{uuid: "Actor.bbbbbbbbbbbbbbbb", role: "friend"}]}}},
    {id: "bbbbbbbbbbbbbbbb", name: "Bo"}];
  actors[0].flags["wodx-npc"].trust = {bbbbbbbbbbbbbbbb: {value: 3, log: []}};
  const e = TR.edges(actors).find(x => x.from === "a" && x.kind === "friend");
  assert.equal(e.trust, "Trusts");
  const html = XH.relationsHtml([{kind: "friend", label: "Friend", groupLabel: "Friends", name: "Bo", uuid: "Actor.b", note: "", source: "hand", trust: "Trusts"}], {editable: false});
  assert.match(html, /Trusts/);
});

test("wiring: the Ledger hook, rumours, attitude, the hold on the victim and the API", () => {
  const t = src("modules/wodx-npc/scripts/trust.mjs"), main = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(t, /Hooks\.on\("wodxBoonSettled"/);
  assert.match(t, /rumours\?\.start\?\.\(\{text: b\.rumour, tellers: \[of\.id\], source: of\.id, about: by\.id/);
  assert.match(t, /attitude\?\.apply\?\.\(of, by, \{delta: b\.attitude/);
  assert.match(t, /flags\.\$\{MOD\}\.blackmail\.\$\{entry\.id\}/);
  assert.match(t, /secrets\?\.expose\?\./);
  assert.match(main, /TRUST\.listen\(\);/); assert.match(main, /trust: \{of: TRUST\.trustOf/);
  // The Storyteller's API names this file calls
  const sm = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const k of ["save: Led.saveEntry", "status: Led.setStatus", "start: Rumours.startRumour", "transfer: Money.transfer"] ) assert.ok(sm.includes(k), k);
});
