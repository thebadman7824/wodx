/**
 * WoDX Chronicle 0.14.0: "Only when" and "Then" lists (0.15.0: attitude and persuaded tests). Pure rules, no Foundry calls, so the harness can test them.
 *
 * One small language for every map piece that has to ask who, when and in what state: a trigger region, a door, a
 * clue, a trap, a dated event. The Storyteller writes one test per line; every line must pass. A line that starts
 * with "not" passes when the test fails. "any of:" or "2 of:" opens a group, and the lines under it that start with
 * "-" are the group's choices. "#" starts a note. In a one-line box, ";" ends a line and a group can be written
 * "any of: frenzy / rotschreck".
 *
 *   year 1200-1492
 *   night
 *   kind kindred
 *   not clan Tremere
 *   blood <= 3
 *   2 of:
 *   - wounds >= hurt
 *   - frenzy
 *   - carries silver
 *
 * A "Then" list is one outcome per line: tell, whisper, alarm, event, cue, ledger, standing. What each does is done by
 * when.mjs through the module that owns it; a module that is off is skipped with a note to the Storyteller.
 *
 * The context a check reads (built by when.mjs):
 *   {year, era, hour, night, moon, feast, fast, season, branch,
 *    actor: {pc, name, kind, fields: {clan, tribe, ...}, factions: [], items: [], codex: [], conditions: [], traits: {...}}}
 * Text is compared without case. A test that needs a character fails when there is none.
 */

/** Health-track levels by name (the order of V20's health chart), for "wounds >= mauled". 0 is unhurt. */
export const WOUND_LEVELS = {unhurt: 0, bruised: 1, hurt: 2, injured: 3, wounded: 4, mauled: 5, crippled: 6, incapacitated: 7};

/** Pools and ratings a test can compare. The key is what the Storyteller writes; aliases point to it. */
export const TRAITS = {
  blood: "Blood pool", willpower: "Willpower (current)", rage: "Rage", gnosis: "Gnosis", glamour: "Glamour", banality: "Banality",
  quintessence: "Quintessence", paradox: "Paradox", humanity: "Humanity or Path rating", faith: "True Faith", wounds: "Health levels lost",
  generation: "Generation", arete: "Arete"
};
const TRAIT_ALIAS = {bloodpool: "blood", vitae: "blood", wp: "willpower", path: "humanity", road: "humanity", wound: "wounds", gen: "generation", enlightenment: "arete"};

/** A faction's regard for a character, by word (WoDX NPC's steps). */
export const STANDING_WORDS = {hunted: -3, hostile: -2, distrusted: -1, unknown: 0, tolerated: 1, welcome: 2, honoured: 3, honored: 3};

/** What a character can be, as WoDX Combat names it. */
export const KINDS = ["kindred", "ghoul", "mortal", "lupine", "mage", "fae", "wraith", "hunter", "demon", "mummy", "spirit", "beast", "exalted"];
const KIND_ALIAS = {vampire: "kindred", cainite: "kindred", werewolf: "lupine", garou: "lupine", shifter: "lupine", changeling: "fae", kithain: "fae",
  ghost: "wraith", fallen: "demon", revenant: "ghoul", kuei: "exalted", "kuei-jin": "exalted", creature: "beast", animal: "beast", human: "mortal"};

/** Fields on the character the Storyteller can name: "clan Tremere, Ventrue". */
export const FIELDS = {clan: "Clan", tribe: "Tribe", breed: "Breed", auspice: "Auspice", tradition: "Tradition or faction of a mage", kith: "Kith",
  court: "Court", house: "House", seeming: "Seeming", creed: "Creed", legion: "Legion", guild: "Guild", sect: "Sect", nature: "Nature", demeanor: "Demeanor"};
const FIELD_ALIAS = {affiliation: "tradition", convention: "tradition", faction: null};

/** States with no number: "frenzy", "not obfuscated". Each reads a condition id on the character. */
export const STATES = {frenzy: "In frenzy", rotschreck: "In Rötschreck", obfuscated: "Hidden by Obfuscate", wounded: "Has lost a health level"};

