/**
 * WoDX Actions 3.4 — hunters and the faithful (B42, B45).
 *
 *   Inquisitors (the Dark Ages, Dark Ages: Inquisitor): order and Superior Virtues, Conviction and Piety, Blessings
 *     with Conviction risked, Virtue rolls (terror, thralldom, memory, the Impulse), sins against God, prayer, relics,
 *     cashing Conviction in, Callousness.
 *   True Faith in every era: the Dark Ages book's rules or The Hunters Hunted II's (repel, resist, the powers by dot, loss).
 *   Numina (The Hunters Hunted II): hedge paths and psychic phenomena.
 *   The imbued (1999 on, Hunter: The Reckoning): reckoning.js.
 *
 * Built by main.js with its helpers (ctx). Pure rules: hunter-rules.js.
 */

import { spendTime } from "./spend-time.js";
import * as H from "./hunter-rules.js";
import * as P from "./profiles.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";
import * as EF from "./effects.js";
import * as IB from "./inq-blessings.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const ATTR = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const attrOpts = sel => ATTR.map(a => `<option value="${a}" ${a === sel ? "selected" : ""}>${cap(a)}</option>`).join("");

/** The rule line the chronicle's era and year call for. */
export function lineNow() {
    const eras = game.modules.get("wodx-chronicle")?.api?.eras;
    let id = null, year = null, futureBranch = false;
    try { id = eras?.activeEra?.()?.profile?.id ?? null; year = eras?.currentYear?.() ?? null; } catch (e) { /* no chronicle */ }
    try { futureBranch = !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { futureBranch = false; }
    return H.hunterLine(id, year, { futureBranch });
}

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, attr, findAbility, spendWillpower, virtues, updateActor } = ctx;

    /* ---------------- the inquisitor's sheet ---------------- */

    function inq(actor) {
        const f = actor.getFlag(MOD, "inquisitor") ?? {};
        const v = virtues(actor);
        const conv = P.resource(actor, "conviction");
        return {
            order: f.order ?? "", faith: n(f.faith), wisdom: n(f.wisdom), zeal: n(f.zeal),
            piety: f.piety === undefined ? v.conscience.value + v.selfcontrol.value : n(f.piety),
            conviction: conv.ok ? conv.value : n(f.conviction), convOnSheet: conv.ok,
            banked: n(f.banked), exposure: ctx.background(actor, "exposure"),
            v: { conscience: v.conscience.value, selfcontrol: v.selfcontrol.value, courage: v.courage.value }, f
        };
    }
    const isInquisitor = actor => !!actor?.getFlag(MOD, "inquisitor");
    async function setInq(actor, patch) { return ctx.setFlag(actor, "inquisitor", { ...(actor.getFlag(MOD, "inquisitor") ?? {}), ...patch }); }
    async function setConviction(actor, value) {
        const i = inq(actor), to = Math.max(0, Math.min(10, n(value)));
        if (i.convOnSheet) { await P.adjust(actor, "conviction", to - i.conviction, { note: false }); }
        else await setInq(actor, { conviction: to });
        if (H.callous(to, i.piety) && !H.callous(i.conviction, i.piety)) await post(actor, `${actor.name} grows Callous`, `<div class="vta-warn">Conviction ${to} is above Piety ${i.piety}: Empathy rolls +2 difficulty; when their Impulse applies, Conscience + Faith at 6 to resist it (Dark Ages: Inquisitor p. 162).</div>`);
        return to;
    }
    const stage = i => H.stageOf(i);

    async function inquisitorSheet(actor) {
        const i = inq(actor);
        const content = `<form><p>Dark Ages: Inquisitor traits WoDX keeps for <b>${esc(actor.name)}</b> (the sheet has no fields for them). Conviction ${i.convOnSheet ? "is on the sheet" : "is kept here too"}.</p>
          <div class="form-group"><label>Order</label><select name="order" data-fixed><option value="">—</option>${Object.entries(H.ORDERS).map(([k, o]) => `<option value="${k}" ${k === i.order ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Faith / Wisdom / Zeal</label><input type="number" name="faith" value="${i.faith}" min="0" max="5" style="width:4em"/> <input type="number" name="wisdom" value="${i.wisdom}" min="0" max="5" style="width:4em"/> <input type="number" name="zeal" value="${i.zeal}" min="0" max="5" style="width:4em"/></div>
          <div class="form-group"><label>Piety</label><input type="number" name="piety" value="${i.piety}" min="0" max="10"/></div>
          <div class="form-group"><label>Conviction</label><input type="number" name="conviction" value="${i.conviction}" min="0" max="10"/></div>
          <div class="form-group"><label><input type="checkbox" name="start"/> New character: set Conviction, Piety and Willpower from the Virtues (Dark Ages: Inquisitor p. 147)</label></div></form>`;
        return dialog(`Inquisitor: ${actor.name}`, content, "Save", async fd => {
            const sv = { faith: Math.min(n(fd.faith), i.v.conscience), wisdom: Math.min(n(fd.wisdom), i.v.selfcontrol), zeal: Math.min(n(fd.zeal), i.v.courage) };
            const clipped = sv.faith < n(fd.faith) || sv.wisdom < n(fd.wisdom) || sv.zeal < n(fd.zeal);
            let piety = n(fd.piety), conv = n(fd.conviction), html = "";
            if (fd.start) {
                const s = H.inquisitorStart(i.v, sv, H.ORDERS[fd.order]?.primary ?? "faith");
                piety = s.piety; conv = s.conviction;
                await updateActor(actor, { "system.advantages.willpower.permanent": s.willpower, "system.advantages.willpower.temporary": s.willpower });
                html += `<div class="vta-note">Starting Conviction ${s.conviction}, Piety ${s.piety}, Willpower ${s.willpower}.</div>`;
            }
            await setInq(actor, { order: fd.order, ...sv, piety });
            await setConviction(actor, stage(sv) === "servant" ? Math.min(1, conv) : conv);
            const st = stage(sv);
            return post(actor, `${actor.name}: inquisitor`, `${html}<div class="vta-sec">${esc(H.ORDERS[fd.order]?.label ?? "No order")} · ${H.STAGE_LABEL[st]} (True Faith equivalent ${H.STAGE_FAITH[st]}) · Faith ${sv.faith}, Wisdom ${sv.wisdom}, Zeal ${sv.zeal} · Piety ${piety}</div>${clipped ? `<div class="vta-warn">A Superior Virtue can't pass its Virtue (Dark Ages: Inquisitor p. 157): lowered.</div>` : ""}<div class="wodx-quiet">Dark Ages: Inquisitor pp. 146–158</div>`);
        });
    }

    /** Spend 1 Conviction (null when there is none). */
    async function spendConv(actor, k = 1) {
        const i = inq(actor);
        if (i.conviction < k) { ctx.notify(`${actor.name} has only ${i.conviction} Conviction.`); return null; }
        return setConviction(actor, i.conviction - k);
    }

    /* ---------------- Blessings ---------------- */

    function blessingsOn(actor) {
        return [...actor.items].filter(it => it.type === "Power" || (it.type === "Feature" && /merit/.test(it.system?.type ?? "") === false && /blessing|orison|endowment/i.test(it.name)))
            .filter(it => it.type !== "Power" || !/discipline|gift|arcanoi|sphere|art\b/.test(it.system?.type ?? ""))
            .map(it => ({ id: it.id, name: it.name, value: n(it.system?.value) }));
    }

    async function blessing(actor) {
        const i = inq(actor);
        if (i.conviction < 1) return ctx.notify(`${actor.name} has no Conviction: no Blessings until it returns (Dark Ages: Inquisitor p. 161).`);
        const list = blessingsOn(actor);
        const risked = actor.getFlag(MOD, "riskScene") === sceneKey();
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}, Piety ${i.piety}${H.callous(i.conviction, i.piety) ? " (<b>Callous</b>)" : ""}; Faith ${i.faith}, Wisdom ${i.wisdom}, Zeal ${i.zeal}.</p>
          <div class="form-group"><label>From the book</label>${searchBox("select[name=bk]", "Search the book's Blessings…", "Search the book's Blessings")}<select name="bk" data-fixed><option value="">(none: set the roll by hand)</option>${IB.BLESSINGS.map(b => `<option value="${b.id}">${esc(b.kind)} · ${esc(b.use)}: ${esc(b.name)}</option>`).join("")}</select></div>
          <div class="wodx-bless-info wodx-quiet"></div>
          <div class="form-group"><label>Blessing</label>${list.length > 5 ? searchBox("select[name=b]", "Search Blessings…", "Search Blessings") : ""}<select name="b" data-fixed><option value="">— another (type its name) —</option>${list.map(b => `<option value="${esc(b.name)}">${esc(b.name)}</option>`).join("")}</select> <input type="text" name="other" placeholder="Name"/></div>
          <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${H.ENDOWMENT_KINDS.map(k => `<option>${k}</option>`).join("")}</select></div>
          <div class="form-group"><label>Application</label><select name="sv" data-fixed>${Object.entries(H.SUPERIOR_LABEL).map(([k, l]) => `<option value="${k}">${l} (${i[k]})</option>`).join("")}<option value="path">A Holy Art path (rating below)</option><option value="virtue">A basic Virtue (Orisons)</option></select></div>
          <div class="form-group"><label>Attribute</label><select name="attr" data-fixed>${attrOpts("perception")}</select> <label>path or Virtue rating</label> <input type="number" name="rating" value="0" min="0" max="10" style="width:4em"/></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="6" min="2" max="10"/> <label>Conviction to spend</label> <input type="number" name="cost" value="1" min="0" max="3" style="width:4em"/></div>
          <div class="form-group"><label>Conviction to risk (1–3, once a scene)</label><input type="number" name="risk" value="0" min="0" max="3" ${risked ? "disabled" : ""}/> ${risked ? "<i>already risked this scene</i>" : ""}</div>
          <div class="form-group"><label><input type="checkbox" name="noroll"/> No roll (the page says so)</label></div></form>`;
        const fillBk = root => {
            const b = IB.blessingById(root.querySelector("[name=bk]")?.value), box = root.querySelector(".wodx-bless-info");
            if (!b) { if (box) box.textContent = ""; return; }
            const set = (k, v) => { const el = root.querySelector(`[name=${k}]`); if (el) { if (el.type === "checkbox") el.checked = !!v; else el.value = v; } };
            const rp = IB.rollParts(b);
            set("kind", b.kind); set("noroll", !b.roll); set("cost", Math.min(3, b.cost));
            if (rp.attr) set("attr", rp.attr);
            set("sv", rp.sv || "faith");
            if (rp.sv === "virtue") set("rating", i.v[rp.trait] ?? n(findAbility(actor, rp.trait)?.value));
            set("diff", typeof b.diff === "number" ? b.diff : b.diff === "piety" ? Math.max(2, Math.min(10, i.piety)) : 6);
            if (box) box.textContent = `${b.fx} Cost: ${b.cost} Conviction${b.wp ? " and a Willpower point" : ""}.${b.diff === "t" ? " Difficulty: the target's Willpower, or the roll is opposed." : b.diff === "var" ? " The Storyteller sets the difficulty." : ""}${b.stage ? ` Needs the ${b.stage} stage.` : ""} ${IB.REF} p. ${b.p}.`;
        };
        return dialog(`A Blessing: ${actor.name}`, content, "Invoke", async fd => {
            const bk = IB.blessingById(fd.bk) ?? IB.blessingByName(fd.other?.trim() || fd.b);
            const name = fd.other?.trim() || fd.b || bk?.name || "A Blessing";
            const effectsOf = got => {
                if (!bk) return { html: "", items: [] };
                let html = `<div class="vta-sec"><b>${esc(bk.name)}</b>: ${esc(bk.fx)}</div>`, items = [];
                if (got > 0 && EF.isOn()) {
                    const pp = EF.planOf(actor, IB.blessingResults(bk, got, { source: `${IB.REF} p. ${bk.p}` }), got);
                    html += pp.html; items = pp.items.filter(x => x.route !== "off" && x.route !== "st");
                }
                return { html, items };
            };
            const fxCard = items => items.length ? { kind: "effects", caster: actor.name, items } : undefined;
            const gain = async got => {
                const g = IB.convictionGain(bk, got, { piety: i.piety, zeal: i.zeal });
                if (!g) return "";
                const now = inq(actor).conviction, to = bk.spec?.kind === "conv" ? Math.max(now, Math.min(i.piety, now + g)) : now + g;
                await setConviction(actor, to);
                return `<div class="vta-res good">+${to - now} Conviction (now ${to}).</div>`;
            };
            const cost = n(fd.cost), risk = risked ? 0 : Math.min(3, n(fd.risk));
            if (cost + risk > i.conviction) return ctx.notify(`Not enough Conviction (${i.conviction}).`);
            let after = i.conviction - cost;
            await setConviction(actor, after);
            if (fd.noroll) { const E = effectsOf(1); return post(actor, `${actor.name}: ${esc(name)}`, `<div class="vta-note">${cost} Conviction.${bk ? "" : " See Dark Ages: Inquisitor, Chapter Five, for its effect."}</div>${E.html}${await gain(1)}${bk ? `<div class="wodx-quiet">${IB.REF} p. ${bk.p}</div>` : ""}`, [], fxCard(E.items)); }
            const rating = fd.sv === "path" || fd.sv === "virtue" ? n(fd.rating) : i[fd.sv];
            const dice = attr(actor, fd.attr) + rating + risk;
            const r = await rollPool(dice, fd.diff);
            let body = rollBlock(`${cap(fd.attr)} + ${fd.sv === "path" ? "path" : fd.sv === "virtue" ? "Virtue" : H.SUPERIOR_LABEL[fd.sv]}${risk ? ` + ${risk} risked` : ""}`, r, [cost ? `${cost} Conviction spent` : ""].filter(Boolean));
            if (risk) {
                const R = H.riskConviction(risk, r, after);
                await actor.setFlag(MOD, "riskScene", sceneKey());
                await setConviction(actor, R.after);
                body += `<div class="vta-res ${r.successes > 0 && !r.botch ? "good" : "bad"}">Risked ${risk}: Conviction ${after} → ${R.after}${R.lostAll ? " (a botch: all of it lost)" : ""} (Dark Ages: Inquisitor p. 160).</div>`;
            }
            const got = r.botch ? 0 : r.successes, E = effectsOf(got);
            body += E.html + (got > 0 ? await gain(got) : "");
            return post(actor, `${actor.name}: ${esc(name)}`, body + `<div class="wodx-quiet">${esc(fd.kind)} · Dark Ages: Inquisitor, ${bk ? `p. ${bk.p}` : "Chapter Five"}</div>`, [r.roll], fxCard(E.items));
        }, { width: 540, render: root => { fillBk(root); root.querySelector("[name=bk]")?.addEventListener("change", () => fillBk(root)); return aim(root, { actor, power: r => { const nm = r.querySelector("[name=other]")?.value?.trim() || r.querySelector("[name=b]")?.value; return nm ? { id: nm, n: nm } : null; } }); } });
    }

    /* ---------------- Virtue rolls ---------------- */

    const sceneKey = () => `${canvas?.scene?.id ?? "none"}:${n(game.settings.get(MOD, "wraithScene"))}`;

    async function virtueRoll(actor) {
        const i = inq(actor);
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}; Faith ${i.faith}, Wisdom ${i.wisdom}, Zeal ${i.zeal}; Exposure ${i.exposure}. Only Conviction buys a success on these (Dark Ages: Inquisitor p. 160).</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed>
            <option value="danger">Terror: walk into danger (Courage + Zeal, 6)</option>
            <option value="supernatural">Terror: face the overtly supernatural (Courage + Zeal, 8 − Exposure)</option>
            <option value="fear">Resist a fear power (Courage + Zeal, 6; beat its successes)</option>
            <option value="thrall">Resist mind control (Self-Control + Wisdom, 6, opposed)</option>
            <option value="memory">Recall a stolen or buried memory (Self-Control + Wisdom, 6)</option>
            <option value="impulse">Resist the Impulse while Callous (Conscience + Faith, 6)</option>
            <option value="victory">A victory over the enemy (primary Superior Virtue + Virtue, 7)</option></select></div>
          <div class="form-group"><label>The power's successes (opposed)</label><input type="number" name="vs" value="0" min="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="conv"/> Spend 1 Conviction for a success</label></div></form>`;
        return dialog(`Virtue roll: ${actor.name}`, content, "Roll", async fd => {
            const map = { danger: ["courage", "zeal"], supernatural: ["courage", "zeal"], fear: ["courage", "zeal"], thrall: ["selfcontrol", "wisdom"], memory: ["selfcontrol", "wisdom"], impulse: ["conscience", "faith"] };
            let [vk, sk] = map[fd.k] ?? [];
            if (fd.k === "victory") { sk = H.ORDERS[i.order]?.primary ?? "faith"; vk = H.SUPERIOR[sk]; }
            let need = 0;
            if (H.needsConviction(i[sk]) && fd.k !== "victory" && fd.k !== "impulse") need = 1;
            if (need + (fd.conv ? 1 : 0) > i.conviction) return ctx.notify(need ? `Without ${H.SUPERIOR_LABEL[sk]}, the roll costs a Conviction point not on hand (Dark Ages: Inquisitor p. 162).` : "No Conviction to spend.");
            if (need + (fd.conv ? 1 : 0)) await setConviction(actor, i.conviction - need - (fd.conv ? 1 : 0));
            const diff = fd.k === "supernatural" ? H.terrorDifficulty("supernatural", i.exposure) : fd.k === "victory" ? 7 : 6;
            const r = await rollPool(i.v[vk] + i[sk], diff, { willpower: !!fd.conv });
            let body = rollBlock(`${cap(vk === "selfcontrol" ? "Self-Control" : vk)} + ${H.SUPERIOR_LABEL[sk]}`, r, [need ? "1 Conviction (no Superior Virtue)" : "", fd.conv ? "1 Conviction: a success" : ""].filter(Boolean));
            const s = r.botch ? 0 : r.successes;
            if (fd.k === "danger" || fd.k === "supernatural") {
                const T = H.terrorResult(fd.k, r);
                body += `<div class="vta-res ${T.penalty || T.flee ? "bad" : "good"}">${T.flee ? "Terror: flight from it, as fast as possible." : T.penalty ? `Terror: pressing on is possible, at −${T.penalty} dice to all pools ${fd.k === "supernatural" ? "until it is gone or the scene ends" : "for the scene"}.` : "The fear is mastered."}</div>`;
            } else if (fd.k === "fear" || fd.k === "thrall") {
                const won = s > n(fd.vs);
                body += `<div class="vta-res ${won ? "good" : "bad"}">${won ? "Resisted." : fd.k === "thrall" ? "Under its sway; roll again whenever it forces an act against their nature." : "The fear takes hold."}</div>`;
            } else if (fd.k === "victory") {
                const d = H.victoryDelta(r);
                if (d) await setConviction(actor, inq(actor).conviction + d);
                body += `<div class="vta-res">${d > 0 ? "+1 Conviction" : d < 0 ? "Shaken: −1 Conviction" : "No change"} (Dark Ages: Inquisitor p. 160).</div>`;
            } else if (fd.k === "impulse") body += `<div class="vta-res">${s ? "The Impulse is held back." : "The Impulse wins."}</div>`;
            else body += `<div class="vta-res">${s} success${s === 1 ? "" : "es"}: the more, the clearer the memory (it must beat a power's successes).</div>`;
            return post(actor, `${actor.name}: Virtue roll`, body + `<div class="wodx-quiet">Dark Ages: Inquisitor pp. 160–163</div>`, [r.roll]);
        });
    }

    async function sin(actor) {
        const i = inq(actor);
        const content = `<form><p><b>${esc(actor.name)}</b>: Piety ${i.piety}. Sins at or below their Piety call for the roll (Dark Ages: Inquisitor p. 159).</p>
          <div class="form-group"><label>The sin</label><select name="lvl" data-fixed>${H.PIETY_SINS.map(([l, t]) => `<option value="${l}" ${H.pietyAt(i.piety, l) ? "" : "disabled"}>${l}: ${esc(t)}</option>`).join("")}</select></div></form>`;
        return dialog(`A sin against God: ${actor.name}`, content, "Roll", async fd => {
            const c = H.callous(i.conviction, i.piety);
            const r = await rollPool(i.v.conscience + i.faith, H.pietyRoll({ callous: c }).difficulty);
            const out = H.pietyResult(r);
            if (out.conviction) await setConviction(actor, i.conviction + out.conviction);
            if (out.piety) await setInq(actor, { piety: Math.max(0, i.piety + out.piety) });
            await ctx.logEvent?.(actor, `Sin against God (${fd.lvl}): ${out.piety ? "Piety lost" : "confessed in their heart"}.`, "piety");
            return post(actor, `${actor.name}: a sin`, rollBlock(`Conscience + Faith${c ? " (Callous)" : ""}`, r) + `<div class="vta-res ${out.piety ? "bad" : ""}">${out.piety ? `Excused: Piety ${i.piety} → ${i.piety - 1}.` : "The sin is recognized: −1 Conviction (confession restores it)."}${out.curse ? " <b>A botch: roll for a new Curse (Dark Ages: Inquisitor p. 201).</b>" : ""}</div>`, [r.roll]);
        });
    }

    async function prayer(actor) {
        const i = inq(actor);
        const f = i.f, today = Math.floor(game.time.worldTime / 86400);
        if (f.prayerDay === today) return ctx.notify("Prayer renews Conviction once a day (Dark Ages: Inquisitor p. 160).");
        const run = f.prayerDay === today - 1 ? n(f.prayerRun) + 1 : 0;
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}, Piety ${i.piety} (prayer never raises it above Piety).${run ? ` Day ${run + 1} in a row: +${run} difficulty.` : ""}</p>
          <div class="form-group"><label>Where</label><select name="src" data-fixed><option value="ground">Holy Ground (its rating)</option><option value="relic">Over a Holy Relic</option><option value="flock">With their Flock</option></select></div>
          <div class="form-group"><label>Rating</label><input type="number" name="rating" value="${ctx.background(actor, "flock") || ctx.background(actor, "holy relic") || 1}" min="0" max="5"/></div>
          <div class="form-group"><label>Hours of prayer</label><input type="number" name="hours" value="1" min="1" max="5"/></div>
          <div class="form-group"><label><input type="checkbox" name="advance"/> Move the clock (a player asks the Storyteller)</label></div></form>`;
        return dialog(`Prayer: ${actor.name}`, content, "Pray", async fd => {
            const diff = H.prayerDifficulty(n(fd.hours), run);
            const r = await rollPool(n(fd.rating), diff);
            const to = H.convictionGain(i.conviction, r.botch ? 0 : r.successes, i.piety);
            await setConviction(actor, to);
            await setInq(actor, { prayerDay: today, prayerRun: run });
            const tnote = fd.advance ? await spendTime(actor, n(fd.hours) * 3600, "prayer") : "";
            return post(actor, `${actor.name} prays`, rollBlock(`${{ ground: "Holy Ground", relic: "Holy Relic", flock: "Flock" }[fd.src]} (${fd.rating})`, r) + `<div class="vta-res">Conviction ${i.conviction} → ${to}</div>` + tnote + `<div class="wodx-quiet">Dark Ages: Inquisitor p. 160</div>`, [r.roll]);
        });
    }

    async function relic(actor) {
        const i = inq(actor), story = game.settings.get(MOD, "storyId") || "";
        if (story && i.f.relicStory === story) return ctx.notify("A relic restores Conviction once a story (Dark Ages: Inquisitor p. 156).");
        const rating = ctx.background(actor, "holy relic");
        if (!rating) return ctx.notify(`${actor.name} has no Holy Relics Background.`);
        const r = await rollPool(rating, 6);
        const to = H.convictionGain(i.conviction, r.botch ? 0 : r.successes, i.piety);
        await setConviction(actor, to);
        await setInq(actor, { relicStory: story || String(game.time.worldTime) });
        return post(actor, `${actor.name}: a holy relic`, rollBlock(`Holy Relics (${rating})`, r) + `<div class="vta-res">Conviction ${i.conviction} → ${to}</div>`, [r.roll]);
    }

    async function cashIn(actor) {
        const i = inq(actor);
        const content = `<form><p><b>${esc(actor.name)}</b>: Conviction ${i.conviction}, banked ${i.banked}. Banking takes an hour of prayer a point; more than one a day needs a retreat (Dark Ages: Inquisitor p. 161).</p>
          <div class="form-group"><label>Bank this many</label><input type="number" name="bank" value="0" min="0" max="${i.conviction}"/></div>
          <div class="form-group"><label>Then buy</label><select name="buy" data-fixed><option value="">Nothing yet</option>${Object.entries(H.CASH_IN).map(([k, c]) => `<option value="${k}" ${i.banked >= c ? "" : ""}>${{ superior: "A Superior Virtue dot", orison: "An Orison", acolyte: "An Acolyte Endowment", advocate: "An Advocate Endowment", judge: "A Judge Endowment" }[k]} (${c})</option>`).join("")}</select> <select name="which" data-fixed>${Object.entries(H.SUPERIOR_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div></form>`;
        return dialog(`Bank Conviction: ${actor.name}`, content, "Go", async fd => {
            const bank = Math.min(i.conviction, n(fd.bank));
            let banked = i.banked + bank, html = bank ? `<div class="vta-note">${bank} Conviction banked (${banked} in all).</div>` : "";
            if (bank) await setConviction(actor, i.conviction - bank);
            if (fd.buy) {
                const c = H.CASH_IN[fd.buy];
                if (banked < c) html += `<div class="vta-warn">${c} banked needed; ${banked} so far.</div>`;
                else {
                    banked -= c;
                    if (fd.buy === "superior") {
                        const cur = i[fd.which], lim = i.v[H.SUPERIOR[fd.which]];
                        if (cur >= Math.min(5, lim)) { banked += c; html += `<div class="vta-warn">${H.SUPERIOR_LABEL[fd.which]} can't pass ${cap(H.SUPERIOR[fd.which])} ${lim}.</div>`; }
                        else { await setInq(actor, { [fd.which]: cur + 1 }); html += `<div class="vta-res good">${H.SUPERIOR_LABEL[fd.which]} ${cur} → ${cur + 1}.</div>`; }
                    } else html += `<div class="vta-res good">Bought: add the Blessing to the sheet. ${["advocate", "judge"].includes(fd.buy) && ["acolyte", "servant"].includes(stage(i)) ? "<b>Above their stage: the Storyteller rolls for a Curse (Dark Ages: Inquisitor p. 201).</b>" : ""}</div>`;
                }
            }
            await setInq(actor, { banked });
            return post(actor, `${actor.name}: Conviction banked`, html + `<div class="wodx-quiet">Dark Ages: Inquisitor pp. 161, 173</div>`);
        });
    }

    /** A new story (p. 160): Conviction back up to Conscience + Faith. Called by main.js endStory. */
    async function newStory(actor) {
        if (!isInquisitor(actor)) return null;
        const i = inq(actor), to = H.newStoryConviction(i.conviction, i.v.conscience, i.faith);
        if (to > i.conviction) await setConviction(actor, to);
        return to > i.conviction ? `${actor.name}: Conviction ${i.conviction} → ${to}` : null;
    }

    /* ---------------- True Faith ---------------- */

    function faithOf(actor) {
        const f = actor.system?.advantages?.faith;
        const fromSheet = n(f?.permanent ?? f?.value ?? f?.temporary);
        if (fromSheet) return fromSheet;
        if (isInquisitor(actor)) return H.STAGE_FAITH[stage(inq(actor))];
        return n(actor.getFlag(MOD, "trueFaith"));
    }

    async function trueFaith(actor) {
        const rules = H.faithRules(lineNow() === "inquisitor" ? "dark-ages" : "modern");
        const rating = faithOf(actor);
        const tgt = [...(game.user.targets ?? [])][0]?.actor ?? null;
        const tw = tgt ? (rules === "da20" ? n(tgt.system?.advantages?.willpower?.temporary) : n(tgt.system?.advantages?.willpower?.permanent)) : 0;
        const powers = H.faithPowers(rules, rating);
        const content = `<form><p><b>${esc(actor.name)}</b>: True Faith ${rating}${isInquisitor(actor) && !n(actor.system?.advantages?.faith?.permanent) ? " (their inquisitor's stage)" : ""}; ${rules === "da20" ? "the Dark Ages rules (V20 Dark Ages pp. 392–395)" : "The Hunters Hunted II rules (pp. 83–85)"}.${tgt ? ` Target ${esc(tgt.name)}, Willpower ${tw}.` : ""}</p>
          <ul class="wodx-quiet">${powers.map(([k, t]) => `<li>${k ? "•".repeat(k) : "Always"}: ${esc(t)}</li>`).join("")}</ul>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="repel">Repel the creature (1 Willpower)</option><option value="resist">Resist a power (1 Willpower)</option><option value="loss">Acting against their faith (Conscience at 9)</option><option value="set">Set the rating (if the sheet has no field)</option></select></div>
          <div class="form-group"><label>Creature's Willpower / the power's successes</label><input type="number" name="cw" value="${tw || 6}" min="1" max="10" style="width:4em"/> <input type="number" name="ps" value="0" min="0" style="width:4em"/> <label><input type="checkbox" name="daim"/> Daimoinon</label></div>
          <div class="form-group"><label>Rating</label><input type="number" name="rating" value="${rating}" min="0" max="5"/></div></form>`;
        return dialog(`True Faith: ${actor.name}`, content, "Go", async fd => {
            if (fd.k === "set") { await ctx.setFlag(actor, "trueFaith", n(fd.rating)); return post(actor, `${actor.name}`, `<div class="vta-note">True Faith ${fd.rating}: ${n(fd.rating)} extra Willpower dot${n(fd.rating) === 1 ? "" : "s"} (add them on the sheet).</div>`); }
            if (!rating) return ctx.notify(`${actor.name} has no True Faith.`);
            if (fd.k === "loss") {
                const r = await rollPool(virtues(actor).conscience.value, H.FAITH_LOSS_DIFFICULTY);
                const lost = !(r.successes > 0 && !r.botch);
                if (lost) { if (n(actor.system?.advantages?.faith?.permanent)) await updateActor(actor, { "system.advantages.faith.permanent": rating - 1 }); else await ctx.setFlag(actor, "trueFaith", rating - 1); }
                return post(actor, `${actor.name}: a test of faith`, rollBlock("Conscience", r) + `<div class="vta-res ${lost ? "bad" : "good"}">${lost ? `True Faith ${rating} → ${rating - 1}.` : "The faith holds."}</div>`, [r.roll]);
            }
            if (!(await spendWillpower(actor, 1))) return null;
            if (fd.k === "repel") {
                const r = await rollPool(rating, H.repelDifficulty(rules, fd.cw));
                const R = H.repelResult(rules, r);
                let fxb = "", fxItems = [];
                if (R.held && EF.isOn()) {
                    const pp = EF.planOf(actor, H.repelResults(rules, r.successes, { source: rules === "da20" ? "V20 Dark Ages p. 394" : "The Hunters Hunted II p. 84" }), Math.max(1, r.successes));
                    fxb = pp.html; fxItems = pp.items.filter(x => x.route !== "off" && x.route !== "st");
                }
                return post(actor, `${actor.name} holds up their faith`, rollBlock(`True Faith (${rating})`, r, ["1 Willpower"]) + `<div class="vta-res ${R.held ? "good" : "bad"}">${esc(R.text)}</div>${fxb}`, [r.roll], fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
            }
            let fs = 0, rolls = [], body = "";
            if (rules === "hh2") { const r = await rollPool(rating, 7); fs = r.botch ? 0 : r.successes; rolls.push(r.roll); body = rollBlock(`True Faith (${rating})`, r, ["1 Willpower"]); }
            const left = H.faithResist(rules, rating, n(fd.ps), { daimoinon: !!fd.daim, faithSuccesses: fs });
            body += `<div class="vta-res ${left ? "" : "good"}">The power keeps ${left} success${left === 1 ? "" : "es"}${left ? "" : ": it fails against them"}.</div>`;
            return post(actor, `${actor.name}: faith against the power`, body, rolls);
        });
    }

    /* ---------------- Numina ---------------- */

    async function numina(actor) {
        const items = [...actor.items].filter(i => i.type === "Power" && /numina|edge/.test(i.system?.type ?? "") && !/power$/.test(i.system?.type ?? ""));
        const known = items.map(i => ({ name: i.name, value: n(i.system?.value), key: H.numinaFor(i.name) }));
        const opts = [...known.map((k, x) => [`s${x}`, `${k.name} (${k.value})${k.key ? "" : " (not in the library)"}`]), ...Object.entries(H.NUMINA).filter(([k]) => !known.some(x => x.key === k)).map(([k, v]) => [`l:${k}`, `${v.label} (library)`])];
        const content = `<form><p><b>${esc(actor.name)}</b>: Willpower ${n(actor.system?.advantages?.willpower?.temporary)}. Numina from The Hunters Hunted II (pp. 70–83).</p>
          <div class="form-group"><label>Numen</label>${searchBox("select[name=nm]", "Search Numina…", "Search Numina")}<select name="nm">${opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>
          <div class="wodx-num-info vta-note"></div>
          <div class="form-group"><label>Level used</label><input type="number" name="lvl" value="1" min="1" max="5"/> <label>difficulty</label> <input type="number" name="diff" value="7" min="2" max="10"/> <label>Willpower</label> <input type="number" name="wp" value="1" min="0" max="3" style="width:4em"/></div>
          <div class="form-group"><label>Rating (for a library path)</label><input type="number" name="rating" value="1" min="0" max="5"/></div></form>`;
        const pickV = v => {
            const key = v.startsWith("l:") ? v.slice(2) : known[n(v.slice(1))]?.key;
            return { key, item: v.startsWith("s") ? known[n(v.slice(1))] : null, def: H.NUMINA[key] };
        };
        const pick = root => pickV(root.querySelector("[name=nm]").value);
        const describe = root => {
            const { def, item } = pick(root);
            const box = root.querySelector(".wodx-num-info");
            if (!def) { box.innerHTML = "Not in the library: set the roll by hand."; return; }
            root.querySelector("[name=diff]").value = def.diff;
            root.querySelector("[name=wp]").value = def.wp;
            if (item) root.querySelector("[name=rating]").value = item.value;
            box.innerHTML = `<b>${esc(def.label)}</b> (${def.kind === "hedge" ? "hedge magic" : "psychic"}) · ${def.pool.map(cap).join(" + ")} at ${def.diff} · p. ${def.p}<ol>${def.levels.map(l => `<li>${esc(l)}</li>`).join("")}</ol>${def.note ? `<span class="wodx-quiet">${esc(def.note)}</span>` : ""}`;
        };
        return dialog(`Numina: ${actor.name}`, content, "Use", async fd => {
            const { def, item } = pickV(String(fd.nm ?? ""));
            const rating = item?.value ?? n(fd.rating);
            if (n(fd.lvl) > rating) return ctx.notify(`The rating is ${rating}: level ${fd.lvl} is out of reach.`);
            if (n(fd.wp) && !(await spendWillpower(actor, n(fd.wp)))) return null;
            if (!def) return post(actor, `${actor.name}: ${esc(item?.name ?? "a Numen")}`, `<div class="vta-note">Roll it by hand (not in the library).</div>`);
            const [a, b] = def.pool;
            const dice = attr(actor, a) + (findAbility(actor, b)?.value ?? 0);
            const r = await rollPool(dice, fd.diff);
            const fx = !r.botch && r.successes > 0 && EF.isOn() ? EF.numinaPlan(actor, pickV(String(fd.nm ?? "")).key, n(fd.lvl), r.successes, def) : null;
            const fxItems = (fx?.items ?? []).filter(x => x.route !== "off" && x.route !== "st");
            return post(actor, `${actor.name}: ${esc(def.label)} ${"•".repeat(n(fd.lvl))}`, rollBlock(`${cap(a)} + ${cap(b)}`, r, n(fd.wp) ? [`${fd.wp} Willpower`] : []) + `<div class="vta-note">${esc(def.levels[n(fd.lvl) - 1])}</div>` + (fx?.html ?? "") + `<div class="wodx-quiet">The Hunters Hunted II p. ${def.p}</div>`, [r.roll],
                fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
        }, { width: 540, render: root => { describe(root); root.querySelector("[name=nm]")?.addEventListener("change", () => describe(root));
            // Who it is aimed at: curses and pyrokinesis at a foe, healing at a friend, the rest by its tag (3.43.0)
            aim(root, { actor, lib: "numina", power: r => { const { key, item } = pick(r); return key ? { id: key, n: H.NUMINA[key]?.label ?? key } : item ? { id: item.name, n: item.name } : null; } }); } });
    }

    /* ---------------- Hedge magic (Sorcerer) ---------------- */

    async function hedgeMagic(actor) {
        const items = [...actor.items].filter(i => i.type === "Power" && /numina/.test(i.system?.type ?? ""));
        const paths = items.filter(i => !/power$/.test(i.system?.type ?? "")).map(i => ({ id: i.id, name: i.name, value: n(i.system?.value), key: H.sorceryFor(i.name) }));
        const rituals = items.filter(i => /power$/.test(i.system?.type ?? "")).map(i => ({ id: i.id, name: i.name, value: n(i.system?.level ?? i.system?.value) }));
        const opts = [...paths.map((x, k) => [`s${k}`, `${x.name} (${x.value})${x.key ? "" : " (not a Sorcerer path)"}`]), ...Object.entries(H.SORCERY).filter(([k]) => !paths.some(x => x.key === k)).map(([k, v]) => [`l:${k}`, `${v.label} (library)`])];
        const wp = n(actor.system?.advantages?.willpower?.temporary);
        const content = `<form><p><b>${esc(actor.name)}</b>: Willpower ${wp}. Hedge magic by Sorcerer (Revised), Chapter Four: difficulty 4 + the highest aspect, a success for each aspect level above the first.</p>
          <div class="form-group"><label>Path</label>${searchBox("select[name=path]", "Search Paths…", "Search Paths")}<select name="path">${opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></div>
          <div class="wodx-hedge-info vta-note"></div>
          <div class="form-group"><label>Cast</label><select name="mode" data-fixed><option value="spell">A spell</option><option value="ritual">A ritual</option><option value="counter">A counterspell (Wits + Occult, 8)</option></select> <label>rating (library)</label> <input type="number" name="rating" value="1" min="0" max="6" style="width:4em"/></div>
          <div class="form-group"><label>Aspect levels (up to four)</label><input type="number" name="a1" value="1" min="1" max="6" style="width:3.5em"/> <input type="number" name="a2" value="0" min="0" max="6" style="width:3.5em"/> <input type="number" name="a3" value="0" min="0" max="6" style="width:3.5em"/> <input type="number" name="a4" value="0" min="0" max="6" style="width:3.5em"/></div>
          <div class="form-group"><label>Ritual</label><select name="ritual" data-fixed><option value="">— none / by hand —</option>${rituals.map(r => `<option value="${r.id}">${esc(r.name)} (${r.value})</option>`).join("")}</select> <label>its level</label> <input type="number" name="rlvl" value="1" min="1" max="6" style="width:3.5em"/></div>
          <div class="form-group"><label>Turns cut (fast casting)</label><input type="number" name="fast" value="0" min="0" max="5" style="width:3.5em"/> <label><input type="checkbox" name="trade"/> Trade skill for power</label> <label><input type="checkbox" name="wpx"/> 1 Willpower for a success</label></div>
          <div class="form-group"><label>Other difficulty modifier</label><input type="number" name="mod" value="0" min="-3" max="3"/> <label>spell's successes (counter)</label> <input type="number" name="vs" value="0" min="0" style="width:4em"/></div></form>`;
        const pick = v => { const key = v.startsWith("l:") ? v.slice(2) : paths[n(v.slice(1))]?.key; return { key, item: v.startsWith("s") ? paths[n(v.slice(1))] : null, def: H.SORCERY[key] }; };
        const describe = root => {
            const { def, item } = pick(root.querySelector("[name=path]").value);
            if (item) root.querySelector("[name=rating]").value = item.value;
            root.querySelector(".wodx-hedge-info").innerHTML = def ? `<b>${esc(def.label)}</b> · ${def.pool.filter(Boolean).map(cap).join(" + ") || "see the page"} · ${def.wp ? `${def.wp} Willpower` : "no Willpower"}${def.ritualOnly ? " · rituals only" : ""}${def.noRituals ? " · no rituals" : ""}${def.aspects ? ` · aspects: ${def.aspects.map(esc).join(", ")}` : ""} · p. ${def.p}${def.note ? `<br><span class="wodx-quiet">${esc(def.note)}</span>` : ""}` : "Not a Sorcerer path: set the roll by hand.";
        };
        return dialog(`Hedge magic: ${actor.name}`, content, "Cast", async fd => {
            const { key, def, item } = pick(String(fd.path ?? ""));
            const rating = item?.value ?? n(fd.rating);
            const statOf = k => (k === "willpower" ? n(actor.system?.advantages?.willpower?.permanent) : ATTR.includes(k) ? attr(actor, k) : (findAbility(actor, k)?.value ?? 0));
            if (fd.mode === "counter") {
                const r = await rollPool(attr(actor, "wits") + (findAbility(actor, "occult")?.value ?? 0), H.COUNTERSPELL.difficulty);
                const left = Math.max(0, n(fd.vs) - (r.botch ? 0 : r.successes));
                return post(actor, `${actor.name}: a counterspell`, rollBlock("Wits + Occult", r) + `<div class="vta-res">${n(fd.vs) ? `The spell keeps ${left} success${left === 1 ? "" : "es"}.` : `${r.successes} success${r.successes === 1 ? "" : "es"} to cancel the spell's.`}</div><div class="wodx-quiet">Sorcerer p. 63</div>`, [r.roll]);
            }
            if (!def) return ctx.notify("Not a Sorcerer path: roll it with the Action dialog.");
            if (fd.mode === "spell" && def.ritualOnly) return ctx.notify(`${def.label} works only as rituals (p. ${def.p}).`);
            if (fd.mode === "ritual" && def.noRituals) return ctx.notify(`${def.label} has no rituals (p. ${def.p}).`);
            const ritual = rituals.find(r => r.id === fd.ritual);
            const aspects = fd.mode === "ritual" ? [ritual?.value ?? n(fd.rlvl)] : [fd.a1, fd.a2, fd.a3, fd.a4].map(n).filter(x => x > 0);
            if (fd.mode === "ritual" && Math.max(...aspects) > rating) return ctx.notify(`The ritual needs ${Math.max(...aspects)} dots in ${def.label}.`);
            const S = H.spell({ rating, aspects, fast: fd.mode === "spell" ? n(fd.fast) : 0, trade: !!fd.trade, wpBase: def.wp });
            const cost = S.willpower + (fd.wpx ? 1 : 0);
            if (cost && !(await spendWillpower(actor, cost))) return null;
            const [a, b] = def.pool;
            if (!a) return post(actor, `${actor.name}: ${esc(def.label)}`, `<div class="vta-note">Difficulty ${S.difficulty + n(fd.mod)}, ${S.need} success${S.need === 1 ? "" : "es"} needed; the roll is on p. ${def.p}.</div>`);
            const r = await rollPool(statOf(a) + statOf(b), S.difficulty + n(fd.mod), { willpower: !!fd.wpx });
            const s = r.botch ? 0 : r.successes, ok = s >= S.need;
            let body = rollBlock(`${cap(a)} + ${b === "animalken" ? "Animal Ken" : cap(b)}`, r, [cost ? `${cost} Willpower` : "", S.traded ? "skill traded for power" : "", n(fd.fast) && fd.mode === "spell" ? `${fd.fast} turn${n(fd.fast) === 1 ? "" : "s"} cut` : ""].filter(Boolean));
            body += `<div class="vta-res ${ok ? "good" : "bad"}">${r.botch ? "A botch: the magic slips its leash (see the page's price of failure)." : ok ? `It works (${s} of ${S.need} needed)${H.pushAspect(s, S.need) ? "; doubled: the Storyteller may let one aspect go a level higher" : ""}.` : `${s} of ${S.need} needed: not yet (an extended casting can go on).`}</div>`;
            body += `<div class="vta-note">${fd.mode === "ritual" ? `${esc(ritual?.name ?? "A ritual")}: at least 10 minutes, usually longer.` : `Casting time ${S.turns} turn${S.turns === 1 ? "" : "s"}.`}${S.overLimit ? " <b>An aspect is above the Path rating.</b>" : ""}</div><div class="wodx-quiet">Sorcerer (Revised) pp. 60–63, ${def.p}</div>`;
            let fxItems = [];
            if (ok && EF.isOn()) {
                const pp = EF.planOf(actor, H.sorceryResults(key, { top: Math.max(...aspects), successes: s, need: S.need, rating, name: def.label, source: `Sorcerer p. ${def.p}` }), s);
                body += pp.html;
                fxItems = pp.items.filter(x => x.route !== "off" && x.route !== "st");
            }
            return post(actor, `${actor.name}: ${esc(def.label)}`, body, [r.roll], fxItems.length ? { kind: "effects", caster: actor.name, items: fxItems } : undefined);
        }, { width: 560, render: root => { describe(root); root.querySelector("[name=path]")?.addEventListener("change", () => describe(root)); } });
    }

    /* ---------------- Ghouls outside the Dark Ages ---------------- */

    async function ghoulBlood(actor) {
        const b = P.resource(actor, "blood");
        if (!b.ok) return ctx.notify(`${actor.name} has no blood pool on the sheet.`);
        const st = attr(actor, "stamina"), da = lineNow() === "inquisitor";
        const content = `<form><p><b>${esc(actor.name)}</b>: blood ${b.value}/${b.max}, Stamina ${st}. ${da ? "<b>The chronicle is in the Dark Ages: V20 Dark Ages p. 399 governs ghouls; these are the V20 Ghouls and Revenants rules.</b>" : "V20 Ghouls and Revenants, Chapter Two."}</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="drink">Drink vitae (overfeeding, p. 43)</option><option value="withdrawal">Withdrawal: resist a chance to feed (p. 43)</option><option value="day">An elder ghoul stays awake by day (p. 44)</option></select></div>
          <div class="form-group"><label>Blood points drunk</label><input type="number" name="drink" value="1" min="1" max="20"/></div></form>`;
        return dialog(`Ghoul blood: ${actor.name}`, content, "Go", async fd => {
            const virt = virtues(actor);
            if (fd.k === "withdrawal") {
                const r = await rollPool(virt.selfcontrol.value, H.WITHDRAWAL.difficulty);
                return post(actor, `${actor.name}: withdrawal`, rollBlock(`${virt.selfcontrol.label}`, r) + `<div class="vta-res ${r.successes > 0 && !r.botch ? "good" : "bad"}">${r.successes > 0 && !r.botch ? "The craving is held off." : "The craving wins: the chance to feed is taken."} Withdrawal lasts about ${H.WITHDRAWAL.weeks(st)} week${H.WITHDRAWAL.weeks(st) === 1 ? "" : "s"} (6 − Stamina).</div>`, [r.roll]);
            }
            if (fd.k === "day") {
                const r = await rollPool(n(actor.system?.advantages?.willpower?.permanent), 6);
                return post(actor, `${actor.name}: by day`, rollBlock("Willpower", r) + `<div class="vta-res">${r.successes > 0 && !r.botch ? "Awake." : "Drowsy: Stamina + Alertness at 7 to wake after dozing, or sleep until sunset."}</div>`, [r.roll]);
            }
            const O = H.overfeed(b.value, b.max, st, n(fd.drink));
            let body = `<div class="vta-sec">Blood ${b.value} + ${fd.drink}${O.crammed ? ` (${O.crammed} crammed above the pool)` : ""}.</div>`, rolls = [];
            const upd = { [b.path]: Math.min(O.after, b.max + st) };
            if (O.check) {
                const r = await rollPool(st, O.difficulty); rolls.push(r.roll);
                body += rollBlock("Stamina", r);
                if (r.successes > 0 && !r.botch) body += `<div class="vta-res">The excess ${O.excess} can be spent at once (Disciplines, or a point a turn on physical Attributes).</div>`;
                else { await ctx.applyDamage?.(actor, "lethal", O.excess); body += `<div class="vta-res bad">${O.excess} lethal; no blood can be used until a scene of vomiting. Overdosed: frenzies as a vampire does, +1 Dexterity, Perception + Self-Control each scene or hallucinations.</div>`; }
            }
            if (b.path) await updateActor(actor, upd);
            return post(actor, `${actor.name} drinks vitae`, body + `<div class="wodx-quiet">V20 Ghouls and Revenants p. 43</div>`, rolls);
        });
    }

    return { ghoulBlood, hedgeMagic, inq, isInquisitor, inquisitorSheet, setConviction, spendConv, blessing, virtueRoll, sin, prayer, relic, cashIn, newStory, faithOf, trueFaith, numina, lineNow };
}

export function registerSettings() {
    game.settings.register(MOD, "storyId", { scope: "world", config: false, type: String, default: "" });
}
