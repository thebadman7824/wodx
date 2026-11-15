/**
 * WoDX Actions: fomor powers (Werewolf 20th, pp. 430-439). B5162 made Numbing playable; B5610-B5619 bring the whole
 * list (fomor-powers.js holds the rules, in WoDX's own words).
 *
 *   Always-on powers work while the Power is on the sheet: the system's bonus rows on the Power item (soak,
 *   Attributes, dice, health, movement), a natural weapon item, dark sight on the token, lethal soak (read by WoDX
 *   Combat), a Rage or Gnosis pool, no Delirium, regeneration and an extra action each turn of a fight, and the
 *   splash of Poison Tumors and Toxic Secretions, Tar Skin's glue and the Venomous Bite's poison when blows land.
 *   Rolled and free powers are used from the Fomor power window: the cost, the roll, then what they do for their time
 *   on the fomor (bonus rows, a condition, a weapon, wings, fire, shadow, a hidden token, a bigger body) and on the
 *   targets (the effects card: harm, holds, fear, a summoning; or straight on the sheet: a drained Attribute, a
 *   dulled power, the infection's harm, lost Gnosis).
 *   NPC fomor choose their powers through the NPC power choice (main.js npcPowers).
 *
 * Numbing (W20 p. 436) keeps its own path: the body change is a Chronicle condition read by WoDX Combat (B5160).
 */
import * as LIM from "./limits.js";
import * as FP from "./fomor-powers.js";
import * as EF from "./effects.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGE = "W20 p. 436";
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const combat = () => game.modules.get("wodx-combat")?.api ?? null;
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.isSelf : true);

/** The condition WoDX Combat reads: three Bruised levels and no wound penalties (bodyEase 99). */
export const NUMBING = { id: "numbing", name: "Numbing", img: "icons/svg/frozen.svg", source: PAGE,
    summary: "Feels no pain: no wound penalties and three more health levels for the scene; speech is slurred.", mods: { bodyBruised: 3, bodyEase: 99 } };
/** B5612: the forms and marks the fomor powers leave (WoDX Chronicle conditions). */
export const CONDITIONS = [
    { id: "fomor-gas", name: "Gaseous form", img: "icons/svg/windmill.svg", source: "W20 p. 434", summary: "Drifting gas: it cannot attack, and blows pass through it.", mods: { noAction: true } },
    { id: "fomor-liquid", name: "Liquid form", img: "icons/svg/waterfall.svg", source: "W20 p. 439", summary: "Liquid: claws and bullets pass through, and it cannot attack.", mods: { noAction: true } },
    { id: "fomor-weakened", name: "Weakened", img: "icons/svg/degen.svg", source: "W20 p. 435", summary: "The body's bonds are loosened: the next blow's harm is doubled.", mods: { attackDiceVs: 2 } }
];

/** The fomor powers on a sheet: Power items (or Gifts) whose names are fomor powers. */
export function fomorPowersOf(actor) {
    const out = [];
    for (const i of actor?.items ?? []) {
        if (!["Power", "Trait", "Feature", "Item"].includes(i.type)) continue;
        const p = FP.powerOf(i.name);
        if (p) out.push({ id: i.id, key: p.key, name: i.name, power: p, item: i });
    }
    return out;
}
const has = (actor, key) => fomorPowersOf(actor).some(x => x.key === key);
const countOf = (actor, key) => fomorPowersOf(actor).filter(x => x.key === key).length;
export const isFomor = actor => fomorPowersOf(actor).length > 0;
/** For the Delirium (garou.js) and witnesses (kindred.js): Immunity to the Delirium. */
export const immune = actor => has(actor, "immunitytothedelirium");
/** For WoDX Combat's soak: Armored Skin soaks lethal as bashing. */
export function soakOf(actor) { return has(actor, "armoredskin") ? { lethalSoak: true, why: "Armored Skin (W20 p. 430)" } : null; }
/** Gifted Fomor: Willpower stands in for a Gift's Rage or Gnosis (garou.js pay). */
export const giftStandIn = actor => has(actor, "giftedfomor");
/** Triatic Sense or a Deception in force: Sense Wyrm passes the fomor by (wodx-senses). */
export const taintHidden = actor => has(actor, "triaticsense") || !!actor?.getFlag?.(MOD, "taintHidden");

