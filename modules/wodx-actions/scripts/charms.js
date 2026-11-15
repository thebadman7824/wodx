/**
 * WoDX Actions: spirit Charms (Werewolf 20th, pp. 366-368), B5650-B5659. spirit-charms.js holds the rules, in WoDX's
 * own words; this is the Foundry side.
 *
 *   The Charm window: a spirit (any actor with a Charm on its sheet) picks a Charm, pays its Essence, and the
 *   Storyteller's roll is made on Rage, Gnosis or Willpower at the book's difficulty. What the Charm does then shows on
 *   the table: harm through WoDX Combat (Blast, Freeze, Umbraquake), healing, soak and speed rows on the Charm item
 *   (Armor, Swift Flight), the token's light, name, height or hiding (Illuminate, Shapeshift, Updraft, Re-form), the
 *   scene's lights going out (Short Out, Control Electrical Systems), the weather and the map's looks (Create Wind,
 *   Freeze, Umbraquake), world results on the effects card (Flood, Create Fires, Shatter Glass, Cleanse the Blight),
 *   the Gauntlet through WoDX Otherworlds (Materialize, Spirit Static, Open Moon Bridge), and conditions or marks on
 *   the target (Corruption, Incite Frenzy, Possession, Calcify, Solidify Reality, Disorient, Tracking).
 *   Blighted Touch works by itself: whoever the spirit harms resists or is blighted.
 *   NPC spirits choose their Charms through the NPC power choice (main.js npcPowers).
 *   Resisting rolls of NPCs are whispered to the Storyteller (standing rule 19).
 */
