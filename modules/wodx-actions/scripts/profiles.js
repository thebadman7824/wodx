/**
 * WoDX shared actor profiles (identical copy ships in WoDX Combat and WoDX Actions). Ported from vtda20 2.2.1.
 *
 * A "profile" decides which combat menu, soak model and action menu an actor gets.
 * Detection order:
 *   1. override flag  flags.world.wodx.profile   (set from the Profile button in either menu)
 *      -- falls back to the VtDA20 flags until the migration copies them: flags.world.vtda20.profile, then the
 *         v1.x flags flags["vtda20-combat"].profile / flags["vtda20-actions"].profile
 *   2. actor.type     (Vampire, Werewolf, Changing Breed, Mage, Changeling, Wraith, Hunter, Demon, Mummy, Exalted,
 *                      Creature, Mortal) and, for the new "PC" type, system.settings.splat
 *   3. variant / Disciplines (ghouls and revenants)
 *   4. mortal
 *
 * The first module to load registers game.wodx.profiles. The second one finds it already there and leaves it.
 */

export const SHARED_VERSION = "3.0.0";
const FLAG_SCOPE = "world";
const FLAG_KEY = "wodx";
const OLD_KEY = "vtda20";
const LEGACY_FLAGS = ["vtda20-combat", "vtda20-actions"];

/**
 * A per-actor value kept under flags.world.wodx (profile, form, elder), read from flags.world.vtda20 until the
 * migration has copied it.
 */
export function worldFlag(actor, key) {
    const w = actor?.flags?.[FLAG_SCOPE];
    return w?.[FLAG_KEY]?.[key] ?? w?.[OLD_KEY]?.[key];
}
export async function setWorldFlag(actor, key, value) {
    return actor.setFlag(FLAG_SCOPE, `${FLAG_KEY}.${key}`, value);
}

const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };

/**
 * soak: soak model used by the combat module.
 *   vampire | ghoul | mortal | lupine | wraith | fae | spirit   (see rules.soakPool)
 * res: resources shown/spent by the menus: [id, label].
 * bane: what ignores natural soak (silver, cold iron...).
 */
import { lineClass } from "./theme-rules.js";

export const PROFILES = {
    kindred:  { label: "Kindred (Cainite)",        soak: "vampire", res: ["blood", "willpower"], bane: "fire / sunlight" },
    ghoul:    { label: "Ghoul / Revenant",         soak: "ghoul",   res: ["blood", "willpower"], bane: "fire / sunlight (no extra defense)" },
    mortal:   { label: "Mortal",                   soak: "mortal",  res: ["willpower"] },
    hunter:   { label: "Hunter / Inquisitor",      soak: "mortal",  res: ["willpower", "conviction", "faith"] },
    lupine:   { label: "Werewolf / Changing Breed", soak: "lupine",  res: ["rage", "gnosis", "willpower"], bane: "silver" },
    mage:     { label: "Mage / Sorcerer",          soak: "mortal",  res: ["willpower", "quintessence", "paradox"] },
    fae:      { label: "Changeling / Fae",         soak: "fae",     res: ["glamour", "banality", "willpower"], bane: "cold iron" },
    wraith:   { label: "Wraith / Ghost",           soak: "wraith",  res: ["pathos", "corpus", "angst", "willpower"], bane: "" },
    spirit:   { label: "Spirit / Imp / Spectre",   soak: "spirit",  res: ["essence", "willpower"], bane: "" },
    beast:    { label: "Creature / Beast",         soak: "mortal",  res: ["willpower"] },
    demon:    { label: "Demon",                    soak: "lupine",  res: ["faith", "torment", "willpower"], bane: "" },
    mummy:    { label: "Mummy",                    soak: "lupine",  res: ["sekhem", "balance", "willpower"], bane: "" },
    exalted:  { label: "Exalted",                  soak: "lupine",  res: ["essence", "willpower"], bane: "" }
};

/** Legacy v1 soak-profile names map onto the new keys so old flags keep working. */
const LEGACY_VALUES = { vampire: "kindred", supernatural: "lupine", ghoul: "ghoul", mortal: "mortal" };

