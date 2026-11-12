import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.30.0, Chronicle 0.31.0, Sheets 0.11.0: relationships, the lineage tree, secrets and hooks, why an NPC
// feels as they do, and talk lines that need a trait (the Improvement Desk's "people" group).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const SX = await imp("modules/wodx-npc/scripts/secrets-rules.mjs");
const OP = await imp("modules/wodx-npc/scripts/opinion-rules.mjs");
const PO = await imp("modules/wodx-npc/scripts/politics-rules.mjs");
const F = await imp("modules/wodx-npc/scripts/faction-rules.mjs");
const TK = await imp("modules/wodx-npc/scripts/talk-rules.mjs");
const W = await imp("modules/wodx-chronicle/scripts/when-rules.mjs");
const XH = await imp("modules/wodx-sheets/scripts/extras-html.mjs");

const id = c => c.repeat(16);
const A = id("a"), B = id("b"), C = id("c"), D = id("d"), G = id("g"), H = id("h"), M = id("m"), P = id("p");
const actor = (aid, name, type = "Vampire", flags = {}, system = {}) => ({id: aid, name, type, flags, system});
const world = () => [
  actor(A, "Anezka"),
  actor(B, "Bohus", "Vampire", {"wodx-creation": {lineage: {sire: {id: A, name: "Anezka"}}}}),
  actor(C, "Cyril", "Vampire", {}, {sire: "Bohus"}),
  actor(D, "Dita", "Vampire", {"wodx-creation": {lineage: {sire: {id: B, name: "Bohus"}}}, "wodx-npc": {secrets: [{id: "s1", kind: "childe", text: "Bohus made Dita without leave", tie: {kind: "childe", id: D}, found: {}}]}}),
  actor(G, "Gita", "Mortal", {"wodx-creation": {lineage: {domitor: {id: A, name: "Anezka"}, bonds: {[A]: {name: "Anezka", drinks: 3}}}}}),
  actor(H, "Hana", "Mortal", {"wodx-creation": {lineage: {family: {heirOf: {id: G, name: "Gita"}}}, ally: {patron: {id: P, name: "Petr"}}}}),
  actor(M, "Milos", "Mage", {"wodx-sheets": {ties: [{uuid: `Actor.${P}`, role: "mentor", note: "taught the Arts"}, {uuid: `Actor.${A}`, role: "rival", hidden: true}, {uuid: "Scene.xyz", role: "haven"}]}}),
  actor(P, "Petr", "Mage")
];
// The secret on Dita's sheet above hides Bohus's childe; it belongs on Bohus. Move it there for the tests that need it.
const worldWithSecret = () => {
  const w = world();
  w[1].flags["wodx-npc"] = {secrets: [{id: "s1", kind: "childe", text: "made Dita without leave", tie: {kind: "childe", id: D}, found: {}}]};
  delete w[3].flags["wodx-npc"];
  return w;
};
const secretsBy = w => hid => SX.secretsOf(w.find(a => a.id === hid)?.flags);

test("every stored link reads from both ends", () => {
  const e = TR.edges(world(), {ledger: [{kind: "boon", size: "minor", status: "open", from: {id: H, name: "Hana"}, to: {id: P, name: "Petr"}, what: "a safe road"}]});
  const has = (f, k, t) => e.some(x => x.from === f && x.kind === k && x.to.id === t);
  assert.ok(has(B, "sire", A) && has(A, "childe", B), "lineage sire and the childe it makes");
  assert.ok(has(C, "sire", B) && has(B, "childe", C), "the sheet's Sire box matched by name");
  assert.ok(has(G, "domitor", A) && has(A, "ghoul", G), "domitor and ghoul");
  assert.equal(e.find(x => x.from === G && x.kind === "domitor").note, "full bond", "the domitor's bond goes on the domitor link");
  assert.ok(!has(G, "bondTo", A), "no second bond line for the domitor");
  assert.ok(has(H, "heirOf", G) && has(G, "heir", H), "a mortal heir from Pass the Years");
  assert.ok(has(H, "patron", P) && has(P, "retainer", H), "an Ally or Retainer Background");
  assert.ok(has(M, "mentor", P) && has(P, "apprentice", M), "a hand-made tie and its other end");
  assert.ok(has(H, "owes", P) && has(P, "owed", H), "an open boon in the Ledger");
  const hav = e.find(x => x.from === M && x.kind === "haven");
  assert.equal(hav.uuid, "Scene.xyz", "a haven keeps its scene");
  assert.equal(e.find(x => x.from === M && x.kind === "mentor").hand, `Actor.${P}`, "the hand tie can be edited from its own sheet");
  assert.equal(e.find(x => x.from === P && x.kind === "apprentice").hand, null, "but not from the other end");
  assert.ok(e.find(x => x.from === M && x.kind === "rival").hidden && e.find(x => x.from === A && x.kind === "rival").hidden, "a hidden hand tie is hidden at both ends");
});

