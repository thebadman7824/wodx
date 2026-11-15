#!/usr/bin/env node
/**
 * Fetch WoDX Atmosphere's recorded cues from Freesound (B6260-B6264), for Ben's PC (the cloud cannot reach Freesound).
 *
 * Ben asked for every generated sound to be swapped for a real recording where one can be had (15 November 2026),
 * from the free sources in docs/MUSIC-SOURCES.md. For each slot in real-cues.json this tool reads the Freesound pages
 * in the order given and takes the first one whose licence is CC0 or CC BY (Creative Commons Attribution); it refuses
 * BY-NC, Sampling+ and anything else, and any page it cannot read. It downloads Freesound's own high-quality preview
 * (no sign-in needed), cuts it to the slot's length from its first sound, fades the end, levels it and writes Ogg
 * Vorbis to <kits>/<kit>/sounds/<cue>[-<faith>].ogg, with a credits.json entry the in-game credits journal shows. The
 * generated cues in the module stay as they are and play wherever a kit folder has no recording.
 *
 *   node tools/atmosphere/fetch-cues.mjs --to <Data>/wodx-kits [--ffmpeg <path>] [--only dark-ages/dawn] [--dry-run]
 *        [--force] [--report <file.md>] [--delay 1500]
 *
 * --dry-run reads the pages and says what it would take, writing nothing. A file the tool did not make itself (no
 * "tool": "fetch-cues" in credits.json) is left alone unless --force is given. Then, in Foundry: Atmosphere window,
 * Build playlists for each kit (that also reads the common folder), then Credits journal.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UA = "WoDX-cue-fetch/1.0 (private tabletop project)";
export const FAITHS = ["orthodox", "islamic", "jewish", "hindu", "theravada", "tibetan", "chinese"];
export const KITS = ["common", "dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "wild-west", "great-war",
  "mid-century", "modern", "time-of-judgment", "future-darkness", "classical", "living-gods"];
export const CUES = ["dawn", "dusk", "notice", "birds", "cock", "heart"];

/** The licence a Creative Commons link names, as WoDX writes it; null for one WoDX does not take (BY-NC, Sampling+, ...). */
export function licenseOf(href) {
  const h = String(href).toLowerCase();
  if ( /creativecommons\.org\/publicdomain\/zero\/1\.0/.test(h) ) return "CC0 1.0";
  const m = h.match(/creativecommons\.org\/licenses\/([a-z+-]+)\/(\d\.\d)/);
  if ( m && m[1] === "by" ) return `CC BY ${m[2]}`;
  return null;
}