/** The Rage pool of Berserker and the Gnosis of Spirit Ties (flags; the mortal sheet has neither). */
export function pools(actor) {
    const f = actor?.getFlag?.(MOD, "fomorPools") ?? {};
    const rageMax = has(actor, "berserker") ? 5 : 0, gnosisMax = Math.min(5, countOf(actor, "spiritties"));
    return { rage: Math.min(rageMax, f.rage ?? rageMax), rageMax, gnosis: Math.min(gnosisMax, f.gnosis ?? gnosisMax), gnosisMax };
}
async function setPools(actor, patch) { await actor.setFlag(MOD, "fomorPools", { ...(actor.getFlag(MOD, "fomorPools") ?? {}), ...patch }); }

export function setup() {
    const C = chron();
    try { C?.registerCondition?.(NUMBING); for (const c of CONDITIONS) C?.registerCondition?.(c); } catch (e) { console.warn("WoDX | fomor conditions", e); }
    // B5611: what a power did for its time comes off when it ends
    C?.timed?.registerReverter?.("wodx-actions.fomorOff", async (actor, data) => offSelf(actor, data ?? {}).catch(e => console.warn("WoDX | fomor off", e)));
    C?.timed?.registerReverter?.("wodx-actions.fomorDrainEnd", async (actor, data) => {
        const upd = {};
        for (const k of data?.attrs ?? []) { const a = actor.system?.attributes?.[k]; if (a) { upd[`system.attributes.${k}.bonus`] = n(a.bonus) + n(data.by); upd[`system.attributes.${k}.total`] = n(a.total ?? a.value) + n(data.by); } }
        if (Object.keys(upd).length) await actor.update(upd);
    });
    C?.timed?.registerReverter?.("wodx-actions.fomorTaint", async actor => actor.unsetFlag(MOD, "taintHidden"));
    // B5610: always-on powers follow the sheet
    const later = new Map();
    const touch = actor => {
        if (!actor || !isActiveGM()) return;
        clearTimeout(later.get(actor.uuid));
        later.set(actor.uuid, setTimeout(() => { later.delete(actor.uuid); settle(actor).catch(e => console.warn("WoDX | fomor settle", e)); }, 300));
    };
    for (const h of ["createItem", "deleteItem"]) Hooks.on(h, item => { if (FP.powerOf(item?.name) && item.parent?.documentName === "Actor") touch(item.parent); });
    Hooks.on("updateItem", (item, ch) => { if ("name" in (ch ?? {}) || "system" in (ch ?? {}) && FP.powerOf(item?.name)?.key === "megaattribute") if (item.parent?.documentName === "Actor") touch(item.parent); });
    Hooks.on("createToken", doc => { if (doc.actor && isFomor(doc.actor)) touch(doc.actor); });
    Hooks.once("ready", () => { if (isActiveGM()) for (const a of game.actors ?? []) if (isFomor(a)) touch(a); });
    // B5614: each new round of a fight, regeneration and Extra Speed
    const lastRound = new Map();
    Hooks.on("updateCombat", (fight, changed) => {
        if (!("round" in (changed ?? {})) || !fight.started || !isActiveGM()) return;
        if (fight.round <= (lastRound.get(fight.id) ?? 0)) return;
        lastRound.set(fight.id, fight.round);
        roundOf(fight).catch(e => console.warn("WoDX | fomor round", e));
    });
    // B5615: a new scene brings back a point of Rage (Berserker) and the Gnosis of Spirit Ties
    Hooks.on("wodxNewScene", async () => {
        if (!isActiveGM()) return;
        for (const a of game.actors ?? []) {
            const p = pools(a);
            if (p.rageMax && p.rage < p.rageMax) await setPools(a, { rage: p.rage + 1 });
            if (p.gnosisMax && p.gnosis < p.gnosisMax) await setPools(a, { gnosis: p.gnosisMax });
        }
    });
    // B5616: when a blow lands on a fomor (or a fomor's venom lands)
    Hooks.on("wodxAttackRolled", (attacker, d) => { onBlow(attacker, d ?? {}).catch(e => console.warn("WoDX | fomor blow", e)); });
}

/* -- always-on powers --------------------------------------------------- */

