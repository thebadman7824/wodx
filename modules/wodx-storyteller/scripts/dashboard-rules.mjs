/**
 * The Storyteller's dashboard (WoDX Storyteller 0.10.0), the pure rules. One window that gathers what is spread over
 * the tracker, the ledger, the beats, the dreams and the clock: how the party stands, what runs out or comes next,
 * what is still open, and which debts and grudges come due. It changes nothing. No Foundry here.
 */

const DAY = 86400;
const num = v => (v === null || v === undefined || v === "" ? NaN : Number(v));

/** "in 3 h", "in 4 days", "2 days ago", "now". */
export function whenLabel(seconds) {
  const s = num(seconds);
  if ( !Number.isFinite(s) ) return "no date";
  const a = Math.abs(s);
  if ( a < 60 ) return "now";
  let span;
  if ( a < 3600 ) span = `${Math.round(a / 60)} min`;
  else if ( a < DAY ) span = `${Math.round(a / 3600)} h`;
  else { const d = Math.round(a / DAY); span = d === 1 ? "1 day" : `${d} days`; }
  return s > 0 ? `in ${span}` : `${span} ago`;
}

/** One character's line from the sheet's numbers. Missing traits are left out, never shown as zero. */
export function partyRow({id, name, type, system = {}, statuses = [], where = null, ahead = 0} = {}) {
  const dmg = system?.health?.damage ?? {};
  const b = Number(dmg.bashing) || 0, l = Number(dmg.lethal) || 0, ag = Number(dmg.aggravated) || 0;
  const levels = Number(system?.traits?.health?.totalhealthlevels?.max) || 7;
  const taken = b + l + ag;
  const wp = system?.advantages?.willpower ?? system?.willpower;
  const bp = system?.advantages?.bloodpool ?? system?.bloodpool;
  const hasBlood = /vampire/i.test(String(type ?? "")) || !!system?.settings?.hasbloodpool;
  return {
    id: String(id ?? ""), name: String(name ?? ""),
    wounds: {bashing: b, lethal: l, aggravated: ag, taken, levels, down: taken >= levels},
    willpower: wp && Number.isFinite(Number(wp.permanent)) ? {now: Number(wp.temporary) || 0, of: Number(wp.permanent) || 0} : null,
    blood: hasBlood && bp ? {now: Number(bp.temporary) || 0, of: Number(bp.max) || 10} : null,
    statuses: [...new Set((statuses ?? []).map(String))].sort(),
    where: where ? String(where) : null,
    ahead: Number(ahead) || 0
  };
}

/** Wounds in words. */
export function woundWords(w) {
  if ( !w?.taken ) return "unhurt";
  const parts = [w.bashing && `${w.bashing} bashing`, w.lethal && `${w.lethal} lethal`, w.aggravated && `${w.aggravated} aggravated`].filter(Boolean);
  return `${parts.join(", ")}${w.down ? ", down" : ""}`;
}

/** Who most needs a look first: down, then the most hurt, then low blood, then by name. */
export function sortParty(rows) {
  const lowBlood = r => (r.blood && r.blood.of ? r.blood.now / r.blood.of : 1);
  return [...rows].sort((a, b) => (b.wounds.down - a.wounds.down) || (b.wounds.taken - a.wounds.taken) || (lowBlood(a) - lowBlood(b)) || a.name.localeCompare(b.name));
}

/**
 * Everything with a time still ahead, soonest first: timed effects running out, beats on a time, dreams, dated
 * events and the next dawn. Each {at, what, kind}. Past items and untimed ones are left out. At most `cap`.
 */
export function clocks({now, dawnAt = null, timed = [], beats = [], dreams = [], events = [], cap = 40} = {}) {
  const t = num(now);
  if ( !Number.isFinite(t) ) return [];
  const out = [];
  if ( Number.isFinite(num(dawnAt)) ) out.push({at: num(dawnAt), what: "Dawn", kind: "dawn"});
  for ( const x of timed ) if ( Number.isFinite(num(x?.until)) ) out.push({at: num(x.until), what: `${x.actor ?? "Someone"}: ${x.name ?? "an effect"} ends`, kind: "effect"});
  for ( const b of beats ) if ( !b?.fired && (b?.on ?? "time") === "time" && Number.isFinite(num(b?.time)) ) out.push({at: num(b.time), what: `Beat: ${b.name ?? "a beat"}`, kind: "beat"});
  for ( const d of dreams ) if ( !d?.released && Number.isFinite(num(d?.at)) ) out.push({at: num(d.at), what: `Dream for ${d.actor ?? "someone"}: ${d.title ?? "a dream"}`, kind: "dream"});
  for ( const e of events ) if ( Number.isFinite(num(e?.at)) ) out.push({at: num(e.at), what: e.name ?? "An event", kind: "event"});
  return out.filter(x => x.at >= t).sort((a, b) => a.at - b.at || a.what.localeCompare(b.what)).slice(0, cap);
}

/** Open threads: beats waiting on a place, a flag or the map (time beats are clocks), live rumours, the queue. */
export function threads({beats = [], rumours = [], queue = 0, held = 0} = {}) {
  const out = [];
  for ( const b of beats ) if ( !b?.fired && b?.on && b.on !== "time" ) out.push({what: `Beat: ${b.name ?? "a beat"}`, why: b.on === "place" ? "waits for someone to arrive" : b.on === "flag" ? "waits on a flag" : "waits on the map", kind: "beat"});
  for ( const b of beats ) if ( !b?.fired && (b?.on ?? "time") === "time" && !Number.isFinite(num(b?.time)) ) out.push({what: `Beat: ${b.name ?? "a beat"}`, why: "has no time set", kind: "beat"});
  for ( const r of rumours ) out.push({what: `Rumour: ${r.text ?? ""}`, why: `${r.known ?? 0} know it`, kind: "rumour"});
  if ( Number(queue) > 0 ) out.push({what: "The approval queue", why: `${queue} waiting`, kind: "queue"});
  if ( Number(held) > 0 ) out.push({what: "Held back from the queue", why: `${held} held`, kind: "queue"});
  return out;
}

/** Open debts, oaths, boons and grudges: overdue first, then the soonest, then those with no date. */
export function consequences(entries = [], now = 0) {
  const t = Number(now) || 0;
  return entries.filter(e => (e?.status ?? "open") === "open").map(e => {
    const due = num(e.due);
    return {...e, due: Number.isFinite(due) ? due : null, overdue: Number.isFinite(due) && due <= t};
  }).sort((a, b) => (b.overdue - a.overdue) || ((a.due ?? Infinity) - (b.due ?? Infinity)) || String(a.what ?? "").localeCompare(String(b.what ?? "")));
}
