/**
 * WoDX Actions 3.10 (Phase 6l): the crucible (Orpheus), on the system's mortal sheet set to Orpheus.
 *
 *   The traits     Shade, Lament and role from the Bio tab; Vitality (starting and current), Spite (rating and points), Willpower;
 *                  Horrors and Stains as Powers
 *   A Horror       its roll, the Vitality put into it (0 to 5), the Spite penalty, the ripple three or five points make
 *   Vitality       rest, a Willpower point for three, sharing with the crucible, tapping Spite (points or the rating)
 *   Harm           wounds to a spook's Vitality (a skimmer's body takes bashing instead); zero Vitality and Willpower
 *   Spite          where it stands against the starting Vitality; points from cruelty; a tether severed
 *   Projection     a skimmer's hours outside the body
 *
 * Built by main.js with its helpers (ctx). Pure rules: orpheus-rules.js.
 */
import * as O from "./orpheus-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = O.REF;
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());

export const isOrpheus = actor => !!actor && actor.type === "Mortal" && (actor.system?.settings?.variant === "orpheus" || (!!actor.system?.settings?.hasvitality && !!actor.system?.settings?.hasspite));

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, spendWillpower, notify } = ctx;
    const flag = a => a.getFlag(MOD, "orpheus") ?? {};
    const saveFlag = (a, patch) => ctx.setFlag(a, "orpheus", { ...flag(a), ...patch });
    const turnKey = () => `${game.combat?.id ?? ""}:${game.combat?.round ?? Math.floor((game.time?.worldTime ?? 0) / 6)}`;

    function info(actor) {
        const s = actor.system ?? {}, a = s.advantages ?? {};
        const items = actor.items ?? [];
        const horrors = items.filter(i => i.type === "Power" && /types\.horror$/.test(String(i.system?.type ?? "")));
        const stains = items.filter(i => i.type === "Power" && /types\.stain$/.test(String(i.system?.type ?? "")));
        const shade = O.shadeOf(s.variant?.shade) || flag(actor).shade || "";
        const lament = O.lamentOf(s.variant?.lament) || flag(actor).lament || "";
        const v = { start: n(a.vitality?.permanent), now: n(a.vitality?.temporary) };
        const sp = { rating: n(a.spite?.permanent), points: n(a.spite?.temporary) };
        return { shade, lament, role: s.variant?.role || "", vitality: v, spite: sp, willpower: { perm: n(a.willpower?.permanent), temp: n(a.willpower?.temporary) },
            horrors, stains, state: O.spiteState(sp.rating, v.start), seen: O.visibility(v.now), projector: O.LAMENTS[lament]?.kind === "projector", f: flag(actor) };
    }
    const line = i => `${i.shade ? O.SHADES[i.shade].label : "no Shade"}${i.lament ? ` ${O.LAMENTS[i.lament].label}` : ""}: Vitality ${i.vitality.now} (starting ${i.vitality.start}), Spite ${i.spite.rating} (${i.spite.points} points), Willpower ${i.willpower.temp}/${i.willpower.perm}`;
    async function setVitality(actor, v) {
        const i = info(actor);
        const capV = i.lament === "hue" ? Math.min(7, i.vitality.start || 7) : 10;
        await updateActor(actor, { "system.advantages.vitality.temporary": Math.max(0, Math.min(capV, n(v))) });
        // zero Vitality: a Willpower point is spent at once for three (p. 192)
        const z = O.zeroVitality({ vitality: info(actor).vitality.now, willpower: i.willpower.temp });
        if (z.state === "revived") { await updateActor(actor, { "system.advantages.vitality.temporary": 3, "system.advantages.willpower.temporary": z.willpower }); return "Vitality hits zero: a Willpower point is spent at once for three Vitality."; }
        if (z.state === "dissipates") return "No Vitality and no Willpower: the spook dissipates.";
        return "";
    }
    async function spentThisTurn(actor, k) {
        const f = flag(actor), key = turnKey();
        const total = (f.turn === key ? n(f.spent) : 0) + n(k);
        await saveFlag(actor, { turn: key, spent: total });
        return total;
    }

    /* -- a Horror -------------------------------------------------------- */
    async function horror(actor) {
        const i = info(actor);
        const traits = ctx.traits?.(actor) ?? [];
        const content = `<form><p>${line(i)}. ${esc(cap(i.state.text))}.</p>
          <div class="form-group"><label>Horror</label>${i.horrors.length > 5 ? searchBox("select[name=h]", "Search Horrors…", "Search Horrors") : ""}<select name="h">${i.horrors.map(x => `<option value="${x.id}">${esc(x.name)}${x.system?.value ? ` ${n(x.system.value)}` : ""}</option>`).join("") || `<option value="">(no Horrors on the sheet)</option>`}</select></div>
          <div class="form-group"><label>Vitality put in (0 to 5)</label><input type="number" name="v" min="0" max="5" value="0"/></div>
          <div class="form-group"><label>Attribute</label><select name="a" data-fixed><option value="">none</option>${ATTRS.map(k => `<option value="${k}">${cap(k)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Ability</label>${searchBox("select[name=b]", "Search Abilities…", "Search Abilities")}<select name="b"><option value="">none</option>${traits.filter(t => !ATTRS.includes(t.key)).map(t => `<option value="${esc(t.key)}">${esc(t.label)} ${t.value}</option>`).join("")}</select></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="d" min="2" max="10" value="6"/></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return dialog(`A Horror: ${actor.name}`, content, "Use", async fd => {
            const it = i.horrors.find(x => x.id === fd.h);
            const k = Math.max(0, Math.min(5, n(fd.v)));
            if (k > i.vitality.now) { notify(`${actor.name} has ${i.vitality.now} Vitality.`); return null; }
            let body = "", rolls = [];
            const note = k ? await setVitality(actor, i.vitality.now - k) : "";
            const total = k ? await spentThisTurn(actor, k) : 0;
            const pool = (fd.a ? ctx.attr(actor, fd.a) : 0) + (fd.b ? n(ctx.findAbility?.(actor, fd.b)?.value) : 0);
            const diff = n(fd.d) + i.state.penalty;
            const name = it ? esc(it.name) : "A Horror";
            if (pool) {
                const wp = !!fd.wp && await spendWillpower(actor, 1);
                const r = await rollPool(pool, diff, { willpower: wp }); rolls.push(r.roll);
                body += rollBlock(`${fd.a ? cap(fd.a) : ""}${fd.a && fd.b ? " + " : ""}${fd.b ? esc(traits.find(t => t.key === fd.b)?.label ?? fd.b) : ""}`, r, [`${k} Vitality`, ...(i.state.penalty ? ["+1 difficulty: Spite"] : []), ...(wp ? ["Willpower"] : [])]);
                body += `<div class="vta-big ${r.botch ? "bad" : r.successes ? "good" : ""}">${name} at ${k} Vitality: ${r.botch ? "a botch" : r.successes ? `${r.successes} success${r.successes === 1 ? "" : "es"}` : "it fails"}.</div>`;
            } else body += `<div class="vta-big good">${name} at ${k} Vitality (the effect for that much, as the Horror describes).</div>`;
            if (i.state.level >= 1) body += `<div class="vta-note">Spite at or above the starting Vitality: only the violent effects are safe.</div>`;
            const sym = O.symmetry(total);
            if (sym) body += `<div class="vta-note">Fearful symmetry: ${total} Vitality this turn ${esc(sym.text)}.</div>`;
            if (note) body += `<div class="vta-note">${esc(note)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 124, 190–193</div>`;
            return post(actor, `${actor.name}: ${it?.name ?? "a Horror"}`, body, rolls.filter(Boolean));
        }, { width: 520 });
    }

    /* -- Vitality ----------------------------------------------------------- */
    async function vitality(actor) {
        const i = info(actor);
        const others = (game.actors?.filter?.(a => a.id !== actor.id && isOrpheus(a)) ?? []);
        const content = `<form><p>${line(i)}. ${esc(cap(i.seen.text))}.</p>
          <div class="form-group"><label>How</label><select name="k" data-fixed><option value="rest">Rest (eight hours a point; an hour in the body for a projector)</option>
            <option value="wp">A Willpower point: three Vitality at once</option><option value="share">Share with a crucible-mate</option>
            <option value="tap">Tap Spite points (one Vitality each)</option><option value="taprating">Tap a Spite rating (Vitality to 10)</option></select></div>
          <div class="form-group"><label>Hours (rest) or points (share, tap)</label><input type="number" name="x" min="1" max="24" value="8"/></div>
          <div class="form-group"><label><input type="checkbox" name="body"${i.projector ? " checked" : ""}/> Resting in the living body</label></div>
          <div class="form-group"><label>Share with</label>${others.length > 5 ? searchBox("select[name=to]", "Search the crucible…", "Search the crucible") : ""}<select name="to"><option value="">—</option>${others.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div></form>`;
        return dialog(`Vitality: ${actor.name}`, content, "Go", async fd => {
            let body = "", rolls = [];
            if (fd.k === "rest") {
                const v = O.rest(i.vitality.now, i.vitality.start, n(fd.x), !!fd.body);
                await setVitality(actor, v);
                body = `<div class="vta-res">${n(fd.x)} ${n(fd.x) === 1 ? "hour" : "hours"} of rest: Vitality ${v} (rest stops at the starting ${i.vitality.start}; any loss starts the clock again).</div>`;
            } else if (fd.k === "wp") {
                if (!(await spendWillpower(actor, 1))) return null;
                await setVitality(actor, O.willpowerBoost(i.vitality.now));
                body = `<div class="vta-res good">A second wind: Vitality ${info(actor).vitality.now}.</div>`;
            } else if (fd.k === "share") {
                const to = game.actors.get(fd.to);
                const k = Math.min(n(fd.x), i.vitality.now);
                if (!to || !k) { notify(`${actor.name}: choose a crucible-mate and some Vitality.`); return null; }
                const tv = n(to.system?.advantages?.vitality?.temporary);
                await setVitality(actor, i.vitality.now - k);
                await updateActor(to, { "system.advantages.vitality.temporary": Math.min(O.lamentOf(to.system?.variant?.lament) === "hue" ? Math.min(7, n(to.system?.advantages?.vitality?.permanent) || 7) : 10, tv + k) });
                const sym = O.symmetry(await spentThisTurn(actor, k));
                body = `<div class="vta-res">${k} Vitality to ${esc(to.name)} (${n(to.system.advantages.vitality.temporary)}). In contact, after two weeks together; a month of sharing links the crucible by sight.</div>${sym ? `<div class="vta-note">${esc(sym.text)}.</div>` : ""}`;
            } else {
                const rating = fd.k === "taprating";
                if (!rating && !i.spite.points) { notify(`${actor.name} has no Spite points to tap.`); return null; }
                if (rating && !i.spite.rating) { notify(`${actor.name} has no Spite rating to tap.`); return null; }
                const k = rating ? 1 : Math.min(n(fd.x), i.spite.points);
                const r = await rollPool(k, 7); rolls.push(r.roll);
                const t = O.tapSpite({ spitePoints: i.spite.points, spiteRating: i.spite.rating, vitality: i.vitality.now }, r.faces, { rating, count: k });
                await updateActor(actor, { "system.advantages.spite.temporary": t.spitePoints, "system.advantages.spite.permanent": t.spiteRating });
                await setVitality(actor, t.vitality);
                body = rollBlock(rating ? "The Spite rating, tapped" : `${k} Spite ${k === 1 ? "point" : "points"}, tapped`, r)
                    + `<div class="vta-res ${t.newRatings ? "bad" : ""}">Vitality ${t.vitality}. Spite ${t.spiteRating} (${t.spitePoints} points)${t.newRatings ? `: +${t.newRatings} Spite ${t.newRatings === 1 ? "rating" : "ratings"}, and a new Stain for each` : ""}.${t.spectre ? " Spite 10: the spook becomes a Spectre." : ""}</div>`;
            }
            body += `<div class="wodx-quiet">${REF} pp. 190–192</div>`;
            return post(actor, `${actor.name}: Vitality`, body, rolls.filter(Boolean));
        });
    }

    /* -- harm, Spite, projection -------------------------------------------- */
    async function harm(actor) {
        const i = info(actor);
        const content = `<form><p>${line(i)}. ${i.lament === "skimmer" ? "A skimmer's soul takes its wounds in the body, as bashing (soak at 5)." : "A ghost's or projected sleeper's wounds come off its Vitality."}</p>
          <div class="form-group"><label>Levels (after soak)</label><input type="number" name="k" min="1" max="10" value="1"/></div></form>`;
        return dialog(`Harm to the spook: ${actor.name}`, content, "Apply", async fd => {
            const k = n(fd.k);
            let body = "";
            if (i.lament === "skimmer") {
                const d = await ctx.applyDamage(actor, "bashing", k);
                body = `<div class="vta-res bad">${k} bashing to the body.${d?.condition?.text ? ` ${esc(d.condition.text)}` : ""}</div>`;
            } else {
                const note = await setVitality(actor, i.vitality.now - k);
                body = `<div class="vta-res bad">−${k} Vitality (${info(actor).vitality.now}).</div>${note ? `<div class="vta-note">${esc(note)}</div>` : ""}`;
            }
            return post(actor, `${actor.name} is hurt`, body + `<div class="vta-note">${esc(cap(O.visibility(info(actor).vitality.now).text))}.</div><div class="wodx-quiet">${REF} pp. 122, 189–192, 237</div>`);
        });
    }
    async function spite(actor) {
        const i = info(actor);
        const content = `<form><p>${line(i)}. ${esc(cap(i.state.text))}. Stains may be called up at will from Spite 4.</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="gain">Spite points from a cruel act (draining another spook, and the like)</option>
            <option value="tether">A ghost's tether severed by this spook (the Storyteller may take points)</option><option value="last">The last tether: the ghost moves on (−1 Spite rating)</option>
            <option value="spectre">Facing a Spectre (Willpower at the Spite rating)</option></select></div>
          <div class="form-group"><label>Points</label><input type="number" name="x" min="0" max="10" value="1"/></div></form>`;
        return dialog(`Spite: ${actor.name}`, content, "Apply", async fd => {
            let body = "", rolls = [];
            if (fd.k === "gain" || fd.k === "tether") {
                let pts = i.spite.points + (fd.k === "gain" ? n(fd.x) : -n(fd.x)), rat = i.spite.rating, up = 0;
                while (pts >= 10) { pts -= 10; rat += 1; up += 1; }
                pts = Math.max(0, pts);
                await updateActor(actor, { "system.advantages.spite.temporary": pts, "system.advantages.spite.permanent": Math.min(10, rat) });
                body = `<div class="vta-res ${fd.k === "gain" ? "bad" : "good"}">Spite ${Math.min(10, rat)} (${pts} points)${up ? `: ten points make a rating (+${up})` : ""}.</div>`;
            } else if (fd.k === "last") {
                await updateActor(actor, { "system.advantages.spite.permanent": O.severLast(i.spite.rating) });
                body = `<div class="vta-res good">A soul goes to its rest: Spite ${O.severLast(i.spite.rating)}.</div>`;
            } else {
                if (i.state.level < 2) body = `<div class="vta-res">Spite has not passed the starting Vitality: no roll is needed.</div>`;
                else {
                    const r = await rollPool(i.willpower.perm, Math.max(2, i.spite.rating)); rolls.push(r.roll);
                    body = rollBlock("Willpower against the siren-call", r) + `<div class="vta-res">${r.successes ? "The spook fights the Spectre as normal." : "+2 difficulty to every action against the Spectre this scene."}</div>`;
                }
            }
            body += `<div class="vta-note">${esc(cap(O.spiteState(info(actor).spite.rating, i.vitality.start).text))}.</div><div class="wodx-quiet">${REF} pp. 192–193</div>`;
            return post(actor, `${actor.name}: Spite`, body, rolls.filter(Boolean));
        });
    }
    async function project(actor) {
        const i = info(actor);
        const content = `<form><p>${line(i)}. ${i.lament === "skimmer" ? "Outside the body: a Vitality point an hour, or a bashing level." : "Only skimmers pay by the hour."}</p>
          <div class="form-group"><label>Hours outside the body</label><input type="number" name="h" min="1" max="24" value="1"/></div>
          <div class="form-group"><label><input type="checkbox" name="hurt"/> Take bashing instead of Vitality</label></div></form>`;
        return dialog(`Projection: ${actor.name}`, content, "Apply", async fd => {
            if (i.lament !== "skimmer") { notify(`${actor.name} is not a skimmer.`); return null; }
            const h = n(fd.h);
            let body;
            if (fd.hurt) { await ctx.applyDamage(actor, "bashing", h); body = `<div class="vta-res bad">${h} bashing to the waiting body.</div>`; }
            else { const pay = Math.min(h, i.vitality.now), left = h - pay; const note = await setVitality(actor, i.vitality.now - pay); if (left) await ctx.applyDamage(actor, "bashing", left); body = `<div class="vta-res">${pay} Vitality${left ? ` and ${left} bashing` : ""} for ${h} ${h === 1 ? "hour" : "hours"} out.</div>${note ? `<div class="vta-note">${esc(note)}</div>` : ""}`; }
            return post(actor, `${actor.name} projects`, body + `<div class="wodx-quiet">${REF} p. 122</div>`);
        });
    }
    async function setup(actor) {
        const i = info(actor);
        const nat = O.natureMods(actor.system?.nature);
        const start = i.shade ? O.startingAdvantages(i.shade, nat ?? {}, i.lament) : null;
        const known = i.horrors.map(h => O.horrorOf(h.name)).filter(Boolean);
        const learn = i.shade ? Object.keys(O.HORRORS).filter(h => !known.includes(h)).map(h => ({ h, c: O.canLearn(i.shade, h, known) })) : [];
        const S = O.SHADES[i.shade], L = O.LAMENTS[i.lament];
        const body = `<div class="vta-sec">${line(i)}${i.role ? `; ${esc(i.role)}` : ""}.</div>
          ${S ? `<div class="vta-res">${esc(S.label)}: ${esc(S.gloss)}; starts with ${esc(O.HORRORS[S.horror].label)}${S.prohibited.length ? `; never ${S.prohibited.map(h => esc(O.HORRORS[h].label)).join(" or ")}` : ""}.</div>` : `<div class="vta-res">Write the Shade on the Bio tab (Banshee, Haunter, Poltergeist, Skinrider or Wisp).</div>`}
          ${L ? `<div class="vta-res">${esc(L.label)} (${L.kind}): ${esc(L.bonus)}; but ${esc(L.weakness)}.</div>` : ""}
          ${start ? `<div class="vta-note">From the Shade and the Nature${nat ? "" : " (Nature not recognized: Shade only)"}: Vitality ${start.vitality}, Willpower ${start.willpower}, Spite ${start.spite}.</div>` : ""}
          ${learn.length ? `<div class="vta-note">Horrors open to learn: ${learn.filter(x => x.c.ok).map(x => `${esc(O.HORRORS[x.h].label)} (${x.c.freebies} freebies)`).join(", ") || "none"}.</div>` : ""}
          <div class="vta-note">${esc(cap(i.seen.text))}. ${esc(cap(i.state.text))}.${O.canUseStains(i.spite.rating) ? " Stains can be called up at will." : ""}</div>
          <div class="wodx-quiet">${REF} pp. 122–124, 129–130, 188–193</div>`;
        return post(actor, `${actor.name}, of the crucible`, body);
    }

    return { info, horror, vitality, harm, spite, project, setup, isOrpheus, rules: O };
}
