// B6144: sprites asked for from inside the game are found, drawn once, and never for the Live world.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {pendingRequests, batchCounts, draw, LIVE} from "../pcq/sprite-draw.mjs";

function world(root, name, {req = null, status = null, roster = true} = {}) {
  const dir = path.join(root, "Data", "worlds", name, "wodx-sprites");
  fs.mkdirSync(dir, {recursive: true});
  if ( req ) fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(req));
  if ( status ) fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(status));
  if ( roster ) fs.writeFileSync(path.join(dir, "roster.json"), JSON.stringify({actors: []}));
  return dir;
}

test("pending requests: unanswered only, oldest first, never Live", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spr-"));
  world(root, "a", {req: {id: "req-2", at: "2026-11-15T10:00:00Z"}});
  world(root, "b", {req: {id: "req-1", at: "2026-11-15T09:00:00Z"}});
  world(root, "c", {req: {id: "req-3", at: "2026-11-15T08:00:00Z"}, status: {id: "req-3", state: "done"}});
  world(root, LIVE, {req: {id: "req-4", at: "2026-11-15T07:00:00Z"}});
  world(root, "d", {req: {id: "req-5", at: "2026-11-15T06:00:00Z"}, roster: false});
  world(root, "e", {req: {id: "../x", at: "2026-11-15T06:00:00Z"}});
  world(root, "f", {req: {id: "req-6", at: "2026-11-15T05:00:00Z"}, status: {id: "req-6", state: "drawing"}});
  const got = pendingRequests([root, path.join(root, "missing")]);
  assert.deepEqual(got.map(r => r.world), ["f", "b", "a"]);
  assert.equal(got[0].retry, true, "one left drawing when the runner stopped is drawn again");
});

test("batch counts are read from its first line", () => {
  assert.deepEqual(batchCounts("358 drawn, 0 unchanged, 3 with notes\n  x | y"), {drawn: 358, unchanged: 0, notes: 3});
  assert.equal(batchCounts("Traceback"), null);
});

test("draw writes drawing, then done or failed", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spr-"));
  const dir = world(root, "a", {req: {id: "req-1", at: "x"}});
  const [req] = pendingRequests([root]);
  let seen = null;
  const ok = await draw(req, {python: "py", root: "/repo", run: async (cmd, argv) => { seen = JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")).state; return {code: 0, out: "4 drawn, 2 unchanged, 0 with notes"}; }});
  const st = JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8"));
  assert.equal(seen, "drawing");
  assert.ok(ok && st.state === "done" && st.drawn === 4 && st.unchanged === 2 && st.id === "req-1");
  assert.deepEqual(pendingRequests([root]), [], "answered");
  fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify({id: "req-2", at: "y"}));
  const [again] = pendingRequests([root]);
  assert.equal(await draw(again, {python: "py", root: "/repo", run: async () => ({code: 1, out: "Traceback: boom"})}), false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "status.json"), "utf8")).state, "failed");
});
