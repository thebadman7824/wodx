#!/usr/bin/env node
/**
 * Shared folder limits (B3950-B3953). The project files folder (/mnt/project-files) holds at most 50,000 files; past
 * that every new file is refused, and a refused write looks saved but is not kept. These tools keep it well under.
 *
 *   node tools/storage/files.mjs count [--warn 45000] [--report <file>] [--json]
 *       counts every file, by top-level folder, and lists folders that hold a picture set (more than --pics, default
 *       200, images in one folder) or a book kept one file per page. Exit 3 at or above --warn, else 0.
 *       --report writes the summary over an existing file (default <root>/registry/file-count.md); "--report -" skips it.
 *   node tools/storage/files.mjs sweep [--days 7] [--apply] [--keep <regex>]
 *       weekly cleanup: every file in gates/ and jobs/ not changed for --days days goes into one zip,
 *       <root>/archive/sweep-<date>.zip, which is read back and checked; only then are the originals removed.
 *       Without --apply it only lists what it would do. Names matching --keep, and files saying "Status: open" or
 *       "KEEP" in their first lines, are left alone.
 *   --root <folder>   default $WODX_SHARED, else /mnt/project-files
 *
 * The folder is a network mount and slow to walk (a few minutes at 50,000 files), so run count once a day, not in a
 * loop. Needs the zip and unzip programs for sweep.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const LIMIT = 50000, WARN = 45000, PICS = 200;
export const IMAGE = /\.(png|jpe?g|webp|gif|bmp|tiff?|svg|avif)$/i;
export const SWEPT = ["gates", "jobs"];

/** Walk a folder. Returns {total, top: {name: n}, picDirs: [{dir, images}], pageDirs: [{dir, pages}]}. */
export function count(root, {pics = PICS} = {}) {
  const out = {total: 0, top: {}, picDirs: [], pageDirs: []};
  const walk = (d, top) => {
    let ents;
    try { ents = fs.readdirSync(d, {withFileTypes: true}); } catch { return 0; }
    let images = 0, pages = 0, n = 0;
    for ( const e of ents ) {
      const p = path.join(d, e.name);
      if ( e.isDirectory() ) n += walk(p, top ?? e.name);
      else {
        n++;
        if ( IMAGE.test(e.name) ) images++;
        if ( /^p\d+\.txt$/i.test(e.name) ) pages++;
      }
    }
    const rel = path.relative(root, d) || ".";
    if ( images > pics ) out.picDirs.push({dir: rel, images});
    if ( pages > 1 ) out.pageDirs.push({dir: rel, pages});
    return n;
  };
  for ( const e of fs.readdirSync(root, {withFileTypes: true}) ) {
    if ( e.isDirectory() ) out.top[e.name] = walk(path.join(root, e.name), e.name);
    else out.top["(top level)"] = (out.top["(top level)"] ?? 0) + 1;
  }
  out.total = Object.values(out.top).reduce((a, b) => a + b, 0);
  out.picDirs.sort((a, b) => b.images - a.images);
  out.pageDirs.sort((a, b) => b.pages - a.pages);
  return out;
}

/** The plain summary the daily check writes and prints. */
export function summary(c, {warn = WARN, limit = LIMIT, at = new Date()} = {}) {
  const level = c.total >= limit ? "FULL" : c.total >= warn ? "WARNING" : "OK";
  const lines = [`# Shared folder file count`, ``, `${at.toISOString().slice(0, 16)}Z: ${level}, ${c.total} of ${limit} files (warning at ${warn}).`, ``];
  lines.push(`## Largest folders`, ``);
  for ( const [k, v] of Object.entries(c.top).sort((a, b) => b[1] - a[1]).slice(0, 12) ) lines.push(`- ${k}: ${v}`);
  if ( c.picDirs.length ) {
    lines.push(``, `## Picture sets that belong on the PC (rule: samples or a contact sheet here)`, ``);
    for ( const p of c.picDirs.slice(0, 20) ) lines.push(`- ${p.dir}: ${p.images} images`);
  }
  if ( c.pageDirs.length ) {
    lines.push(``, `## Books kept one file per page (rule: one file per book; run books.mjs pack)`, ``);
    lines.push(`- ${c.pageDirs.length} folder(s), ${c.pageDirs.reduce((a, p) => a + p.pages, 0)} page files`);
  }
  return {level, text: lines.join("\n") + "\n"};
}

