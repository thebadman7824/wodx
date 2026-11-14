/**
 * WoDX Storyteller: what a town event looks like on the town's scenes (B4620, show-don't-tell desk v1). Pure rules,
 * no Foundry; the Foundry side is town-looks.mjs.
 *
 * A town turn's fire, flood, storm, earthquake, riot, rising or sack (and a power that reaches the town) leaves marks
 * on every scene of that market: the kinds are WoDX Chronicle's shared looks (water, flood, fire, smoke, rubble, taint,
 * plague, storm, rain, fog, snow, quake, calm). Each mark is a spot ({x, y, radius} on the scene) or the whole scene,
 * and lasts a while of game time. The spots are seeded by the town, the event and the scene, so the same turn draws the
 * same marks. How long each lasts and how many there are are house rules.
 */

const HOUR = 3600, DAY = 24 * HOUR, WEEK = 7 * DAY;

/**
 * By town event kind: the marks it leaves. spots: how many; r: radius in grid squares; band: where on the scene the
 * spots fall ("low" is the lowest third, where water gathers; "any" anywhere); last: seconds of game time.
 */
export const TOWN_LOOKS = {
  fire: [{kind: "fire", spots: 3, r: 2.5, band: "any", last: DAY}, {kind: "smoke", scene: true, last: DAY}, {kind: "rubble", spots: 3, r: 1.5, band: "any", last: 4 * WEEK, note: "burnt out"}],
  flood: [{kind: "flood", spots: 3, r: 4, band: "low", last: 3 * DAY}, {kind: "rain", scene: true, last: DAY}, {kind: "rubble", spots: 2, r: 1, band: "low", last: 2 * WEEK, note: "wreckage left by the water"}],
  storm: [{kind: "storm", scene: true, last: DAY}, {kind: "rubble", spots: 2, r: 1, band: "any", last: WEEK, note: "torn roofs and fallen branches"}],
  quake: [{kind: "quake", scene: true, last: HOUR}, {kind: "rubble", spots: 4, r: 2, band: "any", last: 4 * WEEK, note: "fallen walls"}],
  riot: [{kind: "fire", spots: 1, r: 1, band: "any", last: 12 * HOUR}, {kind: "smoke", scene: true, last: 12 * HOUR}, {kind: "rubble", spots: 3, r: 1, band: "any", last: WEEK, note: "barricades and smashed shutters"}],
  rising: [{kind: "fire", spots: 2, r: 1.5, band: "any", last: DAY}, {kind: "smoke", scene: true, last: 2 * DAY}, {kind: "rubble", spots: 4, r: 1.5, band: "any", last: 2 * WEEK, note: "barricades across the streets"}],
  sack: [{kind: "fire", spots: 4, r: 3, band: "any", last: 2 * DAY}, {kind: "smoke", scene: true, last: 3 * DAY}, {kind: "rubble", spots: 5, r: 2, band: "any", last: 8 * WEEK, note: "burnt and broken houses"}],
  blight: [{kind: "taint", spots: 2, r: 3, band: "low", last: 4 * WEEK, note: "withered gardens and fields"}],
  dread: [{kind: "fog", scene: true, last: 2 * DAY}],
  calm: [{kind: "calm", scene: true, last: DAY}]
};
/** The kinds a town event can name that leave marks. */
export const kindsWithLooks = () => Object.keys(TOWN_LOOKS);

