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
