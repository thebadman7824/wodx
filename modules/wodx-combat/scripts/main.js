/**
 * WoDX Combat Automation for the World of Darkness 20th Edition system (Foundry VTT).
 *
 * Automates the Vampire: The Dark Ages 20th Anniversary combat sequence:
 *   attack roll -> defense (dodge / block / parry) -> damage roll -> soak roll -> health track.
 *
 * Public API: game.wodxCombat
 *   attack({attacker, target, weaponId})   open the attack dialog (defaults: controlled token -> targeted token)
 *   soakDialog({tokens})                   soak & apply arbitrary damage (falls, fire, sunlight, traps)
 *   applyDamage(actor, type, levels)       write damage straight to the health track (no soak)
 *   healDamage(actor, type, levels)        remove damage
 *   rollInitiative({combat})               VtDA20 initiative for the active combat
 *   getProfile(actor)                      soak model: "vampire" | "ghoul" | "mortal" | "lupine" | "fae" | "wraith" | "spirit"
 *   getKind(actor)                         actor profile: kindred | ghoul | mortal | hunter | lupine | mage | fae | wraith | spirit | beast | demon | mummy | exalted
 *   setKind(actor, key|"auto")             override the detected profile (flag world.wodx.profile)
 *   pickKind(actor)                        dialog to choose the profile
 *   reload({actor, weaponId})             fill a ranged weapon and post the turns it takes (house rule "Count shots")
 *   menu / macros keep working from v1.x
 */

import * as R from "./rules.js";
import * as P from "./profiles.js";
import * as F from "./flavor.js";
import * as L from "./legacy.js";
import * as AU from "./auto.js";
import * as CD from "./conductor.js";
import * as CR from "./conductor-rules.js";
import * as ST from "./start.js";
import * as AM from "./ambush-rules.js";
import * as MVJ from "./movement.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
const esc = L.esc;

const MOD = "wodx-combat";
const SOCKET = `module.${MOD}`;
const GEN = () => game.release?.generation ?? 11;

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

function registerSettings() {
    // A new setting starts from the choice made in vtda20-combat, if there was one (nothing is written)
    const s = (key, name, hint, type, def, extra = {}) =>
        game.settings.register(MOD, key, { name, hint, scope: "world", config: true, type, default: L.oldSetting("vtda20-combat", key, def), ...extra });
    s("autoApply", "Apply damage automatically",
        "Write damage to the target's health track as soon as the attack resolves. Off: the chat card shows an Apply button.",
        Boolean, true);
    s("spendResources", "Deduct Willpower and blood",
        "Remove the Willpower and blood points spent in the attack and soak options from the character sheet.",
        Boolean, true);
    s("celerityDice", "Celerity adds dice to Dexterity rolls",
        "Add Celerity dots to Dexterity-based attack and defense pools (never to Initiative, V20 p. 142).", Boolean, true);
    s("potenceDice", "Potence adds dice to Strength damage",
        "Add Potence dots to Strength-based damage pools (blood spent turns them into automatic successes instead).",
        Boolean, true);
    s("statusEffects", "Set token status effects",
        "Mark tokens unconscious, in torpor or dead when the health track fills.", Boolean, true);
    s("createMacros", "Create hotbar macros",
        "On load, create the WoDX macros (Attack, Soak & Apply, Initiative) in the Macro directory if missing.",
        Boolean, true);
    s("showDice", "Show the dice in chat", "List each die face in the combat card.", Boolean, true);
    s("classicManeuvers", "Offer World of Darkness: Combat maneuvers",
        "Add Heavy/Quick Strike, Heavy/Quick Kick and Grapple from the 1996 supplement to the maneuver list (optional rules).",
        Boolean, false);
    s("showKindMenus", "Show actor-type options",
        "Show the attacker/defender type selectors and the type-specific options (Rage, Glamour, Pathos, banes...) in the attack dialog.",
        Boolean, true);
    s("autoInitiative", "Roll initiative automatically",
        "Roll everyone's initiative (d10 + Dexterity + Wits) when a fight starts, or at the start of every turn as VtDA20 does (printed p. 343).",
        String, "round", { choices: { round: "Every turn", start: "When the fight starts", off: "Off" } });
    s("flavorText", "Flavor text on attack cards",
        "Add one short line of description under the dice of each attack card, picked to fit the outcome (miss, hit, heavy hit, soaked, botch). Edit the lines in scripts/flavor.js.",
        String, "all", { choices: { all: "Shown to everyone", gm: "Whispered to the GM", off: "Off" } });
    game.settings.register(MOD, "countShots", { name: "Count shots and reloads (house rule)",
        hint: "Each shot uses one round from a ranged weapon that has a capacity on its sheet; an empty weapon must be reloaded first (one turn for a firearm, V20 p. 278; a crossbow takes longer). Bows and slings are never counted.",
        scope: "world", config: true, type: Boolean, default: false });
    s("movementLimit", "Movement in a fight",
        "Count each token's movement in yards during its turn of a fight (walk 7, jog 12 + Dexterity, run 20 + 3 × Dexterity, Celerity added, wounds limiting it; VtDA20 pp. 333, 351). Works on gridless scenes. Show the pace, or also stop a move past the running speed (the GM is never stopped).",
        String, "note", { choices: { note: "Show the pace", block: "Show it and stop moves past the running speed", off: "Off" } });
    s("turnMoves", "Moves out of turn",
        "In a fight, players move a character's token only on that character's turn (a character holding the action steps in first). The Storyteller can always move any token, for a dodge, a shove or a fall.",
        String, "off", { choices: CR.TURN_MOVES });
}
const setting = k => game.settings.get(MOD, k);
const countShots = () => { try { return !!game.settings.get(MOD, "countShots"); } catch (e) { return false; } };

/** post the flavor line: inside the card for everyone, or as a separate whisper to the GMs */
async function addFlavor(content, key, names, opts = {}) {
    let mode = "off";
    try { mode = setting("flavorText"); } catch (e) { mode = "all"; }
    if (mode === "off") return content;
    const text = F.line(key, names, opts);
    if (!text) return content;
    if (mode === "all") return content.replace(/<\/div>\s*$/, F.html(text) + "</div>");
    const gms = game.users.filter(u => u.isGM).map(u => u.id);
    await ChatMessage.create({ content: `<div class="vtc-card">${F.html(text)}</div>`, whisper: gms, speaker: { alias: "WoDX" } });
    return content;
}

/* ------------------------------------------------------------------ */
/*  Actor data adapter (system 3.x flat data and 4.x+ item-based data) */
/* ------------------------------------------------------------------ */

const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };

export function attr(actor, key) {
    const a = actor?.system?.attributes?.[key];
    if (!a) return 0;
    return num(a.total ?? a.value);
}

/** Returns { value, specialty, name } for a primary or secondary ability. */
export function ability(actor, key) {
    if (!actor || !key) return { value: 0, specialty: "", name: key };
    const flat = actor.system?.abilities?.[key];
    if (flat && flat.value !== undefined) return { value: num(flat.value), specialty: flat.speciality || "", name: key };
    // Item-based abilities (newer system versions)
    const it = actor.items.find(i => (i.type === "Ability" || i.type === "Trait") &&
        (i.system?.id === key || i.name.toLowerCase() === key.toLowerCase()));
    if (it) return { value: num(it.system?.value), specialty: it.system?.speciality || "", name: it.name };
    return { value: 0, specialty: "", name: key };
}

/** Value of a secondary ability item (e.g. Archery) referenced by a weapon. */
function secondaryAbility(actor, id, fallbackName) {
    let it = id ? actor.items.get(id) : null;
    if (!it && fallbackName) it = actor.items.find(i => i.name.toLowerCase() === fallbackName.toLowerCase());
    if (!it) return { value: 0, specialty: "", name: fallbackName || "Secondary ability" };
    return { value: num(it.system?.value), specialty: it.system?.speciality || "", name: it.name };
}

export function discipline(actor, name) {
    const override = actor?.getFlag?.(MOD, name.toLowerCase());
    if (override !== undefined && override !== null) return num(override);
    const it = actor?.items?.find(i => i.type === "Power" &&
        (i.system?.type === "wod.types.discipline" || i.system?.type === "wod.types.disciplinepath" || !i.system?.type) &&
        i.name.trim().toLowerCase().startsWith(name.toLowerCase()));
    return it ? num(it.system?.value) : 0;
}

export function armor(actor) {
    const out = { bashing: 0, lethal: 0, aggravated: 0, names: [] };
    for (const i of actor?.items ?? []) {
        // Implants (WoDX Library cyberware) are always worn
        if (i.type !== "Armor" || !(i.system?.isequipped || i.flags?.["wodx-library"]?.implant)) continue;
        out.bashing += num(i.system.soak?.bashing);
        out.lethal += num(i.system.soak?.lethal);
        out.aggravated += num(i.system.soak?.aggravated);
        out.names.push(i.name);
    }
    return out;
}

function willpower(actor) { return num(actor?.system?.advantages?.willpower?.temporary); }
function blood(actor) { return num(actor?.system?.advantages?.bloodpool?.temporary); }

function woundPenalty(actor) {
    const p = num(actor?.system?.health?.damage?.woundpenalty);
    return p;
}

function healthTrack(actor) {
    const h = actor?.system?.health ?? {};
    const totals = {}, penalties = {}, labels = {};
    for (const k of R.WOUND_LEVELS) {
        totals[k] = num(h[k]?.total ?? h[k]?.value ?? 1);
        penalties[k] = num(h[k]?.penalty);
        labels[k] = h[k]?.label ?? `wod.health.${k}`;
    }
    const d = h.damage ?? {};
    const damage = { bashing: num(d.bashing), lethal: num(d.lethal), aggravated: num(d.aggravated) };
    const max = R.WOUND_LEVELS.reduce((s, k) => s + totals[k], 0);
    return { totals, penalties, labels, damage, max };
}

/** Actor profile key (kindred, ghoul, lupine, ...). Flag override first, then actor type; see profiles.js. */
export function getKind(actor) { return P.detectProfile(actor); }
export const setKind = P.setProfile;
export const pickKind = P.pickProfile;

/** Soak model for an actor: vampire | ghoul | mortal | lupine | fae | wraith | spirit. */
export function getProfile(actor) { return P.profileSoak(P.detectProfile(actor)); }

const isElder = actor => !!(P.worldFlag(actor, "elder"));

/* ------------------------------------------------------------------ */
/*  Dice                                                               */
/* ------------------------------------------------------------------ */

async function rollD10(n) {
    if (n <= 0) return { roll: null, faces: [] };
    const roll = new Roll(`${n}d10`);
    if (GEN() < 12) await roll.evaluate({ async: true });
    else await roll.evaluate();
    const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
    return { roll, faces };
}

async function rollPool(dice, difficulty, opts = {}) {
    const diff = R.clampDifficulty(difficulty);
    const { roll, faces } = await rollD10(dice);
    const res = R.countSuccesses(faces, diff, opts);
    return { ...res, roll, faces, dice, difficulty: diff };
}