export const RES = {
    willpower:   { label: "Willpower",   path: "advantages.willpower" },
    blood:       { label: "Blood",       path: "advantages.bloodpool" },
    rage:        { label: "Rage",        path: "advantages.rage" },
    gnosis:      { label: "Gnosis",      path: "advantages.gnosis" },
    glamour:     { label: "Glamour",     path: "advantages.glamour" },
    banality:    { label: "Banality",    path: "advantages.banality" },
    nightmare:   { label: "Nightmare",   path: "advantages.nightmare" },
    faith:       { label: "Faith",       path: "advantages.faith" },
    conviction:  { label: "Conviction",  path: "advantages.conviction" },
    pathos:      { label: "Pathos",      path: "advantages.pathos" },
    corpus:      { label: "Corpus",      path: "advantages.corpus" },
    angst:       { label: "Angst",       path: "advantages.angst" },
    torment:     { label: "Torment",     path: "advantages.torment" },
    essence:     { label: "Essence",     path: "advantages.essence" },
    sekhem:      { label: "Sekhem",      path: "advantages.sekhem" },
    balance:     { label: "Balance",     path: "advantages.balance" },
    quintessence:{ label: "Quintessence", path: "quintessence", alt: "advantages.quintessence" },
    paradox:     { label: "Paradox",     path: "paradox", alt: "advantages.paradox" },
    arete:       { label: "Arete",       path: "advantages.arete", readonly: true }
};

/* ------------------------------------------------------------------ */
/*  Detection                                                          */
/* ------------------------------------------------------------------ */

function flagOf(actor) {
    let f = worldFlag(actor, "profile");
    if (f) return f;
    for (const mod of LEGACY_FLAGS) {
        f = actor?.flags?.[mod]?.profile;
        if (f && f !== "auto") return LEGACY_VALUES[f] ?? f;
    }
    return null;
}

function hasDiscipline(actor, names) {
    return (actor?.items ?? []).some(i => i.type === "Power" &&
        names.some(n => (i.name || "").trim().toLowerCase().startsWith(n)) && num(i.system?.value) > 0);
}

const TYPE_MAP = {
    vampire: "kindred", werewolf: "lupine", "changing breed": "lupine", changingbreed: "lupine",
    mage: "mage", changeling: "fae", wraith: "wraith", hunter: "hunter", demon: "demon", mummy: "mummy",
    exalted: "exalted", creature: "beast", mortal: "mortal", spirit: "spirit"
};

/** Variant as lower-case text. settings.variant is a string, but system.variant is an object {shade, lament, role} in legacy actors. */
function variantText(actor) {
    const parts = [];
    const add = v => {
        if (typeof v === "string") parts.push(v);
        else if (v && typeof v === "object") for (const x of Object.values(v)) if (typeof x === "string") parts.push(x);
    };
    add(actor.system?.settings?.variant);
    add(actor.system?.variant);
    return parts.join(" ").toLowerCase();
}

/** Returns the profile key for an actor. `auto` detection only (no flag): detectProfile(actor, {ignoreFlag:true}). */
export function detectProfile(actor, { ignoreFlag = false } = {}) {
    if (!actor) return "mortal";
    if (!ignoreFlag) {
        const f = flagOf(actor);
        if (f && PROFILES[f]) return f;
    }
    let t = (actor.type || "").toLowerCase();
    if (t === "pc") t = (actor.system?.settings?.splat || "mortal").toLowerCase();
    let key = TYPE_MAP[t] ?? "mortal";
    const variant = variantText(actor);
    if (key === "mortal") {
        if (/ghoul|revenant/.test(variant)) key = "ghoul";
        else if (hasDiscipline(actor, ["fortitude", "potence", "celerity"])) key = "ghoul";
    }
    if (key === "wraith" && /spectre|shadow/.test(variant)) key = "spirit";
    return key;
}

export function profileSoak(key) { return PROFILES[key]?.soak ?? "mortal"; }

