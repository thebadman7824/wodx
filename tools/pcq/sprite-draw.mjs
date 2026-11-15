/**
 * Sprites drawn when the game asks (B6144). The Storyteller presses "Draw sprites" in WoDX Paperdoll's settings: the
 * game writes roster.json and request.json into worlds/<world>/wodx-sprites. The PC runner looks for such requests in
 * the Foundry data folders it is given (runner.json spriteData), never in the Live world, and runs tools/sprites/batch.py
 * on the roster into that same folder at below-normal priority, one world at a time. It writes status.json, which the
 * game reads to learn the new sprites and put them on the tokens.
 *
 *   request.json  {id, world, at, by}
 *   status.json   {id, state: "drawing" | "done" | "failed", started, finished, drawn, unchanged, notes, text}
 */
import fs from "node:fs";
import path from "node:path";

export const LIVE = "rothenstein-live";
const ID = /^[\w-]{4,64}$/;

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/** The requests not yet answered, in the data folders given (each a Foundry user data folder holding Data/worlds). Oldest first. */
export function pendingRequests(dataFolders = []) {
  const out = [];
  for ( const root of dataFolders ) {
    const worlds = path.join(root, "Data", "worlds");
    let names = [];
    try { names = fs.readdirSync(worlds, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name); } catch { continue; }
    for ( const w of names ) {
      if ( w === LIVE ) continue;
      const dir = path.join(worlds, w, "wodx-sprites"), req = readJson(path.join(dir, "request.json"));
      if ( !req || !ID.test(String(req.id ?? "")) ) continue;
      const st = readJson(path.join(dir, "status.json"));
      if ( st?.id === req.id && st.state !== "drawing" ) continue;            // answered
      if ( !fs.existsSync(path.join(dir, "roster.json")) ) continue;
      out.push({root, world: w, dir, id: req.id, at: String(req.at ?? ""), retry: st?.id === req.id && st.state === "drawing"});
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** The batch's first line, "N drawn, M unchanged, K with notes", read into numbers. */
export function batchCounts(out = "") {
  const m = /(\d+) drawn, (\d+) unchanged, (\d+) with notes/.exec(String(out));
  return m ? {drawn: Number(m[1]), unchanged: Number(m[2]), notes: Number(m[3])} : null;
}

export function writeStatus(dir, s) {
  fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(s, null, 1));
}

/**
 * Answer one request: run the batch and write the status. run(cmd, argv, opts) is the runner's own (time limit, below
 * normal priority); python is the interpreter with numpy and Pillow; root is the repository the batch is taken from.
 */
export async function draw(req, {run, python, root, log = () => {}, minutes = 90} = {}) {
  const started = new Date().toISOString();
  writeStatus(req.dir, {id: req.id, state: "drawing", started});
  log(`sprites: drawing for ${req.world} (${req.id})`);
  const r = await run(python, [path.join(root, "tools", "sprites", "batch.py"), path.join(req.dir, "roster.json"), req.dir], {cwd: path.join(root, "tools", "sprites"), minutes});
  const c = batchCounts(r.out), ok = r.code === 0 && !!c;
  const tail = String(r.out ?? "").trim().split("\n").slice(-8).join("\n").slice(0, 1500);
  writeStatus(req.dir, {id: req.id, state: ok ? "done" : "failed", started, finished: new Date().toISOString(), ...(c ?? {}),
    text: ok ? `${c.drawn} drawn, ${c.unchanged} unchanged` : r.timedOut ? `The drawing took longer than ${minutes} minutes and was stopped.` : `The batch stopped (exit ${r.code}): ${tail}`});
  log(`sprites: ${req.world} ${ok ? `${c.drawn} drawn, ${c.unchanged} unchanged` : `failed (exit ${r.code})`}`);
  return ok;
}
