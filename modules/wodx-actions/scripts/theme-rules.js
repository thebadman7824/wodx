/**
 * WoDX Actions 3.6 — the WoDX look (Phase 6e, B51): the pure parts. Which lines wear their own colours yet, how a
 * menu is grouped by intent, and the one card layout every action card shares (header, roll, result, what changed,
 * page reference). The colours and type live in WoDX Chronicle's styles/wodx-theme.css.
 * No Foundry calls here, so the harness can test it.
 */

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ------------------------------------------------------------------ */
/*  Line accents                                                       */
/* ------------------------------------------------------------------ */

/**
 * The lines restyled so far. The 6e gate: the Storyteller approves the Kindred, wraith and hunter look in play before
 * it is rolled out to the other lines. A line not listed keeps the era's own accent.
 */
export const LINE_LOOK = ["kindred", "wraith", "hunter"];
/** The class a window or card for this profile carries ("" for a line not rolled out yet). */
export const lineClass = kind => LINE_LOOK.includes(kind) ? `wodx-line-${kind}` : "";
/** The mark in a card's header: one glyph a line is known by (shown in the line's accent). */
export const LINE_MARK = { kindred: "✠", wraith: "☾", hunter: "✶" };

/* ------------------------------------------------------------------ */
/*  Menus grouped by intent                                            */
/* ------------------------------------------------------------------ */

export const INTENTS = [
    { id: "act", label: "Act", hint: "Try something: rolls, powers, the line's own gifts" },
    { id: "resist", label: "Resist", hint: "When something pushes back: the inner voice, fear, harm, sin" },
    { id: "recover", label: "Recover", hint: "Heal, rest, regain, look after the soul" },
    { id: "st", label: "Storyteller tools", hint: "For the Storyteller only", gm: true }
];

/** Per line: each intent's buttons, most used first; "scene" is the strip at the foot of the menu. */
export const MENU_PLAN = {
    kindred: {
        act: ["action", "api:useDiscipline", "api:feed", "api:spendBlood", "api:hunt", "api:seduction", "api:bloodOath", "api:diablerie"],
        resist: ["api:frenzy", "api:rotschreck", "api:endFrenzy", "api:hazard", "api:daytime", "api:sin"],
        recover: ["uses:willpower", "api:torpor", "api:sunAndHaven", "api:downtime", "api:setRoad"],
        st: ["api:newNight", "api:boons", "api:masquerade", "api:skyAndSun", "api:endStory"],
        scene: ["api:endScene", "api:innerVoice", "api:voices"]
    },
    wraith: {
        act: ["action", "api:useArcanos", "uses:pathos", "api:passion", "api:fetter", "api:memoriam", "api:caul"],
        resist: ["api:shadow", "api:shadowWhisper", "api:harrowing", "api:hazard"],
        recover: ["api:healCorpus", "uses:willpower"],
        st: ["api:shadowguide", "api:hysteria", "api:maelstrom"],
        scene: ["api:endScene", "api:innerVoice", "api:voices", "rules:wraith"]
    },
    hunter: {
        act: ["action", "api:hunterPower", "api:hunterVirtue", "api:trueFaith", "api:prayer", "uses:conviction", "api:numina", "api:hedgeMagic", "api:relic", "api:seduction"],
        resist: ["api:sinGod", "api:hazard"],
        recover: ["api:healing", "uses:willpower", "api:bankConviction"],
        st: ["api:imbue"],
        scene: ["api:hunterSheet", "api:endScene", "api:innerVoice", "api:voices", "rules:mortal"]
    }
};