/** A seeded number stream (mulberry32 over a string hash). */
export function seeded(seed) {
  let h = 2166136261;
  for ( const c of String(seed) ) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  let a = (h >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The marks for one event on one scene. rect: the scene's playable rectangle {x, y, width, height}; grid: pixels a
 * square; now: world time; seed: anything that names the event (town, kind, turn). Returns
 * [{kind, at: {x, y, radius} | null, until: {worldTime}, note}].
 */
export function looksFor(kind, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, now = 0, seed = ""} = {}) {
  const plan = TOWN_LOOKS[kind];
  if ( !plan ) return [];
  const rand = seeded(`${seed}:${kind}`);
  const out = [];
  for ( const p of plan ) {
    const until = {worldTime: Math.round(Number(now) || 0) + p.last};
    if ( p.scene ) { out.push({kind: p.kind, at: null, until, note: p.note ?? ""}); continue; }
    const radius = Math.round(p.r * grid);
    const pad = Math.min(radius, rect.width / 4, rect.height / 4);
    const top = p.band === "low" ? rect.y + rect.height * 2 / 3 : rect.y + pad;
    const h = p.band === "low" ? rect.height / 3 - pad : rect.height - 2 * pad;
    for ( let i = 0; i < p.spots; i++ ) {
      out.push({kind: p.kind, at: {x: Math.round(rect.x + pad + rand() * Math.max(1, rect.width - 2 * pad)), y: Math.round(top + rand() * Math.max(1, h)), radius}, until, note: p.note ?? ""});
    }
  }
  return out;
}

/**
 * Sickness in a town (B4622, desk v3), by the outbreak's phase: crosses painted on doors (spots of the shared "plague"
 * kind, drawn as a cross where the looks layer is not there), the cart for the dead among the streets at the height,
 * and a low fog over the town at its worst. The marks follow the outbreak and go when it is over. House rules.
 */
export const SICK_LOOKS = {
  arriving: [{kind: "plague", spots: 1, r: 0.4, band: "any", note: "a cross painted on a door", mark: "cross"}],
  rising: [{kind: "plague", spots: 3, r: 0.4, band: "any", note: "crosses painted on doors", mark: "cross"}],
  height: [{kind: "plague", spots: 6, r: 0.4, band: "any", note: "crosses painted on doors", mark: "cross"},
    {kind: "plague", spots: 1, r: 0.6, band: "any", note: "the cart for the dead", mark: "cart"}, {kind: "fog", scene: true, note: "a low fog over the sick town"}],
  waning: [{kind: "plague", spots: 3, r: 0.4, band: "any", note: "crosses painted on doors", mark: "cross"}],
  over: []
};

/** The marks of a town's sickness on one scene, by phase (no end time: they follow the outbreak). */
export function sickLooksFor(phase, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, seed = ""} = {}) {
  const plan = SICK_LOOKS[phase] ?? [];
  const rand = seeded(`${seed}:sick`);
  const out = [];
  // the spots of a later phase start with those of an earlier one, so the same doors keep their crosses
  for ( const p of plan ) {
    if ( p.scene ) { out.push({kind: p.kind, at: null, until: null, note: p.note}); continue; }
    for ( const at of spotsIn(rand, rect, grid, p) ) out.push({kind: p.kind, at, until: null, note: p.note, mark: p.mark});
  }
  return out;
}

/** n seeded spots of radius r squares in a band of the scene. */
export function spotsIn(rand, rect, grid, {spots = 1, r = 1, band = "any"} = {}) {
  const radius = Math.round(r * grid);
  const pad = Math.min(radius, rect.width / 4, rect.height / 4);
  const top = band === "low" ? rect.y + rect.height * 2 / 3 : rect.y + pad;
  const h = band === "low" ? rect.height / 3 - pad : rect.height - 2 * pad;
  const out = [];
  for ( let i = 0; i < spots; i++ ) {
    if ( band === "edge" ) {
      // a strip one radius deep round the edge of the scene: pick a side, then a place along it
      const side = Math.floor(rand() * 4), t = rand();
      const along = (len, start) => Math.round(start + pad + t * Math.max(1, len - 2 * pad));
      const x = side === 0 || side === 2 ? along(rect.width, rect.x) : side === 1 ? rect.x + rect.width - pad : rect.x + pad;
      const y = side === 1 || side === 3 ? along(rect.height, rect.y) : side === 0 ? rect.y + pad : rect.y + rect.height - pad;
      out.push({x: Math.round(x), y: Math.round(y), radius});
      continue;
    }
    out.push({x: Math.round(rect.x + pad + rand() * Math.max(1, rect.width - 2 * pad)), y: Math.round(top + rand() * Math.max(1, h)), radius});
  }
  return out;
}

/**
 * Hunters closing in (B4623, desk v4), by the region's stage: notices go up on the town's scenes once someone is
 * Watching (naming the culprit the hunters know best, when they know one), the watch carries lanterns through the
 * streets when they are Hunting, and a Purge brings more of both. A raid or a purge the Storyteller approves brings a
 * torch-carrying crowd for a night. House rules.
 */
export const HUNTER_LOOKS = {
  quiet: [], rumours: [],
  watching: [{kind: "calm", spots: 2, r: 0.4, band: "any", note: "a notice on a wall", mark: "notice"}],
  investigating: [{kind: "calm", spots: 4, r: 0.4, band: "any", note: "notices on the walls", mark: "notice"}],
  hunting: [{kind: "calm", spots: 4, r: 0.4, band: "any", note: "notices on the walls", mark: "notice"}, {kind: "fire", spots: 4, r: 0.3, band: "any", note: "the watch's lanterns", mark: "lantern"}],
  purge: [{kind: "calm", spots: 7, r: 0.4, band: "any", note: "notices on every wall", mark: "notice"}, {kind: "fire", spots: 7, r: 0.3, band: "any", note: "the watch's lanterns", mark: "lantern"}]
};
/** The night-long crowd with torches a raid or purge brings to the town. */
export const TORCH_CROWD = {kind: "fire", spots: 6, r: 0.3, spread: 2.5, last: 12 * HOUR, note: "a crowd with torches", mark: "torch"};

