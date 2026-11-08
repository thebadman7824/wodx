/**
 * WoDX Actions 3.10 (Phase 6i): the fallen (Demon: The Fallen).
 *
 *   The demon's traits   House, faction and visage from the Bio tab; Faith and Torment (permanent and temporary) and the
 *                        Virtues from the sheet; lores read from the sheet's Lore powers (by name), or set in the WoDX box
 *   Evoke                an evocation of a known lore: its traits at 6, Faith spent for successes, ravaged thralls, unbelievers;
 *                        Torment perverts it (or the demon chooses the dark effect, a Torment point); botch costs Faith
 *   Apocalyptic form     the Faith pool at 6 or a Faith point; four powers and the high-Torment ones; Revelation; the look
 *   Revelation           the scene's Faith spent sets the mortals' difficulty; a witness's reaction
 *   Reap, thralls        reaping (Willpower against Willpower); thralls with Faith potential, gifts and the dawn offering
 *   Torment              sins (Virtue at 8), acts of kindness (Virtue against Torment), ten points to a permanent point
 *   Faith heals; holy ground and blessed things; the name spoken; seeing through illusion
 *
 * Built by main.js with its helpers (ctx). Pure rules: demon-rules.js.
 */
import * as D from "./demon-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = D.REF;
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const ABIL_LABEL = { animalken: "Animal Ken", craft: "Crafts" };
const abil = k => ABIL_LABEL[k] ?? cap(k);

