/**
 * Herd pools by district, the pure part (B3570-B3575). No Foundry in here.
 *
 * Each district (a scene with a hunting ground) holds a pool of vessels for the month, split by class: nobles, clergy,
 * merchants and the poor in the early centuries; executives, students and the street later. The size comes from the
 * town's people (Towns over time) and the district's share of them. Every feeding there takes one from the pool; the
 * pool fills again at the start of each month. Feeding past the pool makes the district harder to hunt and brings
 * the harm the other systems already carry: a warning, then sickness, deaths and rumours, then the hunters.
 *
 * Book basis: hunting areas and their difficulty, V20 pp. 259-260 and V20 Dark Ages p. 334; Herd as a private pool of
 * vessels, V20 p. 114. The books give no number for how many vessels a district can bear before the herd thins: the
 * pool size, the stages and their difficulties are house rules (B3571-B3573).
 */

export const DAY = 86400;
export const MONTH = 30 * DAY;
export const LOG_CAP = 20;

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const str = (v, n = 120) => String(v ?? "").slice(0, n);

/** The ages the classes change at (the same breaks WoDX NPC's spheres of Influence use). */
export const PERIODS = [["medieval", 1450], ["early", 1799], ["industrial", 1913], ["modern", 2022], ["future", Infinity]];
export const periodOf = year => (PERIODS.find(([, last]) => num(year) <= last) ?? PERIODS[PERIODS.length - 1])[0];

/** The hunting areas of WoDX Actions (V20 p. 260; V20 Dark Ages p. 334). */
export const AREAS = ["slums", "lower", "market", "merchant", "patrolled"];

/**
 * The classes of vessel in each age, with how common each is in each kind of district (weights, not shares). Keys
 * carry over between ages where the people do (the poor are "poor" in every age), so a month's count reads the same.
 */
export const CLASSES = {
  medieval: [
    {key: "nobles", label: "Nobles and their households", w: {slums: 0, lower: 0, market: 1, merchant: 3, patrolled: 4}},
    {key: "clergy", label: "Clergy", w: {slums: 1, lower: 1, market: 1, merchant: 2, patrolled: 2}},
    {key: "merchants", label: "Merchants", w: {slums: 0, lower: 1, market: 4, merchant: 4, patrolled: 2}},
    {key: "crafts", label: "Craftsfolk and servants", w: {slums: 1, lower: 4, market: 3, merchant: 2, patrolled: 2}},
    {key: "travellers", label: "Pilgrims and travellers", w: {slums: 1, lower: 1, market: 2, merchant: 1, patrolled: 0}},
    {key: "poor", label: "The poor", w: {slums: 6, lower: 3, market: 1, merchant: 0, patrolled: 0}}
  ],
  early: [
    {key: "nobles", label: "Gentry and their households", w: {slums: 0, lower: 0, market: 1, merchant: 3, patrolled: 4}},
    {key: "clergy", label: "Clergy", w: {slums: 1, lower: 1, market: 1, merchant: 1, patrolled: 1}},
    {key: "merchants", label: "Merchants and their clerks", w: {slums: 0, lower: 1, market: 4, merchant: 4, patrolled: 2}},
    {key: "crafts", label: "Artisans and apprentices", w: {slums: 1, lower: 4, market: 3, merchant: 1, patrolled: 1}},
    {key: "soldiers", label: "Soldiers and sailors", w: {slums: 1, lower: 2, market: 1, merchant: 0, patrolled: 2}},
    {key: "poor", label: "Labourers and the poor", w: {slums: 6, lower: 3, market: 1, merchant: 0, patrolled: 0}}
  ],
  industrial: [
    {key: "nobles", label: "The well-to-do", w: {slums: 0, lower: 0, market: 1, merchant: 4, patrolled: 4}},
    {key: "clerks", label: "Clerks and shop staff", w: {slums: 0, lower: 2, market: 4, merchant: 3, patrolled: 2}},
    {key: "crafts", label: "Factory hands and dockers", w: {slums: 3, lower: 5, market: 2, merchant: 0, patrolled: 1}},
    {key: "nightlife", label: "The music halls and taverns", w: {slums: 2, lower: 2, market: 3, merchant: 1, patrolled: 0}},
    {key: "soldiers", label: "Soldiers, sailors and police", w: {slums: 0, lower: 1, market: 1, merchant: 1, patrolled: 3}},
    {key: "poor", label: "The poor and the destitute", w: {slums: 6, lower: 2, market: 0, merchant: 0, patrolled: 0}}
  ],
  modern: [
    {key: "nobles", label: "Executives and the rich", w: {slums: 0, lower: 0, market: 1, merchant: 4, patrolled: 3}},
    {key: "clerks", label: "Office workers", w: {slums: 0, lower: 2, market: 4, merchant: 3, patrolled: 2}},
    {key: "students", label: "Students", w: {slums: 1, lower: 3, market: 3, merchant: 1, patrolled: 1}},
    {key: "nightlife", label: "The club and bar crowd", w: {slums: 2, lower: 2, market: 4, merchant: 2, patrolled: 0}},
    {key: "crafts", label: "Night-shift workers", w: {slums: 2, lower: 3, market: 2, merchant: 1, patrolled: 2}},
    {key: "poor", label: "The street (the homeless, runaways, addicts)", w: {slums: 6, lower: 2, market: 1, merchant: 0, patrolled: 0}}
  ],
  future: [
    {key: "nobles", label: "Arcology residents", w: {slums: 0, lower: 0, market: 1, merchant: 4, patrolled: 4}},
    {key: "clerks", label: "Corporate staff", w: {slums: 0, lower: 2, market: 4, merchant: 3, patrolled: 2}},
    {key: "crafts", label: "Contract and gig workers", w: {slums: 3, lower: 4, market: 3, merchant: 1, patrolled: 1}},
    {key: "nightlife", label: "The night markets", w: {slums: 2, lower: 2, market: 4, merchant: 1, patrolled: 0}},
    {key: "poor", label: "The unregistered", w: {slums: 7, lower: 2, market: 0, merchant: 0, patrolled: 0}}
  ]
};