function diceHtml(faces, diff, specialty = false) {
    if (!setting("showDice") || !faces?.length) return "";
    return `<div class="vtc-dice">${faces.map(f => {
        const cls = f === 1 ? "one" : f >= diff ? (specialty && f === 10 ? "spec" : "hit") : "miss";
        return `<span class="vtc-die ${cls}">${f}</span>`;
    }).join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/*  Weapons                                                            */
/* ------------------------------------------------------------------ */

function weaponList(actor) {
    const list = [];
    for (const i of actor.items) {
        if (i.type !== "Melee Weapon" && i.type !== "Ranged Weapon") continue;
        const s = i.system;
        list.push({
            id: i.id, name: i.name, ranged: i.type === "Ranged Weapon", natural: !!s.isnatural,
            attribute: s.attack?.attribute || "dexterity",
            ability: s.attack?.ability || (i.type === "Ranged Weapon" ? "archery" : "melee"),
            secondaryId: s.attack?.secondaryabilityid || "",
            accuracy: num(s.attack?.accuracy),
            dmgAttr: s.damage?.attribute || "",
            dmgBonus: num(s.damage?.bonus),
            type: s.damage?.type || "lethal",
            diff: num(s.difficulty) || 6,
            minStr: num(s.minstrength),
            piercing: num(s.piercing),
            range: num(s.range),
            equipped: !!s.isequipped,
            shots: i.type === "Ranged Weapon" ? R.shotsOf(s.clip) : null, crossbow: R.isCrossbow(i.name),
            desc: String(s.description || "").replace(/<[^>]+>/g, " ")
        });
    }
    list.sort((a, b) => (b.equipped - a.equipped) || a.name.localeCompare(b.name));
    const GXR = garouRules();
    const nat = GXR?.isShifter?.(actor) ? GXR.naturalWeapons(actor) : null;
    for (const [k, u] of Object.entries(R.UNARMED)) {
        if (nat && (k === "bite" || k === "claw")) {
            const type = nat[k];
            if (!type) continue;
            const form = cap(nat.form);
            // In Homid a Garou bites as a human does: only after a hold, so it is not counted as a natural weapon
            list.push({ id: `unarmed:${k}`, unarmed: true, natural: nat.form !== "homid", ranged: false, ...u, name: `${k === "bite" ? "Bite" : "Claw"} (${form}, ${type})`,
                type, dmgBonus: 1 + (k === "bite" ? nat.biteBonus : 0), secondaryId: "", minStr: 0, piercing: 0, desc: nat.note });
            continue;
        }
        const extra = {};
        // Only fangs bite for aggravated damage (V20 pdf 284 / p. 276); anyone else bites as a punch does (house rule)
        if (k === "bite" && getKind(actor) !== "kindred") Object.assign(extra, { type: "bashing", name: "Bite (no fangs: bashing)" });
        // Protean 2 grows aggravated claws; Vicissitude's Bonecraft (3) grows talons that do lethal (V20 pdf 250 / p. 242)
        if (k === "claw" && !(discipline(actor, "Protean") >= 2) && discipline(actor, "Vicissitude") >= 3)
            Object.assign(extra, { type: "lethal", name: "Bone talons (Vicissitude, lethal)" });
        list.push({ id: `unarmed:${k}`, unarmed: true, ranged: false, ...u, ...extra, secondaryId: "", minStr: 0, piercing: 0 });
    }
    return list;
}

/** Ability used by a weapon, with VtDA20 fallbacks (Archery for bows, Athletics for thrown). */
function weaponAbility(actor, w) {
    if (w.ability === "custom") return secondaryAbility(actor, w.secondaryId, "Archery");
    if (w.ability === "archery") return secondaryAbility(actor, null, "Archery");
    const a = ability(actor, w.ability);
    const lbl = game.i18n.localize(actor.system?.abilities?.[w.ability]?.label || w.ability);
    return { ...a, name: lbl.startsWith("wod.") || lbl === w.ability ? cap(w.ability) : lbl };
}

/** WoDX Actions' Werewolf and Fera helpers, when that module is on (Phase 6b). */
function garouRules() { return game.wodxActions?.garouRules ?? null; }
/** Soak options read from WoDX Actions: a demon's apocalyptic form {formOn}; a Dark Ages fae (DA:Fae pp. 88, 104) {lethalSoak, baneSoak}. */
function soakOpts(actor, profile) {
    if (profile === "demon") {
        try { return { formOn: !!game.wodxActions?.demonInfo?.(actor)?.formOn }; } catch (e) { return {}; }
    }
    if (profile !== "fae") return {};
    try {
        const f = game.wodxActions?.faeSoak?.(actor);
        return f ? { lethalSoak: !!f.lethal, baneSoak: !!f.coldIron } : {};
    } catch (e) { return {}; }
}

/** How a bane metal in this attack hurts a shapechanger target; null when no bane applies. */
function shifterBane(target, w, fd) {
    const GXR = garouRules();
    if (!target || !GXR?.isShifter?.(target)) return null;
    const txt = `${w.name} ${w.desc || ""}`;
    const metal = GXR.banesOf(target).find(m => new RegExp(`\\b${m}`, "i").test(txt)) ?? (/\bsilver/i.test(txt) || fd.bane ? "silver" : null);
    return metal ? { metal, ...GXR.baneFor(target, metal) } : null;
}

function isCloseCombat(w) {
    return !w.ranged;
}
function isBrawl(w) {
    return w.unarmed || w.natural || w.ability === "brawl";
}

/* ------------------------------------------------------------------ */
/*  Resource spending                                                  */
/* ------------------------------------------------------------------ */

async function spend(actor, wp, bp) {
    if (!setting("spendResources") || !actor) return [];
    const upd = {}, notes = [];
    if (wp) {
        const cur = willpower(actor);
        upd["system.advantages.willpower.temporary"] = Math.max(0, cur - wp);
        notes.push(`${actor.name} spends ${wp} Willpower (${cur} → ${Math.max(0, cur - wp)})`);
    }
    if (bp) {
        const cur = blood(actor);
        upd["system.advantages.bloodpool.temporary"] = Math.max(0, cur - bp);
        notes.push(`${actor.name} spends ${bp} blood (${cur} → ${Math.max(0, cur - bp)})`);
    }
    if (Object.keys(upd).length) {
        if (actor.isOwner) await actor.update(upd);
        else requestGM({ action: "update", uuid: actor.uuid, data: upd });
    }
    return notes;
}

/* ------------------------------------------------------------------ */
/*  Health                                                             */
/* ------------------------------------------------------------------ */

function healthUpdate(actor, damage) {
    const t = healthTrack(actor);
    const ws = R.woundState(damage, t.totals, t.penalties, t.labels);
    return {
        "system.health.damage.bashing": damage.bashing,
        "system.health.damage.lethal": damage.lethal,
        "system.health.damage.aggravated": damage.aggravated,
        "system.health.damage.woundlevel": ws.label,
        "system.health.damage.woundpenalty": ws.penalty,
        "system.traits.health.totalhealthlevels.max": t.max,
        "system.traits.health.totalhealthlevels.value": Math.max(0, t.max - ws.filled)
    };
}

async function setStatus(actor, cond) {
    if (!setting("statusEffects")) return;
    const map = { unconscious: "unconscious", torpor: "unconscious", crippled: null, dead: "dead", finaldeath: "dead" };
    const id = map[cond];
    if (!id) return;
    const overlay = id === "dead";
    try {
        if (typeof actor.toggleStatusEffect === "function") {
            await actor.toggleStatusEffect(id, { active: true, overlay });
        } else {
            const effect = CONFIG.statusEffects.find(e => e.id === id);
            for (const t of actor.getActiveTokens()) {
                const has = actor.effects?.some(e => e.getFlag?.("core", "statusId") === id || e.statuses?.has?.(id));
                if (effect && !has) await t.toggleEffect(effect, { active: true, overlay });
            }
        }
    } catch (e) { console.warn(`${MOD} | could not set status ${id}`, e); }
}

/**
 * Apply levels of damage to an actor (no soak). Returns {before, after, condition, woundLabel}.
 */
/** A wraith's Corpus track (Wraith 20th p. 292): the PC's Corpus Advantage or the Wraith sheet's; null for everyone else. */
export function corpusTrack(actor) {
    if (!actor) return null;
    const item = (actor.items ?? []).find?.(i => i.type === "Advantage" && i.system?.id === "corpus");
    const legacy = actor.type === "Wraith" ? actor.system?.advantages?.corpus : null;
    if (!item && !legacy) return null;
    const max = num(item?.system?.permanent ?? legacy?.permanent) || num(item?.system?.max ?? legacy?.max) || 10;
    const d = actor.system?.health?.damage?.corpus ?? {};
    return { max, damage: { bashing: num(d.bashing), lethal: num(d.lethal), aggravated: num(d.aggravated) } };
}
/** Corpus (Wraith 20th p. 292): wavering when bashing alone fills it, a Harrowing when lethal or worse helps fill it. */
export function corpusCondition(d, max) {
    if (d.bashing + d.lethal + d.aggravated >= max && d.lethal + d.aggravated > 0) return { key: "harrowed", label: "Harrowed" };
    if (d.bashing >= max) return { key: "wavering", label: "Wavering" };
    return { key: "ok", label: "Corporeal" };
}

export async function applyDamage(actor, type, levels, { status = true } = {}) {
    if (!actor) throw new Error("No actor");
    if (!actor.isOwner) {
        requestGM({ action: "applyDamage", uuid: actor.uuid, type, levels });
        return { requested: true };
    }
    const ct = corpusTrack(actor);
    if (ct) {
        const before = { ...ct.damage };
        const after = R.addDamage(before, type, levels, ct.max);
        await actor.update({ "system.health.damage.corpus.bashing": after.bashing, "system.health.damage.corpus.lethal": after.lethal, "system.health.damage.corpus.aggravated": after.aggravated });
        const cond = corpusCondition(after, ct.max);
        const filled = Math.min(ct.max, after.bashing + after.lethal + after.aggravated);
        return { before, after, condition: cond, woundLabel: `Corpus ${ct.max - filled}/${ct.max}${cond.key === "ok" ? "" : ` (${cond.label})`}`, penalty: 0, effType: type, corpus: true };
    }
    const t = healthTrack(actor);
    const before = { ...t.damage };
    const kind = getKind(actor), profile = P.profileSoak(kind);
    // Mortals treat aggravated damage as lethal (VtDA20 p. 345).
    const effType = (type === "aggravated" && (profile === "mortal" || profile === "ghoul")) ? "lethal" : type;
    const after = R.addDamage(before, effType, levels, t.max);
    await actor.update(healthUpdate(actor, after));
    const cond = R.condition(after, t.max, kind);
    if (status && cond.key !== "ok") await setStatus(actor, cond.key);
    const ws = R.woundState(after, t.totals, t.penalties, t.labels);
    return { before, after, condition: cond, woundLabel: ws.label ? game.i18n.localize(ws.label) : "Unhurt", penalty: ws.penalty, effType };
}

export async function setDamage(actor, damage) {
    if (!actor.isOwner) return requestGM({ action: "setDamage", uuid: actor.uuid, damage });
    if (corpusTrack(actor)) return actor.update({ "system.health.damage.corpus.bashing": num(damage.bashing), "system.health.damage.corpus.lethal": num(damage.lethal), "system.health.damage.corpus.aggravated": num(damage.aggravated) });
    return actor.update(healthUpdate(actor, damage));
}

export async function healDamage(actor, type, levels) {
    const ct = corpusTrack(actor);
    if (ct) return setDamage(actor, R.removeDamage(ct.damage, type, levels));
    const t = healthTrack(actor);
    return setDamage(actor, R.removeDamage(t.damage, type, levels));
}

/* ------------------------------------------------------------------ */
/*  Socket (players without permission on the target)                  */
/* ------------------------------------------------------------------ */

function requestGM(payload) {
    if (!game.users.activeGM && !game.users.find(u => u.isGM && u.active)) {
        ui.notifications.warn("WoDX Combat: no GM is connected to apply the change.");
        return false;
    }
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
    if (p.action === "applyDamage") {
        const r = await applyDamage(actor, p.type, p.levels);
        if (p.messageId) {
            const d = game.messages.get(p.messageId)?.getFlag(MOD, "data") ?? {};
            Hooks.callAll("wodxDamageApplied", actor, { type: p.type, levels: p.levels, before: r.before, after: r.after, fireSun: !!d.fireSun, attacker: d.attacker ?? null, messageId: p.messageId });
            await recordApplied(p.messageId, actor, r);
        }
    } else if (p.action === "setDamage") await setDamage(actor, p.damage);
    else if (p.action === "dazed") await markDazed(actor);
    else if (p.action === "update") await actor.update(p.data);
}

async function recordApplied(messageId, actor, r) {
    const msg = game.messages.get(messageId);
    if (!msg) return;
    const data = msg.getFlag(MOD, "data") ?? {};
    data.applied = true;
    data.undo = { uuid: actor.uuid, damage: r.before };
    await msg.update({ [`flags.${MOD}.data`]: data, content: msg.content.replace(/<div class="vtc-pending">[\s\S]*?<\/div>/, appliedHtml(actor, r)) });
}

/* ------------------------------------------------------------------ */
/*  Attack dialog                                                      */
/* ------------------------------------------------------------------ */

function opts(obj, sel) {
    return Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${typeof v === "string" ? v : v.label}</option>`).join("");
}

function kindOpts(sel, autoLabel) {
    return `<option value="auto" ${sel === "auto" ? "selected" : ""}>${autoLabel}</option>` +
        Object.entries(P.PROFILES).map(([k, v]) => `<option value="${k}" ${sel === k ? "selected" : ""}>${v.label}</option>`).join("");
}

function maneuverTable() {
    return setting("classicManeuvers") ? { ...R.MANEUVERS, ...R.CLASSIC } : R.MANEUVERS;
}

