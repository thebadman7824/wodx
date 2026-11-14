/**
 * Signs a headless browser in to a lane as Gamemaster Test. Playwright comes from tools/harness (npm install there
 * once; keep PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 on the PC, Edge is used). The account has no password on the testbed;
 * WODX_GM_PASSWORD is read if it ever gets one. No password is stored here.
 */
import {createRequire} from "node:module";
import path from "node:path";
import {HERE} from "./lib.mjs";

const require = createRequire(path.join(HERE, "../harness/package.json"));

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
  return {browser, page};
}