/** What each button does, shown on hover, on keyboard focus and in the menu's hint line. Line overrides first. */
export const DESC = {
    "action": "Roll any Attribute + Ability, or a dramatic system from the presets",
    "api:seduction": "Seduce, charm or beguile: the social system, step by step",
    "api:hunt": "Hunt for a vessel in the domain: the hunting roll for the place and the method",
    "api:feed": "Drink from the targeted token: blood gained, harm to the vessel",
    "api:spendBlood": "Spend blood to heal, raise an Attribute or wake by day",
    "api:bloodOath": "Bind or be bound: a step of the blood oath",
    "api:diablerie": "Drink a Cainite's soul: each step of diablerie",
    "api:useDiscipline": "Use a Discipline power: its roll, cost and effect",
    "api:setRoad": "The Road and its hierarchy of sins; change the Road or Path",
    "api:downtime": "Time between stories: domain, havens, projects",
    "api:frenzy": "The Beast rises: a frenzy check against anger or hunger",
    "api:rotschreck": "Fire or sunlight: the Red Fear",
    "api:endFrenzy": "Fight back out of frenzy with Self-Control",
    "api:sin": "A sin against the Road: the degeneration roll",
    "api:daytime": "Stay awake or rise while the sun is up",
    "api:hazard": "Fire, falls and other harm from the world",
    "api:sunAndHaven": "Is the haven safe from the coming sun?",
    "api:torpor": "Sink into torpor, or rise from it",
    "api:boons": "Prestation: boons owed and owing, kept in the journal",
    "api:masquerade": "Who saw what: witnesses to a breach of the Masquerade",
    "api:skyAndSun": "Set the sky and the light on this scene (cloud, shade, indoors)",
    "api:endStory": "End the story: what lasts a story is restored or reset for every character",
    "api:newNight": "Start a new night for every Kindred: blood to rise, Willpower, the watch",
    "api:endScene": "End the scene: once-a-scene powers and limits reset",
    "api:innerVoice": "The character's inner voice: whisper, propose a check, assign who plays it",
    "api:voices": "The inner voices you play for other characters",
    "uses:willpower": "Spend Willpower for a success or to resist; regain it",
    "api:useArcanos": "Use an Arcanos art: Pathos cost, the roll, the Shroud and the storm",
    "uses:pathos": "Spend or regain Pathos",
    "api:passion": "Feed on a Passion: Pathos regained, once a scene",
    "api:fetter": "Visit or defend a Fetter",
    "api:memoriam": "Memoriam: relive a Fetter or a memory",
    "api:caul": "The Caul: a newly dead soul, and those who reap it",
    "api:shadow": "The Shadow speaks: Dark Passions, Thorns and Catharsis",
    "api:shadowWhisper": "The Shadowguide whispers to the wraith",
    "api:harrowing": "A Harrowing: the Shadow's nightmare when Corpus fails",
    "api:healCorpus": "Mend Corpus with rest or Pathos",
    "api:shadowguide": "Choose the player who voices this wraith's Shadow",
    "api:hysteria": "The living see a ghost: the Hysteria roll",
    "api:maelstrom": "Set the storm's force on this scene; roll the storm's harm",
    "rules:wraith": "The wraith rules at a glance, with page references",
    "api:hunterSheet": "The hunter's traits: Conviction, Piety or Creed, the stage of the hunt",
    "api:hunterPower": "Use a Blessing or an Edge (the era decides which)",
    "api:hunterVirtue": "A Virtue roll, or the imbued's second sight",
    "api:trueFaith": "True Faith: repel, resist, the powers of the faithful",
    "api:prayer": "Pray: Conviction and the answer to a prayer",
    "uses:conviction": "Spend or regain Conviction",
    "api:numina": "Psychic Numina: the roll for each power",
    "api:hedgeMagic": "Sorcery: a spell or a ritual on a path",
    "api:relic": "Call on a holy relic",
    "api:sinGod": "A sin against God: the Piety roll",
    "api:healing": "Heal wounds with time, care or medicine",
    "api:bankConviction": "Bank Conviction for a cash-in at the next stage",
    "api:imbue": "The Imbuing: make this mortal one of the imbued (1999 on)",
    "rules:mortal": "The mortal rules at a glance, with page references"
};

/**
 * Group a menu's buttons by intent. sections: the profile's [title, [[spec, label, icon], ...]] list (all its buttons).
 * Returns {bands: [{id, label, hint, buttons}], scene: buttons} with buttons as {spec, label, icon, desc}; a button the
 * plan does not list goes by its section's title (Scene → the strip; "(GM)" → Storyteller; danger words → Resist).
 * Storyteller tools are left out for players.
 */