function attackDialogHtml(attacker, target, weapons, selWeapon) {
    const aKind = getKind(attacker);
    const vamp = aKind === "kindred" || aKind === "ghoul";
    const cel = discipline(attacker, "Celerity"), pot = discipline(attacker, "Potence");
    const tKind = target ? getKind(target) : "mortal";
    const tFort = target ? discipline(target, "Fortitude") : 0;
    const tCel = target ? discipline(target, "Celerity") : 0;
    const wOpts = `<option value="auto" ${selWeapon === "auto" ? "selected" : ""}>Automatic: best attack for this character</option>`
        + weapons.map(w => `<option value="${w.id}" ${w.id === selWeapon ? "selected" : ""}>${w.name}${w.equipped ? " ★" : ""}</option>`).join("");
    // WoDX conditions on both sides (blinded, held, immobilized, staked, knocked down...)
    const cm = conditionMods(attacker, target);
    // The Blinded condition already puts +2 difficulty in "extra difficulty"; the box would count it twice
    const blindCounted = !!L.chronicle()?.conditions?.hasCondition?.(attacker, "blinded");
    const condNotes = cm.notes.length ? `<div class="vtc-note wodx-conditions"><b>Conditions:</b><ul>${cm.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>` : "";
    const kinds = setting("showKindMenus");
    const boosts = R.BOOSTS.map(bo => {
        const r = P.resource(attacker, bo.res);
        const extra = bo.eff === "extraAction" && r.perm ? ` (limit ${Math.floor(r.perm / 2)})` : "";
        return `<div class="form-group vtc-kind" data-kinds="${bo.kinds.join(" ")}"><label>${bo.label}${extra} [${r.ok ? r.value : "—"}]</label>
          <input type="number" name="boost_${bo.id}" value="0" min="0" max="${bo.max}" style="width:4em"/></div>`;
    }).join("");
    return `
<form class="vtc-form">
  <p class="vtc-head"><b>${attacker.name}</b> attacks <b>${target ? target.name : "(no target)"}</b></p>
  ${condNotes}
  <div class="vtc-note vtc-hints" aria-live="polite"></div>
  ${kinds ? `<fieldset><legend>Actor types</legend>
    <div class="form-group"><label>Attacker</label><select name="atkKind" data-fixed>${kindOpts("auto", `Automatic: ${P.profileLabel(aKind)}`)}</select></div>
    <div class="form-group"><label>Defender</label><select name="profile" data-fixed>${kindOpts("auto", `Automatic: ${P.profileLabel(tKind)}`)}</select></div>
    <div class="form-group"><label><input type="checkbox" name="remember"/> Save these choices on the actors</label></div>
  </fieldset>` : ""}
  <fieldset><legend>Attack</legend>
    <div class="form-group"><label>Weapon</label>${weapons.length > 5 ? searchBox("select[name=weapon]", "Search weapons…", "Search weapons") : ""}<select name="weapon">${wOpts}</select></div>
    <div class="form-group"><label>Maneuver</label><select name="maneuver" data-fixed>${opts(maneuverTable(), "normal")}</select></div>
    <div class="form-group"><label>Targeting</label><select name="targeting" data-fixed>${opts(R.TARGETING, "none")}</select></div>
    <div class="form-group"><label>Range (ranged)</label><select name="range" data-fixed>${opts(R.RANGE, "short")}</select></div>
    <div class="form-group"><label>Position</label><select name="flank" data-fixed>
       <option value="auto" selected>Automatic: from the tokens' facing</option><option value="">Front</option><option value="flank">Flank (+1 die)</option><option value="rear">Rear (+2 dice)</option></select></div>
    <div class="form-group"><label>Multiple actions: this is action #</label><select name="multi" data-fixed>
       <option value="auto" selected>Automatic: count this turn's attacks</option><option value="0">Only action</option><option value="1">1 of several (+1/-1)</option><option value="2">2 (+2/-2)</option><option value="3">3 (+3/-3)</option><option value="4">4 (+4/-4)</option></select></div>
    <div class="form-group"><label>Opponents engaged</label><input type="number" name="opponents" value="1" min="1" max="6"/>
       <label><input type="checkbox" name="oppAuto" checked/> count from the tokens</label></div>
    <div class="form-group"><label>Extra dice / extra difficulty</label>
       <input type="number" name="extraDice" value="${cm.attackerDice}" style="width:4em"/> <input type="number" name="extraDiff" value="${cm.attackerDiff}" style="width:4em"/></div>
    <div class="form-group"><label>Extra damage dice</label><input type="number" name="extraDmg" value="0"/></div>
    <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies (10s count twice)</label></div>
    <div class="form-group"><label><input type="checkbox" name="willpower"/> Spend Willpower (+1 auto success) [${willpower(attacker)}]</label></div>
    <div class="form-group"><label><input type="checkbox" name="bypass"/> Aim around armor (+2 diff)</label></div>
    <div class="form-group"><label><input type="checkbox" name="blind" ${blindCounted ? "disabled" : ""}/> Blind / darkness (+2 diff)${blindCounted ? " (counted above: Blinded)" : ""}</label></div>
    ${cel ? `<div class="form-group"><label><input type="checkbox" name="celDice" ${setting("celerityDice") ? "checked" : ""}/> Celerity ${cel}: add dice to Dexterity</label></div>
    <div class="form-group"><label><input type="checkbox" name="celMulti"/> Celerity activated (1 blood this turn): ignore multiple-action difficulty</label></div>` : ""}
    ${pot ? `<div class="form-group"><label><input type="checkbox" name="potBlood"/> Potence ${pot}: spend 1 blood: auto successes on damage</label></div>` : ""}
    ${vamp ? `<div class="form-group vtc-kind" data-kinds="kindred ghoul"><label>Extra blood spent for this action</label><input type="number" name="extraBlood" value="0" min="0"/></div>` : ""}
    ${kinds ? boosts : ""}
  </fieldset>
  <fieldset><legend>Defender</legend>
    <div class="form-group"><label>Defense</label><select name="defense" data-fixed>
      <option value="auto" selected>Automatic: best for this character</option>
      <option value="none">None / cannot defend</option><option value="dodge">Dodge (Dex + Athletics)</option>
      <option value="block">Block (Dex + Brawl)</option><option value="parry">Parry (Dex + Melee)</option></select></div>
    <div class="form-group"><label>Defender: defense # this turn (full defense)</label><select name="defIndex" data-fixed>
      <option value="auto" selected>Automatic: count this turn's defenses</option><option value="0">First (full pool)</option><option value="1">Second (-1 die)</option><option value="2">Third (-2)</option><option value="3">Fourth (-3)</option></select></div>
    <div class="form-group"><label>Defender extra dice / difficulty</label>
       <input type="number" name="defDice" value="0" style="width:4em"/> <input type="number" name="defDiff" value="${target ? defenseDiffOf(target) : 0}" style="width:4em"/></div>
    ${tCel ? `<div class="form-group"><label><input type="checkbox" name="defCel" checked/> Defender Celerity ${tCel} (adds dice; dodge arrows normally)</label></div>` : ""}
    ${tFort ? `<div class="form-group"><label>Fortitude ${tFort}: spend 1 blood to soak automatically</label><select name="fortBlood" data-fixed>
       <option value="auto" selected>Automatic: ${esc(AU.SOAK_POLICIES[soakPolicy(target)])}</option><option value="yes">Spend</option><option value="no">Don't spend</option></select></div>` : ""}
    <div class="form-group"><label><input type="checkbox" name="fireSun"/> Fire or sunlight (aggravated, armor useless)</label></div>
    <div class="form-group vtc-kind" data-dkinds="lupine demon mummy exalted"><label><input type="checkbox" name="bane" /> Silver: the Garou has no natural soak</label></div>
    <div class="form-group vtc-kind" data-dkinds="fae"><label><input type="checkbox" name="bane2"/> Cold iron: aggravated, no natural soak</label></div>
    <div class="form-group"><label>Extra soak dice</label><input type="number" name="soakBonus" value="0"/></div>
  </fieldset>
</form>`;
}

/** Show only the option groups that match the chosen attacker / defender types. */
function bindKinds(root, aAuto, dAuto) {
    const form = root?.querySelector?.("form") ?? root;
    if (!form) return;
    const upd = () => {
        const a = form.querySelector("[name=atkKind]")?.value, d = form.querySelector("[name=profile]")?.value;
        const ak = !a || a === "auto" ? aAuto : a, dk = !d || d === "auto" ? dAuto : d;
        for (const el of form.querySelectorAll(".vtc-kind")) {
            const k = el.dataset?.kinds, dkk = el.dataset?.dkinds;
            if (el.style) el.style.display = (k ? k.split(" ").includes(ak) : (dkk ?? "").split(" ").includes(dk)) ? "" : "none";
        }
    };
    form.querySelector("[name=atkKind]")?.addEventListener("change", upd);
    form.querySelector("[name=profile]")?.addEventListener("change", upd);
    upd();
}

const readForm = P.readForm;

function resolveTokens(attackerArg, targetArg) {
    let attackerTok = attackerArg ?? canvas.tokens?.controlled?.[0] ?? null;
    let attacker = attackerTok?.actor ?? (attackerTok instanceof Actor ? attackerTok : null) ?? game.user.character;
    if (attackerTok instanceof Actor) attackerTok = attackerTok.getActiveTokens()[0] ?? null;
    let targetTok = targetArg ?? [...(game.user.targets ?? [])][0] ?? null;
    let target = targetTok?.actor ?? (targetTok instanceof Actor ? targetTok : null);
    if (targetTok instanceof Actor) targetTok = targetTok.getActiveTokens()[0] ?? null;
    return { attacker, attackerTok, target, targetTok };
}

export async function attack({ attacker: a, target: t, weaponId, noAim = false } = {}) {
    let { attacker, attackerTok, target, targetTok } = resolveTokens(a, t);
    if (!attacker) return ui.notifications.warn("WoDX Combat: select your token (or assign a character) first.");
    // WoDX Targeting: with no target set by hand, the attack opens on the likeliest foe (the window can switch it)
    const aimApi = game.modules.get("wodx-targeting")?.active ? game.modules.get("wodx-targeting").api : null;
    let pre = null;
    if (!t && !noAim && aimApi?.preAttack) {
        try { pre = aimApi.preAttack(attacker); } catch (e) { console.warn("WoDX Combat | targeting", e); }
        if (pre?.token) ({ attacker, attackerTok, target, targetTok } = resolveTokens(attackerTok ?? a, pre.token));
    }
    if (!target) ui.notifications.info("WoDX Combat: no target selected: the attack will be rolled without defense or soak.");
    if ((game.user.targets?.size ?? 0) > 1) ui.notifications.info("WoDX Combat: several targets selected: using the first one.");
    const weapons = weaponList(attacker);
    const sel = weaponId ?? "auto";
    const content = attackDialogHtml(attacker, target, weapons, sel);
    const aKind = getKind(attacker), tKind = target ? getKind(target) : "mortal";
    const r = await P.ask({
        title: `WoDX Attack: ${P.profileLabel(aKind)}`,
        content, width: 500, classes: ["vtc-dialog"],
        buttons: [{ id: "attack", label: "Attack", icon: "fas fa-dice-d10", default: true }, { id: "cancel", label: "Cancel" }],
        onRender: (root, close) => {
            bindKinds(root, aKind, tKind); bindHints(root, { attacker, target, attackerTok, targetTok });
            if (pre?.token) aimApi.attackPanel(root, pre, tok => { close?.(); attack({ attacker: attackerTok ?? attacker, target: tok ?? undefined, weaponId, noAim: !tok }); });
        }
    });
    if (!r || r.id !== "attack") return null;
    const fd = r.data;
    const w = fd.weapon === "auto" ? { id: "auto" } : weapons.find(x => x.id === fd.weapon);
    try {
        if (!(await ambushFirst({ attacker, attackerTok, target, targetTok, fd }))) { openFight(attackerTok, targetTok); return null; }
        const res = await resolveAttack({ attacker, attackerTok, target, targetTok, weapon: w, fd }); openFight(attackerTok, targetTok); return res;
    }
    catch (e) { console.error(e); ui.notifications.error(`WoDX Combat: ${e.message}`); return null; }
}

/* ------------------------------------------------------------------ */
/*  Attack resolution                                                  */
/* ------------------------------------------------------------------ */

/**
 * 3.11.0 (B836): an attacker lying in wait (sneaking, Obfuscated or hidden) who strikes someone not already fighting
 * rolls the ambush first (ambush-rules.js). A win takes away the defence (and adds the extra successes in V20); a tie
 * strikes first with a defence; a loss means no blow, and the fight starts on initiative. Returns false when the
 * attack does not go ahead.
 */
async function ambushFirst({ attacker, attackerTok, target, targetTok, fd }) {
    if (!attacker || !target || !attackerTok || !targetTok) return true;
    const aDoc = attackerTok.document ?? attackerTok, tDoc = targetTok.document ?? targetTok;
    const fighting = d => (game.combats?.contents ?? []).some(c => c.started && c.combatants.some(x => x.tokenId === d.id));
    const st = attacker.statuses ?? new Set();
    const s = { hidden: !!aDoc.hidden, sneaking: st.has?.("wodx-sneaking") || !!aDoc.flags?.["wodx-npc"]?.sneaking, obfuscated: st.has?.("wodx-obfuscated"),
        attackerFighting: fighting(aDoc), targetFighting: fighting(tDoc) };
    if (!AM.isAmbush(s)) return true;
    const book = darkAgesNow() ? "v20da" : "v20";
    const ar = await rollPool(attr(attacker, "dexterity") + ability(attacker, "stealth").value, AM.DIFFICULTY);
    const tr = await rollPool(attr(target, "perception") + ability(target, "alertness").value, AM.DIFFICULTY);
    const out = AM.ambushOutcome(ar.botch ? 0 : ar.successes, tr.botch ? 0 : tr.successes, book);
    if (!out.defend) fd.defense = "none";
    if (out.bonusDice) fd.extraDice = (Number(fd.extraDice) || 0) + out.bonusDice;
    const content = `<div class="vtc-card"><h3>Ambush: ${esc(aDoc.name)} on ${esc(tDoc.name)}</h3>
      <div>Dexterity + Stealth: <b>${ar.successes}</b>${diceHtml(ar.faces, ar.difficulty)}</div>
      <div>Perception + Alertness: <b>${tr.successes}</b>${diceHtml(tr.faces, tr.difficulty)}</div>
      <div class="vtc-note">${esc(out.why.charAt(0).toUpperCase() + out.why.slice(1))}.</div></div>`;
    const md = { speaker: ChatMessage.getSpeaker({ actor: attacker }), content, rolls: [ar.roll, tr.roll].filter(Boolean), flags: { [MOD]: { ambush: { result: out.result, book } } } };
    if (GEN() < 12) md.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    await ChatMessage.create(md);
    return out.attack;
}

/** An attack made outside a fight starts one (3.9.0); never in the way of the attack itself. */
function openFight(attackerTok, targetTok) {
    if (!attackerTok || !targetTok) return;
    ST.afterAttack(attackerTok, targetTok).catch(e => console.error("WoDX | fight start", e));
}

async function resolveAttack({ attacker, attackerTok, target, targetTok, weapon, fd }) {
    let w = weapon;
    const log = [], rolls = [], spendNotes = [];
    const maneuver = maneuverTable()[fd.maneuver] ?? R.MANEUVERS.normal;
    const aKind = (fd.atkKind && fd.atkKind !== "auto") ? fd.atkKind : getKind(attacker);
    const targeting = R.TARGETING[fd.targeting] ?? R.TARGETING.none;
    const pot = discipline(attacker, "Potence");

    // ---- Automatic position, multiple actions, opponents and defense count (3.4.0)
    const autoNotes = resolveAutoOptions(attacker, target, fd, { attackerTok, targetTok });
    // ---- Automatic weapon: the attack with the most expected harm against this target
    let autoAtkNote = "";
    if (w?.id === "auto" || !w) {
        const { best, plans, distance, ignoredDistance } = bestAttack(attacker, target, fd, { attackerTok, targetTok });
        if (!best) {
            const noDice = plans.some(p => p.why === "no dice to roll");
            throw new Error(noDice ? `${attacker.name} has no dice left for an attack (wounds, penalties or multiple actions): it fails.` : "No attack is possible from here with what is on the sheet.");
        }
        w = best.w;
        if (best.rangeBand && fd.range !== best.rangeBand) fd.range = best.rangeBand;
        const shown = plans.filter(p => p.valid).sort((a, b) => b.score - a.score).slice(0, 4)
            .map(p => `${p.w.name} ${p.expectedLevels.toFixed(1)} ${p.dmgType}`).join("; ");
        const out = plans.filter(p => !p.valid).map(p => `${p.w.name}: ${p.why}`).join("; ");
        autoAtkNote = `Automatic attack: ${w.name} (expected health levels: ${shown})${out ? `. Not used: ${out}` : ""}`
            + (ignoredDistance ? `. Nothing reaches at the tokens' distance (${Math.round(distance)}): chosen as if in reach` : distance != null ? `. Distance ${Math.round(distance)}` : "") + ".";
    }
    // ---- Shots (house rule): an empty weapon cannot fire
    if (w?.ranged && w.shots?.empty && countShots()) {
        const t = R.reloadTurns({ crossbow: w.crossbow, darkAges: darkAgesNow(), archery: archeryOf(attacker) });
        throw new Error(`${attacker.name}'s ${w.name} is empty. Reload it first (${t.turns} turn${t.turns === 1 ? "" : "s"}, ${t.ref}).`);
    }
    // ---- Attack pool
    const { attrKey, ab } = attackBasics(attacker, w);
    // ---- Profile boosts (blood, Rage extra actions, house Glamour/Pathos/... dice)
    let boostDice = 0, rageAction = 0;
    const boostSpend = [];
    for (const bo of R.BOOSTS) {
        const n = num(fd[`boost_${bo.id}`]);
        if (!n || !bo.kinds.includes(aKind)) continue;
        const r = P.resource(attacker, bo.res);
        let use = r.ok ? Math.min(n, r.value) : n;
        if (bo.eff === "extraAction") {
            const lim = r.perm ? Math.floor(r.perm / 2) : use;
            if (use > lim) { log.push(`Rage limit: only half of permanent Rage (${lim}) may be spent for actions in a turn.`); use = lim; }
            rageAction += use;
            if (use) log.push("Rage and Gnosis cannot both be used in the same turn (W20 p. 149).");
        } else boostDice += use;
        if (use) boostSpend.push([bo.res, use]);
    }
    if (rageAction) fd.multi = 0;
    const pool = attackPoolFor(attacker, w, fd, maneuver, targeting, boostDice);
    if (pool.difficulty > 10) log.push(`<b>Difficulty ${pool.difficulty}:</b> above 10: the action is impossible (VtDA20 p. 323). Rolled at 10.`);

    let bloodSpent = (fd.potBlood ? 1 : 0) + (fd.celMulti ? 1 : 0) + (fd.extraBlood || 0);
    const bloodBoost = boostSpend.find(x => x[0] === "blood")?.[1] ?? 0;
    spendNotes.push(...await spend(attacker, fd.willpower ? 1 : 0, bloodSpent + bloodBoost));
    if (setting("spendResources")) {
        for (const [res, n] of boostSpend) {
            if (res === "blood") continue;
            const note = await P.adjust(attacker, res, -n);
            if (note) spendNotes.push(note);
        }
    }
    if (rageAction) log.push(`Rage: ${attacker.name} takes ${rageAction} extra action${rageAction === 1 ? "" : "s"} this turn without multiple-action penalties.`);

    const atk = await rollPool(pool.dice, pool.difficulty, { specialty: fd.specialty, willpower: fd.willpower });
    if (atk.roll) rolls.push(atk.roll);
    if (w?.ranged && w.shots?.counted && countShots()) {
        const left = await spendShot(attacker, w);
        if (left !== null) log.push(`${w.name}: ${left} of ${w.shots.max} round${w.shots.max === 1 ? "" : "s"} left.`);
    }

    // ---- Defense
    let def = null, defNote = "";
    const tKind = target ? ((fd.profile && fd.profile !== "auto") ? fd.profile : getKind(target)) : "mortal";
    const profile = P.profileSoak(tKind);
    if (fd.remember) {
        if (fd.atkKind && fd.atkKind !== "auto") await P.setProfile(attacker, fd.atkKind);
        if (target && fd.profile && fd.profile !== "auto") await P.setProfile(target, fd.profile);
    }
    // "Automatic": the defense with the most expected successes for this attack, from the defender's sheet
    let autoNote = "";
    if (target && (fd.defense === "auto" || !fd.defense)) {
        const { best, plans } = bestDefense(target, fd, w, maneuver);
        fd.defense = best?.type ?? "none";
        const why = plans.map(p => p.valid ? `${cap(p.type)} ${p.dice} dice at ${p.diff}${p.type === "parry" && !p.weapon ? " (no weapon)" : ""}` : `${cap(p.type)}: not possible`).join("; ");
        autoNote = best ? `Automatic defense: ${cap(best.type)} is the best choice (${why}).` : `Automatic defense: none possible (${why}).`;
    }
    if (target && fd.defense !== "none") {
        def = await rollDefense(target, fd, w, maneuver);
        if (def.invalid) defNote = def.invalid;
        else if (def.roll) rolls.push(def.roll);
    }

    const defSucc = def && !def.invalid ? def.successes : 0;
    const net = atk.botch ? 0 : Math.max(0, atk.successes - defSucc);
    const hit = !atk.botch && net > 0;

    // ---- Damage
    let dmg = null, soak = null, outcome = null, armorBroken = false, dmgPool = null;
    const dp = damageProfile(target, tKind, w, fd);
    const { dmgType, soakDiff, minLevels, sb } = dp;
    if (dp.note) log.push(dp.note);
    const fortChoice = fd.fortBlood;
    fd.fortBlood = resolveFortitude(target, fortChoice, dp, fd);
    if (target && fortChoice === "auto" && fd.fortBlood && hit) autoNotes.push(`${target.name} spends blood for Fortitude (${AU.SOAK_POLICIES[soakPolicy(target)].toLowerCase()})`);
    if (hit && !maneuver.noDamage) {
        dmgPool = damagePool(attacker, w, net, maneuver, targeting, fd, pot);
        dmg = await rollPool(dmgPool.dice, 6, { canBotch: false, autoSuccesses: dmgPool.auto });
        if (dmg.roll) rolls.push(dmg.roll);

        if (target) {
            const arm = armor(target);
            const armorRating = Math.max(arm.bashing, arm.lethal, arm.aggravated);
            const sp = soakPoolFor(target, profile, w, fd, dp);
            if (fd.fortBlood && sp.autoSoak) spendNotes.push(...await spend(target, 0, 1));
            soak = await rollPool(sp.dice, soakDiff, { canBotch: false, autoSuccesses: sp.autoSoak });
            soak.pool = sp;
            if (soak.roll) rolls.push(soak.roll);
            const left = R.damageAfterSoak(dmg.successes, soak.successes, dmgType, profile, { elder: isElder(target) });
            if (minLevels && left.levels < minLevels) { left.levels = minLevels; log.push(`A ${sb.metal} hit does at least ${minLevels} level.`); }
            outcome = { levels: left.levels, halved: left.halved, type: dmgType };
            const dz = dazedThreshold(target, tKind);
            if (left.levels > dz.threshold) {
                outcome.dazed = true;
                log.push(`<b>Dazed:</b> ${left.levels} levels after soak is more than ${dz.label} (${dz.threshold}): ${target.name} spends the next turn shaking it off (V20 Dark Ages p. 348).`);
            }
            if (armorRating > 0 && !fd.bypass && dmg.successes >= armorRating * 2) armorBroken = arm.names.join(", ");
        }
    }

    // ---- Riposte from parrying an unarmed attack (VtDA20 p. 344)
    let counter = null;
    if (target && def && !def.invalid && fd.defense === "parry" && isBrawl(w) && defSucc > atk.successes && !atk.botch) {
        counter = await resolveCounter(target, attacker, defSucc - atk.successes, def.weapon);
        rolls.push(...counter.rolls);
    }

    // ---- Chat card
    const rk = roundKey();
    const data = {
        attacker: attacker.uuid, target: target?.uuid ?? null, targetToken: targetTok?.document?.uuid ?? null,
        combatId: rk?.combatId ?? null, round: rk?.round ?? null, defended: !!(def && !def.invalid),
        type: outcome?.type, levels: outcome?.levels ?? 0, applied: false, fireSun: !!fd.fireSun,
        counter: counter ? { uuid: attacker.uuid, type: counter.type, levels: counter.levels } : null
    };
    if (autoAtkNote) log.unshift(esc(autoAtkNote));
    if (autoNotes.length) log.unshift(esc(`Automatic: ${autoNotes.join("; ")}.`));
    let html = attackCard({ attacker, target, w, ab, attrKey, pool, atk, def, defNote, autoNote, net, hit, dmg, dmgPool, soak, outcome, profile, armorBroken, counter, spendNotes, fd, maneuver, log });
    const fkey = F.attackKey({ hit, botch: atk.botch, noDamage: !!maneuver.noDamage, levels: soak ? (outcome?.levels ?? 0) : (dmg?.successes ?? 0),
        type: outcome?.type ?? w.type, soaked: !!(soak && hit && !maneuver.noDamage && !outcome?.levels) });
    html = await addFlavor(html, fkey, { attacker: attacker.name, target: target?.name ?? "the enemy" },
        { style: F.attackStyle(w), group: target ? F.targetGroup(P.detectProfile(target)) : null });
    const msg = await postCard(attackerTok, attacker, html, rolls, data);

    // ---- Apply
    if (setting("autoApply")) {
        if (target && outcome?.levels > 0) await applyFromMessage(msg, "main");
        if (counter?.levels > 0) await applyFromMessage(msg, "counter");
    }
    if (target && outcome?.dazed && setting("statusEffects")) await markDazed(target);
    return { attack: atk, defense: def, damage: dmg, soak, outcome, counter, message: msg };
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/* ------------------------------------------------------------------ */
/*  Building blocks shared by the roll and the automatic choices       */
/* ------------------------------------------------------------------ */

