/**
 * Two-browser gates: one headless browser signed in as Gamemaster Test, a second as Player Test, so a gate can see
 * what a player sees (nameplates, whispers, a player's own dialogs). On the PC, with the testbed Foundry running:
 *   node tools/harness/gate-two.mjs gatelookhand [--url https://localhost:30000] [--channel msedge]
 * The gate (Data/wodx-gate/<name>.mjs) exports run({phase, ids, playerSteps}) with three phases:
 *   setup (GM, returns ids), player (player, returns steps), finish (GM, writes the result file, returns a summary).
 * Setup makes the Player Test user (no password, testbed only) before the player browser signs in.
 * Neither account has a password; WODX_GM_PASSWORD is read if Gamemaster Test ever gets one. No password is stored here.
 * Keep PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 on the PC: Edge is used, not a downloaded browser.
 */
import {chromium} from "playwright";

const args = process.argv.slice(2);
const gate = args.find(a => !a.startsWith("--"));
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const url = (opt("url") ?? "https://localhost:30000").replace(/\/$/, "");
const channel = opt("channel") ?? (process.platform === "win32" ? "msedge" : undefined);
if ( !gate || !/^[\w-]+$/.test(gate) ) { console.error("Usage: node tools/harness/gate-two.mjs <gate name>"); process.exit(2); }

async function join(browser, name, password = "") {
  const ctx = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1600, height: 1000}});
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log(`[${name}] page error: ${e.message}`));
  await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
  await page.waitForSelector("select[name=userid]", {timeout: 60000});
  const id = await page.$$eval("select[name=userid] option", (os, n) => os.find(o => o.textContent.trim() === n)?.value ?? null, name);
  if ( !id ) throw new Error(`No user "${name}" on the join page`);
  await page.selectOption("select[name=userid]", id);
  if ( password ) await page.fill("input[name=password]", password);
  await Promise.all([page.waitForURL(/\/game/, {timeout: 60000}), page.click("button[name=join], button[type=submit][name=join], form button[type=submit]")]);
  await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 120000});
  return {ctx, page};
}
const runPhase = (page, phase, extra = {}) => page.evaluate(async ({gate, phase, extra}) => {
  const mod = await import(`/wodx-gate/${gate}.mjs?${Date.now()}`);
  return mod.run({phase, ...extra});
}, {gate, phase, extra});

const browser = await chromium.launch({headless: true, channel});
let code = 0;
try {
  const gm = await join(browser, "Gamemaster Test", process.env.WODX_GM_PASSWORD ?? "");
  const wasPaused = await gm.page.evaluate(() => game.paused);
  const ids = await runPhase(gm.page, "setup");
  if ( ids?.error ) throw new Error(ids.error);
  let playerSteps;
  try {
    const pl = await join(browser, "Player Test");
    playerSteps = await runPhase(pl.page, "player", {ids});
    await pl.ctx.close();
  } catch (e) { playerSteps = [{name: "player browser", pass: false, error: e.message}]; }
  const summary = await runPhase(gm.page, "finish", {ids, playerSteps});
  await gm.page.evaluate(p => game.togglePause(p, {broadcast: true}), wasPaused).catch(() => {});
  console.log(`${gate}: ${summary}`);
  if ( !/^(\d+)\/\1 passed$/.test(String(summary)) ) code = 1;
} catch (e) { console.error(`${gate}: ${e.message}`); code = 1; }
await browser.close();
process.exit(code);
