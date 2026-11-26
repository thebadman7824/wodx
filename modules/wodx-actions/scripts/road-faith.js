/**
 * WoDX Actions (Dark Ages depth desk item 3, B7644-B7648): walking a Road as a faith with people in it. The Road window
 * shows a character's rank, Mentor, Moments of Truth and standing on the Road, and runs the guided change of Road or
 * Path. Pure rules: road-faith-rules.js. WoDX Creation reads the same record for the price of a Road dot.
 *
 * Built by main.js with its helpers (ctx).
 */
import * as RF from "../../wodx-rules/actions/road-faith-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const npcFactions = () => game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api?.factions ?? null : null;
const creationLearn = () => game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api?.learn ?? null : null;
const storytellerApi = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api ?? null : null;
const chronicleApi = () => game.modules.get("wodx-chronicle")?.api ?? null;
export const T_TRUTH = "wodx-actions.roadTruth";
const opt = (v, l, sel = false) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(l)}</option>`;

export const storyNow = () => { try { return game.settings.get(MOD, "storyId") || "first"; } catch (e) { return "first"; } };
export const faith = actor => RF.faithOf(actor?.flags?.[MOD]?.roadFaith);

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, setFlag, updateActor, road, virtues, willpower, spendWillpower, logEvent } = ctx;
    const roadsData = () => ctx.roads();
    const save = (actor, f) => setFlag(actor, "roadFaith", RF.faithOf(f));

    /** A Mentor's rating now: from the Mentor's own sheet when it is linked, else the rating written down. */
    function mentorNow(f) {
        if ( !f.mentor ) return null;
        const m = f.mentor.uuid ? fromUuidSync(f.mentor.uuid) : null;
        if ( !m ) return f.mentor;
        const rd = road(m);
        return { ...f.mentor, name: m.name, rating: rd.value, road: ctx.roadOf(m)?.key ?? f.mentor.road };
    }

    /** Open a Moment of Truth for a catalyst. Returns a line for the card, or "" when one was already open. */
    async function openTruth(actor, key, note = "", { forChange = false } = {}) {
        if ( !actor || !RF.CATALYSTS[key] ) return "";
        const before = faith(actor), story = storyNow();
        const after = RF.withTruth(before, { key, story, at: game.time.worldTime, note, forChange });
        if ( after.truths.length === before.truths.length ) return "";
        await save(actor, after);
        await logEvent(actor, `A Moment of Truth: ${RF.CATALYSTS[key].label.toLowerCase()}${note ? ` (${note})` : ""}.`, "road");
        return `<div class="vta-note good">A Moment of Truth (${esc(RF.CATALYSTS[key].label.toLowerCase())}): ${forChange ? "the change of Road may be taken" : "a Road dot bought this story costs half (V20 Dark Ages p. 115)"}.</div>`;
    }

    /**
     * B7750 (Desk item 2026-11-23-mc3): an event that matches the Road book's own prompt (an oath, for the Road of Kings) proposes
     * a Moment of Truth to the Storyteller's approval queue. Returns true when one was proposed.
     */
    async function proposeTruth(actor, event, note = "") {
        if ( !actor ) return false;
        const hit = RF.truthFromEvent(ctx.roadOf(actor)?.key, event);
        if ( !hit ) return false;
        const story = storyNow();
        if ( RF.openTruth(faith(actor), story) ) return false;
        const ap = chronicleApi()?.approvals;
        if ( !ap?.propose ) return false;
        await ap.propose({ type: T_TRUTH, key: `roadTruth:${actor.id}:${story}:${event}`, title: `A Moment of Truth for ${actor.name}?`,
            detail: `${hit.label}${note ? `: ${String(note).slice(0, 160)}` : ""}. The Road book counts it (${hit.src}). Approved, a Moment of Truth opens this story: the next Road dot costs half (V20 Dark Ages p. 115).`,
            data: { actor: actor.id, note: `${hit.label}${note ? `: ${String(note).slice(0, 80)}` : ""}` } });
        return true;
    }
    function registerHandlers() {
        chronicleApi()?.approvals?.registerHandler?.(T_TRUTH, { label: "A Moment of Truth from the Road's own book", approve: async entry => {
            const a = game.actors.get(entry.data?.actor);
            if ( !a ) return;
            const line = await openTruth(a, "event", String(entry.data?.note ?? ""));
            if ( line ) await post(a, `${a.name}: the Road`, line);
        } });
    }

    /** The record and the sheet together, for the window and the gates. */
    function info(actor) {
        const f = faith(actor), rd = road(actor), v = virtues(actor), story = storyNow();
        const found = ctx.roadOf(actor);
        const mentor = mentorNow(f);
        const study = mentor ? RF.studyReady(mentor, rd.value, game.time.worldTime) : null;
        const change = f.change ? changeState(actor, f) : null;
        return { faith: f, road: rd, key: found?.key ?? null, rank: RF.rankOf(rd.value), mentor, mentorCounts: RF.mentorCounts(mentor, found?.key, rd.value),
            study, truth: RF.openTruth(f, story), story, change, virtues: v, paragons: RF.paragonsToExcommunicate(rd.value),
            flocks: (() => { try { return npcFactions()?.flocksOf?.(actor) ?? []; } catch (e) { return []; } })() };
    }

    function changeState(actor, f = faith(actor)) {
        const c = f.change; if ( !c ) return null;
        const D = roadsData(), to = D?.roads?.[c.to];
        const found = ctx.roadOf(actor);
        const path = c.to === found?.key;
        const fromV = found?.path?.virtues ?? found?.road?.virtues ?? ["conscience", "selfcontrol"];
        const toV = (to?.paths ?? []).find(p => p.name === c.path)?.virtues ?? to?.virtues ?? [];
        const rd = road(actor), sheet = actor.system?.advantages?.virtues ?? {};
        const m = mentorNow(f);
        const st = RF.changeSteps({ path, shed: RF.virtuesToShed(fromV, toV), rating: rd.value,
            virtues: { conscience: n(sheet.conscience?.permanent), selfcontrol: n(sheet.selfcontrol?.permanent) },
            mentorOnNew: !!m && m.road === c.to, truth: f.truths.some(t => !t.used && t.forChange && t.story === storyNow()) });
        const total = n(sheet.conscience?.permanent) + n(sheet.selfcontrol?.permanent) + n(sheet.courage?.permanent);
        return { ...c, path, name: c.path || to?.name || c.to, ...st, difficulty: RF.changeDifficulty(total), target: RF.changeTarget(path) };
    }

    function infoHtml(actor, I) {
        const rd = I.road, f = I.faith;
        const sign = x => `${x >= 0 ? "+" : ""}${x}`;
        const rows = [
            `<b>${esc(rd.name)} ${rd.value}</b>: ${esc(I.rank.label)}${f.status ? `, ${f.status === "apostate" ? "Apostate" : "Excommunicate"}` : ""}. Aura ${sign(rd.aura)}${f.status === "excommunicate" ? " (penalties doubled); +2 difficulty on Conscience or Conviction" : ""}.`,
            I.mentor ? `Mentor: <b>${esc(I.mentor.name)}</b>, ${I.mentor.rating} dots${I.mentorCounts ? `: a Road dot costs ${Math.min(I.mentor.rating - rd.value, Math.floor(rd.value))} less (to no less than half)` : I.mentor.road && I.key && I.mentor.road !== I.key ? " on another Road: no help with the cost" : ": not more dots than the character, no help with the cost"}.${I.study ? ` Study: ${I.study.done} of ${I.study.need} months.` : ""}` : "No Mentor.",
            I.truth ? `A Moment of Truth is open this story (${esc(RF.CATALYSTS[I.truth.key].label.toLowerCase())}): the next Road dot costs half.` : "No Moment of Truth open this story."
        ];
        // B7649: the Road's local group the character belongs to (WoDX NPC factions)
        rows.push(I.flocks.length ? `Among ${I.flocks.map(x => `<b>${esc(x.name)}</b>${x.leader === actor.id ? " (its head)" : ""}`).join(", ")}.` : "In no gathering of the Road.");
        if ( I.change ) rows.push(`Changing to <b>${esc(I.change.name)}</b>: ${I.change.steps.map(s => `${s.done ? "&#10003;" : "&#9675;"} ${esc(s.label)}`).join("; ")}.${I.change.ready ? ` Willpower roll at ${I.change.difficulty}: ${I.change.successes} of ${I.change.target} successes.` : ""}`);
        const prompts = game.user.isGM ? (RF.ROAD_PROMPTS[I.key] ?? []) : [];
        return `<div class="vta-note">${rows.map(r => `<p>${r}</p>`).join("")}${prompts.length ? `<p class="wodx-quiet">From the Road's own book: ${prompts.map(p => `${esc(p.text)} (${esc(p.src)})`).join("; ")}.</p>` : ""}</div>`;
    }

    /** The Road window. Players: Mentor, study, the change's roll. The Storyteller also opens Moments of Truth and rules on standing. */
    async function window(actor) {
        if ( !actor ) return null;
        const I = info(actor), gm = game.user.isGM;
        const acts = [["", "Nothing, only look"], ["mentor", "Name a Mentor"]];
        if ( I.mentor ) acts.push(["clearMentor", "No Mentor now"]);
        if ( I.study?.ready ) acts.push(["study", "The study with the Mentor is done: a Moment of Truth"]);
        if ( gm ) acts.push(["truth", "Open a Moment of Truth (Storyteller)"], ["apostate", "Name an Apostate (Storyteller)"], ["excommunicate", "Excommunicate (Storyteller)"]);
        if ( gm && I.faith.status ) acts.push(["clearStatus", "Back in good standing (Storyteller)"]);
        if ( gm && npcFactions()?.gatherFlock && I.key ) acts.push(["gatherFlock", "Gather the Road's walkers in this scene as its local group (Storyteller)"]);
        if ( !I.change ) acts.push(["change", "Begin a change of Road or Path"]);
        else { if ( I.change.ready ) acts.push(["changeRoll", `Roll Willpower for the change (1 point)`]); acts.push(["cancelChange", "Give up the change"]); }
        const D = roadsData();
        const roadOpts = Object.entries(D?.roads ?? {}).flatMap(([k, r]) => [[`${k}|`, r.name], ...(r.paths ?? []).map(p => [`${k}|${p.name}`, `${r.name}: ${p.name}`])]);
        const others = game.actors.filter(a => a.id !== actor.id && a.type !== "Group" && n(a.system?.advantages?.path?.permanent) > 0).slice(0, 200);
        const content = `<form class="wodx-road-faith">${infoHtml(actor, I)}
          <div class="form-group"><label>Do</label><select name="act" data-fixed>${acts.map(([v, l]) => opt(v, l)).join("")}</select></div>
          <div class="form-group"><label>Mentor</label><select name="mentorPick"><option value="">By name below</option>${others.map(a => opt(a.uuid, `${a.name} (${road(a).name} ${road(a).value})`)).join("")}</select></div>
          <div class="form-group"><label>Mentor's name and dots</label><input type="text" name="mentorName" value=""/><input type="number" name="mentorRating" value="0" min="0" max="10"/></div>
          <div class="form-group"><label>Catalyst</label><select name="catalyst" data-fixed>${Object.entries(RF.CATALYSTS).map(([k, c]) => opt(k, c.label)).join("")}</select></div>
          <div class="form-group"><label>For the change of Road</label><input type="checkbox" name="forChange"/></div>
          <div class="form-group"><label>Paragons who agree</label><input type="text" name="paragons" value="" placeholder="Names, separated by commas"/></div>
          <div class="form-group"><label>New Road or Path</label><select name="to" data-fixed>${roadOpts.map(([v, l]) => opt(v, l)).join("")}</select></div>
          <div class="form-group"><label>A note</label><input type="text" name="note" value=""/></div></form>`;
        return dialog(`The Road: ${actor.name}`, content, "Do it", fd => act(actor, fd), { width: 560 });
    }

    /** One choice from the window (also the gates' way in). fd: the form's fields. */
    async function act(actor, fd = {}) {
        const gm = game.user.isGM, f = faith(actor), title = `${actor.name}: the Road`;
        switch ( fd.act ) {
            case "mentor": {
                const m = fd.mentorPick ? fromUuidSync(fd.mentorPick) : null;
                const name = m?.name ?? String(fd.mentorName ?? "").trim();
                if ( !name ) return ctx.notify("Name the Mentor.");
                // B7751 (Desk item 2026-11-23-mc1): the Mentor has to be willing, as a teacher does (WoDX Creation's B7131 terms)
                let terms = null;
                if ( m ) { try { terms = creationLearn()?.terms?.(actor, m, { next: road(actor).value + 1 }) ?? null; } catch (e) { console.warn("WoDX | Road Mentor", e); } }
                const ok = RF.mentorAllowed(terms, { gm });
                if ( !ok.ok ) return post(actor, title, `<div class="vta-note bad">${esc(ok.note)}</div>`);
                const mentor = { name, uuid: m?.uuid ?? null, rating: m ? road(m).value : n(fd.mentorRating), road: m ? ctx.roadOf(m)?.key ?? null : f.change?.to ?? ctx.roadOf(actor)?.key ?? null, since: game.time.worldTime, ...(terms ? { will: terms.will } : {}) };
                if ( ok.price ) {
                    const what = `For teaching the ${road(actor).name}: ${ok.price.what}`;
                    // Only the Storyteller's client writes the Ledger (a world setting); a player's price goes to them to write
                    if ( gm ) { try { await storytellerApi()?.ledger?.save?.({ kind: ok.price.kind, ...(ok.price.size ? { size: ok.price.size } : {}), from: { id: actor.id, name: actor.name }, to: { id: m.id, name: m.name }, what }); } catch (e) { console.warn("WoDX | Road Mentor: Ledger", e); } }
                    else await ChatMessage.create({ whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: { alias: "WoDX" }, content: `<div class="vta-card"><h3>A Mentor's price</h3><p>${esc(actor.name)} owes ${esc(m.name)}: ${esc(what)}${ok.price.size ? ` (a ${esc(ok.price.size)} ${esc(ok.price.kind)})` : ""}. Write it in the Ledger.</p></div>` });
                }
                await save(actor, { ...f, mentor });
                await logEvent(actor, `Takes ${name} as a Mentor on the Road.`, "road");
                return post(actor, title, `<div class="vta-note">${esc(name)} (${mentor.rating} dots) is the Mentor from today. ${ok.note ? `${esc(ok.note)} ` : ""}${f.change && mentor.road === f.change.to ? "A Mentor on the new Road, as the change asks (V20 Dark Ages p. 112)." : RF.mentorCounts(mentor, ctx.roadOf(actor)?.key, road(actor).value) ? "A Road dot costs less while they teach (V20 Dark Ages p. 111)." : "With no more dots than the character on this Road, they do not lower the cost."}</div>`);
            }
            case "clearMentor":
                await save(actor, { ...f, mentor: null });
                return post(actor, title, `<div class="vta-note">No Mentor now.</div>`);
            case "study": {
                const I = info(actor);
                if ( !I.study?.ready ) return ctx.notify("The study is not long enough yet.");
                const line = await openTruth(actor, "study", I.mentor?.name ?? "");
                await save(actor, { ...faith(actor), mentor: { ...faith(actor).mentor, since: game.time.worldTime } });
                return post(actor, title, line || `<div class="vta-note">A Moment of Truth is already open.</div>`);
            }
            case "truth": {
                if ( !gm ) return ctx.notify("The Storyteller opens a Moment of Truth.");
                const line = await openTruth(actor, fd.catalyst, String(fd.note ?? "").trim(), { forChange: !!fd.forChange });
                return post(actor, title, line || `<div class="vta-note">One is already open for that this story.</div>`);
            }
            case "apostate":
                if ( !gm ) return null;
                await save(actor, { ...f, status: "apostate" });
                await logEvent(actor, `Named an Apostate on the ${road(actor).name}${fd.note ? `: ${fd.note}` : ""}.`, "road");
                return post(actor, title, `<div class="vta-note">An Apostate: others on the Road look on with scorn (V20 Dark Ages p. 112).</div>`);
            case "excommunicate": {
                if ( !gm ) return null;
                const rd = road(actor), need = RF.paragonsToExcommunicate(rd.value);
                const names = String(fd.paragons ?? "").split(",").map(s => s.trim()).filter(Boolean);
                if ( need === null ) return post(actor, title, `<div class="vta-note">${rd.value >= 8 ? "A Paragon cannot be put out of the Road; the Road puts them down instead" : "No Road left to be put out of"} (V20 Dark Ages p. 112).</div>`);
                if ( names.length < need ) return post(actor, title, `<div class="vta-note">An ${RF.rankOf(rd.value).label} is put out by ${need} Paragon${need > 1 ? "s" : ""}; ${names.length} named.</div>`);
                await save(actor, { ...f, status: "excommunicate" });
                await logEvent(actor, `Excommunicated from the ${rd.name} by ${names.join(", ")}.`, "road");
                return post(actor, title, `<div class="vta-big bad">Excommunicated by ${esc(names.join(", "))}.</div><div class="vta-note">On the Road still: +2 difficulty on Conscience or Conviction rolls, aura penalties doubled (V20 Dark Ages p. 112).</div>`);
            }
            case "clearStatus":
                if ( !gm ) return null;
                await save(actor, { ...f, status: null });
                await logEvent(actor, `Back in good standing on the ${road(actor).name}.`, "road");
                return post(actor, title, `<div class="vta-note">Back in good standing.</div>`);
            case "change": {
                const [to, path] = String(fd.to ?? "").split("|");
                const r = roadsData()?.roads?.[to];
                if ( !r ) return ctx.notify("Pick the new Road or Path.");
                const found = ctx.roadOf(actor);
                if ( found?.key === to && (found.path?.name ?? "") === (path ?? "") ) return ctx.notify("That is the Road walked now.");
                const toPath = found?.key === to;
                if ( toPath && !path ) return ctx.notify("A change within the Road is to one of its Paths.");
                await save(actor, { ...f, change: { to, path: path || null, since: game.time.worldTime, successes: 0, rolls: 0 } });
                await logEvent(actor, `Begins to leave the ${road(actor).name} for the ${path || r.name}.`, "road");
                const st = changeState(actor);
                return post(actor, title, `<div class="vta-note">Toward the ${esc(path || r.name)}${toPath ? " (a Path of the same Road: a Moment of Truth, then five successes; V20 Dark Ages p. 114)" : " (V20 Dark Ages p. 112)"}: ${st.steps.map(s => `${s.done ? "&#10003;" : "&#9675;"} ${esc(s.label)}`).join("; ")}.</div>`);
            }
            case "cancelChange":
                await save(actor, { ...f, change: null });
                return post(actor, title, `<div class="vta-note">The change is given up.</div>`);
            case "changeRoll": return changeRoll(actor);
            case "gatherFlock": {
                if ( !gm ) return null;
                const key = ctx.roadOf(actor)?.key, FX = npcFactions();
                if ( !key || !FX?.gatherFlock ) return ctx.notify("No Road recognized, or WoDX NPC is off.");
                const r = await FX.gatherFlock(key, globalThis.canvas?.scene ?? null);
                if ( !r.ok ) return post(actor, title, `<div class="vta-note">${esc(r.reason)}</div>`);
                await logEvent(actor, `Gathers with ${r.faction?.name ?? "the Road's walkers"}.`, "road");
                return post(actor, title, `<div class="vta-note">${esc(r.faction?.name ?? "The Road's walkers")}: ${r.walkers.length} walkers of the Road here, gathered as a secret faction the Storyteller runs (V20 Dark Ages, the Road's Organization).</div>`);
            }
            default: return null;
        }
    }

    /** One roll of the change's extended Willpower roll (V20 Dark Ages pp. 112, 114). */
    async function changeRoll(actor) {
        const st = changeState(actor);
        if ( !st?.ready ) return ctx.notify("The change is not ready for the roll yet.");
        if ( !(await spendWillpower(actor, 1)) ) return ctx.notify("No Willpower left to spend.");
        const wp = willpower(actor);
        const r = await rollPool(wp.perm, st.difficulty);
        const out = RF.changeRoll(st, r, { path: st.path, willpower: wp.temp });
        let body = rollBlock("Willpower", r, [`10 less ${10 - st.difficulty} Virtue dots`]);
        if ( out.spendMore ) { await spendWillpower(actor, out.spendMore); body += `<div class="vta-note">Botch: another point of Willpower.</div>`; }
        const rd = road(actor), f = faith(actor), title = `${actor.name}: toward the ${st.name}`;
        if ( out.roadLoss ) { await updateActor(actor, { "system.advantages.path.permanent": Math.max(0, rd.value - out.roadLoss) }); body += `<div class="vta-note">The Road slips: ${rd.value} to ${Math.max(0, rd.value - out.roadLoss)}.</div>`; }
        if ( out.outcome === "done" ) {
            const from = rd.name;
            await setFlag(actor, "road", { key: st.to, path: f.change.path || null });
            const upd = { "system.advantages.path.custom": f.change.path || roadsData()?.roads?.[st.to]?.name };
            if ( !st.path ) upd["system.advantages.path.permanent"] = 1;
            await updateActor(actor, upd);
            await save(actor, { ...RF.useTruth(f, storyNow(), { forChange: true }), change: null, status: st.path ? f.status : "apostate", from });
            await logEvent(actor, `Leaves the ${from} and walks the ${st.name}${st.path ? "" : ", an Apostate to the old Road"}.`, "road");
            body += `<div class="vta-big good">${out.successes} successes: the ${esc(st.name)} is walked now${st.path ? "" : " at one dot, the first free; an Apostate to the old Road"}.</div>`;
        } else if ( out.outcome === "lost" ) {
            await updateActor(actor, { "system.advantages.path.permanent": 0 });
            await save(actor, { ...f, change: null });
            await logEvent(actor, `Lost to the Beast while leaving the ${rd.name}.`, "road");
            body += `<div class="vta-big bad">Out of Willpower with ${out.successes} of ${st.target}: the old Road falls to 0 and the Beast has the character.</div>`;
        } else if ( out.outcome === "stopped" ) {
            await save(actor, { ...f, change: null });
            body += `<div class="vta-big bad">Out of Willpower with ${out.successes} of ${st.target}: the Path is not taken this time.</div>`;
        } else {
            await save(actor, { ...f, change: { ...f.change, successes: out.successes, rolls: n(f.change.rolls) + 1 } });
            body += `<div class="vta-big">${out.successes} of ${st.target} successes. Roll again from the Road window.</div>`;
        }
        return post(actor, title, body, [r.roll]);
    }

    return { window, act, info, openTruth, proposeTruth, registerHandlers, changeRoll, faith };
}
