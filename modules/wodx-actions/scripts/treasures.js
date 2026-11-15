/**
 * WoDX Actions: faerie Treasures in play (B6560-B6566). Rules: fae-treasures.js.
 *
 *   Use a Treasure      the keeper's Treasures: faerie dust thrown (Dexterity + Athletics, the target's Willpower
 *                       against it), arrows shot, the Gale Flute played, Vulcan's Hammer at the forge, a charmed
 *                       object's held cantrip let go, a Changeling 20th Treasure's Art (a Glamour point, from the
 *                       Treasure's store first, and Intelligence + Gremayre or Glamour to activate)
 *   Give a Treasure     the Storyteller hands one of the book's Treasures, or a Changeling 20th Treasure of any Art
 *   Make one            the Charm, Persisting Charm, True Enchantment and Dominion Writ cantrips put a known cantrip
 *                       into an object (fae-da.js casts them; this makes the item)
 *   On their own        Excalibur's Scabbard takes back the harm it turns; Shatterhammer, the Sword of Drowning and the
 *                       Gray Sword do more when their blow lands; an oathcrafted Treasure whose oath lapses goes dead
 *
 * Built by main.js with its helpers (ctx).
 */
import * as TR from "./fae-treasures.js";
import * as DC from "./fae-da-cantrips.js";
import * as CA from "./c20-arts.js";
import * as EF from "./effects.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const combat = () => game.modules.get("wodx-combat")?.api;
export const flagOf = item => item?.getFlag?.(MOD, "treasure") ?? item?.flags?.[MOD]?.treasure ?? null;
export const treasuresOf = actor => [...(actor?.items ?? [])].filter(i => flagOf(i));
const holding = (actor, key) => treasuresOf(actor).find(i => flagOf(i)?.key === key && !flagOf(i)?.lapsed);
const tokenOf = a => a?.getActiveTokens?.()?.[0] ?? null;
const targetsOf = actor => [...(game.user.targets ?? [])].filter(t => t.actor && t.actor !== actor);

/** What a Treasure is called on the menus, with what it holds and its charges. */
export function labelOf(item) {
    const f = flagOf(item) ?? {};
    const t = TR.TREASURES[f.key];
    const bits = [];
    if (f.uses != null) bits.push(`${f.uses} use${f.uses === 1 ? "" : "s"} left`);
    if (f.glamour != null) bits.push(`${f.glamour} Glamour stored`);
    if (f.charges != null) bits.push(`${f.charges} charges`);
    if (f.lapsed) bits.push("its oath broken: dead");
    return `${item.name}${t ? ` (${t.book === "c20" ? "C20" : "DA"} ${t.level})` : ""}${bits.length ? `: ${bits.join(", ")}` : ""}`;
}

/* The last blows, by chat message, so a hit that is applied later knows its weapon (Excalibur's Scabbard, the swords) */
const BLOWS = new Map();
let CTX = null;

export function setup() {
    chron()?.timed?.registerReverter?.("wodx-actions.faeItemOff", async (actor, d) => {
        const it = d?.item ? actor.items.get(d.item) : null;
        if (it && d.was) await it.update(d.was);
        if (d?.banality) await actor.update({ "system.advantages.banality.temporary": Math.max(0, n(actor.system?.advantages?.banality?.temporary) - n(d.banality)) });
    });
    Hooks.on("wodxAttackRolled", (attacker, d) => {
        if (!d?.messageId) return;
        BLOWS.set(d.messageId, { weapon: d.weapon ?? "", brawl: !!d.brawl, bite: !!d.bite, ranged: !!d.ranged, attacker: attacker?.uuid ?? null });
        if (BLOWS.size > 60) BLOWS.delete(BLOWS.keys().next().value);
    });
    Hooks.on("wodxDamageApplied", (actor, d) => { if (isActiveGM()) afterBlow(actor, d).catch(e => console.warn("WoDX | treasures", e)); });
}

