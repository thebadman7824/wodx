/**
 * WoDX Actions 3.4 — the wraith line (Wraith: The Oblivion 20th Anniversary; B43, B44).
 *
 *   Arcanoi        Use an Arcanos: arts from the sheet's Arcanoi (data/arcanoi-w20.json), pool, Pathos/Corpus/Willpower
 *                  paid, difficulty from the target, the local Shroud (WoDX Otherworlds) or the realm, Angst to the Shadow
 *   Passions       roll a Passion for Pathos (once a scene each), secondhand at 8; neglect and Resolution
 *   Fetters        Willpower after a scene with a Fetter or Slumbering in it; neglect; a Fetter lost
 *   Corpus         heal with Pathos, rest, aggravated with 3 Pathos and 8 hours
 *   The Shadow     a Shadowguide (another player or the Storyteller) with a private whisper channel; Angst, Catharsis,
 *                  Shadow Dice, Dark Passions, Thorns
 *   Harrowings     the escape roll, Eidolon, Willpower, what is lost; prompts when Corpus, Willpower, a Passion or a
 *                  Fetter runs out
 *   The Caul       removing one's own Caul, or a Reaper's help
 *
 * Built by main.js with its helpers (ctx). Pure rules: wraith-rules.js.
 */

import * as W from "./wraith-rules.js";
import * as P from "./profiles.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

export const DATA = { arcanoi: null, wraith: null, w20: null, gw: null };
export async function loadData() {
    const get = async f => { try { const r = await fetch(`modules/${MOD}/data/${f}`); return r.ok ? r.json() : null; } catch (e) { return null; } };
    [DATA.w20, DATA.wraith, DATA.gw] = await Promise.all([get("arcanoi-w20.json"), get("wraith-w20.json"), get("arcanoi-gw.json")]);
    DATA.arcanoi = DATA.w20;
    return DATA;
}

/** The era's Arcanoi (B43): Wraith: The Great War's in the Great War profile, Wraith 20th's elsewhere. */
export function eraId() { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } }
export function library() { return (W.libraryFor(eraId()) === "gw" ? DATA.gw : DATA.w20) ?? DATA.w20; }
const bookOf = lib => (lib === DATA.gw ? "Wraith: The Great War" : "Wraith 20th");

/** Is this a wraith (or a Spectre's Psyche)? */
export const isWraith = a => P.detectProfile(a) === "wraith";

