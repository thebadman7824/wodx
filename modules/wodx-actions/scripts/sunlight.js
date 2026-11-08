/**
 * WoDX Actions 3.3 — the sunlight system.
 *
 *   Where the sun reaches   a "WoDX: Sunlight" region behavior (light and exposure; "shade" protects), regions named
 *                           sunlit / shade / shelter / indoors, or a whole scene marked outdoors
 *   Shadows                 the sun's height and bearing from the Chronicle clock; walls cast shadows as long as
 *                           wall height ÷ tan(altitude), in the direction away from the sun (the scene's north set)
 *   Strength                the place's light, capped by the sky (weather), twilight and heavy clothing (p. 359)
 *   Damage                  each turn in a fight, on stepping into the sun, and while the clock runs by day:
 *                           Fortitude soaks at the light's difficulty, the rest is aggravated; then Rötschreck
 *   Protection              Earth Meld, Unseen Hibernation, buried in the earth; Woad of Taranis makes it lethal
 *   Dawn                    warnings 30 and 10 minutes before sunrise, with each Cainite's haven checked
 *
 * Pure rules: sunlight-rules.js. Built by main.js with its helpers (ctx).
 */

import * as S from "./sunlight-rules.js";
import * as P from "./profiles.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
export const TYPE = `${MOD}.sunlight`;
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/* ------------------------------------------------------------------ */
/*  The region behavior                                                */
/* ------------------------------------------------------------------ */

/** Register "WoDX: Sunlight" as a region behavior (Foundry 12+). Called at init. */
export function registerBehavior() {
    const Base = foundry.data?.regionBehaviors?.RegionBehaviorType;
    const fields = foundry.data?.fields;
    if (!Base || !fields || !CONFIG.RegionBehavior?.dataModels) return false;
    class SunlightBehavior extends Base {
        static defineSchema() {
            return {
                light: new fields.StringField({ required: true, blank: false, initial: "direct", choices: S.LIGHTS,
                    label: "Light", hint: "How strong the sunlight is in this area by day (VtDA20 p. 359). \"Shade\" protects even on a scene marked outdoors." }),
                exposure: new fields.NumberField({ required: true, integer: true, min: 1, max: 3, initial: 3,
                    label: "Exposure (levels a turn)", hint: "1: a hand or part of the face; 2: an arm, a leg or the head; 3: half the body or more." }),
                ignoreSky: new fields.BooleanField({ initial: false, label: "Ignore the weather", hint: "The light here doesn't change with clouds (a mirror, a lens, a gap under the roof)." })
            };
        }
        static events = {};
    }
    CONFIG.RegionBehavior.dataModels[TYPE] = SunlightBehavior;
    CONFIG.RegionBehavior.typeLabels[TYPE] = "WoDX: Sunlight";
    if (CONFIG.RegionBehavior.typeIcons) CONFIG.RegionBehavior.typeIcons[TYPE] = "fa-solid fa-sun";
    return true;
}