/** The notice marks and lanterns of a region's stage on one scene. sought: the name a notice shows, if any. */
export function hunterLooksFor(stage, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, seed = "", sought = ""} = {}) {
  const rand = seeded(`${seed}:hunters`);
  const out = [];
  for ( const p of HUNTER_LOOKS[stage] ?? [] ) {
    for ( const at of spotsIn(rand, rect, grid, p) ) out.push({kind: p.kind, at, until: null, note: p.mark === "notice" && sought ? `${p.note}: ${sought} is sought` : p.note, mark: p.mark, text: p.mark === "notice" ? (sought ? `Sought: ${sought}` : "Notice") : undefined});
  }
  return out;
}

/** A crowd with torches gathered round one spot of the scene, for a night. */
export function torchCrowd({rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, now = 0, seed = ""} = {}) {
  const rand = seeded(`${seed}:torches`), c = TORCH_CROWD;
  const [mid] = spotsIn(rand, rect, grid, {spots: 1, r: c.spread + 1});
  const out = [];
  for ( let i = 0; i < c.spots; i++ ) {
    const a = rand() * Math.PI * 2, d = rand() * c.spread * grid;
    out.push({kind: c.kind, at: {x: Math.round(mid.x + Math.cos(a) * d), y: Math.round(mid.y + Math.sin(a) * d), radius: Math.round(c.r * grid)}, until: {worldTime: Math.round(Number(now) || 0) + c.last}, note: c.note, mark: c.mark});
  }
  return out;
}

/**
 * A siege at a town (B4624, desk v6): the besiegers' camp along the edges of the town's scenes, with the smoke of their
 * fires, while the siege lasts; a breach puts fallen stone in the wall. A sack when the walls are stormed is a town
 * event and draws as one (B4620). House rules.
 */
export const SIEGE_LOOKS = {
  camp: {kind: "calm", spots: 6, r: 0.5, band: "edge", note: "the besiegers' tents", mark: "tent"},
  fires: {kind: "smoke", spots: 3, r: 1.2, band: "edge", note: "smoke from the camp fires"},
  breach: {kind: "rubble", spots: 2, r: 1.2, band: "edge", note: "a breach in the wall"}
};

/** The marks of a siege on one scene: the camp and its smoke, and the breach once there is one. */
export function siegeLooksFor({breached = false} = {}, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, seed = ""} = {}) {
  const rand = seeded(`${seed}:siege`);
  const out = [];
  for ( const [k, p] of Object.entries(SIEGE_LOOKS) ) {
    if ( k === "breach" && !breached ) continue;
    for ( const at of spotsIn(rand, rect, grid, p) ) out.push({kind: p.kind, at, until: null, note: p.note, mark: p.mark});
  }
  return out;
}

/**
 * A shut shop (B4625, desk v7): boards nailed over the shop's tile on the town's scene, for as long as the shop is
 * shut. at: the tile's centre and its smaller side in pixels.
 */