test("an old Sheets role still reads, and a tie to oneself is dropped", () => {
  const e = TR.edges([actor(A, "Anezka", "Vampire", {"wodx-sheets": {ties: [{uuid: `Actor.${A}`, role: "ally"}, {uuid: `Actor.${B}`, role: "kin"}, {uuid: `Actor.${C}`, role: "bogus"}]}}), actor(B, "Bohus"), actor(C, "Cyril")]);
  assert.ok(!e.some(x => x.to.id === A && x.from === A));
  assert.equal(e.find(x => x.from === A && x.to.id === B).kind, "kin");
  assert.equal(e.find(x => x.from === A && x.to.id === C).kind, "other");
});

test("a secret hides a link from players until it is found", () => {
  const w = worldWithSecret();
  const list = TR.hideBySecrets(TR.edges(w), secretsBy(w));
  const childe = list.find(x => x.from === B && x.kind === "childe" && x.to.id === D);
  const sire = list.find(x => x.from === D && x.kind === "sire");
  assert.equal(childe.secret, `${B}:s1`); assert.equal(sire.secret, `${B}:s1`);
  assert.ok(!TR.visibleTo(childe, {mine: new Set([C])}), "another player does not see it");
  assert.ok(TR.visibleTo(childe, {mine: new Set([B])}) && TR.visibleTo(sire, {mine: new Set([D])}), "both ends know");
  assert.ok(TR.visibleTo(childe, {mine: new Set([C]), found: new Set([`${B}:s1`])}), "found out");
  assert.ok(TR.visibleTo(childe, {gm: true}));
  const hiddenHand = list.find(x => x.from === M && x.kind === "rival");
  assert.ok(!TR.visibleTo(hiddenHand, {mine: new Set([M])}), "the Storyteller's hidden tie stays theirs, even for its owner");
});

test("the lineage tree climbs to the oldest known and hides a secret childe", () => {
  const w = worldWithSecret();
  const list = TR.hideBySecrets(TR.edges(w), secretsBy(w));
  const isVampire = x => w.find(a => a.id === x)?.type === "Vampire";
  const names = Object.fromEntries(w.map(a => [a.id, a.name]));
  const t = TR.treeFor(D, list, {viewer: {gm: true}, names, isVampire});
  const blood = t.lines.find(l => l.key === "blood");
  assert.deepEqual(blood.up.map(n => n.name), ["Bohus", "Anezka", "Unknown sire"], "nearest first, then the sire nobody recorded");
  const fromA = TR.treeFor(A, list, {viewer: {mine: new Set([A])}, names, isVampire}).lines.find(l => l.key === "blood");
  const kidsOfB = fromA.down.find(n => n.name === "Bohus").kids.map(n => n.name);
  assert.deepEqual(kidsOfB, ["Cyril"], "Dita is left out for a player who has not found the secret");
  const fromAgm = TR.treeFor(A, list, {viewer: {gm: true}, names, isVampire}).lines.find(l => l.key === "blood");
  const dita = fromAgm.down.find(n => n.name === "Bohus").kids.find(n => n.name === "Dita");
  assert.ok(dita?.hidden, "the Storyteller sees Dita, marked");
  const fromDplayer = TR.treeFor(D, list, {viewer: {mine: new Set([C])}, names, isVampire}).lines.find(l => l.key === "blood");
  assert.equal(fromDplayer.up[0].name, "Unknown", "going up, a secret link is Unknown");
  const g = TR.treeFor(G, list, {viewer: {gm: true}, names, isVampire});
  assert.ok(g.lines.some(l => l.key === "ghouls") && g.lines.some(l => l.key === "heirs"));
  assert.equal(TR.treeFor(P, list, {viewer: {gm: true}, names}).lines.find(l => l.key === "teaching").down[0].name, "Milos");
});