/** Local names for the classes that change most from land to land, by the faith the land keeps (WoDX Chronicle). */
export const LOCAL = {
  clergy: {western: "Priests, monks and nuns", orthodox: "Priests and monks", islamic: "Imams, scholars and Sufis", jewish: "Rabbis and scholars",
    hindu: "Temple priests and ascetics", theravada: "Monks and temple folk", tibetan: "Monks and nuns", chinese: "Monks, priests and temple keepers", own: "Priests and diviners"},
  nobles: {islamic: "Emirs' and beys' households", hindu: "The households of rajas and landholders", chinese: "Officials and their households", own: "Chiefs and their households"}
};

/** The classes for a year, area and faith, each with its label for that land. */
export function classesFor(year, faith = "western") {
  const p = periodOf(year), early = p === "medieval" || p === "early";
  return CLASSES[p].map(c => ({...c, label: (c.key === "clergy" || (c.key === "nobles" && early)) ? (LOCAL[c.key][faith] ?? c.label) : c.label}));
}

/** The share of a town's people who live in a district of each kind (house rule B3571). */
export const AREA_SHARE = {slums: 0.25, lower: 0.3, market: 0.2, merchant: 0.15, patrolled: 0.1};
/** People a month for one feeding to pass without harm (house rule B3571). */
export const PEOPLE_PER_FEEDING = 100;
/** People assumed when no town is kept for the district, by age. */
export const DEFAULT_PEOPLE = {medieval: 3000, early: 8000, industrial: 40000, modern: 150000, future: 200000};

/** A district's pool for the month: {total, classes: [{key, label, n}]}. */
export function poolFor({people = null, area = "market", year = 1197, faith = "western"} = {}) {
  const a = AREAS.includes(area) ? area : "market";
  const folk = num(people) > 0 ? num(people) : DEFAULT_PEOPLE[periodOf(year)];
  const total = Math.max(2, Math.round(folk * AREA_SHARE[a] / PEOPLE_PER_FEEDING));
  const cls = classesFor(year, faith).filter(c => c.w[a] > 0);
  const sum = cls.reduce((s, c) => s + c.w[a], 0) || 1;
  let left = total;
  const out = cls.map((c, i) => {
    const n = i === cls.length - 1 ? left : Math.max(0, Math.round(total * c.w[a] / sum));
    left -= n;
    return {key: c.key, label: c.label, n: Math.max(0, n)};
  });
  return {total, classes: out};
}