export function groupMenu(kind, sections, { isGM = false } = {}) {
    const plan = MENU_PLAN[kind] ?? {};
    const all = [];
    for (const [title, btns] of sections ?? []) for (const [spec, label, icon] of btns) {
        if (!all.some(b => b.spec === spec)) all.push({ spec, label, icon, section: title, desc: DESC[spec] ?? "" });
    }
    const where = b => {
        for (const id of ["act", "resist", "recover", "st", "scene"]) if ((plan[id] ?? []).includes(b.spec)) return id;
        if (/\(GM\)/.test(b.label)) return "st";
        if (b.section === "Scene") return "scene";
        if (/Danger|Beast|Shadow|Rage|Frenzy/i.test(b.section)) return "resist";
        if (/heal|rest|regain/i.test(b.label)) return "recover";
        return "act";
    };
    const pos = (id, b) => { const i = (plan[id] ?? []).indexOf(b.spec); return i < 0 ? 999 : i; };
    const of = id => all.filter(b => where(b) === id).sort((a, b) => pos(id, a) - pos(id, b));
    // Inside "Storyteller tools" the "(GM)" in a label says nothing new
    const bands = INTENTS.filter(i => !i.gm || isGM).map(i => ({ id: i.id, label: i.label, hint: i.hint,
        buttons: of(i.id).map(b => i.gm ? { ...b, label: b.label.replace(/\s*\(GM\)/, "").replace("(GM, ", "(") } : b) })).filter(b => b.buttons.length);
    return { bands, scene: of("scene") };
}

/** Keep the most recent uses first, at most n, without repeats. */
export function pushRecent(list, spec, n = 4) {
    return [spec, ...(list ?? []).filter(s => s !== spec)].slice(0, n);
}

/* ------------------------------------------------------------------ */
/*  The one card layout                                                */
/* ------------------------------------------------------------------ */

const REF = /\b(?:pp?\.|pages?)\s?\d/;
/**
 * Take the page references out of a card body so they sit in the card's footer: a quiet line that is only a reference
 * ("The Hunters Hunted II p. 74"), and a reference in brackets at the end of a note ("... (V20 Dark Ages p. 345)").
 * Returns {body, refs}.
 */
export function extractRefs(body) {
    const refs = [];
    let out = String(body ?? "");
    out = out.replace(/<(div|span|p) class="wodx-quiet">([^<>]{1,90})<\/\1>/g, (m, tag, text) => {
        if (!REF.test(text)) return m;
        refs.push(text.trim().replace(/^\(|\)$/g, ""));
        return "";
    });
    out = out.replace(/\s*\(([^()<>]{0,80}\b(?:pp?\.|pages?)\s?\d[^()<>]{0,30})\)(\.?)(?=\s*<\/div>)/g, (m, ref, dot) => {
        refs.push(ref.trim());
        return dot;
    });
    return { body: out, refs: [...new Set(refs)] };
}

/** The card's verdict for its header: the one result on the card, if there is exactly one. {text, tone} or null. */
export function verdictOf(body) {
    const pick = cls => [...String(body ?? "").matchAll(new RegExp(`<div class="(${cls}(?: (?:good|bad))?)">([\\s\\S]*?)</div>`, "g"))];
    let hits = pick("vta-big");
    if (!hits.length) hits = pick("vta-res");
    if (hits.length !== 1) return null;
    const text = hits[0][2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 48) return null;
    const tone = /\bbad\b/.test(hits[0][1]) || /botch/i.test(text) ? "bad" : /\bgood\b/.test(hits[0][1]) ? "good" : "plain";
    return { text, tone };
}

/**
 * Resource pips for a change: max dots, the value now filled, the dots just lost or gained marked.
 * Only for tracks of ten or fewer; returns "" otherwise.
 */
export function pips(before, after, max) {
    const b = Number(before), a = Number(after), m = Number(max);
    if (!Number.isFinite(b) || !Number.isFinite(a) || !Number.isFinite(m) || m < 1 || m > 10 || a > m || b > m || a < 0 || b < 0) return "";
    let s = "";
    for (let i = 1; i <= m; i++) {
        const cls = i <= Math.min(a, b) ? "on" : i <= a ? "on gain" : i <= b ? "lost" : "off";
        s += `<i class="vta-pip ${cls}"></i>`;
    }
    return `<span class="vta-pips" aria-hidden="true">${s}</span>`;
}