test("a lineage loop does not hang the tree", () => {
  const w = [actor(A, "A", "Vampire", {"wodx-creation": {lineage: {sire: {id: B, name: "B"}}}}), actor(B, "B", "Vampire", {"wodx-creation": {lineage: {sire: {id: A, name: "A"}}}})];
  const t = TR.treeFor(A, TR.edges(w), {viewer: {gm: true}, isVampire: () => true});
  assert.ok(t.lines[0].up.length <= 2);
});

test("secrets: who cares changes with the court and the age", () => {
  assert.equal(SX.caresAbout("heresy", {polity: "inquisition", year: 1300}), 2);
  assert.equal(SX.caresAbout("heresy", {polity: "camarilla", year: 1500}), 1, "a church age");
  assert.equal(SX.caresAbout("heresy", {polity: "camarilla", year: 1990}), 0);
  assert.equal(SX.caresAbout("infernal", {polity: "anarch", year: 1990}), 2, "infernalism always");
  assert.equal(SX.caresAbout("defection", {polity: "technocracy-construct", year: 1950}), 2);
  assert.equal(SX.caresAbout("diablerie", {polity: "sabbat", year: 1600}), 0, "the Sabbat does not punish it");
  assert.equal(SX.caresAbout("diablerie", {polity: "camarilla", year: 1600}), 2);
  assert.equal(SX.caresAbout("sect", {polity: "camarilla", year: 1450}), 0, "no Sabbat to have ties to before 1493");
  assert.equal(SX.caresAbout("sect", {polity: "camarilla", year: 1500}), 2);
});

test("secrets: digging finds the oldest one when the roll is good enough", () => {
  const list = [{id: "x", kind: "debt", text: "owes the Giovanni", weight: 1}, {id: "y", kind: "infernal", text: "a pact", weight: 2}];
  const hi = () => 0.95, lo = () => 0.0;
  const ok = SX.dig({secrets: list, charId: P, pool: 4, diff: 7, rand: hi});
  assert.ok(ok.found && ok.secret.id === "x" && ok.need === 1);
  const bad = SX.dig({secrets: list, charId: P, pool: 4, diff: 7, rand: lo});
  assert.ok(!bad.found && bad.botch);
  const aura = SX.reachable(list, "aura", P);
  assert.deepEqual(aura.map(s => s.id), ["y"], "Aura Perception sees only what marks the soul");
  assert.equal(SX.successesNeeded(list[1], "investigate"), 3); assert.equal(SX.successesNeeded(list[1], "telepathy"), 2);
  const after = SX.withFound(list, "x", P, {at: 5, how: "Investigation", entry: "e1"});
  assert.deepEqual(SX.reachable(after, "investigate", P).map(s => s.id), ["y"], "a found secret is not found again");
  const h = SX.hookEntry(list[0], {id: A, name: "Anezka"}, {id: P, name: "Petr"}, 9);
  assert.equal(h.kind, "boon"); assert.equal(h.size, "major"); assert.equal(h.from.id, A); assert.equal(h.to.id, P);
});

test("secrets: a clue's words find the right one", () => {
  const pool = [{holder: "a", secret: {id: "1", kind: "debt", text: "owes the Giovanni a blood boon"}}, {holder: "b", secret: {id: "2", kind: "diablerie", text: "drank the elder in the crypt"}}];
  assert.equal(SX.matchText(pool, "the elder in the crypt").secret.id, "2");
  assert.equal(SX.matchText(pool, "diablerie").secret.id, "2", "the kind's name counts");
  assert.equal(SX.matchText(pool, "nothing like it"), null);
});

