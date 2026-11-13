/**
 * WoDX Actions — non-combat automation for Vampire: The Dark Ages 20th Anniversary
 * on the World of Darkness 20th Edition system (Foundry VTT).
 *
 * game.wodxActions
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
 *   getKind(actor) / setKind(actor, key) / pickKind(actor)   actor-type profile (shared with WoDX Combat)
 *   profileMenu({actor})           the launcher shows a different menu for each actor type (v2.0)
 */

import { spendTime } from "./spend-time.js";
import * as R from "./rules.js";
import * as P from "./profiles.js";
import * as PM from "./profile-menus.js";
import * as F from "./flavor.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import * as GX from "./garou.js";
import * as KR from "./kindred-rules.js";
import * as KX from "./kindred.js";
import * as WRR from "./witness-rules.js";
import * as SR from "./sunlight-rules.js";
import * as SX from "./sunlight.js";
import * as WR from "./wraith-rules.js";
import * as WX from "./wraith.js";
import * as HR from "./hunter-rules.js";
import * as HX from "./hunter.js";
import * as KRR from "./reckoning-rules.js";
import * as RX from "./reckoning.js";
import * as VR from "./voice-rules.js";
import * as VX from "./voice.js";
import * as TR from "./theme-rules.js";
import * as MXD from "./mage-da.js";
import * as FXD from "./fae-da.js";
import * as CXD from "./c20.js";
import * as DXD from "./demon.js";
import * as DR from "./demon-rules.js";
import * as KXD from "./kote.js";
import * as KER from "./kote-rules.js";
import * as UXD from "./mummy.js";
import * as UR from "./mummy-rules.js";
import * as OXD from "./orpheus.js";
import * as ORR from "./orpheus-rules.js";
import * as ZXD from "./m20.js";
import * as QX from "./quiet.js";
import * as QR from "./quiet-rules.js";
import * as SFX from "./soulforge.js";
import * as BLX from "./banal-life.js";
import * as EFX from "./effects.js";
import * as PK from "./power-keywords.js";
import * as BR from "./book-rituals.js";
import * as ZR from "./m20-rules.js";
import * as CNR from "./consensus-rules.js";
import * as CK from "./checks-rules.js";
import * as SOR from "./social-rules.js";
import * as TRR from "./trade-rules.js";
import * as SOD from "./social.js";
import * as TH from "./trait-hooks.js";
import * as DH from "./deeper-hooks.js";
import * as KF from "./feeding-rules.js";
import * as HN from "./hunt-night-rules.js";
import { calendarFor } from "../../wodx-npc/scripts/hunt-calendar.mjs";
import * as OD from "./odds-rules.js";
import * as AIM from "./aim.js";

const MOD = "wodx-actions";
const SOCKET = `module.${MOD}`;
const GEN = () => game.release?.generation ?? 11;
const num = v => { const n = parseInt(v); return Number.isFinite(n) ? n : 0; };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const chronicle = () => game.modules?.get?.("wodx-chronicle")?.api ?? null;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ================================================================== */
/*  Settings                                                          */
/* ================================================================== */

function registerSettings() {
    game.settings.register(MOD, "powerEffects", {
        name: "Powers on the effects card",
        hint: "A Discipline or Gift roll with successes puts the power's effect keywords on the effects card, which applies the plain ones with Undo and queues the rest. Needs the effect keywords to be on.",
        scope: "world", config: true, type: Boolean, default: true
    });
    TH.registerTraitSetting();
    const s = (key, name, hint, type, def) =>
        game.settings.register(MOD, key, { name, hint, scope: "world", config: true, type, default: def });
    game.settings.register(MOD, "flavorText", { name: "Flavor text on action cards",
        hint: "Add one short line of description under the result of each action card, picked to fit what was attempted and how it went. Edit the lines in scripts/flavor.js.",
        scope: "world", config: true, type: String, default: "all", choices: { all: "Shown to everyone", gm: "Whispered to the GM", off: "Off" } });
    game.settings.register(MOD, "consensusEra", { name: "Consensus by era", hint: "Before 1450 there is no coincidental or vulgar split; from 1450 to 1699 magick is casual or vain, with Fortune Dice (Sorcerers Crusade); from 1700 Mage 20th. The years are a house rule.",
        scope: "world", config: true, type: Boolean, default: true });
    game.settings.register(MOD, "realityZones", { name: "Reality Zones (Mage 20th)", hint: "Zone: a place's accepted styles decide what is coincidental. One world: one Consensus everywhere. Free: the Storyteller rules each time.",
        scope: "world", config: true, type: String, default: "world", choices: { zone: "The place decides", world: "One Consensus everywhere", free: "The Storyteller rules each time" } });
    s("spendResources", "Deduct Willpower and blood", "Update the character sheet when Willpower or blood is spent or gained.", Boolean, true);
    s("applyChanges", "Apply results to sheets", "Apply health, Road, Virtue, frenzy and blood results automatically. Off: results are reported only.", Boolean, true);
    s("showDice", "Show the dice in chat", "List each die face in result cards.", Boolean, true);
    s("untrained", "Untrained ability rules", "Talents default to the Attribute, Skills at +1 difficulty, Knowledges cannot be attempted (V20 standard).", Boolean, true);
    s("createMacros", "Create hotbar macros", "Create the WoDX Actions macros in the Macro directory if missing.", Boolean, true);
    s("profileMenu", "Menu follows the actor type",
        "The Actions menu shows the buttons for the actor's profile (Kindred, ghoul, mortal, Garou, mage, changeling, wraith...). Off: always the Kindred menu.", Boolean, true);
    s("nightlyBlood", "Blood cost of rising", "Subtract one blood point from each vampire at New Night (V20 printed p. 268).", Boolean, true);
    GX.registerSettings(s);
    KX.registerSettings(s);
    SX.registerSettings(s);
    WX.registerSettings(s);
    HX.registerSettings(s);
    VX.registerSettings(s);
    // 6e: each player's last few menu buttons, per actor type
    game.settings.register(MOD, "menuRecent", { scope: "client", config: false, type: Object, default: {} });
    // 3.43.0: the odds before a roll, on this computer
    game.settings.register(MOD, "showOdds", { name: "Show the odds before a roll", scope: "client", config: true, type: Boolean, default: true,
        hint: "Roll windows show the chance of one success, of three or more and of a botch for the pool as set, with every modifier and where it comes from." });
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
    // An Ability the sheet does not have: rolled untrained, by its kind (common checks, 3.13.0)
    if (id.startsWith("missing:")) { const k = id.slice(8); return findAbility(actor, k) ?? { id, key: k, name: cap(k), value: 0, type: CK.abilityKind(k), specialty: "" }; }
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
    let conscienceLabel = lab(v.conscience, "Conscience");
    let controlLabel = lab(v.selfcontrol, "Self-Control");
    let isConviction = (v.conscience?.label || "").includes("conviction"), isInstinct = (v.selfcontrol?.label || "").includes("instinct");
    // A recognized Dark Ages Road decides its own Virtues (VtDA20 pp. 110–145)
    const found = KX.DATA.roads ? KX.roadOf(actor) : null;
    if (found) {
        const rv = KR.roadVirtues(found);
        isConviction = rv.conviction; isInstinct = rv.instinct;
        conscienceLabel = isConviction ? "Conviction" : "Conscience";
        controlLabel = isInstinct ? "Instinct" : "Self-Control";
    }
    return {
        conscience: { value: num(v.conscience?.permanent), label: conscienceLabel, isConviction },
        selfcontrol: { value: num(v.selfcontrol?.permanent), label: controlLabel, isInstinct },
        courage: { value: num(v.courage?.permanent), label: "Courage" }
    };
}
function road(actor) {
    const p = actor?.system?.advantages?.path ?? {};
    let name = p.custom || game.i18n.localize(p.label || "");
    if (!name || name.startsWith("wod.")) name = "Road";
    if (name === "Humanity") name = "Road of Humanity";
    const found = KX.DATA.roads ? KX.roadOf(actor) : null;
    if (found) name = found.path?.name ?? found.road.name;
    return { value: num(p.permanent ?? p.value), name, found };
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
    if (!game.users.find(u => u.isGM && u.active)) { ui.notifications.warn("WoDX Actions: no GM is connected to apply the change."); return false; }
    game.socket.emit(SOCKET, payload);
    return true;
}
function isResponsibleGM() {
    const gm = game.users.activeGM ?? game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
    return gm?.id === game.user.id;
}
async function onSocket(p) {
    if (!isResponsibleGM()) return;
    if (p.action === "kx" && !p.uuid) return kx().onSocket(p);
    // B3133: a player's codex entry spent on research (the codex journal is the Storyteller's)
    if (p.action === "research") { const pg = await fromUuid(p.uuid); if (pg?.documentName === "JournalEntryPage") await pg.setFlag(MOD, "researchUsed", true); return; }
    const doc = await fromUuid(p.uuid);
    const actor = doc?.actor ?? doc;
    if (!actor) return;
    if (p.action === "update") await actor.update(p.data);
    else if (p.action === "damage") await applyDamage(actor, p.type, p.levels);
    else if (p.action === "kx") await kx().onSocket(p);
    else if (p.action === "oath") { const r = await fromUuid(p.regnant); await oathStep(actor, r?.actor ?? r, p.points, { firstDouble: !!p.firstDouble }); }
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
/*  Health (same model as the WoD20 system / WoDX Combat)           */
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
    return `${damage.bashing}B / ${damage.lethal}L / ${damage.aggravated}A, ${ws.label ? game.i18n.localize(ws.label) : "Unhurt"}`;
}
async function applyDamage(actor, type, levels) {
    if (!levels) return null;
    if (game.wodxCombat?.applyDamage && actor.isOwner) return game.wodxCombat.applyDamage(actor, type, levels);
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
    return `<div class="vta-res good">${r.successes} success${r.successes === 1 ? "" : "es"}${degreeText ? `: ${R.degree(r.successes)}` : ""}</div>`;
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
    // 6e: one card layout (header, roll, result, what changed, page reference); the changes come from the sheet updates
    const line = actor ? P.detectProfile(actor) : "";
    const changes = actor ? takeChanges(actor.id) : [];
    const content = TR.cardLayout({ title, body: `${body}${mode === "all" ? F.html(flav) : ""}`, line, changes });
    if (flav && mode === "gm") ChatMessage.create({ content: `<div class="vta-card">${F.html(flav)}</div>`, whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: { alias: "WoDX" } });
    const md = { speaker: ChatMessage.getSpeaker({ actor }), content, rolls: rolls.filter(Boolean) };
    if (rolls.filter(Boolean).length) { md.sound = CONFIG.sounds.dice; if (GEN() < 12) md.type = CONST.CHAT_MESSAGE_TYPES.ROLL; }
    // Cards with prompt buttons (sin, witnesses, Rötschreck after sunlight) need the module's flag to be bound
    if (!data && /data-(kx|sx|wx|vx)=/.test(content)) data = { kind: "buttons" };
    if (data) md.flags = { [MOD]: data };
    const msg = await ChatMessage.create(md);
    // Changes written just after the card (most builders post, then update the sheet) join it a moment later
    if (actor && msg) setTimeout(() => {
        const late = takeChanges(actor.id);
        if (late.length) msg.update({ content: TR.withChanges(msg.content, [...changes, ...late]) }).catch(e => console.warn("WoDX | card changes", e));
    }, 900);
    return msg;
}

/** Show a card written without the 3.6 layout (notices, whispers, older messages) in it. Changes the page, not the message. */
/** 3.62.0 (B2810): this player's view from WoDX Chronicle; Full when Chronicle is off or older. */
function beginner() {
    try { return game.modules.get("wodx-chronicle")?.api?.playerView?.current?.() === "beginner"; } catch (e) { return false; }
}
/**
 * 3.62.0 (B2819): in Beginner view a roll card opens with what the result means in a sentence, and the dice and the
 * modifiers fold under it. Only this player's screen changes; the message is untouched.
 */
function plainCards(el) {
    if (!el?.querySelectorAll || !beginner()) return;
    for (const card of el.querySelectorAll(".vta-card")) {
        if (card.querySelector(".vta-plain")) continue;
        const secs = [...card.querySelectorAll(".vta-sec")].filter(s => s.querySelector(":scope > .vta-dice, :scope > .vta-parts"));
        if (!secs.length) continue;
        const vEl = card.querySelector(".vta-head .vta-verdict");
        const plain = TR.plainLine(vEl ? { text: vEl.textContent } : TR.verdictOf(card.innerHTML));
        if (plain) {
            const p = document.createElement("p"); p.className = "vta-plain"; p.textContent = plain;
            const head = card.querySelector(".vta-head");
            if (head) head.after(p); else card.prepend(p);
        }
        for (const s of secs) {
            const d = document.createElement("details"); d.className = "vta-fold";
            const sum = document.createElement("summary"); sum.textContent = "Dice and details";
            d.append(sum, ...s.querySelectorAll(":scope > .vta-parts, :scope > .vta-dice"));
            s.append(d);
        }
    }
}

function upgradeCards(m, el) {
    if (!el?.querySelectorAll) return;
    for (const card of el.querySelectorAll(".vta-card:not(.wodx-x)")) {
        const h = card.querySelector(":scope > h3");
        const title = h ? h.innerHTML : "";
        h?.remove();
        const actor = m?.speaker?.actor ? game.actors?.get(m.speaker.actor) : null;
        const t = document.createElement("template");
        t.innerHTML = TR.cardLayout({ title, body: card.innerHTML, line: actor ? P.detectProfile(actor) : "" });
        const nu = t.content.firstElementChild;
        for (const c of card.classList) nu.classList.add(c);
        if (!title) nu.querySelector(".vta-head")?.remove();
        card.replaceWith(nu);
    }
}

/* What changed (6e): the tracked numbers each sheet update on this computer changes, kept a few seconds for the card. */
const LEDGER = new Map();
function recordChanges(actor, changes) {
    try {
        const list = TR.diffResources(actor.system ?? {}, foundry.utils.flattenObject(changes ?? {}), P.RES);
        if (!list.length) return;
        const now = Date.now();
        LEDGER.set(actor.id, [...(LEDGER.get(actor.id) ?? []).filter(c => now - c.t < 8000), ...list.map(c => ({ ...c, t: now }))]);
    } catch (e) { console.warn("WoDX | change ledger", e); }
}
function takeChanges(id, ms = 6000) {
    const now = Date.now();
    const out = (LEDGER.get(id) ?? []).filter(c => now - c.t < ms);
    LEDGER.delete(id);
    return out;
}
const btn = (action, label) => `<button type="button" class="vta-btn" data-action="${action}">${label}</button>`;

/* ================================================================== */
/*  Dialog helpers                                                     */
/* ================================================================== */

function opts(entries, sel) {
    return entries.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`).join("");
}
function rootOf(html) { return html instanceof HTMLElement ? html : (html?.[0] ?? html); }

async function dialog(title, content, label, callback, { width = 460, render = null } = {}) {
    AIM.dropped();
    const r = await P.ask({
        title, content, width, classes: ["vta-dialog"], onRender: render,
        buttons: [{ id: "ok", label, icon: "fas fa-dice-d10", default: true }, { id: "cancel", label: "Cancel" }]
    });
    const power = AIM.taken();
    if (!r || r.id !== "ok") return null;
    try {
        const out = await callback(r.data, null);
        // A power that was rolled is shown on the map: a sprite token plays its casting move (Paperdoll)
        if (power?.actor && out) {
            const target = power.target ?? [...(game.user.targets ?? [])].map(t => t.actor).find(a => a && a !== power.actor) ?? null;
            Hooks.callAll("wodxPowerShown", power.actor, { target, power: power.power?.name ?? null, group: power.power?.group ?? null, kind: power.kind, line: P.detectProfile(power.actor) });
        }
        return out;
    }
    catch (e) { console.error(e); ui.notifications.error(`WoDX Actions: ${e.message}`); return null; }
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
    if (!actor) ui.notifications.warn("WoDX Actions: select a token or assign a character first.");
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
    <div class="form-group"><label>Attribute / Trait</label><select name="${prefix}attr" data-fixed>${opts(attrOpts, sel.attr ?? "dexterity")}</select></div>
    <div class="form-group"><label>Ability</label>${searchBox(`select[name=${prefix}ability]`, "Search Abilities…", "Search Abilities")}<select name="${prefix}ability">${opts(abOpts, sel.ability ?? "")}</select></div>`;
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
    "": { label: "(custom roll)" },
    climbing: { label: "Climbing (Dex + Athletics, extended)", attr: "dexterity", ability: "athletics", diff: 6, mode: "extended", target: 5, note: "10 ft per success on an average climb, 15 easy, 5 hard (V20 pdf 266). Protean claws or bone spurs: –2 difficulty. Botch: slip, stuck or fall." },
    riding: { label: "Riding (Dex + Ride)", attr: "dexterity", ability: "ride", diff: 6, note: "Rough terrain +1, at speed +3. Failure: roll again to keep control. Botch: thrown and hurt." },
    driving: { label: "Driving a cart (Dex + Ride)", attr: "dexterity", ability: "ride", diff: 6, note: "Rain or crowds +1; fast while losing pursuers +3. Botch: lose control of the team." },
    drive: { label: "Driving a car (Dex + Drive)", attr: "dexterity", ability: "drive", diff: 6, alts: [["dexterity", "drive"], ["wits", "drive"]], note: "No roll for ordinary driving with a dot of Drive. Heavy rain +1; fast while losing pursuers +3; the vehicle chart sets the maneuver rating (V20 p. 258-259)." },
    computer: { label: "Computer use (Int + Computer)", attr: "intelligence", ability: "computer", diff: 6, alts: [["intelligence", "computer"], ["wits", "computer"]], note: "Find, copy or break into data. Wits + Computer under time pressure (V20 p. 263)." },
    carrying: { label: "Carrying capacity (Strength, no roll)", attr: "strength", ability: "", diff: 6, note: "25 lbs / 10 kg per dot of Strength without penalty; over that, every physical action is +1 difficulty. A single heave uses the lifting chart (V20 p. 259)." },
    intrusion: { label: "Intrusion / lockpicking (Dex + Larceny)", attr: "dexterity", ability: "larceny", diff: 7, note: "5 for standard locks up to 9 for the Tower of London. Most attempts need tools." },
    jumping: { label: "Jumping (Str + Athletics, running)", attr: "strength", ability: "athletics", diff: 3, note: "Each success: 2 ft (50 cm) up or 3 ft (1 m) across (V20 pdf 268). Failure: Dex + Athletics (6) to catch a ledge." },
    jumpstand: { label: "Jumping (Strength, standing)", attr: "strength", ability: "", diff: 3, note: "Each success: 2 ft (50 cm) up or 3 ft (1 m) across (V20 pdf 268)." },
    lifting: { label: "Lifting beyond Strength (Willpower, diff 9)", attr: "special:willpower", ability: "", diff: 9, lifting: true, note: "Each success moves one step up the Strength feats chart. Teamwork: combine successes." },
    door: { label: "Forcing a door (Strength, extended)", attr: "strength", ability: "", diff: 7, mode: "extended", target: 5, note: "Interior door 1 success, reinforced 5, vault 10+. Difficulty 6–8 by material. Botch: one lethal level to the shoulder." },
    swimming: { label: "Swimming (Sta + Athletics)", attr: "stamina", ability: "athletics", diff: 6, note: "Roll after the first hour; one success needed. Needs Athletics 1." },
    throwing: { label: "Throwing (Dex + Athletics)", attr: "dexterity", ability: "athletics", diff: 6, note: "Range Strength × 5 yards for ≤1 kg. Difficulty 6 to half range, 7 beyond." },
    pursuit: { label: "Pursuit (Dex + Athletics, extended & resisted)", attr: "dexterity", ability: "athletics", diff: 6, mode: "extended", target: 10, opp: { attr: "dexterity", ability: "athletics", diff: 6 }, note: "Quarry starts with 1 free success per 2 yards ahead (10 yards mounted). Pursuer catches up on exceeding the quarry's total." },
    shadowing: { label: "Shadowing (Dex + Stealth vs Per + Alertness)", attr: "dexterity", ability: "stealth", diff: 6, mode: "resisted", opp: { attr: "perception", ability: "alertness", diff: 6, needMore: true }, note: "The target must beat the shadow's successes by one to spot the tail." },
    sneaking: { label: "Sneaking (Dex + Stealth vs Per + Alertness)", attr: "dexterity", ability: "stealth", diff: 6, mode: "resisted", opp: { attr: "perception", ability: "alertness", diff: 6, needMore: true }, note: "Undetected unless observers score more successes." },
    awareness: { label: "Noticing (Per + Alertness)", attr: "perception", ability: "alertness", diff: 6, alts: [["perception", "alertness"], ["perception", "awareness"]] },
    creation: { label: "Creation (Per + Expression/Craft)", attr: "perception", ability: "craft", diff: 6, alts: [["perception", "expression"], ["perception", "craft"], ["perception", "crafts"]], note: "1 success mediocre … 5 a masterpiece." },
    investigation: { label: "Investigation (Per + Investigation)", attr: "perception", ability: "investigation", diff: 6 },
    repair: { label: "Repair (Dex + Craft, extended)", attr: "dexterity", ability: "craft", diff: 6, mode: "extended", target: 3, note: "Simple 4 to rebuilding a carriage 9; 10 minutes per success needed." },
    research: { label: "Research (Int + Academics/Occult/Science/Theology)", attr: "intelligence", ability: "academics", diff: 6, alts: [["intelligence", "academics"], ["intelligence", "occult"], ["intelligence", "science"], ["intelligence", "theology"], ["intelligence", "enigmas"], ["intelligence", "investigation"]] },
    tracking: { label: "Tracking (Per + Survival)", attr: "perception", ability: "survival", diff: 6, note: "Each success on the quarry's Wits + Survival to cover tracks adds +1 difficulty." },
    carousing: { label: "Carousing (Cha + Empathy)", attr: "charisma", ability: "empathy", diff: 6, aura: true },
    credibility: { label: "Credibility / a scam (Man + Subterfuge vs Per + Subterfuge)", attr: "manipulation", ability: "subterfuge", diff: 7, mode: "resisted", opp: { attr: "perception", ability: "subterfuge", diff: 7, needMore: true }, aura: true },
    fasttalk: { label: "Fast-Talk (Man + Subterfuge vs Willpower)", attr: "manipulation", ability: "subterfuge", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true, note: "On a tie, more babbling is needed." },
    interrogate: { label: "Interrogation, peaceful (Man + Empathy vs Willpower)", attr: "manipulation", ability: "empathy", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true, note: "Each extra success reveals more; exceeding the subject's Willpower rating: the subject tells everything." },
    torture: { label: "Interrogation, violent (Man + Intimidation vs Sta + 3 or Willpower)", attr: "manipulation", ability: "intimidation", diff: 6, mode: "resisted", opp: { best: ["willpower", "stamina+3"], diff: 6 }, aura: true, note: "The subject loses a health level per turn of physical torture or a Willpower point per turn of mental torture." },
    intimidate: { label: "Intimidation, subtle (Man + Intimidation vs Willpower)", attr: "manipulation", ability: "intimidation", diff: 6, mode: "resisted", opp: { pool: "willpower", diff: 6 }, aura: true },
    threaten: { label: "Intimidation, blatant (Str + Intimidation vs Willpower or Str + Intimidation)", attr: "strength", ability: "intimidation", diff: 6, mode: "resisted", opp: { best: ["willpower", "strength+intimidation"], diff: 6 }, aura: true },
    oration: { label: "Oration (Cha + Leadership)", attr: "charisma", ability: "leadership", diff: 6, aura: true, note: "A prepared speech (Int + Expression, diff 7) lowers the difficulty by one." },
    performance: { label: "Performance (Cha + Performance)", attr: "charisma", ability: "performance", diff: 7, aura: true },
    hunting: { label: "Hunting → use the Hunt action", redirect: "hunt" },
    seduction: { label: "Seduction → use the Seduction action", redirect: "seduction" }
};