/** Bonus rows, natural weapons, sight and the taint flag for every always-on power on the sheet. */
export async function settle(actor) {
    if (!actor?.isOwner) return null;
    const list = fomorPowersOf(actor);
    if (!list.length) return null;
    const did = [];
    for (const x of list) {
        const p = x.power;
        let rows = p.kind === "always" ? p.bonus : [];
        if (p.key === "megaattribute") rows = [["attr", FP.megaAttr(`${x.item.system?.description ?? ""} ${x.name}`), p.mega]];
        if (!rows.length || !Array.isArray(x.item.system?.bonuslist ?? [])) continue;
        const want = FP.withRows(x.item.system?.bonuslist ?? [], FP.bonusRows(p.name, rows, true, "always"), "always");
        if (JSON.stringify(want) !== JSON.stringify(x.item.system?.bonuslist ?? [])) { await x.item.update({ "system.bonuslist": want }); did.push(p.name); }
    }
    // Natural weapons
    const grants = actor.items.filter(i => i.getFlag?.(MOD, "fomorGrant")?.always);
    const wantW = list.filter(x => x.power.kind === "always" && x.power.weapon);
    for (const x of wantW) if (!grants.some(g => g.getFlag(MOD, "fomorGrant").key === x.key)) { await makeWeapon(actor, x.power, x.power.weapon, true); did.push(x.power.weapon.name); }
    const gone = grants.filter(g => !wantW.some(x => x.key === g.getFlag(MOD, "fomorGrant").key)).map(g => g.id);
    if (gone.length) await actor.deleteEmbeddedDocuments("Item", gone);
    // Darksight on the token
    if (list.some(x => x.key === "darksight")) {
        const s = actor.prototypeToken?.sight ?? {};
        if (!actor.isToken && s.visionMode !== "darkvision") { await actor.update({ "prototypeToken.sight.visionMode": "darkvision", "prototypeToken.sight.range": Math.max(n(s.range), 60), "prototypeToken.sight.enabled": true }); did.push("Darksight"); }
        for (const t of actor.getActiveTokens?.(true, true) ?? []) if (t.sight?.visionMode !== "darkvision" && did.push("Darksight on the token")) await t.update({ "sight.visionMode": "darkvision", "sight.range": Math.max(n(t.sight?.range), 60), "sight.enabled": true });
    }
    // A fomor is Wyrm-tainted: Sense Wyrm finds it (wodx-senses), unless Triatic Sense or Deception hides it
    const hidden = taintHidden(actor);
    if (!!actor.flags?.["wodx-senses"]?.wyrm === hidden) await actor.update({ "flags.wodx-senses.wyrm": !hidden });
    return did;
}

async function makeWeapon(actor, p, w, always, extra = {}) {
    const data = { name: w.name, type: "Melee Weapon", img: "icons/svg/claw.svg",
        system: { isnatural: true, isequipped: true, attack: { attribute: "dexterity", ability: w.ability ?? "brawl", secondaryabilityid: "", accuracy: 0, isrollable: true },
            damage: { attribute: "strength", bonus: n(w.bonus), type: w.type, isrollable: true }, difficulty: n(w.diff) || 6,
            description: `${p.fx} (${FP.pageOf(p)})${w.noSoak ? " The poison that follows a wounding bite cannot be soaked." : ""}` },
        flags: { [MOD]: { fomorGrant: { key: p.key, always, ...extra } } } };
    const [item] = await actor.createEmbeddedDocuments("Item", [data]);
    return item;
}

async function roundOf(fight) {
    const rows = [];
    for (const c of fight.combatants ?? []) {
        const a = c.actor; if (!a || !isFomor(a)) continue;
        if (has(a, "regeneration")) {
            const h = a.system?.health?.damage ?? {};
            const type = n(h.lethal) ? "lethal" : n(h.bashing) ? "bashing" : null;
            if (type && combat()?.healDamage) { await combat().healDamage(a, type, 1); rows.push(`${a.name}: one ${type} level closes (Regeneration).`); }
        }
        if (has(a, "extraspeed")) {
            const key = `${fight.id}:${fight.round}`, prev = a.getFlag(MOD, "extraActions");
            await a.setFlag(MOD, "extraActions", { key, n: (prev?.key === key ? n(prev.n) : 0) + 1 });
            rows.push(`${a.name}: an extra action this turn (Extra Speed).`);
        }
    }
    if (rows.length) await ChatMessage.create({ speaker: { alias: "WoDX" }, whisper: game.users.filter(u => u.isGM).map(u => u.id),
        content: `<div class="vta-card"><h3>Fomor, round ${fight.round}</h3><ul>${rows.map(r => `<li>${esc(r)}</li>`).join("")}</ul><p class="wodx-quiet">W20 pp. 432, 436</p></div>` });
    return rows;
}

