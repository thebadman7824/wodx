/**
 * Read-only status page for the Main PC (Ben, 2026-11-17). GET only, bound to 127.0.0.1, served under a secret path:
 *   http://127.0.0.1:8787/<secret>/          small HTML page
 *   http://127.0.0.1:8787/<secret>/status.json   the same data as one JSON object (what threads fetch)
 * The secret is read from STATUS_SECRET_FILE (default D:/WoDX/pcq/status-secret.txt) and created once if missing.
 * Anything else, and any method but GET, gets a bare 404. Nothing here writes, restarts or runs a job.
 * Point the Cloudflare tunnel's hostname at http://127.0.0.1:8787.
 * Never prints the secret to a log. Shows no tokens, no command lines beyond the first 90 characters.
 */
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import * as guard from "./gpuguard.mjs";

const PORT = Number(process.env.STATUS_PORT || 8787);
const HOME = process.env.PCQ_HOME || "D:/WoDX/pcq";
const SECRET_FILE = process.env.STATUS_SECRET_FILE || path.join(HOME, "status-secret.txt");
const TASKS = process.env.LA_TASKS || "D:/WoDX/handoff/tasks";
const LANES = [2, 3, 4, 5, 6].map(i => ({id: i, port: 30000 + i * 10}));
const HOST = process.env.STATUS_HOST || "DESKTOP-MRKCMRG";

let secret;
try { secret = fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch {}
if ( !secret ) { secret = crypto.randomBytes(18).toString("base64url"); fs.writeFileSync(SECRET_FILE, secret); }

const tail = (f, n) => { try { return fs.readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).slice(-n); } catch { return []; } };
const cut = (s, n = 160) => String(s).slice(0, n);

function procs() {
  const ps = `Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -match 'runner\\.mjs|watchdog\\.ps1|la-runner|gen_control|ComfyUI|openhands|ollama|vl-loop|book_pipeline'} | ForEach-Object { "$($_.ProcessId)|$($_.Name)|$($_.CommandLine)" }`;
  const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {encoding: "utf8", timeout: 20000, windowsHide: true});
  const out = {};
  const kinds = [["runner", /runner\.mjs/], ["watchdog", /watchdog\.ps1/], ["laRunner", /la-runner/], ["art", /gen_control|ComfyUI/],
    ["openhands", /openhands/i], ["ollama", /ollama\.exe\s+serve|ollama serve/], ["bookVl", /vl-loop|book_pipeline/]];
  for ( const line of (r.stdout || "").split(/\r?\n/).filter(Boolean) ) {
    const [pid, name, ...cmd] = line.split("|");
    const c = cmd.join("|");
    if ( /^(bash|sh|cmd|conhost).exe$/i.test(name) || /status-server|Get-CimInstance/.test(c) ) continue;
    for ( const [k, re] of kinds ) if ( re.test(c) ) (out[k] ??= []).push({pid: Number(pid), name, cmd: cut(c, 90)});
  }
  return out;
}

function lane(l) {
  // Foundry answers /api/status unevenly, so "up" means the port accepts a connection.
  return new Promise(res => {
    const s = net.connect({host: "127.0.0.1", port: l.port, timeout: 2000});
    s.on("connect", () => { s.destroy(); res({id: l.id, port: l.port, up: true}); });
    s.on("error", () => res({id: l.id, port: l.port, up: false}));
    s.on("timeout", () => { s.destroy(); res({id: l.id, port: l.port, up: false}); });
  });
}

async function ollamaPs() {
  try {
    const j = await (await fetch("http://127.0.0.1:11434/api/ps", {signal: AbortSignal.timeout(3000)})).json();
    return (j.models || []).map(m => ({name: m.name, vramGb: +(m.size_vram / 2 ** 30).toFixed(1), sizeGb: +(m.size / 2 ** 30).toFixed(1)}));
  } catch { return null; }
}

function laTasks() {
  const ls = d => { try { return fs.readdirSync(path.join(TASKS, d)); } catch { return []; } };
  return {inbox: ls("inbox"), running: ls("running"), done: ls("done").length, failed: ls("failed").length,
    paused: fs.existsSync(path.join(process.env.TEMP || "C:/Windows/Temp", "wodx-pause")), stop: fs.existsSync(path.join(TASKS, "STOP")),
    log: tail(path.join(TASKS, "logs/runner.log"), 5).map(l => cut(l))};
}

function runnerLog() {
  const f = path.join(HOME, "logs", `runner-${new Date().toISOString().slice(0, 10)}.log`);
  const lines = tail(f, 12).map(l => cut(l));
  const age = (() => { try { return Math.round((Date.now() - fs.statSync(f).mtimeMs) / 60000); } catch { return null; } })();
  return {lastLines: lines, minutesSinceLastLine: age};
}

