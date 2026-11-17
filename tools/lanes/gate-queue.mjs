/**
 * B6526: one list of gates shared by every lane of a gates job. Each lane's run-gate takes the next gate from the
 * list until it is empty, so a lane that joins late or runs faster simply takes more. A lock file keeps two lanes
 * from taking the same gate; each take is written to <file>.taken so a lane that dies can give its gates back.
 */
import fs from "node:fs";

export function readQueue(file) {
  try { const q = JSON.parse(fs.readFileSync(file, "utf8")); return Array.isArray(q) ? q : []; } catch (e) { return []; }
}

function withLock(file, fn) {
  const lockPath = `${file}.lock`;
  for ( let tries = 0; tries < 300; tries++ ) {
    let fd = null;
    try { fd = fs.openSync(lockPath, "wx"); }
    catch (e) {
      // A lock left by a run that died is cleared after 30 seconds
      try { if ( Date.now() - fs.statSync(lockPath).mtimeMs > 30000 ) fs.rmSync(lockPath, {force: true}); } catch (e2) { /* gone */ }
      const until = Date.now() + 100; while ( Date.now() < until ) { /* wait a moment */ }
      continue;
    }
    try { return fn(); } finally { fs.closeSync(fd); fs.rmSync(lockPath, {force: true}); }
  }
  throw new Error(`could not lock ${file}`);
}

/** The next gate for this lane, or null when the list is empty. */
export function takeQueued(file, laneId) {
  return withLock(file, () => {
    const q = readQueue(file), gate = q.shift() ?? null;
    fs.writeFileSync(file, JSON.stringify(q));
    if ( gate ) fs.appendFileSync(`${file}.taken`, `${laneId} ${gate}\n`);
    return gate;
  });
}

/** Gates this lane took that have no result line in its report go back to the front of the list. Returns them. */
export function putBack(file, laneId, report = "") {
  return withLock(file, () => {
    let rows = [];
    try { rows = fs.readFileSync(`${file}.taken`, "utf8").split("\n").map(l => l.trim().split(" ")).filter(x => x[1]); }
    catch (e) { return []; }
    const taken = rows.filter(x => x[0] === String(laneId)).map(x => x[1]);
    // This lane's takes are settled now: a retry of it starts a fresh report, so they are not looked at again
    fs.writeFileSync(`${file}.taken`, rows.filter(x => x[0] !== String(laneId)).map(x => x.join(" ") + "\n").join(""));
    const done = new Set([...String(report).matchAll(/^([\w-]+): /gm)].map(m => m[1]));
    const q = readQueue(file);
    const lost = [...new Set(taken.filter(g => !done.has(g) && !q.includes(g)))];
    if ( lost.length ) fs.writeFileSync(file, JSON.stringify([...lost, ...q]));
    return lost;
  });
}