Object.assign(PRESETS, PM.EXTRA_PRESETS, CK.asPresets(), SOR.PRESETS, SOR.LIFT_PRESET, TRR.HAGGLE_PRESET);

/** The pool a list of [attribute, ability] pairs gives this character (common checks and preset alternatives). */
function pickPool(actor, pools) {
    const shown = new Set(abilityList(actor).map(a => a.key));
    const c = CK.choosePool(pools, k => { const ab = findAbility(actor, k); return ab ? { value: ab.value, shown: shown.has(ab.key) } : null; });
    if (!c) return null;
    const ab = c.ability ? findAbility(actor, c.ability) : null;
    return { ...c, abilityId: c.ability ? (ab?.id ?? `missing:${c.ability}`) : "", abilityName: ab?.name ?? (c.ability ? cap(c.ability) : "") };
}

/* ================================================================== */
/*  General action                                                     */
/* ================================================================== */

export async function action({ actor: a, preset = "" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const target = targetActor();
    const rd = road(actor);
    const day = !!flag(actor, "daytime") && !flag(actor, "daytime")?.uncapped;
    const presetOpts = Object.entries(PRESETS).map(([k, p]) => [k, p.label]);
    const content = `<form>
      <div class="form-group"><label>Dramatic system</label>${searchBox("select[name=preset]", "Search dramatic systems…", "Search dramatic systems")}<select name="preset">${opts(presetOpts, preset)}</select></div>
      <p class="vta-note vta-preset-note"></p>
      ${poolSelectors(actor)}
      <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/></div>
      <div class="form-group"><label>Type of action</label><select name="mode">${opts([["simple", "Simple"], ["extended", "Extended"], ["resisted", "Resisted"], ["teamwork", "Teamwork"]], "simple")}</select></div>
      <div class="form-group"><label>Best pool for this task</label><button type="button" class="vta-suggest"><i class="fas fa-magic"></i> Suggest</button></div>
      <p class="vta-note vta-suggest-note"></p>
      <div class="form-group vta-ext"><label>Successes needed (extended)</label><input type="number" name="goal" value="5" min="1"/></div>
      <div class="form-group vta-ext"><label><input type="checkbox" name="untilDone"/> Roll until done; each roll takes (minutes)</label><input type="number" name="interval" value="10" min="0" style="width:5em"/></div>
      <div class="form-group vta-ext"><label><input type="checkbox" name="advance"/> Move the clock by the time taken (a player asks the Storyteller)</label></div>
      <div class="form-group vta-team"><label>Helpers' successes (e.g. 2,1,0) / helper limit</label><input type="text" name="helpers" value=""/> <input type="number" name="helperLimit" value="3" style="width:4em"/></div>
      <div class="form-group vta-team"><label><input type="checkbox" name="rollHelpers" checked/> Roll for the other selected tokens (${Math.max(0, (canvas.tokens?.controlled ?? []).filter(t => t.actor && t.actor.id !== actor.id).length)}), the same pool from their sheets</label></div>
      <fieldset class="vta-opp"><legend>Opponent ${target ? `(${esc(target.name)})` : "(no target: enter dice)"}</legend>
        <div class="form-group"><label>Opponent pool</label><select name="oppPool">${opts([["preset", "As the dramatic system says"], ["same", "The same Attribute + Ability, from the target's sheet"], ["willpower", "Willpower"], ["manual", "Manual dice"]], "preset")}</select></div>
        <div class="form-group"><label>Manual dice / difficulty</label><input type="number" name="oppDice" value="3" style="width:4em"/> <input type="number" name="oppDiff" value="6" style="width:4em"/></div>
      </fieldset>
      <details class="vta-more-opts"${beginner() ? "" : " open"}><summary>More options</summary>
      <div class="form-group"><label>Bonus dice / extra difficulty</label><input type="number" name="bonus" value="0" style="width:4em"/> <input type="number" name="extraDiff" value="0" style="width:4em"/></div>
      <div class="form-group"><label>Multiple actions: action # / retries</label>
        <select name="multi">${opts([[0, "Only action"], [1, "1st of several"], [2, "2nd"], [3, "3rd"]], 0)}</select> <input type="number" name="retries" value="0" min="0" style="width:4em"/></div>
      <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success) [${willpower(actor).temp}]</label></div>
      <div class="form-group"><label><input type="checkbox" name="ignoreWounds"/> Spend Willpower to ignore wound penalties (${woundPenalty(actor)})</label></div>
      ${TH.ticksHtml(actor, esc)}${DH.ticksHtml(actor, esc)}${TH.luckyHtml(actor, esc)}
      <div class="form-group"><label><input type="checkbox" name="aura"/> Apply Road aura (${rd.name} ${rd.value}: ${R.auraModifier(rd.value) >= 0 ? "+" : ""}${R.auraModifier(rd.value)})</label></div>
      ${isVampire(actor) ? `<div class="form-group"><label><input type="checkbox" name="daytime" ${day ? "checked" : ""}/> Acting during the day (pool capped at Road)</label></div>` : ""}
      <div class="form-group"><label><input type="checkbox" name="auto"/> Take an automatic success if pool ≥ difficulty</label></div>
      <div class="form-group"><label>Description</label><input type="text" name="desc" value=""/></div>
      </details>
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
            const pick = p.alts ? pickPool(actor, p.alts) : null;
            if (pick && pick.how !== "untrained") { f.attr.value = pick.attr; f.ability.value = pick.abilityId.startsWith("missing:") ? "" : pick.abilityId; }
            else {
                if (p.attr !== undefined) f.attr.value = p.attr;
                const ab = p.ability ? findAbility(actor, p.ability) : null;
                f.ability.value = ab ? ab.id : "";
                if (p.ability && !ab) ui.notifications.info(`${actor.name} has no ${cap(p.ability)} ability on the sheet.`);
            }
            if (p.diff) f.diff.value = p.diff;
            f.mode.value = p.mode || "simple";
            if (p.target) f.goal.value = p.target;
            f.aura.checked = !!p.aura;
            root.querySelector(".vta-preset-note").textContent = p.note || "";
            sync();
        });
        f.mode.addEventListener("change", sync);
        root.querySelector(".vta-suggest")?.addEventListener("click", () => {
            const p = PRESETS[f.preset.value] ?? {};
            const at = f.attr.value && !f.attr.value.startsWith("special:") ? f.attr.value : (p.attr && !String(p.attr).startsWith("special:") ? p.attr : "dexterity");
            const pairs = p.alts ?? (p.ability ? [[p.attr ?? at, p.ability]] : []);
            let cands = pairs.map(([a, k]) => { const ab = findAbility(actor, k); return { attr: a, attrValue: attr(actor, a), ability: k, abilityId: ab?.id ?? "", abilityValue: ab?.value ?? 0, abilityType: ab?.type || (/(academ|occult|theol|enigma|investig|law|medic|politic|seneschal|hearth)/.test(k) ? "knowledge" : /(craft|ride|stealth|etiquette|melee|archery|survival|animal|performance|larceny|commerce)/.test(k) ? "skill" : "talent"), specialty: ab?.specialty ?? "" }; });
            if (!p.alts) cands = cands.concat(abilityList(actor).filter(x => x.value > 0).map(x => ({ attr: at, attrValue: attr(actor, at), ability: x.key, abilityId: x.id, abilityValue: x.value, abilityType: x.type, specialty: x.specialty, name: x.name })));
            const ranked = KR.rankPools(cands, num(f.diff.value) || 6, { untrained: setting("untrained") }).filter(c => c.score >= 0);
            const note = root.querySelector(".vta-suggest-note");
            if (!ranked.length) { note.textContent = "Nothing on the sheet fits; the untrained rules may forbid it."; return; }
            const best = ranked[0];
            f.attr.value = best.attr;
            f.ability.value = best.abilityId || "";
            note.textContent = `Best: ${cap(best.attr)} + ${best.name ?? cap(best.ability)} (${best.dice} dice at ${best.diff}${best.note ? `, ${best.note}` : ""}${best.specialty ? `, specialty ${best.specialty}` : ""}).` + (ranked.length > 1 ? ` Then: ${ranked.slice(1, 3).map(c => `${cap(c.attr)} + ${c.name ?? cap(c.ability)} (${c.dice})`).join(", ")}.` : "");
        });
        if (preset) f.preset.dispatchEvent(new Event("change"));
        sync();
        oddsPanel(root, actor, target, fd => fd);
    };
    return dialog("WoDX Action", content, "Roll", fd => resolveAction(actor, target, fd), { render, width: 500 });
}

/* ================================================================== */
/*  The odds before a roll (3.43.0)                                    */
/* ================================================================== */

/**
 * A line in a roll window with the chance of one success, three or more and a botch, and the modifiers in the pool.
 * toFd(read form) gives the choices resolveAction() would get, or null to hide the line. A resisted roll against
 * someone shows the other side's odds to the Storyteller only (an NPC's resisting roll stays the Storyteller's).
 */
function oddsPanel(root, actor, target, toFd) {
    let on = true;
    try { on = setting("showOdds") !== false; } catch (e) { on = true; }
    const form = root?.querySelector?.("form");
    if (!on || !form || !actor) return null;
    const box = document.createElement("div");
    box.className = "vta-odds";
    box.setAttribute("aria-live", "polite");
    const anchor = form.querySelector("[name=desc]")?.closest(".form-group");
    // The field sits inside the window's content box, not the form itself (3.45.1)
    if (anchor?.parentNode) anchor.parentNode.insertBefore(box, anchor); else (form.querySelector(".dialog-content") ?? form).append(box);
    const draw = () => {
        try {
            const fd = toFd(P.readForm(root));
            if (!fd) { box.hidden = true; return; }
            box.hidden = false;
            let team = { dice: 0, overflow: 0 };
            if (fd.mode === "teamwork") team = R.teamwork(String(fd.helpers || "").split(/[ ,;]+/).filter(Boolean).map(num), fd.helperLimit || Infinity);
            const built = buildPool(actor, target, fd, undefined, { teamDice: team.dice, overflow: team.overflow });
            if (built.blocked) { box.innerHTML = `<div class="vta-odds-line"><b>Odds</b> ${esc(built.blocked)}</div>`; return; }
            if (fd.auto && built.autoSuccessAllowed && fd.mode === "simple") { box.innerHTML = `<div class="vta-odds-line"><b>Odds</b> an automatic success: the pool is at least the difficulty.</div>`; return; }
            const o = OD.odds(built.dice, built.difficulty, { specialty: !!fd.specialty, willpower: !!fd.wp });
            const extra = [fd.specialty ? "specialty: 10s count twice" : "", fd.wp ? "Willpower: one success, no botch" : ""].filter(Boolean);
            let html = `<div class="vta-odds-line"><b>Odds</b> ${esc(OD.oddsLine(o, { need: fd.mode === "extended" ? num(fd.goal) : 0 }))}</div>`;
            const parts = [...built.parts, ...extra];
            if (parts.length) html += `<div class="vta-odds-parts">${parts.map(esc).join(" · ")}</div>`;
            if (fd.mode === "resisted" && game.user.isGM) {
                const op = opponentPool(target, PRESETS[fd.preset]?.opp, fd, actor);
                const oo = OD.odds(num(op.dice), num(op.diff) || 6);
                html += `<div class="vta-odds-parts vta-odds-gm">Storyteller only: ${esc(target?.name ?? "the other side")} resists with ${esc(OD.oddsLine(oo))}</div>`;
            }
            box.innerHTML = html;
        } catch (e) { box.hidden = true; console.warn("WoDX | odds", e); }
    };
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    // Buttons that set the pool (Suggest) change values without an event
    form.addEventListener("click", ev => { if (ev.target.closest("button")) setTimeout(draw, 0); });
    draw();
    return draw;
}

/* ================================================================== */
/*  Common checks (3.13.0): the everyday rolls, one pick and roll       */
/* ================================================================== */

/** Describe the pool a common check gives this character, for the dialog's note line. */
function checkPoolText(actor, c) {
    const pick = pickPool(actor, c.pools);
    if (!pick) return { pick: null, text: "" };
    const a = pick.attr.startsWith("special:") ? specialValue(actor, pick.attr.slice(8)) : { value: attr(actor, pick.attr), label: cap(pick.attr) };
    const how = pick.how === "untrained" || pick.how === "shown" ? ` (no dots in ${pick.abilityName}: rolled untrained)` : "";
    const ab = pick.ability ? findAbility(actor, pick.ability) : null;
    return { pick, text: `${a.label} ${a.value}${pick.ability ? ` + ${pick.abilityName} ${ab?.value ?? 0}` : ""}${how}` };
}

export async function quickCheck({ actor: a, check = "notice", extraDiff: preDiff = 0, bonus: preBonus = 0, desc: preDesc = "", direct = false } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const target = targetActor();
    const day = !!flag(actor, "daytime") && !flag(actor, "daytime")?.uncapped;
    const first = CK.byKey(check) ?? CK.CHECKS[0];
    const groups = CK.GROUPS.map(([g, label]) => `<optgroup label="${esc(label)}">${opts(CK.CHECKS.filter(c => c.group === g).map(c => [c.key, c.label]), first.key)}</optgroup>`).join("");
    const content = `<form>
      <div class="form-group"><label>Check</label>${searchBox("select[name=check]", "Search checks…", "Search checks")}<select name="check">${groups}</select></div>
      <p class="vta-note vta-check-pool"></p>
      <p class="vta-note vta-check-note"></p>
      <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="${first.diff}" min="2" max="10"/></div>
      <details class="vta-more-opts"${beginner() ? "" : " open"}><summary>More options</summary>
      <div class="form-group"><label>Bonus dice / extra difficulty</label><input type="number" name="bonus" value="${num(preBonus)}" style="width:4em"/> <input type="number" name="extraDiff" value="${num(preDiff)}" style="width:4em"/></div>
      <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success) [${willpower(actor).temp}]</label></div>
      ${TH.ticksHtml(actor, esc)}${DH.ticksHtml(actor, esc)}${TH.luckyHtml(actor, esc)}
      ${isVampire(actor) ? `<div class="form-group"><label><input type="checkbox" name="daytime" ${day ? "checked" : ""}/> Acting during the day (pool capped at Road)</label></div>` : ""}
      <div class="form-group"><label>Description</label><input type="text" name="desc" value="${esc(preDesc)}"/></div>
      </details>
      <p class="vta-note">For a roll against someone, an extended roll or teamwork, use Any roll. Wound penalties apply.</p>
    </form>`;
    const render = root => {
        const form = root.querySelector("form");
        const sel = form.querySelector("[name=check]");
        const show = (setDiff = true) => {
            const c = CK.byKey(sel.value);
            if (!c) return;
            root.querySelector(".vta-check-pool").textContent = `Pool: ${checkPoolText(actor, c).text}`;
            root.querySelector(".vta-check-note").textContent = `${c.note} (${c.ref})`;
            if (setDiff) form.querySelector("[name=diff]").value = c.diff;
        };
        sel.addEventListener("change", () => show(true));
        show(false);
        oddsPanel(root, actor, target, fd => {
            const c = CK.byKey(fd.check);
            const pick = c ? checkPoolText(actor, c).pick : null;
            if (!pick) return null;
            return { ...fd, preset: `check-${c.key}`, attr: pick.attr, ability: pick.abilityId, diff: num(fd.diff) || c.diff, mode: "simple", multi: 0, retries: 0, ignoreWounds: false, aura: false, auto: false };
        });
    };
    const roll = fd => {
        const c = CK.byKey(fd.check);
        if (!c) return null;
        const { pick } = checkPoolText(actor, c);
        if (!pick) return null;
        return resolveAction(actor, target, {
            preset: `check-${c.key}`, attr: pick.attr, ability: pick.abilityId, diff: num(fd.diff) || c.diff, mode: "simple",
            bonus: num(fd.bonus), extraDiff: num(fd.extraDiff), multi: 0, retries: 0, specialty: !!fd.specialty, wp: !!fd.wp,
            ignoreWounds: false, aura: false, daytime: !!fd.daytime, auto: false, desc: fd.desc || c.label.split(" (")[0],
            ...Object.fromEntries(Object.entries(fd).filter(([k]) => k.startsWith("tag-") || k === "lucky" || k === "research"))
        });
    };
    // 3.62.0 (B2822): a quick roll from the sheet rolls at once with the check's own difficulty, no window
    if (direct) {
        const c = CK.byKey(check);
        if (!c) return ui.notifications.warn(`WoDX Actions: no common check called ${check}.`);
        if (!checkPoolText(actor, c).pick) return ui.notifications.warn(`${actor.name} has nothing to roll for ${c.label}.`);
        return roll({ check: c.key, diff: c.diff, bonus: num(preBonus), extraDiff: num(preDiff), desc: preDesc });
    }
    return dialog("Common checks", content, "Roll", roll, { render, width: 460 });
}

function opponentPool(target, spec, fd, actor = null) {
    if (fd.oppPool === "manual" || !target) return { dice: fd.oppDice, diff: fd.oppDiff, label: "Opponent" };
    if (fd.oppPool === "willpower") return { dice: willpower(target).perm, diff: spec?.diff ?? fd.oppDiff, label: "Willpower" };
    // The same Attribute + Ability as the actor, read from the target's sheet (and the default with no preset)
    if (fd.oppPool === "same" || !spec) {
        const mine = actor ? readPool(actor, fd.attr, fd.ability) : null;
        const tp = mine?.special ? { attribute: specialValue(target, mine.special).value, attributeLabel: mine.attributeLabel } : { attribute: fd.attr ? attr(target, fd.attr) : 0, attributeLabel: cap(fd.attr || "") };
        const ab = mine?.abilityKey ? findAbility(target, mine.abilityKey) : null;
        return { dice: tp.attribute + (ab?.value ?? 0), diff: fd.diff, label: [tp.attributeLabel, ab?.name ?? mine?.abilityLabel].filter(Boolean).join(" + ") || "Same pool" };
    }
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

/** The pool and difficulty a roll window's choices give, with every modifier and where it came from (3.43.0: also the odds
 *  shown before the roll). pool: readPool()'s answer. */
function buildPool(actor, target, fd, pool = readPool(actor, fd.attr, fd.ability), { teamDice = 0, overflow = 0 } = {}) {
    const rd = road(actor);
    // Merits and flaws: tags from the pool and preset, plus any the player ticked (voice, risky, first meeting, a sense)
    const ticked = TH.TICKS.filter(t => fd[`tag-${t.key}`]).map(t => t.key);
    let tm = TH.traitMods(actor, [...TH.tagsFor(fd.attr, pool.abilityKey, fd.preset), ...ticked], { target });
    // How the character moves (WoDX Combat 3.12.0): prone helps Stealth, flying helps sight, water spoils footing
    try {
        const kinds = [pool.abilityKey === "stealth" ? "stealth" : null, fd.attr === "perception" ? "perception" : null,
            fd.attr === "dexterity" && pool.abilityKey !== "stealth" ? "dexterity" : null, pool.abilityKey === "dodge" ? "dodge" : null].filter(Boolean);
        const mv = kinds.length ? game.wodxCombat?.movement?.rollMods?.(actor, kinds) : null;
        if (mv?.diff) tm = { ...tm, diff: (tm.diff ?? 0) + mv.diff, parts: [...(tm.parts ?? []), ...mv.parts.map(x => `${x}, house rule`)] };
    } catch (e) { /* WoDX Combat is off */ }
    // B3130 to B3133: Nightmares, a stranger in a crowd, research from the codex
    try {
        const dm = DH.modsFor(actor, fd, pool);
        if (dm.parts.length) tm = { ...tm, dice: (tm.dice ?? 0) + dm.dice, diff: (tm.diff ?? 0) + dm.diff, parts: [...(tm.parts ?? []), ...dm.parts] };
    } catch (e) { console.warn("WoDX Actions | deeper hooks", e); }
    return R.actionPool({
        traitDice: tm.dice, traitDiff: tm.diff, traitParts: tm.parts,
        attribute: pool.attribute, attributeLabel: pool.attributeLabel,
        ability: pool.ability, abilityLabel: pool.abilityLabel,
        abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey,
        bonusDice: fd.bonus, extraDiff: fd.extraDiff, baseDifficulty: fd.diff,
        woundPenalty: pool.special ? 0 : woundPenalty(actor), ignoreWounds: fd.ignoreWounds,
        multiIndex: num(fd.multi), retries: fd.retries, aura: fd.aura ? R.auraModifier(rd.value) : 0,
        daytimeCap: fd.daytime ? rd.value : null, teamworkDice: teamDice, teamworkOverflow: overflow
    });
}

async function resolveAction(actor, target, fd) {
    const preset = PRESETS[fd.preset] ?? {};
    const pool = readPool(actor, fd.attr, fd.ability);
    const rd = road(actor);
    let teamDice = 0, overflow = 0, helperHtml = "";
    const helperRolls = [];
    if (fd.mode === "teamwork") {
        const typed = String(fd.helpers || "").split(/[ ,;]+/).filter(Boolean).map(num);
        // Helpers on the board: the other selected tokens roll the same pool from their own sheets
        if (fd.rollHelpers) for (const t of (canvas.tokens?.controlled ?? []).filter(t => t.actor && t.actor.id !== actor.id)) {
            const hp = readPool(t.actor, fd.attr, null);
            const hab = pool.abilityKey ? findAbility(t.actor, pool.abilityKey) : null;
            const dice = (hp.special ? specialValue(t.actor, hp.special).value : (fd.attr ? attr(t.actor, fd.attr) : 0)) + (hab?.value ?? 0);
            const hr = await rollPool(dice, fd.diff);
            helperRolls.push(hr.roll);
            typed.push(hr.botch ? 0 : hr.successes);
            helperHtml += rollBlock(`Helper ${esc(t.actor.name)}`, hr);
        }
        const t = R.teamwork(typed, fd.helperLimit || Infinity);
        teamDice = t.dice; overflow = t.overflow;
    }
    const built = buildPool(actor, target, fd, pool, { teamDice, overflow });
    if (built.blocked) { ui.notifications.warn(built.blocked); return post(actor, `${actor.name}: ${esc(fd.desc || preset.label || "Action")}`, `<div class="vta-warn">${built.blocked}</div>`); }
    const wpCost = (fd.wp ? 1 : 0) + (fd.ignoreWounds ? 1 : 0);
    if (wpCost && !(await spendWillpower(actor, wpCost))) return null;
    // Willpower ignores wound penalties for one turn (VtDA20 printed p. 339): this roll only, so no lasting state

    const title = `${actor.name}: ${esc(fd.desc || (preset.label ? preset.label.split(" (")[0].replace(/^Common: /, "") : "Action"))}`;
    const label = [pool.attributeLabel, pool.abilityLabel].filter(Boolean).join(" + ");
    if (fd.auto && built.autoSuccessAllowed && fd.mode === "simple") {
        return post(actor, title, `<div class="vta-sec"><b>${label}</b> (${built.dice} dice vs ${built.difficulty}): automatic success (V20 Dark Ages p. 323).</div>${preset.note ? `<div class="vta-note">${preset.note}</div>` : ""}`);
    }
    let r = await rollPool(built.dice, built.difficulty, { specialty: fd.specialty, willpower: fd.wp });
    const rolls = [...helperRolls, r.roll];
    try { await DH.afterRoll(actor, fd, pool); } catch (e) { console.warn("WoDX Actions | research", e); }
    let body = "";
    // Lucky (V20 p. 493 printed): a failed roll, botches too, is rolled again, three times a story
    if (fd.lucky && (r.botch || !r.successes) && fd.mode !== "extended") {
        const lk = await TH.useLucky(actor);
        if (lk) {
            body += rollBlock(`${label || "Pool"} (first roll)`, r, [], fd.specialty) + `<div class="vta-note">Lucky: rolled again (${lk.left} left this story).</div>`;
            r = await rollPool(built.dice, built.difficulty, { specialty: fd.specialty, willpower: fd.wp });
            rolls.push(r.roll);
        }
    }
    body = helperHtml + body + rollBlock(label || "Pool", r, built.parts.concat(fd.specialty ? ["specialty"] : [], fd.wp ? ["Willpower"] : []), fd.specialty);

    // Resisted
    if (fd.mode === "resisted") {
        let op = opponentPool(target, preset.opp, fd, actor);
        // Spotting someone prone, under water or in the earth is harder (WoDX Combat 3.12.0, house rule)
        if (pool.abilityKey === "stealth") { try { const sp = game.wodxCombat?.movement?.spotMod?.(actor) ?? 0; if (sp) op = { ...op, diff: Math.min(10, op.diff + sp) }; } catch (e) { /* off */ } }
        const o = await rollPool(op.dice, op.diff);
        rolls.push(o.roll);
        body += rollBlock(`${target ? esc(target.name) : "Opponent"} (${esc(op.label)})`, o);
        const needMore = preset.opp?.needMore;
        const res = R.resisted(r, o);
        let txt;
        if (needMore) {
            // Opponent must score MORE successes to detect / resist.
            txt = (o.successes > r.successes && !o.botch) || r.botch ? `${target ? esc(target.name) : "The opponent"} notices / sees through it.` : `${actor.name} succeeds: the opponent does not notice.`;
        } else if (res.tie) txt = "Tie: neither side succeeds.";
        else txt = res.winner === "a" ? `${actor.name} wins by ${res.margin} (${R.degree(res.margin)}).` : `${target ? esc(target.name) : "The opponent"} resists (by ${res.margin}).`;
        if (fd.preset === "interrogate" || fd.preset === "torture") {
            if (res.winner === "a" && target && res.margin > willpower(target).perm) txt += ` Extra successes exceed ${esc(target.name)}'s Willpower: ${esc(target.name)} reveals everything.`;
        }
        body += `<div class="vta-big">${txt}</div>`;
    }
    // Lifting
    if (preset.lifting) {
        const lvl = attr(actor, "strength") + (r.botch ? 0 : r.successes);
        const f = R.liftingFeat(lvl);
        body += `<div class="vta-big">${f ? `Effective Strength ${f.level}: ${f.feat} (${f.kg} kg)` : "Nothing moves"}</div>`;
    }
    // Jumping (3.40.0): the reach is kept on the actor, so the token can take a Jump move of that length (WoDX Combat 3.12.0)
    if ((fd.preset === "jumping" || fd.preset === "jumpstand") && !r.botch && r.successes > 0) {
        const jumpTo = CK.jumpReach(r.successes);
        body += `<div class="vta-big">Jumps up to ${jumpTo.yards} yard${jumpTo.yards === 1 ? "" : "s"} across or ${jumpTo.upFeet} feet up. Choose Jump on the token to make it.</div>`;
        try { await actor.setFlag("wodx-combat", "jump", { ...jumpTo, at: game.time.worldTime }); } catch (e) { /* WoDX Combat is off */ }
    }
    if (preset.note) body += `<div class="vta-note">${preset.note}</div>`;

    // Extended: create a tracker card
    if (fd.mode === "extended") {
        const state = R.extendedStep({ total: 0, target: fd.goal }, r);
        const data = { kind: "extended", actor: actor.uuid, title, dice: built.dice, diff: built.difficulty, specialty: !!fd.specialty, state, label, note: preset.note || "" };
        if (preset.opp && (target || fd.oppPool === "manual")) {
            const op = opponentPool(target, preset.opp, fd, actor);
            const o = await rollPool(op.dice, op.diff);
            rolls.push(o.roll);
            const os = R.extendedStep({ total: 0, target: fd.goal }, o);
            data.opp = { uuid: target?.uuid ?? null, name: target?.name ?? "Opponent", dice: op.dice, diff: op.diff, label: op.label, state: os };
            body += rollBlock(`${data.opp.name} (${op.label})`, o);
        }
        // Roll until done: every interval in one card, the clock advanced by the time taken
        if (fd.untilDone) {
            let guard = 0;
            while (!(data.state.done || data.opp?.state.done) && !r.botch && guard++ < 30) {
                const rr = await rollPool(data.dice, data.diff, { specialty: data.specialty });
                rolls.push(rr.roll);
                data.state = R.extendedStep(data.state, rr);
                body += rollBlock(`${data.label}, interval ${data.state.rolls}`, rr, [], data.specialty);
                if (data.opp) { const o = await rollPool(data.opp.dice, data.opp.diff); rolls.push(o.roll); data.opp.state = R.extendedStep(data.opp.state, o); body += rollBlock(`${esc(data.opp.name)} (${data.opp.label})`, o); }
                if (rr.botch) { body += `<div class="vta-warn">Botch on interval ${data.state.rolls}: the work so far is lost or spoiled.</div>`; break; }
            }
            const minutes = num(fd.interval) * data.state.rolls;
            if (minutes) body += `<div class="vta-note">Time taken: ${minutes >= 120 ? `${Math.round(minutes / 6) / 10} hours` : `${minutes} minutes`} (${data.state.rolls} roll${data.state.rolls === 1 ? "" : "s"}).</div>`;
            if (fd.advance && minutes) body += await spendTime(actor, minutes * 60, data.label);
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
    let body = rollBlock(`${d.label}, interval ${nd.state.rolls}`, r, [], d.specialty);
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
      <p>${esc(actor.name)}: ${v.selfcontrol.label} ${v.selfcontrol.value}, ${v.conscience.label} ${v.conscience.value}, ${rd.name} ${rd.value}, blood ${b.value}${golconda ? "; <b>Golconda: immune to frenzy</b>" : ""}</p>
      <div class="form-group"><label>Provocation</label><select name="prov" data-fixed>${opts(Object.entries(R.FRENZY_PROVOCATIONS).map(([k, p]) => [k, `${p.label}${p.diff ? ` (${p.diff})` : ""}`]), provocation)}</select></div>
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
        const tm = TH.traitMods(actor, ["frenzy"]);
        // B3132: open fire in a mood region makes the Beast harder to hold
        const fire = DH.fireStep(actor);
        diff = R.clampDifficulty(diff + fd.mod + tm.diff + fire);
        return beastRoll(actor, { kind: v.selfcontrol.isInstinct ? "instinct" : "frenzy", diff, prov: p?.label ?? "Frenzy", wp: fd.wp, total: 0, traitDice: tm.dice, traitParts: fire ? [...(tm.parts ?? []), `Open fire here +${fire} diff`] : tm.parts });
    });
}

