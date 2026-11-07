/**
 * VtDA20 Actions — non-combat automation for Vampire: The Dark Ages 20th Anniversary
 * on the World of Darkness 20th Edition system (Foundry VTT).
 *
 * game.vtda20actions
 *   menu()                         launcher with every action below
 *   action({actor, preset})        any Attribute + Ability roll: simple, extended, resisted, teamwork
 *   hunt({actor})                  hunting for prey, hunger and feeding
 *   feed({actor, vessel})          drink from a specific (targeted) vessel
 *   spendBlood({actor})            healing, quickening, imitating life, Disciplines, transference
 *   frenzy({actor}) / rotschreck({actor}) / endFrenzy({actor})
 *   sin({actor})                   degeneration (sin against the Road)
 *   daytime({actor})               awakening during the day
 *   hazard({actor})                sunlight, fire, falling
 *   torpor({actor})                enter torpor / attempt to rise
 *   bloodOath({actor})             Blood Oath tracker
 *   diablerie({actor, victim})     the Amaranth
 *   seduction({actor, target})     the three-roll seduction
 *   newNight({actors}) / endScene({actors})
 *   getKind(actor) / setKind(actor, key) / pickKind(actor)   actor-type profile (shared with vtda20-combat)
 *   profileMenu({actor})           the launcher shows a different menu for each actor type (v2.0)
 */

import * as R from "./rules.js";
import * as P from "./profiles.js";
import * as PM from "./profile-menus.js";
import * as F from "./flavor.js";

const MOD = "vtda20-actions";
const SOCKET = `module.${MOD}`;
const GEN = () => game.release?.generation ?? 11;
const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ================================================================== */
/*  Settings                                                          */
/* ================================================================== */

function registerSettings() {
    const s = (key, name, hint, type, def) =>
        game.settings.register(MOD, key, { name, hint, scope: "world", config: true, type, default: def });
    game.settings.register(MOD, "flavorText", { name: "Flavor text on action cards",
        hint: "Add one short line of description under the result of each action card, picked to fit what was attempted and how it went. Edit the lines in scripts/flavor.js.",
        scope: "world", config: true, type: String, default: "all", choices: { all: "Shown to everyone", gm: "Whispered to the GM", off: "Off" } });
    s("spendResources", "Deduct Willpower and blood", "Update the character sheet when Willpower or blood is spent or gained.", Boolean, true);
    s("applyChanges", "Apply results to sheets", "Apply health, Road, Virtue, frenzy and blood results automatically. Off: results are reported only.", Boolean, true);
    s("showDice", "Show the dice in chat", "List each die face in result cards.", Boolean, true);
    s("untrained", "Untrained ability rules", "Talents default to the Attribute, Skills at +1 difficulty, Knowledges cannot be attempted (V20 standard).", Boolean, true);
    s("createMacros", "Create hotbar macros", "Create the VtDA20 Actions macros in the Macro directory if missing.", Boolean, true);
    s("profileMenu", "Menu follows the actor type",
        "The Actions menu shows the buttons for the actor's profile (Kindred, ghoul, mortal, Garou, mage, changeling, wraith...). Off: always the Kindred menu.", Boolean, true);
    s("nightlyBlood", "Blood cost of rising", "Subtract one blood point from each vampire at New Night (p. 340).", Boolean, true);
}
const setting = k => game.settings.get(MOD, k);

/* ================================================================== */
/*  Actor data adapter                                                 */
/* ================================================================== */

function attr(actor, key) {
    const a = actor?.system?.attributes?.[key];
    return a ? num(a.total ?? a.value) : 0;
}
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