const docOf = uuid => (uuid ? fromUuidSync(uuid) : null);
async function onBlow(attacker, d) {
    if (!d.hit || !isActiveGM() || !combat()) return;
    const target = d.target, C = combat();
    const atkTok = docOf(d.attackerToken)?.object ?? attacker?.getActiveTokens?.()?.[0] ?? attacker;
    const tgtTok = docOf(d.targetToken)?.object ?? target?.getActiveTokens?.()?.[0] ?? target;
    const lines = [];
    // The fomor's own venom: a wounding bite with Venomous Bite
    if (attacker && /venomous bite/i.test(d.weapon ?? "") && has(attacker, "venomousbite") && target) {
        await C.soakAndApply(tgtTok, { apply: true, mode: "pool", amount: n(attacker.system?.attributes?.strength?.total ?? attacker.system?.attributes?.strength?.value) + 2, type: "aggravated", soak: false });
        lines.push(`${target.name} takes the venom: Strength + 2 aggravated, not soaked (W20 p. 439).`);
    }
    if (!target || !isFomor(target) || d.ranged) return post(lines);
    for (const x of fomorPowersOf(target)) {
        const p = x.power;
        if (p.burst && (!p.burst.close || d.brawl || d.bite)) {
            const dice = FP.burstDice(p, countOf(target, p.key));
            await C.soakAndApply(atkTok, { apply: true, mode: "pool", amount: dice, type: p.burst.type, soak: true });
            lines.push(`${attacker?.name ?? "The attacker"} is splashed by ${p.name}: ${dice} ${p.burst.type} dice (${FP.pageOf(p)}).`);
        }
        if (p.key === "tarskin" && attacker) {
            if (d.brawl || d.bite) {
                await chron()?.timed?.applyTimed?.(attacker, { name: "Stuck to tar", condition: "held", duration: { kind: "scene" }, key: "wodx-fomor-tar", source: FP.pageOf(p),
                    description: `Stuck fast to ${target.name}: break free with Dexterity + Athletics against the fomor's Dexterity + Primal-Urge.` });
                lines.push(`${attacker.name} is stuck to ${target.name}'s tar skin (${FP.pageOf(p)}).`);
            } else lines.push(`${attacker.name}'s weapon sticks in ${target.name}'s tar skin until the scene ends (${FP.pageOf(p)}).`);
        }
    }
    return post(lines);
    function post(l) {
        if (!l.length) return null;
        return ChatMessage.create({ speaker: { alias: "WoDX" }, content: `<div class="vta-card"><h3>Fomor flesh</h3><ul>${l.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>` });
    }
}

/** A power's time on the fomor is over: rows off, granted weapons gone, the token as it was. */
async function offSelf(actor, data) {
    const item = actor.items.get(data.item);
    if (item && Array.isArray(item.system?.bonuslist)) {
        const list = item.system.bonuslist.filter(b => b?.wodxFomor !== "use");
        if (list.length !== item.system.bonuslist.length) await item.update({ "system.bonuslist": list });
    }
    const gone = actor.items.filter(i => i.getFlag?.(MOD, "fomorGrant")?.use === data.use).map(i => i.id);
    if (gone.length) await actor.deleteEmbeddedDocuments("Item", gone);
    const tok = data.token ? fromUuidSync(data.token) : null;
    if (tok && data.was) await tok.update(data.was);
}

/* -- the window ---------------------------------------------------------- */

