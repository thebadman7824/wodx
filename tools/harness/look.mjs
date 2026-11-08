/**
 * The look review (Phase 6e quality gate): the Kindred, wraith and hunter menus and chat cards in each era kit, as
 * images for the Storyteller to judge. Run ui-fit.mjs first with an output folder (it writes windows.json there).
 *
 * Usage: node look.mjs <path to foundry2.css> <ui-fit output folder> [kits, comma-separated]
 */
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync, writeFileSync, existsSync} from "node:fs";

const require = createRequire(import.meta.url);
const {chromium} = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [foundryCss, dir, kitArg] = process.argv.slice(2);
if ( !foundryCss || !dir || !existsSync(join(dir, "windows.json")) ) { console.error("Usage: node look.mjs <foundry2.css> <ui-fit output folder> [kits]"); process.exit(2); }
const TR = await import(join(root, "modules/wodx-actions/scripts/theme-rules.js"));
const {toneFor} = await import(join(root, "modules/wodx-chronicle/scripts/theme.mjs"));
const windows = JSON.parse(readFileSync(join(dir, "windows.json"), "utf8"));
const kits = (kitArg ?? "dark-ages,victorian,great-war,modern").split(",");

const pub = join(dirname(foundryCss), "..");
const css = [...["fonts/fontawesome/css/all.min.css", "fonts/signika/signika.css"].map(f => join(pub, f)).filter(existsSync), foundryCss,
  ...["wodx-chronicle/styles/wodx-chronicle.css", "wodx-chronicle/styles/wodx-theme.css", "wodx-actions/styles/wodx-actions.css"].map(f => join(root, "modules", f))]
  .map(f => `<link rel="stylesheet" href="${pathToFileURL(f).href}">`).join("");

/* ---- Cards written the way the builders write them ---- */
const dice = (faces, diff, spec = false) => `<div class="vta-dice">${faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= diff ? (spec && f === 10 ? "spec" : "hit") : "miss"}">${f}</span>`).join("")}</div>`;
const roll = (label, n, diff, faces, res, parts = []) => `<div class="vta-sec"><b>${label}</b>: ${n} dice, diff ${diff}${parts.length ? `<div class="vta-parts">${parts.join(" · ")}</div>` : ""}${dice(faces, diff)}${res}</div>`;
const CARDS = [
  {who: "Ilse von Rothenstein", line: "kindred", title: "Ilse von Rothenstein: Frenzy check (hunger)",
    body: roll("Self-Control", 3, 7, [8, 4, 10], `<div class="vta-res good">2 successes — Moderate</div>`, ["hunger: blood under 4", "Willpower spent: +1 success"])
      + `<div class="vta-note">The Beast is held back for this turn; roll again next turn while the hunger lasts (V20 Dark Ages p. 345).</div>`,
    changes: [{label: "Willpower", before: 5, after: 4, max: 6}]},
  {who: "Ilse von Rothenstein", line: "kindred", title: "Ilse von Rothenstein feeds on the drunk at the Black Boar",
    body: roll("Feeding", 4, 6, [7, 9, 2, 6], `<div class="vta-res good">3 successes</div>`) + `<div class="vta-note">The vessel is dazed, not harmed. <b>Blood</b> gained: 3.</div>`,
    changes: [{label: "Blood", before: 3, after: 6, max: 10}]},
  {who: "Ada Lovelace-Byron", line: "wraith", title: "Ada: Argos — Enshroud",
    body: roll("Dexterity + Argos", 5, 8, [9, 3, 8, 1, 6], `<div class="vta-res good">1 success — Marginal</div>`, ["Shroud 7", "the storm +1"])
      + `<div class="vta-note">Ada sinks into the Tempest and is gone from the scene for a turn.</div><div class="wodx-quiet">Wraith 20th p. 155</div>`,
    changes: [{label: "Pathos", before: 6, after: 5, max: 10}]},
  {who: "Shadow of Ada", line: "wraith", cls: "wodx-shadow", title: "The Shadow whispers",
    body: `<p>She never wanted you there, you know. Go back to the house. Look at what they did with your things.</p>`},
  {who: "Brother Anselm", line: "hunter", title: "Brother Anselm: Prayer",
    body: roll("Conviction", 3, 8, [1, 4, 1], `<div class="vta-res bad">BOTCH</div>`) + `<div class="vta-note bad">Heaven is silent, and the silence is heard (Dark Ages: Inquisitor p. 160).</div>`,
    changes: [{label: "Conviction", before: 4, after: 3, max: 10}]},
  {who: "WoDX", line: "", title: "Dawn: 6:12",
    body: `<p>Sunrise. Cainites sleep unless the Road holds them up.</p><ul><li>Ilse: haven sealed</li><li>Konrad: in the open — 3 levels of aggravated</li></ul><p class="wodx-quiet">Set a haven in WoDX Actions → Sun and haven.</p>`, legacy: true}
];
const cardHtml = c => {
  let html = TR.cardLayout({title: c.title, body: c.body, line: c.line, changes: c.changes ?? []});
  if ( c.cls ) html = html.replace('class="vta-card wodx-x', `class="vta-card wodx-x ${c.cls}`);
  return `<li class="chat-message message flexcol"><header class="message-header flexrow"><h4 class="message-sender">${c.who}</h4><span class="message-metadata"><time>Now</time></span></header><div class="message-content">${html}</div></li>`;
};
const chat = `<div class="chat-col"><ol class="chat-log plain">${CARDS.map(cardHtml).join("")}</ol></div>`;