/** Every ability the actor can roll: flat abilities and secondary-ability items. */
function abilityList(actor) {
    const out = [];
    const flat = actor?.system?.abilities ?? {};
    for (const [k, a] of Object.entries(flat)) {
        if (!a || typeof a !== "object" || a.value === undefined) continue;
        if (!(num(a.value) > 0 || a.isvisible)) continue;
        out.push({ id: `flat:${k}`, key: k, name: a.altlabel || game.i18n.localize(a.label || k), value: num(a.value), type: a.type || "", specialty: a.speciality || "" });
    }
    for (const i of actor?.items ?? []) {
        const t = i.system?.type || "";
        if (i.type === "Trait" && t.includes("secondability")) {
            const type = t.includes("talent") ? "talent" : t.includes("skill") ? "skill" : "knowledge";
            out.push({ id: `item:${i.id}`, key: i.name.toLowerCase(), name: i.name, value: num(i.system.value), type, specialty: i.system.speciality || "" });
        } else if (i.type === "Ability") {
            out.push({ id: `item:${i.id}`, key: i.system?.id || i.name.toLowerCase(), name: i.name, value: num(i.system.value), type: i.system?.type || "", specialty: i.system.speciality || "" });
        }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
}

/** Find an ability by key or name (e.g. "athletics", "Ride", "Theology"). */
function findAbility(actor, keyOrName) {
    if (!keyOrName) return null;
    const k = keyOrName.toLowerCase();
    const flat = actor?.system?.abilities?.[k];
    if (flat && flat.value !== undefined)
        return { id: `flat:${k}`, key: k, name: game.i18n.localize(flat.label || k), value: num(flat.value), type: flat.type || "", specialty: flat.speciality || "" };
    const list = abilityList(actor);
    return list.find(a => a.key === k || a.name.toLowerCase() === k) ?? null;
}
function abilityById(actor, id) {
    if (!id) return null;
    if (id.startsWith("flat:")) return findAbility(actor, id.slice(5));
    return abilityList(actor).find(a => a.id === id) ?? null;
}

function discipline(actor, name) {
    const it = actor?.items?.find(i => i.type === "Power" && (i.system?.type || "").includes("discipline") &&
        i.name.trim().toLowerCase().startsWith(name.toLowerCase()));
    return it ? num(it.system?.value) : 0;
}
function background(actor, name) {
    const it = actor?.items?.find(i => i.type === "Feature" && (i.system?.type || "").includes("background") &&
        i.name.trim().toLowerCase().startsWith(name.toLowerCase()));
    return it ? num(it.system?.value) : 0;
}

function virtues(actor) {
    const v = actor?.system?.advantages?.virtues ?? {};
    const lab = (o, d) => { const l = game.i18n.localize(o?.label || ""); return l && !l.startsWith("wod.") ? l : d; };
    const conscienceLabel = lab(v.conscience, "Conscience");
    const controlLabel = lab(v.selfcontrol, "Self-Control");
    return {
        conscience: { value: num(v.conscience?.permanent), label: conscienceLabel, isConviction: (v.conscience?.label || "").includes("conviction") },
        selfcontrol: { value: num(v.selfcontrol?.permanent), label: controlLabel, isInstinct: (v.selfcontrol?.label || "").includes("instinct") },
        courage: { value: num(v.courage?.permanent), label: "Courage" }
    };
}
function road(actor) {
    const p = actor?.system?.advantages?.path ?? {};
    let name = p.custom || game.i18n.localize(p.label || "");
    if (!name || name.startsWith("wod.")) name = "Road";
    if (name === "Humanity") name = "Road of Humanity";
    return { value: num(p.permanent ?? p.value), name };
}
function willpower(actor) {
    const w = actor?.system?.advantages?.willpower ?? {};
    return { temp: num(w.temporary), perm: num(w.permanent) };
}
function blood(actor) {
    const b = actor?.system?.advantages?.bloodpool ?? {};
    const g = generationOf(actor);
    const table = R.generation(g);
    return { value: num(b.temporary), max: num(b.max) || table.pool || 10, perTurn: num(b.perturn) || table.perTurn || 1 };
}
function generationOf(actor) {
    const g = num(actor?.system?.generation) - num(actor?.system?.generationmod);
    return g > 0 ? g : 13;
}
function woundPenalty(actor) {
    if (actor?.system?.conditions?.isignoringpain || actor?.system?.conditions?.isfrenzy) return 0;
    return num(actor?.system?.health?.damage?.woundpenalty);
}
function isVampire(actor) { return P.detectProfile(actor) === "kindred"; }
/** Legacy soak-profile name used by the v1 rules: vampire | ghoul | mortal | supernatural. */
function profile(actor) {
    const k = P.detectProfile(actor);
    if (k === "kindred") return "vampire";
    if (k === "ghoul") return "ghoul";
    if (["mortal", "hunter", "mage", "beast", "fae"].includes(k)) return "mortal";
    return "supernatural";
}
function armorRating(actor, type) {
    let n = 0;
    for (const i of actor?.items ?? []) if (i.type === "Armor" && i.system?.isequipped) n += num(i.system.soak?.[type]);
    return n;
}
const flag = (actor, k) => actor?.getFlag?.(MOD, k);

/* ================================================================== */
/*  Updates (own sheet directly, others through the GM)               */
/* ================================================================== */

async function updateActor(actor, data) {
    if (!actor || !Object.keys(data).length) return;
    if (actor.isOwner) return actor.update(data);
    return requestGM({ action: "update", uuid: actor.uuid, data });
}
async function setFlag(actor, k, v) {
    if (actor.isOwner) return v === null ? actor.unsetFlag(MOD, k) : actor.setFlag(MOD, k, v);
    return requestGM({ action: "update", uuid: actor.uuid, data: v === null ? { [`flags.${MOD}.-=${k}`]: null } : { [`flags.${MOD}.${k}`]: v } });
}
function requestGM(payload) {
    if (!game.users.find(u => u.isGM && u.active)) { ui.notifications.warn("VtDA20 Actions: no GM is connected to apply the change."); return false; }
    game.socket.emit(SOCKET, payload);
    return true;
}
function isResponsibleGM() {
    const gm = game.users.activeGM ?? game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
    return gm?.id === game.user.id;
}
async function onSocket(p) {
    if (!isResponsibleGM()) return;
    const doc = await fromUuid(p.uuid);
    const actor = doc?.actor ?? doc;
    if (!actor) return;
    if (p.action === "update") await actor.update(p.data);
    else if (p.action === "damage") await applyDamage(actor, p.type, p.levels);
}

async function spendWillpower(actor, n = 1) {
    const w = willpower(actor);
    if (w.temp < n) { ui.notifications.warn(`${actor.name} has only ${w.temp} Willpower.`); return false; }
    if (setting("spendResources")) await updateActor(actor, { "system.advantages.willpower.temporary": w.temp - n });
    return true;
}
async function changeBlood(actor, delta) {
    const b = blood(actor);
    const v = Math.max(0, Math.min(b.max, b.value + delta));
    if (setting("spendResources")) await updateActor(actor, { "system.advantages.bloodpool.temporary": v });
    return { before: b.value, after: v, wasted: (b.value + delta) - v };
}

/* ================================================================== */
/*  Health (same model as the WoD20 system / vtda20-combat)           */
/* ================================================================== */

function healthTrack(actor) {
    const h = actor?.system?.health ?? {};
    const totals = {}, penalties = {}, labels = {};
    for (const k of R.WOUND_LEVELS) { totals[k] = num(h[k]?.total ?? h[k]?.value ?? 1); penalties[k] = num(h[k]?.penalty); labels[k] = h[k]?.label ?? `wod.health.${k}`; }
    const d = h.damage ?? {};
    const damage = { bashing: num(d.bashing), lethal: num(d.lethal), aggravated: num(d.aggravated) };
    return { totals, penalties, labels, damage, max: R.WOUND_LEVELS.reduce((s, k) => s + totals[k], 0) };
}
function healthUpdate(actor, damage) {
    const t = healthTrack(actor);
    const ws = R.woundState(damage, t.totals, t.penalties, t.labels);
    return {
        "system.health.damage.bashing": damage.bashing, "system.health.damage.lethal": damage.lethal,
        "system.health.damage.aggravated": damage.aggravated, "system.health.damage.woundlevel": ws.label,
        "system.health.damage.woundpenalty": ws.penalty,
        "system.traits.health.totalhealthlevels.max": t.max,
        "system.traits.health.totalhealthlevels.value": Math.max(0, t.max - ws.filled)
    };
}
function healthText(actor, damage) {
    const t = healthTrack(actor);
    const ws = R.woundState(damage, t.totals, t.penalties, t.labels);
    return `${damage.bashing}B / ${damage.lethal}L / ${damage.aggravated}A — ${ws.label ? game.i18n.localize(ws.label) : "Unhurt"}`;
}
async function applyDamage(actor, type, levels) {
    if (!levels) return null;
    if (game.vtda20combat?.applyDamage && actor.isOwner) return game.vtda20combat.applyDamage(actor, type, levels);
    if (!actor.isOwner) { requestGM({ action: "damage", uuid: actor.uuid, type, levels }); return { requested: true }; }
    const t = healthTrack(actor);
    const p = profile(actor);
    const eff = type === "aggravated" && (p === "mortal" || p === "ghoul") ? "lethal" : type;
    const after = R.addDamage(t.damage, eff, levels, t.max);
    await actor.update(healthUpdate(actor, after));
    return { before: t.damage, after, condition: R.condition(after, t.max, p) };
}
async function setDamage(actor, damage) { return updateActor(actor, healthUpdate(actor, damage)); }

/* ================================================================== */
/*  Dice & chat                                                        */
/* ================================================================== */

async function rollPool(dice, difficulty, opts = {}) {
    const diff = R.clampDifficulty(difficulty);
    let faces = [], roll = null;
    if (dice > 0) {
        roll = new Roll(`${dice}d10`);
        if (GEN() < 12) await roll.evaluate({ async: true }); else await roll.evaluate();
        faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
    }
    const res = R.countSuccesses(faces, diff, opts);
    return { ...res, roll, faces, dice, difficulty: diff };
}
function diceHtml(r, specialty = false) {
    if (!setting("showDice") || !r?.faces?.length) return "";
    return `<div class="vta-dice">${r.faces.map(f => `<span class="vta-die ${f === 1 ? "one" : f >= r.difficulty ? (specialty && f === 10 ? "spec" : "hit") : "miss"}">${f}</span>`).join("")}</div>`;
}
function resultLine(r, { degreeText = true } = {}) {
    if (r.botch) return `<div class="vta-res bad">BOTCH</div>`;
    if (!r.successes) return `<div class="vta-res">Failure</div>`;
    return `<div class="vta-res good">${r.successes} success${r.successes === 1 ? "" : "es"}${degreeText ? ` — ${R.degree(r.successes)}` : ""}</div>`;
}
function rollBlock(title, r, parts = [], specialty = false) {
    return `<div class="vta-sec"><b>${title}</b>: ${r.dice} dice, diff ${r.difficulty}${parts.length ? `<div class="vta-parts">${parts.join(" · ")}</div>` : ""}${diceHtml(r, specialty)}${resultLine(r)}</div>`;
}
async function post(actor, title, body, rolls = [], data = null) {
    let flav = "", mode = "off";
    try { mode = setting("flavorText"); } catch (e) { mode = "all"; }
    if (mode !== "off") {
        const th = F.theme(title, body), oc = F.outcome(th, body);
        const tgt = [...(game.user.targets ?? [])].map(t => t.name).find(n => n && n !== actor?.name);
        if (oc) flav = F.line(th, oc, { name: actor?.name ?? "Someone", ...(tgt ? { target: tgt } : {}) },
            { group: F.actorGroup(actor ? P.detectProfile(actor) : null) });
    }
    const content = `<div class="vta-card"><h3>${title}</h3>${body}${mode === "all" ? F.html(flav) : ""}</div>`;
    if (flav && mode === "gm") ChatMessage.create({ content: `<div class="vta-card">${F.html(flav)}</div>`, whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: { alias: "VtDA20" } });
    const md = { speaker: ChatMessage.getSpeaker({ actor }), content, rolls: rolls.filter(Boolean) };
    if (rolls.filter(Boolean).length) { md.sound = CONFIG.sounds.dice; if (GEN() < 12) md.type = CONST.CHAT_MESSAGE_TYPES.ROLL; }
    if (data) md.flags = { [MOD]: data };
    return ChatMessage.create(md);
}
const btn = (action, label) => `<button type="button" class="vta-btn" data-action="${action}">${label}</button>`;

/* ================================================================== */
/*  Dialog helpers                                                     */
/* ================================================================== */

function opts(entries, sel) {
    return entries.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`).join("");
}
const readForm = P.readForm;
function rootOf(html) { return html instanceof HTMLElement ? html : (html?.[0] ?? html); }

async function dialog(title, content, label, callback, { width = 460, render = null } = {}) {
    const r = await P.ask({
        title, content, width, classes: ["vta-dialog"], onRender: render,
        buttons: [{ id: "ok", label, icon: "fas fa-dice-d10", default: true }, { id: "cancel", label: "Cancel" }]
    });
    if (!r || r.id !== "ok") return null;
    try { return await callback(r.data, null); }
    catch (e) { console.error(e); ui.notifications.error(`VtDA20 Actions: ${e.message}`); return null; }
}

function resolveActor(a) {
    if (a?.actor) return a.actor;
    if (a instanceof Actor) return a;
    return canvas.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}
function targetActor(t) {
    if (t?.actor) return t.actor;
    if (t instanceof Actor) return t;
    return [...(game.user.targets ?? [])][0]?.actor ?? null;
}
function needActor(a) {
    const actor = resolveActor(a);
    if (!actor) ui.notifications.warn("VtDA20 Actions: select a token or assign a character first.");
    return actor;
}

/* ================================================================== */
/*  Pools: Attribute + Ability, or a special Trait                     */
/* ================================================================== */

const SPECIAL_POOLS = {
    willpower: "Willpower (rating)", road: "Road rating", conscience: "Conscience / Conviction",
    selfcontrol: "Self-Control / Instinct", courage: "Courage", none: "— none —",
    rage: "Rage (permanent)", gnosis: "Gnosis (permanent)", glamour: "Glamour (permanent)", banality: "Banality (permanent)",
    pathos: "Pathos", angst: "Angst", arete: "Arete", faith: "Faith", conviction: "Conviction"
};
function specialValue(actor, key) {
    const v = virtues(actor);
    switch (key) {
        case "willpower": return { value: willpower(actor).perm, label: "Willpower" };
        case "road": return { value: road(actor).value, label: road(actor).name };
        case "conscience": return { value: Math.min(v.conscience.value, road(actor).value || 10), label: v.conscience.label };
        case "selfcontrol": {
            let n = Math.min(v.selfcontrol.value, road(actor).value || 10);
            if (isVampire(actor)) n = Math.min(n, blood(actor).value);
            return { value: n, label: v.selfcontrol.label };
        }
        case "courage": return { value: Math.min(v.courage.value, road(actor).value || 10), label: "Courage" };
        default: {
            const r = P.resource(actor, key);
            if (r.ok) return { value: r.perm || r.value || r.max || 0, label: r.label };
            return { value: 0, label: "" };
        }
    }
}
function poolSelectors(actor, prefix = "", sel = {}) {
    const attrOpts = [["", "— none —"], ...ATTRS.map(a => [a, `${game.i18n.localize(`wod.attributes.${a}`).replace(/^wod\..*/, cap(a))} (${attr(actor, a)})`]),
        ...Object.entries(SPECIAL_POOLS).filter(([k]) => k !== "none")
            .filter(([k]) => ["willpower", "road", "conscience", "selfcontrol", "courage"].includes(k) ? true : P.resource(actor, k).ok)
            .map(([k, l]) => [`special:${k}`, `${l} (${specialValue(actor, k).value})`])];
    const ab = abilityList(actor);
    const abOpts = [["", "— none —"], ...ab.map(a => [a.id, `${a.name} (${a.value})${a.specialty ? ` [${a.specialty}]` : ""}`])];
    return `
    <div class="form-group"><label>Attribute / Trait</label><select name="${prefix}attr">${opts(attrOpts, sel.attr ?? "dexterity")}</select></div>
    <div class="form-group"><label>Ability</label><select name="${prefix}ability">${opts(abOpts, sel.ability ?? "")}</select></div>`;
}
/** Resolve a dialog's selection into numbers. */
function readPool(actor, attrSel, abilitySel) {
    let attribute = 0, attributeLabel = "", special = null;
    if (attrSel?.startsWith("special:")) {
        const s = specialValue(actor, attrSel.slice(8));
        attribute = s.value; attributeLabel = s.label; special = attrSel.slice(8);
    } else if (attrSel) { attribute = attr(actor, attrSel); attributeLabel = cap(attrSel); }
    const ab = abilityById(actor, abilitySel);
    return { attribute, attributeLabel, special, ability: ab?.value ?? 0, abilityLabel: ab?.name ?? "", abilityType: ab?.type ?? "", abilityKey: ab ? ab.key : null, specialty: ab?.specialty || "" };
}

/* ================================================================== */
/*  Dramatic systems presets (p. 332-339)                              */
/* ================================================================== */

const PRESETS = {
    "": { label: "— Custom roll —" },
    climbing: { label: "Climbing (Dex + Athletics, extended)", attr: "dexterity", ability: "athletics", diff: 6, mode: "extended", target: 5, note: "3 yards/meters per success on an average climb (5 easy, 2 hard). Protean claws or bone spurs: –2 difficulty. Botch: slip, stuck or fall." },
    riding: { label: "Riding (Dex + Ride)", attr: "dexterity", ability: "ride", diff: 6, note: "Rough terrain +1, at speed +3. Failure: roll again to keep control. Botch: thrown and hurt." },
    driving: { label: "Driving a cart (Dex + Ride)", attr: "dexterity", ability: "ride", diff: 6, note: "Rain or crowds +1; fast while losing pursuers +3. Botch: lose control of the team." },
    intrusion: { label: "Intrusion / lockpicking (Dex + Larceny)", attr: "dexterity", ability: "larceny", diff: 7, note: "5 for standard locks up to 9 for the Tower of London. Most attempts need tools." },
    jumping: { label: "Jumping (Str + Athletics, running)", attr: "strength", ability: "athletics", diff: 3, note: "Each success: 20 in/50 cm up or 1 yard/meter across. Failure: Dex + Athletics (6) to catch a ledge." },
    jumpstand: { label: "Jumping (Strength, standing)", attr: "strength", ability: "", diff: 3, note: "Each success: 20 in/50 cm up or 1 yard/meter across." },
    lifting: { label: "Lifting beyond Strength (Willpower, diff 9)", attr: "special:willpower", ability: "", diff: 9, lifting: true, note: "Each success moves one step up the Strength feats chart. Teamwork: combine successes." },
    door: { label: "Forcing a door (Strength, extended)", attr: "strength", ability: "", diff: 7, mode: "extended", target: 5, note: "Interior door 1 success, reinforced 5, vault 10+. Difficulty 6–8 by material. Botch: one lethal level to the shoulder." },
    swimming: { label: "Swimming (Sta + Athletics)", attr: "stamina", ability: "athletics", diff: 6, note: "Roll after the first hour; one success needed. Needs Athletics 1." },
    throwing: { label: "Throwing (Dex + Athletics)", attr: "dexterity", ability: "athletics", diff: 6, note: "Range Strength × 5 yards for ≤1 kg. Difficulty 6 to half range, 7 beyond." },
    pursuit: { label: "Pursuit (Dex + Athletics, extended & resisted)", attr: "dexterity", ability: "athletics", diff: 6, mode: "extended", target: 10, opp: { attr: "dexterity", ability: "athletics", diff: 6 }, note: "Quarry starts with 1 free success per 2 yards ahead (10 yards mounted). Pursuer catches up on exceeding the quarry's total." },
    shadowing: { label: "Shadowing (Dex + Stealth vs Per + Alertness)", attr: "dexterity", ability: "stealth", diff: 6, mode: "resisted", opp: { attr: "perception", ability: "alertness", diff: 6, needMore: true }, note: "The target must beat the shadow's successes by one to spot the tail." },
    sneaking: { label: "Sneaking (Dex + Stealth vs Per + Alertness)", attr: "dexterity", ability: "stealth", diff: 6, mode: "resisted", opp: { attr: "perception", ability: "alertness", diff: 6, needMore: true }, note: "Undetected unless observers score more successes." },
    awareness: { label: "Noticing (Per + Alertness)", attr: "perception", ability: "alertness", diff: 6 },
    creation: { label: "Creation (Per + Expression/Craft)", attr: "perception", ability: "craft", diff: 6, note: "1 success mediocre … 5 a masterpiece." },
    investigation: { label: "Investigation (Per + Investigation)", attr: "perception", ability: "investigation", diff: 6 },
    repair: { label: "Repair (Dex + Craft, extended)", attr: "dexterity", ability: "craft", diff: 6, mode: "extended", target: 3, note: "Simple 4 to rebuilding a carriage 9; 10 minutes per success needed." },
    research: { label: "Research (Int + Academics/Occult/Theology)", attr: "intelligence", ability: "academics", diff: 6 },
    tracking: { label: "Tracking (Per + Survival)", attr: "perception", ability: "survival", diff: 6, note: "Each success on the quarry's Wits + Survival to cover tracks adds +1 difficulty." },
    carousing: { label: "Carousing (Cha + Empathy)", attr: "charisma", ability: "empathy", diff: 6, aura: true },
    credibility: { label: "Credibility / a scam (Man + Subterfuge vs Per + Subterfuge)", attr: "manipulation", ability: "subterfuge", diff: 7, mode: "resisted", opp: { attr: "perception", ability: "subterfuge", diff: 7, needMore: true }, aura: true },
    fasttalk: { label: "Fast-Talk (Man + Subterfuge vs Willpower)", attr: "manipulation", ability: "subterfuge", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true, note: "On a tie, more babbling is needed." },
    interrogate: { label: "Interrogation, peaceful (Man + Empathy vs Willpower)", attr: "manipulation", ability: "empathy", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true, note: "Each extra success reveals more; exceeding the subject's Willpower rating: she tells everything." },
    torture: { label: "Interrogation, violent (Man + Intimidation vs Sta + 3 or Willpower)", attr: "manipulation", ability: "intimidation", diff: 6, mode: "resisted", opp: { best: ["willpower", "stamina+3"], diff: 6 }, aura: true, note: "The subject loses a health level per turn of physical torture or a Willpower point per turn of mental torture." },
    intimidate: { label: "Intimidation, subtle (Man + Intimidation vs Willpower)", attr: "manipulation", ability: "intimidation", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true },
    threaten: { label: "Intimidation, blatant (Str + Intimidation vs Willpower or Str + Intimidation)", attr: "strength", ability: "intimidation", diff: 6, mode: "resisted", opp: { best: ["willpower", "strength+intimidation"], diff: 6 }, aura: true },
    oration: { label: "Oration (Cha + Leadership)", attr: "charisma", ability: "leadership", diff: 6, aura: true, note: "A prepared speech (Int + Expression, diff 7) lowers the difficulty by one." },
    performance: { label: "Performance (Cha + Performance)", attr: "charisma", ability: "performance", diff: 7, aura: true },
    hunting: { label: "Hunting → use the Hunt action", redirect: "hunt" },
    seduction: { label: "Seduction → use the Seduction action", redirect: "seduction" }
};

Object.assign(PRESETS, PM.EXTRA_PRESETS);

/* ================================================================== */
/*  General action                                                     */
/* ================================================================== */

export async function action({ actor: a, preset = "" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const target = targetActor();
    const rd = road(actor);
    const day = !!flag(actor, "daytime");
    const presetOpts = Object.entries(PRESETS).map(([k, p]) => [k, p.label]);
    const content = `<form>
      <div class="form-group"><label>Dramatic system</label><select name="preset">${opts(presetOpts, preset)}</select></div>
      <p class="vta-note vta-preset-note"></p>
      ${poolSelectors(actor)}
      <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/></div>
      <div class="form-group"><label>Type of action</label><select name="mode">${opts([["simple", "Simple"], ["extended", "Extended"], ["resisted", "Resisted"], ["teamwork", "Teamwork"]], "simple")}</select></div>
      <div class="form-group vta-ext"><label>Successes needed (extended)</label><input type="number" name="goal" value="5" min="1"/></div>
      <div class="form-group vta-team"><label>Helpers' successes (e.g. 2,1,0) / helper limit</label><input type="text" name="helpers" value=""/> <input type="number" name="helperLimit" value="3" style="width:4em"/></div>
      <fieldset class="vta-opp"><legend>Opponent ${target ? `(${esc(target.name)})` : "(no target: enter dice)"}</legend>
        <div class="form-group"><label>Opponent pool</label><select name="oppPool">${opts([["preset", "As the dramatic system says"], ["willpower", "Willpower"], ["manual", "Manual dice"]], "preset")}</select></div>
        <div class="form-group"><label>Manual dice / difficulty</label><input type="number" name="oppDice" value="3" style="width:4em"/> <input type="number" name="oppDiff" value="6" style="width:4em"/></div>
      </fieldset>
      <div class="form-group"><label>Bonus dice / extra difficulty</label><input type="number" name="bonus" value="0" style="width:4em"/> <input type="number" name="extraDiff" value="0" style="width:4em"/></div>
      <div class="form-group"><label>Multiple actions: action # / retries</label>
        <select name="multi">${opts([[0, "Only action"], [1, "1st of several"], [2, "2nd"], [3, "3rd"]], 0)}</select> <input type="number" name="retries" value="0" min="0" style="width:4em"/></div>
      <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success) [${willpower(actor).temp}]</label></div>
      <div class="form-group"><label><input type="checkbox" name="ignoreWounds"/> Spend Willpower to ignore wound penalties (${woundPenalty(actor)})</label></div>
      <div class="form-group"><label><input type="checkbox" name="aura"/> Apply Road aura (${rd.name} ${rd.value}: ${R.auraModifier(rd.value) >= 0 ? "+" : ""}${R.auraModifier(rd.value)})</label></div>
      ${isVampire(actor) ? `<div class="form-group"><label><input type="checkbox" name="daytime" ${day ? "checked" : ""}/> Acting during the day (pool capped at Road)</label></div>` : ""}
      <div class="form-group"><label><input type="checkbox" name="auto"/> Take an automatic success if pool ≥ difficulty</label></div>
      <div class="form-group"><label>Description</label><input type="text" name="desc" value=""/></div>
    </form>`;
    const render = root => {
        const form = root.querySelector("form");
        const f = new Proxy({}, { get: (_, n) => form.querySelector(`[name="${n}"]`) });
        const sync = () => {
            const mode = f.mode.value;
            root.querySelector(".vta-ext").style.display = mode === "extended" ? "" : "none";
            root.querySelector(".vta-team").style.display = mode === "teamwork" ? "" : "none";
            root.querySelector(".vta-opp").style.display = (mode === "resisted" || (mode === "extended" && PRESETS[f.preset.value]?.opp)) ? "" : "none";
        };
        f.preset.addEventListener("change", () => {
            const p = PRESETS[f.preset.value];
            if (!p) return;
            if (p.redirect) { ui.notifications.info(`Use the ${cap(p.redirect)} action for this.`); return; }
            if (p.attr !== undefined) f.attr.value = p.attr;
            const ab = p.ability ? findAbility(actor, p.ability) : null;
            f.ability.value = ab ? ab.id : "";
            if (p.ability && !ab) ui.notifications.info(`${actor.name} has no ${cap(p.ability)} ability on the sheet.`);
            if (p.diff) f.diff.value = p.diff;
            f.mode.value = p.mode || "simple";
            if (p.target) f.goal.value = p.target;
            f.aura.checked = !!p.aura;
            root.querySelector(".vta-preset-note").textContent = p.note || "";
            sync();
        });
        f.mode.addEventListener("change", sync);
        if (preset) f.preset.dispatchEvent(new Event("change"));
        sync();
    };
    return dialog("VtDA20 Action", content, "Roll", fd => resolveAction(actor, target, fd), { render, width: 500 });
}

function opponentPool(target, spec, fd) {
    if (fd.oppPool === "manual" || !target) return { dice: fd.oppDice, diff: fd.oppDiff, label: "Opponent" };
    if (fd.oppPool === "willpower") return { dice: willpower(target).perm, diff: spec?.diff ?? fd.oppDiff, label: "Willpower" };
    if (!spec) return { dice: willpower(target).perm, diff: fd.oppDiff, label: "Willpower" };
    const calc = s => {
        if (s === "willpower") return { dice: willpower(target).perm, label: "Willpower" };
        if (s === "stamina+3") return { dice: attr(target, "stamina") + 3, label: "Stamina + 3" };
        if (s === "strength+intimidation") return { dice: attr(target, "strength") + (findAbility(target, "intimidation")?.value ?? 0), label: "Strength + Intimidation" };
        return { dice: 0, label: s };
    };
    if (spec.best) {
        const all = spec.best.map(calc).sort((a, b) => b.dice - a.dice);
        return { ...all[0], diff: spec.diff };
    }
    if (spec.pool) return { ...calc(spec.pool), diff: spec.diff };
    const ab = findAbility(target, spec.ability);
    return { dice: attr(target, spec.attr) + (ab?.value ?? 0), diff: spec.diff, label: `${cap(spec.attr)} + ${ab?.name ?? cap(spec.ability)}`, specialty: false };
}

async function resolveAction(actor, target, fd) {
    const preset = PRESETS[fd.preset] ?? {};
    const pool = readPool(actor, fd.attr, fd.ability);
    const rd = road(actor);
    let teamDice = 0, overflow = 0;
    if (fd.mode === "teamwork") {
        const t = R.teamwork(String(fd.helpers || "").split(/[ ,;]+/).filter(Boolean).map(num), fd.helperLimit || Infinity);
        teamDice = t.dice; overflow = t.overflow;
    }
    const built = R.actionPool({
        attribute: pool.attribute, attributeLabel: pool.attributeLabel,
        ability: pool.ability, abilityLabel: pool.abilityLabel,
        abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey,
        bonusDice: fd.bonus, extraDiff: fd.extraDiff, baseDifficulty: fd.diff,
        woundPenalty: pool.special ? 0 : woundPenalty(actor), ignoreWounds: fd.ignoreWounds,
        multiIndex: num(fd.multi), retries: fd.retries, aura: fd.aura ? R.auraModifier(rd.value) : 0,
        daytimeCap: fd.daytime ? rd.value : null, teamworkDice: teamDice, teamworkOverflow: overflow
    });
    if (built.blocked) { ui.notifications.warn(built.blocked); return post(actor, `${actor.name}: ${esc(fd.desc || preset.label || "Action")}`, `<div class="vta-warn">${built.blocked}</div>`); }
    const wpCost = (fd.wp ? 1 : 0) + (fd.ignoreWounds ? 1 : 0);
    if (wpCost && !(await spendWillpower(actor, wpCost))) return null;
    if (fd.ignoreWounds) await updateActor(actor, { "system.conditions.isignoringpain": true });

    const title = `${actor.name}: ${esc(fd.desc || (preset.label ? preset.label.split(" (")[0] : "Action"))}`;
    const label = [pool.attributeLabel, pool.abilityLabel].filter(Boolean).join(" + ");
    if (fd.auto && built.autoSuccessAllowed && fd.mode === "simple") {
        return post(actor, title, `<div class="vta-sec"><b>${label}</b> (${built.dice} dice vs ${built.difficulty}): automatic success (p. 323).</div>${preset.note ? `<div class="vta-note">${preset.note}</div>` : ""}`);
    }
    const r = await rollPool(built.dice, built.difficulty, { specialty: fd.specialty, willpower: fd.wp });
    const rolls = [r.roll];
    let body = rollBlock(label || "Pool", r, built.parts.concat(fd.specialty ? ["specialty"] : [], fd.wp ? ["Willpower"] : []), fd.specialty);

    // Resisted
    if (fd.mode === "resisted") {
        const op = opponentPool(target, preset.opp, fd);
        const o = await rollPool(op.dice, op.diff);
        rolls.push(o.roll);
        body += rollBlock(`${target ? esc(target.name) : "Opponent"} (${op.label})`, o);
        const needMore = preset.opp?.needMore;
        const res = R.resisted(r, o);
        let txt;
        if (needMore) {
            // Opponent must score MORE successes to detect / resist.
            txt = (o.successes > r.successes && !o.botch) || r.botch ? `${target ? esc(target.name) : "The opponent"} notices / sees through it.` : `${actor.name} succeeds: the opponent does not notice.`;
        } else if (res.tie) txt = "Tie: neither side succeeds.";
        else txt = res.winner === "a" ? `${actor.name} wins by ${res.margin} (${R.degree(res.margin)}).` : `${target ? esc(target.name) : "The opponent"} resists (by ${res.margin}).`;
        if (fd.preset === "interrogate" || fd.preset === "torture") {
            if (res.winner === "a" && target && res.margin > willpower(target).perm) txt += ` Extra successes exceed ${esc(target.name)}'s Willpower: she reveals everything.`;
        }
        body += `<div class="vta-big">${txt}</div>`;
    }
    // Lifting
    if (preset.lifting) {
        const lvl = attr(actor, "strength") + (r.botch ? 0 : r.successes);
        const f = R.liftingFeat(lvl);
        body += `<div class="vta-big">${f ? `Effective Strength ${f.level}: ${f.feat} (${f.kg} kg)` : "Nothing moves"}</div>`;
    }
    if (preset.note) body += `<div class="vta-note">${preset.note}</div>`;

    // Extended: create a tracker card
    if (fd.mode === "extended") {
        const state = R.extendedStep({ total: 0, target: fd.goal }, r);
        const data = { kind: "extended", actor: actor.uuid, title, dice: built.dice, diff: built.difficulty, specialty: !!fd.specialty, state, label, note: preset.note || "" };
        if (preset.opp && (target || fd.oppPool === "manual")) {
            const op = opponentPool(target, preset.opp, fd);
            const o = await rollPool(op.dice, op.diff);
            rolls.push(o.roll);
            const os = R.extendedStep({ total: 0, target: fd.goal }, o);
            data.opp = { uuid: target?.uuid ?? null, name: target?.name ?? "Opponent", dice: op.dice, diff: op.diff, label: op.label, state: os };
            body += rollBlock(`${data.opp.name} (${op.label})`, o);
        }
        body += extendedStatus(data);
        return post(actor, title, body, rolls, data);
    }
    return post(actor, title, body, rolls);
}