const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const unescape = s => String(s ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/**
 * What a Freesound sound page says: {id, title, author, license, licenseHrefs, preview, url}. license is null when the
 * page names no licence WoDX takes, or names more than one (a page that is not clear is refused).
 */
export function parseSoundPage(html, url = "") {
  const page = attr(html, /<meta property="og:url" content="([^"]+)"/) ?? url;
  const m = String(page).match(/\/people\/([^/]+)\/sounds\/(\d+)/);
  const hrefs = [...new Set([...html.matchAll(/href="(https?:\/\/creativecommons\.org\/[^"]+)"/g)].map(x => x[1].replace(/^http:/, "https:")))];
  const lics = [...new Set(hrefs.map(licenseOf))];
  const license = lics.length === 1 ? lics[0] : null;
  let title = unescape(attr(html, /<meta property="og:title" content="([^"]+)"/) ?? attr(html, /<title>([^<]+)<\/title>/) ?? "");
  title = title.replace(/^Freesound - /, "").replace(/ by [^ ]+$/, "").trim();
  let preview = attr(html, /<meta property="og:audio" content="([^"]+)"/) ?? attr(html, /data-mp3="([^"]+)"/);
  const ogg = attr(html, /data-ogg="([^"]+)"/);
  if ( ogg ) preview = ogg;
  else if ( preview ) preview = preview.replace(/-hq\.mp3$/, "-hq.ogg");
  return {id: m ? Number(m[2]) : null, author: m ? decodeURIComponent(m[1]) : null, title, license, licenseHrefs: hrefs, preview: preview ? unescape(preview) : null, url: m ? `https://freesound.org/people/${m[1]}/sounds/${m[2]}/` : page};
}

/** The file a slot writes, relative to the kits folder. */
export function destFor(kit, cue, faith) {
  if ( !KITS.includes(kit) ) throw new Error(`unknown kit ${kit}`);
  if ( !CUES.includes(cue) ) throw new Error(`unknown cue ${cue}`);
  if ( faith && !FAITHS.includes(faith) ) throw new Error(`unknown faith ${faith}`);
  if ( cue === "heart" && kit !== "common" ) throw new Error("the heartbeat lives in common");
  return `${kit}/sounds/${cue}${faith ? `-${faith}` : ""}.ogg`;
}

/** The credits.json entry for a sound taken. */
export function creditFor(p, len) {
  const changes = `cut to ${len} s from its first sound, faded out and levelled for WoDX`;
  return {source: "Freesound", license: p.license, title: p.title, author: p.author, url: p.url, changes, tool: "fetch-cues",
    credit: `"${p.title}" by ${p.author} (freesound.org), ${p.license}; ${changes}`};
}

/** Every (kit, cue, faith, len, ids) job the manifest asks for. */
export function expand(manifest, only = null) {
  const out = [];
  for ( const s of manifest.slots ?? [] ) for ( const kit of s.kits ?? [s.kit] ) {
    const j = {kit, cue: s.cue, faith: s.faith ?? null, len: s.len, ids: s.ids, why: s.why};
    j.dest = destFor(kit, j.cue, j.faith);
    if ( only && !`${kit}/${j.cue}${j.faith ? `-${j.faith}` : ""}`.startsWith(only) ) continue;
    out.push(j);
  }
  return out;
}

/** The ffmpeg filter for a cue: start at its first sound, keep len seconds, fade the last quarter (1.5 s at most), level. */
export function filterFor(len) {
  const fd = Math.min(1.5, Math.round(len * 25) / 100);
  return `silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:${len},afade=t=out:st=${Math.max(0, len - fd).toFixed(2)}:d=${fd},loudnorm=I=-20:TP=-2:LRA=11`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
  const to = opt("to"), dry = args.includes("--dry-run"), force = args.includes("--force");
  const ffmpeg = opt("ffmpeg") ?? "ffmpeg", delay = Number(opt("delay") ?? 1500), report = opt("report");
  if ( !to ) { console.error("--to <Data>/wodx-kits is needed"); process.exit(2); }
  const manifest = JSON.parse(fs.readFileSync(opt("manifest") ?? path.join(HERE, "real-cues.json"), "utf8"));
  const jobs = expand(manifest, opt("only"));
  const pages = new Map(), lines = [], tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-cues-"));
  const credits = {};
  const readCredits = kit => {
    if ( credits[kit] ) return credits[kit];
    const f = path.join(to, kit, "credits.json");
    try { credits[kit] = JSON.parse(fs.readFileSync(f, "utf8")); } catch { credits[kit] = {}; }
    return credits[kit];
  };
  const page = async id => {
    if ( pages.has(id) ) return pages.get(id);
    let p;
    try {
      const r = await fetch(`https://freesound.org/s/${id}/`, {headers: {"User-Agent": UA}, redirect: "follow"});
      p = r.ok ? parseSoundPage(await r.text(), r.url) : {error: `HTTP ${r.status}`};
    } catch (e) { p = {error: String(e.message ?? e)}; }
    pages.set(id, p);
    await sleep(delay);
    return p;
  };
  let took = 0, missed = 0, kept = 0;
  for ( const j of jobs ) {
    const file = path.basename(j.dest), cr = readCredits(j.kit), out = path.join(to, j.dest);
    if ( fs.existsSync(out) && cr[file]?.tool !== "fetch-cues" && !force ) { lines.push(`- ${j.dest}: kept (a file not made by this tool is there)`); kept++; continue; }
    const refused = [];
    let got = null;
    for ( const id of j.ids ) {
      const p = await page(id);
      if ( p.error ) { refused.push(`${id} (${p.error})`); continue; }
      if ( !p.license ) { refused.push(`${id} (licence ${p.licenseHrefs.join(" ") || "not found"})`); continue; }
      if ( !p.preview ) { refused.push(`${id} (no preview)`); continue; }
      got = p; break;
    }
    if ( !got ) { lines.push(`- ${j.dest}: NONE taken; refused ${refused.join(", ")}`); missed++; continue; }
    lines.push(`- ${j.dest}: ${got.id} "${got.title}" by ${got.author}, ${got.license}${refused.length ? `; refused ${refused.join(", ")}` : ""}`);
    if ( dry ) { took++; continue; }
    const raw = path.join(tmp, `${got.id}${path.extname(new URL(got.preview).pathname) || ".ogg"}`);
    if ( !fs.existsSync(raw) ) {
      const r = await fetch(got.preview, {headers: {"User-Agent": UA}});
      if ( !r.ok ) { lines[lines.length - 1] += ` (download failed: HTTP ${r.status})`; missed++; continue; }
      fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
      await sleep(delay);
    }
    fs.mkdirSync(path.dirname(out), {recursive: true});
    const ff = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", filterFor(j.len), "-ar", "44100", "-c:a", "libvorbis", "-q:a", "5", out], {encoding: "utf8"});
    if ( ff.status ) { lines[lines.length - 1] += ` (ffmpeg failed: ${(ff.stderr || "").trim().slice(0, 200)})`; missed++; continue; }
    cr[file] = creditFor(got, j.len);
    took++;
  }
  if ( !dry ) for ( const [kit, c] of Object.entries(credits) ) {
    if ( !Object.keys(c).length ) continue;
    fs.mkdirSync(path.join(to, kit), {recursive: true});
    fs.writeFileSync(path.join(to, kit, "credits.json"), JSON.stringify(c, null, 2) + "\n");
  }
  fs.rmSync(tmp, {recursive: true, force: true});
  const text = `# Recorded cues ${dry ? "(dry run)" : ""}\n\n${took} taken, ${missed} with none, ${kept} kept as they were.\n\n${lines.join("\n")}\n`;
  if ( report ) fs.writeFileSync(report, text);
  console.log(text);
  process.exit(missed && !took ? 1 : 0);
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) main();
