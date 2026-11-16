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
export const LATE_APIS = ["wodx-chronicle", "wodx-creation", "wodx-npc", "wodx-storyteller", "wodx-otherworlds", "wodx-interactables"];
/** Runs in the page: true once every active module in ids has its api. */
export function apisReady(ids) {
  return ids.every(id => { const m = globalThis.game?.modules?.get?.(id); return !m?.active || !!m.api; });
}

export async function openGM(url, {channel = process.platform === "win32" ? "msedge" : undefined, user = "Gamemaster Test"} = {}) {
  const {chromium} = require("playwright");
  const browser = await chromium.launch({headless: true, channel});
  // Testbed lanes serve Foundry's own self-signed certificate on localhost.
  const ctx = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1600, height: 1000}});
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log(`[page] ${e.message}`));
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
  // A module that never starts must not hold the lane: after 60 s the gates run and report what is missing.
  await page.waitForFunction(apisReady, LATE_APIS, {timeout: 60000}).catch(() => console.log("Some WoDX modules had no api 60 s after sign-in."));
  return {browser, page};
}