import * as LIM from "./limits.js";
import * as SC from "./spirit-charms.js";
import * as EF from "./effects.js";
import * as E from "./effects-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const combat = () => game.modules.get("wodx-combat")?.api ?? null;
const worlds = () => (game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api : null);
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.isSelf : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const tokenOf = actor => actor?.token ?? actor?.getActiveTokens?.(true, true)?.[0] ?? null;
const yearNow = () => { try { return chron()?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };

/** The Charms on a sheet: Power items of the Charm type (or on a sheet that keeps Charms) named after a W20 Charm. */
export function charmsOf(actor) {
    const out = [];
    const keeps = !!actor?.system?.settings?.powers?.hascharms;
    for (const i of actor?.items ?? []) {
        if (i.type !== "Power") continue;
        if (i.system?.type !== "wod.types.charm" && !keeps) continue;
        const c = SC.charmOf(i.name);
        if (c) out.push({ id: i.id, key: c.key, name: i.name, charm: c, item: i });
    }
    return out;
}
const has = (actor, key) => charmsOf(actor).some(x => x.key === key);
export const isSpirit = actor => charmsOf(actor).length > 0;
export const traits = actor => SC.traitsOf(actor?.system ?? {});

/** Tokens within some yards of a token, not counting it. */
function near(tok, yards = 10) {
    if (!tok?.object || !canvas?.tokens) return [];
    const unit = n(canvas.scene?.grid?.distance) || 5, units = canvas.scene?.grid?.units ?? "ft";
    const range = (/yd|yard|m\b|meter|metre/i.test(units) ? yards : yards * 3) / unit * (canvas.grid?.size ?? 100);
    const c = tok.object.center;
    return canvas.tokens.placeables.filter(t => t !== tok.object && t.actor && Math.hypot(t.center.x - c.x, t.center.y - c.y) <= range);
}
const targetsOf = actor => [...(game.user.targets ?? [])].filter(t => t.actor && t.actor !== actor);

export function setup() {
    const C = chron();
    // What a Charm did for its time comes off when it ends: rows, the token as it was, lights, the Gauntlet, Rage
    C?.timed?.registerReverter?.("wodx-actions.charmOff", async (actor, data) => charmOff(actor, data ?? {}).catch(e => console.warn("WoDX | charm off", e)));
    // Blighted Touch: whoever the spirit harms resists or is blighted
    Hooks.on("wodxAttackRolled", (attacker, d) => { if (d?.hit && attacker && has(attacker, "blightedtouch") && d.target) blight(attacker, d.target).catch(e => console.warn("WoDX | blighted touch", e)); });
}

async function charmOff(actor, d) {
    const item = d.item ? actor.items.get(d.item) : null;
    if (item && Array.isArray(item.system?.bonuslist)) {
        const list = item.system.bonuslist.filter(b => b?.wodxCharm !== "use");
        if (list.length !== item.system.bonuslist.length) await item.update({ "system.bonuslist": list });
    }
    const tok = d.token ? fromUuidSync(d.token) : null;
    if (tok && d.was) await tok.update(d.was);
    for (const l of d.lights ?? []) { const doc = fromUuidSync(l.uuid); if (doc) await doc.update(l.was).catch(() => null); }
    if (d.gauntlet?.scene && d.gauntlet.taken) { const s = game.scenes.get(d.gauntlet.scene); if (s) await worlds()?.drift?.lever?.(s, "value", -d.gauntlet.taken, "Spirit Static ends"); }
    if (d.rage) await actor.update({ "system.advantages.rage.permanent": n(actor.system?.advantages?.rage?.permanent) + n(d.rage) });
    if (d.essence) await actor.update({ "system.advantages.essence.temporary": Math.max(0, n(actor.system?.advantages?.essence?.temporary) - n(d.essence)) });
    if (d.drop) { const it = actor.items.get(d.drop); if (it) await it.delete(); }
    if (d.attrs) {
        const upd = {};
        for (const [k, by] of Object.entries(d.attrs)) { const a = actor.system?.attributes?.[k]; if (a) { upd[`system.attributes.${k}.bonus`] = n(a.bonus) + n(by); upd[`system.attributes.${k}.total`] = n(a.total ?? a.value) + n(by); } }
        if (Object.keys(upd).length) await actor.update(upd);
    }
    if (d.flag) await actor.unsetFlag(MOD, d.flag);
}

/** A resisting roll: the player's in the open, an NPC's whispered to the Storyteller. */
async function resistRoll(ctx, t, pool, diff, what) {
    const r = await ctx.rollPool(pool, diff);
    if (r.roll) await ChatMessage.create({ speaker: { alias: "WoDX" }, rolls: [r.roll], ...(t.hasPlayerOwner ? {} : { whisper: gmIds(), blind: true }),
        content: `<div class="vta-card"><div class="vta-title">${esc(t.name)} resists ${esc(what)}</div><div class="vta-body">${ctx.rollBlock(`${pool} dice`, r)}</div></div>` });
    return r;
}

let CTX = null;
/** Blighted Touch: a Willpower roll (6, house) or the worst of the target's nature rules for three hours; a botch lasts. */
async function blight(spirit, target) {
    if (!CTX || !isActiveGM()) return null;
    const wp = n(target.system?.advantages?.willpower?.permanent ?? target.system?.willpower?.permanent);
    const r = await resistRoll(CTX, target, wp, 6, "Blighted Touch");
    if (n(r.successes) > 0 && !r.botch) return null;
    const c = SC.BY_KEY.blightedtouch, text = `${target.name}'s worst traits rule ${r.botch ? "from now on" : "for the next three hours"} (Blighted Touch).`;
    if (r.botch) await target.createEmbeddedDocuments("ActiveEffect", [{ name: "Blighted", img: "icons/svg/poison.svg", statuses: ["wodx-blighted"], description: text, flags: { [MOD]: { charm: "blightedtouch", by: spirit.name } } }]);
    else await chron()?.timed?.applyTimed?.(target, { name: "Blighted", img: "icons/svg/poison.svg", duration: { kind: "time", seconds: 3 * 3600 }, key: "wodx-charm-blight", source: SC.pageOf(c), description: text });
    return ChatMessage.create({ speaker: { alias: "WoDX" }, content: `<div class="vta-card"><h3>Blighted Touch</h3><p>${esc(text)}</p><p class="wodx-quiet">${SC.pageOf(c)}</p></div>` });
}

/* -- the window ---------------------------------------------------------- */

export function build(ctx) {
    CTX = ctx;
    const { post, rollPool, rollBlock, notify } = ctx;
    const dialog = ctx.dialog;

    function usable(actor) {
        const year = yearNow();
        return charmsOf(actor).filter(x => x.charm.kind !== "always").map(x => ({ ...x, era: SC.fitsEra(x.charm, year) }));
    }

    async function power(actor) {
        const all = charmsOf(actor);
        if (!all.length) { notify(`${actor.name} has no Charm on the sheet (add a Charm named after one of W20 pp. 366-368, such as Blast).`); return null; }
        const list = usable(actor), t = traits(actor);
        const always = all.filter(x => x.charm.kind === "always");
        const groups = Object.entries(SC.GROUPS).map(([g, label]) => {
            const xs = list.filter(x => x.charm.group === g);
            return xs.length ? `<optgroup label="${esc(label)}">${xs.map(x => `<option value="${x.key}"${x.era ? "" : " disabled"}>${esc(x.charm.name)}${x.era ? "" : " (not in this era)"}</option>`).join("")}</optgroup>` : "";
        }).join("");
        const content = `<form>${list.length ? `<div class="form-group"><label>Charm</label><select name="charm" data-fixed>${groups}</select></div>
            <div class="form-group wodx-charm-size"><label>How much</label><select name="size" data-fixed></select></div>
            <div class="form-group wodx-charm-specific"><label>A particular being (a Willpower roll)</label><input type="checkbox" name="specific"/></div>
            <div class="form-group wodx-charm-form"><label>Looks like</label><input type="text" name="form" placeholder="a black dog"/></div>
            <div class="form-group wodx-charm-object"><label>An object, not a living being (difficulty 4)</label><input type="checkbox" name="object"/></div>
            <div class="form-group wodx-charm-attr"><label>Attribute to take</label><select name="attr" data-fixed><option value="">The highest</option><option value="strength">Strength</option><option value="dexterity">Dexterity</option><option value="stamina">Stamina</option></select></div>
            <div class="form-group wodx-charm-to"><label>Bridge to</label><select name="to" data-fixed>${[...(game.scenes ?? [])].filter(s => s.id !== canvas?.scene?.id).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
            <p class="wodx-charm-fx"></p>` : "<p>No Charm here needs using: they all work by themselves.</p>"}
            <p>Rage ${t.rage}, Gnosis ${t.gnosis}, Willpower ${t.willpower}; Essence ${t.essence}${t.essenceMax ? ` of ${t.essenceMax}` : ""}.</p>
            ${always.length ? `<p class="wodx-quiet">Always on: ${always.map(x => esc(x.charm.name)).join(", ")}.</p>` : ""}</form>`;
        const fill = root => {
            const k = root.querySelector("[name=charm]")?.value, c = SC.BY_KEY[k];
            if (!c) return;
            const show = (cls, on) => { const el = root.querySelector(cls); if (el) el.style.display = on ? "" : "none"; };
            const size = root.querySelector("[name=size]");
            if (size) size.innerHTML = (c.sizes ?? []).map(([v, label, d]) => `<option value="${v}">${esc(label)}${d ? ` (difficulty ${d})` : ""}</option>`).join("");
            show(".wodx-charm-size", !!c.sizes?.length);
            show(".wodx-charm-specific", c.key === "shapeshift");
            show(".wodx-charm-form", c.key === "shapeshift");
            show(".wodx-charm-object", c.key === "possession");
            show(".wodx-charm-attr", c.key === "calcify");
            show(".wodx-charm-to", c.key === "moonbridge");
            const box = root.querySelector(".wodx-charm-fx");
            const cost = SC.costOf(c, { size: size?.value });
            if (box) box.textContent = `${c.fx} ${cost ? `${cost} Essence. ` : ""}${c.roll ? `Roll ${SC.rollLabel(c)}.` : "No roll."} ${SC.pageOf(c)}.`;
        };
        return dialog(`${actor.name}: Spirit Charm`, content, "Use", async fd => {
            if (!fd.charm) return true;
            return use(actor, fd.charm, { size: fd.size || null, specific: !!fd.specific, form: fd.form || "", object: !!fd.object, attr: fd.attr || "", to: fd.to || null });
        }, { render: root => { fill(root); root.querySelector("[name=charm]")?.addEventListener("change", () => fill(root)); root.querySelector("[name=size]")?.addEventListener("change", () => fill(root)); } });
    }

    async function use(actor, key, o = {}) {
        const c = SC.BY_KEY[key];
        if (!c) return null;
        const x = charmsOf(actor).find(y => y.key === key);
        if (!x) { notify(`${actor.name} does not have ${c.name}.`); return null; }
        if (!SC.fitsEra(c, yearNow())) { notify(`${c.name}: there is nothing electrical to work on in this era.`); return null; }
        const size = o.size ?? c.sizes?.[0]?.[0] ?? null;
        const tok = tokenOf(actor);
        const tg = targetsOf(actor);
        const first = tg[0]?.actor ?? null;
        if (c.once === "sceneTarget") {
            const who = first ?? actor;
            if (!SC.healLeft(actor.getFlag(MOD, "charmHealed") ?? {}, LIM.sceneNo(), who.id)) { notify(`${c.name}: ${who.name} has had this healing this scene.`); return null; }
        }
        if (["blast", "updraft", "frenzy", "calcify"].includes(c.does) && !first) { notify(`${c.name}: target someone first.`); return null; }
        if (c.does === "possess" && !first && !o.object) { notify(`${c.name}: target the one to possess first.`); return null; }
        const t = traits(actor);
        const pay = SC.canPay(c, t, { size });
        if (!pay.ok) { notify(`${c.name}: ${pay.why}.`); return null; }
        const lim = await LIM.gate(actor, { name: c.name, level: 1 });
        if (!lim) return null;
        let body = "";
        if (pay.essence) {
            await actor.update({ "system.advantages.essence.temporary": t.essence - pay.essence });
            body += `<div class="vta-parts">${esc(actor.name)} spends ${pay.essence} Essence (${t.essence - pay.essence} left).</div>`;
        }
        const rolls = [];
        let got = 1, botch = false;
        const rolled = c.roll && (c.rollIf !== "specific" || o.specific);
        if (rolled) {
            const gauntlet = c.diff === "gauntlet" && tok ? worlds()?.placeOf?.(tok.document ?? tok)?.gauntlet ?? null : null;
            const twp = first ? n(first.system?.advantages?.willpower?.permanent ?? first.system?.willpower?.permanent) : null;
            const diff = SC.diffOf(c, { size, targetWillpower: twp, gauntlet, object: o.object });
            const dice = SC.poolOf(c, t, { static: !!actor.getFlag(MOD, "spiritStatic") });
            const r = await rollPool(dice, diff + n(lim.diff));
            rolls.push(r.roll);
            botch = !!r.botch;
            got = r.botch ? 0 : n(r.successes);
            body += rollBlock(`${SC.rollLabel(c)}${actor.getFlag(MOD, "spiritStatic") ? " - 2 (Spirit Static)" : ""}`, r, lim.diff ? [`Drained +${lim.diff}`] : []);
        }
        let fx = [];
        if (got > 0) {
            body += `<div class="vta-res good">${esc(c.fx)}</div>`;
            const did = await doCharm(actor, x, c, got, { ...o, size, tok, tg, first, t, rolls });
            if (did === false) { await lim.done({ successes: 0 }); return null; }
            body += did?.html ?? "";
            const results = [...SC.resultsOf(c, got), ...(did?.results ?? [])];
            const world = did?.world ?? c.world ?? [];
            if ((results.length || world.length) && EF.isOn()) {
                const pp = EF.planOf(actor, results, did?.worldSuccesses ?? got, { name: c.name, line: "Spirit", source: SC.pageOf(c), world });
                body += pp.html;
                fx = pp.items.filter(i => i.route !== "off" && i.route !== "st");
            }
        } else {
            body += `<div class="vta-res bad">${botch ? "A botch: " : ""}the Charm does not answer.</div>`;
            if (c.key === "breakreality") body += await breakCost(actor, botch);
        }
        body += `<div class="wodx-quiet">${SC.pageOf(c)}</div>`;
        await lim.done({ successes: got });
        Hooks.callAll("wodxPowerShown", actor, { target: first, power: c.name, group: "charm", kind: "charm", line: "spirit" });
        return post(actor, `${actor.name}: ${c.name}`, body, rolls, fx.length ? { kind: "effects", caster: actor.name, items: fx } : undefined);
    }

    /** Break Reality's price on a failure: an Essence, and on a botch a Gnosis too (p. 368). */
    async function breakCost(actor, botch) {
        const a = actor.system?.advantages ?? {};
        const upd = { "system.advantages.essence.temporary": Math.max(0, n(a.essence?.temporary) - 1) };
        if (botch) upd["system.advantages.gnosis.permanent"] = Math.max(0, n(a.gnosis?.permanent) - 1);
        await actor.update(upd);
        return `<div class="vta-note">${esc(actor.name)} loses an Essence${botch ? " and a point of Gnosis" : ""}.</div>`;
    }

    /** A timed mark on an actor, undone by charmOff when it ends. */
    const mark = (a, c, data = {}, o = {}) => chron()?.timed?.applyTimed?.(a, { name: o.name ?? c.name, img: o.img ?? "icons/svg/aura.svg", condition: o.condition ?? undefined,
        duration: o.duration ?? { kind: "scene" }, key: `wodx-charm-${c.key}${o.suffix ?? ""}`, revert: { key: "wodx-actions.charmOff", data }, source: SC.pageOf(c), description: o.text ?? c.fx });

    /** Rows on the Charm item for the scene (Armor, Swift Flight). */
    async function rows(x, c, list) {
        const want = [...(x.item.system?.bonuslist ?? []).filter(b => b?.wodxCharm !== "use"),
            ...list.map(([type, setting, value]) => ({ name: `${c.name}: ${setting || type}`, type, settingtype: setting, value, isactive: true, wodxCharm: "use" }))];
        await x.item.update({ "system.bonuslist": want });
    }

    /** What each Charm does beyond the effects card. Returns {html, results, world, worldSuccesses} or false to stop. */
    async function doCharm(actor, x, c, got, o) {
        const { tok, tg, first, t } = o;
        const res = (key, who, out) => ({ key, who, out: { ...out, source: SC.pageOf(c), label: `${c.name}: ${out.label ?? E.KEYWORDS[key]?.label ?? key}` } });
        const note = s => `<div class="vta-note">${esc(s)}</div>`;
        const C = combat();
        switch (c.does) {
            case "track": {
                for (const tt of tg) tt.ring?.flashColor?.(Color.from("#7fb3ff"));
                await mark(actor, c, {}, { name: "On a spirit track" });
                return { html: note(first ? `${actor.name} has the way to ${first.name} through the Umbra.` : `${actor.name} lays or finds a spirit track; ${got} success${got === 1 ? "" : "es"} to find its way.`) };
            }
            case "realm": {
                const all = (canvas?.tokens?.placeables ?? []).filter(p => p.actor && p.actor !== actor);
                for (const p of all.slice(0, got * 3)) p.ring?.flashColor?.(Color.from("#3a7d2c"));
                return { html: note(all.length ? `In its domain: ${all.slice(0, got * 3).map(p => p.name).join(", ")}.` : "The domain is quiet.") };
            }
            case "materialize": {
                const doc = tok?.document ?? tok;
                const g = doc ? worlds()?.placeOf?.(doc)?.gauntlet ?? null : null;
                if (!SC.canMaterialize(t.gnosis, g)) { notify(`${c.name}: Gnosis ${t.gnosis} is below the Gauntlet here (${g}).`); return false; }
                const inUmbra = !!actor.statuses?.has?.("wodx-umbra");
                if (doc && inUmbra && worlds()?.sendAcross) await worlds().sendAcross(doc);
                else if (doc) await doc.update({ hidden: false, alpha: 1 });
                await mark(actor, c, {}, { name: "Materialized", img: "icons/svg/angel.svg" });
                return { html: note(`${actor.name} takes a body on this side${g !== null ? ` (Gauntlet ${g})` : ""}: it fights with its Rage, Gnosis and Willpower and has health levels.`) };
            }
            case "reform": {
                const doc = tok?.document ?? tok;
                if (doc) await doc.update({ hidden: true });
                const cb = game.combat?.combatants?.find?.(k => k.tokenId === doc?.id);
                if (cb) await cb.update({ hidden: true, defeated: true });
                return { html: note(`${actor.name} dissolves and flows home through the Umbra, out of the scene.`) };
            }
            case "armor": {
                await rows(x, c, ["bashing", "lethal", "aggravated"].map(k => ["soak_buff", k, t.gnosis]));
                await mark(actor, c, { item: x.id }, { name: "Armor", img: "icons/svg/shield.svg" });
                return { html: note(`${t.gnosis} more soak dice against every kind of harm for the scene.`) };
            }
            case "blast": {
                if (!first) { notify(`${c.name}: target someone first.`); return false; }
                await C?.soakAndApply?.(tg[0], { apply: true, mode: "pool", amount: t.rage, type: "aggravated", soak: true });
                if (has(actor, "blightedtouch")) await blight(actor, first);
                return { html: note(`${first.name} takes ${t.rage} aggravated dice: no roll to hit, no dodge.`) };
            }
            case "lights": case "shortout": {
                const off = c.does === "shortout" || o.size !== "simple";
                const lights = lightsNear(tok, 20);
                const was = lights.map(l => ({ uuid: l.uuid, was: { hidden: !!l.hidden } }));
                for (const l of lights) await l.update({ hidden: off ? true : !l.hidden });
                if (lights.length) await mark(actor, c, { lights: was }, { name: c.does === "shortout" ? "Lights shorted out" : "Machines in its grip" });
                return { html: note(`${lights.length ? `${lights.length} light${lights.length === 1 ? "" : "s"} within 20 yards ${off ? "go out" : "switch"} for the scene. ` : ""}${c.does === "shortout" ? "The wiring nearby is burnt out." : "The machine does as the spirit wills: run, stop or overload."}`) };
            }
            case "fire": {
                const world = o.size === "inferno" ? ["blaze", "fire"] : ["blaze"];
                return { world, worldSuccesses: o.size === "inferno" ? Math.max(3, got) : got, html: note(o.size === "torch" ? "A small flame, gone next turn with nothing to burn." : "") };
            }
            case "wind": {
                const w = o.size === "calm" ? "calm" : o.size === "breeze" ? "wind" : "storm";
                const results = [res("weather", "self", { kind: "weather", weather: w, label: "Weather", duration: "the scene", timed: { kind: "scene" }, text: `${E.WEATHER_SET[w].label.toLowerCase()} tonight` })];
                return o.size === "tornado" ? { results, world: ["storm"], worldSuccesses: Math.max(4, got) } : { results, world: [] };
            }
            case "illuminate": {
                const o2 = E.outcome("light", { ok: true, strength: 3, duration: 0, targets: 0 }, {});
                return { results: [res("light", "self", { ...o2, timed: { kind: "scene" }, duration: "the scene", text: "light out to 20 yards for the scene" })] };
            }
            case "flood": {
                const streets = o.size === "streets";
                return { world: streets ? ["water", "flood"] : ["water"], worldSuccesses: Math.max(3, Math.ceil(t.gnosis / 2)), html: note(streets ? "The low streets flood once the Storyteller agrees." : "A building or a block floods.") };
            }
            case "freeze": {
                const dice = SC.freezeDice(t.rage);
                await actor.update({ "system.advantages.rage.permanent": dice });
                await mark(actor, c, { rage: 1 }, { name: "Spent in the cold", img: "icons/svg/frozen.svg" });
                const hit = near(tok, 10);
                if (dice) for (const p of hit) await C?.soakAndApply?.(p, { apply: true, mode: "pool", amount: dice, type: "aggravated", soak: true });
                if (tok) await chron()?.looks?.weather?.({ scene: canvas.scene, kind: "snow", until: { seconds: 600 }, source: c.name }).catch?.(() => null);
                return { html: note(`Rage ${t.rage} to ${dice} for the scene. ${hit.length ? `${hit.map(p => p.name).join(", ")} take${hit.length === 1 ? "s" : ""} ${dice} aggravated dice.` : "No one stands near."}`) };
            }
            case "heal": {
                const who = first ?? actor;
                const used = SC.healUsed(actor.getFlag(MOD, "charmHealed") ?? {}, LIM.sceneNo(), who.id);
                await actor.setFlag(MOD, "charmHealed", used);
                let left = t.gnosis;
                const h = who.system?.health?.damage ?? {};
                const order = o.size === "aggravated" ? ["aggravated"] : ["lethal", "bashing"];
                const healed = [];
                for (const type of order) {
                    const k = Math.min(left, n(h[type]));
                    if (k > 0 && C?.healDamage) { await C.healDamage(who, type, k); left -= k; healed.push(`${k} ${type}`); }
                }
                return { html: note(healed.length ? `${who.name} heals ${healed.join(" and ")}.` : `${who.name} has no ${o.size === "aggravated" ? "aggravated" : "lethal or bashing"} harm to heal.`) };
            }
            case "bridge": {
                const to = o.to ? game.scenes.get(o.to) : null;
                if (!to || !canvas?.scene) return { html: note("A moon bridge opens; the Storyteller sets where it lands.") };
                try {
                    const w = await worlds()?.ways?.make?.("moonpath", canvas.scene, to);
                    if (w?.from) await mark(actor, c, {}, { name: "A moon bridge open", text: `To ${to.name}: walk into the light to cross.` });
                    return { html: note(w ? `A moon bridge opens to ${to.name}: step into it to cross.` : `A moon bridge opens to ${to.name}; the Storyteller moves those who cross.`) };
                } catch (e) { return { html: note(`A moon bridge opens to ${to.name}; ${e.message}`) }; }
            }
            case "peek": {
                const here = (canvas?.tokens?.placeables ?? []).filter(p => p.actor && p.actor !== actor && !p.actor.statuses?.has?.("wodx-umbra"));
                for (const p of here) p.ring?.flashColor?.(Color.from("#b0b0ff"));
                await mark(actor, c, {}, { name: "Peeking across", img: "icons/svg/eye.svg" });
                return { html: note(here.length ? `It sees across the Gauntlet: ${here.map(p => p.name).slice(0, 8).join(", ")}.` : "It sees across the Gauntlet: no one on the other side here.") };
            }
            case "shape": {
                const doc = tok?.document ?? tok;
                const form = String(o.form ?? "").trim().slice(0, 60);
                if (doc && form) { const was = { name: doc.name }; await doc.update({ name: form }); await mark(actor, c, { token: doc.uuid, was }, { name: `Looks like ${form}` }); }
                else await mark(actor, c, {}, { name: "Shapeshifted" });
                return { html: note(form ? `It looks like ${form} for the scene: the token's name shows it.` : "It takes a new look for the scene.") };
            }
            case "flight": {
                const doc = tok?.document ?? tok;
                const was = doc && "movementAction" in doc ? { movementAction: doc.movementAction ?? "walk" } : null;
                await rows(x, c, [["movement_buff", "", 3]]);
                if (doc && was) await doc.update({ movementAction: "fly" });
                await mark(actor, c, { item: x.id, token: doc?.uuid ?? null, was }, { name: "Swift Flight", img: "icons/svg/wing.svg" });
                return { html: note(`Three times its speed, up to ${SC.flightCap(t.willpower)} yards a turn, for the scene.`) };
            }
            case "tracking": {
                if (!first) return { html: note("It follows its quarry's trail.") };
                return { html: note(`It follows ${first.name} without fail.`) };
            }
            case "quake": {
                const dice = SC.quakeDice(t.rage);
                const hit = near(tok, 10);
                for (const p of hit) {
                    await chron()?.timed?.applyTimed?.(p.actor, { name: "Knocked down", condition: "knockdown", duration: { kind: "rounds", rounds: 1 }, key: "wodx-charm-quake", source: SC.pageOf(c), description: "Thrown to the ground by an Umbraquake." });
                    if (dice) await C?.soakAndApply?.(p, { apply: true, mode: "pool", amount: dice, type: "bashing", soak: true });
                }
                if (tok) await chron()?.looks?.weather?.({ scene: canvas.scene, kind: "quake", until: { seconds: 60 }, source: c.name }).catch?.(() => null);
                return { html: note(hit.length ? `${hit.map(p => p.name).join(", ")}: thrown down, ${dice} bashing dice.` : "The ground heaves; no one stands near.") };
            }
            case "updraft": {
                if (!first) { notify(`${c.name}: target someone first.`); return false; }
                const r = E.outcome("rise", { ok: true, strength: got, duration: 0, targets: 0 }, {});
                return { results: [res("rise", "one", { ...r, timed: { kind: "rounds", rounds: 3 }, duration: "3 turns", text: `${r.feet} feet up on the wind, for 3 turns` })] };
            }
            case "frenzy": {
                if (!first) { notify(`${c.name}: target someone first.`); return false; }
                const kind = String(ctx.profile?.(first) ?? "");
                if (kind !== "lupine") return { html: note(`${first.name} is no shapeshifter: the Rage finds nothing to wake.`) };
                const f = SC.frenzyOf(got);
                await chron()?.conditions?.setCondition?.(first, "frenzy", true);
                if (f === "thrall") await chron()?.timed?.applyTimed?.(first, { name: "Thrall of the Wyrm", img: "icons/svg/terror.svg", duration: { kind: "scene" }, key: "wodx-charm-thrall", source: SC.pageOf(c), description: "The frenzy of the Wyrm's thrall: it attacks friend and foe and does the Wyrm's work." });
                return { html: note(`${first.name} frenzies${f === "thrall" ? ": the Thrall of the Wyrm" : ""}.`) };
            }
            case "possess": {
                if (!first && !o.object) { notify(`${c.name}: target the one to possess first.`); return false; }
                const when = SC.possessionTime(got);
                if (first) await first.createEmbeddedDocuments("ActiveEffect", [{ name: `Possessed by ${actor.name}`, img: "icons/svg/possession.svg", statuses: ["wodx-possessed"],
                    description: `${actor.name} rides this body until it is driven out; it takes hold ${when.label}. A spirit inside a person can warp it into a fomor.`, flags: { [MOD]: { charm: "possession", by: actor.uuid } } }]);
                const doc = tok?.document ?? tok;
                if (doc) await doc.update({ hidden: true });
                return { html: note(`${first ? first.name : "The thing"} is possessed; it takes hold ${when.label}. The spirit can do nothing else, and the link breaks if it does or is fought in the Umbra.`) };
            }
            case "calcify": {
                if (!first) { notify(`${c.name}: target someone first.`); return false; }
                const rage = n(first.system?.advantages?.rage?.permanent);
                const r = await resistRoll(ctx, first, rage, 6, c.name);
                const dots = SC.calcifyDots(got, r.botch ? 0 : r.successes);
                if (!dots) return { html: note(`${first.name} tears free of the Pattern Web.`) };
                if (isSpirit(first) || !first.system?.attributes) {
                    const e = n(first.system?.advantages?.essence?.temporary);
                    await first.update({ "system.advantages.essence.temporary": Math.max(0, e - dots) });
                    if (e - dots <= 0) await chron()?.timed?.applyTimed?.(first, { name: "Held in the Pattern Web", condition: "held", duration: { kind: "scene" }, key: "wodx-charm-web", source: SC.pageOf(c), description: "Bound into the Pattern Web: Wyld energy can tear it free." });
                    return { html: note(`${first.name} loses ${dots} Essence${e - dots <= 0 ? " and is held in the Pattern Web" : ""}.`) };
                }
                const attrs = first.system.attributes;
                const k = o.attr || ["strength", "dexterity", "stamina"].sort((a, b) => n(attrs[b]?.total ?? attrs[b]?.value) - n(attrs[a]?.total ?? attrs[a]?.value))[0];
                const now = n(attrs[k]?.total ?? attrs[k]?.value), by = Math.min(dots, now);
                await first.update({ [`system.attributes.${k}.bonus`]: n(attrs[k]?.bonus) - by, [`system.attributes.${k}.total`]: now - by });
                await mark(first, c, { attrs: { [k]: by } }, { name: "Calcified", img: "icons/svg/stoned.svg", condition: now - by <= 0 ? "held" : undefined });
                return { html: note(`${first.name}: ${k} ${by} lower for the scene${now - by <= 0 ? "; held fast in the Pattern Web until the pack frees them" : ""}.`) };
            }
            case "solidify": {
                const who = first ?? actor;
                if (who.effects?.some?.(e => e.flags?.["wodx-chronicle"]?.timed?.key === "wodx-charm-solidify" || e.name === "Solidified")) return { html: note(`${who.name} already has the Pattern's strength: this use fails.`) };
                const day = { kind: "time", seconds: 86400 };
                if (isSpirit(who) || !who.system?.attributes) {
                    await who.update({ "system.advantages.essence.temporary": n(who.system?.advantages?.essence?.temporary) + got });
                    await mark(who, c, { essence: got }, { name: "Solidified", duration: day });
                    return { html: note(`${who.name}: ${got} more Essence for a day.`) };
                }
                const [it] = await who.createEmbeddedDocuments("Item", [{ name: "Solidified Reality", type: "Power", img: "icons/svg/stone-path.svg",
                    system: { type: "wod.types.power", value: 0, description: `${c.fx} (${SC.pageOf(c)})`, bonuslist: [{ name: "Solidify Reality", type: "health_buff", settingtype: "bruised", value: got, isactive: true }] },
                    flags: { [MOD]: { charmGrant: "solidify" } } }]);
                await mark(who, c, { drop: it?.id ?? null }, { name: "Solidified", duration: day });
                return { html: note(`${who.name}: ${got} more health level${got === 1 ? "" : "s"} for a day.`) };
            }
            case "static": {
                const scene = canvas?.scene;
                const taken = scene ? n(await worlds()?.drift?.lever?.(scene, "value", 1, `Spirit Static (${actor.name})`)) : 0;
                await actor.setFlag(MOD, "spiritStatic", true);
                await mark(actor, c, { gauntlet: { scene: scene?.id ?? null, taken }, flag: "spiritStatic" }, { name: "Spirit Static", img: "icons/svg/net.svg" });
                return { html: note(`${taken ? "The Gauntlet here is one higher" : "The Gauntlet is already as thick as it goes here"} while it stays; its own pools are two dice lower.`) };
            }
            case "break": {
                return { html: note(`${got} part${got === 1 ? "" : "s"} of the thing's Umbral form change${got === 1 ? "s" : ""}; the Storyteller says how.`) };
            }
            default: return {};
        }
    }

    /** Lights near a token (or all of the scene's, with no token). */
    function lightsNear(tok, yards) {
        const scene = canvas?.scene;
        if (!scene) return [];
        const all = [...(scene.lights ?? [])];
        if (!tok?.object) return all;
        const unit = n(scene.grid?.distance) || 5, units = scene.grid?.units ?? "ft";
        const range = (/yd|yard|m\b|meter|metre/i.test(units) ? yards : yards * 3) / unit * (canvas.grid?.size ?? 100);
        const c = tok.object.center;
        return all.filter(l => Math.hypot(n(l.x) - c.x, n(l.y) - c.y) <= range);
    }

    /** The Charms an NPC spirit may pick (main.js npcPowers reads keywords from here). */
    function powersFor(actor) {
        const t = traits(actor), year = yearNow();
        return SC.choosable(charmsOf(actor).map(x => x.charm)).filter(c => SC.fitsEra(c, year) && SC.canPay(c, t).ok)
            .map(c => ({ use: "useCharm", field: "charm", value: c.key, name: c.name, level: 1, set: "charm", id: c.key, keywords: c.keywords }));
    }

    return { power, use, powersFor };
}
