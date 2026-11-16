import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Final systems audit, WoDX NPC and WoDX Voices (B6761-B6765) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const K = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/kin-rules.mjs")));
const SR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/servant-rules.mjs")));

test("B6761: an NPC's resisting roll goes to the Storyteller only; the player sees what came of it", () => {
  const sv = src("modules/wodx-npc/scripts/servants.mjs");
  const restrain = sv.slice(sv.indexOf("export async function restrain"), sv.indexOf("Hooks.callAll(\"wodxBondRestraint\""));
  assert.match(restrain, /const npcRoll = !a\.hasPlayerOwner;/);
  assert.match(restrain, /rolls: \[res\.roll\][^\n]*\n\s*\.\.\.\(npcRoll \? \{whisper: game\.users\.filter\(u => u\.isGM\)/, "the roll card is whispered to the Storyteller for an NPC");
  assert.match(restrain, /if \( npcRoll \) await ChatMessage\.create\(\{speaker[^\n]*restraint: \{stop: !won, kind: r\.kind\}\}\},\n\s*content: `[^`]*\$\{esc\(text\)\}/, "everyone sees the outcome, with no dice");
  const ord = src("modules/wodx-npc/scripts/orders.mjs");
  const balked = ord.slice(ord.indexOf("async function balked"), ord.indexOf("async function leaveService"));
  assert.match(balked, /rest = tellMaster\(masterId\)\.filter\(id => !gm\.includes\(id\)\)/);
  assert.match(balked, /if \( rest\.length \) await note\(`<p><b>\$\{esc\(npc\.name\)\}<\/b> refuses \$\{esc\(master\?\.name \?\? "its master"\)\}'s order\.\$\{left\}<\/p>`, rest/, "the master's player: no dice");
  assert.match(balked, /Willpower \$\{r\.L\.pool\} at \$\{r\.L\.diff\}[^\n]*, gm, "Loyalty"\)/, "the dice: the Storyteller only");
  assert.ok(Object.keys(SR.KINDS).length > 5);
  for ( const [k, b] of Object.entries(SR.KINDS) ) assert.doesNotMatch(String(b.page ?? ""), /\bB\d{3,4}\b/, `no decision number in the card text (${k})`);
});

test("B6762: nobody in a family line marries under 18, in any era (the age floor, B3211)", () => {
  for ( const l of K.LIFE ) assert.ok(l.marry[0] >= 18, `${l.key} marries from ${l.marry[0]}`);
  let under = 0, married = 0;
  for ( let i = 0; i < 30; i++ ) {
    const line = K.newLine({id: `t${i}`, founder: {id: "a", name: "Jan"}, family: "Novák", year: 1240, founderBorn: 1215, seed: `s${i}`,
      members: [{name: "Eliška", sex: "female", born: 1238}, {name: "Petr", sex: "male", born: 1236}]});
    const {events} = K.grow(line, 1340);
    for ( const e of events.filter(x => x.kind === "marriage") ) { married++; const age = Number(/married at (\d+)/.exec(e.detail)?.[1]); if ( age < 18 ) under++; }
  }
  assert.ok(married > 10, `marriages happen (${married})`);
  assert.equal(under, 0);
});

test("B6764: a member brought into play keeps the line's gender, one in a hundred nonbinary, always the same", () => {
  assert.equal(K.genderFor({id: "m3", sex: "female"}, "L", 0), "female");
  assert.equal(K.genderFor({id: "m3", sex: "male"}, "L", 0), "male");
  assert.equal(K.genderFor({id: "m3"}, "L", 0), "");
  assert.equal(K.genderFor({id: "m3", sex: "male"}, "L", 1), "nonbinary");
  let nb = 0;
  for ( let i = 0; i < 20000; i++ ) if ( K.genderFor({id: `m${i}`, sex: "female"}, "line-x") === "nonbinary" ) nb++;
  assert.ok(nb > 120 && nb < 290, `about 1 in 100 (${nb} of 20000)`);
  assert.equal(K.genderFor({id: "m7", sex: "male"}, "line-y"), K.genderFor({id: "m7", sex: "male"}, "line-y"));
  assert.match(src("modules/wodx-npc/scripts/kin.mjs"), /"wodx-creation": \{chronology: \{bornYear: m\.born\}, \.\.\.\(K\.genderFor\(m, l\.id\) \? \{sex: K\.genderFor\(m, l\.id\)\} : \{\}\)\}/);
});

test("B6763: WoDX Voices off shows no dead control and touches no files", () => {
  const v = src("modules/wodx-voices/scripts/main.mjs");
  assert.match(v, /register\(MOD, "enabled", \{[^\n]*requiresReload: true/);
  assert.match(v, /const on = !!setting\("enabled"\);\n\s*const reg = \(k, o\) => game\.settings\.register\(MOD, k, o\.config \? \{\.\.\.o, config: on\} : o\);/);
  assert.match(v, /if \( on \) game\.settings\.registerMenu/);
  assert.match(v, /if \( game\.user\?\.isGM && setting\("enabled"\) \) \{ fillKnown\(\); loadEngine\(\); \}/);
  assert.equal((v.match(/condition: li => !!setting\("enabled"\) && game\.user\?\.isGM/g) ?? []).length, 2, "both Voiced entries");
});

test("B6765: a player's Talk, Orders and Who remembers you buttons show only while the feature is on", () => {
  const m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(m, /wodxTalk = \{[^\n]*\n\s*button: true, visible: game\.user\.isGM \|\| isOn\("talkMenu"\)/);
  assert.match(m, /wodxOrders = \{[^\n]*\n\s*button: true, visible: game\.user\.isGM \|\| isOn\("followerOrders"\)/);
  assert.match(m, /wodxRemembered = \{[^\n]*\n\s*button: true, visible: !game\.user\.isGM && isOn\("memory"\)/);
});

test("B6766: every faction card's Undo button is wired: its card flag passes the render handler's gate", () => {
  const f = src("modules/wodx-npc/scripts/factions.mjs") + src("modules/wodx-npc/scripts/founding.mjs");
  const keys = new Set([...f.matchAll(/class="wnpc-f-undo" data-key="([A-Za-z]+)"/g)].map(m => m[1]));
  assert.ok(keys.has("factionBoon") && keys.size >= 5, [...keys].join());
  const gate = /if \( (!fl\?\.\w+(?: && !fl\?\.\w+)*) \) return;\n\s*el\.querySelectorAll\("button\.wnpc-f-mapbreach"\)/.exec(src("modules/wodx-npc/scripts/factions.mjs"))?.[1] ?? "";
  for ( const k of keys ) assert.match(gate, new RegExp(`!fl\\?\\.${k}\\b`), `the Undo on a ${k} card`);
});

test("B6768: kin children, Fates brood sheets and residents' partners keep the NPC gender rule: one in a hundred nonbinary", async () => {
  const GR = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/gender-rules.mjs")));
  const N = 100000;
  let nb = 0;
  for ( let i = 0; i < N; i++ ) { const d = GR.sexFromDraw((i + 0.5) / N); if ( d.sex === "nonbinary" ) nb++; else assert.equal(d.sex, d.nameSex); }
  assert.equal(nb, N / 100, "exactly one in a hundred of an even spread");
  assert.deepEqual(GR.sexFromDraw(0.2), {nameSex: "female", sex: "female"});
  assert.deepEqual(GR.sexFromDraw(0.7), {nameSex: "male", sex: "male"});
  assert.match(src("modules/wodx-creation/scripts/people-rules.mjs"), /if \( sex === "any" \) \(\{sex: s, nameSex\} = sexFromDraw\(rand\(\), NONBINARY_HALF \* 2\)\)/, "the generator residents use is the same rule");
  // Kin children
  let kids = 0, kidsNb = 0;
  for ( let i = 0; i < 400; i++ ) {
    const line = K.newLine({id: `g${i}`, founder: {id: "a", name: "Jan"}, family: "Novák", year: 1700, founderBorn: 1680, seed: `g${i}`,
      members: [{name: "Eliška", sex: "female", born: 1698}, {name: "Petr", sex: "male", born: 1696}]});
    const grown = K.grow(line, 1800).line;
    for ( const m of grown.members.filter(x => x.gender) ) {
      kids++; if ( m.gender === "nonbinary" ) kidsNb++;
      assert.ok(["female", "male"].includes(m.sex), "the name side is kept for names and family name forms");
      assert.equal(K.genderFor(m, line.id), m.gender, "brought into play with the gender drawn at birth");
    }
  }
  assert.ok(kids > 1000, `children born (${kids})`);
  assert.ok(kidsNb / kids > 0.003 && kidsNb / kids < 0.025, `about 1 in 100 (${kidsNb} of ${kids})`);
  // Fates brood sheets
  const FT = src("modules/wodx-npc/scripts/fates.mjs");
  assert.match(FT, /flags: \{"wodx-creation": \{sex: b\.sex \?\? drawnFor\(b\)\.sex, chronology/, "the sheet gets a sex");
  assert.match(FT, /s\.records\[b\.id\] = \{\.\.\.b, \.\.\.drawnFor\(b\)\}/, "the record keeps the sex that goes with its name");
  const sexOfSrc = FT.slice(FT.indexOf("export function sexOf"), FT.indexOf("const SHEET"));
  const sexOf = new Function("sexFromDraw", `${sexOfSrc.replace("export ", "")}; return sexOf;`)(GR.sexFromDraw);
  assert.equal(sexOf({id: "x", sex: "male"}), "male");
  let bnb = 0;
  for ( let i = 0; i < 20000; i++ ) { const s = sexOf({id: `b${i}`}); assert.ok(["female", "male", "nonbinary"].includes(s)); if ( s === "nonbinary" ) bnb++; }
  assert.ok(bnb > 120 && bnb < 290, `brood: about 1 in 100 (${bnb} of 20000)`);
  // Residents' partners
  const RR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/resident-rules.mjs")));
  const c = {same: 0, other: 0, nb: 0};
  for ( let i = 0; i < N; i++ ) { const s = RR.partnerSex("female", (i + 0.5) / N); if ( s === "nonbinary" ) c.nb++; else if ( s === "female" ) c.same++; else c.other++; }
  assert.equal(c.nb, N / 100);
  assert.ok(Math.abs(c.same / N - RR.SAME_SEX_PARTNER) < 0.002, `same-sex partners ${c.same / N}`);
  assert.ok(["female", "male"].includes(RR.partnerSex("nonbinary", 0.3)));
});
