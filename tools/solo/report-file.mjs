/**
 * Report a problem, the filing side (B7162): turn exported reports into faults in the feature registry.
 *
 * Format (from the registry thread, 17 Nov 2026): registry/features/<module>.json = {module, seeded, rows: [...]}, each
 * row with a "faults" list. A fault is {id, at, by, role, kind, what, expected, build, report, status, fix}; the full
 * report (errors, cards, windows, modules) stays in the exported JSON, which "report" points to. A fault whose row is
 * not found goes to registry/features/_inbox.json = {faults: [{...fault, guess: {module, row}}]}.
 *
 * The row: each error's source path goes through the registry's ownerOf(file) (tools/registry/registry.mjs); the row
 * named by most errors wins, and a tie or no answer sends the fault to the inbox. Pure apart from the registry reader
 * passed in, so tools/harness/solo-report.test.mjs can drive it.
 */

/** The fault entry for one report. reportRef: where the full report lives (a JSON path or a journal uuid). */
export function faultOf(r, reportRef = "") {
  return {id: String(r.id), at: String(r.at ?? ""), by: String(r.by ?? ""), role: String(r.role ?? ""), kind: String(r.kind ?? "other"),
    what: String(r.what ?? ""), expected: String(r.expected ?? ""), build: String(r.build?.label || (r.build?.commit ?? "").slice(0, 7) || ""),
    report: String(reportRef ?? ""), status: "open", fix: ""};
}

/**
 * Where the fault goes: {module, row} when one row wins, else {module: "", row: "", guess}. ownerOf(path) returns the
 * rows that own a repo path: [{id, module}] (or row ids as strings).
 */
export function placeFault(r, ownerOf = () => []) {
  const votes = new Map();
  for ( const e of r.errors ?? [] ) {
    if ( !e?.src ) continue;
    let owners = [];
    try { owners = ownerOf(e.src) ?? []; } catch (err) { owners = []; }
    for ( const o of owners ) {
      const id = typeof o === "string" ? o : o?.id;
      const mod = typeof o === "string" ? (/^modules\/([\w-]+)\//.exec(e.src)?.[1] ?? "") : (o?.module ?? "");
      if ( !id ) continue;
      const v = votes.get(id) ?? {id, module: mod, n: 0};
      v.n++;
      votes.set(id, v);
    }
  }
  const ranked = [...votes.values()].sort((a, b) => b.n - a.n);
  if ( ranked.length && (ranked.length === 1 || ranked[0].n > ranked[1].n) ) return {module: ranked[0].module, row: ranked[0].id};
  return {module: "", row: "", guess: {module: String(r.guess ?? ""), row: ranked[0]?.id ?? ""}};
}

/**
 * File reports into registry documents held in memory. docs: {"<module>": {module, rows}} plus "_inbox": {faults}.
 * Returns {docs, filed: [{id, module, row}], inbox: [id], skipped: [id]} (skipped: already filed anywhere).
 */
export function fileReports(reports = [], docs = {}, {ownerOf = () => [], refOf = r => `${r.id}.json`} = {}) {
  const out = structuredClone(docs);
  out._inbox ??= {faults: []};
  out._inbox.faults ??= [];
  const known = new Set(out._inbox.faults.map(f => f.id));
  for ( const [k, d] of Object.entries(out) ) if ( k !== "_inbox" ) for ( const row of d.rows ?? [] ) for ( const f of row.faults ?? [] ) known.add(f.id);
  const filed = [], inbox = [], skipped = [];
  for ( const r of reports ) {
    if ( !r?.id ) continue;
    if ( known.has(r.id) ) { skipped.push(r.id); continue; }
    const fault = faultOf(r, refOf(r));
    const at = placeFault(r, ownerOf);
    const row = at.row ? out[at.module]?.rows?.find(x => x.id === at.row) : null;
    if ( row ) {
      row.faults = [...(row.faults ?? []), fault];
      filed.push({id: r.id, module: at.module, row: at.row});
    } else {
      out._inbox.faults.push({...fault, guess: at.guess ?? {module: String(r.guess ?? ""), row: at.row ?? ""}});
      inbox.push(r.id);
    }
    known.add(r.id);
  }
  return {docs: out, filed, inbox, skipped};
}

/** The morning digest's line: "3 problems reported last night, filed as rows X, Y; 1 waits in the inbox." */
export function digestLine({filed = [], inbox = []} = {}) {
  const n = filed.length + inbox.length;
  if ( !n ) return "No problems reported in the solo world since the last collection.";
  const rows = [...new Set(filed.map(f => f.row))];
  const parts = [];
  if ( rows.length ) parts.push(`filed on ${rows.length === 1 ? "row" : "rows"} ${rows.join(", ")}`);
  if ( inbox.length ) parts.push(`${inbox.length} in the registry inbox for sorting`);
  return `${n} ${n === 1 ? "problem" : "problems"} reported in the solo world: ${parts.join("; ")}.`;
}
