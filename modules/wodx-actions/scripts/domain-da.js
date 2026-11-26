/**
 * WoDX Actions: building a domain, the V20 Dark Ages Companion chapter 7 (B7679-B7684), the Foundry side;
 * domain-da-rules.js holds the rules.
 *
 *   The Domain window (holder or Storyteller): the manor's aspects split from the Domain Background, the Populace and
 *   its table, settlements, Servants, staff, and the events now running; "This scene is the manor" for Secret Ways.
 *   What it does on rolls is read by power-mods.js (Prosperity on Commerce, Servants on Seneschal and Leadership,
 *   Secret Ways on Stealth in the manor).
 *   Domain events (Storyteller): one of the ten, or a roll on the table. Its change moves the sheet's Background (or the
 *   manor's aspect) and is put back when the season ends (the world clock) or the Storyteller ends it.
 *   The season turn (B7753 (desk item 2026-11-23-im1)): every 91 days of world time each held domain proposes one event, or
 *   none, to the approval queue, with the price of its next maturation dot.
 *   Fealty (Storyteller): oaths between liege and vassal in the "WoDX Fealty" journal. Swearing pools the Anchor's dots
 *   with the vassal's own; cutting a vassal off takes them back and costs the liege a dot of that Background; an oath
 *   broken by the vassal is their word broken (the Roads that count it ask).
 */
import * as D from "../../wodx-rules/actions/domain-da-rules.js";
import { DAY } from "../../wodx-chronicle/scripts/terms.mjs";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.isSelf : true);
/** The sheet Backgrounds an event or an oath can move. */
export const SHEET_BG = { populace: "Herd", resources: "Resources", influence: "Influence", status: "Status", servants: "Servants", domain: "Domain",
    allies: "Allies", contacts: "Contacts", retainers: "Retainers" };
const ASPECT = new Set(D.ASPECT_KEYS);

