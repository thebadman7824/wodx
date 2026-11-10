/**
 * WoDX Actions 3.10 (Phase 6j): the Kuei-jin (Kindred of the East), on the system's "Kindred of the East" vampire sheet.
 *
 *   The traits      Yin and Yang (the dots) with their Chi (the boxes), Hun, P'o and Demon Chi, the Dharma (rating and name)
 *   Feed            flesh, blood (the lesser kind first, or a mood set), breath (Dharma 5), osmosis (Dharma 6); caps, hunger
 *   Spend Chi       a Discipline or any use: the kind and amount, the Dharma's limit a turn, a Demon Art harnessed by Hun;
 *                   a botch while imbalanced makes the excess explode (aggravated, wave soul)
 *   The soul        fire, wave and shadow soul as an extended contest against the P'o (ravenous, imbalance)
 *   Dharma rolls    an auspicious occasion or an act of blindness: the Dharma's Virtue against the P'o at Willpower
 *   The Demon       Demon Chi for the scene, the berserk rage, its use (actions, damage, fangs), its return at dusk
 *   Rise, the sun   the evening's Chi (Yin for ten nights or Yang each night), Demon Chi back; the sun's grace and rot
 *   Heal, sight     Chi for wounds; Ghostsight, Lifesight, Hun's senses and spirit speech, P'o against mind control; Horoscope
 *
 * Built by main.js with its helpers (ctx). Pure rules: kote-rules.js.
 */
import * as K from "./kote-rules.js";
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const REF = K.REF;
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const KIND = { yin: "Yin", yang: "Yang", demon: "Demon" };
const PATH = { yin: "system.advantages.yinchi.temporary", yang: "system.advantages.yangchi.temporary", demon: "system.advantages.demonchi.temporary" };

/** A Kuei-jin: the system's vampire sheet set to Kindred of the East. */
export const isKotE = actor => !!actor && actor.type === "Vampire" && actor.system?.settings?.variant === "kindredeast";