function attackBasics(attacker, w) {
    const attrKey = w.attribute || "dexterity";
    const ab = weaponAbility(attacker, w);
    const str = attr(attacker, "strength");
    const minStrDiff = w.minStr && str < w.minStr ? (w.minStr - str) : 0;
    return { attrKey, ab, minStrDiff };
}

function attackPoolFor(attacker, w, fd, maneuver, targeting, boostDice = 0) {
    const { attrKey, ab, minStrDiff } = attackBasics(attacker, w);
    const cel = discipline(attacker, "Celerity");
    return R.attackPool({
        attribute: attr(attacker, attrKey), attributeLabel: cap(attrKey),
        ability: ab.value, abilityLabel: ab.name,
        accuracy: w.accuracy, maneuverDice: maneuver.dice || 0,
        celerityDice: (fd.celDice && attrKey === "dexterity") ? cel : 0,
        flank: fd.flank, extraDice: (fd.extraDice || 0) + boostDice, woundPenalty: woundPenalty(attacker),
        multiIndex: num(fd.multi), celerityIgnoresMulti: !!fd.celMulti,
        baseDifficulty: w.diff, maneuverDiff: maneuver.diff, targetingDiff: targeting.diff,
        rangeDiff: w.ranged ? (R.RANGE[fd.range]?.diff ?? 0) : 0, minStrDiff,
        bypassArmor: fd.bypass, opponents: fd.opponents, blind: fd.blind, extraDiff: fd.extraDiff
    });
}

/** Damage type, bane and soak difficulty for this weapon against this target. */
function damageProfile(target, tKind, w, fd) {
    let dmgType = (fd.fireSun || fd.bane2 || (R.BANES[tKind] === "Cold iron" && /cold iron/i.test(w.name))) ? "aggravated" : (w.type || "lethal");
    let bane = !!(fd.bane || fd.bane2 || (R.BANES[tKind] && new RegExp(R.BANES[tKind], "i").test(`${w.name} ${w.desc || ""}`)));
    let soakDiff = 6, minLevels = 0, note = "";
    const sb = shifterBane(target, w, fd);
    if (sb) {
        // Era-, breed- and form-aware (DA:W p. 102; W20 p. 255; W20 Changing Breeds)
        bane = sb.bane && !sb.soak;
        if (sb.bane) { dmgType = sb.type ?? dmgType; soakDiff = sb.soakDiff ?? 6; minLevels = sb.min ?? 0; }
        note = `${cap(sb.metal)}: ${sb.note}`;
    } else if (bane) note = `${R.BANES[tKind] ?? "Bane"} weapon: ${target?.name ?? "the target"} has no natural soak.`;
    return { dmgType, bane, soakDiff, minLevels, sb, note };
}

function soakPoolFor(target, profile, w, fd, dp) {
    const arm = armor(target);
    return R.soakPool({
        profile, damageType: dp.dmgType,
        stamina: attr(target, "stamina"), fortitude: discipline(target, "Fortitude"),
        armor: arm[dp.dmgType] ?? 0, armorPiercing: w.piercing, bypassArmor: fd.bypass,
        fireOrSun: !!fd.fireSun, fortitudeBlood: !!fd.fortBlood, bane: dp.bane, bonus: fd.soakBonus,
        aggSoak: garouRules()?.isShifter?.(target) ? garouRules().aggSoak(target) : true,
        ...soakOpts(target, profile)
    });
}

/**
 * Distance between two tokens in scene units (null when either is missing): centre to centre, straight on a
 * gridless scene. With {reach: true}, as if both were one square wide (big tokens reach from their edges).
 */
function tokenDistance(a, b, { reach = false } = {}) {
    try {
        const pa = a?.center ?? a?.object?.center, pb = b?.center ?? b?.object?.center;
        if (!pa || !pb || !globalThis.canvas?.grid) return null;
        // 3.12.0: height between the tokens counts (a flier is farther than the ground distance)
        const d = withHeightOf(canvas.grid.measurePath([pa, pb]).distance, a, b);
        if (!reach) return d;
        const sz = t => Number((t?.document ?? t)?.width) || 1;
        return AU.reachDistance(d, sz(a), sz(b), canvas.scene?.grid?.distance ?? 5);
    } catch (e) { return null; }
}

const withHeightOf = (d, a, b) => { try { return Math.hypot(d, MVJ.heightBetween(a, b)); } catch (e) { return d; } };

/** Can this attack be used at all? Bites and claws need the right body; melee needs reach; missiles need range. */
function attackUsable(attacker, w, distance, reachD = distance) {
    const shifter = !!garouRules()?.isShifter?.(attacker);
    if (w.id === "unarmed:bite" && !w.natural) return "a bite needs a hold first (clinch, hold or tackle)";
    if (w.id === "unarmed:claw" && !w.natural && !(discipline(attacker, "Protean") >= 2 || discipline(attacker, "Vicissitude") >= 3 || shifter))
        return "no claws (Protean 2 or Vicissitude 3)";
    if (w.ranged && w.shots?.empty && countShots()) return "empty: reload first";
    const unit = globalThis.canvas?.scene?.grid?.distance ?? 5;
    if (distance != null) {
        if (!w.ranged && !AU.inReach(reachD ?? distance, unit)) return "out of reach";
        if (w.ranged && w.range > 0 && distance > w.range * 3) return "beyond three times its range";
    }
    return "";
}

/**
 * The best attack for this attacker against this target (the "Automatic" weapon): every weapon, natural weapon and
 * unarmed attack on the sheet, scored by expected health levels after the target's own best defense and soak
 * (weighted: lethal ×1.25, aggravated ×1.6). Maneuver, targeting and the rest of the dialog's choices apply to each.
 */
export function bestAttack(attacker, target, fd = {}, { attackerTok = null, targetTok = null, ignoreDistance = false } = {}) {
    const aTok = attackerTok ?? attacker?.getActiveTokens?.()[0] ?? null;
    const tTok = targetTok ?? target?.getActiveTokens?.()[0] ?? null;
    const measured = tokenDistance(aTok, tTok);
    const reachD = tokenDistance(aTok, tTok, { reach: true });
    const first = planAttacks(attacker, target, fd, ignoreDistance ? null : measured, ignoreDistance ? null : reachD);
    // Nothing reaches: the tokens may not show where the fighters really are, so choose as if in reach and say so
    if (!first.best && measured != null && !ignoreDistance) return { ...planAttacks(attacker, target, fd, null), distance: measured, ignoredDistance: true };
    return { ...first, distance: measured };
}

function planAttacks(attacker, target, fd, distance, reachD = distance) {
    const maneuver = maneuverTable()[fd.maneuver] ?? R.MANEUVERS.normal;
    const targeting = R.TARGETING[fd.targeting] ?? R.TARGETING.none;
    const tKind = target ? ((fd.profile && fd.profile !== "auto") ? fd.profile : getKind(target)) : "mortal";
    const profile = P.profileSoak(tKind);
    const pot = discipline(attacker, "Potence");
    const plans = [];
    for (const w of weaponList(attacker)) {
        const why = attackUsable(attacker, w, distance, reachD);
        if (why) { plans.push({ w, valid: false, why, score: -1 }); continue; }
        // Range band from the distance, for missiles
        let rangeBand = null;
        if (w.ranged && distance != null && w.range > 0) rangeBand = distance <= w.range ? "short" : distance <= w.range * 2 ? "double" : "triple";
        const f = { ...fd, range: rangeBand ?? fd.range };
        const pool = attackPoolFor(attacker, w, f, maneuver, targeting);
        if (pool.dice <= 0) { plans.push({ w, valid: false, why: "no dice to roll", score: -1 }); continue; }
        let defDice = 0, defDiff = 6;
        if (target && f.defense !== "none") {
            const d = (f.defense && f.defense !== "auto") ? planDefense(target, f.defense, f, w, maneuver) : bestDefense(target, f, w, maneuver).best;
            if (d?.valid) { defDice = d.dice; defDiff = d.diff; }
        }
        const dp = target ? damageProfile(target, tKind, w, f) : { dmgType: w.type || "lethal", minLevels: 0 };
        if (target) f.fortBlood = resolveFortitude(target, fd.fortBlood, dp, f);
        const dmg = damagePool(attacker, w, 0, maneuver, targeting, f, pot);
        const sp = target ? soakPoolFor(target, profile, w, f, dp) : { dice: 0, autoSoak: 0 };
        const harm = R.expectedHarm({ atkDice: pool.dice, atkDiff: Math.min(10, pool.difficulty), atkAuto: f.willpower ? 1 : 0, defDice, defDiff,
            dmgBase: dmg.dice, dmgAuto: dmg.auto, soakDice: target ? sp.dice : 0, soakDiff: dp.soakDiff ?? 6, soakAuto: sp.autoSoak ?? 0,
            halveBashing: dp.dmgType === "bashing" && (profile === "vampire" || (profile === "ghoul" && isElder(target))),
            minLevels: dp.minLevels ?? 0, noDamage: !!maneuver.noDamage });
        const score = maneuver.noDamage ? harm.expectedNet : harm.expectedLevels * (R.HARM_WEIGHT[dp.dmgType] ?? 1);
        plans.push({ w, valid: true, score: score + (w.equipped ? 1e-6 : 0), dmgType: dp.dmgType, rangeBand,
            atkDice: pool.dice, atkDiff: pool.difficulty, defDice, ...harm });
    }
    const best = plans.filter(p => p.valid).sort((a, b) => b.score - a.score)[0] ?? null;
    return { best, plans };
}