export async function rotschreck({ actor: a, provocation = "torch" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const v = virtues(actor), rd = road(actor);
    // WoDX Atmosphere's dawn dread: the last ten minutes before sunrise make it 1 harder (house rule)
    let dawn = 0;
    try { const at = game.modules.get("wodx-atmosphere"); dawn = at?.active ? Number(at.api?.dread?.rotschreck?.()) || 0 : 0; } catch (e) { dawn = 0; }
    const content = `<form>
      <p>${esc(actor.name)}: Courage ${v.courage.value}, ${rd.name} ${rd.value}</p>${dawn ? `<p class="vta-note">Dawn is minutes away: +${dawn} difficulty (house rule).</p>` : ""}
      <div class="form-group"><label>Provocation</label><select name="prov" data-fixed>${opts(Object.entries(R.ROTSCHRECK_PROVOCATIONS).map(([k, p]) => [k, `${p.label} (${p.diff})`]), provocation)}</select></div>
      <div class="form-group"><label>Difficulty (custom)</label><input type="number" name="diff" value="6"/></div>
      <div class="form-group"><label>Difficulty modifier</label><input type="number" name="mod" value="${dawn}"/></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
    </form>`;
    return dialog("Rötschreck check", content, "Roll", async fd => {
        if (flag(actor, "golconda")) return post(actor, `${actor.name} faces the flame`, `<div class="vta-big good">Golconda: immune to Rötschreck.</div>`);
        if (actor.system?.conditions?.isfrenzy && flag(actor, "frenzyType") !== "fear")
            return post(actor, `${actor.name} faces the flame`, `<div class="vta-big">Already in frenzy: immune to Rötschreck (V20 Dark Ages p. 357).</div>`);
        const p = R.ROTSCHRECK_PROVOCATIONS[fd.prov];
        const diff = R.clampDifficulty((fd.prov === "custom" ? fd.diff : p.diff) + fd.mod + DH.fireStep(actor));  // B3132
        return beastRoll(actor, { kind: "fear", diff, prov: p.label, wp: fd.wp, total: 0 });
    });
}

async function beastRoll(actor, d, msg = null) {
    const v = virtues(actor), rd = road(actor), b = blood(actor);
    const fear = d.kind === "fear";
    const virtueVal = fear ? v.courage.value : v.selfcontrol.value;
    const vp = R.virtuePool(virtueVal, { road: rd.value || 10, blood: b.value, bloodLimited: !fear && isVampire(actor) });
    if (d.wp && !(await spendWillpower(actor, 1))) d.wp = false;
    const r = await rollPool(Math.max(0, vp.dice + (d.traitDice || 0)), d.diff, { willpower: d.wp });
    const vLabel = fear ? "Courage" : v.selfcontrol.label;
    let body = `<div class="vta-sub">${esc(d.prov)}</div>` + rollBlock(vLabel, r, [...(vp.caps.length ? [`capped by ${vp.caps.join(" and ")}`] : []), ...(d.traitParts || [])]);
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
                ? `<div class="vta-big bad">${state.outcome === "botch" ? "Botch: immediate frenzy, lasting until the Storyteller decides." : "Rötschreck! The vampire flees blindly toward safety, tearing through anyone in the way."}</div>`
                : `<div class="vta-big bad">${state.outcome === "botch" ? "Botch: frenzy until the Storyteller decides, and a Derangement may follow." : "Frenzy! The Beast does exactly what it wants."}</div>`;
        }
    }
    if (enter) {
        body += `<div class="vta-note">In frenzy: ignore wound penalties; +2 difficulty to Dominate the frenzied vampire, –2 for them to resist it; immune to Rötschreck. A Willpower point controls one action for a turn. Usually lasts a scene.${!fear && d.kind !== "instinct" ? " Frenzying without risking a Road dot can bring a Moment of Truth." : ""}</div>`;
        if (setting("applyChanges")) { await updateActor(actor, { "system.conditions.isfrenzy": true }); await setFlag(actor, "frenzyType", fear ? "fear" : "rage"); await condition(actor, fear ? "rotschreck" : "frenzy", true); }
        body += btn("endfrenzy", "End frenzy");
        data = { kind: "endfrenzy", actor: actor.uuid };
        const ridden = d.kind === "instinct" && R.instinctResult(r) === "ride";
        await kx().logEvent(actor, `${fear ? "Rötschreck" : ridden ? "Rides the wave of frenzy" : "Frenzy"}: ${d.prov}.`, "frenzy");
        // Some Roads count frenzy itself, or failing to ride it, as a sin (Kings, Bones, Sin, Metamorphosis…)
        if (!fear) {
            const sp = await kx().sinPrompt(actor, d.kind === "instinct" && !ridden ? "notRidden" : ridden ? "none" : "frenzy", ridden ? "" : "The Beast was given the reins");
            if (sp?.html) body += sp.html;
        }
    }
    if (msg) await markUsed(msg);
    return post(actor, `${actor.name}: ${fear ? "Rötschreck" : d.kind === "instinct" ? "Instinct" : "Frenzy"} check`, body, [r.roll], data);
}

export async function endFrenzy({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    await updateActor(actor, { "system.conditions.isfrenzy": false });
    await setFlag(actor, "frenzyType", null);
    await condition(actor, "frenzy", false);
    await condition(actor, "rotschreck", false);
    return post(actor, `${actor.name} regains control`, `<div class="vta-note">The frenzy ends. Wound penalties return. Consider a sin check for anything done while the Beast ruled.</div>`);
}

/* ================================================================== */
/*  Sins against the Road (p. 113)                                     */
/* ================================================================== */

export async function sin({ actor: a, level = null, desc = "" } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const v = virtues(actor), rd = road(actor);
    const hier = KR.hierarchyOf(rd.found);
    const lv = Math.max(1, Math.min(10, num(level) || rd.value || 1));
    const levelField = hier
        ? `<select name="level" data-fixed>${opts(hier.map((x, i) => [10 - i, `${10 - i}: ${x}${10 - i > rd.value ? " (beyond the rating: no roll)" : ""}`]), lv)}</select>`
        : `<input type="number" name="level" value="${lv}" min="1" max="10"/>`;
    const content = `<form>
      <p>${esc(actor.name)}: ${esc(rd.name)} ${rd.value}, ${v.conscience.label} ${v.conscience.value}${rd.found ? ` <span class="wodx-quiet">(VtDA20 p. ${rd.found.path?.p ?? rd.found.road.hp ?? rd.found.road.p})</span>` : ""}</p>
      <div class="form-group"><label>Sin (the Road's hierarchy${hier ? ", WoDX summaries" : ""})</label>${levelField}</div>
      <div class="form-group"><label>The sin</label><input type="text" name="desc" value="${esc(desc)}"/></div>
      <div class="form-group"><label>On failure, lose</label><select name="lose">${opts([["road", "A Road dot"], ["conscience", `A ${v.conscience.label} dot`], ["selfcontrol", `A ${v.selfcontrol.label} dot`], ["courage", "A Courage dot"]], "road")}</select></div>
      <div class="form-group"><label><input type="checkbox" name="automatic"/> Automatic loss (e.g. murder on a Road that forbids it, diablerie)</label></div>
      <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
    </form>`;
    return dialog("Sin against the Road", content, "Roll", async fd => {
        fd.level = num(fd.level);
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
            body += `<div class="vta-big good">The sin is rationalized; the Road holds.</div>`;
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
        await kx().logEvent(actor, `Sin (level ${fd.level}${fd.desc ? `: ${fd.desc}` : ""}): ${fail ? `loses a dot of ${fd.lose === "road" ? rd.name : v[fd.lose]?.label ?? fd.lose}` : "rationalized"}.`, "sin");
        return post(actor, title, body, rolls);
    });
}

/* ================================================================== */
/*  Hunting & feeding (p. 334, 340-341)                               */
/* ================================================================== */

/** The vessel's blood: drink, drugs or disease (V20 pp. 295, 301-302). */
function stateFields(sel = "clean") {
    return `<div class="form-group"><label>In the vessel's blood</label><select name="vstate" data-fixed>${opts(Object.entries(R.VESSEL_STATES).map(([k, x]) => [k, x.label]), sel)}</select></div>
      <div class="form-group"><label>Drinks, if drunk</label><input type="number" name="drinks" value="4" min="0" max="20"/></div>`;
}

export async function hunt({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const b = blood(actor), v = virtues(actor);
    // WoDX Storyteller (0.12.0) keeps a hunting ground and heat on each scene; without it, the market and no heat
    const scene = actor.getActiveTokens?.()[0]?.scene ?? canvas?.scene ?? null;
    let here = null;
    try { here = game.modules.get("wodx-storyteller")?.api?.upkeep?.huntHere?.(scene) ?? null; } catch (e) { here = null; }
    // The vampire's usual hunt (B964) fills in the window; the scene's own ground still wins
    const rule = feedingRule(actor), year = yearNow();
    const styleKey = KF.HUNT_STYLES[flag(actor, "huntStyle")] && KF.styleAllowed(flag(actor, "huntStyle"), year) ? flag(actor, "huntStyle") : "";
    const style = KF.HUNT_STYLES[styleKey] ?? null;
    const area = here?.area && R.HUNTING_GROUNDS[here.area] ? here.area : style?.area ?? "market";
    const abId = k => findAbility(actor, k)?.id ?? "";
    const styles = Object.entries(KF.HUNT_STYLES).filter(([k]) => KF.styleAllowed(k, year));
    const styleData = Object.fromEntries(styles.map(([k, x]) => [k, { area: x.area, prey: x.prey, attr: x.attr, ability: abId(x.ability), state: x.state ?? "clean", clash: KF.styleClash(k, rule), note: x.note ?? "" }]));
    const palDiff = rule?.palate ? KF.palateHuntDifficulty((flag(actor, "palate") ?? {}).breadth ?? "broad") : 0;
    // 3.45.0: the hour, the era, the crowd and the weather (WoDX NPC passers-by and WoDX Atmosphere), as a suggestion
    const night = await huntNight(scene, area, year);
    const content = `<form>
      <p>${esc(actor.name)}: blood ${b.value}/${b.max}; hungry below ${7 - v.selfcontrol.value} (7 – ${v.selfcontrol.label})</p>
      <div class="form-group"><label>Usual hunt</label><select name="style" data-fixed>${opts([["", "— none —"], ...styles.map(([k, x]) => [k, x.label])], styleKey)}</select></div>
      <p class="vta-note wodx-style-note">${esc([style?.note, styleKey ? styleData[styleKey].clash : ""].filter(Boolean).join(" "))}</p>
      <div class="form-group"><label>Hunting ground</label><select name="area" data-fixed>${opts(Object.entries(R.HUNTING_GROUNDS).map(([k, g]) => [k, `${g.label} (${g.diff})`]), area)}</select></div>
      ${here?.outbreak ? `<p class="vta-note"><b>${esc(here.outbreak.name)}.</b> ${esc(here.outbreak.note)} The sick are easy to find, and blood taken from them can carry the sickness to the next vessel.</p>` : ""}
      ${here?.outbreak?.diff ? `<div class="form-group"><label>The sick are everywhere</label><input type="number" name="sickDiff" value="${here.outbreak.diff}" max="0"/></div>` : ""}
      ${here?.extra ? `<div class="form-group"><label>Heat here (${esc(here.band.name)})</label><input type="number" name="heat" value="${here.extra}" min="0"/></div>` : ""}
      ${poolSelectors(actor, "", { attr: style?.attr ?? "wits", ability: (style ? abId(style.ability) : "") || (findAbility(actor, "streetwise")?.id ?? findAbility(actor, "subterfuge")?.id ?? "") })}
      <div class="form-group"><label>Fame / Domain / Herd</label>
        <input type="number" name="fame" value="${background(actor, "Fame")}" style="width:3.5em"/> <input type="number" name="domain" value="${background(actor, "Domain")}" style="width:3.5em"/> <input type="number" name="herd" value="${background(actor, "Herd")}" style="width:3.5em"/></div>
      <div class="form-group"><label>Inhumanity / other difficulty</label><input type="number" name="inhuman" value="0"/></div>
      ${night.n ? `<div class="form-group"><label>The night (house rule)</label><input type="number" name="nightDiff" value="${night.n}" min="0"/></div><p class="vta-note">${esc(HN.nudgeText(night))}. Set it to 0 if it doesn't fit.</p>` : ""}
      ${night.cal?.changes?.length ? `<div class="form-group"><label>Feasts, fasts and curfews</label><input type="number" name="faithDiff" value="${night.cal.n}" min="-2" max="2"/></div><ul class="vta-note wodx-hunt-calendar">${night.cal.changes.map(c => `<li>${esc(`${c.n > 0 ? "+" : c.n < 0 ? "−" : "±"}${Math.abs(c.n)} ${c.why}`)}</li>`).join("")}</ul><p class="vta-note">The calendar of each faith kept here. Change the number to overrule it.</p>` : ""}
      ${palDiff ? `<div class="form-group"><label>Palate (+${palDiff}, house rule; Herd is taken to fit)</label><input type="number" name="palateDiff" value="${palDiff}" min="0"/></div>` : ""}
      <div class="form-group"><label>Hours available</label><input type="number" name="hours" value="3" min="1"/></div>
      <div class="form-group"><label>Prey</label><select name="vessel" data-fixed>${opts(Object.entries(R.VESSELS).map(([k, x]) => [k, `${x.label} (${x.pool})`]), style?.prey ?? "human")}</select></div>
      <div class="form-group"><label>Blood to take (0 = until sated)</label><input type="number" name="take" value="2" min="0"/></div>
      ${stateFields(here?.outbreak ? "disease" : style?.state ?? "clean")}
      ${feedingFields(actor, rule, { hunting: true })}
      <div class="form-group"><label><input type="checkbox" name="dieWorth"/> Storyteller option: prey yields one die's worth of blood</label></div>
      <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div>
    </form>`;
    const faithWhy = (night.cal?.changes ?? []).filter(c => c.n).map(c => c.why.replace(/:.*$/, "")).join("; ");
    const render = (...args) => {
        const root = rootOf(args.find(x => x?.querySelector || x?.[0]?.querySelector) ?? args[0]);
        huntOdds(root, actor, faithWhy);
        const sel = root?.querySelector?.("select[name=style]");
        if (!sel) return;
        sel.addEventListener("change", () => {
            const d = styleData[sel.value];
            const note = root.querySelector(".wodx-style-note");
            if (note) note.textContent = d ? [d.note, d.clash].filter(Boolean).join(" ") : "";
            if (!d) return;
            const set = (name, val) => { const el = root.querySelector(`[name=${name}]`); if (el && val !== undefined && val !== "" && [...(el.options ?? [])].some(o => o.value === val)) el.value = val; };
            if (!here?.area) set("area", d.area);
            set("vessel", d.prey); set("attr", d.attr); set("ability", d.ability); if (!here?.outbreak) set("vstate", d.state);
        });
    };
    return dialog("WoDX Hunt", content, "Hunt", async fd => {
        if ((fd.style ?? "") !== (flag(actor, "huntStyle") ?? "")) await setFlag(actor, "huntStyle", fd.style || null);
        await savePalate(actor, rule, fd);
        return resolveHunt(actor, { ...fd, faithWhy, sceneId: scene?.id ?? null, rule });
    }, { width: 500, render });
}

/**
 * The odds before the hunt (3.58.0): the chance of prey in the first hour and within the hours given, a botch in an
 * hour, and every change to the pool and difficulty by name, the faith calendar's included.
 */
function huntOdds(root, actor, faithWhy = "") {
    let on = true;
    try { on = setting("showOdds") !== false; } catch (e) { on = true; }
    const form = root?.querySelector?.("form");
    if (!on || !form || !actor || form.querySelector(".vta-odds")) return;
    const box = document.createElement("div");
    box.className = "vta-odds";
    box.setAttribute("aria-live", "polite");
    form.prepend(box);
    const draw = () => {
        try {
            const fd = P.readForm(root);
            if (!R.HUNTING_GROUNDS[fd.area]) { box.hidden = true; return; }
            const { built, parts } = huntBuilt(actor, { ...fd, faithWhy });
            const o = OD.odds(built.dice, built.difficulty, { specialty: !!fd.specialty });
            const hours = Math.max(1, num(fd.hours) || 1);
            // An hour with no prey and no botch goes on to the next; a botch ends the hunt
            const within = o.fail >= 1 ? 0 : o.any * (1 - Math.pow(o.fail, hours)) / (1 - o.fail);
            box.hidden = false;
            box.innerHTML = `<div class="vta-odds-line"><b>Odds</b> ${esc(`${built.dice} dice at ${built.difficulty}: prey in the first hour ${OD.pct(o.any)}, within ${hours} hour${hours === 1 ? "" : "s"} ${OD.pct(within)}; a botch ${OD.pct(o.botch)} an hour`)}</div>`
                + `<div class="vta-odds-parts">${parts.map(esc).join(" · ")}</div>`;
        } catch (e) { box.hidden = true; console.warn("WoDX | hunt odds", e); }
    };
    form.addEventListener("input", draw);
    form.addEventListener("change", draw);
    draw();
}

/** The night's nudge for a hunt here: {n, reasons}. Nothing when the clock can't be read. */
async function huntNight(scene, area, year) {
    try {
        const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
        const lat = (() => { try { return game.settings.get("wodx-chronicle", "latitude"); } catch (e) { return 50; } })();
        const t = cal.describeTime(game.time.worldTime, lat);
        const crowd = scene?.getFlag?.("wodx-npc", "crowd") ?? {};
        const atm = game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere")?.api?.weather : null;
        let weather = null, indoor = false;
        try { weather = atm?.now?.() ?? null; indoor = atm?.isOutdoor ? !atm.isOutdoor(scene) : false; } catch (e) { weather = null; }
        const nd = HN.huntNudge({ year: t?.year || year, hour: t?.hour ?? 22, area, density: crowd.density ?? "normal", weather, indoor });
        // 3.58.0: the faith calendar of the town, each change named (WoDX NPC hunt-calendar, B2710)
        const faithCal = calendarFor(scene, { area, crowd: nd.n, outdoors: !indoor });
        return { ...nd, cal: faithCal };
    } catch (e) { return { n: 0, reasons: [], cal: { n: 0, changes: [], text: "" } }; }
}

/** The hunt's pool and difficulty from the window's choices, and each change by name (for the odds and the card). */
function huntBuilt(actor, fd) {
    const pool = readPool(actor, fd.attr, fd.ability);
    const fame = Number(fd.fame) || 0, domain = Number(fd.domain) || 0, herd = Number(fd.herd) || 0, faith = Number(fd.faithDiff) || 0;
    const hp = R.huntingPool({ area: fd.area, fame, domain, herd, calendar: faith, inhuman: (Number(fd.inhuman) || 0) + (Number(fd.heat) || 0) + (Number(fd.palateDiff) || 0) + (Number(fd.nightDiff) || 0) + (Number(fd.sickDiff) || 0) });
    const built = R.actionPool({ attribute: pool.attribute, attributeLabel: pool.attributeLabel, ability: pool.ability, abilityLabel: pool.abilityLabel,
        abilityType: setting("untrained") ? pool.abilityType : "talent", abilityKey: pool.abilityKey, bonusDice: hp.bonusDice, baseDifficulty: hp.difficulty,
        woundPenalty: woundPenalty(actor) });
    const sign = x => (x > 0 ? `+${x}` : `–${-x}`);
    const parts = [`${R.HUNTING_GROUNDS[fd.area]?.label ?? fd.area} ${R.HUNTING_GROUNDS[fd.area]?.diff ?? 6}`,
        fame || domain ? `Fame/Domain –${fame + domain} (min 3)` : "", herd ? `Herd +${herd} dice` : "",
        faith ? `feasts, fasts and curfews ${sign(faith)}${fd.faithWhy ? ` (${fd.faithWhy})` : ""}` : "",
        Number(fd.nightDiff) ? `the night ${sign(Number(fd.nightDiff))}` : "", Number(fd.heat) ? `heat +${Number(fd.heat)}` : "", Number(fd.sickDiff) ? `the sick ${sign(Number(fd.sickDiff))}` : "",
        Number(fd.palateDiff) ? `palate +${Number(fd.palateDiff)}` : "", Number(fd.inhuman) ? `other ${sign(Number(fd.inhuman))}` : ""].filter(Boolean);
    return { pool, hp, built, parts };
}

async function resolveHunt(actor, fd) {
    const { hp, built, parts } = huntBuilt(actor, fd);
    const rolls = [];
    let body = `<div class="vta-sub">Difficulty ${hp.difficulty}: ${esc(parts.join(", "))}</div>`;
    let caught = false, botched = false;
    for (let h = 1; h <= Math.max(1, fd.hours); h++) {
        const r = await rollPool(built.dice, built.difficulty, { specialty: fd.specialty });
        rolls.push(r.roll);
        body += rollBlock(`Hour ${h}`, r, h === 1 ? built.parts : [], fd.specialty);
        if (r.botch) { botched = true; body += `<div class="vta-warn">Botch: a complication: witnesses, a rival's herd, the Watch, a hunter…</div>`; break; }
        if (r.successes > 0) { caught = true; break; }
    }
    // WoDX Storyteller adds heat to the place (a hunt, or more for a botch); the hook is all it hears
    Hooks.callAll("wodxHunted", { actorId: actor.id, sceneId: fd.sceneId ?? null, caught, botch: botched });
    if (!caught) return post(actor, `${actor.name} hunts`, body + `<div class="vta-big">No prey this night${fd.hours > 1 ? " (time spent)" : ""}.</div>`, rolls);
    body += `<div class="vta-big good">Prey caught: ${R.VESSELS[fd.vessel].label}.</div>`;
    let take = fd.take;
    if (fd.dieWorth) { const d = await rollPool(1, 11); rolls.push(d.roll); take = d.faces[0] ?? 1; body += `<div class="vta-note">One die's worth of blood: ${take}.</div>`; }
    const st = KF.HUNT_STYLES[fd.style];
    const fed = await feedResolve(actor, { vesselType: fd.vessel, take, vesselActor: null, rolls, state: fd.vstate, drinks: fd.drinks, cold: st?.cold ?? 0,
        rule: fd.rule ?? null, fits: fd.fits === undefined ? true : !!fd.fits, willing: !!fd.willing, fought: !!fd.fought, offering: fd.offering === undefined ? true : !!fd.offering });
    return post(actor, `${actor.name} hunts`, body + fed.html, rolls);
}

/* Feeding rules of clans and bloodlines, and the vessel's harm (3.41.0, feeding-rules.js) */
function yearNow() { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } }
function feedingDarkAges() { return KF.isDarkAgesFeeding({ eraId: FXD.eraId(), year: yearNow() }); }
/** The clan or bloodline's feeding rule for a vampire, or null. A flag wodx-actions.bloodline names a bloodline the sheet can't. */
function feedingRule(actor) {
    if (!actor || !isVampire(actor)) return null;
    const s = actor.system ?? {};
    const name = [flag(actor, "bloodline"), s.clan === "custom" ? s.custom?.clan : s.clan, s.custom?.clan].filter(Boolean);
    for (const t of name) { const k = KF.clanKey(t); if (k) return KF.ruleFor(k, { darkAges: feedingDarkAges() }); }
    return null;
}
/** The token document behind a vessel (for a passer-by's tags). */
function vesselTokenDoc(t, vessel) {
    if (t?.document) return t.document;
    if (t?.documentName === "Token") return t;
    if (vessel?.token) return vessel.token;
    return [...(game.user.targets ?? [])].find(x => x.actor?.id === vessel?.id)?.document ?? null;
}
/** A vessel's tags: its own (wodx-actions.vesselTags), a passer-by's (wodx-npc.passerby.tags), and "animal" for beasts. */
function vesselTagsOf(vessel, tokDoc) {
    const own = KF.parseTags(flag(vessel, "vesselTags") ?? []);
    const pb = KF.parseTags(tokDoc?.flags?.["wodx-npc"]?.passerby?.tags ?? []);
    const kind = vessel ? P.detectProfile(vessel) : "";
    return [...new Set([...own, ...pb, ...(kind === "beast" ? ["animal"] : []), ...(kind === "kindred" ? ["kindred", "vampire"] : [])])];
}
/** A living vessel's blood: its own flag (system blood pools are 0 on mortal sheets), recovering one a day. */
function vesselBlood(vessel, vesselType) {
    const kind = P.detectProfile(vessel);
    const living = KF.isLiving(kind) && kind !== "ghoul";
    if (!living) { const b = blood(vessel); return { living: KF.isLiving(kind), value: b.value, full: b.max, system: true }; }
    const full = R.VESSELS[vesselType]?.pool ?? 10;
    return { living: true, value: KF.bloodNow(flag(vessel, "vesselBlood"), full, game.time?.worldTime ?? 0), full, system: false };
}
const FOUGHT_SECONDS = 3600;
function foughtRecently(vessel, actor) {
    const at = flag(vessel, "fought")?.[actor.id];
    return at !== undefined && (game.time?.worldTime ?? 0) - num(at) <= FOUGHT_SECONDS;
}
/** The clan's own lines in the Feed and Hunt windows. */
function feedingFields(actor, rule, { tags = [], fits = null, willing = false, fought = false, hunting = false } = {}) {
    if (!rule) return "";
    let h = `<p class="vta-note"><b>${esc(rule.label)}.</b> ${esc(rule.note)} (${esc(rule.page)})</p>`;
    if (rule.palate) {
        const p = flag(actor, "palate") ?? {};
        h += `<div class="form-group"><label>Palate (chosen at the Embrace)</label><input type="text" name="palateText" value="${esc(p.text ?? "")}" placeholder="e.g. merchants' daughters"/></div>
          <div class="form-group"><label>Palate tags</label><input type="text" name="palateTags" value="${esc((p.tags ?? []).join(", "))}" placeholder="merchant, woman"/></div>
          <div class="form-group"><label>Palate is</label><select name="palateBreadth" data-fixed>${opts(Object.entries(KF.PALATE_BREADTH).map(([k, x]) => [k, x.label]), p.breadth ?? "broad")}</select></div>`;
        if (!hunting) h += `<div class="form-group"><label><input type="checkbox" name="fits"${fits !== false ? " checked" : ""}/> The vessel fits the palate${fits === null ? " (no tags to check: the Storyteller's call)" : fits ? " (the tags match)" : " (the tags don't match)"}</label></div>`;
        else h += `<div class="form-group"><label><input type="checkbox" name="fits" checked/> The prey caught fits the palate (the hunt's difficulty pays for it)</label></div>`;
    }
    if (rule.flesh && !hunting) h += `<div class="form-group"><label>Flesh points to eat (each: +1 blood, 1 unsoakable lethal to the vessel)</label><input type="number" name="flesh" value="0" min="0" max="10"/></div>`;
    if (rule.unwilling) h += `<div class="form-group"><label><input type="checkbox" name="willing"${willing ? " checked" : ""}/> The vessel is willing (or enthralled by Presence)</label></div>`;
    if (rule.mustFight) h += `<div class="form-group"><label><input type="checkbox" name="fought"${fought ? " checked" : ""}/> Fought and beaten first${fought ? " (a fight is on record)" : ""}</label></div>`;
    if (rule.offering) h += `<div class="form-group"><label><input type="checkbox" name="offering" checked/> The vessel is offered to the gods first (thirty seconds)</label></div>`;
    return h;
}
/** Save a changed palate on the vampire. */
async function savePalate(actor, rule, fd) {
    if (!rule?.palate || fd.palateText === undefined) return;
    const p = { text: String(fd.palateText ?? "").trim(), tags: KF.parseTags(fd.palateTags), breadth: fd.palateBreadth || "broad" };
    const cur = flag(actor, "palate") ?? {};
    if (cur.text !== p.text || (cur.tags ?? []).join() !== p.tags.join() || cur.breadth !== p.breadth) await setFlag(actor, "palate", p);
}