function extendedStatus(d) {
    const s = d.state;
    let t = `<div class="vta-big">${s.failed ? "Botch: successes lost. " : ""}${s.total} / ${s.target} successes after ${s.rolls} roll${s.rolls === 1 ? "" : "s"}</div>`;
    if (d.opp) t += `<div class="vta-res">${esc(d.opp.name)}: ${d.opp.state.total} / ${d.opp.state.target}</div>`;
    const done = s.done || d.opp?.state.done;
    if (done) {
        if (d.opp && d.opp.state.done && !s.done) t += `<div class="vta-big bad">${esc(d.opp.name)} reaches the goal first.</div>`;
        else if (d.opp && s.done && d.opp.state.done) t += `<div class="vta-big">Both reach the goal this interval.</div>`;
        else t += `<div class="vta-big good">Complete!</div>`;
    } else t += `<div>${btn("extended", "Roll the next interval")}</div>`;
    return t;
}

async function continueExtended(msg, d) {
    const actor = await fromUuid(d.actor);
    if (!actor?.isOwner) return ui.notifications.warn("Only the character's owner can continue this action.");
    const r = await rollPool(d.dice, d.diff, { specialty: d.specialty });
    const rolls = [r.roll];
    const nd = foundry.utils.deepClone(d);
    nd.state = R.extendedStep(d.state, r);
    let body = rollBlock(`${d.label} — interval ${nd.state.rolls}`, r, [], d.specialty);
    if (d.opp) {
        const o = await rollPool(d.opp.dice, d.opp.diff);
        rolls.push(o.roll);
        nd.opp.state = R.extendedStep(d.opp.state, o);
        body += rollBlock(`${esc(d.opp.name)} (${d.opp.label})`, o);
    }
    if (nd.state.note) body += `<div class="vta-warn">${nd.state.note}</div>`;
    body += extendedStatus(nd);
    await markUsed(msg);
    return post(actor, d.title, body, rolls, nd);
}
async function markUsed(msg, action = null) {
    if (!(msg.isOwner || game.user.isGM)) return;
    const used = [...(msg.getFlag(MOD, "used") || [])];
    const re = action ? new RegExp(`<button type="button" class="vta-btn" data-action="${action}">[^<]*<\\/button>`, "g")
        : /<button type="button" class="vta-btn"[^>]*>[^<]*<\/button>/g;
    used.push(action ?? "*");
    await msg.update({ [`flags.${MOD}.used`]: used, content: msg.content.replace(re, "") });
}

