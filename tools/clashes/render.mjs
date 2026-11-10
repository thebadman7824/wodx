// Writes docs/RULES-CLASHES.md from modules/wodx-chronicle/data/rules-clashes.mjs.
// node tools/clashes/render.mjs        write the file
// node tools/clashes/render.mjs --check exit 1 when the file is out of date
import {readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "docs", "RULES-CLASHES.md");

export async function render() {
  const {default: data} = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/rules-clashes.mjs")).href);
  const cell = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const count = k => data.rows.filter(r => r.status === k).length;
  const lines = [
    "# Rules that clash between lines",
    "",
    "Written from modules/wodx-chronicle/data/rules-clashes.mjs by tools/clashes/render.mjs; edit the data file, then run the script.",
    "",
    "Rules basis: V20 first, then Revised or 2nd edition, then the rest; nothing from 5th edition. Basis column: v20 (V20 wins), era (the book of the chronicle's era profile), line (each character by its own book), house (the books leave it open; a house rule in DECISIONS and PENDING-REVIEW).",
    "",
    `${data.rows.length} rows: ${count("settled")} settled, ${count("fixed")} fixed in code, ${count("check")} waiting on a page check on the PC.`,
    "",
    "| Topic | Lines | What the books say | Settled | Basis | Status | Code | Refs |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...data.rows.map(r => `| ${cell(r.topic)} | ${cell(r.lines.join(", "))} | ${cell(r.books)} | ${cell(r.settled)} | ${r.basis} | ${r.status} | ${cell(r.code)} | ${cell(r.refs.join("; "))} |`),
    "",
    "## Page checks waiting",
    "",
    ...data.rows.filter(r => r.status === "check").map(r => `- **${r.topic}** (${r.id}): ${r.check}`),
    ""
  ];
  return lines.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = await render();
  if (process.argv.includes("--check")) {
    const now = (() => { try { return readFileSync(out, "utf8"); } catch { return ""; } })();
    if (now !== text) { console.error("docs/RULES-CLASHES.md is out of date: run node tools/clashes/render.mjs"); process.exit(1); }
  } else writeFileSync(out, text);
}
