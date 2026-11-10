// Release stamp for a copy of WoDX made without `git archive` (a deploy folder, a
// Foundry Data folder). Writes {"commit", "date"} into release.json in the system and
// every wodx- module found under the target folder.
//
//   node tools/release/stamp.mjs <folder> [--commit <sha>] [--date <iso>]
//
// <folder> is a Foundry Data folder (systems/worldofdarkness, modules/wodx-*) or a repo
// copy (system/worldofdarkness, modules/wodx-*). Without --commit the commit checked out
// in this repo is used, and the script refuses when that working tree has changes.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

export function packageFolders(target) {
  const out = [];
  for (const sys of ['systems/worldofdarkness', 'system/worldofdarkness']) {
    if (existsSync(join(target, sys, 'system.json'))) out.push(join(target, sys));
  }
  const mods = join(target, 'modules');
  if (existsSync(mods)) {
    for (const name of readdirSync(mods)) {
      if (name.startsWith('wodx-') && existsSync(join(mods, name, 'module.json'))) out.push(join(mods, name));
    }
  }
  return out;
}

export function stamp(target, commit, date) {
  if (!/^[0-9a-f]{40}$/i.test(commit)) throw new Error(`not a full commit hash: ${commit}`);
  const folders = packageFolders(target);
  for (const f of folders) writeFileSync(join(f, 'release.json'), JSON.stringify({ commit: commit.toLowerCase(), date }) + '\n');
  return folders;
}

function git(...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  let commit = opt('--commit');
  let date = opt('--date');
  const target = args[0];
  if (!target) { console.error('usage: node tools/release/stamp.mjs <folder> [--commit <sha>] [--date <iso>]'); process.exit(2); }
  if (!commit) {
    if (git('status', '--porcelain', '--untracked-files=no')) { console.error('this repo has uncommitted changes; commit them or pass --commit'); process.exit(1); }
    commit = git('rev-parse', 'HEAD');
  } else if (commit.length < 40) {
    commit = git('rev-parse', commit);
  }
  if (!date) date = git('show', '-s', '--format=%cI', commit);
  const done = stamp(resolve(target), commit, date);
  if (!done.length) { console.error(`no WoDX system or modules under ${target}`); process.exit(1); }
  console.log(`stamped ${done.length} packages with ${commit.slice(0, 7)} (${date})`);
}
