// Writes the Item Review Desk's data (items-desk.json) from WoDX Library's data/goods.mjs.
// Usage: node tools/goods/build-desk.mjs <out.json>
import {writeFileSync} from "node:fs";
const G = await import(new URL("../../modules/wodx-library/data/goods.mjs", import.meta.url));
const eraName = {"living-gods": "Living Gods", "classical": "Classical", "dark-ages": "Dark Ages", "long-night": "Long Night",
  "renaissance": "Renaissance", "age-of-reason": "Age of Reason", "victorian": "Victorian", "wild-west": "Wild West",
  "great-war": "Great War", "mid-century": "Mid-Century", "modern": "Modern", "time-of-judgment": "Time of Judgment",
  "future-darkness": "Future Darkness", "time-of-future-judgement": "Future Judgement"};
const yr = y => y < 0 ? `${-y} BC` : String(y);
const out = {
  built: new Date().toISOString().slice(0, 10),
  kinds: G.KINDS, eras: G.ERAS.map(id => ({id, name: eraName[id], years: G.ERA_YEARS[id]})),
  values: G.VALUES, sources: G.SOURCES, behaviours: G.BEHAVIOURS, conceal: G.CONCEAL,
  items: G.GOODS.map((g, i) => ({id: g.id, order: i, name: g.name, kind: g.kind, years: `${yr(g.from)} to ${yr(g.to)}`,
    eras: g.eras, values: g.values, value: g.value, conceal: g.conceal, use: g.use, stacks: g.stacks, stack: g.stack, uses: g.uses,
    source: g.source}))
};
writeFileSync(process.argv[2] ?? "items-desk.json", JSON.stringify(out));
console.log(out.items.length, "items");
