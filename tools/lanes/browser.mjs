/**
 * Signs a headless browser in to a lane as Gamemaster Test. Playwright comes from tools/harness (npm install there
 * once; keep PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 on the PC, Edge is used). The account has no password on the testbed;
 * WODX_GM_PASSWORD is read if it ever gets one. No password is stored here.
 */
import {createRequire} from "node:module";
import path from "node:path";
import {HERE} from "./lib.mjs";

const require = createRequire(path.join(HERE, "../harness/package.json"));

/**
 * B6775: game.ready comes before the WoDX modules that start on wodxChronicleReady (the chronicle loads its era profiles
 * first) have put their api in place. A gate run first after a fresh sign-in (the first gate, and the first after each
 * browser recycle) read game.modules.get("wodx-creation").api as undefined. The sign-in now also waits for these.
 */
export const API_WAIT_MS = 180000;
export const LATE_APIS = ["wodx-chronicle", "wodx-creation", "wodx-npc", "wodx-storyteller", "wodx-otherworlds", "wodx-interactables"];
/** Runs in the page: true once every active module in ids has its api. */
export function apisReady(ids) {
  return ids.every(id => { const m = globalThis.game?.modules?.get?.(id); return !m?.active || !!m.api; });
}

/** Runs in the page: the active modules in ids that have no api yet. */
export function apisMissing(ids) {
  return ids.filter(id => { const m = globalThis.game?.modules?.get?.(id); return !!m?.active && !m.api; });
}

/**
 * B6960: in run 1779 gates well inside a lane (gate7a, gate7b1, gatehandworlds, gateresidents) found WoDX Creation
 * with no api long after the sign-in had waited for it. Before each gate the runner waits up to ms for the apis again
 * and returns the modules still without one, so the lane report says the world had lost them, not the gate.
 */
export async function waitApis(page, ids = LATE_APIS, ms = 120000) {
  // B6992: a page that reloads while the runner waits destroys the page's context; the wait went on as if the apis
  // were there, and the gate then ran on a page whose late modules had not started. Now it waits for the new page.
  const until = Date.now() + ms;
  for ( ;; ) {
    const left = Math.max(1, until - Date.now());
    const r = await page.waitForFunction(apisReady, ids, {timeout: left}).then(() => "ready", e => (/context was destroyed|navigat|Target closed/i.test(String(e?.message)) ? "reloaded" : "timeout"));
    if ( r === "ready" ) return [];
    if ( r === "reloaded" && Date.now() < until ) { await page.waitForLoadState?.("domcontentloaded").catch(() => {}); continue; }
    return await page.evaluate(apisMissing, ids).catch(() => ids);
  }
}

/**
 * B6992: runs in the page: for each module, whether it is on, has its api, how many keys the api has, and the
 * start-up errors it kept (WoDX Creation's api.startErrors, B6811). Written under a failing gate with --diag, so a
 * module that lost its api (or never got one) shows which.
 */
export function apiState(ids) {
  return ids.map(id => { const m = globalThis.game?.modules?.get?.(id); const a = m?.api;
    return {id, active: !!m?.active, api: !!a, keys: a ? Object.keys(a).length : 0, startErrors: Array.isArray(a?.startErrors) ? a.startErrors.slice(0, 5) : []}; });
}

export async function openGM(url, {channel = process.platform === "win32" ? "msedge" : undefined, user = "Gamemaster Test"} = {}) {
  const {chromium} = require("playwright");
  const browser = await chromium.launch({headless: true, channel});
  // Testbed lanes serve Foundry's own self-signed certificate on localhost.
  const ctx = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1600, height: 1000}});
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log(`[page] ${e.message}`));
  // B6970: console errors and warnings from page load on, read by run-gate --diag (Chronicle's start-up is in here)
  const diag = [];
  page.on("console", m => { if ( ["error", "warning"].includes(m.type()) && diag.length < 2000 ) diag.push(`${new Date().toISOString().slice(11, 19)} ${m.type()}: ${m.text().slice(0, 600)}`); });
  page.on("pageerror", e => { if ( diag.length < 2000 ) diag.push(`${new Date().toISOString().slice(11, 19)} pageerror: ${String(e.stack ?? e.message).slice(0, 900)}`); });
  // B6992: every page load is counted and logged, so a gate's line can say the world reloaded under it
  const life = {loads: 0};
  page.on("load", () => { life.loads++; if ( diag.length < 2000 ) diag.push(`${new Date().toISOString().slice(11, 19)} load: page load ${life.loads} (${page.url().replace(/^https?:\/\/[^/]+/, "")})`); });
  // B6992: a module script that fails to load leaves its module with no hooks and no api: name the file
  page.on("requestfailed", r => { if ( /\.m?js(\?|$)/.test(r.url()) && diag.length < 2000 ) diag.push(`${new Date().toISOString().slice(11, 19)} script failed: ${r.url().replace(/^https?:\/\/[^/]+/, "")} ${r.failure()?.errorText ?? ""}`); });
  page.on("response", r => { if ( r.status() >= 400 && /\.m?js(\?|$)/.test(r.url()) && diag.length < 2000 ) diag.push(`${new Date().toISOString().slice(11, 19)} script ${r.status()}: ${r.url().replace(/^https?:\/\/[^/]+/, "")}`); });
  await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
  const SEL = "select[name=userId], select[name=userid]";
  await page.waitForSelector(SEL, {timeout: 90000});
  const id = await page.$$eval("select[name=userId] option, select[name=userid] option", (os, n) => os.find(o => o.textContent.trim() === n)?.value ?? null, user);
  if ( !id ) { await browser.close(); throw new Error(`No user "${user}" on the join page of ${url}`); }
  await page.selectOption(SEL, id);
  const pw = process.env.WODX_GM_PASSWORD ?? "";
  if ( pw ) await page.fill("input[name=password]", pw);
  await Promise.all([page.waitForURL(/\/game/, {timeout: 90000}), page.click("button[name=join], button[type=submit][name=join], form button[type=submit]")]);
  await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 180000});
  // A module that never starts must not hold the lane: after the wait the gates run and report what is missing.
  // B6952: on a PC running four lanes a fresh sign-in has taken more than 60 s to start WoDX Creation, and the first
  // gate after each new browser then failed on a missing api, so the wait is 180 s and what is missing is returned.
  let late = [];
  await page.waitForFunction(apisReady, LATE_APIS, {timeout: API_WAIT_MS}).catch(async () => {
    late = await page.evaluate(apisMissing, LATE_APIS).catch(() => []);
    console.log(`Some WoDX modules had no api ${API_WAIT_MS / 1000} s after sign-in: ${late.join(", ")}`);
  });
  return {browser, page, late, diag, life};
}
