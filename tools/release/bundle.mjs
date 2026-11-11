/**
 * Bundle the WoDX modules for a release copy: node tools/release/bundle.mjs <Foundry Data folder or deploy folder> [--check]
 *
 * For each wodx- module under <dir>/modules, its esmodules entry is bundled and minified with esbuild into
 * scripts/<entry>.bundle.js beside the entry, with code reached only by import() split into chunk files
 * (so a line's code loads when it is first used), and module.json is pointed at the bundle. The source files
 * stay where they are. A file another package imports (for example wodx-chronicle/scripts/calendar.mjs) is kept
 * out of every bundle and loaded from its own path, so each such file still has one copy in the browser.
 *
 * Run it on a copy (a deploy folder), never on the repo. --check bundles into memory and reports sizes only.
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

/** Every file one package imports from another (static or import()): those stay unbundled. */
export function sharedFiles(files) {
  const shared = new Set();
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'`]([^"'`]+)["'`]/g;
  for ( const f of files ) {
    const src = readFileSync(f, "utf8");
    for ( const m of src.matchAll(re) ) {
      if ( !m[1].startsWith(".") ) continue;
      const to = resolve(dirname(f), m[1]);
      if ( pkgOf(to) && pkgOf(to) !== pkgOf(f) ) shared.add(to);
    }
  }
  return shared;
}

const mods = existsSync(MODS) ? readdirSync(MODS).filter(m => m.startsWith("wodx-") && existsSync(join(MODS, m, "module.json"))) : [];
const all = [...mods.flatMap(m => walk(join(MODS, m))), ...(existsSync(SYS) ? readdirSync(SYS).flatMap(s => walk(join(SYS, s))) : [])];
const shared = sharedFiles(all);
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
          if ( pkgOf(to) === dir && !shared.has(to) ) return null;
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
const tot = report.reduce((a, r) => [a[0] + r.srcKB, a[1] + r.outKB, a[2] + r.startKB], [0, 0, 0]);
console.log(`Total: ${tot[0]} KB of source -> ${tot[1]} KB, ${tot[2]} KB loaded at start.${check ? " (check only, nothing written)" : ""}`);
