/**
 * WoDX Actions 3.2 — the Kindred additions and the automatic prompts.
 *
 *   Disciplines   the V20 Dark Ages library (data/disciplines-daw.json): Use a Discipline from the sheet's dots
 *   Roads         every Dark Ages Road and Path (data/roads-daw.json): hierarchy, aura, Virtues; sin and frenzy follow them
 *   Prestation    a boons ledger with a journal view ("WoDX Prestation")
 *   Downtime      Herd, Retainers, Influence, Resources, Contacts, Domain upkeep — own dots or the coterie's pool
 *   Masquerade    who saw what, who was made to forget ("WoDX Masquerade")
 *   History       a page per character, written from the cards ("WoDX History")
 *   Automatic     natural healing with the clock, dawn and dusk, torpor's length and reminder, frenzy and
 *                 Rötschreck prompts from wounds, fire, sun and hunger, rising on Rage, the Delirium when a
 *                 Crinos is seen
 *
 * Built by main.js with its helpers (ctx), like the Garou engine. Pure rules: kindred-rules.js.
 */

import { spendTime } from "./spend-time.js";
import * as K from "./kindred-rules.js";
import * as P from "./profiles.js";
import * as GX from "./garou.js";
import * as G from "./garou-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";
import * as EF from "./effects.js";
import * as PE from "./path-effects.js";
import * as TH from "./trait-hooks.js";
import * as WR from "./witness-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const chronicle = () => game.modules.get("wodx-chronicle")?.api ?? game.wodx?.chronicle ?? null;
const LABEL = { strength: "Strength", dexterity: "Dexterity", stamina: "Stamina", charisma: "Charisma", manipulation: "Manipulation",
    appearance: "Appearance", perception: "Perception", intelligence: "Intelligence", wits: "Wits", animalken: "Animal Ken",
    selfcontrol: "Self-Control", bodycrafts: "Body Crafts", willpower: "Willpower", road: "Road" };
const lab = k => LABEL[k] ?? cap(k);

export const DATA = { disc: null, roads: null };
/** The place line for a card (3.42.0), from the witness rules. */
export const placeNoteOf = (mode, event = "", secret = "kindred") => WR.placeNote(mode, secret, event);
export async function loadData() {
    const get = async f => { try { const r = await fetch(`modules/${MOD}/data/${f}`); return r.ok ? r.json() : null; } catch (e) { console.warn("WoDX |", f, e); return null; } };
    [DATA.disc, DATA.roads] = await Promise.all([get("disciplines-daw.json"), get("roads-daw.json")]);
    return DATA;
}

/** Date label of the chronicle clock, if WoDX Chronicle's calendar is there. */
async function clockNow(time = game.time.worldTime) {
    try {
        const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
        const lat = game.settings.get("wodx-chronicle", "latitude");
        return cal.describeTime(time, lat);
    } catch (e) { return { dateLabel: "", timeLabel: "", isNight: null }; }
}

/** Sheet Disciplines and paths as [{id, name, value}]. */
export function sheetDisciplines(actor) {
    return [...(actor?.items ?? [])].filter(i => i.type === "Power" && /wod\.types\.discipline(path)?$/.test(i.system?.type ?? ""))
        .map(i => ({ id: i.id, name: i.name, value: n(i.system?.value) }));
}

/** The Road a character walks: the WoDX choice (flag) first, else the sheet's Road name. */
export function roadOf(actor) {
    if (!DATA.roads) return null;
    const f = actor?.getFlag?.(MOD, "road");
    if (f?.key && DATA.roads.roads[f.key]) {
        const road = DATA.roads.roads[f.key];
        return { key: f.key, road, path: road.paths.find(p => p.name === f.path) ?? null };
    }
    const p = actor?.system?.advantages?.path ?? {};
    const name = p.custom || game.i18n?.localize?.(p.label || "") || "";
    return K.roadFor(DATA.roads, name.startsWith("wod.") ? "" : name);
}