/** Words for each test, for the help text and the checker. */
export const TESTS = {
  era: "era <id>[, <id>]: the era in force", year: "year 1200-1492, year >= 1890: the in-world year", before: "before 1890", from: "from 1890",
  night: "night: between sunset and sunrise", day: "day", hour: "hour 22-4: the hour of the clock (wraps past midnight)",
  moon: "moon full: the moon's phase", feast: "feast, feast Easter: a church feast today", fast: "fast: a fast day today", season: "season Lent",
  branch: "branch <id>: the Future Darkness branch in force",
  pc: "pc: a player's character", npc: "npc: anyone else", kind: `kind kindred, lupine: ${KINDS.join(", ")}`, named: "named Anna: the character's name contains this",
  faction: "faction <name>: belongs to a WoDX NPC faction", standing: "standing <faction> >= welcome: how that faction regards the character", carries: "carries silver: holds an item whose name contains this",
  knows: "knows <page>: has a codex page whose name contains this", condition: "condition <id>: has a WoDX condition",
  attitude: "attitude >= welcome: how the NPC being dealt with regards the character (WoDX NPC)",
  merit: "merit <name>: has this merit (WoDX trait table names and aliases)", flaw: "flaw <name>: has this flaw",
  background: "background <name> [>= 2]: has this background, or at this rating", power: "power <name>: has a power whose name contains this",
  persuaded: "persuaded [by <name>]: won a social roll against that NPC lately (also charmed, intimidated, bribed, fooled); bare: by the NPC being dealt with"
};

/** What a won social roll leaves on the character for a while (WoDX Actions' "With this person"). */
export const SWAYS = ["persuaded", "charmed", "intimidated", "bribed", "fooled"];

/** A "Then" outcome. */
export const OUTCOMES = {
  tell: "tell <text>: a whisper to the Storyteller",
  whisper: "whisper <text>: a whisper to the character's players (your own words)",
  alarm: "alarm [cause]: raise the alarm on this scene (WoDX NPC)",
  event: "event [label]: pass a map event on to beats and the log",
  cue: "cue <id>: play a WoDX Atmosphere cue (dawn, dusk, notice, birds, cock)",
  ledger: "ledger <oath|debt|boon|consequence>: <text>: add a Ledger entry (WoDX Storyteller)",
  standing: "standing <faction> -1 (or +1, or to welcome): how that faction regards the character (WoDX NPC)"
};

