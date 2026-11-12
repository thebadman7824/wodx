/**
 * WoDX NPC 0.30.0: why an NPC feels as they do (B1308). The pure part, so the harness can test it.
 *
 * An NPC's attitude toward a character is one step (attitude-rules.mjs), set at the first meeting and moved by how
 * they were treated since. This lays out what is behind it, for the Storyteller only:
 *   set:   the first meeting (household, faction, rival side, the look of them) and each change since, summed by cause,
 *          so the steps add up to the attitude in force;
 *   weigh: what else bears on them and that a Storyteller may want to play: boons kept or broken between the two,
 *          debts still open, a fight between them, a link (sire, childe, bond, kin, rival), a secret one holds on the
 *          other, the same clan or tribe. These do not move the step by themselves.
 */

const sign = n => (n > 0 ? `+${n}` : String(n));

/** Join log lines with the same cause: "Persuaded them" +1, +1 => +2 (2 times). */
export function summedLog(log = []) {
  const by = new Map();
  for ( const e of log ?? [] ) {
    const d = Number(e?.delta) || 0;
    if ( !d ) continue;
    const why = String(e.why ?? "").replace(/^[^:]{1,60}:\s*/, "").trim() || "A change by the Storyteller";
    const k = why.toLowerCase();
    if ( !by.has(k) ) by.set(k, {why, delta: 0, times: 0, last: 0});
    const x = by.get(k);
    x.delta += d; x.times += 1; x.last = Math.max(x.last, Number(e.at) || 0);
  }
  return [...by.values()].filter(x => x.delta).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.last - a.last);
}

/**
 * The reasons. In:
 *   att:    {step, word, met, from} (the attitude now); entry: the saved {step, log} or null; seed: {step, from}
 *   ledger: Ledger entries (any status); npcId, pcId
 *   links:  the NPC's links to the character (ties-rules.mjs kinds); secrets: [{holderIsNpc, text, kind}] held between them
 *   fought: world time of the last fight between them, or null; same: ["clan Brujah", "tribe Get of Fenris"]
 *   rival:  a rivalry regard {step, why} or null; date(t): world time to words
 * Returns {step, word, set: [{delta, why}], weigh: [{tone: "warm"|"cold"|"", why}]}.
 */
export function reasonsFor({att = null, entry = null, seed = {step: 0, from: ""}, ledger = [], npcId, pcId, links = [], secrets = [], fought = null, same = [], rival = null, date = () => ""} = {}) {
  const set = [];
  if ( entry ) {
    const first = (entry.log ?? [])[0];
    const firstStep = Number(first?.step);
    if ( first && Number.isFinite(firstStep) ) set.push({delta: firstStep, why: String(first.why ?? "First met")});
    for ( const x of summedLog((entry.log ?? []).slice(1)) ) {
      set.push({delta: x.delta, why: `${x.why}${x.times > 1 ? ` (${x.times} times)` : ""}`});
    }
  } else {
    set.push({delta: Number(seed?.step) || 0, why: seed?.from ? `Not met yet: as ${seed.from} regards them` : "Not met yet, and nothing sets how they see them"});
  }
  const weigh = [];
  const id = x => (typeof x === "object" ? x?.id : x) ?? null;
  const between = (ledger ?? []).filter(e => e && ["boon", "debt", "oath"].includes(e.kind) &&
    ((id(e.from) === npcId && id(e.to) === pcId) || (id(e.from) === pcId && id(e.to) === npcId)));
  for ( const e of between ) {
    const pcOwes = id(e.from) === pcId;
    const what = e.kind === "boon" ? `a ${e.size ?? "minor"} boon` : e.kind === "oath" ? "an oath" : "a debt";
    const st = e.status ?? "open";
    if ( st === "kept" ) weigh.push({tone: pcOwes ? "warm" : "", why: pcOwes ? `They paid ${what} owed to them` : `They were paid ${what} they owed`});
    else if ( st === "broken" ) weigh.push({tone: pcOwes ? "cold" : "", why: pcOwes ? `They broke ${what} owed to them` : `This NPC broke ${what} owed to them`});
    else if ( st === "open" ) weigh.push({tone: "", why: pcOwes ? `They owe this NPC ${what}${e.what ? `: ${String(e.what).slice(0, 80)}` : ""}` : `This NPC owes them ${what}${e.what ? `: ${String(e.what).slice(0, 80)}` : ""}`});
  }
  if ( fought ) weigh.push({tone: "cold", why: `Fought them${date(fought) ? ` (${date(fought)})` : ""}`});
  const WARM = new Set(["sire", "childe", "domitor", "ghoul", "parent", "child", "sibling", "spouse", "kin", "kinfolk", "garou", "heirOf", "heir", "mentor", "apprentice", "patron", "retainer", "ally", "lover", "friend"]);
  const COLD = new Set(["rival", "enemy"]);
  for ( const l of links ?? [] ) {
    const tone = l.kind === "bondTo" ? "warm" : WARM.has(l.kind) ? "warm" : COLD.has(l.kind) ? "cold" : "";
    weigh.push({tone, why: `${l.label}${l.note ? ` (${l.note})` : ""}`});
  }
  for ( const s of secrets ?? [] ) weigh.push({tone: s.holderIsNpc ? "cold" : "", why: s.holderIsNpc ? `They know this NPC's secret: ${s.text}` : `This NPC knows their secret: ${s.text}`});
  if ( rival && Number(rival.step) < 0 ) weigh.push({tone: "cold", why: `Rival sides: ${rival.why || "old enmity"}`});
  for ( const x of same ?? [] ) weigh.push({tone: "warm", why: `The same ${x}`});
  const total = set.reduce((n, x) => n + (Number(x.delta) || 0), 0);
  return {step: att?.step ?? total, word: att?.word ?? "", set: set.map(x => ({...x, label: sign(Number(x.delta) || 0)})), weigh, total};
}