export async function feed({ actor: a, vessel: t, willing = false } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const vessel = targetActor(t);
    const tokDoc = vessel ? vesselTokenDoc(t, vessel) : null;
    const pbVessel = tokDoc?.flags?.["wodx-npc"]?.passerby?.vessel;
    const vType = pbVessel && R.VESSELS[pbVessel] ? pbVessel : vessel && isVampire(vessel) ? "vampire" : vessel && P.detectProfile(vessel) === "fae" ? "fae" : vessel && P.detectProfile(vessel) === "beast" ? "dog" : "human";
    const vb = vessel ? vesselBlood(vessel, vType) : null;
    const rule = feedingRule(actor);
    const vtags = vessel ? vesselTagsOf(vessel, tokDoc) : [];
    const pal = flag(actor, "palate") ?? {};
    const fits = rule?.palate ? (vessel && isVampire(vessel) ? true : KF.matchTags(pal.tags, vtags)) : null;
    const content = `<form>
      <p>${esc(actor.name)} feeds${vessel ? ` from <b>${esc(vessel.name)}</b> (blood ${vb.value}${vb.living && !vb.system ? `/${vb.full}` : ""})` : " (no target selected)"}</p>
      <div class="form-group"><label>Vessel</label><select name="vessel" data-fixed>${opts(Object.entries(R.VESSELS).map(([k, x]) => [k, `${x.label} (${x.pool})`]), vType)}</select></div>
      <div class="form-group"><label>Blood points to drink (0 = until sated)</label><input type="number" name="take" value="2" min="0"/></div>
      <div class="form-group"><label>Minutes the blood has been outside a living body</label><input type="number" name="cold" value="0" min="0"/></div>
      ${stateFields(vessel?.flags?.[MOD]?.vesselState ?? "clean")}
      ${vessel ? `<div class="form-group"><label>Vessel's tags (who they are)</label><input type="text" name="vtags" value="${esc(vtags.join(", "))}" placeholder="merchant, woman, catholic"/></div>` : ""}
      ${feedingFields(actor, rule, { tags: vtags, fits, willing, fought: vessel ? foughtRecently(vessel, actor) : false })}
    </form>`;
    return dialog("WoDX Feed", content, "Feed", async fd => {
        const rolls = [];
        await savePalate(actor, rule, fd);
        if (vessel && fd.vtags !== undefined) {
            const nt = KF.parseTags(fd.vtags), auto = vesselTagsOf(null, tokDoc);
            const own = nt.filter(x => !auto.includes(x) && !["animal", "kindred", "vampire"].includes(x) || KF.parseTags(flag(vessel, "vesselTags") ?? []).includes(x));
            if (own.join() !== KF.parseTags(flag(vessel, "vesselTags") ?? []).join()) await setFlag(vessel, "vesselTags", own.length ? own : null);
        }
        const fed = await feedResolve(actor, { vesselType: fd.vessel, take: fd.take, vesselActor: vessel, cold: fd.cold, rolls, state: fd.vstate, drinks: fd.drinks,
            rule, fits: rule?.palate ? !!fd.fits : true, willing: !!fd.willing, fought: !!fd.fought, offering: fd.offering === undefined ? true : !!fd.offering,
            flesh: num(fd.flesh), tags: vessel ? KF.parseTags(fd.vtags) : [] });
        return post(actor, `${actor.name} feeds${vessel ? ` on ${esc(vessel.name)}` : ""}`, fed.html, rolls, fed.undo ? { kind: "feed", actor: actor.uuid, undo: fed.undo } : null);
    });
}

/** Shared feeding: hunger check, amount, the clan's rule, vessel harm, blood pool, Blood Oath. */
async function feedResolve(actor, { vesselType, take, vesselActor, cold = 0, rolls, state = "clean", drinks = 0, rule = null, fits = true, willing = true, fought = false, offering = true, flesh = 0, tags = [] }) {
    let html = "";
    // What is in the vessel's blood (V20 pp. 295, 301-302): a blood-borne disease may be spotted before drinking
    const taint = R.VESSEL_STATES[state] && state !== "clean" ? state : null;
    if (taint === "disease" && isVampire(actor)) {
        const med = findAbility(actor, "medicine");
        const spot = await rollPool(attr(actor, "intelligence") + num(med?.value), 7);
        rolls.push(spot.roll);
        html += rollBlock("Spotting the sickness: Intelligence + Medicine (7)", spot);
        let out = R.diseaseOutcome(spot);
        if (out.spotted) return { html: html + `<div class="vta-res good">${esc(actor.name)} tastes the sickness in time and does not drink. ${esc(R.VESSEL_STATES.disease.note)}</div>`, drunk: 0 };
        if (out.carrier === null) {
            const res = await rollPool(attr(actor, "stamina"), 6);
            rolls.push(res.roll);
            html += rollBlock("Resisting it: Stamina (6)", res);
            out = R.diseaseOutcome(spot, res);
        }
        if (out.carrier) {
            // B3438: name the town's sickness when it rides in the blood (WoDX Storyteller's contagion), so the carrier can bring it to a clean town
            let sick = null;
            try { sick = game.modules.get("wodx-storyteller")?.api?.upkeep?.huntHere?.(canvas?.scene)?.outbreak ?? null; } catch (e) { sick = null; }
            const named = sick?.blood && sick.disease ? { disease: sick.disease, what: sick.name } : { what: "a blood-borne disease" };
            if (setting("applyChanges")) await updateActor(actor, { [`flags.${MOD}.carrier`]: { since: game.time?.worldTime ?? 0, ...named } });
            html += `<div class="vta-warn">${esc(actor.name)} now carries the sickness and can pass it to later vessels${out.why === "botch" ? " (a botch on spotting it)" : ""}.</div>`;
        } else html += `<div class="vta-res">${esc(actor.name)} misses the sickness but throws it off.</div>`;
    }
    const v = virtues(actor), b = blood(actor);
    const vessel = R.VESSELS[vesselType] ?? R.VESSELS.human;
    const vKind = vesselActor ? P.detectProfile(vesselActor) : null;
    // A passer-by animal stands on a mortal sheet: no human vessel rolls for it (B971)
    const pbAnimal = !!vesselActor?.token?.flags?.["wodx-npc"]?.passerby?.animal;
    const vampireVessel = vesselType === "vampire" || (vesselActor && isVampire(vesselActor));
    // The vessel's blood: a living vessel has the lower of its blood and (full - damage) (V20 printed p. 269, both ways)
    const vb = vesselActor ? vesselBlood(vesselActor, vesselType) : { living: !vampireVessel, value: vessel.pool, full: vessel.pool, system: false };
    const dmg0 = vesselActor ? healthTrack(vesselActor).damage : { bashing: 0, lethal: 0, aggravated: 0 };
    const dmgTotal = dmg0.bashing + dmg0.lethal + dmg0.aggravated;
    let vesselPool = vb.system ? vb.value : KF.available({ blood: vb.value, full: vb.full, damage: dmgTotal, living: vb.living && !!vesselActor });
    if (vesselActor && vb.living && dmgTotal && vesselPool < vb.value) html += `<div class="vta-note">Wounded: ${esc(vesselActor.name)} has ${vesselPool} blood to give (one fewer per health level of damage, V20 printed p. 269).</div>`;
    // The clan's limits that come before the first drop
    let nightPenalty = false;
    if (rule?.unwilling && !willing && !vampireVessel) {
        if (rule.unwilling === "wp") {
            const ok = await spendWillpower(actor, 1);
            html += `<div class="vta-note">${esc(rule.label)}: feeding on the unwilling ${ok ? "costs a Willpower point" : "would cost a Willpower point (none left)"} (${esc(rule.page)}).</div>`;
        } else {
            const r = await rollPool(willpower(actor).perm, 6);
            rolls.push(r.roll);
            html += rollBlock(`${rule.label}: feeding on the unwilling, Willpower (6)`, r);
            if (!r.successes) { nightPenalty = true; html += `<div class="vta-warn">-2 dice on every roll for the rest of the night (${esc(rule.page)}).</div>`; }
        }
    }
    if (rule?.mustFight === "wpRoll" && !fought && !vampireVessel) {
        const r = await rollPool(willpower(actor).perm, 6);
        rolls.push(r.roll);
        html += rollBlock(`${rule.label}: feeding on someone not beaten in a fight, Willpower (6)`, r);
        if (!r.successes) { nightPenalty = true; html += `<div class="vta-warn">-2 dice on every roll for the rest of the night (${esc(rule.page)}).</div>`; }
    }
    if (nightPenalty && setting("applyChanges") && actor.isOwner) {
        try { await chronicle()?.applyTimed?.(actor, { name: `${rule.label}: -2 dice tonight`, img: "icons/svg/downgrade.svg", key: "wodx-actions.feedPenalty",
            description: "Fed against the blood's law: -2 dice on every roll until dawn.", duration: { kind: "night" }, source: rule.page }); } catch (e) { console.warn("WoDX | feed penalty", e); }
    }
    let gorge = false;
    if (isVampire(actor) && R.isHungry(b.value, v.selfcontrol.value) && !flag(actor, "golconda")) {
        const vp = R.virtuePool(v.selfcontrol.value, { road: road(actor).value || 10, blood: b.value, bloodLimited: true });
        const r = await rollPool(vp.dice, 6);
        rolls.push(r.roll);
        html += rollBlock(`Hunger: ${v.selfcontrol.label} (blood ${b.value} &lt; ${7 - v.selfcontrol.value})`, r, vp.caps.length ? [`capped by ${vp.caps.join(", ")}`] : []);
        if (v.selfcontrol.isInstinct) {
            if (r.successes === 0) gorge = true;
            html += `<div class="vta-res">${gorge ? "The Beast cannot be steered: the vampire gorges." : "The vampire rides the hunger and stops when they choose."}</div>`;
        } else {
            gorge = r.successes === 0;
            html += `<div class="vta-res">${gorge ? "Hunger frenzy: the vampire gorges until sated, the vessel dies, or control returns." : "Control holds."}</div>`;
        }
    }
    const room0 = b.max - b.value;
    // Nagaraja flesh (V20 printed p. 407): from what is left of the body
    let fleshEaten = 0;
    if (rule?.flesh && flesh > 0) {
        const body = KF.fleshPoints(vesselType, vessel.pool) - num(vesselActor ? flag(vesselActor, "fleshTaken") : 0);
        fleshEaten = Math.max(0, Math.min(flesh, body, Math.max(0, room0)));
        html += `<div class="vta-sec"><b>Eats ${fleshEaten} flesh point${fleshEaten === 1 ? "" : "s"}</b>${fleshEaten < flesh ? ` (of ${flesh}: ${body <= fleshEaten ? "the body has no more" : "no room in the pool"})` : ""}.</div>`;
        const ns = KF.fleshEaten(flag(actor, "nagaraja") ?? {}, fleshEaten);
        if (setting("applyChanges")) await setFlag(actor, "nagaraja", ns);
        html += `<div class="vta-note">Flesh debt: ${ns.debt} di${ns.debt === 1 ? "e" : "ce"} off Physical pools${ns.debt ? "" : " (caught up)"}.</div>`;
        if (ns.debt !== num(flag(actor, "nagaraja")?.debt) || fleshEaten) await nagarajaPenalty(actor, ns.debt);
    }
    const room = Math.max(0, room0 - fleshEaten);
    const nour = KF.nourishment(rule, { vesselKind: vesselType, vampireVessel, fits, fought, offering });
    // Gorging on blood that gives nothing: the Beast drinks on until the vessel is empty
    let want = gorge ? (nour.factor ? room : vesselPool) : !take ? room : Math.min(take, nour.factor ? room : take);
    let drunk = Math.max(0, Math.min(want, Math.floor(vesselPool)));
    const minutes = cold || 0;
    const effective = KF.nourished(R.bloodGained(drunk, { minutesDead: minutes }), nour.factor);
    const turns = Math.ceil(drunk / 3);
    html += `<div class="vta-sec"><b>Drinks ${drunk} blood point${drunk === 1 ? "" : "s"}</b> (${turns} turn${turns === 1 ? "" : "s"} at up to 3 per turn)${minutes >= 10 ? `; cold blood, worth ${effective}` : ""}.</div>`;
    if (nour.why && drunk > 0) html += `<div class="vta-warn">${esc(rule.label)}: ${esc(nour.why)} (${esc(rule.page)}).</div>`;
    if (vessel.pool < 1) html += `<div class="vta-note">A ${vessel.label.toLowerCase()} holds only ${vessel.pool} blood point.</div>`;
    // Efficient Digestion (V20 p. 480 printed): one more point for every two drunk
    const digest = vessel.pool < 1 || !nour.factor ? 0 : TH.digestionBonus(actor, drunk, room - effective);
    if (digest) html += `<div class="vta-note">Efficient Digestion: ${digest} more blood point${digest === 1 ? "" : "s"}.</div>`;
    const gain = vessel.pool < 1 ? 0 : effective + digest + fleshEaten;
    if (gain) {
        const ch = await changeBlood(actor, gain);
        html += `<div class="vta-res good">Blood pool ${ch.before} → ${ch.after}</div>`;
    }
    if (taint && taint !== "disease" && drunk > 0 && isVampire(actor)) {
        const pen = taint === "drunk" ? R.drinkPenalty(drinks) : 0;
        html += `<div class="vta-note"><b>${esc(R.VESSEL_STATES[taint].label)}.</b> ${esc(R.VESSEL_STATES[taint].note)}${taint === "drunk" ? ` Now: −${pen} di${pen === 1 ? "e" : "ce"}.` : ""}</div>`;
    }
    // Prey Exclusion (V20 printed p. 485): the group on the item; tags make it certain, otherwise a reminder
    const pex = (actor.items ?? []).find(i => /prey exclusion/i.test(i.name ?? ""));
    const pexHit = drunk > 0 && pex ? KF.matchTags(KF.preyExclusionTags(pex.name), tags) : null;
    if (pexHit === true) html += `<div class="vta-warn">Prey Exclusion: ${esc(vesselActor?.name ?? "the vessel")} is one of the forbidden. Frenzy at once, and a roll of the Road or Humanity at difficulty 7.</div><button type="button" class="vta-btn" data-kx="frenzy" data-actor="${esc(actor.uuid)}" data-arg="physical">Frenzy</button>`;
    else if (pexHit === null) { const prey = drunk > 0 ? TH.preyNote(actor) : ""; if (prey) html += `<div class="vta-warn">${esc(prey)}</div>`; }
    // Chronicle 0.22.0: flaws that bite on feeding go to the Storyteller's queue (Infectious Bite and the like)
    if (drunk > 0) { try { game.modules.get("wodx-chronicle")?.api?.traits?.prompt?.(actor, "feed", { at: `${vesselActor?.id ?? vesselType}:${Math.floor(game.time.worldTime)}` }); } catch (e) { /* no traits */ } }
    const faeVessel = vesselType === "fae" || (vesselActor && P.detectProfile(vesselActor) === "fae");
    const high = faeVessel && isVampire(actor) ? R.faeBloodHigh(drunk) : null;
    if (high) html += `<div class="vta-warn">${esc(high.note)}</div>`;
    if (drunk > 0 && flag(actor, "carrier") && ["human", "child"].includes(vesselType)) html += `<div class="vta-warn">${esc(actor.name)} carries a blood-borne disease: this vessel may now have it (V20 p. 295).</div>`;
    // The vessel
    const living = vb.living && !vampireVessel;
    const undo = vesselActor ? { uuid: vesselActor.uuid, damage: dmg0, system: !!vb.system, vesselBlood: flag(vesselActor, "vesselBlood") ?? null, bloodpool: blood(vesselActor).value, fleshTaken: flag(vesselActor, "fleshTaken") ?? null, vesselState: flag(vesselActor, "vesselState") ?? null, statuses: [] } : null;
    const vRemaining = Math.max(0, vesselPool - drunk);
    const bloodLeft = Math.max(0, vb.value - drunk);
    if (vesselActor && setting("applyChanges")) {
        const upd = {};
        if (vb.system) upd["system.advantages.bloodpool.temporary"] = Math.max(0, blood(vesselActor).value - drunk);
        else if (drunk > 0) upd[`flags.${MOD}.vesselBlood`] = { value: bloodLeft, at: game.time?.worldTime ?? 0 };
        if (fleshEaten) upd[`flags.${MOD}.fleshTaken`] = num(flag(vesselActor, "fleshTaken")) + fleshEaten;
        // The taste goes with the blood (B960): a drained vessel's drink or drugs are gone
        if (bloodLeft <= 0 && flag(vesselActor, "vesselState")) upd[`flags.${MOD}.-=vesselState`] = null;
        if (Object.keys(upd).length) await updateActor(vesselActor, upd);
    }
    // One lethal level a point (two for the Giovanni), and one unsoakable lethal level a flesh point (B960)
    const harm = KF.kissDamage(drunk, { mult: rule?.kissMult ?? 1, living }) + fleshEaten;
    if (harm) {
        if (vesselActor && setting("applyChanges")) {
            const r = await applyDamage(vesselActor, "lethal", harm);
            html += `<div class="vta-res bad">${esc(vesselActor.name)} takes ${harm} lethal level${harm === 1 ? "" : "s"} from ${fleshEaten ? "the bite and the flesh torn" : "the blood lost"}${rule?.kissMult > 1 ? ` (${esc(rule.label)}: two a point)` : ""}${r?.after ? `: ${healthText(vesselActor, r.after)}` : ""}.</div>`;
        } else html += `<div class="vta-note">The vessel loses ${harm} health level${harm === 1 ? "" : "s"} (lethal) from the blood${fleshEaten ? " and flesh" : ""} taken.</div>`;
    }
    if (living && drunk > 0) {
        const lost = vb.full - bloodLeft;
        const out = KF.vesselOutcome(Math.max(lost, vb.full - vRemaining), vb.full);
        let state = null;
        if (!pbAnimal && (["human", "child"].includes(vesselType) || (vesselActor && profile(vesselActor) === "mortal"))) {
            const risk = R.vesselRisk(vesselActor ? attr(vesselActor, "stamina") : 2, drunk);
            if (risk) {
                const r = await rollPool(risk.dice, risk.difficulty);
                rolls.push(r.roll);
                html += rollBlock(`Vessel: Stamina – ${drunk - 2}`, r);
                state = r.botch ? "dying" : r.successes ? null : "unconscious";
                html += `<div class="vta-res ${r.successes ? "" : "bad"}">${r.botch ? "Botch: the vessel will die without immediate, severe care." : r.successes ? "The vessel stays conscious." : "The vessel passes out."}</div>`;
            }
        }
        if (out.key === "hospital" && vRemaining > 0) html += `<div class="vta-warn">${esc(vesselActor?.name ?? "The vessel")} ${esc(out.text)} (V20 printed p. 269).</div>`;
        if (vRemaining <= 0) state = "dead";
        if (vesselActor && state && setting("applyChanges")) {
            await statusEffect(vesselActor, state === "dead" ? "dead" : "unconscious", true);
            undo.statuses.push(state === "dead" ? "dead" : "unconscious");
            if (state === "dying") await updateActor(vesselActor, { [`flags.${MOD}.dying`]: { since: game.time?.worldTime ?? 0, why: "drained" } });
        }
        if (vRemaining <= 0) {
            html += `<div class="vta-warn">The vessel is drained dry and dies.</div>`;
            await kx().logEvent(actor, `Drains ${vesselActor?.name ?? "a vessel"} to death.`, "kill");
            const sp = await kx().sinPrompt(actor, actor.system?.conditions?.isfrenzy ? "killFrenzy" : "kill", `${vesselActor?.name ?? "The vessel"} is drained to death`);
            if (sp?.html) html += sp.html;
            else if (!sp) html += `<div class="vta-note">The Road doesn't count this killing as a sin, or names no level: the Storyteller decides.</div>`;
        } else if (!vesselActor) html += `<div class="vta-note">The vessel is left ${esc(out.text)}.</div>`;
        html += `<div class="vta-note">The living get back one blood point a day; the wounds heal by the healing chart.</div>`;
    }
    // Lamia: the Seed of Lilith (V20 printed p. 423; V20 Dark Ages pdf p. 92)
    if (rule?.lamia && living && drunk > 0) {
        if (rule.lamia === "v20") {
            // a player character's gender has no bearing on play (B3502): 7, as for anyone whose sex isn't known
            const gen = game.modules.get("wodx-chronicle")?.api?.gender, gs = vesselActor ? (gen?.forRules?.(vesselActor) ?? "") : "";
            const d = vesselActor?.hasPlayerOwner ? KF.lamiaDifficulty([]) : KF.lamiaDifficulty(gs ? [...tags, gs] : tags);
            const r = await rollPool(vesselActor ? attr(vesselActor, "stamina") : 2, d);
            rolls.push(r.roll);
            html += rollBlock(`The Seed of Lilith: the vessel's Stamina (${d})`, r);
            if (!r.successes) {
                html += `<div class="vta-warn">${esc(vesselActor?.name ?? "The vessel")} has the Seed of Lilith: a pox that kills within a few days.</div>`;
                if (vesselActor && setting("applyChanges")) await updateActor(vesselActor, { [`flags.${MOD}.seedOfLilith`]: { since: game.time?.worldTime ?? 0, rule: "v20" } });
            } else html += `<div class="vta-res">The vessel throws off the Seed of Lilith.</div>`;
        } else {
            html += `<div class="vta-warn">The Seed of Lilith: ${esc(vesselActor?.name ?? "the vessel")} rolls Stamina (7) each night for a fortnight, taking a lethal level each night it fails.</div>`;
            if (vesselActor && setting("applyChanges")) await updateActor(vesselActor, { [`flags.${MOD}.seedOfLilith`]: { since: game.time?.worldTime ?? 0, rule: "da" } });
        }
    }
    // Lamia vitae makes a carrier of the drinker
    if (drunk > 0 && vesselActor && isVampire(vesselActor) && feedingRule(vesselActor)?.lamia && setting("applyChanges")) {
        await updateActor(actor, { [`flags.${MOD}.carrier`]: { since: game.time?.worldTime ?? 0, what: "the Seed of Lilith (Lamia blood)" } });
        html += `<div class="vta-warn">Lamia blood: ${esc(actor.name)} now carries the Seed of Lilith until it is out of their body.</div>`;
    }
    // Witnesses: living tokens that can see the feeding (walls block sight)
    const myTok = actor.getActiveTokens?.()[0];
    if (myTok && drunk > 0) {
        // Who sees it by kind and place (3.42.0): mortals breach, other kinds are startled, Kindred and ghouls are calm
        const o = kx().observersOf(myTok, { secret: "kindred", exclude: [actor.id, vesselActor?.isToken ? vesselActor.token?.id : vesselActor?.id].filter(Boolean) });
        const ws = o.breach;
        if (ws.length) {
            html += `<div class="vta-warn">Masquerade: ${ws.map(t => esc(t.name)).join(", ")} can see this.</div>`;
            const pn = KX.placeNoteOf(o.mode, "feeding");
            if (pn) html += `<div class="vta-note">${esc(pn)}</div>`;
            html += `<button type="button" class="vta-btn" data-kx="witnesses" data-actor="${esc(actor.uuid)}" data-arg="${esc(ws.map(t => t.actor.uuid).join(","))}">Record the witnesses</button>`;
        } else if (o.mode === "guarded") html += `<div class="vta-note">${esc(KX.placeNoteOf(o.mode, "feeding"))}</div>`;
        if (o.startled.length) kx().revealed(actor, { secret: "kindred", event: "feeding", startledOnly: true }).catch(e => console.error("WoDX |", e));
    }
    if (drunk > 0 && vampireVessel) {
        html += `<div class="vta-note">Cainite vitae: this drink is a step of the Blood Oath toward ${vesselActor ? esc(vesselActor.name) : "the donor"}. A Cainite victim may roll Self-Control/Instinct (diff 8) to resist the Kiss.</div>`;
        // Assamite antitribu (V20 printed p. 429): Kindred blood is an addiction
        if (rule?.addiction) {
            if (flag(actor, "addicted")) html += `<div class="vta-warn">${esc(actor.name)} is addicted to Kindred blood: Self-Control or Instinct (6) to pass up the next chance (${esc(rule.page)}).</div>`;
            else {
                const d = KF.addictionDifficulty(drunk);
                const r = await rollPool(v.selfcontrol.value, d);
                rolls.push(r.roll);
                html += rollBlock(`${rule.label}: ${v.selfcontrol.label} (${d}) against addiction`, r);
                if (!r.successes) {
                    html += `<div class="vta-warn">${esc(actor.name)} is addicted to Kindred blood.</div>`;
                    if (setting("applyChanges")) await setFlag(actor, "addicted", { since: game.time?.worldTime ?? 0 });
                }
            }
        }
        if (vesselActor) html += await oathStep(actor, vesselActor, drunk, { firstDouble: !!rule?.bondFirstDouble });
        if (rule?.bondFirstDouble) html += `<div class="vta-note">${esc(rule.label)}: ${esc(rule.note)} (${esc(rule.page)})</div>`;
    }
    const hasUndo = !!(undo && setting("applyChanges") && (harm || undo.statuses.length || drunk > 0));
    if (hasUndo) html += `<button type="button" class="vta-btn" data-action="feedUndo">Undo the harm to ${esc(vesselActor.name)}</button>`;
    // 3.47.0: who was fed on, for WoDX NPC's memory of it (the vessel knows something happened)
    if (drunk > 0 && vesselActor) Hooks.callAll("wodxFed", { by: { uuid: actor.uuid, name: actor.name }, vessel: { uuid: vesselActor.uuid, name: vesselActor.name }, drunk, willing: !!willing, fought: !!fought });
    return { html, drunk, undo: hasUndo ? undo : null };
}

