/**
 * WoDX Creation 0.12.0: Before the First Night, the pure rules (Chronicle Start Desk, approved 2026-11-12). No
 * Foundry calls, so the harness can test them. The window is first-night.mjs.
 *
 * A hub for each player character: one card per step (Session Zero, troupe ties, concept, lifepath, build, Merits
 * and Flaws, fit with the year and place, prelude, the trouble forecast, sign-off). Steps go in any order; sign-off
 * comes last. A player marks a step done and the Storyteller approves it (c4); some steps tick themselves when the
 * sheet shows they are done.
 *
 * The trouble forecast gathers what a character's choices will cost later, from systems WoDX already has: the
 * trait effect tables (night draws, Ledger clocks, moment prompts, map triggers, Backgrounds made real), the splat
 * features, Generation and the Road, the lifepath's people and kept flaws, faction standing, rivalries in force this
 * year, dated events coming for the line, a language shared with the troupe, and gear out of its time. Each item
 * says whether the character would know of it (the player sees those) or not (Storyteller only).
 *
 * Book basis: V20 caps the points a character takes from Flaws at 7 (V20 core, Merits and Flaws chapter; the book
 * check pins the page). Thin blood at the 14th and 15th Generation (V20 core). The trouble dial, the story hook, the
 * five-year horizon, the step list and the forecast wording are WoDX readings (house rules, B1600 to B1609).
 *
 * Record on the actor: flags["wodx-creation"].firstNight = {steps: {[key]: {done, at, by}}, dial, hook, signed, at}.
 */

export const VERSION = 1;
export const FLAW_CAP = 7;
export const HORIZON_YEARS = 5;

/** The steps, in the order the hub shows them. auto: the hub can tell from the sheet; gm: only the Storyteller ticks it. */
export const STEPS = [
  {key: "sessionZero", label: "Session Zero", hint: "Tone, lines and veils, the X-card, house rules. Once for the whole table.", world: true},
  {key: "ties", label: "Troupe ties", hint: "How this character knows the others."},
  {key: "concept", label: "Concept", hint: "Concept, Nature and Demeanor on the sheet.", auto: true},
  {key: "lifepath", label: "Lifepath", hint: "Optional: scenes from the life before.", auto: true, optional: true},
  {key: "build", label: "Build", hint: "Points spent to the book's creation totals.", auto: true},
  {key: "meritsFlaws", label: "Merits and Flaws", hint: `Flaws give at most ${FLAW_CAP} freebie points; the Storyteller agrees to each.`, auto: true},
  {key: "fit", label: "Fit with the year and place", hint: "The clan, language and gear against the chronicle's year."},
  {key: "prelude", label: "Prelude", hint: "The life before and the change, played or written."},
  {key: "recheck", label: "Check after the prelude", hint: "The book's totals again, with what the prelude gave.", auto: true},
  {key: "forecast", label: "Trouble ahead", hint: "What the choices will cost later. Read it together."},
  {key: "signoff", label: "Sign-off", hint: "The Storyteller signs the character off for the first night.", gm: true, last: true}
];
export const STEP_KEYS = STEPS.map(s => s.key);
export const stepByKey = k => STEPS.find(s => s.key === k) ?? null;

/** The trouble dial (desk d6): how often the character's own flaws and ties turn up in the night's draw. */
export const DIAL = {quiet: {label: "Quiet", scale: 0.5}, normal: {label: "Normal", scale: 1}, often: {label: "Often", scale: 1.5}};
export const dialScale = key => DIAL[key]?.scale ?? 1;
/** A night-draw chance under the dial, kept between 0 and 0.9. */
export const scaledChance = (chance, key) => Math.max(0, Math.min(0.9, (Number(chance) || 0) * dialScale(key)));