/**
 * Works out one defense without rolling: {type, valid, invalid?, dice, diff, abilityName, abKey, notes, weapon, expected}.
 * Rules as in VtDA20 p. 344: parry and block only against close combat; block against lethal or aggravated needs
 * Fortitude or armor; dodging missiles is +2 difficulty unless Celerity is in play.
 */
function planDefense(target, type, fd, w, maneuver) {
    const close = isCloseCombat(w);
    const dmgType = fd.fireSun ? "aggravated" : (w.type || "lethal");
    const hasFort = discipline(target, "Fortitude") > 0;
    const arm = armor(target);
    const hasArmor = arm.bashing + arm.lethal + arm.aggravated > 0;
    const no = invalid => ({ type, valid: false, invalid, expected: 0 });
    if (type === "parry" && !close) return no("Parry only works against close-combat attacks: no defense.");
    if (type === "block" && !close) return no("Block only works against close-combat attacks: no defense.");
    if (type === "block" && dmgType !== "bashing" && !hasFort && !hasArmor)
        return no("Blocking a lethal or aggravated attack needs Fortitude or armor: no defense.");

    let abKey = { dodge: "athletics", block: "brawl", parry: "melee" }[type];
    let ab = ability(target, abKey);
    if (type === "dodge") { const d2 = ability(target, "dodge"); if (d2.value > ab.value) { ab = d2; abKey = "dodge"; } }
    const cel = fd.defCel ? discipline(target, "Celerity") : 0;
    const dice = Math.max(0, attr(target, "dexterity") + ab.value + (setting("celerityDice") ? cel : 0) + (fd.defDice || 0)
        + woundPenalty(target) - num(fd.defIndex));
    let diff = 6 + (fd.defDiff || 0) + (maneuver.defDiff || 0);
    const notes = [];
    if (type === "dodge" && w.ranged) {
        if (cel) notes.push("Celerity: no penalty to dodge missiles");
        else { diff += 2; notes.push("dodging missiles +2 diff"); }
    }
    if (maneuver.defDiff) notes.push(`${maneuver.label.split(" ")[0].toLowerCase()} +${maneuver.defDiff} diff`);
    if (num(fd.defIndex)) notes.push(`full defense: -${num(fd.defIndex)} dice`);
    let weapon = null;
    if (type === "parry") {
        const mw = target.items.filter(i => i.type === "Melee Weapon" && !i.system?.isnatural);
        weapon = mw.find(i => i.system?.isequipped) ?? mw[0] ?? null;
        if (!weapon) notes.push("no melee weapon on the sheet");
    }
    const abLabel = game.i18n.localize(target.system?.abilities?.[abKey]?.label || "") || ab.name || abKey;
    return { type, valid: true, dice, diff: Math.min(10, diff), abKey, notes, weapon,
        abilityName: (abLabel.startsWith("wod.") || abLabel === abKey) ? cap(abKey) : abLabel,
        expected: R.expectedSuccesses(dice, Math.min(10, diff)) };
}

/** The best defense the sheet allows against this attack (the "Automatic" choice). */
export function bestDefense(target, fd, w, maneuver = {}) {
    const plans = ["parry", "block", "dodge"].map(t => planDefense(target, t, fd, w, maneuver));
    // A parry needs a weapon in hand to count as the best choice; otherwise it is Dexterity + Melee with bare hands
    const usable = plans.filter(p => p.valid && p.dice > 0 && (p.type !== "parry" || p.weapon));
    return { best: R.pickDefense(usable), plans };
}

async function rollDefense(target, fd, w, maneuver) {
    const p = planDefense(target, fd.defense, fd, w, maneuver);
    if (!p.valid) return { invalid: p.invalid };
    const r = await rollPool(p.dice, p.diff);
    return { ...r, type: p.type, abilityName: p.abilityName, notes: p.notes, weapon: p.weapon };
}

function damagePool(attacker, w, net, maneuver, targeting, fd, pot) {
    const parts = [];
    let dice = 0, auto = 0;
    const add = (l, n) => { if (n) { dice += n; parts.push(`${l} ${n}`); } };
    if (w.dmgAttr) add(cap(w.dmgAttr), attr(attacker, w.dmgAttr));
    const strBased = w.dmgAttr === "strength";
    if (strBased && pot) {
        if (fd.potBlood) { auto = pot; parts.push(`Potence ${pot} auto successes`); }
        else if (setting("potenceDice")) add("Potence", pot);
    }
    add("Weapon", w.dmgBonus);
    add("Net successes", net);
    add("Maneuver", maneuver.dmg);
    add("Targeting", targeting.dmg);
    add("Extra", fd.extraDmg || 0);
    return { dice: Math.max(0, dice), auto, parts };
}

/** Parry vs unarmed: excess parry successes become an attack the attacker may only soak. */
async function resolveCounter(defender, victim, extra, weaponItem) {
    const rolls = [];
    let dice = extra, type = "bashing", parts = [`Excess parry successes ${extra}`], wname = "bare hands";
    if (weaponItem) {
        const s = weaponItem.system;
        wname = weaponItem.name;
        type = s.damage?.type || "lethal";
        if (s.damage?.attribute) { const v = attr(defender, s.damage.attribute); dice += v; parts.push(`${cap(s.damage.attribute)} ${v}`); }
        if (num(s.damage?.bonus)) { dice += num(s.damage.bonus); parts.push(`Weapon ${num(s.damage.bonus)}`); }
    } else { const v = attr(defender, "strength"); dice += v; parts.push(`Strength ${v}`); }
    const dmg = await rollPool(dice, 6, { canBotch: false });
    if (dmg.roll) rolls.push(dmg.roll);
    const profile = getProfile(victim);
    const arm = armor(victim);
    const sp = R.soakPool({ profile, damageType: type, stamina: attr(victim, "stamina"), fortitude: discipline(victim, "Fortitude"), armor: arm[type] ?? 0, ...soakOpts(victim, profile) });
    const soak = await rollPool(sp.dice, 6, { canBotch: false });
    if (soak.roll) rolls.push(soak.roll);
    const left = R.damageAfterSoak(dmg.successes, soak.successes, type, profile, { elder: isElder(victim) });
    return { rolls, dmg, soak, sp, parts, type, levels: left.levels, halved: left.halved, wname, profile };
}

/* ------------------------------------------------------------------ */
/*  Chat cards                                                         */
/* ------------------------------------------------------------------ */

const TYPE_LABEL = { bashing: "bashing", lethal: "lethal", aggravated: "aggravated" };

function attackCard(c) {
    const { attacker, target, w, ab, attrKey, pool, atk, def, defNote, net, hit, dmg, dmgPool, soak, outcome, profile, armorBroken, counter, spendNotes, fd, maneuver, log } = c;
    const L = [];
    L.push(`<div class="vtc-card">`);
    L.push(`<h3>${attacker.name} ⟶ ${target ? target.name : "—"}</h3>`);
    L.push(`<div class="vtc-sub">${w.name}${maneuver !== R.MANEUVERS.normal ? ` · ${maneuver.label.split(" (")[0]}` : ""}${fd.targeting !== "none" ? ` · ${R.TARGETING[fd.targeting].label.split(" (")[0]} target` : ""}</div>`);
    // Attack
    L.push(`<div class="vtc-sec"><b>Attack</b> ${cap(attrKey)} + ${ab.name}: <b>${pool.dice}</b> dice, diff <b>${Math.min(10, pool.difficulty)}</b>`);
    L.push(`<div class="vtc-parts">${pool.parts.join(" · ")}${fd.specialty ? " · specialty" : ""}${fd.willpower ? " · Willpower" : ""}</div>`);
    L.push(diceHtml(atk.faces, atk.difficulty, fd.specialty));
    L.push(`<div class="vtc-res ${atk.botch ? "bad" : atk.successes ? "good" : ""}">${atk.botch ? "BOTCH! The weapon breaks, or the blow strikes an ally." : `${atk.successes} success${atk.successes === 1 ? "" : "es"}`}</div></div>`);
    // Defense
    if (def || defNote || c.autoNote) {
        L.push(`<div class="vtc-sec"><b>Defense</b> `);
        if (c.autoNote) L.push(`<div class="vtc-parts">${esc(c.autoNote)}</div>`);
        if (defNote) L.push(`<span class="vtc-warn">${defNote}</span>`);
        else if (def) {
            L.push(`${cap(def.type)} (Dexterity + ${def.abilityName}): <b>${def.dice}</b> dice, diff <b>${def.difficulty}</b>`);
            if (def.notes.length) L.push(`<div class="vtc-parts">${def.notes.join(" · ")}</div>`);
            L.push(diceHtml(def.faces, def.difficulty));
            L.push(`<div class="vtc-res">${def.botch ? "Botch: the defense fails badly" : `${def.successes} success${def.successes === 1 ? "" : "es"} subtracted`}</div>`);
        }
        L.push(`</div>`);
    }
    if (!hit) {
        L.push(`<div class="vtc-big miss">${atk.botch ? "Botched attack" : "Miss"}</div>`);
    } else if (maneuver.noDamage) {
        L.push(`<div class="vtc-big hit">${maneuver.label.split(" (")[0]} succeeds (${net} net success${net === 1 ? "" : "es"}): no damage</div>`);
    } else {
        L.push(`<div class="vtc-sec"><b>Damage</b> ${dmgPool.dice} dice${dmgPool.auto ? ` + ${dmgPool.auto} auto` : ""}, diff 6: <i>${TYPE_LABEL[outcome?.type ?? (fd.fireSun ? "aggravated" : w.type)] ?? w.type}</i>`);
        L.push(`<div class="vtc-parts">${dmgPool.parts.join(" · ")}</div>`);
        L.push(diceHtml(dmg.faces, 6));
        L.push(`<div class="vtc-res">${dmg.successes} level${dmg.successes === 1 ? "" : "s"} of damage before soak</div></div>`);
        if (soak) {
            const sp = soak.pool;
            const bits = [];
            if (sp.stamina) bits.push(`Stamina ${sp.stamina}`);
            if (sp.fortitude) bits.push(`Fortitude ${sp.fortitude}`);
            if (sp.armor) bits.push(`Armor ${sp.armor}`);
            if (fd.soakBonus) bits.push(`Extra ${fd.soakBonus}`);
            L.push(`<div class="vtc-sec"><b>Soak</b> (${profileLabel(profile)}): <b>${sp.dice}</b> dice${sp.autoSoak ? ` + ${sp.autoSoak} automatic` : ""}, diff 6`);
            L.push(`<div class="vtc-parts">${bits.join(" · ") || "no soak dice"}${sp.notes.length ? " · " + sp.notes.join(" · ") : ""}</div>`);
            L.push(diceHtml(soak.faces, 6));
            L.push(`<div class="vtc-res">${soak.successes} soaked${outcome.halved ? " · Cainite halves bashing (round down)" : ""}</div></div>`);
            const t = outcome.type;
            const mortalAgg = t === "aggravated" && (profile === "mortal" || profile === "ghoul");
            L.push(`<div class="vtc-big ${outcome.levels ? "hit" : ""}">${outcome.levels ? `${outcome.levels} ${TYPE_LABEL[t]} health level${outcome.levels === 1 ? "" : "s"}${mortalAgg ? " (applied as lethal to a mortal)" : ""}` : "All damage soaked"}</div>`);
            if (armorBroken) L.push(`<div class="vtc-warn">The damage roll equals twice the armor rating: <b>${armorBroken}</b> is destroyed.</div>`);
            if (outcome.levels) L.push(`<div class="vtc-pending">${setting("autoApply") ? "Applying…" : ""}<button type="button" class="vtc-apply" data-which="main">Apply ${outcome.levels} ${t} to ${target.name}</button></div>`);
        } else {
            L.push(`<div class="vtc-big hit">${dmg.successes} levels: no target to soak</div>`);
        }
    }
    if (counter) {
        L.push(`<div class="vtc-sec"><b>Parry turns the blow</b> (${target.name}'s ${counter.wname} vs unarmed attack; ${attacker.name} may only soak)`);
        L.push(`<div class="vtc-parts">${counter.parts.join(" · ")}</div>${diceHtml(counter.dmg.faces, 6)}`);
        L.push(`<div class="vtc-res">${counter.dmg.successes} damage · soak ${counter.sp.dice} dice → ${counter.soak.successes}${counter.halved ? " · halved" : ""}</div>`);
        L.push(`<div class="vtc-big ${counter.levels ? "hit" : ""}">${counter.levels ? `${counter.levels} ${counter.type} to ${attacker.name}` : "Soaked"}</div>`);
        if (counter.levels) L.push(`<div class="vtc-pending vtc-pending-counter"><button type="button" class="vtc-apply" data-which="counter">Apply ${counter.levels} ${counter.type} to ${attacker.name}</button></div>`);
        L.push(`</div>`);
    }
    if (maneuver === R.MANEUVERS.greatblow) L.push(`<div class="vtc-note">Great Blow: ${attacker.name} may not defend for the rest of the turn.</div>`);
    else if (maneuver.note) L.push(`<div class="vtc-note">${maneuver.note.replace("{name}", attacker.name)}</div>`);
    for (const n of log) L.push(`<div class="vtc-note">${n}</div>`);
    for (const n of spendNotes) L.push(`<div class="vtc-note">${n}</div>`);
    L.push(`</div>`);
    return L.join("");
}