export function build(ctx) {
    const { post, rollPool, rollBlock, dialog, updateActor, notify } = ctx;
    const flag = a => a.getFlag(MOD, "kote") ?? {};
    const saveFlag = (a, patch) => ctx.setFlag(a, "kote", { ...flag(a), ...patch });
    const night = () => Math.floor(((game.time?.worldTime ?? 0) - 18 * 3600) / 86400);

    function info(actor) {
        const a = actor.system?.advantages ?? {};
        const v = { yin: n(a.yin?.permanent), yang: n(a.yang?.permanent), hun: n(a.hun?.permanent), po: n(a.po?.permanent) };
        const chi = { yin: n(a.yinchi?.temporary), yang: n(a.yangchi?.temporary), demon: n(a.demonchi?.temporary) };
        const dharma = { rating: n(a.dharma?.permanent), name: String(a.dharma?.label ?? "").startsWith("wod.") ? "" : String(a.dharma?.label ?? "") };
        const f = flag(actor);
        const dk = K.dharmaOf(dharma.name) || f.dharma || "";
        const perm = K.permImbalance(v.yin, v.yang);
        const temp = K.tempImbalance({ yin: v.yin, yang: v.yang, yinChi: chi.yin, yangChi: chi.yang });
        return { f, v, chi, dharma: { ...dharma, key: dk }, perm, temp, willpower: { perm: n(a.willpower?.permanent), temp: n(a.willpower?.temporary) },
            hunger: K.hunger(chi.yin + chi.yang, perm === "yang"), perTurn: K.chiPerTurn(dharma.rating), stamina: ctx.attr(actor, "stamina"),
            direction: f.direction || "", archetype: f.archetype || "", aspect: f.aspect || "", demonOpen: f.demonScene === sceneKey() };
    }
    const sceneKey = () => `${game.scenes?.viewed?.id ?? ""}:${Math.floor(game.time.worldTime / 3600)}`;
    const state = i => `Yin ${i.v.yin} (${i.chi.yin} Chi), Yang ${i.v.yang} (${i.chi.yang} Chi), Hun ${i.v.hun}, P'o ${i.v.po} (${i.chi.demon} Demon Chi); Dharma ${i.dharma.rating}${i.dharma.name ? ` (${esc(i.dharma.name)})` : ""}`;
    const after = actor => { const i = info(actor); return `${i.hunger === "fed" ? "" : `${cap(i.hunger)}. `}${i.perm ? `Permanently imbalanced toward ${KIND[i.perm]}. ` : ""}${i.temp.length ? `Temporarily imbalanced (${i.temp.map(t => KIND[t]).join(", ")}).` : ""}`.trim(); };
    async function setChi(actor, upd) {
        const out = {};
        for (const [k, v] of Object.entries(upd)) out[PATH[k]] = Math.max(0, Math.min(K.CHI_CAP, n(v)));
        await updateActor(actor, out);
    }

    /* -- feeding -------------------------------------------------------- */
    async function feed(actor) {
        const i = info(actor);
        const ways = Object.entries(K.FEEDING).map(([k, w]) => `<option value="${k}"${i.dharma.rating < w.dharma ? " disabled" : ""}${k === "blood" ? " selected" : ""}>${esc(w.label)}${w.dharma ? ` (Dharma ${w.dharma})` : ""}</option>`).join("");
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>How</label><select name="w" data-fixed>${ways}</select></div>
          <div class="form-group"><label>Points (blood) or levels (flesh)</label><input type="number" name="k" min="1" max="10" value="2"/></div>
          <div class="form-group"><label>Blood: the mood set</label><select name="mood" data-fixed><option value="">none: the lesser kind first</option><option value="yin">sadness or terror: Yin (Manipulation + Yin at 6)</option><option value="yang">awe or ecstasy: Yang (Manipulation + Yang at 6)</option></select></div>
          <div class="form-group"><label>Flesh</label><select name="flesh" data-fixed><option value="fresh">dead within four hours</option><option value="cold">a cold corpse</option><option value="living">the living</option></select></div>
          <div class="form-group"><label>Breath or osmosis: the kind</label><select name="kind" data-fixed><option value="yang">Yang</option><option value="yin">Yin</option></select></div>
          <div class="form-group"><label>Breath: the victim's Stamina</label><input type="number" name="sta" min="1" max="10" value="2"/></div>
          <div class="form-group"><label>Osmosis: the local Wall</label><input type="number" name="wall" min="1" max="10" value="6"/></div></form>`;
        return dialog(`Feed: ${actor.name}`, content, "Feed", async fd => {
            const w = fd.w, rolls = [];
            let body = "", gain = { yin: 0, yang: 0 };
            if (w === "blood") {
                let att = "";
                if (fd.mood) {
                    const r = await rollPool(ctx.attr(actor, "manipulation") + i.v[fd.mood], 6); rolls.push(r.roll);
                    body += rollBlock(`Manipulation + ${KIND[fd.mood]} (the mood)`, r);
                    if (r.successes) att = fd.mood;
                }
                const res = K.feedBlood({ yinChi: i.chi.yin, yangChi: i.chi.yang }, n(fd.k), att);
                gain = { yin: res.yinChi - i.chi.yin, yang: res.yangChi - i.chi.yang };
                await setChi(actor, { yin: res.yinChi, yang: res.yangChi });
                body += `<div class="vta-res">${n(fd.k)} blood → +${gain.yin} Yin, +${gain.yang} Yang${res.wasted ? ` (${res.wasted} lost: ten is the most)` : ""}.</div>`;
            } else if (w === "flesh") {
                const [ry] = K.FLESH[fd.flesh], k = n(fd.k);
                const y = Math.round(k * ry / 10), g = k - y;
                gain = { yin: y, yang: g };
                await setChi(actor, { yin: i.chi.yin + y, yang: i.chi.yang + g });
                body += `<div class="vta-res">${k} ${k === 1 ? "level" : "levels"} of flesh → +${y} Yin, +${g} Yang; each a Health Level of the victim's.</div><div class="vta-note">Flesh-eating is a sure road to Dharmic degeneration (Kindred of the East p. 137).</div>`;
            } else if (w === "breath") {
                const me = await rollPool(i.v[fd.kind], 6), them = await rollPool(n(fd.sta), 6); rolls.push(me.roll, them.roll);
                const k = Math.max(0, me.successes - them.successes);
                gain = { [fd.kind]: k, [fd.kind === "yin" ? "yang" : "yin"]: 0 };
                if (k) await setChi(actor, { [fd.kind]: i.chi[fd.kind] + k });
                body += rollBlock(`${KIND[fd.kind]} (the breath)`, me) + rollBlock("The victim's Stamina", them)
                    + `<div class="vta-res">${me.botch ? "A botch: this victim's breath can never be taken." : k ? `+${k} ${KIND[fd.kind]} Chi; ${k} Health ${k === 1 ? "Level" : "Levels"} of the victim's (back a day each).` : "Nothing this turn."}</div>`;
            } else {
                if (i.dharma.rating < n(fd.wall)) { notify(`${actor.name}: osmosis needs a Dharma at least the Wall (${n(fd.wall)}).`); return null; }
                const r = await rollPool(i.v[fd.kind], n(fd.wall)); rolls.push(r.roll);
                const k = r.successes ? 10 - n(fd.wall) : 0;
                gain = { [fd.kind]: k };
                if (k) await setChi(actor, { [fd.kind]: i.chi[fd.kind] + k });
                body += rollBlock(`${KIND[fd.kind]} against the Wall`, r) + `<div class="vta-res">${k ? `+${k} ${KIND[fd.kind]} Chi from the dragon lines. This site cannot be fed from again for a month.` : "The dragon lines do not yield. The P'o could tear the Chi out (P'o against the Wall), defiling the site."}</div>`;
            }
            const note = after(actor);
            if (note) body += `<div class="vta-note">${esc(note)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 136–138</div>`;
            return post(actor, `${actor.name} feeds`, body, rolls.filter(Boolean));
        });
    }

    /* -- spending Chi, a Discipline --------------------------------------- */
    async function spend(actor) {
        const i = info(actor);
        const arts = (actor.items ?? []).filter(x => x.type === "Power" && /types\.discipline$/.test(String(x.system?.type ?? "")));
        const content = `<form><p>${state(i)}. Dharma ${i.dharma.rating}: ${i.perTurn} Chi a turn, one kind a turn.</p>
          <div class="form-group"><label>Discipline</label>${arts.length > 5 ? searchBox("select[name=art]", "Search Disciplines…", "Search Disciplines") : ""}<select name="art"><option value="">(another use)</option>${arts.map(x => `<option value="${x.id}">${esc(x.name)} ${n(x.system?.value)}</option>`).join("")}</select></div>
          <div class="form-group"><label>Chi</label><select name="kind" data-fixed><option value="">as the Discipline</option><option value="yin">Yin</option><option value="yang">Yang</option><option value="demon">Demon</option></select></div>
          <div class="form-group"><label>Points</label><input type="number" name="k" min="1" max="10" value="1"/></div>
          <div class="form-group"><label>Roll (dice, 0 for none)</label><input type="number" name="dice" min="0" max="20" value="0"/></div>
          <div class="form-group"><label>Difficulty</label><input type="number" name="diff" min="2" max="10" value="6"/></div>
          <div class="form-group"><label><input type="checkbox" name="eq"/> Equilibrium lets both kinds flow</label></div></form>`;
        return dialog(`Spend Chi: ${actor.name}`, content, "Spend", async fd => {
            const it = arts.find(x => x.id === fd.art);
            const def = K.artOf(it?.name);
            const kind = fd.kind || (def?.chi && def.chi !== "either" ? def.chi : "yang");
            const plan = K.spendPlan({ dharma: i.dharma.rating, yinChi: i.chi.yin, yangChi: i.chi.yang, demonChi: i.chi.demon, stamina: i.stamina }, kind, n(fd.k), { equilibrium: !!fd.eq });
            if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
            if (kind === "yin" && flag(actor).inSun) { notify(`${actor.name} cannot spend Yin in sunlight.`); return null; }
            await setChi(actor, { [kind]: i.chi[kind] - n(fd.k) });
            let body = `<div class="vta-sec">${it ? `<b>${esc(it.name)}</b>: ` : ""}${n(fd.k)} ${KIND[kind]} Chi.</div>`, rolls = [];
            if (def?.kind === "demon" || kind === "demon") {
                const h = await rollPool(i.v.hun, Math.max(2, i.v.po || 6)); rolls.push(h.roll);
                body += rollBlock("Hun harnesses the P'o", h) + `<div class="vta-res ${h.successes ? "good" : "bad"}">${h.successes ? "A controlled frenzy: the Hun keeps the body." : "The P'o takes the body while the Demon Art is used."}</div>`;
            }
            if (n(fd.dice)) {
                const r = await rollPool(n(fd.dice), n(fd.diff)); rolls.push(r.roll);
                body += rollBlock(it ? esc(it.name) : "The roll", r);
                if (r.botch && i.temp.length) {
                    const ex = K.chiExplosion({ yin: i.v.yin, yang: i.v.yang, yinChi: i.chi.yin - (kind === "yin" ? n(fd.k) : 0), yangChi: i.chi.yang - (kind === "yang" ? n(fd.k) : 0) });
                    if (ex.aggravated) {
                        await setChi(actor, { yin: info(actor).chi.yin - ex.yinLost, yang: info(actor).chi.yang - ex.yangLost });
                        await ctx.applyDamage(actor, "aggravated", ex.aggravated);
                        body += `<div class="vta-big bad">The excess Chi ignites: ${ex.aggravated} aggravated (soak with Stamina at 8), and a wave soul check.</div>`;
                    }
                }
            }
            if (plan.aura) body += `<div class="vta-note">Three or more points in a turn: an aura even mortals may feel (${kind === "yin" ? "a creeping cold" : "sparks and crackling"}).</div>`;
            if (plan.note) body += `<div class="vta-note">${esc(plan.note)}</div>`;
            const note = after(actor);
            if (note) body += `<div class="vta-note">${esc(note)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 54, 90, 139–140</div>`;
            return post(actor, `${actor.name} spends Chi`, body, rolls.filter(Boolean));
        });
    }

    /* -- the soul's states ------------------------------------------------ */
    async function nature(actor, { kind = null } = {}) {
        const i = info(actor);
        const content = `<form><p>${state(i)}.${i.hunger !== "fed" ? ` ${cap(i.hunger)}.` : ""}</p>
          <div class="form-group"><label>The state</label><select name="k" data-fixed>${Object.entries(K.NATURES).map(([k, x]) => `<option value="${k}"${k === kind ? " selected" : ""}>${cap(x.label)}: ${KIND[x.resist] ?? "Hun"} against the P'o: ${esc(x.triggers.join(", "))}</option>`).join("")}</select></div>
          <div class="form-group"><label>Difficulty (both sides)</label><input type="number" name="d" min="3" max="10" value="6"/></div></form>`;
        return dialog(`The soul: ${actor.name}`, content, "Roll", async fd => {
            const N = K.NATURES[fd.k];
            const need = K.natureNeed(fd.k, { ravenous: i.hunger === "ravenous" || i.hunger === "uncontrollable", imbalance: i.perm });
            let st = { virtue: 0, po: 0, turn: 0 }, rolls = [], rows = [];
            const vPool = N.resist === "hun" ? i.v.hun : i.v[N.resist];
            while (!st.done) {
                const a = await rollPool(vPool, n(fd.d)), b = await rollPool(i.v.po, n(fd.d)); rolls.push(a.roll, b.roll);
                st = K.natureStep(st, a.successes, b.successes, need);
                rows.push(`Turn ${st.turn}: ${N.resist === "hun" ? "Hun" : KIND[N.resist]} ${a.successes}, P'o ${b.successes}`);
            }
            const lost = st.result === "lapses";
            let body = `<div class="vta-sec">${rows.map(esc).join("<br>")}<div class="vta-parts">The P'o needs ${need.po}; the Virtue needs ${need.virtue}; five turns at most</div></div>`;
            body += `<div class="vta-big ${lost ? "bad" : "good"}">${lost ? `${cap(N.label)}: ${esc(N.fails)}.` : st.result === "resists" ? `${cap(N.label)} is held off.` : `The urge passes after five turns.`}</div>`;
            if (lost && fd.k === "shadow" && i.archetype) body += `<div class="vta-note">The P'o plays its Archetype: ${esc(i.archetype)}. A Hun roll at 9 keeps the Hun aware; Willpower then buys a turn's hesitation or one lucid sentence.</div>`;
            if (lost && fd.k !== "shadow") body += `<div class="vta-note">Coming out of ${N.label} risks shadow soul. No Martial Arts in fire or wave soul.</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 91, 136, 150–151</div>`;
            return post(actor, `${actor.name}: ${N.label}`, body, rolls.filter(Boolean));
        });
    }

    /* -- Dharma ------------------------------------------------------------ */
    async function dharmaRoll(actor) {
        const i = info(actor);
        const vk = K.DHARMAS[i.dharma.key]?.virtue;
        const content = `<form><p>${i.dharma.key ? `${esc(cap(K.DHARMAS[i.dharma.key].label))}: ${vk === "balance" ? "Balance (the average of the highest and lowest Virtue)" : vk === "po" ? "P'o" : vk === "hun" ? "Hun" : KIND[vk]} ${K.dharmaVirtue(i.dharma.key, i.v)}` : "No Dharma named on the sheet: write it in the Dharma box (for example \"Devil-Tiger\")."} against the P'o ${i.v.po}, at the permanent Willpower (${i.willpower.perm}). No Willpower may be spent.</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed><option value="auspicious">An auspicious occasion</option><option value="blindness">An act of blindness</option></select></div>
          <div class="form-group"><label>Why</label><input type="text" name="why" value=""/></div></form>`;
        return dialog(`Dharma: ${actor.name}`, content, "Roll", async fd => {
            if (!i.dharma.key) { notify(`${actor.name}: name the Dharma on the sheet first.`); return null; }
            const v = await rollPool(K.dharmaVirtue(i.dharma.key, i.v), Math.max(2, i.willpower.perm)), p = await rollPool(i.v.po, Math.max(2, i.willpower.perm));
            const out = K.dharmaOutcome(fd.k, v.successes, p.successes);
            if (out.dharma) await updateActor(actor, { "system.advantages.dharma.permanent": Math.max(0, Math.min(10, i.dharma.rating + out.dharma)) });
            const body = rollBlock("The Dharma's Virtue", v) + rollBlock("P'o", p) + (fd.why ? `<div class="vta-parts">${esc(fd.why)}</div>` : "")
                + `<div class="vta-big ${out.dharma > 0 ? "good" : out.dharma < 0 || out.poTakes ? "bad" : ""}">${cap(out.text)}${out.dharma ? ` (Dharma ${Math.max(0, Math.min(10, i.dharma.rating + out.dharma))})` : ""}.</div><div class="wodx-quiet">${REF} pp. 53–54</div>`;
            return post(actor, `${actor.name}: a Dharma roll`, body, [v.roll, p.roll].filter(Boolean));
        });
    }

    /* -- the Demon --------------------------------------------------------- */
    async function demon(actor) {
        const i = info(actor);
        const content = `<form><p>${state(i)}. Demon Chi: at most Stamina (${i.stamina}) a turn.${i.demonOpen ? " <b>Open this scene.</b>" : ""}</p>
          <div class="form-group"><label>What</label><select name="k" data-fixed>
            <option value="evoke">Evoke Demon Chi for the scene (P'o against Hun + 3)</option><option value="berserk">Unleash the berserk rage (fire soul at will)</option>
            <option value="spend">Spend Demon Chi: actions, damage or Strength successes</option><option value="fangs">Fangs (1) or the fanged maw (2)</option>
            <option value="mind">Break mind control (P'o at 9)</option></select></div>
          <div class="form-group"><label>Points (spend)</label><input type="number" name="p" min="1" max="10" value="1"/></div>
          <div class="form-group"><label><input type="checkbox" name="maw"/> The fanged maw (Strength + 2 aggravated)</label></div></form>`;
        return dialog(`The Demon: ${actor.name}`, content, "Go", async fd => {
            let body = "", rolls = [];
            if (fd.k === "evoke" || fd.k === "berserk") {
                const r = await rollPool(i.v.po, K.demonDiff(i.v.hun)); rolls.push(r.roll);
                if (fd.k === "evoke") {
                    const o = K.demonEvoke(r);
                    if (o.open) await saveFlag(actor, { demonScene: sceneKey() });
                    body = rollBlock("P'o against Hun + 3", r) + `<div class="vta-res ${o.open ? "good" : ""}">${cap(o.text)}.</div>${o.fire ? `<div class="vta-note">Fire soul: as frenzy; no wound penalties.</div>` : ""}`;
                } else body = rollBlock("P'o against Hun + 3", r) + `<div class="vta-res ${r.successes ? "bad" : ""}">${r.successes ? "The fire soul is loosed: no wound penalties, and Demon Chi." : "The rage will not come."}</div>`;
                if (fd.k === "berserk" && r.successes) await saveFlag(actor, { demonScene: sceneKey() });
            } else if (fd.k === "spend" || fd.k === "fangs") {
                const k = fd.k === "fangs" ? (fd.maw ? 2 : 1) : n(fd.p);
                if (!i.demonOpen && fd.k === "spend") notify(`${actor.name}: Demon Chi is not open this scene (evoke it first).`);
                const plan = K.spendPlan({ demonChi: i.chi.demon, stamina: i.stamina }, "demon", k);
                if (!plan.ok) { notify(`${actor.name}: ${plan.why}.`); return null; }
                await setChi(actor, { demon: i.chi.demon - k });
                body = `<div class="vta-res">${fd.k === "fangs" ? (fd.maw ? "A fanged maw for the scene: Strength + 2 aggravated." : "Fangs for the scene, as a Western vampire's.") : `${k} Demon Chi: ${k} extra ${k === 1 ? "action" : "actions"}, or automatic damage or Strength successes.`}</div><div class="vta-note">Spent Demon Chi is gone until next evening.</div>`;
            } else {
                const r = await rollPool(i.v.po, 9); rolls.push(r.roll);
                body = rollBlock("P'o against the control", r) + `<div class="vta-res">${r.successes ? "Free, and a shadow soul check follows at once." : "The control holds."}</div>`;
            }
            body += `<div class="wodx-quiet">${REF} pp. 90–91</div>`;
            return post(actor, `${actor.name}: the Demon`, body, rolls.filter(Boolean));
        });
    }

    /* -- the evening, the sun ----------------------------------------------- */
    async function rise(actor) {
        const i = info(actor);
        const f = flag(actor);
        const fed = n(f.riseUntil) > night();
        const content = `<form><p>${state(i)}.${fed ? ` Black cycled: no Chi needed tonight (until night ${f.riseUntil}).` : ""}</p>
          <div class="form-group"><label>Rise with</label><select name="a" data-fixed><option value="yang">Yang (scarlet cycle: each night; looks alive)</option><option value="yin"${i.perm === "yin" ? " selected" : ""}>Yin (black cycle: ten nights; +1 Social difficulty with mortals)</option></select></div>
          <div class="form-group"><label><input type="checkbox" name="dc" checked/> Roll P'o at 6 for Demon Chi back</label></div></form>`;
        return dialog(`Rise: ${actor.name}`, content, "Rise", async fd => {
            let body = "", rolls = [];
            if (!fed) {
                const r = K.awaken({ yinChi: i.chi.yin, yangChi: i.chi.yang, permImb: i.perm }, fd.a);
                if (r.rot) { await ctx.applyDamage(actor, "lethal", 1); body += `<div class="vta-big bad">No Chi in the body: the corpse loses a Health Level instead.</div>`; }
                else {
                    await setChi(actor, { yin: r.yinChi, yang: r.yangChi });
                    await saveFlag(actor, { aspect: r.aspect, riseUntil: night() + r.nights });
                    body += `<div class="vta-res">Aspected to ${KIND[r.aspect]}${r.nights > 1 ? ` for ${r.nights} nights` : ""}.${r.socialPenalty ? " A corpse's pallor: +1 difficulty to Social rolls with mortals." : ""}</div>`;
                }
            } else body += `<div class="vta-res">Still black cycled: the night costs nothing.</div>`;
            if (fd.dc) {
                const r = await rollPool(i.v.po, 6); rolls.push(r.roll);
                const back = K.demonRefresh(i.chi.demon, i.v.po, r.successes);
                await setChi(actor, { demon: back });
                body += rollBlock("P'o (Demon Chi)", r) + `<div class="vta-res">Demon Chi ${back}/${i.v.po}.</div>`;
            }
            const note = after(actor);
            if (note) body += `<div class="vta-note">${esc(note)}</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 91, 139</div>`;
            return post(actor, `${actor.name} rises`, body, rolls.filter(Boolean));
        });
    }
    async function sun(actor) {
        const i = info(actor);
        const f = flag(actor);
        const day = Math.floor((game.time?.worldTime ?? 0) / 86400);
        const used = f.sunDay === day ? n(f.sunMin) : 0;
        const content = `<form><p>${state(i)}. Minutes already spent in the sun today: ${used}.</p>
          <div class="form-group"><label>Light</label><select name="dir" data-fixed><option value="1">direct</option><option value="0">indirect</option></select></div>
          <div class="form-group"><label>Minutes more</label><input type="number" name="m" min="0" max="600" value="1"/></div>
          <div class="form-group"><label>Turns of rot to resolve (past the grace)</label><input type="number" name="t" min="0" max="20" value="0"/></div>
          <div class="form-group"><label>Yang Chi spent to hold the rot back (a turn a point)</label><input type="number" name="y" min="0" max="10" value="0"/></div></form>`;
        return dialog(`Sunlight: ${actor.name}`, content, "Apply", async fd => {
            const grace = K.sunGrace({ stamina: i.stamina, yinChi: i.chi.yin, yangImbalanced: i.perm === "yang", direct: fd.dir === "1" });
            const total = used + n(fd.m);
            await saveFlag(actor, { sunDay: day, sunMin: total });
            let body = `<div class="vta-sec">Grace: ${grace} ${grace === 1 ? "minute" : "minutes"} a day (Stamina ${i.stamina} − Yin Chi ${i.chi.yin}${i.perm === "yang" ? "; Yang-imbalanced" : ""}); spent today: ${total}.</div>`;
            const y = Math.min(n(fd.y), i.chi.yang), turns = Math.max(0, n(fd.t) - y);
            if (y) await setChi(actor, { yang: i.chi.yang - y });
            if (total > grace && turns) {
                await ctx.applyDamage(actor, "aggravated", turns);
                await setChi(actor, { yin: Math.max(0, info(actor).chi.yin - turns) });
                await saveFlag(actor, { rot: n(flag(actor).rot) + turns });
                body += `<div class="vta-big bad">${turns} ${turns === 1 ? "turn" : "turns"} of rot: ${turns} Health ${turns === 1 ? "Level" : "Levels"} (healed as aggravated), −${turns} to each Physical Attribute and to Appearance, −${turns} Yin Chi.</div>
                  <div class="vta-note">Mark the Attribute losses on the sheet; healing the levels restores them. At zero Physical Attributes the body cannot move. No Yin can be spent in the sun.</div>`;
            } else if (total > grace) body += `<div class="vta-res bad">Past the grace: each further turn rots the body.</div>`;
            else body += `<div class="vta-res good">Within the grace.</div>`;
            if (y) body += `<div class="vta-note">${y} Yang spent: the rot is held back ${y} ${y === 1 ? "turn" : "turns"}.</div>`;
            body += `<div class="wodx-quiet">${REF} pp. 140, 151</div>`;
            return post(actor, `${actor.name} in the sun`, body);
        });
    }

    /* -- healing, sight, Horoscope ------------------------------------------ */
    async function heal(actor) {
        const i = info(actor);
        const t = ctx.healthTrack(actor);
        const content = `<form><p>${t.damage.bashing}B / ${t.damage.lethal}L / ${t.damage.aggravated}A. Chi for blood: a point a level; aggravated, five and a day's rest. ${i.perTurn} Chi a turn.</p>
          <div class="form-group"><label>Heal</label><select name="w" data-fixed><option value="bashing">bashing</option><option value="lethal">lethal</option><option value="aggravated">aggravated</option></select></div>
          <div class="form-group"><label>Levels</label><input type="number" name="k" min="1" max="10" value="1"/></div>
          <div class="form-group"><label>With</label><select name="c" data-fixed><option value="yang">Yang</option><option value="yin">Yin</option></select></div></form>`;
        return dialog(`Heal: ${actor.name}`, content, "Heal", async fd => {
            const lv = Math.min(n(fd.k), n(t.damage[fd.w]));
            const cost = lv * K.healCost(fd.w);
            if (!lv) { notify(`${actor.name} has no ${fd.w} damage.`); return null; }
            if (cost > i.chi[fd.c]) { notify(`${actor.name} has ${i.chi[fd.c]} ${KIND[fd.c]} Chi; this needs ${cost}.`); return null; }
            await setChi(actor, { [fd.c]: i.chi[fd.c] - cost });
            await ctx.setDamage(actor, { ...t.damage, [fd.w]: t.damage[fd.w] - lv });
            return post(actor, `${actor.name} heals`, `<div class="vta-res good">${lv} ${fd.w} ${lv === 1 ? "level" : "levels"} for ${cost} ${KIND[fd.c]} Chi${cost > i.perTurn ? ` (over ${Math.ceil(cost / i.perTurn)} turns)` : ""}.${fd.w === "aggravated" ? " And a day's rest." : ""}</div>${i.f.rot ? `<div class="vta-note">The sun's rot heals with the levels, though Yin must be regained.</div>` : ""}<div class="wodx-quiet">${REF} p. 145</div>`);
        });
    }
    async function sight(actor) {
        const i = info(actor);
        const content = `<form><div class="form-group"><label>What</label><select name="k" data-fixed>
            <option value="ghost">Ghostsight (1 Yin, a scene): the Yin World, Perception + Occult at the Wall + 2</option>
            <option value="life">Lifesight (1 Yang, a scene): auras, Perception + Empathy at 9</option>
            <option value="senses">Sharpened senses (Hun at 6, a scene)</option>
            <option value="speech">Speak with a spirit (Hun against the Wall)</option>
            <option value="horoscope">Horoscope (once a story)</option></select></div>
          <div class="form-group"><label>The local Wall</label><input type="number" name="wall" min="1" max="10" value="6"/></div></form>`;
        return dialog(`Sight and spirit: ${actor.name}`, content, "Roll", async fd => {
            let r, title, body = "";
            if (fd.k === "ghost" || fd.k === "life") {
                const kind = fd.k === "ghost" ? "yin" : "yang";
                if (i.chi[kind] < 1) { notify(`${actor.name} has no ${KIND[kind]} Chi.`); return null; }
                await setChi(actor, { [kind]: i.chi[kind] - 1 });
                r = await rollPool(ctx.attr(actor, "perception") + n(ctx.findAbility?.(actor, fd.k === "ghost" ? "occult" : "empathy")?.value), fd.k === "ghost" ? Math.min(10, n(fd.wall) + 2) : 9);
                title = fd.k === "ghost" ? "Perception + Occult" : "Perception + Empathy";
                body = `<div class="vta-res">${r.successes ? (fd.k === "ghost" ? "The Yin World shows itself for the scene." : `Auras flare; hunting is ${r.successes} easier.`) : "Nothing clear."}</div>`;
            } else if (fd.k === "senses" || fd.k === "speech") {
                r = await rollPool(i.v.hun, fd.k === "senses" ? 6 : n(fd.wall));
                title = "Hun";
                body = `<div class="vta-res">${r.successes ? (fd.k === "senses" ? "Senses sharpened for the scene (as Heightened Senses)." : "The spirit hears and can answer.") : "It does not come."}</div>`;
            } else {
                const dots = ctx.background?.(actor, "Horoscope") ?? 0;
                r = await rollPool(dots, 11);
                const hits = K.horoscopeHits(r.faces, i.dharma.key, i.direction);
                title = `Horoscope ${dots}`;
                body = `<div class="vta-res">${hits ? `${hits} lucky ${hits === 1 ? "number" : "numbers"}: ${hits} automatic ${hits === 1 ? "success" : "successes"} next turn.` : "The stars are silent."}</div><div class="vta-note">Lucky numbers: the Dharma's ${K.DHARMAS[i.dharma.key]?.lucky ?? "?"}${i.direction ? `, the ${esc(i.direction)}'s ${K.DIRECTION_LUCKY[i.direction]}` : ""} (a 10 counts as 0).</div>`;
            }
            return post(actor, `${actor.name}: ${title}`, rollBlock(title, r) + body + `<div class="wodx-quiet">${REF} pp. 86, 88–91</div>`, [r?.roll].filter(Boolean));
        });
    }
    /** The Kuei-jin's own choices WoDX keeps: the Dharma (if the sheet's box is empty), the direction, the P'o's Archetype. */
    async function setup(actor) {
        const i = info(actor);
        const content = `<form><p>${state(i)}.</p>
          <div class="form-group"><label>Dharma</label><select name="d" data-fixed><option value="">as the sheet's Dharma box</option>${Object.entries(K.DHARMAS).map(([k, d]) => `<option value="${k}"${k === i.f.dharma ? " selected" : ""}>${esc(cap(d.label))} (${d.virtue === "balance" ? "Balance" : d.virtue === "po" ? "P'o" : cap(d.virtue)})</option>`).join("")}</select></div>
          <div class="form-group"><label>Direction</label><select name="dir" data-fixed><option value="">—</option>${Object.keys(K.DIRECTION_LUCKY).map(d => `<option${d === i.direction ? " selected" : ""}>${d}</option>`).join("")}</select></div>
          <div class="form-group"><label>The P'o's Archetype</label><input type="text" name="arch" value="${esc(i.archetype)}" placeholder="the Bandit, the Deceiver, the Legalist…"/></div></form>`;
        return dialog(`Kuei-jin: ${actor.name}`, content, "Save", async fd => {
            await saveFlag(actor, { dharma: fd.d || "", direction: fd.dir || "", archetype: String(fd.arch || "").trim() });
            const j = info(actor);
            const L = K.dharmaLevel(j.dharma.rating);
            return post(actor, `${actor.name}, Kuei-jin`, `<div class="vta-sec">${state(j)}.</div><div class="vta-res">Dharma ${j.dharma.rating}: ${L.chi} Chi a turn, Virtue pairs to ${L.pair}, Traits to ${L.trait}, ${esc(L.status)}${L.social ? `, ${L.social > 0 ? "+" : ""}${L.social} Social against lesser Dharma` : ""}. Willpower at most ${K.willpowerMax(j.v.hun)}.</div>${after(actor) ? `<div class="vta-note">${esc(after(actor))}</div>` : ""}<div class="wodx-quiet">${REF} pp. 54, 88–92</div>`);
        });
    }

    return { info, feed, spend, nature, dharmaRoll, demon, rise, sun, heal, sight, setup, isKotE, rules: K };
}