const body = kit => `class="vtt game system-worldofdarkness theme-dark wodx-look" data-wodx-kit="${kit}" data-wodx-look="era" data-wodx-tone="${toneFor(kit, "era")}" style="--wx-scale:1"`;
const page = (kit, inner) => `<!doctype html><html><head><meta charset="utf-8">${css}<style>
  body { position: static; overflow: visible; background: #2b2d31; padding: 20px; display: block; width: max-content; height: auto; }
  .row { display: flex; gap: 20px; align-items: flex-start; }
  .label { color: #ddd; font: 600 16px Signika, sans-serif; margin: 0 0 8px; }
  .application { position: relative !important; max-height: none !important; }
  .application :is(.window-content, .dialog-content, form) { max-height: none !important; overflow: visible !important; }
  .chat-col { width: 300px; background: #1b1c1f; padding: 6px; border-radius: 6px; }
  .chat-log { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .chat-message { padding: 6px; background: rgba(255,255,255,0.06); border-radius: 5px; }
</style></head><body ${body(kit)}>${inner}</body></html>`;
const menuOf = name => windows.find(w => w.name.includes(`WoDX Actions — ${name}`));
const win = w => `<div class="${w.classes}" style="width:${w.width}px"><header class="window-header"><h1 class="window-title">${w.name.replace(/^Dialog · /, "")}</h1></header><section class="window-content">${w.content.replace(/<footer class="form-footer">[\s\S]*?<\/footer>/, `<footer class="form-footer"><button type="button" data-action="close"><i class="fas fa-times"></i> Close</button></footer>`)}</section></div>`;

const browser = await chromium.launch();
const shots = [];
const snap = async (file, html) => {
  const p = await browser.newPage({viewport: {width: 900, height: 600}, deviceScaleFactor: 2});
  const f = join(dir, file.replace(/\.png$/, ".html"));
  writeFileSync(f, html);
  console.log("rendering", file);
  await p.goto(pathToFileURL(f).href, {waitUntil: "load", timeout: 30000});
  await Promise.race([p.evaluate(() => document.fonts.ready.then(() => true)), new Promise(r => setTimeout(r, 3000))]);
  await p.waitForTimeout(300);
  console.log("  size", await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]));
  await p.screenshot({path: join(dir, file), fullPage: true});
  await p.close();
  shots.push(file);
};
// The three menus and the chat, one sheet per kit
for ( const kit of kits ) {
  const menus = ["Kindred (Cainite)", "Wraith / Ghost", "Hunter / Inquisitor"].map(menuOf).filter(Boolean);
  await snap(`look-${kit}.png`, page(kit, `<p class="label">${kit}</p><div class="row">${menus.map(win).join("")}${chat}</div>`));
}
// The cards in each kit (stitched side by side by the caller: see look-cards-by-era.png)
const across = ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"];
for ( const k of across ) await snap(`cards-${k}.png`, page(k, `<p class="label">${k}</p>${chat}`));
await browser.close();
console.log(shots.join("\n"));
