/**
 * Bundle the WoDX modules for a release copy: node tools/release/bundle.mjs <Foundry Data folder or deploy folder> [--check]
 *
 * For each wodx- module under <dir>/modules, its esmodules entry is bundled and minified with esbuild into
 * scripts/<entry>.bundle.js beside the entry, with code reached only by import() split into chunk files
 * (so a line's code loads when it is first used), and module.json is pointed at the bundle. The source files
 * stay where they are. A file another package imports (for example wodx-chronicle/scripts/calendar.mjs) is kept
 * out of every bundle and loaded from its own path, so each such file still has one copy in the browser.
 *
 * Run it on a copy (a deploy folder), never on the repo. --check bundles into memory and reports sizes only; --list
 * also names every file kept out of the bundles.
 * Undo: put each module.json back from the repo (or delete the folder and deploy again).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep, basename, extname } from "node:path";

// esbuild comes from the harness folder (cd tools/harness && npm install)
const here = dirname(fileURLToPath(import.meta.url));
const { build } = createRequire(join(here, "..", "harness", "package.json"))("esbuild");

const args = process.argv.slice(2);
const check = args.includes("--check");
const root = resolve(args.find(a => !a.startsWith("--")) ?? "");
if ( !existsSync(join(root, "modules")) ) { console.error(`No modules folder in ${root}`); process.exit(1); }
const MODS = join(root, "modules");
const SYS = join(root, "systems");

const walk = d => readdirSync(d, {withFileTypes: true}).flatMap(e => {
  const p = join(d, e.name);
  if ( e.isDirectory() ) return ["node_modules", "tests", ".git"].includes(e.name) ? [] : walk(p);
  return /\.(m?js)$/.test(e.name) ? [p] : [];
});

/** The package folder (modules/<id> or systems/<id>) a path sits in. */
const pkgOf = p => {
  const r = relative(root, p).split(sep);
  return ["modules", "systems"].includes(r[0]) && r[1] ? join(root, r[0], r[1]) : null;
};

/** The rules core (B8060): its files belong to the module that uses them when the bundles are made. */
const RULES_PKG = join(MODS, "wodx-rules");

/**
 * Every file one package imports from another (static or import()): those stay unbundled, so each has one copy in
 * the browser. A rules core file (modules/wodx-rules) reached by one module only, directly or through other rules core
 * files, is bundled into that module as if it still sat there (B8060), which is what happened before it moved; one
 * reached by two or more modules stays unbundled, as any shared file does.
 * Returns {shared, owner}: owner maps each rules core file bundled into a module to that module's folder.
 */
export function sharedFiles(files) {
  const shared = new Set(), edges = new Map();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'`]([^"'`]+)["'`]/g;
  for ( const f of files ) {
    const src = readFileSync(f, "utf8"), out = [];
    for ( const m of src.matchAll(re) ) {
      if ( !m[1].startsWith(".") ) continue;
      const to = resolve(dirname(f), m[1]);
      out.push(to);
      if ( pkgOf(to) && pkgOf(to) !== pkgOf(f) && pkgOf(to) !== RULES_PKG ) shared.add(to);
    }
    edges.set(f, out);
  }
  // which modules reach each rules core file, through rules core files only. A file loaded from its own path (one in
  // `shared`) counts as a reacher of its own, so what it imports is never also copied into a bundle. Repeat until
  // nothing new is shared, since a newly shared rules core file passes that on to the files it imports.
  let owner, grew = true;
  while ( grew ) {
    grew = false;
    const reach = new Map();
    for ( const f of files ) {
      const raw = shared.has(f);
      if ( pkgOf(f) === RULES_PKG && !raw ) continue;
      const from = raw ? `raw:${f}` : pkgOf(f), queue = (edges.get(f) ?? []).filter(t => pkgOf(t) === RULES_PKG);
      while ( queue.length ) {
        const t = queue.pop();
        const set = reach.get(t) ?? new Set();
        if ( set.has(from) ) continue;
        set.add(from);
        reach.set(t, set);
        if ( !shared.has(t) ) for ( const n of edges.get(t) ?? [] ) if ( pkgOf(n) === RULES_PKG ) queue.push(n);
      }
    }
    owner = new Map();
    for ( const [f, set] of reach ) {
      const only = [...set][0];
      if ( set.size === 1 && !only.startsWith("raw:") ) owner.set(f, only);
      else if ( !shared.has(f) ) { shared.add(f); grew = true; }
    }
    // a module file a rules core file imports is shared unless that rules file is bundled into the same module
    for ( const [f, out] of edges ) {
      if ( pkgOf(f) !== RULES_PKG ) continue;
      for ( const to of out ) {
        if ( pkgOf(to) && pkgOf(to) !== RULES_PKG && owner.get(f) !== pkgOf(to) && !shared.has(to) ) { shared.add(to); grew = true; }
      }
    }
  }
  return {shared, owner};
}

