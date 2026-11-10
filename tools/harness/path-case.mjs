// Letter-case check for file paths. The live server runs on Linux, where
// "Icons/Door.webp" and "icons/door.webp" are different files; Windows and
// macOS treat them as the same, so a wrong case only breaks once released.
// This finds every file path the system, the modules and the world files
// refer to and compares each one, segment by segment, with the real names
// on disk.
//
// Run directly for a report: node path-case.mjs [--missing]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const TEXT_EXT = new Set(['.mjs', '.js', '.json', '.hbs', '.html', '.css', '.md']);
const SKIP_DIRS = new Set(['node_modules', '.git']);
// File types a path reference can point at.
const REF_EXT = 'mjs|js|json|hbs|html|css|svg|png|jpe?g|webp|gif|ogg|mp3|wav|webm|m4a|woff2?|ttf|otf|txt|md|pdf';

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const dirCache = new Map();
function namesIn(dir) {
  if (!dirCache.has(dir)) {
    let names = null;
    try { names = readdirSync(dir); } catch { names = null; }
    dirCache.set(dir, names);
  }
  return dirCache.get(dir);
}

// Resolve a repo-relative posix path one segment at a time.
// Returns {status: 'ok'|'case'|'missing', actual}.
export function checkPath(relPath) {
  const parts = relPath.split('/').filter(s => s && s !== '.');
  let dir = REPO;
  const actual = [];
  let caseWrong = false;
  for (const part of parts) {
    if (part === '..') { dir = dirname(dir); actual.push('..'); continue; }
    const names = namesIn(dir);
    if (!names) return { status: 'missing' };
    if (names.includes(part)) { actual.push(part); dir = join(dir, part); continue; }
    const hit = names.find(n => n.toLowerCase() === part.toLowerCase());
    if (!hit) return { status: 'missing' };
    caseWrong = true;
    actual.push(hit);
    dir = join(dir, hit);
  }
  return { status: caseWrong ? 'case' : 'ok', actual: actual.join('/') };
}

// Map a Foundry-style URL path to a repo path, or null when it points
// outside what the repo holds (core icons, world assets, user data).
function foundryToRepo(p) {
  const m = p.match(/^\/?(systems|modules)\/([^/]+)\/(.+)$/);
  if (!m) return null;
  if (m[1] === 'systems') return m[2] === 'worldofdarkness' ? `system/worldofdarkness/${m[3]}` : null;
  return `modules/${m[2]}/${m[3]}`;
}

function inRepo(rel) {
  const top = rel.split('/')[0];
  return top === 'system' || top === 'modules' || top === 'worlds';
}

// Root folder (repo-relative) of the package a file belongs to.
function packageRoot(fileRel) {
  const s = fileRel.split('/');
  if (s[0] === 'system') return 'system/worldofdarkness';
  if (s[0] === 'modules') return `modules/${s[1]}`;
  if (s[0] === 'worlds') return `worlds/${s[1]}`;
  return null;
}

const ABS_RE = new RegExp(String.raw`(?:^|[^A-Za-z0-9_./-])(\/?(?:systems|modules)\/[A-Za-z0-9_.-]+\/[^\s"'\`()<>{}\[\],;|*?#$\\]+?\.(?:${REF_EXT}))(?=$|[^A-Za-z0-9_])`, 'g');
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+)\1/g;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
const MANIFEST_KEYS = ['esmodules', 'scripts', 'styles'];

