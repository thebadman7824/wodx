/**
 * WoDX Actions (B3560 to B3565): the Foundry side of debts and oaths and the vampire marks. Rules in debts-rules.js
 * and beast-marks-rules.js.
 *
 *   bloodHunt(actor)       Storyteller: call a hunt on a Kindred (form by sect and year), or lift one. The hunt goes on
 *                          the Prestation journal, sets the Kindred NPCs of WoDX NPC to Hunted toward the target, starts
 *                          a rumour (WoDX Storyteller), and takes the target's Status while it runs. It ends when the
 *                          target meets Final Death (diablerie or the death check) or is lifted.
 *   oaths(actor)           a changeling's oaths (C20) or a Dark Ages fae's (Dark Ages: Fae): swear one, break one. A
 *                          break posts the backlash to everyone bound by it and applies Willpower, Glamour and Banality
 *                          when "Apply changes" is on.
 *   onTurn(combat)         a player character's vampire in frenzy or Rötschreck: the Beast's card, or the NPC planner
 *                          moves the token (setting beastToken), with a Willpower button to hold the Beast a turn.
 *   riseLines(t)           the hour each vampire rises, for the Nightfall card.
 *   bearingMods(...)       a low-Humanity vampire's bearing toward a mortal, and the blood it takes to seem alive.
 *   wake(actor, since)     the card after a torpor longer than a lifetime.
 *   markDiablerie(...)     the black veins and the taint; auraNote(target) for Aura Perception; marks(actor) to see
 *                          and roll the taint; the victim's soul at nightfall when that setting is on.
 */
import * as D from "./debts-rules.js";
import * as B from "./beast-marks-rules.js";
import * as C from "./c20-rules.js";
import * as P from "./profiles.js";
import * as FD from "./fae-da.js";

const MOD = "wodx-actions";
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => u.isGM || a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;
const year = () => { try { return n(api("wodx-chronicle")?.eras?.currentYear?.()); } catch (e) { return 0; } };
const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
const btn = (k, actor, label, arg = "") => `<button type="button" class="vta-btn" data-dm="${esc(k)}" data-actor="${esc(actor?.uuid ?? "")}" data-arg="${esc(arg)}">${esc(label)}</button>`;
const card = (title, body) => `<div class="vta-card"><h3>${esc(title)}</h3>${body}</div>`;