/** After harm lands: the scabbard's keeper, and the sword that struck. */
async function afterBlow(actor, d) {
    if (!actor || !d || !(n(d.levels) > 0)) return;
    const blow = d.messageId ? BLOWS.get(d.messageId) : null;
    // Excalibur's Scabbard (either book): the keeper's harm is put back as it was, or held at Injured
    const sc = holding(actor, "excalibur-scabbard") ?? holding(actor, "c20-excalibur-scabbard");
    if (sc && d.before && d.after) {
        const book = flagOf(sc).key === "excalibur-scabbard" ? "da" : "c20";
        const blade = blow ? !blow.brawl && !blow.bite && TR.isBlade(blow.weapon) : false;
        const keep = TR.scabbardKeeps(book, { type: d.type, blade, of: d.fireSun ? "fire" : "" }, d.before, d.after);
        if (keep.kept !== "landed") {
            await combat()?.setDamage?.(actor, { bashing: n(keep.bashing), lethal: n(keep.lethal), aggravated: n(keep.aggravated) });
            await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="vta-card"><div class="vta-title">${esc(sc.name)}</div><div class="vta-body"><div class="vta-big good">${keep.kept === "ignored" ? `The ${esc(d.type)} harm draws no blood from ${esc(actor.name)}.` : `${esc(actor.name)} falls no further than Injured.`}</div><div class="wodx-quiet">${esc(TR.pageOf(TR.TREASURES[flagOf(sc).key]))}</div></div></div>` });
        }
    }
    // The sword that struck: Shatterhammer, the Sword of Drowning, the Gray Sword
    const atk = d.attacker ? fromUuidSync(d.attacker) : null;
    const attacker = atk?.actor ?? atk;
    if (!attacker || !blow?.weapon) return;
    const w = treasuresOf(attacker).find(i => i.name === blow.weapon && !flagOf(i).lapsed);
    const key = flagOf(w)?.key;
    if (!key) return;
    const page = TR.pageOf(TR.TREASURES[key]);
    const say = (title, html) => ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: attacker }), content: `<div class="vta-card"><div class="vta-title">${esc(title)}</div><div class="vta-body">${html}<div class="wodx-quiet">${esc(page)}</div></div></div>` });
    if (key === "shatterhammer") {
        await combat()?.applyDamage?.(actor, "aggravated", 2);
        return say("Shatterhammer", `<div class="vta-big bad">The earth sprite bursts inside ${esc(actor.name)}: 2 aggravated levels more.</div>`);
    }
    if (key === "sword-of-drowning") {
        // The target loses this turn, and rolls Willpower (6) each turn after; three failures, or a botch, and they drown
        let fails = 1, lines = [`Turn 1: sea water fills the lungs; the turn is lost.`], drowned = false;
        for (let turn = 2; turn <= 4 && fails > 0 && !drowned; turn++) {
            const r = await CTX.rollPool(Math.max(1, n(actor.system?.advantages?.willpower?.temporary ?? actor.system?.advantages?.willpower?.permanent)), 6);
            const s = TR.drowningStep(fails, r);
            fails = s.fails; drowned = s.drowned;
            lines.push(`Turn ${turn}: Willpower ${r.botch ? "botches" : `${r.successes} success${r.successes === 1 ? "" : "es"}`}${s.lostTurn ? ", the turn is lost" : ", the water is coughed up"}.`);
        }
        const lost = lines.filter(l => /lost/.test(l)).length;
        await chron()?.timed?.applyTimed?.(actor, { name: drowned ? "Drowning (the Sword of Drowning)" : "Choking on sea water", condition: drowned ? "incapacitated" : "dazed",
            duration: drowned ? { kind: "scene" } : { kind: "rounds", rounds: lost }, key: "wodx-sword-drowning", source: page,
            description: drowned ? "Drowned on dry land: dead unless someone saves them at once." : `Loses ${lost} turn${lost === 1 ? "" : "s"} coughing up sea water.` });
        return say("The Sword of Drowning", `${lines.map(l => `<div class="vta-res">${esc(l)}</div>`).join("")}<div class="vta-big ${drowned ? "bad" : ""}">${esc(actor.name)} ${drowned ? "drowns on dry land" : `loses ${lost} turn${lost === 1 ? "" : "s"}`}.</div>`);
    }
    if (key === "c20-gray-sword") {
        const b = actor.system?.advantages?.banality;
        if (!b) return say("The Gray Sword", `<div class="vta-res">${esc(actor.name)} has no Banality to raise.</div>`);
        const was = actor.effects?.filter?.(e => /^Gray Sword/.test(e.name)).length ?? 0;
        await actor.update({ "system.advantages.banality.temporary": Math.min(10, n(b.temporary) + 1) });
        await chron()?.timed?.applyTimed?.(actor, { name: `Gray Sword's Banality ${was + 1}`, duration: { kind: "time", seconds: DAY * (was + 1) }, key: `wodx-gray-sword-${was + 1}`,
            source: page, description: "A point of Banality from the Gray Sword; each fades a day after the one before it.", revert: { key: "wodx-actions.faeItemOff", data: { banality: 1 } } });
        return say("The Gray Sword", `<div class="vta-big bad">${esc(actor.name)} gains a point of Banality.</div>`);
    }
}

