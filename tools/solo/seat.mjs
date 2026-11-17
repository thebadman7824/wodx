/**
 * The Storyteller's seat for The Lone Chronicle: a hidden browser that signs in to a running Foundry world as the
 * Storyteller and stays there, so WoDX has somewhere to do its work while one person plays as a player.
 *   node tools/solo/seat.mjs [--user "Gamemaster Test"] [--url https://localhost:30000] [--channel msedge] [--show]
 *                            [--reports <folder>]
 * --reports: each problem the player or Storyteller reports in the world (Report a problem, B7162) is also written to
 * <folder>/<id>.json as it is saved, with any older ones not yet exported, for tools/solo/reports.mjs file.
 * Start the world first, then this, then log in yourself as your player. Ctrl+C ends the seat.
 * The account has no password in a world that is never online; WODX_SEAT_PASSWORD is read if it ever gets one. No
 * password is stored here. Keep PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 on the PC: Edge is used, not a downloaded browser.
 * Playwright comes from tools/harness (npm install there once).
 */
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../harness/package.json"));
const {chromium} = require("playwright");

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const url = (opt("url") ?? "https://localhost:30000").replace(/\/$/, "");
const name = opt("user") ?? "Gamemaster Test";
const channel = opt("channel") ?? (process.platform === "win32" ? "msedge" : undefined);
const stamp = () => new Date().toISOString().slice(11, 19);
const reportsDir = opt("reports") ? path.resolve(opt("reports")) : null;

const browser = await chromium.launch({headless: !args.includes("--show"), channel});
const ctx = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1600, height: 1000}});
const page = await ctx.newPage();
page.on("pageerror", e => console.log(`${stamp()} seat error: ${e.message}`));
// Report a problem: the page hands each saved report out here, and it lands on the PC as a file
if ( reportsDir ) {
  fs.mkdirSync(reportsDir, {recursive: true});
  await page.exposeFunction("wodxSoloReportOut", json => {
    try {
      const r = JSON.parse(json);
      if ( !/^rp-[\w-]+$/.test(r?.id ?? "") ) return false;
      fs.writeFileSync(path.join(reportsDir, `${r.id}.json`), `${JSON.stringify(r, null, 1)}\n`);
      console.log(`${stamp()} problem reported: ${String(r.what ?? "").slice(0, 80)}`);
      return true;
    } catch (e) { console.log(`${stamp()} a report could not be written: ${e.message}`); return false; }
  });
}
async function hookReports() {
  if ( !reportsDir ) return;
  await page.evaluate(async () => {
    const out = async j => {
      const r = j?.getFlag?.("wodx-solo", "report");
      if ( !r?.id || j.getFlag("wodx-solo", "exported") ) return;
      if ( await window.wodxSoloReportOut(JSON.stringify({...r, entry: j.uuid})) ) await j.setFlag("wodx-solo", "exported", true);
    };
    for ( const j of game.journal.contents ) await out(j);
    if ( !window.__wodxSeatReports ) {
      window.__wodxSeatReports = true;
      Hooks.on("wodxSoloReported", ({entryId}) => out(game.journal.get(entryId)).catch(() => null));
    }
  });
}
page.on("console", m => { if ( m.type() === "error" && /wodx-solo/.test(m.text()) ) console.log(`${stamp()} ${m.text()}`); });

async function join() {
  await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
  const SEL = "select[name=userId], select[name=userid]";
  await page.waitForSelector(SEL, {timeout: 60000});
  const id = await page.$$eval("select[name=userId] option, select[name=userid] option", (os, n) => os.find(o => o.textContent.trim() === n)?.value ?? null, name);
  if ( !id ) throw new Error(`No user "${name}" on the join page`);
  await page.selectOption(SEL, id);
  const password = process.env.WODX_SEAT_PASSWORD ?? "";
  if ( password ) await page.fill("input[name=password]", password);
  await Promise.all([page.waitForURL(/\/game/, {timeout: 60000}), page.click("button[name=join], button[type=submit][name=join], form button[type=submit]")]);
  await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 120000});
}

let stopping = false;
const stop = async () => { if ( stopping ) return; stopping = true; console.log(`${stamp()} the seat is leaving`); await browser.close().catch(() => {}); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

try {
  await join();
  const state = await page.evaluate(() => ({world: game.world.id, gm: game.user.isGM, on: !!game.modules.get("wodx-solo")?.api?.isOn?.(), solo: game.modules.get("wodx-solo")?.version ?? null}));
  if ( !state.gm ) throw new Error(`"${name}" is not a Storyteller in ${state.world}`);
  await hookReports().catch(e => console.log(`${stamp()} reports are not being written: ${e.message}`));
  console.log(`${stamp()} the seat is taken in ${state.world} (WoDX Solo ${state.solo ?? "not on"}; The Lone Chronicle is ${state.on ? "on" : "off"})`);
  // Stay until the world closes or the page is lost; say so when it happens
  for ( ;; ) {
    await new Promise(r => setTimeout(r, 15000));
    const alive = await page.evaluate(() => !!window.game?.ready && game.socket?.connected !== false).catch(() => false);
    if ( !alive ) {
      console.log(`${stamp()} lost the world; trying again`);
      try { await join(); await hookReports().catch(() => null); console.log(`${stamp()} the seat is taken again`); }
      catch (e) { console.log(`${stamp()} the world is closed (${e.message}); the seat is leaving`); break; }
    }
  }
} catch (e) { console.error(`${stamp()} the seat could not be taken: ${e.message}`); process.exitCode = 1; }
await browser.close().catch(() => {});
process.exit(process.exitCode ?? 0);