function profileLabel(p) {
    return { vampire: "Cainite", ghoul: "ghoul / revenant", mortal: "mortal", lupine: "Garou / supernatural", supernatural: "supernatural",
        fae: "changeling", wraith: "wraith", spirit: "spirit", demon: "demon", mummy: "mummy" }[p] ?? p;
}

function appliedHtml(actor, r) {
    if (r.requested) return `<div class="vtc-applied">Damage sent to the GM to apply.</div>`;
    const d = r.after;
    let s = `<div class="vtc-applied">Applied to ${actor.name}: now ${d.bashing}B / ${d.lethal}L / ${d.aggravated}A: <b>${r.woundLabel}</b>${r.penalty && r.penalty > -99 ? ` (${r.penalty} dice)` : ""}`;
    if (r.condition?.text) s += `<div class="vtc-cond">${r.condition.text}</div>`;
    s += ` <button type="button" class="vtc-undo">Undo</button></div>`;
    return s;
}

async function postCard(tok, actor, content, rolls, data) {
    const md = {
        speaker: ChatMessage.getSpeaker({ token: tok?.document, actor }),
        content, rolls, sound: CONFIG.sounds.dice,
        flags: { [MOD]: { data } }
    };
    if (GEN() < 12) md.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    return ChatMessage.create(md);
}

/** Apply the damage recorded in a combat card ("main" target or the parry "counter"). */
async function applyFromMessage(msg, which = "main") {
    const data = msg.getFlag(MOD, "data");
    if (!data) return;
    const isCounter = which === "counter";
    const src = isCounter ? data.counter : { uuid: data.targetToken || data.target, type: data.type, levels: data.levels };
    if (!src?.uuid || !src.levels) return;
    if (isCounter ? data.counterApplied : data.applied) return ui.notifications.info("That damage was already applied.");
    const doc = await fromUuid(src.uuid);
    const actor = doc?.actor ?? doc;
    if (!actor) return ui.notifications.warn("WoDX Combat: the target no longer exists.");
    if (!actor.isOwner) {
        if (requestGM({ action: "applyDamage", uuid: actor.uuid, type: src.type, levels: src.levels, messageId: msg.id }))
            ui.notifications.info(`Damage to ${actor.name} sent to the GM.`);
        return;
    }
    const r = await applyDamage(actor, src.type, src.levels);
    // Other WoDX modules react to applied damage (WoDX Actions: frenzy, Rötschreck, sin and torpor prompts)
    Hooks.callAll("wodxDamageApplied", actor, { type: src.type, levels: src.levels, before: r.before, after: r.after,
        fireSun: !isCounter && !!data.fireSun, attacker: isCounter ? data.target : (data.attacker ?? null), messageId: msg.id });
    const key = isCounter ? "counterApplied" : "applied";
    const undoKey = isCounter ? "counterUndo" : "undo";
    const newData = { ...data, [key]: true, [undoKey]: { uuid: actor.uuid, damage: r.before } };
    const re = isCounter ? /<div class="vtc-pending vtc-pending-counter">[\s\S]*?<\/div>/ : /<div class="vtc-pending">[\s\S]*?<\/div>/;
    const content = msg.content.replace(re, appliedHtml(actor, r).replace('class="vtc-undo"', `class="vtc-undo" data-which="${which}"`));
    if (msg.isOwner || game.user.isGM) await msg.update({ content, [`flags.${MOD}.data`]: newData });
    else ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: appliedHtml(actor, r) });
}

async function undoFromMessage(msg, which = "main") {
    const data = msg.getFlag(MOD, "data");
    const u = which === "counter" ? data?.counterUndo : data?.undo;
    if (!u) return;
    const doc = await fromUuid(u.uuid);
    const actor = doc?.actor ?? doc;
    if (!actor) return;
    await setDamage(actor, u.damage);
    const key = which === "counter" ? "counterApplied" : "applied";
    const newData = { ...data, [key]: false, [which === "counter" ? "counterUndo" : "undo"]: null };
    await msg.update({ [`flags.${MOD}.data`]: newData, content: msg.content + `<div class="vtc-note">Damage to ${actor.name} undone (${u.damage.bashing}B / ${u.damage.lethal}L / ${u.damage.aggravated}A).</div>` });
}

function bindCard(msg, el) {
    if (!el || el.dataset?.vtcBound) return;
    if (el.dataset) el.dataset.vtcBound = "1";
    el.querySelectorAll?.("button.vtc-apply").forEach(b => b.addEventListener("click", ev => {
        ev.preventDefault(); applyFromMessage(msg, b.dataset.which || "main");
    }));
    el.querySelectorAll?.("button.vtc-undo").forEach(b => {
        if (!game.user.isGM && !msg.isOwner) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); undoFromMessage(msg, b.dataset.which || "main"); });
    });
}

/* ------------------------------------------------------------------ */
/*  Soak & Apply dialog (damage from any source)                      */
/* ------------------------------------------------------------------ */

export async function soakDialog({ tokens } = {}) {
    const toks = tokens ?? (game.user.targets?.size ? [...game.user.targets] : canvas.tokens?.controlled ?? []);
    if (!toks.length) return ui.notifications.warn("WoDX Combat: select or target the tokens taking damage.");
    const content = `
<form class="vtc-form">
  <p>${toks.map(t => `<b>${t.name}</b>`).join(", ")}</p>
  <div class="form-group"><label>Damage</label>
     <select name="mode"><option value="levels">Levels (successes already rolled)</option><option value="pool">Roll a damage pool (dice)</option></select></div>
  <div class="form-group"><label>Amount</label><input type="number" name="amount" value="1" min="0"/></div>
  <div class="form-group"><label>Type</label><select name="type">
     <option value="bashing">Bashing</option><option value="lethal" selected>Lethal</option><option value="aggravated">Aggravated</option></select></div>
  <div class="form-group"><label><input type="checkbox" name="soak" checked/> Roll soak</label></div>
  <div class="form-group"><label><input type="checkbox" name="fireSun"/> Fire or sunlight</label></div>
  <div class="form-group"><label><input type="checkbox" name="noArmor"/> Armor does not apply</label></div>
  <div class="form-group"><label><input type="checkbox" name="bane"/> Bane: silver (Garou) or cold iron (changeling): no natural soak</label></div>
  <div class="form-group"><label><input type="checkbox" name="chimerical"/> Chimerical damage (only affects chimerical beings / changelings)</label></div>
  <div class="form-group"><label>Spend blood for automatic Fortitude soak</label><select name="fortBlood" data-fixed>
     <option value="auto" selected>Automatic: each character's soak policy</option><option value="yes">Spend</option><option value="no">Don't spend</option></select></div>
  <div class="form-group"><label>Extra soak dice</label><input type="number" name="soakBonus" value="0"/></div>
</form>`;
    const r = await P.ask({
        title: "WoDX Soak & Apply Damage", content, width: 440,
        buttons: [{ id: "go", label: "Resolve", icon: "fas fa-shield-alt", default: true }, { id: "cancel", label: "Cancel" }]
    });
    if (!r || r.id !== "go") return;
    for (const t of toks) await soakAndApply(t, r.data);
}

export async function soakAndApply(tok, fd) {
    const actor = tok.actor ?? tok;
    const type0 = fd.fireSun ? "aggravated" : fd.type;
    const rolls = [];
    let dmgLevels = fd.amount, dmgRoll = null;
    if (fd.mode === "pool") {
        dmgRoll = await rollPool(fd.amount, 6, { canBotch: false });
        if (dmgRoll.roll) rolls.push(dmgRoll.roll);
        dmgLevels = dmgRoll.successes;
    }
    const kind = getKind(actor), profile = P.profileSoak(kind);
    let soak = null, sp = null, left = { levels: dmgLevels, halved: false };
    // A shapechanger and silver: by era, breed and form (DA:W p. 102; W20 p. 255)
    const sb = fd.bane ? shifterBane(actor, { name: "silver" }, fd) : null;
    // A soak difficulty set by the caller: the heat of a fire (core fire rules)
    let type = type0, bane = !!fd.bane, soakDiff = Math.max(2, Math.min(10, Math.round(Number(fd.soakDiff) || 6)));
    if (sb) { bane = sb.bane && !sb.soak; if (sb.bane) { type = sb.type ?? type; soakDiff = sb.soakDiff ?? 6; } }
    fd = { ...fd, fortBlood: resolveFortitude(actor, fd.fortBlood, { dmgType: type }, fd) };
    if (fd.soak) {
        const arm = armor(actor);
        sp = R.soakPool({ profile, damageType: type, stamina: attr(actor, "stamina"), fortitude: discipline(actor, "Fortitude"),
            armor: fd.noArmor ? 0 : (arm[type] ?? 0), fireOrSun: !!fd.fireSun, fortitudeBlood: !!fd.fortBlood, bane, bonus: fd.soakBonus,
            aggSoak: garouRules()?.isShifter?.(actor) ? garouRules().aggSoak(actor) : true, ...soakOpts(actor, profile) });
        if (sb) sp.notes.push(sb.note);
        if (fd.fortBlood && sp.autoSoak) await spend(actor, 0, 1);
        // A caller can ask that a botched soak turns the damage aggravated (electrocution of a vampire, V20 core printed p. 295, pdf 303)
        soak = await rollPool(sp.dice, soakDiff, { canBotch: !!fd.botchAggravated, autoSuccesses: sp.autoSoak });
        if (soak.roll) rolls.push(soak.roll);
        if (fd.botchAggravated && soak.botch) {
            type = "aggravated";
            sp.notes.push("Botched: the damage is aggravated");
            left = { levels: dmgLevels, halved: false };
        } else left = R.damageAfterSoak(dmgLevels, soak.successes, type, profile, { elder: isElder(actor) });
    }
    if (fd.chimerical && kind !== "fae") left = { levels: 0, halved: false };
    // Damage from one attack, entered by hand, dazes the same way (V20 Dark Ages p. 348)
    const dz = dazedThreshold(actor, kind);
    const dazed = left.levels > dz.threshold;
    let html = `<div class="vtc-card"><h3>${actor.name} takes damage</h3>`;
    if (dmgRoll) html += `<div class="vtc-sec"><b>Damage</b> ${fd.amount} dice, diff 6${diceHtml(dmgRoll.faces, 6)}<div class="vtc-res">${dmgLevels} levels</div></div>`;
    else html += `<div class="vtc-sec"><b>Damage</b> ${dmgLevels} ${type} levels</div>`;
    if (soak) html += `<div class="vtc-sec"><b>Soak</b> (${profileLabel(profile)}): ${sp.dice} dice${sp.autoSoak ? ` + ${sp.autoSoak} automatic` : ""}${soakDiff !== 6 ? `, diff ${soakDiff}` : ""}<div class="vtc-parts">${sp.notes.join(" · ")}</div>${diceHtml(soak.faces, soakDiff)}<div class="vtc-res">${soak.successes} soaked${left.halved ? " · bashing halved" : ""}</div></div>`;
    html += `<div class="vtc-big ${left.levels ? "hit" : ""}">${left.levels ? `${left.levels} ${type}` : "No damage"}</div>`;
    if (dazed) html += `<div class="vtc-note"><b>Dazed:</b> ${left.levels} levels after soak is more than ${dz.label} (${dz.threshold}): ${esc(actor.name)} spends the next turn shaking it off (V20 Dark Ages p. 348).</div>`;
    if (fd.chimerical) html += `<div class="vtc-note">Chimerical damage: only changelings and chimerical beings are hurt; the body of a mortal or other supernatural is unharmed${kind === "fae" ? "" : "; apply nothing to " + actor.name + " unless the Storyteller rules otherwise"}.</div>`;
    if (left.levels) html += `<div class="vtc-pending">${setting("autoApply") ? "Applying…" : ""}<button type="button" class="vtc-apply" data-which="main">Apply ${left.levels} ${type} to ${actor.name}</button></div>`;
    html += `</div>`;
    const data = { target: actor.uuid, targetToken: tok.document?.uuid ?? null, type, levels: left.levels, applied: false, fireSun: !!fd.fireSun };
    const msg = await postCard(tok.document ? tok : null, actor, html, rolls, data);
    if (setting("autoApply") && left.levels) await applyFromMessage(msg, "main");
    if (dazed && setting("statusEffects")) await markDazed(actor);
    return { levels: left.levels, dazed, message: msg };
}

/* ------------------------------------------------------------------ */
/*  Initiative                                                         */
/* ------------------------------------------------------------------ */

/** VtDA20 initiative: 1d10 + Dexterity + Wits (+ Celerity) – wound penalty. */
export async function rollInitiative({ combat = game.combat, combatants = null, all = false, automatic = false } = {}) {
    if (!combat) return ui.notifications.warn("WoDX Combat: no active combat encounter.");
    let list = combatants ?? (all ? combat.combatants.contents
        : combat.combatants.filter(c => c.isOwner && (canvas.tokens.controlled.length === 0 ? true : canvas.tokens.controlled.some(t => t.id === c.tokenId))));
    if (!game.user.isGM) list = list.filter(c => c.isOwner);
    if (!list.length) return ui.notifications.warn("WoDX Combat: no combatants to roll for.");
    const lines = [], rolls = [], updates = [];
    for (const c of list) {
        const a = c.actor;
        if (!a) continue;
        const dex = attr(a, "dexterity"), wits = attr(a, "wits");
        // Celerity adds nothing to Initiative (V20 pdf 150 / p. 142)
        const cel = 0;
        const wp = woundPenalty(a);
        const roll = new Roll(`1d10 + ${dex} + ${wits} + ${cel} + ${wp > -99 ? wp : 0}`);
        if (GEN() < 12) await roll.evaluate({ async: true }); else await roll.evaluate();
        rolls.push(roll);
        // Ties go to the higher rating (Dexterity + Wits), encoded as decimals.
        const rating = dex + wits + cel;
        const value = roll.total + rating / 100;
        updates.push({ _id: c.id, initiative: value });
        const inc = wp <= -99 ? ": <i>Incapacitated, cannot act</i>" : "";
        lines.push(`<tr><td>${c.name}</td><td>${roll.dice[0].total}</td><td>${dex}+${wits}${cel ? `+${cel}` : ""}${wp ? ` ${wp > -99 ? wp : ""}` : ""}</td><td><b>${roll.total}</b>${inc}</td></tr>`);
    }
    await combat.updateEmbeddedDocuments("Combatant", updates);
    const extra = list.map(c => [c.name, freeActionsIn(c.actor, combat)]).filter(([, n]) => n > 0);
    const content = `<div class="vtc-card"><h3>Initiative${automatic ? `, turn ${combat.round || 1}` : ""}</h3><table class="vtc-init"><tr><th></th><th>d10</th><th>Dex+Wits</th><th>Total</th></tr>${lines.join("")}</table>
      ${extra.length ? `<div class="vtc-note">Extra actions declared: ${extra.map(([n, k]) => `${esc(n)} ${k}`).join(", ")}.</div>` : ""}
      <div class="vtc-note">Actions are declared from lowest to highest initiative and resolved from highest to lowest (VtDA20 printed p. 343).${automatic ? " Rolled automatically (setting)." : ""}</div></div>`;
    const md = { speaker: ChatMessage.getSpeaker(), content, rolls };
    if (GEN() < 12) md.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    return ChatMessage.create(md);
}