export function build(ctx) {
    CTX = ctx;
    const { post, rollPool, rollBlock, dialog, attr, findAbility, notify } = ctx;
    const ab = (a, k) => n(a?.system?.abilities?.[k]?.value) || n(findAbility?.(a, k)?.value);
    const pool = (a, [x, y]) => n(attr(a, x)) + ab(a, y);

    /** A resisting roll: the player's in the open, an NPC's whispered to the Storyteller (standing rule 19). */
    async function resist(t, dice, diff, what) {
        const r = await rollPool(Math.max(1, dice), diff);
        if (r.roll) await ChatMessage.create({ speaker: { alias: "WoDX" }, rolls: [r.roll], ...(t.hasPlayerOwner ? {} : { whisper: gmIds(), blind: true }),
            content: `<div class="vta-card"><div class="vta-title">${esc(t.name)} resists ${esc(what)}</div><div class="vta-body">${rollBlock(`Willpower (${diff})`, r)}</div></div>` });
        return r;
    }

    /** The card for a result list, with the effects buttons. */
    async function finish(actor, title, body, results, s, rolls = [], name = title) {
        let items = [];
        if (results.length && EF.isOn()) {
            const pp = EF.planOf(actor, results, s, { name, line: "Treasure" });
            body += pp.html;
            items = pp.items.filter(x => x.route !== "off" && x.route !== "st");
        }
        return post(actor, title, body, rolls.filter(Boolean), items.length ? { kind: "effects", caster: actor.name, items } : undefined);
    }

    async function spendUse(item) {
        const f = flagOf(item);
        if (f.uses == null) return;
        if (f.uses <= 1) return item.delete();
        return item.setFlag(MOD, "treasure", { ...f, uses: f.uses - 1 });
    }

    /* -------------------------------------------------------------- */
    async function use(actor, itemId = null) {
        const list = treasuresOf(actor);
        if (!list.length) return notify(`${actor.name} carries no Treasure. The Storyteller can give one (Give a Treasure).`);
        const pick = itemId ? list.find(i => i.id === itemId) : null;
        if (pick) return useOne(actor, pick);
        const content = `<form><div class="form-group"><label>The Treasure</label>${list.length > 5 ? searchBox("select[name=t]", "Search Treasures…", "Search Treasures") : ""}<select name="t" data-fixed>${list.map(i => `<option value="${i.id}">${esc(labelOf(i))}</option>`).join("")}</select></div></form>`;
        return dialog(`Use a Treasure: ${actor.name}`, content, "Use", async fd => useOne(actor, actor.items.get(fd.t)));
    }

    async function useOne(actor, item) {
        if (!item) return null;
        const f = flagOf(item);
        if (f.lapsed) return notify(`${item.name} is dead: its oath was broken (${TR.TREASURES[f.key]?.oath?.what ?? ""}).`);
        if (f.expires != null && game.time.worldTime > n(f.expires)) { await item.delete(); return notify(`${item.name}: the magic in it faded at the Dominion's hour.`); }
        if (f.key === "imbued") return useImbued(actor, item, f);
        if (f.key === "c20art") return useArt(actor, item, f);
        const t = TR.TREASURES[f.key];
        if (!t) return notify(`${item.name}: not a Treasure WoDX knows.`);
        if (t.use === "passive" && t.does !== "friarscross") return notify(`${item.name} works by itself while ${actor.name} carries it.`);
        if (t.use === "weapon") return notify(`${item.name} works when its blow lands: attack with it as a weapon.`);
        if (t.needDawn) {
            const dawn = n(actor.getFlag(MOD, "daFae")?.dominions?.dawn);
            if (dawn < t.needDawn) return notify(`${item.name} answers only a fae with Dawn ${t.needDawn} or more (${actor.name} has ${dawn}).`);
        }
        if (t.does === "forge") return forge(actor, item, t);
        if (t.does === "lightning") return lightning(actor, item, f, t);
        if (t.does === "friarscross") return friarsCross(actor, item, t);
        const roll = TR.useRoll(t);
        let body = `<div class="vta-res">${esc(t.fx)}</div>`;
        let s = roll.auto ?? 0, r = null;
        if (roll.pool) {
            r = await rollPool(Math.max(1, pool(actor, roll.pool)), roll.diff);
            body = rollBlock(`${roll.pool.map(k => k[0].toUpperCase() + k.slice(1)).join(" + ")} (${roll.diff})`, r) + body;
            s = r.botch ? 0 : r.successes;
        }
        const tg = targetsOf(actor);
        if (t.romance && tg[0]) {
            const age = chron()?.age?.romance?.(actor, tg[0].actor) ?? { ok: false, why: "The age check is not available." };
            if (!age.ok) return notify(age.why);
        }
        if (t.kind === "dust" || t.uses) await spendUse(item);
        if (s < 1) return post(actor, `${actor.name} uses ${item.name}`, body + `<div class="vta-big">${t.kind === "dust" ? "The dust misses." : "Nothing comes of it."}</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`, [r?.roll].filter(Boolean));
        // Faerie dust: the target's Willpower against it
        const rd = TR.dustResist(t);
        if (rd && tg[0]) {
            const w = await resist(tg[0].actor, n(tg[0].actor.system?.advantages?.willpower?.permanent), rd, item.name);
            if (!w.botch && w.successes > 0) return post(actor, `${actor.name} uses ${item.name}`, body + `<div class="vta-big">${esc(tg[0].name)} shrugs it off.</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`, [r?.roll].filter(Boolean));
        }
        let results = TR.treasureResults(f.key, s);
        if (t.does === "gale") {
            const g = TR.galeOf(s);
            body += `<div class="vta-res">${esc(g.text)}.</div>`;
            const extra = [];
            if (g.harm) extra.push({ key: "harm", who: g.harm.who, ask: true, out: { label: t.name, source: TR.pageOf(t), kind: "damage", levels: 0, dice: g.harm.dice, type: g.harm.type, soak: true, text: `${g.harm.dice} ${g.harm.type} dice` } });
            if (g.shift) extra.push({ key: "fortune", who: "one", out: { label: t.name, source: TR.pageOf(t), kind: "timed", name: "In the gale", timed: { kind: "scene" }, duration: "the scene", shift: g.shift, successes: s, text: "physical actions two harder in the wind" } });
            results = [...results.map(x => ({ ...x, out: { ...x.out, ctx: { weather: g.weather } } })), ...extra];
            // tornadoes roll their dice as harm: the card's damage rolls them, soaked as usual
            for (const x of extra.filter(e => e.key === "harm")) { x.out.levels = (await rollPool(x.out.dice, 6, { canBotch: false })).successes; x.out.text = `${x.out.levels} lethal level${x.out.levels === 1 ? "" : "s"} from ${x.out.dice} dice, soaked as usual`; }
        }
        if (f.key === "cauldron-of-nightmares") await item.setFlag(MOD, "treasure", { ...f, owed: true, usedAt: game.time.worldTime });
        body += `<div class="vta-big good">${esc(item.name)}: ${s} success${s === 1 ? "" : "es"}.</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`;
        return finish(actor, `${actor.name} uses ${item.name}`, body, results, s, [r?.roll], t.name);
    }

    /** A charmed object (Charm, Persisting Charm, True Enchantment, Dominion Writ): the held cantrip, no roll. */
    async function useImbued(actor, item, f) {
        const c = DC.CANTRIPS[f.cantrip];
        if (!c) return notify(`${item.name}: the cantrip in it is not one WoDX knows.`);
        const tg = targetsOf(actor);
        if (c.romance && tg[0]) { const age = chron()?.age?.romance?.(actor, tg[0].actor) ?? { ok: false, why: "The age check is not available." }; if (!age.ok) return notify(age.why); }
        const s = n(f.successes);
        await spendUse(item);
        const body = `<div class="vta-big good">${esc(item.name)} lets go of ${esc(c.name)}: ${s} success${s === 1 ? "" : "es"}.</div><div class="vta-res">${esc(c.fx)}</div><div class="wodx-quiet">${esc(DC.pageOf(c))}; ${esc(TR.IMBUE[f.mode]?.label ?? "Charm")}, Dark Ages: Fae p. ${TR.IMBUE[f.mode]?.page ?? 126}</div>`;
        return finish(actor, `${actor.name} uses ${item.name}`, body, TR.imbuedResults(f), s, [], c.name);
    }

    /** A Changeling 20th Treasure's Art: a Glamour point (the Treasure's own first), then the activation roll. */
    async function useArt(actor, item, f) {
        const c = CA.CANTRIPS[f.cantrip];
        if (!c) return notify(`${item.name}: the cantrip in it is not one WoDX knows.`);
        const g = actor.system?.advantages?.glamour ?? {};
        const draw = TR.glamourDraw(f.glamour, g.temporary, 1);
        if (!draw.ok) return notify(`${actor.name} has no Glamour to wake ${item.name}, and it holds none.`);
        const content = `<form><p>${esc(item.name)}: ${esc(c.fx)}</p>
          <div class="form-group"><label>Activation</label><select name="pool" data-fixed><option value="gremayre">Intelligence + Gremayre (${pool(actor, ["intelligence", "gremayre"])})</option><option value="glamour">Glamour (${n(g.permanent)})</option></select></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" min="3" max="10" value="6"/></div></form>`;
        return dialog(`Use ${item.name}`, content, "Use", async fd => {
            if (draw.fromItem) await item.setFlag(MOD, "treasure", { ...f, glamour: n(f.glamour) - draw.fromItem });
            if (draw.fromUser) await actor.update({ "system.advantages.glamour.temporary": n(g.temporary) - draw.fromUser });
            const dice = fd.pool === "glamour" ? n(g.permanent) : pool(actor, ["intelligence", "gremayre"]);
            const r = await rollPool(Math.max(1, dice), n(fd.diff) || 6);
            const s = r.botch ? 0 : r.successes;
            let body = rollBlock(fd.pool === "glamour" ? "Glamour" : "Intelligence + Gremayre", r, [draw.fromItem ? "a Glamour point from the Treasure" : "a Glamour point from the keeper"]);
            body += s ? `<div class="vta-big good">${esc(c.name)}: ${s} success${s === 1 ? "" : "es"}.</div>` : `<div class="vta-big">${esc(item.name)} stays quiet.</div>`;
            body += `<div class="wodx-quiet">Changeling 20th pp. 324-325</div>`;
            const res = s ? CA.cantripResults(f.cantrip, s, { glamour: n(g.permanent), willpower: n(actor.system?.advantages?.willpower?.permanent) }, { name: c.name, source: "Changeling 20th p. 324" }) : [];
            return finish(actor, `${actor.name} uses ${item.name}`, body, Array.isArray(res) ? res : res?.results ?? [], s, [r.roll], c.name);
        });
    }

    /** Vulcan's Hammer: a weapon of the keeper's does a level more harm, or armour soaks a die more (the C20 hammer: a success each). */
    async function forge(actor, item, t) {
        const goods = [...actor.items].filter(i => (i.type === "Melee Weapon" || i.type === "Armor") && !i.getFlag(MOD, "forged"));
        if (!goods.length) return notify(`${actor.name} has no unforged weapon or armour to work.`);
        const content = `<form><p>${esc(t.fx)}</p><div class="form-group"><label>Forge</label><select name="g" data-fixed>${goods.map(i => `<option value="${i.id}">${esc(i.name)} (${i.type === "Armor" ? "armour" : "weapon"})</option>`).join("")}</select></div></form>`;
        return dialog(`${item.name}: ${actor.name}`, content, "Forge", async fd => {
            const g = actor.items.get(fd.g);
            if (!g) return null;
            let by = 1, r = null;
            const roll = TR.useRoll(t);
            if (roll.pool) { r = await rollPool(Math.max(1, pool(actor, roll.pool)), roll.diff); by = r.botch ? 0 : r.successes; }
            if (by < 1) return post(actor, `${actor.name} works at the forge`, rollBlock("Intelligence + Gremayre", r) + `<div class="vta-big">The forging takes nothing from the hammer.</div>`, [r?.roll].filter(Boolean));
            const upd = g.type === "Armor" ? { "system.soak.bashing": n(g.system?.soak?.bashing) + by, "system.soak.lethal": n(g.system?.soak?.lethal) + by }
                : { "system.damage.bonus": n(g.system?.damage?.bonus) + by };
            await g.update({ ...upd, [`flags.${MOD}.forged`]: { by, with: item.name } });
            const body = (r ? rollBlock("Intelligence + Gremayre", r) : "") + `<div class="vta-big good">${esc(g.name)} ${g.type === "Armor" ? `soaks ${by} die${by === 1 ? "" : "s"} more` : `does ${by} level${by === 1 ? "" : "s"} more harm`}, for good.</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`;
            return post(actor, `${actor.name} forges with ${item.name}`, body, [r?.roll].filter(Boolean));
        });
    }

    /** The Lightning gun: charges from Glamour, a shot of five dice. */
    async function lightning(actor, item, f, t) {
        const content = `<form><p>${esc(t.fx)}</p><p>${n(f.charges)} charges.</p>
          <div class="form-group"><label>Glamour to put in first (five charges each past the first)</label><input type="number" name="g" min="0" max="3" value="${n(f.charges) ? 0 : 2}"/></div></form>`;
        return dialog(`${item.name}: ${actor.name}`, content, "Fire", async fd => {
            let charges = n(f.charges);
            const g = Math.max(0, n(fd.g));
            if (g) {
                const have = n(actor.system?.advantages?.glamour?.temporary);
                if (have < g) return notify(`${actor.name} has ${have} Glamour.`);
                await actor.update({ "system.advantages.glamour.temporary": have - g });
                charges = TR.lightningCharges(g, charges);
            }
            if (charges < 1) { await item.setFlag(MOD, "treasure", { ...f, charges }); return notify(`${item.name} has no charges: put in two Glamour or more.`); }
            const r = await rollPool(Math.max(1, pool(actor, ["dexterity", "firearms"])), 6);
            await item.setFlag(MOD, "treasure", { ...f, charges: charges - 1 });
            let body = rollBlock("Dexterity + Firearms (6)", r, [`${charges - 1} charges left`]);
            const tg = targetsOf(actor)[0];
            if (!r.botch && r.successes > 0 && tg) {
                await combat()?.soakAndApply?.(tg, { apply: true, mode: "pool", amount: 5, type: "lethal", soak: true });
                body += `<div class="vta-big good">Lightning strikes ${esc(tg.name)}: five dice of lethal harm, soaked as usual.</div>`;
            } else body += `<div class="vta-big">${r.successes > 0 ? "A bolt cracks across the room (no target picked)." : "The bolt goes wide."}</div>`;
            return post(actor, `${actor.name} fires ${item.name}`, body + `<div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`, [r.roll].filter(Boolean));
        });
    }

    /** The Friar's Cross bursts: the keeper's Banality in lethal harm to every dreaming being near, and faerie magic stops. */
    async function friarsCross(actor, item, t) {
        const b = Math.max(1, n(actor.system?.advantages?.banality?.permanent));
        const results = [{ key: "harm", who: "all", ask: true, out: { label: t.name, source: TR.pageOf(t), kind: "damage", levels: b, type: "lethal", soak: false, text: `${b} lethal levels to each dreaming being within 50 yards` } }];
        await item.delete();
        const body = `<div class="vta-big bad">The Friar's Cross bursts.</div><div class="vta-res">${esc(t.fx)}</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div>`;
        return finish(actor, `${actor.name}: the Friar's Cross`, body, results, 1, [], t.name);
    }

    /* -------------------------------------------------------------- */
    /** The Storyteller gives a Treasure: one of the book's, or a Changeling 20th Treasure holding an Art's cantrip. */
    async function give(actor) {
        if (!game.user.isGM) return notify("Only the Storyteller hands out Treasures.");
        const opts = TR.KEYS.map(k => `<option value="${k}">${esc(TR.TREASURES[k].name)} (${TR.TREASURES[k].book === "c20" ? "Changeling 20th" : "Dark Ages"} ${TR.TREASURES[k].level})</option>`).join("");
        const arts = TR.c20Choices().map(c => `<option value="${c.id}">${esc(c.art[0].toUpperCase() + c.art.slice(1))} ${c.level}: ${esc(c.name)}</option>`).join("");
        const content = `<form>
          <div class="form-group"><label>A Treasure from the books</label>${searchBox("select[name=key]", "Search Treasures…", "Search Treasures")}<select name="key" data-fixed><option value="">(a Changeling 20th Treasure of an Art, below)</option>${opts}</select></div>
          <div class="form-group"><label>Or an Art's cantrip</label>${searchBox("select[name=art]", "Search cantrips…", "Search cantrips")}<select name="art" data-fixed><option value="">(none)</option>${arts}</select></div>
          <div class="form-group"><label>The object</label><input type="text" name="object" value="" placeholder="a silver comb"/></div>
          <div class="form-group"><label>Glamour stored in it (Changeling 20th)</label><input type="number" name="glamour" min="0" max="10" value="0"/></div>
        </form>`;
        return dialog(`Give a Treasure: ${actor.name}`, content, "Give", async fd => {
            const data = fd.key ? TR.bookItem(fd.key, { glamour: n(fd.glamour) }) : fd.art ? TR.c20Item({ cantrip: fd.art, glamour: n(fd.glamour), object: fd.object }) : null;
            if (!data) return notify("Pick a Treasure or an Art's cantrip.");
            if (fd.key && fd.object) data.name = `${String(fd.object).slice(0, 60)} (${data.name})`;
            if (data.flags[MOD].treasure.kept === null) data.flags[MOD].treasure.kept = game.time.worldTime;
            const [it] = await actor.createEmbeddedDocuments("Item", [data]);
            return post(actor, `${actor.name} receives ${it.name}`, `<div class="vta-res">${esc(it.name)} is now in ${esc(actor.name)}'s gear.</div>${String(data.system.description ?? "")}`);
        }, { width: 520 });
    }

    /** The making cantrips (fae-da.js casts; this makes the object): a known cantrip into an object. */
    async function imbue(actor, { mode = "charm", successes = 1, known = [], dominion = null, clock = {} } = {}) {
        const m = TR.IMBUE[mode] ?? TR.IMBUE.charm;
        const can = known.filter(c => c.preset && DC.CANTRIPS[c.preset] && !DC.CANTRIPS[c.preset].imbue && (!m.sameDominion || !dominion || c.dominion === dominion));
        if (!can.length) return notify(`${actor.name} knows no book cantrip ${m.sameDominion && dominion ? "of this Dominion " : ""}to put into an object.`);
        const content = `<form><p>${esc(m.label)}: ${esc(actor.name)} puts a cantrip into an object.</p>
          <div class="form-group"><label>The cantrip</label><select name="c" data-fixed>${can.map(c => `<option value="${c.preset}">${esc(c.name)} (${esc(c.dominion)} ${c.level})</option>`).join("")}</select></div>
          <div class="form-group"><label>The object</label><input type="text" name="object" value="" placeholder="a wooden spoon"/></div>
          <div class="form-group"><label>Successes the held cantrip has</label><input type="number" name="s" min="1" max="10" value="${Math.max(1, n(successes))}"/></div></form>`;
        return dialog(`${m.label}: ${actor.name}`, content, "Make it", async fd => {
            // A Dominion Writ of another Dominion's cantrip is one harder: WoDX takes a success off what it holds
            const s = Math.max(1, Math.min(n(successes) || 1, n(fd.s) || 1) - (mode === "writ" && DC.CANTRIPS[fd.c]?.dominion !== "day" ? n(m.otherDiff) : 0));
            const data = TR.imbuedItem({ mode, cantrip: fd.c, successes: s, object: fd.object, by: actor.name, dominion, clock, now: game.time.worldTime });
            if (!data) return null;
            const [it] = await actor.createEmbeddedDocuments("Item", [data]);
            return post(actor, `${actor.name} makes ${it.name}`, `<div class="vta-big good">${esc(it.name)}</div>${data.system.description}`);
        });
    }

    /** Oathcrafted Treasures: the keeper keeps the oath; one left too long goes dead (checked by the clock). */
    async function keepOath(actor) {
        const list = treasuresOf(actor).filter(i => TR.TREASURES[flagOf(i).key]?.oath);
        if (!list.length) return notify(`${actor.name} carries no oathcrafted Treasure.`);
        const content = `<form><div class="form-group"><label>The Treasure</label><select name="t" data-fixed>${list.map(i => `<option value="${i.id}">${esc(i.name)}: ${esc(TR.TREASURES[flagOf(i).key].oath.what)}</option>`).join("")}</select></div></form>`;
        return dialog(`Keep a Treasure's oath: ${actor.name}`, content, "Kept", async fd => {
            const it = actor.items.get(fd.t);
            const f = flagOf(it);
            if (f.lapsed) return notify(`${it.name}'s essence is already gone: the oath was broken.`);
            await it.setFlag(MOD, "treasure", { ...f, kept: game.time.worldTime, owed: false });
            return post(actor, `${actor.name} keeps ${it.name}'s oath`, `<div class="vta-res">${esc(TR.TREASURES[f.key].oath.what)}.</div>`);
        });
    }

    async function daily() {
        if (!isActiveGM()) return;
        const now = game.time.worldTime;
        for (const a of game.actors ?? []) for (const it of treasuresOf(a)) {
            const f = flagOf(it);
            if (f.key === "imbued" && f.expires != null && now > n(f.expires)) { await it.delete(); continue; }
            const t = TR.TREASURES[f.key];
            if (!t?.oath || f.lapsed) continue;
            if (TR.oathLapsed(t, f.kept, now) || (f.owed && t.afterUse && now - n(f.usedAt ?? now) > DAY)) {
                await it.setFlag(MOD, "treasure", { ...f, lapsed: true });
                await ChatMessage.create({ speaker: { alias: "WoDX" }, whisper: gmIds(), content: `<div class="vta-card"><div class="vta-title">${esc(it.name)}</div><div class="vta-body"><div class="vta-big bad">Its oath lapsed (${esc(t.oath.what)}): the bound essence is free and the Treasure is dead.</div><div class="wodx-quiet">${esc(TR.pageOf(t))}</div></div></div>` });
            }
        }
    }

    return { use, give, imbue, keepOath, daily, treasuresOf, labelOf };
}
