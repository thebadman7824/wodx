/**
 * WoDX Actions 3.7 (Phase 6f): Dark Ages mages (Dark Ages: Mage).
 *
 *   Fellowship and Pillars  the fellowship, its Foundation and four Pillars on the actor (flags), with the Foundation's
 *                           perks, the aura and the foci
 *   Cast a spell            simple or complex, the difficulty and the cap at 9, Quintessence to steady and to lower,
 *                           foci, belief, hurried casting, the sanctum, earlier tries this scene, rotes as presets;
 *                           the card gives duration and distance by successes
 *   Backlash                Quintessence to cancel the 1s, then Branding, Manifestation, Scourging or Twilight, as the
 *                           Storyteller picks; Scourging through WoDX Combat
 *   Twilight and Brandings  kept on the actor; they fade with abstinence on the Chronicle clock
 *   Cray and Fount          absorb from a cray, the Fount's monthly rite
 *
 * Built by main.js with its helpers (ctx). Pure rules: mage-da-rules.js.
 */
import * as M from "./mage-da-rules.js";
import * as G from "./mage-da-grimoire.js";
import * as P from "./profiles.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const DAY = 86400;
const REF = "Dark Ages: Mage";
const GREF = "Grimoire";
/** The page reference for a rote: the core book's page, or the Grimoire's. */
const rotePage = r => r.book === "G" ? `${GREF} p. ${r.page}` : `p. ${r.page}`;

/** The Chronicle clock's date now: {month, day, weekday, moon, isNight}; null without the Chronicle. */
async function clockNow() {
    try {
        const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
        const lat = game.settings.get("wodx-chronicle", "latitude");
        return cal.describeTime(game.time.worldTime, lat);
    } catch (e) { return null; }
}

