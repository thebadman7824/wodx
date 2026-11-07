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
 *   menu / macros keep working from v1.x
 */

import * as R from "./rules.js";
import * as P from "./profiles.js";
import * as F from "./flavor.js";
import * as L from "./legacy.js";
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
        "Add Celerity dots to Dexterity-based attack, defense and Initiative pools.", Boolean, true);
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
    s("flavorText", "Flavor text on attack cards",
        "Add one short line of description under the dice of each attack card, picked to fit the outcome (miss, hit, heavy hit, soaked, botch). Edit the lines in scripts/flavor.js.",
        String, "all", { choices: { all: "Shown to everyone", gm: "Whispered to the GM", off: "Off" } });
}
const setting = k => game.settings.get(MOD, k);

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
        if (i.type !== "Armor" || !i.system?.isequipped) continue;
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
            desc: String(s.description || "").replace(/<[^>]+>/g, " ")
        });
    }
    list.sort((a, b) => (b.equipped - a.equipped) || a.name.localeCompare(b.name));
    for (const [k, u] of Object.entries(R.UNARMED)) list.push({ id: `unarmed:${k}`, unarmed: true, ranged: false, ...u, secondaryId: "", minStr: 0, piercing: 0 });
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
export async function applyDamage(actor, type, levels, { status = true } = {}) {
    if (!actor) throw new Error("No actor");
    if (!actor.isOwner) {
        requestGM({ action: "applyDamage", uuid: actor.uuid, type, levels });
        return { requested: true };
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
    return actor.update(healthUpdate(actor, damage));
}

export async function healDamage(actor, type, levels) {
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
        if (p.messageId) await recordApplied(p.messageId, actor, r);
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
    const wOpts = weapons.map(w => `<option value="${w.id}" ${w.id === selWeapon ? "selected" : ""}>${w.name}${w.equipped ? " ★" : ""}</option>`).join("");
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
  ${kinds ? `<fieldset><legend>Actor types</legend>
    <div class="form-group"><label>Attacker</label><select name="atkKind" data-fixed>${kindOpts("auto", `Automatic — ${P.profileLabel(aKind)}`)}</select></div>
    <div class="form-group"><label>Defender</label><select name="profile" data-fixed>${kindOpts("auto", `Automatic — ${P.profileLabel(tKind)}`)}</select></div>
    <div class="form-group"><label><input type="checkbox" name="remember"/> Save these choices on the actors</label></div>
  </fieldset>` : ""}
  <fieldset><legend>Attack</legend>
    <div class="form-group"><label>Weapon</label>${weapons.length > 5 ? searchBox("select[name=weapon]", "Search weapons…", "Search weapons") : ""}<select name="weapon">${wOpts}</select></div>
    <div class="form-group"><label>Maneuver</label><select name="maneuver" data-fixed>${opts(maneuverTable(), "normal")}</select></div>
    <div class="form-group"><label>Targeting</label><select name="targeting" data-fixed>${opts(R.TARGETING, "none")}</select></div>
    <div class="form-group"><label>Range (ranged)</label><select name="range" data-fixed>${opts(R.RANGE, "short")}</select></div>
    <div class="form-group"><label>Position</label><select name="flank" data-fixed>
       <option value="">Front</option><option value="flank">Flank (+1 die)</option><option value="rear">Rear (+2 dice)</option></select></div>
    <div class="form-group"><label>Multiple actions: this is action #</label><select name="multi" data-fixed>
       <option value="0">Only action</option><option value="1">1 of several (+1/-1)</option><option value="2">2 (+2/-2)</option><option value="3">3 (+3/-3)</option><option value="4">4 (+4/-4)</option></select></div>
    <div class="form-group"><label>Opponents engaged</label><input type="number" name="opponents" value="1" min="1" max="6"/></div>
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
      <option value="none">None / cannot defend</option><option value="dodge">Dodge (Dex + Athletics)</option>
      <option value="block">Block (Dex + Brawl)</option><option value="parry">Parry (Dex + Melee)</option></select></div>
    <div class="form-group"><label>Defender: defense # this turn (full defense)</label><select name="defIndex" data-fixed>
      <option value="0">First (full pool)</option><option value="1">Second (-1 die)</option><option value="2">Third (-2)</option><option value="3">Fourth (-3)</option></select></div>
    <div class="form-group"><label>Defender extra dice / difficulty</label>
       <input type="number" name="defDice" value="0" style="width:4em"/> <input type="number" name="defDiff" value="${target ? L.chronicle()?.conditions?.defenseDifficulty?.(target) ?? 0 : 0}" style="width:4em"/></div>
    ${tCel ? `<div class="form-group"><label><input type="checkbox" name="defCel" checked/> Defender Celerity ${tCel} (adds dice; dodge arrows normally)</label></div>` : ""}
    ${tFort ? `<div class="form-group"><label><input type="checkbox" name="fortBlood"/> Fortitude ${tFort}: spend 1 blood to soak automatically</label></div>` : ""}
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

export async function attack({ attacker: a, target: t, weaponId } = {}) {
    const { attacker, attackerTok, target, targetTok } = resolveTokens(a, t);
    if (!attacker) return ui.notifications.warn("WoDX Combat: select your token (or assign a character) first.");
    if (!target) ui.notifications.info("WoDX Combat: no target selected: the attack will be rolled without defense or soak.");
    if ((game.user.targets?.size ?? 0) > 1) ui.notifications.info("WoDX Combat: several targets selected: using the first one.");
    const weapons = weaponList(attacker);
    const sel = weaponId ?? weapons[0]?.id;
    const content = attackDialogHtml(attacker, target, weapons, sel);
    const aKind = getKind(attacker), tKind = target ? getKind(target) : "mortal";
    const r = await P.ask({
        title: `WoDX Attack — ${P.profileLabel(aKind)}`,
        content, width: 500, classes: ["vtc-dialog"],
        buttons: [{ id: "attack", label: "Attack", icon: "fas fa-dice-d10", default: true }, { id: "cancel", label: "Cancel" }],
        onRender: root => bindKinds(root, aKind, tKind)
    });
    if (!r || r.id !== "attack") return null;
    const fd = r.data;
    const w = weapons.find(x => x.id === fd.weapon);
    try { return await resolveAttack({ attacker, attackerTok, target, targetTok, weapon: w, fd }); }
    catch (e) { console.error(e); ui.notifications.error(`WoDX Combat: ${e.message}`); return null; }
}

/* ------------------------------------------------------------------ */
/*  Attack resolution                                                  */
/* ------------------------------------------------------------------ */

async function resolveAttack({ attacker, attackerTok, target, targetTok, weapon: w, fd }) {
    const log = [], rolls = [], spendNotes = [];
    const maneuver = maneuverTable()[fd.maneuver] ?? R.MANEUVERS.normal;
    const aKind = (fd.atkKind && fd.atkKind !== "auto") ? fd.atkKind : getKind(attacker);
    const targeting = R.TARGETING[fd.targeting] ?? R.TARGETING.none;
    const cel = discipline(attacker, "Celerity"), pot = discipline(attacker, "Potence");

    // ---- Attack pool
    const attrKey = w.attribute || "dexterity";
    const attrVal = attr(attacker, attrKey);
    const ab = weaponAbility(attacker, w);
    const str = attr(attacker, "strength");
    const minStrDiff = w.minStr && str < w.minStr ? (w.minStr - str) : 0;
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
    const pool = R.attackPool({
        attribute: attrVal, attributeLabel: cap(attrKey),
        ability: ab.value, abilityLabel: ab.name,
        accuracy: w.accuracy, maneuverDice: maneuver.dice || 0,
        celerityDice: (fd.celDice && attrKey === "dexterity") ? cel : 0,
        flank: fd.flank, extraDice: (fd.extraDice || 0) + boostDice, woundPenalty: woundPenalty(attacker),
        multiIndex: fd.multi, celerityIgnoresMulti: !!fd.celMulti,
        baseDifficulty: w.diff, maneuverDiff: maneuver.diff, targetingDiff: targeting.diff,
        rangeDiff: w.ranged ? (R.RANGE[fd.range]?.diff ?? 0) : 0, minStrDiff,
        bypassArmor: fd.bypass, opponents: fd.opponents, blind: fd.blind, extraDiff: fd.extraDiff
    });
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

    // ---- Defense
    let def = null, defNote = "";
    const tKind = target ? ((fd.profile && fd.profile !== "auto") ? fd.profile : getKind(target)) : "mortal";
    const profile = P.profileSoak(tKind);
    if (fd.remember) {
        if (fd.atkKind && fd.atkKind !== "auto") await P.setProfile(attacker, fd.atkKind);
        if (target && fd.profile && fd.profile !== "auto") await P.setProfile(target, fd.profile);
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
    const fireSun = !!fd.fireSun;
    const dmgType = (fireSun || fd.bane2 || (R.BANES[tKind] === "Cold iron" && /cold iron/i.test(w.name))) ? "aggravated" : (w.type || "lethal");
    const bane = !!(fd.bane || fd.bane2 || (R.BANES[tKind] && new RegExp(R.BANES[tKind], "i").test(`${w.name} ${w.desc || ""}`)));
    if (bane) log.push(`${R.BANES[tKind] ?? "Bane"} weapon: ${target?.name ?? "the target"} has no natural soak.`);
    if (hit && !maneuver.noDamage) {
        dmgPool = damagePool(attacker, w, net, maneuver, targeting, fd, pot);
        dmg = await rollPool(dmgPool.dice, 6, { canBotch: false, autoSuccesses: dmgPool.auto });
        if (dmg.roll) rolls.push(dmg.roll);

        if (target) {
            const arm = armor(target);
            const armorRating = Math.max(arm.bashing, arm.lethal, arm.aggravated);
            const sp = R.soakPool({
                profile, damageType: dmgType,
                stamina: attr(target, "stamina"), fortitude: discipline(target, "Fortitude"),
                armor: arm[dmgType] ?? 0, armorPiercing: w.piercing, bypassArmor: fd.bypass,
                fireOrSun: fireSun, fortitudeBlood: !!fd.fortBlood, bane, bonus: fd.soakBonus
            });
            if (fd.fortBlood && sp.autoSoak) spendNotes.push(...await spend(target, 0, 1));
            soak = await rollPool(sp.dice, 6, { canBotch: false, autoSuccesses: sp.autoSoak });
            soak.pool = sp;
            if (soak.roll) rolls.push(soak.roll);
            const left = R.damageAfterSoak(dmg.successes, soak.successes, dmgType, profile, { elder: isElder(target) });
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
    const data = {
        attacker: attacker.uuid, target: target?.uuid ?? null, targetToken: targetTok?.document?.uuid ?? null,
        type: outcome?.type, levels: outcome?.levels ?? 0, applied: false,
        counter: counter ? { uuid: attacker.uuid, type: counter.type, levels: counter.levels } : null
    };
    let html = attackCard({ attacker, target, w, ab, attrKey, pool, atk, def, defNote, net, hit, dmg, dmgPool, soak, outcome, profile, armorBroken, counter, spendNotes, fd, maneuver, log });
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

async function rollDefense(target, fd, w, maneuver) {
    const type = fd.defense;
    const close = isCloseCombat(w);
    const dmgType = fd.fireSun ? "aggravated" : (w.type || "lethal");
    const hasFort = discipline(target, "Fortitude") > 0;
    const arm = armor(target);
    const hasArmor = arm.bashing + arm.lethal + arm.aggravated > 0;
    if (type === "parry" && !close) return { invalid: "Parry only works against close-combat attacks: no defense." };
    if (type === "block" && !close) return { invalid: "Block only works against close-combat attacks: no defense." };
    if (type === "block" && dmgType !== "bashing" && !hasFort && !hasArmor)
        return { invalid: "Blocking a lethal or aggravated attack needs Fortitude or armor: no defense." };

    let abKey = { dodge: "athletics", block: "brawl", parry: "melee" }[type];
    let ab = ability(target, abKey);
    if (type === "dodge") { const d2 = ability(target, "dodge"); if (d2.value > ab.value) { ab = d2; abKey = "dodge"; } }
    const cel = fd.defCel ? discipline(target, "Celerity") : 0;
    let dice = attr(target, "dexterity") + ab.value + (setting("celerityDice") ? cel : 0) + (fd.defDice || 0)
        + woundPenalty(target) - (fd.defIndex || 0);
    let diff = 6 + (fd.defDiff || 0) + (maneuver.defDiff || 0);
    const notes = [];
    if (type === "dodge" && w.ranged) {
        if (cel) notes.push("Celerity: no penalty to dodge missiles");
        else { diff += 2; notes.push("dodging missiles +2 diff"); }
    }
    if (maneuver.defDiff) notes.push(`${maneuver.label.split(" ")[0].toLowerCase()} +${maneuver.defDiff} diff`);
    if (fd.defIndex) notes.push(`full defense: -${fd.defIndex} dice`);
    let weapon = null;
    if (type === "parry") {
        const mw = target.items.filter(i => i.type === "Melee Weapon" && !i.system?.isnatural);
        weapon = mw.find(i => i.system?.isequipped) ?? mw[0] ?? null;
        if (!weapon) notes.push("no melee weapon on the sheet");
    }
    const r = await rollPool(Math.max(0, dice), diff);
    const abLabel = game.i18n.localize(target.system?.abilities?.[abKey]?.label || "") || ab.name || abKey;
    return { ...r, type, abilityName: (abLabel.startsWith("wod.") || abLabel === abKey) ? cap(abKey) : abLabel, notes, weapon };
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
    const sp = R.soakPool({ profile, damageType: type, stamina: attr(victim, "stamina"), fortitude: discipline(victim, "Fortitude"), armor: arm[type] ?? 0 });
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
    if (def || defNote) {
        L.push(`<div class="vtc-sec"><b>Defense</b> `);
        if (defNote) L.push(`<span class="vtc-warn">${defNote}</span>`);
        else {
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
        L.push(`<div class="vtc-sec"><b>Parry turns the blow</b> (${target.name}'s ${counter.wname} vs unarmed attack — ${attacker.name} may only soak)`);
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
        fae: "changeling", wraith: "wraith", spirit: "spirit" }[p] ?? p;
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
  <div class="form-group"><label><input type="checkbox" name="fortBlood"/> Spend blood for automatic Fortitude soak</label></div>
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
    const type = fd.fireSun ? "aggravated" : fd.type;
    const rolls = [];
    let dmgLevels = fd.amount, dmgRoll = null;
    if (fd.mode === "pool") {
        dmgRoll = await rollPool(fd.amount, 6, { canBotch: false });
        if (dmgRoll.roll) rolls.push(dmgRoll.roll);
        dmgLevels = dmgRoll.successes;
    }
    const kind = getKind(actor), profile = P.profileSoak(kind);
    let soak = null, sp = null, left = { levels: dmgLevels, halved: false };
    if (fd.soak) {
        const arm = armor(actor);
        sp = R.soakPool({ profile, damageType: type, stamina: attr(actor, "stamina"), fortitude: discipline(actor, "Fortitude"),
            armor: fd.noArmor ? 0 : (arm[type] ?? 0), fireOrSun: !!fd.fireSun, fortitudeBlood: !!fd.fortBlood, bane: !!fd.bane, bonus: fd.soakBonus });
        if (fd.fortBlood && sp.autoSoak) await spend(actor, 0, 1);
        soak = await rollPool(sp.dice, 6, { canBotch: false, autoSuccesses: sp.autoSoak });
        if (soak.roll) rolls.push(soak.roll);
        left = R.damageAfterSoak(dmgLevels, soak.successes, type, profile, { elder: isElder(actor) });
    }
    if (fd.chimerical && kind !== "fae") left = { levels: 0, halved: false };
    // Damage from one attack, entered by hand, dazes the same way (V20 Dark Ages p. 348)
    const dz = dazedThreshold(actor, kind);
    const dazed = left.levels > dz.threshold;
    let html = `<div class="vtc-card"><h3>${actor.name} takes damage</h3>`;
    if (dmgRoll) html += `<div class="vtc-sec"><b>Damage</b> ${fd.amount} dice, diff 6${diceHtml(dmgRoll.faces, 6)}<div class="vtc-res">${dmgLevels} levels</div></div>`;
    else html += `<div class="vtc-sec"><b>Damage</b> ${dmgLevels} ${type} levels</div>`;
    if (soak) html += `<div class="vtc-sec"><b>Soak</b> (${profileLabel(profile)}): ${sp.dice} dice${sp.autoSoak ? ` + ${sp.autoSoak} automatic` : ""}<div class="vtc-parts">${sp.notes.join(" · ")}</div>${diceHtml(soak.faces, 6)}<div class="vtc-res">${soak.successes} soaked${left.halved ? " · bashing halved" : ""}</div></div>`;
    html += `<div class="vtc-big ${left.levels ? "hit" : ""}">${left.levels ? `${left.levels} ${type}` : "No damage"}</div>`;
    if (dazed) html += `<div class="vtc-note"><b>Dazed:</b> ${left.levels} levels after soak is more than ${dz.label} (${dz.threshold}): ${esc(actor.name)} spends the next turn shaking it off (V20 Dark Ages p. 348).</div>`;
    if (fd.chimerical) html += `<div class="vtc-note">Chimerical damage: only changelings and chimerical beings are hurt; the body of a mortal or other supernatural is unharmed${kind === "fae" ? "" : " — apply nothing to " + actor.name + " unless the Storyteller rules otherwise"}.</div>`;
    if (left.levels) html += `<div class="vtc-pending">${setting("autoApply") ? "Applying…" : ""}<button type="button" class="vtc-apply" data-which="main">Apply ${left.levels} ${type} to ${actor.name}</button></div>`;
    html += `</div>`;
    const data = { target: actor.uuid, targetToken: tok.document?.uuid ?? null, type, levels: left.levels, applied: false };
    const msg = await postCard(tok.document ? tok : null, actor, html, rolls, data);
    if (setting("autoApply") && left.levels) await applyFromMessage(msg, "main");
    if (dazed && setting("statusEffects")) await markDazed(actor);
    return { levels: left.levels, dazed, message: msg };
}

/* ------------------------------------------------------------------ */
/*  Initiative                                                         */
/* ------------------------------------------------------------------ */

/** VtDA20 initiative: 1d10 + Dexterity + Wits (+ Celerity) – wound penalty. */
export async function rollInitiative({ combat = game.combat, combatants = null, all = false } = {}) {
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
        const cel = setting("celerityDice") ? discipline(a, "Celerity") : 0;
        const wp = woundPenalty(a);
        const roll = new Roll(`1d10 + ${dex} + ${wits} + ${cel} + ${wp > -99 ? wp : 0}`);
        if (GEN() < 12) await roll.evaluate({ async: true }); else await roll.evaluate();
        rolls.push(roll);
        // Ties go to the higher rating (Dexterity + Wits), encoded as decimals.
        const rating = dex + wits + cel;
        const value = roll.total + rating / 100;
        updates.push({ _id: c.id, initiative: value });
        const inc = wp <= -99 ? " — <i>Incapacitated, cannot act</i>" : "";
        lines.push(`<tr><td>${c.name}</td><td>${roll.dice[0].total}</td><td>${dex}+${wits}${cel ? `+${cel}` : ""}${wp ? ` ${wp > -99 ? wp : ""}` : ""}</td><td><b>${roll.total}</b>${inc}</td></tr>`);
    }
    await combat.updateEmbeddedDocuments("Combatant", updates);
    const content = `<div class="vtc-card"><h3>Initiative</h3><table class="vtc-init"><tr><th></th><th>d10</th><th>Dex+Wits</th><th>Total</th></tr>${lines.join("")}</table>
      <div class="vtc-note">Actions are declared from lowest to highest initiative and resolved from highest to lowest (VtDA20 p. 322).</div></div>`;
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
    { name: "WoDX: Initiative", img: "icons/svg/d20-highlight.svg", command: "game.wodxCombat.rollInitiative({ all: game.user.isGM && canvas.tokens.controlled.length === 0 });" }
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
    P.register();
    const api = { attack, soakDialog, soakAndApply, applyDamage, healDamage, setDamage, rollInitiative, getProfile,
        getKind, setKind, pickKind, profiles: P, attr, ability, discipline, armor, rules: R, version: "3.0.1",
        conditionMods, dazedThreshold, _dialogs: { attackDialogHtml } };
    game.wodxCombat = api;
    L.alias("combat", "vtda20combat", api, "vtda20-combat");
    const mod = game.modules.get(MOD);
    if (mod) mod.api = api;
});

Hooks.once("ready", async () => {
    if (OFF) return L.warnOld("WoDX Combat", "vtda20-combat");
    if (game.system.id !== "worldofdarkness") console.warn(`${MOD} | designed for the worldofdarkness system (found ${game.system.id}).`);
    game.socket.on(SOCKET, onSocket);
    await createMacros();
    console.log(`${MOD} | ready`);
});

Hooks.once("init", () => {
    if (OFF) return;
    if (GEN() >= 13) {
        Hooks.on("renderChatMessageHTML", (msg, el) => { if (msg.getFlag(MOD, "data")) bindCard(msg, el); });
    } else {
        Hooks.on("renderChatMessage", (msg, html) => { if (msg.getFlag(MOD, "data")) bindCard(msg, html[0] ?? html); });
    }
});

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
    btn.title = "WoDX Attack (right-click: set actor type)";
    btn.addEventListener("click", () => attack({ attacker: tok }));
    btn.addEventListener("contextmenu", ev => { ev.preventDefault(); pickKind(tok.actor); });
    col.appendChild(btn);
});

/* ------------------------------------------------------------------ */
/*  WoDX conditions (registry in WoDX Chronicle)                       */
/* ------------------------------------------------------------------ */

/** What the conditions on attacker and defender change: {attackerDice, attackerDiff, notes}. */
export function conditionMods(attacker, target) {
    const c = L.chronicle()?.conditions;
    if (!c || !attacker) return { attackerDice: 0, attackerDiff: 0, autoHit: false, notes: [] };
    return c.attackModifiers(attacker, target ?? null);
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
