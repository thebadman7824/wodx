/**
 * WoDX Actions 3.10 (Phase 6k): the Reborn (Mummy: The Resurrection), on the system's Mummy sheet.
 *
 *   The traits     Balance, Sekhem (rating and pool), Willpower; the Amenti from the Bio tab; Hekau paths and spells as Powers;
 *                  the Ba Background; in or out of the Web of Faith, kept by WoDX
 *   Hekau          a spell (path + Trait at its difficulty, Sekhem spent, more for successes) or a ritual (extended)
 *   Sekhem         the Gift of Ra each sunrise; Osiris's Blessing in the Web of Faith; a haven's meditation; semektet
 *   Balance        strength of conviction, upholding Ma'at, Forbiddance; offenses against Ma'at by the mummy's Balance
 *   Death          the khat's five levels past Incapacitated; the resurrection roll; the Veil for mortal witnesses
 *
 * Built by main.js with its helpers (ctx). Pure rules: mummy-rules.js.
 */
import * as M from "./mummy-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";
import { aim } from "./aim.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = M.REF;
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

export const isMummy = actor => !!actor && (actor.type === "Mummy" || !!actor.system?.settings?.hasbalance && !!actor.system?.settings?.hassekhem);

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, spendWillpower, notify } = ctx;
    const flag = a => a.getFlag(MOD, "mummy") ?? {};
    const saveFlag = (a, patch) => ctx.setFlag(a, "mummy", { ...flag(a), ...patch });

    function paths(actor) {
        const out = {};
        for (const i of actor?.items ?? []) {
            if (i.type !== "Power" || !/types\.hekau$/.test(String(i.system?.type ?? ""))) continue;
            const k = M.hekauOf(i.name);
            if (k) out[k] = Math.max(out[k] ?? 0, n(i.system?.value));
        }
        return out;
    }
    function info(actor) {
        const a = actor.system?.advantages ?? {};
        const f = flag(actor);
        const balance = n(a.balance?.permanent);
        const amenti = M.amentiOf(actor.system?.amenti) || f.amenti || "";
        return { f, balance, sekhem: { rating: n(a.sekhem?.permanent), pool: n(a.sekhem?.temporary) }, willpower: { perm: n(a.willpower?.permanent), temp: n(a.willpower?.temporary) },
            amenti, primary: M.AMENTI[amenti]?.hekau ?? null, hekau: { ...paths(actor), ...(f.hekau ?? {}) }, ba: ctx.background?.(actor, "Ba") ?? 0, inWeb: !!f.inWeb,
            khat: n(f.khat), offenses: f.offenses ?? [] };
    }
    const state = i => `Balance ${i.balance}; Sekhem ${i.sekhem.pool}/${i.sekhem.rating}; Willpower ${i.willpower.temp}/${i.willpower.perm}${i.amenti ? `; ${esc(M.AMENTI[i.amenti].label)}` : ""}; ${i.inWeb ? "within the Web of Faith" : "outside the Web of Faith"}`;
    async function sekhem(actor, delta) {
        const i = info(actor);
        if (delta < 0 && i.sekhem.pool + delta < 0) { notify(`${actor.name} has ${i.sekhem.pool} Sekhem; this needs ${-delta}.`); return false; }
        await updateActor(actor, { "system.advantages.sekhem.temporary": Math.max(0, Math.min(i.sekhem.rating || i.balance || 10, i.sekhem.pool + delta)) });
        return true;
    }

    /* -- Hekau ---------------------------------------------------------- */
    async function cast(actor) {
        const i = info(actor);
        const spells = (actor.items ?? []).filter(x => x.type === "Power" && /types\.hekaupower$/.test(String(x.system?.type ?? "")));
        const traits = (ctx.traits?.(actor) ?? []);
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>Path</label><select name="path" data-fixed>${Object.entries(M.HEKAU).map(([k, h]) => `<option value="${k}"${!i.hekau[k] ? " disabled" : ""}${k === i.primary ? " selected" : ""}>${esc(h.label)} ${n(i.hekau[k])}${k === i.primary ? " (the Amenti's path)" : ""}</option>`).join("")}</select></div>
          <div class="form-group"><label>Spell or ritual</label>${spells.length > 5 ? searchBox("select[name=sp]", "Search spells…", "Search spells") : ""}<select name="sp"><option value="">(as set below)</option>${spells.map(x => `<option value="${x.id}">${esc(x.name)} (level ${n(x.system?.level)})</option>`).join("")}</select></div>
          <div class="form-group"><label>Trait the spell names</label>${searchBox("select[name=tr]", "Search Traits…", "Search Traits")}<select name="tr">${traits.map(t => `<option value="${esc(t.key)}">${esc(t.label)} ${t.value}</option>`).join("")}</select></div>
          <div class="form-group"><label>Level</label><input type="number" name="lvl" min="1" max="5" value="1"/></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="d" min="2" max="10" value="6"/></div>
          <div class="form-group"><label>Sekhem cost</label><input type="number" name="c" min="0" max="10" value="1"/></div>
          <div class="form-group"><label>More Sekhem for successes</label><input type="number" name="x" min="0" max="10" value="0"/></div>
          <div class="form-group"><label><input type="checkbox" name="rit"/> A ritual (extended: successes up to its Sekhem cost)</label></div>
          <div class="form-group"><label><input type="checkbox" name="wp"/> Spend Willpower (+1 success)</label></div></form>`;
        return dialog(`Hekau: ${actor.name}`, content, "Cast", async fd => {
            if (!i.inWeb && i.sekhem.pool === 0) { notify(`${actor.name} is in semektet: no Hekau.`); return null; }
            const sp = spells.find(x => x.id === fd.sp);
            const level = sp ? n(sp.system?.level) || n(fd.lvl) : n(fd.lvl);
            const tv = ATTRS.includes(fd.tr) ? ctx.attr(actor, fd.tr) : n(ctx.findAbility?.(actor, fd.tr)?.value);
            const plan = M.spellPlan({ path: i.hekau[fd.path], trait: tv, level, cost: n(fd.c), extra: n(fd.x), pool: i.sekhem.pool, difficulty: n(fd.d) });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (plan.spend && !(await sekhem(actor, -plan.spend))) return null;
            const wp = !!fd.wp && await spendWillpower(actor, 1);
            const label = `${M.HEKAU[fd.path].label} ${n(i.hekau[fd.path])} + ${esc(traits.find(t => t.key === fd.tr)?.label ?? fd.tr)}`;
            const title = sp ? esc(sp.name) : `a ${M.HEKAU[fd.path].label} ${fd.rit ? "ritual" : "spell"} of level ${level}`;
            const rolls = [];
            let body = "";
            if (!fd.rit) {
                const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp, autoSuccesses: plan.autoSuccesses }); rolls.push(r.roll);
                body = rollBlock(label, r, [`${plan.spend} Sekhem`, ...(plan.autoSuccesses ? [`${plan.autoSuccesses} bought successes`] : []), ...(plan.capped ? ["bought successes capped at the path's rating"] : []), ...(wp ? ["Willpower"] : [])]);
                body += r.botch ? `<div class="vta-big bad">${title}: a calamity, and the Storyteller decides its shape.</div>` : r.successes ? `<div class="vta-big good">${title}: ${r.successes} success${r.successes === 1 ? "" : "es"}.</div>` : `<div class="vta-big">${title}: it fails (the Sekhem is spent).</div>`;
            } else {
                let st = { got: 0, done: false }, k = 0;
                const rows = [];
                while (!st.done && k < 10) {
                    const r = await rollPool(plan.dice, plan.difficulty, { willpower: wp && k === 0 }); rolls.push(r.roll); k++;
                    st = M.ritualStep(st, r.successes, Math.max(1, n(fd.c)), r.botch);
                    rows.push(`Roll ${k}: ${r.botch ? "botch" : `${r.successes} (total ${st.got})`}`);
                }
                body = `<div class="vta-sec"><b>${label}</b>: ${plan.dice} dice, diff ${plan.difficulty}<br>${rows.join("<br>")}</div>`;
                body += st.failed ? `<div class="vta-big bad">${title}: botched: all the Sekhem put in is lost; it must start over.</div>` : st.done ? `<div class="vta-big good">${title}: complete in ${k} ${k === 1 ? "stretch" : "stretches"} of the path's ritual time.</div>` : `<div class="vta-big">${title}: unfinished after ten tries.</div>`;
            }
            body += `<div class="wodx-quiet">${REF} p. 78</div>`;
            return post(actor, `${actor.name} works Hekau`, body, rolls.filter(Boolean));
        }, { width: 540, render: root => aim(root, { actor, power: r => { const sp = spells.find(x => x.id === r.querySelector("[name=sp]")?.value); return sp ? { id: sp.id, n: sp.name, e: String(sp.system?.description ?? "").replace(/<[^>]+>/g, " ") } : null; } }) });
    }

    /* -- Sekhem --------------------------------------------------------- */
    async function regain(actor) {
        const i = info(actor);
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>How</label><select name="k" data-fixed><option value="bless">Osiris's Blessing: a full day in the Web of Faith (Balance at the Shroud)</option>
            <option value="haven">A haven outside the Web: a day's meditation (Wits + Meditation at 8, then Balance at 9)</option><option value="ra">The Gift of Ra (sunrise: one point)</option></select></div>
          <div class="form-group"><label>The local Shroud</label><input type="number" name="sh" min="2" max="10" value="6"/></div>
          <div class="form-group"><label><input type="checkbox" name="web"${i.inWeb ? " checked" : ""}/> The mummy is within the Web of Faith now</label></div></form>`;
        return dialog(`Sekhem: ${actor.name}`, content, "Go", async fd => {
            await saveFlag(actor, { inWeb: !!fd.web });
            const capS = M.sekhemCap(i.balance, i.sekhem.rating || null);
            let body = "", rolls = [];
            if (fd.k === "ra") {
                if (!fd.web && i.sekhem.pool === 0) body = `<div class="vta-res bad">In semektet: Ra's gift does not come.</div>`;
                else { await sekhem(actor, 1); body = `<div class="vta-res good">+1 Sekhem with the sunrise (${info(actor).sekhem.pool}).</div>`; }
            } else {
                if (fd.k === "bless" && !fd.web) { notify(`${actor.name}: Osiris's Blessing needs a day within the Web of Faith.`); return null; }
                if (fd.k === "haven") {
                    const m = await rollPool(ctx.attr(actor, "wits") + n(ctx.findAbility?.(actor, "meditation")?.value), 8); rolls.push(m.roll);
                    body += rollBlock("Wits + Meditation", m);
                    if (!m.successes) { body += `<div class="vta-res">The meditation finds no stillness.</div>`; return post(actor, `${actor.name} seeks Sekhem`, body + `<div class="wodx-quiet">${REF} pp. 143–144</div>`, rolls.filter(Boolean)); }
                }
                const r = await rollPool(i.balance, fd.k === "haven" ? 9 : n(fd.sh)); rolls.push(r.roll);
                const b = M.blessing(r, { pool: i.sekhem.pool, cap: capS });
                await updateActor(actor, { "system.advantages.sekhem.temporary": b.pool });
                body += rollBlock("Balance", r) + `<div class="vta-res ${b.gained > 0 ? "good" : b.gained < 0 ? "bad" : ""}">${b.gained > 0 ? `+${b.gained} Sekhem` : b.gained < 0 ? "A botch: −1 Sekhem" : "No Sekhem"} (${b.pool}/${capS}).</div>`;
            }
            const s = M.semektet({ pool: info(actor).sekhem.pool, inWeb: !!fd.web });
            if (s.weakened) body += `<div class="vta-note">Semektet: no Sekhem returns on its own and no Hekau works; after 70 days an Attribute fades each day (Mental first); each day Willpower at 7 (4 bandaged) or the tem-akh turns the body toward Egypt.</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 143–144</div>`;
            return post(actor, `${actor.name} seeks Sekhem`, body, rolls.filter(Boolean));
        });
    }

    /* -- Balance and Ma'at ------------------------------------------------- */
    async function balance(actor) {
        const i = info(actor);
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed>${Object.entries(M.BALANCE_USES).map(([k, u]) => `<option value="${k}">${esc(u.label)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Difficulty (conviction, 4 to 8)</label><input type="number" name="d" min="4" max="8" value="6"/></div>
          <div class="form-group"><label>The other side's successes or Willpower</label><input type="number" name="o" min="0" max="10" value="3"/></div></form>`;
        return dialog(`Balance: ${actor.name}`, content, "Roll", async fd => {
            const u = M.BALANCE_USES[fd.k];
            const r = await rollPool(i.balance, fd.k === "conviction" ? n(fd.d) : fd.k === "uphold" ? 8 : 6);
            let res = "", rolls = [r.roll];
            if (fd.k === "conviction") res = r.successes ? "Ma'at holds: the temptation or power is refused." : "The pull wins.";
            else if (fd.k === "uphold") res = `${r.successes} success${r.successes === 1 ? "" : "es"} taken from the spell or power${n(fd.o) && r.successes >= n(fd.o) ? ": it is undone" : ""}.`;
            else {
                const o = await rollPool(n(fd.o), 6); rolls.push(o.roll);
                res = r.successes > o.successes ? "The malign being cannot attack and must leave as soon as it can." : r.successes === o.successes ? "A tie: nothing happens." : "It stands its ground.";
                return post(actor, `${actor.name}: Forbiddance`, rollBlock("Balance", r) + rollBlock("Its Willpower", o) + `<div class="vta-res">${res}</div><div class="vta-note">${esc(u.note)}</div><div class="wodx-quiet">${REF} p. 142</div>`, rolls.filter(Boolean));
            }
            return post(actor, `${actor.name}: Balance`, rollBlock("Balance", r) + `<div class="vta-res">${esc(res)}</div><div class="vta-note">${esc(u.note)}</div><div class="wodx-quiet">${REF} pp. 141–142</div>`, rolls.filter(Boolean));
        });
    }
    async function offense(actor) {
        const i = info(actor);
        const rows = M.OFFENSES.filter(([row]) => M.offenseCounts(i.balance, row));
        const content = `<form><p>At Balance ${i.balance}, these are offenses against Ma'at (p. 142). The judges weigh them at the next judgment; nothing is rolled now.</p>
          <div class="form-group"><label>The act</label><select name="row" data-fixed>${rows.map(([row, t]) => `<option value="${row}">${row}: ${esc(t)}</option>`).join("")}</select></div>
          <div class="form-group"><label>What happened</label><input type="text" name="what" value=""/></div>
          <p class="wodx-quiet">On record: ${i.offenses.length ? i.offenses.map(o => `${o.row} (${esc(o.what || "unnamed")})`).join("; ") : "none"}.</p></form>`;
        return dialog(`An offense against Ma'at: ${actor.name}`, content, "Record", async fd => {
            const list = [...i.offenses, { row: n(fd.row), what: String(fd.what || "").slice(0, 140), at: game.time?.worldTime ?? 0 }];
            await saveFlag(actor, { offenses: list });
            return post(actor, `${actor.name} offends Ma'at`, `<div class="vta-res bad">${esc(M.OFFENSES.find(([r]) => r === n(fd.row))?.[1] ?? "")}${fd.what ? `: ${esc(fd.what)}` : ""}.</div><div class="vta-note">${list.length} on record for the Judges of Ma'at. A fall in Balance there brings Hekau above it down to it, and Attributes above five down to it.</div><div class="wodx-quiet">${REF} pp. 141–143</div>`);
        });
    }

    /* -- death and the resurrection --------------------------------------- */
    async function resurrect(actor) {
        const i = info(actor);
        const year = Math.floor((game.time?.worldTime ?? 0) / (365 * 86400));
        const rolls0 = i.f.rezYear === year ? n(i.f.rezRolls) : 0;
        const B = M.BA[Math.max(0, Math.min(5, i.ba))];
        const content = `<form><p>${state(i)}. Ba ${i.ba}: at least ${B.rest} dead before trying${rolls0 ? `; ${rolls0} ${rolls0 === 1 ? "roll" : "rolls"} already this year (each more costs an Attribute dot)` : ""}.</p>
          <div class="form-group"><label>The khat past Incapacitated</label><select name="kh" data-fixed>${M.KHAT.map((k, x) => `<option value="${x + 1}"${x + 1 === (i.khat || 1) ? " selected" : ""}>${x + 1}: ${esc(k)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Spend</label><select name="sp" data-fixed><option value="sekhem">a permanent Sekhem: Willpower + Ba</option><option value="willpower">a permanent Willpower: Sekhem + Ba</option></select></div></form>`;
        return dialog(`The resurrection: ${actor.name}`, content, "Rise", async fd => {
            const plan = M.resurrectPlan({ spend: fd.sp, willpower: i.willpower.perm, sekhem: i.sekhem.rating, ba: i.ba });
            const upd = plan.cost === "sekhem" ? { "system.advantages.sekhem.permanent": Math.max(0, i.sekhem.rating - 1) } : { "system.advantages.willpower.permanent": Math.max(0, i.willpower.perm - 1) };
            await updateActor(actor, upd);
            const r = await rollPool(plan.pool, plan.difficulty);
            const t = ctx.healthTrack(actor);
            const out = M.resurrectOutcome(r, { khat: n(fd.kh), levels: t.max, rollsThisYear: rolls0 });
            await saveFlag(actor, { rezYear: year, rezRolls: rolls0 + 1, khat: out.risen ? 0 : (out.khatLeft ?? n(fd.kh)) });
            if (out.risen) await ctx.setDamage(actor, { bashing: 0, lethal: 0, aggravated: Math.min(t.max, out.remaining) });
            let body = rollBlock(plan.cost === "sekhem" ? "Willpower + Ba" : "Sekhem + Ba", r, [`a permanent ${plan.cost === "sekhem" ? "Sekhem" : "Willpower"} spent`]);
            body += out.risen ? `<div class="vta-big good">The khat is whole enough: the mummy lives again${out.conscious ? "" : ", but not yet awake"}. ${out.remaining} ${out.remaining === 1 ? "level" : "levels"} of damage remain, as aggravated.</div>`
                : `<div class="vta-big bad">${r.botch ? "A botch: the Ba's full time must pass again." : `Not yet: ${out.mended ?? 0} mended; wait ${out.wait} and try again.`}</div>`;
            if (out.attributeLoss) body += `<div class="vta-note">A second roll this year: the Storyteller lowers an Attribute by a dot (experience restores it).</div>`;
            if (plan.cost === "willpower" && i.willpower.perm - 1 <= 0) body += `<div class="vta-note">Willpower 0: no will to live, and the mummy is destroyed.</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 64, 136–138</div>`;
            return post(actor, `${actor.name}: the resurrection`, body, [r.roll].filter(Boolean));
        });
    }
    async function veil(actor) {
        const content = `<form><p>A mortal who sees the supernatural reacts by Willpower (p. 140).</p><div class="form-group"><label>The mortal's Willpower</label><input type="number" name="w" min="1" max="10" value="3"/></div></form>`;
        return dialog(`The Veil: ${actor.name}`, content, "Show", async fd => post(actor, "The Veil", `<div class="vta-res">Willpower ${n(fd.w)}: ${esc(M.veil(n(fd.w)))}.</div><div class="wodx-quiet">${REF} p. 140</div>`));
    }
    async function setup(actor) {
        const i = info(actor);
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>Amenti</label><select name="a" data-fixed><option value="">as the Bio tab</option>${Object.entries(M.AMENTI).map(([k, a]) => `<option value="${k}"${k === i.f.amenti ? " selected" : ""}>${esc(a.label)} (${esc(a.gloss)})</option>`).join("")}</select></div>
          <div class="form-group"><label><input type="checkbox" name="web"${i.inWeb ? " checked" : ""}/> Within the Web of Faith</label></div></form>`;
        return dialog(`The Reborn: ${actor.name}`, content, "Save", async fd => {
            await saveFlag(actor, { amenti: fd.a || "", inWeb: !!fd.web });
            const j = info(actor);
            const A = M.AMENTI[j.amenti];
            return post(actor, `${actor.name}, Reborn`, `<div class="vta-sec">${state(j)}.</div>${A ? `<div class="vta-res">${esc(A.label)}, ${esc(A.gloss)}: ${esc(A.soul)}${A.hekau ? `; the path of ${esc(M.HEKAU[A.hekau].label)}` : "; no favored path (every path at × 5 experience)"}.</div>` : ""}<div class="vta-note">Sekhem stands at the Balance (${j.balance}); no Hekau path above it. Active amulets and effigies: ${M.activeObjects(j.balance, j.hekau.amulets, j.hekau.effigy)} at most.</div><div class="wodx-quiet">${REF} pp. 56, 78, 141–143</div>`);
        });
    }

    /** Sunrise: the Gift of Ra, one Sekhem a day, unless in semektet. Called by the world-time hook (GM). */
    async function daily(actors = game.actors?.filter?.(isMummy) ?? []) {
        const day = Math.floor(((game.time?.worldTime ?? 0) - 6 * 3600) / 86400);
        for (const a of actors) {
            const f = flag(a);
            if (f.raDay === day) continue;
            await saveFlag(a, { raDay: day });
            if (f.raDay === undefined) continue;
            const i = info(a);
            if (!i.inWeb && i.sekhem.pool === 0) continue;
            await sekhem(a, 1);
        }
    }

    return { info, cast, regain, balance, offense, resurrect, veil, setup, daily, isMummy, rules: M };
}