export function build(ctx) {
    const { post, dialog, setFlag, updateActor, rollPool, rollBlock, setting, notify } = ctx;
    const kx = () => ctx.kx();

    /* ---------------- The Blood Hunt ---------------- */

    const hunts = () => foundry.utils.deepClone(game.settings.get(MOD, "bloodHunts") ?? []);
    const saveHunts = list => game.settings.set(MOD, "bloodHunts", list.slice(-60));
    const statusItem = a => a?.items?.find(i => i.type === "Feature" && (i.system?.type || "").includes("background") && /^status/i.test(i.name.trim()));
    async function setStatus(a, v) { const it = statusItem(a); if (it && setting("applyChanges")) await a.updateEmbeddedDocuments("Item", [{ _id: it.id, "system.value": Math.max(0, n(v)) }]); }
    /** The Kindred NPCs who hunt: members of WoDX NPC's Kindred factions, else every Kindred NPC in the world. */
    function hunters(target) {
        const npc = api("wodx-npc");
        const st = npc?.factions?.state?.();
        let ids = (st?.factions ?? []).filter(f => f.kind === "kindred").flatMap(f => f.members ?? []);
        let list = ids.map(id => game.actors.get(id)).filter(Boolean);
        if (!list.length) list = game.actors.filter(a => !a.hasPlayerOwner && a.type !== "Group" && P.detectProfile(a) === "kindred");
        return [...new Set(list)].filter(a => a.id !== target.id && !a.hasPlayerOwner);
    }
    async function writeLedger(h) {
        const j = await kx().prestationJournal?.();
        if (!j) return;
        let page = j.pages.getName("Blood Hunts");
        const row = `<li data-hunt="${esc(h.id)}"><b>${esc(h.label)}</b> on ${esc(h.target)}, called by ${esc(h.caller || "the court")}: ${esc(h.groundText)}${h.bounty ? `. Bounty: ${esc(h.bounty)}` : ""}${h.pardon ? ". Diablerie on the outcast is pardoned" : ""}.${h.active ? "" : ` <i>Ended: ${h.ended === "dead" ? "Final Death" : "lifted"}.</i>`}</li>`;
        if (!page) { await j.createEmbeddedDocuments("JournalEntryPage", [{ name: "Blood Hunts", type: "text", sort: 3000, text: { content: `<ul>${row}</ul>` } }]); return; }
        const html = page.text?.content || "<ul></ul>";
        const re = new RegExp(`<li data-hunt="${h.id}">[\\s\\S]*?</li>`);
        await page.update({ "text.content": re.test(html) ? html.replace(re, row) : html.replace(/<\/ul>\s*$/, `${row}</ul>`) });
    }
    async function bloodHunt(actor = null) {
        if (!game.user.isGM) return notify("The Storyteller calls and lifts hunts.");
        const open = hunts().filter(h => h.active);
        const tgt = [...(game.user.targets ?? [])][0]?.actor ?? actor;
        const y = year();
        const names = game.actors.filter(a => a.type !== "Group").map(a => a.name).sort();
        const content = `<form>
          <div class="form-group"><label>Do</label><select name="act" data-fixed>${opts([["call", "Call a hunt"], ...(open.length ? [["lift", "Lift a hunt"]] : [])], "call")}</select></div>
          <fieldset><legend>Call</legend>
            <div class="form-group"><label>On whom</label><input type="text" name="target" list="wodx-hunt-names" value="${esc(tgt?.name ?? "")}"/></div>
            <div class="form-group"><label>Called by</label><input type="text" name="caller" list="wodx-hunt-names" value=""/></div>
            <datalist id="wodx-hunt-names">${names.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
            <div class="form-group"><label>Who rules here</label><select name="sect" data-fixed>${opts([["", "No sect (a lord's domain)"], ["camarilla", "The Camarilla"], ["sabbat", "The Sabbat"], ["anarch", "The Anarchs"], ["independent", "No one holds the city"]], y >= 1435 ? "camarilla" : "")}</select></div>
            <div class="form-group"><label>For</label><select name="ground" data-fixed>${opts(Object.entries(D.HUNT_GROUNDS), "lifeBoon")}</select></div>
            <div class="form-group"><label>Bounty</label><input type="text" name="bounty" placeholder="what the caller offers"/></div>
            <div class="form-group"><label><input type="checkbox" name="pardon"/> Diablerie on the outcast is pardoned (V20 p. 28)</label></div>
          </fieldset>
          ${open.length ? `<fieldset><legend>Lift</legend><div class="form-group"><label>Hunt</label><select name="lift" data-fixed>${opts(open.map(h => [h.id, `${h.label} on ${h.target}`]), open[0].id)}</select></div></fieldset>` : ""}
        </form>`;
        return dialog("The Blood Hunt", content, "Go", async fd => {
            if (fd.act === "lift") return endHunt(fd.lift, "lifted");
            const target = game.actors.getName(String(fd.target || "").trim());
            if (!target) return notify("Name the Kindred to hunt.");
            if (hunts().some(h => h.active && h.targetId === target.id)) return notify(`${target.name} is already hunted.`);
            return callHunt(target, { caller: String(fd.caller || "").trim(), sect: fd.sect, ground: fd.ground, bounty: fd.bounty, pardon: !!fd.pardon });
        });
    }
    async function callHunt(target, { caller = "", sect = "", ground = "other", bounty = "", pardon = false } = {}) {
        const y = year();
        const camFrom = n(api("wodx-chronicle")?.events?.list?.()?.find?.(e => e.id === "camarilla")?.year) || 1435;
        const form = D.huntFormFor(y, sect, { camarillaFrom: camFrom });
        const plan = D.huntPlan({ target: target.name, caller, form, ground, bounty, pardon, year: y, status: ctx.background(target, "Status"), at: game.time.worldTime });
        const h = { ...plan, id: foundry.utils.randomID(), targetId: target.id, steps: {} };
        const npc = api("wodx-npc"), lines = [];
        for (const a of hunters(target)) {
            try {
                const before = npc?.attitude?.of?.(a, target)?.step ?? null;
                const r = await npc?.attitude?.apply?.(a, target, { to: D.HUNTED_STEP, why: `${plan.label} on ${target.name}` });
                if (r) h.steps[a.id] = before;
            } catch (e) { console.warn("WoDX | hunt attitude", e); }
        }
        const hn = Object.keys(h.steps).length;
        lines.push(hn ? `${hn} Kindred of the court now hunt ${esc(target.name)}.` : "No Kindred NPCs found to set hunting (WoDX NPC factions or Kindred actors).");
        try { const r = await api("wodx-storyteller")?.rumours?.start?.({ text: plan.rumour, big: true }); h.rumour = r?.id ?? null; lines.push("The rumour is out."); }
        catch (e) { console.warn("WoDX | hunt rumour", e); }
        if (statusItem(target)) { await setStatus(target, 0); lines.push(`${esc(target.name)} loses their Status (${plan.status.before} to 0) while hunted (V20 p. 493).`); }
        await setFlag(target, "bloodHunt", h.id);
        await saveHunts([...hunts(), h]);
        await writeLedger(h);
        await kx().logEvent(target, `${plan.label} called on them${caller ? ` by ${caller}` : ""}: ${plan.groundText}.`, "hunt");
        const by = caller && game.actors.getName(caller);
        if (by) await kx().logEvent(by, `Calls ${plan.label} on ${target.name}.`, "hunt");
        return ChatMessage.create({ content: card(`${plan.label[0].toUpperCase()}${plan.label.slice(1)}: ${target.name}`, `<p>${esc(D.HUNT_FORMS[form].note)}</p><p>${esc(plan.groundText)}${plan.bounty ? `. Bounty: ${esc(plan.bounty)}` : ""}${plan.pardon ? ". Diablerie on the outcast is pardoned." : "."}</p><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul><p>It ends at the target's Final Death or when lifted. Whoever brings the target in gains a dot of Status (house rule).</p>${btn("liftHunt", target, "Lift the hunt", h.id)}<p class="wodx-quiet">${esc(plan.page)}</p>`),
            whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }
    async function endHunt(id, how = "lifted") {
        if (!game.user.isGM) return null;
        const list = hunts(), i = list.findIndex(h => h.id === id && h.active);
        if (i < 0) return null;
        const h = D.huntEnd(list[i], how);
        list[i] = h;
        const target = game.actors.get(h.targetId), npc = api("wodx-npc");
        if (how === "lifted" && target) {
            for (const [aid, before] of Object.entries(h.steps ?? {})) {
                const a = game.actors.get(aid);
                if (a && before !== null && before !== undefined) await npc?.attitude?.apply?.(a, target, { to: before, why: `${h.label} lifted` }).catch?.(() => null);
            }
            if (h.restoreStatus !== null) await setStatus(target, h.restoreStatus);
        }
        if (h.rumour) { try { await api("wodx-storyteller")?.rumours?.end?.(h.rumour); } catch (e) { /* gone */ } }
        if (target) await setFlag(target, "bloodHunt", null);
        await saveHunts(list);
        await writeLedger(h);
        if (target) await kx().logEvent(target, how === "dead" ? `${h.label} ends with their Final Death.` : `${h.label} on them is lifted.`, "hunt");
        return ChatMessage.create({ content: card(`${h.label}: ended`, `<p>${esc(h.target)}: ${how === "dead" ? "Final Death ends the hunt." : "the hunt is lifted; the hunters stand down and Status comes back."}</p>`),
            whisper: gmIds(), speaker: { alias: "WoDX" } });
    }
    /** A hunted Kindred whose track fills with aggravated damage has met Final Death (V20 p. 284). */
    async function checkDeath(actor) {
        const t = ctx.healthTrack?.(actor);
        if (!t || n(t.damage?.aggravated) < n(t.max)) return null;
        return onFinalDeath(actor);
    }
    /** Final Death of a hunted Kindred ends the hunt. */
    async function onFinalDeath(actor) {
        const id = actor?.getFlag?.(MOD, "bloodHunt");
        return id ? endHunt(id, "dead") : null;
    }

    /* ---------------- Broken oaths ---------------- */

    const isDAFae = a => { try { return FD.isDA(a); } catch (e) { return false; } };
    const c20Oaths = a => foundry.utils.deepClone(a.getFlag(MOD, "c20oaths") ?? []);
    async function oaths(actor) {
        if (P.detectProfile(actor) !== "fae") return notify("Oaths here are the fae's: open this on a changeling or a Dark Ages fae.");
        const da = isDAFae(actor);
        const list = da ? (actor.getFlag(MOD, "daFae")?.oaths ?? []).map((o, k) => ({ ...o, k, label: `${o.kind} ${o.rating}: ${o.terms}` })).filter(o => o.active !== false)
            : c20Oaths(actor).map((o, k) => ({ ...o, k, label: `${D.C20_OATHS[o.kind]?.label ?? "An oath"}: ${o.terms}` })).filter(o => !o.broken);
        const names = game.actors.filter(a => a.type !== "Group").map(a => a.name).sort();
        const swear = da ? `<p class="wodx-quiet">Dark Ages fae swear their oaths under Origin and Court, one a line. The punishment is named here when an oath breaks.</p>`
            : `<fieldset><legend>Swear</legend>
                <div class="form-group"><label>Oath</label><select name="kind" data-fixed>${opts(Object.entries(D.C20_OATHS).map(([k, o]) => [k, o.label]), "burden")}</select></div>
                <div class="form-group"><label>Terms</label><input type="text" name="terms" placeholder="what is sworn"/></div>
                <div class="form-group"><label>Penalty (if it names one)</label><input type="text" name="penalty"/></div>
                <div class="form-group"><label>Others bound</label><input type="text" name="parties" list="wodx-oath-names" placeholder="names, comma between"/></div>
                <datalist id="wodx-oath-names">${names.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
                <div class="form-group"><label>Done Deal successes</label><input type="number" name="successes" value="0" min="0" max="10"/></div>
                <div class="form-group"><label>Bound to</label><select name="bane" data-fixed>${opts([["", "Nothing (botches)"], ["place", "A place"], ["thing", "A thing"]], "")}</select> <input type="text" name="baneName" placeholder="which"/></div>
              </fieldset>`;
        const content = `<form>
          <div class="form-group"><label>Do</label><select name="act" data-fixed>${opts([...(da ? [] : [["swear", "Swear an oath"]]), ...(list.length ? [["break", "An oath is broken"]] : [])], da ? "break" : "swear")}</select></div>
          ${swear}
          ${list.length ? `<fieldset><legend>Break</legend><div class="form-group"><label>Oath</label><select name="which" data-fixed>${opts(list.map(o => [String(o.k), o.label]), String(list[0].k))}</select></div>
            <div class="form-group"><label><input type="checkbox" name="willing" checked/> Broken knowingly</label></div>
            ${da ? `<div class="form-group"><label>The punishment it names</label><input type="text" name="penalty"/></div><div class="form-group"><label>Sworn</label><select name="among" data-fixed>${opts([["human", "With a human"], ["fae", "Among fae"]], "human")}</select></div>` : ""}</fieldset>` : "<p>No oaths kept yet.</p>"}
        </form>`;
        return dialog(`Oaths: ${actor.name}`, content, "Go", async fd => {
            if (fd.act === "swear" && !da) {
                const o = { kind: D.C20_OATHS[fd.kind] ? fd.kind : "custom", terms: String(fd.terms || "").trim() || "as sworn", penalty: String(fd.penalty || "").trim(),
                    parties: String(fd.parties || "").split(",").map(s => s.trim()).filter(Boolean), successes: n(fd.successes), bane: fd.bane || "", baneName: String(fd.baneName || "").trim(), at: game.time.worldTime };
                await setFlag(actor, "c20oaths", [...c20Oaths(actor), o]);
                await kx().logEvent(actor, `Swears the ${D.C20_OATHS[o.kind].label}: ${o.terms}.`, "oath");
                return post(actor, `${actor.name} swears an oath`, `<div class="vta-note">${esc(D.C20_OATHS[o.kind].label)}: ${esc(o.terms)}${o.parties.length ? `, with ${esc(o.parties.join(", "))}` : ""}.</div>`);
            }
            if (fd.act !== "break") return null;
            return breakOath(actor, n(fd.which), { willing: !!fd.willing, penalty: fd.penalty, among: fd.among, da });
        });
    }
    async function payChanges(a, changes) {
        const t = ctx.api().c20Info?.(a);
        if (!t || !Object.keys(changes).length || !setting("applyChanges")) return "";
        const next = D.applyOathChanges(t, changes);
        const upd = { "system.advantages.willpower.temporary": next.willpower.temp, "system.advantages.willpower.permanent": next.willpower.perm, "system.advantages.glamour.temporary": next.glamour.temp };
        if (changes.banality) { const r = C.addBanality({ rating: t.banality.perm, points: t.banality.temp }, n(changes.banality)); upd["system.advantages.banality.temporary"] = r.points; upd["system.advantages.banality.permanent"] = r.rating; }
        await updateActor(a, upd);
        return D.changesText(changes);
    }
    async function breakOath(actor, k, { willing = true, penalty = "", among = "human", da = false } = {}) {
        let res, parties = [];
        if (da) {
            const f = foundry.utils.deepClone(actor.getFlag(MOD, "daFae") ?? {});
            const o = f.oaths?.[k];
            if (!o) return null;
            res = D.daBacklash({ ...o, penalty: String(penalty || o.penalty || "").trim(), among });
            f.oaths[k] = { ...o, active: false, broken: game.time.worldTime };
            await setFlag(actor, "daFae", f);
        } else {
            const list = c20Oaths(actor), o = list[k];
            if (!o) return null;
            res = D.c20Backlash(o, { willing });
            parties = (o.parties ?? []).map(nm => game.actors.getName(nm)).filter(Boolean);
            list[k] = { ...o, broken: game.time.worldTime, willing };
            await setFlag(actor, "c20oaths", list);
        }
        const paid = await payChanges(actor, res.breaker.changes);
        const others = [];
        for (const a of parties) { const p = await payChanges(a, res.others.changes); others.push(`${esc(a.name)}${p ? `: ${esc(p)}` : ""}`); }
        await kx().logEvent(actor, `Breaks the ${res.label}${willing ? "" : " by accident"}.`, "oath");
        for (const a of parties) await kx().logEvent(a, `${actor.name} breaks the ${res.label} sworn with them.`, "oath");
        const body = `<p><b>${esc(actor.name)}</b> breaks the ${esc(res.label)}.</p>${paid ? `<p>Pays: ${esc(paid)}.</p>` : D.changesText(res.breaker.changes) ? `<p>Owes: ${esc(D.changesText(res.breaker.changes))} (apply by hand).</p>` : ""}
          <ul>${res.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>${others.length ? `<p>Also bound and told: ${others.join("; ")}.</p>` : ""}
          ${res.trigger ? btn("trigger", actor, "Banality trigger roll") : ""}<p class="wodx-quiet">${esc(res.page)}</p>`;
        const to = [...new Set([...ownerIds(actor), ...parties.flatMap(ownerIds)])];
        return ChatMessage.create({ content: card("An oath is broken", body), whisper: to, speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- The Beast takes the token ---------------- */

    const frenzyState = a => {
        const cond = api("wodx-chronicle")?.conditions;
        if (cond?.hasCondition?.(a, "rotschreck")) return "rotschreck";
        if (a?.system?.conditions?.isfrenzy || cond?.hasCondition?.(a, "frenzy")) return "frenzy";
        return null;
    };
    const turnKey = combat => `${combat?.id}:${combat?.round}:${combat?.turn}`;
    let lastTurn = null;
    async function onTurn(combat) {
        if (!isActiveGM() || !combat?.started) return null;
        const mode = game.settings.get(MOD, "beastToken");
        if (mode === "off") return null;
        const key = turnKey(combat);
        if (key === lastTurn) return null;
        lastTurn = key;
        const tok = combat.combatant?.token?.object, a = tok?.actor;
        if (!a?.hasPlayerOwner || P.detectProfile(a) !== "kindred") return null;
        const state = frenzyState(a);
        if (!state) return null;
        const held = a.getFlag(MOD, "beastHeld");
        if (held === key) return null;
        const npc = api("wodx-npc");
        const holdBtn = btn("holdBeast", a, "Spend Willpower: take this turn back", key);
        if (mode === "take" && npc?.planTurn && npc?.postPlan) {
            try {
                const planned = npc.planTurn(tok, combat);
                await npc.postPlan(tok, combat, planned, "auto");
                return ChatMessage.create({ content: card(`The Beast has ${a.name}`, `<p>${state === "rotschreck" ? "The Red Fear" : "Frenzy"}: the Beast takes the token this turn (the plan card above can undo it).</p>${holdBtn}<p class="wodx-quiet">V20 pp. 297-299, 310</p>`),
                    whisper: ownerIds(a), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
            } catch (e) { console.warn("WoDX | the Beast's turn", e); }
        }
        const near = (canvas.tokens?.placeables ?? []).filter(t => t.id !== tok.id && t.actor).map(t => ({ name: t.name, yards: canvas.grid?.measurePath ? canvas.grid.measurePath([tok.center, t.center]).distance : 0,
            kind: t.document.disposition === tok.document.disposition ? "friend" : (P.detectProfile(t.actor) === "mortal" ? "vessel" : "foe") }));
        const want = B.beastWants(state, near);
        return ChatMessage.create({ content: card(`What the Beast wants: ${a.name}`, `<p>${esc(want.text)}</p><p class="wodx-quiet">The player moves the token as the Beast wants.</p>${holdBtn}<p class="wodx-quiet">V20 pp. 297-299, 310</p>`),
            whisper: ownerIds(a), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }
    async function holdBeast(a, key) {
        const w = { temp: n(a.system?.advantages?.willpower?.temporary) };
        const ok = B.canHold(w.temp, a.getFlag(MOD, "beastHeld"), key);
        if (!ok.ok) return notify(`${a.name}: ${ok.why}.`);
        if (!(await ctx.spendWillpower(a, 1))) return null;
        await setFlag(a, "beastHeld", key);
        return post(a, `${a.name} holds the Beast`, `<div class="vta-note">A Willpower point: for this turn the player acts. ${esc(a.name)} is still in frenzy.</div><div class="wodx-quiet">V20 p. 310</div>`);
    }

    /* ---------------- Low Humanity ---------------- */

    /** Rating, and whether it is Humanity (looks and bearing follow Humanity only). */
    function humanityOf(a) {
        const p = a?.system?.advantages?.path ?? {};
        const found = ctx.roadOf?.(a);
        const label = String(p.custom || game.i18n?.localize?.(p.label || "") || "");
        const humanity = found ? found.key === "humanity" && !found.path : (!label || label.startsWith("wod.") || /humanity/i.test(label));
        return { rating: n(p.permanent ?? p.value), humanity };
    }
    const sceneKey = () => `${game.scenes?.viewed?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}`;
    /** Mods for a Social roll by a vampire on a mortal: the bearing when the roll did not already take it, and the blood to seem alive. */
    function bearingMods(actor, target, fd = {}, preset = {}) {
        if (!actor || !target || !preset?.aura || P.detectProfile(actor) !== "kindred" || P.detectProfile(target) !== "mortal") return null;
        const h = humanityOf(actor);
        if (!h.humanity) return null;
        const out = { diff: 0, parts: [] };
        if (!fd.aura) { const b = B.bearing(h.rating); if (b) { out.diff += b; out.parts.push(`bearing toward a mortal ${b > 0 ? "+" : ""}${b} (V20 p. 310)`); } }
        const cost = B.seemAliveCost(h.rating);
        if (cost && actor.getFlag(MOD, "imitating") !== sceneKey()) out.parts.push(`cold and breathless up close: ${cost} blood to seem alive (V20 p. 269)`);
        return out.parts.length ? out : null;
    }
    const markImitating = a => setFlag(a, "imitating", sceneKey());
    /** Lines for the Nightfall card: when each vampire rises. */
    function riseLines(vamps) {
        return vamps.map(a => { const h = humanityOf(a); return `${esc(a.name)} rises ${esc(B.riseText(h.rating))}`; });
    }

    /* ---------------- Waking from a long torpor ---------------- */

    async function wake(actor, since) {
        if (!actor || since === undefined || since === null) return null;
        const yrs = B.sleptYears(since, game.time.worldTime), endY = year();
        if (!endY || yrs <= B.LIFETIME) return null;
        const startY = Math.round(endY - yrs);
        const langs = (() => { try { return api("wodx-chronicle")?.languages?.of?.(actor) ?? []; } catch (e) { return []; } })();
        const abilities = (ctx.abilityList?.(actor) ?? []).map(x => ({ key: x.key, label: x.name ?? x.key, value: x.value }));
        const events = (() => { try { return api("wodx-chronicle")?.events?.list?.() ?? []; } catch (e) { return []; } })();
        const r = B.wakeReport({ startYear: startY, endYear: endY, langs: Array.isArray(langs) ? langs : [], abilities, events });
        if (!r) return null;
        await setFlag(actor, "longSleep", { from: startY, to: endY, oldTongues: r.oldTongues, behind: r.behind.map(b => ({ key: b.key, xp: b.xp, months: b.months })) });
        await kx().logEvent(actor, `Wakes after ${r.years} years asleep.`, "torpor");
        const ev = r.events.slice(-12).map(e => `<li>${n(e.year)}: ${esc(e.name)}</li>`).join("");
        const body = `<p>${esc(actor.name)} slept ${r.years} years (${startY} to ${endY}). Ask what has changed: ${esc(r.topics.join("; "))}.</p>
          ${ev ? `<p>What happened meanwhile:</p><ul>${ev}</ul>` : ""}
          ${r.oldTongues.length ? `<p>Old forms: ${esc(r.oldTongues.join(", "))}. Today's speech is caught only for the gist (Intelligence + Linguistics, 7) until relearned (house rule).</p>` : ""}
          ${r.behind.length ? `<p>Behind the age (+${B.BEHIND_DIFFICULTY} difficulty until caught up, house rule): ${r.behind.map(b => `${esc(b.label)} (${b.xp} XP, ${b.months} month${b.months > 1 ? "s" : ""} of study)`).join(", ")}.</p>` : ""}
          ${btn("caughtUp", actor, "Mark all caught up")}<p class="wodx-quiet">Torpor V20 p. 283. The rest is WoDX's reading.</p>`;
        return ChatMessage.create({ content: card(`${actor.name} wakes into a new age`, body), whisper: ownerIds(actor), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
    }

    /* ---------------- Diablerie's marks ---------------- */

    async function markDiablerie(actor, victim, originalGen) {
        const m = B.diablerieMarks({ victimGen: ctx.generationOf(victim), originalGen, at: game.time.worldTime, victim: victim?.name, victimWillpower: n(victim?.system?.advantages?.willpower?.permanent) });
        await setFlag(actor, "diablerieMarks", [...(actor.getFlag(MOD, "diablerieMarks") ?? []), m]);
        return `<div class="vta-note">Black veins run through ${esc(actor.name)}'s aura for ${m.years} year${m.years > 1 ? "s" : ""}; Kindred feel a taint about them for ${m.months} month${m.months > 1 ? "s" : ""} (V20 pp. 294-295).${m.soul && setting("diablerieSoul") ? " The victim's will was iron and their blood far older: their soul may push through (optional rule)." : ""}</div>`;
    }
    function auraNote(target) {
        const now = B.marksNow(target?.getFlag?.(MOD, "diablerieMarks") ?? [], game.time.worldTime);
        return now.veins.length ? `<div class="vta-big bad">Black veins run through ${esc(target.name)}'s aura: a diablerist (V20 p. 294).</div>` : "";
    }
    async function marks(actor) {
        const list = actor.getFlag(MOD, "diablerieMarks") ?? [];
        const now = B.marksNow(list, game.time.worldTime);
        if (!list.length) return notify(`${actor.name} bears no marks of diablerie.`);
        const sensers = canvas.tokens?.controlled?.map(t => t.actor).filter(a => a && a.id !== actor.id && P.detectProfile(a) === "kindred") ?? [];
        let body = `<p>${list.map(m => `${esc(m.victim || "a victim")}: veins ${n(game.time.worldTime) < m.veinsUntil ? "showing" : "faded"}, taint ${n(game.time.worldTime) < m.taintUntil ? "felt" : "gone"}`).join("<br>")}</p>`;
        const rolls = [];
        if (now.taint.length && game.user.isGM) for (const s of sensers) {
            const h = humanityOf(s);
            const d = B.taintDifficulty(h.rating, { onPath: !h.humanity });
            if (d === null) { body += `<p>${esc(s.name)} walks a Path and feels nothing amiss.</p>`; continue; }
            const r = await rollPool(ctx.attr(s, "perception"), d);
            rolls.push(r.roll);
            body += rollBlock(`${s.name}: Perception (${d})`, r) + `<div class="vta-res">${r.successes ? "Something about them doesn't feel right." : "Nothing felt."}</div>`;
        }
        if (now.taint.length && !sensers.length) body += `<p class="wodx-quiet">Select the tokens of Kindred near them to roll whether they feel the taint (12 − Humanity, V20 p. 295).</p>`;
        return ChatMessage.create({ content: card(`Marks of diablerie: ${actor.name}`, body), whisper: gmIds(), speaker: { alias: "WoDX" }, rolls });
    }
    /** At nightfall, with the optional rule on: a card for each diablerist whose victim may push through. */
    async function soulCards() {
        if (!setting("diablerieSoul")) return null;
        for (const a of game.actors.filter(x => x.type !== "Group" && (x.getFlag(MOD, "diablerieMarks") ?? []).length)) {
            const m = B.marksNow(a.getFlag(MOD, "diablerieMarks"), game.time.worldTime).veins.find(x => x.soul);
            if (m) await ChatMessage.create({ content: card(`${m.victim || "The victim"} stirs in ${a.name}`, `<p>Willpower against ${B.soulDifficulty(m.victimGen, m.originalGen)}: a failure lets the victim's habits and wants through for the scene, a botch for the night (house rule on V20 p. 295).</p>${btn("soul", a, "Roll Willpower", `${m.victimGen}|${m.originalGen}|${m.victim}`)}`),
                whisper: gmIds(), speaker: { alias: "WoDX" }, flags: { [MOD]: { prompt: true } } });
        }
        return true;
    }
    async function soulRoll(a, arg) {
        const [vg, og, victim] = String(arg).split("|");
        const r = await rollPool(n(a.system?.advantages?.willpower?.permanent), B.soulDifficulty(vg, og));
        const res = B.soulResult(r);
        return post(a, `${a.name} against ${victim || "the victim"}`, rollBlock("Willpower", r) + `<div class="vta-res ${res.pushes ? "bad" : "good"}">${esc(res.text)}</div>${res.pushes ? `<div class="vta-note">The Storyteller plays the urge, like a derangement: ${esc(victim || "the victim")}'s manner, wants and grudges.</div>` : ""}`, [r.roll]);
    }

    /* ---------------- Buttons ---------------- */

    async function onChatButton(b) {
        const k = b.dataset.dm, arg = b.dataset.arg ?? "";
        const doc = b.dataset.actor ? await fromUuid(b.dataset.actor) : null;
        const a = doc?.actor ?? doc;
        if (!a) return notify("That character is gone.");
        if (!(a.isOwner || game.user.isGM)) return notify("Only the character's owner or the GM can do that.");
        switch (k) {
            case "liftHunt": return endHunt(arg, "lifted");
            case "trigger": return ctx.api().c20Trigger?.({ actor: a });
            case "holdBeast": return holdBeast(a, arg);
            case "caughtUp": await setFlag(a, "longSleep", null); return post(a, `${a.name} has caught up`, `<div class="vta-note">The tongues and skills of the age are learned.</div>`);
            case "soul": return soulRoll(a, arg);
        }
        return null;
    }

    return { bloodHunt, callHunt, endHunt, onFinalDeath, checkDeath, oaths, breakOath, onTurn, holdBeast, bearingMods, markImitating, riseLines, humanityOf, wake, markDiablerie, auraNote, marks, soulCards, onChatButton };
}

/** Settings this part adds. */
export function registerSettings() {
    game.settings.register(MOD, "bloodHunts", { scope: "world", config: false, type: Array, default: [] });
    game.settings.register(MOD, "beastToken", { name: "The Beast in a fight", hint: "When a player's vampire is in frenzy or Rötschreck during a fight: a card each turn of what the Beast wants, or the NPC planner moves the token for the Beast (WoDX NPC; every move can be undone). A Willpower point takes a turn back (V20 p. 310).",
        scope: "world", config: true, type: String, default: "card", choices: B.BEAST_MODES });
    game.settings.register(MOD, "diablerieSoul", { name: "A diablerized soul can push through", hint: "Optional (V20 p. 295 gives it as a rumour): a victim with Willpower 10 and much stronger blood may push through. At nightfall the diablerist rolls Willpower; a failure lets the victim's habits and wants through (house rule).",
        scope: "world", config: true, type: Boolean, default: false });
}