/* ================================================================== */

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, attr, findAbility, abilityList, setting, spendWillpower } = ctx;

    /* ---------------- History log ---------------- */

    /** One line on the character's page in "WoDX History" (GM writes; players' lines go through the GM). */
    async function logEvent(actor, text, kind = "") {
        if (!actor || !text || !setting("historyLog")) return null;
        if (!game.user.isGM) { ctx.requestGM?.({ action: "kx", op: "history", uuid: actor.uuid, text, kind }); return null; }
        const when = await clockNow();
        const row = `<li data-kind="${esc(kind)}"><b>${esc(when.dateLabel || `World time ${game.time.worldTime}`)}</b>: ${esc(text)}</li>`;
        let j = game.journal.find(x => x.getFlag?.(MOD, "kind") === "history");
        if (!j) j = await JournalEntry.create({ name: "WoDX History", flags: { [MOD]: { kind: "history" } }, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER } });
        const name = actor.name;
        const page = j.pages.find(p => p.getFlag?.(MOD, "actor") === actor.uuid) ?? j.pages.getName(name);
        if (!page) await j.createEmbeddedDocuments("JournalEntryPage", [{ name, type: "text", text: { content: `<ul>${row}</ul>` }, flags: { [MOD]: { actor: actor.uuid } } }]);
        else await page.update({ "text.content": (page.text?.content || "<ul></ul>").replace(/<\/ul>\s*$/, `${row}</ul>`) });
        return row;
    }

    /* ---------------- Disciplines ---------------- */

    function targetTraits(t) {
        if (!t) return null;
        const s = t.system ?? {}, v = s.advantages?.virtues ?? {};
        const out = { willpower: n(s.advantages?.willpower?.permanent), road: n(s.advantages?.path?.permanent),
            conscience: n(v.conscience?.permanent), conviction: n(v.conscience?.permanent), selfcontrol: n(v.selfcontrol?.permanent),
            instinct: n(v.selfcontrol?.permanent), courage: n(v.courage?.permanent), isVampire: P.detectProfile(t) === "kindred" };
        for (const a of K.ATTRS) out[a] = attr(t, a);
        for (const a of abilityList(t)) out[a.key.replace(/\s+/g, "")] = a.value;
        return out;
    }
    function traitValue(actor, key) {
        const v = actor.system?.advantages?.virtues ?? {};
        switch (key) {
            case "willpower": return n(actor.system?.advantages?.willpower?.permanent);
            case "road": return n(actor.system?.advantages?.path?.permanent);
            case "conscience": case "conviction": return n(v.conscience?.permanent);
            case "selfcontrol": case "instinct": return n(v.selfcontrol?.permanent);
            case "courage": return n(v.courage?.permanent);
        }
        return 0;
    }
    function abilityDots(actor, key) {
        const a = findAbility(actor, key) ?? abilityList(actor).find(x => x.key.replace(/\s+/g, "") === key);
        return a?.value ?? 0;
    }
    /** Dice for a roll code; chosenAttr fills "attr" (Koldunic powers name their Attribute on the page). */
    function poolOf(actor, code, chosenAttr = "") {
        let dice = 0; const label = [];
        for (const p of K.poolParts(code)) {
            if (p.kind === "number") { dice += p.value; label.push(String(p.value)); continue; }
            if (p.kind === "chooseAttr") { const a = chosenAttr || "wits"; dice += attr(actor, a); label.push(lab(a)); continue; }
            const vals = p.alts.map(a => [a, p.kind === "attr" ? attr(actor, a) : p.kind === "trait" ? traitValue(actor, a) : abilityDots(actor, a)]);
            vals.sort((x, y) => y[1] - x[1]);
            dice += vals[0][1];
            label.push(p.alts.length > 1 ? `${p.alts.map(lab).join(" or ")} (${lab(vals[0][0])})` : lab(vals[0][0]));
        }
        return { dice, label: label.join(" + ") };
    }

    async function useDiscipline(actor) {
        if (!DATA.disc) return ctx.notify("The Discipline library didn't load.");
        const sheet = sheetDisciplines(actor);
        const list = K.powersFor(DATA.disc.powers, sheet);
        if (!list.length) return ctx.notify(`${actor.name} has no Discipline dots the library knows (${sheet.map(s => s.name).join(", ") || "none on the sheet"}).`);
        let tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
        const rows = list.map(p => [p.id, `${p.d} ${"•".repeat(Math.min(5, p.l))}${p.l > 5 ? ` (${p.l})` : ""}: ${p.n}${p.elder ? " (elder)" : p.passive ? " (passive)" : ""}`]);
        const b = ctx.blood(actor);
        const content = `<form class="wodx-disc"><p><b>${esc(actor.name)}</b>: blood ${b.value}/${b.max}, ${b.perTurn} a turn${tgt ? `<span class="wodx-hdr-tgt">; target <b>${esc(tgt.name)}</b></span>` : ""}</p>
          <div class="form-group"><label>Power</label>${searchBox("select[name=power]", "Search powers…", "Search powers")}<select name="power" data-fixed>${rows.map(([v, l], i) => `<option value="${v}" ${i === 0 ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
          <div class="wodx-disc-info vta-note"></div>
          <div class="form-group wodx-disc-attr" style="display:none"><label>Activation Attribute (the page names it)</label><select name="attr" data-fixed>${K.ATTRS.map(a => `<option value="${a}">${lab(a)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/></div>
          <div class="form-group"><label>Blood / Willpower to spend</label><input type="number" name="blood" value="0" min="0" style="width:4em"/> <input type="number" name="wp" value="0" min="0" style="width:4em"/></div>
          <div class="form-group"><label>Bonus dice</label><input type="number" name="bonus" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="specialty"/> Specialty applies</label></div></form>`;
        const describe = root => {
            const p = list.find(x => x.id === root.querySelector("[name=power]").value);
            const box = root.querySelector(".wodx-disc-info");
            if (!p) { box.textContent = ""; return; }
            const c = K.discCost(p.c);
            const d = K.discDifficulty(p.diff, { t: targetTraits(tgt), own: { willpower: traitValue(actor, "willpower") } });
            if (d !== null) root.querySelector("[name=diff]").value = d;
            root.querySelector("[name=blood]").value = c.optional ? 0 : c.blood;
            root.querySelector("[name=wp]").value = c.willpower;
            root.querySelector(".wodx-disc-attr").style.display = /attr/.test(p.r ?? "") ? "" : "none";
            const costTxt = [c.blood && `${c.blood} blood${c.optional ? " (optional)" : ""}`, c.willpower && `${c.willpower} Willpower`, c.variable && "blood as needed"].filter(Boolean).join(", ") || "none";
            const roll = p.r ? `roll ${esc(poolOf(actor, p.r, root.querySelector("[name=attr]").value).label)}` : "no roll";
            box.innerHTML = `<b>${esc(p.n)}</b> (${esc(p.d)} ${p.l}) · cost ${esc(costTxt)} · ${roll} · ${esc(K.DURATION_TEXT[p.t] ?? p.t ?? "")} · VtDA20 p. ${p.p ?? "?"}<br>${esc(p.e)}`
                + (d === null && p.diff && p.diff !== "var" ? `<br><i>Difficulty from the target (${esc(String(p.diff).replace("t:", ""))}): target a token or set it.</i>` : "")
                + (p.diff === "var" ? "<br><i>The difficulty depends on the situation (see the page).</i>" : "");
        };
        return dialog(`Use a Discipline: ${actor.name}`, content, "Use", async fd => {
            const p = list.find(x => x.id === fd.power);
            if (!p) return null;
            const spendB = Math.max(0, n(fd.blood)), spendW = Math.max(0, n(fd.wp));
            const bb = ctx.blood(actor);
            if (spendB > bb.value) return ctx.notify(`${actor.name} has only ${bb.value} blood.`);
            const notes = [];
            if (spendB > bb.perTurn) notes.push(`more than ${bb.perTurn} blood a turn: ${Math.ceil(spendB / bb.perTurn)} turns`);
            if (spendW && !(await spendWillpower(actor, spendW))) return null;
            if (spendB) { const ch = await ctx.changeBlood(actor, -spendB); notes.push(`blood ${ch.before} → ${ch.after}`); }
            if (spendW) notes.push(`${spendW} Willpower`);
            let body = notes.length ? `<div class="vta-parts">${notes.map(esc).join(" · ")}</div>` : "";
            const rolls = [];
            let successes = 1;
            if (p.r && !p.passive) {
                const pool = poolOf(actor, p.r, fd.attr);
                // The target's Iron Will or Magic Resistance makes a mind power or magic harder (V20 pp. 485, 493)
                const target = [...(game.user.targets ?? [])][0]?.actor ?? null;
                const rm = target && target !== actor ? TH.resistMods(target, TH.powerTags(p.d), actor) : { diff: 0, parts: [] };
                const r = await rollPool(Math.max(0, pool.dice + n(fd.bonus)), Math.min(10, n(fd.diff) + rm.diff), { specialty: fd.specialty });
                rolls.push(r.roll);
                successes = r.botch ? 0 : r.successes;
                body += rollBlock(pool.label, r, [...(n(fd.bonus) ? [`bonus ${fd.bonus}`] : []), ...rm.parts], fd.specialty);
                if (r.botch) body += `<div class="vta-warn">Botch: the power turns on its user or fails badly (see the page).</div>`;
            }
            body += `<div class="vta-note">${esc(p.e)} <span class="wodx-quiet">(VtDA20 p. ${p.p ?? "?"})</span></div>`;
            // Path magic: what the successes do goes on the effects card (V20 Dark Ages pp. 275-302)
            let fx = null;
            if (PE.isPath(p.d) && successes > 0 && p.r && EF.isOn()) { fx = EF.pathPlan(actor, p, successes); body += fx.html; }
            const dur = successes > 0 && !PE.PATH_EFFECTS[p.id] ? K.discDuration(p.t, successes) : null;
            if (dur && chronicle()?.applyTimed && actor.isOwner) {
                await chronicle().applyTimed(actor, { name: p.n, img: "icons/svg/aura.svg", description: p.e, duration: dur, source: `VtDA20 p. ${p.p}`, key: `disc-${p.id}` });
                body += `<div class="vta-note">Shown on the token until it ends (${esc(K.DURATION_TEXT[p.t] ?? "")}).</div>`;
            }
            // The Forgetful Mind on a witness: the Masquerade ledger marks them as made to forget
            if (/forgetful mind/i.test(p.n) && tgt && successes > 0) {
                const marked = await setWitnessState(tgt, "forgot", actor.name);
                if (marked) body += `<div class="vta-note">Masquerade: ${esc(tgt.name)} marked as made to forget (${marked} record${marked === 1 ? "" : "s"}).</div>`;
            }
            // B3565: Aura Perception shows the black veins of a diablerist (V20 p. 294)
            if (/aura perception/i.test(p.n) && tgt && successes > 0) body += ctx.api().debtsMarks?.()?.auraNote?.(tgt) ?? "";
            // Any other Discipline: its keywords on the effects card (Traits With Teeth step 4)
            if (!fx && p.r && !p.passive && successes > 0 && EF.isOn()) {
                const pp = EF.powerPlan(actor, { set: "disc", id: p.id, name: p.n, line: "v20", successes, source: `VtDA20 p. ${p.p ?? "?"}` });
                if (pp.items.length || pp.skipped.length) { fx = pp; body += pp.html; }
            }
            const fxItems = (fx?.items ?? []).filter(x => x.route !== "off" && x.route !== "st");
            // Who could see it, if the power showed (3.42.0): the Storyteller judges whether it did
            if (!p.passive && setting("witnessAsk")) revealed(actor, { event: `used ${p.n}`, ask: true }).catch(e => console.error("WoDX |", e));
            return post(actor, `${actor.name}: ${esc(p.n)}`, body, rolls, fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
        }, { width: 540, render: root => { describe(root); root.querySelector("[name=power]")?.addEventListener("change", () => describe(root)); root.querySelector("[name=attr]")?.addEventListener("change", () => describe(root));
            aim(root, { actor, lib: "disc", power: r => list.find(x => x.id === r.querySelector("[name=power]")?.value), onPick: a => { tgt = a; describe(root); } }); } });
    }

    /* ---------------- Roads ---------------- */

    function hierarchyTable(found, rating) {
        const h = K.hierarchyOf(found);
        if (!h) return `<p class="vta-note">${esc(found?.road?.note ?? "No hierarchy recorded: read the page.")}</p>`;
        return `<table class="vta-table"><tr><th>Rating</th><th>Sin (WoDX summary)</th></tr>${h.map((s, i) => `<tr${10 - i === rating ? ' class="vta-here"' : ""}><td>${10 - i}</td><td>${esc(s)}</td></tr>`).join("")}</table>`;
    }

    async function setRoad(actor) {
        if (!DATA.roads) return ctx.notify("The Roads data didn't load.");
        const cur = roadOf(actor);
        const opts = [];
        for (const [k, r] of Object.entries(DATA.roads.roads)) {
            opts.push([`${k}|`, r.name]);
            for (const p of r.paths) opts.push([`${k}|${p.name}`, `${r.name}: ${p.name}`]);
        }
        const sel = cur ? `${cur.key}|${cur.path?.name ?? ""}` : "";
        const rating = n(actor.system?.advantages?.path?.permanent);
        const content = `<form><p><b>${esc(actor.name)}</b>: ${esc(cur ? `${cur.road.name}${cur.path ? `, ${cur.path.name}` : ""}` : "no Road recognized")} ${rating}</p>
          <div class="form-group"><label>Road and Path</label>${searchBox("select[name=road]", "Search Roads…", "Search Roads")}<select name="road" data-fixed>${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
          <div class="form-group"><label><input type="checkbox" name="writeSheet" checked/> Write the Road's name on the sheet</label></div>
          <div class="wodx-road-info"></div></form>`;
        const show = root => {
            const [k, path] = root.querySelector("[name=road]").value.split("|");
            const r = DATA.roads.roads[k];
            const found = { key: k, road: r, path: r?.paths.find(p => p.name === path) ?? null };
            root.querySelector(".wodx-road-info").innerHTML = r ? `<p class="vta-note"><b>Aura:</b> ${esc(r.aura)} · <b>Virtues:</b> ${r.virtues.map(v => DATA.roads.virtueLabels[v]).join(" and ")} and Courage · VtDA20 p. ${found.path?.p ?? r.p}</p>${hierarchyTable(found, rating)}` : "";
        };
        return dialog(`Road: ${actor.name}`, content, "Save", async fd => {
            const [k, path] = String(fd.road).split("|");
            const r = DATA.roads.roads[k];
            if (!r) return null;
            await ctx.setFlag(actor, "road", { key: k, path: path || null });
            if (fd.writeSheet) await updateActor(actor, { "system.advantages.path.custom": path || r.name });
            await logEvent(actor, `Walks the ${path || r.name}.`, "road");
            return post(actor, `${actor.name}: ${esc(path || r.name)}`, `<div class="vta-note">Virtues: ${r.virtues.map(v => DATA.roads.virtueLabels[v]).join(" and ")} and Courage. Aura: ${esc(r.aura)}. Sin, frenzy and Rötschreck rolls now use these.</div>`);
        }, { width: 540, render: root => { show(root); root.querySelector("[name=road]").addEventListener("change", () => show(root)); } });
    }

    /* ---------------- Prestation ---------------- */

    function ledger(kind, name, pages) {
        return { find: () => game.journal.find(x => x.getFlag?.(MOD, "kind") === kind),
            async ensure() {
                let j = this.find();
                if (!j) j = await JournalEntry.create({ name, flags: { [MOD]: { kind, entries: [] } }, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
                    pages: pages.map((p, i) => ({ name: p, type: "text", sort: (i + 1) * 1000, text: { content: "<p></p>" } })) });
                return j;
            },
            entries() { return foundry.utils.deepClone(this.find()?.getFlag(MOD, "entries") ?? []); } };
    }
    const BOONJ = ledger("prestation", "WoDX Prestation", ["Outstanding", "Ledger"]);
    const MASQJ = ledger("masquerade", "WoDX Masquerade", ["Open breaches", "All records"]);

    async function writeBoons(entries) {
        const j = await BOONJ.ensure();
        await j.setFlag(MOD, "entries", entries);
        const bal = K.boonBalance(entries);
        const out = bal.length ? `<table><tr><th>Owes</th><th>To</th><th>Boons</th></tr>${bal.map(b => `<tr><td>${esc(b.from)}</td><td>${esc(b.to)}</td><td>${b.boons.map(k => esc(K.BOONS[k]?.label ?? k)).join(", ")}</td></tr>`).join("")}</table>` : "<p>No boons outstanding.</p>";
        const all = entries.length ? `<table><tr><th>When</th><th>Owes</th><th>To</th><th>Boon</th><th>For</th><th>Status</th></tr>${entries.map(e => `<tr><td>${esc(e.date)}</td><td>${esc(e.from)}</td><td>${esc(e.to)}</td><td>${esc(K.BOONS[e.kind]?.label ?? e.kind)}</td><td>${esc(e.for)}</td><td>${esc(e.status)}${e.settled ? ` (${esc(e.settled)})` : ""}</td></tr>`).join("")}</table>` : "<p></p>";
        await j.pages.getName("Outstanding")?.update({ "text.content": `<p class="wodx-quiet">Prestation (V20 Dark Ages): trivial, minor, major, blood and life boons.</p>${out}` });
        await j.pages.getName("Ledger")?.update({ "text.content": all });
        return j;
    }

    async function boons(actor = null) {
        if (!game.user.isGM) return ctx.notify("The Storyteller keeps the prestation ledger.");
        const entries = BOONJ.entries();
        const names = [...new Set([...game.actors.filter(a => a.type !== "Group" && P.detectProfile(a) === "kindred").map(a => a.name), ...entries.flatMap(e => [e.from, e.to])])].sort();
        const open = entries.map((e, i) => [i, e]).filter(([, e]) => e.status === "owed");
        const tgt = [...(game.user.targets ?? [])][0]?.actor?.name ?? "";
        const dl = `<datalist id="wodx-boon-names">${names.map(x => `<option value="${esc(x)}">`).join("")}</datalist>`;
        const content = `<form>${dl}
          <fieldset><legend>Record a boon</legend>
            <div class="form-group"><label>Who owes</label><input type="text" name="from" list="wodx-boon-names" value="${esc(tgt)}"/></div>
            <div class="form-group"><label>To whom</label><input type="text" name="to" list="wodx-boon-names" value="${esc(actor?.name ?? "")}"/></div>
            <div class="form-group"><label>Boon</label><select name="kind">${Object.entries(K.BOONS).map(([k, b]) => `<option value="${k}" ${k === "minor" ? "selected" : ""}>${esc(b.label)}</option>`).join("")}</select></div>
            <div class="form-group"><label>For</label><input type="text" name="for" placeholder="what was done"/></div></fieldset>
          <fieldset><legend>Or settle one (${open.length} outstanding)</legend>
            ${open.length > 5 ? searchBox("select[name=settle]", "Search boons…", "Search boons") : ""}
            <div class="form-group"><select name="settle"><option value="">— none —</option>${open.map(([i, e]) => `<option value="${i}">${esc(e.from)} → ${esc(e.to)}: ${esc(K.BOONS[e.kind]?.label ?? e.kind)}${e.for ? ` (${esc(e.for)})` : ""}</option>`).join("")}</select></div>
            <div class="form-group"><label>How</label><select name="how"><option value="repaid">Repaid</option><option value="called">Called in and paid</option><option value="refused">Refused (a scandal)</option><option value="void">Void (one side destroyed)</option></select></div></fieldset></form>`;
        return dialog("Prestation", content, "Record", async fd => {
            const when = (await clockNow()).dateLabel;
            const list = BOONJ.entries();
            let text;
            if (fd.settle !== "" && fd.settle !== undefined && list[n(fd.settle)]) {
                const e = list[n(fd.settle)];
                e.status = fd.how; e.settled = when;
                text = `${e.from}'s ${K.BOONS[e.kind]?.label.toLowerCase() ?? "boon"} to ${e.to}: ${fd.how}.`;
            } else {
                if (!fd.from || !fd.to) return ctx.notify("Name who owes and to whom.");
                list.push({ date: when, from: fd.from, to: fd.to, kind: fd.kind, for: fd.for || "", status: "owed" });
                text = `${fd.from} owes ${fd.to} a ${K.BOONS[fd.kind]?.label.toLowerCase()}${fd.for ? ` for ${fd.for}` : ""}.`;
            }
            await writeBoons(list);
            for (const nm of [fd.from, fd.to]) { const a = game.actors.getName(nm); if (a) await logEvent(a, text, "boon"); }
            return ChatMessage.create({ content: `<div class="vta-card"><h3>Prestation</h3><p>${esc(text)}</p><p class="wodx-quiet">Journal: WoDX Prestation</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
        }, { width: 520 });
    }

    /* ---------------- Downtime and domain ---------------- */

    function groupsOf(actor) {
        return game.actors.filter(g => g.type === "Group" && (g.system?.roster ?? []).some(r => r.actorId === actor.id && !r.left));
    }
    function pooled(group, name) {
        const b = (group.system?.backgrounds ?? []).find(x => String(x.name).toLowerCase() === name.toLowerCase());
        return b ? Object.values(b.contributions ?? {}).reduce((s, v) => s + n(v), 0) : 0;
    }

    async function downtime(actor) {
        const groups = groupsOf(actor);
        const rows = Object.entries(K.DOWNTIME).map(([k, d]) => {
            const own = ctx.background(actor, d.bg);
            const pools = groups.map(g => [g, pooled(g, d.bg)]).filter(([, v]) => v > 0);
            return { k, d, own, pools };
        });
        const content = `<form><p><b>${esc(actor.name)}</b>: a week of downtime on a Background. The pool is the Background's dots, your own or the coterie's.</p>
          <div class="form-group"><label>Action</label><select name="kind" data-fixed>${rows.map(r => `<option value="${r.k}">${esc(r.d.label)} (${esc(r.d.bg)} ${r.own}${r.pools.length ? `; pool ${r.pools.map(([g, v]) => `${esc(g.name)} ${v}`).join(", ")}` : ""})</option>`).join("")}</select></div>
          <div class="form-group"><label>Dots from</label><select name="from"><option value="own">Own sheet</option>${groups.map(g => `<option value="${g.id}">${esc(g.name)}'s pool</option>`).join("")}</select></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6"/></div>
          <div class="form-group"><label>Weeks</label><input type="number" name="weeks" value="1" min="1" max="12"/></div>
          <div class="form-group"><label><input type="checkbox" name="advance"/> Move the clock by the weeks (a player asks the Storyteller)</label></div>
          <p class="vta-note wodx-dt-note"></p></form>`;
        const sync = root => {
            const r = rows.find(x => x.k === root.querySelector("[name=kind]").value);
            if (!r) return;
            root.querySelector("[name=diff]").value = r.d.diff;
            root.querySelector(".wodx-dt-note").textContent = `${r.d.note} [WoDX]`;
        };
        return dialog(`Downtime: ${actor.name}`, content, "Roll", async fd => {
            const r = rows.find(x => x.k === fd.kind);
            const g = fd.from !== "own" ? game.actors.get(fd.from) : null;
            const dots = g ? pooled(g, r.d.bg) : r.own;
            if (!dots) return ctx.notify(`No ${r.d.bg} dots ${g ? `in ${g.name}'s pool` : "on the sheet"}.`);
            let body = "", rolls = [], total = 0;
            for (let w = 1; w <= Math.max(1, n(fd.weeks)); w++) {
                const rr = await rollPool(dots, fd.diff);
                rolls.push(rr.roll);
                body += rollBlock(`${r.d.bg}${g ? ` (${esc(g.name)})` : ""}${n(fd.weeks) > 1 ? `, week ${w}` : ""}`, rr);
                const res = K.downtimeResult(r.k, rr.successes, rr.botch);
                body += `<div class="vta-res ${res.ok ? "good" : "bad"}">${esc(res.text)}</div>`;
                if (res.ok) total += rr.successes;
                if (rr.botch) break;
            }
            body += `<div class="vta-note">${esc(r.d.note)} <span class="wodx-quiet">[WoDX]</span></div>`;
            if (r.k === "herd" && total && ctx.isVampire(actor)) {
                const ch = await ctx.changeBlood(actor, total);
                body += `<div class="vta-res good">Blood ${ch.before} → ${ch.after}</div>`;
            }
            if (fd.advance) body += await spendTime(actor, 7 * 86400 * Math.max(1, n(fd.weeks)), "downtime");
            await logEvent(actor, `Downtime: ${r.d.label.toLowerCase()}, ${total} success${total === 1 ? "" : "es"}.`, "downtime");
            return post(actor, `${actor.name}: ${esc(r.d.label)}`, body, rolls);
        }, { render: root => { sync(root); root.querySelector("[name=kind]").addEventListener("change", () => sync(root)); } });
    }

    /* ---------------- Masquerade and witnesses ---------------- */

    async function writeMasq(entries) {
        const j = await MASQJ.ensure();
        await j.setFlag(MOD, "entries", entries);
        const row = e => `<tr><td>${esc(e.date)}</td><td>${esc(e.by)}</td><td>${esc(e.event)}</td><td>${e.witnesses.map(w => `${esc(w.name)}: ${esc(K.WITNESS_STATES[w.state] ?? w.state)}${w.note ? ` (${esc(w.note)})` : ""}`).join("<br>")}</td></tr>`;
        const head = "<tr><th>When</th><th>Who</th><th>What</th><th>Witnesses</th></tr>";
        const openE = entries.filter(e => e.witnesses.some(w => ["saw", "told"].includes(w.state)));
        await j.pages.getName("Open breaches")?.update({ "text.content": openE.length ? `<table>${head}${openE.map(row).join("")}</table>` : "<p>No witness is left who remembers.</p>" });
        await j.pages.getName("All records")?.update({ "text.content": entries.length ? `<table>${head}${entries.map(row).join("")}</table>` : "<p></p>" });
    }
    /** Record a breach: {by: actor, event: text, witnesses: [actors], secret?, place?} (GM; players' records go through the GM).
     *  Witnesses of another kind are startled, not breach witnesses; those who already know are left out (3.42.0). */
    async function recordBreach({ by, event, witnesses, secret = null, place = undefined }) {
        if (!witnesses?.length) return null;
        if (!game.user.isGM) { ctx.requestGM?.({ action: "kx", op: "breach", by: by?.uuid, event, witnesses: witnesses.map(w => w.uuid), secret }); return null; }
        const byActor = by?.documentName === "Actor" || by?.system ? by : null;
        const sec = secret ?? (byActor ? WR.secretOf(P.detectProfile(byActor)) : null) ?? "kindred";
        const sorted = WR.sortOnlookers(sec, witnesses.map(w => onlookerOf(w)));
        if (sorted.startled.length) await startledCard(byActor ?? by, sec, sorted.startled.map(o => o.actor), event);
        if (!sorted.breach.length) return null;
        const where = place === undefined ? placeOf(byActor?.getActiveTokens?.()[0]) : place;
        const mode = WR.placeMode(where);
        const list = MASQJ.entries();
        list.push({ id: foundry.utils.randomID(), date: (await clockNow()).dateLabel, by: by?.name ?? "?", byUuid: by?.uuid ?? null, event,
            witnesses: sorted.breach.map(o => ({ name: o.actor.name, uuid: o.actor.uuid, state: "saw" })), secret: sec, mode, spread: WR.spreads(mode) });
        await writeMasq(list);
        if (by) await logEvent(by, `Seen by ${sorted.breach.map(o => o.actor.name).join(", ")}: ${event}.`, "masquerade");
        // WoDX NPC (7d) follows a recorded breach as a rumour, unless the place keeps it (entry.spread false)
        Hooks.callAll("wodxBreach", { entry: list.at(-1), by: by?.uuid ? { uuid: by.uuid, name: by.name } : null });
        return list.at(-1);
    }
    /** A witness's state in every open record (e.g. made to forget). Returns how many records changed. */
    async function setWitnessState(witness, state, note = "") {
        if (!game.user.isGM) { ctx.requestGM?.({ action: "kx", op: "witness", uuid: witness.uuid, state, note }); return null; }
        const list = MASQJ.entries();
        let count = 0;
        for (const e of list) for (const w of e.witnesses) if ((w.uuid === witness.uuid || w.name === witness.name) && ["saw", "told"].includes(w.state)) { w.state = state; w.note = note; count++; }
        if (count) await writeMasq(list);
        return count;
    }

    async function masquerade(actor = null) {
        if (!game.user.isGM) return ctx.notify("The Storyteller keeps the Masquerade records.");
        const list = MASQJ.entries();
        const targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);
        const open = [];
        list.forEach((e, i) => e.witnesses.forEach((w, j) => { if (["saw", "told"].includes(w.state)) open.push([`${i}:${j}`, `${w.name} saw ${e.by}: ${e.event}`]); }));
        const content = `<form>
          <fieldset><legend>Record what was seen</legend>
            <div class="form-group"><label>Who was seen</label><input type="text" name="by" value="${esc(actor?.name ?? "")}"/></div>
            <div class="form-group"><label>What</label><input type="text" name="event" placeholder="fed in the open, used a Discipline, walked away from a killing blow…"/></div>
            <p class="vta-note">Witnesses: the targeted tokens (${targets.length ? targets.map(t => esc(t.name)).join(", ") : "none targeted"}).</p></fieldset>
          <fieldset><legend>Or update a witness (${open.length} still remember)</legend>
            ${open.length > 5 ? searchBox("select[name=w]", "Search witnesses…", "Search witnesses") : ""}
            <div class="form-group"><select name="w"><option value="">— none —</option>${open.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>
            <div class="form-group"><label>Now</label><select name="state">${Object.entries(K.WITNESS_STATES).filter(([k]) => k !== "saw").map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
            <div class="form-group"><label>Note</label><input type="text" name="note"/></div></fieldset></form>`;
        return dialog("Masquerade", content, "Record", async fd => {
            if (fd.w) {
                const [i, j] = String(fd.w).split(":").map(Number);
                const L = MASQJ.entries();
                if (L[i]?.witnesses[j]) { L[i].witnesses[j].state = fd.state; L[i].witnesses[j].note = fd.note || ""; await writeMasq(L); }
                return ChatMessage.create({ content: `<div class="vta-card"><h3>Masquerade</h3><p>${esc(L[i]?.witnesses[j]?.name)}: ${esc(K.WITNESS_STATES[fd.state])}.</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
            }
            if (!targets.length) return ctx.notify("Target the witnesses first.");
            const by = game.actors.getName(fd.by) ?? { name: fd.by || "?", uuid: null };
            const ev = fd.event || "something no mortal should see";
            const entry = await recordBreach({ by, event: ev, witnesses: targets });
            if (!entry) return ChatMessage.create({ content: `<div class="vta-card"><h3>Masquerade</h3><p>None of them is a mortal who doesn't know: nothing is recorded as a breach.</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
            const note = WR.placeNote(entry.mode, entry.secret, ev);
            return ChatMessage.create({ content: `<div class="vta-card"><h3>Masquerade</h3><p>${esc(by.name)} seen by ${entry.witnesses.map(w => esc(w.name)).join(", ")}.</p>${note ? `<p>${esc(note)}</p>` : ""}<p class="wodx-quiet">Journal: WoDX Masquerade</p></div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
        }, { width: 520 });
    }

    /** Living tokens that can see a token now: in range, not blocked by sight walls, and the kind who'd remember. */
    function witnessesOf(tokenLike, { range = null, profiles = K.WITNESS_PROFILES, exclude = [] } = {}) {
        const tok = tokenLike?.object ?? tokenLike;
        if (!tok?.center || !canvas?.tokens) return [];
        const maxFt = range ?? (n(setting("witnessRange")) || 60);
        const grid = canvas.scene?.grid ?? canvas.grid;
        const px = (grid?.size ?? 100) / (grid?.distance ?? 5);
        const out = [];
        for (const t of canvas.tokens.placeables) {
            if (t === tok || t.document?.hidden || !t.actor || exclude.includes(t.actor.isToken ? t.document.id : t.actor.id)) continue;
            if (t.document?.flags?.["wodx-npc"]?.passerby?.animal) continue; // an animal in the street is no witness (WoDX NPC 0.27.0)
            if (!profiles.includes(P.detectProfile(t.actor))) continue;
            if (Math.hypot(t.center.x - tok.center.x, t.center.y - tok.center.y) > maxFt * px) continue;
            let blocked = false;
            try { blocked = !!CONFIG.Canvas.polygonBackends.sight.testCollision(t.center, tok.center, { type: "sight", mode: "any" }); } catch (e) { blocked = false; }
            if (!blocked) out.push(t);
        }
        return out;
    }

    /** An onlooker as the witness rules see it, from a token or an actor. */
    function onlookerOf(x) {
        const actor = x?.actor ?? x;
        return { actor, tok: x?.actor ? x : null, profile: P.detectProfile(actor), knows: P.worldFlag(actor, "knows") ?? null, kinfolk: !!P.worldFlag(actor, "kinfolk") };
    }
    /** The place a token stands in: a WoDX NPC region tag, else the scene's ({kind, masq, uuid}) or null. */
    function placeOf(tokenLike) {
        const tok = tokenLike?.object ?? tokenLike;
        const doc = tok?.document ?? tokenLike;
        const scene = doc?.parent ?? canvas?.scene;
        const tag = d => { const f = d?.flags?.["wodx-npc"]?.place; return f && (f.kind || f.masq) ? { kind: f.kind ?? "", masq: f.masq ?? "", uuid: d.uuid } : null; };
        for (const r of doc?.regions ?? []) { const t = tag(r); if (t) return t; }
        return tag(scene);
    }
    /** Everyone who can see a token, sorted by what the act shows (3.42.0): {secret, breach, startled, calm} as tokens, plus the place and its mode. */
    function observersOf(tokenLike, { secret = null, range = null, exclude = [] } = {}) {
        const tok = tokenLike?.object ?? tokenLike;
        const sec = secret ?? WR.secretOf(P.detectProfile(tok?.actor));
        const seers = witnessesOf(tok, { range, exclude, profiles: Object.keys(WR.KNOWS) });
        const s = WR.sortOnlookers(sec, seers.map(onlookerOf));
        const place = placeOf(tok), mode = WR.placeMode(place);
        return { secret: sec, breach: s.breach.map(o => o.tok), startled: s.startled.map(o => o.tok), calm: s.calm.map(o => o.tok), place, mode };
    }
    /** A card for the Storyteller: creatures of another kind saw what this one is. */
    async function startledCard(by, secret, actors, event = "") {
        const list = actors.filter(Boolean);
        if (!list.length || !isActiveGM()) return null;
        const what = WR.SECRETS[secret] || "something they did not know of";
        Hooks.callAll("wodxSecretSeen", { by: by?.uuid ? { uuid: by.uuid, name: by.name } : null, secret, seen: list.map(a => ({ uuid: a.uuid, name: a.name, profile: P.detectProfile(a) })), event });
        if (by?.uuid) await logEvent(by, `${list.map(a => a.name).join(", ")} saw what ${by.name} is${event ? ` (${event})` : ""}.`, "masquerade");
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Seen by another kind</h3><p>${list.map(a => `${esc(a.name)} (${esc(P.PROFILES[P.detectProfile(a)]?.label ?? "")})`).join(", ")} saw ${esc(by?.name ?? "someone")}${event ? `: ${esc(event)}` : ""}.</p>
            <p>No mortal rumour comes of it, but they now know ${esc(what)} is here. How they take it is yours to play.</p>
            ${by?.uuid ? kbtn("knows", by, "They know this kind from now on", `${secret}|${list.map(a => a.uuid).join(",")}`) : ""}</div>`,
            whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }
    /**
     * An act that may show what someone is (3.42.0): finds who can see it, then tells the Storyteller who would breach
     * the Masquerade (with a button to record them) and who of another kind is startled. ask: the act may not have
     * shown at all (a Discipline), so the card asks rather than tells.
     */
    async function revealed(actor, { secret = null, event = "", ask = false, startledOnly = false } = {}) {
        if (!isActiveGM() || !actor) return null;
        const tok = actor.getActiveTokens?.()[0];
        if (!tok) return null;
        const o = observersOf(tok, { secret, exclude: [actor.id] });
        if (!o.secret) return o;
        const seenSet = new Set(canvas.scene?.getFlag?.(MOD, `startled.${actor.id}`) ?? []);
        const fresh = o.startled.filter(t => !seenSet.has(t.actor.id));
        if (fresh.length && !ask) {
            await canvas.scene?.setFlag?.(MOD, `startled.${actor.id}`, [...seenSet, ...fresh.map(t => t.actor.id)]);
            await startledCard(actor, o.secret, fresh.map(t => t.actor), event);
        }
        const note = WR.placeNote(o.mode, o.secret, event);
        if (!startledOnly && (o.breach.length || (ask && o.startled.length))) {
            const ev = String(event || "something no mortal should see").replace(/\|/g, "/");
            const names = t => t.map(x => esc(x.name)).join(", ");
            let html = ask ? `<p>If it showed, ${o.breach.length ? `${names(o.breach)} would see it.` : ""}${o.startled.length ? ` ${names(o.startled)} (another kind) would be startled.` : ""}</p>`
                : `<p class="vta-warn">Masquerade: ${names(o.breach)} can see this.</p>`;
            if (note) html += `<p>${esc(note)}</p>`;
            const all = [...o.breach, ...(ask ? o.startled : [])];
            html += kbtn("seen", actor, ask ? "It showed: record who saw" : "Record the witnesses", `${o.secret}|${ev}|${all.map(t => t.actor.uuid).join(",")}`);
            await ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(actor.name)}: ${esc(ev)}</h3>${html}</div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
        }
        return o;
    }

    /* ---------------- Prompts ---------------- */

    const kbtn = (k, actor, label, arg = "") => `<button type="button" class="vta-btn" data-kx="${k}" data-actor="${esc(actor?.uuid ?? "")}" data-arg="${esc(arg)}">${esc(label)}</button>`;
    async function prompt(actor, title, html, { gmOnly = false } = {}) {
        return ChatMessage.create({ content: `<div class="vta-card"><h3>${esc(title)}</h3>${html}</div>`, whisper: gmOnly ? gmIds() : ownerIds(actor),
            speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /**
     * Damage landed. source "sheet" (any change to the health track): wound provocations, torpor, rising on Rage.
     * source "combat" (WoDX Combat applied a card): fire or sunlight → Rötschreck; a mortal killed by a Cainite → sin.
     */
    async function onDamage(actor, { before, after, fireSun = false, attacker = null, source = "sheet" } = {}) {
        if (!isActiveGM() || !actor || !setting("eventPrompts")) return null;
        const kind = P.detectProfile(actor);
        const bits = [];
        const total = d => n(d?.bashing) + n(d?.lethal) + n(d?.aggravated);
        if (source === "sheet") {
            if (total(after) <= total(before)) return null;
            if (kind === "kindred" && !actor.getFlag(MOD, "torpor")) {
                const prov = K.woundProvocation(before, after);
                if (prov && !actor.system?.conditions?.isfrenzy) bits.push(`<p>${prov === "lifethreat" ? "Their existence is in danger" : "A grievous wound"}: the Beast stirs (VtDA20 p. 357).</p>${kbtn("frenzy", actor, "Frenzy check", prov)}`);
                const t = ctx.healthTrack(actor);
                const cond = ctx.R.condition(after, t.max, "vampire");
                if (cond.key === "torpor" && setting("autoTorpor")) await enterTorpor(actor, { cause: "wounds" });
            }
            if (kind === "lupine") {
                const t = ctx.healthTrack(actor);
                if (total(after) >= t.max && total(before) < t.max && n(after.aggravated) < t.max) bits.push(`<p>Beyond Incapacitated: Rage can keep the shapechanger on their feet once a scene.</p>${kbtn("riseRage", actor, "Rise on Rage")}`);
            }
        } else {
            if (kind === "kindred" && fireSun && !actor.getFlag(MOD, "torpor")) bits.push(`<p>Burned by fire or sun: Rötschreck (VtDA20 p. 357).</p>${kbtn("rotschreck", actor, "Rötschreck check", "burned")}`);
            if (attacker && ["mortal", "hunter", "mage", "beast", "ghoul"].includes(kind)) {
                const t = ctx.healthTrack(actor);
                const dead = n(after?.lethal) + n(after?.aggravated) >= t.max && n(before?.lethal) + n(before?.aggravated) < t.max;
                const doc = dead ? await fromUuid(attacker) : null;
                const killer = doc?.actor ?? doc;
                if (killer && P.detectProfile(killer) === "kindred") {
                    await logEvent(killer, `Kills ${actor.name}${killer.system?.conditions?.isfrenzy ? " in frenzy" : ""}.`, "kill");
                    await sinPrompt(killer, killer.system?.conditions?.isfrenzy ? "killFrenzy" : "kill", `${actor.name} is killed`);
                }
            }
        }
        if (bits.length) return prompt(actor, actor.name, bits.join(""));
        return null;
    }

    /** Blood changes: under the hunger line, a prompt; at 0 a ravenous warning. */
    async function onBlood(actor, before, after) {
        if (!isActiveGM() || !setting("eventPrompts") || P.detectProfile(actor) !== "kindred" || actor.getFlag(MOD, "torpor")) return null;
        const sc = n(actor.system?.advantages?.virtues?.selfcontrol?.permanent);
        if (K.hungerCrossed(before, after, sc)) return prompt(actor, `${actor.name} hungers`, `<p>Blood ${after}, under ${7 - sc}: the sight, smell or taste of blood can drive ${esc(actor.name)} to frenzy (V20 Dark Ages p. 357).</p>${kbtn("frenzy", actor, "Frenzy check (sight of blood)", "sightblood")}`);
        if (n(after) === 0 && n(before) > 0) return prompt(actor, `${actor.name} is empty`, `<p>No blood left: ${esc(actor.name)} is ravenous; hunger frenzy is likely, and they can't rise without blood (V20 Dark Ages p. 340).</p>${kbtn("frenzy", actor, "Frenzy check (hunger)", "hunger")}`);
        return null;
    }

    /** A sin prompt with the Road's suggested level (event: kill, killFrenzy, diablerie, frenzy, notRidden). */
    async function sinPrompt(actor, event, what) {
        if (!setting("eventPrompts")) return null;
        const found = roadOf(actor);
        const level = K.sinForEvent(found, event);
        const rating = n(actor.system?.advantages?.path?.permanent);
        if (level === null) return null;
        const sinText = K.sinAt(K.hierarchyOf(found), level);
        const roll = level <= rating;
        const html = `<p>${esc(what)}. On ${esc(found?.path?.name ?? found?.road?.name ?? "the Road")} this is a level ${level} sin${sinText ? ` (“${esc(sinText)}”)` : ""}${roll ? "" : `, beyond the rating of ${rating}: no roll`}.</p>${roll ? kbtn("sin", actor, `Degeneration roll (level ${level})`, `${level}|${what}`) : ""}`;
        if (isActiveGM()) return prompt(actor, `${actor.name}: a sin?`, html);
        return { html, level };
    }

    async function enterTorpor(actor, { cause = "wounds", voluntary = false } = {}) {
        if (actor.getFlag(MOD, "torpor")) return null;
        const rd = n(actor.system?.advantages?.path?.permanent);
        const tl = ctx.R.torporLength(rd);
        const until = K.torporUntil(game.time.worldTime, rd, { voluntary });
        await ctx.setFlag(actor, "torpor", { since: game.time.worldTime, days: tl.days, voluntary, until, cause });
        await ctx.statusEffect(actor, "unconscious", true); await ctx.condition(actor, "torpor", true);
        const when = await clockNow(until);
        await logEvent(actor, `Sinks into torpor (${cause}) for ${tl.text.toLowerCase()}.`, "torpor");
        return prompt(actor, `${actor.name} sinks into torpor`, `<p>${esc(tl.text)} at Road ${rd}${voluntary ? " (voluntary: half)" : ""}. ${esc(actor.name)} may try to rise on <b>${esc(when.dateLabel || "the date")}</b>; WoDX will remind you.</p>`);
    }

    /* ---------------- The clock: healing, dawn and dusk, torpor ---------------- */

    let clockBusy = false;
    async function onClock({ force = false } = {}) {
        if (!isActiveGM() || clockBusy) return null;
        clockBusy = true;
        try {
            const now = game.time.worldTime;
            const last = game.settings.get(MOD, "healClock");
            if (last < 0 || last > now) { await game.settings.set(MOD, "healClock", now); }
            else if (now - last >= 60 && setting("naturalHealing")) { await healAll(now - last); await game.settings.set(MOD, "healClock", now); }
            await torporReminders(now);
            const t = await clockNow(now);
            if (t.isNight !== null) {
                const was = game.settings.get(MOD, "sunState");
                const ch = K.sunChange(was === "" ? null : was === "night", t.isNight);
                if (ch || was === "") await game.settings.set(MOD, "sunState", t.isNight ? "night" : "day");
                if (ch && setting("dawnDusk") !== "off") await (ch === "dawn" ? dawn(t) : dusk(t));
            }
        } catch (e) { console.error("WoDX | clock", e); }
        finally { clockBusy = false; }
        return true;
    }

    function clockActors() {
        const onScene = new Set((game.scenes?.active?.tokens ?? []).map(t => t.actor).filter(Boolean));
        return [...new Set([...onScene, ...game.actors.filter(a => a.type !== "Group" && a.hasPlayerOwner)])];
    }

    /** Heal everyone the clock covers over `seconds` (also run by Pass the Years through the time skip). */
    async function healAll(seconds) {
        const lines = [];
        for (const a of clockActors()) {
            const r = await healOne(a, seconds);
            if (r) lines.push(r);
        }
        if (lines.length) await ChatMessage.create({ content: `<div class="vta-card"><h3>Healing with time</h3><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul><p class="wodx-quiet">Mortals VtDA20 p. 352; shapechangers regenerate (DA:W p. 102, W20 p. 256)</p></div>`,
            whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } } });
        return lines;
    }
    /** Plan of healing over time for one actor (no change): {healed, damage, carry, needsCare} or null. */
    function healPlan(a, seconds) {
        const kind = P.detectProfile(a);
        const dmg = a.system?.health?.damage ?? {};
        if (!(n(dmg.bashing) + n(dmg.lethal) + n(dmg.aggravated))) return null;
        const carry = n(a.getFlag(MOD, "healCarry"));
        const treated = !!a.getFlag(MOD, "treated");
        if (["mortal", "hunter", "mage", "beast", "ghoul", "fae"].includes(kind)) return K.mortalHealing(dmg, seconds, { carry, treated });
        if (kind === "lupine") {
            const i = GX.info(a);
            const reg = G.regeneration({ breed: i.breed, form: i.form, fera: i.fera });
            return K.shifterHealing(dmg, seconds, { regen: reg.regen, carry, treated });
        }
        return null;
    }
    async function healOne(a, seconds) {
        const plan = healPlan(a, seconds);
        if (!plan || !a.isOwner) return null;
        const got = Object.entries(plan.healed).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`);
        if (n(a.getFlag(MOD, "healCarry")) !== n(plan.carry)) await a.setFlag(MOD, "healCarry", plan.carry);
        if (got.length) await ctx.setDamage(a, plan.damage);
        if (!got.length && !plan.needsCare) return null;
        return `<b>${esc(a.name)}</b>: ${got.length ? `heals ${got.join(", ")}` : "no change"}${plan.needsCare ? "; <i>lethal wounds past Hurt need care to heal (tick “treated” in WoDX Actions → Healing)</i>" : ""}`;
    }

    async function torporReminders(now) {
        for (const a of game.actors.filter(x => x.type !== "Group" && x.getFlag(MOD, "torpor"))) {
            const t = a.getFlag(MOD, "torpor");
            const until = t.until ?? K.torporUntil(t.since ?? 0, n(a.system?.advantages?.path?.permanent), { voluntary: t.voluntary, days: t.days });
            if (now >= until && !t.reminded) {
                await a.setFlag(MOD, "torpor", { ...t, until, reminded: true });
                await prompt(a, `${a.name} may rise`, `<p>The torpor's time has passed. Rising costs a blood point and a Road roll (8).</p>${kbtn("torpor", a, "Attempt to rise")}`);
            }
        }
    }

    async function dawn(t) {
        const vamps = clockActors().filter(a => P.detectProfile(a) === "kindred" && !a.getFlag(MOD, "torpor"));
        if (!vamps.length) return null;
        const rows = [];
        const api = ctx.api();
        const sunInfo = await api.sunNow?.();
        for (const a of vamps) {
            const toks = a.getActiveTokens?.() ?? [];
            // The sunlight system (3.3) decides; without it, regions named sunlit or a scene marked outdoors
            const sun = toks.some(tk => api.sunExposure ? api.sunExposure(tk, sunInfo)?.exposed : sunlit(tk));
            rows.push(`<li><b>${esc(a.name)}</b>${sun ? ": <b>in the open, where the sun will burn them</b>" : ""} ${kbtn("stayAwake", a, "Stay awake (Road, 8)")}${sun ? kbtn("sun", a, "Sunlight") : ""}</li>`);
        }
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Dawn: ${esc(t.timeLabel ?? "")}</h3><p>Sunrise. Cainites sleep unless the Road holds them up (each success a turn, five the scene; VtDA20 pp. 336, 359).</p><ul>${rows.join("")}</ul></div>`,
            whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }
    async function dusk(t) {
        const auto = setting("dawnDusk") === "auto";
        const html = [`<p>Sunset${t.timeLabel ? ` at ${esc(t.timeLabel)}` : ""}: Cainites rise (Road 7+ just before, 4 or less up to an hour after; VtDA20 p. 113).</p>`];
        if (auto) await ctx.api().newNight({});
        else html.push(kbtn("newNight", null, "Run New Night"));
        // B3563: the hour each one rises, by Humanity, Road or Path (V20 p. 311, V20 Dark Ages p. 113)
        const risers = clockActors().filter(a => P.detectProfile(a) === "kindred" && !a.getFlag(MOD, "torpor"));
        const dmk = ctx.api().debtsMarks?.();
        if (risers.length && dmk) html.push(`<p>Rising: ${dmk.riseLines(risers).join("; ")}.</p>`);
        try { await dmk?.soulCards?.(); } catch (e) { console.warn("WoDX | diablerie", e); }
        const heal = clockActors().filter(a => P.detectProfile(a) === "kindred" && !a.getFlag(MOD, "torpor") && (n(a.system?.health?.damage?.bashing) + n(a.system?.health?.damage?.lethal)));
        if (heal.length) html.push(`<p>Wounded on rising:</p><ul>${heal.map(a => `<li>${esc(a.name)} ${kbtn("riseHeal", a, "Heal with blood")}</li>`).join("")}</ul>`);
        return ChatMessage.create({ content: `<div class="vta-card"><h3>Nightfall</h3>${html.join("")}</div>`, whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }
    /** Heal bashing and lethal with blood on rising, keeping blood at the hunger line. */
    async function riseHeal(actor) {
        const b = ctx.blood(actor), dmg = ctx.healthTrack(actor).damage;
        const plan = K.risingHeal(dmg, b.value, n(actor.system?.advantages?.virtues?.selfcontrol?.permanent), ctx.R.planHealing);
        if (!plan.spent) return post(actor, `${actor.name} rises`, `<div class="vta-note">No blood to spare above the hunger line: ${esc(actor.name)} rises hurt.</div>`);
        await ctx.setDamage(actor, { ...plan.after });
        const ch = await ctx.changeBlood(actor, -plan.spent);
        return post(actor, `${actor.name} heals on rising`, `<div class="vta-sec">Heals ${plan.healed.lethal} lethal and ${plan.healed.bashing} bashing: blood ${ch.before} → ${ch.after}. Now ${ctx.healthText(actor, plan.after)}.</div>`);
    }

    /** Is a token in sunlight? Scene marked outdoors (WoDX Actions scene flag) and not in a region named shade/shelter/indoors, or in a region named sunlit. */
    function sunlit(token) {
        const doc = token?.document ?? token;
        const scene = doc?.parent;
        const regions = [...(doc?.regions ?? [])].map(r => String(r.name ?? "").toLowerCase());
        if (regions.some(r => /sunlit|open sky|daylight/.test(r))) return true;
        if (regions.some(r => /shade|shelter|indoors|haven|under/.test(r))) return false;
        return scene?.getFlag?.(MOD, "light") === "outdoors";
    }

    async function stayAwake(actor) {
        const rd = n(actor.system?.advantages?.path?.permanent);
        const r = await rollPool(rd, 8);
        const res = ctx.R.awakeningResult(r);
        let body = rollBlock(`Road ${rd}`, r) + `<div class="vta-big ${res.awake ? "good" : "bad"}">${esc(res.text)}</div>`;
        if (res.awake) { await ctx.setFlag(actor, "daytime", { turns: res.turns === Infinity ? "scene" : res.turns }); body += `<div class="vta-note">By day no pool may exceed the Road rating (${rd}).</div>`; }
        return post(actor, `${actor.name} fights the dawn`, body, [r.roll]);
    }

    /* ---------------- The Delirium, automatically ---------------- */

    async function crinosSeen(tokenLike) {
        if (!isActiveGM() || !setting("autoDelirium")) return null;
        const tok = tokenLike?.object ?? tokenLike;
        const a = tok?.actor;
        if (!a || !GX.isShifter(a)) return null;
        const form = GX.info(a).form;
        if (form !== "crinos") return null;
        const seen = new Set(canvas.scene?.getFlag?.(MOD, `delirium.${a.id}`) ?? []);
        // Creatures of another kind who see the Crinos are startled (3.42.0); the Delirium below is for the mortals
        await revealed(a, { secret: "lupine", event: "in Crinos", startledOnly: true });
        const w = witnessesOf(tok, { profiles: ["mortal", "hunter", "beast"] }).filter(t => !seen.has(t.actor.isToken ? t.document.id : t.actor.id) && !P.worldFlag(t.actor, "kinfolk") && P.worldFlag(t.actor, "knows") !== "*" && !(P.worldFlag(t.actor, "knows") ?? []).includes?.("lupine"));
        if (!w.length) return null;
        await canvas.scene.setFlag(MOD, `delirium.${a.id}`, [...seen, ...w.map(t => (t.actor.isToken ? t.document.id : t.actor.id))]);
        const ids = w.map(t => t.document.uuid).join(",");
        return ChatMessage.create({ content: `<div class="vta-card"><h3>The Delirium</h3><p>${w.map(t => esc(t.name)).join(", ")} can see ${esc(a.name)} in Crinos.</p>${kbtn("delirium", a, "Run the Delirium for them", ids)}</div>`,
            whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- Buttons and socket ---------------- */

    async function onChatButton(b) {
        const k = b.dataset.kx, arg = b.dataset.arg ?? "";
        const doc = b.dataset.actor ? await fromUuid(b.dataset.actor) : null;
        const a = doc?.actor ?? doc;
        const api = ctx.api();
        if (k === "newNight") { if (!game.user.isGM) return ctx.notify("The Storyteller runs New Night."); return api.newNight({}); }
        if (k === "delirium") { const toks = []; for (const u of arg.split(",").filter(Boolean)) { const d = await fromUuid(u); if (d) toks.push(d); } return api.delirium({ tokens: toks }); }
        if (!a) return ctx.notify("That character is gone.");
        if (!(a.isOwner || game.user.isGM)) return ctx.notify("Only the character's owner or the GM can do that.");
        switch (k) {
            case "frenzy": return api.frenzy({ actor: a, provocation: arg || "physical" });
            case "rotschreck": return api.rotschreck({ actor: a, provocation: arg || "burned" });
            case "sin": { const [lvl, ...what] = arg.split("|"); return api.sin({ actor: a, level: n(lvl), desc: what.join("|") }); }
            case "torpor": return api.torpor({ actor: a });
            case "riseRage": return api.remainActive({ actor: a });
            case "stayAwake": return stayAwake(a);
            case "sun": return api.hazard({ actor: a, kind: "sun" });
            case "riseHeal": return riseHeal(a);
            case "seen": {
                const [sec, ev, list = ""] = arg.split("|");
                const ws = []; for (const u of list.split(",").filter(Boolean)) { const d = await fromUuid(u); const x = d?.actor ?? d; if (x) ws.push(x); }
                return recordBreach({ by: a, event: ev, witnesses: ws, secret: sec || null });
            }
            case "knows": {
                if (!game.user.isGM) return ctx.notify("The Storyteller decides who knows.");
                const [sec, list = ""] = arg.split("|");
                for (const u of list.split(",").filter(Boolean)) {
                    const d = await fromUuid(u); const x = d?.actor ?? d;
                    if (!x || x.isToken) continue; // a passer-by or other unlinked token shares its actor: leave it
                    const cur = P.worldFlag(x, "knows"); if (cur === "*") continue;
                    const next = [...new Set([...(Array.isArray(cur) ? cur : []), sec])];
                    await P.setWorldFlag(x, "knows", next);
                }
                return ctx.notify("Noted: they know this kind now.");
            }
            case "witnesses": { const ws = []; for (const u of arg.split(",").filter(Boolean)) { const d = await fromUuid(u); const x = d?.actor ?? d; if (x) ws.push(x); } return recordBreach({ by: a, event: "seen feeding", witnesses: ws }); }
        }
        return null;
    }
    async function onSocket(p) {
        const doc = p.uuid ? await fromUuid(p.uuid) : null;
        const a = doc?.actor ?? doc;
        if (p.op === "history" && a) return logEvent(a, p.text, p.kind);
        if (p.op === "witness" && a) return setWitnessState(a, p.state, p.note);
        if (p.op === "breach") {
            const by = p.by ? await fromUuid(p.by) : null;
            const ws = []; for (const u of p.witnesses ?? []) { const d = await fromUuid(u); const x = d?.actor ?? d; if (x) ws.push(x); }
            return recordBreach({ by: by?.actor ?? by, event: p.event, witnesses: ws, secret: p.secret ?? null });
        }
        return null;
    }

    /** Healing menu: mark a mortal's wounds as treated, see the plan, heal now. */
    async function healing(actor) {
        const plan = healPlan(actor, 86400);
        const treated = !!actor.getFlag(MOD, "treated");
        const content = `<form><p><b>${esc(actor.name)}</b>: ${ctx.healthText(actor, ctx.healthTrack(actor).damage)}.</p>
          <p class="vta-note">${plan ? `In a day: ${Object.entries(plan.healed).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing yet"}${plan.next ? `; the next level in ${Math.ceil(plan.next / 3600)} hours` : ""}.` : "This character doesn't heal with time (Cainites heal with blood)."} The clock heals automatically as it advances.</p>
          <div class="form-group"><label><input type="checkbox" name="treated" ${treated ? "checked" : ""}/> Under a healer's care (lethal wounds past Hurt can heal; VtDA20 p. 352)</label></div></form>`;
        return dialog(`Healing: ${actor.name}`, content, "Save", async fd => {
            await ctx.setFlag(actor, "treated", fd.treated ? true : null);
            return post(actor, `${actor.name}`, `<div class="vta-note">${fd.treated ? "In a healer's care." : "No longer in care: lethal wounds past Hurt won't heal (and may worsen a level a day)."}</div>`);
        });
    }

    return { prestationJournal: () => BOONJ.ensure(), useDiscipline, setRoad, roadOf, boons, downtime, masquerade, recordBreach, setWitnessState, witnessesOf, observersOf, revealed, placeOf, logEvent, sinPrompt,
        enterTorpor, onDamage, onBlood, onClock, healAll, healPlan, healing, riseHeal, stayAwake, crinosSeen, sunlit, onChatButton, onSocket, targetTraits, poolOf, hierarchyTable };
}

/** Settings this part adds (registered by main.js). */
export function registerSettings(register) {
    register("naturalHealing", "Heal with the clock", "As the Chronicle clock advances, mortals and ghouls heal by the chart (VtDA20 p. 352) and shapechangers regenerate; a whispered card lists it.", Boolean, true);
    register("eventPrompts", "Prompts from what happens", "Whispered cards with a button when a wound, fire, sunlight or hunger provokes the Beast, a killing may be a sin, or a shapechanger falls below Incapacitated.", Boolean, true);
    register("autoTorpor", "Torpor from wounds", "A Cainite whose health track fills with lethal damage sinks into torpor for as long as their Road sets, with a reminder on the date they may rise (VtDA20 p. 350).", Boolean, true);
    register("autoDelirium", "The Delirium when a Crinos is seen", "When a shapechanger in Crinos moves or changes where mortal tokens can see it, the GM gets a card to run the Delirium for them.", Boolean, true);
    register("historyLog", "History journal", "Write sins, frenzies, oaths, diablerie, torpor, Renown, boons and downtime to a page per character in \"WoDX History\".", Boolean, true);
    register("witnessAsk", "Ask who saw a Discipline", "After a Discipline is used where mortals or other kinds can see, the Storyteller gets a card asking whether it showed, with a button to record who saw.", Boolean, true);
    register("witnessRange", "Witness range (feet)", "How far a mortal token can see a feeding, a Discipline or a Crinos for the witness checks (walls block sight).", Number, 60);
    game.settings.register(MOD, "dawnDusk", { name: "Dawn and dusk", hint: "At sunrise and sunset on the Chronicle clock: a card with buttons (stay awake, sunlight, New Night, heal on rising), New Night run automatically at dusk, or nothing.",
        scope: "world", config: true, type: String, default: "prompt", choices: { prompt: "Cards with buttons", auto: "New Night automatically at dusk", off: "Off" } });
    game.settings.register(MOD, "willpowerRecovery", { name: "Willpower recovery", hint: "One point a night (New Night), or all of it at the end of a story (End of story), or no automatic recovery.",
        scope: "world", config: true, type: String, default: "night", choices: { night: "One a night (and all at a story's end)", story: "All at the end of a story only", off: "Off" } });
    game.settings.register(MOD, "healClock", { scope: "world", config: false, type: Number, default: -1 });
    game.settings.register(MOD, "sunState", { scope: "world", config: false, type: String, default: "" });
}
