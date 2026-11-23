/**
 * WoDX Sheets (B7754 (desk item 2026-11-23-im2)): the character's Road and domain at a glance, on the Bio tab. Pure; main.mjs
 * reads WoDX Actions' Road record (roadFaithInfo), domain (domain.state) and oaths (domain.oaths) and draws the strip.
 * Each part opens its own window in WoDX Actions; nothing here changes the records.
 */
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/**
 * road: what roadFaithInfo gives, or null; domain: what domain.state gives, or null; oaths: the Fealty journal's
 * entries; name: the character's name. Returns {road: [lines], domain: [lines]}; an empty list leaves that part out.
 */
export function standingLines({ road = null, domain = null, oaths = [], name = "" } = {}) {
  const out = { road: [], domain: [] };
  if ( road?.road && n(road.road.value) > 0 ) {
    const status = road.faith?.status === "apostate" ? ", Apostate" : road.faith?.status === "excommunicate" ? ", Excommunicate" : "";
    out.road.push(`${road.road.name} ${n(road.road.value)}: ${road.rank?.label ?? ""}${status}`);
    out.road.push(road.mentor ? `Mentor: ${road.mentor.name} (${n(road.mentor.rating)} dots)` : "No Mentor");
    if ( road.truth ) out.road.push("A Moment of Truth is open this story");
    if ( road.change ) out.road.push(`Changing to the ${road.change.name}`);
  }
  const sworn = (oaths ?? []).filter(e => e?.status === "sworn");
  const lieges = sworn.filter(e => e.vassal === name).map(e => e.liege);
  const vassals = sworn.filter(e => e.liege === name).map(e => e.vassal);
  if ( domain && n(domain.domain) > 0 ) {
    const a = domain.aspects ?? {};
    out.domain.push(`Domain ${n(domain.domain)}: Area ${n(a.area)}, Defense ${n(a.defense)}, Prosperity ${n(a.prosperity)}, Secret Ways ${n(a.secret)}`);
    const ev = (domain.events ?? []).filter(e => !e.ended).map(e => e.name);
    if ( ev.length ) out.domain.push(`Now: ${ev.join(", ")}`);
  }
  if ( lieges.length ) out.domain.push(`Sworn to ${lieges.join(", ")}`);
  if ( vassals.length ) out.domain.push(`Vassals: ${vassals.join(", ")}`);
  return out;
}