/** The stages of a district fed on past its pool (house rule B3572). ratio: feedings this month over the pool. */
export const STAGES = [
  {key: "fine", name: "Plenty", over: 0, diff: 0, note: "The herd here bears what is taken."},
  {key: "thin", name: "Thinning", over: 1, diff: 1, note: "Too many feedings this month: vessels are pale and wary. Hunting here is 1 harder."},
  {key: "over", name: "Over-hunted", over: 1.5, diff: 2, note: "Vessels are sickening and some have died. People talk. Hunting here is 2 harder."},
  {key: "stripped", name: "Stripped", over: 2, diff: 3, note: "The district is bled white: deaths no one can explain, and the era's hunters take notice. Hunting here is 3 harder."}
];
export const stageFor = ratio => [...STAGES].reverse().find(s => num(ratio) > s.over) ?? STAGES[0];

export const monthOf = t => Math.floor(num(t) / MONTH);

export function blankHerd() { return {month: null, fed: {}, feeds: 0, stage: "fine", log: []}; }
export function normHerd(h = {}) {
  const fed = {};
  for ( const [k, v] of Object.entries(h?.fed ?? {}) ) if ( num(v) > 0 ) fed[str(k, 30)] = Math.round(num(v));
  return {month: h?.month === null || h?.month === undefined || h?.month === "" ? null : Math.round(num(h.month)), fed,
    feeds: Math.max(0, Math.round(num(h?.feeds))), stage: STAGES.some(s => s.key === h?.stage) ? h.stage : "fine",
    log: (Array.isArray(h?.log) ? h.log : []).slice(-LOG_CAP).map(l => ({t: num(l?.t), text: str(l?.text, 200)}))};
}

/** The herd as it stands at time t: a new month fills it again. */
export function refill(herd, t) {
  const h = normHerd(herd), m = monthOf(t);
  if ( h.month === m ) return {herd: h, refilled: false};
  return {herd: {...h, month: m, fed: {}, feeds: 0, stage: "fine"}, refilled: h.month !== null && h.feeds > 0};
}

/**
 * The class a feeding takes from: the vessel's own (from its tags) if the district has it, else the class with the
 * most left this month.
 */
export function pickClass(herd, pool, want = null) {
  const h = normHerd(herd);
  if ( want && pool.classes.some(c => c.key === want) ) return want;
  const left = pool.classes.map(c => ({key: c.key, left: c.n - (h.fed[c.key] ?? 0)})).sort((a, b) => b.left - a.left);
  return left[0]?.key ?? null;
}

/** The class a vessel belongs to, from WoDX NPC passer-by tags or a station word. */
export function classOfTags(tags = [], year = 1197) {
  const t = (Array.isArray(tags) ? tags : [tags]).map(x => String(x ?? "").toLowerCase()).join(" ");
  if ( !t ) return null;
  if ( /\banimal\b/.test(t) ) return "animal";
  const p = periodOf(year);
  const rules = [
    [/\b(noble|lord|lady|knight|gentry|baron|count|emir|bey|raja|samurai|official|mandarin|chief|rich|executive|wealthy|arcology)/, "nobles"],
    [/\b(priest|monk|nun|clergy|cleric|friar|imam|rabbi|scholar|sufi|lama|ascetic|temple|diviner)/, "clergy"],
    [/\b(student|scholar)/, "students"],
    [/\b(merchant|trader|banker|moneylender)/, "merchants"],
    [/\b(clerk|office|shop|corporate)/, "clerks"],
    [/\b(soldier|guard|sailor|police|watch|mercenary)/, "soldiers"],
    [/\b(pilgrim|traveller|traveler|tourist|visitor)/, "travellers"],
    [/\b(reveller|drinker|club|bar|nightlife|tavern)/, "nightlife"],
    [/\b(beggar|poor|homeless|vagrant|runaway|addict|peasant|labourer|laborer|unregistered)/, "poor"],
    [/\b(craft|artisan|apprentice|servant|worker|smith|baker|weaver|docker|hand)/, "crafts"]
  ];
  const hit = rules.find(([re]) => re.test(t))?.[1] ?? null;
  if ( !hit ) return null;
  const keys = new Set(CLASSES[p].map(c => c.key));
  if ( keys.has(hit) ) return hit;
  // A class an age does not list falls to the nearest one it does
  const near = {merchants: "clerks", clerks: "merchants", students: "clerks", travellers: "poor", soldiers: "crafts", nightlife: "crafts", clergy: "clerks"};
  return keys.has(near[hit]) ? near[hit] : null;
}