/** Nagaraja flesh debt as a penalty on the Physical Attributes' bonus (one die off every Physical pool a point). */
async function nagarajaPenalty(actor, debt) {
    if (!setting("applyChanges") || !actor?.isOwner) return;
    const had = num(flag(actor, "fleshPenalty"));
    const want = Math.max(0, num(debt));
    if (had === want) return;
    const upd = {};
    for (const k of ["strength", "dexterity", "stamina"]) {
        const at = actor.system.attributes?.[k];
        if (!at) continue;
        upd[`system.attributes.${k}.bonus`] = num(at.bonus) + had - want;
        upd[`system.attributes.${k}.total`] = num(at.total ?? at.value) + had - want;
    }
    upd[`flags.${MOD}.fleshPenalty`] = want;
    await actor.update(upd);
}

/** Undo the harm a feeding card did to the vessel (its damage, blood, flesh, states). */
async function feedUndo(msg, d) {
    const u = d.undo;
    const doc = u?.uuid ? await fromUuid(u.uuid) : null;
    const v = doc?.actor ?? doc;
    if (!v) return ui.notifications.warn("That vessel is gone.");
    if (!game.user.isGM && !v.isOwner) return ui.notifications.warn("Only the GM can undo harm to the vessel.");
    const upd = { ...healthUpdate(v, u.damage) };
    if (u.vesselBlood) upd[`flags.${MOD}.vesselBlood`] = u.vesselBlood; else upd[`flags.${MOD}.-=vesselBlood`] = null;
    if (u.fleshTaken) upd[`flags.${MOD}.fleshTaken`] = u.fleshTaken; else upd[`flags.${MOD}.-=fleshTaken`] = null;
    if (u.vesselState) upd[`flags.${MOD}.vesselState`] = u.vesselState;
    upd[`flags.${MOD}.-=dying`] = null;
    upd[`flags.${MOD}.-=seedOfLilith`] = null;
    if (u.system) upd["system.advantages.bloodpool.temporary"] = u.bloodpool;
    await updateActor(v, upd);
    for (const s of u.statuses ?? []) await statusEffect(v, s, false);
    await markUsed(msg, "feedUndo");
    return post(null, "Feeding undone", `<div class="vta-note">${esc(v.name)}: health, blood and states as before the feeding. The drinker's own blood is not changed back.</div>`);
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
      <p>${esc(actor.name)}: blood ${b.value}/${b.max}, ${b.perTurn} per turn (Generation ${generationOf(actor)}). Health: ${healthText(actor, dmg)}</p>
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
    // Thin Blood (V20 p. 483 printed): every cost doubled; blood given away is not a cost
    const mult = TH.bloodCostMult(actor);
    const total = (lethal + bashing + agg * 5 + qTotal + imitate + Math.max(0, fd.disc)) * mult + Math.max(0, fd.give);
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
            html += `<div class="vta-warn">${r.botch ? "Botch: the blood is wasted, one more blood point is lost, and the vampire takes a health level." : "Failure: the blood is spent with no effect."}</div>`;
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
        // V20: each level past the first in the same day also costs a Willpower point (V20 pdf 293 / p. 285)
        const extraWp = healA > 1 && !FXD.isDA(null) ? healA - 1 : 0;
        if (extraWp) {
            await spendWillpower(actor, extraWp);
            html += `<div class="vta-note">Each level past the first also costs a Willpower point: ${extraWp} spent (V20 p. 285).</div>`;
        }
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
            bits.push(`${cap(k)} ${newVal}${newVal > maxT ? ` (above ${maxT}: fades three turns after the spending stops)` : ""}`);
        }
        if (setting("applyChanges")) {
            await updateActor(actor, upd);
            await setFlag(actor, "quickening", cur);
            await quickeningEffect(actor, q);
        }
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
            html += await oathStep(t, actor, fd.give);
            if (!isVampire(t)) html += `<div class="vta-note">A mortal who drinks Cainite blood becomes a ghoul (V20 Dark Ages p. 399).</div>`;
        } else html += `<div class="vta-sec"><b>Gives</b> ${fd.give} blood (no target selected).</div>`;
    }
    if (mult > 1) { const given = Math.max(0, fd.give); spent = (spent - given) * mult + given; html += `<div class="vta-note">Thin Blood: every cost doubled.</div>`; }
    const ch = await changeBlood(actor, -spent);
    html += `<div class="vta-big">Blood ${ch.before} → ${ch.after}</div>`;
    if (spent > b.perTurn) html += `<div class="vta-note">More than ${b.perTurn} blood per turn: this takes ${Math.ceil(spent / b.perTurn)} turns.</div>`;
    return post(actor, `${actor.name} spends blood`, html, rolls);
}

/* ================================================================== */
/*  Blood Oath (p. 342)                                                */
/* ================================================================== */