/** The record, cleaned. */
export function normRecord(r = {}) {
  const steps = {};
  for ( const k of STEP_KEYS ) {
    const s = r?.steps?.[k];
    if ( s?.done ) steps[k] = {done: true, at: Number(s.at) || 0, by: s.by ? String(s.by).slice(0, 40) : null};
  }
  const hook = r?.hook && r.hook.text ? {text: String(r.hook.text).slice(0, 200), agreed: !!r.hook.agreed, since: Number(r.hook.since) || 0,
    sessions: Math.max(0, Math.trunc(Number(r.hook.sessions) || 0)), used: !!r.hook.used} : null;
  const out = {version: VERSION, steps, dial: DIAL[r?.dial] ? r.dial : "normal", hook, signed: !!r?.signed, at: Number(r?.at) || 0};
  // The prelude runner keeps its own record here (first-night-prelude-rules.mjs normPrelude)
  if ( r?.prelude && typeof r.prelude === "object" ) out.prelude = r.prelude;
  return out;
}

/** Story hook reminder (desk b3): agreed, not yet brought in, four sessions or more. */
export const HOOK_SESSIONS = 4;
export const hookDue = hook => !!hook?.agreed && !hook.used && (Number(hook.sessions) || 0) >= HOOK_SESSIONS;

/**
 * What the sheet shows for the steps the hub can tell. view: {concept, nature, demeanor, lifepath (bool),
 * build: {ok, freebiesLeft} | null, flawPoints, flawsApproved (bool), sessionZero (bool), recheck: {ok} | null}.
 * The check after the prelude (0.24.0) is done when the prelude is and the build still matches the book with the
 * prelude's gains paid from its own points.
 */
export function autoDone(view = {}) {
  const out = {};
  out.concept = !!(String(view.concept ?? "").trim() && String(view.nature ?? "").trim() && String(view.demeanor ?? "").trim());
  out.lifepath = !!view.lifepath;
  out.build = !!view.build?.ok;
  out.meritsFlaws = (Number(view.flawPoints) || 0) <= FLAW_CAP && !!view.flawsApproved;
  out.sessionZero = !!view.sessionZero;
  out.recheck = !!view.recheck?.ok;
  return out;
}

/** Each step's state: done (ticked or shown by the sheet), waiting (sent to the Storyteller), or open. */
export function stepStates(record, view = {}, waiting = []) {
  const r = normRecord(record), auto = autoDone(view);
  return STEPS.map(s => {
    const done = !!r.steps[s.key]?.done || !!auto[s.key];
    return {...s, state: done ? "done" : waiting.includes(s.key) ? "waiting" : "open", byAuto: !r.steps[s.key]?.done && !!auto[s.key]};
  });
}

/** Can the Storyteller sign off? Every step but sign-off done, the optional lifepath excepted. Returns {ok, missing}. */
export function canSignOff(states = []) {
  const missing = states.filter(s => !s.last && !s.optional && s.state !== "done").map(s => s.label);
  return {ok: !missing.length, missing};
}

/** Flaw points on a sheet: features [{kind, value}] with kind "flaw". */
export const flawPoints = (features = []) => features.filter(f => f?.kind === "flaw").reduce((t, f) => t + Math.max(0, Number(f.value) || 0), 0);

/* ------------------------------------------------------------------ */
/*  The trouble forecast                                               */
/* ------------------------------------------------------------------ */

/** People from the past whose role means trouble. */
export const HOSTILE_ROLE = /rival|murderer|hunting|hunter|caged|creditor|monster|harpy|enemy|betray|jilted|would not marry|inquisitor|witch-?finder/i;

const share = c => (c >= 0.33 ? "about one night in three" : c >= 0.25 ? "about one night in four" : c >= 0.2 ? "about one night in five" : c > 0 ? "now and then" : "rarely");
const lineOfEvents = line => (line === "ghoul" || line === "revenant" ? "vampire" : line === "kinfolk" ? "werewolf" : line);