export function eraId() { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } }
/** A Dark Ages mage: the actor's own choice, else the era (the Dark Ages profile). */
export function isDA(actor) {
    const f = actor?.getFlag?.(MOD, "daMage");
    if (f?.system === "m20") return false;
    if (f?.fellowship) return true;
    return M.isDarkAgesEra(eraId());
}

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, setFlag, attr, background, spendWillpower, notify } = ctx;
    const abilityOf = (actor, k) => n(ctx.findAbility?.(actor, k)?.value);
    const permWill = actor => n(ctx.willpower?.(actor)?.perm ?? actor?.system?.advantages?.willpower?.permanent);

    function info(actor) {
        const f = actor.getFlag(MOD, "daMage") ?? {};
        const fellowship = M.FELLOWSHIPS[f.fellowship] ? f.fellowship : null;
        const pillars = M.pillarsOf(fellowship).map(p => ({ ...p, rating: n(f.pillars?.[p.key]) }));
        const q = P.resource(actor, "quintessence");
        return { f, fellowship, F: M.FELLOWSHIPS[fellowship] ?? null, foundation: n(f.foundation) || (fellowship ? 1 : 0), pillars,
            ratings: Object.fromEntries(pillars.map(p => [p.key, p.rating])), twilight: { temp: n(f.twilight?.temp), perm: n(f.twilight?.perm) },
            brandings: Array.isArray(f.brandings) ? f.brandings : [], quintessence: q, fount: background(actor, "Fount"), cray: background(actor, "Cray"),
            sanctum: background(actor, "Sanctum"),
            specialty: { foundation: String(f.specialties?.foundation ?? ""), pillars: { ...(f.specialties?.pillars ?? {}) } } };
    }
    const save = (actor, patch) => setFlag(actor, "daMage", { ...(actor.getFlag(MOD, "daMage") ?? {}), ...patch });
    const sceneKey = () => `${game.scenes?.viewed?.id ?? ""}:${game.combat?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}`;

    /* -------------------------------------------------------------- */
    /*  Fellowship and Pillars                                         */
    /* -------------------------------------------------------------- */

    async function sheet(actor) {
        const i = info(actor);
        const fopts = Object.entries(M.FELLOWSHIPS).map(([k, v]) => `<option value="${k}"${k === i.fellowship ? " selected" : ""}>${esc(v.label)} (${esc(v.foundation)})</option>`).join("");
        const pillarRows = fid => M.pillarsOf(fid).map(p => `<div class="form-group"><label>${esc(p.label)} <small>${esc(p.domain)}</small></label>
            <input type="number" name="p-${p.key}" min="0" max="5" value="${n(i.f.pillars?.[p.key])}"/></div>`).join("");
        const perks = i.F ? Object.entries(i.F.perks).map(([lv, t]) => `<li${i.foundation >= Number(lv) ? "" : ' class="wodx-quiet"'}>${lv}: ${esc(t)}</li>`).join("") : "";
        const marks = i.brandings.length ? i.brandings.map(b => `<li>Level ${b.level}${b.text ? `: ${esc(b.text)}` : ""}</li>`).join("") : "<li class=\"wodx-quiet\">none</li>";
        const content = `<form class="wodx-da-mage">
          <div class="form-group"><label>Fellowship</label><select name="fellowship" data-fixed><option value="">(choose)</option>${fopts}</select></div>
          <div class="form-group"><label>Foundation${i.F ? ` (${esc(i.F.foundation)})` : ""}</label><input type="number" name="foundation" min="0" max="5" value="${i.foundation}"/></div>
          <fieldset><legend>Pillars</legend><div class="wodx-da-pillars">${pillarRows(i.fellowship)}</div>
            ${i.fellowship ? "" : `<p class="wodx-quiet">Choose a fellowship and save to see its Pillars.</p>`}</fieldset>
          ${i.F ? `<fieldset><legend>${esc(i.F.foundation)}: what each level grants</legend><ul>${perks}</ul>
            <p class="wodx-quiet">Foci: ${esc(i.F.foci)}. Specialties: ${esc(i.F.specialties.join(", "))}.${i.F.bar ? ` The ${esc(i.F.bar)}.` : ""} Aura ±${M.auraOf(i.foundation)} (p. 89).</p></fieldset>` : ""}
          ${i.F ? `<fieldset><legend>Specialties <small>at 4 dots or more (${GREF} p. 112)</small></legend>
            <div class="form-group"><label>${esc(i.F.foundation)} specialty (+1 die)</label><select name="specF" data-fixed><option value="">none</option>${i.F.specialties.map(x => `<option${x === i.specialty.foundation ? " selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
            ${i.pillars.map(p => `<div class="form-group"><label>${esc(p.label)} specialty (10s re-rolled)</label><input type="text" name="spec-${p.key}" maxlength="60" value="${esc(i.specialty.pillars[p.key] ?? "")}"/></div>`).join("")}
            <p class="wodx-quiet">Experience: a specialty costs ${G.SPECIALTY.xp.foundation} (Foundation) or ${G.SPECIALTY.xp.pillar} (Pillar). Another fellowship's magic: a new Foundation ${G.XP_FOREIGN.newFoundation}, then current × 10; a new Pillar ${G.XP_FOREIGN.newPillar}, then current × 8 (${GREF} p. 118).</p></fieldset>` : ""}
          <fieldset><legend>Twilight and Brandings</legend>
            <div class="form-group"><label>Twilight, temporary</label><input type="number" name="twt" min="0" max="9" value="${i.twilight.temp}"/></div>
            <div class="form-group"><label>Twilight, permanent</label><input type="number" name="twp" min="0" max="10" value="${i.twilight.perm}"/></div>
            <p class="wodx-quiet">${esc(M.twilightStage(i.twilight.perm))}. Brandings:</p><ul>${marks}</ul></fieldset>
          <div class="form-group"><label>Rules on this sheet</label><select name="system" data-fixed>
            <option value="">By the era (Dark Ages: Mage in the Dark Ages)</option><option value="da"${i.f.system === "da" ? " selected" : ""}>Dark Ages: Mage always</option>
            <option value="m20"${i.f.system === "m20" ? " selected" : ""}>Mage 20th always</option></select></div>
          <p class="wodx-quiet">Quintessence ${i.quintessence.value}${i.quintessence.max ? `/${i.quintessence.max}` : ""}; Fount ${i.fount} (holds ${M.fountLimits(i.fount).hold}, spends ${M.fountLimits(i.fount).perTurn} a turn); Cray ${i.cray}; Sanctum ${i.sanctum}. ${REF} pp. 79–93.</p>
        </form>`;
        return dialog(`Fellowship and Pillars: ${actor.name}`, content, "Save", async fd => {
            const fel = M.FELLOWSHIPS[fd.fellowship] ? fd.fellowship : null;
            const pillars = {};
            for (const p of M.pillarsOf(fel)) pillars[p.key] = Math.max(0, Math.min(5, n(fd[`p-${p.key}`])));
            const specialties = { foundation: fel === i.fellowship && i.F?.specialties.includes(fd.specF) ? fd.specF : "",
                pillars: Object.fromEntries(M.pillarsOf(fel).map(p => [p.key, String(fd[`spec-${p.key}`] ?? "").trim().slice(0, 60)]).filter(([, v]) => v)) };
            await save(actor, { fellowship: fel, foundation: Math.max(0, Math.min(5, n(fd.foundation))), pillars, system: fd.system || null, specialties,
                twilight: { temp: Math.max(0, Math.min(9, n(fd.twt))), perm: Math.max(0, Math.min(10, n(fd.twp))) } });
            notify(`${actor.name}: ${fel ? M.FELLOWSHIPS[fel].label : "no fellowship"} saved.`);
            return true;
        }, { width: 520 });
    }

    /* -------------------------------------------------------------- */
    /*  Casting                                                        */
    /* -------------------------------------------------------------- */

    async function cast(actor) {
        const i = info(actor);
        if (!i.fellowship) { notify(`${actor.name} has no fellowship yet: set it in Fellowship and Pillars.`); return sheet(actor); }
        const tries = actor.getFlag(MOD, "daTries"), here = tries?.key === sceneKey() ? tries : { failures: 0, botches: 0 };
        const rotes = M.ROTES.filter(r => r.f === i.fellowship);
        const now = await clockNow();
        const season = now ? G.seasonDay(now.month, now.day) : null;
        const sunday = now?.weekday === "Sunday" && i.fellowship === "messianic";
        const specF = i.specialty.foundation && G.specialtyAllowed(i.foundation) ? i.specialty.foundation : "";
        const specP = i.pillars.filter(p => i.specialty.pillars[p.key] && G.specialtyAllowed(p.rating));
        const lvlSel = p => `<select name="l-${p.key}" data-fixed>${[0, 1, 2, 3, 4, 5].map(v => `<option value="${v}"${v > p.rating ? " disabled" : ""}>${v === 0 ? "not used" : `level ${v}`}</option>`).join("")}</select>`;
        const content = `<form class="wodx-da-cast">
          <p><b>${esc(actor.name)}</b>: ${esc(i.F.label)}, ${esc(i.F.foundation)} ${i.foundation}; Quintessence ${i.quintessence.value}. Imagine the effect, then the Pillar level it needs (${REF} pp. 97–99).</p>
          <div class="form-group"><label>A rote</label>${rotes.length > 5 ? searchBox("select[name=rote]", "Search rotes…", "Search rotes") : ""}<select name="rote" data-fixed><option value="">(a spell of the mage's own)</option>${rotes.map(r => `<option value="${r.id}">${esc(r.name)}${r.book === "G" ? ` [${GREF}]` : ""} (${Object.entries(r.levels).map(([k, v]) => `${esc(i.pillars.find(p => p.key === k)?.label ?? k)} ${v}`).join(", ")})</option>`).join("")}</select></div>
          ${i.pillars.map(p => `<div class="form-group"><label>${esc(p.label)} (${p.rating}) <small>${esc(p.domain)}</small></label>${lvlSel(p)}</div>`).join("")}
          <div class="form-group"><label>Quintessence to lower the difficulty</label><input type="number" name="q" min="0" max="3" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="hurried"/> Hurried${i.fellowship === "oldfaith" && i.foundation >= 4 ? (i.foundation >= 5 ? " (Spontaneity 5: as a normal spell)" : " (Spontaneity 4: takes effect as cast)") : " (takes effect next turn; the shorter table)"}</label></div>
          <div class="form-group"><label><input type="checkbox" name="freeFocus"/> Uses a focus no longer needed (−1)</label></div>
          <div class="form-group"><label><input type="checkbox" name="belief"/> Works with the place's own beliefs (cancels a 1, p. 103)</label></div>
          <div class="form-group"><label><input type="checkbox" name="foreign"/> Another fellowship's magic (its foci are needed)</label></div>
          ${i.sanctum ? `<div class="form-group"><label><input type="checkbox" name="sanctum"/> In the sanctum (Sanctum ${i.sanctum}: no Backlash${i.sanctum >= 2 ? `, −${i.sanctum >= 3 ? 2 : 1} difficulty` : ""}${i.sanctum >= 5 ? ", +1 die" : ""})</label></div>` : ""}
          ${i.fellowship === "valdaermen" && i.foundation >= 5 ? `<div class="form-group"><label>Blot: lethal levels given for dice</label><input type="number" name="blot" min="0" max="7" value="0"/></div>` : ""}
          ${season ? `<div class="form-group"><label>Today is ${esc(season.label)}, which favours ${esc(season.suits)}</label><select name="season" data-fixed>
            <option value="suits">The spell suits it (−3)</option><option value="against">The spell goes against it (+3)</option></select></div>` : ""}
          ${sunday ? `<div class="form-group"><label><input type="checkbox" name="sunday" checked/> An instantaneous spell on a Sunday (−1; not extended or lasting)</label></div>` : ""}
          ${specF ? `<div class="form-group"><label><input type="checkbox" name="specF"/> Within the ${esc(i.F.foundation)} specialty, ${esc(specF)} (+1 die)</label></div>` : ""}
          ${specP.length ? `<div class="form-group"><label><input type="checkbox" name="specP"/> Within a Pillar's specialty (${specP.map(p => `${esc(p.label)}: ${esc(i.specialty.pillars[p.key])}`).join("; ")}; 10s re-rolled)</label></div>` : ""}
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
          <p class="wodx-quiet">Earlier this scene: ${here.failures} failure(s), ${here.botches} Backlash.</p>
        </form>`;
        return dialog(`Cast a spell: ${actor.name}`, content, "Cast", async fd => {
            const rote = M.ROTES.find(r => r.id === fd.rote) ?? null;
            const levels = rote ? { ...rote.levels } : Object.fromEntries(i.pillars.map(p => [p.key, n(fd[`l-${p.key}`])]));
            const sanctum = fd.sanctum ? i.sanctum : 0;
            const plan = M.castPlan({ levels, ratings: i.ratings, foundation: i.foundation, fellowship: i.fellowship },
                { quintessence: n(fd.q), freeFocus: !!fd.freeFocus, sanctum, failures: here.failures, botches: here.botches, blotDice: n(fd.blot),
                  season: season ? fd.season : null, sunday: sunday && !!fd.sunday, specialty: !!specF && !!fd.specF });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            const qSpend = Math.min(3, n(fd.q)) + plan.steady;
            const lim = M.fountLimits(i.fount);
            if (qSpend > lim.perTurn) { notify(`${actor.name} can spend only ${lim.perTurn} Quintessence a turn (Fount ${i.fount}, pp. 86–87).`); return null; }
            if (qSpend > i.quintessence.value) { notify(`${actor.name} has ${i.quintessence.value} Quintessence; the spell needs ${qSpend}.`); return null; }
            if (qSpend) await P.adjust(actor, "quintessence", -qSpend);
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            if (n(fd.blot)) await game.wodxCombat?.applyDamage?.(actor, "lethal", n(fd.blot), { status: true });
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp });
            // A Pillar specialty re-rolls 10s; the new dice only add successes (Grimoire p. 112)
            const specUsed = !!fd.specP && specP.some(p => n(levels[p.key]) > 0);
            const extraRolls = [];
            let bonus = 0;
            if (specUsed) for (let tens = G.tensIn(r.faces), k = 0; tens > 0 && k < 10; k++) {
                const rr = await rollPool(tens, plan.difficulty); extraRolls.push(rr.roll);
                bonus += rr.faces.filter(f => f >= plan.difficulty).length; tens = G.tensIn(rr.faces);
            }
            // Belief cancels one 1 (p. 103)
            let ones = r.ones, successes = r.successes;
            if (fd.belief && ones > 0) { ones -= 1; successes = Math.max(0, r.raw - ones) + (wp ? 1 : 0); }
            if (bonus) successes = Math.max(0, r.raw + bonus - ones) + (wp ? 1 : 0);
            const out = M.castOutcome({ raw: r.raw, ones, successes }, { extra: plan.extra, quintessenceSpent: qSpend, sanctum });
            const parts = [...plan.notes, ...(fd.belief ? ["belief cancels a 1"] : []), ...(fd.foreign ? ["another fellowship's magic: foci required"] : []), ...(wp ? ["Willpower"] : []), ...(qSpend ? [`${qSpend} Quintessence spent`] : []), ...(specUsed ? [`10s re-rolled: +${bonus} success${bonus === 1 ? "" : "es"}`] : [])];
            let body = rollBlock(`${esc(i.F.foundation)} ${i.foundation} + ${esc(rote ? rote.name : "the Pillar")}`, r, parts);
            const hurried = !!fd.hurried && !(i.fellowship === "oldfaith" && i.foundation >= 5);
            await save(actor, { lastCast: game.time.worldTime, fadeCarry: { twilight: 0, brandings: 0 }, lastFade: game.time.worldTime });
            if (out.result === "success") {
                const rc = M.reach(out.successes, hurried);
                body += `<div class="vta-big good">The spell takes hold: ${out.successes} success${out.successes === 1 ? "" : "es"}.</div>
                  <div class="vta-res">Lasts up to ${esc(rc.duration)}; reaches ${esc(rc.distance)}; ${esc(rc.note)}.${hurried && !(i.fellowship === "oldfaith" && i.foundation >= 4) ? " Hurried: it takes effect next turn (unless instant)." : ""}</div>
                  ${rote ? `<div class="vta-note">${esc(rote.name)}: ${esc(rote.system)}</div>` : ""}
                  <div class="wodx-quiet">${REF} pp. 98–105${rote ? `, ${rotePage(rote)}` : ""}</div>`;
                await setFlag(actor, "daTries", { key: sceneKey(), failures: here.failures, botches: here.botches });
            } else if (out.result === "failure") {
                body += `<div class="vta-big">No effect. Trying the same spell again this scene is +1 difficulty per failure.</div><div class="wodx-quiet">${REF} p. 100</div>`;
                await setFlag(actor, "daTries", { key: sceneKey(), failures: here.failures + 1, botches: here.botches });
            } else {
                body += `<div class="vta-big bad">Backlash: ${out.ones} one${out.ones === 1 ? "" : "s"} to answer for${qSpend ? ` (with ${qSpend} Quintessence spent)` : ""}.</div>
                  <div class="vta-res">Quintessence may cancel the 1s (1 for the first, 3 for two, 7 for three…). Then the Storyteller chooses the kind.</div>
                  ${btn("cancel", actor, "Spend Quintessence on the 1s")} ${Object.entries(M.BACKLASH).map(([k, l]) => btn(k, actor, l.split(" (")[0], true)).join(" ")}
                  <div class="wodx-quiet">${REF} pp. 136–140</div>`;
                await setFlag(actor, "daTries", { key: sceneKey(), failures: here.failures, botches: here.botches + 1 });
            }
            const msg = await post(actor, `${actor.name} casts${rote ? `: ${rote.name}` : ""}`, body, [r.roll, ...extraRolls].filter(Boolean));
            if (out.result === "backlash" && msg) await msg.setFlag(MOD, "daBacklash", { actor: actor.uuid, ones: out.ones, highest: plan.highest, pillarsUsed: plan.pillarsUsed, cancelled: 0, done: null });
            return msg;
        }, { width: 520, render: root => aim(root, { actor, cast: { intent: "e" } }) });
    }
    const btn = (what, actor, label, gm = false) => `<button type="button" class="vta-btn" data-mx="${what}" data-actor="${esc(actor.uuid)}"${gm ? " data-gm" : ""}>${esc(label)}</button>`;

    /* -------------------------------------------------------------- */
    /*  Backlash                                                       */
    /* -------------------------------------------------------------- */

    async function onButton(msg, what) {
        if (what === "duelx" || what === "duelyield") return duelButton(msg, what);
        const b = msg.getFlag(MOD, "daBacklash");
        if (!b) return null;
        const actor = await fromUuid(b.actor);
        if (!actor) return null;
        if (b.done) return notify("This Backlash has been settled.");
        const left = b.ones - b.cancelled;
        if (what === "cancel") {
            if (!actor.isOwner) return notify("Only the mage's player or the Storyteller spends the Quintessence.");
            const q = P.resource(actor, "quintessence").value, most = M.canCancel(q, left);
            if (!most) return notify(`${actor.name} has ${q} Quintessence: not enough to cancel a 1 (1 for the first).`);
            const content = `<form><p>${left} one(s) left; ${q} Quintessence. Cancelling k ones costs 2^k − 1 (pp. 140).</p>
              <div class="form-group"><label>Cancel</label><select name="k" data-fixed>${Array.from({ length: most }, (_, k) => `<option value="${k + 1}">${k + 1} (costs ${M.cancelCost(k + 1)})</option>`).join("")}</select></div></form>`;
            return dialog(`Cancel the 1s: ${actor.name}`, content, "Spend", async fd => {
                const k = Math.min(most, n(fd.k)), cost = M.cancelCost(k);
                await P.adjust(actor, "quintessence", -cost);
                const now = { ...b, cancelled: b.cancelled + k };
                if (now.cancelled >= now.ones) now.done = "cancelled";
                await msg.setFlag(MOD, "daBacklash", now);
                return post(actor, `${actor.name} steadies the spell`, `<div class="vta-res">${cost} Quintessence cancels ${k} one${k === 1 ? "" : "s"}.${now.done ? " Every 1 is answered: the spell simply fails." : ` ${now.ones - now.cancelled} left for the Storyteller.`}</div><div class="wodx-quiet">${REF} p. 140</div>`);
            });
        }
        if (!game.user.isGM) return notify("The Storyteller chooses the kind of Backlash.");
        if (!left) return notify("Nothing left to answer for.");
        const i = info(actor);
        let body = "";
        if (what === "branding") {
            const br = M.branding(left, b.highest);
            const content = `<form><p>Severity ${br.severity} (${left} × Pillar ${b.highest}): level ${br.level}, ${esc(br.effect)} (p. 137).</p>
              <div class="form-group"><label>The mark</label><input type="text" name="text" value="" placeholder="How it shows on the mage or around them"/></div></form>`;
            return dialog(`Branding: ${actor.name}`, content, "Mark", async fd => {
                const marks = M.addBranding(i.brandings, { level: br.level, text: String(fd.text ?? "").slice(0, 200), at: game.time.worldTime });
                await save(actor, { brandings: marks });
                await msg.setFlag(MOD, "daBacklash", { ...b, done: "branding" });
                return post(actor, `Branding: ${actor.name}`, `<div class="vta-big bad">Level ${br.level}: ${esc(br.effect)}.</div>${fd.text ? `<div class="vta-res">${esc(fd.text)}</div>` : ""}<div class="vta-note">Marks now: ${marks.map(m => m.level).join(", ")} (three at a level merge into one of the next).</div><div class="wodx-quiet">${REF} pp. 137–138</div>`);
            });
        }
        if (what === "manifestation") {
            const mf = M.manifestation(left, b.highest, b.pillarsUsed);
            body = `<div class="vta-big bad">${mf.points} point${mf.points === 1 ? "" : "s"} for whatever answers: ${esc(mf.buys)}.</div><div class="vta-note">The Storyteller builds it, fitting the mage's own beliefs or the land's.</div><div class="wodx-quiet">${REF} pp. 138–139</div>`;
        } else if (what === "scourging") {
            const sc = M.scourging(left, b.highest);
            const r = await game.wodxCombat?.applyDamage?.(actor, sc.type, sc.levels);
            body = `<div class="vta-big bad">${sc.levels} ${sc.type} level${sc.levels === 1 ? "" : "s"}; ${esc(sc.soak)}.</div>${r?.woundLabel ? `<div class="vta-res">Now ${esc(r.woundLabel)}.</div>` : ""}<div class="wodx-quiet">${REF} p. 139</div>`;
        } else if (what === "twilight") {
            const pts = M.twilightPoints(left, b.highest), tw = M.addTwilight(i.twilight, pts);
            await save(actor, { twilight: tw });
            body = `<div class="vta-big bad">+${pts} Twilight: ${tw.temp} temporary, ${tw.perm} permanent (${esc(M.twilightStage(tw.perm))}).</div><div class="vta-note">It fades only with abstinence from magic (pp. 140–141).</div><div class="wodx-quiet">${REF} p. 140</div>`;
        } else return null;
        await msg.setFlag(MOD, "daBacklash", { ...b, done: what });
        return post(actor, `${M.BACKLASH[what].split(" (")[0]}: ${actor.name}`, body);
    }

    /* -------------------------------------------------------------- */
    /*  Cray and Fount                                                 */
    /* -------------------------------------------------------------- */

    async function quintessence(actor) {
        const i = info(actor);
        const store = actor.getFlag(MOD, "crayStore");
        const day = Math.floor(game.time.worldTime / DAY);
        const held = i.cray ? (store ? Math.min(M.crayHolds(i.cray), n(store.value) + (store.tapped ? 0 : Math.max(0, day - n(store.day)))) : M.crayHolds(i.cray)) : 0;
        const fountMonth = actor.getFlag(MOD, "fountMonth");
        const month = Math.floor(game.time.worldTime / (30 * DAY));
        const now = await clockNow();
        const content = `<form><p><b>${esc(actor.name)}</b>: Quintessence ${i.quintessence.value} (holds ${M.fountLimits(i.fount).hold}). Cray ${i.cray}${i.cray ? `, about ${held} left in it` : ""}; Fount ${i.fount}.</p>
          <div class="form-group"><label>How</label><select name="how" data-fixed>
            ${i.cray ? `<option value="absorb">Absorb from the cray (Wits + Foundation, difficulty ${M.crayAbsorbDifficulty(i.cray)})</option><option value="tass">Harvest Tass (no roll; time and care)</option>` : ""}
            ${i.fount ? `<option value="fount"${fountMonth === month ? " disabled" : ""}>The Fount's rite (once a month: +${i.fount})</option>` : ""}
            ${now?.isNight ? `<option value="moon">An offering to the Moon, in a night casting (${esc(now.moon?.name ?? "")})</option>` : ""}
            <option value="umbra">A day in the Umbra (+1${i.fellowship === "spirit" && i.foundation >= 5 ? `, Sensitivity 5: +${Math.max(3, i.fount)}` : ""})</option></select></div>
          <div class="form-group"><label>Points of Tass</label><input type="number" name="tass" min="1" max="25" value="1"/></div>
          ${now?.isNight ? `<div class="form-group"><label>The offering to the Moon</label><select name="offer" data-fixed>${Object.entries(G.MOON_OFFERINGS).map(([k, o]) => `<option value="${k}">${esc(o.label)}${o.gain ? ` (${o.gain})` : ""}</option>`).join("")}</select></div>
          <div class="form-group"><label>Points for a greater sacrifice</label><input type="number" name="offerPts" min="1" max="10" value="4"/></div>` : ""}</form>`;
        return dialog(`Quintessence: ${actor.name}`, content, "Gather", async fd => {
            const room = M.fountLimits(i.fount).hold - i.quintessence.value;
            let gain = 0, body = "", rolls = [];
            if (fd.how === "absorb" || fd.how === "tass") {
                if (fd.how === "absorb") {
                    const r = await rollPool(attr(actor, "wits") + i.foundation, M.crayAbsorbDifficulty(i.cray)); rolls.push(r.roll);
                    body += rollBlock(`Wits + ${esc(i.F?.foundation ?? "Foundation")}`, r, [`difficulty 10 − Cray ${i.cray}`]);
                    gain = r.botch ? 0 : r.successes;
                } else gain = Math.max(1, n(fd.tass));
                gain = Math.min(gain, held, room);
                await setFlag(actor, "crayStore", { value: held - gain, day, tapped: true });
                body += `<div class="vta-note">The cray regains 1 a day only on days it is left untapped (p. 85).${held - gain <= 0 ? " It is empty: drawing past empty risks its life (p. 86)." : ""}</div>`;
            } else if (fd.how === "fount") { gain = Math.min(i.fount, room); await setFlag(actor, "fountMonth", month); }
            else if (fd.how === "moon") {
                const mo = G.moonOffering(fd.offer, now?.moon?.index ?? 2, n(fd.offerPts));
                gain = Math.min(mo.gain, room);
                body += `<div class="vta-note">The ${esc(mo.phase)} moon lends its power only to magic of ${esc(mo.fits)}${mo.phase === "full" ? " (+1 for the full moon)" : ""}; ${esc(mo.fades)} (${GREF} p. 111).</div>`;
            }
            else gain = Math.min(i.fellowship === "spirit" && i.foundation >= 5 ? Math.max(3, i.fount) : 1, room);
            if (gain) await P.adjust(actor, "quintessence", gain);
            body += `<div class="vta-res ${gain ? "good" : ""}">+${gain} Quintessence${room <= 0 ? " (already full)" : ""}.</div><div class="wodx-quiet">${fd.how === "moon" ? `${GREF} p. 111` : `${REF} pp. 84–89, 126`}</div>`;
            return post(actor, `${actor.name} gathers Quintessence`, body, rolls);
        });
    }


    /* -------------------------------------------------------------- */
    /*  Countermagic (Grimoire pp. 122–123)                            */
    /* -------------------------------------------------------------- */

    async function counter(actor) {
        const i = info(actor);
        if (!i.fellowship) { notify(`${actor.name} has no fellowship yet: set it in Fellowship and Pillars.`); return sheet(actor); }
        const opts = G.counterOptions(i.fellowship, i.ratings);
        const lab = k => i.pillars.find(p => p.key === k)?.label ?? k;
        const content = `<form class="wodx-da-counter">
          <p><b>${esc(actor.name)}</b>: ${esc(i.F.label)}; Quintessence ${i.quintessence.value}. Countermagic is reflexive, costs 1 Quintessence, and its successes cancel the spell's one for one, unless the way says otherwise (${GREF} pp. 122–123).</p>
          <div class="form-group"><label>The way</label><select name="way" data-fixed>${opts.map((o, k) => `<option value="${k}"${o.ok ? "" : " disabled"}>${esc(lab(o.key))} ${o.level}: ${esc(o.what)}${o.ok ? "" : " (not enough dots)"}</option>`).join("")}</select></div>
          <div class="form-group"><label>Successes of the spell being countered</label><input type="number" name="incoming" min="0" max="20" value="1"/></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
          <p class="wodx-quiet">Hermetics may also raise Aegis Magicus beforehand (a rote). Belief and the sanctum count as for any casting.</p></form>`;
        return dialog(`Countermagic: ${actor.name}`, content, "Counter", async fd => {
            const o = opts[n(fd.way)];
            if (!o?.ok) { notify(`${actor.name} lacks the Pillar for that countermagic.`); return null; }
            if (i.quintessence.value < 1) { notify(`${actor.name} has no Quintessence for countermagic.`); return null; }
            const plan = M.castPlan({ levels: { [o.key]: o.level }, ratings: i.ratings, foundation: i.foundation, fellowship: i.fellowship });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            await P.adjust(actor, "quintessence", -1);
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp });
            const got = Math.max(0, r.successes - plan.extra);
            const left = G.countered(n(fd.incoming), got);
            let body = rollBlock(`${esc(i.F.foundation)} ${i.foundation} + ${esc(lab(o.key))}`, r, [...plan.notes, "1 Quintessence", ...(wp ? ["Willpower"] : [])]);
            body += got ? `<div class="vta-big ${left ? "" : "good"}">${got} success${got === 1 ? "" : "es"} against the spell: ${left ? `${left} of its ${n(fd.incoming)} left` : "it is undone"}.</div>`
                : `<div class="vta-big">The countermagic fails${r.botch ? " badly" : ""}: the spell goes on as cast.</div>`;
            body += `<div class="vta-note">${esc(lab(o.key))} ${o.level}: ${esc(o.what)}.</div><div class="wodx-quiet">${GREF} pp. 122–123</div>`;
            return post(actor, `${actor.name}: countermagic`, body, [r.roll].filter(Boolean));
        }, { width: 520 });
    }

    /* -------------------------------------------------------------- */
    /*  Using the Art: the Pillar guide and wonders (Grimoire)          */
    /* -------------------------------------------------------------- */

    async function guide(actor) {
        const i = actor ? info(actor) : { fellowship: null };
        const fel = i.fellowship;
        const rows = G.ART_GUIDE.map(([effect, by, page]) => {
            const cells = Object.keys(M.FELLOWSHIPS).filter(k => !fel || k === fel).map(k => `<li><b>${esc(M.FELLOWSHIPS[k].label)}</b>: ${esc(by[k] || "the Storyteller decides")}</li>`).join("");
            return `<li data-search-text="${esc(`${effect} ${Object.values(by).join(" ")}`)}"><b>${esc(effect)}</b> <small>p. ${page}</small><ul data-fixed>${cells}</ul></li>`;
        }).join("");
        const levels = G.PILLAR_LEVELS.map((t, k) => k ? `<li>${k}: ${esc(t)}</li>` : "").join("");
        const wonders = G.WONDERS.map(w => `<li><b>${esc(w.name)}</b> <small>p. ${w.page}</small>: ${esc(w.effect)}</li>`).join("");
        const content = `<form class="wodx-da-guide">
          <p>Which Pillar level each fellowship needs for common effects${fel ? `, for ${esc(M.FELLOWSHIPS[fel].label)}` : ""}. A guide for the Storyteller's ruling, not a limit (${GREF} pp. 112–117, 153).</p>
          ${searchBox("ul.wodx-art", "Search effects…", "Search effects")}
          <ul class="wodx-art">${rows}</ul>
          <fieldset><legend>An effect not listed: Pillar levels as a guide (p. 117)</legend><ul data-fixed>${levels}</ul></fieldset>
          <fieldset><legend>Wonders (pp. 140–141)</legend><ul data-fixed>${wonders}</ul></fieldset>
        </form>`;
        return dialog(`Using the Art${actor ? `: ${actor.name}` : ""}`, content, "Close", async () => true, { width: 600 });
    }

    /* -------------------------------------------------------------- */
    /*  Certámen, the duel arcane (Grimoire pp. 119–122)                */
    /* -------------------------------------------------------------- */

    const mages = () => game.actors.filter(a => M.FELLOWSHIPS[a.getFlag?.(MOD, "daMage")?.fellowship]);

    /** The Storyteller starts a duel: stake, the locus Pillars, aegis and gladius; the contest of wills and the locus are rolled. */
    async function certamen(actor) {
        if (!game.user.isGM) return notify("The Storyteller runs Certámen: ask for it, and the Storyteller rolls both sides.");
        const others = mages().filter(a => a.id !== actor.id);
        if (!others.length) return notify("Certámen needs a second Dark Ages mage with a fellowship.");
        const a = info(actor);
        if (!a.fellowship) return notify(`${actor.name} has no fellowship yet.`);
        const content = `<form><p><b>${esc(actor.name)}</b> (${esc(a.F.label)}) challenges. ${esc(a.F.label)} ${esc(G.DUELLISTS[a.fellowship])} accept a challenge (${GREF} p. 121).</p>
          <div class="form-group"><label>The challenged mage</label>${others.length > 5 ? searchBox("select[name=foe]", "Search mages…", "Search mages") : ""}<select name="foe">${others.map(o => `<option value="${o.id}">${esc(o.name)} (${esc(M.FELLOWSHIPS[o.getFlag(MOD, "daMage").fellowship].label)})</option>`).join("")}</select></div>
          <div class="form-group"><label>The stake, stated plainly</label><input type="text" name="stake" maxlength="200" value=""/></div></form>`;
        return dialog(`Certámen: ${actor.name}`, content, "Next", async fd => {
            const foe = game.actors.get(fd.foe);
            if (!foe) return null;
            return certamenPillars(actor, foe, String(fd.stake ?? "").slice(0, 200));
        }, { width: 520 });
    }

    async function certamenPillars(actor, foe, stake) {
        const a = info(actor), b = info(foe);
        const sel = (side, x, name, label) => `<div class="form-group"><label>${esc(label)}</label><select name="${side}-${name}" data-fixed>${x.pillars.map(p => `<option value="${p.key}">${esc(p.label)} (${p.rating})</option>`).join("")}</select></div>`;
        const block = (side, x, who) => `<fieldset><legend>${esc(who.name)}: ${esc(x.F.foundation)} ${x.foundation}, Quintessence ${x.quintessence.value}</legend>
            ${sel(side, x, "locus", "Pillar to raise the locus")}${sel(side, x, "aegis", "Aegis (the shield)")}${sel(side, x, "gladius", "Gladius (the sword)")}</fieldset>`;
        const content = `<form><p>Stake: ${esc(stake || "(not stated)")}. Each extra use of one Pillar across the three adds +1 to all of that duellist's rolls.</p>
          ${block("a", a, actor)}${block("b", b, foe)}</form>`;
        return dialog("Certámen: the Pillars", content, "Begin", async fd => {
            const pick = (side, x) => ({ locus: fd[`${side}-locus`], aegis: fd[`${side}-aegis`], gladius: fd[`${side}-gladius`],
                pen: G.samePillarPenalty(fd[`${side}-locus`], fd[`${side}-aegis`], fd[`${side}-gladius`]) });
            const pa = pick("a", a), pb = pick("b", b);
            const rolls = [];
            // The contest of wills: Manipulation + Intimidation, at the other's permanent Willpower
            const will = async (who, other, pen) => { const r = await rollPool(attr(who, "manipulation") + abilityOf(who, "intimidation"), permWill(other) + pen); rolls.push(r.roll); return r; };
            const wa = await will(actor, foe, pa.pen), wb = await will(foe, actor, pb.pen);
            const bonus = G.willsBonus(wa, wb);
            let body = rollBlock(`${esc(actor.name)}: Manipulation + Intimidation`, wa, [`difficulty ${esc(foe.name)}'s Willpower`]) +
                rollBlock(`${esc(foe.name)}: Manipulation + Intimidation`, wb, [`difficulty ${esc(actor.name)}'s Willpower`]);
            // The locus: Foundation + the locus Pillar at 6, then 7, then 8 if both fail
            let out = null, la = null, lb = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                const diff = 5 + attempt;
                la = await rollPool(Math.max(0, a.foundation + n(a.ratings[pa.locus]) + bonus.a), diff + pa.pen); rolls.push(la.roll);
                lb = await rollPool(Math.max(0, b.foundation + n(b.ratings[pb.locus]) + bonus.b), diff + pb.pen); rolls.push(lb.roll);
                // Each success puts a Quintessence of what is at hand into the locus
                const ga = Math.min(la.successes, a.quintessence.value), gb = Math.min(lb.successes, b.quintessence.value);
                out = G.locusOutcome({ successes: ga }, { successes: gb }, attempt);
                body += rollBlock(`${esc(actor.name)}: the locus`, la, [`difficulty ${diff}`]) + rollBlock(`${esc(foe.name)}: the locus`, lb, [`difficulty ${diff}`]);
                if (out.result !== "again") break;
            }
            if (out.result === "off") { body += `<div class="vta-big">Neither can raise the locus three times over: the duel is called off, and the challenger yields.</div>`; }
            else if (out.result === "a-wins" || out.result === "b-wins") {
                const w = out.result === "a-wins" ? actor : foe;
                body += `<div class="vta-big">The locus fails on one side: ${esc(w.name)} wins the stake without a blow.</div>`;
            } else {
                await P.adjust(actor, "quintessence", -out.a); await P.adjust(foe, "quintessence", -out.b);
                body += `<div class="vta-big">The locus holds ${out.a} Quintessence for ${esc(actor.name)} and ${out.b} for ${esc(foe.name)}.</div>
                  <div class="vta-res">Roll Initiative as usual; the winner may strike first or make the other go first. Each turn, one strike and one deflection each.</div>
                  <button type="button" class="vta-btn" data-mx="duelx" data-gm>Strike</button> <button type="button" class="vta-btn" data-mx="duelyield" data-gm>A duellist yields</button>`;
            }
            body += `<div class="wodx-quiet">${GREF} pp. 119–122</div>`;
            const msg = await post(actor, `Certámen: ${actor.name} and ${foe.name}`, body, rolls.filter(Boolean));
            if (out.result === "duel" && msg) await msg.setFlag(MOD, "daDuel", { a: actor.uuid, b: foe.uuid, stake, pa, pb,
                locus: { a: out.a, b: out.b }, start: { a: out.a, b: out.b }, done: null });
            return msg;
        }, { width: 560 });
    }

    async function duelButton(msg, what) {
        const d = msg.getFlag(MOD, "daDuel");
        if (!d) return null;
        if (!game.user.isGM) return notify("The Storyteller runs Certámen.");
        if (d.done) return notify("This duel is over.");
        const A = await fromUuid(d.a), B = await fromUuid(d.b);
        if (!A || !B) return null;
        const who = { a: A, b: B };
        if (what === "duelyield") {
            const content = `<form><div class="form-group"><label>Who yields</label><select name="side" data-fixed><option value="a">${esc(A.name)}</option><option value="b">${esc(B.name)}</option></select></div></form>`;
            return dialog("Certámen: yielding", content, "Yield", async fd => finish(msg, d, who, fd.side === "a" ? "b" : "a", `${esc(who[fd.side].name)} yields.`));
        }
        const content = `<form><p>Locus: ${esc(A.name)} ${d.locus.a}, ${esc(B.name)} ${d.locus.b}.</p>
          <div class="form-group"><label>Who strikes</label><select name="side" data-fixed><option value="a">${esc(A.name)} strikes ${esc(B.name)}</option><option value="b">${esc(B.name)} strikes ${esc(A.name)}</option></select></div>
          <div class="form-group"><label>The striker's stance</label><select name="sa" data-fixed>${Object.entries(G.STANCES).map(([k, s]) => `<option value="${k}">${esc(s.label)} (attack ${s.attack}, deflect ${s.deflect})</option>`).join("")}</select></div>
          <div class="form-group"><label>The defender's stance</label><select name="sd" data-fixed>${Object.entries(G.STANCES).map(([k, s]) => `<option value="${k}">${esc(s.label)} (attack ${s.attack}, deflect ${s.deflect})</option>`).join("")}</select></div></form>`;
        return dialog("Certámen: a strike", content, "Strike", async fd => {
            const s = fd.side === "b" ? "b" : "a", o = s === "a" ? "b" : "a";
            const atk = who[s], def = who[o], ia = info(atk), idf = info(def), ps = d[`p${s}`], po = d[`p${o}`];
            const stA = G.STANCES[fd.sa] ?? G.STANCES.balanced, stD = G.STANCES[fd.sd] ?? G.STANCES.balanced;
            const lab = (x, k) => x.pillars.find(p => p.key === k)?.label ?? k;
            const ar = await rollPool(n(ia.ratings[ps.gladius]), stA.attack + ps.pen);
            const dr = await rollPool(n(idf.ratings[po.aegis]), stD.deflect + po.pen);
            const rolls = [ar.roll, dr.roll];
            let body = rollBlock(`${esc(atk.name)}: gladius, ${esc(lab(ia, ps.gladius))}`, ar, [`${stA.label}`]) + rollBlock(`${esc(def.name)}: aegis, ${esc(lab(idf, po.aegis))}`, dr, [`${stD.label}`]);
            const hit = G.strikeDamage(ar.successes, dr.successes, ia.foundation);
            const next = { ...d, locus: { ...d.locus } };
            if (!hit.hits) body += `<div class="vta-big">Deflected.</div>`;
            else {
                const dmg = await rollPool(hit.dice, 6), soak = await rollPool(idf.foundation, 6);
                rolls.push(dmg.roll, soak.roll);
                const k = G.knock(next.locus[o], dmg.successes, soak.successes);
                next.locus[o] = k.left;
                body += rollBlock(`${esc(atk.name)}: the blow`, dmg, [`${ia.foundation} + ${hit.dice - ia.foundation}`]) + rollBlock(`${esc(def.name)}: soak with the Foundation`, soak, []);
                body += `<div class="vta-big ${k.lost ? "bad" : ""}">${k.lost} Quintessence knocked from ${esc(def.name)}'s locus: ${k.left} left.</div>`;
                if (k.out) { await msg.setFlag(MOD, "daDuel", next); return finish(msg, next, who, s, `${esc(def.name)}'s locus is empty.`, body, rolls); }
            }
            await msg.setFlag(MOD, "daDuel", next);
            body += `<div class="vta-res">Locus: ${esc(A.name)} ${next.locus.a}, ${esc(B.name)} ${next.locus.b}. Use the first card's buttons for the next strike.</div><div class="wodx-quiet">${GREF} p. 121</div>`;
            return post(atk, `Certámen: ${atk.name} strikes`, body, rolls.filter(Boolean));
        }, { width: 520 });
    }

    /** The end: the winner takes the stake and its own locus back plus half the loser's; the loser keeps the rest. */
    async function finish(msg, d, who, winner, why, body = "", rolls = []) {
        const loser = winner === "a" ? "b" : "a";
        const sp = G.certamenSpoils(d.start[winner], d.start[loser]);
        await P.adjust(who[winner], "quintessence", sp.winner);
        await P.adjust(who[loser], "quintessence", sp.loser);
        await msg.setFlag(MOD, "daDuel", { ...d, done: winner });
        body += `<div class="vta-big good">${why} ${esc(who[winner].name)} wins${d.stake ? `: ${esc(d.stake)}` : ""}.</div>
          <div class="vta-res">${esc(who[winner].name)} takes back ${sp.winner} Quintessence; ${esc(who[loser].name)} keeps ${sp.loser}. No rematch for ${esc(sp.rematch)}.</div><div class="wodx-quiet">${GREF} p. 122</div>`;
        return post(who[winner], "Certámen: the end", body, rolls.filter(Boolean));
    }

    /* -------------------------------------------------------------- */
    /*  Fading with abstinence (on the Chronicle clock)                */
    /* -------------------------------------------------------------- */

    async function fadeAll() {
        if (!isActiveGM()) return;
        for (const actor of game.actors) {
            const f = actor.getFlag(MOD, "daMage");
            if (!f?.fellowship) continue;
            const since = n(f.lastFade ?? f.lastCast ?? game.time.worldTime);
            const days = Math.floor((game.time.worldTime - since) / DAY);
            if (days < 1) continue;
            const carry = f.fadeCarry ?? {};
            const tw = M.fadeTwilight({ temp: n(f.twilight?.temp), perm: n(f.twilight?.perm) }, days, n(carry.twilight));
            const br = M.fadeBrandings(Array.isArray(f.brandings) ? f.brandings : [], days, n(carry.brandings));
            const changed = tw.temp !== n(f.twilight?.temp) || tw.perm !== n(f.twilight?.perm) || br.marks.length !== (f.brandings?.length ?? 0);
            await actor.setFlag(MOD, "daMage", { ...f, twilight: { temp: tw.temp, perm: tw.perm }, brandings: br.marks, lastFade: since + days * DAY, fadeCarry: { twilight: tw.carry, brandings: br.carry } });
            if (changed) await ChatMessage.create({ whisper: [...new Set([...gmIds(), ...game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.id)])],
                content: `<div class="vta-card wodx-x"><div class="vta-body">${esc(actor.name)}: abstinence from magic eases the Backlash: Twilight ${tw.temp} temporary, ${tw.perm} permanent; Brandings ${br.marks.map(m => m.level).join(", ") || "none"} (${REF} pp. 140–141).</div></div>` });
        }
    }

    return { info, sheet, cast, onButton, quintessence, counter, guide, certamen, fadeAll, isDA, rules: M, grimoire: G };
}