export function build(ctx) {
    const { post, rollPool, rollBlock, attr, findAbility, spendWillpower, notify } = ctx;
    const dialog = ctx.dialog;

    const stamp = () => ({ scene: LIM.sceneNo(), day: Math.floor((game.time?.worldTime ?? 0) / 86400), round: n(game.combat?.round) });
    const get = actor => (kind, k) => kind === "willpower" ? n(actor.system?.willpower?.permanent ?? actor.system?.advantages?.willpower?.permanent)
        : kind === "attr" ? n(attr(actor, k)) : n(findAbility(actor, k)?.value ?? (k === "primalurge" ? findAbility(actor, "primal-urge")?.value : 0));

    /** The usable powers, with what stops each now. */
    function usable(actor) {
        const used = actor.getFlag(MOD, "fomorUsed") ?? {};
        const st = n(attr(actor, "stamina"));
        return fomorPowersOf(actor).filter(x => x.power.kind !== "always").map(x => ({ ...x, left: FP.usesLeft(x.power, used, { ...stamp(), stamina: st }) }));
    }

    async function power(actor) {
        const all = fomorPowersOf(actor);
        if (!all.length) { notify(`${actor.name} has no fomor power on the sheet (add a Power named after one, such as Numbing, W20 pp. 430-439).`); return null; }
        const list = usable(actor);
        const always = all.filter(x => x.power.kind === "always");
        const pl = pools(actor);
        const gifts = has(actor, "giftedfomor") && actor.items.some(i => i.type === "Power" && /gift/i.test(i.system?.type ?? ""));
        const opts = (gifts ? `<option value="gift">A Gift (Gifted Fomor: Willpower pays Rage and Gnosis)</option>` : "") + list.map(x => `<option value="${x.key}"${x.left.ok ? "" : " disabled"}>${esc(x.power.name)}${x.left.ok ? "" : ` (${esc(x.left.why)})`}</option>`).join("");
        const content = `<form>${list.length || gifts ? `<div class="form-group"><label>Power</label><select name="fomor" data-fixed>${opts}</select></div><p class="wodx-fomor-fx"></p>` : "<p>No power here needs using: they all work by themselves.</p>"}
            ${pl.rageMax ? `<div class="form-group"><label>Rage ${pl.rage} of ${pl.rageMax}: spend one for an extra action</label><input type="checkbox" name="rageAction"/></div>` : ""}
            ${pl.gnosisMax ? `<p>Gnosis ${pl.gnosis} of ${pl.gnosisMax} (Spirit Ties): paid in place of Willpower where the book allows.</p>` : ""}
            ${has(actor, "wallwalking") ? `<div class="form-group"><label>Walk up walls (Wall Walking)</label><input type="checkbox" name="climb"/></div>` : ""}
            ${always.length ? `<p class="wodx-quiet">Always on: ${always.map(x => esc(x.power.name)).join(", ")}.</p>` : ""}</form>`;
        const fill = root => {
            const k = root.querySelector("[name=fomor]")?.value, p = FP.BY_KEY[k];
            const box = root.querySelector(".wodx-fomor-fx");
            if (box && p) box.textContent = `${p.fx} ${p.roll ? `Roll ${FP.rollLabel(p.roll)} at ${p.diff}.` : "No roll."} ${FP.pageOf(p)}.`;
        };
        return dialog(`${actor.name}: Fomor power`, content, "Use", async fd => {
            if (fd.rageAction) await rageAction(actor);
            if (fd.climb) await climb(actor);
            if (fd.fomor === "gift") return game.wodxActions?.useGift?.(actor);
            if (!fd.fomor) return true;
            return use(actor, fd.fomor);
        }, { render: root => { fill(root); root.querySelector("[name=fomor]")?.addEventListener("change", () => fill(root)); } });
    }

    async function rageAction(actor) {
        const pl = pools(actor);
        if (pl.rage < 1) { notify(`${actor.name} has no Rage left.`); return false; }
        await setPools(actor, { rage: pl.rage - 1 });
        const key = game.combat ? `${game.combat.id}:${game.combat.round}` : "none", prev = actor.getFlag(MOD, "extraActions");
        await actor.setFlag(MOD, "extraActions", { key, n: (prev?.key === key ? n(prev.n) : 0) + 1 });
        await post(actor, `${actor.name}: Rage`, `<div class="vta-res good">One Rage: an extra action this turn with no split pool (Berserker, W20 p. 430). Rage ${pl.rage - 1} of ${pl.rageMax}.</div>`);
        return true;
    }
    async function climb(actor) {
        for (const t of actor.getActiveTokens?.(true, true) ?? []) if ("movementAction" in t) await t.update({ movementAction: t.movementAction === "climb" ? "walk" : "climb" });
        return true;
    }

    /** Pay a cost: Willpower, or Rage from Berserker (Willpower stands in), or Gnosis from Spirit Ties for Sense Gaia. */
    async function pay(actor, p) {
        const c = p.cost ?? {};
        const pl = pools(actor);
        if (c.rage) {
            if (pl.rage >= c.rage) { await setPools(actor, { rage: pl.rage - c.rage }); return `${c.rage} Rage`; }
            if (!(await spendWillpower(actor, c.rage))) return false;
            return `${c.rage} Willpower in place of Rage`;
        }
        if (c.wp) {
            if (p.key === "sensegaia" && pl.gnosis >= c.wp) { await setPools(actor, { gnosis: pl.gnosis - c.wp }); return `${c.wp} Gnosis`; }
            if (!(await spendWillpower(actor, c.wp))) return false;
            return `${c.wp} Willpower`;
        }
        return "";
    }

    async function use(actor, key) {
        const p = FP.BY_KEY[key];
        if (!p) return null;
        if (p.numbing) return numbing(actor);
        const x = fomorPowersOf(actor).find(y => y.key === key);
        if (!x) { notify(`${actor.name} does not have ${p.name}.`); return null; }
        const left = usable(actor).find(y => y.key === key)?.left;
        if (left && !left.ok) { notify(`${p.name}: ${left.why}.`); return null; }
        const lim = await LIM.gate(actor, { name: p.name, level: 1 });
        if (!lim) return null;
        const paid = await pay(actor, p);
        if (paid === false) return null;
        let body = paid ? `<div class="vta-parts">${esc(actor.name)} spends ${esc(paid)}.</div>` : "";
        const rolls = [];
        let got = 1;
        if (p.roll) {
            let dice = FP.poolOf(p.roll, get(actor));
            // Umbral Passage: Gnosis (Spirit Ties) may stand in for Willpower
            if (p.key === "umbralpassage") dice = Math.max(dice, pools(actor).gnosis);
            const r = await rollPool(dice, n(p.diff) + n(lim.diff));
            rolls.push(r.roll);
            got = r.botch ? 0 : n(r.successes);
            body += rollBlock(FP.rollLabel(p.roll), r, lim.diff ? [`Drained +${lim.diff}`] : []);
        }
        await actor.setFlag(MOD, "fomorUsed", FP.usedAfter(p, actor.getFlag(MOD, "fomorUsed") ?? {}, stamp()));
        let fx = [];
        if (got > 0) {
            body += `<div class="vta-res good">${esc(p.fx)}</div>`;
            body += await selfPart(actor, x, p, got);
            body += await direct(actor, p, got, rolls);
            const results = FP.resultsOf(p, got);
            if (results.length && EF.isOn()) {
                const pp = EF.planOf(actor, results, got, { name: p.name, line: "Fomor", source: FP.pageOf(p) });
                body += pp.html;
                fx = pp.items.filter(i => i.route !== "off" && i.route !== "st");
            }
            if (p.sense) body += sense(actor, p, got);
        } else body += `<div class="vta-res bad">${p.roll ? "The power does not answer." : ""}</div>`;
        if (p.note) body += `<div class="vta-note">${esc(p.note)}</div>`;
        body += `<div class="wodx-quiet">${FP.pageOf(p)}</div>`;
        await lim.done({ successes: got });
        Hooks.callAll("wodxPowerShown", actor, { target: [...(game.user.targets ?? [])][0]?.actor ?? null, power: p.name, group: "fomor", kind: "fomor", line: "fomor" });
        return post(actor, `${actor.name}: ${p.name}`, body, rolls, fx.length ? { kind: "effects", caster: actor.name, items: fx } : undefined);
    }

    /** What a power does to the fomor for its time. */
    async function selfPart(actor, x, p, got) {
        const s = p.self;
        if (!s) return "";
        const L = FP.lastsOf(p.lasts, got);
        const use = foundry.utils.randomID();
        const tok = actor.getActiveTokens?.(true, true)?.[0] ?? null;
        const was = {}, now = {}, lines = [];
        if (s.bonus?.length) {
            const lvl = s.grow ? Math.max(1, countOf(actor, p.key)) : 1;
            const rows = s.bonus.map(([t, k, v]) => [t, k, t === "move" ? v : v * lvl]);
            await x.item.update({ "system.bonuslist": FP.withRows(x.item.system?.bonuslist ?? [], FP.bonusRows(p.name, rows, true, "use"), "use") });
            lines.push(rows.map(([t, k, v]) => `${t === "move" ? `×${v}` : v >= 0 ? `+${v}` : v} ${k || t}`).join(", "));
        }
        if (s.weapon) { await makeWeapon(actor, p, s.weapon, false, { use }); lines.push(`${s.weapon.name} on the sheet`); }
        if (tok) {
            if (s.feet) { was.elevation = n(tok.elevation); now.elevation = n(tok.elevation) + s.feet; if ("movementAction" in tok) { was.movementAction = tok.movementAction ?? "walk"; now.movementAction = "fly"; } lines.push("in the air"); }
            if (s.light) { was.light = foundry.utils.deepClone(tok.light?.toObject?.() ?? tok.light ?? {}); now.light = { dim: 20, bright: 10, color: "#ff6a00", animation: { type: "torch", speed: 5, intensity: 5 } }; lines.push("wreathed in fire"); }
            if (s.hidden) { was.hidden = !!tok.hidden; now.hidden = true; lines.push("the token is hidden from the players"); }
            if (s.grow) { was.width = tok.width; was.height = tok.height; now.width = n(tok.width) + 1; now.height = n(tok.height) + 1; lines.push("a bigger body on the map"); }
        }
        if (p.dark && tok) { was.light = foundry.utils.deepClone(tok.light?.toObject?.() ?? tok.light ?? {}); now.light = { dim: 45, bright: 0, negative: true, luminosity: -0.6 }; lines.push("shadow spreads 30 yards across"); }
        if (Object.keys(now).length && tok) await tok.update(now);
        if (s.flag === "masked") { await actor.setFlag(MOD, "taintHidden", true); await actor.update({ "flags.wodx-senses.wyrm": false }); lines.push("the taint is masked"); }
        const effect = await chron()?.timed?.applyTimed?.(actor, { name: p.name, img: "icons/svg/biohazard.svg", condition: s.cond ?? undefined, duration: L.timed, key: `wodx-fomor-${p.key}`,
            revert: { key: s.flag === "masked" ? "wodx-actions.fomorTaint" : "wodx-actions.fomorOff", data: { item: x.id, use, token: tok?.uuid ?? null, was: Object.keys(was).length ? was : null } },
            source: FP.pageOf(p), description: p.fx });
        if (s.touch && effect?.uuid) await fromUuidSync(effect.uuid)?.setFlag?.(MOD, "touchHarm", s.touch);
        if (s.cond) lines.push(CONDITIONS.find(c => c.id === s.cond)?.summary ?? "");
        return `<div class="vta-note">For ${esc(L.label)}: ${esc(lines.filter(Boolean).join("; "))}.</div>`;
    }

    /** Changes the effects card does not carry, put straight on the target's sheet (resisted where the book says). */
    async function direct(actor, p, got, rolls) {
        if (!(p.drain || p.dull || p.sick || p.gnosisDrain || p.feed)) return "";
        const targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(a => a && a !== actor);
        if (!targets.length) return `<div class="vta-note">Target someone to use it on.</div>`;
        const out = [];
        for (const t of (p.gnosisDrain ? targets : targets.slice(0, 1))) {
            let s = got, res = null;
            if (p.resist) {
                const pool = FP.poolOf(p.resist.pool, get(t)) + (p.sick ? 3 : 0);
                res = await rollPool(pool, p.resist.diff);
                // Standing rule 19: an NPC's resisting roll is the Storyteller's to see
                if (res.roll) await ChatMessage.create({ speaker: { alias: "WoDX" }, whisper: game.users.filter(u => u.isGM).map(u => u.id), blind: !t.hasPlayerOwner, rolls: [res.roll],
                    content: `<div class="vta-card"><div class="vta-title">${esc(t.name)} resists ${esc(p.name)}</div><div class="vta-body">${rollBlock(FP.rollLabel(p.resist.pool) + (p.sick ? " + 3" : ""), res)}</div></div>` });
                if (!p.sick) s = got - n(res.successes);
            }
            if (p.sick) {
                const lv = Math.max(0, 6 - n(res?.successes));
                if (lv && combat()?.applyDamage) await combat().applyDamage(t, "aggravated", lv);
                out.push(`${t.name}: ${lv ? `${lv} aggravated levels from the infection` : "fights off the infection"}`);
                continue;
            }
            if (s < 1) { out.push(`${t.name} resists`); continue; }
            if (p.drain) {
                const attrs = p.drain.attr === "physical" ? ["strength", "dexterity", "stamina", ...(p.drain.appearance ? ["appearance"] : [])] : [p.drain.attr];
                const upd = {};
                for (const k of attrs) { const a = t.system?.attributes?.[k]; if (a) { upd[`system.attributes.${k}.bonus`] = n(a.bonus) - p.drain.by; upd[`system.attributes.${k}.total`] = Math.max(0, n(a.total ?? a.value) - p.drain.by); } }
                if (Object.keys(upd).length) await t.update(upd);
                await chron()?.timed?.applyTimed?.(t, { name: p.name, img: "icons/svg/degen.svg", duration: p.drain.days ? { kind: "time", seconds: p.drain.days * 86400 } : { kind: "scene" },
                    key: `wodx-fomor-drain-${p.key}`, revert: { key: "wodx-actions.fomorDrainEnd", data: { attrs, by: p.drain.by } }, source: FP.pageOf(p), description: p.fx });
                out.push(`${t.name}: ${attrs.join(", ")} one lower for ${p.drain.days ? "a day" : "the scene"}`);
            }
            if (p.dull) { await t.setFlag(MOD, "powerDulled", { dice: s, by: actor.name, at: Date.now() }); out.push(`${t.name}'s next supernatural power has ${s} dice fewer`); }
            if (p.gnosisDrain) {
                const g = t.system?.advantages?.gnosis;
                if (g && n(g.temporary) > 0) { const lost = Math.ceil(n(g.temporary) * p.gnosisDrain); await t.update({ "system.advantages.gnosis.temporary": n(g.temporary) - lost }); out.push(`${t.name} loses ${lost} Gnosis`); }
            }
            if (p.feed) {
                if (isFomor(t)) {
                    const k = ["strength", "dexterity", "stamina"][Math.floor(Math.random() * 3)], a = t.system?.attributes?.[k];
                    if (a) await t.update({ [`system.attributes.${k}.bonus`]: n(a.bonus) + 1, [`system.attributes.${k}.total`]: n(a.total ?? a.value) + 1 });
                    await chron()?.timed?.applyTimed?.(t, { name: p.name, duration: { kind: "scene" }, key: "wodx-fomor-udder", revert: { key: "wodx-actions.fomorDrainEnd", data: { attrs: [k], by: -1 } }, source: FP.pageOf(p), description: p.fx });
                    out.push(`${t.name} suckles: ${k} one higher for the scene`);
                } else out.push(`${t.name} is fed for ${got} day${got === 1 ? "" : "s"}`);
            }
        }
        return out.length ? `<div class="vta-res">${out.map(esc).join("; ")}.</div>` : "";
    }

    /** Sense Gaia, Sense the Unnatural, Skittersight: who is near, by kind (the senses' own reading of the scene). */
    function sense(actor, p, got) {
        const me = actor.getActiveTokens?.()?.[0];
        if (!me || !canvas?.tokens) return "";
        const yards = 20, unit = canvas.scene?.grid?.distance ?? 5, units = canvas.scene?.grid?.units ?? "ft";
        const range = (/yd|yard/i.test(units) ? yards : yards * 3) / unit * (canvas.grid?.size ?? 100);
        const near = canvas.tokens.placeables.filter(t => t !== me && t.actor && Math.hypot(t.center.x - me.center.x, t.center.y - me.center.y) <= range);
        const kindOf = a => String(ctx.profile?.(a) ?? a.type ?? "");
        const gaia = a => /lupine|garou|kinfolk|fera/i.test(kindOf(a)) || !!a.flags?.world?.wodx?.kinfolk;
        const odd = a => !/mortal/i.test(kindOf(a));
        const hits = near.filter(t => p.sense === "gaia" ? gaia(t.actor) : p.sense === "unnatural" ? odd(t.actor) : true);
        for (const t of hits) t.ring?.flashColor?.(Color.from(p.sense === "gaia" ? "#3a7d2c" : "#7a3aa8"));
        const who = hits.map(t => t.name).slice(0, Math.max(1, got * 2));
        return `<div class="vta-note">${hits.length ? `Sensed within ${yards} yards: ${esc(who.join(", "))}${got >= 3 && p.sense === "gaia" ? " (the tribe is plain)" : ""}.` : `Nothing of that kind within ${yards} yards.`}</div>`;
    }

    async function numbing(actor) {
        const C = chron();
        if (actor.statuses?.has?.(`wodx-${NUMBING.id}`)) { notify(`${actor.name} is already numb.`); return null; }
        const lim = await LIM.gate(actor, { name: "Numbing", level: 1 });
        if (!lim) return null;
        if (!(await spendWillpower(actor, 1))) return null;
        const dice = n(attr(actor, "stamina")) + n(findAbility(actor, "medicine")?.value);
        const r = await rollPool(dice, 6 + n(lim.diff));
        let body = rollBlock("Stamina + Medicine", r, lim.diff ? [`Drained +${lim.diff}`] : []);
        const got = r.botch ? 0 : n(r.successes);
        if (got > 0) {
            await actor.setFlag(MOD, "numbTrack", n(actor.system?.traits?.health?.totalhealthlevels?.max) || 7);
            await C?.timed?.applyTimed?.(actor, { name: "Numbing", img: NUMBING.img, condition: NUMBING.id, duration: { kind: "scene" }, key: "wodx-fomor-numbing",
                revert: { key: "wodx-actions.numbingEnd", data: {} }, source: PAGE, description: NUMBING.summary });
            // WoDX Combat counts the health track again on the next update: the three levels show on the sheet
            await actor.setFlag(MOD, "bodyAt", Date.now());
            body += `<div class="vta-res good">${esc(actor.name)} goes numb: no wound penalties and three more health levels for the scene. The words come out thick and slurred.</div>`
                + `<div class="vta-note">When it wears off the levels go; past Incapacitated, the fomor dies.</div>`;
        } else body += `<div class="vta-res bad">${r.botch ? "A botch: " : ""}the numbness will not come.</div>`;
        body += `<div class="wodx-quiet">${PAGE}</div>`;
        await lim.done({ successes: got });
        return post(actor, `${actor.name}: Numbing`, body, [r.roll]);
    }

    /** B5617: the powers an NPC fomor may pick (main.js npcPowers reads keywords from here). */
    function powersFor(actor) {
        const used = actor.getFlag(MOD, "fomorUsed") ?? {};
        return FP.choosable(fomorPowersOf(actor).map(x => x.power)).filter(p => FP.usesLeft(p, used, { ...stamp(), stamina: n(attr(actor, "stamina")) }).ok)
            .map(p => ({ use: "useFomor", field: "fomor", value: p.key, name: p.name, level: 1, set: "fomor", id: p.key, keywords: p.keywords }));
    }

    return { power, use, numbing, powersFor, settle, rageAction };
}
