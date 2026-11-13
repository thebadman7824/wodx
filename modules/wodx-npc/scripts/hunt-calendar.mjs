/**
 * WoDX NPC 0.54.0: the faith calendar of a town for a hunt (B2710). Reads the clock, the scene's faith and its
 * residents; the rules are in hunt-calendar-rules.mjs. Used by WoDX NPC's faction hunts and WoDX Actions' hunt window.
 */
import {huntCalendar} from "./hunt-calendar-rules.mjs";

const chron = () => { try { return game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api : null; } catch (e) { return null; } };

/** The faiths kept by a scene's residents other than the town's own: [{faith, share}], each at least a tenth. */
export function minorFaiths(scene, main) {
  const uuid = scene?.uuid;
  if ( !uuid ) return [];
  const count = new Map();
  let all = 0;
  for ( const a of game.actors?.contents ?? [] ) {
    const res = a.flags?.["wodx-npc"]?.resident;
    if ( !res || res.scene !== uuid ) continue;
    const f = a.flags?.["wodx-npc"]?.routine?.faith || res.faith || main;
    all++;
    count.set(f, (count.get(f) ?? 0) + 1);
  }
  return [...count].filter(([f, n]) => f && f !== main && n / Math.max(1, all) >= 0.1).map(([faith, n]) => ({faith, share: n / all}));
}

/**
 * The calendar's changes to a hunt on a scene now: {n, changes, text, active}. Nothing (n 0, no changes) when WoDX
 * Chronicle is off, its "Feast and fast days" house rule is off, or the clock can't be read.
 *   area: a hunting ground key or a place kind; crowd: the night's own nudge for empty streets; outdoors: false indoors.
 */
export function calendarFor(scene = globalThis.canvas?.scene ?? null, {area = "market", crowd = 0, outdoors = true, time = null} = {}) {
  const none = {n: 0, changes: [], text: "", active: false};
  try {
    const api = chron();
    if ( !api?.church?.on || !api?.place?.describeAt ) return none;
    const date = api.place.describeAt(scene, time ?? game.time.worldTime);
    const main = api.church.on(date, {scene});
    if ( !main?.active ) return none;
    const F = api.church.faiths;
    const region = api.church.faithOf?.(scene, date.year)?.region ?? null;
    const year = date.year, hour = date.hour ?? 22, dow = date.dayOfWeek ?? null;
    const minor = F ? minorFaiths(scene, main.faith).map(m => {
      let c = null;
      try { c = F.faithDay(m.faith, date, {region}); } catch (e) { c = null; }
      return {faith: m.faith, label: F.FAITHS?.[m.faith]?.label ?? m.faith, c};
    }) : [];
    return {...huntCalendar({main, minor, hour, year, region, dow, area, crowd, outdoors}), active: true};
  } catch (e) { console.warn("WoDX NPC | hunt calendar", e); return none; }
}