export async function setProfile(actor, key) {
    if (!actor) return;
    if (!key || key === "auto") {
        // "Automatic" is stored, not a deletion, so an old VtDA20 flag underneath cannot come back into force
        await actor.setFlag(FLAG_SCOPE, `${FLAG_KEY}.profile`, "auto");
        return;
    }
    await actor.setFlag(FLAG_SCOPE, `${FLAG_KEY}.profile`, key);
}

export function profileLabel(key) { return PROFILES[key]?.label ?? key; }

/* ------------------------------------------------------------------ */
/*  Resource adapter (legacy actor types and PC Advantage items)       */
/* ------------------------------------------------------------------ */

function pcAdvantage(actor, id) {
    return (actor?.items ?? []).find(i => i.type === "Advantage" &&
        ((i.system?.id || "").toLowerCase() === id || (i.name || "").toLowerCase() === id));
}

/** Reads a resource: {id,label,value,max,perm,path|item,ok}. */
export function resource(actor, id) {
    const r = RES[id]; if (!r) return { id, label: id, value: 0, max: 0, ok: false };
    const sys = actor?.system ?? {};
    const pick = p => p.split(".").reduce((o, k) => o?.[k], sys);
    let node = pick(r.path);
    let path = r.path;
    if ((!node || typeof node !== "object") && r.alt) { node = pick(r.alt); path = r.alt; }
    if (node && typeof node === "object" && ("temporary" in node || "value" in node)) {
        const key = ("temporary" in node) ? "temporary" : "value";
        return { id, label: r.label, value: num(node[key]), max: num(node.max ?? node.permanent), perm: num(node.permanent), path: `system.${path}.${key}`, ok: true, readonly: !!r.readonly };
    }
    const it = pcAdvantage(actor, id === "blood" ? "bloodpool" : id);
    if (it) return { id, label: r.label, value: num(it.system?.temporary ?? it.system?.value), max: num(it.system?.max), item: it, ok: true, readonly: !!r.readonly };
    return { id, label: r.label, value: 0, max: 0, ok: false };
}

/** Changes a resource by delta (negative spends). Returns a chat note, or null if it could not be done. */
export async function adjust(actor, id, delta, { min = 0, note = true } = {}) {
    const r = resource(actor, id);
    if (!r.ok || r.readonly || !delta) return null;
    const max = r.max || 99;
    const next = Math.max(min, Math.min(max, r.value + delta));
    const upd = r.item ? { "system.temporary": next } : { [r.path]: next };
    if (r.item) { if (r.item.system?.temporary === undefined) upd["system.value"] = next; await r.item.update(upd); }
    else await actor.update(upd);
    return note ? `${actor.name}: ${r.label} ${r.value} → ${next}` : "";
}

export function canAfford(actor, id, n) { const r = resource(actor, id); return r.ok && r.value >= n; }

/* ------------------------------------------------------------------ */
/*  Shared UI helpers                                                  */
/* ------------------------------------------------------------------ */

/** Read every field of a form inside a dialog root. */
export function readForm(root) {
    const el = root instanceof HTMLElement ? root : (root?.[0] ?? root);
    const form = el?.querySelector?.("form") ?? el;
    const fd = {};
    for (const f of form?.querySelectorAll?.("input, select, textarea") ?? []) {
        if (!f.name) continue;
        if (f.type === "radio") { if (f.checked) fd[f.name] = f.value; continue; }
        if (f.type === "checkbox") fd[f.name] = f.checked;
        else if (f.type === "number") fd[f.name] = num(f.value);
        else fd[f.name] = f.value;
    }
    return fd;
}

/**
 * Keep a window on screen. A window taller than the viewport is centered with a negative top, which hides its title
 * bar and first options. Cap the height to the viewport and pin the top; the content then scrolls (see the CSS).
 */
export function fit(app) {
    try {
        const el = app?.element?.[0] ?? app?.element;
        if (!el?.getBoundingClientRect) return;
        const vh = window.innerHeight, margin = 12;
        const h = el.getBoundingClientRect().height;
        if (!h || !vh) return;
        const max = vh - 2 * margin;
        const height = Math.min(h, max);
        const top = Math.max(margin, Math.round((vh - height) / 2));
        app.setPosition?.({ top, height });
    } catch (e) { console.warn("WoDX | fit", e); }
}