/* ------------------------------------------------------------------ */
/*  Macros                                                             */
/* ------------------------------------------------------------------ */

const MACROS = [
    { name: "WoDX: Attack", img: "icons/skills/melee/strike-sword-steel-yellow.webp", command: "game.wodxCombat.attack();" },
    { name: "WoDX: Soak & Apply Damage", img: "icons/equipment/shield/heater-steel-worn.webp", command: "game.wodxCombat.soakDialog();" },
    { name: "WoDX: Actor Type", img: "icons/svg/mystery-man.svg", command: "const a = canvas.tokens.controlled[0]?.actor ?? game.user.character; if (a) game.wodxCombat.pickKind(a); else ui.notifications.warn('Select a token first.');" },
    { name: "WoDX: Initiative", img: "icons/svg/d20-highlight.svg", command: "game.wodxCombat.rollInitiative({ all: game.user.isGM && canvas.tokens.controlled.length === 0 });" },
    { name: "WoDX: Quick Attack", img: "icons/skills/melee/blade-tip-orange.webp", command: "game.wodxCombat.quickAttack();" },
    { name: "WoDX: Reload", img: "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp", command: "game.wodxCombat.reload();" },
    { name: "WoDX: Soak Policy", img: "icons/svg/shield.svg", command: "const a = canvas.tokens.controlled[0]?.actor ?? game.user.character; if (a) game.wodxCombat.setSoakPolicy(a); else ui.notifications.warn('Select a token first.');" }
];