const OPS = {"<=": (a, b) => a <= b, ">=": (a, b) => a >= b, "<": (a, b) => a < b, ">": (a, b) => a > b, "=": (a, b) => a === b, "==": (a, b) => a === b, "!=": (a, b) => a !== b};
const low = v => String(v ?? "").trim().toLowerCase();
const list = s => String(s ?? "").split(/\s*[,|]\s*|\s+or\s+/i).map(low).filter(Boolean);
const unquote = s => String(s ?? "").trim().replace(/^["'](.*)["']$/, "$1");

/** One test line to a test object, or {problem}. */
export function parseTest(line, {eras = null} = {}) {
  let text = String(line ?? "").trim(), neg = false;
  const m0 = /^not\s+(.*)$/i.exec(text);
  if ( m0 ) { neg = true; text = m0[1].trim(); }
  const src = String(line ?? "").trim();
  const ok = t => ({...t, neg, src});
  const bad = why => ({problem: `"${src}": ${why}`});
  const [head, ...rest] = text.split(/\s+/);
  const word = low(head), arg = rest.join(" ").trim();
  if ( !word ) return bad("empty");

  if ( word === "era" ) {
    const ids = list(arg);
    if ( !ids.length ) return bad("which era?");
    const unknown = eras ? ids.filter(i => !eras.includes(i)) : [];
    if ( unknown.length ) return bad(`no era called ${unknown.join(", ")}`);
    return ok({t: "era", ids});
  }
  if ( word === "year" ) {
    const r = /^(-?\d+)\s*(?:-|to|–)\s*(-?\d+)$/.exec(arg);
    if ( r ) return ok({t: "year", from: Number(r[1]), to: Number(r[2])});
    const c = /^(<=|>=|<|>|==|=|!=)\s*(-?\d+)$/.exec(arg);
    if ( c ) return ok({t: "num", key: "year", op: c[1], n: Number(c[2])});
    return bad("write year 1200-1492 or year >= 1890");
  }
  if ( word === "before" || word === "from" || word === "after" ) {
    const n = Number(arg);
    if ( !Number.isFinite(n) || !arg ) return bad("needs a year");
    return ok({t: "num", key: "year", op: word === "before" ? "<" : word === "from" ? ">=" : ">", n});
  }
  if ( word === "night" || word === "day" ) return arg ? bad("takes nothing after it") : ok({t: "night", want: word === "night"});
  if ( word === "hour" ) {
    const r = /^(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})$/.exec(arg);
    if ( !r || Number(r[1]) > 24 || Number(r[2]) > 24 ) return bad("write hour 22-4");
    return ok({t: "hour", from: Number(r[1]) % 24, to: Number(r[2]) % 24});
  }
  if ( word === "moon" || word === "season" || word === "branch" ) return arg ? ok({t: "text", key: word, want: low(unquote(arg))}) : bad(`which ${word}?`);
  if ( word === "feast" || word === "fast" ) return ok({t: "text", key: word, want: low(unquote(arg)), any: !arg});
  if ( word === "pc" || word === "npc" ) return arg ? bad("takes nothing after it") : ok({t: "pc", want: word === "pc"});
  if ( word === "kind" ) {
    const ids = list(arg).map(k => KIND_ALIAS[k] ?? k);
    const unknown = ids.filter(k => !KINDS.includes(k));
    if ( !ids.length ) return bad("which kind?");
    if ( unknown.length ) return bad(`no kind called ${unknown.join(", ")} (${KINDS.join(", ")})`);
    return ok({t: "kind", ids});
  }
  if ( word === "named" || word === "carries" || word === "knows" ) {
    const want = low(unquote(arg));
    return want ? ok({t: word, want}) : bad(`${word} what?`);
  }
  if ( word === "merit" || word === "flaw" || word === "background" ) {
    const c = /^(.+?)\s*(<=|>=|<|>|==|=|!=)\s*(\d+)$/.exec(arg);
    const name = low(unquote(c ? c[1] : arg));
    if ( !name ) return bad(`which ${word}?`);
    if ( c && word !== "background" ) return bad(`a ${word} has no rating to compare; write ${word} ${c[1]}`);
    return ok({t: "feat", kind: word, want: name, op: c?.[2] ?? null, n: c ? Number(c[3]) : null});
  }
  if ( word === "power" ) {
    const want = low(unquote(arg));
    return want ? ok({t: "power", want}) : bad("which power?");
  }
  if ( word === "faction" ) return arg ? ok({t: "faction", ids: list(arg.replace(/["']/g, ""))}) : bad("which faction?");
  if ( word === "standing" ) {
    const c = /^(.+?)\s*(<=|>=|<|>|==|=|!=)\s*(\S+)$/.exec(arg);
    if ( !c ) return bad("write standing <faction> >= 1 (or a word: hunted, hostile, distrusted, unknown, tolerated, welcome, honoured)");
    const n = STANDING_WORDS[low(c[3])] ?? Number(c[3]);
    if ( !Number.isFinite(n) ) return bad(`${c[3]} is not a step`);
    return ok({t: "standing", faction: low(unquote(c[1])), op: c[2], n});
  }
  if ( word === "condition" ) return arg ? ok({t: "state", id: low(arg)}) : bad("which condition?");
  if ( word === "attitude" ) {
    const c = /^(<=|>=|<|>|==|=|!=)\s*(\S+)$/.exec(arg);
    if ( !c ) return bad("write attitude >= welcome (hunted, hostile, distrusted, unknown, tolerated, welcome, honoured, or -3 to 3)");
    const n = STANDING_WORDS[low(c[2])] ?? Number(c[2]);
    if ( !Number.isFinite(n) ) return bad(`${c[2]} is not a step`);
    return ok({t: "attitude", op: c[1], n});
  }
  if ( SWAYS.includes(word) ) {
    const by = /^by\s+(.+)$/i.exec(arg);
    if ( arg && !by ) return bad(`write ${word}, or ${word} by <name>`);
    return ok({t: "sway", kind: word, by: by ? low(unquote(by[1])) : ""});
  }
  const fieldKey = word in FIELD_ALIAS ? FIELD_ALIAS[word] : word;
  if ( fieldKey && FIELDS[fieldKey] ) {
    const ids = list(arg.replace(/["']/g, ""));
    return ids.length ? ok({t: "field", key: fieldKey, ids}) : bad(`which ${word}?`);
  }
  if ( STATES[word] ) return arg ? bad("takes nothing after it") : (word === "wounded" ? ok({t: "num", key: "wounds", op: ">=", n: 1, trait: true}) : ok({t: "state", id: word}));
  const traitKey = TRAIT_ALIAS[word] ?? word;
  if ( TRAITS[traitKey] ) {
    const c = /^(<=|>=|<|>|==|=|!=)\s*([a-z]+|-?\d+)$/i.exec(arg);
    if ( !c ) return bad(`write ${word} <= 3`);
    let n = Number(c[2]);
    if ( !Number.isFinite(n) ) {
      if ( traitKey !== "wounds" || !(low(c[2]) in WOUND_LEVELS) ) return bad(`${c[2]} is not a number`);
      n = WOUND_LEVELS[low(c[2])];
    }
    return ok({t: "num", key: traitKey, op: c[1], n, trait: true});
  }
  return bad("not a test WoDX knows");
}

/**
 * A whole "Only when" text to {groups, problems}. Each group is {need, of: [tests]}; a single line is a group of one.
 * opts.eras: the known era ids, to catch a misspelt one.
 */
export function parseWhen(text, opts = {}) {
  const groups = [], problems = [];
  let open = null;
  for ( const raw of String(text ?? "").split(/\r?\n|;/) ) {
    const line = raw.replace(/#.*$/, "").trim();
    if ( !line ) continue;
    const g = /^(any|all|\d+)\s+of\s*:?\s*(.*)$/i.exec(line);
    if ( g ) {
      open = {need: low(g[1]) === "any" ? 1 : low(g[1]) === "all" ? Infinity : Math.max(1, Number(g[1])), of: [], src: line};
      groups.push(open);
      // The one-line form for a single-line box: "any of: frenzy / rotschreck"
      for ( const part of g[2].split(/\s+\/\s+/).map(x => x.trim()).filter(Boolean) ) {
        const t = parseTest(part, opts);
        if ( t.problem ) problems.push(t.problem); else open.of.push(t);
      }
      if ( g[2].trim() ) open = null;
      continue;
    }
    const item = /^[-*•]\s*(.+)$/.exec(line);
    const t = parseTest(item ? item[1] : line, opts);
    if ( t.problem ) { problems.push(t.problem); continue; }
    if ( item && open ) open.of.push(t);
    else { open = null; groups.push({need: 1, of: [t], src: t.src}); }
  }
  for ( const g of groups ) {
    if ( !g.of.length ) problems.push(`"${g.src}": the group has no lines under it (start each with -)`);
    if ( g.need !== Infinity && g.need > g.of.length && g.of.length ) problems.push(`"${g.src}": asks for ${g.need} but has only ${g.of.length}`);
  }
  return {groups: groups.filter(g => g.of.length), problems};
}

/** Does one test pass? Returns true, false, or null when the context lacks what it reads (counts as a fail). */
export function testOne(t, ctx = {}) {
  const a = ctx.actor ?? null;
  const needActor = ["pc", "kind", "named", "carries", "knows", "faction", "standing", "field", "state", "attitude", "sway", "feat", "power"].includes(t.t) || t.trait;
  if ( needActor && !a ) return null;
  let r;
  switch ( t.t ) {
    case "era": r = !!ctx.era && t.ids.includes(low(ctx.era)); break;
    case "year": r = Number.isFinite(ctx.year) && ctx.year >= Math.min(t.from, t.to) && ctx.year <= Math.max(t.from, t.to); break;
    case "num": {
      const v = t.trait ? a.traits?.[t.key] : ctx[t.key];
      if ( v === undefined || v === null || !Number.isFinite(Number(v)) ) return null;
      r = OPS[t.op](Number(v), t.n); break;
    }
    case "night": if ( typeof ctx.night !== "boolean" ) return null; r = ctx.night === t.want; break;
    case "hour": {
      if ( !Number.isFinite(ctx.hour) ) return null;
      const h = ctx.hour;
      r = t.from <= t.to ? h >= t.from && h < (t.to === t.from ? t.to + 1 : t.to) : h >= t.from || h < t.to; break;
    }
    case "text": {
      const v = low(ctx[t.key]);
      r = t.any ? !!v : !!v && v.includes(t.want); break;
    }
    case "pc": r = !!a.pc === t.want; break;
    case "kind": r = t.ids.includes(low(a.kind)); break;
    case "named": r = low(a.name).includes(t.want); break;
    case "carries": r = (a.items ?? []).some(n => low(n).includes(t.want)); break;
    case "knows": r = (a.codex ?? []).some(n => low(n).includes(t.want)); break;
    case "feat": {
      const key = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const hit = (a.feats ?? []).find(f => f.kind === t.kind && (key(f.name) === key(t.want) || key(f.key) === key(t.want) || (f.aliases ?? []).some(x => key(x) === key(t.want))));
      r = !!hit && (t.op === null || OPS[t.op](Number(hit.value) || 0, t.n));
      break;
    }
    case "power": r = (a.powers ?? []).some(n => low(n).includes(t.want)); break;
    case "faction": r = (a.factions ?? []).some(f => t.ids.includes(low(f))); break;
    case "standing": {
      const st = a.standing ?? {};
      const bare = t.faction.replace(/^the\s+/, "");
      const key = Object.keys(st).find(k => k === t.faction) ?? Object.keys(st).find(k => k.includes(t.faction)) ?? Object.keys(st).find(k => k.includes(bare));
      if ( key === undefined ) return null;
      r = OPS[t.op](Number(st[key]) || 0, t.n); break;
    }
    case "field": { const v = low(a.fields?.[t.key]); r = !!v && t.ids.some(i => v === i || v.includes(i)); break; }
    case "state": r = (a.conditions ?? []).map(low).includes(t.id); break;
    case "attitude": {
      const v = ctx.npc?.attitude;
      if ( v === undefined || v === null || !Number.isFinite(Number(v)) ) return null;
      r = OPS[t.op](Number(v), t.n); break;
    }
    case "sway": {
      const now = Number.isFinite(ctx.time) ? ctx.time : null;
      const live = (a.sways ?? []).filter(x => x && low(x.kind) === t.kind && (now === null || !Number.isFinite(Number(x.until)) || Number(x.until) >= now));
      if ( t.by ) r = live.some(x => low(x.npc) === t.by || low(x.npcName).includes(t.by));
      else {
        if ( !ctx.npc?.id ) return null;
        r = live.some(x => x.npc === ctx.npc.id);
      }
      break;
    }
    default: return null;
  }
  return t.neg ? !r : r;
}

/**
 * Check a parsed (or raw text) "Only when" list against a context. An empty list always passes.
 * Returns {ok, failed: [the lines that stopped it], unknown: [lines the context could not answer]}.
 */
export function checkWhen(when, ctx = {}, opts = {}) {
  const parsed = typeof when === "string" || when === null || when === undefined ? parseWhen(when, opts) : when;
  const failed = [], unknown = [];
  for ( const g of parsed.groups ?? [] ) {
    let passed = 0;
    const misses = [];
    for ( const t of g.of ) {
      const r = testOne(t, ctx);
      if ( r === true ) passed += 1;
      else { misses.push(t.src); if ( r === null ) unknown.push(t.src); }
    }
    const need = g.need === Infinity ? g.of.length : g.need;
    if ( passed < need ) failed.push(g.of.length === 1 ? g.of[0].src : `${g.src} (${passed} of ${need}: ${misses.join("; ")})`);
  }
  return {ok: !failed.length && !(parsed.problems ?? []).length, failed, unknown, problems: parsed.problems ?? []};
}

/** A "Then" text to {actions: [{does, text, kind}], problems}. */
export function parseThen(text) {
  const actions = [], problems = [];
  const split = new RegExp(`\\r?\\n|;\\s*(?=(?:${Object.keys(OUTCOMES).join("|")})\\b)`, "i");
  for ( const raw of String(text ?? "").split(split) ) {
    const line = raw.replace(/#.*$/, "").trim();
    if ( !line ) continue;
    const [head, ...rest] = line.split(/\s+/);
    const does = low(head).replace(/:$/, ""), arg = rest.join(" ").trim();
    if ( !OUTCOMES[does] ) { problems.push(`"${line}": not an outcome WoDX knows (${Object.keys(OUTCOMES).join(", ")})`); continue; }
    if ( (does === "tell" || does === "whisper" || does === "cue") && !arg ) { problems.push(`"${line}": ${does} what?`); continue; }
    if ( does === "ledger" ) {
      const m = /^(oath|debt|boon|consequence)\s*:\s*(.+)$/i.exec(arg);
      if ( !m ) { problems.push(`"${line}": write ledger debt: what is owed`); continue; }
      actions.push({does, kind: low(m[1]), text: m[2].trim().slice(0, 500)});
      continue;
    }
    if ( does === "standing" ) {
      const m = /^(.+?)\s+(?:([+-]\d+)|to\s+(\S+))$/i.exec(arg);
      const to = m?.[3] !== undefined ? (STANDING_WORDS[low(m[3])] ?? Number(m[3])) : null;
      if ( !m || (m[3] !== undefined && !Number.isFinite(to)) ) { problems.push(`"${line}": write standing the court -1, or standing the court to welcome`); continue; }
      actions.push({does, faction: unquote(m[1]).trim(), delta: m[2] !== undefined ? Number(m[2]) : 0, to: m[3] !== undefined ? to : null, text: ""});
      continue;
    }
    actions.push({does, text: arg.slice(0, 500)});
  }
  return {actions, problems};
}

/** Fill {name}, {place} and {date} in an outcome's text. */
export function fillText(text, vars = {}) {
  return String(text ?? "").replace(/\{(name|place|date)\}/gi, (m, k) => String(vars[low(k)] ?? m));
}

/** The help shown beside an "Only when" box. */
export function helpText() {
  return [
    "One test per line; every line must pass. Start a line with \"not\" to turn it round.",
    "\"any of:\" or \"2 of:\" opens a group: put its choices on the lines below, each starting with \"-\".",
    "In a one-line box, \";\" ends a line, and a group fits on one line: \"any of: frenzy / rotschreck\".",
    `When: ${["era", "year", "before", "from", "night", "day", "hour", "moon", "feast", "fast", "season", "branch"].join(", ")}.`,
    `Who: pc, npc, kind, named, faction, standing <faction> >= welcome, ${Object.keys(FIELDS).join(", ")}.`,
    `State: ${Object.keys(TRAITS).join(", ")} with <=, >=, <, >, = or != and a number (wounds also takes bruised to incapacitated); ${Object.keys(STATES).join(", ")}; condition <id>.`,
    "Has: carries <item>, knows <codex page>, merit <name>, flaw <name>, background <name> >= 2, power <name>."
  ];
}
