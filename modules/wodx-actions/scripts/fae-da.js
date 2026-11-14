/**
 * WoDX Actions 3.8 (Phase 6g): Dark Ages fae (Dark Ages: Fae).
 *
 *   Origin and Court      the fae sheet on the actor (flags): Origin, Court, Mists, Weaving, the four Dominions,
 *                         cantrips, Features, Echoes, Oaths and the mien
 *   Cast a cantrip        Dominion + the cantrip's trait; the Court's Dominion, its hour and its season from the
 *                         Chronicle clock; a holding; Mists imbalance; floor 4; cloaking with the Mists
 *   Unleash               Mists + Dominion against the Unleashing dice; Weaving removes them; the four outcomes; Mists
 *                         regained; Weaving to lower a havoc
 *   Counter               absorb (Dominion + Weaving), scatter (Mists) or unravel an Unleashing (Mists)
 *   Face an Echo          the mortal's Willpower or 5 dice, the Origin's shift, oaths, sprites and Weaving; the level
 *   The Mists             Bestow Kenning, cloak, enhance the mien, hide from mortals (days counted against Willpower)
 *   The mien              take or drop it by the Origin's roll; a botch locks the form for Weaving hours
 *   Oaths and rest        keeping an oath restores Weaving; rest in a faerie realm restores both
 *   Cold iron             aggravated through WoDX Combat and a Mists point per wound
 *
 * Built by main.js with its helpers (ctx). Pure rules: fae-da-rules.js.
 */
import * as F from "./fae-da-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";
import * as EF from "./effects.js";
import * as E from "./effects-rules.js";
import * as PW from "./power-effects.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const DAY = 86400;
const REF = F.REF;
const DOM_OPTS = (sel, ratings = null) => F.DOMINION_IDS.map(d => `<option value="${d}"${d === sel ? " selected" : ""}${ratings && !n(ratings[d]) ? " disabled" : ""}>${F.DOMINIONS[d].label}${ratings ? ` ${n(ratings[d])}` : ""}</option>`).join("");

export function eraId() { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } }
/** A Dark Ages fae: the sheet's own choice, else an Origin on the sheet, else the era. */
export function isDA(actor) {
    const f = actor?.getFlag?.(MOD, "daFae");
    if (f?.system === "c20") return false;
    if (f?.origin) return true;
    return F.isDarkAgesEra(eraId());
}

