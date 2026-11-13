/**
 * Rebuild phase 0 (Storyteller 0.61.0, B2783): the inventory of an older world and its carry file. Run in
 * rothenstein-wodx as Gamemaster Test:
 *   await (await import(`/wodx-gate/carryexport.mjs?${Date.now()}`)).run()
 * Never in the Live Version world. It only reads the world: nothing is changed, made or deleted.
 *
 * Every document is sorted by recipe-rules.mjs classify() into carry, rebuild or leave. Two files go to Data/wodx-gate:
 *   rothenstein-inventory.json  counts by verdict and kind, and every document's name, kind, folder, verdict and reason
 *   rothenstein-carry.json      the carried documents as data (folders first), for the builder's carry step
 * The PC job copies the carry file to Data/worlds/rothenstein-x/carry/.
 */
const SKIP = ["ChatMessage", "Combat", "User", "Setting", "FogExploration"];

function folderPath(f) {
  const names = [];
  for ( let x = f; x; x = x.folder ) names.unshift(x.name);
  return names.join("/");
}

async function upload(name, data) {
  const file = new File([JSON.stringify(data)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
}

export async function run({source = game.world.id} = {}) {
  if ( game.world.id === "rothenstein-live" ) throw new Error("Never in the Live Version world.");
  const R = await import(`/modules/wodx-storyteller/scripts/recipe-rules.mjs?${Date.now()}`);
  const entries = [];
  const keep = {};
  const keptFolders = new Set();
  // Folders first, shallowest first, so each parent exists before its children
  const folders = [...game.folders].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
  for ( const f of folders ) {
    const e = {type: "Folder", name: f.name, folder: folderPath(f), flags: f.flags ?? {}};
    const c = R.classify(e);
    const parentKept = !f.folder || keptFolders.has(f.folder.id);
    const verdict = c.verdict === "carry" && !parentKept ? "leave" : c.verdict;
    entries.push({...e, flags: undefined, id: f.id, folderType: f.type, verdict, reason: verdict === c.verdict ? c.reason : "Inside a folder that stays behind."});
    if ( verdict === "carry" ) { keptFolders.add(f.id); (keep.Folder ??= []).push(f.toObject()); }
  }
  for ( const [type, coll] of game.collections.entries() ) {
    if ( type === "Folder" || SKIP.includes(type) ) {
      if ( SKIP.includes(type) ) entries.push({type, name: `${coll.size} documents`, verdict: "leave", reason: "Play records stay with the old world."});
      continue;
    }
    for ( const d of coll ) {
      const e = {type, name: d.name ?? "", folder: d.folder ? folderPath(d.folder) : "", playerOwned: !!d.hasPlayerOwner, flags: d.flags ?? {}};
      const c = R.classify(e);
      entries.push({...e, flags: undefined, id: d.id, verdict: c.verdict, reason: c.reason});
      if ( c.verdict !== "carry" ) continue;
      const obj = d.toObject();
      if ( obj.folder && !keptFolders.has(obj.folder) ) obj.folder = null;
      (keep[type] ??= []).push(obj);
    }
  }
  const tally = R.tally(entries.filter(e => !SKIP.includes(e.type)));
  const made = new Date().toISOString();
  await upload("rothenstein-inventory.json", {source, made, tally, entries});
  await upload("rothenstein-carry.json", {version: 1, source, made, docs: keep});
  const summary = Object.fromEntries(Object.entries(keep).map(([k, v]) => [k, v.length]));
  return {source, made, tally, carried: summary};
}