/** WoDX Creation keeps the one record of vitae and bonds when it is on (lineage flags); this module reads and writes it. */
function creationApi() { const c = game.wodx?.creation ?? game.modules.get("wodx-creation")?.api; return c?.giveVitae ? c : null; }
/** Every bond on a thrall: {key, name, uuid|id, stage, drinks, source: "creation"|"actions"}. */
function bondsOf(thrall) {
    const out = {};
    const C = creationApi();
    if (C) for (const [id, b] of Object.entries(C.data.lineage(thrall).bonds ?? {})) {
        const st = C.rules.bondStage(b.drinks).stage;
        if (st > 0) out[`c:${id}`] = { name: b.name, id, stage: st, drinks: b.drinks, last: b.last, source: "creation" };
    }
    for (const [k, b] of Object.entries(flag(thrall, "oaths") ?? {})) {
        const id = String(b.uuid ?? "").split(".").pop();
        if (C && out[`c:${id}`]) continue;
        out[`a:${k}`] = { ...b, source: "actions", key: k };
    }
    return out;
}
async function oathStep(thrall, regnant, points = 1, { firstDouble = false } = {}) {
    const C = creationApi();
    if (C && regnant && isVampire(regnant)) {
        if (!game.user.isGM) {
            requestGM({ action: "oath", uuid: thrall.uuid, regnant: regnant.uuid, points, firstDouble });
            return `<div class="vta-sec"><b>Vitae:</b> sent to the GM to record ${esc(thrall.name)} drinking from ${esc(regnant.name)} (WoDX Creation keeps the bond).</div>`;
        }
        const r = await C.giveVitae(thrall, regnant, { points, firstDouble });
        await kx().logEvent(thrall, `Drinks ${regnant.name}'s vitae: ${r?.oath ? `already sworn to ${r.oath}` : r?.stage?.label ?? ""}.`, "oath");
        if (r?.stage?.stage >= 3) await kx().logEvent(regnant, `${thrall.name} is blood bound to ${regnant.name}.`, "oath");
        return `<div class="vta-sec"><b>Blood Oath:</b> ${esc(thrall.name)} → ${esc(regnant.name)}: ${esc(r?.oath ? `already sworn to ${r.oath}; no new bond` : r?.sameNight ? `${r.stage.label} (a second drink the same night doesn't deepen it)` : r?.stage?.label ?? "")}${r?.becameGhoul ? "; becomes a ghoul" : ""}. ${r?.stage?.stage ? R.OATH_STAGES[r.stage.stage] ?? "" : ""}</div>`;
    }
    const bonds = foundry.utils.deepClone(flag(thrall, "oaths") ?? {});
    const key = regnant.uuid.replace(/\./g, "_");
    const cur = bonds[key] ?? { name: regnant.name, uuid: regnant.uuid, stage: 0, drinks: 0 };
    if (Object.values(bonds).some(b => b.stage >= 3 && b.uuid !== regnant.uuid)) {
        cur.drinks += 1;
        bonds[key] = cur;
        await setFlag(thrall, "oaths", bonds);
        return `<div class="vta-note">${esc(thrall.name)} is already fully Oath-bound to another; no new bond forms.</div>`;
    }
    // Dark Ages Tremere (V20 Dark Ages pdf p. 64): the first drink counts as two
    const step = firstDouble && !cur.drinks ? 2 : 1;
    cur.stage = Math.min(3, cur.stage + step);
    cur.drinks += step;
    cur.lastDrink = game.time.worldTime;
    bonds[key] = cur;
    if (cur.stage >= 3) for (const k of Object.keys(bonds)) if (k !== key) delete bonds[k];
    if (setting("applyChanges")) {
        if (thrall.isOwner) { await thrall.unsetFlag(MOD, "oaths"); await thrall.setFlag(MOD, "oaths", bonds); }
        else await setFlag(thrall, "oaths", bonds);
    }
    await kx().logEvent(thrall, `Drinks ${regnant.name}'s vitae: Blood Oath stage ${cur.stage}.`, "oath");
    return `<div class="vta-sec"><b>Blood Oath:</b> ${esc(thrall.name)} → ${esc(regnant.name)}, stage ${cur.stage}. ${R.OATH_STAGES[cur.stage]}</div>`;
}

export async function bloodOath({ actor: a } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const bonds = bondsOf(actor);
    const list = Object.entries(bonds);
    const wp = willpower(actor);
    const content = `<form>
      <p>${esc(actor.name)}: Willpower ${wp.perm} (${wp.temp} left). A bond fades one step after ${R.oathDecayMonths(wp.perm)} months without drinking.</p>
      ${list.length ? `<table class="vta-table"><tr><th>Regnant</th><th>Stage</th><th>Drinks</th></tr>${list.map(([k, b]) => `<tr><td>${esc(b.name)}</td><td>${b.stage}</td><td>${b.drinks}</td></tr>`).join("")}</table>` : "<p><i>No bonds recorded.</i></p>"}
      <div class="form-group"><label>Action</label><select name="act">${opts([["resist", "Resist the bond (Willpower roll, then spend Willpower)"], ["drink", "Record a drink from the targeted Cainite"], ["fade", "Bond fades one step (months apart)"], ["clear", "Break the bond completely"]], "resist")}</select></div>
      <div class="form-group"><label>Bond</label>${list.length > 5 ? searchBox("select[name=bond]", "Search bonds…", "Search bonds") : ""}<select name="bond">${opts(list.map(([k, b]) => [k, `${b.name} (stage ${b.stage})`]), list[0]?.[0])}</select></div>
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
            const toStage = fd.act === "clear" ? 0 : Math.max(0, b.stage - 1);
            if (b.source === "creation") {
                const C = creationApi();
                const lb = { ...(C.data.lineage(actor).bonds ?? {}) };
                if (lb[b.id]) lb[b.id] = { ...lb[b.id], drinks: toStage };
                await C.lineage.setLineage(actor, { bonds: lb });
                await C.writeLineageJournal?.();
            } else {
                const nb = foundry.utils.deepClone(flag(actor, "oaths") ?? {});
                if (!toStage) delete nb[b.key]; else nb[b.key].stage = toStage;
                await actor.unsetFlag(MOD, "oaths"); await actor.setFlag(MOD, "oaths", nb);
            }
            await kx().logEvent(actor, `Bond to ${b.name} ${toStage ? `fades to stage ${toStage}` : "broken"}.`, "oath");
            return post(actor, `${actor.name}'s bond to ${esc(b.name)}`, `<div class="vta-res">${toStage ? `Fades to stage ${toStage}.` : "The bond is gone."}</div>`);
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
        // Deep Sleeper (V20 p. 485 printed): waking is 2 harder; Light Sleeper wakes at once
        const sm = TH.sleepMods(actor);
        const r = sm.light ? null : await rollPool(rd.value, Math.min(10, 8 + sm.diff), { willpower: fd.wp });
        if (r) { rolls.push(r.roll); html += rollBlock(rd.name, r, sm.diff ? ["Deep Sleeper +2 diff"] : []); }
        const res = r ? R.awakeningResult(r) : { awake: true, turns: Infinity, text: "Light Sleeper: wide awake at once, and the Road does not cap the dice today." };
        html += `<div class="vta-big ${res.awake ? "good" : "bad"}">${res.text}</div>`;
        if (res.awake) {
            if (!sm.light) html += `<div class="vta-note">While active by day, no dice pool may exceed the Road rating (${rd.value}). Enabled on the Action dialog.</div>`;
            await setFlag(actor, "daytime", { turns: res.turns === Infinity ? "scene" : res.turns, ...(sm.light ? { uncapped: true } : {}) });
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
      <p>${esc(actor.name)}: ${esc(rd.name)} ${rd.value}: torpor lasts <b>${tl.text}</b>. Blood ${b.value}.</p>
      ${t ? `<p>In ${t.voluntary ? "voluntary " : ""}torpor since ${elapsed} day(s) of game time ago (minimum ${t.voluntary ? Math.ceil(t.days / 2) : t.days} days).</p>` : ""}
      <div class="form-group"><label>Action</label><select name="act">${opts(t ? [["rise", "Attempt to rise (1 blood, Road roll diff 8)"], ["wake", "Wake without a roll (fed / Storyteller)"]] : [["enter", "Enter torpor (from injury)"], ["voluntary", "Enter torpor voluntarily"]], t ? "rise" : "enter")}</select></div>
    </form>`;
    return dialog("Torpor", content, "Go", async fd => {
        if (fd.act === "enter" || fd.act === "voluntary") {
            const vol = fd.act === "voluntary";
            await setFlag(actor, "torpor", { since: game.time.worldTime, days: tl.days, voluntary: vol, until: KR.torporUntil(game.time.worldTime, rd.value, { voluntary: vol }) });
            await statusEffect(actor, "unconscious", true); await condition(actor, "torpor", true);
            await kx().logEvent(actor, `Sinks into ${vol ? "voluntary " : ""}torpor (${tl.text.toLowerCase()}).`, "torpor");
            return post(actor, `${actor.name} sinks into torpor`, `<div class="vta-big">${tl.text}${vol ? ` (may try to rise after ${Math.ceil(tl.days / 2)} days)` : ""}.</div><div class="vta-note">No blood is lost while in torpor. Rising from injury also needs blood from an outside source.</div>`);
        }
        if (fd.act === "wake") {
            await setFlag(actor, "torpor", null); await statusEffect(actor, "unconscious", false); await condition(actor, "torpor", false);
            return post(actor, `${actor.name} rises from torpor`, `<div class="vta-note">${esc(actor.name)} rises Crippled and should heal or hunt at once.</div>`);
        }
        const minDays = t.voluntary ? Math.ceil(t.days / 2) : t.days;
        let html = "";
        if (elapsed < minDays) html += `<div class="vta-warn">Only ${elapsed} of ${minDays} days have passed (game time). Rolling anyway at the Storyteller's word.</div>`;
        if (b.value < 1) return post(actor, `${actor.name} cannot rise`, html + `<div class="vta-big bad">No blood in the body: no rising until fed.</div>`);
        await changeBlood(actor, -1);
        const r = await rollPool(rd.value, 8);
        html += rollBlock(`${rd.name} (1 blood spent)`, r);
        if (r.successes) {
            await setFlag(actor, "torpor", null); await statusEffect(actor, "unconscious", false); await condition(actor, "torpor", false);
            await kx().logEvent(actor, "Rises from torpor.", "torpor");
            html += `<div class="vta-big good">${esc(actor.name)} rises: Crippled; heal or hunt immediately.</div>`;
        } else html += `<div class="vta-big bad">${esc(actor.name)} sleeps on. Wait a night, spend another blood point, and try again.</div>`;
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
export async function endScene({ actors, fromChronicle = false } = {}) {
    const list = actors ?? (canvas.tokens.controlled.length ? canvas.tokens.controlled.map(t => t.actor) : game.actors.filter(a => a.type !== "Group" && a.hasPlayerOwner && a.isOwner));
    if (!fromChronicle && game.user.isGM) await wx().newScene({ quiet: true }); // Passions can be tapped again; Hysteria ends
    const lines = [];
    for (const actor of list) {
        if (!actor?.isOwner) continue;
        // WoDX timed effects of the scene end first (Quickening takes itself back through its reverter)
        if (!fromChronicle) await chronicle()?.timed?.endFor?.(actor, { kind: "scene", why: "End of scene" });
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
    if (fromChronicle && !lines.length) return null;
    return post(null, "End of scene", lines.length ? `<ul>${lines.join("")}</ul>` : "<p>Nothing to clear.</p>");
}

/** Quickening as a WoDX timed effect: it lasts the scene and takes itself back when the scene ends (p. 340). */
async function quickeningEffect(actor, added) {
    const api = chronicle();
    if (!api?.applyTimed || !actor.isOwner) return null;
    const parts = Object.entries(added).filter(([, n]) => n).map(([k, n]) => `${cap(k)} +${n}`);
    if (!parts.length) return null;
    return api.applyTimed(actor, { name: `Quickening: ${parts.join(", ")}`, img: "icons/svg/regen.svg",
        description: "Blood raises Physical Attributes for the scene.", duration: { kind: "scene" },
        revert: { key: "wodx-actions.quickening", data: { added } }, source: "V20 Dark Ages p. 340" });
}

/** Take back one Quickening effect: its own points, and only those still recorded on the sheet. */
async function revertQuickening(actor, { added = {} } = {}) {
    const cur = { ...(flag(actor, "quickening") ?? {}) };
    const upd = {};
    for (const [k, n0] of Object.entries(added)) {
        const n = Math.min(num(n0), num(cur[k]));
        const at = actor.system.attributes?.[k];
        if (!n || !at) continue;
        upd[`system.attributes.${k}.bonus`] = Math.max(0, num(at.bonus) - n);
        upd[`system.attributes.${k}.total`] = num(at.total ?? at.value) - n;
        cur[k] = num(cur[k]) - n;
        if (cur[k] <= 0) delete cur[k];
    }
    if (Object.keys(upd).length) await actor.update(upd);
    await actor.unsetFlag(MOD, "quickening");
    if (Object.keys(cur).length) await actor.setFlag(MOD, "quickening", cur);
}

/** Frenzy, Rötschreck and torpor show as WoDX condition statuses too. */
async function condition(actor, id, active) {
    try { if (actor?.isOwner) await chronicle()?.conditions?.setCondition?.(actor, id, active); }
    catch (e) { console.warn("WoDX | condition", e); }
}

/** A new night: rising costs one blood, one Willpower returns, aggravated wounds rested on heal. */
export async function newNight({ actors } = {}) {
    if (!game.user.isGM && !actors) return ui.notifications.warn("New Night is for the GM (or pass your own actors).");
    await endScene({ actors });
    const list = actors ?? game.actors.filter(a => a.type !== "Group" && (a.hasPlayerOwner || canvas.tokens.placeables.some(t => t.actor?.id === a.id)));
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
        // Nagaraja (V20 printed p. 407): a night without flesh costs one more die off every Physical pool
        if (vamp && feedingRule(actor)?.flesh) {
            const ns = KF.nightPassed(flag(actor, "nagaraja") ?? {});
            await actor.setFlag(MOD, "nagaraja", ns);
            await nagarajaPenalty(actor, ns.debt);
            if (ns.debt) bits.push(`no flesh: ${ns.debt} di${ns.debt === 1 ? "e" : "ce"} off Physical pools`);
        }
        if (!inTorpor) {
            const w = willpower(actor);
            const to = KR.willpowerAfter(setting("willpowerRecovery"), w.temp, w.perm, "night");
            if (to > w.temp) { upd["system.advantages.willpower.temporary"] = to; bits.push(`Willpower ${w.temp} → ${to}`); }
        }
        const agg = flag(actor, "aggHealing");
        if (agg) {
            const d = healthTrack(actor).damage;
            const healed = Math.min(agg, d.aggravated);
            Object.assign(upd, healthUpdate(actor, { ...d, aggravated: d.aggravated - healed }));
            bits.push(`${healed} aggravated level${healed === 1 ? "" : "s"} heal`);
            await actor.unsetFlag(MOD, "aggHealing");
        }
        if (actor.system?.conditions?.isfrenzy) { upd["system.conditions.isfrenzy"] = false; await actor.unsetFlag(MOD, "frenzyType"); await condition(actor, "frenzy", false); await condition(actor, "rotschreck", false); bits.push("frenzy over"); }
        if (Object.keys(upd).length) await actor.update(upd);
        if (vamp) {
            const rd = road(actor).value;
            bits.push(rd >= 7 ? "rises just before sunset" : rd <= 4 ? "rises up to an hour after sunset" : "rises at sunset");
        }
        if (inTorpor) bits.push("in torpor");
        if (bits.length) lines.push(`<li><b>${esc(actor.name)}</b>: ${bits.join(", ")}</li>`);
    }
    return post(null, "A new night", `<ul>${lines.join("")}</ul>${setting("willpowerRecovery") === "off" ? "" : `<p class="wodx-quiet">Willpower: ${setting("willpowerRecovery") === "night" ? "one a night (VtDA20 printed p. 340)" : "all at the end of a story"}.</p>`}`);
}

/** The end of a story: Willpower returns in full (unless the setting is off). */
export async function endStory({ actors } = {}) {
    if (!game.user.isGM) return ui.notifications.warn("End of story is for the GM.");
    const list = actors ?? game.actors.filter(a => a.type !== "Group" && a.hasPlayerOwner);
    const lines = [];
    for (const actor of list) {
        const w = willpower(actor);
        const to = KR.willpowerAfter(setting("willpowerRecovery"), w.temp, w.perm, "story");
        if (to > w.temp) { await actor.update({ "system.advantages.willpower.temporary": to }); lines.push(`<li><b>${esc(actor.name)}</b>: Willpower ${w.temp} → ${to}</li>`); }
        const c = await hx().newStory(actor);
        if (c) lines.push(`<li>${esc(c)} (a new story, Dark Ages: Inquisitor p. 160)</li>`);
        if (actor.type === "Hunter" && HX.lineNow() === "reckoning") {
            const ri = rx().info(actor), start = ri.creedDef?.conviction;
            if (start && ri.conviction < start) { await rx().setConviction(actor, start); lines.push(`<li><b>${esc(actor.name)}</b>: Conviction ${ri.conviction} → ${start} (Hunter: The Reckoning p. 138)</li>`); }
        }
    }
    await game.settings.set(MOD, "storyId", foundry.utils.randomID());
    return post(null, "The end of a story", lines.length ? `<ul>${lines.join("")}</ul>` : "<p>No Willpower to restore.</p>");
}

/* ================================================================== */
/*  Hazards: sunlight, fire, falling (p. 355-360)                      */
/* ================================================================== */

export async function hazard({ actor: a, kind = "sun", feet = 30 } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const fort = discipline(actor, "Fortitude");
    const content = `<form>
      <p>${esc(actor.name)}: ${profile(actor)}, Fortitude ${fort}, Stamina ${attr(actor, "stamina")}</p>
      <div class="form-group"><label>Hazard</label><select name="kind">${opts([["sun", "Sunlight"], ["fire", "Fire"], ["fall", "Falling"]], kind)}</select></div>
      <div class="vta-k vta-sun"><div class="form-group"><label>Light</label><select name="light" data-fixed>${opts(Object.entries(R.SUNLIGHT_INTENSITY).map(([k, x]) => [k, `${x.label} (soak ${x.diff})`]), "direct")}</select></div>
        <div class="form-group"><label>Exposure</label><select name="exposure" data-fixed>${opts(Object.entries(R.SUNLIGHT_EXPOSURE).map(([k, x]) => [k, `${k}/turn: ${x}`]), 3)}</select></div></div>
      <div class="vta-k vta-fire"><div class="form-group"><label>Heat</label><select name="heat" data-fixed>${opts(Object.entries(R.FIRE_HEAT).map(([k, x]) => [k, `${x.label} (soak ${x.diff})`]), "torch")}</select></div>
        <div class="form-group"><label>Size</label><select name="size">${opts(Object.entries(R.FIRE_SIZE).map(([k, x]) => [k, `${k}/turn: ${x}`]), 1)}</select></div></div>
      <div class="vta-k vta-fall"><div class="form-group"><label>Distance (feet)</label><input type="number" name="feet" value="${Math.max(0, Number(feet) || 0)}"/></div>
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
            if (res?.after) html += `<div class="vta-res">Now ${healthText(actor, res.after)}${res.condition?.text ? `: <b>${res.condition.text}</b>` : ""}</div>`;
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
        html += `<div class="vta-res">${c.successes ? "Control holds through the rapture." : "Overwhelmed by the Amaranth's ecstasy: control is lost."}</div>`;
        const vg = generationOf(victim), ag = generationOf(actor);
        if (vg < ag) {
            const drop = ag - vg >= 5 ? "one (or more, Storyteller's call)" : "one";
            if (setting("applyChanges")) await updateActor(actor, { "system.generation": num(actor.system.generation) - 1 });
            html += `<div class="vta-big good">Generation lowers by ${drop}: now ${ag - 1}.</div><div class="vta-note">Elder vitae may also raise Disciplines a dot or more for a scene.</div>`;
        } else html += `<div class="vta-note">The victim's blood was no stronger: no change of Generation.</div>`;
        html += `<div class="vta-note">Black veins mark the diablerist's aura for ${Math.max(1, ag - vg)} year(s). Most Roads forbid murder: Road loss is automatic, not rolled.</div>`;
        await kx().logEvent(actor, `Diablerie: consumes ${victim.name}'s soul${vg < ag ? `; Generation ${ag} → ${ag - 1}` : ""}.`, "diablerie");
        await kx().logEvent(victim, `Final Death: diablerized by ${actor.name}.`, "diablerie");
        const sp = await kx().sinPrompt(actor, "diablerie", "Diablerie");
        if (sp?.html) html += sp.html;
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

export async function seduction({ actor: a, target: t, onDone = null, shift = 0 } = {}) {
    const actor = needActor(a);
    if (!actor) return;
    const target = targetActor(t);
    // B3212: never with anyone under 18, in any era (WoDX Chronicle's age floor)
    if (target) {
        const age = game.modules.get("wodx-chronicle")?.api?.age?.romance?.(actor, target) ?? { ok: false, why: "The age check is not available (a WoDX Chronicle with the age floor is needed)." };
        if (!age.ok) { ui.notifications.warn(age.why); return null; }
    }
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
            ["Witty repartee", "wits", "subterfuge", fd.int + 3, "The subject breaks off but may be receptive later.", "The subject gains a dangerous insight about the speaker."],
            ["Intimate conversation", "charisma", "empathy", fd.per + 3, "The subject breaks off but may be receptive later.", "A drink in the face."]
        ];
        let carry = 0, html = "";
        const rolls = [];
        for (const [name, at, ab, diff, fail, botch] of steps) {
            const dice = Math.max(0, attr(actor, at) + (findAbility(actor, ab)?.value ?? 0) + carry + wpen);
            const r = await rollPool(dice, R.clampDifficulty(diff + aura + (Number(shift) || 0)));
            rolls.push(r.roll);
            html += rollBlock(`${name}: ${cap(at)} + ${cap(ab)}`, r, [`difficulty ${diff}${aura ? ` ${aura > 0 ? "+" : ""}${aura} aura` : ""}${shift ? ` ${shift > 0 ? "+" : ""}${shift} how they regard ${actor.name}` : ""}`, carry ? `+${carry} carried` : ""].filter(Boolean));
            if (!r.successes) {
                html += `<div class="vta-big bad">${r.botch ? botch : fail}</div>`;
                const m = await post(actor, `${actor.name}: seduction`, html, rolls);
                try { await onDone?.(r.botch ? "botch" : "lose"); } catch (e) { console.error(e); }
                return m;
            }
            carry = Math.max(0, r.successes - 1);
        }
        html += `<div class="vta-big good">Enamored: the subject agrees to go somewhere private.</div>`;
        const m = await post(actor, `${actor.name}: seduction`, html, rolls);
        try { await onDone?.("win"); } catch (e) { console.error(e); }
        return m;
    });
}

/* ================================================================== */
/*  Launcher                                                           */
/* ================================================================== */

const MENU = [
    ["action", "fa-dice-d10", "Any roll / dramatic system"], ["quickCheck", "fa-search", "Common checks"], ["hunt", "fa-paw", "Hunt"], ["feed", "fa-tint", "Feed on target"],
    ["spendBlood", "fa-heartbeat", "Spend blood"], ["frenzy", "fa-fire-alt", "Frenzy"], ["rotschreck", "fa-running", "Rötschreck"],
    ["endFrenzy", "fa-hand-paper", "End frenzy"], ["sin", "fa-balance-scale", "Sin / degeneration"], ["seduction", "fa-heart", "Seduction"],
    ["bloodOath", "fa-link", "Blood Oath"], ["daytime", "fa-sun", "Awaken by day"], ["hazard", "fa-burn", "Sun / fire / fall"],
    ["torpor", "fa-bed", "Torpor"], ["diablerie", "fa-skull", "Diablerie"], ["endScene", "fa-flag-checkered", "End scene"],
    ["newNight", "fa-moon", "New night (GM)"], ["useDiscipline", "fa-hand-sparkles", "Use a Discipline"], ["setRoad", "fa-road", "Road"],
    ["downtime", "fa-hourglass-half", "Downtime"], ["healing", "fa-band-aid", "Healing"], ["boons", "fa-handshake", "Prestation (GM)"],
    ["masquerade", "fa-mask", "Masquerade (GM)"], ["endStory", "fa-book", "End of story (GM)"], ["sunAndHaven", "fa-sun", "Sun and haven"], ["skyAndSun", "fa-cloud-sun", "Sky and sun (GM)"]
];

/** A preset with no note of its own is described by its roll, from the label's brackets. */
const presetHint = label => { const f = /\(([^)]+)\)/.exec(label ?? "")?.[1]; return f ? `Roll ${f}` : `Roll ${label ?? ""}`.trim(); };

let PMX = null;
function pm() {
    return PMX ??= PM.build({
        post, rollPool, rollBlock, resultLine, diceHtml, API, action, updateActor, willpower, attr, findAbility, setting,
        spendWillpower, dialog, notify: m => ui.notifications.warn(m), isDA: a => MXD.isDA(a), isDAFae: a => FXD.isDA(a), isKotE: a => KXD.isKotE(a), isOrpheus: a => OXD.isOrpheus(a),
        // The menu's search also finds every common check and dramatic system, so nothing is a page away
        searchExtras: () => [
            ...CK.CHECKS.map(c => ({ spec: `check:${c.key}`, label: c.label, desc: `${c.note} (${c.ref})`, icon: "fa-search" })),
            ...Object.entries(PRESETS).filter(([k]) => k && !k.startsWith("check-")).map(([k, p]) => ({ spec: `preset:${k}`, label: p.label, desc: p.note || presetHint(p.label), icon: "fa-dice-d10" }))
        ]
    });
}

let MXE = null;
/** Dark Ages mages (3.7.0, Phase 6f). */
function mx() {
    return MXE ??= MXD.build({ post, rollPool, rollBlock, dialog, setFlag, attr, background, findAbility, willpower, spendWillpower, notify: m => ui.notifications.warn(m) });
}

let FXE = null;
/** Dark Ages fae (3.8.0, Phase 6g). */
function fx() {
    return FXE ??= FXD.build({ post, rollPool, rollBlock, dialog, setFlag, attr, background, findAbility, spendWillpower, notify: m => ui.notifications.warn(m),
        traits: a => [...ATTRS.map(k => ({ key: k, label: game.i18n.localize(a.system?.attributes?.[k]?.label || k) || k, value: attr(a, k) })),
            ...abilityList(a).map(x => ({ key: x.key, label: x.name, value: x.value }))] });
}

let SOE = null;
/** "With this person" (3.20.0): dealing with one NPC face to face. */
function sox() {
    return SOE ??= SOD.build({ R, PRESETS, pickPool, readPool, woundPenalty, setting, road, rollPool, rollBlock, post, opponentPool, esc, dialog, opts,
        willpower, spendWillpower, seduction, menu, resolveActor, feed, kindOf: a => P.detectProfile(a) });
}

let CXE = null;
/** Changelings of the later eras (3.9.0, Phase 6h). */
function cx() {
    return CXE ??= CXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, background, spendWillpower, notify: m => ui.notifications.warn(m), crowdNear, crowdRules });
}

let DXE = null;
/** The fallen (3.10.0, Phase 6i). */
function dx() {
    return DXE ??= DXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, attr, findAbility, spendWillpower, healthTrack, setDamage, applyDamage, notify: m => ui.notifications.warn(m),
        revealed: (a, o) => kx().revealed(a, o),
        traits: a => [...ATTRS.map(k => ({ key: k, label: game.i18n.localize(a.system?.attributes?.[k]?.label || k) || k, value: attr(a, k) })),
            ...abilityList(a).map(x => ({ key: x.key, label: x.name, value: x.value }))] });
}

let UXE = null;
/** The Reborn (3.10.0, Phase 6k). */
function ux() {
    return UXE ??= UXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, attr, findAbility, background, spendWillpower, healthTrack, setDamage, applyDamage, notify: m => ui.notifications.warn(m),
        traits: a => [...ATTRS.map(k => ({ key: k, label: game.i18n.localize(a.system?.attributes?.[k]?.label || k) || k, value: attr(a, k) })),
            ...abilityList(a).map(x => ({ key: x.key, label: x.name, value: x.value }))] });
}

let OXE = null;
/** The crucible (3.10.0, Phase 6l). */
function ox() {
    return OXE ??= OXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, attr, findAbility, spendWillpower, healthTrack, setDamage, applyDamage, notify: m => ui.notifications.warn(m),
        traits: a => [...ATTRS.map(k => ({ key: k, label: game.i18n.localize(a.system?.attributes?.[k]?.label || k) || k, value: attr(a, k) })),
            ...abilityList(a).map(x => ({ key: x.key, label: x.name, value: x.value }))] });
}