export const shutLook = ({x, y, size = 100}, who = "") => ({kind: "rubble", at: {x: Math.round(x), y: Math.round(y), radius: Math.round(size * 0.6)}, until: null,
  note: `boarded up${who ? `: ${who}'s shop is shut` : ""}`, mark: "boards"});

/**
 * A haven set on fire by a rival (B4626, desk v8): the fire itself is a WoDX Actions fire area (it burns whoever
 * stands in it or walks in, two dice of lethal), with smoke over the scene while it burns and scorch marks round the
 * spot for weeks after. House rules.
 */
export const HAVEN_FIRE = {feet: 10, dice: 2, burns: 2 * HOUR, smoke: 6 * HOUR, scorch: {spots: 3, r: 1, spread: 1.5, last: 8 * WEEK}};

/** Where a rival's fire starts on a haven's scene, and the marks it leaves. Returns {at, looks}. */
export function havenFireFor({rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, now = 0, seed = ""} = {}) {
  const rand = seeded(`${seed}:havenfire`), f = HAVEN_FIRE;
  // the middle half of the scene, where the house stands
  const inner = {x: rect.x + rect.width / 4, y: rect.y + rect.height / 4, width: rect.width / 2, height: rect.height / 2};
  const [at] = spotsIn(rand, inner, grid, {spots: 1, r: 0.5});
  const t = Math.round(Number(now) || 0);
  const looks = [{kind: "smoke", at: null, until: {worldTime: t + f.smoke}, note: "smoke from the burning house"}];
  for ( let i = 0; i < f.scorch.spots; i++ ) {
    const a = rand() * Math.PI * 2, d = rand() * f.scorch.spread * grid;
    looks.push({kind: "rubble", at: {x: Math.round(at.x + Math.cos(a) * d), y: Math.round(at.y + Math.sin(a) * d), radius: Math.round(f.scorch.r * grid)},
      until: {worldTime: t + f.scorch.last}, note: "scorch marks"});
  }
  return {at: {x: at.x, y: at.y}, looks};
}

/** The fire area a rival's fire sets (WoDX Actions placeArea's item: a world "blaze" that burns for two hours). */
export const havenFireArea = (who = "a rival") => ({key: "world", who: "self", area: true, out: {key: "world", kind: "world", label: "Fire", world: "blaze", scope: "ground", scale: 1,
  area: HAVEN_FIRE.feet, dice: HAVEN_FIRE.dice, text: `fire set by ${who}: two dice of lethal damage to whoever stands in it or walks in`, timed: {kind: "time", seconds: HAVEN_FIRE.burns}}});

/**
 * Great signs and dated events in the sky (B4628, desk v10). An approved sign in the world shows on the scenes for a
 * night: crows on the roofs, a red glow in the sky, a cold mist, rats in the street, an owl by day. A great dated event
 * of the chronicle darkens the sky over every town and the scene being played: the Black Death an ash-grey pall, a
 * Great Maelstrom a storm that will not break, the Avatar Storm a storm of strange colour. House rules.
 */
export const OMEN_LOOKS = [
  {re: /\bcrows?\b/i, looks: [{kind: "calm", spots: 8, r: 0.3, band: "any", note: "crows on the roofs", mark: "bird", color: "#1b1b1b"}]},
  {re: /\bswallows?\b/i, looks: [{kind: "calm", spots: 6, r: 0.25, band: "any", note: "swallows wheeling away", mark: "bird", color: "#3b3b46"}]},
  {re: /red glow/i, looks: [{kind: "fire", scene: true, note: "a red glow in the sky", alpha: 0.12}]},
  {re: /cold wind/i, looks: [{kind: "fog", scene: true, note: "a cold mist on the wind"}]},
  {re: /\brats?\b/i, looks: [{kind: "plague", spots: 6, r: 0.25, band: "any", note: "rats in the street by daylight", mark: "rat", color: "#5a4632"}]},
  {re: /\bowl\b/i, looks: [{kind: "calm", spots: 1, r: 0.35, band: "any", note: "an owl on a roof by day", mark: "owl", color: "#d9cfae"}]},
  {re: /\bfrogs?\b/i, looks: [{kind: "water", spots: 3, r: 1, band: "low", note: "pools where the frogs sing"}]},
  {re: /\bdogs? howl/i, looks: [{kind: "storm", scene: true, note: "a night that feels darker than it is", alpha: 0.12}]}
];
export const OMEN_LASTS = 12 * HOUR;

/** The marks of an approved sign on one scene (none when the sign cannot be seen, as milk souring). */
export function omenLooksFor(text, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, now = 0, seed = ""} = {}) {
  const hit = OMEN_LOOKS.find(o => o.re.test(String(text ?? "")));
  if ( !hit ) return [];
  const rand = seeded(`${seed}:omen`), until = {worldTime: Math.round(Number(now) || 0) + OMEN_LASTS};
  const out = [];
  for ( const p of hit.looks ) {
    if ( p.scene ) { out.push({kind: p.kind, at: null, until, note: p.note, alpha: p.alpha}); continue; }
    for ( const at of spotsIn(rand, rect, grid, p) ) out.push({kind: p.kind, at, until, note: p.note, mark: p.mark, color: p.color});
  }
  return out;
}

/** Great dated events by id (WoDX Chronicle's events): the sky they bring, and for how long. */
export const EVENT_LOOKS = [
  {re: /^black-death$/, kind: "plague", alpha: 0.2, color: "#6f6a5a", last: 7 * DAY, note: "an ash-grey pall over the land"},
  {re: /great-maelstrom$/, kind: "storm", alpha: 0.22, color: "#1d2430", last: 3 * DAY, note: "a storm that will not break, and the dead restless in it"},
  {re: /^avatar-storm$/, kind: "storm", alpha: 0.18, color: "#3b2a55", last: 3 * DAY, note: "a storm of strange colour in the sky"}
];
export function eventLookFor(id, {now = 0} = {}) {
  const e = EVENT_LOOKS.find(x => x.re.test(String(id ?? "")));
  return e ? {kind: e.kind, at: null, until: {worldTime: Math.round(Number(now) || 0) + e.last}, note: e.note, color: e.color, alpha: e.alpha} : null;
}

/**
 * How well a town does and how angry it is, on its scenes (B4629, desk v11). A rich town (prosperity 4 or 5) has lit
 * windows late into the night; a poor one (0 or 1) has beggars at the corners; an angry one (unrest 3 or more) has
 * words daubed on its walls, more as it boils. Getting by and grumbling show nothing. House rules.
 */
export const SLOGANS = ["Bread!", "Justice!", "Enough!", "No more taxes!", "Our town, our say!", "Shame on them!"];
export function prosperityLooksFor({prosperity = 3, unrest = 1} = {}, {rect = {x: 0, y: 0, width: 2000, height: 1500}, grid = 100, seed = ""} = {}) {
  const rand = seeded(`${seed}:prosper`);
  const p = Math.round(Number(prosperity) || 0), u = Math.round(Number(unrest) || 0);
  const out = [];
  const add = (spec, extra = {}) => { for ( const at of spotsIn(rand, rect, grid, spec) ) out.push({kind: spec.kind, at, until: null, note: spec.note, mark: spec.mark, color: spec.color, ...extra}); };
  if ( p >= 4 ) add({kind: "calm", spots: p === 5 ? 10 : 6, r: 0.25, note: "lit windows late into the night", mark: "window", color: "#f5d27a"});
  if ( p <= 1 ) add({kind: "calm", spots: p === 0 ? 6 : 3, r: 0.3, note: "beggars at the corners", mark: "beggar", color: "#b8ad96"});
  if ( u >= 3 ) {
    const n = u >= 5 ? 6 : u === 4 ? 4 : 2;
    for ( let i = 0; i < n; i++ ) {
      const [at] = spotsIn(rand, rect, grid, {spots: 1, r: 0.6});
      out.push({kind: "calm", at, until: null, note: "words daubed on a wall", text: SLOGANS[Math.floor(rand() * SLOGANS.length)], color: "#c9302c"});
    }
  }
  return out;
}

/** What a set of marks stands for: the same signature, nothing to draw again. */
export const signatureOf = looks => looks.map(l => `${l.kind}${l.at ? `@${l.at.x},${l.at.y},${l.at.radius}` : ""}${l.mark ?? ""}${l.text ?? ""}`).join(";");

/** Text drawn for a spot where the looks layer is not there (a mark with no text is a plain patch). */
export const MARK_TEXT = {cross: "\u271A", cart: "\u26B0", notice: "\u25A4", tent: "\u25B2", boards: "\u2592", bird: "\u2228", rat: "\u2022", owl: "\u25C9", window: "\u25A0", beggar: "\u25CF", lantern: "\u2739", torch: "\u2739"};
/** The colour of a mark's text, where it is not the plain parchment. */
export const MARK_COLOR = {boards: "#8a6a44", lantern: "#f2c46b", torch: "#ff8a3d"};

/** The colour a fallback drawing takes for each look kind (when WoDX Chronicle's looks layer is not there). */
export const FALLBACK = {
  water: {color: "#2f5f8f", alpha: 0.45}, flood: {color: "#2f5f8f", alpha: 0.5}, fire: {color: "#d2551e", alpha: 0.45},
  smoke: {color: "#3a3a3a", alpha: 0.12}, rubble: {color: "#5b5148", alpha: 0.55}, taint: {color: "#4d5a2a", alpha: 0.4},
  plague: {color: "#6b6b3a", alpha: 0.15}, storm: {color: "#20262e", alpha: 0.15}, rain: {color: "#20262e", alpha: 0.08},
  fog: {color: "#8a8f96", alpha: 0.2}, snow: {color: "#e8eef4", alpha: 0.15}, quake: {color: "#5b5148", alpha: 0.1}, calm: {color: "#c9b27a", alpha: 0.06}
};

/** Is a look over at this world time? */
export const isOver = (look, now) => Number.isFinite(Number(look?.until?.worldTime)) && Number(now) >= Number(look.until.worldTime);