function stripQuery(p) {
  p = p.replace(/[?#].*$/, '');
  try { return decodeURIComponent(p); } catch { return p; }
}
function dynamic(p) { return /\$\{|\{\{|\*/.test(p); }

// Upper-case string constants in a file: const MOD = "wodx-x", A = "...".
// A module-id constant that is imported rather than declared (MOD,
// MODULE_ID) falls back to the id of the module the file is in.
function constantsIn(text, fileRel) {
  const map = new Map();
  for (const m of text.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*=\s*(['"])([^'"$\n]*)\2/g)) {
    if (!map.has(m[1])) map.set(m[1], m[3]);
  }
  const s = fileRel.split('/');
  if (s[0] === 'modules') for (const k of ['MOD', 'MODULE_ID', 'MODULE']) if (!map.has(k)) map.set(k, s[1]);
  return map;
}

// Collect every path reference: [{file, line, ref, target}] with target a
// repo-relative path.
export function collectRefs() {
  const files = walk(join(REPO, 'system')).concat(walk(join(REPO, 'modules')), walk(join(REPO, 'worlds')));
  const refs = [];
  for (const abs of files) {
    const ext = abs.slice(abs.lastIndexOf('.'));
    const fileRel = relative(REPO, abs).split(sep).join('/');
    // Compendium packs are LevelDB; their records hold image paths as
    // plain bytes, so a byte scan finds most of them (best effort).
    const isPack = (ext === '.ldb' || ext === '.log') && fileRel.includes('/packs/');
    if (!TEXT_EXT.has(ext) && !isPack) continue;
    const text = readFileSync(abs, isPack ? 'latin1' : 'utf8');
    const lineOf = idx => text.slice(0, idx).split('\n').length;
    const add = (ref, target, idx) => {
      if (!target || dynamic(ref)) return;
      target = posix.normalize(target);
      if (!inRepo(target)) return;
      refs.push({ file: fileRel, line: lineOf(idx), ref, target });
    };
    for (const m of text.matchAll(ABS_RE)) {
      const ref = stripQuery(m[1]);
      add(ref, foundryToRepo(ref), m.index);
    }
    if (isPack) continue;
    if (ext === '.mjs' || ext === '.js') {
      // Paths built from a string constant, e.g. `modules/${MOD}/x.hbs`.
      const consts = constantsIn(text, fileRel);
      for (const m of text.matchAll(/`([^`]*\$\{[^`]*)`/g)) {
        const filled = m[1].replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (all, name) => consts.get(name) ?? all);
        if (filled === m[1]) continue;
        for (const n of ` ${filled} `.matchAll(ABS_RE)) {
          const ref = stripQuery(n[1]);
          add(ref, foundryToRepo(ref), m.index);
        }
      }
      for (const m of text.matchAll(IMPORT_RE)) {
        const ref = stripQuery(m[2]);
        add(ref, posix.join(posix.dirname(fileRel), ref), m.index);
      }
    }
    if (ext === '.css') {
      for (const m of text.matchAll(CSS_URL_RE)) {
        const ref = stripQuery(m[2].trim());
        if (!ref || /^(data:|https?:|\/\/|%23|#)/.test(m[2].trim())) continue;
        const target = /^\/?(systems|modules)\//.test(ref) ? foundryToRepo(ref) : posix.join(posix.dirname(fileRel), ref);
        add(ref, target, m.index);
      }
    }
    if (/\/(module|system|world)\.json$/.test(fileRel)) {
      let json;
      try { json = JSON.parse(text); } catch { continue; }
      const root = packageRoot(fileRel);
      const local = p => (typeof p === 'string' && !/^(https?:)?\/\//.test(p)) ? posix.join(root, p) : null;
      for (const k of MANIFEST_KEYS) for (const p of json[k] ?? []) add(p, local(p), text.indexOf(p));
      for (const l of json.languages ?? []) if (l.path) add(l.path, local(l.path), text.indexOf(l.path));
      // World packs live in the Foundry data folder, not in the repo.
      if (!fileRel.startsWith('worlds/')) for (const pk of json.packs ?? []) if (pk.path) add(pk.path, local(pk.path), text.indexOf(pk.path));
    }
  }
  return refs;
}

// Names in one folder that differ only in letter case: two files on Linux,
// one file (whichever was copied last) on Windows.
export function caseTwins() {
  const out = [];
  const visit = dir => {
    const names = readdirSync(dir, { withFileTypes: true }).filter(e => !SKIP_DIRS.has(e.name));
    const seen = new Map();
    for (const e of names) {
      const k = e.name.toLowerCase();
      if (seen.has(k)) out.push(relative(REPO, join(dir, seen.get(k))).split(sep).join('/') + ' / ' + e.name);
      else seen.set(k, e.name);
      if (e.isDirectory()) visit(join(dir, e.name));
    }
  };
  for (const top of ['system', 'modules', 'worlds']) visit(join(REPO, top));
  return out;
}

export function findMismatches() {
  const out = { case: [], missing: [], ok: 0 };
  for (const r of collectRefs()) {
    const res = checkPath(r.target);
    if (res.status === 'ok') out.ok++;
    else if (res.status === 'case') out.case.push({ ...r, actual: res.actual });
    else out.missing.push(r);
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = findMismatches();
  console.log(`references checked: ${r.ok + r.case.length + r.missing.length}, ok ${r.ok}, case mismatches ${r.case.length}, not in repo ${r.missing.length}`);
  for (const t of caseTwins()) console.log(`TWIN ${t}`);
  for (const c of r.case) console.log(`CASE ${c.file}:${c.line} ${c.ref} -> on disk ${c.actual}`);
  if (process.argv.includes('--missing')) for (const c of r.missing) console.log(`MISSING ${c.file}:${c.line} ${c.ref}`);
}