/* ================================================================== */
/*  Frenzy & Rötschreck                                                */
/* ================================================================== */

export async function frenzy({ actor: a, provocation = "physical", difficulty = null, hungry = false } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const v = virtues(actor), rd = road(actor), b = blood(actor);
    const golconda = !!flag(actor, "golconda");
    const content = `<form>
      <p>${esc(actor.name)}: ${v.selfcontrol.label} ${v.selfcontrol.value}, ${v.conscience.label} ${v.conscience.value}, ${rd.name} ${rd.value}, blood ${b.value}${golconda ? " — <b>Golconda: immune to frenzy</b>" : ""}</p>
      <div class="form-group"><label>Provocation</label><select name="prov">${opts(Object.entries(R.FRENZY_PROVOCATIONS).map(([k, p]) => [k, `${p.label}${p.diff ? ` (${p.diff})` : ""}`]), provocation)}</select></div>
      <div class="form-group"><label>Difficulty (custom)</label><input type="number" name="diff" value="${difficulty ?? 6}"/></div>
      <div class="form-group"><label>Difficulty modifier (drugs –1, Intimidation powers +n…)</label><input type="number" name="mod" value="0"/></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
    </form>`;
    return dialog(`${v.selfcontrol.isInstinct ? "Instinct" : "Frenzy"} check`, content, "Roll", async fd => {
        if (golconda) return post(actor, `${actor.name} resists frenzy`, `<div class="vta-big good">Golconda: the Beast is mastered: no frenzy.</div>`);
        const p = R.FRENZY_PROVOCATIONS[fd.prov];
        let diff = p?.diff ?? fd.diff;
        if (fd.prov === "atrocity") diff = 9 - v.conscience.value;
        if (fd.prov === "custom") diff = fd.diff;
        diff = R.clampDifficulty(diff + fd.mod);
        return beastRoll(actor, { kind: v.selfcontrol.isInstinct ? "instinct" : "frenzy", diff, prov: p?.label ?? "Frenzy", wp: fd.wp, total: 0 });
    });
}