/** Is this actor one of the fallen? The Demon sheet, or a Faith and Torment set up with a House. */
export function isDemon(actor) {
    if (!actor) return false;
    if (actor.type === "Demon") return true;
    return !!(actor.system?.settings?.hastorment && D.houseOf(actor.system?.house));
}

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, spendWillpower, notify } = ctx;
    const sceneKey = () => `${game.scenes?.viewed?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}`;
    const flag = a => a.getFlag(MOD, "demon") ?? {};
    const dawnDay = () => Math.floor(((game.time?.worldTime ?? 0) - 6 * 3600) / 86400);
    const saveFlag = (a, patch) => ctx.setFlag(a, "demon", { ...flag(a), ...patch });

    function loresFrom(actor) {
        const out = {};
        for (const i of actor?.items ?? []) {
            if (i.type !== "Power" || !/types\.lore$/.test(String(i.system?.type ?? ""))) continue;
            const k = D.loreOf(i.name) || D.loreOf(i.system?.label);
            if (k) out[k] = Math.max(out[k] ?? 0, n(i.system?.value));
        }
        return out;
    }
    function formsFrom(actor) {
        const items = (actor?.items ?? []).filter(i => i.type === "Trait" && /apocalypticform$/.test(String(i.system?.type ?? "")));
        const named = i => i.name && !/^new\b|wod\.labels/i.test(i.name);
        return { low: items.filter(i => !i.system?.ishightorment && named(i)).map(i => i.name), high: items.filter(i => i.system?.ishightorment && named(i)).map(i => i.name) };
    }
    function info(actor) {
        const s = actor.system ?? {}, a = s.advantages ?? {}, v = a.virtues ?? {};
        const f = flag(actor);
        const lores = { ...loresFrom(actor), ...(f.lores ?? {}) };
        const house = D.houseOf(s.house) || f.house || "";
        const primary = f.primary || (house ? D.HOUSES[house].lores.find(l => lores[l]) : "") || "";
        const fm = formsFrom(actor);
        const L = D.LORES[primary];
        const forms = { low: fm.low.length ? fm.low : (L?.form ?? []), high: fm.high.length ? fm.high : (L?.high ?? []) };
        const spent = f.scene === sceneKey() ? n(f.spent) : 0;
        return { f, house, faction: D.FACTIONS[String(s.faction ?? "").split(".").pop()] ?? (s.faction || ""), visage: s.visage || D.visageOf(primary), primary, lores, forms,
            faith: { perm: n(a.faith?.permanent), temp: n(a.faith?.temporary) }, torment: { perm: n(a.torment?.permanent), temp: n(a.torment?.temporary) },
            willpower: { perm: n(a.willpower?.permanent), temp: n(a.willpower?.temporary) },
            virtues: { conscience: n(v.conscience?.permanent), conviction: n(v.selfcontrol?.permanent), courage: n(v.courage?.permanent) },
            thralls: f.thralls ?? [], spent, formOn: f.formScene === sceneKey() ? f.form : null, rule: f.rule || "faces" };
    }

    /* -- resources --------------------------------------------------- */
    async function faith(actor, delta, { spend = true } = {}) {
        const i = info(actor);
        if (delta < 0 && i.faith.temp + delta < 0) { notify(`${actor.name} has ${i.faith.temp} Faith; this needs ${-delta}.`); return false; }
        await updateActor(actor, { "system.advantages.faith.temporary": Math.max(0, Math.min(i.faith.perm || 10, i.faith.temp + delta)) });
        if (delta < 0 && spend) await saveFlag(actor, { scene: sceneKey(), spent: i.spent + -delta });
        return true;
    }
    async function torment(actor, k) {
        if (!k) return "";
        const i = info(actor);
        if (k < 0) {
            await updateActor(actor, { "system.advantages.torment.temporary": Math.max(0, i.torment.temp + k) });
            return i.torment.temp ? `−1 temporary Torment (${Math.max(0, i.torment.temp + k)}).` : "No temporary Torment to lose.";
        }
        const r = D.addTorment(i.torment, k);
        await updateActor(actor, { "system.advantages.torment.temporary": r.temp, "system.advantages.torment.permanent": r.perm });
        if (r.gained) return `Ten Torment points become a permanent point: Torment ${r.perm}.${r.lost ? " Torment 10: consumed, the character leaves play." : r.perm >= 7 && r.perm <= 10 ? ` A high-Torment power of the form may be added (${D.highSlots(r.perm)}).` : ""}`;
        return `+${k} temporary Torment (${r.temp}).`;
    }
    const revealLine = (spent) => { const d = D.revelationDifficulty(spent); return d ? `Revelation: mortals who witness it roll Perception + Awareness at ${d} (Faith used this scene: ${spent}).` : `Revelation: Faith used this scene ${spent}: every mortal present sees the demon's true nature.`; };

    /* -- evocation --------------------------------------------------- */
    const attrOpts = sel => `<option value="">as the evocation</option>` + ATTRS.map(k => `<option value="${k}"${k === sel ? " selected" : ""}>${cap(k)}</option>`).join("");
    function abilOpts(actor, sel) {
        const list = (ctx.traits?.(actor) ?? []).filter(t => !ATTRS.includes(t.key));
        return `<option value="">as the evocation</option>` + list.map(t => `<option value="${esc(t.key)}"${t.key === sel ? " selected" : ""}>${esc(t.label)} ${t.value}</option>`).join("");
    }
    const traitVal = (actor, k) => ATTRS.includes(k) ? ctx.attr(actor, k) : n(ctx.findAbility?.(actor, k)?.value);

    async function evoke(actor, { evocation = null } = {}) {
        const i = info(actor);
        const known = D.evocationsKnown(i.lores);
        if (!known.length) notify(`${actor.name} has no lore on the sheet: add Lore powers named for their paths (for example "Lore of Flame"), or set them in the WoDX box.`);
        const opt = e => `${e.lore}:${e.level}`;
        const thralls = i.thralls.filter(t => !t.broken);
        const content = `<form>
          <p><b>${esc(actor.name)}</b> — Faith ${i.faith.temp}/${i.faith.perm}, Torment ${i.torment.perm} (${i.torment.temp})${i.spent ? `, Faith used this scene ${i.spent}` : ""}.</p>
          <div class="form-group"><label>Evocation</label>${known.length > 5 ? searchBox("select[name=evo]", "Search evocations…", "Search evocations") : ""}<select name="evo">${known.map(e => `<option value="${opt(e)}"${evocation === opt(e) ? " selected" : ""}>Lore of ${esc(D.LORES[e.lore].label.replace(/^the /, ""))} ${"•".repeat(e.level)} ${esc(e.name)} (${e.attr ? cap(e.attr) : "?"} + ${e.ability ? abil(e.ability) : "?"}${e.faith ? ", 1 Faith" : ""})</option>`).join("")}</select></div>
          <div class="form-group"><label>Attribute</label><select name="attr" data-fixed>${attrOpts("")}</select></div>
          <div class="form-group"><label>Ability</label>${searchBox("select[name=abil]", "Search Abilities…", "Search Abilities")}<select name="abil">${abilOpts(actor, "")}</select></div>
          <div class="form-group"><label>Faith for successes</label><input type="number" name="fs" min="0" max="${i.faith.temp}" value="0"/></div>
          ${thralls.length ? `<div class="form-group"><label>Ravage thralls (dice, up to ${i.faith.perm})</label><input type="number" name="rav" min="0" max="${i.faith.perm}" value="0"/></div>
          <div class="form-group"><label>From</label>${thralls.length > 5 ? searchBox("select[name=from]", "Search thralls…", "Search thralls") : ""}<select name="from">${thralls.map((t, k) => `<option value="${k}">${esc(t.name)} (Willpower ${n(t.willpower)})</option>`).join("")}</select></div>` : ""}
          <div class="form-group"><label>Unbelievers' successes (+difficulty)</label><input type="number" name="unb" min="0" max="5" value="0"/></div>
          <div class="form-group"><label>Storyteller's modifier</label><input type="number" name="mod" min="-3" max="3" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="dark"/> Choose the high-Torment effect (a temporary Torment point)</label></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div>
        </form>`;
        return dialog(`Evoke — ${actor.name}`, content, "Evoke", async fd => {
            const [lore, lvl] = String(fd.evo || "").split(":");
            const e = known.find(x => x.lore === lore && x.level === n(lvl));
            if (!e) { notify(`${actor.name}: choose an evocation.`); return null; }
            const ak = fd.attr || e.attr, bk = fd.abil || e.ability;
            if (!ak || !bk) { notify(`${e.name}: the book names no clear pool; choose the Attribute and Ability.`); return null; }
            const plan = D.evocationPlan({ attr: traitVal(actor, ak), ability: traitVal(actor, bk), level: e.level, loreRating: i.lores[lore], faithCost: e.faith, faithSpent: n(fd.fs),
                ravage: thralls.length ? n(fd.rav) : 0, permFaith: i.faith.perm, faithPool: i.faith.temp, unbelievers: n(fd.unb), mod: n(fd.mod) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            // An empty pool: ravaged thralls stand in for the Faith the evocation needs (p. 169)
            const fromPool = plan.ravaged ? Math.min(plan.cost, i.faith.temp) : plan.cost;
            if (fromPool && !(await faith(actor, -fromPool))) return null;
            if (plan.cost > fromPool) plan.notes.push(`${plan.cost - fromPool} Faith drawn from the ravaged thralls`);
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp, autoSuccesses: plan.autoSuccesses });
            const out = D.evocationOutcome(r, { torment: i.torment.perm, chooseHigh: !!fd.dark, rule: i.rule });
            const notes = [];
            if (out.faithLoss) { await faith(actor, -1); notes.push("The botch costs a Faith point."); }
            if (out.tormentGain) notes.push(await torment(actor, out.tormentGain));
            if (plan.ravaged) {
                const k = n(fd.from), t = thralls[k];
                const rv = D.ravageThrall(t, plan.ravaged);
                const all = i.thralls.map(x => x === t ? { ...x, willpower: rv.willpower, deranged: x.deranged || rv.derangement } : x);
                await saveFlag(actor, { thralls: all });
                notes.push(`${t.name} pays: −${rv.wpLoss} Willpower${rv.lethal ? `, ${rv.lethal} unsoakable lethal ${rv.lethal === 1 ? "level" : "levels"}` : ""}${rv.derangement ? "; their Willpower is gone: a derangement" : ""}.`);
            }
            const head = `Lore of ${esc(D.LORES[lore].label.replace(/^the /, ""))} ${"•".repeat(e.level)} ${esc(e.name)}`;
            let body = rollBlock(`${cap(ak)} + ${abil(bk)}`, r, [...plan.notes, ...(wp ? ["Willpower"] : [])]);
            body += out.effect === "botch" ? `<div class="vta-big bad">${head}: it botches.</div>`
                : out.effect === "none" ? `<div class="vta-big">${head}: nothing happens.</div>`
                : out.effect === "high" ? `<div class="vta-big bad">${head}: the high-Torment effect${out.chosen ? ", chosen" : " — Torment twists it"} (${r.successes} success${r.successes === 1 ? "" : "es"}).</div>`
                : `<div class="vta-big good">${head}: ${r.successes} success${r.successes === 1 ? "" : "es"}, as intended.</div>`;
            for (const x of notes.filter(Boolean)) body += `<div class="vta-note">${esc(x)}</div>`;
            body += `<div class="vta-res">${esc(revealLine(info(actor).spent))}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 161, 169–171, ${D.LORES[lore].page}</div>`;
            return post(actor, `${actor.name} evokes ${e.name}`, body, [r.roll].filter(Boolean));
        }, { width: 560 });
    }

    /* -- the apocalyptic form ---------------------------------------- */
    async function form(actor) {
        const i = info(actor);
        const slots = D.highSlots(i.torment.perm);
        const look = D.visageLook(i.torment.perm, i.willpower.perm);
        const row = (p, k, kind, off) => `<div class="form-group"><label><input type="checkbox" name="${kind}${k}"${off ? "" : " checked"}/> ${esc(p)}</label></div>`;
        const content = `<form>
          <p><b>${esc(actor.name)}</b> — ${esc(i.visage || "no visage set")}; Faith ${i.faith.temp}/${i.faith.perm}, Torment ${i.torment.perm}.</p>
          <fieldset><legend>Powers</legend>${i.forms.low.map((p, k) => row(p, k, "lo", false)).join("") || "<p>No form powers on the sheet.</p>"}</fieldset>
          <fieldset><legend>High-Torment powers (${slots} gained at Torment ${i.torment.perm})</legend>${i.forms.high.map((p, k) => k < slots ? row(p, k, "hi", false)
            : `<div class="form-group"><label><input type="checkbox" name="peril${k}"/> ${esc(p)} <small>(in peril: for the scene, a Torment point)</small></label></div>`).join("")}</fieldset>
          <div class="form-group"><label><input type="checkbox" name="spend" checked/> Spend a Faith point (no roll)</label></div>
        </form>`;
        return dialog(`Apocalyptic form — ${actor.name}`, content, "Manifest", async fd => {
            const spend = !!fd.spend;
            let r = null;
            if (spend) { if (!(await faith(actor, -1))) return null; }
            else r = await rollPool(i.faith.temp, 6);
            const out = D.formOutcome(r ?? {}, spend);
            const notes = [];
            if (!spend && out.faithLoss) { await faith(actor, -1); notes.push("The botch costs a Faith point."); }
            const chosen = [...i.forms.low.filter((_, k) => fd[`lo${k}`]), ...i.forms.high.filter((_, k) => k < slots && fd[`hi${k}`])];
            const peril = i.forms.high.filter((_, k) => k >= slots && fd[`peril${k}`]);
            if (out.ok && peril.length) notes.push(await torment(actor, peril.length));
            let body = r ? rollBlock("Faith pool", r) : `<div class="vta-sec">A Faith point is spent: the change is certain.</div>`;
            if (out.ok) {
                await saveFlag(actor, { formScene: sceneKey(), form: [...chosen, ...peril] });
                body += `<div class="vta-big good">${esc(i.visage || "The apocalyptic form")} rises for the scene.</div>`;
                if (chosen.length || peril.length) body += `<div class="vta-res">${esc([...chosen, ...peril].join(", "))}.</div>`;
                body += `<div class="vta-note">${look === "glorious" ? "Witnesses see a glorious, awe-inspiring being." : look === "nightmarish" ? "Witnesses see a living nightmare." : "Witnesses see awe or terror, as their own minds take it."} Every mortal present suffers Revelation (Willpower against Faith ${i.faith.perm}). Stamina now soaks lethal damage.</div>`;
            } else body += `<div class="vta-big">The mortal shell holds; no change.</div>`;
            for (const x of notes.filter(Boolean)) body += `<div class="vta-note">${esc(x)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 162, 170–171, 254</div>`;
            return post(actor, `${actor.name}: the apocalyptic form`, body, [r?.roll].filter(Boolean));
        });
    }

    /* -- Revelation, a witness -------------------------------------- */
    async function revelation(actor) {
        const i = info(actor);
        const content = `<form><p>${esc(revealLine(i.spent))}</p>
          <div class="form-group"><label>A witness's Willpower (rolled against Faith ${i.faith.perm})</label><input type="number" name="wp" min="1" max="10" value="3"/></div>
          <div class="form-group"><label>Witness's name</label><input type="text" name="who" value=""/></div></form>`;
        return dialog(`Revelation — ${actor.name}`, content, "Roll for the witness", async fd => {
            const r = await rollPool(n(fd.wp), Math.max(2, i.faith.perm || 6));
            const re = D.mortalReaction(r);
            const who = fd.who || "The witness";
            const body = rollBlock(`${esc(who)}: Willpower`, r) + `<div class="vta-res ${re.key === "copes" ? "" : "bad"}">${esc(who)} ${esc(re.text)}.</div>`
                + `<div class="vta-note">${esc(D.visageLook(i.torment.perm, i.willpower.perm) === "glorious" ? "What they see is glorious." : D.visageLook(i.torment.perm, i.willpower.perm) === "nightmarish" ? "What they see is a nightmare." : "What they see is awful or wondrous, by their own lights.")} A Revelation alone never reaps Faith.</div><div class="wodx-quiet">${REF} pp. 253–254</div>`;
            return post(actor, `${actor.name}: Revelation`, body, [r.roll].filter(Boolean));
        });
    }

    /* -- reaping and thralls ----------------------------------------- */
    async function reap(actor) {
        const i = info(actor);
        const content = `<form><p>Reaping needs an act that makes one mortal believe — love or terror, not a glimpse (p. 250).</p>
          <div class="form-group"><label>The mortal's Willpower</label><input type="number" name="mwp" min="1" max="10" value="3"/></div>
          <div class="form-group"><label><input type="checkbox" name="res"/> The act strikes the mortal's own beliefs or history (two points)</label></div>
          <div class="form-group"><label>How</label><input type="text" name="how" value=""/></div></form>`;
        return dialog(`Reap Faith — ${actor.name}`, content, "Reap", async fd => {
            const me = await rollPool(i.willpower.perm, 7), them = await rollPool(n(fd.mwp), 7);
            const out = D.reapOutcome(me.successes, them.successes, { resonant: !!fd.res });
            if (out.faith) await faith(actor, out.faith, { spend: false });
            const body = rollBlock(`${esc(actor.name)}: Willpower`, me) + rollBlock("The mortal: Willpower", them)
                + (fd.how ? `<div class="vta-parts">${esc(fd.how)}</div>` : "")
                + `<div class="vta-res ${out.faith ? "good" : ""}">${out.faith ? `+${out.faith} Faith.` : "The mortal's disbelief holds; no Faith."}</div><div class="wodx-quiet">${REF} p. 250</div>`;
            return post(actor, `${actor.name} reaps Faith`, body, [me.roll, them.roll].filter(Boolean));
        });
    }
    /** Thralls: name, Faith potential, the daily offering, Willpower. One line each: "Name | potential | offered | willpower". */
    async function thralls(actor) {
        const i = info(actor);
        const lines = i.thralls.map(t => `${t.name} | ${n(t.potential)} | ${n(t.offered)} | ${n(t.willpower)}${t.broken ? " | broken" : ""}`).join("\n");
        const content = `<form><p>One thrall a line: <b>name | Faith potential | Faith offered each dawn | Willpower</b> (add "| broken" for a pact the demon has broken).
          A thrall can offer up to half the potential, rounded up; the rest buys gifts (p. 253).</p>
          <div class="form-group"><textarea name="t" rows="7" style="width:100%">${esc(lines)}</textarea></div>
          <p class="wodx-quiet">Potential: ${D.POTENTIAL.map((t, k) => `${k} ${esc(t)}`).join("; ")}.</p></form>`;
        return dialog(`Thralls — ${actor.name}`, content, "Save", async fd => {
            const list = String(fd.t || "").split(/\n+/).map(l => l.split("|").map(x => x.trim())).filter(p => p[0])
                .map(([name, pot, off, wp, br]) => ({ name, potential: Math.max(0, Math.min(5, n(pot))), offered: Math.min(D.offerCap(n(pot)), Math.max(0, n(off))), willpower: n(wp), broken: /broken/i.test(br ?? "") }));
            await saveFlag(actor, { thralls: list, lastDawn: flag(actor).lastDawn ?? dawnDay() });
            const body = `<div class="vta-sec">${list.length ? list.map(t => `<div>${esc(t.name)}: potential ${t.potential}, offers ${t.offered} Faith at dawn${t.broken ? " (pact broken)" : ""}</div>`).join("") : "No thralls."}</div>`
                + `<div class="vta-res">Each dawn: +${D.dawnOffering(list)} Faith.</div><div class="wodx-quiet">${REF} pp. 250–253</div>`;
            return post(actor, `${actor.name}'s thralls`, body);
        });
    }

    /* -- Torment ------------------------------------------------------ */
    async function sin(actor) {
        const i = info(actor);
        const rows = D.SINS.filter(([row]) => D.sinCounts(i.torment.perm, row));
        const content = `<form><p>At Torment ${i.torment.perm}, these acts still risk Torment (p. 159).</p>
          <div class="form-group"><label>The act</label><select name="row" data-fixed>${rows.map(([row, t]) => `<option value="${row}">${row}: ${esc(t)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Virtue</label><select name="v" data-fixed>${Object.entries(D.SIN_VIRTUE).map(([k, t]) => `<option value="${k}">${cap(k)} ${i.virtues[k]} — ${esc(t)}</option>`).join("")}</select></div></form>`;
        if (!rows.length) { notify(`${actor.name} is past sin.`); return null; }
        return dialog(`A sin — ${actor.name}`, content, "Roll the Virtue", async fd => {
            const r = await rollPool(i.virtues[fd.v], 8, { canBotch: false });
            const out = D.sinOutcome(r);
            const note = out.torment ? await torment(actor, 1) : "";
            const body = rollBlock(`${cap(fd.v)} (no Willpower, no botch)`, r) + `<div class="vta-res ${out.torment ? "bad" : "good"}">${out.torment ? esc(note) : "Remorse: the demon will not give in. No Torment."}</div><div class="wodx-quiet">${REF} pp. 159, 161</div>`;
            return post(actor, `${actor.name} sins`, body, [r.roll].filter(Boolean));
        });
    }
    async function kindness(actor) {
        const i = info(actor);
        const content = `<form><p>A truly selfless act, with nothing to gain (p. 161). The Storyteller judges it.</p>
          <div class="form-group"><label>Virtue</label><select name="v" data-fixed>${[["conscience", "a sacrifice because it is right"], ["conviction", "true to belief at great cost"], ["courage", "valor for another's sake"]].map(([k, t]) => `<option value="${k}">${cap(k)} ${i.virtues[k]} — ${t}</option>`).join("")}</select></div></form>`;
        return dialog(`An act of kindness — ${actor.name}`, content, "Roll", async fd => {
            const v = await rollPool(i.virtues[fd.v], 6), t = await rollPool(i.torment.perm, 6);
            const out = D.kindnessOutcome(v.successes, t.successes);
            const note = out.torment ? await torment(actor, -1) : "";
            const body = rollBlock(cap(fd.v), v) + rollBlock("Torment", t) + `<div class="vta-res ${out.torment ? "good" : ""}">${out.torment ? `A shadow of what the demon was: ${esc(note)}` : out.tie ? "A tie: nothing changes." : "Cynicism wins: Torment stays."}</div>`
                + `<div class="wodx-quiet">${REF} p. 161 (resisted at 6: the book sets no difficulty)</div>`;
            return post(actor, `${actor.name}: an act of kindness`, body, [v.roll, t.roll].filter(Boolean));
        });
    }

    /* -- healing, the holy, names, illusion --------------------------- */
    async function heal(actor) {
        const t = ctx.healthTrack(actor);
        const content = `<form><p>${t.damage.bashing}B / ${t.damage.lethal}L / ${t.damage.aggravated}A. A full turn of stillness; one point a turn (p. 248).</p>
          <div class="form-group"><label>Heal</label><select name="w" data-fixed><option value="bashing">all bashing (1 Faith)</option><option value="lethal">one lethal level (1 Faith)</option></select></div></form>`;
        return dialog(`Faith heals — ${actor.name}`, content, "Heal", async fd => {
            const out = D.faithHeal(t.damage, fd.w);
            if (!out.ok) { notify(`${actor.name}: ${out.why}.`); return null; }
            if (!(await faith(actor, -1))) return null;
            await ctx.setDamage(actor, out.damage);
            return post(actor, `${actor.name} heals with Faith`, `<div class="vta-res good">${fd.w === "bashing" ? `All ${out.healed} bashing levels close.` : "One lethal level heals."}</div><div class="vta-note">Wounded during the turn, the attempt fails (no Faith lost). Aggravated wounds heal only with time.</div><div class="wodx-quiet">${REF} pp. 171, 248</div>`);
        });
    }
    async function holy(actor) {
        const i = info(actor);
        const content = `<form><div class="form-group"><label>What</label><select name="k" data-fixed><option value="g">Holy ground</option><option value="o">A sacred object against the skin</option></select></div>
          <div class="form-group"><label>Its Faith potential (1–5)</label><input type="number" name="p" min="1" max="5" value="1"/></div></form>`;
        return dialog(`The holy — ${actor.name}`, content, "Apply", async fd => {
            const h = D.holy(i.torment.perm, n(fd.p), { ground: fd.k === "g" });
            let body = `<div class="vta-sec">Torment ${i.torment.perm}; potential ${n(fd.p)}.</div>`, rolls = [];
            if (!h.harmed) body += `<div class="vta-res good">${esc(h.why)}.</div>`;
            else {
                const d = await ctx.applyDamage(actor, "lethal", h.lethal);
                body += `<div class="vta-res bad">${h.lethal} lethal ${h.lethal === 1 ? "level" : "levels"}: seared flesh and stigmata; ${esc(h.why)}.</div>`;
                if (h.stayRoll) {
                    const r = await rollPool(i.willpower.perm, 6); rolls.push(r.roll);
                    body += rollBlock("Willpower to stay", r) + `<div class="vta-res">${r.successes ? "It endures the turn." : "It flees the holy place."}</div>`;
                }
                if (d?.condition?.text) body += `<div class="vta-note">${esc(d.condition.text)}</div>`;
            }
            return post(actor, `${actor.name} meets the holy`, body + `<div class="wodx-quiet">${REF} pp. 254–255</div>`, rolls.filter(Boolean));
        });
    }
    async function named(actor) {
        const i = info(actor);
        const content = `<form><div class="form-group"><label>The name spoken</label><select name="k" data-fixed><option value="7">the Celestial Name (7)</option><option value="6">the True Name (6)</option></select></div></form>`;
        return dialog(`A name is spoken — ${actor.name}`, content, "Listen", async fd => {
            if (i.faith.temp < 1) { notify(`${actor.name} needs a Faith point in the pool to listen.`); return null; }
            const r = await rollPool(i.faith.perm, n(fd.k));
            const body = rollBlock("Faith", r) + `<div class="vta-res">${r.successes ? esc(D.INVOKED[Math.min(3, r.successes)]) + (r.successes >= 3 ? "; each further turn, Willpower at 8 to keep listening" : "") : "Only the tug of the name."}</div><div class="wodx-quiet">${REF} p. 171</div>`;
            return post(actor, `${actor.name} hears a name`, body, [r.roll].filter(Boolean));
        });
    }
    async function illusion(actor) {
        const content = `<form><p>Against another demon, the difficulty is its Faith or Torment, the higher (p. 171).</p>
          <div class="form-group"><label>The other demon's Faith</label><input type="number" name="f" min="0" max="10" value="0"/></div>
          <div class="form-group"><label>Its Torment</label><input type="number" name="t" min="0" max="10" value="0"/></div></form>`;
        return dialog(`See through illusion — ${actor.name}`, content, "Roll", async fd => {
            const diff = D.illusionDifficulty(n(fd.f), n(fd.t));
            const r = await rollPool(ctx.attr(actor, "perception") + n(ctx.findAbility?.(actor, "alertness")?.value), diff);
            const body = rollBlock("Perception + Alertness", r) + `<div class="vta-res ${r.successes ? "good" : ""}">${r.successes ? "The artifice falls away." : "The illusion holds."}</div><div class="wodx-quiet">${REF} p. 171</div>`;
            return post(actor, `${actor.name} looks past the veil`, body, [r.roll].filter(Boolean));
        });
    }

    /** Dawn (p. 251): each thrall's offering arrives once a day, here at 06:00 world time. Called by the world-time hook (GM). */
    async function daily(actors = game.actors?.filter?.(isDemon) ?? []) {
        const day = dawnDay();
        for (const a of actors) {
            const f = flag(a);
            if (f.lastDawn === day || !(f.thralls ?? []).length) continue;
            const k = D.dawnOffering(f.thralls);
            await saveFlag(a, { lastDawn: day });
            if (k && f.lastDawn !== undefined) await faith(a, k, { spend: false });
        }
    }

    return { info, evoke, form, revelation, reap, thralls, sin, kindness, heal, holy, named, illusion, daily, faith, torment, isDemon, rules: D };
}
