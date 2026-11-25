/**
 * WoDX Actions (B7927-B7930): a Dark Ages mage's everyday wonders, from the household window (Dark Ages: Mage
 * pp. 190-207; Dark Ages: Fae p. 182).
 *
 *   Enchant a wonder   a casting with the fellowship's Pillars; done the local way, one 1 is cancelled. A charm changes a
 *                      weapon on the sheet (an edge that pierces armour, iron that strikes harder); an elixir, poultice,
 *                      cask or rod is made as an item to keep or give
 *   Use a wonder       drink, eat or bind on an elixir: a timed boost or penalty, a draught that forces the truth (or a
 *                      lie), heavy sleep, a wound healed or rotting
 *   Harvest Tass       Quintessence from a creature's body, a fae's blood (a living one once a week)
 *
 * Built by mage-household.js. Pure rules: mage-wonders-rules.js.
 */
import * as W from "./mage-wonders-rules.js";
import * as M from "./mage-da-rules.js";
import * as P from "./profiles.js";
import {DAY, HOUR, WEEK} from "../../wodx-chronicle/scripts/terms.mjs";

const MOD = "wodx-actions";
const REF = W.REF;
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const applyTimed = (actor, o) => game.modules.get("wodx-chronicle")?.api?.applyTimed?.(actor, o);
const weekNow = () => Math.floor((game.time?.worldTime ?? 0) / WEEK);
const isWeapon = i => i.type === "Melee Weapon" || i.type === "Ranged Weapon";
const wonderOfItem = i => i?.getFlag?.(MOD, "wonder") ?? null;

/** The rest after a draught of vigour comes when its day ends (a reverter, so it does not cut the day itself). */
export function setup() {
    game.modules.get("wodx-chronicle")?.api?.timed?.registerReverter?.("wodx-actions.wonderAfter", async (actor, data) => {
        const d = Math.max(1, n(data?.days)), p = Math.max(1, n(data?.penalty));
        await applyTimed(actor, { name: `${data?.name ?? "A wonder"} wears off: rest, -${p} dice`, key: "wodx-effect-penalty", data: { dice: -p }, duration: { kind: "time", seconds: d * DAY }, description: "The cost of a day without fatigue.", source: data?.source ?? "" });
    });
}