let cache = {t: 0, v: null};
async function gather() {
  if ( Date.now() - cache.t < 15000 && cache.v ) return cache.v;
  const [p, lanes, oll] = [procs(), await Promise.all(LANES.map(lane)), await ollamaPs()];
  const g = guard.state();
  const issues = [];
  if ( !p.runner ) issues.push("pcq runner not running");
  if ( !p.watchdog ) issues.push("pcq watchdog not running");
  if ( p.runner && (runnerLog().minutesSinceLastLine ?? 0) > 90 ) issues.push("runner log quiet for over 90 min");
  if ( g.warning === "warn" || g.warning === "critical" ) issues.push(`gpu ${g.warning}`);
  if ( !p.ollama ) issues.push("ollama not running");
  const v = {host: HOST, time: new Date().toISOString(), readOnly: true, issues,
    runner: {procs: p.runner || [], watchdog: p.watchdog || [], ...runnerLog()},
    lanes, gpu: g, ollama: oll,
    openhands: {laRunner: p.laRunner || [], procs: p.openhands || [], art: p.art || [], tasks: laTasks()},
    other: {bookVl: p.bookVl || []}};
  cache = {t: Date.now(), v};
  return v;
}

function html(v) {
  const e = s => String(s ?? "").replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"}[c]));
  const c = v.gpu.card;
  const col = {ok: "#2a7", warn: "#d90", critical: "#c22", unknown: "#888"}[v.gpu.warning];
  return `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex>
<title>Main PC status</title><style>body{font:14px system-ui;margin:16px;max-width:900px}h2{margin:18px 0 4px}code,pre{background:#8881;padding:2px 4px;font-size:12px}pre{white-space:pre-wrap}</style>
<h1>${e(v.host)} <small>${e(v.time)}</small></h1>
<p><b>Issues:</b> ${v.issues.length ? e(v.issues.join("; ")) : "none"}</p>
<h2>GPU <span style="color:${col}">${e(v.gpu.warning)}</span></h2>
<p>${c ? `${e(c.name)}: ${c.core} C, load ${c.util}%, VRAM ${c.usedMiB}/${c.totalMiB} MiB, ${c.watts} W` : "no reading"}<br>
Holder: ${v.gpu.holder ? e(`${v.gpu.holder.class} ${v.gpu.holder.label} (${v.gpu.holder.needGb} GB)`) : "free"}; waiting: ${v.gpu.waiters.length ? e(v.gpu.waiters.map(w => `${w.class} ${w.label}`).join(", ")) : "none"}<br>
Ollama loaded: ${v.ollama ? (v.ollama.length ? e(v.ollama.map(m => `${m.name} ${m.vramGb} GB on card`).join(", ")) : "none") : "unreachable"}</p>
<h2>Runner</h2><p>runner ${v.runner.procs.length ? "up" : "DOWN"}, watchdog ${v.runner.watchdog.length ? "up" : "DOWN"}, last log line ${v.runner.minutesSinceLastLine ?? "?"} min ago</p><pre>${e(v.runner.lastLines.join("\n"))}</pre>
<h2>Lanes</h2><p>${v.lanes.map(l => `${l.id} (${l.port}): ${l.up ? "up" : "down"}`).map(e).join(" &middot; ")}</p>
<h2>OpenHands / local agents</h2><p>la-runner ${v.openhands.laRunner.length ? "up" : "DOWN"}; inbox ${v.openhands.tasks.inbox.length}, running ${v.openhands.tasks.running.length}, done ${v.openhands.tasks.done}, failed ${v.openhands.tasks.failed}${v.openhands.tasks.paused ? "; PAUSED" : ""}${v.openhands.tasks.stop ? "; STOP file" : ""}; art run ${v.openhands.art.length ? "ACTIVE" : "idle"}</p><pre>${e(v.openhands.tasks.log.join("\n"))}</pre>`;
}

http.createServer(async (req, res) => {
  const nf = () => { res.writeHead(404, {"content-type": "text/plain"}); res.end("not found"); };
  if ( req.method !== "GET" ) return nf();
  const u = new URL(req.url, "http://x");
  const m = u.pathname.match(/^\/([^/]+)(\/status\.json|\/)?$/);
  if ( !m ) return nf();
  const a = Buffer.from(m[1]), b = Buffer.from(secret);
  if ( a.length !== b.length || !crypto.timingSafeEqual(a, b) ) return nf();
  try {
    const v = await gather();
    const json = m[2] === "/status.json";
    res.writeHead(200, {"content-type": json ? "application/json" : "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex"});
    res.end(json ? JSON.stringify(v) : html(v));
  } catch (err) { res.writeHead(500, {"content-type": "text/plain"}); res.end("error"); }
}).listen(PORT, "127.0.0.1", () => console.log(`status server on 127.0.0.1:${PORT} (secret in ${SECRET_FILE})`));
