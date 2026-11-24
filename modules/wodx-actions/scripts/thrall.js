/**
 * WoDX Actions (B7920-B7926): the infernal thrall of Dark Ages: Devil's Due, the Foundry side; thrall-rules.js holds
 * the rules. Everything is in the flag wodx-actions.thrall.
 *
 *   The thrall window   Vice, Resolve and Torment on one line; a sin (the hierarchy, Conscience at 6), the Vice
 *                       calling, atonement, holy ground or a relic, reading the Aura of Sin, a Pact in three parts
 *                       and its failure, an Arcana or Taint from the master, Rites (research a week, perform a
 *                       summoning or binding), and Absolution of the Damned from an inquisitor
 *   Sins from play      the Road prompts (kindred.js sinPrompt) ask a thrall by the thrall's hierarchy instead
 *   At dawn (clock)     a point of Resolve back (a mage thrall rolls Foundation); Consumption; each bound demon
 *                       tests its bond
 *   On a Social roll    the Aura of Sin ticks (trait-hooks.js): the Vice suits the deed, or the other finds it foul
 */
import * as T from "./thrall-rules.js";
import { DAY, HOUR } from "../../wodx-chronicle/scripts/terms.mjs";

const MOD = "wodx-actions";
const REF = T.REF;
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const dayNow = () => T.dawnIndex(game.time?.worldTime ?? 0, DAY, HOUR);
const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(l)}</option>`).join("");
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** Is this sheet a thrall? */
export const isThrall = a => !!a?.getFlag?.(MOD, "thrall") && !a.getFlag(MOD, "thrall")?.absolved;


export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, setFlag, findAbility, background, spendWillpower, applyDamage, notify, attr } = ctx;
    // B7933: Untainted and Unbound Diabolist (Devil's Due pp. 98, 100) from the sheet's merits as well as the record
    const merit = (a, key) => { try { return Number(game.modules.get("wodx-chronicle")?.api?.traits?.has?.(a, key)) > 0; } catch (e) { return false; } };
    const flag = a => { const s = T.stateOf(foundry.utils.deepClone(a?.getFlag?.(MOD, "thrall") ?? {})); if (merit(a, "untainted")) s.untainted = true; if (merit(a, "unbound-diabolist")) s.unbound = true; return s; };
    const save = (a, patch) => setFlag(a, "thrall", { ...(a.getFlag(MOD, "thrall") ?? {}), ...patch });
    const virtue = (a, k) => n(a?.system?.advantages?.virtues?.[k]?.permanent);
    const permWill = a => n(a?.system?.advantages?.willpower?.permanent);
    const ab = (a, k) => n(findAbility?.(a, k)?.value);
    const viceLabel = s => T.viceOf(s.vice)?.label ?? "Pride";
    const line = s => `Vice ${viceLabel(s)} · Resolve ${s.resolve.temp}/${s.resolve.perm} · Torment ${s.torment.perm}${s.torment.temp ? ` (+${s.torment.temp})` : ""}`;
    const foot = p => `<div class="wodx-quiet">${REF} p. ${p}</div>`;

    /** The sheet's line for the thrall. */
    function sheetLine(actor) {
        if (!isThrall(actor)) return "";
        const s = flag(actor);
        const cons = T.consumption(s.torment.perm, s.resolve.perm);
        return `${esc(line(s))}${cons ? ` · <b>Consumption ${cons}</b>` : ""}`;
    }

    /* ---------------- The window ---------------- */

    const MENU = [["sin", "A sin: check against the hierarchy"], ["vice", "The Vice calls (Vice Addiction)"], ["atone", "Atone for a virtuous act (1 experience)"],
        ["faith", "Holy ground or a relic"], ["aura", "Someone reads the Aura of Sin"], ["pact", "Seal a Pact (Obligation, Frequency, Consequence)"], ["fail", "A Pact is failed"],
        ["invest", "The master invests an Arcana or lays a Taint"], ["research", "Research a rite (a week)"], ["perform", "Perform a summoning or binding"],
        ["absolve", "Absolution of the Damned (an inquisitor)"], ["setup", "The thrall's traits (Storyteller)"]];

    async function open(actor) {
        if (!actor) return notify("Choose the thrall.");
        if (!isThrall(actor)) {
            if (!game.user.isGM) return notify(`${actor.name} is not a thrall.`);
            return setup(actor);
        }
        const s = flag(actor);
        const pacts = s.pacts.map(p => `<li>${esc(p.oath || "A pact")}: value ${p.value} (O${p.obligation} F${p.frequency} C${p.consequence})</li>`).join("");
        const rites = s.rites.map(r => `<li>${r.kind === "summon" ? "Summon" : "Bind"} ${esc(r.demon)}${r.ready ? "" : ` (research ${r.progress}/${T.researchPlan(r).need})`}</li>`).join("");
        const bound = s.bound.filter(b => !b.free).map(b => `<li>${esc(b.name)}, bound</li>`).join("");
        const content = `<form><p><b>${esc(actor.name)}</b>: ${esc(line(s))}${s.master ? `. Master: ${esc(s.master)}` : ""}.</p>
          <p>Arcana ${T.arcanaTotal(s)} of ${T.arcanaCap(s)}; Taints and Pacts ${[...s.taints, ...s.pacts].reduce((x, y) => x + n(y.value), 0)} of ${T.taintCap(permWill(actor))}.</p>
          ${pacts ? `<p><b>Pacts</b></p><ul>${pacts}</ul>` : ""}${rites ? `<p><b>Rites</b></p><ul>${rites}</ul>` : ""}${bound ? `<ul>${bound}</ul>` : ""}
          <div class="form-group"><label>Do</label><select name="what" data-fixed>${opts(MENU.filter(([k]) => k !== "setup" || game.user.isGM))}</select></div>${foot("85-103")}</form>`;
        return dialog(`The thrall: ${actor.name}`, content, "Open", fd => (STEPS[fd.what] ?? (() => null))(actor));
    }

    async function setup(actor) {
        if (!game.user.isGM) return notify("The Storyteller sets a thrall's traits.");
        const s = isThrall(actor) ? flag(actor) : T.stateOf(T.thrallFlag({}));
        const content = `<form><p>A mortal who took Resolve from a demon (${REF} pp. 85, 94-96). New thralls start at Resolve 1 and Torment 1.</p>
          <div class="form-group"><label>Vice</label><select name="vice" data-fixed>${opts(Object.entries(T.VICES).map(([k, v]) => [k, `${v.label} (opposed by ${v.virtue})`]), s.vice)}</select></div>
          <div class="form-group"><label>Master</label><input type="text" name="master" value="${esc(s.master ?? "")}" placeholder="The demon who holds them"/></div>
          <div class="form-group"><label>Resolve</label><input type="number" name="resolve" min="1" max="10" value="${s.resolve.perm}"/></div>
          <div class="form-group"><label>Torment</label><input type="number" name="torment" min="1" max="10" value="${s.torment.perm}"/><input type="number" name="tormentTemp" min="0" max="9" value="${s.torment.temp}"/></div>
          <div class="form-group"><label><input type="checkbox" name="mage"${s.mage ? " checked" : ""}/> A mage thrall (Resolve by Foundation at dawn, p. 132)</label></div>
          <div class="form-group"><label><input type="checkbox" name="untainted"${s.untainted ? " checked" : ""}/> Untainted (no degeneration checks, p. 100)</label></div></form>`;
        return dialog(`The thrall's traits: ${actor.name}`, content, "Save", async fd => {
            const base = isThrall(actor) ? flag(actor) : T.thrallFlag({});
            const res = Math.max(1, Math.min(10, n(fd.resolve) || 1));
            const out = { ...base, vice: fd.vice, master: String(fd.master ?? ""), resolve: { perm: res, temp: Math.min(res, base.resolve?.temp ?? res) },
                torment: { perm: Math.max(1, Math.min(10, n(fd.torment) || 1)), temp: Math.max(0, Math.min(9, n(fd.tormentTemp))) }, mage: !!fd.mage, untainted: !!fd.untainted, absolved: false };
            await setFlag(actor, "thrall", out);
            return post(actor, `${actor.name} is a thrall`, `<div class="vta-res">${esc(line(T.stateOf(out)))}.</div>${foot(94)}`, [], null);
        });
    }

    /* ---------------- Sin and degeneration (pp. 94-96) ---------------- */

    /** A sin at a line of the hierarchy: the check when it applies, a temporary Torment when it fails. */
    async function sinAt(actor, level, what = "") {
        const s = flag(actor);
        if (s.untainted) return post(actor, `${actor.name}: a sin`, `<div class="vta-res">${esc(what || T.HIERARCHY[level] || "A sin")}. Untainted: no check (p. 100).</div>`);
        if (!T.sinApplies(level, s.torment.perm)) return post(actor, `${actor.name}: a sin`, `<div class="vta-res">${esc(what || T.HIERARCHY[level] || "A sin")} is a level ${level} sin; at Torment ${s.torment.perm} a thrall counts as ${Math.min(10, s.torment.perm + 2)}: no check.</div>${foot(96)}`);
        const d = T.degeneration(s);
        const r = await rollPool(virtue(actor, d.trait), d.difficulty);
        const held = !r.botch && r.successes > 0;
        const torment = held ? s.torment : T.sinFailed(s.torment);
        if (!held) await save(actor, { torment });
        const up = torment.perm > s.torment.perm;
        const after = T.stateOf({ ...s, torment });
        const warn = [];
        if (up && T.consumption(torment.perm, s.resolve.perm)) warn.push(`Torment now passes Resolve: Consumption, ${T.consumption(torment.perm, s.resolve.perm)} lethal at each dawn.`);
        if (up && T.viceAddiction(torment.perm, permWill(actor)).roll) warn.push("Torment now passes Willpower: Vice Addiction.");
        return post(actor, `${actor.name}: a sin`, rollBlock(`Conscience ${virtue(actor, d.trait)}`, r, [`difficulty ${d.difficulty}${d.empty ? " (no Resolve left: +1)" : ""}`])
            + `<div class="vta-res ${held ? "good" : "bad"}">${esc(what || T.HIERARCHY[level])} (level ${level}). ${held ? "The taint is held down." : up ? `Ten points of sin: permanent Torment ${torment.perm}.` : `A point of Torment: ${esc(line(after))}.`}</div>${warn.map(w => `<div class="vta-note">${esc(w)}</div>`).join("")}${foot(96)}`, [r.roll].filter(Boolean));
    }
    async function sin(actor) {
        const s = flag(actor);
        const content = `<form><p>${esc(actor.name)} checks for a sin at their Torment counted two higher (${Math.min(10, s.torment.perm + 2)}) or above; Conscience at 6 (${REF} p. 96).</p>
          <div class="form-group"><label>The sin</label><select name="level" data-fixed>${opts(range(1, 9).reverse().map(l => [l, `${l}: ${T.HIERARCHY[l]}`]), 6)}</select></div>
          <div class="form-group"><label>What happened</label><input type="text" name="what" maxlength="120" value=""/></div></form>`;
        return dialog(`A sin: ${actor.name}`, content, "Check", fd => sinAt(actor, n(fd.level), String(fd.what ?? "")));
    }
    /** B7925: the Road prompts' events, read by the thrall's hierarchy. Returns {html, level} or null; undefined when not a thrall. */
    async function sinPrompt(actor, event, what) {
        if (!isThrall(actor)) return undefined;
        const level = T.sinForEvent(event);
        if (level === null) return null;
        const s = flag(actor);
        const applies = !s.untainted && T.sinApplies(level, s.torment.perm);
        const html = `<p>${esc(what)}. For a thrall this is a level ${level} sin (“${esc(T.HIERARCHY[level])}”)${applies ? "" : `, below the Torment of ${s.torment.perm} counted as ${Math.min(10, s.torment.perm + 2)}: no check`}.</p>${applies ? `<button type="button" class="vta-btn" data-thx="sin" data-actor="${actor.uuid}" data-level="${level}" data-what="${esc(what)}">Degeneration (Conscience at 6)</button>` : ""}`;
        if (isActiveGM()) await ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}: a sin?</h3>${html}</div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
        return { html, level };
    }

    /* ---------------- The Vice and atonement (pp. 85-86, 98, 100) ---------------- */

    async function vice(actor) {
        const s = flag(actor), v = T.viceAddiction(s.torment.perm, permWill(actor));
        if (!v.roll) return post(actor, `${actor.name}: the Vice calls`, `<div class="vta-res">Torment ${s.torment.perm} is not above Willpower ${permWill(actor)}: no Vice Addiction. Giving in is still a level 2 sin.</div>${foot(98)}`);
        const r = await rollPool(virtue(actor, "selfcontrol"), v.difficulty);
        const out = T.addictionOutcome(r);
        const body = rollBlock(`Self-Control ${virtue(actor, "selfcontrol")}`, r, [`difficulty ${v.difficulty}`]) + `<div class="vta-res ${out === "resists" ? "good" : "bad"}">${out === "resists" ? `${esc(actor.name)} holds out against ${esc(viceLabel(s).toLowerCase())}, for now.` : out === "botch" ? "A botch: they give in, and it is a sin." : `They must give in to ${esc(viceLabel(s).toLowerCase())} as the moment allows.`}</div>${foot(98)}`;
        await post(actor, `${actor.name}: the Vice calls`, body, [r.roll].filter(Boolean));
        if (out === "botch") await sinAt(actor, 2, `Gives in to ${viceLabel(s).toLowerCase()}`);
        return out;
    }
    async function atone(actor) {
        if (!game.user.isGM) return notify("The Storyteller judges an act of atonement.");
        const s = flag(actor), vt = T.viceOf(s.vice)?.virtue ?? "humility";
        const content = `<form><p>An act of ${esc(vt)}, the virtue against ${esc(viceLabel(s).toLowerCase())}, that merits atonement: one experience takes a temporary Torment off; with none, a permanent dot becomes nine (${REF} pp. 98, 100).</p>
          <div class="form-group"><label>The act</label><input type="text" name="act" maxlength="120" value=""/></div></form>`;
        return dialog(`Atonement: ${actor.name}`, content, "Atone", async fd => {
            const a = T.atone(s.torment);
            if (!a.xp) return notify(`${actor.name} has no Torment left to atone.`);
            const after = T.stateOf({ ...s, torment: { perm: a.perm, temp: a.temp } });
            if (T.arcanaTotal(after) > T.arcanaCap(after)) return notify(`Atonement would leave ${T.arcanaTotal(after)} Arcana over a cap of ${T.arcanaCap(after)}: give up an Arcana first (p. 98).`);
            await save(actor, { torment: { perm: a.perm, temp: a.temp } });
            await actor.createEmbeddedDocuments("Item", [{ name: `Atonement: ${String(fd.act || vt).slice(0, 60)}`, type: "Experience", system: { amount: 1, isspent: true } }]);
            return post(actor, `${actor.name} atones`, `<div class="vta-res good">${esc(fd.act || `An act of ${vt}`)}. ${esc(line(after))}.</div>${foot(98)}`);
        });
    }

    /* ---------------- Faith and the Aura of Sin (pp. 97-98) ---------------- */

    /** The Faith of a relic the thrall touches (a Holy Artifact item) or of the ground. */
    const relicFaith = actor => Math.max(0, ...(actor.items ?? []).map(i => n(i.flags?.[MOD]?.holyArtifact)));
    async function faith(actor) {
        const s = flag(actor);
        const content = `<form><p>Each turn on holy ground or touching a blessed thing burns: dice equal to its Faith, bashing for a thrall; nothing at Torment 1. Courage at the Torment to stay or keep hold (${REF} p. 98).</p>
          <div class="form-group"><label>Faith of the place or thing</label><input type="number" name="faith" min="0" max="10" value="${relicFaith(actor) || 1}"/></div>
          <div class="form-group"><label>Turns</label><input type="number" name="turns" min="1" max="10" value="1"/></div></form>`;
        return dialog(`Holy ground: ${actor.name}`, content, "Roll", async fd => {
            const b = T.faithBurn(n(fd.faith), s.torment.perm);
            const rolls = [], lines = [];
            let hurt = 0;
            const turns = Math.max(1, Math.min(10, n(fd.turns) || 1));
            for (let i = 0; i < turns; i++) {
                if (b.dice) { const d = await rollPool(b.dice, 6); rolls.push(d.roll); hurt += d.successes; lines.push(`Turn ${i + 1}: ${d.successes} ${b.type}`); }
            }
            if (hurt) await applyDamage(actor, b.type, hurt);
            const c = await rollPool(virtue(actor, b.stay.trait), b.stay.difficulty);
            rolls.push(c.roll);
            const stays = !c.botch && c.successes > 0;
            return post(actor, `${actor.name}: holy ground`, `${lines.length ? `<div class="vta-note">${lines.join("; ")}</div>` : ""}<div class="vta-res ${hurt ? "bad" : ""}">${b.dice ? `${hurt} ${b.type} in all.` : "Torment 1: the Faith hurts, but leaves no wound."}</div>`
                + rollBlock(`Courage ${virtue(actor, b.stay.trait)}`, c, [`difficulty ${b.stay.difficulty}`]) + `<div class="vta-res ${stays ? "good" : "bad"}">${stays ? `They hold on for ${c.successes} turn${c.successes === 1 ? "" : "s"}.` : "They flee the place or drop the thing."}</div>${foot(98)}`, rolls.filter(Boolean));
        });
    }
    async function aura(actor) {
        const s = flag(actor), diff = T.auraReadDiff(s.torment.perm);
        const readers = game.actors.filter(a => a !== actor && (a.isOwner || game.user.isGM));
        const content = `<form><p>Perception + Empathy at ${diff} (12 less the Torment) reads ${esc(actor.name)}'s Vice (${REF} p. 97).</p>
          <div class="form-group"><label>Who looks</label><select name="who" data-fixed>${opts(readers.map(a => [a.id, a.name]))}</select></div></form>`;
        return dialog(`The Aura of Sin: ${actor.name}`, content, "Roll", async fd => {
            const who = game.actors.get(fd.who);
            if (!who) return null;
            const r = await rollPool(attr(who, "perception") + ab(who, "empathy"), diff);
            const ok = !r.botch && r.successes > 0;
            return post(who, `${who.name} reads ${actor.name}`, rollBlock("Perception + Empathy", r, [`difficulty ${diff}`]) + `<div class="vta-res ${ok ? "good" : ""}">${ok ? `${esc(actor.name)} reeks of ${esc(viceLabel(s).toLowerCase())}.` : "Nothing they can name."}</div>${foot(97)}`, [r.roll].filter(Boolean));
        });
    }
    /** The roll-effect source: the Aura of Sin on a thrall's Social roll when ticked. */
    function auraEffects(actor, c = {}) {
        if ((c.channel ?? "roll") !== "roll" || !isThrall(actor)) return [];
        const tags = c.tags ?? [], s = flag(actor), k = T.auraShift(s.torment.perm);
        if (!k) return [];
        if (tags.includes("vice-suits")) return [{ key: "aura-of-sin", name: `Aura of Sin (${viceLabel(s)})`, diff: -k, note: `${viceLabel(s)} suits the deed (${REF} p. 97)` }];
        if (tags.includes("vice-repels")) return [{ key: "aura-of-sin", name: `Aura of Sin (${viceLabel(s)})`, diff: k, note: `${viceLabel(s)} repels them (${REF} p. 97)` }];
        return [];
    }

    /* ---------------- Pacts, Arcana and Taints (pp. 96, 101, 124-125) ---------------- */

    async function pact(actor) {
        if (!game.user.isGM) return notify("The Storyteller seals a pact.");
        const content = `<form><p>“I will (or will not) do this, this often, or suffer that.” Value = Obligation + Consequence - Frequency; it takes that much off the temporary Torment and costs the master a Resolve (${REF} pp. 101, 124-125).</p>
          <div class="form-group"><label>The oath</label><input type="text" name="oath" maxlength="160" value=""/></div>
          <div class="form-group"><label>Obligation</label><select name="obligation" data-fixed>${opts(range(1, 5).map(i => [i, `${i}: ${T.OBLIGATION[i]}`]), 2)}</select></div>
          <div class="form-group"><label><input type="checkbox" name="avoid"/> An abstention (Frequency 3 at most)</label></div>
          <div class="form-group"><label>Frequency</label><select name="frequency" data-fixed>${opts(range(1, 5).map(i => [i, `${i}: ${T.FREQUENCY[i]}`]), 1)}</select></div>
          <div class="form-group"><label>Consequence</label><select name="consequence" data-fixed>${opts(range(1, 5).map(i => [i, `${i}: ${T.CONSEQUENCE[i]}`]), 1)}</select></div>
          <div class="form-group"><label>Ability or Attribute it costs</label><input type="text" name="costs" maxlength="40" placeholder="for Consequence 3 or 4" value=""/></div></form>`;
        return dialog(`A pact: ${actor.name}`, content, "Seal", fd => sealPact(actor, fd));
    }
    async function sealPact(actor, fd) {
        const s = flag(actor), v = T.pactValue({ obligation: n(fd.obligation), frequency: n(fd.frequency), consequence: n(fd.consequence), avoid: !!fd.avoid });
        if (!v.ok) { notify(`The pact is worth ${v.value}: ${v.why}.`); return null; }
        const b = T.addBurden(s, v.value, permWill(actor));
        if (!b.ok) { notify(`${actor.name}: ${b.why}.`); return null; }
        const p = { id: foundry.utils.randomID(), oath: String(fd.oath ?? ""), costs: String(fd.costs ?? ""), ...v, at: game.time.worldTime };
        await save(actor, { pacts: [...s.pacts, p], torment: b.torment });
        return post(actor, `${actor.name} seals a pact`, `<div class="vta-res">${esc(p.oath || "A pact")}: Obligation ${v.obligation} + Consequence ${v.consequence} - Frequency ${v.frequency} = <b>${v.value}</b>${v.notes.length ? ` (${esc(v.notes.join("; "))})` : ""}.</div><div class="vta-note">${esc(line(T.stateOf({ ...s, torment: b.torment })))}.</div>${foot(125)}`);
    }
    async function fail(actor) {
        if (!game.user.isGM) return notify("The Storyteller says when a pact is failed.");
        const s = flag(actor);
        if (!s.pacts.length) return notify(`${actor.name} has no pact.`);
        const content = `<form><p>By choice the full Consequence; forced into it, only a warning: a Willpower point (${REF} p. 125).</p>
          <div class="form-group"><label>The pact</label><select name="id" data-fixed>${opts(s.pacts.map(p => [p.id, `${p.oath || "A pact"} (C${p.consequence})`]))}</select></div>
          <div class="form-group"><label><input type="checkbox" name="forced"/> Forced into it</label></div></form>`;
        return dialog(`A pact failed: ${actor.name}`, content, "Apply", fd => failPact(actor, fd.id, { chosen: !fd.forced }));
    }
    async function failPact(actor, id, { chosen = true } = {}) {
        const s = flag(actor), p = s.pacts.find(x => x.id === id);
        if (!p) return null;
        const c = T.failedConsequence(p, { chosen });
        let text = "", patch = {};
        if (!c) { await spendWillpower(actor, 1); text = "Forced: a Willpower point as a warning. The pact stands."; }
        else if (c === 1) { patch = { pacts: s.pacts.filter(x => x.id !== id), torment: T.shiftTorment(s.torment, p.value) }; text = `The pact ends, and its ${p.value} Torment comes back.`; }
        else if (c === 2) { await applyDamage(actor, "aggravated", 1); text = "An unsoakable aggravated level."; }
        else if (c === 3 || c === 4) {
            const k = String(p.costs ?? "").toLowerCase().trim();
            const isAttr = !!actor.system?.attributes?.[k], isAb = !!actor.system?.abilities?.[k];
            if (c === 4 && !isAttr) { patch = { torment: { perm: Math.min(10, s.torment.perm + 1), temp: s.torment.temp } }; text = "A permanent dot of Torment."; }
            else if (isAttr || isAb) {
                const path = isAttr ? `system.attributes.${k}.value` : `system.abilities.${k}.value`;
                await actor.update({ [path]: Math.max(0, n(foundry.utils.getProperty(actor, path)) - 1) });
                text = `A dot of ${esc(k)} is gone; only experience brings it back.`;
            } else text = "Bad luck beyond any will: the Storyteller makes one roll of their choice a botch.";
        } else { await applyDamage(actor, "aggravated", 10); text = "A horrible death."; }
        if (Object.keys(patch).length) await save(actor, patch);
        return post(actor, `${actor.name} fails a pact`, `<div class="vta-res bad">${esc(p.oath || "The pact")}: ${text}</div>${foot(125)}`);
    }
    async function invest(actor) {
        if (!game.user.isGM) return notify("Only the master grants Arcana and Taints.");
        const content = `<form><p>The master touches the thrall and spends a Resolve. Arcana may total Torment x 10 + temporary Torment + Taints + Pacts; a Taint takes its value off the temporary Torment (${REF} p. 101).</p>
          <div class="form-group"><label>Grant</label><select name="kind" data-fixed><option value="arcana">An Arcana</option><option value="taint">A Taint</option></select></div>
          <div class="form-group"><label>Name</label><input type="text" name="name" maxlength="60" value=""/></div>
          <div class="form-group"><label>Points</label><input type="number" name="value" min="1" max="10" value="2"/></div></form>`;
        return dialog(`The master's gift: ${actor.name}`, content, "Grant", fd => grant(actor, fd));
    }
    async function grant(actor, fd) {
        const s = flag(actor), v = Math.max(1, n(fd.value)), name = String(fd.name || (fd.kind === "taint" ? "A Taint" : "An Arcana"));
        if (s.unbound) { notify(`${actor.name} is an Unbound Diabolist: no master grants Arcana or Taints (${REF} p. 98).`); return null; }
        if (fd.kind === "taint") {
            const b = T.addBurden(s, v, permWill(actor));
            if (!b.ok) { notify(`${actor.name}: ${b.why}.`); return null; }
            await save(actor, { taints: [...s.taints, { name, value: v }], torment: b.torment });
            return post(actor, `${actor.name} is tainted`, `<div class="vta-res">${esc(name)} (${v}). ${esc(line(T.stateOf({ ...s, torment: b.torment })))}.</div>${foot(101)}`);
        }
        const c = T.canInvest(s, v);
        if (!c.ok) { notify(`${actor.name}: ${c.why}.`); return null; }
        await save(actor, { arcana: [...s.arcana, { name, cost: v }] });
        return post(actor, `${actor.name} receives ${name}`, `<div class="vta-res">${esc(name)} (${v}): Arcana ${c.after} of ${c.cap}.</div>${foot(101)}`);
    }

    /* ---------------- Rites, summoning and binding (pp. 93, 102-103) ---------------- */

    const abilityPick = a => (ab(a, "demonology") >= ab(a, "occult") && ab(a, "demonology") > 0 ? "demonology" : "occult");
    async function research(actor) {
        const s = flag(actor);
        const pending = s.rites.filter(r => !r.ready);
        const content = `<form><p>A week of research: Intelligence + Demonology at 8 (Occult 10), less one for each of the demon's Nature, Vice and function known and three for its True Name; successes to its Resolve + Torment. A botch ruins it (${REF} p. 102).</p>
          <div class="form-group"><label>The rite</label><select name="id" data-fixed><option value="">A new one</option>${opts(pending.map(r => [r.id, `${r.kind} ${r.demon} (${r.progress}/${T.researchPlan(r).need})`]))}</select></div>
          <div class="form-group"><label>Demon</label><input type="text" name="demon" maxlength="60" value=""/></div>
          <div class="form-group"><label>Kind</label><select name="kind" data-fixed><option value="bind">Binding</option><option value="summon">Summoning</option></select></div>
          <div class="form-group"><label>Its Resolve, Torment, Willpower</label><input type="number" name="resolve" min="1" max="10" value="3"/><input type="number" name="torment" min="1" max="10" value="6"/><input type="number" name="willpower" min="1" max="10" value="5"/></div>
          <div class="form-group"><label>Known</label><label><input type="checkbox" name="nature"/> Nature</label><label><input type="checkbox" name="vice"/> Vice</label><label><input type="checkbox" name="func"/> Function</label><label><input type="checkbox" name="trueName"/> True Name</label></div>
          <div class="form-group"><label><input type="checkbox" name="master"/> This is the thrall's own master</label></div></form>`;
        return dialog(`Research a rite: ${actor.name}`, content, "Research", fd => researchWeek(actor, fd));
    }
    async function researchWeek(actor, fd) {
        const s = flag(actor);
        const base = fd.id ? s.rites.find(r => r.id === fd.id) : T.rite({ id: foundry.utils.randomID(), demon: fd.demon || "A demon", kind: fd.kind, resolve: n(fd.resolve), torment: n(fd.torment), willpower: n(fd.willpower),
            trueName: !!fd.trueName, known: { nature: !!fd.nature, vice: !!fd.vice, function: !!fd.func }, master: !!fd.master, ready: false });
        if (!base) return null;
        const using = abilityPick(actor), plan = T.researchPlan(base, { ability: using });
        const r = await rollPool(attr(actor, "intelligence") + ab(actor, using), plan.difficulty);
        const next = T.researchWeek(base, r);
        const rites = [...s.rites.filter(x => x.id !== next.id), next];
        await save(actor, { rites });
        // the diabolist never knows a rite is spoiled: only the Storyteller hears
        const note = next.spoiled ? "the rite is complete" : next.note;
        if (next.spoiled) await ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}'s rite</h3><p>Two botches in a row: the rite of ${esc(next.demon)} is spoiled and will botch when spoken (p. 102).</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
        return post(actor, `${actor.name} researches a rite`, rollBlock(`Intelligence + ${using === "occult" ? "Occult" : "Demonology"}`, r, [`difficulty ${plan.difficulty}`]) + `<div class="vta-res">${esc(next.kind === "summon" ? "Summoning" : "Binding")} ${esc(next.demon)}: ${esc(note)}.</div>${foot(102)}`, [r.roll].filter(Boolean));
    }
    async function perform(actor) {
        const s = flag(actor), ready = s.rites.filter(r => r.ready);
        if (!ready.length) return notify(`${actor.name} holds no finished rite.`);
        const content = `<form><p>Wits + Demonology each hour (summoning) or minute (binding) at the demon's Resolve: +2 with Occult, -1 for each ten helping, -3 with the True Name, 5 at least. Successes to its Resolve; a binding fails on two misses in a row or a botch (${REF} pp. 102-103).</p>
          <div class="form-group"><label>The rite</label><select name="id" data-fixed>${opts(ready.map(r => [r.id, `${r.kind === "summon" ? "Summon" : "Bind"} ${r.demon}`]))}</select></div>
          <div class="form-group"><label>Helpers</label><input type="number" name="helpers" min="0" max="200" value="0"/></div></form>`;
        return dialog(`Perform a rite: ${actor.name}`, content, "Begin", fd => performRite(actor, fd.id, { helpers: n(fd.helpers) }));
    }
    async function performRite(actor, id, { helpers = 0 } = {}) {
        const s = flag(actor), r = s.rites.find(x => x.id === id);
        if (!r) return null;
        const using = abilityPick(actor), plan = T.performPlan(r, { ability: using, helpers, thrall: true });
        if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
        const pool = attr(actor, "wits") + ab(actor, using), rolls = [], lines = [];
        let run = { done: false };
        for (let i = 0; i < 30 && !run.done; i++) {
            const x = await rollPool(pool, plan.difficulty);
            rolls.push(x);
            lines.push(x.botch ? "botch" : String(x.successes));
            run = T.performRun(r, rolls, { spoiled: r.spoiled });
        }
        let res = "";
        if (r.kind === "summon") res = run.ok ? `${esc(r.demon)} rises from the Pit into the circle, a spirit without a body. Begin a binding now, or it is free to go.` : run.botch ? `A botch: ${esc(r.demon)} may come anyway (the Storyteller's call), and no binding will hold it.` : "The circle stays empty.";
        else if (run.ok) {
            await save(actor, { bound: [...s.bound.filter(b => b.name !== r.demon), T.boundDemon({ name: r.demon, willpower: r.willpower, resolve: r.resolve, torment: r.torment, sinceDay: dayNow() })] });
            res = `${esc(r.demon)} is bound: it obeys to the letter for a day, then tests the bond each day (Wits + Occult against its Willpower, both at 6).`;
        } else res = `The binding breaks: ${esc(r.demon)} is free to take revenge or the diabolist's body.`;
        return post(actor, `${actor.name}: ${r.kind === "summon" ? "a summoning" : "a binding"}`, `<div class="vta-note">${rolls.length} ${plan.interval}${rolls.length === 1 ? "" : "s"} at difficulty ${plan.difficulty}: ${lines.join(", ")}</div><div class="vta-res ${run.ok ? "good" : "bad"}">${res}</div>${foot(103)}`, rolls.map(x => x.roll).filter(Boolean));
    }

    /* ---------------- Absolution of the Damned (p. 133) ---------------- */

    async function absolve(actor) {
        const s = flag(actor), diff = T.absolutionDiff(s.torment.perm), dice = T.absolutionDice(s);
        const priests = game.actors.filter(a => a !== actor && a.getFlag?.(MOD, "inquisitor"));
        if (!priests.length) return notify("Absolution needs an inquisitor (a hunter of the Dark Ages) with Holy Art 3.");
        const content = `<form><p>A level 3 ritus. ${esc(actor.name)} confesses and begs mercy; the inquisitor lays on hands: Intelligence + Holy Art at ${diff} (Torment + 3). If it works, the Resolve, Torment, Arcana and Curses go, and with them ${dice} ${dice === 1 ? "die" : "dice"} of lethal for the Arcana held (${REF} p. 133).</p>
          <div class="form-group"><label>The inquisitor</label><select name="who" data-fixed>${opts(priests.map(a => [a.id, a.name]))}</select></div>
          <div class="form-group"><label>Holy Art</label><input type="number" name="art" min="0" max="5" value="3"/></div>
          <div class="form-group"><label><input type="checkbox" name="confessed" checked/> The thrall confesses freely</label></div></form>`;
        return dialog(`Absolution: ${actor.name}`, content, "Pray", fd => absolution(actor, game.actors.get(fd.who), { art: n(fd.art), confessed: !!fd.confessed }));
    }
    async function absolution(actor, priest, { art = 3, confessed = true } = {}) {
        if (!priest) return null;
        if (art < T.ABSOLUTION_LEVEL) { notify(`Absolution is a level ${T.ABSOLUTION_LEVEL} ritus.`); return null; }
        if (!confessed) return post(priest, `${priest.name}: Absolution`, `<div class="vta-res bad">Without an earnest confession the ritus has nothing to work on.</div>${foot(133)}`);
        const s = flag(actor), diff = T.absolutionDiff(s.torment.perm);
        const r = await rollPool(attr(priest, "intelligence") + art, diff);
        const ok = !r.botch && r.successes > 0;
        let body = rollBlock(`Intelligence + Holy Art ${art}`, r, [`difficulty ${diff}`]);
        const rolls = [r.roll];
        if (ok) {
            const dice = T.absolutionDice(s);
            let hurt = 0;
            if (dice) { const d = await rollPool(dice, 6); rolls.push(d.roll); hurt = d.successes; if (hurt) await applyDamage(actor, "lethal", hurt); }
            await setFlag(actor, "thrall", { absolved: true, at: game.time.worldTime, by: priest.name, was: { vice: s.vice, torment: s.torment.perm, arcana: T.arcanaTotal(s) } });
            body += `<div class="vta-res good">${esc(actor.name)} is a mortal again: no Resolve, no Torment, no Arcana.${dice ? ` The price: ${hurt} lethal from ${dice} ${dice === 1 ? "die" : "dice"}.` : ""}</div>`;
        } else body += `<div class="vta-res bad">${r.botch ? "A botch: the prayer falls back on the inquisitor." : "Heaven does not answer this time."}</div>`;
        return post(priest, `${priest.name} absolves ${actor.name}`, body + foot(133), rolls.filter(Boolean));
    }

    /* ---------------- Dawn: Resolve, Consumption and the bonds (pp. 94, 97, 103, 132) ---------------- */

    async function dawn() {
        if (!isActiveGM()) return;
        const day = dayNow();
        for (const actor of game.actors) {
            if (!isThrall(actor)) continue;
            const s = flag(actor);
            if (s.lastDawn === undefined) { await save(actor, { lastDawn: day }); continue; }
            if (n(s.lastDawn) >= day) continue;
            const lines = [], rolls = [], patch = { lastDawn: day };
            let mageSuccesses = null;
            if (s.mage) { const f = await rollPool(n(actor.getFlag(MOD, "daMage")?.foundation ?? background(actor, "Foundation")), T.MAGE_DAWN_DIFF); rolls.push(f.roll); mageSuccesses = f.successes; }
            const res = T.dawnResolve(s, { mageSuccesses });
            if (res !== s.resolve.temp) { patch.resolve = { ...s.resolve, temp: res }; lines.push(`Resolve ${res} of ${s.resolve.perm}${s.mage ? ` (Foundation: ${mageSuccesses})` : ""}.`); }
            const cons = T.consumption(s.torment.perm, s.resolve.perm);
            if (cons) { await applyDamage(actor, "lethal", cons); lines.push(`Consumption: ${cons} lethal that will not heal while the Torment passes the Resolve (${esc(viceLabel(s).toLowerCase())} eats at them).`); patch.consumed = day; }
            const bound = [];
            for (const b of s.bound) {
                if (!T.bondDue(b, day)) { bound.push(b); continue; }
                const mine = await rollPool(attr(actor, "wits") + ab(actor, "occult"), T.BOND_DIFF), theirs = await rollPool(b.willpower, T.BOND_DIFF);
                rolls.push(mine.roll, theirs.roll);
                const holds = T.bondHolds(mine, theirs);
                bound.push({ ...b, lastDay: day, free: !holds });
                lines.push(holds ? `${esc(b.name)} strains at the bond and it holds (${mine.successes} to ${theirs.successes}).` : `${esc(b.name)} breaks the bond (${mine.successes} to ${theirs.successes}) and does as it likes, still in its vessel.`);
            }
            if (s.bound.length) patch.bound = bound;
            await save(actor, patch);
            if (lines.length) await ChatMessage.create({ content: `<div class="vta-card"><h3>Dawn: ${esc(actor.name)}</h3>${lines.map(l => `<p>${l}</p>`).join("")}${foot("94, 97, 103")}</div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, rolls: rolls.filter(Boolean) });
        }
    }

    /** The chat buttons on a sin prompt. */
    async function onButton(btn) {
        const actor = await fromUuid(btn.dataset.actor);
        if (!actor || !game.user.isGM) return null;
        if (btn.dataset.thx === "sin") return sinAt(actor, n(btn.dataset.level), btn.dataset.what ?? "");
        return null;
    }

    const STEPS = { sin, vice, atone, faith, aura, pact, fail, invest, research, perform, absolve, setup };
    return { open, setup, sheetLine, sinAt, sinPrompt, sealPact, failPact, grant, researchWeek, performRite, absolution, dawn, auraEffects, onButton, flag, ...STEPS, rules: T };
}