let ZXE = null;
/** Mages of the later eras (3.11.0, Phase 6m). */
function zx() {
    return ZXE ??= ZXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, spendWillpower, notify: m => ui.notifications.warn(m),
        observersOf: a => { const t = a?.getActiveTokens?.()[0]; return t ? kx().observersOf(t, { secret: "mage", exclude: [a.id] }) : null; }, revealed: (a, o) => kx().revealed(a, o),
        quiet: () => qtx() });
}
let SFE = null;
/** Soulforging (B3553). */
function sfx() {
    return SFE ??= SFX.build({ post, dialog, setFlag, attr, findAbility, notify: m => ui.notifications.warn(m) });
}
let BLE = null;
/** Banality from everyday life (B3555). */
function blx() {
    return BLE ??= BLX.build({ dialog, setFlag, notify: m => ui.notifications.warn(m), banality: (a, k) => cx().banality(a, k), seemingOf: a => cx().info(a).seeming });
}
let QTE = null;
/** The Quiet as a state (B3550). */
function qtx() {
    return QTE ??= QX.build({ post, rollPool, rollBlock, dialog, setFlag, spendWillpower, notify: m => ui.notifications.warn(m),
        info: a => zx().info(a), setParadox: (a, v) => zx().setParadox(a, v), age: () => zx().age() });
}

let QXE = null;
/** The Kuei-jin (3.10.0, Phase 6j). */
function qx() {
    return QXE ??= KXD.build({ post, rollPool, rollBlock, dialog, setFlag, updateActor, attr, findAbility, background, spendWillpower, healthTrack, setDamage, applyDamage, notify: m => ui.notifications.warn(m) });
}

let GXE = null;
/** The Werewolf and Fera engine (Phase 6b). */
function gx() {
    return GXE ??= GX.build({ post, rollPool, rollBlock, dialog, updateActor, attr, findAbility, setting, spendWillpower,
        notify: m => ui.notifications.warn(m) });
}
/** Find the actor, and dress the dialogs it opens in its line's look (6e) while the action runs. */
const withActor = f => async (o = {}) => {
    const a = needActor(o.actor);
    if (!a) return null;
    const prev = P.setLine(P.detectProfile(a));
    LEDGER.delete(a.id); // "what changed" counts from here
    try { return await f(a, o); } finally { P.setLine(prev); }
};

let SXE = null;
/** The sunlight system (3.3.0). */
function sx() {
    return SXE ??= SX.build({ post, rollPool, rollBlock, dialog, setting, setFlag, attr, discipline, applyDamage, healthText,
        logEvent: (a, t, k) => kx().logEvent(a, t, k), notify: m => ui.notifications.warn(m),
        clockActors: () => { const on = new Set((game.scenes?.active?.tokens ?? []).map(t => t.actor).filter(Boolean)); return [...new Set([...on, ...game.actors.filter(a => a.type !== "Group" && a.hasPlayerOwner)])]; } });
}

let WXE = null;
/**
 * Mortals in sight of a character, as the crowd rules see them (3.52.0, B2220 to B2226): passers-by of WoDX NPC carry a
 * feeling and a spark; other mortals carry none, and the Storyteller says. used: the crowdUse flag on the mortal's
 * token actor (who has drawn on them). Animals are never in it.
 */
function crowdNear(actor) {
    const tok = actor?.getActiveTokens?.()[0];
    if (!tok) return [];
    const pb = game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc")?.api?.passersby : null;
    return kx().witnessesOf(tok, { profiles: ["mortal"], exclude: [actor.id] }).map(t => {
        const mind = pb?.mindOf?.(t.document) ?? null;
        return { tok: t, id: t.document.id, uuid: t.actor.uuid, name: t.document.name ?? t.actor.name, passerby: !!mind, feeling: mind?.feeling ?? null,
            spark: mind?.spark ?? null, used: t.actor.getFlag?.(MOD, "crowdUse") ?? {} };
    });
}
/** The crowd rules from WoDX NPC, or null when it is off. */
const crowdRules = () => (game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc")?.api?.passersby?.rules ?? null : null);

/** The wraith line (3.4.0). */
function wx() {
    return WXE ??= WX.build({ post, rollPool, rollBlock, dialog, updateActor, setFlag, attr, findAbility, abilityList, setting, spendWillpower,
        applyDamage, setDamage, logEvent: (a, t, k) => kx().logEvent(a, t, k), notify: m => ui.notifications.warn(m), crowdNear, crowdRules });
}
let HXE = null;
/** Hunters, True Faith and Numina (3.4.0). */
function hx() {
    return HXE ??= HX.build({ post, rollPool, rollBlock, dialog, updateActor, setFlag, attr, findAbility, setting, spendWillpower, virtues, background, applyDamage,
        logEvent: (a, t, k) => kx().logEvent(a, t, k), notify: m => ui.notifications.warn(m) });
}

let VXE = null;
/** The inner voice (3.5.0, Phase 6d). */
function vx() {
    return VXE ??= VX.build({ post, dialog, setFlag, virtues, notify: m => ui.notifications.warn(m), api: () => API, wraithInfo: a => WX.info(a),
        inquisitor: a => (hx().isInquisitor(a) ? hx().inq(a) : null) });
}

let RXE = null;
/** The imbued (3.4.0). */
function rx() {
    return RXE ??= RX.build({ post, rollPool, rollBlock, dialog, updateActor, setFlag, attr, findAbility, line: () => HX.lineNow(),
        logEvent: (a, t, k) => kx().logEvent(a, t, k), notify: m => ui.notifications.warn(m) });
}
/** Hunters by era (B42): the imbued from 1999, inquisitors in the Dark Ages, mortal hunters (Hunters Hunted II) between. */
function byLine(reckoning, inquisitor, hh2) {
    return a => { const l = HX.lineNow(); return l === "reckoning" ? reckoning(a) : l === "inquisitor" ? inquisitor(a) : hh2(a); };
}
const hh2Note = () => ui.notifications.info("Hunters Hunted II hunters are mortals: use True Faith, Numina and the Action dialog (Virtue rolls are Courage, Conscience and Self-Control).");

let KXE = null;
/** The Kindred additions and automatic prompts (3.2.0). */
function kx() {
    return KXE ??= KX.build({ post, rollPool, rollBlock, dialog, updateActor, setFlag, attr, findAbility, abilityList, setting, spendWillpower,
        changeBlood, blood, background, isVampire, healthTrack, setDamage, healthText, statusEffect, condition, requestGM, R,
        api: () => API, notify: m => ui.notifications.warn(m) });
}

/** The launcher: the buttons follow the actor's profile (Kindred, ghoul, mortal, Garou, mage, changeling, wraith...). */
export async function menu({ actor: a } = {}) {
    const actor = a?.actor ?? a ?? resolveActor();
    if (!actor) return ui.notifications.warn("WoDX Actions: select a token or assign a character first.");
    const legacy = !setting("profileMenu");
    const kind = P.detectProfile(actor);
    let recentAll = {};
    try { recentAll = foundry.utils.deepClone(setting("menuRecent") ?? {}); } catch (e) { recentAll = {}; }
    // 3.43.0: the character's own row, pinned and lately used, kept on the character for whoever owns it
    const own = !!actor.isOwner;
    const quick = TR.quickOf(actor.getFlag?.(MOD, "quick"));
    const recent = own && quick.recent.length ? quick.recent : (recentAll[kind] ?? []);
    let html;
    if (legacy) html = `<div class="vta-menu">${MENU.map(([k, i, l]) => `<button type="button" data-k="api:${k}"><i class="fas ${i}"></i> ${l}</button>`).join("")}</div>`;
    else html = (await pm().menuFor(actor, { recent, pinned: quick.pinned, isGM: game.user.isGM, beginner: beginner() })).html;
    const prev = P.setLine(kind);
    let r;
    try {
        r = await P.ask({
            title: `WoDX Actions: ${KXD.isKotE(actor) ? "Kuei-jin (Kindred of the East)" : OXD.isOrpheus(actor) ? "Orpheus (a spook)" : P.profileLabel(kind)}`, content: html, width: legacy || !TR.LINE_LOOK.includes(kind) ? 460 : 560, classes: ["vta-dialog", "wodx-menu-dialog"],
            buttons: [{ id: "close", label: "Close", icon: "fas fa-times" }],
            onRender: (root, close) => {
                const use = async b => {
                    const spec = b.dataset.k;
                    close();
                    recentAll[kind] = TR.pushRecent(recentAll[kind], spec);
                    game.settings.set(MOD, "menuRecent", recentAll).catch(() => {});
                    if (own) actor.setFlag(MOD, "quick", { ...quick, recent: TR.pushRecent(quick.recent, spec, TR.QUICK_RECENT) }).catch(e => console.warn("WoDX | quick row", e));
                    const was = P.setLine(kind);
                    LEDGER.delete(actor.id);
                    try { await pm().run(spec, actor); } catch (e) { console.error(e); ui.notifications.error(`WoDX Actions: ${e.message}`); } finally { P.setLine(was); }
                };
                root.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", () => use(b)));
                // Right-click (or Alt+P on the focused button) pins an action to the character's row, or unpins it
                const pin = async b => {
                    if (!own) return ui.notifications.info("Only the character's owner can pin actions.");
                    const t = TR.togglePin(quick.pinned, b.dataset.k);
                    if (t.full) return ui.notifications.info(`${actor.name} already has ${TR.QUICK_PINS} pinned actions: unpin one first.`);
                    await actor.setFlag(MOD, "quick", { ...quick, pinned: t.pinned });
                    close();
                    menu({ actor });
                };
                root.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("contextmenu", ev => { ev.preventDefault(); pin(b); }));
                root.addEventListener("keydown", ev => {
                    const b = ev.target?.closest?.("button[data-k]");
                    if (b && ev.altKey && (ev.key === "p" || ev.key === "P")) { ev.preventDefault(); pin(b); }
                });
                // 3.62.0 (B2817): in Beginner view the groups fold behind Every action; the search still finds them all
                const tog = root.querySelector("button.vta-all-toggle");
                tog?.addEventListener("click", () => {
                    const wrap = root.querySelector(".wodx-menu2");
                    const open = wrap?.classList.toggle("vta-folded") === false;
                    tog.setAttribute("aria-expanded", String(open));
                });
                root.querySelector("button.vta-kind")?.addEventListener("click", async () => {
                    close();
                    if (await P.pickProfile(actor)) menu({ actor });
                });
                menuKeys(root, use);
            }
        });
    } finally { P.setLine(prev); }
    return r;
}

/**
 * The intent menu's keys (6e): typing goes to the search box; arrow keys move between the buttons shown (up and down
 * by row); Enter in the search box uses the first button found. The hint line follows the hover and the focus.
 */
function menuKeys(root, use) {
    const wrap = root.querySelector(".wodx-menu2");
    if (!wrap) return;
    const find = wrap.querySelector(".vta-menu-find");
    const hint = wrap.querySelector(".vta-hintbar");
    // The extra results (common checks, dramatic systems) show only while searching
    find?.addEventListener("input", () => wrap.classList.toggle("is-searching", !!find.value.trim()));
    const shown = () => [...wrap.querySelectorAll("button[data-k]")].filter(b => b.offsetParent !== null && b.style.display !== "none");
    const say = b => { if (hint) hint.innerHTML = b ? `<b>${esc(b.textContent.trim())}</b>${b.dataset.hint ? `: ${esc(b.dataset.hint)}` : ""}` : esc(hint.dataset.default ?? ""); };
    wrap.addEventListener("mouseover", ev => { const b = ev.target.closest?.("button[data-k]"); if (b) say(b); });
    wrap.addEventListener("focusin", ev => { const b = ev.target.closest?.("button[data-k]"); say(b ?? null); });
    wrap.addEventListener("mouseleave", () => say(wrap.querySelector("button[data-k]:focus")));
    wrap.addEventListener("keydown", ev => {
        const list = shown();
        if (ev.target === find) {
            if (ev.key === "Enter" && list.length) { ev.preventDefault(); use(list[0]); }
            else if (ev.key === "ArrowDown" && list.length) { ev.preventDefault(); list[0].focus(); }
            return;
        }
        const b = ev.target.closest?.("button[data-k]");
        if (!b) return;
        const i = list.indexOf(b);
        const r0 = b.getBoundingClientRect();
        const byRow = dir => {
            // The nearest button in the next row up or down, by its middle
            const cands = list.filter(x => { const r = x.getBoundingClientRect(); return dir > 0 ? r.top > r0.bottom - 2 : r.bottom < r0.top + 2; });
            if (!cands.length) return null;
            const rowTop = dir > 0 ? Math.min(...cands.map(x => x.getBoundingClientRect().top)) : Math.max(...cands.map(x => x.getBoundingClientRect().top));
            const row = cands.filter(x => Math.abs(x.getBoundingClientRect().top - rowTop) < 4);
            const mid = r0.left + r0.width / 2;
            return row.sort((p, q) => Math.abs(p.getBoundingClientRect().left + p.offsetWidth / 2 - mid) - Math.abs(q.getBoundingClientRect().left + q.offsetWidth / 2 - mid))[0];
        };
        let to = null;
        if (ev.key === "ArrowRight") to = list[i + 1];
        else if (ev.key === "ArrowLeft") to = list[i - 1];
        else if (ev.key === "ArrowDown") to = byRow(1);
        else if (ev.key === "ArrowUp") to = byRow(-1) ?? find;
        else if (ev.key === "Home") to = list[0];
        else if (ev.key === "End") to = list[list.length - 1];
        else if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && /\S/.test(ev.key) && find) {
            // Typing anywhere in the menu searches
            ev.preventDefault();
            find.focus();
            find.value += ev.key;
            find.dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }
        if (to) { ev.preventDefault(); to.focus(); }
    });
    setTimeout(() => find?.focus(), 50);
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
        case "feedUndo": return feedUndo(msg, d);
        case "damage": { await markUsed(msg, "damage"); const r = await applyDamage(actor, d.type, d.levels); return r?.after ? post(actor, `${actor.name} takes damage`, `<div class="vta-res">${d.levels} ${d.type}: ${healthText(actor, r.after)}</div>`) : null; }
    }
}
function bindCard(msg, el) {
    if (!el || el.dataset?.vtaBound) return;
    if (el.dataset) el.dataset.vtaBound = "1";
    el.querySelectorAll?.("button.vta-btn[data-garou]").forEach(b => b.addEventListener("click", async ev => {
        ev.preventDefault();
        if ((msg.getFlag(MOD, "used") || []).includes("*")) return;
        const r = await gx().onChatButton(b);
        if (r !== undefined && r !== null && r !== false) await markUsed(msg);
    }));
    el.querySelectorAll?.("button.vta-btn[data-kx]").forEach(b => b.addEventListener("click", async ev => {
        ev.preventDefault();
        const used = msg.getFlag(MOD, "usedKx") || [];
        const key = `${b.dataset.kx}|${b.dataset.actor}|${b.dataset.arg ?? ""}`;
        if (used.includes(key)) return ui.notifications.info("Already done.");
        const r = await kx().onChatButton(b);
        if (r !== undefined && r !== null && r !== false && (msg.isOwner || game.user.isGM)) {
            await msg.update({ [`flags.${MOD}.usedKx`]: [...used, key] });
        }
    }));
    el.querySelectorAll?.("button.vta-btn[data-sx]").forEach(b => b.addEventListener("click", async ev => {
        ev.preventDefault();
        const used = msg.getFlag(MOD, "usedKx") || [];
        const key = `sx|${b.dataset.sx}|${b.dataset.actor}|${b.dataset.arg ?? ""}`;
        if (used.includes(key)) return ui.notifications.info("Already done.");
        const r = await sx().onChatButton(b);
        if (r && (msg.isOwner || game.user.isGM)) await msg.update({ [`flags.${MOD}.usedKx`]: [...used, key] });
    }));
    el.querySelectorAll?.("button.vta-btn[data-wx]").forEach(b => b.addEventListener("click", async ev => {
        ev.preventDefault();
        const used = msg.getFlag(MOD, "usedKx") || [];
        const key = `wx|${b.dataset.wx}|${b.dataset.actor}|${b.dataset.arg ?? ""}`;
        if (used.includes(key)) return ui.notifications.info("Already done.");
        const r = await wx().onChatButton(b);
        if (r && (msg.isOwner || game.user.isGM)) await msg.update({ [`flags.${MOD}.usedKx`]: [...used, key] });
    }));
    el.querySelectorAll?.("button.vta-btn[data-vx]").forEach(b => b.addEventListener("click", async ev => {
        ev.preventDefault();
        await vx().onChatButton(b);
    }));
    el.querySelectorAll?.("button.vta-btn[data-mx]").forEach(b => {
        if (b.hasAttribute("data-gm") && !game.user.isGM) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); mx().onButton(msg, b.dataset.mx).catch(e => console.error("WoDX |", e)); });
    });
    el.querySelectorAll?.("button.vta-btn[data-fx]").forEach(b => {
        if (b.hasAttribute("data-gm") && !game.user.isGM) { b.remove(); return; }
        b.addEventListener("click", ev => { ev.preventDefault(); fx().onButton(msg, b.dataset.fx).catch(e => console.error("WoDX |", e)); });
    });
    el.querySelectorAll?.("button.vta-btn:not([data-garou]):not([data-kx]):not([data-sx]):not([data-wx]):not([data-vx]):not([data-mx]):not([data-fx])").forEach(b => b.addEventListener("click", ev => { ev.preventDefault(); onButton(msg, b.dataset.action); }));
}

/* ================================================================== */
/*  Macros & hooks                                                     */
/* ================================================================== */