export function build(ctx) {
    const { dialog, notify, logEvent, sinPrompt } = ctx;
    const clockNow = ctx.clockNow ?? (async () => { try { const cal = await import("../../wodx-chronicle/scripts/calendar.mjs");
        return cal.describeTime(game.time.worldTime, game.settings.get("wodx-chronicle", "latitude")); } catch (e) { return { dateLabel: "" }; } });
    const bgItem = (actor, name) => actor?.items?.find(i => i.type === "Feature" && String(i.system?.type ?? "").includes("background") && i.name.trim().toLowerCase().startsWith(name.toLowerCase())) ?? null;
    const bg = (actor, name) => n(bgItem(actor, name)?.system?.value);
    async function moveBg(actor, name, delta) {
        const it = bgItem(actor, name);
        if (it) { const to = Math.max(0, n(it.system?.value) + n(delta)); await it.update({ "system.value": to }); return to; }
        if (n(delta) <= 0) return 0;
        const [made] = await actor.createEmbeddedDocuments("Item", [{ name, type: "Feature", system: { type: "wod.types.background", value: n(delta) } }]);
        return n(made?.system?.value);
    }
    const flagOf = actor => foundry.utils.deepClone(actor?.getFlag?.(MOD, "domainDA") ?? {});
    const save = (actor, d) => actor.setFlag(MOD, "domainDA", d);

    /** The domain as it stands: its record, the sheet's dots and the derived numbers. */
    function stateOf(actor) {
        const d = flagOf(actor);
        const aspects = D.normAspects(d.aspects ?? { area: Math.min(1, bg(actor, "domain")) });
        const eff = D.withEvents({ ...aspects }, (d.events ?? []).filter(e => ASPECT.has(e.bg)), game.time.worldTime);
        const populace = bg(actor, "herd"), servants = bg(actor, "servants");
        return { d, domain: bg(actor, "domain"), aspects, effective: D.normAspects(eff), populace, people: D.populaceOf(populace),
            servants: D.servantsOf(servants), settlements: (d.settlements ?? []).map(s => ({ ...s, ...D.settlementNow(s.rating, populace) })),
            staff: (d.staff ?? []).map(s => D.staffOf(s)), events: (d.events ?? []).filter(e => !e.ended), check: D.checkAspects(aspects, bg(actor, "domain")) };
    }

    async function window(actor) {
        if (!actor) return notify("Choose the holder of the domain.");
        if (!(game.user.isGM || actor.isOwner)) return notify("Only the holder or the Storyteller opens the domain.");
        const s = stateOf(actor);
        const row = k => { const A = D.ASPECTS[k], v = s.aspects[k];
            return `<div class="form-group"><label>${A.label} (${D.page(A.p)})</label><input type="number" name="a-${k}" value="${v}" min="${k === "area" ? 1 : 0}" max="5"/><p class="hint">${esc(A.levels[Math.max(0, v - 1)] ?? "")}</p></div>`; };
        const staffRow = (x, i) => `<div class="form-group"><select name="st-type-${i}" data-fixed><option value="">none</option>${Object.entries(D.STAFF).map(([k, t]) => `<option value="${k}"${x?.type === k ? " selected" : ""}>${t.label}</option>`).join("")}</select>
            <input type="number" name="st-dots-${i}" value="${n(x?.dots) || 1}" min="1" max="5" title="Dots"/><input type="number" name="st-people-${i}" value="${n(x?.people) || 1}" min="1" max="5" title="People"/>
            <label><input type="checkbox" name="st-ally-${i}"${x?.ally ? " checked" : ""}/> Allies</label></div>`;
        const ev = s.events.map(e => `<li>${esc(e.name)}: ${e.bg ? `${esc(SHEET_BG[e.bg] ?? D.ASPECTS[e.bg]?.label ?? e.bg)} ${e.delta > 0 ? "+" : ""}${e.delta}${e.restore ? ` (${e.restore} rebuilt by the Servants)` : ""}` : "no dots"}${e.until ? "" : `, ${esc(e.lasts ?? "until the Storyteller ends it")}`}</li>`).join("");
        const p = s.people;
        const content = `<form>
          <p><b>${esc(actor.name)}</b>: Domain ${s.domain}. ${esc(s.check.why)}</p>
          <fieldset><legend>The manor</legend>${D.ASPECT_KEYS.map(row).join("")}
            <div class="form-group"><label><input type="checkbox" name="manor"${s.d.manorScene && s.d.manorScene === canvas?.scene?.id ? " checked" : ""}/> This scene is the manor (Secret Ways count here)</label></div></fieldset>
          <fieldset><legend>The people (${D.page(110)})</legend>
            <p>Herd as Populace ${p.dots}: ${p.households} households, about ${p.people} people, ${esc(p.territory)} square miles; ${p.levies} can be called to fight. About ${D.residentsOf(s.aspects.area)} live in the manor.</p>
            <p>Servants ${s.servants.dots}: ${s.servants.retinue} can travel with you; Seneschal and Leadership ${s.servants.shift || 0} difficulty on domain business.</p>
            <div class="form-group"><label>Settlements (name: rating, one a line)</label><textarea name="settlements" rows="2">${esc((s.d.settlements ?? []).map(x => `${x.name}: ${x.rating}`).join("\n"))}</textarea></div>
            ${s.settlements.map(x => `<p class="hint">${esc(x.name)}: ${esc(x.held ? D.SETTLEMENTS[x.held].name : "a few thorps")}${x.shrinks ? " (shrunk: the Populace is too small)" : ""}, Resources ${x.resources} and Influence ${x.influence} of its own.</p>`).join("")}</fieldset>
          <fieldset><legend>Staff (${D.page(111)}): type, dots, people</legend>${[0, 1, 2].map(i => staffRow(s.d.staff?.[i], i)).join("")}
            ${s.staff.map(x => `<p class="hint">${esc(x.label)}: ${x.people} with pools of ${x.pool} in three of their Abilities${x.allyBackgrounds ? `; as Allies, ${x.allyBackgrounds} dots of Backgrounds and Resources ${x.needsResources} to keep them` : ""}.</p>`).join("")}</fieldset>
          ${ev ? `<fieldset><legend>Events now</legend><ul>${ev}</ul></fieldset>` : ""}</form>`;
        return dialog(`Domain: ${actor.name}`, content, "Save", fd => saveWindow(actor, fd), { width: 560 });
    }
    async function saveWindow(actor, fd = {}) {
        const d = flagOf(actor);
        const aspects = D.normAspects(Object.fromEntries(D.ASPECT_KEYS.map(k => [k, fd[`a-${k}`] ?? d.aspects?.[k] ?? 0])));
        const chk = D.checkAspects(aspects, bg(actor, "domain"));
        if (!chk.ok) { notify(chk.why); return null; }
        d.aspects = aspects;
        if (fd.manor !== undefined) d.manorScene = fd.manor ? (canvas?.scene?.id ?? null) : (d.manorScene === canvas?.scene?.id ? null : d.manorScene ?? null);
        if (fd.settlements !== undefined) d.settlements = String(fd.settlements).split(/\n+/).map(l => l.match(/^\s*(.+?)\s*:\s*(\d)\s*$/)).filter(Boolean).map(m => ({ name: m[1], rating: Math.min(5, Math.max(1, n(m[2]))) }));
        const staff = [0, 1, 2].map(i => fd[`st-type-${i}`] ? { type: fd[`st-type-${i}`], dots: n(fd[`st-dots-${i}`]) || 1, people: n(fd[`st-people-${i}`]) || 1, ally: !!fd[`st-ally-${i}`] } : null).filter(Boolean);
        if (staff.length || [0, 1, 2].some(i => `st-type-${i}` in fd)) d.staff = staff;
        await save(actor, d);
        return d;
    }

    /** A domain event (Storyteller): o = {key, choice, overlordStatus, overlordInfluence, siege} or the window. */
    async function domainEvent(actor, o = null) {
        if (!game.user.isGM) return notify("The Storyteller brings domain events.");
        if (!actor) return notify("Choose the holder of the domain.");
        if (o) return applyEvent(actor, o);
        const opts = D.EVENT_KEYS.map(k => `<option value="${k}">${esc(D.EVENTS[k].name)}</option>`).join("");
        const picks = D.EVENT_KEYS.map(k => `<optgroup label="${esc(D.EVENTS[k].name)}">${D.EVENTS[k].pick.map(([b, v], i) => `<option value="${k}:${i}">${esc(SHEET_BG[b] ?? D.ASPECTS[b]?.label ?? b)} ${v > 0 ? "+" : ""}${v}</option>`).join("")}</optgroup>`).join("");
        const content = `<form><p>A domain event for <b>${esc(actor.name)}</b>: it lasts a season or more (${D.page(113)}).</p>
          <div class="form-group"><label>Event</label><select name="key"><option value="roll">Roll on the table</option>${opts}</select></div>
          <div class="form-group"><label>What it hits</label><select name="pick" data-fixed><option value="">The first it names</option>${picks}</select></div>
          <div class="form-group"><label>Overlord's Status / Influence (an itinerant court)</label><input type="number" name="ostatus" value="0" min="0" max="10"/><input type="number" name="oinfl" value="0" min="0" max="10"/></div></form>`;
        return dialog("Domain event (V20 Dark Ages Companion)", content, "Bring it", fd => {
            const key = fd.key === "roll" ? D.rollEvent(Math.random()) : fd.key;
            const [pk, pi] = String(fd.pick ?? "").split(":");
            return applyEvent(actor, { key, choice: pk === key ? n(pi) : 0, overlordStatus: n(fd.ostatus), overlordInfluence: n(fd.oinfl) });
        });
    }
    async function applyEvent(actor, o = {}) {
        const s = stateOf(actor);
        const ch = D.eventChange(o.key, o.choice, { servants: s.servants.dots });
        if (!ch) return null;
        const E = D.EVENTS[o.key], lines = [];
        const rec = { id: foundry.utils.randomID(), key: o.key, name: ch.name, bg: ch.bg, delta: ch.delta, restore: ch.restore, at: game.time.worldTime,
            until: E.until ? null : game.time.worldTime + D.SEASON_DAYS * DAY, lasts: E.until ?? "a season", moved: 0 };
        if (E.hosting) {
            const h = D.hostCourt({ overlordStatus: o.overlordStatus, overlordInfluence: o.overlordInfluence, servants: s.servants.dots, resources: bg(actor, "resources") });
            if (h.hire) { rec.bg = "resources"; rec.delta = -h.cost; }
            lines.push(h.fails ? `The court needs Servants ${h.need}; ${actor.name} has ${s.servants.dots} and can hire only ${h.hire} more. The overlord is poorly hosted: expect punishment.`
                : `The court needs Servants ${h.need}: ${h.short ? `${h.hire} more hired with Resources (1 Resources spent)` : "the household is enough"}. Exceeding the overlord's hopes may win Resources, Influence or standing.`);
        }
        if (rec.bg && (rec.delta + rec.restore)) {
            const net = rec.delta + rec.restore;
            if (ASPECT.has(rec.bg)) rec.moved = net;
            else { const before = bg(actor, SHEET_BG[rec.bg]); const after = await moveBg(actor, SHEET_BG[rec.bg], net); rec.moved = after - before; }
            lines.unshift(`${SHEET_BG[rec.bg] ?? D.ASPECTS[rec.bg]?.label} ${net > 0 ? "+" : ""}${net}${rec.restore ? ` (${rec.restore} of the loss rebuilt by the Servants)` : ""}, ${rec.until ? "for a season" : esc(rec.lasts)}.`);
        }
        const d = flagOf(actor); d.events = [...(d.events ?? []), rec]; await save(actor, d);
        const follows = (E.follows ?? []).map(k => D.EVENTS[k]?.name).filter(Boolean);
        await logEvent?.(actor, `${ch.name} in the domain.`, "domain");
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Domain" }, flags: { [MOD]: { info: true, domainEvent: rec.id } },
            content: `<div class="vta-card"><h3>${esc(ch.name)}: ${esc(actor.name)}'s domain</h3><p>${esc(E.does)}</p>${lines.map(l => `<div class="vta-res">${esc(l)}</div>`).join("")}${follows.length ? `<p class="wodx-quiet">It may bring: ${esc(follows.join(", "))}.</p>` : ""}<p class="wodx-quiet">${esc(ch.page)}</p></div>` });
        return rec;
    }
    /** An event ends: what it moved on the sheet goes back. */
    async function endEvent(actor, id) {
        const d = flagOf(actor), e = (d.events ?? []).find(x => x.id === id && !x.ended);
        if (!e) return null;
        if (e.bg && e.moved && !ASPECT.has(e.bg)) await moveBg(actor, SHEET_BG[e.bg], -e.moved);
        e.ended = game.time.worldTime;
        await save(actor, d);
        await logEvent?.(actor, `${e.name} passes from the domain.`, "domain");
        return e;
    }
    /** The season's end: the active Storyteller ends the events whose time is up, then turns the season (im1). */
    async function tick(now = game.time.worldTime) {
        if (!isActiveGM()) return 0;
        let k = 0;
        for (const a of game.actors) for (const e of (a.getFlag?.(MOD, "domainDA")?.events ?? [])) if (!e.ended && e.until && now >= e.until) { await endEvent(a, e.id); k++; }
        try { await seasonTurn(now); } catch (e) { console.warn("WoDX | domain season", e); }
        return k;
    }

    /* ---- B7753 (Desk item 2026-11-23-im1): the season turn ---- */
    const T_SEASON = "wodx-actions.domainSeason";
    const approvals = () => game.modules.get("wodx-chronicle")?.api?.approvals ?? null;
    const yearNow = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
    /** Each held domain (Domain 1 or more) proposes its season's event, or none, and its next maturation dot. */
    async function seasonTurn(now = game.time.worldTime, { d10 = null, rand = null } = {}) {
        if (!isActiveGM()) return [];
        const out = [];
        for (const a of game.actors ?? []) {
            if (a.type === "Group" || bg(a, "domain") < 1) continue;
            const d = flagOf(a);
            const t = D.seasonTurn({ last: d.season ?? null, now, d10: d10 ?? (1 + Math.floor(Math.random() * 10)), rand: rand ?? Math.random(), day: DAY });
            if (!t.due && !t.first) continue;
            d.season = t.season; await save(a, d);
            if (!t.due) continue;
            const cost = D.maturationCost(bg(a, "domain"), { prosperityHalf: false });
            const mature = `Its next dot of Domain takes ${cost} maturation experience (${D.page(105)}).`;
            const ap = approvals();
            if (t.event && ap?.propose) {
                const E = D.EVENTS[t.event];
                await ap.propose({ type: T_SEASON, key: `domainSeason:${a.id}:${t.season}`, title: `${D.eventWords(t.event, yearNow())}: ${a.name}'s domain`,
                    detail: `The season turns. ${E.does} ${mature} Approved, the event comes to the domain (${D.page(E.p)}).`, data: { actor: a.id, key: t.event } });
            }
            await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "Domain" }, flags: { [MOD]: { info: true } },
                content: `<div class="vta-card"><h3>The season turns: ${esc(a.name)}'s domain</h3><p>${t.event ? `${esc(D.eventWords(t.event, yearNow()))} waits in the approval queue.` : "A quiet season: no event (house rule, a d10 of 1 to 5)."}</p><p>${esc(mature)}</p><p class="wodx-quiet">${esc(D.page(113))}</p></div>` });
            out.push({ actor: a.id, season: t.season, event: t.event });
        }
        return out;
    }
    function registerHandlers() {
        approvals()?.registerHandler?.(T_SEASON, { label: "A domain's season event", approve: async entry => {
            const a = game.actors.get(entry.data?.actor);
            if (a && D.EVENTS[entry.data?.key]) await applyEvent(a, { key: entry.data.key, choice: 0 });
        } });
    }

    /* ---------------- Fealty ---------------- */
    const FJ = {
        find: () => game.journal.find(x => x.getFlag?.(MOD, "kind") === "fealty"),
        async ensure() {
            let j = this.find();
            if (!j) j = await JournalEntry.create({ name: "WoDX Fealty", flags: { [MOD]: { kind: "fealty", entries: [] } }, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
                pages: [{ name: "Oaths", type: "text", sort: 1000, text: { content: "<p></p>" } }, { name: "Ledger", type: "text", sort: 2000, text: { content: "<p></p>" } }] });
            return j;
        },
        entries() { return foundry.utils.deepClone(this.find()?.getFlag(MOD, "entries") ?? []); }
    };
    async function writeOaths(list) {
        const j = await FJ.ensure();
        await j.setFlag(MOD, "entries", list);
        const row = e => `<tr><td>${esc(e.date)}</td><td>${esc(e.liege)}</td><td>${esc(e.vassal)}</td><td>${esc(e.anchor.bg)} ${e.anchor.dots}</td><td>${esc(e.offered.map(o => `${o.bg} ${o.dots}`).join(", "))}${e.phantom ? `; reputation ${e.phantom}` : ""}</td><td>${esc(e.duties)}</td><td>${esc(e.status)}</td></tr>`;
        const head = "<tr><th>Sworn</th><th>Liege</th><th>Vassal</th><th>Anchor</th><th>Offered</th><th>Duties</th><th>Status</th></tr>";
        await j.pages.getName("Oaths")?.update({ "text.content": `<p class="wodx-quiet">Oaths of fealty (${D.page(106)}).</p><table>${head}${list.filter(e => e.status === "sworn").map(row).join("")}</table>` });
        await j.pages.getName("Ledger")?.update({ "text.content": `<table>${head}${list.map(row).join("")}</table>` });
        return j;
    }
    /** "Retainers 4, Resources 2" as [{bg, dots}]. */
    const parseOffered = t => String(t ?? "").split(/[,;]+/).map(x => x.trim().match(/^(.+?)\s+(\d+)$/)).filter(Boolean).map(m => ({ bg: m[1], dots: n(m[2]) }));

    /** Swear an oath: o = {liege, vassal, anchorBg, anchorDots, offered, phantom, duties}. Names or actors. */
    async function swear(o = {}) {
        if (!game.user.isGM) return notify("The Storyteller keeps the oaths of fealty.");
        const L = typeof o.liege === "string" ? game.actors.getName(o.liege) : o.liege, V = typeof o.vassal === "string" ? game.actors.getName(o.vassal) : o.vassal;
        const liege = L?.name ?? String(o.liege ?? ""), vassal = V?.name ?? String(o.vassal ?? "");
        const offered = Array.isArray(o.offered) ? o.offered : parseOffered(o.offered);
        const offeredDots = offered.reduce((s, x) => s + n(x.dots), 0);
        const chk = D.checkOath({ anchorDots: o.anchorDots, liegeOwn: L ? bg(L, o.anchorBg) : null, offered: offeredDots, phantom: o.phantom });
        if (!chk.ok) { notify(chk.why.join(" ")); return null; }
        const when = (await clockNow?.())?.dateLabel ?? "";
        const e = { id: foundry.utils.randomID(), date: when, liege, vassal, anchor: { bg: o.anchorBg, dots: n(o.anchorDots) }, offered, phantom: n(o.phantom), duties: String(o.duties ?? ""), status: "sworn", pooled: 0 };
        if (V) { const before = bg(V, o.anchorBg); const after = await moveBg(V, o.anchorBg, n(o.anchorDots)); e.pooled = after - before; }
        const list = FJ.entries(); list.push(e); await writeOaths(list);
        const text = `${vassal} swears fealty to ${liege}: ${o.anchorBg} ${n(o.anchorDots)} anchored for ${offered.map(x => `${x.bg} ${x.dots}`).join(", ") || "reputation"}${e.phantom ? ` (reputation ${e.phantom})` : ""}${e.duties ? `; owes ${e.duties}` : ""}.`;
        for (const a of [L, V]) if (a) await logEvent?.(a, text, "fealty");
        // B7750 (Desk item 2026-11-23-mc3): an oath is a Road of Kings catalyst (Road of Kings, PDF p. 62): proposed to the queue
        for (const a of [L, V]) if (a) { try { await ctx.proposeTruth?.(a, "oath", a === L ? `takes ${vassal} as a vassal` : `swears to ${liege}`); } catch (err) { console.warn("WoDX | fealty: Road", err); } }
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } }, content: `<div class="vta-card"><h3>Fealty</h3><p>${esc(text)}</p><p class="wodx-quiet">Journal: WoDX Fealty. ${D.page(106)}</p></div>` });
        return e;
    }
    /** End an oath: how = "cut" (the liege cuts the vassal off), "vassal" (the vassal breaks it), "released". */
    async function endOath(id, how = "released") {
        if (!game.user.isGM) return null;
        const list = FJ.entries(), e = list.find(x => x.id === id && x.status === "sworn");
        if (!e) return null;
        const L = game.actors.getName(e.liege), V = game.actors.getName(e.vassal);
        if (V && e.pooled) await moveBg(V, e.anchor.bg, -e.pooled);
        let note = "";
        if (how === "cut" && L) { await moveBg(L, e.anchor.bg, -D.FEALTY.cutOffCost); note = ` ${e.liege} loses a dot of ${e.anchor.bg} for it.`; }
        if (how === "vassal" && V) { try { await sinPrompt?.(V, "wordBroken", `Breaks the oath of fealty to ${e.liege}`); } catch (err) { console.warn("WoDX | fealty", err); } }
        e.status = { cut: "cut off by the liege", vassal: "broken by the vassal", released: "released" }[how] ?? how;
        e.ended = (await clockNow?.())?.dateLabel ?? "";
        await writeOaths(list);
        const text = `The oath between ${e.liege} and ${e.vassal} ends: ${e.status}.${note}`;
        for (const a of [L, V]) if (a) await logEvent?.(a, text, "fealty");
        await ChatMessage.create({ whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { info: true } }, content: `<div class="vta-card"><h3>Fealty</h3><p>${esc(text)}</p><p class="wodx-quiet">${D.page(106)}</p></div>` });
        return e;
    }
    async function fealty(actor = null) {
        if (!game.user.isGM) return notify("The Storyteller keeps the oaths of fealty.");
        const sworn = FJ.entries().filter(e => e.status === "sworn");
        const names = [...new Set(game.actors.filter(a => a.type !== "Group").map(a => a.name))].sort();
        const tgt = [...(game.user.targets ?? [])][0]?.actor?.name ?? "";
        const bgOpts = Object.values(SHEET_BG).map(b => `<option value="${b}">${b}</option>`).join("");
        const content = `<form><datalist id="wodx-fealty-names">${names.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
          <fieldset><legend>Swear an oath (${D.page(106)})</legend>
            <div class="form-group"><label>Liege</label><input type="text" name="liege" list="wodx-fealty-names" value="${esc(actor?.name ?? "")}"/></div>
            <div class="form-group"><label>Vassal</label><input type="text" name="vassal" list="wodx-fealty-names" value="${esc(tgt)}"/></div>
            <div class="form-group"><label>Anchor Background</label><select name="anchorBg" data-fixed>${bgOpts}</select><input type="number" name="anchorDots" value="1" min="1" max="5"/></div>
            <div class="form-group"><label>The vassal offers</label><input type="text" name="offered" placeholder="Retainers 4, Resources 2"/></div>
            <div class="form-group"><label>Reputation instead (a Cainite, a knight)</label><input type="number" name="phantom" value="0" min="0" max="5"/></div>
            <div class="form-group"><label>Duties</label><input type="text" name="duties" placeholder="40 days of service a year"/></div>
            <p class="hint">Two dots offered for each dot of the Anchor; a liege lends at most half a Background.</p></fieldset>
          <fieldset><legend>Or end one (${sworn.length} sworn)</legend>
            <div class="form-group"><select name="end" data-fixed><option value="">none</option>${sworn.map(e => `<option value="${e.id}">${esc(e.vassal)} to ${esc(e.liege)}: ${esc(e.anchor.bg)} ${e.anchor.dots}</option>`).join("")}</select>
            <select name="how" data-fixed><option value="released">Released</option><option value="cut">Cut off by the liege (costs a dot)</option><option value="vassal">Broken by the vassal</option></select></div></fieldset></form>`;
        return dialog("Fealty (V20 Dark Ages Companion)", content, "Record", fd => fd.end ? endOath(fd.end, fd.how)
            : swear({ liege: fd.liege, vassal: fd.vassal, anchorBg: fd.anchorBg, anchorDots: n(fd.anchorDots), offered: fd.offered, phantom: n(fd.phantom), duties: fd.duties }), { width: 540 });
    }

    return { window, saveWindow, stateOf, domainEvent, applyEvent, endEvent, tick, seasonTurn, registerHandlers, fealty, swear, endOath, oaths: () => FJ.entries() };
}
