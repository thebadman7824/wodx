import {readFileSync, writeFileSync} from "node:fs";
const S = process.argv[2];
const rows = JSON.parse(readFileSync(`${S}/rows.json`, "utf8"));
const books = Object.fromEntries(JSON.parse(readFileSync("modules/wodx-library/data/encyclopedia/index.json", "utf8")).books.map(b => [b.id, b.short || b.title]));
const ev = (await import(process.cwd() + "/modules/wodx-chronicle/data/events.mjs")).default.events;
const eras = JSON.parse(readFileSync("modules/wodx-chronicle/data/eras.json", "utf8")).profiles;
const ERAS = [
  ["dark-ages", "Dark Ages", "1197 to 1346"], ["long-night", "Plague and Long Night", "1347 to 1449"], ["renaissance", "Renaissance", "1450 to 1600"],
  ["age-of-reason", "Age of Reason", "1601 to 1836"], ["victorian", "Victorian and Edwardian", "1837 to 1913, with the Wild West"],
  ["great-war", "Great War", "1914 to 1918"], ["mid-century", "Mid-century", "1919 to 1989"], ["modern", "Modern and the Time of Judgment", "1990 to 2009"]];
const eraOf = y => y < 1347 ? "dark-ages" : y < 1450 ? "long-night" : y < 1601 ? "renaissance" : y < 1837 ? "age-of-reason" : y < 1914 ? "victorian" : y < 1919 ? "great-war" : y < 1990 ? "mid-century" : "modern";
const LINE = {vampire: "Vampire", werewolf: "Werewolf", mage: "Mage", wraith: "Wraith", changeling: "Changeling", hunter: "Hunter", mummy: "Mummy", demon: "Demon", kuei: "Kindred of the East", "kuei-jin": "Kindred of the East", orpheus: "Orpheus", mortal: "Mortals", all: "All lines", ghoul: "Ghouls", sorcerer: "Sorcerers", fae: "Fae"};
const ref = r => `${books[r.book] ?? r.book}${r.page ? ` p. ${r.page}` : ""}${r.pdf ? ` (pdf ${r.pdf})` : ""}`;
const items = [];
for ( const e of ev ) {
  if ( e.year > 2009 || e.branch === "future" ) continue;
  items.push({id: `ev-${e.id}`, era: eraOf(e.year), year: e.year, src: "chronicle", title: e.name, line: (e.lines ?? []).map(l => LINE[l] ?? l).join(", "), text: e.summary, ref: e.source ?? "", tier: "stated"});
}
const seen = new Set();
for ( const r of rows ) {
  const key = r.eid + "|" + r.i; if ( seen.has(key) ) continue; seen.add(key);
  items.push({id: `en-${r.eid}-${r.i}`, era: eraOf(r.year), year: r.year, src: "ency", entry: r.eid, title: r.title, line: [...new Set(r.lines.map(l => LINE[l] ?? l))].join(", "),
    text: r.text, ref: (r.refs ?? []).map(ref).join("; "), tier: r.tier, also: r.years.length > 1 ? r.years.filter(y => y !== r.year) : []});
}
items.sort((a, b) => a.year - b.year || (a.src === "chronicle" ? -1 : 1));
const out = ERAS.map(([id, name, span]) => ({id, name, span, items: items.filter(i => i.era === id)}));
writeFileSync(`${S}/desk-data.json`, JSON.stringify(out));
console.log(out.map(e => `${e.id}:${e.items.length}(${e.items.filter(i => i.src === "chronicle").length})`).join(" "));