export async function rotschreck({ actor: a, provocation = "torch" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const v = virtues(actor), rd = road(actor);
    const content = `<form>
      <p>${esc(actor.name)}: Courage ${v.courage.value}, ${rd.name} ${rd.value}</p>
      <div class="form-group"><label>Provocation</label><select name="prov">${opts(Object.entries(R.ROTSCHRECK_PROVOCATIONS).map(([k, p]) => [k, `${p.label} (${p.diff})`]), provocation)}</select></div>
      <div class="form-group"><label>Difficulty (custom)</label><input type="number" name="diff" value="6"/></div>
      <div class="form-group"><label>Difficulty modifier</label><input type="number" name="mod" value="0"/></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
    </form>`;
    return dialog("Rötschreck check", content, "Roll", async fd => {
        if (flag(actor, "golconda")) return post(actor, `${actor.name} faces the flame`, `<div class="vta-big good">Golconda: immune to Rötschreck.</div>`);
        if (actor.system?.conditions?.isfrenzy && flag(actor, "frenzyType") !== "fear")
            return post(actor, `${actor.name} faces the flame`, `<div class="vta-big">Already in frenzy: immune to Rötschreck (p. 357).</div>`);
        const p = R.ROTSCHRECK_PROVOCATIONS[fd.prov];
        const diff = R.clampDifficulty((fd.prov === "custom" ? fd.diff : p.diff) + fd.mod);
        return beastRoll(actor, { kind: "fear", diff, prov: p.label, wp: fd.wp, total: 0 });
    });
}

async function beastRoll(actor, d, msg = null) {
    const v = virtues(actor), rd = road(actor), b = blood(actor);
    const fear = d.kind === "fear";
    const virtueVal = fear ? v.courage.value : v.selfcontrol.value;
    const vp = R.virtuePool(virtueVal, { road: rd.value || 10, blood: b.value, bloodLimited: !fear && isVampire(actor) });
    if (d.wp && !(await spendWillpower(actor, 1))) d.wp = false;
    const r = await rollPool(vp.dice, d.diff, { willpower: d.wp });
    const vLabel = fear ? "Courage" : v.selfcontrol.label;
    let body = `<div class="vta-sub">${esc(d.prov)}</div>` + rollBlock(vLabel, r, vp.caps.length ? [`capped by ${vp.caps.join(" and ")}`] : []);
    let state = null, enter = false, data = null;
    if (d.kind === "instinct") {
        const res = R.instinctResult(r);
        enter = true;
        body += `<div class="vta-big ${res === "ride" ? "good" : "bad"}">${res === "ride" ? "Rides the wave: the vampire frenzies but directs the Beast (chooses targets, may stop when the threat is gone)." :
            res === "botch" ? "Botch: the Beast takes over until the Storyteller says otherwise; a Derangement may follow." : "Uncontrolled frenzy."}</div>`;
        if (res !== "ride") body += `<div class="vta-note">Failing to ride the wave is a sin on several Roads of the Beast.</div>`;
    } else {
        state = R.beastStep({ total: d.total }, r);
        if (state.outcome === "resisted") body += `<div class="vta-big good">${state.total} successes accumulated: the ${fear ? "fear" : "Beast"} subsides.</div>`;
        else if (state.outcome === "holding") {
            body += `<div class="vta-big">Held off for ${state.turns} turn${state.turns === 1 ? "" : "s"} (${state.total}/5 successes). Roll again before then to keep resisting.</div>`;
            data = { kind: "beast", actor: actor.uuid, d: { ...d, total: state.total, wp: false } };
            body += btn("beast", "Keep resisting");
        } else {
            enter = true;
            body += fear
                ? `<div class="vta-big bad">${state.outcome === "botch" ? "Botch: immediate frenzy, lasting until the Storyteller decides." : "Rötschreck! She flees blindly toward safety, tearing through anyone in the way."}</div>`
                : `<div class="vta-big bad">${state.outcome === "botch" ? "Botch: frenzy until the Storyteller decides; she may gain a Derangement." : "Frenzy! The Beast does exactly what it wants."}</div>`;
        }
    }
    if (enter) {
        body += `<div class="vta-note">In frenzy: ignore wound penalties; +2 difficulty to Dominate her, –2 to resist it; immune to Rötschreck. A Willpower point controls one action for a turn. Usually lasts a scene.${!fear && d.kind !== "instinct" ? " Frenzying without risking a Road dot can bring a Moment of Truth." : ""}</div>`;
        if (setting("applyChanges")) { await updateActor(actor, { "system.conditions.isfrenzy": true }); await setFlag(actor, "frenzyType", fear ? "fear" : "rage"); }
        body += btn("endfrenzy", "End frenzy");
        data = { kind: "endfrenzy", actor: actor.uuid };
    }
    if (msg) await markUsed(msg);
    return post(actor, `${actor.name}: ${fear ? "Rötschreck" : d.kind === "instinct" ? "Instinct" : "Frenzy"} check`, body, [r.roll], data);
}

export async function endFrenzy({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    await updateActor(actor, { "system.conditions.isfrenzy": false });
    await setFlag(actor, "frenzyType", null);
    return post(actor, `${actor.name} regains control`, `<div class="vta-note">The frenzy ends. Wound penalties return. Consider a sin check for anything done while the Beast ruled.</div>`);
}

/* ================================================================== */
/*  Sins against the Road (p. 113)                                     */
/* ================================================================== */

export async function sin({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const v = virtues(actor), rd = road(actor);
    const content = `<form>
      <p>${esc(actor.name)} — ${esc(rd.name)} ${rd.value}, ${v.conscience.label} ${v.conscience.value}</p>
      <div class="form-group"><label>Sin level (from the Road's hierarchy)</label><input type="number" name="level" value="${Math.max(1, rd.value)}" min="1" max="10"/></div>
      <div class="form-group"><label>The sin</label><input type="text" name="desc" value=""/></div>
      <div class="form-group"><label>On failure, lose</label><select name="lose">${opts([["road", "A Road dot"], ["conscience", `A ${v.conscience.label} dot`], ["selfcontrol", `A ${v.selfcontrol.label} dot`], ["courage", "A Courage dot"]], "road")}</select></div>
      <div class="form-group"><label><input type="checkbox" name="automatic"/> Automatic loss (e.g. murder on a Road that forbids it, diablerie)</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
    </form>`;
    return dialog("Sin against the Road", content, "Roll", async fd => {
        const chk = R.sinCheck(rd.value, fd.level);
        const title = `${actor.name}: ${fd.desc ? esc(fd.desc) : `level ${fd.level} sin`}`;
        if (!fd.automatic && !chk.roll) return post(actor, title, `<div class="vta-note">${chk.reason}</div>`);
        let body = "", rolls = [], fail = true;
        if (fd.automatic) body += `<div class="vta-warn">The loss is automatic: no roll.</div>`;
        else {
            if (fd.wp && !(await spendWillpower(actor, 1))) fd.wp = false;
            const vp = R.virtuePool(v.conscience.value, { road: rd.value || 10 });
            const r = await rollPool(vp.dice, chk.difficulty, { willpower: fd.wp });
            rolls.push(r.roll);
            body += rollBlock(v.conscience.label, r, [`base 6 + ${rd.value - fd.level} (Road ${rd.value} – sin ${fd.level})`].concat(chk.rawDifficulty > 10 ? ["capped at 10"] : []));
            fail = r.successes === 0;
            if (r.botch) body += `<div class="vta-note">Botch: the Storyteller may add a Derangement tied to the sin.</div>`;
        }
        if (!fail) {
            body += `<div class="vta-big good">She rationalizes the sin; the Road holds.</div>`;
            if (chk.momentOfTruth) body += `<div class="vta-note">A major sin resisted can spark a Moment of Truth (half-cost Road increase this story).</div>`;
        } else {
            const path = fd.lose === "road" ? "system.advantages.path.permanent" : `system.advantages.virtues.${fd.lose}.permanent`;
            const cur = fd.lose === "road" ? rd.value : v[fd.lose].value;
            const label = fd.lose === "road" ? rd.name : v[fd.lose].label;
            if (setting("applyChanges")) await updateActor(actor, { [path]: Math.max(0, cur - 1) });
            body += `<div class="vta-big bad">${esc(label)} falls from ${cur} to ${Math.max(0, cur - 1)}.</div>`;
            if (fd.lose === "road") body += `<div class="vta-note">New aura modifier: ${R.auraModifier(Math.max(0, cur - 1))}. Penance after losing a dot can lead to a Moment of Truth.</div>`;
            if (fd.lose === "road" && cur - 1 <= 0) body += `<div class="vta-warn">Road 0: the Beast has won: the character is lost (Wassail).</div>`;
        }
        return post(actor, title, body, rolls);
    });
}

/* ================================================================== */
/*  Hunting & feeding (p. 334, 340-341)                               */
/* ================================================================== */

export async function hunt({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const b = blood(actor), v = virtues(actor);
    const content = `<form>
      <p>${esc(actor.name)} — blood ${b.value}/${b.max}; hungry below ${7 - v.selfcontrol.value} (7 – ${v.selfcontrol.label})</p>
      <div class="form-group"><label>Hunting ground</label><select name="area">${opts(Object.entries(R.HUNTING_GROUNDS).map(([k, g]) => [k, `${g.label} (${g.diff})`]), "market")}</select></div>
      ${poolSelectors(actor, "", { attr: "wits", ability: findAbility(actor, "streetwise")?.id ?? findAbility(actor, "subterfuge")?.id ?? "" })}
      <div class="form-group"><label>Fame / Domain / Herd</label>
        <input type="number" name="fame" value="${background(actor, "Fame")}" style="width:3.5em"/> <input type="number" name="domain" value="${background(actor, "Domain")}" style="width:3.5em"/> <input type="number" name="herd" value="${background(actor, "Herd")}" style="width:3.5em"/></div>
      <div class="form-group"><label>Inhumanity / other difficulty</label><input type="number" name="inhuman" value="0"/></div>
      <div class="form-group"><label>Hours available</label><input type="number" name="hours" value="3" min="1"/></div>
      <div class="form-group"><label>Prey</label><select name="vessel">${opts(Object.entries(R.VESSELS).map(([k, x]) => [k, `${x.label} (${x.pool})`]), "human")}</select></div>
      <div class="form-group"><label>Blood to take (0 = until sated)</label><input type="number" name="take" value="2" min="0"/></div>
      <div class="form-group"><label><input type="checkbox" name="dieWorth"/> Storyteller option: prey yields one die's worth of blood</label></div>
      <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
    </form>`;
    return dialog("VtDA20 Hunt", content, "Hunt", fd => resolveHunt(actor, fd), { width: 500 });
}

async function resolveHunt(actor, fd) {
    const pool = readPool(actor, fd.attr, fd.ability);
    const hp = R.huntingPool({ area: fd.area, fame: fd.fame, domain: fd.domain, herd: fd.herd, inhuman: fd.inhuman });
    const built = R.actionPool({ attribute: pool.attribute, attributeLabel: pool.attributeLabel, ability: pool.ability, abilityLabel: pool.abilityLabel,
        abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey, bonusDice: hp.bonusDice, baseDifficulty: hp.difficulty,
        woundPenalty: woundPenalty(actor) });
    const rolls = [];
    let body = `<div class="vta-sub">${R.HUNTING_GROUNDS[fd.area].label}: difficulty ${hp.difficulty}${fd.fame || fd.domain ? ` (Fame/Domain –${fd.fame + fd.domain}, min 3)` : ""}${fd.herd ? `, Herd +${fd.herd} dice` : ""}</div>`;
    let caught = false;
    for (let h = 1; h <= Math.max(1, fd.hours); h++) {
        const r = await rollPool(built.dice, built.difficulty, { specialty: fd.specialty });
        rolls.push(r.roll);
        body += rollBlock(`Hour ${h}`, r, h === 1 ? built.parts : [], fd.specialty);
        if (r.botch) { body += `<div class="vta-warn">Botch: a complication: witnesses, a rival's herd, the Watch, a hunter…</div>`; break; }
        if (r.successes > 0) { caught = true; break; }
    }
    if (!caught) return post(actor, `${actor.name} hunts`, body + `<div class="vta-big">No prey this night${fd.hours > 1 ? " (time spent)" : ""}.</div>`, rolls);
    body += `<div class="vta-big good">Prey caught: ${R.VESSELS[fd.vessel].label}.</div>`;
    let take = fd.take;
    if (fd.dieWorth) { const d = await rollPool(1, 11); rolls.push(d.roll); take = d.faces[0] ?? 1; body += `<div class="vta-note">One die's worth of blood: ${take}.</div>`; }
    const fed = await feedResolve(actor, { vesselType: fd.vessel, take, vesselActor: null, rolls });
    return post(actor, `${actor.name} hunts`, body + fed.html, rolls);
}

export async function feed({ actor: a, vessel: t } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const vessel = targetActor(t);
    const vb = vessel ? blood(vessel) : null;
    const content = `<form>
      <p>${esc(actor.name)} feeds${vessel ? ` from <b>${esc(vessel.name)}</b> (blood ${vb.value})` : " (no target selected)"}</p>
      <div class="form-group"><label>Vessel</label><select name="vessel">${opts(Object.entries(R.VESSELS).map(([k, x]) => [k, `${x.label} (${x.pool})`]), vessel && isVampire(vessel) ? "vampire" : "human")}</select></div>
      <div class="form-group"><label>Blood points to drink (0 = until sated)</label><input type="number" name="take" value="2" min="0"/></div>
      <div class="form-group"><label>Minutes the blood has been outside a living body</label><input type="number" name="cold" value="0" min="0"/></div>
    </form>`;
    return dialog("VtDA20 Feed", content, "Feed", async fd => {
        const rolls = [];
        const fed = await feedResolve(actor, { vesselType: fd.vessel, take: fd.take, vesselActor: vessel, cold: fd.cold, rolls });
        return post(actor, `${actor.name} feeds${vessel ? ` on ${esc(vessel.name)}` : ""}`, fed.html, rolls);
    });
}

/** Shared feeding: hunger check, amount, vessel risk, blood pool, Blood Oath. */
async function feedResolve(actor, { vesselType, take, vesselActor, cold = 0, rolls }) {
    let html = "";
    const v = virtues(actor), b = blood(actor);
    const vessel = R.VESSELS[vesselType] ?? R.VESSELS.human;
    let vesselPool = vesselActor ? blood(vesselActor).value : vessel.pool;
    if (vesselActor && profile(vesselActor) === "mortal") {
        const dmg = healthTrack(vesselActor).damage;
        vesselPool = Math.max(0, vesselPool - (dmg.bashing + dmg.lethal + dmg.aggravated));
        if (dmg.bashing + dmg.lethal + dmg.aggravated) html += `<div class="vta-note">Injured mortal: one fewer blood point per health level of damage.</div>`;
    }
    let gorge = false;
    if (isVampire(actor) && R.isHungry(b.value, v.selfcontrol.value) && !flag(actor, "golconda")) {
        const vp = R.virtuePool(v.selfcontrol.value, { road: road(actor).value || 10, blood: b.value, bloodLimited: true });
        const r = await rollPool(vp.dice, 6);
        rolls.push(r.roll);
        html += rollBlock(`Hunger: ${v.selfcontrol.label} (blood ${b.value} &lt; ${7 - v.selfcontrol.value})`, r, vp.caps.length ? [`capped by ${vp.caps.join(", ")}`] : []);
        if (v.selfcontrol.isInstinct) {
            if (r.successes === 0) gorge = true;
            html += `<div class="vta-res">${gorge ? "She cannot steer the Beast: she gorges." : "She rides the hunger and stops when she chooses."}</div>`;
        } else {
            gorge = r.successes === 0;
            html += `<div class="vta-res">${gorge ? "Hunger frenzy: she gorges until sated, the vessel dies, or she regains control." : "She keeps control."}</div>`;
        }
    }
    const room = b.max - b.value;
    let want = gorge || !take ? room : Math.min(take, room);
    let drunk = Math.min(want, Math.floor(vesselPool));
    const minutes = cold || 0;
    const effective = R.bloodGained(drunk, { minutesDead: minutes });
    const turns = Math.ceil(drunk / 3);
    html += `<div class="vta-sec"><b>Drinks ${drunk} blood point${drunk === 1 ? "" : "s"}</b> (${turns} turn${turns === 1 ? "" : "s"} at up to 3 per turn)${minutes >= 10 ? ` — cold blood: worth ${effective}` : ""}.</div>`;
    if (vessel.pool < 1) html += `<div class="vta-note">A ${vessel.label.toLowerCase()} holds only ${vessel.pool} blood point.</div>`;
    const gain = vessel.pool < 1 ? 0 : effective;
    if (gain) {
        const ch = await changeBlood(actor, gain);
        html += `<div class="vta-res good">Blood pool ${ch.before} → ${ch.after}</div>`;
    }
    // The vessel
    const vRemaining = vesselPool - drunk;
    if (vesselActor && setting("applyChanges")) await updateActor(vesselActor, { "system.advantages.bloodpool.temporary": Math.max(0, blood(vesselActor).value - drunk) });
    if (["human", "child"].includes(vesselType) || (vesselActor && profile(vesselActor) === "mortal")) {
        const risk = R.vesselRisk(vesselActor ? attr(vesselActor, "stamina") : 2, drunk);
        if (risk) {
            const r = await rollPool(risk.dice, risk.difficulty);
            rolls.push(r.roll);
            html += rollBlock(`Vessel: Stamina – ${drunk - 2}`, r);
            html += `<div class="vta-res ${r.successes ? "" : "bad"}">${r.botch ? "Botch: the vessel will die without immediate, severe care." : r.successes ? "The vessel stays conscious." : "The vessel passes out."}</div>`;
        }
        if (vRemaining <= 0) html += `<div class="vta-warn">The vessel is drained dry and dies. Murder is a sin on most Roads: consider a sin check.</div>`;
        html += `<div class="vta-note">Mortals recover one blood point per day.</div>`;
    }
    if (drunk > 0 && (vesselType === "vampire" || (vesselActor && isVampire(vesselActor)))) {
        html += `<div class="vta-note">Cainite vitae: this drink is a step of the Blood Oath toward ${vesselActor ? esc(vesselActor.name) : "the donor"}. A Cainite victim may roll Self-Control/Instinct (diff 8) to resist the Kiss.</div>`;
        if (vesselActor) html += await oathStep(actor, vesselActor);
    }
    return { html, drunk };
}

/* ================================================================== */
/*  Spending blood (p. 332, 340)                                       */
/* ================================================================== */

export async function spendBlood({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const b = blood(actor), dmg = healthTrack(actor).damage, rd = road(actor);
    const quick = flag(actor, "quickening") ?? {};
    const content = `<form>
      <p>${esc(actor.name)} — blood ${b.value}/${b.max}, ${b.perTurn} per turn (Generation ${generationOf(actor)}). Health: ${healthText(actor, dmg)}</p>
      <fieldset><legend>Healing</legend>
        <div class="form-group"><label>Lethal / bashing levels to heal (1 blood each)</label><input type="number" name="healL" value="${Math.min(dmg.lethal, b.value)}" style="width:4em"/> <input type="number" name="healB" value="${Math.min(dmg.bashing, Math.max(0, b.value - dmg.lethal))}" style="width:4em"/></div>
        <div class="form-group"><label><input type="checkbox" name="acting"/> Heal while doing something else (Stamina + Survival, diff 8)</label></div>
        <div class="form-group"><label>Aggravated levels (5 blood + a day's rest each)</label><input type="number" name="healA" value="0" min="0"/></div>
      </fieldset>
      <fieldset><legend>Quickening (+1 Physical dot per blood, for the scene)</legend>
        <div class="form-group"><label>Strength / Dexterity / Stamina</label>
          <input type="number" name="qStr" value="0" style="width:3.5em"/> <input type="number" name="qDex" value="0" style="width:3.5em"/> <input type="number" name="qSta" value="0" style="width:3.5em"/></div>
        ${Object.keys(quick).length ? `<p class="vta-note">Active: ${Object.entries(quick).map(([k, n]) => `${cap(k)} +${n}`).join(", ")}</p>` : ""}
      </fieldset>
      <fieldset><legend>Other</legend>
        <div class="form-group"><label><input type="checkbox" name="imitate"/> Imitate life for the scene (${R.imitateLifeCost(rd.value)} blood at ${esc(rd.name)} ${rd.value})</label></div>
        <div class="form-group"><label>Discipline / power cost</label><input type="number" name="disc" value="0" min="0"/> <input type="text" name="discName" placeholder="power" style="width:9em"/></div>
        <div class="form-group"><label>Give to targeted character (transference / ghouling)</label><input type="number" name="give" value="0" min="0"/></div>
      </fieldset>
    </form>`;
    return dialog("Spend Blood", content, "Spend", fd => resolveSpend(actor, fd), { width: 520 });
}

async function resolveSpend(actor, fd) {
    const b = blood(actor), rd = road(actor);
    const rolls = [];
    let html = "", spent = 0;
    const lethal = Math.max(0, fd.healL), bashing = Math.max(0, fd.healB), agg = Math.max(0, fd.healA);
    const q = { strength: Math.max(0, fd.qStr), dexterity: Math.max(0, fd.qDex), stamina: Math.max(0, fd.qSta) };
    const qTotal = q.strength + q.dexterity + q.stamina;
    const imitate = fd.imitate ? R.imitateLifeCost(rd.value) : 0;
    const total = lethal + bashing + agg * 5 + qTotal + imitate + Math.max(0, fd.disc) + Math.max(0, fd.give);
    if (total > b.value) { ui.notifications.warn(`${actor.name} has only ${b.value} blood (needs ${total}).`); return null; }
    if (!total) return null;

    // Healing
    const dmg = healthTrack(actor).damage;
    const healL = Math.min(lethal, dmg.lethal), healB = Math.min(bashing, dmg.bashing), healA = Math.min(agg, dmg.aggravated);
    let healOK = true;
    if ((healL + healB) && fd.acting) {
        const r = await rollPool(attr(actor, "stamina") + (findAbility(actor, "survival")?.value ?? 0), 8);
        rolls.push(r.roll);
        html += rollBlock("Healing while acting: Stamina + Survival", r);
        if (r.successes === 0) {
            healOK = false;
            html += `<div class="vta-warn">${r.botch ? "Botch: the blood is wasted, one more blood point is lost, and she takes a health level." : "Failure: the blood is spent with no effect."}</div>`;
            if (r.botch) { spent += 1; await applyDamage(actor, "lethal", 1); }
        }
    }
    spent += healL + healB;
    if (healL + healB && healOK) {
        const after = { ...dmg, lethal: dmg.lethal - healL, bashing: dmg.bashing - healB };
        if (setting("applyChanges")) await setDamage(actor, after);
        html += `<div class="vta-sec"><b>Heals</b> ${healL} lethal and ${healB} bashing (${healL + healB} blood). Now ${healthText(actor, after)}.</div>`;
    }
    if (healA) {
        spent += healA * 5;
        const pend = flag(actor, "aggHealing") ?? 0;
        await setFlag(actor, "aggHealing", pend + healA);
        html += `<div class="vta-sec"><b>Aggravated:</b> ${healA * 5} blood committed; ${healA} level${healA === 1 ? "" : "s"} heal after a full day's rest. They will be removed at the next New Night.</div>`;
    }
    const turns = Math.ceil((healL + healB) / b.perTurn);
    if (turns > 1) html += `<div class="vta-note">At ${b.perTurn} blood per turn, healing takes ${turns} turns of concentration.</div>`;

    // Quickening
    if (qTotal) {
        spent += qTotal;
        const cur = flag(actor, "quickening") ?? {};
        const upd = {};
        const maxT = R.generation(generationOf(actor)).maxTrait + 1;
        const bits = [];
        for (const [k, n] of Object.entries(q)) {
            if (!n) continue;
            const at = actor.system.attributes[k];
            upd[`system.attributes.${k}.bonus`] = num(at.bonus) + n;
            upd[`system.attributes.${k}.total`] = num(at.total ?? at.value) + n;
            cur[k] = (cur[k] || 0) + n;
            const newVal = num(at.total ?? at.value) + n;
            bits.push(`${cap(k)} ${newVal}${newVal > maxT ? ` (above ${maxT}: fades three turns after she stops spending)` : ""}`);
        }
        if (setting("applyChanges")) { await updateActor(actor, upd); await setFlag(actor, "quickening", cur); }
        html += `<div class="vta-sec"><b>Quickening:</b> ${bits.join(", ")} for the scene. Announce before rolling.</div>`;
    }
    if (imitate) { spent += imitate; html += `<div class="vta-sec"><b>Imitates life</b> for the scene: warmth, breath, blush (${imitate} blood).</div>`; }
    if (fd.disc) { spent += fd.disc; html += `<div class="vta-sec"><b>Discipline:</b> ${fd.disc} blood${fd.discName ? ` for ${esc(fd.discName)}` : ""}.</div>`; }
    if (fd.give) {
        const t = targetActor();
        spent += fd.give;
        if (t) {
            const tb = blood(t);
            if (setting("applyChanges")) await updateActor(t, { "system.advantages.bloodpool.temporary": Math.min(tb.max || 10, tb.value + fd.give) });
            html += `<div class="vta-sec"><b>Gives</b> ${fd.give} blood to ${esc(t.name)}.</div>`;
            html += await oathStep(t, actor);
            if (!isVampire(t)) html += `<div class="vta-note">A mortal who drinks Cainite blood becomes a ghoul (p. 399).</div>`;
        } else html += `<div class="vta-sec"><b>Gives</b> ${fd.give} blood (no target selected).</div>`;
    }
    const ch = await changeBlood(actor, -spent);
    html += `<div class="vta-big">Blood ${ch.before} → ${ch.after}</div>`;
    if (spent > b.perTurn) html += `<div class="vta-note">More than ${b.perTurn} blood per turn: this takes ${Math.ceil(spent / b.perTurn)} turns.</div>`;
    return post(actor, `${actor.name} spends blood`, html, rolls);
}

/* ================================================================== */
/*  Blood Oath (p. 342)                                                */
/* ================================================================== */

async function oathStep(thrall, regnant) {
    const bonds = foundry.utils.deepClone(flag(thrall, "oaths") ?? {});
    const key = regnant.uuid.replace(/\./g, "_");
    const cur = bonds[key] ?? { name: regnant.name, uuid: regnant.uuid, stage: 0, drinks: 0 };
    if (Object.values(bonds).some(b => b.stage >= 3 && b.uuid !== regnant.uuid)) {
        cur.drinks += 1;
        bonds[key] = cur;
        await setFlag(thrall, "oaths", bonds);
        return `<div class="vta-note">${esc(thrall.name)} is already fully Oath-bound to another; no new bond forms.</div>`;
    }
    cur.stage = Math.min(3, cur.stage + 1);
    cur.drinks += 1;
    cur.lastDrink = game.time.worldTime;
    bonds[key] = cur;
    if (cur.stage >= 3) for (const k of Object.keys(bonds)) if (k !== key) delete bonds[k];
    if (setting("applyChanges")) {
        if (thrall.isOwner) { await thrall.unsetFlag(MOD, "oaths"); await thrall.setFlag(MOD, "oaths", bonds); }
        else await setFlag(thrall, "oaths", bonds);
    }
    return `<div class="vta-sec"><b>Blood Oath:</b> ${esc(thrall.name)} → ${esc(regnant.name)}, stage ${cur.stage}. ${R.OATH_STAGES[cur.stage]}</div>`;
}

export async function bloodOath({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const bonds = flag(actor, "oaths") ?? {};
    const list = Object.entries(bonds);
    const wp = willpower(actor);
    const content = `<form>
      <p>${esc(actor.name)} — Willpower ${wp.perm} (${wp.temp} left). A bond fades one step after ${R.oathDecayMonths(wp.perm)} months without drinking.</p>
      ${list.length ? `<table class="vta-table"><tr><th>Regnant</th><th>Stage</th><th>Drinks</th></tr>${list.map(([k, b]) => `<tr><td>${esc(b.name)}</td><td>${b.stage}</td><td>${b.drinks}</td></tr>`).join("")}</table>` : "<p><i>No bonds recorded.</i></p>"}
      <div class="form-group"><label>Action</label><select name="act">${opts([["resist", "Resist the bond (Willpower roll, then spend Willpower)"], ["drink", "Record a drink from the targeted Cainite"], ["fade", "Bond fades one step (months apart)"], ["clear", "Break the bond completely"]], "resist")}</select></div>
      <div class="form-group"><label>Bond</label><select name="bond">${opts(list.map(([k, b]) => [k, `${b.name} (stage ${b.stage})`]), list[0]?.[0])}</select></div>
      <div class="form-group"><label>Nature / treatment modifiers (kindness +, cruelty –)</label><input type="number" name="nature" value="0" style="width:4em"/> <input type="number" name="treat" value="0" style="width:4em"/></div>
      <div class="form-group"><label>Rebellion</label><select name="scope">${opts([["scene", "Plot against / betray (one scene)"], ["turn", "Attack the regnant (one turn)"]], "scene")}</select></div>
    </form>`;
    return dialog("Blood Oath", content, "Go", async fd => {
        const b = bonds[fd.bond];
        if (fd.act === "drink") {
            const t = targetActor();
            if (!t) return ui.notifications.warn("Target the regnant first.");
            return post(actor, `${actor.name} drinks Cainite blood`, await oathStep(actor, t));
        }
        if (!b) return ui.notifications.warn("No bond selected.");
        if (fd.act === "fade" || fd.act === "clear") {
            const nb = foundry.utils.deepClone(bonds);
            if (fd.act === "clear" || b.stage <= 1) delete nb[fd.bond]; else nb[fd.bond].stage -= 1;
            await actor.unsetFlag(MOD, "oaths"); await actor.setFlag(MOD, "oaths", nb);
            return post(actor, `${actor.name}'s bond to ${esc(b.name)}`, `<div class="vta-res">${nb[fd.bond] ? `Fades to stage ${nb[fd.bond].stage}.` : "The bond is gone."}</div>`);
        }
        const od = R.oathResistDifficulty({ timesFed: b.drinks, natureMod: fd.nature, treatmentMod: fd.treat });
        const r = await rollPool(wp.perm, od.difficulty);
        let html = rollBlock("Willpower", r, [`8 + ${b.drinks} drinks${fd.nature ? ` ${fd.nature >= 0 ? "+" : ""}${fd.nature} Nature` : ""}${fd.treat ? ` ${fd.treat >= 0 ? "+" : ""}${fd.treat} treatment` : ""}`].concat(od.raw > 10 ? ["capped at 10"] : []));
        if (r.successes > 0) {
            const ok = await spendWillpower(actor, 1);
            html += ok ? `<div class="vta-big good">The bond is set aside for ${fd.scope === "turn" ? "one turn" : "one scene"}. Spend more Willpower to extend it.</div>`
                : `<div class="vta-warn">No Willpower left to spend: the bond holds.</div>`;
        } else html += `<div class="vta-big bad">Love wins; the bond holds.</div>`;
        return post(actor, `${actor.name} resists the Blood Oath to ${esc(b.name)}`, html, [r.roll]);
    });
}

/* ================================================================== */
/*  Daytime, torpor, nightly upkeep                                    */
/* ================================================================== */

export async function daytime({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const ausp = discipline(actor, "Auspex"), rd = road(actor);
    const content = `<form>
      <p>${esc(actor.name)} is disturbed during the day. ${esc(rd.name)} ${rd.value}${ausp ? `, Auspex ${ausp}` : ""}.</p>
      <div class="form-group"><label><input type="checkbox" name="notice" checked/> Roll Perception${ausp ? " + Auspex" : ""} (diff 8) to notice the disturbance first</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower on the Road roll</label></div>
    </form>`;
    return dialog("Awakening during the day", content, "Roll", async fd => {
        const rolls = [];
        let html = "";
        if (fd.notice) {
            const n = await rollPool(attr(actor, "perception") + ausp, 8);
            rolls.push(n.roll);
            html += rollBlock(`Perception${ausp ? " + Auspex" : ""}`, n);
            if (!n.successes) return post(actor, `${actor.name} sleeps on`, html + `<div class="vta-big">The disturbance goes unnoticed.</div>`, rolls);
        }
        if (fd.wp && !(await spendWillpower(actor, 1))) fd.wp = false;
        const r = await rollPool(rd.value, 8, { willpower: fd.wp });
        rolls.push(r.roll);
        html += rollBlock(rd.name, r);
        const res = R.awakeningResult(r);
        html += `<div class="vta-big ${res.awake ? "good" : "bad"}">${res.text}</div>`;
        if (res.awake) {
            html += `<div class="vta-note">While active by day, no dice pool may exceed her Road rating (${rd.value}). Enabled on the Action dialog.</div>`;
            await setFlag(actor, "daytime", { turns: res.turns === Infinity ? "scene" : res.turns });
        }
        return post(actor, `${actor.name} stirs by day`, html, rolls);
    });
}

export async function torpor({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const rd = road(actor), t = flag(actor, "torpor"), tl = R.torporLength(rd.value), b = blood(actor);
    const elapsed = t ? Math.floor((game.time.worldTime - (t.since ?? 0)) / 86400) : 0;
    const content = `<form>
      <p>${esc(actor.name)} — ${esc(rd.name)} ${rd.value}: torpor lasts <b>${tl.text}</b>. Blood ${b.value}.</p>
      ${t ? `<p>In ${t.voluntary ? "voluntary " : ""}torpor since ${elapsed} day(s) of game time ago (minimum ${t.voluntary ? Math.ceil(t.days / 2) : t.days} days).</p>` : ""}
      <div class="form-group"><label>Action</label><select name="act">${opts(t ? [["rise", "Attempt to rise (1 blood, Road roll diff 8)"], ["wake", "Wake without a roll (fed / Storyteller)"]] : [["enter", "Enter torpor (from injury)"], ["voluntary", "Enter torpor voluntarily"]], t ? "rise" : "enter")}</select></div>
    </form>`;
    return dialog("Torpor", content, "Go", async fd => {
        if (fd.act === "enter" || fd.act === "voluntary") {
            const vol = fd.act === "voluntary";
            await setFlag(actor, "torpor", { since: game.time.worldTime, days: tl.days, voluntary: vol });
            await statusEffect(actor, "unconscious", true);
            return post(actor, `${actor.name} sinks into torpor`, `<div class="vta-big">${tl.text}${vol ? ` (may try to rise after ${Math.ceil(tl.days / 2)} days)` : ""}.</div><div class="vta-note">No blood is lost while in torpor. Rising from injury also needs blood from an outside source.</div>`);
        }
        if (fd.act === "wake") {
            await setFlag(actor, "torpor", null); await statusEffect(actor, "unconscious", false);
            return post(actor, `${actor.name} rises from torpor`, `<div class="vta-note">She rises Crippled and should heal or hunt at once.</div>`);
        }
        const minDays = t.voluntary ? Math.ceil(t.days / 2) : t.days;
        let html = "";
        if (elapsed < minDays) html += `<div class="vta-warn">Only ${elapsed} of ${minDays} days have passed (game time). Rolling anyway at the Storyteller's word.</div>`;
        if (b.value < 1) return post(actor, `${actor.name} cannot rise`, html + `<div class="vta-big bad">No blood in her body: she cannot rise until fed.</div>`);
        await changeBlood(actor, -1);
        const r = await rollPool(rd.value, 8);
        html += rollBlock(`${rd.name} (1 blood spent)`, r);
        if (r.successes) {
            await setFlag(actor, "torpor", null); await statusEffect(actor, "unconscious", false);
            html += `<div class="vta-big good">She rises: Crippled; heal or hunt immediately.</div>`;
        } else html += `<div class="vta-big bad">She sleeps on. Wait a night, spend another blood point, and try again.</div>`;
        return post(actor, `${actor.name} tries to rise from torpor`, html, [r.roll]);
    });
}

async function statusEffect(actor, id, active) {
    try {
        if (typeof actor.toggleStatusEffect === "function") return await actor.toggleStatusEffect(id, { active });
        const effect = CONFIG.statusEffects.find(e => e.id === id);
        for (const t of actor.getActiveTokens()) {
            const has = actor.effects?.some(e => e.getFlag?.("core", "statusId") === id || e.statuses?.has?.(id));
            if (effect && has !== active) await t.toggleEffect(effect, { active });
        }
    } catch (e) { console.warn(`${MOD} | status ${id}`, e); }
}

/** Clear scene-length effects: Quickening, ignoring pain, daytime activity. */
export async function endScene({ actors } = {}) {
    const list = actors ?? (canvas.tokens.controlled.length ? canvas.tokens.controlled.map(t => t.actor) : game.actors.filter(a => a.hasPlayerOwner && a.isOwner));
    const lines = [];
    for (const actor of list) {
        if (!actor?.isOwner) continue;
        const upd = {}, bits = [];
        const q = flag(actor, "quickening");
        if (q) {
            for (const [k, n] of Object.entries(q)) {
                const at = actor.system.attributes?.[k];
                if (!at) continue;
                upd[`system.attributes.${k}.bonus`] = Math.max(0, num(at.bonus) - n);
                upd[`system.attributes.${k}.total`] = num(at.total ?? at.value) - n;
                bits.push(`${cap(k)} –${n}`);
            }
        }
        if (actor.system?.conditions?.isignoringpain) { upd["system.conditions.isignoringpain"] = false; bits.push("wound penalties return"); }
        if (Object.keys(upd).length) await actor.update(upd);
        if (q) await actor.unsetFlag(MOD, "quickening");
        if (flag(actor, "daytime")) { await actor.unsetFlag(MOD, "daytime"); bits.push("daytime activity ends"); }
        if (bits.length) lines.push(`<li><b>${esc(actor.name)}</b>: ${bits.join(", ")}</li>`);
    }
    return post(null, "End of scene", lines.length ? `<ul>${lines.join("")}</ul>` : "<p>Nothing to clear.</p>");
}

/** A new night: rising costs one blood, one Willpower returns, aggravated wounds rested on heal. */
export async function newNight({ actors } = {}) {
    if (!game.user.isGM && !actors) return ui.notifications.warn("New Night is for the GM (or pass your own actors).");
    await endScene({ actors });
    const list = actors ?? game.actors.filter(a => a.hasPlayerOwner || canvas.tokens.placeables.some(t => t.actor?.id === a.id));
    const lines = [];
    for (const actor of list) {
        if (!actor?.isOwner) continue;
        const upd = {}, bits = [];
        const vamp = isVampire(actor);
        const inTorpor = !!flag(actor, "torpor");
        if (vamp && setting("nightlyBlood") && !inTorpor) {
            const gol = flag(actor, "golconda");
            const b = blood(actor);
            const weekly = gol && (flag(actor, "golcondaNights") ?? 0) % 7 !== 6;
            if (!weekly) {
                upd["system.advantages.bloodpool.temporary"] = Math.max(0, b.value - 1);
                bits.push(`blood ${b.value} → ${Math.max(0, b.value - 1)}`);
                if (b.value - 1 <= 0) bits.push("<b>no blood: ravenous, frenzy likely</b>");
            }
            if (gol) await actor.setFlag(MOD, "golcondaNights", (flag(actor, "golcondaNights") ?? 0) + 1);
        }
        if (!inTorpor) {
            const w = willpower(actor);
            if (w.temp < w.perm) { upd["system.advantages.willpower.temporary"] = w.temp + 1; bits.push(`Willpower ${w.temp} → ${w.temp + 1}`); }
        }
        const agg = flag(actor, "aggHealing");
        if (agg) {
            const d = healthTrack(actor).damage;
            const healed = Math.min(agg, d.aggravated);
            Object.assign(upd, healthUpdate(actor, { ...d, aggravated: d.aggravated - healed }));
            bits.push(`${healed} aggravated level${healed === 1 ? "" : "s"} heal`);
            await actor.unsetFlag(MOD, "aggHealing");
        }
        if (actor.system?.conditions?.isfrenzy) { upd["system.conditions.isfrenzy"] = false; await actor.unsetFlag(MOD, "frenzyType"); bits.push("frenzy over"); }
        if (Object.keys(upd).length) await actor.update(upd);
        if (vamp) {
            const rd = road(actor).value;
            bits.push(rd >= 7 ? "rises just before sunset" : rd <= 4 ? "rises up to an hour after sunset" : "rises at sunset");
        }
        if (inTorpor) bits.push("in torpor");
        if (bits.length) lines.push(`<li><b>${esc(actor.name)}</b>: ${bits.join(", ")}</li>`);
    }
    return post(null, "A new night", `<ul>${lines.join("")}</ul>`);
}

/* ================================================================== */
/*  Hazards: sunlight, fire, falling (p. 355-360)                      */
/* ================================================================== */

export async function hazard({ actor: a, kind = "sun" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const fort = discipline(actor, "Fortitude");
    const content = `<form>
      <p>${esc(actor.name)} — ${profile(actor)}, Fortitude ${fort}, Stamina ${attr(actor, "stamina")}</p>
      <div class="form-group"><label>Hazard</label><select name="kind">${opts([["sun", "Sunlight"], ["fire", "Fire"], ["fall", "Falling"]], kind)}</select></div>
      <div class="vta-k vta-sun"><div class="form-group"><label>Light</label><select name="light">${opts(Object.entries(R.SUNLIGHT_INTENSITY).map(([k, x]) => [k, `${x.label} (soak ${x.diff})`]), "direct")}</select></div>
        <div class="form-group"><label>Exposure</label><select name="exposure">${opts(Object.entries(R.SUNLIGHT_EXPOSURE).map(([k, x]) => [k, `${k}/turn: ${x}`]), 3)}</select></div></div>
      <div class="vta-k vta-fire"><div class="form-group"><label>Heat</label><select name="heat">${opts(Object.entries(R.FIRE_HEAT).map(([k, x]) => [k, `${x.label} (soak ${x.diff})`]), "torch")}</select></div>
        <div class="form-group"><label>Size</label><select name="size">${opts(Object.entries(R.FIRE_SIZE).map(([k, x]) => [k, `${k}/turn: ${x}`]), 1)}</select></div></div>
      <div class="vta-k vta-fall"><div class="form-group"><label>Distance (feet)</label><input type="number" name="feet" value="30"/></div>
        <div class="form-group"><label><input type="checkbox" name="sharp"/> Lands on something sharp (lethal)</label></div></div>
      <div class="vta-k vta-sun vta-fire"><div class="form-group"><label>Turns of exposure</label><input type="number" name="turns" value="1" min="1"/></div>
        <div class="form-group"><label><input type="checkbox" name="fortBlood"/> Spend blood: Fortitude soaks automatically (not vs. sun or fire)</label></div>
        <div class="form-group"><label><input type="checkbox" name="rot" checked/> Then check Rötschreck</label></div></div>
    </form>`;
    const render = root => {
        const f = { kind: root.querySelector('[name="kind"]') };
        const sync = () => root.querySelectorAll(".vta-k").forEach(el => el.style.display = el.classList.contains(`vta-${f.kind.value}`) ? "" : "none");
        f.kind.addEventListener("change", sync); sync();
    };
    return dialog("Sunlight, fire and falls", content, "Resolve", fd => resolveHazard(actor, fd), { render, width: 520 });
}

async function resolveHazard(actor, fd) {
    const p = profile(actor), fort = discipline(actor, "Fortitude");
    const rolls = [];
    let html = "", type, levels = 0;
    if (fd.kind === "fall") {
        const f = R.fallingDamage(fd.feet);
        type = fd.sharp ? "lethal" : f.type;
        const d = await rollPool(f.dice, 6, { canBotch: false });
        rolls.push(d.roll);
        html += rollBlock(`Falling ${fd.feet} ft: ${f.dice} dice ${type}`, d);
        let armor = armorRating(actor, type);
        if (f.halfArmor) armor = Math.floor(armor / 2);
        const sp = R.soakPool({ profile: p, damageType: type, stamina: attr(actor, "stamina"), fortitude: fort, armor });
        const s = await rollPool(sp.dice, 6, { canBotch: false });
        rolls.push(s.roll);
        html += rollBlock("Soak", s, [sp.stamina ? `Stamina ${sp.stamina}` : "", sp.fortitude ? `Fortitude ${sp.fortitude}` : "", armor ? `Armor ${armor}${f.halfArmor ? " (half)" : ""}` : ""].filter(Boolean).concat(sp.notes));
        const left = R.damageAfterSoak(d.successes, s.successes, type, p);
        levels = left.levels;
        if (left.halved) html += `<div class="vta-note">Cainite: bashing halved after soak.</div>`;
    } else {
        const sun = fd.kind === "sun";
        const perTurn = num(sun ? fd.exposure : fd.size);
        const diff = sun ? R.SUNLIGHT_INTENSITY[fd.light].diff : R.FIRE_HEAT[fd.heat].diff;
        type = p === "mortal" || p === "ghoul" ? "lethal" : "aggravated";
        html += `<div class="vta-sub">${sun ? R.SUNLIGHT_INTENSITY[fd.light].label : R.FIRE_HEAT[fd.heat].label}: ${perTurn} level${perTurn === 1 ? "" : "s"} per turn, automatically successful unless soaked; soak difficulty ${diff}.</div>`;
        const canSoak = p === "vampire" || p === "ghoul" ? fort > 0 : false;
        if (sun && !isVampire(actor)) { html += `<div class="vta-note">Sunlight does not harm the living.</div>`; return post(actor, `${actor.name}: sunlight`, html); }
        for (let t = 1; t <= Math.max(1, fd.turns); t++) {
            let soaked = 0;
            if (canSoak) {
                const s = await rollPool(fort, diff, { canBotch: false });
                rolls.push(s.roll);
                soaked = s.successes;
                html += rollBlock(`Turn ${t}: Fortitude soak`, s);
            } else html += `<div class="vta-sec">Turn ${t}: ${p === "vampire" ? "no Fortitude: cannot soak" : "mortals cannot soak fire"}</div>`;
            levels += Math.max(0, perTurn - soaked);
        }
        if (fd.fortBlood) html += `<div class="vta-note">The Fortitude blood auto-soak does not work against fire or sunlight.</div>`;
        if (!sun) html += `<div class="vta-note">Burns: at Mauled, Appearance –1 until healed to Bruised; at Crippled or worse, –2.</div>`;
    }
    html += `<div class="vta-big ${levels ? "bad" : "good"}">${levels ? `${levels} ${type} level${levels === 1 ? "" : "s"}` : "No damage"}</div>`;
    let data = null;
    if (levels) {
        if (setting("applyChanges")) {
            const res = await applyDamage(actor, type, levels);
            if (res?.after) html += `<div class="vta-res">Now ${healthText(actor, res.after)}${res.condition?.text ? ` — <b>${res.condition.text}</b>` : ""}</div>`;
        } else html += btn("damage", `Apply ${levels} ${type}`);
        data = { kind: "damage", actor: actor.uuid, type, levels };
    }
    if (fd.rot && fd.kind !== "fall" && isVampire(actor)) {
        html += btn("rotschreck", "Rötschreck check");
        data = { ...(data ?? {}), kind: data?.kind ?? "rotschreck", actor: actor.uuid, rotProv: fd.kind === "sun" ? (fd.light === "direct" ? "directsun" : "obscuredsun") : "burned" };
    }
    return post(actor, `${actor.name}: ${fd.kind === "sun" ? "sunlight" : fd.kind === "fire" ? "fire" : "falling"}`, html, rolls, data);
}

/* ================================================================== */
/*  Diablerie (p. 354-355)                                             */
/* ================================================================== */

export async function diablerie({ actor: a, victim: v } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const victim = targetActor(v);
    if (!victim) return ui.notifications.warn("Target the victim first.");
    const vb = blood(victim);
    const content = `<form>
      <p><b>${esc(actor.name)}</b> (Generation ${generationOf(actor)}) commits diablerie on <b>${esc(victim.name)}</b> (Generation ${generationOf(victim)}, blood ${vb.value}).</p>
      <p class="vta-note">All the victim's blood must be drained first. Then: extended Strength rolls (diff 9); each success is one unsoakable aggravated level. Attacks against the diablerist are at difficulty 2.</p>
      <div class="form-group"><label><input type="checkbox" name="drain" checked/> Drain the victim's remaining blood (${vb.value}) into the diablerist first</label></div>
    </form>`;
    return dialog("Diablerie", content, "Begin", async fd => {
        let html = "";
        if (fd.drain && vb.value) {
            const ch = await changeBlood(actor, vb.value);
            await updateActor(victim, { "system.advantages.bloodpool.temporary": 0 });
            html += `<div class="vta-sec">Drains ${vb.value} blood (pool ${ch.before} → ${ch.after}${ch.wasted > 0 ? `, ${ch.wasted} spilled beyond capacity` : ""}).</div>`;
        }
        return diablerieStep(actor, victim, html);
    });
}

async function diablerieStep(actor, victim, html = "", msg = null) {
    const r = await rollPool(attr(actor, "strength"), 9);
    html += rollBlock("Strength (soul-drawing)", r);
    if (r.successes) await applyDamage(victim, "aggravated", r.successes);
    const t = healthTrack(victim);
    const filled = t.damage.aggravated >= t.max;
    let data = null;
    if (!filled) {
        html += `<div class="vta-big">${esc(victim.name)}: ${t.damage.aggravated}/${t.max} aggravated. ${r.botch ? "Botch: the grip slips: the Storyteller decides whether the soul escapes." : "The struggle continues."}</div>`;
        html += btn("diablerie", "Keep drawing");
        data = { kind: "diablerie", actor: actor.uuid, victim: victim.uuid };
    } else {
        html += `<div class="vta-big bad">${esc(victim.name)}'s soul is consumed. The body begins to decay.</div>`;
        const rd = road(actor), v = virtues(actor);
        const vp = R.virtuePool(v.selfcontrol.value, { road: rd.value || 10, blood: blood(actor).value, bloodLimited: true });
        const c = await rollPool(vp.dice, R.diablerieControlDifficulty(rd.value));
        html += rollBlock(`Euphoria: ${v.selfcontrol.label} (10 – Road)`, c);
        html += `<div class="vta-res">${c.successes ? "She keeps control through the rapture." : "Overwhelmed by the Amaranth's ecstasy: she loses control."}</div>`;
        const vg = generationOf(victim), ag = generationOf(actor);
        if (vg < ag) {
            const drop = ag - vg >= 5 ? "one (or more, Storyteller's call)" : "one";
            if (setting("applyChanges")) await updateActor(actor, { "system.generation": num(actor.system.generation) - 1 });
            html += `<div class="vta-big good">Generation lowers by ${drop}: now ${ag - 1}.</div><div class="vta-note">Elder vitae may also raise Disciplines a dot or more for a scene.</div>`;
        } else html += `<div class="vta-note">The victim's blood was no stronger: no change of Generation.</div>`;
        html += `<div class="vta-note">Black veins mark her aura for ${Math.max(1, ag - vg)} year(s). Most Roads forbid murder: Road loss is automatic, not rolled.</div>`;
        html += btn("sin", "Record the sin");
        data = { kind: "sin", actor: actor.uuid };
        return post(actor, `${actor.name}: diablerie`, html, [r.roll, c.roll], data).then(async m => { if (msg) await markUsed(msg); return m; });
    }
    if (msg) await markUsed(msg);
    return post(actor, `${actor.name}: diablerie`, html, [r.roll], data);
}

/* ================================================================== */
/*  Seduction (p. 339)                                                 */
/* ================================================================== */

export async function seduction({ actor: a, target: t } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const target = targetActor(t);
    const g = k => target ? attr(target, k) : 2;
    const content = `<form>
      <p>${esc(actor.name)} seduces ${target ? `<b>${esc(target.name)}</b>` : "a mortal (no target: Attributes 2)"}.</p>
      <div class="form-group"><label>Target's Wits / Intelligence / Perception</label>
        <input type="number" name="wits" value="${g("wits")}" style="width:3.5em"/> <input type="number" name="int" value="${g("intelligence")}" style="width:3.5em"/> <input type="number" name="per" value="${g("perception")}" style="width:3.5em"/></div>
      <div class="form-group"><label><input type="checkbox" name="aura" checked/> Apply Road aura</label></div>
    </form>`;
    return dialog("Seduction", content, "Seduce", async fd => {
        const aura = fd.aura ? R.auraModifier(road(actor).value) : 0;
        const wpen = woundPenalty(actor);
        const steps = [
            ["Approach", "appearance", "subterfuge", fd.wits + 3, "The subject shows disinterest.", "The subject grows disgusted or angry."],
            ["Witty repartee", "wits", "subterfuge", fd.int + 3, "The subject breaks off but may be receptive later.", "The subject gains a dangerous insight about her."],
            ["Intimate conversation", "charisma", "empathy", fd.per + 3, "The subject breaks off but may be receptive later.", "A drink in the face."]
        ];
        let carry = 0, html = "";
        const rolls = [];
        for (const [name, at, ab, diff, fail, botch] of steps) {
            const dice = Math.max(0, attr(actor, at) + (findAbility(actor, ab)?.value ?? 0) + carry + wpen);
            const r = await rollPool(dice, R.clampDifficulty(diff + aura));
            rolls.push(r.roll);
            html += rollBlock(`${name}: ${cap(at)} + ${cap(ab)}`, r, [`difficulty ${diff}${aura ? ` ${aura > 0 ? "+" : ""}${aura} aura` : ""}`, carry ? `+${carry} carried` : ""].filter(Boolean));
            if (!r.successes) { html += `<div class="vta-big bad">${r.botch ? botch : fail}</div>`; return post(actor, `${actor.name}: seduction`, html, rolls); }
            carry = Math.max(0, r.successes - 1);
        }
        html += `<div class="vta-big good">Enamored: the subject agrees to go somewhere private.</div>`;
        return post(actor, `${actor.name}: seduction`, html, rolls);
    });
}

/* ================================================================== */
/*  Launcher                                                           */
/* ================================================================== */

const MENU = [
    ["action", "fa-dice-d10", "Action / Dramatic system"], ["hunt", "fa-paw", "Hunt"], ["feed", "fa-tint", "Feed on target"],
    ["spendBlood", "fa-heartbeat", "Spend blood"], ["frenzy", "fa-fire-alt", "Frenzy"], ["rotschreck", "fa-running", "Rötschreck"],
    ["endFrenzy", "fa-hand-paper", "End frenzy"], ["sin", "fa-balance-scale", "Sin / degeneration"], ["seduction", "fa-heart", "Seduction"],
    ["bloodOath", "fa-link", "Blood Oath"], ["daytime", "fa-sun", "Awaken by day"], ["hazard", "fa-burn", "Sun / fire / fall"],
    ["torpor", "fa-bed", "Torpor"], ["diablerie", "fa-skull", "Diablerie"], ["endScene", "fa-flag-checkered", "End scene"],
    ["newNight", "fa-moon", "New night (GM)"]
];

let PMX = null;
function pm() {
    return PMX ??= PM.build({
        post, rollPool, rollBlock, resultLine, diceHtml, API, action, updateActor, willpower, attr, findAbility, setting,
        spendWillpower, dialog, notify: m => ui.notifications.warn(m)
    });
}

/** The launcher: the buttons follow the actor's profile (Kindred, ghoul, mortal, Garou, mage, changeling, wraith...). */
export async function menu({ actor: a } = {}) {
    const actor = a?.actor ?? a ?? resolveActor();
    if (!actor) return ui.notifications.warn("VtDA20 Actions: select a token or assign a character first.");
    const legacy = !setting("profileMenu");
    let html;
    if (legacy) html = `<div class="vta-menu">${MENU.map(([k, i, l]) => `<button type="button" data-k="api:${k}"><i class="fas ${i}"></i> ${l}</button>`).join("")}</div>`;
    else html = (await pm().menuFor(actor)).html;
    const kind = P.detectProfile(actor);
    const r = await P.ask({
        title: `VtDA20 Actions — ${P.profileLabel(kind)}`, content: html, width: 460, classes: ["vta-dialog"],
        buttons: [{ id: "close", label: "Close", icon: "fas fa-times" }],
        onRender: (root, close) => {
            root.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", async () => {
                const spec = b.dataset.k;
                close();
                try { await pm().run(spec, actor); } catch (e) { console.error(e); ui.notifications.error(`VtDA20 Actions: ${e.message}`); }
            }));
            root.querySelector("button.vta-kind")?.addEventListener("click", async () => {
                close();
                if (await P.pickProfile(actor)) menu({ actor });
            });
        }
    });
    return r;
}

/* ================================================================== */
/*  Chat buttons                                                       */
/* ================================================================== */

async function onButton(msg, action) {
    const d = msg.getFlag(MOD, "kind") ? msg.flags[MOD] : null;
    const used = msg.getFlag(MOD, "used") || [];
    if (!d || used.includes("*") || used.includes(action)) return;
    const actor = d.actor ? await fromUuid(d.actor) : null;
    const owner = actor?.isOwner || game.user.isGM;
    if (!owner) return ui.notifications.warn("Only the character's owner or the GM can do that.");
    switch (action) {
        case "extended": return continueExtended(msg, d);
        case "beast": return beastRoll(actor, d.d, msg);
        case "endfrenzy": await markUsed(msg, "endfrenzy"); return endFrenzy({ actor });
        case "diablerie": return diablerieStep(actor, await fromUuid(d.victim), "", msg);
        case "sin": await markUsed(msg, "sin"); return sin({ actor });
        case "rotschreck": await markUsed(msg, "rotschreck"); return rotschreck({ actor, provocation: d.rotProv });
        case "damage": { await markUsed(msg, "damage"); const r = await applyDamage(actor, d.type, d.levels); return r?.after ? post(actor, `${actor.name} takes damage`, `<div class="vta-res">${d.levels} ${d.type}: ${healthText(actor, r.after)}</div>`) : null; }
    }
}
function bindCard(msg, el) {
    if (!el || el.dataset?.vtaBound) return;
    if (el.dataset) el.dataset.vtaBound = "1";
    el.querySelectorAll?.("button.vta-btn").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); onButton(msg, b.dataset.action); }));
}

/* ================================================================== */
/*  Macros & hooks                                                     */
/* ================================================================== */

const MACROS = [
    ["VtDA20: Actor Type", "icons/svg/mystery-man.svg", "const a = canvas.tokens.controlled[0]?.actor ?? game.user.character; if (a) game.vtda20actions.pickKind(a); else ui.notifications.warn('Select a token first.');"],
    ["VtDA20: Actions Menu", "icons/svg/book.svg", "game.vtda20actions.menu();"],
    ["VtDA20: Roll Action", "icons/svg/d10-grey.svg", "game.vtda20actions.action();"],
    ["VtDA20: Hunt", "icons/svg/blood.svg", "game.vtda20actions.hunt();"],
    ["VtDA20: Spend Blood", "icons/svg/regen.svg", "game.vtda20actions.spendBlood();"],
    ["VtDA20: Frenzy", "icons/svg/terror.svg", "game.vtda20actions.frenzy();"],
    ["VtDA20: Rötschreck", "icons/svg/fire.svg", "game.vtda20actions.rotschreck();"],
    ["VtDA20: New Night", "icons/svg/sun.svg", "game.vtda20actions.newNight();"]
];
async function createMacros() {
    if (!game.user.isGM || !setting("createMacros")) return;
    for (const [name, img, command] of MACROS) {
        if (game.macros.find(m => m.name === name)) continue;
        await Macro.create({ name, type: "script", img, command, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
    }
}

const API = { menu, action, hunt, feed, spendBlood, frenzy, rotschreck, endFrenzy, sin, daytime, torpor, hazard,
    bloodOath, diablerie, seduction, newNight, endScene, applyDamage, rules: R, presets: PRESETS,
    getKind: P.detectProfile, setKind: P.setProfile, pickKind: P.pickProfile, profiles: P, version: "2.2.1",
    uses: (o = {}) => pm().uses(o.actor ?? resolveActor(), o.resource ?? "willpower"), cantrip: (o = {}) => pm().cantrip(o.actor ?? resolveActor()),
    cast: (o = {}) => pm().cast(o.actor ?? resolveActor()), shift: (o = {}) => pm().shift(o.actor ?? resolveActor()), regen: (o = {}) => pm().regen(o.actor ?? resolveActor()) };

Hooks.once("init", () => {
    registerSettings();
    P.register();
    game.vtda20actions = API;
    const mod = game.modules.get(MOD);
    if (mod) mod.api = API;
    if (GEN() >= 13) Hooks.on("renderChatMessageHTML", (m, el) => { if (m.flags?.[MOD]) bindCard(m, el); });
    else Hooks.on("renderChatMessage", (m, html) => { if (m.flags?.[MOD]) bindCard(m, html[0] ?? html); });
});

Hooks.once("ready", async () => {
    if (game.system.id !== "worldofdarkness") console.warn(`${MOD} | designed for the worldofdarkness system (found ${game.system.id}).`);
    game.socket.on(SOCKET, onSocket);
    await createMacros();
});

Hooks.on("renderTokenHUD", (hud, html) => {
    const root = rootOf(html);
    const tok = hud.object;
    if (!tok?.actor?.isOwner || !root) return;
    const col = root.querySelector(".col.left");
    if (!col) return;
    const b = document.createElement("div");
    b.className = "control-icon vta-hud"; b.title = "VtDA20 Actions";
    b.innerHTML = '<i class="fas fa-book-dead"></i>';
    b.title = "VtDA20 Actions (right-click: set actor type)";
    b.addEventListener("click", () => menu({ actor: tok.actor }));
    b.addEventListener("contextmenu", ev => { ev.preventDefault(); P.pickProfile(tok.actor); });
    col.appendChild(b);
});