const mods = existsSync(MODS) ? readdirSync(MODS).filter(m => m.startsWith("wodx-") && existsSync(join(MODS, m, "module.json"))) : [];
const all = [...mods.flatMap(m => walk(join(MODS, m))), ...(existsSync(SYS) ? readdirSync(SYS, {withFileTypes: true}).filter(e => e.isDirectory()).flatMap(e => walk(join(SYS, e.name))) : [])];
const {shared, owner} = sharedFiles(all);
const report = [];
for ( const m of mods ) {
  const dir = join(MODS, m);
  const manifestPath = join(dir, "module.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entries = (manifest.esmodules ?? []).filter(e => !/\.bundle\.js$/.test(e));
  if ( !entries.length ) continue;
  const outs = [];
  for ( const entry of entries ) {
    const abs = join(dir, entry);
    const outdir = dirname(abs);
    const keepOut = {
      name: "wodx-keep-out",
      setup(b) {
        b.onResolve({filter: /^\./}, a => {
          if ( !a.importer ) return null;
          const to = resolve(a.resolveDir, a.path);
          if ( (pkgOf(to) === dir || owner.get(to) === dir) && !shared.has(to) ) return null;
          let rel = relative(outdir, to).split(sep).join("/");
          if ( !rel.startsWith(".") ) rel = `./${rel}`;
          return {path: rel, external: true};
        });
      }
    };
    const res = await build({
      entryPoints: [abs], bundle: true, splitting: true, format: "esm", minify: true, keepNames: true, target: "es2022",
      outdir, entryNames: "[name].bundle", chunkNames: "[name]-chunk-[hash]", write: !check, metafile: true,
      plugins: [keepOut], logLevel: "warning", legalComments: "none"
    });
    const outFiles = Object.entries(res.metafile.outputs);
    const bytes = outFiles.reduce((s, [, o]) => s + o.bytes, 0);
    const inputs = Object.keys(res.metafile.inputs).length;
    const srcBytes = Object.values(res.metafile.inputs).reduce((s, i) => s + i.bytes, 0);
    const entryOut = outFiles.find(([, o]) => o.entryPoint)?.[0];
    outs.push(relative(dir, resolve(entryOut)).split(sep).join("/"));
    report.push({module: m, entry, inputs, srcKB: Math.round(srcBytes / 1024), outKB: Math.round(bytes / 1024), files: outFiles.length,
      startKB: Math.round((res.metafile.outputs[entryOut]?.bytes ?? 0) / 1024)});
  }
  if ( !check ) {
    manifest.esmodules = outs;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }
}
for ( const r of report ) console.log(`${r.module}: ${r.inputs} files, ${r.srcKB} KB -> ${r.outKB} KB in ${r.files} file(s), ${r.startKB} KB at start`);
console.log(`Kept out of bundles (imported across packages): ${shared.size} file(s).`);
if ( args.includes("--list") ) for ( const f of [...shared].map(x => relative(root, x).split(sep).join("/")).sort() ) console.log(`  ${f}`);
const tot = report.reduce((a, r) => [a[0] + r.srcKB, a[1] + r.outKB, a[2] + r.startKB], [0, 0, 0]);
console.log(`Total: ${tot[0]} KB of source -> ${tot[1]} KB, ${tot[2]} KB loaded at start.${check ? " (check only, nothing written)" : ""}`);