/**
 * Gather the forecast. src: {
 *   name, line, year, nowEra: {id, end},
 *   traits: [{key, name, kind, value}] (matched features; kind flaw/merit/background),
 *   tables: {PULLS, LEDGER, PROMPTS, TRIGGERS, BG_WORLD},
 *   plan: [{key, label, count, made}] (Backgrounds made real, from bg-world worldPlan),
 *   splat: [{title, text, label}],
 *   generation, road: {name, value},
 *   lifepath: {people: [{role, note, year, name, actorId}], kept: ["flaw Enemy", ...]} | null,
 *   standing: [{faction, step}], rivals: [{theirSide, step, note}],
 *   events: [{id, name, year, lines, summary, on}],
 *   troupeLanguages: {shared: bool, mine: [..]}, gear: [{name, note}],
 *   dial
 * }
 * Returns [{key, group, title, text, known, when, seed}] sorted by group. seed: what step 2's cards can make of it.
 */
export function forecast(src = {}) {
  const out = [], T = src.tables ?? {}, dial = src.dial ?? "normal";
  const push = (o) => out.push({known: true, when: "", seed: null, ...o});
  const traits = src.traits ?? [];
  for ( const t of traits ) {
    const p = T.PULLS?.[t.key];
    if ( p ) push({key: `pull:${t.key}`, group: "flaws", title: t.name, known: true,
      text: p.aid ? "Brings visions into the night's draw." : String(p.text ?? "").replaceAll("{{name}}", src.name || "the character"),
      when: `In the night's draw, ${share(scaledChance(p.chance, dial))}.`});
    const l = T.LEDGER?.[t.key];
    if ( l ) push({key: `ledger:${t.key}`, group: "flaws", title: t.name, text: l.what, known: l.kind !== "consequence",
      when: l.dueNights ? `Comes due in about ${l.dueNights} nights unless kept buried.` : `A ${l.kind} in the Ledger.`,
      seed: {kind: "ledger", key: t.key}});
    const pr = T.PROMPTS?.[t.key];
    if ( pr ) push({key: `prompt:${t.key}`, group: "flaws", title: t.name, text: `The Storyteller is reminded: ${pr.text}.`, when: `When ${pr.on.map(o => ({feed: "feeding", social: "talking someone round", fight: "a fight starts", night: "the night begins"}[o] ?? o)).join(" or ")}.`});
    const tr = T.TRIGGERS?.[t.key];
    if ( tr ) push({key: `trigger:${t.key}`, group: "flaws", title: t.name, text: `On the map: ${tr.text}.`, when: tr.stop ? "Moves are held at the edge." : "A card when it happens."});
  }
  for ( const b of src.plan ?? [] ) {
    if ( b.made >= b.count ) continue;
    push({key: `bg:${b.key}`, group: "people", title: b.label, text: `${b.count - b.made} of ${b.count} still to be made as people or places in the world.`,
      when: "At sign-off.", seed: {kind: "background", key: b.key}});
  }
  for ( const s of src.splat ?? [] ) push({key: `splat:${s.label ?? s.title}`, group: "blood", title: s.title, text: s.text, when: "Always."});
  const g = Number(src.generation) || 0;
  if ( g >= 14 ) push({key: "gen:thin", group: "blood", title: `${g}th Generation`, text: "Thin blood: weak in the Disciplines and scorned by older Kindred, who may call for the character's end.", when: "Whenever elders take notice."});
  else if ( g && g <= 8 ) push({key: "gen:potent", group: "blood", title: `${g}th Generation`, known: false, text: "Potent blood draws envy. Anyone who learns the Generation may want it, by diablerie if need be.", when: "If the Generation becomes known."});
  const rv = Number(src.road?.value);
  if ( src.road && Number.isFinite(rv) && rv > 0 && rv <= 4 ) push({key: "road:low", group: "blood", title: `${src.road.name || "Humanity"} ${rv}`, text: "Close to the Beast: frenzy and the loss of what is left come easily, and others can see it.", when: "In every hard choice."});
  const lp = src.lifepath;
  for ( const p of lp?.people ?? [] ) {
    if ( !HOSTILE_ROLE.test(`${p.role} ${p.note ?? ""}`) ) continue;
    const alive = !src.year || !p.year || src.year - p.year <= 70;
    push({key: `past:${p.role}:${p.year}`, group: "people", title: p.name ? `${p.name}, ${p.role}` : `${p.role[0].toUpperCase()}${p.role.slice(1)}`,
      text: `From the past (${p.year})${p.note ? `: ${p.note}` : ""}.${alive ? "" : " Long dead, but others may carry the grudge."}`,
      when: alive ? "Could turn up at any time." : "Through heirs or followers.", seed: alive && !p.actorId ? {kind: "enemy", role: p.role, year: p.year} : null});
  }
  const onSheet = new Set(traits.map(t => String(t.name ?? "").toLowerCase().replace(/\s*\(.*$/, "")));
  for ( const k of lp?.kept ?? [] ) {
    const m = String(k).match(/^flaw\s+(.+)$/i);
    if ( !m || onSheet.has(m[1].toLowerCase().replace(/\s*\(.*$/, "")) ) continue;
    push({key: `kept:${m[1]}`, group: "flaws", title: m[1], text: "Kept from the lifepath but not yet on the sheet as a Flaw.", when: "Buy it as a Flaw, or drop it."});
  }
  for ( const s of src.standing ?? [] ) {
    if ( s.step > -1 ) continue;
    push({key: `faction:${s.faction}`, group: "powers", title: s.faction, text: `Regards the character as ${s.word ?? (s.step <= -3 ? "hunted" : s.step <= -2 ? "hostile" : "distrusted")}.`, when: "Whenever its people are near."});
  }
  for ( const r of src.rivals ?? [] ) {
    if ( r.step > -2 ) continue;
    push({key: `rival:${r.theirSide}`, group: "powers", title: sideLabel(r.theirSide), text: r.note || "An old enmity with the character's own kind.", when: r.step <= -3 ? "On sight." : "When they meet."});
  }
  const line = lineOfEvents(src.line);
  const horizon = horizonOf(src.year, src.nowEra);
  for ( const e of src.events ?? [] ) {
    if ( e.on === false || !src.year || e.year < src.year || e.year > horizon ) continue;
    const lines = e.lines ?? ["all"];
    if ( !lines.includes("all") && !lines.includes(line) ) continue;
    push({key: `event:${e.id}`, group: "times", title: e.name, text: e.summary ?? "", known: false, when: `${e.year}.`, seed: {kind: "hook", event: e.id, year: e.year}});
  }
  if ( src.troupeLanguages && !src.troupeLanguages.shared ) push({key: "lang", group: "times", title: "No shared language", text: "Speaks no language the rest of the troupe speaks.", when: "From the first night."});
  for ( const it of src.gear ?? [] ) push({key: `gear:${it.name}`, group: "times", title: it.name, text: `Out of its time: ${it.note}.`, when: "When anyone sees it."});
  const order = Object.keys(GROUPS);
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}

export const GROUPS = {flaws: "Flaws and what they bring", blood: "Blood, line and nature", people: "People", powers: "Factions and old enmities", times: "The times"};

/** The last year the forecast looks to: five years on, or the first year of the next era if that is sooner (desk d5). */
export function horizonOf(year, era = null) {
  const y = Number(year) || 0;
  const end = Number(era?.end);
  return Number.isFinite(end) && end >= y ? Math.min(y + HORIZON_YEARS, end + 1) : y + HORIZON_YEARS;
}

/** "clan:tremere" to "Tremere". */
export function sideLabel(side) {
  const v = String(side ?? "").split("|")[0];
  const w = v.includes(":") ? v.slice(v.indexOf(":") + 1) : v;
  return w ? w.replace(/(^|[\s-])\w/g, c => c.toUpperCase()) : "Old enemies";
}

/** The player's view (desk d2): only what the character would know. */
export const playerView = items => items.filter(i => i.known);

/** The forecast as HTML for a card or the hub. */
export function forecastHtml(items = [], {gm = false, esc = s => String(s)} = {}) {
  if ( !items.length ) return `<p class="wodx-quiet">Nothing ahead that WoDX can see yet.</p>`;
  const parts = [];
  for ( const [g, label] of Object.entries(GROUPS) ) {
    const rows = items.filter(i => i.group === g);
    if ( !rows.length ) continue;
    parts.push(`<h4>${esc(label)}</h4><ul class="wodx-fn-forecast">${rows.map(i => `<li${i.known ? "" : ` class="wodx-fn-hidden"`}><b>${esc(i.title)}</b>. ${esc(i.text)}${i.when ? ` <span class="wodx-quiet">${esc(i.when)}</span>` : ""}${gm && !i.known ? ` <span class="wodx-quiet">(Storyteller only)</span>` : ""}</li>`).join("")}</ul>`);
  }
  return parts.join("");
}

/**
 * Fit with the chronicle's year and place (desk b4): warnings only. src: {splatOpen: {ok, why} | null,
 * troupeLanguages, gear}. Returns [{key, text}].
 */
export function fitWarnings(src = {}) {
  const out = [];
  if ( src.lineOpen && !src.lineOpen.ok ) out.push({key: "line", text: src.lineOpen.why || src.lineOpen.note || "This line is not found in the chronicle's year."});
  if ( src.splatOpen && !src.splatOpen.ok ) out.push({key: "splat", text: src.splatOpen.why || src.splatOpen.note || "The clan, tribe or creed is not found in this year."});
  if ( src.troupeLanguages && !src.troupeLanguages.shared ) out.push({key: "lang", text: "Speaks no language the rest of the troupe speaks."});
  for ( const it of src.gear ?? [] ) out.push({key: `gear:${it.name}`, text: `${it.name}: ${it.note}.`});
  return out;
}

/** Do the languages overlap with the rest of the troupe? mine: [..], others: [[..], ..]. No others: shared. */
export function sharesLanguage(mine = [], others = []) {
  const m = new Set(mine.map(s => String(s).toLowerCase()));
  const rest = others.filter(o => o?.length);
  if ( !rest.length || !m.size ) return true;
  return rest.every(o => o.some(l => m.has(String(l).toLowerCase())));
}

/** The one-line cost of a trait while building (desk d3), or "" when the tables say nothing. */
export function costLine(key, tables = {}) {
  const T = tables;
  if ( T.PULLS?.[key] ) return T.PULLS[key].aid ? "brings visions into the night's draw" : "turns up in the night's draw";
  if ( T.LEDGER?.[key] ) return T.LEDGER[key].dueNights ? "a secret with a clock on it" : `opens a ${T.LEDGER[key].kind} in the Ledger`;
  if ( T.PROMPTS?.[key] ) return `bites ${T.PROMPTS[key].on.map(o => ({feed: "when feeding", social: "in talk", fight: "in fights", night: "some nights"}[o] ?? o)).join(", ")}`;
  if ( T.TRIGGERS?.[key] ) return "can stop a move on the map";
  if ( T.BG_WORLD?.[key] ) return T.BG_WORLD[key].people ? "becomes people in the world" : "becomes a place in the world";
  return "";
}

/** The rivalry rows in force where the other side regards the character's sides with hostility. RV: WoDX NPC's rivalry rules. */
export function enemiesOf(mine, year, rows, RV) {
  const out = [];
  for ( const r of rows ) {
    if ( !RV.inForce(r, year) ) continue;
    if ( RV.matches(r.a, mine) && !RV.matches(r.aNot, mine) && r.ba < 0 ) out.push({theirSide: r.b, step: r.ba, note: r.note});
    else if ( RV.matches(r.b, mine) && !RV.matches(r.bNot, mine) && r.ab < 0 ) out.push({theirSide: r.a, step: r.ab, note: r.note});
  }
  const seen = new Set();
  return out.filter(x => !seen.has(x.theirSide) && seen.add(x.theirSide));
}


/* ------------------------------------------------------------------ */
/*  Seeding the world at sign-off (desk d4, d7)                        */
/* ------------------------------------------------------------------ */

const sideWords = side => String(side ?? "").split("|").map(s => s.slice(s.indexOf(":") + 1).trim().toLowerCase()).filter(w => w.length >= 4);

/**
 * Starting faction standing, suggested (desk d7): a faction whose name carries one of the character's own sides
 * (sect, clan, tribe, Tradition, court...) starts at Tolerated, one step more for every two dots of Status, up to
 * Honoured; one that carries the name of a side that hates the character's kind starts at Distrusted, or Hostile
 * when the enmity hunts on sight. Standing already set is left alone. Returns [{id, name, to, why}].
 */
export function suggestStanding({sides = [], status = 0, factions = [], rivals = []} = {}) {
  const out = [];
  const own = sides.filter(s => !/^line:/.test(s)).flatMap(sideWords);
  for ( const f of factions ) {
    if ( Number(f.current) ) continue;
    const name = `${f.name ?? ""} ${f.key ?? ""}`.toLowerCase();
    const enemy = rivals.find(r => sideWords(r.theirSide).some(w => name.includes(w)));
    if ( enemy ) { out.push({id: f.id, name: f.name, to: enemy.step <= -3 ? -2 : -1, why: `Old enmity with ${sideLabel(enemy.theirSide)}`}); continue; }
    const w = own.find(x => name.includes(x));
    if ( w ) out.push({id: f.id, name: f.name, to: Math.min(3, 1 + Math.floor((Number(status) || 0) / 2)), why: `One of their own (${w[0].toUpperCase()}${w.slice(1)})`});
  }
  return out;
}

/**
 * The cards the Storyteller gets at sign-off, one per thing the world can be given (desk d4). items: the forecast;
 * standing: suggestStanding's rows. Returns [{key, kind, title, text, data}]. Background people come as one card,
 * since WoDX Chronicle makes them together.
 */
export function seedCards(items = [], standing = []) {
  const out = [];
  const bgs = items.filter(i => i.seed?.kind === "background");
  if ( bgs.length ) out.push({key: "bg", kind: "background", title: "Make the Backgrounds real", text: bgs.map(b => `${b.title}: ${b.text}`).join(" "), data: {}});
  for ( const i of items ) {
    const s = i.seed;
    if ( !s || s.kind === "background" ) continue;
    if ( s.kind === "enemy" ) out.push({key: i.key, kind: "enemy", title: `Make ${i.title} a person`, text: `${i.text} Made as an NPC who regards the character as Hostile.`, data: {role: s.role, year: s.year, note: i.text}});
    else if ( s.kind === "ledger" ) out.push({key: i.key, kind: "ledger", title: `Open the Ledger: ${i.title}`, text: i.text, data: {trait: s.key}});
    else if ( s.kind === "hook" ) out.push({key: i.key, kind: "hook", title: `A hook: ${i.title}`, text: `${i.text} A Ledger entry comes due on the date, to bring the character into it.`, data: {event: s.event, year: s.year, name: i.title}});
  }
  const ledgers = out.filter(c => c.kind === "ledger");
  if ( ledgers.length > 1 ) {
    // The Ledger opens every flaw's entry in one pass, so they come as one card
    const keep = out.filter(c => c.kind !== "ledger");
    keep.splice(bgs.length ? 1 : 0, 0, {key: "ledger", kind: "ledger", title: "Open the Ledger for the flaws", text: ledgers.map(c => `${c.title.replace(/^Open the Ledger: /, "")}: ${c.text}`).join(" "), data: {}});
    out.length = 0; out.push(...keep);
  }
  for ( const s of standing ) out.push({key: `standing:${s.id}`, kind: "standing", title: `${s.name}: start at ${STANDING_WORD[String(s.to)] ?? s.to}`, text: s.why, data: {faction: s.id, to: s.to}});
  return out;
}
export const STANDING_WORD = {"-3": "Hunted", "-2": "Hostile", "-1": "Distrusted", "1": "Tolerated", "2": "Welcome", "3": "Honoured"};
