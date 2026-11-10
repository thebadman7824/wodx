// Writes docs/TEST-GAPS.md: harness line coverage per module file, the files the harness never loads, and which
// gates name each module. Run from tools/harness: node test-gaps.mjs (it runs the whole suite with coverage).
import {spawnSync} from "node:child_process";
import {readdirSync, readFileSync, writeFileSync, statSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..", "..");
const tests = readdirSync(here).filter(f => f.endsWith(".test.mjs"));
const run = spawnSync(process.execPath, ["--test", "--experimental-test-coverage", ...tests], {cwd: here, encoding: "utf8", maxBuffer: 1 << 28});
const report = (run.stdout ?? "").split("# start of coverage report")[1] ?? "";
const rows = [], stack = [];
for (const l of report.split("\n")) {
  const m = /^#( +)(\S[^|]*?)\s*\|\s*([\d.]*)\s*\|\s*([\d.]*)\s*\|\s*([\d.]*)\s*\|/.exec(l);
  if (!m) continue;
  const d = m[1].length; while (stack.length && stack.at(-1)[0] >= d) stack.pop(); stack.push([d, m[2]]);
  if (/\.m?js$/.test(m[2]) && m[3]) rows.push({path: stack.map(s => s[1]).filter(s => s !== "..").join("/"), lines: +m[3], funcs: +m[5]});
}
const mods = readdirSync(join(root, "modules")).filter(m => statSync(join(root, "modules", m)).isDirectory()).sort();
const gateDir = join(root, "tools/gate");
const gates = readdirSync(gateDir).filter(f => f.endsWith(".mjs")).map(f => [f, readFileSync(join(gateDir, f), "utf8")]);
const out = ["# Test gaps", "", "Written by tools/harness/test-gaps.mjs. Harness line coverage of each module file (`node --test --experimental-test-coverage`), the files the harness never loads, and the gates in tools/gate that name the module. A low harness figure on a file of windows and hooks is expected where a gate covers it.", ""];
for (const m of mods) {
  const files = readdirSync(join(root, "modules", m, "scripts")).filter(f => /\.m?js$/.test(f));
  const got = new Map(rows.filter(r => r.path.startsWith(`modules/${m}/scripts/`)).map(r => [r.path.split("/").at(-1), r]));
  const mean = got.size ? [...got.values()].reduce((s, r) => s + r.lines, 0) / got.size : 0;
  const g = gates.filter(([, src]) => src.includes(m)).map(([f]) => f.replace(/\.mjs$/, ""));
  out.push(`## ${m}`, "", `${got.size} of ${files.length} files loaded by the harness, mean line coverage ${mean.toFixed(0)}%. Gates: ${g.join(", ") || "none"}.`, "");
  out.push("| File | Lines % | Functions % |", "| --- | --- | --- |");
  for (const f of files.sort()) { const r = got.get(f); out.push(`| ${f} | ${r ? r.lines.toFixed(0) : "not loaded"} | ${r ? r.funcs.toFixed(0) : ""} |`); }
  out.push("");
}
writeFileSync(join(root, "docs/TEST-GAPS.md"), out.join("\n"));
console.log(`${rows.length} files with coverage; docs/TEST-GAPS.md written`);
