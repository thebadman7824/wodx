/**
 * A first-login walk through The Lone Chronicle, with a screenshot at every step (B5145). It plays a brand-new lone
 * player in a real browser, so what Ben sees on his first night is seen first.
 *   node tools/solo/walk.mjs --phase setup   --url https://localhost:30010 --out <folder>   (no seat running)
 *   node tools/solo/seat.mjs --url https://localhost:30010                                    (leave it running)
 *   node tools/solo/walk.mjs --phase walk    --url https://localhost:30010 --out <folder>
 *   (stop the seat)
 *   node tools/solo/walk.mjs --phase cleanup --url https://localhost:30010 --out <folder>   (no seat running)
 * setup (as Gamemaster Test): makes the player "Walk Test" with no character, notes the clock, the active scene and
 *   whether the tour was offered; walk.json in the out folder keeps them.
 * walk (as Walk Test): 01 the join; 02 the first screen (a map, not the bare background); 03 the arrival window;
 *   04 the token centred and selected, with the wizard open; 05 the first-night tour offered; 06 the panel; 07 each
 *   panel window opened and closed (time, travel, I am stuck, the curtain; pause twice); 08 the Storyteller tools on,
 *   each tool window, then off. Each step is pass or fail in walk-result.json; nothing moves the clock.
 * cleanup (as Gamemaster Test): deletes the Walk Test user, the character the walk made and its token, puts the
 *   clock back. The landing stays the active scene, for Ben's own first login.
 * No password is typed or stored. Playwright comes from tools/harness.
 */
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../harness/package.json"));
const {chromium} = require("playwright");

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const url = (opt("url") ?? "https://localhost:30010").replace(/\/$/, "");
const phase = opt("phase") ?? "walk";
const out = opt("out") ?? path.resolve("walk-out");
const channel = opt("channel") ?? (process.platform === "win32" ? "msedge" : undefined);
const WALKER = "Walk Test", GM = "Gamemaster Test", TAG = "Walk Test's character";
fs.mkdirSync(out, {recursive: true});
const stateFile = path.join(out, "walk.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({headless: !args.includes("--show"), channel});
const ctx = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1600, height: 1000}, deviceScaleFactor: 1});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if ( m.type() === "error" ) errors.push(m.text().slice(0, 300)); });

async function join(name) {
  await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
  const SEL = "select[name=userId], select[name=userid]";
  await page.waitForSelector(SEL, {timeout: 60000});
  const id = await page.$$eval("select[name=userId] option, select[name=userid] option", (os, n) => os.find(o => o.textContent.trim() === n)?.value ?? null, name);
  if ( !id ) throw new Error(`No user "${name}" on the join page`);
  await page.selectOption(SEL, id);
  await Promise.all([page.waitForURL(/\/game/, {timeout: 60000}), page.click("button[name=join], form button[type=submit]")]);
  await page.waitForFunction(() => window.game?.ready === true, null, {timeout: 120000});
  await sleep(1500);
}

const steps = [];
let n = 0;
async function shot(label) {
  n++;
  const file = path.join(out, `${String(n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`);
  await page.screenshot({path: file});
  return path.basename(file);
}
async function step(name, fn) {
  try { const r = await fn(); steps.push({name, pass: !!r?.pass, ...r}); }
  catch (e) { steps.push({name, pass: false, error: e.message}); try { await shot(`${name}-error`); } catch { /* the page is gone */ } }
}
const evalIn = (fn, a) => page.evaluate(fn, a);