const firstLines = f => { try { const fd = fs.openSync(f, "r"), b = Buffer.alloc(600); const n = fs.readSync(fd, b, 0, 600, 0); fs.closeSync(fd); return b.slice(0, n).toString("utf8"); } catch { return ""; } };

/** The files the weekly sweep would take, as paths relative to root. */
export function sweepList(root, {days = 7, keep = null, now = Date.now()} = {}) {
  const cut = now - days * 86400000, out = [];
  const walk = d => {
    let ents;
    try { ents = fs.readdirSync(d, {withFileTypes: true}); } catch { return; }
    for ( const e of ents ) {
      const p = path.join(d, e.name), rel = path.relative(root, p);
      if ( e.isDirectory() ) { walk(p); continue; }
      if ( keep && keep.test(rel) ) continue;
      if ( fs.statSync(p).mtimeMs >= cut ) continue;
      if ( /status:\s*open|\bKEEP\b/i.test(firstLines(p)) ) continue;
      out.push(rel);
    }
  };
  for ( const s of SWEPT ) if ( fs.existsSync(path.join(root, s)) ) walk(path.join(root, s));
  return out.sort();
}

/** Zip, check the zip lists every file, then remove the originals and any folder left empty. */
export function sweep(root, files, {date = new Date().toISOString().slice(0, 10)} = {}) {
  if ( !files.length ) return {zip: null, removed: 0};
  const dir = path.join(root, "archive");
  fs.mkdirSync(dir, {recursive: true});
  let zip = path.join(dir, `sweep-${date}.zip`);
  for ( let i = 2; fs.existsSync(zip); i++ ) zip = path.join(dir, `sweep-${date}-${i}.zip`);
  for ( let i = 0; i < files.length; i += 400 ) execFileSync("zip", ["-q", "-X", zip, ...files.slice(i, i + 400)], {cwd: root});
  const listed = new Set(execFileSync("unzip", ["-Z1", zip], {maxBuffer: 64 << 20}).toString().split("\n").filter(Boolean));
  const missing = files.filter(f => !listed.has(f.split(path.sep).join("/")));
  if ( missing.length ) throw new Error(`${zip} is missing ${missing.length} file(s), for example ${missing[0]}; nothing removed`);
  execFileSync("unzip", ["-tq", zip]);
  for ( const f of files ) fs.rmSync(path.join(root, f));
  const dirs = [...new Set(files.map(f => path.dirname(f)))].sort((a, b) => b.length - a.length);
  for ( const d of dirs ) for ( let x = d; x && !SWEPT.includes(x) && x !== "."; x = path.dirname(x) ) {
    try { fs.rmdirSync(path.join(root, x)); } catch { break; }
  }
  return {zip, removed: files.length};
}

function main() {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
  const root = opt("root") ?? process.env.WODX_SHARED ?? "/mnt/project-files";
  const cmd = args[0];
  if ( cmd === "count" ) {
    const warn = Number(opt("warn") ?? WARN), c = count(root, {pics: Number(opt("pics") ?? PICS)});
    const s = summary(c, {warn});
    if ( args.includes("--json") ) console.log(JSON.stringify({...c, level: s.level}, null, 1));
    else process.stdout.write(s.text);
    const rep = opt("report") ?? path.join(root, "registry", "file-count.md");
    if ( rep !== "-" ) { try { fs.writeFileSync(rep, s.text); } catch (e) { console.error(`Could not write ${rep}: ${e.message}`); } }
    process.exit(s.level === "OK" ? 0 : 3);
  } else if ( cmd === "sweep" ) {
    const k = opt("keep"), files = sweepList(root, {days: Number(opt("days") ?? 7), keep: k ? new RegExp(k) : null});
    if ( !args.includes("--apply") ) {
      for ( const f of files ) console.log(f);
      console.log(`${files.length} file(s) would go into ${path.join(root, "archive")}/sweep-<date>.zip. Add --apply to do it.`);
      return;
    }
    const r = sweep(root, files);
    console.log(r.zip ? `Swept ${r.removed} file(s) into ${r.zip}.` : "Nothing to sweep.");
  } else {
    console.error("Commands: count, sweep (see the header of tools/storage/files.mjs)");
    process.exit(2);
  }
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