/* ------------------------------------------------------------------ */

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, setting } = ctx;

    /** The sun now: {altitude, azimuth, phase, dateLabel, timeLabel, toDawn (s)}. */
    async function sunNow(time = game.time.worldTime) {
        try {
            const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
            const cm = await import("../../wodx-chronicle/scripts/calendar-math.mjs");
            const lat = game.settings.get("wodx-chronicle", "latitude");
            const t = cal.describeTime(time, lat);
            const g = cm.jdnToGregorian(t.jdn);
            const doy = t.jdn - cm.gregorianToJDN(g.year, 1, 1) + 1;
            const pos = S.sunPosition(lat, S.declination(doy), t.hour + t.minute / 60);
            return { ...pos, phase: S.phaseOfSun(pos.altitude), dateLabel: t.dateLabel, timeLabel: t.timeLabel, toDawn: cal.secondsToNextDawn(time, lat), isNight: t.isNight };
        } catch (e) {
            return { altitude: -90, azimuth: 0, phase: "night", dateLabel: "", timeLabel: "", toDawn: null, isNight: true, unknown: true };
        }
    }

    /** The clock's sun, or a stand-in (the harness). */
    const sunAt = t => (ctx.sunNow ? ctx.sunNow(t) : sunNow(t));

    const sky = () => { try { return game.settings.get(MOD, "sky"); } catch (e) { return "clear"; } };
    const sceneNorth = scene => n(scene?.getFlag?.(MOD, "north"));
    /** Wall height in scene units (the setting and scene flag are in feet). */
    function wallHeight(scene) {
        const ft = n(scene?.getFlag?.(MOD, "wallHeight")) || n(setting("wallHeight")) || 10;
        const u = String(scene?.grid?.units ?? "ft").toLowerCase();
        return u.startsWith("m") ? ft * 0.3048 : u.startsWith("y") ? ft / 3 : ft;
    }

    /** Is the token's centre in a wall's shadow? A ray toward the sun, as long as the walls' shadow, meets a wall. */
    function wallShade(doc, sun) {
        const tok = doc?.object;
        if (!tok?.center || !globalThis.canvas?.scene || sun.altitude <= 0) return false;
        const scene = doc.parent ?? canvas.scene;
        const pxPerUnit = (scene.grid?.size ?? 100) / (scene.grid?.distance ?? 5);
        const len = Math.min(S.shadowLength(wallHeight(scene), sun.altitude) * pxPerUnit, Math.hypot(scene.width ?? 4000, scene.height ?? 4000));
        const v = S.sunVector(sun.azimuth, sceneNorth(scene));
        const dest = { x: tok.center.x + v.x * len, y: tok.center.y + v.y * len };
        try {
            const be = CONFIG.Canvas.polygonBackends.light ?? CONFIG.Canvas.polygonBackends.sight;
            return !!be.testCollision(tok.center, dest, { type: "light", mode: "any" });
        } catch (e) { return false; }
    }

    /** The place's light under a token: {place, exposure, ignoreSky, why}. */
    function placeOf(doc, sun) {
        let best = null, exposure = 3, ignoreSky = false, via = "", shade = false;
        for (const r of doc?.regions ?? []) {
            for (const b of r.behaviors ?? []) {
                if (b.disabled || b.type !== TYPE) continue;
                const l = b.system?.light ?? "direct";
                if (l === "shade") shade = true;
                else if (!best || S.LADDER.indexOf(l) > S.LADDER.indexOf(best)) { best = l; exposure = n(b.system?.exposure) || 3; ignoreSky = !!b.system?.ignoreSky; via = r.name; }
            }
            const nm = String(r.name ?? "").toLowerCase();
            if (/shade|shelter|indoors|haven|under/.test(nm)) shade = true;
            else if (!best && /sunlit|open sky|daylight/.test(nm)) { best = "direct"; via = r.name; }
        }
        if (shade) return { place: "shade", why: "in shade or shelter" };
        if (best) return { place: best, exposure, ignoreSky, why: `in “${via}”` };
        const light = doc?.parent?.getFlag?.(MOD, "light");
        if (light === "outdoors") {
            if (sun && wallShade(doc, sun)) return { place: "shade", why: "in a wall's shadow" };
            return { place: "direct", exposure: 3, why: "in the open" };
        }
        return { place: "shade", why: light === "indoors" ? "indoors" : "the scene isn't marked outdoors" };
    }

    /**
     * Is this token's Cainite in sunlight now? {exposed, light, exposure, diff, why, protection}. sun: from sunNow().
     * Only Cainites burn (ghouls and the living don't).
     */
    function exposureOf(tokenLike, sun) {
        const doc = tokenLike?.document ?? tokenLike;
        const actor = doc?.actor;
        if (!actor || P.detectProfile(actor) !== "kindred") return { exposed: false, why: "not a Cainite" };
        if (!sun || sun.phase === "night") return { exposed: false, why: "night" };
        const pl = placeOf(doc, sun);
        const prot = S.protection({ effects: [...(actor.effects ?? [])].map(e => e.name), torpor: !!actor.getFlag?.(MOD, "torpor"), buried: !!actor.getFlag?.(MOD, "buried") });
        if (prot.immune) return { exposed: false, why: prot.why, protection: prot };
        const light = S.effectiveLight({ place: pl.place, sky: pl.ignoreSky ? "clear" : sky(), phase: sun.phase, covered: !!actor.getFlag?.(MOD, "sunCover") });
        if (!light) return { exposed: false, why: pl.why };
        return { exposed: true, light, exposure: pl.exposure ?? 3, diff: S.SOAK_DIFF[light], why: `${pl.why}${sun.phase === "twilight" ? ", twilight" : ""}${sky() !== "clear" && !pl.ignoreSky ? `, ${S.SKIES[sky()]?.label.toLowerCase()}` : ""}${actor.getFlag?.(MOD, "sunCover") ? ", heavily clothed" : ""}`, protection: prot };
    }

    const sbtn = (k, actor, label, arg = "") => `<button type="button" class="vta-btn" data-sx="${k}" data-actor="${esc(actor?.uuid ?? "")}" data-arg="${esc(arg)}">${esc(label)}</button>`;

    /** Burn a Cainite for some turns of sunlight: Fortitude soaks each turn, the rest aggravated (p. 359). */
    async function applySun(actor, { light = "direct", exposure = 3, turns = 1, why = "", lethal = false, noRotschreck = false } = {}) {
        const fort = ctx.discipline(actor, "Fortitude");
        const diff = S.SOAK_DIFF[light] ?? 10;
        const rolls = [];
        let html = `<div class="vta-sub">${esc(S.LIGHTS[light] ?? light)}${why ? ` — ${esc(why)}` : ""}: ${exposure} level${exposure === 1 ? "" : "s"} a turn${turns > 1 ? `, ${turns} turns` : ""} (VtDA20 p. 359).</div>`;
        let levels = 0;
        const soakDice = lethal ? fort + ctx.attr(actor, "stamina") : fort;
        for (let t = 1; t <= Math.max(1, turns); t++) {
            let soaked = 0;
            if (soakDice > 0) {
                const r = await rollPool(soakDice, lethal ? 6 : diff, { canBotch: false });
                rolls.push(r.roll); soaked = r.successes;
                html += rollBlock(`Turn ${t}: ${lethal ? "Stamina + Fortitude" : "Fortitude"} soak`, r);
            } else if (t === 1) html += `<div class="vta-sec">No Fortitude: the sun can't be soaked.</div>`;
            levels += S.sunTurn({ exposure, soakSuccesses: soaked });
        }
        const type = lethal ? "lethal" : "aggravated";
        html += `<div class="vta-big ${levels ? "bad" : "good"}">${levels ? `${levels} ${type} level${levels === 1 ? "" : "s"}` : "No damage"}</div>`;
        if (levels) {
            const res = await ctx.applyDamage(actor, type, levels);
            if (res?.after) html += `<div class="vta-res">Now ${ctx.healthText(actor, res.after)}${res.condition?.text ? ` — <b>${esc(res.condition.text)}</b>` : ""}</div>`;
            await ctx.logEvent?.(actor, `Burned by the sun: ${levels} ${type}.`, "sun");
        }
        if (!noRotschreck && !actor.system?.conditions?.isfrenzy) html += `<button type="button" class="vta-btn" data-kx="rotschreck" data-actor="${esc(actor.uuid)}" data-arg="${light === "direct" ? "directsun" : "obscuredsun"}">Rötschreck check</button>`;
        return post(actor, `${actor.name}: sunlight`, html, rolls);
    }

    async function sunCard(actor, ex, { turns = 1, title = "In the sun", note = "" } = {}) {
        const mode = setting("sunDamage");
        if (mode === "off") return null;
        if (mode === "apply") return applySun(actor, { light: ex.light, exposure: ex.exposure, turns, why: ex.why, lethal: !!ex.protection?.lethal, noRotschreck: !!ex.protection?.noRotschreck });
        return ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(title)}: ${esc(actor.name)}</h3><p>${esc(S.LIGHTS[ex.light] ?? ex.light)} — ${esc(ex.why)}; ${ex.exposure} level${ex.exposure === 1 ? "" : "s"} a turn, soak ${ex.diff}.${note ? ` ${esc(note)}` : ""}</p>${sbtn("burn", actor, turns > 1 ? `Burn for ${turns} turns` : "Burn for a turn", `${turns}|${ex.light}|${ex.exposure}|${ex.protection?.lethal ? 1 : 0}|${ex.protection?.noRotschreck ? 1 : 0}`)}</div>`,
            whisper: ownerIds(actor), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- Triggers ---------------- */

    /** A new round of a fight: every Cainite in the sun burns for the turn. */
    async function onRound(combat) {
        if (!isActiveGM() || setting("sunDamage") === "off") return [];
        const sun = await sunAt();
        if (sun.phase === "night") return [];
        const out = [];
        for (const c of combat.combatants ?? []) {
            const doc = c.token ?? c.tokenDocument ?? null;
            if (!doc?.actor || c.defeated) continue;
            const ex = exposureOf(doc, sun);
            if (!ex.exposed) continue;
            out.push(doc.name);
            await sunCard(doc.actor, ex, { title: `Turn ${combat.round} in the sun` });
        }
        return out;
    }

    /** A token moved by day: stepping into the sun burns at once; stepping out is noted on the token. */
    async function onMove(doc) {
        if (!isActiveGM() || setting("sunDamage") === "off" || !doc?.actor || P.detectProfile(doc.actor) !== "kindred") return null;
        const sun = await sunAt();
        if (sun.phase === "night") return null;
        const ex = exposureOf(doc, sun);
        const was = !!doc.getFlag?.(MOD, "inSun");
        if (ex.exposed && !was) {
            await doc.setFlag(MOD, "inSun", true);
            return sunCard(doc.actor, ex, { title: "Into the sun" });
        }
        if (!ex.exposed && was) await doc.unsetFlag(MOD, "inSun");
        return null;
    }

    /**
     * The clock moved (active GM): dawn warnings by night; by day, any Cainite left in the sun out of a fight burns for
     * the time that passed (a turn is about three seconds; at most twenty turns on one card).
     */
    async function onClock(dt = 0) {
        if (!isActiveGM()) return null;
        const sun = await sunAt();
        if (sun.unknown) return null;
        if (sun.phase === "night" && sun.toDawn !== null) {
            const key = Math.round((game.time.worldTime + sun.toDawn) / 600);
            const st = game.settings.get(MOD, "dawnWarned") ?? {};
            const given = st.key === key ? st.given ?? [] : [];
            const w = S.dawnWarning(sun.toDawn, given);
            if (w !== null && setting("dawnWarnings")) {
                await game.settings.set(MOD, "dawnWarned", { key, given: [...new Set([...given, ...S.DAWN_WARNINGS.filter(x => x >= w)])] });
                await dawnWarning(Math.max(1, Math.round(sun.toDawn / 60)));
            }
            return null;
        }
        if (dt < 60 || setting("sunDamage") === "off") return null;
        const turns = Math.min(20, Math.ceil(dt / 3));
        for (const sc of game.scenes?.active ? [game.scenes.active] : []) {
            for (const doc of sc.tokens ?? []) {
                if (!doc.actor || game.combat?.combatants?.some?.(c => c.tokenId === doc.id)) continue;
                const ex = exposureOf(doc, sun);
                if (ex.exposed) await sunCard(doc.actor, ex, { turns, title: "Left in the sun", note: `${Math.round(dt / 60)} minutes passed` });
            }
        }
        return null;
    }

    /* ---------------- Havens and dawn ---------------- */

    /** Where her haven is, and whether she is in it: {set, inside, where}. */
    function havenStatus(actor) {
        const h = actor.getFlag?.(MOD, "haven");
        if (!h?.sceneId) return { set: false, inside: null, where: "no haven set" };
        const sc = game.scenes?.get?.(h.sceneId);
        const where = `${h.sceneName ?? sc?.name ?? "?"}${h.regionName ? `, ${h.regionName}` : ""}`;
        const tok = sc?.tokens?.find?.(t => t.actorId === actor.id);
        if (!tok) return { set: true, inside: false, where };
        if (!h.regionId) return { set: true, inside: true, where };
        const regions = tok.regions;
        if (!regions) return { set: true, inside: true, where }; // can't tell from here: on the right scene
        return { set: true, inside: [...regions].some(r => r.id === h.regionId), where };
    }

    async function dawnWarning(minutes) {
        const vamps = ctx.clockActors().filter(a => P.detectProfile(a) === "kindred" && !a.getFlag(MOD, "torpor"));
        if (!vamps.length) return null;
        const rows = vamps.map(a => { const h = havenStatus(a); return `<li><b>${esc(a.name)}</b>: ${h.inside ? `in her haven (${esc(h.where)})` : h.set ? `<b>away from her haven</b> (${esc(h.where)})` : "<b>no haven set</b>"}</li>`; });
        const ids = [...new Set([...gmIds(), ...vamps.flatMap(a => ownerIds(a))])];
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Dawn in ${minutes} minutes</h3><ul>${rows.join("")}</ul><p class="wodx-quiet">Set a haven in WoDX Actions → Sun and haven.</p></div>`,
            whisper: ids, speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- Dialogs ---------------- */

    /** A Cainite's sun protection and haven. */
    async function sunAndHaven(actor) {
        const sun = await sunAt();
        const tok = actor.getActiveTokens?.()[0];
        const ex = tok ? exposureOf(tok, sun) : null;
        const h = havenStatus(actor);
        const scenes = [...(game.scenes ?? [])];
        const cur = actor.getFlag(MOD, "haven") ?? {};
        const regionOpts = [];
        for (const sc of scenes) for (const r of sc.regions ?? []) regionOpts.push([`${sc.id}|${r.id}`, `${sc.name}: ${r.name}`]);
        const here = tok ? [...(tok.document?.regions ?? [])][0] : null;
        const content = `<form><p><b>${esc(actor.name)}</b> — ${sun.phase === "night" ? `night; dawn in ${sun.toDawn !== null ? Math.round(sun.toDawn / 60) : "?"} minutes` : `${sun.phase}: the sun ${Math.round(sun.altitude)}° up`}.${ex ? ` Now: ${ex.exposed ? `<b>in sunlight</b> (${esc(ex.why)})` : esc(ex.why)}.` : ""}</p>
          <div class="form-group"><label><input type="checkbox" name="cover" ${actor.getFlag(MOD, "sunCover") ? "checked" : ""}/> Heavily clothed: cloak, hood, gloves (light counts as "covered", soak 5)</label></div>
          <div class="form-group"><label><input type="checkbox" name="buried" ${actor.getFlag(MOD, "buried") ? "checked" : ""}/> Buried in the earth (safe from the sun)</label></div>
          <fieldset><legend>Haven (${esc(h.where)})</legend>
            <div class="form-group"><label>Haven</label>${scenes.length > 4 ? searchBox("select[name=haven]", "Search scenes…", "Search scenes") : ""}<select name="haven">
              <option value="keep">Keep as it is</option>
              ${tok ? `<option value="here">Where her token stands now${here ? ` (${esc(here.name)})` : ""}</option>` : ""}
              <option value="clear">No haven</option>
              ${scenes.map(sc => `<option value="scene|${sc.id}" ${cur.sceneId === sc.id && !cur.regionId ? "selected" : ""}>The whole scene: ${esc(sc.name)}</option>`).join("")}
            </select></div>
            ${regionOpts.length ? `<div class="form-group"><label>Or a region</label>${regionOpts.length > 5 ? searchBox("select[name=region]", "Search regions…", "Search regions") : ""}<select name="region"><option value="">— none —</option>${regionOpts.map(([v, l]) => `<option value="${v}" ${`${cur.sceneId}|${cur.regionId}` === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>` : ""}
          </fieldset></form>`;
        return dialog(`Sun and haven — ${actor.name}`, content, "Save", async fd => {
            await ctx.setFlag(actor, "sunCover", fd.cover ? true : null);
            await ctx.setFlag(actor, "buried", fd.buried ? true : null);
            let haven = null;
            if (fd.region) {
                const [sid, rid] = fd.region.split("|"); const sc = game.scenes.get(sid); const r = sc?.regions?.get?.(rid);
                haven = { sceneId: sid, sceneName: sc?.name, regionId: rid, regionName: r?.name };
            } else if (fd.haven === "here" && tok) {
                const sc = tok.document.parent;
                haven = { sceneId: sc.id, sceneName: sc.name, regionId: here?.id ?? null, regionName: here?.name ?? null };
            } else if (String(fd.haven).startsWith("scene|")) {
                const sc = game.scenes.get(fd.haven.slice(6)); haven = { sceneId: sc?.id, sceneName: sc?.name };
            }
            if (haven || fd.haven === "clear") await ctx.setFlag(actor, "haven", haven);
            const h2 = havenStatus(actor);
            return post(actor, `${actor.name}: sun and haven`, `<div class="vta-note">${fd.cover ? "Heavily clothed." : "Not covered."}${fd.buried ? " Buried in the earth." : ""} Haven: ${esc(h2.where)}.</div>`);
        }, { width: 520 });
    }

    /** The GM's sky and scene settings for the sun, with the sun's place now. */
    async function skyAndSun() {
        if (!game.user.isGM) return ctx.notify("The Storyteller sets the sky.");
        const sun = await sunAt();
        const sc = canvas?.scene;
        const content = `<form><p>${esc(sun.dateLabel)} ${esc(sun.timeLabel)}: ${sun.phase === "night" ? `night (dawn in ${sun.toDawn !== null ? Math.round(sun.toDawn / 60) : "?"} minutes)` : `${sun.phase}, the sun ${Math.round(sun.altitude)}° high, bearing ${Math.round(sun.azimuth)}°`}.</p>
          <div class="form-group"><label>Sky</label><select name="sky" data-fixed>${Object.entries(S.SKIES).map(([k, v]) => `<option value="${k}" ${k === sky() ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select></div>
          ${sc ? `<fieldset><legend>This scene: ${esc(sc.name)}</legend>
            <div class="form-group"><label>Daylight here</label><select name="light" data-fixed>${[["", "Not set (only Sunlight regions)"], ["outdoors", "Outdoors: open to the sky, walls cast shadows"], ["indoors", "Indoors: no sunlight"]].map(([v, l]) => `<option value="${v}" ${(sc.getFlag(MOD, "light") ?? "") === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
            <div class="form-group"><label>North on the map (degrees clockwise from the top)</label><input type="number" name="north" value="${sceneNorth(sc)}" min="0" max="359"/></div>
            <div class="form-group"><label>Height of walls for their shadows (feet)</label><input type="number" name="wall" value="${n(sc.getFlag(MOD, "wallHeight")) || n(setting("wallHeight")) || 10}" min="1"/></div>
          </fieldset>` : ""}
          <div class="form-group"><label><input type="checkbox" name="check"/> Check every token on this scene now</label></div></form>`;
        return dialog("Sky and sun", content, "Save", async fd => {
            await game.settings.set(MOD, "sky", fd.sky);
            if (sc) {
                if (fd.light) await sc.setFlag(MOD, "light", fd.light); else await sc.unsetFlag(MOD, "light");
                await sc.setFlag(MOD, "north", n(fd.north) % 360);
                await sc.setFlag(MOD, "wallHeight", Math.max(1, n(fd.wall)));
            }
            let lines = [];
            if (fd.check && sc) {
                const s2 = await sunAt();
                for (const t of sc.tokens ?? []) { if (P.detectProfile(t.actor) !== "kindred") continue; const ex = exposureOf(t, s2); lines.push(`<li><b>${esc(t.name)}</b>: ${ex.exposed ? `<b>in sunlight</b>, ${esc(S.LIGHTS[ex.light])} (${esc(ex.why)})` : esc(ex.why)}</li>`); }
            }
            return ChatMessage.create({ content: `<div class="vta-card"><h3>Sky and sun</h3><p>Sky: ${esc(S.SKIES[fd.sky]?.label)}.${sc ? ` ${esc(sc.name)}: ${fd.light || "not set"}, north ${n(fd.north) % 360}°, walls ${Math.max(1, n(fd.wall))} ft.` : ""}</p>${lines.length ? `<ul>${lines.join("")}</ul>` : ""}</div>`,
                whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
        }, { width: 520 });
    }

    async function onChatButton(b) {
        const doc = b.dataset.actor ? await fromUuid(b.dataset.actor) : null;
        const a = doc?.actor ?? doc;
        if (!a) return ctx.notify("That character is gone.");
        if (!(a.isOwner || game.user.isGM)) return ctx.notify("Only the character's owner or the GM can do that.");
        if (b.dataset.sx === "burn") {
            const [turns, light, exposure, lethal, noRot] = String(b.dataset.arg ?? "").split("|");
            return applySun(a, { turns: n(turns) || 1, light: light || "direct", exposure: n(exposure) || 3, lethal: lethal === "1", noRotschreck: noRot === "1" });
        }
        return null;
    }

    return { sunNow, exposureOf, placeOf, wallShade, applySun, onRound, onMove, onClock, havenStatus, dawnWarning, sunAndHaven, skyAndSun, onChatButton };
}

/** Settings this part adds (registered by main.js). */
export function registerSettings(register) {
    game.settings.register(MOD, "sunDamage", { name: "Sunlight damage", hint: "When a Cainite stands in sunlight (a Sunlight region, a region named sunlit, or the open on a scene marked outdoors, outside walls' shadows): roll and apply it each turn of a fight, on stepping into the sun and while the clock runs; or post a card with a button; or nothing.",
        scope: "world", config: true, type: String, default: "prompt", choices: { prompt: "A card with a button", apply: "Roll and apply it", off: "Off" } });
    register("dawnWarnings", "Warn before dawn", "Whispered cards 30 and 10 minutes before sunrise, saying whether each Cainite is in her haven.", Boolean, true);
    register("wallHeight", "Height of walls (feet)", "For the shadows walls cast by day; a scene can set its own in Sky and sun.", Number, 10);
    game.settings.register(MOD, "sky", { name: "Sky", hint: "The weather caps sunlight: cloudy days are \"cloudy\" (soak 9), heavy cloud, rain or fog \"faint\" (soak 3). Also set from Sky and sun.",
        scope: "world", config: true, type: String, default: "clear", choices: Object.fromEntries(Object.entries(S.SKIES).map(([k, v]) => [k, v.label])) });
    game.settings.register(MOD, "dawnWarned", { scope: "world", config: false, type: Object, default: {} });
}