/**
 * Dialog that works on Foundry v11-v14 (DialogV2 when present, classic Dialog otherwise).
 * buttons: [{id,label,icon,default}]; resolves {id, data} with the form values read at click time, or null if closed.
 */
/** The line whose look the next dialog wears (6e): set while an action for an actor runs. */
let LINE = "";
export function setLine(kind) { const prev = LINE; LINE = kind ?? ""; return prev; }
export const currentLine = () => LINE;

export function ask({ title, content, buttons, width = 480, classes = [], onRender = null }) {
    const V2 = globalThis.foundry?.applications?.api?.DialogV2;
    const lc = lineClass(LINE);
    if (lc && !classes.includes(lc)) classes = [...classes, lc];
    if (V2) {
        return new Promise(resolve => {
            let done = false;
            const finish = v => { if (!done) { done = true; resolve(v); } };
            const dlg = new V2({
                window: { title },
                position: { width },
                classes: ["wodx", "wodx-dialog", "vtda20-dialog", ...classes],
                content,
                buttons: buttons.map(b => ({
                    action: b.id, label: b.label, icon: b.icon, default: !!b.default,
                    callback: (ev, btn, d) => { finish({ id: b.id, data: readForm(d.element) }); }
                })),
                rejectClose: false
            });
            dlg.addEventListener?.("close", () => finish(null));
            Promise.resolve(dlg.render({ force: true })).then(() => { try { onRender?.(dlg.element, () => { finish(null); dlg.close(); }); fit(dlg); } catch (e) { console.warn("WoDX | dialog onRender", e); } });
        });
    }
    return new Promise(resolve => {
        const bs = {};
        for (const b of buttons) bs[b.id] = { icon: b.icon ? `<i class="${b.icon}"></i>` : "", label: b.label, callback: html => resolve({ id: b.id, data: readForm(html) }) };
        const def = buttons.find(b => b.default)?.id ?? buttons[0].id;
        const d = new Dialog({ title, content, buttons: bs, default: def, close: () => resolve(null),
            render: html => { try { onRender?.(html[0] ?? html, () => d.close()); setTimeout(() => fit(d), 0); } catch (e) { console.warn("WoDX | dialog onRender", e); } } },
            { width, classes: ["dialog", "vtda20-dialog", ...classes] }).render(true);
    });
}

/** "Which type of actor is this?" picker; writes the override flag. */
export async function pickProfile(actor) {
    const auto = detectProfile(actor, { ignoreFlag: true });
    const cur = flagOf(actor) ?? "auto";
    const opts = [`<option value="auto" ${cur === "auto" ? "selected" : ""}>Automatic — ${PROFILES[auto].label}</option>`]
        .concat(Object.entries(PROFILES).map(([k, p]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${p.label}</option>`));
    const r = await ask({
        title: `Actor type — ${actor.name}`,
        content: `<form class="vtda20-profile wodx-profile"><p>Choose which combat and action menus ${actor.name} uses. Automatic reads the actor type, then the variant and Disciplines.</p>
          <div class="form-group"><label>Menu profile</label><select name="profile" data-fixed>${opts.join("")}</select></div></form>`,
        buttons: [{ id: "ok", label: "Set", icon: "fas fa-check", default: true }, { id: "no", label: "Cancel", icon: "fas fa-times" }],
        width: 420
    });
    if (!r || r.id !== "ok") return null;
    await setProfile(actor, r.data.profile);
    return detectProfile(actor);
}

/** Register game.wodx.profiles once (first module to load wins). */
export function register() {
    game.wodx ??= {};
    if (game.wodx.profiles) return game.wodx.profiles;
    game.wodx.profiles = { SHARED_VERSION, PROFILES, RES, detectProfile, setProfile, pickProfile, resource, adjust, canAfford, profileLabel, profileSoak, worldFlag, setWorldFlag };
    return game.wodx.profiles;
}
