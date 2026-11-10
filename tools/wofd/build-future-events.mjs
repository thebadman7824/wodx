/**
 * Builds modules/wodx-chronicle/data/future-events.mjs from the approved Future Darkness drafts in docs/research/wofd:
 * the 1990-2025 timeline (draft c), the 2026-2098 timeline (draft k), and the five Cascades of 2099 (draft n),
 * with ending titles and book pages from the Time of Future Judgement desk (draft l).
 * Run: node tools/wofd/build-future-events.mjs
 */
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = join(root, "docs/research/wofd");
const load = (file, name) => new Function(fs.readFileSync(join(dir, file), "utf8") + `\nreturn ${name};`)();

const LINE = {Vampire: "vampire", Werewolf: "werewolf", Mage: "mage", Wraith: "wraith", Changeling: "changeling", Hunter: "hunter",
  Demon: "demon", Mummy: "mummy", "Kindred of the East": "kote", Orpheus: "orpheus"};
const PREFIX = {vg: "vampire", wa: "werewolf", ma: "mage", wj: "wraith", cj: "changeling", dj: "demon", hj: "hunter", kj: "kote", mj: "mummy", oj: "orpheus"};
const SEASON = {"late 2024": [2024, 10], "2025: spring": [2025, 3], "2025: early summer": [2025, 6], "2025: summer": [2025, 7],
  "2025: autumn": [2025, 9], "2025: winter": [2025, 12]};

/** Drop the desk's cross-reference codes, e.g. "(v2)", "(y14)", "(z02)", "(m1, m3)" and "(y04)" inside a sentence. */
const clean = t => t
  .replace(/\s*\((?:[a-z]{1,2}\d{1,2}(?:, )?)+\)/g, "")
  .replace(/\s*\(([^()]*?)(?:;\s*)?\b[yz]\d{2}\)/g, (m, inner) => inner.trim() ? ` (${inner.replace(/[;,]\s*$/, "").trim()})` : "")
  .replace(/\s+([.,;])/g, "$1").replace(/\s{2,}/g, " ").trim();

function linesOf(tag) {
  const found = Object.entries(LINE).filter(([k]) => tag.includes(k)).map(([, v]) => v);
  return found.length ? (tag.startsWith("All lines") ? ["all", ...found] : found) : ["all"];
}

/** "Werewolf · Wraith · Demon" becomes "Werewolf, Wraith, Demon"; "Hunter · Lyon" becomes "Hunter: Lyon". */
function nameOf(tag) {
  const parts = tag.split(" · ");
  const lines = [], rest = [];
  for ( const p of parts ) (LINE[p] && !rest.length ? lines : rest).push(p);
  return [lines.join(", "), ...rest].filter(Boolean).join(": ");
}

function timeline(file) {
  const out = [];
  for ( const y of load(file, "YEARS") ) {
    const label = String(y.year).toLowerCase();
    const [year, month] = SEASON[label] ?? [parseInt(label), undefined];
    if ( !Number.isInteger(year) ) throw new Error(`year ${y.year}`);
    y.events.forEach(([tag, text], i) => {
      const ev = {id: `wofd-${y.id.slice(1)}-${i + 1}`, year, ...(month ? {month} : {}), branch: "future", lines: linesOf(tag),
        name: nameOf(tag), summary: clean(text),
        source: "House metaplot: the Future Darkness timeline"};
      if ( month ) ev.dateNote = `The timeline gives the season (${y.year}); the month is a house rule.`;
      out.push(ev);
    });
  }
  return out;
}

const ENDINGS = Object.fromEntries(load("ftj-desk-2026-11-10l.js", "SCEN").map(s => [s.id, s]));
const origRef = id => {
  const orig = (ENDINGS[id]?.beats ?? []).find(b => b[0] === "The original")?.[1] ?? "";
  const m = orig.match(/\(([^()]*(?:p\.|pp\.)[^()]*)\)\s*\.?$/);
  return m ? m[1].replace(/;\s*(?:name as read|the scan is unclear).*$/, "") : "";
};

/** Named characters without pronouns, as module text keeps them. */
const NEUTRAL = [["off her greatest anchor", "off Grandmother's greatest anchor"], ["to protect her anchor", "to protect the anchor"],
  ["raid her Memory Tower for God's Arrow before she grows too strong", "raid Grandmother's Memory Tower for God's Arrow before Grandmother grows too strong"],
  ["claims the star as her sign", "claims the star as a sign"], ["makes them her allies", "makes them allies"]];
const neutral = t => NEUTRAL.reduce((s, [a, b]) => s.replace(a, b), t);

function cascades() {
  const out = [];
  for ( const c of load("cascades-2026-11-10n.js", "SCEN") ) {
    const n = c.beats.length;
    c.beats.forEach(([label, text], i) => {
      const id = label.match(/\(([a-z]{2}\d)\)/)[1];
      // spread the steps through the year in order, on a 30-day grid: step 1 on 1 January, the last in December
      const d = Math.floor(i * 360 / (n + 1)), month = 1 + Math.floor(d / 30), day = 1 + (d % 30);
      const ref = origRef(id);
      out.push({id: `tofj-${c.id}-${String(i + 1).padStart(2, "0")}`, year: 2099, month, day, branch: "future",
        cascade: c.id, lines: [PREFIX[id.slice(0, 2)]], name: `${c.title}: ${ENDINGS[id].title}`, summary: neutral(text),
        source: `House metaplot: Time of Future Judgement, retelling the original ending${ref ? ` (${ref})` : ""}`,
        dateNote: "Each Cascade runs through 2099 in this order; the months are a house rule."});
    });
    out.push({id: `tofj-${c.id}-end`, year: 2099, month: 12, day: 31, branch: "future", cascade: c.id, lines: ["all"],
      name: `${c.title}: where it ends`, summary: c.fall, source: "House metaplot: Time of Future Judgement",
      dateNote: "Each Cascade runs through 2099 in this order; the months are a house rule."});
  }
  return out;
}

const CASCADES = load("cascades-2026-11-10n.js", "SCEN").map(c => ({id: c.id, name: c.title, pitch: c.pitch}));
const events = [...timeline("timeline-2026-11-10c.js"), ...timeline("timeline-2026-11-10k.js"), ...cascades()];
const body = `/**
 * Future Darkness events: the house metaplot for the branch, 1990 to 2099. Built by tools/wofd/build-future-events.mjs
 * from the approved drafts in docs/research/wofd; edit those and rebuild rather than editing here.
 * Events with \`cascade\` fire only when the Storyteller has chosen that Cascade for the Time of Future Judgement.
 * Pages: "pdf" is the PDF page, "p." the printed page.
 */
export default ${JSON.stringify({version: 1, cascades: CASCADES, events}, null, 1)};
`;
fs.writeFileSync(join(root, "modules/wodx-chronicle/data/future-events.mjs"), body);
console.log(`${events.length} events, ${CASCADES.length} cascades`);