test("politics: a hook makes a charge with proof, and the gathering lays it bare", () => {
  const info = {p: {name: "Ottokar", status: 4, attrs: {manipulation: 4}}, a: {name: "Anezka", status: 3, attrs: {manipulation: 3}}, b: {name: "Bohus", status: 1}};
  const f = F.normFaction({id: "court", name: "The court", kind: "kindred", leader: "p", members: ["p", "a", "b"], assets: {status: 4}, polity: "camarilla"});
  const hooks = [{holder: "b", finder: "a", secret: SX.normSecret({id: "s", kind: "diablerie", text: "drank an elder", weight: 2}), entry: "e9"}];
  let charge = null;
  for ( let seed = 1; seed < 400 && !charge; seed++ ) {
    let x = seed; const rand = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
    const out = PO.innerTurn(f, {rand, polity: "camarilla", info, turn: 1, year: 1700, hooks});
    charge = out.changes.find(c => c.op === "pol-docket" && c.charge.by === "a")?.charge ?? null;
  }
  assert.ok(charge, "Anezka accuses at some point");
  assert.equal(charge.against, "b"); assert.equal(charge.law, "diablerie"); assert.equal(charge.proof, 2); assert.equal(charge.hook.entry, "e9");
  const g = {...f, politics: PO.normPolitics({docket: [charge]})};
  assert.equal(g.politics.docket[0].hook.secret, "s", "the docket keeps the proof");
  // At the gathering the proof weighs and the secret comes out, whatever the verdict
  const every = PO.POLITIES.camarilla.gathering.every;
  const due = {...f, politics: PO.normPolitics({docket: [charge], inner: every - 1})};
  const heard = PO.innerTurn(due, {rand: () => 0.5, polity: "camarilla", info, turn: 2, year: 1700, hooks: []});
  assert.ok(heard.gathering, "the gathering is due");
  const ex = heard.changes.find(c => c.op === "pol-expose");
  assert.ok(ex && ex.holder === "b" && ex.secret === "s" && ex.entry === "e9" && ex.finder === "a");
  assert.ok(heard.changes.some(c => c.op === "pol-rank" && c.actor === "b" && c.delta === -1), "with proof of a grave secret the charge sticks");
  assert.ok(PO.POL_OPS.has("pol-expose"));
  assert.equal(PO.politicsBig({op: "pol-expose", holder: "pc"}, new Set(["pc"])), true, "laying a player's secret bare waits for the Storyteller");
  assert.deepEqual(PO.applyPolitics(F.normFaction({id: "x"}), {op: "pol-expose"}), []);
  // The Sabbat does not care about diablerie: no proof there
  assert.equal(SX.hooksFor("a", hooks, ["b"], {polity: "sabbat", year: 1700}).length, 0);
});

test("why an NPC feels as they do: the steps add up and the rest is listed", () => {
  const entry = {step: 1, log: [{at: 0, delta: 0, why: "First met: as the court regards them", step: -1}, {at: 5, delta: 1, why: "Anna: persuade, success"}, {at: 6, delta: 1, why: "Anna: persuade, success"}]};
  const r = OP.reasonsFor({att: {step: 1, word: "Tolerated"}, entry, npcId: "n", pcId: "c",
    ledger: [{kind: "boon", size: "minor", status: "broken", from: {id: "c"}, to: {id: "n"}}, {kind: "debt", status: "open", from: {id: "n"}, to: {id: "c"}, what: "ten marks"}],
    links: [{kind: "sire", label: "Sire"}], secrets: [{holderIsNpc: false, text: "a pact"}], fought: 99, same: ["clan (Brujah)"], date: t => `day ${t}`});
  assert.equal(r.total, 1, "the steps add up to the attitude");
  assert.deepEqual(r.set.map(x => x.label), ["-1", "+2"]);
  assert.match(r.set[1].why, /persuade, success \(2 times\)/);
  const why = r.weigh.map(x => x.why).join(" | ");
  assert.match(why, /broke a minor boon/); assert.match(why, /owes them a debt: ten marks/); assert.match(why, /Fought them \(day 99\)/);
  assert.match(why, /Sire/); assert.match(why, /knows their secret: a pact/); assert.match(why, /same clan/);
  const fresh = OP.reasonsFor({att: {step: 0, word: "Unknown"}, seed: {step: 0, from: ""}});
  assert.match(fresh.set[0].why, /Not met yet/);
});

test("talk lines that need a trait: Only when reads rated traits", () => {
  const ratings = W.ratingsOf({system: {abilities: {etiquette: {value: 3, label: "wod.abilities.etiquette"}}, attributes: {wits: {value: 2}}, spheres: {forces: {value: 2, label: "wod.spheres.forces"}}},
    items: [{type: "Power", name: "Dominate", system: {value: 2}}, {type: "Ability", name: "Animal Ken", system: {value: 1}}, {type: "Melee Weapon", name: "Sword 3", system: {value: 9}}]},
    s => s.split(".").pop());
  assert.equal(ratings.dominate, 2); assert.equal(ratings.animalken, 1); assert.equal(ratings.forces, 2); assert.equal(ratings.sword3, undefined, "gear has no rating");
  const ok = t => W.checkWhen(W.parseWhen(t), {actor: {ratings}}).ok;
  assert.ok(ok("Dominate 2")); assert.ok(!ok("Dominate 3")); assert.ok(ok("Etiquette >= 3")); assert.ok(ok("rating Animal Ken 1")); assert.ok(ok("not Occult 1")); assert.ok(ok("Forces 2"));
  assert.equal(W.ratingFrom({"dominatekoldunic": 3}, "dominate"), 3, "a longer name starting with it counts");
  assert.ok(W.parseWhen("rating").problems.length, "rating needs a name and dots");
  assert.ok(!W.checkWhen(W.parseWhen("Dominate 1"), {actor: null}).ok, "no character, no pass");
  assert.deepEqual(W.parseThen("secret the hidden childe").actions, [{does: "secret", text: "the hidden childe"}]);
});