try {
  if ( phase === "setup" ) {
    await join(GM);
    const st = await evalIn(async who => {
      let u = game.users.getName(who);
      if ( !u ) u = await User.create({name: who, role: CONST.USER_ROLES.PLAYER});
      return {userId: u.id, t0: game.time.worldTime, active: game.scenes.active?.id ?? null, hadCharacter: !!u.character,
        solo: game.modules.get("wodx-solo")?.version ?? null, on: game.settings.get("wodx-solo", "on"), scenes: game.scenes.size,
        landing: game.modules.get("wodx-solo")?.api?.rules?.pickLanding?.(game.scenes.map(s => ({id: s.id, name: s.name, active: s.active, landing: !!s.getFlag("wodx-solo", "landing"), img: s.background?.src ?? ""})), game.settings.get("wodx-solo", "landing")) ?? null};
    }, WALKER);
    fs.writeFileSync(stateFile, JSON.stringify(st, null, 1));
    console.log(JSON.stringify(st));
  } else if ( phase === "walk" ) {
    const st = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    await step("01 the join", async () => {
      await page.goto(`${url}/join`, {waitUntil: "domcontentloaded"});
      await page.waitForSelector("select[name=userId], select[name=userid]", {timeout: 60000});
      return {pass: true, shot: await shot("join")};
    });
    await join(WALKER);
    await step("02 the first screen", async () => {
      await sleep(2500);
      const s = await evalIn(() => ({scene: canvas.scene?.name ?? null, map: !!(canvas.scene?.background?.src), dark: canvas.scene?.environment?.darknessLevel ?? null, seat: !!game.users.activeGM}));
      return {pass: !!s.scene && s.seat, ...s, shot: await shot("first-screen")};
    });
    await step("03 the arrival window", async () => {
      const dlg = page.locator(".wsolo-arrive");
      await dlg.waitFor({timeout: 20000});
      await dlg.locator("input[name=name]").fill(TAG);
      await dlg.locator("input[name=line][value=vampire]").check();
      const s = await shot("arrival-window");
      await dlg.locator("button[data-action=ok], footer button").first().click();
      return {pass: true, shot: s};
    });
    await step("04 the token and the wizard", async () => {
      await page.waitForFunction(() => !!game.user.character && canvas.tokens?.controlled?.some(t => t.actor?.id === game.user.character.id), null, {timeout: 30000});
      await sleep(1500);
      const s = await evalIn(() => ({name: game.user.character?.name, type: game.user.character?.type, scene: canvas.scene?.name, controlled: canvas.tokens.controlled.length,
        wizard: [...foundry.applications.instances.values()].some(a => String(a.id).startsWith("wodx-wizard-") && a.rendered)}));
      return {pass: s.controlled > 0 && s.wizard && s.type === "Vampire", ...s, shot: await shot("token-and-wizard")};
    });
    await step("05 the first-night tour", async () => {
      await evalIn(() => { for ( const a of [...foundry.applications.instances.values()] ) if ( String(a.id).startsWith("wodx-wizard-") ) a.close(); });
      const offered = await page.waitForFunction(() => [...document.querySelectorAll(".window-title, .window-header h1")].some(e => /Your first night/.test(e.textContent)), null, {timeout: 20000}).then(() => true).catch(() => false);
      const s = await shot("tour-offered");
      if ( offered ) await page.locator(".application.dialog button[data-action=yes]").first().click().catch(() => {});
      await sleep(1000);
      const guide = await evalIn(() => !!foundry.applications.instances.get("wodx-guide")?.rendered);
      return {pass: offered && guide, offered, guide, shot: s, shot2: await shot("tour-open")};
    });
    await step("06 the panel", async () => {
      await evalIn(() => game.modules.get("wodx-solo").api.panel.open());
      await sleep(800);
      await evalIn(() => { const d = document.querySelector("#wodx-solo-panel details.wsolo-more"); if ( d ) d.open = true; });
      const s = await evalIn(() => ({buttons: [...document.querySelectorAll("#wodx-solo-panel button[data-action=act]")].map(b => b.dataset.id), make: !!document.querySelector("#wodx-solo-panel [data-action=arrive]")}));
      return {pass: s.buttons.length >= 6 && !s.make, ...s, shot: await shot("panel")};
    });
    const closeDialogs = () => evalIn(() => { for ( const a of [...foundry.applications.instances.values()] ) if ( a instanceof foundry.applications.api.DialogV2 && a.rendered ) a.close(); });
    for ( const id of ["time", "travel", "stuck", "curtain"] ) {
      await step(`07 panel: ${id}`, async () => {
        const before = await evalIn(() => [...foundry.applications.instances.keys()]);
        await page.locator(`#wodx-solo-panel button[data-action=act][data-id=${id}]`).click();
        await sleep(1500);
        if ( id === "curtain" ) { await page.locator(".application.dialog button[data-action=yes]").first().click().catch(() => {}); await sleep(2500); }
        const after = await evalIn(() => [...foundry.applications.instances.entries()].filter(([, a]) => a.rendered).map(([k, a]) => `${k}: ${a.title}`));
        const s = await shot(`panel-${id}`);
        const opened = after.filter(x => !before.includes(x.split(":")[0]));
        await closeDialogs();
        for ( const k of opened.map(x => x.split(":")[0]) ) await evalIn(k => foundry.applications.instances.get(k)?.close(), k);
        return {pass: opened.length > 0, opened, shot: s};
      });
    }
    await step("07 panel: pause twice", async () => {
      const p0 = await evalIn(() => game.paused);
      await page.locator("#wodx-solo-panel button[data-action=act][data-id=pause]").click();
      const flipped = await page.waitForFunction(p => game.paused !== p, p0, {timeout: 10000}).then(() => true).catch(() => false);
      const s = await shot("paused");
      await page.locator("#wodx-solo-panel button[data-action=act][data-id=pause]").click();
      const back = await page.waitForFunction(p => game.paused === p, p0, {timeout: 10000}).then(() => true).catch(() => false);
      return {pass: flipped && back, flipped, back, shot: s};
    });
    await step("08 the Storyteller tools", async () => {
      await evalIn(() => { const d = document.querySelector("#wodx-solo-panel details.wsolo-more"); if ( d ) d.open = true; });
      await page.locator("#wodx-solo-panel [data-action=sttoggle]").click();
      await page.waitForSelector("#wodx-solo-panel [data-action=st]", {timeout: 10000});
      const ids = await evalIn(() => [...document.querySelectorAll("#wodx-solo-panel [data-action=st]")].map(b => b.dataset.id));
      const seen = [];
      for ( const id of ids ) {
        const before = await evalIn(() => [...foundry.applications.instances.keys()]);
        await page.locator(`#wodx-solo-panel [data-action=st][data-id=${id}]`).click();
        await sleep(2000);
        const now = await evalIn(() => [...foundry.applications.instances.entries()].filter(([, a]) => a.rendered).map(([k]) => k));
        const opened = now.filter(k => !before.includes(k) && k !== "wodx-solo-panel");
        seen.push({id, opened, shot: await shot(`st-${id}`)});
        for ( const k of opened ) await evalIn(k => foundry.applications.instances.get(k)?.close(), k);
        await closeDialogs();
      }
      await evalIn(() => { const d = document.querySelector("#wodx-solo-panel details.wsolo-more"); if ( d ) d.open = true; });
      await page.locator("#wodx-solo-panel [data-action=sttoggle]").click();
      await sleep(1500);
      const off = await evalIn(() => !document.querySelector("#wodx-solo-panel [data-action=st]"));
      return {pass: ids.length >= 5 && seen.every(x => x.opened.length > 0) && off, tools: seen, off};
    });
    await step("09 where you can go", async () => {
      const s = await evalIn(() => {
        const here = canvas.scene;
        const notes = (here?.notes ?? []).map(n => n.entry?.name ?? n.text).filter(Boolean);
        const ways = (here?.regions ?? []).filter(r => r.behaviors?.some(b => /teleport|way/i.test(b.type ?? ""))).map(r => r.name);
        const saga = game.modules.get("wodx-storyteller")?.api?.saga?.state?.() ?? null;
        return {scene: here?.name, scenes: game.scenes.filter(x => x.navigation || x.permission >= 1).map(x => x.name), notes, ways, saga: saga ? Object.keys(saga) : null};
      });
      return {pass: true, ...s, shot: await shot("where-you-can-go")};
    });
    const t1 = await evalIn(() => game.time.worldTime);
    fs.writeFileSync(path.join(out, "walk-result.json"), JSON.stringify({at: new Date().toISOString(), url, summary: `${steps.filter(s => s.pass).length}/${steps.length} passed`,
      clockMoved: t1 - st.t0, steps, errors: [...new Set(errors)].slice(0, 40)}, null, 1));
    console.log(`${steps.filter(s => s.pass).length}/${steps.length} passed; clock moved ${t1 - st.t0} s`);
  } else if ( phase === "cleanup" ) {
    const st = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    await join(GM);
    const r = await evalIn(async ({userId, t0, tag}) => {
      const u = game.users.get(userId);
      const actors = game.actors.filter(a => a.name === tag || a.getFlag("wodx-solo", "arrival")?.userId === userId);
      let tokens = 0;
      for ( const s of game.scenes ) {
        const ids = s.tokens.filter(t => actors.some(a => a.id === t.actorId)).map(t => t.id);
        if ( ids.length ) { await s.deleteEmbeddedDocuments("Token", ids); tokens += ids.length; }
      }
      for ( const a of actors ) await a.delete();
      if ( u ) await u.delete();
      if ( game.time.worldTime !== t0 ) await game.time.advance(t0 - game.time.worldTime);
      return {actors: actors.length, tokens, user: !!u, clock: game.time.worldTime - t0, active: game.scenes.active?.name ?? null};
    }, {...st, tag: TAG});
    console.log(JSON.stringify(r));
  }
} catch (e) { console.error(`walk ${phase}: ${e.message}`); process.exitCode = 1; }
await browser.close().catch(() => {});
process.exit(process.exitCode ?? 0);