/**
 * One feeding in the district. Returns {herd, cls, stage, before, crossed, ratio, classOver}.
 * crossed: the stage reached when the feeding moves the district up a stage, else null.
 */
export function feed(herd, pool, {t = 0, cls = null, who = ""} = {}) {
  const r = refill(herd, t), h = r.herd;
  const k = pickClass(h, pool, cls);
  const before = STAGES.find(s => s.key === h.stage) ?? STAGES[0];
  const fed = {...h.fed};
  if ( k ) fed[k] = (fed[k] ?? 0) + 1;
  const feeds = h.feeds + 1, ratio = feeds / Math.max(1, pool.total), stage = stageFor(ratio);
  const crossed = STAGES.indexOf(stage) > STAGES.indexOf(before) ? stage : null;
  const c = pool.classes.find(x => x.key === k);
  const classOver = !!c && fed[k] > c.n;
  let out = {...h, fed, feeds, stage: stage.key};
  if ( crossed ) out = {...out, log: [...out.log, {t: num(t), text: `${crossed.name} after ${feeds} feedings${who ? ` (last: ${str(who, 60)})` : ""}.`}].slice(-LOG_CAP)};
  return {herd: out, cls: k, stage, before, crossed, ratio, classOver, refilled: r.refilled};
}

/** The extra hunting difficulty a district's herd adds now (its stage's). */
export function huntDiff(herd, pool, t = 0) {
  const h = refill(herd, t).herd;
  return stageFor(h.feeds / Math.max(1, pool.total)).diff;
}

/** What a district's herd looks like, for the window and cards. */
export function view(herd, pool, t = 0) {
  const h = refill(herd, t).herd;
  const stage = stageFor(h.feeds / Math.max(1, pool.total));
  return {stage, feeds: h.feeds, total: pool.total, left: Math.max(0, pool.total - h.feeds),
    classes: pool.classes.map(c => ({...c, fed: h.fed[c.key] ?? 0, left: Math.max(0, c.n - (h.fed[c.key] ?? 0))})), log: h.log};
}

/** What the next systems are asked to do when a district reaches a stage (house rule B3573). */
export function harmFor(stageKey) {
  return {
    fine: {heat: null, rumour: false, hunters: false, deaths: 0},
    thin: {heat: null, rumour: false, hunters: false, deaths: 0},
    over: {heat: "hunt", rumour: true, hunters: false, deaths: 1},
    stripped: {heat: "botch", rumour: true, hunters: true, deaths: 2}
  }[stageKey] ?? {heat: null, rumour: false, hunters: false, deaths: 0};
}

/** A rumour line for a district at a stage, in the words of its age. */
export function rumourFor(stageKey, place, year) {
  const p = periodOf(year);
  const sick = p === "medieval" || p === "early" ? "a wasting sickness, or a curse" : p === "industrial" ? "anaemia, or something in the water" : "some new drug, or a sickness the clinics can't name";
  if ( stageKey === "stripped" ) return `People are dying at ${place} with no wound to show for it. Some say ${sick}; others say something feeds there.`;
  return `Folk at ${place} are pale and weak, and one or two have died. They blame ${sick}.`;
}