test("talk lines that need a trait come first and are marked", () => {
  const sheet = TK.parseSheet("[the abbot] => Shrugs.\n[the abbot] Etiquette 3 => Bows and names the abbot's confessor.\n[the abbot] clan Malkavian; night => Hums the abbot's hymn backwards.");
  const pick = check => TK.answerFor("the abbot", [{from: "own", lines: sheet.lines}], check)?.line.say;
  assert.equal(pick(w => !/Etiquette|Malkavian/.test(w)), "Shrugs.", "nobody qualifies: the plain line");
  assert.equal(pick(w => !/Malkavian/.test(w)), "Bows and names the abbot's confessor.", "a gated line beats the plain one above it");
  assert.equal(TK.gateLabel("Etiquette 3"), "Etiquette 3");
  assert.equal(TK.gateLabel("clan Malkavian; night"), "clan Malkavian", "only what is about the character's traits");
  assert.equal(TK.gateLabel("any of: Dominate 2 / Presence 2"), "Dominate 2 or Presence 2");
  assert.equal(TK.gateLabel("kind kindred"), "", "being Kindred is not a trait line");
  assert.equal(TK.gateLabel("not clan Tremere"), "", "a not-test unlocks nothing");
  assert.match(src("modules/wodx-npc/scripts/talk.mjs"), /wnpc-gate/);
});

test("the Relationships tab draws groups, hand ties, secrets and the regard", () => {
  const rows = [{kind: "sire", label: "Sire", groupLabel: "Blood and bonds", name: "Anezka", uuid: `Actor.${A}`, note: "", source: "lineage"},
    {kind: "mentor", label: "Mentor", groupLabel: "Mentors and students", name: "Petr", uuid: `Actor.${P}`, note: "taught", source: "hand", hand: `Actor.${P}`, hidden: true},
    {kind: "apprentice", label: "Student", groupLabel: "Mentors and students", name: "Milos", uuid: `Actor.${M}`, note: "", source: "hand"}];
  const html = XH.relationsHtml(rows, {editable: true, gm: true, roles: [["mentor", "Mentor"], ["rival", "Rival"]], known: [{holder: "Bohus", text: "made a childe"}], own: [{text: "a pact"}], regard: "<p>x</p>"});
  assert.match(html, /Relationships/); assert.match(html, /Blood and bonds/); assert.match(html, /from the lineage/); assert.match(html, /from their sheet/);
  assert.match(html, /data-act="tie-hide"/); assert.match(html, /fa-eye-slash/); assert.match(html, /Knows of Bohus/); assert.match(html, /How they regard/);
  assert.match(html, /data-act="tie-secrets"/); assert.match(html, /class="wodx-search"/);
  const player = XH.relationsHtml(rows.filter(r => !r.hidden), {editable: true, gm: false, roles: []});
  assert.doesNotMatch(player, /tie-secrets|tie-hide|How they regard/);
  assert.match(XH.relationsHtml([]), /No relationships yet/);
});

test("the Sheets ghoul ties read the domitor as WoDX stores it", () => {
  const s = src("modules/wodx-sheets/scripts/extras.mjs");
  assert.match(s, /typeof l\?\.domitor === "object"/);
  assert.match(s, /relationsOf\(actor, editable\)/);
});

test("the windows are wired into the API, the sheet and the People window", () => {
  const main = src("modules/wodx-npc/scripts/main.mjs");
  for ( const k of ["ties: people.ties", "openTree: people.openTree", "secrets: people.secrets", "opinion: people.opinion"] ) assert.ok(main.includes(k), k);
  assert.match(src("modules/wodx-creation/scripts/apps.mjs"), /data-action="tree"/);
  const when = src("modules/wodx-chronicle/scripts/when.mjs");
  assert.match(when, /a\.does === "secret"/); assert.match(when, /ratings:/);
  assert.match(src("modules/wodx-npc/scripts/factions.mjs"), /hooks: openHooks\(\)/);
});