const MACROS = [
    ["WoDX: Actor Type", "icons/svg/mystery-man.svg", "const a = canvas.tokens.controlled[0]?.actor ?? game.user.character; if (a) game.wodxActions.pickKind(a); else ui.notifications.warn('Select a token first.');"],
    ["WoDX: Actions Menu", "icons/svg/book.svg", "game.wodxActions.menu();"],
    ["WoDX: Roll Action", "icons/svg/d10-grey.svg", "game.wodxActions.action();"],
    ["WoDX: Hunt", "icons/svg/blood.svg", "game.wodxActions.hunt();"],
    ["WoDX: Spend Blood", "icons/svg/regen.svg", "game.wodxActions.spendBlood();"],
    ["WoDX: Frenzy", "icons/svg/terror.svg", "game.wodxActions.frenzy();"],
    ["WoDX: Rötschreck", "icons/svg/fire.svg", "game.wodxActions.rotschreck();"],
    ["WoDX: New Night", "icons/svg/sun.svg", "game.wodxActions.newNight();"]
];
async function createMacros() {
    if (!game.user.isGM || !setting("createMacros")) return;
    for (const [name, img, command] of MACROS) {
        if (game.macros.find(m => m.name === name)) continue;
        await Macro.create({ name, type: "script", img, command, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
    }
}

const API = { menu, action, quickCheck, feedUndo: msg => feedUndo(msg, msg?.flags?.[MOD] ?? {}), feedingRule, feedingRules: KF, checks: CK, withPerson: o => sox().withPerson(o), social: (actor, token, key, fd) => sox().social(actor, token, key, fd), lift: (actor, token, key, fd) => sox().lift(actor, token, key, fd), trade: (actor, token, key, fd) => sox().trade(actor, token, key, fd), tradeLists: { wares: (npc, shop = null) => sox().tradeX().wares(npc, shop), offers: (actor, shop = null) => sox().tradeX().offers(actor, shop) }, tradeRules: TRR, socialRules: SOR, hunt, feed, spendBlood, frenzy, rotschreck, endFrenzy, sin, daytime, torpor, hazard,
    bloodOath, diablerie, seduction, newNight, endScene, applyDamage, rules: R, presets: PRESETS,
    getKind: P.detectProfile, setKind: P.setProfile, pickKind: P.pickProfile, profiles: P, version: "3.66.0", effects: { powerPlan: EFX.powerPlan, keywordsOf: PK.keywordsOf, keywordCounts: PK.keywordCounts, powersWith: PK.powersWith, lineSets: () => Object.keys(PK.LINE_KEYWORDS), bookRituals: BR.BOOK_RITUALS, bookRitual: BR.bookRitual, storyteller: EFX.storytellerEffect, rituals: EFX.ritualsOf, saveRitual: EFX.saveRitual, forgetRitual: EFX.forgetRitual, stItems: EFX.stItems, daPlan: EFX.daPlan, pathPlan: EFX.pathPlan, numinaPlan: EFX.numinaPlan, isOn: EFX.isOn, apply: EFX.applyItem, undo: EFX.undo, plan: EFX.plan, placeArea: EFX.placeArea, placeItem: EFX.placeItem, expireAreas: EFX.expireAreas, applyCounter: EFX.applyCounter, rotes: EFX.rotesOf, saveRote: EFX.saveRote, forgetRote: EFX.forgetRote, rules: EFX.E },
    uses: (o = {}) => { const a = o.actor ?? resolveActor(); if (a) LEDGER.delete(a.id); return pm().uses(a, o.resource ?? "willpower"); }, cantrip: (o = {}) => { const a = o.actor ?? resolveActor(); return a && FXD.isDA(a) ? fx().cast(a) : cx().cantrip(a); },
    cast: (o = {}) => { const a = o.actor ?? resolveActor(); return a && MXD.isDA(a) ? mx().cast(a) : a?.type === "Mage" || a?.system?.advantages?.arete ? zx().cast(a) : pm().cast(a); },
    m20Cast: withActor((a, o) => zx().cast(a, o)), m20CastRote: (actor, item) => { const a = resolveActor(actor); return a ? zx().castRote(a, item) : false; }, m20Backlash: withActor(a => zx().backlash(a)), m20Counter: withActor((a, o) => zx().counter(a, o)), m20Info: a => zx().info(resolveActor(a)), m20Shed: () => zx().shedAll(), m20Rules: ZR, m20Purify: withActor(a => zx().purify(a)), m20Place: () => zx().placeDialog(), m20Quiet: withActor(a => qtx().panel(a)), quiet: { state: a => qtx().state(resolveActor(a)), act: (a, fd) => qtx().act(resolveActor(a), fd), rules: QR, onRefreshToken: QX.onRefreshToken }, consensus: { age: () => zx().age(), suggest: (o = {}) => zx().suggest(o.actor ?? resolveActor(), o.scene), rules: CNR },
    // Dark Ages mages (3.7.0)
    daCast: withActor(a => mx().cast(a)), daMage: withActor(a => mx().sheet(a)), daQuintessence: withActor(a => mx().quintessence(a)),
    daCountermagic: withActor(a => mx().counter(a)), daGuide: withActor(a => mx().guide(a)), daCertamen: withActor(a => mx().certamen(a)),
    daMageInfo: a => mx().info(resolveActor(a)), daFade: () => mx().fadeAll(), daBacklashButton: (msg, what) => mx().onButton(msg, what),
    // Dark Ages fae (3.8.0)
    daFae: withActor(a => fx().sheet(a)), daCantrip: withActor(a => fx().cast(a)), daUnleash: withActor(a => fx().unleash(a)),
    daCounter: withActor(a => fx().counter(a)), daEcho: withActor(a => fx().echo(a)), daMists: withActor(a => fx().mists(a)),
    daMien: withActor(a => fx().mien(a)), daOath: withActor(a => fx().keepOath(a)), daRest: withActor(a => fx().rest(a)),
    daColdIron: withActor(a => fx().coldIron(a)), daFaeInfo: a => fx().info(resolveActor(a)), daFaeDaily: () => fx().daily(),
    daFaeButton: (msg, what) => fx().onButton(msg, what), faeRules: FXD,
    /** Dark Ages fae soak for WoDX Combat: in the mien Stamina soaks lethal (DA:Fae p. 104); cold iron is soakable (p. 88). */
    faeSoak: a => (a && FXD.isDA(a)) ? { lethal: !!fx().info(a).mien, coldIron: true } : null,
    // Changelings of the later eras (3.9.0)
    c20Cantrip: withActor(a => cx().cantrip(a)), c20Unleash: withActor(a => cx().unleash(a)), c20Invoke: withActor(a => cx().invoke(a)),
    c20Trigger: withActor(a => cx().trigger(a)), c20Epiphany: withActor(a => cx().epiphany(a)), c20Bedlam: withActor(a => cx().bedlam(a)),
    c20ColdIron: withActor(a => cx().coldIron(a)), c20Mists: withActor(a => cx().mists(a)), c20Info: a => cx().info(resolveActor(a)), c20Everyday: () => blx().panel(), everydayBanality: { endScene: sc => blx().endScene(sc), panel: () => blx().panel(), rules: BLX },
    demonEvoke: withActor(a => dx().evoke(a)), demonForm: withActor(a => dx().form(a)), demonRevelation: withActor(a => dx().revelation(a)), demonReap: withActor(a => dx().reap(a)),
    demonThralls: withActor(a => dx().thralls(a)), demonSin: withActor(a => dx().sin(a)), demonKindness: withActor(a => dx().kindness(a)), demonHeal: withActor(a => dx().heal(a)),
    demonHoly: withActor(a => dx().holy(a)), demonName: withActor(a => dx().named(a)), demonIllusion: withActor(a => dx().illusion(a)), demonInfo: a => dx().info(resolveActor(a)),
    demonDaily: () => dx().daily(), demonRules: DR, isDemon: a => DXD.isDemon(resolveActor(a)),
    kotFeed: withActor(a => qx().feed(a)), kotSpend: withActor(a => qx().spend(a)), kotNature: withActor(a => qx().nature(a)), kotDharma: withActor(a => qx().dharmaRoll(a)),
    kotDemon: withActor(a => qx().demon(a)), kotRise: withActor(a => qx().rise(a)), kotSun: withActor(a => qx().sun(a)), kotHeal: withActor(a => qx().heal(a)),
    kotSight: withActor(a => qx().sight(a)), kotSetup: withActor(a => qx().setup(a)), kotInfo: a => qx().info(resolveActor(a)), kotRules: KER, isKotE: a => KXD.isKotE(resolveActor(a)),
    mummyCast: withActor(a => ux().cast(a)), mummySekhem: withActor(a => ux().regain(a)), mummyBalance: withActor(a => ux().balance(a)), mummyOffense: withActor(a => ux().offense(a)),
    mummyResurrect: withActor(a => ux().resurrect(a)), mummyVeil: withActor(a => ux().veil(a)), mummySetup: withActor(a => ux().setup(a)), mummyInfo: a => ux().info(resolveActor(a)),
    mummyDaily: () => ux().daily(), mummyRules: UR, isMummy: a => UXD.isMummy(resolveActor(a)),
    orphHorror: withActor(a => ox().horror(a)), orphVitality: withActor(a => ox().vitality(a)), orphHarm: withActor(a => ox().harm(a)), orphSpite: withActor(a => ox().spite(a)),
    orphProject: withActor(a => ox().project(a)), orphSetup: withActor(a => ox().setup(a)), orphInfo: a => ox().info(resolveActor(a)), orphRules: ORR, isOrpheus: a => OXD.isOrpheus(resolveActor(a)),
    shift: withActor(a => GX.isShifter(a) ? gx().shift(a) : pm().shift(a)), regen: (o = {}) => pm().regen(o.actor ?? resolveActor()),
    // Werewolf and Fera (Phase 6b)
    shiftForm: withActor(a => gx().shift(a)), rageRoll: withActor((a, o) => gx().rageRoll(a, o)), spendRage: withActor(a => gx().spendRage(a)),
    garouEndFrenzy: withActor(a => gx().endFrenzy(a)), remainActive: withActor(a => gx().remainActive(a)), meditate: withActor(a => gx().meditate(a)),
    useGift: withActor(a => gx().useGift(a)), learnGift: withActor(a => gx().learnGift(a)), performRite: withActor(a => gx().performRite(a)),
    summonSpirit: withActor(a => gx().summonSpirit(a)), useFetish: withActor(a => gx().useFetish(a)), accomplishment: withActor(a => gx().accomplishment(a)),
    battleScar: withActor(a => gx().battleScar(a)), curse: withActor(a => gx().curse(a)), kinfolk: withActor(a => gx().kinfolk(a)),
    chiminage: withActor(a => gx().chiminage(a)),
    awardRenown: () => gx().awardRenown(), delirium: (o = {}) => gx().deliriumCheck(o), moonRise: (o = {}) => gx().moonRise(o),
    applyRenown: (actors, deltas, reason) => gx().applyRenown(actors, deltas, reason), garouInfo: a => GX.info(a),
    garouRules: GX, gifts: () => GX.gifts(), giftItem: g => GX.giftItem(g),
    // Test code: fetched only when a gate asks for it, so players never download it
    makeTestPack: (...args) => import("./garou-testpack.js").then(m => m.makeTestPack(...args)),
    // Kindred additions and automatic prompts (3.2.0)
    useDiscipline: withActor(a => kx().useDiscipline(a)), setRoad: withActor(a => kx().setRoad(a)), downtime: withActor(a => kx().downtime(a)),
    healing: withActor(a => kx().healing(a)), boons: (o = {}) => kx().boons(o.actor ? resolveActor(o.actor) : resolveActor()),
    masquerade: (o = {}) => kx().masquerade(o.actor ? resolveActor(o.actor) : resolveActor()), endStory,
    recordBreach: o => kx().recordBreach(o), setWitnessState: (a, st, note) => kx().setWitnessState(a, st, note), witnessesOf: (t, o) => kx().witnessesOf(t, o),
    crowdNear: a => crowdNear(resolveActor(a)), crowdRules,
    observersOf: (t, o) => kx().observersOf(t, o), revealed: (a, o) => kx().revealed(resolveActor(a), o), placeOf: t => kx().placeOf(t), witnessRules: WRR,
    history: (a, text, kind) => kx().logEvent(a, text, kind), roadOf: a => KX.roadOf(a), healPlan: (a, seconds) => kx().healPlan(a, seconds),
    healAll: seconds => kx().healAll(seconds), clock: () => kx().onClock(), enterTorpor: (a, o) => kx().enterTorpor(a, o),
    sunlit: t => kx().sunlit(t), setSceneLight: (scene, light) => (scene ?? canvas.scene)?.setFlag(MOD, "light", light),
    kindredRules: KR, disciplines: () => KX.DATA.disc, roads: () => KX.DATA.roads,
    // The sunlight system (3.3.0)
    sunNow: t => sx().sunNow(t), sunExposure: (tok, sun) => sx().exposureOf(tok, sun), sunCheck: doc => sx().onMove(doc?.document ?? doc), applySun: (a, o) => sx().applySun(resolveActor(a), o),
    sunAndHaven: withActor(a => sx().sunAndHaven(a)), skyAndSun: () => sx().skyAndSun(), havenStatus: a => sx().havenStatus(a), sunlightRules: SR,
    // The wraith line (3.4.0)
    useArcanos: withActor(a => wx().useArcanos(a)), passion: withActor(a => wx().passion(a)), fetter: withActor(a => wx().fetter(a)),
    memoriam: withActor(a => wx().memoriam(a)), healCorpus: withActor(a => wx().healCorpus(a)), caul: withActor(a => wx().caul(a)),
    shadow: withActor(a => wx().shadow(a)), shadowWhisper: withActor(a => wx().whisper(a)), shadowguide: withActor(a => wx().shadowguide(a)),
    harrowing: withActor((a, o) => wx().harrowing(a, o)), hysteria: () => wx().hysteria(), maelstrom: () => wx().maelstrom(), newWraithScene: () => wx().newScene(), newSession: () => wx().newSession(),
    corpusDamage: (a, type, k) => wx().corpusDamage(resolveActor(a), type, k), soulforge: withActor(a => sfx().forge(a)), soulforgeRules: () => sfx().rules, wraithInfo: a => WX.info(a), wraithRules: WR, arcanoi: () => WX.library(), arcanoiLibraries: () => ({ w20: WX.DATA.w20, gw: WX.DATA.gw }),
    // Hunters, True Faith and Numina (3.4.0)
    hunterSheet: withActor(byLine(a => rx().sheet(a), a => hx().inquisitorSheet(a), hh2Note)),
    hunterPower: withActor(byLine(a => rx().useEdge(a), a => hx().blessing(a), a => hx().numina(a))),
    hunterVirtue: withActor(byLine(a => rx().secondSight(a), a => hx().virtueRoll(a), hh2Note)),
    inquisitorSheet: withActor(a => hx().inquisitorSheet(a)), blessing: withActor(a => hx().blessing(a)), useEdge: withActor(a => rx().useEdge(a)),
    secondSight: withActor(a => rx().secondSight(a)),
    // The inner voice (3.5.0)
    innerVoice: withActor(a => vx().panel(a)), voices: () => vx().mine(), voiceRules: VR, voicePressure: a => vx().pressureOf(resolveActor(a)),
    voiceLive: a => vx().live(resolveActor(a)), voiceButton: b => vx().onChatButton(b), voiceSceneEnd: () => vx().onEndScene(), proposeVoice: (a, prop, note) => vx().propose(resolveActor(a), prop, note), imbue: withActor(a => rx().imbue(a)), reckoningRules: KRR,
    sinGod: withActor(a => hx().sin(a)), prayer: withActor(a => hx().prayer(a)), relic: withActor(a => hx().relic(a)), bankConviction: withActor(a => hx().cashIn(a)),
    trueFaith: withActor(a => hx().trueFaith(a)), numina: withActor(a => hx().numina(a)), hedgeMagic: withActor(a => hx().hedgeMagic(a)), ghoulBlood: withActor(a => hx().ghoulBlood(a)), hunterLine: () => HX.lineNow(), hunterRules: HR };

Hooks.once("init", () => {
    registerSettings();
    EFX.setup();
    SX.registerBehavior();
    P.register();
    // 3.59.0 (B2813): the menu's entries for Chronicle's Find anything, and running one of them, as the menu does
    API.menuEntries = async actor => {
        if (!actor) return [];
        const legacy = !setting("profileMenu");
        const html = legacy ? MENU.map(([k, , l]) => `<button type="button" data-k="api:${k}">${l}</button>`).join("")
            : (await pm().menuFor(actor, { recent: [], pinned: [], isGM: game.user.isGM })).html;
        const box = document.createElement("div"); box.innerHTML = html;
        const seen = new Set(); const out = [];
        for (const b of box.querySelectorAll("button[data-k]")) {
            const spec = b.dataset.k; if (!spec || seen.has(spec)) continue; seen.add(spec);
            out.push({ spec, label: b.textContent.trim(), hint: b.dataset.hint || b.title || "" });
        }
        const extras = [...CK.CHECKS.map(c => ({ spec: `check:${c.key}`, label: c.label, hint: c.note || "" })),
            ...Object.entries(PRESETS).filter(([k]) => k && !k.startsWith("check-")).map(([k, p]) => ({ spec: `preset:${k}`, label: p.label, hint: p.note || "" }))];
        for (const x of extras) if (!seen.has(x.spec)) { seen.add(x.spec); out.push(x); }
        return out;
    };
    API.runSpec = async (spec, actor) => {
        if (!actor || !spec) return;
        const was = P.setLine(P.detectProfile(actor));
        LEDGER.delete(actor.id);
        try { await pm().run(spec, actor); } catch (e) { console.error(e); ui.notifications.error(`WoDX Actions: ${e.message}`); } finally { P.setLine(was); }
    };
    game.wodxActions = API;
    game.wodx ??= {};
    game.wodx.actions = API;
    const mod = game.modules.get(MOD);
    if (mod) mod.api = API;
    // 6e: every WoDX card shown in the one layout, the ones written before 3.6 and the notices too (before the buttons are bound)
    Hooks.on("renderChatMessageHTML", (m, el) => { try { upgradeCards(m, el?.[0] ?? el); plainCards(el?.[0] ?? el); } catch (e) { console.warn("WoDX | card layout", e); } });
    // 6e: what each sheet update changes, for the card that reports it
    Hooks.on("preUpdateActor", (actor, changes, options, userId) => { if (!userId || userId === game.user.id) recordChanges(actor, changes); });
    Hooks.on("renderChatMessageHTML", (m, el) => { if (m.flags?.[MOD]) bindCard(m, el); });
    // B3551: Quiet visions and false lines are marked for the Storyteller; tokens shown to one player hide from the rest
    Hooks.on("renderChatMessageHTML", (m, el) => { if (m.flags?.[MOD]?.quiet) QX.markCard(m, el?.[0] ?? el); });
    Hooks.on("refreshToken", t => QX.onRefreshToken(t));
    // B3554, B3556: a soulforge task makes its item; a long task in a banal place weighs on a changeling
    Hooks.on("wodxTaskDone", p => { if (game.users.activeGM?.id !== game.user.id) return; sfx().onTaskDone(p).catch(e => console.error("WoDX | soulforge", e)); blx().onTaskDone(p).catch(e => console.error("WoDX | banality", e)); });
    Hooks.on("renderChatMessageHTML", (m, el) => { if (m.flags?.[MOD]?.banalLife) blx().bind(m, el?.[0] ?? el); });
});

Hooks.once("ready", async () => {
    // WoDX Chronicle's API may come after this module's ready: Foundry does not wait for async ready hooks
    const withChronicle = () => {
        chronicle()?.timed?.registerReverter?.("wodx-actions.quickening", revertQuickening);
        // The inner voice's proposals (6d): approved in the queue, answered from a card
        (chronicle()?.registerApprovalHandler ?? game.modules.get("wodx-chronicle")?.api?.registerApprovalHandler)?.("wodx-voice", { label: "Inner voice", approve: entry => vx().onApproved(entry) });
        // Mage keyword results that wait for a yes (3.22.0)
        EFX.registerHandler(chronicle() ?? game.modules.get("wodx-chronicle")?.api);
        // Lifted and planted items, and being caught at it (3.21.0)
        try { sox().registerHandlers(); } catch (e) { console.error("WoDX | social", e); }
    };
    if (chronicle()) withChronicle(); else Hooks.once("wodxChronicleReady", withChronicle);
    // B3556: the end of a scene counts everyday Banality for the changelings on it
    Hooks.on("wodxEndScene", () => { if (game.user.isGM && game.users.activeGM?.id === game.user.id) blx().endScene(canvas?.scene).catch(e => console.error("WoDX | banality", e)); });
    Hooks.on("wodxEndScene", () => {
        if (game.user.isGM && game.users.activeGM?.id === game.user.id) endScene({ actors: game.actors.filter(a => a.type !== "Group" && a.hasPlayerOwner), fromChronicle: true }).catch(e => console.error("WoDX |", e));
    });
    if (game.system.id !== "worldofdarkness") console.warn(`${MOD} | designed for the worldofdarkness system (found ${game.system.id}).`);
    game.socket.on(SOCKET, onSocket);
    await GX.loadData();
    await KX.loadData();
    await WX.loadData();
    garouHooks();
    kindredHooks();
    await createMacros();
});

/** Werewolf and Fera hooks: moon Rage at nightfall (B40), regeneration each round, Embrace Pain (Dark Ages). */
function garouHooks() {
    let moonBusy = false;
    Hooks.on("updateWorldTime", () => {
        if (moonBusy || !game.user.isGM || chronicle()?.isSkipping?.()) return;
        moonBusy = true;
        gx().moonRise().catch(e => console.error("WoDX |", e)).finally(() => { moonBusy = false; });
    });
    Hooks.on("wodxSkipEnd", () => { if (game.user.isGM) gx().moonRise().catch(e => console.error("WoDX |", e)); });
    const lastRound = new Map();
    Hooks.on("updateCombat", (combat, changed) => {
        if (!("round" in (changed ?? {})) || !combat.started) return;
        // Only a new round, not stepping back through the tracker
        if (combat.round <= (lastRound.get(combat.id) ?? 0)) return;
        lastRound.set(combat.id, combat.round);
        gx().regenRound(combat).catch(e => console.error("WoDX |", e));
    });
    Hooks.on("preUpdateActor", (actor, changes, options) => {
        if (foundry.utils.hasProperty(changes, "system.health")) options.wodxHealthBefore = foundry.utils.deepClone(actor.system?.health?.damage ?? {});
    });
    Hooks.on("updateActor", (actor, changes, options) => {
        if (!options?.wodxHealthBefore) return;
        gx().embracePain(actor, options.wodxHealthBefore, actor.system?.health?.damage ?? {}).catch(e => console.error("WoDX |", e));
    });
}

/** Kindred and general hooks (3.2.0): the clock (healing, dawn, dusk, torpor), wounds, blood, Combat's damage, the Delirium. */
function kindredHooks() {
    let busy = false;
    const tick = () => {
        if (busy || !game.user.isGM || chronicle()?.isSkipping?.()) return;
        busy = true;
        kx().onClock().catch(e => console.error("WoDX |", e)).finally(() => { busy = false; });
    };
    Hooks.on("updateWorldTime", tick);
    Hooks.on("updateWorldTime", (wt, dt) => {
        if (!game.user.isGM || chronicle()?.isSkipping?.()) return;
        sx().onClock(Number(dt) || 0).catch(e => console.error("WoDX |", e));
    });
    // Dark Ages mages: Twilight and Brandings fade with abstinence (3.7.0)
    let fadeBusy = false;
    Hooks.on("updateWorldTime", () => {
        if (fadeBusy || !game.user.isGM || chronicle()?.isSkipping?.()) return;
        fadeBusy = true;
        mx().fadeAll().then(() => fx().daily()).then(() => dx().daily()).then(() => ux().daily()).then(() => zx().shedAll()).catch(e => console.error("WoDX |", e)).finally(() => { fadeBusy = false; });
    });
    const sunRound = new Map();
    Hooks.on("updateCombat", (combat, changed) => {
        if (!game.user.isGM || !("round" in (changed ?? {})) || !combat.started) return;
        if (combat.round <= (sunRound.get(combat.id) ?? 0)) return;
        sunRound.set(combat.id, combat.round);
        sx().onRound(combat).catch(e => console.error("WoDX |", e));
    });
    Hooks.on("wodxSkipEnd", () => { busy = false; tick(); });
    Hooks.on("preUpdateActor", (actor, changes, options) => {
        if (foundry.utils.hasProperty(changes, "system.advantages.bloodpool.temporary")) options.wodxBloodBefore = num(actor.system?.advantages?.bloodpool?.temporary);
        if (foundry.utils.hasProperty(changes, "system.health") && !options.wodxHealthBefore) options.wodxHealthBefore = foundry.utils.deepClone(actor.system?.health?.damage ?? {});
    });
    Hooks.on("updateActor", (actor, changes, options) => {
        if (options?.wodxHealthBefore) kx().onDamage(actor, { before: options.wodxHealthBefore, after: actor.system?.health?.damage ?? {}, source: "sheet" }).catch(e => console.error("WoDX |", e));
        if (options?.wodxBloodBefore !== undefined) kx().onBlood(actor, options.wodxBloodBefore, num(actor.system?.advantages?.bloodpool?.temporary)).catch(e => console.error("WoDX |", e));
    });
    // A new scene: the Delirium can strike the same witnesses again
    Hooks.on("wodxEndScene", () => { if (game.user.isGM && canvas.scene?.getFlag?.(MOD, "delirium")) canvas.scene.unsetFlag(MOD, "delirium").catch(() => {}); });
    Hooks.on("wodxDamageApplied", (actor, info) => kx().onDamage(actor, { ...info, source: "combat" }).catch(e => console.error("WoDX |", e)));
    // A blow from a vampire marks the target as fought, for the bloodlines whose blood must be taken by force (3.41.0)
    Hooks.on("wodxDamageApplied", async (actor, info) => {
        try {
            if (!info?.attacker || !actor?.isOwner) return;
            const d = await fromUuid(info.attacker);
            const by = d?.actor ?? d;
            if (!by || !isVampire(by) || by.id === actor.id) return;
            await actor.update({ [`flags.${MOD}.fought.${by.id}`]: game.time?.worldTime ?? 0 });
        } catch (e) { console.warn("WoDX | fought mark", e); }
    });
    // Wraiths (3.4.0): a Corpus change from the sheet or from Combat; a new scene; the session
    Hooks.on("updateActor", (actor, changes, options) => {
        if (!foundry.utils.hasProperty(changes, "system.health.damage.corpus") || !WX.isWraith(actor)) return;
        const before = options?.wodxHealthBefore?.corpus ?? {};
        wx().onCorpus(actor, { bashing: num(before.bashing), lethal: num(before.lethal), aggravated: num(before.aggravated) }, actor.system.health.damage.corpus).catch(e => console.error("WoDX |", e));
    });
    Hooks.on("wodxEndScene", () => { if (game.user.isGM && game.users.activeGM?.id === game.user.id) wx().newScene({ quiet: true }).catch(e => console.error("WoDX |", e)); });
    wx().onReady().catch(e => console.error("WoDX |", e));
    // The inner voice (3.5.0): prompts when the pressure rises, the X-card, the scene's end, the approval queue
    Hooks.on("preUpdateActor", actor => { try { vx().onPreUpdate(actor); } catch (e) { /* not a voiced line */ } });
    Hooks.on("updateActor", actor => { vx().onUpdate(actor)?.catch?.(e => console.error("WoDX |", e)); });
    Hooks.on("preUpdateItem", item => { if (item.parent instanceof Actor) try { vx().onPreUpdate(item.parent); } catch (e) { /* not voiced */ } });
    Hooks.on("updateItem", item => { if (item.parent instanceof Actor) vx().onUpdate(item.parent)?.catch?.(e => console.error("WoDX |", e)); });
    Hooks.on("wodxXCard", () => { vx().onXCard()?.catch?.(e => console.error("WoDX |", e)); });
    Hooks.on("wodxEndScene", () => { vx().onEndScene()?.catch?.(e => console.error("WoDX |", e)); });

    let movePending = null;
    Hooks.on("updateToken", (doc, changes) => {
        if (!game.user.isGM || !("x" in changes || "y" in changes)) return;
        clearTimeout(movePending);
        // After the move animates: any Crinos on the scene may now be in a mortal's sight
        movePending = setTimeout(() => {
            for (const t of canvas.tokens?.placeables ?? []) if (t.actor && GX.isShifter(t.actor)) kx().crinosSeen(t).catch(e => console.error("WoDX |", e));
        }, 600);
        // Into or out of the sun (after the move animates, so the token's regions are current)
        setTimeout(() => sx().onMove(doc).catch(e => console.error("WoDX |", e)), 700);
    });
    Hooks.on("wodxFormChanged", actor => {
        if (!game.user.isGM) return;
        setTimeout(() => { for (const t of actor.getActiveTokens?.() ?? []) kx().crinosSeen(t).catch(e => console.error("WoDX |", e)); }, 300);
    });
}

Hooks.on("renderTokenHUD", (hud, html) => {
    const root = rootOf(html);
    const tok = hud.object;
    if (!tok?.actor?.isOwner || !root) return;
    const col = root.querySelector(".col.left");
    if (!col) return;
    const b = document.createElement("div");
    b.className = "control-icon vta-hud"; b.title = "WoDX Actions";
    b.innerHTML = '<i class="fas fa-book-dead"></i>';
    b.title = "WoDX Actions (right-click: set actor type)";
    b.addEventListener("click", () => menu({ actor: tok.actor }));
    b.addEventListener("contextmenu", ev => { ev.preventDefault(); P.pickProfile(tok.actor); });
    col.appendChild(b);
});