export function build(ctx, { info, house, saveHouse, backlash }) {
    const { post, rollPool, rollBlock, dialog, notify } = ctx;
    const pageOf = w => `${REF} p. ${w.page}`;

    /* ---- Enchant ---- */

    async function enchant(actor) {
        const i = info(actor);
        if (!i.fellowship) { notify(`${actor.name} has no fellowship.`); return null; }
        const list = W.wondersFor(i.fellowship);
        if (!list.length) { notify(`The ${i.F.label} have no wonder of this kind in WoDX.`); return null; }
        const weapons = actor.items.filter(isWeapon);
        const lv = w => Object.entries(W.levelsFor(w, i.fellowship)).map(([k, v]) => `${M.pillarsOf(i.fellowship).find(p => p.key === k)?.label ?? k} ${v}`).join(" + ");
        const content = `<form><p>${esc(actor.name)} has ${i.quintessence?.value ?? 0} Quintessence. Enchanting is a casting: Foundation and the Pillars, its difficulty and Backlash as any spell (${REF} pp. 202-203).</p>
          <div class="form-group"><label>Wonder</label><select name="key" data-fixed>${list.map(w => `<option value="${w.key}">${esc(w.name)} (${esc(lv(w))})</option>`).join("")}</select></div>
          <div class="form-group"><label>Laid on (a charm)</label><select name="item" data-fixed><option value="">-</option>${weapons.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Done the local way, with the book's materials (cancels a 1)</label><input type="checkbox" name="local" checked/></div>
          <div class="form-group"><label>Quintessence to ease it (0-3)</label><input type="number" name="q" min="0" max="3" value="0"/></div>
          <p class="wodx-quiet">${REF} pp. 202-207.</p></form>`;
        return dialog(`Enchant a wonder: ${actor.name}`, content, "Enchant", async fd => {
            const w = W.wonderOf(fd.key);
            if (!w || !W.levelsFor(w, i.fellowship)) return null;
            const weapon = w.kind === "charm" ? actor.items.get(fd.item) : null;
            if (w.kind === "charm" && !weapon) { notify(`${w.name} is laid on a weapon: choose one.`); return null; }
            if (weapon && (weapon.getFlag(MOD, "charms") ?? []).some(c => c.key === w.key)) { notify(`${weapon.name} already bears ${w.name}.`); return null; }
            const q = Math.max(0, Math.min(3, n(fd.q)));
            const plan = M.castPlan({ levels: W.levelsFor(w, i.fellowship), ratings: i.ratings, foundation: i.foundation, fellowship: i.fellowship }, { quintessence: q, sanctum: i.sanctum });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            const spend = q + plan.steady;
            if (spend > n(i.quintessence?.value)) { notify(`${actor.name} needs ${spend} Quintessence and has ${n(i.quintessence?.value)}.`); return null; }
            if (spend) await P.adjust(actor, "quintessence", -spend);
            const r = await rollPool(plan.dice, plan.difficulty);
            const ones = W.localWayOnes(r.ones, !!fd.local);
            const out = M.castOutcome({ raw: r.raw, ones, successes: Math.max(0, r.raw - ones) }, { extra: plan.extra, quintessenceSpent: q, sanctum: i.sanctum });
            let body = rollBlock(`${esc(i.F.foundation)} ${i.foundation} + ${esc(lv(w))}`, r, [...plan.notes, ...(fd.local && r.ones ? ["the local way cancels a 1"] : []), ...(spend ? [`${spend} Quintessence spent`] : [])]);
            if (out.result === "success") {
                body += `<div class="vta-big good">${esc(w.name)} is made: ${out.successes} success${out.successes === 1 ? "" : "es"}.</div><div class="vta-res">${esc(w.does)}</div>`;
                body += await make(actor, w, out.successes, weapon);
            } else if (out.result === "failure") {
                body += `<div class="vta-big">The work comes to nothing; the materials are spoiled.</div>`;
            } else {
                body += backlash.html(actor, out);
            }
            body += `<div class="wodx-quiet">${pageOf(w)}</div>`;
            const msg = await post(actor, `${actor.name} enchants: ${w.name}`, body, [r.roll]);
            if (out.result === "backlash" && msg) await backlash.flag(msg, actor, out, plan);
            return msg;
        }, { width: 500 });
    }

    /** The wonder is made: a charm changes the weapon; anything else is an item to keep or give. */
    async function make(actor, w, successes, weapon) {
        if (w.kind === "charm") {
            if ((weapon.getFlag(MOD, "charms") ?? []).some(c => c.key === w.key)) return `<div class="vta-note">${esc(weapon.name)} already bears ${esc(w.name)}.</div>`;
            const sys = weapon.system ?? {};
            const was = { piercing: n(sys.piercing), bonus: n(sys.damage?.bonus) };
            const patch = {};
            if (w.use.piercing) patch["system.piercing"] = Math.max(was.piercing, W.piercingFrom(successes));
            if (w.use.bonus) patch["system.damage.bonus"] = was.bonus + w.use.bonus;
            const charms = [...(weapon.getFlag(MOD, "charms") ?? []), { key: w.key, was, successes }];
            await weapon.update({ ...patch, [`flags.${MOD}.charms`]: charms });
            const said = w.use.piercing ? `it ignores ${patch["system.piercing"]} of a foe's armour` : `it strikes +${w.use.bonus} harder`;
            return `<div class="vta-res">${esc(weapon.name)}: ${esc(said)} (on its sheet).</div>`;
        }
        const item = { name: w.name, type: "Item", img: "icons/svg/item-bag.svg", system: { description: `<p>${esc(w.does)}</p><p class="wodx-quiet">Made by ${esc(actor.name)}. ${pageOf(w)}</p>` },
            flags: { [MOD]: { wonder: { key: w.key, maker: actor.name, successes, made: game.time?.worldTime ?? 0 } } } };
        await actor.createEmbeddedDocuments("Item", [item]);
        return `<div class="vta-res">${esc(w.name)} is on ${esc(actor.name)}'s sheet, to keep, give or use.</div>`;
    }

    /* ---- Use ---- */

    async function useWonder(actor) {
        const mine = actor.items.filter(x => { const f = wonderOfItem(x); return f && W.wonderOf(f.key)?.kind === "elixir"; });
        if (!mine.length) { notify(`${actor.name} carries no elixir or poultice.`); return null; }
        const others = game.actors.filter(a => a.id !== actor.id && (a.isOwner || game.user.isGM));
        const content = `<form><div class="form-group"><label>Wonder</label><select name="id" data-fixed>${mine.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Given to</label><select name="to" data-fixed><option value="">${esc(actor.name)}</option>${others.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>The drinker knows its purpose (an elixir of fertility then fails)</label><input type="checkbox" name="knows"/></div></form>`;
        return dialog(`Use a wonder: ${actor.name}`, content, "Use", async fd => {
            const item = actor.items.get(fd.id);
            const f = wonderOfItem(item), w = W.wonderOf(f?.key);
            if (!w) return null;
            const who = fd.to ? game.actors.get(fd.to) : actor;
            if (!who) return null;
            const html = await take(who, w, f, { knows: !!fd.knows });
            await item.delete();
            return post(actor, `${who.name}: ${w.name}`, `${html}<div class="wodx-quiet">${pageOf(w)}</div>`);
        }, { width: 460 });
    }

    /** The wonder takes hold of `who`. Returns the chat lines. */
    async function take(who, w, f = {}, { knows = false } = {}) {
        const u = w.use, src = pageOf(w);
        const forTime = (d = 0, h = 0) => ({ kind: "time", seconds: d * DAY + h * HOUR });
        if (u.named && w.key === "fertility" && knows) return `<div class="vta-res">${esc(who.name)} knew what it was for: the elixir does nothing.</div>`;
        if (u.named) {
            await applyTimed(who, { name: u.named, key: `wodx-wonder-${w.key}`, duration: forTime(u.days), description: w.does, source: src });
            return `<div class="vta-res">${esc(who.name)} is ${esc(u.named.toLowerCase())} for ${u.days} days.</div>`;
        }
        if (u.boost) {
            await applyTimed(who, { name: `${w.name}: +${u.boost.dice} ${u.boost.on}`, key: "wodx-effect-boost", data: { dice: u.boost.dice, on: u.boost.on }, duration: forTime(u.days), description: w.does, source: src,
                revert: u.after ? { key: "wodx-actions.wonderAfter", data: { name: w.name, days: u.after.days, penalty: u.after.penalty, source: src } } : null });
            return `<div class="vta-res">${esc(who.name)}: +${u.boost.dice} dice on ${u.boost.on} rolls for ${u.days} day${u.days === 1 ? "" : "s"}${u.after ? `, then ${u.after.days} days of rest` : ""}.</div>`;
        }
        if (u.penalty) {
            await applyTimed(who, { name: `${w.name}: -${u.penalty} dice, abed`, key: "wodx-effect-penalty", data: { dice: -u.penalty }, duration: forTime(u.days), description: w.does, source: src });
            return `<div class="vta-res">${esc(who.name)} cannot rise from bed: -${u.penalty} dice for ${u.days} days.</div>`;
        }
        if (u.fortune) {
            await applyTimed(who, { name: `${w.name}: +${u.fortune.shift} difficulty`, key: `wodx-effect-fortune:wonder-${w.key}`, data: { shift: u.fortune.shift, once: false, tags: u.fortune.tags }, duration: u.scene ? { kind: "scene" } : forTime(u.days), description: w.does, source: src });
            return `<div class="vta-res">${esc(who.name)}: +${u.fortune.shift} difficulty on ${esc(u.fortune.tags.join(", "))} ${u.scene ? "this scene" : `for ${u.days} days`}.</div>`;
        }
        if (u.condition) {
            await applyTimed(who, { name: "In a heavy sleep", key: `wodx-wonder-${w.key}`, condition: u.condition, duration: forTime(0, u.hours), description: w.does, source: src });
            return `<div class="vta-res">${esc(who.name)} falls into a heavy sleep for ${u.hours} hours.</div>`;
        }
        if (u.heal) {
            const d = foundry.utils.deepClone(who.system?.health?.damage ?? {});
            const k = Math.max(1, n(f.successes));
            const fromL = Math.min(k, n(d.lethal)), fromB = Math.min(k - fromL, n(d.bashing));
            if (!fromL && !fromB) return `<div class="vta-res">${esc(who.name)} has no wound for the leech to close.</div>`;
            await ctx.setDamage(who, { bashing: n(d.bashing) - fromB, lethal: n(d.lethal) - fromL, aggravated: n(d.aggravated) });
            return `<div class="vta-res">The leech closes ${fromL + fromB} level${fromL + fromB === 1 ? "" : "s"} of ${esc(who.name)}'s wounds.</div>`;
        }
        if (u.harm) {
            await ctx.applyDamage(who, u.type, u.harm);
            return `<div class="vta-res">${esc(who.name)} takes ${u.harm} ${u.type} level${u.harm === 1 ? "" : "s"} as the wound rots.</div>`;
        }
        return `<div class="vta-res">${esc(w.does)}</div>`;
    }

    /* ---- Tass ---- */

    async function tass(actor) {
        const h = house(actor);
        const content = `<form><p>Quintessence held in a body: some creatures give it up when their flesh, blood or bone is used the right way (${REF} pp. 190-199; ${W.FAE_REF} p. 182).</p>
          <div class="form-group"><label>Source</label><select name="key" data-fixed>${W.TASS.map(t => `<option value="${t.key}">${esc(t.name)} (${t.per === "wound" ? `${t.q} a wound level` : t.q})</option>`).join("")}<option value="fae">A fae's blood (by origin)</option></select></div>
          <div class="form-group"><label>Wound levels of blood spilled (a unicorn)</label><input type="number" name="wounds" min="0" max="10" value="1"/></div>
          <div class="form-group"><label>Fae origin</label><select name="origin" data-fixed>${Object.keys(W.FAE_TASS).map(k => `<option value="${k}">${k}</option>`).join("")}</select></div>
          <div class="form-group"><label>The fae is living</label><input type="checkbox" name="living" checked/></div>
          <div class="form-group"><label>Which one (a name, for the weekly limit)</label><input type="text" name="who" maxlength="60" value=""/></div></form>`;
        return dialog(`Harvest Tass: ${actor.name}`, content, "Take it", async fd => {
            const who = String(fd.who ?? "").trim().toLowerCase().slice(0, 60);
            const taken = h.tass ?? {};
            const mark = who ? taken[`fae:${who}`] : null;
            const res = W.harvest(fd.key, { wounds: n(fd.wounds), origin: fd.origin, living: !!fd.living, lastWeek: mark?.week ?? null, week: weekNow(), taken: !!mark?.dead });
            if (!res.ok) { notify(`${actor.name}: ${res.why}.`); return null; }
            const q0 = n(P.resource(actor, "quintessence").value);
            await P.adjust(actor, "quintessence", res.q);
            const q1 = n(P.resource(actor, "quintessence").value);
            if (fd.key === "fae" && who) await saveHouse(actor, { tass: { ...taken, [`fae:${who}`]: { week: weekNow(), dead: !fd.living } } });
            const t = W.tassOf(fd.key);
            const name = t?.name ?? `A ${fd.origin} fae's blood`;
            let body = `<div class="vta-big good">${esc(name)}: ${q1 - q0} Quintessence${q1 - q0 < res.q ? ` (${res.q} given; the store is full)` : ""}.</div>`;
            if (res.note) body += `<div class="vta-res">${esc(res.note)}.</div>`;
            body += `<div class="wodx-quiet">${res.ref} p. ${res.page}</div>`;
            return post(actor, `${actor.name} harvests Tass`, body);
        }, { width: 480 });
    }

    return { enchant, useWonder, tass, take, make, rules: W };
}