/** A wraith's sheet, read: Corpus, Pathos, Angst, Willpower, Passions, Fetters, Dark Passions, Arcanoi, Backgrounds. */
export function info(actor) {
    const s = actor?.system ?? {}, adv = s.advantages ?? {};
    const items = [...(actor?.items ?? [])];
    const traits = t => items.filter(i => i.type === "Trait" && i.system?.type === t).map(i => ({ id: i.id, name: i.name, value: n(i.system?.value ?? i.system?.level) }));
    const bg = name => n(items.find(i => i.type === "Feature" && /background/.test(i.system?.type ?? "") && i.name.toLowerCase().startsWith(name))?.system?.value);
    const pool = id => { const r = P.resource(actor, id); return { temp: r.value, max: r.max, perm: r.perm, ok: r.ok }; };
    const corpusItem = items.find(i => i.type === "Advantage" && i.system?.id === "corpus");
    const legacy = actor?.type === "Wraith" ? adv.corpus : null;
    const corpusMax = n(corpusItem?.system?.permanent ?? legacy?.permanent) || n(corpusItem?.system?.max ?? legacy?.max) || 10;
    const angstItem = items.find(i => i.type === "Advantage" && i.system?.id === "angst");
    const angstPerm = n(angstItem?.system?.permanent ?? adv.angst?.permanent) || n(actor?.getFlag?.(MOD, "angstPermanent"));
    const pathos = pool("pathos"), angst = pool("angst"), wp = pool("willpower");
    const d = s.health?.damage?.corpus ?? {};
    return {
        corpus: { max: corpusMax },
        pathos: { temp: pathos.temp, max: pathos.max || 10 },
        angst: { temp: angst.temp, perm: angstPerm },
        willpower: { temp: wp.temp, perm: wp.perm || n(adv.willpower?.permanent) },
        passions: traits("wod.types.passion"), fetters: traits("wod.types.fetter"), darkPassions: traits("wod.types.darkpassion"),
        arcanoi: items.filter(i => i.type === "Power" && i.system?.type === "wod.types.arcanoi").map(i => ({ id: i.id, name: i.name, value: n(i.system?.value) })),
        memoriam: bg("memoriam"), eidolon: bg("eidolon"),
        damage: { bashing: n(d.bashing), lethal: n(d.lethal), aggravated: n(d.aggravated) },
        hasCorpusTrack: !!(corpusItem || legacy),
        guide: actor?.getFlag?.(MOD, "shadowguide") ?? null
    };
}

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, attr, findAbility, abilityList, setting, spendWillpower } = ctx;

    const res = (a, id) => P.resource(a, id);
    async function pay(actor, id, k) {
        if (!k) return "";
        const r = res(actor, id);
        if (!r.ok) return `${cap(id)} isn't on the sheet`;
        if (r.value < k) { ctx.notify(`${actor.name} has only ${r.value} ${r.label}.`); return false; }
        return P.adjust(actor, id, -k);
    }
    const gain = (actor, id, k) => (k ? P.adjust(actor, id, k) : null);

    /** The local Shroud at the wraith's token (WoDX Otherworlds ratings), with this scene's Hysteria. */
    function shroudAt(actor) {
        const tok = actor?.getActiveTokens?.()[0]?.document ?? canvas?.tokens?.controlled?.[0]?.document;
        let base = null;
        try { base = tok ? game.modules.get("wodx-otherworlds")?.api?.placeOf?.(tok)?.ratings?.shroud : null; } catch (e) { base = null; }
        const hysteria = n(canvas?.scene?.getFlag?.(MOD, "hysteria"));
        return { base: Number.isFinite(base) ? base : null, rating: W.shroudRating({ base: Number.isFinite(base) ? base : 7, hysteria }), hysteria };
    }

    /* ---------------- Arcanoi ---------------- */

    /** The local Maelstrom (a scene flag, 0–5; the Storyteller sets it with the Maelstrom tool). */
    const storm = () => Math.max(0, Math.min(5, n(canvas?.scene?.getFlag?.(MOD, "maelstrom"))));
    /** The second half of an art's roll: the Arcanos, or an Ability the page names (Cravings: Empathy). */
    const second = (a, sec) => (!sec || sec === "arc" ? a.rating : (findAbility(actor0, sec)?.value ?? 0));
    let actor0 = null;

    function targetTraits(t) {
        if (!t) return null;
        const s = t.system ?? {}, adv = s.advantages ?? {};
        const out = { willpower: n(adv.willpower?.permanent), angst: n(adv.angst?.permanent) || n(t.getFlag?.(MOD, "angstPermanent")), pathos: n(adv.pathos?.temporary), corpus: n(adv.corpus?.temporary) };
        for (const a of ATTR) out[a] = attr(t, a);
        for (const a of abilityList(t)) out[a.key.replace(/\s+/g, "")] = a.value;
        return out;
    }

    async function useArcanos(actor) {
        actor0 = actor;
        const lib = library();
        if (!lib) return ctx.notify("The Arcanoi library didn't load.");
        const i = info(actor);
        const list = W.artsFor(lib.arts, i.arcanoi);
        if (!list.length) return ctx.notify(`${actor.name} has no Arcanoi on the sheet the library knows (${i.arcanoi.map(a => a.name).join(", ") || "none"}).`);
        const tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
        const sh = shroudAt(actor);
        const content = `<form class="wodx-arcanos"><p><b>${esc(actor.name)}</b> — Pathos ${i.pathos.temp}, Corpus ${i.corpus.max - (i.damage.bashing + i.damage.lethal + i.damage.aggravated)}/${i.corpus.max}, Willpower ${i.willpower.temp}; local Shroud ${sh.rating}${sh.base === null ? " (not rated here: 7)" : ""}${storm() ? `; Maelstrom force ${storm()}` : ""}${tgt ? `; target <b>${esc(tgt.name)}</b>` : ""}. Arts from ${bookOf(lib)}.</p>
          <div class="form-group"><label>Art</label>${searchBox("select[name=art]", "Search arts…", "Search arts")}<select name="art">${list.map((a, k) => `<option value="${a.id}" ${k === 0 ? "selected" : ""}>${esc(`${a.d} ${a.l ? "•".repeat(a.l) : "basic"}: ${a.n}${a.k === "basic" || a.k === "art" ? "" : ` (${a.k})`}`)}</option>`).join("")}</select></div>
          <div class="wodx-art-info vta-note"></div>
          <div class="form-group"><label>Where</label><select name="realm" data-fixed>${Object.entries(W.REALMS).map(([k, l]) => `<option value="${k}" ${k === "shadowlands" ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label><input type="checkbox" name="onSelf"/> On themselves</label></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/></div>
          <div class="form-group"><label>Pathos / Corpus / Willpower to spend</label><input type="number" name="pathos" value="0" min="0" style="width:4em"/> <input type="number" name="corpus" value="0" min="0" style="width:4em"/> <input type="number" name="wp" value="0" min="0" style="width:4em"/></div>
          <div class="form-group"><label>Bonus dice (Shadow Dice are offered separately)</label><input type="number" name="bonus" value="0"/></div></form>`;
        const describe = root => {
            const a = list.find(x => x.id === root.querySelector("[name=art]").value);
            if (!a) return;
            const c = W.artCost(a.c);
            const d = W.arcanosDifficulty(a.diff, { t: targetTraits(tgt), own: { angst: i.angst.temp, stamina: attr(actor, "stamina") }, shroud: sh.rating, storm: storm(), realm: root.querySelector("[name=realm]").value, onSelf: root.querySelector("[name=onSelf]").checked });
            if (d !== null) root.querySelector("[name=diff]").value = d;
            root.querySelector("[name=pathos]").value = c.pathos;
            root.querySelector("[name=corpus]").value = c.corpus;
            root.querySelector("[name=wp]").value = c.willpower;
            const [at, sec] = String(a.r || "").split("+");
            const costTxt = [c.pathos && `${c.pathos} Pathos`, c.corpus && `${c.corpus} Corpus`, c.willpower && `${c.willpower} Willpower`, c.variable && "more as needed"].filter(Boolean).join(", ") || "none";
            root.querySelector(".wodx-art-info").innerHTML = `<b>${esc(a.n)}</b> (${esc(a.d)} ${a.l}, ${esc(a.k)}) · cost ${esc(costTxt)} · ${a.r ? `roll ${cap(at)} + ${sec && sec !== "arc" ? cap(sec) : esc(a.d)} (${attr(actor, at) + second(a, sec)} dice)` : "no roll"}${a.angst ? " · <b>can feed the Shadow Angst</b>" : ""} · ${bookOf(lib)} p. ${a.p}<br>${esc(a.e)}<br><span class="wodx-quiet">${esc(lib.general?.defaults?.[a.d] ?? "")}</span>`
                + (d === null && a.diff && a.diff !== "var" ? "<br><i>The difficulty comes from the target: target a token or set it.</i>" : "");
        };
        return dialog(`Use an Arcanos — ${actor.name}`, content, "Use", async fd => {
            const a = list.find(x => x.id === fd.art);
            if (!a) return null;
            const notes = [];
            for (const [id, k] of [["pathos", n(fd.pathos)], ["corpus", n(fd.corpus)]]) {
                if (!k) continue;
                if (id === "corpus") { await corpusDamage(actor, "lethal", k); notes.push(`${k} Corpus (lethal)`); continue; }
                const r = await pay(actor, id, k); if (r === false) return null; if (r) notes.push(r);
            }
            if (n(fd.wp) && !(await spendWillpower(actor, n(fd.wp)))) return null;
            if (n(fd.wp)) notes.push(`${fd.wp} Willpower`);
            let body = notes.length ? `<div class="vta-parts">${notes.map(esc).join(" · ")}</div>` : "";
            const rolls = [];
            let faces = [], successes = 1;
            if (a.r) {
                const [at, sec] = a.r.split("+");
                const dice = Math.max(0, attr(actor, at) + second(a, sec) + n(fd.bonus));
                const r = await rollPool(dice, fd.diff);
                rolls.push(r.roll); faces = r.faces ?? [];
                successes = r.botch ? 0 : r.successes;
                body += rollBlock(`${cap(at)} + ${sec && sec !== "arc" ? cap(sec) : a.d}`, r, n(fd.bonus) ? [`bonus ${fd.bonus}`] : []);
                if (r.botch) body += `<div class="vta-warn">Botch: the art turns on the user (see the page); a gift to the Shadow.</div>`;
            }
            const angst = W.realmAngst(a.d, fd.realm, faces);
            if (angst) { await gain(actor, "angst", angst); body += `<div class="vta-warn">The Shadow takes ${angst} temporary Angst (${a.d === "Outrage" ? "Outrage in the Labyrinth, p. 199" : "each 1 rolled outside the Shadowlands, p. 204"}).</div>`; }
            body += `<div class="vta-note">${esc(a.e)} <span class="wodx-quiet">(${bookOf(lib)} p. ${a.p})</span></div>`;
            if (a.angst) body += `<div class="vta-note">This art can feed the Shadow: the Shadowguide decides how much (see the page).</div>${wbtn("angst", actor, "Shadow takes 1 Angst", "1")}`;
            if (n(fd.wp)) await afterSpend(actor);
            return post(actor, `${actor.name}: ${esc(a.n)}`, body, rolls);
        }, { width: 560, render: root => { describe(root); for (const k of ["art", "realm", "onSelf"]) root.querySelector(`[name=${k}]`)?.addEventListener("change", () => describe(root)); } });
    }

    /* ---------------- Passions, Fetters, Memoriam ---------------- */

    /** A scene: the canvas scene plus the Storyteller's "New scene" counter (Passions once a scene, Hysteria). */
    const sceneKey = () => `${canvas?.scene?.id ?? "none"}:${n(game.settings.get(MOD, "wraithScene"))}`;
    const sessionKey = () => game.settings.get(MOD, "sessionId") || "";

    async function passion(actor) {
        const i = info(actor);
        if (!i.passions.length) return ctx.notify(`${actor.name} has no Passions on the sheet.`);
        const used = actor.getFlag(MOD, "passionScene") ?? {};
        const content = `<form><p><b>${esc(actor.name)}</b> — Pathos ${i.pathos.temp}/${i.pathos.max}.</p>
          <div class="form-group"><label>Passion</label>${i.passions.length > 5 ? searchBox("select[name=p]", "Search Passions…", "Search Passions") : ""}<select name="p" data-fixed>${i.passions.map(p => `<option value="${p.id}">${esc(p.name)} (${p.value})${used[p.id] === sceneKey() ? " — already tapped this scene" : ""}</option>`).join("")}</select></div>
          <div class="form-group"><label>How</label><select name="how" data-fixed><option value="live">Living the Passion now (difficulty 6)</option><option value="second">A mortal nearby feels it, in the same context (8)</option><option value="neglect">Neglect check (Storyteller, 9)</option><option value="weaken">Weaken it toward Resolution (9)</option><option value="resolve">Resolution (Willpower)</option></select></div>
          <div class="form-group"><label>Original rating (for Resolution)</label><input type="number" name="orig" value="0" min="0"/></div></form>`;
        return dialog(`Passion — ${actor.name}`, content, "Roll", async fd => {
            const p = i.passions.find(x => x.id === fd.p); const item = actor.items.get(fd.p);
            if (!p || !item) return null;
            if ((fd.how === "live" || fd.how === "second") && used[p.id] === sceneKey()) return ctx.notify(`${p.name} was already tapped this scene (p. 305).`);
            let r, body = "", rolls = [];
            if (fd.how === "resolve") {
                const orig = n(fd.orig) || p.value;
                const R = W.resolution(orig, 0);
                r = await rollPool(i.willpower.perm, R.difficulty); rolls.push(r.roll);
                const ok = W.resolution(orig, r.successes).resolved;
                body = rollBlock(`Willpower: Resolution of “${esc(p.name)}”`, r, [`needs ${R.need}`]);
                if (ok) { await item.update({ "system.value": 0 }); body += `<div class="vta-big good">Resolved: the Passion is let go (remove it from the sheet when you're ready).</div>`; await ctx.logEvent?.(actor, `Resolves the Passion “${p.name}”.`, "passion"); }
                else { await item.update({ "system.value": p.value + 1 }); body += `<div class="vta-big bad">Holding on tighter: the Passion rises to ${p.value + 1}.</div>`; }
                return post(actor, `${actor.name}: Resolution`, body + `<div class="wodx-quiet">Wraith 20th p. 307</div>`, rolls);
            }
            const diff = fd.how === "live" ? 6 : fd.how === "second" ? 8 : 9;
            r = await rollPool(p.value, diff); rolls.push(r.roll);
            body = rollBlock(`${esc(p.name)} (${p.value})`, r);
            if (fd.how === "live" || fd.how === "second") {
                const to = W.gainUpTo(i.pathos.temp, r.botch ? 0 : r.successes, i.pathos.max);
                if (to > i.pathos.temp) await P.adjust(actor, "pathos", to - i.pathos.temp);
                await actor.setFlag(MOD, "passionScene", { ...used, [p.id]: sceneKey() });
                body += `<div class="vta-res ${to > i.pathos.temp ? "good" : ""}">Pathos ${i.pathos.temp} → ${to}</div>`;
            } else if (fd.how === "neglect") {
                const out = W.neglectResult(p.value, r);
                if (out.drop) await item.update({ "system.value": out.after });
                body += `<div class="vta-res ${out.drop ? "bad" : "good"}">${out.drop ? `The Passion fades to ${out.after}.` : "The Passion holds."}</div>`;
                if (out.harrowing) body += `<div class="vta-warn">A Passion lost: a fall into a Harrowing (p. 306).</div>${wbtn("harrowing", actor, "Harrowing", "passion")}`;
            } else {
                const to = Math.max(1, p.value - (r.botch ? 0 : r.successes));
                if (to < p.value) await item.update({ "system.value": to });
                body += `<div class="vta-res">The Passion eases to ${to} (it can't reach 0 this way).</div>`;
            }
            return post(actor, `${actor.name}: Passion`, body + `<div class="wodx-quiet">Wraith 20th pp. 305–307</div>`, rolls);
        });
    }

    async function fetter(actor) {
        const i = info(actor);
        const content = `<form><p><b>${esc(actor.name)}</b> — Willpower ${i.willpower.temp}/${i.willpower.perm}. ${i.fetters.length ? "" : "<b>No Fetters: 1 Willpower a scene in the Shadowlands (p. 308).</b>"}</p>
          ${i.fetters.length ? `<div class="form-group"><label>Fetter</label>${i.fetters.length > 5 ? searchBox("select[name=f]", "Search Fetters…", "Search Fetters") : ""}<select name="f" data-fixed>${i.fetters.map(f => `<option value="${f.id}">${esc(f.name)} (${f.value})</option>`).join("")}</select></div>` : ""}
          <div class="form-group"><label>What</label><select name="how" data-fixed><option value="scene">After a scene with it (6): Willpower</option><option value="slumber">Slumbered in it 8 hours (4): Willpower</option><option value="neglect">Neglect check (Storyteller, 9)</option><option value="lost">It is destroyed (a Harrowing)</option><option value="nofetter">A scene in the Shadowlands with no Fetters (1 Willpower)</option></select></div></form>`;
        return dialog(`Fetter — ${actor.name}`, content, "Go", async fd => {
            if (fd.how === "nofetter") { if (!(await spendWillpower(actor, 1))) return null; await afterSpend(actor); return post(actor, `${actor.name}`, `<div class="vta-note">1 Willpower to stay in the Shadowlands this scene without Fetters (p. 308).</div>`); }
            const f = i.fetters.find(x => x.id === fd.f); const item = f ? actor.items.get(f.id) : null;
            if (!f || !item) return ctx.notify("Pick a Fetter.");
            if (fd.how === "lost") {
                await item.update({ "system.value": 0 });
                await ctx.logEvent?.(actor, `The Fetter “${f.name}” is destroyed.`, "fetter");
                return post(actor, `${actor.name}: a Fetter lost`, `<div class="vta-warn">“${esc(f.name)}” is gone: a Harrowing at once (p. 308).</div>${wbtn("harrowing", actor, "Harrowing", "fetter")}`);
            }
            const diff = fd.how === "slumber" ? 4 : fd.how === "scene" ? 6 : 9;
            const r = await rollPool(f.value, diff);
            let body = rollBlock(`${esc(f.name)} (${f.value})`, r);
            if (fd.how === "neglect") {
                const out = W.neglectResult(f.value, r);
                if (out.drop) await item.update({ "system.value": out.after });
                body += `<div class="vta-res">${out.drop ? `The tie weakens to ${out.after}.` : "The tie holds."}</div>`;
                if (out.harrowing) body += `${wbtn("harrowing", actor, "Harrowing", "fetter")}`;
            } else {
                const to = Math.min(i.willpower.perm, i.willpower.temp + (r.botch ? 0 : r.successes));
                if (to > i.willpower.temp) await ctx.updateActor(actor, { "system.advantages.willpower.temporary": to });
                body += `<div class="vta-res">Willpower ${i.willpower.temp} → ${to}</div>`;
            }
            return post(actor, `${actor.name}: Fetter`, body + `<div class="wodx-quiet">Wraith 20th pp. 308–309</div>`, [r.roll]);
        });
    }

    async function memoriam(actor) {
        const i = info(actor);
        const key = actor.getFlag(MOD, "memoriamSession");
        const session = sessionKey();
        if (session && key === session) return ctx.notify("Memoriam is once a session (p. 115).");
        const r = await rollPool(i.memoriam, 8);
        const to = W.gainUpTo(i.pathos.temp, r.botch ? 0 : r.successes, i.pathos.max);
        if (to > i.pathos.temp) await P.adjust(actor, "pathos", to - i.pathos.temp);
        await actor.setFlag(MOD, "memoriamSession", session || String(game.time.worldTime));
        return post(actor, `${actor.name}: Memoriam`, rollBlock(`Memoriam (${i.memoriam})`, r) + `<div class="vta-res">Pathos ${i.pathos.temp} → ${to}</div><div class="wodx-quiet">Wraith 20th p. 115</div>`, [r.roll]);
    }

    /* ---------------- Corpus ---------------- */

    async function setCorpusDamage(actor, d) {
        if (info(actor).hasCorpusTrack) return ctx.updateActor(actor, { "system.health.damage.corpus.bashing": d.bashing, "system.health.damage.corpus.lethal": d.lethal, "system.health.damage.corpus.aggravated": d.aggravated });
        return ctx.setDamage(actor, d);
    }
    /** Damage to the Corpus track (the sheet's wraith track, else Health). */
    async function corpusDamage(actor, type, k) {
        const i = info(actor);
        if (!i.hasCorpusTrack) return ctx.applyDamage(actor, type, k);
        const before = { ...i.damage };
        const after = { ...before, [type]: before[type] + k };
        const over = after.bashing + after.lethal + after.aggravated - i.corpus.max;
        if (over > 0) after.bashing = Math.max(0, after.bashing - over);
        await setCorpusDamage(actor, after); // main.js's updateActor hook prompts a Harrowing when it is due
        return { before, after };
    }
    async function healCorpus(actor) {
        const i = info(actor);
        const d = i.hasCorpusTrack ? i.damage : (actor.system?.health?.damage ?? {});
        const content = `<form><p><b>${esc(actor.name)}</b> — Corpus damage ${n(d.bashing)}B / ${n(d.lethal)}L / ${n(d.aggravated)}A; Pathos ${i.pathos.temp}.</p>
          <div class="form-group"><label>How</label><select name="how" data-fixed><option value="pathos">Spend Pathos now (2 bashing or 1 lethal each)</option><option value="agg">Slumber or meditate 8 hours, 3 Pathos: one aggravated level</option><option value="rest">Rest (a bashing level an hour)</option></select></div>
          <div class="form-group"><label>Pathos to spend at most / hours</label><input type="number" name="max" value="${i.pathos.temp}" min="0" style="width:4em"/> <input type="number" name="hours" value="1" min="1" style="width:4em"/></div>
          <div class="form-group"><label><input type="checkbox" name="advance"/> Advance the clock by the time (GM)</label></div></form>`;
        return dialog(`Heal Corpus — ${actor.name}`, content, "Heal", async fd => {
            let after, html, spent = 0, hours = 0;
            if (fd.how === "rest") { hours = Math.max(1, n(fd.hours)); after = W.corpusRest(d, hours); html = `Rests ${hours} hour${hours === 1 ? "" : "s"}: ${n(d.bashing) - after.bashing} bashing heal.`; }
            else {
                const plan = W.pathosHealing(d, Math.min(i.pathos.temp, n(fd.max)), { aggravated: fd.how === "agg" });
                if (!plan.spent) return ctx.notify("Nothing to heal with that Pathos.");
                after = plan.after; spent = plan.spent; hours = plan.hours ?? 0;
                html = `${spent} Pathos: heals ${plan.healed.lethal} lethal, ${plan.healed.bashing} bashing${plan.healed.aggravated ? `, 1 aggravated (8 hours of Slumber)` : ""}${plan.turns > 1 ? `; a Pathos a turn: ${plan.turns} turns` : ""}.`;
                await P.adjust(actor, "pathos", -spent);
            }
            await setCorpusDamage(actor, { bashing: n(after.bashing), lethal: n(after.lethal), aggravated: n(after.aggravated) });
            if (fd.advance && hours && game.user.isGM) await game.time.advance(hours * 3600);
            return post(actor, `${actor.name} mends their Corpus`, `<div class="vta-sec">${esc(html)}</div><div class="wodx-quiet">Wraith 20th p. 295</div>`);
        });
    }

    /* ---------------- The Shadow ---------------- */

    const wbtn = (k, actor, label, arg = "") => `<button type="button" class="vta-btn" data-wx="${k}" data-actor="${esc(actor?.uuid ?? "")}" data-arg="${esc(arg)}">${esc(label)}</button>`;
    /** Who plays this wraith's Shadow: a user id (another player or a GM), else the Storyteller. */
    function guideOf(actor) {
        const id = actor.getFlag(MOD, "shadowguide");
        return game.users.get(id) ?? game.users.activeGM ?? game.users.find(u => u.isGM) ?? null;
    }
    const isGuide = actor => game.user.isGM || guideOf(actor)?.id === game.user.id;
    /** A whisper to the Shadowguide and the Storyteller only. */
    function toGuide(actor, title, html) {
        const ids = [...new Set([...gmIds(), guideOf(actor)?.id].filter(Boolean))];
        return ChatMessage.create({ content: `<div class="vta-card wodx-shadow"><h3>${esc(title)}</h3>${html}</div>`, whisper: ids, speaker: { alias: `Shadow of ${actor.name}` }, flags: { [MOD]: { prompt: true } } });
    }

    async function shadowguide(actor) {
        if (!game.user.isGM) return ctx.notify("The Storyteller assigns the Shadowguide.");
        const cur = actor.getFlag(MOD, "shadowguide") ?? "";
        const users = game.users.filter(u => !actor.testUserPermission?.(u, "OWNER") || u.isGM);
        const content = `<form><p>Who plays <b>${esc(actor.name)}</b>'s Shadow? The book has another player do it (a Shadowguide), or the Storyteller (Wraith 20th pp. 224–226).</p>
          <div class="form-group"><label>Shadowguide</label><select name="u" data-fixed><option value="">The Storyteller</option>${users.filter(u => !u.isGM).map(u => `<option value="${u.id}" ${u.id === cur ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Permanent Angst (if the sheet has no field)</label><input type="number" name="perm" value="${info(actor).angst.perm}" min="0" max="10"/></div></form>`;
        return dialog(`Shadowguide — ${actor.name}`, content, "Save", async fd => {
            await ctx.setFlag(actor, "shadowguide", fd.u || null);
            if (!n(actor.system?.advantages?.angst?.permanent)) await ctx.setFlag(actor, "angstPermanent", n(fd.perm));
            const g = guideOf(actor);
            return toGuide(actor, `The Shadow of ${actor.name}`, `<p>${esc(g?.isGM ? "The Storyteller" : g?.name ?? "The Storyteller")} plays this Shadow. Its whispers reach only ${esc(actor.name)}'s player and the Storyteller.</p>`);
        });
    }

    /** The Shadowguide whispers to the wraith (its owners, the guide and the Storyteller), or the wraith answers its Shadow. */
    async function whisper(actor) {
        const asShadow = isGuide(actor) && !actor.isOwner || (game.user.isGM && !actor.hasPlayerOwner);
        const content = `<form><p>${asShadow ? `Whisper to <b>${esc(actor.name)}</b> as their Shadow.` : `Answer your Shadow (only its Shadowguide and the Storyteller see this).`}</p>
          <div class="form-group"><textarea name="text" rows="4" style="width:100%"></textarea></div></form>`;
        return dialog(asShadow ? "The Shadow whispers" : "Answer the Shadow", content, "Send", async fd => {
            if (!fd.text?.trim()) return null;
            const ids = [...new Set([...gmIds(), guideOf(actor)?.id, ...(asShadow ? ownerIds(actor) : [])].filter(Boolean))];
            return ChatMessage.create({ content: `<div class="vta-card wodx-shadow"><p>${esc(fd.text).replace(/\n/g, "<br>")}</p></div>`, whisper: ids,
                speaker: { alias: asShadow ? `Shadow of ${actor.name}` : actor.name }, flags: { [MOD]: { shadowWhisper: actor.uuid } } });
        });
    }

    /** The Shadowguide's tools: Angst, Catharsis, Shadow Dice, Dark Passions, Thorns. */
    async function shadow(actor) {
        const i = info(actor);
        const thorns = DATA.wraith?.thorns ?? [];
        const content = `<form><p><b>${esc(actor.name)}</b> — Angst ${i.angst.temp} (permanent ${i.angst.perm}), Willpower ${i.willpower.temp}/${i.willpower.perm}, Eidolon ${i.eidolon}.${W.catharsisReady(i.angst.temp, i.willpower.temp) ? " <b>Angst is above Willpower: Catharsis may be tried.</b>" : ""}</p>
          <div class="form-group"><label>What</label><select name="act" data-fixed>
            <option value="catharsis">Catharsis: the Shadow tries to take control</option>
            <option value="dice">Offer Shadow Dice on the next roll</option>
            <option value="dark">A Dark Passion roll</option>
            <option value="thorn">Use a Thorn</option>
            <option value="start">Starting Angst (creation: Willpower dice at 6)</option>
            <option value="adjust">Change Angst by hand</option></select></div>
          <div class="form-group"><label>Shadow Dice offered / accepted</label><input type="number" name="dice" value="2" min="0" max="5" style="width:4em"/> <input type="number" name="took" value="2" min="0" max="5" style="width:4em"/> <label>difficulty</label> <input type="number" name="diceDiff" value="6" style="width:4em"/></div>
          <div class="form-group"><label>Dark Passion</label><select name="dp" data-fixed>${i.darkPassions.map(d => `<option value="${d.id}">${esc(d.name)} (${d.value})</option>`).join("") || `<option value="">— none on the sheet —</option>`}</select> <label><input type="checkbox" name="others"/> stirred in someone else (9)</label></div>
          <div class="form-group"><label>Thorn</label>${searchBox("select[name=thorn]", "Search Thorns…", "Search Thorns")}<select name="thorn">${thorns.map(t => `<option value="${t.id}">${esc(t.n)} (${esc(t.cost)})</option>`).join("")}</select></div>
          <div class="form-group"><label>Angst change</label><input type="number" name="delta" value="1"/></div></form>`;
        return dialog(`The Shadow — ${actor.name}`, content, "Go", async fd => {
            const rolls = [];
            if (fd.act === "adjust") { const note = await P.adjust(actor, "angst", n(fd.delta)); return toGuide(actor, "Angst", `<p>${esc(note ?? "No change.")}</p>`); }
            if (fd.act === "start") {
                const r = await rollPool(i.willpower.perm, 6, { canBotch: false }); rolls.push(r.roll);
                const perm = W.startingAngst(r.faces);
                await ctx.setFlag(actor, "angstPermanent", perm);
                if (actor.system?.advantages?.angst && "permanent" in actor.system.advantages.angst) await ctx.updateActor(actor, { "system.advantages.angst.permanent": perm });
                return toGuide(actor, "Starting Angst", rollBlock(`Willpower ${i.willpower.perm}`, r) + `<p>Permanent Angst ${perm} (ones don't cancel; at least 1; p. 230).</p>`);
            }
            if (fd.act === "catharsis") {
                if (!W.catharsisReady(i.angst.temp, i.willpower.temp)) return ctx.notify("Catharsis needs temporary Angst above Willpower (p. 230).");
                await P.adjust(actor, "angst", -1);
                const s = await rollPool(i.angst.temp - 1, 6); const p = await rollPool(i.willpower.perm + i.eidolon, 6); rolls.push(s.roll, p.roll);
                const who = W.catharsis(s.successes, p.successes);
                await ctx.setFlag(actor, "shadowDominant", who === "shadow" ? true : null);
                if (who === "shadow") await ctx.logEvent?.(actor, "Catharsis: the Shadow takes control.", "shadow");
                const html = rollBlock("The Shadow: temporary Angst", s) + rollBlock(`The Psyche: Willpower${i.eidolon ? " + Eidolon" : ""}`, p) + `<div class="vta-big ${who === "shadow" ? "bad" : "good"}">${who === "shadow" ? "The Shadow takes control." : "The Psyche keeps control."}</div><div class="wodx-quiet">Wraith 20th p. 236</div>`;
                await toGuide(actor, `Catharsis: ${actor.name}`, html);
                return ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}</h3><p>${who === "shadow" ? "The Shadow seizes control." : "The Psyche fights off the Shadow."}</p></div>`, whisper: ownerIds(actor), speaker: { alias: "WoDX" } });
            }
            if (fd.act === "dice") {
                const took = Math.min(n(fd.dice), n(fd.took));
                const r = await rollPool(took, fd.diceDiff, { canBotch: false }); rolls.push(r.roll);
                const sd = W.shadowDice(took, r.faces);
                if (sd.angst) await P.adjust(actor, "angst", sd.angst);
                return post(actor, `${actor.name}: Shadow Dice`, rollBlock(`${took} Shadow Dice`, r) + `<div class="vta-res">${r.successes} success${r.successes === 1 ? "" : "es"} to add to the roll; the Shadow takes ${sd.angst} Angst (each 1; p. 235).</div>`, rolls);
            }
            if (fd.act === "dark") {
                const d = i.darkPassions.find(x => x.id === fd.dp);
                if (!d) return ctx.notify("No Dark Passion on the sheet.");
                const r = await rollPool(d.value, W.darkPassionDifficulty(fd.others)); rolls.push(r.roll);
                if (!r.botch && r.successes) await P.adjust(actor, "angst", r.successes);
                return toGuide(actor, `Dark Passion: ${d.name}`, rollBlock(`${esc(d.name)} (${d.value})`, r) + `<p>+${r.botch ? 0 : r.successes} temporary Angst (p. 235).</p>`);
            }
            if (fd.act === "thorn") {
                const t = thorns.find(x => x.id === fd.thorn);
                if (!t) return null;
                let html = `<p><b>${esc(t.n)}</b>: ${esc(t.e)} <span class="wodx-quiet">(p. ${t.p})</span></p>`;
                if (t.use?.angst) { if (i.angst.temp < t.use.angst) return ctx.notify("Not enough Angst."); await P.adjust(actor, "angst", -t.use.angst); html += `<p>${t.use.angst} Angst spent.</p>`; }
                if (t.use?.roll || t.use?.dice) {
                    const dice = t.use.dice ?? (t.use.roll === "permangst" ? i.angst.perm : i.angst.temp);
                    const tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
                    const diff = typeof t.use.diff === "number" ? t.use.diff : (W.arcanosDifficulty(t.use.diff, { t: targetTraits(tgt) }) ?? 6);
                    const r = await rollPool(dice, diff); rolls.push(r.roll);
                    html += rollBlock(t.n, r);
                }
                if (t.use?.resist) html += `<p>${esc(actor.name)} may resist: ${cap(t.use.resist)} at ${t.use.diff}.</p>`;
                return toGuide(actor, `Thorn: ${t.n}`, html);
            }
            return null;
        }, { width: 540 });
    }

    /* ---------------- Harrowings ---------------- */

    async function harrowing(actor, { kind = "general" } = {}) {
        const i = info(actor);
        const usedEidolon = !!sessionKey() && actor.getFlag(MOD, "eidolonSession") === sessionKey();
        const content = `<form><p><b>${esc(actor.name)}</b> is Harrowed. Play it out; when it stalls, the escape roll decides (Wraith 20th pp. 240–245).</p>
          <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${Object.entries(W.HARROWING_KINDS).map(([k, l]) => `<option value="${k}" ${k === kind ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Good play lowers the difficulty by</label><select name="good" data-fixed><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="eidolon" ${i.eidolon && !usedEidolon ? "" : "disabled"}/> Roll Eidolon first (${i.eidolon}, at 9, once a session${usedEidolon ? ": used" : ""})</label></div>
          <div class="form-group"><label><input type="checkbox" name="wp" ${i.willpower.temp > 1 ? "" : "disabled"}/> Spend Willpower for an automatic success on the escape (not the last point)</label></div></form>`;
        return dialog(`Harrowing — ${actor.name}`, content, "Roll", async fd => {
            const rolls = []; let body = "";
            if (fd.eidolon && i.eidolon) {
                const e = await rollPool(i.eidolon, 9); rolls.push(e.roll);
                await actor.setFlag(MOD, "eidolonSession", sessionKey() || String(game.time.worldTime));
                body += rollBlock("Eidolon", e) + `<div class="vta-note">${e.successes} change${e.successes === 1 ? "" : "s"} that may be made to the Harrowing.</div>`;
            }
            if (fd.wp && !(await spendWillpower(actor, 1))) fd.wp = false;
            const r = await rollPool(i.willpower.perm, W.escapeDifficulty(n(fd.good)), { willpower: fd.wp }); rolls.push(r.roll);
            body += rollBlock(`Permanent Willpower (${i.willpower.perm})`, r, fd.wp ? ["Willpower spent"] : []);
            const out = r.successes > 0 && !r.botch;
            body += `<div class="vta-big ${out ? "good" : "bad"}">${out ? "Free of the Harrowing." : "The Harrowing takes its price."}</div>`;
            if (!out) body += `<div class="vta-note">${esc(W.harrowingLoss(fd.kind))}</div>${fd.kind !== "passion" ? wbtn("vsAngst", actor, "Willpower vs the Shadow's Angst") : ""}`;
            if (fd.kind === "destruction" && out) { await P.adjust(actor, "angst", -1); body += `<div class="vta-note">A Destruction Harrowing won: the Shadow loses 1–3 temporary Angst (1 taken; p. 245).</div>`; }
            await ctx.logEvent?.(actor, `Harrowing (${fd.kind}): ${out ? "escaped" : "lost"}.`, "harrowing");
            return post(actor, `${actor.name}: Harrowing`, body, rolls);
        });
    }
    async function vsAngst(actor) {
        const i = info(actor);
        const a = await rollPool(i.willpower.perm, 6), s = await rollPool(i.angst.perm, 6);
        const won = a.successes > s.successes;
        return post(actor, `${actor.name} against the Shadow`, rollBlock("Permanent Willpower", a) + rollBlock("The Shadow's permanent Angst", s) + `<div class="vta-big ${won ? "good" : "bad"}">${won ? "The Psyche endures." : "The Shadow gains ground."}</div><div class="wodx-quiet">Wraith 20th pp. 244–245</div>`, [a.roll, s.roll]);
    }

    /** After a spend: the last Willpower drops the wraith into a Harrowing (p. 304). */
    async function afterSpend(actor) {
        if (!isWraith(actor) || !setting("eventPrompts")) return;
        if (n(actor.system?.advantages?.willpower?.temporary) === 0) await ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}</h3><p>The last Willpower is spent: a fall into a Harrowing (Wraith 20th p. 304).</p>${wbtn("harrowing", actor, "Harrowing", "general")}</div>`, whisper: ownerIds(actor), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /** Corpus changes (GM): wavering, or a Harrowing when lethal or worse fills it (p. 292). */
    async function onCorpus(actor, before, after) {
        if (!isActiveGM() || !isWraith(actor) || !setting("eventPrompts")) return null;
        const max = info(actor).corpus.max;
        const was = W.corpusState(before, max), now = W.corpusState(after, max);
        if (now === was || now === "corporeal") return null;
        return ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}</h3><p>${now === "harrowed" ? "The Corpus is torn apart: a Harrowing (Wraith 20th p. 292)." : "The Corpus is full of bashing damage: wavering; lethal harm now starts a Harrowing."}</p>${now === "harrowed" ? wbtn("harrowing", actor, "Harrowing", "destruction") : ""}</div>`,
            whisper: ownerIds(actor), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- The Caul ---------------- */

    async function caul(actor) {
        const i = info(actor);
        const tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
        const content = `<form><p>Death and the Caul (Wraith 20th pp. 280–282).</p>
          <div class="form-group"><label>Who</label><select name="who" data-fixed><option value="self">${esc(actor.name)} tears away their own Caul</option><option value="reaper" ${tgt ? "" : "disabled"}>${esc(actor.name)} reaps the targeted Enfant${tgt ? ` (${esc(tgt.name)})` : " (target one)"}</option></select></div></form>`;
        return dialog("The Caul", content, "Go", async fd => {
            if (!(await spendWillpower(actor, 1))) return null;
            if (fd.who === "self") {
                const r = await rollPool(i.willpower.perm, W.CAUL_SELF.difficulty);
                const add = r.botch ? 0 : r.successes;
                if (add) await ctx.updateActor(actor, { "system.advantages.pathos.temporary": i.pathos.temp + add });
                await ctx.logEvent?.(actor, "Tears away the Caul and wakes among the dead.", "caul");
                return post(actor, `${actor.name}: the Caul`, rollBlock("Willpower", r) + `<div class="vta-res">+${add} Pathos (may pass 10; above 10 the wraith glows: −1 to Perception rolls to notice them).</div>`, [r.roll]);
            }
            const ti = info(tgt);
            const ab = findAbility(actor, "empathy")?.value ?? 0;
            const r = await rollPool(attr(actor, "charisma") + ab, W.reaperDifficulty(ti.memoriam));
            let html = rollBlock(`Charisma + Empathy (9 − Memoriam ${ti.memoriam})`, r);
            if (r.successes > 0) { await P.adjust(actor, "pathos", W.reaperPathos(ti.memoriam)); html += `<div class="vta-res good">The Enfant wakes gently; the Reaper gains ${W.reaperPathos(ti.memoriam)} Pathos and −2 to Empathy with them this session.</div>`; }
            else html += `<div class="vta-res">Not yet: another Willpower to reach them again.</div>`;
            return post(actor, `${actor.name} reaps ${tgt.name}`, html, [r.roll]);
        });
    }

    /** The Storyteller starts a new scene: Passions may be tapped again and Hysteria ends. */
    async function newScene({ quiet = false } = {}) {
        if (!game.user.isGM) return ctx.notify("The Storyteller starts a new scene.");
        await game.settings.set(MOD, "wraithScene", n(game.settings.get(MOD, "wraithScene")) + 1);
        if (canvas?.scene?.getFlag(MOD, "hysteria")) await canvas.scene.unsetFlag(MOD, "hysteria");
        if (quiet) return true;
        return ChatMessage.create({ content: `<div class="vta-card"><h3>A new scene</h3><p>Passions can be tapped again; Hysteria ends.</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
    }
    /** A new session (Memoriam and Eidolon are once a session). Set at a GM's first login after six hours away, or by hand. */
    async function newSession({ quiet = false } = {}) {
        if (!game.user.isGM) return null;
        await game.settings.set(MOD, "sessionId", foundry.utils.randomID());
        if (!quiet) ui.notifications.info("WoDX: a new session begins (Memoriam and Eidolon refresh).");
        return true;
    }
    async function onReady() {
        if (!isActiveGM()) return;
        const last = n(game.settings.get(MOD, "lastGmReady")), now = Math.floor(Date.now() / 1000);
        if (!game.settings.get(MOD, "sessionId") || now - last > 6 * 3600) await newSession({ quiet: true });
        await game.settings.set(MOD, "lastGmReady", now);
    }

    /** The Maelstrom (GM): set its force here, and roll the storm's damage for exposed wraiths (Wraith: The Great War p. 87). */
    async function maelstrom() {
        if (!game.user.isGM || !canvas?.scene) return ctx.notify("The Storyteller calls the Maelstrom.");
        const cur = storm();
        const wraiths = (canvas.tokens?.placeables ?? []).filter(t => t.actor && isWraith(t.actor));
        const content = `<form><p>Maelstrom force here: ${cur || "none"}. A storm's damage each scene to wraiths outside shelter, by force (Wraith: The Great War p. 87; the Great War profile's Fourth Great Maelstrom, and any storm the Storyteller calls).</p>
          <div class="form-group"><label>Force</label><select name="force" data-fixed>${[0, 1, 2, 3, 4, 5].map(f => `<option value="${f}" ${f === cur ? "selected" : ""}>${f ? `${f}: ${W.MAELSTROM[f].dice.join("–")} dice, aggravated ${W.MAELSTROM[f].agg}; outdoors +${W.MAELSTROM[f].diff}` : "None"}</option>`).join("")}</select></div>
          <div class="form-group"><label>Roll damage now for the exposed</label><select name="who" data-fixed><option value="none">No, just set the force</option><option value="targets">The targeted wraiths</option><option value="all">Every wraith token here (${wraiths.length})</option></select></div>
          <div class="form-group"><label>Haunt level sheltering them</label><input type="number" name="haunt" value="0" min="0" max="5"/> <label><input type="checkbox" name="agg"/> This scene's damage is aggravated</label></div></form>`;
        return dialog("The Maelstrom", content, "Go", async fd => {
            const force = n(fd.force);
            if (force) await canvas.scene.setFlag(MOD, "maelstrom", force); else await canvas.scene.unsetFlag(MOD, "maelstrom");
            const list = fd.who === "all" ? wraiths.map(t => t.actor) : fd.who === "targets" ? [...game.user.targets].map(t => t.actor).filter(a => a && isWraith(a)) : [];
            const lines = [];
            for (const a of list) {
                const dice = W.maelstromDice(force, { haunt: n(fd.haunt) });
                if (!dice) { lines.push(`<li>${esc(a.name)}: sheltered</li>`); continue; }
                const r = await rollPool(dice, 6, { canBotch: false });
                const lv = r.successes;
                if (lv) await corpusDamage(a, fd.agg ? "aggravated" : "lethal", lv);
                lines.push(`<li>${esc(a.name)}: ${dice} dice → ${lv} ${fd.agg ? "aggravated" : "lethal"} on the Corpus</li>`);
            }
            return ChatMessage.create({ content: `<div class="vta-card"><h3>The Maelstrom${force ? `, force ${force}` : " passes"}</h3>${force ? `<p>Outdoors: +${W.MAELSTROM[force].diff} difficulty to everything. Haunts: ${esc(W.MAELSTROM[force].haunt)} (counted). Armor: ${esc(W.MAELSTROM[force].armor)} (not counted: take it off by hand).</p>` : ""}${lines.length ? `<ul>${lines.join("")}</ul>` : ""}<p class="wodx-quiet">Wraith: The Great War p. 87</p></div>`, speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
        });
    }

    /** Hysteria (p. 283): the Storyteller lowers this scene's Shroud by one (at most three) until the scene ends. */
    async function hysteria() {
        if (!game.user.isGM || !canvas?.scene) return ctx.notify("The Storyteller calls Hysteria.");
        const h = Math.min(3, n(canvas.scene.getFlag(MOD, "hysteria")) + 1);
        await canvas.scene.setFlag(MOD, "hysteria", h);
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Hysteria</h3><p>Fear spreads: the Shroud here is ${h} lower until the scene ends (never under 4; Wraith 20th p. 283).</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" } });
    }

    async function onChatButton(b) {
        const doc = b.dataset.actor ? await fromUuid(b.dataset.actor) : null;
        const a = doc?.actor ?? doc;
        if (!a) return ctx.notify("That character is gone.");
        const k = b.dataset.wx;
        if (k === "angst") { if (!isGuide(a)) return ctx.notify("The Shadowguide or the Storyteller decides."); await P.adjust(a, "angst", n(b.dataset.arg) || 1); return toGuide(a, "Angst", `<p>+${n(b.dataset.arg) || 1} temporary Angst.</p>`); }
        if (!(a.isOwner || game.user.isGM)) return ctx.notify("Only the character's owner or the GM can do that.");
        if (k === "harrowing") return harrowing(a, { kind: b.dataset.arg || "general" });
        if (k === "vsAngst") return vsAngst(a);
        return null;
    }

    return { maelstrom, storm, info, useArcanos, corpusDamage, newScene, newSession, onReady, passion, fetter, memoriam, healCorpus, setCorpusDamage, shadowguide, whisper, shadow, harrowing, vsAngst, caul, hysteria, onCorpus, afterSpend, shroudAt, onChatButton, guideOf, targetTraits };
}

export function registerSettings() {
    game.settings.register(MOD, "sessionId", { scope: "world", config: false, type: String, default: "" });
    game.settings.register(MOD, "lastGmReady", { scope: "world", config: false, type: Number, default: 0 });
    game.settings.register(MOD, "wraithScene", { scope: "world", config: false, type: Number, default: 0 });
}
