/**
 * Report a problem, the collecting side (B7162). Two steps:
 *
 *   node tools/solo/reports.mjs export --url https://localhost:30010 --out <folder> [--user "Gamemaster Test"]
 *     Signs in to a running solo world as the Storyteller, writes every report not yet exported from the "Reported
 *     problems" folder to <folder>/<id>.json, and marks those entries exported. The seat does the same as each report
 *     is saved when it runs with --reports <folder>, so this is for nights the seat was not running.
 *
 *   node tools/solo/reports.mjs file --in <folder> [--registry registry/features] [--dry]
 *     Files every report in <folder> as a fault in the feature registry (tools/solo/report-file.mjs): on the row whose
 *     files the errors come from, or in registry/features/_inbox.json. Prints the morning digest's line. Run it on a
 *     branch and open a pull request like any other change.
 *
 * Playwright comes from tools/harness (npm install there once); PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 on the PC.
 */
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import path from "node:path";
import fs from "node:fs";
import {fileReports, digestLine} from "./report-file.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const args = process.argv.slice(2);
const cmd = args[0];
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };

async function exportReports() {
  const url = (opt("url") ?? "https://localhost:30010").replace(/\/$/, "");
  const out = path.resolve(opt("out") ?? "solo-reports");
  const name = opt("user") ?? "Gamemaster Test";
  const require = createRequire(path.join(repo, "tools/harness/package.json"));
  const {chromium} = require("playwright");
  const browser = await chromium.launch({headless: true, channel: process.platform === "win32" ? "msedge" : undefined});
  try {
    const page = await (await browser.newContext({ignoreHTTPSErrors: true})).newPage();
    await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
    const SEL = "select[name=userId], select[name=userid]";
    await page.waitForSelector(SEL, {timeout: 60000});
    const id = await page.$$eval(`${SEL.split(", ").map(s => `${s} option`).join(", ")}`, (os, n) => os.find(o => o.textContent.trim() === n)?.value ?? null, name);
    if ( !id ) throw new Error(`No user "${name}" on the join page`);
    await page.selectOption(SEL, id);
    if ( process.env.WODX_SEAT_PASSWORD ) await page.fill("input[name=password]", process.env.WODX_SEAT_PASSWORD);
    await Promise.all([page.waitForURL(/\/game/, {timeout: 60000}), page.click("button[name=join], form button[type=submit]")]);
    await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 120000});
    const rows = await page.evaluate(async () => {
      const got = [];
      for ( const j of game.journal.contents ) {
        const r = j.getFlag("wodx-solo", "report");
        if ( !r?.id || j.getFlag("wodx-solo", "exported") ) continue;
        got.push({...r, entry: j.uuid});
        await j.setFlag("wodx-solo", "exported", true);
      }
      return got;
    });
    fs.mkdirSync(out, {recursive: true});
    for ( const r of rows ) fs.writeFileSync(path.join(out, `${r.id}.json`), `${JSON.stringify(r, null, 1)}\n`);
    console.log(`${rows.length} report(s) exported to ${out}`);
  } finally { await browser.close(); }
}

async function fileThem() {
  const dir = path.resolve(opt("in") ?? "solo-reports");
  const reg = path.resolve(repo, opt("registry") ?? "registry/features");
  const reports = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^rp-[\w-]+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
  const docs = {};
  if ( fs.existsSync(reg) ) {
    for ( const f of fs.readdirSync(reg).filter(x => x.endsWith(".json")) ) docs[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(reg, f), "utf8"));
  }
  // The registry's own reader names the rows that own a file; without it every fault waits in the inbox
  let ownerOf = () => [];
  const tool = path.join(repo, "tools/registry/registry.mjs");
  if ( fs.existsSync(tool) ) {
    const mod = await import(pathToFileURL(tool).href);
    if ( typeof mod.ownerOf === "function" && typeof mod.load === "function" ) {
      // ownerOf(reg, file) on the registry as load() reads it; each row's module is the file it sits in
      const loaded = mod.load(path.dirname(path.dirname(reg)));
      const home = new Map(Object.entries(loaded.modules).flatMap(([m, x]) => x.rows.map(r => [r, m])));
      ownerOf = file => mod.ownerOf(loaded, file).map(r => ({id: r.id, module: r.module || home.get(r)}));
    }
  }
  const res = fileReports(reports, docs, {ownerOf, refOf: r => r.entry || `${r.id}.json`});
  if ( !args.includes("--dry") ) {
    fs.mkdirSync(reg, {recursive: true});
    const touched = new Set([...res.filed.map(f => f.module), ...(res.inbox.length ? ["_inbox"] : [])]);
    for ( const k of touched ) fs.writeFileSync(path.join(reg, `${k}.json`), `${JSON.stringify(res.docs[k], null, 1)}\n`);
  }
  console.log(JSON.stringify({filed: res.filed, inbox: res.inbox, skipped: res.skipped}, null, 1));
  console.log(digestLine(res));
}

if ( cmd === "export" ) await exportReports();
else if ( cmd === "file" ) await fileThem();
else { console.error("usage: node tools/solo/reports.mjs export --url <url> --out <folder> | file --in <folder> [--registry <dir>] [--dry]"); process.exit(2); }
