/**
 * Builds modules/wodx-chronicle/data/world-history.mjs: the approved world timeline of the classic eras, 1197 to 2009
 * (docs/research/era-timelines/r3/<era>.txt, B5920), as dated events of the Chronicle that carry a part of the world
 * and a place, like the Future Darkness branch's world history (tools/wofd/build-future-world.mjs, B5890).
 *   kind H (real history) is news: told on the card where it is heard (events-rules.mjs newsCodes).
 *   kind W (history with a World of Darkness reading) is hidden: it happens, and only the Storyteller is told (B5921).
 * Left out: the eight W cards of the Americas, Africa and Oceania that wait on the PC's book check (PENDING-REVIEW,
 * 2026-11-13), and the prologue eras before 1197. Events from 1990 belong to the classic timeline only.
 * Ids come from the year and the title, so adding or moving lines in the files never renames an event.
 * Run: node tools/timeline/build-world-history.mjs
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "docs/research/era-timelines/r3");
const out = join(root, "modules/wodx-chronicle/data/world-history.mjs");
export const ERAS = ["dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "great-war", "mid-century", "modern"];
const REGIONS = new Set(["MO", "EU", "ME", "AS", "AF", "AM", "OC"]);
const LINES = {mor: "mortal", vam: "vampire", wer: "werewolf", mag: "mage", wra: "wraith", cha: "changeling", hun: "hunter", mum: "mummy",
  kue: "kote", dem: "demon", all: "all"};
/** The house readings waiting on the book check (year and title), kept out until it lands. */
export const WAITING = new Set(["1521|The dead of the conquest", "1589|The Croatan", "1692|What was at Salem", "1791|The dead walk with the living",
  "1830|The War of Tears begins", "1890|The Ghost Dance", "1885|The scramble", "1994|The Shadowlands of Rwanda"]);

/** House readings the book events (data/events.mjs) already tell, kept out so nothing fires twice (B5926): year|title to the book event. */
export const TOLD_BY_BOOK = {"1350|The Shattering": "shattering", "1435|The Camarilla founded": "camarilla", "1444|Cappadocius falls": "cappadocians",
  "1466|The Grand Convocation ends": "grand-convocation", "1486|The first Conclave": "first-conclave", "1493|The Convention of Thorns": "thorns",
  "1600|The Third Great Maelstrom": "third-great-maelstrom", "1897|The Technocracy named": "technocracy", "1969|The Resurgence": "resurgence",
  "1998|Doissetep falls": "doissetep", "1999|The Week of Nightmares": "week-of-nightmares", "1999|The Sixth Great Maelstrom": "sixth-great-maelstrom",
  "1999|The Avatar Storm": "avatar-storm", "1999|The Fallen escape": "fallen-escape"};

const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/** The research files say "the house reading" for WoDX's own World of Darkness reading; in the game it is the hidden story. */
export function inGame(text) {
  return cap(text
    .replace(/The house reading follows (?:[A-Z][a-z]+ )?canon(?: in spirit)?: ([a-z])/g, (m, c) => c.toUpperCase())
    .replace(/The house reading follows (?:[A-Z][a-z]+ )?canon(?: in spirit)?: /g, "")
    .replace(/\bThe house reading\b/g, "The hidden story").replace(/\bthe house reading\b/g, "the hidden story")
    .replace(/\ba house reading\b/g, "a hidden story"));
}

export function parse(files) {
  const events = [], ids = new Set();
  for ( const [i, text] of files.entries() ) {
    const era = ERAS[i];
    for ( const raw of text.split("\n") ) {
      const line = raw.trim();
      if ( !line || line.startsWith("#") ) continue;
      const [ym, kind, lines, region, place, tags, title, summary] = line.split("|").map(s => s.trim());
      if ( kind !== "H" && kind !== "W" ) continue;
      const [y, m] = ym.split("-").map(Number);
      if ( WAITING.has(`${y}|${title}`) || TOLD_BY_BOOK[`${y}|${title}`] ) continue;
      if ( !REGIONS.has(region) ) throw new Error(`region ${region}: ${line}`);
      let id = `wh-${y}-${slug(title)}`;
      for ( let k = 2; ids.has(id); k++ ) id = `wh-${y}-${slug(title)}-${k}`;
      ids.add(id);
      events.push({id, era, year: y, ...(m ? {month: m} : {}), ...(y >= 1990 ? {branch: "classic"} : {}),
        lines: lines.split(",").map(l => LINES[l.trim()]).filter(Boolean), name: title, summary: inGame(summary), region, place,
        tags: tags.split(",").map(s => s.trim()).filter(Boolean), ...(kind === "W" ? {hidden: true} : {}),
        source: kind === "W" ? "House reading: the world timeline" : "History: the world timeline"});
    }
  }
  return events;
}
export const readFiles = () => ERAS.map(e => fs.readFileSync(join(dir, `${e}.txt`), "utf8"));

if ( process.argv[1] === fileURLToPath(import.meta.url) ) {
  const events = parse(readFiles());
  const names = Object.fromEntries(JSON.parse(fs.readFileSync(join(root, "modules/wodx-chronicle/data/eras.json"), "utf8")).profiles.map(p => [p.id, p.name]));
  // each era's span as its events have it, for the Dated events window's era list
  const eras = ERAS.map(id => { const ys = events.filter(e => e.era === id).map(e => e.year); return {id, name: names[id] ?? id, from: Math.min(...ys), to: Math.max(...ys)}; });
  const head = `/**
 * GENERATED by tools/timeline/build-world-history.mjs from docs/research/era-timelines/r3 (the eight classic eras). Do not edit by hand.
 * The approved world timeline, 1197 to 2009 (B5920): ${events.length} dated events, each with the part of the world it happens in
 * (MO Moravia, EU Europe, ME the Middle East, AS Asia, AF Africa, AM the Americas, OC Oceania) and its place. hidden: the Storyteller's only.
 */
`;
  fs.writeFileSync(out, `${head}export default ${JSON.stringify({version: 1, eras, events})};\n`);
  console.log(`${events.length} events written to ${out}`);
}
