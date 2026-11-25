// Frozen test builds for the solo world (B7161). A release candidate is one commit of main, named rc-YYYY-MM-DD,
// copied into the solo world's Data folder and stamped with its name, so a night's play runs on a known build and every
// problem reported in it names that build. Live is never touched: Live releases follow docs/LIVE-RELEASE-CHECKLIST.md
// and need the owner's go-ahead.
//
//   node tools/release/rc.mjs name [--commit <sha|main>] [--date YYYY-MM-DD]
//       print the label and the commit it would freeze
//   node tools/release/rc.mjs tag --commit <sha> [--label rc-YYYY-MM-DD]
//       tag that commit and push the tag (on the PC, where git signs in)
//   node tools/release/rc.mjs deploy --data <Foundry Data folder> --label rc-YYYY-MM-DD --commit <sha>
//                                    [--world rothenstein-solo] [--port 30010] [--backups <folder>] [--dry]
//       refuse while anything listens on the port (the world is running: never deploy while someone plays),
//       back up the world, the WoDX modules and the system, copy the system and every wodx-* module from that commit
//       (git archive), stamp them with the label, and check every copied file's MD5 against the archive
//                                    [--assets-from <Data folder>]
//       the maps, tiles and sounds the world's scenes point at live in user-data folders (RC_ASSETS below), not in a
//       package. With --assets-from, each such folder the source Data has is copied across; without it, a folder the
//       target lacks fails the deploy, since the player would see black scenes (#2476)
//
// The solo world on the main PC: --data D:\WoDX\FoundryData-solo\Data --port 30010 --backups D:\WoDX\Backups.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, cpSync, statSync, writeFileSync, mkdtempSync} from 'node:fs';
import {join, resolve, dirname, relative, basename} from 'node:path';
import {tmpdir} from 'node:os';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {stamp} from './stamp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

/** User-data folders the worlds' scenes, tiles and sounds point at; none of them is in a package (#2476). */
export const RC_ASSETS = ['rothenstein-places', 'wodx-maps', 'wodx-kits'];

/**
 * What to do with each asset folder: {folder, action}. action is "copy" (the source has it), "keep" (the target has
 * it and there is no source), "missing" (neither has it, but the target never had it either: a warning) or "fail"
 * (the target lacks it and there is nothing to copy it from). required: the folders the deploy cannot do without.
 */
export function assetPlan({sourceHas = () => false, targetHas = () => false, required = RC_ASSETS.slice(0, 1)} = {}) {
  return RC_ASSETS.map(folder => {
    if (sourceHas(folder)) return {folder, action: 'copy'};
    if (targetHas(folder)) return {folder, action: 'keep'};
    return {folder, action: required.includes(folder) ? 'fail' : 'missing'};
  });
}

/** rc-YYYY-MM-DD for a date (UTC). */
export function rcLabel(date = new Date()) {
  const d = date instanceof Date ? date : new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`not a date: ${date}`);
  return `rc-${d.toISOString().slice(0, 10)}`;
}
export const isLabel = s => /^rc-\d{4}-\d{2}-\d{2}[a-z]?$/.test(String(s ?? ''));

/** Which packages of an unpacked archive are copied: the system and every wodx- module. [{from, to}] relative paths. */
export function packagesOf(names = {modules: [], system: false}) {
  const out = [];
  if (names.system) out.push({from: 'system/worldofdarkness', to: 'systems/worldofdarkness'});
  for (const m of [...(names.modules ?? [])].sort()) if (/^wodx-[\w-]+$/.test(m)) out.push({from: `modules/${m}`, to: `modules/${m}`});
  return out;
}

/** Files whose MD5 differs (or that are missing) between two lists of {path, md5}. */
export function md5Mismatches(want = [], got = []) {
  const have = new Map(got.map(f => [f.path, f.md5]));
  return want.filter(f => f.path !== 'release.json' && !f.path.endsWith('/release.json') && have.get(f.path) !== f.md5).map(f => f.path);
}

const git = (...a) => execFileSync('git', ['-C', repo, ...a], {encoding: 'utf8'}).trim();

function walk(dir, base = dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, base, out);
    else out.push({path: relative(base, p).split('\\').join('/'), md5: createHash('md5').update(readFileSync(p)).digest('hex')});
  }
  return out;
}

/** true when something accepts connections on localhost:port. */
export function listening(port, host = '127.0.0.1') {
  return new Promise(res => {
    const s = net.connect({port: Number(port), host});
    const done = v => { s.destroy(); res(v); };
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
    s.setTimeout(1500, () => done(false));
  });
}