/* Lines on the sheet: "Night 1: Hush (manipulation)", "Iron 2: keeps the mill (inactive)", "Day 2: Sunflash [light, harm]" (what it does, B3752) */
export function parseCantrips(text) {
    return String(text ?? "").split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
        const m = l.match(/^(day|night|dawn|dusk)\s*(\d)\s*[:\-–]\s*(.+?)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]*)\])?\s*$/i);
        if (!m) return null;
        const kw = String(m[5] ?? "").toLowerCase().split(/[\s,]+/).filter(k => E.KEYWORDS[k]);
        return { dominion: m[1].toLowerCase(), level: n(m[2]), name: m[3].trim(), trait: (m[4] ?? "").trim().toLowerCase(), ...(kw.length ? { kw } : {}) };
    }).filter(Boolean);
}
export const cantripLine = c => `${F.DOMINIONS[c.dominion]?.label ?? c.dominion} ${c.level}: ${c.name}${c.trait ? ` (${c.trait})` : ""}${c.kw?.length ? ` [${c.kw.join(", ")}]` : ""}`;
/** What a cantrip that took does on the effects card: its keywords at its successes (B3752). */
export const cantripResults = (kw, successes, { name = "", source = "", hasTarget = false } = {}) => PW.powerOutcomes({ keywords: kw ?? [] }, successes, { label: name, source, hasTarget }).results;
export function parseOaths(text) {
    return String(text ?? "").split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
        const m = l.match(/^(iron|stone|gold)\s*(\d)\s*[:\-–]\s*(.+?)\s*$/i);
        if (!m) return null;
        const inactive = /\(inactive\)\s*$/i.test(m[3]);
        return { kind: m[1].toLowerCase(), rating: n(m[2]), terms: m[3].replace(/\(inactive\)\s*$/i, "").trim(), active: !inactive };
    }).filter(Boolean);
}
export const oathLine = o => `${F.OATHS[o.kind]?.label.split(" ")[0] ?? o.kind} ${o.rating}: ${o.terms}${o.active === false ? " (inactive)" : ""}`;
const lines = t => String(t ?? "").split(/\n+/).map(l => l.trim()).filter(Boolean);

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, setFlag, background, traits, spendWillpower, notify } = ctx;

    function info(actor) {
        const f = actor.getFlag(MOD, "daFae") ?? {};
        const origin = F.ORIGINS[f.origin] ? f.origin : null;
        const court = F.COURTS[f.court] ? f.court : null;
        const dominions = Object.fromEntries(F.DOMINION_IDS.map(d => [d, n(f.dominions?.[d])]));
        const mists = { perm: n(f.mists?.perm), temp: n(f.mists?.temp ?? f.mists?.perm) };
        const weaving = { perm: n(f.weaving?.perm), temp: n(f.weaving?.temp ?? f.weaving?.perm) };
        const willpower = n(actor.system?.advantages?.willpower?.permanent);
        const day = Math.floor(game.time.worldTime / DAY);
        const wd = f.weavingDay?.day === day ? n(f.weavingDay.n) : 0;
        const hiddenDays = f.hiddenSince != null ? Math.floor((game.time.worldTime - n(f.hiddenSince)) / DAY) : null;
        return { f, origin, O: F.ORIGINS[origin] ?? null, court, C: F.COURTS[court] ?? null, dominions, mists, weaving, willpower,
            cantrips: Array.isArray(f.cantrips) ? f.cantrips : [], lesser: Array.isArray(f.lesser) ? f.lesser : [], greater: Array.isArray(f.greater) ? f.greater : [],
            echoes: Array.isArray(f.echoes) ? f.echoes : [], oaths: Array.isArray(f.oaths) ? f.oaths : [],
            mien: !!(f.mien || F.ORIGINS[origin]?.alwaysMien), imbalance: F.imbalance(mists.perm, weaving.perm),
            weavingToday: wd, suppression: F.suppression({ spendsToday: wd, mists: mists.perm, streak: n(f.weavingStreak), willpower }),
            hiddenDays, holdings: background(actor, "Holdings"), sprites: background(actor, "Sprites"),
            gramarye: n(actor.system?.abilities?.gramarye?.value) || n(ctx.findAbility?.(actor, "gramarye")?.value) };
    }
    const save = (actor, patch) => setFlag(actor, "daFae", { ...(actor.getFlag(MOD, "daFae") ?? {}), ...patch });
    async function spend(actor, which, k) {
        const i = info(actor);
        const have = i[which].temp;
        if (have < k) { notify(`${actor.name} has ${have} ${which === "mists" ? "Mists" : "Weaving"}; this needs ${k}.`); return false; }
        const patch = { [which]: { perm: i[which].perm, temp: have - k } };
        if (which === "weaving" && k > 0) {
            const day = Math.floor(game.time.worldTime / DAY);
            const before = i.f.weavingDay?.day === day ? n(i.f.weavingDay.n) : 0;
            patch.weavingDay = { day, n: before + 1 };
        }
        await save(actor, patch);
        return true;
    }
    async function gain(actor, which, k) {
        if (!k) return 0;
        const i = info(actor);
        const temp = Math.min(i[which].perm, i[which].temp + k);
        await save(actor, { [which]: { perm: i[which].perm, temp } });
        return temp - i[which].temp;
    }

    /** The hour and season on the Chronicle clock (or a stand-in for the harness). */
    async function clockNow() {
        if (ctx.clockNow) return ctx.clockNow();
        try {
            const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
            const cm = await import("../../wodx-chronicle/scripts/calendar-math.mjs");
            const lat = game.settings.get("wodx-chronicle", "latitude");
            const t = cal.describeTime(game.time.worldTime, lat);
            const g = cm.jdnToGregorian(t.jdn);
            const doy = t.jdn - cm.gregorianToJDN(g.year, 1, 1) + 1;
            const sun = cm.sunTimes(t.jdn, lat);
            return { hour: t.hour + t.minute / 60, sunrise: sun.sunrise, sunset: sun.sunset, doy, label: `${t.dateLabel}, ${t.timeLabel}` };
        } catch (e) { return { hour: 22, sunrise: null, sunset: null, doy: 0, label: "", unknown: true }; }
    }

    /* -------------------------------------------------------------- */
    /*  The sheet                                                      */
    /* -------------------------------------------------------------- */

    async function sheet(actor) {
        const i = info(actor);
        const oOpts = Object.entries(F.ORIGINS).map(([k, v]) => `<option value="${k}"${k === i.origin ? " selected" : ""}>${esc(v.label)}</option>`).join("");
        const cOpts = Object.entries(F.COURTS).map(([k, v]) => `<option value="${k}"${k === i.court ? " selected" : ""}>${esc(v.label)}${v.favored ? ` (${F.DOMINIONS[v.favored].label})` : " (no Dominion)"}</option>`).join("");
        const dom = F.DOMINION_IDS.map(d => `<div class="form-group"><label>${F.DOMINIONS[d].label} <small>${esc(F.DOMINIONS[d].gloss)}</small></label><input type="number" name="d-${d}" min="0" max="5" value="${i.dominions[d]}"/></div>`).join("");
        const area = (name, label, value, hint) => `<div class="form-group stacked"><label>${label} <small>${hint}</small></label><textarea name="${name}" rows="3">${esc(value)}</textarea></div>`;
        const content = `<form class="wodx-fae-sheet">
          <div class="form-group"><label>Origin</label><select name="origin" data-fixed><option value="">(choose)</option>${oOpts}</select></div>
          <div class="form-group"><label>Court</label><select name="court" data-fixed><option value="">(choose)</option>${cOpts}</select></div>
          <fieldset><legend>Mists and Weaving</legend>
            <div class="form-group"><label>Mists, permanent / now</label><input type="number" name="mp" min="0" max="10" value="${i.mists.perm}"/><input type="number" name="mt" min="0" max="10" value="${i.mists.temp}"/></div>
            <div class="form-group"><label>Weaving, permanent / now</label><input type="number" name="wp" min="0" max="10" value="${i.weaving.perm}"/><input type="number" name="wt" min="0" max="10" value="${i.weaving.temp}"/></div>
            <div class="form-group"><label><input type="checkbox" name="fill"/> Start from the Origin (Mists, Weaving)</label></div>
          </fieldset>
          <fieldset><legend>Dominions</legend>${dom}</fieldset>
          ${area("cantrips", "Cantrips", i.cantrips.map(cantripLine).join("\n"), "one a line: Night 1: Hush (manipulation) [veil]; the brackets say what it does")}
          ${area("lesser", "Lesser Features", i.lesser.join("\n"), "one a line")}
          ${area("greater", "Greater Features", i.greater.join("\n"), "one a line")}
          ${area("echoes", "Echoes", i.echoes.map(e => e.trigger).join("\n"), "one trigger a line")}
          ${area("oaths", "Oaths", i.oaths.map(oathLine).join("\n"), "one a line: Iron 2: what each side keeps (inactive)")}
          <div class="form-group"><label><input type="checkbox" name="mien"${i.mien ? " checked" : ""}${i.O?.alwaysMien ? " disabled" : ""}/> In the fae mien now</label></div>
          <div class="form-group"><label>Rules on this sheet</label><select name="system" data-fixed>
            <option value=""${!i.f.system ? " selected" : ""}>Follow the era</option><option value="da"${i.f.system === "da" ? " selected" : ""}>Dark Ages: Fae</option><option value="c20"${i.f.system === "c20" ? " selected" : ""}>Changeling 20th</option></select></div>
          <p class="wodx-quiet">${i.O ? `${esc(i.O.label)}: ${esc(i.O.birthright)}; frailty: ${esc(i.O.frailty)} (p. ${i.O.page}).` : "Origins: changeling, inanimae, firstborn (Dark Ages: Fae pp. 59–63)."} Cantrips: one per Dominion per Weaving dot. ${REF} pp. 86–115.</p>
        </form>`;
        return dialog(`Origin and Court: ${actor.name}`, content, "Save", async fd => {
            const origin = F.ORIGINS[fd.origin] ? fd.origin : null;
            const court = F.COURTS[fd.court] ? fd.court : null;
            const st = origin ? F.startingTraits(origin) : null;
            const clampT = (v, a = 0, b = 10) => Math.max(a, Math.min(b, n(v)));
            let mists = { perm: clampT(fd.mp), temp: clampT(fd.mt) }, weaving = { perm: clampT(fd.wp), temp: clampT(fd.wt) };
            if (fd.fill && st) { mists = { ...st.mists }; weaving = { ...st.weaving }; }
            mists.temp = Math.min(mists.temp, mists.perm); weaving.temp = Math.min(weaving.temp, weaving.perm);
            const dominions = Object.fromEntries(F.DOMINION_IDS.map(d => [d, clampT(fd[`d-${d}`], 0, 5)]));
            const cantrips = parseCantrips(fd.cantrips);
            const echoes = lines(fd.echoes).map(t => ({ trigger: t.slice(0, 200) }));
            const oaths = parseOaths(fd.oaths);
            await save(actor, { origin, court, mists, weaving, dominions, cantrips, lesser: lines(fd.lesser), greater: lines(fd.greater), echoes, oaths,
                mien: origin && F.ORIGINS[origin].alwaysMien ? true : !!fd.mien, system: fd.system || null });
            const probs = F.cantripProblems(cantrips, { weaving: weaving.perm, dominions });
            notify(`${actor.name}: ${origin ? F.ORIGINS[origin].label : "no Origin"}${court ? `, ${F.COURTS[court].label} Court` : ""} saved.${probs.length ? ` Check: ${probs.map(p => p.problem).join("; ")}.` : ""}${F.imbalance(mists.perm, weaving.perm) ? ` In ${F.imbalance(mists.perm, weaving.perm) === "mists" ? "Mists" : "Weaving"} imbalance (Dark Ages: Fae p. 102).` : ""}`);
            return true;
        }, { width: 560 });
    }

    const needFae = async actor => {
        const i = info(actor);
        if (!i.origin) { notify(`${actor.name} has no Origin yet: set it in Origin and Court.`); await sheet(actor); return null; }
        return i;
    };
    const traitSelect = (actor, sel) => `<select name="trait" data-fixed>${traits(actor).map(t => `<option value="${t.key}"${t.key === sel ? " selected" : ""}>${esc(t.label)} ${t.value}</option>`).join("")}</select>`;
    const traitOf = (actor, key) => traits(actor).find(t => t.key === key) ?? { key, label: key || "the trait", value: 0 };

    /* -------------------------------------------------------------- */
    /*  Cantrips                                                       */
    /* -------------------------------------------------------------- */

    async function cast(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const clock = await clockNow();
        const known = i.cantrips.map((c, k) => ({ ...c, k }));
        const content = `<form>
          <p><b>${esc(actor.name)}</b>: ${esc(i.O.label)}${i.C ? `, ${esc(i.C.label)} Court` : ""}; Mists ${i.mists.temp}/${i.mists.perm}, Weaving ${i.weaving.temp}/${i.weaving.perm}.${clock.label ? ` ${esc(clock.label)}.` : ""}</p>
          <div class="form-group"><label>A cantrip</label>${known.length > 5 ? searchBox("select[name=c]", "Search cantrips…", "Search cantrips") : ""}<select name="c" data-fixed><option value="">(another, by hand)</option>${known.map(c => `<option value="${c.k}">${esc(cantripLine(c))}</option>`).join("")}</select></div>
          <fieldset><legend>By hand</legend>
            <div class="form-group"><label>Dominion</label><select name="dominion" data-fixed>${DOM_OPTS(i.C?.favored, i.dominions)}</select></div>
            <div class="form-group"><label>Level</label><input type="number" name="level" min="1" max="5" value="1"/></div>
            <div class="form-group"><label>Trait</label>${traitSelect(actor, "manipulation")}</div>
            <div class="form-group"><label>What it does</label><select name="kw" data-fixed><option value="">(the Storyteller rules it)</option>${Object.entries(E.KEYWORDS).filter(([, K]) => K.tier !== "st").map(([k, K]) => `<option value="${k}" title="${esc(K.does)}">${esc(K.label)}</option>`).join("")}</select></div>
          </fieldset>
          <div class="form-group"><label>Difficulty before modifiers</label><input type="number" name="base" min="3" max="10" value="6"/></div>
          <div class="form-group"><label>The Storyteller's modifier</label><input type="number" name="mod" min="-3" max="3" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="clock" checked/> Use the clock's hour and season</label></div>
          ${i.holdings ? `<div class="form-group"><label><input type="checkbox" name="holding"/> In a holding whose favoured Dominion this is (−1)</label></div>` : ""}
          <div class="form-group"><label><input type="checkbox" name="cloak"/> Cloak it with the Mists (1 Mists)</label></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
        </form>`;
        return dialog(`Cast a cantrip: ${actor.name}`, content, "Cast", async fd => {
            const c = fd.c !== "" && fd.c != null ? known[n(fd.c)] : null;
            const dominion = c?.dominion ?? fd.dominion, level = c ? c.level : n(fd.level);
            const t = traitOf(actor, c?.trait || fd.trait);
            const time = fd.clock ? F.timeBonus(dominion, clock) : {};
            const plan = F.castPlan({ dominion, rating: i.dominions[dominion], trait: t.value, traitLabel: t.label, level, court: i.court, mists: i.mists.perm, weaving: i.weaving.perm },
                { time, holding: fd.holding ? 1 : 0, base: n(fd.base) || 6, mod: n(fd.mod) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (fd.cloak && !(await spend(actor, "mists", 1))) return null;
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp });
            const name = c?.name ?? `a level-${level} ${F.DOMINIONS[dominion].label} cantrip`;
            let body = rollBlock(`${F.DOMINIONS[dominion].label} + ${esc(t.label)}`, r, [...plan.notes, ...(fd.cloak ? ["cloaked: Perception + Kenning (8) to see it"] : []), ...(wp ? ["Willpower"] : [])]);
            body += r.botch ? `<div class="vta-big bad">The cantrip twists: the Storyteller says how.</div>`
                : r.successes ? `<div class="vta-big good">${esc(name)}: ${r.successes} success${r.successes === 1 ? "" : "es"}.</div><div class="vta-res">Level ${level} reaches ${esc(F.SCOPE[level] ?? "")}.</div>`
                : `<div class="vta-big">${esc(name)} does not take.</div>`;
            if (i.imbalance === "mists") body += `<div class="vta-note">Mists imbalance: cantrips come harder (Dark Ages: Fae p. 102).</div>`;
            if (c?.note) body += `<div class="vta-note">${esc(c.note)}</div>`;
            // What it does: the cantrip's own keywords, else the one picked by hand, on the effects card (B3752)
            let fxItems = [];
            const kw = c?.kw?.length ? c.kw : fd.kw ? [fd.kw] : [];
            if (kw.length && !r.botch && r.successes > 0 && EF.isOn()) {
                const t = EF.targetsOf(actor);
                const pp = EF.planOf(actor, cantripResults(kw, r.successes, { name, source: `${REF} pp. 120–121`, hasTarget: !t.self && t.docs.length > 0 }), r.successes);
                body += pp.html;
                fxItems = pp.items.filter(x => x.route !== "off" && x.route !== "st");
            }
            body += `<div class="wodx-quiet">${REF} pp. 120–121${F.DOMINIONS[dominion] ? `, ${F.DOMINIONS[dominion].page}` : ""}</div>`;
            const casts = actor.getFlag(MOD, "daFaeCasts");
            const key = `${game.scenes?.viewed?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}:${name}`;
            const count = casts?.key === key ? n(casts.n) + 1 : 1;
            await setFlag(actor, "daFaeCasts", { key, n: count });
            if (count > 5) body += `<div class="vta-note">${count} castings of this cantrip this scene: overuse draws the fae toward the Locked state (Dark Ages: Fae p. 104).</div>`;
            return post(actor, `${actor.name} casts ${name}`, body, [r.roll].filter(Boolean), fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
        }, { width: 520, render: root => aim(root, { actor, cast: { intent: "e" } }) });
    }

    /* -------------------------------------------------------------- */
    /*  Unleashing                                                     */
    /* -------------------------------------------------------------- */

    async function unleash(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const clock = await clockNow();
        const content = `<form>
          <p><b>${esc(actor.name)}</b>: Mists ${i.mists.perm}; Unleashing dice ${i.O.unleashDice}. Weaving ${i.weaving.temp} to spend.${i.O.unleashOnlyInMien && !i.mien ? " <b>Not in the mien:</b> a changeling Unleashes only in mien." : ""}</p>
          <div class="form-group"><label>Dominion</label><select name="dominion" data-fixed>${DOM_OPTS(i.C?.favored, i.dominions)}</select></div>
          <div class="form-group stacked"><label>What the fae wants (a short intent)</label><input type="text" name="intent" value=""/></div>
          <div class="form-group"><label>Weaving to remove Unleashing dice</label><input type="number" name="weave" min="0" max="5" value="0"/></div>
          <div class="form-group"><label>Difficulty before modifiers</label><input type="number" name="base" min="3" max="10" value="6"/></div>
          <div class="form-group"><label><input type="checkbox" name="clock" checked/> Use the clock's hour and season</label></div>
          ${i.holdings ? `<div class="form-group"><label><input type="checkbox" name="holding"/> In a holding of this Dominion (−1)</label></div><div class="form-group"><label><input type="checkbox" name="calm"/> The holding calms Unleashing (−1 die)</label></div>` : ""}
        </form>`;
        return dialog(`Unleash: ${actor.name}`, content, "Unleash", async fd => {
            const d = fd.dominion;
            const time = fd.clock ? F.timeBonus(d, clock) : {};
            const plan = F.unleashPlan({ dominion: d, rating: i.dominions[d], origin: i.origin, court: i.court, mists: i.mists.perm, weaving: i.weaving.perm, mien: i.mien },
                { time, holding: fd.holding ? 1 : 0, holdingCalm: !!fd.calm, weavingSpent: Math.min(n(fd.weave), i.weaving.temp), base: n(fd.base) || 6 });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (plan.weavingSpent && !(await spend(actor, "weaving", plan.weavingSpent))) return null;
            const base = await rollPool(plan.dice, plan.difficulty);
            const wild = await rollPool(plan.wildDice, plan.wildDifficulty);
            const out = F.unleashOutcome(base, plan.wildDice ? wild : { successes: 0, botch: false });
            const back = await gain(actor, "mists", out.mistsBack);
            let body = rollBlock(`Mists + ${F.DOMINIONS[d].label}`, base, plan.notes) + (plan.wildDice ? rollBlock("Unleashing dice", wild) : `<div class="vta-note">No Unleashing dice left: no danger.</div>`);
            if (fd.intent) body += `<div class="vta-note">Intent: ${esc(String(fd.intent).slice(0, 200))}</div>`;
            const signs = `The ${F.DOMINIONS[d].label} shows itself: its visible signs come whatever happens.`;
            body += out.result === "controlled" ? `<div class="vta-big good">The power answers and obeys: ${out.successes} success${out.successes === 1 ? "" : "es"}.</div>`
                : out.result === "wild" ? `<div class="vta-big bad">The power answers, out of control: the Storyteller says what it does.</div>`
                : out.result === "signs" ? `<div class="vta-big">Nothing happens but the signs.</div>`
                : `<div class="vta-big bad">Havoc: the Mists break loose${d === "day" || d === "night" ? " (worse with Day and Night)" : ""}.</div>
                   <div class="vta-res">Before the Storyteller describes it, 2 Weaving lower it a step (never below the first, p. 102).</div>
                   <button type="button" class="vta-btn" data-fx="calm" data-actor="${esc(actor.uuid)}">Spend 2 Weaving: one step lower</button>`;
            body += `<div class="vta-note">${signs}${back ? ` +${back} Mists regained.` : ""}${i.imbalance === "weaving" ? " Weaving imbalance: Unleashing comes harder." : ""}</div><div class="wodx-quiet">${REF} pp. 102, 121–122</div>`;
            const msg = await post(actor, `${actor.name} Unleashes ${F.DOMINIONS[d].label}`, body, [base.roll, wild.roll].filter(Boolean));
            if (out.result === "havoc" && msg) await msg.setFlag(MOD, "daFaeHavoc", { actor: actor.uuid, step: 5, lowered: 0 });
            return msg;
        }, { width: 520 });
    }

    /* -------------------------------------------------------------- */
    /*  Countering                                                     */
    /* -------------------------------------------------------------- */

    async function counter(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const content = `<form>
          <div class="form-group"><label>How</label><select name="kind" data-fixed>
            <option value="absorb">Absorb a cantrip (Dominion + Weaving, 7; act first)</option>
            <option value="scatter">Scatter a cantrip (Mists, 5 + its level)</option>
            <option value="unravel">Unravel an Unleashing (Mists, 8)</option></select></div>
          <div class="form-group"><label>The cantrip's Dominion</label><select name="dominion" data-fixed>${DOM_OPTS(null)}</select></div>
          <div class="form-group"><label>The cantrip's level</label><input type="number" name="level" min="1" max="5" value="1"/></div>
          <div class="form-group"><label>The caster's successes</label><input type="number" name="theirs" min="0" max="20" value="1"/></div>
          <div class="form-group"><label><input type="checkbox" name="point"/> Spend a point for an automatic success (Weaving to absorb, Mists otherwise)</label></div>
        </form>`;
        return dialog(`Counter: ${actor.name}`, content, "Counter", async fd => {
            const plan = F.counterPlan(fd.kind, { mists: i.mists.perm, weaving: i.weaving.perm, rating: i.dominions[fd.dominion], level: n(fd.level) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            const point = !!fd.point && await spend(actor, plan.spend, 1);
            const r = await rollPool(plan.dice, plan.difficulty);
            const mine = (r.botch ? 0 : r.successes) + (point ? 1 : 0);
            const out = F.counterOutcome(fd.kind, mine, n(fd.theirs));
            if (out.mistsGain) await gain(actor, "mists", out.mistsGain);
            const label = { absorb: `${F.DOMINIONS[fd.dominion].label} + Weaving`, scatter: "Mists", unravel: "Mists" }[fd.kind];
            let body = rollBlock(label, r, [...(plan.needsFirst ? ["must act first"] : []), ...(point ? [`a ${plan.spend === "weaving" ? "Weaving" : "Mists"} point: +1 success`] : [])]);
            body += fd.kind === "unravel"
                ? (out.result === "botched" ? `<div class="vta-big good">Every success torn away: the Unleashing botches.</div>` : `<div class="vta-big">${out.left} of the caster's successes remain.</div>`)
                : (out.result === "countered" ? `<div class="vta-big good">The cantrip fails.${out.mistsGain ? " +1 Mists drawn from it." : ""}</div>` : `<div class="vta-big">The cantrip holds.</div>`);
            body += `<div class="wodx-quiet">${REF} pp. 130–131</div>`;
            return post(actor, `${actor.name} counters`, body, [r.roll].filter(Boolean));
        });
    }

    /* -------------------------------------------------------------- */
    /*  Echoes                                                         */
    /* -------------------------------------------------------------- */

    async function echo(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const oaths = i.oaths.map((o, k) => ({ ...o, k })).filter(o => o.active !== false);
        const content = `<form>
          <div class="form-group"><label>The Echo</label><select name="e" data-fixed><option value="">(another)</option>${i.echoes.map((e, k) => `<option value="${k}">${esc(e.trigger)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Who wields it</label><select name="who" data-fixed><option value="none">No one (bells, holy ground): 5 dice</option><option value="mortal">A mortal: their Willpower</option></select></div>
          <div class="form-group"><label>The mortal's Willpower</label><input type="number" name="will" min="1" max="10" value="5"/></div>
          <div class="form-group"><label><input type="checkbox" name="name"/> The fae's true name (level 5 before oaths)</label></div>
          ${oaths.length ? `<fieldset><legend>Oaths to call on (rating at 7)</legend>${oaths.map(o => `<div class="form-group"><label><input type="checkbox" name="o-${o.k}" checked/> ${esc(oathLine(o))}</label></div>`).join("")}</fieldset>` : `<p class="wodx-quiet">No active oaths.</p>`}
          ${i.sprites ? `<div class="form-group"><label>Sprites dice to add (up to ${i.sprites} a session)</label><input type="number" name="sprites" min="0" max="${i.sprites}" value="0"/></div>` : ""}
          <div class="form-group"><label>Weaving to spend (2 a success)</label><input type="number" name="weave" min="0" max="10" step="2" value="0"/></div>
        </form>`;
        return dialog(`Face an Echo: ${actor.name}`, content, "Roll", async fd => {
            const e = fd.e !== "" && fd.e != null ? i.echoes[n(fd.e)] : null;
            const rolls = [];
            let er = { successes: 0, botch: false };
            if (!fd.name) { er = await rollPool(fd.who === "mortal" ? Math.max(1, n(fd.will)) : 5, 7); rolls.push(er.roll); }
            let oathS = 0, body = "";
            if (!fd.name) body += rollBlock(fd.who === "mortal" ? "The mortal's Willpower" : "The Echo (5 dice)", er, [`${i.O.label}: ${i.O.echoShift > 0 ? "+1 success" : i.O.echoShift < 0 ? "−1 success" : "no shift"}`]);
            const spriteDice = Math.min(n(fd.sprites), i.sprites);
            let spriteLeft = spriteDice;
            for (const o of oaths) {
                if (!fd[`o-${o.k}`]) continue;
                const extra = spriteLeft; spriteLeft = 0;
                const r = await rollPool(o.rating + extra, 7); rolls.push(r.roll);
                oathS += r.botch ? 0 : r.successes;
                body += rollBlock(`${esc(F.OATHS[o.kind]?.label ?? "Oath")} ${o.rating}${extra ? ` + Sprites ${extra}` : ""}`, r);
            }
            if (spriteLeft) { const r = await rollPool(spriteLeft, 7); rolls.push(r.roll); oathS += r.botch ? 0 : r.successes; body += rollBlock(`Sprites ${spriteLeft}`, r); }
            const weave = Math.min(n(fd.weave) - (n(fd.weave) % 2), i.weaving.temp - (i.weaving.temp % 2));
            if (weave && !(await spend(actor, "weaving", weave))) return null;
            const level = F.echoLevel({ successes: er.botch ? 0 : er.successes, origin: i.origin, oathSuccesses: oathS, weavingSpent: weave, trueName: !!fd.name });
            body += `<div class="vta-big ${level ? "bad" : "good"}">${level ? `Echo, level ${level}` : "The Echo fails"}${e ? `: ${esc(e.trigger)}` : ""}.</div><div class="vta-res">${esc(F.ECHO_LEVELS[level])}</div>`;
            if (weave) body += `<div class="vta-note">${weave} Weaving spent: −${weave / 2}.</div>`;
            if (level >= 1 && level <= 5) body += `<div class="vta-note">For instance: ${F.ECHO_PICKS[level].map(esc).join("; ")}.</div>`;
            if (level === 5) {
                const h = F.echoFive(i.origin);
                body += `<div class="vta-note">${h.aggravated ? `${h.aggravated} aggravated levels, then ${h.lethalPerTwoTurns} lethal per two turns near it` : esc(h.note)}${h.aggravated && h.note ? ` ${esc(h.note)}` : ""}.</div>`;
                if (h.aggravated) body += `<button type="button" class="vta-btn" data-fx="echo5" data-actor="${esc(actor.uuid)}" data-gm>Apply ${h.aggravated} aggravated</button>`;
            }
            body += `<div class="wodx-quiet">${REF} pp. 102, 110–113</div>`;
            const msg = await post(actor, `${actor.name} meets an Echo`, body, rolls.filter(Boolean));
            if (msg) await msg.setFlag(MOD, "daFaeEcho", { actor: actor.uuid, level, done: false });
            return msg;
        }, { width: 520 });
    }

    /* -------------------------------------------------------------- */
    /*  The Mists, the mien, oaths, rest and cold iron                  */
    /* -------------------------------------------------------------- */

    async function mists(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const hidden = i.hiddenDays !== null;
        const content = `<form>
          <p><b>${esc(actor.name)}</b>: Mists ${i.mists.temp}/${i.mists.perm}.${hidden ? ` Hidden by the Mists for ${i.hiddenDays} day${i.hiddenDays === 1 ? "" : "s"} (Willpower ${i.willpower}).` : ""}${i.suppression.over ? " Weaving overspent today: +2 to Mists rolls." : ""}</p>
          <div class="form-group"><label>Use</label><select name="use" data-fixed>
            ${hidden ? `<option value="release">Let the Mists fall (end the hiding)</option>` : `<option value="hide">Hide from mortals (Mists, 7)</option>`}
            <option value="kenning">Bestow Kenning for a day</option>
            <option value="enhance">Enhance the mien for the scene (2)</option></select></div>
          <div class="form-group"><label>Kenning for</label><select name="target" data-fixed><option value="mortal">a mortal (1)</option><option value="humane-kindred">a Kindred on the Road of Humanity (1)</option><option value="homid">a homid Garou (1)</option><option value="supernatural">another supernatural being (2)</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="unwilling"/> Unwilling: they resist (Willpower 6 against Mists 6)</label></div>
        </form>`;
        return dialog(`The Mists: ${actor.name}`, content, "Do it", async fd => {
            const u = fd.use;
            let body = "", rolls = [];
            if (u === "hide") {
                const diff = 7 + i.suppression.mistsPenalty;
                const r = await rollPool(i.mists.perm, diff); rolls.push(r.roll);
                body += rollBlock("Mists", r, i.suppression.over ? ["+2: Weaving overspent today"] : []);
                if (r.successes && !r.botch) { await save(actor, { hiddenSince: game.time.worldTime }); body += `<div class="vta-big good">Hidden: mortals see an ordinary person.</div><div class="vta-note">Using a Dominion uncloaked ends it. Hidden more days than Willpower (${i.willpower}), the fae becomes Lost.</div>`; }
                else body += `<div class="vta-big">The Mists do not gather.</div>`;
            } else if (u === "release") {
                await save(actor, { hiddenSince: null });
                body += `<div class="vta-res">The Mists fall away after ${i.hiddenDays} day${i.hiddenDays === 1 ? "" : "s"}.</div>`;
            } else if (u === "kenning") {
                const cost = F.kenningCost(fd.target);
                if (!(await spend(actor, "mists", cost))) return null;
                body += `<div class="vta-res">${cost} Mists: Kenning 1 for a day.</div>`;
                if (fd.unwilling) { const r = await rollPool(i.mists.perm, 6 + i.suppression.mistsPenalty); rolls.push(r.roll); body += rollBlock("Mists (against their Willpower, 6)", r) + `<div class="vta-note">The Storyteller rolls the target's Willpower (6); more successes and the gift fails.</div>`; }
            } else if (u === "enhance") {
                if (!(await spend(actor, "mists", 2))) return null;
                body += `<div class="vta-res">2 Mists: a Lesser Feature works as a Greater one for the scene. Mortals who see it may bring a new Echo.</div>`;
            }
            body += `<div class="wodx-quiet">${REF} p. 101</div>`;
            return post(actor, `${actor.name} calls the Mists`, body, rolls.filter(Boolean));
        });
    }

    async function mien(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        if (i.O.alwaysMien) return notify(`${actor.name} is firstborn: always in the mien (hidden only by Day or the Mists).`);
        const lock = n(i.f.mienLockUntil);
        if (lock > game.time.worldTime) return notify(`${actor.name}'s form is locked for ${Math.ceil((lock - game.time.worldTime) / 3600)} more hour(s).`);
        const toMien = !i.mien;
        const useMists = i.origin === "changeling" && toMien;
        const r = await rollPool(useMists ? i.mists.perm : i.weaving.perm, 6 + (useMists ? i.suppression.mistsPenalty : 0));
        let body = rollBlock(useMists ? "Mists" : "Weaving", r);
        if (r.botch) { await save(actor, { mienLockUntil: game.time.worldTime + i.weaving.perm * 3600 }); body += `<div class="vta-big bad">Botch: locked in this form for ${i.weaving.perm} hour${i.weaving.perm === 1 ? "" : "s"}.</div>`; }
        else if (r.successes) { await save(actor, { mien: toMien }); body += `<div class="vta-big good">${toMien ? "The fae mien shows: it soaks lethal damage" + (i.origin === "changeling" ? " and can Unleash" : "") : "A human shape again"}.</div>`; }
        else body += `<div class="vta-big">The change does not come.</div>`;
        body += `<div class="wodx-quiet">${REF} pp. 63, 104–105</div>`;
        return post(actor, `${actor.name} ${toMien ? "takes the fae mien" : "puts on a human shape"}`, body, [r.roll].filter(Boolean));
    }

    async function keepOath(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const oaths = i.oaths.map((o, k) => ({ ...o, k })).filter(o => o.active !== false);
        if (!oaths.length) return notify(`${actor.name} keeps no active oath.`);
        const content = `<form><div class="form-group"><label>The oath kept</label><select name="o" data-fixed>${oaths.map(o => `<option value="${o.k}">${esc(oathLine(o))}</option>`).join("")}</select></div>
          <p class="wodx-quiet">Each time the fae takes the time to keep their side, roll the oath's rating (6): a Weaving point per success (Dark Ages: Fae p. 102).</p></form>`;
        return dialog(`Keep an oath: ${actor.name}`, content, "Roll", async fd => {
            const o = i.oaths[n(fd.o)];
            const r = await rollPool(o.rating, 6);
            const got = await gain(actor, "weaving", r.botch ? 0 : r.successes);
            return post(actor, `${actor.name} keeps an oath`, rollBlock(esc(oathLine(o)), r) + `<div class="vta-res ${got ? "good" : ""}">+${got} Weaving.</div><div class="wodx-quiet">${REF} pp. 102, 107–110</div>`, [r.roll].filter(Boolean));
        });
    }

    async function rest(actor) {
        const i = await needFae(actor);
        if (!i) return null;
        const content = `<form><div class="form-group"><label>Days in a faerie realm</label><input type="number" name="days" min="0" max="30" value="1"/></div>
          ${i.holdings ? `<div class="form-group"><label>Hours resting in a holding that restores (1 an hour)</label><input type="number" name="hours" min="0" max="24" value="0"/></div>` : ""}
          <p class="wodx-quiet">1 Mists and 1 Weaving a day in a faerie realm (Dark Ages: Fae p. 102).</p></form>`;
        return dialog(`Rest in a faerie realm: ${actor.name}`, content, "Rest", async fd => {
            const next = F.realmRest({ days: n(fd.days), hours: n(fd.hours), holdingRestores: !!i.holdings }, i);
            await save(actor, { mists: next.mists, weaving: next.weaving });
            return post(actor, `${actor.name} rests among the fae`, `<div class="vta-res good">Mists ${next.mists.temp}/${next.mists.perm}; Weaving ${next.weaving.temp}/${next.weaving.perm}.</div><div class="wodx-quiet">${REF} pp. 93, 102</div>`);
        });
    }

    /** Cold iron (p. 88): aggravated levels through WoDX Combat, and a Mists point lost per wound. */
    async function coldIron(actor, levels = null) {
        const i = await needFae(actor);
        if (!i) return null;
        const go = async k => {
            const r = await game.wodxCombat?.applyDamage?.(actor, "aggravated", k);
            const lost = Math.min(i.mists.temp, k);
            if (lost) await save(actor, { mists: { perm: i.mists.perm, temp: i.mists.temp - lost } });
            return post(actor, `Cold iron: ${actor.name}`, `<div class="vta-big bad">${k} aggravated level${k === 1 ? "" : "s"} (soakable); −${lost} Mists.</div>${r?.woundLabel ? `<div class="vta-res">Now ${esc(r.woundLabel)}.</div>` : ""}<div class="wodx-quiet">${REF} p. 88</div>`);
        };
        if (levels != null) return go(Math.max(1, n(levels)));
        return dialog(`Cold iron: ${actor.name}`, `<form><div class="form-group"><label>Levels after soak</label><input type="number" name="k" min="1" max="10" value="1"/></div></form>`, "Apply", fd => go(Math.max(1, n(fd.k))));
    }

    /** Card buttons: lower a havoc with Weaving; apply an Echo's level-5 harm. */
    async function onButton(msg, what) {
        if (what === "calm") {
            const h = msg.getFlag(MOD, "daFaeHavoc");
            const actor = h ? await fromUuid(h.actor) : null;
            if (!actor) return null;
            if (!actor.isOwner) return notify("Only the fae's player or the Storyteller spends the Weaving.");
            if (h.step <= 1) return notify("The havoc is at its first step: it cannot go lower.");
            if (!(await spend(actor, "weaving", 2))) return null;
            await msg.setFlag(MOD, "daFaeHavoc", { ...h, step: h.step - 1, lowered: h.lowered + 1 });
            return post(actor, `${actor.name} reins in the havoc`, `<div class="vta-res">2 Weaving: the havoc is ${h.lowered + 1} step${h.lowered ? "s" : ""} lower (step ${h.step - 1} of 5).</div><div class="wodx-quiet">${REF} p. 102</div>`);
        }
        if (what === "echo5") {
            if (!game.user.isGM) return null;
            const e = msg.getFlag(MOD, "daFaeEcho");
            const a = e?.actor ? await fromUuid(e.actor) : null;
            if (!a || e.level !== 5) return null;
            if (e.done) return notify("That Echo's harm is already applied.");
            await msg.setFlag(MOD, "daFaeEcho", { ...e, done: true });
            const r = await game.wodxCombat?.applyDamage?.(a, "aggravated", 3);
            return post(a, `Echo: ${a.name}`, `<div class="vta-big bad">3 aggravated levels.</div>${r?.woundLabel ? `<div class="vta-res">Now ${esc(r.woundLabel)}.</div>` : ""}`);
        }
        return null;
    }

    /** Each new day on the Chronicle clock: warn when hidden longer than Willpower, and count Weaving overspending. */
    async function daily() {
        if (!isActiveGM()) return;
        const day = Math.floor(game.time.worldTime / DAY);
        for (const actor of game.actors) {
            const f = actor.getFlag(MOD, "daFae");
            if (!f?.origin) continue;
            if (n(f.lastDay) === day) continue;
            const i = info(actor);
            const patch = { lastDay: day };
            const prev = f.weavingDay;
            if (prev && prev.day < day) {
                patch.weavingStreak = n(prev.n) > i.mists.perm && prev.day === day - 1 ? n(f.weavingStreak) + 1 : 0;
                patch.weavingDay = { day, n: 0 };
            }
            await actor.setFlag(MOD, "daFae", { ...f, ...patch });
            const warn = [];
            if (i.hiddenDays !== null && F.hiddenRisk(i.hiddenDays, i.willpower)) warn.push(`hidden by the Mists ${i.hiddenDays} days, more than Willpower ${i.willpower}: the fae becomes Lost (Dark Ages: Fae p. 101)`);
            if (n(patch.weavingStreak) > i.willpower) warn.push(`Weaving overspent ${patch.weavingStreak} days running, more than Willpower: the fae may become Locked (Dark Ages: Fae p. 102)`);
            if (warn.length) await ChatMessage.create({ whisper: [...new Set([...gmIds(), ...game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.id)])],
                content: `<div class="vta-card wodx-x"><div class="vta-body">${esc(actor.name)}: ${warn.map(esc).join("; ")}.</div></div>` });
        }
    }

    return { info, sheet, cast, unleash, counter, echo, mists, mien, keepOath, rest, coldIron, onButton, daily, clockNow, isDA, rules: F };
}