async function createMacros() {
    if (!game.user.isGM || !setting("createMacros")) return;
    for (const m of MACROS) {
        if (game.macros.find(x => x.name === m.name)) continue;
        // The VtDA20 macro of the same name is renamed by the migration, not duplicated
        if (game.macros.find(x => x.name === m.name.replace(/^WoDX: /, "VtDA20: "))) continue;
        await Macro.create({ name: m.name, type: "script", img: m.img, command: m.command, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
    }
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

let OFF = false;
Hooks.once("init", () => {
    // Never run beside the module this one replaces: both would answer every button
    if (L.oldActive("vtda20-combat")) { OFF = true; return; }
    registerSettings();
    CD.registerConductorSettings();
    ST.registerStartSettings();
    P.register();
    const movement = MVJ.setupMovement({ MOD, off: () => OFF, attr, ability: (a, k) => ability(a, k)?.value ?? 0, getKind, variant: P.variantText, applyDamage, movementFor, esc });
    const api = { movement, conductor: CD.conductorApi, attack, soakDialog, soakAndApply, applyDamage, healDamage, setDamage, rollInitiative, getProfile,
        getKind, setKind, pickKind, profiles: P, attr, ability, discipline, armor, rules: R, version: "3.12.1", reload, fight: ST.fightApi, movementFor, corpusTrack, corpusCondition,
        conditionMods, dazedThreshold, bestDefense, bestAttack, quickAttack, setSoakPolicy, soakPolicy, attackHints: computeHints,
        defensesThisRound, attacksThisRound, auto: AU, _dialogs: { attackDialogHtml } };
    game.wodxCombat = api;
    L.alias("combat", "vtda20combat", api, "vtda20-combat");
    const mod = game.modules.get(MOD);
    if (mod) mod.api = api;
});

Hooks.once("ready", async () => {
    if (OFF) return L.warnOld("WoDX Combat", "vtda20-combat");
    if (game.system.id !== "worldofdarkness") console.warn(`${MOD} | designed for the worldofdarkness system (found ${game.system.id}).`);
    game.socket.on(SOCKET, p => { if (!p?.conductor && p?.action !== "startFight") onSocket(p); });
    CD.installConductor();
    ST.installStarter();
    await createMacros();
    console.log(`${MOD} | ready`);
});

/* ------------------------------------------------------------------ */
/*  Movement in yards, any grid (3.5.0)                                */
/* ------------------------------------------------------------------ */

const MV_LABEL = m => ({ fly: "Flying", swim: "Swimming", climb: "Climbing", crawl: "Crawling", jump: "Jumping", burrow: "In the ground", phase: "Through walls" }[m] ?? "Moving");

/** A token's movement allowance this turn (VtDA20 pp. 202, 241, 333, 351). */
export function movementFor(actor) {
    const dmg = actor?.system?.health?.damage ?? {};
    const woundIndex = num(dmg.bashing) + num(dmg.lethal) + num(dmg.aggravated);
    // Protean's Shape of the Beast (wolf or rat) doubles the running speed (VtDA20 p. 241); the effect comes from Use a Discipline
    const doubleRun = [...(actor?.effects ?? [])].some(e => /^shape of the beast\b/i.test(e.name ?? ""));
    return AU.movement({ dexterity: attr(actor, "dexterity"), celerity: discipline(actor, "Celerity"), woundIndex, doubleRun });
}
const roundTag = () => { const c = game.combat; return c?.started ? `${c.id}:${c.round}` : null; };
/** {yards, limits} moved this turn by a token in the running fight, or null. */
function movedThisRound(tok) {
    const doc = tok?.document ?? tok, tag = roundTag();
    if (!doc?.getFlag || !tag) return null;
    const f = doc.getFlag(MOD, "moved");
    if (!f || f.tag !== tag) return null;
    return { yards: Number(f.yards) || 0, limits: movementFor(doc.actor) };
}
/** The fight this token is in, if one is running on its scene, with its combatant. */
function fightOf(doc) {
    const sid = doc.parent?.id;
    for (const combat of game.combats?.contents ?? []) {
        if (!combat.started || (combat.scene && combat.scene.id !== sid)) continue;
        const c = combat.combatants.find(x => x.tokenId === doc.id && (!x.sceneId || x.sceneId === sid));
        if (c) return { combat, c };
    }
    return null;
}
// Out of turn, a player's token stays put (3.8.1). Registered before the yards count, so a refused move is not counted.
Hooks.on("preUpdateToken", (doc, changes, options) => {
    if (OFF || game.user.isGM || !("x" in changes || "y" in changes) || options?.wodxMove === false) return;
    let mode;
    try { mode = setting("turnMoves"); } catch (e) { return; }
    if (mode !== "block") return;
    const f = fightOf(doc);
    const held = f ? f.c.getFlag(MOD, "held") : null;
    const r = CR.turnMove({ mode, isGM: false, inFight: !!f, isCurrent: !!f && f.combat.combatant?.id === f.c.id,
        held: !!held && held.combatId === f?.combat.id && held.round === f?.combat.round });
    if (r.ok) return;
    ui.notifications.warn(`${doc.name} cannot move now: ${r.why}.`);
    return false;
});
Hooks.on("preUpdateToken", (doc, changes, options, userId) => {
    if (OFF || !("x" in changes || "y" in changes || "elevation" in changes) || options?.wodxMove === false) return;
    let mode;
    try { mode = setting("movementLimit"); } catch (e) { return; }
    const tag = roundTag();
    if (mode === "off" || !tag || !doc.actor || !game.combat?.combatants?.some?.(c => c.tokenId === doc.id)) return;
    let d;
    try {
        const from = { x: doc.x, y: doc.y }, to = { x: changes.x ?? doc.x, y: changes.y ?? doc.y };
        d = canvas.grid.measurePath([from, to]).distance;
        // 3.12.0: climbing, flying up or diving counts its height too
        d = Math.hypot(d, (Number(changes.elevation ?? doc.elevation) || 0) - (Number(doc.elevation) || 0));
    } catch (e) { return; }
    const lim = movementFor(doc.actor);
    // 3.12.0: the way of moving (fly, swim, climb, crawl, jump...) sets its own limit; shallow water costs double
    const way = MVJ.moveCheck(doc, changes, lim);
    const yards = AU.toYards(d, doc.parent?.grid?.units ?? canvas.scene?.grid?.units) * (way.cost || 1);
    const prev = doc.getFlag(MOD, "moved");
    const total = (prev?.tag === tag ? Number(prev.yards) || 0 : 0) + yards;
    const cap = way.limit === null ? lim.run : way.limit;
    const p = way.limit === null ? AU.pace(total, lim) : (total <= cap + 1e-6 ? way.mode : "over");
    if (p === "over" && mode === "block" && !game.user.isGM) {
        ui.notifications.warn(`${doc.name}: ${Math.round(total)} yards is past their ${way.limit === null ? "running speed" : `${MV_LABEL(way.mode).toLowerCase()} limit`} this turn (${cap}${lim.note ? `; ${lim.note}` : ""}).`);
        return false;
    }
    foundry.utils.setProperty(changes, `flags.${MOD}.moved`, { tag, yards: Math.round(total * 10) / 10, jumped: !!way.jumped || (prev?.tag === tag && !!prev?.jumped) });
    if (way.jumped) doc.actor?.unsetFlag?.(MOD, "jump")?.catch?.(() => null);
    const label = { walk: "Walking", jog: "Jogging", run: "Running", over: "Past the limit" }[p] ?? MV_LABEL(p);
    const msg = `${label}: ${Math.round(total)} / ${cap} yd${way.cost > 1 ? " (shallow water, double)" : ""}${lim.note ? ` (${lim.note})` : ""}${total > lim.attackAfter ? "; no attack this turn" : ""}`;
    try { canvas.interface?.createScrollingText?.(doc.object?.center ?? { x: doc.x, y: doc.y }, msg, { anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fontSize: 22, fill: p === "over" ? "#ff6060" : "#ffffff", stroke: 0x000000, strokeThickness: 4, duration: 2500 }); } catch (e) { /* no canvas */ }
});

/* ------------------------------------------------------------------ */
/*  Automatic initiative (3.4.0)                                       */
/* ------------------------------------------------------------------ */

const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
Hooks.on("combatStart", combat => {
    if (OFF || !isActiveGM() || setting("autoInitiative") === "off") return;
    autoInitiative(combat).catch(e => console.error("WoDX |", e));
});
const lastInitRound = new Map();
Hooks.on("updateCombat", (combat, changed) => {
    if (OFF || !isActiveGM() || setting("autoInitiative") !== "round" || !("round" in (changed ?? {})) || !combat.started) return;
    if (combat.round <= 1 || combat.round <= (lastInitRound.get(combat.id) ?? 0)) return;
    lastInitRound.set(combat.id, combat.round);
    autoInitiative(combat).catch(e => console.error("WoDX |", e));
});

Hooks.once("init", () => {
    if (OFF) return;
    Hooks.on("renderChatMessageHTML", (msg, el) => { if (msg.getFlag(MOD, "data")) bindCard(msg, el); });
});

/* ------------------------------------------------------------------ */
/*  Automatic options (3.4.0)                                          */
/* ------------------------------------------------------------------ */

function roundKey() {
    const c = game.combat;
    return c?.started ? { combatId: c.id, round: c.round } : null;
}
/** The data of this module's recent attack cards (the last 300 messages). */
function recentCards() {
    return (game.messages?.contents ?? []).slice(-300).map(m => m.getFlag?.(MOD, "data")).filter(Boolean);
}
/** How many times this defender has already defended this turn (each further defense is −1 die, VtDA20 p. 344). */
export function defensesThisRound(target) {
    return target ? AU.countThisRound(recentCards(), roundKey(), d => d.defended && d.target === target.uuid) : 0;
}
/** How many attacks this attacker has already made this turn. */
export function attacksThisRound(attacker) {
    return attacker ? AU.countThisRound(recentCards(), roundKey(), d => d.attacker === attacker.uuid) : 0;
}
/** Extra actions bought this turn without the multiple-action penalty (Rage, recorded by WoDX Actions). */
function freeActionsIn(actor, combat) {
    const f = actor?.getFlag?.("wodx-actions", "extraActions");
    return combat && f?.key === `${combat.id}:${combat.round}` ? num(f.n) : 0;
}
function freeActions(attacker) {
    const k = roundKey(), f = attacker?.getFlag?.("wodx-actions", "extraActions");
    return k && f?.key === `${k.combatId}:${k.round}` ? num(f.n) : 0;
}
/** Tokens hostile to this token within reach (edges within half a square, any token size, gridless too), not defeated. */
function opponentsAround(tok) {
    const t = tok?.document ?? tok, obj = tok?.object ?? tok;
    if (!t?.parent || !obj?.center) return null;
    const unit = t.parent.grid?.distance ?? 5;
    const disp = t.disposition;
    let n = 0;
    for (const o of t.parent.tokens ?? []) {
        if (o.id === t.id || !o.object?.center || o.hidden) continue;
        if (o.actor?.statuses?.has?.("dead") || o.actor?.statuses?.has?.("unconscious")) continue;
        const hostile = (disp === 1 && o.disposition === -1) || (disp === -1 && o.disposition === 1) || (disp === 0 && o.disposition !== 0);
        if (!hostile) continue;
        const d = tokenDistance(obj, o.object, { reach: true });
        if (AU.inReach(d, unit)) n++;
    }
    return n;
}

/**
 * Fill in the dialog's "Automatic" choices from the scene and this turn's cards: position (token facing), multiple
 * actions, opponents engaged and the defender's defense count. Changes fd; returns notes for the card.
 */
function resolveAutoOptions(attacker, target, fd, { attackerTok = null, targetTok = null } = {}) {
    const notes = [];
    const aTok = attackerTok ?? attacker?.getActiveTokens?.()[0] ?? null;
    const tTok = targetTok ?? target?.getActiveTokens?.()[0] ?? null;
    if (fd.flank === "auto" || fd.flank === undefined) {
        const side = tTok && aTok ? AU.facingSide(tTok.center ?? tTok.object?.center, (tTok.document ?? tTok).rotation, aTok.center ?? aTok.object?.center) : null;
        fd.flank = side === "flank" ? "flank" : side === "rear" ? "rear" : "";
        if (side === "flank") notes.push("from the flank (+1 die)");
        else if (side === "rear") notes.push("from behind (+2 dice)");
    }
    if (fd.multi === "auto" || fd.multi === undefined) {
        const k = attacksThisRound(attacker), free = freeActions(attacker);
        fd.multi = Math.max(0, Math.min(4, k - free));
        if (k) notes.push(`attack ${k + 1} this turn${fd.multi ? ` (−${fd.multi} die, +${fd.multi} difficulty)` : " (an extra action bought with Rage: no penalty)"}`);
    }
    if (fd.oppAuto) {
        const n = opponentsAround(aTok);
        if (n != null) { fd.opponents = Math.max(1, n); if (n > 1) notes.push(`${n} opponents engaged (+${Math.min(4, n - 1)} difficulty)`); }
    }
    // Moving more than half their running speed leaves no attack this turn (VtDA20 p. 333)
    const mv = movedThisRound(aTok);
    if (mv && mv.yards > mv.limits.attackAfter) notes.push(`moved ${Math.round(mv.yards)} yards this turn, more than half their running speed (${mv.limits.attackAfter}): by the book no attack follows`);
    else if (mv?.yards) notes.push(`moved ${Math.round(mv.yards)} yards this turn`);
    if (target && (fd.defIndex === "auto" || fd.defIndex === undefined)) {
        const k = defensesThisRound(target);
        fd.defIndex = k;
        if (k) notes.push(`${target.name}'s defense ${k + 1} this turn (−${k} ${k === 1 ? "die" : "dice"})`);
    }
    return notes;
}

/** A character's soak policy for automatic Fortitude (stored on the actor). */
export function soakPolicy(actor) {
    const p = actor?.getFlag?.(MOD, "soakPolicy");
    return AU.SOAK_POLICIES[p] ? p : "aggravated";
}
/** "auto" | "yes" | "no" | boolean → spend a blood point for Fortitude on this hit? */
function resolveFortitude(target, choice, dp, fd) {
    if (choice === true || choice === "yes") return true;
    if (!choice || choice === "no") return false;
    if (choice !== "auto" || !target) return false;
    return AU.fortitudeDecision(soakPolicy(target), { dmgType: dp?.dmgType, fireOrSun: !!fd.fireSun,
        fortitude: discipline(target, "Fortitude"), blood: num(P.resource(target, "blood").value) });
}
export async function setSoakPolicy(actor) {
    const a = actor?.actor ?? actor;
    if (!a) return null;
    const cur = soakPolicy(a);
    const r = await P.ask({ title: `Soak policy: ${a.name}`, width: 420, classes: ["vtc-dialog"],
        content: `<form class="vtc-form"><p>When ${esc(a.name)} is hit and the attack dialog's Fortitude choice is Automatic, spend a blood point for automatic Fortitude soak (VtDA20 printed p. 221):</p>
          <div class="form-group"><label>Policy</label><select name="policy" data-fixed>${Object.entries(AU.SOAK_POLICIES).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div></form>`,
        buttons: [{ id: "ok", label: "Save", icon: "fas fa-check", default: true }, { id: "cancel", label: "Cancel" }] });
    if (!r || r.id !== "ok") return null;
    if (a.isOwner) await a.setFlag(MOD, "soakPolicy", r.data.policy);
    else requestGM({ action: "update", uuid: a.uuid, data: { [`flags.${MOD}.soakPolicy`]: r.data.policy } });
    ui.notifications.info(`${a.name}: ${AU.SOAK_POLICIES[r.data.policy]}.`);
    return r.data.policy;
}

/** Plan one attack with the dialog's choices: a named weapon, or the automatic best. */
function planChoice(attacker, target, fd, weaponId, tokens) {
    const r = bestAttack(attacker, target, fd, tokens);
    if (weaponId && weaponId !== "auto") return r.plans.find(p => p.w.id === weaponId && p.valid) ?? null;
    return r.best;
}

/**
 * Suggestions for the attack dialog (never applied on their own): Willpower and Potence blood when they change the
 * likely outcome, and the maneuver with the most expected harm. Returns an array of HTML lines.
 */
export function computeHints(attacker, target, fdIn = {}, tokens = {}) {
    if (!attacker || !target) return [];
    const fd = { ...fdIn };
    resolveAutoOptions(attacker, target, fd, tokens);
    const base = planChoice(attacker, target, fd, fd.weapon, tokens);
    if (!base) return [];
    const lines = [`<b>Expected:</b> ${esc(base.w.name)} hits ${AU.pct(base.hitChance)} of the time, ${base.expectedLevels.toFixed(1)} ${base.dmgType} levels on average.`];
    if (!fd.willpower && willpower(attacker) > 0) {
        const wp = planChoice(attacker, target, { ...fd, willpower: true }, base.w.id, tokens);
        if (wp && AU.worthIt(base, wp)) lines.push(`<b>Willpower is worth it:</b> hits ${AU.pct(base.hitChance)} → ${AU.pct(wp.hitChance)}, ${base.expectedLevels.toFixed(1)} → ${wp.expectedLevels.toFixed(1)} levels.`);
    }
    const pot = discipline(attacker, "Potence");
    if (pot && !fd.potBlood && base.w.dmgAttr === "strength" && num(P.resource(attacker, "blood").value) > 0) {
        const pb = planChoice(attacker, target, { ...fd, potBlood: true }, base.w.id, tokens);
        if (pb && AU.worthIt(base, pb)) lines.push(`<b>Potence blood is worth it:</b> ${base.expectedLevels.toFixed(1)} → ${pb.expectedLevels.toFixed(1)} levels.`);
    }
    const table = maneuverTable();
    let best = null;
    for (const [k, m] of Object.entries(table)) {
        if (AU.SUGGEST_SKIP.has(k) || m.noDamage) continue;
        const p = planChoice(attacker, target, { ...fd, maneuver: k }, fd.weapon, tokens);
        if (p && (!best || p.expectedLevels > best.p.expectedLevels)) best = { k, m, p };
    }
    const cur = fd.maneuver || "normal";
    if (best && best.k !== cur && best.p.expectedLevels > base.expectedLevels * 1.1 + 0.05)
        lines.push(`<b>Maneuver for the most harm:</b> ${esc(best.m.label)}: ${base.expectedLevels.toFixed(1)} → ${best.p.expectedLevels.toFixed(1)} levels${best.m.note ? ` <i>(${esc(String(best.m.note).replace(/\{name\}/g, attacker.name))})</i>` : ""}.`);
    return lines;
}

/** Keep the dialog's suggestions up to date as choices change. */
function bindHints(root, { attacker, target, attackerTok, targetTok }) {
    const form = root?.querySelector?.("form") ?? root;
    const box = form?.querySelector?.(".vtc-hints");
    if (!box) return;
    let t = null;
    const upd = () => {
        clearTimeout(t);
        t = setTimeout(() => {
            try {
                const lines = computeHints(attacker, target, readForm(form), { attackerTok, targetTok });
                box.innerHTML = lines.join("<br>");
                box.style.display = lines.length ? "" : "none";
            } catch (e) { console.warn("WoDX | attack hints", e); box.style.display = "none"; }
        }, 120);
    };
    form.addEventListener("change", upd);
    form.addEventListener("input", upd);
    upd();
}

/* ---- Shots and reloading (3.8.0) ---- */

function darkAgesNow() {
    try { const y = Number(L.chronicle()?.eras?.currentYear?.()); return Number.isFinite(y) && y > 0 && y < 1450; } catch (e) { return false; }
}
function archeryOf(actor) {
    try { return Math.max(num(ability(actor, "archery").value), num(secondaryAbility(actor, null, "Archery")?.value)); } catch (e) { return 0; }
}

/** One round used; returns the rounds left, or null when nothing was counted. */
async function spendShot(actor, w) {
    const item = actor.items.get(w.id);
    if (!item || !(actor.isOwner || game.user.isGM)) return null;
    const sh = R.shotsOf(item.system?.clip);
    if (!sh.counted) return null;
    const left = Math.max(0, sh.value - 1);
    await item.update({ "system.clip.value": left });
    return left;
}

/** Reload a ranged weapon: fill it to capacity and post how many turns it takes. */
export async function reload({ actor: a = null, weaponId = null } = {}) {
    const { attacker: actor } = resolveTokens(a, null);
    if (!actor) return ui.notifications.warn("WoDX Combat: select your token (or assign a character) first.");
    const guns = weaponList(actor).filter(w => w.ranged && w.shots?.counted);
    if (!guns.length) return ui.notifications.info(`${actor.name} has no weapon that takes rounds.`);
    let w = guns.find(x => x.id === weaponId) ?? (guns.length === 1 ? guns[0] : null);
    if (!w) {
        const r = await P.ask({ title: `Reload: ${actor.name}`, width: 420, classes: ["vtc-dialog"],
            content: `<div class="form-group"><label>Weapon</label><select name="weapon" data-fixed>${guns.map(g => `<option value="${g.id}">${g.name} (${g.shots.value}/${g.shots.max})</option>`).join("")}</select></div>`,
            buttons: [{ id: "reload", label: "Reload", default: true }, { id: "cancel", label: "Cancel" }] });
        if (!r || r.id !== "reload") return null;
        w = guns.find(x => x.id === r.data.weapon);
    }
    if (!w) return null;
    const item = actor.items.get(w.id);
    if (!item) return null;
    const t = R.reloadTurns({ crossbow: w.crossbow, darkAges: darkAgesNow(), archery: archeryOf(actor) });
    await item.update({ "system.clip.value": w.shots.max });
    const how = t.turns === 1 ? "one full turn, with concentration; it can be one of several actions" : `${t.turns} turns`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="vtc-card"><b>${actor.name} reloads ${w.name}</b> (${w.shots.max} round${w.shots.max === 1 ? "" : "s"}): ${how} (${t.ref}).</div>` });
    return { weapon: w.id, turns: t.turns, rounds: w.shots.max };
}

/**
 * One click, no dialog: every automatic choice (weapon, defense, position, counts, Fortitude policy) and the conditions'
 * dice and difficulty. With several tokens selected, each attacks the target in turn. Spends no Willpower or blood
 * of its own accord.
 */
export async function quickAttack({ attacker: a = null, target: t = null } = {}) {
    const attackers = a ? [a] : (canvas.tokens?.controlled?.length ? [...canvas.tokens.controlled] : [null]);
    const results = [];
    for (const one of attackers) {
        const { attacker, attackerTok, target, targetTok } = resolveTokens(one, t);
        if (!attacker) { ui.notifications.warn("WoDX Combat: select your token (or assign a character) first."); continue; }
        if (!target) { ui.notifications.warn("WoDX Combat: target someone for the quick attack."); return results; }
        const cm = conditionMods(attacker, target);
        const fd = { weapon: "auto", maneuver: "normal", targeting: "none", range: "short", flank: "auto", multi: "auto", opponents: 1, oppAuto: true,
            extraDice: cm.attackerDice, extraDiff: cm.attackerDiff, extraDmg: 0, defense: "auto", defIndex: "auto", defDice: 0,
            defDiff: defenseDiffOf(target), defCel: discipline(target, "Celerity") > 0,
            celDice: setting("celerityDice"), fortBlood: "auto", soakBonus: 0, atkKind: "auto", profile: "auto" };
        try {
            if (await ambushFirst({ attacker, attackerTok, target, targetTok, fd })) results.push(await resolveAttack({ attacker, attackerTok, target, targetTok, weapon: { id: "auto" }, fd }));
            openFight(attackerTok, targetTok);
        }
        catch (e) { console.error(e); ui.notifications.error(`WoDX Combat: ${attacker.name}: ${e.message}`); }
    }
    return results;
}

/** Active GM: everyone's initiative at the start of a fight or a turn, with the extra actions bought so far. */
async function autoInitiative(combat) {
    const list = combat.combatants.contents.filter(c => c.actor && !c.isDefeated);
    if (!list.length) return null;
    return rollInitiative({ combat, combatants: list, all: true, automatic: true });
}

/** Token HUD shortcut: right-click a token and press the sword to attack your current target with it. */
Hooks.on("renderTokenHUD", (hud, html) => {
    if (OFF) return;
    const root = html instanceof HTMLElement ? html : html[0];
    const tok = hud.object;
    if (!tok?.actor?.isOwner || !root) return;
    const col = root.querySelector(".col.left");
    if (!col) return;
    const btn = document.createElement("div");
    btn.className = "control-icon vtc-hud";
    btn.title = "WoDX Attack";
    btn.innerHTML = '<i class="fas fa-khanda"></i>';
    btn.title = "WoDX Attack (shift-click: quick attack with every automatic choice; right-click: set actor type)";
    btn.addEventListener("click", ev => ev.shiftKey ? quickAttack({ attacker: tok }) : attack({ attacker: tok }));
    btn.addEventListener("contextmenu", ev => { ev.preventDefault(); pickKind(tok.actor); });
    col.appendChild(btn);
});

/* ------------------------------------------------------------------ */
/*  WoDX conditions (registry in WoDX Chronicle)                       */
/* ------------------------------------------------------------------ */

/** What the conditions on attacker and defender change: {attackerDice, attackerDiff, notes}. */
export function conditionMods(attacker, target) {
    const c = L.chronicle()?.conditions;
    if (!attacker) return { attackerDice: 0, attackerDiff: 0, autoHit: false, notes: [] };
    const out = c ? c.attackModifiers(attacker, target ?? null) : { attackerDice: 0, attackerDiff: 0, autoHit: false, notes: [] };
    // 3.12.0: prone, flying, swimming, climbing... on both sides (house rules B946)
    try {
        const mv = MVJ.attackMods(attacker, target ?? null);
        out.attackerDiff += mv.diff;
        out.notes = [...(out.notes ?? []), ...mv.notes.map(n => `${n} (house rule)`), ...(mv.blocked ? [`Cannot attack: ${mv.blocked}`] : [])];
    } catch (e) { /* movement off */ }
    return out;
}
/** The defence difficulty: the defender's conditions and, on a dodge, their stance (3.12.0). */
function defenseDiffOf(target) {
    let d = L.chronicle()?.conditions?.defenseDifficulty?.(target) ?? 0;
    try { d += MVJ.defenseMods(target).diff; } catch (e) { /* movement off */ }
    return d;
}

/** Dazed when one attack does more than Stamina after soak; Stamina + 2 for the supernatural (V20 Dark Ages p. 348). */
export function dazedThreshold(target, kind = getKind(target)) {
    const stamina = attr(target, "stamina");
    // WoDX reading: hunters, mages and animals have mortal bodies; every other profile is supernatural
    const mortalBodied = ["mortal", "hunter", "mage", "beast"].includes(kind);
    return mortalBodied ? { threshold: stamina, label: "Stamina" } : { threshold: stamina + 2, label: "Stamina + 2" };
}

async function markDazed(actor) {
    const api = L.chronicle();
    if (!api?.applyTimed) return;
    if (!actor.isOwner) return requestGM({ action: "dazed", uuid: actor.uuid });
    // In a fight Dazed lasts the next turn; outside one there are no turns, so it lasts until the scene ends
    const duration = game.combat?.started ? { kind: "rounds", rounds: 1 } : { kind: "scene" };
    await api.applyTimed(actor, { name: "Dazed", condition: "dazed", key: "wodx-dazed", duration, source: "V20 Dark Ages p. 348" });
}