async function deploy(o) {
  const data = resolve(o.data ?? '');
  if (!o.data || !existsSync(join(data, 'worlds'))) throw new Error(`--data must be a Foundry Data folder (no worlds folder under ${data})`);
  if (!isLabel(o.label)) throw new Error(`--label must look like rc-2026-11-17 (got ${o.label ?? 'nothing'})`);
  const world = o.world ?? 'rothenstein-solo';
  if (world === 'rothenstein-live') throw new Error('never the Live world');
  if (!existsSync(join(data, 'worlds', world))) throw new Error(`no world ${world} under ${data}`);
  const port = Number(o.port ?? 30010);
  if (await listening(port)) throw new Error(`something is listening on port ${port}: the world is running. Stop it first; never deploy while someone plays.`);
  const commit = git('rev-parse', `${o.commit ?? 'origin/main'}^{commit}`);
  try { execFileSync('git', ['-C', repo, 'merge-base', '--is-ancestor', commit, 'origin/main']); }
  catch { throw new Error(`${commit.slice(0, 7)} is not on origin/main: a release candidate is a commit of main`); }
  const date = git('show', '-s', '--format=%cI', commit);
  const log = [];
  // 1. Back up
  const backups = resolve(o.backups ?? join(data, '..', '..', 'Backups'));
  const zip = join(backups, `${world}-before-${o.label}-${new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')}.tar.gz`);
  const parts = [`worlds/${world}`, 'systems/worldofdarkness', ...(existsSync(join(data, 'modules')) ? readdirSync(join(data, 'modules')).filter(n => n.startsWith('wodx-')).map(n => `modules/${n}`) : [])]
    .filter(p => existsSync(join(data, p)));
  // tar is given the archive by a bare name in its own folder: GNU tar (Git Bash) reads "D:\..." as host:path
  if (!o.dry) { mkdirSync(backups, {recursive: true}); execFileSync('tar', ['-czf', basename(zip), '-C', data, ...parts], {cwd: backups}); }
  log.push(`backup: ${o.dry ? '(dry) ' : ''}${zip} (${parts.length} folders)`);
  // 2. The commit's packages
  const tmp = mkdtempSync(join(tmpdir(), 'wodx-rc-'));
  const tar = join(tmp, 'build.tar');
  execFileSync('git', ['-C', repo, 'archive', '--format=tar', '-o', tar, commit, 'system/worldofdarkness', 'modules']);
  const src = join(tmp, 'src');
  mkdirSync(src);
  execFileSync('tar', ['-xf', 'build.tar', '-C', 'src'], {cwd: tmp});
  const pk = packagesOf({system: existsSync(join(src, 'system/worldofdarkness/system.json')), modules: readdirSync(join(src, 'modules')).filter(m => existsSync(join(src, 'modules', m, 'module.json')))});
  // 3. Copy, 4. stamp, 5. check
  const bad = [];
  for (const p of pk) {
    const to = join(data, p.to);
    if (!o.dry) { rmSync(to, {recursive: true, force: true}); cpSync(join(src, p.from), to, {recursive: true}); }
  }
  if (!o.dry) stamp(data, commit, date, o.label);
  // 3b. The user-data asset folders (#2476)
  const from = o.assetsFrom ? resolve(o.assetsFrom) : null;
  const plan = assetPlan({sourceHas: f => !!from && existsSync(join(from, f)), targetHas: f => existsSync(join(data, f))});
  const lacking = [];
  for (const a of plan) {
    if (a.action === 'copy') {
      if (!o.dry) cpSync(join(from, a.folder), join(data, a.folder), {recursive: true, force: true});
      log.push(`assets: ${a.folder} ${o.dry ? 'would be ' : ''}copied from ${from}`);
    } else if (a.action === 'keep') log.push(`assets: ${a.folder} already in the Data folder (no --assets-from, kept as it is)`);
    else if (a.action === 'missing') log.push(`assets: WARNING ${a.folder} is in neither Data folder; scenes that use it will show black`);
    else { lacking.push(a.folder); log.push(`assets: MISSING ${a.folder}: the scenes point at it and nothing was copied. Pass --assets-from <the Main PC's Data folder>`); }
  }
  if (!o.dry) for (const p of pk) for (const f of md5Mismatches(walk(join(src, p.from)), walk(join(data, p.to)))) bad.push(`${p.to}/${f}`);
  rmSync(tmp, {recursive: true, force: true});
  log.push(`copied: ${pk.length} packages from ${commit.slice(0, 7)} (${date})${o.dry ? ' (dry, nothing copied)' : ''}`);
  log.push(o.dry ? 'MD5: not checked (dry run, nothing copied)' : bad.length ? `MD5 MISMATCH in ${bad.length} file(s): ${bad.slice(0, 10).join(', ')}` : 'MD5: every copied file matches the commit');
  if (!o.dry) writeFileSync(join(data, 'wodx-rc.json'), `${JSON.stringify({label: o.label, commit, date, world, deployedAt: new Date().toISOString()}, null, 1)}\n`);
  return {ok: !bad.length && !lacking.length, dry: !!o.dry, label: o.label, commit, log};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  try {
    if (cmd === 'name') {
      const commit = git('rev-parse', `${opt('commit') ?? 'origin/main'}^{commit}`);
      console.log(`${rcLabel(opt('date') ?? new Date())} ${commit}`);
    } else if (cmd === 'tag') {
      const commit = git('rev-parse', `${opt('commit') ?? 'origin/main'}^{commit}`);
      const label = opt('label') ?? rcLabel();
      if (!isLabel(label)) throw new Error(`not a label: ${label}`);
      git('tag', label, commit);
      execFileSync('git', ['-C', repo, 'push', 'origin', `refs/tags/${label}`], {stdio: 'inherit'});
      console.log(`tagged ${commit.slice(0, 7)} as ${label}`);
    } else if (cmd === 'deploy') {
      const r = await deploy({data: opt('data'), label: opt('label'), commit: opt('commit'), world: opt('world'), port: opt('port'), backups: opt('backups'), assetsFrom: opt('assets-from'), dry: args.includes('--dry')});
      for (const l of r.log) console.log(l);
      console.log(r.dry ? `dry run: ${r.label} (${r.commit.slice(0, 7)}) would be deployed; nothing changed` : r.ok ? `${r.label} (${r.commit.slice(0, 7)}) is in place` : `${r.label}: the copy does not match; do not play on it`);
      process.exitCode = r.ok ? 0 : 1;
    } else {
      console.error('usage: node tools/release/rc.mjs name | tag --commit <sha> | deploy --data <Data folder> --label rc-YYYY-MM-DD --commit <sha> [--world] [--port] [--backups] [--assets-from <Data folder>] [--dry]');
      process.exitCode = 2;
    }
  } catch (e) { console.error(`rc: ${e.message}`); process.exitCode = 1; }
}