/** "What changed" strip. changes: [{label, before, after, max}] (the same label twice: first before, last after). */
export function changeStrip(changes) {
    const merged = [];
    for (const c of changes ?? []) {
        const m = merged.find(x => x.label === c.label);
        if (m) { m.after = c.after; m.max = c.max ?? m.max; } else merged.push({ ...c });
    }
    const real = merged.filter(c => String(c.before) !== String(c.after));
    if (!real.length) return "";
    return `<div class="vta-change"><span class="vta-change-label">What changed</span>${real.map(c =>
        `<span class="vta-chg ${Number(c.after) < Number(c.before) ? "down" : "up"}"><b>${esc(c.label)}</b> ${pips(c.before, c.after, c.max)}<span class="vta-chg-n">${esc(c.before)} → ${esc(c.after)}</span></span>`).join("")}</div>`;
}

/** The worldofdarkness system paints every chat h3 with layered !important rules; only a style on the element itself
 * outranks them, so the header's h3 carries one. */
const H3 = "background:none!important;border:0!important;box-shadow:none!important;color:inherit!important";

/**
 * The card: a header band (line mark, title, verdict), the body as the builder wrote it, what changed, the footer with
 * the page references. Keeps the h3 and the "vta-card" class every script and test looks for.
 */
export function cardLayout({ title, body, line = "", changes = [] }) {
    const { body: b, refs } = extractRefs(body);
    const v = verdictOf(b);
    const mark = LINE_MARK[line] && LINE_LOOK.includes(line) ? `<span class="vta-mark" aria-hidden="true">${LINE_MARK[line]}</span>` : "";
    const cls = lineClass(line);
    return `<div class="vta-card wodx-x${cls ? ` ${cls}` : ""}"${line ? ` data-line="${esc(line)}"` : ""}>`
        + `<header class="vta-head">${mark}<h3 style="${H3}">${title}</h3>${v ? `<span class="vta-verdict ${v.tone}">${esc(v.text)}</span>` : ""}</header>`
        + `<div class="vta-body">${b}</div>`
        + changeStrip(changes)
        + (refs.length ? `<footer class="vta-ref">${refs.map(esc).join(" · ")}</footer>` : "")
        + `</div>`;
}

/** Put a change strip into a card already posted (changes that landed just after the card). */
export function withChanges(content, changes) {
    const strip = changeStrip(changes);
    if (!strip) return content;
    const s = String(content).replace(/<div class="vta-change">[\s\S]*?<\/span><\/span><\/div>/, "");
    return s.includes('<footer class="vta-ref">') ? s.replace('<footer class="vta-ref">', `${strip}<footer class="vta-ref">`) : s.replace(/<\/div>$/, `${strip}</div>`);
}

/* ------------------------------------------------------------------ */
/*  What changed: read from an actor update                            */
/* ------------------------------------------------------------------ */

const get = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
const DAMAGE = { bashing: "Bashing", lethal: "Lethal", aggravated: "Aggravated" };
/**
 * The tracked numbers an update changes. system: the actor's system data before; flat: the update flattened
 * ({"system.advantages.willpower.temporary": 4}); res: {key: {label, path}} (profiles.js RES).
 * Returns [{label, before, after, max}].
 */
export function diffResources(system, flat, res) {
    const out = [];
    for (const [key, after] of Object.entries(flat ?? {})) {
        const m = /^system\.(.+)\.(temporary|permanent|value|max)$/.exec(key);
        if (m) {
            const r = Object.values(res ?? {}).find(x => x.path === m[1]);
            if (!r) continue;
            const before = get(system, `${m[1]}.${m[2]}`);
            if (before === undefined || Number(before) === Number(after)) continue;
            const node = get(system, m[1]) ?? {};
            const max = m[2] === "temporary" ? (flat[`system.${m[1]}.max`] ?? node.max ?? flat[`system.${m[1]}.permanent`] ?? node.permanent) : null;
            out.push({ label: m[2] === "permanent" ? `${r.label} (permanent)` : m[2] === "max" ? `${r.label} (maximum)` : r.label, before: Number(before), after: Number(after), max: max == null ? null : Number(max) });
            continue;
        }
        const d = /^system\.health\.damage\.(bashing|lethal|aggravated|corpus\.(bashing|lethal|aggravated))$/.exec(key);
        if (d) {
            const kind = d[2] ?? d[1];
            const before = get(system, key.slice(7));
            if (Number(before) === Number(after) || !Number.isFinite(Number(after))) continue;
            out.push({ label: `${d[2] ? "Corpus: " : ""}${DAMAGE[kind]} damage`, before: Number(before) || 0, after: Number(after), max: null });
        }
    }
    return out;
}
