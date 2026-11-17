import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6779g: first aid's "under care" mark is not lost by a Storyteller who is not the active one, and gatetruthsheets
 * step 5 makes sure the patient is the target before it rolls */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(join(root, "modules/wodx-library/scripts/use.mjs"), "utf8");
const body = name => { const i = src.indexOf(`async function ${name}(`); const j = src.indexOf("\n}\n", i); return src.slice(i, j + 2); };
const build = (game, ui = {notifications: {warn() {}}}) => new Function("game", "ui", "st", "SOCKET", `${body("onSocket")}\n${body("gmDo")}\nreturn gmDo;`)(game, ui, () => null, "x");

test("a second Storyteller who owns the patient marks it", async () => {
  const flags = [];
  const patient = {isOwner: true, setFlag: (...a) => flags.push(a)};
  const me = {id: "gm2", isGM: true}, other = {id: "gm1", isGM: true, active: true};
  const game = {user: me, users: Object.assign([other, me], {activeGM: other}), actors: {get: () => patient}, socket: {emit() {}}};
  await build(game)({op: "treated", actor: "p"});
  assert.deepEqual(flags, [["wodx-actions", "treated", true]]);
});

test("a player who does not own the patient asks the Storyteller", async () => {
  const sent = [];
  const game = {user: {id: "pl", isGM: false}, users: Object.assign([{id: "gm", isGM: true, active: true}], {activeGM: {id: "gm"}}),
    actors: {get: () => ({isOwner: false})}, socket: {emit: (...a) => sent.push(a)}};
  await build(game)({op: "treated", actor: "p"});
  assert.equal(sent.length, 1);
});

test("gatetruthsheets step 5 waits until the patient is the only target", () => {
  const g = readFileSync(join(root, "tools/gate/gatetruthsheets.mjs"), "utf8");
  const step = g.slice(g.indexOf('G.step("5.'), g.indexOf('G.step("6.'));
  assert.match(step, /onPatient/);
  assert.match(step, /canvas\.scene\?\.id !== scene\.id/);
  assert.ok(step.indexOf("onPatient()") < step.indexOf("lib.use.run"));
});
